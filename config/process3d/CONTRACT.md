# process3d.json contract v1 (DevLog-016)

Owner: engine lane L35 (E1). Status: DRAFT for coordinator review (2026-10-23). Types: `app/src/lib/process/types.ts`
(the TypeScript source of truth; this file explains semantics). Fixture: `app/src/lib/process/fixture.ts`.

Producers: `scripts/build_process3d.py` (lane L34 / D) writes `app/static/data/process3d.json` from
`config/process3d/flows/*.yaml`. Consumers: the engine (`app/src/lib/process/`), materials (E2,
`app/src/lib/process/materials/`), tools (E3, `app/src/lib/process/tools/`).

## 0. Principles

1. Provenance (DevLog-008, binding). Every physical number is a `PDim`: `{value, unit, status, ref | refs, note,
   formula}`. `reported` needs `ref` (a key of `refs`); `derived` needs `formula` + `refs` (leaf cells) and may carry
   `values` (formula with numbers substituted); `template` needs `note` (rationale) and may carry `source` (public
   reference) and `refs` (analog cells). No bare physical numbers anywhere in the file.
   Status `na` (coordinator 2026-10-23, L34): "not reported", no `value`, `note` = "N/A, not reported: <quantity, why>";
   allowed only in `Step.hud[].q` and `Step.equipment` (HUD-only values that drive no geometry or op physics); the HUD
   shows "N/A, not reported" with the note. Draft files (`"draft": true`, top-level `pending: [{flow, where,
   quantity}]`) may also carry template PDims with note "pending: ..." and no `value`; strict files never do.
2. View parameters are not data: block windows, camera hints, playback weights, phase windows are plain numbers
   (they place the camera, they do not draw a dimension).
3. Deterministic: scene = f(flow, route, step, t). No op, builder, material or tool integrates over frames. Reverse,
   step back and scrub are evaluations at other (step, t). Step-boundary snapshots are cached.
4. One body model for all scales. Bodies are declared once, in their piece frame, with their as-built geometry.
   Ops never mutate declared geometry; they drive body state (growth, trim planes, melt shape, flow front, ...).
5. Composite flows: a step names the paper that supplies its order (`src.order_ref`) and the DB step it renders
   (`db_step`); every value carries its own refs, so one step can mix papers.

## 1. Top level

```jsonc
{
  "version": 1,
  "generated": "2026-10-23",              // ISO date
  "fixture": false,
  "note": "...",
  "refs": { "R1": { /* Ref, same shape as package3d.json refs */ } },
  "flows": [ /* Flow */ ]
}
```

## 2. Flow

| field | type | meaning |
|---|---|---|
| `id` | string | stable id, e.g. `cowos_s_composite`, `ectc51687.2025.00027-F1` |
| `name` | string | display name |
| `family` | string or null | package3d family id for the selector (`cowos_s`, `emib`, `emib_t`, ...); null when no 3D family exists |
| `family_label` | string | selector group label when `family` is null (e.g. "Si interposer 2.5D") |
| `kind` | `composite` or `paper` | composite = order and values combined from several papers; paper = one paper's flow as reported |
| `source_flows` | string[] | DB `process_flows.flow_id`s used |
| `routes` | Route[] | at least one; exactly one `default: true` |
| `summary` | string | <= 60 words |
| `refs` | string[] | ref ids supporting the summary |
| `pieces`, `sites`, `bodies` | arrays | geometry (sections 3-5) |
| `profiles` | Profile[] | time profiles referenced by steps and ops (section 7) |
| `steps` | Step[] | ordered (section 6) |
| `completeness` | {reported, derived, template} | share over every PDim of the flow (builder computes) |

Route: `{id, name, note?, default?, family?}`. `steps[].routes`, `bodies[].routes`, `pieces[].routes`: absent = every
route. A route is a filter; its step list is the flow order with non-matching steps dropped. Variants that differ
only in values (e.g. SAC vs LTS balls) are separate steps with disjoint `routes`.

## 3. Pieces (work items) and frames

A piece is one physical work item: interposer wafer, logic die (wafer), substrate panel/unit, board, glass carrier,
stiffener, stencil.

| field | type | meaning |
|---|---|---|
| `id`, `name` | string | |
| `kind` | `wafer` `panel` `strip` `die` `substrate` `board` `carrier` `stiffener` `stencil` `other` | |
| `carrier` | Outline | outline as processed at the work scale: `{shape: disk, diameter_mm}` or `{shape: rect, w_mm, d_mm}` (PDim), `notch?` |
| `unit` | `{w_um, d_um}` PDim | one unit (die, interposer, package site). The piece frame is centered on one unit |
| `repeat` | `{pitch_x_um, pitch_y_um, n?, edge_exclusion_mm?}` | unit grid on the carrier (work scale only); absent = one unit |
| `block` | Window | default block-scale window (piece frame) |
| `initial` | bool | exists at flow start; else it appears with its first op (`build_stack`, `place`, `bond_*`) |

Piece frame: x, y in um from the unit center; z in um up from the piece bottom with the front (device / build-up)
side up. Every body of the piece is declared in this frame. Scene axes (all scales, as in the 3D tab): scene x =
piece x, scene y = mapped z (up), scene z = -piece y.

Joins. `place`, `bond_tcb`, `bond_temp` attach piece A to target B at `at[]` (one entry per instance, e.g. 2 Die A +
8 Die B per interposer unit = two place ops, 2 and 8 entries). After the join A is a child of B; later steps address
the assembly through its root. `Placement = {x_um, y_um, z_um, rot_deg?}` in B's frame: (x, y) = A's unit center;
z = B-frame height of A's lowest point after orientation (for a flipped die: its bump tips) at first contact, before
any solder collapse (the op computes collapse). `flip: true` = 180 deg about A's x axis (y -> -y, z -> -z).

Orientation. `steps[].orient` (`up` | `down`) says which face of the root assembly faces the tool (`down` = the
assembly is turned over, e.g. backside grind on a carrier). The engine animates orientation changes in the approach
phase. Bodies never change frame because of orientation.

Detach. `debond` removes a carrier from its parent; `dice` singulates the root: the work scale switches from the
carrier outline to one unit.

## 4. Sites (repeated feature grids)

