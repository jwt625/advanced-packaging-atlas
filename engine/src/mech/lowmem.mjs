// Low-memory operator storage for large elasticity models (lane L8; coordinator request 2026-10-20, M1 blocker:
// cowos_l/warpage_rt_ht at 1.8e6 DOF failed in the browser worker with "Array buffer allocation failed").
// - Operator for the PCG apply: symmetric half block stencil in f64, slots s >= 13 only (centre + 13 upper
//   neighbours): H[(14 n + s - 13) 9 + 3 a + b]; y_n = sum_{s >= 13} H_ns x_{n + off_s} + sum_{s > 13} H_{n - off_s, s}^T
//   x_{n - off_s}. 126 doubles per node instead of 243 (exact, the matrix is symmetric).
// - Preconditioner: L1's block GMG (la/block.mjs) on a full 27-slot copy stored in Float32 (mirrored from H), coarse
//   level operators converted to Float32 after the hierarchy is built (line factors and the coarsest Cholesky stay f64).
//   The arithmetic stays f64; only stored preconditioner coefficients are rounded, so M^-1 is still a fixed symmetric
//   linear operator and PCG keeps its convergence theory; the solution accuracy is set by the f64 operator.
// Same padded vector layout as gmg.mjs / la/block.mjs (DOF a of node n at 3 (pad + n) + a).
// License: GPL-3.0-or-later.

import { stencilOffsets } from '../la/stencil.mjs';
import { createBlockStencil, coarsen1D, finalizeFixed, restrict, prolongAdd, vcycle, buildBlockMG, paddedVec } from './gmg.mjs';
import { inv3 } from './solve.mjs';

const slotOf = (di, dj, dk) => di + 1 + 3 * (dj + 1) + 9 * (dk + 1);
const S_C = 13;

/**
 * Assemble the half stencil directly from elements (q1 / q1im). Returns {op: {NX, NY, NZ, N, H, fixed, off, pad}, rhs}.
 * loadOf(q, c) -> {op: element operator, f: element load}.
 */
export function assembleHalfStencil(grid, num, cons, loadOf) {
  if (num.type === 'q2s') throw new Error('mech lowmem: half stencil is for corner-node elements');
  const NX = grid.nx + 1, NY = grid.ny + 1, NZ = grid.nz + 1, N = NX * NY * NZ, pad = NX * NY + NX + 1;
  const H = new Float64Array(126 * N), fixed = new Uint8Array(3 * N).fill(1), rhs = new Float64Array(3 * (N + 2 * pad));
  for (let r = 0; r < num.nn; r++) { const n = num.ext[r]; for (let a = 0; a < 3; a++) fixed[3 * n + a] = cons.fixed[3 * r + a]; }
  const val = new Float64Array(3 * N);
  for (let r = 0; r < num.nn; r++) for (let a = 0; a < 3; a++) val[3 * num.ext[r] + a] = cons.value[3 * r + a];
  const gl = new Int32Array(8), dslot = new Int32Array(64);
  for (let a = 0; a < 8; a++)
    for (let b = 0; b < 8; b++) dslot[8 * a + b] = slotOf((b & 1) - (a & 1), ((b >> 1) & 1) - ((a >> 1) & 1), ((b >> 2) & 1) - ((a >> 2) & 1));
  for (let q = 0; q < num.cells.length; q++) {
    const { op: e, f } = loadOf(q, num.cells[q]);
    for (let a = 0; a < 8; a++) gl[a] = num.ext[num.conn[8 * q + a]];
    const K = e.K;
    for (let a = 0; a < 8; a++) {
      const n = gl[a];
      for (let i = 0; i < 3; i++) {
        const row = 3 * n + i, li = 3 * a + i;
        if (fixed[row]) continue;
        rhs[3 * (pad + n) + i] += f[li];
        for (let b = 0; b < 8; b++) {
          const m = gl[b], s = dslot[8 * a + b];
          for (let j = 0; j < 3; j++) {
            const kv = K[li * 24 + 3 * b + j];
            if (fixed[3 * m + j]) { const v = val[3 * m + j]; if (v !== 0) rhs[3 * (pad + n) + i] -= kv * v; continue; }
            if (s >= S_C) H[(14 * n + s - S_C) * 9 + 3 * i + j] += kv;
          }
        }
      }
    }
  }
  for (let n = 0; n < N; n++) for (let a = 0; a < 3; a++) if (fixed[3 * n + a]) { H[(14 * n) * 9 + 4 * a] = 1; rhs[3 * (pad + n) + a] = val[3 * n + a]; }
  return { op: { NX, NY, NZ, N, H, fixed, off: stencilOffsets(NX, NY), pad }, rhs };
}

