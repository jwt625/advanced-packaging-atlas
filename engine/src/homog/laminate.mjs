// Exact homogenization of a periodic laminate (layers normal to one axis) for uniform macro fields (Backus-type
// averaging; tranche E3). Lane L8.
// In each layer the in-plane strains (I: the two normal strains in the layer plane and their shear) and the
// out-of-plane stresses (N: the normal stress along the layer normal and the two transverse shears) are uniform and
// common to all layers. With C partitioned into I / N blocks, layer volume fractions <.>:
//   C*_NN = <C_NN^-1>^-1,  C*_NI = C*_NN <C_NN^-1 C_NI>,
//   C*_II = <C_II - C_IN C_NN^-1 C_NI> + <C_IN C_NN^-1> C*_NN <C_NN^-1 C_NI>,
//   beta = C alpha (thermal stress per K):  b*_N = C*_NN <C_NN^-1 b_N>,  b*_I = <b_I - C_IN C_NN^-1 b_N> + <C_IN C_NN^-1> b*_N,
//   alpha* = C*^-1 b*.
// Voigt [xx, yy, zz, yz, xz, xy] with engineering shear; normal axis z: N = (zz, yz, xz), I = (xx, yy, xy);
// x: N = (xx, xy, xz), I = (yy, zz, yz); y: N = (yy, yz, xy), I = (xx, zz, xz).
// Also used for thin-film merging (merge.mjs): exact membrane properties of a stack.
// License: GPL-3.0-or-later.

import { invertDense } from '../mech/constitutive.mjs';

const SETS = { z: { N: [2, 3, 4], I: [0, 1, 5] }, x: { N: [0, 5, 4], I: [1, 2, 3] }, y: { N: [1, 3, 5], I: [0, 2, 4] } };

const sub = (M, rows, cols) => rows.map((r) => cols.map((c) => M[6 * r + c]));
const inv3 = (A) => { const v = invertDense(A.flat(), 3); return [[v[0], v[1], v[2]], [v[3], v[4], v[5]], [v[6], v[7], v[8]]]; };
const mm = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
const mv = (A, x) => A.map((r) => r.reduce((s, v, k) => s + v * x[k], 0));
const add = (A, B, s = 1) => A.map((r, i) => r.map((v, j) => v + s * B[i][j]));
const zero = () => [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
const vadd = (a, b, s = 1) => a.map((v, i) => v + s * b[i]);

/**
 * @param {Array<{C: ArrayLike<number> (36), alpha?: number[] (6, Voigt, engineering shear), f: number}>} layers
 * @param {'x'|'y'|'z'} normal
 * @returns {{C: Float64Array(36), alpha: number[] | null}}
 */
export function laminate(layers, normal = 'z') {
  const { N, I } = SETS[normal];
  const ftot = layers.reduce((a, l) => a + l.f, 0);
  let aNNi = zero(), aNNiNI = zero(), aII = zero(), aINNNi = zero();
  let bN = [0, 0, 0], bI = [0, 0, 0];
  const hasT = layers.every((l) => l.alpha);
  for (const l of layers) {
    const f = l.f / ftot;
    const CNN = sub(l.C, N, N), CNI = sub(l.C, N, I), CIN = sub(l.C, I, N), CII = sub(l.C, I, I);
    const Ni = inv3(CNN);
    aNNi = add(aNNi, Ni, f);
    aNNiNI = add(aNNiNI, mm(Ni, CNI), f);
    aII = add(aII, add(CII, mm(mm(CIN, Ni), CNI), -1), f);
    aINNNi = add(aINNNi, mm(CIN, Ni), f);
    if (hasT) {
      const beta = Array.from({ length: 6 }, (_, r) => l.alpha.reduce((s, a, c) => s + l.C[6 * r + c] * a, 0));
      const btN = N.map((r) => beta[r]), btI = I.map((r) => beta[r]);
      bN = vadd(bN, mv(Ni, btN), f);
      bI = vadd(bI, vadd(btI, mv(mm(CIN, Ni), btN), -1), f);
    }
  }
  const CsNN = inv3(aNNi);
  const CsNI = mm(CsNN, aNNiNI);
  const CsII = add(aII, mm(mm(aINNNi, CsNN), aNNiNI));
  const C = new Float64Array(36);
  N.forEach((r, a) => N.forEach((c, b) => (C[6 * r + c] = CsNN[a][b])));
  N.forEach((r, a) => I.forEach((c, b) => { C[6 * r + c] = CsNI[a][b]; C[6 * c + r] = CsNI[a][b]; }));
  I.forEach((r, a) => I.forEach((c, b) => (C[6 * r + c] = CsII[a][b])));
  let alpha = null;
  if (hasT) {
    const bsN = mv(CsNN, bN);
    const bsI = vadd(bI, mv(aINNNi, bsN));
    const beta = new Array(6).fill(0);
    N.forEach((r, a) => (beta[r] = bsN[a]));
    I.forEach((r, a) => (beta[r] = bsI[a]));
    const S = invertDense(C, 6);
    alpha = Array.from({ length: 6 }, (_, r) => beta.reduce((s, b, c) => s + S[6 * r + c] * b, 0));
  }
  return { C, alpha };
}
