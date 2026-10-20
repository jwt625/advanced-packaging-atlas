# Batch f001 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 6 merged papers. Wrote `figures.csv` (36 rows, 6 per paper). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f001` -> `0 errors, 0 warnings`.
tv_ids taken from `data/test_vehicles.csv`; ranking guided by the locators in `data/metrics.csv`, `interconnects.csv`,
`stack_layers.csv`, `process_steps.csv`, `electrical_interfaces.csv`, `optical_interfaces.csv`.
Candidate = bbox and cand_id copied from `candidates.json`, crop opened; manual = re-cropped with `scripts/crop_figures.py`
into the session scratch folder and opened before use. Totals: 17 candidate, 19 manual.
Source quality: only `ectc51906.2022.00244` has `TEXT_LAYER_WARNING.md` (OCR text) and it has no candidates at all, so
all its bboxes are manual, read off the page renders. No source problems in the other five.
All `reprinted` = no (no figure in the chosen set is credited to cited work).

## ectc.2019.00-29 (RDL-1st FOPLP on Gen 3 glass panel) - 6 figures, 1 manual
Pages opened: page_02 (grid), page_05, page_06, page_07. Crops opened: cand p07_fig22, p02_fig1, p03_fig6, p05_fig12,
p02_table1, p06_fig17; manual Table 1.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 22 | cross_section | a | candidate | only SEM cross-section of the built 3-dielectric/2-Cu RDL stack (5 stack_layers, 4 metrics) |
| -f02 | Fig. 1 | stack_schematic | a | candidate | package and RDL layer schematic |
| -f03 | Fig. 6 | process_flow | a | candidate | 9-step RDL-1st flow, cited by many process_steps |
| -f04 | Table 1 | data_table | a | manual | TV2 specification table; candidate p02_table1 cut the caption line |
| -f05 | Fig. 12 | micrograph | b | candidate | via-opening SEM/FIB for the dielectric coupon (6 metrics) |
| -f06 | Fig. 17 | cross_section | c | candidate | PR line cross-sections for the LW/LS coupon |

Not chosen: Fig. 20 (process photo summary), Fig. 19 (UBM plating profile), Fig. 7/9/13 coating profiles, Fig. 23/24 assembly.

## ectc.2016.201 (Intel EMIB) - 6 figures, 3 manual
Pages opened: page_05, page_06, page_07. Crops opened: cand p05_fig4, p08_fig10, p09_fig12; manual Fig. 5, Fig. 7, Table II.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 4 | stack_schematic | a;b | candidate | EMIB cross-section schematic with SEM insets (bump pitches) + TV photo/layout |
| -f02 | Fig. 5 | process_flow | a | manual | 6-step assembly flow; candidate p06_fig5 was a full-width band, no graphics detected |
| -f03 | Table II | data_table | a | manual | bridge attributes (L/S, layers, size); candidate p05_tableii cut the caption |
| -f04 | Fig. 7 | package_photo | b | manual | 5-die/4-bridge TV; candidate p07_fig7 was a full-width band |
| -f05 | Fig. 10 | electrical_plot | c | candidate | measured vs model IL/NEXT (80 samples) |
| -f06 | Fig. 12 | simulation_result | d | candidate | eye-width maps behind the simulated link rows |

Not chosen: Fig. 1 (third-party memory landscape, reproduced with permission), Fig. 2/Table I (technology envelopes of
other MCP technologies), Fig. 6 (bumps; candidate p07_fig6 bbox also misplaced), Fig. 8/9/11.
Judgment: Fig. 4 has no true micrograph cross-section of a full package in the paper; schematic used for rank 1.

## ectc.2011.5898527 (Xilinx 28 nm FPGA on TSV interposer) - 6 figures, 6 manual
Pages opened: page_01 to page_05. Crops opened: cand p02_fig2, p05_fig9; manual Fig. 1(a),(b), Fig. 2, Table 1, Fig. 9,
Table 3, Table 5.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 1(a),(b) | cross_section | a | manual | overall assembly + TSV SEM; no candidate (panels on p.1, caption on p.2) |
| -f02 | Fig. 2 | stack_schematic | a | manual | package configuration; candidate p02_fig2 clipped substrate right/bottom edges |
| -f03 | Table 1 | data_table | a | manual | package spec (body, pitch, TSV, core); no candidate |
| -f04 | Fig. 9 | cross_section | a | manual | C4 and ubump/TSV after 1000 TCB; candidate cut right panel label and caption |
| -f05 | Table 3 | data_table | b | manual | warpage/stress simulation (8 metrics); no candidate |
| -f06 | Table 5 | data_table | b | manual | TSV Si stresses (9 metrics); no candidate |

