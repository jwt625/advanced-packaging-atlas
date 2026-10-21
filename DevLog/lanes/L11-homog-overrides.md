# Lane L11: homogenized-constituent overrides (takes over engine/src/materials and engine/src/homog from L2 / L8)

Date: 2026-10-20. Owner paths: `engine/src/materials/`, `engine/src/homog/`, `engine/tests/materials*.test.mjs`,
`engine/tests/homog*.test.mjs`, this file. Reads: DevLog-012 (shared rules binding, CD1-CD7), SPEC sections 4, 8, 11,
18 (v0.14), L2 waves 6-8b, L8 E3 / table, L3 wave 5 final. Rules: no git writes, no retrieval, no emoji, ISO dates,
nice -n 10, < 4 GB RSS, one heavy run at a time.

## Bug (L3 wave 5, 2026-10-20 19:00 PDT)

Under the CD7 RVE default, `materials.overrides` of constituents never reach `homog:` layers. fcbga s2 coarse,
core_lowcte nu -0.05 / +0.05: ROM 247.14 / 232.93 um (nominal 240.03), RVE 243.83 / 243.83 (unchanged).

## Root cause (probe 2026-10-20 19:25 PDT, before any change)

Scratch probe: `homog:pth:copper+organic_laminate:0.0346` (organic_laminate -> core_lowcte) at 25 C, Tsf 150 C, core
nu override 0.25 / 0.35 via applyOverrides:

| library | nu 0.25: RVE nuxy | nu 0.35: RVE nuxy | nominal | table |
|---|---|---|---|---|
| loadLibrary() (default table) | 0.11600 | 0.11600 | 0.11600 | exact hit |
| loadLibrary(dir, {rveTable: null}) | 0.25379 | 0.35721 | 0.11600 | none |

- Cause (a) is not it: applyOverrides already re-attaches the resolver factory to the new library (its ROM view
  resolves constituents from the overridden data).
- Cause (b) is it: the shipped table (attached by default since L2 wave 8b, 18:08) is looked up by (key, T, Tsf) only,
  and applyOverrides re-attaches with the same cfg (same table), so every tabulated key returns the default-constituent
  row. The per-resolver cache is fresh per library, so it is not involved today, but it is keyed the same way.

## Plan (2026-10-20 19:30 PDT, before implementation)

1. `homog/resolver.mjs`
   - `fingerprint(key, T_K, Tsf_K | null)`: hash (cyrb53, 12 significant digits) of the resolved constituent values the
     RVE uses: full = per constituent elastic constants (+ orientation), CTE rebased to (Tsf, T_eval), k, rho, cp at
     T_eval (T_eval = Tsf + 1 K when T = Tsf, as the solve); k-only = constituent k at T. Stacks: layer list with
     thicknesses, nested homog layers by their own fingerprint, and stackConstituents mode. Void matrix: inclusion only.
     A constituent that fails to resolve gives null (no table use; the live path raises the real error).
   - Table rows carry `fp` (full rows) and `fp_k` (all rows with k); `buildRveTable` writes them.
   - Lookup: a row serves a request only when its stored fingerprint equals the current library's fingerprint at that
     row's (T, Tsf) (both rows for an interpolated hit); rows without a fingerprint are never used (legacy table);
     a table whose cfg (n, element, h_over_p, richardson) differs from the resolver cfg is not used.
   - Cache key includes the fingerprint (and stackConstituents); `cfg.cache` lets resolvers share one cache.
   - Counters in `stats()`: table_exact, table_interpolated, table_miss_fingerprint, table_miss_unverified,
     table_miss_absent, table_cfg_mismatch, live_full, live_k, void_rom, cache. Entry provenance: `rve_table`
     {status hit_exact | hit_interpolated | miss_fingerprint | miss_unverified | miss_absent | cfg_mismatch | no_table,
     fingerprint}.
2. `materials/library.mjs`: attachHomogResolver gives the attachment one shared cache (kept by applyOverrides, safe
   because the key carries the fingerprint); `lib.homogStats()` returns the attached resolver's counters.
