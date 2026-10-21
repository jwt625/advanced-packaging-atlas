// Geometric multigrid for 27-point stencil operators on rectilinear package grids (DevLog-010 A4, R2 S1 and S8.4):
// x-y semi-coarsening (z keeps every node plane), linear interpolation by node coordinates, Galerkin coarse operators
// (separable RAP: x pass then y pass, exact for P = Px (x) Py (x) I), symmetric z-line Gauss-Seidel smoother (forward
// sweep before, backward sweep after the coarse correction, so the V-cycle is a symmetric preconditioner for PCG),
// ported supernodal Cholesky on the coarsest level. Fixed rows (identity: inactive or Dirichlet nodes) have zero
// interpolation weight; coarse nodes without free fine support become fixed.
// License: GPL-3.0-or-later.

import { createStencil, padded, applyStencil, StencilCholesky, S_CENTER, S_ZM, S_ZP } from './stencil.mjs';
import { wasmLineSweep } from './wasm/accel.mjs';

const SDI = Int8Array.from({ length: 27 }, (_, s) => (s % 3) - 1);
const SDJ = Int8Array.from({ length: 27 }, (_, s) => (Math.floor(s / 3) % 3) - 1);
const SDK = Int8Array.from({ length: 27 }, (_, s) => Math.floor(s / 9) - 1);

/** 1D coarsening map of n nodes at coords xs: coarse = even indices plus the last node. */
export function coarsen1D(xs) {
  const n = xs.length;
  const cIdx = [];
  for (let i = 0; i < n; i += 2) cIdx.push(i);
  if (cIdx[cIdx.length - 1] !== n - 1) cIdx.push(n - 1);
  const cOf = new Int32Array(n).fill(-1);
  cIdx.forEach((f, c) => (cOf[f] = c));
  const cL = new Int32Array(n), cR = new Int32Array(n), wL = new Float64Array(n), wR = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (cOf[i] >= 0) {
      cL[i] = cR[i] = cOf[i];
      wL[i] = 1;
      wR[i] = 0;
    } else {
      cL[i] = cOf[i - 1];
      cR[i] = cOf[i + 1];
      wL[i] = (xs[i + 1] - xs[i]) / (xs[i + 1] - xs[i - 1]);
      wR[i] = 1 - wL[i];
    }
  }
  return { nc: cIdx.length, cIdx: Int32Array.from(cIdx), cL, cR, wL, wR, xs: Float64Array.from(cIdx, (f) => xs[f]) };
}

/**
 * Per-node interpolation weights along one axis of operator `op` (map from coarsen1D for that axis). 'geometric':
 * linear in the node coordinate (the 1D map weights). 'operator': collapsed-stencil weights w_L = a_W / (a_W + a_E)
 * with a_W, a_E the sums of the stencil entries of the node's -1 / +1 planes along the axis (operator-dependent
 * interpolation for semi-coarsening, as in Dendy's black-box MG and Schaffer's semi-coarsening MG): follows k jumps
 * (Cu-rich layers vs polymer, die edges) where linear interpolation does not. Falls back to geometric where the
 * collapsed couplings are not both negative.
 */
