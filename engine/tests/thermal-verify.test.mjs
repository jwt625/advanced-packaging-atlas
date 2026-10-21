// Thermal verification (R6 section 4.1; DevLog-010 E1 gates): linear patch (TA6), manufactured solution with a
// material interface (observed L2 order ~2), energy balance <= 1e-10, direct vs PCG + GMG <= 1e-8, quarter crop
// equal to the full model, Picard on k(T) against the Kirchhoff-transform closed form, input errors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermal } from '../src/thermal/index.mjs';
import { GAUSS01 } from '../src/thermal/assemble.mjs';

// synthetic, deliberately high-contrast conductivities (W/m K): verification only, not material data
const K = { si: [148, 148, 148], sub: [30, 30, 0.6], uf: [0.5, 0.5, 0.5], si_hot: [148, 148, 148], lid: [390, 390, 390], tim: [5, 5, 5], aniso: [3, 1, 7] };
const resolve = (key) => {
  if (!Object.hasOwn(K, key)) throw new Error(`unknown key ${key}`);
  return { k_W_mK: K[key] };
};
const dieOnSub = () => [
  { id: 'substrate', kind: 'substrate', material: 'sub', x_mm: 0, y_mm: 0, w_mm: 40, d_mm: 30, z_um: 0, h_um: 1200 },
  { id: 'uf', kind: 'underfill', material: 'uf', x_mm: 0, y_mm: 0, w_mm: 18, d_mm: 14, z_um: 1200, h_um: 60 },
  { id: 'die', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm: 16, d_mm: 12, z_um: 1260, h_um: 775 },
  { id: 'core', kind: 'die', material: 'si_hot', x_mm: 0, y_mm: 0, w_mm: 6, d_mm: 4, z_um: 1260, h_um: 30, in: 'die' },
  { id: 'tim', kind: 'tim', material: 'tim', x_mm: 0, y_mm: 0, w_mm: 16, d_mm: 12, z_um: 2035, h_um: 40 },
  { id: 'lid', kind: 'lid', material: 'lid', x_mm: 0, y_mm: 0, w_mm: 30, d_mm: 24, z_um: 2075, h_um: 1500 },
];
const thermal = {
  sources: [{ parts: 'core', power_W: 40 }, { parts: 'die', power_W: 160 }],
  bcs: [
    { selection: 'top:lid', type: 'htc', h_W_m2K: 2e4, T_inf_C: 30 },
    { selection: 'bottom:substrate', type: 'temperature', T_C: 45 },
    { selection: 'default', type: 'htc', h_W_m2K: 10, T_inf_C: 25 },
  ],
};
const range = (T) => {
  let lo = Infinity, hi = -Infinity;
  for (const v of T) if (!Number.isNaN(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return hi - lo;
};

test('TA6 patch: a linear field with anisotropic k on a graded grid with voids is reproduced to round-off', () => {
  const parts = dieOnSub().map((p) => ({ ...p, material: 'aniso' }));
  const g = buildGrid(parts, { max_xy_mm: 2, grading: 1.25, min_cells_per_layer: 2 });
  const Tl = (x, y, z) => 300 + 400 * x - 900 * y + 2500 * z;
  for (const solver of ['direct', 'pcg_mg']) {
    const r = solveThermal(g, { bcs: [{ selection: 'default', type: 'temperature', T_K_fn: Tl }] }, resolve, { solver, rtol: 1e-13, coarseMax: 500 });
    let e = 0;
    const { xs, ys, zs } = g, NX = g.nx + 1, NY = g.ny + 1;
    r.fields.T_K.forEach((v, n) => {
      if (Number.isNaN(v)) return;
      const i = n % NX, j = Math.floor(n / NX) % NY, k = Math.floor(n / (NX * NY));
      e = Math.max(e, Math.abs(v - Tl(xs[i], ys[j], zs[k])));
    });
    assert.ok(e / range(r.fields.T_K) < 1e-11, `${solver}: ${e}`);
  }
});

test('MMS with a material interface: observed L2 order ~2 on 4 meshes', (t) => {
  // T = T0 + A sin(pi x / L) sin(pi y / L) g(z), g = z below z_i, z_i + (kz1 / kz2)(z - z_i) above (continuous normal
  // flux); f = A sin sin g (kx pi^2 / L^2 + ky pi^2 / L^2) per layer. Own construction (R6 4.1 MMS heat, layered form).
  const L = 10e-3, Lz = 2e-3, zi = 0.8e-3, A = 1e4, T0 = 300;
  const k1 = [2, 3, 1], k2 = [50, 40, 20];
  K.mms1 = k1;
  K.mms2 = k2;
  const parts = [
    { id: 'l1', kind: 'layer', material: 'mms1', x_mm: 5, y_mm: 5, w_mm: 10, d_mm: 10, z_um: 0, h_um: 800 },
    { id: 'l2', kind: 'layer', material: 'mms2', x_mm: 5, y_mm: 5, w_mm: 10, d_mm: 10, z_um: 800, h_um: 1200 },
  ];
  const gz = (z) => (z < zi ? z : zi + (k1[2] / k2[2]) * (z - zi));
  const Tm = (x, y, z) => T0 + A * Math.sin((Math.PI * x) / L) * Math.sin((Math.PI * y) / L) * gz(z);
  const f = (x, y, z) => {
    const k = z < zi ? k1 : k2;
    return A * Math.sin((Math.PI * x) / L) * Math.sin((Math.PI * y) / L) * gz(z) * ((k[0] + k[1]) * Math.PI ** 2) / L ** 2;
  };
  const errs = [];
  for (const n of [5, 10, 20, 40]) {
    const g = buildGrid(parts, { max_xy_mm: 10 / n, max_z_mm: 2 / n, grading: 1.3, max_nodes: 1e6 });
    const r = solveThermal(g, { bcs: [{ selection: 'default', type: 'temperature', T_K_fn: Tm }] }, resolve, { solver: 'pcg_mg', rtol: 1e-12, sourceFn: f });
    // L2 error with 3-point Gauss per direction, trilinear T_h
    const { nx, ny, nz, xs, ys, zs } = g, NX = nx + 1, NY = ny + 1, T = r.fields.T_K;
    const G = GAUSS01[3];
    let e2 = 0;
    for (let k = 0; k < nz; k++)
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k];
          const n0 = i + NX * (j + NY * k);
          const v = [T[n0], T[n0 + 1], T[n0 + NX], T[n0 + NX + 1], T[n0 + NX * NY], T[n0 + NX * NY + 1], T[n0 + NX * NY + NX], T[n0 + NX * NY + NX + 1]];
          for (let a = 0; a < 3; a++)
            for (let b = 0; b < 3; b++)
              for (let c = 0; c < 3; c++) {
                const u = G.x[a], w = G.x[b], s = G.x[c];
                let th = 0;
                for (let q = 0; q < 8; q++) th += v[q] * (q & 1 ? u : 1 - u) * ((q >> 1) & 1 ? w : 1 - w) * (q >> 2 ? s : 1 - s);
                const d = th - Tm(xs[i] + u * hx, ys[j] + w * hy, zs[k] + s * hz);
                e2 += d * d * G.w[a] * G.w[b] * G.w[c] * hx * hy * hz;
              }
        }
    errs.push(Math.sqrt(e2));
    assert.ok(r.derived.balance_rel < 1e-9);
  }
  const orders = errs.slice(1).map((e, q) => Math.log(errs[q] / e) / Math.log(2));
  t.diagnostic(`L2 errors ${errs.map((e) => e.toExponential(3)).join(', ')}; orders ${orders.map((p) => p.toFixed(3)).join(', ')}`);
  for (const p of orders.slice(1)) assert.ok(p > 1.85 && p < 2.15, `orders ${orders}`);
});

