// E4 process sequence gates (lane L8): COMSOL-273-style layered plate (coating + substrate stress-free at 800 C,
// cooled to 150 C; carrier activated stress-free at 150 C; cooled to 20 C) against classical lamination theory by
// superposition (bilayer step + trilayer increment, written here independently of the engine); deactivation
// (carrier debond) returns the bilayer to its own CLT state; activation is stress-free.
// License: GPL-3.0-or-later.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { explicitResolver, explicitRebase } from '../src/mech/index.mjs';
import { solveProcessSequence, probeStepStress } from '../src/mech/process.mjs';
import { curvatureFit } from '../src/mech/post.mjs';

// synthetic isotropic set (same numbers as validation/cases/A/_materials_tier_a.yaml si_iso, cu, sub)
const SET = { si: { E_GPa: 130, nu: 0.28, cte_ppmK: 2.6 }, cu: { E_GPa: 110, nu: 0.34, cte_ppmK: 17 }, car: { E_GPa: 25, nu: 0.3, cte_ppmK: 15 } };
const R = explicitResolver(SET), RB = explicitRebase(SET);

/** CLT, isotropic layers, equibiaxial: layers [{E, nu, a, t}] bottom to top, dT; returns {eps0, kappa, sigma(z, i)}. */
function clt(layers, dT) {
  let z = 0, A = 0, B = 0, D = 0, N = 0, M = 0;
  const zz = [];
  for (const l of layers) {
    const Q = l.E / (1 - l.nu), z0 = z, z1 = z + l.t;
    A += Q * (z1 - z0); B += (Q * (z1 * z1 - z0 * z0)) / 2; D += (Q * (z1 ** 3 - z0 ** 3)) / 3;
    N += Q * l.a * dT * (z1 - z0); M += (Q * l.a * dT * (z1 * z1 - z0 * z0)) / 2;
    zz.push([z0, z1]);
    z = z1;
  }
  const det = A * D - B * B, eps0 = (D * N - B * M) / det, kappa = (A * M - B * N) / det;
  return { eps0, kappa, sigma: (zv, i) => (layers[i].E / (1 - layers[i].nu)) * (eps0 + kappa * zv - layers[i].a * dT), zz };
}
const L = (k, t) => ({ E: SET[k].E_GPa * 1e9, nu: SET[k].nu, a: SET[k].cte_ppmK * 1e-6, t });

test('COMSOL-273-style layered plate: step curvatures and stresses match CLT superposition; debond; stress-free activation', () => {
  // carrier 0.5 mm (bottom), substrate Si 0.5 mm, coating Cu 0.1 mm (top); 20 x 20 mm, quarter model
  const tc = 0.5e-3, ts = 0.5e-3, tf = 0.1e-3;
  const parts = [
    { id: 'carrier', kind: 'carrier', material: 'car', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: 0, h_um: tc * 1e6 },
    { id: 'substrate', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: tc * 1e6, h_um: ts * 1e6 },
    { id: 'coating', kind: 'rdl', material: 'cu', x_mm: 0, y_mm: 0, w_mm: 20, d_mm: 20, z_um: (tc + ts) * 1e6, h_um: tf * 1e6 },
  ];
  const grid = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 2, symmetry: 'quarter' });
  const res = solveProcessSequence(grid, {
    resolve: R, rebase: RB, supports: 'symmetry', warpage: ['bottom:substrate', 'bottom:carrier'],
    steps: [
      { id: 'deposit', activate: ['substrate', 'coating'], stress_free_C: 800, temperature: { uniform_C: 150 } },
      { id: 'bond', activate: ['carrier'], temperature: { uniform_C: 20 } },
      { id: 'debond', deactivate: ['carrier'], temperature: { uniform_C: 20 } },
    ],
  });
  // CLT: step 1 bilayer (z measured from the substrate bottom), step 2 trilayer increment (from the carrier bottom)
  const s1 = clt([L('si', ts), L('cu', tf)], -650);
  const s2 = clt([L('car', tc), L('si', ts), L('cu', tf)], -130);
  const fit = (st, z) => curvatureFit(st._grid, st._num, st._u, { z_m: z, frac: 0.5 }).kappa_clt_x_1_m;
  const [a, b, c] = res.steps;
  // carrier inactive in step 1: the substrate bottom (z = tc) is the free face
  assert.ok(Math.abs(fit(a, tc) / s1.kappa - 1) < 2e-3, `step 1 kappa ${fit(a, tc)} vs CLT ${s1.kappa}`);
  assert.ok(Math.abs(fit(b, tc) / (s1.kappa + s2.kappa) - 1) < 2e-3, `step 2 kappa ${fit(b, tc)} vs ${s1.kappa + s2.kappa}`);
  assert.ok(Math.abs(fit(b, 0) / (s1.kappa + s2.kappa) - 1) < 2e-3, 'carrier bottom follows the same curvature');
  // debond: the bilayer returns to the state of a free bilayer cooled 800 -> 20 C
  const s3 = clt([L('si', ts), L('cu', tf)], -780);
  assert.ok(Math.abs(fit(c, tc) / s3.kappa - 1) < 2e-3, `debond kappa ${fit(c, tc)} vs ${s3.kappa}`);
  // stresses at the plate centre after bonding: substrate = step 1 + increment, carrier = increment only
  const sx = (st, p, z) => probeStepStress(st, p, [0, 0, z])[0];
  const subBot = s1.sigma(0, 0) + s2.sigma(tc, 1), carTop = s2.sigma(tc, 0);
  assert.ok(Math.abs(sx(b, 'substrate', tc) / subBot - 1) < 2e-2, `substrate bottom ${sx(b, 'substrate', tc)} vs ${subBot}`);
  assert.ok(Math.abs(sx(b, 'carrier', tc) / carTop - 1) < 2e-2, `carrier top ${sx(b, 'carrier', tc)} vs ${carTop}`);
  assert.ok(carTop > 0 && subBot - s1.sigma(0, 0) < 0, 'carrier in tension, adjacent substrate pushed into compression (higher carrier CTE)');
  // stress-free activation: the carrier activated at 150 C carries no stress before cooling (extension only)
  assert.ok(b.extension.shared_nodes > 0 && b.extension.new_nodes > 0);
});