3. Rebuild `homog/rve_table_defaults.json` with fingerprints (buildDefaultRveTable, current generators and data;
   old file backed up in the scratchpad first; rows diffed against the old table to show whether it was stale).
4. Tests (`engine/tests/homog-overrides.test.mjs`): override nu / E of a constituent of an fcbga key changes the RVE
   result exactly as a hand-built library with the same values; sensitivity bounds change it; unmodified
   constituents still hit the default table; ROM and RVE agree on a laminate (strip with equal Poisson ratios, exact
   Voigt / Reuss / Turner components); legacy rows and cfg mismatch are not used.
5. ROM-shift attribution (scratch copy of the engine, CD7 b / c reverted there; tracked files untouched): current ROM,
   reverted-b/c ROM, live RVE, compared with L3's pre-18:08 values.
6. Re-runs: Xilinx no-lid and lidded (RVE, ROM), fcbga s2 sensitivity, materials + homog + mech tests, full suite once.

## Progress log
- 2026-10-20 19:32 PDT: scratch snapshot of the pre-fix engine (`prefix/`) and the shipped table backed up in the
  scratchpad. Probe above recorded (root cause (b), table lookup by key / T / Tsf only).
- 2026-10-20 19:30-19:33 PDT: implemented (resolver.mjs, library.mjs):
  - `fingerprint()` / `fpText()` / verified `lookup()`; cache key `...|stackConstituents|ext|fp`; `cfg.cache` shared
    map; per-entry `provenance.rve_table {status, fingerprint[, table_fingerprint]}`, table hits also
    `provenance.table.fingerprints`; new counters in `stats()`; table cfg check; rows `fp` / `fp_k` in
    `rveTableRow` / `buildRveTable`; RVE_TABLE_RULE text extended.
  - library.mjs: attachHomogResolver gives the attachment a shared cache (`cfg.cache`, reused by applyOverrides);
    `lib.homogStats()`.
  - Probe after the change (legacy table, no fingerprints): nominal and both nu bounds compute live (status
    miss_unverified), nu bounds 0.25 / 0.35 give nuxy 0.25379 / 0.35721; live nominal nuxy 0.11599607439648005 equals
    the old table row to all digits (the core data are unchanged since the 16:08 build).
- 2026-10-20 19:33-19:36 PDT: table rebuild (scratch `build_table.mjs`, resumable JSONL, buildDefaultRveTable
  request list from the current generators). Generator keys changed since the 16:08 build: cowos_l / cowos_r
  `homog:c4:copper+underfill_cuf:0.2101` (was `copper+underfill`), cowos_s `homog:cu_pillar:copper+underfill_cuf:0.1963`,
  new emib_t `homog:rdl_layer:copper+organic_build_up:0.5:plane`, ucla_si_if `homog:rdl_layer:copper+oxide:0.5:plane`
  (the old table had no rows for these, so they ran live).
- ROM-shift attribution setup: scratch copy `revbc/` with CD7 b / c reverted in homogenize.mjs (reconstructed from the
  L2 wave 1 / 3 descriptions: rdl x | y lines = column formula along the line axis, i.e. z and across Reuss; plane =
  in-plane Voigt, z Reuss, Gxy Voigt, out-of-plane shear Reuss, CTE z Schapery; xy = in-plane mean, z and all shear
  Reuss; void shear 1e-5 x axial E). Check against L8's E3 "ROM vs RVE" table (ROM computed before CD7 b): plane
  copper+organic_build_up 0.5 Ex / Ez / Gxz / Gxy 67.15 / 23.48 / 9.10 / 25.85 GPa (table-implied 67.1 / 23.5 / 9.10 /
  25.9), CTE x / z 17.34 / 18.84 ppm/K (17.34 / 18.84); xy copper+polymer 0.5 33.40 / 4.90 / 1.82 / 1.82 (33.4 / 4.90
  / 1.81 / 1.81), CTE 29.65 / 41.50 (29.65 / 41.50); x lines copper+oxide 0.5 Ez 91.15 (91.2), kz 2.75 (-98.6 %).
  The reconstruction reproduces the pre-CD7 b ROM.
