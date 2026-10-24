---
title: Audit V1 - process-flow animation (DevLog-016), visual / UX / physical appearance
date: 2026-10-23
auditor: fresh-context subagent V1 (built none of it)
scope: 3D tab Process mode (app/src/routes/3d/+page.svelte, app/src/lib/process/), app/static/data/process3d.json (built 2026-10-23 19:09)
---

# Audit V1: process-flow animation, visual / UX / physical appearance

## Verdict

Not ready to show. The controls (play, reverse, step, scrub, speed, loop, keyboard, hash on fresh load) work. The
render-on-demand loop works. Single / Compare / Gallery are unaffected. The HUD carries provenance tooltips that
resolve to papers.

Three problems undo the "physically faithful" and "materials through the process" goals:

- Several wafer-scale steps put the camera inside or behind the tool, so the frame shows no wafer (C1).
- A bright white environment makes Si, Cu and solder all render near-white (C2).
- The EMIB cavity and build-up stack are drawn wrong (C3), and that is the defining feature of the EMIB flow.

There are 13 major findings. Most are about legibility (HUD, ruler, narrow layout, tool backdrops) or wrong-looking
materials and tools (grind marks, reflowed solder, plated Cu, the tool picked for the TSV-reveal recess etch).

Counts: 3 critical, 13 major, 14 minor.

## Method (what ran)

- Server: own dev server, tmux `apa-v1`, http://127.0.0.1:47365 (stopped at the end). Headless Chromium (SwiftShader).
  Driven through `window.__apaProc` plus real keyboard / mouse.
- First pass, about 290 screenshots:
  - every step of every route at t = 0.5 (80 steps: cowos_s main 28, emib 12, emib_t 13, 00027 lts_lts 27);
  - t sweeps (0.05-1.0) on TSV etch, ECP, CMP, CoW TCB, UF1, mold, TSV reveal, C4, on-substrate, UF2, ring, BGA, the
    00027 reflows, X-ray, EMIB TCB / CUF / BGA, EMIB-T bridge;
  - Wafer / Block / Cell overrides; actual vs illustrative; PiP on / off;
  - the 00027 route-specific steps (s22, s23, s25) on all three routes;
  - 390 x 844 viewport; light theme (fresh load and live toggle).
- Every screenshot was looked at, mostly as 2 x 2 or 2 x 3 contact sheets plus full-size crops.
- L35 engine files (joint.ts, prims.ts, solder.ts, ...) changed at 19:24-19:25 during the audit. Every cited shot was
  re-rendered after that, at 19:29-19:40, against that code and the 19:09 JSON.
- Interaction script: `cache/process3d_renders/audit_V1/20261023_183800/interact.py`; results in `inter/interact.json`.
- Shot script: `shots.py` with `jobs_*.json` in the same folder. Kept: only the cited shots.
- Not tested:
  - GPU frame time (software GL only);
  - touch input;
  - the other 00027 routes' remaining steps (they share the lts_lts steps).

Paths below are relative to `cache/process3d_renders/audit_V1/20261023_183800/`.

## Coordinator observations

| observation | status | evidence |
|---|---|---|
| HUD panel overlaps the z-ruler labels | Confirmed, worse than reported. The ruler is drawn above the HUD (later in the DOM, no z-index) and is anchored to the model's left edge, which often lies under the 290 px HUD. Labels print over HUD values. | M1 |
| Si renders near-white instead of polished dark grey | Confirmed. Si faces at the cell scale sample RGB 152-206 (`shots/F10`); a ground die back samples 255,255,255 (`shots/F11`). Cu pillars and solder balls are also near-white (C2). Cause: low-roughness metal shading reflecting a bright, uniform RoomEnvironment (materials/index.ts createProcEnvironment) plus hemisphere 1.4 + directional 1.6 lights (viewer.ts:131-133). | C2 |

## Known items (other lanes): status seen in this build