function nodeWeights(op, axis, map, mode) {
  const { NX, NY, NZ, N, A, fixed } = op;
  const nwL = new Float64Array(N), nwR = new Float64Array(N);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        const ia = axis === 0 ? i : j;
        let wl = map.wL[ia], wr = map.wR[ia];
        if (mode === 'operator' && wr !== 0 && !fixed[n]) {
          let aW = 0, aE = 0;
          for (let s = 0; s < 27; s++) {
            const d = axis === 0 ? SDI[s] : SDJ[s];
            if (d === -1) aW += A[27 * n + s];
            else if (d === 1) aE += A[27 * n + s];
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

/**
 * Galerkin product along one axis (0 = x, 1 = y): Ac = Pa^T A Pa, skipping fixed fine rows (their interpolation
 * weight is zero; their columns are zero already).
 */
function rapAxis(op, axis, map) {
  const { NX, NY, NZ, A, fixed } = op;
  const NXc = axis === 0 ? map.nc : NX, NYc = axis === 1 ? map.nc : NY;
  const cop = createStencil(NXc, NYc, NZ);
  const Ac = cop.A;
  const { cL, cR } = map;
  const { nwL, nwR } = map.nw;
  const off = op.off;
  // slot stride of the coarsened axis and the slot remainder without that axis' offset digit
  const st = axis === 0 ? 1 : 3;
  const SD = axis === 0 ? SDI : SDJ;
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        if (fixed[n]) continue;
        const ia = axis === 0 ? i : j;
        const I0 = cL[ia], I1 = cR[ia], w0 = nwL[n], w1 = nwR[n];
        // coarse row bases of the two parents (slot digit of the coarsened axis removed below)
        const r0 = axis === 0 ? 27 * (I0 + NXc * (j + NY * k)) : 27 * (i + NX * (I0 + NYc * k));
        const r1 = axis === 0 ? 27 * (I1 + NXc * (j + NY * k)) : 27 * (i + NX * (I1 + NYc * k));
        const base = 27 * n;
        for (let s = 0; s < 27; s++) {
          const a = A[base + s];
          if (a === 0) continue;
          const d = SD[s];
          const rest = s - st * (d + 1) + st; // slot with offset digit 0 along the axis, plus one step (o = J - I + 1)
          const ja = ia + d;
          const m = n + off[s];
          const J0 = cL[ja], J1 = cR[ja], v0 = nwL[m], v1 = nwR[m];
          const a0 = w0 * a;
          Ac[r0 + rest + st * (J0 - I0)] += a0 * v0;
          if (v1 !== 0) Ac[r0 + rest + st * (J1 - I0)] += a0 * v1;
          if (w1 !== 0) {
            const a1 = w1 * a;
            Ac[r1 + rest + st * (J0 - I1)] += a1 * v0;
            if (v1 !== 0) Ac[r1 + rest + st * (J1 - I1)] += a1 * v1;
          }
        }
      }
  return cop;
}

/** Mark coarse nodes without free support as fixed (identity rows). */
function fixEmptyRows(op) {
  const { N, A, fixed } = op;
  let dmax = 0;
  for (let n = 0; n < N; n++) dmax = Math.max(dmax, A[27 * n + S_CENTER]);
  const tiny = 1e-300;
  for (let n = 0; n < N; n++) {
    if (A[27 * n + S_CENTER] > tiny * dmax && A[27 * n + S_CENTER] > 0) continue;
    for (let s = 0; s < 27; s++) A[27 * n + s] = 0;
    A[27 * n + S_CENTER] = 1;
    fixed[n] = 1;
  }
}

/** Thomas factors of every z column: cp (modified upper) and dinv (inverse pivots). */
function lineFactors(op) {
  const { NX, NY, NZ, A } = op;
  const N = op.N, P = NX * NY;
  const cp = new Float64Array(N), dinv = new Float64Array(N);
  for (let col = 0; col < P; col++) {
    let prev = 0;
    for (let k = 0, n = col; k < NZ; k++, n += P) {
      const a = k > 0 ? A[27 * n + S_ZM] : 0;
      const den = A[27 * n + S_CENTER] - a * prev;
      if (!(den > 0)) throw new Error('multigrid: z-line pivot not positive (operator not SPD)');
      dinv[n] = 1 / den;
      prev = cp[n] = k < NZ - 1 ? A[27 * n + S_ZP] * dinv[n] : 0;
    }
  }
  return { cp, dinv };
}

/**
 * One four-colour z-line Gauss-Seidel sweep on padded x for A x = b (b padded). Columns (i, j) are coloured by
 * (i mod 2, j mod 2): a 27-point stencil never couples two columns of one colour, so each colour is an exact block
 * solve of independent tridiagonal systems, eliminated plane by plane in memory order (profile pass 2026-10-20: the
 * lexicographic column order walked memory with stride NX NY). Colours 0..3 forward, 3..0 backward (adjoint), so
 * forward pre- and backward post-smoothing give a symmetric V-cycle. `T` is an N-length scratch array.
 */
function lineSweep(lev, b, x, forward, T) {
  if (lev.op._wk && x.buffer === lev.op._wk.memory.buffer && b.buffer === x.buffer) return wasmLineSweep(lev, b, x, forward);
  const { op, cp, dinv } = lev;
  const { NX, NY, NZ, A, off, pad } = op;
  const P = NX * NY;
  const o0 = off[0], o1 = off[1], o2 = off[2], o3 = off[3], o5 = off[5], o6 = off[6], o7 = off[7], o8 = off[8],
    o9 = off[9], o10 = off[10], o11 = off[11], o12 = off[12], o14 = off[14], o15 = off[15], o16 = off[16], o17 = off[17],
    o18 = off[18], o19 = off[19], o20 = off[20], o21 = off[21], o23 = off[23], o24 = off[24], o25 = off[25], o26 = off[26];
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc;
    const ci = color & 1, cj = color >> 1;
    for (let k = 0; k < NZ; k++)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const a = 27 * n, q = pad + n;
          let r = b[q] - (A[a] * x[q + o0] + A[a + 1] * x[q + o1] + A[a + 2] * x[q + o2] + A[a + 3] * x[q + o3]
            + A[a + 5] * x[q + o5] + A[a + 6] * x[q + o6] + A[a + 7] * x[q + o7] + A[a + 8] * x[q + o8]
            + A[a + 9] * x[q + o9] + A[a + 10] * x[q + o10] + A[a + 11] * x[q + o11] + A[a + 12] * x[q + o12]
            + A[a + 14] * x[q + o14] + A[a + 15] * x[q + o15] + A[a + 16] * x[q + o16] + A[a + 17] * x[q + o17]
            + A[a + 18] * x[q + o18] + A[a + 19] * x[q + o19] + A[a + 20] * x[q + o20] + A[a + 21] * x[q + o21]
            + A[a + 23] * x[q + o23] + A[a + 24] * x[q + o24] + A[a + 25] * x[q + o25] + A[a + 26] * x[q + o26]);
          if (k > 0) r -= A[a + S_ZM] * T[n - P];
          T[n] = r * dinv[n];
        }
    for (let k = NZ - 1; k >= 0; k--)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = pad + n;
          x[q] = k < NZ - 1 ? T[n] - cp[n] * x[q + P] : T[n];
        }
  }
}

