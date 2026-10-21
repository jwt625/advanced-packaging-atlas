// Precomputed RVE table for the family generator defaults (browser shipping; coordinator request 2026-10-20). Lane L8.
// Script-free and deterministic: the same generators, library, cfg and request lists give the same table.
// Requests: every non-void `homog:` key the default generation of each family emits, with
//   full rows (key, T, Tsf) for the (stress-free, temperature) pairs of that family's thermo-elastic sim cases, and
//   conduction rows (key, T, null) on a temperature grid (default 25 .. 225 C, 25 K) for thermal studies.
// Rule of use: resolver.mjs RVE_TABLE_RULE (exact hit or linear interpolation in T within 50 K at the same Tsf).
// License: GPL-3.0-or-later.

import { createRveResolver, buildRveTable } from './resolver.mjs';

/** Mechanical (Tsf_C, T_C) pairs of the thermo-elastic sim cases per family (sims/<family>/*.yaml, 2026-10-20). */
export const DEFAULT_MECH_POINTS = Object.freeze({
  cowos_l: [{ Tsf_C: 150, T_C: [25, 240] }],
  cowos_s: [{ Tsf_C: 150, T_C: [25, 250, 260] }, { Tsf_C: 170, T_C: [30, 148, 222, 243, 260] }],
  emib_t: [{ Tsf_C: 150, T_C: [25, 240] }],
  fan_out_panel: [{ Tsf_C: 120, T_C: [25] }],
  fcbga_organic: [{ Tsf_C: 150, T_C: [25, 265] }, { Tsf_C: 180, T_C: [25, 30, 260, 265] }],
  glass_core_substrate: [{ Tsf_C: 150, T_C: [25, 265] }],
  ucla_si_if: [{ Tsf_C: 150, T_C: [25] }],
});
export const DEFAULT_K_T_C = Object.freeze([25, 50, 75, 100, 125, 150, 175, 200, 225]);

/** Non-void homog keys of each family's default generation: {family: [keys]}. */
export function familyHomogKeys(generate, families, data = null) {
  const out = {};
  for (const f of families) {
    const g = generate(f, {}, data ? { data } : {});
    out[f] = [...new Set((g.boxes ?? g.parts).map((p) => String(p.material)).filter((m) => m.startsWith('homog:') && !/\+void:/.test(m)))].sort();
  }
  return out;
}

/** Request list (deterministic order) for buildRveTable. */
export function defaultTableRequests(keysByFamily, { mech = DEFAULT_MECH_POINTS, k_T_C = DEFAULT_K_T_C } = {}) {
  const seen = new Set(), req = [];
  const add = (q) => { const id = `${q.key}|${q.T_C}|${q.Tsf_C}`; if (!seen.has(id)) { seen.add(id); req.push(q); } };
  for (const f of Object.keys(keysByFamily).sort()) {
    for (const key of keysByFamily[f]) {
      for (const pt of mech[f] ?? []) for (const T of pt.T_C) add({ key, T_C: T, Tsf_C: pt.Tsf_C });
      for (const T of k_T_C) add({ key, T_C: T, Tsf_C: null });
    }
  }
  return req;
}

/** Build the default table with a resolver over `lib` (cfg: createRveResolver cfg). */
export function buildDefaultRveTable(lib, { generate, families, data = null, cfg = {}, onProgress = null, mech, k_T_C } = {}) {
  const keys = familyHomogKeys(generate, families, data);
  const requests = defaultTableRequests(keys, { mech, k_T_C });
  const r = createRveResolver(lib, cfg);
  const t = buildRveTable(r, requests, { onProgress });
  t.families = keys;
  t.requests = requests.length;
  return t;
}
