// L5 engine cross-check runner: solve an exported deck with the JS engine (engine/src/grid, engine/src/thermal) and
// write a SPEC section 5 result JSON. Usage: node run_engine.mjs <deck.json> <out.json>
// The deck carries the reference grid's planes, so the engine grid equals the reference grid (checked by the caller).
import { readFileSync, writeFileSync } from 'node:fs';
import { buildGrid } from '../../../engine/src/grid/index.mjs';
import { solveThermal } from '../../../engine/src/thermal/index.mjs';

const [deckPath, outPath] = process.argv.slice(2);
const deck = JSON.parse(readFileSync(deckPath, 'utf8'));
const resolve = (key) => {
  const k = deck.k_W_mK[key];
  if (k == null) throw new Error(`deck: no k for ${key}`);
  return { k_W_mK: Array.isArray(k) ? k : [k, k, k] };
};
const t0 = performance.now();
const grid = buildGrid(deck.parts, { max_xy_mm: 1e6, max_z_mm: null, min_cells_per_layer: 1, grading: 1e9,
  max_nodes: deck.max_nodes ?? 2e6, symmetry: deck.symmetry, planes: deck.planes, snap_xy_um: 1e-3, snap_z_um: 1e-4 });
const res = solveThermal(grid, deck.thermal, resolve, { solver: deck.solver ?? 'direct', rtol: 1e-13 });
const out = {
  study: 's1', type: 'thermal_stationary',
  grid: { xs: Array.from(grid.xs), ys: Array.from(grid.ys), zs: Array.from(grid.zs), nx: grid.nx, ny: grid.ny, nz: grid.nz },
  fields: { T_K: Array.from(res.fields.T_K, (v) => (Number.isFinite(v) ? v : null)) },
  derived: res.derived, timing: { ...res.timing, wall_ms: performance.now() - t0 }, warnings: [...(grid.warnings ?? []), ...(res.warnings ?? [])],
};
writeFileSync(outPath, JSON.stringify(out));
