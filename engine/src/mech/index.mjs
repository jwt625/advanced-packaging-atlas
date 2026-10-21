// Linear thermo-elasticity on the rectilinear package grid (tranche E2; DevLog-010 A3-A6; SPEC sections 1, 3-5).
// One-way coupling (A5): uniform temperature or the nodal temperature field of a thermal result (SPEC corner nodes,
// K); thermal strain from the secant CTE re-based to each part's stress-free temperature (A6).
// solveMech(grid, opts) -> SPEC section 5 result with fields.u_m (3 per SPEC corner node, interleaved; zero on
// inactive nodes, see fields.node_active), derived warpage (JEITA ED-7306, sign convention, surface and view side
// stated), coplanarity, curvature fits, max von Mises per part with the singular-corner flag, reactions.
// License: GPL-3.0-or-later.

import { buildNumbering, nodeCounts } from './numbering.mjs';
import { createMechMaterials, C_TO_K } from './materials.mjs';
import { buildConstraints } from './supports.mjs';
import { assembleSystem, operatorProvider, makeLoadOf } from './assemble.mjs';
import { assembleBlockStencil, buildBlockMG, blockMGPrecond, applyBlock, fromPadded, toPadded, buildQ2sPMG } from './gmg.mjs';
import { assembleHalfStencil, applyHalf, fullStencilF32, compressHierarchy, buildHalfMG } from './lowmem.mjs';
import { buildBlockMG as buildBlockMGL1, blockMGPrecond as blockMGPrecondL1 } from '../la/block.mjs';
import { solveDirect, pcg, jacobi, blockJacobi, csrApply } from './solve.mjs';
import { recoverStress, reactions, warpage, curvatureFit } from './post.mjs';
import { ELEMENT_TYPES } from './elements.mjs';

export { ELEMENT_TYPES } from './elements.mjs';
export { warpage, curvatureFit, classifyCorner, probeStress, probeU, JEITA_SIGN_CONVENTION } from './post.mjs';
export { explicitResolver, explicitRebase } from './materials.mjs';

export const MECH_SOLVERS = Object.freeze(['auto', 'direct', 'pcg_gmg', 'pcg_block_jacobi', 'pcg_jacobi']);
/** auto: direct up to this many DOFs (R2 8.3: direct practical to ~1e5 elasticity DOF), else PCG + GMG. */
export const AUTO_DIRECT_MAX_DOF = 100000;
/** pcg_gmg storage auto: low-memory operator (f64 half stencil + f32 preconditioner) above this many DOFs. */
export const LOWMEM_DOF = 300000;

/**
 * @param {object} grid SPEC section 3 grid (grid/index.mjs buildGrid)
 * @param {object} opts
 * @param {string} [opts.element='q1im'] q1im (default, A3 bake-off winner) | q2s | q1 (reference)
 * @param {Function} opts.resolve materials resolver (SPEC section 4)
 * @param {Function} [opts.rebase] materials rebaseSecantCte
 * @param {{default: number, per_part?: object}} opts.stress_free_C
 * @param {object} [opts.orientation] {part id | material key: {rotations: [{axis, deg}]} | {rotation_z_deg}}
 * @param {string} [opts.supports='rigid_motion'] rigid_motion | symmetry | none
 * @param {object[]} [opts.bcs] explicit displacement bcs (supports.mjs)
 * @param {{uniform_C?: number, uniform_K?: number, T_K?: Float64Array}} opts.temperature
 * @param {string} [opts.solver='auto']
 * @param {number} [opts.rtol=1e-10] PCG relative residual
 * @param {Array<string|object>} [opts.warpage] surfaces (selection names) for JEITA warpage
 * @param {object[]} [opts.curvature] curvature fits {z_m, frac}
 * @param {boolean} [opts.stress=true] recover stresses
 */
