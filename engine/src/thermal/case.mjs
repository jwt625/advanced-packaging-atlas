// Case runner (SPEC section 1; DevLog-012 lane L1): validate a case config, generate the boxes, build the grid, run
// the studies. Browser-safe (no Node imports): the UI worker and cli.mjs share it. Dependencies are injected:
// generate (src/families), resolve + materialOf (src/materials library, see libraryAdapter), data (package3d.json),
// metricLookup (metric_id -> {value, unit}; the CLI reads data/metrics.csv). Mechanics studies (thermo_elastic) are
// parsed and passed through for lane L8 (E2) without evaluation.
// License: GPL-3.0-or-later.

import { buildGrid } from '../grid/index.mjs';
import { solveThermal, thermalGridOptions, C_TO_K } from './index.mjs';
import { solveThermalTransient } from './transient.mjs';
import { parseExpression, evaluateAst } from '../params/params.mjs';
import { parseUnit, dimEq } from '../params/units.mjs';

const CASE_KEYS = ['schema', 'id', 'title', 'status', 'family', 'params', 'geometry', 'materials', 'mesh', 'physics', 'studies', 'targets', 'assumptions', 'missing', 'notes'];
const SECTION_KEYS = {
  geometry: ['symmetry', 'drop_kinds', 'resolve'],
  materials: ['map', 'overrides', 'allow_extrapolation', 'cure_shrinkage'],
  // thin: L8 thin-layer merge for mechanics grids (merge.mjs; runMechCase dep `thin`), true | {max_aspect}
  mesh: ['max_xy_mm', 'max_z_mm', 'min_cells_per_layer', 'grading', 'max_nodes', 'snap_xy_um', 'snap_z_um', 'thin'],
  physics: ['thermal', 'mechanics'],
};
export const STUDY_TYPES = Object.freeze(['thermal_stationary', 'thermal_transient', 'thermo_elastic', 'process_sequence', 'thermo_elastic_sweep']);
/** Mechanics study types (lane L8 solvers, dispatched by runCaseAll through runMechCase). */
export const MECH_STUDY_TYPES = Object.freeze(['thermo_elastic', 'process_sequence', 'thermo_elastic_sweep']);
/** materials.cure_shrinkage modes (default off): library = L2 cure_shrinkage as eigenstrain; both = off and library runs. */
export const CURE_SHRINKAGE_MODES = Object.freeze(['off', 'library', 'both']);
const VISCO_ERROR = 'viscoelastic studies are not available: the materials library holds no sourced Prony / WLF data (L8 wave 3: the cached corpus gives only E1 / E2 / Tg / CTE, e.g. JOINT2 Table 8); solveViscoelastic exists as a library function only (SPEC 18)';
const STUDY_KEYS = {
  common: ['id', 'type', 'note', 'params', 'geometry', 'solver', 'materials'],
  thermal_stationary: ['thermal', 'contact_resistance'],
  thermal_transient: ['t_end_s', 'dt_s', 'output_s', 'scheme', 'mass', 'be_steps', 'initial_C', 'probes', 'thermal', 'contact_resistance'],
  thermo_elastic: ['temperature', 'stress_free_C', 'supports', 'element', 'process_steps', 'nonlinear'],
  // rate-form sweep (mech/sweep.mjs): temperature {path_C: [...]} visited in order from the stress-free default
  thermo_elastic_sweep: ['temperature', 'stress_free_C', 'supports', 'element', 'dT_max', 'max_dof'],
  process_sequence: ['steps', 'supports', 'element'], // lane L8 (E4) validates the steps
};
const TARGET_KEYS = ['metric_id', 'quantity', 'selection', 'definition', 'T_C', 'tolerance', 'tier', 'study', 'reference_study', 'value', 'unit', 'tc_C', 'note', 'locator', 'variant', 'allow_singular', 'reason', 'step'];
/** Point flags of L8's stress recovery that mark a mesh-dependent (singular) value (audit A2 S4). */
export const SINGULAR_FLAGS = Object.freeze(['reentrant', 'bimaterial_edge']);
const STATUS = ['unvalidated', 'verified', 'validated', 'measured_regression', 'draft'];
/** Provenance keys of a `{value, status, ref, ...}` number object (A11). */
const PROV_KEYS = new Set(['value', 'status', 'ref', 'refs', 'note', 'basis', 'source', 'locator', 'unit', 'formula', 'inputs', 'values', 'primary_cited', 'verified_on', 'condition']);
export const THERMAL_QUANTITIES = Object.freeze(['Tmax_C', 'Tmin_C', 'Tavg_C', 'Rjc_C_W', 'theta_jc_C_W', 'heat_in_W', 'heat_out_W', 'balance_rel']);
export const MECH_QUANTITIES = Object.freeze(['warpage_um', 'von_mises_max_MPa', 'stress_norm', 'coplanarity_um']);

export class CaseError extends Error {}

function keys(obj, allowed, where) {
  if (obj == null) return;
  if (typeof obj !== 'object' || Array.isArray(obj)) throw new CaseError(`${where}: must be a mapping`);
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) throw new CaseError(`${where}: unknown key ${k} (allowed: ${allowed.join(', ')})`);
}

/** Replace `{value, status, ref, ...}` provenance objects by their value, recursively (numbers anywhere, A11). */
export function unwrapValues(x) {
  if (Array.isArray(x)) return x.map(unwrapValues);
  if (x && typeof x === 'object' && !ArrayBuffer.isView(x)) {
    const ks = Object.keys(x);
    if (ks.includes('value') && ks.every((k) => PROV_KEYS.has(k))) return unwrapValues(x.value);
    return Object.fromEntries(ks.map((k) => [k, unwrapValues(x[k])]));
  }
  return x;
}

function checkNonlinear(n, where) {
  if (n == null || n === true || n === false) return;
  if (typeof n !== 'object' || Array.isArray(n)) throw new CaseError(`${where}: true, false or {max_dof, steps, tol}`);
  keys(n, ['max_dof', 'steps', 'tol'], where);
  for (const k of ['max_dof', 'steps']) if (n[k] != null && !(Number.isInteger(n[k]) && n[k] > 0)) throw new CaseError(`${where}.${k}: positive integer required`);
  if (n.tol != null && !(n.tol > 0 && n.tol < 1)) throw new CaseError(`${where}.tol: number in (0, 1) required`);
}

/** Effective nonlinear option of a thermo_elastic study (study key over physics.mechanics.nonlinear); null = linear. */
export function nonlinearOf(c, s0) {
  const n = unwrapValues(s0?.nonlinear ?? c.physics?.mechanics?.nonlinear ?? null);
  if (n == null || n === false) return null;
  return n === true ? {} : { ...n };
}

/** homogStats() snapshot of a library (numeric counters and the fallback key list), null when absent. */
export function homogSnapshot(lib) {
  let h = null;
  // family: true counts the whole attachment family (study-level, override-derived and sensitivity libraries; L11)
  try { h = typeof lib?.homogStats === 'function' ? lib.homogStats({ family: true }) : null; } catch { h = null; }
  if (!h) return null;
  const out = { keys: [...(h.rom_fallback_keys ?? [])] };
  for (const [k, v] of Object.entries(h)) if (typeof v === 'number') out[k] = v;
  return out;
}

/**
 * Homogenization record of one run segment (audit A3 S1 / M1): counter deltas between two homogStats snapshots
 * (table exact / interpolated hits, fingerprint and other misses, live RVE solves, cache, RVE -> ROM fallbacks) and the
 * fallback keys (from the counters and from resolve provenance rve_error). Label: rve | rve (with rom fallback for N
 * keys) | rom.
 */
export function homogRecord(mode, before, after, provFallbacks = []) {
  const delta = {};
  if (before && after) for (const [k, v] of Object.entries(after)) if (typeof v === 'number') { const d = v - (before[k] ?? 0); if (d) delta[k] = d; }
  const keysNew = after ? after.keys.filter((k) => !(before?.keys ?? []).includes(k)) : [];
  const fallbacks = [...new Set([...keysNew, ...provFallbacks])];
  const m = mode ?? null;
  return { mode: m, label: m === 'rve' && fallbacks.length ? `rve (with rom fallback for ${fallbacks.length} keys)` : m, stats: after ? delta : null, rom_fallbacks: fallbacks };
}

function homogLine(h) {
  if (!h) return null;
  const s = h.stats ?? {};
  const f = (k) => s[k] ?? 0;
  return `  homogenization ${h.label ?? '-'}: table exact ${f('table_exact')}, interpolated ${f('table_interpolated')}, misses fingerprint ${f('table_miss_fingerprint')} / unverified ${f('table_miss_unverified')} / absent ${f('table_miss_absent')}, live RVE ${f('live_full') + f('live_k')}, cache ${f('cache')}, ROM fallbacks ${h.rom_fallbacks.length}${h.rom_fallbacks.length ? ` (${h.rom_fallbacks.join(', ')})` : ''}${h.stats == null ? ' (no homogStats on this library)' : ''}`;
}

function checkAllow(a, where) {
  if (a == null || a === true || a === false) return;
  if (!Array.isArray(a) || !a.every((k) => typeof k === 'string')) throw new CaseError(`${where}: must be true, false or a list of material keys`);
}

function checkOverrides(o, where) {
  if (o == null) return;
  if (typeof o !== 'object' || Array.isArray(o)) throw new CaseError(`${where}: must be a mapping {material key: {field: value}}`);
  for (const [k, f] of Object.entries(o)) if (f != null && (typeof f !== 'object' || Array.isArray(f))) throw new CaseError(`${where}.${k}: must be a mapping of fields`);
}

/**
 * runMechCase `thin` option from the case key `mesh.thin` (true -> {} = L8 default max_aspect 500; {max_aspect});
 * null when absent or false. Mechanics grids only (thermal grids are not merged).
 */
export function thinOf(c) {
  const t = unwrapValues(c.mesh?.thin);
  if (t == null || t === false) return null;
  if (t === true) return {};
  if (typeof t === 'object' && !Array.isArray(t)) {
    keys(t, ['max_aspect'], 'mesh.thin');
    if (t.max_aspect != null && !(Number.isFinite(t.max_aspect) && t.max_aspect > 0)) throw new CaseError('mesh.thin.max_aspect: positive number required');
    return { ...t };
  }
  throw new CaseError('mesh.thin: true, false or {max_aspect}');
}

