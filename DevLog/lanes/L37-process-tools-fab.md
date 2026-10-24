---
title: Lane L37 - wafer-level / fab tool actors (DevLog-016 tools E3, fab)
date: 2026-10-23
status: done (2026-10-23); hand-off below
scope: app/src/lib/process/tools/fab/ (actors, index.ts, lab/), this file
owner: lane L37 (Claude subagent, DevLog-016 tool agent E3 fab)
---

# L37: fab tool actors

Binding inputs: DevLog-016 (tools list, provenance rules), `config/process3d/CONTRACT.md` section 11,
`app/src/lib/process/types.ts` (ToolActor / ToolFrame / ToolCtx v1.1 incl. readouts / traces / defaultDuration),
`config/process3d/RESEARCH_TOOLS_FAB.md` (rows F1-F181), materials library (lane L36), tools/assembly (lane L38, read
only, for the base-actor pattern and HUD extras). Coordinator scope addition 2026-10-23: cvd, wafer_bonder, cure_oven
(all three delivered).

Constraints: no git writes, no subagents, own files only; dev server tmux `apa-l37` on 127.0.0.1:47363 (stopped at
the end); screenshots to `cache/process3d_renders/tools_fab/<ts>/`; no paper retrieval.

## Deliverables

- `app/src/lib/process/tools/fab/`
  - `common.ts`: provenance builders (`rep` / `der` / `tpl`, rows cited as `F<n>` with `source =
    RESEARCH_TOOLS_FAB.md F<n>`), args merge (`num`, `stat`), phases (`engage`), visual rates (`visRps` / `spin`),
    frame helpers (`yOf`, `backY`, `planeY`, `blockWin`), geometry (lathe / ring / sector with section end caps),
    hardware pattern material (pad grooves, perforation, porous ceramic), additive glow shader, `FabBase` (same
    pattern as tools/assembly `BaseActor`: rigs, merged batches per material, lazy `ctx.mat` binding, picking).
  - `cmp.ts`, `grinder.ts`, `chamber.ts` (drie, cvd), `pvd.ts`, `ecp.ts`, `litho.ts` (litho, spin_coater),
    `benches.ts` (wet_bench, cure_oven, wafer_bonder, roll laminator), `debond_dice.ts` (laser_debond,
    dicing_blade).
  - `index.ts`: `FAB_TOOLS` (13 contract ids) + `FAB_EXTRA_TOOLS.laminator_roll` (see interface note 6).
  - `lab/index.htm`, `lab/lab.ts`, `lab/shoot.py`: dev-only lab (Vite serves `.htm` raw; nothing imports it).
    URL `http://127.0.0.1:47363/src/lib/process/tools/fab/lab/index.htm#tool=cmp&t=0.5&scale=work&ill=1`; tool,
    method, scrub t, work / block, illustrative / actual, face-down flip, work rotation, view presets, spec table
    (status-styled), readouts, draw calls / triangles / default duration / traces / hold.
- Verification (2026-10-23): `pnpm check` 0 errors 0 warnings; `pnpm build` ok; no lab file or lab string in
  `app/build` (the fab actor chunk is there, as intended); report.json 0 console errors; every tool <= 12 draw calls
  and <= 17k triangles (budget 12 / 40k).

## Per-tool table

Spec counts = entries of the actor's `spec` (reported / derived / template). View parameters (lift heights, visual
cadences) are constants in code, not spec.

