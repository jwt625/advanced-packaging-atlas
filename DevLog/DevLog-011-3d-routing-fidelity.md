# DevLog-011: 3D model fidelity metrics and mock-up routing (vias, RDL, build-up, fan-out)

Date: 2026-10-20. Status: round 2 done (uncommitted); follow-ups listed at the end. Related: DevLog-008 (3D viewer, contract v1), DevLog-005 (figures).

## Request (Wentao, 2026-10-20)

- Inspect the 3D modeling; define metrics for fidelity and completeness; iterate the models against them.
- Missing today: vias through the substrate; representative RDL layers connecting die -> interposer and
  interposer -> substrate; substrate routing down to the solder balls.
- The examples get mock-up routing in the build-up layers similar to real packages, informed by the cross-section
  figures of the parsed papers (RDL, build-up, TSV, PTH).
- Delegate to subagents as needed (7 concurrent in this project).

## Baseline inspection (2026-10-20, screenshots in the session scratchpad `base/`)

| element | state |
|---|---|
| Organic substrate | build-up and core are uniform slabs; no Cu levels, no microvias, no PTH in section; no SR openings or pads |
| Si interposer | BEOL drawn as 1 Al + n Cu full-sheet slabs; TSV field uniform, not visible at the default cut; no backside RDL/UBM |
| RDL interposer / fan-out | RDL levels are full sheets; no vias, no traces |
| Die-to-die wiring | absent (no lateral wires between SoC/HBM through interposer or bridge) |
| EMIB bridge | slab with "M1-M4" label; no bridge pads/traces; fine vias over the bridge are a uniform field |
| Fan-out C4 -> BGA | absent; C4, PTH, BGA are independent uniform grids that do not connect |
| FCBGA | build-up repeats exist as dielectric slabs; microvia and PTH fields uniform under the die only |

## Fidelity / completeness metrics

Computed per family by `scripts/score_package3d.py` (M1-M6, M8 automatic) and by a fresh-context visual audit (M7). M2-M4 are completeness checks (does the model contain and connect the elements); M5-M6 are plausibility heuristics, not proofs of correctness (A1 S10).

| id | metric | definition | target |
|---|---|---|---|
| M1 | Provenance share | reported / derived / template share of all dims (now incl. routing dims) | report only; no reported cell lost (the share falls as template routing dims are added; 2026-10-20 A1) |
| M2 | Structural completeness | present / expected elements of the family's archetype checklist (`config/package3d/fidelity_checklist.yaml`; e.g. organic substrate: SR + openings, top pads, N build-up Cu levels, microvia per build-up dielectric, core, PTH barrel + lands + plug, bottom levels, BGA pads, balls) | >= 0.9 |
| M3 | Conductor continuity | share of vertical net segments (chained through shared endpoint arrays, top-to-board flag) with no z gap or overlap > 0.1 um and no xy pitch mismatch (a grid through-via must divide / be divided by the endpoint pitch unless a jog level lies between; added 2026-10-20 F2); no orphan conductor level | 1.0 |
| M4 | Routing resolution | share of conductor levels with a `route` pattern (vs full-sheet slab); share of via-bearing dielectrics with a via class | 1.0 |
| M5 | Dimensional plausibility | each routing dim (L/S, Cu and dielectric thickness, via diameter, land, pitch) inside the DB range (min-max over physical, non-simulation `stack_layers` / `interconnects` rows of the same structure class; F2); M5b = count inside min-max but outside P10-P90 (n >= 10), counted and shown | 0 unexplained out-of-range; M5b reported |
| M6 | Rule consistency | via land > via diameter; land_space (effective pitch - land >= level space, 1 um floor) and escape_ls (line + 2 x space fits on a signal level); microvia aspect ratio (depth / entry diameter) within the DB range; pitch hierarchy die bump <= C4 <= BGA; through-via pitch >= its land | 0 violations |
| M7 | Visual fidelity | fresh-context auditor compares the section render (in-scale and illustrative) of each family against >= 2 DB cross-section figures; 0-3 per checklist item (layer order, relative thickness, via shape and stacking style, trace density, pad/ball/joint shapes, D2D wiring) | mean >= 2 |
| M8 | Render budget | draw calls, triangles, instances, frame time (renderer.info, 1600 x 950) at default and inset views | calls <= 40, tris <= 2M, orbit 60 fps |

## Routing contract (package3d.json v1 additions; all additive)

Design: compact specs in the JSON; the viewer synthesizes the geometry deterministically (seeded by family id)
inside a routing window, so the JSON stays small and the slider can move the cut.

### Layers: `route`

A conductor layer (role `conductor`) may carry a `route` object. It is then drawn as its `matrix` dielectric with Cu
features inside the routing window, and as a slab tinted by the Cu fill fraction outside it.

```jsonc
"route": {
  "use": "signal",            // signal | plane | pad | mixed
  "dir": "x",                 // x | y (resolved; template may say alt = alternate per repeat, starting at x)
  "line_um": 15, "space_um": 15,
  "matrix": "organic_build_up",   // material key around the Cu
  "fill": 0.5,                // Cu area fraction (signal default line/(line+space); plane default 0.85)
  "dims": {"line_um": {...}, "space_um": {...}}
}
```

### Family `routing`

```jsonc
"routing": {
  "layout_note": "mock-up routing: net layout, shares and jogs are illustrative; dims carry their own status",
  "vias": [{
    "id": "mv_top_2",             // one entry per spanned dielectric (repeats numbered like the layers)
    "template_id": "mv_top",
    "kind": "microvia",           // microvia | rdl_via | beol_via | pth | tsv | tgv | tdv | bridge_via | tmv
    "part": "substrate",          // host template id (drawn in every instance)
    "through": "bu_d_2",          // layer id (or part id for a full-thickness via)
    "z_um": 1210.0, "h_um": 30.0, // span = the through layer / part
    "upper": "bu_cu_2", "lower": "bu_cu_3",   // conductor layer ids it connects (null at a part face)
    "diameter_um": 60, "bottom_diameter_um": 45, // taper optional
    "land_um": 90,                // capture/landing pad diameter on upper and lower level
    "pitch_um": 400,              // only for grid vias (pth, tsv, tgv): the grid nets pick from
    "fill": "filled",             // filled | conformal | plugged
    "wall_um": 25,                // conformal / plugged plating thickness
    "liner_um": 0.5,              // TSV oxide liner
    "dims": {...}
  }],
  "nets": [
    // vertical: from a top endpoint array down to a bottom endpoint array; stacked or staggered vias,
    // lateral jogs (fan-out) on the listed signal levels, through-vias picked from the grid via nearest the path
    {"id": "io", "kind": "vertical", "from": "c4", "to": "bga", "style": "stacked", "jog": ["bu_cu_2", "bb_cu_3"],
     "share": 0.4, "dims": {"share": {...}}},
    // lateral: die-to-die wires between two bump fields on the listed levels (interposer, bridge, RDL)
    {"id": "d2d", "kind": "lateral", "from": "ubump_soc", "to": "ubump_hbm_a", "levels": ["ip_cu_2", "ip_cu_3"],
     "share": 0.6},
    // plane_tie: bumps tied down to a plane level by short via stacks (power / ground)
    {"id": "pg", "kind": "plane_tie", "from": "c4", "plane": "bu_cu_3", "share": 0.3},
    // escape: short traces leaving a bump field on a level (local routing texture)
    {"id": "esc", "kind": "escape", "from": "c4", "levels": ["bu_cu_1"], "share": 0.3, "length_um": 600}
  ]
}
```

