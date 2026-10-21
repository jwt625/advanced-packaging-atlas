// Block multigrid on a symmetric half block stencil (lane L1 wave 4, audit M10; for lane L8's low-memory mechanics
// path above 3e5 DOF). Operator storage contract (L8 src/mech/lowmem.mjs assembleHalfStencil): {NX, NY, NZ, N, H,
// fixed, off, pad}, H[(14 n + s - 13) 9 + 3 a + b] for the centre and the 13 upper slots s >= 13 (f64, 126 doubles per
// node); the block of a lower slot s < 13 is the transpose of the upper block (n - off_s, 26 - s); fixed DOFs are
// identity rows with zero couplings. Vectors: padded interleaved, DOF a of node n at 3 (pad + n) + a.
// Hierarchy: fine level on H (z-line block Gauss-Seidel, four colours, nu sweeps before / after; residual with the
// half-stencil apply), first coarse operator by one Galerkin pass straight from H, then la/block.mjs below. The
// coarsening directions follow the strong in-plane coupling ('auto': an axis is coarsened only when its collapsed
// block-trace coupling is >= theta times the other axis'); this and nu = 2 are what la/block.mjs measured as the cheap
// fixes (in-plane anisotropy 369 -> 43 iterations, DevLog/lanes/L1-engine-thermal.md). Coarse operators can be stored
// in Float32 after the hierarchy is built (arithmetic stays f64; M^-1 stays a fixed symmetric operator).
// License: GPL-3.0-or-later.

import { createBlockStencil, paddedBlock, buildBlockMG, blockMGPrecond, restrictBlock, prolongAddBlock, nodeWeightsBlock, addBlockElement, constrainBlock, blockLineFactors, axisCouplingBlock, BlockCholesky } from './block.mjs';
import { coarsen1D } from './mg.mjs';

const SDI = Int8Array.from({ length: 27 }, (_, s) => (s % 3) - 1);
const SDJ = Int8Array.from({ length: 27 }, (_, s) => (Math.floor(s / 3) % 3) - 1);
const SDK = Int8Array.from({ length: 27 }, (_, s) => Math.floor(s / 9) - 1);

/** y = A x for the half stencil (padded vectors). */
export function applyHalfStencil(op, x, y) {
  const { N, H, off, pad } = op;
  y.fill(0);
  for (let n = 0; n < N; n++) {
    const q = 3 * (pad + n);
    const x0 = x[q], x1 = x[q + 1], x2 = x[q + 2];
    let h = 126 * n;
    let y0 = H[h] * x0 + H[h + 1] * x1 + H[h + 2] * x2;
    let y1 = H[h + 3] * x0 + H[h + 4] * x1 + H[h + 5] * x2;
    let y2 = H[h + 6] * x0 + H[h + 7] * x1 + H[h + 8] * x2;
    h += 9;
    for (let s = 14; s < 27; s++, h += 9) {
      const m = q + 3 * off[s];
      const z0 = x[m], z1 = x[m + 1], z2 = x[m + 2];
      y0 += H[h] * z0 + H[h + 1] * z1 + H[h + 2] * z2;
      y1 += H[h + 3] * z0 + H[h + 4] * z1 + H[h + 5] * z2;
      y2 += H[h + 6] * z0 + H[h + 7] * z1 + H[h + 8] * z2;
      y[m] += H[h] * x0 + H[h + 3] * x1 + H[h + 6] * x2;
      y[m + 1] += H[h + 1] * x0 + H[h + 4] * x1 + H[h + 7] * x2;
      y[m + 2] += H[h + 2] * x0 + H[h + 5] * x1 + H[h + 8] * x2;
    }
    y[q] += y0;
    y[q + 1] += y1;
    y[q + 2] += y2;
  }
  for (let d = 0; d < 3 * pad; d++) y[d] = 0;
  for (let d = 3 * (pad + N); d < y.length; d++) y[d] = 0;
  return y;
}

function inv3(M, out, o) {
  const [a, b, c, d, e, f, g, h, i] = M;
  const A0 = e * i - f * h, B0 = -(d * i - f * g), C0 = d * h - e * g;
  const det = a * A0 + b * B0 + c * C0;
  if (!(det > 0) || !(a > 0)) throw new Error('half multigrid: z-line pivot block not positive definite');
  const r = 1 / det;
  out[o] = A0 * r; out[o + 1] = -(b * i - c * h) * r; out[o + 2] = (b * f - c * e) * r;
  out[o + 3] = B0 * r; out[o + 4] = (a * i - c * g) * r; out[o + 5] = -(a * f - c * d) * r;
  out[o + 6] = C0 * r; out[o + 7] = -(a * h - b * g) * r; out[o + 8] = (a * e - b * d) * r;
}

