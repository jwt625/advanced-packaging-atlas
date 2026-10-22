// Geometric nonlinearity gate (lane L8, wave 4): bimetal strip under a pure thermal moment with ~1 rad end rotation.
// Exact large-rotation behaviour of a pure-moment beam: the deformed axis is a circular arc of the linear (small
// strain) curvature; the sag is R (1 - cos theta), not kappa L^2 / 8. Synthetic CTE mismatch (test only).
// License: GPL-3.0-or-later.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

// ---- plate bifurcation gate (lane L20) -------------------------------------------------------------------------------
// Thin bilayer square plate (synthetic: 20 x 20 mm, 50 um alpha 0 + 50 um alpha 10 ppm/K, E 100 GPa, nu 0.3), cooled in
// -5 K load steps; reference: scikit-fem total-Lagrangian SVK on the same q2s mesh (validation/reference/
// scripts/ref_plate_nl.py -> results/PLATE-NL-skfem.json: symmetric path with the lowest tangent eigenvalues, the
// switched (stable) branch, the 1 % CTE-anisotropy imperfect path). Probes: bottom-face u_z at the edge midpoints and
// the corner relative to the centre (um).
const REF = JSON.parse(readFileSync(new URL('../../validation/reference/results/PLATE-NL-skfem.json', import.meta.url), 'utf8'));
const plateRun = (aniso, opts) => {
  const M = { a: { E_GPa: 100, nu: 0.3, cte_ppmK: 0 }, b: { E_GPa: 100, nu: 0.3, cte_ppmK: [10 * (1 + aniso), 10, 10] } }; // synthetic
  const parts = [
    { id: 'a', kind: 'die', material: 'a', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 0, h_um: 50 },
    { id: 'b', kind: 'lid', material: 'b', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 50, h_um: 50 },
  ];
  const grid = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 1, symmetry: 'quarter' });
  const NX = grid.nx + 1, at = (v, X) => v.findIndex((x) => Math.abs(x - X) < 1e-12), rows = [];
  const r = solveMechNonlinear(grid, {
    resolve: explicitResolver(M), rebase: explicitRebase(M), supports: 'symmetry', stress_free_C: { default: 25 }, temperature: { uniform_C: -15 }, steps: 8, ...opts,
    onStep: ({ T_C, u, num }) => {
      const n = (X, Y) => num.compact[at(grid.xs, X) + NX * at(grid.ys, Y)], z = (q) => 1e6 * (u[3 * q + 2] - u[3 * n(0, 0) + 2]);
      rows.push({ dT: T_C - 25, sx: z(n(10e-3, 0)), sy: z(n(0, 10e-3)), co: z(n(10e-3, 10e-3)) });
    },
  });
  return { r, rows };
};
const near = (a, b, tol, what) => assert.ok(Math.abs(a / b - 1) < tol, `${what}: engine ${a} vs reference ${b}`);
const refRow = (path, dT) => REF[path].rows.find((q) => Math.abs(q.dT - dT) < 1e-9);

test('plate bifurcation: perfect square plate leaves the unstable symmetric branch (branch stable, default) as the skfem reference', () => {
  assert.ok(REF.bifurcation_dT_K < -30 && REF.bifurcation_dT_K > -35, `reference bifurcation at ${REF.bifurcation_dT_K} K`);
  const { r, rows } = plateRun(0, {});
  for (const e of rows) {
    const q = refRow('perfect_switch', e.dT), a = [e.sx, e.sy].sort((x, y) => x - y), b = [q.sag_x_um, q.sag_y_um].sort((x, y) => x - y);
    near(a[0], b[0], 1e-6, `smaller edge sag at ${e.dT} K`); near(a[1], b[1], 1e-6, `larger edge sag at ${e.dT} K`); near(e.co, q.corner_um, 1e-6, `corner at ${e.dT} K`);
  }
  // symmetric up to -30 K, cylindrical from -35 K (edge sags 88.55 / 213.10 um vs 144.54 on the symmetric branch)
  assert.ok(Math.abs(rows[5].sx - rows[5].sy) < 1e-6 && Math.abs(rows[6].sx - rows[6].sy) > 100);
  assert.equal(r.bifurcation.length, 1);
  const b = r.bifurcation[0];
  assert.equal(b.step, 7); assert.equal(b.negative_pivots, 1); assert.equal(b.switched, true);
  near(b.attempts[0].rayleigh, refRow('perfect_symmetric', -35).eig_low[0], 1e-3, 'critical-mode Rayleigh quotient vs the reference lowest eigenvalue');
  assert.ok(r.newton.every((h) => h.stable === true));
  assert.match(r.warnings[0], /bifurcation passed before load step 7.*switched to the stable branch/);
});

