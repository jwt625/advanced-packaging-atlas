// Multiconductor transmission-line (MTL) analysis from per-unit-length RLGC: modal decomposition, exact chain matrix,
// 2N-port Y / Z / S, renormalization, mixed-mode, cascade, NEXT/FEXT, passivity and reciprocity (EM 2D lane L7).
// License: GPL-3.0-or-later.
//
// Conventions: phasor exp(+j w t); telegrapher dV/dz = -Z I, dI/dz = -Y V with Z = R + j w L, Y = G + j w C (N x N).
// 2N-port numbering: ports 0..N-1 = near ends (z = 0) of lines 0..N-1, ports N..2N-1 = far ends (z = len). Port
// voltages are line-to-reference voltages, port currents flow into the network. S uses real per-port reference
// impedances (power waves = pseudo-waves for real references): S = (I - z Y z)(I + z Y z)^-1, z = diag(sqrt(Zref)).

import { CMat, cmatMul, cmatAdd, cmatScale, cmatInv, cmatSolve, cmatExp, cmatEig, cmatT, cmatBlock, cmatPlace, cmatMaxAbs, cmatMaxSingular, cmatCond1 } from './dense.mjs';
import { csqrt } from '../la/complex.mjs';
import { C0 } from './closed-forms.mjs';

/** Z = R + j w L and Y = G + j w C from one rlgcAt result. */
export function zyFromRlgc(r) {
  const N = Math.round(Math.sqrt(r.R.length));
  const w = 2 * Math.PI * r.f;
  const Z = new CMat(N),
    Y = new CMat(N);
  for (let q = 0; q < N * N; q++) {
    Z.re[q] = r.R[q];
    Z.im[q] = w * r.L[q];
    Y.re[q] = r.G[q];
    Y.im[q] = w * r.C[q];
  }
  return { Z, Y, N, w };
}

/**
 * Modal decomposition: Z Y = Tv diag(gamma^2) Tv^-1, gamma = principal sqrt (Re >= 0), characteristic admittance
 * Yc = Z^-1 Tv gamma Tv^-1 (I+ = Yc V+). Modes sorted by increasing beta.
 */
export function modalAnalysis(Z, Y, w) {
  const N = Z.r;
  const ZY = cmatMul(Z, Y);
  const eig = cmatEig(ZY);
  const idx = [...Array(N).keys()];
  const gam = idx.map((k) => csqrt({ re: eig.values.re[k], im: eig.values.im[k] }));
  idx.sort((a, b) => gam[a].im - gam[b].im);
  const Tv = new CMat(N);
  const G = new CMat(N);
  idx.forEach((k, m) => {
    for (let i = 0; i < N; i++) {
      Tv.re[i * N + m] = eig.vectors.re[i * N + k];
      Tv.im[i * N + m] = eig.vectors.im[i * N + k];
    }
    G.re[m * N + m] = gam[k].re;
    G.im[m * N + m] = gam[k].im;
  });
  const TvInv = cmatInv(Tv);
  const Yc = cmatMul(cmatSolve(Z, cmatMul(Tv, G)), TvInv);
  const k0 = w / C0;
  const modes = idx.map((k) => {
    const g = gam[k];
    // eps_eff = -(gamma / k0)^2 (complex); report its real part and the phase-velocity based value (beta / k0)^2
    return { gamma: g, alpha_Np_m: g.re, beta_rad_m: g.im, eps_eff: k0 > 0 ? (g.im / k0) ** 2 : NaN, alpha_dB_mm: (g.re * 20) / Math.LN10 / 1000 };
  });
  return { modes, Tv, gammaDiag: G, Yc, Zc: cmatInv(Yc), condTv: cmatCond1(Tv), eigResidual: eig.residual };
}

/** Exact chain matrix T(len) = expm([[0, -Z], [-Y, 0]] len): [V(len); I(len)] = T [V(0); I(0)]. */
export function chainMatrix(Z, Y, len) {
  const N = Z.r;
  const M = new CMat(2 * N);
  cmatPlace(M, Z, 0, N, -len);
  cmatPlace(M, Y, N, 0, -len);
  return cmatExp(M);
}