| item | seen now |
|---|---|
| EMIB single bridge | The data has two cavities (`cav_1`, `cav_2`). The block window shows one bridge under both dies (`shots/F15`). Not resolved visually. |
| Underfill fill time in hours | Now about 1 h, not the 8-25 h A1 reported: UF1 1 h 13 min, CUF 1 h 2 min, 00027 s03 1 h 0 min, s18 1 h 35 min, UF2 36 min. |
| Grind stage times | logic_thin: 2 min 12 s total. TSV-reveal grind: 38 s at 5 um/s for 190 um, but the step total is N/A. mold_grind, s05 and s07 totals are N/A (see M3). |
| SnPb peaks | The HUD shows a C4 reflow peak of 218 C with liquidus 183 C (process value). No longer the classification limit. |
| Solder melting below liquidus | The HUD shows a per-route liquidus (e.g. lts_sac: peak 160 C, paste liquidus 220 C). Melt state was not judged visually; the joint views look the same across routes at t = 0.6. |
| EMIB lid without TIM | Block scale: the lid looks seated; the HUD shows TIM 85 um. Cell scale in the BGA step: a black gap between die back and lid (m13). |
| EMIB-T via/pad mismatch | Not judged (not visible at default views). |
| TSV-M1 connection | Looks addressed: a Cu landing pad sits on the TSV top inside the IMD stack (`shots/F45`). |
| Composite provenance statuses | Data only; not in V1 scope. |

Fixed during the audit window (render 19:14 vs 19:29): CoWoS on_substrate and 00027 s15 reflow had the interposer
floating about 1 mm above the substrate at t = 1. After the L35 19:25 edit, the joints seat on the substrate
(`shots/F34`, `shots/F35`).

## Findings

Owner keys: engine = L35 core (`app/src/lib/process/*.ts`, `*.svelte`); materials = L36; fab tools = L37;
assembly tools = L38; data = L34 (process3d.json / config).

### Critical

**C1. Wafer-scale primary steps show the tool interior or nothing; no wafer in frame**
- Shots: `shots/F06_cw10_logic_thin_t050_auto.png`, `shots/F16_cw15_mold_t050_auto.png`,
  `shots/F17_cw18_carrier_bond_t050_auto.png`, `shots/F44_p27_s23_print_t050_work_ill.png`.
- Where: CoWoS logic_thin (step 10), mold (15), carrier_bond (18); 00027 s23 print (work override). t = 0.5,
  Auto / Wafer, illustrative.
- What is wrong:
  - logic_thin is an almost blank white-grey frame (camera inside the grinder wheel / housing).
  - mold shows only chase walls and guide pillars.
  - carrier_bond shows only bonder plates and columns.
  - print shows a squeegee bar on white with no PCB or stencil.
  - These steps are the primary scale for their process, so the step communicates nothing. L35 noted large tool models
    filling the camera, but it still happens on 4+ steps.
- Real look:
  - grinder: wafer on the porous chuck with the cup wheel overlapping the centre (F123);
  - mold: wafer in the lower chase with the release film and EMC charge;
  - bonder: wafer + adhesive + glass between the platens;
  - printer: a squeegee rolling a paste bead over the stencil on the PCB.
- Fix:
  - frame the work camera on the workpiece, not the tool bounds;
  - clip or cut away the tool (section / cutaway, or fade tool parts between the camera and the workpiece);
  - add a check in render_process3d.py that fails when the workpiece projected area is below N % of the frame.
- Owner: engine (camera director, tool cutaway); fab tools (grinder, wafer_bonder); assembly tools (mold_chase,
  stencil_printer).

**C2. Metals and Si render near-white; material identity is lost**
- Shots: `shots/F10_cw05_cmp_t050_cell_ill.png` (Si RGB 152-206), `shots/F11_cw12_cow_t100_block_ill.png` (die back
  255,255,255), `shots/F15_em08_tcb_t050_block_ill.png` (Cu pillars near-white with a pink tint),
  `shots/F20_p27_s22_ball_t050_block_ill.png` (SnBi balls 255,255,255).
- Where: all flows, all scales, illustrative and actual.
- What is wrong:
  - Polished Si reads as light grey-blue to white.
  - Cu pillars / uBumps read pink-white; solder balls read pure white.
  - Si, oxide, Cu and solder become hard to tell apart, which defeats the materials requirement.
