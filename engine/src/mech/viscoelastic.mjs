// Linear viscoelasticity, tranche E8 skeleton (DevLog-010 A7 / E8; R1 1.8, 2.3 implications B). Lane L8.
// Material model: generalized Maxwell (Prony) with proportional relaxation, D(t) = D0 g(t),
//   g(t) = g_inf + sum_i g_i exp(-t / tau_i),  g_inf = 1 - sum g_i  (D0 = instantaneous stiffness from the resolver),
// i.e. the same relaxation for bulk and shear (constant Poisson ratio; the common form of EMC / underfill E(t) data).
// Thermorheologically simple: reduced time dxi = dt / a_T(T), a_T by WLF (log10 a_T = -C1 (T - Tref) / (C2 + T - Tref),
// T >= Tref - C2 guard) or Arrhenius (ln a_T = Ea / R (1/T - 1/Tref)).
// Integration (recursive internal variables per Gauss point, Taylor-Pister-Goudreau 1970 / Simo-Hughes 1998 sec. 10.3
// form; exact for mechanical strain linear in reduced time over a step):
//   h_i^{n+1} = exp(-x_i) h_i^n + b_i D0 (e^{n+1} - e^n),  x_i = dxi / tau_i,  b_i = (1 - exp(-x_i)) / x_i  (1 at x_i -> 0)
//   sigma^{n+1} = g_inf D0 e^{n+1} + sum_i g_i h_i^{n+1} = g_alg D0 e^{n+1} + sigma_hist,
//   g_alg = g_inf + sum_i g_i b_i,  sigma_hist = sum_i g_i (exp(-x_i) h_i^n - b_i D0 e^n),
// with e = eps(u) - eps_th(T). Because D_alg = g_alg D0 is proportional to D0, element matrices are the elastic ones
// scaled by g_alg; the history stress enters as an eigen-stress load (condensed for q1im like the thermal load).
// Data: no sourced Prony / WLF set exists in the cached corpus (L8 notes, wave 3); callers pass the parameters
// explicitly (`viscoelastic: {material key: {prony: [{g, tau_s}], shift}}`); the library is not touched.
// License: GPL-3.0-or-later.

import { buildElementPattern, entryIndex } from '../la/sparse.mjs';
import { buildNumbering } from './numbering.mjs';
import { createMechMaterials, C_TO_K } from './materials.mjs';
import { buildConstraints } from './supports.mjs';
import { operatorProvider, expandPattern } from './assemble.mjs';
import { elementThermalLoad, reference, strainAt, internalModes, stressFrom, interpT } from './elements.mjs';
import { invertDense } from './constitutive.mjs';
import { solveDirect } from './solve.mjs';
import { warpage } from './post.mjs';

const R_GAS = 8.314462618;

/** Shift factor a_T (>0) of a spec at T (K). */
export function shiftFactor(shift, T_K) {
  if (!shift || shift.type === 'none') return 1;
  if (shift.type === 'wlf') {
    const dT = T_K - (shift.Tref_C + C_TO_K);
    if (shift.C2_K + dT <= 0) throw new Error(`mech ve: WLF undefined at ${(T_K - C_TO_K).toFixed(1)} C (C2 + T - Tref <= 0)`);
    return 10 ** ((-shift.C1 * dT) / (shift.C2_K + dT));
  }
  if (shift.type === 'arrhenius') return Math.exp((shift.Ea_J_mol / R_GAS) * (1 / T_K - 1 / (shift.Tref_C + C_TO_K)));
  throw new Error(`mech ve: unknown shift type ${shift.type} (wlf | arrhenius | none)`);
}

/** Relaxation function g(t) of a Prony spec. */
export function relaxation(spec, t) {
  const gs = spec.prony.reduce((a, p) => a + p.g, 0);
  return 1 - gs + spec.prony.reduce((a, p) => a + p.g * Math.exp(-t / p.tau_s), 0);
}