Rules:
- Endpoint arrays are existing `arrays` ids (instances resolved per host instance like today).
- A vertical net crosses every conductor level between its endpoints; it lands on a pad on each level, uses one via
  per dielectric (`stacked` = same xy, `staggered` = alternate offset of one land), jogs laterally only on `jog`
  levels, and passes grid vias (pth/tsv/tgv) at the grid position nearest its path.
- Plane levels get antipads (clearance = land + 2 x space) around vias of nets not tied to them.
- Solder resist / passivation over the outer levels gets openings at the endpoint pads.
- Net numbers (`share`, `length_um`) may be bare numbers in YAML; they become template dims carrying
  `routing.layout_note` (required when `routing` exists). Every geometric dim (L/S, thickness, diameter, land,
  pitch, wall, liner) follows the normal provenance specs.
- Uniform interconnect arrays that the routing replaces (e.g. fcbga `mvia`, `pth` fields) are removed from `arrays`
  once a via class covers them; endpoint arrays (bumps, C4, BGA) stay.

### Viewer rules

- Routing window: in section mode a band around the cut (|y - cut| <= max(3 x largest endpoint pitch, 0.3 mm)),
  full lateral extent of the routed host; in an inset / zoom LOD window, that window. Outside: tinted slabs.
- Feature LOD: a feature class is drawn when its width spans >= 1.5 px, else its level stays a tinted slab.
  Illustrative mode: routing features drawn at >= 2 px width, decimated so gaps stay >= 2 px (each drawn line
  stands for k real lines; tooltip states k). In-scale mode: true widths only.
- Clipping and caps at the cut like other boxes; vias as half cylinders at the cut (tapered when
  bottom_diameter_um is set; conformal = ring + core of the plug material).
- Click tooltip on a routed level / via / net: dims with provenance, and "mock-up layout" from layout_note.
- Budget: M8.

## Agents (max 7 concurrent)

Wave 1:
1. R1 reference: organic substrate (build-up, core, PTH, SR, BGA pads) + glass core (TGV).
2. R2 reference: Si interposer (BEOL, TSV, backside RDL/UBM, C4) + Si bridges (EMIB, LSI, bridge-in-mold) + D2D
   wiring density.
3. R3 reference: RDL / fan-out interposers (CoWoS-R, InFO, FOCoS, FOPLP) + hybrid bonding / SoIC / Foveros /
   HBM stack TSVs.
   - R1-R3 write `config/package3d/ROUTING_REF_<class>.md`: archetype stacks with DB numbers (row ids), via
     styles, the key-figure ids they looked at, a visual checklist per archetype (feeds M2 and M7). No paper figures
     are copied into the app.
4. G1 generator: `routing` / `route` in templates, provenance, validator, TEMPLATE_FORMAT.md.
5. E1 viewer engine: routing synthesizer + rendering + LOD + tooltips, on a hand-written fixture first.
6. S1 scorer: `scripts/score_package3d.py` (M1-M6), `config/package3d/fidelity_checklist.yaml`, M8 via a
   headless render script.

Wave 2: template agents add routing per family (priority: fcbga_organic, cowos_s, cowos_l, cowos_r, emib, emib_t,
glass_core_substrate, info_os; then the rest). Wave 3: scores + M7 visual audit, fixes, re-score.

## TODO

- [x] Baseline inspection and screenshots
- [x] Metrics and routing contract (this file)
- [x] R1-R3 routing references
- [x] G1 generator support
- [x] E1 viewer engine
- [x] S1 scorer + checklist; baseline scores
- [x] Wave 2 family routing templates
- [x] Re-score, M7 visual audit, fixes
- [x] DevLog wrap-up with before/after scores

## Progress log

- 2026-10-20: baseline inspected (compare, cowos_s, cowos_l, emib, fcbga_organic; default, front, insets).
  Metrics and contract written.
- 2026-10-20: wave 1 launched (6 agents): R1 substrate ref, R2 Si interposer/bridge ref, R3 RDL/fan-out/hybrid-bond
  ref, G1 generator, E1 viewer engine (fixture first, `window.__apa3d` automation hook), S1 scorer + checklist +
  render script. Renders go to `cache/package3d_renders/<ts>/` (ignored); scores to `outputs/package3d_scores/`.
- R2 done: `config/package3d/ROUTING_REF_si.md` (Si TSV interposer, EMIB, EMIB-T, LSI / bridge in mold, DBHi; ~60
  figures viewed; 252 ids checked). Gaps: no DB L/S or dielectric thickness for Si-interposer damascene levels
  (CoWoS text "<1 um pitch" only); TSV pitch/liner missing for CoWoS-S/MIoS/CoWoS-L/EMIB-T; EMIB fine-via, cavity
  and adhesive dims missing; CoWoS-S D2D lane density and die gap missing.
- R1 done: `config/package3d/ROUTING_REF_substrate.md` (archetypes cored FCBGA n-2-n, coreless/thin core, glass core;
  54 figures viewed; 295 ids checked). Gaps: cored microvia land/bottom diameter/pitch, PTH wall/plug/land, SR
  opening/pad sizes as cells, per-level plane vs signal usage in production substrates, antipad size.
  Note: its reported/analog split used the matcher before G1's edits; re-check if match rules change.
- G1 done: generator routing support (TEMPLATE_FORMAT.md documents it). Output byte-identical without routing;
  19/19 negative tests; ruff/mypy no new findings. Contract deviations (binding now): via `through_kind`
  (layer|group|part), optional via `instances`, via ids `<id>_<k>` + `template_id`, `upper`/`lower` null at a host
  face; route `dir` only on signal/mixed; `fill` always present; vertical nets always carry `style`; plane_tie needs
  one concrete `plane`; escape needs `levels`; callouts may target via/net ids; extra validation (unknown keys,
  duplicates, ranges, each via end must touch a conductor or a host face).