/** Block Thomas factors along z from H: Sinv (inverse pivots) and C = Sinv U (U = H slot 22 of n). */
function halfLineFactors(op) {
  const { NX, NY, NZ, N, H } = op, P = NX * NY;
  const Sinv = new Float64Array(9 * N), C = new Float64Array(9 * N), M = new Array(9);
  for (let col = 0; col < P; col++)
    for (let k = 0, n = col; k < NZ; k++, n += P) {
      const c = 126 * n;
      for (let e = 0; e < 9; e++) M[e] = H[c + e];
      if (k > 0) {
        const u = (14 * (n - P) + 9) * 9, q = 9 * (n - P); // L = U(n - P)^T
        for (let a = 0; a < 3; a++)
          for (let b = 0; b < 3; b++) M[3 * a + b] -= H[u + a] * C[q + b] + H[u + 3 + a] * C[q + 3 + b] + H[u + 6 + a] * C[q + 6 + b];
      }
      inv3(M, Sinv, 9 * n);
      if (k < NZ - 1) {
        const u = (14 * n + 9) * 9, d = 9 * n;
        for (let a = 0; a < 3; a++)
          for (let b = 0; b < 3; b++) C[d + 3 * a + b] = Sinv[d + 3 * a] * H[u + b] + Sinv[d + 3 * a + 1] * H[u + 3 + b] + Sinv[d + 3 * a + 2] * H[u + 6 + b];
      }
    }
  return { Sinv, C };
}

/** Four-colour z-line block Gauss-Seidel sweep on H (columns of one colour are independent). */
function halfLineSweep(lev, b, x, forward) {
  const { op, Sinv, C, T } = lev;
  const { NX, NY, NZ, N, H, off, pad } = op, P = NX * NY;
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc, ci = color & 1, cj = color >> 1;
    for (let k = 0; k < NZ; k++)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = 3 * (pad + n);
          let r0 = b[q], r1 = b[q + 1], r2 = b[q + 2];
          let h = 126 * n + 9;
          for (let s = 14; s < 27; s++, h += 9) {
            if (s === 22) continue;
            const o = q + 3 * off[s], z0 = x[o], z1 = x[o + 1], z2 = x[o + 2];
            r0 -= H[h] * z0 + H[h + 1] * z1 + H[h + 2] * z2;
            r1 -= H[h + 3] * z0 + H[h + 4] * z1 + H[h + 5] * z2;
            r2 -= H[h + 6] * z0 + H[h + 7] * z1 + H[h + 8] * z2;
          }
          for (let s = 0; s < 13; s++) {
            if (s === 4) continue;
            const m = n + off[s];
            if (m < 0 || m >= N) continue;
            const o = 3 * (pad + m), z0 = x[o], z1 = x[o + 1], z2 = x[o + 2];
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
          T[3 * n] = Sinv[d] * r0 + Sinv[d + 1] * r1 + Sinv[d + 2] * r2;
          T[3 * n + 1] = Sinv[d + 3] * r0 + Sinv[d + 4] * r1 + Sinv[d + 5] * r2;
          T[3 * n + 2] = Sinv[d + 6] * r0 + Sinv[d + 7] * r1 + Sinv[d + 8] * r2;
        }
    for (let k = NZ - 1; k >= 0; k--)
      for (let j = cj; j < NY; j += 2)
        for (let i = ci, n = ci + NX * (j + NY * k); i < NX; i += 2, n += 2) {
          const q = 3 * (pad + n);
          if (k === NZ - 1) { x[q] = T[3 * n]; x[q + 1] = T[3 * n + 1]; x[q + 2] = T[3 * n + 2]; continue; }
          const c = 9 * n, o = q + 3 * P, y0 = x[o], y1 = x[o + 1], y2 = x[o + 2];
          x[q] = T[3 * n] - (C[c] * y0 + C[c + 1] * y1 + C[c + 2] * y2);
          x[q + 1] = T[3 * n + 1] - (C[c + 3] * y0 + C[c + 4] * y1 + C[c + 5] * y2);
          x[q + 2] = T[3 * n + 2] - (C[c + 6] * y0 + C[c + 7] * y1 + C[c + 8] * y2);
        }
  }
}

/** Collapsed block-trace couplings along x and y summed over the nodes (anisotropy measure of 'auto'). */
export function halfAxisCoupling(op) {
  const { N, H, off } = op;
  const ax = new Float64Array(N), ay = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    let h = (14 * n + 1) * 9;
    for (let s = 14; s < 27; s++, h += 9) {
      const m = n + off[s];
      if (m < 0 || m >= N) continue;
      const tr = H[h] + H[h + 4] + H[h + 8];
      if (SDI[s]) { ax[n] += tr; ax[m] += tr; }
      if (SDJ[s]) { ay[n] += tr; ay[m] += tr; }
    }
  }
  let cx = 0, cy = 0;
  for (let n = 0; n < N; n++) { cx += Math.abs(ax[n]); cy += Math.abs(ay[n]); }
  return [cx, cy];
}

/** Parents (<= 2) and weights per fine index for a 1D map, or identity. */
function parents(map, n) {
  const c0 = new Int32Array(n), c1 = new Int32Array(n), w0 = new Float64Array(n), w1 = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    if (!map) { c0[i] = c1[i] = i; w0[i] = 1; w1[i] = 0; continue; }
    c0[i] = map.cL[i]; c1[i] = map.cR[i]; w0[i] = map.wL[i]; w1[i] = map.wR[i];
  }
  return { c0, c1, w0, w1 };
}

