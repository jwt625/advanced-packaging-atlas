// Lane L3 (audit A1 S4): CD1 sensitivity runner.
// License: GPL-3.0-or-later.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import YAML from 'yaml';
import { boundsOf, keysOf, runSensitivity, templateRows } from '../src/runner/sensitivity.mjs';
import { sensitivityNode } from '../src/runner/node.mjs';

const fakeLib = {
  canonicalKey: (k) => ({ copper: 'cu_electroplated', underfill: 'underfill_cuf' }[k] ?? k),
  listTemplateValues: () => [
    { key: 'emc', where: 'properties.k', value: 0.95, sensitivity: { property: 'k', delta: { factor: [0.5, 2] } } },
    { key: 'emc', where: 'properties.elastic.nu', value: 0.3, sensitivity: { property: 'nu', delta: { abs: 0.05 } } },
    { key: 'underfill_cuf', where: 'properties.k', value: 0.95, sensitivity: { property: 'k', delta: { factor: [0.5, 2] } } },
    { key: 'abf_gl', where: 'properties.k', value: 0.2, sensitivity: { property: 'k', delta: { factor: [0.5, 2] } } },
  ],
};

test('keysOf parses homogenized keys into canonical constituents', () => {
  assert.deepEqual(keysOf(fakeLib, 'homog:microbump:copper+underfill:0.2:z'), ['cu_electroplated', 'underfill_cuf']);
  assert.deepEqual(keysOf(fakeLib, 'emc'), ['emc']);
  assert.deepEqual(keysOf(fakeLib, 'homog:bga:solder+void:0.2'), ['solder']);
});

test('templateRows: used keys, physics filter, case overrides skipped; bounds', () => {
  const used = new Set(['emc', 'underfill_cuf']);
  const c = { materials: { overrides: { underfill: { k_W_mK: { value: 2, status: 'reported', ref: 'x' } } } } };
  const rows = templateRows(fakeLib, used, c, 'thermal');
  assert.deepEqual(rows.map((r) => `${r.key}.${r.sensitivity.property}`), ['emc.k']);
  assert.deepEqual(boundsOf(rows[0]).values.map((b) => b.value), [0.475, 1.9]);
  assert.deepEqual(boundsOf(fakeLib.listTemplateValues()[1]).values.map((b) => b.label), ['-0.05', '+0.05']);
});

test('runSensitivity with injected deps: spread from the bound runs', () => {
  const kOf = (c) => c.materials?.overrides?.emc?.k_W_mK?.value ?? 0.95;
  const depsFor = (c) => ({ resolve: () => ({}), k: kOf(c) });
  const runCase = (c, deps) => {
    deps.resolve('emc', 300);
    return { results: [{ study: 's1', derived: { Tmax_C: { value: 40 + 1 / deps.k } } }], targets: [] };
  };
  const rep = runSensitivity({ id: 'fake', materials: {} }, { depsFor: (c) => ({ ...depsFor(c), k: kOf(c) }), lib: fakeLib, runCase, study: 's1' });
  assert.equal(rep.rows.length, 1);
  assert.equal(rep.runs, 3);
  const s = rep.spread['Tmax_C [s1]'];
  assert.ok(Math.abs(s.max - (40 + 1 / 0.475)) < 1e-12 && Math.abs(s.min - (40 + 1 / 1.9)) < 1e-12);
  assert.equal(s.rel_min, null, 'temperatures report absolute deltas');
});

test('runSensitivity end to end on a small case (core k template drives Tmax)', () => {
  const c = YAML.parse(readFileSync(new URL('../../sims/fcbga_organic/substrate_warpage_bare.yaml', import.meta.url), 'utf8'));
  const rep = sensitivityNode(c, { study: 's1' });
  assert.ok(rep.rows.some((r) => r.key === 'core_lowcte'), 'core_lowcte k (template analog) used');
  const s = rep.spread['Tmax_C [s1]'];
  assert.ok(s.max - s.min > 0.1, `template k changes Tmax (spread ${s.max - s.min} K)`);
});

