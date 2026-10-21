// Half-stencil block MG (lane L1 wave 4, M10; storage of lane L8's low-memory mechanics path): the half apply equals
// the full block apply; PCG + half MG reaches the same answer as PCG + la/block.mjs (<= 1e-8); direction-selective
// coarsening on in-plane anisotropy. Q1 elasticity built in the test only (synthetic moduli).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlockStencil, addBlockElement, constrainBlock, paddedBlock, applyBlock, buildBlockMG, blockMGPrecond } from '../src/la/block.mjs';
import { buildHalfBlockMG, applyHalfStencil } from '../src/la/halfmg.mjs';
import { pcg } from '../src/la/pcg.mjs';

function elasticBox(hx, hy, hz, E, nu) {
  const lam = (E * nu) / ((1 + nu) * (1 - 2 * nu)), mu = E / (2 * (1 + nu));
  const D = [[lam + 2 * mu, lam, lam, 0, 0, 0], [lam, lam + 2 * mu, lam, 0, 0, 0], [lam, lam, lam + 2 * mu, 0, 0, 0], [0, 0, 0, mu, 0, 0], [0, 0, 0, 0, mu, 0], [0, 0, 0, 0, 0, mu]];
  const K = new Float64Array(576);
  const g = [0.5 - 0.5 / Math.sqrt(3), 0.5 + 0.5 / Math.sqrt(3)];
  for (const u of g) for (const v of g) for (const w of g) {
    const B = Array.from({ length: 6 }, () => new Float64Array(24));
    for (let a = 0; a < 8; a++) {
      const ia = a & 1, ja = (a >> 1) & 1, ka = a >> 2;
      const Nx = (ia ? 1 : -1) / hx * (ja ? v : 1 - v) * (ka ? w : 1 - w);
      const Ny = (ia ? u : 1 - u) * (ja ? 1 : -1) / hy * (ka ? w : 1 - w);
      const Nz = (ia ? u : 1 - u) * (ja ? v : 1 - v) * (ka ? 1 : -1) / hz;
      B[0][3 * a] = Nx; B[1][3 * a + 1] = Ny; B[2][3 * a + 2] = Nz;
      B[3][3 * a + 1] = Nz; B[3][3 * a + 2] = Ny;
      B[4][3 * a] = Nz; B[4][3 * a + 2] = Nx;
      B[5][3 * a] = Ny; B[5][3 * a + 1] = Nx;
    }
    const wt = (hx * hy * hz) / 8;
    for (let p = 0; p < 24; p++) for (let q = 0; q < 24; q++) {
      let s = 0;
      for (let i = 0; i < 6; i++) { if (B[i][p] === 0) continue; for (let j = 0; j < 6; j++) s += B[i][p] * D[i][j] * B[j][q]; }
      K[24 * p + q] += s * wt;
    }
  }
  return K;
}

function system(xs, ys, zs, layer) {
  const op = createBlockStencil(xs.length, ys.length, zs.length);
  const cache = new Map();
  for (let k = 0; k < zs.length - 1; k++) for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
    const key = `${xs[i + 1] - xs[i]}|${ys[j + 1] - ys[j]}|${zs[k + 1] - zs[k]}|${layer(k)}`;
    if (!cache.has(key)) cache.set(key, elasticBox(xs[i + 1] - xs[i], ys[j + 1] - ys[j], zs[k + 1] - zs[k], ...layer(k)));
    addBlockElement(op, i, j, k, cache.get(key));
  }
  const F = new Float64Array(3 * op.N), g = new Float64Array(3 * op.N).fill(NaN);
  for (let n = 0; n < op.N; n++) {
    F[3 * n + 2] = Math.sin(0.37 * n); F[3 * n] = 0.3 * Math.cos(0.11 * n);
    const i = n % op.NX, j = Math.floor(n / op.NX) % op.NY, k = Math.floor(n / (op.NX * op.NY));
    if (i === 0) g[3 * n] = 0; if (j === 0) g[3 * n + 1] = 0; if (k === 0 && i === 0 && j === 0) g[3 * n + 2] = 0;
  }
  constrainBlock(op, F, g);
  const b = paddedBlock(op);
  b.set(F, 3 * op.pad);
  // half copy (centre + 13 upper slots), the storage of L8 assembleHalfStencil
  const H = new Float64Array(126 * op.N);
  for (let n = 0; n < op.N; n++) for (let s = 13; s < 27; s++) for (let e = 0; e < 9; e++) H[(14 * n + s - 13) * 9 + e] = op.A[(27 * n + s) * 9 + e];
  const half = { NX: op.NX, NY: op.NY, NZ: op.NZ, N: op.N, H, fixed: op.fixed, off: op.off, pad: op.pad };
  return { op, half, b };
}
const layered = () => { const z = [0]; for (const [n, t] of [[3, 1e-3], [2, 50e-6], [3, 775e-6], [2, 2e-3]]) { const z0 = z[z.length - 1]; for (let q = 1; q <= n; q++) z.push(z0 + (q * t) / n); } return Float64Array.from(z); };
const layer = (k) => (k < 3 ? [25e9, 0.3] : k < 5 ? [8e9, 0.35] : k < 8 ? [130e9, 0.28] : [110e9, 0.34]);

