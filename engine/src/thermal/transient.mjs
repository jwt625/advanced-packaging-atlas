// Transient heat conduction (L4-3; DevLog-012 lane L1 wave 2): rho cp dT/dt - div(k grad T) = q on the same Q1 grid,
// theta scheme in time: backward Euler (theta = 1, order 1) or Crank-Nicolson (theta = 1/2, order 2; the first
// `be_steps` steps (default 2) are backward Euler to damp the step-BC oscillation, which keeps second order since BE's
// local error is O(dt^2)). Constant BCs and loads (applied at t = 0+), fixed dt, consistent (default) or lumped mass.
// System per step: (M/dt + theta K) T1 = (M/dt - (1 - theta) K) T0 + F; operator constrained and factored (or its MG
// hierarchy built) once per distinct step type. k at the initial temperature (no Picard in transient; warned).
// Energy check: stored-energy change 1^T M (T_end - T_0) vs the time integral of sources + flux - HTC outflow +
// fixed-T reactions, both from the discrete equations (round-off level).
// License: GPL-3.0-or-later.

import { createStencil, padded, applyStencil } from '../la/stencil.mjs';
import { prepareThermal, assembleThermal, robinOut, constrainedRowSums, makeSolver, partTemperatures, hottestPart, C_TO_K, SOLVERS, kComponents } from './index.mjs';
import { assembleMass, applyConstraints } from './assemble.mjs';

export const SCHEMES = Object.freeze(['be', 'cn']);

/** Per-cell rho cp (J/m^3 K) and k (6 per cell) at T0 from the resolver. */
function cellProps(grid, resolve, T0) {
  const { cellMat, materials } = grid;
  const n = cellMat.length;
  const rc = new Float64Array(n), k = new Float64Array(6 * n);
  const per = materials.map((key) => {
    let r;
    try {
      r = resolve(key, T0, { need: ['k', 'density', 'cp'] });
    } catch (e) {
      throw new Error(`thermal_transient: material ${key}: ${e.message}`);
    }
    const rho = r?.rho_kg_m3, cp = r?.cp_J_kgK;
    if (!(rho > 0 && cp > 0)) throw new Error(`thermal_transient: material ${key}: rho_kg_m3 and cp_J_kgK are required (got ${rho}, ${cp})`);
    return { rc: rho * cp, k: kComponents(r.k_W_mK, key) };
  });
  let tensor = false;
  for (let c = 0; c < n; c++) {
    const m = cellMat[c];
    if (m < 0) continue;
    rc[c] = per[m].rc;
    k.set(per[m].k, 6 * c);
    if (per[m].k[3] || per[m].k[4] || per[m].k[5]) tensor = true;
  }
  return { rc, kc: { k, tensor } };
}

/** C = a A + b B for two stencils of the same shape. */
function combine(a, A, b, B) {
  const op = createStencil(A.NX, A.NY, A.NZ);
  for (let i = 0; i < op.A.length; i++) op.A[i] = a * A.A[i] + b * B.A[i];
  return op;
}

/**
 * Solve a transient thermal study.
 * @param {object} grid
 * @param {object} thermal SPEC physics.thermal (+ `initial_C`)
 * @param {Function} resolve material resolver (k, rho_kg_m3, cp_J_kgK)
 * @param {object} opt t_end_s, dt_s, scheme ('be' | 'cn'), be_steps (CN start-up, default 2), mass ('consistent' |
 *   'lumped'), output_s (list of times; nearest step), probes ([{name, x_mm, y_mm, z_um}] -> T history at the nearest
 *   node), initial_C (overrides thermal.initial_C), solver, rtol, study
 */
