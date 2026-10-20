# Revision report s033 (figures supplement, 2026-10-20)

Scope: figures.csv only (no other CSV or evidence file touched). Existing rows keep bbox/caption/shows; only fig_id and rank changed by re-ranking. Rule: DevLog-005 decision 2026-10-19 (SKILL.md workflow step 5).

Validator: `uv run python scripts/validate_db.py --staging data/_staging/s033` -> 0 errors, 0 warnings.

## ectc51687.2025.00359

Figures: 6 -> 13. Skipped: none (all 13 printed figures/tables now present). Label Fig. 11 printed twice (p.4, p.5) kept as in previous rows.

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f03 | Fig. 10 | 4 | cross_section | candidate p04_fig10 |
| f04 | Fig. 9 | 4 | cross_section | candidate p04_fig9 |
| f07 | Fig. 4 | 3 | process_flow | candidate p03_fig4 |
| f09 | Fig. 8 | 4 | micrograph | candidate p04_fig8 |
| f10 | Fig. 1 | 2 | other | candidate p02_fig1 |
| f12 | Fig. 6 | 3 | other | candidate p03_fig6 |
| f13 | Table I | 2 | data_table | candidate p02_tablei |

New rank order: 1 Fig. 5 (p.3); 2 Fig. 11 (p.4); 3 Fig. 10 (p.4) *; 4 Fig. 9 (p.4) *; 5 Fig. 2 (p.2); 6 Fig. 3 (p.3); 7 Fig. 4 (p.3) *; 8 Fig. 11 (p.5); 9 Fig. 8 (p.4) *; 10 Fig. 1 (p.2) *; 11 Fig. 7 (p.4); 12 Fig. 6 (p.3) *; 13 Table I (p.2) *  (* = added)

## tcpmt.2026.3717381

Figures: 6 -> 24. Skipped: Fig. 21 (measurement-setup block diagram, not the build; no extracted value). Rank 1 stays the Fig. 2 stack schematic (no cross-section image in paper); photos now precede the process flow.

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f04 | Fig. 16 | 5 | package_photo | candidate p05_fig16 |
| f07 | Fig. 11 | 4 | top_view_layout | candidate p04_fig11 |
| f08 | Fig. 12 | 4 | top_view_layout | candidate p04_fig12 |
| f09 | Fig. 13 | 5 | top_view_layout | candidate p05_fig13 |
| f10 | Fig. 4 | 2 | stack_schematic | candidate p02_fig4 |
| f11 | Fig. 8 | 4 | stack_schematic | candidate p04_fig8 |
| f12 | Fig. 1 | 1 | top_view_layout | candidate p01_fig1 |
| f13 | Fig. 5 | 3 | simulation_result | candidate p03_fig5 |
| f15 | Fig. 17 | 6 | electrical_plot | candidate p06_fig17 |
| f16 | Fig. 19 | 6 | electrical_plot | candidate p06_fig19 |
| f17 | Fig. 22 | 7 | electrical_plot | candidate p07_fig22 |
| f18 | Fig. 23 | 7 | electrical_plot | candidate p07_fig23 |
| f19 | Fig. 18 | 6 | electrical_plot | candidate p06_fig18 |
| f20 | Fig. 6 | 3 | simulation_result | candidate p03_fig6 |
| f21 | Fig. 9 | 4 | simulation_result | candidate p04_fig9 |
| f22 | Fig. 7 | 3 | simulation_result | candidate p03_fig7 |
| f23 | Fig. 14 | 5 | simulation_result | candidate p05_fig14 |
| f24 | Table II | 7 | data_table | candidate p07_tableii |

