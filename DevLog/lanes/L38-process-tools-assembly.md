---
title: Lane L38 - assembly / substrate tool actors and dev-only tool lab
date: 2026-10-23
status: done (2026-10-23); hand-off below
scope: app/src/lib/process/tools/assembly/ (actors, index.ts, lab/), this file
owner: lane L38 (Claude subagent, DevLog-016 tool agent E3, assembly half)
---

# L38: assembly tool actors

Binding inputs: DevLog-016 (tools section), config/process3d/CONTRACT.md section 11 (ToolActor / ToolFrame / ToolCtx,
tool ids, OP_TOOL), app/src/lib/process/types.ts, config/process3d/RESEARCH_TOOLS_ASSEMBLY.md (rows A1-A202), L36
material library (app/src/lib/process/materials/).

Constraints: no git writes; no subagents; no engine-file edits (tools/index.ts belongs to L35); no paper retrieval;
own dev server tmux `apa-l38` on 127.0.0.1:47364 (stopped at the end).

## Files

| path | content |
|---|---|
| `tools/assembly/common.ts` | PDim builders (`rep` = research row, `der`, `tpl`), arg resolution (args override spec), `BaseActor` (rigs, per-rig/material merged meshes, lazy ProcMaterial binding via `ctx.mat`, additive guide materials for beams / X-ray cones), site grids, perforated plates, HUD extras types |
| `tools/assembly/{tcb_head,pick_place,jet_dispenser,mold_chase,reflow_oven,ball_placer,stencil_printer,laminator,laser_drill,xray_ct}.ts` | actors |
| `tools/assembly/index.ts` | `ASSEMBLY_TOOLS: Record<string, (args?) => ToolActor>` keyed by contract ids |
| `tools/assembly/lab/index.htm`, `lab/lab.ts` | dev-only tool lab (served raw by Vite at `/src/lib/process/tools/assembly/lab/index.htm`; not imported, not in `pnpm build`: verified by grep of `app/build`) |
| `tools/assembly/lab/shoot.py` | Playwright screenshots (`uv run --with playwright python app/src/lib/process/tools/assembly/lab/shoot.py [--actual] [--only ID ..] [--ts ..]`) |

## Per-tool table

Spec counts = reported / derived / template PDims in `spec` (reported = research row id in `ref`; web lookups made in
this lane are `template` with `source` URL, since they are not research rows).

