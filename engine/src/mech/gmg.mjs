// Geometric multigrid for 3 DOF/node elasticity on the rectilinear grid (tranche E2; DevLog-010 A4; R2 1, 8.4).
// Block stencil: 27 neighbours x 3 x 3 blocks per node, A[(27 n + s) 9 + 3 a + b], slot s = (di + 1) + 3 (dj + 1) +
// 9 (dk + 1) (as la/stencil.mjs), node n = i + NX (j + NY k) over the full tensor corner grid. Vectors are padded:
// DOF a of node n at 3 (pad + n) + a, pad = NX NY + NX + 1, so the branch-free apply never leaves the array.
// Inactive nodes and constrained DOFs are identity rows with zero couplings.
// Hierarchy (as la/mg.mjs, extended to blocks): x-y semi-coarsening (z keeps every node plane), linear interpolation
// by node coordinates applied per component (P = Px (x) Py (x) I_z (x) I_3, which reproduces the 6 rigid-body modes
// exactly), Galerkin coarse operators (separable RAP: x pass then y pass), symmetric 4-colour z-line block-tridiagonal
// Gauss-Seidel smoother (forward before, backward after the coarse correction), supernodal Cholesky on the coarsest
// level. Constrained fine DOFs get zero interpolation weight; coarse DOFs without free support become fixed.
// q2s: two-level p-multigrid on top: damped 3 x 3 block-Jacobi smoothing (omega = 1 / (1.05 lambda_max), power
// iteration) on the q2s CSR level, coarse space = the
// Q1 functions embedded in q2s (mid-edge value = mean of its two corners), coarse operator P^T K P as a block stencil,
// solved approximately by one V-cycle of the hierarchy above.
// License: GPL-3.0-or-later.

import { stencilOffsets, gridNDOrder } from '../la/stencil.mjs';
import { SparseCholesky } from '../la/sparse.mjs';
import { inv3 } from './solve.mjs';
import { nodeCounts } from './numbering.mjs';

const SDI = Int8Array.from({ length: 27 }, (_, s) => (s % 3) - 1);
const SDJ = Int8Array.from({ length: 27 }, (_, s) => (Math.floor(s / 3) % 3) - 1);
const S_C = 13, S_ZM = 4, S_ZP = 22;
const slotOf = (di, dj, dk) => di + 1 + 3 * (dj + 1) + 9 * (dk + 1);

/** Empty block-stencil operator. */
export function createBlockStencil(NX, NY, NZ) {
  const N = NX * NY * NZ;
  return { NX, NY, NZ, N, A: new Float64Array(243 * N), fixed: new Uint8Array(3 * N), off: stencilOffsets(NX, NY), pad: NX * NY + NX + 1 };
}

/** Padded vector of an operator. */
export const paddedVec = (op) => new Float64Array(3 * (op.N + 2 * op.pad));

/** y = A x on padded vectors. */
export function applyBlock(op, x, y) {
  const { N, A, off, pad } = op;
  for (let n = 0; n < N; n++) {
    const q = pad + n;
    let y0 = 0, y1 = 0, y2 = 0;
    let a = 243 * n;
    for (let s = 0; s < 27; s++, a += 9) {
      const o = 3 * (q + off[s]);
      const x0 = x[o], x1 = x[o + 1], x2 = x[o + 2];
      if (x0 === 0 && x1 === 0 && x2 === 0) continue;
      y0 += A[a] * x0 + A[a + 1] * x1 + A[a + 2] * x2;
      y1 += A[a + 3] * x0 + A[a + 4] * x1 + A[a + 5] * x2;
      y2 += A[a + 6] * x0 + A[a + 7] * x1 + A[a + 8] * x2;
    }
    y[3 * q] = y0; y[3 * q + 1] = y1; y[3 * q + 2] = y2;
  }
  return y;
}

/** Identity rows on fixed DOFs; DOFs whose diagonal vanished become fixed. */
export function finalizeFixed(op) {
  const { N, A, fixed } = op;
  let dmax = 0;
  for (let n = 0; n < N; n++) for (let a = 0; a < 3; a++) dmax = Math.max(dmax, A[(27 * n + S_C) * 9 + 4 * a]);
  for (let n = 0; n < N; n++)
    for (let a = 0; a < 3; a++) {
      const d = A[(27 * n + S_C) * 9 + 4 * a];
      if (!fixed[3 * n + a] && d > 1e-300 * dmax && d > 0) continue;
      fixed[3 * n + a] = 1;
      // zero the row and the column (column entries live in the neighbours' rows)
      for (let s = 0; s < 27; s++) for (let b = 0; b < 3; b++) A[(27 * n + s) * 9 + 3 * a + b] = 0;
      for (let s = 0; s < 27; s++) {
        const m = n + op.off[s];
        if (m < 0 || m >= N) continue;
        const sm = 26 - s; // slot of n seen from m
        for (let b = 0; b < 3; b++) A[(27 * m + sm) * 9 + 3 * b + a] = 0;
      }
      A[(27 * n + S_C) * 9 + 4 * a] = 1;
    }
}

