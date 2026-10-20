# Batch f003 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 6 merged papers. Wrote `figures.csv` (36 rows, 6 per paper). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f003` -> `0 errors, 0 warnings`.
No `TEXT_LAYER_WARNING.md` in any of the 6 papers. tv_ids taken from `data/test_vehicles.csv`; ranking guided by the
locators in `data/metrics.csv`, `interconnects.csv`, `stack_layers.csv`, `process_steps.csv` and the other tables.
Candidate = bbox and cand_id copied from `candidates.json`; manual = re-cropped with `scripts/crop_figures.py` into the
session scratch folder and opened before use. Greek mu in captions written as "u" (ASCII, as in f000).
All 36 crops re-rendered with `crop_figures.py --staging` (36 written). Totals: 21 candidate, 15 manual.

## ectc.2013.6575597 (TSMC CoWoS reliability, 2013) - 6 figures
Pages opened: page_02, 03, 05, 06. Crops opened: cand p02_fig1, p02_fig2, p02_fig3, p05_fig13; manual Fig. 1, 2, 3, 13, Table 1, Fig. 16.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 2 | stack_schematic | a | manual | only build cross-section (schematic + 3D X-ray); candidate clipped BGA balls and inset bottom |
| -f02 | Fig. 1 | package_photo | d;a | manual | CoW wafer and finished CoWoS photos; candidate clipped photo bottoms |
| -f03 | Fig. 3 | top_view_layout | a | manual | die placement (C + 2x D); candidate clipped bottom edge |
| -f04 | Table 1 | data_table | d | manual | 9 TC metrics for TV d; no candidate detected |
| -f05 | Fig. 16 | reliability_plot | b | manual | 9 mechanical-shock metrics; no candidate detected |
| -f06 | Fig. 13 | reliability_plot | c | manual | 6 power-cycling metrics; candidate clipped x-axis label |

Not chosen: Table 2 (shock conditions; Fig. 16 carries the results), Figs. 4-12, 14, 15, 17.
Judgment: Fig. 13 has no numeric tick labels; shows text names only series conditions.

## ectc51906.2022.00303 (UCLA TSV-less power delivery, Si-IF) - 6 figures
Pages opened: text pages 1-6 (renders via candidates and re-crops). Crops opened: cand p05_fig7, p04_fig5, p02_fig2, p03_fig3, p06_fig9, p03_fig4; manual Fig. 7, 2, 9.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 7 | cross_section | d | manual | fabricated TPV cross-sections, most stack/metric rows for TV d; candidate had Fig. 6 caption line |
| -f02 | Fig. 5 | process_flow | c | candidate | full TSV-less flow (a)-(f), source of process_steps for TV c |
| -f03 | Fig. 2 | stack_schematic | c | manual | envisioned system stack; candidate had Fig. 1 caption tail |
| -f04 | Fig. 3 | simulation_result | a | candidate | PDN unit-cell model and resistance vs die size (TV a) |
| -f05 | Fig. 9 | cross_section | e | manual | thick-dielet TPV top/cross view; candidate had Fig. 8 caption tail |
| -f06 | Fig. 4 | simulation_result | b | candidate | inter-die spacing model (TV b) |

Not chosen: Fig. 1 (dielet- vs substrate-side concept), Fig. 6 (surrogate layout), Fig. 8 (ALD parameters/AFM).
Judgment: TPV depth labelled 510 um in Fig. 9(b) vs "500 um deep" in caption; shows uses the image label.

## ectc51909.2023.00235 (IBM HD organic substrate 3-chip demonstrator) - 6 figures
Pages opened: page_02, 03, 06, 07. Crops opened: cand p03_fig4, p02_tablei, p03_fig5, p06_fig12, p05_fig8, p06_fig10; manual Table I.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 4 | cross_section | a | candidate | joint cross-sections, MR vs TCB, pedestal vs pillar |
| -f02 | Table I | data_table | a;b | manual | chip/substrate dimensions and warpage (most component/interconnect rows); candidate merged Fig. 2 photo |
| -f03 | Fig. 5 | stack_schematic | a | candidate | stacked-via structures in HD layers |
| -f04 | Fig. 12 | cross_section | b | candidate | optimized module joints at 75/55 um pitch |
| -f05 | Fig. 8 | simulation_result | c | candidate | 10 FEA metrics |
| -f06 | Fig. 10 | cross_section | a;c | candidate | FEA strain contour (c) + via-stack SEM (a), 5 metrics |

