# Batch f004 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 6 merged papers. Wrote `figures.csv` (36 rows, 6 per paper). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f004` -> `0 errors, 0 warnings`.
No `TEXT_LAYER_WARNING.md` in any of the 6 papers. tv_ids taken from `data/test_vehicles.csv`; ranking guided by the
locators in `data/metrics.csv`, `interconnects.csv`, `stack_layers.csv`, `process_steps.csv`, `optical_interfaces.csv`
and `data/evidence/<paper_id>.yaml`.
Candidate = bbox and cand_id copied from `candidates.json`; manual = re-cropped with `scripts/crop_figures.py` into the
session scratch folder and opened before use. Totals: 29 candidate, 7 manual.
Tables use kind `data_table` (convention in `data/figures.csv`); the content (warpage, reliability) is in `shows`.

## ectc51529.2024.00227 (imec CoD2W PIC dies on optical interconnect wafer) - 6 figures
Pages opened: page_01-05. Crops opened: cand p01_fig1, p02_fig2, p02_fig3, p03_fig6, p04_fig7, p04_fig8, p05_fig10.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 7 | stack_schematic | a;b | candidate | only labelled stack (Si 100 um, RL 200 nm, TBM 30 um, glass 700 um); defines the two TVs |
| -f02 | Fig. 3 | process_flow | a;b | candidate | CoD2W assembly flow (steps 1-6) |
| -f03 | Fig. 2 | process_flow | a;b | candidate | PIC die preparation flow (thinning, BS marks, dicing) |
| -f04 | Fig. 8 | xray_csam | b | candidate | optimized flow: 96% transfer, alignment histogram (TV b metrics m3-m9) |
| -f05 | Fig. 10 | optical_plot | b | candidate | EVC loss vs misalignment (optical_interfaces o1-o3) |
| -f06 | Fig. 6 | xray_csam | a | candidate | first flow: transfer, SAM, alignment (TV a metrics m17-m21) |

Not chosen: Fig. 1 (concept schematic, no dimensions), Fig. 4 and 5 (TV a warpage/alignment before strip; Fig. 7 and 6 cover the same TV), Fig. 9.
Judgment: Fig. 8 printed caption omits "A)" before "Target wafer"; kept as printed. Fig. 6/8 kind `xray_csam` although they mix photo, SAM and histogram panels (noted).

## ectc51529.2024.00092 (LMCT TGV wet etch, glass panels) - 6 figures
Pages opened: page_02-04. Crops opened: cand p02_fig3, p02_fig4, p03_fig5, p03_fig6, p03_table1, p04_fig8; manual Table 1.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 4 | micrograph | a | candidate | only image of the built TGV array (75 um pitch, 49.49 um via) |
| -f02 | Fig. 6 | process_flow | b | candidate | HVM tool flow, source of process_steps b-s01..s06 |
| -f03 | Fig. 5 | micrograph | a | candidate | via diameter vs etch time (metrics a-m1..m5) |
| -f04 | Fig. 3 | other | d | candidate | AR matrix (12 metrics, 3 interconnects of TV d) |
| -f05 | Table 1 | data_table | c | manual | 11 glass etch rates; candidate included the Sec. D heading and blank margin |
| -f06 | Fig. 8 | other | b | candidate | within-panel etch uniformity map (sigma/avg 0.4%) |

Not chosen: Fig. 1 (generic LMCT cartoon), Fig. 2 (hourglass via definition schematic, no numbers), Fig. 7 (APC block diagram), Fig. 9, Fig. 10.
Judgment: no cross-section in the paper, so the via-array micrograph is rank 1.

## ectc51906.2022.00176 (TSMC SoIC 3 um bond pitch CoW) - 6 figures
Pages opened: page_02-04. Crops opened: cand p02_tablei, p03_tableii, p04_fig4, p04_fig5, p04_tableiii; manual Fig. 3.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 3 | top_view_layout | a | manual | only depiction of the TV (daisy-chain layout + IV); candidate p04_fig3 boxed the top of p.4, graphics are on p.3 |
| -f02 | Table I | data_table | d | candidate | scaling roadmap, 15 metric rows |
| -f03 | Fig. 4 | electrical_plot | a | candidate | daisy-chain yield vs die shift |
| -f04 | Fig. 5 | electrical_plot | a;b | candidate | Kelvin Rc vs temperature, SoIC4 vs SoIC1 |
| -f05 | Table II | simulation_result | c | candidate | FEM stress contours (TV c) |
| -f06 | Table III | data_table | a | candidate | die-level reliability |

