// Q1 (trilinear hex) heat-conduction assembly on the rectilinear grid into a 27-point stencil (DevLog-012 lane L1).
// Box cells with diagonal conductivity (kx, ky, kz): the element matrix is exact and separable,
//   K_ab = kx hy hz / (36 hx) S M M + ky hx hz / (36 hy) M S M + kz hx hy / (36 hz) M M S,
// with 1D S = [[1, -1], [-1, 1]] (stiffness times h) and M = [[2, 1], [1, 2]] (mass times 6 / h).
// Robin face term h a b / 36 (M x M); flux and Robin load a b / 4 per face node; uniform source V / 8 per node.
// Local node a = ia + 2 ja + 4 ka. Face direction d: axis = d >> 1, side bit = d & 1.
// License: GPL-3.0-or-later.

import { slot } from '../la/stencil.mjs';

const S1 = [[1, -1], [-1, 1]], M1 = [[2, 1], [1, 2]];
const bit = (a, ax) => (a >> ax) & 1;

// C = int N_a' N_b over [0, h] (independent of h): rows a, columns b; for the off-diagonal k_ij terms (L4-7).
const C1 = [[-0.5, -0.5], [0.5, 0.5]];

/** Per local pair (a, b): the separable factors (diagonal k, cross terms, mass) and the stencil slot. */
const PAIR = (() => {
  const cx = new Float64Array(64), cy = new Float64Array(64), cz = new Float64Array(64), sl = new Int32Array(64);
  const exy = new Float64Array(64), exz = new Float64Array(64), eyz = new Float64Array(64), mm = new Float64Array(64);
  for (let a = 0; a < 8; a++)
    for (let b = 0; b < 8; b++) {
      const [ia, ja, ka] = [bit(a, 0), bit(a, 1), bit(a, 2)], [ib, jb, kb] = [bit(b, 0), bit(b, 1), bit(b, 2)];
      cx[8 * a + b] = S1[ia][ib] * M1[ja][jb] * M1[ka][kb];
      cy[8 * a + b] = M1[ia][ib] * S1[ja][jb] * M1[ka][kb];
      cz[8 * a + b] = M1[ia][ib] * M1[ja][jb] * S1[ka][kb];
      sl[8 * a + b] = slot(ib - ia, jb - ja, kb - ka);
      // int (d_x N_a d_y N_b + d_y N_a d_x N_b) = (hz / 6) [C(ia,ib) C(jb,ja) + C(ja,jb) C(ib,ia)] M(ka,kb), etc.
      exy[8 * a + b] = (C1[ia][ib] * C1[jb][ja] + C1[ja][jb] * C1[ib][ia]) * M1[ka][kb];
      exz[8 * a + b] = (C1[ia][ib] * C1[kb][ka] + C1[ka][kb] * C1[ib][ia]) * M1[ja][jb];
      eyz[8 * a + b] = (C1[ja][jb] * C1[kb][ka] + C1[ka][kb] * C1[jb][ja]) * M1[ia][ib];
      mm[8 * a + b] = M1[ia][ib] * M1[ja][jb] * M1[ka][kb];
    }
  return { cx, cy, cz, sl, exy, exz, eyz, mm };
})();

/** Face nodes (local indices) of direction d and their in-face pair mass factors M x M. */
export const FACE = (() => {
  const out = [];
  for (let d = 0; d < 6; d++) {
    const ax = d >> 1, sb = d & 1;
    const others = [0, 1, 2].filter((q) => q !== ax);
    const nodes = [];
    for (let a = 0; a < 8; a++) if (bit(a, ax) === sb) nodes.push(a);
    const mm = new Float64Array(16), sl = new Int32Array(16);
    for (let u = 0; u < 4; u++)
      for (let v = 0; v < 4; v++) {
        const a = nodes[u], b = nodes[v];
        mm[4 * u + v] = M1[bit(a, others[0])][bit(b, others[0])] * M1[bit(a, others[1])][bit(b, others[1])];
        sl[4 * u + v] = slot(bit(b, 0) - bit(a, 0), bit(b, 1) - bit(a, 1), bit(b, 2) - bit(a, 2));
      }
    out.push({ nodes, mm, sl, others });
  }
  return out;
})();

