// Structured 27-point stencil operators on a tensor node grid (DevLog-012 lane L1; R2 S1, S9).
// Storage: A[27 n + s], s = (di + 1) + 3 (dj + 1) + 9 (dk + 1), node n = i + NX (j + NY k); s = 13 is the diagonal.
// `fixed[n] = 1` marks identity rows (inactive or Dirichlet nodes) with all couplings removed. Vectors used with the
// branch-free apply are padded: length N + 2 pad, pad = NX NY + NX + 1, node n at index pad + n; couplings that leave
// the grid are exactly zero, so the padding (zeros) and row wrap-around never contribute.
// License: GPL-3.0-or-later.

import { SparseCholesky, amdOrder } from './sparse.mjs';

export const S_CENTER = 13, S_ZM = 4, S_ZP = 22;
/** Stencil slot of offset (di, dj, dk). */
export const slot = (di, dj, dk) => di + 1 + 3 * (dj + 1) + 9 * (dk + 1);

/** Node-index offsets of the 27 slots for an NX x NY plane. */
export function stencilOffsets(NX, NY) {
  const off = new Int32Array(27);
  for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) off[slot(di, dj, dk)] = di + NX * (dj + NY * dk);
  return off;
}

/** Empty stencil operator on NX x NY x NZ nodes. */
export function createStencil(NX, NY, NZ) {
  const N = NX * NY * NZ;
  return { NX, NY, NZ, N, A: new Float64Array(27 * N), fixed: new Uint8Array(N), off: stencilOffsets(NX, NY), pad: NX * NY + NX + 1 };
}

/** Zero-padded vector for the operator. */
export const padded = (op) => new Float64Array(op.N + 2 * op.pad);

/** y = A x on padded vectors (rows of every node, identity rows included). */
export function applyStencil(op, x, y) {
  const wk = op._wk;
  if (wk && x.buffer === wk.memory.buffer && y.buffer === wk.memory.buffer) {
    // WASM kernel (gate G1, wasm/accel.mjs): x pointer at x[pad + omin] = x[0] since omin = -pad
    wk.k.apply(op.A.byteOffset, x.byteOffset, y.byteOffset + 8 * op.pad, op.N);
    return y;
  }
  const { N, A, off, pad } = op;
  const o0 = off[0], o1 = off[1], o2 = off[2], o3 = off[3], o4 = off[4], o5 = off[5], o6 = off[6], o7 = off[7], o8 = off[8],
    o9 = off[9], o10 = off[10], o11 = off[11], o12 = off[12], o14 = off[14], o15 = off[15], o16 = off[16], o17 = off[17],
    o18 = off[18], o19 = off[19], o20 = off[20], o21 = off[21], o22 = off[22], o23 = off[23], o24 = off[24], o25 = off[25], o26 = off[26];
  for (let n = 0, a = 0, q = pad; n < N; n++, a += 27, q++) {
    y[q] = A[a] * x[q + o0] + A[a + 1] * x[q + o1] + A[a + 2] * x[q + o2] + A[a + 3] * x[q + o3] + A[a + 4] * x[q + o4]
      + A[a + 5] * x[q + o5] + A[a + 6] * x[q + o6] + A[a + 7] * x[q + o7] + A[a + 8] * x[q + o8] + A[a + 9] * x[q + o9]
      + A[a + 10] * x[q + o10] + A[a + 11] * x[q + o11] + A[a + 12] * x[q + o12] + A[a + 13] * x[q]
      + A[a + 14] * x[q + o14] + A[a + 15] * x[q + o15] + A[a + 16] * x[q + o16] + A[a + 17] * x[q + o17]
      + A[a + 18] * x[q + o18] + A[a + 19] * x[q + o19] + A[a + 20] * x[q + o20] + A[a + 21] * x[q + o21]
      + A[a + 22] * x[q + o22] + A[a + 23] * x[q + o23] + A[a + 24] * x[q + o24] + A[a + 25] * x[q + o25]
      + A[a + 26] * x[q + o26];
  }
  return y;
}

/** Max relative asymmetry |A_nm - A_mn| / max|A| over all couplings (test helper). */
export function stencilAsymmetry(op) {
  const { NX, NY, NZ, A } = op;
  let d = 0, m = 0;
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const a = A[27 * n + slot(di, dj, dk)];
          m = Math.max(m, Math.abs(a));
          const ii = i + di, jj = j + dj, kk = k + dk;
          if (ii < 0 || jj < 0 || kk < 0 || ii >= NX || jj >= NY || kk >= NZ) {
            d = Math.max(d, Math.abs(a));
            continue;
          }
          const mm = ii + NX * (jj + NY * kk);
          d = Math.max(d, Math.abs(a - A[27 * mm + slot(-di, -dj, -dk)]));
        }
      }
  return m > 0 ? d / m : 0;
}

/**
 * CSR (full symmetric storage) of the free-node block: entries with a nonzero coefficient between free nodes.
 * @returns {{pat, val: Float64Array, map: Int32Array, inv: Int32Array}} map: node -> free index (-1 fixed); inv reverse
 */
