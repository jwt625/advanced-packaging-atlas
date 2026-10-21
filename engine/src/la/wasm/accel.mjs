// WASM acceleration of a built multigrid hierarchy (gate G1; lane L1 wave 3). Relocates every level's operator, line
// factors and work vectors plus a pool of PCG vectors into one WebAssembly.Memory sized once (no growth, so the
// Float64Array views stay valid), compiles the per-level kernels (kernels.mjs) and marks the operators; applyStencil,
// applyBlock, the z-line sweeps and pcg dispatch to WASM when their arrays live in that memory. Everything else (RAP,
// transfers, coarse Cholesky) keeps running in JS on the same views. Returns false (JS path kept) when WebAssembly
// (with SIMD for the scalar kernels) is unavailable or the arena would exceed the wasm32 4 GiB limit.
// License: GPL-3.0-or-later.

import { levelKernels } from './kernels.mjs';
import { simdSupported } from './encoder.mjs';

const MAX_BYTES = 4 * 1024 ** 3 - 65536;

function arena(bytes) {
  const pages = Math.ceil(bytes / 65536) + 1;
  const memory = new WebAssembly.Memory({ initial: pages, maximum: pages });
  let at = 0;
  const alloc = (n) => {
    const v = new Float64Array(memory.buffer, at, n);
    at += 8 * n;
    return v;
  };
  return { memory, alloc };
}

/**
 * Relocate and accelerate a scalar hierarchy (mg.mjs buildMG). `pcgPool` padded vectors are reserved for pcg.
 * @returns {boolean} true when the WASM path is active
 */
export function accelerateMG(mg, { simd = true, pcgPool = 6 } = {}) {
  if (typeof WebAssembly !== 'object' || (simd && !simdSupported())) return false;
  const lv = mg.levels;
  let n8 = 0;
  for (const l of lv) {
    const { N, NX, NY } = l.op, P = NX * NY, PV = N + 2 * l.op.pad;
    n8 += 27 * N + 3 * PV + (l.direct ? 0 : 2 * N + N + P);
  }
  n8 += pcgPool * (lv[0].op.N + 2 * lv[0].op.pad);
  if (8 * n8 > MAX_BYTES) return false;
  const { memory, alloc } = arena(8 * n8);
  const move = (src, n = src.length) => {
    const v = alloc(n);
    v.set(src);
    return v;
  };
  for (const l of lv) {
    const op = l.op, P = op.NX * op.NY;
    op.A = move(op.A);
    l.r = move(l.r);
    if (l.b) l.b = move(l.b);
    if (l.x) l.x = move(l.x);
    if (!l.direct) {
      l.cp = move(l.cp);
      l.dinv = move(l.dinv);
      const T = alloc(op.N + P);
      l.t = T.subarray(P);
      op._wk = { memory, k: levelKernels(op.NX, op.NY, memory, { simd }) };
    } else op._wk = { memory, k: levelKernels(op.NX, op.NY, memory, { simd }) };
  }
  lv[0].op._wk.pool = Array.from({ length: pcgPool }, () => alloc(lv[0].op.N + 2 * lv[0].op.pad));
  mg.accel = { kind: simd ? 'wasm_simd' : 'wasm', bytes: 8 * n8 };
  return true;
}

