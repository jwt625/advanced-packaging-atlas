---
title: Audit V2 - process-flow animation (DevLog-016), visual / UX / physical appearance re-audit
date: 2026-10-23
auditor: fresh-context subagent V2 (built none of it; read-only on source)
scope: 3D tab Process mode (app/src/routes/3d/+page.svelte, app/src/lib/process/), app/static/data/process3d.json
---

# Audit V2: process-flow animation, visual / UX / physical appearance

## Verdict

**Not ready to show.** V1 round 2 landed well:

- all 3 V1 criticals are fixed;
- 8 of 13 majors are fixed, 5 partly fixed;
- 7 of 14 minors are fixed.

Materials now read as the real thing:

- Si slate grey (RGB 35-56);
- Cu copper (88-116, 63-84, 58-78);
- solder mid grey (94-101);
- smooth reflowed caps;
- an open EMIB cavity pocket.

The HUD and the 390 px layout are usable. Controls, determinism and hash handling pass.

What blocks a demo:

1. **N1 (critical, new today).** The persistent camera (the 21:30 change) keeps a scale's pose from the first fit. When
   the workpiece changes size or flips, a straight play-through shows close-ups of substrate texture with the package
   off-screen:
   - 00027 s22 / s24 / s25;
   - CoWoS on_substrate / bga;
   - the PiP Wafer view stays at 300 mm zoom, so a 50 mm unit becomes a speck.
2. **N2 (major).** Bodies larger than the cell window are not clipped at Cell scale (a pink BGA-land disc, a giant
   ellipse ball). This was new in the 21:49 data.
3. **N3 (major).** Dicing ends with one die on empty tape; the diced wafer disappears.
4. **N4, N5 (major).** Mold-chase and laser-debond motion do not read as the process.

Counts: 1 critical, 4 major, 9 minor new; plus the open V1 items in the table.

## Method (what ran)

- Own dev server: tmux `apa-v2`, http://127.0.0.1:47367, stopped at the end. The user's `apa-app` :47331 was not
  touched.
- Headless Chromium (SwiftShader), driven through `window.__apaProc` plus real keyboard and mouse.
- Mid-audit changes, handled:
  - 21:30, camera persistence: every shot calls `__apaProc.frame()` after `seek`. N1 shots deliberately do not.
  - 21:49, data rebuild: CoWoS went from 28 to 29 steps (`logic_thin_d`), and pads / pad-to-ball changed. Jobs were
    re-keyed by step id. Every cited shot was re-rendered 21:55-22:05 against the 21:44 engine and the 21:49 JSON
    (folder `r2/`).
  - The JSON was rewritten again at 22:04; shots taken after that are not checked against it.
- Coverage:
  - every step of all 6 routes at t = 0.5, Auto scale (81 shots);
  - all 32 V1 cited jobs re-rendered;
  - 82 targeted shots: t sweeps on UF1 / UF2 / on_substrate / mold / saw / buildup / encap / s08 / ball attach / mount
    / print / reflow / debond; Wafer, Block and Cell overrides; Actual vs Illustrative; PiP on and off;
  - 390 x 844 (4 views plus the expanded HUD);
  - light theme (fresh load and live toggle);
  - 6 no-reframe sequence shots for N1.
- Every cited shot was looked at, as 2 x 3 contact sheets plus full-size views and crops.
- Scripts, all in `cache/process3d_renders/audit_V2/20261023_211920/`:
  - `shots.py` with `jobs_*.json`;
  - `interact.py` -> `inter/interact.json`;
  - `hudscan.py` -> `inter/hudscan.json`;
  - `narrowcheck.py`.
- Only the cited shots are kept.
- Not tested:
  - GPU frame time;
  - touch;
  - the playback motion itself (judged from t sweeps, not video).

Paths below are relative to `cache/process3d_renders/audit_V2/20261023_211920/`.

## Known open items (confirm / deny)

| item | status | evidence |
|---|---|---|
| wet_bench droplet determinism mismatch, EMIB step 1 | **Denied in this build**: 0 px (> 30 grey levels) between a direct seek, scrub arrival and arrival back from step 2, at t = 0.6, Wafer scale | `inter/det_em01_*.png`, `interact.json` det_em01_* |
| 00027 s08 spray puddle | **Confirmed**: a translucent brown backdrop fills the Block view behind the block | `r2/tgt/T_p09_s08_t050_block.png` |
| EMIB-T laminator diaphragm wash-out | **Confirmed** (mild): a grey translucent sheet covers the panel at the Wafer scale | `r2/tgt/T_et05_encap_t010_work.png` |
| m14 Single framing after Process | **Confirmed**: Single after visiting Process differs by 159,696 px; two fresh loads of Single differ by 0 px. The model sits slightly smaller and shifted. Caused by the Process visit. | `inter/m14_single_before_process.png`, `inter/m14_single_after_process.png` |

