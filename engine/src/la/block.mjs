// Block (3 DOF per node) 27-point stencil operators and geometric multigrid for vector problems on the rectilinear
// package grid (DevLog-010 A4; DevLog-012 lane L1 wave 2; consumer: lane L8, E2 thermo-elasticity in src/mech/).
//
// Storage: block (r, c) of slot s at node n is A[(27 n + s) * 9 + 3 r + c]; slot s = (di+1) + 3 (dj+1) + 9 (dk+1)
// (stencil.mjs `slot`), node n = i + NX (j + NY k); DOF (n, r) = 3 n + r (interleaved, SPEC 5 `u_m`). `fixed[3n+r]`
// marks identity rows (Dirichlet components, inactive nodes); their rows and columns hold only the unit diagonal.
// Vectors are padded and interleaved: length 3 (N + 2 pad), DOF (n, r) at 3 (pad + n) + r.
// Multigrid: x-y semi-coarsening with P = P_scalar (x) I_3 (each component interpolated linearly by node
// coordinates), per-axis Galerkin RAP on 3 x 3 blocks, symmetric four-colour block z-line Gauss-Seidel (block
// tridiagonal Thomas with 3 x 3 pivots), ported supernodal Cholesky on the coarsest level. Floating bodies (no
// constrained DOF): pass the six rigid-body modes as `nullspace`; the coarsest level then pins 6 DOFs on which the
// modes are independent, solves, and projects the modes out; PCG projects too (pcg.mjs option `nullspace`).
// License: GPL-3.0-or-later.

import { SparseCholesky } from './sparse.mjs';
import { stencilOffsets, gridNDOrder, S_CENTER, S_ZM, S_ZP } from './stencil.mjs';
import { coarsen1D } from './mg.mjs';
import { wasmBlockLineSweep } from './wasm/accel.mjs';

export const BS = 3;
const SDI = Int8Array.from({ length: 27 }, (_, s) => (s % 3) - 1);
const SDJ = Int8Array.from({ length: 27 }, (_, s) => (Math.floor(s / 3) % 3) - 1);
const SDK = Int8Array.from({ length: 27 }, (_, s) => Math.floor(s / 9) - 1);

/** Empty block stencil operator on NX x NY x NZ nodes (3 DOF per node). */
export function createBlockStencil(NX, NY, NZ) {
  const N = NX * NY * NZ;
  return { bs: 3, NX, NY, NZ, N, A: new Float64Array(243 * N), fixed: new Uint8Array(3 * N), off: stencilOffsets(NX, NY), pad: NX * NY + NX + 1 };
}

/** Index of block entry (r, c) of slot s at node n. */
export const bidx = (n, s, r, c) => (27 * n + s) * 9 + 3 * r + c;

/** Zero-padded interleaved vector for a block operator. */
export const paddedBlock = (op) => new Float64Array(3 * (op.N + 2 * op.pad));

/** y = A x on padded interleaved vectors. */
export function applyBlock(op, x, y) {
  const wk = op._wk;
  if (wk && x.buffer === wk.memory.buffer && y.buffer === wk.memory.buffer) {
    wk.k.bapply(op.A.byteOffset, x.byteOffset, y.byteOffset + 24 * op.pad, op.N);
    return y;
  }
  const { N, A, off, pad } = op;
  for (let n = 0; n < N; n++) {
    const q = 3 * (pad + n);
    let y0 = 0, y1 = 0, y2 = 0;
    const a0 = 243 * n;
    for (let s = 0; s < 27; s++) {
      const a = a0 + 9 * s, m = q + 3 * off[s];
      const x0 = x[m], x1 = x[m + 1], x2 = x[m + 2];
      y0 += A[a] * x0 + A[a + 1] * x1 + A[a + 2] * x2;
      y1 += A[a + 3] * x0 + A[a + 4] * x1 + A[a + 5] * x2;
      y2 += A[a + 6] * x0 + A[a + 7] * x1 + A[a + 8] * x2;
    }
    y[q] = y0;
    y[q + 1] = y1;
    y[q + 2] = y2;
  }
  return y;
}

