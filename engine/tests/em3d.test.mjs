// E6 phase-1 gates for the 3D EM block solver (lane L7): waveguide TE10, matched line, PML reflection vs thickness,
// coax 3D vs 2D, microstrip 3D block + 2D segments = 2D, IBC / thin-conductor loss, reciprocity, passivity, DOF guard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayeredMesh } from '../src/em3d/mesh.mjs';
import { prepare3d, solveAt } from '../src/em3d/solver.mjs';
import { starProduct, s2abcd, lineFromAbcd } from '../src/em3d/cascade.mjs';
import { makeMaterials } from '../src/em2d/dielectric.mjs';
import { buildSection } from '../src/em2d/section.mjs';
import { prepareRlgc, rlgcAt } from '../src/em2d/rlgc.mjs';
import * as mtl from '../src/em2d/mtl.mjs';
import { cmatMaxAbs, cmatAdd } from '../src/em2d/dense.mjs';
import * as cf from '../src/em2d/closed-forms.mjs';

const log = (m) => process.env.EM2D_GATE_LOG && console.log(`GATE ${m}`);
const dB = (S, k) => 20 * Math.log10(Math.hypot(S.re[k], S.im[k]));

test('E6 rectangular waveguide TE10: beta from S21 phase, matched ports, DOF guard', () => {
  const a = 1000,
    b = 500,
    L = 3000,
    f = 200e9;
  const spec = { box: { x: [0, L], y: [0, a], z: [0, b] }, solids: [], mesh: { max_edge_um: 100, max_dz_um: 100, grade: 1 } };
  const opts = { materials: makeMaterials({}), background: 'air', solidProps: [], ports: [{ name: 'p1', side: 'xmin', mode: { type: 'te10' } }, { name: 'p2', side: 'xmax', mode: { type: 'te10' } }] };
  const mesh = buildLayeredMesh(spec);
  assert.throws(() => prepare3d(mesh, { ...opts, max_dof: 1000 }), /DOF budget exceeded/);
  const P = prepare3d(mesh, opts);
  const r = solveAt(P, f);
  const k0 = (2 * Math.PI * f) / cf.C0,
    beta = Math.sqrt(k0 * k0 - (Math.PI / (a * 1e-6)) ** 2);
  let ph = -Math.atan2(r.S.im[2], r.S.re[2]);
  while (ph < beta * L * 1e-6 - Math.PI) ph += 2 * Math.PI;
  const rel = ph / (beta * L * 1e-6) - 1;
  log(`waveguide TE10 dof ${P.nFree}: beta rel ${rel.toExponential(2)}, S11 ${dB(r.S, 0).toFixed(1)} dB, |S21| ${Math.hypot(r.S.re[2], r.S.im[2]).toFixed(5)}`);
  assert.ok(Math.abs(rel) < 0.015, `beta ${rel}`);
  assert.ok(dB(r.S, 0) < -40, 'S11 < -40 dB');
  assert.ok(mtl.reciprocityError(r.S) < 1e-10 && mtl.passivityMaxSv(r.S) <= 1 + 1e-9);
});

