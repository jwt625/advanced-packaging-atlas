// Override admissibility, expression-form k overrides and RVE -> ROM fallback accounting (lane L11 wave 2; audit A3
// S1 and M2, DevLog/audits/sim_engine_audit_A3_2026-10-20.md). License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLibrary, readDataDir, createLibrary, applyOverrides } from '../src/materials/node.mjs';

const lib = loadLibrary();
const T25 = 298.15, TSF150 = 423.15;
const ov = (field, value, extra = {}) => ({ copper: { [field]: { value, status: 'user', note: 'test', ...extra } } });

test('applyOverrides refuses inadmissible values, naming key and field', () => {
  for (const nu of [0.5, 0.6, -0.1, -1.2, NaN]) assert.throws(() => applyOverrides(lib, ov('nu', nu)), /override copper\.nu .*0 <= nu < 0\.5/, `nu ${nu}`);
  for (const E of [0, -3, Infinity]) assert.throws(() => applyOverrides(lib, ov('E_GPa', E)), /override copper\.E_GPa .*E must be/, `E ${E}`);
  for (const k of [0, -1, [1, 0, 1], [1, 2]]) assert.throws(() => applyOverrides(lib, ov('k_W_mK', k)), /override copper\.k_W_mK .*k must be > 0/, `k ${JSON.stringify(k)}`);
  assert.throws(() => applyOverrides(lib, ov('rho_kg_m3', 0)), /override copper\.rho_kg_m3/);
  assert.throws(() => applyOverrides(lib, ov('cp_J_kgK', -5)), /override copper\.cp_J_kgK/);
  assert.throws(() => applyOverrides(lib, ov('cte_ppmK', NaN)), /override copper\.cte_ppmK/);
  // sensitivity bounds are checked the same way (a bound pushed past 0.5 by a caller without a clip)
  assert.throws(() => applyOverrides(lib, { core_lowcte: { nu: { value: 0.52, status: 'sensitivity', note: 'bound' } } }), /core_lowcte\.nu/);
  // admissible edge values pass
  assert.equal(applyOverrides(lib, ov('nu', 0.499)).resolve('copper', T25).elastic.nu, 0.499);
  assert.equal(applyOverrides(lib, ov('nu', 0)).resolve('copper', T25).elastic.nu, 0);
  // the audit A3 probe: copper nu 0.6 no longer yields a homogenized tensor (refused before any resolve)
  assert.throws(() => applyOverrides(lib, ov('nu', 0.6)).resolve('homog:c4:copper+underfill_cuf:0.2101', T25, { Tsf_K: TSF150 }), /0 <= nu < 0\.5/);
});

test('expression-form k override (k_W_mK: {expr}) reaches plain keys and homog constituents (ROM and RVE)', () => {
  const key = 'homog:rdl_layer:copper+oxide:0.5:x'; // strip: x is the parallel (Voigt) direction
  const expr = '400 - 0.1 * (T_C - 25)';
  for (const form of [{ copper: { k_W_mK: { expr, status: 'user', note: 'test' } } }, { copper: { k_W_mK: { value: { expr }, status: 'user', note: 'test' } } }]) {
    const L = applyOverrides(lib, form);
    for (const T_C of [25, 125]) {
      const T = T_C + 273.15, kCu = 400 - 0.1 * (T_C - 25);
      assert.deepEqual(L.resolve('copper', T, { need: ['k'] }).k_W_mK, [kCu, kCu, kCu]);
      const kOx = L.resolve('oxide', T, { need: ['k'] }).k_W_mK[0];
      for (const mode of ['rom', 'rve']) {
        const k = L.resolve(key, T, { need: ['k'], homogenization: mode }).k_W_mK;
        assert.ok(Math.abs(k[0] / (0.5 * kCu + 0.5 * kOx) - 1) < 1e-9, `${mode} ${T_C} C kx ${k[0]}`);
      }
    }
  }
  assert.throws(() => applyOverrides(lib, { copper: { k_W_mK: { expr: '100 - T_C', status: 'user', note: 'test' } } }), /copper\.k_W_mK.*must be > 0/);
  assert.throws(() => applyOverrides(lib, { copper: { k_W_mK: { expr: 'foo * 2', status: 'user', note: 'test' } } }), /copper\.k_W_mK.*unknown parameter 'foo'/);
});

test('RVE -> ROM fallbacks are counted in homogStats (per library and per attachment family)', () => {
  const L = createLibrary(readDataDir());
  L.attachHomogResolver(() => ({ resolve: () => { throw new Error('synthetic RVE failure'); }, stats: () => ({}) }), {});
  const key = 'homog:microbump:copper+underfill:0.2077';
  const r = L.resolve(key, T25, { Tsf_K: TSF150 });
  assert.equal(r.homogenization, 'rom');
  assert.match(r.provenance.rve_error, /synthetic RVE failure/);
  let st = L.homogStats();
  assert.equal(st.rom_fallback, 1);
  assert.deepEqual(st.rom_fallback_keys, [key]);
  assert.equal(st.rom_fallback_events[0].T_C, 25);
  // a derived (overridden) library reports its own fallbacks; the family view on the root sees both
  const D = applyOverrides(L, ov('nu', 0.31));
  D.resolve('homog:rdl_layer:copper+oxide:0.5:x', T25, { Tsf_K: TSF150 });
  assert.equal(D.homogStats().rom_fallback, 1);
  st = L.homogStats();
  assert.equal(st.rom_fallback, 1);
  assert.equal(L.homogStats({ family: true }).rom_fallback, 2);
  assert.equal(lib.homogStats().rom_fallback, 0, 'the default library has no fallback');
});
