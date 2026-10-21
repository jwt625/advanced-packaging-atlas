// WebAssembly SIMD (f64x2) kernel for the complex front update of the multifrontal LDL^T (lane L7 wave 5, G1-style
// gate on the em2d / em3d hot spot). Module bytes are built at run time with lane L1's encoder
// (engine/src/la/wasm/encoder.mjs, imported read-only). The front (split re / im, column-major m x m) and the weight
// vector live in the module's memory; the JS factor of BlockedComplexLDLT is unchanged except that `_update` calls
//   upd(pFr, pFi, pW, m, k, lim, cmax):  F[lim:m, k] -= sum_{c < cmax} F[lim:m, c] w_c,  w_c = F[k, c] D_c
// with w precomputed in JS (2 f64 per source column). Rows are processed two at a time (f64x2 over consecutive rows of
// the split arrays), source columns four at a time, scalar tails for odd rows and the last cmax mod 4 columns.
// Summation order differs from the JS kernel, so results agree to round-off. License: GPL-3.0-or-later.

import { Fn, buildModule, I32, V128, F64, simdSupported } from '../la/wasm/encoder.mjs';
import { BlockedComplexLDLT } from './ldlt-blocked.mjs';

const vsub = (f) => f.op(0xfd, 0xf1, 0x01); // f64x2.sub (opcode 241)
const shl3 = (f) => f.i32(3).op(0x74); // i32.shl 3 (x 8 bytes)

