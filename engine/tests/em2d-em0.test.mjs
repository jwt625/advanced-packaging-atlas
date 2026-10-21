// EM-0 gates for the EM 2D cross-section solver (lane L7, R3 Sec. 5.1): FEM RLGC vs closed forms.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSection } from '../src/em2d/section.mjs';
import { makeMaterials } from '../src/em2d/dielectric.mjs';
import { prepareRlgc, rlgcAt, vacuumCapacitance } from '../src/em2d/rlgc.mjs';
import * as mtl from '../src/em2d/mtl.mjs';
import * as cf from '../src/em2d/closed-forms.mjs';

const solve = (spec, mats, opts, f = 1e9) => {
  const sec = buildSection(spec);
  const P = prepareRlgc(sec, makeMaterials(mats), opts);
  return { sec, P, r: rlgcAt(P, f) };
};
const near = (a, b, rel, msg) => {
  if (process.env.EM2D_GATE_LOG) console.log(`GATE ${msg}: rel ${(a / b - 1).toExponential(2)} (tol ${rel})`);
  return nearAssert(a, b, rel, msg);
};
const nearAssert = (a, b, rel, msg) => assert.ok(Math.abs(a / b - 1) <= rel, `${msg}: ${a} vs ${b} (rel ${(a / b - 1).toExponential(2)}, tol ${rel})`);

test('EM-0 coax: C, L, Z0 vs exact (PEC conductors, 256-gon circles)', () => {
  const a = 100,
    b = 100 * Math.E,
    n = 256;
  const spec = {
    box: { x: [-b - 30, b + 30], y: [-b - 30, b + 30] },
    background: 'd',
    conductors: [
      { name: 'in', role: 'signal', circle: { c: [0, 0], r: a, n } },
      { name: 'o1', role: 'ground', half_annulus: { c: [0, 0], r_in: b, r_out: b + 20, n: n / 2, upper: true } },
      { name: 'o2', role: 'ground', half_annulus: { c: [0, 0], r_in: b, r_out: b + 20, n: n / 2, upper: false } },
    ],
    mesh: { order: 2, max_edge_um: 20 },
  };
  const { r } = solve(spec, { d: { model: 'const', eps_r: 2.25 } }, { conductor_model: 'pec' });
  const ex = cf.coax({ a: a * 1e-6, b: b * 1e-6, epsR: 2.25 });
  near(r.C[0], ex.C, 2e-4, 'coax C');
  near(r.L[0], ex.L, 2e-4, 'coax L');
  near(Math.sqrt(r.L[0] / r.C[0]), ex.Z0, 2e-4, 'coax Z0');
});

test('EM-0 parallel plate (pmc side walls): C, G exact; R + j w L_int vs slab coth formula; DC R and L', () => {
  const w = 20,
    h = 5,
    t = 2,
    sigma = 5.8e7,
    er = 3.5,
    td = 0.01;
  const spec = {
    box: { x: [0, w], y: [-t, h + t] },
    background: 'diel',
    conductors: [
      { name: 'sig', role: 'signal', sigma_S_m: sigma, rect: { x: [0, w], y: [h, h + t] } },
      { name: 'gnd', role: 'ground', sigma_S_m: sigma, rect: { x: [0, w], y: [-t, 0] } },
    ],
    mesh: { order: 2, f_max_Hz: 100e9, skin_cells: 2, grade: 0.3, max_edge_um: 2 },
  };
  const sec = buildSection(spec);
  const P = prepareRlgc(sec, makeMaterials({ diel: { model: 'const', eps_r: er, tan_delta: td } }));
  const pp = cf.parallelPlate({ w: w * 1e-6, h: h * 1e-6, epsR: er });
  const W = w * 1e-6;
  const r0 = rlgcAt(P, 0);
  near(r0.C[0], pp.C, 1e-10, 'C');
  near(r0.R[0], 2 / (sigma * W * t * 1e-6), 1e-10, 'DC R = 2 / (sigma w t)');
  near(r0.L[0], pp.L + (2 * cf.MU0 * t * 1e-6) / (3 * W), 1e-6, 'DC L = mu0 h / w + 2 mu0 t / (3 w)');
  for (const f of [1e9, 10e9, 100e9]) {
    const r = rlgcAt(P, f);
    const zs = cf.slabSurfaceZ({ t: t * 1e-6, sigma, fHz: f });
    near(r.G[0] / (2 * Math.PI * f * r.C[0]), td, 1e-10, `G / (w C) at ${f / 1e9} GHz`);
    near(r.R[0], (2 * zs.re) / W, 1e-3, `R at ${f / 1e9} GHz`);
    near(r.L[0], pp.L + (2 * zs.im) / (2 * Math.PI * f) / W, 1e-4, `L at ${f / 1e9} GHz`);
    assert.ok(r.diag.power_balance_rel < 1e-8, 'dissipation split sums to Re Z');
  }
});

