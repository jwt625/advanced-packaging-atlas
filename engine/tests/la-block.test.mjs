// Block (3 DOF / node) stencil, block z-line GMG and PCG (lane L1 wave 2; API for L8). The elasticity operator here is
// a plain Q1 isotropic element (2 x 2 x 2 Gauss) built only inside this test to exercise the solver; the production
// element kernels belong to L8 (src/mech/). Moduli are synthetic round numbers (solver workload, not material data).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBlockStencil, addBlockElement, constrainBlock, paddedBlock, applyBlock, BlockCholesky, buildBlockMG, blockMGPrecond, rigidBodyModes, blockAsymmetry, orthonormalize, projectOut } from '../src/la/block.mjs';
import { createStencil, padded, StencilCholesky } from '../src/la/stencil.mjs';
import { pcg } from '../src/la/pcg.mjs';
import { assembleConduction } from '../src/thermal/assemble.mjs';

const graded = (n, L, p) => Float64Array.from({ length: n + 1 }, (_, i) => L * (i / n) ** p);
/** Thin-layer z coordinates: three layers 1.0 / 0.05 / 0.775 mm (substrate, underfill, die-like). */
const layeredZ = (n1, n2, n3) => {
  const z = [0];
  for (const [n, t] of [[n1, 1e-3], [n2, 50e-6], [n3, 775e-6]]) { const z0 = z[z.length - 1]; for (let q = 1; q <= n; q++) z.push(z0 + (q * t) / n); }
  return Float64Array.from(z);
};

/** Q1 isotropic elasticity element on a box hx x hy x hz (24 x 24, node a = ia + 2 ja + 4 ka, DOF 3 a + r). */
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

function elasticOp(xs, ys, zs, layerOf) {
  const nx = xs.length - 1, ny = ys.length - 1, nz = zs.length - 1;
  const op = createBlockStencil(nx + 1, ny + 1, nz + 1);
  const cache = new Map();
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k];
    const [E, nu] = layerOf(k);
    const key = `${hx}|${hy}|${hz}|${E}|${nu}`;
    if (!cache.has(key)) cache.set(key, elasticBox(hx, hy, hz, E, nu));
    addBlockElement(op, i, j, k, cache.get(key));
  }
  return op;
}

let seed = 5;
const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296 - 0.5);
const relDiff = (a, b, lo, hi) => {
  let d = 0, m = 0;
  for (let i = lo; i < hi; i++) { d = Math.max(d, Math.abs(a[i] - b[i])); m = Math.max(m, Math.abs(b[i])); }
  return d / m;
};

test('vector Laplacian: block MG and block Cholesky equal three scalar solves with per-component Dirichlet faces', () => {
  const xs = graded(12, 0.02, 1.2), ys = graded(10, 0.015, 1), zs = layeredZ(4, 2, 4);
  const NX = xs.length, NY = ys.length, NZ = zs.length, N = NX * NY * NZ;
  const grid = { nx: NX - 1, ny: NY - 1, nz: NZ - 1, xs, ys, zs, cellPart: new Int32Array((NX - 1) * (NY - 1) * (NZ - 1)) };
  const kc = new Float64Array(3 * grid.cellPart.length);
  for (let c = 0; c < grid.cellPart.length; c++) { const k = Math.floor(c / ((NX - 1) * (NY - 1))); const v = k < 4 ? [30, 30, 0.6] : k < 6 ? [0.5, 0.5, 0.5] : [148, 148, 148]; kc.set(v, 3 * c); }
  const sop = createStencil(NX, NY, NZ);
  assembleConduction(grid, kc, sop);
  const bop = createBlockStencil(NX, NY, NZ);
  for (let n = 0; n < N; n++) for (let s = 0; s < 27; s++) for (let r = 0; r < 3; r++) bop.A[(27 * n + s) * 9 + 4 * r] = sop.A[27 * n + s];
  // component r fixed (value 0) on face: r = 0 bottom (k = 0), r = 1 top, r = 2 side x = 0
  const F = new Float64Array(3 * N), g = new Float64Array(3 * N).fill(NaN);
  for (let n = 0; n < N; n++) {
    const i = n % NX, k = Math.floor(n / (NX * NY));
    for (let r = 0; r < 3; r++) F[3 * n + r] = 1 + 0.3 * rnd();
    if (k === 0) g[3 * n] = 0;
    if (k === NZ - 1) g[3 * n + 1] = 0;
    if (i === 0) g[3 * n + 2] = 0;
  }
  constrainBlock(bop, F, g);
  assert.ok(blockAsymmetry(bop) < 1e-14);
  const b = paddedBlock(bop);
  b.set(F, 3 * bop.pad);
  const xd = BlockCholesky.prototype.solvePadded.call(new BlockCholesky(bop), b, paddedBlock(bop));
  const mg = buildBlockMG(bop, xs, ys, zs, { coarseMax: 200 });
  assert.ok(mg.stats.levels >= 3);
  const xm = paddedBlock(bop);
  const res = pcg(bop, (r, z) => blockMGPrecond(mg, r, z), b, xm, { rtol: 1e-12 });
  assert.ok(res.converged);
  const lo = 3 * bop.pad, hi = 3 * (bop.pad + N);
  assert.ok(relDiff(xm, xd, lo, hi) < 1e-9);
  // scalar reference per component
  for (let r = 0; r < 3; r++) {
    const op = createStencil(NX, NY, NZ);
    op.A.set(sop.A);
    const f = new Float64Array(N);
    for (let n = 0; n < N; n++) f[n] = F[3 * n + r];
    for (let n = 0; n < N; n++) if (!Number.isNaN(g[3 * n + r])) { op.fixed[n] = 1; }
    // eliminate (values 0): zero rows and columns
    for (let n = 0; n < N; n++) if (op.fixed[n]) {
      for (let s = 0; s < 27; s++) { op.A[27 * n + s] = 0; const m = n + op.off[s]; if (m >= 0 && m < N) op.A[27 * m + 26 - s] = 0; }
      op.A[27 * n + 13] = 1;
    }
    for (let n = 0; n < N; n++) if (op.fixed[n]) op.A[27 * n + 13] = 1;
    const bb = padded(op);
    bb.set(f, op.pad);
    const xsol = new StencilCholesky(op).solvePadded(bb, padded(op));
    let d = 0, m = 0;
    for (let n = 0; n < N; n++) { d = Math.max(d, Math.abs(xsol[op.pad + n] - xd[3 * (bop.pad + n) + r])); m = Math.max(m, Math.abs(xsol[op.pad + n])); }
    assert.ok(d / m < 1e-10, `component ${r}: ${d / m}`);
  }
});

