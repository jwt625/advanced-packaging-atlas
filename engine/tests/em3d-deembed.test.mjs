// Lane L13 (audit A3 S3 / S4 / M9): line-run de-embedding companions cut from the device mesh (axial and in-plane
// cuts), de-embedding guards, port-impedance check records and per-terminal indexing, low-frequency conditioning
// warning, Touchstone header, PML handling of companions. License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEm3d, deembedPlan, portZ2d } from '../src/em3d/run.mjs';
import { buildLayeredMesh, subMesh } from '../src/em3d/mesh.mjs';
import { factorFallbackWarning } from '../src/em2d/ldlt-select.mjs';
import { wasmLdltSupported } from '../src/em2d/ldlt-wasm.mjs';

const log = (m) => process.env.EM2D_GATE_LOG && console.log(`GATE ${m}`);
const ang = (z) => (Math.atan2(z[1], z[0]) * 180) / Math.PI;

// uniform microstrip, 600 um long, h 50 um, w 100 um, t 10 um, eps_r 3.5 (all lengths um)
const strip = ({ axis = 'x', d = [0, 0], method, f = [10], extra = {}, mesh = {} } = {}) => ({
  schema: 'ap-sim/0',
  id: 'em/ms',
  family: 'em3d',
  em3d: {
    box_um: { x: [0, 600], y: [-250, 250], z: [0, 300] },
    axis,
    deembed_method: method,
    materials: { sub: { model: 'const', eps_r: 3.5, tan_delta: 0.002 } },
    solids: [
      { name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, 600], y: [-250, 250], z: [0, 50] } },
      { name: 'strip', kind: 'conductor', box_um: { x: [0, 600], y: [-50, 50], z: [50, 60] }, h_um: 10 },
    ],
    ports: [
      { name: 'p1', side: 'xmin', signal: 'strip', deembed_um: d[0] },
      { name: 'p2', side: 'xmax', signal: 'strip', deembed_um: d[1] },
    ],
    mesh: { max_edge_um: 50, max_dz_um: 50, grade: 0.5, ...mesh },
    sweep: { f_GHz: f },
    port_z_check: false,
    touchstone: true,
    ...extra,
  },
});

test('L13 line run, axial cut (axis = port normal): companions on the device mesh, core = line of the remaining length', () => {
  const full = runEm3d(strip({ method: 'port_extension' })).variants[0];
  const v = runEm3d(strip({ d: [200, 100], f: [1e-5, 10] })).variants[0];
  assert.equal(v.derived.deembed_method, 'line_run');
  const r = v.derived.rows[1];
  const [c1, c2] = v.derived.companions;
  assert.deepEqual([c1.reference_plane, c2.reference_plane], [{ axis: 'x', at_um: 200 }, { axis: 'x', at_um: 500 }]);
  // same face mesh: the companion's face impedance is the device port impedance
  assert.ok(Math.abs(c1.z_face_ohm / r.zref_native_ohm[0] - 1) < 1e-12 && Math.abs(c2.z_face_ohm / r.zref_native_ohm[1] - 1) < 1e-12);
  const a = ang(r.S[1][0]),
    aFull = ang(full.derived.rows[0].S[1][0]);
  log(`line run axial cut: S21 core ${a.toFixed(4)} deg vs half line ${(aFull / 2).toFixed(4)} deg; companions ${c1.dof} / ${c2.dof} DOF`);
  assert.ok(Math.abs(a - aFull / 2) < 0.02, `core phase ${a} vs ${aFull / 2}`);
  // |S11| of the 300 um core at 50 ohm vs a uniform line with the port's Zc and beta (axis x: every cross-section of
  // the extruded mesh is the port face mesh)
  const zc = r.zref_native_ohm[0],
    th = r.ports[0].beta_rad_m[0][0] * 300e-6,
    q = zc / 50 - 50 / zc,
    p = zc / 50 + 50 / zc;
  const s11 = (Math.abs(q) * Math.sin(th)) / Math.hypot(2 * Math.cos(th), p * Math.sin(th));
  log(`line run axial cut: |S11| core ${Math.hypot(...r.S[0][0]).toExponential(4)} vs uniform line ${s11.toExponential(4)}`);
  assert.ok(Math.abs(Math.hypot(...r.S[0][0]) / s11 - 1) < 0.1); // 4.8 % at the time of writing
  // Touchstone header names the method actually used (A3 M9)
  assert.match(v.touchstone[0].text, /de-embedded by same-mesh line-run companions \(2-port ABCD\), reference planes p1 at x = 200 um, p2 at x = 500 um/);
  assert.match(full.touchstone[0].text, /not de-embedded/);
  // low-frequency conditioning (A3 M9): 10 kHz is far below the det-Z limit on this 0.6 mm line; 10 GHz is not
  assert.ok(v.warnings.some((w) => /low-frequency conditioning: .* at 0\.00001 GHz/.test(w)));
  assert.ok(!v.warnings.some((w) => /low-frequency conditioning: .* at 10 GHz/.test(w)));
  assert.ok(v.derived.rows[0].checks.det_cancellation < 1e-8 && r.checks.det_cancellation > 1e-8);
});

