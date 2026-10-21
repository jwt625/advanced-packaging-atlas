// License: GPL-3.0-or-later.
// Lane L3 (D2) tests: family generators. Input data: app/static/data/package3d.json (read-only).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evalExpr, rValues } from '../src/families/expr.mjs';
import { check, generate, GeneratorError, listFamilies, PRESETS } from '../src/families/index.mjs';
import { loadPackage3d } from '../src/families/node.mjs';

const data = loadPackage3d();
const fam = (id) => data.families.find((f) => f.id === id);
const gen = (id, ov = {}) => generate(id, ov, { data });
const STATUSES = new Set(['reported', 'derived', 'public', 'template', 'user']);
const BOX = ['x_mm', 'y_mm', 'z_um', 'w_mm', 'd_mm', 'h_um'];

test('expr: python precedence and r-value alignment', () => {
  assert.equal(evalExpr('-2 ** 2', () => 0), -4);
  assert.equal(evalExpr('2 ** 3 ** 2', () => 0), 512);
  assert.equal(evalExpr('max(a, b) / 2', (k) => ({ a: 3, b: 5 })[k]), 2.5);
  assert.deepEqual(rValues('rv_d_um * r0 / r1', '8 * 11 / 8'), { r0: 11, r1: 8 });
  assert.deepEqual(rValues('(r0 + r1 + r2 + r3) / 4', '(16 + 18.5 + 11 + 14) / 4'), { r0: 16, r1: 18.5, r2: 11, r3: 14 });
});

for (const id of listFamilies()) {
  test(`${id}: defaults reproduce package3d.json part, layer and array boxes`, () => {
    const g = gen(id);
    const j = fam(id);
    const jp = new Map(j.parts.map((p) => [p.id, p]));
    assert.equal(g.parts.length, j.parts.length, 'part count');
    for (const p of g.parts) {
      const q = jp.get(p.id);
      assert.ok(q, `part ${p.id} exists in package3d.json`);
      for (const k of BOX) assert.ok(Math.abs(p[k] - q[k]) <= 1e-9, `${p.id}.${k}: ${p[k]} vs ${q[k]}`);
      assert.equal(p.kind, q.kind);
      assert.equal(p.material, q.material);
    }
    const jl = new Map(j.layers.map((l) => [`${l.id}|${l.part}`, l]));
    assert.equal(g.layers.length, j.layers.length, 'layer count');
    for (const l of g.layers) {
      const q = jl.get(`${l.id}|${l.part}`);
      assert.ok(q, `layer ${l.id}`);
      assert.ok(Math.abs(l.z_um - q.z_um) <= 1e-9 && Math.abs(l.h_um - q.h_um) <= 1e-9, `layer ${l.id} z/h`);
      if (q.route) assert.ok(Math.abs(l.route.fill - q.route.fill) <= 5e-5, `layer ${l.id} fill`);
    }
    const ja = new Map(j.arrays.map((a) => [a.id, a]));
    const ga = g.arrays.filter((a) => !a.sim_only);
    assert.equal(ga.length, j.arrays.length, 'array count');
    for (const a of ga) {
      const q = ja.get(a.id);
      assert.ok(q, `array ${a.id}`);
      for (const k of ['z_um', 'h_um', 'pitch_um']) assert.ok(Math.abs(a[k] - q[k]) <= 1e-9, `${a.id}.${k}`);
      for (const k of ['x_mm', 'y_mm', 'w_mm', 'd_mm']) assert.ok(Math.abs(a.region[k] - q.region[k]) <= 1e-9, `${a.id}.region.${k}`);
    }
    assert.equal(g.warnings.filter((w) => w.code === 'default_mismatch').length, 0, 'every default formula re-evaluates to its package3d.json value');
  });

  test(`${id}: every part has provenance for every box dim; params carry a status`, () => {
    const g = gen(id);
    for (const p of g.parts) {
      for (const k of BOX) {
        const d = p.dims[k];
        assert.ok(d, `${p.id}.dims.${k}`);
        assert.ok(STATUSES.has(d.status), `${p.id}.dims.${k}.status = ${d.status}`);
        if (d.status === 'template') assert.ok(d.note || d.formula || d.refs || d.ref || d.inputs, `${p.id}.${k}: template needs a rationale`);
        if (d.status === 'reported') assert.ok(d.ref || d.refs || d.inputs, `${p.id}.${k}: reported needs a ref`);
      }
    }
    for (const [k, e] of Object.entries(g.params)) assert.ok(STATUSES.has(e.status), `param ${k} status ${e.status}`);
    for (const b of g.boxes) {
      assert.ok(Number.isInteger(b.priority), `box ${b.id} priority`);
      if (b.source === 'array') assert.match(b.material, /^homog:[a-z0-9_]+:[a-z0-9_]+\+[a-z0-9_]+:\d+(\.\d+)?$/);
    }
  });

  test(`${id}: deterministic and symmetric by default`, () => {
    const a = JSON.stringify(gen(id));
    const b = JSON.stringify(gen(id));
    assert.equal(a, b);
    const expect = { fan_out_panel: ['none'] }[id] || ['none', 'half_x', 'half_y', 'quarter'];
    assert.deepEqual(gen(id).symmetry.allowed, expect, 'fan_out_panel: chip positions of the TV are not mirror-symmetric');
  });
}