- Real look:
  - Polished Si is a dark grey mirror; with n,k from Green 2008 (L36 optics.ts, F0 about 0.35-0.41) it shows a
    neutral dark grey under diffuse light.
  - Cu is orange-copper (F0 about 0.95 / 0.64 / 0.54).
  - SnBi / SAC / SnPb are mid-grey metallic.
- Fix:
  - darker, non-uniform procedural environment (studio-style: dark surround, a few soft boxes) or envMapIntensity
    about 0.3-0.5 for metals and Si;
  - lower the hemisphere light;
  - check Cu / Si / solder swatches on the actual 3D-tab background, not only in the lab page.
- Owner: materials (environment, metal F0 application); engine (scene lights).

**C3. EMIB cavity and build-up stack geometry wrong: the cavity is not an open pocket; dielectric layers float**
- Shots: `shots/G1_em02_cavity_t100_block_ill.png`, `shots/G4_et02_cavity_t100_block_ill.png`,
  `shots/F38_em03_bridge_t050_block_ill.png`, `shots/F37_em01_buildup_t050_cell_ill.png`.
- Where: EMIB cavity (step 2, t = 1, block), EMIB-T cavity_t (2), bridge_place (3, t = 0.5); build-up (1, t = 0.5,
  cell).
- What is wrong:
  - After cavity formation the cavity shows as three separate black slots with intact pale sheets running across it at
    the Cu-level / dry-film z positions. The bridge then sits sandwiched between these sheets (F38).
  - At the cell scale the ABF layers float as separate 15 um slabs with 15 um empty black gaps, where the Cu line
    levels (cu_1..cu_4) should be.
  - The cut hosts list abf_2..4 and cu_2..4, but the drawn sheets survive. The line-level slabs seem not drawn as
    dielectric at the cell scale, and dfr_* (dry-film resist) bodies seem to keep z space.
- Real look:
  - A laser-routed / etched EMIB cavity is one open pocket through the top build-up layers down to a Cu stop pad
    (Intel flow A190; depth = bridge + adhesive, A201 N/A).
  - The SAP Cu lines sit embedded in the next ABF layer, with no air gaps.
  - Dry-film resist is stripped after each plating and leaves no layer.
- Fix:
  - line-level slabs must render as dielectric with embedded conductor at every scale;
  - dfr bodies must be removed (or have zero z) after strip;
  - the cavity cut must remove every body in its z range, including line levels, films and resist;
  - add a builder check "no body occupies a cut volume after the cut op".
- Owner: engine (line-level slab rendering, cut application); data (cavity hosts, dfr lifetime in
  config/process3d/geometry/emib.yaml).

### Major

**M1. z-ruler overlaps the HUD**
- Shots: `shots/F08_et03_bridge_t100_block_ill.png`, `shots/F11_cw12_cow_t100_block_ill.png`,
  `narrow/N_cw12_cow.png`.
- Where: most block / cell views, both modes. Worst in EMIB-T bridge (labels 2218-2098 printed over "joint h um",
  "liquidus c", "bond force") and on the narrow viewport.
