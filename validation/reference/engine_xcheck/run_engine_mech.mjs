// L5 engine cross-check runner (mechanics): solve an exported deck with engine/src/mech on the reference grid planes.
// Usage: node run_engine_mech.mjs <deck.json> <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { buildGrid } from '../../../engine/src/grid/index.mjs';
import { solveThermal } from '../../../engine/src/thermal/index.mjs';
import { solveMech, explicitResolver, explicitRebase, probeStress } from '../../../engine/src/mech/index.mjs';

const [deckPath, outPath] = process.argv.slice(2);
const d = JSON.parse(readFileSync(deckPath, 'utf8'));
const t0 = performance.now();
const grid = buildGrid(d.parts, { max_xy_mm: 1e6, max_z_mm: null, min_cells_per_layer: 1, grading: 1e9, max_nodes: 2e6,
  symmetry: d.symmetry, planes: d.planes, snap_xy_um: 1e-3, snap_z_um: 1e-4 });
let temperature = d.temperature;
if (d.thermal) {
  const kres = (key) => ({ k_W_mK: [d.k_W_mK[key], d.k_W_mK[key], d.k_W_mK[key]] });
  const th = solveThermal(grid, d.thermal, kres, { solver: 'direct', rtol: 1e-13 });
  temperature = { T_K: th.fields.T_K };
}
const res = solveMech(grid, { element: d.element, resolve: explicitResolver(d.set), rebase: explicitRebase(d.set),
  supports: d.supports, bcs: d.bcs ?? [], stress_free_C: d.stress_free_C, temperature, solver: d.solver ?? 'auto', rtol: 1e-12,
  curvature: d.curvature ?? [], warpage: d.warpage ?? [] });
const probes = (d.probes ?? []).map((p) => ({ ...p, sigma_Pa: probeStress(res, p.part, p.xyz_m) }));
writeFileSync(outPath, JSON.stringify({
  grid: { xs: Array.from(grid.xs), ys: Array.from(grid.ys), zs: Array.from(grid.zs) },
  fields: { u_m: Array.from(res.fields.u_m), node_active: Array.from(res.fields.node_active) },
  derived: { curvature: res.derived.curvature, warpage: res.derived.warpage, reactions: res.derived.reactions },
  probes, dof: res.timing?.dof ?? res.stats?.dof ?? null, timing: { wall_ms: performance.now() - t0, ...(res.timing ?? {}) },
}));
