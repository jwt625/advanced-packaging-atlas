# Revision report s023 (figures supplement, 2026-10-20)

Scope: `figures.csv` only (key-figure rule 2026-10-19, DevLog-005). Other CSVs and evidence untouched.
Existing rows keep their bbox; only fig_id/rank changed, plus 2 stale notes updated (listed below).
Every new crop was opened (candidate png or manual re-crop in the session scratch folder).
Validator: `uv run python scripts/validate_db.py --staging data/_staging/s023` -> 0 errors, 0 warnings.

## ectc51909.2023.00268 (6 -> 9)
Added:
- Figure 4, top_view_layout (exposure-field layout), candidate p02_fig4
- Figure 3, stack_schematic (generic bridge vs RDL 2.xD), candidate p02_fig3
- Figure 9, micrograph (via-pad top views, profiles, 3D maps), candidate p04_fig9
Skipped: Figure 1 (generic roadmap), Figure 2 (area-efficiency plot, no extracted values).
Rank: f01 Fig 10, f02 Fig 4, f03 Fig 7, f04 Fig 5, f05 Fig 3, f06 Fig 11, f07 Fig 9, f08 Fig 8, f09 Fig 6.

## ectc51846.2026.00050 (6 -> 19)
Added:
- Fig. 17, process_flow, manual (candidate cut Step-6 label)
- Fig. 4, stack_schematic, candidate p03_fig4
- Fig 15, stack_schematic, manual (candidate cut BGA balls)
- Fig. 18, stack_schematic, candidate p05_fig18
- Fig. 7, package_photo, candidate p03_fig7
- Fig. 12(b),(c), xray_csam (C-SAM), candidate p04_fig12a
- Fig. 10, package_photo, candidate p03_fig10
- Fig. 9, package_photo, candidate p03_fig9
- Fig. 8, package_photo, candidate p03_fig8 (tv_ids empty: no TV for this sub-assembly)
- Fig. 2, micrograph, candidate p02_fig2
- Fig. 6, other (tiling sketch), candidate p03_fig6
- Table 1, data_table, candidate p04_table1
- Fig. 16, simulation_result, candidate p05_fig16
Skipped: Fig. 3 (CFD image, no extracted values).
Note changed: Fig. 12(a) row note now says panels (b),(c) are a separate row.
Rank: f01 Fig 13, f02 Fig 1, f03 Fig 17, f04 Fig 14, f05 Fig 11, f06 Fig 4, f07 Fig 15, f08 Fig 18, f09 Fig 12(a),
f10 Fig 7, f11 Fig 12(b),(c), f12 Fig 10, f13 Fig 9, f14 Fig 8, f15 Fig 2, f16 Fig 6, f17 Table 1, f18 Fig 5, f19 Fig 16.

## ectc51529.2024.00023 (6 -> 10)
Added:
- Fig. 1, top_view_layout (panel layouts), candidate p01_fig1
- Fig. 8, simulation_result, candidate p04_fig8
- Table 1, data_table, candidate p02_table1
- Fig. 3, optical_plot, candidate p03_fig3
Rank: f01 Fig 5, f02 Fig 2, f03 Fig 1, f04 Fig 4, f05 Fig 7, f06 Fig 8, f07 Fig 6, f08 Table 1, f09 Table 2, f10 Fig 3.

## eptc59621.2023.10457918 (6 -> 11; no candidates, garbled text layer)
Added (all manual):
- Fig.5, top_view_layout (interposer scribe map)
- Fig.6, top_view_layout (processor scribe map)
- Fig. 7, top_view_layout (die disassociation sequence; no printed caption, label from text)
- Unnumbered photo, package_photo (diced trapezoidal glass dies; no number or caption printed)
- Tab.4, data_table (optics chips)
Note changed: Tab.3 note "Tab. 4 (optics chips) not chosen." cleared (now chosen).
Rank: f01 Fig.4, f02 Tab.1, f03 Fig.1, f04 Fig.5, f05 Fig.6, f06 Fig. 7, f07 Unnumbered photo, f08 Fig.2, f09 Tab.2,
f10 Tab.3, f11 Tab.4.

## ectc51529.2024.00128 (6 -> 11)
Added:
- Fig. 7, micrograph (tilted SEM / X-SEM), manual (no candidate)
- Fig. 9, micrograph (AFM), manual (candidate held only panel b)
- Fig. 12, other (daisy-chain 3D renderings), candidate p05_fig12a
- Fig. 3, stack_schematic (generic HB architectures), manual (candidate held only caption)
- Fig. 4, electrical_plot, candidate p03_fig4
Skipped: Fig. 1 (spectrum/roadmap plot), Fig. 2 (generic comparison table, no extracted values).
Rank: f01 Fig 11, f02 Fig 5, f03 Fig 6, f04 Fig 7, f05 Fig 10, f06 Fig 9, f07 Fig 12, f08 Fig 3, f09 Fig 8, f10 Fig 13, f11 Fig 4.

## ectc51529.2024.00064 (6 -> 6)
No additions: Figs 1-6 already present; Table 1 is qualitative (no values). Rank order unchanged.

## ectc51687.2025.00085 (6 -> 16)
Added:
- Fig. 3, top_view_layout (heater/sensor), manual (candidate cut labels)
- Fig. 4, block_diagram (heater connection), manual (candidate cut bottom)
- Fig. 6, other (model geometry), candidate p03_fig6
- Fig. 10, other (impingement cold plate + model), manual (no candidate; panels p.4, caption p.5)
- Fig. 5, other (test rig), manual (candidate cut base)
- Fig. 12, stack_schematic, manual (cited liquid-manifold work [12],[13]; reprinted left empty)
- Table 4, data_table, candidate p03_table4
- Fig. 8, thermal_plot, manual (candidate cut x-axis title)
- Table 5, data_table, manual (candidate cut power row)
- Fig. 11, thermal_plot, candidate p05_fig11
Skipped: Fig. 7 (not used for extracted values).
Rank: f01 Fig 1, f02 Fig 2, f03 Fig 3, f04 Fig 4, f05 Fig 6, f06 Fig 10, f07 Fig 5, f08 Fig 12, f09 Table 1, f10 Table 2,
f11 Table 3, f12 Table 4, f13 Fig 9, f14 Fig 8, f15 Table 5, f16 Fig 11.

## eptc59621.2023.10457652 (6 -> 12; OCR paper, no candidates)
Added (all manual):
- Fig. 3, stack_schematic (TM model 2)
- Fig. 5, simulation_result
- Fig. 6, simulation_result
- Fig. 7, simulation_result
- Fig 1 (p.4, second Fig 1, Multiphysics), mechanical_plot
- Fig 2 (p.4, second Fig 2, Multiphysics), simulation_result
Rank: f01 Fig 2, f02 Fig 1, f03 Fig 3, f04 Fig 8, f05 Fig 9, f06 Fig 4, f07 Fig 5, f08 Fig 6, f09 Fig 7, f10 Fig 10,
f11 Fig 1 (p.4), f12 Fig 2 (p.4).

## Ranking convention used
Rank 1 = existing best physical-build view; then process flows, layouts, other schematics/images (cross-sections,
stack schematics, photos, C-SAM, micrographs, rigs), then plots/tables (existing relative order kept).