const layers = (k) => (k < 4 ? [25e9, 0.3] : k < 6 ? [8e9, 0.35] : [130e9, 0.28]);

test('elasticity, clamped base, thin compliant layer: PCG + block GMG equals the block Cholesky to 1e-8', (t) => {
  const xs = graded(24, 0.025, 1.15), ys = graded(20, 0.02, 1), zs = layeredZ(4, 2, 4);
  const op = elasticOp(xs, ys, zs, layers);
  assert.ok(blockAsymmetry(op) < 1e-12);
  const N = op.N, F = new Float64Array(3 * N), g = new Float64Array(3 * N).fill(NaN);
  for (let n = 0; n < N; n++) {
    const k = Math.floor(n / (op.NX * op.NY));
    for (let r = 0; r < 3; r++) F[3 * n + r] = rnd();
    if (k === 0) g[3 * n] = g[3 * n + 1] = g[3 * n + 2] = 0;
  }
  constrainBlock(op, F, g);
  const b = paddedBlock(op);
  b.set(F, 3 * op.pad);
  const ch = new BlockCholesky(op);
  const xd = ch.solvePadded(b, paddedBlock(op));
  const mg = buildBlockMG(op, xs, ys, zs, { coarseMax: 500 });
  const xm = paddedBlock(op);
  const res = pcg(op, (r, z) => blockMGPrecond(mg, r, z), b, xm, { rtol: 1e-12, maxIter: 300 });
  const e = relDiff(xm, xd, 3 * op.pad, 3 * (op.pad + N));
  t.diagnostic(`DOF ${3 * N}, MG levels ${mg.stats.levels}, PCG iterations ${res.iterations}, max rel diff ${e.toExponential(2)}, nnzL direct ${ch.timing.nnzL}`);
  assert.ok(res.converged && e < 1e-8);
  // residual of the direct solution
  const y = applyBlock(op, xd, paddedBlock(op));
  let rr = 0, bb = 0;
  for (let i = 3 * op.pad; i < 3 * (op.pad + N); i++) { rr += (y[i] - b[i]) ** 2; bb += b[i] ** 2; }
  assert.ok(Math.sqrt(rr / bb) < 1e-10);
});

test('elasticity with DOF-level symmetry constraints (u_x = 0 on x = 0, u_y = 0 on y = 0, u_z = 0 at one bottom node)', (t) => {
  const xs = graded(16, 0.02, 1.1), ys = graded(14, 0.016, 1.1), zs = layeredZ(3, 2, 3);
  const op = elasticOp(xs, ys, zs, (k) => (k < 3 ? [25e9, 0.3] : k < 5 ? [8e9, 0.35] : [130e9, 0.28]));
  const N = op.N, F = new Float64Array(3 * N), g = new Float64Array(3 * N).fill(NaN);
  for (let n = 0; n < N; n++) {
    const i = n % op.NX, j = Math.floor(n / op.NX) % op.NY, k = Math.floor(n / (op.NX * op.NY));
    F[3 * n + 2] = k === op.NZ - 1 ? -1 : 0; // pressure-like top load, balanced by the z point and symmetry? (z point carries it)
    if (i === 0) g[3 * n] = 0;
    if (j === 0) g[3 * n + 1] = 0;
    if (i === 0 && j === 0 && k === 0) g[3 * n + 2] = 0;
  }
  // self-equilibrated in z: add the opposite load on the bottom face
  for (let n = 0; n < N; n++) if (Math.floor(n / (op.NX * op.NY)) === 0) F[3 * n + 2] += 1;
  constrainBlock(op, F, g);
  const b = paddedBlock(op);
  b.set(F, 3 * op.pad);
  const xd = new BlockCholesky(op).solvePadded(b, paddedBlock(op));
  const mg = buildBlockMG(op, xs, ys, zs, { coarseMax: 300 });
  const xm = paddedBlock(op);
  const res = pcg(op, (r, z) => blockMGPrecond(mg, r, z), b, xm, { rtol: 1e-12, maxIter: 400 });
  const e = relDiff(xm, xd, 3 * op.pad, 3 * (op.pad + N));
  t.diagnostic(`PCG iterations ${res.iterations}, max rel diff ${e.toExponential(2)}`);
  assert.ok(res.converged && e < 1e-8);
});

