# Lane L10: CLI and case runner (takes over from L1, retired)

Date: 2026-10-20. Owner paths: `engine/cli.mjs`, `engine/src/thermal/*`, `engine/tests/cli*.test.mjs`,
`engine/tests/thermal*.test.mjs`, this file. Reads: DevLog-012 (shared rules binding), SPEC v0.12, L1 / L3 / L8 notes.
Rules: no git writes, no retrieval, no emoji, ISO dates, nice -n 10, < 4 GB RSS.

## Plan (2026-10-20 17:39 PDT, before implementation)

1. allow_extrapolation through runCaseAll. Reproduced first: fcbga_organic/substrate_warpage_bare s2h (case-level
   list) now runs through the CLI (+1.22 / +1.15 um, equal to L3's direct runMechCase values), so L1's 15:51 rebase
   wrapper fixed the case-level form. Remaining gap: runCaseAll deletes the key from the case copy it hands to
   runMechCase, so runMechCase's own `resolveOpts` (passed to solveMech, process sequences, the thin-layer RVE
   resolver) never receives it, and a study-level value reaches only the wrapper. Fix: keep the effective value
   (study level over case level) in the copy (`materials.allow_extrapolation`), so runMechCase handles it natively
   and the wrapper stays as a second layer; same for process_sequence and temperature.from. Test with a
   range-limited stub library whose rebase and resolve throw without the option, real L8 runMechCase.
2. DB expected-value units, one helper for every path: `expectedFor(t, metricLookup)` (exported from
   thermal/case.mjs, browser-safe) used by runCase and runCaseAll. Quantity units from the suffix: `_nm`, `_um`, `_mm`,
   `_Pa`, `_MPa`, `_GPa`, `_W`, `_C_W` (thermal resistance: C/W = K/W, temperature differences), absolute `_C`
   (K -> C offset). DB units: C and degC treated as K for differences inside thermal resistances. Dimension mismatch
   (e.g. C-mm2/W against Rjc_C_W) -> expected null, status unchecked, reason `unit mismatch`, never compared.
   Tests: mm / um / nm, MPa / GPa / Pa, C/W / K/W / mK/W, K -> C, mismatch, through runCase with a JSON lookup
   (sim_targets.json form) and runCaseAll.
3. Thin-layer merge case key: `mesh.thin: true | {max_aspect}` (parseCase), passed as runMechCase dep `thin`
   (L8 merge.mjs, default max_aspect 500); mechanics only (thermal grids unchanged; buildGrid ignores the key).
   Test: parse accepts / rejects shapes; runCaseAll passes it to an injected runMechCase.