- 120 mm caveat: `sims/si_interposer_peers/120mm_warpage.yaml` changed at 19:32 (ring stress-free 170 C in s2, glue
  parts, process-sequence s3), so L3's pre-18:08 120 mm numbers cannot be reproduced from the current file.
- Laminate check used in the tests (lines along x = plates normal to y, isotropic phases with equal nu): under sigma_x
  every layer has eps_z = -nu eps_x with sigma_z = sigma_y = 0, so E_x, E_z = Voigt and nu_xz = nu exactly; in-plate
  shear G_xz = Voigt, transverse shears G_xy, G_yz = Reuss, k_x, k_z parallel, k_y series; free thermal strain:
  equibiaxial in-plane layer stress E_i / (1 - nu) (eps - alpha_i dT) with zero resultant gives
  eps / dT = sum f_i E_i alpha_i / sum f_i E_i (Turner) for x and z. E_y and alpha_y are not exact in ROM.
- 2026-10-20 19:36 PDT: rebuild done: 667 requests, 625 rows (all with fp / fp_k), 42 skipped (same out-of-range
  requests as before), 207 s wall, peak RSS 0.94 GB. Diff against the 16:08 table: the 597 rows of keys present in both
  are identical (max relative difference 0 over C6, alpha6, k); 28 rows are new (the renamed / new generator keys
  above). So the old table was not stale for default constituents; it only lacked fingerprints and the new keys.
  Installed (`engine/src/homog/rve_table_defaults.json`, 302293 bytes, 49250 gzip; old file kept in the scratchpad).
- 2026-10-20 19:37 PDT: `engine/tests/homog-overrides.test.mjs` 5/5 (9.8 s). materials + homog + mech files 78/78
  (30.9 s, peak RSS 1.18 GB). Cached RVE calls now 0.10-0.24 ms (fingerprint resolves; was about 0.01 ms).
- 2026-10-20 19:38 PDT: run chain started (scratch case copies of xilinx_tsv_lid, 50mm_quarter_e2, 120 mm s2 at 30 C
  with L3's coarse120 common mesh), one run at a time under nice.
- 2026-10-20 19:38-19:50 PDT: run chain (runner/node.mjs --variants, base only, case meshes; scratch copies of the
  case files taken 19:38; peak RSS 1.45 GB; `main` = tracked engine after the fix, `prefix` = pre-fix snapshot with the
  old table, `revbc` = pre-fix snapshot with CD7 b / c reverted in ROM):

  | Run | Xilinx lid s2 b-m3 (um) | Xilinx lid von Mises b-m4 (MPa) | Xilinx no lid s3 b-m2 (um) | 50 mm E2 s2 d-m1 (um) |
  |---|---|---|---|---|
  | target | +162.56 | 115 | +335.28 | -189 |
  | L3 pre-18:08 ("ROM" column, 16:40-18:08) | -50.8 (-50.77) | 131.1 (soc_1) | +341.2 | +100.1358 |
  | L3 18:30-18:55 ROM | -51.60 | 127.35 | +340.64 | +132.90 |
  | L3 18:30-18:55 RVE (bug: default rows) | -107.06 | 133.13 | +226.72 | +219.96 |
  | main RVE (fixed) | -50.770 | 131.130 (soc_1) | +341.215 | +100.136 |
  | main ROM | -51.598 | 127.351 (soc_2) | +340.641 | +132.902 |
  | revbc ROM (CD7 b / c reverted) | -51.544 | 127.030 (soc_2) | +339.894 | +132.909 |
  | prefix RVE (old table, control) | - | - | - | +219.964 |

  Wall time main RVE / ROM: Xilinx lid 129 / 49 s, no lid 76 / 33 s, 50 mm 48 / 18 s (RVE includes the live solves for
  the overridden constituents). The 120 mm s2 at 30 C (coarse120 common mesh) ran in all three trees but the current
  s2 has no target or warpage selection (case edited 19:32), so it gives no number to compare.
- ROM-shift attribution: the fixed RVE reproduces L3's pre-18:08 numbers to the printed digits (100.136 vs 100.1358,
  -50.770 vs -50.77, 341.215 vs 341.2, 131.13 vs 131.1 MPa on soc_1), and the ROM path reproduces L3's post-18:30
  ROM column exactly. Reverting CD7 b / c moves ROM by +0.007 um (50 mm), +0.054 um (Xilinx lid), -0.75 um (no lid):
  not the cause. Conclusion: there was no ROM shift. The 16:40-18:08 runs were already RVE, computed live (the library
  default became RVE at L2 wave 6, 15:57, and runMechCase follows the library default since L8 16:03; live RVE was
  rebound to the overridden library, so overrides applied). L3's "--homog" flag (18:30) was the first true ROM run.
  At 18:08 the default table made RVE ignore constituent overrides. So the pre-18:08 column is valid RVE, and the
  18:30 RVE column is the bug. The 120 mm 30 C values (+458 -> +439) could not be checked here: the 120 mm case file
  changed at 19:32. The same explanation (live RVE before 18:08, ROM after) is the likely cause, not verified.
