# Revision report s015 (figures supplement, 2026-10-19)

Scope: `figures.csv` only. Other CSVs and evidence files are unchanged. Existing rows keep their bbox and other fields; only `rank` and `fig_id` changed. Every page render was compared against figures.csv, and every candidate crop or manual re-crop cited here was opened.
Validator: `0 errors, 0 warnings (data/_staging/s015)`.
Rank rule: build view first (cross-section image > stack schematic > package photo), then process flow, layout, other schematics/images, then plots/tables.

## iwlpc52010.2020.9375887 (5 -> 11)
Added:
- Fig. 11, top_view_layout, manual (no candidate)
- Fig. 12, top_view_layout, manual (candidate included the edge of Table 3)
- Fig. 6, top_view_layout, candidate p04_fig6
- Fig. 7, other (panel die-position map), candidate p04_fig7
- Fig. 8, xray_csam, manual (candidate included a section heading)
- Fig. 9, stack_schematic (generic CSAM illustration), candidate p05_fig9

Rank: Fig. 5, Table 1, Fig. 11, Fig. 12, Fig. 6, Fig. 7, Fig. 8, Fig. 9, Fig. 10, Table 3, Table 2.
Skipped: Figs. 1-4 (Weibull plot from DECA and market charts; no values extracted).

## iedm19573.2019.8993659 (6 -> 9)
Added:
- Fig. 4, stack_schematic, manual (candidate held caption text and cut the panel (c) label)
- Fig. 2, stack_schematic, manual (candidate held the Fig. 1 caption and cut the panel labels)
- Fig. 9, stack_schematic, manual (candidate held the Fig. 7 caption)

Rank: Fig. 7, Fig. 6, Fig. 1, Fig. 8, Fig. 4, Fig. 5, Fig. 2, Fig. 9, Fig. 3.

## ectc.2013.6575597 (6 -> 15)
Added (all manual, because the candidate crops were cut or merged):
- Fig. 14, cross_section
- Fig. 9, cross_section
- Fig. 10, cross_section (no candidate)
- Fig. 5, cross_section
- Fig. 7, stack_schematic
- Fig. 11, top_view_layout
- Fig. 15, package_photo
- Fig. 17 (a)+(b), package_photo (no candidate; one bbox)
- Table 2, data_table (no candidate; carries the shock conditions)

Rank: Fig. 2, Fig. 14, Fig. 9, Fig. 10, Fig. 5, Fig. 7, Fig. 1, Fig. 3, Fig. 11, Fig. 15, Fig. 17, Table 1, Fig. 16, Fig. 13, Table 2.
Fig. 1 (package photo) moves from rank 2 to rank 7 because cross-section SEMs and the stack schematic rank above a package photo.
Skipped: Figs. 4, 6, 8 and 12 (plots without axis values, or values already given in the text).

## ectc51909.2023.00108 (6 -> 12)
Added (all from candidates, paper-level, no TV):
- Fig. 4, stack_schematic, p03_fig4
- Fig. 5, stack_schematic, p03_fig5
- Fig. 6, stack_schematic, p04_fig6
- Fig. 7, stack_schematic, p04_fig7
- Fig. 8, stack_schematic, p04_fig8
- Fig. 2, block_diagram (top-view configurations), p02_fig2

Rank: Fig. 9, Fig. 1, Fig. 3, Fig. 4, Fig. 5, Fig. 6, Fig. 7, Fig. 8, Fig. 2, Table II, Table III, Table I.
Fig. 3 (stack schematic) moves from rank 6 to rank 3, above the tables.

## ectc51529.2024.00227 (6 -> 10)
Added (all from candidates):
- Fig. 1, stack_schematic, p01_fig1
- Fig. 9, xray_csam (mixed SAM, optical and scans), p05_fig9
- Fig. 4, package_photo (mixed photos and warpage profiles), p03_fig4
- Fig. 5, package_photo (mixed histograms and photos), p03_fig5

Rank: Fig. 7, Fig. 1, Fig. 3, Fig. 2, Fig. 8, Fig. 10, Fig. 6, Fig. 9, Fig. 4, Fig. 5.

## ectc51906.2022.00176 (6 -> 7)
Added:
- Fig. 2, micrograph (IR images of CoW fiducial marks), candidate p03_fig2

Rank: Fig. 3, Fig. 2, Table I, Fig. 4, Fig. 5, Table II, Table III.
Skipped: Fig. 1 (data-volume market chart).

## ectc51529.2024.00088 (6 -> 6)
No figures added. All six figures in the paper were already rows, and the rank order already follows the rule.

## ectc51529.2024.00144 (6 -> 12)
Added:
- Fig. 8, block_diagram, candidate p04_fig8
- Fig. 4, block_diagram, candidate p03_fig4
- Fig. 6, block_diagram, candidate p03_fig6
- Fig. 5, electrical_plot, candidate p03_fig5
- Table III, data_table, manual (no candidate)
- Fig. 10, electrical_plot, candidate p04_fig10

Rank: Fig. 1, Fig. 9, Fig. 3, Fig. 8, Fig. 4, Fig. 6, Table II, Fig. 7, Table I, Fig. 5, Table III, Fig. 10.
Skipped: Fig. 2 (WDM ring-radius trend compiled from cited works).
