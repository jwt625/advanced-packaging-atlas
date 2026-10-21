---
title: Lane L12 - /sim UI owner after L6 (audit A3 S2, S5, M1, M10, M11)
date: 2026-10-20
status: done (2026-10-20 22:18 PDT)
scope: app/src/lib/sim/, app/src/routes/sim/, app/vite.config.ts (worker build format only), this file; coordinator addition: em3d S labels and run page (A3 M9 UI item)
owner: lane L12 (Claude subagent, DevLog-012)
---

# L12: /sim UI fixes from audit A3

Binding inputs: DevLog-012 (lanes, shared rules), DevLog/lanes/L6-ui.md (design, waves 1-7), sims/SPEC.md v0.15,
DevLog/audits/sim_engine_audit_A3_2026-10-20.md (S2, S5, M1, M10, M11). Lanes L10, L11 and L13 (EM) edit engine files
concurrently: the UI reads engine exports only.

## Findings before coding (2026-10-20 21:40 PDT)

- **S2 (process_sequence crash):** `packMech` maps `r.fields.u_m` on every mechanics result. A process_sequence result
  (`engine/src/mech/case.mjs` runMechCase) is `{study, type: 'process_sequence', grid, steps[], _steps[], gen_warnings,
  warnings}`. Each step: `step, T_start_C, T_end_C, active[], activated[], switched[], groups[], dof, warpage[]
  (mech/post.mjs warpage(): surface, warpage_um, coplanarity_um, shape_class, centre_minus_corner_um, sign_convention,
  view_side), von_mises_per_part, ms`; `_steps[k]` adds `_U` (3 N over the extended node ids; corners first, same
  order as the grid nodes), `_grid` (grid masked to the parts active at that step), `_groups[]` (per live group:
  masked grid, `_num.cells`, `fields.vm_cellnode_Pa`, 8 per active cell of the group).
- **S5 (arrows):** `kOfGrid(r.grid, ad.resolve)` uses the case-level adapter. runCase builds the solve resolver per
  study: study `materials.overrides` merged over the case (`studyOverrides`) through a new `libraryAdapter`, then
  `extrapolatingResolver(resolve, allowOf(c, s0))` (`engine/src/thermal/case.mjs` runCase study loop).
- **M10 (silent fixture fallback):** `loadPackage3d()` (lib/three, read-only for this lane) returns the hand-written
  FIXTURE on a 404 or a fetch/parse error; the page then leaves `p3dUrl` empty, the worker gets `data = null` and
  `runCase` silently takes the UI chain (fixture parts; no overrides, allow_extrapolation or targets).
- **M10 (targets race):** `sim_targets.json` is fetched in onMount without being awaited; `compute()` posts
  `metrics: this.simTargets` (null until loaded).
- **M1 (RVE label):** "RVE table" in the runner label only means "table loaded". `lib.homogStats({family})` (L11
  wave 2) returns the resolver counters (table_exact, table_interpolated, table_miss_*, table_cfg_mismatch, live_full,
  live_k, void_rom, cache) of that library and the RVE -> ROM fallbacks (`family: true` over all libraries sharing the
  attachment). Libraries derived by applyOverrides (case / study overrides) re-attach their own resolver with their
  own counters, so base-library counters alone undercount override cases.
- **M11 (4.64 MB chunk):** baseline build (21:40): the 4,644.68 kB chunk is `plotly.js-dist-min`, a dynamic import
  of `src/lib/Plot.svelte` used by `/explore` (route node 5), not by /sim. /sim (node 6) static closure: 974.9 kB
  (node 308.4 kB, three.js 556.5 kB, small shared chunks); engine modules and the RVE table are already dynamic on the
  main thread. The sim worker is one 1,161 kB file: Vite's default worker format `iife` inlines every dynamic import,
  so the worker loads every engine module and the 302 KB RVE table (379 kB as JS) for any run.

## Plan

1. **S2:** `packMech` handles both result types. process_sequence: one result point per step (label = step id,
   T = step end temperature, T_start, active part count, dof, ms), warpage rows with step and shape_class, von Mises
   per part; per-step fields from `_steps[k]._U` (uz, |u|, deformation) and per-step activation masks from
   `_steps[k]._grid.cellPart` (PostSession draws only the parts active at the step); von Mises per step merged from
   the group fields when present. Every field access guarded (`r.fields?.u_m`, missing arrays -> table-only view
   with a stated reason, never a throw after the solve). Results pages: step picker instead of the temperature picker,
   Warpage page as warpage per step (table + plot vs step end T in step order), targets by step.