/** Effective allow_extrapolation of a study (study level over case level; false switches it off). */
export function allowOf(c, s0) {
  const a = s0?.materials?.allow_extrapolation ?? c.materials?.allow_extrapolation ?? null;
  return a === false ? null : a;
}

/**
 * Material overrides of one study: `studies[].materials.overrides` merged over the case `materials.overrides` per
 * material and field (study wins). Names are compared by library key when lib.canonicalKey is given, so a template key
 * at case level and its library key at study level are one entry (the case-level name is kept).
 */
export function studyOverrides(c, s0, lib = null) {
  const base = c.materials?.overrides ?? {};
  const st = s0?.materials?.overrides ?? null;
  if (!st || !Object.keys(st).length) return base;
  const canon = (k) => {
    try {
      const r = typeof lib?.canonicalKey === 'function' ? lib.canonicalKey(k) : k;
      return typeof r === 'string' ? r : r?.key ?? k;
    } catch {
      return k;
    }
  };
  const out = {};
  const nameOf = new Map();
  for (const [k, f] of Object.entries(base)) { out[k] = { ...(f ?? {}) }; nameOf.set(canon(k), k); }
  for (const [k, f] of Object.entries(st)) {
    const n = nameOf.get(canon(k)) ?? k;
    out[n] = { ...(out[n] ?? {}), ...(f ?? {}) };
    nameOf.set(canon(k), n);
  }
  return out;
}

/**
 * Mechanics PCG tolerances (L9 W2.2): package cases 1e-7 (warpage identical to 0.01 um from relres 1.5e-6 on cowos_s;
 * 1e-10 spent 80-95 % of the wall time), gates (any tier A / B target of the study) 1e-10; a result that stopped
 * above its rtol is accepted with a warning while relres < accept, else it is a study error.
 */
export const MECH_RTOL = Object.freeze({ package: 1e-7, gate: 1e-10, accept: 1e-6 });

/** rtol / maxIter of a mechanics study: run option, else physics.mechanics.rtol / max_iter, else by target tier. */
export function mechSolveOf(c, s, override = null) {
  const m = unwrapValues(c.physics?.mechanics ?? {});
  const maxIter = m.max_iter ?? null;
  if (override != null) return { rtol: override, maxIter, source: 'run option' };
  if (m.rtol != null) return { rtol: m.rtol, maxIter, source: 'physics.mechanics.rtol' };
  const gate = (c.targets ?? []).some((t) => (t.study ?? s.id) === s.id && ['A', 'B'].includes(String(t.tier ?? '').toUpperCase()));
  return gate ? { rtol: MECH_RTOL.gate, maxIter, source: 'tier A/B target in the study (gate)' } : { rtol: MECH_RTOL.package, maxIter, source: 'package default' };
}

/**
 * Convergence record of one mechanics result (iterative solvers; null for direct): relres, iterations, requested rtol,
 * accepted (converged, or relres < MECH_RTOL.accept). The solver's own "not converged" warning is replaced by an
 * explicit one when the result is accepted.
 */
export function mechConvergence(r, solve) {
  const si = r?.timing?.solver;
  if (!si || si.relres == null) return null;
  const conv = { solver: si.solver ?? null, relres: si.relres, iterations: si.iterations ?? r.timing.iterations ?? null, rtol_requested: solve?.rtol ?? null, rtol_source: solve?.source ?? null, converged: !!si.converged };
  conv.accepted = conv.converged || si.relres < MECH_RTOL.accept;
  if (!conv.converged && conv.accepted) {
    r.warnings = (r.warnings ?? []).filter((w) => !/not converged: relres/.test(w));
    r.warnings.push(`mech: stopped at relres ${si.relres.toExponential(2)} after ${conv.iterations} iterations (above the solver rtol); accepted: relres < ${MECH_RTOL.accept.toExponential(0)} (warpage converged to 0.01 um from 1.5e-6 on cowos_s, L9 W2.2)`);
  }
  r.convergence = conv;
  return conv;
}

/**
 * Warning for a single-step thermo_elastic study whose stress_free_C.per_part differs from the default (L9 W2.1): a
 * per-part stress-free temperature is a temperature-independent eigenstrain; attach steps belong in a
 * process_sequence study. Effective values as runMechCase merges them (study number = default only).
 */
export function perPartTsfWarning(c, s0) {
  const sf0 = unwrapValues(c.physics?.mechanics?.stress_free_C ?? {});
  const ss = unwrapValues(s0.stress_free_C ?? null);
  const sf = ss == null ? sf0 : typeof ss === 'number' ? { ...sf0, default: ss } : { ...sf0, ...ss, per_part: { ...(sf0.per_part ?? {}), ...(ss.per_part ?? {}) } };
  const diff = Object.entries(sf.per_part ?? {}).filter(([, v]) => Number.isFinite(v) && v !== sf.default);
  if (!diff.length) return null;
  return `study ${s0.id}: stress_free_C.per_part ${diff.map(([k, v]) => `${k} = ${v} C`).join(', ')} differs from the default ${sf.default} C in a single-step thermo_elastic study: a per-part stress-free temperature is a constant eigenstrain at every T (L9 W2.1); model attach steps as a process_sequence study unless the part is genuinely pre-stressed`;
}

/** Sensitivity-bound overrides of a run (case level and the selected studies). */
function sensitivityOfRun(c, study) {
  return [...new Set([c.materials?.overrides, ...(c.studies ?? []).filter((x) => !study || x.id === study).map((x) => x.materials?.overrides)].flatMap((o) => sensitivityBound(o)))];
}

/** Case and study override names together (unused-override check). */
function allOverrides(c) {
  const o = { ...(c.materials?.overrides ?? {}) };
  for (const s of c.studies ?? []) for (const k of Object.keys(s.materials?.overrides ?? {})) o[k] ??= {};
  return o;
}

/** `key.field` of every override leaf with status `sensitivity` (L2: bound run of a template value). */
export function sensitivityBound(overrides) {
  const out = [];
  for (const [k, f] of Object.entries(overrides ?? {}))
    for (const [field, leaf] of Object.entries(f ?? {})) if (leaf && typeof leaf === 'object' && !Array.isArray(leaf) && leaf.status === 'sensitivity') out.push(`${k}.${field} = ${JSON.stringify(leaf.value)}`);
  return out;
}

/** Validate the case structure (SPEC section 1 + L1 additions); unknown keys are errors. Returns the case object. */
export function parseCase(c) {
  keys(c, CASE_KEYS, 'case');
  if (c.schema !== 'ap-sim/0') throw new CaseError(`case: schema must be ap-sim/0 (got ${c.schema})`);
  for (const k of ['id', 'family']) if (typeof c[k] !== 'string' || !c[k]) throw new CaseError(`case: ${k} (string) is required`);
  if (c.status != null && !STATUS.includes(c.status)) throw new CaseError(`case: status ${c.status} not in ${STATUS.join(' | ')}`);
  for (const [s, allowed] of Object.entries(SECTION_KEYS)) keys(c[s], allowed, s);
  if (!Array.isArray(c.studies) || !c.studies.length) throw new CaseError('case: studies (non-empty list) is required');
  if (c.physics?.mechanics && typeof c.physics.mechanics === 'object' && Object.hasOwn(c.physics.mechanics, 'viscoelastic')) throw new CaseError(`physics.mechanics.viscoelastic: ${VISCO_ERROR}`);
  c.studies.forEach((s, q) => {
    if (!s || typeof s.id !== 'string') throw new CaseError(`studies[${q}]: id is required`);
    if (/visco/i.test(String(s.type ?? '')) || (s && typeof s === 'object' && Object.hasOwn(s, 'viscoelastic'))) throw new CaseError(`studies[${q}] (${s.id}): ${VISCO_ERROR}`);
    if (!STUDY_TYPES.includes(s.type)) throw new CaseError(`studies[${q}]: type ${s.type} not in ${STUDY_TYPES.join(' | ')}`);
    keys(s, [...STUDY_KEYS.common, ...STUDY_KEYS[s.type]], `studies[${q}]`);
    keys(s.geometry, ['drop_kinds'], `studies[${q}].geometry`);
    keys(s.thermal, ['bcs', 'bcs_patch', 'sources', 'source_patch'], `studies[${q}].thermal`);
    keys(s.materials, ['allow_extrapolation', 'overrides'], `studies[${q}].materials`);
    checkAllow(s.materials?.allow_extrapolation, `studies[${q}].materials.allow_extrapolation`);
    checkOverrides(s.materials?.overrides, `studies[${q}].materials.overrides`);
    if (s.type === 'thermo_elastic') checkNonlinear(s.nonlinear, `studies[${q}].nonlinear`);
    if (s.type === 'thermo_elastic_sweep') {
      const pc = unwrapValues(s.temperature?.path_C);
      keys(s.temperature, ['path_C'], `studies[${q}].temperature`);
      if (!Array.isArray(pc) || !pc.length || !pc.every(Number.isFinite)) throw new CaseError(`studies[${q}].temperature.path_C: non-empty list of temperatures (C) required`);
    }
  });
  checkNonlinear(unwrapValues(c.physics?.mechanics?.nonlinear), 'physics.mechanics.nonlinear');
  const cs = c.materials?.cure_shrinkage;
  if (cs != null && !CURE_SHRINKAGE_MODES.includes(cs)) throw new CaseError(`materials.cure_shrinkage: ${cs} not in ${CURE_SHRINKAGE_MODES.join(' | ')}`);
  checkAllow(c.materials?.allow_extrapolation, 'materials.allow_extrapolation');
  const pm = unwrapValues(c.physics?.mechanics ?? {});
  if (pm.rtol != null && !(Number.isFinite(pm.rtol) && pm.rtol > 0 && pm.rtol <= 1e-2)) throw new CaseError('physics.mechanics.rtol: number in (0, 1e-2] required');
  if (pm.max_iter != null && !(Number.isInteger(pm.max_iter) && pm.max_iter > 0)) throw new CaseError('physics.mechanics.max_iter: positive integer required');
  checkOverrides(c.materials?.overrides, 'materials.overrides');
  thinOf(c);
  if (new Set(c.studies.map((s) => s.id)).size !== c.studies.length) throw new CaseError('case: duplicate study id');
  (c.targets ?? []).forEach((t, q) => {
    keys(t, TARGET_KEYS, `targets[${q}]`);
    keys(t.tolerance, ['rel', 'abs', 'abs_C', 'sign_only', 'rel_rise', 'reference_C'], `targets[${q}].tolerance`);
    if (t.study && !c.studies.some((s) => s.id === t.study)) throw new CaseError(`targets[${q}]: study ${t.study} not in the case`);
    if (t.reference_study && !c.studies.some((s) => s.id === t.reference_study)) throw new CaseError(`targets[${q}]: reference_study ${t.reference_study} not in the case`);
  });
  return c;
}

