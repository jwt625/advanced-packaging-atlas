---
title: Simulation engine audit A3 (fresh context, final) - changes after A2, reproductions, record truthfulness, compliance, review readiness
date: 2026-10-20
auditor: fresh-context subagent (read-only; two read-only helper subagents for em3d de-embedding and the /sim worker paths)
scope: engine/, sims/, validation/, app/src/lib/sim, app/src/routes/sim, config/sim, DevLog/ (DevLog-010, DevLog-012, lanes, audits A1/A2)
---

# Audit A3: simulation harness, final pass

Inputs read: DevLog-012 (whole), sims/SPEC.md v0.15, DevLog-010, audits A1 and A2, lane notes L3 (waves 5-6), L6
(waves 5-7, via helper), L7 (waves 5-6, via helper), L8 (waves 3-4), L9, L10, L11. `validation/RESULTS.md` audited
as of its 2026-10-20 21:19:06 PDT version (lane L4 was refreshing it). Audit clock 2026-10-20 21:20-22:00 PDT.
Engine stamp during all runs: `src 098603c37bf3 (119 files), data d354393892f2, dirty` (equal to the stamp in L3 wave 6).

Verdict: no blocking findings. 7 significant, 13 minor. The L11 fingerprint logic holds for every override form that
goes through applyOverrides. The main problems:
- silent fallbacks: an RVE failure falls back to ROM without a run-level warning, and several em3d checks are skipped
  silently;
- one browser crash (process_sequence);
- an overclaim in the EM-4 de-embedding record;
- library-level mechanics capabilities (geometric nonlinearity, rate-form sweep, viscoelasticity, cure shrinkage) that
  no case can reach, although the record reads as if they were delivered for case runs.

## 1. Runs (item 2 and item 3)

| Run | Result | Time | Peak RSS |
|---|---|---|---|
| `cd engine && nice -n 10 npm test` | 274 / 274 pass, 0 fail | 138.8 s (duration_ms 138766) | not measured |
| `cd app && pnpm check` | 836 files, 0 errors, 0 warnings | 3 s | - |
| `cd app && pnpm build` | ok (adapter-static). Warning: one client chunk of 4,644.68 kB (1,419.61 kB gzip) is above the 500 kB limit | 6 s | - |
| CLI cowos_r/thermal_rjc s1 | Rjc 0.0079144 C/W (= DevLog-012 / L10). Targets: c-m1 0.0108 miss -26.7 %, d-m12 0.00759 pass +4.3 %, d-m10 0.01082 miss -26.9 %. Tmax 99.368 C vs c-m5 104.9 (-5.3 %). Exit 2 | 3 s | 0.39 GB |
| CLI fcbga_organic/substrate_warpage s2 (rtol default 1e-7) | +242.55 um (= L10 +242.546639), 132,036 DOF, 65 iterations, relres 9.42e-8, shape dome; c-m3 sign pass | 12 s | 0.52 GB |
| CLI si_interposer_peers/xilinx_tsv_lid s3 (no lid, RVE default) | +341.21 um (= L11 +341.215), +1.8 % vs +335.28; 428,862 DOF, 65 iterations, relres 9.02e-8 | 58 s | 1.37 GB |
| CLI em/em2_cpwg_si_bridge (family em2d) | alpha at 56 GHz: e1 1.405 / e2 0.7065 / e3 0.4577 / e4 1.403 / e5 1.012 dB/mm vs 1.353 / 0.634 / 0.441 / 1.351 / 0.937, i.e. +3.8 / +11.4 / +3.8 / +3.8 / +8.0 % (= DevLog-012 EM-2); 5 / 5 pass | 20 s | 1.05 GB |

All 4 headline numbers reproduce to the printed digits. Helper runs (one each, under nice):
- em3d EM-4 probe, 19 s / 1.2 GB: L 9.270 pH, port checks ok.
- Browser-style library build, < 1 s: 42 / 42 exact table hits, 0 fingerprint misses, 0 cfg mismatches.

## 2. Findings

### Blocking

None.

### Significant

