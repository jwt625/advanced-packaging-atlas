# Batch f009 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 4 merged papers. Wrote `figures.csv` (24 rows, 6 per paper). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f009` -> `0 errors, 0 warnings`.
No `TEXT_LAYER_WARNING.md` in any of the 4 papers. tv_ids from `data/test_vehicles.csv`; ranking guided by the
figure/table locators in `data/metrics.csv`, `stack_layers.csv`, `interconnects.csv`, `process_steps.csv`, `components.csv`.
Candidate = bbox and cand_id copied from `candidates.json`; manual = re-cropped with `scripts/crop_figures.py` into the
session scratch folder and opened before use. Totals: 18 candidate, 6 manual.

## tcpmt.2023.3266666 (300 mm wafer-scale Si microchannel cooler) - 6 figures, 0 manual
Crops opened: cand p01_fig1, p02_fig2, p02_fig3, p03_fig4, p04_fig7, p05_fig8, p06_fig9, p07_fig10 (all clean, image only).

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 3 | package_photo | a | candidate | assembled cooler photo with stack inset (wafer / solder / microchannel wafer / glass manifolds) |
| -f02 | Fig. 2 | top_view_layout | a;b | candidate | five glass manifold layers (stack_layers L10-L14 locators) |
| -f03 | Fig. 1 | package_photo | a | candidate | etched microchannel wafer and staggered fin pattern (fin layer L08) |
| -f04 | Fig. 10 | thermal_plot | a;b | candidate | 32 metrics (16 measured upper, 16 simulated lower) |
| -f05 | Fig. 9 | thermal_plot | a;b | candidate | 19 metrics: sensor histogram, averages, simulated match |
| -f06 | Fig. 4 | simulation_result | b | candidate | 8 manifold slit-width simulation metrics |

Not chosen (6-figure cap): Fig. 7 thermal test wafer/heater layout, Fig. 8 pressure drop vs flow (2 metrics), Fig. 5, 6, 11.

## ectc51906.2022.00232 (large multi-chip fan-out reliability, TV1/TV2) - 6 figures, 1 manual
Pages opened: page_02, page_03. Crops opened: cand p02_fig1, p02_fig2, p02_tableii, p02_fig4, p03_fig6, p04_tableiii, p05_fig13, p05_fig14, p05_tablev; manual Fig. 6.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 13 | cross_section | a;b | candidate | only full-package cross-section (die, mold, RDL, C4, underfill, substrate) |
| -f02 | Fig. 1 | stack_schematic | a;b | candidate | package schematic incl. copper stiffener ring |
| -f03 | Fig. 14 | cross_section | a;b | candidate | SEM of the 3-layer RDL (RDL stack_layers locators) |
| -f04 | Table II | data_table | c | candidate | module dims, RDL W/S, C4 pitch (source of most stack/interconnect rows); crop omits caption line |
| -f05 | Fig. 6 | warpage_plot | a;b | manual | TV1 vs TV2 package warpage; candidate included a body-text line |
| -f06 | Table V | data_table | a;b | candidate | 10 reliability metrics; crop omits caption line |

Judgment: Fig. 13/14 tagged a;b because the text says units of both packages were cross-sectioned after reliability without naming which TV is shown (merged metric m10 sits on TV a only).
Not chosen: Fig. 4 module warpage (4 metrics on c), Fig. 2 RDL schematic, Fig. 3 photo/floorplan (no candidate), Tables I, III, IV, Fig. 5, 7-12.

## ectc51906.2022.00135 (Hybrid PLP on 650x650 mm glass panel) - 6 figures, 3 manual
Pages opened: page_03, page_04. Crops opened: cand p04_fig9, p03_fig6, p01_fig1, p02_fig3, p04_table2; manual Fig. 9, Table 1, Table 2.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 9 | cross_section | a | manual | measured RDL layer thicknesses (20 locators); candidate had a text line and clipped the 8.16 um label |
| -f02 | Fig. 6 | stack_schematic | a | candidate | TV structure (8 stack_layers rows) |
| -f03 | Fig. 1 | package_photo | c | candidate | the hybrid platform itself: wafers/sub-panels on the 650 mm glass panel |
| -f04 | Table 1 | data_table | a | manual | inline RDL metrology (21 locators); no candidate detected |
| -f05 | Fig. 3 | process_flow | a | candidate | RDL-first flow (19 locators) |
| -f06 | Table 2 | data_table | a | manual | component-level reliability; candidate ran to the page edge and the next heading |

Not chosen: Fig. 8 warpage bars (no readable y-axis values), Fig. 7 FEA contours, Fig. 2, 4, 5 cost/flow charts.

## tcpmt.2023.3312037 (underfill-on-die control, PVC Co-EMIB) - 6 figures, 1 manual
Pages opened: page_01, page_03, page_04. Crops opened: cand p03_fig6, p01_fig2, p04_fig9, p03_fig7, p04_fig8, p04_tablei; manual Table I.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 6 | cross_section | b | candidate | trench POC (selected HVM path), 17 locators |
| -f02 | Fig. 2 | stack_schematic | a | candidate | UOD failure mode on the package stack (dies, underfill, TIM, heat spreader) |
| -f03 | Fig. 9 | cross_section | e | candidate | sidewall-coating POC SEM |
| -f04 | Fig. 7 | cross_section | c | candidate | top-side coating POC, control vs treated SEM |
| -f05 | Fig. 8 | cross_section | d | candidate | barrier POC optical section |
| -f06 | Table I | data_table | a | manual | comparison of four solution paths (metrics m7-m10); candidate cut the TABLE I label |

Not chosen: Fig. 1 (PVC layout reprinted from [1]), Fig. 4 UOD photo, Fig. 10 HVM trench schematics, Fig. 3, 5 mechanism drawings.
Kind call: Figs. 6-9 combine schematic, top view and cross-section panels; `cross_section` used because the sections carry the result.
