# Batch f005 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 6 merged papers. Wrote `figures.csv` (35 rows: 6+6+6+6+6+5). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f005` -> `0 errors, 0 warnings`.
No `TEXT_LAYER_WARNING.md` in any of the 6 papers. tv_ids from `data/test_vehicles.csv`; ranking guided by the
locator counts in `data/metrics.csv`, `interconnects.csv`, `stack_layers.csv`, `process_steps.csv`, `components.csv`.
Candidate = bbox and cand_id copied from `candidates.json`; manual = re-cropped with `scripts/crop_figures.py` into the
session scratch folder and opened before use. Totals: 22 candidate, 13 manual. All `reprinted: no`.

## ectc51529.2024.00144 (TSMC COUPE, SoIC optical engine + enhanced interposer; simulation-only TVs) - 6 figures
Pages opened: page_02-04. Crops opened: cand p02_fig1, p02_fig3, p03_fig7, p04_fig9, p04_tableii; manual Table I, Table II.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 1 | stack_schematic | a | candidate | only build schematic (XPU/MEM/EIC-on-PIC on interposer) |
| -f02 | Fig. 9 | stack_schematic | c | candidate | interposer metal scheme, source of the 4 stack_layers rows |
| -f03 | Fig. 3 | top_view_layout | a;b | candidate | bond-array floorplan ubump 4x3 vs SoIC 5x4 |
| -f04 | Table II | data_table | a;b | manual | 9 laser-power metrics; candidate started at x=0, took the next heading, no caption |
| -f05 | Fig. 7 | optical_plot | a;b | candidate | 6 laser-power metrics |
| -f06 | Table I | data_table | a;b | manual | pitch/array/density ratios; no candidate detected |

Not chosen: Fig. 2 (literature trend, cites other work), Fig. 4/6 (circuit models), Fig. 5 (3 metrics), Fig. 8, Fig. 10, Table III (no candidate).
Judgment: Fig. 7 tagged optical_plot (laser energy per bit); all values in it are simulated.

## ectc32862.2020.00185 (Mold-first FO-PLP on 600 x 600 mm panel) - 6 figures
Pages opened: page_02, 04, 06. Crops opened: cand p02_fig1, p02_fig2, p02_table1, p06_fig15, p04_table3, p04_table4; manual Table 1, 3, 4.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 1 | stack_schematic | a | candidate | package cross-section schematic + layout |
| -f02 | Fig. 2 | process_flow | a | candidate | full mold-first integration flow (a)-(i) |
| -f03 | Fig. 15 | package_photo | a | candidate | photos of each panel step and the singulated package |
| -f04 | Table 1 | data_table | a | manual | package specs (L/S, I/O pitch, thicknesses); candidate excluded caption |
| -f05 | Table 4 | data_table | d;e | manual | 12 sheet-molding metrics; candidate excluded caption |
| -f06 | Table 3 | data_table | a;b | manual | 8 compression-molding metrics; candidate cut the caption |

Not chosen: Fig. 16 (4 warpage metrics; limit of 6), Fig. 6/8 (warpage metrology), Fig. 13/14 (die shift), Table 6 (3 metrics).

## ectc51906.2022.00057 (Sony F2F 1 um / F2B 1.4 um pitch Cu-Cu hybrid bonding) - 6 figures
Pages opened: page_02-05. Crops opened: cand p05_fig14, p05_fig13, p04_fig10, p02_fig3, p03_fig8, p02_fig4; manual Fig. 3, 4, 8, 13, 14.
Several candidate bboxes on this paper sit about 0.01-0.03 too high on the page (clipped bottoms), hence 5 manual crops.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 14 | cross_section | b | manual | HAADF-STEM of F2B bond row; candidate clipped the zoom panel |
| -f02 | Fig. 10 | process_flow | b | candidate | three-wafer flow (F2F, thinning, TSV/pad, F2B) |
| -f03 | Fig. 3 | stack_schematic | a | manual | recessed vs protruded pad concept; candidate cut After Bonding row |
| -f04 | Fig. 8 | electrical_plot | a | manual | contact-resistance CDF of 200K-link chain; candidate cut y-axis title |
| -f05 | Fig. 4 | simulation_result | c | manual | 5 thermal-expansion metrics; candidate cut x-axis title |
| -f06 | Fig. 13 | xray_csam | b | manual | SAM whole-wafer/edge view of F2B stack; candidate offset |