**S1. An RVE failure falls back to ROM silently at run level, and the library accepts any Poisson ratio in overrides.**
- **Where:** `engine/src/materials/library.mjs:509-516`. A throw inside the RVE resolver is replaced by the ROM entry;
  the warning goes only to `provenance.warnings` / `provenance.rve_error` of that entry.
- **Who reads it:** no runner, CLI or UI reads these fields (grep: the only references are those two lines).
- **Labelling:** the mechanics result is still labelled `homogenization: rve` (`engine/src/mech/case.mjs:227`).
- **Probe:** `engine/src/materials/overrides.mjs` (applyOverrides) accepts nu 0.5, 0.6 and -1.2 without complaint.
  - A direct part with such a value is refused later (`mech/constitutive.mjs:84`).
  - A constituent of a homog key is not. With copper nu 0.6, `homog:c4:copper+underfill_cuf:0.2101` returned a ROM
    orthotropic tensor (nuxy 0.355); the RVE error was recorded only in the entry.
- **Failure scenario:** a typo in a case override, or a sensitivity bound pushed past 0.5 by a caller other than L3's
  runner (only that runner clips at 0.499). The run then completes "rve" with a ROM layer built from an invalid
  constituent. Any other RVE numerical failure (non-positive tensor, singular cell) degrades the same way.
- **Fix:**
  - validate E > 0 and -1 < nu < 0.5 in applyOverrides;
  - copy `rve_error` fallbacks into result warnings and count them in `homogStats`;
  - label mixed runs.
- **Owner:** coordinator (materials, ex-L2/L11), with surfacing in thermal/case.mjs (L10).

**S2. process_sequence studies crash in the browser after the solve.**
- **Where:** `app/src/lib/sim/engineRun.ts:141`. `packMech` maps `r.fields.u_m` on every mechanics result. A
  process_sequence result (`engine/src/mech/case.mjs:143`) has `steps` / `_steps` and no `fields`.
- **Failure:** Compute on `si_interposer_peers/120mm_warpage` (or `_cu`), study `stiffener_attach_sequence`, which the
  UI allows. All steps solve (14-16 min on the coarse mesh), then the worker throws "Cannot read properties of
  undefined (reading 'u_m')" and the result is lost.
- **Status:** found by code reading (helper); not run in a browser.
- **Owner:** coordinator (L6 retired).

**S3. EM-4 "same-mesh" line-run de-embedding is not on the same mesh; the 103k-DOF numbers are not from the implemented code.**
- **Cause:**
  - `engine/src/em3d/run.mjs:173-175` builds the companion from the solids that cross the port face only.
  - The layered mesher takes its z-planes from all solids (`engine/src/em3d/mesh.mjs:32-35`), so the companion's
    z-planes differ. DUT: 0 6 8 11 16.5 22 27.5 33 36 38 44 um. Companion: 0 6 8 14 20 26 32 38 44 um.
  - Face impedance: 38.68 ohm (companion) vs 39.22 ohm (DUT).
- **Helper measurement:** with the DUT z-planes injected into the companion, the face impedances agree to 1e-4.

  | Quantity | Companion as coded | Companion with DUT z-planes |
  |---|---|---|
  | L | 9.270 pH (+2.7 % vs L5 9.03) | 8.913 pH (-1.3 %) |
  | C1 | 10.39 fF | 10.57 fF |

  So the reported +2.7 % agreement is partly coincidental.
- **103k-DOF values:** 9.07 pH, 10.03 fF and -31.76 dB equal the prototype entries in the L7 log. Nothing shows the
  implemented code produced them (at 59.8k DOF the prototype gave 9.19 and the code gives 9.27).
- **Affected statements:**
  - DevLog-012 "L7 wave 6 done" ("same-mesh", "9.07 (+0.4 %) at 103k");
  - `validation/RESULTS.md` EM-4 row ("9.07 pH (+0.4 %, 103k DOF)");
  - `sims/em/em4_microbump_gsg.yaml` port note.
  - SPEC 14.4 ("same mesh settings") is accurate.
