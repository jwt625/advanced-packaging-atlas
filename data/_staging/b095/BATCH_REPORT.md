# Batch b095 report (2026-10-20)

Papers: ectc51846.2026.00065, eptc62800.2024.10909809, ectc51846.2026.00103. Schema v2.5.
Validator: `uv run python scripts/validate_db.py --staging data/_staging/b095` -> `0 errors, 0 warnings (data/_staging/b095)`.
author_affiliations / organizations / org_sites left header-only.

## ectc51846.2026.00065 - AlN-based Chiplet Encapsulation (ECTC 2026, pp. 364-371)
- Status: distilled. process_flow_level full (has_process_flow yes). primary_bucket thermal_pdn (as batch file).
- Rows: tv 4, comp 8, layers 27, ic 1, flows 1, steps 12, ei 0, oi 0, metrics 24, figures 14.
- TVs: a = fabricated 2.5-D test structure (test_coupon, 4 chiplets 3x3 mm 300 um, Cu-Cu TCB on 10x10 mm 500 um Si interposer, drop-cast AlN infill + 4.5 um sputtered AlN); b = Icepak AlN model; c = Icepak epoxy model; d = Icepak epoxy-infill + sputtered AlN model (Fig. 11).
- Flow F1 (tv_build, full, tv a): PECVD SiO2, Ti/Cu/Au lift-off pads, chiplet pillars (20/100 um pitch), TCB 270 C / 350 N / 900 s formic acid + N2, AlN powder pre-treat 950 C 2 h, solvent mix + ultrasonication, drop-cast on vibration table, ALD Al2O3 40 nm, sinter 300 C 2 h, mechanical polishing, conditional rework, DC sputter AlN 400 C 200 W 4.5 um.
- Figures opened: page_02-07.png; candidate crops p02_fig1, p02_fig2, p03_fig3, p03_fig4, p03_fig5, p03_fig6, p04_fig7, p04_fig8, p04_tablei, p05_fig9, p05_fig10, p05_fig11, p06_fig12, p07_fig14 (contact sheet).
- Key figures (all candidate): f01 Fig. 6 cross_section; f02 Fig. 3 process_flow; f03 Fig. 2 process_flow; f04 Fig. 5 package_photo; f05 Fig. 4 micrograph; f06 Fig. 1 stack_schematic (concept, paper-level); f07 Fig. 7 stack_schematic; f08 Fig. 12 stack_schematic; f09 Fig. 8 stack_schematic; f10 Table I data_table; f11 Fig. 9 thermal_plot; f12 Fig. 10 thermal_plot; f13 Fig. 11 thermal_plot; f14 Fig. 14 thermal_plot.
- Judgment calls: gap variants (100/400/900 um) kept as one TV with geometry metrics (rule f); Fig. 11 intermediate configuration as its own simulation TV d; Fig. 10/11 bar heights read off image (approx); Sec. II drop-cast method treated as executed (Sec. III says gaps filled "using the drop-cast method described in Section II"); mechanical polishing categorized cmp (no slurry stated); Ti/Cu/Au split into per-metal rows.
- Not reported: interposer RDL/TSV of the built structure (concept Fig. 1 and model only), pillar height/diameter/count, TCB tool, solvent, sputter target/gas, reliability, warpage.
- Source problems: none (conclusion ">150 W/m-K" and "more than 40 C" vs results "approx. 150" and "nearly 40 C" logged as conflicts).

## eptc62800.2024.10909809 - Flow Rate and Current Density on Cu Deposition in Through Hole (EPTC 2024, pp. 730-733)
- Status: distilled. process_flow_level ordered (has_process_flow yes). primary_bucket advanced_substrate.
- Rows: tv 1, comp 1, layers 7, ic 1, flows 1, steps 6, ei 0, oi 0, metrics 21, figures 9.
- TV a: 200 um thin-core substrate plating sample, X-shaped double-side laser-drilled TH 80 um diameter / 200 um depth; legs 1-4 are process splits (metrics variant).
- Flow F1 (tv_build, ordered): core with Cu foil, laser drill, desmear, electroless Cu, Cu-fill DC electroplating initial stage (10/15 um surface Cu, split by legs and times), completion to 23 um surface Cu (VCP line, insoluble anodes).
- Figures opened: page_01-04.png; 400 dpi re-renders of Fig. 4, Fig. 5, Fig. 8; candidates p02_fig3, p01_fig2, p02_table1, p03_fig4, p03_fig5; manual re-crops Fig. 1, Fig. 6, Fig. 7, Fig. 8.
- Key figures: f01 Fig. 3 stack_schematic (candidate); f02 Fig. 2 process_flow (candidate); f03 Fig. 6 process_flow (manual); f04 Fig. 1 stack_schematic (manual, paper-level); f05 Table 1 data_table (candidate); f06 Fig. 8 other (manual); f07 Fig. 5 other (candidate); f08 Fig. 4 other (candidate); f09 Fig. 7 other (manual).
- Judgment calls: level ordered, not full: flow rate and current density are only "Low/High" (no numbers) and plating times differ per leg, so no single typed condition; times kept in `split`. JMP profiler values and p-values entered with basis derived; void occurrence rates are relative (3X/1X/4.2X/2.6X of Leg 2); Fig. 8(b) leg means read approx off the plot. No real images in the paper (all schematics/plots), so rank 1 is the TH cross-section schematic.
- Not reported: numeric flow rate and current density, panel size, core material name, foil/electroless thickness, bath composition amounts and temperature, absolute void rate, sample counts, reliability data.
- Source problems: Table 2 equations are images only (read from render); typo "2D-Xay".