test('plate bifurcation: branch follow stays on the symmetric path and flags the unstable steps (inertia = reference eigenvalue sign)', () => {
  const { r, rows } = plateRun(0, { branch: 'follow' });
  for (const e of rows) {
    const q = refRow('perfect_symmetric', e.dT);
    near(e.sx, q.sag_x_um, 1e-6, `sag_x at ${e.dT} K`); near(e.sy, q.sag_y_um, 1e-6, `sag_y at ${e.dT} K`); near(e.co, q.corner_um, 1e-6, `corner at ${e.dT} K`);
    assert.equal(r.newton.find((h) => Math.abs(h.T_C - 25 - e.dT) < 1e-9).negative_pivots, q.eig_low[0] < 0 ? 1 : 0, `inertia at ${e.dT} K`);
  }
  assert.equal(r.warnings.length, 2);
  assert.match(r.warnings[0], /unstable equilibrium at load step 7/);
});

test('plate bifurcation: 1 % CTE imperfection follows the natural branch of the reference (no switch needed)', () => {
  const { r, rows } = plateRun(0.01, {});
  for (const e of rows) {
    const q = refRow('imperfect', e.dT);
    near(e.sx, q.sag_x_um, 1e-6, `sag_x at ${e.dT} K`); near(e.sy, q.sag_y_um, 1e-6, `sag_y at ${e.dT} K`); near(e.co, q.corner_um, 1e-6, `corner at ${e.dT} K`);
  }
  assert.equal(r.bifurcation.length, 0);
  assert.ok(r.newton.every((h) => h.stable === true));
  // discretization at this mesh (reference q2s n = 20 and q2 n = 10 vs q2s n = 10, all load steps): max 0.31 % (sag_y at -60 K)
  for (const path of ['imperfect_q2s_n20', 'imperfect_q2_n10'])
    for (const q of REF[path].rows) { const p = refRow('imperfect', q.dT); for (const k of ['sag_x_um', 'sag_y_um', 'corner_um']) near(q[k], p[k], 5e-3, `${path} ${k} at ${q.dT} K`); }
});

test('Newton options: secant predictor halves the iterations on the bimetal strip with the same solution; default unchanged', () => {
  const parts = [
    { id: 'a', kind: 'die', material: 'a', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 0.5, z_um: 0, h_um: 50 },
    { id: 'b', kind: 'lid', material: 'b', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 0.5, z_um: 50, h_um: 50 },
  ];
  const grid = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 1, symmetry: 'quarter' });
  const base = { resolve: explicitResolver(SYN), rebase: explicitRebase(SYN), supports: 'symmetry', stress_free_C: { default: 125 }, temperature: { uniform_C: 25 }, steps: 8 };
  const a = solveMechNonlinear(grid, base), b = solveMechNonlinear(grid, { ...base, predictor: 'secant' });
  const its = (r) => r.newton.reduce((s, h) => s + h.newton, 0);
  // measured 2026-10-21 (L20 notes): 75 (10 per step after the first, oscillating) vs 40 (5 per step)
  assert.ok(its(b) <= 0.6 * its(a), `iterations ${its(b)} vs ${its(a)}`);
  let dmax = 0, umax = 0;
  for (let i = 0; i < a.u.length; i++) { dmax = Math.max(dmax, Math.abs(a.u[i] - b.u[i])); umax = Math.max(umax, Math.abs(a.u[i])); }
  assert.ok(dmax < 1e-7 * umax, `max |du| ${dmax} vs max |u| ${umax}`);
  assert.ok(a.newton.every((h) => h.stable === true && h.lam.every((t) => t === 1)));
});

