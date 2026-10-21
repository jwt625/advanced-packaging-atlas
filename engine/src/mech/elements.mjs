// Hexahedral elasticity elements on axis-aligned box cells (tranche E2; DevLog-010 A3; R2 8.2 locking note).
// Element types:
//   q1   - 8-node trilinear, 2x2x2 Gauss (bake-off reference only; locks in bending at layer aspect ratios)
//   q1im - 8-node trilinear + Wilson incompatible modes (1 - xi^2), (1 - eta^2), (1 - zeta^2) per component
//          (9 internal DOF, statically condensed), 2x2x2 Gauss. On a parallelepiped the Jacobian is constant, so
//          the integral of every bubble gradient is zero and the Wilson element equals the Taylor (1976) form and
//          passes the patch test.
//   q2s  - 20-node serendipity, 3x3x3 Gauss (COMSOL default displacement order, R1 1.3).
// Because cells are axis-aligned boxes (diagonal constant Jacobian), every stiffness is a combination of 9 reference
// matrices I_pq[a][b] = int_ref dN_a/dxi_p dN_b/dxi_q, scaled by (V / 8) (2 / h_p) (2 / h_q): K_ab_ij =
// sum_pq C_ipjq s_pq I_pq[a][b] with C_ipjq = D[V(i,p)][V(j,q)] (Voigt, engineering shear).
// Temperature is always interpolated with the Q1 (8-corner) shape functions at the Gauss points; the thermal strain
// is evaluated at every Gauss point (never as an element mean).
// Local node order: corners a = ia + 2 ja + 4 ka (ia, ja, ka in {0, 1}); q2s then x-edges 8..11 (ja + 2 ka),
// y-edges 12..15 (ia + 2 ka), z-edges 16..19 (ia + 2 ja).
// License: GPL-3.0-or-later.

import { invertDense } from './constitutive.mjs';

export const ELEMENT_TYPES = Object.freeze(['q2s', 'q1im', 'q1']);

const G2 = [-1 / Math.sqrt(3), 1 / Math.sqrt(3)], W2 = [1, 1];
const G3 = [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)], W3 = [5 / 9, 8 / 9, 5 / 9];

/** Reference coordinates of the local nodes of a type. */
export function localNodeCoords(type) {
  const out = [];
  for (let a = 0; a < 8; a++) out.push([2 * (a & 1) - 1, 2 * ((a >> 1) & 1) - 1, 2 * ((a >> 2) & 1) - 1]);
  if (type !== 'q2s') return out;
  for (let e = 0; e < 4; e++) out.push([0, 2 * (e & 1) - 1, 2 * (e >> 1) - 1]);
  for (let e = 0; e < 4; e++) out.push([2 * (e & 1) - 1, 0, 2 * (e >> 1) - 1]);
  for (let e = 0; e < 4; e++) out.push([2 * (e & 1) - 1, 2 * (e >> 1) - 1, 0]);
  return out;
}

/** Q1 shape functions and reference derivatives at (x, y, z): N[8], dN[24] (dxi, deta, dzeta per node). */
export function shapeQ1(x, y, z, N = new Float64Array(8), dN = new Float64Array(24)) {
  for (let a = 0; a < 8; a++) {
    const xa = 2 * (a & 1) - 1, ya = 2 * ((a >> 1) & 1) - 1, za = 2 * ((a >> 2) & 1) - 1;
    const fx = 1 + x * xa, fy = 1 + y * ya, fz = 1 + z * za;
    N[a] = 0.125 * fx * fy * fz;
    dN[3 * a] = 0.125 * xa * fy * fz;
    dN[3 * a + 1] = 0.125 * fx * ya * fz;
    dN[3 * a + 2] = 0.125 * fx * fy * za;
  }
  return { N, dN };
}