## ectc51846.2026.00103 - SeWaRe Failure in a Glass-Core Substrate with RDLs (ECTC 2026, pp. 610-617)
- Status: distilled. process_flow_level full (has_process_flow yes). primary_bucket glass.
- Rows: tv 4, comp 4, layers 16, ic 0, flows 2, steps 13, ei 0, oi 0, metrics 31, figures 14.
- TVs: a = 1.1 mm EN-A1 glass, single-sided 6x (ABF GL-102 15 um / Cu 7 um) RDL, warpage TV; b = same on 1.0 mm glass, dicing TV (16 coupons 25x25 mm); c = 2D sequential warpage model; d = 2D fabrication + four-pass dicing fracture model (1.132 mm total).
- Flows: F1 (tv_build, full, a;b) SAP build: solvent clean, O2 plasma 4 min (PE200), two-step lamination 100 C 0.7/0.55 MPa 1 min each (Meiki MVLP300/300-s), cure 130 C 30 min + 180 C 30 min, shadow-moire warpage inline_inspection (delta tv a), Ar plasma RIE roughening, Ti 50 nm / Cu 200 nm sputter seed, Cu plating 1.1 A/dm2 (11 mA/cm2) Chemcut line, repeat per RDL. F2 (tv_build, full, b, build_seq 2): tape mount, 4-pass Disco DAD3361 dicing, 290 um/pass, 0.5 mm/s, 20,000 RPM rear-cut, water jet.
- Figures opened: page_03-07.png; candidates p05_fig5, p05_fig6, p06_fig7, p05_fig4, p04_fig2, p03_fig1, p03_tablei, p04_fig3, p04_tableiii, p07_tableiv, p07_fig9; manual re-crops Fig. 8, Fig. 10, Fig. 1(a)-(d).
- Key figures: f01 Fig. 5 cross_section (candidate); f02 Fig. 6 cross_section (candidate); f03 Fig. 7 cross_section (candidate); f04 Fig. 4 package_photo (candidate); f05 Fig. 2 stack_schematic (candidate); f06 Fig. 8 simulation_result (manual); f07 Fig. 1(e) warpage_plot (candidate); f08 Fig. 1(a)-(d) warpage_plot (manual); f09 Table I data_table (candidate); f10 Fig. 3 simulation_result (candidate); f11 Table III data_table (candidate); f12 Table IV data_table (candidate); f13 Fig. 10 mechanical_plot (manual); f14 Fig. 9 simulation_result (candidate).
- Judgment calls: Table II material properties excluded (cited from refs [12-13]); wet-glass Gc 2 J/m2 (ref [7]) only in notes; Fig. 1 split across two locations on p.3 -> two rows; shadow-moire measurement placed in flow as inline_inspection delta on tv a (paper measures after each layer during build) with values in metrics; lamination and cure split into two rows each (two pressure / temperature stages); vacuum atmosphere not set (only tool name "Vacuum Laminator").
- Not reported: interconnects (no vias/TGVs/pads), SAP lithography/seed etch and L/S, blade width/grit, measured sidewall roughness values, coupon counts per failure mode.
- Source problems: Fig. 4 caption "10 mm x 10 mm" vs text 100 mm; Sec. IV.C cites Table I / Fig. 7 where Table II / Fig. 8 are meant; "repeated six more times" vs 6 RDLs total (conflicts list).

## Validator output
```
0 errors, 0 warnings (data/_staging/b095)
```

## Schema gaps
- Process splits whose levels are only qualitative (Low/High current density, flow rate) and per-leg times cannot fill a typed condition; such flows grade `ordered` even when conditions are varied systematically (eptc62800.2024.10909809).
- No typed column for plating/sputter deposition rate or electrolyte flow rate (kept in `conditions`/`split`).
- metrics.value_text with unit "%" for stated ranges ("over 20-30%") has no *_min/*_max columns.

## Coordinator figure fix (2026-10-20): clipped candidate bboxes

A pixel scan of every candidate-bbox figure row found content continuing below the bbox bottom (figure_candidates.py clips raster images, typically by about 0.012 of page height). Each bbox below was extended to the first blank gap under the image (checked on contact sheets; captions excluded) and set to bbox_source manual, cand_id empty.

| fig_id | page | old bbox | new bbox |
|---|---|---|---|
| eptc62800.2024.10909809-f01 | 2 | 0.5085,0.0461,0.8995,0.1984 | 0.5085,0.0461,0.8995,0.2042 |
| eptc62800.2024.10909809-f02 | 1 | 0.5062,0.4602,0.9028,0.668 | 0.5062,0.4602,0.9028,0.6752 |
| ectc51846.2026.00103-f04 | 5 | 0.1737,0.1428,0.4127,0.3275 | 0.1737,0.1428,0.4127,0.3394 |
