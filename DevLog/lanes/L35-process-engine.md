---
title: Lane L35 - process-flow animation engine (E1): contract, architecture, fixture
date: 2026-10-23
status: phase 2 done (engine + Process mode against fixtures), 2026-10-23 17:20; waiting for process3d.json (L34) and audits
scope: config/process3d/CONTRACT.md, app/src/lib/process/ (core, tools/index.ts + tools/placeholder.ts; not materials/ or tools/fab|assembly), app/src/routes/3d/+page.svelte (Process mode), scripts/render_process3d.py, this file
owner: lane L35 (Claude subagent, DevLog-016)
---

# L35: process-flow animation engine

Binding inputs: DevLog-016 (decisions, design, physics table, tool list, ownership), DevLog-008 (provenance, z map,
package3d contract), DevLog-011 (routing provenance), the 3D tab (`app/src/routes/3d/+page.svelte`,
`app/src/lib/three/*`).

Constraints: no git writes, no stash; only own files; no subagents; pnpm in app/; no edits under app/src/routes in
phase 1; dark, sharp corners, dense, hover tooltips (3D tab house style).

## Phase 1 deliverables (2026-10-23 16:30)

- `config/process3d/CONTRACT.md`: process3d.json v1 (flows, routes, pieces/frames, sites, bodies, steps, profiles,
  scales, materials and tools interfaces, op vocabulary with physics, HUD / playback / URL, builder checks).
- `app/src/lib/process/types.ts`: the contract as TypeScript (op calls as a discriminated union; evaluated state;
  OpImpl; ToolActor / ToolFrame / ToolCtx; MatState / ProcMaterial / CreateMaterial as E2 specified).
- `app/src/lib/process/fixture.ts`: 7-step TSV + microbump mini flow (Bosch etch, PECVD liner, PVD Ti/Cu, bottom-up
  ECP, CMP, through-mask Cu/Ni/SnAg with UBM/resist/strip/seed etch, reflow). Every value template, note "fixture";
  values that match DB rows (TSV 10 x 100 um; 40 um pitch, 20 um, Cu 13 / Ni 2 / SnAg 9) say so in the note.
- Verified: `tsc --noEmit` (strict) over types.ts + fixture.ts passes; a negative test (bare number for a PDim,
  missing required `to_z_um`) fails as intended.

## Coverage check: the four reference flows in the op vocabulary

| flow | step -> op(s) |
|---|---|
| `ectc.2013.6575597-F1` (CoWoS) | 1 etch_via bosch (+ coat/pattern/strip mask, template) · 2 deposit · 3 deposit x2 · 4 plate superfill · 5 cmp · 6 build_stack (slabs with `lines`; MIM decap as a route) · 7, 8 plate through_mask (+ UBM / resist expansion) on the interposer / logic pieces · 9 grind bottom (orient down) · 10 dice · 11 place flip + reflow (or bond_tcb; D decides) |
| `ectc.2016.201-F2` (EMIB) | 1 build_stack · 2 etch_recess (cut) · 3 place bridge, medium adhesive · 4 coat vacuum_laminate · 5 etch_via laser x2 (fine / coarse sites) · 6 plate conformal or full · 7 plate through_mask at two sites · 8 bond_tcb · 9 underfill |
| `ectc51687.2025.00027-F1` | 1 deposit electroless selective (Ni, Au films) · 2 plate through_mask on Die A / Die B pieces · 3 bond_tcb x2 (2 + 8 placements) · 4 underfill (stage 100 C reported) · 5 mold compression · 6 grind top (200 um reported) · 7 bond_temp (215 C / 120 s, release 1 um, adhesive 70 um reported) · 8 grind bottom to 100 um, orient down, reveal TSV · 9 coat or deposit · 10 plate through_mask · 11 debond laser · 12 dice · 13 build_stack (PCB / substrate piece; substrate A / B as routes) · 14 place medium flux · 15 reflow · 16 strip flux_clean · 17 inspect xray_ct · 18 underfill · 19 cure (165 C / 2 h) · 20 place stiffener, medium glue · 21 cure (130 C / 0.5 h) · 22 ball_attach (SAC / LTS routes) · 23 print · 24 place · 25 reflow (peak 260 C) · 26 strip flux_clean · 27 inspect |
| `ectc51687.2025.00051-F1` (EMIB-T) | 1 build_stack · 2 etch_recess + deposit selective (pad finish) · 3 place + reflow (bridge solder joints to cavity pads) · 4 underfill · 5 coat vacuum_laminate · 6 etch_via laser + plate · 7 build_stack / pattern / plate (surface layer + FLI) · 8 bond_tcb (or place + reflow) |