test('EM-0 microstrip Z0, eps_eff vs Hammerstad-Jensen (t/h = 0.02, PEC strip)', () => {
  const h = 100,
    er = 4.0,
    t = 2,
    B = 20;
  for (const u of [1, 3]) {
    const w = u * h;
    const spec = {
      box: { x: [-B * h, B * h], y: [-t, B * h], bc: { top: 'pec' } },
      background: 'air',
      dielectrics: [{ material: 'sub', rect: { x: [-B * h, B * h], y: [0, h] } }],
      conductors: [
        { name: 's', role: 'signal', rect: { x: [-w / 2, w / 2], y: [h, h + t] } },
        { name: 'g', role: 'ground', rect: { x: [-B * h, B * h], y: [-t, 0] } },
      ],
      mesh: { order: 2, conductor_cells: 2, grade: 0.3 },
    };
    const { P, r } = solve(spec, { sub: { model: 'const', eps_r: er } }, { conductor_model: 'pec' });
    const C0 = vacuumCapacitance(P)[0];
    const hj = cf.microstripHJ({ w, h, t, epsR: er });
    near(1 / (cf.C0 * Math.sqrt(r.C[0] * C0)), hj.Z0, 0.01, `u ${u} Z0`);
    near(r.C[0] / C0, hj.epsEff, 0.01, `u ${u} eps_eff`);
  }
});

test('EM-0 CPW vs conformal map (w 30, s 18 um, eps_r 9.3; R3 56.0 ohm case)', () => {
  const w = 30,
    s = 18,
    er = 9.3,
    t = 0.2,
    G = 300,
    H = 800;
  const ex = cf.cpwConformal({ w: w * 1e-6, s: s * 1e-6, epsR: er });
  assert.ok(Math.abs(ex.Z0_30pi - 56.0) < 0.01, `conformal 30 pi form ${ex.Z0_30pi}`);
  const X = w / 2 + s + G;
  const spec = {
    box: { x: [-X, X], y: [-H, H] },
    background: 'air',
    dielectrics: [{ material: 'sub', rect: { x: [-X, X], y: [-H, 0] } }],
    conductors: [
      { name: 's', role: 'signal', rect: { x: [-w / 2, w / 2], y: [0, t] } },
      { name: 'g1', role: 'ground', rect: { x: [-X, -w / 2 - s], y: [0, t] } },
      { name: 'g2', role: 'ground', rect: { x: [w / 2 + s, X], y: [0, t] } },
    ],
    mesh: { order: 2, conductor_cells: 1, grade: 0.25 },
  };
  const { P, r } = solve(spec, { sub: { model: 'const', eps_r: er } }, { conductor_model: 'pec' });
  const C0 = vacuumCapacitance(P)[0];
  near(1 / (cf.C0 * Math.sqrt(r.C[0] * C0)), ex.Z0, 0.01, 'CPW Z0 (t = 0.2 um; conformal map is zero thickness)');
});

