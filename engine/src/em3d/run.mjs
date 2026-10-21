// EM 3D block case runner: runEm3d(caseConfig) -> results JSON (SPEC section 5 style, fields omitted). Pure function.
// Case schema: DevLog/lanes/L7-em2d.md "Proposed SPEC addition: EM 3D block case". License: GPL-3.0-or-later.

import { buildLayeredMesh, subMesh } from './mesh.mjs';
import { prepare3d, solveAt } from './solver.mjs';
import { makeMaterials } from '../em2d/dielectric.mjs';
import { applyPatch, sweepFrequencies } from '../em2d/run.mjs';
import { renormalize, zToS, passivityMaxSv, reciprocityError, mixedMode, modalAnalysis, zyFromRlgc } from '../em2d/mtl.mjs';
import { zToAbcd, abcdToZ, abcdMul, abcdInv, abcdReverse } from './cascade.mjs';
import { buildSection } from '../em2d/section.mjs';
import { prepareRlgc, rlgcAt } from '../em2d/rlgc.mjs';
import { cmatInv } from '../em2d/dense.mjs';
import { writeTouchstone } from '../em2d/touchstone.mjs';
import { factorFallbackWarning } from '../em2d/ldlt-select.mjs';

export class Em3dCaseError extends Error {}
const fail = (m) => {
  throw new Em3dCaseError(`em3d case: ${m}`);
};
const now = () => performance.now();
// Low-frequency conditioning (A3 M9, lane L13): the Z of an electrically tiny 2-port is nearly singular, so det Z (ABCD
// B, Y = Z^-1, pi shunts Y11 + Y12) cancels to about w^2 L C of its terms. Measured on EM-4 (59.5k DOF, solver Z):
// C1 10.532 fF at 0.1 GHz (cancellation 7.4e-8), 13.24 fF at 0.01 GHz (8.1e-10), 82.6 fF at 1 MHz; L 8.913 pH down to
// 1 MHz, 8.870 pH at 0.1 MHz. Below 1e-8 the shunt C error is about 1e-3 or more: warn.
const LF_CANCELLATION_LIMIT = 1e-8;

const CASE_KEYS = ['schema', 'id', 'title', 'status', 'family', 'em3d', 'targets', 'assumptions', 'missing', 'notes', 'reference_deck'];
const EM_KEYS = ['box_um', 'axis', 'bc', 'background', 'materials', 'conductor_materials', 'temperature_C', 'solids', 'ports', 'pml', 'mesh', 'max_dof', 'sweep', 'zref_ohm', 'lumped', 'mixed_mode_pairs', 'deembed_method', 'port_z_check', 'touchstone', 'variants'];
const SOLID_KEYS = ['name', 'kind', 'material', 'conductor', 'model', 'sigma_S_m', 'roughness', 'box_um', 'cylinder_um', 'poly_um', 'h_um', 'dz_um', 'allow_needle_ibc', 'ref', 'note', 'status'];
const PORT_KEYS = ['name', 'side', 'signal', 'mode_type', 'mode', 'deembed_um', 'allow_short_lead', 'ref', 'note'];
const MESH_KEYS = ['max_edge_um', 'max_dz_um', 'dz_min_um', 'dz_growth', 'grade', 'max_vertices', 'min_edge_um'];
const TARGET_KEYS = ['metric_id', 'quantity', 'f_GHz', 'value', 'unit', 'tolerance', 'tier', 'variant', 'to', 'from', 'note', 'locator'];

function keys(obj, allowed, where) {
  if (obj == null) return;
  if (typeof obj !== 'object' || Array.isArray(obj)) fail(`${where}: must be a mapping`);
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) fail(`${where}: unknown key ${k} (allowed: ${allowed.join(', ')})`);
}

export function parseEm3dCase(c) {
  keys(c, CASE_KEYS, 'case');
  if (c.schema !== 'ap-sim/0') fail('schema must be ap-sim/0');
  if (c.family !== 'em3d') fail('family must be em3d');
  const e = c.em3d ?? fail('em3d block required');
  keys(e, EM_KEYS, 'em3d');
  (e.solids ?? []).forEach((s, i) => keys(s, SOLID_KEYS, `em3d.solids[${i}]`));
  (e.ports ?? []).forEach((s, i) => keys(s, PORT_KEYS, `em3d.ports[${i}]`));
  keys(e.mesh, MESH_KEYS, 'em3d.mesh');
  (c.targets ?? []).forEach((t, i) => keys(t, TARGET_KEYS, `targets[${i}]`));
  return c;
}