/**
 * Assemble the block stencil directly from elements (q1 / q1im only): free-free couplings, lifting of prescribed
 * values into the padded rhs, identity rows elsewhere. Returns {op, rhs (padded)}.
 */
export function assembleBlockStencil(grid, num, mats, temp, cons, provider, loadOf) {
  if (num.type === 'q2s') throw new Error('mech gmg: block stencil assembly is for corner-node elements');
  const NX = grid.nx + 1, NY = grid.ny + 1, NZ = grid.nz + 1;
  const op = createBlockStencil(NX, NY, NZ);
  const rhs = paddedVec(op);
  const { A, fixed: fx, pad } = op;
  // fixed flags: inactive nodes and constrained DOFs
  fx.fill(1);
  for (let r = 0; r < num.nn; r++) {
    const n = num.ext[r];
    for (let a = 0; a < 3; a++) fx[3 * n + a] = cons.fixed[3 * r + a];
  }
  const val = new Float64Array(3 * op.N);
  for (let r = 0; r < num.nn; r++) for (let a = 0; a < 3; a++) val[3 * num.ext[r] + a] = cons.value[3 * r + a];
  const nen = 8, gl = new Int32Array(8), dslot = new Int32Array(64);
  for (let q = 0; q < num.cells.length; q++) {
    const c = num.cells[q];
    const { op: e, f } = loadOf(q, c);
    for (let a = 0; a < nen; a++) gl[a] = num.ext[num.conn[q * nen + a]];
    for (let a = 0; a < 8; a++)
      for (let b = 0; b < 8; b++)
        dslot[8 * a + b] = slotOf((b & 1) - (a & 1), ((b >> 1) & 1) - ((a >> 1) & 1), ((b >> 2) & 1) - ((a >> 2) & 1));
    const K = e.K;
    for (let a = 0; a < 8; a++) {
      const n = gl[a];
      for (let i = 0; i < 3; i++) {
        const row = 3 * n + i, li = 3 * a + i;
        if (fx[row]) continue;
        rhs[3 * (pad + n) + i] += f[li];
        for (let b = 0; b < 8; b++) {
          const m = gl[b], base = (27 * n + dslot[8 * a + b]) * 9 + 3 * i;
          for (let j = 0; j < 3; j++) {
            const kv = K[li * 24 + 3 * b + j];
            if (fx[3 * m + j]) { const v = val[3 * m + j]; if (v !== 0) rhs[3 * (pad + n) + i] -= kv * v; }
            else A[base + j] += kv;
          }
        }
      }
    }
  }
  for (let n = 0; n < op.N; n++) for (let a = 0; a < 3; a++) if (fx[3 * n + a]) { A[(27 * n + S_C) * 9 + 4 * a] = 1; rhs[3 * (pad + n) + a] = val[3 * n + a]; }
  return { op, rhs };
}

/** 1D coarsening of node coordinates: coarse = even indices plus the last node (la/mg.mjs). */
export function coarsen1D(xs) {
  const n = xs.length;
  const cIdx = [];
  for (let i = 0; i < n; i += 2) cIdx.push(i);
  if (cIdx[cIdx.length - 1] !== n - 1) cIdx.push(n - 1);
  const cOf = new Int32Array(n).fill(-1);
  cIdx.forEach((f, c) => (cOf[f] = c));
  const cL = new Int32Array(n), cR = new Int32Array(n), wL = new Float64Array(n), wR = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (cOf[i] >= 0) { cL[i] = cR[i] = cOf[i]; wL[i] = 1; wR[i] = 0; }
    else {
      cL[i] = cOf[i - 1]; cR[i] = cOf[i + 1];
      wL[i] = (xs[i + 1] - xs[i]) / (xs[i + 1] - xs[i - 1]);
      wR[i] = 1 - wL[i];
    }
  }
  return { nc: cIdx.length, cL, cR, wL, wR, xs: Float64Array.from(cIdx, (f) => xs[f]) };
}