test('cowos_l: HBM count 4 / 8 / 12 changes HBM and LSI part counts', () => {
  const count = (g, kind) => g.parts.filter((p) => p.kind === kind).length;
  for (const [n, ov] of [[4, {}], [8, {}], [12, { ip_size_rule: 'fit_dies', reticle_x: 3.3 }]]) {
    const g = gen('cowos_l', { hbm_n: n, ...ov });
    assert.equal(count(g, 'hbm'), n);
    assert.equal(g.parts.filter((p) => p.template_id === 'lsi').length, n, 'one LSI per HBM-SoC edge');
    assert.equal(g.arrays.filter((a) => a.template_id === 'ubump_hbm').length, n);
  }
  const g4 = gen('cowos_s', { hbm_n: 4 });
  assert.equal(g4.parts.filter((p) => p.kind === 'hbm').length, 4);
  const e8 = gen('emib_t', { hbm_n: 8 });
  assert.equal(e8.parts.filter((p) => p.kind === 'hbm').length, 8);
  assert.equal(e8.parts.filter((p) => p.template_id === 'hbm_bridge').length, 8);
});

test('status propagation: user overrides make dependents user; object overrides keep their status', () => {
  const g = gen('cowos_l', { hbm_n: 4 });
  assert.equal(g.params.hbm_n.status, 'user');
  assert.equal(g.params.hbm_rows_n.status, 'user');
  assert.equal(g.parts.find((p) => p.id === 'hbm_1').dims.y_mm.status, 'user');
  const r = gen('cowos_l', { sbt_w_mm: { value: 91, status: 'reported', ref: 'ectc51909.2023.00091-a-c6.x_mm' } });
  assert.equal(r.params.sbt_w_mm.status, 'reported');
  assert.equal(r.parts.find((p) => p.id === 'substrate').w_mm, 91);
  assert.ok(r.provenance.cells.includes('ectc51909.2023.00091-a-c6.x_mm'));
});

test('derived rules: R5 bridge fit, reticle area, HBM generation table', () => {
  const g = gen('cowos_l');
  assert.equal(g.params.lsi_target_n.value, 11);
  assert.equal(g.params.lsi_target_n.status, 'derived');
  assert.ok(g.warnings.some((w) => w.code === 'bridge_count' && w.level === 'info'));
  assert.ok(g.warnings.some((w) => w.code === 'reticle_area' && w.level === 'warn'));
  assert.equal(gen('cowos_l', { bridge_rule: 'edge' }).params.lsi_target_n.value, 10);
  const h4 = gen('cowos_l', { hbm_gen: 'HBM4' });
  assert.equal(h4.params.hbm_h_um.value, 720);
  assert.equal(h4.params.hbm_h_um.alternatives[0].value, 775);
  assert.equal(h4.parts.find((p) => p.id === 'hbm_1').w_mm, 11);
  assert.equal(h4.parts.find((p) => p.id === 'hbm_1').d_mm, 11);
  // dies sit on their bumps: shorter SoC keeps the joint height
  const soc = h4.parts.find((p) => p.id === 'soc_1');
  const hbm = h4.parts.find((p) => p.id === 'hbm_1');
  assert.equal(soc.z_um, hbm.z_um);
});

test('homogenized keys and fractions', () => {
  const s = gen('cowos_s');
  const tsv = s.arrays.find((a) => a.template_id === 'tsv');
  const f = (Math.PI * tsv.diameter_um ** 2) / (4 * tsv.pitch_um ** 2);
  assert.ok(Math.abs(tsv.homog.fraction - f) < 1e-4);
  assert.equal(tsv.homog.key, `homog:tsv:copper+silicon:${Number(f.toFixed(4))}`);
  const l = gen('cowos_l');
  const ub = l.arrays.find((a) => a.id === 'ubump_soc_soc_1');
  assert.equal(ub.homog.constituents[1], 'underfill');
  assert.ok(Math.abs(ub.homog.fraction - Math.PI * 18 * 18 / (4 * 35 * 35)) < 1e-4);
  assert.equal(ub.homog.fraction_dim.status, 'template');
  const bga = l.arrays.find((a) => a.id === 'bga');
  assert.equal(bga.homog.constituents[1], 'void');
});