- 2026-10-20 19:50 PDT: fcbga_organic/substrate_warpage s2 sensitivity (runner sensitivity mode, case mesh, status
  sensitivity; scratch copy of the case). One template row (core_lowcte nu 0.11 +- 0.05), 3 runs each:

  | homog | nominal c-m3 (um) | nu 0.06 | nu 0.16 | spread |
  |---|---|---|---|---|
  | RVE (fixed) | 242.55 | 251.12 | 233.91 | -3.6 / +3.5 % |
  | ROM | 238.75 | 245.81 | 231.69 | -3.0 / +3.0 % |

  Before the fix the RVE bounds had no effect (L3 coarse: 243.83 / 243.83). Wall 27 s (RVE) / 52 s (ROM), RSS <= 0.95 GB.
- 2026-10-20 19:51-19:54 PDT: full engine suite `nice -n 10 npm test`: 271 / 271 pass, 148 s, peak RSS 1.23 GB.
- 2026-10-20 19:50-19:55 PDT: fresh-context audit (subagent, read-only). Findings and actions:
  1. HIGH: thermal-only (k) table hits also return rho and cp from the row, but fp_k hashed k only, so a rho / cp
     override (thermal transients use need [k, density, cp]) got the default rho / cp. Fixed: the k-only fingerprint
     includes constituent rho and cp; fp_k of all 625 rows recomputed from the current library (no RVE re-solve; the
     148 full fingerprints are unchanged); test added.
  2. LOW: void-matrix keys: the fingerprint used the solve temperature Tsf + 1 K at T = Tsf while the library ROM
     answers at T, and the cache key ignored `opts.use`. Fixed (void fingerprint at T; `use` in the cache key).
  3. LOW: nested homog layers in k-only stacks dropped allowExtrapolation. Fixed (ctx.ropt passed).
  4. LOW, not changed: interpolated hits are verified at the two bracketing rows only. An override equal to the
     default at both rows but different between them would pass. No override form in SPEC 11 does that within 50 K
     except a bilinear CTE step placed between the rows on a material whose default has the same values at both rows.
  5. LOW: the shared cache never evicted. Bounded at 20000 entries (cleared when full).
- 2026-10-20 19:57 PDT: after the audit fixes: materials + homog + mech + thermal + runner files 107 / 107 (31 s, peak
  RSS 1.20 GB); 50 mm E2 s2 RVE re-run +100.136 um (unchanged). The runner output format changed meanwhile (another
  lane: rows now under `rows` with an `engine` header).

## Hand-off

- Fixed: overrides of constituents (case, study, sensitivity bounds; all go through applyOverrides) now reach RVE and
  ROM homogenized keys. Table rows and cache entries are used only when the constituent fingerprint matches.
- Provenance: each RVE entry has `provenance.rve_table {status, fingerprint}`; `lib.homogStats()` gives the run
  counters (table_exact, table_interpolated, table_miss_fingerprint, table_miss_unverified, table_miss_absent,
  table_cfg_mismatch, live_full, live_k, void_rom, cache). Runners (L10 / L3 / L6 paths) do not copy these into
  results yet: request to the runner owners (call `lib.homogStats()` on the library they resolved with).
