# Batch f002 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 6 merged papers. Wrote `figures.csv` (35 rows). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f002` -> `0 errors, 0 warnings`.
tv_ids from `data/test_vehicles.csv`; ranking guided by the locators in `data/*.csv` and `data/evidence/<paper_id>.yaml`.
Candidate = bbox and cand_id copied from `candidates.json`; manual = re-cropped with `scripts/crop_figures.py` into the
session scratch folder and opened before use. Totals: 9 candidate, 26 manual.
OCR papers (`TEXT_LAYER_WARNING.md`): ectc51906.2022.00106, ectc32696.2021.00166. Both have empty `candidates.json`,
so every bbox there is manual; captions were checked against the page renders.

## ectc51909.2023.00150 (IBM/organic interposer, 40 um pitch microbumps) - 6 figures
Pages opened: page_01, 02, 05, 06. Crops opened: cand p05_fig13, p01_fig1, p02_tablei, p05_fig10, p03_fig4, p03_fig5, p06_fig14; manual Fig. 13, Table I, Fig. 2.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 13 | cross_section | a | manual | only cross-section of the built FPGA/interposer/substrate stack + X-ray; candidate clipped panel (b) |
| -f02 | Fig. 1 | stack_schematic | a | candidate | stack schematic + photo of the assembled module |
| -f03 | Fig. 10 | process_flow | a | candidate | solder transfer and IMS flows (process_steps s03-s11) |
| -f04 | Table I | data_table | a;b | manual | 16 locators (die sizes, pitches, interposer, substrate); candidate cut the caption and merged Fig. 2 |
| -f05 | Fig. 2 | top_view_layout | a | manual | floorplan with 55/26/34 mm dims; no candidate detected |
| -f06 | Fig. 4 | warpage_plot | a | candidate | 4 warpage metrics |

Not chosen: Fig. 5 (asymmetric die position, 3 metrics), Fig. 14 (lidded module/board photo), Fig. 3, 6-9, 11, 12 (Fig. 12 attributed to ref [12]).

## iwlpc52010.2020.9375887 (Nepes 600 mm panel M-Series) - 5 figures
Pages opened: page_01, 03, 04, 05, 06. Crops opened: cand p03_fig5, p05_fig10, p04_fig7; manual Table 1, Table 2, Table 3.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 5 | process_flow | a | candidate | flow plus the only cross-section (SEM of finished M-Series device) |
| -f02 | Table 1 | data_table | a | manual | M-Series package-structure schematic and attributes; no candidate |
| -f03 | Fig. 10 | warpage_plot | a | candidate | 19 locators: segment warpage and TTV |
| -f04 | Table 3 | data_table | b | manual | 23 locators: segmentation usable area; candidate boxed caption and body text |
| -f05 | Table 2 | data_table | a | manual | evaluation plan / specs; candidate pointed at page bottom |

Judgment: Fig. 5 and Table 3 captions say "Source: DECA" (process licensor, no reference number); kept `reprinted: no` with a note,
consistent with the merged rows using them as this paper's data. Only 5 figures: the rest are market charts (Yole, refs), DECA Weibull
(Fig. 1, excluded as ref [1]), generic CSAM schematic (Fig. 9), Fig. 7 (die-position map, 3 locators), Fig. 11/12 layouts not used in rows.

## ectc51906.2022.00106 (IBM DBHi jet-dispensed CUF) - 6 figures, OCR text
Pages opened: page_02, 03, 04. Crops opened: manual Fig. 10, Fig. 1, Fig. 2, Fig. 6, Fig. 7, Table III.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 10 | cross_section | a | manual | assembled module cross-section with uC4 insets |
| -f02 | Fig. 1 | stack_schematic | a;b | manual | module cross-section schematic + 19 mm chip / 2.5x3.5 mm bridge layout (19 locators) |
| -f03 | Fig. 2 | process_flow | a;b | manual | NCP vs CUF flows (20 locators) |
| -f04 | Fig. 7 | stack_schematic | a | manual | 725 um chip / 150 um gap dispense geometry |
| -f05 | Fig. 6 | other | c | manual | slit dot-size test coupon (7 locators); no dispense-metrology enum |
| -f06 | Table III | data_table | a | manual | thermal-cycling result |