/** y = A x with the half stencil (padded vectors). */
export function applyHalf(op, x, y) {
  const { N, H, off, pad } = op;
  y.fill(0);
  for (let n = 0; n < N; n++) {
    const q = 3 * (pad + n);
    const x0 = x[q], x1 = x[q + 1], x2 = x[q + 2];
    let y0 = 0, y1 = 0, y2 = 0;
    let h = 126 * n;
    // centre block
    y0 += H[h] * x0 + H[h + 1] * x1 + H[h + 2] * x2;
    y1 += H[h + 3] * x0 + H[h + 4] * x1 + H[h + 5] * x2;
    y2 += H[h + 6] * x0 + H[h + 7] * x1 + H[h + 8] * x2;
    h += 9;
    for (let s = 14; s < 27; s++, h += 9) {
      const m = q + 3 * off[s];
      const z0 = x[m], z1 = x[m + 1], z2 = x[m + 2];
      y0 += H[h] * z0 + H[h + 1] * z1 + H[h + 2] * z2;
      y1 += H[h + 3] * z0 + H[h + 4] * z1 + H[h + 5] * z2;
      y2 += H[h + 6] * z0 + H[h + 7] * z1 + H[h + 8] * z2;
      // transpose contribution to the neighbour
      y[m] += H[h] * x0 + H[h + 3] * x1 + H[h + 6] * x2;
      y[m + 1] += H[h + 1] * x0 + H[h + 4] * x1 + H[h + 7] * x2;
      y[m + 2] += H[h + 2] * x0 + H[h + 5] * x1 + H[h + 8] * x2;
    }
    y[q] += y0; y[q + 1] += y1; y[q + 2] += y2;
  }
  // padding stays zero (no couplings leave the grid)
  for (let d = 0; d < 3 * pad; d++) y[d] = 0;
  for (let d = 3 * (pad + N); d < y.length; d++) y[d] = 0;
  return y;
}

/** Full 27-slot block stencil in Float32 mirrored from the half stencil (preconditioner input for la/block.mjs). */
export function fullStencilF32(op) {
  const { NX, NY, NZ, N, H, fixed, off, pad } = op;
  const A = new Float32Array(243 * N);
  for (let n = 0; n < N; n++) {
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    for (let s = 13; s < 27; s++) {
      const di = (s % 3) - 1, dj = (Math.floor(s / 3) % 3) - 1, dk = Math.floor(s / 9) - 1;
      const ii = i + di, jj = j + dj, kk = k + dk;
      if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ) continue;
      const h = (14 * n + s - 13) * 9, m = n + off[s];
      for (let e = 0; e < 9; e++) A[(27 * n + s) * 9 + e] = H[h + e];
      if (s > 13) for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) A[(27 * m + 26 - s) * 9 + 3 * b + a] = H[h + 3 * a + b];
    }
  }
  return { bs: 3, NX, NY, NZ, N, A, fixed: Uint8Array.from(fixed), off, pad };
}

/** Convert the stored operators of the intermediate MG levels to Float32 (after the hierarchy is built). */
export function compressHierarchy(mg, { includeFirst = false } = {}) {
  let saved = 0;
  mg.levels.forEach((lev, l) => {
    if ((l === 0 && !includeFirst) || lev.direct || !(lev.op.A instanceof Float64Array)) return;
    saved += lev.op.A.length * 4;
    lev.op.A = Float32Array.from(lev.op.A);
  });
  return saved;
}

// ---- multigrid with a half-stencil fine level (no full fine copy) ------------------------------------------------

const SDI = Int8Array.from({ length: 27 }, (_, s) => (s % 3) - 1);
const SDJ = Int8Array.from({ length: 27 }, (_, s) => (Math.floor(s / 3) % 3) - 1);
const SDK = Int8Array.from({ length: 27 }, (_, s) => Math.floor(s / 9) - 1);

/** Copy the full-operator block (n, s) into B (row-major 3 x 3); false when the neighbour is outside the grid. */
function fullBlock(op, i, j, k, n, s, B) {
  const ii = i + SDI[s], jj = j + SDJ[s], kk = k + SDK[s];
  if (ii < 0 || jj < 0 || kk < 0 || ii >= op.NX || jj >= op.NY || kk >= op.NZ) return false;
  const H = op.H;
  if (s >= 13) { const h = (14 * n + s - 13) * 9; for (let e = 0; e < 9; e++) B[e] = H[h + e]; }
  else {
    const m = n + op.off[s], h = (14 * m + 13 - s) * 9; // slot 26 - s of m
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) B[3 * a + b] = H[h + 3 * b + a];
  }
  return true;
}