| tool id | parts modelled | R / D / T | motions (visual rate in playback; HUD = real value) |
|---|---|---|---|
| cmp | platen 762 mm, pad with concentric grooves 0.51 / 0.76 / 3.05 mm (shader, physical pitch), milky slurry film (radial front), slurry arm + nozzle + stream, conditioner disk 107.95 mm on a pivot arm, carrier head (retaining ring with radial grooves, membrane, housing, bolts, spindle), deck | 14 / 3 / 14 | platen 113 and head 107 rpm same direction, head radial oscillation (drawn as platen offset in the wafer frame), conditioner sinusoidal sweep between two pad radii + 87 rpm, platen lowers onto the wafer in the approach, follows removed_um; faceDown |
| grinder | cup wheel 300 mm (200 mm for 200 mm wafers) with 42 diamond segments, aluminium base, flange, shaft, spindle housing + Z carriage, two coolant pipes + jets, porous ceramic chuck + frame ring + table, turntable | 8 / 4 / 8 | wheel 6000 rpm, chuck 300 rpm opposite; rim over the chuck centre (axis offset = rim radius); Z infeed follows the grind plane (removed_um); block: wheel axis orbits the wafer centre at the chuck rate (wafer frame) |
| drie | ESC + cathode, quartz focus ring, chamber wall + floor (back half), dielectric window, 3-turn ICP coil, plasma volume with dark sheath gap and section face, ion streaks | 11 / 1 / 4 | glow colour / intensity per Bosch sub-phase (passivation, polymer etch, Si etch: 5 / 3 / 5 s, F2, engine split 1/2 : 1/2); real cadence from `live.cycle/cycles` when <= 12 cycles, else 0.9 s playback per drawn cycle (HUD shows the real cycle n/N) |
| cvd | heated pedestal, focus ring, perforated showerhead (back half), lid, wall; PECVD glow (method pecvd / ash), gas flow particles | 4 / 1 / 4 | gas down from the showerhead then radial; glow on in the process window |
| pvd | target 450 mm (template scaled from F31) with racetrack erosion grooves (lathe, section caps), Cu backing plate, rotating off-axis magnet pack (clipped by the fixed section plane), racetrack plasma loop, shield (back half), RF pedestal, clamp ring, sputtered flux (target metal colour) | 6 / 0 / 7 | magnet rotation (visual; real rate not found), flux transits racetrack -> wafer from the loop position at birth time; block: last segment of each path arrives in the window |
| ecp | clamshell cup + lip seal, cone, struts, spindle; vessel (back half), electrolyte with section face, perforated resistive plate (9000 holes, 0.59 mm at 2.80 mm pitch, derived midpoints of F51), membrane, anode, inlet; Cu2+ flux and cross-flow particles | 6 / 6 / 4 | holder 50 rpm, bath rises for immersion in the approach, ion density scales with `live.rate_um_min`, anode tint = current on (illustrative); faceDown |
| litho | stepper: wafer stage, field grid (serpentine, 52 x 34 mm), exposed-field latent tint, projection column with tapered nose, last element, reticle 6025 + chrome pattern 104 x 68 mm, reticle frame, illuminator, light frustum (half angle asin NA), field spot, TMAH puddle; aligner: mask plate + flood light + lamp house | 7 / 3 / 7 | step-and-repeat over u in [0, 0.5) (move 35 %, shutter 60 % of each dwell), column lifts, developer puddle grows / spins off in [0.5, 1] |
| spin_coater | vacuum chuck + key, spindle, catch cup (back half, section caps), dispense arm + nozzle + stream, EBR nozzle + jet, puddle / spreading film (resist or polyimide), spin-off droplets | 7 / 0 / 5 | real-time sequence dispense 3 s (template) / spread 500 rpm 5 s / final 2200 rpm 30 s / EBR 10 s / dry 15 s; puddle radius from a template volume, spread to the edge, droplets tangent to the rim |
| wet_bench | spray: spin chuck + grip pins, splash cup, swing arm + nozzle, flat-fan spray, droplets, liquid film; immersion (electroless, immersion, resist_strip): tank (front cut), holder bar, rising liquid, bubbles; ash: O2 plasma chamber | 3 / 3 / 7 | arm sweep, chuck rotation; liquid level rises in the approach; glow for ash |
| cure_oven | oven: floor / top / walls (front cut), shelf, heater rods, N2 circulation; hot plate: plate, proximity pins, cover | 3 / 1 / 3 | temperature from `ctx.profile.T`, else the PI-2600 trace (ramp 3 C/min to 350 C, 30 min, F171); no glow below 525 C (materials convention) |
| wafer_bonder | heated bottom chuck, base, 4 guide columns, top chuck / pressure plate, top platen, ram | 5 / 0 / 2 | top chuck descends to the carrier top (surface + 70 + 1 + 700 um) in the align phase, holds for press + heat (215 C, 120 s); publishes `group.userData.hold` |
| laser_debond | porous vacuum chuck, stage, fixed scanner head + exit window, UV line-beam sheet, footprint, scanned-track overlay at the release plane, vacuum lift plate + shaft | 5 / 0 / 3 | raster lines of a template 10 mm line (30 lines on 300 mm) from `live.scan`; tracks accumulate; lift plate descends at u 0.74-0.86 and lifts; hold published |
| dicing_blade | hub blade (OD 55.56 mm, edge = kerf 50 um, exposure 0.64 mm template), hub, flange nut + screws, air spindle, blade cover, two cooler nozzles + jets, spray mist; tape 120 um, ring frame, porous chuck, theta table | 5 / 0 / 7 | 20000 rpm (visual), cut list in the engine's order (ops.ts dice / viewer kerf: streets along y at +-x first, then along x), blade turned 90 deg for the second direction (wafer frame); block: sweeps the street at the unit's +y edge |
| laminator_roll (FAB_EXTRA) | heated top roll, bottom roll, shafts, supply roll, web, laid film behind the nip | 1 / 3 / 2 | nip traverses the wafer over u; laid film grows behind it |

