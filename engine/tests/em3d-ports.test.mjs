// E6 phase-2 gates (lane L7): full-wave port eigenmode vs quasi-TEM port on a dispersive microstrip (S11 floor),
// two-mode differential ports on a GSSG CPWG block vs em2d 4-port cascade (single-ended and Sdd21), needle-IBC rule.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayeredMesh } from '../src/em3d/mesh.mjs';
import { prepare3d, solveAt } from '../src/em3d/solver.mjs';
import { starProduct, s2abcd, lineFromAbcd } from '../src/em3d/cascade.mjs';
import { runEm3d } from '../src/em3d/run.mjs';
import { makeMaterials } from '../src/em2d/dielectric.mjs';
import { buildSection } from '../src/em2d/section.mjs';
import { prepareRlgc, rlgcAt } from '../src/em2d/rlgc.mjs';
import * as mtl from '../src/em2d/mtl.mjs';
import { cmatMaxAbs, cmatAdd, cmatInv, CMat } from '../src/em2d/dense.mjs';
import * as cf from '../src/em2d/closed-forms.mjs';

const log = (m) => process.env.EM2D_GATE_LOG && console.log(`GATE ${m}`);
const dB = (S, i, j) => 20 * Math.log10(Math.hypot(S.re[i * S.c + j], S.im[i * S.c + j]));

test('E6-2 full-wave port: microstrip S11 floor and beta vs the 3D line, compared with the quasi-TEM port', () => {
  const h = 100,
    w = 200,
    t = 10,
    Y = 500,
    Z = 600,
    L3 = 1000;
  const mesh = buildLayeredMesh({
    axis: 'x',
    box: { x: [0, L3], y: [-Y, Y], z: [0, Z] },
    solids: [
      { name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, L3], y: [-Y, Y], z: [0, h] } },
      { name: 'strip', kind: 'conductor', box_um: { x: [0, L3], y: [-w / 2, w / 2], z: [h, h + t] }, h_um: 10 },
    ],
    mesh: { max_edge_um: 100, max_dz_um: 100, grade: 0.5 },
  });
  const run = (type, f) => {
    const P = prepare3d(mesh, {
      materials: makeMaterials({ sub: { model: 'const', eps_r: 3.5 } }),
      background: 'air',
      solidProps: [{ kind: 'dielectric', material: 'sub' }, { kind: 'conductor', model: 'pec' }],
      ports: [
        { name: 'p1', side: 'xmin', mode: { type, signal: 'strip' } },
        { name: 'p2', side: 'xmax', mode: { type, signal: 'strip' } },
      ],
    });
    return solveAt(P, f);
  };
  for (const f of [60e9, 90e9]) {
    const q = run('tem', f),
      fw = run('fullwave', f);
    const ln = lineFromAbcd(s2abcd(fw.S, fw.zref[0]));
    const b3 = Math.abs(ln.gammaL.im) / (L3 * 1e-6);
    const relFw = fw.ports[0].beta[0] / b3 - 1,
      relQ = q.ports[0].beta[0] / b3 - 1;
    log(`full-wave port ${f / 1e9} GHz: S11 quasi-TEM ${dB(q.S, 0, 0).toFixed(1)} dB, full-wave ${dB(fw.S, 0, 0).toFixed(1)} dB; beta_port / beta_3D - 1: quasi-TEM ${relQ.toExponential(2)}, full-wave ${relFw.toExponential(2)} (${fw.ports[0].fullwave.iterations} iterations)`);
    assert.ok(dB(fw.S, 0, 0) < -45, 'full-wave port S11 floor');
    assert.ok(dB(fw.S, 0, 0) < dB(q.S, 0, 0) - 10, 'full-wave port at least 10 dB below the quasi-TEM floor');
    assert.ok(Math.abs(relFw) < 3e-3 && Math.abs(relFw) < Math.abs(relQ), 'beta tracks the 3D dispersion');
    assert.ok(mtl.reciprocityError(fw.S) < 1e-10 && mtl.passivityMaxSv(fw.S) <= 1 + 1e-9);
  }
});