## Camera persistence (new behaviour, coordinator item)

All checks were on CoWoS cow_bond at the Block scale, after an orbit plus a zoom (pose moved 1590 um).

| check | result |
|---|---|
| step forward | pose unchanged (0.0) |
| Shift+Right x2 | 0.0 |
| scrub drag | 0.0 |
| 10 steps forward then 10 back | 0.0, no drift |
| play 1.5 s | 0.0 |
| switch to Cell and back to Block | Cell has its own pose; Block restored exactly (0.0) |
| Frame | re-fits (moves 371 um); a second Frame is idempotent (0.0) |
| route switch emib -> emib_t | pose kept (0.0) |
| flow change | re-fits |
| Illustrative toggle | camera position moves 498 um (target height follows the z map), as designed |

Shots: `inter/cam_a_orbited_cw12.png`, `inter/cam_b_after_steps_play.png`, `inter/cam_c_after_frame.png`.

The mechanics work as specified. The consequence is N1.

## V1 item status

| V1 | status | evidence (V2 shot) | note |
|---|---|---|---|
| C1 tool interior, no wafer | Fixed | `r2/v1re/F06_*`, `F16_*`, `F17_*`, `F44_*` | Grinder over the wafer on its chuck; wafer inside the cut-away chase; wafer between the bonder platens; squeegee on the stencil over the PCB |
| C2 near-white Si / Cu / solder | Fixed | `r2/v1re/F10_*` (Si 39-53), `F11_*` (35-47), `F13_*` (Cu 88,63,58), `F20_*` (SnBi 94-101) | |
| C3 EMIB cavity / floating ABF | Fixed | `r2/v1re/G1_*`, `F38_*` | One open pocket; the bridge sits in it; no ABF gaps |
| M1 ruler over HUD | Fixed | all block / cell shots | Ruler on the right with label chips |
| M2 HUD height | Fixed | `inter/hudscan.json` | Max 410 px (was 757); 0 of 81 over 500 px; collapsible sub-op groups |
| M3 real time N/A | Partly | `inter/hudscan.json` | "known + n N/A" format is in. 37 of 81 steps still show a total of only "N/A +n", including both 00027 reflows, where the HUD shows "tool default 7 min 38 s" from the drawn profile but the clock ignores it |
| M4 390 px | Fixed | `narrow/N_*.png` | scrollWidth 390; HUD collapses to a 67 px strip; scrub bar 374 px on its own line. Residual: ruler labels clipped at the right edge (`narrow/N_em08_tcb.png`) |
| M5 tool backdrops at block | Partly | `r2/v1re/F01_*` clean; `r2/all/A_cw_14_uf1_cure_t050.png` | The cure-oven interior still paints a light-grey gradient wall behind the block (uf1_cure, pmc, uf2_cure, ring_cure, 00027 s19 / s21); s08 puddle (above) |
| M6 recess with laser drill | Fixed | `r2/v1re/F39_*` | Tool drie, "plasma etcher (Si recess)" |
| M7 adhesive spin coat | Fixed | `r2/v1re/F38_*` | "adhesive (form not reported)", die placement tool |
| M8 grind sunburst per die | Partly | `r2/tgt/T_cw11_saw_t070_work.png`, `T_cw22_sing_t100_work.png`, `r2/tgt/T_et05_encap_t010_work.png` | Correct on whole wafers. Every diced die, CoW unit and the EMIB-T bridge still shows a star centred on itself |
| M9 faceted solder | Fixed | `r2/v1re/F13_*`, `r2/tgt/T_cw23_onsub_t100_cell.png` | Smooth caps |
| M10 noisy plated Cu | Fixed | `r2/v1re/Z_ecp_t060.png` | Uniform copper; bottom-up front visible |
| M11 white plug at TSV bottom | Partly | `r2/v1re/Z_ecp_t060.png`, `Z_cmp_t090.png` | No longer white. A grey-blue block plus a dark band, about 8 % of the via height, sits at the bottom from ECP through CMP. It is the 0.17 um bottom liner / barrier enlarged by the illustrative z map, and still reads as a plug or void |
| M12 ball attach lozenges | Partly | `r2/v1re/F20_*`, `r2/tgt/T_p22_ball_t100_cell.png` | Flux lozenges gone; balls grey. Balls have a low-polygon silhouette and the right-hand ball overhangs the substrate edge. At Cell scale see N2 |
| M13 EMIB BGA without balls | Fixed | `r2/v1re/F30_*` | |
| m1 live theme | Fixed | `inter/theme_light_toggled_live.png` | Background 241,240,236 after the toggle |
| m2 opaque glass carrier | Not fixed | `r2/tgt/T_p11_debond_t050_block.png` | The 700 um carrier is an opaque dark slab, the same as Si |
| m3 etch hole shading | Fixed | (crop of `Z_etch` sweep, not kept) | Dark bore with a rim |
| m4 bump needles | Not fixed | `r2/v1re/F15_em08_tcb_t050_block_ill.png` | About 10:1 columns at the 1 mm block scale |
| m5 red CO2 cone | Not fixed | `r2/all/A_em_02_cavity_t050.png` (PiP) | Orange-red cone on the laser_drill (EMIB cavity, femtosecond tool) |
| m6 unit "1", raw keys | Fixed, one regression | `r2/v1re/F10_*`, light shot | "removal rate 1027 nm": the unit lacks /min (see n6) |
| m7 0 s during approach | Partly | `r2/tgt/T_cw15_mold_t040_work.png` | An "approach" label is shown. The mold still reads "0 s / 15 min 0 s" with phase "process" at t = 0.4 (34.6 s at 0.6) |
| m8 slow playback | Partly, low confidence | `interact.json` play_1x_3s | Now wall time, but a frame gap > 0.5 s gives dt = 0. 1x for 3 s advanced 18 % of a 6 s step in software GL (expected 50 %). On slow GPUs playback would stall rather than catch up. |
| m9 route switch index | Fixed | `interact.json` route_switch_ui | emib tcb 8/12 -> emib_t tcb 9/13 |
| m10 hash edit in open tab | Fixed | `interact.json` hash_edit_in_open_tab | 5/28 42 %, Actual, Cell |
| m11 modifier keys | Fixed | `interact.json` | Cmd+] leaves the speed at 1 |
| m12 uniform PCB | Not fixed | `r2/all/A_p27_lts_lts_13_s13_t050.png` | 28-layer PCB with no Cu planes (2 draw calls) |
| m13 EMIB lid texture / gap | Partly | not kept | The lid is smooth now but Cu-pink. A Ni-plated IHS is silver-grey. The cell gap was not re-judged. |
| m14 Single framing | Not fixed | see above | |