test('L13 line run, in-plane cut (axis z, EM-4 type): companions share the device z-planes and triangulation', () => {
  const t0 = performance.now();
  const v = runEm3d(strip({ axis: 'z', d: [300, 300], mesh: { max_edge_um: 80, max_dz_um: 75 } })).variants[0];
  const r = v.derived.rows[0];
  const [c1, c2] = v.derived.companions;
  // A3 S3: same z-planes (layers) as the device; the two leads partition the device prisms (d1 + d2 = box length)
  assert.equal(c1.layers, v.mesh.layers);
  assert.equal(c2.layers, v.mesh.layers);
  assert.equal(c1.tris2d + c2.tris2d, v.mesh.tris2d);
  assert.equal(c1.tets + c2.tets, v.mesh.tets);
  assert.ok(Math.abs(c1.z_face_ohm / r.zref_native_ohm[0] - 1) < 1e-12 && Math.abs(c2.z_face_ohm / r.zref_native_ohm[1] - 1) < 1e-12);
  // zero-length core: a thru, up to the non-modal field content at the shared reference plane
  const s11 = Math.hypot(...r.S[0][0]),
    e21 = Math.hypot(r.S[1][0][0] - 1, r.S[1][0][1]);
  log(`line run in-plane cut, zero-length core at 10 GHz: |S11| ${s11.toExponential(2)}, |S21 - 1| ${e21.toExponential(2)}; device ${v.mesh.dof} DOF, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  assert.ok(s11 < 1e-3 && e21 < 1e-3);
});

test('L13 subMesh: conformity checks; device mesh conforms to cuts', () => {
  const spec = {
    box: { x: [0, 100], y: [-50, 50], z: [0, 40] },
    solids: [{ name: 's', kind: 'dielectric', material: 'a', box_um: { x: [0, 100], y: [-50, 50], z: [0, 10] } }],
    mesh: { max_edge_um: 30, max_dz_um: 20 },
  };
  assert.throws(() => subMesh(buildLayeredMesh(spec), 'x', 0, 37), /does not conform/);
  const m = buildLayeredMesh({ ...spec, cuts: [{ axis: 'x', at_um: 37 }, { axis: 'z', at_um: 25 }] });
  const a = subMesh(m, 'x', 0, 37),
    b = subMesh(m, 'x', 37, 100);
  assert.equal(a.nTets + b.nTets, m.nTets);
  assert.deepEqual(Array.from(a.zs), Array.from(m.zs));
  assert.ok(Array.from(m.zs).includes(25));
  const lo = subMesh(m, 'z', 0, 25);
  assert.equal(lo.nTets + subMesh(m, 'z', 25, 40).nTets, m.nTets);
  assert.throws(() => subMesh(m, 'z', 0, 24), /not z-planes/);
  assert.throws(() => buildLayeredMesh({ ...spec, cuts: [{ axis: 'x', at_um: 100 }] }), /not inside the box/);
});

test('L13 de-embedding guards (A3 S4): lead length, method values, fallback warning, PML', () => {
  // deembed_um beyond the uniform lead: the second strip section starts at x = 300
  const c = strip({ d: [350, 0], f: [] });
  c.em3d.solids[1].box_um.x = [0, 300];
  c.em3d.solids.push({ name: 'strip2', kind: 'conductor', box_um: { x: [300, 600], y: [-30, 30], z: [50, 60] } });
  c.em3d.ports[1].signal = 'strip2';
  assert.throws(() => runEm3d(c), /deembed_um 350 um exceeds the uniform lead \(300 um/);
  assert.throws(() => runEm3d(strip({ d: [100, 100], f: [], method: 'line-run' })), /deembed_method "line-run": must be line_run \| port_extension/);
  assert.throws(() => runEm3d(strip({ d: [-1, 0], f: [] })), /deembed_um must be a number >= 0/);
  // explicit line_run on an ineligible case: warning, then port extension
  const w = [];
  const e = strip({ d: [100, 100], method: 'line_run' }).em3d;
  assert.equal(deembedPlan({ ...e, ports: [{ ...e.ports[0], mode_type: 'fullwave' }, e.ports[1]] }, w).method, 'port_extension');
  assert.match(w[0], /deembed_method line_run not applicable \(port p1 is a fullwave port\); using port extension/);
  assert.equal(deembedPlan({ ...e, ports: [{ ...e.ports[0], signal: ['strip', 'x'] }, e.ports[1]] }, w).method, 'port_extension');
  assert.match(w[1], /2 signals/);
  assert.equal(deembedPlan({ ...e, ports: [e.ports[0]] }, w).method, 'port_extension');
  assert.match(w[2], /1 ports \(line run needs 2\)/);
  assert.equal(deembedPlan(strip({ d: [100, 100] }).em3d, w).method, 'line_run');
  assert.equal(w.length, 3);
  // PML: kept on sides parallel to the lead, with the port-crossing warning
  const p = runEm3d(strip({ d: [100, 100], f: [], extra: { pml: { zmax: { thickness_um: 100 } } }, mesh: { max_edge_um: 80, max_dz_um: 100 } })).variants[0];
  assert.deepEqual(p.derived.companions.map((x) => x.pml_sides), [['zmax'], ['zmax']]);
  assert.ok(p.warnings.some((x) => /port p1: the port face crosses the PML slab on zmax/.test(x)));
});

test('L13 line run needs ports on opposite sides (a lead region must not touch the other port side); planes must not cross', () => {
  // L bend: p1 on xmin (strip along x), p2 on ymax (strip along y): p1's lead region would touch the ymax port side
  const c = {
    schema: 'ap-sim/0',
    id: 'em/bend',
    family: 'em3d',
    em3d: {
      box_um: { x: [0, 400], y: [-200, 200], z: [0, 200] },
      axis: 'z',
      materials: { sub: { model: 'const', eps_r: 3.5 } },
      solids: [
        { name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, 400], y: [-200, 200], z: [0, 50] } },
        { name: 'a', kind: 'conductor', box_um: { x: [0, 210], y: [-20, 20], z: [50, 60] } },
        { name: 'b', kind: 'conductor', box_um: { x: [170, 210], y: [-20, 200], z: [50, 60] } },
      ],
      deembed_method: 'line_run',
      ports: [
        { name: 'p1', side: 'xmin', signal: 'a', deembed_um: 160 },
        { name: 'p2', side: 'ymax', signal: 'b', deembed_um: 0 },
      ],
      mesh: { max_edge_um: 80, max_dz_um: 100 },
      sweep: { f_GHz: [] },
    },
  };
  const v = runEm3d(c).variants[0];
  assert.equal(v.derived.deembed_method, 'port_extension');
  assert.ok(v.warnings.some((w) => /line_run not applicable \(ports p1 \/ p2 are not on opposite box sides/.test(w)));
  assert.throws(() => runEm3d(strip({ d: [400, 300], f: [] })), /deembed_um 400 \+ 300 um exceeds the box length along x/);
});

test('L13 port-impedance check is never skipped silently; zref indexed per terminal (A3 S4)', () => {
  // p1: two signals (2 terminals); p2: one signal (terminal index 2). sn stops 100 um before xmax.
  const c = {
    schema: 'ap-sim/0',
    id: 'em/pair',
    family: 'em3d',
    em3d: {
      box_um: { x: [0, 400], y: [-150, 150], z: [0, 150] },
      axis: 'x',
      materials: { sub: { model: 'const', eps_r: 3.5 } },
      solids: [
        { name: 'sub', kind: 'dielectric', material: 'sub', box_um: { x: [0, 400], y: [-150, 150], z: [0, 30] } },
        { name: 'sp', kind: 'conductor', box_um: { x: [0, 400], y: [10, 30], z: [30, 34] }, h_um: 5 },
        { name: 'sn', kind: 'conductor', box_um: { x: [0, 300], y: [-30, -10], z: [30, 34] }, h_um: 5 },
      ],
      ports: [
        { name: 'p1', side: 'xmin', signal: ['sp', 'sn'], allow_short_lead: true },
        { name: 'p2', side: 'xmax', signal: 'sp', allow_short_lead: true },
      ],
      mesh: { max_edge_um: 40, max_dz_um: 100, grade: 0.5 },
      sweep: { f_GHz: [10] },
    },
  };
  const v = runEm3d(c).variants[0];
  const r = v.derived.rows[0];
  assert.equal(r.zref_native_ohm.length, 3);
  const [pc1, pc2] = v.derived.port_checks;
  assert.equal(pc1.z_check, 'not_checked');
  assert.match(pc1.z_check_reason, /2-signal port/);
  assert.ok(v.warnings.some((w) => /port p1: port-impedance check not checked: 2-signal port/.test(w)));
  assert.equal(pc2.z_port_ohm, r.zref_native_ohm[2], 'single-signal port after a 2-terminal port: terminal index 2');
  assert.ok(Number.isFinite(pc2.z_em2d_ohm) && ['ok', 'warn'].includes(pc2.z_check));
  // other reasons, without a 3D solve
  const e = strip().em3d;
  assert.match(portZ2d(e, { ...e.ports[0], mode_type: 'fullwave' }, 1e10).reason, /fullwave port/);
  assert.match(portZ2d(e, { name: 't', side: 'xmin', mode: { type: 'te10' } }, 1e10).reason, /te10 port/);
  assert.match(portZ2d({ ...e, solids: e.solids.map((s) => (s.name === 'strip' ? { ...s, box_um: { ...s.box_um, x: [100, 600] } } : s)) }, e.ports[0], 1e10).reason, /does not cross the port face/);
  assert.match(portZ2d({ ...e, materials: {} }, e.ports[0], 1e10).reason, /^em2d error: /);
  assert.ok(Number.isFinite(portZ2d(e, e.ports[0], 1e10).z));
});

test('L13 factor fallback warning (A3 M9): named when wasm is requested without SIMD', () => {
  assert.equal(factorFallbackWarning('blocked'), null);
  assert.equal(factorFallbackWarning('wasm') === null, wasmLdltSupported());
});