- Coordinator decision: vertical nets are declared per part segment (die bump -> C4 in the interposer, C4 -> BGA in
  the substrate); the viewer chains nets that share an endpoint array; the scorer scores the full chain.

## Template agent brief (wave 2, binding)

1. Read: this DevLog, TEMPLATE_FORMAT.md (routing section), the ROUTING_REF_*.md files for your archetypes, your
   family YAMLs, families.yaml match rules.
2. Decompose each routed host into real levels: solder resist / passivation, pad level, n x (Cu level with `route`,
   dielectric), core / Si, mirrored back side, using the layer counts and thicknesses the references give for this
   family (reported first, analog second, template last with a note). Keep the host total consistent: if the
   total is reported, derive one free thickness (usually dielectric) and keep it inside the DB range (M5);
   if the counts cannot fit, report it rather than squeezing levels.
3. Via classes for every via-bearing dielectric (microvia / rdl_via / beol_via), grid through-vias (pth / tsv / tgv /
   tmv / bridge_via) with pitch, land, wall/plug or liner where the references support them. Remove the uniform
   arrays the via classes replace (e.g. `mvia`, `pth`, `tsv` fields); keep endpoint arrays (bumps, C4, BGA).
4. Nets (mock-up layout; `layout_note` states it): vertical per part segment (die bumps -> C4 through the
   interposer / RDL; C4 -> BGA through the substrate; EMIB fine bumps -> bridge pads), with jogs on 1-2 signal levels
   per side where fan-out happens (per the reference figures); lateral D2D nets on the interposer / bridge / RDL
   levels between adjacent dies (SoC-HBM, die-die); plane_tie to a GND/PWR plane; escape for local texture.
   Use the stacked vs staggered style the reference figures show for that structure.
5. Callouts: <= 6 words on screen; one each for the via stack, PTH/TSV, D2D wires and the build-up/RDL stack.
6. Validate with `uv run python scripts/build_package3d.py --check`. Write the app JSON
   (`uv run python scripts/build_package3d.py`) only when `--check` passes on the whole set; if another agent's
   file breaks the check, wait and retry, never edit their files. Score with `scripts/score_package3d.py` when it
   exists. Render with `scripts/render_package3d.py` (or the screenshot recipe) once the viewer renders routing;
   look at the images and compare against the reference figures named in ROUTING_REF_*.md.
7. Never edit scripts/, app/, data/, families.yaml or other families' YAMLs. Generator features needed: report them.
   No emoji; ISO dates; never invent numbers; never open files in ~/Downloads; never run ieee_fetch.py; the dev
   server (tmux apa-app, port 47331) must not be killed or restarted.
8. Report: per family the before/after completeness (M1), scorer rows (M2-M6), the levels/vias/nets added, the
   numbers that are analog/template and why, screenshots looked at, open gaps.
- Wave 2 launched: T1 fcbga_organic + glass_core_substrate; T2 cowos_s + samsung_mios; T3 emib + emib_t; T4 cowos_l
  (bridge_in_mold module) + ase_focos_bridge + amkor_s_connect + samsung_i_cube_e. Running with R3, E1, S1 (7).
  Queued after R3: cowos_r, info_os, fan_out_panel, soic, foveros, foveros_direct, samsung_x_cube,
  hybrid_bond_d2w/w2w, hbm_stack, ibm_dbhi, ucla_si_if, cpo_module.
- R3 done: `config/package3d/ROUTING_REF_rdl.md` (1A organic RDL interposer, 1B InFO, 1C chip-last/panel, 1D
  bridge-in-mold RDL, 1E hybrid bond, 1F HBM stack; 52 figures; 917 ids checked). Gaps: CoWoS-R/InFO per-level
  thickness, coarse L/S, ubump/UBM/C4 sizes; HBM core-die TSV dims; hybrid-bond TDV, gap-fill, SoIC pad; S-Connect /
  I-Cube E RDL. Naming trap: in hybrid-bond papers "HBM" = bond pad metal. R3 suggests a fresh audit of the file.
- T5 launched: cowos_r + info_os.
- T1 done (fcbga_organic, glass_core_substrate). Scorer before -> after:

  | family | M1 r/d/t | M2 | M3 | M4 | M5 out | M6 |
  |---|---|---|---|---|---|---|
  | fcbga_organic | 0.70/0.17/0.12 -> 0.55/0.19/0.27 (reported dims 28 -> 70) | 0.39 -> 1.00 | N/A -> 1.00 | -> 18/18 levels | 0/59 | 0 |
  | glass_core_substrate | 0.42/0.04/0.54 -> 0.39/0.07/0.54 | 0.37 -> 1.00 | N/A -> 1.00 | 0/22 -> 27/27 | 0/68 | 0 |

  - FCBGA: 8-2-8, SR, L3/5/7 + L12/14/16 planes (backbone Cu ratio rows), 60 um filled microvias on 94 um lands
    (template), PTH 200/500 um reported, 320 um land and 14.9 um wall template, resin plug; nets io/pwr stacked with
    jogs on L2/L8/L11/L17, plane ties, escape. L/S 25/25 (reported, in-family) instead of 30/50 so a trace fits
    between 94 um lands at 200 um bump pitch (M6).
  - Coordinator decision: keep the reported backbone geometry (8-2-8, 1.8 mm total incl. 1.4 mm core,
    ectc51529.2024.00265-a-c2) even though it leaves 22.5 um per level (13 um Cu over 9.5 um dielectric); flagged as
    atypical in M5, not squeezed or overridden.
  - Glass: 10-2-10 with embedded bridge levels (analog), TGV 90/45 um at 175 um pitch, stacked + staggered nets, d2d
    over the bridge; BGA now in-family reported (tcpmt.2025.3614186-a-i1).
  - Requests: pad / SR opening keys, PTH plug material, via placement region (bridge vias only over the bridge) ->
    G1 follow-up. Render script did not switch families -> S1. Visual check pending the viewer (E1).