/** Galerkin product along one axis (0 = x, 1 = y) on block stencils; fixed fine rows skipped. */
function rapAxis(op, axis, map) {
  const { NX, NY, NZ, A, fixed } = op;
  const NXc = axis === 0 ? map.nc : NX, NYc = axis === 1 ? map.nc : NY;
  const cop = createBlockStencil(NXc, NYc, NZ);
  const Ac = cop.A;
  const { cL, cR, wL, wR } = map;
  const st = axis === 0 ? 1 : 3, SD = axis === 0 ? SDI : SDJ;
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        const ia = axis === 0 ? i : j;
        const I0 = cL[ia], I1 = cR[ia], w0 = wL[ia], w1 = wR[ia];
        const r0 = axis === 0 ? I0 + NXc * (j + NY * k) : i + NX * (I0 + NYc * k);
        const r1 = axis === 0 ? I1 + NXc * (j + NY * k) : i + NX * (I1 + NYc * k);
        for (let s = 0; s < 27; s++) {
          const base = (27 * n + s) * 9;
          const d = SD[s];
          const rest = s - st * (d + 1) + st;
          const ja = ia + d;
          if (ja < 0 || ja >= (axis === 0 ? NX : NY)) continue;
          const J0 = cL[ja], J1 = cR[ja], v0 = wL[ja], v1 = wR[ja];
          const s00 = rest + st * (J0 - I0), s01 = rest + st * (J1 - I0), s10 = rest + st * (J0 - I1), s11 = rest + st * (J1 - I1);
          for (let a = 0; a < 3; a++) {
            if (fixed[3 * n + a]) continue;
            for (let b = 0; b < 3; b++) {
              const v = A[base + 3 * a + b];
              if (v === 0) continue;
              const e = 3 * a + b;
              const a0 = w0 * v;
              Ac[(27 * r0 + s00) * 9 + e] += a0 * v0;
              if (v1 !== 0) Ac[(27 * r0 + s01) * 9 + e] += a0 * v1;
              if (w1 !== 0) {
                const a1 = w1 * v;
                Ac[(27 * r1 + s10) * 9 + e] += a1 * v0;
                if (v1 !== 0) Ac[(27 * r1 + s11) * 9 + e] += a1 * v1;
              }
            }
          }
        }
      }
  return cop;
}

export function mul3(A, ao, B, bo, C, co) {
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) C[co + 3 * i + j] = A[ao + 3 * i] * B[bo + j] + A[ao + 3 * i + 1] * B[bo + 3 + j] + A[ao + 3 * i + 2] * B[bo + 6 + j];
}

/** Block-Thomas factors of every z column: Dinv_k = (D_k - L_k Cp_{k-1})^-1, Cp_k = Dinv_k U_k. */
function lineFactors(op) {
  const { NX, NY, NZ, A, N } = op;
  const P = NX * NY;
  const Dinv = new Float64Array(9 * N), Cp = new Float64Array(9 * N), M = new Array(9), T = new Float64Array(9);
  for (let col = 0; col < P; col++) {
    for (let k = 0, n = col; k < NZ; k++, n += P) {
      const dB = (27 * n + S_C) * 9;
      for (let e = 0; e < 9; e++) M[e] = A[dB + e];
      if (k > 0) {
        mul3(A, (27 * n + S_ZM) * 9, Cp, 9 * (n - P), T, 0);
        for (let e = 0; e < 9; e++) M[e] -= T[e];
      }
      inv3(M, Dinv, 9 * n);
      if (k < NZ - 1) mul3(Dinv, 9 * n, A, (27 * n + S_ZP) * 9, Cp, 9 * n);
    }
  }
  return { Dinv, Cp };
}

