# Revision report s029 (figures supplement, 2026-10-20)

Scope: `figures.csv` only. All other CSVs and evidence YAML untouched. Existing rows keep bbox, caption and shows;
only `fig_id`/`rank` were renumbered (plus one notes edit, ectc51687.2025.00090 Fig. 4(a)(b)).
Rank order applied: rank 1 = best view of the build; then process flow, layout/floorplan, other schematics and
images; then plots/tables. Every added crop was opened (candidate png or manual re-crop in the scratch folder).
Validator: `0 errors, 0 warnings (data/_staging/s029)`. Figures: 46 before, 108 after.

## ectc51846.2026.00130 (6 -> 15)
Added:
- Fig. 1, top_view_layout, manual (candidate clipped bottom pad row)
- Fig. 11, stack_schematic, candidate p04_fig11
- Fig. 8, micrograph (PED grain maps), manual (candidate clipped scale bars)
- Fig. 4, xray_csam (overlay maps + CSAM), candidate p03_fig4
- Fig. 3, micrograph (AFM image + recess plot), manual (candidate clipped x-axis title)
- Fig. 12, electrical_plot, manual (panels on p.4; candidate p05_fig12 blank)
- Fig. 6, electrical_plot, manual (candidate clipped x-axis title)
- Fig. 9, other (AFM Cu expansion), manual (candidate clipped x-axis titles)
- TABLE I, data_table, manual (candidate omitted title)

Rank: Fig. 2(b), Fig. 2, Fig. 1, Fig. 11, Fig. 5, Fig. 8, Fig. 4, Fig. 3, Fig. 13, Fig. 7, Fig. 10, Fig. 12, Fig. 6, Fig. 9, TABLE I

## icep61562.2024.10535587 (5 -> 5)
No additions: all five figures already present; page renders show no other figure. Order unchanged.

Rank: Figure 2, Figure 4, Figure 3, Figure 5, Figure 1

## vlsitechnologyandcir65830.2026.11577374 (6 -> 12)
Added:
- Fig. 12, cross_section (TSV chain SEM + schematic), candidate p03_fig12
- Fig. 8, stack_schematic (interconnection design), candidate p03_fig8
- Fig. 5, xray_csam (CSAM per interface + stack schematic), manual (candidate clipped bottom maps)
- Fig. 3, block_diagram, candidate p02_fig3
- Fig. 10, reliability_plot (EM), candidate p03_fig10
- Fig. 11, electrical_plot (CP waveforms, shmoo), candidate p03_fig11

Rank: Fig. 7, Fig. 2, Fig. 4, Fig. 12, Fig. 1, Fig. 8, Fig. 6, Fig. 5, Fig. 3, Fig. 9, Fig. 10, Fig. 11

## tcpmt.2025.3628798 (6 -> 34)
Added (all candidate crops, verified complete):
- process_flow: Fig. 7 (p03_fig7)
- stack_schematic: Fig. 5 (p03_fig5), Fig. 3 (p02_fig3), Fig. 4 (p02_fig4), Fig. 25 (p08_fig25), Fig. 29 (p09_fig29), Fig. 30 (p10_fig30)
- cross_section: Fig. 21 (p07_fig21), Fig. 27 (p09_fig27), Fig. 23 (p08_fig23), Fig. 24 (p08_fig24), Fig. 28 (p09_fig28)
- micrograph: Fig. 10, 11, 8, 14, 16, 17, 12, 31, 32, 33 (p04_fig10, p04_fig11, p03_fig8, p05_fig14, p05_fig16, p06_fig17, p04_fig12, p10_fig31, p10_fig32, p11_fig33)
- package_photo: Fig. 19 (p06_fig19)
- plots/tables with extracted values: Fig. 6 other (p03_fig6), Fig. 13 other (p04_fig13), Fig. 18 other (p06_fig18), Fig. 26 mechanical_plot (p08_fig26), TABLE I data_table (p06_tablei)

