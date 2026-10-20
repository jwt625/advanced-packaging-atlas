# Batch b050 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b050` -> `0 errors, 0 warnings`.
Crop check: `scripts/crop_figures.py --staging data/_staging/b050 --out <scratch>` -> 18 crops written.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00156 | distilled | 4 | 11 | 6 | 0 | 8 | 0 | 0 | 72 | 6 | yes |
| iedm50572.2025.11353491 | distilled | 6 | 24 | 11 | 2 | 5 | 0 | 1 | 4 | 6 | yes |
| tcpmt.2025.3557232 | distilled | 1 | 1 | 9 | 1 | 10 | 0 | 0 | 29 | 6 | yes |

## ectc51846.2026.00156 (Microsoft/Corintis direct-to-Si microfluidic cooling, GH200)
- Figures opened: candidates p02_fig1, p03_fig3, p03_fig4, p03_fig5, p03_fig6, p03_fig7.
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1); f02 Fig. 5 thermal_plot (candidate p03_fig5); f03 Fig. 7 thermal_plot (candidate p03_fig7); f04 Fig. 6 thermal_plot (candidate p03_fig6); f05 Fig. 4 thermal_plot (candidate p03_fig4); f06 Fig. 3 thermal_plot (candidate p03_fig3).
- TVs: a = MF GH200 package; b = OEM cold-plate GH200 (reference for FOM and pressure drop); c = Si vehicle with vertical microchannels; d = Si control (3-point bend, warpage).
- Figs. 3-7 are vector charts: values extracted from PDF drawing primitives (Fig. 3 MF bars by pixel scan); all agree with text statements (GPU Rth < 0.02 C/W, FOM ranges, 37/66 kPa, 0.017/0.014 C/W).
- Judgment calls: channel geometry (75/350/150 um) as design_target metrics and in the die layer feature; clogging/erosion attached to TV a although the paper does not name the vehicle (noted); flexural strength unit kPa kept as printed; Intro "3x/1.5x lower temperature rise" not entered (conflicts with Fig. 6, logged).
- has_process_flow yes: Sec. III.A gives an ordered integration sequence (laser etch, gasket, TIM, cold plates, manifold, CPU cold plate, leak test, 50 C TIM conditioning >= 40 min).
- Not reported: interconnects, die/package dimensions, HBM count, gasket material, laser-etch conditions, TC standard/sample counts, inlet-temperature sweep results.

## iedm50572.2025.11353491 (IBM CPO module with single-mode polymer waveguide)
- Source: garbled text layer, OCR text.md; numbers checked against 150 dpi re-crops of p.1-2 and the 220 dpi page renders. No candidates (candidates.json empty).
- Figures opened: page_03_220dpi, page_04_220dpi; manual re-crops of Fig. 1, 2, 4, 6, 8, 11 (all viewed).
- Key figures (all manual): f01 Fig. 11 package_photo; f02 Fig. 1 package_photo (reprinted yes, caption cites [2]); f03 Fig. 8 simulation_result; f04 Fig. 2 top_view_layout; f05 Fig. 6 mechanical_plot; f06 Fig. 4 mechanical_plot.
- TVs: a Type-A (no cut-out), b Type-B (cut-out, optics-last), c 3-port cut-out package, d FEM model, e peel coupon (PWG/adhesive/Si), f pull sample.
- Judgment calls: IL <1.2-2.0 dB entered once (TV a, coupling_loss_db 2.0 with `le`) although TV type is not stated and the paragraph cites [7]; Fig. 7 (reprinted from [6], per-facet IL ~2-3.5 dB) not entered, conflict logged. Peel/pull/FEM plots have no numeric scales: value_text only.
- has_process_flow yes on thin evidence: Sec. II orders the Type-B sequence (PIC-to-laminate joining, module-to-lid, PWG bond) and Type-A (PWG attach first).
- Not reported: any dimension, PWG material/MFD/pitch, wavelength in text, adhesive product, T&H conditions, FEM stresses.

## tcpmt.2025.3557232 (Purdue double-sided Cu fill of 20 um AR 15 TGVs)
- Figures opened: candidates p03_fig1, p04_fig4, p05_fig6-9, p07_fig15, p08_fig17; 500 dpi re-crop of Fig. 4(c); 400 dpi re-crop of Fig. 7; embedded rasters img_p05_1/4/5/6 for marker extraction.
- Key figures (all candidate): f01 Fig. 15 cross_section (p07_fig15); f02 Fig. 1 process_flow (p03_fig1); f03 Fig. 4 micrograph (p04_fig4); f04 Fig. 17 cross_section (p08_fig17); f05 Fig. 8 other (p05_fig8); f06 Fig. 7 other (p05_fig7).
- One TV (glass wafer with TGVs); SLE time and lower/higher via density kept as metrics.variant (layout-only split, densities not quantified).
- Plot values: color-mask marker centroids (+/-0.05 um). Conflicts logged: Fig. 9 vs text at point D (60 min 1.51 vs ~1.6 um; text implies ~3.2 at 30 min vs plotted 2.76).
- Table I / Fig. 18 prior-work benchmarks excluded.
- Not reported: TGV pitch/density numbers, wafer size, laser/KOH parameters, bath chemistry, plating current, electrical/reliability data.

## Schema gaps
- No metric_category for hydraulic quantities (pressure drop, flow); entered under thermal.
- No figure_kind for parameter-vs-process plots with SEM insets (Fig. 7/8 tcpmt); used `other`.
- No component_type for gaskets/manifolds/waveguide films (polymer waveguide, coolant manifold); used `other`.