/** Add a dense element matrix (8 nodes x 3 DOF = 24 x 24, row-major, local node a = ia + 2 ja + 4 ka) of cell (i, j, k). */
export function addBlockElement(op, i, j, k, Ke) {
  const { NX, NY, A } = op;
  for (let a = 0; a < 8; a++) {
    const ia = a & 1, ja = (a >> 1) & 1, ka = a >> 2;
    const na = i + ia + NX * (j + ja + NY * (k + ka));
    for (let b = 0; b < 8; b++) {
      const s = (b & 1) - ia + 1 + 3 * (((b >> 1) & 1) - ja + 1) + 9 * ((b >> 2) - ka + 1);
      const base = (27 * na + s) * 9;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) A[base + 3 * r + c] += Ke[24 * (3 * a + r) + 3 * b + c];
    }
  }
}

/**
 * Dirichlet DOFs (values g[3n+r], NaN = free) and inactive nodes (active[n] = 0) become identity rows; couplings of
 * free rows to them move to F. Returns the original rows (27 x 3 per constrained DOF, row of the block) and loads,
 * for reactions: R = sum rows * u - load.
 */
export function constrainBlock(op, F, g, active = null) {
  const { N, A, fixed, off, NX, NY, NZ } = op;
  const dof = [];
  for (let d = 0; d < 3 * N; d++) if (!Number.isNaN(g[d])) dof.push(d);
  const rows = new Float64Array(81 * dof.length), loads = new Float64Array(dof.length);
  dof.forEach((d, q) => {
    const n = Math.floor(d / 3), r = d % 3;
    for (let s = 0; s < 27; s++) for (let c = 0; c < 3; c++) rows[81 * q + 3 * s + c] = A[bidx(n, s, r, c)];
    loads[q] = F[d];
  });
  for (const d of dof) fixed[d] = 1;
  if (active) for (let n = 0; n < N; n++) if (!active[n]) fixed[3 * n] = fixed[3 * n + 1] = fixed[3 * n + 2] = 1;
  const inb = (n, s) => {
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    const ii = i + SDI[s], jj = j + SDJ[s], kk = k + SDK[s];
    return ii >= 0 && jj >= 0 && kk >= 0 && ii < NX && jj < NY && kk < NZ;
  };
  for (const d of dof) {
    const n = Math.floor(d / 3), c = d % 3;
    for (let s = 0; s < 27; s++) {
      if (!inb(n, s)) continue;
      const m = n + off[s];
      for (let r = 0; r < 3; r++) {
        if (fixed[3 * m + r]) continue;
        const e = bidx(m, 26 - s, r, c);
        F[3 * m + r] -= A[e] * g[d];
        A[e] = 0;
      }
    }
  }
  // zero every row and column of fixed DOFs, unit diagonal
  for (let n = 0; n < N; n++)
    for (let r = 0; r < 3; r++) {
      if (!fixed[3 * n + r]) continue;
      for (let s = 0; s < 27; s++) {
        for (let c = 0; c < 3; c++) A[bidx(n, s, r, c)] = 0;
        if (inb(n, s)) {
          const m = n + off[s];
          for (let rr = 0; rr < 3; rr++) A[bidx(m, 26 - s, rr, r)] = 0;
        }
      }
      A[bidx(n, S_CENTER, r, r)] = 1;
      F[3 * n + r] = Number.isNaN(g[3 * n + r]) ? 0 : g[3 * n + r];
    }
  return { dof: Int32Array.from(dof), rows, loads };
}

/** Max relative asymmetry of a block operator (test helper). */
export function blockAsymmetry(op) {
  const { NX, NY, NZ, A, off } = op;
  let d = 0, m = 0;
  for (let n = 0; n < op.N; n++) {
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    for (let s = 0; s < 27; s++) {
      const ii = i + SDI[s], jj = j + SDJ[s], kk = k + SDK[s];
      const inb = ii >= 0 && jj >= 0 && kk >= 0 && ii < NX && jj < NY && kk < NZ;
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 3; c++) {
          const a = A[bidx(n, s, r, c)];
          m = Math.max(m, Math.abs(a));
          if (!inb) d = Math.max(d, Math.abs(a));
          else d = Math.max(d, Math.abs(a - A[bidx(n + off[s], 26 - s, c, r)]));
        }
    }
  }
  return m > 0 ? d / m : 0;
}

/**
 * Six rigid-body modes (translations x, y, z; rotations about z, x, y through the centroid of the active nodes) as
 * padded vectors, zero at fixed DOFs; `active` (per node) defaults to "any DOF free".
 */