function solidSpec(s, i, axis) {
  const base = { name: s.name ?? `s${i}`, kind: s.kind, material: s.material, h_um: s.h_um, dz_um: s.dz_um };
  if (s.box_um) return { ...base, box_um: s.box_um };
  if (s.cylinder_um) {
    if (axis !== 'z') fail(`solids[${i}]: cylinder_um needs axis z`);
    const { c, r, n, z } = s.cylinder_um;
    return { ...base, circle: { c, r, n: n ?? 24 }, z };
  }
  if (s.poly_um) return { ...base, poly: s.poly_um.poly, w: s.poly_um.w };
  return fail(`solids[${i}]: box_um, cylinder_um or poly_um required`);
}

/**
 * Case-builder rule (E6 phase 2, L7 tests 2026-10-20): IBC / thin conductors with a rectangular cross-section that
 * run along the extrusion axis get needle tets at their corner edges, where first-order elements under-resolve the
 * corner current: conductor loss came out 20-26 % low (50 x 10 um strip vs em2d volumetric; round conductors are
 * within 1.5 %). Error unless the solid sets allow_needle_ibc: true; fix by extruding across the conductor (axis z for
 * horizontal traces) or by taking the line loss from an em2d segment.
 */
function checkNeedleIbc(e, axis) {
  const dz = e.mesh?.max_dz_um ?? Infinity;
  for (const s of e.solids ?? []) {
    if (s.kind !== 'conductor' || (s.model ?? 'pec') === 'pec' || !s.box_um || s.allow_needle_ibc) continue;
    const ext = { x: s.box_um.x[1] - s.box_um.x[0], y: s.box_um.y[1] - s.box_um.y[0], z: s.box_um.z[1] - s.box_um.z[0] };
    const longest = Object.entries(ext).sort((a, b) => b[1] - a[1])[0][0];
    const cross = Math.min(...Object.entries(ext).filter(([k]) => k !== axis).map(([, v]) => v));
    const axial = Math.min(dz, s.dz_um ?? Infinity);
    if (longest === axis && axial > 2 * Math.min(cross, s.h_um ?? cross))
      fail(`solid ${s.name}: lossy rectangular conductor along the extrusion axis ${axis} with axial cells (${axial} um) > 2 x its cross-section cell size; IBC loss is 20-26 % low on such needle tets (L7 E6 phase 2). Extrude across it (e.g. axis z for horizontal traces), take the line loss from em2d, or set allow_needle_ibc: true`);
  }
}

/** Axis-aligned bounds {x, y, z} of a solid (box or z-cylinder; poly: its bounding box along the frame). */
function solidBounds(s, axis) {
  if (s.box_um) return s.box_um;
  if (s.cylinder_um) {
    const { c, r, z } = s.cylinder_um;
    return { x: [c[0] - r, c[0] + r], y: [c[1] - r, c[1] + r], z };
  }
  if (s.poly_um) {
    const xs = s.poly_um.poly.map((p) => p[0]),
      ys = s.poly_um.poly.map((p) => p[1]);
    const fr = { z: ['x', 'y', 'z'], x: ['y', 'z', 'x'], y: ['z', 'x', 'y'] }[axis];
    return { [fr[0]]: [Math.min(...xs), Math.max(...xs)], [fr[1]]: [Math.min(...ys), Math.max(...ys)], [fr[2]]: s.poly_um.w };
  }
  return null;
}

/** Lead length (um) of a port: distance along its normal from the port face to the nearest solid boundary strictly
 * inside the box (any solid; the box length if none). */
export function portLeadUm(e, pt) {
  const axis = e.axis ?? 'z';
  const box = e.box_um;
  const ax = pt.side[0];
  const face = box[ax][pt.side.endsWith('max') ? 1 : 0];
  let lead = box[ax][1] - box[ax][0];
  for (const s of e.solids ?? []) {
    const b = solidBounds(s, axis);
    if (b) for (const v of b[ax]) if (v > box[ax][0] + 1e-9 && v < box[ax][1] - 1e-9) lead = Math.min(lead, Math.abs(v - face));
  }
  return lead;
}

/**
 * Port-distance rule (SPEC 14.2, L7 wave 4 study): lead = distance along the port normal from the port face to the
 * nearest solid boundary inside the box; h = in-plane gap from the signal conductor(s) to the nearest other
 * conductor or pec side on the port face; w_max = largest in-plane extent of a signal conductor on the face.
 * lead < max(2 h, w_max): warning; lead < 0.5 max(2 h, w_max): error unless the port sets allow_short_lead: true.
 */