Skipped: Fig. 1 (generic chiplet illustration, cited [1]), Fig. 2 (industry roadmap, cited [3]), Fig. 35 (In-In yield; no
values extracted, TV d notes say numeric yield excluded). Figs. 3, 4, 29, 30 are concept schematics: tv_ids empty
(Figs. 4, 29, 30) or the WLUF/CUF routes (Fig. 3).

Rank: Fig. 22, Fig. 15, Fig. 9, Fig. 7, Fig. 5, Fig. 3, Fig. 4, Fig. 25, Fig. 29, Fig. 30, Fig. 21, Fig. 27, Fig. 23, Fig. 24,
Fig. 28, Fig. 34, Fig. 10, Fig. 11, Fig. 8, Fig. 14, Fig. 16, Fig. 17, Fig. 12, Fig. 19, Fig. 31, Fig. 32, Fig. 33, Fig. 20,
Table II, Fig. 6, Fig. 13, Fig. 18, Fig. 26, TABLE I

## ectc51687.2025.00326 (6 -> 13)
Added:
- Fig. 4, process_flow (damascene), candidate p03_fig4
- TABLE I, micrograph (STEM + EDX Ti maps before/after plasma etch), manual (no candidate)
- Fig. 7, other (undulation rate), manual (candidate clipped x-axis title)
- Fig. 9, electrical_plot (daisy chain), manual (candidate clipped x-axis title)
- Fig 11, electrical_plot (SAP vs damascene), manual (candidate clipped x-axis title)
- Fig. 12, reliability_plot (b-HAST), candidate p05_fig12
- Fig. 2, simulation_result (Bossung), manual (candidate clipped x-axis titles)

Rank: Fig. 8, Fig. 1, Fig. 4, Fig. 3, TABLE I, Fig. 5, Fig. 10, Fig. 6, Fig. 7, Fig. 9, Fig 11, Fig. 12, Fig. 2

## ectc51906.2022.00113 (6 -> 12)
Added:
- TABLE I, top_view_layout (pad-shape diagrams), candidate p02_tablei
- Figure 1, micrograph (interface image + EDS line scan), manual (candidate spanned whole column top)
- Figure 5, micrograph (AFM), manual (candidate pointed at caption; panels at p.3 bottom left)
- Figure 4, other (IR image of Maszara blade test), candidate p03_fig4
- TABLE III, data_table, candidate p04_tableiii
- Figure 6, other (surface energy), candidate p03_fig6

Rank: Figure 8, Figure 2, TABLE I, Figure 3, Figure 1, Figure 7, Figure 5, Figure 4, TABLE IV, TABLE II, TABLE III, Figure 6

## ectc51687.2025.00090 (6 -> 12)
Added:
- Fig. 4(c)(d), micrograph (tilted and top-view SEM of 2/2 um lines), manual (no candidate); f01 note updated
- Fig. 8, package_photo, candidate p04_fig8
- Fig. 5, other (bump thickness uniformity), candidate p03_fig5
- Fig. 7, warpage_plot, manual (candidate merged Tables 1 and 2)
- Table 1, data_table, manual (no candidate)
- Table 2, data_table, manual (no candidate)

Rank: Fig. 4(a)(b), Fig. 2, Fig. 1, Fig. 4(c)(d), Fig. 6, Fig. 8, Fig. 3, Table 3, Fig. 5, Fig. 7, Table 1, Table 2

## icep-iaac64884.2025.11002987 (5 -> 5)
No additions: Figs. 1-4 already present (Fig. 4 split into two rows); 2-page paper, no other figures. Order unchanged.

Rank: Fig. 4(c), Fig. 4(a)-(b), Fig. 3, Fig. 1, Fig. 2

## Issues
- tcpmt.2025.3628798 Fig. 3 and Fig. 4 captions both list panels (a)-(d) for top die/bonding; Fig. 3 itself is a comparison
  table. Captions entered as printed.
- icep61562.2024.10535587 Figure 1 (equipment/FOUP photo, not the build) kept at its existing last rank.
