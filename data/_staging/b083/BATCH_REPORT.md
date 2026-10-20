# Batch b083 report (2026-10-20)

Papers: 2380-4505-2020.1.000042, 001c.74775, 001c.129513. All distilled. Schema v2.5.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/b083` -> `0 errors, 0 warnings (data/_staging/b083)`.
author_affiliations / organizations / org_sites left header-only (separate pipeline).

## 2380-4505-2020.1.000042 - Chip-Last (RDL-First) FOPLP for Heterogeneous Integration (IMAPS 2020)
- Status: distilled. process_flow_level: full (has_process_flow yes).
- Rows: tv 1, comp 6, layers 13, ic 6, flows 3, steps 49, ei 0, oi 0, metrics 13, figures 21.
- Figures opened: page_01-08 renders; candidates p02_fig1, p03_fig4, p03_fig5a, p03_fig5b, p04_fig6/7/8, p05_fig9/11,
  p06_fig12/13/14/15, p07_fig17/18/19, p08_fig20/21; manual re-crops of every figure below except f12, f13.
- Key figures (fig_id, label, kind, source):
  f01 Fig. 11 cross_section manual; f02 Fig. 2 stack_schematic manual; f03 Fig. 3 stack_schematic manual;
  f04 Fig. 7 cross_section manual; f05 Fig. 5(a) process_flow manual; f06 Fig. 5(b) process_flow manual;
  f07 Fig. 1 stack_schematic manual; f08 Fig. 4 top_view_layout manual; f09 Fig. 6 package_photo manual;
  f10 Fig. 8 micrograph manual; f11 Fig. 10 package_photo manual (no candidate); f12 Fig. 12 package_photo candidate;
  f13 Fig. 13 micrograph candidate; f14 Fig. 14 package_photo manual; f15 Fig. 16 other manual (no candidate);
  f16 Fig. 15 top_view_layout manual; f17 Fig. 20 cross_section manual; f18 Fig. 21 cross_section manual;
  f19 Fig. 9 thermal_plot manual; f20 Fig. 18 reliability_plot manual; f21 Fig. 19 reliability_plot manual.
- Judgment calls:
  - One TV (package incl. PCB assembly); test chips as dummy_die (paper: "test chips").
  - Flows: F1 RDL-substrate on glass panel (ordered, Fig. 5(a), 28 split steps) and F2 wafer bumping (ordered) both
    build_seq 1, notes "parallel"; F3 strip assembly to SMT (full; P&P TC 275 C/2.5 s/10 N and 260 C/1 s/5 N,
    reflow 250 C, UF cure 165 C 2 h, EMC lamination 120 C vacuum 0.68 MPa 30 s / 100 C 0.58 MPa 60 s, plasma 460 s,
    Ti etch 270 s, SMT 245 C). Chip 1 and Chip 2 bonding are two rows (different conditions on one TV).
  - Design targets in stack_layers; Fig. 7 SEM measured line/space/thickness in metrics.
  - Via openings "22-17 um" / "30-25 um": larger value entered as via_diameter, range in notes.
  - Drop-test standard entered as written ("JEDEC ESD22-B111"); result pass per authors (only failure was a
    pre-existing head-in-pillow joint).
  - Fig. 17 (drop tower setup photo) skipped as test equipment, not the build.
- Not reported: chip thickness, die PI layer thicknesses, UF/EMC product names, package thickness, number of drop boards,
  ball-mount equipment name, PVD/ECD/laser-debond conditions.
- Conflicts: reflow peak text 250 C vs Fig. 9 curve about 260 C (text chosen); Chip 2 first plateau 225 C text vs
  ~230 C plot; panel 515x510 vs 510x515 (axis order).
- Source problems: none (text layer clean). Most candidate crops cut at the bottom; manual bboxes used.

## 001c.74775 - Chiplet Integration by Die-to-Die Pillar-Suspended Bridge (IMAPS 2022)
- Status: distilled. process_flow_level: full (1st MUF molding 140 C typed).
- Rows: tv 1, comp 4, layers 7, ic 4, flows 1, steps 13, ei 0, oi 0, metrics 8, figures 10.
- Figures opened: page_01-06; candidates p02_fig4, p03_fig5, p03_fig7, p04_fig8, p04_fig9, p05_fig10, p06_fig11,
  p06_fig12; manual re-crops Fig. 1, Fig. 6, Fig. 10, Fig. 11; Fig. 5 at 600 dpi.
- Key figures: f01 Fig. 8 cross_section candidate; f02 Fig. 1 stack_schematic manual (no candidate);
  f03 Fig. 4 process_flow candidate; f04 Fig. 5 micrograph candidate; f05 Fig. 6 micrograph manual (no candidate);
  f06 Fig. 7 micrograph candidate; f07 Fig. 9 package_photo candidate; f08 Fig. 10 warpage_plot manual;
  f09 Fig. 11 stack_schematic manual (concept, tv_ids empty); f10 Fig. 12 other candidate (concept, tv_ids empty).
- Judgment calls:
  - package_class si_bridge_fanout (Si bridge in mold, no substrate); chiplet component_type unspecified (function not stated).
  - Bridge thickness 20 um (approx, measured cross-section) with 200 um as-bonded on the bonding step / grinding
    thickness_in_um.
  - Interconnect chain as three die_to_bridge rows (chiplet Cu pillar, MicroPillar, bridge Cu pillar) plus Tall Pillar
    (level other, 142 um pad pitch, 100 um height).
  - Warpage: signed text values (+4 um RT convex, -7 um concave at ~260 C) and unsigned Fig. 10 labels (8/8/7/9/5 um)
    both entered; definition of Fig. 10 labels not stated (evidence conflict).
  - Electroless antioxidant metallization step placed after Tall Pillar per text (not drawn in Fig. 4).
- Not reported: chiplet function, Cu pillar/MicroPillar dimensions and metal, counts, TCB and bridge bonding
  conditions, 2nd MUF material/temperature, mold thicknesses, alignment, electrical and reliability data.
- Source problems: Fig. 5 SEM embedded image 284x224 px; dimension labels illegible, no numbers taken. Paper skips
  Fig. 2-3 numbering.

## 001c.129513 - HPC Packaging Platform Including Compression Molding (IMAPS 2024)
- Status: distilled. process_flow_level: full (demonstrator flow F3: IMC 130/110/120 C 10 min, PMC 150 C 60 min).
- Rows: tv 2, comp 10, layers 11, ic 4, flows 3, steps 32, ei 0, oi 0, metrics 39, figures 13.
- Figures opened: page_02-06; candidates p02_fig1, p02_fig2, p03_fig3, p03_fig4, p04_fig5, p05_table2, p05_fig6,
  p05_fig7, p05_fig8, p06_fig9, p06_fig10, p06_fig11; manual re-crops Table 1, Fig. 7, Fig. 9; 400 dpi for Figs. 8-10.
- Key figures: f01 Fig. 1 stack_schematic candidate; f02 Fig. 11 package_photo candidate; f03 Fig. 6 package_photo
  candidate; f04 Fig. 4 stack_schematic candidate; f05 Fig. 2 process_flow candidate; f06 Fig. 3 process_flow
  candidate; f07 Fig. 5 process_flow candidate; f08 Table 1 data_table manual (no candidate); f09 Fig. 8 warpage_plot
  candidate; f10 Fig. 10 warpage_plot candidate; f11 Fig. 7 warpage_plot manual; f12 Table 2 data_table candidate;
  f13 Fig. 9 other manual.
- Judgment calls:
  - TV a = functional HPC module design (stencil chip + HBM on Si interposer, 25x15 mm, RDL design rules of Fig. 4);
    TV b = mechanical demonstrator wafers (dummy Si chips with die attach on Si wafers). EMC and overmold thickness are
    splits (metrics.variant, stack_layers feature rows), not TVs.
  - F1 generic_platform (tv a): shared RDL processing + routes thinned_first (Fig. 2) / unthinned_first (Fig. 3);
    F2 generic_platform shared tail (balling, dicing, board assembly; UF and lid/TIM as generic_description).
    F3 tv_build (tv b) with routes thinned_interposer / unthinned_interposer; IMC temperatures in split,
    temp_c_max 130. Thinned route first step "apply thinned wafer on glass substrate" is inferred_order.
  - Warpage bar heights (Fig. 8: 18, Fig. 10: 12) and Fig. 9 moisture values read off 400 dpi renders, value:approx.
  - Fig. 4 design-rule bounds as le/ge qualifiers; bracketed next-release values in notes only.
  - Typical BGA 300 um / 500 um and 50 um microbump pitch are cited values: excluded.
- Not reported: chip x/y, microbump pitch, interposer x/y, TSV depth, demonstrator wafer diameter, dummy chip
  size/count, die attach material, mold pressure, balling/dicing conditions.
- Source problems: none.

## Audit findings
None yet in this batch (pre-merge fresh-context audit is run by the orchestrator).

## Schema gaps
- No field for a step's per-chip conditions on one TV (Lau 2020: Chip 1 vs Chip 2 P&P profiles): used two step rows.
- Unsigned vs signed warpage values (PSB Fig. 10 labels) have no dedicated column; handled via scope/notes.
- Moisture sorption properties of EMC have no metric_category; used other.

## Audit findings and fixes (2026-10-20, ingest_audit_A)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| 2380-4505-2020.1.000042 | a-m14 (new) | content_missing | Fig. 14 mounted-ball width 212.4 um not extracted | fixed | Added a-m14 geometry "mounted solder ball width" 212.4 um, single, measured, figure_image, p.6 Fig. 14 (label (b) verified on page_06). Conflict logged for i6 diameter_um [200, 212.4], chosen 200 (design ball size vs measured mounted profile width). |
| 2380-4505-2020.1.000042 | F1-s01; F3-s12 | structure | Carrier size in target; "four pulses" not in conditions | fixed | F1-s01 target cleared, notes = "carrier 515 x 510 mm"; F3-s12 conditions = "4 pulses" (p.6 Sec. III.F). |
| 2380-4505-2020.1.000042 | f12; f13 | figure | Candidate bboxes clip the bottom of Fig. 12 close-up and Fig. 13 second row | fixed | f12 bbox 0.1332,0.0859,0.4139,0.340, f13 bbox 0.1245,0.6858,0.4226,0.868; both manual, cand_id cleared; re-crops opened and complete. No re-rank. |

Revisions recorded in evidence/2380-4505-2020.1.000042.yaml. Validator: `0 errors, 0 warnings (data/_staging/b083)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| 001c.129513-f07 | 4 | 0.0699,0.3341,0.4333,0.512 | 0.0699,0.3341,0.4333,0.5158 |