export function checkPortLeads(e, warnings) {
  const axis = e.axis ?? 'z';
  const box = e.box_um;
  const bc = e.bc ?? {};
  const solids = (e.solids ?? []).map((s) => ({ s, b: solidBounds(s, axis) })).filter((x) => x.b);
  const out = [];
  for (const pt of e.ports ?? []) {
    const ax = pt.side[0];
    const max = pt.side.endsWith('max');
    const face = box[ax][max ? 1 : 0];
    const inPlane = ['x', 'y', 'z'].filter((a) => a !== ax);
    const onFace = solids.filter(({ b }) => b[ax][0] <= face + 1e-9 && b[ax][1] >= face - 1e-9);
    const lead = portLeadUm(e, pt);
    const sigNames = Array.isArray(pt.signal) ? pt.signal : pt.signal != null ? [pt.signal] : [];
    if (!sigNames.length) continue; // TE10 / analytic ports: no conductor geometry to measure
    const sig = onFace.filter(({ s }) => sigNames.includes(s.name) && s.kind === 'conductor');
    const others = onFace.filter(({ s }) => s.kind === 'conductor' && !sigNames.includes(s.name));
    const gap = (a, b) => {
      let d2 = 0;
      for (const k of inPlane) {
        const g = Math.max(b[k][0] - a[k][1], a[k][0] - b[k][1], 0);
        d2 += g * g;
      }
      return Math.sqrt(d2);
    };
    let h = Infinity,
      wmax = 0;
    for (const { b } of sig) {
      for (const k of inPlane) wmax = Math.max(wmax, b[k][1] - b[k][0]);
      for (const o of others) h = Math.min(h, gap(b, o.b));
      for (const k of inPlane) {
        if ((bc[`${k}min`] ?? 'pec') === 'pec') h = Math.min(h, b[k][0] - box[k][0]);
        if ((bc[`${k}max`] ?? 'pec') === 'pec') h = Math.min(h, box[k][1] - b[k][1]);
      }
    }
    if (!Number.isFinite(h)) h = 0;
    const need = Math.max(2 * h, wmax);
    const rec = { port: pt.name, lead_um: lead, h_um: h, w_max_um: wmax, required_um: need, status: lead >= need ? 'ok' : lead >= 0.5 * need ? 'warn' : 'error' };
    out.push(rec);
    if (rec.status === 'warn') warnings.push(`port ${pt.name}: lead ${lead} um < max(2 h, w_max) = ${need} um (h ${h} um, w_max ${wmax} um); evanescent fields from the nearest discontinuity reach the port (SPEC 14.2)`);
    if (rec.status === 'error' && !pt.allow_short_lead) fail(`port ${pt.name}: lead ${lead} um < 0.5 x max(2 h, w_max) = ${0.5 * need} um (h ${h} um, w_max ${wmax} um); lengthen the lead-in or set allow_short_lead: true (SPEC 14.2)`);
  }
  return out;
}

const DEEMBED_METHODS = ['line_run', 'port_extension'];

/**
 * De-embedding plan (A3 S4, lane L13): validates deembed_method and deembed_um, checks deembed_um <= lead, decides
 * line run vs port extension. Line run needs 2 ports, single-signal quasi-TEM modes and a lead on at least one port;
 * an explicit line_run that cannot apply falls back to port extension with a warning.
 */