/** Global node of local node a of cell (i, j, k). */
export const cellNode = (NX, NY, i, j, k, a) => i + (a & 1) + NX * (j + ((a >> 1) & 1) + NY * (k + (a >> 2)));

/** Cell (i, j, k) of cell index c. */
export function cellIJK(grid, c) {
  const { nx, ny } = grid;
  return [c % nx, Math.floor(c / nx) % ny, Math.floor(c / (nx * ny))];
}

/** Face extents (a, b) of the face of cell (i, j, k) in direction d. */
export function faceDims(grid, i, j, k, d) {
  const h = [grid.xs[i + 1] - grid.xs[i], grid.ys[j + 1] - grid.ys[j], grid.zs[k + 1] - grid.zs[k]];
  const o = FACE[d].others;
  return [h[o[0]], h[o[1]]];
}

/**
 * Add the conduction element matrices of every active cell.
 * @param {object} grid
 * @param {Float64Array} kCell `stride` values per cell: (kx, ky, kz) or (kxx, kyy, kzz, kxy, kxz, kyz) in W/m K
 * @param {object} op stencil operator on (nx+1) x (ny+1) x (nz+1) nodes
 * @param {number} [stride=3] 3 (diagonal) or 6 (full symmetric tensor; still a 27-point stencil)
 */
export function assembleConduction(grid, kCell, op, stride = 3) {
  const { nx, ny, nz, xs, ys, zs, cellPart } = grid;
  const NX = nx + 1, NY = ny + 1;
  const A = op.A;
  const { cx, cy, cz, sl } = PAIR;
  const loc = new Int32Array(8);
  for (let a = 0; a < 8; a++) loc[a] = (a & 1) + NX * (((a >> 1) & 1) + NY * (a >> 2));
  for (let k = 0, c = 0; k < nz; k++) {
    const hz = zs[k + 1] - zs[k];
    for (let j = 0; j < ny; j++) {
      const hy = ys[j + 1] - ys[j];
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        const hx = xs[i + 1] - xs[i];
        const o = stride * c;
        const ax = (kCell[o] * hy * hz) / (36 * hx), ay = (kCell[o + 1] * hx * hz) / (36 * hy), az = (kCell[o + 2] * hx * hy) / (36 * hz);
        const bxy = stride === 6 ? (kCell[o + 3] * hz) / 6 : 0, bxz = stride === 6 ? (kCell[o + 4] * hy) / 6 : 0, byz = stride === 6 ? (kCell[o + 5] * hx) / 6 : 0;
        const n0 = i + NX * (j + NY * k);
        for (let a = 0; a < 8; a++) {
          const row = 27 * (n0 + loc[a]);
          for (let b = 0; b < 8; b++) {
            const q = 8 * a + b;
            let v = ax * cx[q] + ay * cy[q] + az * cz[q];
            if (bxy || bxz || byz) v += bxy * PAIR.exy[q] + bxz * PAIR.exz[q] + byz * PAIR.eyz[q];
            A[row + sl[q]] += v;
          }
        }
      }
    }
  }
}

/**
 * Robin term h (T - T_inf) on face (c, d): matrix h a b / 36 (M x M), load h T_inf a b / 4 per node; with TinfFn(x, y, z)
 * (theta units) the load is integrated with 3 x 3 Gauss points. Returns int h T_inf dA over the face (for the outflow).
 */
