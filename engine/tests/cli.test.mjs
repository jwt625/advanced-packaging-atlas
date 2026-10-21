// CLI (lane L1): case validation, runCase with injected generator and resolver (independent of lanes L2 / L3),
// target checks and exit codes 0 / 1 / 2, and the real entry point's usage and input errors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { stringify } from 'yaml';
import { parseCase, runCase, main, materialMapper, toJson } from '../cli.mjs';

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const boxes = [
  { id: 'substrate', kind: 'substrate', material: 'organic', x_mm: 0, y_mm: 0, w_mm: 40, d_mm: 30, z_um: 0, h_um: 1200, priority: 0 },
  { id: 'die', kind: 'die', material: 'silicon', x_mm: 0, y_mm: 0, w_mm: 16, d_mm: 12, z_um: 1200, h_um: 775, priority: 0 },
  { id: 'lid', kind: 'lid', material: 'copper', x_mm: 0, y_mm: 0, w_mm: 30, d_mm: 24, z_um: 1975, h_um: 1500, priority: 0 },
];
// stub library (synthetic constants; not material data)
const K = { sub_lib: [30, 30, 0.6], si_lib: [148, 148, 148], cu_lib: [390, 390, 390] };
const deps = {
  generate: (family, params) => {
    if (family !== 'stub') throw new Error(`no family ${family}`);
    return { generator: 'stub/0', boxes: boxes.map((b) => ({ ...b, w_mm: b.id === 'die' && params.die_w_mm ? params.die_w_mm : b.w_mm })), warnings: [] };
  },
  resolve: (key) => {
    if (!K[key]) throw new Error(`unknown material ${key}`);
    return { k_W_mK: K[key] };
  },
};
const baseCase = () => ({
  schema: 'ap-sim/0', id: 'stub/thermal', title: 'stub', status: 'draft', family: 'stub', params: { die_w_mm: 16 },
  geometry: { symmetry: 'quarter' },
  materials: { map: { organic: 'sub_lib', die: 'si_lib', copper: 'cu_lib' } },
  mesh: { max_xy_mm: 2, min_cells_per_layer: 2, grading: 1.3, max_nodes: 100000 },
  physics: { thermal: { sources: [{ parts: 'die', power_W: 100, distribution: 'uniform_volume' }], bcs: [{ selection: 'top:lid', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }, { selection: 'default', type: 'adiabatic' }] } },
  studies: [{ id: 's1', type: 'thermal_stationary' }, { id: 's2', type: 'thermo_elastic', temperature: { from: 's1' } }],
  targets: [{ metric_id: 'stub-m1', quantity: 'heat_out_W', value: 100, tolerance: { rel: 1e-8 }, tier: 'A' }, { metric_id: 'stub-m2', quantity: 'Tmax_C', selection: 'die', tier: 'D' }],
  assumptions: [], missing: [],
});

test('parseCase: unknown keys, schema, study types are errors', () => {
  assert.throws(() => parseCase({ ...baseCase(), extra: 1 }), /case: unknown key extra/);
  assert.throws(() => parseCase({ ...baseCase(), schema: 'x' }), /schema must be ap-sim\/0/);
  assert.throws(() => parseCase({ ...baseCase(), mesh: { max_xy: 1 } }), /mesh: unknown key max_xy/);
  assert.throws(() => parseCase({ ...baseCase(), studies: [{ id: 's1', type: 'modal' }] }), /type modal/);
  assert.throws(() => parseCase({ ...baseCase(), studies: [{ id: 's1', type: 'thermal_stationary' }, { id: 's1', type: 'thermal_stationary' }] }), /duplicate study id/);
  assert.equal(materialMapper({ die: 'x', silicon: 'y' })({ id: 'die', kind: 'die', material: 'silicon' }), 'x');
  assert.equal(materialMapper({ silicon: 'y' })({ id: 'd2', kind: 'die', material: 'silicon' }), 'y');
});

test('runCase: thermal study runs, thermo_elastic is skipped, targets checked or listed', () => {
  const out = runCase(baseCase(), deps);
  assert.equal(out.results.length, 1);
  assert.equal(out.skipped[0].study, 's2');
  const r = out.results[0];
  assert.ok(Math.abs(r.derived.heat_in_W - 100) < 1e-9 && r.derived.balance_rel < 1e-9);
  assert.equal(out.targets[0].status, 'pass');
  assert.equal(out.targets[1].status, 'unchecked');
  assert.ok(out.targets[1].got > 25);
  const j = JSON.parse(JSON.stringify(toJson(out)));
  assert.deepEqual(j.results[0].fields, ['T_K']);
  // case overrides of k replace the library value
  const c = baseCase();
  c.materials.overrides = { si_lib: { k_W_mK: { value: 100, status: 'user', note: 'test' } } };
  const o2 = runCase(c, deps);
  assert.ok(o2.results[0].derived.Tmax_C.value > out.results[0].derived.Tmax_C.value);
});