2. **S5:** arrows resolver = the solve's resolver: per study `studyOverrides` + `libraryAdapter` when the study has
   overrides, wrapped with `extrapolatingResolver(..., allowOf(cfg, s0))` (engine exports; no engine edit).
3. **M10:** the page shows a red banner when package3d.json did not load (404 or error), with the reason; the worker
   reports a fetch failure and `runCase` refuses (clear error) instead of falling back to the UI chain when the family
   has a generator; the UI chain stays for families without a generator, and its result lists what it ignores.
   Targets: `sim_targets.json` load kept as a promise; `compute()` awaits it (bounded) before posting.
4. **M1:** after a run, the worker sums `homogStats()` over the base library and every library returned by the
   wrapped `applyOverrides` (family fallbacks once), sends it as `result.homog`; Derived Values shows table exact /
   interpolated / misses / live / cache / ROM fallbacks (keys on hover); runner label without the "RVE table" claim.
5. **M11:** `worker: { format: 'es' }` in app/vite.config.ts (the only worker in the app is the sim worker), so the
   worker keeps the engine modules and the RVE table as separate chunks loaded on demand (em2d / em3d / mech only
   when a study needs them). Report before / after sizes; the plotly chunk belongs to /explore and is left as is.
6. **Gates:** `pnpm check` 0/0, `pnpm build`, production preview on a free uncommon port in tmux `apa-sim-ui-l12`,
   one headless Chrome: process_sequence page (120mm_warpage_cu with a coarse mesh via the YAML tab) and arrows on
   info_os s3; screenshots in the session scratchpad `shots/l12/`; preview stopped at the end.

## TODO

- [x] S2 process_sequence results (packing, session masks, pages)
- [x] S5 arrows resolver per study
- [x] M10 package3d banner, no silent UI-chain fallback, targets awaited
- [x] M1 RVE usage counters
- [x] M11 worker code splitting, chunk sizes before / after
- [x] em3d S labels (SPEC 14.1 / 14.5), port checks and companions on the Run page (coordinator addition)
- [x] Gates and screenshots
- [ ] Open (not this lane): L10 evalMechTarget throw on sequence targets without a step value (UI guarded);
  L10 summarizeAll step lines without warpage; L10 unusedOverrides false warning on thermal-only runs; arrows are
  not clipped by the section plane (pre-existing L6 behaviour); A3 M10 leftover "mechanics notes in
  thermo_elastic warnings" not addressed (not assigned)

## Progress log

- 2026-10-20 21:40 PDT: read DevLog-012, L6 notes, A3; traced engine result shapes; baseline build (sizes above);
  plan written.
- 2026-10-20 21:47 PDT: S2 code: `mechPack.ts` (new, pure: thermo_elastic and process_sequence packing, guarded,
  `tableOnly` last resort), PostSession per-point activity masks (`post.ts`: every op draws the cells active at its
  point; exterior cache per mask), worker passes masks, pages (step picker, warpage per step with step / T start /
  T end / active parts / shape / coplanarity / max |u|, table-only pages for disp / vm with the reason, targets by
  step), ModelTree tags (`table only`). S5: `studyResolver` in engineRun (studyOverrides + libraryAdapter when the study
  has overrides, then extrapolatingResolver(allowOf)); `derived.arrows_k` states which. M10: worker reports the
  package3d.json failure, runCase refuses generator families without data, page banner + Messages entry + Compute
  block; UI chain lists what it ignores; compute() awaits sim_targets.json (10 s bound). M1: applyOverrides wrapped to
  collect derived libraries; `result.homog` = homogStats counters summed over base + derived libraries, ROM fallbacks
  over the family; Derived Values line. `pnpm check` 0/0.
- 2026-10-20 21:47 PDT: Node check (scratch `l12/check_pack.mts`, node --experimental-strip-types): real L8
  solveProcessSequence on the E4 layered plate (3 steps: deposit, bond, debond) -> packMech -> PostSession: fields
  full, 3 points with step / T / shape class, exterior faces per step 360 / 440 / 360 (carrier drawn only while
  active), slice through the inactive carrier 0 faces, von Mises merged per step, VTU ok; thermo_elastic still packs;
  results without grid / _steps / fields.u_m give table-only with the reason; tableOnly ok.
