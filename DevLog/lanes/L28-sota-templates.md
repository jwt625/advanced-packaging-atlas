---
title: Lane L28 - SOTA CoWoS / EMIB templates, A5 G2-G4 fixes, variant mechanism
date: 2026-10-21
status: done (2026-10-22); hand-off below
scope: config/package3d/*.yaml, config/package3d/TEMPLATE_FORMAT.md (additive), config/package3d/RESEARCH_SOTA_{COWOS,EMIB}.md (A5 G2-G4 only), scripts/{build,score,render}_package3d.py, app/src/lib/three/, app/src/routes/3d/, app/static/data/package3d.json, this file
owner: lane L28 (Claude subagent, DevLog-013), 3D template owner after L18
---

# L28: SOTA CoWoS / EMIB templates

Binding inputs: DevLog-013 (shared rules, 2026-10-21 entries), DevLog-008 "SOTA CoWoS / EMIB models and compare
default" (Wentao 2026-10-20 11:40), DevLog-011, L18 notes, TEMPLATE_FORMAT.md, RESEARCH_SOTA_COWOS.md /
RESEARCH_SOTA_EMIB.md section 7, audit A5 Part 2 (G2-G4).

Constraints: no git writes; no retrieval or web reads; nothing from or about the private download folder; no
subagents; no engine/ or sims/ edits; no `build_views.py`; dev servers apa-app / apa-sim-ui / port 47352 untouched
(own server in tmux `apa-l28` on a free uncommon port, stopped at the end).

## Plan (2026-10-21 19:07, before implementation)

0. Baseline: build to scratch == committed-state package3d.json except `generated`; scores of the current JSON.
1. A5 G2-G4 in the two RESEARCH_SOTA files, nothing else: G2 snippet-only rows T3 / E16 moved to the secondary
   tables (with a pointer), G3 EMIB section 7 basis labels, G4 2020 point added to COWOS C1, 50X outlook added to E9.
2. Variant mechanism (no variant / preset support exists in the format, generator, scorer, renderer or viewer):
   - Template: top-level `variants: {base: {id, name, note}, default: <id>, list: [{id, name, note, source, summary?,
     drop?, callouts_drop?, params?, parts?, arrays?, layers?, callouts?, insets?, routing?}]}`. A variant is an
     overlay on the expanded template (variant wins: params by name, parts / arrays / insets / via / net classes by
     id, layer groups by host part; `drop` like module drop; `callouts_drop` removes base callouts by their text).
     Each variant resolves through the same Family / Builder path (same provenance rules and checks).
   - JSON: the base family object stays the base (reported TV backbone) and gains `variant`, `variant_name`,
     `variant_note`, `variant_default` and `variants: [<full family object per variant>]`. Variants are built after
     every base family so the R-ids of all base families are unchanged (other families byte-identical).
   - Decision: JSON base = reported DB TV backbone, viewer default = SOTA-class variant (`variant_default`).
     Reasons: (a) engine/src/families transcribes the base parts / layers / arrays and the sim cases (warpage
     validation targets of 00135 TV1, 00174, EMIB25T) are built on the backbone TVs: a base change would break the
     sim contract and its validation basis, and this lane may not edit engine/ or sims/; (b) the base keeps its
     M1-M8 history comparable; (c) Wentao's request (compare view shows SOTA-class topology) is met by the viewer
     default. The backbone stays one click away (variant select) and by URL `#f=<family>&v=<base id>`.
   - Viewer: variant select next to the family select (single view) and per family in the inspector (compare);
     URL hash `#f=<family>&v=<variant>`; compare default = each family's `variant_default`.
   - Scorer / renderer: variants scored and rendered as `<family>@<variant>`; renderer option for the compare view.
3. Generator feature (only if needed): multi-grid `repeat` (list of grids with offsets) for bridges at several edge
   kinds in one part (EMIB / EMIB-T SOTA); `> 26` region rectangles get numeric suffixes (no existing family has
   them, so the output stays byte-identical).
4. Variants (per RESEARCH section 7; provenance: DB cells `reported`, primary public values `template` with
   `source`, figure readings `template` with the pixel basis in the note; no B300 / Rubin / MI455X presets):
   - cowos_s `sota_3x` (default): one 58.9 x 44.1 mm 3x interposer, SoC1 + SoC2 side by side, 1 chiplet, 4 HBM along
     each long edge (00091 p.2 Fig. 3, pixel reads of the X-ray panel scaled by the labelled 58.9 / 44.1 mm).
   - cowos_l `tv_4p8x` (default, reported DB TV 00091-b): 6 SoC (2 x 3) + 12 HBM2E (2 x 6), 18 LSI (12 HBM-SoC + 6
     SoC-SoC, Fig. 7(b)), SC-RDL 1 F/S + 6 B/S at 11/11 um, SC-RDL and side mold = 91 x 91 mm package, uBGA 0.5 mm /
     ~200 um, 3-2-3 1.4 mm core, stiffener ring (no lid / TIM); interposer-size rectangle = die block + 1 mm per
     side with the reported ~4000 mm2.
   - emib `emib_5x_12hbm` (default, DB TV 00365-h): 85 x 110 mm, 18 dies = 6 logic (2 x 2 + top + bottom) + 12 HBM
     (6 per long side), > 5X; bridge count not reported: one bridge per die-die edge = 20 (assumption).
   - emib_t `class_2026` (default, template from Intel primary roadmap points): ~120 x 120 mm, 12 HBM, > 8x / > 9x
     reticle, bridge count >= 30 (consistent with both "> 20" and "30+"; C1 stays unresolved); logic tile count and
     layout are assumptions, written as such.
5. Render budget (M8: <= 1.61M tris, <= 11 calls per view, compare <= 32 calls) via the existing merging / LOD;
   check orbit performance headless.
6. Checks: build `--check` + build, per-family diff of package3d.json (19 other families byte-identical), `pnpm check`
   0/0, scores before / after, headless renders (0 console errors), audit render list; engine drift check
   (`node --test tests/families*.test.mjs`, read-only) with the drift list for the sim lane.

## TODO

- [x] Plan
- [x] 0 Baseline
- [x] 1 A5 G2-G4
- [x] 2 Variant mechanism (generator, TEMPLATE_FORMAT.md, viewer, scorer, renderer)
- [x] 3 Multi-grid repeat (if needed)
- [x] 4 Variants: cowos_s, cowos_l, emib, emib_t
- [x] 5 Render budget
- [x] 6 Checks, scores, renders, drift list, hand-off

## Progress log

- 2026-10-21 19:07: read DevLog-013 (shared rules, 2026-10-21 entries), DevLog-008 SOTA section, L18 notes,
  TEMPLATE_FORMAT.md, both RESEARCH_SOTA files, A5 Part 2, the four templates, generator / scorer / renderer /
  viewer entry points, engine drift test (reads YAML parts / layers / arrays and package3d.json by family id).
  Figures read from cached DB papers: 00091 p.2 Fig. 3 (X-ray panel: SoC1 275 px, SoC2 244 px and a 28 px third die
  across the 563 px / 58.9 mm interposer), 00091 p.4 Fig. 7(b) (6 SoC 2 x 3, 12 HBM 2 x 6, 12 + 6 LSI), 00365 p.5
  Fig. 7(a) (2 x 2 + 2 logic tiles, 6 HBM per long side). Plan written.
- 2026-10-21 19:19: baseline: build to scratch == current package3d.json except `generated`; baseline scores
  (scratch `score_before.json`) = L18 final.
- G2-G4 applied (only these lines): COWOS line 9 exception for T3, C1 2020-point mismatch (T15 vs D1); EMIB line 9
  exception for E16, E9 50X outlook (00365 p.5 Sec. VI quote checked in text.md), section 7 basis labels for the
  backbone row and bridge_n.
- Generator: `variants` (variant_spec / apply_variant / merge_by_id; variants built after all base families),
  multi-grid `repeat` list, region suffix `_r<k>` beyond 26 rectangles. No-variant rebuild byte-identical.
- Variants written: cowos_s sota_3x, cowos_l tv_4p8x, emib emib_5x_12hbm, emib_t class_2026. Per-family diff vs
  baseline: 19 families byte-identical; refs 883 -> 912 with the 883 old R-ids unchanged; the 4 base families differ
  only by the added variant keys (+ emib fine_coarse / emib_t fli_field inset view, A9 D4).
- Coordinator message (A9): D4 applied (fine_coarse / fli_field insets: front section view instead of iso, base and
  variants). D8 (die-die gap black, underfill stops at the bump layer) and D9 (emib_t cavity joints as blocks,
  bridge Si thinner than the joints) not changed: my variants keep the base underfill / cavity modelling; both
  need a new gap-fill part or a sourced joint height (listed as open).
- 2026-10-21 19:25: viewer: variant select (single: toolbar next to the family select, aria-label
  "Variant"; compare: per family in the inspector), hash `#f=<family>&v=<variant>`, compare default = each family's
  `variant_default`, gallery thumbnails of the default variants; Viewer3D resets the camera on a variant switch.
  pnpm check 0/0. Scorer: variants as `<family>@<variant>`, per-variant checklist mapping in fidelity_checklist.yaml
  (additive entries) and `bga` added to the organic_substrate `fli_array` kinds (uBGA; no base family has a top-face
  BGA, so no base score moves). Renderer: variants, `--compare`, `--top`. TEMPLATE_FORMAT.md: "Multi-grid repeat"
  paragraph and "variants" section (additive).
- emib_t class_2026 first score: M3 2/3 (coarse-bump probe in a 0.3 mm strip between bridges, inside a cavity
  margin): tile-tile bridges re-spaced (pitch die_d - 2 x bridge_d - 3 mm, 1.5 mm clear of crossing / HBM bridges);
  M3 3/3. cowos_l tv_4p8x M2 51/56 -> 53/54 with its own checklist entry (ring instead of lid; the remaining miss is
  the ring `frame_attach`, same as the base families).
- Engine drift check (`node --test tests/families*.test.mjs`, read-only): 76/76 pass; drift alarm compared
  cowos_s / cowos_l / emib_t (template mtimes older than the JSON): no drift (variants are not transcribed).
- Own dev server: tmux `apa-l28`, 127.0.0.1:47463 (checked free). Pilot render (compare + cowos_s / emib_t
  variants): 0 errors; compare 30-32 calls, max 1.10M tris; variant views 8-9 calls, max 1.53M tris (emib_t
  hbm_edge illustrative). Pilot run deleted after the full run.
- 2026-10-21 19:32: full audit render `cache/package3d_renders/2026-10-21_192446/` (132 views, 0 view / load errors):
  compare 6 views (default / front / top x illustrative / in-scale), each variant of the 4 families 14-16 views
  (default, front, top, every inset, both scales). M8: compare max 32 calls / 1.10M tris; single views max 10 calls,
  max 1.53M tris (emib_t class_2026 hbm_edge illustrative); all within <= 11 calls, <= 1.61M tris, compare <= 32.
  Pilot run 2026-10-21_192201 deleted.
- 2026-10-22 00:18 (coordinator: wrap up for commit / push): no-inset check render of the other 19 families (76
  views, 0 errors; run deleted). Own server stopped (tmux apa-l28 killed, 47463 free; apa-app / apa-sim-ui
  untouched). build --check ok (23 families, 4 variants, 912 refs); package3d.json == fresh build except
  `generated`; pnpm check 0/0; engine families tests 76/76 (no drift). Final scores
  `outputs/package3d_scores/2026-10-22_001850.md`: the 23 base families' metric values identical to the baseline (only the checklist element name text "... / uBGA" differs); 4 variant
  rows added. Orbit performance: not measured beyond the per-view CPU frame time in report.json (SwiftShader;
  scratch orbit script not run, wrap-up stop).

## Hand-off

- Done: A5 G2-G4; variant mechanism (generator, format doc, viewer, scorer, renderer, checklist entries); multi-grid
  repeat; variants cowos_s sota_3x, cowos_l tv_4p8x, emib emib_5x_12hbm, emib_t class_2026 (all `default`); A9 D4.
- Audit render set: `cache/package3d_renders/2026-10-21_192446/` (compare_*, `<family>@<variant>_*`).
- Sim lane: no family drift (base templates unchanged; variants are not transcribed). If sims want the SOTA
  configurations, engine/src/families needs variant transcription (apply_variant semantics, TEMPLATE_FORMAT.md).
- A9: D4 done (front section view for emib fine_coarse / emib_t fli_field, base and variants). D8 open (die-die gap
  above the bump layer empty; needs a gap-fill / fillet part with a template height). D9 open (emib_t cavity joints
  as blocks, bridge Si thinner than joints; needs a sourced joint height / f03 proportions). D1-D3, D5-D7, D10, D11
  queued for the follow-up.
- Open: fresh-context audit of the 4 variants (provenance + topology); IPDs of tv_4p8x not drawn; cowos_l 14x and
  EMIB-T 2028 roadmap points not drawn; MI455X-class not drawn (placement not public); variant select labels are
  truncated in the 270 px inspector (full name in the tooltip); package3d.json grew 2.69 -> 4.23 MB (variant arrays
  per die region); orbit timing check on a real GPU.