for (const [name, xs] of [
  ['graded plate', Float64Array.from({ length: 21 }, (_, i) => 0.02 * (i / 20) ** 1.15)],
  ['in-plane anisotropy (5 um x cells)', (() => { const a = [0]; for (let x = 0, h = 5e-6; x < 0.01; ) { x += h; a.push(x); h = Math.min(h * 1.3, 1e-3); } return Float64Array.from(a); })()],
]) {
  test(`half-stencil MG: ${name}: half apply = full apply, PCG answers equal la/block.mjs to 1e-8`, (t) => {
    const ys = Float64Array.from({ length: 13 }, (_, j) => 0.016 * j / 12), zs = layered();
    const { op, half, b } = system(xs, ys, zs, layer);
    const x0 = paddedBlock(op);
    for (let d = 3 * op.pad; d < 3 * (op.pad + op.N); d++) x0[d] = Math.sin(d);
    const ya = applyBlock(op, x0, paddedBlock(op)), yb = applyHalfStencil(half, x0, paddedBlock(op));
    let e = 0, m = 0;
    for (let d = 0; d < ya.length; d++) { e = Math.max(e, Math.abs(ya[d] - yb[d])); m = Math.max(m, Math.abs(ya[d])); }
    assert.ok(e / m < 1e-13, `apply ${e / m}`);
    const full = buildBlockMG(op, xs, ys, zs, { coarseMax: 300 });
    const xf = paddedBlock(op);
    const rf = pcg(op, (r, z) => blockMGPrecond(full, r, z), b, xf, { rtol: 1e-11, maxIter: 1000 });
    const out = {};
    for (const coarsen of ['xy', 'auto']) {
      const mg = buildHalfBlockMG(half, xs, ys, zs, { coarseMax: 300, coarsen, f32: true });
      const opA = { ...half, bs: 3, A: null };
      // PCG through la/pcg.mjs needs a block apply: wrap the half apply
      const xh = paddedBlock(op);
      const res = pcgHalf(half, mg.precond, b, xh, 1e-11);
      void opA;
      let d = 0, mm = 0;
      for (let q = 0; q < xh.length; q++) { d = Math.max(d, Math.abs(xh[q] - xf[q])); mm = Math.max(mm, Math.abs(xf[q])); }
      out[coarsen] = { it: res.iterations, diff: d / mm, coarsened: mg.stats.coarsened.join(',') };
      assert.ok(d / mm < 1e-8, `${coarsen}: ${d / mm}`);
    }
    t.diagnostic(`la/block.mjs full: ${rf.iterations} it; half xy: ${out.xy.it} it; half auto: ${out.auto.it} it (${out.auto.coarsened})`);
    assert.ok(out.auto.it <= out.xy.it + 2);
  });
}

