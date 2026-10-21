// E3 RVE homogenization gates (lane L8): exact laminate (stack, strips), uniform-field CTE identity, Hill bounds,
// Hashin-Shtrikman bounds (2D problems), conduction cross-check with the L1 thermal solver, staircase convergence,
// library resolver output usable by the mechanics solver. License: GPL-3.0-or-later.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCell, buildCellPair } from '../src/homog/cells.mjs';
import { rveElastic, rveConduction, orthoFromS, nonOrthotropic } from '../src/homog/rve.mjs';
import { laminate } from '../src/homog/laminate.mjs';
import { createRveResolver, rveSpecOf } from '../src/homog/resolver.mjs';
import { explicitResolver, explicitRebase, solveMech } from '../src/mech/index.mjs';
import { stiffnessLab, invertDense } from '../src/mech/constitutive.mjs';
import { jacobiEigen } from '../src/la/sparse.mjs';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermal } from '../src/thermal/index.mjs';
import { library } from '../src/materials/node.mjs';

const SET = {
  cu: { E_GPa: 110, nu: 0.34, cte_ppmK: 17, k: 390 },
  ox: { E_GPa: 70, nu: 0.17, cte_ppmK: 0.5, k: 1.4 },
  uf: { E_GPa: 8, nu: 0.35, cte_ppmK: 30, k: 0.5 },
};
const R = explicitResolver(SET), RB = explicitRebase(SET);
const O = { resolve: R, rebase: RB, T_K: 298.15, Tsf_K: 398.15 };
const isoC = (k) => stiffnessLab({ type: 'iso', E_Pa: SET[k].E_GPa * 1e9, nu: SET[k].nu });
const isoA = (k) => [1, 1, 1, 0, 0, 0].map((v) => v * SET[k].cte_ppmK * 1e-6);
const relMax = (A, B) => { let m = 0, s = 0; for (let i = 0; i < A.length; i++) { m = Math.max(m, Math.abs(A[i] - B[i])); s = Math.max(s, Math.abs(B[i])); } return m / s; };
const kOf = (key) => [SET[key].k, SET[key].k, SET[key].k];
const eigMin = (M) => { const { values } = jacobiEigen(Float64Array.from(M), 6) ?? {}; return values ? Math.min(...values) : null; };

test('stack and strip cells reproduce the exact laminate (Backus) stiffness and CTE to round-off', () => {
  const st = rveElastic(buildCell({ topology: 'stack', layers: [{ material: 'cu', t: 0.3 }, { material: 'ox', t: 0.5 }, { material: 'uf', t: 0.2 }] }), O);
  const L = laminate([{ C: isoC('cu'), alpha: isoA('cu'), f: 0.3 }, { C: isoC('ox'), alpha: isoA('ox'), f: 0.5 }, { C: isoC('uf'), alpha: isoA('uf'), f: 0.2 }], 'z');
  assert.ok(relMax(st.C, L.C) < 1e-12, `stack C ${relMax(st.C, L.C)}`);
  assert.ok(relMax(st.alpha, L.alpha) < 1e-12, `stack alpha ${relMax(st.alpha, L.alpha)}`);
  for (const axis of ['x', 'y']) {
    const sp = rveElastic(buildCell({ topology: 'strip', axis, f: 0.37, inclusion: 'cu', matrix: 'ox', n: 16 }), O);
    const Ls = laminate([{ C: isoC('cu'), alpha: isoA('cu'), f: 0.37 }, { C: isoC('ox'), alpha: isoA('ox'), f: 0.63 }], axis === 'x' ? 'y' : 'x');
    assert.ok(relMax(sp.C, Ls.C) < 1e-12 && relMax(sp.alpha, Ls.alpha) < 1e-12, `strip ${axis}`);
  }
  // identical layers: the laminate returns the layer itself
  const same = laminate([{ C: isoC('cu'), alpha: isoA('cu'), f: 0.4 }, { C: isoC('cu'), alpha: isoA('cu'), f: 0.6 }], 'z');
  assert.ok(relMax(same.C, isoC('cu')) < 1e-14 && relMax(same.alpha, isoA('cu')) < 1e-14);
});

