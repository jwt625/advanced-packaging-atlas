---
title: Round 1 audit A9 - fresh-context M7 visual audit of lane L18's final render set
date: 2026-10-21
auditor: A9 (fresh-context Claude subagent, DevLog-013)
scope: cache/package3d_renders/2026-10-21_183519/ (23 families, 286 views; in-scale and illustrative); priority emib_t, samsung_i_cube_e, ucla_si_if, cpo_module; inset framing; regression pass over all 23 families
method: renders read as images (crops / contact sheets built in the session scratchpad, deleted after); source figures from references/<paper_id>/figures/key; Si-IF figures re-rendered from source.pdf at 600 dpi (uv + pymupdf, scratch, deleted); L18's own M7 table read only after scoring; no repo edits except this file; no dev server started
---

# Audit A9: M7 visual fidelity, L18 final renders

## Verdict

- All 23 families meet the M7 target (mean >= 2.0) on the 183519 renders. emib_t (V1 1.86) is now 2.43.
- Si-IF pillar: **L18 is right, V2 was wrong.** The Si-IF Cu pillar is a trapezoid **wider at the bond tip and
  narrower at its base on the Si-IF wiring**, in both cited figures (evidence below). The render draws it that way.
- One new misleading artefact found: info_os conformal RDL via cups render with a **black core** (reads as voids).
- Illustrative insets now frame the same lateral region as in-scale (identical scale bar in all 23 x ~5 pairs);
  insets thinner than ~10 um (soic / foveros_direct `hb_interface`, ucla_si_if `joint`) are still unreadable in
  illustrative (z-stretched barcode).

Scoring rubric as V1 / V2: 0 absent / wrong, 1 present but misleading, 2 recognizable with notable deviations,
3 matches the figure's structure. Items (a) layer order, (b) relative thickness, (c) via shape / stacking,
(d) routing levels / trace density, (e) pads / bumps / joints / openings, (f) D2D path, (g) through-vias. Scores are
for the in-scale renders; N/A excluded from the mean.

## 1. Priority families (detailed)

### emib_t: 2.43 (V1 1.86)

Figures: ectc51846.2026.00051-f03 (schematic: two stacked tapered vias per FLI over the bridge, TSV groups on
backside pads over cavity bumps), -f01 (d) (SEM: discrete pads, one via per FLI). Renders:
`emib_t_inset_bridge_xs_{inscale,illustrative}.png`, `emib_t_inset_bridge_edge_*`, `emib_t_inset_buildup_xs_inscale.png`,
`emib_t_inset_fli_field_inscale.png`, `emib_t_default_inscale.png`, `emib_t_front_inscale.png`.

| a | b | c | d | e | f | g |
|---|---|---|---|---|---|---|
| 3 | 2 | 3 | 2 | 2 | 2 | 3 |

- (c) Per-region levels work: over the bridge L1 / L2 are discrete pads, one tapered via per 25 um FLI in each
  level, stacked onto the bridge pads (as f03 / f01 d); outside the bridge the 14/20 um traces resume at the bridge
  edge. No solid Cu bar over the bridge.
- (g) 2 x 2 TSV groups (2 per group in the cut) on a backside pad over each cavity bump; plugged PTH below.
- (b) bridge Si drawn ~25 um of the 50 um bridge (BEOL + pads ~20 um) against ~45 um cavity joints; in f03 the
  bridge Si is the dominant thickness. Template values (bridge 50 um general statement, 10 x 2 um levels).
- (e) cavity joints are rectangular solder blocks; f03 shows barrel bumps between pads. FLI single material.
- (f) bridge BEOL legible only as a striped band at 100 um; D2D wires read in illustrative.
- V1 dark wedge at the bridge ends (A3): gone in both scales.

### samsung_i_cube_e: 2.29 (V2 2.14)

Figures: ectc51687.2025.00048-f02 (SEM: pillar + solder on RDL pad, one RDL level, via narrowing downward onto a wider
Cu post), -f03 (structure schematic). Renders: `samsung_i_cube_e_inset_interposer_stack_{inscale,illustrative}.png`,
`_inset_bridge_edge_inscale.png`, `_inset_ll_bridge_inscale.png`.

| a | b | c | d | e | f | g |
|---|---|---|---|---|---|---|
| 3 | 2 | 3 | 2 | 2 | 2 | 2 |

- (c) Front RDL is now one pad level with a small via narrowing downward onto each post, post much wider than the
  via: matches f02.
