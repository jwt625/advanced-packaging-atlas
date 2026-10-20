# Revision report s022 (figures supplement, 2026-10-20)

Mode: figures_supplement (DevLog-005 decisions 1 and 3, 2026-10-19). Only `figures.csv` edited. Existing rows keep their bbox,
caption, shows and notes; only `fig_id` and `rank` changed (renumbered `<paper_id>-f01..` in rank order).
Every candidate in `candidates.json` and every page render was compared against the existing rows; every added crop was opened
(candidate png or manual re-crop in the session scratchpad).

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s022` -> 0 errors, 0 warnings.

## ectc51846.2026.00199 (6 -> 14)
Added:
- Fig. 12, stack_schematic, candidate p06_fig12 (UCIe channel cross-section + breakout)
- Fig. 1, top_view_layout, candidate p02_fig1 (simulated 200x200 mm system layout, TV -c)
- Fig. 4, micrograph, candidate p04_fig4
- Fig. 11, micrograph, candidate p06_fig11
- Fig. 10, micrograph, candidate p06_fig10
- Fig. 7, package_photo, candidate p05_fig7
- Fig. 13, block_diagram, candidate p06_fig13 (VTF equivalent circuit of the simulated channel)
- Fig. 2, simulation_result, candidate p03_fig2 (carries the TV -c runtime values)

Not added: Table I (commercial products from cited refs), Table II (workload names only).
Rank: Fig. 5, Fig. 3, Fig. 12, Fig. 1, Fig. 6, Fig. 4, Fig. 11, Fig. 10, Fig. 7, Fig. 13, Fig. 9, Fig. 8, Fig. 14, Fig. 2

## ectc51909.2023.00094 (6 -> 10)
Added:
- Fig. 1, other, candidate p02_fig1 (panel vs 12-inch wafer size schematic, 510 x 515 mm)
- Fig. 4, warpage_plot, candidate p03_fig4
- Fig. 5, warpage_plot, candidate p03_fig5
- Fig. 9, other, candidate p04_fig9 (CTE ranges)

Rank: Fig. 2, Fig. 1, Table I, Fig. 7, Fig. 6, Fig. 8, Fig. 3, Fig. 4, Fig. 5, Fig. 9

## ectc51687.2025.00048 (6 -> 13)
Added:
- Fig. 3.4.2, cross_section, candidate p04_fig3_7 (SEM of chip-to-interposer joint)
- Fig. 4.1, package_photo, candidate p05_fig4
- Fig. 1.2, package_photo, candidate p01_fig1_2 (panel photo)
- Fig. 3.4.1, xray_csam, candidate p04_fig3_6
- Fig. 3.2.1, micrograph, candidate p03_fig3_3 (bridge after grinding)
- Fig. 3.1.2, other, candidate p03_fig3_2 (bonding-accuracy improvement)
- Fig. 3.3.1, warpage_plot, manual 4:0.105,0.085,0.49,0.19 (the candidate cut the x-axis)

Not added: Fig. 1.1 (generic package roadmap), Fig. 3.1.1 (unit expansion contours, no extracted values).
Rank: Fig. 4.2, Fig. 3.4.2, Fig. 2.1, Fig. 4.1, Fig. 1.2, Fig. 2.3, Fig. 2.2, Fig. 3.4.1, Fig. 3.2.1, Fig. 3.5, Fig. 3.2.2, Fig. 3.1.2, Fig. 3.3.1

## ectc51687.2025.00187 (6 -> 15)
Added:
- Fig. 8, stack_schematic, candidate p04_fig8
- Fig. 5, top_view_layout, candidate p03_fig5
- Fig. 13, top_view_layout, candidate p05_fig13
- Fig. 7, stack_schematic, candidate p04_fig7 (FE model)
- Fig. 3, stack_schematic, candidate p03_fig3 (thermal model)
- Fig. 1, stack_schematic, candidate p01_fig1 (concept figure, paper-level)
- Fig. 4, simulation_result, candidate p03_fig4a
- Table I, data_table, candidate p03_tablei
- Fig. 6, simulation_result, manual 3:0.505,0.618,0.92,0.822 (the candidate cut the x-axis title)

Re-rank: the cross-section images Fig. 11 and Fig. 14 now come before the Fig. 2 stack schematic, per the rank rule.
Rank: Fig. 11, Fig. 14, Fig. 2, Fig. 8, Fig. 10, Fig. 5, Fig. 13, Fig. 12, Fig. 7, Fig. 3, Fig. 1, Fig. 4, Table I, Fig. 6, Fig. 9

## ectc51909.2023.00324 (6 -> 10)
Added:
- Fig. 2, stack_schematic, manual 1:0.535,0.725,0.905,0.879 (candidate p01_fig2 merged Fig. 1 and Fig. 2)
- Fig. 1, stack_schematic, manual 1:0.53,0.41,0.885,0.686 (AOP/CPO concept, paper-level)
- Fig. 9, package_photo, manual 3:0.535,0.405,0.895,0.622 (the candidate held only the lower strip)
- Fig. 7, mechanical_plot, candidate p03_fig7

Rank: Fig. 4, Fig. 2, Fig. 1, Fig. 9, Fig. 3, Fig. 8, Fig. 6, Fig. 10, Fig. 5, Fig. 7

## ectc51909.2023.00178 (6 -> 9)
Added:
- Fig. 5, other, candidate p03_fig5 (void-size plot with inspection-image insets; the caption cites [14])
- Fig. 8, reliability_plot, candidate p04_fig8
- Fig. 2, mechanical_plot, candidate p02_fig2

Rank: Fig. 1, Fig. 6, Fig. 3, Fig. 5, Table I, Fig. 7, Fig. 4, Fig. 8, Fig. 2

## ectc51529.2024.00311 (6 -> 8)
Added:
- Fig. 5, micrograph, candidate p03_fig5
- Fig. 6, micrograph, candidate p03_fig6

Rank: Fig. 7, Fig. 3, Fig. 8, Fig. 5, Fig. 6, Fig. 4, Fig. 1, Fig. 2

## ectc51687.2025.00047 (6 -> 11)
Added:
- Fig. 13, simulation_result, candidate p05_fig13 (fine-line/small-via deformation model)
- Fig. 3, other, manual 2:0.505,0.095,0.9,0.276 (routing schematics inset; the candidate cut the x-axis)
- Fig. 4, other, manual 2:0.51,0.672,0.89,0.838 (the candidate cut the x-axis)
- Fig. 5, other, manual 3:0.1,0.238,0.485,0.388 (the candidate cut the x-axis)
- Fig. 11, electrical_plot, candidate p04_fig11

Not added: Fig. 1 and Fig. 2 (UCIe/HBM bandwidth and line-density context, no extracted values) and Fig. 7 (normalized RC
impedance; no row cites it).
Rank: Fig. 6, Fig. 12, Fig. 9, Fig. 13, Fig. 3, Fig. 10, Fig. 8, Table I, Fig. 4, Fig. 5, Fig. 11