export function rigidBodyModes(op, xs, ys, zs) {
  const { NX, NY, NZ, N, pad, fixed } = op;
  let cx = 0, cy = 0, cz = 0, cnt = 0;
  for (let n = 0; n < N; n++) {
    if (fixed[3 * n] && fixed[3 * n + 1] && fixed[3 * n + 2]) continue;
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    cx += xs[i]; cy += ys[j]; cz += zs[k]; cnt++;
  }
  cx /= cnt; cy /= cnt; cz /= cnt;
  const Z = Array.from({ length: 6 }, () => paddedBlock(op));
  for (let n = 0; n < N; n++) {
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    const x = xs[i] - cx, y = ys[j] - cy, z = zs[k] - cz;
    const q = 3 * (pad + n);
    const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-y, x, 0], [0, -z, y], [z, 0, -x]];
    for (let t = 0; t < 6; t++) for (let r = 0; r < 3; r++) if (!fixed[3 * n + r]) Z[t][q + r] = v[t][r];
  }
  void NZ;
  return Z;
}

/** Orthonormalize padded vectors in place (modified Gram-Schmidt); returns the kept ones. */
export function orthonormalize(Z) {
  const out = [];
  for (const z of Z) {
    const v = z.slice();
    for (const u of out) {
      let d = 0;
      for (let q = 0; q < v.length; q++) d += u[q] * v[q];
      for (let q = 0; q < v.length; q++) v[q] -= d * u[q];
    }
    let nn = 0;
    for (let q = 0; q < v.length; q++) nn += v[q] * v[q];
    if (nn > 1e-24) {
      const s = 1 / Math.sqrt(nn);
      for (let q = 0; q < v.length; q++) v[q] *= s;
      out.push(v);
    }
  }
  return out;
}

/** x -= U U^T x for orthonormal padded vectors U. */
export function projectOut(U, x) {
  for (const u of U) {
    let d = 0;
    for (let q = 0; q < x.length; q++) d += u[q] * x[q];
    if (d !== 0) for (let q = 0; q < x.length; q++) x[q] -= d * u[q];
  }
  return x;
}

/** CSR (full symmetric storage) of the free DOFs (nonzero entries), DOF order 3 n + r. */
export function blockToCSR(op, extraFixed = null) {
  const { NX, NY, NZ, N, A, fixed } = op;
  const map = new Int32Array(3 * N).fill(-1);
  let nf = 0;
  for (let d = 0; d < 3 * N; d++) if (!fixed[d] && !(extraFixed && extraFixed[d])) map[d] = nf++;
  const inv = new Int32Array(nf);
  for (let d = 0; d < 3 * N; d++) if (map[d] >= 0) inv[map[d]] = d;
  const rowptr = new Int32Array(nf + 1);
  const cols = [], vals = [];
  for (let rr = 0; rr < nf; rr++) {
    const d = inv[rr], n = Math.floor(d / 3), r = d % 3;
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    for (let s = 0; s < 27; s++) {
      // slots are in increasing node-offset order, DOFs within a node in increasing order: sorted columns
      const ii = i + SDI[s], jj = j + SDJ[s], kk = k + SDK[s];
      if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ) continue;
      const m = ii + NX * (jj + NY * kk);
      for (let c = 0; c < 3; c++) {
        const col = map[3 * m + c];
        if (col < 0) continue;
        const a = A[bidx(n, s, r, c)];
        if (a === 0 && col !== rr) continue;
        cols.push(col);
        vals.push(a);
      }
    }
    rowptr[rr + 1] = cols.length;
  }
  return { pat: { n: nf, rowptr, colidx: Int32Array.from(cols), nnz: cols.length }, val: Float64Array.from(vals), map, inv };
}

/** Six DOFs (by greedy pivoting on the mode rows) on which the modes Z (padded) are linearly independent. */
function pinDofs(op, Z) {
  const { N, pad } = op;
  const chosen = [];
  const basis = [];
  for (let t = 0; t < Z.length; t++) {
    let best = -1, bn = 0, bv = null;
    for (let d = 0; d < 3 * N; d++) {
      if (op.fixed[d] || chosen.includes(d)) continue;
      const v = Z.map((z) => z[3 * pad + d]);
      for (const u of basis) {
        let dd = 0;
        for (let q = 0; q < v.length; q++) dd += u[q] * v[q];
        for (let q = 0; q < v.length; q++) v[q] -= dd * u[q];
      }
      const nn = Math.hypot(...v);
      if (nn > bn) { bn = nn; best = d; bv = v; }
    }
    if (best < 0 || bn < 1e-12) break;
    chosen.push(best);
    basis.push(bv.map((x) => x / bn));
  }
  return chosen;
}

