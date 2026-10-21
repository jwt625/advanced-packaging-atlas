// E8 skeleton gates (lane L8): linear viscoelastic Prony + WLF time stepping.
// Material parameters below are SYNTHETIC (test only): no sourced Prony / WLF set exists in the cached corpus
// (DevLog/lanes/L8-mech.md, wave 3); they are not EMC data and must not be used as such.
// License: GPL-3.0-or-later.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { explicitResolver, explicitRebase } from '../src/mech/index.mjs';
import { solveViscoelastic, relaxation, shiftFactor } from '../src/mech/viscoelastic.mjs';

const SYN = { ve: { E_GPa: 20, nu: 0.3, cte_ppmK: 10 } }; // synthetic
const VE = {
  ve: {
    prony: [{ g: 0.3, tau_s: 1 }, { g: 0.25, tau_s: 30 }, { g: 0.2, tau_s: 1000 }], // synthetic, g_inf = 0.25
    shift: { type: 'wlf', Tref_C: 100, C1: 17.44, C2_K: 51.6 }, // synthetic (the universal WLF constants as numbers)
  },
};
const R = explicitResolver(SYN), RB = explicitRebase(SYN);
const block = [{ id: 'b', kind: 'die', material: 've', x_mm: 0, y_mm: 0, w_mm: 1, d_mm: 1, z_um: 0, h_um: 1000 }];

test('constant-strain relaxation (uniaxial strain, isothermal at Tref) equals the Prony sum', () => {
  const grid = buildGrid(block, { max_xy_mm: 0.5, min_cells_per_layer: 2 });
  const e0 = 1e-3;
  const lam = (20e9 * 0.3) / (1.3 * 0.4), mu = 20e9 / 2.6, M0 = lam + 2 * mu;
  const times = [0, 0, 0.3, 1, 3, 10, 30, 100, 300, 1000, 3000];
  const history = times.map((t) => ({ t_s: t, T_C: 100, substeps: 3 }));
  for (const element of ['q1im', 'q1']) {
    const r = solveViscoelastic(grid, {
      element, resolve: R, rebase: RB, viscoelastic: VE, stress_free_C: { default: 100 }, supports: 'none', history,
      bcs: [{ selection: 'default', type: 'roller' }, { selection: 'xmax:b', type: 'displacement', value_m: [e0 * 1e-3, null, null] }],
    });
    // r.steps[0] is the instantaneous jump (t = 0, dt = 0)
    for (const st of r.steps) {
      const sx = st.sigma_mean_Pa.b[0], ex = M0 * e0 * relaxation(VE.ve, st.t_s);
      assert.ok(Math.abs(sx / ex - 1) < 1e-10, `${element} t ${st.t_s}: ${sx} vs ${ex}`);
    }
  }
});

test('thermorheologically simple cooling ramp (biaxially constrained layer, WLF) equals the hereditary integral', () => {
  const grid = buildGrid(block, { max_xy_mm: 0.5, min_cells_per_layer: 1 });
  const E0 = 20e9, nu = 0.3, a = 10e-6, T0 = 150, T1 = 60, tEnd = 900; // 0.1 K/s
  const T = (t) => T0 + ((T1 - T0) * t) / tEnd;
  // reference: sigma(t) = -E0 / (1 - nu) a int_0^t g(xi(t) - xi(s)) dT/ds ds, xi by fine trapezoid of 1 / a_T
  const nRef = 200000, dts = tEnd / nRef, xi = new Float64Array(nRef + 1);
  for (let k = 1; k <= nRef; k++) xi[k] = xi[k - 1] + 0.5 * dts * (1 / shiftFactor(VE.ve.shift, T((k - 1) * dts) + 273.15) + 1 / shiftFactor(VE.ve.shift, T(k * dts) + 273.15));
  const ref = (tk) => {
    const K = Math.round(tk / dts);
    let s = 0;
    for (let k = 0; k < K; k++) s += 0.5 * dts * (relaxation(VE.ve, xi[K] - xi[k]) + relaxation(VE.ve, xi[K] - xi[k + 1]));
    return -(E0 / (1 - nu)) * a * ((T1 - T0) / tEnd) * s;
  };
  const bcs = [
    { selection: 'xmin:b', type: 'roller' }, { selection: 'xmax:b', type: 'roller' },
    { selection: 'ymin:b', type: 'roller' }, { selection: 'ymax:b', type: 'roller' }, { selection: 'bottom:b', type: 'roller' },
  ];
  const errs = [];
  for (const nsub of [48, 192]) {
    const history = [{ t_s: 0, T_C: T0 }, { t_s: 300, T_C: T(300), substeps: nsub / 3 }, { t_s: 600, T_C: T(600), substeps: nsub / 3 }, { t_s: 900, T_C: T1, substeps: nsub / 3 }];
    const r = solveViscoelastic(grid, { element: 'q1im', resolve: R, rebase: RB, viscoelastic: VE, stress_free_C: { default: T0 }, supports: 'none', history, bcs });
    let e = 0;
    for (const st of r.steps) e = Math.max(e, Math.abs(st.sigma_mean_Pa.b[0] / ref(st.t_s) - 1));
    // sigma_zz free
    assert.ok(Math.abs(r.steps[r.steps.length - 1].sigma_mean_Pa.b[2]) < 1e-6 * Math.abs(r.steps[r.steps.length - 1].sigma_mean_Pa.b[0]));
    errs.push(e);
  }
  assert.ok(errs[1] < 2e-3, `ramp error ${errs}`);
  assert.ok(errs[1] < errs[0] / 4, `second-order time convergence expected: ${errs}`);
  // relaxed: the viscoelastic stress is below the elastic one
  const elastic = -(E0 / (1 - nu)) * a * (T1 - T0);
  assert.ok(Math.abs(ref(tEnd)) < Math.abs(elastic));
});
