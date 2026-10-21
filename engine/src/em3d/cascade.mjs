// Network cascade for 3D blocks and 2D line segments (lane L7, E6): Redheffer star product of 2N-ports (ports
// 0..N-1 = left, N..2N-1 = right), 2-port S <-> ABCD, line parameters from a 2-port. License: GPL-3.0-or-later.

import { CMat, cmatMul, cmatAdd, cmatSolve, cmatBlock, cmatPlace } from '../em2d/dense.mjs';

/**
 * Redheffer star product: right ports of A connected to left ports of B (same reference impedances).
 * S11 = A11 + A12 (I - B11 A22)^-1 B11 A21, S12 = A12 (I - B11 A22)^-1 B12,
 * S21 = B21 (I - A22 B11)^-1 A21,           S22 = B22 + B21 (I - A22 B11)^-1 A22 B12.
 */
export function starProduct(A, B) {
  const N = A.r / 2;
  if (B.r !== A.r) throw new Error('starProduct: size mismatch');
  const blk = (M, i, j) => cmatBlock(M, i * N, j * N, N, N);
  const [A11, A12, A21, A22] = [blk(A, 0, 0), blk(A, 0, 1), blk(A, 1, 0), blk(A, 1, 1)];
  const [B11, B12, B21, B22] = [blk(B, 0, 0), blk(B, 0, 1), blk(B, 1, 0), blk(B, 1, 1)];
  const I = CMat.eye(N);
  const X1 = cmatAdd(I, cmatMul(B11, A22), 1, -1); // I - B11 A22
  const X2 = cmatAdd(I, cmatMul(A22, B11), 1, -1); // I - A22 B11
  const S = new CMat(2 * N);
  cmatPlace(S, cmatAdd(A11, cmatMul(A12, cmatSolve(X1, cmatMul(B11, A21)))), 0, 0);
  cmatPlace(S, cmatMul(A12, cmatSolve(X1, B12)), 0, N);
  cmatPlace(S, cmatMul(B21, cmatSolve(X2, A21)), N, 0);
  cmatPlace(S, cmatAdd(B22, cmatMul(B21, cmatSolve(X2, cmatMul(A22, B12)))), N, N);
  return S;
}

const c = (re, im) => ({ re, im });
const mul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const add = (a, b) => c(a.re + b.re, a.im + b.im);
const sub = (a, b) => c(a.re - b.re, a.im - b.im);
const div = (a, b) => {
  const d = b.re * b.re + b.im * b.im;
  return c((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d);
};
const sqrtc = (z) => {
  const r = Math.hypot(z.re, z.im);
  const t = Math.sqrt((r + Math.abs(z.re)) / 2);
  if (t === 0) return c(0, 0);
  return z.re >= 0 ? c(t, z.im / (2 * t)) : c(Math.abs(z.im) / (2 * t), z.im >= 0 ? t : -t);
};

/** 2-port S (reference z0, real) -> ABCD {A, B, C, D} (complex). */
export function s2abcd(S, z0) {
  const g = (i, j) => c(S.re[2 * i + j], S.im[2 * i + j]);
  const [s11, s12, s21, s22] = [g(0, 0), g(0, 1), g(1, 0), g(1, 1)];
  const one = c(1, 0);
  const den = mul(c(2, 0), s21);
  const A = div(add(mul(add(one, s11), sub(one, s22)), mul(s12, s21)), den);
  const Bc = div(mul(c(z0, 0), sub(mul(add(one, s11), add(one, s22)), mul(s12, s21))), den);
  const C = div(sub(mul(sub(one, s11), sub(one, s22)), mul(s12, s21)), mul(c(z0, 0), den));
  const D = div(add(mul(sub(one, s11), add(one, s22)), mul(s12, s21)), den);
  return { A, B: Bc, C, D };
}

/** ABCD -> 2-port S with real reference z0. */
export function abcd2s({ A, B, C, D }, z0) {
  const Bz = div(B, c(z0, 0)),
    Cz = mul(C, c(z0, 0));
  const den = add(add(A, Bz), add(Cz, D));
  const S = new CMat(2);
  const s11 = div(sub(add(A, Bz), add(Cz, D)), den);
  const s12 = div(mul(c(2, 0), sub(mul(A, D), mul(B, C))), den);
  const s21 = div(c(2, 0), den);
  const s22 = div(sub(add(Bz, D), add(A, Cz)), den);
  [s11, s12, s21, s22].forEach((v, k) => {
    S.re[k] = v.re;
    S.im[k] = v.im;
  });
  return S;
}

/** Uniform-line parameters from a symmetric 2-port: Zc = sqrt(B / C), gamma l = acosh(A). */
export function lineFromAbcd({ A, B, C }) {
  const Zc = sqrtc(div(B, C));
  // acosh(A) = ln(A + sqrt(A^2 - 1))
  const s = sqrtc(sub(mul(A, A), c(1, 0)));
  const w = add(A, s);
  const lnw = c(Math.log(Math.hypot(w.re, w.im)), Math.atan2(w.im, w.re));
  return { Zc, gammaL: lnw.re < 0 ? c(-lnw.re, -lnw.im) : lnw };
}

// ---- 2-port ABCD on CMat-free complex scalars, for de-embedding with references that differ per port ----
const cneg = (a) => c(-a.re, -a.im);
/** 2-port Z (CMat 2 x 2) -> ABCD. */
export function zToAbcd(Z) {
  const g = (i, j) => c(Z.re[2 * i + j], Z.im[2 * i + j]);
  const [z11, z12, z21, z22] = [g(0, 0), g(0, 1), g(1, 0), g(1, 1)];
  return { A: div(z11, z21), B: div(sub(mul(z11, z22), mul(z12, z21)), z21), C: div(c(1, 0), z21), D: div(z22, z21) };
}
/** ABCD -> 2-port Z (CMat). */
export function abcdToZ({ A, B, C, D }) {
  const Z = new CMat(2);
  const det = sub(mul(A, D), mul(B, C));
  [div(A, C), div(det, C), div(c(1, 0), C), div(D, C)].forEach((v, k) => {
    Z.re[k] = v.re;
    Z.im[k] = v.im;
  });
  return Z;
}
export const abcdMul = (X, Y) => ({ A: add(mul(X.A, Y.A), mul(X.B, Y.C)), B: add(mul(X.A, Y.B), mul(X.B, Y.D)), C: add(mul(X.C, Y.A), mul(X.D, Y.C)), D: add(mul(X.C, Y.B), mul(X.D, Y.D)) });
export function abcdInv({ A, B, C, D }) {
  const det = sub(mul(A, D), mul(B, C));
  return { A: div(D, det), B: div(cneg(B), det), C: div(cneg(C), det), D: div(A, det) };
}
/** The same two-port seen from the other side (ports swapped), reciprocal: [[D, B], [C, A]] / det. */
export function abcdReverse({ A, B, C, D }) {
  const det = sub(mul(A, D), mul(B, C));
  return { A: div(D, det), B: div(B, det), C: div(C, det), D: div(A, det) };
}
