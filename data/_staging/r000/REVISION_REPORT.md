# Revision report r000 (2026-10-19)

Mode: audit_fix_and_figures. Audits searched: audit_x1_2026-10-18, audit_x2A_2026-10-19, audit_x2B_2026-10-19
(full paper id and short id). x2A names none of the five papers. Every change is logged in the paper's
evidence YAML under `revisions:` (source audit_x1 / sibling_dup / figures).

Validator: `uv run python scripts/validate_db.py --staging data/_staging/r000` -> 0 errors, 0 warnings.

Rank order rule applied literally (SKILL.md step 5): rank 1 = best build view (cross-section image > stack schematic >
package photo), then process flow, layout/floorplan, other schematics/images, then plots/tables. Existing rows keep
their bbox (no audit names a bbox defect in this batch).

## ectc.2011.5898527

Audit items
- x1 item 13 (warpage kept in mil, 6 rows): applied. Rule (e) exact conversion mil -> um (x25.4), value as printed kept in
  notes, formula in evidence `derived`.
  - a-m8 8 mil -> 203.2 um (qualifier value:lt kept)
  - b-m1 -2.39 -> -60.706 um
  - b-m2 13.2 -> 335.28 um
  - b-m3 6.4 -> 162.56 um
  - b-m5 8.1 -> 205.74 um
  - b-m7 4.45 -> 113.03 um
  - Row ids unchanged.
- x1 item 14 (numeric process condition with basis stated): applied to a-s16 (150 C underfill cure). Before: basis stated
  with override temp_c:design_target. After: basis design_target, override cleared. p.2 states "stress-free at
  underfill cure temperature of 150C".
- Process flow: no other process-flow defect named.

Sibling groups: none listed.

Figures (6 -> 12)
- Added:
  - Fig. 1(c) cross_section, manual. Ubump SEM on p.2; f01 notes updated to say (c) is now a separate row.
  - Fig. 8 xray_csam, manual. C-SAM; candidate p05_fig8 cut the panel labels.
  - Fig. 5 simulation_result, candidate p04_fig5a. FEM local-model geometry of ubump/C4.
  - Fig. 4 warpage_plot, candidate p03_fig4. Shadow Moire.
  - Table 4 data_table, manual. Solder fatigue values for b-m11..m16.
  - Table 2 data_table, manual. Material properties used in stack_layers.properties.
- Not added: Fig. 3, 6 and 7. These are FE contour images whose values are already in Tables 3 and 4.
- Rank:
  1. Fig. 1(a),(b)
  2. Fig. 1(c)
  3. Fig. 2
  4. Fig. 9
  5. Fig. 8
  6. Fig. 5
  7. Table 1
  8. Table 3
  9. Fig. 4
  10. Table 4
  11. Table 5
  12. Table 2

## ectc.2019.00-29

Audit items
- x1 item 1 (text-layer recheck replaced clean text.md with OCR; p.4 named): not applicable to rows. This is a pipeline
  and references/ issue, outside this batch's write scope. The audit states that the merged data predate the overwrite.
  The current text.md is the pymupdf layer, and no TEXT_LAYER_WARNING exists.
- No row changes.

Sibling groups: none listed.

Figures (6 -> 26). The paper has many build images and layouts; all were kept per the 2026-10-19 rule.
- Added, all candidates except Fig. 4:
  - Fig. 20 process_flow
  - Layouts (top_view_layout): Fig. 2, Fig. 3 (p.2, mask set), Fig. 3 (p.3, daisy-chain/meander layouts; source
    numbers it twice, noted), Fig. 10, Fig. 14
  - Fig. 24 cross_section (with an X-ray panel)
  - Fig. 19 cross_section (3D optical profile plus optical cross-section)
  - Fig. 4 stack_schematic, manual. Candidate p03_fig4 included a section heading.
  - Package photos: Fig. 23, Fig. 21, Fig. 18
  - Micrographs: Fig. 5, Fig. 16, Fig. 8
  - Plots carrying metrics (kind other): Fig. 11 (b-m4), Fig. 15 (c-m9), Fig. 9 (b-m1/m2), Fig. 7 (a-m3/m4),
    Fig. 13 (c-m1)
- Rank:
  1. Fig. 22
  2. Fig. 6
  3. Fig. 20
  4. Fig. 2
  5. Fig. 3 (p.2)
  6. Fig. 3 (p.3)
  7. Fig. 10
  8. Fig. 14
  9. Fig. 1
  10. Fig. 24
  11. Fig. 19
  12. Fig. 4
  13. Fig. 23
  14. Fig. 21
  15. Fig. 12
  16. Fig. 17
  17. Fig. 5
  18. Fig. 18
  19. Fig. 16
  20. Fig. 8
  21. Table 1
  22. Fig. 11
  23. Fig. 15
  24. Fig. 9
  25. Fig. 7
  26. Fig. 13

## ectc.2019.00095

Audit items
- x1 item 1 (text layer, p.2): not applicable to rows (pipeline).
- x1 item 12 (tv_kind other overloaded; -f is a reference architecture): partially applied. The proposed
  tv_kind design_concept needs a schema change. Interim: tv_kind other is kept, and -f notes now end
  "Reference architecture, not built (design_concept enum pending)."

Sibling groups: none listed.