`{id, piece, name?, rect: {x_um, y_um, w_um, d_um}, pitch_x_um, pitch_y_um?, pattern: grid | stagger | single}`.
(`rect` is the region center + size, PDims.) Sites at region center +- k * pitch (as `IcArray` in the 3D tab). Every
per-site body (`hole`, `post`, `solder`, slab `openings`, selective films) references a site. Bodies that stack on
each other (pad, pillar, cap) use the same site. The cell scale is one pitch cell of one site.

## 5. Bodies

Common: `{id, name, piece, kind, material, label?, mat0?, routes?, initial?, group?, xray?, note?}`.
`material` = substance key of the materials library (section 9; `void` for `hole` and `cut`). `label` = material as written in the source
("Cu / Ni / SnAg"). `mat0` = initial `MatState` (defaults: all 0, temp 25 C is a display default, not data).
`initial: true` = present at flow start (bulk wafer, core); otherwise a body is absent until an op creates it.

| kind | geometry fields (PDim unless noted) | renders as | typical use |
|---|---|---|---|
| `slab` | `z_um`, `h_um`, `rect?` (default: unit), `frame_inner?` {w_um, d_um} (ring), `openings?` [{site, d_um, d_bot_um?, shape?}], `lines?` {line_um, space_um, dir, material} | box (or ring) with per-site openings; optional parallel conductor lines | wafer, die, carrier, core, ABF, prepreg, resist, dry film, solder resist, passivation, PI, RDL/BEOL level, stiffener, glue line |
| `film` | `z_um` (field bottom), `h_um` (field thickness), `rect?`, `lines?` (hole / opening-host / cut body ids whose walls and floor it lines), `cov_side_top?`, `cov_side_bot?`, `cov_bottom?` (fractions of `h_um`, unit `1`), `selective?` {site, d_um} (no field: only on pads), `over?` (post ids it wraps) | conformal shell over the field and inside the lined features | liner oxide, barrier, seed, ENIG/OSP finish, UBM, backside dielectric |
| `hole` | `site`, `hosts` (body ids it removes material from), `z_top_um`, `depth_um`, `d_top_um`, `d_bot_um?`, `scallop?` {period_um, amp_um}, `shape?` | void of revolution per site (wall profile r(z)) | TSV, laser microvia, TGV, opening etch |
| `via_fill` | `hole`, `mode` (`full` `conformal` `plug`), `wall_um?` (conformal), `overburden?` {h_um, rect?} | solid of revolution inside the hole minus its lining films; field layer above the hole top | TSV Cu, plated microvia |
| `post` | `site`, `z_um`, `h_um`, `d_um`, `d_top_um?`, `role` (`pad` `ubm` `pillar` `barrier` `finish` `via_land` `other`) | cylinder / frustum per site | pads, Cu pillar, Ni barrier, UBM stack, lands |
| `solder` | `site`, `z_um` (base), `d_um`, `h_um` (as formed), `form` (`plated` `paste` `sphere`), `wet_d_um?` (base wetted diameter), `joint_top_d_um?` (top pad after joining) | as-formed cylinder / paste dome / sphere -> volume-conserving cap or joint | SnAg cap, C4, BGA ball, paste |
| `fill` | `rect`, `z_um`, `h_um` (region), `flow` {from: `x-` `x+` `y-` `y+` `center` `perimeter`}, `fillet_um?` | region minus every other body present (site tiles with holes) with a flow front | underfill, EMC, adhesive, glue, TBA in gaps |
| `cut` | `hosts`, `rect`, `z_um`, `h_um` | box removed from its hosts | cavity, kerf, window opening |

Volumes used by ops are computed from the declared geometry (solder volume from `form`: plated = cylinder,
paste = cylinder (as printed), sphere = pi d^3 / 6).

## 6. Steps

| field | type | meaning |
|---|---|---|
| `id` | string | stable (URL) |
| `n` | number | display number within the flow (paper `seq` for paper flows; composite order otherwise). The engine also shows i/N within the route |
| `name` | string | DB step text (shortened when long; full text in the tooltip) |
| `category`, `step_kind` | string | DB `process_steps.category` / `step_kind` |
| `db_step` | string or null | DB `step_id`; null when the step is a template expansion with no DB row |
| `src` | {order_ref?, flow_id?, note?} | composite: the ref / flow that supplies this step's position |
| `routes` | string[]? | |
| `piece` | string | root piece the step works on (camera target) |
| `orient` | `up` `down` | section 3 |
| `view` | StepView | scales (section 8) |
| `ops` | OpCall[] | executed in order inside the step's process window |
| `tool` | ToolCall? | default tool for ops without their own `tool` (null = none) |
| `equipment` | PText? | DB equipment text with status / ref |
| `hud` | HudParam[] | typed parameters shown in the HUD: `{key, label, q: PDim or PText, kind: condition target result material equipment}` |
| `duration_s` | PDim or null? | stated total real time; absent = sum of op durations (derived when every op has one); null = not reported |
| `weight` | number? | playback weight (default 1); playback time = base * weight (Decision 5: similar per step) |
| `phases` | [a, b]? | process window inside t (default [0.12, 0.9]) |

Step-local time. t in [0, 1]: [0, a) approach (camera move between scales, orientation change, tool approach;
geometry = step start state), [a, b] process (ops), (b, 1] retract and hold (geometry = step end state). Inside the
process window ops split by `w` (playback weight per op, default 1), not by real time, so a 5 s flux dip stays
visible next to a 2 h cure. Inside one op, u in [0, 1] is linear in that op's REAL time, so nonlinear physics (sqrt
of t for capillary flow, staircase Bosch depth) is visible. HUD real time = sum of finished ops' durations + u *
current duration; an op without a duration shows N/A and its u is playback-linear.

OpCall: `{op, label?, w?, tool?, duration_s?, ...args}` (args flat on the call; per-op fields below).

## 7. Profiles

`Profile = {id, q, unit, pts: [[t_s, value], ...], status, ref?, refs?, note?, formula?}`. `q`: `T` (C), `F` (N), `P`
(MPa or kPa), `rpm`, `I` (mA/cm2), `v` (um/min). Time axis in real seconds from the op start. Profiles drive
material state (temp_c, melt via liquidus) and the HUD mini plot (data only, absolute units). A profile composed
from stated set points (peak, time above liquidus, ramp) is `derived`; a generic shape is `template` with note.

## 8. Scales