test('symmetry detection reports a broken mirror', () => {
  const g = gen('cowos_s', { hbm_a_y_mm: 15 });
  assert.equal(g.symmetry.mirror_y, false);
  assert.equal(g.symmetry.mirror_x, true);
  assert.deepEqual(g.symmetry.allowed, ['none', 'half_x']);
});

test('constraint negatives throw GeneratorError with codes', () => {
  const cases = [
    ['cowos_l', { foo: 1 }, 'unknown_param'],
    ['cowos_l', { lid_type: 'cap' }, 'bad_option'],
    ['cowos_l', { hbm_n: 7 }, 'not_multiple'],
    ['cowos_l', { hbm_n: 12 }, 'hbm_column_fit'],
    ['cowos_l', { ubump_soc_region_w_mm: 30 }, 'array_outside_footprint'],
    ['cowos_l', { ri_w_mm: 30 }, 'bridge_overlap'],
    ['cowos_l', { hbm_n: 12, ip_size_rule: 'fit_dies' }, 'reticle_area'],
    ['cowos_l', { ubump_d_um: 40 }, 'diameter_ge_pitch'],
    ['cowos_s', { ip_n: 3 }, 'bad_count'],
    ['cowos_s', { ring_w_mm: 25 }, 'stiffener_overlap'],
    ['cowos_s', { ip_size_rule: 'given', ip_w_mm: 30 }, 'die_outside_interposer'],
    ['emib_t', { die_n: 3 }, 'die_outside_substrate'],
    ['emib_t', { hbm_n: 3 }, 'not_multiple'],
    ['emib_t', { bridge_w_mm: 0.05 }, 'bridge_not_under_dies'],
    ['fcbga_organic', { bu_inner_n: 2 }, 'not_multiple'],
    ['cowos_r', { hbm_n: 7 }, 'not_multiple'],
    ['cowos_r', { hbm_line_mm: 0.5 }, 'hbm_not_on_logic_edge'],
  ];
  for (const [f, ov, code] of cases) {
    let err = null;
    try { gen(f, ov); } catch (e) { err = e; }
    assert.ok(err instanceof GeneratorError, `${f} ${JSON.stringify(ov)} should throw`);
    assert.ok(err.issues.some((i) => i.code === code), `${f} ${JSON.stringify(ov)}: expected ${code}, got ${err.issues.map((i) => i.code).join(',')} (${err.message})`);
    assert.ok(check(f, ov, { data }).some((i) => i.code === code && i.level === 'error'), 'check() reports without throwing');
  }
});

