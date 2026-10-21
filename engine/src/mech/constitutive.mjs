// Linear elastic constitutive matrices and thermal strain in the lab frame (tranche E2; DevLog-010 A6; SPEC section 4).
// Voigt order [xx, yy, zz, yz, xz, xy] with engineering shear strains (gamma = 2 eps), as materials/cubic.mjs.
// Orientation convention (SPEC section 12): R is the active rotation whose columns are the material (local) axes in
// global coordinates; T_global = R T_local R^T. `rotation_deg: [ax, ay, az]` composes as R = Rz(az) Ry(ay) Rx(ax);
// `rotation_z_deg` = Rz; `rotations: [{axis, deg}, ...]` = active rotations about global axes applied in list order.
// Direction cosines a_ij = global_i . local_j = R_ij; sigma_global = K sigma_local (Bond matrix of a),
// D_global = K D_local K^T, eps_global (tensor) = a eps_local a^T.
// License: GPL-3.0-or-later.

/** Active rotation about a global axis (row-major 3x3). */
function rotAxis(axis, deg) {
  const t = (deg * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  if (axis === 'x') return [1, 0, 0, 0, c, -s, 0, s, c];
  if (axis === 'y') return [c, 0, s, 0, 1, 0, -s, 0, c];
  if (axis === 'z') return [c, -s, 0, s, c, 0, 0, 0, 1];
  throw new Error(`mech: orientation rotation axis must be x, y or z (got ${axis})`);
}

/** Direction cosines a = R (row-major, a[3 i + j] = global_i . local_j) of an orientation (SPEC section 12). */
export function directionCosines(orientation) {
  let R = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  if (!orientation) return R;
  if (Array.isArray(orientation.R) && orientation.R.length === 9) return orientation.R.slice();
  if (Array.isArray(orientation.rotation_deg)) {
    const [ax = 0, ay = 0, az = 0] = orientation.rotation_deg;
    return mul3(rotAxis('z', az), mul3(rotAxis('y', ay), rotAxis('x', ax)));
  }
  if (Number.isFinite(orientation.rotation_z_deg)) R = rotAxis('z', orientation.rotation_z_deg);
  for (const r of orientation.rotations ?? []) R = mul3(rotAxis(r.axis, r.deg), R);
  return R;
}

function mul3(A, B) {
  const C = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[3 * i + j] += A[3 * i + k] * B[3 * k + j];
  return C;
}

const VI = [0, 1, 2, 1, 0, 0], VJ = [0, 1, 2, 2, 2, 1];

/** Bond stress-transformation matrix (6x6 row-major) for direction cosines a (lab_i . mat_j). */
export function bond(a) {
  const K = new Float64Array(36);
  for (let I = 0; I < 6; I++) {
    const i = VI[I], j = VJ[I];
    for (let J = 0; J < 6; J++) {
      const k = VI[J], l = VJ[J];
      K[6 * I + J] = J < 3 ? a[3 * i + k] * a[3 * j + l] : a[3 * i + k] * a[3 * j + l] + a[3 * i + l] * a[3 * j + k];
    }
  }
  return K;
}

/** Invert a symmetric positive-definite n x n matrix (Gauss-Jordan with partial pivoting). Throws when singular. */
export function invertDense(A, n) {
  const M = Float64Array.from(A), I = new Float64Array(n * n);
  for (let i = 0; i < n; i++) I[i * n + i] = 1;
  for (let c = 0; c < n; c++) {
    let p = c, best = Math.abs(M[c * n + c]);
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r * n + c]) > best) { best = Math.abs(M[r * n + c]); p = r; }
    if (!(best > 0)) throw new Error('mech: singular matrix in invertDense');
    if (p !== c) for (let k = 0; k < n; k++) {
      let t = M[c * n + k]; M[c * n + k] = M[p * n + k]; M[p * n + k] = t;
      t = I[c * n + k]; I[c * n + k] = I[p * n + k]; I[p * n + k] = t;
    }
    const d = 1 / M[c * n + c];
    for (let k = 0; k < n; k++) { M[c * n + k] *= d; I[c * n + k] *= d; }
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r * n + c];
      if (f === 0) continue;
      for (let k = 0; k < n; k++) { M[r * n + k] -= f * M[c * n + k]; I[r * n + k] -= f * I[c * n + k]; }
    }
  }
  return I;
}

/** Material-frame 6x6 stiffness from a SPEC section 4 `elastic` object. */
export function stiffnessMaterialFrame(el) {
  if (!el || typeof el !== 'object') throw new Error('mech: elastic property missing');
  const D = new Float64Array(36);
  if (el.type === 'iso') {
    const { E_Pa: E, nu } = el;
    if (!(E > 0) || !(nu > -1 && nu < 0.5)) throw new Error(`mech: iso elastic needs E_Pa > 0 and -1 < nu < 0.5 (got E ${E}, nu ${nu})`);
    const lam = (E * nu) / ((1 + nu) * (1 - 2 * nu)), mu = E / (2 * (1 + nu));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) D[6 * i + j] = lam + (i === j ? 2 * mu : 0);
    for (let i = 3; i < 6; i++) D[6 * i + i] = mu;
    return D;
  }
  if (el.type === 'cubic') {
    const { C11, C12, C44 } = el;
    if (!(C11 > 0 && C44 > 0 && C11 > Math.abs(C12) && C11 + 2 * C12 > 0)) throw new Error('mech: cubic constants not positive definite');
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) D[6 * i + j] = i === j ? C11 : C12;
    for (let i = 3; i < 6; i++) D[6 * i + i] = C44;
    return D;
  }
  if (el.type === 'ortho') {
    const { Ex, Ey, Ez, nuxy, nuyz, nuxz, Gxy, Gyz, Gxz } = el;
    for (const [k, v] of Object.entries({ Ex, Ey, Ez, Gxy, Gyz, Gxz })) if (!(v > 0)) throw new Error(`mech: ortho elastic ${k} must be > 0 (got ${v})`);
    const S = new Float64Array(36);
    S[0] = 1 / Ex; S[7] = 1 / Ey; S[14] = 1 / Ez;
    S[1] = S[6] = -nuxy / Ex; S[2] = S[12] = -nuxz / Ex; S[8] = S[13] = -nuyz / Ey;
    S[21] = 1 / Gyz; S[28] = 1 / Gxz; S[35] = 1 / Gxy;
    const C = invertDense(S, 6);
    // positive definiteness: Cholesky pivots
    if (!isSPD(C, 6)) throw new Error('mech: ortho engineering constants give a non-positive-definite stiffness');
    return C;
  }
  throw new Error(`mech: unknown elastic type ${el.type} (iso | ortho | cubic)`);
}