function buildUpdate() {
  const f = new Fn('upd', [I32, I32, I32, I32, I32, I32, I32]);
  const [pFr, pFi, pW, m, k, lim, cmax] = [0, 1, 2, 3, 4, 5, 6];
  const c = f.local(I32),
    i = f.local(I32),
    o = f.local(I32),
    mb = f.local(I32),
    kR = f.local(I32),
    kI = f.local(I32),
    pw = f.local(I32);
  const pr = [f.local(I32), f.local(I32), f.local(I32), f.local(I32)];
  const pi = [f.local(I32), f.local(I32), f.local(I32), f.local(I32)];
  const wr = [f.local(V128), f.local(V128), f.local(V128), f.local(V128)];
  const wi = [f.local(V128), f.local(V128), f.local(V128), f.local(V128)];
  const tR = f.local(V128),
    tI = f.local(V128),
    ar = f.local(V128),
    ai = f.local(V128);
  const sr = f.local(F64),
    si = f.local(F64),
    xr = f.local(F64),
    xi = f.local(F64),
    swr = f.local(F64),
    swi = f.local(F64);
  // mb = m * 8 ; kR = pFr + k * mb ; kI = pFi + k * mb
  f.get(m);
  shl3(f);
  f.set(mb);
  f.get(pFr).get(k).get(mb).mul().add().set(kR);
  f.get(pFi).get(k).get(mb).mul().add().set(kI);
  f.i32(0).set(c);
  // ---- 4 source columns per pass ----
  f.block().loop();
  f.get(c).i32(4).add().get(cmax).op(0x4a).brIf(1); // i32.gt_s: c + 4 > cmax -> exit
  // pw = pW + c * 16
  f.get(pW).get(c).i32(4).op(0x74).add().set(pw);
  for (let q = 0; q < 4; q++) {
    f.get(pw).fload(16 * q).vsplat().set(wr[q]);
    f.get(pw).fload(16 * q + 8).vsplat().set(wi[q]);
    // pr[q] = pFr + (c + q) * mb, pi[q] likewise
    f.get(pFr).get(c).i32(q).add().get(mb).mul().add().set(pr[q]);
    f.get(pFi).get(c).i32(q).add().get(mb).mul().add().set(pi[q]);
  }
  f.get(lim).set(i);
  // rows two at a time
  f.block().loop();
  f.get(i).i32(2).add().get(m).op(0x4a).brIf(1); // i + 2 > m -> exit
  f.get(i);
  shl3(f);
  f.set(o);
  f.get(kR).get(o).add().vload().set(tR);
  f.get(kI).get(o).add().vload().set(tI);
  for (let q = 0; q < 4; q++) {
    f.get(pr[q]).get(o).add().vload().set(ar);
    f.get(pi[q]).get(o).add().vload().set(ai);
    // tR = tR - ar * wr + ai * wi ; tI = tI - ar * wi - ai * wr
    f.get(tR).get(ar).get(wr[q]).vmul();
    vsub(f);
    f.get(ai).get(wi[q]).vmul().vadd().set(tR);
    f.get(tI).get(ar).get(wi[q]).vmul();
    vsub(f);
    f.get(ai).get(wr[q]).vmul();
    vsub(f);
    f.set(tI);
  }
  f.get(kR).get(o).add().get(tR).vstore();
  f.get(kI).get(o).add().get(tI).vstore();
  f.get(i).i32(2).add().set(i);
  f.br(0).end().end();
  // odd tail row (scalar)
  f.block();
  f.get(i).get(m).op(0x4e).brIf(0); // i >= m -> skip
  f.get(i);
  shl3(f);
  f.set(o);
  f.get(kR).get(o).add().fload().set(sr);
  f.get(kI).get(o).add().fload().set(si);
  for (let q = 0; q < 4; q++) {
    f.get(pw).fload(16 * q).set(swr);
    f.get(pw).fload(16 * q + 8).set(swi);
    f.get(pr[q]).get(o).add().fload().set(xr);
    f.get(pi[q]).get(o).add().fload().set(xi);
    f.get(sr).get(xr).get(swr).fmul().fsub().get(xi).get(swi).fmul().fadd().set(sr);
    f.get(si).get(xr).get(swi).fmul().fsub().get(xi).get(swr).fmul().fsub().set(si);
  }
  f.get(kR).get(o).add().get(sr).fstore();
  f.get(kI).get(o).add().get(si).fstore();
  f.end();
  f.get(c).i32(4).add().set(c);
  f.br(0).end().end();
  // ---- remaining source columns one at a time (scalar) ----
  f.block().loop();
  f.get(c).get(cmax).op(0x4e).brIf(1); // c >= cmax -> exit
  f.get(pW).get(c).i32(4).op(0x74).add().set(pw);
  f.get(pw).fload(0).set(swr);
  f.get(pw).fload(8).set(swi);
  f.get(pFr).get(c).get(mb).mul().add().set(pr[0]);
  f.get(pFi).get(c).get(mb).mul().add().set(pi[0]);
  f.get(lim).set(i);
  f.block().loop();
  f.get(i).get(m).op(0x4e).brIf(1);
  f.get(i);
  shl3(f);
  f.set(o);
  f.get(pr[0]).get(o).add().fload().set(xr);
  f.get(pi[0]).get(o).add().fload().set(xi);
  f.get(kR).get(o).add();
  f.get(kR).get(o).add().fload().get(xr).get(swr).fmul().fsub().get(xi).get(swi).fmul().fadd();
  f.fstore();
  f.get(kI).get(o).add();
  f.get(kI).get(o).add().fload().get(xr).get(swi).fmul().fsub().get(xi).get(swr).fmul().fsub();
  f.fstore();
  f.get(i).i32(1).add().set(i);
  f.br(0).end().end();
  f.get(c).i32(1).add().set(c);
  f.br(0).end().end();
  return f;
}