/** Q2 serendipity shape functions and reference derivatives at (x, y, z): N[20], dN[60]. */
export function shapeQ2s(x, y, z, N = new Float64Array(20), dN = new Float64Array(60)) {
  const P = localNodeCoords('q2s');
  for (let a = 0; a < 20; a++) {
    const [xa, ya, za] = P[a];
    if (a < 8) {
      const fx = 1 + x * xa, fy = 1 + y * ya, fz = 1 + z * za, s = x * xa + y * ya + z * za - 2;
      N[a] = 0.125 * fx * fy * fz * s;
      dN[3 * a] = 0.125 * xa * fy * fz * (s + fx);
      dN[3 * a + 1] = 0.125 * ya * fx * fz * (s + fy);
      dN[3 * a + 2] = 0.125 * za * fx * fy * (s + fz);
    } else if (xa === 0) {
      const g = 1 - x * x, fy = 1 + y * ya, fz = 1 + z * za;
      N[a] = 0.25 * g * fy * fz;
      dN[3 * a] = -0.5 * x * fy * fz;
      dN[3 * a + 1] = 0.25 * g * ya * fz;
      dN[3 * a + 2] = 0.25 * g * fy * za;
    } else if (ya === 0) {
      const g = 1 - y * y, fx = 1 + x * xa, fz = 1 + z * za;
      N[a] = 0.25 * fx * g * fz;
      dN[3 * a] = 0.25 * xa * g * fz;
      dN[3 * a + 1] = -0.5 * y * fx * fz;
      dN[3 * a + 2] = 0.25 * fx * g * za;
    } else {
      const g = 1 - z * z, fx = 1 + x * xa, fy = 1 + y * ya;
      N[a] = 0.25 * fx * fy * g;
      dN[3 * a] = 0.25 * xa * fy * g;
      dN[3 * a + 1] = 0.25 * fx * ya * g;
      dN[3 * a + 2] = -0.5 * z * fx * fy;
    }
  }
  return { N, dN };
}

/** Wilson bubble derivatives at (x, y, z): dP[9] (3 modes x (dxi, deta, dzeta)). */
function bubbleDerivs(x, y, z, dP = new Float64Array(9)) {
  dP.fill(0);
  dP[0] = -2 * x;
  dP[4] = -2 * y;
  dP[8] = -2 * z;
  return dP;
}

/**
 * Reference data of an element type (computed once): Gauss points, shape-function derivatives (displacement set incl.
 * bubbles for q1im), Q1 temperature shape functions at the Gauss points, reference matrices I_pq, reference gradient
 * integrals J_p[a] = int_ref dN_a/dxi_p.
 */
const REF = new Map();
export function reference(type) {
  if (REF.has(type)) return REF.get(type);
  if (!ELEMENT_TYPES.includes(type)) throw new Error(`mech: unknown element ${type} (expected ${ELEMENT_TYPES.join(' | ')})`);
  const nen = type === 'q2s' ? 20 : 8;
  const nb = type === 'q1im' ? 3 : 0; // bubble shape functions (each carries 3 components)
  const ns = nen + nb; // shape functions in the stiffness set
  const g = type === 'q2s' ? G3 : G2, w = type === 'q2s' ? W3 : W2;
  const ng = g.length ** 3;
  const gpX = new Float64Array(3 * ng), gpW = new Float64Array(ng);
  const dNs = new Float64Array(ng * 3 * ns); // per gp: ns x 3
  const NT = new Float64Array(ng * 8); // Q1 temperature shape functions per gp
  const Nd = new Float64Array(ng * nen); // displacement shape functions per gp (for interpolation)
  let q = 0;
  for (let k = 0; k < g.length; k++)
    for (let j = 0; j < g.length; j++)
      for (let i = 0; i < g.length; i++, q++) {
        const x = g[i], y = g[j], z = g[k];
        gpX.set([x, y, z], 3 * q);
        gpW[q] = w[i] * w[j] * w[k];
        const s = type === 'q2s' ? shapeQ2s(x, y, z) : shapeQ1(x, y, z);
        dNs.set(s.dN, q * 3 * ns);
        Nd.set(s.N, q * nen);
        if (nb) dNs.set(bubbleDerivs(x, y, z), q * 3 * ns + 3 * nen);
        NT.set(shapeQ1(x, y, z).N, 8 * q);
      }
  // I_pq[a][b], stored as Ipq[(3 p + q) ns^2 + a ns + b]
  const Ipq = new Float64Array(9 * ns * ns);
  const Jp = new Float64Array(3 * ns);
  for (let q2 = 0; q2 < ng; q2++) {
    const o = q2 * 3 * ns, wq = gpW[q2];
    for (let a = 0; a < ns; a++) {
      for (let p = 0; p < 3; p++) Jp[3 * a + p] += wq * dNs[o + 3 * a + p];
      for (let b = 0; b < ns; b++)
        for (let p = 0; p < 3; p++) {
          const da = wq * dNs[o + 3 * a + p];
          for (let r = 0; r < 3; r++) Ipq[(3 * p + r) * ns * ns + a * ns + b] += da * dNs[o + 3 * b + r];
        }
    }
  }
  const ref = { type, nen, nb, ns, ng, gpX, gpW, dNs, NT, Nd, Ipq, Jp, nodes: localNodeCoords(type) };
  REF.set(type, ref);
  return ref;
}

