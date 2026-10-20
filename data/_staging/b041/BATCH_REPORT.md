# Batch b041 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b041` -> `0 errors, 0 warnings (data/_staging/b041)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| icep61562.2024.10535612 | distilled | 1 | 1 | 4 | 0 | 6 | 0 | 0 | 9 | 4 | yes |
| ectc51529.2024.00023 | distilled | 4 | 5 | 11 | 0 | 12 | 0 | 3 | 37 | 6 | yes |
| eptc59621.2023.10457918 | distilled | 1 | 3 | 3 | 4 | 12 | 0 | 0 | 14 | 6 | yes |

## icep61562.2024.10535612 (USHIO, DFR patterning margin for 10 um pitch SAP)
- Figures opened: page_01, page_02; candidates p01_fig2, p02_fig2_2, p02_fig3, p02_fig4.
- Key figures: f01 Fig. 2 (p.1) micrograph (candidate p01_fig2); f02 Fig. 4 other/Bossung (candidate p02_fig4); f03 Fig. 3 other (candidate p02_fig3); f04 Fig. 2 (p.2) other (candidate p02_fig2_2). Only 4 figures in the paper.
- One TV (test_coupon: 15 um DFR on Cu-plated glass). Lens A/B, dose and the two L/S patterns kept as metrics.variant / same-seq layer features (rule f/g). package_class organic_substrate from the target application (noted).
- has_process_flow yes: lamination, exposure, 60 C/60 s bake, 30 min RT hold, 1.0 wt% Na2CO3 develop at 27 C, rinse.
- Judgment calls: DOF margins entered as +/- half-ranges (measured); ratios 1.56/2.29/1.4 as the paper's own (derived); 1.4 vs 1.47 by arithmetic logged.
- Not reported: NA values, exposure tool/wavelength, DFR product, Cu thickness, glass type/size.
- Source: two different figures both captioned "Fig. 2" (text calls the p.1 micrograph Fig 1); caption labels kept.

## ectc51529.2024.00023 (Corning, IOX waveguides in alkali glass for CPO)
- Figures opened: page_01-04 renders; 300 dpi re-crops of Fig. 5, 6, 7, 8; candidates p03_fig5, p02_fig2, p03_fig4, p04_fig7, p04_fig6, p02_table2.
- Key figures: f01 Fig. 5 stack_schematic (candidate p03_fig5, reprinted yes: concept from ref [3] with barrier added); f02 Fig. 2 process_flow (candidate p02_fig2); f03 Fig. 4 other (candidate p03_fig4); f04 Fig. 7 simulation_result (candidate p04_fig7); f05 Fig. 6 reliability_plot (candidate p04_fig6); f06 Table 2 data_table (candidate p02_table2).
- TVs: a = IOX waveguide wafer (150 mm, measured 0.034 dB/cm, 0.31 dB per fiber interface); b = SiO2 barrier on alkali glass coupon (ToF-SIMS, HAST, 300 C storage); c = simulated IOX-to-SiN evanescent coupler with barrier; d = longevity FEM model (Tables 1-2).
- Judgment calls: package_class photonic_interposer inferred for all TVs; SiO2 film thickness ~2.45 um read from the SIMS profile (not stated); Fig. 7/8 values read at 200/400 nm and n = 1.45/1.9 (approx); Table 1/2 entered one row per diffusivity (5-year value, 10/15 y in value_text); diffusivity unit corrected from printed m/s2 to m2/s.
- Conflicts logged: coupling < 0.5 dB vs < 1 dB; Table 2 5E-21 row non-monotonic (as printed); HAST duration ambiguous (1000 h in Conclusion); Fig. 5 caption mislabelled.
- Not reported: glass composition, wafer thickness, core size/depth, IOX time for the demo wafer, mask material, SiO2 deposition method, measured diffusivity.
- primary_bucket kept cpo; buckets cpo;glass.

## eptc59621.2023.10457918 (LightSpeed Photonics, glass wafer singulation jigs)
- Source: garbled text layer, OCR text; every number checked on page_01-04_220dpi.png; Tab. 2-4 read from 300 dpi re-crops (OCR unusable). No candidates.json entries.
- Figures opened: page_01-04 (220 dpi); re-crops of Fig. 1, Tab. 1, Fig. 2, Fig. 4, Fig. 5/6, unnumbered Fig. 7 drawing, unlabelled diced-interposer photo, Tab. 2, 3, 4.
- Key figures (all manual): f01 Fig.4 package_photo; f02 Tab.1 process_flow; f03 Fig.1 top_view_layout; f04 Fig.2 other (jig CAD); f05 Tab.2 data_table; f06 Tab.3 data_table.
- One TV: 6-inch 150 um TGV glass wafer with 5 interposer, 10 processor, 94 optics dies (n_dies 109 derived). Pad arrays per die entered as interconnects with level unspecified (attach level not stated). Process steps from Sec. 1-7 plus Tab. 1; solder/assembly marked performed no (next paper).
- Judgment calls: processor count 10 (Intro, Fig. 6/7) over "12 square processor chips" (Sec. 4); is_emulator left blank (glass dies for process development, not stated as emulators); Tab. 2-4 entered verbatim per sample as value_text (arithmetic mismatches logged).
- Not reported: glass type, TGV diameter/pitch, metallization/passivation materials, solder, absolute vacuum, stencil per sample, yield %.

## Schema gaps
- figure_kind has no lithography/process-window plot (Bossung curves -> other) and no fixture/CAD drawing kind.
- step_category has no ion_exchange or glass melting/forming categories (entered as other).
- No field for tooling (stencil thickness) separate from deposited thickness; put in process_steps.conditions.
