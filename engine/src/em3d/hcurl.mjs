// Hierarchical H(curl) (Nedelec first kind) and H1 bases of order 1 and 2 on simplices, written as polynomials in the
// barycentric coordinates l_0..l_d and their gradients, with element matrices by exact integration (lane L22,
// DevLog-014 D1 / D2). License: GPL-3.0-or-later.
//
// Basis (vertex indices sorted ascending by global index, so every function is globally consistent without signs):
//   Whitney (edge i < j):           w_ij = l_i grad l_j - l_j grad l_i              (order 1; circulation 1 on edge ij)
//   edge gradient (order 2):        g_ij = grad(l_i l_j)                             (zero circulation on every edge)
//   face (order 2, face i < j < k): f1 = l_k w_ij, f2 = l_j w_ik                     (tangential trace only on face ijk)
// Tet: 6 Whitney + 6 gradients + 4 x 2 face = 20 functions (the space of MFEM ND order 2, Nedelec 1980 first kind).
// Triangle trace: 3 + 3 + 2 = 8. H1 order 2 (hierarchical): vertex l_i, edge bubble l_i l_j. With these choices
//   grad(sum phi_v l_v + sum c_e l_a l_b) = sum_e (phi_b - phi_a) w_e + sum_e c_e g_e
// (exact sequence), so the discrete gradient H1-P2 -> ND2 is the order-1 incidence on vertices plus identity on edge
// bubbles, and the order-1 space is the Whitney prefix (p-multigrid prolongation = injection).
// Integrals: int_T prod l^a = |T| d! prod a_k! / (|a| + d)! on a d-simplex.
// Element matrices: M_ab = |T| sum_{m,n} c_ab^{mn} (grad l_m . D grad l_n), S_ab = |T| sum_{p,q} s_ab^{pq} (X_p . N X_q)
// with X_p = grad l_k x grad l_m for the vertex pair p = (k < m); coefficient tables compiled once per basis.

const FACT = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

/** int over a d-simplex of prod l^alpha, divided by the simplex measure. */
export function simplexMoment(alpha, d) {
  let num = FACT[d],
    s = 0;
  for (const a of alpha) {
    num *= FACT[a];
    s += a;
  }
  return num / FACT[s + d];
}

const unit = (nl, ...idx) => {
  const a = new Array(nl).fill(0);
  for (const i of idx) a[i]++;
  return a;
};
// a function is a list of terms [c, alpha, g]: c * prod l^alpha * grad l_g (g = -1: scalar term)
const whitney = (nl, i, j) => [
  [1, unit(nl, i), j],
  [-1, unit(nl, j), i],
];
const edgeGrad = (nl, i, j) => [
  [1, unit(nl, i), j],
  [1, unit(nl, j), i],
];
const faceFn = (nl, k, i, j) => [
  [1, unit(nl, k, i), j],
  [-1, unit(nl, k, j), i],
];

export const TET_EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];
export const TET_FACES = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 2, 3],
  [1, 2, 3],
];
export const TRI_EDGES = [
  [0, 1],
  [0, 2],
  [1, 2],
];

/** Vector basis (list of functions) of Nedelec order p (1 or 2) on a simplex with nl = d + 1 vertices. */
export function ndBasis(order, nl) {
  const E = nl === 4 ? TET_EDGES : TRI_EDGES;
  const F = nl === 4 ? TET_FACES : [[0, 1, 2]];
  const out = E.map(([i, j]) => whitney(nl, i, j));
  if (order >= 2) {
    for (const [i, j] of E) out.push(edgeGrad(nl, i, j));
    for (const [i, j, k] of F) out.push(faceFn(nl, k, i, j), faceFn(nl, j, i, k));
  }
  if (order > 2) throw new Error('hcurl: order > 2 not implemented');
  return out;
}

/** Scalar H1 basis of order p (1 or 2): vertices, then edge bubbles l_i l_j (edge order as ndBasis). */
export function h1Basis(order, nl) {
  const E = nl === 4 ? TET_EDGES : TRI_EDGES;
  const out = [];
  for (let i = 0; i < nl; i++) out.push([[1, unit(nl, i), -1]]);
  if (order >= 2) for (const [i, j] of E) out.push([[1, unit(nl, i, j), -1]]);
  return out;
}

