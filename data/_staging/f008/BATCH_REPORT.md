# Batch f008 report (figures_only backfill)

Date: 2026-10-19. Mode: figures_only. Output: `figures.csv` only (36 rows, 6 papers x 6 figures).
Validator: `0 errors, 0 warnings (data/_staging/f008)`.

Per paper: page renders opened, candidate crops opened for every cited candidate, manual re-crops rendered into the
scratch folder and opened to confirm. TV ids taken from merged `data/test_vehicles.csv`; ranking guided by the figure
locators in the merged tables (metrics, process_steps, stack_layers, interconnects).

## ectc51687.2025.00052 - CPO full module test vehicle demonstrations (IBM)
Status: figures_done. Figures: 6 (manual 1). Pages opened: 3, 4, 5, 6, 7.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 6 | package_photo | candidate p05_fig6 | best view of the OTV1/OTV1B builds (lid, flip-chip PIC, BGA, ferrule, cut-out); stack_layers locators |
| -f02 | Fig. 4 | stack_schematic | candidate p04_fig4 | module geometry: PIC, PWG, ferrule, substrate, lid; stack_layers locator |
| -f03 | Table 2 | process_flow | manual | source of all 25 process_steps rows; candidate p05_table2 included right-column body text |
| -f04 | Fig. 8 | optical_plot | candidate p06_fig8 | IL before/after reflow for TV b and c (metrics, optical_interfaces) |
| -f05 | Fig. 10 | reliability_plot | candidate p07_fig10 | JEDEC DTC/HTS/T&H/LTS IL data, 6 metrics rows for TV a |
| -f06 | Fig. 12 | package_photo | candidate p07_fig12 | only view of the 3-PIC module (TV d) |

Skipped: Fig. 1 (generic BW scaling, reprinted [1]), Fig. 2 (prior V-groove card, reprinted [3]), Fig. 3 (CAD views;
candidate p03_fig3 holds only the bottom row; Fig. 4 shows the same geometry), Fig. 5 (stress contours, no values),
Fig. 7, Fig. 9, Fig. 11, Table 1 (qualitative).

## ectc51909.2023.00174 - CoWoS-L architecture (TSMC)
Status: figures_done. Figures: 6 (manual 0). Pages opened: 2, 3, 4, 5.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 2 | stack_schematic | candidate p02_fig2 | CoWoS-L structure (SoC/HBM, RI with LSI and TIV, C4, substrate) |
| -f02 | Fig. 3 | package_photo | candidate p02_fig3 | ring-type and lid-type TV photos (TV b, c) |
| -f03 | Fig. 4 | process_flow | candidate p02_fig4 | RI / CoW / oS flow, 13 process_steps locators |
| -f04 | Fig. 5 | process_flow | candidate p03_fig5 | LSI-1 vs LSI-2 build (TV d, e), 8 process_steps locators |
| -f05 | Fig. 10 | stack_schematic | candidate p04_fig10 | daisy-chain structures behind the interconnect rows |
| -f06 | Fig. 12 | reliability_plot | candidate p05_fig12 | post-TCG/HTS/uHAST chain resistance |

Judgment: Fig. 3 figure labels read 70 mm x 78 mm, text says 70 mm x 76 mm; noted in the row. Candidate captions carried
OCR artifacts ("Ŋmages"); captions typed as printed. Skipped Fig. 1 (roadmap), Figs. 6-9, 11 (data plots; Fig. 12 covers
the chain data after reliability).

## vlsitechnologyandcir46769.2022.9830182 - SoIC_H heterogeneous integration (TSMC, VLSI 2022)
Status: figures_done. Figures: 6 (manual 6). Page opened: 2 (all figures on p.2).

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 1 | stack_schematic | manual | SoIC_H build + interposer SEM; no Fig. 1 candidate (p02_fig2 merged references, Fig. 1, Fig. 2) |
| -f02 | Fig. 4 | data_table | manual | D2D link pitch/IO/array table (TV c, d); candidate p02_fig4 cut the last row |
| -f03 | Fig. 3 | electrical_plot | manual | only measured data (TV b); candidate p02_fig3 cut the panel labels |
| -f04 | Fig. 6 | data_table | manual | fan-out comparison, 4 metrics rows (TV e, f); no candidate (p02_fig7a merged Figs. 6 and 7) |
| -f05 | Fig. 8 | data_table | manual | 12-Hi HBM comparison (TV i, j); candidate p02_fig8 cut the stack labels |
| -f06 | Fig. 7 | simulation_result | manual | SRAM cube comparison, 3 metrics rows (TV g, h); candidate merged with Fig. 6 |