// Voigt index of tensor pair (i, p)
const VO = [0, 5, 4, 5, 1, 3, 4, 3, 2];
/** C_ipjq from Voigt D (Float64Array 81, index ((3 i + p) 3 + j) 3 + q). */
export function tensorC(D) {
  const C = new Float64Array(81);
  for (let i = 0; i < 3; i++) for (let p = 0; p < 3; p++) for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++)
    C[27 * i + 9 * p + 3 * j + q] = D[6 * VO[3 * i + p] + VO[3 * j + q]];
  return C;
}

/** Full (uncondensed) stiffness of the ns-function set: (3 ns) x (3 ns), DOF order 3 a + i. */
function fullStiffness(ref, hx, hy, hz, C) {
  const { ns, Ipq } = ref;
  const V = hx * hy * hz, h = [hx, hy, hz];
  const s = new Float64Array(9);
  for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) s[3 * p + q] = (V / 8) * (2 / h[p]) * (2 / h[q]);
  // coefficient c[(3 i + j) 9 + (3 p + q)] = C_ipjq s_pq
  const c = new Float64Array(81);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++)
    c[(3 * i + j) * 9 + 3 * p + q] = C[27 * i + 9 * p + 3 * j + q] * s[3 * p + q];
  const n = 3 * ns, K = new Float64Array(n * n), nn = ns * ns;
  for (let a = 0; a < ns; a++)
    for (let b = 0; b < ns; b++) {
      const ab = a * ns + b;
      const I0 = Ipq[ab], I1 = Ipq[nn + ab], I2 = Ipq[2 * nn + ab], I3 = Ipq[3 * nn + ab], I4 = Ipq[4 * nn + ab],
        I5 = Ipq[5 * nn + ab], I6 = Ipq[6 * nn + ab], I7 = Ipq[7 * nn + ab], I8 = Ipq[8 * nn + ab];
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++) {
          const o = (3 * i + j) * 9;
          K[(3 * a + i) * n + 3 * b + j] = c[o] * I0 + c[o + 1] * I1 + c[o + 2] * I2 + c[o + 3] * I3 + c[o + 4] * I4
            + c[o + 5] * I5 + c[o + 6] * I6 + c[o + 7] * I7 + c[o + 8] * I8;
        }
    }
  return K;
}

/**
 * Element operator for one (size, material) combination.
 * Returns {K (condensed, n x n, n = 3 nen), n, nen, D, C, h, and for q1im: Kii_inv (9 x 9), Kic (9 x 24)}.
 */