test('energy balance <= 1e-10 (direct and PCG + MG at rtol 1e-12), heat in = sources', () => {
  const g = buildGrid(dieOnSub(), { max_xy_mm: 1.5, grading: 1.25, min_cells_per_layer: 2 });
  for (const solver of ['direct', 'pcg_mg']) {
    const r = solveThermal(g, thermal, resolve, { solver, rtol: 1e-12 });
    assert.ok(r.derived.balance_rel < 1e-10, `${solver} ${r.derived.balance_rel}`);
    assert.ok(Math.abs(r.derived.heat_in_W - 200) < 1e-9);
    const c = r.derived.components_W;
    assert.ok(Math.abs(c.htc_out + c.fixed_T_out - 200) < 1e-8 * 200);
  }
});

test('direct and PCG + GMG agree to 1e-8 of the temperature range on a high-contrast stack (>= 3 MG levels)', (t) => {
  const g = buildGrid(dieOnSub(), { max_xy_mm: 1, grading: 1.2, min_cells_per_layer: 2, max_z_mm: 0.4 });
  const d = solveThermal(g, thermal, resolve, { solver: 'direct' });
  const m = solveThermal(g, thermal, resolve, { solver: 'pcg_mg', rtol: 1e-12, coarseMax: 1000 });
  assert.ok(m.timing.mg.levels >= 3, `${m.timing.mg.levels}`);
  let e = 0;
  for (let n = 0; n < d.fields.T_K.length; n++) if (!Number.isNaN(d.fields.T_K[n])) e = Math.max(e, Math.abs(d.fields.T_K[n] - m.fields.T_K[n]));
  assert.ok(e / range(d.fields.T_K) < 1e-8, `${e}`);
  t.diagnostic(`nodes ${g.stats.nodes}, max|dT|/range ${(e / range(d.fields.T_K)).toExponential(2)}, MG levels ${m.timing.mg.levels}, iterations ${m.timing.iterations}`);
  assert.equal(d.derived.Tmax_C.part, m.derived.Tmax_C.part);
  // Jacobi-PCG reaches the same answer with many more iterations
  const j = solveThermal(g, thermal, resolve, { solver: 'pcg_jacobi', rtol: 1e-12, maxIter: 20000 });
  assert.ok(j.timing.iterations > 5 * m.timing.iterations);
  t.diagnostic(`Jacobi-PCG iterations ${j.timing.iterations}`);
  assert.ok(Math.abs(j.derived.Tmax_C.value - d.derived.Tmax_C.value) < 1e-6);
});

