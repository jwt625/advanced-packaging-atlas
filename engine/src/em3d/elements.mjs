// First-order Nedelec (Whitney) edge elements on tetrahedra and their tangential traces on triangles (lane L7, E6).
// Basis on the edge (i, j), i < j by global vertex index: W = lambda_i grad lambda_j - lambda_j grad lambda_i,
// curl W = 2 grad lambda_i x grad lambda_j. Integrals: int lambda_p lambda_q = V (1 + delta_pq) / 20 (tet),
// A (1 + delta_pq) / 12 (triangle). Diagonal complex tensors nu (curl-curl) and eps (mass) for PML / anisotropy.
// License: GPL-3.0-or-later.

import { LOCAL_EDGES } from './mesh.mjs';

/** Gradients of the 4 barycentric coordinates (12 values) and the volume of a tet (node coords in metres). */
export function tetGeometry(nodes, v, g) {
  const x0 = nodes[3 * v[0]],
    y0 = nodes[3 * v[0] + 1],
    z0 = nodes[3 * v[0] + 2];
  const a = [nodes[3 * v[1]] - x0, nodes[3 * v[1] + 1] - y0, nodes[3 * v[1] + 2] - z0];
  const b = [nodes[3 * v[2]] - x0, nodes[3 * v[2] + 1] - y0, nodes[3 * v[2] + 2] - z0];
  const c = [nodes[3 * v[3]] - x0, nodes[3 * v[3] + 1] - y0, nodes[3 * v[3] + 2] - z0];
  // rows of J^-1 (J columns a, b, c): r1 = (b x c)/det, r2 = (c x a)/det, r3 = (a x b)/det
  const bc = [b[1] * c[2] - b[2] * c[1], b[2] * c[0] - b[0] * c[2], b[0] * c[1] - b[1] * c[0]];
  const ca = [c[1] * a[2] - c[2] * a[1], c[2] * a[0] - c[0] * a[2], c[0] * a[1] - c[1] * a[0]];
  const ab = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const det = a[0] * bc[0] + a[1] * bc[1] + a[2] * bc[2];
  for (let d = 0; d < 3; d++) {
    g[3 + d] = bc[d] / det;
    g[6 + d] = ca[d] / det;
    g[9 + d] = ab[d] / det;
    g[d] = -(g[3 + d] + g[6 + d] + g[9 + d]);
  }
  return Math.abs(det) / 6;
}

/**
 * Element matrices (6 x 6, row-major) S = int curl W_a . nu curl W_b and M = int W_a . eps W_b for diagonal complex
 * tensors nu = {re: [3], im: [3]}, eps likewise. Writes Sre, Sim, Mre, Mim.
 */
export function tetMatrices(g, V, nu, eps, Sre, Sim, Mre, Mim) {
  const c = new Float64Array(18);
  for (let a = 0; a < 6; a++) {
    const [i, j] = LOCAL_EDGES[a];
    const gi = 3 * i,
      gj = 3 * j;
    c[3 * a] = g[gi + 1] * g[gj + 2] - g[gi + 2] * g[gj + 1];
    c[3 * a + 1] = g[gi + 2] * g[gj] - g[gi] * g[gj + 2];
    c[3 * a + 2] = g[gi] * g[gj + 1] - g[gi + 1] * g[gj];
  }
  // dot products with D weights: dot(p, q, D) = sum_d D_d g_p[d] g_q[d]
  const dre = new Float64Array(16),
    dim = new Float64Array(16);
  for (let p = 0; p < 4; p++)
    for (let q = 0; q < 4; q++) {
      let sr = 0,
        si = 0;
      for (let d = 0; d < 3; d++) {
        const t = g[3 * p + d] * g[3 * q + d];
        sr += eps.re[d] * t;
        si += eps.im[d] * t;
      }
      dre[4 * p + q] = sr;
      dim[4 * p + q] = si;
    }
  const I = (p, q) => (V * (p === q ? 2 : 1)) / 20;
  for (let a = 0; a < 6; a++) {
    const [i, j] = LOCAL_EDGES[a];
    for (let b = 0; b < 6; b++) {
      const [k, l] = LOCAL_EDGES[b];
      let sr = 0,
        si = 0;
      for (let d = 0; d < 3; d++) {
        const t = 4 * V * c[3 * a + d] * c[3 * b + d];
        sr += nu.re[d] * t;
        si += nu.im[d] * t;
      }
      Sre[6 * a + b] = sr;
      Sim[6 * a + b] = si;
      const w1 = I(i, k),
        w2 = I(i, l),
        w3 = I(j, k),
        w4 = I(j, l);
      Mre[6 * a + b] = w1 * dre[4 * j + l] - w2 * dre[4 * j + k] - w3 * dre[4 * i + l] + w4 * dre[4 * i + k];
      Mim[6 * a + b] = w1 * dim[4 * j + l] - w2 * dim[4 * j + k] - w3 * dim[4 * i + l] + w4 * dim[4 * i + k];
    }
  }
}

export const FACE_EDGES = [
  [0, 1],
  [0, 2],
  [1, 2],
];

/**
 * Tangential mass matrix (3 x 3) int_face W_a . W_b of a triangle (vertices sorted ascending, coords in metres)
 * with edges (0,1), (0,2), (1,2). Returns {T: Float64Array(9), area}.
 */
export function faceMass(nodes, v) {
  const P = v.map((n) => [nodes[3 * n], nodes[3 * n + 1], nodes[3 * n + 2]]);
  const a = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]];
  const b = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
  const aa = a[0] * a[0] + a[1] * a[1] + a[2] * a[2],
    bb = b[0] * b[0] + b[1] * b[1] + b[2] * b[2],
    ab = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const det = aa * bb - ab * ab;
  const area = 0.5 * Math.sqrt(det);
  // surface gradients: grad l1 = (bb a - ab b)/det, grad l2 = (aa b - ab a)/det, grad l0 = -(grad l1 + grad l2)
  const g1 = [0, 1, 2].map((d) => (bb * a[d] - ab * b[d]) / det);
  const g2 = [0, 1, 2].map((d) => (aa * b[d] - ab * a[d]) / det);
  const g = [[0, 1, 2].map((d) => -(g1[d] + g2[d])), g1, g2];
  const dot = (p, q) => g[p][0] * g[q][0] + g[p][1] * g[q][1] + g[p][2] * g[q][2];
  const I = (p, q) => (area * (p === q ? 2 : 1)) / 12;
  const T = new Float64Array(9);
  for (let x = 0; x < 3; x++) {
    const [i, j] = FACE_EDGES[x];
    for (let y = 0; y < 3; y++) {
      const [k, l] = FACE_EDGES[y];
      T[3 * x + y] = I(i, k) * dot(j, l) - I(i, l) * dot(j, k) - I(j, k) * dot(i, l) + I(j, l) * dot(i, k);
    }
  }
  return { T, area, grads: g };
}
