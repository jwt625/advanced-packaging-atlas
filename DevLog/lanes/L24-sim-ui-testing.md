---
title: Lane L24 - /sim UI testing (operations, toggles, orderings) and glitch fixes
date: 2026-10-21
status: done (2026-10-21 19:10 PDT)
scope: app/src/routes/sim/, app/src/lib/sim/, test driver and regression script in cache/sim_ui_driver/ (git-ignored; no app/package.json change), this file
owner: lane L24 (Claude subagent, DevLog-013)
---

# L24: /sim UI testing

Request (Wentao, 2026-10-21): "sim works in general, but glitchy. Test various operations as well as different
toggles and orderings." Binding inputs: DevLog-013 shared rules, DevLog/lanes/L6-ui.md, L12-ui.md, DevLog-012
"How to test", audits A2 / A3 (UI items M2, M3, M10, M12, S2, S5 were fixed by L6 / L12).

Not in scope: `app/src/lib/three/`, `app/src/routes/3d/` (L18), `engine/`, `sims/` (L19 / L20 / L22). Bugs found
there are reported to the coordinator with exact repro.

## Plan (2026-10-21 18:06 PDT)

1. Own dev server: tmux `apa-l24`, port 47392 (lsof free), log `logs/sim_ui_test_dev_<ts>.log`. The existing
   `apa-app`, `apa-sim-ui` (47352) are not touched.
2. Driver: playwright-core 1.63.0 in `cache/sim_ui_driver/` (pnpm, offline store; not tracked), Chromium from the
   local Playwright cache (headless shell). Captures console errors / warnings, page errors, failed requests, worker
   errors, screenshots; drives the workbench through the DOM, reads state through `window.__simWorkbench` (dev).
3. Matrix (fast cases for breadth: cowos_r/thermal_rjc s1, fcbga_organic/substrate_warpage s2, em/em2_cpwg_si_bridge;
   heavy cases a few targeted times under nice, one at a time):
   - A. case picker: every package case, EM case and family session loads without errors; rapid switching; switching
     during a compute.
   - B. parameters: valid / invalid / constraint edits, compute, edit again (stale), reset; URL round trip (reload,
     back / forward, shared link, packed in-memory text).
   - C. geometry preview: section, kz, x-ray, color, camera presets, pick channel.
   - D. results: thermal surface / slice / probe / cut line / iso / arrows / derived / range / LUT; mechanics
     displacement, deformation, von Mises, warpage, step picker; transient; EM S / phase / Smith / RLGC / Touchstone /
     progress; compare A | B and B - A; VTU.
   - E. orderings: slice -> section -> mirror -> study change -> back; theme; resize 1440 / 1024 / 390; splitters; tree
     navigation during render.
   - F. repeated Compute: memory (JS heap), canvases, listeners, workers alive.
4. Each glitch: repro, screenshot, root cause, fix, re-verify, regression scenario in the driver. Issues table below.
5. Gates: `pnpm check` 0 / 0, `pnpm build`; dev server and tmux session stopped; temporary screenshots deleted except
   the evidence images cited here (git-ignored, `cache/sim_ui_driver/evidence/`).

## TODO

- [x] Plan, dev server
- [x] Driver skeleton + smoke
- [x] Matrix A-I (plus heavy: process_sequence, em4)
- [x] Fixes and re-verification (G1-G18; regression script 16 / 16)
- [x] Gates, cleanup, hand-off

## Issues