test('column cell: orthotropic, Hill bounds, uniform-field CTE identity (exact for two isotropic phases)', () => {
  const g = buildCell({ topology: 'column', axis: 'z', f: 0.1877, inclusion: 'cu', matrix: 'uf', n: 32 });
  const r = rveElastic(g, O);
  assert.ok(nonOrthotropic(r.C) < 1e-12 && r.asym < 1e-12);
  const f = g.phaseFractions[1];
  const Ci = isoC('cu'), Cm = isoC('uf');
  const Cv = Ci.map((v, i) => f * v + (1 - f) * Cm[i]);
  const Sv = invertDense(Ci, 6).map((v, i) => f * v + (1 - f) * invertDense(Cm, 6)[i]);
  const Cr = invertDense(Sv, 6);
  const scale = Math.max(...Cv);
  assert.ok(eigMin(Cv.map((v, i) => v - r.C[i])) > -1e-9 * scale, 'C_voigt - C_eff PSD');
  assert.ok(eigMin(r.C.map((v, i) => v - Cr[i])) > -1e-9 * scale, 'C_eff - C_reuss PSD');
  // uniform field: macro stress p* I gives equal strain in both phases (Levin 1967; Rosen and Hashin 1970)
  const K = (k) => SET[k].E_GPa * 1e9 / (3 * (1 - 2 * SET[k].nu));
  const dT = O.T_K - O.Tsf_K, aA = SET.cu.cte_ppmK * 1e-6, aB = SET.uf.cte_ppmK * 1e-6;
  const p = (-3 * (aA - aB) * dT) / (1 / K('cu') - 1 / K('uf'));
  const eStar = p / (3 * K('cu')) + aA * dT;
  for (let i = 0; i < 6; i++) {
    const SI = r.S[6 * i] + r.S[6 * i + 1] + r.S[6 * i + 2];
    const expect = ((i < 3 ? eStar : 0) - p * SI) / dT;
    assert.ok(Math.abs(r.alpha[i] - expect) < 1e-10 * aB, `alpha[${i}] ${r.alpha[i]} vs ${expect}`);
  }
});

test('column cell: axial shear and transverse conduction inside the 2D Hashin-Shtrikman bounds', () => {
  const g = buildCell({ topology: 'column', axis: 'z', f: 0.3, inclusion: 'cu', matrix: 'uf', n: 48 });
  const f = g.phaseFractions[1];
  const r = rveElastic(g, O), k = rveConduction(g, kOf).k;
  // 2D HS bounds for a scalar (anti-plane) problem with phase values a (inclusion, larger) and b
  const hs = (a, b) => [b + f / (1 / (a - b) + (1 - f) / (2 * b)), a + (1 - f) / (1 / (b - a) + f / (2 * a))];
  const G = (key) => SET[key].E_GPa * 1e9 / (2 * (1 + SET[key].nu));
  const Gxz = orthoFromS(r.S).Gxz;
  const [gl, gu] = hs(G('cu'), G('uf'));
  assert.ok(Gxz >= gl * (1 - 1e-9) && Gxz <= gu, `Gxz ${Gxz} not in [${gl}, ${gu}]`);
  const [kl, ku] = hs(390, 0.5);
  assert.ok(k[0] >= kl * (1 - 1e-9) && k[0] <= ku && Math.abs(k[0] - k[4]) < 1e-9 * k[0], `kxx ${k[0]} not in [${kl}, ${ku}]`);
  // axial direction: parallel (exact for a prismatic column)
  assert.ok(Math.abs(k[8] / (f * 390 + (1 - f) * 0.5) - 1) < 1e-12);
});