function checkSpec(key, s) {
  if (!Array.isArray(s?.prony) || !s.prony.length) throw new Error(`mech ve: ${key}: prony [{g, tau_s}] required`);
  const gs = s.prony.reduce((a, p) => a + p.g, 0);
  if (!(gs > 0 && gs < 1) || s.prony.some((p) => !(p.g > 0 && p.tau_s > 0))) throw new Error(`mech ve: ${key}: need g_i > 0, tau_i > 0, sum g_i < 1 (g_inf > 0)`);
}

/**
 * Time-stepped viscoelastic solve through a temperature history.
 * @param {object} grid
 * @param {object} o {element ('q1im' | 'q1'), resolve, rebase, stress_free_C, supports, bcs, viscoelastic,
 *   history: [{t_s, T_C}] (piecewise linear T(t); the first entry is the start), substeps (per history interval,
 *   default 20), outputs: [t_s] (times at which warpage / probes are reported; default every history point), warpage}
 * @returns {{steps: [{t_s, T_C, u, ...}], ...}}
 */
export function solveViscoelastic(grid, o) {
  const { element = 'q1im', resolve, rebase = null, stress_free_C, supports = 'rigid_motion', bcs = [], viscoelastic = {}, history, substeps = 20, warpage: wsurf = [], resolveOpts = {}, onStep = null } = o;
  if (element === 'q2s') throw new Error('mech ve: skeleton supports q1im and q1');
  if (!Array.isArray(history) || history.length < 2) throw new Error('mech ve: history [{t_s, T_C}] with >= 2 points required');
  for (const [k, s] of Object.entries(viscoelastic)) checkSpec(k, s);
  const num = buildNumbering(grid, element);
  const T0 = history[0].T_C + C_TO_K;
  const mats = createMechMaterials(grid, { resolve, rebase, stressFreeC: stress_free_C, resolveOpts });
  const cons = buildConstraints(grid, num, { supports, bcs });
  const prov = operatorProvider(grid, element, mats);
  const ref = reference(element), ng = ref.ng, nen = num.nen, n3 = 3 * nen;
  const nca = num.cells.length;
  // D0 at the start temperature (instantaneous stiffness held constant: skeleton); VE spec per mechanical material
  const ops = new Array(nca), veOf = new Array(nca).fill(null);
  const specByMM = mats.list.map((m) => viscoelastic[m.key] ?? null);
  for (let q = 0; q < nca; q++) { const c = num.cells[q]; ops[q] = prov.get(c, T0); veOf[q] = specByMM[ops[q].mm]; }
  const Dinv = new Map();
  const dinvOf = (op) => { let v = Dinv.get(op.D); if (!v) { v = invertDense(op.D, 6); Dinv.set(op.D, v); } return v; };
  // state per VE Gauss point: e^n (6) and h_i^n (6 per branch)
  const stateIdx = new Int32Array(nca).fill(-1);
  let nveCells = 0;
  for (let q = 0; q < nca; q++) if (veOf[q]) stateIdx[q] = nveCells++;
  const maxB = Math.max(1, ...Object.values(viscoelastic).map((s) => s.prony.length));
  const E = new Float64Array(nveCells * ng * 6), Hs = new Float64Array(nveCells * ng * 6 * maxB);
  // pattern
  const patN = buildElementPattern(num.nn, num.conn, nen), pat = expandPattern(patN), rp = patN.rowptr;
  const tpos = new Int32Array(nca * nen * nen);
  for (let q = 0; q < nca; q++)
    for (let a = 0; a < nen; a++) { const r = num.conn[q * nen + a]; for (let b = 0; b < nen; b++) tpos[(q * nen + a) * nen + b] = entryIndex(patN, r, num.conn[q * nen + b]) - rp[r]; }
  const { fixed, value } = cons;
  let u = new Float64Array(num.ndof);
  const out = [];
  const ue = new Float64Array(n3), eps = new Float64Array(6), eth = new Float64Array(6), sg = new Float64Array(6), Tc = new Float64Array(8);
  const sigH = new Float64Array(6 * ng), epsEq = new Float64Array(6 * ng);
  // time loop
  const times = [];
  for (let s = 0; s + 1 < history.length; s++) {
    const a = history[s], b = history[s + 1], nsub = b.t_s === a.t_s ? 1 : (history[s + 1].substeps ?? substeps);
    for (let k = 1; k <= nsub; k++) times.push({ t: a.t_s + ((b.t_s - a.t_s) * k) / nsub, T: a.T_C + ((b.T_C - a.T_C) * k) / nsub, tPrev: a.t_s + ((b.t_s - a.t_s) * (k - 1)) / nsub, TPrev: a.T_C + ((b.T_C - a.T_C) * (k - 1)) / nsub, mark: k === nsub });
  }
  for (const step of times) {
    const t0 = performance.now();
    const T1 = step.T + C_TO_K, Tm = 0.5 * (step.T + step.TPrev) + C_TO_K, dt = step.t - step.tPrev;
    // per spec: x_i, exp(-x_i), b_i, g_alg
    const coef = new Map();
    for (const [k, s] of Object.entries(viscoelastic)) {
      const dxi = dt / shiftFactor(s.shift, Tm);
      const br = s.prony.map((p) => { const x = dxi / p.tau_s; const ex = Math.exp(-x); return { g: p.g, ex, b: x < 1e-12 ? 1 : (1 - ex) / x }; });
      const ginf = 1 - s.prony.reduce((a, p) => a + p.g, 0);
      coef.set(k, { br, galg: ginf + br.reduce((a, r) => a + r.g * r.b, 0), ginf });
    }
    const val = new Float64Array(pat.nnz), rhs = new Float64Array(pat.n);
    const fiStore = new Array(nca);
    Tc.fill(T1);
    for (let q = 0; q < nca; q++) {
      const op = ops[q], mat = mats.list[op.mm], spec = veOf[q];
      const cf = spec ? coef.get(mats.list[op.mm].key) : null;
      const gk = cf ? cf.galg : 1;
      // thermal load with D_alg = gk D0, plus the history eigen-stress load (-int B^T sigma_hist)
      const th = elementThermalLoad(op, null, mat.epsTh(T1, eth));
      const f = th.f.map((v) => gk * v);
      let fi = null;
      if (spec) {
        const si = stateIdx[q], Di = dinvOf(op);
        for (let g = 0; g < ng; g++) {
          const eo = 6 * (si * ng + g), ho = 6 * maxB * (si * ng + g);
          // sigma_hist = sum g_i (ex_i h_i - b_i D0 e^n)
          const De = [0, 0, 0, 0, 0, 0];
          for (let I = 0; I < 6; I++) for (let J = 0; J < 6; J++) De[I] += op.D[6 * I + J] * E[eo + J];
          for (let I = 0; I < 6; I++) {
            let sh = 0;
            cf.br.forEach((r, bi) => { sh += r.g * (r.ex * Hs[ho + 6 * bi + I] - r.b * De[I]); });
            sigH[6 * g + I] = sh;
          }
          // equivalent strain for the load routine: D0 epsEq = -sigma_hist
          for (let I = 0; I < 6; I++) { let s2 = 0; for (let J = 0; J < 6; J++) s2 -= Di[6 * I + J] * sigH[6 * g + J]; epsEq[6 * g + I] = s2; }
        }
        const hl = elementThermalLoad(op, (g) => epsEq.subarray(6 * g, 6 * g + 6), null);
        for (let r = 0; r < n3; r++) f[r] += hl.f[r];
        fi = hl.fi;
        if (op.type === 'q1im') {
          // internal-mode load for the recovery: thermal (uniform T: zero) + history, divided by g_alg (K_ii scaled)
          fi = hl.fi.map((v) => v / gk);
        }
      }
      fiStore[q] = fi;
      const K = op.K;
      for (let a = 0; a < nen; a++) {
        const r = num.conn[q * nen + a], m = rp[r + 1] - rp[r], base = 9 * rp[r];
        for (let i = 0; i < 3; i++) {
          const row = 3 * r + i, li = 3 * a + i;
          if (fixed[row]) continue;
          rhs[row] += f[li];
          for (let b = 0; b < nen; b++) {
            const cb = base + 3 * i * m + 3 * tpos[(q * nen + a) * nen + b], cn = num.conn[q * nen + b];
            for (let j = 0; j < 3; j++) {
              const kv = gk * K[li * n3 + 3 * b + j];
              if (fixed[3 * cn + j]) { const v = value[3 * cn + j]; if (v !== 0) rhs[row] -= kv * v; } else val[cb + j] += kv;
            }
          }
        }
      }
    }
    for (let r = 0; r < num.nn; r++) {
      const m = rp[r + 1] - rp[r], t = entryIndex(patN, r, r) - rp[r];
      for (let i = 0; i < 3; i++) if (fixed[3 * r + i]) { val[9 * rp[r] + 3 * i * m + 3 * t + i] = 1; rhs[3 * r + i] = value[3 * r + i]; }
    }
    u = solveDirect({ pat, patN, val, rhs }, num, grid, { ordering: 'nd' }).x;
    // state update and the volume-mean stress per part (diagnostics)
    const partSig = new Map();
    for (let q = 0; q < nca; q++) {
      const op = ops[q], spec = veOf[q], mat = mats.list[op.mm];
      for (let a = 0; a < nen; a++) { const n = num.conn[q * nen + a]; ue[3 * a] = u[3 * n]; ue[3 * a + 1] = u[3 * n + 1]; ue[3 * a + 2] = u[3 * n + 2]; }
      const al = op.type === 'q1im' ? internalModes(op, ue, fiStore[q]) : null;
      const cf = spec ? coef.get(mat.key) : null;
      const si = stateIdx[q], vol = op.h[0] * op.h[1] * op.h[2];
      const p = grid.parts[grid.cellPart[num.cells[q]]].id;
      let acc = partSig.get(p);
      if (!acc) { acc = new Float64Array(7); partSig.set(p, acc); }
      for (let g = 0; g < ng; g++) {
        const x = ref.gpX[3 * g], y = ref.gpX[3 * g + 1], z = ref.gpX[3 * g + 2];
        strainAt(op, x, y, z, ue, al, eps);
        mat.epsTh(interpT(Tc, x, y, z), eth);
        for (let I = 0; I < 6; I++) eps[I] -= eth[I]; // mechanical strain e^{n+1}
        if (spec) {
          const eo = 6 * (si * ng + g), ho = 6 * maxB * (si * ng + g);
          const dE = [0, 0, 0, 0, 0, 0];
          for (let I = 0; I < 6; I++) dE[I] = eps[I] - E[eo + I];
          const DdE = [0, 0, 0, 0, 0, 0], De1 = [0, 0, 0, 0, 0, 0];
          for (let I = 0; I < 6; I++) for (let J = 0; J < 6; J++) { DdE[I] += op.D[6 * I + J] * dE[J]; De1[I] += op.D[6 * I + J] * eps[J]; }
          for (let I = 0; I < 6; I++) sg[I] = cf.ginf * De1[I];
          cf.br.forEach((r, bi) => {
            for (let I = 0; I < 6; I++) {
              const h = r.ex * Hs[ho + 6 * bi + I] + r.b * DdE[I];
              Hs[ho + 6 * bi + I] = h;
              sg[I] += r.g * h;
            }
          });
          for (let I = 0; I < 6; I++) E[eo + I] = eps[I];
        } else stressFrom(op.D, eps, null, sg);
        const w = (ref.gpW[g] * vol) / 8;
        for (let I = 0; I < 6; I++) acc[I] += w * sg[I];
        acc[6] += w;
      }
    }
    if (step.mark) {
      const sigma_mean = {};
      for (const [p, a] of partSig) sigma_mean[p] = Array.from(a.subarray(0, 6), (v) => v / a[6]);
      const rec = { t_s: step.t, T_C: step.T, sigma_mean_Pa: sigma_mean, warpage: wsurf.map((s) => warpage(grid, num, u, s)), ms: performance.now() - t0, _u: Float64Array.from(u) };
      out.push(rec);
      onStep?.(rec);
    }
  }
  return { steps: out, num, grid, mats };
}