test('presets: only primary facts as public; generate', () => {
  for (const [name, p] of Object.entries(PRESETS)) {
    const g = gen(p.family, { preset: name });
    for (const [k, e] of Object.entries(p.params)) {
      if (e.status === 'public') { assert.equal(g.params[k].status, 'public'); assert.match(e.source, /^https:\/\/www\.amd\.com\//); }
    }
  }
  assert.equal(gen('cowos_l', { preset: 'mi455x_class' }).parts.filter((p) => p.kind === 'hbm').length, 12);
  assert.ok(!('b300_class' in PRESETS));
});

test('data injection: browser path without the Node helper', () => {
  const copy = JSON.parse(JSON.stringify(data));
  const g = generate('emib_t', {}, { data: copy });
  assert.equal(g.parts.length, fam('emib_t').parts.length);
  assert.throws(() => generate('emib_t', {}, { data: { families: [] } }), GeneratorError);
});

test('wave 2: cowos_l 6x SC-RDL TV knobs (dummy Si, substrate-sized SC-RDL and side mold)', () => {
  const ov = { sc_rdl: 'substrate', dummy_n: 8, soc_n: 2, soc_cols_n: 2, hbm_n: 4, ip_size_rule: 'fit_dies', reticle_x: 1.6, sbt_w_mm: 91, sbt_d_mm: 91 };
  const g = gen('cowos_l', ov);
  assert.equal(g.parts.filter((p) => p.template_id === 'dummy').length, 8);
  for (const id of ['mold', 'ri_core', 'ri_back', 'ri_front']) assert.equal(g.parts.find((p) => p.id === id).w_mm, 91);
  assert.ok(!g.parts.some((p) => p.id.startsWith('lid_foot')), 'no lid sidewall over the substrate-sized module');
  const area = g.params.ri_w_mm.value * g.params.ri_d_mm.value;
  assert.ok(area < 1.05 * 1.6 * 830, 'interposer keeps the top-die rectangle + 1 mm definition');
  assert.equal(g.parts.find((p) => p.id === 'lid').material, 'other');
  assert.equal(g.boxes.find((b) => b.id === 'lid').material, 'cu_lid');
  assert.throws(() => gen('cowos_l', { dummy_n: 8 }), (e) => e.issues.some((i) => i.code === 'dummy_needs_sc_rdl'));
  assert.throws(() => gen('cowos_l', { ...ov, dummy_n: 7 }), (e) => e.issues.some((i) => i.code === 'not_multiple'));
});

test('wave 2: template-backed family knobs', () => {
  const info = gen('info_os', { logic_n: 2, io_n: 0, lid_type: 'lid' });
  assert.equal(info.parts.filter((p) => p.kind === 'die').length, 2);
  assert.ok(info.parts.some((p) => p.id === 'tim') && info.parts.some((p) => p.id === 'lid'));
  const glass = gen('glass_core_substrate', { die_layout: 'pair', bridge_n: 0, d2_n: 2 });
  assert.equal(glass.parts.filter((p) => p.kind === 'die').length, 2);
  assert.equal(glass.parts.filter((p) => p.kind === 'bridge').length, 0);
  const fop = gen('fan_out_panel', { units_nx: 3, units_ny: 2 });
  assert.equal(fop.parts.filter((p) => p.kind === 'die').length, 18);
  assert.equal(fop.parts.find((p) => p.id === 'rdl').w_mm, 3 * fam('fan_out_panel').params.pkg_w_mm.value);
  const h = gen('hbm_stack', { core_n: 3 });
  assert.equal(h.parts.filter((p) => p.template_id === 'core').length, 3);
  assert.ok(h.parts.find((p) => p.id === 'core_3').z_index === 3);
  assert.throws(() => gen('hbm_stack', { core_n: 11 }), (e) => e.issues.some((i) => i.code === 'stack_height'));
  assert.throws(() => gen('ucla_si_if', { dl_n: 5 }), (e) => e.issues.some((i) => i.code === 'not_square'));
  assert.equal(gen('ucla_si_if', { dl_n: 9 }).parts.filter((p) => p.kind === 'die').length, 9);
  const s = gen('soic');
  assert.equal(s.boxes.find((b) => b.id === 'bond_bot').material, 'sio2_film');
});

test('audit A1 S3: routed levels carry the line direction in the homog key', () => {
  const g = gen('cowos_l');
  const bx = (id) => g.boxes.find((b) => b.id === id || b.id.startsWith(`${id}@`));
  assert.match(bx('sbt_cu_t_1').material, /^homog:rdl_layer:copper\+organic_build_up:[\d.]+:x$/);
  assert.match(bx('sbt_cu_t_2').material, /:y$/, 'alt routing alternates x / y');
  assert.match(bx('sbt_ccu_t').material, /:plane$/, 'planes stay a sheet');
  assert.match(bx('lsi_m_1').material, /:x$/);
  assert.match(bx('lsi_ss_m_1').material, /:y$/, 'rotated SoC-SoC LSI routes along y');
});

test('audit A1 M4: rule false negatives and duplicate issues', () => {
  assert.ok(check('cowos_l', { ubump_d_um: 34 }, { data }).some((i) => i.code === 'bump_dp_high'));
  assert.ok(check('cowos_l', { die_gap_um: 2000, ip_size_rule: 'fit_dies', reticle_x: 4 }, { data }).some((i) => i.code === 'hbm_not_on_logic_edge'));
  const st = check('cowos_s', { ring_w_mm: 25 }, { data }).filter((i) => i.code === 'stiffener_overlap');
  assert.ok(st.length <= 4, `stiffener overlaps merged per frame side (got ${st.length})`);
});

test('transcribed specs are current with config/package3d (drift alarm: re-run tools/transcribe.mjs)', async () => {
  const { transcribe } = await import('../src/families/tools/transcribe.mjs');
  const { statSync } = await import('node:fs');
  const root = new URL('../../', import.meta.url);
  const jsonT = statSync(new URL('app/static/data/package3d.json', root)).mtimeMs;
  for (const id of listFamilies()) {
    // a template edited after the last package3d.json build is in flight in another session: not a drift of ours
    if (statSync(new URL(`config/package3d/${id}.yaml`, root)).mtimeMs > jsonT) continue;
    const spec = (await import(`../src/families/specs/${id}.mjs`)).default;
    const now = transcribe(id);
    for (const k of ['parts', 'layers', 'arrays']) assert.deepEqual(spec[k], now[k], `${id}.${k} differs from its template: re-transcribe and re-check the family edit`);
  }
});