- 2026-10-20 21:48 PDT: M11: `worker: { format: 'es' }` in app/vite.config.ts. Build: worker entry 1,161.02 kB ->
  128.72 kB plus 31 lazy chunks (families 167.4, RVE table 280.8, materials 38.5, thermal 25.7, mech 27.0 + 42.5,
  RVE resolver 47.9, em3d 49.9 kB, ...); main-thread /sim node 315.91 -> 323.99 kB (L12 UI code); every other
  route chunk byte-identical (same hashes), the 4,644.68 kB plotly chunk (/explore) unchanged.
- 2026-10-20 21:57 PDT: engine finding (not this lane): runCaseAll evaluates a process_sequence target without a
  step value (step removed from the sequence, or surface not active) through evalMechTarget -> mechValue, which reads
  `r.derived.warpage` on the sequence result and throws "Cannot read properties of undefined (reading 'warpage')"
  after the whole sequence solved (CLI repro: 120mm_warpage_cu with steps cut to 3, mesh 6 mm; 3:15 min then the
  error). UI guard: the worker wraps runMechCase and gives sequence results an empty `derived` block (target ->
  reason), `forwardsRtol` passed explicitly. Also: the CLI summary prints no warpage on step lines (summarizeAll
  reads `st.derived?.warpage`; steps carry `warpage`). Owner: L10.
- 2026-10-20 21:57 PDT: timing (Node CLI, nice): 120mm_warpage_cu stiffener_attach_sequence, mesh max_xy 6 mm, 1 cell
  per layer, grading 2, default RVE: 7 steps 486 s (targets e-m1 miss -623 vs -330, e-m2..m4 pass); 3 steps 195 s.
- 2026-10-20 22:02 PDT: production preview in tmux `apa-sim-ui-l12`, port 47423 (lsof free; log in the session
  scratchpad `l12/preview-*.log`); one headless Chrome (playwright headless shell, Metal) per script.
- 2026-10-20 22:06 PDT: S5 check, info_os/theta_jc_tim (browser, s3 run 4.0 s wall). Heat-flux qz (W/m2) of the
  arrow column nearest the logic_1 centre, cells at z = 3486 (die), 3603.5 (TIM, 3573.5-3633.5 um), 3727.3 um (lid):
  s1 (case k 6.0) 1.679e5 / 1.160e5 / 0.947e5; s3 (study k 3.2) 1.721e5 / 1.178e5 / 0.964e5; s4 (study k 25)
  1.573e5 / 1.115e5 / 0.913e5. With the study k the TIM flux sits between die and lid in every study, as heat
  conservation requires. With the old case-level k the TIM arrows would scale by 6.0 / 3.2 = 1.875 (s3: 2.21e5, above
  the die) and 6.0 / 25 = 0.24 (s4: 0.27e5), matching A3's 1.9x / 4.2x. `derived.arrows_k` = "study s3
  materials.overrides merged over the case level". RVE use shown for s3: 3 libraries, table exact 10, interpolated 55,
  absent 5, live k 5, ROM fallbacks 0.
- 2026-10-20 22:06 PDT: engine finding (L10): thermal-only runCaseAll runs warn "materials.overrides used by no part:
  tim_polymer" although the override is used (s1 / s3 / s4 results differ): `unusedOverrides` is evaluated over the
  mechanics grids only (`mechResults.map(r => r.grid)`), which are empty in a thermal study.
- Screenshots: `shots/l12/arrows-info_os-s3.png` (iso; arrows above the dies on the lid), 
  `shots/l12/arrows-info_os-s3-section.png` (front, section y through logic_1, z x10, normalized arrows; arrows are
  not clipped by the section, pre-existing L6 behaviour).
- 2026-10-20 22:14 PDT: first browser sequence run hit the target throw: the preview was serving the 21:48 build,
  which predates the runMechCase guard. Rebuilt, preview restarted. Node stub check (scratch `l12/stub_seq.mjs`):
  runCaseAll with a stub sequence result throws in mechValue without `derived`, gives target reasons with it.