New rank order: 1 Fig. 2 (p.1); 2 Fig. 20 (p.7); 3 Fig. 15 (p.5); 4 Fig. 16 (p.5) *; 5 Fig. 3 (p.2); 6 Fig. 10 (p.4); 7 Fig. 11 (p.4) *; 8 Fig. 12 (p.4) *; 9 Fig. 13 (p.5) *; 10 Fig. 4 (p.2) *; 11 Fig. 8 (p.4) *; 12 Fig. 1 (p.1) *; 13 Fig. 5 (p.3) *; 14 Table I (p.3); 15 Fig. 17 (p.6) *; 16 Fig. 19 (p.6) *; 17 Fig. 22 (p.7) *; 18 Fig. 23 (p.7) *; 19 Fig. 18 (p.6) *; 20 Fig. 6 (p.3) *; 21 Fig. 9 (p.4) *; 22 Fig. 7 (p.3) *; 23 Fig. 14 (p.5) *; 24 Table II (p.7) *  (* = added)

## ectc51846.2026.00218

Figures: 6 -> 16. Skipped: Fig. 9 (all-pitch summary of Fig. 8 data; no extra extracted value). Cross-section SEMs of the short loops moved ahead of the TV schematic.

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f03 | Fig. 14 | 7 | cross_section | candidate p07_fig14 |
| f04 | Fig. 16 | 7 | cross_section | candidate p07_fig16 |
| f08 | Fig. 10 | 6 | process_flow | candidate p06_fig10 |
| f09 | Fig. 13 | 7 | process_flow | candidate p07_fig13 |
| f10 | Fig. 15 | 7 | process_flow | candidate p07_fig15 |
| f11 | Fig. 2 | 2 | top_view_layout | candidate p02_fig2 |
| f12 | Fig. 7 | 4 | top_view_layout | candidate p04_fig7 |
| f13 | Table 1 | 5 | data_table | candidate p05_table1 |
| f15 | Fig. 12 | 6 | electrical_plot | manual |
| f16 | Fig. 5 | 4 | other | candidate p04_fig5 |

New rank order: 1 Fig. 6 (p.4); 2 Fig. 11 (p.6); 3 Fig. 14 (p.7) *; 4 Fig. 16 (p.7) *; 5 Fig. 1 (p.2); 6 Fig. 4 (p.3); 7 Fig. 3 (p.3); 8 Fig. 10 (p.6) *; 9 Fig. 13 (p.7) *; 10 Fig. 15 (p.7) *; 11 Fig. 2 (p.2) *; 12 Fig. 7 (p.4) *; 13 Table 1 (p.5) *; 14 Fig. 8 (p.5); 15 Fig. 12 (p.6) *; 16 Fig. 5 (p.4) *  (* = added)

## ectc51846.2026.00424

Figures: 6 -> 10. Skipped: Fig. 2 (polyimide chemistry table, not the build). Figs. 1 and 11 are concept drawings, tv_ids empty.

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f04 | Fig. 1 | 2 | process_flow | manual |
| f05 | Fig. 11 | 5 | process_flow | manual |
| f09 | Fig. 7 | 4 | mechanical_plot | manual |
| f10 | Fig. 5 | 4 | mechanical_plot | manual |

New rank order: 1 Fig. 10 (p.5); 2 Fig. 4 (p.3); 3 Fig. 3 (p.3); 4 Fig. 1 (p.2) *; 5 Fig. 11 (p.5) *; 6 Fig. 8 (p.4); 7 Fig. 6 (p.4); 8 Fig. 9 (p.4); 9 Fig. 7 (p.4) *; 10 Fig. 5 (p.4) *  (* = added)

## tcpmt.2024.3443855

Figures: 6 -> 20. Skipped: Fig. 3 (molecular-unit schematic of SiO2 vs SiOCH, not the build). Fig. 7 and Table I were missing from candidates.json (manual).

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f02 | Fig. 7 | 5 | cross_section | manual |
| f03 | Fig. 8 | 5 | cross_section | candidate p05_fig8 |
| f04 | Fig. 20 | 8 | cross_section | candidate p08_fig20 |
| f06 | Fig. 1 | 2 | stack_schematic | candidate p02_fig1 |
| f08 | Fig. 15 | 7 | package_photo | candidate p07_fig15 |
| f11 | Fig. 13 | 7 | process_flow | candidate p07_fig13 |
| f12 | Fig. 5 | 4 | stack_schematic | manual |
| f13 | Fig. 9 | 6 | stack_schematic | manual |
| f14 | Fig. 14 | 7 | micrograph | candidate p07_fig14 |
| f15 | Fig. 12 | 7 | micrograph | candidate p07_fig12 |
| f17 | Table I | 6 | data_table | manual |
| f18 | Fig. 10 | 6 | electrical_plot | manual |
| f19 | Fig. 11 | 6 | electrical_plot | manual |
| f20 | Fig. 18 | 8 | reliability_plot | candidate p08_fig18 |

