// Thermo-elastic case runner (SPEC section 1 studies of type thermo_elastic; lane L8, E2). Browser-safe (no Node
// imports): dependencies are injected. Reuses the L1 case parser and helpers (thermal/case.mjs) for the shared
// parts (parseCase, unwrapValues, materialMapper), the families generator for the boxes, the materials library with
// case overrides applied through materials applyOverrides (mechanics fields E_GPa, nu, cte_ppmK and the thermal ones).
// Mechanics targets: warpage_um (JEITA ED-7306 signed, on the target selection), coplanarity_um, von_mises_max_MPa
// (max over the matched parts, Gauss-point maximum, with the singular-corner flag reported).
// License: GPL-3.0-or-later.

import { buildGrid, resolveSelection } from '../grid/index.mjs';
import { parseCase, unwrapValues, materialMapper } from '../thermal/case.mjs';
import { solveMech } from './index.mjs';
import { createRveResolver } from '../homog/resolver.mjs';
import { mergeThinLayers } from '../homog/merge.mjs';
import { solveProcessSequence } from './process.mjs';
// L10 cross-lane additions (2026-10-20, audit A3 S6): case-level dispatch to the nonlinear and rate-form solvers
import { solveMechNonlinear } from './nonlinear.mjs';
import { solveMechSweep } from './sweep.mjs';
import { buildNumbering } from './numbering.mjs';
import { AUTO_DIRECT_MAX_DOF } from './index.mjs';

/** DOF limit of case-level nonlinear runs: the direct-solve range of solveMechNonlinear 'auto' (SPEC 18). */
export const NONLINEAR_MAX_DOF = 100000;
/** DOF limit of case-level rate-form sweeps (direct solve per step): solveMech's direct range. */
export const SWEEP_MAX_DOF = AUTO_DIRECT_MAX_DOF;

/** A result in the solveMech shape for the nonlinear / sweep solvers (fields and stresses are not recovered there). */
function mechShaped({ study, type, T_C, element, grid, ndof, warpage, ms, iterations, solver, warnings = [], extra = {} }) {
  return { study, type, T_C, element, grid, fields: {}, derived: { warpage, von_mises_per_part: {} }, stats: { dof: ndof }, timing: { total_ms: ms, iterations, solver: { solver } }, warnings, ...extra };
}

/** Case overrides into L2 applyOverrides leaves (status user and a note filled in when missing, as L1's adapter). */
function overrideLeaves(overrides = {}) {
  const ov = {}, notes = [];
  for (const [k, f] of Object.entries(overrides ?? {})) {
    ov[k] = {};
    for (const [field, leaf0] of Object.entries(f ?? {})) {
      const leaf = leaf0 && typeof leaf0 === 'object' && !Array.isArray(leaf0) ? { ...leaf0 } : { value: leaf0 };
      if (leaf.status == null) { leaf.status = 'user'; notes.push(`override ${k}.${field}: status user filled in`); }
      if (!leaf.ref && !leaf.note) leaf.note = 'case override (no provenance given)';
      for (const extra of ['basis', 'source', 'locator']) delete leaf[extra];
      ov[k][field] = leaf;
    }
  }
  return { ov, notes };
}

/** Library-backed resolver, rebase and materialOf for a case (overrides applied). */
export function mechLibrary(lib, c, applyOverrides = null) {
  const { ov, notes } = overrideLeaves(c.materials?.overrides);
  let L = lib;
  if (Object.keys(ov).length) {
    if (!applyOverrides) throw new Error('mech case: materials.overrides need the materials applyOverrides function');
    L = applyOverrides(lib, ov);
  }
  const keys = new Set(L.keys());
  const base = materialMapper(c.materials?.map ?? {});
  const materialOf = (p) => {
    const k = base(p);
    if (k.startsWith('homog:') || keys.has(k)) return k;
    const a = L.aliasTemplateKey(k);
    return typeof a === 'string' ? a : a.key;
  };
  return { resolve: (k, T, o) => L.resolve(k, T, o), rebase: (e, Tsf, T, o) => L.rebaseSecantCte(e, Tsf, T, o), materialOf, notes, lib: L };
}