/** Galerkin P^T A P from H in one pass (x and / or y coarsened); rows of fixed fine DOFs are skipped. */
function halfRAP(op, mx, my) {
  const { NX, NY, NZ, N, H, fixed, off } = op;
  const NXc = mx ? mx.nc : NX, NYc = my ? my.nc : NY;
  const cop = createBlockStencil(NXc, NYc, NZ);
  const Ac = cop.A, B = new Float64Array(9);
  const PX = parents(mx, NX), PY = parents(my, NY);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        const f0 = fixed[3 * n], f1 = fixed[3 * n + 1], f2 = fixed[3 * n + 2];
        if (f0 && f1 && f2) continue;
        for (let s = 0; s < 27; s++) {
          const im = i + SDI[s], jm = j + SDJ[s], km = k + SDK[s];
          if (im < 0 || jm < 0 || km < 0 || im >= NX || jm >= NY || km >= NZ) continue;
          if (s >= 13) { const h = (14 * n + s - 13) * 9; for (let e = 0; e < 9; e++) B[e] = H[h + e]; }
          else { const m = n + off[s], h = (14 * m + 13 - s) * 9; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) B[3 * a + b] = H[h + 3 * b + a]; }
          if (f0) B[0] = B[1] = B[2] = 0;
          if (f1) B[3] = B[4] = B[5] = 0;
          if (f2) B[6] = B[7] = B[8] = 0;
          let nz = false;
          for (let e = 0; e < 9; e++) if (B[e] !== 0) { nz = true; break; }
          if (!nz) continue;
          const dk = SDK[s] + 1;
          for (let u = 0; u < 2; u++) {
            const I = u ? PX.c1[i] : PX.c0[i], wi = u ? PX.w1[i] : PX.w0[i];
            if (!wi) continue;
            for (let v = 0; v < 2; v++) {
              const J = v ? PY.c1[j] : PY.c0[j], wj = v ? PY.w1[j] : PY.w0[j];
              if (!wj) continue;
              const row = I + NXc * (J + NYc * k);
              for (let uq = 0; uq < 2; uq++) {
                const Iq = uq ? PX.c1[im] : PX.c0[im], vi = uq ? PX.w1[im] : PX.w0[im];
                if (!vi) continue;
                for (let vq = 0; vq < 2; vq++) {
                  const Jq = vq ? PY.c1[jm] : PY.c0[jm], vj = vq ? PY.w1[jm] : PY.w0[jm];
                  if (!vj) continue;
                  const w = wi * wj * vi * vj, base = (27 * row + (Iq - I + 1) + 3 * (Jq - J + 1) + 9 * dk) * 9;
                  for (let e = 0; e < 9; e++) Ac[base + e] += w * B[e];
                }
              }
            }
          }
        }
      }
  // coarse DOFs without free support: identity rows
  const { N: Nc } = cop;
  let dmax = 0;
  for (let q = 0; q < Nc; q++) for (let a = 0; a < 3; a++) dmax = Math.max(dmax, Ac[(27 * q + 13) * 9 + 4 * a]);
  for (let q = 0; q < Nc; q++)
    for (let a = 0; a < 3; a++) {
      const dg = Ac[(27 * q + 13) * 9 + 4 * a];
      if (dg > 1e-300 * dmax && dg > 0) continue;
      for (let s = 0; s < 27; s++) for (let c = 0; c < 3; c++) Ac[(27 * q + s) * 9 + 3 * a + c] = 0;
      Ac[(27 * q + 13) * 9 + 4 * a] = 1;
      cop.fixed[3 * q + a] = 1;
    }
  void N;
  return cop;
}

/**
 * Build the hierarchy on a half-stencil operator.
 * @param {object} op half stencil {NX, NY, NZ, N, H, fixed, off, pad} (L8 assembleHalfStencil)
 * @param {Float64Array} xs @param {Float64Array} ys @param {Float64Array} zs node coordinates
 * @param {{coarseMax?: number, nu?: number, coarsen?: 'auto' | 'xy' | 'x' | 'y', theta?: number, f32?: boolean, floating?: boolean}} [opt]
 *   floating: no constrained DOF (rigid-body modes handled on the coarsest level; project them in PCG)
 * @returns {{precond: (r: Float64Array, z: Float64Array) => void, stats: object}}
 */