Not chosen: Fig. 1(c) ubumps on p.2 (split figure; noted in f01), Fig. 3 (sim warpage), Fig. 4 (shadow moire, 1 metric),
Fig. 5-7 and Table 4 (solder fatigue FEM), Fig. 8 (C-SAM), Table 2 (material properties).
has_process_flow: no process-flow figure in this paper (flow is text-only, p.1 Introduction).

## ectc51906.2022.00244 (imec BPR + nano-TSV BSPDN) - 6 figures, 6 manual
OCR text; `candidates.json` empty (no `cand/` folder). Pages opened: page_02, page_03, page_04, page_07. Manual crops
opened: Fig. 7, Fig. 3, Fig. 4, Fig. 13, Fig. 6, Fig. 5.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 7 | cross_section | a;b | manual | TEM of BSM1 Cu / W n-TSV / BPR daisy chain |
| -f02 | Fig. 3 | process_flow | a;b;c | manual | 8-step BSPDN flow (24 process_steps) |
| -f03 | Fig. 4 | process_flow | a;b;c | manual | n-TSV patterning flow, 350 nm Si |
| -f04 | Fig. 13 | electrical_plot | a;b;c | manual | Kelvin/BPR/chain resistance for all 8 options (39 metric rows cite it) |
| -f05 | Fig. 6 | cross_section | a | manual | n-TSV etch landing on BPR, annotated dimensions (4 metrics) |
| -f06 | Fig. 5 | other | a | manual | overlay before/after litho correction (4 metrics); no overlay enum |

Judgment: Fig. 7 tagged a;b only (TEM labels W n-TSV; TV c has Co n-TSV; BPR metal not labelled). Fig. 3 step 4 label
reads 49 um final Si while text says 50 um (noted). Not chosen: Fig. 1/2 (concept illustrations), Fig. 8-12 (test
structure layouts, models).

## ectc51909.2023.00009 (CEA-Leti POPSTAR SiPho interposer) - 6 figures, 1 manual
Pages opened: page_02, page_05. Crops opened: cand p05_fig16, p02_fig3, p02_fig4, p04_fig11, p08_fig27, p06_tablei;
manual Fig. 15.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 16 | cross_section | a | candidate | FIB-SEM of TSV-middle under 4-level BEOL |
| -f02 | Fig. 3 | stack_schematic | a | candidate | full interposer technology cross-section |
| -f03 | Fig. 4 | process_flow | a | candidate | 8-block process flow |
| -f04 | Fig. 15 | cross_section | a | manual | BEOL schematic + FIB-SEM (7 stack_layers); no candidate detected |
| -f05 | Fig. 11 | cross_section | a | candidate | TSV DRIE profile with depth/width labels (3 metrics) |
| -f06 | Fig. 27 | electrical_plot | a | candidate | TSV Kelvin resistance vs diameter (3 metrics + interconnect) |

Not chosen: Table I (optical losses; candidate p06_tablei lacks caption), Fig. 1/2 (ONoC system b, design only),
Fig. 17/18 (backside SEM), Fig. 19-26 (device and BEOL electrical).

## ectc51909.2023.00298 (8-metal-layer RDL on glass panel) - 6 figures, 2 manual
Pages opened: page_02, page_03, page_04. Crops opened: cand p02_fig1, p02_fig2, p03_fig4, p04_fig7, p04_fig8, p04_fig10;
manual Fig. 8, Fig. 7 (each re-cropped once to include full caption width).

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 8 | cross_section | a | manual | only cross-sections (microvia, L/S per layer); candidate clipped scale bar/bottom |
| -f02 | Fig. 1 | stack_schematic | a | candidate | 8ML stack with thicknesses and L/S (17 stack_layers) |
| -f03 | Fig. 2 | process_flow | a | candidate | SAP flow |
| -f04 | Fig. 7 | micrograph | a | manual | 2 um L/S SEM on M4; candidate clipped the SEM data bar |
| -f05 | Fig. 4 | micrograph | a | candidate | 17 um microvias M2-M1 |
| -f06 | Fig. 10 | other | a | candidate | M4 resolution map by coupon (2 metrics); no litho-resolution enum |

Not chosen: Fig. 3 (15 um L/S), Fig. 5 (5 um half-pitch), Fig. 6 (2 um optical), Fig. 9 (seed delamination).

## Schema gaps
- No `figure_kind` for metrology/process-result plots (overlay box plot, lithography resolution map, adhesion): used `other`.
- A figure split across pages (ectc.2011.5898527 Fig. 1) can carry only one page/bbox; panel (c) dropped and noted.