export function deembedPlan(e, warnings) {
  const ports = e.ports ?? [];
  const method = e.deembed_method;
  if (method != null && !DEEMBED_METHODS.includes(method)) fail(`deembed_method ${JSON.stringify(method)}: must be ${DEEMBED_METHODS.join(' | ')}`);
  for (const pt of ports) {
    const d = pt.deembed_um ?? 0;
    if (!(typeof d === 'number' && Number.isFinite(d) && d >= 0)) fail(`port ${pt.name}: deembed_um must be a number >= 0 (got ${JSON.stringify(pt.deembed_um)})`);
    const lead = portLeadUm(e, pt);
    if (d > lead + 1e-9) fail(`port ${pt.name}: deembed_um ${d} um exceeds the uniform lead (${lead} um from the port face to the nearest solid boundary along the normal); de-embedding would remove line the block does not have`);
  }
  const hasLead = ports.some((p) => (p.deembed_um ?? 0) > 0);
  const why = [];
  if (ports.length !== 2) why.push(`${ports.length} ports (line run needs 2)`);
  else if (ports[0].side[0] !== ports[1].side[0] || ports[0].side === ports[1].side) why.push(`ports ${ports[0].name} / ${ports[1].name} are not on opposite box sides (a lead region would touch the other port's side)`);
  else if ((ports[0].deembed_um ?? 0) + (ports[1].deembed_um ?? 0) > e.box_um[ports[0].side[0]][1] - e.box_um[ports[0].side[0]][0] + 1e-9)
    fail(`ports ${ports[0].name} / ${ports[1].name}: deembed_um ${ports[0].deembed_um} + ${ports[1].deembed_um} um exceeds the box length along ${ports[0].side[0]} (the reference planes cross)`);
  for (const p of ports) {
    if (p.mode) why.push(`port ${p.name} is a ${p.mode.type ?? 'analytic'} port`);
    else if (Array.isArray(p.signal) && p.signal.length !== 1) why.push(`port ${p.name} has ${p.signal.length} signals (multi-terminal)`);
    else if ((p.mode_type ?? 'tem') !== 'tem') why.push(`port ${p.name} is a ${p.mode_type} port`);
  }
  if (!hasLead) why.push('no port has deembed_um > 0');
  const lineRun = method !== 'port_extension' && why.length === 0;
  if (method === 'line_run' && !lineRun) warnings.push(`deembed_method line_run not applicable (${why.join('; ')}); using port extension`);
  return { lineRun, method: lineRun ? 'line_run' : 'port_extension', reasons: why };
}

/** Reference-plane cut of port pt for line-run de-embedding: {ax, at, lo, hi} (um). */
function portCut(e, pt) {
  const ax = pt.side[0];
  const isMax = pt.side.endsWith('max');
  const F = e.box_um[ax][isMax ? 1 : 0];
  const at = isMax ? F - pt.deembed_um : F + pt.deembed_um;
  return { ax, at, lo: isMax ? at : F, hi: isMax ? F : at, other: `${ax}${isMax ? 'min' : 'max'}` };
}

/**
 * Line-run companion of port pt (A3 S3 fix, lane L13): the region of the device mesh between the port face and the
 * reference plane (subMesh), so the companion has the device's lead triangulation, z-planes and tet split. Ports at
 * both ends; box sides, materials, conductor models and PML slabs as the device.
 */
function prepareCompanion(e, mesh, pt, common) {
  const cut = portCut(e, pt);
  // line run needs ports on opposite sides of one axis (deembedPlan), and prepare3d rejects a PML on a port side, so
  // every PML slab is parallel to the lead: keep them all (identical stretch, the companion box keeps those bounds)
  const pml = { ...(e.pml ?? {}) };
  const sm = subMesh(mesh, cut.ax, cut.lo, cut.hi);
  const mode = { type: 'tem', signal: Array.isArray(pt.signal) ? pt.signal[0] : pt.signal };
  const ports = [
    { name: `${pt.name}_face`, side: pt.side, mode, deembed_um: 0 },
    { name: `${pt.name}_ref`, side: cut.other, mode, deembed_um: 0 },
  ];
  const P = prepare3d(sm, { ...common, ports, pml });
  return { port: pt.name, P, cut, tets: sm.nTets, layers: sm.stats.layers, tris2d: sm.stats.tris2d };
}

/**
 * Port-impedance check input (L7 wave 6): converged 2D (em2d, P2) quasi-TEM impedance of a single-signal port
 * cross-section. Returns {z} or {reason} (A3 S4: never skipped silently).
 */