export function buildHalfBlockMG(op, xs, ys, zs, { coarseMax = 3000, nu = 2, coarsen = 'auto', theta = 0.1, f32 = true, floating = false, modes = null } = {}) {
  const t0 = performance.now();
  let canX = op.NX >= 4, canY = op.NY >= 4;
  if (coarsen === 'x') canY = false;
  else if (coarsen === 'y') canX = false;
  else if (coarsen === 'auto' && canX && canY) {
    const [cx, cy] = halfAxisCoupling(op);
    if (cx < theta * cy) canX = false;
    else if (cy < theta * cx) canY = false;
  }
  const lev0 = { op, mapX: canX ? coarsen1D(xs) : null, mapY: canY ? coarsen1D(ys) : null, ...halfLineFactors(op), coarsened: (canX ? 'x' : '') + (canY ? 'y' : '') };
  lev0.T = new Float64Array(3 * op.N);
  lev0.r = paddedBlock(op);
  // per-node geometric weights for the la/block.mjs transfers (they read map.nw)
  const opW = { NX: op.NX, NY: op.NY, NZ: op.NZ, N: op.N, fixed: op.fixed };
  if (lev0.mapX) lev0.mapX.nw = nodeWeightsBlock(opW, 0, lev0.mapX, 'geometric');
  const cop = halfRAP(op, lev0.mapX, lev0.mapY);
  if (lev0.mapY) {
    // weights of the y pass live on the x-coarsened intermediate grid
    const NXc = lev0.mapX ? lev0.mapX.nc : op.NX;
    lev0.mapY.nw = nodeWeightsBlock({ NX: NXc, NY: op.NY, NZ: op.NZ, N: NXc * op.NY * op.NZ, fixed: new Uint8Array(3 * NXc * op.NY * op.NZ) }, 1, lev0.mapY, 'geometric');
  }
  const sub = buildBlockMG(cop, lev0.mapX ? lev0.mapX.xs : xs, lev0.mapY ? lev0.mapY.xs : ys, zs, { coarseMax, nu, coarsen, theta, floating, modes });
  let saved = 0;
  if (f32)
    for (const l of sub.levels) {
      if (l.direct || !(l.op.A instanceof Float64Array)) continue;
      saved += 4 * l.op.A.length;
      l.op.A = Float32Array.from(l.op.A);
    }
  const NXc = lev0.mapX ? lev0.mapX.nc : op.NX;
  lev0.tmp = new Float64Array(3 * (NXc * op.NY * op.NZ + 2 * (NXc * op.NY + NXc + 1)));
  const rc = paddedBlock(cop), ec = paddedBlock(cop);
  const c0 = sub.levels[0];
  const precond = (b, x) => {
    x.fill(0);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, true);
    applyHalfStencil(op, x, lev0.r);
    const r = lev0.r, p3 = 3 * op.pad;
    for (let d = p3; d < p3 + 3 * op.N; d++) r[d] = b[d] - r[d];
    restrictBlock(lev0, c0, r, rc, lev0.tmp);
    blockMGPrecond(sub, rc, ec);
    prolongAddBlock(lev0, c0, ec, x, lev0.tmp);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, false);
  };
  return {
    precond,
    stats: { impl: 'l1-half', levels: 1 + sub.levels.length, nodes: [op.N, ...sub.stats.nodes], coarsened: [lev0.coarsened, ...sub.stats.coarsened], coarse_dofs: sub.stats.coarse_dofs, f32_saved_MB: Math.round(saved / 2 ** 20), setup_ms: performance.now() - t0 },
  };
}

// ---- rediscretised coarse levels (wave 5, M10b): non-locking coarse spaces for q1im ---------------------------------

/** Coarse cells of a 1D coarsening map: coarse cell I covers fine cells [cIdx[I], cIdx[I + 1]). */
const cellRanges = (map, nCells) => (map ? Array.from({ length: map.nc - 1 }, (_, I) => [map.cIdx[I], map.cIdx[I + 1]]) : Array.from({ length: nCells }, (_, i) => [i, i + 1]));

/** Volume-averaged cell stiffness (6 x 6, row-major) of the coarse cells; null entries for void coarse cells. */
function coarsenCellD(D, act, xs, ys, zs, rx, ry) {
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1;
  const ncx = rx.length, ncy = ry.length;
  const Dc = new Float64Array(36 * ncx * ncy * nz), actC = new Uint8Array(ncx * ncy * nz);
  for (let k = 0; k < nz; k++) {
    const hz = zs[k + 1] - zs[k];
    for (let J = 0; J < ncy; J++)
      for (let I = 0; I < ncx; I++) {
        const cc = I + ncx * (J + ncy * k);
        let V = 0;
        for (let j = ry[J][0]; j < ry[J][1]; j++)
          for (let i = rx[I][0]; i < rx[I][1]; i++) {
            const v = (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]) * hz;
            V += v;
            const c = i + nx * (j + ny * k);
            if (!act[c]) continue;
            actC[cc] = 1;
            for (let e = 0; e < 36; e++) Dc[36 * cc + e] += v * D[36 * c + e];
          }
        if (actC[cc]) for (let e = 0; e < 36; e++) Dc[36 * cc + e] /= V;
      }
  }
  return { D: Dc, act: actC };
}

/**
 * Rediscretised coarse operator: q1im (or the injected element) re-assembled on the coarse grid with averaged cell
 * stiffness; fixed DOFs from the fine level (coincident coarse node, else the left parent), inactive coarse nodes
 * identity rows.
 */
function rediscretize(level, elementOperator, cache) {
  const { xs, ys, zs, D, act } = level;
  const NX = xs.length, NY = ys.length, NZ = zs.length, nx = NX - 1, ny = NY - 1, nz = NZ - 1;
  const op = createBlockStencil(NX, NY, NZ);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const c = i + nx * (j + ny * k);
        if (!act[c]) continue;
        const d = D.subarray(36 * c, 36 * c + 36);
        const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k];
        const key = `${hx}|${hy}|${hz}|${Array.prototype.join.call(d, ',')}`;
        let K = cache.get(key);
        if (!K) {
          K = elementOperator(hx, hy, hz, Float64Array.from(d)).K;
          if (cache.size > 20000) cache.clear();
          cache.set(key, K);
        }
        addBlockElement(op, i, j, k, K);
      }
  const active = new Uint8Array(op.N);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        if (!act[i + nx * (j + ny * k)]) continue;
        for (let a = 0; a < 8; a++) active[i + (a & 1) + NX * (j + ((a >> 1) & 1) + NY * (k + (a >> 2)))] = 1;
      }
  const g = new Float64Array(3 * op.N).fill(NaN);
  for (let d = 0; d < 3 * op.N; d++) if (level.fixed[d]) g[d] = 0;
  constrainBlock(op, new Float64Array(3 * op.N), g, active);
  return op;
}