- 2026-10-20 22:14 PDT: S2 browser smoke (production build, one headless Chrome): 120mm_warpage_cu
  stiffener_attach_sequence, YAML-tab edits mesh.max_xy_mm 12, min_cells_per_layer 1, grading 2 and steps cut to
  package_cure, ring_attach, ramp_30 (the 7-step case needs about 8 min at 6 mm in Node, RVE live solves dominate);
  grid 29 x 27 x 53; 176.7 s wall; result kept (fields full, 3 steps): package_cure 170 -> 130 C +170.47 um dome
  (75 parts active), ring_attach 130 C +170.47 um dome (83 parts, ring and glue added stress-free), ramp_30 -622.84 um
  W (CLI at 6 mm: -623.00). Targets: e-m1 miss -622.8 vs -330; e-m2..m4 unchecked "quantity warpage_um not available"
  (steps cut). RVE use: 2 libraries, table exact 2, misses 48 (fingerprint 14, absent 34), live 48, cache 849,406,
  ROM fallbacks 0. Displacement step 0 shows no stiffener, step 1 shows it (activity masks).
- 2026-10-20 22:14 PDT: coordinator addition (L13 report): em3d S block labels. `S` = block at zref_ohm, de-embedded
  per derived.deembed_method (label names the line-run reference planes); `S_port_ref` = solver S as power waves
  referenced to Re Z0 of each terminal (rows[].zref_native_ohm, values in the reference note), before renormalization;
  for line_run at the port faces, not de-embedded; for port_extension the solver applies the extension where
  deembed_um > 0 (engine/src/em3d/solver.mjs). Run page per variant: de-embedding text, port_checks table
  (z_check ok / warn / not_checked, Z port, Z em2d, rel, f, z_check_reason), companions table (port, reference plane,
  DOF, tets, layers, 2D tris, PML sides, Z face / ref, setup / solve). Browser em4: 150 s wall, line_run, z_check warn
  on both ports (39.22 vs 43.32 ohm, -9.45 %; lossy -9.73 %), companions 25,968 DOF each, reference planes x = -13.5 /
  +13.5 um.
- 2026-10-20 22:18 PDT: gates: `pnpm check` 837 files 0 / 0; `pnpm build` ok (final: /sim node 329.20 kB, worker
  entry 128.91 kB; plotly chunk of /explore 4,644.68 kB unchanged, the only >500 kB warning). Preview stopped (tmux
  session killed, port 47423 free), no headless Chrome left. Screenshots in the session scratchpad `shots/l12/`:
  arrows-info_os-s3.png, arrows-info_os-s3-section.png, seq-disp-step0-package_cure.png,
  seq-disp-step1-ring_attach.png, seq-vm-step1.png, seq-warpage-per-step.png, seq-derived.png, em4-run-page.png,
  em4-s-port-ref.png. Late text-only change after the sequence screenshots: Settings title "1D Plot Group: Warpage per
  step" for sequence results (built, not re-screenshotted).

## Chunk sizes (client, minified)

| Chunk | Before (21:39) | After (22:17) |
|---|---|---|
| sim worker | 1 file, 1,161.02 kB (all engine modules and the RVE table inlined) | entry 128.91 kB + 31 lazy chunks (largest: RVE table 280.8, families 167.4, 101.2, em3d 49.9, RVE resolver 47.9, mech 42.5, materials 38.5 kB) |
| /sim route node 6 | 315.91 kB (gzip 103.02) | 329.20 kB (gzip 106.82), L12 UI code |
| /sim static closure | 974.9 kB (node + three.js 556.5 + small) | node + the same shared chunks |
| plotly.js-dist-min (/explore, lazy) | 4,644.68 kB | 4,644.68 kB (same hash; not /sim) |
| other routes | - | byte-identical (same hashes) |

## Files changed (L12)

- New: `app/src/lib/sim/mechPack.ts`.
- Edited: `engineRun.ts`, `sim.worker.ts`, `post.ts`, `protocol.ts`, `workbench.svelte.ts`, `ResultPages.svelte`,
  `Settings.svelte`, `ModelTree.svelte`, `BottomPanel.svelte`, `EmPages.svelte`, `emResults.ts`,
  `app/src/routes/sim/+page.svelte`, `app/vite.config.ts` (`worker: { format: 'es' }`).