/** Material key of a part: materials.map by part id, then kind, then template material key; else the part material. */
export function materialMapper(map = {}) {
  return (p) => (Object.hasOwn(map, p.id) ? map[p.id] : Object.hasOwn(map, p.kind) ? map[p.kind] : Object.hasOwn(map, p.material) ? map[p.material] : p.material);
}

/**
 * Resolver with case overrides of k_W_mK (number, [kx, ky, kz], 3 x 3 tensor, {value} or {expr} in T_C / T_K), used
 * when the library has no applyOverrides; the other properties come from the library (or are absent for keys the
 * library does not know).
 */
export function overrideResolver(resolve, overrides = {}) {
  const compiled = {};
  for (const [key, o] of Object.entries(overrides ?? {})) {
    if (o?.k_W_mK == null) continue;
    const kk = o.k_W_mK;
    if (kk && typeof kk === 'object' && !Array.isArray(kk) && kk.expr != null) {
      const ast = parseExpression(String(kk.expr));
      compiled[key] = (T_K) => evaluateAst(ast, { T_K, T_C: T_K - C_TO_K }, String(kk.expr));
    } else {
      const v = unwrapValues(kk);
      compiled[key] = () => v;
    }
  }
  return (key, T_K, opts = {}) => {
    if (!compiled[key]) return resolve(key, T_K, opts);
    let base = {};
    const need = (opts.need ?? []).filter((n) => n !== 'k');
    try {
      base = resolve(key, T_K, { ...opts, need });
    } catch (e) {
      if (need.length) throw e;
    }
    return { ...base, k_W_mK: compiled[key](T_K), provenance: { ...(base.provenance ?? {}), k_W_mK: { override: true, case: overrides[key] } } };
  };
}

/**
 * physics.thermal of one study (L3 request, wave 3): the case block with the study's patches applied:
 * `thermal.bcs` / `thermal.sources` / `thermal.source_patch` replace, `thermal.bcs_patch` merges fields into the BC
 * with the same selection (appended when new), `contact_resistance: {<interface selection>: R_m2K_W}` sets or adds
 * contact BCs. Values may be {value, status, ref} objects.
 */
export function studyThermal(base, s) {
  const th = { ...(base ?? {}) };
  const p = unwrapValues(s.thermal ?? {});
  for (const k of ['bcs', 'sources', 'source_patch']) if (p[k] != null) th[k] = p[k];
  let bcs = [...(th.bcs ?? [])].map((b) => ({ ...b }));
  for (const bp of p.bcs_patch ?? []) {
    const i = bcs.findIndex((b) => b.selection === bp.selection);
    if (i >= 0) bcs[i] = { ...bcs[i], ...bp };
    else bcs.push({ ...bp });
  }
  for (const [sel, R] of Object.entries(unwrapValues(s.contact_resistance ?? {}))) {
    const i = bcs.findIndex((b) => b.selection === sel && b.type === 'contact_resistance');
    if (i >= 0) bcs[i] = { ...bcs[i], R_m2K_W: R };
    else bcs.unshift({ selection: sel, type: 'contact_resistance', R_m2K_W: R });
  }
  th.bcs = bcs;
  return th;
}

/**
 * L2 CD6: `materials.allow_extrapolation` (true | [library keys]) at case or study level (study wins) passed to every
 * resolve call; the keys whose returned provenance carries `extrapolated` flags are collected for warnings.
 */
export function extrapolatingResolver(resolve, allow) {
  const flagged = new Map();
  const fallbacks = new Set();
  const r = (key, T_K, opts = {}) => {
    const out = resolve(key, T_K, allow == null || allow === false ? opts : { ...opts, allowExtrapolation: allow });
    if (out?.provenance?.rve_error) fallbacks.add(key);
    const ex = out?.provenance?.extrapolated;
    if (ex && (!Array.isArray(ex) || ex.length)) {
      const list = Array.isArray(ex) ? ex : [ex];
      const prev = flagged.get(key) ?? [];
      for (const e of list) if (!prev.some((p) => JSON.stringify(p.range_C) === JSON.stringify(e.range_C) && p.property === e.property)) prev.push(e);
      flagged.set(key, prev);
    }
    return out;
  };
  r.fallbacks = () => [...fallbacks];
  r.warnings = () => [...flagged].map(([k, list]) => `materials: ${k} used outside its valid range (allow_extrapolation): ${list.map((e) => `${e.property ?? '-'} ${e.range_C ? `[${e.range_C.join(', ')}] C` : ''} (${e.rule ?? 'extrapolated'})`).join('; ')}`);
  return r;
}

/**
 * Override keys used by no part of the given grids (L9 request): canonical library key of each override name vs the
 * keys the grids resolve (homog: keys contribute their constituents). Uses L2's unusedOverrideKeys when provided.
 */
export function unusedOverrides(overrides, grids, lib, unusedOverrideKeys = null) {
  const names = Object.keys(overrides ?? {});
  if (!names.length || !lib) return [];
  const canon = (k) => {
    try {
      if (typeof lib.canonicalKey === 'function') { const r = lib.canonicalKey(k); return typeof r === 'string' ? r : r?.key ?? k; }
      if (typeof lib.aliasTemplateKey === 'function') { const r = lib.aliasTemplateKey(k); return typeof r === 'string' ? r : r?.key ?? k; }
    } catch { /* unknown key: compared as given */ }
    return k;
  };
  const used = new Set();
  for (const g of grids)
    for (const key of g.materials ?? []) {
      if (key.startsWith('homog:')) for (const m of (key.split(':')[2] ?? '').split('+')) { used.add(m); used.add(canon(m)); }
      else { used.add(key); used.add(canon(key)); }
    }
  if (typeof unusedOverrideKeys === 'function') return unusedOverrideKeys(lib, overrides, [...used]);
  return names.filter((k) => !used.has(k) && !used.has(canon(k)));
}

/** Parts matched by a target selection (`part:<glob>`, a bare glob, or top:/bottom:/side:<glob>). */
function partsOf(sel, res) {
  const g = String(sel ?? '*').replace(/^(part|top|bottom|side|xmin|xmax|ymin|ymax):/, '');
  const re = new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  return Object.entries(res.derived.parts ?? {}).filter(([id]) => re.test(id));
}

/** Thermal quantity of a target for one study result (undefined when it is not a thermal quantity or has no parts). */
export function evalTarget(t, res, caseThermal = null) {
  const d = res.derived;
  if (['heat_in_W', 'heat_out_W', 'balance_rel'].includes(t.quantity)) return d[t.quantity];
  const ps = partsOf(t.selection, res);
  if (!ps.length) return undefined;
  if (t.quantity === 'Tmax_C') return Math.max(...ps.map(([, s]) => s.Tmax_C));
  if (t.quantity === 'Tmin_C') return Math.min(...ps.map(([, s]) => s.Tmin_C));
  if (t.quantity === 'Tavg_C') {
    const V = ps.reduce((a, [, s]) => a + s.volume_m3, 0);
    return ps.reduce((a, [, s]) => a + s.Tavg_C * s.volume_m3, 0) / V;
  }
  if (t.quantity === 'Rjc_C_W' || t.quantity === 'theta_jc_C_W') {
    // tj_max_minus_tc_over_p (Rjc_C_W, theta_jc_C_W): (max T over the selection - Tc) / P; Tc = target tc_C, else the
    // case's first fixed-T BC
    let Tc = t.tc_C;
    if (Tc == null) {
      const b = (caseThermal?.bcs ?? []).find((x) => x.type === 'temperature' && (x.T_C != null || x.T_K != null));
      if (b) Tc = b.T_C ?? b.T_K - C_TO_K;
    }
    if (Tc == null || !(d.heat_in_W > 0)) return undefined;
    return (Math.max(...ps.map(([, s]) => s.Tmax_C)) - Tc) / d.heat_in_W;
  }
  return undefined;
}

/**
 * Unit of a target quantity from its name suffix (first match wins): lengths, stresses, power, thermal resistance
 * (`_C_W` / `_K_W`: a temperature difference per W, C/W = K/W) and absolute temperature (`_C`, offset from K).
 */
const QTY_UNIT = [[/_C_W$/, 'K/W', 'diff'], [/_K_W$/, 'K/W', 'diff'], [/_nm$/, 'nm'], [/_um$/, 'um'], [/_mm$/, 'mm'], [/_GPa$/, 'GPa'], [/_MPa$/, 'MPa'], [/_Pa$/, 'Pa'], [/_W$/, 'W'], [/_C$/, 'C', 'abs']];
/** Celsius spellings; inside a difference unit (C/W) a Celsius degree equals a kelvin. */
const CELSIUS_RE = /(°C|degC|\bC\b)/g;
const CELSIUS = new Set(['C', '°C', 'degC']);

/**
 * Expected value converted from a source unit (DB row or case `unit`) to the quantity's unit (e.g. warpage 0.7 mm ->
 * 700 um; 0.115 GPa -> 115 MPa; 8 mK/W -> 0.008 C/W; 300 K -> 26.85 C for an absolute `_C` quantity). Unchanged when
 * the quantity has no unit suffix (e.g. stress_norm) or the source has no unit. A unit of another dimension (or one the
 * parser does not know) is a mismatch: the value must not be compared.
 * @returns {{value: number, converted: string | null, mismatch: string | null}}
 */