/** Resolver with the homogenization mode forced on homog: keys (CD7: the library default is rve when attached). */
function withHomogMode(resolve, mode) {
  return (k, T, o = {}) => resolve(k, T, typeof k === 'string' && k.startsWith('homog:') ? { ...o, homogenization: mode } : o);
}

/** `bottom:model` / `top:model`: all exterior z-normal faces on the lowest / highest node plane of the grid. */
export function modelSurface(grid, side) {
  const { nx, ny, nz, cellPart } = grid;
  const cells = [];
  if (side === 'bottom') {
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (cellPart[i + nx * j] >= 0) cells.push(i + nx * j);
    return { groups: [{ axis: 'z', side: '-', cells: Int32Array.from(cells) }] };
  }
  const k = nz - 1;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (cellPart[i + nx * (j + ny * k)] >= 0) cells.push(i + nx * (j + ny * k));
  return { groups: [{ axis: 'z', side: '+', cells: Int32Array.from(cells) }] };
}

const globRe = (g) => new RegExp(`^${g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`);

/**
 * Run the thermo-elastic studies of a case.
 * @param {object} c case object (parsed YAML)
 * @param {object} deps {generate, lib, applyOverrides, data, study, mesh (override of c.mesh), element, solver,
 *   surface (warpage selection override), onProgress}
 */