export function portZ2d(e, pt, fHz) {
  if (pt.mode) return { reason: `${pt.mode.type ?? 'analytic'} port (no quasi-TEM cross-section)` };
  if (Array.isArray(pt.signal) && pt.signal.length !== 1) return { reason: `${pt.signal.length}-signal port (the em2d check covers single-signal ports)` };
  if ((pt.mode_type ?? 'tem') !== 'tem') return { reason: `${pt.mode_type} port (impedance from the 3D port eigenmode, not compared)` };
  const signal = Array.isArray(pt.signal) ? pt.signal[0] : pt.signal;
  if (signal == null) return { reason: 'no signal conductor' };
  const ax = pt.side[0];
  const F = e.box_um[ax][pt.side.endsWith('max') ? 1 : 0];
  const [u, v] = ['x', 'y', 'z'].filter((k) => k !== ax);
  const bc = e.bc ?? {};
  const sideBc = (k) => (bc[k] != null ? (bc[k] === 'pec' ? 'pec' : 'pmc') : (e.ports ?? []).some((p) => p.side === k) ? 'pmc' : 'pec');
  const diel = [],
    cond = [];
  for (const s of e.solids ?? []) {
    const b = solidBounds(s, e.axis ?? 'z');
    if (!b || !(b[ax][0] < F + 1e-9 && b[ax][1] > F - 1e-9)) continue;
    let shape;
    if (s.cylinder_um && ax === 'z') shape = { circle: { c: s.cylinder_um.c, r: s.cylinder_um.r, n: s.cylinder_um.n ?? 24 } };
    else shape = { rect: { x: b[u], y: b[v] } };
    if (s.kind === 'conductor') cond.push({ name: s.name, role: s.name === signal ? 'signal' : 'ground', ...shape });
    else diel.push({ name: s.name, material: s.material, ...shape });
  }
  if (!cond.some((x) => x.role === 'signal')) return { reason: `signal ${signal} does not cross the port face` };
  try {
    const sec = buildSection({
      box: { x: e.box_um[u], y: e.box_um[v], bc: { left: sideBc(`${u}min`), right: sideBc(`${u}max`), bottom: sideBc(`${v}min`), top: sideBc(`${v}max`) } },
      background: e.background ?? 'air',
      dielectrics: diel,
      conductors: cond,
      mesh: { order: 2, conductor_cells: 4 },
    });
    const P2 = prepareRlgc(sec, makeMaterials(e.materials ?? {}), { conductor_model: 'pec' });
    const r = rlgcAt(P2, fHz);
    const { Z, Y } = zyFromRlgc(r);
    return { z: modalAnalysis(Z, Y, 2 * Math.PI * fHz).Zc.re[0] };
  } catch (err) {
    return { reason: `em2d error: ${String(err?.message ?? err)}` };
  }
}

function conductorProps(e, s, i) {
  const model = s.model ?? 'pec';
  if (model === 'pec') return { kind: 'conductor', model };
  let sigma = s.sigma_S_m;
  if (sigma == null) {
    const m = e.conductor_materials?.[s.conductor] ?? fail(`solids[${i}]: conductor material ${s.conductor} undefined`);
    sigma = m.sigma_S_m;
    if (e.temperature_C != null && m.tcr_per_K) sigma = sigma / (1 + m.tcr_per_K * (e.temperature_C - (m.T_ref_C ?? 20)));
  }
  return { kind: 'conductor', model, sigma_S_m: sigma, roughness: s.roughness ?? null };
}

const cm = (M) => {
  const out = [];
  for (let i = 0; i < M.r; i++) {
    const row = [];
    for (let j = 0; j < M.c; j++) row.push([M.re[i * M.c + j], M.im[i * M.c + j]]);
    out.push(row);
  }
  return out;
};

/** Pi model of a 2-port from Y: series Z = -1/Y12 (R + j w L), shunts Y11 + Y12, Y22 + Y12 (j w C). */
function piModel(Y, w) {
  const g = (k) => [Y.re[k], Y.im[k]];
  const y12 = g(1),
    y11 = g(0),
    y22 = g(3);
  const d = y12[0] * y12[0] + y12[1] * y12[1];
  const zs = [-y12[0] / d, y12[1] / d]; // -1 / y12
  return { R_ohm: zs[0], L_H: zs[1] / w, C1_F: (y11[1] + y12[1]) / w, C2_F: (y22[1] + y12[1]) / w, G1_S: y11[0] + y12[0], G2_S: y22[0] + y12[0] };
}

/** |det Z| / max(|Z11 Z22|, |Z12 Z21|) of a 2-port Z: the relative cancellation in det Z (ABCD B, Y = Z^-1). */
function detCancellation(Z) {
  const g = (k) => [Z.re[k], Z.im[k]];
  const m = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const p = m(g(0), g(3)),
    q = m(g(1), g(2));
  return Math.hypot(p[0] - q[0], p[1] - q[1]) / Math.max(Math.hypot(...p), Math.hypot(...q));
}