export function expectedInQuantityUnit(quantity, value, unit) {
  const hit = QTY_UNIT.find(([re]) => re.test(quantity ?? ''));
  const u = typeof unit === 'string' ? unit.trim() : unit;
  if (!hit || u == null || u === '') return { value, converted: null, mismatch: null };
  const [, qu, kind] = hit;
  const mismatch = { value, converted: null, mismatch: `${u} vs ${qu === 'K/W' ? 'C/W' : qu} (${quantity})` };
  if (kind === 'abs') {
    if (CELSIUS.has(u)) return { value, converted: null, mismatch: null };
    if (u === 'K') return { value: value - C_TO_K, converted: `${value} K -> C`, mismatch: null };
    return mismatch;
  }
  if (u === qu) return { value, converted: null, mismatch: null };
  try {
    const a = parseUnit(kind === 'diff' ? u.replace(CELSIUS_RE, 'K') : u), b = parseUnit(qu);
    if (!dimEq(a.dim, b.dim)) return mismatch;
    const f = a.factor / b.factor;
    if (Math.abs(f - 1) < 1e-12) return { value, converted: null, mismatch: null };
    return { value: Number((value * f).toPrecision(12)), converted: `${value} ${u} -> ${qu === 'K/W' ? 'C/W' : qu}`, mismatch: null };
  } catch {
    return mismatch;
  }
}

/**
 * Expected value of a target, the one rule for every path (runCase, runCaseAll; the UI and the runners may call it on
 * runMechCase targets): the case `value` (converted from the target's `unit` when given), else the DB row from
 * metricLookup (metric_id -> {value, unit, table?}) converted to the quantity unit. Fields: expected, expected_source,
 * expected_unit, expected_conversion, expected_unit_mismatch (expected null: never compared), reason.
 */
export function expectedFor(t, metricLookup = null) {
  const out = { expected: null, expected_source: null };
  let raw = null, unit = null;
  if (t.value != null) {
    raw = unwrapValues(t.value);
    unit = t.unit ?? null;
    out.expected_source = 'case';
  } else if (t.metric_id && metricLookup) {
    const m = metricLookup(t.metric_id);
    if (m && Number.isFinite(m.value)) {
      raw = m.value;
      unit = m.unit ?? null;
      out.expected_source = `db:${m.table ?? 'metrics'}`;
    }
  }
  if (raw == null || !Number.isFinite(Number(raw))) {
    if (raw != null) out.reason = `expected value ${JSON.stringify(raw)} is not a number`;
    return out;
  }
  const cv = expectedInQuantityUnit(t.quantity, Number(raw), unit);
  if (unit != null) out.expected_unit = unit;
  if (cv.mismatch) {
    out.expected_unit_mismatch = cv.mismatch;
    out.reason = `unit mismatch: ${cv.mismatch}; not compared`;
    return out;
  }
  out.expected = cv.value;
  if (cv.converted) out.expected_conversion = cv.converted;
  return out;
}

/** Pass / miss of a computed value against the expected one (tolerance forms rel, abs / abs_C, sign_only). */
export function checkTolerance(got, expected, tol = {}) {
  if (tol.sign_only) return Math.sign(got) === Math.sign(expected);
  const lim = Math.max(tol.abs ?? 0, tol.abs_C ?? 0, (tol.rel ?? 0) * Math.abs(expected));
  if (!(lim > 0)) return null;
  return Math.abs(got - expected) <= lim;
}

/**
 * Run a parsed case. Dependencies are injected (tests, UI worker); the CLI passes the real generator and library.
 * @param {object} c case (parseCase)
 * @param {{generate: Function, resolve: Function, materialOf?: Function, data?: object, study?: string,
 *   solver?: string, onProgress?: (stage: string, message: string) => void, metricLookup?: (id: string) => object,
 *   overridesApplied?: boolean}} deps  overridesApplied: the resolver already includes materials.overrides
 */
export function runCase(c, deps) {
  const { generate, resolve: resolve0, data, study = null, solver = null, onProgress = null, materialOf = null, metricLookup = null, overridesApplied = false, accel = 'js' } = deps;
  const progress = (stage, message) => onProgress?.(stage, message);
  progress('parse', 'Validating the case');
  parseCase(c);
  const t0 = performance.now();
  // case overrides: applied by the injected library (libraryAdapter + L2 applyOverrides) or here (k only)
  const resolve = overridesApplied ? resolve0 : overrideResolver(resolve0, c.materials?.overrides);
  const geo = c.geometry ?? {};
  if (geo.resolve?.length) throw new CaseError('geometry.resolve: discrete arrays are not supported by the E1 grid (homogenized only)');
  const mesh = unwrapValues(c.mesh ?? {});
  const physics = unwrapValues(c.physics ?? {});
  const thermal = physics.thermal ?? null;
  const mapOf = materialOf ?? materialMapper(c.materials?.map);
  // one generator call and grid per distinct (params, drop_kinds) combination
  const builds = new Map();
  const buildFor = (s, th) => {
    const params = { ...(c.params ?? {}), ...(s.params ?? {}) };
    const drop = s.geometry?.drop_kinds ?? geo.drop_kinds ?? [];
    const gridOpts = th ? thermalGridOptions(th) : { planes: {}, interfaces: [] };
    const key = JSON.stringify([params, drop, gridOpts]);
    if (builds.has(key)) return builds.get(key);
    progress('geometry', `Family ${c.family}${s.params ? ` (study ${s.id} params)` : ''}`);
    const gen = generate(c.family, params, data ? { data } : {});
    const boxes = gen.boxes ?? gen.parts;
    if (!Array.isArray(boxes) || !boxes.length) throw new CaseError(`family ${c.family}: generator returned no boxes`);
    const grid = buildGrid(boxes, { ...mesh, ...gridOpts, symmetry: geo.symmetry ?? 'none', drop_kinds: drop, materialOf: mapOf });
    progress('mesh', `Grid ${grid.nx} x ${grid.ny} x ${grid.nz} cells, ${grid.stats.nodes} nodes`);
    const b = { gen, grid };
    builds.set(key, b);
    return b;
  };
  // study-level materials.overrides (merged over the case level, L2 applyOverrides): the injected resolver holds the
  // case overrides only, so a study with its own overrides gets a resolver rebuilt from the raw library
  const studyResolve = (s0) => {
    const st = s0.materials?.overrides;
    if (!st || !Object.keys(st).length) return { resolve, warnings: [] };
    const merged = studyOverrides(c, s0, deps.lib ?? null);
    const w = [`study ${s0.id}: materials.overrides ${Object.entries(st).map(([k, f]) => Object.keys(f ?? {}).map((x) => `${k}.${x}`).join(', ')).join(', ')} merged over the case level`];
    if (!overridesApplied) return { resolve: overrideResolver(resolve0, merged), warnings: w };
    if (!deps.lib || !deps.applyOverrides) throw new CaseError(`study ${s0.id}: materials.overrides need deps.lib and deps.applyOverrides (the injected resolver already holds the case overrides)`);
    const ad = libraryAdapter(deps.lib, c.materials?.map ?? {}, { overrides: merged, applyOverrides: deps.applyOverrides });
    return { resolve: ad.resolve, warnings: w };
  };
  const results = [];
  const skipped = [];
  let first = null;
  const sensBound = sensitivityOfRun(c, study);
  for (const s0 of c.studies) {
    if (study && s0.id !== study) continue;
    const s = unwrapValues({ ...s0, params: undefined });
    s.params = s0.params;
    if (MECH_STUDY_TYPES.includes(s.type)) {
      skipped.push({ study: s.id, type: s.type, reason: `${s.type} studies run in lane L8 (src/mech/, runCaseAll); passed through`, study_config: s });
      continue;
    }
    if (!thermal) throw new CaseError(`study ${s.id}: physics.thermal is required`);
    const th = studyThermal(thermal, s0);
    const { gen, grid } = buildFor(s, th);
    first ??= { gen, grid };
    const sres = studyResolve(s0);
    const ex = extrapolatingResolver(sres.resolve, allowOf(c, s0));
    // homogenization record (audit A3 S1 / M1): the library behind the resolver (libraryAdapter attaches it)
    const hlib = sres.resolve.homogLib ?? resolve0.homogLib ?? deps.lib ?? null;
    const hasHomog = (grid.materials ?? []).some((k) => typeof k === 'string' && k.startsWith('homog:'));
    const hb = hasHomog ? homogSnapshot(hlib) : null;
    let res;
    if (s.type === 'thermal_stationary') {
      progress('solve', `Study ${s.id}: steady heat conduction`);
      res = solveThermal(grid, th, ex, { solver: solver ?? s.solver ?? th.solver ?? 'auto', study: s.id, accel });
    } else {
      progress('solve', `Study ${s.id}: transient heat conduction`);
      const { thermal: _t, contact_resistance: _c, materials: _m, ...sopts } = s;
      res = solveThermalTransient(grid, th, ex, { ...sopts, solver: solver ?? s.solver ?? th.solver ?? 'auto', study: s.id });
    }
    res.warnings.push(...sres.warnings, ...ex.warnings());
    if (hasHomog) {
      res.homogenization_record = homogRecord(hlib?.homogenizationDefault?.() ?? null, hb, homogSnapshot(hlib), ex.fallbacks());
      res.homogenization = res.homogenization_record.label;
      if (res.homogenization_record.rom_fallbacks.length) res.warnings.push(`homogenization: RVE failed and the rule of mixtures was used for ${res.homogenization_record.rom_fallbacks.join(', ')} (result labelled ${res.homogenization})`);
    }
    results.push(res);
  }
  if (study && !results.length && !skipped.length) throw new CaseError(`study ${study} not in the case`);
  progress('post', 'Targets');
  const targets = (c.targets ?? []).map((t) => {
    const ex = expectedFor(t, metricLookup);
    const out = { ...t, got: null, ...ex, status: 'unchecked' };
    if (sensBound.length) out.sensitivity_bound = true;
    if (MECH_QUANTITIES.includes(t.quantity)) {
      out.reason = 'mechanics quantity (lane L8, E2)';
      return out;
    }
    const r = results.find((x) => (t.study ? x.study === t.study : true));
    if (!r) {
      out.reason = t.study ? `study ${t.study} not run` : 'no thermal result';
      return out;
    }
    const thR = studyThermal(thermal, c.studies.find((x) => x.id === r.study) ?? {});
    let got = evalTarget(t, r, thR);
    if (got !== undefined && t.definition === 'ratio_to_reference') {
      const rr = results.find((x) => x.study === t.reference_study);
      const ref = rr ? evalTarget(t, rr, studyThermal(thermal, c.studies.find((x) => x.id === rr.study) ?? {})) : undefined;
      got = ref ? got / ref : undefined;
    }
    if (got === undefined) {
      out.reason = `quantity ${t.quantity} not evaluated for selection ${t.selection ?? '*'}`;
      return out;
    }
    out.got = got;
    if (out.expected == null) {
      out.reason = ex.reason ?? 'no expected value (case value or metric lookup)';
      return out;
    }
    const pass = checkTolerance(got, out.expected, t.tolerance ?? {});
    out.status = pass == null ? 'unchecked' : pass ? 'pass' : 'miss';
    if (pass == null) out.reason = 'no tolerance';
    out.rel_err = out.expected !== 0 ? got / out.expected - 1 : null;
    return out;
  });
  const g0 = first?.grid ?? null;
  const unused = unusedOverrides(allOverrides(c), [...builds.values()].map((b) => b.grid), deps.lib ?? null, deps.unusedOverrideKeys ?? null);
  return {
    case: c.id, family: c.family, generator: first?.gen.generator ?? null,
    gridStats: g0?.stats ?? null, gridWarnings: [...(g0?.warnings ?? []), ...(unused.length ? [`materials.overrides used by no part: ${unused.join(', ')}`] : [])], genWarnings: first?.gen.warnings ?? [],
    builds: builds.size, results, skipped, targets, ...(sensBound.length ? { sensitivity_bound: sensBound } : {}), total_ms: performance.now() - t0,
  };
}

