// WebAssembly kernels of the structured-grid solvers (gate G1; lane L1 wave 3). One module per (NX, NY) grid level, so
// the 27 node offsets of the stencil are load immediates (the x pointer is shifted by the most negative offset).
// Kernels (all pointers are byte addresses in the module's memory, f64 data, 8-byte aligned):
//   apply(pA, px, py, n)                 y[n] = sum_s A[27 n + s] x[n + off_s]           (scalar stencil, 27 point)
//   elim(pa, px, pb, pt, ptm, pd, m)     z-line forward elimination of one colour row (every 2nd node, m nodes)
//   back(pt, pcp, pxn, m)                z-line back substitution of one colour row
//   bapply / belim / bback               the same for 3 x 3 blocks (3 DOF per node, interleaved vectors)
// `simd` variants use f64x2 over the (di = -1, 0) slot pair of each stencil row (contiguous in A and in x).
// Summation order differs from the JS loops, so results agree to round-off, not bitwise.
// License: GPL-3.0-or-later.

import { Fn, buildModule, I32, F64 } from './encoder.mjs';
import { stencilOffsets } from '../stencil.mjs';

const LINE = new Set([4, 13, 22]);

/** Scalar or f64x2 sum of A[a + s] * x[base + off_s] over slot list `slots` onto the f64 stack. */
function stencilSum(f, aLoc, xLoc, slots, offs, omin, simd, aStride = 8, xScale = 8) {
  let first = true;
  const addTo = () => { if (!first) f.fadd(); first = false; };
  if (!simd) {
    for (const s of slots) {
      f.get(aLoc).fload(aStride * s).get(xLoc).fload(xScale * (offs[s] - omin)).fmul();
      addTo();
    }
    return;
  }
  // pairs (3m, 3m + 1) when both are in `slots`; the rest scalar
  const set = new Set(slots);
  const pairs = [], singles = [];
  for (let m = 0; m < 9; m++) {
    const s0 = 3 * m, s1 = s0 + 1, s2 = s0 + 2;
    if (set.has(s0) && set.has(s1)) pairs.push(s0);
    else { if (set.has(s0)) singles.push(s0); if (set.has(s1)) singles.push(s1); }
    if (set.has(s2)) singles.push(s2);
  }
  for (const s of singles) {
    f.get(aLoc).fload(aStride * s).get(xLoc).fload(xScale * (offs[s] - omin)).fmul();
    addTo();
  }
  if (pairs.length) {
    pairs.forEach((s, q) => {
      f.get(aLoc).vload(aStride * s).get(xLoc).vload(xScale * (offs[s] - omin)).vmul();
      if (q) f.vadd();
    });
    const v = f.local(0x7b);
    f.set(v);
    f.get(v).vextract(0);
    addTo();
    f.get(v).vextract(1);
    f.fadd();
  }
}

/** Loop skeleton: while (m-- > 0) { body(); pointers += steps }. */
function counted(f, mLoc, body, steps) {
  f.block().loop();
  f.get(mLoc).op(0x45).brIf(1); // i32.eqz -> exit
  body();
  for (const [loc, d] of steps) f.get(loc).i32(d).add().set(loc);
  f.get(mLoc).i32(1).sub().set(mLoc);
  f.br(0).end().end();
}

function scalarKernels(NX, NY, simd) {
  const off = stencilOffsets(NX, NY);
  const omin = Math.min(...off);
  const P = NX * NY;
  const all = [...Array(27).keys()];
  const offLine = all.filter((s) => !LINE.has(s));
  // apply
  const ap = new Fn('apply', [I32, I32, I32, I32]);
  {
    const [pA, px, py, n] = [0, 1, 2, 3];
    counted(ap, n, () => {
      ap.get(py);
      stencilSum(ap, pA, px, all, off, omin, simd);
      ap.fstore(0);
    }, [[pA, 216], [px, 8], [py, 8]]);
  }
  // elimination of one colour row: T[n] = (b[n] - sum_offline A x - A[4] T[n - P]) dinv[n]
  const el = new Fn('elim', [I32, I32, I32, I32, I32, I32, I32]);
  {
    const [pa, px, pb, pt, ptm, pd, m] = [0, 1, 2, 3, 4, 5, 6];
    counted(el, m, () => {
      el.get(pt);
      el.get(pb).fload(0);
      stencilSum(el, pa, px, offLine, off, omin, simd);
      el.fsub();
      el.get(pa).fload(8 * 4).get(ptm).fload(0).fmul().fsub();
      el.get(pd).fload(0).fmul();
      el.fstore(0);
    }, [[pa, 432], [px, 16], [pb, 16], [pt, 16], [ptm, 16], [pd, 16]]);
  }
  // back substitution of one colour row: x[n] = T[n] - cp[n] x[n + P]
  const bk = new Fn('back', [I32, I32, I32, I32]);
  {
    const [pt, pcp, pxn, m] = [0, 1, 2, 3];
    counted(bk, m, () => {
      bk.get(pxn).get(pt).fload(0).get(pcp).fload(0).get(pxn).fload(8 * P).fmul().fsub().fstore(0);
    }, [[pt, 16], [pcp, 16], [pxn, 16]]);
  }
  return [ap, el, bk];
}