- **Fix:** give the companion the DUT z-planes and in-plane constraints (or cut it from the DUT mesh); re-run 60k and
  103k; correct the record.
- **Owner:** new EM lane for the code; coordinator and L4 for the record.

**S4. em3d de-embedding and port-impedance checks can be skipped or misapplied silently.**
- **No length guard:** `deembed_um > lead_um` is not checked (`run.mjs:150-160`, `:171-175`). Example: EM-4 with
  `deembed_um: 80` extends `ip_line` through the pad and removes line the DUT does not have.
- **Method not validated:** `deembed_method` is not validated (`run.mjs:291`). A typo such as `line-run` becomes
  `port_extension`.
- **Fallback without warning:** an explicit `line_run` on an ineligible case (3+ ports, differential, fullwave)
  falls back with no warning.
- **Check skipped silently:** `port_z_check` is skipped without a warning for multi-signal ports, fullwave / te10
  ports, a signal that does not cross the face, or any em2d exception (`run.mjs:205`, `:224`, `:237`).
- **Wrong index:** `r.zref[pi]` indexes per port where zref is per terminal (`run.mjs:316`, `:318`;
  `solver.mjs:631`). This is latent: no current case has a 2-signal port before a 1-signal port.
- **Owner:** coordinator or a new EM lane.

**S5. Heat-flux arrows in the browser use case-level k, not the study's merged overrides.**
- **Where:** `app/src/lib/sim/engineRun.ts:230` calls `kOfGrid(r.grid, ad.resolve)` with the adapter built from the
  case-level overrides (line 204). The solve itself is correct: runCase rebuilds the per-study resolver
  (`thermal/case.mjs:484-495`).
- **Failure:** `info_os/theta_jc_tim`. TIM-cell flux arrows are 4.2x too low in s4 (study k 25 vs case 6.0), 5x too
  low in s5, and 1.9x too high in s3.
- **Likely also:** `ad.resolve` is not wrapped with `extrapolatingResolver`, so arrows can become NaN in
  allow_extrapolation cases. Not reproduced.
- **Owner:** coordinator.

**S6. Advanced mechanics capabilities are library-level only, but the record reads as delivered for case runs.**
- **Not reachable:** no case key, CLI flag, runner or UI path reaches these (grep over engine/src, cli.mjs, app/src):
  - `solveMechNonlinear` (`mech/nonlinear.mjs`);
  - `solveMechSweep` (`mech/sweep.mjs`, the rate-form E(T) across Tg);
  - `solveViscoelastic` (`mech/viscoelastic.mjs`).
- **Cure shrinkage:** `runMechCase` takes `cureShrinkage` with default `'off'` (`mech/case.mjs:79`) and no caller
  passes `'library'`. Only `steps[].eigenstrain` in YAML is reachable.
- **Record:**
  - DevLog-012 L8 wave 4 lists eigenstrain, the rate-form sweep and total-Lagrangian nonlinearity as delivered.
  - SPEC 18 documents the APIs but does not say that cases cannot use them.
  - RESULTS.md is consistent ("cure shrinkage not modelled").
- **Nonlinearity conclusion is an estimate, not a result:** DevLog-012 says nonlinearity "is not the cause of those
  gaps". The basis:
  - 120 mm at 25,407 DOF with in-plane faces snapped to 4 mm;
  - the panel snapped to 12 mm, a 40 x 10 strip-like layout that bends almost cylindrically;
  - no plate-bifurcation check against L5 (open).
  - L5's XB2 statement (sag/thickness 2.35 needs geometric nonlinearity) is not reconciled.
- **Fix:** state "library-level, no case key" in DevLog-012 and SPEC 18, and word the nonlinearity conclusion as an
  estimate.
- **Owner:** coordinator.

**S7. RESULTS.md and DevLog-012 contain statements the runs contradict or overstate.** Owner: L4 (ledger) and
coordinator (DevLog). Each row below names the source of the contradiction.