- (e) / (g) Logic bumps and C4 are composite (Cu + solder). The Cu posts are not on the cut: they render dull brown
  between opaque-looking dark mold blocks, alternating with dark blocks in the bump rows (rows behind the cut seen
  through x-rayed mold / underfill). Reads as ghosted, as V2 #2.
- (b) post / bridge heights are analog, no figure gives them.

### ucla_si_if: 2.50 (V2 2.00)

Figures: iedm45741.2023.10413759-f01 (= paper Fig. 8, p.3; panels c, d), ectc51846.2026.00062-f02 (= paper Fig. 8,
p.4; panel b right). Renders: `ucla_si_if_inset_joint_{inscale,illustrative}.png`, `_inset_gap_*`,
`_inset_edge_inscale.png`.

| a | b | c | d | e | f | g |
|---|---|---|---|---|---|---|
| 3 | 3 | 3 | 2 | 3 | 1 | N/A |

- (a) / (e) dielet Cu pad in oxide, 0.5 um recess gap beside the pillar tips only (dark band over the oxide, none
  over the pillars), IF pillar in recessed SiO2, wide IF M2 pad, dielectric, M1, Si: matches f01 (b) / (c). V2 #1
  (no dielet pad) is fixed.
- (b) in-scale reads ~2.1 um pad, ~2.9 um pillar (5 um bar = 95 px): matches the f01 (c) labels 2 / 3 / 2 um.
- (c) trapezoid wider at the tip: matches both figures (section 3). Small grey wedges beside the narrow end of each
  frustum (the artefact L18 noted) are visible but low contrast.
- (f) 1: the 350 um links across the 59 um gap are not visible in-scale (`gap` 100 um bar: the 2 wiring levels are a
  ~6 px band); illustrative shows a single Cu block under the gap on M2 and M1, which reads as a vertical pad stack,
  not a lateral link (V2 #3 unresolved).
- Illustrative `joint` is unreadable: the 0.5 um recess / oxide stretched into a full-height dark-brown band with
  straight Cu columns; the trapezoid is lost.

### cpo_module: 2.43 (V1 2.29)

Figures: ectc.2016.201-f01 (EMIB build-up analog: tapered stacked microvias, fine vias onto the bridge),
ectc51687.2025.00012-f01 (CPO package schematic: XPU + OIO over EMIB, fiber at the OIO overhang). Renders:
`cpo_module_inset_bridge_xs_inscale.png`, `_inset_bridge_gap_inscale.png`, `_inset_bridge_d2d_inscale.png`,
`_inset_buildup_xs_inscale.png`, `_inset_oio_edge_inscale.png`, `_default_inscale.png`.

| a | b | c | d | e | f | g |
|---|---|---|---|---|---|---|
| 3 | 2 | 3 | 2 | 2 | 2 | 3 |

- (c) top-side microvias taper down, bottom-side inverted, fine vias tapered onto bridge pads in two stacked levels
  (f01 a). (g) plugged PTH; BGA balls now sectioned in `buildup_xs`.
- V1 #1 fixed: no callout anchored on unrelated geometry in the views checked (`buildup_xs` shows only build-up / PTH
  / BGA callouts; variant text moved into the FAU note).
- Remaining: die-die gap renders black (no fill above the bump layer) in `bridge_d2d` / `bridge_gap`; optics only as
  the FAU block (labelled "Optics not modeled").

## 2. Inset framing (illustrative vs in-scale)

Checked on fcbga_organic, cowos_s, cowos_r (`rdl`), info_os, emib, emib_t, samsung_i_cube_e, ucla_si_if, soic,
foveros_direct, fan_out_panel, hybrid_bond_w2w: every illustrative inset carries the same scale bar and lateral
extent as its in-scale twin (V1 A9 / V2 A3 framing part fixed; cowos_r `rdl` now 20 um in both).
Not fixed: illustrative readability of very thin insets (`soic_inset_hb_interface_illustrative.png`,
`foveros_direct_inset_hb_interface_illustrative.png`, `ucla_si_if_inset_joint_illustrative.png`: barcode of
stretched columns), and bridge / cavity insets where the x-rayed cavity fill hides individual joints
(`emib_t_inset_bridge_edge_illustrative.png`).

## 3. Si-IF pillar verdict (evidence)

Page renders at 600 dpi of the two cited figures, cropped to the `data/figures.csv` bboxes:

- ectc51846.2026.00062 p.4 Fig. 8 (b) right (FIB, 5.00 um scale ticks ~68 px/um): the lower (Si-IF) pillar is
  ~303 px wide at the dotted "Bonding Interface" line and ~245 px where it meets the Si-IF wiring line below,
  i.e. ~4.45 um -> ~3.6 um, ratio 0.81. The die-side block above also widens toward the bond (~412 px at its top,
  ~492 px at the interface).