## New findings

Owner keys:

- engine = L35 core (`app/src/lib/process/*.ts`, `*.svelte`);
- materials = L36;
- fab tools = L37;
- assembly tools = L38;
- data = L34.

### Critical

**N1. The persistent camera leaves the workpiece out of frame or at the wrong zoom when it changes between steps**

- Shots (no Frame between steps; first use of each scale fitted once):
  - `nf/NF_p27_s02_t050_auto_noframe.png` (reference, fits);
  - `nf/NF_p27_s22_lts_t050_auto_noframe.png`, `nf/NF_p27_s24_t050_auto_noframe.png`,
    `nf/NF_p27_s25_lts_lts_t050_auto_noframe.png`;
  - `nf/NF_cw_on_substrate_t050_auto_noframe.png`, `nf/NF_cw_bga_t050_auto_noframe.png`.
- Where: 00027 lts_lts s15-s27 and CoWoS on_substrate-bga, at Block, Auto, t = 0.5, illustrative.
- What is wrong:
  - The Block pose fitted on a 1.5 mm die-on-interposer stack is kept when the stack flips (s22) or grows to package
    plus PCB (7 mm, s24 / s25).
  - The frame shows a close-up of laminate texture. The package is cut off at the top or out of frame, and the ruler is
    off-screen.
  - The PiP Wafer view keeps the 300 mm wafer zoom, so the 50 mm CoWoS unit is a few pixels.
  - Play from step 1 gives these frames by default; the user must know to press Frame.
- Real look: an engineer expects the camera angle to persist but the part to stay in view.
- Fix:
  - persist orbit angles and the user's zoom as a ratio of the fitted distance, not absolute positions;
  - when a scale's workpiece box changes by more than about 1.5x or its centre leaves the frustum, re-target and
    re-scale at the step boundary, keeping the angles;
  - always do this for the PiP.