/** Line slots (lower, centre, upper) and the 24 off-line slots for lines along x (0), y (1), z (2). */
const LINE = [0, 1, 2].map((axis) => {
  const lo = axis === 0 ? 12 : axis === 1 ? 10 : 4, hi = axis === 0 ? 14 : axis === 1 ? 16 : 22;
  const offl = [];
  for (let s = 0; s < 27; s++) if (s !== lo && s !== S_CENTER && s !== hi) offl.push(s);
  return { lo, hi, offl: Int32Array.from(offl) };
});

/** Thomas factors for lines along x (axis 0) or y (axis 1); same layout as lineFactors (z). */
function lineFactorsAxis(op, axis) {
  const { NX, NY, NZ, N, A } = op;
  const { lo, hi } = LINE[axis];
  const st = axis === 0 ? 1 : NX, L = axis === 0 ? NX : NY;
  const cp = new Float64Array(N), dinv = new Float64Array(N);
  for (let k = 0; k < NZ; k++)
    for (let o = 0; o < (axis === 0 ? NY : NX); o++) {
      const n0 = axis === 0 ? NX * (o + NY * k) : o + NX * NY * k;
      let prev = 0;
      for (let q = 0, n = n0; q < L; q++, n += st) {
        const a = q > 0 ? A[27 * n + lo] : 0;
        const den = A[27 * n + S_CENTER] - a * prev;
        if (!(den > 0)) throw new Error('multigrid: line pivot not positive (operator not SPD)');
        dinv[n] = 1 / den;
        prev = cp[n] = q < L - 1 ? A[27 * n + hi] * dinv[n] : 0;
      }
    }
  return { cp, dinv };
}

/** Four-colour line Gauss-Seidel along x (axis 0) or y (axis 1); colours by the parities of the two other indices. */
function lineSweepAxis(lev, b, x, forward, T, axis) {
  const { op } = lev;
  const { cp, dinv } = axis === 0 ? lev.fx : lev.fy;
  const { NX, NY, NZ, A, off, pad } = op;
  const { lo, offl } = LINE[axis];
  const st = axis === 0 ? 1 : NX, L = axis === 0 ? NX : NY, M = axis === 0 ? NY : NX;
  const oo = Int32Array.from(offl, (s) => off[s]);
  const no = offl.length;
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc;
    const cm = color & 1, ck = color >> 1;
    for (let k = ck; k < NZ; k += 2)
      for (let o = cm; o < M; o += 2) {
        const n0 = axis === 0 ? NX * (o + NY * k) : o + NX * NY * k;
        let prev = 0;
        for (let q = 0, n = n0; q < L; q++, n += st) {
          const a = 27 * n, qq = pad + n;
          let r = b[qq];
          for (let t = 0; t < no; t++) r -= A[a + offl[t]] * x[qq + oo[t]];
          if (q > 0) r -= A[a + lo] * prev;
          prev = T[n] = r * dinv[n];
        }
        let nxt = 0;
        for (let q = L - 1, n = n0 + st * (L - 1); q >= 0; q--, n -= st) {
          const v = T[n] - cp[n] * nxt;
          x[pad + n] = v;
          nxt = v;
        }
      }
  }
}

