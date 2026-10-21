// EM 2D case runner: runEm2d(caseConfig) -> results JSON (SPEC section 5 style; fields omitted). Pure function: no
// file IO (the CLI writes Touchstone text if asked). Case schema: DevLog/lanes/L7-em2d.md "Proposed SPEC addition:
// EM 2D case". License: GPL-3.0-or-later.

import { buildSection } from './section.mjs';
import { makeMaterials } from './dielectric.mjs';
import { prepareRlgc, rlgcAt } from './rlgc.mjs';
import { zyFromRlgc, modalAnalysis, chainMatrix, chainToY, yToS, crosstalk, mixedMode, passivityMaxSv, reciprocityError } from './mtl.mjs';
import { writeTouchstone } from './touchstone.mjs';
import { factorFallbackWarning } from './ldlt-select.mjs';

export class Em2dCaseError extends Error {}
const fail = (m) => {
  throw new Em2dCaseError(`em2d case: ${m}`);
};
const now = () => performance.now();

const CASE_KEYS = ['schema', 'id', 'title', 'status', 'family', 'em2d', 'targets', 'assumptions', 'missing', 'notes'];
const EM_KEYS = ['section', 'materials', 'conductor_materials', 'temperature_C', 'conductor_model', 'return', 'roughness_reactance', 'mesh', 'sweep', 'lines', 'mixed_mode_pairs', 'touchstone', 'variants'];
const SECTION_KEYS = ['box', 'background', 'dielectrics', 'conductors'];
const BOX_KEYS = ['x_um', 'y_um', 'bc'];
const SHAPE_KEYS = ['rect_um', 'poly_um', 'circle_um', 'half_annulus_um'];
const DIEL_KEYS = ['name', 'material', ...SHAPE_KEYS, 'ref', 'note', 'status'];
const COND_KEYS = ['name', 'role', 'conductor', 'sigma_S_m', 'roughness', ...SHAPE_KEYS, 'ref', 'note', 'status'];
const MESH_KEYS = ['order', 'max_edge_um', 'grade', 'skin_cells', 'f_max_GHz', 'layer_cells', 'conductor_cells', 'window_um', 'far_factor', 'max_vertices', 'min_edge_um'];
const MAT_KEYS = ['model', 'eps_r', 'tan_delta', 'sigma_S_m', 'f_ref_Hz', 'f_low_Hz', 'f_high_Hz', 'points', 'lorentz_damping', 'weight_dk', 'weight_df', 'ref', 'note', 'status'];
const CMAT_KEYS = ['sigma_S_m', 'tcr_per_K', 'T_ref_C', 'ref', 'note', 'status'];
const TARGET_KEYS = ['metric_id', 'quantity', 'f_GHz', 'value', 'unit', 'tolerance', 'tier', 'variant', 'signal', 'victim', 'aggressor', 'line', 'mode', 'note', 'locator'];
const QUANTITIES = ['alpha_dB_mm', 'Z0_ohm', 'eps_eff', 'IL_dB', 'RL_dB', 'NEXT_dB', 'FEXT_dB', 'R_ohm_per_m', 'L_H_per_m', 'C_F_per_m', 'G_S_per_m'];

function keys(obj, allowed, where) {
  if (obj == null) return;
  if (typeof obj !== 'object' || Array.isArray(obj)) fail(`${where}: must be a mapping`);
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) fail(`${where}: unknown key ${k} (allowed: ${allowed.join(', ')})`);
}