/** Header line of a run with status-sensitivity overrides (a bound run, not the nominal result). */
function sensitivityLine(list) {
  return `sensitivity-bound run (overrides with status sensitivity, not the nominal result): ${list.join('; ')}`;
}

/** Expected-value part of a target line: value, DB marker and the unit conversion applied. */
function expectedText(t) {
  if (t.expected == null) return '';
  return ` expected ${String(Number(Number(t.expected).toPrecision(6)))}${String(t.expected_source ?? '').startsWith('db:') ? ' (DB)' : ''}${t.expected_conversion ? ` [${t.expected_conversion}]` : ''}`;
}

/** Summary text of a runCase result. */
export function summarize(out) {
  const L = [];
  const g = out.gridStats;
  L.push(`case ${out.case} (family ${out.family})`);
  if (out.sensitivity_bound?.length) L.push(sensitivityLine(out.sensitivity_bound));
  if (g) L.push(`grid ${g.nx} x ${g.ny} x ${g.nz} cells, ${g.nodes} nodes (${g.activeNodes} active), max aspect ${g.maxAspect.toFixed(1)}, ${g.grid_ms.toFixed(0)} ms`);
  for (const w of out.gridWarnings) L.push(`  warning: ${w}`);
  for (const r of out.results) {
    const d = r.derived, t = r.timing;
    L.push(`study ${r.study} ${r.type}: solver ${t.solver}, ${t.iterations} iterations, setup ${t.setup_ms.toFixed(0)} ms, solve ${t.solve_ms.toFixed(0)} ms`);
    if (r.type === 'thermal_stationary')
      L.push(`  Tmax ${d.Tmax_C.value.toFixed(3)} C in ${d.Tmax_C.part}; heat in ${d.heat_in_W.toPrecision(6)} W, out ${d.heat_out_W.toPrecision(6)} W, balance ${d.balance_rel.toExponential(2)}`);
    else L.push(`  t_end ${d.t_end_s} s (${d.steps} steps, ${d.scheme}); Tmax ${d.Tmax_C.value.toFixed(3)} C in ${d.Tmax_C.part}; energy balance ${d.energy.balance_rel.toExponential(2)}`);
    for (const w of r.warnings ?? []) if (!out.gridWarnings.includes(w)) L.push(`  warning: ${w}`);
    const hl = homogLine(r.homogenization_record);
    if (hl) L.push(hl);
    const top = Object.entries(d.parts).sort((a, b) => b[1].Tmax_C - a[1].Tmax_C).slice(0, 8);
    for (const [id, s] of top) L.push(`  ${id.padEnd(24)} Tmax ${s.Tmax_C.toFixed(3)}  Tavg ${s.Tavg_C.toFixed(3)}  Tmin ${s.Tmin_C.toFixed(3)} C`);
  }
  for (const s of out.skipped) L.push(`study ${s.study} ${s.type}: skipped (${s.reason})`);
  for (const t of out.targets)
    L.push(`target ${t.metric_id ?? '-'} ${t.quantity}${t.study ? ` [${t.study}]` : ''}: ${t.status}${t.got != null ? ` got ${Number(t.got).toPrecision(5)}` : ''}${expectedText(t)}${t.rel_err != null ? ` (${(100 * t.rel_err).toFixed(1)} %)` : ''}${t.sensitivity_bound ? ' [sensitivity bound]' : ''}${t.reason ? ` - ${t.reason}` : ''}`);
  L.push(`total ${out.total_ms.toFixed(0)} ms`);
  return L.join('\n');
}

/** JSON-safe copy of a runCase result (field arrays and grid objects dropped). */
export function toJson(out) {
  return {
    ...out,
    results: out.results.map(({ grid, fields, outputs, ...r }) => ({ ...r, fields: Object.keys(fields), ...(outputs ? { outputs: outputs.map((o) => ({ t_s: o.t_s })) } : {}) })),
  };
}

/**
 * Adapter for an L2 library object (createLibrary / loadLibrary): materialOf applies the case map (part id, kind,
 * template key); library keys and homog: keys go to lib.resolve unchanged (L2 aliases homogenized constituents);
 * other template keys map through lib.aliasTemplateKey. Case overrides go through applyOverrides (L2) when given
 * (missing override `status` filled as `user`: case-level values are user inputs, DevLog-010 A11), else through
 * overrideResolver (k only).
 */
export const THERMAL_OVERRIDE_FIELDS = Object.freeze(['k_W_mK', 'rho_kg_m3', 'cp_J_kgK']);

export function libraryAdapter(lib, map = {}, { overrides = null, applyOverrides = null, fields = THERMAL_OVERRIDE_FIELDS } = {}) {
  let L = lib;
  const notes = [];
  // thermal studies apply only the thermal fields; mechanics fields (E_GPa, nu, cte_ppmK) pass through to lane L8
  const ovIn = {};
  for (const [k, f] of Object.entries(overrides ?? {})) {
    const kept = {};
    for (const [field, leaf] of Object.entries(f ?? {})) {
      if (fields.includes(field)) kept[field] = leaf;
      else notes.push(`override ${k}.${field}: mechanics field, passed through (not used by thermal studies)`);
    }
    if (Object.keys(kept).length) ovIn[k] = kept;
  }
  // k given as an expression of T (case form {expr}): applyOverrides takes it (L11 wave 2, model expr_T, k > 0 checked
  // over the valid range, propagated to homog constituents in ROM and RVE); the k-only overrideResolver handles it when
  // no applyOverrides is given (literal keys only, audit A3 M2)
  if (applyOverrides) {
    // L2 leaves need {value, status, ref | note}: case values are user inputs (A11); provenance carried into the note
    const ov = {};
    for (const [k, f] of Object.entries(ovIn)) {
      if (!Object.keys(f).length) continue;
      ov[k] = {};
      for (const [field, leaf0] of Object.entries(f)) {
        const leaf = leaf0 && typeof leaf0 === 'object' && !Array.isArray(leaf0) ? { ...leaf0 } : { value: leaf0 };
        if (leaf.status == null) { leaf.status = 'user'; notes.push(`override ${k}.${field}: status user filled in`); }
        if (!leaf.ref && !leaf.note) leaf.note = [leaf.source, leaf.locator, leaf.basis].filter(Boolean).join(', ') || 'case override (no provenance given)';
        for (const extra of ['basis', 'source', 'locator']) delete leaf[extra];
        ov[k][field] = leaf;
      }
    }
    if (Object.keys(ov).length) L = applyOverrides(lib, ov);
  }
  const overrides2 = applyOverrides ? {} : ovIn;
  const keysSet = new Set(typeof L.keys === 'function' ? L.keys() : []);
  const base = materialMapper(map);
  const materialOf = (p) => {
    const k = base(p);
    if (k.startsWith('homog:') || keysSet.has(k) || typeof L.aliasTemplateKey !== 'function') return k;
    const a = L.aliasTemplateKey(k);
    return typeof a === 'string' ? a : a?.key ?? k;
  };
  let resolve = (key, T_K, opts) => L.resolve(key, T_K, opts);
  if (Object.keys(overrides2).length) resolve = overrideResolver(resolve, overrides2);
  resolve.homogLib = L; // homogStats / homogenizationDefault of the (override-derived) library, for run records
  return { resolve, materialOf, notes };
}

// ---- thermal + thermo-elastic runner (wave 3; mechanics by lane L8, src/mech) --------------------------------------

/**
 * Overrides (all fields; case level merged with the study level) applied to the L2 library, and its resolve and CTE
 * rebase wrapped with allow_extrapolation (CD6).
 */
