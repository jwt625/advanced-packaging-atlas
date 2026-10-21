// License: GPL-3.0-or-later.
// Parameterized package-family generators (D2, DevLog-010 / DevLog-012 lane L3).
//
//   generate(familyId, overrides = {}, { data } = {})
//     -> {family, params, parts, arrays, layers, boxes, symmetry, provenance, warnings}
//
// Pure and deterministic; runs in the browser and in Node. `data` is the parsed app/static/data/package3d.json (the
// browser passes what it fetched; Node can use ./node.mjs loadPackage3d()). Alternatively register it once with
// setData(json). Errors (unknown parameter, constraint violations) throw GeneratorError with `issues`;
// check() returns the issues without throwing.

import { buildBoxes, symmetry } from './boxes.mjs';
import * as cowos_l from './cowos_l.mjs';
import * as cowos_r from './cowos_r.mjs';
import * as cowos_s from './cowos_s.mjs';
import * as emib_t from './emib_t.mjs';
import * as fcbga_organic from './fcbga_organic.mjs';
import * as info_os from './info_os.mjs';
import * as hbm_stack from './hbm_stack.mjs';
import * as soic from './soic.mjs';
import * as glass_core_substrate from './glass_core_substrate.mjs';
import * as fan_out_panel from './fan_out_panel.mjs';
import * as cpo_module from './cpo_module.mjs';
import * as ucla_si_if from './ucla_si_if.mjs';
import { GeneratorError, resolveParams, rnd } from './params.mjs';
import { PRESETS } from './presets.mjs';
import { resolveStructure } from './resolve.mjs';
import { geometryChecks, preChecks } from './rules.mjs';

export { GeneratorError } from './params.mjs';
export { HBM_TABLE } from './common.mjs';
export { PRESETS } from './presets.mjs';

export const FAMILIES = { cowos_l, cowos_s, emib_t, fcbga_organic, cowos_r, info_os, hbm_stack, soic, glass_core_substrate, fan_out_panel, cpo_module, ucla_si_if };
export const GENERATOR_VERSION = 'ap-sim-families/0';

let registered = null;
export function setData(json) { registered = json; }

export function listFamilies() { return Object.keys(FAMILIES); }

function familyJson(data, familyId) {
  const d = data || registered;
  if (!d || !Array.isArray(d.families)) throw new GeneratorError('package3d data not provided (pass {data} or call setData(json))');
  const f = d.families.find((x) => x.id === familyId);
  if (!f) throw new GeneratorError(`family ${familyId} not in package3d data`);
  return { d, f };
}

function accessor(R) {
  return { v: (k) => { if (!(k in R.values)) throw new GeneratorError(`unknown parameter ${k}`); return R.values[k]; }, has: (k) => k in R.values, values: R.values, entries: R.entries };
}

function run(familyId, overrides, opts) {
  const mod = FAMILIES[familyId];
  if (!mod) throw new GeneratorError(`no generator for family ${familyId} (have ${listFamilies().join(', ')})`, [{ code: 'unknown_family', level: 'error' }]);
  const { d, f } = familyJson(opts.data, familyId);
  let ov = overrides || {};
  if (ov.preset !== undefined) {
    const pr = PRESETS[ov.preset];
    if (!pr) throw new GeneratorError(`unknown preset ${ov.preset}`, [{ code: 'unknown_preset', level: 'error' }]);
    if (pr.family !== familyId) throw new GeneratorError(`preset ${ov.preset} is for family ${pr.family}`, [{ code: 'preset_family', level: 'error' }]);
    const { preset, ...rest } = ov;
    ov = { ...pr.params, ...rest };
  }
  let R;
  try {
    R = resolveParams(f.params, mod.ext, ov);
  } catch (e) {
    if (e instanceof GeneratorError) return { issues: e.issues.length ? e.issues.map((i) => ({ level: 'error', message: e.message, ...i })) : [{ code: 'params', level: 'error', message: e.message }], f, d };
    throw e;
  }
  const P = accessor(R);
  const issues = [...R.warnings, ...preChecks(P, mod.preChecks)];
  if (issues.some((i) => i.level === 'error')) return { issues, R, f, d };
  let S;
  try {
    S = resolveStructure(mod.build(P), { values: R.values, entries: R.entries });
  } catch (e) {
    if (e instanceof GeneratorError) return { issues: [...issues, ...(e.issues.length ? e.issues.map((i) => ({ level: 'error', message: e.message, ...i })) : [{ code: 'structure', level: 'error', message: e.message }])], R, f, d };
    throw e;
  }
  issues.push(...S.warnings, ...geometryChecks(S, P, mod.layout));
  return { issues, R, S, f, d, P };
}

/** All issues (errors, warnings, info) for a parameter set, without throwing on constraint errors. */
export function check(familyId, overrides = {}, opts = {}) {
  return run(familyId, overrides, opts).issues;
}

export function generate(familyId, overrides = {}, opts = {}) {
  const { issues, R, S, d } = run(familyId, overrides, opts);
  const errors = issues.filter((i) => i.level === 'error');
  if (errors.length) throw new GeneratorError(`${familyId}: ${errors.map((e) => e.message).join('; ')}`, errors);
  const boxes = buildBoxes(S);
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));
  const parts = S.parts.map(clean);
  const layers = S.layers.map(clean);
  const arrays = S.arrays.map(clean);
  // provenance: every R-id and DB cell referenced by params and dims
  const rids = new Set();
  const cells = new Set();
  const visit = (e) => {
    if (!e || typeof e !== 'object') return;
    for (const r of [e.ref, ...(e.refs || [])]) if (typeof r === 'string') (/^R\d+$/.test(r) ? rids : cells).add(r);
  };
  Object.values(R.entries).forEach(visit);
  for (const x of [...parts, ...layers, ...arrays]) {
    Object.values(x.dims || {}).forEach(visit);
    if (x.route) Object.values(x.route.dims || {}).forEach(visit);
  }
  const counts = {};
  for (const x of parts) for (const dd of Object.values(x.dims)) counts[dd.status] = (counts[dd.status] || 0) + 1;
  const refs = {};
  for (const r of [...rids].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)))) refs[r] = d.refs?.[r] ?? null;
  return {
    family: familyId,
    generator: GENERATOR_VERSION,
    source: { package3d_generated: d.generated, package3d_version: d.version },
    params: R.entries,
    parts, layers, arrays, boxes,
    symmetry: symmetry(boxes),
    provenance: { refs, cells: [...cells].sort(), part_dim_status_counts: counts, conventions: d.conventions,
      overridden: R.overridden, rounding: 'output values rounded to 4 decimals (as scripts/build_package3d.py rnd)' },
    warnings: issues.filter((i) => i.level !== 'error'),
  };
}

export { rnd };