/** Block-Thomas factors along z from the half stencil. */
function halfLineFactors(op) {
  const { NX, NY, NZ, N, H } = op, P = NX * NY;
  const Dinv = new Float64Array(9 * N), Cp = new Float64Array(9 * N), M = new Array(9), L = new Float64Array(9);
  for (let col = 0; col < P; col++)
    for (let k = 0, n = col; k < NZ; k++, n += P) {
      const c = 126 * n;
      for (let e = 0; e < 9; e++) M[e] = H[c + e];
      if (k > 0) {
        // L = coupling of n to n - P = (H[n - P][slot 22])^T; M -= L Cp_{k-1}
        const h = (14 * (n - P) + 9) * 9;
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) L[3 * a + b] = H[h + 3 * b + a];
        const q = 9 * (n - P);
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) M[3 * a + b] -= L[3 * a] * Cp[q + b] + L[3 * a + 1] * Cp[q + 3 + b] + L[3 * a + 2] * Cp[q + 6 + b];
      }
      inv3(M, Dinv, 9 * n);
      if (k < NZ - 1) {
        const h = (14 * n + 9) * 9, d = 9 * n; // U = H[n][slot 22]
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) Cp[d + 3 * a + b] = Dinv[d + 3 * a] * H[h + b] + Dinv[d + 3 * a + 1] * H[h + 3 + b] + Dinv[d + 3 * a + 2] * H[h + 6 + b];
      }
    }
  return { Dinv, Cp };
}

/** Four-colour z-line block Gauss-Seidel sweep on the half stencil (as gmg.mjs lineSweep). */
function halfLineSweep(lev, b, x, forward, T) {
  const { op, Dinv, Cp } = lev;
  const { NX, NY, NZ, N, H, off, pad } = op, P = NX * NY;
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc, ci = color & 1, cj = color >> 1;
    for (let k = 0; k < NZ; k++)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = 3 * (pad + n);
          let r0 = b[q], r1 = b[q + 1], r2 = b[q + 2];
          // upper slots of n (except the z+ line neighbour)
          let h = 126 * n + 9;
          for (let s = 14; s < 27; s++, h += 9) {
            if (s === 22) continue;
            const o = q + 3 * off[s], z0 = x[o], z1 = x[o + 1], z2 = x[o + 2];
            if (z0 === 0 && z1 === 0 && z2 === 0) continue;
            r0 -= H[h] * z0 + H[h + 1] * z1 + H[h + 2] * z2;
            r1 -= H[h + 3] * z0 + H[h + 4] * z1 + H[h + 5] * z2;
            r2 -= H[h + 6] * z0 + H[h + 7] * z1 + H[h + 8] * z2;
          }
          // lower slots: transposed upper block of the neighbour (except the z- line neighbour)
          for (let s = 0; s < 13; s++) {
            if (s === 4) continue;
            const m = n + off[s];
            if (m < 0 || m >= N) continue;
            const o = 3 * (pad + m), z0 = x[o], z1 = x[o + 1], z2 = x[o + 2];
            if (z0 === 0 && z1 === 0 && z2 === 0) continue;
            const g = (14 * m + 13 - s) * 9;
            r0 -= H[g] * z0 + H[g + 3] * z1 + H[g + 6] * z2;
            r1 -= H[g + 1] * z0 + H[g + 4] * z1 + H[g + 7] * z2;
            r2 -= H[g + 2] * z0 + H[g + 5] * z1 + H[g + 8] * z2;
          }
          if (k > 0) {
            const g = (14 * (n - P) + 9) * 9, t = 3 * (n - P), t0 = T[t], t1 = T[t + 1], t2 = T[t + 2];
            r0 -= H[g] * t0 + H[g + 3] * t1 + H[g + 6] * t2;
            r1 -= H[g + 1] * t0 + H[g + 4] * t1 + H[g + 7] * t2;
            r2 -= H[g + 2] * t0 + H[g + 5] * t1 + H[g + 8] * t2;
          }
          const d = 9 * n;
          T[3 * n] = Dinv[d] * r0 + Dinv[d + 1] * r1 + Dinv[d + 2] * r2;
          T[3 * n + 1] = Dinv[d + 3] * r0 + Dinv[d + 4] * r1 + Dinv[d + 5] * r2;
          T[3 * n + 2] = Dinv[d + 6] * r0 + Dinv[d + 7] * r1 + Dinv[d + 8] * r2;
        }
    for (let k = NZ - 1; k >= 0; k--)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = 3 * (pad + n);
          if (k === NZ - 1) { x[q] = T[3 * n]; x[q + 1] = T[3 * n + 1]; x[q + 2] = T[3 * n + 2]; continue; }
          const c = 9 * n, o = 3 * (pad + n + P), y0 = x[o], y1 = x[o + 1], y2 = x[o + 2];
          x[q] = T[3 * n] - (Cp[c] * y0 + Cp[c + 1] * y1 + Cp[c + 2] * y2);
          x[q + 1] = T[3 * n + 1] - (Cp[c + 3] * y0 + Cp[c + 4] * y1 + Cp[c + 5] * y2);
          x[q + 2] = T[3 * n + 2] - (Cp[c + 6] * y0 + Cp[c + 7] * y1 + Cp[c + 8] * y2);
        }
  }
}

