# Revision report s016 (figures supplement, 2026-10-19)

Scope: `figures.csv` only. No other CSV or evidence file touched. Existing rows keep their bbox; only `rank`/`fig_id`
changed, plus removal of stale "not selected (6-figure cap)" notes on 5 rows (those figures are now included).
Validator: `0 errors, 0 warnings (data/_staging/s016)`. Total rows 46 -> 117.

Ranking used: cross-section/X-ray images, stack schematics, package photos -> process flows -> layouts -> other
schematics/images -> plots/tables (tables carrying many extracted values first).

## ectc32862.2020.00185 (6 -> 23)
Added: Fig. 17 xray_csam (manual; candidate p07_table6 merged Table 6 + Fig. 17), Fig. 10 process_flow (cand),
Fig. 7 process_flow (cand), Fig. 4 process_flow (cand), Fig. 11 package_photo (cand), Fig. 5 package_photo (cand),
Fig. 3 package_photo (cand), Fig. 6 package_photo (cand), Fig. 8 other (cand), Fig. 12 other (cand), Table 5 data_table
(cand), Fig. 13 other (cand), Fig. 14 other (cand), Fig. 16 warpage_plot (cand), Fig. 9 other (manual; candidate cut
lower panel row), Table 2 data_table (cand), Table 6 data_table (manual).
Rank: Fig. 1, Fig. 17, Fig. 2, Fig. 10, Fig. 7, Fig. 4, Fig. 15, Fig. 11, Fig. 5, Fig. 3, Fig. 6, Fig. 8, Fig. 12,
Table 1, Table 4, Table 3, Table 5, Fig. 13, Fig. 14, Fig. 16, Fig. 9, Table 2, Table 6.
Judgment: Fig. 1 kept at rank 1 over Fig. 17 (Fig. 17 is mainly acoustic through-scans; its cross-section panel (g)
does not resolve the RDL stack).

## ectc51687.2025.00233 (5 -> 7)
Added: Fig. 5 micrograph (cand), Table II data_table (manual, incl. caption and footnote).
Rank: Fig. 2, Fig. 3, Fig. 1, Fig. 4, Fig. 5, Table III, Table II.
Skipped: Table I (generic organic/Si/glass comparison, listed as excluded in evidence).

## eptc53413.2021.9663896 (6 -> 21)
Added: Fig. 3 process_flow (cand), Fig. 6 top_view_layout (manual), Fig. 4 top_view_layout (cand), Fig. 5
top_view_layout (cand), Fig. 8 other (cand), Table 2 data_table (manual), Figs. 9, 10, 11, 12, 13, 15, 16, 17 other
(manual; candidates clipped labels or included a neighbouring caption), Fig. 7 other (cand).
Rank: Fig. 1, Fig. 20, Fig. 2, Fig. 3, Fig. 6, Fig. 21, Fig. 4, Fig. 5, Fig. 22, Fig. 8, Table 1, Table 2, Fig. 9,
Fig. 10, Fig. 11, Fig. 12, Fig. 13, Fig. 15, Fig. 16, Fig. 17, Fig. 7.
Skipped: Figs. 18, 19 (TSMC InFO comparison structure attributed to ref [5], not this paper's build); Fig. 14
(pre/post compensation plot, no extracted value cites it).

## ectc32696.2021.00315 (6 -> 13)
Added: Fig. 6 cross_section (cand), Fig. 4 top_view_layout (cand), Fig. 7 simulation_result (cand), Fig. 11
simulation_result (cand), Fig. 5 warpage_plot (cand), Fig. 13 simulation_result (cand), Fig. 8 simulation_result (cand).
Rank: Fig. 10, Fig. 3, Fig. 6, Fig. 2, Fig. 4, Fig. 7, Fig. 11, Table I, Fig. 5, Fig. 9, Fig. 12, Fig. 13, Fig. 8.
Judgment: Fig. 10 (optical joint cross-sections) moved to rank 1 ahead of the Fig. 3 schematic per the
cross-section image > stack schematic rule. Skipped Fig. 1 (generic interposer size roadmap).

## iedm45625.2022.10019499 (6 -> 19)
Added (all manual; page candidates merge boxed figures or are missing): Fig. 17 cross_section, Fig. 18
stack_schematic, Fig. 4 stack_schematic, Fig. 3 stack_schematic, Fig. 12 stack_schematic, Fig. 15 micrograph,
Fig. 9 micrograph, Fig. 20 stack_schematic (conceptual, tv_ids empty), Fig. 8 simulation_result, Fig. 16 other,
Fig. 6 electrical_plot, Fig. 5 other, Fig. 19 electrical_plot.
Rank: Fig. 10, Fig. 7, Fig. 14, Fig. 17, Fig. 2, Fig. 18, Fig. 4, Fig. 3, Fig. 11, Fig. 12, Fig. 15, Fig. 9, Fig. 20,
Fig. 13, Fig. 8, Fig. 16, Fig. 6, Fig. 5, Fig. 19.
Skipped: Fig. 1 (generic table of packaging vs silicon feature sizes).

## ectc51906.2022.00061 (5 -> 7)
Added: Fig. 4 micrograph (manual; candidate included Fig. 3 caption line), Fig. 6 micrograph (cand).
Rank: Fig. 3, Fig. 5, Fig. 1, Fig. 2, Fig. 4, Fig. 6, Table I.

## ectc51906.2022.00218 (6 -> 12)
Added: Fig. 6 cross_section (cand), Fig. 9 package_photo (cand), Fig. 5 micrograph (cand), Fig. 7 other (cand),
Fig. 4 other (cand), Table I data_table (cand).
Rank: Fig. 10, Fig. 3, Fig. 2, Fig. 6, Fig. 9, Fig. 8, Fig. 1, Fig. 5, Table II, Fig. 7, Fig. 4, Table I.

## eptc67330.2025.11392108 (6 -> 15)
Added: Fig. 15 cross_section (manual), Fig. 16 xray_csam (manual), Fig. 7 process_flow (manual), Fig. 10
top_view_layout (manual), Fig. 14 package_photo (cand), Fig. 13 other (manual), Table II data_table (cand),
Fig. 11 electrical_plot (cand), Fig. 12 electrical_plot (cand).
Rank: Fig. 8, Fig. 5, Fig. 15, Fig. 16, Fig. 3, Fig. 6, Fig. 4, Fig. 7, Fig. 10, Fig. 14, Fig. 13, Fig. 9, Table II,
Fig. 11, Fig. 12.
Skipped: Figs. 1, 2 (prior-art AiP structures from refs [2], [3]); Table I (qualitative pros/cons).