/** grad of a scalar function -> vector terms. */
export function gradOf(fn) {
  const out = [];
  for (const [c, a, g] of fn) {
    if (g !== -1) throw new Error('hcurl: gradOf needs a scalar function');
    a.forEach((ak, k) => {
      if (!ak) return;
      const b = a.slice();
      b[k]--;
      out.push([c * ak, b, k]);
    });
  }
  return out;
}

/** Vertex pairs (k < m) of a simplex with nl vertices, and their index. */
export function pairIndex(nl) {
  const pairs = [];
  const idx = [];
  for (let k = 0; k < nl; k++) {
    idx.push(new Array(nl).fill(-1));
  }
  for (let k = 0; k < nl; k++)
    for (let m = k + 1; m < nl; m++) {
      idx[k][m] = pairs.length;
      idx[m][k] = pairs.length;
      pairs.push([k, m]);
    }
  return { pairs, idx };
}

/** curl of a vector function -> terms [c, alpha, p] with p a vertex-pair index (X_p = grad l_k x grad l_m, k < m). */
export function curlOf(fn, nl) {
  const { idx } = pairIndex(nl);
  const out = [];
  for (const [c, a, g] of fn)
    a.forEach((ak, k) => {
      if (!ak || k === g) return;
      const b = a.slice();
      b[k]--;
      out.push([c * ak * (k < g ? 1 : -1), b, idx[k][g]]);
    });
  return out;
}

/**
 * Compile int fa_i . K fb_j over a d-simplex (divided by its measure) into coefficient lists over keys
 * (ga, gb) -> key = ga * nk + gb (canonical ga <= gb when symmetricKeys). Returns {nA, nB, nk, ptr, key, val}: entry
 * (i, j) = sum_t val[t] K[key[t]] for t in [ptr[i nB + j], ptr[i nB + j + 1]).
 */
export function compileBilinear(FA, FB, nk, d, { symmetricKeys = true } = {}) {
  const nA = FA.length,
    nB = FB.length;
  const ptr = new Int32Array(nA * nB + 1);
  const keys = [],
    vals = [];
  for (let i = 0; i < nA; i++)
    for (let j = 0; j < nB; j++) {
      const acc = new Map();
      for (const [ca, aa, ga] of FA[i])
        for (const [cb, ab, gb] of FB[j]) {
          const al = aa.map((x, k) => x + ab[k]);
          const v = ca * cb * simplexMoment(al, d);
          let p = ga < 0 ? 0 : ga,
            q = gb < 0 ? 0 : gb;
          if (symmetricKeys && p > q) [p, q] = [q, p];
          const key = p * nk + q;
          acc.set(key, (acc.get(key) ?? 0) + v);
        }
      for (const [k, v] of acc)
        if (Math.abs(v) > 1e-14) {
          keys.push(k);
          vals.push(v);
        }
      ptr[i * nB + j + 1] = keys.length;
    }
  return { nA, nB, nk, ptr, key: Int32Array.from(keys), val: Float64Array.from(vals) };
}

/** out (nA x nB, row-major) = scale * table(K) for complex K = (Kre, Kim). */
export function evalBilinear(tab, Kre, Kim, scale, outRe, outIm) {
  const { ptr, key, val } = tab;
  const n = tab.nA * tab.nB;
  for (let e = 0; e < n; e++) {
    let sr = 0,
      si = 0;
    for (let t = ptr[e]; t < ptr[e + 1]; t++) {
      const k = key[t];
      sr += val[t] * Kre[k];
      si += val[t] * Kim[k];
    }
    outRe[e] = scale * sr;
    outIm[e] = scale * si;
  }
}

/** Same, real K only. */
export function evalBilinearReal(tab, K, scale, out) {
  const { ptr, key, val } = tab;
  const n = tab.nA * tab.nB;
  for (let e = 0; e < n; e++) {
    let s = 0;
    for (let t = ptr[e]; t < ptr[e + 1]; t++) s += val[t] * K[key[t]];
    out[e] = scale * s;
  }
}

/** Evaluate a vector function at barycentric point l with gradients g (nl x dim, row-major). */
export function evalVector(fn, l, g, dim, out) {
  out.fill(0);
  for (const [c, a, gi] of fn) {
    let v = c;
    a.forEach((ak, k) => {
      if (ak) v *= l[k] ** ak;
    });
    for (let d = 0; d < dim; d++) out[d] += v * g[gi * dim + d];
  }
  return out;
}