4. Study-level material overrides `studies[].materials.overrides`, merged over the case level per key and field
   (study wins; keys compared by library canonical key when the library provides canonicalKey), applied through L2
   applyOverrides: thermal studies through libraryAdapter on deps.lib, mechanics through mechLibWithOptions. Needs
   deps.lib + deps.applyOverrides when the injected resolver already holds the case overrides (CLI, runner); clear
   error otherwise. Test: thermal stub library (k changes per study), mechanics (overrides reach runMechCase's lib).
5. Status `sensitivity`: L2 OVERRIDE_STATUSES lists it (overrides.mjs, wave 8). CLI addCteBounds uses it for the
   CD5 CTE bound runs (fallback user when the library does not list it); runs whose overrides carry status
   sensitivity are reported (`sensitivity_bound` list in the result; summary line; targets marked).
6. Full engine suite once at the end: `cd engine && nice -n 10 npm test`.

## Progress log
- 2026-10-20 17:45 PDT: all six items implemented (engine/src/thermal/case.mjs, engine/cli.mjs) with
  engine/tests/cli-l10.test.mjs (8 tests, 8/8; cli + thermal lane files 33/33 unchanged).
  1. runCaseAll builds the runMechCase case copy with `mechCopy`: overrides pre-applied in the wrapped library (case +
     study level), `materials.allow_extrapolation` kept at the effective value (`allowOf`: study over case; study
     `false` switches it off), study materials blocks folded in; uniform-T, process_sequence and temperature.from
     (solveMech `resolveOpts`) paths. Tests use the real L2 library (abf_gl ends at 240 C) and the real runMechCase:
     no permission -> per-temperature error; case list / study true -> runs, extrapolation warning, same warpage;
     sibling study without permission still fails.
  2. `expectedFor(t, metricLookup)` is the one expected-value rule (runCase, runCaseAll; exported for the UI and
     runners). `expectedInQuantityUnit` suffixes `_C_W`/`_K_W` (C/W = K/W; Celsius in a difference unit read as K),
     `_nm`, `_um`, `_mm`, `_GPa`, `_MPa`, `_Pa`, `_W`, absolute `_C` (K -> C offset). Case `value` + `unit` converted the
     same way. Unknown or other-dimension units -> `expected_unit_mismatch`, expected null, status unchecked (never
     compared). Summary prints the conversion. Scan of every sims/ target against data/metrics.csv: 0 conversions,
     0 mismatches today (all DB units already match; fan-out a-m9 carries a case value 700 um since L3 wave 5).
  3. `mesh.thin: true | {max_aspect}` (parseCase, `thinOf`) -> runMechCase dep `thin` for uniform-T studies; noted as
     not applied for temperature.from (thermal grid) and process_sequence. Real merge test: two 1 um films merged,
     warpage within 2 % of the unmerged grid.
  4. `studies[].materials.overrides` merged per material and field over the case level (`studyOverrides`; names
     compared by lib.canonicalKey). Thermal: rebuilt resolver through libraryAdapter + L2 applyOverrides (needs
     deps.lib + deps.applyOverrides when the injected resolver holds the case overrides; CaseError otherwise), or
     overrideResolver on the k-only path. Mechanics: mechLibWithOptions takes the merged set. Test: study k equals the
     same k at case level to 1e-9; study E equals case E (max |u| to 1e-15).
  5. L2 OVERRIDE_STATUSES lists `sensitivity` (overrides.mjs). CLI --sensitivity hands boundStatus to L3
     runSensitivity and uses it for the CD5 CTE bounds (user if the library lacks it). Runs carrying status
     sensitivity overrides report `sensitivity_bound` (summary header line, targets `[sensitivity bound]`).
  6. Found while testing: process_sequence studies were collected as thermal studies by runCaseAll (runCase then
     treated them as transient); now mechanics only, runCase lists them as skipped.
  Real CLI regression (nice): fcbga bare s2h +1.1457 / +1.2173 um (unchanged; case-level list), cowos_r s1 Rjc
  0.0079144 C/W (unchanged).
- 2026-10-20 17:47-17:50 PDT: full engine suite `nice -n 10 npm test`: 260/260 pass, 0 fail, duration 209.4 s
  (wall 209.5 s), max RSS 1.20 GB (load 4.4-4.7).

## Contract notes (additive; for the coordinator / SPEC)

- Case keys: `mesh.thin` (true | {max_aspect}); `studies[].materials.overrides` (merged over the case level);
  `materials.allow_extrapolation` may be `false` at study level (off); both levels validated (true | false | [keys]).
- Target key `unit` now converts a case `value`; DB conversions as above; new target fields `expected_unit_mismatch`,
  `sensitivity_bound`; result field `sensitivity_bound`; expected_source `db:<table>` (was `db:metrics.csv` /
  `db:metrics`).
- Exports from thermal/case.mjs: expectedFor, thinOf, allowOf, studyOverrides, sensitivityBound.
- Paths that call runMechCase directly (UI engineRun.ts runMech, L3 runner/variants) do not see study-level
  overrides, study-level allow_extrapolation, mesh.thin or the unit conversion; they should route through runCaseAll
  or call expectedFor / thinOf / studyOverrides (L6, L3, L8). The UI thermal runCase passes no deps.lib, so a study
  with its own overrides errors there until L6 passes lib + applyOverrides.
- runMechCase rejects case-level `allow_extrapolation: false` (L8 validation); runCaseAll never passes false.

# Wave 2 (coordinator, 2026-10-20; from L9 wave 2)

## Plan (2026-10-20 19:31 PDT, before implementation)

1. Mechanics tolerance: case key `physics.mechanics.rtol` (and `max_iter`), CLI `--mech-rtol`; default from the
   study's targets: any tier A / B target -> 1e-10 (gates), else 1e-7 (package cases; L9 W2.2: warpage identical to
   0.01 um from relres 1.5e-6). Passed to solveMech (temperature.from path: solveMech takes rtol / maxIter) and as
   runMechCase deps `rtol` / `maxIter`. runMechCase (L8, mech/case.mjs) does not forward rtol to solveMech today:
   request to L8 (one line in each solveMech / solveProcessSequence call); until then uniform-T studies solve at
   1e-10. Every result reports relres, iterations and the requested rtol. Not converged with relres < 1e-6: warning
   (accepted); relres >= 1e-6: study error (exit 1), its targets unchecked.
