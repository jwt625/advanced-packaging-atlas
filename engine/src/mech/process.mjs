// Process-sequence thermo-elasticity (tranche E4; DevLog-010 A7; R1 1.9, 2.3, implications B). Lane L8.
// Steps: {id, activate: [part id | glob], deactivate: [...], stress_free_C (parts activated or switched in this step;
// default: the temperature at the start of the step), temperature: {uniform_C} (end of the step), supports?,
// materials: {map: {part id | glob: material key}}}. A material switch restarts the active part stress-free in the
// new phase (a new activation group with u_act = the current displacement; its previous stress is discarded), e.g.
// a bump layer homog:microbump:copper+void -> homog:microbump:copper+underfill at the underfill-cure step.
// Total formulation per activation group g (parts activated in the same step):
//   sigma_g = D_g (eps(u - u_act,g) - eps_th,g(T)),   eps_th,g relative to the group's stress-free temperature,
//   equilibrium  sum_g K_g u = sum_g (K_g u_act,g + f_th,g(T)).
// u_act,g is the displacement field when the group was activated: on nodes shared with already active parts it is
// the current solution, on the group's own new nodes the minimum-energy elastic extension of the group with the
// shared nodes held (the limit of COMSOL's soft inactive material, 1e-5 stiffness scaling [R1 1.9]). So the elastic
// strain is reset at activation (stress-free activation), a deactivated group leaves the sum (debond, grinding
// removal), and inactive parts carry no DOFs (DOF dropping, A7).
// Linear elastic, temperature-independent within a step's solve (D at the step end temperature); viscoelastic EMC
// and plasticity are E8.
// License: GPL-3.0-or-later.

import { globRegExp } from '../grid/index.mjs';
import { buildNumbering, nodeCounts } from './numbering.mjs';
import { createMechMaterials, C_TO_K } from './materials.mjs';
import { buildConstraints, selectionNodes } from './supports.mjs';
import { assembleSystem, operatorProvider, makeLoadOf } from './assemble.mjs';
import { solveDirect } from './solve.mjs';
import { recoverStress, warpage, probeStress } from './post.mjs';

/** Grid copy whose parts in `matOf` (part index -> material key) use the given material keys. */
function withMaterials(grid, matOf) {
  const materials = grid.materials.slice(), idx = new Map(materials.map((m, i) => [m, i]));
  const partMat = new Int32Array(grid.parts.length).fill(-1);
  for (const [p, key] of matOf) {
    if (!idx.has(key)) { idx.set(key, materials.length); materials.push(key); }
    partMat[p] = idx.get(key);
  }
  const cellMat = Int32Array.from(grid.cellMat);
  for (let c = 0; c < cellMat.length; c++) { const p = grid.cellPart[c]; if (p >= 0 && partMat[p] >= 0) cellMat[c] = partMat[p]; }
  return { ...grid, materials, cellMat };
}

/** Shallow copy of a grid with only the given parts' cells active. */
function maskedGrid(grid, active) {
  const cellPart = new Int32Array(grid.cellPart.length).fill(-1);
  for (let c = 0; c < cellPart.length; c++) { const p = grid.cellPart[c]; if (p >= 0 && active.has(p)) cellPart[c] = p; }
  return { ...grid, cellPart };
}

/** Selection of the z faces of part p that face an inactive cell or the model boundary on a masked grid. */
export function partZFaces(g, partIndex, side) {
  const { nx, ny, nz, cellPart } = g;
  const cells = [];
  const dk = side === 'bottom' ? -1 : 1;
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] !== partIndex) continue;
        const kk = k + dk;
        if (kk < 0 || kk >= nz || cellPart[i + nx * (j + ny * kk)] < 0) cells.push(c);
      }
  return { groups: [{ axis: 'z', side: side === 'bottom' ? '-' : '+', cells: Int32Array.from(cells) }] };
}

const matchSet = (grid, list = []) => {
  const out = new Set();
  for (const g of list) {
    const re = globRegExp(g);
    let any = false;
    grid.parts.forEach((p, i) => { if (re.test(p.id)) { out.add(i); any = true; } });
    if (!any) throw new Error(`mech process: ${g} matches no part`);
  }
  return out;
};