New rank order: 1 Fig. 17 (p.8); 2 Fig. 7 (p.5) *; 3 Fig. 8 (p.5) *; 4 Fig. 20 (p.8) *; 5 Fig. 2 (p.3); 6 Fig. 1 (p.2) *; 7 Fig. 16 (p.7); 8 Fig. 15 (p.7) *; 9 Fig. 4 (p.4); 10 Fig. 6 (p.5); 11 Fig. 13 (p.7) *; 12 Fig. 5 (p.4) *; 13 Fig. 9 (p.6) *; 14 Fig. 14 (p.7) *; 15 Fig. 12 (p.7) *; 16 Fig. 19 (p.8); 17 Table I (p.6) *; 18 Fig. 10 (p.6) *; 19 Fig. 11 (p.6) *; 20 Fig. 18 (p.8) *  (* = added)

## ectc51687.2025.00142

Figures: 6 -> 13. Skipped: Fig. 1 (generic packaging-level roadmap). Fig. 2 is prior work shown per text (ref. [8]): reprinted yes, tv_ids empty. Figs. 6 and 7 missing from candidates.json (manual).

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f03 | Fig. 5 | 3 | cross_section | manual |
| f05 | Fig. 6 | 4 | cross_section | manual |
| f06 | Fig. 7 | 4 | micrograph | manual |
| f07 | Fig. 2 | 2 | cross_section | manual |
| f08 | Fig. 4 | 3 | other | manual |
| f12 | Table I | 5 | data_table | candidate p05_tablei |
| f13 | Table II | 6 | data_table | candidate p06_tableii |

New rank order: 1 Fig. 8 (p.5); 2 Fig. 11 (p.6); 3 Fig. 5 (p.3) *; 4 Fig. 3 (p.2); 5 Fig. 6 (p.4) *; 6 Fig. 7 (p.4) *; 7 Fig. 2 (p.2) *; 8 Fig. 4 (p.3) *; 9 Fig. 10 (p.6); 10 Fig. 9 (p.5); 11 Fig. 12 (p.6); 12 Table I (p.5) *; 13 Table II (p.6) *  (* = added)

## ectc51846.2026.00106

Figures: 6 -> 7. Only Fig. 2 was missing. Rank 1 kept on the Fig. 5 wafer photo (only image of the actual build); Fig. 1 is a concept drawing.

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f07 | Fig. 2 | 2 | other | candidate p02_fig2 |

New rank order: 1 Fig. 5 (p.3); 2 Fig. 1 (p.2); 3 Fig. 4 (p.3); 4 Fig. 7 (p.4); 5 Fig. 6 (p.3); 6 Fig. 3 (p.2); 7 Fig. 2 (p.2) *  (* = added)

## tcpmt.2026.3740312

Figures: 6 -> 10. All 10 figures now present. Fig. 1 kept rank 1 (TV stack schematic plus FIB sections of In bumps).

Added:

| fig_id | label | page | kind | bbox |
|---|---|---|---|---|
| f04 | Fig. 3 | 3 | micrograph | candidate p03_fig3 |
| f05 | Fig. 2 | 2 | micrograph | manual |
| f06 | Fig. 4 | 3 | micrograph | candidate p03_fig4 |
| f10 | Fig. 10 | 7 | electrical_plot | candidate p07_fig10 |

New rank order: 1 Fig. 1 (p.2); 2 Fig. 5 (p.5); 3 Fig. 6 (p.5); 4 Fig. 3 (p.3) *; 5 Fig. 2 (p.2) *; 6 Fig. 4 (p.3) *; 7 Fig. 7 (p.6); 8 Fig. 8 (p.7); 9 Fig. 9 (p.7); 10 Fig. 10 (p.7) *  (* = added)