/** Nodes touching at least one active cell. */
function activeNodesOf(act, NX, NY, NZ) {
  const out = new Uint8Array(NX * NY * NZ), nx = NX - 1, ny = NY - 1;
  for (let k = 0; k < NZ - 1; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        if (!act[i + nx * (j + ny * k)]) continue;
        for (let a = 0; a < 8; a++) out[i + (a & 1) + NX * (j + ((a >> 1) & 1) + NY * (k + (a >> 2)))] = 1;
      }
  return out;
}

/**
 * Fixed DOFs of the coarse nodes: coincident fine node, else the left parent of a fixed non-coarse fine node. Only
 * constraints of active fine nodes count (void-region nodes are identity rows, not constraints).
 */
function coarsenFixed(fixed, NX, NY, NZ, mx, my, activeN = null) {
  const NXc = mx ? mx.nc : NX, NYc = my ? my.nc : NY;
  const out = new Uint8Array(3 * NXc * NYc * NZ);
  for (let k = 0; k < NZ; k++)
    for (let j = 0; j < NY; j++)
      for (let i = 0; i < NX; i++) {
        const n = i + NX * (j + NY * k);
        if (activeN && !activeN[n]) continue;
        for (let a = 0; a < 3; a++) {
          if (!fixed[3 * n + a]) continue;
          const I = mx ? mx.cL[i] : i, J = my ? my.cL[j] : j;
          out[3 * (I + NXc * (J + NYc * k)) + a] = 1;
        }
      }
  return out;
}

/** In-plane coarsening decision ('auto' rule on collapsed couplings) for one operator. */
function decide(op, coarsen, theta, couplingFn) {
  let canX = op.NX >= 4, canY = op.NY >= 4;
  if (coarsen === 'x') canY = false;
  else if (coarsen === 'y') canX = false;
  else if (coarsen === 'auto' && canX && canY) {
    const [cx, cy] = couplingFn(op);
    if (cx < theta * cy) canX = false;
    else if (cy < theta * cx) canY = false;
  }
  return [canX, canY];
}

/**
 * Half-stencil block MG with rediscretised coarse levels (no Galerkin product): the coarse operators are q1im element
 * matrices on the coarse cells with volume-averaged stiffness, which do not lock in bending (the Galerkin coarse
 * operators of trilinear prolongation do; wave 4 root cause). Transfers stay trilinear; the V-cycle stays symmetric.
 * @param {object} op fine half stencil (L8 assembleHalfStencil)
 * @param {{xs, ys, zs, cellPart}} grid fine grid
 * @param {{cellD: (c: number) => Float64Array | null, elementOperator: (hx, hy, hz, D) => {K}}} disc fine cell stiffness
 *   (6 x 6 lab frame, row-major; null for void cells) and the element kernel (e.g. L8 elementOperator('q1im', ...))
 * @param {{coarseMax?: number, nu?: number, coarsen?: string, theta?: number, f32?: boolean}} [opt]
 */
