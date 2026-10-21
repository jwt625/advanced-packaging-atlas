// Thermal additions requested by L4 (DevLog-012 contract table): L4-1 contact_resistance on interface selections,
// L4-2 source_patch, L4-4 temperature_field, L4-7 full-tensor / rotated k; L4-3 transient (TA5). Tier-A constants
// from R6 section 1 (si_iso k 148, rho 2330, cp 705; tim 5; cu 390; al 200 W/m K).
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermal, thermalGridOptions } from '../src/thermal/index.mjs';
import { solveThermalTransient } from '../src/thermal/transient.mjs';
import { rotateK, rotationFromDeg } from '../src/thermal/assemble.mjs';
import { multilayerResistance, rectSpreadingSeries } from '../src/thermal/analytic.mjs';

const KA = { si_iso: 148, tim: 5, cu: 390, al: 200 };
const resolve = (key) => {
  if (key === 'rot') {
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    const v = rotateK([10, 50, 148], [c, -s, 0, s, c, 0, 0, 0, 1]);
    return { k_W_mK: [[v[0], v[3], v[4]], [v[3], v[1], v[5]], [v[4], v[5], v[2]]] };
  }
  if (!Object.hasOwn(KA, key)) throw new Error(`unknown ${key}`);
  return { k_W_mK: [KA[key], KA[key], KA[key]], rho_kg_m3: key === 'si_iso' ? 2330 : null, cp_J_kgK: key === 'si_iso' ? 705 : null };
};
const col = (id, material, z_um, h_um, w = 10) => ({ id, kind: 'layer', material, x_mm: 0, y_mm: 0, w_mm: w, d_mm: w, z_um, h_um });

test('L4-1 contact_resistance on interface:tim|cu reproduces TA2 exactly (T_bottom 155.36 C, 10.0 K jump), direct and MG', (t) => {
  const parts = [col('si', 'si_iso', 0, 775), col('tim', 'tim', 775, 50), col('cu', 'cu', 825, 2000)];
  const thermal = { bcs: [{ selection: 'bottom:si', type: 'heat_flux', q_W_m2: 1e6 }, { selection: 'top:cu', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }, { selection: 'interface:tim|cu', type: 'contact_resistance', R_m2K_W: 1e-5 }] };
  const go = thermalGridOptions(thermal);
  assert.deepEqual(go.interfaces, [['tim', 'cu']]);
  const g = buildGrid(parts, { max_xy_mm: 2, min_cells_per_layer: 3, ...go });
  assert.equal(g.interfaces.length, 1);
  assert.ok(Math.abs(g.selections['interface:cu/tim'].area_m2 - 1e-4) < 1e-16);
  const ref = multilayerResistance([{ t_m: 775e-6, k: 148 }, { t_m: 50e-6, k: 5 }, { t_m: 2e-3, k: 390 }], 1e-4, 1e4);
  const Tb = 25 + 100 * (ref.R_tot + 0.1);
  assert.ok(Math.abs(Tb - 155.36) < 0.01); // R6 TA2
  const kz0 = g.zs.findIndex((z) => Math.abs(z - 825e-6) < 1e-15);
  for (const solver of ['direct', 'pcg_mg']) {
    const r = solveThermal(g, thermal, resolve, { solver, coarseMax: 50, rtol: 1e-13 });
    const NX = g.nx + 1, NY = g.ny + 1, T = r.fields.T_K;
    // the sliver cell carries R plus its own Cu thickness delta: interface jump = drop - q delta / k_cu
    const delta = g.zs[kz0 + 1] - g.zs[kz0];
    const jump = T[NX * NY * kz0] - T[NX * NY * (kz0 + 1)] - (1e6 * delta) / 390;
    t.diagnostic(`${solver}: T_bottom ${r.derived.parts.si.Tmax_C.toFixed(6)} C, jump ${jump.toFixed(9)} K, balance ${r.derived.balance_rel.toExponential(1)}`);
    assert.ok(Math.abs(r.derived.parts.si.Tmax_C - Tb) < 1e-9 * 130);
    assert.ok(Math.abs(jump - 10.0) < 1e-8);
    assert.ok(r.derived.balance_rel < 1e-10);
  }
  assert.throws(() => buildGrid(parts, { interfaces: [['si', 'cu']] }), /do not touch across a shared plane/);
  assert.throws(() => solveThermal(buildGrid(parts, { max_xy_mm: 2 }), thermal, resolve), /not in the grid; build it with buildGrid/);
});