| scale | content | units | geometry |
|---|---|---|---|
| `work` | carrier (wafer disk / panel / strip / unit / board) + its unit grid + placed dies as boxes + the tool | 1 scene unit = 1 mm (`umPerUnit` 1000) | carrier as a layered disk/slab whose edge shows the stack (bodies with `rect` = unit or larger), top surface material = top body's material and state; per-unit placed pieces instanced. Per-site features below a pixel are not drawn (material carries the texture) |
| `block` | package cross-section block: the root assembly inside the step's window, section plane at `section_y_um` | 1 unit = 1 um (`umPerUnit` 1) | every body clipped to the window; per-site bodies instanced over the sites inside the window; section caps analytic (half solids flattened at the plane, as the 3D tab) |
| `cell` | one pitch cell of `view.cell_site`, centered on one site | 1 unit = 1 um | same bodies, high tessellation (scallops, film shells, meniscus), half-section through the site center |

`StepView = {primary, pip (null = none), cell_site?, block? (Window override), focus? {x_um, y_um}, camera? {work?,
block?, cell?: {view: iso | front | top | side, zoom?}}}`. `Window = {x0_um, x1_um, y0_um, y1_um, z0_um?, z1_um?,
section_y_um?}` in the root piece frame; z crop shows a break mark; default section = the row through the cell
site's center nearest the window center. The camera moves between scales in the approach phase; the PiP shows the
secondary scale, synchronized to the same t.

Illustrative vs actual (Decision 3):
- actual: true scale on all axes at every scale, ruler and scale bar.
- illustrative, block and cell: lateral true; z mapped with the 3D tab's ZMap (`app/src/lib/three/model.ts`: coarse
  intervals t^0.4, layers share their interval with a floor). The map is built from the z breaks of every body of
  the root assembly present during the step (start or end state) and is interpolated between consecutive steps in
  the approach phase, so it never jumps mid-step. Films, scallops and seeds below 2 px get a screen-space thickness
  floor (2 px normal, 1 px scallop amplitude); the HUD says "illustrative: films enlarged".
- illustrative, work: lateral true, stack thickness exaggerated so the carrier edge reads (each layer >= 2 px).

## 9. Materials interface (E2, adopted as specified)

```ts
createMaterial(key: string, opts?: { instanced?: boolean }): ProcMaterial
interface ProcMaterial { key: string; material: THREE.Material; set(state: Partial<MatState>): void;
  setScale(umPerUnit: number): void; setClipping(planes: THREE.Plane[] | null): void; dispose(): void }
interface MatState { finish: number; melt: number; cure: number; exposed: number; wet: number; temp_c: number; front: number }
```

Semantics: `finish` 0 as-deposited / ground .. 1 polished; `melt` 0 solid / paste .. 1 liquid / reflowed; `cure` 0
uncured .. 1 cured; `exposed` resist dose fraction; `wet` liquid film / slurry; `temp_c` (glow / tint); `front` flow
front 0..1 along the flow direction. Keys: si, oxide, nitride, cu, ti, ni, au, osp, solder, imc, resist, dry_film,
polyimide, emc, underfill, abf, core, solder_resist, glass, tba, daf, adhesive, flux, slurry, electrolyte, steel.
Requested from E2 (open item): al (Al RDL / pads), release (laser release layer), prepreg (or alias to core),
paste (or solder with melt 0 reads as paste). Unknown key: neutral grey material + console warning, never a throw.
The engine creates one ProcMaterial per body (per instancing mode), calls `setScale` with the scale's `umPerUnit`
and `set` every evaluated frame with the body's state. Flow-front convention (open item with E2; E2's draft shader,
2026-10-23, maps `front` along an object-space bounding-box axis mode +-x, +-y, +-z or radial xz): the engine needs
(a) a call to set the axis mode from `flow.from` (piece x -> scene x, piece y -> scene -z; `center` -> radial xz),
which is not in MatState, and (b) the front box to be the whole fill region, not each instanced tile's own box
(fills are drawn as instanced tiles). Proposed addition: `setFront(axis, box: THREE.Box3)` on ProcMaterial.

## 10. Op vocabulary

u = op progress (linear in real time). Physics is evaluated in closed form at u. "Dims" = PDim args; required ones
in bold. Defaults are never invented: an absent optional Dim disables that part of the model (stated in the HUD).

