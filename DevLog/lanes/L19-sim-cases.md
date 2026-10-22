---
title: Lane L19 - sim case runs and case physics (emib_t timeout, cowos_s / fan_out re-runs, 120 mm SUS430 suspects, CoWoS-L 6x TV knobs, cowos_l browser peak, family drift sync)
date: 2026-10-21
status: in progress (handed back 2026-10-21 19:00 PDT with the run queue still executing; see Hand-off)
scope: sims/, engine/src/families/, engine/tests/families*, validation/cases/ (these cases), validation/RESULTS.md rows, this file
owner: lane L19 (Claude subagent, DevLog-013); case owner after L3
---

# L19: sim case runs and case physics

Inputs read: DevLog-013 (shared rules, L19 row), DevLog-012 (L3 / L9 / L10 entries, Wrap-up), L3-families.md (TODO,
waves 5-6), L9-warpage-investigation.md, validation/RESULTS.md, validation/README.md.

## Plan (2026-10-21 17:53 PDT, before runs)

Rules: heavy runs under `nice -n 10`, one at a time; every result carries the `engine_version` stamp; if the stamp is
dirty in L20's modules (mech, materials, homog, em2d, em3d), re-run before recording final numbers. Logs with a
timestamp in the scratchpad. No git writes. No tuning to targets.

1. emib_t/bridge_stress s2 (timed out at 1800 s): profile with the CLI (`--json`), recording DOF, iterations,
   convergence record, wall time per temperature. Remedies available at case level: rtol 1e-7 (package default since
   L10), quarter symmetry (already set), `mesh.thin`, `min_cells_per_layer` 1 for warpage-only output, budgets
   (`--mech-budget-s`). Get it to finish, or document why it cannot.
2. cowos_s (s1-s7; stress_norm s3-s7 not rerun since the tsv_* selection fix) and fan_out_panel (s1, s2) re-runs;
   ledger rows updated with study id, mesh, rtol, wall, stamp.
3. 120 mm SUS430 stiffener_attach_sequence: labelled sensitivity variants (not fits) for the untested suspects:
   (a) ring stiffness / coupling (ring E bounds, ring thickness / width as reported vs template, glue modulus bounds),
   (b) substrate CTE vs SUS430 (substrate build-up / core CTE bounds from sources). One coarse sequence at a time.
4. CoWoS-L 6x TVs (ectc51909.2023.00091): dummy-Si and SC-RDL knobs from the paper (text + DB rows); undisclosed dims
   stay `missing` / template with rationale.
5. cowos_l Node peak RSS at rtol 1e-7 (`/usr/bin/time -l`); browser peak via own preview server on a free uncommon
   port (lsof first), headless driver, then stop the server.
6. Family drift sync after L18 (on coordinator forward or drift-test failure): re-transcribe specs, reproduction test,
   s1 re-runs of affected cases.

## TODO

- [x] 1 emib_t s2 profile + remedy (finishes at rtol 1e-7; re-run at 25 / 225 C queued)
- [x] 1b (coordinator 2026-10-21, Wentao decision CD5 revised) reflow-stage studies must not contain the TIM (or the
      lid it bonds): check every case / study at reflow temperatures; process_sequence: activate TIM / lid at the
      lid-attach step; single-step reflow studies: model the pre-lid state, or mark the study when the paper measured
      a lidded package at reflow T (with the reason)
- [~] 1c (coordinator 2026-10-21, Wentao decision CD6 changed) reflow-temperature studies run at the top of the
      temperature range covered by all materials of that stack (per case from the library ranges), not beyond with
      allow_extrapolation; state the offset to targets measured at higher T (260-265 C) in the study and RESULTS.md;
      allow_extrapolation opt-in and unused by default cases; record per case the overlap ceiling and its limiting
      material (recomputable when materials ranges grow); re-run affected studies, update ledger rows
- [ ] 2 cowos_s all studies; fan_out_panel; ledger rows
- [ ] 3 120 mm SUS430 suspects (sensitivity variants)
- [~] 4 CoWoS-L 6x TV knobs (ring TV0_4.8x case + family support done; run queued)
- [x] 5 cowos_l Node and browser peak at rtol 1e-7
- [~] 6 family drift sync (emib_t synced, route.regions supported; emib_t s1 / s2 re-run queued; re-check drift at the end)
- [ ] final re-run of any case whose stamp shows L20-dirty modules

