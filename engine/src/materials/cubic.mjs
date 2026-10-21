// Cubic-crystal elasticity helpers (lane L2). Formulas: Hopcroft, Nix, Kenny, JMEMS 19(2) 229-238 (2010), doi
// 10.1109/JMEMS.2009.2039697: directional E (Eq. 9 form, p.5), Voigt/Reuss averages (Eq. 14, p.6), bulk modulus (Eq. 15).
// Rotation of the 6x6 stiffness uses the standard Bond matrix. License: GPL-3.0-or-later.

/** Compliances s11, s12, s44 (1/Pa) from cubic stiffnesses (Pa). */
export function cubicCompliance(C11, C12, C44) {
  const d = (C11 - C12) * (C11 + 2 * C12);
  return { s11: (C11 + C12) / d, s12: -C12 / d, s44: 1 / C44 };
}

/** Young's modulus along direction dir = [l, m, n] (crystal frame, need not be normalized). */
export function cubicDirectionalE(C, dir) {
  const { s11, s12, s44 } = cubicCompliance(C.C11, C.C12, C.C44);
  const L = Math.hypot(dir[0], dir[1], dir[2]);
  const [l, m, n] = dir.map((v) => v / L);
  const J = l * l * m * m + m * m * n * n + l * l * n * n;
  return 1 / (s11 - 2 * (s11 - s12 - s44 / 2) * J);
}

/** Voigt, Reuss and Hill isotropic averages {E, G, B, nu} of a cubic crystal. */
export function cubicIsotropicAverages(C) {
  const { C11, C12, C44 } = C;
  const { s11, s12, s44 } = cubicCompliance(C11, C12, C44);
  const B = (C11 + 2 * C12) / 3;
  const GV = (C11 - C12 + 3 * C44) / 5;
  const GR = 5 / (4 * (s11 - s12) + 3 * s44);
  const iso = (G) => ({ G, B, E: (9 * B * G) / (3 * B + G), nu: (3 * B - 2 * G) / (2 * (3 * B + G)) });
  return { voigt: iso(GV), reuss: iso(GR), hill: iso((GV + GR) / 2) };
}

/** 6x6 cubic stiffness (Voigt notation, engineering shear strains), row-major array of 36. */
export function cubicStiffness6(C) {
  const { C11, C12, C44 } = C;
  const M = new Array(36).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) M[6 * i + j] = i === j ? C11 : C12;
  for (let i = 3; i < 6; i++) M[6 * i + i] = C44;
  return M;
}

/**
 * Bond stress-transformation matrix for an active rotation by `deg` about z (SPEC section 12): R = Rz(deg), columns =
 * crystal (local) axes expressed in global coordinates; a_ij = R_ij = cos(global_i, local_j). Fixed 2026-10-20 (audit
 * A1 S5): the matrix was R^T before.
 */
function bondZ(deg) {
  const t = (deg * Math.PI) / 180;
  const c = Math.cos(t);
  const s = Math.sin(t);
  const a = [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
  const K = new Array(36).fill(0);
  const idx = [
    [0, 0],
    [1, 1],
    [2, 2],
    [1, 2],
    [0, 2],
    [0, 1],
  ];
  for (let I = 0; I < 6; I++) {
    const [i, j] = idx[I];
    for (let J = 0; J < 6; J++) {
      const [k, l] = idx[J];
      if (J < 3) K[6 * I + J] = a[i][k] * a[j][l];
      else K[6 * I + J] = a[i][k] * a[j][l] + a[i][l] * a[j][k];
    }
  }
  return K;
}

function mul6(A, B) {
  const C = new Array(36).fill(0);
  for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) for (let j = 0; j < 6; j++) C[6 * i + j] += A[6 * i + k] * B[6 * k + j];
  return C;
}

const T6 = (A) => {
  const B = new Array(36);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) B[6 * j + i] = A[6 * i + j];
  return B;
};

/** Global stiffness of a cubic crystal whose axes are actively rotated by `deg` about global z (SPEC 12): C' = K C K^T. */
export function cubicStiffnessRotZ(C, deg) {
  const K = bondZ(deg);
  return mul6(mul6(K, cubicStiffness6(C)), T6(K));
}

/** Invert a symmetric positive-definite 6x6 (Gauss-Jordan). Throws when singular. */
export function invert6(A) {
  const n = 6;
  const M = A.slice();
  const I = new Array(36).fill(0);
  for (let i = 0; i < n; i++) I[7 * i] = 1;
  for (let col = 0; col < n; col++) {
    let p = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[6 * r + col]) > Math.abs(M[6 * p + col])) p = r;
    if (Math.abs(M[6 * p + col]) < 1e-300) throw new Error('materials: singular 6x6 matrix');
    if (p !== col) {
      for (let j = 0; j < n; j++) {
        [M[6 * p + j], M[6 * col + j]] = [M[6 * col + j], M[6 * p + j]];
        [I[6 * p + j], I[6 * col + j]] = [I[6 * col + j], I[6 * p + j]];
      }
    }
    const d = M[6 * col + col];
    for (let j = 0; j < n; j++) {
      M[6 * col + j] /= d;
      I[6 * col + j] /= d;
    }
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[6 * r + col];
      if (!f) continue;
      for (let j = 0; j < n; j++) {
        M[6 * r + j] -= f * M[6 * col + j];
        I[6 * r + j] -= f * I[6 * col + j];
      }
    }
  }
  return I;
}

/** Engineering constants {Ex, Ey, Ez, nuxy, nuyz, nuxz, Gxy, Gyz, Gxz} of a 6x6 stiffness (orthotropic in its frame). */
export function engineeringConstants(C6) {
  const S = invert6(C6);
  return {
    Ex: 1 / S[0],
    Ey: 1 / S[7],
    Ez: 1 / S[14],
    nuxy: -S[1] / S[0],
    nuyz: -S[8] / S[7],
    nuxz: -S[2] / S[0],
    Gyz: 1 / S[21],
    Gxz: 1 / S[28],
    Gxy: 1 / S[35],
  };
}

/** Orthotropic 6x6 compliance from engineering constants; used for positive-definiteness checks. */
export function orthoCompliance(o) {
  const S = new Array(36).fill(0);
  S[0] = 1 / o.Ex;
  S[7] = 1 / o.Ey;
  S[14] = 1 / o.Ez;
  S[1] = S[6] = -o.nuxy / o.Ex;
  S[2] = S[12] = -o.nuxz / o.Ex;
  S[8] = S[13] = -o.nuyz / o.Ey;
  S[21] = 1 / o.Gyz;
  S[28] = 1 / o.Gxz;
  S[35] = 1 / o.Gxy;
  return S;
}

/** True when the symmetric 6x6 matrix is positive definite (Cholesky). */
export function isPositiveDefinite6(A) {
  const L = new Array(36).fill(0);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[6 * i + j];
      for (let k = 0; k < j; k++) s -= L[6 * i + k] * L[6 * j + k];
      if (i === j) {
        if (!(s > 0)) return false;
        L[6 * i + i] = Math.sqrt(s);
      } else L[6 * i + j] = s / L[6 * j + j];
    }
  }
  return true;
}
