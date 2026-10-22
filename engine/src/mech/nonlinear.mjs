// Geometrically nonlinear thermo-elasticity (wave 4 item 4): total Lagrangian, Green-Lagrange strain,
// St. Venant-Kirchhoff material S = D (E - eps_th) (small strains, large rotations), q2s elements (27 Gauss points),
// load-stepped Newton on the temperature change (lambda: T = Tsf + lambda (T_end - Tsf)). Lane L8.
// Residual R(u) = int B_NL^T S dV0 = 0 (no external loads; thermal strain in the reference configuration);
// tangent K = int B_NL^T D B_NL dV0 + int (grad N_a . S grad N_b) I_3 dV0. Supports as solveMech (3-2-1 points or
// mirror planes stay valid under large rotation: they constrain displacement components only). Direct solver per
// Newton iteration (skeleton; models must be coarse in-plane: q2s is accurate per DOF on plates, bake-off).
// Lane L20 (2026-10-21): one symbolic analysis for all tangent solves (Cholesky, LDL^T fallback with inertia); stability
// of every converged load step (negative tangent pivots); branch 'stable' (default) switches past a bifurcation to the
// stable branch (inverse iteration for the negative-curvature mode, energy minimisation along it, energy-descent
// Newton with a positive definite shift), branch 'follow' stays on the unstable path with a warning; gate vs the
// scikit-fem total-Lagrangian reference (validation/reference results PLATE-NL). Opt-in: secant predictor and a slope
// line search (measured: neither is a safe default, see DevLog/lanes/L20-engine-open-items.md).
// License: GPL-3.0-or-later.

import { buildElementPattern, entryIndex, analyze, matVec, SparseCholesky } from '../la/sparse.mjs';
import { SupernodalLDLT } from '../la/ldlt.mjs';
import { buildNumbering } from './numbering.mjs';
import { createMechMaterials, C_TO_K } from './materials.mjs';
import { buildConstraints } from './supports.mjs';
import { expandPattern, operatorProvider } from './assemble.mjs';
import { reference, interpT } from './elements.mjs';
import { pcg, csrApply, nodeOrder, expandPerm } from './solve.mjs';
import { buildQ2sPMG } from './gmg.mjs';
import { warpage } from './post.mjs';

/**
 * @param {object} grid
 * @param {object} o {resolve, rebase, stress_free_C, supports, bcs, temperature: {uniform_C}, steps (load steps,
 *   default 10), tol (relative residual, default 1e-9), maxNewton (default 20), warpage, resolveOpts, linear ('auto' |
 *   'direct' | 'pcg'), branch ('stable' | 'follow'), stability (default true), predictor ('none' | 'secant'),
 *   lineSearch ('none' | 'slope'), maxDescent (default 40), onIter, onStep}
 * @returns {{u, num, grid, newton: [{step, T_C, newton, relres, history, lam, negative_pivots, stable, switched?,
 *   perturbed_pivots?}], bifurcation: [{step, T_C, negative_pivots, branch, attempts?, switched?}], warnings: string[],
 *   stats, warpage}} (switched and perturbed_pivots on every step whose stability was checked)
 */