## Progress log

- 2026-10-21 17:53 PDT: inputs read; plan written.
- 2026-10-21 17:54 PDT: emib_t s2 profile run started at the case mesh (86 x 60 x 95 grid, 509,472 nodes, 1.53e6 DOF,
  dz_min 0.5 um, max aspect 1000; 2 cells per layer), rtol 1e-7 (package default), under nice; s2 at 25 C took 506 s.
- 2026-10-21 18:00 PDT: coordinator forwarded Wentao's CD5 / CD6 decisions (tasks 1b / 1c). CD5 check: only
  cowos_l/warpage_rt_ht s3 has a TIM (and the lid it bonds) at a high-temperature study; the paper measured the lidded
  package at 240 C (Fig. 6(c), lid-type TV), so the TIM stays and the study note says why. No other high-T study has a
  TIM or lid (cowos_s and 120 mm carry rings, not TIMs).
- 2026-10-21 18:05 PDT: CD6 overlap ceilings. New tool `engine/src/families/tools/ceiling.mjs` (scan 25-320 C in 1 C
  steps, every material of the study's model incl. homog constituents, CTE re-based to the stress-free T, no
  extrapolation; compliant layers E <= 100 MPa at the study T listed separately). Wentao (via coordinator, 18:10):
  compliant layers do not set the ceiling and hold their last value (allow_extrapolation lists only them).

  | Case / study | Ceiling (non-compliant) | Limiting | Ceiling incl. compliant | Compliant keys held | Was |
  |---|---|---|---|---|---|
  | cowos_l/warpage_rt_ht s3 | 225 C | solder_resist | 150 C (tim_polymer) | tim_polymer | 240 C |
  | cowos_l/warpage_rt_ht_ring48x s3 (new) | 225 C | solder_resist | 225 C | - | (new) |
  | cowos_s/warpage_corner_stress s2h | 225 C | solder_resist | 225 C | - | 250 C |
  | emib_t/bridge_stress s2 | 225 C | solder_resist | 225 C | - | 240 C |
  | fcbga_organic/substrate_warpage s2h | 225 C | solder_resist | 225 C | - | 265 C |
  | fcbga_organic/substrate_warpage_bare s2h | 225 C | solder_resist | 225 C | - | 260, 265 C |
  | glass_core_substrate/warpage_vs_organic s2h, s3h | 225 C | solder_resist | 225 C | - | 265 C |
  | si_interposer_peers/120mm_warpage(_cu) s2 | 225 C | solder_resist | 225 C | - | 243, 260 C |
  | si_interposer_peers/120mm_warpage(_cu) stiffener_attach_sequence | 225 C | solder_resist | 150 C (silicone_adhesive E table) | silicone_adhesive | 243, 260 C |
  | si_interposer_peers/50mm_quarter(_e2) s2 | 260 C | emc (also underfill_cuf, sio2_film) | 260 C | - | 260 C (unchanged) |

  Next limiter after solder_resist: abf_gl 240 C. underfill_cuf / underfill_c4 hold E 100 MPa above 240 C but their
  ranges reach 260 C (not limiting). Case edits: high-T studies and steps moved to 225 C; targets compared at 225 C
  carry a note with the measured temperature and offset (15-40 C); allow_extrapolation removed except the compliant
  keys (cowos_l [tim_polymer], 120 mm cases [silicone_adhesive]). 120 mm: ramp_243 / ramp_260 -> ramp_225; the
  SUS430 measured zero crossing (about 231 C) lies above the ceiling, so that gate is untestable at default.
  validation/cases/D/ectc51529.2024.00155-moire.yaml step names and D/ectc51909.2023.00091-cowos_l.yaml (ring sim
  case, high-T note) updated; check_db_targets.py 0 errors; families tests 72 / 72.
