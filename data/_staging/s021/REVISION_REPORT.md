# Revision report s021 (figures supplement, 2026-10-20)

Mode: figures_supplement. Only `figures.csv` edited; existing rows keep bbox/caption/shows (only `fig_id`/`rank` renumbered).
Validator: `uv run python scripts/validate_db.py --staging data/_staging/s021` -> 0 errors, 0 warnings.
Total rows 48 -> 90. Every added crop (candidate png or manual re-crop) was opened.

## eptc59621.2023.10457670 (6 -> 10)
Added:
- Fig. 2, cross_section, candidate p02_fig2
- Fig. 8, stack_schematic, manual (no candidate)
- Fig. 7, top_view_layout, manual (no candidate)
- Fig. 9, electrical_plot, manual (no candidate; metric m9 cites it)

New rank: Fig. 3, Fig. 2, Fig. 8, Fig. 1, Fig. 7, Fig. 4, Fig. 10, Fig. 5, Fig. 6, Fig. 9

## ectc51909.2023.00252 (6 -> 16)
Added:
- Fig. 2, top_view_layout, candidate
- Fig. 10, top_view_layout, manual (candidate had a caption sliver)
- Fig. 12, top_view_layout, candidate
- Fig. 5, stack_schematic (HFSS 3D model), candidate
- Fig. 7, electrical_plot, candidate
- Fig. 9, electrical_plot, candidate
- Fig. 11, electrical_plot, manual (no candidate)
- Fig. 14, electrical_plot, manual (caption sliver)
- Table II, data_table, candidate
- Fig. 15, electrical_plot, manual (caption sliver)

Skipped: Fig. 6 (ADS circuit model block, no build drawing, no extracted values).

New rank: Fig. 3, Fig. 4, Fig. 13, Fig. 1, Fig. 2, Fig. 10, Fig. 12, Fig. 5, Table I, Fig. 8, Fig. 7, Fig. 9, Fig. 11, Fig. 14, Table II, Fig. 15

## eptc67330.2025.11392593 (6 -> 9)
Added:
- Fig. 4, xray_csam (SAT), candidate
- Fig. 6, xray_csam (SAT), candidate
- Fig. 8, stack_schematic (coaxial Cu post, TV c), candidate

New rank: Fig. 5, Fig. 1, Fig. 2, Fig. 3, Fig. 7, Fig. 4, Fig. 6, Fig. 8, Fig. 9

## ectc51909.2023.00048 (6 -> 7)
Added:
- Fig. 7, package_photo (bonded wafers after back grind), candidate

Skipped:
- Fig. 1: generic pluggable/OBO/CPO architecture sketch, not this build.
- Table I: adapted from ref [15]; the one own value (1.3 J/m2) is also in the text.

New rank: Fig. 3, Fig. 4, Fig. 2, Fig. 7, Fig. 5, Fig. 8, Fig. 6

## ectc51687.2025.00131 (6 -> 10)
Added:
- Fig. 7, warpage_plot (measured topography + schematic), candidate
- Fig. 4, other (test setup photo with package inset), candidate
- Fig. 6, thermal_plot, candidate
- Fig. 8, block_diagram (leak-rate conversion carrying Qcr values), candidate

New rank: Fig. 1, Fig. 3, Fig. 2, Fig. 7, Fig. 4, Fig. 5, Fig. 9, Table I, Fig. 6, Fig. 8

## ectc51529.2024.00207 (6 -> 15)
Added:
- Fig. 2, process_flow, candidate
- Table II, cross_section (die X-section images), manual (no usable candidate)
- Fig. 8, stack_schematic + X-sections, candidate
- Fig. 7, stack_schematic, candidate
- Fig. 9, cross_section, candidate (printed caption duplicates Fig. 8; noted)
- Table III, cross_section (passive joint X-sections), candidate
- Fig. 10, xray_csam (SAT), candidate
- Fig. 6, other (C4 planarity scan), manual (candidate overlapped Fig. 5 caption)
- Table I, data_table, manual (title excluded)

New rank: Fig. 5, Fig. 1, Fig. 3, Fig. 2, Table II, Fig. 8, Fig. 7, Fig. 9, Table III, Fig. 10, Fig. 6, Fig. 4, Table IV, Table V, Table I

## ectc51846.2026.00346 (6 -> 16)
Added:
- Fig. 1, stack_schematic (concept, paper-level), manual (candidate had a text line)
- Fig. 6, package_photo, candidate
- Fig. 4, top_view_layout, candidate
- Fig. 9, micrograph (optical top view), manual
- Fig. 11, stack_schematic (TSV model geometry, TV b), candidate
- Fig. 14, stack_schematic (SI model structures, TV c), candidate
- Fig. 17, top_view_layout, candidate
- Fig. 2, block_diagram (concept floorplan, paper-level), candidate
- Fig. 16, electrical_plot, candidate
- Fig. 10, other (box plots), manual (no candidate)

Skipped: Fig. 13 (stress contour renders, no values extracted).

New rank: Fig. 8, Fig. 3, Fig. 1, Fig. 6, Fig. 5, Fig. 4, Fig. 7, Fig. 9, Fig. 11, Fig. 14, Fig. 17, Fig. 2, Fig. 15, Fig. 12, Fig. 16, Fig. 10

## ectc51909.2023.00008 (6 -> 7)
Added:
- Fig. 2, other (bandwidth density vs pitch; metric m2), candidate

Skipped: Fig. 1 (compute/memory trend from ref [6]). The paper has no schematic or build image beyond CSAM/WLI.

New rank: Fig. 4, Fig. 5, Fig. 6, Fig. 7, Fig. 3, Table 1, Fig. 2
