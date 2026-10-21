#!/usr/bin/env node
// Thermal solver bench (DevLog-012 lane L1; R2 S8 gates G0): fixed synthetic package grids of about 1e4, 1e5 and
// 3e5 tensor nodes; direct (ported supernodal Cholesky, grid ND and AMD orderings) vs PCG + z-line GMG; median of N
// runs; one JSONL record per (grid, solver) to ../logs/bench-<YYYYMMDDTHHMM>.jsonl.
// Usage: nice -n 10 node bench/bench.mjs [--n 3] [--grids S,M,L] [--solvers direct_nd,direct_amd,pcg_mg] [--label x]
// Conductivities are synthetic round numbers (bench workload only, not material data).
// License: GPL-3.0-or-later.

import { mkdirSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermal } from '../src/thermal/index.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const K = { sub: [30, 30, 0.6], si: [148, 148, 148], uf: [0.5, 0.5, 0.5], mold: [0.8, 0.8, 0.8], tim: [5, 5, 5], cu: [390, 390, 390], ubump: [2, 2, 20] };
const resolve = (key) => ({ k_W_mK: K[key] });

/** Fixed synthetic 2.5D package: substrate, interposer, SoC + 4 HBM, micro-bump and underfill layers, TIM, lid. */
export function benchParts() {
  const P = (id, kind, material, x, y, w, d, z, h, extra = {}) => ({ id, kind, material, x_mm: x, y_mm: y, w_mm: w, d_mm: d, z_um: z, h_um: h, ...extra });
  return [
    P('substrate', 'substrate', 'sub', 0, 0, 55, 55, 0, 1600),
    P('c4uf', 'underfill', 'uf', 0, 0, 34, 28, 1600, 80),
    P('interposer', 'interposer', 'si', 0, 0, 32, 26, 1680, 100),
    P('ubump', 'microbump', 'ubump', 0, 0, 30, 24, 1780, 30),
    P('soc', 'die', 'si', 0, 0, 14, 20, 1810, 775),
    P('hbm_1', 'hbm', 'si', -11.5, -6, 8, 11, 1810, 775),
    P('hbm_2', 'hbm', 'si', 11.5, -6, 8, 11, 1810, 775),
    P('hbm_3', 'hbm', 'si', -11.5, 6, 8, 11, 1810, 775),
    P('hbm_4', 'hbm', 'si', 11.5, 6, 8, 11, 1810, 775),
    P('mold', 'mold', 'mold', 0, 0, 32, 26, 1810, 775, { priority: -1 }),
    P('tim', 'tim', 'tim', 0, 0, 32, 26, 2585, 50),
    P('lid', 'lid', 'cu', 0, 0, 50, 50, 2635, 2000),
  ];
}
export const benchThermal = {
  sources: [{ parts: 'soc', power_W: 500 }, { parts: 'hbm_*', power_W: 120 }],
  bcs: [{ selection: 'top:lid', type: 'htc', h_W_m2K: 3e4, T_inf_C: 30 }, { selection: 'bottom:substrate', type: 'htc', h_W_m2K: 500, T_inf_C: 30 }],
};
/** Mesh settings giving about 1e4 (S), 1e5 (M) and 3e5 (L) tensor nodes on the full model. */
export const GRIDS = {
  S: { max_xy_mm: 4, min_cells_per_layer: 1, grading: 1.6, max_z_mm: 1.0 },
  M: { max_xy_mm: 1.0, min_cells_per_layer: 2, grading: 1.3, max_z_mm: 0.4 },
  L: { max_xy_mm: 0.6, min_cells_per_layer: 2, grading: 1.25, max_z_mm: 0.25 },
};
const SOLVERS = {
  direct_nd: { solver: 'direct', ordering: 'nd' },
  direct_amd: { solver: 'direct', ordering: 'amd' },
  pcg_mg: { solver: 'pcg_mg', rtol: 1e-10 },
};

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
const stamp = () => {
  const d = new Date();
  const p = (v) => String(v).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}`;
};

async function main() {
  const args = process.argv.slice(2);
  const get = (k, dflt) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : dflt;
  };
  const N = Number(get('--n', 3));
  const grids = get('--grids', 'S,M,L').split(',');
  const solvers = get('--solvers', 'direct_nd,direct_amd,pcg_mg').split(',');
  const maxDirect = Number(get('--max-direct-nodes', 1.5e5));
  const label = get('--label', '');
  const logDir = join(HERE, '../../logs');
  mkdirSync(logDir, { recursive: true });
  const file = join(logDir, `bench-${stamp()}.jsonl`);
  for (const gname of grids) {
    const g = buildGrid(benchParts(), { ...GRIDS[gname], max_nodes: 2e6 });
    for (const sname of solvers) {
      const rec = { date: new Date().toISOString().slice(0, 10), label, grid: gname, mesh: GRIDS[gname], nodes: g.stats.nodes, activeNodes: g.stats.activeNodes, nx: g.nx, ny: g.ny, nz: g.nz, maxAspect: g.stats.maxAspect, solver: sname, n: N, node: process.version };
      if (sname.startsWith('direct') && g.stats.nodes > maxDirect) {
        appendFileSync(file, JSON.stringify({ ...rec, skipped: `direct above ${maxDirect} nodes (time / memory budget)` }) + '\n');
        console.log(gname, sname, 'skipped');
        continue;
      }
      const runs = [];
      let last = null;
      for (let r = 0; r < N; r++) {
        globalThis.gc?.();
        const t0 = performance.now();
        last = solveThermal(g, benchThermal, resolve, SOLVERS[sname]);
        runs.push({ total_ms: performance.now() - t0, ...last.timing, rss_MB: process.memoryUsage().rss / 2 ** 20 });
      }
      const med = (k) => median(runs.map((x) => x[k]));
      const out = {
        ...rec,
        total_ms: med('total_ms'), assemble_ms: med('assemble_ms'), setup_ms: med('setup_ms'), solve_ms: med('solve_ms'),
        iterations: last.timing.iterations, nnzL: last.timing.nnzL, mg: last.timing.mg, relres: last.timing.relres,
        rss_MB: med('rss_MB'), maxRSS_MB: process.resourceUsage().maxRSS / 1024, heapUsed_MB: process.memoryUsage().heapUsed / 2 ** 20,
        Tmax_C: last.derived.Tmax_C, balance_rel: last.derived.balance_rel,
        runs_total_ms: runs.map((x) => Math.round(x.total_ms)),
      };
      appendFileSync(file, JSON.stringify(out) + '\n');
      console.log(gname, sname, `nodes ${out.nodes}`, `total ${out.total_ms.toFixed(0)} ms (setup ${out.setup_ms.toFixed(0)}, solve ${out.solve_ms.toFixed(0)})`, `it ${out.iterations}`, `nnzL ${out.nnzL}`, `RSS ${out.rss_MB.toFixed(0)} MB`, `Tmax ${out.Tmax_C.value.toFixed(3)} C`);
    }
  }
  console.log('wrote', file);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