/** r_c = P^T r through the two axis maps (padded in and out); tmp holds the x-coarsened intermediate. */
function restrict(fine, coarse, r, rc, tmp) {
  const { NX, NY, NZ, pad } = fine.op;
  const mx = fine.mapX, my = fine.mapY;
  const NXc = mx ? mx.nc : NX;
  const padT = NXc * NY + NXc + 1;
  tmp.fill(0);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const v = r[pad + i + NX * (j + NY * k)];
        if (v === 0) continue;
        const base = padT + NXc * (j + NY * k);
        if (!mx) tmp[base + i] += v;
        else {
          const n = i + NX * (j + NY * k), wl = mx.nw.nwL[n], wr = mx.nw.nwR[n];
          tmp[base + mx.cL[i]] += wl * v;
          if (wr !== 0) tmp[base + mx.cR[i]] += wr * v;
        }
      }
  const cop = coarse.op;
  const NYc = cop.NY;
  rc.fill(0);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NXc; i++) {
        const v = tmp[padT + i + NXc * (j + NY * k)];
        if (v === 0) continue;
        if (!my) rc[cop.pad + i + NXc * (j + NYc * k)] += v;
        else {
          const t = i + NXc * (j + NY * k), wl = my.nw.nwL[t], wr = my.nw.nwR[t];
          rc[cop.pad + i + NXc * (my.cL[j] + NYc * k)] += wl * v;
          if (wr !== 0) rc[cop.pad + i + NXc * (my.cR[j] + NYc * k)] += wr * v;
        }
      }
  // coarse fixed rows carry no residual
  for (let n = 0; n < cop.N; n++) if (cop.fixed[n]) rc[cop.pad + n] = 0;
}

/** x += P e_c on free fine nodes (y pass into the x-coarsened intermediate `tmp`, then x pass). */
function prolongAdd(fine, coarse, ec, x, tmp) {
  const { NX, NY, NZ, pad, fixed } = fine.op;
  const mx = fine.mapX, my = fine.mapY;
  const cop = coarse.op;
  const NXc = cop.NX, NYc = cop.NY;
  const padT = NXc * NY + NXc + 1;
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NXc; i++) {
        const t = i + NXc * (j + NY * k);
        let v;
        if (!my) v = ec[cop.pad + i + NXc * (j + NYc * k)];
        else {
          const wl = my.nw.nwL[t], wr = my.nw.nwR[t];
          v = wl * ec[cop.pad + i + NXc * (my.cL[j] + NYc * k)];
          if (wr !== 0) v += wr * ec[cop.pad + i + NXc * (my.cR[j] + NYc * k)];
        }
        tmp[padT + t] = v;
      }
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        if (fixed[n]) continue;
        const base = padT + NXc * (j + NY * k);
        if (!mx) x[pad + n] += tmp[base + i];
        else {
          const wl = mx.nw.nwL[n], wr = mx.nw.nwR[n];
          x[pad + n] += wl * tmp[base + mx.cL[i]] + (wr !== 0 ? wr * tmp[base + mx.cR[i]] : 0);
        }
      }
}

/** Sums of |collapsed off-line couplings| along x and along y over all nodes (anisotropy measure for 'auto'). */
function axisCoupling(op) {
  const { N, A } = op;
  let cx = 0, cy = 0;
  for (let n = 0; n < N; n++) {
    let ax = 0, ay = 0;
    for (let s = 0; s < 27; s++) {
      const a = A[27 * n + s];
      if (SDI[s] !== 0) ax += a;
      if (SDJ[s] !== 0) ay += a;
    }
    cx += Math.abs(ax);
    cy += Math.abs(ay);
  }
  return [cx, cy];
}

/**
 * Build the hierarchy.
 * @param {object} op fine stencil operator (fixed rows identity)
 * @param {Float64Array} xs node x coordinates (length NX)
 * @param {Float64Array} ys node y coordinates (length NY)
 * @param {{coarseMax?: number, maxLevels?: number, ordering?: string, interp?: 'operator' | 'geometric'}} [opt]
 */
