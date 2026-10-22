// Lane L10 (CLI and case runner, 2026-10-20): materials.allow_extrapolation through runCaseAll (case and study level,
// real L8 runMechCase and L2 library), uniform DB expected-value units, mesh.thin, study-level material overrides,
// status sensitivity, process_sequence never run as a thermal study. Geometry is a synthetic two-layer plate (not a
// package); material values come from the L2 library.
// License: GPL-3.0-or-later.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCase, runCase, runCaseAll, summarize, summarizeAll, expectedFor, expectedInQuantityUnit, metricLookupFromJson,
  studyOverrides, thinOf, sensitivityBound, libraryAdapter,
} from '../src/thermal/case.mjs';
import { main } from '../cli.mjs';
import { loadLibrary, applyOverrides, OVERRIDE_STATUSES } from '../src/materials/node.mjs';
import { runMechCase, mechLibrary, modelSurface } from '../src/mech/case.mjs';
import { solveMech } from '../src/mech/index.mjs';

const plate = [
  { id: 'core', kind: 'substrate', material: 'abf_gl', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 0, h_um: 200, priority: 0 },
  { id: 'die', kind: 'die', material: 'si_crystal', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 200, h_um: 300, priority: 0 },
];
const generate = (boxes) => () => ({ generator: 'plate/0', boxes: boxes.map((b) => ({ ...b })), warnings: [] });
const LIB = loadLibrary(undefined, { homogenization: 'rom' });
const MECH = { runMechCase, mechLibrary, modelSurface, solveMech };

const mechCase = (studies, extra = {}) => ({
  schema: 'ap-sim/0', id: 'l10/plate', family: 'plate', status: 'draft',
  geometry: { symmetry: 'quarter' },
  materials: { map: {}, ...(extra.materials ?? {}) },
  mesh: { max_xy_mm: 2.5, min_cells_per_layer: 1, grading: 1.3, max_nodes: 20000, ...(extra.mesh ?? {}) },
  physics: { mechanics: { element: 'q1im', stress_free_C: { default: 150 }, supports: 'symmetry' }, ...(extra.physics ?? {}) },
  studies,
  targets: extra.targets ?? [{ metric_id: 'l10-m1', quantity: 'warpage_um', selection: 'top:die', study: studies[0].id, T_C: studies[0].temperature?.uniform_C?.[0] }],
});
const mechDeps = (boxes = plate, extra = {}) => ({ generate: generate(boxes), resolve: (k, T, o) => LIB.resolve(k, T, o), lib: LIB, applyOverrides, mech: MECH, mechSolver: 'direct', ...extra });

test('allow_extrapolation reaches the CTE rebase through runCaseAll (case and study level); without it the study fails', () => {
  const st = [{ id: 'hot', type: 'thermo_elastic', temperature: { uniform_C: [265] } }];
  // abf_gl data end at 240 C: no permission -> per-temperature error naming the range, nothing hidden
  const a = runCaseAll(mechCase(st), mechDeps());
  assert.equal(a.mech.length, 0);
  assert.equal(a.errors.length, 1);
  assert.match(a.errors[0].error, /abf_gl.*outside valid_T_C/);
  // case level (list form): runs, the copy runMechCase sees keeps the key, extrapolation flagged
  const seen = [];
  const spy = { ...MECH, runMechCase: (cc, d) => { seen.push(cc.materials.allow_extrapolation); return runMechCase(cc, d); } };
  const b = runCaseAll(mechCase(st, { materials: { allow_extrapolation: ['abf_gl'] } }), mechDeps(plate, { mech: spy }));
  assert.deepEqual(b.errors, []);
  assert.deepEqual(seen, [['abf_gl']]);
  assert.equal(b.mech.length, 1);
  assert.ok(Number.isFinite(b.mech[0].derived.warpage[0].warpage_um));
  assert.ok(b.mech[0].warnings.some((w) => /abf_gl/.test(w) && /valid|extrapolat/.test(w)), b.mech[0].warnings.join('; '));
  // study level only: the hot study runs, a sibling study without it still fails; study false switches it off
  const st2 = [
    { id: 'hot', type: 'thermo_elastic', temperature: { uniform_C: [265] }, materials: { allow_extrapolation: true } },
    { id: 'hot2', type: 'thermo_elastic', temperature: { uniform_C: [265] } },
  ];
  const c = runCaseAll(mechCase(st2), mechDeps());
  assert.equal(c.mech.length, 1);
  assert.equal(c.mech[0].study, 'hot');
  assert.ok(Math.abs(c.mech[0].derived.warpage[0].warpage_um - b.mech[0].derived.warpage[0].warpage_um) < 1e-9);
  assert.equal(c.errors.length, 1);
  assert.equal(c.errors[0].study, 'hot2');
  const st3 = [{ id: 'hot', type: 'thermo_elastic', temperature: { uniform_C: [265] }, materials: { allow_extrapolation: false } }];
  const d = runCaseAll(mechCase(st3, { materials: { allow_extrapolation: true } }), mechDeps());
  assert.equal(d.errors.length, 1);
  assert.throws(() => parseCase(mechCase(st, { materials: { allow_extrapolation: 'yes' } })), /allow_extrapolation: must be true, false or a list/);
});

