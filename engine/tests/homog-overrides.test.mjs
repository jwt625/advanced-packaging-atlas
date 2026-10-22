// Overrides of homogenized constituents under the CD7 RVE default (lane L11, DevLog-012; L3 wave 5 bug report).
// Case / study / sensitivity-bound materials.overrides reach homog: keys through applyOverrides; the precomputed RVE
// table and the RVE cache are keyed by a fingerprint of the resolved constituent values.
// License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLibrary, readDataDir, createLibrary, applyOverrides } from '../src/materials/node.mjs';
import { createRveResolver, buildRveTable } from '../src/homog/resolver.mjs';

const T25 = 298.15, TSF150 = 423.15;
// fcbga_organic default generation: PTH field in the core (organic_laminate -> core_lowcte); tabulated at (25 C, Tsf 150 C)
const PTH = 'homog:pth:copper+organic_laminate:0.0346';
const BUMP = 'homog:microbump:copper+underfill:0.2077'; // cowos_l default, tabulated at (25 C, Tsf 150 C)
const lib = loadLibrary(); // CD7 default: RVE resolver with the shipped table

const relC = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i]))) / Math.max(...b.map(Math.abs));
const C6 = (e) => e.provenance.C6_Pa;

/** Library built from edited data documents (no overrides machinery), live RVE only. */
function handBuilt(edit) {
  const input = readDataDir();
  for (const f of input.files) for (const [k, m] of Object.entries(f.doc.materials ?? {})) edit(k, m);
  const L = createLibrary(input);
  L.attachHomogResolver(createRveResolver, {});
  return L;
}
const sens = (value) => ({ value, status: 'sensitivity', note: 'CD1 bound (test)' });

test('default table: unmodified constituents hit the table and equal the live RVE', () => {
  const e = lib.resolve(PTH, T25, { Tsf_K: TSF150 });
  assert.equal(e.homogenization, 'rve');
  assert.equal(e.provenance.rve_table?.status, 'hit_exact');
  assert.ok(Array.isArray(e.provenance.table.fingerprints) && e.provenance.table.fingerprints.length === 1);
  const live = loadLibrary(undefined, { rveTable: null }).resolve(PTH, T25, { Tsf_K: TSF150 });
  assert.equal(live.provenance.rve_table?.status, 'no_table');
  assert.ok(relC(C6(e), C6(live)) < 1e-12, `table vs live ${relC(C6(e), C6(live))}`);
  assert.ok(Math.abs(e.cte.alpha[0] / live.cte.alpha[0] - 1) < 1e-12);
  assert.ok(lib.homogStats().table_exact >= 1);
});

test('constituent nu override (CD1 sensitivity bound) reaches the RVE exactly as a hand-built library', () => {
  const nominal = lib.resolve(PTH, T25, { Tsf_K: TSF150 });
  const nu0 = lib.entry('core_lowcte').properties.elastic.nu.value;
  const out = {};
  for (const [tag, nu] of [['minus', nu0 - 0.05], ['plus', nu0 + 0.05]]) {
    const L = applyOverrides(lib, { core_lowcte: { nu: sens(nu) } });
    const e = L.resolve(PTH, T25, { Tsf_K: TSF150 });
    assert.equal(e.provenance.rve_table?.status, 'miss_fingerprint', `${tag}: overridden constituent must not use the default row`);
    assert.ok(relC(C6(e), C6(nominal)) > 1e-3, `${tag}: RVE unchanged by the override`);
    out[tag] = e;
    // unmodified constituents in the same overridden library still hit the default table
    const b = L.resolve(BUMP, T25, { Tsf_K: TSF150 });
    assert.equal(b.provenance.rve_table?.status, 'hit_exact', `${tag}: unrelated key should hit the table`);
  }
  assert.ok(out.minus.elastic.nuxy < nominal.elastic.nuxy && nominal.elastic.nuxy < out.plus.elastic.nuxy, 'in-plane nu follows the core nu');
  const H = handBuilt((k, m) => { if (k === 'core_lowcte') m.properties.elastic.nu.value = nu0 + 0.05; });
  const h = H.resolve(PTH, T25, { Tsf_K: TSF150 });
  assert.ok(relC(C6(out.plus), C6(h)) < 1e-12, `override vs hand-built ${relC(C6(out.plus), C6(h))}`);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(out.plus.cte.alpha[i] / h.cte.alpha[i] - 1) < 1e-12);
  // ROM sees the same override (the L3 ROM path already did)
  const rom0 = lib.resolve(PTH, T25, { Tsf_K: TSF150, homogenization: 'rom' }).elastic.nuxy;
  const romP = applyOverrides(lib, { core_lowcte: { nu: sens(nu0 + 0.05) } }).resolve(PTH, T25, { Tsf_K: TSF150, homogenization: 'rom' }).elastic.nuxy;
  assert.ok(romP > rom0);
});