/**
 * Run a process sequence on one grid that contains every part used by any step.
 * @param {object} grid
 * @param {{steps: object[], element?, resolve, rebase?, supports?, solver?, resolveOpts?, warpage?: string[]}} o
 *   warpage entries: `bottom:<part>` / `top:<part>`, evaluated on the faces exposed at each step.
 * @returns {{steps: object[]}}
 */
export function solveProcessSequence(grid, o) {
  const { steps, element = 'q1im', resolve, rebase = null, supports = 'rigid_motion', resolveOpts = {}, warpage: wsurf = [], ordering = 'auto' } = o;
  if (!Array.isArray(steps) || !steps.length) throw new Error('mech process: steps (non-empty list) required');
  const { N } = nodeCounts(grid);
  const active = new Set();
  const groupOf = new Map(); // part -> group index
  const groups = []; // {step, parts:Set, Tsf_C, uAct: Float64Array(3 N) over extended ids}
  let U = new Float64Array(3 * N), T_prev = null;
  const matOf = new Map(); // part -> material key override (steps[].materials.map)
  const eigOf = new Map(); // part -> eigenstrain spec (steps[].eigenstrain)
  const eigMap = (parts) => Object.fromEntries([...parts].filter((p) => eigOf.has(p)).map((p) => [grid.parts[p].id, eigOf.get(p)]));
  let matGrid = grid;
  const out = [];
  steps.forEach((st, k) => {
    const t0 = performance.now();
    const where = `step ${st.id ?? k}`;
    for (const key of Object.keys(st)) if (!['id', 'activate', 'deactivate', 'stress_free_C', 'temperature', 'supports', 'materials', 'eigenstrain', 'note'].includes(key)) throw new Error(`mech process: ${where}: unknown key ${key}`);
    if (st.materials != null) for (const key of Object.keys(st.materials)) if (key !== 'map') throw new Error(`mech process: ${where}: materials: unknown key ${key} (map)`);
    const T_end = st.temperature?.uniform_C;
    if (!Number.isFinite(T_end)) throw new Error(`mech process: ${where}: temperature.uniform_C required`);
    const T_start = T_prev ?? (Number.isFinite(st.stress_free_C) ? st.stress_free_C : T_end);
    // deactivation first (removed parts leave the sum), then activation
    for (const p of matchSet(grid, st.deactivate)) { active.delete(p); groupOf.delete(p); }
    // per-step material switch: active parts restart stress-free in the new phase (new group, u_act = current u)
    const switched = [];
    for (const [glob, key] of Object.entries(st.materials?.map ?? {})) {
      for (const p of matchSet(grid, [glob])) {
        matOf.set(p, key);
        if (active.has(p)) switched.push(p);
      }
    }
    if (st.materials?.map) matGrid = withMaterials(grid, matOf);
    if (switched.length) {
      const gi = groups.length;
      groups.push({ step: st.id ?? k, parts: new Set(switched), Tsf_C: Number.isFinite(st.stress_free_C) ? st.stress_free_C : T_start, uAct: Float64Array.from(U), switched: true });
      for (const p of switched) groupOf.set(p, gi);
    }
    const add = [...matchSet(grid, st.activate)].filter((p) => !active.has(p));
    // eigenstrain of this step (e.g. cure shrinkage) for the parts activated or switched in it
    for (const [glob, spec] of Object.entries(st.eigenstrain ?? {}))
      for (const p of matchSet(grid, [glob])) {
        if (!add.includes(p) && !switched.includes(p)) throw new Error(`mech process: ${where}: eigenstrain ${glob} names ${grid.parts[p].id}, which is not activated or switched in this step`);
        eigOf.set(p, spec);
      }
    const prevActive = new Set(active);
    let extension = null;
    if (add.length) {
      const Tsf = Number.isFinite(st.stress_free_C) ? st.stress_free_C : T_start;
      const gi = groups.length;
      const gset = new Set(add);
      groups.push({ step: st.id ?? k, parts: gset, Tsf_C: Tsf, uAct: new Float64Array(3 * N) });
      for (const p of add) { active.add(p); groupOf.set(p, gi); }
      extension = extend(matGrid, groups[gi], prevActive, U, { element, resolve, rebase, resolveOpts, ordering });
    }
    // live groups (with at least one active part)
    const live = groups.map((g, gi) => ({ g, gi, parts: new Set([...g.parts].filter((p) => groupOf.get(p) === gi)) })).filter((x) => x.parts.size);
    const G = maskedGrid(matGrid, active);
    const num = buildNumbering(G, element);
    const perPart = {};
    for (const { g, parts } of live) for (const p of parts) perPart[grid.parts[p].id] = g.Tsf_C;
    const mats = createMechMaterials(G, { resolve, rebase, stressFreeC: { default: T_end, per_part: perPart }, resolveOpts, eigenstrain: eigMap(active) });
    const cons = buildConstraints(G, num, { supports: st.supports ?? supports });
    const prov = operatorProvider(G, element, mats);
    const temp = { uniform_K: T_end + C_TO_K };
    const sys = assembleSystem(G, num, mats, temp, cons, prov);
    // activation offsets: + K_e u_act,g on each cell of group g
    const nen = num.nen, loadOf = makeLoadOf(G, num, mats, temp, prov), ue = new Float64Array(3 * nen);
    for (let q = 0; q < num.cells.length; q++) {
      const c = num.cells[q], g = groups[groupOf.get(G.cellPart[c])];
      let any = false;
      for (let a = 0; a < nen; a++) {
        const id = num.ext[num.conn[q * nen + a]];
        for (let d = 0; d < 3; d++) { ue[3 * a + d] = g.uAct[3 * id + d]; if (ue[3 * a + d] !== 0) any = true; }
      }
      if (!any) continue;
      const { op } = loadOf(q, c), n3 = 3 * nen;
      for (let r = 0; r < n3; r++) {
        const dof = 3 * num.conn[q * nen + ((r / 3) | 0)] + (r % 3);
        if (cons.fixed[dof]) continue;
        let s = 0;
        for (let j = 0; j < n3; j++) s += op.K[r * n3 + j] * ue[j];
        sys.rhs[dof] += s;
      }
    }
    const sol = solveDirect(sys, num, G, { ordering: ordering === 'auto' ? (element === 'q2s' ? 'nd_xy' : 'nd') : ordering });
    U = new Float64Array(3 * N);
    for (let n = 0; n < num.nn; n++) { const id = num.ext[n]; for (let d = 0; d < 3; d++) U[3 * id + d] = sol.x[3 * n + d]; }
    // stresses per live group with u - u_act,g
    const vm = {}, groupFields = [];
    for (const { g, parts } of live) {
      const Gg = maskedGrid(matGrid, parts), ng = buildNumbering(Gg, element);
      const per = {};
      for (const p of parts) per[grid.parts[p].id] = g.Tsf_C;
      const mg = createMechMaterials(Gg, { resolve, rebase, stressFreeC: { default: g.Tsf_C, per_part: per }, resolveOpts, eigenstrain: eigMap(parts) });
      const urel = new Float64Array(ng.ndof);
      for (let n = 0; n < ng.nn; n++) { const id = ng.ext[n]; for (let d = 0; d < 3; d++) urel[3 * n + d] = U[3 * id + d] - g.uAct[3 * id + d]; }
      const st2 = recoverStress(Gg, ng, mg, temp, operatorProvider(Gg, element, mg), urel);
      Object.assign(vm, st2.perPart);
      groupFields.push({ parts: [...parts].map((p) => grid.parts[p].id), grid: Gg, _num: ng, fields: st2.fields });
    }
    // warpage on exposed faces of named parts
    const warp = [];
    for (const s of wsurf) {
      const m = /^(bottom|top):(.+)$/.exec(s);
      if (!m) throw new Error(`mech process: warpage surface ${s} must be bottom:<part> or top:<part>`);
      const pi = grid.parts.findIndex((p) => p.id === m[2]);
      if (pi < 0 || !active.has(pi)) continue;
      const sel = partZFaces(G, pi, m[1]);
      if (!sel.groups[0].cells.length) continue;
      warp.push(warpage(G, num, sol.x, s, { sel }));
    }
    out.push({
      step: st.id ?? k, T_start_C: T_start, T_end_C: T_end, active: [...active].map((p) => grid.parts[p].id),
      activated: add.map((p) => grid.parts[p].id), switched: switched.map((p) => ({ part: grid.parts[p].id, material: matOf.get(p) })), groups: live.map(({ g, parts }) => ({ step: g.step, Tsf_C: g.Tsf_C, parts: [...parts].map((p) => grid.parts[p].id) })),
      extension, dof: num.ndof, warpage: warp, von_mises_per_part: vm, ms: performance.now() - t0,
      _U: U, _u: sol.x, _grid: G, _num: num, _groups: groupFields,
    });
    T_prev = T_end;
  });
  return { steps: out };
}