| Statement | Problem | Source |
|---|---|---|
| RESULTS.md cowos_r row: "ectc51687.2025.00085-c-m7, Rjc 0.0109 C/W, -27 %" | The case targets c-m1 = 0.0108 (CLI -26.7 %) and d-m10 = 0.01082 (-26.9 %). c-m7 (0.0109, Table 4) is not a target of the case. DevLog-012 uses 0.0108 | CLI run above; data/metrics.csv:28 |
| RESULTS.md Tj row: "99.37 C (L1 wave 2 generator state), rom" | The current engine gives 99.368 C with conduction-only RVE; the row can be refreshed | CLI run above |
| RESULTS.md / DevLog-012 EM-4 "9.07 pH (+0.4 %, 103k DOF)" | Not produced by the implemented code (S3) | helper |
| RESULTS.md Xilinx no-lid "pass" | DevLog-012 (L8) calls this "a plausibility check only: nu, build-up and homogenization are template/ROM inputs". The ledger drops that qualifier; a tier-C (paper FEM) match with template inputs is a plausibility match, not a validation | DevLog-012 L8 entry |
| DevLog-012 M1 final "Browser = CLI to 1.9e-7 um ... table vs live identical to 11 digits", peak 1.52 GB | Measured at rtol 1e-10, before L10 wave 3 made 1e-7 the package default. At 1e-7 the Node peak for cowos_l rose 1.36 -> 1.58 GB (L10, unexplained), so the browser peak at the current default is probably above the recorded 1.52 GB (not measured) | L10 wave 3 |

### Minor