| op | args | u semantics | model (closed form) | default tool |
|---|---|---|---|---|
| `build_stack` | `bodies` (in order), `method?` | body i grows over [i/n, (i+1)/n] | sequence only (fabricated elsewhere; label "schematic sequence") | none / `laminator` |
| `etch_via` | `hole`, `method` bosch rie laser wet, `etch_per_cycle_um`, `cycle_s`, `rate_um_min`, `mask?` | depth d(u) | Bosch: N = ceil(D / e_c) cycles; d steps by e_c per cycle (passivate then etch), wall scallops of the hole's `scallop` appear as the front passes; laser: d linear, taper d_top -> d_bot; rie/wet: d linear (wet isotropic: lateral = d) | `drie` / `laser_drill` |
| `etch_recess` | `cut`, `method` laser route etch mill, `rate_um_min?`, `raster_pitch_um?` | removed depth (laser: raster front) | constant rate | `laser_drill` |
| `deposit` | `film`, `method` pvd cvd pecvd ald thermal electroless immersion evaporation, `rate_nm_min?`, `temp_c?` | thickness fraction | field h(u) = u h; sidewall h_s(z) = u h [c_top + (c_bot - c_top) z/D]; floor u h c_bottom; ald / electroless / thermal: conformal (c = 1); selective: pads only | `pvd` / `cvd` / `wet_bench` |
| `coat` | `body`, `method` spin spray dry_film vacuum_laminate print, `planarization?` (0..1), `rpm?`, `temp_c?`, `pressure_mpa?` | thickness fraction, fills openings / cavities | top surface = lerp(conformal, flat, planarization) | `spin_coater` / `laminator` |
| `pattern` | `body` (slab with openings), `method` stepper aligner ldi ablation, `tone`, `dose_mj_cm2?`, `develop?` | [0, .5) exposure (`exposed` 0 -> 1 in the exposed region), [.5, 1] develop (openings open top-down) | dose fraction = u / 0.5 of the stated dose | `litho` |
| `plate` | `bodies` (sequential), `mode` superfill through_mask conformal panel, `current_density_ma_cm2` (one or per body), `efficiency?`, `rate_um_min?` (per body), `bottom_up_um_min?` | thickness / fill height fraction per body, bodies in sequence by real time | Faraday rate v = M j eta / (n F rho); through-mask: uniform growth inside openings at v; superfill: fill height at `bottom_up_um_min` (else v with eta = 1 and a "derived from template" flag), then overburden at v; conformal: wall at v | `ecp` |
| `strip` | `bodies`, `method` resist_strip ash seed_etch flux_clean adhesive_clean wet_clean, `keep_under?` (post ids that protect film under them), `rate_um_min?` | remaining fraction 1 - u | resist dissolves top-down; seed etch isotropic (film thins everywhere except under `keep_under`) | `wet_bench` |
| `cmp` | **`stop_z_um`**, `bodies?`, `rr_nm_min?` or (`kp`, `pressure_kpa`, `velocity_m_s`), `overpolish_s?`, `dishing_um?`, `erosion_um?`, `dish_bodies?` | surface plane z_s(u) | Preston RR = Kp P v; z_s = max(stop, z0 - RR t); after clear: dishing and erosion grow linearly over the overpolish time to the stated values | `cmp` |
| `grind` | `face` top bottom, **`to_z_um`**, `stages` [{name, removal_um, feed_um_s, wheel?}], `reveal?` | trim plane | constant infeed per stage: plane moves removal_i at feed_i; stage time = removal / feed; bodies crossing the plane are revealed (finish 0, grind marks) | `grinder` |
| `reflow` | `solder`, `profile` (T), **`liquidus_c`**, `peak_c?`, `tal_s?`, `atmosphere?` | profile time | melt = 1 while T >= liquidus (smoothed over +-2 C for display); free cap: V = (pi h / 6)(3 a^2 + h^2) solved for h at wetted radius a; joint between pads a, b: V = (pi H / 6)(3 a^2 + 3 b^2 + H^2) solved for H (zero-load truncated sphere); shape lerps from as-formed to the solution with melt | `reflow_oven` |
| `place` | `piece`, `onto`, `at[]`, `flip`, `medium` flux adhesive daf glue none, `medium_body?`, `force_n?` | [0, .2) pick, [.2, .6) travel, [.6, .85) align, [.85, 1] place | rigid motion; lift height is a view parameter | `pick_place` |
| `bond_tcb` | `piece`, `onto`, `at[]`, `flip`, `solder`, **`profiles`** {T, F}, **`liquidus_c`**, `standoff_um?` | profile time | contact, force ramp, melt when T >= liquidus, collapse to `standoff_um` (head z-control) else to the joint solution above, cool | `tcb_head` |
| `bond_temp` | `carrier`, `onto`, `adhesive` (bodies), `temp_c?`, `time_s?`, `pressure_mpa?` | coat [0, .3), align [.3, .5), press + heat [.5, 1] | carrier flipped onto the front; adhesive `cure` = fraction of the stated schedule | `wafer_bonder` |
| `debond` | `carrier`, `method` laser thermal_slide mechanical chemical, `release`, `scan?` {pattern raster spiral, pitch_um, speed_mm_s} | scan front [0, .8), lift [.8, 1] | laser scan front position = speed * t along the raster (else playback-linear); release layer `front` follows | `laser_debond` |
| `underfill` | `fill`, **`gap_um`**, **`gamma_n_m`**, **`mu_pa_s`**, **`theta_deg`**, **`length_mm`**, `dispense` one_side L U perimeter, `stage_c?` | real time | Washburn between parallel plates: x(t) = sqrt(gamma h cos(theta) t / (3 mu)); t_fill = 3 mu L^2 / (gamma h cos(theta)) (derived duration); front lags locally around posts/solder (visual), fillet at the end; no bump-resistance correction (not modelled) | `jet_dispenser` |
| `mold` | `fill`, `method` compression transfer liquid, **`mold_top_z_um`**, `temp_c?`, `pressure_mpa?`, `time_s?` | dispense [0, .2), close [.2, .6), cure [.6, 1] | volume-conserving radial squeeze: R(t) = sqrt(V / (pi g(t))) with g the closing gap; front stops at the cavity edge; cure = fraction of schedule | `mold_chase` |
| `cure` | `bodies`, `profile?` or `temp_c` + `time_s` | real time | cure = fraction of the stated schedule (no kinetics claimed) | `cure_oven` |
| `dice` | `piece`, `method` blade laser stealth plasma, **`kerf_um`**, `feed_mm_s?`, `spindle_rpm?`, `cut?` (kerf cut body at the block edge) | lines along x, then y | cut length = feed * t (else playback-linear); end: singulated | `dicing_blade` |
| `ball_attach` | `solder` (balls), `flux?`, `method` ball_drop paste_reflow, `profile?`, **`liquidus_c`** | flux [0, .25), drop [.25, .5), reflow [.5, 1] | reflow model on V = pi D^3 / 6 | `ball_placer` |
| `print` | `solder` (paste), **`stencil_um`**, `method` stencil jet | squeegee front across the unit | paste appears behind the front (as-printed cylinder, melt 0) | `stencil_printer` |
| `inspect` | `method` xray_ct aoi sam cross_section electrical, `target?` | scan | no geometry change; block view goes x-ray along the scan | `xray_ct` |

Faraday constants: F = 96485.332 C/mol (CODATA 2018). Molar mass M (g/mol, IUPAC standard atomic weights): Cu
63.546 (n = 2), Ni 58.693 (n = 2), Sn 118.71 (n = 2; SnAg treated as Sn), Au 196.967 (n = 1). Densities are cited
in `app/src/lib/process/physics.ts` at implementation (engine phase), not in data. Physical constants are `derived`
inputs of the rate formula, shown in the tooltip.

Ops validate their bodies' kinds; a missing required Dim is a builder error.

## 11. Tools interface (E3, `app/src/lib/process/tools/`)

```ts
interface ToolActor {
  readonly id: string; readonly name: string;
  readonly scales: ScaleId[];                   // scales where the tool can be drawn
  readonly spec: Record<string, PDim>;          // default geometry / kinematics with provenance (RESEARCH_TOOLS_*.md)
  readonly group: THREE.Group;
  place(frame: ToolFrame): void;                // on step change, scale change, illustrative toggle, resize
  update(t: number, args: ToolArgs, ctx: ToolCtx): void;   // pure in (t, args, ctx)
  pick?(obj: THREE.Object3D): string | null;    // tooltip text for a picked tool part
  dispose(): void;
}
```

