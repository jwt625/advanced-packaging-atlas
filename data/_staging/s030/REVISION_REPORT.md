# Revision report s030 (figures supplement, 2026-10-20)

Mode: figures_supplement (DevLog-005 decisions 2026-10-19). Only `figures.csv` edited; all other CSVs and evidence YAML
byte-identical to the export (md5 checked). Existing rows keep bbox/caption/shows/kind/tv_ids; only `rank` and `fig_id`
renumbered. No audit names a defect in these papers' figures, so no existing bbox was changed.
Every candidate in `candidates.json` and every page render was compared against the existing rows; every new crop was opened.
Manual crops were checked from re-crops in the session scratch folder.

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s030` -> 0 errors, 0 warnings.

Rank rule applied: build views (cross-section image > stack schematic > package photo) first, then process flow,
layout, other schematics/images, then plots/tables.

## ectc51909.2023.00023 (6 -> 13)
Added:
- Fig. 12, cross_section, candidate p06_fig12
- Fig. 6, xray_csam, candidate p04_fig6
- Fig. 13, micrograph, candidate p06_fig13
- Fig. 2, micrograph (IR image), candidate p02_fig2
- Fig. 8, other (die map, layout, recess plots), candidate p04_fig8
- Fig. 9, electrical_plot, candidate p05_fig9
- Fig. 14, electrical_plot, candidate p07_fig14

Rank: Fig. 3, Fig. 7, Fig. 1, Fig. 12, Fig. 6, Fig. 13, Fig. 2, Fig. 8, Fig. 4, Fig. 11, Fig. 10, Fig. 9, Fig. 14.
Not added: Fig. 5 (subchain offset distribution; no extracted value cites it).

## ectc51687.2025.00095 (6 -> 14)
Added:
- Fig. 3, cross_section, candidate p04_fig3
- Fig. 4, xray_csam, candidate p04_fig4
- Table V, micrograph (SEM of tall Cu pillars), candidate p03_tablev
- Table VI, micrograph (grinding schematic and Cu stud top view), manual (the candidate was the caption only; the table body is at the top of the right column)
- Table VII, micrograph (via landing), candidate p03_tablevii
- Table IV, data_table, candidate p03_tableiv
- Table VIII, data_table, candidate p04_tableviii
- Table IX, data_table, candidate p04_tableix

Rank: Fig. 5, Fig. 6, Fig. 1, Fig. 2, Fig. 3, Fig. 4, Table V, Table VI, Table VII, Table III, Table IV, Table I, Table VIII, Table IX.
Not added: Table II (qualitative pros/cons).

## ectc51529.2024.00076 (6 -> 10)
Added:
- Fig. 3, xray_csam, candidate p02_fig3
- Fig. 4, package_photo (wafers after DCB), candidate p02_fig4
- Fig. 2, process_flow (W2W bonding schematic), candidate p02_fig2
- Fig. 7, micrograph (AFM), manual (the candidate cut off the Rq label)

Rank: Fig. 9, Fig. 5, Fig. 6, Fig. 10, Fig. 8, Fig. 3, Fig. 4, Fig. 2, Fig. 1, Fig. 7.
Fig. 5 (TEM cross-section) is now ahead of the Fig. 6 process flow, per the rank rule.

## ectc51529.2024.00153 (6 -> 12)
OCR text and an empty candidates.json, so all new rows are manual crops from the page renders.

Added:
- Fig. 2, stack_schematic, manual
- Fig. 3, other (conceptual hot-stage schematic; paper-level, not this build), manual
- Fig. 11, thermal_plot, manual
- Fig. 4, optical_plot, manual
- Fig. 5, other (rheology), manual
- Fig. 6, other (FTIR), manual

Rank: Fig. 12, Fig. 1, Fig. 8, Fig. 2, Fig. 9, Fig. 7, Fig. 10, Fig. 3, Fig. 11, Fig. 4, Fig. 5, Fig. 6.
Not added: Table I (process comparison; no extracted values).

## ectc51846.2026.00008 (6 -> 13)
Added:
- Table IX, xray_csam (SAT and side view), candidate p04_tableix
- Table X, package_photo (panel top view and SAT), candidate p04_tablex
- Table VII, micrograph (laser-diced sidewall), candidate p04_tablevii
- Fig. 2, micrograph (ball mount), manual (the candidate cut off the bottom row)
- Fig. 3, package_photo (ground panel), manual (the candidate cut off the panel's bottom edge)
- Fig. 4, package_photo (diced packages), candidate p05_fig4
- Table IV, data_table, candidate p03_tableiv

Rank: Fig. 5, Fig. 1, Table VI, Table VIII, Table IX, Table X, Table VII, Fig. 2, Fig. 3, Fig. 4, Table V, Table IV, Table XI.
Not added: Tables I-III (qualitative pros/cons).

## ectc51529.2024.00057 (6 -> 17)
Added:
- Fig. 7, cross_section, candidate p04_fig7
- Fig. 8, cross_section, candidate p04_fig8
- Fig. 10, cross_section, candidate p04_fig10
- Fig. 2, stack_schematic, candidate p02_fig2
- Fig. 11, stack_schematic, candidate p05_fig11
- Fig. 4, xray_csam (SAM and overlay), candidate p03_fig4
- Table 1, data_table (with Kelvin structure sketches), candidate p05_table1
- Table 2, data_table, manual (no candidate)
- Fig. 13, electrical_plot, candidate p06_fig13
- Fig. 15, electrical_plot, candidate p06_fig15
- Fig. 16, electrical_plot, candidate p06_fig16

Rank: Fig. 6, Fig. 1, Fig. 3, Fig. 7, Fig. 8, Fig. 9, Fig. 10, Fig. 2, Fig. 11, Fig. 5, Fig. 4, Table 1, Fig. 12, Table 2, Fig. 13, Fig. 15, Fig. 16.
Not added: Fig. 14 (3L 4 um DC plot; the extracted range comes from the text, not the plot).

## ectc51687.2025.00226 (6 -> 8)
Added:
- Fig. 2, micrograph (FIB-SEM and EDS), candidate p03_fig2
- Fig. 3, mechanical_plot, candidate p04_fig3

Rank: Fig. 5, Fig. 1, Fig. 2, Table I, Table II, Fig. 6, Fig. 4, Fig. 3.

## ectc51846.2026.00194 (6 -> 11)
Added:
- Fig. 6, cross_section, candidate p04_fig6
- Fig. 2, top_view_layout (GDS-II), candidate p02_fig2
- Fig. 9, micrograph, candidate p04_fig9
- Fig. 10, micrograph, candidate p05_fig10
- Fig. 3, micrograph (Siemens star), candidate p03_fig3

Rank: Fig. 5, Fig. 6, Fig. 2, Fig. 7, Fig. 8, Fig. 9, Fig. 10, Fig. 11, Fig. 3, Table I, Fig. 4.
Not added: Fig. 1 (reprinted from ref [2]; generic PoP/bridge/DRAM application schematic, not this paper's build).