test('L4-2 source_patch: flux on a 25 x 25 mm patch of one plate face matches the exact spreading series (TA3a)', () => {
  const plate = [{ id: 'plate', kind: 'plate', material: 'al', x_mm: 0, y_mm: 0, w_mm: 100, d_mm: 100, z_um: 0, h_um: 1300 }];
  const thermal = { source_patch: { selection: 'bottom:plate', x_mm: 0, y_mm: 0, w_mm: 25, d_mm: 25, total_W: 1 }, bcs: [{ selection: 'top:plate', type: 'htc', h_W_m2K: 100, T_inf_C: 25 }] };
  const g = buildGrid(plate, { max_xy_mm: 1, min_cells_per_layer: 8, symmetry: 'quarter', ...thermalGridOptions(thermal) });
  const r = solveThermal(g, thermal, resolve, { solver: 'pcg_mg', rtol: 1e-12 });
  assert.ok(Math.abs(r.derived.heat_in_W - 1) < 1e-12 && r.derived.balance_rel < 1e-9);
  const ser = rectSpreadingSeries({ a: 0.1, b: 0.1, t: 1.3e-3, k: 200, h: 100, c: 0.025, d: 0.025, M: 1000 });
  const Rs_max = r.fields.T_K[0] - 273.15 - 25 - ser.R_1D - ser.R_0;
  assert.ok(Math.abs(Rs_max / ser.Rs_max - 1) < 5e-4, `${Rs_max} vs ${ser.Rs_max}`);
  // without the patch planes the faces cannot cover the patch: explicit error
  const g2 = buildGrid(plate, { max_xy_mm: 3, symmetry: 'quarter' });
  assert.throws(() => solveThermal(g2, thermal, resolve), /cover .* mm\^2 patch/);
  const off = { ...thermal, source_patch: { ...thermal.source_patch, x_mm: 10 } };
  assert.throws(() => solveThermal(g, off, resolve), /not centred on the quarter symmetry/);
});

test('L4-4 temperature_field + L4-7 rotated orthotropic k: TA6 rotated variant is exact (direct and MG)', (t) => {
  // R6 / L4 TA6 aniso_rot: R_z(30 deg) diag(10, 50, 148) R_z^T; T = 25 C + 1e4 x + 2e4 y + 3e4 z (m, min-corner origin)
  const parts = [
    { id: 'a', kind: 'block', material: 'rot', x_mm: 0, y_mm: 0, w_mm: 4, d_mm: 3, z_um: 0, h_um: 800 },
    { id: 'b', kind: 'block', material: 'rot', x_mm: 0.5, y_mm: 0, w_mm: 2, d_mm: 2, z_um: 800, h_um: 400 },
  ];
  const g = buildGrid(parts, { max_xy_mm: 0.4, grading: 1.25, min_cells_per_layer: 3 });
  const thermal = { bcs: [{ selection: 'default', type: 'temperature_field', T_C: '25 + 1.0e4*x + 2.0e4*y + 3.0e4*z', origin: 'min_corner' }] };
  const Tl = (x, y, z) => 25 + 273.15 + 1e4 * (x - g.xs[0]) + 2e4 * (y - g.ys[0]) + 3e4 * (z - g.zs[0]);
  for (const solver of ['direct', 'pcg_mg']) {
    const r = solveThermal(g, thermal, resolve, { solver, rtol: 1e-13, coarseMax: 300 });
    assert.equal(r.timing.k_tensor, true);
    const NX = g.nx + 1, NY = g.ny + 1;
    let e = 0, lo = Infinity, hi = -Infinity;
    r.fields.T_K.forEach((v, n) => {
      if (Number.isNaN(v)) return;
      const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
      e = Math.max(e, Math.abs(v - Tl(g.xs[i], g.ys[j], g.zs[k])));
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    });
    t.diagnostic(`${solver}: max |T - T_exact| ${e.toExponential(2)} K over a ${(hi - lo).toFixed(2)} K range`);
    assert.ok(e / (hi - lo) < 1e-11);
  }
  assert.throws(() => solveThermal(g, { bcs: [{ selection: 'default', type: 'temperature_field', T_C: '25 + q*x' }] }, resolve), /unknown parameter 'q'/);
});