// audit A2 S2 / M8 / S1
test('boundsOf: asymmetric {minus, plus}, nu clipped below 0.5 with a warning', () => {
  const sil = { key: 'silicone_adhesive', where: 'properties.elastic.nu', value: 0.3, sensitivity: { property: 'nu', delta: { minus: 0.05, plus: 0.19 } } };
  const b = boundsOf(sil);
  assert.equal(b.unsupported, undefined);
  assert.deepEqual(b.values.map((x) => +x.value.toFixed(6)), [0.25, 0.49]);
  assert.equal(b.warnings.length, 0);
  const hi = boundsOf({ ...sil, value: 0.45 });
  assert.equal(hi.values[1].value, 0.499);
  assert.match(hi.warnings[0], /clipped to 0\.499/);
  const cte = boundsOf({ key: 'tim_polymer', where: 'properties.cte', value: 100, sensitivity: { property: 'cte', delta: { factor: [1 / 3, 3] } } });
  assert.deepEqual(cte.values.map((x) => x.label), ['x0.3333', 'x3']);
});

test('runSensitivity: one failing bound is reported, not fatal; CTE bounds carry boundStatus', () => {
  const lib = {
    canonicalKey: (k) => k,
    listTemplateValues: () => [
      { key: 'emc', where: 'properties.elastic.nu', value: 0.3, sensitivity: { property: 'nu', delta: { abs: 0.05 } } },
      { key: 'emc', where: 'properties.cte', value: 10, sensitivity: { property: 'cte', delta: { factor: [1 / 3, 3] } } },
    ],
  };
  const seen = [];
  const runCase = (c, deps) => {
    deps.resolve('emc', 300);
    const o = c.materials?.overrides?.emc ?? {};
    if (o.nu?.value > 0.34) throw new Error('synthetic solver failure');
    if (o.cte_ppmK) seen.push(o.cte_ppmK.status);
    if (o.nu) seen.push(`nu:${o.nu.status}`);
    const w = 100 * (o.cte_ppmK?.value ?? 10) / 10;
    return { results: [], targets: [{ metric_id: 'x-m1', quantity: 'warpage_um', study: 's2', T_C: 25, got: w }] };
  };
  const rep = runSensitivity({ id: 'fake', materials: {} }, { depsFor: () => ({ resolve: () => ({}) }), lib, runCase, study: 's2', physics: 'thermo_elastic', boundStatus: 'sensitivity' });
  assert.equal(rep.runs, 5);
  assert.ok(rep.unsupported.some((u) => /\+0\.05 failed: synthetic/.test(u.reason)));
  assert.deepEqual(seen, ['nu:sensitivity', 'sensitivity', 'sensitivity'], 'all bounds carry status sensitivity (L2 wave 8); the failing nu bound throws before recording');
  const s = rep.spread['x-m1 warpage_um [s2] @ 25 C'];
  assert.ok(Math.abs(s.min - 100 / 3) < 1e-9 && s.max === 300);
  assert.throws(() => runSensitivity({ id: 'f' }, { depsFor: () => ({ resolve: () => ({}) }), lib, runCase, physics: 'nope' }), /physics nope/);
});