function mechLibWithOptions(lib, overrides, applyOverrides, allow) {
  const notes = [];
  let L = lib;
  const ov = {};
  for (const [k, f] of Object.entries(overrides ?? {})) {
    ov[k] = {};
    for (const [field, leaf0] of Object.entries(f ?? {})) {
      const leaf = leaf0 && typeof leaf0 === 'object' && !Array.isArray(leaf0) ? { ...leaf0 } : { value: leaf0 };
      if (leaf.status == null) { leaf.status = 'user'; notes.push(`override ${k}.${field}: status user filled in`); }
      if (!leaf.ref && !leaf.note) leaf.note = [leaf.source, leaf.locator, leaf.basis].filter(Boolean).join(', ') || 'case override (no provenance given)';
      for (const extra of ['basis', 'source', 'locator']) delete leaf[extra];
      ov[k][field] = leaf;
    }
  }
  if (Object.keys(ov).length) {
    if (!applyOverrides) throw new CaseError('materials.overrides need the materials applyOverrides function');
    L = applyOverrides(lib, ov);
  }
  const ex = extrapolatingResolver((k, T, o) => L.resolve(k, T, o), allow);
  const W = Object.create(L);
  W.resolve = ex;
  // the CTE rebase evaluates the dataset at T as well: same option
  if (typeof L.rebaseSecantCte === 'function' && allow != null && allow !== false) W.rebaseSecantCte = (e, Tsf, T, o = {}) => L.rebaseSecantCte(e, Tsf, T, { ...o, allowExtrapolation: allow });
  W._ex = ex;
  return { lib: W, notes };
}