test('EM-0 stripline vs Cohn (centred strip, t/b = 0.0025)', () => {
  const b = 200,
    w = 100,
    t = 0.5,
    er = 3.0;
  const spec = {
    box: { x: [-800, 800], y: [-b / 2, b / 2], bc: { bottom: 'pec', top: 'pec' } },
    background: 'd',
    conductors: [{ name: 's', role: 'signal', rect: { x: [-w / 2, w / 2], y: [-t / 2, t / 2] } }],
    mesh: { order: 2, conductor_cells: 1, grade: 0.3 },
  };
  const { r } = solve(spec, { d: { model: 'const', eps_r: er } }, { conductor_model: 'pec' });
  const ex = cf.striplineCohn({ w: w * 1e-6, b: b * 1e-6, epsR: er });
  near(Math.sqrt(r.L[0] / r.C[0]), ex.Z0, 0.01, 'stripline Z0');
  near(r.L[0] * r.C[0], cf.MU0 * cf.EPS0 * er, 1e-9, 'L C = mu eps (homogeneous, PEC)');
});

test('EM-0 symmetric coupled stripline, homogeneous: FEXT = 0, NEXT(lambda/4) = coupler value, unitarity, reciprocity', () => {
  const b = 200,
    w = 50,
    s = 30,
    t = 2,
    er = 3.8;
  const spec = {
    box: { x: [-600, 600], y: [-b / 2, b / 2], bc: { bottom: 'pec', top: 'pec' } },
    background: 'd',
    conductors: [
      { name: 'a', role: 'signal', rect: { x: [-s / 2 - w, -s / 2], y: [-t / 2, t / 2] } },
      { name: 'v', role: 'signal', rect: { x: [s / 2, s / 2 + w], y: [-t / 2, t / 2] } },
    ],
    mesh: { order: 2, conductor_cells: 2 },
  };
  const f = 10e9;
  const { r } = solve(spec, { d: { model: 'const', eps_r: er } }, { conductor_model: 'pec' }, f);
  const v = cf.C0 / Math.sqrt(er);
  const Ze = 1 / (v * (r.C[0] + r.C[1])),
    Zo = 1 / (v * (r.C[0] - r.C[1]));
  const zr = Math.sqrt(Ze * Zo);
  for (const len of [v / f / 4, 1e-3, 5e-3]) {
    const S = mtl.lineS(r, len, zr);
    const x = mtl.crosstalk(S);
    if (process.env.EM2D_GATE_LOG) console.log(`GATE coupled stripline len ${len}: FEXT ${x.FEXT_dB[0][1].toFixed(1)} dB, RL ${x.RL_dB[0].toFixed(1)} dB, unitarity ${mtl.unitarityError(S).toExponential(1)}, reciprocity ${mtl.reciprocityError(S).toExponential(1)}`);
    assert.ok(x.FEXT_dB[0][1] < -60, `FEXT ${x.FEXT_dB[0][1]} dB at ${len} m`);
    assert.ok(x.RL_dB[0] > 60, `match ${x.RL_dB[0]} dB`);
    assert.ok(mtl.unitarityError(S) < 1e-10, 'lossless unitarity');
    assert.ok(mtl.reciprocityError(S) < 1e-10, 'reciprocity');
  }
  const xq = mtl.crosstalk(mtl.lineS(r, v / f / 4, zr));
  if (process.env.EM2D_GATE_LOG) console.log(`GATE NEXT(lambda/4) ${xq.NEXT_dB[0][1].toFixed(4)} dB vs coupler ${(20 * Math.log10((Ze - Zo) / (Ze + Zo))).toFixed(4)} dB`);
  assert.ok(Math.abs(xq.NEXT_dB[0][1] - 20 * Math.log10((Ze - Zo) / (Ze + Zo))) < 0.01, 'NEXT at lambda/4 = (Ze - Zo)/(Ze + Zo)');
});