Not chosen: Fig. 1/2 (top photos), Fig. 3, 6, 7, 9, 11, Tables II-V. Table II and Table V candidates are bad
(has_graphics false, bbox to page edge); not needed since Fig. 12 and Table I cover TV b/a build.

## ectc51909.2023.00108 (TSMC iOIS: COUPE2.0 + composite interposer) - 6 figures
Pages opened: page_02-05. Crops opened: cand p05_fig9, p02_fig1, p04_tableii, p05_tableiii, p02_tablei, p03_fig3; manual Table III.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 9 | stack_schematic | a | candidate | the iOIS_CI build (concept schematics only; no hardware images in paper) |
| -f02 | Fig. 1 | stack_schematic | b | candidate | OE stack options incl. SoIC (COUPE) |
| -f03 | Table II | data_table | a;c;d | candidate | electrical interface and metric rows for CI/MCM/InFO_oS |
| -f04 | Table III | data_table | a | manual | optical metrics; candidate cut the footnote |
| -f05 | Table I | data_table | b | candidate | coupler comparison (optical_interfaces for TV b) |
| -f06 | Fig. 3 | stack_schematic | c;d | candidate | MCM and organic-interposer reference structures |

Not chosen: Figs. 2, 4-8 (CPO taxonomy schematics with no extracted values).
Judgment: paper is architecture/concept; no cross-section or photo exists, so rank 1 is the CI schematic.

## ectc51529.2024.00093 (DNP glass core TGV substrate) - 6 figures
Pages opened: page_02-04. Crops opened: cand p02_fig4, p04_fig9, p04_fig8, p03_fig7, p03_fig6, p04_fig11.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 4 | cross_section | a;b;c | candidate | SEM of the three TGV fill types |
| -f02 | Fig. 9 | reliability_plot | a | candidate | filled-via coupon stack + TC resistance |
| -f03 | Fig. 8 | electrical_plot | d;e;f | candidate | S21 for all three transmission coupons |
| -f04 | Fig. 7 | other | d;e;f | candidate | measurement setup and CPW/TGV structures (stack + process rows) |
| -f05 | Fig. 6 | simulation_result | g | candidate | FEA thermal/stress table (TV g) |
| -f06 | Fig. 11 | reliability_plot | c | candidate | partially filled coupon stack + TC result |

Not chosen: Fig. 10 (conformal coupon TC, TV b; same format as Fig. 9; 6-figure cap), Fig. 2 (high-AR TGV demos, TV h;
no candidate), Fig. 3 (panel examples, TV i), Figs. 1, 5.
Judgment: Fig. 11 caption says -55 to 122 C, text -55 to 120 C (noted). Fig. 8 loss labels read 0.23/0.48/0.34 dB;
abstract says 0.45 dB for conformal (not used in shows beyond the image label).

## ectc51909.2023.00333 (Georgia Tech die-embedded ARC) - 6 figures
Pages opened: page_02-04. Crops opened: cand p04_fig8, p03_fig4, p04_fig6, p03_fig5, p04_fig7; manual Fig. 3, 5, 8 (and a Fig. 2 check crop, not used).

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 8 | cross_section | a | manual | cross-section of embedded die in bonded ARC; candidate had a cut text line |
| -f02 | Fig. 3 | process_flow | a | manual | full flow (a)-(f); no candidate detected |
| -f03 | Fig. 4 | cross_section | a | candidate | ARC-ARC bond line 5.4772 um GX-92P |
| -f04 | Fig. 6 | cross_section | a | candidate | cavity taper 78.54 deg |
| -f05 | Fig. 5 | micrograph | a | manual | cavity optimization; candidate had a cut text line |
| -f06 | Fig. 7 | package_photo | a | candidate | test chip and laminated substrate photos |

Not chosen: Fig. 1 (ARC roll/panels, reprinted from [5]), Fig. 2 (planarization concept).
Judgment: TV b (ARC transmission lines) has values only from the abstract; no figure depicts it, so no figure tagged b.

## Notes
- Schema gap: no enum for measurement-setup figures (Fig. 7 of ectc51529.2024.00093 -> `other`).
- No source problems (no truncation, wrong paper, or scanned PDFs).
