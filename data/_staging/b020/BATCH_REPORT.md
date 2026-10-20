# Batch b020 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b020` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51687.2025.00148 | distilled | 3 | 12 | 33 | 12 | 18 | 0 | 0 | 33 | 6 | yes |
| ectc51687.2025.00062 | distilled | 2 | 17 | 12 | 5 | 27 | 0 | 2 | 5 | 6 | yes |
| icep-iaac64884.2025.11003038 | distilled | 8 | 0 | 48 | 4 | 20 | 0 | 0 | 26 | 6 | yes |

## ectc51687.2025.00148 (Ajinomoto ABF-GCP build-up substrate)
- Figures opened: page_02-05 grids; 300-400 dpi re-crops of Fig. 1, 2, 3, 4, 6, 7, 8, 9, 10; candidates p02_tablei, p02_tableii.
- Key figures: f01 Fig. 2 stack_schematic (manual); f02 Fig. 1 package_photo (manual); f03 Table II data_table (candidate p02_tableii); f04 Fig. 4 warpage_plot (manual); f05 Fig. 6 reliability_plot (manual); f06 Fig. 10 micrograph (manual).
- TVs: one per dielectric leg (Leg1 ABF-GL, Leg2 ABF-GCP on L1/L8, Leg3 ABF-GX). Judgment call: the three assembly stages (substrate only, after UF, after stiffener) are kept as metrics.variant, not separate TVs; the stiffener component notes it is present only at the last stage.
- Fig. 4 values read by color-pixel centroids (+/-5 um); Leg 1 stiffener 250 C marker hidden under Leg 2 and Leg 2/3 50 C stiffener markers overlap (noted per row). Fig. 7 bars give the 50 C after-UF values (agree with Fig. 4).
- Crack-rate denominator, sample counts, TC standard, bonding method, SR product and ABF-GCP thickness not reported. ABF 40 um thickness is a generic Fig. 2 label applied to all build-up layers (noted).
- Conflicts: text says stiffener "significantly improved crack resistance"; Fig. 8 vs Fig. 6 shows that at TC500 for all legs but at TC1500 only for Leg 1 (logged).
- Generic SAP steps in the Introduction (ref [6]) excluded from process_steps.

## ectc51687.2025.00062 (Celestial AI OMIB)
- Figures opened: page_01-05 grids; re-crops of Fig. 1, 3, 5, 6, 7(a) (450 dpi), 9; candidates p01_tablei, p02_fig1, p02_fig3, p03_fig4, p03_fig5, p04_fig6, p05_fig10.
- Key figures: f01 Fig. 3 stack_schematic (manual); f02 Fig. 5 process_flow (manual); f03 Fig. 4 top_view_layout (candidate p03_fig4); f04 Fig. 6 micrograph (manual); f05 Fig. 9 package_photo (manual, no candidate); f06 Fig. 10 optical_plot (candidate p05_fig10).
- TVs: a = OMIB SiP TV (package_class cpo_module, 2x reticle); b = optical test sub-assembly (PIC gratings + glass spacer + FAU with lens array, Fig. 9/10).
- Judgment calls: process flow (27 steps) from Sec. II.B text plus Fig. 5 labels (backside debond, taping/singulation) and Fig. 7(a) step labels (reflow, oven cure, compression molding); `performed` left blank since Fig. 6 shows the build only through embedded die attach and the full flow is stated as future work. Bridge and DTC counts (6 each) read from Fig. 6(a) labels; FAU count 6 from Fig. 4 schematic. 1.8 Tbps/mm2 entered as an architecture-claim metric (author_estimate), not as an electrical_interface.
- Almost no dimensions disclosed: only RDL L/S 2/2 um (4 layers, reference PDK), 2x reticle, ~1 nm Ra. Fig. 7 and Fig. 10 carry no numeric axis values (trend/value_text rows only).
- primary_bucket kept as cpo; buckets extended with si_bridge (embedded Si bridges).

## icep-iaac64884.2025.11003038 (iNEMI glass vs organic core warpage)
- Figures opened: page_01-02 renders and grids; 400 dpi re-crops of Fig. 3-6; candidates p01_fig1, p01_fig2, p02_fig3, p02_fig5, p02_fig6.
- Key figures: f01 Fig. 1 stack_schematic (candidate p01_fig1); f02 Fig. 2 stack_schematic (candidate p01_fig2); f03 Fig. 6 warpage_plot (manual); f04 Fig. 5 warpage_plot (manual); f05 Fig. 3 warpage_plot (manual); f06 Fig. 4 warpage_plot (manual).
- TVs: 8 test coupons = 4 stack-up samples x {glass, organic} core (each a distinct stack). Warpage per TV at 25 C initial, 260 C first reflow, 25 C after second reflow as plotted ranges (2 markers per temperature, sample count not stated).
- has_process_flow = yes on thin evidence: panel-level fabrication, build-up lamination (Sample 2), SR lamination (Sample 4), dicing to coupons. Build-up formation for Samples 3/4 is not described and not entered. Panel-level fabrication is stated for the 4-metal-layer substrates; applied to all coupons (same program).
- Conflicts logged: text says Samples 3/4 RT warpage ~100 um and GCS hot warpage "100 um concave", plotted values are 36-99 um and -32 to -96 um; OCS minimum text -250 um vs plotted -265 to -290 (S4). Plotted values entered. The 2.5-5x ratio entered as the authors' statement.
- Sign convention: + convex, - concave, measured from back side (from the shape statements in Sec. III).
- Material products, CTE/modulus, Cu and dielectric thicknesses, via sizes not reported.

## Key-figure pilot notes
- Candidate quality (18 chosen figures): 5 used as-is (00148 Table II; 00062 Fig. 4, Fig. 10; icep Fig. 1, Fig. 2), 13 manual.
  - 00148: only 3 candidates for 10 figures + 2 tables (captions "Figure  N" with double space apparently not matched); Figs. 1, 2, 4, 6, 10 had no candidate. Table candidates crop below the table title (acceptable).
  - 00062: p03_fig5 and p04_fig6 bboxes span a full column / page quadrant (x0=0 or x1=1, y0=0) with large blank margin and caption; p02_fig3 includes one line of body text; Fig. 9 had no candidate.
  - icep page 2: all four candidates (p02_fig3..fig6) are shifted up by ~0.025 page height: each includes the preceding caption/heading and clips the x-axis tick labels. Page 1 candidates were correct.
- Time: roughly 5-10 min per paper for the figure step (grid render, read bbox, re-crop, view, adjust once); most re-crops needed one adjustment to trim a sliver of body text.
- Friction: `crop_figures.py` names re-crops by bbox, so iterations pile up in scratch (fine, but no overwrite of the 'current' crop); the 0.05 grid at 110 dpi is coarse for single-column figures, so I verified with the re-crop rather than the grid. zsh does not word-split `$var` args (use separate args). Shows/caption word limits are only warnings; I kept shows <= 25 words.