export function buildHalfRediscMG(op, grid, disc, { coarseMax = 3000, nu = 2, coarsen = 'auto', theta = 0.1, f32 = true } = {}) {
  const t0 = performance.now();
  const { xs, ys, zs } = grid;
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1, ncell = nx * ny * nz;
  const D0 = new Float64Array(36 * ncell), act0 = new Uint8Array(ncell);
  for (let c = 0; c < ncell; c++) {
    if (grid.cellPart[c] < 0) continue;
    const d = disc.cellD(c);
    if (!d) continue;
    D0.set(d, 36 * c);
    act0[c] = 1;
  }
  const [cx0, cy0] = decide(op, coarsen, theta, halfAxisCoupling);
  const lev0 = { op, mapX: cx0 ? coarsen1D(xs) : null, mapY: cy0 ? coarsen1D(ys) : null, ...halfLineFactors(op), coarsened: (cx0 ? 'x' : '') + (cy0 ? 'y' : '') };
  lev0.T = new Float64Array(3 * op.N);
  lev0.r = paddedBlock(op);
  const opW = (NXv, NYv, NZv, fx) => ({ NX: NXv, NY: NYv, NZ: NZv, N: NXv * NYv * NZv, fixed: fx ?? new Uint8Array(3 * NXv * NYv * NZv) });
  if (lev0.mapX) lev0.mapX.nw = nodeWeightsBlock(opW(op.NX, op.NY, op.NZ, op.fixed), 0, lev0.mapX, 'geometric');
  if (lev0.mapY) lev0.mapY.nw = nodeWeightsBlock(opW(lev0.mapX ? lev0.mapX.nc : op.NX, op.NY, op.NZ), 1, lev0.mapY, 'geometric');
  const NXc0 = lev0.mapX ? lev0.mapX.nc : op.NX;
  lev0.tmp = new Float64Array(3 * (NXc0 * op.NY * op.NZ + 2 * (NXc0 * op.NY + NXc0 + 1)));
  // coarse levels
  const cache = new Map();
  const levels = [];
  let cur = { xs, ys, zs, D: D0, act: act0, fixed: op.fixed, NX: op.NX, NY: op.NY, NZ: op.NZ, mapX: lev0.mapX, mapY: lev0.mapY };
  for (let l = 0; l < 30; l++) {
    const rx = cellRanges(cur.mapX, cur.xs.length - 1), ry = cellRanges(cur.mapY, cur.ys.length - 1);
    const cD = coarsenCellD(cur.D, cur.act, cur.xs, cur.ys, cur.zs, rx, ry);
    const next = {
      xs: cur.mapX ? cur.mapX.xs : cur.xs, ys: cur.mapY ? cur.mapY.xs : cur.ys, zs: cur.zs, D: cD.D, act: cD.act,
      fixed: coarsenFixed(cur.fixed, cur.NX, cur.NY, cur.NZ, cur.mapX, cur.mapY, activeNodesOf(cur.act, cur.NX, cur.NY, cur.NZ)),
    };
    next.NX = next.xs.length; next.NY = next.ys.length; next.NZ = next.zs.length;
    const cop = rediscretize(next, disc.elementOperator, cache);
    const lev = { op: cop, xs: next.xs, ys: next.ys, mapX: null, mapY: null };
    levels.push(lev);
    const [canX, canY] = decide(cop, coarsen, theta, axisCouplingBlock);
    lev.coarsened = (canX ? 'x' : '') + (canY ? 'y' : '');
    if (cop.N <= coarseMax || (!canX && !canY)) { lev.direct = new BlockCholesky(cop); break; }
    lev.mapX = canX ? coarsen1D(next.xs) : null;
    lev.mapY = canY ? coarsen1D(next.ys) : null;
    if (lev.mapX) lev.mapX.nw = nodeWeightsBlock(opW(cop.NX, cop.NY, cop.NZ, cop.fixed), 0, lev.mapX, 'geometric');
    if (lev.mapY) lev.mapY.nw = nodeWeightsBlock(opW(lev.mapX ? lev.mapX.nc : cop.NX, cop.NY, cop.NZ), 1, lev.mapY, 'geometric');
    Object.assign(lev, blockLineFactors(cop));
    const NXc = lev.mapX ? lev.mapX.nc : cop.NX;
    lev.tmp = new Float64Array(3 * (NXc * cop.NY * cop.NZ + 2 * (NXc * cop.NY + NXc + 1)));
    cur = { ...next, mapX: lev.mapX, mapY: lev.mapY };
  }
  for (let l = 0; l < levels.length; l++) {
    const lev = levels[l];
    lev.t = new Float64Array(3 * lev.op.N);
    lev.r = paddedBlock(lev.op);
    if (l > 0) { lev.b = paddedBlock(lev.op); lev.x = paddedBlock(lev.op); }
  }
  let saved = 0;
  if (f32) for (const l of levels) if (!l.direct) { saved += 4 * l.op.A.length; l.op.A = Float32Array.from(l.op.A); }
  const sub = { levels, nu };
  const c0 = levels[0], rc = paddedBlock(c0.op), ec = paddedBlock(c0.op);
  const precond = (b, x) => {
    x.fill(0);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, true);
    applyHalfStencil(op, x, lev0.r);
    const r = lev0.r, p3 = 3 * op.pad;
    for (let d = p3; d < p3 + 3 * op.N; d++) r[d] = b[d] - r[d];
    restrictBlock(lev0, c0, r, rc, lev0.tmp);
    blockMGPrecond(sub, rc, ec);
    prolongAddBlock(lev0, c0, ec, x, lev0.tmp);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, false);
  };
  return {
    precond,
    stats: { impl: 'l1-half-redisc', levels: 1 + levels.length, nodes: [op.N, ...levels.map((l) => l.op.N)], coarsened: [lev0.coarsened, ...levels.map((l) => l.coarsened)], f32_saved_MB: Math.round(saved / 2 ** 20), element_cache: cache.size, setup_ms: performance.now() - t0 },
  };
}

/** Internals for tests (coarse-operator comparisons). */
export const _internals = { halfRAP, rediscretize, coarsenCellD, coarsenFixed, cellRanges, activeNodesOf };

// ---- enriched local Galerkin first coarse level (wave 5, M10b) --------------------------------------------------

/** Dense symmetric solve helpers (small): Cholesky of an SPD matrix in place; returns false when not SPD. */
function cholDense(A, n) {
  for (let j = 0; j < n; j++) {
    let s = A[j * n + j];
    for (let k = 0; k < j; k++) s -= A[j * n + k] * A[j * n + k];
    if (!(s > 0)) return false;
    const d = Math.sqrt(s);
    A[j * n + j] = d;
    for (let i = j + 1; i < n; i++) {
      let t = A[i * n + j];
      for (let k = 0; k < j; k++) t -= A[i * n + k] * A[j * n + k];
      A[i * n + j] = t / d;
    }
  }
  return true;
}
function cholSolveCols(L, n, B, m) {
  // B: n x m (row-major), overwritten by L^-T L^-1 B
  for (let c = 0; c < m; c++) {
    for (let i = 0; i < n; i++) { let t = B[i * m + c]; for (let k = 0; k < i; k++) t -= L[i * n + k] * B[k * m + c]; B[i * m + c] = t / L[i * n + i]; }
    for (let i = n - 1; i >= 0; i--) { let t = B[i * m + c]; for (let k = i + 1; k < n; k++) t -= L[k * n + i] * B[k * m + c]; B[i * m + c] = t / L[i * n + i]; }
  }
}

/**
 * Coarse element matrix (24 x 24) of one coarse cell: Galerkin product of the fine element matrices of its patch
 * (1-2 x 1-2 fine cells in plane, one layer) with the trilinear coarse space enriched by the coarse cell's incompatible
 * bending modes (1 - xi^2), (1 - eta^2) per component, which are statically condensed (the patch's own Wilson modes).
 * Heterogeneity is exact (Galerkin); the condensed modes remove the bending locking of plain trilinear coarse spaces.
 */
