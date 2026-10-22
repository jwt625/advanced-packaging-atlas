// Lane L22 gates (DevLog-014): order-2 hierarchical Nedelec elements, GMRES + p-multigrid, lumped ports.
// EM2D_GATE_LOG=1 prints the gate values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayeredMesh } from '../src/em3d/mesh.mjs';
import { prepare3d, solveAt } from '../src/em3d/solver.mjs';
import { tetGeometry, tetMatrices, faceMass } from '../src/em3d/elements.mjs';
import { tetMatricesP, triTraceMass } from '../src/em3d/hcurl.mjs';
import { s2abcd, lineFromAbcd } from '../src/em3d/cascade.mjs';
import { makeMaterials } from '../src/em2d/dielectric.mjs';
import { renormalize, reciprocityError, passivityMaxSv } from '../src/em2d/mtl.mjs';
import * as cf from '../src/em2d/closed-forms.mjs';

const log = (m) => process.env.EM2D_GATE_LOG && console.log(`GATE ${m}`);
const dB = (S, k) => 20 * Math.log10(Math.hypot(S.re[k], S.im[k]));
const maxDiff = (A, B) => {
  let m = 0;
  for (let k = 0; k < A.re.length; k++) m = Math.max(m, Math.hypot(A.re[k] - B.re[k], A.im[k] - B.im[k]));
  return m;
};

test('L22 hierarchical basis: order-1 tables = Whitney elements; edge gradients curl-free; order-2 mass SPD', () => {
  const nodes = Float64Array.from([0, 0, 0, 1.3e-6, 0.1e-6, 0, 0.2e-6, 1.1e-6, 0.1e-6, 0.3e-6, 0.2e-6, 0.9e-6]);
  const g = new Float64Array(12);
  const V = tetGeometry(nodes, [0, 1, 2, 3], g);
  const nu = { re: [1, 1.5, 0.7], im: [0, 0.2, -0.1] },
    eps = { re: [2, 3, 4], im: [0.1, 0, 0.3] };
  const a = [0, 1, 2, 3].map(() => new Float64Array(36)),
    b = [0, 1, 2, 3].map(() => new Float64Array(36));
  tetMatrices(g, V, nu, eps, ...a);
  tetMatricesP(1, g, V, nu, eps, ...b);
  let d = 0,
    mx = 0;
  for (let k = 0; k < 4; k++)
    for (let i = 0; i < 36; i++) {
      d = Math.max(d, Math.abs(a[k][i] - b[k][i]));
      mx = Math.max(mx, Math.abs(a[k][i]));
    }
  assert.ok(d / mx < 1e-14, `order 1 vs Whitney ${d / mx}`);
  const fm = faceMass(nodes, [0, 1, 2]).T,
    tm = triTraceMass(1, nodes, [0, 1, 2]).T;
  for (let i = 0; i < 9; i++) assert.ok(Math.abs(fm[i] - tm[i]) < 1e-14 * Math.abs(fm[0]));
  const c = [0, 1, 2, 3].map(() => new Float64Array(400));
  tetMatricesP(2, g, V, nu, eps, ...c);
  let cmax = 0;
  for (const v of c[0]) cmax = Math.max(cmax, Math.abs(v));
  for (let i = 6; i < 12; i++) for (let j = 0; j < 20; j++) assert.equal(c[0][20 * i + j], 0);
  // real mass with eps = 1: Cholesky succeeds
  const M = new Float64Array(400);
  tetMatricesP(2, g, V, { re: [1, 1, 1], im: [0, 0, 0] }, { re: [1, 1, 1], im: [0, 0, 0] }, new Float64Array(400), new Float64Array(400), M, new Float64Array(400));
  const L = M.slice();
  for (let j = 0; j < 20; j++) {
    let s = L[21 * j];
    for (let k = 0; k < j; k++) s -= L[20 * j + k] ** 2;
    assert.ok(s > 0, 'mass SPD');
    L[21 * j] = Math.sqrt(s);
    for (let i = j + 1; i < 20; i++) {
      let t = L[20 * i + j];
      for (let k = 0; k < j; k++) t -= L[20 * i + k] * L[20 * j + k];
      L[20 * i + j] = t / L[21 * j];
    }
  }
});