/** One 4-colour z-line block Gauss-Seidel sweep (forward colours 0..3 or backward 3..0). T: 3N scratch. */
function lineSweep(lev, b, x, forward, T) {
  const { op, Dinv, Cp } = lev;
  const { NX, NY, NZ, A, off, pad } = op;
  const P = NX * NY;
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc;
    const ci = color & 1, cj = color >> 1;
    for (let k = 0; k < NZ; k++)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = pad + n;
          let r0 = b[3 * q], r1 = b[3 * q + 1], r2 = b[3 * q + 2];
          let a = 243 * n;
          for (let s = 0; s < 27; s++, a += 9) {
            if (s === S_C || s === S_ZM || s === S_ZP) continue;
            const o = 3 * (q + off[s]);
            const x0 = x[o], x1 = x[o + 1], x2 = x[o + 2];
            if (x0 === 0 && x1 === 0 && x2 === 0) continue;
            r0 -= A[a] * x0 + A[a + 1] * x1 + A[a + 2] * x2;
            r1 -= A[a + 3] * x0 + A[a + 4] * x1 + A[a + 5] * x2;
            r2 -= A[a + 6] * x0 + A[a + 7] * x1 + A[a + 8] * x2;
          }
          if (k > 0) {
            const l = (27 * n + S_ZM) * 9, t = 3 * (n - P);
            const t0 = T[t], t1 = T[t + 1], t2 = T[t + 2];
            r0 -= A[l] * t0 + A[l + 1] * t1 + A[l + 2] * t2;
            r1 -= A[l + 3] * t0 + A[l + 4] * t1 + A[l + 5] * t2;
            r2 -= A[l + 6] * t0 + A[l + 7] * t1 + A[l + 8] * t2;
          }
          const d = 9 * n;
          T[3 * n] = Dinv[d] * r0 + Dinv[d + 1] * r1 + Dinv[d + 2] * r2;
          T[3 * n + 1] = Dinv[d + 3] * r0 + Dinv[d + 4] * r1 + Dinv[d + 5] * r2;
          T[3 * n + 2] = Dinv[d + 6] * r0 + Dinv[d + 7] * r1 + Dinv[d + 8] * r2;
        }
    for (let k = NZ - 1; k >= 0; k--)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = pad + n;
          if (k === NZ - 1) { x[3 * q] = T[3 * n]; x[3 * q + 1] = T[3 * n + 1]; x[3 * q + 2] = T[3 * n + 2]; continue; }
          const c = 9 * n, o = 3 * (q + P);
          const y0 = x[o], y1 = x[o + 1], y2 = x[o + 2];
          x[3 * q] = T[3 * n] - (Cp[c] * y0 + Cp[c + 1] * y1 + Cp[c + 2] * y2);
          x[3 * q + 1] = T[3 * n + 1] - (Cp[c + 3] * y0 + Cp[c + 4] * y1 + Cp[c + 5] * y2);
          x[3 * q + 2] = T[3 * n + 2] - (Cp[c + 6] * y0 + Cp[c + 7] * y1 + Cp[c + 8] * y2);
        }
  }
}

/** Direct solver on the free DOFs of a block stencil (grid nested dissection on nodes, expanded to DOFs). */
class BlockStencilCholesky {
  constructor(op) {
    const { N, A, fixed, off, NX, NY, NZ } = op;
    const map = new Int32Array(3 * N).fill(-1);
    let nf = 0;
    const nodeMap = new Int32Array(N).fill(-1);
    for (let n = 0; n < N; n++) {
      let any = false;
      for (let a = 0; a < 3; a++) if (!fixed[3 * n + a]) { map[3 * n + a] = nf++; any = true; }
      if (any) nodeMap[n] = 1;
    }
    // node-level ND, then DOFs of each node in order
    let k = 0;
    for (let n = 0; n < N; n++) if (nodeMap[n] > 0) nodeMap[n] = k++;
    const permN = gridNDOrder(NX, NY, NZ, nodeMap);
    const nodeOfRank = new Int32Array(k);
    for (let n = 0; n < N; n++) if (nodeMap[n] >= 0) nodeOfRank[nodeMap[n]] = n;
    const perm = [];
    for (const r of permN) { const n = nodeOfRank[r]; for (let a = 0; a < 3; a++) if (map[3 * n + a] >= 0) perm.push(map[3 * n + a]); }
    // CSR of free DOFs
    const rowptr = new Int32Array(nf + 1);
    const cols = [], vals = [];
    const inv = new Int32Array(nf);
    for (let n = 0; n < N; n++) for (let a = 0; a < 3; a++) if (map[3 * n + a] >= 0) inv[map[3 * n + a]] = 3 * n + a;
    for (let r = 0; r < nf; r++) {
      const d = inv[r], n = (d / 3) | 0, a = d % 3;
      const ent = [];
      for (let s = 0; s < 27; s++) {
        const m = n + off[s];
        if (m < 0 || m >= N) continue;
        for (let b = 0; b < 3; b++) {
          const c = map[3 * m + b];
          if (c < 0) continue;
          const v = A[(27 * n + s) * 9 + 3 * a + b];
          if (v !== 0 || c === r) ent.push([c, v]);
        }
      }
      ent.sort((p, q) => p[0] - q[0]);
      for (const [c, v] of ent) { cols.push(c); vals.push(v); }
      rowptr[r + 1] = cols.length;
    }
    const pat = { n: nf, rowptr, colidx: Int32Array.from(cols), nnz: cols.length };
    this.chol = new SparseCholesky(pat, Int32Array.from(perm));
    if (!this.chol.factor(Float64Array.from(vals))) throw new Error('mech gmg: coarse operator not positive definite');
    this.map = map; this.inv = inv; this.op = op;
    this.b = new Float64Array(nf); this.x = new Float64Array(nf);
    this.n = nf; this.nnzL = this.chol.nnzL;
  }
  solvePadded(b, x) {
    const { inv, op } = this, pad = op.pad;
    for (let r = 0; r < inv.length; r++) { const d = inv[r]; this.b[r] = b[3 * pad + d]; }
    this.chol.solve(this.b, this.x);
    for (let d = 0; d < 3 * op.N; d++) if (op.fixed[d]) x[3 * pad + d] = b[3 * pad + d];
    for (let r = 0; r < inv.length; r++) x[3 * pad + inv[r]] = this.x[r];
  }
}