const globRe2 = (g) => new RegExp(`^${String(g).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

/** Mechanics quantity of one target on one mechanics result (undefined when not available). */
function mechValue(t, r) {
  if (t.quantity === 'warpage_um' || t.quantity === 'coplanarity_um') {
    const nm = t.selection;
    const w = (r.derived?.warpage ?? []).find((x) => x.surface === (r.surface_map?.[nm] ?? nm));
    if (!w) return undefined;
    return { v: t.quantity === 'warpage_um' ? w.warpage_um : w.coplanarity_um, info: { surface: w.surface, definition: w.definition, sign_convention: w.sign_convention, view_side: w.view_side } };
  }
  if (t.quantity === 'von_mises_max_MPa' || t.quantity === 'stress_norm') {
    // stress_norm at corner:<part>: the part's Gauss-point von Mises maximum (normally at its corner; flag reported)
    const re = globRe2(String(t.selection ?? '*').replace(/^(part|corner):/, ''));
    let best = null;
    for (const [id, v] of Object.entries(r.derived.von_mises_per_part ?? {})) if (re.test(id) && (!best || v.vm_max_gp_Pa > best.v.vm_max_gp_Pa)) best = { id, v };
    if (!best) return undefined;
    return { v: best.v.vm_max_gp_Pa / 1e6, info: { part: best.id, flag: best.v.vm_max_gp_flag, node_max_MPa: best.v.vm_max_node_Pa / 1e6, node_flag: best.v.vm_max_node_flag, stress_measure: t.quantity === 'stress_norm' ? 'part von Mises maximum (Gauss point)' : undefined } };
  }
  return undefined;
}

function pickMech(results, study, T_C) {
  // process_sequence results hold per-step values (stepTarget), not one temperature result
  return results.find((r) => r.type !== 'process_sequence' && (study == null || r.study === study) && (T_C == null || Math.abs(r.T_C - T_C) < 1e-9)) ?? null;
}

/**
 * A step target (`step`, or any target of a process_sequence study) on the per-step values of the sequence result
 * (steps[].warpage, as L8 solveProcessSequence stores them): {got, info} or {reason} when the study did not run, the
 * step is not in the sequence, or the surface was not evaluated at that step (part not active or no faces).
 */
export function stepTarget(t, results) {
  const r = results.find((x) => x.type === 'process_sequence' && (t.study == null || x.study === t.study));
  if (!r) return { reason: `process_sequence study ${t.study ?? '-'} not run` };
  if (t.step == null) return { reason: `target on process_sequence study ${r.study} needs a step (steps: ${(r.steps ?? []).map((x) => x.step).join(', ')})` };
  const st = (r.steps ?? []).find((x) => x.step === t.step);
  if (!st) return { reason: `step ${t.step} not in the sequence of study ${r.study} (steps: ${(r.steps ?? []).map((x) => x.step).join(', ')})` };
  if (t.quantity !== 'warpage_um' && t.quantity !== 'coplanarity_um') return { reason: `quantity ${t.quantity} not evaluated per step (warpage_um, coplanarity_um only)` };
  const w = (st.warpage ?? st.derived?.warpage ?? []).find((x) => x.surface === t.selection);
  if (!w) return { reason: `surface ${t.selection} not evaluated at step ${t.step} (part not active at that step, or no exposed faces)` };
  return { got: t.quantity === 'warpage_um' ? w.warpage_um : w.coplanarity_um, info: { surface: w.surface, definition: w.definition, sign_convention: w.sign_convention, view_side: w.view_side, step: t.step, T_C: st.T_end_C ?? null } };
}

/** Evaluate a mechanics target on the mechanics results (ratio_to_reference included). */
export function evalMechTarget(t, results) {
  const r = pickMech(results, t.study ?? null, t.T_C ?? null);
  if (!r) return { reason: t.study ? `study ${t.study}${t.T_C != null ? ` at ${t.T_C} C` : ''} not run` : 'no mechanics result' };
  const a = mechValue(t, r);
  if (!a) return { reason: `quantity ${t.quantity} not available for selection ${t.selection}` };
  if (t.definition === 'ratio_to_reference' || t.quantity === 'stress_norm') {
    if (!t.reference_study) return { reason: 'ratio_to_reference needs reference_study' };
    const rr = pickMech(results, t.reference_study, t.T_C ?? null);
    const b = rr ? mechValue(t, rr) : undefined;
    if (!b || !b.v) return { reason: `reference study ${t.reference_study} not run or zero` };
    return { got: a.v / b.v, info: { ...a.info, value: a.v, reference_value: b.v, reference_study: t.reference_study, reference_flag: b.info.flag ?? null } };
  }
  return { got: a.v, info: a.info };
}

/**
 * Run the thermal and thermo-elastic studies of a case. deps: runCase deps plus `mech` (the L8 module set
 * {runMechCase, solveMech, mechLibrary, modelSurface}), `lib` (L2 library object) and `applyOverrides`.
 * Uniform-temperature mechanics studies go through runMechCase; `temperature: {from: <thermal study>}` uses that
 * study's temperature field on its grid (solveMech).
 */
export function runCaseAll(c, deps) {
  parseCase(c);
  const t0 = performance.now();
  const { study = null, mech = null, onProgress = null } = deps;
  const studies = c.studies.filter((s) => !study || s.id === study);
  const mechStudies = studies.filter((s) => MECH_STUDY_TYPES.includes(s.type));
  const cureMode = c.materials?.cure_shrinkage ?? 'off';
  const fromIds = new Set(mechStudies.map((s) => s.temperature?.from).filter(Boolean));
  for (const id of fromIds) if (!c.studies.some((s) => s.id === id && s.type === 'thermal_stationary')) throw new CaseError(`thermo_elastic temperature.from ${id}: not a thermal_stationary study of the case`);
  // thermal studies (selected ones and the sources of temperature.from)
  // (thermal types only: a process_sequence study is mechanics, L8)
  const thermalIds = c.studies.filter((s) => (s.type === 'thermal_stationary' || s.type === 'thermal_transient') && (!study || s.id === study || fromIds.has(s.id))).map((s) => s.id);
  const th = { results: [], skipped: [], targets: [], gridStats: null, gridWarnings: [], genWarnings: [] };
  for (const id of thermalIds) {
    const o = runCase(c, { ...deps, study: id });
    th.results.push(...o.results);
    th.gridStats ??= o.gridStats;
    th.gridWarnings = th.gridWarnings.length ? th.gridWarnings : o.gridWarnings;
    th.genWarnings = th.genWarnings.length ? th.genWarnings : o.genWarnings;
    // keep, per target, the evaluation from the run that had its study
    th.targets = o.targets.map((t, i) => (th.targets[i] && (th.targets[i].got != null || !/not run|no thermal result/.test(th.targets[i].reason ?? '')) && t.got == null ? th.targets[i] : t));
  }
  // mechanics
  const mechResults = [];
  const notes = [];
  const skipped = [];
  if (mechStudies.length && !mech) for (const s of mechStudies) skipped.push({ study: s.id, type: s.type, reason: 'mechanics module (lane L8, src/mech) not provided' });
  const errors = [];
  const thin = thinOf(c);
  // the case copy runMechCase sees: overrides pre-applied in the library (case + study level), allow_extrapolation
  // kept at its effective value (study over case), so runMechCase passes it to resolve, the CTE rebase and the RVE
  // constituents itself (the wrapped library is a second layer); study-level materials blocks are folded in
  const mechCopy = (s, studies = c.studies) => {
    const allow = allowOf(c, s);
    const { allow_extrapolation: _a, overrides: _o, ...mrest } = c.materials ?? {};
    return {
      ...c, materials: { ...mrest, overrides: {}, ...(allow != null ? { allow_extrapolation: allow } : {}) },
      studies: studies.map(({ materials: _m, ...x }) => x),
    };
  };
  // runMechCase forwards deps.rtol / maxIter to solveMech since 2026-10-20 (L10 cross-lane edit; process_sequence steps
  // use direct solves). An older or injected runMechCase without it solves at the solveMech default 1e-10: detected
  // from the function source (mech.forwardsRtol overrides the check) and reported
  const forwards = mech ? (mech.forwardsRtol ?? /\brtol\b/.test(String(mech.runMechCase ?? ''))) : false;
  if (mechStudies.length && mech && !forwards && mechStudies.some((s) => !s.temperature?.from))
    notes.push('mechanics rtol: runMechCase (L8, mech/case.mjs) does not forward rtol / maxIter yet; uniform-temperature and process_sequence studies solve at the solveMech default rtol 1e-10 (temperature.from studies use the requested rtol)');
  if (mechStudies.length && mech) {
    for (const s of mechStudies) {
      const allow = allowOf(c, s);
      const ovS = studyOverrides(c, s, deps.lib ?? null);
      const solve0 = mechSolveOf(c, s, deps.mechRtol ?? null);
      const solve = forwards || s.temperature?.from ? solve0 : { ...solve0, rtol: 1e-10, source: `solveMech default (requested ${solve0.rtol} from ${solve0.source}; not forwarded by runMechCase)` };
      const solveDeps = { rtol: solve0.rtol, ...(solve0.maxIter != null ? { maxIter: solve0.maxIter } : {}) };
      const tsfWarn = s.type === 'thermo_elastic' ? perPartTsfWarning(c, s) : null;
      if (tsfWarn) notes.push(tsfWarn);
      const nlS = s.type === 'thermo_elastic' ? nonlinearOf(c, s) : null;
      // homogenization record per runMechCase / solveMech call (audit A3 S1 / M1)
      const homogFinish = (r, lib, before) => {
        const h = homogRecord(r.homogenization ?? lib?.homogenizationDefault?.() ?? null, before, homogSnapshot(lib), lib?._ex?.fallbacks?.() ?? []);
        r.homogenization_record = h;
        if (h.label) r.homogenization = h.label;
        if (h.rom_fallbacks.length) r.warnings = [...(r.warnings ?? []), `homogenization: RVE failed and the rule of mixtures was used for ${h.rom_fallbacks.join(', ')} (result labelled ${h.label})`];
      };
      const cureNotApplied = (r) => { r.cure_shrinkage = cureMode === 'off' ? 'off' : `off (materials.cure_shrinkage ${cureMode} not applied to ${s.temperature?.from ? 'temperature.from' : s.type} studies)`; };
      if (cureMode !== 'off' && (s.type !== 'thermo_elastic' || s.temperature?.from)) notes.push(`study ${s.id}: materials.cure_shrinkage ${cureMode} not applied (${s.temperature?.from ? 'temperature.from' : s.type} study; uniform-temperature thermo_elastic studies only)`);
      const finish = (r) => {
        if (tsfWarn) r.warnings = [...(r.warnings ?? []), tsfWarn];
        const cv = mechConvergence(r, solve);
        if (cv && !cv.accepted) errors.push({ study: s.id, type: s.type, T_C: r.T_C ?? null, error: `not converged: relres ${cv.relres.toExponential(2)} after ${cv.iterations} iterations (rtol ${cv.rtol_requested}; accepted below ${MECH_RTOL.accept.toExponential(0)})`, unconverged: true });
      };
      try {
      if (s.type === 'process_sequence') {
        // whole study through L8's runMechCase (steps, activation, per-step targets)
        const { lib: Lp, notes: np } = mechLibWithOptions(deps.lib, ovS, deps.applyOverrides, allow);
        notes.push(...np);
        const cp = mechCopy(s);
        if (thin) notes.push(`study ${s.id}: mesh.thin not applied (process_sequence grids are built by L8 without the merge)`);
        const hb = homogSnapshot(Lp);
        const o = mech.runMechCase(cp, { generate: deps.generate, lib: Lp, applyOverrides: deps.applyOverrides, data: deps.data, study: s.id, solver: deps.mechSolver ?? 'auto', onProgress, ...solveDeps });
        for (const r of o.results) { r.warnings = [...(r.warnings ?? []), ...Lp._ex.warnings()]; homogFinish(r, Lp, hb); cureNotApplied(r); mechResults.push(r); }
      } else if (s.type === 'thermo_elastic_sweep') {
        // rate-form sweep (L8 mech/sweep.mjs through runMechCase): the whole path in one call
        if (nonlinearOf(c, {})) notes.push(`study ${s.id}: physics.mechanics.nonlinear not applied (the rate-form sweep is linear)`);
        const { lib: Lw, notes: nw } = mechLibWithOptions(deps.lib, ovS, deps.applyOverrides, allow);
        notes.push(...nw);
        const hb = homogSnapshot(Lw);
        const o = mech.runMechCase(mechCopy(s), { generate: deps.generate, lib: Lw, applyOverrides: deps.applyOverrides, data: deps.data, study: s.id, solver: deps.mechSolver ?? 'auto', onProgress, ...(thin ? { thin } : {}) });
        for (const r of o.results) { r.warnings = [...(r.warnings ?? []), ...Lw._ex.warnings()]; homogFinish(r, Lw, hb); cureNotApplied(r); finish(r); mechResults.push(r); }
        notes.push(...(o.notes ?? []));
      } else if (s.temperature?.from) {
        if (nlS) throw new CaseError(`study ${s.id}: nonlinear is not available for temperature.from studies (uniform temperature only)`);
        const tr = th.results.find((r) => r.study === s.temperature.from);
        const { lib: Lf, notes: nf } = mechLibWithOptions(deps.lib, ovS, deps.applyOverrides, allow);
        notes.push(...nf);
        if (thin) notes.push(`study ${s.id}: mesh.thin not applied (temperature.from runs on the thermal study's grid)`);
        const mat = mech.mechLibrary(Lf, mechCopy(s), deps.applyOverrides);
        const hb = homogSnapshot(Lf);
        const ms = unwrapValues(c.physics?.mechanics ?? {});
        const sv = unwrapValues({ ...s, params: undefined });
        const sf = sv.stress_free_C != null ? { default: sv.stress_free_C } : ms.stress_free_C;
        const surfaces = [...new Set((c.targets ?? []).filter((t) => (t.study ?? s.id) === s.id && ['warpage_um', 'coplanarity_um'].includes(t.quantity)).map((t) => t.selection))];
        onProgress?.('solve', `study ${s.id}: temperature from ${s.temperature.from}`);
        const r = mech.solveMech(tr.grid, {
          solver: deps.mechSolver ?? 'auto',
          element: sv.element ?? ms.element ?? 'q1im', resolve: mat.resolve, rebase: mat.rebase, stress_free_C: sf,
          supports: sv.supports ?? ms.supports ?? 'rigid_motion', temperature: { T_K: tr.fields.T_K.map((v) => (Number.isNaN(v) ? 298.15 : v)) }, study: s.id,
          resolveOpts: allow != null ? { allowExtrapolation: allow } : {}, ...solveDeps,
          warpage: surfaces.map((nm) => {
            const m = /^(bottom|top):(.+)$/.exec(nm);
            return m && (m[2] === 'model' || !tr.grid.selections[nm]) ? { surface: `${m[1]}:model`, _sel: mech.modelSurface(tr.grid, m[1]) } : nm;
          }),
        });
        r.T_C = null;
        r.warnings = [...(r.warnings ?? []), ...Lf._ex.warnings()];
        r.surface_map = Object.fromEntries(surfaces.map((nm) => [nm, /^(bottom|top):(.+)$/.test(nm) && !tr.grid.selections[nm] ? `${nm.split(':')[0]}:model` : nm]));
        homogFinish(r, Lf, hb);
        cureNotApplied(r);
        finish(r);
        mechResults.push(r);
        notes.push(...mat.notes);
      } else {
        // overrides pre-applied, resolve wrapped for allow_extrapolation (CD6); runMechCase sees no overrides left
        const { lib: L2, notes: n2 } = mechLibWithOptions(deps.lib, ovS, deps.applyOverrides, allow);
        notes.push(...n2);
        // one runMechCase call per temperature, so an out-of-range temperature does not hide the others
        const temps = unwrapValues(s.temperature?.uniform_C) ?? [];
        for (const T of Array.isArray(temps) && temps.length ? temps : [null]) {
          // per-run time budget (L9): temperatures not started within the budget are skipped, each keeps its result
          if (deps.budget_s != null && (performance.now() - t0) / 1000 > deps.budget_s) {
            errors.push({ study: s.id, type: s.type, T_C: T, error: `skipped: run time budget ${deps.budget_s} s spent before this temperature`, skipped: true });
            continue;
          }
          const c2 = mechCopy(s, c.studies.map(({ nonlinear: _n, ...x }) => (x.id === s.id && T != null ? { ...x, temperature: { ...x.temperature, uniform_C: [T] } } : x)));
          // materials.cure_shrinkage: off (default) | library | both (off first: targets are evaluated on it)
          for (const mode of cureMode === 'both' ? ['off', 'library'] : [cureMode]) {
            try {
              const hb = homogSnapshot(L2);
              const o = mech.runMechCase(c2, { generate: deps.generate, lib: L2, applyOverrides: deps.applyOverrides, data: deps.data, study: s.id, solver: deps.mechSolver ?? 'auto', onProgress, ...solveDeps, ...(thin ? { thin } : {}), cureShrinkage: mode, ...(nlS ? { nonlinear: nlS } : {}) });
              for (const r of o.results) { r.warnings = [...(r.warnings ?? []), ...L2._ex.warnings()]; r.cure_shrinkage = mode; homogFinish(r, L2, hb); finish(r); }
              mechResults.push(...o.results);
              for (const r of o.results) deps.onMechResult?.(r);
              notes.push(...(o.notes ?? []));
            } catch (e) {
              errors.push({ study: s.id, type: s.type, T_C: T, ...(cureMode === 'both' ? { cure_shrinkage: mode } : {}), error: `${cureMode === 'both' ? `cure_shrinkage ${mode}: ` : ''}${e.message}` });
            }
          }
        }
      }
      } catch (e) {
        // one failing study does not hide the others; reported, and the CLI exits 1
        errors.push({ study: s.id, type: s.type, error: e.message });
      }
    }
  }
  // targets: thermal ones as runCase evaluated them, mechanics ones here
  const sensBound = sensitivityOfRun(c, study);
  const thermalTargets = new Map((th.targets ?? []).map((t, i) => [i, t]));
  // cure_shrinkage both: targets are compared on the off results; the library value is attached
  const primary = cureMode === 'both' ? mechResults.filter((r) => r.cure_shrinkage !== 'library') : mechResults;
  const shrinkRes = mechResults.filter((r) => r.cure_shrinkage === 'library');
  const targets = (c.targets ?? []).map((t, i) => {
    if (!MECH_QUANTITIES.includes(t.quantity) && t.quantity !== 'stress_norm' && t.step == null) return thermalTargets.get(i) ?? { ...t, got: null, status: 'unchecked', reason: 'thermal study not selected' };
    const ex = expectedFor(t, deps.metricLookup ?? null);
    const out = { ...t, got: null, ...ex, status: 'unchecked' };
    if (sensBound.length) out.sensitivity_bound = true;
    const err = errors.find((e) => !e.unconverged && !(cureMode === 'both' && e.cure_shrinkage === 'library') && (e.study === t.study || !t.study) && (e.T_C == null || t.T_C == null || e.T_C === t.T_C) && !pickMech(primary, t.study ?? null, t.T_C ?? null));
    if (err) { out.reason = `study ${err.study} failed: ${err.error}`; return out; }
    if (!mechResults.length) { out.reason = 'no mechanics study selected'; return out; }
    const rr = pickMech(primary, t.study ?? null, t.T_C ?? null);
    if (rr?.convergence && !rr.convergence.accepted) { out.reason = `study ${rr.study}${rr.T_C != null ? ` at ${rr.T_C} C` : ''} not converged (relres ${rr.convergence.relres.toExponential(2)}): not compared`; return out; }
    const isStep = t.step != null || c.studies.some((x) => x.id === t.study && x.type === 'process_sequence');
    const pt = isStep ? stepTarget(t, mechResults) : null;
    const e = pt ?? evalMechTarget(t, primary);
    if (e.reason) { out.reason = e.reason; return out; }
    out.got = e.got;
    if (rr?.cure_shrinkage) out.cure_shrinkage = rr.cure_shrinkage;
    if (cureMode !== 'off' && !pt) {
      // library cure shrinkage: the value with it (both), and the linear / volumetric bracket when the kind is not stated
      const pool = cureMode === 'both' ? shrinkRes : mechResults;
      if (cureMode === 'both') { const e2 = evalMechTarget(t, pool); out.got_cure_shrinkage = e2.got ?? null; }
      const vs = pool.filter((r) => r.shrinkage_variant && (t.study == null || r.study === t.study) && (t.T_C == null || Math.abs(r.T_C - t.T_C) < 1e-9));
      if (vs.length > 1) out.got_by_shrinkage = Object.fromEntries(vs.map((r) => [r.shrinkage_variant, evalMechTarget({ ...t, study: r.study, T_C: r.T_C }, [r]).got ?? null]));
    }
    Object.assign(out, e.info);
    if (out.expected == null) { out.reason = ex.reason ?? 'no expected value'; return out; }
    out.rel_err = out.expected !== 0 ? e.got / out.expected - 1 : null;
    // a value taken at a singular point (re-entrant corner, bimaterial edge) is mesh dependent: indeterminate, not
    // counted for exit codes, unless the target accepts it explicitly (allow_singular with a reason)
    const flags = [e.info?.flag, e.info?.reference_flag].filter((f) => SINGULAR_FLAGS.includes(f));
    if (flags.length && !(t.allow_singular === true && t.reason)) {
      out.status = 'indeterminate';
      out.reason = `value at a singular point (${[...new Set(flags)].join(', ')}): mesh dependent; set allow_singular: true with a reason to compare it`;
      return out;
    }
    const pass = checkTolerance(e.got, out.expected, t.tolerance ?? {});
    out.status = pass == null ? 'unchecked' : pass ? 'pass' : 'miss';
    return out;
  });
  // unused overrides over every grid of the run (thermal and mechanics); the per-thermal-study check is replaced
  const unusedM = unusedOverrides(allOverrides(c), [...th.results.map((r) => r.grid), ...mechResults.map((r) => r.grid)].filter(Boolean), deps.lib ?? null, deps.unusedOverrideKeys ?? null);
  const gw = (th.gridWarnings ?? []).filter((w) => !/used by no part/.test(w));
  if (unusedM.length && !gw.some((w) => /used by no part/.test(w))) gw.push(`materials.overrides used by no part: ${unusedM.join(', ')}`);
  return { case: c.id, family: c.family, gridStats: th.gridStats, gridWarnings: gw, genWarnings: th.genWarnings, results: th.results, mech: mechResults, notes, skipped, errors, targets, ...(sensBound.length ? { sensitivity_bound: sensBound } : {}), total_ms: performance.now() - t0 };
}

