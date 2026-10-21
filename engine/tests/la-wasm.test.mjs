// Gate G1 (lane L1 wave 3): WASM kernels (in-repo encoder, no toolchain) give the same PCG iterations and the same
// answers (<= 1e-12 relative) as the JS path, scalar thermal and 3 x 3 block; JS fallback when unavailable.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermal } from '../src/thermal/index.mjs';
import { simdSupported, buildModule, Fn, F64, uleb, sleb } from '../src/la/wasm/encoder.mjs';
import { createStencil, padded } from '../src/la/stencil.mjs';
import { createBlockStencil, constrainBlock, paddedBlock, buildBlockMG, blockMGPrecond } from '../src/la/block.mjs';
import { accelerateBlockMG } from '../src/la/wasm/accel.mjs';
import { pcg } from '../src/la/pcg.mjs';
import { assembleConduction } from '../src/thermal/assemble.mjs';

test('encoder: LEB128 and a valid module', () => {
  assert.deepEqual(uleb(624485), [0xe5, 0x8e, 0x26]);
  assert.deepEqual(sleb(-123456), [0xc0, 0xbb, 0x78]);
  const f = new Fn('two', [], [F64]);
  f.f64const(2);
  const inst = new WebAssembly.Instance(new WebAssembly.Module(buildModule([f])), { env: { memory: new WebAssembly.Memory({ initial: 1 }) } });
  assert.equal(inst.exports.two(), 2);
});

const parts = [
  { id: 'substrate', kind: 'substrate', material: 'sub', x_mm: 0, y_mm: 0, w_mm: 40, d_mm: 30, z_um: 0, h_um: 1200 },
  { id: 'die', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm: 16, d_mm: 12, z_um: 1200, h_um: 775 },
  { id: 'lid', kind: 'lid', material: 'cu', x_mm: 0, y_mm: 0, w_mm: 30, d_mm: 24, z_um: 1975, h_um: 1500 },
];
const K = { sub: [30, 30, 0.6], si: [148, 148, 148], cu: [390, 390, 390] };

test('scalar thermal: accel wasm equals js (iterations, temperatures)', { skip: !simdSupported() && 'no WebAssembly SIMD' }, () => {
  const g = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 2, max_z_mm: 0.3 });
  const th = { sources: [{ parts: 'die', power_W: 100 }], bcs: [{ selection: 'top:lid', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }] };
  const res = (k) => ({ k_W_mK: K[k] });
  const a = solveThermal(g, th, res, { solver: 'pcg_mg', rtol: 1e-12, coarseMax: 500 });
  const b = solveThermal(g, th, res, { solver: 'pcg_mg', rtol: 1e-12, coarseMax: 500, accel: 'wasm' });
  assert.equal(b.timing.mg.accel, 'wasm_simd');
  assert.ok(Math.abs(a.timing.iterations - b.timing.iterations) <= 1);
  let e = 0;
  for (let n = 0; n < a.fields.T_K.length; n++) if (!Number.isNaN(a.fields.T_K[n])) e = Math.max(e, Math.abs(a.fields.T_K[n] - b.fields.T_K[n]) / a.fields.T_K[n]);
  assert.ok(e < 1e-12, `${e}`);
});

test('block (3 DOF) MG: accel wasm equals js on a coupled vector operator', () => {
  const xs = Float64Array.from({ length: 13 }, (_, i) => 0.012 * (i / 12) ** 1.2), ys = Float64Array.from({ length: 11 }, (_, j) => 0.01 * j / 10);
  const zs = Float64Array.from([0, 2e-4, 4e-4, 4.5e-4, 5e-4, 7e-4, 9e-4]);
  const NX = 13, NY = 11, NZ = 7, N = NX * NY * NZ;
  const grid = { nx: 12, ny: 10, nz: 6, xs, ys, zs, cellPart: new Int32Array(12 * 10 * 6) };
  const kc = new Float64Array(3 * 720);
  for (let c = 0; c < 720; c++) kc.set(Math.floor(c / 120) === 2 ? [0.5, 0.5, 0.5] : [50, 50, 20], 3 * c);
  const sop = createStencil(NX, NY, NZ);
  assembleConduction(grid, kc, sop);
  const build = () => {
    const op = createBlockStencil(NX, NY, NZ);
    // block = scalar stencil x [[2, 0.5, 0], [0.5, 2, 0.5], [0, 0.5, 2]] (SPD coupling of the components)
    const B = [2, 0.5, 0, 0.5, 2, 0.5, 0, 0.5, 2];
    for (let n = 0; n < N; n++) for (let s = 0; s < 27; s++) for (let e = 0; e < 9; e++) op.A[(27 * n + s) * 9 + e] = sop.A[27 * n + s] * B[e];
    const F = new Float64Array(3 * N), g = new Float64Array(3 * N).fill(NaN);
    for (let n = 0; n < N; n++) { F[3 * n] = Math.sin(n); F[3 * n + 2] = Math.cos(0.3 * n); if (Math.floor(n / (NX * NY)) === 0) g[3 * n] = g[3 * n + 1] = g[3 * n + 2] = 0; }
    constrainBlock(op, F, g);
    const b = paddedBlock(op);
    b.set(F, 3 * op.pad);
    return { op, b };
  };
  const out = [];
  for (const acc of [false, true]) {
    const { op, b } = build();
    const mg = buildBlockMG(op, xs, ys, zs, { coarseMax: 200 });
    if (acc) assert.ok(accelerateBlockMG(mg));
    const x = paddedBlock(op);
    const r = pcg(op, (rr, zz) => blockMGPrecond(mg, rr, zz), b, x, { rtol: 1e-12 });
    out.push({ x, it: r.iterations });
  }
  assert.ok(Math.abs(out[0].it - out[1].it) <= 1, `${out[0].it} vs ${out[1].it}`);
  let e = 0, m = 0;
  for (let i = 0; i < out[0].x.length; i++) { e = Math.max(e, Math.abs(out[0].x[i] - out[1].x[i])); m = Math.max(m, Math.abs(out[0].x[i])); }
  assert.ok(e / m < 1e-12, `${e / m}`);
});
