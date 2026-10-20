# Revision report s017 (figures supplement, 2026-10-19)

Scope: `figures.csv` only. Rule: every schematic drawing and every image of the build kept, plus plots/tables
carrying extracted values; rank 1 = best physical-build view, then process flow, layout, other schematics/images,
then plots/tables. Existing rows keep their bbox. Every candidates.json entry and every page render compared
against the existing rows; every new crop opened (candidate png or manual re-crop in the scratch folder).

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s017` -> 0 errors, 0 warnings.
Total rows 48 -> 82. Only `figures.csv` changed (git diff --stat).

## ectc51909.2023.00174 (6 -> 10)
Added:
- Fig. 11, electrical_plot, candidate p04_fig11 (T0 daisy-chain resistances, metrics a-m1..m4)
- Fig. 8, electrical_plot, candidate p04_fig8 (line resistance, d-m1, e-m1)
- Fig. 9, electrical_plot, candidate p04_fig9 (insertion loss, d-e1, e-e1)
- Fig. 6, electrical_plot, candidate p03_fig6 (max eDTC capacitance, a-m10)

Not added: Fig. 1 (CoWoS roadmap, generic); Fig. 7 (normalized capacitance CDF; value 1100 nF/mm2 comes from text).
New rank: f01 Fig. 2, f02 Fig. 4, f03 Fig. 5, f04 Fig. 3, f05 Fig. 10, f06 Fig. 11, f07 Fig. 12, f08 Fig. 8, f09 Fig. 9, f10 Fig. 6.
Change: package photo Fig. 3 moved below the two process flows (rule order).

## ectc51906.2022.00038 (6 -> 8)
Added:
- Fig. 3, xray_csam, candidate p03_fig3
- Table I, data_table, manual 3:0.095,0.565,0.475,0.68 (no candidate detected; metrics a-m4, a-m5)

New rank: f01 Fig. 4, f02 Fig. 1, f03 Fig. 6, f04 Fig. 7, f05 Fig. 3, f06 Fig. 5, f07 Fig. 2, f08 Table I.

## ectc51687.2025.00063 (6 -> 9)
Added:
- Fig. 2, micrograph (SEM blind-cavity steps), manual 2:0.095,0.525,0.49,0.582 (candidate had blank top and cut the SEM data bars)
- Fig. 5, cross_section (SEM PR over cavity edge), candidate p03_fig5
- Fig. 1, stack_schematic, manual 2:0.11,0.152,0.475,0.228 (candidate cut the PCB); reprinted yes (caption cites [1]); paper-level tv_ids

New rank: f01 Fig. 4, f02 Fig. 2, f03 Fig. 6, f04 Fig. 5, f05 Fig. 3, f06 Fig. 9, f07 Fig. 7, f08 Fig. 1, f09 Fig. 8.

## tcpmt.2023.3266666 (6 -> 11)
Added:
- Fig. 7, package_photo (test wafer photo plus chip-site heater/sensor layout), candidate p04_fig7
- Fig. 11, thermal_plot, candidate p07_fig11 (a-m35, a-m36)
- Fig. 8, other (pressure-drop plots), candidate p05_fig8 (a-m39, a-m40)
- Fig. 6, simulation_result, candidate p04_fig6 (b-m11..m13)
- Fig. 5, simulation_result, candidate p03_fig5 (b-m9, b-m10)

Stale note "not selected (6-figure cap)" removed from the Fig. 4 row.
New rank: f01 Fig. 3, f02 Fig. 2, f03 Fig. 1, f04 Fig. 7, f05 Fig. 10, f06 Fig. 9, f07 Fig. 11, f08 Fig. 8, f09 Fig. 4, f10 Fig. 6, f11 Fig. 5.

## ectc51906.2022.00135 (6 -> 11)
Added:
- Fig. 2, process_flow, candidate p02_fig2 (process_steps c-s01..s09)
- Fig. 8, warpage_plot, manual 4:0.10,0.09,0.49,0.284 (candidate cut the legend; a-m25, b-m1)
- Fig. 7, simulation_result, manual 3:0.515,0.695,0.905,0.78 (candidate included caption text)
- Fig. 4, other (cost bars), manual 2:0.515,0.655,0.93,0.835 (candidate cut x labels; c-m4..m7)
- Fig. 5, other (cost bars), manual 3:0.11,0.262,0.485,0.51 (candidate included a body-text line; c-m8..m10)

Stale note about Fig. 8 removed from the Table 2 row.
New rank: f01 Fig. 9, f02 Fig. 3, f03 Fig. 2, f04 Fig. 6, f05 Fig. 1, f06 Table 1, f07 Table 2, f08 Fig. 8, f09 Fig. 7, f10 Fig. 4, f11 Fig. 5.
Change: process flows moved up to ranks 2-3 (rule order).

## tcpmt.2023.3312037 (6 -> 11)
Added:
- Fig. 1, top_view_layout, candidate p01_fig1; reprinted yes ("Reprint from [1]")
- Fig. 10, cross_section (trench schematics plus section image of PVC), candidate p05_fig10
- Fig. 4, package_photo (UOD on PVC), candidate p02_fig4
- Fig. 3, stack_schematic (fillet formation steps), candidate p02_fig3; paper-level tv_ids
- Fig. 5, stack_schematic (trench mechanism), candidate p03_fig5

Stale note "Fig. 1, Fig. 4, Fig. 10 not selected" removed from the Table I row.
New rank: f01 Fig. 6, f02 Fig. 1, f03 Fig. 10, f04 Fig. 9, f05 Fig. 7, f06 Fig. 8, f07 Fig. 2, f08 Fig. 4, f09 Fig. 3, f10 Fig. 5, f11 Table I.

## ectc51687.2025.00062 (6 -> 10)
Added:
- Fig. 1, stack_schematic (OMIB chiplet section; text says the TV follows Fig. 1), manual 2:0.10,0.135,0.48,0.228 (candidate had a body-text line and wide margins)
- Fig. 8, micrograph (Si/glass block after CMP), candidate p05_fig8 (a-m1)
- Fig. 2(a),(b), top_view_layout (concept section plus top view), candidate p02_fig2a; paper-level tv_ids
- Fig. 7, warpage_plot, manual 4:0.515,0.152,0.915,0.712 (candidate spanned the full column; a-m2)

Not added: Table I (comparison of interconnect options; no extracted row cites it).
New rank: f01 Fig. 3, f02 Fig. 5, f03 Fig. 4, f04 Fig. 1, f05 Fig. 6, f06 Fig. 8, f07 Fig. 9, f08 Fig. 2(a),(b), f09 Fig. 7, f10 Fig. 10.

## ectc51846.2026.00117 (6 -> 12)
Added:
- Fig. 6, stack_schematic (single-sided SESUB, TV c), candidate p03_fig6
- Fig. 5, stack_schematic (non-embedded metal-frame structure), candidate p03_fig5; paper-level
- Fig. 3, package_photo (normal 12 x 14 mm vs SESUB 10 x 10 mm), candidate p02_fig3; paper-level
- Fig. 2, stack_schematic (thermal concept), candidate p02_fig2; paper-level
- Fig. 1, stack_schematic (noise concept), candidate p01_fig1; paper-level
- Fig. 9, thermal_plot (section sketches plus simulated thermal maps, TVs a and b), manual 4:0.12,0.085,0.485,0.232 (candidate covered the page quadrant)

Not added: Fig. 4 (SESUB application collage, marketing-type overview).
New rank: f01 Unnumbered figure (p.5), f02 Fig. 7, f03 Fig. 6, f04 Fig. 5, f05 Fig. 3, f06 Fig. 2, f07 Fig. 1, f08 Table I, f09 Fig. 11, f10 Fig. 9, f11 Fig. 10, f12 Fig. 8.
Change: the unnumbered p.5 cross-section image (only image of the actual build) moved to rank 1 ahead of the Fig. 7 schematic (cross-section image > stack schematic).

## Judgment calls
- Within "other schematics/images", the order is cross-section image > stack schematic > photo > concept schematic. Generic or reprinted concept drawings go last among schematics.
- Kind `other` is used for cost bar charts and hydraulic pressure plots (no matching enum); notes say so.
