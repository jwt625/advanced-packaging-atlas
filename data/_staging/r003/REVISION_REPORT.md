# Revision report r003 (2026-10-19)

Mode: audit_fix_and_figures. Validator: `uv run python scripts/validate_db.py --staging data/_staging/r003` ->
`0 errors, 0 warnings (data/_staging/r003)`. All 56 figure rows re-cropped from page + bbox (`crop_figures.py --staging`)
and the new/changed crops opened. Every change is logged in `evidence/<paper_id>.yaml` under `revisions:`.

| paper | rows changed outside figures | figures before -> after |
|---|---|---|
| ectc51687.2025.00009 | 0 | 6 -> 11 |
| ectc51687.2025.00026 | 6 (3 deleted, 3 edited) | 6 -> 12 |
| ectc51687.2025.00027 | 2 (1 deleted, 1 edited) | 6 -> 13 |
| ectc51687.2025.00028 | 0 | 6 -> 10 |
| ectc51687.2025.00052 | 3 (edited) | 6 -> 10 |

## ectc51687.2025.00009 (audit x2B)

Audit items:
- x2B defect 8, f04 (Fig. 9, manual bbox) y1 cuts the (a)/(b) labels: applied. bbox `0.14,0.64,0.42,0.825` -> `0.14,0.64,0.42,0.828`.
  The audit's "about 0.835" takes in the top of the caption line (checked on both crops), so 0.828 was used.
- x2B section 4 notes (f03 inset values, rank 1 sensible): no change needed.

Figures added (all candidates, crops opened):
- Fig. 8, micrograph (top-down SEM after litho; source of a-m3/a-m4)
- Fig. 3, stack_schematic (3D die-stack current-path drawing + voltage map; TV c)
- Fig. 1, stack_schematic (standard HB backend drawing; paper-level; caption cites [2], so `reprinted` is left empty with a note)
- Fig. 5, simulation_result (source of c-m1/c-m2)
- Fig. 4, simulation_result (source of c-m3)
- Not added: Fig. 2 (generic AR/sheet-resistance curves, no rows).

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 11 | cross_section |
| f02 | Fig. 6 | stack_schematic |
| f03 | Fig. 10 | cross_section |
| f04 | Fig. 9 | cross_section |
| f05 | Fig. 8 | micrograph |
| f06 | Fig. 3 | stack_schematic |
| f07 | Fig. 1 | stack_schematic |
| f08 | Fig. 12 | electrical_plot (was f05) |
| f09 | Fig. 7 | simulation_result (was f06) |
| f10 | Fig. 5 | simulation_result |
| f11 | Fig. 4 | simulation_result |

## ectc51687.2025.00026 (audit x2A)

Audit items:
- x2A defect 3, a-m9 / a-m10 / a-m11 (95% predicted yield, 58% utilization, 9 gross dies) come from the generic Fig. 2 model: applied.
  - Verified p.2: the curve runs over interposer sizes and the paragraph cites [9-11].
  - All three rows deleted and the values moved to evidence `excluded`, consistent with the existing exclusion of the 99.5% CoW yield.
- x2A defect 4, a-m1 entered the 1000 um spec limit as a measured max: applied.
  - Verified p.3 Sec. III.A "within 1000um spec".
  - value 1000 (`value:le`, statistic max) -> empty.
  - value_text "within 1000 um spec, symmetric dome shape"; pass_criterion "<= 1000 um"; result pass.
- x2A defect 7, a-s02 "IPD bonding" at seq 2 asserts an order: applied, with the inferred order noted. seq is kept.
  - The note now says the position is inferred from the abstract list (ubump joining, flux clean, IPD bonding, UF gap filling) and the text gives no order.
  - The audit's alternative (insert a CoW flux-clean step) was not taken. The abstract's "flux clean" cannot be attributed to CoW rather than oS, and the paper's only described flux clean is the C4/oS one (a-s06).