## Interface notes for L35

1. **faceDown** (cmp, ecp): in the tool frame (+Y toward the tool) the pad / electrolyte is above the wafer face and
   gravity points +Y. Drawn as is, the camera sees the platen back or the cell floor. Proposal: when
   `actor.faceDown`, rotate the work scene (carrier + tool root) 180 deg about scene z in the approach phase (as the
   lab's flip, same rotation the engine uses for `orient: down`); the camera then sees the machine as it stands.
2. **workRot(t, args, ctx)** (cmp head, grinder chuck, ecp holder, spin_coater, wet_bench spray): rotation of the
   work piece about +Y through the carrier centre. The engine's wafer is static; applying `work.rotation.y` makes
   grind arcs / unit grids turn with the chuck. Optional; without it the tools still read correctly.
3. **Phase bounds**: ToolCtx has `phase` but not the step's `phases` window; tools assume DEFAULT_PHASES for the
   approach / retract ramps. Add `phases: [a, b]` (or `app` / `ret` progress) to ToolCtx.
4. **Op playback duration**: tools cannot tell whether a real cadence (Bosch cycles, laser lines, dicing lines)
   would flicker; DRIE switches to a visual cadence when cycles > 12. Add `opPlay_s` (playback seconds of the active
   op) so tools can pick real vs visual cadence exactly.
5. **ToolFrame lacks the repeat pitch and the stack extent**: dicing uses `args.pitch_x_um / pitch_y_um` else
   unit + 100 um street (template) and may not coincide with the engine's kerf lines (which use `repeat`); tools that
   sit behind the work piece (CMP head, chucks) use `backY` = piece z 0 when the surface faces up, else `args.stack_um`
   or a per-tool fallback (775 / 1545 um). Add `repeat {pitch_x_um, pitch_y_um}` and `back_y` (tool-frame y of the
   far face) to ToolFrame.
6. **laminator id collision**: tools/assembly owns `laminator` (vacuum diaphragm laminator). The dry-film roll
   laminator (wafer dry film, F79-F80) is exported as `FAB_EXTRA_TOOLS.laminator_roll`; route `coat` with method
   `dry_film` on a wafer piece to it if wanted.
7. **Trace q**: types.ts `Trace.q` is `T | F | P | v`; a spin-speed trace (spin coater, q `rpm`) was dropped; add
   `rpm` (Profile.q already has it) to show the spin recipe in the HUD.
8. Library materials come through `ctx.mat` with `setScale(umPerUnit)`; one instance per key per actor (a `key#tag`
   suffix makes a second instance, e.g. the slurry stream). Hardware without a substance key (pad, ceramic, plastics,
   anodised parts, glow, beams, particles) uses own MeshStandard / Shader / Points materials; the glow shader includes
   the logdepth and clipping chunks. PVD's magnet uses one material clipping plane (the fixed section plane, world
   space, recomputed in update from `group.matrixWorld`): needs `renderer.localClippingEnabled` (already required by
   L36).