test('EM-0 skin effect: isolated round wire R(f), X_int(f) vs Bessel solution', () => {
  const a = 10,
    sigma = 5.8e7;
  for (const x of [1, 3, 10]) {
    const delta = (a / x) * 1e-6,
      f = 1 / (Math.PI * cf.MU0 * sigma * delta * delta);
    const spec = {
      box: { x: [-100, 100], y: [-100, 100], bc: { left: 'pec', right: 'pec', bottom: 'pec', top: 'pec' } },
      background: 'air',
      conductors: [{ name: 'w', role: 'signal', sigma_S_m: sigma, circle: { c: [0, 0], r: a, n: 128 } }],
      mesh: { order: 2, f_max_Hz: f, skin_cells: 2, grade: 0.3, max_edge_um: 20 },
    };
    const { sec, P, r } = solve(spec, {}, {}, f);
    const aEq = Math.sqrt(sec.conductors[0].areaUm2 / Math.PI) * 1e-6;
    const zi = cf.roundWireInternalZ({ a: aEq, sigma, fHz: f });
    const Lext = (cf.MU0 * cf.EPS0) / vacuumCapacitance(P)[0];
    near(r.R[0], zi.re, 2e-3, `R at a/delta = ${x}`);
    near(2 * Math.PI * f * (r.L[0] - Lext), zi.im, 2e-3, `X_int at a/delta = ${x}`);
    const r0 = rlgcAt(P, 0);
    near(r0.R[0], 1 / (sigma * sec.conductors[0].areaUm2 * 1e-12), 1e-12, 'DC R = 1 / (sigma A)');
  }
});

test('EM-0 lossy coupled microstrip: reciprocity, passivity, modal alpha vs low-loss R/(2 Z0) + G Z0 / 2', () => {
  const h = 30,
    w = 30,
    s = 30,
    t = 4,
    X = 400;
  const spec = {
    box: { x: [-X, X], y: [-4, 300] },
    background: 'air',
    dielectrics: [{ material: 'pi', rect: { x: [-X, X], y: [0, h] } }],
    conductors: [
      { name: 'a', role: 'signal', sigma_S_m: 5.8e7, rect: { x: [-s / 2 - w, -s / 2], y: [h, h + t] } },
      { name: 'v', role: 'signal', sigma_S_m: 5.8e7, rect: { x: [s / 2, s / 2 + w], y: [h, h + t] } },
      { name: 'g', role: 'ground', sigma_S_m: 5.8e7, rect: { x: [-X, X], y: [-4, 0] } },
    ],
    mesh: { order: 2, f_max_Hz: 50e9 },
  };
  const sec = buildSection(spec);
  const P = prepareRlgc(sec, makeMaterials({ pi: { model: 'djordjevic_sarkar', eps_r: 3.3, tan_delta: 0.02, f_ref_Hz: 10e9, f_low_Hz: 1e3, f_high_Hz: 1e12 } }));
  for (const f of [1e9, 20e9, 50e9]) {
    const r = rlgcAt(P, f);
    const S = mtl.lineS(r, 5e-3, 50);
    assert.ok(mtl.reciprocityError(S) < 1e-12, 'reciprocity');
    assert.ok(mtl.passivityMaxSv(S) < 1, 'passivity');
    const { Z, Y, w: om } = mtl.zyFromRlgc(r);
    const md = mtl.modalAnalysis(Z, Y, om);
    // even/odd modes of the symmetric pair: compare the mean single-line low-loss estimate (weak check, 10 %)
    const Ce = r.C[0] + r.C[1],
      Le = r.L[0] + r.L[1],
      Re = r.R[0] + r.R[1],
      Ge = r.G[0] + r.G[1];
    const z0e = Math.sqrt(Le / Ce);
    const ae = Re / (2 * z0e) + (Ge * z0e) / 2;
    const ao = (r.R[0] - r.R[1]) / (2 * Math.sqrt((r.L[0] - r.L[1]) / (r.C[0] - r.C[1]))) + ((r.G[0] - r.G[1]) * Math.sqrt((r.L[0] - r.L[1]) / (r.C[0] - r.C[1]))) / 2;
    const a = md.modes.map((m) => m.alpha_Np_m).sort((p, q) => p - q);
    const est = [ae, ao].sort((p, q) => p - q);
    near(a[0], est[0], 0.02, `mode alpha low at ${f / 1e9} GHz`);
    near(a[1], est[1], 0.02, `mode alpha high at ${f / 1e9} GHz`);
  }
});