export function solveMech(grid, opts = {}) {
  const tAll = performance.now();
  const {
    element = 'q1im', resolve, rebase = null, stress_free_C, orientation = {}, supports = 'rigid_motion', bcs = [],
    temperature, solver = 'auto', rtol = 1e-10, maxIter = 3000, warpage: wsurf = [], curvature = [], stress = true,
    keepGauss = false, ordering = 'auto', resolveOpts = {}, study = 's_mech', gmg: gmgOpts = {}, eigenstrain = {}, x0 = null,
  } = opts;
  if (!ELEMENT_TYPES.includes(element)) throw new Error(`mech: element ${element} not in ${ELEMENT_TYPES.join(' | ')}`);
  if (!MECH_SOLVERS.includes(solver)) throw new Error(`mech: solver ${solver} not in ${MECH_SOLVERS.join(' | ')}`);
  const warnings = [];
  // optional memory probe (Node: process.memoryUsage; absent in the browser)
  const memLog = [];
  const mem = (stage) => {
    if (!opts.memProbe) return;
    const m = globalThis.process?.memoryUsage?.();
    if (m) memLog.push({ stage, rss_MB: Math.round(m.rss / 2 ** 20), heap_MB: Math.round(m.heapUsed / 2 ** 20), arrayBuffers_MB: Math.round(m.arrayBuffers / 2 ** 20) });
  };
  mem('start');
  if (element === 'q1') warnings.push('mech: element q1 (plain trilinear) locks in bending at thin-layer aspect ratios; bake-off reference only');
  const temp = normalizeTemperature(grid, temperature);
  const t0 = performance.now();
  const num = buildNumbering(grid, element);
  const mats = createMechMaterials(grid, { resolve, rebase, stressFreeC: stress_free_C, orientation, resolveOpts, eigenstrain });
  const cons = buildConstraints(grid, num, { supports, bcs });
  const provider = operatorProvider(grid, element, mats);
  const t1 = performance.now();
  let chosen = solver;
  if (solver === 'auto') chosen = num.ndof <= AUTO_DIRECT_MAX_DOF ? 'direct' : 'pcg_gmg';
  // assembly + solve in an inner scope so the operator, hierarchy and factor are garbage before post-processing
  const { u, solveInfo, t2 } = (() => {
    const stencilPath = chosen === 'pcg_gmg' && element !== 'q2s';
    const { impl = 'l1', storage = 'auto', ...mgo } = gmgOpts;
    // storage: f64 (full f64 stencil, L1 or L8 hierarchy) | lowmem (f64 half stencil, half-stencil fine level, f32
    // coarse levels; L8) | f32full (f64 half stencil for the apply, f32 full copy for the L1 hierarchy)
    const lowmem = stencilPath && (storage === 'lowmem' || storage === 'f32full' || (storage === 'auto' && num.ndof > LOWMEM_DOF));
    const lowKind = storage === 'f32full' ? 'f32full' : 'lowmem';
    let sys = null, bs = null;
    const loadOf = () => makeLoadOf(grid, num, mats, temp, provider);
    if (lowmem) bs = assembleHalfStencil(grid, num, cons, loadOf());
    else if (stencilPath) bs = assembleBlockStencil(grid, num, mats, temp, cons, provider, loadOf());
    else sys = assembleSystem(grid, num, mats, temp, cons, provider);
    const t2 = performance.now();
    mem('assembled');
    if (chosen === 'direct') {
      const r = solveDirect(sys, num, grid, { ordering: ordering === 'auto' ? (element === 'q2s' ? 'nd_xy' : 'nd') : ordering });
      return { u: r.x, solveInfo: { solver: 'direct', ...r.timing, nnzA: sys.pat.nnz }, t2 };
    }
    let precond, mgStats = null, apply, rhs;
    const ts = performance.now();
    if (lowmem && lowKind === 'lowmem') {
      const mg = buildHalfMG(bs.op, grid.xs, grid.ys, mgo);
      mem('hierarchy');
      precond = mg.precond;
      mgStats = { storage: 'lowmem (f64 half-stencil operator and fine smoother, f32 coarse levels)', ...mg.stats };
      apply = (x, y) => applyHalf(bs.op, x, y);
      rhs = bs.rhs;
    } else if (lowmem) {
      const op32 = fullStencilF32(bs.op);
      const mg = buildBlockMGL1(op32, grid.xs, grid.ys, grid.zs, mgo);
      const saved = compressHierarchy(mg);
      mem('hierarchy');
      precond = (r, z) => blockMGPrecondL1(mg, r, z);
      mgStats = { impl, storage: 'lowmem (f64 half-stencil operator, f32 preconditioner)', f32_saved_MB: Math.round(saved / 2 ** 20), ...mg.stats, setup_ms: mg.setup_ms };
      apply = (x, y) => applyHalf(bs.op, x, y);
      rhs = bs.rhs;
    } else if (stencilPath) {
      // default: L1's block hierarchy (la/block.mjs); impl 'l8' = this module's gmg.mjs (cross-check, same algorithm)
      if (impl === 'l1') {
        const mg = buildBlockMGL1(bs.op, grid.xs, grid.ys, grid.zs, mgo);
        precond = (r, z) => blockMGPrecondL1(mg, r, z);
        mgStats = { impl, ...mg.stats, setup_ms: mg.setup_ms };
      } else {
        const mg = buildBlockMG(bs.op, grid.xs, grid.ys, mgo);
        precond = blockMGPrecond(mg);
        mgStats = { impl, ...mg.stats };
      }
      apply = (x, y) => applyBlock(bs.op, x, y);
      rhs = bs.rhs;
    } else {
      if (chosen === 'pcg_jacobi') precond = jacobi(sys);
      else if (chosen === 'pcg_block_jacobi') precond = blockJacobi(sys);
      else {
        const m = buildQ2sPMG(grid, num, sys, gmgOpts);
        precond = m.precond;
        mgStats = m.stats;
      }
      apply = csrApply(sys);
      rhs = sys.rhs;
    }
    const setup_ms = performance.now() - ts;
    const tp = performance.now();
    // warm start (x0: compact DOF vector, e.g. the previous temperature's solution scaled by the dT ratio)
    let xs0 = null;
    if (x0) {
      if (x0.length !== num.ndof) throw new Error(`mech: x0 has ${x0.length} entries, the model has ${num.ndof} DOFs`);
      xs0 = stencilPath ? toPadded(bs.op, num, x0) : Float64Array.from(x0);
      // energy-optimal scaling of the guess (Galerkin on span{x0}): alpha = x0.b / x0.A x0
      const Ax = new Float64Array(xs0.length);
      apply(xs0, Ax);
      let xb = 0, xAx = 0;
      for (let i = 0; i < xs0.length; i++) { xb += xs0[i] * rhs[i]; xAx += xs0[i] * Ax[i]; }
      if (xAx > 0) { const al = xb / xAx; for (let i = 0; i < xs0.length; i++) xs0[i] *= al; }
    }
    const r = pcg(apply, precond, rhs, xs0, { rtol, maxIter, relativeTo: 'b' });
    if (!r.converged) warnings.push(`mech: ${chosen} not converged: relres ${r.relres.toExponential(2)} after ${r.iterations} iterations`);
    mem('pcg');
    const uu = stencilPath ? fromPadded(bs.op, num, r.x) : r.x;
    return { u: uu, t2, solveInfo: { solver: chosen, setup_ms, pcg_ms: performance.now() - tp, iterations: r.iterations, relres: r.relres, converged: r.converged, mg: mgStats } };
  })();
  const t3 = performance.now();
  mem('solved');
  // fields on the SPEC corner nodes
  const { Nc } = nodeCounts(grid);
  const u_m = new Float64Array(3 * Nc), node_active = new Uint8Array(Nc);
  let u_mid_m = null;
  if (element === 'q2s') u_mid_m = new Float64Array(3 * (nodeCounts(grid).N - Nc));
  for (let n = 0; n < num.nn; n++) {
    const id = num.ext[n];
    if (id < Nc) {
      u_m[3 * id] = u[3 * n]; u_m[3 * id + 1] = u[3 * n + 1]; u_m[3 * id + 2] = u[3 * n + 2];
      node_active[id] = 1;
    } else {
      const m = id - Nc;
      u_mid_m[3 * m] = u[3 * n]; u_mid_m[3 * m + 1] = u[3 * n + 1]; u_mid_m[3 * m + 2] = u[3 * n + 2];
    }
  }
  const fields = { u_m, node_active, ...(u_mid_m ? { u_mid_m } : {}) };
  const derived = {};
  let st = null;
  if (stress) {
    st = recoverStress(grid, num, mats, temp, provider, u, { keepGauss });
    Object.assign(fields, st.fields);
    derived.von_mises_per_part = st.perPart;
  }
  mem('stress');
  const rx = reactions(grid, num, mats, temp, provider, u, cons);
  derived.reactions = { max_abs_N: rx.max_abs_N, sum_N: rx.sum_N, points: cons.points.map((p) => ({ xyz_m: p.xyz_m, dofs: p.dofs, why: p.why })) };
  derived.warpage = wsurf.map((s) => (typeof s === 'string' ? warpage(grid, num, u, s) : warpage(grid, num, u, s.surface, { sel: s._sel ?? null })));
  derived.curvature = curvature.map((c) => curvatureFit(grid, num, u, c));
  // CD6: extrapolated material data, per material key with the parts that use it
  const ext = [];
  mats.list.forEach((m, q) => {
    const e = m.extrapolated();
    if (!e.length) return;
    const parts = new Set();
    for (let c = 0; c < mats.cellMM.length; c++) if (mats.cellMM[c] === q) parts.add(grid.parts[grid.cellPart[c]].id);
    ext.push({ material: m.key, Tsf_K: m.Tsf_K, parts: [...parts], flags: e });
    warnings.push(`mech: material ${m.key} extrapolated beyond its data (${e.map((x) => x.property).join(', ')}) in ${[...parts].slice(0, 5).join(', ')}${parts.size > 5 ? ', ...' : ''}`);
  });
  derived.extrapolated = ext;
  let umax = 0;
  for (let i = 0; i < u.length; i++) umax = Math.max(umax, Math.abs(u[i]));
  derived.max_abs_u_m = umax;
  const t4 = performance.now();
  return {
    study,
    type: 'thermo_elastic',
    element,
    grid,
    temperature: temp.uniform_K != null ? { uniform_K: temp.uniform_K } : { field: 'T_K per SPEC node' },
    supports: { kind: supports, description: cons.description },
    fields,
    derived,
    stats: { dof: num.ndof, nodes: num.nn, cells: num.cells.length, fixed_dof: cons.nfixed, nnzA: solveInfo.nnzA ?? null, op_cache: provider.stats() },
    timing: {
      setup_ms: t1 - t0, assemble_ms: t2 - t1, solve_ms: t3 - t2, post_ms: t4 - t3, total_ms: t4 - tAll,
      iterations: solveInfo.iterations ?? 0, nnzL: solveInfo.nnzL ?? null, solver: solveInfo,
    },
    warnings,
    ...(opts.memProbe ? { memory: memLog } : {}),
    _u: u,
    _num: num,
  };
}

function normalizeTemperature(grid, t) {
  if (!t) throw new Error('mech: temperature is required ({uniform_C} | {uniform_K} | {T_K: per-node field})');
  if (t.uniform_C != null) return { uniform_K: t.uniform_C + C_TO_K };
  if (t.uniform_K != null) return { uniform_K: t.uniform_K };
  const f = t.T_K ?? t.nodal_K;
  const Nc = (grid.nx + 1) * (grid.ny + 1) * (grid.nz + 1);
  if (!(f && f.length === Nc)) throw new Error(`mech: temperature field T_K must have one value per SPEC node (${Nc})`);
  return { nodal_K: f };
}
