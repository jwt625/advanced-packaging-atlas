// Materials library tests for the 8 manual-download sources (lane L21, DevLog-013): Hall 1967 Si Cij, Glassbrenner-
// Slack 1964 Si k, Okada-Tokumaru 1984 Si alpha, Sadeghinia 2012 EMC (Prony / shift / CTE / shrinkage), Read 2004
// plated Cu, Cheng 2000 and Zhang 2014 Anand sets, Mueller 2019 PDMS nu. Values are checked against the printed
// numbers (locators in the data files). License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { DATA_DIR, loadLibrary, readDataDir, createLibrary, cubicDirectionalE, applyOverrides, ANAND_PARAMS } from '../src/materials/node.mjs';
import { relaxation } from '../src/mech/viscoelastic.mjs';

const lib = loadLibrary(undefined, { homogenization: 'rom' });
const C0 = 273.15;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} expected ${b} +- ${tol}, got ${a}`);

test('Si default: Hall 1967 Table III constants and density; E<100> / <110> / <111> still 130 / 169 / 188 GPa', () => {
  const si = lib.resolve('si_crystal', C0 + 25);
  near(si.elastic.C11, 165.64e9, 1);
  near(si.elastic.C12, 63.94e9, 1);
  near(si.elastic.C44, 79.51e9, 1);
  near(si.rho_kg_m3, 2329.0, 1e-9);
  assert.equal(si.provenance.properties.elastic.source, 'physrev.161.756');
  const C = { C11: si.elastic.C11, C12: si.elastic.C12, C44: si.elastic.C44 };
  near(cubicDirectionalE(C, [1, 0, 0]) / 1e9, 130.024, 1e-3, 'E<100>');
  near(cubicDirectionalE(C, [1, 1, 0]) / 1e9, 168.956, 1e-3, 'E<110>');
  near(cubicDirectionalE(C, [1, 1, 1]) / 1e9, 187.688, 1e-3, 'E<111>');
});

test('Si Cij(T) alternative (Hall 1967, 4.2-310 K): printed nodes, stiffening on cooling, refusal above 310 K', () => {
  const lo = lib.resolve('si_crystal', 4.2 + 0, { use: { elastic: 'cubic_T_hall1967' }, need: ['elastic'], allowExtrapolation: true });
  near(lo.elastic.C11, 167.54e9, 1, 'Table V C11');
  near(lo.elastic.C12, 64.92e9, 1, 'Table V C12');
  near(lo.elastic.C44, 80.24e9, 1, 'Table V C44');
  const rt = lib.resolve('si_crystal', 298.15, { use: { elastic: 'cubic_T_hall1967' } });
  const d = lib.resolve('si_crystal', 298.15);
  for (const f of ['C11', 'C12', 'C44']) near(rt.elastic[f], d.elastic[f], 1, `25 C node = default ${f}`);
  const cold = lib.resolve('si_crystal', C0 - 55, { use: { elastic: 'cubic_T_hall1967' } });
  assert.ok(cold.elastic.C11 > rt.elastic.C11 && cold.elastic.C44 > rt.elastic.C44, 'stiffer at -55 C');
  near(cold.elastic.C11 / rt.elastic.C11 - 1, 0.005, 0.001, 'C11 +0.5 % at -55 C');
  assert.throws(() => lib.resolve('si_crystal', C0 + 50, { use: { elastic: 'cubic_T_hall1967' } }), /outside data range/);
});

test('Si k (Glassbrenner-Slack) and alpha (Okada-Tokumaru) alternatives', () => {
  const k = (T) => lib.resolve('si_crystal', T, { use: { k: 'k_glassbrenner1964' }, need: ['k'] }).k_W_mK[0];
  near(k(300), 156, 1e-9, 'Table I 1.56 W/cmK at 300 K');
  near(k(500), 80, 1e-9, 'Table I 0.80 W/cmK at 500 K');
  // Okada-Tokumaru Eq. (5) vs their Table IV calculated column (2 decimals)
  const L = createLibrary(readDataDir());
  const e = L.entry('si_crystal').alternatives.cte_okada1984;
  assert.equal(e.kind, 'instantaneous');
  const f = (T) => 3.725 * (1 - Math.exp(-5.88e-3 * (T - 124))) + 5.548e-4 * T;
  for (const [T, v] of [[298.2, 2.55], [300, 2.57], [500, 3.59], [800, 4.10], [1500, 4.56]]) near(f(T), v, 0.005, `Table IV ${T} K`);
  // secant from the library (instantaneous expression integrated at load) equals the integral of Eq. (5)
  for (const T of [220, 400, 600]) {
    let s = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) s += f(293.15 + ((T - 293.15) * (i + 0.5)) / n);
    const a = lib.resolve('si_crystal', T, { use: { cte: 'cte_okada1984' } }).cte.alpha[0] * 1e6;
    near(a, s / n, 1e-6, `secant at ${T} K`);
    near(a, lib.resolve('si_crystal', T).cte.alpha[0] * 1e6, 0.06, `within 0.06 ppm/K of Swenson at ${T} K`);
  }
});

test('EMC tier-2 viscoelastic data (Sadeghinia 2012 filled model EMC): Prony reproduces the master curve, shift form', () => {
  const v = lib.tier2('emc', 'viscoelastic');
  assert.equal(v.status, 'tier2_data');
  assert.equal(v.source, 'j.ijadhadh.2011.10.007');
  const gs = v.prony.reduce((a, t) => a + t.g, 0);
  assert.ok(gs > 0 && gs < 1);
  near(1 - gs, v.g_inf, 1e-5, 'g_inf');
  // relaxation() of the E8 skeleton accepts the block: g(0) = 1, g(inf) = g_inf
  near(relaxation(v, 0), 1, 1e-12);
  near(relaxation(v, 1e12), v.g_inf, 1e-6);
  // storage modulus of the Prony set vs the 90 master-curve points (Fig. 11b): max relative error < 8 %, rms < 3 %
  const { log10_omega_rad_s: lw, log10_E_GPa: lE } = v.master_curve;
  assert.equal(lw.length, 90);
  let mx = 0, ss = 0;
  lw.forEach((x, i) => {
    const w = 10 ** x;
    const Ep = v.E0_GPa * (v.g_inf + v.prony.reduce((a, t) => a + (t.g * (w * t.tau_s) ** 2) / (1 + (w * t.tau_s) ** 2), 0));
    const r = Ep / 10 ** lE[i] - 1;
    mx = Math.max(mx, Math.abs(r));
    ss += r * r;
  });
  assert.ok(mx < 0.08 && Math.sqrt(ss / lw.length) < 0.03, `fit max ${mx}, rms ${Math.sqrt(ss / lw.length)}`);
  // plateaus vs Table 5 (1 Hz storage moduli at the plateau temperatures): rubbery 108.3 MPa, glassy 7239 MPa
  near(v.E0_GPa * v.g_inf * 1e3, 108.3, 15, 'rubbery plateau');
  assert.ok(v.E0_GPa > 6 && v.E0_GPa < 7.3, 'glassy plateau at 120 C below the 20 C Table 5 value');
  // shift: engine convention, source values; WLF branch reproduces the Fig. 12(b) curve at 140 C (+2.91, source form)
  assert.equal(v.shift.type, 'piecewise');
  const { C1, C2_K, Tref_C } = v.shift.above;
  near((C1 * (140 - Tref_C)) / (C2_K + 140 - Tref_C), 2.9, 0.05);
  const ar = v.shift.below;
  const logSrc = (T_C) => -(ar.Ea_J_mol / (Math.LN10 * 8.314462618)) * (1 / (T_C + C0) - 1 / (ar.Tref_C + C0));
  near(logSrc(60), -18.63, 0.1, 'Arrhenius branch at 60 C (Fig. 12b)');
});

test('EMC alternatives: Sadeghinia CTE (Eq. 6), cure shrinkage, E with derived nu; defaults unchanged', () => {
  const d = lib.resolve('emc', C0 + 25);
  near(d.elastic.E_Pa, 18e9, 1);
  near(d.cure_shrinkage.value, 0.0016, 1e-12);
  const a = (T) => lib.resolve('emc', C0 + T, { use: { cte: 'sadeghinia2012_filled_cte' } }).cte;
  // instantaneous alpha from the integrated strain: glassy (k1 / 3) at 40 C, rubbery ((k1 + k2) / 3) at 200 C
  const inst = (T) => {
    const h = 0.05, s = (t) => a(t).alpha[0] * (t - (a(t).Tref_K - C0));
    return ((s(T + h) - s(T - h)) / (2 * h)) * 1e6;
  };
  near(inst(41), 27.7, 0.2, 'Fig. 8 about 28 ppm/K at 40 C');
  near(inst(199), 89.0, 0.2, 'rubbery 89 ppm/K');
  const s = lib.resolve('emc', C0 + 25, { use: { cure_shrinkage: 'sadeghinia2012_filled_shrinkage' } }).cure_shrinkage;
  assert.equal(s.kind, 'volumetric');
  near(s.volumetric, 0.021, 1e-12);
  near(s.linear, 0.007, 1e-12);
  const e = lib.resolve('emc', C0 + 25, { use: { elastic: 'sadeghinia2012_filled_E' } }).elastic;
  near(e.E_Pa, 7239e6, 1);
  near(e.nu, (3 * 15255 - 7239) / (6 * 15255), 5e-4, 'nu = (3K - E) / 6K');
});

test('Anand sets: completeness, transcribed values, tier2 accessor', () => {
  for (const key of ['sac305', 'snag']) {
    const b = lib.tier2(key, 'viscoplastic');
    assert.equal(b.model, 'anand');
    for (const p of ANAND_PARAMS) assert.ok(Number.isFinite(b.params[p]), `${key} ${p}`);
    for (const a of b.alternatives) {
      const s = lib.tier2(key, 'viscoplastic', a);
      for (const p of ANAND_PARAMS) assert.ok(Number.isFinite(s.params[p]), `${key}.${a} ${p}`);
      assert.ok(s.source && s.locator);
    }
  }
  assert.deepEqual(lib.tier2('snag', 'viscoplastic', 'cheng2000_sn35ag').params, { s0_MPa: 39.09, Q_R_K: 8900, A_per_s: 22300, xi: 6, m: 0.182, h0_MPa: 3321.15, s_hat_MPa: 73.81, n: 0.018, a: 1.82 });
  assert.deepEqual(lib.tier2('sac305', 'viscoplastic', 'zhang2014_snagcuzn').params, { s0_MPa: 34.1, Q_R_K: 8500, A_per_s: 23500, xi: 5.6, m: 0.163, h0_MPa: 3642.5, s_hat_MPa: 65.9, n: 0.0186, a: 2.1 });
  assert.equal(lib.tier2('snag', 'viscoplastic', 'cheng2000_sn35ag').source, '09540910010331428');
  assert.throws(() => lib.tier2('snag', 'viscoplastic', 'nope'), /unknown tier-2 alternative/);
  assert.equal(lib.tier2('underfill_cuf', 'viscoelastic'), null);
  // Cheng 2000 E(T) = E0 - E1 T_C for 96.5Sn3.5Ag
  const e = lib.resolve('snag', C0 + 25, { use: { elastic: 'e_cheng2000' }, need: ['k'] });
  assert.equal(e.elastic, null, 'nu N/A: elastic not usable for mechanics');
  const L = createLibrary(readDataDir());
  const leaf = L.entry('snag').alternatives.e_cheng2000.E;
  near(leaf.a + leaf.b * 25, 47572.5, 1e-9);
});

test('Read 2004 plated-Cu film data: alternatives only, curve consistent with Table 1', () => {
  const d = lib.resolve('cu_electroplated', C0 + 25);
  near(d.elastic.E_Pa, 121.3e9, 1, 'default E unchanged');
  const c = lib.tier2('cu_electroplated', 'plasticity', 'read2004_film_curve');
  assert.equal(c.model, 'multilinear_engineering');
  const peak = Math.max(...c.stress_MPa);
  near(peak, c.uts_MPa, 15, 'curve peak within the Table 1 standard deviation of the average UTS');
  near(c.stress_MPa[6] / c.strain[6] / 1e3, c.E_GPa, 10, 'initial secant slope (150 MPa) vs E 73 GPa');
  const f = lib.resolve('cu_electroplated', C0 + 25, { use: { elastic: 'e_read2004_film' }, need: ['k'] });
  assert.equal(f.elastic, null);
});

// L27 (2026-10-21, audit A8 S1, approved by Wentao): before = default nu 0.495 PDMS analog, delta -0.045 / +0.004;
// after = default nu 0.30 CD4 placeholder, delta -0.05 / +0.195 (0.25-0.495), PDMS analog kept as an elastic alternative.
test('silicone_adhesive nu: 0.30 placeholder (bounds 0.25-0.495); PDMS analog 0.495 as alternative; overrides admissible; 3003 alternative keeps the placeholder', () => {
  const r = lib.resolve('silicone_adhesive', C0 + 25);
  near(r.elastic.nu, 0.3, 0);
  const t = r.provenance.template.find((x) => x.property === 'elastic.nu');
  assert.ok(t && t.placeholder && !t.analog_of);
  assert.deepEqual(t.sensitivity.delta, { minus: 0.05, plus: 0.195 });
  const row = lib.listTemplateValues().find((x) => x.key === 'silicone_adhesive' && x.where === 'properties.elastic.nu');
  near(row.value - row.sensitivity.delta.minus, 0.25, 1e-12);
  near(row.value + row.sensitivity.delta.plus, 0.495, 1e-12);
  assert.match(row.rationale, /11\.9 GPa at 25 C/);
  const an = lib.resolve('silicone_adhesive', C0 + 25, { use: { elastic: 'pdms_rubbery_analog_nu' } });
  near(an.elastic.nu, 0.495, 0);
  near(an.elastic.E_Pa, r.elastic.E_Pa, 0, 'analog alternative keeps the default E table');
  const ta = an.provenance.template.find((x) => x.property === 'elastic.nu');
  assert.ok(ta && /rubbery/.test(ta.analog_of) && !ta.placeholder);
  assert.deepEqual(ta.sensitivity.delta, { minus: 0.045, plus: 0.004 });
  for (const nu of [0.25, 0.45, 0.495, 0.499]) {
    const L = applyOverrides(lib, { silicone_adhesive: { nu: { value: nu, status: 'sensitivity', note: 'bound' } } });
    near(L.resolve('silicone_adhesive', C0 + 25).elastic.nu, nu, 1e-12);
  }
  const a = lib.resolve('silicone_adhesive', C0 + 240, { use: { elastic: 'eccobond3003_E', cte: 'eccobond3003_cte' } });
  near(a.elastic.nu, 0.3, 0);
  const p = lib.resolve('silicone_adhesive', C0 + 125, { use: { cte: 'cte_pdms_sylgard184' } }).cte;
  near(p.alpha[0], 309.63e-6, 1e-12);
  near(p.Tref_K, C0 + 25, 1e-9);
});

test('source registry: numeric-looking ids are strings and match their paper_id', () => {
  const doc = YAML.parse(readFileSync(join(DATA_DIR, '_sources.yaml'), 'utf8'));
  for (const [id, s] of Object.entries(doc.sources)) if (s.paper_id !== undefined) assert.equal(typeof s.paper_id, 'string', `${id} paper_id parsed as ${typeof s.paper_id}`);
  for (const id of ['physrev.161.756', 'physrev.134.a1058', '1.333965', 'j.ijadhadh.2011.10.007', 'j.mee.2003.09.012', '09540910010331428', 'j.microrel.2013.07.100', 'c8sm02105h']) {
    assert.equal(doc.sources[id]?.paper_id, id, id);
    assert.equal(doc.sources[id].access, 'local_cache', id);
  }
});

test('tier-2 schema refusals: Prony sum >= 1, missing Anand parameter, alternative without source', () => {
  const base = readDataDir();
  const mk = (patch) => {
    const files = base.files.map((f) => (f.name === 'encapsulants.yaml' ? { name: f.name, doc: structuredClone(f.doc) } : f));
    patch(files.find((f) => f.name === 'encapsulants.yaml').doc.materials.emc.properties.viscoelastic);
    return () => createLibrary({ ...base, files });
  };
  assert.throws(mk((v) => { v.prony[0].g = 0.99; }), /sum g_i < 1/);
  assert.throws(mk((v) => { v.shift = { type: 'wlf', C1: 1 }; }), /wlf shift needs/);
  const files = base.files.map((f) => (f.name === 'solders.yaml' ? { name: f.name, doc: structuredClone(f.doc) } : f));
  const vp = files.find((f) => f.name === 'solders.yaml').doc.materials.snag.properties.viscoplastic;
  delete vp.alternatives.cheng2000_sn35ag.xi;
  delete vp.alternatives.cheng2000_sn35ag.source;
  assert.throws(() => createLibrary({ ...base, files }), /Anand set needs[\s\S]*source required|source required[\s\S]*Anand set needs/);
});