Not chosen: Fig. 1/2 (generic CIS stack evolution), Fig. 5-7 (Cu protrusion bars, 3-4 metrics each), Fig. 9, 11, 12.
Judgment: Fig. 4 x-axis is printed "Cu-Pad size (nm)" while the text discusses um pad sizes; noted in the row.

## ectc51906.2022.00179 (imec BS damascene on TBM carrier, 20-5 um pitch microbumps, N>2 TCB) - 6 figures
Pages opened: page_01, 02, 04, 05. Crops opened: cand p04_fig13, p02_fig4, p01_fig1, p05_fig14, p05_fig15, p05_fig16.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 13 | cross_section | c | candidate | FIB of finished dies: TSV, FS/BS damascene, R-UBM, solder |
| -f02 | Fig. 4 | stack_schematic | a;b | candidate | F2F/F2B bump stack schematics (8 stack_layers rows) |
| -f03 | Fig. 1 | process_flow | b;c | candidate | F2B flow on TBM glass carrier |
| -f04 | Fig. 14 | electrical_plot | d | candidate | 30 N>2 yield metrics + SEM cross-sections |
| -f05 | Fig. 15 | electrical_plot | a | candidate | 16 F2F resistance/yield metrics |
| -f06 | Fig. 16 | reliability_plot | a | candidate | 16 yield-drop-after-stress metrics |

Not chosen: Fig. 2 (bump SEMs, 8 interconnect rows), Fig. 3, 5, 6 (F2B yield, 5 metrics), 7-12, 17-20.
Source note: the Fig. 4 3D render is cut at its bottom in the paper itself, not by the crop.

## ectc51906.2022.00309 (ASE chip-last FOCoS, 1 main die + 8 chiplets) - 6 figures
Pages opened: page_02-04. Crops opened: cand p04_fig9, p03_fig7, p02_fig4, p04_fig10, p04_fig12; manual Table 1, Fig. 4 (twice; first re-crop clipped "patterning").

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 9 | cross_section | a | candidate | full-package cross-section with three zooms |
| -f02 | Fig. 7 | stack_schematic | a | candidate | labelled package structure (die, RDL, microbump, C4, ring, substrate) |
| -f03 | Table 1 | data_table | a | manual | TV specs (5 components, 5 stack_layers, 3 interconnects); candidate covered only top rows |
| -f04 | Fig. 4 | process_flow | a | manual | RDL interposer flow (10 process_steps); candidate included section heading |
| -f05 | Fig. 10 | cross_section | a | candidate | large/small microbump and C4 joints |
| -f06 | Fig. 12 | warpage_plot | a | candidate | 3 warpage metrics, 25 C and 260 C maps |

Not chosen: Fig. 5 (CoW assembly flow, 2 process rows), Fig. 1, 2, 3, 6, 8, 11, 13, Table 2, Table 3.

## ectc51687.2025.00233 (DuPont CYCLOTENE DF-PID TGV filling on glass core) - 5 figures
Pages opened: page_03, 04. Crops opened: cand p03_fig1, p03_fig2, p03_fig3, p04_fig4, p04_tableiii; manual Table III.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 2 | cross_section | a;b | candidate | SEM of DF-PID-filled TGVs; (a)-(b) TV a, (c) TV b |
| -f02 | Fig. 3 | stack_schematic | b | candidate | 2x3-layer RDL on glass core (13 stack_layers rows) + top view |
| -f03 | Fig. 1 | process_flow | a;b | candidate | DF-PID flow (12 process_steps rows); bbox has blank left margin only |
| -f04 | Fig. 4 | top_view_layout | b | candidate | daisy-chain and comb test structures with dimensions |
| -f05 | Table III | data_table | b | manual | reliability conditions/results; candidate excluded caption |

Five, not six: remaining items (Table I organic/Si/glass comparison, Table II material datasheet, Fig. 5 photo) carry 0-1 extracted rows.

## Blockers
None.

## Schema gaps
- No figure_kind for scanning acoustic microscopy alone: SAM image filed under `xray_csam` (fits, as CSAM).
- Combined yield-plot + SEM cross-section figures (00179 Fig. 14) need one kind; filed as `electrical_plot`.