/** Validate the case (unknown keys are errors). */
export function parseEm2dCase(c) {
  keys(c, CASE_KEYS, 'case');
  if (c.schema !== 'ap-sim/0') fail(`schema must be ap-sim/0 (got ${c.schema})`);
  if (c.family !== 'em2d') fail(`family must be em2d (got ${c.family})`);
  if (typeof c.id !== 'string' || !c.id) fail('id is required');
  const e = c.em2d ?? fail('em2d block is required');
  keys(e, EM_KEYS, 'em2d');
  keys(e.section, SECTION_KEYS, 'em2d.section');
  keys(e.section?.box, BOX_KEYS, 'em2d.section.box');
  (e.section?.dielectrics ?? []).forEach((d, i) => keys(d, DIEL_KEYS, `em2d.section.dielectrics[${i}]`));
  (e.section?.conductors ?? []).forEach((d, i) => keys(d, COND_KEYS, `em2d.section.conductors[${i}]`));
  keys(e.mesh, MESH_KEYS, 'em2d.mesh');
  for (const [k, v] of Object.entries(e.materials ?? {})) keys(v, MAT_KEYS, `em2d.materials.${k}`);
  for (const [k, v] of Object.entries(e.conductor_materials ?? {})) keys(v, CMAT_KEYS, `em2d.conductor_materials.${k}`);
  (c.targets ?? []).forEach((t, i) => {
    keys(t, TARGET_KEYS, `targets[${i}]`);
    if (!QUANTITIES.includes(t.quantity)) fail(`targets[${i}].quantity ${t.quantity} not in ${QUANTITIES.join(' | ')}`);
    if (!(t.f_GHz >= 0)) fail(`targets[${i}].f_GHz is required`);
  });
  (e.variants ?? []).forEach((v, i) => {
    keys(v, ['id', 'title', 'patch', 'note'], `em2d.variants[${i}]`);
    if (!v.id) fail(`em2d.variants[${i}].id is required`);
  });
  return c;
}

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
/** Deep merge; null deletes. section.dielectrics / section.conductors patches are keyed by element name. */
export function applyPatch(base, patch) {
  if (!isObj(patch)) return patch === undefined ? base : patch;
  const out = isObj(base) ? { ...base } : {};
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) delete out[k];
    else if ((k === 'dielectrics' || k === 'conductors' || k === 'solids') && Array.isArray(out[k]) && isObj(v)) {
      out[k] = out[k].map((el) => (Object.hasOwn(v, el.name) ? (v[el.name] === null ? null : applyPatch(el, v[el.name])) : el)).filter(Boolean);
      for (const n of Object.keys(v)) if (!out[k].some((el) => el.name === n) && v[n] !== null) fail(`patch: no ${k} element named ${n}`);
    } else out[k] = applyPatch(out[k], v);
  }
  return out;
}

const shapeFromCase = (d, where) => {
  if (d.rect_um) return { rect: { x: d.rect_um.x, y: d.rect_um.y } };
  if (d.poly_um) return { poly: d.poly_um };
  if (d.circle_um) return { circle: d.circle_um };
  if (d.half_annulus_um) return { half_annulus: d.half_annulus_um };
  return fail(`${where}: one of ${SHAPE_KEYS.join(', ')} is required`);
};

/** Conductivity at the case temperature: sigma = sigma_ref / (1 + tcr (T - T_ref)) (linear resistivity model). */
function conductorSigma(e, c, where) {
  if (c.sigma_S_m != null) return { sigma: c.sigma_S_m, basis: 'conductor.sigma_S_m' };
  const m = e.conductor_materials?.[c.conductor] ?? fail(`${where}: conductor material "${c.conductor}" not defined (or give sigma_S_m)`);
  const s0 = m.sigma_S_m ?? fail(`${where}: conductor_materials.${c.conductor}.sigma_S_m required`);
  if (e.temperature_C == null || !m.tcr_per_K) return { sigma: s0, basis: `${c.conductor} sigma_S_m` };
  const s = s0 / (1 + m.tcr_per_K * (e.temperature_C - (m.T_ref_C ?? 20)));
  return { sigma: s, basis: `${c.conductor} sigma_S_m / (1 + tcr (T - T_ref)) at ${e.temperature_C} C` };
}

export function sweepFrequencies(sw, extra = []) {
  let f = [];
  if (!sw) fail('em2d.sweep is required');
  if (Array.isArray(sw.f_GHz)) f = sw.f_GHz.slice();
  else {
    const { start_GHz: a, stop_GHz: b, points: n } = sw;
    if (!(b > a && a >= 0 && n >= 2)) fail('sweep needs start_GHz < stop_GHz and points >= 2');
    const log = sw.spacing === 'log';
    if (log && !(a > 0)) fail('log sweep needs start_GHz > 0');
    for (let i = 0; i < n; i++) f.push(log ? a * (b / a) ** (i / (n - 1)) : a + ((b - a) * i) / (n - 1));
  }
  f.push(...extra);
  return [...new Set(f.map((v) => +v.toPrecision(12)))].sort((x, y) => x - y);
}