- Frame: the engine parents `group` to a tool root whose local unit is 1 um (root scale = 1 / umPerUnit). Origin =
  focus point on the tool-facing surface at step start (work: carrier center or `view.focus`; block: window center);
  +Y = outward normal toward the tool (always up after orientation); +X = piece x; -Z = piece y. Tools model in um
  (a 750 mm platen is 7.5e5 units) and never read scene globals.
- `ToolFrame = {scale, umPerUnit, carrier {shape, d_um | w_um, dd_um}, unit {w_um, d_um}, focus_um {x, y},
  surface_um, window?, illustrative, zmap(z_um) -> tool-frame y}`.
- `ToolCtx = {u, phase approach | process | retract, op, tReal_s (null = not reported), tPlay_s, surface_um (current,
  e.g. during grind / CMP), profile {T?, F?, P?} at tReal, live {name: number} (op readouts: front_um, depth_um,
  line index, scan x_um ...), mat(key, opts) -> ProcMaterial, reduceMotion}`.
- Rotation and translation use tPlay_s with a visual rate (a 4800 rpm spindle would alias); the HUD shows the real
  rpm from `spec` / args. Kinematics stay a pure function of t.
- `ToolCall = {id, scale?, args?: Record<string, PDim | string | boolean>}`: args override `spec` by key; the
  engine merges and shows provenance per value. Unknown tool id: no tool, the HUD still shows `equipment`.
- Registry: `tools/index.ts` exports `TOOLS: Record<string, () => ToolActor>`. Ids: cmp, grinder, drie, laser_drill,
  pvd, cvd, ecp, litho, spin_coater, laminator, wet_bench, tcb_head, pick_place, wafer_bonder, jet_dispenser,
  mold_chase, reflow_oven, cure_oven, laser_debond, dicing_blade, ball_placer, stencil_printer, xray_ct.
- Budget per tool: <= 40k triangles, <= 12 draw calls, materials from `ctx.mat` (shared library), clipping only via
  ProcMaterial.setClipping.

## 12. HUD, playback, URL

HUD: flow, route, step i/N (n), name (tooltip: full DB text, db_step, order ref), category, equipment (PText),
real elapsed / total process time, typed params (`hud[]`, status-styled: template desaturated and dashed, tooltip
"not reported; illustrative" + note), live readouts (op `live`), mini profile plot (T/F/P vs real time, cursor at
tReal; absent when the step has no profile).

Playback state: `{flow, route, k, t, playing, dir 1 | -1, speed, loop, illustrative, scale? (primary override), pip,
section}`. Global position = k + t. Base playback time per step at 1x: 6 s * weight (UI constant).

URL hash (process mode): `#mode=process&flow=<flow id>&route=<route id>&step=<step id>&t=<0..1, 3 decimals>`,
optional `&scale=work|block|cell&ill=0|1`. Written with replace on pause, step change, scrub end (<= 4 Hz); not every
frame. Unknown ids fall back to the first flow / default route / first step.

## 13. Builder checks (scripts/build_process3d.py)

1. Every PDim: status valid; reported has `ref` in `refs`; derived has `formula` + `refs`; template has `note`.
2. Every id reference resolves (piece, site, body, profile, ref); body kinds match op expectations (table 10).
3. Creation order: an op that targets a body does so after the body's creating op (or `initial`); a joined piece
   exists before its join; a body is not used after a `strip` removed it.
4. Each route has >= 1 step, exactly one default route; step ids unique; `n` monotone within the flow.
5. Required op Dims (bold in table 10) present.
6. Geometry sanity: z ranges non-negative, openings smaller than pitch, solder volume > 0, `to_z_um` inside the piece.
7. `completeness` computed over all PDims (bodies, sites, pieces, ops, hud, profiles).

## 14. Additions and clarifications from the engine implementation (L35 phase 2, 2026-10-23)

Additive; nothing renamed or removed. `types.ts` is updated accordingly.

- `StepView.cell_z_um?: [z0, z1]`: cell-scale z crop (root frame); default = the block window's z crop.
- `Profile.trace?` (`set` | `actual` | ...) and `Profile.label?`. `bond_tcb.profiles = {T, T_set?, F?}`: `T` = joint
  (actual) temperature, drives melt; `T_set` = bond-head set temperature, shown separately in the HUD and as a dashed
  trace on the profile plot (research L33: set and joint temperatures differ widely, e.g. 440 C set / 250 C joint).
- `fill.flow.from`: the dispense side. `x-` = dispensed at the region's x- edge, front moves toward +x (fraction f of
  the region width filled); `center` = radial from the region center (compression mold). Fill regions are clipped
  geometrically at the front; the material front (E2 `setFront`) only shades the meniscus.
- Growth direction: a body created while the step's root faces down (`orient: down`) grows downward from its top
  (`z_um + h_um`). Declare backside bodies with their z ranges below the surface they grow from.
- Placements: `at.z_um` = target-frame height of the joined piece's lowest point after orientation at first contact
  (e.g. the target pad top). Collapse after melting comes from the zero-load joint solution of the upper piece's
  solder (`joint_top_d_um`); `bond_tcb.standoff_um` is shown in the HUD but does not override it (first pass).
- `bond_temp`: the carrier is placed flipped onto the assembly top (after its adhesive layers are coated); no `at`.
- View constants (not data): 6 s playback per step x weight; process window [0.12, 0.9] of t; place / TCB motion uses
  the first 25 % of a `bond_tcb` op; compression mold chase starts at 2x the final gap; illustrative mapped height
  0.55 x window width (block) and 1.3 x (cell); work-scale stack 3.5 % of the carrier size.