Not chosen: Fig. 3 (Si handler), Fig. 4, 5 (dot images), Fig. 8, 9 (SAT/fillet), Tables I-II (attributed to ref [3]).

## ectc32696.2021.00166 (Intel hybrid bonding) - 6 figures, OCR text
Pages opened: page_01, 02, 04, 05, 06. Crops opened: manual Fig. 11, Fig. 2, Fig. 10, Fig. 9, Fig. 6, Table 1.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 11 | cross_section | a | manual | only cross-section of the bonded passive chip |
| -f02 | Fig. 10 | process_flow | a | manual | D2W HB flow (process_steps s01-s09) |
| -f03 | Fig. 2 | process_flow | a | manual | HB vs solder stack and steps (12 locators) |
| -f04 | Fig. 9 | top_view_layout | b | manual | active Foveros test chip: 4 top dies on base die |
| -f05 | Fig. 6 | electrical_plot | e | manual | channel length / eye / energy vs pitch (tv e) |
| -f06 | Table 1 | data_table | f | manual | IO area vs pitch (tv f, 10 locators) |

Not chosen (cap 6): Fig. 8 (passive die photos), Fig. 3-5 (F2F parasitic and side-by-side schematics/plots, tv c/d/e), Fig. 7 (daisy-chain layout), Fig. 1 (scaling trend).

## iedm19573.2019.8993659 (Intel ODI) - 6 figures
Pages opened: page_03, 04. Crops opened: cand p04_fig7, p04_fig6, p03_fig1, p04_fig5; manual Fig. 7, Fig. 6, Fig. 1, Fig. 5, Fig. 8, Fig. 3.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 7 | cross_section | a | manual | side view, cross-section and X-ray of the cavity build; candidate carried Fig. 5 caption |
| -f02 | Fig. 6 | stack_schematic | a | manual | cavity ODI schematic + photo + bump maps (12 locators); candidate carried Fig. 5 caption |
| -f03 | Fig. 1 | stack_schematic | (paper-level) | manual | ODI architecture taxonomy vs Si interposer/EMIB; candidate clipped lower labels |
| -f04 | Fig. 8 | package_photo | b | manual | Cu pillar ODI build; no candidate |
| -f05 | Fig. 3 | simulation_result | c | manual | TSV resistance and cost model (10 locators); no candidate |
| -f06 | Fig. 5 | simulation_result | a | manual | XY process window; candidate clipped panel labels |

Judgment: Fig. 1 left paper-level (taxonomy, not a single TV). Not chosen: Fig. 2 (concept), Fig. 4 (Z window, 4 locators), Fig. 9 (combinations).

## ectc32696.2021.00125 (TSMC CoWoS-R reliability) - 6 figures
Pages opened: page_01-05. Crops opened: cand p02_fig2, p03_fig3, p01_table1, p02_table2, p03_table3, p05_fig8a; manual Table 2, Table 3.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 2 | stack_schematic | a | candidate | SOC+2 HBM2 photo + cross-section schematic |
| -f02 | Fig. 3 | stack_schematic | b | candidate | chiplet package cross-section schematic; panel (a) photo sits in the other column (p.3 left), named in notes |
| -f03 | Table 1 | data_table | a;b | candidate | 24 locators: interposer construction (caption omitted by crop) |
| -f04 | Table 2 | data_table | a | manual | reliability results tv a; candidate cut caption line |
| -f05 | Table 3 | data_table | b | manual | reliability results tv b; candidate cut caption line |
| -f06 | Fig. 8 | simulation_result | b | candidate | RDL stress FE; crop holds (a) and (b), label set to "Fig. 8" |

Judgment: no physical cross-section micrograph in the paper; rank 1-2 are the package schematics, then Table 1 (construction). Not chosen: Fig. 1 (CoWoS-R vs CoWoS-S
concept), Fig. 4-7 (FE bar charts, one metric each).

## Schema gaps
- No `figure_kind` for dispense/process metrology (dot-size slit test) or adhesion; used `other` with a note.