export function solveThermalTransient(grid, thermal, resolve, opt = {}) {
  const { t_end_s, dt_s, scheme = 'be', be_steps = 2, mass = 'consistent', output_s = [], probes = [], solver = 'auto', rtol = 1e-12, maxIter = 1000, study = 's1' } = opt;
  if (!SCHEMES.includes(scheme)) throw new Error(`thermal_transient: scheme must be ${SCHEMES.join(' | ')}`);
  if (!SOLVERS.includes(solver)) throw new Error(`thermal_transient: unknown solver ${solver}`);
  if (!(t_end_s > 0 && dt_s > 0)) throw new Error('thermal_transient: t_end_s > 0 and dt_s > 0 are required');
  const nSteps = Math.round(t_end_s / dt_s);
  if (Math.abs(nSteps * dt_s - t_end_s) > 1e-9 * t_end_s) throw new Error(`thermal_transient: t_end_s ${t_end_s} is not a multiple of dt_s ${dt_s}`);
  const initC = opt.initial_C ?? thermal?.initial_C;
  if (!Number.isFinite(initC)) throw new Error('thermal_transient: initial_C is required (physics.thermal.initial_C or the study)');
  const tA0 = performance.now();
  const T0 = initC + C_TO_K;
  const prep = prepareThermal(grid, thermal, { T0, requireAnchor: false });
  const { N, active, Td } = prep;
  const warnings = [...prep.warnings];
  const { rc, kc } = cellProps(grid, resolve, T0);
  // temperature dependence is not iterated in transient
  for (const key of grid.materials) {
    try {
      if (JSON.stringify(resolve(key, T0, { need: ['k'] })?.k_W_mK) !== JSON.stringify(resolve(key, T0 + 10, { need: ['k'] })?.k_W_mK)) {
        warnings.push(`thermal_transient: k of ${key} depends on T; evaluated at the initial temperature`);
        break;
      }
    } catch {
      /* range probe only */
    }
  }
  const asm = assembleThermal(prep, kc);
  const K = asm.op, F = asm.F;
  const M = createStencil(K.NX, K.NY, K.NZ);
  assembleMass(grid, rc, M, mass === 'lumped');
  const theta = scheme === 'cn' ? 0.5 : 1;
  const nBE = scheme === 'cn' ? Math.min(be_steps, nSteps) : 0;
  // step operators: A = M/dt + th K (constrained copy), B = M/dt - (1 - th) K (unconstrained)
  const mkStep = (th) => {
    const A = combine(1 / dt_s, M, th, K);
    const B = combine(1 / dt_s, M, -(1 - th), K);
    const c = new Float64Array(N);
    const cons = applyConstraints(A, c, Td, active);
    const S = makeSolver(A, grid, { solver, rtol, maxIter });
    return { th, A, B, c, cons, S };
  };
  const tS = performance.now();
  const steps = { main: mkStep(theta) };
  if (nBE) steps.be = theta === 1 ? steps.main : mkStep(1);
  const setupMs = performance.now() - tS;
  // lumped capacity per node (row sums of M) for the stored energy
  const cap = new Float64Array(N);
  for (let n = 0; n < N; n++) for (let s = 0; s < 27; s++) cap[n] += M.A[27 * n + s];
  // probes
  const NX = K.NX, NY = K.NY;
  const near = (arr, v) => { let b = 0; for (let i = 1; i < arr.length; i++) if (Math.abs(arr[i] - v) < Math.abs(arr[b] - v)) b = i; return b; };
  const probeIdx = probes.map((p) => {
    const i = near(grid.xs, p.x_mm * 1e-3), j = near(grid.ys, p.y_mm * 1e-3), k = near(grid.zs, p.z_um * 1e-6);
    return { name: p.name, n: i + NX * (j + NY * k), at_m: [grid.xs[i], grid.ys[j], grid.zs[k]], T_C: [] };
  });
  let x = padded(K);
  const pad = K.pad;
  const bvec = padded(K), Bx = padded(K);
  let Estored = 0, Enet = 0, Eabs = 0, totalIter = 0;
  const outputs = [];
  const wantOut = [...output_s].sort((a, b) => a - b);
  let oi = 0;
  const thetaNow = () => x.subarray(pad, pad + N);
  const tSolve = performance.now();
  for (let s = 0; s < nSteps; s++) {
    const st = s < nBE ? steps.be : steps.main;
    const prev = x.slice();
    applyStencil(st.B, x, Bx);
    for (let n = 0; n < N; n++) {
      const q = pad + n;
      bvec[q] = st.A.fixed[n] ? st.c[n] : Bx[q] + F[n] + st.c[n];
    }
    const res = st.S.solve(bvec, x);
    totalIter += res.iterations ?? 0;
    // energy bookkeeping on this step
    const th1 = x.subarray(pad, pad + N), th0 = prev.subarray(pad, pad + N);
    let dE = 0;
    for (let n = 0; n < N; n++) dE += cap[n] * (th1[n] - th0[n]);
    const Qr = st.th * robinOut(prep, asm.robinFaces, th1) + (1 - st.th) * robinOut(prep, asm.robinFaces, th0);
    // reactions: original A rows . T1 - (B T0)_n - F_n at fixed-T nodes
    const rs = constrainedRowSums(prep, st.cons, st.A, th1);
    let R = 0;
    for (let q = 0; q < rs.length; q++) {
      const n = st.cons.dir[q];
      R += rs[q] - Bx[pad + n] - F[n];
    }
    const net = dt_s * (asm.Qsrc + asm.Qflux - Qr + R);
    Estored += dE;
    Enet += net;
    Eabs += Math.abs(dE) + dt_s * (Math.abs(asm.Qsrc) + Math.abs(asm.Qflux) + Math.abs(Qr) + Math.abs(R));
    const t = (s + 1) * dt_s;
    for (const p of probeIdx) p.T_C.push(th1[p.n] + T0 - C_TO_K);
    while (oi < wantOut.length && wantOut[oi] <= t + 0.5 * dt_s) {
      if (Math.abs(wantOut[oi] - t) > 0.5 * dt_s + 1e-15) break;
      const T = new Float64Array(N);
      for (let n = 0; n < N; n++) T[n] = active[n] ? th1[n] + T0 : NaN;
      outputs.push({ t_s: t, requested_s: wantOut[oi], T_K: T });
      oi++;
    }
  }
  if (oi < wantOut.length) warnings.push(`thermal_transient: output times beyond t_end_s skipped: ${wantOut.slice(oi).join(', ')}`);
  const solveMs = performance.now() - tSolve;
  const th = thetaNow();
  const T = new Float64Array(N);
  for (let n = 0; n < N; n++) T[n] = active[n] ? th[n] + T0 : NaN;
  const partStats = partTemperatures(grid, th, T0);
  const sf = grid.symFactor;
  return {
    study,
    type: 'thermal_transient',
    grid,
    fields: { T_K: T },
    outputs,
    probes: probeIdx.map((p) => ({ name: p.name, at_m: p.at_m, t_s: Array.from({ length: nSteps }, (_, s) => (s + 1) * dt_s), T_C: p.T_C })),
    derived: {
      Tmax_C: hottestPart(partStats),
      parts: partStats,
      energy: { stored_J: Estored * sf, net_in_J: Enet * sf, balance_rel: Eabs > 0 ? Math.abs(Estored - Enet) / Eabs : 0 },
      t_end_s, dt_s, steps: nSteps, scheme, be_start_steps: nBE, mass, symmetry_factor: sf, T0_K: T0,
    },
    timing: { grid_ms: grid.stats?.grid_ms ?? 0, setup_ms: setupMs, solve_ms: solveMs, total_ms: performance.now() - tA0, iterations: totalIter, solver: steps.main.S.kind, nnzL: steps.main.S.nnzL },
    warnings: [...grid.warnings, ...warnings],
  };
}
