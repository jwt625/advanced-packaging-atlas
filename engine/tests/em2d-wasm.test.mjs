// WASM f64x2 complex front-update kernel (lane L7 wave 5): same solution as the JS blocked factor on a 3D-grid
// complex-symmetric matrix and on an em3d block (S to 1e-10); skipped when WebAssembly SIMD is unavailable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wasmLdltSupported, WasmComplexLDLT } from '../src/em2d/ldlt-wasm.mjs';
import { BlockedComplexLDLT } from '../src/em2d/ldlt-blocked.mjs';
import { buildElementPattern, analyze } from '../src/la/sparse.mjs';
import { buildLayeredMesh } from '../src/em3d/mesh.mjs';
import { prepare3d, solveAt } from '../src/em3d/solver.mjs';
import { makeMaterials } from '../src/em2d/dielectric.mjs';

test('WASM complex LDL^T front update = JS blocked factor', { skip: !wasmLdltSupported() && 'no WebAssembly SIMD' }, () => {
  const N = 16,
    n = N * N * N,
    el = [];
  const id = (i, j, k) => i + N * (j + N * k);
  for (let k = 0; k < N; k++)
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        if (i + 1 < N) el.push(id(i, j, k), id(i + 1, j, k));
        if (j + 1 < N) el.push(id(i, j, k), id(i, j + 1, k));
        if (k + 1 < N) el.push(id(i, j, k), id(i, j, k + 1));
      }
  const pat = buildElementPattern(n, Int32Array.from(el), 2);
  const re = new Float64Array(pat.nnz),
    im = new Float64Array(pat.nnz);
  for (let r = 0; r < n; r++)
    for (let p = pat.rowptr[r]; p < pat.rowptr[r + 1]; p++) {
      const c = pat.colidx[p];
      re[p] = c === r ? 6.2 : -1;
      im[p] = c === r ? 0.3 : 0.01 * ((r + c) % 7);
    }
  const sym = analyze(pat);
  const b = Float64Array.from({ length: n }, (_, i) => Math.sin(i));
  const xs = [BlockedComplexLDLT, WasmComplexLDLT].map((C) => {
    const fac = new C(sym);
    fac.factor(re, im);
    return fac.solve(b, new Float64Array(n));
  });
  let d = 0,
    mx = 0;
  for (let i = 0; i < n; i++) {
    d = Math.max(d, Math.hypot(xs[0].re[i] - xs[1].re[i], xs[0].im[i] - xs[1].im[i]));
    mx = Math.max(mx, Math.hypot(xs[0].re[i], xs[0].im[i]));
  }
  assert.ok(d / mx < 1e-12, `rel diff ${d / mx}`);
  // em3d block: rectangular guide TE10, factor 'wasm' vs 'blocked'
  const mesh = buildLayeredMesh({ box: { x: [0, 2000], y: [0, 1000], z: [0, 500] }, solids: [], mesh: { max_edge_um: 150, max_dz_um: 150, grade: 1 } });
  const S = ['blocked', 'wasm'].map((factor) => solveAt(prepare3d(mesh, { factor, materials: makeMaterials({}), background: 'air', solidProps: [], ports: [{ name: 'p1', side: 'xmin', mode: { type: 'te10' } }, { name: 'p2', side: 'xmax', mode: { type: 'te10' } }] }), 200e9).S);
  let e = 0;
  for (let k = 0; k < 4; k++) e = Math.max(e, Math.hypot(S[0].re[k] - S[1].re[k], S[0].im[k] - S[1].im[k]));
  assert.ok(e < 1e-10, `S diff ${e}`);
});