function isSPD(A, n) {
  const L = Float64Array.from(A);
  for (let j = 0; j < n; j++) {
    let d = L[j * n + j];
    for (let k = 0; k < j; k++) d -= L[j * n + k] * L[j * n + k];
    if (!(d > 0)) return false;
    d = Math.sqrt(d);
    L[j * n + j] = d;
    for (let i = j + 1; i < n; i++) {
      let s = L[i * n + j];
      for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
      L[i * n + j] = s / d;
    }
  }
  return true;
}

/** Orientation of an elastic object: cubic entries carry `orientation` (materials), others may carry one too. */
export function orientationOf(el, override) {
  return override ?? el?.orientation ?? null;
}

/** Lab-frame 6x6 stiffness. */
export function stiffnessLab(el, orientation = null) {
  const Dm = stiffnessMaterialFrame(el);
  const a = directionCosines(orientationOf(el, orientation));
  if (isIdentity(a)) return Dm;
  const K = bond(a);
  const T = new Float64Array(36), D = new Float64Array(36);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { let s = 0; for (let k = 0; k < 6; k++) s += K[6 * i + k] * Dm[6 * k + j]; T[6 * i + j] = s; }
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { let s = 0; for (let k = 0; k < 6; k++) s += T[6 * i + k] * K[6 * j + k]; D[6 * i + j] = s; }
  // symmetrize round-off
  for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) { const m = 0.5 * (D[6 * i + j] + D[6 * j + i]); D[6 * i + j] = D[6 * j + i] = m; }
  return D;
}

function isIdentity(a) {
  return a[0] === 1 && a[4] === 1 && a[8] === 1 && a[1] === 0 && a[2] === 0 && a[3] === 0 && a[5] === 0 && a[6] === 0 && a[7] === 0;
}

/**
 * Lab-frame thermal strain (Voigt, engineering shear) for material-frame axial strains e = [ex, ey, ez]
 * (e_i = alpha_i (T - Tsf), secant alpha re-based to Tsf).
 */
export function thermalStrainLab(e, a, out = new Float64Array(6)) {
  if (!a || isIdentity(a)) {
    out[0] = e[0]; out[1] = e[1]; out[2] = e[2]; out[3] = 0; out[4] = 0; out[5] = 0;
    return out;
  }
  const t = (i, j) => a[3 * i] * a[3 * j] * e[0] + a[3 * i + 1] * a[3 * j + 1] * e[1] + a[3 * i + 2] * a[3 * j + 2] * e[2];
  out[0] = t(0, 0); out[1] = t(1, 1); out[2] = t(2, 2);
  out[3] = 2 * t(1, 2); out[4] = 2 * t(0, 2); out[5] = 2 * t(0, 1);
  return out;
}

/** von Mises stress of a Voigt stress vector. */
export function vonMises(s, o = 0) {
  const a = s[o], b = s[o + 1], c = s[o + 2], yz = s[o + 3], xz = s[o + 4], xy = s[o + 5];
  return Math.sqrt(0.5 * ((a - b) ** 2 + (b - c) ** 2 + (c - a) ** 2) + 3 * (yz * yz + xz * xz + xy * xy));
}

/** Principal stresses (descending) of a Voigt stress vector (closed-form symmetric 3x3 eigenvalues). */
export function principal(s, o = 0) {
  const a = s[o], b = s[o + 1], c = s[o + 2], yz = s[o + 3], xz = s[o + 4], xy = s[o + 5];
  const p1 = xy * xy + xz * xz + yz * yz;
  const q = (a + b + c) / 3;
  if (p1 <= 1e-30 * (a * a + b * b + c * c + 1e-300)) return [a, b, c].sort((x, y) => y - x);
  const p2 = (a - q) ** 2 + (b - q) ** 2 + (c - q) ** 2 + 2 * p1;
  const p = Math.sqrt(p2 / 6);
  const B = [(a - q) / p, xy / p, xz / p, xy / p, (b - q) / p, yz / p, xz / p, yz / p, (c - q) / p];
  const detB = B[0] * (B[4] * B[8] - B[5] * B[7]) - B[1] * (B[3] * B[8] - B[5] * B[6]) + B[2] * (B[3] * B[7] - B[4] * B[6]);
  const r = Math.max(-1, Math.min(1, detB / 2));
  const phi = Math.acos(r) / 3;
  const e1 = q + 2 * p * Math.cos(phi);
  const e3 = q + 2 * p * Math.cos(phi + (2 * Math.PI) / 3);
  return [e1, 3 * q - e1 - e3, e3];
}