test('runMechCase validates process_sequence studies itself (L1 parseCase does not know the type)', async () => {
  const { runMechCase } = await import('../src/mech/case.mjs');
  const c = { schema: 'ap-sim/0', id: 'x/y', family: 'none', studies: [{ id: 'p', type: 'process_sequence', steps: [], bogus: 1 }] };
  assert.throws(() => runMechCase(c, { generate: () => { throw new Error('not reached'); }, lib: { keys: () => [], resolve: () => null } }), /unknown key bogus/);
  const c2 = { ...c, studies: [{ id: 'p', type: 'process_sequence', steps: [] }] };
  assert.throws(() => runMechCase(c2, { generate: () => { throw new Error('not reached'); }, lib: { keys: () => [], resolve: () => null } }), /steps/);
});

test('material switch per step: bump layer compliant phase -> RVE column field (Cu in underfill) at cure, CLT', async () => {
  const { createRveResolver } = await import('../src/homog/resolver.mjs');
  // synthetic set (test only): soft = compliant placeholder for the un-underfilled joint layer
  const S2 = { ...SET, uf: { E_GPa: 8, nu: 0.35, cte_ppmK: 30 }, soft: { E_GPa: 2, nu: 0.3, cte_ppmK: 20 } };
  const R0 = explicitResolver(S2), RB0 = explicitRebase(S2);
  const lib = { resolve: (k, T, o) => R0(k, T, o), rebaseSecantCte: (e, s, T, o) => RB0(e, s, T, o) };
  const RV = createRveResolver(lib, { n: 16, richardson: false });
  const key = 'homog:microbump:cu+uf:0.2';
  const tb = 1e-3, tj = 0.1e-3, td = 0.5e-3;
  const parts = [
    { id: 'sub', kind: 'substrate', material: 'car', x_mm: 0, y_mm: 0, w_mm: 60, d_mm: 60, z_um: 0, h_um: tb * 1e6 },
    { id: 'jl', kind: 'microbump', material: 'soft', x_mm: 0, y_mm: 0, w_mm: 60, d_mm: 60, z_um: tb * 1e6, h_um: tj * 1e6 },
    { id: 'die', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm: 60, d_mm: 60, z_um: (tb + tj) * 1e6, h_um: td * 1e6 },
  ];
  const grid = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 2, symmetry: 'quarter' });
  const res = solveProcessSequence(grid, {
    resolve: RV.resolve, rebase: RV.rebase, supports: 'symmetry',
    steps: [
      { id: 'reflow', activate: ['*'], stress_free_C: 217, temperature: { uniform_C: 165 } },
      { id: 'cure', materials: { map: { jl: key } }, temperature: { uniform_C: 25 } },
    ],
  });
  const [a, b] = res.steps;
  assert.deepEqual(b.switched.map((x) => x.part), ['jl']);
  // CLT: step 1 three layers (dT -52); step 2 new laminate with the jl step-1 resultants released (dT -140)
  const Lr = (E, nu, a2, t) => ({ E, nu, a: a2, t });
  const soft = Lr(2e9, 0.3, 20e-6, tj);
  const s1 = clt([L('car', tb), soft, L('si', td)], -52);
  const zj0 = tb, zj1 = tb + tj, Qs = soft.E / (1 - soft.nu);
  const NB = Qs * ((s1.eps0 - soft.a * -52) * tj + (s1.kappa * (zj1 ** 2 - zj0 ** 2)) / 2);
  const MB = Qs * (((s1.eps0 - soft.a * -52) * (zj1 ** 2 - zj0 ** 2)) / 2 + (s1.kappa * (zj1 ** 3 - zj0 ** 3)) / 3);
  const e = RV.resolve(key, 298.15, { Tsf_K: 438.15 });
  const jl2 = { E: e.elastic.Ex, nu: e.elastic.nuxy, a: e.cte.alpha[0], t: tj };
  // increment: [A B; B D][de0; dk] = [N_T + NB; M_T + MB]
  const lay = [L('car', tb), jl2, L('si', td)];
  let z = 0, A = 0, Bm = 0, D = 0, NT = 0, MT = 0;
  for (const l of lay) {
    const Q = l.E / (1 - l.nu), z0 = z, z1 = z + l.t;
    A += Q * (z1 - z0); Bm += (Q * (z1 ** 2 - z0 ** 2)) / 2; D += (Q * (z1 ** 3 - z0 ** 3)) / 3;
    NT += Q * l.a * -140 * (z1 - z0); MT += (Q * l.a * -140 * (z1 ** 2 - z0 ** 2)) / 2;
    z = z1;
  }
  const N = NT + NB, M = MT + MB, det = A * D - Bm * Bm, dk = (A * M - Bm * N) / det;
  const fit = (st) => curvatureFit(st._grid, st._num, st._u, { z_m: 0, frac: 0.3 }).kappa_clt_x_1_m;
  assert.ok(Math.abs(fit(a) / s1.kappa - 1) < 3e-3, `step 1 ${fit(a)} vs ${s1.kappa}`);
  assert.ok(Math.abs(fit(b) / (s1.kappa + dk) - 1) < 3e-3, `step 2 ${fit(b)} vs ${s1.kappa + dk}`);
  // the switched layer starts stress-free at 165 C: its stress at the end is the increment only (not step 1 + increment)
  const sj = probeStepStress(b, 'jl', [0, 0, tb + tj / 2])[0];
  const dEps = (N * D - Bm * M) / det;
  const expectJ = (jl2.E / (1 - jl2.nu)) * (dEps + dk * (tb + tj / 2) - jl2.a * -140);
  assert.ok(Math.abs(sj / expectJ - 1) < 3e-2, `jl stress ${sj} vs ${expectJ}`);
});