- Owner: engine (viewer camera memory).

### Major

**N2. Bodies larger than the cell window are drawn unclipped at the Cell scale**

- Shots:
  - `r2/v1re/F36_et03_bridge_t100_cell_ill.png` (EMIB-T bridge_place_t, t = 1);
  - `r2/all/A_emt_08_fli_t_t050.png` (EMIB-T fli_t, t = 0.5);
  - `r2/tgt/T_p15_reflow_t100_cell.png` (00027 s15, t = 1);
  - `r2/tgt/T_p22_ball_t100_cell.png` (00027 s22, t = 1).
- What is wrong:
  - The substrate's bottom BGA lands (z 600-615) render as a pink disc 5-10x the cell width under the cell.
  - At s22 a single 500 um ball renders as a grey ellipse spanning the whole view above a 100 um cell.
  - Both read as foreign objects. The lands appeared with the 21:49 data, so the cell view was not checked after that
    data change.
- Real look: a unit-cell cross-section is cut on all four sides; a land or ball wider than the cell shows as a cut slab
  or segment.
- Fix:
  - apply the cell window clip (or trim) to pads, lands and solder bodies, like slabs;
  - add a render_process3d.py check that flags meshes whose projected box exceeds the cell window by more than 10 %.
- Owner: engine.

**N3. Dicing ends with a single die on an empty tape; the diced wafer vanishes**

- Shots: `r2/tgt/T_cw11_saw_t030_work.png` (wafer with kerfs, right), `r2/tgt/T_cw11_saw_t070_work.png`,
  `r2/tgt/T_cw22_sing_t100_work.png`.
- Where: CoWoS logic_saw (chip D wafer 2/2, t = 0.7 and 1.0) and singulate (t = 1.0), Wafer scale.
- What is wrong:
  - Chip C's wafer shows kerf lines at t = 0.3.
  - Chip D's wafer is never drawn: at t = 0.7 (HUD "cut line 33 / 66") the frame holds one die on a 300 mm tape frame
    under the blade.
  - At singulate t = 1 the CoW wafer is replaced by one unit on the tape.
- Real look: the wafer stays whole on the tape with kerfs through it; dies are picked one by one in the next step.
- Fix:
  - keep the wafer piece (diced, with kerfs) until the pick / place step;
  - draw the chip D wafer in its sub-op;
  - hand off to a single die only at the pick.
- Owner: engine (piece hand-off timing); data (sub-op piece for chip D).

**N4. The mold chase does not move; the molding step reads as a still picture**

- Shots: `r2/tgt/T_cw15_mold_t020_work.png`, `r2/tgt/T_cw15_mold_t040_work.png`, `r2/tgt/T_cw15_mold_t080_work.png`
  (also `r2/v1re/F16_*`).
- Where: CoWoS mold, t 0.2 -> 1.0, Wafer scale.
- What is wrong:
  - The upper chase pose is identical at every t.
  - The HUD gap goes 1372 -> 831 um, invisible at a 20 mm field.
  - No EMC charge or flow is visible on the wafer until the top turns black at t = 1.
  - The guide pillars and the cylinder (transfer ram?) dominate the frame.
- Real look: in compression molding the lower cavity holds the granular EMC on the release film. The chase closes and
  the melt spreads radially over the dies under the clamp force, followed by cure.
- Fix:
  - exaggerate the chase stroke in illustrative mode (or show a cutaway inset at the cavity edge);
  - draw the EMC charge and the radial flow front on the wafer (engine `front` exists);
  - drop or dim the side cylinder.
- Owner: assembly tools (mold_chase); engine (front mapping at the Wafer scale).

**N5. Laser debond: the beam hangs in the air, a dark disc floats above the wafer, and the head sits on the wafer**

- Shots: `r2/all/A_p27_lts_lts_11_s10_t050.png`, `r2/v1re/F41_cw21_debond_t050_auto.png`,
  `r2/tgt/T_p11_debond_t080_work.png`.
- Where: 00027 s10 and CoWoS debond, t = 0.5 / 0.8, Wafer scale.
- What is wrong:
  - At t = 0.5 a thin purple line ends in mid-air under a large dark-brown translucent ellipse floating above the
    wafer. The line scan on the carrier is not visible.
  - At t = 0.8 a grey cylinder (the head?) stands on the wafer, cut by the same floating disc.
- Real look:
  - A 308 nm line beam (DevLog F-rows: 12.2 m/s scan) sweeps across the glass carrier.
  - The release layer darkens behind the scan line, and the carrier lifts off after the scan.