export function buildMG(op, xs, ys, { coarseMax = 6000, maxLevels = 30, ordering = 'nd', interp = 'operator', nu = 2, smoother = 'z', coarsen = 'auto', theta = 0.1 } = {}) {
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
      // semi-coarsen only the in-plane direction(s) with strong coupling: global collapsed coupling sums per axis
      const [cx2, cy2] = axisCoupling(cur);
      if (cx2 < theta * cy2) canX = false;
      else if (cy2 < theta * cx2) canY = false;
    }
    lev.coarsened = (canX ? 'x' : '') + (canY ? 'y' : '');
    if (cur.N <= coarseMax || (!canX && !canY)) break;
    let next = cur;
    if (canX) {
      lev.mapX = coarsen1D(cx);
      lev.mapX.nw = nodeWeights(next, 0, lev.mapX, interp);
      next = rapAxis(next, 0, lev.mapX);
      cx = lev.mapX.xs;
    }
    if (canY) {
      lev.mapY = coarsen1D(cy);
      if (canX) next.fixed.fill(0); // intermediate (x-coarsened) operator: rows of all nodes take part
      lev.mapY.nw = nodeWeights(next, 1, lev.mapY, interp);
      next = rapAxis(next, 1, lev.mapY);
      cy = lev.mapY.xs;
    }
    fixEmptyRows(next);
    cur = next;
  }
  for (let l = 0; l < levels.length; l++) {
    const lev = levels[l];
    const isCoarsest = l === levels.length - 1;
    if (isCoarsest) lev.direct = new StencilCholesky(lev.op, { ordering });
    else {
      Object.assign(lev, lineFactors(lev.op));
      if (smoother === 'xyz') {
        lev.fx = lineFactorsAxis(lev.op, 0);
        lev.fy = lineFactorsAxis(lev.op, 1);
      }
    }
    lev.t = new Float64Array(lev.op.N);
    if (l > 0) {
      lev.b = padded(lev.op);
      lev.x = padded(lev.op);
    }
    lev.r = padded(lev.op);
    if (!isCoarsest) {
      const NXc = lev.mapX ? lev.mapX.nc : lev.op.NX;
      lev.tmp = new Float64Array(NXc * lev.op.NY * lev.op.NZ + 2 * (NXc * lev.op.NY + NXc + 1));
    }
  }
  const mg = { levels, setup_ms: performance.now() - t0, nu, smoother };
  mg.stats = {
    levels: levels.length,
    nodes: levels.map((l) => l.op.N),
    coarsened: levels.map((l) => l.coarsened ?? ''),
    coarse_n: levels[levels.length - 1].direct.timing.n,
    coarse_nnzL: levels[levels.length - 1].direct.timing.nnzL,
    operatorComplexity: levels.reduce((a, l) => a + l.op.N, 0) / op.N,
  };
  return mg;
}

function vcycle(mg, l, b, x) {
  const lev = mg.levels[l];
  if (lev.direct) {
    lev.direct.solvePadded(b, x);
    return;
  }
  const { op, t } = lev;
  x.fill(0);
  const alt = mg.smoother === 'xyz';
  for (let s = 0; s < mg.nu; s++) {
    lineSweep(lev, b, x, true, t);
    if (alt) {
      lineSweepAxis(lev, b, x, true, t, 0);
      lineSweepAxis(lev, b, x, true, t, 1);
    }
  }
  applyStencil(op, x, lev.r);
  const pad = op.pad, r = lev.r;
  for (let n = 0; n < op.N; n++) r[pad + n] = b[pad + n] - r[pad + n];
  const cl = mg.levels[l + 1];
  restrict(lev, cl, r, cl.b, lev.tmp);
  vcycle(mg, l + 1, cl.b, cl.x);
  prolongAdd(lev, cl, cl.x, x, lev.tmp);
  for (let s = 0; s < mg.nu; s++) {
    if (alt) {
      lineSweepAxis(lev, b, x, false, t, 1);
      lineSweepAxis(lev, b, x, false, t, 0);
    }
    lineSweep(lev, b, x, false, t);
  }
}

/** Preconditioner z = M^-1 r (padded fine vectors). */
export function mgPrecond(mg, r, z) {
  vcycle(mg, 0, r, z);
  return z;
}
