# Batch b067 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b067` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| icep-iaac64884.2025.11002958 | distilled | 6 | 6 | 18 | 1 | 27 | 0 | 0 | 18 | 6 | yes |
| ectc51846.2026.00198 | distilled | 3 | 2 | 7 | 0 | 12 | 0 | 0 | 9 | 6 | yes |
| ectc51846.2026.00012 | distilled | 3 | 7 | 11 | 1 | 30 | 0 | 0 | 47 | 6 | yes |

## icep-iaac64884.2025.11002958 (ULVAC linear ion source pretreatment, 2 pages)
- Figures opened: page_01, page_02 renders; 400 dpi re-crops of Fig. 4, 6, 7, 8; candidates p01_fig4, p02_fig5-9.
- Key figures: f01 Fig. 9 cross_section (candidate p02_fig9); f02 Fig. 6 process_flow (candidate p02_fig6); f03 Fig. 5 data_table (candidate p02_fig5); f04 Fig. 7 mechanical_plot (manual); f05 Fig. 8 mechanical_plot (manual); f06 Fig. 4 other (manual).
- TVs: a = LIS 250 mm test apparatus (equipment characterization, tv_kind other); b = 25 Th-SiO2/Si pieces on 510x515 mm panel (etch map); c = ABF peel coupon Ti/Cu; d = glass peel coupon Ti/Cu; e = glass peel coupon Cu only (no Ti = different stack); f = 50x40 mm 430 um TGV glass coupon.
- Judgment calls: CCP vs LIS and treatment amount are variants of c; seed thickness split (Ti 200/Cu 2000 vs Ti 100/Cu 1000 nm) kept as variant of f (thickness min/max). Fig. 7 scatter entered as read ranges (+/-0.02 kgf/cm); Fig. 8 bars read by eye. New-circuit 1500 W limit is an extrapolated (dashed) point: basis unspecified. TGV depth = glass thickness (derived).
- buckets extended with glass (TGV and glass peel coupons).
- Not reported: LIS voltage/current/speed for panel, peel and TGV runs; ABF grade; glass products; sample counts; TGV formation and plating chemistry.

## ectc51846.2026.00198 (USHIO stitching-free 18-reticle exposure, 4 pages)
- Figures opened: page_02-04 renders; candidates p02_fig1, p02_fig2, p03_fig3, p03_fig5, p03_fig6, p03_fig7, p04_fig8.
- Key figures: f01 Fig. 6 cross_section (candidate p03_fig6); f02 Fig. 3 package_photo (candidate p03_fig3); f03 Fig. 8 other/Bossung (candidate p04_fig8); f04 Fig. 5 micrograph (candidate p03_fig5); f05 Fig. 7 micrograph (candidate p03_fig7); f06 Fig. 2 other/chuck flatness (candidate p02_fig2).
- TVs: a = 510x515x1.1 mm glass panel, Cr + 1 um AZ resist (resolution test); b = Si wafer TTV <1 um, Ti-Cu seed + 6 um PXi/XI resist (process margin); c = exposure tool (lens focal variation, chuck flatness, 14,940 mm2 field) as tv_kind other.
- Judgment calls: reticle_multiple left empty (the 18-reticle figure is an exposure field, not a package size); field area entered as a derived metric on c. SEM model SU5000 read from image banner. Bossung CD range read off Fig. 8.
- buckets extended with glass. Lithography-only paper: no interconnects.
- Not reported: NA, wavelength, tool model, dose for panel run, Cr/seed thickness, wafer diameter, absolute CD.

## ectc51846.2026.00012 (Ableprint WSAS membrane pressure cure, 7 pages)
- Figures opened: page_02-07 renders; re-crop of Fig. 2 and 500 dpi Fig. 8; candidates p02_fig1, p03_fig2, p04_tablei, p05_tableii, p05_tableiii, p07_fig8.
- Key figures: f01 Fig. 1 other (candidate p02_fig1); f02 Fig. 2 process_flow (manual); f03 Table I data_table (candidate p04_tablei); f04 Table III data_table (candidate p05_tableiii); f05 Table II data_table (candidate p05_tableii); f06 Fig. 8 warpage_plot (candidate p07_fig8).
- TVs: a = 300 mm EMC molded wafer on Si carrier; b = 510x515 mm EMC molded panel on glass carrier; c = 118x115 mm ABF substrate (11 ABF layers/side, 2000 um core). Membrane type, stage, DV, pressure, chuck table and pre/post-cure are variants (metrics.variant), one before/after/ratio triple per Table row.
- Judgment calls: package_class fan_out_wafer / fan_out_panel inferred (chips compression-molded on carriers; noted). Rank 1 is the tool schematic (paper has no TV cross-section). Fig. 8 repeatability entered as text bounds (<0.3 mm flat; +/-100 um concave) with read ranges in notes.
- Conflicts logged: wafer stage text "flat/concave" vs Table I "convex"; abstract "up to 35%" vs Table II 36%; initial ABF PV 0.32-0.65 vs 0.3-0.6 mm; Fig. 2 pressure in kg/cm2 vs bar in text.
- buckets extended with organic_rdl_fanout and advanced_substrate.
- Not reported: chip/EMC/mold details, ABF grade, Cu/via dimensions, membrane materials, stage curvature, DV values, sample counts per configuration.

## Candidate quality
- 18 key figures: 14 candidate, 4 manual. Manual reasons: p01_fig4, p02_fig7, p02_fig8 (icep) clip axis titles/label rows; p03_fig2 (00012) spans to page edge with large blank margin. Table candidates start below the table title (acceptable).