- T3 done (emib, emib_t). Before -> after: emib M2 0.32 -> 1.00, M3 1.00, M4 17/17, M5 0/59, M6 1 (false
  positive); emib_t M2 0.27 -> 1.00, M3 0.67 (scorer walks substrate levels inside the cavity), M4 23/23, M5 1/76
  (br_si 29 um vs single-row 75 um bound), M6 4. Reported counts 17 -> 21 and 8 -> 9; template share up because
  no organic-substrate number is in-family (analog set from ectc51909.2023.00155-a, 5-2-5 count from
  ectc51846.2026.00073-a-L07). Fine vias 16 um analog (ectc51906.2022.00180-a-i1). EMIB-T bridge 10 levels at
  1 um metal (fit in ~50 um with TSVs). Renders 2026-10-20_125909, _130035: vias, PTH, bridge BEOL, TSV columns
  visible; budget worst 25 calls / 1.68M tris.
  - Routed to E1: cavity cut of synthesized routing by `in:` parts, via regions, grid phase on the default cut.
  - Routed to S1: M3 walk skips cut-out host levels; M6 bridge-via exemption; single-row M5 ranges.
  - Open minor: refs to process-step cells show "?" for the paper in the references panel (pre-existing).
- T6 launched: hbm_stack, soic, samsung_x_cube.
- G1 follow-up done: arrays `pad_um`, `opening_um` (dims); via `plug` (resin|copper|none) and `region` -> `regions`
  (package-frame rectangles). Byte-identical without them; 28/28 negative tests. Template agents notified.
- Coordinator check of T3 renders (2026-10-20_130035): emib build-up inset in-scale shows Cu levels, planes, plugged
  PTH barrels (resin core between Cu walls) and BGA; emib_t bridge inset is cluttered because substrate levels run
  through the cavity (E1 fix pending); the illustrative full view reads as dense routing texture.
- T5 done (cowos_r, info_os). Before -> after: cowos_r M2 0.27 -> 0.98, M3 1.00 (chain to BGA), M4 27/27, M5 0/75,
  M6 0; info_os M2 0.27 -> 0.98, M3 1.00, M4 23/23, M5 0/73, M6 0. Reported counts 22 -> 32 and 21 -> 22.
  CoWoS-R: 9 Cu levels (rdl_n reported), 7 at 2/2 + 2 thick planes, reported 8/11 um RDL vias and 45 um via on C4;
  D2D SoC-HBM and SoC-SoC lateral nets. InFO_oS: 5 RDL (2/2 x4 + 5/5), staggered vias. New reusable substrate module
  `sbt_828` (cowos_r.yaml, imported by info_os). cowos_r substrate total now = sum of levels (1946 um; no CoWoS-R
  substrate thickness reported); info_os keeps reported 2300/1400 um (derived 37.1 um dielectric).
  - M2 miss in both: lid frame attach (not reported). M8: info_os sbt_stack inset 2.04M tris -> E1.
  - Viewer findings -> E1: 2/2 um levels drawn as strips at 10 um scale, plug not distinct, d2h inset framing.
- T7 launched (foveros, foveros_direct, hybrid_bond_d2w, hybrid_bond_w2w); T8 launched (fan_out_panel, ibm_dbhi,
  ucla_si_if, cpo_module). All 23 families now assigned.
- T2 done (cowos_s, samsung_mios). Before -> after: cowos_s M2 0.34 -> 0.98, M3 1.00 (chain to board), M4 15/15,
  M5 0/54, M6 0; samsung_mios M2 0.36 -> 1.00, M3 1.00, M4 21/21, M5 0/62, M6 0. cowos_s reported count 22 -> 21
  (cu_n no longer a repeat count because Cu1-3 are written out with distinct uses; still used in text); MIoS no loss.
  CoWoS-S interposer: passivation / Al RDL 2.5/2.5 (template from "5 um pitch") / Cu3 D2D 0.4/0.4 (iOIS analog) /
  Cu2 GND / Cu1 / Si 100 um reported / C4 pad on TSV / PI. TSV 10 um at 100 um pitch (pitch analog
  eptc59621...-i1.pitch_max_um; 50 um gave a uniform field unlike the references), liner 0.4, land 1.5x template.
  MIoS: 5 Cu levels at 0.75/0.75 (analog), backside RDL x2, 6-2-6 substrate reported with derived 23.8 um
  dielectric closing the reported 3.082 mm height. Renders 2026-10-20_130158; M8 max 23 calls / 1.38M tris.
  - Requests: taper direction (handled already: bottom_diameter_um > diameter_um widens downward; viewer must draw
    it), scorer Si layer range binning, TSV placement clustered under C4 rather than a uniform grid.
- Coordinator check of T2 renders: ip_edge in-scale shows TSV columns in the Si interposer, C4, build-up with
  planes, plugged PTH; front illustrative reads as a full package section with routing texture and BGA. The
  illustrative d2h inset is unreadable (z-stretched blocks, no recognizable BEOL/bump/TSV structure): illustrative
  z-mapping at inset zoom needs work (E1 / M7 audit item).
- T5 follow-up: `plug: resin` on the sbt_828 PTH (substrate ref rule: cores >= 400 um resin-plugged); SR openings
  c4 52 um / bga 479 um (analog measured metrics ectc51909.2023.00155-a-m5/-m6); cowos_r ubump pad 27 um (analog).
  Pad sizes that exist only as text (150 / 700 um) left out. Scores unchanged except template counts.
- S1 done: `config/package3d/fidelity_checklist.yaml` (10 archetypes with variants, 18 machine check types,
  reconciliation block vs R1-R3), `scripts/score_package3d.py` (M1-M6; chained net segments, top-to-board flag,
  cavity-aware walk, via regions, single-row ranges, P10-P90 "atypical" flags not counted),
  `scripts/render_package3d.py` (fresh page per family, family check before capture, vite overlay detection,
  `window.__apa3d` stats). Baseline scores (pre-routing JSON): `outputs/package3d_scores/2026-10-20_130445.md`.
  Interpretations recorded in the scorer docstring (M6 land rule = pitch - land >= line + 2 x space; microvia AR =
  depth / top diameter; HBM blocks in 2.5D families scored as dies; orphan = no via class touches the level;
  60 fps not measurable headless, `ms` is CPU frame time).
  - Open: fcbga_organic M6 = 8 (microvia AR 0.16-0.18 vs DB 0.33-3), a consequence of the reported backbone
    thickness (9.5 um derived dielectric). Decision for the owner: keep the reported backbone, or switch the routed
    build-up to the fully reported 4-2-4 TV ectc51687.2025.00148-a (40 um ABF). Kept for now.
- T2 addendum: plug resin, ubump pads 27 um (analog), C4 pad 75 / opening 52, BGA pad 700 / opening 479 (template
  / analog); scores unchanged. Note: completeness counted +4 template for 7 new array dims in cowos_s (+1 for 5 in
  MIoS); likely dedup by declared element; to verify in the audit.