// compiled tables (lazy)
const cache = new Map();
function cached(name, make) {
  if (!cache.has(name)) cache.set(name, make());
  return cache.get(name);
}

/** Tet tables of order p: mass (keys over grad pairs, nk 4) and curl-curl (keys over vertex pairs, nk 6). */
export function tetTables(order) {
  return cached(`tet${order}`, () => {
    const B = ndBasis(order, 4);
    const C = B.map((f) => curlOf(f, 4));
    return { n: B.length, basis: B, mass: compileBilinear(B, B, 4, 3), curl: compileBilinear(C, C, 6, 3) };
  });
}

/** Triangle tables of order p: ND trace mass (nk 3), 2D scalar curl-curl (nk 3 pairs), H1 grad-grad (nk 3), H1 mass,
 * mixed ND . grad H1 (nk 3, unsymmetric keys). */
export function triTables(order) {
  return cached(`tri${order}`, () => {
    const B = ndBasis(order, 3);
    const H = h1Basis(order, 3);
    const GH = H.map((f) => gradOf(f));
    const C = B.map((f) => curlOf(f, 3));
    return {
      n: B.length,
      nh: H.length,
      basis: B,
      h1: H,
      mass: compileBilinear(B, B, 3, 2),
      curl: compileBilinear(C, C, 3, 2),
      h1Stiff: compileBilinear(GH, GH, 3, 2),
      h1Mass: compileBilinear(H, H, 1, 2),
      mixed: compileBilinear(B, GH, 3, 2, { symmetricKeys: false }),
    };
  });
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Tet element matrices of order p (n x n row-major, n = 6 or 20) for diagonal complex tensors nu (curl-curl) and eps
 * (mass): g = 12 gradient components (4 x 3, metres^-1), V volume (m^3).
 */
export function tetMatricesP(order, g, V, nu, eps, Sre, Sim, Mre, Mim, work = {}) {
  const T = tetTables(order);
  const Dre = work.Dre ?? (work.Dre = new Float64Array(16)),
    Dim = work.Dim ?? (work.Dim = new Float64Array(16));
  for (let m = 0; m < 4; m++)
    for (let n = m; n < 4; n++) {
      let sr = 0,
        si = 0;
      for (let d = 0; d < 3; d++) {
        const t = g[3 * m + d] * g[3 * n + d];
        sr += eps.re[d] * t;
        si += eps.im[d] * t;
      }
      Dre[4 * m + n] = sr;
      Dim[4 * m + n] = si;
    }
  const X = work.X ?? (work.X = new Float64Array(18));
  let p = 0;
  for (let k = 0; k < 4; k++)
    for (let m = k + 1; m < 4; m++, p++) {
      const c = cross([g[3 * k], g[3 * k + 1], g[3 * k + 2]], [g[3 * m], g[3 * m + 1], g[3 * m + 2]]);
      X[3 * p] = c[0];
      X[3 * p + 1] = c[1];
      X[3 * p + 2] = c[2];
    }
  const Yre = work.Yre ?? (work.Yre = new Float64Array(36)),
    Yim = work.Yim ?? (work.Yim = new Float64Array(36));
  for (let a = 0; a < 6; a++)
    for (let b = a; b < 6; b++) {
      let sr = 0,
        si = 0;
      for (let d = 0; d < 3; d++) {
        const t = X[3 * a + d] * X[3 * b + d];
        sr += nu.re[d] * t;
        si += nu.im[d] * t;
      }
      Yre[6 * a + b] = sr;
      Yim[6 * a + b] = si;
    }
  evalBilinear(T.mass, Dre, Dim, V, Mre, Mim);
  evalBilinear(T.curl, Yre, Yim, V, Sre, Sim);
}

/** Surface gradients (3 x 3, row-major) and area of a triangle with 3D vertex coordinates P (metres). */
export function triSurfaceGrads(P) {
  const a = [P[1][0] - P[0][0], P[1][1] - P[0][1], P[1][2] - P[0][2]];
  const b = [P[2][0] - P[0][0], P[2][1] - P[0][1], P[2][2] - P[0][2]];
  const aa = a[0] * a[0] + a[1] * a[1] + a[2] * a[2],
    bb = b[0] * b[0] + b[1] * b[1] + b[2] * b[2],
    ab = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const det = aa * bb - ab * ab;
  const g1 = [0, 1, 2].map((d) => (bb * a[d] - ab * b[d]) / det);
  const g2 = [0, 1, 2].map((d) => (aa * b[d] - ab * a[d]) / det);
  const g0 = [0, 1, 2].map((d) => -(g1[d] + g2[d]));
  return { g: Float64Array.from([...g0, ...g1, ...g2]), area: 0.5 * Math.sqrt(det) };
}

/** Tangential trace mass (n x n, n = 3 or 8) of the order-p basis on a 3D triangle (vertices sorted ascending). */
export function triTraceMass(order, nodes, v) {
  const P = v.map((q) => [nodes[3 * q], nodes[3 * q + 1], nodes[3 * q + 2]]);
  const { g, area } = triSurfaceGrads(P);
  const D = new Float64Array(9);
  for (let m = 0; m < 3; m++) for (let n = m; n < 3; n++) D[3 * m + n] = g[3 * m] * g[3 * n] + g[3 * m + 1] * g[3 * n + 1] + g[3 * m + 2] * g[3 * n + 2];
  const T = triTables(order);
  const out = new Float64Array(T.n * T.n);
  evalBilinearReal(T.mass, D, area, out);
  return { T: out, area, grads: g };
}

/** 2D gradient components (3 x 2) and area of a triangle in plane coordinates P = [[u, v] x 3] (metres). */
export function tri2dGrads(P) {
  const a2 = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[2][0] - P[0][0]) * (P[1][1] - P[0][1]);
  const gx = [(P[1][1] - P[2][1]) / a2, (P[2][1] - P[0][1]) / a2, (P[0][1] - P[1][1]) / a2];
  const gy = [(P[2][0] - P[1][0]) / a2, (P[0][0] - P[2][0]) / a2, (P[1][0] - P[0][0]) / a2];
  return { g: Float64Array.from([gx[0], gy[0], gx[1], gy[1], gx[2], gy[2]]), area: Math.abs(a2) / 2, sign: Math.sign(a2) };
}