test('quarter and half crops equal the full model on matching meshes', (t) => {
  const opts = { max_xy_mm: 1.5, grading: 1.25, min_cells_per_layer: 2 };
  const full = buildGrid(dieOnSub(), { ...opts, planes: { x_mm: [0], y_mm: [0] } });
  const rf = solveThermal(full, thermal, resolve, { solver: 'direct' });
  for (const symmetry of ['quarter', 'half_x', 'half_y']) {
    const g = buildGrid(dieOnSub(), { ...opts, symmetry, planes: { x_mm: [0], y_mm: [0] } });
    const r = solveThermal(g, thermal, resolve, { solver: 'direct' });
    const i0 = full.xs.findIndex((v) => Math.abs(v - g.xs[0]) < 1e-15), j0 = full.ys.findIndex((v) => Math.abs(v - g.ys[0]) < 1e-15);
    let e = 0;
    const NX = g.nx + 1, NY = g.ny + 1, FX = full.nx + 1, FY = full.ny + 1;
    for (let k = 0; k <= g.nz; k++)
      for (let j = 0; j < NY; j++)
        for (let i = 0; i < NX; i++) {
          const a = r.fields.T_K[i + NX * (j + NY * k)], b = rf.fields.T_K[i0 + i + FX * (j0 + j + FY * k)];
          if (Number.isNaN(a) !== Number.isNaN(b)) throw new Error('activity mismatch');
          if (!Number.isNaN(a)) e = Math.max(e, Math.abs(a - b));
        }
    assert.ok(e / range(rf.fields.T_K) < 1e-9, `${symmetry}: ${e}`);
    t.diagnostic(`${symmetry}: max|dT| ${e.toExponential(2)} K`);
    assert.ok(Math.abs(r.derived.heat_in_W - rf.derived.heat_in_W) < 1e-9 && Math.abs(r.derived.heat_out_W - rf.derived.heat_out_W) < 1e-7);
    assert.ok(Math.abs(r.derived.Tmax_C.value - rf.derived.Tmax_C.value) < 1e-9);
    assert.equal(r.derived.symmetry_factor, symmetry === 'quarter' ? 4 : 2);
  }
});

test('Picard on k(T): 1D slab with k = k0 (1 + b (T - T1)) matches the Kirchhoff-transform solution', (t) => {
  // k0 [theta + b theta^2 / 2] = q (L - z), theta = T - T1 (own closed form; synthetic k(T))
  const k0 = 10, b = 4e-3, q = 2e5, Lm = 5e-3, T1 = 300;
  const res = (key, T) => {
    if (key !== 'kt') throw new Error(key);
    const k = k0 * (1 + b * (T - T1));
    return { k_W_mK: [k, k, k] };
  };
  const parts = [{ id: 'slab', kind: 'layer', material: 'kt', x_mm: 0, y_mm: 0, w_mm: 2, d_mm: 2, z_um: 0, h_um: 5000 }];
  const g = buildGrid(parts, { max_xy_mm: 2, max_z_mm: 0.125 });
  const r = solveThermal(g, { bcs: [{ selection: 'bottom:slab', type: 'heat_flux', q_W_m2: q }, { selection: 'top:slab', type: 'temperature', T_K: T1 }] }, res, { solver: 'direct', nonlinear: { tol_K: 1e-9 } });
  const exact = (-1 + Math.sqrt(1 + (2 * b * q * Lm) / k0)) / b;
  const fe = r.fields.T_K[0] - T1;
  assert.ok(r.timing.picard_iterations > 2 && r.timing.picard_change_K < 1e-9);
  assert.ok(Math.abs(fe / exact - 1) < 2e-4, `${fe} vs ${exact}`);
  t.diagnostic(`theta_bottom FE ${fe.toFixed(6)} K, exact ${exact.toFixed(6)} K, Picard iterations ${r.timing.picard_iterations}`);
  assert.ok(r.derived.balance_rel < 1e-10);
});