/**
 * Direct solver on the free DOFs (ported supernodal Cholesky; grid nested dissection on nodes, DOFs of a node kept
 * together). With `nullspace` (padded modes of a floating body): pins 6 DOFs, solves, projects the modes out.
 */
export class BlockCholesky {
  constructor(op, { nullspace = null } = {}) {
    const t0 = performance.now();
    this.op = op;
    this.U = nullspace ? orthonormalize(nullspace) : null;
    let extra = null;
    if (this.U) {
      extra = new Uint8Array(3 * op.N);
      this.pins = pinDofs(op, nullspace);
      for (const d of this.pins) extra[d] = 1;
    }
    const { pat, val, map, inv } = blockToCSR(op, extra);
    this.map = map;
    this.inv = inv;
    const nodeMap = new Int32Array(op.N).fill(-1);
    for (let n = 0; n < op.N; n++) if (map[3 * n] >= 0 || map[3 * n + 1] >= 0 || map[3 * n + 2] >= 0) nodeMap[n] = n;
    const nodeOrder = gridNDOrder(op.NX, op.NY, op.NZ, nodeMap);
    const perm = [];
    for (const n of nodeOrder) for (let r = 0; r < 3; r++) if (map[3 * n + r] >= 0) perm.push(map[3 * n + r]);
    this.chol = new SparseCholesky(pat, Int32Array.from(perm));
    const t1 = performance.now();
    if (!this.chol.factor(val))
      throw new Error(this.U ? 'block direct solver: not positive definite after pinning 6 DOFs (more than rigid-body modes free?)'
        : 'block direct solver: matrix is not positive definite (rigid-body modes not suppressed? pass nullspace for a floating body)');
    this.b = new Float64Array(pat.n);
    this.x = new Float64Array(pat.n);
    this.timing = { n: pat.n, nnzA: pat.nnz, nnzL: this.chol.nnzL, csr_ordering_symbolic_ms: t1 - t0, factor_ms: performance.now() - t1 };
  }
  /** x = A^-1 b on padded interleaved vectors (fixed DOFs get b). */
  solvePadded(b, x) {
    const { inv, op } = this;
    const o = 3 * op.pad;
    for (let r = 0; r < inv.length; r++) this.b[r] = b[o + inv[r]];
    this.chol.solve(this.b, this.x);
    x.fill(0);
    for (let d = 0; d < 3 * op.N; d++) if (op.fixed[d]) x[o + d] = b[o + d];
    for (let r = 0; r < inv.length; r++) x[o + inv[r]] = this.x[r];
    if (this.U) projectOut(this.U, x);
    return x;
  }
}

/** Sums of |collapsed block-trace couplings| along x and y (anisotropy measure for coarsen 'auto'). */
export function axisCouplingBlock(op) {
  const { N, A } = op;
  let cx = 0, cy = 0;
  for (let n = 0; n < N; n++) {
    let ax = 0, ay = 0;
    for (let s = 0; s < 27; s++) {
      const b = (27 * n + s) * 9, tr = A[b] + A[b + 4] + A[b + 8];
      if (SDI[s] !== 0) ax += tr;
      if (SDJ[s] !== 0) ay += tr;
    }
    cx += Math.abs(ax);
    cy += Math.abs(ay);
  }
  return [cx, cy];
}

/** Per-node interpolation weights (same for the 3 components): geometric, or collapsed block-trace couplings. */
export function nodeWeightsBlock(op, axis, map, mode) {
  const { NX, NY, NZ, N, A, fixed } = op;
  const nwL = new Float64Array(N), nwR = new Float64Array(N);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        const ia = axis === 0 ? i : j;
        let wl = map.wL[ia], wr = map.wR[ia];
        if (mode === 'operator' && wr !== 0 && !(fixed[3 * n] && fixed[3 * n + 1] && fixed[3 * n + 2])) {
          let aW = 0, aE = 0;
          for (let s = 0; s < 27; s++) {
            const d = axis === 0 ? SDI[s] : SDJ[s];
            if (!d) continue;
            const b = (27 * n + s) * 9, tr = A[b] + A[b + 4] + A[b + 8];
            if (d < 0) aW += tr;
            else aE += tr;
          }
          if (aW < 0 && aE < 0) {
            wl = aW / (aW + aE);
            wr = 1 - wl;
          }
        }
        nwL[n] = wl;
        nwR[n] = wr;
      }
  return { nwL, nwR };
}

