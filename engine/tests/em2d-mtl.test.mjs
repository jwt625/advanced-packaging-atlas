// Unit tests for the EM 2D post-processing stack (lane L7): dense complex LA, MTL chain / S conversions, mixed mode,
// Touchstone IO, dielectric and roughness models, case parsing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CMat, cmatEig, cmatExp, cmatInv, cmatMul, cmatAdd, cmatMaxAbs } from '../src/em2d/dense.mjs';
import * as mtl from '../src/em2d/mtl.mjs';
import { writeTouchstone, readTouchstone } from '../src/em2d/touchstone.mjs';
import { makeDielectric, dsBasis, nnls } from '../src/em2d/dielectric.mjs';
import { makeRoughness } from '../src/em2d/roughness.mjs';
import { parseEm2dCase, applyPatch, sweepFrequencies } from '../src/em2d/run.mjs';
import * as cf from '../src/em2d/closed-forms.mjs';

let seed = 7;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647 - 0.5;
};
const randC = (n, s = 1) => {
  const A = new CMat(n);
  for (let k = 0; k < n * n; k++) {
    A.re[k] = s * rnd();
    A.im[k] = s * rnd();
  }
  return A;
};
const diff = (A, B) => cmatMaxAbs(cmatAdd(A, B, 1, -1));

test('dense: eigen-decomposition residual, inverse, expm vs eigen', () => {
  for (const n of [1, 2, 4, 9, 24]) {
    const A = randC(n);
    const e = cmatEig(A);
    assert.ok(e.residual < 1e-12, `eig residual n=${n}: ${e.residual}`);
    assert.ok(diff(cmatMul(A, cmatInv(A)), CMat.eye(n)) < 1e-11, `inverse n=${n}`);
  }
  const A = randC(5, 4);
  const { values, vectors } = cmatEig(A);
  const D = new CMat(5);
  for (let i = 0; i < 5; i++) {
    const m = Math.exp(values.re[i]);
    D.re[i * 6] = m * Math.cos(values.im[i]);
    D.im[i * 6] = m * Math.sin(values.im[i]);
  }
  const E = cmatExp(A);
  assert.ok(diff(E, cmatMul(cmatMul(vectors, D), cmatInv(vectors))) / cmatMaxAbs(E) < 1e-12, 'expm vs V exp(L) V^-1');
  const S = CMat.eye(3, -2.5);
  assert.ok(cmatEig(S).residual < 1e-15, 'degenerate scalar matrix');
});

// a lossy, coupled, non-degenerate 3-line RLGC set (per metre), f = 5 GHz
const rl3 = () => {
  const f = 5e9;
  const L = [4e-7, 1e-7, 2e-8, 1e-7, 4.2e-7, 1.1e-7, 2e-8, 1.1e-7, 3.9e-7];
  const C = [1.1e-10, -2e-11, -3e-12, -2e-11, 1.15e-10, -2.2e-11, -3e-12, -2.2e-11, 1.05e-10];
  const R = [300, 40, 5, 40, 320, 45, 5, 45, 290];
  const G = C.map((c) => -0.0 + 2 * Math.PI * f * c * 0.01 * (c > 0 ? 1 : 1));
  return { f, R, L, G, C };
};

test('MTL: expm chain matrix = modal chain matrix; Y from chain is symmetric; S passive and reciprocal', () => {
  const r = rl3();
  const { Z, Y, w } = mtl.zyFromRlgc(r);
  for (const len of [1e-4, 3e-3, 2e-2]) {
    const T1 = mtl.chainMatrix(Z, Y, len),
      T2 = mtl.chainMatrixModal(Z, Y, len, w);
    assert.ok(diff(T1, T2) / cmatMaxAbs(T1) < 1e-10, `chain expm vs modal at ${len} m: ${diff(T1, T2)}`);
    const Yp = mtl.chainToY(T1);
    assert.ok(mtl.reciprocityError(Yp) / cmatMaxAbs(Yp) < 1e-10, 'Y symmetric');
    const S = mtl.yToS(Yp, 50);
    assert.ok(mtl.reciprocityError(S) < 1e-12, 'S reciprocal');
    assert.ok(mtl.passivityMaxSv(S) < 1, 'S passive');
  }
  // cascade: two halves = whole
  const T = mtl.chainMatrix(Z, Y, 4e-3);
  const Th = mtl.chainMatrix(Z, Y, 2e-3);
  assert.ok(diff(mtl.cascadeChain([Th, Th]), T) / cmatMaxAbs(T) < 1e-12, 'cascade of halves');
});