function runVariant(c, e, vid, title, log, onProgress, factor) {
  const emit = (ev) => onProgress?.({ case: c.id, variant: vid, ...ev });
  const T0 = now();
  const warnings = [];
  const axis = e.axis ?? 'z';
  const solids = e.solids ?? [];
  checkNeedleIbc(e, axis);
  const portChecks = checkPortLeads(e, warnings);
  const plan = deembedPlan(e, warnings);
  const fw = factorFallbackWarning(factor);
  if (fw) warnings.push(fw);
  // a port face that crosses a PML slab: the port modes (ports.mjs) use the unstretched materials (lane L13 test
  // microstrip, PML on zmax across both port faces: zero-length de-embedded core |S11| 2e-2 at 10 GHz instead of 1e-6)
  for (const pt of e.ports ?? [])
    for (const side of Object.keys(e.pml ?? {}))
      if (side[0] !== pt.side[0]) warnings.push(`port ${pt.name}: the port face crosses the PML slab on ${side}; port modes ignore the PML stretch, so port reflections and line-run de-embedding carry errors of order 1e-2`);
  // line run: the device mesh conforms to each reference plane, and each companion is cut out of it (A3 S3)
  const lrPorts = plan.lineRun ? (e.ports ?? []).map((p) => ((p.deembed_um ?? 0) > 0 ? p : null)) : [];
  const cuts = lrPorts.filter(Boolean).map((p) => {
    const k = portCut(e, p);
    return { axis: k.ax, at_um: k.at };
  });
  const meshSpec = { box: e.box_um, axis, solids: solids.map((s, i) => solidSpec(s, i, axis)), mesh: e.mesh ?? {}, cuts };
  emit({ stage: 'mesh' });
  const tm = now();
  const mesh = buildLayeredMesh(meshSpec);
  const meshMs = now() - tm;
  emit({ stage: 'setup', ms: meshMs, tets: mesh.stats.tets });
  const materials = makeMaterials(e.materials ?? {});
  const solidProps = solids.map((s, i) => (s.kind === 'conductor' ? conductorProps(e, s, i) : { kind: 'dielectric', material: s.material }));
  const ports = (e.ports ?? []).map((p) => ({ name: p.name, side: p.side, mode: p.mode ?? { type: p.mode_type ?? 'tem', signal: p.signal }, deembed_um: plan.lineRun ? 0 : p.deembed_um ?? 0 }));
  const common = { materials, background: e.background ?? 'air', solidProps, bc: e.bc ?? {}, max_dof: e.max_dof, factor };
  const P = prepare3d(mesh, { ...common, ports, pml: e.pml ?? {} });
  log?.(`[em3d] ${c.id}/${vid}: ${mesh.stats.tets} tets, ${P.nFree} DOF, nnzL ${P.sym.nnzL}`);
  const targets = (c.targets ?? []).filter((t) => !t.variant || (Array.isArray(t.variant) ? t.variant.includes(vid) : t.variant === vid));
  const freqs = sweepFrequencies(e.sweep, targets.map((t) => t.f_GHz)).filter((f) => f > 0);
  const zref = e.zref_ohm ?? 50;
  const rows = [];
  const Sref = [];
  emit({ stage: 'ready', dof: P.nFree, nnzL: P.sym.nnzL, n: freqs.length });
  // companions: mesh cut and symbolic analysis once per variant; numeric factor and solve at every frequency
  const companions = plan.lineRun
    ? lrPorts.map((pt) => {
        if (!pt) return null;
        const t = now();
        const cp = prepareCompanion(e, mesh, pt, common);
        cp.setup_ms = now() - t;
        cp.solve_ms = 0;
        log?.(`[em3d] ${c.id}/${vid}: line-run companion ${pt.name}: ${cp.tets} tets, ${cp.P.nFree} DOF, reference plane ${cp.cut.ax} = ${cp.cut.at} um`);
        emit({ stage: 'companion', companion: pt.name, dof: cp.P.nFree, tets: cp.tets, ms: cp.setup_ms });
        for (const w of cp.P.warnings) warnings.push(`line-run companion ${pt.name}: ${w}`);
        return cp;
      })
    : null;
  const lfBad = [];
  let zCheckDone = false;
  for (const [fi, fG] of freqs.entries()) {
    emit({ stage: 'frequency', i: fi, n: freqs.length, f_GHz: fG });
    const r = solveAt(P, fG * 1e9, { onProgress: onProgress ? (ev) => emit({ ...ev, i: fi, n: freqs.length }) : null });
    const cr = companions
      ? companions.map((cp) => {
          if (!cp) return null;
          const q = solveAt(cp.P, fG * 1e9, { onProgress: onProgress ? (ev) => emit({ ...ev, i: fi, n: freqs.length, companion: cp.port }) : null });
          cp.solve_ms += q.timing.total_ms;
          if (cp.z_face_ohm == null) (cp.z_face_ohm = q.zref[0]), (cp.z_ref_ohm = q.zref[1]);
          if (passivityMaxSv(q.S) > 1 + 1e-6) warnings.push(`line-run companion ${cp.port}, f ${fG} GHz: not passive (max singular value ${passivityMaxSv(q.S)})`);
          return q;
        })
      : null;
    const compMs = cr ? cr.reduce((a, q) => a + (q ? q.timing.total_ms : 0), 0) : 0;
    emit({ stage: 'frequency_done', i: fi, n: freqs.length, f_GHz: fG, ms: r.timing.total_ms + compMs });
    if (!zCheckDone && (e.port_z_check ?? true)) {
      zCheckDone = true;
      let off = 0;
      for (const [pi, pt] of (e.ports ?? []).entries()) {
        const t0 = off; // terminal index of this port's first mode (zref is per terminal; A3 S4)
        off += r.ports[pi].K;
        const pc = portChecks.find((q) => q.port === pt.name) ?? (portChecks.push({ port: pt.name }), portChecks[portChecks.length - 1]);
        const z2 = portZ2d(e, pt, fG * 1e9);
        if (z2.reason) {
          Object.assign(pc, { z_check: 'not_checked', z_check_reason: z2.reason });
          warnings.push(`port ${pt.name}: port-impedance check not checked: ${z2.reason}`);
          continue;
        }
        const zp = r.zref[t0];
        const rel = zp / z2.z - 1;
        Object.assign(pc, { z_check: Math.abs(rel) > 0.03 ? 'warn' : 'ok', z_port_ohm: zp, z_em2d_ohm: z2.z, z_rel: rel, f_GHz: fG });
        if (Math.abs(rel) > 0.03)
          warnings.push(`port ${pt.name}: 3D port-face impedance ${zp.toFixed(2)} ohm differs from the converged 2D cross-section (em2d) ${z2.z.toFixed(2)} ohm by ${(100 * rel).toFixed(1)} %: the 3D mesh under-resolves the line cross-section (refine near the conductors: h_um, mesh.dz_min_um); S at a fixed reference and line-dominated results carry this error`);
      }
    }
    // Zb: block Z at the reference planes (terminal normalization), from the solver's Z (no S -> Z round trip)
    let S, Zb;
    let lfc = null;
    if (companions) {
      // T_raw = T1 . T_core . reverse(T2), T_p = companion p (port face -> reference plane); S_core at zref
      let Tcore = zToAbcd(r.Z);
      lfc = detCancellation(r.Z);
      if (cr[0]) Tcore = abcdMul(abcdInv(zToAbcd(cr[0].Z)), Tcore);
      if (cr[1]) Tcore = abcdMul(Tcore, abcdInv(abcdReverse(zToAbcd(cr[1].Z))));
      for (const q of cr) if (q) lfc = Math.min(lfc, detCancellation(q.Z));
      Zb = abcdToZ(Tcore);
      S = zToS(Zb, [zref, zref]);
    } else {
      Zb = r.Z;
      S = renormalize(r.S, r.zref, r.zref.map(() => zref));
    }
    if (Zb.r === 2) {
      const d = detCancellation(Zb);
      lfc = lfc == null ? d : Math.min(lfc, d);
      if (lfc < LF_CANCELLATION_LIMIT) lfBad.push([fG, lfc]);
    }
    Sref.push(S);
    const row = { f_GHz: fG, terminals: r.terminals, zref_native_ohm: r.zref, S_port_ref: cm(r.S), S: cm(S), ports: r.ports.map((p) => ({ name: p.name, modes: p.K, Z0_ohm: p.Z0, beta_rad_m: p.betas, fullwave: p.fullwave })), checks: { max_singular_value: passivityMaxSv(S), reciprocity_error: reciprocityError(S), det_cancellation: lfc }, timing: { ...r.timing, companions_ms: compMs } };
    if (e.lumped === 'pi' && S.r === 2) row.pi = piModel(cmatInv(Zb), 2 * Math.PI * fG * 1e9);
    if (e.mixed_mode_pairs?.length) {
      const mm = mixedMode(S, e.mixed_mode_pairs);
      row.mixed_mode = { pairs: e.mixed_mode_pairs, Sdd: cm(mm.Sdd), Scc: cm(mm.Scc), Sdc: cm(mm.Sdc) };
    }
    rows.push(row);
  }
  if (lfBad.length)
    warnings.push(`low-frequency conditioning: det Z of the 2-port cancels below ${LF_CANCELLATION_LIMIT} of its terms at ${lfBad.map(([f, d]) => `${f} GHz (${d.toExponential(1)})`).join(', ')}; ${companions ? 'line-run de-embedding and ' : ''}the pi model lose precision there (shunt C first: EM-4 C +26 % at 0.01 GHz); use frequencies where the cancellation stays above ${LF_CANCELLATION_LIMIT}`);
  const dbAt = (k, to, from) => {
    const S = Sref[k];
    return 20 * Math.log10(Math.hypot(S.re[to * S.c + from], S.im[to * S.c + from]));
  };
  const targetOut = targets.map((t) => {
    const k = freqs.findIndex((f) => Math.abs(f - t.f_GHz) < 1e-9 * f);
    let v = null;
    if (t.quantity === 'S_dB') v = dbAt(k, t.to ?? 1, t.from ?? 0);
    else if (t.quantity === 'L_H' || t.quantity === 'C1_F' || t.quantity === 'C2_F') v = rows[k].pi?.[t.quantity];
    else fail(`target quantity ${t.quantity} (S_dB | L_H | C1_F | C2_F)`);
    const tol = t.tolerance ?? {};
    const pass = tol.abs != null ? Math.abs(v - t.value) <= tol.abs : tol.rel != null ? Math.abs(v / t.value - 1) <= tol.rel : null;
    return { metric_id: t.metric_id ?? null, quantity: t.quantity, f_GHz: t.f_GHz, value: t.value, computed: v, pass, tier: t.tier ?? null };
  });
  warnings.push(...P.warnings);
  for (const r of rows) if (r.checks.max_singular_value > 1 + 1e-6) warnings.push(`f ${r.f_GHz} GHz: S not passive (max singular value ${r.checks.max_singular_value})`);
  const deembedText = plan.lineRun
    ? `de-embedded by same-mesh line-run companions (2-port ABCD), reference planes ${companions.filter(Boolean).map((cp) => `${cp.port} at ${cp.cut.ax} = ${cp.cut.at} um`).join(', ')}`
    : (e.ports ?? []).some((p) => (p.deembed_um ?? 0) > 0)
      ? `de-embedded by port extension (${(e.ports ?? []).map((p) => `${p.name} ${p.deembed_um ?? 0} um`).join(', ')})`
      : 'not de-embedded (reference planes at the port faces)';
  const touchstone = e.touchstone && freqs.length
    ? [{ name: `${c.id.replaceAll('/', '_')}${vid === 'base' ? '' : '_' + vid}.s${ports.length}p`, text: writeTouchstone({ freqsHz: freqs.map((f) => f * 1e9), S: Sref, zref, comments: [`ap-sim em3d case ${c.id} variant ${vid}`, `ports ${ports.map((p) => p.name).join(', ')}; ${deembedText}`] }) }]
    : [];
  const fsum = rows.reduce((a, r) => a + r.timing.total_ms + r.timing.companions_ms, 0);
  return {
    variant: vid,
    title,
    type: 'em3d_sparams',
    status: c.status ?? 'unvalidated',
    mesh: { ...mesh.stats, ...P.stats },
    fields: null,
    derived: {
      zref_ohm: zref,
      freqs_GHz: freqs,
      rows,
      port_checks: portChecks,
      deembed_method: plan.method,
      companions: companions ? companions.map((cp) => (cp ? { port: cp.port, dof: cp.P.nFree, tets: cp.tets, reference_plane: { axis: cp.cut.ax, at_um: cp.cut.at }, layers: cp.layers, tris2d: cp.tris2d, pml_sides: Object.keys(cp.P.p.pml ?? {}), z_face_ohm: cp.z_face_ohm ?? null, z_ref_ohm: cp.z_ref_ohm ?? null, setup_ms: cp.setup_ms, ms: cp.solve_ms } : null)) : null,
    },
    targets: targetOut,
    touchstone,
    timing: { mesh_ms: meshMs, setup_ms: P.stats.setup_ms, mean_freq_ms: fsum / Math.max(1, rows.length), total_ms: now() - T0, rss_MB: typeof process !== 'undefined' ? process.memoryUsage().rss / 2 ** 20 : null },
    warnings,
  };
}

export function runEm3d(caseConfig, opts = {}) {
  const c = parseEm3dCase(caseConfig);
  const e = c.em3d;
  const list = [{ id: 'base', title: 'base case', patch: null }, ...(e.variants ?? [])];
  const want = opts.variants ?? list.map((v) => v.id);
  const out = [];
  for (const v of list) if (want.includes(v.id)) out.push(runVariant(c, v.patch ? applyPatch(e, v.patch) : e, v.id, v.title ?? v.id, opts.log, opts.onProgress, opts.factor));
  return { case: c.id, title: c.title ?? null, family: 'em3d', status: c.status ?? 'unvalidated', variants: out, assumptions: c.assumptions ?? [], missing: c.missing ?? [] };
}