/** Galerkin product along one axis on 3 x 3 blocks (fixed fine DOF rows skipped; their columns are zero). */
function rapAxisBlock(op, axis, map) {
  const { NX, NY, NZ, A, fixed } = op;
  const NXc = axis === 0 ? map.nc : NX, NYc = axis === 1 ? map.nc : NY;
  const cop = createBlockStencil(NXc, NYc, NZ);
  const Ac = cop.A;
  const { cL, cR } = map;
  const { nwL, nwR } = map.nw;
  const off = op.off;
  const st = axis === 0 ? 1 : 3;
  const SD = axis === 0 ? SDI : SDJ;
  const blk = new Float64Array(9);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        const f0 = fixed[3 * n], f1 = fixed[3 * n + 1], f2 = fixed[3 * n + 2];
        if (f0 && f1 && f2) continue;
        const ia = axis === 0 ? i : j;
        const I0 = cL[ia], I1 = cR[ia], w0 = nwL[n], w1 = nwR[n];
        const r0 = axis === 0 ? 27 * (I0 + NXc * (j + NY * k)) : 27 * (i + NX * (I0 + NYc * k));
        const r1 = axis === 0 ? 27 * (I1 + NXc * (j + NY * k)) : 27 * (i + NX * (I1 + NYc * k));
        for (let s = 0; s < 27; s++) {
          const base = (27 * n + s) * 9;
          let nz = false;
          for (let e = 0; e < 9; e++) {
            const r = (e / 3) | 0;
            const v = (r === 0 && f0) || (r === 1 && f1) || (r === 2 && f2) ? 0 : A[base + e];
            blk[e] = v;
            if (v !== 0) nz = true;
          }
          if (!nz) continue;
          if (s === S_CENTER) for (let r = 0; r < 3; r++) if (fixed[3 * n + r]) blk[4 * r] = 0;
          const d = SD[s];
          const rest = s - st * (d + 1) + st;
          const ja = ia + d;
          const m = n + off[s];
          const J0 = cL[ja], J1 = cR[ja], v0 = nwL[m], v1 = nwR[m];
          const add = (row, o, w) => {
            const b = (row + rest + st * o) * 9;
            for (let e = 0; e < 9; e++) Ac[b + e] += w * blk[e];
          };
          add(r0, J0 - I0, w0 * v0);
          if (v1 !== 0) add(r0, J1 - I0, w0 * v1);
          if (w1 !== 0) {
            add(r1, J0 - I1, w1 * v0);
            if (v1 !== 0) add(r1, J1 - I1, w1 * v1);
          }
        }
      }
  return cop;
}

function fixEmptyDofs(op) {
  const { N, A, fixed } = op;
  let dmax = 0;
  for (let n = 0; n < N; n++) for (let r = 0; r < 3; r++) dmax = Math.max(dmax, A[bidx(n, S_CENTER, r, r)]);
  for (let n = 0; n < N; n++)
    for (let r = 0; r < 3; r++) {
      const dg = A[bidx(n, S_CENTER, r, r)];
      if (dg > 1e-300 * dmax && dg > 0) continue;
      for (let s = 0; s < 27; s++) for (let c = 0; c < 3; c++) A[bidx(n, s, r, c)] = 0;
      A[bidx(n, S_CENTER, r, r)] = 1;
      fixed[3 * n + r] = 1;
    }
}

/** 3 x 3 inverse (row-major) into out at o; returns the determinant. */
function inv3(M, m, out, o) {
  const a = M[m], b = M[m + 1], c = M[m + 2], d = M[m + 3], e = M[m + 4], f = M[m + 5], g = M[m + 6], h = M[m + 7], i = M[m + 8];
  const A0 = e * i - f * h, B0 = -(d * i - f * g), C0 = d * h - e * g;
  const det = a * A0 + b * B0 + c * C0;
  const r = 1 / det;
  out[o] = A0 * r; out[o + 1] = -(b * i - c * h) * r; out[o + 2] = (b * f - c * e) * r;
  out[o + 3] = B0 * r; out[o + 4] = (a * i - c * g) * r; out[o + 5] = -(a * f - c * d) * r;
  out[o + 6] = C0 * r; out[o + 7] = -(a * h - b * g) * r; out[o + 8] = (a * e - b * d) * r;
  return det;
}