- What is wrong: the ruler ticks and labels render on top of the HUD text; both become unreadable.
- Real look: a pro tool (COMSOL / Grafana) keeps axis annotation clear of panels.
- Fix:
  - reserve the HUD rectangle as a no-go zone for the ruler (place the ruler on the model's right side, or offset the
    camera so the model's left edge clears HUD width + margin);
  - put the HUD above the ruler (z-index) as a fallback.
- Owner: engine (viewer overlay, ProcessView.svelte).

**M2. HUD too tall and wordy; the profile plot gets pushed off-screen**
- Shots: `shots/F13_cw20_c4_t100_cell_ill.png`, `shots/F45_cw06_beol_t050_cell_ill.png`,
  `shots/F37_em01_buildup_t050_cell_ill.png`.
- Where: steps with composite sub-ops. Heights from interact.json:
  - fs_interconnect 757 px, emib buildup 757, tsv_reveal 722, emib via_plating 696, c4_bumping 690, ubump_interposer
    677;
  - 11 of 80 steps are over 500 px.
- What is wrong:
  - Parameter labels are the full sub-op name plus quantity (e.g. "Bosch DRIE of the 10 x 100 um TSV: etch per cycle
    um"). In a 2-column, 290 px grid they wrap to 3-4 lines.
  - The HUD covers the left third of the view, and the T(t) plot in C4 is cut off at the bottom.
  - The house style is dense with details in tooltips.
- Fix:
  - group parameters by sub-op (collapsed header with the current sub-op expanded);
  - short labels (quantity only) with the full name in the tooltip;
  - pin the profile plot and the live readouts above the parameter list.
- Owner: engine (Hud.svelte); data (short `label` per hud item).

**M3. "real time" is N/A on 52 of 80 steps, including steps whose durations are stated**
- Shot: `shots/F23_cw01_etch_t070_cell_act.png`; table `inter/interact.json` (real_time).
- Where:
  - tsv_etch: the HUD lists "Bosch DRIE ... time 1651 s" but real time is N/A / N/A;
  - c4_bumping: plating 4311 s listed, real time N/A;
  - fs_interconnect lists 138 s plating and 58.4 s CMP, real time N/A;
  - tsv_reveal: real time runs to 5 min 42 s at t = 0.5, then the total is N/A.
- What is wrong: one sub-op without a duration voids the step clock. The request asked for real time in the HUD.
- Fix:
  - sum known op durations;
  - show unknown ops as "+ N/A" (e.g. "38 min 12 s + 2 ops N/A");
  - keep the per-op elapsed time live.
- Owner: engine (state.ts timing, Hud.svelte); data (durations where a source exists).

**M4. 390 px viewport: controls clipped, HUD covers the model**
- Shots: `narrow/N_cw05_cmp.png`, `narrow/N_cw12_cow.png`, `narrow/N_em08_tcb.png`, `narrow/N_p06_grind.png`.
- Where: all.
- What is wrong:
  - `.pv` content is 435 px wide in a 390 px viewport (measured scrollWidth); it is clipped with no horizontal scroll.
  - The PiP toggle and the step position readout ("5/2...") are cut off.
  - The scrub bar is 120 px.
  - The HUD (290 x 312 px) covers about 60 % of the 506 px view.
  - The inspector (summary and step list) gets 100 px.
  - z labels print over the HUD.
- Fix:
  - wrap the transport row to two lines under 480 px;
  - collapse the HUD to a one-line strip (step, op, real time) with tap-to-expand;
  - hide the ruler or move it right;
  - make the step list a dropdown.
- Owner: engine (ProcessView.svelte, Controls.svelte CSS).

**M5. Block-scale views wash out behind bright tool geometry; ruler and scale bar unreadable**
- Shots: `shots/F01_cw23_onsub_t100_block_ill.png`, `shots/F40_cw17_moldgrind_t050_block_ill.png`,
  `shots/F35_p27_s15_reflow_t100_block_act.png`.
- Where: on_substrate (wet bench bowl), mold_grind (wheel), 00027 s15 reflow (oven zones), at the block scale.
- What is wrong:
  - mm-scale tool parts fill the background with large white surfaces; in F40 a dark wheel slab cuts across the
    block.
  - Grey ruler labels and the "100 um block ..." scale-bar text sit on white and vanish.
  - Tool context at the block scale reads as clutter, not as process.
- Real look: at a 1 mm cross-section scale only the tool's contact element is relevant (wheel segment edge, nozzle tip,
  head face).
- Fix:
  - at the block / cell scale draw only the contact element (L37 / L38 "most involved part"), clipped to the window;
  - dim the rest to 20-30 % or omit it;
  - give the overlay text a background chip.
- Owner: fab tools, assembly tools (per-scale LOD); engine (overlay styling).

**M6. TSV-reveal Si recess etch drawn with the laser drill**
- Shot: `shots/F39_cw19_reveal_t050_auto.png`.
- Where: CoWoS tsv_reveal, sub-op "Si recess dry etch" (2/4), t = 0.5.
- What is wrong:
  - Tool readouts: "CO2 wavelength 9.3 um, via (spot) diameter 42 um, drill rate 850 holes/s, vias in view 4000".
  - The PiP shows a laser head over the wafer.
- Real look: blanket Si plasma etch (SPTS Rapier XE, > 9 um/min, 200:1 to liner; F141, F140-F142) in an ICP chamber.
- Fix: map `etch_recess` with a plasma method to the `drie` (or a `plasma_etch`) actor; never default a blanket etch
  to laser_drill.
- Owner: data (tool id on the op); engine (method-to-tool default).

**M7. EMIB bridge adhesive shown with a spin coater on the substrate panel**
- Shot: `shots/F38_em03_bridge_t050_block_ill.png` (HUD tool: spin_coater, "spin speed 2200 rpm, soft bake 120 C").
- Where: EMIB bridge_place (3), sub-op "adhesive (form not stated)".
- What is wrong: the HUD presents spin coating, which is not a known step for a cavity in an organic panel.
- Real look: Intel says only "held with adhesive" (A190); type and thickness N/A (A201). A die-attach film on the bridge
  back or a dispensed dot is the plausible form.
- Fix: no tool actor, or a neutral dispense actor labelled "form not reported", when the form is not stated.
- Owner: data; engine (default tool for `coat` without a method).

**M8. Grind marks form a sunburst centred on each die and block**
- Shots: `shots/F11_cw12_cow_t100_block_ill.png` (die backs), `shots/F01_cw23_onsub_t100_block_ill.png` (PiP: sunburst
  centred on the interposer).
- Where: CoW bond and later steps, block and work scales.
- What is wrong: the arc pattern is evaluated in each object's local frame, so every die back shows its own radial
  star.
- Real look:
  - In-feed grinding leaves radial curved saw marks centred on the chuck / wafer centre (F128: "saw marks extend
    radially"; F123 wheel through the centre).
  - A diced die carries a near-straight-arc segment of the wafer pattern; the direction depends on where it sat on the
    wafer.
- Fix: evaluate the grind pattern in the source wafer frame; pass the wafer-centre offset of each die / unit to
  `setGrindWheel`.
- Owner: materials (pattern coordinates); engine (pass per-piece wafer origin).

**M9. Reflowed solder looks like a faceted cobblestone**
- Shots: `shots/F13_cw20_c4_t100_cell_ill.png` (C4), `shots/F34_cw23_onsub_t100_cell_ill.png` (C4 joint),
  `shots/F36_et03_bridge_t100_cell_ill.png` (EMIB-T cavity joint), `shots/F42_cw21_debond_t050_block_ill.png`.
- Where: after every reflow, at the cell and block scales.
- What is wrong: the solder surface shows 10-20 um high-contrast Voronoi facets and reads as rock or cauliflower.
- Real look:
  - Reflowed SnPb eutectic is smooth and specular (surface tension of the liquid).
  - SAC and SnBi are smooth with a satin / frosted sheen.
  - Solidification texture is sub-um to a few um and invisible at a 50-200 um field of view.
  - The paste-to-liquid-sheen transition is in the design table (DevLog-016 "solder reflow").
- Fix: tie the facet amplitude to the `melt` / `finish` state and to physical feature size: zero facets after reflow;
  a fine low-amplitude frost only for SAC.
- Owner: materials.

**M10. Plated Cu reads as pink / white pixel noise**
- Shots: `shots/Z_ecp_t060.png`, `shots/F45_cw06_beol_t050_cell_ill.png`, `shots/F13_cw20_c4_t100_cell_ill.png`
  (uBump Cu).
- Where: ECP, damascene, uBump and line Cu at the cell and block scales.
- What is wrong: high-contrast blocky grain (pink and near-white cells) at a 50 um field of view; overall hue pale
  pink, not copper.
- Real look:
  - As-plated Cu is uniformly copper-orange and satin.
  - Grains (about 0.5-2 um after self-anneal) do not resolve at these fields.
  - After CMP it is a bright copper mirror with slight dishing.
- Fix: scale grain contrast by on-screen grain size (fade below about 3 px); lower the contrast; keep the copper F0.
- Owner: materials.

**M11. White plug at the TSV bottom from ECP through BEOL**
- Shots: `shots/Z_ecp_t020.png`, `shots/Z_cmp_t090.png`.
- Where: CoWoS steps 4-9, cell scale.
- What is wrong: the bottom 4.8 um of the TSV (body `tsv_tip`, declared Cu, z 675.2-680 um) renders white or bright
  and reads as an unfilled void or oxide plug. It exists before the via is filled.
- Real look: the via is filled with Cu to the bottom; the tip only becomes a separate feature at the reveal.
- Fix: create `tsv_tip` at the reveal step (or render it with the `tsv_cu` material and state); it must not exist before
  ECP.
- Owner: data (body lifetime); engine (post rendering and material state).

**M12. Ball attach (00027 s22): white spheres on oversized white lozenges**
- Shot: `shots/F20_p27_s22_ball_t050_block_ill.png`.
- Where: 00027 s22, t = 0.5, block, illustrative.
- What is wrong:
  - SnBi balls render pure white.
  - Flux / attached deposits are flat white lozenges about 1.3x the ball diameter. One overhangs the substrate edge.
    Balls intersect them.
- Real look:
  - Flux dots are thin and translucent, within the pad diameter.
  - Placed balls sit on them.
  - After reflow the balls are truncated spheres (about 0.8 D tall), metallic grey.
- Fix: the flux body uses a translucent flux material sized to the pad; clip deposits to the substrate; reflowed ball
  shape from the volume-conserving cap solver.
- Owner: assembly tools (ball_placer deposits); materials (flux, SnBi); engine (ball shape).

**M13. EMIB BGA step shows no balls**
- Shots: `shots/F30_em12_bga_t100_block_ill.png`, `shots/Q_em12_bga_t100_cell.png`,
  `shots/Q_em12_bga_t100_work.png`.
- Where: EMIB bga (12), t = 1.0, block / cell / work.
- What is wrong: the HUD reports 600 um balls at 1000 um pitch and "balls on this head 4225". No ball is visible at the
  block or cell scale; the work scale shows only a fine grid texture. CoWoS BGA shows balls at both scales.
- Fix: check the ball body window, orientation (`dir: down` after the flip) and z map for the EMIB substrate.
- Owner: engine; data.

### Minor

| id | shot | where | what is wrong / real look | fix | owner |
|---|---|---|---|---|---|
| m1 | `inter/theme_light_toggled_live.png` | live theme toggle while in Process | Canvas background stays RGB 13,13,13 after switching to light. A fresh light load is correct (241,240,236, `light/L_cw05_cmp.png`). | Observe `ui.theme` and call `setBackground` on change. | engine |
| m2 | `shots/F42_cw21_debond_t050_block_ill.png` | carrier and debond steps | The glass carrier renders as an opaque dark-grey slab, indistinguishable from Si / EMC. Laser debond works through a transparent carrier. | Higher transmission, slight green edge tint, visible thickness edges. | materials |
| m3 | `shots/Z_etch_t090.png` | TSV etch, cell | The half-wall of the etched hole shades like a convex solid rod. | Darken the hole interior (AO / interior tint) and show the rim edge. | materials, engine |
| m4 | `shots/F15_em08_tcb_t050_block_ill.png` | EMIB TCB, illustrative | The z map turns 30-55 um bumps into 10:1 needles. | Cap the per-feature vertical exaggeration or print the exaggeration factor in the scale note. | engine |
| m5 | `shots/F39_cw19_reveal_t050_auto.png` (PiP) | laser_drill actor | The CO2 (9.3 um) beam is drawn as a visible red cone. | A neutral, faint beam with the wavelength label. | assembly tools |
| m6 | `shots/F10_cw05_cmp_t050_cell_ill.png`, `shots/F11_cw12_cow_t100_block_ill.png` | HUD | Dimensionless unit printed ("ubump count 270000 1", "pad contact 1 1", "vacuum on die 1 1"). Raw keys as labels ("rr nm min", "al pitch um", "adh h um", "cav floor um"). | Hide unit "1"; booleans as on / off; labels from a label map. | engine, data |
| m7 | interact.json (HUD sampling) | mold, carrier_bond | Real time stays at 0 s for the first about 55 % of step playback (approach), then jumps (mold 0 s at t 0.5, 5 min 23 s at 0.7, 15 min at 0.9). | Shorter approach phase, or show "approach" in place of 0 s. | engine |
| m8 | interact.json | playback at < 10 fps | dt is clamped to 0.1 s per frame, so playback runs slower than real time. 4x for 1.5 s advanced 36 % of a 10 s step (expected about 60 %) at 7 fps (SwiftShader). | Clamp only after tab-hidden gaps; use wall time otherwise. | engine |
| m9 | interact.json route_switch_ui | route select | Switching route keeps the index, not the step: emib 4 "final_lam" became emib_t 4 "bridge_uf_t". | Keep the same step id when it exists, else the nearest shared step. | engine |
| m10 | interact.json hash_edit_in_open_tab | URL | Editing or pasting a process hash in an open tab leaves the view on the old flow (URL says cowos tsv_cmp, view stays on emib_t 4/13). A fresh load restores correctly (5/28, 42 %, Actual, Cell). | Handle hashchange in process mode. | engine |
| m11 | interact.json meta_bracket_right_speed | keyboard | Modifiers are not checked: Cmd+] changed speed 1 to 2. Cmd+[ is browser Back; Cmd+1..3 would change the scale. | Ignore keys with meta / ctrl / alt. | engine |
| m12 | `shots/F29_p27_s13_pcb_t050_block_ill.png` | 00027 s13 | The 28-layer PCB is a uniform woven laminate with no Cu planes (2 draw calls). | Draw plane / signal layers (line levels). | data, engine |
| m13 | `shots/Q_em12_bga_t100_cell.png` | EMIB bga, cell | The lid shows the plated-Cu cobblestone texture. A black gap sits between die back and lid, with no TIM visible. | Lid material Ni-plated Cu (smooth); render TIM in the cell window. | materials, data |
| m14 | (no shot kept; interact.json mode_Single_pixels_diff_gt30 = 159,696) | 3D tab Single | After visiting Process, Single shows the same content but a slightly shifted framing. Compare and Gallery are pixel-identical. Low confidence: may be camera nondeterminism unrelated to Process. | Check that Single's camera init does not depend on prior mode. | engine (3D tab) |

## Checks that pass

- Default landing Compare; one WebGL canvas in Process (dynamic import); Single / Compare / Gallery content unchanged
  (see m14 for the Single framing note).
- Render on demand:
  - 0 rAF callbacks in 2 s idle;
  - 0 in 1.5 s after pause;
  - 7 per s while playing (SwiftShader).
- Transport and keyboard:
  - Space play / pause; R reverse (26 % to 13 %);
  - Left / Right step boundaries; Shift+Right +1 %; Home / End;
  - [ ] speed (1x to 4x); L loop (End + play wraps to 1/27);
  - play at the end without loop restarts;
  - scrub drag lands at 17/27 74 %;
  - 1 / 2 / 3 / 0 scale; I toggles Actual.
  - Hash written on pause and scrub (`...&step=s17&t=0.740`).
- Fresh-load hash round trip with scale and ill=0 restores step, t, Actual and Cell.
- HUD provenance tooltips resolve to paper, locator and DB cell (e.g. CoW TCB 440 C, R50).
- The pick panel lists body dims with status.
- Scrub-bar step tooltips work.
- Reads right:
  - DRIE chamber glow;
  - CVD showerhead;
  - ECP clamshell;
  - CMP head over the grooved pad with slurry;
  - TCB head with dual set / joint traces;
  - jet dispenser over the CoW wafer;
  - laser debond line scan (glass carrier visible at the wafer scale);
  - EMC filler speckle;
  - ABF over the woven core;
  - green solder resist;
  - bottom-up ECP front rising in the via (`shots/Z_ecp_t020.png`, `Z_ecp_t060.png`).
- No page errors in any run.