/** Chain matrix from the modal decomposition (cross-check of chainMatrix; requires a well-conditioned Tv). */
export function chainMatrixModal(Z, Y, len, w) {
  const N = Z.r;
  const { Tv, gammaDiag, Yc } = modalAnalysis(Z, Y, w);
  const ch = new CMat(N),
    sh = new CMat(N);
  for (let m = 0; m < N; m++) {
    const g = { re: gammaDiag.re[m * N + m] * len, im: gammaDiag.im[m * N + m] * len };
    ch.re[m * N + m] = Math.cosh(g.re) * Math.cos(g.im);
    ch.im[m * N + m] = Math.sinh(g.re) * Math.sin(g.im);
    sh.re[m * N + m] = Math.sinh(g.re) * Math.cos(g.im);
    sh.im[m * N + m] = Math.cosh(g.re) * Math.sin(g.im);
  }
  const TvInv = cmatInv(Tv);
  const Cv = cmatMul(cmatMul(Tv, ch), TvInv); // cosh(sqrt(ZY) len)
  const Sv = cmatMul(cmatMul(Tv, sh), TvInv); // sinh(sqrt(ZY) len)
  const Zc = cmatInv(Yc);
  // V(l) = Cv V0 - Sv Zc I0 ; I(l) = -Yc Sv V0 + Yc Cv Zc I0  (Zc Yc-similarity: Yc Cv Zc = cosh(sqrt(YZ) len))
  const T = new CMat(2 * N);
  cmatPlace(T, Cv, 0, 0);
  cmatPlace(T, cmatMul(Sv, Zc), 0, N, -1);
  cmatPlace(T, cmatMul(Yc, Sv), N, 0, -1);
  cmatPlace(T, cmatMul(cmatMul(Yc, Cv), Zc), N, N);
  return T;
}

/** 2N-port admittance matrix of a line section from its chain matrix (port currents into the network). */
export function chainToY(T) {
  const N = T.r / 2;
  const A = cmatBlock(T, 0, 0, N, N),
    B = cmatBlock(T, 0, N, N, N),
    C = cmatBlock(T, N, 0, N, N),
    D = cmatBlock(T, N, N, N, N);
  const Bi = cmatInv(B);
  const BiA = cmatMul(Bi, A);
  const DBi = cmatMul(D, Bi);
  const Yp = new CMat(2 * N);
  cmatPlace(Yp, BiA, 0, 0, -1);
  cmatPlace(Yp, Bi, 0, N);
  cmatPlace(Yp, cmatAdd(cmatMul(DBi, A), C, 1, -1), N, 0);
  cmatPlace(Yp, DBi, N, N, -1);
  return Yp;
}

const zvec = (zref, n) => {
  const z = Array.isArray(zref) || ArrayBuffer.isView(zref) ? Array.from(zref) : new Array(n).fill(zref);
  if (z.length !== n || z.some((v) => !(v > 0))) throw new Error('mtl: reference impedances must be positive reals, one per port');
  return z;
};
const diagScale = (A, s) => {
  // diag(s) A diag(s)
  const n = A.r;
  const B = A.clone();
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      B.re[i * n + j] *= s[i] * s[j];
      B.im[i * n + j] *= s[i] * s[j];
    }
  return B;
};