/** Block Thomas factors per z column: Sinv (inverse pivot blocks) and C = Sinv U (9 each per node). */
export function blockLineFactors(op) {
  const { NX, NY, NZ, N, A } = op;
  const P = NX * NY;
  const Sinv = new Float64Array(9 * N), C = new Float64Array(9 * N);
  const S = new Float64Array(9);
  for (let col = 0; col < P; col++)
    for (let k = 0, n = col; k < NZ; k++, n += P) {
      const D = (27 * n + S_CENTER) * 9;
      for (let e = 0; e < 9; e++) S[e] = A[D + e];
      if (k > 0) {
        // S -= L C_{k-1}
        const L = (27 * n + S_ZM) * 9, Cp = 9 * (n - P);
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 3; c++) S[3 * r + c] -= A[L + 3 * r] * C[Cp + c] + A[L + 3 * r + 1] * C[Cp + 3 + c] + A[L + 3 * r + 2] * C[Cp + 6 + c];
      }
      const det = inv3(S, 0, Sinv, 9 * n);
      if (!(det > 0) || !(S[0] > 0)) throw new Error('block multigrid: z-line pivot block not positive definite');
      if (k < NZ - 1) {
        const U = (27 * n + S_ZP) * 9, si = 9 * n;
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 3; c++) C[si + 3 * r + c] = Sinv[si + 3 * r] * A[U + c] + Sinv[si + 3 * r + 1] * A[U + 3 + c] + Sinv[si + 3 * r + 2] * A[U + 6 + c];
      }
    }
  return { Sinv, C };
}

/** Four-colour block z-line Gauss-Seidel sweep (see mg.mjs lineSweep); T is a 3 N scratch array. */
function blockLineSweep(lev, b, x, forward, T) {
  if (lev.op._wk && x.buffer === lev.op._wk.memory.buffer && b.buffer === x.buffer) return wasmBlockLineSweep(lev, b, x, forward);
  const { op, Sinv, C } = lev;
  const { NX, NY, NZ, A, off, pad } = op;
  const P = NX * NY;
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc;
    const ci = color & 1, cj = color >> 1;
    for (let k = 0; k < NZ; k++)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = 3 * (pad + n);
          let r0 = b[q], r1 = b[q + 1], r2 = b[q + 2];
          const a0 = 243 * n;
          for (let s = 0; s < 27; s++) {
            if (s === S_ZM || s === S_CENTER || s === S_ZP) continue;
            const a = a0 + 9 * s, m = q + 3 * off[s];
            const x0 = x[m], x1 = x[m + 1], x2 = x[m + 2];
            r0 -= A[a] * x0 + A[a + 1] * x1 + A[a + 2] * x2;
            r1 -= A[a + 3] * x0 + A[a + 4] * x1 + A[a + 5] * x2;
            r2 -= A[a + 6] * x0 + A[a + 7] * x1 + A[a + 8] * x2;
          }
          if (k > 0) {
            const a = a0 + 9 * S_ZM, t = 3 * (n - P);
            const y0 = T[t], y1 = T[t + 1], y2 = T[t + 2];
            r0 -= A[a] * y0 + A[a + 1] * y1 + A[a + 2] * y2;
            r1 -= A[a + 3] * y0 + A[a + 4] * y1 + A[a + 5] * y2;
            r2 -= A[a + 6] * y0 + A[a + 7] * y1 + A[a + 8] * y2;
          }
          const si = 9 * n, t = 3 * n;
          T[t] = Sinv[si] * r0 + Sinv[si + 1] * r1 + Sinv[si + 2] * r2;
          T[t + 1] = Sinv[si + 3] * r0 + Sinv[si + 4] * r1 + Sinv[si + 5] * r2;
          T[t + 2] = Sinv[si + 6] * r0 + Sinv[si + 7] * r1 + Sinv[si + 8] * r2;
        }
    for (let k = NZ - 1; k >= 0; k--)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = 3 * (pad + n), t = 3 * n;
          if (k < NZ - 1) {
            const ci9 = 9 * n, u = q + 3 * P;
            const x0 = x[u], x1 = x[u + 1], x2 = x[u + 2];
            x[q] = T[t] - (C[ci9] * x0 + C[ci9 + 1] * x1 + C[ci9 + 2] * x2);
            x[q + 1] = T[t + 1] - (C[ci9 + 3] * x0 + C[ci9 + 4] * x1 + C[ci9 + 5] * x2);
            x[q + 2] = T[t + 2] - (C[ci9 + 6] * x0 + C[ci9 + 7] * x1 + C[ci9 + 8] * x2);
          } else {
            x[q] = T[t];
            x[q + 1] = T[t + 1];
            x[q + 2] = T[t + 2];
          }
        }
  }
}