- 2026-10-21 18:10 PDT: task 4 (CoWoS-L 6x TVs). The TV0_1.6x knobs (dummy_n, dummy size from 3.8x / 8, rows_y rule,
  sc_rdl substrate, 1 F/S + 6 B/S RDL, TIV 50 / 100 um, 3-2-3 substrate, 1.4 mm core) were already in place (L3 wave
  2); the missing piece was the ring TV0_4.8x (validation case D variant `ring` had no sim case). Added:
  - cowos_l family: `ring_wy_mm` knob (alias ring_w_mm) and, for sc_rdl substrate + ring, the ring sits on the
    side-mold top (Fig. 7(a) cross-section) instead of the substrate; rules.mjs stiffener check skips keep-outs /
    interposers the frame rests above (top dies always checked). Defaults unchanged (reproduction tests pass).
  - case `sims/cowos_l/warpage_rt_ht_ring48x.yaml`: 6 SoC (2 x 3), 12 HBM2E, 18 LSI, no dummies (Table 1), ring
    12 mm bars x 2 mm (label "18mm-12mm-2mm" undefined: 18 mm bars leave a 55 mm window, smaller than the template die
    block 59.85 x 60.75 mm, refused by the overlap rule), Cu ring (not reported), no TIM1; fit_dies interposer
    61.85 x 62.75 mm = 4.68x vs reported ~4000 mm2 (4.8x), -3 %.
- 2026-10-21 18:13 PDT: task 1 profile done (emib_t/bridge_stress s2 at 25 / 240 C, case as of 17:54 with
  allow_extrapolation solder_resist; engine src b51e593d9223, data d354393892f2, clean). Case mesh 1,493,382 active DOF
  (497,794 nodes), q1im, pcg_gmg lowmem (5 levels, coarse 9,900 DOF). 25 C: 498 iterations to relres 9.81e-8
  (converged at rtol 1e-7), solve 400 s, post 104 s, total 506 s; 240 C: 532 iterations, relres 9.73e-8, solve 421 s,
  post 186 s, total 609 s. Whole run 1116 s wall, Node peak RSS 1.97 GB. Verdict: the 1800 s timeout was the earlier
  rtol 1e-10 default (L9 W2.2: 80-95 % of wall spent below 1e-7); at the package default 1e-7 the study finishes
  within budget without further remedies. min_cells_per_layer 1 or mesh.thin would cut DOF (to 8.0e5 at 1 cell per
  layer) but coarsen the bridge BEOL / FLI stress outputs that are the case's purpose, so not applied. No warpage is
  reported (no target defines a surface). vm maxima (Gauss point, 25 C): bu_pl_1 195.6 MPa, br_mp_1..3 ~180 MPa
  [reentrant]; 240 C: br_m1 213.7 MPa [bimaterial_edge]: singular-corner flagged, indeterminate. Re-run at 25 / 225 C
  (CD6) queued.
- 2026-10-21 18:19 PDT: task 5 Node (cowos_l/warpage_rt_ht, case mesh 1,081,080 DOF, rtol 1e-7, library d354393892f2;
  engine src dirty from L20 / L19 family edits): s2 25 C -250.745118 um bowl, 83 iterations, relres 9.94e-8, 121.9 s,
  peak RSS 1.344 GiB (1.443e9 bytes); s3 225 C (CD6) +156.338865 um dome, 167 iterations, relres 9.98e-8, 232.8 s,
  peak RSS 1.376 GiB (1.478e9 bytes). L10's 1.58 GB figure is not reproduced as a per-study peak (it may have been
  both studies in one process).
- 2026-10-21 18:20-18:23 PDT: task 5 browser. Own vite dev server, tmux `l19-sim-dev`, port 47619 (lsof free; log in
  the session scratchpad), headless Chrome (playwright-core 1.63 driver from another local project, read-only;
  cached chrome-headless-shell 1234, ANGLE Metal), RSS of the browser process tree sampled every 2 s. s2: -250.745118081
  um (Node -250.745118271, |dw| 1.9e-7 um), 106 s wall, peak 1.290 GiB largest process (worker renderer), 2.879 GiB all
  browser processes. The first s3 attempt was invalidated: vite full-page reloads (another session's build into
  app/build, then L18 / L19 edits under engine/src/families) discarded the solve; the driver now disables the HMR
  socket and counts reloads.