test('L4-7: a 90 deg rotation about z equals swapping kx and ky; a non-SPD tensor is rejected', () => {
  const parts = [{ id: 'a', kind: 'block', material: 'm', x_mm: 0, y_mm: 0, w_mm: 6, d_mm: 4, z_um: 0, h_um: 600 }, { id: 'h', kind: 'block', material: 'm', x_mm: 1, y_mm: 0.5, w_mm: 1, d_mm: 1, z_um: 0, h_um: 50, in: 'a' }];
  const g = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 3 });
  const th = { sources: [{ parts: 'h', power_W: 2 }], bcs: [{ selection: 'top:a', type: 'htc', h_W_m2K: 5e3, T_inf_C: 25 }] };
  const rot = rotateK([3, 40, 7], [0, -1, 0, 1, 0, 0, 0, 0, 1]);
  const r1 = solveThermal(g, th, () => ({ k_W_mK: [[rot[0], rot[3], rot[4]], [rot[3], rot[1], rot[5]], [rot[4], rot[5], rot[2]]] }), { solver: 'direct' });
  const r2 = solveThermal(g, th, () => ({ k_W_mK: [40, 3, 7] }), { solver: 'direct' });
  let e = 0;
  for (let n = 0; n < r1.fields.T_K.length; n++) e = Math.max(e, Math.abs(r1.fields.T_K[n] - r2.fields.T_K[n]));
  assert.ok(e < 1e-9, `${e}`);
  assert.throws(() => solveThermal(g, th, () => ({ k_W_mK: [[1, 2, 0], [2, 1, 0], [0, 0, 1]] })), /positive definite/);
});

/** TA5 column: 0.1 x 0.1 x 3 mm si_iso, 300 cells (10 um), top face heated; probe 0.5 mm below the top. */
function ta5(variant, scheme, dt) {
  const parts = [{ id: 'col', kind: 'die', material: 'si_iso', x_mm: 0, y_mm: 0, w_mm: 0.1, d_mm: 0.1, z_um: 0, h_um: 3000 }];
  const g = buildGrid(parts, { max_xy_mm: 0.1, min_cells_per_layer: 300 });
  const bcs = variant === 'step_T'
    ? [{ selection: 'top:col', type: 'temperature', T_C: 125 }, { selection: 'default', type: 'adiabatic' }]
    : [{ selection: 'top:col', type: 'heat_flux', flux_W_m2: 1e6 }, { selection: 'default', type: 'adiabatic' }];
  const r = solveThermalTransient(g, { initial_C: 25, bcs }, resolve, { t_end_s: 1e-3, dt_s: dt, scheme, output_s: [1e-3], probes: [{ name: 'p', x_mm: 0, y_mm: 0, z_um: variant === 'step_T' ? 2500 : 3000 }], solver: 'direct' });
  return { T: r.probes[0].T_C.at(-1), r };
}

test('L4-3 transient TA5: step surface T (48.8849 C at 0.5 mm, 1 ms) and constant flux (2.2885 K rise); BE order 1, CN order 2', (t) => {
  const dts = [1e-5, 5e-6, 2.5e-6];
  for (const scheme of ['be', 'cn']) {
    for (const [variant, expected, base] of [['step_T', 48.8849, 25], ['flux', 2.2885, 25]]) {
      const f = dts.map((dt) => ta5(variant, scheme, dt).T - (variant === 'flux' ? base : 0));
      const p = Math.log(Math.abs((f[0] - f[1]) / (f[1] - f[2]))) / Math.log(2);
      const ext = f[2] + (f[2] - f[1]) / (2 ** Math.round(p) - 1);
      const rise = variant === 'step_T' ? ext - 25 : ext, rRef = variant === 'step_T' ? expected - 25 : expected;
      t.diagnostic(`${scheme} ${variant}: dt 1e-5 / 5e-6 / 2.5e-6 -> ${f.map((v) => v.toFixed(5)).join(' / ')}; order ${p.toFixed(2)}; Richardson ${ext.toFixed(5)} vs ${expected} (rel on rise ${(rise / rRef - 1).toExponential(2)})`);
      assert.ok(Math.abs(p - (scheme === 'be' ? 1 : 2)) < 0.3, `order ${p}`);
      assert.ok(Math.abs(rise / rRef - 1) < 1e-3);
    }
  }
  const { r } = ta5('flux', 'cn', 1e-5);
  assert.ok(r.derived.energy.balance_rel < 1e-10, `${r.derived.energy.balance_rel}`);
  assert.ok(Math.abs(r.derived.energy.net_in_J - 1e6 * 1e-8 * 1e-3) < 1e-12 * 1e-5 * 1e3);
  const s = ta5('step_T', 'be', 1e-5).r;
  assert.ok(s.derived.energy.balance_rel < 1e-10 && s.outputs.length === 1 && Math.abs(s.outputs[0].t_s - 1e-3) < 1e-15);
});