export function addRobinFace(grid, op, F, c, d, h, Tinf, TinfFn = null) {
  const NX = grid.nx + 1, NY = grid.ny + 1;
  const [i, j, k] = cellIJK(grid, c);
  const [fa, fb] = faceDims(grid, i, j, k, d);
  const f = FACE[d];
  const w = (h * fa * fb) / 36;
  for (let u = 0; u < 4; u++) {
    const n = cellNode(NX, NY, i, j, k, f.nodes[u]);
    for (let v = 0; v < 4; v++) op.A[27 * n + f.sl[4 * u + v]] += w * f.mm[4 * u + v];
  }
  if (!TinfFn) {
    for (let u = 0; u < 4; u++) F[cellNode(NX, NY, i, j, k, f.nodes[u])] += (h * Tinf * fa * fb) / 4;
    return h * Tinf * fa * fb;
  }
  // Gauss on the face: local coordinates along the two in-face axes; the face sits at bit (d & 1) of axis d >> 1
  const g = GAUSS01[3];
  const o = [grid.xs[i], grid.ys[j], grid.zs[k]], hh = [grid.xs[i + 1] - grid.xs[i], grid.ys[j + 1] - grid.ys[j], grid.zs[k + 1] - grid.zs[k]];
  const ax = d >> 1, [e1, e2] = f.others;
  let total = 0;
  for (let p = 0; p < 3; p++)
    for (let q = 0; q < 3; q++) {
      const s1 = g.x[p], s2 = g.x[q];
      const P = [0, 0, 0];
      P[ax] = o[ax] + (d & 1) * hh[ax];
      P[e1] = o[e1] + s1 * hh[e1];
      P[e2] = o[e2] + s2 * hh[e2];
      const val = h * TinfFn(P[0], P[1], P[2]) * g.w[p] * g.w[q] * fa * fb;
      total += val;
      for (let u = 0; u < 4; u++) {
        const a = f.nodes[u];
        const N = (((a >> e1) & 1) ? s1 : 1 - s1) * (((a >> e2) & 1) ? s2 : 1 - s2);
        F[cellNode(NX, NY, i, j, k, a)] += val * N;
      }
    }
  return total;
}

/** Inward heat flux q (W/m^2) on face (c, d): load q a b / 4 per node; returns the face area. */
export function addFluxFace(grid, F, c, d, q) {
  const NX = grid.nx + 1, NY = grid.ny + 1;
  const [i, j, k] = cellIJK(grid, c);
  const [fa, fb] = faceDims(grid, i, j, k, d);
  const f = FACE[d];
  for (let u = 0; u < 4; u++) F[cellNode(NX, NY, i, j, k, f.nodes[u])] += (q * fa * fb) / 4;
  return fa * fb;
}

/** Uniform volumetric sources: load q_v V / 8 per node of every cell with q_v != 0. */
export function addCellSources(grid, F, qCell) {
  const { nx, ny, nz, xs, ys, zs } = grid;
  const NX = nx + 1, NY = ny + 1;
  let total = 0;
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        const q = qCell[c];
        if (q === 0) continue;
        const V = (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]) * (zs[k + 1] - zs[k]);
        total += q * V;
        for (let a = 0; a < 8; a++) F[cellNode(NX, NY, i, j, k, a)] += (q * V) / 8;
      }
  return total;
}

/** Gauss-Legendre points and weights on [0, 1]. */
export const GAUSS01 = {
  2: { x: [0.5 - 0.5 / Math.sqrt(3), 0.5 + 0.5 / Math.sqrt(3)], w: [0.5, 0.5] },
  3: { x: [0.5 - 0.5 * Math.sqrt(0.6), 0.5, 0.5 + 0.5 * Math.sqrt(0.6)], w: [5 / 18, 8 / 18, 5 / 18] },
};

/** Consistent load of a source density field f(x, y, z) (W/m^3) on active cells, 3x3x3 Gauss per cell. */
export function addFieldSource(grid, F, f) {
  const { nx, ny, nz, xs, ys, zs, cellPart } = grid;
  const NX = nx + 1, NY = ny + 1;
  const g = GAUSS01[3];
  let total = 0;
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k];
        for (let r = 0; r < 3; r++)
          for (let s = 0; s < 3; s++)
            for (let t = 0; t < 3; t++) {
              const u = g.x[r], v = g.x[s], w = g.x[t];
              const val = f(xs[i] + u * hx, ys[j] + v * hy, zs[k] + w * hz) * g.w[r] * g.w[s] * g.w[t] * hx * hy * hz;
              total += val;
              for (let a = 0; a < 8; a++) {
                const N = (a & 1 ? u : 1 - u) * ((a >> 1) & 1 ? v : 1 - v) * (a >> 2 ? w : 1 - w);
                F[cellNode(NX, NY, i, j, k, a)] += val * N;
              }
            }
      }
  return total;
}

/**
 * Eliminate Dirichlet nodes (theta values in `Td`, NaN = free) and mark inactive nodes as identity rows.
 * Returns the original rows and loads of the Dirichlet nodes (for the reaction flux).
 */