test('floating body: rigid-body modes span the null space; nullspace-aware coarsest level and PCG solve a self-equilibrated load', (t) => {
  const xs = graded(14, 0.02, 1.1), ys = graded(12, 0.016, 1), zs = layeredZ(3, 2, 3);
  const op = elasticOp(xs, ys, zs, (k) => (k < 3 ? [25e9, 0.3] : k < 5 ? [8e9, 0.35] : [130e9, 0.28]));
  const N = op.N;
  const Z = rigidBodyModes(op, xs, ys, zs);
  let amax = 0;
  for (const v of op.A) amax = Math.max(amax, Math.abs(v));
  for (const z of Z) {
    const y = applyBlock(op, z, paddedBlock(op));
    let m = 0, zm = 0;
    for (let i = 0; i < y.length; i++) { m = Math.max(m, Math.abs(y[i])); zm = Math.max(zm, Math.abs(z[i])); }
    assert.ok(m / (amax * zm) < 1e-12, `mode residual ${m / (amax * zm)}`);
  }
  // self-equilibrated load: random, projected out of the mode space
  const b = paddedBlock(op);
  for (let d = 0; d < 3 * N; d++) b[3 * op.pad + d] = rnd();
  projectOut(orthonormalize(Z), b);
  assert.throws(() => new BlockCholesky(op), /not positive definite/);
  const xd = new BlockCholesky(op, { nullspace: Z }).solvePadded(b, paddedBlock(op));
  const y = applyBlock(op, xd, paddedBlock(op));
  let rr = 0, bb = 0;
  for (let i = 0; i < y.length; i++) { rr += (y[i] - b[i]) ** 2; bb += b[i] ** 2; }
  assert.ok(Math.sqrt(rr / bb) < 1e-9, `${Math.sqrt(rr / bb)}`);
  const mg = buildBlockMG(op, xs, ys, zs, { coarseMax: 300, floating: true });
  const xm = paddedBlock(op);
  // the projected singular system reaches a round-off floor near 1e-12 (measured 1.3e-12 after 30 iterations)
  const res = pcg(op, (r, z) => blockMGPrecond(mg, r, z), b, xm, { rtol: 1e-11, maxIter: 400, nullspace: Z });
  const e = relDiff(xm, xd, 3 * op.pad, 3 * (op.pad + N));
  t.diagnostic(`floating: PCG iterations ${res.iterations}, inconsistency ${res.inconsistency.toExponential(1)}, max rel diff vs pinned direct ${e.toExponential(2)}`);
  assert.ok(res.converged && e < 1e-8);
});

test('block MG: in-plane cell anisotropy (5 um x cells vs 1 mm y cells) is handled by direction-selective semi-coarsening (audit A1 S1)', (t) => {
  const xs0 = [0];
  for (let x = 0, h = 5e-6; x < 0.01; ) { x += h; xs0.push(x); h = Math.min(h * 1.3, 1e-3); }
  const xs = Float64Array.from(xs0), ys = graded(8, 0.008, 1), zs = layeredZ(3, 2, 3);
  const op = elasticOp(xs, ys, zs, (k) => (k < 3 ? [25e9, 0.3] : k < 5 ? [8e9, 0.35] : [130e9, 0.28]));
  const N = op.N, F = new Float64Array(3 * N), g = new Float64Array(3 * N).fill(NaN);
  for (let n = 0; n < N; n++) {
    F[3 * n + 2] = Math.sin(0.37 * n);
    if (Math.floor(n / (op.NX * op.NY)) === 0) g[3 * n] = g[3 * n + 1] = g[3 * n + 2] = 0;
  }
  constrainBlock(op, F, g);
  const b = paddedBlock(op);
  b.set(F, 3 * op.pad);
  const it = {};
  for (const coarsen of ['xy', 'auto']) {
    const mg = buildBlockMG(op, xs, ys, zs, { coarseMax: 300, coarsen });
    it[coarsen] = pcg(op, (r, z) => blockMGPrecond(mg, r, z), b, paddedBlock(op), { rtol: 1e-10, maxIter: 2000 }).iterations;
  }
  t.diagnostic(`iterations: full x-y coarsening ${it.xy}, auto ${it.auto}`);
  assert.ok(it.auto < 80 && it.auto * 3 < it.xy);
});