test('MTL: single matched lossless line S21 = exp(-j beta l); renormalization round trip; S <-> Z <-> Y', () => {
  const f = 10e9,
    L = 3e-7,
    C = 1.2e-10;
  const r = { f, R: [0], L: [L], G: [0], C: [C] };
  const z0 = Math.sqrt(L / C),
    len = 7e-3;
  const S = mtl.lineS(r, len, z0);
  const bl = 2 * Math.PI * f * Math.sqrt(L * C) * len;
  assert.ok(Math.hypot(S.re[2] - Math.cos(bl), S.im[2] + Math.sin(bl)) < 1e-12, 'S21 phase');
  assert.ok(Math.hypot(S.re[0], S.im[0]) < 1e-12, 'S11 = 0 when matched');
  const S50 = mtl.renormalize(S, z0, 50);
  assert.ok(diff(mtl.renormalize(S50, 50, z0), S) < 1e-12, 'renormalize round trip');
  assert.ok(diff(mtl.zToS(mtl.sToZ(S50, 50), 50), S50) < 1e-12, 'S <-> Z');
  assert.ok(diff(mtl.yToS(mtl.sToY(S50, 50), 50), S50) < 1e-12, 'S <-> Y');
});

test('MTL: mixed mode of two identical uncoupled lines', () => {
  const f = 10e9;
  const r = { f, R: [100, 0, 0, 100], L: [3e-7, 0, 0, 3e-7], G: [0, 0, 0, 0], C: [1.2e-10, 0, 0, 1.2e-10] };
  const S = mtl.lineS(r, 5e-3, 50);
  const mm = mtl.mixedMode(S, [
    [0, 1],
    [2, 3],
  ]);
  // Sdd21 = S31 (line transmission), Sdc = 0, Scc = Sdd
  assert.ok(Math.hypot(mm.Sdd.re[2] - S.re[2 * 4 + 0], mm.Sdd.im[2] - S.im[2 * 4 + 0]) < 1e-12, 'Sdd21 = S31');
  assert.ok(cmatMaxAbs(mm.Sdc) < 1e-12, 'no mode conversion');
  assert.ok(diff(mm.Scc, mm.Sdd) < 1e-12, 'Scc = Sdd for uncoupled lines');
});

test('Touchstone 2.0 write / read round trip (2-port and 4-port), 1.x MA parse', () => {
  for (const n of [2, 4]) {
    const S = [randC(n), randC(n)];
    const txt = writeTouchstone({ freqsHz: [1e9, 2.5e9], S, zref: 50, comments: ['test'] });
    const back = readTouchstone(txt);
    assert.equal(back.nPorts, n);
    assert.deepEqual(back.freqsHz, [1e9, 2.5e9]);
    for (let k = 0; k < 2; k++) assert.ok(diff(back.S[k], S[k]) < 1e-12, `round trip n=${n}`);
  }
  const v1 = '! v1\n# GHZ S MA R 50\n1.0 0.1 0 0.9 -90 0.9 -90 0.1 0\n';
  const p = readTouchstone(v1, { nPorts: 2 });
  assert.ok(Math.abs(p.S[0].re[2]) < 1e-15 && Math.abs(p.S[0].im[2] + 0.9) < 1e-15, 'S21 from 1.x order S11 S21 S12 S22');
});