test('periodic conduction equals the L1 thermal solver on the mirror-symmetric cell (fixed T on x faces)', () => {
  const g = buildCell({ topology: 'column', axis: 'z', f: 0.2, inclusion: 'cu', matrix: 'uf', n: 16 });
  const kP = rveConduction(g, kOf).k[0];
  // the same staircase as box parts for buildGrid: one box per inclusion cell, matrix underneath (lower priority)
  const mm = (v) => v * 1e3;
  const parts = [{ id: 'm', kind: 'matrix', material: 'uf', x_mm: 0.5, y_mm: 0.5, w_mm: 1, d_mm: 1, z_um: 0, h_um: 1000, priority: 0 }];
  for (let j = 0; j < g.ny; j++) for (let i = 0; i < g.nx; i++)
    if (g.cellPart[i + g.nx * j] === 1) parts.push({ id: `c${i}_${j}`, kind: 'inc', material: 'cu', x_mm: mm(0.5 * (g.xs[i] + g.xs[i + 1])), y_mm: mm(0.5 * (g.ys[j] + g.ys[j + 1])), w_mm: mm(g.xs[i + 1] - g.xs[i]), d_mm: mm(g.ys[j + 1] - g.ys[j]), z_um: 0, h_um: 1000, priority: 1 });
  const grid = buildGrid(parts, { max_xy_mm: 1 / 16, min_cells_per_layer: 1, grading: 2 });
  const th = solveThermal(grid, { bcs: [{ selection: 'xmin:m', type: 'temperature', T_C: 0 }, { selection: 'xmax:m', type: 'temperature', T_C: 1 }, { selection: 'default', type: 'adiabatic' }] },
    (key) => ({ k_W_mK: kOf(key) }), { solver: 'direct' });
  // volume mean of k dT/dx (exact cell integral of the trilinear field) = heat per area (test function x), dT = 1 K
  const T = th.fields.T_K, NX = grid.nx + 1, NY = grid.ny + 1;
  let qx = 0;
  for (let k = 0, c = 0; k < grid.nz; k++)
    for (let j = 0; j < grid.ny; j++)
      for (let i = 0; i < grid.nx; i++, c++) {
        let d = 0;
        for (let a = 0; a < 4; a++) {
          const jj = j + (a & 1), kk = k + (a >> 1);
          d += T[i + 1 + NX * (jj + NY * kk)] - T[i + NX * (jj + NY * kk)];
        }
        const vol = (grid.xs[i + 1] - grid.xs[i]) * (grid.ys[j + 1] - grid.ys[j]) * (grid.zs[k + 1] - grid.zs[k]);
        qx += kOf(grid.materials[grid.cellMat[c]])[0] * (d / 4 / (grid.xs[i + 1] - grid.xs[i])) * vol;
      }
  const kT = (qx / 1e-9) * 1e-3;
  assert.ok(Math.abs(kT / kP - 1) < 1e-9, `L1 ${kT} vs periodic ${kP}`);
});

test('staircase convergence: microbump field (Cu in underfill, f 0.1877), fraction-interpolated pair, Richardson', () => {
  const out = [];
  for (const n of [16, 32, 64]) {
    const cells = buildCellPair({ topology: 'column', axis: 'z', f: 0.1877, inclusion: 'cu', matrix: 'uf', n });
    const rs = cells.map((g) => ({ f: g.achieved.inclusion_fraction, r: rveElastic(g, O) }));
    const w = rs.length === 2 ? (0.1877 - rs[0].f) / (rs[1].f - rs[0].f) : 0;
    const C = rs.length === 2 ? rs[0].r.C.map((v, i) => (1 - w) * v + w * rs[1].r.C[i]) : rs[0].r.C;
    out.push(orthoFromS(invertDense(C, 6)));
  }
  // staircase error is first order (L8 notes: Ex 12.071 / 11.904 / 11.806 / 11.760 GPa at n = 16 / 32 / 64 / 128);
  // Richardson with p = 1 from (n, 2n) pairs: (16, 32) and (32, 64) agree within 0.5 %
  for (const q of ['Ex', 'Gxz', 'Gxy']) {
    const d1 = out[0][q] - out[1][q], d2 = out[1][q] - out[2][q];
    assert.ok(Math.sign(d1) === Math.sign(d2) && Math.abs(d2) < Math.abs(d1), `${q} monotone`);
    const r1 = 2 * out[1][q] - out[0][q], r2 = 2 * out[2][q] - out[1][q];
    assert.ok(Math.abs(r2 / r1 - 1) < 5e-3, `${q} Richardson ${r1} vs ${r2}`);
  }
});

