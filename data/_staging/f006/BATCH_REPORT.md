# Batch f006 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 6 merged papers. Wrote `figures.csv` (35 rows). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f006` -> `0 errors, 0 warnings`.
tv_ids from `data/test_vehicles.csv`; ranking guided by locator counts in the other `data/*.csv` tables.
Candidate = bbox and cand_id copied from `candidates.json` after opening the crop; manual = re-cropped with
`scripts/crop_figures.py` into the session scratch folder and opened before use. Totals: 18 candidate, 17 manual.
`TEXT_LAYER_WARNING.md` present only for ectc51909.2023.00274 (OCR text); captions there were typed from the page images.

## eptc53413.2021.9663896 (Deca/ASE M-Series, 600 mm panel) - 6 figures (3 manual)
Pages opened: page_01-03, 05-07. Crops opened: cand p01_fig1, p02_fig2, p06_fig20, p07_fig21, p07_fig22; manual Table 1, Fig. 20, Fig. 21.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 1 | cross_section | b | candidate | full M-Series structure cross-section |
| -f02 | Fig. 20 | cross_section | b | manual | 15 um via on 30 um Cu stud SEM; candidate clipped bottom label |
| -f03 | Fig. 2 | process_flow | b | candidate | full fully-molded FO-WLP flow (26 locator refs) |
| -f04 | Table 1 | data_table | a | manual | source of most die-shift metrics (62 refs); no candidate detected |
| -f05 | Fig. 21 | top_view_layout | b;c | manual | Gen 1 vs Gen 2 via/stud rules; candidate clipped labels |
| -f06 | Fig. 22 | micrograph | d | candidate | Gen 2 LDI 2 um L/S and 5 um via SEMs |

Not chosen: Table 2 (multi-die model, TV e), Fig. 6/7 (panel layout, format efficiency), Fig. 9-16 histograms/scatter,
Fig. 18/19 (TSMC InFO reference images, Prismark teardown [5]).

## ectc51909.2023.00175 (Amkor S-Connect reliability) - 6 figures (0 manual)
Pages opened: page_02-04. Crops opened: cand p04_fig6, p04_fig8, p02_fig1, p02_fig2, p02_table1, p03_fig3.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 6 | cross_section | a | candidate | mTV1 SEM cross-sections (pillar, ubump, Cu stud) |
| -f02 | Fig. 8 | cross_section | b | candidate | mTV2 photo, SAT, SEM cross-sections |
| -f03 | Fig. 1 | stack_schematic | a;b | candidate | S-Connect package schematic |
| -f04 | Fig. 2 | process_flow | a;b | candidate | six-step chip-last flow (32 refs) |
| -f05 | Table 1 | data_table | a;b | candidate | mTV dimensions/pitches (15 refs); crop omits caption line |
| -f06 | Fig. 3 | simulation_result | c | candidate | EMC DOE warpage simulation (10 refs) |

Not chosen: Fig. 4 (die thickness sim), Fig. 5, Fig. 7 (x-ray), Fig. 9 (measured warpage), Tables 2-4.

## ectc51909.2023.00091 (TSMC CoWoS-L_6x SC-RDL) - 5 figures (2 manual)
Pages opened: page_02-04. Crops opened: cand p02_fig4, p03_table1, p04_table2; manual Fig. 6, Fig. 7.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 4 | stack_schematic | a;b | candidate | CoWoS-L_6x construction (no physical cross-section in paper) |
| -f02 | Fig. 6 | stack_schematic | a | manual | TV_1.6x schematic, top view, warpage maps; no candidate |
| -f03 | Fig. 7 | stack_schematic | b | manual | TV_4.8x schematic, top view, warpage, photo; no candidate |
| -f04 | Table 1 | data_table | a;b | candidate | TV information (35 refs); crop omits caption line |
| -f05 | Table 2 | data_table | a | candidate | early reliability results; crop omits caption |