test('constituent E override (case level) reaches the RVE exactly as a hand-built library; shared cache by fingerprint', () => {
  const ov = { underfill: { E_GPa: { value: 6.0, status: 'reported', ref: 'test value' } } };
  const L = applyOverrides(lib, ov);
  const e = L.resolve(BUMP, T25, { Tsf_K: TSF150 });
  assert.equal(e.provenance.rve_table?.status, 'miss_fingerprint');
  const nominal = lib.resolve(BUMP, T25, { Tsf_K: TSF150 });
  assert.ok(e.elastic.Ex / nominal.elastic.Ex < 0.95, `transverse E should drop with the underfill E (${e.elastic.Ex} vs ${nominal.elastic.Ex})`);
  const H = handBuilt((k, m) => {
    if (k !== 'underfill_cuf') return;
    const E = m.properties.elastic.E;
    m.properties.elastic.E = { value: 6.0, unit: 'GPa', basis: E.basis, source: E.source, locator: 'test value', verified_on: '2026-10-20' };
  });
  const h = H.resolve(BUMP, T25, { Tsf_K: TSF150 });
  assert.ok(relC(C6(e), C6(h)) < 1e-12, `override vs hand-built ${relC(C6(e), C6(h))}`);
  // a second library with the same override set reuses the shared cache (same fingerprint), no new RVE solve
  const L2 = applyOverrides(lib, ov);
  const e2 = L2.resolve(BUMP, T25, { Tsf_K: TSF150 });
  assert.ok(relC(C6(e2), C6(e)) === 0);
  const st = L2.homogStats();
  assert.equal(st.cache, 1);
  assert.equal(st.live_full, 0);
});

test('ROM and RVE agree on a laminate (RDL lines with equal Poisson ratios): exact Voigt / Reuss / Turner components', () => {
  // lines along x spanning the level = plates normal to y; with equal nu the laminate in-plane E, in-plate shear,
  // transverse shear, k (parallel / series) and in-plane CTE (Turner) are exact (derivation in DevLog/lanes/L11)
  const key = 'homog:rdl_layer:copper+polymer_dielectric:0.5:x';
  const L = applyOverrides(lib, { polymer_dielectric: { nu: { value: 0.3, status: 'user', note: 'equal-nu laminate check (test)' } } });
  assert.equal(L.resolve('copper', T25).elastic.nu, 0.3);
  const rve = L.resolve(key, T25, { Tsf_K: TSF150 });
  const rom = L.resolve(key, T25, { Tsf_K: TSF150, homogenization: 'rom' });
  assert.equal(rve.homogenization, 'rve');
  assert.equal(rom.homogenization, 'rom');
  assert.notEqual(rve.provenance.rve_table?.status, 'hit_exact');
  for (const q of ['Ex', 'Ez', 'Gxz', 'Gxy', 'Gyz', 'nuxz'])
    assert.ok(Math.abs(rve.elastic[q] / rom.elastic[q] - 1) < 1e-9, `${q}: RVE ${rve.elastic[q]} vs ROM ${rom.elastic[q]}`);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(rve.k_W_mK[i] / rom.k_W_mK[i] - 1) < 1e-9, `k[${i}]`);
  for (const i of [0, 2]) assert.ok(Math.abs(rve.cte.alpha[i] / rom.cte.alpha[i] - 1) < 1e-9, `alpha[${i}] RVE ${rve.cte.alpha[i]} vs ROM ${rom.cte.alpha[i]}`);
});

test('table rows without fingerprints and tables built with another cfg are not used', () => {
  const key = 'homog:rdl_layer:copper+oxide:0.5:x'; // strip: exact laminate, ms
  // constituent view as the library gives its resolver (ROM for homog: keys, no recursion)
  const view = Object.assign(Object.create(lib), { resolve: (k, T, o = {}) => lib.resolve(k, T, { ...o, homogenization: 'rom' }) });
  const t = JSON.parse(JSON.stringify(buildRveTable(createRveResolver(view, { n: 16 }), [{ key, T_C: 25, Tsf_C: 150 }, { key, T_C: 25, Tsf_C: null }])));
  assert.ok(t.rows.every((r) => typeof r.fp_k === 'string') && typeof t.rows[0].fp === 'string');
  const ok = createRveResolver(view, { n: 16, table: t });
  assert.equal(ok.resolve(key, T25, { Tsf_K: TSF150 }).provenance.rve_table.status, 'hit_exact');
  assert.equal(ok.resolve(key, T25, { need: ['k'] }).provenance.rve_table.status, 'hit_exact');
  const legacy = JSON.parse(JSON.stringify(t));
  for (const r of legacy.rows) { delete r.fp; delete r.fp_k; }
  const R1 = createRveResolver(view, { n: 16, table: legacy });
  assert.equal(R1.resolve(key, T25, { Tsf_K: TSF150 }).provenance.rve_table.status, 'miss_unverified');
  assert.equal(R1.stats().table_miss_unverified, 1);
  const R2 = createRveResolver(view, { n: 8, table: t });
  assert.equal(R2.resolve(key, T25, { Tsf_K: TSF150 }).provenance.rve_table.status, 'miss_cfg_mismatch');
  assert.equal(R2.stats().table_cfg_mismatch, 1);
});