/** Block row sums: r_r -= sum_s sum_c A[s][r][c] x[off_s][c] for slots, into locals r0..r2 (scalar). */
function blockSums(f, aLoc, xLoc, slots, offs, omin, r) {
  for (const s of slots) {
    for (let rr = 0; rr < 3; rr++) {
      f.get(r[rr]);
      for (let c = 0; c < 3; c++) {
        f.get(aLoc).fload(8 * (9 * s + 3 * rr + c)).get(xLoc).fload(24 * (offs[s] - omin) + 8 * c).fmul();
        if (c) f.fadd();
      }
      f.fsub().set(r[rr]);
    }
  }
}

function blockKernels(NX, NY) {
  const off = stencilOffsets(NX, NY);
  const omin = Math.min(...off);
  const P = NX * NY;
  const all = [...Array(27).keys()];
  const offLine = all.filter((s) => !LINE.has(s));
  // bapply: y = A x (accumulated as -(-...) through the r locals: r = 0 - sum, y = -r)
  const ap = new Fn('bapply', [I32, I32, I32, I32]);
  {
    const [pA, px, py, n] = [0, 1, 2, 3];
    const r = [ap.local(F64), ap.local(F64), ap.local(F64)];
    counted(ap, n, () => {
      for (const q of r) ap.f64const(0).set(q);
      blockSums(ap, pA, px, all, off, omin, r);
      for (let q = 0; q < 3; q++) ap.get(py).f64const(0).get(r[q]).fsub().fstore(8 * q);
    }, [[pA, 243 * 8], [px, 24], [py, 24]]);
  }
  // belim: r = b - sum_offline A x - L T[n - P]; T = Sinv r
  const el = new Fn('belim', [I32, I32, I32, I32, I32, I32, I32]);
  {
    const [pa, px, pb, pt, ptm, ps, m] = [0, 1, 2, 3, 4, 5, 6];
    const r = [el.local(F64), el.local(F64), el.local(F64)];
    counted(el, m, () => {
      for (let q = 0; q < 3; q++) el.get(pb).fload(8 * q).set(r[q]);
      blockSums(el, pa, px, offLine, off, omin, r);
      // L block (slot 4) times T[n - P]
      for (let rr = 0; rr < 3; rr++) {
        el.get(r[rr]);
        for (let c = 0; c < 3; c++) {
          el.get(pa).fload(8 * (9 * 4 + 3 * rr + c)).get(ptm).fload(8 * c).fmul();
          if (c) el.fadd();
        }
        el.fsub().set(r[rr]);
      }
      for (let rr = 0; rr < 3; rr++) {
        el.get(pt);
        for (let c = 0; c < 3; c++) {
          el.get(ps).fload(8 * (3 * rr + c)).get(r[c]).fmul();
          if (c) el.fadd();
        }
        el.fstore(8 * rr);
      }
    }, [[pa, 2 * 243 * 8], [px, 48], [pb, 48], [pt, 48], [ptm, 48], [ps, 144]]);
  }
  // bback: x[n] = T[n] - C[n] x[n + P]
  const bk = new Fn('bback', [I32, I32, I32, I32]);
  {
    const [pt, pc, pxn, m] = [0, 1, 2, 3];
    counted(bk, m, () => {
      for (let rr = 0; rr < 3; rr++) {
        bk.get(pxn).get(pt).fload(8 * rr);
        for (let c = 0; c < 3; c++) {
          bk.get(pc).fload(8 * (3 * rr + c)).get(pxn).fload(24 * P + 8 * c).fmul();
          if (c) bk.fadd();
        }
        bk.fsub().fstore(8 * rr);
      }
    }, [[pt, 48], [pc, 144], [pxn, 48]]);
  }
  return [ap, el, bk];
}

/**
 * Compile the kernels of one grid level against `memory`.
 * @param {number} NX
 * @param {number} NY
 * @param {WebAssembly.Memory} memory
 * @param {{simd?: boolean, block?: boolean}} [opt]
 */
export function levelKernels(NX, NY, memory, { simd = true, block = false } = {}) {
  const fns = block ? blockKernels(NX, NY) : scalarKernels(NX, NY, simd);
  const mod = new WebAssembly.Module(buildModule(fns));
  const inst = new WebAssembly.Instance(mod, { env: { memory } });
  const off = stencilOffsets(NX, NY);
  return { ...inst.exports, omin: Math.min(...off), P: NX * NY };
}