test('allow_extrapolation on a temperature.from study (thermal grid -> solveMech) and on the thermal study itself', () => {
  const c = mechCase([
    { id: 't', type: 'thermal_stationary', materials: { allow_extrapolation: ['abf_gl'] } },
    { id: 'm', type: 'thermo_elastic', temperature: { from: 't' }, materials: { allow_extrapolation: ['abf_gl'] } },
  ], {
    physics: { thermal: { sources: [{ parts: 'die', power_W: 0.5, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:core', type: 'temperature', T_C: 250 }, { selection: 'default', type: 'adiabatic' }] } },
    targets: [],
  });
  const ad = libraryAdapter(LIB, {}, { applyOverrides });
  const o = runCaseAll(c, { ...mechDeps(), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true });
  assert.deepEqual(o.errors, []);
  assert.ok(o.results[0].derived.Tmax_C.value > 250);
  assert.equal(o.mech.length, 1);
  assert.ok(o.mech[0].warnings.some((w) => /abf_gl/.test(w)), o.mech[0].warnings.join('; '));
});

test('expected values: one conversion rule (mm / um / nm, Pa / MPa / GPa, C/W / K/W / mK/W, K -> C); mismatches are never compared', () => {
  const cv = (q, v, u) => expectedInQuantityUnit(q, v, u);
  assert.equal(cv('warpage_um', 0.7, 'mm').value, 700);
  assert.equal(cv('warpage_um', 700, 'nm').value, 0.7);
  assert.equal(cv('coplanarity_um', 64, 'um').converted, null);
  assert.equal(cv('von_mises_max_MPa', 0.115, 'GPa').value, 115);
  assert.equal(cv('von_mises_max_MPa', 1.15e8, 'Pa').value, 115);
  assert.equal(cv('Rjc_C_W', 0.0108, 'C/W').converted, null);
  assert.equal(cv('Rjc_C_W', 0.0108, 'K/W').value, 0.0108);
  assert.equal(cv('theta_jc_C_W', 10.8, 'mK/W').value, 0.0108);
  assert.ok(Math.abs(cv('Tmax_C', 378.15, 'K').value - 105) < 1e-9);
  assert.equal(cv('Tmax_C', 105, '°C').value, 105);
  assert.equal(cv('heat_in_W', 500, 'mW').value, 0.5);
  assert.equal(cv('stress_norm', 0.79, 'a.u.').mismatch, null);
  assert.match(cv('Rjc_C_W', 3, 'C-mm2/W').mismatch, /C-mm2\/W vs C\/W/);
  assert.ok(cv('warpage_um', 3, 'MPa').mismatch);
  // case value with a unit follows the same rule; DB rows carry their table as the source
  assert.equal(expectedFor({ quantity: 'warpage_um', value: 0.7, unit: 'mm' }).expected, 700);
  const look = metricLookupFromJson({ rows: { 'x-m1': { table: 'metrics', value: 0.7, unit: 'mm' }, 'x-m2': { table: 'metrics', value: 3, unit: 'C-mm2/W' } } });
  const e1 = expectedFor({ metric_id: 'x-m1', quantity: 'warpage_um' }, look);
  assert.deepEqual([e1.expected, e1.expected_source, e1.expected_conversion], [700, 'db:metrics', '0.7 mm -> um']);
  const e2 = expectedFor({ metric_id: 'x-m2', quantity: 'Rjc_C_W' }, look);
  assert.equal(e2.expected, null);
  assert.match(e2.reason, /unit mismatch/);
});

test('expected-value units in runCase (sim_targets.json lookup, as the UI) and runCaseAll (mechanics)', () => {
  const c = {
    schema: 'ap-sim/0', id: 'l10/thermal', family: 'plate', geometry: { symmetry: 'quarter' }, materials: { map: {} },
    mesh: { max_xy_mm: 2.5, min_cells_per_layer: 1, max_nodes: 20000 },
    physics: { thermal: { sources: [{ parts: 'die', power_W: 10, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:core', type: 'temperature', T_C: 25 }, { selection: 'default', type: 'adiabatic' }] } },
    studies: [{ id: 's1', type: 'thermal_stationary' }],
    targets: [
      { metric_id: 'u-m1', quantity: 'Tmax_C', selection: 'die', tolerance: { abs_C: 1000 } },
      { metric_id: 'u-m2', quantity: 'Rjc_C_W', selection: 'die', tolerance: { rel: 100 } },
      { metric_id: 'u-m3', quantity: 'Rjc_C_W', selection: 'die', tolerance: { rel: 100 } },
    ],
  };
  const look = metricLookupFromJson({ rows: { 'u-m1': { table: 'metrics', value: 300.15, unit: 'K' }, 'u-m2': { table: 'metrics', value: 50, unit: 'mK/W' }, 'u-m3': { table: 'metrics', value: 5, unit: 'C-mm2/W' } } });
  const ad = libraryAdapter(LIB, {}, { applyOverrides });
  const o = runCase(c, { generate: generate(plate), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true, metricLookup: look });
  assert.ok(Math.abs(o.targets[0].expected - 27) < 1e-9);
  assert.equal(o.targets[0].status, 'pass');
  assert.equal(o.targets[1].expected, 0.05);
  assert.equal(o.targets[1].expected_conversion, '50 mK/W -> C/W');
  assert.equal(o.targets[2].expected, null);
  assert.equal(o.targets[2].status, 'unchecked');
  assert.ok(Number.isFinite(o.targets[2].got));
  assert.match(o.targets[2].reason, /unit mismatch/);
  assert.match(summarize(o), /expected 0\.05 \(DB\) \[50 mK\/W -> C\/W\]/);
  // mechanics: DB 0.7 mm against warpage_um (fan-out a-m9 form)
  const r = { study: 's2', T_C: 25, type: 'thermo_elastic', warnings: [], surface_map: {}, derived: { warpage: [{ surface: 'top:die', warpage_um: 650, coplanarity_um: 650, definition: 'jeita', sign_convention: 'x', view_side: 'top' }], von_mises_per_part: {} } };
  const mc = mechCase([{ id: 's2', type: 'thermo_elastic', temperature: { uniform_C: [25] } }], { targets: [{ metric_id: 'f-m9', quantity: 'warpage_um', selection: 'top:die', study: 's2', T_C: 25, tolerance: { rel: 0.2 } }] });
  const a = runCaseAll(mc, { ...mechDeps(), mech: { runMechCase: () => ({ results: [{ ...r }], notes: [] }) }, metricLookup: (id) => (id === 'f-m9' ? { value: 0.7, unit: 'mm' } : null) });
  assert.equal(a.targets[0].expected, 700);
  assert.equal(a.targets[0].status, 'pass');
});

test('mesh.thin: parsed (true | {max_aspect}) and passed to runMechCase as `thin`; the real merge reports the merged films', () => {
  const st = [{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }];
  assert.equal(thinOf(mechCase(st)), null);
  assert.deepEqual(thinOf(mechCase(st, { mesh: { thin: true } })), {});
  assert.deepEqual(thinOf(mechCase(st, { mesh: { thin: { max_aspect: 300 } } })), { max_aspect: 300 });
  assert.throws(() => parseCase(mechCase(st, { mesh: { thin: { aspect: 3 } } })), /mesh\.thin: unknown key aspect/);
  assert.throws(() => parseCase(mechCase(st, { mesh: { thin: { max_aspect: -1 } } })), /positive number/);
  assert.throws(() => parseCase(mechCase(st, { mesh: { thin: 'yes' } })), /mesh\.thin: true, false or/);
  const got = [];
  const spy = { ...MECH, runMechCase: (cc, d) => { got.push(d.thin ?? null); return { results: [], notes: [] }; } };
  runCaseAll(mechCase(st, { mesh: { thin: { max_aspect: 300 } } }), mechDeps(plate, { mech: spy }));
  runCaseAll(mechCase(st), mechDeps(plate, { mech: spy }));
  assert.deepEqual(got, [{ max_aspect: 300 }, null]);
  // two 1 um films (cell 2.5 mm / 1 um = aspect 2500 > 500) on the plate: merged into one laminate block
  const films = [
    ...plate.map((b) => (b.id === 'die' ? { ...b, z_um: 202 } : b)),
    { id: 'f1', kind: 'layer', material: 'sio2_film', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 200, h_um: 1, priority: 0 },
    { id: 'f2', kind: 'layer', material: 'cu_electroplated', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: 201, h_um: 1, priority: 0 },
  ];
  const o = runCaseAll(mechCase(st, { mesh: { thin: true } }), mechDeps(films));
  assert.deepEqual(o.errors, []);
  assert.ok(o.mech[0].thin_layers?.merged?.length >= 1, JSON.stringify(o.mech[0].thin_layers));
  const o0 = runCaseAll(mechCase(st), mechDeps(films));
  assert.equal(o0.mech[0].thin_layers, null);
  const w = o.mech[0].derived.warpage[0].warpage_um, w0 = o0.mech[0].derived.warpage[0].warpage_um;
  assert.ok(Math.abs(w / w0 - 1) < 0.02, `merged ${w} vs unmerged ${w0}`);
});

test('study-level materials.overrides merged over the case level (thermal through libraryAdapter, mechanics through runMechCase)', () => {
  const kOv = (v) => ({ k_W_mK: { value: v, status: 'user', note: 'L10 test value' } });
  assert.deepEqual(studyOverrides({ materials: { overrides: { abf_gl: { E_GPa: 1, nu: 0.3 } } } }, { materials: { overrides: { abf_gl: { E_GPa: 2 } } } }), { abf_gl: { E_GPa: 2, nu: 0.3 } });
  const thermal = { sources: [{ parts: 'die', power_W: 10, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:core', type: 'temperature', T_C: 25 }, { selection: 'default', type: 'adiabatic' }] };
  const c = {
    schema: 'ap-sim/0', id: 'l10/ov', family: 'plate', geometry: { symmetry: 'quarter' }, materials: { map: {}, overrides: { abf_gl: kOv(0.5) } },
    mesh: { max_xy_mm: 2.5, min_cells_per_layer: 1, max_nodes: 20000 }, physics: { thermal },
    studies: [{ id: 'a', type: 'thermal_stationary' }, { id: 'b', type: 'thermal_stationary', materials: { overrides: { abf_gl: kOv(5) } } }],
    targets: [],
  };
  const ad = libraryAdapter(LIB, {}, { overrides: c.materials.overrides, applyOverrides });
  const deps = { generate: generate(plate), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true, lib: LIB, applyOverrides };
  const o = runCase(c, deps);
  const [ta, tb] = o.results.map((r) => r.derived.Tmax_C.value);
  // the same k at case level gives the same answer as the study-level value
  const c5 = { ...c, materials: { map: {}, overrides: { abf_gl: kOv(5) } }, studies: [{ id: 'a', type: 'thermal_stationary' }] };
  const ad5 = libraryAdapter(LIB, {}, { overrides: c5.materials.overrides, applyOverrides });
  const t5 = runCase(c5, { ...deps, resolve: ad5.resolve }).results[0].derived.Tmax_C.value;
  assert.ok(ta > tb + 1e-3, `${ta} vs ${tb}`);
  assert.ok(Math.abs(tb - t5) < 1e-9, `${tb} vs ${t5}`);
  assert.ok(o.results[1].warnings.some((w) => /merged over the case level/.test(w)));
  assert.throws(() => runCase(c, { ...deps, lib: null }), /need deps\.lib and deps\.applyOverrides/);
  // k-only path (no applyOverrides): the overrideResolver gets the merged set
  const raw = { generate: generate(plate), resolve: (k, T, op) => LIB.resolve(k, T, op) };
  const r2 = runCase(c, raw).results.map((r) => r.derived.Tmax_C.value);
  assert.ok(Math.abs(r2[0] - ta) < 1e-9 && Math.abs(r2[1] - tb) < 1e-9);
  // mechanics: a study-level E of abf_gl equals the same E at case level, and differs from the library value
  const eOv = { abf_gl: { E_GPa: { value: 3, status: 'user', note: 'L10 test value' } } };
  const st = [{ id: 'base', type: 'thermo_elastic', temperature: { uniform_C: [25] } }, { id: 'soft', type: 'thermo_elastic', temperature: { uniform_C: [25] }, materials: { overrides: eOv } }];
  const m = runCaseAll(mechCase(st, { targets: [] }), mechDeps());
  const mc = runCaseAll(mechCase([st[0]], { materials: { overrides: eOv }, targets: [] }), mechDeps());
  const w = (x, id) => x.mech.find((r) => r.study === id).derived.warpage;
  const wb = m.mech[0].derived, ws = m.mech[1].derived, wc = mc.mech[0].derived;
  assert.ok(Math.abs(ws.max_abs_u_m - wc.max_abs_u_m) < 1e-15, `${ws.max_abs_u_m} vs ${wc.max_abs_u_m}`);
  assert.ok(Math.abs(wb.max_abs_u_m / ws.max_abs_u_m - 1) > 1e-3);
  assert.equal(w(m, 'base').length, 0);
  assert.throws(() => parseCase({ ...c, studies: [{ id: 'a', type: 'thermal_stationary', materials: { overrides: [1] } }] }), /must be a mapping/);
});

test('status sensitivity: accepted by the L2 library, reported on the run and its targets; CLI bound runs use it', async () => {
  assert.ok(OVERRIDE_STATUSES.includes('sensitivity'));
  const ov = { abf_gl: { k_W_mK: { value: 0.4, status: 'sensitivity', note: 'bound run of a template value (test)' } } };
  assert.deepEqual(sensitivityBound(ov), ['abf_gl.k_W_mK = 0.4']);
  const c = {
    schema: 'ap-sim/0', id: 'l10/sens', family: 'plate', geometry: { symmetry: 'quarter' }, materials: { map: {}, overrides: ov },
    mesh: { max_xy_mm: 2.5, min_cells_per_layer: 1, max_nodes: 20000 },
    physics: { thermal: { sources: [{ parts: 'die', power_W: 10, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:core', type: 'temperature', T_C: 25 }, { selection: 'default', type: 'adiabatic' }] } },
    studies: [{ id: 's1', type: 'thermal_stationary' }],
    targets: [{ metric_id: 's-m1', quantity: 'Tmax_C', selection: 'die', value: 30, tolerance: { abs_C: 100 } }],
  };
  const ad = libraryAdapter(LIB, {}, { overrides: ov, applyOverrides });
  const o = runCase(c, { generate: generate(plate), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true });
  assert.deepEqual(o.sensitivity_bound, ['abf_gl.k_W_mK = 0.4']);
  assert.equal(o.targets[0].sensitivity_bound, true);
  assert.match(summarize(o), /sensitivity-bound run/);
  assert.match(summarize(o), /\[sensitivity bound\]/);
  // CLI --sensitivity on a thermo_elastic study: the bound status handed to the runner follows the library
  const seen = [];
  const core = {
    runSensitivity: (_c, o2) => { seen.push(o2.boundStatus); return { rows: [], spread: {}, runs: 1, unsupported: [], used_keys: [] }; },
    summarizeSensitivity: () => 'ok', boundsOf: () => ({ values: [] }),
  };
  const io = { stdout: { write: () => {} }, stderr: { write: () => {} } };
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { stringify } = await import('yaml');
  const dir = mkdtempSync(join(tmpdir(), 'l10-'));
  try {
    const f = join(dir, 'c.yaml');
    writeFileSync(f, stringify(mechCase([{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }], { targets: [] })));
    const base = { ...mechDeps(), sensitivity: core, overrideStatuses: OVERRIDE_STATUSES };
    assert.equal(await main(['node', 'cli.mjs', f, '--sensitivity'], base, io), 0);
    assert.equal(await main(['node', 'cli.mjs', f, '--sensitivity'], { ...base, overrideStatuses: ['user'] }, io), 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  assert.deepEqual(seen, ['sensitivity', 'user']);
});

test('process_sequence studies go to the mechanics runner only (never run as thermal studies), with allow_extrapolation kept', () => {
  const calls = [];
  const mech = { runMechCase: (cc, d) => { calls.push({ study: d.study, allow: cc.materials.allow_extrapolation ?? null }); return { results: [{ study: d.study, type: 'process_sequence', steps: [], warnings: [] }], targets: [], notes: [] }; } };
  const c = mechCase([{ id: 'p', type: 'process_sequence', steps: [{ id: 'cool', T_C: 25 }] }], { materials: { allow_extrapolation: ['abf_gl'] }, targets: [], physics: {} });
  delete c.physics.mechanics;
  const o = runCaseAll(c, { ...mechDeps(), mech });
  assert.deepEqual(o.errors, []);
  assert.equal(o.results.length, 0);
  assert.deepEqual(calls, [{ study: 'p', allow: ['abf_gl'] }]);
  assert.match(summarizeAll(o), /process_sequence/);
  assert.equal(runCase(c, mechDeps()).skipped[0].type, 'process_sequence');
});

// ---- wave 2 (L9 wave 2 findings) -------------------------------------------------------------------------------

test('mechanics rtol: package default 1e-7, tier A/B gates 1e-10, case key and run option; reaches solveMech; relres reported', async () => {
  const { mechSolveOf, MECH_RTOL } = await import('../src/thermal/case.mjs');
  const st = [{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }];
  assert.deepEqual([MECH_RTOL.package, MECH_RTOL.gate, MECH_RTOL.accept], [1e-7, 1e-10, 1e-6]);
  assert.equal(mechSolveOf(mechCase(st), st[0]).rtol, 1e-7);
  assert.equal(mechSolveOf(mechCase(st, { targets: [{ quantity: 'warpage_um', selection: 'top:die', study: 's', tier: 'A' }] }), st[0]).rtol, 1e-10);
  const ck = mechCase(st, { physics: { mechanics: { element: 'q1im', stress_free_C: { default: 150 }, supports: 'symmetry', rtol: 1e-8, max_iter: 50 } } });
  assert.deepEqual([mechSolveOf(ck, st[0]).rtol, mechSolveOf(ck, st[0]).maxIter], [1e-8, 50]);
  assert.equal(mechSolveOf(ck, st[0], 1e-6).rtol, 1e-6);
  assert.throws(() => parseCase(mechCase(st, { physics: { mechanics: { stress_free_C: { default: 150 }, rtol: 0.5 } } })), /rtol: number in/);
  assert.throws(() => parseCase(mechCase(st, { physics: { mechanics: { stress_free_C: { default: 150 }, max_iter: 2.5 } } })), /max_iter: positive integer/);
  // runMechCase receives rtol / maxIter as deps (forwarded to solveMech once L8 adds it)
  const got = [];
  const spy = { ...MECH, runMechCase: (cc, d) => { got.push([d.rtol, d.maxIter ?? null]); return { results: [], notes: [] }; } };
  runCaseAll(ck, mechDeps(plate, { mech: spy }));
  runCaseAll(mechCase(st), mechDeps(plate, { mech: spy, mechRtol: 1e-9 }));
  assert.deepEqual(got, [[1e-8, 50], [1e-9, null]]);
  // a runMechCase that does not forward rtol (L8 today): reported, and the record states the solver default
  const nf = runCaseAll(mechCase(st), mechDeps(plate, { mech: { runMechCase: () => ({ results: [{ study: 's', T_C: 25, type: 'thermo_elastic', warnings: [], timing: { iterations: 9, solver: { solver: 'pcg_gmg', relres: 3e-11, iterations: 9, converged: true } }, derived: { warpage: [] } }], notes: [] }) } }));
  assert.ok(nf.notes.some((n) => /does not forward rtol/.test(n)));
  assert.equal(nf.mech[0].convergence.rtol_requested, 1e-10);
  assert.match(nf.mech[0].convergence.rtol_source, /requested 1e-7/);
  // temperature.from path: solveMech itself takes rtol / maxIter; PCG + GMG with the package rtol stops at <= 1e-7
  const thermal = { sources: [{ parts: 'die', power_W: 0.5, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:core', type: 'temperature', T_C: 100 }, { selection: 'default', type: 'adiabatic' }] };
  // 0.1 mm cells: 2.4e4 DOF, so the multigrid has a coarse level that is not the whole problem (PCG is not exact in 1 step)
  const tf = (mech) => mechCase([{ id: 't', type: 'thermal_stationary' }, { id: 'm', type: 'thermo_elastic', temperature: { from: 't' } }], { mesh: { max_xy_mm: 0.1, min_cells_per_layer: 2 }, physics: { thermal, mechanics: { element: 'q1im', stress_free_C: { default: 150 }, supports: 'symmetry', ...mech } }, targets: [{ metric_id: 'tf-m1', quantity: 'warpage_um', selection: 'top:die', study: 'm', value: 1, tolerance: { rel: 1e9 } }] });
  const ad = libraryAdapter(LIB, {}, { applyOverrides });
  const dp = { ...mechDeps(), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true, mechSolver: 'pcg_gmg' };
  const a = runCaseAll(tf({}), dp);
  assert.deepEqual(a.errors, []);
  const cv = a.mech[0].convergence;
  assert.ok(cv && cv.converged && cv.relres <= 1e-7 && cv.rtol_requested === 1e-7, JSON.stringify(cv));
  assert.match(summarizeAll(a), /relres \d\.\d\de-\d+ \(rtol 1e-7\)/);
  // capped far above the acceptance level: a study error, its target not compared
  const b = runCaseAll(tf({ max_iter: 1 }), dp);
  assert.ok(b.mech[0].convergence.relres >= 1e-6, JSON.stringify(b.mech[0].convergence));
  assert.equal(b.errors.length, 1);
  assert.ok(b.errors[0].unconverged && /not converged/.test(b.errors[0].error));
  assert.equal(b.targets[0].status, 'unchecked');
  assert.match(b.targets[0].reason, /not converged/);
});

test('mechanics convergence: stopped above rtol but relres < 1e-6 is a warning (accepted), otherwise an error', async () => {
  const { mechConvergence } = await import('../src/thermal/case.mjs');
  const res = (relres, converged) => ({ study: 's', T_C: 25, type: 'thermo_elastic', warnings: [`mech: pcg_gmg not converged: relres ${relres.toExponential(2)} after 3000 iterations`], surface_map: {}, timing: { iterations: 3000, solver: { solver: 'pcg_gmg', relres, iterations: 3000, converged } }, derived: { warpage: [{ surface: 'top:die', warpage_um: 100, coplanarity_um: 100 }], von_mises_per_part: {} } });
  const r1 = res(4.5e-7, false);
  const c1 = mechConvergence(r1, { rtol: 1e-10, source: 'x' });
  assert.equal(c1.accepted, true);
  assert.ok(!r1.warnings.some((w) => /not converged: relres/.test(w)) && r1.warnings.some((w) => /accepted: relres < 1e-6/.test(w)));
  assert.equal(mechConvergence(res(1e-5, false), {}).accepted, false);
  assert.equal(mechConvergence({ timing: { solver: { solver: 'direct' } } }, {}), null);
  const st = [{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }];
  const tg = [{ metric_id: 'c-m1', quantity: 'warpage_um', selection: 'top:die', study: 's', T_C: 25, value: 100, tolerance: { rel: 0.01 } }];
  const run = (relres) => runCaseAll(mechCase(st, { targets: tg }), mechDeps(plate, { mech: { forwardsRtol: true, runMechCase: () => ({ results: [res(relres, false)], notes: [] }) } }));
  const ok = run(4.5e-7);
  assert.deepEqual(ok.errors, []);
  assert.equal(ok.targets[0].status, 'pass');
  const bad = run(1e-5);
  assert.equal(bad.errors.length, 1);
  assert.equal(bad.targets[0].status, 'unchecked');
});

test('single-step thermo_elastic with per-part stress-free temperatures warns (process_sequence suggested)', async () => {
  const { perPartTsfWarning } = await import('../src/thermal/case.mjs');
  const mk = (sf, s = {}) => mechCase([{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] }, ...s }], { physics: { mechanics: { element: 'q1im', stress_free_C: sf, supports: 'symmetry' } }, targets: [] });
  const c = mk({ default: 170, per_part: { 'ring_*': 130 } });
  assert.match(perPartTsfWarning(c, c.studies[0]), /ring_\* = 130 C differs from the default 170 C.*process_sequence/);
  const c2 = mk({ default: 170, per_part: { 'ring_*': 170 } });
  assert.equal(perPartTsfWarning(c2, c2.studies[0]), null);
  const c3 = mk({ default: 170, per_part: { 'ring_*': 130 } }, { stress_free_C: 130 });
  assert.equal(perPartTsfWarning(c3, c3.studies[0]), null);
  const c4 = mk({ default: { value: 170, status: 'reported', ref: 'x' }, per_part: { die: { value: 130, status: 'reported', ref: 'y' } } });
  const o = runCaseAll(c4, mechDeps(plate, { mechSolver: 'direct' }));
  assert.ok(o.mech[0].warnings.some((w) => /stress_free_C\.per_part die = 130 C/.test(w)), o.mech[0].warnings.join('; '));
  assert.ok(o.notes.some((n) => /per_part die/.test(n)));
});

test('engine version stamp: content hash of src and data, dirty flag from git; stamped into CLI JSON and summaries', async () => {
  const { engineVersion, engineVersionLine } = await import('../cli.mjs');
  const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { stringify } = await import('yaml');
  const dir = mkdtempSync(join(tmpdir(), 'l10v-'));
  try {
    mkdirSync(join(dir, 'src', 'a'), { recursive: true });
    mkdirSync(join(dir, 'data'));
    writeFileSync(join(dir, 'src', 'a', 'x.mjs'), 'export const x = 1;\n');
    writeFileSync(join(dir, 'src', 'a', 'notes.txt'), 'ignored\n');
    writeFileSync(join(dir, 'cli.mjs'), '// cli\n');
    writeFileSync(join(dir, 'data', 'm.yaml'), 'k: 1\n');
    const v1 = engineVersion(dir);
    assert.match(v1.src, /^[0-9a-f]{12}$/);
    assert.equal(v1.src_files, 2);
    assert.equal(engineVersion(dir).src, v1.src);
    writeFileSync(join(dir, 'src', 'a', 'notes.txt'), 'changed\n');
    assert.equal(engineVersion(dir).src, v1.src);
    writeFileSync(join(dir, 'src', 'a', 'x.mjs'), 'export const x = 2;\n');
    const v2 = engineVersion(dir);
    assert.notEqual(v2.src, v1.src);
    assert.equal(v2.data, v1.data);
    writeFileSync(join(dir, 'data', 'm.yaml'), 'k: 2\n');
    assert.notEqual(engineVersion(dir).data, v1.data);
    // a directory outside any git work tree: dirty unknown
    assert.equal(v1.dirty, null);
    assert.match(engineVersionLine(v1), /git state unknown/);
    // the real engine: dirty is true / false, or 'untracked' while git tracks nothing under engine/ (audit A3 M4)
    const vr = engineVersion();
    assert.ok([true, false, 'untracked'].includes(vr.dirty), String(vr.dirty));
    assert.match(vr.package3d, /^[0-9a-f]{12}$/);
    assert.match(vr.metrics, /^[0-9a-f]{12}$/);
    assert.equal(v1.package3d, null);
    // CLI output carries the stamp (JSON field, first summary line)
    const f = join(dir, 'c.yaml');
    writeFileSync(f, stringify(mechCase([{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }], { targets: [] })));
    const ver = { src: 'abc123abc123', src_files: 1, data: 'def456def456', data_files: 1, dirty: true, dirty_files: 3 };
    let out = '';
    const io = { stdout: { write: (x) => { out += x; } }, stderr: { write: () => {} } };
    const deps = { ...mechDeps(plate, { mechSolver: 'direct' }), engineVersion: ver, metricLookup: null };
    assert.equal(await main(['node', 'cli.mjs', f, '--json'], deps, io), 0);
    assert.deepEqual(JSON.parse(out).engine_version, ver);
    out = '';
    assert.equal(await main(['node', 'cli.mjs', f], deps, io), 0);
    assert.match(out.split('\n')[0], /^engine src abc123abc123 .*dirty \(3 git status entries/);
    assert.equal(await main(['node', 'cli.mjs', f, '--mech-rtol', '5'], deps, io), 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runMechCase forwards rtol / maxIter to solveMech: a uniform-T study runs at the requested tolerance (L10 cross-lane edit)', () => {
  const st = [{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }];
  const c = (mech) => mechCase(st, { mesh: { max_xy_mm: 0.1, min_cells_per_layer: 2 }, physics: { mechanics: { element: 'q1im', stress_free_C: { default: 150 }, supports: 'symmetry', ...mech } }, targets: [] });
  const base = { generate: generate(plate), lib: LIB, applyOverrides, solver: 'pcg_gmg', warmStart: false };
  const r10 = runMechCase(c({}), base).results[0].timing.solver;
  const r3 = runMechCase(c({}), { ...base, rtol: 1e-3 }).results[0].timing.solver;
  assert.ok(r10.relres <= 1e-10 && r3.relres <= 1e-3 && r3.relres > 1e-10, `${r10.relres} ${r3.relres}`);
  assert.ok(r3.iterations < r10.iterations, `${r3.iterations} vs ${r10.iterations}`);
  assert.equal(runMechCase(c({}), { ...base, maxIter: 1 }).results[0].timing.solver.iterations, 1);
  // through runCaseAll: the package default reaches solveMech and the record says so (no not-forwarded note)
  const o = runCaseAll(c({ rtol: 1e-3 }), mechDeps(plate, { mechSolver: 'pcg_gmg' }));
  assert.ok(!o.notes.some((n) => /does not forward rtol/.test(n)), o.notes.join('; '));
  const cv = o.mech[0].convergence;
  assert.equal(cv.rtol_requested, 1e-3);
  assert.equal(cv.iterations, r3.iterations);
});

// ---- wave 4 (audit A3 S6, S1 / M1, M4) ------------------------------------------------------------------------

// synthetic constant-property and Tg-layer sets (test values, not material data; as tests/mech-process.test.mjs)
const stubLib = ({ Eemc = () => 8e9, cure = null } = {}) => {
  const resolve = (k, T_K) => (k === 'si'
    ? { elastic: { type: 'iso', E_Pa: 130e9, nu: 0.28 }, cte: { kind: 'secant', Tref_K: T_K, alpha: [2.6e-6, 2.6e-6, 2.6e-6] } }
    : { elastic: { type: 'iso', E_Pa: Eemc(T_K), nu: 0.35 }, cte: { kind: 'secant', Tref_K: T_K, alpha: [30e-6, 30e-6, 30e-6] }, ...(cure ? { cure_shrinkage: cure } : {}) });
  return { keys: () => ['si', 'emc'], aliasTemplateKey: (k) => ({ key: k }), resolve, rebaseSecantCte: (k, Tsf, T) => ({ alpha: resolve(k, T).cte.alpha }) };
};
const bilayer = (w_mm) => [
  { id: 'si', kind: 'die', material: 'si', x_mm: 0, y_mm: 0, w_mm, d_mm: w_mm, z_um: 0, h_um: 500, priority: 0 },
  { id: 'emc', kind: 'mold', material: 'emc', x_mm: 0, y_mm: 0, w_mm, d_mm: w_mm, z_um: 500, h_um: 200, priority: 0 },
];
const bCase = (studies, extra = {}) => ({
  schema: 'ap-sim/0', id: 'l10/bilayer', family: 'bilayer', status: 'draft', geometry: { symmetry: 'quarter' },
  materials: { map: {}, ...(extra.materials ?? {}) }, mesh: { max_xy_mm: 1, min_cells_per_layer: 2, grading: 1.3, max_nodes: 50000 },
  physics: { mechanics: { element: 'q1im', stress_free_C: { default: 150 }, supports: 'symmetry', ...(extra.mechanics ?? {}) } },
  studies, targets: extra.targets ?? [],
});
const bDeps = (w_mm, lib, extra = {}) => ({ generate: generate(bilayer(w_mm)), lib, applyOverrides: null, mech: MECH, mechSolver: 'direct', ...extra });
const wOf = (r) => r.derived.warpage[0].warpage_um;

test('nonlinear: physics.mechanics.nonlinear / study key -> total-Lagrangian q2s; DOF limit with a clear error', () => {
  const tg = (study) => [{ metric_id: 'n-m1', quantity: 'warpage_um', selection: 'top:emc', study, T_C: 25 }];
  const st = [{ id: 'lin', type: 'thermo_elastic', element: 'q2s', temperature: { uniform_C: [25] } }, { id: 'nl', type: 'thermo_elastic', temperature: { uniform_C: [25] }, nonlinear: { steps: 6 } }];
  const o = runCaseAll(bCase(st, { targets: [...tg('lin'), ...tg('nl')] }), bDeps(10, stubLib()));
  assert.deepEqual(o.errors, []);
  const [rl, rn] = ['lin', 'nl'].map((id) => o.mech.find((r) => r.study === id));
  assert.equal(rn.element, 'q2s');
  assert.equal(rn.nonlinear.load_steps, 6);
  assert.ok(rn.nonlinear.newton.every((h) => h.relres < 1e-9));
  const d = wOf(rn) / wOf(rl) - 1;
  assert.ok(Math.abs(d) > 1e-4 && Math.abs(d) < 0.1, `nonlinear / linear - 1 = ${d}`);
  assert.equal(o.targets[1].got, wOf(rn));
  assert.match(summarizeAll(o), /\[nonlinear, 6 load steps\]/);
  // case-level key, explicit limit below the model size: study error naming the DOF and the fix
  const big = runCaseAll(bCase([st[0]], { mechanics: { nonlinear: { max_dof: 10 } } }), bDeps(10, stubLib()));
  assert.equal(big.mech.length, 0);
  assert.match(big.errors[0].error, /nonlinear \(total Lagrangian, q2s\) model has \d+ DOF, above the limit 10/);
  assert.throws(() => parseCase(bCase([{ ...st[1], nonlinear: { max_dof: -1 } }])), /nonlinear\.max_dof: positive integer/);
  assert.throws(() => parseCase(bCase([{ ...st[1], nonlinear: { newton: 3 } }])), /unknown key newton/);
  // SPEC 21 branch key (audit A7 S2)
  for (const branch of ['stable', 'follow']) parseCase(bCase([{ ...st[1], nonlinear: { branch } }]));
  assert.throws(() => parseCase(bCase([{ ...st[1], nonlinear: { branch: 'other' } }])), /nonlinear\.branch: stable \| follow/);
});

test('thermo_elastic_sweep: rate form along path_C (E across Tg), equal to solveMechSweep, different from the total form', async () => {
  const { buildGrid } = await import('../src/grid/index.mjs');
  const { solveMechSweep } = await import('../src/mech/sweep.mjs');
  const lib = stubLib({ Eemc: (T_K) => (T_K - 273.15 > 100 ? 0.4e9 : 8e9) });
  const st = [
    { id: 'sw', type: 'thermo_elastic_sweep', temperature: { path_C: [100, 25] }, dT_max: 5 },
    { id: 'tot', type: 'thermo_elastic', temperature: { uniform_C: [25] } },
  ];
  const targets = [{ metric_id: 'sw-m1', quantity: 'warpage_um', selection: 'top:emc', study: 'sw', T_C: 25 }, { metric_id: 'sw-m2', quantity: 'warpage_um', selection: 'top:emc', study: 'tot', T_C: 25 }];
  const o = runCaseAll(bCase(st, { targets }), bDeps(20, lib));
  assert.deepEqual(o.errors, []);
  const sw = o.mech.filter((r) => r.study === 'sw');
  assert.deepEqual(sw.map((r) => r.T_C), [100, 25]);
  const grid = buildGrid(bilayer(20), { max_xy_mm: 1, min_cells_per_layer: 2, grading: 1.3, max_nodes: 50000, symmetry: 'quarter', drop_kinds: [], materialOf: (p) => p.material });
  const ref = solveMechSweep(grid, { resolve: lib.resolve, rebase: lib.rebaseSecantCte, supports: 'symmetry', stress_free_C: { default: 150, per_part: {} }, path_C: [100, 25], dT_max: 5, warpage: ['top:emc'] });
  assert.ok(Math.abs(wOf(sw[1]) / ref.steps[1].warpage[0].warpage_um - 1) < 1e-9);
  assert.ok(Math.abs(o.targets[0].got / o.targets[1].got - 1) > 0.05, `${o.targets[0].got} vs ${o.targets[1].got}`);
  assert.equal(runCase(bCase(st), bDeps(20, lib)).skipped.length, 2);
  assert.throws(() => parseCase(bCase([{ id: 'sw', type: 'thermo_elastic_sweep', temperature: { uniform_C: [25] } }])), /unknown key uniform_C|path_C/);
  const tiny = runCaseAll(bCase([{ ...st[0], max_dof: 10 }]), bDeps(20, lib));
  assert.match(tiny.errors[0].error, /above the rate-form sweep limit 10/);
});

test('materials.cure_shrinkage off | library | both (default off, stated per result); kind not stated -> bracket', () => {
  const st = [{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }];
  const targets = [{ metric_id: 'cs-m1', quantity: 'warpage_um', selection: 'top:emc', study: 's', T_C: 25 }];
  const lib = stubLib({ cure: { value: 0.0016, linear: 0.0016 } });
  const off = runCaseAll(bCase(st, { targets }), bDeps(10, lib));
  assert.equal(off.mech[0].cure_shrinkage, 'off');
  const libm = runCaseAll(bCase(st, { targets, materials: { cure_shrinkage: 'library' } }), bDeps(10, lib));
  assert.equal(libm.mech[0].cure_shrinkage, 'library');
  assert.ok(Math.abs(wOf(libm.mech[0]) - wOf(off.mech[0])) > 1e-3 * Math.abs(wOf(off.mech[0])));
  const both = runCaseAll(bCase(st, { targets, materials: { cure_shrinkage: 'both' } }), bDeps(10, lib));
  assert.equal(both.mech.length, 2);
  assert.equal(both.targets[0].got, wOf(off.mech[0]));
  assert.equal(both.targets[0].got_cure_shrinkage, wOf(libm.mech[0]));
  assert.match(summarizeAll(both), /with cure shrinkage/);
  // kind not stated: L8 runs the linear / volumetric pair; both values reported
  const ns = runCaseAll(bCase(st, { targets, materials: { cure_shrinkage: 'library' } }), bDeps(10, stubLib({ cure: { value: 0.0016 } })));
  assert.deepEqual(Object.keys(ns.targets[0].got_by_shrinkage).sort(), ['linear', 'volumetric']);
  assert.throws(() => parseCase(bCase(st, { materials: { cure_shrinkage: 'yes' } })), /cure_shrinkage: yes not in off \| library \| both/);
});

test('viscoelastic studies are refused at parse time (no sourced Prony / WLF data)', () => {
  const st = (x) => [{ id: 'v', type: 'thermo_elastic', temperature: { uniform_C: [25] }, ...x }];
  assert.throws(() => parseCase(bCase([{ id: 'v', type: 'thermo_viscoelastic', temperature: { uniform_C: [25] } }])), /no sourced Prony \/ WLF data/);
  assert.throws(() => parseCase(bCase(st({ viscoelastic: true }))), /no sourced Prony \/ WLF data/);
  assert.throws(() => parseCase(bCase(st({}), { mechanics: { viscoelastic: { emc: 'prony' } } })), /physics\.mechanics\.viscoelastic: .*no sourced Prony/);
});

test('homogenization record: homogStats deltas and RVE -> ROM fallbacks on every result; label rve only without fallback', async () => {
  const { homogRecord } = await import('../src/thermal/case.mjs');
  const h0 = homogRecord('rve', { table_exact: 1, keys: [] }, { table_exact: 3, live_full: 1, keys: [] });
  assert.deepEqual([h0.label, h0.stats], ['rve', { table_exact: 2, live_full: 1 }]);
  assert.equal(homogRecord('rve', { keys: [] }, { keys: ['homog:x'] }).label, 'rve (with rom fallback for 1 keys)');
  assert.equal(homogRecord('rve', null, null, ['homog:y']).label, 'rve (with rom fallback for 1 keys)');
  assert.equal(homogRecord('rom', null, null).label, 'rom');
  // thermal run on the real library (CD7 rve default) with a homogenized part
  const parts = [...plate, { id: 'pth', kind: 'pth_field', material: 'homog:pth:copper+organic_laminate:0.0346', x_mm: 0, y_mm: 0, w_mm: 10, d_mm: 10, z_um: -400, h_um: 400, priority: 0 }];
  const L = loadLibrary();
  const ad = libraryAdapter(L, {}, { applyOverrides });
  const c = {
    schema: 'ap-sim/0', id: 'l10/homog', family: 'plate', geometry: { symmetry: 'quarter' }, materials: { map: {} },
    mesh: { max_xy_mm: 2.5, min_cells_per_layer: 1, max_nodes: 20000 },
    physics: { thermal: { sources: [{ parts: 'die', power_W: 1, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:pth', type: 'temperature', T_C: 25 }, { selection: 'default', type: 'adiabatic' }] } },
    studies: [{ id: 's1', type: 'thermal_stationary' }], targets: [],
  };
  const o = runCase(c, { generate: generate(parts), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true });
  const h = o.results[0].homogenization_record;
  assert.equal(h.label, 'rve');
  assert.deepEqual(h.rom_fallbacks, []);
  assert.ok(Object.values(h.stats).reduce((a, b) => a + b, 0) >= 1, JSON.stringify(h.stats));
  assert.match(summarize(o), /homogenization rve: table exact \d+/);
  // mechanics: a fallback seen by the library counters relabels the result and warns
  let keys = [];
  const lib = { ...stubLib(), homogStats: () => ({ table_exact: 0, rom_fallback: keys.length, rom_fallback_keys: [...keys] }) };
  const r = { study: 's', T_C: 25, type: 'thermo_elastic', homogenization: 'rve', warnings: [], surface_map: {}, timing: { iterations: 0, solver: { solver: 'direct' } }, derived: { warpage: [], von_mises_per_part: {} } };
  const mech = { runMechCase: () => { keys = ['homog:c4:copper+underfill_cuf:0.2']; return { results: [{ ...r }], notes: [] }; } };
  const a = runCaseAll(bCase([{ id: 's', type: 'thermo_elastic', temperature: { uniform_C: [25] } }]), bDeps(10, lib, { mech }));
  assert.equal(a.mech[0].homogenization, 'rve (with rom fallback for 1 keys)');
  assert.deepEqual(a.mech[0].homogenization_record.rom_fallbacks, ['homog:c4:copper+underfill_cuf:0.2']);
  assert.ok(a.mech[0].warnings.some((w) => /rule of mixtures was used/.test(w)));
});

test('k_W_mK {expr} case overrides go through L2 applyOverrides (no adapter stripping): same answer as the k-only path, constituents included', () => {
  const c = {
    schema: 'ap-sim/0', id: 'l10/expr', family: 'plate', geometry: { symmetry: 'quarter' }, materials: { map: {}, overrides: { abf_gl: { k_W_mK: { expr: '0.3 + 0.001 * T_C', status: 'user', note: 'L10 test expression' } } } },
    mesh: { max_xy_mm: 2.5, min_cells_per_layer: 1, max_nodes: 20000 },
    physics: { thermal: { sources: [{ parts: 'die', power_W: 10, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:core', type: 'temperature', T_C: 25 }, { selection: 'default', type: 'adiabatic' }] } },
    studies: [{ id: 's1', type: 'thermal_stationary' }], targets: [],
  };
  const ad = libraryAdapter(LIB, {}, { overrides: c.materials.overrides, applyOverrides });
  assert.ok(!ad.notes.some((n) => /applied by the L1 adapter/.test(n)));
  const k = ad.resolve('abf_gl', 373.15, { need: ['k'] }).k_W_mK;
  assert.ok(Math.abs((Array.isArray(k) ? k[0] : k) - 0.4) < 1e-9, JSON.stringify(k));
  const a = runCase(c, { generate: generate(plate), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true }).results[0].derived.Tmax_C.value;
  const b = runCase(c, { generate: generate(plate), resolve: (key, T, o) => LIB.resolve(key, T, o) }).results[0].derived.Tmax_C.value;
  assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);
});

// ---- wave 5 (lane L12 reports) --------------------------------------------------------------------------------

test('process_sequence step targets read steps[].warpage; missing step or inactive surface -> unchecked with a reason; summary step lines', () => {
  const w = (v) => ({ surface: 'top:die', warpage_um: v, coplanarity_um: Math.abs(v), definition: 'jeita_ed7306', sign_convention: 'JEITA', view_side: 'top' });
  const seq = { study: 'p', type: 'process_sequence', warnings: [], steps: [
    { step: 'cure', T_start_C: 170, T_end_C: 130, activated: ['core', 'die'], warpage: [w(5)] },
    { step: 'attach', T_start_C: 130, T_end_C: 130, activated: ['ring'], warpage: [] },
  ] };
  const mech = { runMechCase: () => ({ results: [JSON.parse(JSON.stringify(seq))], targets: [], notes: [] }) };
  const c = mechCase([{ id: 'p', type: 'process_sequence', steps: [{ id: 'cure', T_C: 130 }] }], { targets: [
    { metric_id: 'p-m1', quantity: 'warpage_um', selection: 'top:die', study: 'p', step: 'cure', value: 5.2, tolerance: { rel: 0.1 } },
    { metric_id: 'p-m2', quantity: 'warpage_um', selection: 'top:die', study: 'p', step: 'attach', value: 1, tolerance: { rel: 0.1 } },
    { metric_id: 'p-m3', quantity: 'warpage_um', selection: 'top:die', study: 'p', step: 'cool_25', value: 1, tolerance: { rel: 0.1 } },
    { metric_id: 'p-m4', quantity: 'warpage_um', selection: 'top:die', study: 'p', value: 1, tolerance: { rel: 0.1 } },
  ] });
  const o = runCaseAll(c, { ...mechDeps(), mech });
  const [a, b, d, e] = o.targets;
  assert.deepEqual([a.status, a.got, a.step], ['pass', 5, 'cure']);
  assert.equal(b.status, 'unchecked');
  assert.match(b.reason, /surface top:die not evaluated at step attach/);
  assert.match(d.reason, /step cool_25 not in the sequence of study p \(steps: cure, attach\)/);
  assert.match(e.reason, /needs a step/);
  const txt = summarizeAll(o);
  assert.match(txt, /step cure at 130 C \(activated core, die\): warpage 5\.00 um/);
  assert.match(txt, /step attach at 130 C \(activated ring\)\n/);
});

test('unused-override warning covers the thermal grids (thermal-only runCaseAll) and mixed runs', () => {
  const c = {
    schema: 'ap-sim/0', id: 'l10/unused', family: 'plate', geometry: { symmetry: 'quarter' },
    materials: { map: {}, overrides: { abf_gl: { k_W_mK: { value: 0.4, status: 'user', note: 'test' } }, emc: { k_W_mK: { value: 1, status: 'user', note: 'test' } } } },
    mesh: { max_xy_mm: 2.5, min_cells_per_layer: 1, max_nodes: 20000 },
    physics: { thermal: { sources: [{ parts: 'die', power_W: 1, distribution: 'uniform_volume' }], bcs: [{ selection: 'bottom:core', type: 'temperature', T_C: 25 }, { selection: 'default', type: 'adiabatic' }] } },
    studies: [{ id: 's1', type: 'thermal_stationary' }], targets: [],
  };
  const ad = libraryAdapter(LIB, {}, { overrides: c.materials.overrides, applyOverrides });
  const o = runCaseAll(c, { ...mechDeps(), resolve: ad.resolve, materialOf: ad.materialOf, overridesApplied: true });
  const uw = o.gridWarnings.filter((w) => /used by no part/.test(w));
  assert.deepEqual(uw, ['materials.overrides used by no part: emc'], o.gridWarnings.join('; '));
});
