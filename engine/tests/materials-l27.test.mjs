// Lane L27 (DevLog-013, 2026-10-21): materials follow-ups after audit A8 and the L24 transient finding.
// License: GPL-3.0-or-later.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadLibrary, readDataDir, createLibrary, ANAND_PARAMS } from '../src/materials/node.mjs';
import { buildGrid } from '../src/grid/index.mjs';
import { solveThermalTransient } from '../src/thermal/transient.mjs';

const lib = loadLibrary();
const C0 = 273.15;
const near = (a, b, tol, msg = '') => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b} (tol ${tol})`);

test('si_crystal cp: NIST-JANAF Cp / A_r (J/kg K); si_hr inherits it', () => {
  // janaf_si_1998 p.1881: Cp 20.000 J/K mol at 298.15 K, 22.142 at 400 K; A_r 28.0855
  const r = lib.resolve('si_crystal', 298.15, { need: ['k', 'density', 'cp'] });
  near(r.cp_J_kgK, 20.0 / 0.0280855, 0.1);
  near(lib.resolve('si_crystal', 400, { need: ['cp'] }).cp_J_kgK, 22.142 / 0.0280855, 0.1);
  assert.equal(r.provenance.properties.cp.source, 'janaf_si_1998');
  const h = lib.resolve('si_hr', 298.15, { need: ['cp'] });
  near(h.cp_J_kgK, r.cp_J_kgK, 0);
  assert.equal(h.provenance.properties.cp.inherited_from, 'si_crystal');
});

test('thermal_transient runs on library Si (was "si_crystal.cp is N/A"): adiabatic slab heated by a flux, long-time closed form', () => {
  // 0.1 mm Si slab, flux q at the top, all else adiabatic. Diffusion time L^2 / a ~ 1e-4 s << t = 0.01 s, so the
  // quasi-steady profile holds: T(z) = T0 + q t / (rho cp L) + q / (2 k L) (z^2 - L^2 / 3), z from the bottom.
  // Bottom (z = 0): dT = q t / (rho cp L) - q L / (6 k). k, rho, cp at T0 (transient uses props at the initial T).
  const L = 1e-4, q = 1e6, t = 0.01, T0 = 25;
  const parts = [{ id: 'si', kind: 'die', material: 'si_crystal', x_mm: 0, y_mm: 0, w_mm: 1, d_mm: 1, z_um: 0, h_um: L * 1e6 }];
  const g = buildGrid(parts, { max_xy_mm: 0.5, min_cells_per_layer: 20 });
  const resolve = (key, TK, opts) => lib.resolve(key, TK, opts);
  const bcs = [{ selection: 'top:si', type: 'heat_flux', q_W_m2: q }, { selection: 'default', type: 'adiabatic' }];
  const r = solveThermalTransient(g, { initial_C: T0, bcs }, resolve, { t_end_s: t, dt_s: 1e-4, scheme: 'cn', output_s: [t], probes: [{ name: 'b', x_mm: 0, y_mm: 0, z_um: 0 }], solver: 'direct' });
  const m = lib.resolve('si_crystal', T0 + C0, { need: ['k', 'density', 'cp'] });
  const k = m.k_W_mK[2];
  const dT = (q * t) / (m.rho_kg_m3 * m.cp_J_kgK * L) - (q * L) / (6 * k);
  const got = r.probes[0].T_C.at(-1) - T0;
  near(got, dT, 2e-3 * dT, 'bottom rise');
  assert.ok(r.derived.energy.balance_rel < 1e-10, `${r.derived.energy.balance_rel}`);
});

test('audit A8 minors: Ea, analog_of markers, Anand whitelist, verified_on on nested tier-2 alternatives', () => {
  const ve = lib.tier2('emc', 'viscoelastic');
  // M2: Ea = H ln10 / 2.30 with H = 401 kJ/mol (Sadeghinia p.88 Table 6, Eq. 9)
  near(ve.shift.below.Ea_J_mol, (401e3 * Math.LN10) / 2.3, 0.05);
  // M1: with T0 read as 200.5 K, Eq. 9 (source form) at 60 C gives +41.6, not +71
  const srcLog = (TK, T0K) => -(401e3 / (2.3 * 8.314462618)) * (1 / TK - 1 / T0K);
  near(srcLog(C0 + 60, 200.5), 41.6, 0.05);
  // M9: machine-readable analog markers
  assert.match(ve.analog_of, /model EMC of Sadeghinia 2012/);
  const p = lib.resolve('silicone_adhesive', C0 + 25, { use: { cte: 'cte_pdms_sylgard184' } }).provenance.properties.cte;
  assert.match(p.analog_of, /Sylgard 184/);
  assert.equal(p.template, undefined, 'measured analog data are not template values');
  // M11: Anand params are exactly the nine parameters; nested alternatives carry verified_on
  for (const [key, alts] of [['sac305', ['zhang2014_snagcuzn', 'zhang2014_sac387_ref27', 'zhang2014_sn38ag05cu_ref28', 'motalab2012_stress_strain', 'motalab2012_creep']], ['snag', ['cheng2000_sn35ag']]]) {
    for (const a of alts) {
      const t = lib.tier2(key, 'viscoplastic', a);
      assert.deepEqual(Object.keys(t.params).sort(), [...ANAND_PARAMS].sort(), `${key} ${a}`);
      assert.match(String(t.verified_on), /^\d{4}-\d{2}-\d{2}$/);
    }
  }
  assert.equal(lib.tier2('cu_electroplated', 'plasticity', 'read2004_film_curve').verified_on, '2026-10-21');
  // schema: a nested alternative without verified_on, and an empty analog_of, are refused
  const base = readDataDir();
  const patch = (fn) => ({ ...base, files: base.files.map((f) => (f.name === 'solders.yaml' || f.name === 'tims_adhesives.yaml' ? { name: f.name, doc: fn(structuredClone(f.doc), f.name) } : f)) });
  assert.throws(() => createLibrary(patch((d, n) => { if (n === 'solders.yaml') delete d.materials.snag.properties.viscoplastic.alternatives.cheng2000_sn35ag.verified_on; return d; })), /cheng2000_sn35ag: verified_on/);
  assert.throws(() => createLibrary(patch((d, n) => { if (n === 'tims_adhesives.yaml') d.materials.silicone_adhesive.alternatives.cte_pdms_sylgard184.analog_of = ' '; return d; })), /analog_of must be a non-empty text/);
});