/** Gram matrix of 2D gradients (3 x 3 keys m * 3 + n, upper triangle filled; also lower for unsymmetric tables). */
export function gradGram2d(g) {
  const D = new Float64Array(9);
  for (let m = 0; m < 3; m++) for (let n = 0; n < 3; n++) D[3 * m + n] = g[2 * m] * g[2 * n] + g[2 * m + 1] * g[2 * n + 1];
  return D;
}

/** Scalar 2D curls X_p = (grad l_k x grad l_m) . z for the 3 vertex pairs, and Y_pq = X_p X_q (keys p * 3 + q). */
export function curlGram2d(g) {
  const X = [];
  for (const [k, m] of TRI_EDGES) X.push(g[2 * k] * g[2 * m + 1] - g[2 * k + 1] * g[2 * m]);
  const Y = new Float64Array(9);
  for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) Y[3 * p + q] = X[p] * X[q];
  return Y;
}

// Gauss-Legendre 4 points on [0, 1] (nodes (1 +- x)/2, x = 0.3399810435848563, 0.8611363115940526; weights / 2)
const GL4 = [
  [0.5 - 0.8611363115940526 / 2, 0.3478548451374538 / 2],
  [0.5 - 0.3399810435848563 / 2, 0.6521451548625461 / 2],
  [0.5 + 0.3399810435848563 / 2, 0.6521451548625461 / 2],
  [0.5 + 0.8611363115940526 / 2, 0.3478548451374538 / 2],
];
/** Collapsed (Duffy) 16-point rule on the reference triangle: [[l0, l1, l2], weight] with sum of weights = 1
 * (multiply by the area); exact for polynomials of degree <= 6. */
export const TRI_QUAD = (() => {
  const out = [];
  for (const [u, wu] of GL4)
    for (const [v, wv] of GL4) {
      const s = u,
        t = v * (1 - u);
      out.push([[1 - s - t, s, t], 2 * wu * wv * (1 - u)]);
    }
  return out;
})();