export function elementOperator(type, hx, hy, hz, D) {
  const ref = reference(type);
  const C = tensorC(D);
  const Kf = fullStiffness(ref, hx, hy, hz, C);
  const n = 3 * ref.nen;
  if (type !== 'q1im') return { type, K: Kf, n, nen: ref.nen, D, C, h: [hx, hy, hz] };
  const nf = 3 * ref.ns, ni = nf - n;
  const Kcc = new Float64Array(n * n), Kci = new Float64Array(n * ni), Kii = new Float64Array(ni * ni);
  for (let r = 0; r < nf; r++)
    for (let c = 0; c < nf; c++) {
      const v = Kf[r * nf + c];
      if (r < n && c < n) Kcc[r * n + c] = v;
      else if (r < n) Kci[r * ni + (c - n)] = v;
      else if (c >= n) Kii[(r - n) * ni + (c - n)] = v;
    }
  const Kii_inv = invertDense(Kii, ni);
  // G = Kii^-1 Kic (ni x n); K = Kcc - Kci G
  const G = new Float64Array(ni * n);
  for (let r = 0; r < ni; r++)
    for (let c = 0; c < n; c++) {
      let s = 0;
      for (let k = 0; k < ni; k++) s += Kii_inv[r * ni + k] * Kci[c * ni + k];
      G[r * n + c] = s;
    }
  const K = new Float64Array(n * n);
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      let s = Kcc[r * n + c];
      for (let k = 0; k < ni; k++) s -= Kci[r * ni + k] * G[k * n + c];
      K[r * n + c] = s;
    }
  for (let r = 0; r < n; r++) for (let c = r + 1; c < n; c++) { const m = 0.5 * (K[r * n + c] + K[c * n + r]); K[r * n + c] = K[c * n + r] = m; }
  return { type, K, n, nen: ref.nen, D, C, h: [hx, hy, hz], Kii_inv, G, ni };
}

/** sigma_th (Voigt) = D eps_th. */
function dTimes(D, e, out) {
  for (let I = 0; I < 6; I++) {
    let s = 0;
    for (let J = 0; J < 6; J++) s += D[6 * I + J] * e[J];
    out[I] = s;
  }
  return out;
}

/**
 * Thermal load of the full shape set (ns functions incl. bubbles): F[3 a + i] = int dN_a/dx_p sigma_th_ip dV.
 * epsAt(q) -> Voigt thermal strain at Gauss point q (lab frame). If `uniformEps` is given, the exact reference
 * integrals J_p are used (bubble part is then zero).
 */
function fullThermalLoad(ref, op, epsAt, uniformEps) {
  const { ns, ng, dNs, gpW, Jp } = ref;
  const [hx, hy, hz] = op.h, V = hx * hy * hz, sc = [2 / hx, 2 / hy, 2 / hz];
  const F = new Float64Array(3 * ns), st = new Float64Array(6);
  const addPoint = (wt, dN, o, s) => {
    // s Voigt: [xx, yy, zz, yz, xz, xy] -> tensor rows: i = x: (xx, xy, xz), y: (xy, yy, yz), z: (xz, yz, zz)
    for (let a = 0; a < ns; a++) {
      const gx = dN[o + 3 * a] * sc[0], gy = dN[o + 3 * a + 1] * sc[1], gz = dN[o + 3 * a + 2] * sc[2];
      F[3 * a] += wt * (gx * s[0] + gy * s[5] + gz * s[4]);
      F[3 * a + 1] += wt * (gx * s[5] + gy * s[1] + gz * s[3]);
      F[3 * a + 2] += wt * (gx * s[4] + gy * s[3] + gz * s[2]);
    }
  };
  if (uniformEps) {
    dTimes(op.D, uniformEps, st);
    addPoint(V / 8, Jp, 0, st);
    return F;
  }
  for (let q = 0; q < ng; q++) {
    dTimes(op.D, epsAt(q), st);
    addPoint((gpW[q] * V) / 8, dNs, q * 3 * ns, st);
  }
  return F;
}

/**
 * Condensed element thermal load (length 3 nen). For q1im: f = f_c - Kci Kii^-1 f_i = f_c - G^T f_i.
 * Also returns fi (internal part) for q1im (needed for stress recovery).
 */
export function elementThermalLoad(op, epsAt, uniformEps = null) {
  const ref = reference(op.type);
  const F = fullThermalLoad(ref, op, epsAt, uniformEps);
  if (op.type !== 'q1im') return { f: F, fi: null };
  const n = op.n, ni = op.ni;
  const f = F.slice(0, n), fi = F.slice(n);
  if (!uniformEps) for (let c = 0; c < n; c++) {
    let s = 0;
    for (let k = 0; k < ni; k++) s += op.G[k * n + c] * fi[k];
    f[c] -= s;
  }
  return { f, fi: uniformEps ? null : fi };
}

