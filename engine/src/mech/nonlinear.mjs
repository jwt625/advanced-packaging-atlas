// Geometrically nonlinear thermo-elasticity (wave 4 item 4): total Lagrangian, Green-Lagrange strain,
// St. Venant-Kirchhoff material S = D (E - eps_th) (small strains, large rotations), q2s elements (27 Gauss points),
// load-stepped Newton on the temperature change (lambda: T = Tsf + lambda (T_end - Tsf)). Lane L8.
// Residual R(u) = int B_NL^T S dV0 = 0 (no external loads; thermal strain in the reference configuration);
// tangent K = int B_NL^T D B_NL dV0 + int (grad N_a . S grad N_b) I_3 dV0. Supports as solveMech (3-2-1 points or
// mirror planes stay valid under large rotation: they constrain displacement components only). Direct solver per
// Newton iteration (skeleton; models must be coarse in-plane: q2s is accurate per DOF on plates, bake-off).
// License: GPL-3.0-or-later.

import { buildElementPattern, entryIndex } from '../la/sparse.mjs';
import { buildNumbering } from './numbering.mjs';
import { createMechMaterials, C_TO_K } from './materials.mjs';
import { buildConstraints } from './supports.mjs';
import { expandPattern, operatorProvider } from './assemble.mjs';
import { reference, interpT } from './elements.mjs';
import { solveDirect, pcg, csrApply } from './solve.mjs';
import { buildQ2sPMG } from './gmg.mjs';
import { warpage } from './post.mjs';

/**
 * @param {object} grid
 * @param {object} o {resolve, rebase, stress_free_C, supports, bcs, temperature: {uniform_C}, steps (load steps,
 *   default 10), tol (relative residual, default 1e-9), maxNewton (default 20), warpage, resolveOpts}
 */
export function solveMechNonlinear(grid, o) {
  const { resolve, rebase = null, stress_free_C, supports = 'rigid_motion', bcs = [], temperature, steps = 10, tol = 1e-9, maxNewton = 20, warpage: wsurf = [], resolveOpts = {}, linear = 'auto', onIter = null } = o;
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
  const hist = [];
  let Rref = 0;
  for (let k = 1; k <= steps; k++) {
    const T = Tsf + ((Tend - Tsf) * k) / steps;
    let it = 0, rel = 1;
    const rh = [];
    for (; it < maxNewton; it++) {
      // predictor: the first iteration of the first load step (u = 0, unrelaxed misfit prestress) uses the material
      // tangent only, i.e. the linear solution; the prestress geometric stiffness of the flat state can be indefinite
      const { R, val, energy: energyNow } = assemble(T, true, !(k === 1 && it === 0));
      const rn = norm(R);
      if (k === 1 && it === 0) Rref = rn;
      rel = rn / (Rref || 1);
      rh.push(rel);
      if (rel < tol) break;
      const sys = { pat, patN, val, rhs: R.map((x) => -x), fixedDof: fixed };
      let du;
      if (linear === 'direct' || (linear === 'auto' && num.ndof <= 100000)) du = solveDirect(sys, num, grid, { ordering: 'nd_xy' }).x;
      else {
        // q2s p-multigrid preconditioned CG on the tangent (SPD away from bifurcation)
        const m = buildQ2sPMG(grid, num, sys, {});
        const r = pcg(csrApply(sys), m.precond, sys.rhs, null, { rtol: 1e-8, maxIter: 3000 });
        if (!r.converged) throw new Error(`mech nonlinear: tangent solve not converged (relres ${r.relres.toExponential(2)})`);
        du = r.x;
      }
      // full Newton steps: a strain-energy backtracking line search was tried and stalled (L8 notes); the plain
      // iteration converges (oscillating first iterations, then quadratic)
      const lam = 1;
      for (let i = 0; i < u.length; i++) u[i] += du[i];
      onIter?.({ step: k, it, rel, lam });
    }
    hist.push({ step: k, T_C: T - C_TO_K, newton: it, relres: rel, history: rh });
    if (rel >= tol) throw new Error(`mech nonlinear: Newton did not converge at load step ${k} (relres ${rel.toExponential(2)}); more load steps or bifurcation`);
  }
  return { u, num, grid, newton: hist, warpage: wsurf.map((s) => (typeof s === 'string' ? warpage(grid, num, u, s) : warpage(grid, num, u, s.surface, { sel: s._sel ?? null }))) };
}