/** Galerkin coarse operator P^T A P from the half stencil in one pass (x and y coarsened together). */
function halfRAP(op, mx, my) {
  const { NX, NY, NZ, fixed } = op;
  const NXc = mx ? mx.nc : NX, NYc = my ? my.nc : NY;
  const cop = createBlockStencil(NXc, NYc, NZ);
  const Ac = cop.A, B = new Float64Array(9);
  const par = (map, i) => (map ? (map.wR[i] !== 0 ? [[map.cL[i], map.wL[i]], [map.cR[i], map.wR[i]]] : [[map.cL[i], map.wL[i]]]) : [[i, 1]]);
  const PX = Array.from({ length: NX }, (_, i) => par(mx, i)), PY = Array.from({ length: NY }, (_, j) => par(my, j));
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        if (fixed[3 * n] && fixed[3 * n + 1] && fixed[3 * n + 2]) continue;
        for (let s = 0; s < 27; s++) {
          if (!fullBlock(op, i, j, k, n, s, B)) continue;
          let nz = false;
          for (let e = 0; e < 9; e++) if (B[e] !== 0) { nz = true; break; }
          if (!nz) continue;
          for (let a = 0; a < 3; a++) if (fixed[3 * n + a]) B[3 * a] = B[3 * a + 1] = B[3 * a + 2] = 0;
          const im = i + SDI[s], jm = j + SDJ[s];
          for (const [I, wi] of PX[i]) for (const [J, wj] of PY[j]) {
            const Pn = I + NXc * (J + NYc * k), wP = wi * wj;
            for (const [Iq, vi] of PX[im]) for (const [Jq, vj] of PY[jm]) {
              const cs = Iq - I + 1 + 3 * (Jq - J + 1) + 9 * (SDK[s] + 1), w = wP * vi * vj, base = (27 * Pn + cs) * 9;
              for (let e = 0; e < 9; e++) Ac[base + e] += w * B[e];
            }
          }
        }
      }
  finalizeFixed(cop);
  return cop;
}

/**
 * Hierarchy with a half-stencil fine level: fine z-line smoother and residual on H (f64), coarse levels from one
 * Galerkin pass (halfRAP), then this module's gmg.mjs hierarchy below, coarse operators stored in Float32.
 */
export function buildHalfMG(op, xs, ys, { coarseMax = 4000, nu = 2, f32 = true } = {}) {
  const t0 = performance.now();
  const canX = op.NX >= 4, canY = op.NY >= 4;
  const lev0 = { op, mapX: canX ? coarsen1D(xs) : null, mapY: canY ? coarsen1D(ys) : null, ...halfLineFactors(op) };
  lev0.T = new Float64Array(3 * op.N);
  lev0.r = paddedVec(op);
  const cop = halfRAP(op, lev0.mapX, lev0.mapY);
  const sub = buildBlockMG(cop, lev0.mapX ? lev0.mapX.xs : xs, lev0.mapY ? lev0.mapY.xs : ys, { coarseMax, nu });
  const saved = f32 ? compressHierarchy(sub, { includeFirst: true }) : 0;
  const c0 = sub.levels[0];
  c0.b = paddedVec(c0.op);
  c0.x = paddedVec(c0.op);
  const NXc = lev0.mapX ? lev0.mapX.nc : op.NX;
  lev0.tmp = new Float64Array(3 * NXc * op.NY * op.NZ);
  const precond = (b, x) => {
    x.fill(0);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, true, lev0.T);
    applyHalf(op, x, lev0.r);
    const r = lev0.r, p3 = 3 * op.pad;
    for (let d = p3; d < p3 + 3 * op.N; d++) r[d] = b[d] - r[d];
    restrict(lev0, c0, r, c0.b, lev0.tmp);
    vcycle(sub, 0, c0.b, c0.x);
    prolongAdd(lev0, c0, c0.x, x);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, false, lev0.T);
  };
  return {
    precond,
    stats: { impl: 'l8-half', levels: 1 + sub.levels.length, nodes: [op.N, ...sub.stats.nodes], coarse_dof: sub.stats.coarse_dof, f32_saved_MB: Math.round(saved / 2 ** 20), setup_ms: performance.now() - t0 },
  };
}