- x2A rule (m), papers.notes was 31 words: applied, trimmed to 30 words.
- x2A section 4, f02 `shows` claimed "ring on top" for the unlabelled Fig. 11: applied.
  - shows now describes unlabelled side blocks, with the compensation layer per the caption.
  - The note says the ring identity comes only from Fig. 13(a).
- x2A section 4, Fig. 10 missed (source of a-m5, b-m1, c-m1): applied, added as f07.
- x2A lines 134/162-176 (verified values, logged conflicts and exclusions): no change needed.

Figures added:

| figure | kind | bbox | note |
|---|---|---|---|
| Fig. 7 | xray_csam | manual | candidate clipped the CSAM panel bottom |
| Fig. 9 | xray_csam | manual | no candidate |
| Fig. 8 | warpage_plot | candidate | includes the SBT-on-jig fixture drawing |
| Fig. 10 | data_table | candidate | |
| Fig. 6(b) | other | manual | topography maps; a-m2 locator |
| Fig. 15 | data_table | manual | candidate clipped the bottom row; the text cites FIB cross-sections, but only a table is printed |

Not added: Fig. 1 (roadmap), Fig. 2/3 (generic utilization model), Fig. 5 (Moire plot without values, no rows).

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 6(a) | stack_schematic |
| f02 | Fig. 11 | stack_schematic |
| f03 | Fig. 4 | top_view_layout |
| f04 | Fig. 7 | xray_csam |
| f05 | Fig. 9 | xray_csam |
| f06 | Fig. 8 | warpage_plot |
| f07 | Fig. 10 | data_table |
| f08 | Fig. 12 | data_table (was f04) |
| f09 | Fig. 13 | warpage_plot (was f05) |
| f10 | Fig. 6(b) | other |
| f11 | Fig. 14 | simulation_result (was f06) |
| f12 | Fig. 15 | data_table |

## ectc51687.2025.00027 (no audit; 17 sibling groups)

Sibling-group decisions:
- a-m9 / b-m8, "substrate warpage < 200 um at 160-200 C": copy.
  - The abstract states it once, not split by substrate.
  - b-m8 deleted. a-m9 scope now starts "applies to TVs a, b (abstract, not split by substrate)".
- a-m11..a-m17 / b-m9..b-m15 (Table V, No. 1-7): genuine per-TV values, kept.
  - p.5 Table V has separate Substrate A and Substrate B columns.
  - The A and B outcomes are identical for No. 1-7 and differ for No. 8-12.
- a-m23..a-m29 / b-m21..b-m27 and a-m33, a-m34 / b-m31, b-m32 (Table VI, No. 1-7, 11, 12): genuine per-TV values, kept.
  - p.6 Table VI gives per-substrate test-line A/B columns.

Figures added:

| figure | kind | bbox | note |
|---|---|---|---|
| Fig. 5 | stack_schematic | manual | candidate clipped the PCB |
| Fig. 4 | package_photo | manual | candidate clipped the photos; substrate A or B not stated |
| Fig. 6 | xray_csam | manual | candidate clipped panel (c) |
| Table II | data_table | candidate | |
| Table III | data_table | manual | candidate clipped the header row |
| Table VI | data_table | manual | candidate clipped the footnote |
| Table IV | data_table | candidate | |

Re-rank: per the rule (cross-section image > stack schematic), the Fig. 7 SEM cross-section moves to rank 1 above the Fig. 1 schematic.

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 7 | cross_section (was f02) |
| f02 | Fig. 1 | stack_schematic (was f01) |
| f03 | Fig. 5 | stack_schematic |
| f04 | Fig. 4 | package_photo |
| f05 | Fig. 6 | xray_csam |
| f06 | Table I | data_table (was f03) |
| f07 | Table II | data_table |
| f08 | Table III | data_table |
| f09 | Fig. 3 | warpage_plot (was f04) |
| f10 | Table V | data_table (was f05) |
| f11 | Table VI | data_table |
| f12 | Fig. 2 | simulation_result (was f06) |
| f13 | Table IV | data_table |

## ectc51687.2025.00028 (audit x2B: sibling judgment only)