| tool id | ops | parts modeled | spec r/d/t | motions | scales |
|---|---|---|---|---|---|
| `tcb_head` | bond_tcb | ceramic tool (collet) face, pulse heater, head body, Z slide + rail, vacuum fitting, heated vacuum chuck; block: tool face cropped to the window with the vacuum port in section | 11 / 2 / 13 | search descent (approach), contact, force ramp, solder chase when the joint passes liquidus (derived 4.05 um), hold, exponential cool, vacuum release, retract; set (440 C) vs joint (max 250 C) traces, joint lag tau fitted to A10 | work, block |
| `pick_place` | place | `head: collet` die / bridge bonder (rubber collet pad, holder, shank, body); `head: nozzle` NPM-style 3-nozzle head, active nozzle Z stroke, idle nozzles, X carriage, gantry beam | 8 / 0 / 10 | contract split pick / travel / align / place; vacuum on piece; publishes hold pose | work, block |
| `jet_dispenser` | underfill (and `mode: bead` for stiffener / lid adhesive) | nozzle 50 / 150 um, holder, jet valve, heated syringe jacket, syringe, Z plate, gantry beam, heated stage; dots and flying rods (instanced); bead mode: needle, syringe, growing adhesive tube | 13 / 5 / 9 | I / L / U / perimeter pass at 100 um edge offset; 3 passes at 0 / 150 / 360 s waits (A103); pass window stretched for visibility; block: pass time spent where the path crosses the window; landed dots shrink as drawn in; flying dots at a visual rate | work, block |
| `mold_chase` | mold | cavity chase with wafer (or panel) cavity, ETFE film on ceiling, wall and clamp sheet, unwind / wind rolls, holding chase, 4 guide posts, EMC charge layer + granules | 6 / 1 / 8 | charge [0, .2), linear close [.2, .6) (closing speed N/A, A136), cure hold [.6, 1], open in retract; clamp / T / cure readouts | work, block |
| `reflow_oven` | reflow | 14 + 2 zones (lower / upper cross-nozzle plates, nozzle bars, zone dividers), floor, back wall, roof, labyrinth N2 curtains, edge-chain rails, chain links + pins moving with the board; cutaway in front of the section plane | 8 / 1 / 22 (14 zone set points template) | oven translates past the board at the belt speed; zone index / set point / board T / position / dwell readouts; zone-set and board-T traces | work |
| `ball_placer` | ball_attach | pin-transfer flux head (pins instanced, pin bed above 3000 sites), ball mask + vacuum head, balls (instanced; block: perforated mask) | 4 / 0 / 8 | flux pins dip [0, .25), mask in / lower / release / fall (gravity shape) / out [.25, .5), heads away during reflow | work, block |
| `stencil_printer` | print | stencil foil (op stencil_um), frame, 60 deg blade, holder, rolling paste bead; block: perforated foil with apertures at the site grid, cropped blade | 0 / 0 / 13 | blade front across the unit (or `live.front_x_um`), bead rolls with the stroke, snap-off in retract | work, block |
| `laminator` | coat (vacuum_laminate / dry_film) | heated lower platen, PET support film, chamber lid frame + cutaway cover, deformable diaphragm (72 x 72 grid) | 7 / 0 / 5 | film settles, lid closes, vacuum, diaphragm inflates and conforms over the panel, 0.7 -> 0.55 MPa stages (A163), vent; pressure trace | work, block |
| `laser_drill` | etch_via (laser), etch_recess | f-theta lens, lens barrel, galvo head, delivery tube, beam guide cone, ablation plume; `laser: co2 / uv` | 8 / 0 / 8 | spot jumps between via sites at a visual rate (real 800-900 holes/s); recess: raster over the cavity (block: window part); beam ends at `live.depth_um` | work, block |
| `xray_ct` | inspect (`method: sam` variant) | sealed tube below, flat-panel detector above, X-ray cone guide; SAM: transducer, lens, water column, carriage; block: scan plane | 0 / 0 / 11 | CT: detector orbit at 45 deg tilt about the inspection point (tube opposite); SAM: raster | work, block |

Not in this lane's scope and not implemented: `cure_oven`, `wafer_bonder`, `cvd` (neither L37's nor L38's list).

## Interface notes for L35 (no types.ts changes made)

1. HUD extras: actors implement `AssemblyToolActor` (common.ts): `readouts(t, args, ctx): Readout[]` (live tool values
   with status), optional `traces(args): Trace[]` (default time series, real seconds), optional
   `defaultDuration(args)`. Proposed contract addition: `ToolActor.readouts?` / `traces?`. TCB: `T_set` and
   `T_joint` traces (two-trace plot as decided); the actor prefers `ctx.profile.T_set` / `ctx.profile.T` when given.
   Reflow: zone set point and board T traces + zone readouts.
2. Held piece sync: tcb_head and pick_place publish `group.userData.hold = {on, x, y, z}` (tool frame, um; y = held
   piece top face) every update; the engine can draw the held die / bridge / interposer there. Conversely they honor
   `ctx.live.hold_z_um` (piece-frame z of the held piece's top face) and `contact_z_um` / `collapse_um` if given.
3. ctx.live keys read: `contact_z_um`, `hold_z_um`, `collapse_um` (TCB, place); `front_frac`, `surface_um`
   (jet; front_frac shrinks the bead); `gap_um` (mold); `top_z_um` (laminator: film top); `front_x_um` (print);
   `depth_um` (laser). All optional, own kinematics otherwise.
4. Geometry-relevant call args (rebuild on change, also accepted by the factory): pick_place `head`, `piece_w_um`,
   `piece_d_um`, `piece_h_um`, `x_um`, `y_um`, `force_n`; tcb_head `x_um`, `y_um` (held die center, piece frame);
   jet_dispenser `mode` (`bead`), `dispense` (op field), `fill_x_um`, `fill_y_um`, `fill_w_um`, `fill_d_um` (fill
   rect); mold_chase `mold_top_z_um` (op field); ball_placer / stencil_printer / laser_drill `site_x_um`, `site_y_um`,
   `site_w_um`, `site_d_um`, `site_pitch_um`, `ball_d_um`, `stencil_um`, `aperture_um`, `d_um`, `laser` (co2 / uv),
   `cut_x_um..cut_d_um`; xray_ct `method` (sam). The engine should merge the op's fields (dispense, mold_top_z_um,
   stencil_um, method, the fill / cut rect and site of the target bodies) into the tool args.