function enrichedCoarseElement(Kf, patch, enrich = true) {
  const { cellsK, nxp, nyp, xsP, ysP } = patch; // nxp, nyp: patch node counts (2 or 3); cellsK[ci + (nxp-1) cj]: 24x24 or null
  const np = nxp * nyp * 2, nd = 3 * np;
  const X0 = xsP[0], X1 = xsP[nxp - 1], Y0 = ysP[0], Y1 = ysP[nyp - 1];
  // patch stiffness
  const Kp = new Float64Array(nd * nd);
  const pn = (a, b, c) => a + nxp * (b + nyp * c);
  for (let cj = 0; cj < nyp - 1; cj++)
    for (let ci = 0; ci < nxp - 1; ci++) {
      const K = cellsK[ci + (nxp - 1) * cj];
      if (!K) continue;
      for (let a = 0; a < 8; a++) {
        const na = pn(ci + (a & 1), cj + ((a >> 1) & 1), a >> 2);
        for (let b = 0; b < 8; b++) {
          const nb = pn(ci + (b & 1), cj + ((b >> 1) & 1), b >> 2);
          for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) Kp[(3 * na + r) * nd + 3 * nb + c] += K[24 * (3 * a + r) + 3 * b + c];
        }
      }
    }
  // coarse basis: 8 trilinear corner functions x 3 components, plus incompatible modes in the coarsened directions
  const modes = [];
  if (enrich && nxp === 3) modes.push((xi) => 1 - xi[0] * xi[0]);
  if (enrich && nyp === 3) modes.push((xi) => 1 - xi[1] * xi[1]);
  const nm = 3 * modes.length, nc = 24 + nm;
  const P = new Float64Array(nd * nc);
  for (let c3 = 0; c3 < 2; c3++)
    for (let b = 0; b < nyp; b++)
      for (let a = 0; a < nxp; a++) {
        const xi = [(2 * (xsP[a] - X0)) / (X1 - X0) - 1, (2 * (ysP[b] - Y0)) / (Y1 - Y0) - 1, 2 * c3 - 1];
        const p = pn(a, b, c3);
        for (let q = 0; q < 8; q++) {
          const N = (q & 1 ? 1 + xi[0] : 1 - xi[0]) * ((q >> 1) & 1 ? 1 + xi[1] : 1 - xi[1]) * (q >> 2 ? 1 + xi[2] : 1 - xi[2]) / 8;
          if (N) for (let r = 0; r < 3; r++) P[(3 * p + r) * nc + 3 * q + r] = N;
        }
        modes.forEach((f, mi) => { const v = f(xi); if (v) for (let r = 0; r < 3; r++) P[(3 * p + r) * nc + 24 + 3 * mi + r] = v; });
      }
  // Kc = P^T Kp P
  const KP = new Float64Array(nd * nc);
  for (let i = 0; i < nd; i++) for (let k = 0; k < nd; k++) { const v = Kp[i * nd + k]; if (!v) continue; for (let j = 0; j < nc; j++) KP[i * nc + j] += v * P[k * nc + j]; }
  const Kc = new Float64Array(nc * nc);
  for (let k = 0; k < nd; k++) for (let i = 0; i < nc; i++) { const v = P[k * nc + i]; if (!v) continue; for (let j = 0; j < nc; j++) Kc[i * nc + j] += v * KP[k * nc + j]; }
  if (!nm) return Kc;
  // condense the modes: K = Kcc - Kcm Kmm^-1 Kmc (modes without energy, e.g. void patches, are dropped)
  const Kmm = new Float64Array(nm * nm), Kmc = new Float64Array(nm * 24);
  for (let i = 0; i < nm; i++) { for (let j = 0; j < nm; j++) Kmm[i * nm + j] = Kc[(24 + i) * nc + 24 + j]; for (let j = 0; j < 24; j++) Kmc[i * 24 + j] = Kc[(24 + i) * nc + j]; }
  const scale = Math.max(...Array.from({ length: nm }, (_, i) => Kmm[i * nm + i]));
  for (let i = 0; i < nm; i++) if (!(Kmm[i * nm + i] > 1e-12 * scale)) { for (let j = 0; j < nm; j++) Kmm[i * nm + j] = Kmm[j * nm + i] = 0; Kmm[i * nm + i] = 1; for (let j = 0; j < 24; j++) Kmc[i * 24 + j] = 0; }
  if (!cholDense(Kmm, nm)) return Kf(Kc, nc); // fallback: no condensation (keep the trilinear Galerkin block)
  const G = Kmc.slice();
  cholSolveCols(Kmm, nm, G, 24);
  const K = new Float64Array(576);
  for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
    let s = Kc[i * nc + j];
    for (let m = 0; m < nm; m++) s -= Kmc[m * 24 + i] * G[m * 24 + j];
    K[24 * i + j] = s;
  }
  return K;
}

/**
 * Half-stencil block MG whose first coarse level is assembled from enriched local Galerkin coarse elements (exact
 * heterogeneity, condensed coarse bending modes); levels below by la/block.mjs (Galerkin, auto, nu).
 * @param {object} op fine half stencil; @param {{xs, ys, zs, cellPart}} grid
 * @param {(c: number) => Float64Array | null} fineK fine element matrix (24 x 24, condensed q1im) of cell c, null if void
 */