test('q2s p-MG on thin-plate operators: column smoother converges where 3 x 3 blocks stall; nonlinear PCG path = direct', async () => {
  const { buildNumbering } = await import('../src/mech/numbering.mjs');
  const { createMechMaterials } = await import('../src/mech/materials.mjs');
  const { buildConstraints } = await import('../src/mech/supports.mjs');
  const { operatorProvider, assembleSystem } = await import('../src/mech/assemble.mjs');
  const { buildQ2sPMG } = await import('../src/mech/gmg.mjs');
  const { pcg, csrApply, solveDirect } = await import('../src/mech/solve.mjs');
  const M = { a: { E_GPa: 100, nu: 0.3, cte_ppmK: 0 }, b: { E_GPa: 100, nu: 0.3, cte_ppmK: [10.1, 10, 10] } }; // synthetic
  const parts = [
    { id: 'a', kind: 'die', material: 'a', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 0, h_um: 50 },
    { id: 'b', kind: 'lid', material: 'b', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 50, h_um: 50 },
  ];
  // cell aspect (in-plane size / layer thickness) 20: measured 472 iterations (point blocks) vs 48 (columns)
  const grid = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 1, symmetry: 'quarter' });
  const mats = createMechMaterials(grid, { resolve: explicitResolver(M), rebase: explicitRebase(M), stressFreeC: { default: 25 } });
  const num = buildNumbering(grid, 'q2s'), cons = buildConstraints(grid, num, { supports: 'symmetry' });
  const sys = assembleSystem(grid, num, mats, { uniform_K: 273.15 - 35 }, cons, operatorProvider(grid, 'q2s', mats));
  const xd = solveDirect(sys, num, grid, { ordering: 'nd_xy' }).x;
  const run = (o) => pcg(csrApply(sys), buildQ2sPMG(grid, num, sys, o).precond, sys.rhs, null, { rtol: 1e-10, maxIter: 3000 });
  const blockR = run({}), colR = run({ smoother: 'column' });
  assert.ok(colR.converged && colR.iterations < 100, `column: ${colR.iterations}`);
  assert.ok(blockR.iterations > 4 * colR.iterations, `block ${blockR.iterations} vs column ${colR.iterations}`);
  const err = (x) => x.reduce((m, v, i) => Math.max(m, Math.abs(v - xd[i])), 0) / xd.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(err(colR.x) < 1e-6, `column vs direct ${err(colR.x)}`); // rtol 1e-10 on the residual; thin-plate conditioning (measured 1.6e-7)
  // nonlinear: forced PCG tangent solves give the direct Newton path (2 load steps to -10 K, before the bifurcation)
  const base = { resolve: explicitResolver(M), rebase: explicitRebase(M), supports: 'symmetry', stress_free_C: { default: 25 }, temperature: { uniform_C: 15 }, steps: 2 };
  const d = solveMechNonlinear(grid, { ...base, linear: 'direct' }), p = solveMechNonlinear(grid, { ...base, linear: 'pcg' });
  assert.deepEqual(p.newton.map((h) => h.newton), d.newton.map((h) => h.newton));
  const um = d.u.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(d.u.every((v, i) => Math.abs(v - p.u[i]) < 1e-8 * um));
  assert.ok(p.stats.pcg_iterations > 0 && p.warnings.some((w) => /stability not checked/.test(w)));
});