| id | steps | severity | cause | fix | verified |
|---|---|---|---|---|---|
| G1 | Case picker: cowos_r/thermal_rjc -> cowos_r/thermal_rjc_calibrated (also info_os/theta_jc_tim -> _calibrated, 50mm_quarter -> _e2): blank graphics "0 boxes", presets empty | high | `resetCaseState` clears `generated`/`presetList`; the regenerate / presets effects depend on `geometryKey` / `familyId`, whose values are equal for the two cases, so the effects never re-run | `wb.loadSeq` (incremented per load) read by both effects (+page.svelte); regenerate waits for package3d.json (no empty "Geometry not regenerated" flash) | yes (probe2, a_cases) |
| G2 | Family session -> Add default thermal study -> Compute: info_os, foveros, foveros_direct, samsung_x_cube, cpo_module, hybrid_bond_d2w "no die parts"; soic, ucla_si_if "matched parts own no cells"; hbm_stack, fan_out_panel "selection top:... has no exterior faces" | medium | defaults.ts: die glob = common id prefix (none for logic_1 / io_1); die boxes fully covered by their own layer boxes own no cells; top HTC on a covered die top | heated parts = dies + parts contained in a die (list, SPEC 7 allows lists); top HTC = `top:lid` / the only lid part / `top:*` | yes (a_defaults: 17 of 23 families compute; the 6 others stop with the engine's clear "T outside valid_T_C" message plus a UI hint, template 100 W too hot for small dies) |
| G3 | Default study on fixture families (emib, samsung_*, ase_focos_bridge, amkor_s_connect, ibm_dbhi, hybrid_bond_w2w): "Cannot read properties of undefined (reading 'split')" | medium | UI chain `materialOf` splits `homog:<kind>:<incl>+<matrix>`; fixture keys are `homog:c4` (no constituents) | `materialOf`: whole-key map lookup and pass-through; `missingK` checks such keys whole, so the default study maps them with a labelled substitution | yes (a_defaults) |
| G4 | Result + section + slice / isosurface / arrows: slice planes, isosurfaces and arrows float in the removed half (known L6/L12 open item for arrows) | medium | only the surface was trimmed (worker clip); slice / iso meshes and arrows ignored the section | FieldLayer: world clipping plane on slice and iso materials (shader clipping chunks, `localClippingEnabled`); ArrowLayer skips arrows on the removed side per drawn copy | yes (d_clip screenshots; 3344 -> 1244 arrows at x <= -5 mm) |
| G5 | Compare: Pin A, Compute B, difference B - A, Compute B again: the difference shows 0 everywhere (range -0.5..0.5) | high (wrong values) | A's reference field was "sent" once per A run, not per B worker; a new B worker never received it | reference tracked per B PostClient | yes (d_diff: dT max 3.722 K, after recompute 3.722 K, after a 1.5x power B 7.453 K) |
| G6 | Difference mode on, then B recomputed on another grid: mode stays "diff" but B alone is drawn without a word | low | diffOn silently false | result handler falls back to side by side with a log line | yes (d_diff) |
| G7 | Section on at y = 20 mm in cowos_r, switch to soic (16 mm): geometry blank, slider shows 0.88 while the state is 20, result camera fit degenerate (extreme zoom) | high | clip position kept across cases / axis changes, never clamped to the model | Graphics: re-centre the section when it lies outside the current model (once parts exist; URL clip kept when inside) | yes (e_order) |
| G8 | Slice position outside the result grid when the Results page was not open (case / study change) | low | clamp lived in ResultPages (mounted only on result nodes) | clamp moved to Graphics (always mounted) | yes (e_order) |
| G9 | Pick channel draft (in memory) from fam:cowos_l, then choose fam:cowos_l in the Case picker: nothing happens, stuck on the draft | high | same URL, `goto` no-op, `chosen` unchanged | `switchTo` re-loads the URL session when it is already the chosen one (`reloadTick`) | yes (f_pick) |
| G10 | Compute s2 after s1, Cancel: "result" toggle highlighted but disabled, Plot Group page with 0 triangles, no explanation; same after Pin as A | medium | the previous solution worker is stopped at Compute start (memory: one solution worker at a time) but `gview` stayed `field` | `stopWorker` / `pinA` switch the graphics to geometry; plot-group pages state that the field is no longer held | yes (g_races) |
| G11 | Compare side by side with a sequence / multi-T A: A drawn at B's point index (zeros past A's last point; seen with an out-of-range point: value 0, cut line all NaN) | low | A requests used B's `pg.point` | A's point clamped to its own points | code only (needs two mechanics runs with different point counts) |
| G12 | Iso list "60, 80" on cowos_r (field 84.6-99.4 C): nothing drawn, no message | low | levels outside the field range | "No isosurface: no level lies inside the field range" note on the plot page | yes (regress) |
| G13 | Layers of the previous solution kept until the new layers arrive (stale paint / auto range for a moment) | low | layers kept across PostClients | layers and their range cleared when the solution client changes | exercised in every scenario (no errors); no frame-level check |
| G14 | Mesh (cell size) node, then Temperature: mesh edges stay on | low | the Mesh plot group switches `pg.wire` on, nothing switches it off | edges switched on by the Mesh node are switched off by the field plot groups (a user's own setting is kept) | yes (regress) |
| G15 | Side by side opened / closed about 16 times (compare mode off / side): "Too many active WebGL contexts", main viewer context lost, main pane white for good | high | `BoxViewer.dispose` called `renderer.dispose()` only; contexts are released lazily | `renderer.forceContextLoss()` in dispose | yes (g_ctx, regress: 20 toggles, 0 context messages; 10 route round trips: 0 workers left, heap 68 MB) |
| G16 | Mechanics run: Results > Temperature and T along z listed as normal nodes; Temperature showed the uz plot under a "Temperature" title | low | no T field in a mechanics run | nodes tagged n/a with the reason; the page says the plot is the mechanics expression | yes (regress) |
| G17 | Compare A = mechanics (uz), B = thermal: one colour range over both, legend "-273.2 to 42.17 C", A painted with the T affine | medium (wrong colours) | A layers joined B's automatic range regardless of quantity | shared range only when A and B show the same quantity; otherwise A has its own automatic range and display unit, stated in A's banner | yes (d_cmpmech: B 40-42.17 C, A uz -301.6 to 0.097 um) |
| G18 | Thermal Compute while a mechanics page (Displacement) is open: Settings show the "Binds when thermo-elastic results exist (E2, lane L8)" placeholder | low | node kept when it starts with `res` | thermal results move res.disp / res.vm / res.warp to res.T; placeholder text names what to compute | yes (regress) |

Open (not fixed; owner):

| id | item | severity | owner |
|---|---|---|---|
| O1 | Probe pins on mirrored copies stay drawn when the mirror is switched off; camera not refit on the mirror toggle | low | UI (next /sim lane) |
| O2 | thermal_transient cannot run on any case with silicon: `si_crystal.cp is N/A (no primary Si specific-heat source read 2026-10-20)`; engine message is clear | info (data gap) | materials (L21 / L2) |
| O3 | Wentao's dev server (47352) reloads /sim on every engine/ edit and HMR-remounts it on lib/three edits (5 reloads in 1 min, 18:13-18:14): case edits and results are lost; part of the "glitchy" feel while lanes run | info (environment) | coordinator: test on a production preview while lanes are active |
| O4 | em4 in the 18:40 build: `Cannot read properties of undefined (reading 'pat')` during the em3d companions; em3d files were being edited by L22 (18:38-18:42); the 19:01 build ran em4 fine (167 s, both networks, .s2p) | info | L22 if it recurs |
| O5 | Headless browser closed once in d_em at the Compute click after the Touchstone page; not reproduced on the re-run | unknown | watch |
| O6 | Default study (template 100 W) too hot for 6 families (hbm_stack, samsung_x_cube, hybrid_bond_d2w / w2w, ucla_si_if, ...): engine refuses T beyond the material data range; UI adds a hint | low | UI / Wentao (template choice) |
| O7 | EM: mixed-mode networks label their entries S11..S22 instead of Sdd11..; the em2d section canvas shows the base case, not the selected variant; side-by-side B pane has no "B" label | low | UI (next /sim lane) |
| O8 | A non-numeric text for a knob that the generator does not use (adh_h_um = "abc" with lid_type none) is accepted silently; used knobs give a clear geometry error | low | families (L19) |

## Progress log

- 2026-10-21 18:06 PDT: read DevLog-013, L6, L12, DevLog-012 How to test, A2 / A3; read the route and lib code;
  dev server up on 47392 (tmux `apa-l24`); playwright-core installed in cache/sim_ui_driver/.
- 2026-10-21 18:14 PDT: dev server unusable for scripted tests: other lanes' engine edits trigger full page reloads
  and lib/three edits HMR-remount the page (state reset mid-scenario; seen 18:13-18:14). Tests run against a production
  build served by `vite preview` on port 47393 (tmux `apa-l24`, window `preview`; `cache/sim_ui_driver/rebuild.sh`
  builds in about 4 s and restarts it); the driver detects remounts / reloads and fails loudly.
- 2026-10-21 18:15-18:42 PDT: matrix A (48 sessions), A2 (default studies in 23 families), B (params, Link, reload,
  back / forward, packed text), D1 thermal (27 toggles in order, probe, cut lines x/y/z, 8 result pages, VTU), D2
  mechanics (uz / |u| / vM, deformation, section, slice, iso, arrows, mirror, kz, warpage, probe and cut line), D3 EM
  em2 (224 progress rows with ETA, 12 pages, 6 variants x 3 networks, Smith, RLGC, switch case and Cancel during the
  solve), D4 compare (side, diff, recompute, other case), E orderings (slice -> section -> mirror -> study -> back,
  section across cases, theme, 1440 / 1024 / 390 px, splitters, tree navigation during a solve, 6 repeated Computes:
  JS heap flat at 68 MB, 2 canvases, 1 worker), F (YAML typing through invalid states, broken YAML, preset, pick
  channel, PNG / YAML downloads), G races (double click, case switch mid-mechanics: worker gone, Cancel), H heavy
  process_sequence (120mm_warpage_cu, 3 steps at 12 mm: 189 s, steps 0-2, vM + section, warpage per step, VTU 5.2 MB).
  Issues G1-G13 above; fixes in app/src/lib/sim and app/src/routes/sim; `pnpm check` 0 / 0 after each round.
- 2026-10-21 18:43-19:05 PDT: G14-G18 found and fixed (WebGL context leak, A / B colour range across quantities,
  mechanics nodes, mesh edges); full sweep after the fixes: 15 scenario scripts, 0 page errors / console errors /
  failed requests (one unreproduced browser close in d_em, O5); em4 re-run at 19:01: 167 s wall, 27 progress rows
  with ETA, 2 networks, Touchstone .s2p download; regression script 16 / 16 (about 1 min).

## How to re-run (hand-off)

- Driver: `cache/sim_ui_driver/` (git-ignored): `lib.mjs` (playwright-core 1.63.0 from the pnpm store, local
  Chromium headless shell 1234 from the Playwright cache), scenario scripts `a_cases`, `a_defaults`, `b_params`,
  `d_thermal`, `d_mech`, `d_em`, `d_compare`, `d_diff`, `d_cmpmech`, `d_clip`, `e_order`, `f_yaml`, `f_pick`,
  `g_races`, `g_ctx`, `g_nav`, `i_misc`, heavy `h_sequence` (about 3 min) and `h_em4` (about 3 min), and
  `regress.mjs` (G1-G18 checks, pass / fail, exit code).
- Build and serve: `cache/sim_ui_driver/rebuild.sh` (pnpm build, then `vite preview` on port 47393 in tmux
  `apa-l24`); then `cd cache/sim_ui_driver && node regress.mjs` (or `SIM_BASE=http://localhost:<port>`). URLs get
  `debug=1` (exposes `window.__simWorkbench` / `__simViewer` in production builds).
- If cache/ was cleaned: `cd cache/sim_ui_driver && pnpm add playwright-core@1.63.0 --offline`.
- Evidence images (after the fixes): `cache/sim_ui_driver/evidence/` - d1b-clip-y0-iso.png and d1b-clip-x-5-top.png
  (G4), e-04-soic-result.png (G7), g2-after-toggles.png (G15), d4c-mechA-thermalB.png (G17), d4b-diff-recompute.png
  (G5), g-after-cancel.png (G10). The pre-fix screenshots were looked at during the session and then deleted with
  the temporary shots.

## Files changed (L24)

- `app/src/routes/sim/+page.svelte`: loadSeq dependencies (G1), reloadTick for the picker (G9).
- `app/src/lib/sim/workbench.svelte.ts`: loadSeq, regenerate waits for package3d.json, diff fallback (G6), gview on
  worker stop / pin (G10), result node after thermal runs (G18), draft-study error hint (G2).
- `app/src/lib/sim/Graphics.svelte`: section / slice clamps (G7, G8), reference per B worker (G5), A point clamp
  (G11), arrows / slice / iso clipping (G4), iso count (G12), layers cleared per solution (G13), A range per quantity
  (G17).
- `app/src/lib/sim/graphics/FieldLayer.ts`, `ArrowLayer.ts`, `BoxViewer.ts`: section clipping (G4), context release
  (G15).
- `app/src/lib/sim/defaults.ts`: heated part list, top selection, whole homogenized keys (G2, G3).
- `app/src/lib/sim/engineRun.ts`: `materialOf` for homogenized keys without constituents (G3).
- `app/src/lib/sim/ResultPages.svelte`, `ModelTree.svelte`: notes and tags (G10, G12, G16, G18), slice clamp moved
  (G8), mesh edges (G14).
- No change to app/package.json, engine/, sims/, app/src/lib/three/.