export function runMechCase(c, deps) {
  const { generate, lib, applyOverrides = null, data = null, study = null, mesh: meshOv = {}, element = null, solver = 'auto', surface = null, onProgress = null,
    homogenization: homogIn = null, thin = null, rve: rveCfg = {}, memProbe = false, gmg = {}, warmStart = true, cureShrinkage = 'off',
    rtol = null, maxIter = null, nonlinear = null } = deps; // rtol / maxIter: solveMech PCG options (L10 cross-lane edit 2026-10-20; null = solveMech defaults)
  if (!['off', 'library'].includes(cureShrinkage)) throw new Error(`mech case: cureShrinkage ${cureShrinkage} not in off | library`);
  // CD7: default = the library's default (rve when the RVE resolver is attached, else rom)
  const homogenization = homogIn ?? lib.homogenizationDefault?.() ?? 'rom';
  // L1's parseCase validates the shared structure; mechanics-only keys (materials.allow_extrapolation, CD6) are
  // validated here and stripped from the copy it sees
  const allowExt = c.materials?.allow_extrapolation ?? null;
  if (allowExt != null && allowExt !== true && !(Array.isArray(allowExt) && allowExt.every((k) => typeof k === 'string')))
    throw new Error('mech case: materials.allow_extrapolation must be true or a list of material keys');
  const { allow_extrapolation: _ae, ...matsRest } = c.materials ?? {};
  // process_sequence studies (E4) and their per-step targets (`step`) are validated here, not by L1's parser
  const PROC_KEYS = ['id', 'type', 'note', 'params', 'geometry', 'steps', 'supports', 'element'];
  for (const st of c.studies ?? []) {
    if (st.type !== 'process_sequence') continue;
    for (const k of Object.keys(st)) if (!PROC_KEYS.includes(k)) throw new Error(`mech case: study ${st.id}: unknown key ${k} (allowed: ${PROC_KEYS.join(', ')})`);
    if (!Array.isArray(st.steps) || !st.steps.length) throw new Error(`mech case: study ${st.id}: steps (non-empty list) required`);
  }
  const procIds = new Set((c.studies ?? []).filter((st) => st.type === 'process_sequence').map((st) => st.id));
  const stripT = (t) => { const { step: _s, ...rest } = t; return rest; };
  const forParse = {
    ...c, materials: c.materials ? matsRest : undefined,
    studies: (c.studies ?? []).filter((st) => st.type !== 'process_sequence'),
    targets: (c.targets ?? []).filter((t) => !procIds.has(t.study)).map(stripT),
  };
  if (!forParse.studies.length) forParse.studies = [{ id: '_none', type: 'thermo_elastic' }];
  parseCase(forParse);
  const t0 = performance.now();
  const progress = (s, m) => onProgress?.(s, m);
  const mat = mechLibrary(lib, c, applyOverrides);
  // homogenization: 'rom' (library rule of mixtures) | 'rve' (E3 periodic unit cells); thin-layer merging (merge.mjs)
  // needs the RVE resolver for its stack keys in either mode
  if (!['rom', 'rve'].includes(homogenization)) throw new Error(`mech case: homogenization ${homogenization} not in rom | rve`);
  // the library resolves homog: keys itself (CD7, L2 attachHomogResolver); the mode is passed per call. The local RVE
  // resolver serves only merged thin-layer stacks (registry) and its constituents follow the same mode.
  const libMode = withHomogMode(mat.resolve, homogenization);
  const rveR = thin ? createRveResolver({ ...mat.lib, resolve: libMode, rebaseSecantCte: mat.lib.rebaseSecantCte, canonicalKey: mat.lib.canonicalKey }, { ...rveCfg, only: 'stack', stackConstituents: homogenization }) : null;
  const resolveM = rveR ? rveR.resolve : libMode;
  const geo = c.geometry ?? {};
  const mesh = { ...unwrapValues(c.mesh ?? {}), ...meshOv };
  const mech = unwrapValues(c.physics?.mechanics ?? {});
  const results = [];
  // warm start across temperatures and studies on the same geometry: previous u scaled by (T - Tsf) / (Tprev - Tsf)
  let warm = null;
  const gridSig = (g, el) => {
    let h = 2166136261;
    for (let i = 0; i < g.cellPart.length; i++) h = Math.imul(h ^ (g.cellPart[i] + 7 * g.cellMat[i]), 16777619);
    return `${el}|${g.nx}|${g.ny}|${g.nz}|${h >>> 0}`;
  };
  for (const s0 of c.studies) {
    if (study && s0.id !== study) continue;
    if (s0.type === 'process_sequence') {
      const s = unwrapValues({ ...s0, params: undefined });
      const params = { ...(c.params ?? {}), ...(s0.params ?? {}) };
      progress('geometry', `study ${s.id}: family ${c.family}`);
      const gen = generate(c.family, params, data ? { data } : {});
      const drop = s.geometry?.drop_kinds ?? geo.drop_kinds ?? [];
      const grid = buildGrid(gen.boxes ?? gen.parts, { ...mesh, symmetry: geo.symmetry ?? 'none', drop_kinds: drop, materialOf: mat.materialOf });
      const surfs = [...new Set((c.targets ?? []).filter((t) => t.study === s.id && t.quantity === 'warpage_um').map((t) => surface ?? t.selection))];
      progress('solve', `study ${s.id}: process sequence, ${s.steps.length} steps`);
      const pr = solveProcessSequence(grid, {
        steps: s.steps, element: element ?? s.element ?? mech.element ?? 'q1im', resolve: resolveM, rebase: mat.rebase,
        supports: s.supports ?? mech.supports ?? 'rigid_motion', resolveOpts: allowExt ? { allowExtrapolation: allowExt } : {}, warpage: surfs,
      });
      results.push({ study: s.id, type: 'process_sequence', grid, steps: pr.steps.map(({ _U, _u, _grid, _num, _groups, ...rest }) => rest), _steps: pr.steps, gen_warnings: gen.warnings });
      continue;
    }
    if (s0.type !== 'thermo_elastic' && s0.type !== 'thermo_elastic_sweep') continue;
    const sweep = s0.type === 'thermo_elastic_sweep';
    const s = unwrapValues({ ...s0, params: undefined });
    const params = { ...(c.params ?? {}), ...(s0.params ?? {}) };
    progress('geometry', `study ${s.id}: family ${c.family}`);
    const gen = generate(c.family, params, data ? { data } : {});
    let boxes = gen.boxes ?? gen.parts;
    const drop = s.geometry?.drop_kinds ?? geo.drop_kinds ?? [];
    let gridMesh = mesh, thinReport = null;
    if (thin) {
      const m = mergeThinLayers(boxes.filter((b) => !drop.includes(b.kind)), {
        cell_xy_mm: mesh.max_xy_mm ?? 1, max_aspect: thin.max_aspect ?? 500, min_cells_per_layer: mesh.min_cells_per_layer ?? 1,
        materialOf: mat.materialOf, registerStack: rveR.registerStack,
      });
      boxes = m.parts;
      gridMesh = { ...mesh, min_cells_per_layer: 1, planes: { ...(mesh.planes ?? {}), z_um: [...(mesh.planes?.z_um ?? []), ...m.grid.planes.z_um] } };
      thinReport = m.report;
    }
    const grid = buildGrid(boxes, { ...gridMesh, symmetry: geo.symmetry ?? 'none', drop_kinds: drop, materialOf: mat.materialOf });
    progress('mesh', `grid ${grid.nx} x ${grid.ny} x ${grid.nz}`);
    const temps = sweep ? s.temperature?.path_C : s.temperature?.uniform_C;
    if (sweep && (!Array.isArray(temps) || !temps.length)) throw new Error(`mech case: study ${s.id}: temperature.path_C list is required (thermo_elastic_sweep)`);
    if (!Array.isArray(temps) || !temps.length) throw new Error(`mech case: study ${s.id}: temperature.uniform_C list is required (temperature from a thermal study: use solveMech directly)`);
    // study-level stress_free_C: a number replaces the default only (per_part kept, audit A2 M7); an object merges
    const sf0 = mech.stress_free_C ?? {};
    const sf = s.stress_free_C == null ? sf0
      : typeof s.stress_free_C === 'number' ? { ...sf0, default: s.stress_free_C }
        : { ...sf0, ...s.stress_free_C, per_part: { ...(sf0.per_part ?? {}), ...(s.stress_free_C.per_part ?? {}) } };
    const targetsOfStudy = (c.targets ?? []).filter((t) => (t.study ?? s.id) === s.id);
    const surfaces = [...new Set(targetsOfStudy.filter((t) => ['warpage_um', 'coplanarity_um'].includes(t.quantity)).map((t) => surface ?? t.selection))];
    // selection fallback: a part that owns no cells (fully covered by its layers) -> model bottom / top plane
    const surfMap = {};
    for (const nm of surfaces) {
      const m = /^(bottom|top):(.+)$/.exec(nm);
      if (m && (m[2] === 'model' || !resolveSelection(grid, nm))) surfMap[nm] = `${m[1]}:model`;
    }
    const el = element ?? s.element ?? mech.element ?? 'q1im';
    const sig = gridSig(grid, el);
    // cure shrinkage from the library (L2 cure_shrinkage): kinds linear / volumetric as stated; not_stated is never
    // picked silently: both interpretations run as a bracketing pair (linear = value, or volumetric = value)
    const shrinkVariants = [{ variant: null, eigenstrain: {} }];
    const shrinkWarnings = [];
    if (cureShrinkage === 'library') {
      const stated = {}, open = {};
      for (let q = 0; q < grid.parts.length; q++) {
        if (!grid.partCells?.[q]) continue;
        const key = grid.materials[grid.partMat[q]];
        if (key.startsWith('homog:')) continue;
        let cs = null;
        try { cs = mat.resolve(key, temps[0] + 273.15, { need: [] })?.cure_shrinkage ?? null; } catch { cs = null; }
        if (!cs || !(cs.value > 0)) continue;
        const id = grid.parts[q].id;
        if (cs.linear != null) stated[id] = { linear: -cs.linear };
        else if (cs.volumetric != null) stated[id] = { volumetric: -cs.volumetric };
        else open[id] = { value: cs.value, key };
      }
      if (Object.keys(open).length) {
        const ids = Object.keys(open);
        shrinkWarnings.push(`cure shrinkage kind not stated for ${[...new Set(ids.map((i) => open[i].key))].join(', ')} (${ids.length} parts): bracketing pair run (linear = value; volumetric = value, i.e. linear = value / 3)`);
        shrinkVariants.length = 0;
        shrinkVariants.push({ variant: 'linear', eigenstrain: { ...stated, ...Object.fromEntries(ids.map((i) => [i, { linear: -open[i].value }])) } });
        shrinkVariants.push({ variant: 'volumetric', eigenstrain: { ...stated, ...Object.fromEntries(ids.map((i) => [i, { volumetric: -open[i].value }])) } });
      } else shrinkVariants[0] = { variant: Object.keys(stated).length ? 'stated' : null, eigenstrain: stated };
    }
    if (sweep) {
      // rate-form sweep along path_C from the stress-free default (mech/sweep.mjs; direct solve per step)
      const nd = buildNumbering(grid, el).ndof, lim = s.max_dof ?? SWEEP_MAX_DOF;
      if (nd > lim) throw new Error(`mech case: study ${s.id}: ${nd} DOF above the rate-form sweep limit ${lim} (direct solve per temperature step): coarsen the mesh or set max_dof explicitly`);
      if (shrinkVariants.some((v) => Object.keys(v.eigenstrain).length)) throw new Error(`mech case: study ${s.id}: cure shrinkage (eigenstrain) is not supported by the rate-form sweep`);
      progress('solve', `study ${s.id}: rate-form sweep ${temps.join(' -> ')} C`);
      const ts = performance.now();
      const sw = solveMechSweep(grid, {
        element: el, resolve: resolveM, rebase: mat.rebase, stress_free_C: sf, supports: s.supports ?? mech.supports ?? 'rigid_motion', path_C: temps,
        ...(s.dT_max != null ? { dT_max: s.dT_max } : {}), resolveOpts: allowExt ? { allowExtrapolation: allowExt } : {},
        warpage: surfaces.map((nm) => (surfMap[nm] ? { surface: surfMap[nm], _sel: modelSurface(grid, surfMap[nm].split(':')[0]) } : nm)),
      });
      const ms = performance.now() - ts;
      for (const st of sw.steps) {
        const r = mechShaped({ study: s.id, type: 'thermo_elastic_sweep', T_C: st.T_C, element: el, grid, ndof: nd, warpage: st.warpage, ms, iterations: 0, solver: 'direct (rate-form sweep)', extra: { curvature: st.curvature, sweep_path_C: temps } });
        r.surface_map = surfMap; r.gen_warnings = gen.warnings; r.homogenization = homogenization; r.thin_layers = thinReport;
        results.push(r);
      }
      continue;
    }
    const nlo = nonlinear ? (nonlinear === true ? {} : nonlinear) : null;
    if (nlo) {
      const nd = buildNumbering(grid, 'q2s').ndof, lim = nlo.max_dof ?? NONLINEAR_MAX_DOF;
      if (nd > lim) throw new Error(`mech case: study ${s.id}: nonlinear (total Lagrangian, q2s) model has ${nd} DOF, above the limit ${lim} (direct Newton solves): coarsen the mesh (mesh.max_xy_mm, mesh.thin) or raise nonlinear.max_dof explicitly`);
      if (shrinkVariants.some((v) => Object.keys(v.eigenstrain).length)) throw new Error(`mech case: study ${s.id}: cure shrinkage (eigenstrain) is not supported by the nonlinear solver`);
    }
    for (const T of temps) for (const sv of shrinkVariants) {
      progress('solve', `study ${s.id}: ${T} C`);
      if (nlo) {
        const tn = performance.now();
        const nr = solveMechNonlinear(grid, {
          resolve: resolveM, rebase: mat.rebase, stress_free_C: sf, supports: s.supports ?? mech.supports ?? 'rigid_motion', temperature: { uniform_C: T },
          resolveOpts: allowExt ? { allowExtrapolation: allowExt } : {}, ...(nlo.steps != null ? { steps: nlo.steps } : {}), ...(nlo.tol != null ? { tol: nlo.tol } : {}),
          warpage: surfaces.map((nm) => (surfMap[nm] ? { surface: surfMap[nm], _sel: modelSurface(grid, surfMap[nm].split(':')[0]) } : nm)),
        });
        const r = mechShaped({ study: s.id, type: 'thermo_elastic', T_C: T, element: 'q2s', grid, ndof: nr.num.ndof, warpage: nr.warpage, ms: performance.now() - tn,
          iterations: nr.newton.reduce((a, h) => a + h.newton, 0), solver: 'newton (total Lagrangian, direct)',
          warnings: el !== 'q2s' ? [`mech nonlinear: element q2s used (requested ${el}; the nonlinear tier has no incompatible modes)`] : [],
          extra: { nonlinear: { load_steps: nr.newton.length, newton: nr.newton.map(({ history: _h, ...h }) => h) } } });
        r.shrinkage_variant = sv.variant; r.surface_map = surfMap; r.gen_warnings = gen.warnings; r.homogenization = homogenization; r.thin_layers = thinReport;
        results.push(r);
        continue;
      }
      let x0 = null;
      if (warmStart && warm && warm.sig === sig && warm.Tsf === sf.default && Math.abs(warm.T - sf.default) > 1e-9) x0 = warm.u.map((v) => (v * (T - sf.default)) / (warm.T - sf.default));
      const r = solveMech(grid, {
        x0,
        element: el, resolve: resolveM, rebase: mat.rebase, stress_free_C: sf,
        supports: s.supports ?? mech.supports ?? 'rigid_motion', temperature: { uniform_C: T }, solver, study: s.id,
        resolveOpts: allowExt ? { allowExtrapolation: allowExt } : {}, memProbe, gmg, eigenstrain: sv.eigenstrain,
        ...(rtol != null ? { rtol } : {}), ...(maxIter != null ? { maxIter } : {}),
        warpage: surfaces.map((nm) => (surfMap[nm] ? { surface: surfMap[nm], _sel: modelSurface(grid, surfMap[nm].split(':')[0]) } : nm)),
      });
      r.T_C = T;
      r.shrinkage_variant = sv.variant;
      r.warnings.push(...shrinkWarnings);
      r.warm_start = !!x0;
      if (r.timing.solver?.solver !== 'direct') warm = { sig, u: r._u, T, Tsf: sf.default };
      r.surface_map = surfMap;
      r.gen_warnings = gen.warnings;
      r.homogenization = homogenization;
      r.thin_layers = thinReport;
      results.push(r);
    }
  }
  const targets = (c.targets ?? []).map((t) => {
    const out = { ...t, got: null, status: 'unchecked' };
    if (procIds.has(t.study)) {
      const pr = results.find((x) => x.study === t.study);
      const st = pr?.steps.find((x) => x.step === t.step);
      if (!st) { out.reason = pr ? `step ${t.step} not in the sequence` : 'study not run'; return out; }
      const w = st.warpage.find((x) => x.surface === (surface ?? t.selection));
      if (t.quantity === 'warpage_um' && w) { out.got = w.warpage_um; out.sign_convention = w.sign_convention; out.view_side = w.view_side; out.surface = w.surface; }
      else out.reason = `quantity ${t.quantity} on ${t.selection} not evaluated at step ${t.step}`;
      return out;
    }
    const cands = results.filter((x) => x.study === (t.study ?? x.study) && x.type !== 'process_sequence' && (t.T_C == null || x.T_C === t.T_C));
    const r = cands[0];
    if (cands.length > 1 && cands.every((x) => x.shrinkage_variant)) out.shrinkage_bracket = cands.map((x) => x.shrinkage_variant);
    if (!r) { out.reason = 'study not run'; return out; }
    if (t.quantity === 'warpage_um' || t.quantity === 'coplanarity_um') {
      const nm = surface ?? t.selection;
      const w = r.derived.warpage.find((x) => x.surface === (r.surface_map[nm] ?? nm));
      out.got = t.quantity === 'warpage_um' ? w.warpage_um : w.coplanarity_um;
      if (out.shrinkage_bracket) out.got_by_shrinkage = Object.fromEntries(cands.map((x) => { const ww = x.derived.warpage.find((y) => y.surface === w.surface); return [x.shrinkage_variant, t.quantity === 'warpage_um' ? ww.warpage_um : ww.coplanarity_um]; }));
      out.surface = w.surface;
      out.sign_convention = w.sign_convention;
      out.view_side = w.view_side;
    } else if (t.quantity === 'von_mises_max_MPa') {
      const re = globRe(String(t.selection ?? '*').replace(/^part:/, ''));
      let best = null;
      for (const [id, v] of Object.entries(r.derived.von_mises_per_part ?? {}))
        if (re.test(id) && (!best || v.vm_max_gp_Pa > best.v.vm_max_gp_Pa)) best = { id, v };
      if (best) { out.got = best.v.vm_max_gp_Pa / 1e6; out.part = best.id; out.flag = best.v.vm_max_gp_flag; out.node_max_MPa = best.v.vm_max_node_Pa / 1e6; out.node_flag = best.v.vm_max_node_flag; }
    } else out.reason = `quantity ${t.quantity} not evaluated by the mechanics runner`;
    return out;
  });
  return { case: c.id, family: c.family, notes: mat.notes, results, targets, total_ms: performance.now() - t0 };
}