test('thermal input errors are explicit', () => {
  const g = buildGrid(dieOnSub(), { max_xy_mm: 4, symmetry: 'quarter' });
  const run = (th) => () => solveThermal(g, th, resolve, { solver: 'direct' });
  assert.throws(run({ bcs: [{ selection: 'top:lid', type: 'htc', h: 5 }] }), /unknown key h /);
  assert.throws(run({ bcs: [{ selection: 'top:lid', type: 'radiation' }] }), /unknown type radiation/);
  assert.throws(run({ bcs: [{ selection: 'top:nothing', type: 'temperature', T_C: 25 }] }), /top:nothing has no exterior faces/);
  assert.throws(run({ bcs: [{ selection: 'top:die', type: 'temperature', T_C: 25 }] }), /top:die has no exterior faces/);
  assert.throws(run({ bcs: [{ selection: 'sym:x', type: 'temperature', T_C: 25 }] }), /symmetry plane/);
  assert.throws(run({ bcs: [{ selection: 'top:lid', type: 'symmetry' }] }), /needs a sym:x or sym:y/);
  assert.throws(run({ sources: [{ parts: 'nope*', power_W: 1 }] }), /match no part/);
  assert.throws(run({ sources: [{ parts: 'die', power_W: 1, density_W_m3: 3 }] }), /exactly one of/);
  assert.throws(run({ bcs: [{ selection: 'top:lid', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }], radiation: true }), /unknown key radiation/);
  assert.throws(() => solveThermal(g, { bcs: [{ selection: 'top:lid', type: 'temperature', T_C: 25 }] }, () => ({ k_W_mK: [1, -1, 1] })), /k_W_mK must be/);
  assert.throws(() => solveThermal(g, {}, resolve, { solver: 'magic' }), /unknown solver/);
  // adiabatic everywhere with a source: singular, reported before any solve (L6 report, wave 2)
  for (const solver of ['direct', 'pcg_mg'])
    assert.throws(() => solveThermal(g, { sources: [{ parts: 'die', power_W: 1 }], bcs: [{ selection: 'default', type: 'adiabatic' }] }, resolve, { solver }), /no temperature or htc boundary on the body with parts substrate, .*the steady problem is singular/);
  // a floating body (void gap) without its own boundary is named
  const fl = [...dieOnSub(), { id: 'island', kind: 'die', material: 'si', x_mm: 8, y_mm: 6, w_mm: 2, d_mm: 2, z_um: 4000, h_um: 100 }];
  const gf = buildGrid(fl, { max_xy_mm: 4 });
  assert.throws(() => solveThermal(gf, { bcs: [{ selection: 'top:lid', type: 'htc', h_W_m2K: 1e3, T_inf_C: 25 }] }, resolve), /body with parts island \(\d+ cells\)/);
  assert.throws(() => solveThermal(gf, { bcs: [{ selection: 'top:lid', type: 'htc', h_W_m2K: 0, T_inf_C: 25 }, { selection: 'top:island', type: 'htc', h_W_m2K: 1, T_inf_C: 25 }] }, resolve), /body with parts substrate/);
  // asymmetric source set under a crop
  const parts = dieOnSub();
  parts.push({ id: 'hs_a', kind: 'die', material: 'si', x_mm: 4, y_mm: 3, w_mm: 1, d_mm: 1, z_um: 1260, h_um: 30, in: 'die' }, { id: 'hs_b', kind: 'die', material: 'si', x_mm: -4, y_mm: 3, w_mm: 1, d_mm: 1, z_um: 1260, h_um: 30, in: 'die' });
  const gh = buildGrid(parts, { max_xy_mm: 4, symmetry: 'half_x' });
  assert.throws(() => solveThermal(gh, { sources: [{ parts: 'hs_a', power_W: 1 }], bcs: [{ selection: 'top:lid', type: 'temperature', T_C: 25 }] }, resolve), /not symmetric under the half_x crop/);
  assert.ok(solveThermal(gh, { sources: [{ parts: 'hs_*', power_W: 1 }], bcs: [{ selection: 'top:lid', type: 'temperature', T_C: 25 }] }, resolve).derived.heat_in_W - 1 < 1e-12);
});