5. Mold EMC model: the tool draws a cavity-down granular charge (A121 / A122). The contract's radial squeeze from a
   central charge matches a liquid charge dispensed at the center; with granular EMC spread in the cavity the fill is a
   top-down squeeze. Consider a `charge: granular | liquid` switch in the mold op.
6. Print / underfill front at block scale: the tool maps its stroke / pass to the window at block scale (otherwise
   the front crosses a 1 mm window in 1 % of u). The paste / underfill bodies should use the same mapping or pass
   `live.front_x_um` / `front_frac`.
7. Orientation: in the tool frame (+Y toward the tool) the mold's cavity chase is above the piece (cavity-down
   machine drawn inverted), and the X-ray tube is below (tube at -Y): both by design.
8. Materials: `ctx.mat` keys used: si, steel, al, glass, adhesive, daf, emc, underfill, solder, solder_paste, and
   `ceramic` (not in the L36 library: neutral matte grey + one console warning, the contract's fallback). Request to
   L36: opaque `ceramic` (AlN / SiC tools), `silicone` (diaphragm, collet rubber), `pet` (clear film), `water`.
   Light-like guides (laser beam, plume, X-ray cone, scan plane) are plain additive MeshBasicMaterial (not substances).
9. Budgets at the sampled t: max 22.5k triangles, max 7 draw calls per tool. Exception: ball_placer at work scale
   during the drop (13.7k balls on a 120 mm substrate at 1 mm pitch, octahedra): ~110k triangles.

## Known weaknesses

- TCB tool / collet / heater sizes are template (A29 gap); tool drawn with the neutral `ceramic` fallback.
- Reflow zone set points (14) and zone pitch are template, shaped to the J-STD-020E envelope; heated length N/A (A47).
- Stencil printer and X-ray / SAM have no research rows: everything template, with public web sources where found
  (squeegee 60 deg / 25 mm/s / 500 g per 25 mm; XD7600NT 160 kV, 70 deg oblique, 458 x 407 mm; galvo 1 kHz,
  800-900 holes/s, f-theta 100 mm).
- Ball placer work scale exceeds the 40k triangle budget during the drop (see 9); landed balls are drawn by the
  tool only until u = 0.5.
- Jet pass windows are stretched (0.6 s real pass shown over 7 % of the op); the HUD carries the real value.
- Mold granules are visible only in section (cavity faces the piece); closing speed linear (A136 N/A).
- Laminator flat-press stage (US11325365B1 class) not drawn; diaphragm and collet rubber drawn with the grey
  filled-polymer (`adhesive`) look.
- Lab dummy pieces and the lab's z map are stand-ins (not the engine's ZMap); scenario dims in lab.ts are not data.

## Verification

- `pnpm check`: 0 errors, 0 warnings (884 files). `pnpm build`: ok; `app/build` contains the actors (through the L35
  registry) but no lab code (grep for the lab title, `__toolLab`, scenario ids: none).
- Screenshots (final run, 2026-10-23): `cache/process3d_renders/tools_assembly/20261023_171930/` - 14 lab scenarios x
  {work, block} x {illustrative, actual} x t {0, 0.3, 0.6, 1} (224 PNG, `report.json`, no console errors except
  the expected `ceramic` fallback warning), plus key frames t {0.2, 0.4, 0.82} for ball_placer, pick_place (both
  heads), jet_dispenser_bead, mold_chase (`report_keyframes.json`). Reviewed as contact sheets; iterations fixed:
  window keys, camera framing, block crops to the window, jet footprint offset and block pass mapping, TCB port /
  transparent nitride tool, ball grid clipping, held-piece travel in the lab.

## Progress log

- 2026-10-23 16:50: read DevLog-016, CONTRACT, types.ts, RESEARCH_TOOLS_ASSEMBLY.md, L36 library and lab. Light web
  lookups (6 searches, 1 fetch) for X-ray, stencil printing, galvo drilling, NPM-WX, laminator geometry gaps.
- 2026-10-23 17:05: common.ts + 10 actors + index.ts; pnpm check 0 errors.
- 2026-10-23 17:10-17:20: lab page + shoot.py; tmux apa-l38 :47364; three screenshot / fix iterations; final run
  20261023_171930; superseded runs deleted. Server stopped.

