// Lane L27 (DevLog-013, 2026-10-21): audit A7 minors on the nonlinear path (M5 named error on the PCG path past a
// bifurcation, M6 perturbed pivots recorded, M7 Newton count over all branch-switch attempts and `switched` on every
// checked step, M8 inverse-iteration residual). Synthetic plate as in mech-nl.test.mjs. License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { explicitResolver, explicitRebase } from '../src/mech/index.mjs';
import { solveMechNonlinear } from '../src/mech/nonlinear.mjs';

const M = { a: { E_GPa: 100, nu: 0.3, cte_ppmK: 0 }, b: { E_GPa: 100, nu: 0.3, cte_ppmK: 10 } }; // synthetic
const parts = [
  { id: 'a', kind: 'die', material: 'a', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 0, h_um: 50 },
  { id: 'b', kind: 'lid', material: 'b', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 50, h_um: 50 },
];
const grid = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 1, symmetry: 'quarter' });
const base = { resolve: explicitResolver(M), rebase: explicitRebase(M), supports: 'symmetry', stress_free_C: { default: 25 }, temperature: { uniform_C: -15 }, steps: 8 };

test('A7 M6-M8: switched and perturbed_pivots on every checked step; Newton count sums all attempts; mode residual recorded', () => {
  const iters = [];
  const r = solveMechNonlinear(grid, { ...base, onIter: (e) => iters.push(e) });
  for (const h of r.newton) {
    assert.equal(typeof h.switched, 'boolean', `step ${h.step}`);
    assert.equal(typeof h.perturbed_pivots, 'number', `step ${h.step}`);
  }
  assert.deepEqual(r.newton.filter((h) => h.switched).map((h) => h.step), [7]);
  const b = r.bifurcation[0];
  assert.ok(b.attempts.length >= 1);
  for (const a of b.attempts) {
    assert.ok(Number.isFinite(a.mode_residual) && a.mode_residual < 1e-3, `mode residual ${a.mode_residual}`);
    assert.equal(a.mode_iterations, 40);
  }
  // step 7: iterations of the first (symmetric) Newton + every energy-descent attempt (onIter counts linear solves;
  // a converged Newton call's count `it` equals its number of solves)
  const s7 = r.newton.find((h) => h.step === 7);
  assert.equal(s7.newton, iters.filter((e) => e.step === 7).length);
});

test('A7 M5: the PCG tangent path past the bifurcation ends in the named "use linear direct" error', () => {
  assert.throws(() => solveMechNonlinear(grid, { ...base, linear: 'pcg' }), /use linear 'direct'/);
  // a tangent whose column blocks are not positive definite (all entries negated through the diagnostics hook): the
  // column Cholesky in the preconditioner build fails first; it now ends in the same named error (before: raw throw)
  const neg = ({ val }) => { for (let i = 0; i < val.length; i++) val[i] = -val[i]; };
  assert.throws(() => solveMechNonlinear(grid, { ...base, steps: 1, linear: 'pcg', onTangent: neg }), /column block not positive definite.*use linear 'direct'/);
});