| # | Finding | file:line / evidence | Owner |
|---|---|---|---|
| M1 | The RVE table use is invisible. `lib.homogStats()` is read by no CLI, runner or UI path. The UI label "RVE table" means only "table loaded" (`app/src/lib/sim/engine.ts:76`, `engineRun.ts:128`, `:229`), and libraries derived through applyOverrides keep separate counters. The L11 hand-off request is still open | grep homogStats: library.mjs:621 only | coordinator / L10 |
| M2 | `k_W_mK: {expr}` overrides and the k-only overrideResolver match the literal key string (`thermal/case.mjs:232-253`, `:638-645`, `:671-672`). They never reach constituents of homog keys (live or table) and miss when the override names a template key whose part resolves to the library key. `unusedOverrideKeys` counts homog constituents as used, so no warning appears. Latent: no case uses `expr` today. Not a fingerprint bypass: table and live both ignore it | code reading | L10 / coordinator |
| M3 | Interpolated table hits are verified only at the two bracketing rows (L11 audit item 4, accepted). Keep the statement in SPEC 18.1 | resolver.mjs:171-184 | none (documented) |
| M4 | The engine version stamp does not hash generator and target inputs passed at run time: `app/static/data/package3d.json` (passed to `generate` as `data`) and `data/metrics.csv` (expected values). `dirty` is always true while engine/ is untracked (1 status entry), so the flag carries no information until the first commit | cli.mjs:28-44, 92-93 | L10 / coordinator |
| M5 | SPEC gaps. Section 17 lacks the L10 wave 2-3 contract: `physics.mechanics.rtol` / `max_iter`, `--mech-rtol`, the package 1e-7 / gate 1e-10 rule, the `convergence` record with the 1e-6 accept rule, `engine_version`, and the per-part-Tsf warning. Section 14.2 still says "not yet enforced in code" (enforced since L7 wave 5). Sections are out of numeric order (14.1-14.4 after 15/16) | sims/SPEC.md:342, 379-390 | coordinator |
| M6 | DevLog-012 is stale in places. Frontmatter title "T0 and wave-1 lanes" and status. No current-state summary or TODO checklist (project DevLog convention). "Full engine suite 260/260" (L10) is superseded by 274/274. DevLog-010 TODO still shows "[ ] T0, then D1/D2/D3/R/U1/E5" and "7 manual downloads" (`config/sim/manual_downloads.md` now lists 8). DevLog-010 asked for two audits each after E2 and M1; three engine audits ran in total | DevLog-012:1-7; DevLog-010:200-201 | coordinator |
| M7 | Impossible timestamp: L3 wave 6 "Tests 2026-10-20 21:40 PDT" is later than the file's mtime (21:16:26) and the audit clock (21:20) | DevLog/lanes/L3-families.md:462 | coordinator (L3) |
| M8 | The 120 mm SUS430 miss suspect list ("ring stiffness and coupling, substrate CTE vs SUS430") omits a suspect: Table IV gives one E per polymer (EMC 13 GPa, CUF 6.6 GPa) applied across Tg 160/166 C up to 260 C. L9 named this model-form class (below-Tg modulus above Tg; total secant form) as the 50 mm root cause, and L8 showed the total form off by > 5 % across Tg. The miss may not be attributable without it. These are the paper's own FEM inputs, so this is a note on the suspect list, not a fit request | sims/si_interposer_peers/120mm_warpage.yaml materials.overrides; L3 wave 6 | coordinator |
| M9 | em3d minor items (helper): Touchstone header always says "port extension" (`run.mjs:359`); em4 yaml assumptions text stale (`sims/em/em4_microbump_gsg.yaml:62`); companion warnings dropped (`run.mjs:194-200`); companion drops all PML (`:185`); `clipSolidAlong` uses z bounds for every axis (`:151`); S->Z->ABCD loses precision below about 1 MHz (sweeps start at 1 GHz; use the solver's Z); the "converged" 2D reference is one fixed P2 mesh; WASM without SIMD falls back silently (`em2d/ldlt-select.mjs:14`). L7's "two 20k-DOF companions, ~3 s once per sweep" is wrong: companions solve at every frequency (`run.mjs:304-307`). The UI label "S (port modal impedance)" on raw `S_port_ref` hides a reference-plane shift (`app/src/lib/sim/emResults.ts:42`) | helper | new EM lane |
| M10 | UI minor items (helper). Silent fallback to the fixture "UI chain" when package3d.json fails to load (`engineRun.ts:196`, `:236`); it ignores overrides, allow_extrapolation and targets. Target data race: `metrics: this.simTargets` is null if Compute runs before `sim_targets.json` loads (`workbench.svelte.ts:560`). Stale comments (`engineRun.ts:122`, `:184-188`). Mechanics-field notes leak into thermo_elastic warnings (`:217`, `:222`) | helper | coordinator |
| M11 | Build: one client chunk of 4.64 MB (1.42 MB gzip). Not traced to a module here (candidates: engine bundle with the 302 KB RVE table, three.js, package3d data) | build log | coordinator |
| M12 | Licence headers: 81 of 247 code files in the new paths lack a `License:` / SPDX / GPL / "Ported from" line in the first 40 lines (list in section 4). `engine/src/em2d/_port/robust-predicates.mjs` carries its Unlicense notice and is fine | grep | coordinator (SPDX pass) |
| M13 | A2 M10 still open: Xilinx lidded GMG 281 iterations (L1 M10/M10b negative result recorded honestly) | L1 waves 4-5 | open performance item |

## 3. Item 1 detail: changes after A2

### L11 RVE fingerprint and table

What the fingerprint covers (`engine/src/homog/resolver.mjs:121-169`):
- per constituent: the resolved elastic block, including any `orientation` the material entry carries;
- the CTE rebased to (Tsf, T_eval), plus k, rho and cp at T_eval (T_eval = Tsf + 1 K at T = Tsf, as the solve);
- k-only rows: k, rho and cp (the L11 audit HIGH fix);
- stacks: the layer list and thicknesses, nested homog layers by their own fingerprint, and the stackConstituents mode;
- void matrix: the inclusion only, at T.

Lookup and cache:
- A row is used only when the stored fingerprint equals the current one at that row's (T, Tsf) (`:171-184`).
- A table built with other (n, element, h_over_p, richardson) is not used (`:108-112`).
- Cache keys carry fp, allowExtrapolation and `use` (`:193`).
- A fingerprint that cannot be computed gives null: no table use, no cache.

Bypass candidates checked:

| Candidate | Result |
|---|---|
| Case, study and sensitivity-bound overrides | All go through applyOverrides. It builds a new library and re-attaches the resolver on that library's ROM view (`overrides.mjs:133-135`, `library.mjs:490-498`), so the fingerprint sees the overridden constituents. Study level: `studyOverrides` merged, then `mechLibWithOptions` / `libraryAdapter` (`thermal/case.mjs:484-495`, `:682-706`). Not bypassed |
| Per-part stress-free temperature | Full rows are keyed by Tsf (`indexTable`, `tableLookup`); another Tsf finds no row and is computed live. Not bypassed |
| Part-level orientation | Applied after homogenization to the homogenized tensor (`mech/materials.mjs:57`, `:106`), so it is not an RVE input. A Si constituent inside an RVE always uses the library default orientation, live or table alike. Consistent, not bypassed (and not configurable per part: by design) |
| Extrapolated values | `allowExtrapolation` is in the fingerprint's resolve options and the cache key. Rows are built in range, so an interpolated hit cannot straddle a range end. Not bypassed |
| Property alternatives (`opts.use`) | Not forwarded to RVE constituents, and no case runner sets `use`. Not reachable |
| `k_W_mK: {expr}` overrides | Bypass the homogenization entirely, for ROM and RVE alike (M2), not the fingerprint |
| Interpolated hits | Verified at the bracketing rows only (M3, documented) |

### L10 case runner

- **allow_extrapolation:** the effective value (study over case, `false` disables) is kept in the runMechCase case
  copy (`thermal/case.mjs:788-795`), and the resolve / rebase wrappers form a second layer (`:682-706`). Correct.
- **Unit conversion:** one helper, `expectedFor`, on every path. Correct.
- **rtol:** `mechSolveOf` sets package 1e-7 / gate 1e-10. The 3-line edit in `mech/case.mjs` is confirmed: lines
  79-80 destructure `rtol` / `maxIter`, line 217 forwards them; nothing else in src/mech uses them. Forwarding is
  detected by a regex on the function source, which survives minification (helper checked the production chunk).
  process_sequence and the rate-form sweep use direct solves, so no tolerance applies there.
- **Engine stamp:** printed on stderr and stdout and in JSON (M4 for its coverage).

### L8 waves 3-4

- **process_sequence material switch:**
  - `steps[].materials.map` creates a new activation group, stress-free at the step's Tsf, with the previous stress
    discarded (`mech/process.mjs:88-140`).
  - It resolves through the same overridden library (`mech/case.mjs:139-141`).
  - Gate within 3e-3 of CLT superposition (test passes in the suite).
  - process_sequence ignores `mesh.thin` and rtol (direct solves), so a 120 mm case-mesh sequence (1.87e6 DOF) is not
    runnable; recorded by L3.
- **Eigenstrain, rate-form sweep, nonlinear, viscoelastic:** tests pass, but no case can reach them (S6).

### L7 waves 5-6

- **ABCD algebra:** `cascade.mjs:86-110` is correct (helper: synthetic lossy leads recovered to 1e-13).
- **Problems:** the companion mesh mismatch (S3) and the guards and silent skips (S4).

### L6 waves 5-7

- **Routing:** every thermal and mechanics path goes through `runCaseAll` with CLI-equivalent deps. No direct
  runMechCase / solveMech call remains in app/src.
- **RVE wiring:** the browser loads `engine/src/homog/rve_table_defaults.json` directly (625 rows, fingerprints
  present) with the default resolver cfg, so there is no cfg mismatch. No stale copy exists in app/static.
- **Overrides:** applied once on both the thermal and mechanics paths.
- **Problems:** S2, S5, M1, M10.

### L3

- **Runner variants:** go through runCaseAll and are stamped `{engine, homogenization}`.
- **120 mm stiffener_attach_sequence:** package 170 -> 130 C, then ring + glue stress-free at 130 C, then ramp
  points. This matches the paper's sequence (p.3 Sec. II.E) as transcribed.
- **Cu-ring "pass":** the 30 C point is a W shape and the crossing comes from linear interpolation; RESULTS.md says
  both.
- **Labels:** ROM, coarse mesh and the engine stamp are stated. The stamp equals the current tree.

### A1 / A2 fixes

- **A2 S1:** mechanics sensitivity exists (runner and CLI addCteBounds).
- **A2 S2:** asymmetric bounds and the nu clip exist in L3's runner only; the library still accepts any nu (S1).
- **A2 S3:** the text was corrected.
- **A2 S4:** singular targets become `indeterminate` (`thermal/case.mjs` runCaseAll target loop; the Xilinx von Mises
  row is indeterminate in RESULTS.md).
- **A2 M11 (licence):** still open (M12).

## 4. Item 5: rule compliance

Scope:
- the 419 untracked files that would be committed in engine/, sims/, validation/ (`.venv` ignored),
  app/src/lib/sim, app/src/routes/sim, config/sim, DevLog/, app/static/data/sim_targets.json,
  scripts/build_sim_targets.py and LICENSE;
- plus the modified app/src/routes/+layout.svelte.

| Check | Result |
|---|---|
| Emoji (pictographs, dingbats, arrows, variation selector) | 0 hits |
| Absolute local paths (`/Users/`, `/private/`, `/home/`) | 0, apart from three `cadence.com/.../home/...` URLs in DevLog/research |
| `~/` | Only the DevLog-012 rule text ("Never mention or use any file in ~/Downloads") and audit compliance lines |
| Private-context names (employer, startup, diary) | 0 company references; all "lambda" hits are math symbols |
| ISO dates | Non-ISO dates appear only in the GPL licence text (29 June 2007, 28 March 2007). No relative-time words in YAML / JSON / CSV |
| Licence lines | 81 code files lack one (below) |

Code files without a `License:` / SPDX / GPL / "Ported from" line in the first 40 lines (81 of 247):
- app/src/lib/sim: EmPages.svelte, EmSection.svelte, MaterialsTable.svelte, ParamsTable.svelte, SmithChart.svelte,
  cases.ts, channel.ts, defaults.ts, emResults.ts, engine.ts, engineRun.ts, linkText.ts, provenance.ts, results.ts,
  graphics/ArrowLayer.ts, graphics/FieldLayer.ts
- engine/src: families/tools/transcribe.mjs, runner/node.mjs
- engine/tests: cli, em2d-em0, em2d-em1, em2d-em2, em2d-mtl, em2d-wasm, em3d-em4, em3d-em5, em3d-ports, em3d, grid,
  la-block, la-halfmg, la-mg, la-wasm, thermal-tierA, thermal-verify, thermal-wave2 (`*.test.mjs`)
- validation/expected: check_db_targets.py, derived_checks.py, em0.py, implied_tsf.py, tier_a.py, tier_b.py
- validation/reference/apref: __init__, boxcase, compare, convergence, curved, em4, em5a, em5a_cascade, em_ngs, fem,
  l4, materials, record, rf (`.py`)
- validation/reference/engine_xcheck: run_engine.mjs, run_engine_mech.mjs, xcheck_mech.py, xcheck_thermal.py
- validation/reference: run.sh
- validation/reference/scripts: common, ref_em4, ref_em4_diag, ref_em4_diag2, ref_em4_diag3, ref_em4_static, ref_em5a,
  ref_em5a_bracket, ref_em_gates, ref_mech_a, ref_nafems_le10, ref_nafems_le11, ref_nafems_t1, ref_thermal_a,
  ref_tsv, ref_xb, strip_results, summarize (`.py`)
- validation/reference/tests: test_fem.py, test_rf.py

The helper also lists `app/src/lib/sim/graphics/BoxViewer.ts` (it may carry a port header beyond line 40 that my
check accepted). Check it in the SPDX pass.

## 5. Item 4: truthfulness of the record

Consistent with the lane notes and with these reproductions:
- cowos_r Rjc 0.0079144 and the zero-contact-model comparison (+4.3 %);
- InFO gap and k_eff labelled as fitted calibration (after the A2 correction);
- the L9 root-cause table;
- the L11 "no ROM shift" attribution (its run table reproduces L3's pre-18:08 column to the printed digits);
- fcbga +242.55 and Xilinx no-lid +341.2;
- EM-2 percentages;
- the 120 mm Cu / SUS430 results with W-shape caveats;
- tier-H rules: single-source rules are labelled `strength: weak` (13 of 23 weak; 1-source rules H02, H07-H09, H11,
  H15, H16, H18, H22 are all weak), so no single-paper rule is presented as a trend;
- calibration variants are labelled calibration in both DevLog-012 and RESULTS.md.

Not consistent: S3, S6 and S7 (above), and M6 / M7.

## 6. Item 6: readiness for Wentao's review

Top 5 to look at first:
1. **`validation/RESULTS.md`, read with the DevLog-012 L9 root-cause table.** What the engine can claim today: Xilinx
   no-lid +1.8 % (plausibility, template inputs), CoWoS-R +4.3 % vs the paper's zero-contact model, Cu-ring trend,
   EM-1 cannonball and EM-2. Most measured misses trace to undisclosed inputs (lid/TIM, Tsf, stack asymmetry, carrier,
   cure shrinkage).
2. **The CD1-CD7 table** (DevLog-012 "Coordinator decisions pending Wentao review"). CD1 (template nu / k with
   sensitivity) and CD7 (RVE default) shape every mechanics number.
3. **M1 in the browser: `/sim`, `cowos_l/warpage_rt_ht`.** -250.7 / +187.6 um vs +64 / -148, gated sign-agnostically,
   with the L3 wave-5 spread table (Tsf 90 C, TIM E x0.1 / x10, Al lid). The sign is set by template inputs. Memory
   peaked at 1.52 GB at rtol 1e-10; the current 1e-7 default was not re-measured in the browser.
4. **120 mm `stiffener_attach_sequence` (SUS430 miss vs Cu pass).** Decide whether the next investment is E(T) /
   viscoelastic polymers in sequences (S6, M8), a case-mesh sequence (needs an iterative process-step solver), or
   ring-coupling inputs.
5. **EM-4 and EM-5a.** The de-embedding correction (S3) before relying on browser 3D L / C, and the Palace decision for
   the full 12-TSV EM-5a model (L5 NGSolve stands as the reference).

Open decisions:

| Decision | State | Needed from Wentao |
|---|---|---|
| CD1-CD7 | Implemented as coordinator defaults, each with a "revisit if" | Accept, or per-case overrides (CD1, CD4 silicone nu, CD5 TIM CTE) |
| Palace build from source | Not started; L5 estimate: hours, 1-2 GB build tree, unverified | Go / no-go |
| Viscoelastic data | E8 Prony / WLF solver skeleton passes synthetic gates. The corpus has no Prony / WLF table. `config/sim/manual_downloads.md` lists 8 items, one with EMC Prony data (doi 10.1016/j.ijadhadh.2011.10.007). No underfill Prony source identified (L8 wave 3 left this "to be identified") | Download the 8 items; whether to commission an underfill Prony source search |
| Geometric nonlinearity scope | Library-level only. q2s, direct tangent solves <= 1e5 DOF; the q2s p-MG fails on the tangent. Ratios +2.4 % (120 mm) / +3.8 % (panel) on snapped geometry; bifurcation check open | Whether to wire it to a case key and run a plate-bifurcation check vs L5 |
| Browser memory budget 1.5 GB | M1 1.52 GB (marginally over) at rtol 1e-10; Node +0.22 GB at 1e-7 (unexplained) | Accept about 1.6 GB, or ask for a memory pass |
| Also pending | WASM stays opt-in (G1 gate 1.37-1.43x end to end; EM front update 1.82x). Licence SPDX pass (M12). Commit plan for about 419 new files (engine/ untracked, so `dirty` is meaningless until committed) | Confirm |

## 7. Suggested owners (summary)

- **Coordinator:** S1 (with L10), S2, S5, S6, S7 record fixes (with L4), M1, M4-M8, M10-M12.
- **New EM lane:** S3 code, S4, M9.
- **L10:** S1 surfacing, M1, M2, M4.
- **L4:** S7 ledger rows (cowos_r metric id, Tj refresh, Xilinx qualifier, EM-4).
- Lanes L1, L2, L6, L8 and L9 are retired.