function buildUpdate2() {
  // upd2(pFr, pFi, pW, pW2, m, k, lim, cmax): target columns k and k + 1 share every source load (lim applied to both;
  // the extra row lim of column k + 1 lies in the never-read upper triangle). cmax must be a multiple of 4 here; the
  // caller finishes the remaining source columns with upd.
  const f = new Fn('upd2', [I32, I32, I32, I32, I32, I32, I32, I32]);
  const [pFr, pFi, pW, pW2, m, k, lim, cmax] = [0, 1, 2, 3, 4, 5, 6, 7];
  const c = f.local(I32),
    i = f.local(I32),
    o = f.local(I32),
    mb = f.local(I32),
    kR = f.local(I32),
    kI = f.local(I32),
    pw = f.local(I32),
    pw2 = f.local(I32);
  const pr = [0, 1, 2, 3].map(() => f.local(I32)),
    pi = [0, 1, 2, 3].map(() => f.local(I32));
  const wr = [0, 1, 2, 3].map(() => f.local(V128)),
    wi = [0, 1, 2, 3].map(() => f.local(V128)),
    vr = [0, 1, 2, 3].map(() => f.local(V128)),
    vi = [0, 1, 2, 3].map(() => f.local(V128));
  const tR = f.local(V128),
    tI = f.local(V128),
    uR = f.local(V128),
    uI = f.local(V128),
    ar = f.local(V128),
    ai = f.local(V128);
  f.get(m);
  shl3(f);
  f.set(mb);
  f.get(pFr).get(k).get(mb).mul().add().set(kR);
  f.get(pFi).get(k).get(mb).mul().add().set(kI);
  f.i32(0).set(c);
  f.block().loop();
  f.get(c).i32(4).add().get(cmax).op(0x4a).brIf(1);
  f.get(pW).get(c).i32(4).op(0x74).add().set(pw);
  f.get(pW2).get(c).i32(4).op(0x74).add().set(pw2);
  for (let q = 0; q < 4; q++) {
    f.get(pw).fload(16 * q).vsplat().set(wr[q]);
    f.get(pw).fload(16 * q + 8).vsplat().set(wi[q]);
    f.get(pw2).fload(16 * q).vsplat().set(vr[q]);
    f.get(pw2).fload(16 * q + 8).vsplat().set(vi[q]);
    f.get(pFr).get(c).i32(q).add().get(mb).mul().add().set(pr[q]);
    f.get(pFi).get(c).i32(q).add().get(mb).mul().add().set(pi[q]);
  }
  f.get(lim).set(i);
  f.block().loop();
  f.get(i).i32(2).add().get(m).op(0x4a).brIf(1);
  f.get(i);
  shl3(f);
  f.set(o);
  f.get(kR).get(o).add().vload().set(tR);
  f.get(kI).get(o).add().vload().set(tI);
  f.get(kR).get(o).add().get(mb).add().vload().set(uR);
  f.get(kI).get(o).add().get(mb).add().vload().set(uI);
  for (let q = 0; q < 4; q++) {
    f.get(pr[q]).get(o).add().vload().set(ar);
    f.get(pi[q]).get(o).add().vload().set(ai);
    f.get(tR).get(ar).get(wr[q]).vmul();
    vsub(f);
    f.get(ai).get(wi[q]).vmul().vadd().set(tR);
    f.get(tI).get(ar).get(wi[q]).vmul();
    vsub(f);
    f.get(ai).get(wr[q]).vmul();
    vsub(f);
    f.set(tI);
    f.get(uR).get(ar).get(vr[q]).vmul();
    vsub(f);
    f.get(ai).get(vi[q]).vmul().vadd().set(uR);
    f.get(uI).get(ar).get(vi[q]).vmul();
    vsub(f);
    f.get(ai).get(vr[q]).vmul();
    vsub(f);
    f.set(uI);
  }
  f.get(kR).get(o).add().get(tR).vstore();
  f.get(kI).get(o).add().get(tI).vstore();
  f.get(kR).get(o).add().get(mb).add().get(uR).vstore();
  f.get(kI).get(o).add().get(mb).add().get(uI).vstore();
  f.get(i).i32(2).add().set(i);
  f.br(0).end().end();
  f.get(c).i32(4).add().set(c);
  f.br(0).end().end();
  return f;
}