/** r_c = P^T r (padded in and out); tmp holds the x-coarsened intermediate. Coarse fixed rows get 0. */
export function restrict(fine, coarse, r, rc, tmp) {
  const { NX, NY, NZ, pad } = fine.op;
  const mx = fine.mapX, my = fine.mapY;
  const NXc = mx ? mx.nc : NX;
  tmp.fill(0);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const o = 3 * (pad + i + NX * (j + NY * k));
        const v0 = r[o], v1 = r[o + 1], v2 = r[o + 2];
        if (v0 === 0 && v1 === 0 && v2 === 0) continue;
        const base = NXc * (j + NY * k);
        if (!mx) { const t = 3 * (base + i); tmp[t] += v0; tmp[t + 1] += v1; tmp[t + 2] += v2; }
        else {
          let t = 3 * (base + mx.cL[i]), w = mx.wL[i];
          tmp[t] += w * v0; tmp[t + 1] += w * v1; tmp[t + 2] += w * v2;
          w = mx.wR[i];
          if (w !== 0) { t = 3 * (base + mx.cR[i]); tmp[t] += w * v0; tmp[t + 1] += w * v1; tmp[t + 2] += w * v2; }
        }
      }
  const cop = coarse.op, NYc = cop.NY, cp = cop.pad;
  rc.fill(0);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NXc; i++) {
        const t = 3 * (i + NXc * (j + NY * k));
        const v0 = tmp[t], v1 = tmp[t + 1], v2 = tmp[t + 2];
        if (v0 === 0 && v1 === 0 && v2 === 0) continue;
        if (!my) { const o = 3 * (cp + i + NXc * (j + NYc * k)); rc[o] += v0; rc[o + 1] += v1; rc[o + 2] += v2; }
        else {
          let o = 3 * (cp + i + NXc * (my.cL[j] + NYc * k)), w = my.wL[j];
          rc[o] += w * v0; rc[o + 1] += w * v1; rc[o + 2] += w * v2;
          w = my.wR[j];
          if (w !== 0) { o = 3 * (cp + i + NXc * (my.cR[j] + NYc * k)); rc[o] += w * v0; rc[o + 1] += w * v1; rc[o + 2] += w * v2; }
        }
      }
  for (let d = 0; d < 3 * cop.N; d++) if (cop.fixed[d]) rc[3 * cp + d] = 0;
}

/** x += P e_c on free fine DOFs. */
export function prolongAdd(fine, coarse, ec, x) {
  const { NX, NY, NZ, pad, fixed } = fine.op;
  const mx = fine.mapX, my = fine.mapY;
  const cop = coarse.op, NXc = cop.NX, NYc = cop.NY, cp = cop.pad;
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++) {
      const jL = my ? my.cL[j] : j, jR = my ? my.cR[j] : j, wjL = my ? my.wL[j] : 1, wjR = my ? my.wR[j] : 0;
      const rowL = cp + NXc * (jL + NYc * k), rowR = cp + NXc * (jR + NYc * k);
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        const iL = mx ? mx.cL[i] : i, iR = mx ? mx.cR[i] : i, wiL = mx ? mx.wL[i] : 1, wiR = mx ? mx.wR[i] : 0;
        for (let a = 0; a < 3; a++) {
          if (fixed[3 * n + a]) continue;
          let v = wjL * (wiL * ec[3 * (rowL + iL) + a] + (wiR ? wiR * ec[3 * (rowL + iR) + a] : 0));
          if (wjR) v += wjR * (wiL * ec[3 * (rowR + iL) + a] + (wiR ? wiR * ec[3 * (rowR + iR) + a] : 0));
          x[3 * (pad + n) + a] += v;
        }
      }
    }
}

/**
 * Build the hierarchy on a fine block stencil with node coordinates xs, ys.
 * @param {{coarseMax?: number, nu?: number}} [opt] coarseMax in nodes (default 4000)
 */