2. Warning for a single-step thermo_elastic study whose effective stress_free_C.per_part differs from the default
   (constant eigenstrain, L9 W2.1; suggest process_sequence).
3. Engine version stamp: `engineVersion()` in cli.mjs (Node): sha256 over engine/src/**/*.{mjs,json} and cli.mjs
   (sorted paths + contents), a separate hash of engine/data/**, and dirty = `git status --porcelain -- .` in
   engine/ (read-only) non-empty. Stamped into every CLI output (JSON field `engine_version`, summary first line), all
   families and --sensitivity; exported for L3's runner (runner/node.mjs already imports cli.mjs).
4. Tests for each; suite re-run.

## Wave 2 progress log

- 2026-10-20 19:33 PDT: implemented (engine/src/thermal/case.mjs, engine/cli.mjs); tests appended to
  engine/tests/cli-l10.test.mjs (12/12; cli.test.mjs 13/13 unchanged).
  1. `MECH_RTOL` {package 1e-7, gate 1e-10, accept 1e-6}; `mechSolveOf(c, s, override)`: CLI `--mech-rtol`, else
     `physics.mechanics.rtol` / `max_iter` (validated), else tier A / B target in the study -> 1e-10, else 1e-7.
     Passed to solveMech on temperature.from studies (now also with deps.mechSolver) and as runMechCase deps
     `rtol` / `maxIter`. runMechCase (L8) does not forward them to solveMech (mech/case.mjs has no rtol): detected
     (function source, or `mech.forwardsRtol`), a note is printed, and the convergence record states the solver
     default 1e-10 with the requested value; request to L8 below. `mechConvergence` attaches `convergence`
     {solver, relres, iterations, rtol_requested, rtol_source, converged, accepted} to every iterative result; the
     summary prints relres per study line. Stopped above rtol with relres < 1e-6: accepted, the solver's "not
     converged" warning replaced by an explicit one; relres >= 1e-6: study error (exit 1), its targets unchecked.
     Real test: tiny plate at 0.1 mm cells, PCG + GMG, rtol 1e-7 reached; max_iter 1 -> relres >= 1e-6 -> error.
  2. `perPartTsfWarning`: effective stress_free_C (merged as runMechCase does) with per_part != default in a
     single-step thermo_elastic study -> warning on each result and in notes (process_sequence suggested).
  3. `engineVersion(root)` / `engineVersionLine` in cli.mjs: sha256 (12 hex) over sorted paths + contents of
     engine/src (*.mjs, *.json) and cli.mjs, a separate hash of engine/data, dirty from read-only
     `git status --porcelain -- .` in engine/ (null outside a work tree). Printed to stderr at start and as the
     first stdout line; JSON field `engine_version` for every family, em2d / em3d and --sensitivity; tests may
     inject deps.engineVersion. Current tree: dirty (engine/ is untracked, 1 status entry).
  Real CLI: fcbga_organic s2 +242.55 um (= L3 wave 5), 113 iterations, relres 9.98e-11 (rtol 1e-10, not forwarded).
- 2026-10-20 19:35-19:37 PDT: suite 267/270: 3 failures in tests/homog-overrides.test.mjs (lane L11, file saved
  19:34:45, resolver.mjs 19:32, in-flight); the file passes alone 5/5 at 19:37.
- 2026-10-20 19:38-19:40 PDT: full suite `nice -n 10 npm test`: 270/270 pass, 152.6 s, max RSS 1.20 GB.

## Wave 2 contract notes

- Case keys `physics.mechanics.rtol`, `physics.mechanics.max_iter`; CLI `--mech-rtol`; result field `convergence`;
  errors entries may carry `unconverged: true`; JSON field `engine_version`.
- Request to L8: in runMechCase, forward `deps.rtol` / `deps.maxIter` to solveMech (uniform-T loop) and
  solveProcessSequence; once the source names rtol the runner uses the requested tolerance automatically.
- Request to L3: runner/node.mjs stamps its outputs with `engineVersion()` from cli.mjs (already imported there).

# Wave 3 (coordinator, 2026-10-20): cross-lane edit in engine/src/mech/case.mjs (L8 retired)

- 2026-10-20 19:41 PDT, CROSS-LANE CHANGE (authorized by the coordinator; owner L8 retired): engine/src/mech/case.mjs
  runMechCase takes deps `rtol` and `maxIter` (default null = solveMech defaults) and passes them to solveMech in the
  uniform-temperature loop. Nothing else in src/mech changed (diff: 2 lines in the deps destructuring, 1 line in the
  solveMech call). solveProcessSequence and solveMechSweep (rate form) use direct solves and take no tolerance, so
  nothing was forwarded there. runCaseAll detects the forwarding, so the "not forwarded" note no longer appears.
  Test (cli-l10, 13/13): runMechCase at rtol 1e-3 stops above 1e-10 with fewer iterations than the default;
  maxIter 1 gives 1 iteration; through runCaseAll the record shows the requested rtol and the same iterations.
- 2026-10-20 19:42-19:49 PDT, real runs (cli.mjs --json, nice -n 10, load 4.7-5.4, one at a time):

  | Case / study (25 C) | DOF | rtol | Iterations | Solve s | Total s | Peak RSS | relres | Warpage um |
  |---|---|---|---|---|---|---|---|---|
  | fcbga_organic s2 (top:sr_top) | 132,036 | 1e-10 | 113 | 7.8 | 16.2 | 0.51 GB | 9.98e-11 | +242.546494 |
  | fcbga_organic s2 | 132,036 | 1e-7 (package default) | 65 | 4.6 | 13.1 | 0.53 GB | 9.42e-8 | +242.546639 |
  | cowos_l s2 (bottom:sbt_sr_b) | 1,081,080 | 1e-10 | 208 | 131.1 | 197.9 | 1.36 GB | 9.83e-11 | -250.744963 |
  | cowos_l s2 | 1,081,080 | 1e-7 (package default) | 83 | 54.1 | 119.8 | 1.58 GB | 9.94e-8 | -250.745118 |

  Warpage change 1e-10 -> 1e-7: +1.5e-4 um (fcbga), -1.5e-4 um (cowos_l), well below 0.01 um (L9). Time saved:
  solve -41 % / -59 %, total -19 % / -39 %.
- 2026-10-20 19:49-19:51 PDT: full suite `nice -n 10 npm test`: 271/271 pass, 157.6 s, max RSS 1.22 GB.

# Wave 4 (coordinator, 2026-10-20; audit A3 S6, S1 surfacing, M1, M4)

## Plan (2026-10-20 21:38 PDT, before implementation)

1. `physics.mechanics.nonlinear` / study `nonlinear`: true | {max_dof, steps, tol}; dispatched inside runMechCase
   (additive branch, cross-lane) to solveMechNonlinear (total Lagrangian, q2s forced). DOF limit 1e5 (the direct-solve
   limit of nonlinear.mjs 'auto' and SPEC 18); above it a CaseError naming the DOF and the fix (coarser mesh or an
   explicit max_dof). Not combined with cure shrinkage / eigenstrain (error). Result in the solveMech shape.
2. Study type `thermo_elastic_sweep` {temperature: {path_C: [...]}, dT_max, stress_free_C, supports, element}:
   runMechCase branch to solveMechSweep (rate form, direct solves; guard at solveMech's AUTO_DIRECT_MAX_DOF 1e5 with
   max_dof override); one result per path temperature; runCaseAll dispatches the study whole.
3. `materials.cure_shrinkage: off | library | both` (default off, stated in every mechanics result): passed as
   runMechCase cureShrinkage; both = off and library runs, targets evaluated on off with `got_cure_shrinkage`
   (library value or bracket) attached. Not applied to temperature.from / process_sequence studies (noted).
4. Viscoelastic: parseCase refuses study types matching visco* and any `viscoelastic` key with "no sourced Prony / WLF
   data" (library function only).
5. S1 / M1: per-study homogenization record: lib.homogStats() deltas (table exact / interpolated, fingerprint misses,
   live solves, cache) plus RVE -> ROM fallbacks collected from resolve provenance (rve_error); label 'rve' only
   without fallbacks, else 'rve+rom_fallback'; printed in summaries.
6. M4: engine_version adds sha256 of app/static/data/package3d.json and data/metrics.csv; dirty = 'untracked' when
   git tracks no file under engine/.
7. Tests; full suite.

## Wave 4 progress log

- 2026-10-20 21:40 PDT: implemented; engine/tests/cli-l10.test.mjs 19/19 (wave 4: nonlinear, sweep, cure shrinkage,
  viscoelastic refusal, homogenization record, k {expr} pass-through; engine stamp test extended).
  CROSS-LANE CHANGE (authorized by the coordinator; L8 retired), engine/src/mech/case.mjs, additive dispatch only:
  imports (nonlinear.mjs, sweep.mjs, numbering.mjs, AUTO_DIRECT_MAX_DOF), constants NONLINEAR_MAX_DOF 1e5 and
  SWEEP_MAX_DOF (= AUTO_DIRECT_MAX_DOF 1e5), helper mechShaped (solveMech-shaped result), dep `nonlinear`, and two
  branches in the study loop: thermo_elastic_sweep -> solveMechSweep (DOF guard, no eigenstrain), and nonlinear
  thermo_elastic -> solveMechNonlinear per temperature (q2s forced with a warning, DOF guard, no eigenstrain).
  Existing linear paths unchanged.
  1. `physics.mechanics.nonlinear` or study `nonlinear`: true | {max_dof, steps, tol} (validated). Above 1e5 q2s DOF:
     study error naming the DOF and the fix. Not for temperature.from studies (error) or sweeps (note). Test: bilayer
     10 mm, nonlinear vs linear q2s differ by 1e-4..0.1 relative; Newton relres < 1e-9 at every load step.
  2. Study type `thermo_elastic_sweep` {temperature: {path_C}, dT_max, max_dof, stress_free_C, supports, element};
     one result per path temperature. Test: synthetic Tg layer (8 / 0.4 GPa at 100 C), equal to a direct
     solveMechSweep to 1e-9 and > 5 % from the total form at 25 C.
  3. `materials.cure_shrinkage: off | library | both` (default off; every mechanics result states `cure_shrinkage`).
     both: off then library runs per temperature; targets compared on off with `got_cure_shrinkage`; kind not stated
     -> `got_by_shrinkage` {linear, volumetric}. Not applied to temperature.from / process_sequence / sweep (noted).
  4. Viscoelastic: parseCase refuses study types matching visco*, a study `viscoelastic` key and
     physics.mechanics.viscoelastic ("no sourced Prony / WLF data").
  5. S1 / M1: `homogenization_record` {mode, label, stats (homogStats({family: true}) deltas), rom_fallbacks
     (counters plus resolve provenance rve_error)} on every thermal result with homog parts and every mechanics
     result; label rve, or "rve (with rom fallback for N keys)" (L11 wave 2 wording) with a warning; summary line.
     Real CLI fcbga s2: table exact 12, live 0, ROM fallbacks 0, label rve.
  6. M4: engine_version adds `package3d` and `metrics` hashes; dirty = 'untracked' while git tracks nothing under
     engine/ (current state).
  7. L11 note: libraryAdapter no longer strips `k_W_mK: {expr}`; applyOverrides takes it (expr_T). Test: equals the
     k-only overrideResolver path to 1e-6 K; resolved k(100 C) = 0.4 W/(m K).
- 2026-10-20 21:43-21:46 PDT: full suite `nice -n 10 npm test`: 283/283 pass, 142.8 s, max RSS 1.19 GB.

## Wave 4 SPEC note (for the coordinator)

- Study type `thermo_elastic_sweep` {temperature: {path_C: [C...]}, dT_max (K, default 2), max_dof (default 1e5),
  stress_free_C, supports, element}: rate form, direct solve per step, warpage per path temperature, no stresses.
- `physics.mechanics.nonlinear` / study `nonlinear`: true | {max_dof (default 1e5), steps (default 10), tol (default
  1e-9)}: total Lagrangian q2s, uniform temperature only, no eigenstrain; results carry `nonlinear` {load_steps,
  newton}. No stresses (von_mises_per_part empty).
- `materials.cure_shrinkage: off | library | both` (default off); result field `cure_shrinkage`; target fields
  `got_cure_shrinkage`, `got_by_shrinkage`.
- Viscoelastic studies refused at parse time (no sourced Prony / WLF data).
- Result field `homogenization_record`; `homogenization` label may read "rve (with rom fallback for N keys)".
- engine_version fields `package3d`, `metrics`; `dirty` true | false | 'untracked' | null.
- Section 18 status line (A3 S6) can now say: nonlinear, sweep and cure shrinkage reachable by case keys;
  viscoelastic library-only.

# Wave 5 (coordinator, 2026-10-20; lane L12 reports)

- 2026-10-20 22:18 PDT (engine/src/thermal/case.mjs; tests cli-l10 21/21):
  1. `stepTarget(t, results)`: targets with `step`, or any target of a process_sequence study, read
     `steps[].warpage` of the sequence result (L8 solveProcessSequence). Missing study, missing step (the step list
     is named), surface not evaluated at that step, a non-warpage quantity, or a sequence target without `step` ->
     status unchecked with a reason, never a throw. pickMech no longer returns process_sequence results for
     uniform-temperature targets; mechValue guards a missing `derived`. The unused L8 per-target pass-through
     (procTargets) was removed. Test: stub sequence (two steps, one with no active surface) reproduces the old
     TypeError path; now pass / three unchecked reasons.
  2. summarizeAll step lines read `steps[].warpage` (fallback `derived.warpage`), print T_end_C and the parts
     activated at the step.
  3. runCaseAll unused-override check runs over the thermal and mechanics grids together (the per-thermal-study
     warning is replaced by it). Test: thermal-only run, override used by abf_gl -> not flagged; emc -> flagged.
  The L12 CLI repro (120mm_warpage_cu with the sequence cut to 3 steps) was not run: the coarse sequence takes
  14-16 min (audit A3 S2); the stub test exercises the same code path.
- 2026-10-20 22:20-22:23 PDT: full suite `nice -n 10 npm test`: 292/292 pass, 152.4 s, max RSS 1.10 GB.