9. HUD extras implemented as in tools/assembly: `readouts` on all 14 actors; `traces` on cure_oven, wafer_bonder;
   `defaultDuration` on cure_oven, wafer_bonder, spin_coater, laser_debond, dicing_blade; `group.userData.hold` on
   wafer_bonder and laser_debond.
10. Grinder vs materials: the `si` grind arcs use a 100 mm wheel radius (L36 S10, 200 mm wheel); the grinder draws a
    300 mm wheel for 300 mm wafers (F129). Request to L36: expose the wheel radius (e.g. `setGrind(r_um)`).

## Known weaknesses

- CMP wafer-to-platen offset, oscillation amplitude, ring / head sizes, pad thickness are template (F109 gap); the
  pad groove pattern is a shader (sections do not show the groove cross-section).
- Grinder segment size and coolant layout template (F138); the wheel base is a flat web, not a deep cup.
- DRIE / CVD / PVD / laser / exposure colours are template (F18; UV drawn violet); plasma volumes are additive sheets.
- ECP anode distance, membrane position, cell size template (F74); no wafer tilt entry.
- Stepper optics and reticle are template (F91; SEMI 6025 plate assumed); stage step / shutter times not modelled
  in real time.
- Immersion tank shows the wafer horizontal (batch benches dip cassettes vertically); seed etch spray is a
  single-wafer spin-spray, the F97 source is a spray conveyor.
- Laser line size template (F161); 30 lines over 300 mm is a consequence of that template.
- Block scale: mostly environment (pad face, plate holes, glow, flux); the dicing blade and grinder segments pass
  the window only part of the time.
- The lab's dummy work piece is lab-only (stacks in lab.ts are not data).

## Screenshots

`cache/process3d_renders/tools_fab/final_20261023_173813/` (100 PNG + report.json; 0 console errors; max 12 draw
calls, max 16462 triangles per tool):
- `<tool>_work_t{0,0.3,0.6,1}_iso.png` for all 14 actors (illustrative, work scale);
- `<tool>_block_t0.5.png` (block scale) and `<tool>_work_actual_t0.5.png` (actual scale) for all 14;
- `extra_*`: spin coater mid-spread (resist, polyimide), stepper mid-exposure, aligner, wet bench resist_strip /
  electroless / ash, hot plate, thermal CVD, Cu PVD, two Bosch sub-phases (t 0.505 / 0.51), CMP unflipped low view,
  ECP front view, laser debond lift (t 0.85), dicing second direction (t 0.8).
Dev server tmux `apa-l37` stopped; intermediate screenshot folders removed.

## Progress log

- 2026-10-23: read DevLog-016, CONTRACT section 11, types.ts, RESEARCH_TOOLS_FAB.md, materials library, L38 base
  actor. Plan: one FabBase (mirrors L38), one file per tool family, lab at tools/fab/lab (no L38 lab existed then).
- 2026-10-23: actors + lab written; iterations from screenshots: (1) lab canvas sized to a select (duplicate id);
  (2) glow invisible under the lab's logarithmic depth buffer: glow shader got logdepth / clipping chunks;
  (3) chambers, showerhead, PVD target cut to the back half with lathe end caps so the camera sees the wafer;
  (4) PVD magnet clipped by a fixed section plane; (5) litho column given a tapered nose so the exposure cone shows;
  (6) wet-bench film thickness unit bug (um treated as mm); (7) draw-call trims (cmp 14 -> 12, dicing 13 -> 12);
  (8) no heater / chuck glow below 525 C; (9) removed non-physical spec entries (bond pressure 0, view lifts, visual
  cadences, magnet rpm guess).