function buildSpec(e, warnings) {
  const s = e.section ?? fail('em2d.section is required');
  const box = s.box ?? fail('section.box is required');
  const conductors = (s.conductors ?? []).map((c, i) => {
    const where = `section.conductors[${i}]`;
    const sg = e.conductor_model === 'pec' ? { sigma: c.sigma_S_m ?? null } : conductorSigma(e, c, where);
    return { name: c.name ?? `c${i}`, role: c.role, sigma_S_m: sg.sigma, roughness: c.roughness ?? null, ...shapeFromCase(c, where), _sigmaBasis: sg.basis };
  });
  const m = e.mesh ?? {};
  return {
    box: { x: box.x_um, y: box.y_um, bc: box.bc },
    background: s.background ?? 'air',
    dielectrics: (s.dielectrics ?? []).map((d, i) => ({ name: d.name ?? `d${i}`, material: d.material, ...shapeFromCase(d, `section.dielectrics[${i}]`) })),
    conductors,
    mesh: {
      order: m.order,
      max_edge_um: m.max_edge_um,
      grade: m.grade,
      skin_cells: m.skin_cells,
      f_max_Hz: m.f_max_GHz != null ? m.f_max_GHz * 1e9 : null,
      layer_cells: m.layer_cells,
      conductor_cells: m.conductor_cells,
      window_um: m.window_um,
      far_factor: m.far_factor,
      max_vertices: m.max_vertices,
      min_edge_um: m.min_edge_um,
    },
  };
}

const matArr = (A, N) => Array.from(A);
const cmArr = (M) => {
  const out = [];
  for (let i = 0; i < M.r; i++) {
    const row = [];
    for (let j = 0; j < M.c; j++) row.push([M.re[i * M.c + j], M.im[i * M.c + j]]);
    out.push(row);
  }
  return out;
};