const te10 = (order, solver) => {
  const a = 1000,
    L = 3000,
    f = 200e9;
  const mesh = buildLayeredMesh({ box: { x: [0, L], y: [0, a], z: [0, 500] }, solids: [], mesh: { max_edge_um: 200, max_dz_um: 200, grade: 1 } });
  const P = prepare3d(mesh, { order, solver, materials: makeMaterials({}), background: 'air', solidProps: [], ports: [{ name: 'p1', side: 'xmin', mode: { type: 'te10' } }, { name: 'p2', side: 'xmax', mode: { type: 'te10' } }] });
  const r = solveAt(P, f);
  const k0 = (2 * Math.PI * f) / cf.C0,
    beta = Math.sqrt(k0 * k0 - (Math.PI / (a * 1e-6)) ** 2);
  let ph = -Math.atan2(r.S.im[2], r.S.re[2]);
  while (ph < beta * L * 1e-6 - Math.PI) ph += 2 * Math.PI;
  return { P, r, rel: ph / (beta * L * 1e-6) - 1 };
};

test('L22 G1 TE10 at order 2 (h 200 um): beta, S11; iterative = direct (G4, G5)', () => {
  const d = te10(2, 'direct');
  log(`TE10 order 2 dof ${d.P.nFree}: beta rel ${d.rel.toExponential(2)}, S11 ${dB(d.r.S, 0).toFixed(1)} dB (order 1 gate at h 100: 1.06e-2, -51.7 dB)`);
  assert.ok(Math.abs(d.rel) < 1e-4, `beta ${d.rel}`);
  assert.ok(dB(d.r.S, 0) < -80, 'S11 < -80 dB');
  assert.ok(reciprocityError(d.r.S) < 1e-10 && passivityMaxSv(d.r.S) <= 1 + 1e-9);
  const it = te10(2, 'iterative');
  const its = it.r.solver.solves.map((s) => s.iterations);
  log(`TE10 order 2 iterative: |S - S_direct| ${maxDiff(it.r.S, d.r.S).toExponential(2)}, GMRES iterations ${its.join(' / ')}, coarse ${it.P.pmg.nc} DOF`);
  assert.ok(maxDiff(it.r.S, d.r.S) < 1e-8, 'iterative = direct');
  assert.ok(Math.max(...its) <= 40, `iterations ${its}`);
});

test('L22 G2 coax at order 2: Z0 vs em2d (P2, same polygons) and beta; iterative = direct', () => {
  const a = 100,
    b = 230,
    R = 260,
    L = 1000;
  const mesh = buildLayeredMesh({
    box: { x: [-R, R], y: [-R, R], z: [0, L] },
    solids: [
      { name: 'outer', kind: 'conductor', rect: { x: [-R, R], y: [-R, R] }, z: [0, L] },
      { name: 'diel', kind: 'dielectric', circle: { c: [0, 0], r: b, n: 37 }, z: [0, L] },
      { name: 'inner', kind: 'conductor', circle: { c: [0, 0], r: a, n: 16 }, z: [0, L] },
    ],
    mesh: { max_edge_um: 60, max_dz_um: 200, grade: 1 },
  });
  const er = 2.25;
  const opts = { order: 2, materials: makeMaterials({ d: { model: 'const', eps_r: er } }), background: 'd', solidProps: [{ kind: 'conductor', model: 'pec' }, { kind: 'dielectric', material: 'd' }, { kind: 'conductor', model: 'pec' }], ports: [{ name: 'p1', side: 'zmin', mode: { type: 'tem', signal: 'inner' } }, { name: 'p2', side: 'zmax', mode: { type: 'tem', signal: 'inner' } }] };
  const P = prepare3d(mesh, { ...opts, solver: 'direct' });
  const f = 10e9;
  const r = solveAt(P, f);
  const ln = lineFromAbcd(s2abcd(r.S, r.ports[0].Z0[0]));
  const beta = (2 * Math.PI * f * Math.sqrt(er)) / cf.C0;
  const z2 = 33.692; // em2d P2 max_edge 10 um on the same polygons (em3d.test.mjs coax gate, EM2D_GATE_LOG)
  log(`coax order 2 dof ${P.nFree}: Z0 3D ${ln.Zc.re.toFixed(4)} vs em2d ${z2} (${(ln.Zc.re / z2 - 1).toExponential(2)}), beta rel ${(ln.gammaL.im / (L * 1e-6) / beta - 1).toExponential(2)}, S11 ${dB(r.S, 0).toFixed(1)} dB`);
  assert.ok(Math.abs(ln.Zc.re / z2 - 1) < 2e-3, 'Z0 within 0.2 %');
  assert.ok(Math.abs(ln.gammaL.im / (L * 1e-6) / beta - 1) < 1e-4, 'beta');
  const Pi = prepare3d(mesh, { ...opts, solver: 'iterative' });
  const ri = solveAt(Pi, f);
  const its = ri.solver.solves.map((s) => s.iterations);
  log(`coax order 2 iterative: |S - S_direct| ${maxDiff(ri.S, r.S).toExponential(2)}, iterations ${its.join(' / ')}`);
  assert.ok(maxDiff(ri.S, r.S) < 1e-8);
  assert.ok(Math.max(...its) <= 80, `iterations ${its}`);
});