/**
 * Internal (incompatible-mode) amplitudes for q1im: alpha = Kii^-1 (f_i - Kic u) = Kii^-1 f_i - G u.
 */
export function internalModes(op, ue, fi) {
  const n = op.n, ni = op.ni, al = new Float64Array(ni);
  for (let r = 0; r < ni; r++) {
    let s = 0;
    for (let c = 0; c < n; c++) s -= op.G[r * n + c] * ue[c];
    if (fi) for (let k = 0; k < ni; k++) s += op.Kii_inv[r * ni + k] * fi[k];
    al[r] = s;
  }
  return al;
}

/**
 * Total strain (Voigt, engineering shear) at reference point (x, y, z) from element nodal displacements ue (3 nen)
 * and q1im internal amplitudes al (9, or null).
 */
const PT_CACHE = new Map();
/** Reference derivatives (and bubble derivatives) at a point, cached per (type, point): post-processing evaluates the
 * same Gauss and corner points for every cell (optimization pass 2026-10-20, L8 notes). */
function pointDerivs(type, x, y, z) {
  const key = `${type}|${x}|${y}|${z}`;
  let e = PT_CACHE.get(key);
  if (!e) {
    e = { dN: (type === 'q2s' ? shapeQ2s(x, y, z) : shapeQ1(x, y, z)).dN, dP: bubbleDerivs(x, y, z) };
    if (PT_CACHE.size > 1000) PT_CACHE.clear();
    PT_CACHE.set(key, e);
  }
  return e;
}

export function strainAt(op, x, y, z, ue, al, out = new Float64Array(6)) {
  const hx = op.h[0], hy = op.h[1], hz = op.h[2], s0 = 2 / hx, s1 = 2 / hy, s2 = 2 / hz;
  const pd = pointDerivs(op.type, x, y, z);
  const dN = pd.dN, nen = op.nen;
  let exx = 0, eyy = 0, ezz = 0, gyz = 0, gxz = 0, gxy = 0;
  const acc = (gx, gy, gz, ux, uy, uz) => {
    exx += gx * ux; eyy += gy * uy; ezz += gz * uz;
    gyz += gz * uy + gy * uz; gxz += gz * ux + gx * uz; gxy += gy * ux + gx * uy;
  };
  for (let a = 0; a < nen; a++) acc(dN[3 * a] * s0, dN[3 * a + 1] * s1, dN[3 * a + 2] * s2, ue[3 * a], ue[3 * a + 1], ue[3 * a + 2]);
  if (al) {
    const dP = pd.dP;
    for (let m = 0; m < 3; m++) acc(dP[3 * m] * s0, dP[3 * m + 1] * s1, dP[3 * m + 2] * s2, al[3 * m], al[3 * m + 1], al[3 * m + 2]);
  }
  out[0] = exx; out[1] = eyy; out[2] = ezz; out[3] = gyz; out[4] = gxz; out[5] = gxy;
  return out;
}

/** Q1 interpolation of 8 corner temperatures at reference point (x, y, z). */
export function interpT(Tc, x, y, z) {
  let T = 0;
  for (let a = 0; a < 8; a++) {
    const xa = 2 * (a & 1) - 1, ya = 2 * ((a >> 1) & 1) - 1, za = 2 * ((a >> 2) & 1) - 1;
    T += 0.125 * (1 + x * xa) * (1 + y * ya) * (1 + z * za) * Tc[a];
  }
  return T;
}

/** sigma = D (eps - eps_th). */
export function stressFrom(D, eps, epsTh, out = new Float64Array(6)) {
  for (let I = 0; I < 6; I++) {
    let s = 0;
    for (let J = 0; J < 6; J++) s += D[6 * I + J] * (eps[J] - (epsTh ? epsTh[J] : 0));
    out[I] = s;
  }
  return out;
}