- S1 follow-up: M5 scores Si core layers against interposer Si rows (20-775 um, n=44) and bridge Si rows (core +
  device, 20-110 um, n=11); cowos_l and emib_t out-of-range now 0; lands/walls without DB class listed as
  `no_db_range`. Current scores `outputs/package3d_scores/2026-10-20_130558.md`. ("0b141ca" in S1's baseline note is an ancestor commit whose
  package3d.json blob (107d6af) equals HEAD 43ac037, so the baseline is the pre-routing state.)
- T4 done (cowos_l + bridge_in_mold module, ase_focos_bridge, amkor_s_connect, samsung_i_cube_e). M2 0.24-0.31 ->
  0.93-0.96; M3 3/3 clean with top-to-board chain; M4 full; M5 0 (S-Connect 1: reported 260 um pillar pitch vs
  scorer's tmv-only range; explained); M6 0. No reported value lost. Module now holds front/back RDL, TIV (region =
  core minus LSI), LSI stud + BEOL + M1 GND + Si + TSV, and the substrate. CoWoS-L reported in-family: RI counts,
  B/S RDL 11/11, LSI 0.8/0.8 um and 2 um Cu, TIV 50/100, 3-2-3 build-up, 1400 um core. I-Cube E: all analog.
  Renders 2026-10-20_130521 (50 views, 0 errors, max 27 calls / 1.7M tris).
  - Fix-pass queue (after T6-T8 and E1): checklist `tiv_class` needs through-part via ends resolved to neighbor
    conductors (scorer side); `net_d2d` not expected for cored organic RDL (D2D lives in the bridge); no
    `bridge_attach` for the tsv LSI variant; FOCoS stud 50 um too tall vs ectc51687.2025.00095-f01 (template);
    CoWoS-L PTH AR 7 (> DB 3.7-6.5; analog hole in reported core); TEMPLATE_FORMAT module example drop list stale;
    viewer: illustrative insets mis-framed, via regions not yet honored (I-Cube E posts inside the bridge).
- T8 done (fan_out_panel, ibm_dbhi, ucla_si_if, cpo_module). M2: 0.42 -> 1.00, 0.31 -> 0.97, 0.33 -> 0.92,
  0.30 -> 0.97; M3 1.00 where a die-to-board path exists (Si-IF has none: wire-bonded edge I/O); M5 0 except
  fan_out_panel PI2 9 um (reported; scorer excludes the row with empty material_class); M6 0. DBHi uses sbt_828
  with reported 2.0 mm total and 9/12 um L/S; bridge wiring EMIB analog. CPO substrate/EMIB copied from the emib
  analog set; `bv_fine` region = bridge; no optical structure added. Renders 2026-10-20_131926, _132054.
- Coordinator decision: fan_out_panel backbone switches from the one-RDL chip-first TV ectc32862.2020.00185-a to
  the in-family 3-RDL chip-last TV 2380-4505-2020.1.000042-a (full ML1-ML3 dims, 3 dies -> D2D nets), because the
  owner asked for representative RDL layers. F1 fix pass launched: that switch, scorer/checklist items from the
  fix-pass queue, FOCoS stud height, TEMPLATE_FORMAT module example, completeness count check for pad/opening dims.
- T6 done (hbm_stack, soic, samsung_x_cube). M2 0.80 -> 1.00, 0.59 -> 0.94, 0.26 -> 0.97; M3 1.00 with
  top-to-board chains (HBM one TSV column chain through 7 core dies + base; X-Cube SRAM bump -> BGA in 2 segments).
  hbm_stack ub pitch 36 um now reported (vlsitechnologyandcir46769.2022.9830182-j-i1, matches after the tagging).
  Die BEOL analog imec TSV-middle die ectc51906.2022.00179-c; SoIC bond pad/HBV 0.5 um analogs
  (tcpmt.2021.3104326-c); TSV 5 um, liner 0.4, land 1.5x template. Renders 2026-10-20_131911, _132002 (max 24 calls,
  1.05M tris). Scorer items (joint-array gaps, HBV orphans, beol_via land class, bond-field L/S rule, filled through
  hole, carrier-less encap) -> F1; viewer items (illustrative inset framing, Cu pads for hybrid bonds, Si-IF via
  color/pad gaps, I-Cube E regions) -> E1. Not modelled: SoIC TDVs, HBM TC-NCF variant, HBM base PDN plane.
- E1 interim: `window.__apa3d` {stats, preset, inset(id[, keepScale]) async, setSection, setIllustrative, ready};
  cavity cut of routing by `in:` parts; via regions + one class per xy; grid phase onto the cut (and grid vias whose
  pitch divides an endpoint array phased to it); per-instance taper; plug colors (resin dark, copper solid, none
  hollow); Cu openings for Cu-Cu joints; thin-level LOD fix (dir=y 2/2 um lines now cross the cut); M8 caps:
  info_os sbt_stack 1.98M -> 1.18M tris; single views 15-18 calls. Compare (4 routed families) 60-85 calls
  (> 40 budget) -> merge pass requested.
- T7 done (foveros, foveros_direct, hybrid_bond_d2w, hybrid_bond_w2w). M2 0.23 -> 0.97, 0.29 -> 1.00, 0.60 -> 0.95,
  0.60 -> 1.00; M3 1.00; M4 full; M5 0; M6 0. All 23 families now routed. Foveros TSV grid drawn one per package
  bump (template; the reported 15 um cluster pitch as a uniform grid renders a solid Cu wall); 15 um kept in the
  callout. foveros reported count 9 -> 8 for that reason. W2W HBV 0.6 um reported, dual damascene HBV+pad group;
  D2W TSV 5 x 50 um at 35 um reported. Foveros families import sbt_828 with re-declared nets. Renders
  2026-10-20_132419 (44 views, max 21 calls / 0.88M tris).
  - Viewer bug -> E1: openings drawn through Si / bonding layers (solder columns in base-die Si), TSV half span.
  - Scorer -> F1: hybrid-bond arrays cover pad gaps (M4); net_d2d only when dies share a carrier.
  - Feature idea (not scheduled): TSV-cluster grid (n TSVs at sub-pitch per site) for Foveros.
