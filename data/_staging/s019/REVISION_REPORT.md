# Revision report s019 (figures supplement, 2026-10-19)

Scope: `figures.csv` only. No other CSV or evidence file touched. Validator: `0 errors, 0 warnings (data/_staging/s019)`.

Ranking applied (SKILL.md step 5, literal order): rank 1 = best view of the physical build (cross-section image > stack
schematic > package photo); then process flow; layout/floorplan; other schematics and images; then plots/tables.
Mixed figures (image + plot) are placed by their main content. Existing rows keep their bbox; only fig_id/rank changed.

## icep55381.2022.9795565 (5 -> 5)
- Added: none (all five figures already present).
- New order: Fig. 4, Fig. 1, Fig. 3, Fig. 2, Fig. 5 (Fig. 1 stack schematic moved ahead of the SEM images and the Fig. 5 plot).

## ectc51909.2023.00053 (5 -> 13)
- Added: Fig. 9 package_photo (candidate p04_fig9); Fig. 10 package_photo (candidate p05_fig10); Fig. 11 top_view_layout (candidate p05_fig11);
  Fig. 12 package_photo (candidate p05_fig12); Fig. 13 top_view_layout (candidate p05_fig13); Fig. 2 micrograph (manual); Fig. 3 micrograph (manual);
  Fig. 4 other (manual; carries the 2,518 IO/mm2 value).
- New order: Fig. 6, Fig. 7, Fig. 5, Fig. 13, Fig. 11, Fig. 9, Fig. 10, Fig. 12, Fig. 8, Fig. 14, Fig. 3, Fig. 2, Fig. 4.
- Rank 1 changed from Fig. 5 (layout) to Fig. 6 (TV die photo + Cu stud SEM). Skipped: Fig. 1 (industry density trend plot).

## eptc56328.2022.10013262 (6 -> 11)
- Added: Fig. 10 process_flow (candidate p04_fig10); Fig. 12 other (candidate p04_fig12); Fig. 11 other (manual, no candidate);
  Fig. 4 other (manual); Fig. 2 other (candidate p01_fig2; carries the 2,518 IO/mm2 value).
- New order: Fig. 8, Fig. 10, Fig. 13, Fig. 6, Fig. 7, Fig. 9, Fig. 4, Fig. 3, Fig. 12, Fig. 11, Fig. 2.
- Skipped: Fig. 1 (SEM of stitched lines attributed to ref [10], not this build); Fig. 5 (qualitative dry film vs liquid resist color table).

## ectc51687.2025.00158 (6 -> 8)
- Added: Fig. 4 stack_schematic (candidate p03_fig4; TMV vs TSV path drawings + normalized R/L bars); Fig. 8 xray_csam (manual).
- New order: Fig. 6, Fig. 3, Fig. 2, Fig. 1, Fig. 7, Fig. 8, Fig. 4, Fig. 5 (rank 1 now the Fig. 6 bridge cross-section).

## ectc51529.2024.00164 (6 -> 8)
- Added: Fig. 3 block_diagram (candidate p03_fig3; test-loop schematic with DUT photo); Fig. 5 thermal_plot (candidate p03_fig5; carries the 1490 W TDP).
- New order: Fig. 2, Fig. 1, Fig. 3, Fig. 4, Fig. 7, Fig. 9, Fig. 8, Fig. 5. Skipped: Fig. 6 (model-vs-experiment error plot).

## ectc51846.2026.00375 (6 -> 9)
- Added: Fig. 1 package_photo (candidate p02_fig1); Fig. 2 other (candidate p02_fig2; coil concept drawing); Fig. 5 electrical_plot (candidate p03_fig5).
- New order: Fig. 3, Fig. 4, Fig. 1, Fig. 2, Fig. 7, Table II, Table I, Fig. 6, Fig. 5 (rank 1 now Fig. 3 with the coil cross-section image).

## ectc51687.2025.00012 (6 -> 15)
- Added: Fig. 9 package_photo (candidate p05_fig9); Fig. 10 package_photo (candidate p05_fig10); Tables II, III, IV, VI, IX, X, XI data_table
  (candidates p03_tableii, p03_tableiii, p04_tableiv, p04_tablevi, p05_tableix, p05_tablex, p05_tablexi; each is the source of extracted metric rows).
- New order: Fig. 1, Fig. 2, Fig. 9, Fig. 10, Table I, Table II, Table III, Table IV, Table V, Table VI, Table VII, Table VIII, Table IX, Table X, Table XI.
- Skipped: Figs. 3-8 (per-unit IL scatter plots duplicating the summary tables).

## ectc51846.2026.00140 (4 -> 4)
- Added: none.
- New order: Fig. 1, Fig. 2, Fig. 3, Fig. 4 (Fig. 2 process flow moved ahead of the Fig. 3 stack schematic per the literal rank order).