test('SPEC section 12 rotation convention: MA8 example and the TA6 rotated case (centre 55.0 C, L5 reference 55.000000)', () => {
  // MA8 (SPEC 12): CTE (11, 11, 16) ppm/K, axes rotated +30 deg about x, dT = 100 K -> eps_yz = -2.16506e-4
  const e = rotateK([11e-4, 11e-4, 16e-4], rotationFromDeg([30, 0, 0]));
  assert.ok(Math.abs(e[5] - -2.16506e-4) < 1e-9, `${e[5]}`);
  const Rz = rotationFromDeg([0, 0, 30]), c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
  [c, -s, 0, s, c, 0, 0, 0, 1].forEach((v, q) => assert.ok(Math.abs(Rz[q] - v) < 1e-15));
  // TA6 aniso_rot as in validation/cases/A/TA6-linear-patch.yaml: 1 mm cube, max_xy 0.25, 5 z cells, grading 1.5
  const kr = rotateK([10, 50, 148], Rz);
  const res = () => ({ k_W_mK: [[kr[0], kr[3], kr[4]], [kr[3], kr[1], kr[5]], [kr[4], kr[5], kr[2]]] });
  const g = buildGrid([{ id: 'cube', kind: 'die', material: 'aniso_rot', x_mm: 0, y_mm: 0, w_mm: 1, d_mm: 1, z_um: 0, h_um: 1000 }], { max_xy_mm: 0.25, min_cells_per_layer: 5, grading: 1.5, planes: { z_um: [500] } });
  const r = solveThermal(g, { bcs: [{ selection: 'default', type: 'temperature_field', T_C: '25 + 1.0e4*x + 2.0e4*y + 3.0e4*z', origin: 'min_corner' }] }, res, { solver: 'direct' });
  const NX = g.nx + 1, NY = g.ny + 1;
  const i = g.xs.findIndex((v) => Math.abs(v) < 1e-15), j = g.ys.findIndex((v) => Math.abs(v) < 1e-15), k = g.zs.findIndex((v) => Math.abs(v - 5e-4) < 1e-15);
  const Tc = r.fields.T_K[i + NX * (j + NY * k)] - 273.15;
  assert.ok(Math.abs(Tc / 55 - 1) < 1e-10, `${Tc}`);
});

test('contact_resistance on an x-normal interface (wave 3): TA2 laid along x is exact, direct and MG', () => {
  // si 0.775 mm / tim 0.05 mm / cu 2 mm along x, 10 x 10 mm cross-section; flux at xmin:si, HTC at xmax:cu
  const P = (id, material, x0, w) => ({ id, kind: 'layer', material, x_mm: x0 + w / 2, y_mm: 0, w_mm: w, d_mm: 10, z_um: 0, h_um: 10000 });
  const parts = [P('si', 'si_iso', 0, 0.775), P('tim', 'tim', 0.775, 0.05), P('cu', 'cu', 0.825, 2)];
  const thermal = { bcs: [{ selection: 'xmin:si', type: 'heat_flux', q_W_m2: 1e6 }, { selection: 'xmax:cu', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }, { selection: 'interface:tim|cu', type: 'contact_resistance', R_m2K_W: 1e-5 }] };
  const g = buildGrid(parts, { max_xy_mm: 0.25, grading: 1.3, ...thermalGridOptions(thermal) });
  assert.equal(g.interfaces[0].axis, 'x');
  const Tb = 25 + 100 * (775e-6 / 148 / 1e-4 + 50e-6 / 5 / 1e-4 + 2e-3 / 390 / 1e-4 + 1 + 0.1);
  for (const solver of ['direct', 'pcg_mg']) {
    const r = solveThermal(g, thermal, resolve, { solver, rtol: 1e-13 });
    assert.ok(Math.abs(r.derived.parts.si.Tmax_C - Tb) < 1e-8 * 130, `${solver} ${r.derived.parts.si.Tmax_C} vs ${Tb}`);
    assert.ok(r.derived.balance_rel < 1e-10);
  }
});