- F1 done. fan_out_panel switched to the 3-RDL chip-last TV 2380-4505-2020.1.000042-a (Chip 1 + 2A + 2B, ML1-ML3
  2/2, 5/5, 10/10 um, V01/V12/V23 22/30/30 um, 350 um balls; reported dims 29 -> 43; old one-RDL backbone kept as a
  callout). Scorer/checklist: through-part via ends resolved to touching neighbors; net_d2d not for cored RDL and
  only when >= 2 dies share a carrier; bridge_attach not for tsv LSI; M5 infers empty material_class, tmv range
  includes tiv/cu_pillar through-vias; joint arrays cover gaps (M4) and prevent orphans (M3); beol_via land no DB
  range; L/S rule skips beol_via and bond fields; pth_class accepts Cu-filled; carrier-less encap n/a; extra
  `no_back_rdl` variant for FOCoS TV-1 (bottom passivation only). FOCoS stud 50 -> 5 um (analog S-Connect stud),
  bridge 95 um template (matches ectc51687.2025.00095-f01). Completeness count for pad/opening dims verified
  correct (one per declared array). Scores `outputs/package3d_scores/2026-10-20_133750.md`:
  all 23 families M2 >= 0.92, M3 1.00 where a die-to-board path exists, M4 full, M5 0 out of range;
  M6 0 except fcbga_organic 8 (owner decision pending) and glass_core_substrate 4.
- Audit A1 (fresh context) launched: provenance of the new routing dims + legitimacy of scorer relaxations.
- E1 done. New `app/src/lib/three/routing.ts` (attachRouting + deterministic synthRouting: traces, planes with
  antipads, pads/lands, tapered/plugged/lined vias, SR openings, D2D wires, vertical / plane_tie / escape chains,
  chaining of net segments), dev-only `fixture_routing.ts` (`?fixture=routing`, not in the prod bundle), routing
  tooltips with provenance + layout_note + "1 of k lines drawn", "Routing" chip (default on), `window.__apa3d`.
  Merged meshes: compare default 40 calls / 1.79M tris with routing (35 / 0.71M without), 60 fps orbit on Metal;
  single views ~10 calls. pnpm check 0/0, build ok.
  - Known gaps: selection outlines the host box; square antipads/openings; matrix overlap behind the 2 px cut slab
    (visible only in x-ray); staggering along the level direction only; compare exactly at the 40-call limit;
    inspector inset buttons still switch to in-scale (illustrative insets only via `inset(id, true)`).
- Coordinator: `scripts/render_package3d.py` illustrative inset captures now re-frame with `inset(id, true)` after
  switching scale (E1 note). Full 23-family render launched for the M7 audit.
- Audit A1 done: `DevLog/audits/package3d_routing_audit_A1_2026-10-20.md` (2 blocking, 10 should-fix, 12 minor).
  404 reported/derived routing dims checked automatically (0 value mismatches, 0 out-of-family); 99 sampled by hand;
  no invented numbers. Blocking: absolute local path in render_package3d.py; fcbga_organic build-up physically
  impossible (backbone is a warpage TV whose L2/4/6/8 have 0% Cu; drawing 25/25 signal there squeezed the
  dielectric to 9.5 um). Should-fix: glass M6 AR on the wrong via end (scorer bug); M5 cannot fail (pooled
  simulation rows, atypical not counted); M3 misses xy pitch mismatches (cowos_s TSV 100 under C4 150, emib_t TSV 50
  over 175 cavity bumps); parameters tuned to the M6 L/S heuristic; BEOL via/IMD mixed sources; L/S skips hide 5
  tight cases; template rules inconsistent across families; pth_class looser than its name.
  Relaxations judged justified: variants, dies_share_min, joint coverage, cavity walk, TMV widening, no_back_rdl,
  beol_via land exemption. Not justified as implemented: L/S skips, uncounted P10-P90 outliers.
- Coordinator decision: resolve the open FCBGA question per A1: coherent stack from estc60143.2024.10712019-b
  (template total), warpage-TV reported facts kept as callouts. F2 (scorer, checklist, render script) and F3
  (family YAMLs) launched.
- F2 done (scorer, checklist, render script). Render script: no local paths (`--chromium` > env `APA_CHROMIUM` >
  auto-discovery under the home Playwright cache > Playwright default). AR on the entry diameter: glass M6 4 -> 0
  (the earlier glass M6 = 4 was a scorer bug, not a model defect). M5 from physical rows only (3956/4204 layers,
  1182/1267 interconnects; `--all-rows` to compare); counted M5b. M3 xy pitch check. land_space + escape_ls replace
  the L/S skips. pth_class: Cu-filled only for cores <= 400 um, else wall + plug. rdl_via needs a land. Metric
  definitions above updated. Score snapshots pruned to baseline 130445 + F2 final 141721 (the 9 pruned pairs zipped
  in the session scratchpad). F2 final scores are on the F1-state JSON; re-score after F3.
  - New findings on the F1 JSON: cowos_s TSV 100 vs C4 150 (xy), emib_t TSV 50 / PTH 500 vs cavity bumps 175 (xy),
    hbm_stack TSV 36 vs bumps 35 (xy), emib_t fine-via land space 3 um vs 20 um, emib_t bridge Cu 1.0 um outside the
    physical range [2, 4] (1 um only from a simulation TV). Forwarded to F3 with F2's scratch score of F3's WIP.
- F3 done (family YAMLs per A1). fcbga_organic: one coherent stack from estc60143.2024.10712019-b (30 um RCC
  dielectric reported, 13 um Cu, 25/25 L/S; microvia 50.8 um template = mean measured stacked-via width; AR 0.59;
  total 2128 um template); reported warpage-TV facts (8-2-8, 1.8 mm, 1.4 mm core, Cu ratios, pad/opening text) kept
  in callouts/params; reported dims 70 -> 62. cowos_s TSV pitch = C4 pitch 150 (one TSV per C4, 2013 TV text);
  emib_t TSV pitch = cavity bump pitch 175 + new bridge backside pad level, jog on core Cu; hbm_stack jog on base
  M1. Harmonized rules in a new TEMPLATE_FORMAT.md "Template rules" table: PTH land 1.5x, wall 14.875 um, TSV
  land 1.5x (d2w keeps its DBI pad), organic microvia land 110/70 (glass via + 12), default TSV grid 100 um,
  space = line when only line is known. BEOL via + IMD from the same row (0.54 / 1.5 um). Plugs, fan_out lands
  (38 um template), minor status fixes. Renders 2026-10-20_142108 (19 families, 236 views, 0 errors).
  - Remaining flags (explained in notes, not tuned): foveros/foveros_direct escape L/S at 110 um bump pitch with the
    analog substrate; d2w/w2w one-trace-between-lands rule does not describe those stacks; emib_t fine-via lands
    vs substrate-level space (needs per-region level properties); emib_t bridge Cu 1 um below the built range.
  - Coordinator check (142108): fcbga c4_bga, cowos_s ip_stack, emib_t bridge_xs read as real cross-sections; dark
    wedge artifact in emib_t bridge_xs -> E1; illustrative insets 2.0-4.2M tris -> E1.
