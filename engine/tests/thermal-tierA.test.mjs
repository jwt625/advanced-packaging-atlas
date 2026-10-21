// Tier-A thermal closed forms (R6 section 1.2: TA1-TA4; TA5 is transient, out of E1 scope). Material constants are
// R6's synthetic tier-A set (si_iso k 148, tim 5, cu 390, al 200 W/m K; R6 section 1 table). Geometries as in R6.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermal } from '../src/thermal/index.mjs';
import { multilayerResistance, songLeeAu, rectSpreadingSeries, finConvectiveTip } from '../src/thermal/analytic.mjs';

const K_TIER_A = { si_iso: 148, tim: 5, cu: 390, al: 200, rc: 0.1 };
const resolve = (key) => {
  if (!Object.hasOwn(K_TIER_A, key)) throw new Error(`unknown key ${key}`);
  return { k_W_mK: [K_TIER_A[key], K_TIER_A[key], K_TIER_A[key]] };
};
const col = (id, material, z_um, h_um) => ({ id, kind: 'layer', material, x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um, h_um });

/** Face-area average of T (C) over a single-group selection, from the bilinear nodal field. */
function faceAvgC(grid, T, name) {
  const sel = grid.selections[name];
  const { nx, ny, xs, ys, zs } = grid;
  const NX = nx + 1, NY = ny + 1;
  let s = 0, a = 0;
  for (const g of sel.groups)
    for (const c of g.cells) {
      const i = c % nx, j = Math.floor(c / nx) % ny, k = Math.floor(c / (nx * ny));
      if (g.axis !== 'z') throw new Error('faceAvgC: z faces only');
      const kk = g.side === '+' ? k + 1 : k;
      const ar = (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      const n = i + NX * (j + NY * kk);
      s += (ar * (T[n] + T[n + 1] + T[n + NX] + T[n + NX + 1])) / 4;
      a += ar;
    }
  void zs;
  return s / a - 273.15;
}

test('TA1: 1D multilayer column with convective top is exact (Q1 reproduces piecewise-linear T)', () => {
  const parts = [col('si', 'si_iso', 0, 775), col('tim', 'tim', 775, 50), col('cu', 'cu', 825, 2000)];
  const ref = multilayerResistance([{ t_m: 775e-6, k: 148 }, { t_m: 50e-6, k: 5 }, { t_m: 2e-3, k: 390 }], 1e-4, 1e4);
  assert.ok(Math.abs(ref.R_tot - 1.2036) < 5e-5); // R6 TA1: R_tot 1.2036 K/W
  const expected = 25 + 100 * ref.R_tot; // R6 TA1: T_bottom = 145.36 C
  assert.ok(Math.abs(expected - 145.36) < 0.01);
  for (const solver of ['direct', 'pcg_mg']) {
    const g = buildGrid(parts, { max_xy_mm: 1, min_cells_per_layer: 3 });
    const r = solveThermal(g, { bcs: [{ selection: 'bottom:si', type: 'heat_flux', power_W: 100 }, { selection: 'top:cu', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }] }, resolve, { solver, coarseMax: 100, rtol: 1e-13 });
    const d = r.derived.parts;
    assert.ok(Math.abs(d.si.Tmax_C - expected) < 1e-9 * 120, `${solver}: ${d.si.Tmax_C} vs ${expected}`);
    assert.ok(Math.abs(d.si.Tmin_C - (25 + 100 * (ref.R_tot - ref.R[0]))) < 1e-9 * 120);
    assert.ok(Math.abs(d.cu.Tmin_C - (25 + 100 * ref.R_conv)) < 1e-9 * 120);
    assert.ok(Math.abs(r.derived.heat_in_W - 100) < 1e-10 && Math.abs(r.derived.heat_out_W - 100) < 1e-8);
    assert.ok(r.derived.balance_rel < 1e-10, `${r.derived.balance_rel}`);
    if (solver === 'pcg_mg') assert.ok(r.timing.mg.levels >= 2);
  }
});

test('TA2: interface resistance R_c = 1e-5 m^2 K/W as a 1 um layer (k = t / R_c) gives T_bottom 155.36 C and a 10.0 K jump', () => {
  const parts = [col('si', 'si_iso', 0, 775), col('tim', 'tim', 775, 50), col('rc', 'rc', 825, 1), col('cu', 'cu', 826, 2000)];
  const g = buildGrid(parts, { max_xy_mm: 2, min_cells_per_layer: 2 });
  const r = solveThermal(g, { bcs: [{ selection: 'bottom:si', type: 'heat_flux', q_W_m2: 1e6 }, { selection: 'top:cu', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }] }, resolve, { solver: 'direct' });
  const ref = multilayerResistance([{ t_m: 775e-6, k: 148 }, { t_m: 50e-6, k: 5 }, { t_m: 1e-6, k: 0.1 }, { t_m: 2e-3, k: 390 }], 1e-4, 1e4);
  const Tb = 25 + 100 * ref.R_tot;
  assert.ok(Math.abs(Tb - 155.36) < 0.01); // R6 TA2
  const d = r.derived.parts;
  assert.ok(Math.abs(d.si.Tmax_C - Tb) < 1e-9 * 130);
  assert.ok(Math.abs(d.rc.Tmax_C - d.rc.Tmin_C - 10.0) < 1e-8); // R6 TA2: jump 10.0 K
});

/** TA3 FE on a quarter model: plate split into rim + centred source column (same material; bookkeeping only). */
function spreading({ plate_mm, t_um, src_mm, k, h, material, mesh }) {
  const parts = [
    { id: 'rim', kind: 'plate', material, x_mm: 0, y_mm: 0, w_mm: plate_mm, d_mm: plate_mm, z_um: 0, h_um: t_um },
    { id: 'src', kind: 'plate', material, x_mm: 0, y_mm: 0, w_mm: src_mm, d_mm: src_mm, z_um: 0, h_um: t_um, in: 'rim' },
  ];
  const ser = rectSpreadingSeries({ a: plate_mm * 1e-3, b: plate_mm * 1e-3, t: t_um * 1e-6, k, h, c: src_mm * 1e-3, d: src_mm * 1e-3, M: 1000 });
  return mesh.map(([mxy, nzc]) => {
    const g = buildGrid(parts, { max_xy_mm: mxy, min_cells_per_layer: nzc, grading: 1.3, symmetry: 'quarter', max_nodes: 1e6 });
    const r = solveThermal(g, { bcs: [{ selection: 'bottom:src', type: 'heat_flux', power_W: 1 }, { selection: 'top:*', type: 'htc', h_W_m2K: h, T_inf_C: 25 }] }, resolve, { solver: 'pcg_mg', rtol: 1e-12 });
    assert.ok(Math.abs(r.derived.heat_in_W - 1) < 1e-12 && r.derived.balance_rel < 1e-9);
    const Tavg = faceAvgC(g, r.fields.T_K, 'bottom:src');
    const Tc = r.fields.T_K[0] - 273.15; // node (0, 0, 0): source centre
    return { Rs_avg: Tavg - 25 - ser.R_1D - ser.R_0, Rs_max: Tc - 25 - ser.R_1D - ser.R_0, ser, nodes: g.stats.nodes };
  });
}

test('TA3a: spreading resistance, Electronics Cooling 1998 example (Al 100 x 100 x 1.3 mm, 25 x 25 mm source, R0 = 1 K/W)', (t) => {
  // R6 TA3a: R_sp,max = 0.657 K/W, R_sp,avg = 0.504 K/W (circular-equivalent formula); article value 0.66 K/W
  const sla = songLeeAu({ k: 200, t: 1.3e-3, As: 625e-6, Ap: 0.01, h: 1 / (1.0 * 0.01) });
  assert.ok(Math.abs(sla.Rsp_max - 0.657) < 5e-4 && Math.abs(sla.Rsp_avg - 0.504) < 5e-4);
  assert.ok(Math.abs(sla.Rsp_max / 0.66 - 1) < 0.005); // formula reproduces the article's 0.66 K/W
  const res = spreading({ plate_mm: 100, t_um: 1300, src_mm: 25, k: 200, h: 100, material: 'al', mesh: [[4, 2], [2, 4], [1, 8]] });
  const ser = res[0].ser;
  const eAvg = res.map((r) => r.Rs_avg / ser.Rs_avg - 1), eMax = res.map((r) => r.Rs_max / ser.Rs_max - 1);
  // FE (square source on square plate) converges to the exact rectangular series at second order
  assert.ok(Math.abs(eAvg[2]) < 1e-3 && Math.abs(eMax[2]) < 5e-4, `${eAvg} ${eMax}`);
  const p = Math.log(Math.abs(eAvg[1] / eAvg[2])) / Math.log(2);
  t.diagnostic(`series Rs_max ${ser.Rs_max.toFixed(5)} Rs_avg ${ser.Rs_avg.toFixed(5)}; FE ${res.map((r) => `${r.nodes} nodes: ${r.Rs_max.toFixed(5)} / ${r.Rs_avg.toFixed(5)}`).join('; ')}; order ${p.toFixed(2)}; SLA ${sla.Rsp_max.toFixed(4)} / ${sla.Rsp_avg.toFixed(4)}`);
  assert.ok(p > 1.5 && p < 2.4, `observed order ${p}`);
  // the circular-equivalent approximation differs from the square geometry by a few percent (stated in R6 TA3)
  assert.ok(Math.abs(res[2].Rs_max / sla.Rsp_max - 1) < 0.03 && Math.abs(res[2].Rs_avg / sla.Rsp_avg - 1) < 0.06);
});

test('TA3b: die-on-lid spreading (25 x 25 mm source on Cu 50 x 50 x 2 mm, h = 5000 W/m^2 K)', (t) => {
  const sla = songLeeAu({ k: 390, t: 2e-3, As: 625e-6, Ap: 2500e-6, h: 5000 });
  assert.ok(Math.abs(sla.Rsp_max - 0.0804) < 5e-5 && Math.abs(sla.Rsp_avg - 0.0491) < 5e-5); // R6 TA3b
  const [r] = spreading({ plate_mm: 50, t_um: 2000, src_mm: 25, k: 390, h: 5000, material: 'cu', mesh: [[0.5, 8]] });
  t.diagnostic(`series ${r.ser.Rs_max.toFixed(5)} / ${r.ser.Rs_avg.toFixed(5)}; FE ${r.Rs_max.toFixed(5)} / ${r.Rs_avg.toFixed(5)} (${r.nodes} nodes); SLA ${sla.Rsp_max.toFixed(4)} / ${sla.Rsp_avg.toFixed(4)}`);
  assert.ok(Math.abs(r.Rs_avg / r.ser.Rs_avg - 1) < 2e-3 && Math.abs(r.Rs_max / r.ser.Rs_max - 1) < 2e-3, `${r.Rs_avg} ${r.ser.Rs_avg} ${r.Rs_max} ${r.ser.Rs_max}`);
});

test('TA4: straight Al fin with convective tip, q / theta_b = 0.02092 W/K', (t) => {
  const ref = finConvectiveTip({ h: 50, k: 200, t: 1e-3, w: 10e-3, L: 20e-3 });
  assert.ok(Math.abs(ref.q_per_K - 0.02092) < 5e-6 && Math.abs(ref.mL - 0.469) < 5e-4); // R6 TA4
  const parts = [{ id: 'fin', kind: 'fin', material: 'al', x_mm: 10, y_mm: 0, w_mm: 20, d_mm: 10, z_um: 0, h_um: 1000 }];
  const g = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 4 });
  const r = solveThermal(g, { bcs: [{ selection: 'xmin:fin', type: 'temperature', T_C: 26 }, { selection: 'default', type: 'htc', h_W_m2K: 50, T_inf_C: 25 }] }, resolve, { solver: 'direct' });
  const q = r.derived.components_W.htc_out;
  assert.ok(Math.abs(-r.derived.components_W.fixed_T_out - q) < 1e-12 * q * 1e3);
  assert.ok(Math.abs(q / ref.q_per_K - 1) < 1e-3, `${q} vs ${ref.q_per_K}`);
  t.diagnostic(`FE q/theta_b ${q.toFixed(6)} W/K vs 1D ${ref.q_per_K.toFixed(6)} W/K`);
});