/** One warpage line: JEITA value and label, coplanarity, shape class and centre-minus-corner when L8 provides them. */
export function mechWarpageLine(w) {
  const label = String(w.sign_convention ?? '').split(';')[0];
  return `  warpage ${w.warpage_um.toFixed(2)} um (${w.definition}; ${label}; surface ${w.surface}, view ${w.view_side}); coplanarity ${w.coplanarity_um.toFixed(2)} um`
    + (w.shape_class != null ? `; shape ${w.shape_class}` : '') + (w.centre_minus_corner_um != null ? `; centre - corner ${w.centre_minus_corner_um.toFixed(2)} um` : '');
}

/** Summary text of runCaseAll (thermal summary plus mechanics lines). */
export function summarizeAll(out) {
  const L = [summarize({ ...out, targets: [], gridStats: out.gridStats, gridWarnings: out.gridWarnings ?? [] }).split('\n').filter((l) => !/^total /.test(l)).join('\n')];
  for (const n of [...new Set(out.notes ?? [])].filter((x) => /mesh\.thin|merged over the case level|stress_free_C\.per_part|mechanics rtol/.test(x) && !out.mech.some((r) => (r.warnings ?? []).includes(x)))) L.push(`note: ${n}`);
  for (const r of out.mech) {
    if (r.type === 'process_sequence') {
      L.push(`study ${r.study} process_sequence: ${r.steps?.length ?? 0} steps (lane L8 E4)`);
      for (const st of r.steps ?? []) {
        const w = (st.warpage ?? st.derived?.warpage ?? [])[0];
        const Ts = st.T_end_C ?? st.T_C;
        L.push(`  step ${st.step ?? st.id ?? '-'}${Ts != null ? ` at ${Ts} C` : ''}${st.activated?.length ? ` (activated ${st.activated.join(', ')})` : ''}${w ? `: warpage ${w.warpage_um.toFixed(2)} um (${w.definition}, surface ${w.surface}, view ${w.view_side}), coplanarity ${w.coplanarity_um.toFixed(2)} um` : ''}`);
      }
      continue;
    }
    const t = r.timing;
    const cv = r.convergence;
    L.push(`study ${r.study} ${r.type ?? 'thermo_elastic'}${r.T_C != null ? ` at ${r.T_C} C` : ' (temperature field)'}${r.nonlinear ? ` [nonlinear, ${r.nonlinear.load_steps} load steps]` : ''}${r.cure_shrinkage ? `; cure shrinkage ${r.cure_shrinkage}${r.shrinkage_variant ? ` (${r.shrinkage_variant})` : ''}` : ''}: element ${r.element}, ${r.stats.dof} DOF, solver ${t.solver?.kind ?? t.solver?.solver ?? '-'}, ${t.iterations} iterations${cv ? `, relres ${cv.relres.toExponential(2)} (rtol ${cv.rtol_requested}${cv.converged ? '' : cv.accepted ? ', accepted' : ', NOT CONVERGED'})` : ''}, total ${(t.total_ms / 1000).toFixed(2)} s; grid ${r.grid.nx} x ${r.grid.ny} x ${r.grid.nz}`);
    for (const w of r.derived.warpage ?? []) L.push(mechWarpageLine(w));
    const hl = homogLine(r.homogenization_record);
    if (hl) L.push(hl);
    const vm = Object.entries(r.derived.von_mises_per_part ?? {}).sort((a, b) => b[1].vm_max_gp_Pa - a[1].vm_max_gp_Pa).slice(0, 5);
    for (const [id, v] of vm) L.push(`  von Mises ${id.padEnd(22)} ${(v.vm_max_gp_Pa / 1e6).toFixed(1)} MPa (Gauss)${v.vm_max_gp_flag ? ` [${v.vm_max_gp_flag}]` : ''}, node ${(v.vm_max_node_Pa / 1e6).toFixed(1)} MPa${v.vm_max_node_flag ? ` [${v.vm_max_node_flag}]` : ''}`);
    for (const w of r.warnings ?? []) L.push(`  warning: ${w}`);
  }
  for (const e of out.errors ?? []) L.push(`study ${e.study} ${e.type}${e.T_C != null ? ` at ${e.T_C} C` : ''}: ERROR ${e.error}`);
  for (const t of out.targets)
    L.push(`target ${t.metric_id ?? '-'} ${t.quantity}${t.study ? ` [${t.study}]` : ''}${t.T_C != null ? ` @ ${t.T_C} C` : ''}: ${t.status}${t.got != null ? ` got ${Number(t.got).toPrecision(5)}` : ''}${expectedText(t)}${t.rel_err != null ? ` (${(100 * t.rel_err).toFixed(1)} %)` : ''}${t.flag ? ` [${t.flag}]` : ''}${t.got_cure_shrinkage != null ? ` [with cure shrinkage ${Number(t.got_cure_shrinkage).toPrecision(5)}]` : ''}${t.sensitivity_bound ? ' [sensitivity bound]' : ''}${t.reason ? ` - ${t.reason}` : ''}`);
  L.push(`total ${out.total_ms.toFixed(0)} ms`);
  return L.join('\n');
}

/** JSON-safe copy of runCaseAll (field arrays, grids and internals dropped). */
export function toJsonAll(out) {
  const j = toJson(out);
  j.mech = out.mech.map(({ grid, fields, _u, _num, _steps, ...r }) => ({ ...r, fields: Object.keys(fields ?? {}), grid: grid ? { nx: grid.nx, ny: grid.ny, nz: grid.nz } : null }));
  return j;
}

/**
 * metricLookup over app/static/data/sim_targets.json (scripts/build_sim_targets.py; browser target lookup):
 * metric_id or ei_id -> {value, unit, basis, locator, tv_id, condition, table, ...}; null when absent.
 */
export function metricLookupFromJson(json) {
  const rows = json?.rows ?? {};
  return (id) => {
    const r = rows[id];
    if (!r) return null;
    const value = typeof r.value === 'number' ? r.value : Number.isFinite(Number(r.value)) ? Number(r.value) : NaN;
    return { ...r, value };
  };
}