test('E6 coax (PEC and IBC) 3D vs 2D: Z0, beta, IBC attenuation vs Rs (1/a + 1/b) / (2 eta ln(b/a))', () => {
  const a = 100,
    b = 230,
    R = 260,
    L = 1000,
    n = 16,
    nb = 37;
  const mesh = buildLayeredMesh({
    box: { x: [-R, R], y: [-R, R], z: [0, L] },
    solids: [
      { name: 'outer', kind: 'conductor', rect: { x: [-R, R], y: [-R, R] }, z: [0, L] },
      { name: 'diel', kind: 'dielectric', circle: { c: [0, 0], r: b, n: nb }, z: [0, L] },
      { name: 'inner', kind: 'conductor', circle: { c: [0, 0], r: a, n }, z: [0, L] },
    ],
    mesh: { max_edge_um: 40, max_dz_um: 100, grade: 1 },
  });
  const ports = [
    { name: 'p1', side: 'zmin', mode: { type: 'tem', signal: 'inner' } },
    { name: 'p2', side: 'zmax', mode: { type: 'tem', signal: 'inner' } },
  ];
  const er = 2.25;
  const P = prepare3d(mesh, { materials: makeMaterials({ d: { model: 'const', eps_r: er } }), background: 'd', solidProps: [{ kind: 'conductor', model: 'pec' }, { kind: 'dielectric', material: 'd' }, { kind: 'conductor', model: 'pec' }], ports });
  // 2D reference: em2d on the same polygons, fine mesh
  const sec = buildSection({
    box: { x: [-R, R], y: [-R, R] },
    background: 'd',
    conductors: [
      { name: 'in', role: 'signal', circle: { c: [0, 0], r: a, n } },
      { name: 'o1', role: 'ground', half_annulus: { c: [0, 0], r_in: b, r_out: R - 5, n: 19, upper: true } },
      { name: 'o2', role: 'ground', half_annulus: { c: [0, 0], r_in: b, r_out: R - 5, n: 19, upper: false } },
    ],
    mesh: { order: 2, max_edge_um: 10 },
  });
  for (const f of [10e9, 50e9]) {
    const r = solveAt(P, f);
    const ln = lineFromAbcd(s2abcd(r.S, r.ports[0].Z0[0]));
    const beta = (2 * Math.PI * f * Math.sqrt(er)) / cf.C0;
    const r2 = rlgcAt(prepareRlgc(sec, makeMaterials({ d: { model: 'const', eps_r: er } }), { conductor_model: 'pec' }), f);
    const z2 = Math.sqrt(r2.L[0] / r2.C[0]);
    log(`coax PEC ${f / 1e9} GHz dof ${P.nFree}: Z0 3D ${ln.Zc.re.toFixed(3)} vs em2d ${z2.toFixed(3)} (${(ln.Zc.re / z2 - 1).toExponential(2)}), beta rel ${(ln.gammaL.im / (L * 1e-6) / beta - 1).toExponential(2)}, S11 ${dB(r.S, 0).toFixed(1)} dB`);
    assert.ok(Math.abs(ln.Zc.re / z2 - 1) < 0.01, 'Z0 3D vs 2D');
    assert.ok(Math.abs(ln.gammaL.im / (L * 1e-6) / beta - 1) < 2e-3, 'beta');
    assert.ok(dB(r.S, 0) < -50, 'S11');
    assert.ok(mtl.reciprocityError(r.S) < 1e-10 && mtl.passivityMaxSv(r.S) <= 1 + 1e-9);
  }
  const sigma = 5.8e6;
  const Pi = prepare3d(mesh, { materials: makeMaterials({}), background: 'air', solidProps: [{ kind: 'conductor', model: 'ibc', sigma_S_m: sigma }, { kind: 'dielectric', material: 'air' }, { kind: 'conductor', model: 'ibc', sigma_S_m: sigma }], ports });
  for (const f of [10e9, 40e9]) {
    const r = solveAt(Pi, f);
    const ln = lineFromAbcd(s2abcd(r.S, r.ports[0].Z0[0]));
    const ac = (cf.surfaceResistance(f, sigma) * (1 / a + 1 / b) * 1e6) / (2 * cf.ETA0 * Math.log(b / a));
    const rel = ln.gammaL.re / (L * 1e-6) / ac - 1;
    log(`coax IBC ${f / 1e9} GHz: alpha rel ${rel.toExponential(2)}`);
    assert.ok(Math.abs(rel) < 0.02, `IBC alpha ${rel}`);
    assert.ok(mtl.passivityMaxSv(r.S) < 1);
  }
});

test('E6 thin-conductor transition BC: sheet between plates, t/delta = 0.5, 1, 3 vs Zs coth(k t / 2) line', () => {
  const H = 20,
    W = 50,
    L = 2000,
    sigma = 5.8e7,
    f = 10e9;
  const d = cf.skinDepth(f, sigma) * 1e6;
  for (const tr of [0.5, 1, 3]) {
    const t = tr * d;
    const mesh = buildLayeredMesh({ box: { x: [0, L], y: [0, W], z: [0, H] }, solids: [{ name: 'sheet', kind: 'conductor', rect: { x: [0, L], y: [0, W] }, z: [H / 2 - t / 2, H / 2 + t / 2] }], mesh: { max_edge_um: 50, max_dz_um: 2, grade: 1 } });
    const P = prepare3d(mesh, {
      materials: makeMaterials({}),
      background: 'air',
      solidProps: [{ kind: 'conductor', model: 'thin', sigma_S_m: sigma }],
      bc: { ymin: 'pmc', ymax: 'pmc' },
      ports: [
        { name: 'p1', side: 'xmin', mode: { type: 'tem', signal: 'sheet' } },
        { name: 'p2', side: 'xmax', mode: { type: 'tem', signal: 'sheet' } },
      ],
    });
    assert.ok(P.thinPairs.length > 0, 'faces paired');
    const r = solveAt(P, f);
    const ln = lineFromAbcd(s2abcd(r.S, r.ports[0].Z0[0]));
    const w = 2 * Math.PI * f,
      hh = ((H - t) / 2) * 1e-6,
      Wm = W * 1e-6;
    const zs = cf.slabSurfaceZ({ t: (t / 2) * 1e-6, sigma, fHz: f });
    const Zp = { re: zs.re / (2 * Wm), im: (w * cf.MU0 * hh) / (2 * Wm) + zs.im / (2 * Wm) },
      Yi = (w * 2 * cf.EPS0 * Wm) / hh;
    const ZY = { re: -Zp.im * Yi, im: Zp.re * Yi };
    const m = Math.hypot(ZY.re, ZY.im),
      gre = Math.sqrt((m + ZY.re) / 2);
    const rel = ln.gammaL.re / (L * 1e-6) / gre - 1;
    log(`thin sheet t/delta ${tr}: alpha rel ${rel.toExponential(2)}`);
    assert.ok(Math.abs(rel) < 1e-3, `thin alpha ${rel}`);
  }
});