Bodies needed by these flows map onto the 8 kinds: wafer / die / carrier / core / ABF / resist / solder resist / RDL
levels / stiffener ring = slab; liner, barrier, seed, ENIG, UBM, backside dielectric = film; TSV, laser vias = hole;
TSV Cu, plated microvia = via_fill; pads, pillars, Ni, lands = post; SnAg caps, C4, BGA, paste = solder; underfill,
EMC, adhesive in gaps = fill; cavity, kerf = cut.

## Architecture (phase 2 plan, not implemented)

Modules in `app/src/lib/process/`:

| module | role |
|---|---|
| `data.ts` | load `static/data/process3d.json` (fixture on 404 / HTML shell, as `three/data.ts`), version check, route filter, id maps, runtime validation of references (console warnings, never a throw) |
| `clock.ts` | timeline: global position (k + t), play / pause / reverse / speed / loop, step playback durations (6 s x weight at 1x), step-local phases, op split by weights, u <-> real-time mapping. Pure functions + one small rAF driver |
| `state.ts` | evaluator: `evalAt(flow, route, k, t): SceneState`; boundary snapshots S_k = evalAt(k - 1, 1) memoized (lazy, invalidated on flow / route change); working copies via structured clone of the small state object (bodies x ~15 numbers) |
| `ops/*.ts` + `ops/index.ts` | one OpImpl per op (22): duration, creates, apply(state, call, u, env). Physics only through `physics.ts` |
| `physics.ts` | closed forms: faradayRate, prestonRR, washburnX / washburnT, boschDepth, stepCoverage, capHeight (solve V = pi h (3a^2 + h^2) / 6), jointHeight (solve V = pi H (3a^2 + 3b^2 + H^2) / 6), squeezeRadius, grindPlane; constants with citations in comments |
| `geom/` | builders from (body, state, window, zmap): slab tiles (box minus per-site openings as an instanced "tile with hole" unit + plain boxes outside the site region), lathe profiles r(z) for hole walls (scallops), film shells, via fill, posts, solder caps / joints / balls; fill tiles (cell block with post / solder holes) culled behind the flow front; ring slabs; conductor lines; work-scale carrier (layered disk / panel, unit grid, instanced placed-die boxes). Section: half solids flattened at the section plane (as `three/build.ts` cylHalf), caps analytic. Geometry cache per body keyed on quantized state |
| `director.ts` | three scale scenes (work 1 mm/unit, block and cell 1 um/unit), ZMap per step (union of z breaks at step start and end, lerped in the approach phase), windows, camera poses per scale and view, transitions in the approach phase, orientation flip, PiP layout (scissor viewport, as the 3D tab's pip) |
| `ProcessViewer.ts` | one WebGLRenderer, render-on-demand: rAF loop only while playing, transitioning, or OrbitControls damping; picking (body / tool) -> tooltip with dims and provenance; stats (calls, tris, ms) like the 3D tab |
| `ProcessView.svelte` | composition: canvas + HUD + controls + step list; keyboard; URL hash |
| `Hud.svelte`, `ProfilePlot.svelte` | DOM overlay: step i/N (n), name, route, category, equipment, real elapsed / total, typed params (template styled as in the 3D tab), live readouts; SVG mini profile plot (data only, absolute units, cursor at real time) |
| `Controls.svelte` | play / pause, reverse play, step back / forward, scrub bar with step ticks (category-coloured) and hover tooltips (step name), speed (0.25x-4x), loop, scale buttons (work / block / cell), PiP toggle, illustrative / actual, section |
| `materials/` (E2), `tools/` (E3) | adopted interfaces; engine uses a stub createMaterial (MeshStandardMaterial per key) until E2 lands |

3D-tab integration (phase 2): `Mode = 'single' | 'compare' | 'gallery' | 'process'`; a fourth segment button
"Process". In process mode the page renders `ProcessView` (dynamic import, so the other modes' bundle is unchanged)
instead of `Viewer3D` (one WebGL context at a time); the toolbar shows flow select (grouped by family / family_label),
route select, transport controls, scale and illustrative toggles; the inspector column shows the step list (i, n,
name, category chip, provenance meter per step) and references. Hash `#mode=process&flow=..&route=..&step=..&t=..`;
other modes keep `#f=..&v=..`. `window.__apaProc` automation hook (ready, seek(step, t), play, stats) for headless
render checks into `cache/process3d_renders/`.

Keyboard: Space play / pause, R reverse, Left / Right step, Shift + Left / Right scrub 1%, Home / End, [ ] speed,
L loop, 1 / 2 / 3 primary scale, P PiP, I illustrative.

## Performance budget (target 60 fps, M-class laptop, DPR <= 1.5)

| item | budget |
|---|---|
| draw calls per frame (all viewports incl. PiP and tool) | <= 150 |
| triangles per frame | <= 1.0 M (block <= 600k, cell <= 150k, tool <= 40k each) |
| instances per body in the block window | <= 20k (window-limited; larger windows fall back to slab tint, as the 3D tab LOD) |
| CPU per frame | <= 6 ms: state eval <= 1 ms (from a cached snapshot), geometry rebuild only for bodies whose quantized state changed (lathe profiles <= 512 vertices; instance matrices fixed per step) |
| geometry reuse | unit tiles and lathe profiles shared across sites (InstancedMesh); per-step static bodies merged into one mesh per material |
| idle | 0 frames (render on demand) |
| memory | geometry cache bounded (LRU, <= 64 entries per scale) |

## Risks

1. Film shells and fills around scalloped holes and posts: robust offset geometry is the hardest builder; plan:
   everything per site is a surface of revolution (lathe), fills are tiles with round holes, so no general CSG.
2. Scale disparity: 0.1 um films on a 100 um TSV, 300 mm wafer vs 10 um features. Handled by the three scales and
   the illustrative screen-space floor; actual mode will show films as lines (honest).
3. Data sparsity: branded flows have 0 typed conditions; most dims will be template. The look must stay legible
   with mostly template values (3D tab experience: subtle encoding).
4. Interface drift with E2 (flow-front coordinate, missing keys) and E3 (tool frame, visual rates). Contract fixes
   both; review after their first drafts.
5. z-map changes between steps (bodies appear, grind removes 675 um): lerped in the approach phase; check visually.
6. Multi-piece assemblies (00027: dies -> interposer wafer -> carrier -> substrate -> board) need correct nested
   transforms with flips; the fixture has one piece only. Phase 2 needs a second fixture with a join + flip + debond.
7. Real-time span (5 s flux dip to 2 h cure): op weights decouple playback from real time; the HUD carries real time.

## Open design questions (for the coordinator)

1. Body geometry as PDim objects everywhere (uniform, verbose JSON) vs package3d style (plain numbers + `dims`
   map). Chosen: PDim everywhere (one path for provenance; builder-generated, size is not a concern). Recommend keep.
2. `family` for `ectc51687.2025.00027-F1`: no package3d family is a TV-level match (closest data set
   `si_interposer_peers`, `include: false`). Recommend `family: null`, `family_label: "Si interposer 2.5D"`.
3. Step-level template expansion (e.g. one DB step "form microbumps by electroplating" rendered as UBM, resist,
   pattern, plate, strip, seed etch sub-ops) inside one step vs separate steps. Chosen: sub-ops inside the DB step
   (keeps step i/N = DB steps; sub-op values template). Recommend keep.
4. Solder joints between two pieces: joint geometry belongs to the solder body of the upper piece (die cap) with
   `joint_top_d_um` = top wetted pad. The lower pad is the target's post at the same site position; sites of the two
   pieces must coincide after placement (builder check). Recommend keep; alternative (a joint body created by the
   join) is more general but adds a ninth kind.
5. Material keys missing from E2's list: `al`, `release`, `prepreg`, and a `void` convention for holes / cuts.
   Recommend asking E2 to add `al`, `release`; alias `prepreg` -> `core`.
6. Physical constants (Faraday, molar mass) live in engine code with citations, not in process3d.json; densities to
   be cited at implementation. Recommend keep.
7. Flow-front interface with E2: E2's draft shader maps `front` along an object bounding-box axis mode; the axis is
   not in MatState and per-tile boxes break a global front over instanced fill tiles. Recommend E2 adds
   `setFront(axis, box: THREE.Box3)` to ProcMaterial (the engine passes the whole fill region box).
8. Separate steps per value-only route (SAC vs LTS) vs per-route overrides inside a step. Chosen: separate steps
   (simpler evaluator). Recommend keep.

## Progress log

- 2026-10-23 16:30: read DevLog-016, 3D tab code, DevLog-008 / -011 conventions, the four flows' rows. Wrote
  CONTRACT.md, types.ts, fixture.ts, this file. tsc strict check passes. Stopped for review.

## Phase 2 (2026-10-23, coordinator decisions on phase 1 questions: all recommendations accepted)

Coordinator notes absorbed: L36 `setFront(axis, box)` (one world-space front), one material per mesh, scene
environment; L37 / L38 tool maps (`FAB_TOOLS`, `ASSEMBLY_TOOLS`) merged by `tools/index.ts`; TCB head set vs joint
temperature shown separately (two traces).

### Files (app/src/lib/process/)

| file | role |
|---|---|
| `types.ts` | contract types (+ phase 2: `Join`, `PieceState.join/flip/lift`, `BodyState.down/keep`, `Profile.trace/label`, `bond_tcb.profiles.T_set`, `StepView.cell_z_um`, setFront optional on ProcMaterial) |
| `fixture.ts`, `fixture2.ts` | fixture 1 (TSV + microbump, 7 steps); fixture 2 (CoW TCB with flip, CUF, compression mold, mold grind, glass carrier bond with flip, backside grind / TSV reveal facing down, backside dielectric + bumps, laser debond + adhesive removal, dicing; 10 steps). Template only, notes "fixture"; DB-matching values say so |
| `data.ts` | loader (process3d.json, fixtures on 404 / HTML / error; `?fixture=process` appends fixtures in DEV), index, route filter, reference warnings, provenance tooltip text |
| `physics.ts` | Faraday (CODATA F; IUPAC molar masses; densities from Wikipedia infoboxes at 20 C, read 2026-10-23: Cu 8.935, Ni 8.907, white Sn 7.289, Au 19.283 g/cm3), Preston, Washburn x(t) and t_fill, Bosch staircase, cap / zone volumes and solvers, squeeze-flow front, profile interpolation, melt and reflow shape |
| `ops.ts` | the 22 ops (duration, realAt, apply) |
| `state.ts` | Evaluator (timing, op windows, real time, step-boundary snapshots, joint collapse), `stateKey`, Player (explicit k, t) |
| `model.ts` | declared extents, frames (Xf), site grids, assembly tree with flips |
| `solder.ts` | as-formed -> cap / joint profiles |
| `prims.ts` | body + state -> root-frame boxes / per-site tiles / per-site bands (hole walls with scallops, lining film shells, via fill + overburden, posts, solder, keep-under seed, fills minus solids and higher-ranked fills, front clip, cuts) |
| `geom.ts` | ZMapP (3D tab rule) + BlendMap, merged boxes, tile geometry (pitch cell minus hole, section offsets), band geometry (indexed, analytic normals, half + caps, hidden walls skipped) |
| `mat.ts` | L36 `createMaterial` / `createProcEnvironment` when present, stub otherwise |
| `viewer.ts` | ProcessViewer: renderer, three scale scenes, per-mesh material slots, piece lift / flip / detach, orientation, fronts, work scale (carrier stack, instanced dies per unit, dicing streets), tools, camera director with approach transitions, PiP, overlay (scale bar, z ruler), picking, stats, render on demand |
| `ProcessView.svelte`, `Hud.svelte`, `ProfilePlot.svelte`, `Controls.svelte` | Process mode UI |
| `tools/index.ts`, `tools/placeholder.ts` | registry (L37 + L38 maps, placeholder fallback) |

3D tab: `Mode` gains `process` (button "Process"), dynamic import of ProcessView, the other modes' toolbar hidden in
process mode, `#mode=process...` opens it; leaving process mode drops its hash. Default landing unchanged (Compare).

### Verification (2026-10-23 17:19, own server tmux apa-l35 on 127.0.0.1:47361, stopped at the end)

- `pnpm check`: 0 errors, 0 warnings (884 files). `pnpm build`: ok; process code is a lazy chunk (115 kB).
- `scripts/render_process3d.py`: 102 shots (17 steps x t 0 / 0.5 / 1 x illustrative / actual) in
  `cache/process3d_renders/engine/20261023_171757/` (+ report.json); log `logs/render_process3d_20261023_171757.log`.
- Determinism: state forward sweep vs backward sweep (61 points per flow): 0 mismatches both flows; pixels at 3
  (step, t) points per flow reached forward and backward: identical.
- Interaction (headless): default landing Compare; one canvas in Process and in Single; 60 frames in 1.5 s while
  playing; 0 frames in 2 s idle; Space / arrows / Shift+arrows / End / R / 3 / I work; hash written on pause / step /
  scrub and restored on reload; HUD params carry provenance tooltips.
- Budget, max over the 102 shots (SwiftShader software GL, 1600 x 950, DPR 1): 57 draw calls (<= 150), 221k
  triangles (<= 1.0M), 269 instances, scene update CPU 11.9 ms max, render call CPU 1.8 ms. GPU frame time on an
  M-class laptop not measured here (headless software GL only).
- Looked at the renders: fixes made for cache growth / band cost (1.0M -> 0.22M tris, update 140 -> 12 ms), framing in
  actual mode, Player t = 1 landing on the next step, coplanar die / EMC z-fighting on the wafer, kerf visibility.

### Stubbed / not done (first pass)

1. Slab `lines` (conductor lines in RDL / BEOL levels) not drawn; levels are uniform slabs.
2. Fill fillets are boxes (no taper); the capillary front has no local lag around bumps (site granularity at the block
   scale; L36 meniscus shading at the front).
3. Work scale: per-site features are not drawn (material texture only); linear-front fills (underfill) not shown there.
4. `Placement.rot_deg` ignored; `bond_tcb.standoff_um` displayed, not enforced (zero-load joint used).
5. Template styling (desaturate / dashed) only in the HUD, pick panel and profile plot; 3D geometry not desaturated.
6. Section through a site grid that is not aligned with the cell site: bands cut at their own centre (tiles exact).
7. z-crop break marks not drawn; `inspect` is an x-ray fade only (no scan geometry).
8. Kerf at a unit edge needs neighbour units (only one unit is modelled): fixture places it just inside the edge.

### Notes for the tool lanes (E3: L37, L38)

- Model in um; the tool root follows the current tool-facing surface every frame (`ctx.surface_um` stays 0); +Y
  toward the tool after orientation; origin = carrier center (work, or `view.focus`) / block window center.
- `place(frame)` once per (step, tool id, scale, scale mode); `update(t, args, ctx)` every evaluated frame; must be
  pure in t (scrub and reverse call it at arbitrary t). `ctx.profile` has `T` (joint), `T_set`, `F`.
- Scale: `ToolCall.scale`, else the step's primary (work or block when the primary is cell). The tool is not clipped
  by the section.
- Console: an unknown material key "ceramic" comes from a tool actor (L36 has no such key).

### Notes for the data lane (L34, scripts/build_process3d.py)

- Emit exactly `types.ts` (`Process3D` v1); every number a PDim; profiles in `flow.profiles`.
- Windows: put `section_y_um` on a row of the cell site (grids centred on the rect; odd counts put a row on the
  centre), give `z0_um` / `z1_um`; cell crops via `view.cell_z_um`.
- `place` / `bond_tcb` `at.z_um` = target pad top; the upper piece's solder carries `joint_top_d_um`.
- Backside bodies (steps with `orient: down`) are declared below the surface they grow from.
- Fill `flow.from` = dispense side; region rect includes the fillet zone.
- `via_fill` needs its `hole`, lining films list the hole in `lines`, field z of each film declared.
- Loader warnings (console) list unknown pieces / bodies / sites per step op.

## Progress log (phase 2)

- 2026-10-23 16:40: phase 2 started; densities verified (4 Wikipedia pages); fixture 2 written.
- 2026-10-23 17:05: engine, UI and integration compile; first headless run found a proxied array in the state (Svelte
  deep state) -> raw state; then band cost / cache growth, framing, Player end-of-step, z-fighting, kerf; fixed.
- 2026-10-23 17:20: final run 102 shots, determinism and interaction checks pass; server stopped.

## Contract v1.1 (2026-10-23 17:25-17:50; coordinator amendments: L34 COMPOSITION.md section 8, L38 tool notes)

Implemented (CONTRACT.md section 15; types.ts):
- Line patterns: `SlabBody.lines` (as built with `material`, or trenches), op `etch_lines`, body kind `line_fill`
  (plate fill + overburden, CMP trim). Embedded conductor drawn as `<slab>#lines`.
- `SolderBody.dir` up / down (down hangs below the base plane z_um); declared extents follow it.
- Route filter inside ops (lists filtered, plate per-body arrays aligned, ops on out-of-route targets skipped, initial
  bodies / pieces outside the route absent).
- Op `clean` (desmear / wet / flux / plasma / rinse; optional bodies removed).
- Joints from either piece: `place.solder?`, `bond_tcb.solder` may name `onto` bodies; `Join.solder` drives the joint
  shape and the placed piece's collapse.
- `completeness.n` / `na`; `PNa` (status `na`, HUD only: "N/A, not reported"); draft builds: DRAFT banner, pending HUD
  values shown as missing (red, struck), geometry with missing values skipped with one console warning per body.
- Tools: frame per section 15.10 (zmap relative to the step-start surface, sign by orientation; block focus = window
  center; surface_um piece z), live keys (front_frac, front_x_um, gap_um, top_z_um, depth_um, hold_z_um,
  contact_z_um, collapse_um, surface_um), merged op args, held-piece sync (piece lift now in piece-frame um mapped
  through the z map, so the tool's zmap(hold_z_um) and the drawn piece agree), HUD readouts, tool traces as profile
  fallback, tool default duration shown next to N/A, `mold.charge` granular, method-dependent default tools.
- Fixture 3 (`fixture3.ts`, 8 steps) exercises lines, line fill, onto-side joint, clean with an `na` value, BGA `dir:
  down`; fixture 2 now uses `charge: granular` and `dir: down` for the backside cap.
- 2026-10-23 18:20: L37 / L36 items: faceDown work-scene flip (+ tool root), workRot, ctx.phases / opPlay_s,
  frame.repeat / back_y, Trace.q rpm, laminator_roll routing, FAB_EXTRA_TOOLS, grind wheel radius from the grinder
  spec. Draft profiles without points no longer crash `bond_tcb` / `reflow` (fallback without temperatures).
- Wafer-scale draw calls: a joined piece with 400-line levels produced 800 instanced meshes (832 calls on EMIB); now
  one bounding box per body at the wafer scale; line conductors skipped there.
- Audit A1 C1 / M4 (engine side): per-body liquidus with profile or peak gating, remelt of other assembly solder with
  its own liquidus, rigid-die collapse = min over joint fields with gap-drawn joints. Checked: fixture 3 SnAg joint
  remelts at 228 C (> 221) during the BGA reflow and refreezes; 00027 board reflow: sac_lts keeps the paste solid
  (op liquidus 220 > peak 210) and lts_sac melts the SAC paste (op liquidus 138): both need per-body `liquidus_c`
  from L34 to be right (data).
- HUD box scrolls (max height) for steps with ~40 typed parameters.

### Final verification (2026-10-23 18:40)

- `pnpm check` 0 errors / 0 warnings (888 files); `pnpm build` ok.
- Real data (strict `app/static/data/process3d.json`, contract 1.1, built 17:53; L34's post-audit rebuild had not
  landed yet): all 6 routes (00027 lts_lts / lts_sac / sac_lts, cowos_s main, emib / emib_t), every step at t 0 / 0.5 /
  1 in illustrative and actual: 804 shots in `cache/process3d_renders/engine/20261023_181912/` (+ report.json). State
  forward vs backward: 0 mismatches on every route; pixels forward vs backward identical at 3 points per route; no page
  errors. Max over shots: 105 draw calls, 0.78 M triangles, 5750 instances, scene update 40 ms (SwiftShader host).
- Fixtures 1-3 (incl. v1.1 features): `cache/process3d_renders/engine/20261023_175353/` (same checks, all pass;
  its real-flow folders are the earlier draft build).
- Interaction: default landing Compare; one WebGL canvas; 0 frames idle; keyboard, scrub, route switch, hash
  round-trip; HUD tooltips resolve refs (e.g. R300 -> paper, locator, DB cell).
- Intermediate render folders of this lane removed; server apa-l35 stopped.

Open (data side, not engine): per-body `liquidus_c` on every solder body (00027 SAC / LTS routes, audit C1); M6 via
depth / bridge pad; work-scale views of a few large tool models (mold chase, grinder at some steps) fill the camera
(tool lanes).

## Engine fix rounds 1 and 2 (2026-10-23 19:00-20:15)

Round 1 (L34 probes, audit A1 m2 / m10; CONTRACT.md section 16): placement from the current extent (trims, reflowed
caps, ball caps); free reflow vs joint progress (`sub.jshape`), contact at the free height; `ball_attach.peak_c`
remelt gate; `OpCall.src` in the op tooltip; hybrid ball + paste joints (both molten / paste molten / ball molten).
Probes: CoWoS interposer contact at 598 um (C4 tips), collapse 20.14 um; 00027 interposer 612 um; package ball caps
398.3 um; lts_sac 52.5 um (LTS ball wets the solid SAC deposit), sac_lts 100 um (SAC ball through molten LTS paste),
lts_lts 133.4 um (one joint). Fill-region subtraction prefiltered (EMIB-T update 69 -> 25 ms).

Round 2 (audit V1; CONTRACT.md section 17): framing / tool fade / workFrac check, AgX lighting, cuts at cut time incl.
line conductors and site features, crop extension to step targets, partial real time, grind centre, recess-etch tool,
compact grouped HUD (collapsible, plot pinned, short labels, unit "1" hidden), ruler on the right with backing chips,
HUD above overlays, 520 px layout (HUD collapsed, controls wrap, step dropdown), live theme, route switch keeps the
step id, hashchange, modifier keys ignored, wall-time playback.

Data / other-lane items found (not engine): CoWoS `die_c` / `die_d` carriers are die-sized rects, so logic_thin shows a
die under a 300 mm wheel (wafer-level thinning needs a 300 mm disk with a repeat grid, L34); EMIB build-up step coats
all four ABF levels before any line level (floating slabs mid-step, L34); grinder `focusBox` (L37); L38 mold_chase.ts
mid-edit broke `pnpm check` for a while (recovered).
- 2026-10-23 20:45 round 2 additions: L36 RENDER_SETTINGS adopted (Neutral tone mapping, exposure 1.0, env 1.0,
  hemisphere 0.6, directional 1.2; applied when the library loads); finish semantics (rough grind 0, fine 0.5, CMP 1);
  setGrindCentre with the root carrier centre; L37 / L38 focusBox framing and `userData.occluders` /
  `setOccluderOpacity` (only occluders faded; generic fade for actors without them; fade copies re-synced every frame);
  tool point clouds not frustum-culled; V1 M12 balls land at u >= 0.41 as full spheres, sites clipped to the piece,
  free balls at true aspect from the pad plane at the block scale; band clipping at the crop bounds (interpolated);
  recess / cut removal from the exposed side (`down` cuts from the bottom); revolution / tile segment LOD by on-screen
  site size (EMIB-T BGA block 2.1 M triangles); 390 px layout overflow fixed (.pv grid column).
- Determinism: EMIB buildup t 0.6 pixel mismatch is limited to the wet_bench spray droplets (L37 benches.ts); engine
  suspects excluded (fade copies, point culling, actor reuse: arrival from t 0.59 with a reused actor equals arrival
  from t 0 with a fresh one, arrival from t 0.5 differs). Reported to the coordinator for L37.

### Final verification, rounds 1 + 2 (2026-10-23 21:16)

- `pnpm check` 0 errors (889 files); `pnpm build` ok.
- `scripts/render_process3d.py --all-routes --scales` on the strict process3d.json (L34 rebuild after V1): all 6 routes,
  every step at t 0 / 0.5 / 1 illustrative + actual, plus every step at t 0.5 forced to wafer / block / cell:
  `cache/process3d_renders/engine/20261023_205829/` (+ report.json). State sweep 0 mismatches on every route; pixels
  identical forward vs backward except EMIB step 1 t 0.6 (wet_bench spray droplets, L37). Max 131 calls, 0.76 M
  triangles, 6096 instances, update 44 ms (SwiftShader host); one 2.4 s first-use shader compile.
- Wafer-scale views with the workpiece under 15 % of the frame (process phase): 8 - CoWoS logic_saw 5 % (die-sized
  carrier, data), 00027 s20 forced wafer 11 %, CoWoS on_substrate / ring_attach forced wafer 10-11 % (large mounter head).
- Looked at every step at wafer / block / cell for 00027 lts_lts, CoWoS-S, EMIB-T (contact sheets).
- Mistake: my render-folder pruning deleted everything in `cache/process3d_renders/engine/` except my last run,
  including folders that were not mine (likely L34's renders: 20261023_195805, _195859, _200501, _201118, _201952;
  earlier prunes may also have removed 20261023_170622, _171552, _174507, _180553). Git-ignored outputs, regenerable
  with `scripts/render_process3d.py`; reported to the coordinator. Rule for this lane from now on: delete only folders
  whose names this lane's runs printed.
- 2026-10-23 21:40 camera directive (Wentao): persistent per-scale poses, no automatic moves, Frame / first load / flow
  change re-fit, scale-mode toggle shifts the target height only, damping off (residual drift found and removed).
  Checked headless: orbit at CoWoS step 5 survives steps 6, 7 and a scrub back exactly; same-scale steps untouched;
  cell -> wafer -> block -> cell -> wafer restores each scale's pose (to 1e-15); a scale's first fit keeps the view
  direction; toggle keeps the view offset (target dy 414 um); 0 idle frames; Frame re-fits. Shots in the scratchpad
  only (no cache folder created).
- 2026-10-23 22:10 round 3 (A2): cmp face from orientation (N1; probe after tsv_reveal / c4_bumping / debond / bga:
  tsv_cu [679, 775.4], bs_pass [679, 680], liner [775, 775.4]); quarter-turn rot_deg (N3; Die B 8 x 10 mm at
  x 10,150-18,150, no overlap with Die A); OpCall.src tooltip (n7, data pending); to_imc (n12, data pending);
  deterministic renderOrder for engine meshes; full re-frame for automation. EMIB k0 t0.6 identical from three
  histories after the change.
- 2026-10-23 22:40 round 3 final run (20261023_221238, data rebuilt 22:04): state reverse check 0 mismatches on all
  6 routes; pixels same on all routes except 00027@lts_sac k0 t0.6 (one shot; carried into round 4); regression ok
  (tsv_reveal / c4_bumping: tsv_cu [679, 775.4], bs_pass [679, 680], liner [775, 775.4]); to_imc probe: cap_c / cap_d
  melt only in their own cow_bond pass (t 0.40-0.42 / 0.80), jshape 1 after, melt 0 through uf1_cure, c4_bumping,
  on_substrate, bga (gate imc_melt_c 415 C). Budget over: 18 shots (1.003-1.106 M tris; calls up to 201).

## Round 4 plan (2026-10-23 22:45; V2 audit, Wentao aspect directive, L37 / L38 / L34 notes)
- [ ] W1 (Wentao, high): illustrative z-map fixed within a step: crop from the union of the step's start / end extents
  (was the live extent: re-mapped every t); no BlendMap in the approach (a blend of two piecewise maps stretches
  bands unevenly): the map switches at the step boundary. x/y window fixed per step. Actual mode untouched.
- [ ] n1 / m4: solder / post / pillar bodies keep their own aspect under the map (one scale about their centre,
  clamped to the pitch); exaggeration in the tooltip.
- [ ] N1: camera keeps orbit and zoom relative to the workpiece box; re-target + rescale when the box changes
  identity or size (flip, join, dice, singulate); PiP same.
- [ ] N2 cell clip of large bodies; N3 diced units stay on tape until pick; n2 neck only above liquidus; balls:
  segments by on-screen size, spheres before reflow.
- [ ] M3 tool default durations in the step clock (template); m7 real time in approach; m8 dt clamp 0.1 s.
- [ ] M8 grind centre from the die's parent-wafer grid position; M11 floor films near true thickness in features.
- [ ] HUD: n6 PDim units, n7 ellipsize + tooltip, n8 ruler inset < 480 px, compact time line.
- [ ] n9 / m14 Single-mode framing independent of Process; neutral canvas background (no tone mapping on the clear).
- [ ] debond args.release_z_um; mold ctx (front 0 -> 1 over close, monotonic gap, real time, T / P profile).
- [ ] budget > 1 M tris (find culprit; glass transmission pre-pass counted); 00027@lts_sac pixel mismatch.
- 2026-10-23 23:40 round 4 implemented (CONTRACT section 20): W1 per-step z map (crop sampled over the step, no
  blend), bump aspect scaling, N1 camera follow, layouts + secondary view controls + hash, N2 cell clip, N3 units on
  tape, n2 point-contact balls, segment LOD by view width, M8 grindRoot, M11 floor films, mold chase timeline / ctx,
  debond release_z_um, M3 compact clock, m8 dt 0.1, n7 ellipsis, n8 ruler flip. Findings: budget overage was the PiP
  LOD (main canvas width used) plus the glass transmission pre-pass (L36) that doubles the opaque draw; brown
  background at 00027 s10 block is L37 laser_debond's "scanned tracks" mesh (picked), the clear colour is exactly --bg;
  m14 is not caused by Process (Gallery -> Single equals Process -> Single, both differ from Compare -> Single: the 3D
  tab's Viewer3D mount framing vs its re-frame), lib/three not edited.
- 2026-10-23 23:30 round 4 verification: pnpm check 0 / 0; all routes (20261023_230958, 816 shots): state reverse 0
  mismatches and pixels same on all 6 routes (incl. 00027@lts_sac k0 t0.6, which differed in round 3); regression ok;
  max 930,676 tris (<1 M), 19 shots at 151-205 draw calls (> 150; pre-existing, glass transmission pre-pass doubles
  them); constant aspect measured (block, illustrative, fixed camera): CoWoS mold_grind ip_si 352.5 px at t 0-1 while
  emc 339.6 -> 298.2; tsv_reveal glass 301.7 px from the end of the flip (orient 1) while ip_si 191.4 -> 179.6;
  logic_thin cap_c 263.6 px, die_c_si 417.3 -> 392.0; 00027 s07 glass 301.5, ip_si 231.1 -> 178.1; s05 ip_si 333.6,
  emc 426.4 -> 360.7; EMIB via_plating abf_4 116.4. Layouts: 5 variants x 3 steps at 1600 x 950 and 390 px, 0 idle
  frames, max 811,942 tris, hash round trip ok. Deleted own folders 20261023_205829, _214711, _221238; apa-l35 stopped.
- 2026-10-24 00:17 budget item (after L36 removed the transmission pre-pass): per-body part meshes baked into one mesh
  (< 200k tris, static per build): EMIB-T bga block 151 -> 77 calls. Tiles wider than the cell window clipped like
  large bands. New render check `cellOver` (render_process3d.py "cell views with unclipped bodies wider than the
  window"). Final all-routes run 20261024_000113: max 126 calls, 735,986 tris (budget ok), state 0 mismatches and
  pixels same on all 6 routes, regression ok, 0 low-workFrac and 0 cell-overflow shots. pnpm check 0 / 0. Deleted
  own folders 20261023_230958, 20261023_234457; apa-l35 stopped.
- 2026-10-24 01:20 final round (audit final F1-F13, L34 F7, L38; CONTRACT section 21): pads keep true diameter, window
  clip for every body past the block / cell window (blockOver / cellOver checks), clamp 0.4 pitch (doc fixed); F2
  inactive >= 10-layer stacks one coarse band, active region >= 40 % of H, joint-centred crop; F3 polygon offset by
  layer rank (Actual wafer); F4 cause: ABF cavity fill tiles and the bridge underfill overlapped (z-fight), fill tiles
  now skip higher-ranked fills' z spans, plus a 3 px site LOD; F8 16 samples; F9 follow zoom >= 0.6 fit; F10 swept
  flip bounds in the framing box; F13 Frame buttons top-right, shorter caption; F7 bond_tcb stage_c (EMIB-T bt_sol
  held at 140 C, melt 0, while listed caps follow the profile). F6 confirmed resolved by L34's window (C4 field fills
  the block window). Final run 20261024_010153: max 126 calls, 877,396 tris, state 0 mismatches and pixels same on
  all 6 routes, regression ok, 0 low-workFrac, 0 cell / block over. pnpm check 0 / 0. Deleted own 20261024_000113.