function runVariant(c, e, variantId, title, log, onProgress, factor) {
  const emit = (ev) => onProgress?.({ case: c.id, variant: variantId, ...ev });
  const warnings = [];
  if (factorFallbackWarning(factor)) warnings.push(factorFallbackWarning(factor));
  const T0 = now();
  const spec = buildSpec(e, warnings);
  const sigmaBasis = Object.fromEntries(spec.conductors.map((x) => [x.name, { sigma_S_m: x.sigma_S_m, basis: x._sigmaBasis }]));
  const materials = makeMaterials(e.materials ?? {});
  for (const [k, m] of Object.entries(materials)) if (!m.causal && Object.hasOwn(e.materials ?? {}, k)) warnings.push(`material ${k}: model ${m.model} is not causal (frequency-domain use only)`);
  const targets = (c.targets ?? []).filter((t) => !t.variant || (Array.isArray(t.variant) ? t.variant.includes(variantId) : t.variant === variantId));
  const freqs = sweepFrequencies(e.sweep, targets.map((t) => t.f_GHz));
  const fMax = Math.max(...freqs);
  if (spec.mesh.f_max_Hz == null) spec.mesh.f_max_Hz = fMax * 1e9;
  else if (spec.mesh.f_max_Hz < fMax * 1e9 * (1 - 1e-9)) warnings.push(`mesh.f_max_GHz ${spec.mesh.f_max_Hz / 1e9} is below the sweep maximum ${fMax}: skin depth under-resolved at the top of the band`);
  emit({ stage: 'mesh' });
  const tm = now();
  const sec = buildSection(spec);
  const meshMs = now() - tm;
  const P = prepareRlgc(sec, materials, { conductor_model: e.conductor_model ?? 'volumetric', return: e.return ?? 'auto', roughness_reactance: e.roughness_reactance ?? true, factor });
  log?.(`[em2d] ${c.id}/${variantId}: mesh ${sec.stats.tris} tris (${meshMs.toFixed(0)} ms), DOF es ${P.stats.dof_es} mqs ${P.stats.dof_mqs}`);
  const N = P.N;
  const lines = (e.lines ?? []).map((l, i) => {
    if (!(l.length_mm > 0)) fail(`lines[${i}].length_mm > 0 required`);
    return { length_mm: l.length_mm, zref: l.zref_ohm ?? 50, S: [] };
  });
  const rlgc = [],
    modes = [],
    perFreq = [];
  emit({ stage: 'ready', dof_es: P.stats.dof_es, dof_mqs: P.stats.dof_mqs, n: freqs.length });
  for (const [fi, fG] of freqs.entries()) {
    emit({ stage: 'frequency', i: fi, n: freqs.length, f_GHz: fG });
    const t0 = now();
    const r = rlgcAt(P, fG * 1e9);
    const { Z, Y, w } = zyFromRlgc(r);
    let md = null;
    if (w > 0) {
      md = modalAnalysis(Z, Y, w);
      if (md.condTv > 1e10) warnings.push(`f ${fG} GHz: modal matrix ill-conditioned (cond ${md.condTv.toExponential(1)}); S uses the exact chain matrix`);
    }
    rlgc.push({ f_GHz: fG, R_ohm_per_m: matArr(r.R), L_H_per_m: matArr(r.L), G_S_per_m: matArr(r.G), C_F_per_m: matArr(r.C), diag: r.diag });
    modes.push(
      md
        ? {
            f_GHz: fG,
            modes: md.modes.map((m, k) => {
              const v = Array.from({ length: N }, (_, i) => [md.Tv.re[i * N + k], md.Tv.im[i * N + k]]);
              // parity for a pair: odd if |v0 + v1| < |v0 - v1|
              const parity = N === 2 ? (Math.hypot(v[0][0] + v[1][0], v[0][1] + v[1][1]) < Math.hypot(v[0][0] - v[1][0], v[0][1] - v[1][1]) ? 'odd' : 'even') : null;
              return { alpha_dB_mm: m.alpha_dB_mm, alpha_Np_m: m.alpha_Np_m, beta_rad_m: m.beta_rad_m, eps_eff: m.eps_eff, parity, voltage_vector: v };
            }),
            Zc_ohm: cmArr(md.Zc),
          }
        : { f_GHz: fG, modes: null, Zc_ohm: null },
    );
    for (const l of lines) {
      const zr = l.zref === 'z0' ? zrefFromModes(md, N) : l.zref;
      const S = yToS(chainToY(chainMatrix(Z, Y, l.length_mm * 1e-3)), Array.isArray(zr) ? [...zr, ...zr] : zr);
      l.S.push({ f: fG, S, zr });
    }
    perFreq.push({ f_GHz: fG, ms: now() - t0, ...r.timing });
    emit({ stage: 'frequency_done', i: fi, n: freqs.length, f_GHz: fG, ms: now() - t0 });
  }
  // line outputs
  const lineOut = lines.map((l, li) => {
    const tables = l.S.map(({ f, S }) => ({ f_GHz: f, ...crosstalk(S) }));
    let maxSv = 0,
      maxRecip = 0;
    for (const { S } of l.S) {
      maxSv = Math.max(maxSv, passivityMaxSv(S));
      maxRecip = Math.max(maxRecip, reciprocityError(S));
    }
    const out = { length_mm: l.length_mm, zref_ohm: l.zref, tables, checks: { max_singular_value: maxSv, passive: maxSv <= 1 + 1e-9, max_reciprocity_error: maxRecip } };
    if (e.mixed_mode_pairs?.length) {
      const pairs = [];
      for (const [p, n] of e.mixed_mode_pairs) pairs.push([p, n], [N + p, N + n]);
      out.mixed_mode = l.S.map(({ f, S }) => ({ f_GHz: f, Sdd: cmArr(mixedMode(S, pairs).Sdd), Scc: cmArr(mixedMode(S, pairs).Scc) }));
    }
    out.s_params = l.S.map(({ f, S }) => ({ f_GHz: f, S: cmArr(S) }));
    return out;
  });
  const tsLines = e.touchstone ? lines.filter((l) => (l.zref === 'z0' ? (warnings.push(`line ${l.length_mm} mm: zref z0 varies with frequency; no Touchstone written`), false) : true)) : [];
  const touchstone = e.touchstone
    ? tsLines.map((l) => ({
        name: `${c.id.replaceAll('/', '_')}${variantId === 'base' ? '' : '_' + variantId}_L${l.length_mm}mm.s${2 * N}p`,
        text: writeTouchstone({
          freqsHz: l.S.map((s) => s.f * 1e9),
          S: l.S.map((s) => s.S),
          zref: Array.isArray(l.zref) ? [...l.zref, ...l.zref] : typeof l.zref === 'number' ? l.zref : 50,
          comments: [`ap-sim em2d case ${c.id} variant ${variantId}`, `length ${l.length_mm} mm; ports 1..${N} near ends, ${N + 1}..${2 * N} far ends (signals ${P.signals.map((s) => s.name).join(', ')})`],
        }),
      }))
    : [];
  // targets
  const targetOut = targets.map((t) => {
    const k = freqs.findIndex((f) => Math.abs(f - t.f_GHz) <= 1e-9 * Math.max(1, f));
    const sig = t.signal ?? 0;
    let v = null;
    const md = modes[k];
    const mi = typeof t.mode === 'string' ? md.modes.findIndex((m) => m.parity === t.mode) : t.mode ?? 0;
    if ((t.quantity === 'alpha_dB_mm' || t.quantity === 'eps_eff') && !(mi >= 0)) fail(`target ${t.metric_id}: mode ${t.mode} not found`);
    if (t.quantity === 'alpha_dB_mm') v = md.modes[mi].alpha_dB_mm;
    else if (t.quantity === 'eps_eff') v = md.modes[mi].eps_eff;
    else if (t.quantity === 'Z0_ohm') v = md.Zc_ohm[sig][sig][0];
    else if (['R_ohm_per_m', 'L_H_per_m', 'C_F_per_m', 'G_S_per_m'].includes(t.quantity)) v = rlgc[k][t.quantity][sig * N + sig];
    else {
      const tab = lineOut[t.line ?? 0]?.tables[k] ?? fail(`target ${t.metric_id}: needs em2d.lines`);
      if (t.quantity === 'IL_dB') v = tab.IL_dB[sig];
      else if (t.quantity === 'RL_dB') v = tab.RL_dB[sig];
      else if (t.quantity === 'NEXT_dB') v = tab.NEXT_dB[t.aggressor ?? 0][t.victim ?? 1];
      else if (t.quantity === 'FEXT_dB') v = tab.FEXT_dB[t.aggressor ?? 0][t.victim ?? 1];
    }
    const rel = t.value ? v / t.value - 1 : null;
    const tol = t.tolerance ?? {};
    const pass = tol.rel != null ? Math.abs(rel) <= tol.rel : tol.abs != null ? Math.abs(v - t.value) <= tol.abs : null;
    return { metric_id: t.metric_id, quantity: t.quantity, f_GHz: t.f_GHz, value: t.value, unit: t.unit ?? null, computed: v, rel_err: rel, tolerance: tol, pass, tier: t.tier ?? null };
  });
  const materialsOut = {};
  for (const [k, m] of Object.entries(materials)) if (Object.hasOwn(e.materials ?? {}, k)) materialsOut[k] = { model: m.model, causal: m.causal, params: m.params, fit: m.fit ?? null };
  const tot = now() - T0;
  const fpos = perFreq.filter((p) => p.f_GHz > 0);
  return {
    variant: variantId,
    title,
    status: c.status ?? 'unvalidated',
    type: 'em2d_rlgc',
    mesh: { ...sec.stats, order: sec.order, sizing: sec.sizing, dof_es: P.stats.dof_es, dof_mqs: P.stats.dof_mqs, nnzL_es: P.stats.nnzL_es, nnzL_mqs: P.stats.nnzL_mqs },
    fields: null,
    derived: { signals: P.signals.map((s) => s.name), conductors: sigmaBasis, return: P.ret, freqs_GHz: freqs, rlgc, modes, lines: lineOut, materials: materialsOut },
    targets: targetOut,
    touchstone,
    timing: { mesh_ms: meshMs, setup_ms: P.setupMs, per_freq: perFreq, mean_freq_ms: fpos.reduce((a, p) => a + p.ms, 0) / Math.max(1, fpos.length), total_ms: tot },
    warnings,
  };
}

function zrefFromModes(md, N) {
  if (!md) return 50;
  return Array.from({ length: N }, (_, i) => md.Zc.re[i * N + i]);
}

/**
 * Run an EM 2D case. opts.variants: list of variant ids to run (default: 'base' plus every listed variant);
 * opts.log: optional logger.
 * @returns {{case:string, title:string, family:'em2d', variants: object[], assumptions:string[], missing:string[]}}
 */
export function runEm2d(caseConfig, opts = {}) {
  const c = parseEm2dCase(caseConfig);
  const e = c.em2d;
  const list = [{ id: 'base', title: 'base case', patch: null }, ...(e.variants ?? [])];
  const want = opts.variants ?? list.map((v) => v.id);
  const out = [];
  for (const v of list) {
    if (!want.includes(v.id)) continue;
    const ev = v.patch ? applyPatch(e, v.patch) : e;
    out.push(runVariant(c, ev, v.id, v.title ?? v.id, opts.log, opts.onProgress, opts.factor));
  }
  return { case: c.id, title: c.title ?? null, family: 'em2d', status: c.status ?? 'unvalidated', variants: out, assumptions: c.assumptions ?? [], missing: c.missing ?? [] };
}