export function buildBlockMG(op, xs, ys, { coarseMax = 4000, maxLevels = 30, nu = 1 } = {}) {
  const t0 = performance.now();
  const levels = [];
  let cur = op, cx = xs, cy = ys;
  for (let l = 0; l < maxLevels; l++) {
    const lev = { op: cur, mapX: null, mapY: null };
    levels.push(lev);
    const canX = cur.NX >= 4, canY = cur.NY >= 4;
    if (cur.N <= coarseMax || (!canX && !canY)) break;
    let next = cur;
    if (canX) { lev.mapX = coarsen1D(cx); next = rapAxis(next, 0, lev.mapX); cx = lev.mapX.xs; }
    if (canY) {
      lev.mapY = coarsen1D(cy);
      if (canX) next.fixed.fill(0);
      next = rapAxis(next, 1, lev.mapY);
      cy = lev.mapY.xs;
    }
    finalizeFixed(next);
    cur = next;
  }
  for (let l = 0; l < levels.length; l++) {
    const lev = levels[l], last = l === levels.length - 1;
    if (last) lev.direct = new BlockStencilCholesky(lev.op);
    else Object.assign(lev, lineFactors(lev.op));
    lev.T = new Float64Array(3 * lev.op.N);
    if (l > 0) { lev.b = paddedVec(lev.op); lev.x = paddedVec(lev.op); }
    lev.r = paddedVec(lev.op);
    if (!last) { const NXc = lev.mapX ? lev.mapX.nc : lev.op.NX; lev.tmp = new Float64Array(3 * NXc * lev.op.NY * lev.op.NZ); }
  }
  const mg = { levels, nu, setup_ms: performance.now() - t0 };
  mg.stats = {
    levels: levels.length, nodes: levels.map((l) => l.op.N), coarse_dof: levels[levels.length - 1].direct.n,
    coarse_nnzL: levels[levels.length - 1].direct.nnzL, operator_complexity: levels.reduce((a, l) => a + l.op.N, 0) / op.N,
    setup_ms: mg.setup_ms,
  };
  return mg;
}

export function vcycle(mg, l, b, x) {
  const lev = mg.levels[l];
  if (lev.direct) { lev.direct.solvePadded(b, x); return; }
  const { op, T } = lev;
  x.fill(0);
  for (let s = 0; s < mg.nu; s++) lineSweep(lev, b, x, true, T);
  applyBlock(op, x, lev.r);
  const r = lev.r, p3 = 3 * op.pad, n3 = 3 * op.N;
  for (let d = p3; d < p3 + n3; d++) r[d] = b[d] - r[d];
  const cl = mg.levels[l + 1];
  restrict(lev, cl, r, cl.b, lev.tmp);
  vcycle(mg, l + 1, cl.b, cl.x);
  prolongAdd(lev, cl, cl.x, x);
  for (let s = 0; s < mg.nu; s++) lineSweep(lev, b, x, false, T);
}

/** z = M^-1 r on padded fine vectors (one V-cycle). */
export function blockMGPrecond(mg) {
  return (r, z) => vcycle(mg, 0, r, z);
}

/** Map a compact DOF vector (assemble.mjs layout) to / from the padded tensor layout. */
export function toPadded(op, num, v, out = paddedVec(op)) {
  for (let r = 0; r < num.nn; r++) { const o = 3 * (op.pad + num.ext[r]); out[o] = v[3 * r]; out[o + 1] = v[3 * r + 1]; out[o + 2] = v[3 * r + 2]; }
  return out;
}
export function fromPadded(op, num, p, out = new Float64Array(num.ndof)) {
  for (let r = 0; r < num.nn; r++) { const o = 3 * (op.pad + num.ext[r]); out[3 * r] = p[o]; out[3 * r + 1] = p[o + 1]; out[3 * r + 2] = p[o + 2]; }
  return out;
}

// ---- q2s: two-level p-multigrid ----------------------------------------------------------------------------------

/** Corner parents of every compact q2s node: [n1, w1, n2, w2] (tensor corner ids); corners map to themselves. */
function q2sParents(grid, num) {
  const { nx, ny } = grid, NX = nx + 1, NY = ny + 1;
  const { Nc, Ex, Ey } = nodeCounts(grid);
  const par = new Int32Array(2 * num.nn), w = new Float64Array(2 * num.nn);
  for (let r = 0; r < num.nn; r++) {
    const id = num.ext[r];
    if (id < Nc) { par[2 * r] = par[2 * r + 1] = id; w[2 * r] = 1; w[2 * r + 1] = 0; continue; }
    let t = id - Nc, n1, n2;
    if (t < Ex) { const i = t % nx, j = Math.floor(t / nx) % NY, k = Math.floor(t / (nx * NY)); n1 = i + NX * (j + NY * k); n2 = n1 + 1; }
    else if ((t -= Ex) < Ey) { const i = t % NX, j = Math.floor(t / NX) % ny, k = Math.floor(t / (NX * ny)); n1 = i + NX * (j + NY * k); n2 = n1 + NX; }
    else { t -= Ey; const i = t % NX, j = Math.floor(t / NX) % NY, k = Math.floor(t / (NX * NY)); n1 = i + NX * (j + NY * k); n2 = n1 + NX * NY; }
    par[2 * r] = n1; par[2 * r + 1] = n2; w[2 * r] = 0.5; w[2 * r + 1] = 0.5;
  }
  return { par, w };
}