- Fix:
  - put the beam line on the carrier top surface and draw the scanned / unscanned boundary on the release layer;
  - hide the "disc" (likely the optics-housing occluder at fade);
  - keep the head above the wafer.
- Owner: fab tools (laser_debond); engine (occluder fade).

### Minor

| id | shot | where | what is wrong / real look | fix | owner |
|---|---|---|---|---|---|
| n1 | `r2/tgt/T_p25_reflow_t100_cell.png` vs `r2/tgt/T_p25_reflow_t100_block_act.png` | 00027 s25, Cell, illustrative | The illustrative z map squashes a 500 um BGA joint into a flat 600:70 px pill, while 30 um uBumps become needles (m4). In Actual the ball is a correct sphere. Solder shape flips with the scale mode. | Map solder bodies with one uniform scale per body (keep aspect), or print the per-body exaggeration | engine |
| n2 | `r2/v1re/F20_p27_s22_ball_t050_block_ill.png` | 00027 s22, t = 0.5 | Balls already show a necked base at placement, before reflow. A placed ball is a sphere on a flux dot. | Neck only after the peak passes liquidus | engine |
| n3 | `r2/all/A_cw_14_uf1_cure_t050.png` | all cure-oven steps, Block | Light-grey oven wall behind the block (M5 residual) | Hide the oven at Block / Cell, as for reflow_oven | fab tools (cure_oven) |
| n4 | `r2/tgt/T_p09_s08_t050_block.png` | 00027 s08, Block | Spray / spin puddle backdrop (known) | Drop the bowl at Block | fab tools (spin_coater) |
| n5 | `r2/tgt/T_et05_encap_t010_work.png` | EMIB-T encap, EMIB final_lam, buildup, Wafer | Diaphragm washes out the panel (known) | Lower diaphragm opacity or cut it away over the panel | assembly tools (laminator) |
| n6 | `r2/v1re/F10_cw05_cmp_t050_cell_ill.png`, `light/L_cw05_cmp.png` | CoWoS tsv_cmp HUD | "removal rate 1027 nm": unit missing /min (the header line says 1027 nm/min) | Unit from the PDim | engine / data |
| n7 | `r2/v1re/F11_cw12_cow_t100_block_ill.png`, `narrow/N_cw12_cow_hud_expanded.png` | CoWoS cow_bond HUD | The text value "Cu uBump to Al pad; full IMC joint" overflows the right edge of the HUD grid | Ellipsis plus tooltip, or full-row span for text values | engine (Hud.svelte) |
| n8 | `narrow/N_em08_tcb.png`, `narrow/N_cw05_cmp.png` | 390 px | Ruler labels clipped at the right edge; the top label overlaps the model edge | Inset the ruler by its label width under 480 px | engine |
| n9 | `inter/m14_single_*.png` | 3D tab Single | m14 confirmed (see above) | Single's camera init must not read state left by Process (shared viewport size / controls) | engine (3D tab) |

## Checks that pass

- Landing on Compare. One WebGL canvas in Process. Compare and Gallery pixel-identical after Process (0 px).
- Render on demand: 0 rAF callbacks in 2 s idle and in 1.5 s after pause.
- Transport:
  - Space play / pause; R reverse (51 % -> 26 %);
  - Left / Right, buttons and keys, land on step starts; Shift+Right +1 %; Home / End;
  - [ ] speed 1 -> 4; L loop wraps End -> 1/27; play at the end without loop restarts;
  - scrub drag -> 17/27 74 %; hash written on pause and scrub.
  - 1 / 2 / 3 / 0 scale keys; I toggles Actual. Modifier keys are ignored.
- State determinism: forward vs backward sweep with 41 points per route on cowos main, emib, emib_t and 00027
  lts_lts: 0 mismatches.
- No page errors in any run.
- Light theme: fresh load and live toggle correct.
- Reads right at V2:
  - grinder wheel over the chuck with grind arcs on the wafer;
  - CMP head over the grooved pad with the slurry arm;
  - ECP clamshell face-down in the electrolyte;
  - DRIE chamber glow;
  - wafer bonder platens;
  - stencil squeegee on the PCB;
  - EMIB open cavity with the bridge seated;
  - UF1 / UF2 cell views with the black underfill between joints;
  - smooth SnPb C4 caps on the revealed tips;
  - CoWoS C4 joint on the FCBGA land at the Cell scale;
  - EMC filler speckle and the woven core;
  - green solder resist.
