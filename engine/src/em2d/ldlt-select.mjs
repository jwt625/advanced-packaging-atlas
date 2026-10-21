// Factorization selector for the em2d / em3d complex LDL^T (lane L7 wave 5): 'base' (la/ldlt.mjs
// ComplexSupernodalLDLT), 'blocked' (JS, 4-column front update), 'wasm' (WebAssembly f64x2 front update, falls back to
// 'blocked' when SIMD is unavailable; factorFallbackWarning names that fallback, lane L13 / audit A3 M9).
// Default: DEFAULT_FACTOR. License: GPL-3.0-or-later.

import { ComplexSupernodalLDLT } from '../la/ldlt.mjs';
import { BlockedComplexLDLT } from './ldlt-blocked.mjs';
import { WasmComplexLDLT, wasmLdltSupported } from './ldlt-wasm.mjs';

export let DEFAULT_FACTOR = 'blocked';
export const setDefaultFactor = (k) => (DEFAULT_FACTOR = k);

export function makeFactor(kind, sym) {
  const k = kind ?? DEFAULT_FACTOR;
  if (k === 'base') return new ComplexSupernodalLDLT(sym);
  if (k === 'wasm' && wasmLdltSupported()) return new WasmComplexLDLT(sym);
  if (k !== 'blocked' && k !== 'wasm') throw new Error(`em2d: unknown factor ${k} (base | blocked | wasm)`);
  return new BlockedComplexLDLT(sym);
}

/** Warning text when the requested factor is not the one makeFactor uses (wasm without SIMD), else null. */
export function factorFallbackWarning(kind) {
  const k = kind ?? DEFAULT_FACTOR;
  return k === 'wasm' && !wasmLdltSupported() ? "factor 'wasm' requested but WebAssembly SIMD is unavailable: using the blocked JS factor (same results, slower)" : null;
}