const microstrip = (L3, pmlL, f) => {
  const h = 100,
    w = 200,
    t = 10,
    Y = 500,
    Z = 600,
    mats = { sub: { model: 'const', eps_r: 3.5, tan_delta: 0.01 } };
  const mesh = buildLayeredMesh({
    axis: 'x',
    box: { x: [0, L3 + pmlL], y: [-Y, Y], z: [0, Z] },
    solids: [
      { name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, L3 + pmlL], y: [-Y, Y], z: [0, h] } },
      { name: 'strip', kind: 'conductor', box_um: { x: [0, L3 + pmlL], y: [-w / 2, w / 2], z: [h, h + t] }, h_um: 10 },
    ],
    mesh: { max_edge_um: 100, max_dz_um: 200, grade: 0.5 },
  });
  const ports = [{ name: 'p1', side: 'xmin', mode: { type: 'tem', signal: 'strip' } }];
  if (!pmlL) ports.push({ name: 'p2', side: 'xmax', mode: { type: 'tem', signal: 'strip' } });
  const P = prepare3d(mesh, { materials: makeMaterials(mats), background: 'air', solidProps: [{ kind: 'dielectric', material: 'sub' }, { kind: 'conductor', model: 'pec' }], bc: {}, ports, pml: pmlL ? { xmax: { thickness_um: pmlL, R0: 1e-6, order: 2 } } : {} });
  return { P, r: solveAt(P, f), mats, h, w, t, Y, Z };
};

test('E6 shielded microstrip: matched 3D block + 2D segments = 2D line; reciprocity, passivity', () => {
  for (const f of [5e9, 20e9]) {
    const L3 = 1000;
    const { P, r, mats, h, w, t, Y, Z } = microstrip(L3, 0, f);
    const pc = r.ports[0],
      z0 = pc.Z0[0];
    // 2D line from the port-face quasi-TEM solve (same cross-section mesh as the 3D block)
    const rp = { f, R: [0], L: [(cf.MU0 * cf.EPS0) / pc.C0], G: [-2 * Math.PI * f * pc.C[1]], C: [pc.C[0]] };
    const casc = starProduct(starProduct(mtl.lineS(rp, 2e-3, z0), r.S), mtl.lineS(rp, 3e-3, z0));
    const e1 = cmatMaxAbs(cmatAdd(casc, mtl.lineS(rp, (5000 + L3) * 1e-6, z0), 1, -1));
    // and against an independent fine em2d solve of the same cross-section
    const sec = buildSection({ box: { x: [-Y, Y], y: [0, Z], bc: { left: 'pec', right: 'pec', bottom: 'pec', top: 'pec' } }, background: 'air', dielectrics: [{ material: 'sub', rect: { x: [-Y, Y], y: [0, h] } }], conductors: [{ name: 's', role: 'signal', rect: { x: [-w / 2, w / 2], y: [h, h + t] } }], mesh: { order: 2, conductor_cells: 2 } });
    const r2 = rlgcAt(prepareRlgc(sec, makeMaterials(mats), { conductor_model: 'pec' }), f);
    const casc2 = starProduct(starProduct(mtl.lineS(r2, 2e-3, z0), r.S), mtl.lineS(r2, 3e-3, z0));
    const e2 = cmatMaxAbs(cmatAdd(casc2, mtl.lineS(r2, (5000 + L3) * 1e-6, z0), 1, -1));
    log(`microstrip ${f / 1e9} GHz dof ${P.nFree}: S11 ${dB(r.S, 0).toFixed(1)} dB; |cascade - 2D| port-mesh ${e1.toExponential(2)}, fine em2d ${e2.toExponential(2)} (Z0 ${z0.toFixed(2)} vs ${Math.sqrt(r2.L[0] / r2.C[0]).toFixed(2)})`);
    assert.ok(dB(r.S, 0) < -40, 'matched line S11 < -40 dB');
    assert.ok(e1 < 5e-3, 'cascade vs port-mesh 2D');
    assert.ok(e2 < 2e-2, 'cascade vs fine em2d');
    assert.ok(mtl.reciprocityError(r.S) < 1e-12 && mtl.passivityMaxSv(r.S) < 1);
  }
});