test('rate-form sweep across Tg (bilinear modulus): bilayer equals the integrated CLT; differs from the total form', async () => {
  const { solveMechSweep } = await import('../src/mech/sweep.mjs');
  const { solveMech } = await import('../src/mech/index.mjs');
  // synthetic test layer: E 0.4 GPa above Tg = 100 C, 8 GPa below; CTE 30 ppm/K; on Si (130 GPa, 2.6 ppm/K)
  const Eb = (T_K) => (T_K - 273.15 > 100 ? 0.4e9 : 8e9);
  const resolve = (k, T_K) => (k === 'si'
    ? { elastic: { type: 'iso', E_Pa: 130e9, nu: 0.28 }, cte: { kind: 'secant', Tref_K: T_K, alpha: [2.6e-6, 2.6e-6, 2.6e-6] } }
    : { elastic: { type: 'iso', E_Pa: Eb(T_K), nu: 0.35 }, cte: { kind: 'secant', Tref_K: T_K, alpha: [30e-6, 30e-6, 30e-6] } });
  const rebase = (k, Tsf, T) => ({ alpha: resolve(k, T).cte.alpha });
  const ts = 0.5e-3, tb = 0.2e-3;
  const parts = [
    { id: 'si', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm: 40, d_mm: 40, z_um: 0, h_um: ts * 1e6 },
    { id: 'emc', kind: 'mold', material: 'emc', x_mm: 0, y_mm: 0, w_mm: 40, d_mm: 40, z_um: ts * 1e6, h_um: tb * 1e6 },
  ];
  const grid = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 2, symmetry: 'quarter' });
  const sw = solveMechSweep(grid, { resolve, rebase, supports: 'symmetry', stress_free_C: { default: 150 }, path_C: [100, 25], dT_max: 5, curvature: [{ z_m: 0, frac: 0.5 }] });
  const kap = (E2, dT) => clt([{ E: 130e9, nu: 0.28, a: 2.6e-6, t: ts }, { E: E2, nu: 0.35, a: 30e-6, t: tb }], dT).kappa;
  const k100 = kap(0.4e9, -50), k25 = k100 + kap(8e9, -75), kTotal = kap(8e9, -125);
  const f = (i) => sw.steps[i].curvature[0].kappa_clt_x_1_m;
  assert.ok(Math.abs(f(0) / k100 - 1) < 2e-3, `100 C ${f(0)} vs ${k100}`);
  assert.ok(Math.abs(f(1) / k25 - 1) < 2e-3, `25 C ${f(1)} vs ${k25}`);
  const tot = solveMech(grid, { resolve, rebase, supports: 'symmetry', stress_free_C: { default: 150 }, temperature: { uniform_C: 25 }, curvature: [{ z_m: 0, frac: 0.5 }], stress: false });
  assert.ok(Math.abs(tot.derived.curvature[0].kappa_clt_x_1_m / kTotal - 1) < 2e-3, 'total form = CLT at the end modulus');
  assert.ok(Math.abs(k25 / kTotal - 1) > 0.05, 'rate and total forms differ across Tg');
});
