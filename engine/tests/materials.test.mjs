// Materials library tests (lane L2, DevLog-012): data files parse and validate, SI conversion, CTE re-basing,
// Si cubic elasticity vs Hopcroft 2010, ROM bounds, refusals, aliases, browser purity.
// License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import {
  DATA_DIR,
  readDataDir,
  loadLibrary,
  createLibrary,
  cubicDirectionalE,
  cubicIsotropicAverages,
  cubicStiffnessRotZ,
  engineeringConstants,
  validateFile,
  libraryInputFromDocs,
  applyOverrides,
  unusedOverrideKeys,
} from '../src/materials/node.mjs';

const lib = loadLibrary();
const C0 = 273.15;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} +- ${tol}, got ${a}`);
const rel = (a, b, r, msg) => near(a, b, Math.abs(b) * r, msg);

test('every data file parses as YAML and validates', () => {
  const names = readdirSync(DATA_DIR).filter((n) => n.endsWith('.yaml'));
  assert.ok(names.length >= 10);
  const { sources } = readDataDir();
  for (const n of names) {
    const doc = YAML.parse(readFileSync(join(DATA_DIR, n), 'utf8'));
    assert.ok(doc && typeof doc === 'object', n);
    if (!n.startsWith('_')) assert.deepEqual(validateFile(doc, n, sources), [], n);
  }
  assert.ok(lib.keys().length >= 40, `materials ${lib.keys().length}`);
});

test('browser path: index.mjs + library.mjs build the same library from parsed docs', async () => {
  const idx = await import('../src/materials/index.mjs');
  const docs = readdirSync(DATA_DIR)
    .filter((n) => n.endsWith('.yaml'))
    .map((n) => ({ name: n, doc: YAML.parse(readFileSync(join(DATA_DIR, n), 'utf8')) }));
  const L2 = idx.createLibrary(idx.libraryInputFromDocs(docs));
  assert.deepEqual(L2.keys().sort(), lib.keys().sort());
  assert.ok(libraryInputFromDocs);
});

test('no Node imports in browser modules', () => {
  const dir = new URL('../src/materials/', import.meta.url);
  for (const f of ['index.mjs', 'library.mjs', 'eval.mjs', 'schema.mjs', 'cubic.mjs', 'homogenize.mjs', 'units.mjs', 'overrides.mjs']) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!/from\s+'(node:|fs|path|url)/.test(src) && !/import\(\s*'node:/.test(src), `${f} imports a Node module`);
  }
});

test('every non-N/A leaf has source, locator, basis (citation walk)', () => {
  let leaves = 0;
  const walk = (o, where) => {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return;
    if ('value' in o || 'model' in o) {
      if (o.value !== 'N/A' && o.status !== 'pending_source' && o.status !== 'tier2_pending') leaves++;
    }
    for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object' && !Array.isArray(v)) walk(v, `${where}.${k}`);
  };
  for (const key of lib.keys()) walk(lib.entry(key).properties, key);
  assert.ok(leaves > 150, `leaves ${leaves}`);
});

test('schema rejects missing CTE kind, secant without Tref, Tg without method, unknown source', () => {
  const base = (props) => ({ schema: 'ap-sim.materials/1', verified_on: '2026-10-20', materials: { x: { description: 'd', class: 'c', tier: '1', status: 'ok', valid_T_C: [0, 100], properties: props } } });
  const prov = { basis: 'measured', source: 'hpl1972', locator: 'p.1', verified_on: '2026-10-20' };
  const S = readDataDir().sources;
  assert.match(validateFile(base({ cte: { value: 3, unit: 'ppm/K', ...prov } }), 't', S).join(), /kind is mandatory/);
  assert.match(validateFile(base({ cte: { kind: 'secant', value: 3, unit: 'ppm/K', ...prov } }), 't', S).join(), /Tref/);
  assert.match(validateFile(base({ tg: { value: 150, unit: 'C', ...prov } }), 't', S).join(), /Tg method/);
  assert.match(validateFile(base({ k: { value: 1, unit: 'W/mK', ...prov, source: 'nope' } }), 't', S).join(), /not in _sources/);
  assert.match(validateFile(base({ k: { value: 1, unit: 'GPa', ...prov } }), 't', S).join(), /unit/);
  assert.match(validateFile(base({ k: { value: 'N/A' } }), 't', S).join(), /missing/);
});

test('SI conversion', () => {
  const cu = lib.resolve('cu_bulk', 298.2);
  near(cu.k_W_mK[0], 401, 1e-9, 'Cu k (4.01 W/cmK)');
  rel(cu.sigma_S_m, 1 / 1.725e-8, 0.02, 'Cu sigma near 300 K');
  const cu293 = lib.resolve('cu_bulk', 293, { need: ['sigma'] });
  rel(cu293.sigma_S_m, 1 / 1.678e-8, 1e-12, 'Cu sigma at 293 K table node');
  near(cu.elastic.E_Pa, 123.5e9, 1, 'Cu E');
  near(cu.rho_kg_m3, 8960, 1e-9);
  const si = lib.resolve('si_crystal', 298.15);
  near(si.elastic.C11, 165.64e9, 1); // Hall 1967 Table III, 1.6564e12 dyn/cm2 (L21)
  near(si.rho_kg_m3, 2329.0, 1e-9); // Hall 1967 p.757, 2.3290 g/cm3 (L21)
  const ss = lib.resolve('ss304', 293.15, { need: ['sigma'] });
  rel(ss.sigma_S_m, 1 / 72e-8, 1e-12, 'SS304 resistivity 72 uohm cm');
  const ind = lib.resolve('tim_indium', 298.15, { need: ['k'] });
  assert.equal(ind.elastic, null); // elastic N/A and not needed -> null
  assert.equal(ind.provenance.properties.elastic.status, 'N/A');
  const uf = lib.resolve('underfill_cuf', C0 + 25, { need: ['elastic'] });
  near(uf.elastic.E_Pa, 8.9e9, 1);
  near(lib.resolve('underfill_cuf', C0 + 200, { need: ['elastic'] }).elastic.E_Pa, 0.1e9, 1);
  near(lib.resolve('sac305', C0 + 85, { need: ['elastic'] }).elastic.E_Pa, (52.5 + ((33.6 - 52.5) * 135) / 270) * 1e9, 10);
  const abf = lib.resolve('abf_type_a', C0 + 80, { need: ['eps_r', 'tan_delta'], f_Hz: 77e9 });
  near(abf.eps_r, 3.426, 1e-12);
  near(abf.tan_delta, 0.0039, 1e-15);
  near(lib.resolve('glass_bf33', C0 + 25, { need: ['cp'] }).cp_J_kgK, 830, 1e-9);
});

test('Swenson Si: integrated instantaneous alpha reproduces the dL/L20 column', () => {
  const chk = lib.entry('si_crystal').properties.cte.check;
  chk.T_K.forEach((T, i) => {
    const r = lib.resolve('si_crystal', T, { need: ['cte'] });
    const strain = r.cte.alpha[0] * (T - r.cte.Tref_K);
    near(strain * 1e6, chk.dL_L_1e6[i], 1.5, `dL/L at ${T} K`);
  });
});

function synth(cte, extra = {}) {
  return createLibrary({
    files: [
      {
        name: 'synth.yaml',
        doc: {
          schema: 'ap-sim.materials/1',
          verified_on: '2026-10-20',
          materials: { m: { description: 'synthetic', class: 'test', tier: '1', status: 'ok', valid_T_C: [-60, 300], properties: { cte, ...extra } } },
        },
      },
    ],
    sources: { s: { citation: 'synthetic test source' } },
  });
}
const P = { basis: 'derived', source: 's', locator: 'test', verified_on: '2026-10-20' };

test('CTE rebase: identity at own Tref, and analytic linear alpha_t', () => {
  // alpha_t(T) = a + b (T - T0), table nodes far apart (exact under linear interpolation)
  const a = 10e-6;
  const b = 0.05e-6;
  const T0 = 293.15;
  const TK = [200, 600];
  const L = synth({ kind: 'instantaneous', Tref_K: T0, model: 'table_T', T_K: TK, value: TK.map((t) => (a + b * (t - T0)) * 1e6), unit: 'ppm/K', ...P });
  const eps = (T) => a * (T - T0) + (b / 2) * (T - T0) ** 2; // strain relative to T0
  for (const T of [220, 293.15, 350, 500]) {
    const r = L.resolve('m', T, { need: ['cte'] });
    const sec = Math.abs(T - T0) < 1e-3 ? a : eps(T) / (T - T0);
    rel(r.cte.alpha[0], sec, 1e-10, `secant at ${T}`);
    const id = L.rebaseSecantCte('m', T0, T);
    rel(id.alpha[0], r.cte.alpha[0], 1e-12, 'rebase to own Tref is identity');
    for (const Tr of [423.15, 250]) {
      const exact = (eps(T) - eps(Tr)) / ((T - Tr) * (1 + eps(Tr)));
      const got = L.rebaseSecantCte(r, Tr, T).alpha[0];
      rel(got, Math.abs(T - Tr) < 1e-3 ? (a + b * (Tr - T0)) / (1 + eps(Tr)) : exact, 1e-9, `rebase Tr ${Tr} at ${T}`);
    }
  }
  // limit T -> Tr: derivative form
  const lim = L.rebaseSecantCte('m', 400, 400).alpha[0];
  rel(lim, (a + b * (400 - T0)) / (1 + eps(400)), 1e-9, 'T = Tr limit');
  const nearLim = L.rebaseSecantCte('m', 400, 400.01).alpha[0];
  rel(nearLim, lim, 1e-4, 'continuity near Tr');
});

test('CTE: sharp bilinear Tg integrates exactly; secant constant rebases to itself', () => {
  const tg = 150 + C0;
  const L = synth({ kind: 'instantaneous', Tref_K: 298.15, model: 'bilinear_tg', below: 20, above: 80, Tg_C: 150, unit: 'ppm/K', ...P });
  const T = 200 + C0;
  const strain = 20e-6 * (tg - 298.15) + 80e-6 * (T - tg);
  rel(L.resolve('m', T, { need: ['cte'] }).cte.alpha[0], strain / (T - 298.15), 1e-12);
  const Lc = synth({ kind: 'secant', Tref_C: 20, value: 16.6, unit: 'ppm/K', ...P });
  // constant secant -> rebased alpha = a / (1 + a (Tr - Tm)), Tm = 293.15 K
  const got = Lc.rebaseSecantCte('m', 400, 500).alpha[0];
  rel(got, 16.6e-6 / (1 + 16.6e-6 * (400 - 293.15)), 1e-9);
});

test('Si cubic constants vs Hopcroft 2010 (E100 130, E110 169, E111 188; EV 166, ER 159, B 97.8; wafer frame)', () => {
  const r = lib.resolve('si_crystal', 298.15, { need: ['elastic'] });
  const C = r.elastic;
  near(cubicDirectionalE(C, [1, 0, 0]) / 1e9, 130, 0.6, 'E<100>');
  near(cubicDirectionalE(C, [1, 1, 0]) / 1e9, 169, 0.6, 'E<110>');
  near(cubicDirectionalE(C, [1, 1, 1]) / 1e9, 188, 0.6, 'E<111>');
  const avg = cubicIsotropicAverages(C);
  near(avg.voigt.E / 1e9, 166, 0.6, 'EV');
  near(avg.reuss.E / 1e9, 159, 0.6, 'ER');
  near(avg.voigt.B / 1e9, 97.8, 0.1, 'B');
  const w = engineeringConstants(cubicStiffnessRotZ(C, 45));
  near(w.Ex / 1e9, 169, 0.6, 'wafer Ex');
  near(w.Ey / 1e9, 169, 0.6, 'wafer Ey');
  near(w.Ez / 1e9, 130, 0.6, 'wafer Ez');
  near(w.nuxy, 0.064, 0.002, 'nu xy');
  near(w.Gxy / 1e9, 50.9, 0.3, 'Gxy');
  near(w.Gxz / 1e9, 79.5, 0.2, 'Gxz');
  const c0 = engineeringConstants(cubicStiffnessRotZ(C, 0));
  near(c0.nuxy, 0.28, 0.005, 'nu <100>');
  const iso = lib.resolve('si_crystal', 298.15, { need: ['elastic'], elastic: 'iso_110' });
  near(iso.elastic.E_Pa / 1e9, 169, 0.6);
  assert.match(iso.provenance.properties.elastic.shortcut, /iso_110/);
  assert.equal(r.elastic.orientation.rotation_z_deg, 45);
});

test('homogenization ROM: Reuss <= directional values <= Voigt; labelled; homog: key', () => {
  const T = C0 + 25;
  for (const [kind, incl, mat, f, axis] of [
    ['microbump', 'snag', 'underfill_cuf', 0.2, 'z'],
    ['c4', 'sac305', 'underfill_cuf', 0.3, 'z'],
    ['tsv', 'cu_electroplated', 'si_crystal', 0.05, 'z'],
    ['rdl_layer', 'cu_electroplated', 'polyimide_rdl', 0.5, 'x'],
    ['rdl_layer', 'cu_electroplated', 'polyimide_rdl', 0.85, 'xy'],
  ]) {
    const need = kind === 'tsv' ? ['k', 'elastic', 'cte'] : ['elastic', 'cte']; // polymer k is N/A in the library
    const h = lib.homogenize({ kind, constituents: { inclusion: incl, matrix: mat }, fraction: f, axis, T_K: T, Tsf_K: C0 + 150, opts: { need } });
    assert.equal(h.homogenization, 'rom');
    const { voigt, reuss } = h.bounds.E;
    assert.ok(reuss <= voigt);
    for (const E of [h.elastic.Ex, h.elastic.Ey, h.elastic.Ez]) assert.ok(E >= reuss * (1 - 1e-12) && E <= voigt * (1 + 1e-12), `${kind} E in bounds`);
    if (h.k_W_mK) for (const k of h.k_W_mK) assert.ok(k >= h.bounds.k.reuss * (1 - 1e-12) && k <= h.bounds.k.voigt * (1 + 1e-12));
    const [a1, a2] = h.bounds.cte.constituents;
    const ax = { x: 0, y: 1, z: 2, xy: 0 }[axis];
    const aAx = h.cte.alpha[ax];
    assert.ok(aAx >= Math.min(a1, a2) - 1e-15 && aAx <= Math.max(a1, a2) + 1e-15, 'axial Turner CTE between constituents');
    assert.equal(h.cte.Tref_K, C0 + 150);
    assert.equal(h.provenance.warnings.includes('homogenized compliance not positive definite'), false, `${kind} PD`);
  }
  const viaKey = lib.resolve('homog:tsv:cu_electroplated+si_crystal:0.05', C0 + 25, { Tsf_K: C0 + 25, homogenization: 'rom' });
  assert.equal(viaKey.topology, 'columns_z');
  assert.ok(viaKey.k_W_mK[2] > viaKey.k_W_mK[0]);
  assert.throws(() => lib.rebaseSecantCte(viaKey, C0 + 100, C0 + 25), /re-homogenize/);
  assert.throws(() => lib.homogenize({ kind: 'tsv', constituents: { inclusion: 'cu_electroplated', matrix: 'si_crystal' }, fraction: 0.1, T_K: C0 + 25 }), /Tsf_K/);
});

test('resolve refusals and extrapolation flag', () => {
  assert.throws(() => lib.resolve('unobtainium', 300), /unknown material key/);
  assert.throws(() => lib.resolve('si_crystal', C0 + 400), /outside valid_T_C/);
  const ext = lib.resolve('si_crystal', C0 + 400, { allowExtrapolation: true, need: ['k'] });
  near(ext.k_W_mK[0], 61.9, 1e-9, 'clamped to 600 K value');
  assert.ok(ext.provenance.warnings.length >= 1);
  assert.throws(() => lib.resolve('tim_indium', C0 + 25), /tim_indium\.elastic is N\/A/);
  assert.throws(() => lib.resolve('ncf', C0 + 25), /ncf\.k is N\/A/);
  assert.throws(() => lib.resolve('ss304', C0 + 200, { need: ['cte'] }), /outside data range/);
  assert.ok(lib.resolve('ss304', C0 + 200, { need: ['cte'], use: { cte: 'cte_mean_20_870' } }).cte);
  assert.throws(() => lib.resolve('sac305', C0 + 25, { use: { elastic: 'e_motalab2012' } }), /nu is N\/A/);
  assert.throws(() => lib.resolve('sac305', C0 + 25, { use: { elastic: 'nope' } }), /unknown alternative/);
  assert.throws(() => lib.resolve('abf_type_a', C0 + 25, { need: ['eps_r'] }), /f_Hz/);
  assert.throws(() => lib.resolve('abf_type_a', C0 + 25, { need: ['eps_r'], f_Hz: 300e9 }), /outside data range/);
  assert.throws(() => lib.resolve('pid_eptc', C0 + 25, { need: ['eps_r'], f_Hz: 77e9 }), /given at 25 GHz/);
  assert.ok(lib.resolve('pid_eptc', C0 + 25, { need: ['eps_r'], f_Hz: 77e9, allowFrequencyExtrapolation: true }).eps_r === 2.9);
  assert.throws(() => lib.resolve('si_crystal', C0 + 25, { need: ['tan_delta'], f_Hz: 10e9 }), /conductivity model/);
  assert.throws(() => lib.resolve('low_k_beol', C0 + 25), /N\/A/);
});

test('aliases: template keys and DB strings', () => {
  for (const tk of ['silicon', 'organic_laminate', 'organic_build_up', 'polymer_dielectric', 'copper', 'solder', 'underfill', 'stainless_steel', 'mold_compound', 'tim', 'glass', 'oxide']) {
    const { key } = lib.aliasTemplateKey(tk);
    assert.ok(lib.keys().includes(key), tk);
  }
  assert.throws(() => lib.aliasTemplateKey('other'), /no default/);
  assert.throws(() => lib.aliasTemplateKey('kryptonite'), /unknown template/);
  assert.equal(lib.aliasDbString('Ajinomoto Build-up Film (ABF)'), 'abf_gl');
});

test('stainless-steel guard: no ss entry carries the eptc67330 polymer-stiffener values', () => {
  const ss = lib.resolve('ss304', C0 + 25);
  assert.ok(ss.elastic.E_Pa > 150e9);
  assert.equal(lib.entry('ss304').properties.tg, undefined);
});

test('template policy: every template value has a sensitivity block; only nu or k; provenance marks them', () => {
  const rows = lib.listTemplateValues();
  assert.ok(rows.length >= 15, `template values ${rows.length}`);
  for (const r of rows) {
    assert.ok(r.sensitivity && r.sensitivity.property && r.sensitivity.delta, `${r.key} ${r.where} sensitivity`);
    const field = r.where.split('.').pop();
    assert.ok(['k', 'nu', 'nuxy', 'nuyz', 'nuxz', 'cte'].includes(field), `${r.key} ${r.where} template field`);
    assert.ok(r.analog_of || r.range_from || r.placeholder, `${r.key} ${r.where} kind`);
    if (field === 'cte') {
      assert.equal(r.sensitivity.property, 'cte');
      assert.ok(r.sensitivity.delta.factor[0] <= 1 / 3 + 1e-9 && r.sensitivity.delta.factor[1] >= 3, `${r.key} cte factor`);
      assert.ok(r.rationale, `${r.key} cte rationale`);
      continue;
    }
    // silicone_adhesive (L27 2026-10-21, A8 S1): default placeholder -0.05 / +0.195 (0.25-0.495, upper = PDMS analog);
    // PDMS analog alternative -0.045 / +0.004; ECCOBOND 3003 alternative placeholder -0.05 / +0.19 (unchanged)
    const silNu = (d) =>
      r.analog_of ? d.plus === 0.004 && d.minus === 0.045 : r.where.startsWith('properties.') ? d.plus === 0.195 && d.minus === 0.05 : d.plus === 0.19 && d.minus === 0.05;
    if (field.startsWith('nu')) assert.ok(r.key === 'silicone_adhesive' ? silNu(r.sensitivity.delta) : r.sensitivity.delta.abs === 0.05, `${r.key} nu delta`);
    else assert.deepEqual(r.sensitivity.delta, { factor: [0.5, 2] });
    if (r.placeholder) assert.equal(r.value, 0.3);
  }
  const emc = lib.resolve('emc', C0 + 25);
  near(emc.elastic.nu, 0.3, 0);
  assert.ok(emc.provenance.template.some((t) => t.property === 'elastic.nu' && t.placeholder));
  const uf = lib.resolve('underfill_cuf', C0 + 25, { need: ['k', 'elastic', 'cte'] });
  near(uf.k_W_mK[0], 0.95, 1e-12);
  assert.ok(uf.provenance.template.some((t) => t.property === 'k' && t.analog_of));
  const si = lib.resolve('si_crystal', C0 + 25);
  assert.deepEqual(si.provenance.template, []);
  // schema refuses template for E, CTE, Tg and a template without sensitivity
  const S = readDataDir().sources;
  const base = (props) => ({ schema: 'ap-sim.materials/1', verified_on: '2026-10-20', materials: { x: { description: 'd', class: 'c', tier: '1', status: 'ok', valid_T_C: [0, 100], properties: props } } });
  const T = { basis: 'template', analog_of: 'y', source: 'hpl1972', locator: 'p.1', verified_on: '2026-10-20', sensitivity: { property: 'k', delta: { factor: [0.5, 2] } } };
  assert.equal(validateFile(base({ k: { value: 1, unit: 'W/mK', ...T } }), 't', S).length, 0);
  assert.match(validateFile(base({ cte: { kind: 'instantaneous', value: 3, unit: 'ppm/K', ...T } }), 't', S).join(), /template CTE needs sensitivity \{property: cte/);
  assert.match(validateFile(base({ elastic: { model: 'iso', E: { value: 1, unit: 'GPa', ...T }, nu: 0.3, unit: 'GPa', basis: 'measured', source: 'hpl1972', locator: 'p', verified_on: '2026-10-20' } }), 't', S).join(), /not allowed for 'E'/);
  const noSens = { ...T };
  delete noSens.sensitivity;
  assert.match(validateFile(base({ k: { value: 1, unit: 'W/mK', ...noSens } }), 't', S).join(), /sensitivity/);
});

test('recorded assumptions reach provenance', () => {
  const abf = lib.resolve('abf_gl', C0 + 25);
  assert.ok(abf.provenance.assumptions.some((a) => a.id === 'z_cte_from_xy'));
  assert.equal(abf.provenance.properties.cte.assumption, 'z_cte_from_xy');
  assert.ok(lib.resolve('cu_bulk', C0 + 25).provenance.assumptions.some((a) => a.id === 'cu_cte_handbook_constant'));
  assert.ok(lib.resolve('ss304', C0 + 25).provenance.assumptions.some((a) => a.id === 'ss304_cte_20_100_default'));
  assert.ok(lib.resolve('emc', C0 + 25).provenance.assumptions.some((a) => a.id === 'single_paper_set'));
});

test('DB string aliasing: rules, vetoes, coverage over data/stack_layers.csv', () => {
  const cases = [
    ['ABF GL-102 (Ajinomoto)', 'dielectric_polymer', 'abf_gl'],
    ['ABF GX92P', 'dielectric_polymer', 'abf_gx92p'],
    ['electroplated Cu (DVF 200 MU-series bath)', 'metal', 'cu_electroplated'],
    ['Ti/Cu', 'metal', null],
    ['Ni/Pd/Au', 'metal', null],
    ['SiO2 (PECVD)', 'dielectric_inorganic', 'sio2_film'],
    ['SiN', 'dielectric_inorganic', 'sin_film'],
    ['SiCN + SiO2', 'dielectric_inorganic', null],
    ['Sn-58Bi', 'solder', 'snbi'],
    ['pre-applied NCP', 'underfill', 'ncp'],
    ['Top CUF', 'underfill', 'underfill_cuf'],
    ['NCF', 'underfill', 'ncf'],
    ['granular EMC', 'mold_compound', 'emc'],
    ['AGC EN-A1 alkali-free alumina-borosilicate glass', 'glass', 'glass_en_a1'],
    ['Borofloat 33 (Schott)', 'glass', 'glass_bf33'],
    ['high-resistivity Si', 'silicon', 'si_hr'],
    ['GFRP: conventional resin with E-glass cloth', 'organic_laminate', 'core_lowcte'],
    ['Sn-based nanosolder (SACA-X)', 'solder', null],
    ['Liquid-metal gel TIM', 'tim', null],
  ];
  for (const [s, cl, want] of cases) assert.equal(lib.aliasDbString(s, cl), want, s);
  const csvPath = new URL('../../data/stack_layers.csv', import.meta.url);
  let text;
  try {
    text = readFileSync(csvPath, 'utf8');
  } catch {
    return; // DB not present (engine used standalone)
  }
  // minimal RFC-4180 parser (quoted fields, doubled quotes)
  const rows = [];
  let row = [];
  let f = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') (f += '"'), i++;
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') row.push(f), (f = '');
    else if (c === '\n') row.push(f), rows.push(row), (row = []), (f = '');
    else if (c !== '\r') f += c;
  }
  const head = rows.shift();
  const im = head.indexOf('material');
  const ic = head.indexOf('material_class');
  const seen = new Map();
  for (const r of rows) if (r[im]?.trim()) seen.set(`${r[im].trim().toLowerCase()}|${r[ic]}`, [r[im], r[ic]]);
  let mapped = 0;
  for (const [s, cl] of seen.values()) if (lib.aliasDbString(s, cl)) mapped++;
  assert.ok(mapped / seen.size >= 0.35, `coverage ${mapped}/${seen.size}`);
});

test('template-key constituents and resolve(templateKey) map through aliases, recorded in provenance', () => {
  const r = lib.resolve('silicon', C0 + 25);
  assert.equal(r.key, 'si_crystal');
  assert.deepEqual(r.provenance.alias.from, 'silicon');
  const h = lib.resolve('homog:microbump:copper+underfill:0.2077', C0 + 25, { Tsf_K: C0 + 150, homogenization: 'rom' });
  assert.equal(h.provenance.constituents.inclusion, 'cu_electroplated');
  assert.equal(h.provenance.aliases.inclusion.from, 'copper');
  assert.equal(h.provenance.aliases.matrix.to, 'underfill_cuf');
  assert.throws(() => lib.resolve('homog:rdl_layer:other+oxide:0.5', C0 + 25, { Tsf_K: C0 + 150 }), /'other' has no default/);
});

test('void matrix: axial path only, regularized elsewhere, inclusion CTE, positive definite', () => {
  const h = lib.resolve('homog:bga:solder+void:0.2827', C0 + 25, { Tsf_K: C0 + 150, homogenization: 'rom' });
  const sac = lib.resolve('sac305', C0 + 25, { need: ['k', 'elastic', 'cte'] });
  near(h.k_W_mK[2], 0.2827 * sac.k_W_mK[0], 1e-9);
  near(h.k_W_mK[0], 0.2827 * sac.k_W_mK[0] * 1e-5, 1e-12);
  near(h.elastic.Ez, 0.2827 * sac.elastic.E_Pa, 1);
  assert.ok(h.elastic.Ex < 1e-4 * h.elastic.Ez);
  rel(h.cte.alpha[0], lib.rebaseSecantCte(sac, C0 + 150, C0 + 25).alpha[0], 1e-12);
  assert.ok(!h.provenance.warnings.includes('homogenized compliance not positive definite'));
  assert.match(h.provenance.void, /no load and no heat/);
  assert.throws(() => lib.resolve('homog:bga:void+solder:0.3', C0 + 25, { Tsf_K: C0 + 150 }), /only allowed as the matrix/);
});

test('applyOverrides: shape, provenance, refusals', () => {
  const L2 = applyOverrides(lib, {
    tim: { cte_ppmK: { value: 100, status: 'user', note: 'test value' } },
    emc: { nu: { value: 0.25, status: 'reported', ref: 'paper p.1' }, k_W_mK: { value: [1, 1, 2], status: 'public', ref: 'TDS' }, cte_ppmK: { value: { alpha1: 8, alpha2: 30, Tg_C: 150 }, status: 'reported', ref: 'paper p.2' } },
    tim_indium: { E_GPa: { value: 10, status: 'user', note: 'test' }, nu: { value: 0.45, status: 'template', note: 'analog test' } },
  });
  const e = L2.resolve('emc', C0 + 25);
  near(e.elastic.nu, 0.25, 0);
  assert.equal(e.provenance.properties.elastic.fields.nu.basis, 'case_override');
  assert.deepEqual(e.k_W_mK, [1, 1, 2]);
  rel(e.cte.alpha[0], 8e-6, 1e-9);
  near(L2.resolve('emc', C0 + 200).cte.alpha[0], (8e-6 * (150 + C0 - 293.15) + 30e-6 * (50)) / (200 + C0 - 293.15), 1e-12);
  assert.ok(L2.resolve('tim', C0 + 25).cte);
  const ind = L2.resolve('tim_indium', C0 + 25);
  assert.ok(ind.provenance.template.some((t) => t.property === 'elastic.nu'));
  near(lib.resolve('emc', C0 + 25).elastic.nu, 0.3, 0); // base library unchanged
  assert.throws(() => applyOverrides(lib, { emc: { E_GPa: { value: 10, status: 'template', note: 'x' } } }), /only for nu and k_W_mK/);
  assert.throws(() => applyOverrides(lib, { emc: { E_GPa: { value: 10, status: 'reported' } } }), /ref or note/);
  assert.throws(() => applyOverrides(lib, { emc: { Young: { value: 10, status: 'user', note: 'x' } } }), /unknown field/);
  assert.throws(() => applyOverrides(lib, { si_crystal: { nu: { value: 0.2, status: 'user', note: 'x' } } }), /needs both E_GPa and nu/);
});

test('every material key emitted by the L3 cowos_l generator resolves or refuses for a documented reason', async () => {
  let gen;
  try {
    gen = await import('../src/families/node.mjs');
  } catch {
    return; // families lane not present
  }
  const r = gen.generateNode('cowos_l');
  const keys = [...new Set(r.boxes.map((b) => b.material))];
  assert.ok(keys.length > 10);
  const allowed = /'other' has no default|is N\/A|outside valid_T_C|outside data range/;
  const report = {};
  for (const [label, need] of [
    ['thermal', ['k']],
    ['mechanics', ['k', 'elastic', 'cte']],
  ]) {
    let ok = 0;
    for (const k of keys) {
      try {
        lib.resolve(k, C0 + 25, { need, Tsf_K: C0 + 150, homogenization: 'rom' });
        ok++;
      } catch (e) {
        assert.match(e.message, allowed, `${label} ${k}: ${e.message}`);
        (report[label] ??= []).push(k);
      }
    }
    assert.ok(ok / keys.length >= 0.8, `${label}: ${ok}/${keys.length} resolve`);
  }
  // at 25 C only the unmapped 'other' parts (lids) refuse thermally
  assert.deepEqual(report.thermal ?? [], keys.filter((k) => k === 'other' || k.includes(':other+') || k.includes('+other:')));
});

test('cubic rotation follows SPEC 12 (active R): 30 deg C16 vs an independent 4th-order tensor rotation', () => {
  const C = lib.resolve('si_crystal', C0 + 25, { need: ['elastic'] }).elastic;
  const deg = 30;
  const t = (deg * Math.PI) / 180;
  const R = [
    [Math.cos(t), -Math.sin(t), 0],
    [Math.sin(t), Math.cos(t), 0],
    [0, 0, 1],
  ];
  const c4 = (i, j, k, l) => {
    const idx = (a, b) => (a === b ? a : a + b === 1 ? 5 : a + b === 2 ? 4 : 3);
    const I = idx(i, j);
    const J = idx(k, l);
    if (I < 3 && J < 3) return I === J ? C.C11 : C.C12;
    if (I === J) return C.C44;
    return 0;
  };
  const rot = (i, j, k, l) => {
    let s = 0;
    for (let p = 0; p < 3; p++) for (let q = 0; q < 3; q++) for (let r = 0; r < 3; r++) for (let u = 0; u < 3; u++) s += R[i][p] * R[j][q] * R[k][r] * R[l][u] * c4(p, q, r, u);
    return s;
  };
  const M = cubicStiffnessRotZ(C, deg);
  near(M[5] / 1e9, rot(0, 0, 0, 1) / 1e9, 1e-9, 'C16'); // Voigt (1,6) = C_1112
  // audit A1 values (-12.406 / 187.088 GPa) were for the Hopcroft-rounded constants 165.6 / 63.9 / 79.5; L21 (2026-10-21)
  // moved the default to the Hall 1967 Table III values 165.64 / 63.94 / 79.51, which give -12.4101 / 187.1350
  near(M[5] / 1e9, -12.4101, 0.001, 'C16 audit value (Hall constants)');
  near(M[0] / 1e9, 187.135, 0.001, 'C11 audit value (Hall constants)');
  near(M[0], rot(0, 0, 0, 0), 1e-3);
  near(M[35], rot(0, 1, 0, 1), 1e-3);
});

test('homogenized Poisson convention: reciprocity, plane major ratio = ROM, continuous in f', () => {
  const T = C0 + 25;
  let prev = null;
  for (const f of [0.02, 0.05, 0.1, 0.3, 0.5, 0.7, 0.95]) {
    for (const axis of ['plane', 'xy', 'x', 'z']) {
      const kind = axis === 'z' ? 'via_field' : 'rdl_layer';
      const h = lib.homogenize({ kind, constituents: { inclusion: 'cu_electroplated', matrix: 'abf_gx' }, fraction: f, axis, T_K: T, Tsf_K: C0 + 150, opts: { need: ['elastic', 'cte'] } });
      const o = h.elastic;
      const E = { x: o.Ex, y: o.Ey, z: o.Ez };
      const nu = { xy: o.nuxy, yz: o.nuyz, xz: o.nuxz };
      for (const [ij, v] of Object.entries(nu)) {
        const [i, j] = ij;
        const nji = (v * E[j]) / E[i]; // reciprocity nu_ij / E_i = nu_ji / E_j
        assert.ok(v < 0.5 && nji < 0.5 && nji > 0, `${axis} f ${f} nu ${ij} ${v} / ${nji}`);
      }
      assert.ok(!h.provenance.warnings.includes('homogenized compliance not positive definite'), `${axis} ${f} PD`);
      if (axis === 'plane') {
        near(o.nuxz, h.bounds.nu.rom, 1e-15, 'plane major nu = ROM');
        if (prev !== null) assert.ok(Math.abs(o.nuxz - prev) < 0.1, 'continuous in f');
        prev = o.nuxz;
      }
      if (axis === 'xy') {
        near(o.Ex, 0.5 * (h.bounds.E.voigt + h.bounds.E.reuss), 1);
        near(h.k_W_mK[0], h.k_W_mK[1], 1e-12);
      }
      if (axis === 'x') assert.ok(o.Ex > o.Ey && Math.abs(o.Ex - o.Ez) < 1, 'lines along x: x and z Voigt (metal spans the level), y Reuss');
    }
  }
  const ky = lib.resolve('homog:rdl_layer:copper+organic_build_up:0.3:x', T, { need: ['k'], homogenization: 'rom' }).k_W_mK;
  assert.ok(ky[1] < 1 && ky[0] > 100, `lines along x: k ${ky}`);
  assert.equal(lib.resolve('homog:rdl_layer:copper+organic_build_up:0.85', T, { need: ['k'], homogenization: 'rom' }).topology, 'plane');
});

test('override CTE kind: numeric value defaults to secant at 25 C with a recorded assumption', () => {
  const L2 = applyOverrides(lib, { emc: { cte_ppmK: { value: 9, status: 'public', ref: 'TDS' } }, abf_gl: { cte_ppmK: { value: 20, kind: 'instantaneous', status: 'reported', ref: 'p' } } });
  const p = L2.resolve('emc', C0 + 25).provenance.properties.cte;
  assert.equal(p.kind_stored, 'secant');
  near(p.Tref_K, C0 + 25, 1e-9);
  assert.equal(p.assumption, 'override_cte_secant_Tref_25C');
  assert.equal(L2.resolve('abf_gl', C0 + 25).provenance.properties.cte.assumption, null);
  assert.throws(() => applyOverrides(lib, { emc: { cte_ppmK: { value: 9, kind: 'mean', status: 'user', note: 'x' } } }), /kind must be/);
});

test('wave-3 entries resolve within their sourced ranges; placeholders refuse', () => {
  const T = C0 + 25;
  const sa = lib.resolve('silicone_adhesive', T);
  near(sa.elastic.E_Pa, 358e6, 1);
  // nu history: before L21 0.30 placeholder; L21 (2026-10-21) 0.495 PDMS analog (c8sm02105h); after L27 (2026-10-21,
  // audit A8 S1, approved by Wentao) 0.30 placeholder again, bounds 0.25-0.495; 0.495 is the alternative pdms_rubbery_analog_nu
  near(sa.elastic.nu, 0.3, 0);
  assert.ok(sa.provenance.template.some((t) => t.property === 'elastic.nu' && t.placeholder && !t.analog_of));
  near(lib.resolve('silicone_adhesive', T, { use: { elastic: 'pdms_rubbery_analog_nu' } }).elastic.nu, 0.495, 0);
  assert.throws(() => lib.resolve('silicone_adhesive', C0 + 240), /outside data range/);
  assert.ok(lib.resolve('silicone_adhesive', C0 + 240, { use: { elastic: 'eccobond3003_E', cte: 'eccobond3003_cte' } }).elastic);
  near(lib.resolve('snbi', T).elastic.E_Pa, 11.9e9, 1);
  near(lib.resolve('ncp', T).cte.alpha[0], 30e-6, 1e-15);
  near(lib.resolve('sin_film', T, { need: ['k', 'elastic'] }).elastic.E_Pa, 160e9, 1);
  assert.throws(() => lib.resolve('sin_film', T), /sin_film\.cte is N\/A/);
  assert.throws(() => lib.resolve('sicn_film', T), /N\/A/);
  assert.throws(() => lib.resolve('ncf', T), /N\/A/);
  near(lib.resolve('glass_en_a1', T, { need: ['k'] }).k_W_mK[0], 1.2, 1e-12);
});

test('all families (listFamilies) at 25 C and 240 C: every key resolves or refuses for a documented reason', async () => {
  let gen;
  let fam;
  try {
    gen = await import('../src/families/node.mjs');
    fam = await import('../src/families/index.mjs');
  } catch {
    return;
  }
  const allowed = /'other' has no default|is N\/A|outside valid_T_C|outside data range/;
  let total = 0;
  let ok = 0;
  for (const id of fam.listFamilies()) {
    const keys = [...new Set(gen.generateNode(id).boxes.map((b) => b.material))];
    for (const T of [25, 240])
      for (const need of [['k'], ['k', 'elastic', 'cte']])
        for (const k of keys) {
          total++;
          try {
            lib.resolve(k, C0 + T, { need, Tsf_K: C0 + 150, homogenization: 'rom' });
            ok++;
          } catch (e) {
            assert.match(e.message, allowed, `${id} ${k} ${T} C: ${e.message}`);
          }
        }
  }
  assert.ok(ok / total >= 0.9, `${ok}/${total} resolve`);
});

test('per-axis CTE override [ax, ay, az] (audit M5: core z CTE)', () => {
  const L2 = applyOverrides(lib, { core_lowcte: { cte_ppmK: { value: [11, 11, 16], status: 'reported', ref: 'ectc.2011.5898527 p.2 Table 2' } } });
  const r = L2.resolve('core_lowcte', C0 + 25);
  rel(r.cte.alpha[0], 11e-6, 1e-12);
  rel(r.cte.alpha[2], 16e-6, 1e-12);
  near(r.cte.Tref_K, C0 + 25, 1e-9);
  assert.equal(r.provenance.properties.cte.assumption, 'override_cte_secant_Tref_25C');
  const reb = L2.rebaseSecantCte(r, C0 + 150, C0 + 25).alpha;
  assert.ok(reb[2] > reb[0]);
  const Li = applyOverrides(lib, { core_lowcte: { cte_ppmK: { value: [11, 11, 16], kind: 'instantaneous', status: 'reported', ref: 'x' } } });
  rel(Li.resolve('core_lowcte', C0 + 200).cte.alpha[2], 16e-6, 1e-12);
  assert.throws(() => applyOverrides(lib, { core_lowcte: { cte_ppmK: { value: [11, 16], status: 'user', note: 'x' } } }), /\[ax, ay, az\]/);
});

test('CD5 template CTE: compliant layers only; CD6 extrapolation by key list with provenance flags', () => {
  const tim = lib.resolve('tim_polymer', C0 + 25);
  rel(tim.cte.alpha[0], 149e-6, 1e-12);
  assert.ok(tim.provenance.template.some((t) => t.property === 'cte' && t.sensitivity.delta.factor[1] === 3));
  // stiff material with a template CTE is refused at resolve time
  const L2 = applyOverrides(lib, { tim_polymer: { E_GPa: { value: 5, status: 'user', note: 'stiffness test' } } });
  assert.throws(() => L2.resolve('tim_polymer', C0 + 25), /only for compliant layers/);
  const S = readDataDir().sources;
  const base = (props) => ({ schema: 'ap-sim.materials/1', verified_on: '2026-10-20', materials: { x: { description: 'd', class: 'c', tier: '1', status: 'ok', valid_T_C: [0, 100], properties: props } } });
  const T = { basis: 'template', range_from: 'r', source: 'hpl1972', locator: 'p', verified_on: '2026-10-20' };
  assert.match(validateFile(base({ cte: { kind: 'instantaneous', value: 100, unit: 'ppm/K', ...T, sensitivity: { property: 'cte', delta: { factor: [0.5, 2] } }, rationale: 'x' } }), 't', S).join(), /factor: \[1\/3, 3\]/);
  assert.match(validateFile(base({ cte: { kind: 'instantaneous', value: 100, unit: 'ppm/K', ...T, sensitivity: { property: 'cte', delta: { factor: [0.33, 3] } } } }), 't', S).join(), /rationale/);
  // CD6: list-based extrapolation
  assert.throws(() => lib.resolve('tim_polymer', C0 + 240), /outside valid_T_C/);
  const r = lib.resolve('tim_polymer', C0 + 240, { allowExtrapolation: ['tim'] });
  assert.ok(r.provenance.extrapolated.some((x) => x.property === 'valid_T_C' && Math.abs(x.T_C - 240) < 1e-9));
  assert.throws(() => lib.resolve('sac305', C0 + 240, { allowExtrapolation: ['tim_polymer'] }), /outside valid_T_C/);
  const s = lib.resolve('ss304', C0 + 240, { allowExtrapolation: ['ss304'] });
  const ex = s.provenance.extrapolated.find((x) => x.property === 'cte');
  assert.equal(ex.rule, 'hold_last_alpha');
  assert.deepEqual(ex.range_C, [20, 100]);
  const h = lib.resolve('homog:bga:solder+void:0.2827', C0 + 240, { Tsf_K: C0 + 150, allowExtrapolation: ['homog:bga:solder+void:0.2827'] });
  assert.ok(h.elastic);
  assert.ok(h.provenance.extrapolated.some((x) => x.constituent === 'sac305'));
  near(lib.resolve('sus430', C0 + 25).elastic.E_Pa, 200e9, 1);
});

test('CD7: homog keys resolve by RVE by default (equal to homog/resolveHomog), ROM selectable, ROM fallback on failure', async (t) => {
  const { resolveHomog } = await import('../src/homog/resolver.mjs');
  const T = C0 + 25;
  const Tsf = C0 + 150;
  assert.equal(lib.homogenizationDefault(), 'rve');
  for (const key of ['homog:microbump:copper+underfill:0.2077', 'homog:tsv:copper+silicon:0.0314', 'homog:rdl_layer:copper+organic_build_up:0.4118:x']) {
    const t0 = performance.now();
    const a = lib.resolve(key, T, { Tsf_K: Tsf });
    const t1 = performance.now();
    lib.resolve(key, T, { Tsf_K: Tsf });
    const t2 = performance.now();
    t.diagnostic(`${key}: RVE first call ${(t1 - t0).toFixed(0)} ms, cached ${(t2 - t1).toFixed(2)} ms`);
    assert.equal(a.homogenization, 'rve');
    const b = resolveHomog(key, T, { lib, Tsf_K: Tsf });
    for (let i = 0; i < 3; i++) {
      rel(a.k_W_mK[i], b.k_W_mK[i], 1e-12, `${key} k`);
      rel(a.cte.alpha[i], b.cte.alpha[i], 1e-12, `${key} cte`);
    }
    for (const q of ['Ex', 'Ey', 'Ez', 'Gxy', 'Gyz', 'Gxz', 'nuxy', 'nuyz', 'nuxz']) rel(a.elastic[q], b.elastic[q], 1e-12, `${key} ${q}`);
    const r = lib.resolve(key, T, { Tsf_K: Tsf, homogenization: 'rom' });
    assert.equal(r.homogenization, 'rom');
  }
  // void matrix: delegated to the library rule of mixtures inside the RVE resolver (no recursion)
  const v = lib.resolve('homog:bga:solder+void:0.2827', T, { Tsf_K: Tsf });
  assert.match(String(v.provenance.rve ?? ''), /void/);
  // thermal-only call without Tsf_K: CTE not reported
  assert.equal(lib.resolve('homog:c4:copper+underfill:0.2101', T, { need: ['k'] }).cte, null);
  // failure -> ROM fallback with a warning
  const Lf = createLibrary(readDataDir());
  Lf.attachHomogResolver(() => ({ resolve: () => { throw new Error('boom'); } }));
  const f = Lf.resolve('homog:c4:copper+underfill:0.2101', T, { Tsf_K: Tsf });
  assert.equal(f.homogenization, 'rom');
  assert.ok(f.provenance.warnings.some((w) => /RVE failed \(boom\)/.test(w)));
  // overrides keep the RVE default
  assert.equal(applyOverrides(lib, { emc: { nu: { value: 0.3, status: 'user', note: 'x' } } }).homogenizationDefault(), 'rve');
});

test('cure shrinkage field, solder_resist routing, unusedOverrideKeys', () => {
  const T = C0 + 25;
  const e = lib.resolve('emc', T);
  near(e.cure_shrinkage.value, 0.0016, 1e-15);
  assert.equal(e.cure_shrinkage.kind, 'not_stated');
  assert.equal(e.cure_shrinkage.linear, null);
  assert.equal(e.provenance.properties.cure_shrinkage.locator.includes('Table 8'), true);
  const alt = lib.resolve('emc', T, { use: { cure_shrinkage: 'cv8710u_mold_shrinkage' } }).cure_shrinkage;
  near(alt.linear, 0.0021, 1e-15);
  near(alt.volumetric, 0.0063, 1e-15);
  assert.equal(lib.resolve('underfill_cuf', T).cure_shrinkage, null);
  assert.throws(() => lib.resolve('underfill_cuf', T, { need: ['cure_shrinkage'] }), /cure_shrinkage is N\/A/);
  const S = readDataDir().sources;
  const doc = { schema: 'ap-sim.materials/1', verified_on: '2026-10-20', materials: { x: { description: 'd', class: 'c', tier: '1', status: 'ok', valid_T_C: [0, 100], properties: { cure_shrinkage: { value: 0.2, unit: '%', basis: 'measured', source: 'hpl1972', locator: 'p', verified_on: '2026-10-20' } } } } };
  assert.match(validateFile(doc, 't', S).join(), /cure_shrinkage kind/);
  // solder resist stays solder_resist (never polyimide_rdl)
  assert.equal(lib.resolve('solder_resist', T).key, 'solder_resist');
  assert.equal(lib.canonicalKey('solder_resist').key, 'solder_resist');
  for (const s of ['solder resist', 'Solder Resist', 'solder mask', 'Taiyo solder mask']) assert.equal(lib.aliasDbString(s, 'dielectric_polymer'), 'solder_resist', s);
  assert.notEqual(lib.aliasTemplateKey('polymer_dielectric').key, 'solder_resist');
  // unused override keys
  const used = ['silicon', 'homog:microbump:copper+underfill:0.2', 'emc', 'homog:bga:solder+void:0.28'];
  assert.deepEqual(unusedOverrideKeys({ si_crystal: {}, underfill_cuf: {}, sac305: {}, abf_gl: {}, copper: {}, mold_compound: {} }, used, lib), ['abf_gl']);
  assert.deepEqual(unusedOverrideKeys({ emc: {}, glass: {} }, used), ['glass']);
});

test('wave 8: override status sensitivity; underfill_c4 with inherited markers', () => {
  const T = C0 + 25;
  const L2 = applyOverrides(lib, { emc: { k_W_mK: { value: 1.9, status: 'sensitivity', note: 'k x2 bound of the CV8710U analog' }, nu: { value: 0.35, status: 'sensitivity', note: 'nu +0.05 bound' } } });
  const p = L2.resolve('emc', T).provenance.properties;
  assert.equal(p.k.override_status, 'sensitivity');
  assert.equal(p.k.sensitivity_bound, true);
  assert.equal(p.elastic.fields.nu.override_status, 'sensitivity');
  // E_GPa joined the sensitivity fields (L26, 2026-10-21); rho / cp still refuse the status
  assert.throws(() => applyOverrides(lib, { emc: { rho_kg_m3: { value: 2000, status: 'sensitivity', note: 'x' } } }), /status sensitivity only for/);
  const c4 = lib.resolve('underfill_c4', T);
  near(c4.elastic.E_Pa, 6.9e9, 1);
  near(lib.resolve('underfill_c4', C0 + 200).elastic.E_Pa, 0.1e9, 1);
  rel(c4.cte.alpha[0], 20e-6, 1e-12);
  assert.equal(c4.provenance.properties.k.inherited_from, 'underfill_cuf');
  assert.equal(c4.provenance.properties.elastic.fields.nu.inherited_from, 'underfill_cuf');
  assert.equal(c4.provenance.properties.cte.inherited_from, null);
  const x = lib.resolve('underfill_c4', T, { use: { elastic: 'xilinx_c4uf_E', cte: 'xilinx_c4uf_cte' } });
  near(x.elastic.E_Pa, 8.5e9, 1);
  rel(x.cte.alpha[0], 32e-6, 1e-12);
  assert.equal(lib.aliasDbString('C4 UF (process standard)', 'underfill'), 'underfill_c4');
  assert.equal(lib.aliasDbString('Top CUF', 'underfill'), 'underfill_cuf');
  assert.equal(lib.aliasTemplateKey('underfill').key, 'underfill_cuf');
});

test('RVE: conduction-only answers are guarded; default table attached', () => {
  const T = C0 + 25;
  const r = lib.resolve('homog:c4:copper+underfill:0.2101', T, { need: ['k'], Tsf_K: C0 + 150 });
  assert.equal(r.cte, null);
  assert.ok(r.k_W_mK[2] > r.k_W_mK[0]);
  const Lk = createLibrary(readDataDir());
  Lk.attachHomogResolver(() => ({ resolve: (k, TT, o) => ({ key: k, k_W_mK: [1, 1, 2], elastic: null, cte: null, provenance: {} }) }));
  assert.equal(Lk.resolve('homog:c4:copper+underfill:0.2101', T, { need: ['k'], Tsf_K: C0 + 150 }).cte, null);
  // a mechanics caller getting no elastic / CTE data: error naming the key
  assert.throws(() => Lk.resolve('homog:c4:copper+underfill:0.2101', T, { Tsf_K: C0 + 150 }), /homog:c4:copper\+underfill:0\.2101: RVE returned no elastic data/);
  const Lc = createLibrary(readDataDir());
  Lc.attachHomogResolver(() => ({ resolve: (k) => ({ key: k, k_W_mK: [1, 1, 2], elastic: { type: 'iso', E_Pa: 1e9, nu: 0.3 }, cte: null, provenance: {} }) }));
  assert.throws(() => Lc.resolve('homog:c4:copper+underfill:0.2101', T, { Tsf_K: C0 + 150 }), /RVE returned no CTE/);
  const att = lib.homogAttachment();
  assert.ok(att.cfg.table === null || att.cfg.table === undefined || att.cfg.table.schema === 'ap-sim-rve-table/0');
});