/** Plain PCG with the half apply (the solver L8 uses). */
function pcgHalf(op, precond, b, x, rtol) {
  const n = b.length, r = new Float64Array(n), z = new Float64Array(n), p = new Float64Array(n), q = new Float64Array(n);
  applyHalfStencil(op, x, q);
  for (let i = 0; i < n; i++) r[i] = b[i] - q[i];
  const dot = (u, v) => { let s = 0; for (let i = 0; i < n; i++) s += u[i] * v[i]; return s; };
  const r0 = Math.sqrt(dot(r, r));
  precond(r, z);
  p.set(z);
  let rz = dot(r, z), it = 0;
  for (it = 1; it <= 2000; it++) {
    applyHalfStencil(op, p, q);
    const alpha = rz / dot(p, q);
    for (let i = 0; i < n; i++) { x[i] += alpha * p[i]; r[i] -= alpha * q[i]; }
    if (Math.sqrt(dot(r, r)) <= rtol * r0) break;
    precond(r, z);
    const rn = dot(r, z);
    for (let i = 0; i < n; i++) p[i] = z[i] + (rn / rz) * p[i];
    rz = rn;
  }
  return { iterations: it };
}

test('wave 5 coarse spaces: rediscretised and local-Galerkin (modes off) coarse operators equal halfRAP on a uniform material', async () => {
  const { _internals, buildHalfEnrichedMG } = await import('../src/la/halfmg.mjs');
  const { coarsen1D } = await import('../src/la/mg.mjs');
  const xs = Float64Array.from([0, 1, 2.5, 3, 4.2, 5, 6.5].map((v) => v * 1e-3)), ys = Float64Array.from([0, 1, 2, 3.5, 4, 5].map((v) => v * 1e-3)), zs = Float64Array.from([0, 1e-4, 3e-4]);
  // unconstrained half stencil of a uniform Q1 elasticity operator
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1, nc = nx * ny * nz;
  const op = createBlockStencil(nx + 1, ny + 1, nz + 1);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) addBlockElement(op, i, j, k, elasticBox(xs[i + 1] - xs[i], ys[j + 1] - ys[j], zs[k + 1] - zs[k], 50e9, 0.3));
  const Hh = new Float64Array(126 * op.N);
  for (let n = 0; n < op.N; n++) for (let s2 = 13; s2 < 27; s2++) for (let e = 0; e < 9; e++) Hh[(14 * n + s2 - 13) * 9 + e] = op.A[(27 * n + s2) * 9 + e];
  const half = { NX: op.NX, NY: op.NY, NZ: op.NZ, N: op.N, H: Hh, fixed: new Uint8Array(3 * op.N), off: op.off, pad: op.pad };
  const mx = coarsen1D(xs), my = coarsen1D(ys);
  const G = _internals.halfRAP(half, mx, my);
  // rediscretised: uniform D, element kernel = the test element (D unused for a uniform material)
  const cD = _internals.coarsenCellD(new Float64Array(36 * nc).fill(1), new Uint8Array(nc).fill(1), xs, ys, zs, _internals.cellRanges(mx, nx), _internals.cellRanges(my, ny));
  const R = _internals.rediscretize({ xs: mx.xs, ys: my.xs, zs, D: cD.D, act: cD.act, fixed: new Uint8Array(3 * G.N) }, (hx, hy, hz) => ({ K: elasticBox(hx, hy, hz, 50e9, 0.3) }), new Map());
  const grid = { xs, ys, zs, cellPart: new Int32Array(nc) };
  const L = buildHalfEnrichedMG(half, grid, (c) => { const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny)); return elasticBox(xs[i + 1] - xs[i], ys[j + 1] - ys[j], zs[k + 1] - zs[k], 50e9, 0.3); }, { enrich: false, _returnCoarse: true, coarsen: 'xy' }).cop;
  let m = 0, dR = 0, dL = 0;
  for (let q = 0; q < G.A.length; q++) { m = Math.max(m, Math.abs(G.A[q])); dR = Math.max(dR, Math.abs(G.A[q] - R.A[q])); dL = Math.max(dL, Math.abs(G.A[q] - L.A[q])); }
  assert.ok(dR / m < 1e-12 && dL / m < 1e-12, `${dR / m} ${dL / m}`);
  void op;
});