Skipped: Fig. 2 (conceptual architecture block diagrams), Fig. 5 (I/O driver energy plot; Fig. 4 already covers TV c, d).
Note: Fig. 8 table lists 36 um pitch for both uBump and SoIC HBM.

## ectc51906.2022.00038 - 30 um pitch Cu-Cu bonding by microfluidic electroless interconnection (MELI-Cu)
Status: figures_done. Figures: 6 (manual 0). Pages opened: 2, 3, 4.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 4 | xray_csam | candidate p03_fig4 | bonded 30/35/45 um pitch regions (X-ray) + SEM Cu-Cu cross-section in underfill |
| -f02 | Fig. 1 | stack_schematic | candidate p02_fig1 | TV layout: 17,600 pillars, three pitch regions, corner micro-bumps |
| -f03 | Fig. 6 | cross_section | candidate p04_fig6 | 50 um pillar interface void fraction before/after anneal (TV b) |
| -f04 | Fig. 7 | cross_section | candidate p04_fig7 | horizontal side-by-side interconnect (TV c) |
| -f05 | Fig. 5 | micrograph | candidate p04_fig5 | tensile fracture surfaces and modes |
| -f06 | Fig. 2 | other | candidate p02_fig2 | microchannel plating fixture (process equipment) |

Skipped: Fig. 3 (pre-optimization X-ray, superseded by Fig. 4(a)), Table I (loading factor vs mixed potential).

## ectc51687.2025.00063 - Glass substrate cavity, TGV and metallization for CPO
Status: figures_done. Figures: 6 (manual 5). Pages opened: 2, 3, 4.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 4 | cross_section | manual | TGVs inside 75/85 um cavities (TV b, c); candidate p02_fig4 cut the bottom panel |
| -f02 | Fig. 3 | data_table | manual | cavity shape table, 6 metrics rows (TV a); candidate cut last row and (b) label |
| -f03 | Fig. 9 | package_photo | manual | RDL-in-cavity 6-inch wafer (TV d); candidate p04_fig9 clipped the wafer bottom |
| -f04 | Fig. 6 | cross_section | manual | PR thickness vs spray rounds; candidate cut bottom panel |
| -f05 | Fig. 8 | other | candidate p04_fig8 | PR thickness at 4 sites, 4 metrics rows |
| -f06 | Fig. 7 | micrograph | manual | LDI patterns (min L/S ~2 um); candidate included body text and cut bottom row |

Skipped: Fig. 1 (concept, reprinted [1]), Fig. 2 (small SEM strip of blind cavity; Fig. 3 covers TV a), Fig. 5.
Candidate bboxes on this paper were systematically shifted upward relative to the page renders.

## ectc51909.2023.00307 - CMOS chips with backside buried metal (BBM) PDN, 3D stacking
Status: figures_done. Figures: 6 (manual 1). Pages opened: 2, 3, 4, 5. TEXT_LAYER_WARNING present (OCR text);
captions and labels checked against the page images.

| fig_id | label | kind | source | why |
|---|---|---|---|---|
| -f01 | Fig. 9 | cross_section | candidate p05_fig9 | four-tier stack and bump joint (TV b), 3 metrics rows |
| -f02 | Fig. 8 | cross_section | candidate p05_fig8 | BBM layer 10.5 um and signal TSV 10 x 39 um (TV a) |
| -f03 | Fig. 3 | process_flow | candidate p03_fig3 | full (a)-(r) flow, ~20 process_steps locators |
| -f04 | Fig. 6 | micrograph | candidate p04_fig6 | 8 x 12 mm chip front/back, 15 um BBM mesh |
| -f05 | Fig. 7 | warpage_plot | candidate p04_fig7 | 77 um chip warpage |
| -f06 | Fig. 5 | other | manual | bonding profile (573 K, 392 mN); no candidate (p04_tablei merged Table I and Fig. 5) |

Skipped: Fig. 1, Fig. 2 (concept schematics), Fig. 4 (Si burr SEM), Table I (plating recipe).

## Blockers
None.

## Schema gaps
- No figure_kind for process-condition profiles (bonding temperature/load vs time) or fixtures; used `other`.
- No figure_kind for metrology plots that are not warpage/electrical/optical (PR thickness profiles); used `other`.