- iedm45741.2023.10413759 p.3 Fig. 8 (d) (1 um bar): the "GaN/Si-IF Pillar" below the bonding interface has sidewalls
  sloping inward going down (wide at the interface, narrow at the base in the 500 nm recessed SiO2). Fig. 8 (c) is
  consistent (2 um pad / 3 um pillar / 2 um pad column).
- Conclusion: wider at the bond tip, narrower at the base. V2 fix #2 ("wider at the base") was wrong; L18's
  `pil_bot_d_um = pil_d x 80 / 98` (template, ratio 0.82) matches my independent read (0.81).
- Minor deviation: the dielet-side pad is drawn as a rectangle; in 00062 Fig. 8 (b) it also flares toward the bond.

## 4. All 23 families: M7 (A9) vs L18

L18 scored only the four priority families. Non-priority scores are a quick pass (contact sheets of every view plus
zooms where something looked off), anchored to V1 / V2 items and changed only where the render visibly changed.

| family | A9 a b c d e f g | A9 mean | L18 | V1 / V2 | note |
|---|---|---|---|---|---|
| emib_t | 3 2 3 2 2 2 3 | 2.43 | 2.43 | 1.86 | agree item by item |
| samsung_i_cube_e | 3 2 3 2 2 2 2 | 2.29 | 2.29 | 2.14 | agree item by item |
| ucla_si_if | 3 3 3 2 3 1 - | 2.50 | 2.33 | 2.00 | disagree (a), (e), (f) |
| cpo_module | 3 2 3 2 2 2 3 | 2.43 | 2.29 | 2.29 | disagree (c) |
| fcbga_organic | 3 2 3 2 3 - 3 | 2.67 | - | 2.50 | composite C4 on SR opening; BGA sectioned |
| cowos_s | 3 3 2 2 3 2 3 | 2.57 | - | 2.43 | composite ubump / C4; SoC-HBM gap filled; TSV over C4 |
| cowos_r | 3 3 2 2 3 2 3 | 2.57 | - | 2.29 | `rdl` now cuts stacked vias under ubumps; lower levels show no via to the C4 |
| info_os | 3 3 1 2 2 2 3 | 2.29 | - | 2.43 | regression: conformal cups drawn with black core (D1) |
| samsung_mios | 3 3 2 2 2 2 2 | 2.29 | - | 2.29 | TSV 100 um vs pillar ~200 um unchanged |
| emib | 3 2 3 2 2 2 3 | 2.43 | - | 2.29 | taper harmonized; `fine_coarse` oblique (D4) |
| glass_core_substrate | 3 3 2 2 2 2 2 | 2.29 | - | 2.14 | fine vias over the bridge now visible |
| fan_out_panel | 3 3 2 2 3 2 - | 2.50 | - | 2.33 | composite pillars; DL12 / DL23 vias still not cut; PID / Cu hue clash |
| ibm_dbhi | 3 3 2 2 2 2 3 | 2.43 | - | 2.43 | laminate via taper 40 -> ~20 um reads fine |
| cowos_l | 3 3 2 2 2 2 2 | 2.29 | - | 2.29 | TIVs alternate brown / dark (off-cut, x-ray) |
| ase_focos_bridge | 3 3 3 2 2 2 2 | 2.43 | - | 2.29 | bridge insets now 50 um wide; T-profile RDL vias |
| amkor_s_connect | 3 2 3 2 2 2 2 | 2.29 | - | 2.14 | tapered RDL vias; `lsi_gap` still a solid dark block |
| soic | 3 2 3 2 3 3 2 | 2.57 | - | 2.57 | unchanged |
| hbm_stack | 3 3 2 2 3 3 2 | 2.57 | - | 2.43 | composite micro-bumps |
| samsung_x_cube | 3 3 2 2 3 3 3 | 2.71 | - | 2.57 | composite pillar / ubump |
| foveros | 3 2 2 2 2 3 3 | 2.43 | - | 2.14 | TSV pairs at 15 um per bump |
| foveros_direct | 3 2 2 2 2 2 3 | 2.29 | - | 2.14 | TSV pairs; `top_gap` = `tsv_column` view (D7) |
| hybrid_bond_d2w | 3 3 3 2 2 3 3 | 2.71 | - | 2.71 | unchanged |
| hybrid_bond_w2w | 3 3 2 2 3 3 3 | 2.71 | - | 2.29 | HBV stems now visible between pad and MZ |

