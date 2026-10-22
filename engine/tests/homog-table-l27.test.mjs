// Lane L27 (DevLog-013, 2026-10-21): audit A7 S1 (k-only RVE table hits served the k of full rows) and the rho / cp
// of conduction-only RVE entries (thermal transients on homog: keys). License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLibrary, readDefaultRveTable } from '../src/materials/node.mjs';

const table = readDefaultRveTable();
const tab = loadLibrary(); // shipped table attached
const live = loadLibrary(undefined, { rveTable: null }); // live RVE only
const relErr = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i]) / Math.abs(b[i])));

test('A7 S1: every k-only exact table hit at 298.15 K equals the live conduction RVE to 1e-12 (k, rho, cp)', (t) => {
  const keys = [...new Set(table.rows.filter((r) => r.Tsf_K == null && Math.abs(r.T_K - 298.15) < 1e-9).map((r) => r.key))];
  assert.ok(keys.length >= 40, `${keys.length} keys`);
  let worst = 0, both = 0;
  for (const key of keys) {
    const hasFull = table.rows.some((r) => r.key === key && r.Tsf_K != null && Math.abs(r.T_K - 298.15) < 1e-9);
    if (hasFull) both++;
    const a = tab.resolve(key, 298.15, { need: ['k'] });
    assert.equal(a.provenance.rve_table?.status, 'hit_exact', key);
    const b = live.resolve(key, 298.15, { need: ['k'] });
    const e = relErr(a.k_W_mK, b.k_W_mK);
    worst = Math.max(worst, e);
    assert.ok(e <= 1e-12, `${key} k rel ${e}`);
    assert.equal(a.rho_kg_m3, b.rho_kg_m3, `${key} rho`);
    assert.equal(a.cp_J_kgK, b.cp_J_kgK, `${key} cp`);
  }
  t.diagnostic(`${keys.length} keys (${both} with a full row at the same T); worst k rel ${worst}`);
  assert.ok(both >= 20, 'the S1 case (full and k-only rows at the same T) is covered');
});

test('A7 S1: the A7 examples serve the k-only row, not the full row', () => {
  for (const key of ['homog:c4:copper+underfill_cuf:0.2101', 'homog:rdl_layer:copper+oxide:0.85:plane', 'homog:tsv:copper+silicon:0.0079']) {
    const rows = table.rows.filter((r) => r.key === key && Math.abs(r.T_K - 298.15) < 1e-9);
    const kRow = rows.find((r) => r.Tsf_K == null), full = rows.find((r) => r.Tsf_K != null);
    assert.ok(kRow && full, key);
    assert.notDeepEqual(kRow.k, full.k, `${key}: the two row types differ (the S1 situation)`);
    assert.deepEqual(tab.resolve(key, 298.15, { need: ['k'] }).k_W_mK, kRow.k, key);
  }
});

test('conduction-only RVE entries carry rho and cp by the volumetric mixture rule (TSV Cu + Si at 25 C)', () => {
  const key = 'homog:tsv:copper+silicon:0.0035';
  const e = live.resolve(key, 298.15, { need: ['k'] });
  const cu = live.resolve('cu_bulk', 298.15, { need: [] }), si = live.resolve('si_crystal', 298.15, { need: [] });
  const f = 0.0035;
  const rho = f * cu.rho_kg_m3 + (1 - f) * si.rho_kg_m3;
  assert.ok(Math.abs(e.rho_kg_m3 / rho - 1) < 1e-14);
  assert.ok(Math.abs(e.cp_J_kgK / ((f * cu.rho_kg_m3 * cu.cp_J_kgK + (1 - f) * si.rho_kg_m3 * si.cp_J_kgK) / rho) - 1) < 1e-14);
  // full and k-only entries agree on rho and cp (same rule, same nominal fractions)
  const full = live.resolve(key, 298.15, { Tsf_K: 423.15 });
  assert.equal(full.rho_kg_m3, e.rho_kg_m3);
  // a constituent without cp gives null (no silent default): underfill_cuf has no cp
  assert.equal(live.resolve('homog:c4:copper+underfill_cuf:0.2101', 298.15, { need: ['k'] }).cp_J_kgK, null);
});
