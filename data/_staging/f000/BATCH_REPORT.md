# Batch f000 report (figures_only backfill, 2026-10-19)

Scope: key figures only for 6 merged papers. Wrote `figures.csv` (36 rows, 6 per paper). No other tables, no evidence.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/f000` -> `0 errors, 0 warnings`.
No `TEXT_LAYER_WARNING.md` in any of the 6 papers. tv_ids taken from `data/test_vehicles.csv`; ranking guided by the
locators in `data/metrics.csv`, `interconnects.csv`, `stack_layers.csv`, `process_steps.csv`.
Candidate = bbox and cand_id copied from `candidates.json`; manual = re-cropped with `scripts/crop_figures.py` into the
session scratch folder and opened before use. Totals: 21 candidate, 15 manual.

## ectc51906.2022.00142 (UV-assisted SAP on prepreg) - 6 figures
Pages opened: page_02-05. Crops opened: cand p04_fig10, p03_fig4, p02_fig3a, p04_fig6, p03_fig5, p05_fig12; manual Fig. 6.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 10 | cross_section | d | candidate | only cross-section of the built lines (FIB, 10/10 um) |
| -f02 | Fig. 4 | process_flow | d | candidate | full SAP flow, source of most process_steps |
| -f03 | Fig. 3 | stack_schematic | b | candidate (p02_fig3a) | FC-BGA mock-up stack + photo; crop holds (a) and (b) |
| -f04 | Fig. 6 | warpage_plot | b;c | manual | 9 warpage metrics; candidate included a caption line |
| -f05 | Fig. 5 | other | a | candidate | 12 peel-strength metrics; no adhesion enum, so `other` |
| -f06 | Fig. 12 | reliability_plot | d;e | candidate | HAST insulation resistance (9 metrics with Table III) |

Not chosen: Fig. 1 (foil schematic, no candidate detected), Table III (HAST pass/fail; Fig. 12 carries more rows), Fig. 7, 9, 11, 13.
Judgment: Fig. 3 tagged TV b only (schematic labels prepreg; insulation-film reference c is text-only).

## ectc51906.2022.00072 (GF 90WG self-aligned fiber attach) - 6 figures
Pages opened: page_03-07. Crops opened: cand p03_fig1, p05_fig4, p06_table1, p07_fig6, p04_fig2; manual Fig. 1, Fig. 3, Fig. 4, Table 1; grid p04.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 1 | stack_schematic | a | manual | platform cross-section + SSC/Vgroove views; candidate clipped panel (c) |
| -f02 | Fig. 4 | package_photo | a | manual | photo of the sub-assembly TV; candidate had a body-text line |
| -f03 | Fig. 3 | optical_plot | a | manual | 7 IL metrics; candidate p05_fig3 boxed the p.5 caption only (graphics on p.4) |
| -f04 | Table 1 | data_table | a | manual | stress-test conditions/results; candidate cut the caption |
| -f05 | Fig. 6 | reliability_plot | a | candidate | DH extension, 7 metrics |
| -f06 | Fig. 2 | other | b;c;d | candidate | DCB/BOR mechanical tests, all coupon TVs |

Not chosen: Fig. 5 (IL shift per stress) because its four panels are split across both columns of p.6 (TC/HTS top right,
DH/LTS bottom left); one bbox would swallow body text. Table 1 covers the same tests.

## ectc51906.2022.00180 (glass panel embedded packages, TV-1/TV-2) - 6 figures
Pages opened: page_04, page_06. Crops opened: cand p04_fig7, p06_fig13, p03_fig4, p05_fig10, p02_fig3, p05_fig9.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 7 | cross_section | a | candidate | TV-1 full cross-section with 2D/3D interconnect insets |
| -f02 | Fig. 13 | cross_section | b | candidate | TV-2 cross-section + TGV inset |
| -f03 | Fig. 4 | process_flow | a | candidate | TV-1 6-step flow |
| -f04 | Fig. 10 | process_flow | b | candidate | TV-2 7-step flow |
| -f05 | Fig. 3 | stack_schematic | a | candidate | TV-1 dimensioned stack + layout |
| -f06 | Fig. 9 | top_view_layout | b | candidate | TV-2 floorplan + dimensioned stack |

All candidates clean. Not chosen (cap of 6): Fig. 12(c) x-ray with 35/55 um IO pitch labels, Fig. 8 die set, Fig. 5/6/11 build photos.

## ectc.2019.00095 (TSMC SoIC overview) - 6 figures
Pages opened: page_02, page_03, page_05. Crops opened: cand p02_fig4, p02_fig2, p02_fig3, p03_fig6, p03_fig9; manual Fig. 2, Fig. 6, Fig. 9, Table 1.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 4 | stack_schematic | a | candidate | only depiction of the InFO_PoP-with-SoIC build (panel d); no cross-section in paper |
| -f02 | Fig. 2 | process_flow | a;e | manual | SoIC vs 3DIC flow (all process_steps); candidate had a caption line |
| -f03 | Fig. 3 | package_photo | b;c;d | candidate | the three stacking TVs |
| -f04 | Table 1 | data_table | a | manual | 6 package reliability metrics; no candidate detected |
| -f05 | Fig. 6 | electrical_plot | a | manual | daisy-chain yield (5 metric locators); candidate had a body-text line |
| -f06 | Fig. 9 | electrical_plot | a;f | manual | insertion loss, both electrical_interfaces rows; candidate had a caption line |

Not chosen: Fig. 5 (bond density vs pitch, roadmap-style), Fig. 7, 8, 10, 11, 12-15.

## iedm19573.2019.8993637 (Intel Foveros) - 6 figures
Pages opened: page_03, page_04. Crops opened: cand p03_fig1, p04_fig9, p03_fig4, p03_fig6, p04_fig11, p04_fig13; manual Fig. 4, 6, 9, 11 (Fig. 4, 6, 9 cropped twice to drop caption slivers).

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 1 | cross_section | a | candidate | SEM of full F2F stack to package bumps |
| -f02 | Fig. 9 | cross_section | a | manual | TSV cluster package bump to microbump; candidate had Fig. 8 caption, clipped bump |
| -f03 | Fig. 4 | micrograph | a | manual | Cu/SnAg microbumps; candidate clipped bottom |
| -f04 | Fig. 6 | cross_section | a | manual | TSV Cu fill; candidate had Fig. 5 caption |
| -f05 | Fig. 11 | electrical_plot | b | manual | TSV R vs diameter (4 metrics + 3 interconnects); candidate had a caption line |
| -f06 | Fig. 13 | electrical_plot | b | candidate | TSV C vs diameter (4 metrics) |

Source issue: Fig. 2 (Foveros 3D stack), Fig. 3 (microbump joints) and Fig. 10 render as small fragments on page_03/04
(embedded images broken in the PDF render), so they were not selectable even though Fig. 2/3 are cited in locators.
No process-flow figure exists.

## itherm45881.2020.9190542 (InFO_oS thermal TTV) - 6 figures
Pages opened: page_02, page_04-06. Crops opened: cand p02_fig2, p02_fig1, p02_table1, p04_fig9, p04_fig8; manual Fig. 8, Table 8.

| fig_id | label | kind | tv | source | why |
|---|---|---|---|---|---|
| -f01 | Fig. 2 | stack_schematic | a | candidate | lidded InFO_oS cross-section scheme |
| -f02 | Fig. 1 | top_view_layout | a | candidate | two-die configuration |
| -f03 | Table 1 | data_table | a | candidate | TTV dimensions, RDL W/S, C4 pitch, BLT |
| -f04 | Fig. 9 | thermal_plot | a | candidate | measured+sim ThetaJC vs TIM (8 metrics); crop includes Table 5 bottom rule only |
| -f05 | Table 8 | data_table | b | manual | 42 simulated Tj/Tcase metrics; no candidate detected for Tables 6-8 |
| -f06 | Fig. 8 | thermal_plot | a | manual | ThetaJC vs BLT; candidate merged Table 3 rows |

Not chosen: Table 2 (T-SAM TIM coverage), Fig. 3 (PCB photo), Fig. 13 (vapor-chamber model, TV b), Fig. 12, 14-16.

## Key-figure pilot notes
- Candidate crop quality: 36 chosen; 21 usable as-is, 15 needed a manual bbox. Failure modes: caption or body-text sliver
  above/below the graphic (8), clipped graphic or caption edge (3), merged with a neighbouring table (1), wrong page for a figure
  whose caption sits on the next page (1, 00072 Fig. 3), chosen tables not detected (2: SoIC Table 1, InFO_oS Table 8;
  also undetected: InFO_oS Tables 6-7, 00142 Fig. 1, Foveros Fig. 2), split-column figure impossible to box (00072 Fig. 5).
- The caption-sliver case is the most common and is cosmetic; a detector tweak (stop the bbox at the caption's top edge,
  or at the previous caption's bottom edge) would remove most manual work.
- Time: about 8 min wall clock from first tool timestamp to clean validation (plus instruction reading), roughly
  1.5 min per paper; most time went to opening crops and re-crops (about 50 images viewed).
- Friction: `crop_figures.py` takes one `--page/--bbox` per call; a small shell loop helper (scratch only) was needed in
  zsh. Reading bbox fractions directly off the 1275x1650 page render (pixel/size) was faster than the grid; the grid was
  rendered once (00072 p.4). Candidate `caption` text in candidates.json is truncated for two-line captions (Foveros), so
  captions were transcribed from the page renders.
- Instructions: no figure_kind for adhesion/peel or mechanical fracture plots (used `other` + note); no rule for a
  figure split across columns (left out, noted). "page" for a figure whose graphics and caption are on different pages
  was set to the graphics page.
