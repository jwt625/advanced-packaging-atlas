# Batch f007 - key-figure backfill (figures_only)

Date: 2026-10-19. Mode: figures_only. Only `figures.csv` written; no other tables, no evidence files.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f007` -> 0 errors, 0 warnings.

Summary: 6 papers, 35 figure rows, 11 manual bboxes. All papers have status figures_done.
None of these papers has a TEXT_LAYER_WARNING.md file. No chosen figure is reprinted from cited work.

## ectc51906.2022.00061 - Ga-assisted low-temperature bonding (5 figures, 0 manual)
Opened: page_02-04 renders; cand p03_fig3, p02_fig2, p04_fig5, p03_tablei, p02_fig1. Also re-cropped Fig. 2 at y0 0.510/0.513 to check whether the top was clipped. It was not, so the candidate stays.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 3 | cross_section | candidate p03_fig3 | SEM of the bonded joint; source of the layer-thickness rows |
| -f02 | Fig. 2 | process_flow | candidate p02_fig2 | plating and TCB flow; process_steps locators |
| -f03 | Fig. 5 | cross_section | candidate p04_fig5 | FIB check of the bond-line quality |
| -f04 | Fig. 1 | stack_schematic | candidate p02_fig1 | bilayer mechanism schematic |
| -f05 | Table I | data_table | candidate p03_tablei | EDS composition; the crop holds the table body only, and the title line sits above it |

Skipped: Fig. 4 (EDS maps) and Fig. 6 (EDS line scan), which are qualitative.

## ectc51906.2022.00218 - S-SWIFT with embedded trace RDL (6 figures, 0 manual)
Opened: page_03, page_05, page_06; cand p06_fig10, p03_fig3, p05_fig8, p03_fig2, p02_fig1, p06_tableii.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 10 | cross_section | candidate | cross-section of the full package (TV a) |
| -f02 | Fig. 3 | cross_section | candidate | 4-layer ETR stack and stacked via (TV b) |
| -f03 | Fig. 8 | process_flow | candidate | S-SWIFT assembly flow (TV a) |
| -f04 | Fig. 1 | process_flow | candidate | SAP / dual damascene / ETR flows (TV b) |
| -f05 | Fig. 2 | cross_section | candidate | L/S and via dimensions (interconnect rows) |
| -f06 | Table II | data_table | candidate | package reliability (TV a) |

Skipped because of the 6-figure cap: Fig. 7 (dishing depth, 18 metric rows), Fig. 9 (assembly photos), Table I (BHAST).

## ectc32696.2021.00174 - 600 mm FOPLP, 6-sided die protection (6 figures, 3 manual)
Opened: page_02-05; cand p02_fig7, p02_fig5, p03_fig9. Manual re-crops: p05 Fig. 14, p04 Table 4, p05 Table 5 (tightened twice to drop caption fragments).

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 14 | cross_section | manual | no candidate existed; it is the only cross-section |
| -f02 | Fig. 7 | stack_schematic | candidate | stack-up of the 6-sided protection |
| -f03 | Fig. 5 | process_flow | candidate | chip-first flow |
| -f04 | Fig. 9 | top_view_layout | candidate | ball map and TV attributes |
| -f05 | Table 4 | data_table | manual | the candidate boxed only the caption; 13 metric rows |
| -f06 | Table 5 | data_table | manual | the candidate had x0=0 and ran into Fig. 14 |

Notes: the thickness callouts in Fig. 14 cannot be read at render resolution. Skipped: Fig. 10 (TTV/warpage maps), Fig. 3 (BLR simulation), Table 2 (credited "Source: DECA"), and the CSAM figures 15-17.

## ectc51909.2023.00180 - Surface-DBHi die tiling (6 figures, 0 manual)
Opened: page_02-04, page_06; cand p02_fig3, p02_fig2, p03_fig9, p04_tablei, p06_tableiv, p06_fig17.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 3 | cross_section | candidate | cross-section of the surface-DBHi package (TVs a, b) |
| -f02 | Fig. 2 | stack_schematic | candidate | stack schematic; source of most of the stack_layers rows |
| -f03 | Fig. 9 | process_flow | candidate | T&R process flow (TV a) |
| -f04 | Table I | data_table | candidate | T&R vs NCP comparison, 24 metric rows |
| -f05 | Table IV | data_table | candidate | T0 electrical test (TV a) |
| -f06 | Fig. 17 | simulation_result | candidate | FEM results across cases 1-5 (TVs c-g) |

Judgment call: Figs. 2 and 3 are tagged with both a and b, because the two TVs share the configuration. Skipped: the joint micrographs (Figs. 4-8, 10-11), the FEM contours (Figs. 12-16), Figs. 18-19, and Tables II-III.

## ectc51906.2022.00108 - MIoS warpage and reliability (6 figures, 0 manual)
Opened: page_01-05; cand p01_fig1, p02_fig2, p04_fig5, p03_tablei, p04_fig7, p05_fig8_2.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 1 | package_photo | candidate | 85x85 mm TV overview; no cross-section exists |
| -f02 | Fig. 2 | stack_schematic | candidate | package stack schematic with warpage modes |
| -f03 | Fig. 5 | warpage_plot | candidate | stiffener-thickness split, most of the warpage metric rows |
| -f04 | Table I | data_table | candidate | FEM substrate legs (TV b), 12 metric rows |
| -f05 | Fig. 7 | warpage_plot | candidate | adhesive split |
| -f06 | Fig. 8 (p.5) | reliability_plot | candidate | stiffener delamination after TC-B |

Notes: the paper numbers two figures "Fig. 8". The one on p.5 is labelled as printed, and the text calls it Fig. 9. The warpage bar axes carry no unit in the figures, so the shows text gives none. Skipped: Fig. 3, Fig. 4, Fig. 6, Fig. 8 on p.4 (rework hysteresis), and Tables II-III.

## eptc67330.2025.11392108 - AiP heterogeneous stacked substrate (6 figures, 6 manual)
Opened: page_02, page_03, page_05; cand p03_fig8, p02_fig3, p02_fig4, p02_fig5, p03_fig6, p03_fig9. All of these candidate crops were clipped at the bottom or offset, so every bbox was re-cropped by hand and the re-crop opened. Fig. 6 and Fig. 9 took two iterations.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 8 | cross_section | manual | AiP cross-section and joint sections; the candidate cut the (c),(d) labels |
| -f02 | Fig. 3 | stack_schematic | manual | A/B/C stack schematic; the candidate clipped substrate C |
| -f03 | Fig. 4 | process_flow | manual | A/B lamination flow; the candidate cut the last row |
| -f04 | Fig. 5 | cross_section | manual | A/B TLPS bond and coaxial via; the candidate clipped the bottom |
| -f05 | Fig. 6 | package_photo | manual | top, bottom and side views plus a dimensioned schematic; the (c),(d) labels are clipped in the source image itself |
| -f06 | Fig. 9 | warpage_plot | manual | shadow-moire warpage table (6 metric rows) |

Skipped because of the 6-figure cap: Fig. 7 (assembly flow), Table II (reliability), Fig. 14 (pop-up), Fig. 15 (void), Fig. 16 (3D X-ray).

## Blockers
None.

## Schema gaps
- No figure_kind exists for a process-metrology plot (dishing depth, peel strength). None was needed in this batch, so none was used.