- 2026-10-23: coordinator scope addition (cvd, wafer_bonder, cure_oven + HUD extras) delivered; types.ts Readout /
  Trace re-exported from common.ts.
- 2026-10-23: audit V1 fixes (C1, M5, M6):
  - C1:
    - `focusBox(t, args, ctx)` on every actor returns the contact region in the tool frame (um): the carrier footprint
      from the far face to 0.15 R above the surface; block scale returns the window. The grinder also includes the
      wheel rim and base height.
    - `group.userData.occluders` lists the parts that can sit between the work camera and the work piece: grinder
      spindle and coolant pipes, bonder platen / ram / columns, debond head, dicing spindle, ECP spindle, wet-bench
      arm.
    - Geometry changes so that nothing blocks the default work camera (DIRS.work, +x +z):
      - grinder wheel axis moved to 120 deg (behind the wafer);
      - bonder top chuck, platen and ram cut to the back half, back columns only;
      - `backY` uses the engine's `back_y`. The chuck had been drawn on the wrong side for face-down steps.
  - M5: block / cell level of detail (`blockParts`): only the contact element is kept, own colours and glows at 60 %.
    - cmp: pad face and slurry film.
    - grinder: segments.
    - drie / cvd: glow and particles.
    - pvd: flux.
    - ecp: ion and flow particles.
    - litho: light and puddle.
    - wet bench: liquid and spray.
    - debond: beam.
    - dicing: blade edge and mist.
  - M6: DRIE handles `etch_recess` and non-Bosch methods as a continuous SF6 blanket etch: steady glow and ions, no
    passivation cycles. Readouts: > 9 um/min, 200:1 to the liner (F141), ~5 um reveal step (F140). The chamber sits
    on `back_y`, so a face-down wafer on its carrier works. Bosch cadence is real when <= 2 drawn cycles per playback
    second (uses `ctx.opPlay_s`); approach / retract ramps use `ctx.phases`.
  - Verified in the real Process mode (own server :47363, audit shots.py jobs on cowos steps 5, 10, 17, 18, 19, 21,
    22 at auto / work / block): `cache/process3d_renders/tools_fab/v1fix_engine_20261023/` (21 PNG, 0 console
    errors); lab: `cache/process3d_renders/tools_fab/v1fix_20261023_195830/`.
  - Remaining:
    - logic_thin's root is the 24 x 14 mm die_c piece. A 300 mm wheel over a die-size piece still dominates the frame
      until the engine frames on `focusBox`.
    - The engine does not call `focusBox` / `occluders` yet (L35).
- 2026-10-23: engine-lane fixes:
  - Determinism: actor state was already pure in (t, args, ctx). The same Points / matrices came out whether an actor
    was fresh, reused, or reached after a later t (checked in the browser for all 13 actors).
    - The EMIB step 1 pixel mismatch in the wet-bench spray fan came from transparent draw order: three breaks depth
      ties by object id, which depends on creation history.
    - Fix: every tool object gets an explicit renderOrder in place() (`fixOrder`).
    - Check: direct forward / backward arrival is now pixel-identical (EMIB k0 t0.6; 00027 s08).
    - `scripts/render_process3d.py` (run 20261023_212749): 00027 and CoWoS pass all pixel checks.
    - EMIB k0 t0.6 still differs by 2 pixels on the panel edge. The difference persists with the wet bench hidden
      entirely, so it is engine-side (L35).
  - Spin coater, 00027 s08:
    - At block / cell scale the puddle is now a thin, dim, translucent film: own material at 25 % opacity, thickness
      <= 0.15 window, only the film kept.
    - It is confined to the piece (disk radius, or the rect half sizes).
    - The illustrative work-scale floor dropped from 300 to 100 um.
    - `scales` now includes block.