export function applyConstraints(op, F, Td, active) {
  const { N, A, fixed, off, NX, NY, NZ } = op;
  const dir = [];
  for (let n = 0; n < N; n++) if (!Number.isNaN(Td[n])) dir.push(n);
  const rows = new Float64Array(27 * dir.length), loads = new Float64Array(dir.length);
  dir.forEach((n, q) => {
    rows.set(A.subarray(27 * n, 27 * n + 27), 27 * q);
    loads[q] = F[n];
  });
  for (const n of dir) fixed[n] = 1;
  for (const n of dir) {
    const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
    for (let s = 0; s < 27; s++) {
      if (s === 13) continue;
      const di = (s % 3) - 1, dj = (Math.floor(s / 3) % 3) - 1, dk = Math.floor(s / 9) - 1;
      if (i + di < 0 || i + di >= NX || j + dj < 0 || j + dj >= NY || k + dk < 0 || k + dk >= NZ) continue;
      const m = n + off[s];
      if (fixed[m]) continue;
      F[m] -= A[27 * m + 26 - s] * Td[n];
      A[27 * m + 26 - s] = 0;
    }
  }
  for (const n of dir) {
    A.fill(0, 27 * n, 27 * n + 27);
    A[27 * n + 13] = 1;
    F[n] = Td[n];
  }
  for (let n = 0; n < N; n++)
    if (!active[n]) {
      A.fill(0, 27 * n, 27 * n + 27);
      A[27 * n + 13] = 1;
      F[n] = 0;
      fixed[n] = 1;
    }
  return { dir: Int32Array.from(dir), rows, loads };
}

/**
 * Q1 heat-capacity matrix of every active cell: consistent rho cp V / 216 (M x M x M), or lumped rho cp V / 8 on the
 * diagonal. `rc` = rho cp per cell (J/m^3 K).
 */
export function assembleMass(grid, rc, op, lumped = false) {
  const { nx, ny, nz, xs, ys, zs, cellPart } = grid;
  const NX = nx + 1, NY = ny + 1;
  const A = op.A;
  const loc = new Int32Array(8);
  for (let a = 0; a < 8; a++) loc[a] = (a & 1) + NX * (((a >> 1) & 1) + NY * (a >> 2));
  for (let k = 0, c = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++, c++) {
        if (cellPart[c] < 0) continue;
        const V = (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]) * (zs[k + 1] - zs[k]);
        const n0 = i + NX * (j + NY * k);
        if (lumped) {
          for (let a = 0; a < 8; a++) A[27 * (n0 + loc[a]) + 13] += (rc[c] * V) / 8;
          continue;
        }
        const w = (rc[c] * V) / 216;
        for (let a = 0; a < 8; a++) {
          const row = 27 * (n0 + loc[a]);
          for (let b = 0; b < 8; b++) A[row + PAIR.sl[8 * a + b]] += w * PAIR.mm[8 * a + b];
        }
      }
}

/**
 * Rotation matrix (row-major 3 x 3) of SPEC section 12: active R = Rz(az) Ry(ay) Rx(ax), angles in degrees, columns =
 * material axes in global coordinates.
 */
export function rotationFromDeg([ax = 0, ay = 0, az = 0] = []) {
  const r = Math.PI / 180;
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(ax * r), Math.sin(ax * r), Math.cos(ay * r), Math.sin(ay * r), Math.cos(az * r), Math.sin(az * r)];
  const Rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx], Ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy], Rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const mul = (A, B) => Array.from({ length: 9 }, (_, q) => A[3 * Math.floor(q / 3)] * B[q % 3] + A[3 * Math.floor(q / 3) + 1] * B[3 + (q % 3)] + A[3 * Math.floor(q / 3) + 2] * B[6 + (q % 3)]);
  return mul(Rz, mul(Ry, Rx));
}

/** k_global = R diag(k) R^T (SPEC section 12) as (kxx, kyy, kzz, kxy, kxz, kyz); R row-major, material axes as columns. */
export function rotateK(kdiag, R) {
  const K = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let m = 0; m < 3; m++) K[i][j] += R[3 * i + m] * kdiag[m] * R[3 * j + m];
  return [K[0][0], K[1][1], K[2][2], K[0][1], K[0][2], K[1][2]];
}