export function solveMechNonlinear(grid, o) {
  const { resolve, rebase = null, stress_free_C, supports = 'rigid_motion', bcs = [], temperature, steps = 10, tol = 1e-9, maxNewton = 20, warpage: wsurf = [], resolveOpts = {}, linear = 'auto', onIter = null, onStep = null, onTangent = null, lineSearch: lsMode = 'none', lsMax = 6, predictor = 'none', stability = true, branch = 'stable', maxDescent = 40 } = o;
  const element = 'q2s';
  const num = buildNumbering(grid, element);
  const mats = createMechMaterials(grid, { resolve, rebase, stressFreeC: stress_free_C, resolveOpts });
  const cons = buildConstraints(grid, num, { supports, bcs });
  const prov = operatorProvider(grid, element, mats);
  const ref = reference(element), ng = ref.ng, nen = 20, n3 = 60, ns = ref.ns;
  const Tend = temperature.uniform_C + C_TO_K, Tsf = stress_free_C.default + C_TO_K;
  const nca = num.cells.length;
  const ops = Array.from(num.cells, (c) => prov.get(c, Tend)); // D at the end temperature (linear-elastic material)
  const patN = buildElementPattern(num.nn, num.conn, nen), pat = expandPattern(patN), rp = patN.rowptr;
  const { fixed } = cons;
  const u = new Float64Array(num.ndof);
  const ue = new Float64Array(n3), Ke = new Float64Array(n3 * n3), fe = new Float64Array(n3), eth = new Float64Array(6);
  const dN = new Float64Array(3 * nen), B = new Float64Array(6 * n3), S = new Float64Array(6), Ev = new Float64Array(6);
  const assemble = (T_K, withK, withGeo = true) => {
    const val = withK ? new Float64Array(pat.nnz) : null, R = new Float64Array(num.ndof);
    let energy = 0;
    for (let q = 0; q < nca; q++) {
      const op = ops[q], mat = mats.list[op.mm], D = op.D;
      const [hx, hy, hz] = op.h, sc = [2 / hx, 2 / hy, 2 / hz], V8 = (hx * hy * hz) / 8;
      for (let a = 0; a < nen; a++) { const n = num.conn[q * nen + a]; ue[3 * a] = u[3 * n]; ue[3 * a + 1] = u[3 * n + 1]; ue[3 * a + 2] = u[3 * n + 2]; }
      mat.epsTh(T_K, eth);
      fe.fill(0);
      if (withK) Ke.fill(0);
      for (let g = 0; g < ng; g++) {
        const o0 = g * 3 * ns, w = ref.gpW[g] * V8;
        for (let a = 0; a < nen; a++) for (let p = 0; p < 3; p++) dN[3 * a + p] = ref.dNs[o0 + 3 * a + p] * sc[p];
        // F = I + grad u (reference gradient)
        const F = [1, 0, 0, 0, 1, 0, 0, 0, 1];
        for (let a = 0; a < nen; a++) for (let i = 0; i < 3; i++) for (let p = 0; p < 3; p++) F[3 * i + p] += ue[3 * a + i] * dN[3 * a + p];
        // Green-Lagrange (Voigt, engineering shear): E = (F^T F - I) / 2
        const C = (p, r) => F[p] * F[r] + F[3 + p] * F[3 + r] + F[6 + p] * F[6 + r];
        Ev[0] = 0.5 * (C(0, 0) - 1); Ev[1] = 0.5 * (C(1, 1) - 1); Ev[2] = 0.5 * (C(2, 2) - 1);
        Ev[3] = C(1, 2); Ev[4] = C(0, 2); Ev[5] = C(0, 1);
        for (let I = 0; I < 6; I++) { let s = 0; for (let J = 0; J < 6; J++) s += D[6 * I + J] * (Ev[J] - eth[J]); S[I] = s; }
        for (let I = 0; I < 6; I++) energy += 0.5 * w * S[I] * (Ev[I] - eth[I]);
        // B_NL (6 x 60)
        for (let a = 0; a < nen; a++) {
          const d1 = dN[3 * a], d2 = dN[3 * a + 1], d3 = dN[3 * a + 2];
          for (let i = 0; i < 3; i++) {
            const c = 3 * a + i, Fi1 = F[3 * i], Fi2 = F[3 * i + 1], Fi3 = F[3 * i + 2];
            B[c] = Fi1 * d1; B[n3 + c] = Fi2 * d2; B[2 * n3 + c] = Fi3 * d3;
            B[3 * n3 + c] = Fi2 * d3 + Fi3 * d2; B[4 * n3 + c] = Fi1 * d3 + Fi3 * d1; B[5 * n3 + c] = Fi1 * d2 + Fi2 * d1;
          }
        }
        for (let c = 0; c < n3; c++) { let s = 0; for (let I = 0; I < 6; I++) s += B[I * n3 + c] * S[I]; fe[c] += w * s; }
        if (withK) {
          // material part: B^T D B
          const DB = new Float64Array(6 * n3);
          for (let I = 0; I < 6; I++) for (let c = 0; c < n3; c++) { let s = 0; for (let J = 0; J < 6; J++) s += D[6 * I + J] * B[J * n3 + c]; DB[I * n3 + c] = s; }
          for (let r = 0; r < n3; r++) for (let c = r; c < n3; c++) { let s = 0; for (let I = 0; I < 6; I++) s += B[I * n3 + r] * DB[I * n3 + c]; Ke[r * n3 + c] += w * s; }
          // geometric part: (grad N_a . S grad N_b) I
          if (!withGeo) continue;
          const St = [S[0], S[5], S[4], S[5], S[1], S[3], S[4], S[3], S[2]];
          for (let a = 0; a < nen; a++) {
            const ga = [dN[3 * a], dN[3 * a + 1], dN[3 * a + 2]];
            const Sg = [St[0] * ga[0] + St[1] * ga[1] + St[2] * ga[2], St[3] * ga[0] + St[4] * ga[1] + St[5] * ga[2], St[6] * ga[0] + St[7] * ga[1] + St[8] * ga[2]];
            for (let b = a; b < nen; b++) {
              const gs = w * (Sg[0] * dN[3 * b] + Sg[1] * dN[3 * b + 1] + Sg[2] * dN[3 * b + 2]);
              for (let i = 0; i < 3; i++) Ke[(3 * a + i) * n3 + 3 * b + i] += gs;
            }
          }
        }
      }
      if (withK) for (let r = 0; r < n3; r++) for (let c = 0; c < r; c++) Ke[r * n3 + c] = Ke[c * n3 + r];
      for (let a = 0; a < nen; a++) {
        const r = num.conn[q * nen + a], m = rp[r + 1] - rp[r], base = 9 * rp[r];
        for (let i = 0; i < 3; i++) {
          const row = 3 * r + i;
          if (fixed[row]) continue;
          R[row] += fe[3 * a + i];
          if (!withK) continue;
          for (let b = 0; b < nen; b++) {
            const cn = num.conn[q * nen + b], t = entryIndex(patN, r, cn) - rp[r];
            for (let j = 0; j < 3; j++) if (!fixed[3 * cn + j]) val[base + 3 * i * m + 3 * t + j] += Ke[(3 * a + i) * n3 + 3 * b + j];
          }
        }
      }
    }
    if (withK)
      for (let r = 0; r < num.nn; r++) {
        const m = rp[r + 1] - rp[r], t = entryIndex(patN, r, r) - rp[r];
        for (let i = 0; i < 3; i++) if (fixed[3 * r + i]) val[9 * rp[r] + 3 * i * m + 3 * t + i] = 1;
      }
    return { R, val, energy };
  };
  const norm = (v) => Math.sqrt(v.reduce((a, x) => a + x * x, 0));
  const dotv = (a, b) => { let t = 0; for (let i = 0; i < a.length; i++) t += a[i] * b[i]; return t; };
  const useDirect = linear === 'direct' || (linear === 'auto' && num.ndof <= 100000);
  // direct tangent solves on one symbolic analysis reused for every Newton iteration: supernodal Cholesky first (its
  // success proves the tangent positive definite: no negative eigenvalue); when it fails, symmetric indefinite LDL^T
  // (1x1 pivots, static pivot perturbation + refinement), whose negative-pivot count is the inertia (Sylvester)
  let sym = null, chol = null, ldlt = null, cur = null;
  const diagPos = new Int32Array(num.ndof);
  for (let r = 0; r < num.ndof; r++) for (let p = pat.rowptr[r]; p < pat.rowptr[r + 1]; p++) if (pat.colidx[p] === r) diagPos[r] = p;
  const factor = (val) => {
    sym ??= analyze(pat, { perm: expandPerm(nodeOrder({ patN }, num, grid, 'nd_xy')) });
    chol ??= new SparseCholesky(pat, null, { sym });
    stats.factorizations++;
    if (chol.factor(val)) { cur = { f: chol, val, nNeg: 0, nPerturbed: 0 }; return cur; }
    ldlt ??= new SupernodalLDLT(sym);
    stats.ldlt++;
    const r = ldlt.factor(val);
    cur = { f: ldlt, val, nNeg: r.nNeg, nPerturbed: r.nPerturbed };
    return cur;
  };
  const solveFac = (val, rhs) => (cur.f === ldlt && cur.nPerturbed > 0 ? ldlt.solveRefined(pat, val, rhs).x : cur.f.solve(rhs));
  // shift K + mu I (free DOFs) until the LDL^T has no negative pivot; mu from 1e-12 max diag, x 4
  const shifted = (val) => {
    let dmax = 0;
    for (let r = 0; r < num.ndof; r++) if (!fixed[r]) dmax = Math.max(dmax, Math.abs(val[diagPos[r]]));
    const v2 = Float64Array.from(val);
    for (let mu = 1e-12 * dmax; mu < dmax; mu *= 4) {
      for (let r = 0; r < num.ndof; r++) if (!fixed[r]) v2[diagPos[r]] = val[diagPos[r]] + mu;
      if (factor(v2).nNeg === 0) return { v2, mu };
    }
    throw new Error('mech nonlinear: no positive definite shift of the tangent found');
  };
  const tangentSolve = (val, rhs) => {
    onTangent?.({ pat, patN, val, rhs, fixedDof: fixed, num, grid }); // diagnostics hook (L20 task 4)
    if (useDirect) {
      const f = factor(val);
      return { du: solveFac(val, rhs), nNeg: f.nNeg };
    }
    const sys = { pat, patN, val, rhs, fixedDof: fixed };
    // q2s p-multigrid preconditioned CG on the tangent (needs an SPD tangent: no stability check on this path). Column
    // (z-line) block smoother: the 3 x 3 point-block smoother needed 500 - 1000+ iterations on thin-plate tangents at
    // cell aspect 20 (Galerkin q1 coarse space locks in bending; through-thickness coupling unsmoothed), the column
    // smoother 43 - 104 (L20 notes, task 4)
    stats.pcg_iterations = (stats.pcg_iterations ?? 0);
    let r;
    try {
      // the preconditioner build is inside the guard: its column Cholesky fails first on an indefinite tangent (A7 M5)
      const m = buildQ2sPMG(grid, num, sys, { smoother: 'column' });
      r = pcg(csrApply(sys), m.precond, rhs, null, { rtol: 1e-8, maxIter: 3000 });
    } catch (e) {
      // CG breakdown (p^T K p <= 0): the tangent is indefinite, e.g. past a bifurcation (no inertia on this path)
      throw new Error(`mech nonlinear: iterative tangent solve broke down (${e.message}): indefinite tangent, likely past a bifurcation; use linear 'direct' (inertia and branch switching)`);
    }
    stats.pcg_iterations += r.iterations;
    if (!r.converged) throw new Error(`mech nonlinear: tangent solve not converged (relres ${r.relres.toExponential(2)}; iterative tangent solves need a positive definite tangent: use linear 'direct' near a bifurcation)`);
    return { du: r.x, nNeg: null };
  };
  const stats = { factorizations: 0, ldlt: 0, residuals: 0, line_search_cuts: 0 };
  const resid = (T, uu) => { const s = u.slice(); u.set(uu); const r = assemble(T, false); u.set(s); stats.residuals++; return r; };
  /**
   * Slope line search (energy-consistent, residual-based: no energy differences): s(t) = du . R(u + t du), s(0) < 0;
   * accept t = 1 when |s(1)| <= 0.8 |s(0)|, else regula falsi / secant on s(t) = 0 in [0.1, 1], at most lsMax trials.
   */
  const slopeSearch = (T, du, R0) => {
    const s0 = dotv(du, R0);
    if (!(s0 < 0)) return 1;
    const trial = new Float64Array(u.length);
    const sAt = (t) => { for (let i = 0; i < u.length; i++) trial[i] = u[i] + t * du[i]; return dotv(du, resid(T, trial).R); };
    let t1 = 1, s1 = sAt(1);
    if (Math.abs(s1) <= 0.8 * Math.abs(s0)) return 1;
    let ta = 0, sa = s0, tb = t1, sb = s1, t = 1;
    for (let c = 0; c < lsMax; c++) {
      stats.line_search_cuts++;
      t = sb > 0 ? ta - (sa * (tb - ta)) / (sb - sa) : tb - (sb * (tb - ta)) / (sb - sa);
      t = Math.min(1, Math.max(0.1, t));
      const st = sAt(t);
      if (Math.abs(st) <= 0.8 * Math.abs(s0)) return t;
      if (st < 0) { ta = t; sa = st; } else { tb = t; sb = st; }
    }
    return t;
  };
  const hist = [], bif = [], warnings = [];
  let Rref = 0;
  const uPrev = new Float64Array(u.length);
  /** Newton at temperature T from the current u; returns {it, rel, rh, lams, val (tangent at the converged u)}. */
  const newton = (T, k, descent = false) => {
    let it = 0, rel = 1, val = null;
    const rh = [], lams = [];
    for (; it < maxNewton + (descent ? maxDescent : 0); it++) {
      // predictor: the first iteration of the first load step (u = 0, unrelaxed misfit prestress) uses the material
      // tangent only, i.e. the linear solution; the prestress geometric stiffness of the flat state can be indefinite
      const pred = k === 1 && it === 0 && !descent;
      const a = assemble(T, true, !pred);
      val = a.val;
      const rn = norm(a.R);
      if (k === 1 && it === 0 && !descent) Rref = rn;
      rel = rn / (Rref || 1);
      rh.push(rel);
      if (rel < tol) break;
      let du;
      const rhs = a.R.map((x) => -x);
      if (descent && useDirect) {
        // energy descent (branch switching): a positive definite shift of an indefinite tangent, steps that lower the
        // strain energy (cannot return to the unstable equilibrium, whose energy is higher)
        const f = factor(val);
        if (f.nNeg > 0) { const { v2 } = shifted(val); du = solveFac(v2, rhs); }
        else du = solveFac(val, rhs);
        const E0 = a.energy, g = dotv(a.R, du); // dE/dt at t = 0 (R = dE/du): < 0 for a descent direction
        let t = 1;
        const trial = new Float64Array(u.length);
        for (let c = 0; c < 30; c++) {
          for (let i = 0; i < u.length; i++) trial[i] = u[i] + t * du[i];
          const Et = resid(T, trial).energy;
          if (Et <= E0 + 1e-4 * t * g || Math.abs(Et - E0) <= 1e-13 * Math.abs(E0)) break;
          t *= 0.5;
          stats.line_search_cuts++;
        }
        for (let i = 0; i < u.length; i++) u[i] += t * du[i];
        lams.push(t);
        onIter?.({ step: k, it, rel, lam: t, descent: true });
        if (f.nNeg === 0) descent = false; // positive definite region: plain Newton from here
        continue;
      }
      ({ du } = tangentSolve(val, rhs));
      const t = !pred && lsMode === 'slope' ? slopeSearch(T, du, a.R) : 1;
      for (let i = 0; i < u.length; i++) u[i] += t * du[i];
      lams.push(t);
      onIter?.({ step: k, it, rel, lam: t });
    }
    return { it, rel, rh, lams, val };
  };
  /** Most negative curvature direction of the tangent: inverse iteration with (K + mu I)^-1 (K + mu I > 0). */
  const negativeMode = (val) => {
    const { mu } = shifted(val);
    const v2 = Float64Array.from(val);
    for (let r = 0; r < num.ndof; r++) if (!fixed[r]) v2[diagPos[r]] += mu;
    let x = new Float64Array(num.ndof);
    for (let i = 0; i < x.length; i++) x[i] = fixed[i] ? 0 : Math.sin(12.9898 * (i + 1)) * 43758.5453 % 1;
    let q = 0;
    const Kx = new Float64Array(num.ndof);
    for (let p = 0; p < 40; p++) {
      x = solveFac(v2, x);
      for (let i = 0; i < x.length; i++) if (fixed[i]) x[i] = 0;
      const nx = norm(x);
      for (let i = 0; i < x.length; i++) x[i] /= nx;
      matVec(pat, val, x, Kx);
      q = dotv(x, Kx);
    }
    // convergence measure of the 40 fixed iterations (audit A7 M8): eigen-residual ||K x - q x|| / |q| (|x| = 1)
    let r2 = 0;
    for (let i = 0; i < x.length; i++) if (!fixed[i]) r2 += (Kx[i] - q * x[i]) ** 2;
    return { phi: x, rayleigh: q, mu, residual: Math.sqrt(r2) / Math.abs(q), iterations: 40 };
  };
  /** Minimise the strain energy along +-phi (step doubling from 1e-3 max |u|, then a parabola). */
  const energyAlong = (T, phi) => {
    const E0 = resid(T, u).energy, umax = u.reduce((m, v) => Math.max(m, Math.abs(v)), 0), pmax = phi.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    let best = { E: E0, t: 0 };
    const trial = new Float64Array(u.length);
    const Eat = (t) => { for (let i = 0; i < u.length; i++) trial[i] = u[i] + t * phi[i]; return resid(T, trial).energy; };
    for (const sg of [1, -1]) {
      const ts = [0], es = [E0];
      for (let t = (1e-3 * umax) / pmax, c = 0; c < 40; c++, t *= 2) { ts.push(sg * t); es.push(Eat(sg * t)); if (es.at(-1) > es.at(-2)) break; }
      let j = 0;
      for (let q = 1; q < es.length; q++) if (es[q] < es[j]) j = q;
      let tj = ts[j];
      if (j > 0 && j < ts.length - 1) {
        const [x0, x1, x2, y0, y1, y2] = [ts[j - 1], ts[j], ts[j + 1], es[j - 1], es[j], es[j + 1]];
        const den = (x0 - x1) * (x0 - x2) * (x1 - x2), A = (x2 * (y1 - y0) + x1 * (y0 - y2) + x0 * (y2 - y1)) / den, B = (x2 * x2 * (y0 - y1) + x1 * x1 * (y2 - y0) + x0 * x0 * (y1 - y2)) / den;
        if (A > 0) tj = -B / (2 * A);
      }
      const Ej = Eat(tj);
      if (Ej < best.E) best = { E: Ej, t: tj };
    }
    for (let i = 0; i < u.length; i++) u[i] += best.t * phi[i];
    return { E0, E: best.E, t: best.t };
  };
  for (let k = 1; k <= steps; k++) {
    const T = Tsf + ((Tend - Tsf) * k) / steps;
    // secant predictor (opt-in): extrapolate the previous load-step increment (equal temperature steps). Halves the
    // Newton iterations on smooth paths but can jump to another stable branch near a bifurcation (L20 notes)
    if (predictor === 'secant' && k >= 2) for (let i = 0; i < u.length; i++) { const d = u[i] - uPrev[i]; uPrev[i] = u[i]; u[i] += d; }
    else uPrev.set(u);
    let res = newton(T, k);
    if (res.rel >= tol) throw new Error(`mech nonlinear: Newton did not converge at load step ${k} (relres ${res.rel.toExponential(2)}); more load steps or bifurcation`);
    // stability of the converged state (direct solves only): Cholesky success = positive definite, else LDL^T inertia
    const f0 = useDirect && stability ? factor(res.val) : null;
    let nNeg = f0 ? f0.nNeg : null;
    // SPEC 21: every checked step reports `switched` (A7 M7); perturbed LDL^T pivots make the inertia uncertain by the
    // number of perturbed pivots near a singular tangent: recorded and warned (A7 M6)
    const entry = { step: k, T_C: T - C_TO_K, newton: res.it, relres: res.rel, history: res.rh, lam: res.lams, negative_pivots: nNeg, stable: nNeg == null ? null : nNeg === 0, ...(f0 ? { switched: false, perturbed_pivots: f0.nPerturbed } : {}) };
    const notePerturbed = (f, when) => {
      if (f && f.nPerturbed > 0) warnings.push(`mech nonlinear: load step ${k} (T ${(T - C_TO_K).toFixed(2)} C): ${f.nPerturbed} perturbed LDL^T pivot(s) in the stability factorization ${when}; the negative-pivot count (${f.nNeg}) may be off by up to that number near a singular tangent`);
    };
    notePerturbed(f0, 'of the converged state');
    if (nNeg > 0) {
      const ev = { step: k, T_C: T - C_TO_K, negative_pivots: nNeg, branch };
      if (branch === 'stable') {
        // branch switching: minimise the energy along the negative-curvature mode, then energy-descent Newton
        let itAll = entry.newton, fAfter = null;
        for (let attempt = 0; attempt < 3 && nNeg > 0; attempt++) {
          const m = negativeMode(res.val);
          if (!(m.rayleigh < 0)) { ev.note = `inverse iteration found no negative-curvature mode (Rayleigh ${m.rayleigh.toExponential(2)})`; break; }
          const ea = energyAlong(T, m.phi);
          res = newton(T, k, true);
          if (res.rel >= tol) throw new Error(`mech nonlinear: branch switching did not converge at load step ${k} (relres ${res.rel.toExponential(2)})`);
          fAfter = factor(res.val);
          nNeg = fAfter.nNeg;
          itAll += res.it; // A7 M7: every attempt's iterations count
          (ev.attempts ??= []).push({ rayleigh: m.rayleigh, mode_residual: m.residual, mode_iterations: m.iterations, energy_J: [ea.E0, ea.E], newton: res.it, negative_pivots_after: nNeg, perturbed_pivots_after: fAfter.nPerturbed });
        }
        notePerturbed(fAfter, 'after branch switching');
        Object.assign(entry, { newton: itAll, relres: res.rel, negative_pivots: nNeg, stable: nNeg === 0, switched: nNeg === 0, ...(fAfter ? { perturbed_pivots: fAfter.nPerturbed } : {}) });
        ev.switched = nNeg === 0;
        warnings.push(nNeg === 0
          ? `mech nonlinear: bifurcation passed before load step ${k} (T ${(T - C_TO_K).toFixed(2)} C): the symmetric equilibrium was unstable (${ev.negative_pivots} negative tangent pivots); switched to the stable branch (energy minimisation along the critical mode)`
          : `mech nonlinear: unstable equilibrium at load step ${k} (T ${(T - C_TO_K).toFixed(2)} C, ${nNeg} negative tangent pivots); branch switching failed${ev.note ? `: ${ev.note}` : ''}`);
      } else warnings.push(`mech nonlinear: unstable equilibrium at load step ${k} (T ${(T - C_TO_K).toFixed(2)} C, ${nNeg} negative tangent pivots): the path followed is past a bifurcation (branch 'follow')`);
      bif.push(ev);
    }
    hist.push(entry);
    onStep?.({ step: k, T_C: T - C_TO_K, u, num, newton: entry.newton, relres: entry.relres });
  }
  if (!useDirect && stability) warnings.push('mech nonlinear: tangent stability not checked (iterative tangent solves have no inertia)');
  return { u, num, grid, newton: hist, bifurcation: bif, warnings, stats, warpage: wsurf.map((s) => (typeof s === 'string' ? warpage(grid, num, u, s) : warpage(grid, num, u, s.surface, { sel: s._sel ?? null }))) };
}