test('E6-1 two-mode ports: GSSG CPWG 3D block cascaded with 2D segments vs 2D, single-ended and Sdd21', () => {
  const h = 30,
    w = 20,
    s = 20,
    g = 20,
    t = 4,
    X = 150,
    Z = 150,
    L3 = 800;
  const mats = { sub: { model: 'const', eps_r: 3.5, tan_delta: 0.005 } };
  const a = s / 2,
    b = a + w,
    c = b + g;
  const cs = [
    ['sp', a, b],
    ['sn', -b, -a],
    ['gl', -X, -c],
    ['gr', c, X],
  ];
  const mesh = buildLayeredMesh({
    axis: 'x',
    box: { x: [0, L3], y: [-X, X], z: [0, Z] },
    solids: [{ name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, L3], y: [-X, X], z: [0, h] } }, ...cs.map(([n, y0, y1]) => ({ name: n, kind: 'conductor', box_um: { x: [0, L3], y: [y0, y1], z: [h, h + t] }, h_um: 4 }))],
    mesh: { max_edge_um: 30, max_dz_um: 100, grade: 0.4 },
  });
  const P = prepare3d(mesh, {
    materials: makeMaterials(mats),
    background: 'air',
    solidProps: [{ kind: 'dielectric', material: 'sub' }, ...cs.map(() => ({ kind: 'conductor', model: 'pec' }))],
    ports: [
      { name: 'p1', side: 'xmin', mode: { type: 'tem', signal: ['sp', 'sn'] } },
      { name: 'p2', side: 'xmax', mode: { type: 'tem', signal: ['sp', 'sn'] } },
    ],
  });
  const sec = buildSection({
    box: { x: [-X, X], y: [0, Z], bc: { left: 'pec', right: 'pec', bottom: 'pec', top: 'pec' } },
    background: 'air',
    dielectrics: [{ material: 'sub', rect: { x: [-X, X], y: [0, h] } }],
    conductors: cs.map(([n, y0, y1], i) => ({ name: n, role: i < 2 ? 'signal' : 'ground', rect: { x: [y0, y1], y: [h, h + t] } })),
    mesh: { order: 2, conductor_cells: 2 },
  });
  const P2 = prepareRlgc(sec, makeMaterials(mats), { conductor_model: 'pec' });
  for (const f of [10e9, 40e9]) {
    const r = solveAt(P, f);
    assert.equal(r.S.r, 4);
    const S3 = mtl.renormalize(r.S, r.zref, [50, 50, 50, 50]);
    const pc = r.ports[0];
    const Li = cmatInv(CMat.from(pc.C0mat.map((row) => row.map(([x]) => x))));
    const rp = { f, R: [0, 0, 0, 0], L: Array.from(Li.re, (v) => v * cf.MU0 * cf.EPS0), C: pc.Cmat.flat().map(([x]) => x), G: pc.Cmat.flat().map(([, y]) => -2 * Math.PI * f * y) };
    const r2 = rlgcAt(P2, f);
    const casc = (seg) => starProduct(starProduct(seg(1e-3), S3), seg(2e-3));
    const segP = (l) => mtl.lineS(rp, l, 50),
      seg2 = (l) => mtl.lineS(r2, l, 50);
    const eP = cmatMaxAbs(cmatAdd(casc(segP), segP(3e-3 + L3 * 1e-6), 1, -1));
    const e2 = cmatMaxAbs(cmatAdd(casc(seg2), seg2(3e-3 + L3 * 1e-6), 1, -1));
    const pairs = [
      [0, 1],
      [2, 3],
    ];
    const sdd = dB(mtl.mixedMode(casc(seg2), pairs).Sdd, 1, 0),
      sddRef = dB(mtl.mixedMode(seg2(3e-3 + L3 * 1e-6), pairs).Sdd, 1, 0);
    log(`GSSG CPWG ${f / 1e9} GHz dof ${P.nFree}: mode betas ${pc.betas.map((x) => x[0].toFixed(1)).join(' / ')}; |cascade - 2D| port-mesh ${eP.toExponential(2)}, fine em2d ${e2.toExponential(2)}; Sdd21 ${sdd.toFixed(4)} vs ${sddRef.toFixed(4)} dB`);
    assert.ok(eP < 5e-3, 'vs port-mesh 2D');
    assert.ok(e2 < 5e-2, 'vs fine em2d (cross-section discretization)');
    assert.ok(Math.abs(sdd - sddRef) < 0.05, 'Sdd21');
    assert.ok(mtl.reciprocityError(r.S) < 1e-10 && mtl.passivityMaxSv(S3) <= 1 + 1e-9);
  }
});

test('E6-3 case builder rejects lossy rectangular conductors along the extrusion axis on needle tets', () => {
  const c = {
    schema: 'ap-sim/0',
    id: 'em/x',
    family: 'em3d',
    em3d: {
      box_um: { x: [0, 600], y: [-150, 150], z: [0, 200] },
      axis: 'x',
      solids: [{ name: 'strip', kind: 'conductor', model: 'ibc', sigma_S_m: 5.8e7, box_um: { x: [0, 600], y: [-25, 25], z: [50, 60] }, h_um: 2 }],
      ports: [{ name: 'p1', side: 'xmin', signal: 'strip' }],
      mesh: { max_dz_um: 100 },
      sweep: { f_GHz: [] },
    },
  };
  assert.throws(() => runEm3d(c), /needle tets/);
});

test('E6 port-distance rule (SPEC 14.2): warning below max(2 h, w_max), error below half unless allow_short_lead', () => {
  const mk = (lead, allow) => ({
    schema: 'ap-sim/0',
    id: 'em/x',
    family: 'em3d',
    em3d: {
      box_um: { x: [-lead, 100], y: [-100, 100], z: [0, 100] },
      bc: { zmax: 'pmc' },
      solids: [
        { name: 's', kind: 'conductor', box_um: { x: [-lead, 0], y: [-10, 10], z: [20, 22] } },
        { name: 's2', kind: 'conductor', box_um: { x: [0, 100], y: [-3, 3], z: [20, 22] } },
      ],
      ports: [{ name: 'p1', side: 'xmin', signal: 's', allow_short_lead: allow }],
      sweep: { f_GHz: [] },
      max_dof: 1,
    },
  });
  // h = 20 um (signal to the pec bottom), w_max = 20 um -> required 40 um
  assert.throws(() => runEm3d(mk(15, false)), /allow_short_lead/);
  assert.throws(() => runEm3d(mk(15, true)), /DOF budget/); // passes the lead check, stops at the DOF guard
  assert.throws(() => runEm3d(mk(30, false)), /DOF budget/); // warning only
});