export function restrictBlock(fine, coarse, r, rc, tmp) {
  const { NX, NY, NZ, pad } = fine.op;
  const mx = fine.mapX, my = fine.mapY;
  const NXc = mx ? mx.nc : NX;
  const padT = NXc * NY + NXc + 1;
  tmp.fill(0);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const q = 3 * (pad + i + NX * (j + NY * k));
        const base = padT + NXc * (j + NY * k);
        for (let c = 0; c < 3; c++) {
          const v = r[q + c];
          if (v === 0) continue;
          if (!mx) tmp[3 * (base + i) + c] += v;
          else {
            const n = i + NX * (j + NY * k), wl = mx.nw.nwL[n], wr = mx.nw.nwR[n];
            tmp[3 * (base + mx.cL[i]) + c] += wl * v;
            if (wr !== 0) tmp[3 * (base + mx.cR[i]) + c] += wr * v;
          }
        }
      }
  const cop = coarse.op;
  const NYc = cop.NY;
  rc.fill(0);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NXc; i++) {
        const t = 3 * (padT + i + NXc * (j + NY * k));
        for (let c = 0; c < 3; c++) {
          const v = tmp[t + c];
          if (v === 0) continue;
          if (!my) rc[3 * (cop.pad + i + NXc * (j + NYc * k)) + c] += v;
          else {
            const tt = i + NXc * (j + NY * k), wl = my.nw.nwL[tt], wr = my.nw.nwR[tt];
            rc[3 * (cop.pad + i + NXc * (my.cL[j] + NYc * k)) + c] += wl * v;
            if (wr !== 0) rc[3 * (cop.pad + i + NXc * (my.cR[j] + NYc * k)) + c] += wr * v;
          }
        }
      }
  for (let d = 0; d < 3 * cop.N; d++) if (cop.fixed[d]) rc[3 * cop.pad + d] = 0;
}

export function prolongAddBlock(fine, coarse, ec, x, tmp) {
  const { NX, NY, NZ, pad, fixed } = fine.op;
  const mx = fine.mapX, my = fine.mapY;
  const cop = coarse.op;
  const NXc = cop.NX, NYc = cop.NY;
  const padT = NXc * NY + NXc + 1;
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NXc; i++) {
        const t = i + NXc * (j + NY * k);
        for (let c = 0; c < 3; c++) {
          let v;
          if (!my) v = ec[3 * (cop.pad + i + NXc * (j + NYc * k)) + c];
          else {
            const wl = my.nw.nwL[t], wr = my.nw.nwR[t];
            v = wl * ec[3 * (cop.pad + i + NXc * (my.cL[j] + NYc * k)) + c];
            if (wr !== 0) v += wr * ec[3 * (cop.pad + i + NXc * (my.cR[j] + NYc * k)) + c];
          }
          tmp[3 * (padT + t) + c] = v;
        }
      }
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        const base = padT + NXc * (j + NY * k);
        const wl = mx ? mx.nw.nwL[n] : 1, wr = mx ? mx.nw.nwR[n] : 0, iL = mx ? mx.cL[i] : i, iR = mx ? mx.cR[i] : i;
        for (let c = 0; c < 3; c++) {
          if (fixed[3 * n + c]) continue;
          x[3 * (pad + n) + c] += wl * tmp[3 * (base + iL) + c] + (wr !== 0 ? wr * tmp[3 * (base + iR) + c] : 0);
        }
      }
}

/**
 * Build the block hierarchy.
 * @param {object} op fine block operator (fixed rows identity)
 * @param {Float64Array} xs node x coordinates; @param {Float64Array} ys; @param {Float64Array} zs (for rigid-body modes)
 * @param {{coarseMax?: number, maxLevels?: number, floating?: boolean, nu?: number, coarsen?: 'auto' | 'xy' | 'x' | 'y',
 *   interp?: 'operator' | 'geometric', theta?: number, modes?: Function}} [opt] modes(op, xs, ys, zs) -> padded null-space
 *   vectors of a floating level (default rigidBodyModes; e.g. z translation only under mirror-plane supports); nu: block z-line sweeps before and after (default 2);
 *   coarsen 'auto': semi-coarsen only in-plane directions whose collapsed coupling is >= theta x the other's;
 *   interp 'geometric' (default; the block-trace 'operator' weights measured worse, 31 vs 21 iterations); floating: the body has no constrained
 *   DOF; rigid-body modes are built per level from the level's node coordinates (exactly interpolated by P)
 */