/** Galerkin Q1 block stencil P^T K P of a q2s CSR system (assemble.mjs layout). */
function q2sCoarseStencil(grid, num, sys, PW) {
  const NX = grid.nx + 1, NY = grid.ny + 1, NZ = grid.nz + 1;
  const op = createBlockStencil(NX, NY, NZ);
  const { A } = op, { par, w } = PW;
  const patN = sys.patN, rp = patN.rowptr, ci = patN.colidx, val = sys.val;
  const ijk = (n) => [n % NX, Math.floor(n / NX) % NY, Math.floor(n / (NX * NY))];
  const P3 = new Int32Array(3 * NX * NY * NZ);
  for (let r = 0; r < num.nn; r++) {
    const m = rp[r + 1] - rp[r];
    for (let t = 0; t < m; t++) {
      const c = ci[rp[r] + t];
      for (let pr = 0; pr < 2; pr++) {
        const wr = w[2 * r + pr];
        if (!wr) continue;
        const nr = par[2 * r + pr], [ir, jr, kr] = ijk(nr);
        for (let pc = 0; pc < 2; pc++) {
          const wc = w[2 * c + pc];
          if (!wc) continue;
          const nc = par[2 * c + pc], [ic, jc, kc] = ijk(nc);
          const s = slotOf(ic - ir, jc - jr, kc - kr);
          const base = (27 * nr + s) * 9, ww = wr * wc;
          for (let i = 0; i < 3; i++) {
            const vb = 9 * rp[r] + 3 * i * m + 3 * t;
            for (let j = 0; j < 3; j++) A[base + 3 * i + j] += ww * val[vb + j];
          }
        }
      }
    }
  }
  void P3;
  // fixed: corner DOFs whose own q2s DOF is constrained (identity rows contribute 1 on the diagonal; rebuild those rows)
  op.fixed.fill(1);
  for (let r = 0; r < num.nn; r++) {
    const id = num.ext[r];
    if (w[2 * r] !== 1) continue;
    for (let a = 0; a < 3; a++) op.fixed[3 * id + a] = 0;
  }
  // q2s constrained DOFs carry identity rows/cols: their Galerkin image mixes 1s into corner diagonals, so constrained
  // corner DOFs are re-fixed and mid-edge identity contributions are removed by subtracting w^2 at the parents.
  const cons = sys.fixedDof;
  for (let r = 0; r < num.nn; r++)
    for (let a = 0; a < 3; a++) {
      if (!cons[3 * r + a]) continue;
      if (w[2 * r] === 1) { op.fixed[3 * par[2 * r] + a] = 1; continue; }
      // remove the Galerkin image w_p w_q of the identity entry at every parent pair (p, q)
      const ijk = (n) => [n % NX, Math.floor(n / NX) % NY, Math.floor(n / (NX * NY))];
      for (let pr = 0; pr < 2; pr++)
        for (let pc = 0; pc < 2; pc++) {
          const np_ = par[2 * r + pr], nq = par[2 * r + pc];
          const [i1, j1, k1] = ijk(np_), [i2, j2, k2] = ijk(nq);
          A[(27 * np_ + slotOf(i2 - i1, j2 - j1, k2 - k1)) * 9 + 4 * a] -= w[2 * r + pr] * w[2 * r + pc];
        }
    }
  finalizeFixed(op);
  return op;
}

/**
 * Preconditioner factory for the q2s CSR system: z = M^-1 r with one p-multigrid cycle
 * (nuF damped block-Jacobi sweeps, Q1 Galerkin coarse correction by one V-cycle, nuF sweeps).
 */