- x2B section 5, a-m1 / b-m1 510 nF judged legitimate: confirmed, kept. p.4 Table I lists 510 nF separately for the Si-cap DSC and DASC columns. No other audit items.

Figures added (all candidates):
- Fig. 2, stack_schematic (DASC, TV b)
- Fig. 4, stack_schematic (SSSC, TV c)
- Fig. 1, stack_schematic (DSC/LSC/eCAP concept, TV a). The text cites [4] at the figure, so `reprinted` is left empty with a note.
- Fig. 8, electrical_plot (cited by 3 rows)

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 7 | stack_schematic |
| f02 | Fig. 6 | process_flow |
| f03 | Fig. 5 | process_flow |
| f04 | Fig. 3 | process_flow |
| f05 | Fig. 2 | stack_schematic |
| f06 | Fig. 4 | stack_schematic |
| f07 | Fig. 1 | stack_schematic |
| f08 | Table I | data_table (was f05) |
| f09 | Fig. 9 | electrical_plot (was f06) |
| f10 | Fig. 8 | electrical_plot |

## ectc51687.2025.00052 (audit x1; x2B lists e-m1 as still open)

Audit items:
- x1 defect 7, e-m1 "less than 30 dB cross-talk" had no qualifier: applied, qualifiers -> `value:lt`. Verified p.4 Sec. V.A.
- x1 defect 8, b-o1 / c-o1 coupling_loss_db held the full PIC-to-SMF link IL (2.0 dB): applied as the interim fix, since there is no link_loss_db column in v2.3.
  - coupling_loss_db and scope cleared on both rows.
  - Row basis measured -> design_target (the remaining cells are design values), source figure_image -> text, redundant overrides cleared, Fig. 8 removed from the locator.
  - The 2.0 dB link IL is still recorded in metrics b-m2 / c-m2 (p.6 Fig. 8(d),(e)).
- x1 section 4 / defect 12, pooled TV a uses tv_kind `other`: not applicable under schema v2.3.
  - The fix needs a new `pooled` enum.
  - The TV notes already say it is not a separate build. No change.
- x2B open-items list: covered by the e-m1 fix.

Figures added:

| figure | kind | bbox | note |
|---|---|---|---|
| Fig. 3 | stack_schematic | manual | 3D CAD of both single-PIC TVs; candidate held only the bottom drawings |
| Fig. 7 | package_photo | candidate | optics-last module with substrate cut-out, TV c |
| Fig. 9 | optical_plot | candidate | source of a-m7 |
| Fig. 11 | optical_plot | candidate | source of b-m3, c-m3 |

Not added:
- Fig. 2: V-groove card from ref [3], excluded prior work.
- Fig. 1: BW roadmap, ref [1].
- Fig. 5: stress contours with no scale, no rows.
- Table 1: generic list of component metrics, no values.

Rank-1 judgment: kept the Fig. 6 module photos at rank 1.
- No cross-section exists in this paper.
- Fig. 3 and Fig. 4 are 3D CAD/FE geometry renders, not stack cross-section drawings.
- The photos show the actual builds.

New rank order:

| rank | figure | kind |
|---|---|---|
| f01 | Fig. 6 | package_photo |
| f02 | Table 2 | process_flow (was f03) |
| f03 | Fig. 3 | stack_schematic |
| f04 | Fig. 4 | stack_schematic (was f02) |
| f05 | Fig. 7 | package_photo |
| f06 | Fig. 12 | package_photo |
| f07 | Fig. 8 | optical_plot (was f04) |
| f08 | Fig. 9 | optical_plot |
| f09 | Fig. 10 | reliability_plot (was f05) |
| f10 | Fig. 11 | optical_plot |

## Notes

- The `revisions` entries for Task B use `source: figure_rule`, which is outside the audit_x1 / x2A / x2B / sibling_dup list.
- `reprinted` is left empty on two figures whose captions or text cite a reference: 00009 Fig. 1 and 00028 Fig. 1.