test('physicsOf and the mechanics route (runMechCase) on a coarse real case', async () => {
  const { physicsOf } = await import('../src/runner/node.mjs');
  const c = YAML.parse(readFileSync(new URL('../../sims/fcbga_organic/substrate_warpage.yaml', import.meta.url), 'utf8'));
  assert.equal(physicsOf(c, 's1'), 'thermal');
  assert.equal(physicsOf(c, 's2'), 'thermo_elastic');
  // coarse mesh and a single temperature keep the test short; the runner is what is tested, not the result
  c.mesh = { ...(c.mesh ?? {}), max_xy_mm: 4, max_z_mm: 1, min_cells_per_layer: 1, max_nodes: 2e5 };
  const s2 = c.studies.find((s) => s.id === 's2');
  s2.temperature = { ...s2.temperature, uniform_C: [s2.temperature.uniform_C[0]] };
  // rom: under the CD7 RVE default (precomputed table) constituent overrides do not reach homogenized keys (reported
  // 2026-10-20), so the bound would not move the result; the runner itself is what is tested here
  const rep = sensitivityNode(c, { study: 's2', homogenization: 'rom' });
  assert.equal(rep.physics, 'thermo_elastic');
  assert.ok(rep.rows.length > 0 && rep.rows.every((r) => ['nu', 'cte'].includes(r.property)), 'nu / CTE rows only');
  const names = Object.keys(rep.spread).filter((n) => /warpage_um/.test(n));
  assert.ok(names.length > 0, 'warpage spread present');
  assert.ok(names.some((n) => rep.spread[n].max > rep.spread[n].min), 'bounds change warpage');
});

test('variants: applyVariant (params, overrides, mesh null removal, stress-free) and perTemperature split', async () => {
  const { applyVariant, perTemperature, runVariants } = await import('../src/runner/variants.mjs');
  const c = { id: 'x', params: { a: 1 }, mesh: { max_z_mm: 0.2, max_xy_mm: 1 }, materials: { overrides: { emc: { E_GPa: { value: 1, status: 'user', note: 'n' } } } },
    physics: { mechanics: { stress_free_C: { default: 150, per_part: { ring: 130 } } } },
    studies: [{ id: 's2', type: 'thermo_elastic', temperature: { uniform_C: [25, 240] } }], targets: [] };
  const v = applyVariant(c, { id: 'v', label: 'l', params: { b: 2 }, overrides: { emc: { nu: { value: 0.3, status: 'template', note: 'n' } } }, mesh: { max_z_mm: null }, stress_free_C: 90 });
  assert.deepEqual(v.params, { a: 1, b: 2 });
  assert.deepEqual(Object.keys(v.materials.overrides.emc).sort(), ['E_GPa', 'nu']);
  assert.deepEqual(v.mesh, { max_xy_mm: 1 });
  assert.equal(v.physics.mechanics.stress_free_C.default.value, 90);
  assert.deepEqual(v.physics.mechanics.stress_free_C.per_part, { ring: 130 });
  assert.equal(c.mesh.max_z_mm, 0.2, 'input not mutated');
  assert.deepEqual(perTemperature(c).map((j) => [j.study, j.T_C, j.case.studies[0].temperature.uniform_C]), [['s2', 25, [25]], ['s2', 240, [240]]]);
  const rows = runVariants(c, [{ id: 'v', label: 'l', stress_free_C: 90 }], { runOne: (cv) => {
    if (cv.physics.mechanics.stress_free_C.default?.value === 90 && cv.studies[0].temperature.uniform_C[0] === 240) throw new Error('boom');
    return { results: [{ stats: { dof: 3 }, derived: { warpage: [] } }], targets: [] };
  } });
  assert.equal(rows.length, 4);
  assert.equal(rows.filter((r) => r.error).length, 1);
});

test('variants: a process_sequence study is one job; physicsOf counts it as mechanics', async () => {
  const { perTemperature } = await import('../src/runner/variants.mjs');
  const { physicsOf } = await import('../src/runner/node.mjs');
  const c = { studies: [{ id: 's1', type: 'thermal_stationary' }, { id: 'seq', type: 'process_sequence', steps: [{ id: 'a', temperature: { uniform_C: 25 } }] },
    { id: 's2', type: 'thermo_elastic', temperature: { uniform_C: [25, 100] } }] };
  assert.deepEqual(perTemperature(c).map((j) => [j.study, j.T_C]), [['seq', null], ['s2', 25], ['s2', 100]]);
  assert.equal(physicsOf(c, 'seq'), 'thermo_elastic');
  assert.equal(physicsOf(c), 'coupled');
});