- Coordinator fix: generator refs for process_steps rows without a TV now take the paper of their flow (11 refs
  showed "?" in the references panel); JSON rebuilt, families byte-equal, 0 refs without paper.
- M7 visual audits launched: V1 (substrate / 2.5D families) and V2 (bridge-in-mold / 3D / hybrid-bond families).
- E1 follow-up done: array triangle budget (650k per family; zoom window shrinks around the cut row) and a hard
  routing cap (1.1M triangles, band depth reduced and re-synthesized); every view of cowos_r, info_os, foveros,
  samsung_mios, emib_t, emib, glass_core_substrate, cpo_module <= 1.66M triangles and <= 10 calls (was up to
  4.19M). Render 2026-10-20_144134 (100 views, 0 errors). emib_t wedge cause: an embedded filler (`cavity_fill`,
  in: substrate) was subtracted by its own host, leaving an empty cavity; fixed in model.ts. The remaining darker
  shape is the real cavity wall seen through the translucent underfill (xray_default kept, consistent with every
  other underfill; the underfill chip makes it opaque).
- V2 visual audit done (`DevLog/audits/package3d_visual_audit_V2_2026-10-20.md`): M7 means hybrid_bond_d2w 2.71,
  samsung_x_cube 2.57, soic 2.57, hbm_stack 2.43, cowos_l / ase_focos_bridge / hybrid_bond_w2w 2.29, foveros /
  foveros_direct / amkor_s_connect / samsung_i_cube_e 2.14, ucla_si_if 2.00; all >= 2. Items at 1: foveros TSV
  (one per 110 um bump vs 15-16 um TSV pairs in the figures), w2w hybrid-bond vias not visible (pads float),
  ucla_si_if joint (no dielet-side pad/BEOL). Top fixes: default x-ray on fills reads as voids (ri_core, gap fills,
  MUF); orthographic camera for section presets/insets (perspective wedges); bridge insets framed at 7-8 mm (need
  0.3-0.5 mm); per-pad hybrid-bond via sub-grid; TSV-cluster grid; bumps as pillar + solder cap; illustrative
  inset z-stretch cap; Si-IF joint; tapered/T-profile RDL vias in bridge-in-mold; HBM dummy bumps, S-Connect gap
  as mold.
- V1 visual audit done (`DevLog/audits/package3d_visual_audit_V1_2026-10-20.md`; in-scale renders): fcbga_organic
  2.50, cowos_s / info_os / ibm_dbhi 2.43, fan_out_panel 2.33, emib / samsung_mios / cowos_r / cpo_module 2.29,
  glass_core_substrate 2.14, emib_t 1.86 (below target). Illustrative mode scores 1 on relative thickness in every
  family (many thin BEOL breaks sum taller than a thick Si / core). Wedge and M8 findings were already fixed by
  E1 (V1 used the 142108 renders).

## Fix round R2 (from V1 + V2, 2026-10-20) - coordinator decisions

New keys (binding for G1 / E1 / X1):
- Via class `cluster: {n: <count spec>, pitch_um: <spec>}` -> JSON `cluster: {n, pitch_um}` (+ dims): n vias on a
  compact grid (ceil(sqrt n) columns) at `pitch_um` centered on each site (grid site, net path point, or pad).
  Uses: TSV groups (Foveros 15-16 um pairs, EMIB-T groups of 3-4), hybrid-bond vias per pad (W2W, Foveros Direct).
- Array `cap_h_um` (spec) -> JSON `cap_h_um` (+ dims): solder cap height at the array's lower end (Cu pillar /
  micro-bump drawn as Cu column + solder cap); absent = single material as today.
Viewer (E1): orthographic camera for Front/Right presets and every inset when Section is on; illustrative z-map
keeps part thickness order (a part's mapped thickness monotone in its true thickness; internal layers share it with
a floor) and illustrative insets frame on the in-scale inset box; inset cut snaps to the nearest row of the inset's
main array; caps on every through-via in the window and vertical nets prefer through-vias inside the window; no line
thinning in-scale when lines >= 1.5 px; cut caps opaque for parts translucent only by data default (caps stay
translucent under the user's X-ray toggle, owner request 2026-10-20 09:25); hide callouts whose anchor is outside the
view; cluster + cap_h rendering; ball segment LOD.
Templates (X1): bridge insets 0.2-0.5 mm on a bump row (cowos_l, FOCoS, S-Connect, I-Cube E; new for emib, glass,
cpo, dbhi); Si-IF dielet-side passivation + Cu pad; tapered / T-profile RDL vias in bridge-in-mold; HBM support
bumps over the die gap, TSVs in the central band; S-Connect gap as mold; emib_t fine vias under the FLI field and
discrete pads above the bridge; glass fine vias under fine bumps; samsung_mios "3.5D" callout; cpo "optics not
modeled" callout; fcbga on-screen build-up thickness note; info_os conformal cup vias per ectc51906.2022.00232-f06;
clusters (foveros, foveros_direct, emib_t, w2w) and cap heights where DB cells exist.
- G1 R2 done: via `cluster: {n, pitch_um, dims}` (dims nested), array `cap_h_um` (+ dims); byte-identical when
  unused; 35/35 negative tests; warnings for cluster extent > pitch/land and pitch < diameter. E1 and X1 notified.
- X1 R2 done (templates). Bridge insets 0.4-0.5 mm on a bump row (cowos_l, FOCoS, S-Connect, I-Cube E; new
  `bridge_d2d` in emib, glass, cpo; DBHi br_beol 0.4 mm). Si-IF dielet Cu pad 2 um (reported cell
  iedm45741.2023.10413759-a-L04). FOCoS RDL via lands/taper from ectc51687.2025.00095-f04 pixel ratios (template);
  S-Connect / I-Cube E split rv_f / rv_m; I-Cube E via narrows onto the post (00048-f02). HBM TSVs confined to a
  central band (1.79 mm template from -f03), support bumps outside. S-Connect gap as mold (assumption, labelled).
  emib_t: pad-only build-up part over the bridge (`ob_bu`), fine via 10.7 um from the backbone figure
  ectc51846.2026.00051-f01 (d), via column under every FLI bump. Glass fine vias were never drawn (no pitch/region/
  land on `bv`): fixed; emib `bv_fine` limited to the bridge. Text: MIoS 3.5D variant "not drawn", CPO "Optics not
  modeled", FCBGA "Drawn stack exceeds reported 1800 um", InFO conformal cup vias. Clusters: foveros / foveros_direct
  TSV pairs at 15 um, emib_t groups of 4, w2w 4 HBV per pad; `cap_h_um` on 29 arrays in 21 families where a DB
  cap_height cell exists. Scores `outputs/package3d_scores/2026-10-20_152746.md`: M2/M3 unchanged; emib_t M6 3 -> 1
  (an escape L/S at the 110 um FLI pitch now exposed). Renders 2026-10-20_151455 (14 families, 178 views,
  0 errors, max 10 calls / 1.61M tris).
  - Coordinator: scorer bins a kind-`other` part embedded `in:` a host by the host's kind (emib_t `ob_bu` was
    compared to die rows; emib_t M5b 9 -> 7). Cluster landing-pad rule added to the TEMPLATE_FORMAT rules table.
  - Viewer items from X1 -> E1: emib pad level renders as a continuous band, Si-IF Cu-Cu joint drawn as a dark
    seam, hybrid-bond vias only where a net passes.
  - Left open: I-Cube E RDL level count (figure shows 1 upper level, model 2 analog); Si-IF trapezoid pillar; CPO
    variant callouts anchor on the substrate.