- One ProcMaterial per mesh (E2 reads the mesh's bounding box per draw); `scene.environment` from E2's
  `createProcEnvironment`.
- Tools: `tools/index.ts` merges `FAB_TOOLS` (L37, `tools/fab/index.ts`) and `ASSEMBLY_TOOLS` (L38,
  `tools/assembly/index.ts`); any other id gets a wireframe placeholder. The tool root follows the current tool-facing
  surface every frame (so `ctx.surface_um` is 0); `place(frame)` runs once per (step, tool, scale, scale mode).
  The tool is drawn at `ToolCall.scale`, else at the primary scale (work or block when the primary is cell).

## 15. Contract v1.1 (2026-10-23; coordinator amendments from L34 COMPOSITION.md section 8 and L38 tool notes)

Backward compatible: every v1 file stays valid. Producers may write `"contract": "1.1"`; `version` stays 1.

Data (L34):

1. Line patterns. `SlabBody.lines = {line_um, space_um, dir, material?, depth_um?, n?}`: lines run along `dir`
   (repeat across the other axis), centred on the slab rect, trench depth `depth_um` (default the whole slab), `n` =
   representative count (view parameter; default every line inside the block window, at most 400).
   - With `material`: an as-built level (conductor embedded in the trenches; drawn as `<slab>#lines`).
   - Without: trenches opened by the new op `etch_lines {body, method rie | laser | wet, rate_um_min?}` (u = trench
     depth fraction) or by `pattern` on a resist slab, filled by the new body kind
     `line_fill {host: <slab id>, overburden?: {h_um, rect?}}` (grown by `plate` like `via_fill`: fill, then
     overburden; trimmed by `cmp`). Lining films are drawn on the field only (not inside line trenches).
2. Solder direction. `SolderBody.dir?: 'up' | 'down'`: `up` = base plane at `z_um`, solder above; `down` = base plane
   at `z_um`, solder hangs below (backside bumps, C4, BGA made face down); declared extent `[z_um - h_um, z_um]`.
   Absent: v1 (extent `[z_um, z_um + h_um]`, base at the top when created while the root faced down).
3. Route filter inside ops. An op of a shared step may list bodies of several routes: list args (`bodies`, `solder`,
   `adhesive`, `keep_under`, `dish_bodies`, `reveal`; `plate` per-body arrays kept aligned) drop entries outside the
   active route; an op whose single target body or piece is outside the route is skipped; `flux` / `medium_body`
   outside the route are dropped. Initial bodies / pieces outside the route are absent.
4. `clean {method desmear | wet_clean | flux_clean | plasma | rinse, bodies?}`: wet surfaces over the op; listed bodies
   are removed (u = removed fraction). Replaces `strip` with `bodies: []`. Default tool `wet_bench`.
5. Joints from the `onto` side. `bond_tcb.solder` and the new `place.solder?` may list solder bodies of either piece;
   the joint (shape and collapse of the placed piece) uses those bodies: for substrate-side bumps (EMIB) the cap
   belongs to `onto` and carries `joint_top_d_um` = the die pad. `place.solder` is melted later by `reflow`.
6. `place.solder?: string[]` (see 5).
7. `Flow.completeness` may carry `n` (PDim count) and `na` (share of `na` values).
8. `PNa = {status: 'na', unit?, note?, ref?, refs?}`: a HUD-only "not reported" value (no value); the HUD shows
   "N/A, not reported". Never used for geometry or physics (the builder must not emit it there).
9. Draft builds: `Process3D.draft: true` and `pending: [{flow, where, quantity}]`. A pending value is a template PDim
   (or PText) without a value and a note starting with "pending:". The engine shows a DRAFT banner, renders a pending
   HUD value as missing, and skips geometry with missing values (console warning per body), never inventing a value.

Tools (L37, L38):

10. Tool frame: the tool root sits at the focus point on the tool-facing surface at step start, +Y toward the tool;
    `frame.surface_um` = piece-frame z (root piece) of that surface; `frame.zmap(z)` = tool-frame y (um) of a
    piece-frame z with `zmap(surface_um) = 0`, sign reversed when the root faces down, following the step's (blended)
    z map; `focus_um`: work = `view.focus` (default carrier center), block = the block window center (piece frame);
    `ctx.surface_um` = current tool-facing surface (piece z).
11. `ctx.live` keys from the engine (single source for bodies and tools): `front_frac` (underfill fill fraction),
    `front_x_um` (print blade front, piece x; at block / cell scale the stroke spans the window and the paste bodies use
    the same mapping), `gap_um` (mold), `top_z_um` (coat / lamination film top), `depth_um` (etch), `hold_z_um`
    (held piece top face, piece z, including the pick / align lift), `contact_z_um` (held piece top at first contact),
    `collapse_um`, `surface_um`. Held tools (tcb_head, pick_place) follow `hold_z_um` and may publish
    `group.userData.hold = {on, x, y, z}`.
12. Tool args merged by the engine (op fields first, then `ToolCall.args`): `dispense`, `mold_top_z_um`, `stencil_um`,
    `method`, `charge`, `force_n`, `kerf_um`, `feed_mm_s`, `spindle_rpm`; target rects `fill_x/y/w/d_um`,
    `cut_x/y/w/d_um`; target site `site_x/y/w/d_um`, `site_pitch_um`; `ball_d_um`, `d_um`; placement `x_um`, `y_um`;
    placed piece `piece_w_um`, `piece_d_um`, `piece_h_um` (derived extent).
13. HUD extras (optional on ToolActor): `readouts(t, args, ctx): Readout[]` (shown in the HUD with status),
    `traces(args): Trace[]` (plotted when the step has no data profile, labelled "(tool)"), `defaultDuration(args)`
    (shown as "tool default" next to a real time that is N/A; never used as step data).
14. `mold.charge?: 'granular' | 'liquid'`: granular (00027) = charge spread over the cavity (no radial front), then a
    top-down squeeze; liquid (default, v1) = central charge with the radial squeeze front.
15. Default tool per op is method-dependent: laser `etch_via` / `etch_lines` / `etch_recess` -> `laser_drill`; CVD-like
    `deposit` -> `cvd`, electroless / immersion -> `wet_bench`, else `pvd`; `coat` dry film / vacuum laminate ->
    `laminator`; `etch_lines` -> `drie`, `clean` -> `wet_bench`.
16. L37 additions: `ToolActor.faceDown?` (cmp, ecp): at the work scale the engine turns the work scene 180 deg about
    scene z for those steps (as `orient: down`) and rotates the tool root with it, so the camera sees the wafer face and
    the pad or bath. `ToolActor.workRot?(t, args, ctx)`: rotation (rad) of the work piece about +Y through the carrier
    center, applied to the work scene (grind arcs and unit grids turn with the chuck). `ToolCtx.phases` (the step's
    process window) and `ToolCtx.opPlay_s` (playback seconds elapsed in the active op), optional in the type and always
    set by the engine. `ToolFrame.repeat` (`{pitch_x_um, pitch_y_um}` of the root piece) and `ToolFrame.back_y`
    (tool-frame y of the far face at step start). `Trace.q` adds `rpm`. `coat` with `dry_film` on a wafer piece ->
    `laminator_roll` (L37 `FAB_EXTRA_TOOLS`), `vacuum_laminate` / other dry film -> `laminator` (L38). `ctx.mat`
    returns a fresh material instance per call.
17. L36 grind wheel: on every `grind` step the engine sets `ProcMaterial.setGrindWheel(wheel_d_mm / 2 in um)` (from the
    active grinder actor's spec) on the body materials of every scale; without the call the L36 default (150 mm radius,
    offset = radius) applies.
18. Engine budget rule at the wafer scale: a joined piece's body is one bounding box instanced per unit (line patterns
    and per-site features are not drawn there).
