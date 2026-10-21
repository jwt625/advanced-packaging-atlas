// Temperature sweep in rate (incremental) form for temperature-dependent moduli (wave 4 item 3; ahead of the
// viscoelastic tier). Lane L8.
// Hypoelastic update along the temperature path T0 = Tsf -> T1 -> ... (uniform temperature):
//   d sigma = D(T) (d eps - d eps_th),  integrated with load steps of at most dT_max K, D at the step midpoint and
//   d eps_th = eps_th(T_{n+1}) - eps_th(T_n) (the exact integral of the instantaneous CTE over the step).
// Each step is a linear solve K(T_mid) du = int B^T D(T_mid) d eps_th; u accumulates. The total (secant) form
// sigma = D(T) (eps - eps_th(T)) of solveMech uses the modulus at the end temperature for the whole history; with a
// modulus that drops across Tg the two differ (the rate form remembers the stiffness at which each strain increment
// was locked in). Reports warpage / curvature at the requested temperatures. Stresses are not accumulated (skeleton).
// License: GPL-3.0-or-later.

import { buildNumbering } from './numbering.mjs';
import { createMechMaterials, C_TO_K } from './materials.mjs';
import { buildConstraints } from './supports.mjs';
import { assembleSystem, operatorProvider } from './assemble.mjs';
import { solveDirect } from './solve.mjs';
import { warpage, curvatureFit } from './post.mjs';

/**
 * @param {object} grid
 * @param {object} o {element, resolve, rebase, stress_free_C, supports, bcs, path_C: [T...] (visited in order from the
 *   stress-free default), dT_max (K, default 2), warpage: [surface], curvature: [{z_m, frac}], resolveOpts, eigenstrain}
 */
export function solveMechSweep(grid, o) {
  const { element = 'q1im', resolve, rebase = null, stress_free_C, supports = 'rigid_motion', bcs = [], path_C, dT_max = 2, warpage: wsurf = [], curvature = [], resolveOpts = {} } = o;
  if (o.eigenstrain) throw new Error('mech sweep: eigenstrain is not supported in the rate form yet (use solveMech)');
  if (!Array.isArray(path_C) || !path_C.length) throw new Error('mech sweep: path_C (temperatures, C) required');
  const num = buildNumbering(grid, element);
  const mats = createMechMaterials(grid, { resolve, rebase, stressFreeC: stress_free_C, resolveOpts });
  const cons = buildConstraints(grid, num, { supports, bcs });
  let u = new Float64Array(num.ndof);
  const out = [];
  let T = stress_free_C.default; // the sweep starts at the default stress-free temperature
  const step = (Ta, Tb, Tm, full) => {
    const inc = {
      ...mats,
      list: mats.list.map((m) => ({
        ...m,
        D: () => m.D(Tm),
        epsTh: (_T, outv = new Float64Array(6)) => {
          const eb = m.epsTh(Tb + C_TO_K), ea = full ? new Float64Array(6) : m.epsTh(Ta + C_TO_K);
          for (let i = 0; i < 6; i++) outv[i] = eb[i] - ea[i];
          return outv;
        },
      })),
    };
    const prov = operatorProvider(grid, element, inc);
    const sys = assembleSystem(grid, num, inc, { uniform_K: Tm }, cons, prov);
    const du = solveDirect(sys, num, grid, { ordering: element === 'q2s' ? 'nd_xy' : 'nd' }).x;
    for (let i = 0; i < u.length; i++) u[i] += du[i];
  };
  // parts with their own stress-free temperature: initial misfit eps_th(T_start) (relative to each part's Tsf) at D(T_start)
  if (mats.list.some((m) => Math.abs(m.Tsf_K - (T + C_TO_K)) > 1e-9)) step(T, T, T + C_TO_K, true);
  for (const Tt of path_C) {
    const n = Math.max(1, Math.ceil(Math.abs(Tt - T) / dT_max - 1e-9));
    for (let s = 0; s < n; s++) {
      const Ta = T + ((Tt - T) * s) / n, Tb = T + ((Tt - T) * (s + 1)) / n;
      step(Ta, Tb, 0.5 * (Ta + Tb) + C_TO_K, false); // D at the midpoint, thermal strain increment over the step
    }
    T = Tt;
    out.push({ T_C: Tt, warpage: wsurf.map((sf) => warpage(grid, num, u, sf)), curvature: curvature.map((c) => curvatureFit(grid, num, u, c)), _u: Float64Array.from(u) });
  }
  return { steps: out, num };
}