export function buildBlockMG(op, xs, ys, zs, { coarseMax = 3000, maxLevels = 30, floating = false, nu = 2, coarsen = 'auto', interp = 'geometric', theta = 0.1, modes = null } = {}) {
  const t0 = performance.now();
  const levels = [];
  let cur = op, cx = xs, cy = ys;
  for (let l = 0; l < maxLevels; l++) {
    const lev = { op: cur, xs: cx, ys: cy, mapX: null, mapY: null };
    levels.push(lev);
    let canX = cur.NX >= 4, canY = cur.NY >= 4;
    if (coarsen === 'x') canY = false;
    else if (coarsen === 'y') canX = false;
    else if (coarsen === 'auto' && canX && canY) {
      const [ax, ay] = axisCouplingBlock(cur);
      if (ax < theta * ay) canX = false;
      else if (ay < theta * ax) canY = false;
    }
    lev.coarsened = (canX ? 'x' : '') + (canY ? 'y' : '');
    if (cur.N <= coarseMax || (!canX && !canY)) break;
    let next = cur;
    if (canX) {
      lev.mapX = coarsen1D(cx);
      lev.mapX.nw = nodeWeightsBlock(next, 0, lev.mapX, interp);
      next = rapAxisBlock(next, 0, lev.mapX);
      cx = lev.mapX.xs;
    }
    if (canY) {
      lev.mapY = coarsen1D(cy);
      if (canX) next.fixed.fill(0); // intermediate (x-coarsened) operator: rows of all nodes take part
      lev.mapY.nw = nodeWeightsBlock(next, 1, lev.mapY, interp);
      next = rapAxisBlock(next, 1, lev.mapY);
      cy = lev.mapY.xs;
    }
    fixEmptyDofs(next);
    cur = next;
  }
  for (let l = 0; l < levels.length; l++) {
    const lev = levels[l];
    if (l === levels.length - 1) lev.direct = new BlockCholesky(lev.op, { nullspace: floating ? (modes ?? rigidBodyModes)(lev.op, lev.xs, lev.ys, zs) : null });
    else Object.assign(lev, blockLineFactors(lev.op));
    lev.t = new Float64Array(3 * lev.op.N);
    if (l > 0) {
      lev.b = paddedBlock(lev.op);
      lev.x = paddedBlock(lev.op);
    }
    lev.r = paddedBlock(lev.op);
    if (l < levels.length - 1) {
      const NXc = lev.mapX ? lev.mapX.nc : lev.op.NX;
      lev.tmp = new Float64Array(3 * (NXc * lev.op.NY * lev.op.NZ + 2 * (NXc * lev.op.NY + NXc + 1)));
    }
  }
  const last = levels[levels.length - 1];
  return {
    levels, nu, setup_ms: performance.now() - t0,
    stats: { levels: levels.length, nodes: levels.map((l) => l.op.N), coarsened: levels.map((l) => l.coarsened ?? ''), coarse_dofs: last.direct.timing.n, coarse_nnzL: last.direct.timing.nnzL, operatorComplexity: levels.reduce((a, l) => a + l.op.N, 0) / op.N, floating },
  };
}

function vcycleBlock(mg, l, b, x) {
  const lev = mg.levels[l];
  if (lev.direct) {
    lev.direct.solvePadded(b, x);
    return;
  }
  const { op, t } = lev;
  x.fill(0);
  for (let s = 0; s < mg.nu; s++) blockLineSweep(lev, b, x, true, t);
  applyBlock(op, x, lev.r);
  const o = 3 * op.pad, r = lev.r;
  for (let d = 0; d < 3 * op.N; d++) r[o + d] = b[o + d] - r[o + d];
  const cl = mg.levels[l + 1];
  restrictBlock(lev, cl, r, cl.b, lev.tmp);
  vcycleBlock(mg, l + 1, cl.b, cl.x);
  prolongAddBlock(lev, cl, cl.x, x, lev.tmp);
  for (let s = 0; s < mg.nu; s++) blockLineSweep(lev, b, x, false, t);
}

/** Preconditioner z = M^-1 r (padded interleaved fine vectors). */
export function blockMGPrecond(mg, r, z) {
  vcycleBlock(mg, 0, r, z);
  return z;
}