export function buildQ2sPMG(grid, num, sys, { omega = null, nuF = 2, ...mgOpt } = {}) {
  const t0 = performance.now();
  const PW = q2sParents(grid, num);
  const cop = q2sCoarseStencil(grid, num, sys, PW);
  const mg = buildBlockMG(cop, grid.xs, grid.ys, mgOpt);
  // block-Jacobi inverse diagonal of the q2s system
  const { pat, val } = sys, nn = num.nn;
  const B = new Float64Array(9 * nn), blk = new Array(9);
  for (let r = 0; r < nn; r++) {
    for (let i = 0; i < 3; i++) {
      const row = 3 * r + i;
      for (let p = pat.rowptr[row]; p < pat.rowptr[row + 1]; p++) {
        const c = pat.colidx[p];
        if (c >= 3 * r && c < 3 * r + 3) blk[3 * i + (c - 3 * r)] = val[p];
      }
    }
    inv3(blk, B, 9 * r);
  }
  const n = num.ndof;
  const res = new Float64Array(n), Az = new Float64Array(n);
  const rc = paddedVec(cop), ec = paddedVec(cop);
  const { par, w } = PW;
  const matvec = (x, y) => {
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let p = pat.rowptr[i]; p < pat.rowptr[i + 1]; p++) s += val[p] * x[pat.colidx[p]];
      y[i] = s;
    }
  };
  const jac = (r, z) => {
    matvec(z, Az);
    for (let q = 0; q < nn; q++) {
      const o = 9 * q, d0 = r[3 * q] - Az[3 * q], d1 = r[3 * q + 1] - Az[3 * q + 1], d2 = r[3 * q + 2] - Az[3 * q + 2];
      z[3 * q] += omega * (B[o] * d0 + B[o + 1] * d1 + B[o + 2] * d2);
      z[3 * q + 1] += omega * (B[o + 3] * d0 + B[o + 4] * d1 + B[o + 5] * d2);
      z[3 * q + 2] += omega * (B[o + 6] * d0 + B[o + 7] * d1 + B[o + 8] * d2);
    }
  };
  // damping: omega = 1 / lambda_max(B^-1 K) (20 power iterations, 5 % margin) keeps the smoother convergent
  let lam = null;
  if (omega == null) {
    const v = new Float64Array(n), t = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = Math.sin(1 + 12.9898 * i);
    for (let it = 0; it < 20; it++) {
      matvec(v, Az);
      for (let q = 0; q < nn; q++) {
        const o = 9 * q, d0 = Az[3 * q], d1 = Az[3 * q + 1], d2 = Az[3 * q + 2];
        t[3 * q] = B[o] * d0 + B[o + 1] * d1 + B[o + 2] * d2;
        t[3 * q + 1] = B[o + 3] * d0 + B[o + 4] * d1 + B[o + 5] * d2;
        t[3 * q + 2] = B[o + 6] * d0 + B[o + 7] * d1 + B[o + 8] * d2;
      }
      let nv = 0, nt = 0;
      for (let i = 0; i < n; i++) { nv += v[i] * v[i]; nt += t[i] * t[i]; }
      lam = Math.sqrt(nt / nv);
      const sc = 1 / Math.sqrt(nt);
      for (let i = 0; i < n; i++) v[i] = t[i] * sc;
    }
    omega = 1 / (1.05 * lam);
  }
  const precond = (r, z) => {
    z.fill(0);
    for (let s = 0; s < nuF; s++) jac(r, z);
    matvec(z, Az);
    for (let i = 0; i < n; i++) res[i] = r[i] - Az[i];
    rc.fill(0);
    const cp = 3 * cop.pad;
    for (let q = 0; q < nn; q++)
      for (let pr = 0; pr < 2; pr++) {
        const wq = w[2 * q + pr];
        if (!wq) continue;
        const o = cp + 3 * par[2 * q + pr];
        rc[o] += wq * res[3 * q]; rc[o + 1] += wq * res[3 * q + 1]; rc[o + 2] += wq * res[3 * q + 2];
      }
    for (let d = 0; d < 3 * cop.N; d++) if (cop.fixed[d]) rc[cp + d] = 0;
    vcycle(mg, 0, rc, ec);
    for (let q = 0; q < nn; q++) {
      if (sys.fixedDof[3 * q] && sys.fixedDof[3 * q + 1] && sys.fixedDof[3 * q + 2]) continue;
      for (let a = 0; a < 3; a++) {
        if (sys.fixedDof[3 * q + a]) continue;
        let v = 0;
        for (let pr = 0; pr < 2; pr++) { const wq = w[2 * q + pr]; if (wq) v += wq * ec[cp + 3 * par[2 * q + pr] + a]; }
        z[3 * q + a] += v;
      }
    }
    for (let s = 0; s < nuF; s++) jac(r, z);
  };
  return { precond, stats: { ...mg.stats, pmg: { omega, lambda_max: lam, nuF }, setup_ms: performance.now() - t0 } };
}