Disagreements with L18
- ucla_si_if (a) 3 vs 2: with the dielet pad and the recess gap in place, the layer order matches f01 (b) / (c)
  exactly; I see no remaining order deviation. (e) 3 vs 2: pad / pillar / pad, oxide, gap all present at the right
  proportions. (f) 1 vs 2: the gap links are not lateral in any render (in-scale invisible, illustrative a vertical
  block); "present but misleading". Net +0.17.
- cpo_module (c) 3 vs 2: microvia taper, stacking and the two-level fine vias onto bridge pads now match
  ectc.2016.201-f01 (a) structurally; L18 left it at the V1 value. Net +0.14.

## 5. Defects

| id | sev | family / view | defect | fix suggestion | owner |
|---|---|---|---|---|---|
| D1 | major | info_os `d2d`, `rdl_xs`, `info_edge` (in-scale, illustrative) | conformal RDL via cups drawn with a black interior; reads as voids in every via (zoom of `info_os_inset_d2d_inscale.png`) | viewer: fill the cup interior with the next dielectric (the template note says the next dielectric fills the cup), or the via's `through` layer material | viewer (routing.ts; L18 successor) |
| D2 | minor | ucla_si_if `gap` (both) | 350 um lateral links not drawn as lines across the gap; illustrative shows one block under the gap | viewer: draw the lateral D2D net as continuous segments across the gap band on if_m2 / if_m1 at in-scale LOD | viewer + ucla_si_if template |
| D3 | minor | ucla_si_if `joint` illustrative; soic, foveros_direct `hb_interface` illustrative | thin insets unreadable in illustrative (barcode) | viewer: for inset z range < ~10 um use in-scale z (illustrative = in-scale) | viewer |
| D4 | minor | emib `fine_coarse`, emib_t `fli_field` (both scales) | oblique perspective camera instead of a section view; transition not legible; callouts crowd one corner (emib_t default also clusters 8 labels at one point) | template: front / section camera for these insets (L28 is editing these templates; apply after) | emib / emib_t template (L28) |
| D5 | minor | samsung_i_cube_e `interposer_stack`, `ll_bridge`; cowos_l `ri_stack`; ase_focos_bridge `module_stack`; amkor_s_connect `module_stack` | Cu posts / TIVs / tall pillars off the cut render as dull brown blocks alternating with dark mold blocks (ghosted) | viewer: phase-snap the inset cut onto the TMV / post row (as for bump arrays) or draw off-cut posts only when x-ray is off | viewer + bridge-in-mold templates |
| D6 | minor | ucla_si_if `joint` in-scale; any tapered filled opening | small grey wedges beside the narrow end of the frustum (square matrix hole vs round frustum) | viewer: cut the matrix hole with the same frustum profile, or cap the hole with the matrix colour | viewer |
| D7 | cosmetic | foveros_direct `top_gap` vs `tsv_column` | the two insets render the same region | template: recentre `top_gap` on the top-die gap only | foveros_direct template |
| D8 | minor | emib_t, cpo_module, emib `bridge_*` | die-die gap above the bump layer renders black (empty); underfill stops at the bump layer | template: underfill fillet into the gap, or a mold / underfill gap part | emib_t / cpo / emib templates (L28 for emib*) |
| D9 | minor | emib_t `bridge_xs` | cavity joints drawn as rectangular solder blocks; bridge Si thinner than the joints | template: joint height / bridge Si per f03 proportions when a source exists; else keep with note | emib_t template (L28) |
| D10 | cosmetic | samsung_i_cube_e `ll_bridge` | callout "Cu posts link both RDLs" anchored with no post in view | viewer: hide callouts whose target has no geometry in the inset box | viewer |
| D11 | cosmetic | fan_out_panel all | PID polymer vs Cu hue clash (V1 A8) persists | viewer palette | viewer |

No solid Cu bars, z-fighting or V1-type dark wedges seen in the 23-family pass. Microvia shapes checked by zoom in
fcbga_organic (top side narrowing down, bottom side inverted), emib, emib_t, cpo_module, cowos_s, ibm_dbhi,
samsung_x_cube: all correct orientation; glass TGVs taper top-wide as drawn.

## 6. Method notes

- Views read: all 286 PNGs via per-family contact sheets (in-scale | illustrative per view), full-resolution reads
  of 20 views and pixel-scaled crops of 12 regions. Crops, contact sheets and page renders lived in a session
  scratchpad folder and were deleted after the audit.
- Not checked: interactive behaviour, the live app (L28 is editing cowos_s / cowos_l / emib / emib_t), M8 budget
  numbers beyond `report.json` header, per-level L/S by measurement.