export function stencilToCSR(op) {
  const { NX, NY, NZ, N, A, fixed } = op;
  const map = new Int32Array(N).fill(-1);
  let nf = 0;
  for (let n = 0; n < N; n++) if (!fixed[n]) map[n] = nf++;
  const inv = new Int32Array(nf);
  for (let n = 0; n < N; n++) if (map[n] >= 0) inv[map[n]] = n;
  const rowptr = new Int32Array(nf + 1);
  const cols = new Int32Array(27 * nf), vals = new Float64Array(27 * nf);
  let nnz = 0;
  for (let r = 0; r < nf; r++) {
    const n = inv[r];
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    // slots in increasing node-offset order give sorted columns (map is monotone in n)
    for (let dk = -1; dk <= 1; dk++) {
      const kk = k + dk;
      if (kk < 0 || kk >= NZ) continue;
      for (let dj = -1; dj <= 1; dj++) {
        const jj = j + dj;
        if (jj < 0 || jj >= NY) continue;
        for (let di = -1; di <= 1; di++) {
          const ii = i + di;
          if (ii < 0 || ii >= NX) continue;
          const a = A[27 * n + slot(di, dj, dk)];
          const m = ii + NX * (jj + NY * kk);
          if (map[m] < 0 || (a === 0 && m !== n)) continue;
          cols[nnz] = map[m];
          vals[nnz++] = a;
        }
      }
    }
    rowptr[r + 1] = nnz;
  }
  return { pat: { n: nf, rowptr, colidx: cols.slice(0, nnz), nnz }, val: vals.slice(0, nnz), map, inv };
}

/**
 * Geometric nested dissection of the free nodes of an NX x NY x NZ grid: recursive bisection of index boxes by node
 * planes normal to the longest box side (a plane separates a 27-point stencil); leaves of <= leaf nodes in
 * lexicographic order. Returns perm (new -> old free index).
 */
export function gridNDOrder(NX, NY, NZ, map, leaf = 64) {
  const out = [];
  const emit = (i0, i1, j0, j1, k0, k1) => {
    for (let k = k0; k <= k1; k++)
      for (let j = j0; j <= j1; j++)
        for (let i = i0; i <= i1; i++) {
          const f = map[i + NX * (j + NY * k)];
          if (f >= 0) out.push(f);
        }
  };
  const stack = [[0, NX - 1, 0, NY - 1, 0, NZ - 1, 0]];
  // explicit stack: phase 0 = split, phase 1 = emit separator after both halves
  while (stack.length) {
    const t = stack.pop();
    const [i0, i1, j0, j1, k0, k1, phase] = t;
    if (phase === 1) {
      emit(...t.slice(7, 13));
      continue;
    }
    const lx = i1 - i0 + 1, ly = j1 - j0 + 1, lz = k1 - k0 + 1;
    if (lx * ly * lz <= leaf || (lx < 3 && ly < 3 && lz < 3)) {
      emit(i0, i1, j0, j1, k0, k1);
      continue;
    }
    let A, B, S;
    if (lx >= ly && lx >= lz && lx >= 3) {
      const m = (i0 + i1) >> 1;
      A = [m + 1, i1, j0, j1, k0, k1]; B = [i0, m - 1, j0, j1, k0, k1]; S = [m, m, j0, j1, k0, k1];
    } else if (ly >= lz && ly >= 3) {
      const m = (j0 + j1) >> 1;
      A = [i0, i1, m + 1, j1, k0, k1]; B = [i0, i1, j0, m - 1, k0, k1]; S = [i0, i1, m, m, k0, k1];
    } else if (lz >= 3) {
      const m = (k0 + k1) >> 1;
      A = [i0, i1, j0, j1, m + 1, k1]; B = [i0, i1, j0, j1, k0, m - 1]; S = [i0, i1, j0, j1, m, m];
    } else {
      emit(i0, i1, j0, j1, k0, k1);
      continue;
    }
    // processed in order B, A, then S (stack: push S marker first, then A, then B)
    stack.push([0, 0, 0, 0, 0, 0, 1, ...S]);
    stack.push([...A, 0]);
    stack.push([...B, 0]);
  }
  return Int32Array.from(out);
}

/**
 * Direct solver on the free block of a stencil operator (ported supernodal Cholesky).
 * @param {object} op stencil operator
 * @param {{ordering?: 'nd'|'amd'}} [opt] nd = gridNDOrder (default), amd = ported AMD
 */
export class StencilCholesky {
  constructor(op, { ordering = 'nd' } = {}) {
    const t0 = performance.now();
    this.op = op;
    const { pat, val, map, inv } = stencilToCSR(op);
    this.map = map;
    this.inv = inv;
    const perm = ordering === 'amd' ? amdOrder(pat) : gridNDOrder(op.NX, op.NY, op.NZ, map);
    this.chol = new SparseCholesky(pat, perm);
    const t1 = performance.now();
    if (!this.chol.factor(val)) throw new Error('direct solver: matrix is not positive definite (check that every connected body has a fixed-T or HTC boundary)');
    this.b = new Float64Array(pat.n);
    this.x = new Float64Array(pat.n);
    this.timing = { csr_ordering_symbolic_ms: t1 - t0, factor_ms: performance.now() - t1, nnzL: this.chol.nnzL, n: pat.n, nnzA: pat.nnz };
  }
  /** Solve on padded vectors: x_free = A_ff^-1 b_free; fixed nodes get b (identity rows). */
  solvePadded(b, x) {
    const { inv, op } = this;
    const pad = op.pad;
    for (let r = 0; r < inv.length; r++) this.b[r] = b[pad + inv[r]];
    this.chol.solve(this.b, this.x);
    for (let n = 0; n < op.N; n++) if (op.fixed[n]) x[pad + n] = b[pad + n];
    for (let r = 0; r < inv.length; r++) x[pad + inv[r]] = this.x[r];
    return x;
  }
}
