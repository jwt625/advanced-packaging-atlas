# BATCH_REPORT b085 (2026-10-20)

Papers: 001c.74577, ectc51909.2023.00240, 001c.74770. Schema v2.5. All three distilled.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/b085` -> `0 errors, 0 warnings (data/_staging/b085)`.
author_affiliations, organizations, org_sites left header-only.

## 001c.74577 - Fabrication of Panel-Level Glass Substrates with Complete Design Freedom using LIDE (IMAPS 2022)
- Status: distilled. process_flow_level: ordered (has_process_flow yes).
- Rows: tv 6, comp 0, layers 6, ic 4, flows 1, steps 2, ei 0, oi 0, metrics 28, figures 7.
- Figures opened: page_02-06.png; cand p03_fig2, p03_fig3, p04_fig4, p05_fig5, p05_fig6, p05_fig7; re-crops p05 (Fig. 7, 400 dpi), p06 (Table II), p03 (Table I).
- Key figures:
  - f01 Fig. 5, cross_section, candidate p05_fig5
  - f02 Fig. 2, process_flow, candidate p03_fig2
  - f03 Fig. 7, cross_section, candidate p05_fig7
  - f04 Fig. 6, cross_section, candidate p05_fig6
  - f05 Fig. 3, micrograph, candidate p03_fig3
  - f06 Fig. 4, micrograph, candidate p04_fig4
  - f07 Table II, data_table, manual (no candidate detected)
- Judgment calls:
  - Capability overview paper. Demo samples are TVs a-e (test_coupon, one per structure shown: dense TGV array, microstructures, hourglass TGV, V-shape TGV, blind vias). The Table II capability claims hang off TV f (tv_kind other) with basis unspecified.
  - One tv_build flow (Fig. 2: laser modification, then wet etch), level ordered because no typed condition is given. Captions say the samples were "fabricated by LIDE", so tv_ids a-f.
  - AR labels printed on the micrographs went to metrics as basis unspecified. The Fig. 7 blind-via depths are measurement annotations, so measured.
  - Skipped Fig. 1 (fracture strength plot reprinted from ref [18]) and Table I (generic glass and Si properties): background, not this paper's build.
- Not reported: glass type and thickness per sample, laser and etch parameters, etchant, metallization, reliability, electrical data.
- Source problems: none. Small issues: one missing figure number in the text on p.2, Cp vs Cpk conflict, and "2 um (pitch << diameter)" printed as is.

## ectc51909.2023.00240 - Critical Dimension Scatterometry ... HB Pad Recess Metrology (ECTC 2023)
- Status: distilled. process_flow_level: fragments (has_process_flow no).
- Rows: tv 2, comp 0, layers 2, ic 2, flows 1, steps 1, ei 0, oi 0, metrics 83, figures 17.
- Figures opened: page_01-07.png; all 17 candidate crops; 400 dpi re-crops of Fig. 6(a) and Fig. 13(a) (r values).
- Key figures (all candidate):
  - f01 Figure 9, micrograph
  - f02 Figure 11, stack_schematic
  - f03 Figure 1, stack_schematic
  - f04 Figure 3, other (reprinted yes, ref [7])
  - f05 Figure 2, micrograph
  - f06 Figure 4, top_view_layout
  - f07 Figure 10, top_view_layout
  - f08 Figure 5, block_diagram
  - f09 Table I, data_table
  - f10 Table II, data_table
  - f11 Figure 6, other
  - f12 Figure 13, other
  - f13 Figure 12, other
  - f14 Figure 7, other
  - f15 Figure 14, other
  - f16 Figure 8, other
  - f17 Figure 15, other
- Judgment calls:
  - Metrology only. TVs are the 9 um and 3 um pitch CMP-skew wafer sets (wafer_level, hybrid_bonded_3d, pre-bond).
  - Pad metal is never named, so ic_type and level are unspecified.
  - The only process statement is the CMP skews, so one fragments step with generic_description.
  - Table I/II recess entered as mean/min/max per wafer.
  - Dynamic precision taken per wafer from the bar labels in Figs. 8 and 15.
  - Fig. 15 shows wafers B, D, C but the text says A, D, C; figure chosen.
  - Fig. 2 AFM vs WLI example not entered: the pitch is not stated.
  - The plotted metrology figures have no fitting figure_kind, so kind other is used.
- Not reported: pad and dielectric materials, pad size, wafer diameter, CMP conditions, bonding.
- Source problems: Eq. (1) text layer garbled (read from the render). Both panels of Fig. 14 are labelled "AFM Pad Recess".

## 001c.74770 - Pre-applied underfill Technique for Fine-pitch Cu Pillar 3D Die Stacking (IMAPS 2022)
- Status: distilled. process_flow_level: full (has_process_flow yes).
- Rows: tv 2, comp 5, layers 13, ic 3, flows 1, steps 6, ei 0, oi 0, metrics 19, figures 14.
- Figures opened: page_03-06.png; cand p03_table1, p04_fig1, p04_fig2, p04_fig3, p04_fig4, p05_table2, p05_fig6, p05_fig7, p05_fig8, p06_fig9, p06_fig11, p06_fig12; manual re-crops for Table 1, Table 2, Fig. 3, Fig. 5, Fig. 8, Fig. 10.
- Key figures:
  - f01 Figure 8, cross_section, manual (adds SEM data bar)
  - f02 Figure 1, process_flow, candidate p04_fig1
  - f03 Figure 12, cross_section, candidate
  - f04 Figure 11, cross_section, candidate
  - f05 Figure 9, cross_section, candidate
  - f06 Figure 10, xray_csam, manual (no candidate)
  - f07 Figure 2, cross_section, candidate
  - f08 Figure 3, cross_section, manual
  - f09 Figure 4, cross_section, candidate
  - f10 Figure 7, package_photo, candidate
  - f11 Figure 6, package_photo, candidate
  - f12 Table 1, data_table, manual (candidate cut the last row)
  - f13 Figure 5, other, manual (no candidate)
  - f14 Table 2, data_table, manual (candidate cut the header)
- Judgment calls:
  - TV a: 3-die daisy-chain stack. TV b: capillary-underfill reference from Table 2 (tv_kind other, its build is not described; listed in not_reported).
  - One flow from Fig. 1: two levels, each dispense, align, TCB.
  - s03 temp_c 170 (approx, text). temp_c_max 260 read off the Fig. 5 sample set profile (approx, override figure_image).
  - The dispense pattern variants are a split on s01.
  - CSAM, thermal cycling and cross-sections are metrics.
  - Process-development defects (Figs. 2-4) are metrics with value_text.
  - Table 1 pad 48 um chosen over the text value of 60x60 um.
- Not reported: bonding force, time, atmosphere; die-shear and X-ray data; NCP product; electrical continuity; TC sample count.
- Source problems: none in the text layer. The paper has internal inconsistencies:
  - "lead-tin (SnAg)" as printed.
  - "CSEM" read as CSAM.
  - Figs. 11 and 12 captions both say condition 1, while the text says both conditions.

## Validator output
`0 errors, 0 warnings (data/_staging/b085)`

## Schema gaps
- No figure_kind for metrology/correlation plots or process (bonding) profiles. Used `other`.
- No interconnect_type/level for a pre-bond hybrid bonding pad array of unnamed metal. Used `unspecified`.
- Capability-claim tables (vendor technology specs) have no TV kind. Used tv_kind other with basis unspecified.
- interconnects.aspect_ratio has no min/max columns. Discrete aspect ratios went to metrics.

## Audit findings and fixes (2026-10-20, ingest_audit_B)

| paper | row | severity | finding | outcome | change or reason |
|---|---|---|---|---|---|
| ectc51909.2023.00240 | ectc51909.2023.00240-f05 | minor | `shows` quoted ~20 nm AFM vs ~40 nm WLI recess, values from body text, not the figure or caption | fixed | `shows` = "AFM vs WLI 3D images and line profiles of the same HB pad region; WLI profile shows larger apparent recess". Verified: Fig. 2 caption has no numbers, ~40/~20 nm are in the p.2 body text, and re-cropped profiles read about 23 nm (AFM) and 34 nm (WLI) peak-to-valley. Revision logged in evidence. |

Final validator: `0 errors, 0 warnings (data/_staging/b085)`

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| ectc51909.2023.00240-f16 | 5 | 0.0868,0.3729,0.4914,0.5608 | 0.0868,0.3729,0.4914,0.5618 |
| 001c.74770-f03 | 6 | 0.5214,0.0859,0.9683,0.2372 | 0.5214,0.0859,0.9683,0.24 |
| 001c.74770-f04 | 6 | 0.08,0.7036,0.4844,0.8727 | 0.08,0.7036,0.4844,0.877 |
| 001c.74770-f05 | 6 | 0.0699,0.0859,0.5065,0.1346 | 0.0699,0.0859,0.5065,0.1491 |
| 001c.74770-f07 | 4 | 0.1359,0.5299,0.4147,0.6558 | 0.1359,0.5299,0.4147,0.6703 |
| 001c.74770-f09 | 4 | 0.6549,0.4598,0.8141,0.6537 | 0.6549,0.4598,0.8141,0.6679 |
| 001c.74770-f10 | 5 | 0.6231,0.0859,0.8297,0.2048 | 0.6231,0.0859,0.8297,0.2194 |
| 001c.74770-f11 | 5 | 0.1318,0.6765,0.4152,0.8194 | 0.1318,0.6765,0.4152,0.8333 |