## Audit V1 follow-up (2026-10-23 evening; DevLog/audits/process3d_audit_V1_2026-10-23.md C1, M5, M12)

- C1, framing: every actor now has `focusBox(t, args, ctx): THREE.Box3 | null`, the contact region in the tool frame
  (um) at work scale (workpiece area under the working element plus the element). L35 needs to transform it with the
  tool root and use it for framing. It is not in `types.ts` yet.
- C1, occlusion:
  - Work-scale cutaways: only the half behind the section plane (tool z <= 0) is drawn for mold_chase (chase with a
    half pocket, film, rolls, holding chase, far guide posts, EMC charge and granules, all sectioned) and for
    stencil_printer (foil limited to the board + 15 mm, far frame bar, blade, holder, paste bead) and for both
    ball_placer heads. reflow_oven and laminator already were.
  - Fade group: `group.userData.occluders` (Mesh[]) and `group.userData.setOccluderOpacity(a)`. Occluder parts own
    their material instances (`addOcc`), so a fade never touches the working element. Members:
    - tcb_head: head body, slide, rail
    - pick_place: head body, mounter housing, idle nozzles, beam
    - jet_dispenser: syringe, jacket, valve, carriage, beam
    - laminator: lid
    - laser_drill: galvo head, tube
    - xray_ct: tube and detector housings
    - stencil_printer: frame bar, holder
    - ball_placer: head bodies
- M5:
  - reflow_oven draws nothing at block or cell scale.
  - Every actor dims its own material instances at block and cell scale (envMapIntensity 0.3, base colour x 0.55).
  - Block parts were already cropped to the window.
- M12:
  - The tool draws no flux deposits; the lozenges are the engine's solder bodies (see below).
  - ball_placer balls take the z-mapped ball height (illustrative), so they match the solder bodies.
  - Balls are drawn only in the mask and in flight; each is hidden at landing, from which point the engine's
    solder body carries it.
  - The mask height is mapped the same way.
- Budget: ball LOD by count (ico 80 tris up to 400, octahedron 8 up to 4000, tetrahedron 4 above). With the cutaway
  this gives 27.7k triangles during the drop on a 120 mm / 1 mm-pitch field (was 110k).
- pick_place: the default head is the mounter nozzle head when the piece exceeds the 25 mm die limit of the die
  bonder (A5), e.g. the 42 x 46 mm interposer at s14.
- Verified:
  - Real Process mode on own server (tmux apa-l38 :47364): targeted shots of 00027 s04, s14, s15, s22 and s23 and
    CoWoS mold.
  - `scripts/render_process3d.py --base-url http://127.0.0.1:47364 --flow ectc51687.2025.00027-F1 --ts 0.5
    --no-actual` -> `cache/process3d_renders/engine/20261023_195859/`: budget ok (max 66 calls, 369k triangles),
    0 wafer-scale views below 15 % workpiece, determinism 0 mismatches, no console errors (only ReadPixels warnings).
  - `pnpm check` 0 errors.
- Still open on the engine side (L35):
  - Use focusBox and occluders.
  - ball_attach solder bodies grow as flattened lozenges from u ~0.38 and overhang the block edge. They should
    appear as full spheres when the tool ball lands (u >= ~0.41 + stagger) and be clipped to the substrate.

## Laminator diaphragm fix (2026-10-23 21:25; engine-lane finding at EMIB-T encap_t, work scale)

- The diaphragm is now in `group.userData.occluders`, through the new `BaseActor.meshOcc`. The lid frame and cover
  were already occluders.
- While the diaphragm conforms, it fades to 30 % opacity (`setPartOpacity`, combined with the engine fade by min).
  The panel and the laminated film read through it.
- Verified on the own server (tmux apa-l38 :47364, stopped):
  - Targeted shots of emib_t step 5 at t 0.3 / 0.5 / 0.7, at work and auto scale.
  - `scripts/render_process3d.py --flow emib_composite --all-routes --ts 0.5 --no-actual` ->
    `cache/process3d_renders/engine/20261023_212102/`: budget ok, 0 low-workpiece wafer views, state determinism
    0 mismatches.
  - One pixel-check difference was reported at k = 0, t = 0.6 (buildup, cell scale) in both routes; not traced in
    this pass.
- `pnpm check`: 0 errors.

## Audit V2 items (2026-10-23 22:30; DevLog/audits/process3d_audit_V2_2026-10-23.md N4, m5, n5, M12 residual)