- 2026-10-21 18:52 PDT: task 6 triggered. L18 rebuilt package3d.json (18:08) with the emib_t per-region level change
  (`ob_bu` part and its 5 layers removed; L2 `bu_sig` carries `route.regions: [{region: {part: bridge}, use: pad,
  fill: ob_pad_fill}]`). Drift test failed (emib_t part count 7 vs 6). Fixes: re-transcribed specs/emib_t.mjs; the
  transcriber now carries `route.regions`; resolve.mjs resolves them to package-frame rectangles (part / intersect /
  subtract / box / xywd) with their own use / L/S / fill (inherit level L/S for signal uses); boxes.mjs overlays each
  region rectangle (clipped to the host) as its own homogenized box at level priority + 1 (below nested parts such as
  the cavity, so L4 over the bridge stays cavity). emib_t check: bu_sig_1~r1 3 x 18 mm, fill 0.3511 (= JSON), pad
  (plane) key; bu_sig_2~r1 is covered by the bridge / cavity (priority 10 > 3). Family tests 72 / 72. Physics change
  for emib_t: over-bridge L2 fill 0.3511 pad (was the ob_l2 pad level, default fill 0.5); other over-bridge levels now
  equal the substrate levels (same materials and thickness as the removed ob_* layers). emib_t s1 / s2 re-run queued.
- 2026-10-21 18:55 PDT: L21 library change (silicone_adhesive nu 0.30 -> 0.495, Si Cij Hall 1967, 39 TSV RVE rows;
  data hash d354393892f2 -> 25cec1aa8723). Ceilings recomputed on the new library: unchanged. cowos_l s2 / s3 queued
  again on the new library; 120 mm variants include glue nu 0.45 (L21 lower bound) for the locking check; Xilinx
  lidded s2 (lid adhesive) re-run queued.
- 2026-10-21 18:53-18:57 PDT: task 5 browser s3 (225 C, CD6), HMR disabled in the driver: +156.338509 um dome, 226 s
  wall, peak 1.535 GiB (1.648e9 bytes) largest Chrome process, 2.424 GiB all browser processes. The page loaded the
  L21 library (data 25cec1aa8723) while the Node s3 at 18:15 used d354393892f2: |dw| 3.6e-4 um is the library change
  (Si Cij), to be compared with the queued Node re-run. Verdict: at the rtol 1e-7 default the cowos_l browser peak is
  1.29 GiB (s2) / 1.54 GiB (s3) for the worker process; s3 is above the ~1.5 GB per-worker target (L6 measured 1.52 GB
  at 1e-10, same order). Dev server stopped 18:58 (tmux session killed, port 47619 free, no headless Chrome left).

## Hand-off (2026-10-21 19:00 PDT)

Run queue still executing in the background (started 18:58 PDT, one job at a time, nice 10; script and job list in the
session scratchpad: `scripts/queue.sh`, `jobs_2.txt`; per-job `<name>_<ts>.out/.err` (CLI JSON + `time -l`) and
`queue.log` with the engine git state at each start; `<name>.done` markers make it resumable). Order: cowos_l s2 / s3
(L21 library), ring48x all studies, fcbga s2h, fcbga bare s2h, glass s2h / s3h, cowos_s all studies, fan_out_panel all,
120 mm SUS430 variants (base, sub_cte_stated, ring_cte_10p4, ring_E_half, glue_nu_045; coarse common mesh), SUS430
rigid ring, Cu base + sub_cte_stated, emib_t s1, emib_t s2, Xilinx s2. Estimated 3-4 h. Summaries: `scripts/summ.mjs
<out> <err>` (CLI JSON); runner JSON for the variant jobs.

Not done yet (needs the queue results): validation/RESULTS.md rows (cowos_l 225 C, ring48x new rows, cowos_s s2 / s2h /
s3-s7 with "target sign under review (L23)", fan_out, fcbga / glass at 225 C, 120 mm at ramp_225, emib_t, Xilinx lidded
on the L21 library); task 3 verdict; final drift re-check (L18 still editing templates); final stamp check (L20 has
dirty mech/case.mjs, mech/gmg.mjs, mech/nonlinear.mjs: re-run the cases if those edits touch the linear q1im path).

Key finding for task 3 (computed, before the runs): the modelled 120 mm Substrate A membrane CTE (Table IV inputs,
template layup) is 8.01 ppm/K (30-130 C) / 8.05 (130-225 C) vs the stated 11.97 ppm/C (ectc51529.2024.00155-a-c4
notes), i.e. below SUS430 (11) instead of above it; the variant sub_cte_stated (core alpha1 5.9 -> 10.58, derived so
the membrane CTE equals 11.97) tests it. Consistent with L23's report (template substrate CTE 8.7-9.6 vs sourced
12-15 ppm/K).