Not chosen: Fig. 1-3 (prior CoWoS generations), Fig. 5 (insertion loss from Ref. [6], no rows cite it). Only 5 own figures/tables carry TV data.

## ectc32696.2021.00315 (Samsung 85x85 mm MIoS) - 6 figures (1 manual)
Pages opened: page_02-05. Crops opened: cand p02_fig3, p02_fig2, p03_fig10, p03_fig9, p04_fig12, p02_fig5, p05_tablei; manual Table I.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 3 | stack_schematic | a | candidate | package cross-section schematic with heights (14 refs) |
| -f02 | Fig. 2 | package_photo | a | candidate | overhead view of 85x85 mm TV |
| -f03 | Fig. 10 | cross_section | a | candidate | only physical cross-section (joint gap 72.2/69.5 um) |
| -f04 | Table I | data_table | a | manual | reliability results (15 refs); candidate cut first caption line |
| -f05 | Fig. 9 | warpage_plot | a | candidate | measured MIP warpage vs RDL volume |
| -f06 | Fig. 12 | simulation_result | c | candidate | interface stress FEM (7 refs) |

Not chosen: Fig. 5 (warpage before control), Fig. 6 (crack images), Fig. 4, 7, 8, 11, 13.
Judgment: Fig. 3 numbers have no printed units; hover text says so instead of assuming mm.

## ectc51909.2023.00274 (UCLA GaN-IF power delivery) - 6 figures (1 manual)
OCR text source. Pages opened: page_02-07. Crops opened: cand p04_fig5, p06_fig10, p03_fig2, p03_fig3, p06_fig9, p05_fig6; manual Fig. 5.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 5 | cross_section | a | manual | FIB-SEM of 10 um pitch Cu-Cu bond; candidate had two body-text lines |
| -f02 | Fig. 10 | cross_section | b | candidate | PCB-on-dielet-on-wafer cross-sections (Fig. 10(f) 8 refs) |
| -f03 | Fig. 2 | stack_schematic | d | candidate | GaN-IF concept and PDN cross-section schematic |
| -f04 | Fig. 3 | process_flow | a | candidate | dielet-on-GaN-IF flow with temperatures/pressure |
| -f05 | Fig. 9 | micrograph | b | candidate | dielet bonding and pad plating/solder steps |
| -f06 | Fig. 6 | reliability_plot | a | candidate | shear and V-I before/after UHAST |

Not chosen: Fig. 1 (PDN circuit concept), Fig. 4 (top views), Fig. 7 (PL/XRD/Raman), Fig. 8 (PDN flow), Fig. 11 (resistance vs length).
Source note: candidate `p07_fig1` is actually Fig. 11 (OCR read "Figure 1 1").

## iedm45625.2022.10019499 (Intel QMC hybrid bonding) - 6 figures (6 manual)
Pages opened: page_03-04. Crops opened: manual Fig. 10, Fig. 7, Fig. 2 (twice), Fig. 11, Fig. 14, Fig. 13.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 10 | cross_section | a | manual | 3 um pitch bonded pad cross-sections; no candidate |
| -f02 | Fig. 7 | cross_section | a | manual | scaled HB layer stack cross-section; candidate spanned several boxes |
| -f03 | Fig. 2 | stack_schematic | b | manual | QMC architecture (13 refs); candidate cut left labels |
| -f04 | Fig. 11 | process_flow | b | manual | QMC flow (15 refs); candidate bbox offset |
| -f05 | Fig. 14 | cross_section | c | manual | oxide fill cross-section; no candidate |
| -f06 | Fig. 13 | warpage_plot | c | manual | oxide recipe wafer warpage (7 refs); no candidate |

Not chosen: Fig. 6 (link power, TV e), Fig. 8 (contact area model, TV d), Fig. 15 (cracking, FEM TV f), Fig. 19 (TV g), Fig. 9, 12, 16, 17.
Source note: boxed two-column IEEE layout; candidate detection merged or offset most figures on p.3-4.