- N4, mold_chase:
  - The chase stroke is now driven by the op phases: open, close over u .2-.6 (eased), clamp / cure hold, open in
    retract.
  - The engine's `live.gap_um` is no longer used as the stroke. It is the cavity height of the engine's squeeze model
    (sub-mm), so the chase looked static.
  - In illustrative work views the stroke is drawn at 2x the 30 mm template.
  - Granules shrink into the melt layer over u .3-.58. The charge is hidden from u .6 (clamp), when the fill body
    takes over.
  - Rolls, roll cores and guide posts are fade-group parts at 35 % opacity.
  - ctx received in Process mode (CoWoS mold, logged in my own session):
    - present: `phase`, `u`, `phases` [0.12, 0.9], `tReal_s`, `live.surface_um`, `live.gap_um`, `live.front`, args
      `mold_top_z_um`, `method`, `charge`, `fill_*`;
    - `live.gap_um` is non-monotonic: 862 / 1372 / 831 um at u .10 / .36 / .62;
    - `live.front` = 1 for every u >= .10; it should rise 0 -> 1 over the close phase;
    - `tReal_s` = 0 until u .6 (the close phase is untimed);
    - `profile` is empty.
- m5, laser_drill: beam colour by wavelength class.
  - IR (CO2 9.3 / 10.6 um, IR fs) is invisible: faint neutral grey guide.
  - UV 355 nm: faint violet.
  - Opacity 0.12-0.14.
  - The cavity step (femtosecond tool, no laser arg) reads "laser wavelength N/A (not stated, A200)" instead of CO2.
- n5, laminator:
  - The diaphragm and lid frame are drawn behind the section plane only.
  - Diaphragm opacity is 0.55 at rest and 0.15 while pressing.
- M12 residual:
  - ball_placer uses icosahedron detail 4 when <= 8 balls are in the window (block / cell), else detail 3.
  - The faceted, flattened balls in the V2 block / cell shots at t >= 0.45 are the engine's solder bodies; tool
    balls are hidden at landing.
- Verified on the own server (tmux apa-l38 :47364, stopped) with the V2 target jobs, using `frame()` after each seek:
  - CoWoS mold t .2 / .4 / .6 / 1;
  - EMIB-T encap t .1 / .6;
  - EMIB final_lam;
  - EMIB cavity;
  - 00027 s22 t .45 block.
  - 0 page errors. Shots in the session scratchpad only, no cache folders. `pnpm check` 0 errors.
- 2026-10-23 23:40: laminator PET support film now uses the library key `pet` instead of `glass` (L36 finding).
  `pnpm check` 0 errors. EMIB-T encap t .1 / .6 and EMIB final_lam t .5 (work, block) shot on the own server
  (stopped); the film reads as a clear sheet over the panel; 0 page errors.
- 2026-10-24: block / cell window clipping, same rule as L37 FabBase.
  - `BaseActor` sets up four clip planes in the tool frame at place: x0 / x1 of the window, the back edge, and the
    section plane. They are re-expressed in world space from the group's world matrix after every update.
  - Library materials get them through `ProcMaterial.setClipping`; the guide materials (beam, plume, X-ray cone, scan
    plane) through `clippingPlanes`.
  - Lab renderer: `localClippingEnabled`.
  - `pnpm check` 0 errors. One block-scale shot per tool on the own server (stopped): tcb s02, jet s03, CoWoS mold,
    place s14, ball s22, print s23, xray s17, EMIB via_drill and cavity. Nothing extends past the block laterally or
    in front of the section; 0 page errors.
  - Open: the laminator shot (final_lam, t 0.4) showed the build-up step 1 in approach, so the laminator was not
    captured at block scale in this pass.
- 2026-10-24: ball_placer balls are true spheres at the engine's per-site factor.
  - Rule mirrors viewer.ts `bumpScales`: s = mapped / true height of the ball interval, f = min(s, max(0.4 pitch / r,
    1)). The factor is not in ctx, so it is computed from frame.zmap and the site pitch.
  - Uniform on all axes from the pad plane; mask holes widen with f (capped at 0.49 pitch); actual mode f = 1.
  - Block shots of 00027 s22 at t .40 / .43 / .46: the falling sphere and the landed engine sphere match in shape.
  - EMIB final_lam (seek by step id) at t .3 / .5, block: the diaphragm is clipped to the window width.
  - `pnpm check` 0 errors.
