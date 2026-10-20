# Revision report s024 (figures supplement, 2026-10-20)

Mode: figures_supplement (DevLog-005 key-figure rule, 2026-10-19). Only `figures.csv` edited; existing rows keep their bbox and content, only `fig_id`/`rank` renumbered.
Every page render of all 8 papers and every candidate in `candidates.json` compared against the existing rows; every added crop opened (candidate png or manual re-crop in the session scratchpad).
Validator: `uv run python scripts/validate_db.py --staging data/_staging/s024` -> 0 errors, 0 warnings.

Skipped on purpose (tool/equipment images, not the build): ectc51529.2024.00133 Fig. 3 (DUV laser machine photo), ectc51529.2024.00229 Fig. 2 (UV imprint stepper photo), ectc51529.2024.00096 Fig. 4 (DLT tool rendering) and Table I (qualitative scheme comparison, no extracted values), ectc51529.2024.00334 Fig. 1 (IMEC roadmap, cited work).

## ectc51846.2026.00051 (6 -> 10)
Added:
- Fig. 10, electrical_plot, manual (candidate cut x-axis label)
- Fig. 8, electrical_plot, manual (candidate cut x-axis label)
- Fig. 2, electrical_plot, candidate p02_fig2
- Fig. 7, electrical_plot, manual (candidate cut x-axis label)

Rank: f01 Fig. 4 (cross_section), f02 Fig. 1 (cross_section), f03 Fig. 9 (stack_schematic), f04 Fig. 3 (micrograph), f05 Fig. 6 (package_photo), f06 Fig. 5 (other), f07 Fig. 10, f08 Fig. 8, f09 Fig. 2, f10 Fig. 7.

## ectc51846.2026.00176 (6 -> 12)
Added:
- Fig. 3, xray_csam, manual (candidate cut bottom row)
- Fig. 6, xray_csam, candidate p03_fig6
- Fig. 4, xray_csam, candidate p02_fig4
- Table 1, data_table, candidate p02_table1
- Fig. 9, electrical_plot, manual (candidate cut x-axis labels)
- Fig. 8, optical_plot, candidate p04_fig8

Rank: f01 Fig. 7 (cross_section), f02 Fig. 1 (stack_schematic), f03 Fig. 2 (process_flow), f04 Fig. 3, f05 Fig. 6, f06 Fig. 4, f07 Table 2, f08 Fig. 5 (warpage_plot), f09 Table 1, f10 Fig. 10 (thermal_plot), f11 Fig. 9, f12 Fig. 8.

## ectc51529.2024.00133 (5 -> 7)
Added:
- Fig. 6, micrograph (SEM top view), candidate p04_fig6
- Fig. 2, package_photo (sample photos per process step), manual (no candidate)

Rank: f01 Fig. 7 (cross_section), f02 Fig. 1 (process_flow), f03 Fig. 6, f04 Fig. 5 (micrograph), f05 Fig. 2, f06 Fig. 4 (block_diagram), f07 Table I.

## ectc51529.2024.00229 (6 -> 6)
No additions: all schematics/images already present; Fig. 2 is a tool photo (skipped). Rank unchanged: f01 Fig. 1, f02 Fig. 3, f03 Fig. 4, f04 Fig. 5, f05 Fig. 6, f06 Fig. 7.

## ectc51529.2024.00396 (6 -> 6)
No additions (all 6 figures already present). Re-ranked so build images precede plots:
f01 Fig. 6 (cross_section), f02 Fig. 1 (process_flow), f03 Fig. 5 (xray_csam, was f05), f04 Fig. 2 (xray_csam, was f06), f05 Fig. 4 (other, was f03), f06 Fig. 3 (warpage_plot, was f04).

## ectc51529.2024.00334 (6 -> 10)
Added:
- Fig. 6, xray_csam, manual (candidate p03_fig6a included Fig. 5 caption tail)
- Fig. 8, electrical_plot, manual (candidate cut table bottom border)
- Fig. 4, other (overlay vector maps), manual (no candidate)
- Fig. 11, electrical_plot, candidate p05_fig11a

Rank: f01 Fig. 7 (cross_section), f02 Fig. 3 (process_flow), f03 Fig. 2 (top_view_layout), f04 Fig. 6, f05 Fig. 9, f06 Fig. 8, f07 Fig. 10, f08 Fig. 4, f09 Fig. 11, f10 Fig. 5.

## ectc51529.2024.00096 (6 -> 8)
Added:
- Fig. 5, micrograph (design layouts + SEM top views), manual (candidate cut bottom edge)
- Fig. 3, other (greyscale contrast-curve schematic), candidate p02_fig3

Rank: f01 Fig. 6 (cross_section), f02 Fig. 2 (process_flow), f03 Fig. 1 (top_view_layout), f04 Fig. 5, f05 Fig. 3, f06 Fig. 7, f07 Fig. 8, f08 Fig. 9.

## icep58572.2023.10129684 (4 -> 5)
Added:
- Fig. 2, other (tool photos; (b) shows a panel on the chuck), candidate p01_fig2; tv_ids empty (panel size not stated)

Rank: f01 Fig. 5 (cross_section), f02 Fig. 1 (package_photo), f03 Fig. 4 (micrograph, was f04), f04 Fig. 3 (other, was f03), f05 Fig. 2.