Not chosen: Fig. 1 (market chart), Fig. 2 (IR alignment images).
Judgment: no cross-section or stack drawing exists, so the layout figure is rank 1. Fig. 3 page = 3 (panels), caption on p.4; existing DB locators cite "p.4 Fig. 3". Table II printed caption duplicates the Table I title (source error), kept as printed and noted.

## iwlpc52010.2020.9375855 (Samsung X-Cube / SAINT-S) - 6 figures
Pages opened: page_03-05. Crops opened: cand p03_fig3, p04_fig4, p04_fig6, p05_fig10; manual Fig. 5, Fig. 3, Table 1, Fig. 6, Fig. 10.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 5 | cross_section | a | manual | only cross-section; candidate p04_fig5 also contained Table 1 |
| -f02 | Fig. 3 | stack_schematic | a;b | manual | dimensioned schematic (most TV values); candidate clipped the 0.4 mm label |
| -f03 | Table 1 | data_table | a | manual | qualification results; no candidate detected |
| -f04 | Fig. 6 | block_diagram | b | manual | SAINT-S interface (760 MHz, 128x2 TSV); candidate clipped bottom; reprinted: yes (cites [10]) |
| -f05 | Fig. 4 | package_photo | a | candidate | package TV photo |
| -f06 | Fig. 10 | package_photo | b | manual | functional test board; candidate clipped bottom edge |

Not chosen: Fig. 1 (CoW/CoS cartoon), Fig. 2 (generic X-Cube schematic, Fig. 3 supersedes), Fig. 7 (reprinted [11]), Fig. 8-9 (design flows, reprinted [12]).
Judgment: Fig. 6 marked reprinted because the caption cites [10] (likely the authors' own prior paper).

## ectc32696.2021.00033 (TSMC InFO_oS 2.5x reticle) - 6 figures
Pages opened: page_02-05. Crops opened: cand p02_fig2, p02_fig3, p02_fig4, p03_tablei, p05_tablevi, p05_tablevii.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 2 | stack_schematic | (paper-level) | candidate | only cross-section drawing; generic InFO_oS, not tied to one TV |
| -f02 | Fig. 3 | data_table | a | candidate | key-feature table printed as a figure (pitches, RDL L/S, sizes) |
| -f03 | Fig. 4 | top_view_layout | a;b | candidate | floor plans + package photo |
| -f04 | Table I | data_table | a;c;d | candidate | warpage model vs experiment, 12 metrics |
| -f05 | Table VI | data_table | a;c;d;e | candidate | C4 fatigue risk and build parameters, 10+ rows |
| -f06 | Table VII | data_table | a | candidate | reliability results |

Not chosen: Fig. 5-7 (daisy-chain map, resistance CDF, X-ray), Fig. 8-9 and Tables II-V (TV f simulation models). Six-figure cap.
Judgment: Fig. 9 printed caption duplicates Fig. 8 (shows PDN layers), not chosen anyway.

## ectc51529.2024.00088 (ABF dry etch with DFR mask) - 6 figures
Pages opened: page_02-04. Crops opened: cand p02_fig1, p02_fig2, p03_fig3, p03_fig4, p03_fig5, p04_fig6.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 6 | cross_section | a | candidate | FIB/SEM of final vias/trenches, most dimension rows |
| -f02 | Fig. 1 | process_flow | a | candidate | full flow schematic |
| -f03 | Fig. 4 | cross_section | a | candidate | etch rate/selectivity source (step profiles + SEM) |
| -f04 | Fig. 5 | micrograph | a | candidate | post-strip vias/trenches and depth profiles |
| -f05 | Fig. 2 | micrograph | a | candidate | patterned DFR, CD/pitch matrix |
| -f06 | Fig. 3 | cross_section | a | candidate | DFR side-view SEM (15 um DFR) |

Not chosen: none (paper has 6 figures).

## Scratch
Re-crops and the build helper (`build_figures.py`) are in the session scratch folder `f004/`, not in the repo.