test('L22 order 2 thin-conductor transition BC: sheet between plates, t/delta 0.5 / 3', () => {
  const H = 20,
    W = 50,
    L = 2000,
    sigma = 5.8e7,
    f = 10e9;
  const d = cf.skinDepth(f, sigma) * 1e6;
  for (const tr of [0.5, 3]) {
    const t = tr * d;
    const mesh = buildLayeredMesh({ box: { x: [0, L], y: [0, W], z: [0, H] }, solids: [{ name: 'sheet', kind: 'conductor', rect: { x: [0, L], y: [0, W] }, z: [H / 2 - t / 2, H / 2 + t / 2] }], mesh: { max_edge_um: 100, max_dz_um: 4, grade: 1 } });
    const P = prepare3d(mesh, { order: 2, materials: makeMaterials({}), background: 'air', solidProps: [{ kind: 'conductor', model: 'thin', sigma_S_m: sigma }], bc: { ymin: 'pmc', ymax: 'pmc' }, ports: [{ name: 'p1', side: 'xmin', mode: { type: 'tem', signal: 'sheet' } }, { name: 'p2', side: 'xmax', mode: { type: 'tem', signal: 'sheet' } }] });
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
    log(`thin sheet order 2 t/delta ${tr} dof ${P.nFree}: alpha rel ${rel.toExponential(2)}`);
    assert.ok(Math.abs(rel) < 1e-5, `thin alpha ${rel}`);
  }
});

test('L22 G8 lumped ports: parallel-plate TEM line with full-cross-section ports (exact match), orders 1 and 2', () => {
  const H = 50,
    W = 100,
    L = 1000,
    er = 4;
  for (const order of [1, 2])
    for (const axis of ['z', 'x']) {
      const rects = [
        { x: [0, 0], y: [0, W], z: [0, H] },
        { x: [L, L], y: [0, W], z: [0, H] },
      ];
      const mesh = buildLayeredMesh({ axis, box: { x: [0, L], y: [0, W], z: [0, H] }, solids: [], surfaces: rects, mesh: { max_edge_um: 50, max_dz_um: 50, grade: 1 } });
      const R = (cf.ETA0 * H) / (W * Math.sqrt(er));
      const P = prepare3d(mesh, { order, materials: makeMaterials({ d: { model: 'const', eps_r: er } }), background: 'd', solidProps: [], bc: { xmin: 'pmc', xmax: 'pmc', ymin: 'pmc', ymax: 'pmc', zmin: 'pec', zmax: 'pec' }, lumped: rects.map((r, i) => ({ name: `L${i + 1}`, rect_um: r, direction: '+z', R_ohm: R })) });
      for (const f of [10e9, 50e9]) {
        const r = solveAt(P, f);
        const b = (2 * Math.PI * f * Math.sqrt(er) * L * 1e-6) / cf.C0;
        const e21 = Math.hypot(r.S.re[2] - Math.cos(b), r.S.im[2] + Math.sin(b));
        const s11 = Math.hypot(r.S.re[0], r.S.im[0]);
        log(`lumped parallel plate order ${order} axis ${axis} ${f / 1e9} GHz dof ${P.nFree}: |S11| ${s11.toExponential(2)}, |S21 - exp(-j beta L)| ${e21.toExponential(2)}`);
        assert.ok(s11 < (order === 1 ? 2e-3 : 1e-6) && e21 < (order === 1 ? 2e-3 : 1e-6), `order ${order} axis ${axis}`);
        assert.ok(reciprocityError(r.S) < 1e-10 && passivityMaxSv(r.S) <= 1 + 1e-9);
      }
    }
});