test('MMS with Robin faces (audit A1 M9): Robin on top and bottom, Dirichlet on the sides, observed L2 order ~2', (t) => {
  // T = T0 + A sin(pi x / L) sin(pi y / L) (1 + z / Lz)^2 on [0, L]^2 x [0, Lz]; anisotropic k; Robin
  // -k_z dT/dn = h (T - T_inf) with T_inf = T + (k_z / h) dT/dn on z faces (n outward). Own construction.
  const L = 4e-3, Lz = 1e-3, A = 20, T0 = 310, h = 2e3, kk = [20, 5, 2];
  K.mmsr = kk;
  const parts = [{ id: 'blk', kind: 'layer', material: 'mmsr', x_mm: 2, y_mm: 2, w_mm: 4, d_mm: 4, z_um: 0, h_um: 1000 }];
  const S = (x, y) => Math.sin((Math.PI * x) / L) * Math.sin((Math.PI * y) / L);
  const Tm = (x, y, z) => T0 + A * S(x, y) * (1 + z / Lz) ** 2;
  const dTz = (x, y, z) => (A * S(x, y) * 2 * (1 + z / Lz)) / Lz;
  const f = (x, y, z) => A * S(x, y) * ((kk[0] + kk[1]) * (Math.PI / L) ** 2 * (1 + z / Lz) ** 2 - (2 * kk[2]) / Lz ** 2);
  const Tinf = (x, y, z) => (z > Lz / 2 ? Tm(x, y, z) + (kk[2] / h) * dTz(x, y, z) : Tm(x, y, z) - (kk[2] / h) * dTz(x, y, z));
  const errs = [];
  for (const n of [4, 8, 16, 32]) {
    const g = buildGrid(parts, { max_xy_mm: 4 / n, max_z_mm: 1 / n, grading: 1.3, max_nodes: 1e6 });
    const th = { bcs: [{ selection: 'side:blk', type: 'temperature', T_K_fn: Tm }, { selection: 'top:blk', type: 'htc', h_W_m2K: h, T_inf_K_fn: Tinf }, { selection: 'bottom:blk', type: 'htc', h_W_m2K: h, T_inf_K_fn: Tinf }] };
    const r = solveThermal(g, th, resolve, { solver: 'pcg_mg', rtol: 1e-12, sourceFn: f });
    assert.ok(r.derived.balance_rel < 1e-9, `${r.derived.balance_rel}`);
    const { nx, ny, nz, xs, ys, zs } = g, NX = nx + 1, NY = ny + 1, T = r.fields.T_K, G = GAUSS01[3];
    let e2 = 0;
    for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const hx = xs[i + 1] - xs[i], hy = ys[j + 1] - ys[j], hz = zs[k + 1] - zs[k], n0 = i + NX * (j + NY * k);
      const v = [T[n0], T[n0 + 1], T[n0 + NX], T[n0 + NX + 1], T[n0 + NX * NY], T[n0 + NX * NY + 1], T[n0 + NX * NY + NX], T[n0 + NX * NY + NX + 1]];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) {
        const u = G.x[a], w = G.x[b], s = G.x[c];
        let th2 = 0;
        for (let q = 0; q < 8; q++) th2 += v[q] * (q & 1 ? u : 1 - u) * ((q >> 1) & 1 ? w : 1 - w) * (q >> 2 ? s : 1 - s);
        const d = th2 - Tm(xs[i] + u * hx, ys[j] + w * hy, zs[k] + s * hz);
        e2 += d * d * G.w[a] * G.w[b] * G.w[c] * hx * hy * hz;
      }
    }
    errs.push(Math.sqrt(e2));
  }
  const orders = errs.slice(1).map((e, q) => Math.log(errs[q] / e) / Math.log(2));
  t.diagnostic(`Robin MMS L2 errors ${errs.map((e) => e.toExponential(3)).join(', ')}; orders ${orders.map((p) => p.toFixed(3)).join(', ')}`);
  for (const p of orders.slice(1)) assert.ok(p > 1.85 && p < 2.15, `orders ${orders}`);
});