- 2026-10-23: audit V2 fixes:
  - N5, laser debond:
    - The beam focus is now the release layer: `args.release_z_um` (piece z) when the engine passes it. Otherwise the
      carrier is assumed on the facing side (surface - carrier, or surface + carrier when the stack faces down), always
      below the facing surface.
    - The scan line also shows where the beam enters the carrier top.
    - The scanned-track overlay sits at the release plane, so no more floating disc.
    - The lift-plate shaft is removed; the plate only appears in the lift phase.
    - Scanner head working gap: 150 mm (template).
    - Data note: 00027 s10 is `orient: down` with the carrier on the chuck side, so the beam would have to pass the Si.
      For a laser debond the carrier must face the tool (`orient: up`), or the engine must pass `release_z_um`.
  - n3: cure_oven draws nothing at block / cell.
  - n4: at block the spin coater draws only a window-sized thin film (no bowl, no wafer-wide puddle), shown once the
    spreading front reaches the window.
  - Verified in Process mode (own server :47363, `frame()` after every seek):
    `cache/process3d_renders/tools_fab/v2fix_20261023/` (12 PNG, 0 console errors). Covers CoWoS debond t0.5 / 0.8,
    the cure steps (uf1_cure, pmc, ring_cure, 00027 s19 / s21) at block, 00027 s08 block t0.2 / 0.5 / 0.7, and
    00027 s10 t0.5 / 0.8.
- 2026-10-23: laser-debond tracks:
  - The scanned-track overlay is now a thin quad layer on the release body's tool-facing face, using the engine's
    `release_z_um` (mid plane) and `release_h_um`.
  - It is confined to the piece outline (disk chords, or rect half sizes) and, at block / cell, to the window.
  - Opacity is 0.4 at work scale and 0.22 at block.
  - The brown full-view tint at 00027 s10 block scale is gone. Verified on 00027 s10 and CoWoS debond at work / block
    scale, t 0.5 (plus CoWoS work t 0.3): `cache/process3d_renders/tools_fab/v3fix_20261023/`.
  - At work scale the overlay sits under the (engine-drawn) carrier, which hides it in the current material.
    Scan progress reads from the beam entry line and the engine's release `exposed` state.
- 2026-10-24: final audit F11 / F12:
  - F11: in the retract phase the dicing blade lifts 80 mm and exits past the piece edge along the cut direction; at
    t = 1 it is hidden, so no part is over the wafer.
  - F12: the block-scale coat film (spin coater) and the debond track overlay are clipped to the window behind the
    section plane (`zSec`). The engine draws only the block's back half, so the front part had been floating outside
    the block.
  - Shots (own server :47363, `frame()` after seek): CoWoS logic_saw_d / singulate t 1.0, singulate t 0.95,
    00027 s08 block t 0.3, 00027 s10 block t 0.5 -> `cache/process3d_renders/tools_fab/final_fix_20261024/`.
    `pnpm check` 0 errors.
- 2026-10-24: general block / cell clip (coordinator, after F12):
  - At block and cell scale every fab-tool material is clipped to the block window behind the section plane: four
    world-space planes (x0, x1, z0, zSec), set up in `FabBase.place` (`setupWindowClip`) and recomputed from
    `group.matrixWorld` on every update.
  - Covered: own materials incl. glow ShaderMaterials (`clipping: true`), Points and lines; library materials via
    `ProcMaterial.setClipping`, including those created lazily.
  - Tools covered: wet-bench liquid / spray, CMP slurry film / pad, ECP electrolyte and particles, litho light /
    puddle, PVD / CVD / DRIE glow and particles, spin-coater film, debond tracks / beam, dicing blade, grinder segments.
  - Shots, one block-scale step per tool:
    - 00027 s29 wet bench, s01 ECP;
    - CoWoS tsv_etch t 0.35 litho, 0.55 DRIE, 0.85 wet bench;
    - tsv_liner CVD, tsv_barrier_seed PVD, tsv_cmp CMP.
    - Nothing extends past the block. Folder: `cache/process3d_renders/tools_fab/clip_20261024/`.
  - `pnpm check` 0 errors.