test('E6 PML: microstrip terminated in a PML, reflection falls with PML thickness (2, 4, 8 cells)', () => {
  const out = [400, 800, 1600].map((pl) => dB(microstrip(600, pl, 20e9).r.S, 0));
  log(`PML S11 (dB) for 2 / 4 / 8 cells: ${out.map((v) => v.toFixed(1)).join(' / ')}`);
  assert.ok(out[0] > out[1] && out[1] > out[2], 'monotonic');
  assert.ok(out[2] < -35, '8 cells < -35 dB');
});

test('E6 thin conductor backed by a PEC wall (audit A2 M4): ground sheet on the pec box bottom, t/delta 0.5 / 1 / 3', () => {
  const H = 20,
    W = 50,
    L = 2000,
    sigma = 5.8e7,
    f = 10e9;
  const d = cf.skinDepth(f, sigma) * 1e6;
  for (const tr of [0.5, 1, 3]) {
    const t = tr * d;
    const mesh = buildLayeredMesh({
      box: { x: [0, L], y: [0, W], z: [0, H] },
      solids: [
        { name: 'gnd', kind: 'conductor', rect: { x: [0, L], y: [0, W] }, z: [0, t] },
        { name: 'plate', kind: 'conductor', rect: { x: [0, L], y: [0, W] }, z: [H - 1, H] },
      ],
      mesh: { max_edge_um: 50, max_dz_um: 2, grade: 1 },
    });
    const P = prepare3d(mesh, {
      materials: makeMaterials({}),
      background: 'air',
      solidProps: [{ kind: 'conductor', model: 'thin', sigma_S_m: sigma }, { kind: 'conductor', model: 'pec' }],
      bc: { ymin: 'pmc', ymax: 'pmc', zmin: 'pec', zmax: 'pmc' },
      ports: [
        { name: 'p1', side: 'xmin', mode: { type: 'tem', signal: 'plate' } },
        { name: 'p2', side: 'xmax', mode: { type: 'tem', signal: 'plate' } },
      ],
    });
    const r = solveAt(P, f);
    const ln = lineFromAbcd(s2abcd(r.S, r.zref[0]));
    const w = 2 * Math.PI * f,
      hh = (H - 1 - t) * 1e-6,
      Wm = W * 1e-6;
    // E = 0 behind: series Z' = j w mu0 h / W + Zs tanh(k t) / W, Zs = (1 + j)/(sigma delta), k = (1 + j)/delta
    const x = t / d,
      Zsr = 1 / (sigma * d * 1e-6);
    const den = Math.cosh(2 * x) + Math.cos(2 * x);
    const th = [Math.sinh(2 * x) / den, Math.sin(2 * x) / den]; // tanh((1 + j) x)
    const zt = [Zsr * (th[0] - th[1]), Zsr * (th[0] + th[1])]; // (1 + j) Zsr tanh
    const Zp = { re: zt[0] / Wm, im: (w * cf.MU0 * hh) / Wm + zt[1] / Wm },
      Yi = (w * cf.EPS0 * Wm) / hh;
    const ZY = { re: -Zp.im * Yi, im: Zp.re * Yi };
    const m = Math.hypot(ZY.re, ZY.im),
      gre = Math.sqrt((m + ZY.re) / 2);
    const rel = ln.gammaL.re / (L * 1e-6) / gre - 1;
    log(`thin ground on pec wall t/delta ${tr}: alpha rel ${rel.toExponential(2)}`);
    assert.ok(Math.abs(rel) < 1e-3, `pec-backed thin alpha ${rel}`);
  }
});
