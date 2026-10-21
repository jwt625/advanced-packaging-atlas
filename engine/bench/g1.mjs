#!/usr/bin/env node
// Gate G1 bench (DevLog-010 A9; lane L1 wave 3): end-to-end thermal study s1 of real cases and a block-MG elasticity
// solve, JS vs WASM (in-repo encoder kernels), median of N, JSONL to ../logs/g1-<YYYYMMDDTHHMM>.jsonl.
// Usage: nice -n 10 node bench/g1.mjs [--n 3] [--cases cowos_r/thermal_rjc,cowos_l/warpage_rt_ht] [--no-block]
// The elasticity operator is a plain Q1 isotropic element built here for the solver workload only (moduli are round
// synthetic numbers, not material data); production kernels belong to lane L8.
// License: GPL-3.0-or-later.

import { readFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { runCase, libraryAdapter, parseCase } from '../src/thermal/case.mjs';
import { createBlockStencil, addBlockElement, constrainBlock, paddedBlock, buildBlockMG, blockMGPrecond } from '../src/la/block.mjs';
import { accelerateBlockMG } from '../src/la/wasm/accel.mjs';
import { pcg } from '../src/la/pcg.mjs';
import { simdSupported } from '../src/la/wasm/encoder.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const get = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const N = Number(get('--n', 3));
const cases = get('--cases', 'cowos_r/thermal_rjc,cowos_l/warpage_rt_ht').split(',');
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const stamp = () => { const d = new Date(), p = (v) => String(v).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`; };
mkdirSync(join(HERE, '../../logs'), { recursive: true });
const file = join(HERE, `../../logs/g1-${stamp()}.jsonl`);
const load = (os) => (typeof os.loadavg === 'function' ? os.loadavg()[0] : null);
const os = await import('node:os');

const fam = await import('../src/families/index.mjs');
const mat = await import('../src/materials/node.mjs');
const data = JSON.parse(readFileSync(join(HERE, '../../app/static/data/package3d.json'), 'utf8'));
for (const cs of cases) {
  const c = parseCase(parseYaml(readFileSync(join(HERE, `../../sims/${cs}.yaml`), 'utf8')));
  const rec = { date: new Date().toISOString().slice(0, 10), case: cs, study: 's1', n: N, node: process.version, simd: simdSupported() };
  const out = {};
  for (const accel of ['js', 'wasm']) {
    const runs = [];
    let last;
    for (let r = 0; r < N; r++) {
      const ad = libraryAdapter(mat.loadLibrary(), c.materials?.map ?? {}, { overrides: c.materials?.overrides, applyOverrides: mat.applyOverrides });
      const t0 = performance.now();
      last = runCase(c, { generate: fam.generate, data, ...ad, overridesApplied: true, study: 's1', accel });
      runs.push({ total: performance.now() - t0, solve: last.results[0].timing.solve_ms, setup: last.results[0].timing.setup_ms });
    }
    out[accel] = { total_ms: median(runs.map((x) => x.total)), solve_ms: median(runs.map((x) => x.solve)), setup_ms: median(runs.map((x) => x.setup)), iterations: last.results[0].timing.iterations, accel: last.results[0].timing.mg?.accel ?? null, Tmax_C: last.results[0].derived.Tmax_C.value, load1: load(os) };
  }
  const r = { ...rec, ...Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v])), speedup_total: out.js.total_ms / out.wasm.total_ms, speedup_solve: out.js.solve_ms / out.wasm.solve_ms, dTmax: Math.abs(out.js.Tmax_C - out.wasm.Tmax_C) };
  appendFileSync(file, JSON.stringify(r) + '\n');
  console.log(cs, `JS total ${out.js.total_ms.toFixed(0)} ms (solve ${out.js.solve_ms.toFixed(0)}), WASM total ${out.wasm.total_ms.toFixed(0)} ms (solve ${out.wasm.solve_ms.toFixed(0)}); end-to-end ${r.speedup_total.toFixed(2)}x, solve ${r.speedup_solve.toFixed(2)}x; iterations ${out.js.iterations} / ${out.wasm.iterations}; |dTmax| ${r.dTmax.toExponential(1)} K; load ${out.js.load1?.toFixed(1)}`);
}

if (!args.includes('--no-block')) {
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
  const graded = (n, L, p) => Float64Array.from({ length: n + 1 }, (_, i) => L * (i / n) ** p);
  const z = [0];
  for (const [n, t] of [[6, 1e-3], [2, 50e-6], [6, 775e-6], [4, 2e-3]]) { const z0 = z[z.length - 1]; for (let q = 1; q <= n; q++) z.push(z0 + (q * t) / n); }
  const xs = graded(48, 0.04, 1.2), ys = graded(48, 0.04, 1.2), zs = Float64Array.from(z);
  const layer = (k) => (k < 6 ? [25e9, 0.3] : k < 8 ? [8e9, 0.35] : k < 14 ? [130e9, 0.28] : [110e9, 0.34]);
  const build = () => {
    const op = createBlockStencil(xs.length, ys.length, zs.length);
    const cache = new Map();
    for (let k = 0; k < zs.length - 1; k++) for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
      const key = `${xs[i + 1] - xs[i]}|${ys[j + 1] - ys[j]}|${zs[k + 1] - zs[k]}|${layer(k)}`;
      if (!cache.has(key)) cache.set(key, elasticBox(xs[i + 1] - xs[i], ys[j + 1] - ys[j], zs[k + 1] - zs[k], ...layer(k)));
      addBlockElement(op, i, j, k, cache.get(key));
    }
    const F = new Float64Array(3 * op.N), g = new Float64Array(3 * op.N).fill(NaN);
    for (let n = 0; n < op.N; n++) { F[3 * n + 2] = Math.sin(n); const i = n % op.NX, j = Math.floor(n / op.NX) % op.NY, k = Math.floor(n / (op.NX * op.NY)); if (i === 0) g[3 * n] = 0; if (j === 0) g[3 * n + 1] = 0; if (k === 0 && i === 0 && j === 0) g[3 * n + 2] = 0; }
    constrainBlock(op, F, g);
    const b = paddedBlock(op);
    b.set(F, 3 * op.pad);
    return { op, b };
  };
  const out = {};
  for (const accel of ['js', 'wasm']) {
    const t = [];
    let it = 0;
    for (let r = 0; r < N; r++) {
      const { op, b } = build();
      const t0 = performance.now();
      const mg = buildBlockMG(op, xs, ys, zs);
      if (accel === 'wasm') accelerateBlockMG(mg);
      const x = paddedBlock(op);
      it = pcg(op, (rr, zz) => blockMGPrecond(mg, rr, zz), b, x, { rtol: 1e-10, maxIter: 1000 }).iterations;
      t.push(performance.now() - t0);
    }
    out[accel] = { ms: median(t), iterations: it };
  }
  const r = { date: new Date().toISOString().slice(0, 10), case: 'block_elasticity_q1_49x49x19', dof: 3 * 49 * 49 * 19, n: N, js: out.js, wasm: out.wasm, speedup: out.js.ms / out.wasm.ms, load1: load(os) };
  appendFileSync(file, JSON.stringify(r) + '\n');
  console.log(r.case, `${r.dof} DOF: JS ${out.js.ms.toFixed(0)} ms (${out.js.iterations} it), WASM ${out.wasm.ms.toFixed(0)} ms (${out.wasm.iterations} it): ${r.speedup.toFixed(2)}x (MG setup + solve)`);
}
console.log('wrote', file);