test('library resolver: RVE entry (ortho, secant CTE at Tsf, k), cached, usable by solveMech; void delegated', () => {
  const lib = library();
  const Rr = createRveResolver(lib, { n: 24 });
  const key = 'homog:microbump:copper+underfill:0.1877';
  assert.equal(rveSpecOf(key).topology, 'column');
  assert.equal(rveSpecOf('homog:rdl_layer:copper+oxide:0.5:x').topology, 'strip');
  const e = Rr.resolve(key, 298.15, { Tsf_K: 423.15 });
  assert.equal(e.homogenization, 'rve');
  assert.equal(e.elastic.type, 'ortho');
  assert.equal(e.cte.Tref_K, 423.15);
  assert.ok(e.k_W_mK.every((v) => v > 0));
  assert.ok(Rr.resolve(key, 298.15, { Tsf_K: 423.15 }) === e, 'cached');
  assert.throws(() => Rr.resolve(key, 298.15, {}), /Tsf_K/);
  const v = Rr.resolve('homog:bga:solder+void:0.2827', 298.15, { Tsf_K: 423.15 });
  assert.match(v.provenance.rve, /not applicable/);
  // a homogenized layer between Si and a substrate in a small plate
  const parts = [
    { id: 'sub', kind: 'substrate', material: 'core_lowcte', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 0, h_um: 500 },
    { id: 'bump', kind: 'microbump', material: key, x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 500, h_um: 40 },
    { id: 'die', kind: 'die', material: 'si_crystal', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 540, h_um: 300 },
  ];
  const r = solveMech(buildGrid(parts, { max_xy_mm: 1, symmetry: 'quarter' }), {
    resolve: Rr.resolve, rebase: Rr.rebase, supports: 'symmetry', stress_free_C: { default: 150 }, temperature: { uniform_C: 25 }, warpage: ['bottom:sub'],
  });
  assert.ok(Number.isFinite(r.derived.warpage[0].warpage_um) && r.derived.warpage[0].warpage_um > 0, 'dome after cooling');
});

test('precomputed RVE table: exact hits, T interpolation within 50 K, thermal-only rows, live fallback', async () => {
  const { buildRveTable } = await import('../src/homog/resolver.mjs');
  const lib = library();
  const key = 'homog:microbump:copper+underfill:0.2077';
  const live = createRveResolver(lib, { n: 16 });
  const table = buildRveTable(live, [
    { key, T_C: 25, Tsf_C: 150 }, { key, T_C: 75, Tsf_C: 150 },
    { key, T_C: 25, Tsf_C: null }, { key, T_C: 75, Tsf_C: null },
  ]);
  const json = JSON.parse(JSON.stringify(table));
  const R2 = createRveResolver(lib, { n: 16, table: json });
  const a = R2.resolve(key, 298.15, { Tsf_K: 423.15 }), b = live.resolve(key, 298.15, { Tsf_K: 423.15 });
  assert.equal(a.provenance.table.how, 'exact');
  assert.ok(Math.abs(a.elastic.Ex / b.elastic.Ex - 1) < 1e-12 && Math.abs(a.cte.alpha[0] / b.cte.alpha[0] - 1) < 1e-12);
  const m = R2.resolve(key, 323.15, { Tsf_K: 423.15 }), mLive = live.resolve(key, 323.15, { Tsf_K: 423.15 });
  assert.equal(m.provenance.table.how, 'interpolated');
  assert.ok(Math.abs(m.elastic.Ex / mLive.elastic.Ex - 1) < 1e-2, `interp Ex ${m.elastic.Ex} vs ${mLive.elastic.Ex}`);
  const kk = R2.resolve(key, 310, { need: ['k'] });
  assert.equal(kk.provenance.table.how, 'interpolated');
  R2.resolve(key, 298.15, { Tsf_K: 400 }); // other Tsf: live
  const st = R2.stats();
  assert.deepEqual([st.table_exact, st.table_interpolated, st.live_full], [1, 2, 1]);
});