- Table: rebuild with the scratch script pattern (`buildDefaultRveTable` or a resumable loop over
  `defaultTableRequests`); rows need `fp` / `fp_k` or they are ignored.
- SPEC request (additive, section 18): RVE table rows carry `fp` (full) and `fp_k` (conduction, incl. rho / cp)
  constituent fingerprints; a row is used only when the fingerprint and the table cfg match; entries carry
  `provenance.rve_table`; `lib.homogStats()`.
- Open: table keys are matched by the literal key string, so `homog:c4:copper+underfill:...` and
  `homog:c4:copper+underfill_cuf:...` (same constituents) are separate rows; canonicalizing the key before lookup is
  now safe (the fingerprint guards the values) but not done.

## Wave 2 (coordinator, 2026-10-20 21:36 PDT; audit A3 S1 and M2)

Plan: (a) validate override values in applyOverrides (E > 0; isotropic 0 <= nu < 0.5; k, rho, cp > 0; CTE
finite; resolved stiffness admissible over the data range), error naming key and field; (b) count RVE -> ROM
fallbacks in `lib.homogStats()` so runners can surface them; (c) support `k_W_mK: {expr}` overrides for homog
constituents. Then tests, materials + homog tests, full suite.

- 2026-10-20 21:36-21:39 PDT:
  - (a) overrides.mjs `checkValue` per field (sensitivity-bound values included) and `admissible` after the library
    rebuild: when E or nu is overridden, the entry's elastic data are resolved at the low end, middle and high end of
    valid_T_C and must be admissible (isotropic E > 0, 0 <= nu < 0.5; orthotropic positive-definite compliance).
    Audit probe (copper nu 0.6 under homog:c4:copper+underfill_cuf:0.2101) now fails in applyOverrides with
    `override copper.nu = 0.6: isotropic Poisson ratio must satisfy 0 <= nu < 0.5`.
  - (b) library.mjs: each RVE failure that falls back to ROM is recorded (key, T_C, Tsf_C, error).
    `homogStats()` adds rom_fallback, rom_fallback_keys and rom_fallback_events (first 50) for this library;
    `homogStats({family: true})` covers every library that shares the attachment (applyOverrides derivatives built
    inside runners). The result labels (mech/case.mjs) are L10's.
  - (c) scalar model `expr_T` (eval.mjs; schema SCALAR_MODELS): expression in T_C / T_K (L1 params grammar),
    evaluated per call. The value must be finite, and > 0 for k, rho, cp and modulus. applyOverrides maps
    `k_W_mK: {expr}` and `{value: {expr}}` to it, and checks k > 0 at 21 temperatures over valid_T_C. So the
    expression reaches plain keys, ROM and RVE constituents, and the fingerprint (the table is bypassed because the
    k values differ). L10's adapter still strips `{expr}` before applyOverrides (thermal/case.mjs); it can now pass
    it through.
  - Tests: new `engine/tests/materials-overrides.test.mjs` (3 tests: refusals incl. a sensitivity bound at 0.52,
    edge values 0 and 0.499 accepted; expr k on copper equals Voigt kx in the RDL strip for ROM and RVE at 25 and
    125 C, refusal of a negative / unknown-variable expression; synthetic RVE failure counted per library and per
    family). materials + homog files 48/48 (9.4 s, 0.57 GB).
- 2026-10-20 21:39-21:42 PDT: full engine suite 277/277 (140 s, peak RSS 1.22 GB).
- Request to L10: print `lib.homogStats({family: true}).rom_fallback` / `rom_fallback_keys` per run, label results
  'rve (with rom fallback for N keys)', and pass `k_W_mK: {expr}` through to applyOverrides instead of
  overrideResolver (the overrideResolver path still matches only literal keys). SPEC section 11 addition (additive):
  override admissibility rules; `k_W_mK: {expr}` in applyOverrides; scalar model `expr_T`.