test('dielectric: DS model is the log-uniform Debye distribution (causal), 1-point fit exact, NNLS', () => {
  const m = makeDielectric('x', { model: 'djordjevic_sarkar', eps_r: 3.3, tan_delta: 0.02, f_ref_Hz: 10e9, f_low_Hz: 1e3, f_high_Hz: 1e12 });
  const e0 = m.epsAt(10e9);
  assert.ok(Math.abs(e0.re - 3.3) < 1e-12 && Math.abs(-e0.im / e0.re - 0.02) < 1e-12, 'fit point reproduced');
  // F(w) = (1/ln(w2/w1)) int_{w1}^{w2} dW / (W (1 + j w / W)), midpoint rule in ln W with 20000 poles
  const w1 = 2 * Math.PI * 1e3,
    w2 = 2 * Math.PI * 1e12,
    w = 2 * Math.PI * 30e9;
  const n = 20000,
    du = Math.log(w2 / w1) / n;
  let re = 0,
    im = 0;
  for (let i = 0; i < n; i++) {
    const W = w1 * Math.exp((i + 0.5) * du),
      x = w / W,
      d = 1 + x * x;
    re += du / d;
    im -= (du * x) / d;
  }
  const F = dsBasis(w, w1, w2),
    s = Math.log(w2 / w1);
  assert.ok(Math.abs(re / s - F.re) < 1e-6 && Math.abs(im / s - F.im) < 1e-6, `DS = Debye integral (${re / s}, ${im / s}) vs (${F.re}, ${F.im})`);
  const x = nnls(Float64Array.from([1, 0, 0, 1, 1, 1]), Float64Array.from([2, -1, 1]), 3, 2);
  assert.ok(x[1] === 0 && x[0] > 0, 'nnls clamps negative component');
  const fit = makeDielectric('y', { model: 'causal_fit', points: [10, 30, 100].map((f) => ({ f_GHz: f, ...(() => ({ Dk: m.epsAt(f * 1e9).re, Df: -m.epsAt(f * 1e9).im / m.epsAt(f * 1e9).re }))() })) });
  assert.ok(fit.fit.max_rel_dk < 1e-3 && fit.fit.max_rel_df < 0.02, `causal fit recovers DS data: dk ${fit.fit.max_rel_dk}, df ${fit.fit.max_rel_df}`);
});

test('roughness: Hammerstad K -> 1 (low f) and -> 2 (high f); Huray -> area ratio at low f', () => {
  const h = makeRoughness({ model: 'hammerstad', rq_um: 0.2 });
  assert.ok(h.K(1e6, 5.8e7) - 1 < 1e-4 && 2 - h.K(1e15, 5.8e7) < 1e-3);
  assert.ok(Math.abs(h.K(1e9, 5.8e7) - cf.hammerstadK(0.2e-6, cf.skinDepth(1e9, 5.8e7))) < 1e-15);
  const c = makeRoughness({ model: 'cannonball', h_rms_um: 0.19 });
  assert.ok(c.K(1e3, 5.8e7) - 1 < 1e-4 && c.K(100e9, 5.8e7) > 1);
});

test('case parsing: unknown keys rejected, patch by element name, sweep merge', () => {
  assert.throws(() => parseEm2dCase({ schema: 'ap-sim/0', id: 'x', family: 'em2d', em2d: { sweep: {}, bogus: 1 } }), /unknown key bogus/);
  const base = { section: { conductors: [{ name: 'a', roughness: { model: 'hammerstad' } }, { name: 'b' }] } };
  const p = applyPatch(base, { section: { conductors: { a: { roughness: null } } } });
  assert.equal(p.section.conductors[0].roughness, undefined);
  assert.equal(base.section.conductors[0].roughness.model, 'hammerstad', 'base untouched');
  assert.deepEqual(sweepFrequencies({ start_GHz: 10, stop_GHz: 30, points: 3 }, [15, 20]), [10, 15, 20, 30]);
});