19. Audit A1 C1 (melt per body): `SolderBody.liquidus_c?: PDim` (v1.1) is the alloy's liquidus; an op's
    `liquidus_c` is only the fallback for the solder it lists. Melt and reflowed shape follow T(t) (the op's profile at
    real time) against each body's liquidus; without a profile the stated `peak_c` gates the melt (peak >= liquidus);
    with neither, a listed body melts (the op says it reflows). Mass reflow and ball-attach reflow also heat every other
    solder body of the assembly that states its own liquidus (remelt of earlier joints, e.g. SnAg microbumps in a C4
    reflow); TCB heats only the solder it lists. Data: give every solder body its `liquidus_c` (SAC vs LTS routes depend
    on it).
20. Audit A1 M4 (joint fields): a joined rigid piece settles by the smallest collapse over its joint fields (a field
    not yet molten holds it up); every joint is drawn to the actual gap (as-formed height minus that collapse), so no
    field's solder enters the die. `deposit` may target a slab (a deposited level, e.g. with open lines).

## 16. Engine fix round 1 (2026-10-23; L34 render / state probes, audit A1 m2 / m10)

1. Placement by the current extent. A join takes the placed piece's extent (with its own joined pieces) from the state
   at the join: trims (ground / recessed Si), current free solder shapes (reflowed backside bumps, attached ball caps)
   and growth, not the declared geometry. `at.z_um` stays the contact plane (contract section 14).
2. Free reflow vs joint. A solder body that is in a join (in `join.solder`, the placed piece's own solder, or a hybrid
   partner) records its melt as joint progress; otherwise as free reflow (as formed -> free cap). Contact happens at the
   current free height; the joint forms only when the body melts while joined (a pre-reflowed ball or bump keeps its cap
   shape until it is remelted on the next pad). Collapse = smallest over the piece's joint fields of
   (joint progress x (free height - joint height)).
3. `ball_attach.peak_c` gates the melt and the remelt of earlier joints like `reflow`.
4. `OpCall.src = {order_ref?, flow_id?, step_id?, note?}`: op-level order provenance, shown in the HUD tooltip of the op.
5. Hybrid ball + paste joints (audit A1 m2): a solder body of the placed piece and one of the `onto` piece at coinciding
   sites form one joint at board reflow. Both molten: one joint of the combined volume between the two pads.
   Paste molten, ball solid: the ball sinks through the paste to the pad and the paste forms a fillet around the ball
   base (volume conserved). Ball molten, paste solid: the ball wets the deposit top and the deposit stays.
   The pair needs no listing beyond the placed piece's `place.solder` and the `reflow.solder` of both bodies.

## 17. Engine fix round 2 (2026-10-23; visual audit V1)

1. Wafer-scale framing (V1 C1): the camera frames the workpiece plus the tool's business end
   (`ToolActor.focusBox?(t, args, ctx): THREE.Box3 | null`, tool frame, um; optional, from L37 / L38). Tool meshes
   that contain the camera are hidden; tool meshes between the camera and its target are faded to 15 %; at the block /
   cell scale tool meshes far outside the window are faded to 25 % (V1 M5). The render check reports `workFrac` (share
   of the frame the workpiece box covers) and flags wafer-scale views below 15 %.
2. Lighting (V1 C2): AgX tone mapping, exposure 1.35; `scene.environmentIntensity` 0.6 over L36's
   `createProcEnvironment`; hemisphere fill 0.35 and one directional key 1.3. Material response stays L36's.
3. Cuts (V1 C3): a cut removes material from its declared hosts and from every body of its piece that it intersects
   when it happens (recorded in the state at the cut; bodies created later, e.g. the adhesive in a cavity, are kept),
   including the embedded conductor of line levels and per-site features (posts, solder, via columns) inside it.
4. The block / cell z crop is extended to the bodies the step's ops name (e.g. BGA balls below a window cropped to
   the top layers, V1 M13).
5. Real time (V1 M3): step total = stated, else the sum of the known op durations, with the count of ops without a
   duration shown as "+ n N/A"; never voided by one missing duration.
6. Grind marks (V1 M8): every material of a view gets the root carrier centre in world space
   (`ProcMaterial.setGrindCentre`, L36), so dies carry their segment of the wafer pattern.
7. Default tool: `etch_recess` with a plasma / blanket method -> `drie` (laser -> `laser_drill`; route / mill -> none)
   (V1 M6).

## 18. Camera (Wentao 2026-10-23: "do not reset camera between each step")

- The main camera pose persists across step changes, scrubbing, play, reverse and route switches; within a scale the
  engine never moves it. One remembered pose per scale (main view and PiP each): re-entering a scale restores it; a
  scale's first use fits once with the framing rule (workpiece + tool `focusBox`) keeping the current view direction.
- Re-framing only with the Frame button (keeps the direction) or on first load / flow change.
- Illustrative <-> actual keeps the pose; only the target (and camera) shift vertically so the same piece z stays at
  the target.
- OrbitControls damping is off in Process mode (a damping residual would drift the persistent pose).
- Automation: `__apaProc.frame()` re-fits (render_process3d.py calls it after each seek), `__apaProc.camera()` reads
  the pose.

## 19. Engine round 3 (2026-10-23; audit A2 N1 / N3 / n7 / n12, determinism)

1. CMP acts from the tool-facing side (A2 N1): `cmp.face?: 'top' | 'bottom'`, default from the step orientation
   (`down` -> bottom): the plane moves from the outermost declared face of the listed bodies to `stop_z_um`; dishing is
   applied on the polished face. Other directional ops: grind takes `face`; cuts, strip, deposit, coat, pattern and
   through-mask plating act from the side recorded at creation from the step orientation (the exposed side);
   superfill fills from the via's closed end; `etch_via` always etches from `z_top` (a face-down blind hole is not
   supported). Regression check in render_process3d.py: CoWoS-S tsv_reveal / c4_bumping end, `tsv_cu` reaches the M1
   landing (>= 775), its tip is flush with `bs_pass`, the front `liner` keeps its thickness.