test('thermal-only (k) requests: rho / cp overrides are fingerprinted too (k-only rows serve rho and cp)', () => {
  const key = 'homog:rdl_layer:copper+oxide:0.5:x';
  const d = lib.resolve(key, T25, { need: ['k'] });
  assert.equal(d.provenance.rve_table?.status, 'hit_exact');
  const L = applyOverrides(lib, { copper: { rho_kg_m3: { value: 1000, status: 'user', note: 'test value' } } });
  const e = L.resolve(key, T25, { need: ['k'] });
  assert.notEqual(e.provenance.rve_table?.status, 'hit_exact', 'a rho override must not reuse the default k row');
  assert.ok(e.rho_kg_m3 == null || Math.abs(e.rho_kg_m3 - d.rho_kg_m3) > 1, `rho ${e.rho_kg_m3} vs default ${d.rho_kg_m3}`);
});

test('canonical homog keys (lane L20): alias and number spellings of tabulated constituents hit the same rows; overrides still miss', async () => {
  const { canonicalHomogKey } = await import('../src/homog/resolver.mjs');
  assert.equal(canonicalHomogKey(lib, 'homog:c4:copper+underfill:0.21010'), 'homog:c4:cu_electroplated+underfill_cuf:0.2101');
  assert.equal(canonicalHomogKey(lib, 'homog:rdl_layer:copper+oxide:0.5:plane'), canonicalHomogKey(lib, 'homog:rdl_layer:copper+sio2_film:0.5'));
  assert.equal(canonicalHomogKey(lib, 'homog:tsv:copper+silicon:0.0079:z'), 'homog:tsv:cu_electroplated+si_crystal:0.0079');
  assert.equal(canonicalHomogKey(lib, 'homog:rdl_layer:copper+oxide:0.5:x'), 'homog:rdl_layer:cu_electroplated+sio2_film:0.5:x');
  assert.equal(canonicalHomogKey(lib, 'homog:stack:copper+oxide:1/2.0'), 'homog:stack:cu_electroplated+sio2_film:1/2');
  assert.equal(canonicalHomogKey(lib, 'homog:stack:mystack'), 'homog:stack:mystack');
  // the shipped table has full rows only under 'homog:c4:copper+underfill_cuf:0.2101' (25 C, Tsf 150 C)
  const tab = 'homog:c4:copper+underfill_cuf:0.2101';
  const ref = lib.resolve(tab, T25, { Tsf_K: TSF150 });
  assert.equal(ref.provenance.rve_table.status, 'hit_exact');
  for (const k of ['homog:c4:copper+underfill:0.2101', 'homog:c4:cu_electroplated+underfill_cuf:0.21010']) {
    const e = lib.resolve(k, T25, { Tsf_K: TSF150 });
    assert.equal(e.provenance.rve_table.status, 'hit_exact', k);
    assert.equal(e.key, k, 'entry keeps the requested key');
    assert.deepEqual(C6(e), C6(ref));
    assert.deepEqual(e.cte.alpha, ref.cte.alpha);
    assert.deepEqual(e.k_W_mK, ref.k_W_mK);
  }
  // conduction rows exist only as 'homog:c4:copper+underfill:0.1963': served to the canonical spelling too
  const kAlias = lib.resolve('homog:c4:cu_electroplated+underfill_cuf:0.1963', T25, { need: ['k'] });
  assert.equal(kAlias.provenance.rve_table.status, 'hit_exact');
  assert.deepEqual(kAlias.k_W_mK, lib.resolve('homog:c4:copper+underfill:0.1963', T25, { need: ['k'] }).k_W_mK);
  // an overridden constituent under either spelling misses on the fingerprint and computes live
  const L = applyOverrides(lib, { underfill_cuf: { k_W_mK: { value: 0.9, status: 'user', note: 'canonical-key fingerprint check (test)' } } });
  const o = L.resolve('homog:c4:copper+underfill:0.1963', T25, { need: ['k'] });
  assert.equal(o.provenance.rve_table.status, 'miss_fingerprint');
  assert.notDeepEqual(o.k_W_mK, kAlias.k_W_mK);
});
