// Scalar GMG robustness (lane L1 wave 2, audit A1 S1): 40 Cu strips 5 um wide on a polymer layer with a 2 mm
// in-plane target size (in-plane cell aspect ~280-400). Before direction-selective semi-coarsening: 640 PCG iterations
// (direct 0.2 s); now semi-coarsening along x only. Conductivities synthetic (0.3 / 390 W/m K), not material data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermal } from '../src/thermal/index.mjs';

test('Cu strips (in-plane aspect ~280): PCG + GMG converges in < 30 iterations and matches the direct solve', (t) => {
  const parts = [{ id: 'base', kind: 'layer', material: 'pol', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 0, h_um: 500 }];
  for (let s = 0; s < 40; s++) parts.push({ id: `cu_${s}`, kind: 'trace', material: 'cu', x_mm: -4 + s * 0.2, y_mm: 0, w_mm: 0.005, d_mm: 9, z_um: 500, h_um: 10 });
  parts.push({ id: 'top', kind: 'layer', material: 'pol', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 500, h_um: 10, priority: -1 });
  const K = { pol: [0.3, 0.3, 0.3], cu: [390, 390, 390] };
  const g = buildGrid(parts, { max_xy_mm: 2, grading: 1.3, min_cells_per_layer: 2 });
  const th = { sources: [{ parts: 'cu_*', power_W: 5 }], bcs: [{ selection: 'bottom:base', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }] };
  const res = (k) => ({ k_W_mK: K[k] });
  const d = solveThermal(g, th, res, { solver: 'direct' });
  const m = solveThermal(g, th, res, { solver: 'pcg_mg', rtol: 1e-12 });
  let e = 0;
  for (let n = 0; n < d.fields.T_K.length; n++) if (!Number.isNaN(d.fields.T_K[n])) e = Math.max(e, Math.abs(d.fields.T_K[n] - m.fields.T_K[n]));
  t.diagnostic(`grid ${g.nx} x ${g.ny} x ${g.nz}; MG levels ${m.timing.mg.levels} (${m.timing.mg.coarsened.join(',')}), ${m.timing.iterations} iterations, max |dT| ${e.toExponential(2)} K`);
  assert.ok(m.timing.iterations < 30);
  assert.ok(m.timing.mg.coarsened[0] === 'x');
  assert.ok(e < 1e-8);
});
