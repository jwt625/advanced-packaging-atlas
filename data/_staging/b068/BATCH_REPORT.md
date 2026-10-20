# Batch b068 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b068` -> `0 errors, 0 warnings (data/_staging/b068)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00170 | distilled | 6 | 29 | 15 | 7 | 4 | 0 | 0 | 18 | 6 | yes |
| ectc51846.2026.00302 | distilled | 1 | 3 | 2 | 0 | 12 | 0 | 1 | 8 | 4 | yes |
| ectc51846.2026.00074 | distilled | 5 | 5 | 40 | 6 | 28 | 0 | 0 | 15 | 6 | yes |

## ectc51529.2024.00170 (Murata iPaS DC-DC converter module)
- Figures opened: page_01-04 renders; re-crops of Fig. 3, Fig. 8 (150 dpi), Fig. 10 (400 dpi); candidates p02_fig1, p02_fig3a, p02_fig4, p03_tablei, p04_fig10.
- Key figures: f01 Fig. 3 cross_section (candidate p02_fig3a); f02 Fig. 4 stack_schematic (candidate p02_fig4); f03 Fig. 1 stack_schematic (candidate p02_fig1); f04 Table I data_table (candidate p03_tablei); f05 Fig. 8 electrical_plot (manual); f06 Fig. 10 electrical_plot (candidate p04_fig10).
- TVs: a-d = modules M1-M4 (different bottom substrate / MLCC / inductor sets per Table I, so separate builds); e = iPaS substrate 10 x 25 x 0.85 mm with 0.32 mF array (sub_assembly, carries the Fig. 1 stack and the substrate flow); f = iPaS substrate with 1 mF array (Fig. 2 impedance example, no dimensions).
- Judgment calls: package_class `other` for the two-substrate Cu-pin DC-DC module; capacitor array modelled as embedded `die` structure with 11 internal layers from the Fig. 1 schematic. Droop 143/129 mV from printed Fig. 8(a) labels; Fig. 10 efficiencies read off plot (+/-0.5 point). ">2 points" efficiency gain entered as simulated (text frames it as M1 vs M4 simulation). Fig. 2/Fig. 9 impedances basis `unspecified` (measured vs simulated not stated). General-substrate 1 kOhm reference hung on TV f with a reference variant. Module assembly ordering not stated, so only the 4-step substrate flow is entered.
- primary_bucket kept advanced_substrate; buckets add thermal_pdn (PDN/VPD content).
- Not reported: RDL count/materials/thicknesses, via/PTH dimensions, core material, Cu pin dimensions, module-to-board interconnect (balls drawn unlabelled), M1 substrate size, inductor values, MLCC counts, Vin/fsw, sample counts, reliability.
- Source: affiliation lines garbled in text.md (font encoding); read from page render.

## ectc51846.2026.00302 (Fraunhofer IZM SLE V-groove + IOX waveguide glass)
- Figures opened: page_02-03 renders; Fig. 1(b) re-crops at 300 and 600 dpi; Fig. 3 re-crop; candidates p02_fig1, p03_fig2, p03_fig3, p03_fig4.
- Key figures: f01 Fig. 1 micrograph (candidate p02_fig1); f02 Fig. 2 top_view_layout (candidate p03_fig2); f03 Fig. 3 micrograph (manual); f04 Fig. 4 optical_plot (candidate p03_fig4).
- TV: one panel-level build (100 x 100 mm D 263 T eco, package_class photonic_interposer, inferred). 12-step flow: CO2 cut, fs-laser modification, KOH etch, sputter metal mask, dip-coat resist, LDI, metal etch, two-step Ag IOX, CO2 cut for access, passive fiber placement, IL measurement with V-groove cut-off.
- Coupling loss 1.756 +/- 0.029 dB and IL 3.381 dB (sd 0.019 dB), n = 5, 1550 nm. Fig. 1(b) microscope overlay labels (369.53, 250.02, 17.28, 537.38 um) entered as geometry metrics; feature assignment checked by pixel scale (0.81 px/um at 300 dpi); 537.38 um noted as "likely substrate thickness" (not stated in text), not put in stack_layers.
- Not reported: waveguide dimensions/index, MFD values, propagation loss, V-groove pitch/depth/angle, process conditions (laser, KOH, IOX salt/temperature/time), polarization, reliability.
- Short (4-page) paper; no source defects beyond candidate p03_fig3 including a section heading.

## ectc51846.2026.00074 (Georgia Tech TGV liners, glass core reliability)
- Figures opened: page_02-05 renders; re-crops of Fig. 1(b), Fig. 5, Fig. 11, Fig. 12 (150 dpi), Fig. 5/6 legends (600 dpi), Fig. 11 (300 dpi); candidates p02_fig1, p03_tableii, p03_fig5, p05_fig11, p05_fig12, p05_fig13.
- Key figures: f01 Fig. 1(b) stack_schematic (manual); f02 Fig. 11 process_flow (manual); f03 Table II data_table (candidate p03_tableii); f04 Fig. 13 xray_csam (candidate p05_fig13); f05 Fig. 5 simulation_result (manual); f06 Fig. 12 micrograph (manual).
- TVs: a no-liner, b polymer liner (~5 um), c inorganic PECVD liner (~1.5 um) thermal-shock coupons; d ABF GX-92 RDL photopatterning coupon (Fig. 11); e Ansys simulation model (340 um glass, 3x3 TGVs, 300 um pitch, ~1.6 deg taper).
- Judgment calls: AR 3 and AR 5 conventional TGVs kept as two interconnect rows on TV a (no separate results). Thermal shock result `pass` per the authors' X-ray statement (no formal criterion, sample count not given). Table I simulation material properties excluded (attributed to prior work [10]). ABF on the back side entered from Fig. 11 schematic only (text says "on top"); conflict logged. Liner thickness basis measured ("measured thickness ... about").
- has_process_flow = yes: plating flow (Sec. II.A) and the Fig. 11 RDL flow.
- Not reported: glass type/thickness/TGV diameter for experimental TVs, liner chemistries, CVD conditions, plating current densities, metal thickness, sample counts, electrical data, Cu RDL plating.
- Source: text.md renders micro sign as "m" in Sec. IV.C-D; several candidate bboxes offset vertically, p03_fig4 bbox wrong.

## Key-figure notes
- 16 figures chosen: 10 candidate, 6 manual. Manual reasons: no candidate (Fig. 8 of 00170, merged into p03_fig7), heading included (00302 Fig. 3), vertical offset/clipping (00074 Fig. 1, 5, 11, 12).
- Fig. 1 of 00074 is split across columns; only panel (b) (with liner) is boxed, (a) named in notes.
