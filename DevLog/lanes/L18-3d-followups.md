---
title: Lane L18 - DevLog-011 3D follow-ups (per-region levels, microvia taper, I-Cube E / Si-IF / CPO, inset framing, M7 re-score)
date: 2026-10-21
status: done (2026-10-21); hand-off below
scope: config/package3d/*.yaml (not RESEARCH_SOTA_*), scripts/{build,score,render}_package3d.py, app/src/lib/three/, app/src/routes/3d/, app/static/data/package3d.json, this file
owner: lane L18 (Claude subagent, DevLog-013)
---

# L18: DevLog-011 open follow-ups

Binding inputs: DevLog-013 (shared rules, L18 row), DevLog-011 (contract, "Open follow-ups"), audits
`DevLog/audits/package3d_*`, `config/package3d/TEMPLATE_FORMAT.md`, `fidelity_checklist.yaml`.

Constraints: no product-topology change (die / HBM / bridge counts, interposer size) to cowos_s, cowos_l, emib, emib_t
(L17 owns SOTA values). No engine/ or sims/ edits (L19 syncs family drift). No git writes. No subagents (coordinator
correction 2026-10-21: project cap in use; the fresh-context M7 audit is run by the coordinator later). Dev servers
(tmux apa-app, apa-sim-ui) untouched; own server on a free uncommon port if needed, stopped after.

## Plan (2026-10-21 17:54, before implementation)

1. Per-region level properties (emib_t substrate level L/S over vs outside the bridge).
   - Generator: optional layer `route.regions: [{region: <region spec>, line_um, space_um, fill?, use?}]` (region forms
     as via `region`); resolved to package-frame rectangles with their own dims; validation; counted in completeness;
     byte-identical without it. TEMPLATE_FORMAT.md section.
   - Viewer: routing synthesizer picks the per-region L/S (and fill) for features whose xy lies in a region rect;
     tinted slab fill per region outside the window if cheap; tooltip shows the region values.
   - Scorer: M5 / M6 read region dims (land_space / escape_ls per region).
   - emib_t template: over-bridge region values with sources (reported / derived / template with basis).
2. Microvia taper: one representation = sidewall angle over the drawn dielectric depth,
   `bottom = top - 2 x depth / tan(theta)`; per-family source kept (72 deg row note ectc51687.2025.00076-b-i1, or the
   42 / 38 um measured via over 15 um of ectc51687.2025.00378-a expressed as an angle). Bottom-side build-up vias
   inverted (wide end toward the BGA face) everywhere. Families with straight microvias get the default rule.
   Decision + table in TEMPLATE_FORMAT.md "Template rules".
3. I-Cube E upper RDL level count to the source figure; Si-IF trapezoid IF pillar; CPO variant callouts anchored off
   unrelated geometry.
4. Illustrative insets framed like in-scale insets; inspector inset buttons: decide per DevLog-011 wording, check
   current behavior first.
5. Final: build `--check` + build, `pnpm check`, score, full headless render (0 console errors), own M7 scoring of the
   final renders; render paths for the coordinator's fresh-context audit. Engine drift check
   (`node --test tests/families*.test.mjs`, read-only) -> drift list for L19.

## TODO

- [x] Plan
- [x] 1 per-region levels (generator, viewer, scorer, emib_t)
- [x] 2 microvia taper harmonization
- [x] 3 I-Cube E / Si-IF / CPO
- [x] 4 inset framing + inspector buttons
- [x] 5 build, check, score, render, own M7, drift list (fresh-context M7 audit: coordinator)
- [x] Hand-off

## Progress log

- 2026-10-21 17:54: read DevLog-013, DevLog-011, audits V1 / V2 / A1, TEMPLATE_FORMAT.md. Plan written.
- 2026-10-21 17:58: coordinator correction: no subagents; item 5 = headless renders + own M7 scoring, render paths in
  the report (coordinator runs the fresh-context audit later).
- Baseline: build to scratch is identical to the committed-state package3d.json except `generated`; scores of that JSON
  kept in the session scratchpad (`score_before.md`).
- Item 1 done (2026-10-21 ~18:00):
  - Generator: layer `route.regions: [{region, use?, dir?, line_um?, space_um?, fill?, note?}]`; region forms as via
    `region`; inheritance only where the region's use needs L/S; fill recomputed on L/S or use change; JSON
    `route.regions: [{rects, use, dir?, line_um?, space_um?, fill, note?, dims}]`; counted once per layer element;
    module rename follows region part ids. Output byte-identical without regions (checked). Negative tests 9/9 raise
    (unknown key, missing region, bad use / dir, bare number, unknown part, fill > 1, partial box, empty list); positive
    test (signal region with own line, plane region inheriting space) resolves. Scripts in the session scratchpad.
    ruff / mypy: no new findings vs HEAD (5 / 5 pre-existing each).
  - Viewer (`routing.ts`): `RLevel.zones`; traces drawn per L/S set (level's own outside zone rects, own lines in signal
    / mixed zones), planes per zone with own antipad clearance, pad zones only via pads; inspector rows
    `region k <field>` + summary line (`Viewer3D.svelte`), type `RouteRegion`. Out-of-window tint keeps the level fill.
  - Scorer: M1 counts region dims; M5 checks region-stated L/S; M6 land_space / escape_ls use the region route for
    a region-restricted via class, and skip landed levels cut out by an embedded part at the via region.
  - emib_t: `ob_bu` part and its 5 layers removed; L2 (`bu_sig`) carries `regions: [{region: {part: bridge}, use: pad,
    fill: ob_pad_fill}]` (fill = pi / 4 x land^2 / pitch^2 = 0.351, template); `bv_top` / `bv_pad` now span `bu_ds_1`
    / `bu_dp_1` with `region: {part: bridge}`. Sources: figs ectc51846.2026.00051-f03, -f01 (d) (pads only over the
    bridge). Over the bridge the L/S is "pads only"; outside 14/20 um (analog ectc51909.2023.00155-a-L16, unchanged).
    M3 still 3/3 clean (walk crosses L2 pad, cut-out L3 skipped); M6 land_space for bv_* now uses the pad region (1 um
    floor; 8.3 um gap) instead of the 20 um substrate space.
- Item 2 done (~18:04): decision recorded in TEMPLATE_FORMAT.md "Template rules": one representation, bottom = top -
  2 x drawn depth / `mv_wall_tan`; back-side vias inverted (wide end down) everywhere; per-family source kept:
  72 deg (ectc51687.2025.00076-b-i1 notes) or tan = 2 x 15 / (41.66 - 38.01) = 8.22 (ectc51687.2025.00378-a-m5 /
  -m6 / -m7; the measured via behind the former 38 / 42 ratio, depth from -m5). Default (no family source) = 72 deg
  (stated sidewall angle of an ABF build-up via) for the sbt_828 module (cowos_r, info_os, foveros, foveros_direct,
  ibm_dbhi), which had straight vias. cowos_s / samsung_mios back-side vias were straight ("contract tapers toward the
  bottom only", not true: bottom > top is drawn widening downward) -> inverted. Fine vias over bridges (emib, emib_t,
  cpo) use their family's `mv_wall_tan` over the same film.
  - Consequence to note: the angle rule makes thick-dielectric families taper more (info_os 40 -> 15.9 um over 37.1 um,
    ibm_dbhi 40 -> 19.9 um over 30.9 um); emib_t fine via 10.7 -> 7.1 um.
- Item 3 done (~18:06):
  - I-Cube E: `ri_front_n` 2 (analog nepes eptc67330.2025.11392593-a-L04) -> 1 (template; fig
    ectc51687.2025.00048-f02 shows one Cu bump-pad level on one dielectric with the via onto the Cu post); `rv_m` via
    class and its 3 params removed; `rv_f` spans `ri_f_diel`. Interposer front 25 -> 15 um.
  - Si-IF: `pil_base` trapezoid, `pil_bot_d_um` = pil_d x 80 / 98 (template; pixel reads of fig
    ectc51846.2026.00062-f02 (b) right: ~4.0 um at the bonding interface to ~3.25 um at the Si-IF wiring with the 5 um
    scale bar; iedm45741.2023.10413759-f01 (c) ~51 -> ~47 px). Note: V2 said "wider at the base"; both figures show the
    IF pillar narrower at its M2 pad than at the bond tip, so the drawn trapezoid is wider at the top.
  - CPO: the three variant callouts anchored on `substrate` (IME, CHIPS, OMIB) folded into the note of the FAU "Optics
    not modeled" callout with their refs; on-screen text unchanged; no callout anchors on unrelated geometry.
- Item 4 done (~18:08): inspector inset buttons already open in-scale (PiP and frame button set illustrative = false);
  frame-button tooltip now says "(in-scale)". Illustrative inset framing: new `ViewState.zsquash` (illustrative z map
  times k); `frameInset` in illustrative computes k = min(1, max(Ht, W / aspect) / Hm) so the inset frames the same
  lateral region as in-scale (W = inset box width along the view, Ht = true z range, Hm = mapped z range); thin layers
  keep their relative enlargement; any later view change without `zsquash` resets it to 1. pnpm check 0 / 0.
- JSON written (check ok, 23 families, 883 refs). Scores (scratch `score_mid.md`): no metric regressed; M5 evaluated
  counts grew where tapers were added; emib_t routed levels 26 -> 24 (ob_l1 / ob_l2 gone), M6 unchanged 1 (escape L/S
  at the 110 um FLI pitch, pre-existing).
- Engine drift check (`node --test tests/families*.test.mjs`, read-only): 69 / 72 pass; 3 failures all from emib_t
  (part count 7 -> 6, data injection 7 !== 6, drift alarm emib_t.parts). Full per-family transcription diff (scratch
  script, no files written): only emib_t differs (parts: ob_bu removed; layers: ob_bu group removed, bu_sig route
  gained `regions`). JSON param value changes in transcribed families listed in the hand-off.
- 18:09: own vite dev server started in tmux `apa-l18` on 127.0.0.1:47417 (port checked free) for the renders.
- 18:10 pilot render emib_t (`cache/package3d_renders/2026-10-21_181025`, 12 views, 0 errors): illustrative insets
  now frame the same lateral region as in-scale (same scale bar: bridge_edge 500 um, bridge_xs 100 um). Found: L1 over
  the bridge drawn as a solid Cu bar. Cause (pre-existing, it hit ob_l2 before): the grid-via phase rule picked the
  coarsest endpoint array of the host whose pitch is a multiple (BGA 1000 um) for the 25 um bridge vias, so every
  fine-bump net jogged to an offset lattice. Fix (`routing.ts`): a region-restricted via class phases to an endpoint
  array lying inside its regions first (fli_bridge). Also: trace segments (jogs / escapes) stop at pad-only zones.
  Re-render 181309: L1 and L2 over the bridge are discrete pads with one tapered via stack per FLI bump onto the bridge
  pads, as in fig ectc51846.2026.00051-f03 / -f01 (d). Both pilot runs are superseded by the full run below.
- 18:14 final scores `outputs/package3d_scores/2026-10-21_181430.md` (baseline kept: 2026-10-20_130445 and the
  DevLog-011 final 2026-10-20_153615). Full render launched (all 23 families, own server).
- 18:34 viewer: an SR / passivation opening filled by a via class is drawn with that via's (tapered) profile instead
  of a straight 0.8 x pad Cu cylinder (`REp.fillVia`); the Si-IF trapezoid pillar was hidden behind the 5.6 um
  opening cylinder before. Pilot (Si-IF, CoWoS-R): trapezoid visible; cowos_r illustrative `rdl` inset now frames the
  same 20 um-bar region as in-scale (V1 had 0.14 mm vs ~3.8 mm). Known artifact: small dark wedges beside the narrow
  end of a tapered filled opening (square matrix hole vs round frustum; the slab behind the cut shows).
- 18:53 final full render `cache/package3d_renders/2026-10-21_183519/` (23 families, 286 views, 0 view / load
  errors, max 10 calls / 1.60M triangles per view, all within M8). Own server stopped (tmux `apa-l18` killed, port
  47417 free). Superseded own render runs 181025, 181309, 181427, 183331 and their logs deleted; scratch crops deleted.
- 18:55 engine re-check: `node --test tests/families*.test.mjs` 72 / 72 pass and the per-family transcription diff
  is empty: L19 has already re-synced emib_t (engine/src/families/specs/emib_t.mjs modified in the tree).

## Own M7 scoring (not fresh-context; render 2026-10-21_183519, in-scale, rubric of the V1 / V2 audits)

| family | figures | a | b | c | d | e | f | g | mean | before |
|---|---|---|---|---|---|---|---|---|---|---|
| emib_t | ectc51846.2026.00051-f03, -f01 (d) | 3 | 2 | 3 | 2 | 2 | 2 | 3 | 2.43 | 1.86 (V1) |
| samsung_i_cube_e | ectc51687.2025.00048-f02, -f03 | 3 | 2 | 3 | 2 | 2 | 2 | 2 | 2.29 | 2.14 (V2) |
| ucla_si_if | iedm45741.2023.10413759-f01, ectc51846.2026.00062-f02 | 2 | 3 | 3 | 2 | 2 | 2 | N/A | 2.33 | 2.00 (V2) |
| cpo_module | as V1 | 3 | 2 | 2 | 2 | 2 | 2 | 3 | 2.29 | 2.29 (V1) |

- emib_t: (c) 1 -> 3: one tapered via stack per 25 um FLI bump through L1 / L2 discrete pads onto bridge pads, as
  f03; (g) 1 -> 3: 2 x 2 TSV groups on backside pads over each cavity bump (R2 cluster), plugged PTH; remaining 2s:
  bridge 50 um template, FLI bumps single material, D2D wires only legible at bridge zoom.
- I-Cube E: one upper RDL level with the via narrowing onto the post (f02). Si-IF: Cu pad / trapezoid pillar in
  recessed oxide / M2 (f01 c, 00062-f02 b). CPO: no callout on unrelated geometry (variants in the FAU tooltip).
- Illustrative insets: same lateral framing as in-scale in every family checked (fcbga sbt_xs, emib_t bridge_edge /
  bridge_xs, cowos_r rdl); item (b) in illustrative stays distorted by design (z not to scale).

## Hand-off

- Write-path note: `config/package3d/TEMPLATE_FORMAT.md` (not a *.yaml) was edited additively: new section
  "Per-region level properties" and one row in "Template rules" (taper decision). Coordinator to accept or move.
- Open: emib_t M6 escape L/S at the 110 um FLI pitch (pre-existing; analog 14/20 um substrate L/S); emib_t M5
  bridge Cu 1 um below the built range (pre-existing); per-region tint outside the routing window keeps the level's
  fill; emib / cpo / glass could use `route.regions` for their over-bridge levels too (not done: emib / glass topology
  is L17's area only for product-level values, the local detail is fine but out of this lane's item list); V2 claim
  "Si-IF pillar wider at the base" contradicted by both figures (drawn wider at the tip); fresh-context M7 audit.