export function buildHalfEnrichedMG(op, grid, fineK, { coarseMax = 3000, nu = 2, coarsen = 'auto', theta = 0.1, f32 = true, enrich = true, _returnCoarse = false } = {}) {
  const t0 = performance.now();
  const { xs, ys, zs } = grid;
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1;
  const [cx0, cy0] = decide(op, coarsen, theta, halfAxisCoupling);
  const lev0 = { op, mapX: cx0 ? coarsen1D(xs) : null, mapY: cy0 ? coarsen1D(ys) : null, ...halfLineFactors(op), coarsened: (cx0 ? 'x' : '') + (cy0 ? 'y' : '') };
  lev0.T = new Float64Array(3 * op.N);
  lev0.r = paddedBlock(op);
  const opW = (NXv, NYv, NZv, fx) => ({ NX: NXv, NY: NYv, NZ: NZv, N: NXv * NYv * NZv, fixed: fx ?? new Uint8Array(3 * NXv * NYv * NZv) });
  if (lev0.mapX) lev0.mapX.nw = nodeWeightsBlock(opW(op.NX, op.NY, op.NZ, op.fixed), 0, lev0.mapX, 'geometric');
  if (lev0.mapY) lev0.mapY.nw = nodeWeightsBlock(opW(lev0.mapX ? lev0.mapX.nc : op.NX, op.NY, op.NZ), 1, lev0.mapY, 'geometric');
  const NXc0 = lev0.mapX ? lev0.mapX.nc : op.NX;
  lev0.tmp = new Float64Array(3 * (NXc0 * op.NY * op.NZ + 2 * (NXc0 * op.NY + NXc0 + 1)));
  const rx = cellRanges(lev0.mapX, nx), ry = cellRanges(lev0.mapY, ny);
  const xsC = lev0.mapX ? lev0.mapX.xs : xs, ysC = lev0.mapY ? lev0.mapY.xs : ys;
  const cop = createBlockStencil(xsC.length, ysC.length, zs.length);
  const active = new Uint8Array(cop.N);
  const NXC = xsC.length, NYC = ysC.length;
  const keep = (Kc) => Kc; // placeholder for the uncondensed fallback (never reached with SPD patches)
  for (let k = 0; k < nz; k++)
    for (let J = 0; J < ry.length; J++)
      for (let I = 0; I < rx.length; I++) {
        const [i0, i1] = rx[I], [j0, j1] = ry[J];
        const cellsK = [];
        let any = false;
        for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) { const K = grid.cellPart[i + nx * (j + ny * k)] >= 0 ? fineK(i + nx * (j + ny * k)) : null; cellsK.push(K); if (K) any = true; }
        if (!any) continue;
        const patch = { cellsK, nxp: i1 - i0 + 1, nyp: j1 - j0 + 1, xsP: Array.from({ length: i1 - i0 + 1 }, (_, a) => xs[i0 + a]), ysP: Array.from({ length: j1 - j0 + 1 }, (_, b) => ys[j0 + b]) };
        const K = enrichedCoarseElement(keep, patch, enrich);
        if (K.length !== 576) continue;
        addBlockElement(cop, I, J, k, K);
        for (let a = 0; a < 8; a++) active[I + (a & 1) + NXC * (J + ((a >> 1) & 1) + NYC * (k + (a >> 2)))] = 1;
      }
  const act0 = new Uint8Array(nx * ny * nz);
  for (let c = 0; c < act0.length; c++) act0[c] = grid.cellPart[c] >= 0 ? 1 : 0;
  const fx = coarsenFixed(op.fixed, op.NX, op.NY, op.NZ, lev0.mapX, lev0.mapY, activeNodesOf(act0, op.NX, op.NY, op.NZ));
  const g = new Float64Array(3 * cop.N).fill(NaN);
  for (let d = 0; d < 3 * cop.N; d++) if (fx[d]) g[d] = 0;
  constrainBlock(cop, new Float64Array(3 * cop.N), g, active);
  if (_returnCoarse) return { cop, lev0 };
  const sub = buildBlockMG(cop, xsC, ysC, zs, { coarseMax, nu, coarsen, theta });
  let saved = 0;
  if (f32) for (const l of sub.levels) if (!l.direct && l.op.A instanceof Float64Array) { saved += 4 * l.op.A.length; l.op.A = Float32Array.from(l.op.A); }
  const c0 = sub.levels[0], rc = paddedBlock(cop), ec = paddedBlock(cop);
  const precond = (b, x) => {
    x.fill(0);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, true);
    applyHalfStencil(op, x, lev0.r);
    const r = lev0.r, p3 = 3 * op.pad;
    for (let d = p3; d < p3 + 3 * op.N; d++) r[d] = b[d] - r[d];
    restrictBlock(lev0, c0, r, rc, lev0.tmp);
    blockMGPrecond(sub, rc, ec);
    prolongAddBlock(lev0, c0, ec, x, lev0.tmp);
    for (let s = 0; s < nu; s++) halfLineSweep(lev0, b, x, false);
  };
  return { precond, stats: { impl: 'l1-half-enriched', levels: 1 + sub.levels.length, nodes: [op.N, ...sub.stats.nodes], coarsened: [lev0.coarsened, ...sub.stats.coarsened], f32_saved_MB: Math.round(saved / 2 ** 20), setup_ms: performance.now() - t0 } };
}