/**
 * Minimum-energy extension of a newly activated group: the group's stiffness on its own nodes, shared nodes held at
 * the current displacement, no load. Groups without shared nodes (nothing active yet, or a separate body) start at 0.
 */
function extend(grid, g, prevActive, U, { element, resolve, rebase, resolveOpts, ordering }) {
  if (!prevActive.size) return { shared_nodes: 0, note: 'first activation: u_act = 0' };
  const Gn = maskedGrid(grid, g.parts), num = buildNumbering(Gn, element);
  const Gp = maskedGrid(grid, prevActive), nump = buildNumbering(Gp, element);
  const shared = new Uint8Array(num.nn);
  let ns = 0;
  for (let n = 0; n < num.nn; n++) if (nump.compact[num.ext[n]] >= 0) { shared[n] = 1; ns++; }
  if (!ns) return { shared_nodes: 0, note: 'not attached to the active parts: u_act = 0 (separate body)' };
  const fixed = new Uint8Array(num.ndof), value = new Float64Array(num.ndof);
  for (let n = 0; n < num.nn; n++) if (shared[n]) for (let d = 0; d < 3; d++) { fixed[3 * n + d] = 1; value[3 * n + d] = U[3 * num.ext[n] + d]; }
  // mirror planes hold the normal component (the extension must satisfy the same symmetry as the solution;
  // otherwise the next solve strains the new group and activation is not stress-free)
  const sym = grid.symmetry ?? 'none';
  for (const [ax, on] of [['x', sym === 'half_x' || sym === 'quarter'], ['y', sym === 'half_y' || sym === 'quarter']]) {
    if (!on || !Gn.selections[`sym:${ax}`]) continue;
    for (const n of selectionNodes(Gn, num, Gn.selections[`sym:${ax}`])) { const d = 3 * n + (ax === 'x' ? 0 : 1); if (!fixed[d]) { fixed[d] = 1; value[d] = 0; } }
  }
  const per = {};
  for (const p of g.parts) per[grid.parts[p].id] = g.Tsf_C;
  const mats = createMechMaterials(Gn, { resolve, rebase, stressFreeC: { default: g.Tsf_C, per_part: per }, resolveOpts });
  // temperature = Tsf: no thermal strain, pure extension
  const sys = assembleSystem(Gn, num, mats, { uniform_K: g.Tsf_C + C_TO_K }, { fixed, value }, operatorProvider(Gn, element, mats));
  const r = solveDirect(sys, num, Gn, { ordering: ordering === 'auto' ? (element === 'q2s' ? 'nd_xy' : 'nd') : ordering });
  for (let n = 0; n < num.nn; n++) { const id = num.ext[n]; for (let d = 0; d < 3; d++) g.uAct[3 * id + d] = r.x[3 * n + d]; }
  return { shared_nodes: ns, new_nodes: num.nn - ns };
}

/** Part-averaged stress (Voigt, Pa) of a process step at the corner node nearest to xyz_m (its group's field). */
export function probeStepStress(step, partId, xyz_m) {
  const g = step._groups.find((x) => x.parts.includes(partId));
  if (!g) throw new Error(`mech process: part ${partId} not active in step ${step.step}`);
  return probeStress(g, partId, xyz_m);
}