let cached = null,
  compiled = null;
function moduleBytes() {
  if (!cached) cached = buildModule([buildUpdate(), buildUpdate2()]);
  return cached;
}

export const wasmLdltSupported = () => {
  try {
    return simdSupported() && WebAssembly.validate(moduleBytes());
  } catch {
    return false;
  }
};

/** BlockedComplexLDLT with the front update in WebAssembly (f64x2). Falls back to the JS class when unsupported. */
export class WasmComplexLDLT extends BlockedComplexLDLT {
  constructor(sym) {
    super(sym);
    const mf = sym.maxFront;
    const bytesF = mf * mf * 8;
    const bytes = 2 * bytesF + mf * 32 + 64;
    const memory = new WebAssembly.Memory({ initial: Math.ceil(bytes / 65536) });
    compiled = compiled ?? new WebAssembly.Module(moduleBytes());
    const inst = new WebAssembly.Instance(compiled, { env: { memory } });
    this._upd = inst.exports.upd;
    this._upd2 = inst.exports.upd2;
    this.Fr = new Float64Array(memory.buffer, 0, mf * mf);
    this.Fi = new Float64Array(memory.buffer, bytesF, mf * mf);
    this._pW = 2 * bytesF;
    this._Wv = new Float64Array(memory.buffer, this._pW, 2 * mf);
    this._pW2 = this._pW + 16 * mf;
    this._Wv2 = new Float64Array(memory.buffer, this._pW2, 2 * mf);
    this._pFi = bytesF;
  }

  _update(k, lim, m, nc, f) {
    const { Fr, Fi, Dr, Di, _Wv: Wv } = this;
    const cmax = Math.min(k, nc);
    if (cmax === 0 || lim >= m) return;
    for (let c = 0; c < cmax; c++) {
      const b0 = c * m;
      const lr = Fr[k + b0],
        li = Fi[k + b0],
        dr = Dr[f + c],
        di = Di[f + c];
      Wv[2 * c] = lr * dr - li * di;
      Wv[2 * c + 1] = lr * di + li * dr;
    }
    this._upd(0, this._pFi, this._pW, m, k, lim, cmax);
  }

  /** Trailing Schur update, two target columns per kernel call (rows tail / last odd column / cmax mod 4 by upd). */
  _trailing(m, nc, f) {
    const { Fr, Fi, Dr, Di, _Wv: W1, _Wv2: W2 } = this;
    const c4 = nc - (nc % 4);
    let j = nc;
    for (; j + 1 < m; j += 2) {
      for (let c = 0; c < nc; c++) {
        const b0 = c * m,
          dr = Dr[f + c],
          di = Di[f + c];
        let lr = Fr[j + b0],
          li = Fi[j + b0];
        W1[2 * c] = lr * dr - li * di;
        W1[2 * c + 1] = lr * di + li * dr;
        lr = Fr[j + 1 + b0];
        li = Fi[j + 1 + b0];
        W2[2 * c] = lr * dr - li * di;
        W2[2 * c + 1] = lr * di + li * dr;
      }
      // upd2 has no odd-row tail: start one row higher when m - j is odd (that row is in the unread upper triangle)
      if (c4 > 0) this._upd2(0, this._pFi, this._pW, this._pW2, m, j, (m - j) % 2 ? j - 1 : j, c4);
      if (c4 < nc) {
        // remaining source columns c4..nc-1 for both targets: column and weight pointers shifted by c4 columns, the
        // target index by -c4 (upd addresses the target as pFr + k m)
        this._upd(c4 * m * 8, this._pFi + c4 * m * 8, this._pW + 16 * c4, m, j - c4, j, nc - c4);
        this._upd(c4 * m * 8, this._pFi + c4 * m * 8, this._pW2 + 16 * c4, m, j + 1 - c4, j, nc - c4);
      }
    }
    for (; j < m; j++) this._update(j, j, m, nc, f);
  }
}
