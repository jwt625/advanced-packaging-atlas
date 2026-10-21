// Geometric nonlinearity gate (lane L8, wave 4): bimetal strip under a pure thermal moment with ~1 rad end rotation.
// Exact large-rotation behaviour of a pure-moment beam: the deformed axis is a circular arc of the linear (small
// strain) curvature; the sag is R (1 - cos theta), not kappa L^2 / 8. Synthetic CTE mismatch (test only).
// License: GPL-3.0-or-later.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { solveMech, explicitResolver, explicitRebase, probeU } from '../src/mech/index.mjs';
import { solveMechNonlinear } from '../src/mech/nonlinear.mjs';

const SYN = { a: { E_GPa: 100, nu: 0.3, cte_ppmK: 0 }, b: { E_GPa: 100, nu: 0.3, cte_ppmK: 67 } }; // synthetic

test('pure-moment bimetal strip: nonlinear arc keeps the linear curvature; sag follows R (1 - cos theta)', () => {
  const L = 20e-3, h = 0.05e-3;
  const parts = [
    { id: 'a', kind: 'die', material: 'a', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 0.5, z_um: 0, h_um: 50 },
    { id: 'b', kind: 'lid', material: 'b', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 0.5, z_um: 50, h_um: 50 },
  ];
  const grid = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 1, symmetry: 'quarter' });
  const base = { resolve: explicitResolver(SYN), rebase: explicitRebase(SYN), supports: 'symmetry', stress_free_C: { default: 125 }, temperature: { uniform_C: 25 } };
  const lin = solveMech(grid, { ...base, element: 'q2s', solver: 'direct', curvature: [{ z_m: h, region: { x: [-5e-3, 5e-3], y: [-1, 1] } }], stress: false });
  const kLin = lin.derived.curvature[0].w_xx_1_m;
  const nl = solveMechNonlinear(grid, { ...base, steps: 8 });
  // deformed interface line y = 0: points (X + ux, z + uz)
  const pt = (X) => {
    const NX = grid.nx + 1, NY = grid.ny + 1;
    const i = grid.xs.findIndex((x) => Math.abs(x - X) < 1e-12), k = grid.zs.findIndex((z) => Math.abs(z - h) < 1e-12);
    const n = nl.num.compact[i + NX * (0 + NY * k)];
    return [X + nl.u[3 * n], h + nl.u[3 * n + 2]];
  };
  const P0 = pt(0), P1 = pt(L / 4), P2 = pt(L / 2);
  // circle through the centre (on the symmetry axis, tangent horizontal) and the end point: R = (dx^2 + dz^2) / (2 dz)
  const dx = P2[0] - P0[0], dz = P2[1] - P0[1], R = (dx * dx + dz * dz) / (2 * dz);
  const R1 = ((P1[0] - P0[0]) ** 2 + (P1[1] - P0[1]) ** 2) / (2 * (P1[1] - P0[1]));
  const theta = L / 2 / Math.abs(R);
  assert.ok(theta > 0.8, `end rotation ${theta} rad`);
  assert.ok(Math.abs(1 / R / kLin - 1) < 2e-2, `nonlinear curvature ${1 / R} vs linear ${kLin}`);
  assert.ok(Math.abs(R1 / R - 1) < 1e-2, 'circular arc (same radius at L/4 and L/2)');
  const sagLin = probeU(lin, [L / 2, 0, h])[2] - probeU(lin, [0, 0, h])[2];
  assert.ok(Math.abs(dz / (R * (1 - Math.cos(theta))) - 1) < 2e-2, `nonlinear sag ${dz} vs R (1 - cos theta)`);
  assert.ok(Math.abs(sagLin / dz - 1) > 0.05, `linear sag ${sagLin} differs from the arc ${dz}`);
});