2. `Placement.rot_deg` in quarter turns (A2 N3), builder convention: flip about x (y -> -y), then rotate
   counter-clockwise, then translate. Applied to bodies, sites (pitch / count swap at 90 / 270) and placements.
3. `OpCall.src` shows in the HUD tooltip of the op when present (A2 n7, data from L34).
4. `SolderBody.to_imc?: boolean` (A2 n12): the joint is drawn with the `imc` material once it has formed.
   `SolderBody.imc_melt_c?: PDim`: once a `to_imc` joint has formed (joint progress 1) its remelt gate in later
   thermal ops is `imc_melt_c` (absent = never remelts), never the solder liquidus.
   `SolderBody.metal_vol_frac?: PDim` (paste only): the printed paste volume times this fraction becomes joint solder;
   the flux volume disappears at reflow (absent = 1). Used in the free reflow height and the hybrid ball + paste joint.
5. Determinism: every engine mesh gets `renderOrder` from its body's place in the flow and its own place in the body,
   so coplanar and transparent ties never depend on object / program ids (visit history); tool actors should do the
   same. Automation re-frames with `__apaProc.frame(true)` (default direction, no remembered poses) before each shot.

## 20. Engine round 4 (2026-10-23; audit V2, Wentao directives, L37 / L38 / L34 notes)

1. Constant aspect within a step (Wentao): one illustrative z map per step and scale, built from the step's start and
   end breaks over a crop sampled across the whole step (no live crop, no approach blend: the map switches at the step
   boundary). Bodies change only through their true geometry under it. The wafer-scale stack map follows the same rule.
   The horizontal window is fixed per step. Actual mode unchanged.
2. Bumps in the illustrative map (V2 n1 / m4): per bump site grid (posts and solder sharing a site) one linear z scale
   s over the stack and the same scale laterally, clamped to 0.4 of the pitch (final round; was 0.48); openings at that site widen with it;
   the factor is printed in the body tooltip. Hole floor films are drawn at true thickness and are not z breaks (M11).
3. Camera (V2 N1): poses are kept relative to the workpiece box; when the box changes by more than 1.5x or moves and
   its centre leaves the frustum, the pose is re-targeted and scaled by the size ratio (angles and relative zoom kept).
   Same rule for the secondary view.
4. Layouts (Wentao): main only / inset / split side by side (stacked below 640 px) / split stacked, Swap; the secondary
   view has its own scale (Auto = complement), scale mode (default: follow the main) and tool toggle; each view has its
   own camera memory per scale and a Frame button. Hash: `layout`, `swap=1`, `s2`, `m2=act|ill`, `t2=0` (defaults
   omitted).
5. Cell scale (V2 N2): bands wider than the cell window are clipped to the window column. Wafer scale (N3): after the
   saw every unit stays on the tape (one box per unit) while the diced wafer is the step's piece.
6. Solder: a solid ball touches its pad at a point; the wetted foot grows only with melt (n2). Bump segments by
   on-screen diameter (12-48); the PiP / secondary LOD uses its own width.
7. Grind marks (M8): `BodyState.grindRoot` records the root of the last grind; marks are centred on that wafer, seen
   from one unit's grid position when the wafer was diced; a part with no grind in the flow and no wafer in the data
   (rect piece) is drawn as cut from a 300 mm wafer at (0.35 R, 0.2 R): view parameter, marks orientation only.
8. Mold (L38): chase open [0, 0.2), close [0.2, 0.6) with `live.gap_um` falling monotonically from the open gap to the
   final one, hold [0.6, 1]; `live.front` 0 -> 1 over the close (granular: compaction; liquid: radial squeeze),
   `live.close`; real time over u 0.2-1 (time_s); `temps.T` from `temp_c`, `temps.P` from `pressure_mpa` (when given).
9. Debond tool args: `release_z_um` / `release_h_um` (root frame, step start) for the laser actor.
10. Step clock (M3): an op without a duration takes the tool model's default duration (template) when the tool states
    one; HUD form `t 0.0 s / total 0.6 s (template), 1 op N/A`, details in the tooltip.
11. Draw calls: after a body is built its part meshes (tile groups, full / half bands, boxes; instances expanded)
    are baked into one position / normal mesh on one material when the body is below 200k triangles (static per
    build; pieces still animate as groups). Render check `cellOver` (stats): cell-scale bodies wider than the window
    by more than 10 % and not clipped to it; render_process3d.py lists them.

## 21. Engine final round (2026-10-24; audit final F1-F13, L34 F7, L38)

1. F1: pads, lands, UBM and finishes (posts that are not pillars and are lower than half their diameter) keep their
   true diameter; only solder and pillars take the bump scale (clamp 0.4 pitch) and only openings around pillars
   widen. Every body that passes the block or cell window is clipped to the window column (incl. landed balls);
   render checks `blockOver` / `cellOver` list such bodies whose material does not take the clip.
2. F2: in the illustrative block / cell map, a piece's >= 10 slab / fill bodies that the step does not act on (PCB
   laminate, build-up, core) form one coarse band (their layers share it); the step's active region (bodies its ops
   name, incl. join solder) gets at least 40 % of the height; at a joint step the crop is centred on the joint region
   (the longer side trimmed to the shorter, at least 2x the region height each side). One map per step still holds.
3. F3: Actual wafer scale: layers get a polygon offset by stacking rank (no coplanar z-fighting).
4. F4: a fill's tiles around bumps skip the z spans of higher-ranked fills covering them (the ABF cavity fill and
   the bridge underfill had overlapped and z-fought); fields under 3 px per site are drawn as their solid host
   (parts in the field are left to the cell scale).
5. F8 / F9 / F10 / F13: block solder profiles 16 samples; a follow re-target never zooms closer than 0.6 of the new
   workpiece's fit distance; flipping pieces' swept bounds join the framing box (the follow reference excludes them);
   per-view Frame buttons top-right, shorter scale caption.
6. F7 (L34): `BondTcbOp.stage_c?: PDim`: during bond_tcb every assembly solder body with its own `liquidus_c` that is
   not in the op's `solder` list is held at `stage_c` and gated against its own liquidus; listed bodies follow
   `profiles.T`.