test('main: exit codes 0 (ok), 2 (target missed), 1 (input error), JSON output', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ap-sim-cli-'));
  try {
    const sink = () => { const s = { text: '', write: (x) => { s.text += x; } }; return s; };
    const run = async (c, extra = []) => {
      const f = join(dir, 'case.yaml');
      writeFileSync(f, typeof c === 'string' ? c : stringify(c));
      const io = { stdout: sink(), stderr: sink() };
      const code = await main(['node', 'cli.mjs', f, ...extra], deps, io);
      return { code, out: io.stdout.text, err: io.stderr.text };
    };
    let r = await run(baseCase());
    assert.equal(r.code, 0, r.err);
    assert.match(r.out, /Tmax .* C in die/);
    const miss = baseCase();
    miss.targets[0].value = 50;
    r = await run(miss);
    assert.equal(r.code, 2);
    r = await run({ ...baseCase(), bogus: true });
    assert.equal(r.code, 1);
    assert.match(r.err, /unknown key bogus/);
    r = await run(baseCase(), ['--json', '--study', 's1']);
    assert.equal(r.code, 0);
    assert.equal(JSON.parse(r.out).results[0].study, 's1');
    r = await run(baseCase(), ['--study', 'nope']);
    assert.equal(r.code, 1);
    // physics errors surface as exit 1
    const bad = baseCase();
    bad.physics.thermal.bcs[0].selection = 'top:nothing';
    r = await run(bad);
    assert.equal(r.code, 1);
    assert.match(r.err, /top:nothing has no exterior faces/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('real entry point: usage and missing file exit 1', () => {
  const a = spawnSync(process.execPath, [join(ENGINE, 'cli.mjs')], { encoding: 'utf8' });
  assert.equal(a.status, 1);
  assert.match(a.stderr, /usage: node cli.mjs/);
  const b = spawnSync(process.execPath, [join(ENGINE, 'cli.mjs'), join(ENGINE, 'no-such-case.yaml')], { encoding: 'utf8' });
  assert.equal(b.status, 1);
  assert.match(b.stderr, /error: .*no-such-case.yaml/);
});

test('main: family em2d is dispatched to runEm2d (injected), --json passes the result through, exit 2 on pass === false', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ap-sim-cli-'));
  try {
    const f = join(dir, 'em.yaml');
    writeFileSync(f, stringify({ schema: 'ap-sim/0', id: 'em/stub', family: 'em2d', em2d: { section: {} } }));
    const sink = () => { const s = { text: '', write: (x) => { s.text += x; } }; return s; };
    for (const [pass, code] of [[true, 0], [false, 2], [null, 0]]) {
      const io = { stdout: sink(), stderr: sink() };
      let seen = null;
      const runEm2d = (c, o) => { seen = o; return { case: c.id, family: 'em2d', variants: [{ variant: 'base', mesh: { tris: 1 }, derived: { freqs_GHz: [1] }, timing: { total_ms: 1 }, targets: [{ metric_id: 'm', quantity: 'Z0_ohm', f_GHz: 1, computed: 50, value: 50, pass }], warnings: [] }] }; };
      assert.equal(await main(['node', 'cli.mjs', f, '--json', '--variants', 'base'], { runEm2d }, io), code);
      assert.deepEqual(seen.variants, ['base']);
      assert.equal(JSON.parse(io.stdout.text).variants[0].targets[0].computed, 50);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('main: em3d dispatch and --sensitivity use the injected runners; exit 2 on an em3d pass === false', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'ap-sim-cli-'));
  try {
    const sink = () => { const s = { text: '', write: (x) => { s.text += x; } }; return s; };
    const f = join(dir, 'em3.yaml');
    writeFileSync(f, stringify({ schema: 'ap-sim/0', id: 'em/stub3', family: 'em3d', em3d: {} }));
    for (const [pass, code] of [[true, 0], [false, 2]]) {
      const io = { stdout: sink(), stderr: sink() };
      const runEm3d = (c) => ({ case: c.id, family: 'em3d', variants: [{ variant: 'base', derived: { rows: [{}] }, timing: { total_ms: 1 }, targets: [{ quantity: 'S_dB', f_GHz: 10, computed: -1, value: -1, pass }], warnings: [] }] });
      assert.equal(await main(['node', 'cli.mjs', f], { runEm3d }, io), code);
      assert.match(io.stdout.text, pass ? /pass/ : /MISS/);
    }
    const g = join(dir, 'case.yaml');
    writeFileSync(g, stringify(baseCase()));
    const io = { stdout: sink(), stderr: sink() };
    let seen = null;
    const sensitivity = { sensitivityNode: (c, o) => { seen = [c.id, o.study]; return { case: c.id, rows: [] }; }, summarizeSensitivity: (r) => `sensitivity ${r.case}` };
    assert.equal(await main(['node', 'cli.mjs', g, '--sensitivity', '--study', 's1'], { sensitivity }, io), 0);
    assert.deepEqual(seen, ['stub/thermal', 's1']);
    assert.match(io.stdout.text, /sensitivity stub\/thermal/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('metricLookupFromJson reads the generated sim_targets.json like the CSV lookup', async () => {
  const { readFileSync, existsSync } = await import('node:fs');
  const { metricLookupFromJson } = await import('../src/thermal/case.mjs');
  const { metricsTable } = await import('../cli.mjs');
  const p = join(ENGINE, '../app/static/data/sim_targets.json');
  if (!existsSync(p)) return;
  const j = JSON.parse(readFileSync(p, 'utf8'));
  const fromJson = metricLookupFromJson(j), fromCsv = metricsTable(join(ENGINE, '../data/metrics.csv'));
  let n = 0;
  for (const [id, r] of Object.entries(j.rows)) {
    if (r.table !== 'metrics') continue;
    const a = fromJson(id), b = fromCsv(id);
    if (Number.isFinite(b.value)) assert.equal(a.value, b.value, id);
    n++;
  }
  assert.ok(n > 0);
  assert.equal(fromJson('no-such-id'), null);
  assert.equal(fromJson('ectc51687.2025.00085-c-m1').value, 0.0108);
});

test('study-level thermal patches: bcs_patch, contact_resistance map and bcs replacement (L3 request)', async () => {
  const { studyThermal } = await import('../src/thermal/case.mjs');
  const base = { sources: [{ parts: 'die', power_W: 10 }], bcs: [{ selection: 'top:lid', type: 'htc', h_W_m2K: 1e4, T_inf_C: 25 }, { selection: 'interface:tim|lid', type: 'contact_resistance', R_m2K_W: 1e-5 }] };
  const a = studyThermal(base, { contact_resistance: { 'interface:tim|lid': { value: 4.3e-6, status: 'derived', note: 'calibration' } }, thermal: { bcs_patch: [{ selection: 'top:lid', h_W_m2K: 2e4 }] } });
  assert.equal(a.bcs[1].R_m2K_W, 4.3e-6);
  assert.equal(a.bcs[0].h_W_m2K, 2e4);
  assert.equal(base.bcs[0].h_W_m2K, 1e4); // base untouched
  const b = studyThermal(base, { thermal: { bcs: [{ selection: 'top:lid', type: 'temperature', T_C: 40 }] } });
  assert.deepEqual(b.bcs, [{ selection: 'top:lid', type: 'temperature', T_C: 40 }]);
  // through runCase: two studies, the second with a stronger HTC, cooler
  const c = baseCase();
  c.studies = [{ id: 's1', type: 'thermal_stationary' }, { id: 's2', type: 'thermal_stationary', thermal: { bcs_patch: [{ selection: 'top:lid', h_W_m2K: 1e5 }] } }];
  c.targets = [];
  const out = runCase(c, deps);
  assert.ok(out.results[1].derived.Tmax_C.value < out.results[0].derived.Tmax_C.value);
  assert.throws(() => parseCase({ ...baseCase(), studies: [{ id: 's1', type: 'thermal_stationary', thermal: { radiation: 1 } }] }), /unknown key radiation/);
});

test('materials.allow_extrapolation (L2 CD6): passed to resolve at case and study level, flags surfaced as warnings', () => {
  const lim = (key, T, opts = {}) => {
    const r = deps.resolve(key, T, opts);
    if (key === 'si_lib' && T > 290) {
      const ok = opts.allowExtrapolation === true || (Array.isArray(opts.allowExtrapolation) && opts.allowExtrapolation.includes(key));
      if (!ok) throw new Error(`${key}: T outside valid_T_C`);
      return { ...r, provenance: { extrapolated: [{ property: 'valid_T_C', range_C: [-55, 26.85], rule: 'constants used as stored' }] } };
    }
    return r;
  };
  const c = baseCase();
  c.studies = [{ id: 's1', type: 'thermal_stationary' }];
  c.targets = [];
  assert.throws(() => runCase(c, { ...deps, resolve: lim }), /outside valid_T_C/);
  const c1 = { ...c, materials: { ...c.materials, allow_extrapolation: ['si_lib'] } };
  const o1 = runCase(c1, { ...deps, resolve: lim });
  assert.ok(o1.results[0].warnings.some((w) => /si_lib used outside its valid range/.test(w)), o1.results[0].warnings.join('; '));
  const c2 = { ...c, studies: [{ id: 's1', type: 'thermal_stationary', materials: { allow_extrapolation: true } }] };
  assert.ok(runCase(c2, { ...deps, resolve: lim }).results[0].warnings.some((w) => /allow_extrapolation/.test(w)));
  assert.throws(() => parseCase({ ...c, materials: { ...c.materials, extrapolate: true } }), /unknown key extrapolate/);
});

test('mechanics targets at singular points are indeterminate unless allow_singular with a reason (audit A2 S4)', async () => {
  const { evalMechTarget, SINGULAR_FLAGS } = await import('../src/thermal/case.mjs');
  assert.deepEqual([...SINGULAR_FLAGS], ['reentrant', 'bimaterial_edge']);
  const r = { study: 's2', T_C: 25, derived: { warpage: [], von_mises_per_part: { soc_1: { vm_max_gp_Pa: 103e6, vm_max_gp_flag: 'bimaterial_edge', vm_max_node_Pa: 110e6, vm_max_node_flag: 'bimaterial_edge' } } } };
  const e = evalMechTarget({ quantity: 'von_mises_max_MPa', selection: 'part:soc_*', study: 's2', T_C: 25 }, [r]);
  assert.equal(e.got, 103);
  assert.equal(e.info.flag, 'bimaterial_edge');
});

test('runCaseAll: singular von Mises target -> indeterminate; allow_singular with a reason -> compared', async () => {
  const { runCaseAll } = await import('../src/thermal/case.mjs');
  const r = { study: 's2', T_C: 25, warnings: [], derived: { warpage: [], von_mises_per_part: { die: { vm_max_gp_Pa: 103e6, vm_max_gp_flag: 'bimaterial_edge', vm_max_node_Pa: 110e6, vm_max_node_flag: null } } } };
  const mech = { runMechCase: () => ({ results: [{ ...r }], notes: [] }) };
  const c = baseCase();
  c.studies = [{ id: 's2', type: 'thermo_elastic', temperature: { uniform_C: [25] } }];
  c.targets = [{ metric_id: 'x-m1', quantity: 'von_mises_max_MPa', selection: 'part:die', study: 's2', T_C: 25, value: 115, tolerance: { rel: 0.3 } }];
  const a = runCaseAll(c, { ...deps, mech, lib: {}, applyOverrides: null });
  assert.equal(a.targets[0].status, 'indeterminate');
  c.targets[0].allow_singular = true;
  c.targets[0].reason = 'paper value is a corner FE value on a comparable mesh';
  const b = runCaseAll(c, { ...deps, mech, lib: {}, applyOverrides: null });
  assert.equal(b.targets[0].status, 'pass');
});

test('expected values from DB rows are converted to the quantity unit (0.7 mm -> 700 um); others untouched', async () => {
  const { expectedInQuantityUnit } = await import('../src/thermal/case.mjs');
  assert.ok(Math.abs(expectedInQuantityUnit('warpage_um', 0.7, 'mm').value - 700) < 1e-9);
  assert.equal(expectedInQuantityUnit('warpage_um', 64, 'um').value, 64);
  assert.equal(expectedInQuantityUnit('stress_norm', 0.79, 'a.u.').value, 0.79);
  assert.equal(expectedInQuantityUnit('Rjc_C_W', 0.0108, 'C/W').value, 0.0108);
  assert.ok(Math.abs(expectedInQuantityUnit('von_mises_max_MPa', 0.115, 'GPa').value - 115) < 1e-9);
});

test('L9 requests: unused override keys warned; mechanics time budget skips temperatures not started, with reasons', async () => {
  const { unusedOverrides, runCaseAll } = await import('../src/thermal/case.mjs');
  const lib = { canonicalKey: (k) => ({ key: k === 'copper' ? 'cu_lib' : k }) };
  assert.deepEqual(unusedOverrides({ si_lib: {}, nope_lib: {}, copper: {} }, [{ materials: ['si_lib', 'homog:c4:cu_lib+uf:0.2'] }], lib), ['nope_lib']);
  const c = baseCase();
  c.materials.overrides = { not_in_model: { k_W_mK: 1 } };
  c.studies = [{ id: 's1', type: 'thermal_stationary' }];
  c.targets = [];
  const o = runCase(c, { ...deps, lib });
  assert.ok(o.gridWarnings.some((w) => /used by no part: not_in_model/.test(w)), o.gridWarnings.join('; '));
  let calls = 0;
  const mech = { runMechCase: () => { calls++; return { results: [], notes: [] }; } };
  const cm = baseCase();
  cm.studies = [{ id: 's2', type: 'thermo_elastic', temperature: { uniform_C: [25, 125, 240] } }];
  cm.targets = [];
  const a = runCaseAll(cm, { ...deps, mech, lib: {}, budget_s: 0 });
  assert.equal(calls, 0);
  assert.equal(a.errors.length, 3);
  assert.ok(a.errors.every((e) => e.skipped && /time budget/.test(e.error)));
});