- E1 R2 done (viewer): orthographic camera for the Front preset with Section, Bumps zoom, insets and PiP (Iso /
  Top / Bottom stay perspective, size kept on switch); illustrative z-map keeps part thickness order (t^0.4 per
  part/array interval, layers share with a 0.5/n floor: 100 um Si now taller than its BEOL, fcbga core taller than a
  build-up side); inset cut snaps to the nearest row of the finest array in the inset (BGA / C4 / bumps cut in
  half); lands on every grid through-via and stand-alone via columns on unused cut-row grid vias (every PTH in fcbga
  c4_bga has stacks); lines never broken at the cut; opaque cut faces for data-default x-ray (translucent under the
  user's X-ray); region-aware callout anchors; cluster and cap_h_um rendering; 32-segment balls/cylinders > 40 px;
  pads sized by the via classes used at a point (emib top_cu now discrete pads); hybrid-bond vias under every
  endpoint pad. Full render 2026-10-20_150638: 280 views, 0 errors, max 1.61M tris, max 11 calls; compare default
  32 calls / 1.24M tris. pnpm check 0/0, build ok.
  - Not done to the letter: illustrative insets frame on the inset box mapped through the z map (framing on the
    in-scale lateral box cropped the stretched z to Si only). Si-IF dark segments are the physical 0.5 um gap beside
    each pillar (recessed SiO2 to dielet pad), left as is.
- Coordinator: cowos_r `rdl` inset moved from the four-die corner (no bumps) to the SoC-SoC gap at y = 5 mm
  (box [-0.15, 4.9, 0.15, 5.1]). JSON rebuilt; full score + full render launched for the final state.
- Final state (2026-10-20 15:54): JSON 23 families / 881 refs; scores `outputs/package3d_scores/2026-10-20_153615.md`
  (baseline `2026-10-20_130445.md`); render `cache/package3d_renders/2026-10-20_153615/` (286 views, 0 errors, max
  1.61M tris, max 10 calls per single view; compare default 32 calls). Kept render runs: 135536 and 142108 (cited by
  the M7 audits) and 153615; the other 24 session runs were removed (cache, regenerable). Score snapshots pruned to
  baseline + final (intermediates zipped in the session scratchpad).
  - Coordinator spot check of the final render: cowos_r rdl inset (micro-bumps on both SoCs, stacked 8/11 um RDL
    vias, 9 levels, power planes, via on C4, C4); hybrid_bond_w2w unit_cell (pads with 2x2 HBV clusters, 1 x 10 um
    TSVs with liners through the 9 um tier); emib bridge_d2d (tapered fine vias onto bridge pads, M1-M4 D2D wires,
    bridge on adhesive, substrate levels, PTH).

## Summary: before -> after (baseline 130445 vs final 153615)

| metric | baseline (pre-routing) | final |
|---|---|---|
| M2 structural completeness | 0.23-0.80 (median ~0.31) | 0.92-1.00 (17 of 23 at 1.00) |
| M3 die-to-board continuity | N/A (no nets) | 1.00 in all 22 families with a die-to-board path (Si-IF: edge wire-bond I/O, N/A) |
| M4 routed levels / via-covered gaps | 0 routed levels | all levels routed, all gaps covered |
| M5 out of range (physical DB rows) | N/A | 0, except emib_t 5 (1 um bridge Cu below built range [2, 4], justified in note) |
| M6 rule violations | pitch hierarchy only | 0, except 1 each in emib_t, foveros, foveros_direct (escape L/S at 110 um bump pitch with the analog substrate) and hybrid_bond_d2w / w2w (one-trace-between-lands rule does not describe those stacks); explained in notes |
| M7 visual (V1/V2, pre-R2 renders) | not measured | 22 of 23 families >= 2.0 (range 1.86-2.71); emib_t 1.86 before R2; R2 fixed its listed causes; not re-audited |
| M8 render budget | n/a | every view <= 1.61M tris, <= 11 calls; compare 32 calls |
| M1 reported share | as before | falls (template routing dims added); no reported cell lost except where A1/F3 replaced an impossible combination (fcbga) |

## Open follow-ups (not done)

- [ ] Fresh M7 re-audit on the final render (R2 fixes not yet scored visually; emib_t was the only family < 2).
- [ ] Per-region level properties (emib_t substrate level L/S over vs outside the bridge) - generator + viewer.
- [ ] Organic substrate rows for HPC families are thin: most substrate dims are analog (cowos_s, emib, foveros...).
- [ ] Illustrative insets still frame wider than in-scale insets (E1 R2 note); inspector inset buttons open in-scale.
- [ ] Microvia taper rules differ across families (38/42 ratio vs 72 deg sidewall); harmonize.
- [ ] I-Cube E upper RDL level count (figure shows 1, model 2 analog); Si-IF trapezoid pillar; CPO variant callouts.
- [ ] Earlier DevLog-008 SOTA CoWoS/EMIB topology plan is still open and will touch the same templates.
- [x] (committed 2026-10-20 in 80e3fab..f5e2da3; ticked 2026-10-21) Commit (owner decides): code, configs, refs, scorer/checklist, DevLog/audits; `scripts/ieee_fetch.py`,
      `scripts/ingest_inbox.py`, `config/sim/`, `LICENSE`, `references/<new>` changes are not from this work.