export function yToS(Yp, zref) {
  const n = Yp.r;
  const s = zvec(zref, n).map(Math.sqrt);
  const Yn = diagScale(Yp, s);
  const I = CMat.eye(n);
  // S = (I - Yn)(I + Yn)^-1 = (I + Yn)^-1 (I - Yn) (commuting)
  return cmatSolve(cmatAdd(I, Yn), cmatAdd(I, Yn, 1, -1));
}
export function sToY(S, zref) {
  const n = S.r;
  const s = zvec(zref, n).map((v) => 1 / Math.sqrt(v));
  const I = CMat.eye(n);
  return diagScale(cmatSolve(cmatAdd(I, S), cmatAdd(I, S, 1, -1)), s);
}
export function sToZ(S, zref) {
  const n = S.r;
  const s = zvec(zref, n).map(Math.sqrt);
  const I = CMat.eye(n);
  return diagScale(cmatSolve(cmatAdd(I, S, 1, -1), cmatAdd(I, S)), s);
}
export function zToS(Zp, zref) {
  const n = Zp.r;
  const s = zvec(zref, n).map((v) => 1 / Math.sqrt(v));
  const Zn = diagScale(Zp, s);
  const I = CMat.eye(n);
  return cmatSolve(cmatAdd(Zn, I), cmatAdd(Zn, I, 1, -1));
}
/** Renormalize S from reference impedances zOld to zNew (via Y; works for open/short-free networks). */
export const renormalize = (S, zOld, zNew) => yToS(sToY(S, zOld), zNew);

/** S of a uniform line section of length len (m) with per-port reference impedance(s) zref (ohm). */
export function lineS(r, len, zref) {
  const { Z, Y } = zyFromRlgc(r);
  return yToS(chainToY(chainMatrix(Z, Y, len)), zref);
}

/** Cascade chain matrices of consecutive sections (first section first). */
export function cascadeChain(list) {
  let T = list[0];
  for (let i = 1; i < list.length; i++) T = cmatMul(list[i], T);
  return T;
}

/**
 * Mixed-mode conversion (Bockelman-Eisenstadt): pairs = [[p, n], ...] covering every port once. Returns S_mm in the
 * order [d_0..d_{P-1}, c_0..c_{P-1}] and its quadrants. Differential reference = 2 Zse, common = Zse / 2 when all
 * single-ended references are Zse.
 */
export function mixedMode(S, pairs) {
  const n = S.r,
    P = pairs.length;
  if (2 * P !== n || new Set(pairs.flat()).size !== n) throw new Error('mtl: mixedMode pairs must cover every port exactly once');
  const M = new CMat(n);
  const h = Math.SQRT1_2;
  pairs.forEach(([p, q], k) => {
    M.re[k * n + p] = h;
    M.re[k * n + q] = -h;
    M.re[(P + k) * n + p] = h;
    M.re[(P + k) * n + q] = h;
  });
  const Smm = cmatMul(cmatMul(M, S), cmatT(M));
  return { S: Smm, Sdd: cmatBlock(Smm, 0, 0, P, P), Sdc: cmatBlock(Smm, 0, P, P, P), Scd: cmatBlock(Smm, P, 0, P, P), Scc: cmatBlock(Smm, P, P, P, P) };
}

/** max |S_ij - S_ji| */
export function reciprocityError(S) {
  return cmatMaxAbs(cmatAdd(S, cmatT(S), 1, -1));
}
/** largest singular value (passive iff <= 1) */
export const passivityMaxSv = (S) => cmatMaxSingular(S);
/** max |S^H S - I| (0 for a lossless network) */
export function unitarityError(S) {
  return cmatMaxAbs(cmatAdd(cmatMul(cmatT(S, true), S), CMat.eye(S.r), 1, -1));
}

const db = (re, im) => 20 * Math.log10(Math.hypot(re, im));
/** IL, RL, NEXT, FEXT tables (dB) for a 2N-port line S (aggressor j, victim i). */
export function crosstalk(S) {
  const n = S.r,
    N = n / 2;
  const g = (i, j) => [S.re[i * n + j], S.im[i * n + j]];
  const out = { IL_dB: [], RL_dB: [], NEXT_dB: [], FEXT_dB: [] };
  for (let j = 0; j < N; j++) {
    out.IL_dB.push(-db(...g(N + j, j)));
    out.RL_dB.push(-db(...g(j, j)));
    const nx = [],
      fx = [];
    for (let i = 0; i < N; i++) {
      nx.push(i === j ? null : db(...g(i, j)));
      fx.push(i === j ? null : db(...g(N + i, j)));
    }
    out.NEXT_dB.push(nx);
    out.FEXT_dB.push(fx);
  }
  return out;
}

export { CMat };