Figures (6 -> 12)
- Added, all candidates:
  - Fig. 1 block_diagram (partition concept; paper-level)
  - Fig. 7 other (normalized pitch/density bars; a-m1/m2)
  - Fig. 5 other (density vs pitch; a-i1 and e-i1 density_per_mm2)
  - Fig. 10 electrical_plot (a-m3..m5)
  - Fig. 11 thermal_plot (a-m8/m9)
  - Fig. 8 electrical_plot (a-m15)
- Not added: Fig. 12-15 (TSV/TDV/SoIC-bond EM, SM, Vbd, PCT/HTS/TCC/uHAST). These distributions have no axis values;
  the pass results and durations are in the text and Table 1.
- Rank:
  1. Fig. 4
  2. Fig. 2
  3. Fig. 3
  4. Fig. 1
  5. Table 1
  6. Fig. 6
  7. Fig. 7
  8. Fig. 5
  9. Fig. 10
  10. Fig. 11
  11. Fig. 9
  12. Fig. 8

## ectc32696.2021.00033

Audit items
- x1 item 8 (column semantics): applied. The cells held the heat-spreader foot width from Table VI (p.5); the value
  moved to notes.
  - a-c5: x_mm/y_mm 12/12 -> empty; notes "HS foot width 12x12 mm (Table VI)...".
  - e-c1: x_mm/y_mm 10/10 -> empty; notes "HS foot width 10x10 mm (Table VI)...".
  - c-c1 and d-c1 already held the foot width in notes only.
- x1 item 1 (OCR text.md lost Table I values): not applicable to rows. Table I was re-checked against the p.3 render
  and all 12 normalized values match the rows (c-m1..m4, d-m1..m4, a-m3..m6).
- x1 section 5/6 (substrate_area_mm2, foot width, warpage sign, normalized-reference fields): these are schema
  proposals. The interim state is already in place: substrate areas in TV/component notes, sign convention in
  metrics.scope, reference_tv_id set. No change.
- x1 section 8 (conflicts 95% vs >95%, 45% vs Table V): verified OK by the audit; no change.

Sibling group d-m5 / a-m18 (both 1.12, normalized C4 fatigue risk): kept, no change. Table VI (p.5) prints 1.12X
separately in the TV-2 column and in the 2.5x TV ring-HS column (5 RDL, lower-CTE core). The text says the ring
case "is equal to qualified TV-2 level". These are genuine per-TV values, not a copy.

Figures (6 -> 15)
- Added, candidates except Table II:
  - Fig. 5 top_view_layout
  - Fig. 7 xray_csam
  - Table III stack_schematic (via cross-section drawings)
  - Fig. 9 stack_schematic (PDN plane stack; caption duplicates Fig. 8, noted)
  - Table II data_table, manual (no candidate)
  - Fig. 8 electrical_plot
  - Table IV data_table
  - Table V data_table
  - Fig. 6 electrical_plot
- Not added: Fig. 1 (generic chiplet-integration concept blocks, not a build).
- Rank:
  1. Fig. 2
  2. Fig. 4
  3. Fig. 5
  4. Fig. 7
  5. Table III
  6. Fig. 9
  7. Fig. 3
  8. Table I
  9. Table VI
  10. Table VII
  11. Table II
  12. Fig. 8
  13. Table IV
  14. Table V
  15. Fig. 6

## ectc32696.2021.00125

Audit items
- x2B section 5 check "has_process_flow yes with 1-3 steps" (3 steps): reviewed, no change. The audit lists the count
  and states no defect.
  - Full text: a-s01/b-s01 (MSL4 preconditioning flow, p.2) and b-s02 (non-stitching RDL design and formation, p.3)
    are the only process statements. No fabrication sequence is described.
  - Borderline yes under rule 7. Left for the pending process-flow decision.
  - Side note: b-s02 category lithography is an inference from "non-stitching".
- x1 item 1 (text layer, p.4): not applicable to rows (pipeline).

Sibling groups: none listed.

Figures (6 -> 12)
- Added:
  - Fig. 3(a) package_photo, manual. The photo sits apart from panel (b); f02 notes updated.
  - Fig. 1 stack_schematic, candidate (CoWoS-R vs CoWoS-S, paper-level)
  - Fig. 4 simulation_result, candidate (b-m7)
  - Fig. 5 simulation_result, candidate (b-m8)
  - Fig. 6 simulation_result, candidate (b-m9)
  - Fig. 7 simulation_result, candidate (b-m11)
- Rank:
  1. Fig. 2
  2. Fig. 3
  3. Fig. 3(a)
  4. Fig. 1
  5. Table 1
  6. Table 2
  7. Table 3
  8. Fig. 8
  9. Fig. 4
  10. Fig. 5
  11. Fig. 6
  12. Fig. 7

## Issues for the coordinator

- Rank rule read literally puts process-flow and layout figures above other cross-section images and the stack
  schematic. Examples: 00-29 Fig. 1 is rank 9 and 00125 Fig. 1 is rank 4. Confirm this is intended.
- figure_kind has no value for process-characterization plots (thickness profiles, CD vs dose). 00-29 uses `other` (5 rows).
- The revisions `source` enum in the task lists audit_x1|x2A|x2B|sibling_dup. Figure re-ranks and additions use
  `source: figures`.
- mil -> um conversion (5898527) follows rule (e). If the coordinator prefers values as printed until a unit vocabulary
  exists, revert these six rows from the evidence `revisions` list.