test('L22 G8 lumped vs wave ports on a microstrip (order 1, 5 / 20 GHz): S21 within 0.01 dB', () => {
  const h = 100,
    w = 200,
    t = 10,
    Y = 500,
    Z = 600,
    L = 2000;
  const solids = [
    { name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, L], y: [-Y, Y], z: [0, h] } },
    { name: 'strip', kind: 'conductor', box_um: { x: [0, L], y: [-w / 2, w / 2], z: [h, h + t] }, h_um: 10 },
  ];
  const rects = [
    { x: [0, 0], y: [-w / 2, w / 2], z: [0, h] },
    { x: [L, L], y: [-w / 2, w / 2], z: [0, h] },
  ];
  const ms = { max_edge_um: 100, max_dz_um: 200, grade: 0.5 };
  const base = { materials: makeMaterials({ sub: { model: 'const', eps_r: 3.5 } }), background: 'air', solidProps: [{ kind: 'dielectric', material: 'sub' }, { kind: 'conductor', model: 'pec' }] };
  const Pw = prepare3d(buildLayeredMesh({ axis: 'x', box: { x: [0, L], y: [-Y, Y], z: [0, Z] }, solids, mesh: ms }), { ...base, ports: [{ name: 'p1', side: 'xmin', mode: { type: 'tem', signal: 'strip' } }, { name: 'p2', side: 'xmax', mode: { type: 'tem', signal: 'strip' } }] });
  const meshL = buildLayeredMesh({ axis: 'x', box: { x: [0, L], y: [-Y, Y], z: [0, Z] }, solids, surfaces: rects, mesh: ms });
  for (const f of [5e9, 20e9]) {
    const rw = solveAt(Pw, f);
    const z0 = rw.zref[0];
    const Pl = prepare3d(meshL, { ...base, bc: { xmin: 'pmc', xmax: 'pmc' }, lumped: rects.map((r, i) => ({ name: `L${i + 1}`, rect_um: r, direction: '+z', R_ohm: z0 })) });
    const rl = solveAt(Pl, f);
    const Sw = renormalize(rw.S, rw.zref, [z0, z0]);
    log(`microstrip ${f / 1e9} GHz: wave S21 ${dB(Sw, 2).toFixed(4)} dB, lumped S21 ${dB(rl.S, 2).toFixed(4)} dB, lumped S11 ${dB(rl.S, 0).toFixed(1)} dB (port parasitics)`);
    assert.ok(Math.abs(dB(Sw, 2) - dB(rl.S, 2)) < 0.01, 'S21 within 0.01 dB');
    assert.ok(dB(rl.S, 0) < -30, 'lumped S11 < -30 dB');
    assert.ok(reciprocityError(rl.S) < 1e-10 && passivityMaxSv(rl.S) <= 1 + 1e-9);
  }
});

test('L22 G9 adaptive sweep (PROM): stub microstrip 1-60 GHz, PROM = HDM at 11 points', async () => {
  const { buildProm } = await import('../src/em3d/prom.mjs');
  const h = 100,
    Y = 600,
    Z = 600,
    L = 3000;
  const mesh = buildLayeredMesh({
    box: { x: [0, L], y: [-Y, Y], z: [0, Z] },
    solids: [
      { name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, L], y: [-Y, Y], z: [0, h] } },
      { name: 'strip', kind: 'conductor', box_um: { x: [0, L], y: [-100, 100], z: [h, h + 10] }, h_um: 60 },
      { name: 'stub', kind: 'conductor', box_um: { x: [1400, 1600], y: [100, 500], z: [h, h + 10] }, h_um: 60 },
    ],
    mesh: { max_edge_um: 250, max_dz_um: 150, grade: 0.6 },
  });
  const P = prepare3d(mesh, { materials: makeMaterials({ sub: { model: 'const', eps_r: 3.5, tan_delta: 0.005 } }), background: 'air', solidProps: [{ kind: 'dielectric', material: 'sub' }, { kind: 'conductor', model: 'pec' }, { kind: 'conductor', model: 'pec' }], ports: [{ name: 'p1', side: 'xmin', mode: { type: 'tem', signal: 'strip' } }, { name: 'p2', side: 'xmax', mode: { type: 'tem', signal: 'strip' } }], pml: { zmax: { thickness_um: 200 } } });
  const fs = Array.from({ length: 11 }, (_, i) => (1 + 5.9 * i) * 1e9);
  const prom = buildProm(P, fs[0], fs[10], { tol: 1e-4 });
  let md = 0;
  for (const f of fs) {
    const a = prom.solveAt(f),
      b = solveAt(P, f);
    md = Math.max(md, maxDiff(a.S, b.S));
  }
  log(`PROM stub microstrip dof ${P.nFree}: ${prom.samples.length} samples, dim ${prom.dim()}, converged ${prom.converged}, max |S_prom - S_hdm| ${md.toExponential(2)}`);
  assert.ok(prom.converged && md < 1e-4, `PROM ${md}`);
});