/** Same for a block hierarchy (block.mjs buildBlockMG). */
export function accelerateBlockMG(mg, { pcgPool = 6 } = {}) {
  if (typeof WebAssembly !== 'object') return false;
  const lv = mg.levels;
  let n8 = 0;
  for (const l of lv) {
    const { N, NX, NY } = l.op, P = NX * NY, PV = 3 * (N + 2 * l.op.pad);
    n8 += 243 * N + 3 * PV + (l.direct ? 0 : 18 * N + 3 * (N + P));
  }
  n8 += pcgPool * 3 * (lv[0].op.N + 2 * lv[0].op.pad);
  if (8 * n8 > MAX_BYTES) return false;
  const { memory, alloc } = arena(8 * n8);
  const move = (src) => {
    const v = alloc(src.length);
    v.set(src);
    return v;
  };
  for (const l of lv) {
    const op = l.op, P = op.NX * op.NY;
    op.A = move(op.A);
    l.r = move(l.r);
    if (l.b) l.b = move(l.b);
    if (l.x) l.x = move(l.x);
    if (!l.direct) {
      l.Sinv = move(l.Sinv);
      l.C = move(l.C);
      const T = alloc(3 * (op.N + P));
      l.t = T.subarray(3 * P);
    }
    op._wk = { memory, k: levelKernels(op.NX, op.NY, memory, { block: true }) };
  }
  lv[0].op._wk.pool = Array.from({ length: pcgPool }, () => alloc(3 * (lv[0].op.N + 2 * lv[0].op.pad)));
  mg.accel = { kind: 'wasm', bytes: 8 * n8 };
  return true;
}

/** Whether all arrays live in the operator's WASM memory. */
export const inWasm = (op, ...arrs) => !!op._wk && arrs.every((a) => a.buffer === op._wk.memory.buffer);

/** Scalar four-colour z-line sweep through the WASM row kernels (same order as mg.mjs lineSweep). */
export function wasmLineSweep(lev, b, x, forward) {
  const { op } = lev;
  const { NX, NY, NZ, pad } = op;
  const { k: K } = op._wk;
  const P = NX * NY;
  const A0 = op.A.byteOffset, X0 = x.byteOffset, B0 = b.byteOffset + 8 * pad, T0 = lev.t.byteOffset, C0 = lev.cp.byteOffset, D0 = lev.dinv.byteOffset;
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc;
    const ci = color & 1, cj = color >> 1;
    const m = Math.floor((NX - 1 - ci) / 2) + 1;
    for (let k = 0; k < NZ; k++)
      for (let j = cj; j < NY; j += 2) {
        const n0 = ci + NX * (j + NY * k);
        K.elim(A0 + 216 * n0, X0 + 8 * n0, B0 + 8 * n0, T0 + 8 * n0, T0 + 8 * (n0 - P), D0 + 8 * n0, m);
      }
    for (let k = NZ - 1; k >= 0; k--)
      for (let j = cj; j < NY; j += 2) {
        const n0 = ci + NX * (j + NY * k);
        K.back(T0 + 8 * n0, C0 + 8 * n0, X0 + 8 * (pad + n0), m);
      }
  }
}

/** Block four-colour z-line sweep through the WASM row kernels (block.mjs blockLineSweep order). */
export function wasmBlockLineSweep(lev, b, x, forward) {
  const { op } = lev;
  const { NX, NY, NZ, pad } = op;
  const { k: K } = op._wk;
  const P = NX * NY;
  const A0 = op.A.byteOffset, X0 = x.byteOffset, B0 = b.byteOffset + 24 * pad, T0 = lev.t.byteOffset, S0 = lev.Sinv.byteOffset, C0 = lev.C.byteOffset;
  for (let cc = 0; cc < 4; cc++) {
    const color = forward ? cc : 3 - cc;
    const ci = color & 1, cj = color >> 1;
    const m = Math.floor((NX - 1 - ci) / 2) + 1;
    for (let k = 0; k < NZ; k++)
      for (let j = cj; j < NY; j += 2) {
        const n0 = ci + NX * (j + NY * k);
        K.belim(A0 + 1944 * n0, X0 + 24 * n0, B0 + 24 * n0, T0 + 24 * n0, T0 + 24 * (n0 - P), S0 + 72 * n0, m);
      }
    for (let k = NZ - 1; k >= 0; k--)
      for (let j = cj; j < NY; j += 2) {
        const n0 = ci + NX * (j + NY * k);
        K.bback(T0 + 24 * n0, C0 + 72 * n0, X0 + 24 * (pad + n0), m);
      }
  }
}
