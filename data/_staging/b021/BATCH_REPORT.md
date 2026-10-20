# Batch b021 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b021` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00117 | distilled | 4 | 9 | 3 | 4 | 5 | 0 | 0 | 22 | 6 | yes |
| ectc51687.2025.00061 | distilled | 1 | 10 | 7 | 4 | 15 | 0 | 1 | 10 | 6 | yes |
| ectc51687.2025.00178 | distilled | 9 | 9 | 21 | 2 | 6 | 0 | 0 | 44 | 6 | yes |

## ectc51846.2026.00117 (ASE double-sided connection SESUB)
- Figures opened: page_01-05 renders; 300 dpi re-crops of Fig. 7, Fig. 10, Fig. 11, unnumbered p.5 cross-section; candidates p03_fig7, p03_fig8, p04_tablei, p04_fig10, p04_fig11.
- Key figures: f01 Fig. 7 stack_schematic (candidate p03_fig7); f02 unnumbered p.5 cross-section micrograph (manual); f03 Table I data_table (candidate); f04 Fig. 11 thermal_plot (candidate); f05 Fig. 10 thermal_plot (candidate); f06 Fig. 8 thermal_plot (candidate).
- TVs: a = double-sided SESUB TV (1-2-1, Driver IC + HSFET + LSFET embedded); b = side-by-side benchmark (simulation_model); c = single-side SESUB POR benchmark; d = backside thermal-via simulation (via type as metrics.variant).
- Judgment calls: Fig. 11 values (67.5 vs 52.2 C, -15.3 C) entered with basis unspecified: text calls them experimental TV data but the panels are simulation-style contour maps (conflict logged). Table I is simulated. has_process_flow = yes on thin evidence: Sec. II lists critical steps (die placement, lamination, laser drilling, Cu plating) plus die thinning (Sec. I.A); order as listed. Slot via 2x2 / 5x5 mm sizes are a capability statement (rows on TV a with note). 42% X-Y reduction (abstract) entered; 57.9% / -59.5% for generic SESUB in the intro excluded and logged as conflict.
- primary_bucket kept advanced_substrate; added thermal_pdn (thermal focus).
- Not reported: die/substrate sizes and thicknesses, dielectric materials, via dimensions of the TV, front Cu thickness, reliability conditions, warpage values.
- Source: short paper, marketing-style; no scale bars; p.5 cross-section has no caption.

## ectc51687.2025.00061 (Intel CHIPS/PIPES CPO MCP)
- Figures opened: page_03-05 renders; 400 dpi re-crops of Fig. 5, Fig. 7, Fig. 12; candidates p03_fig5, p04_fig11, p04_fig12, p05_fig14, p05_fig15, p05_fig16.
- Key figures: f01 Fig. 5 stack_schematic (candidate); f02 Fig. 12 process_flow (candidate); f03 Fig. 16 package_photo (candidate); f04 Fig. 11 micrograph (candidate); f05 Fig. 15 xray_csam (candidate); f06 Fig. 14 xray_csam (candidate).
- One TV (65x65 mm MCP, cpo_module). n_dies = 9 derived (1 FPGA + 2 data converters + 3 EIC + 3 PIC).
- Process flow (15 steps) in three flows: PIC die prep (plasma trench, temporary carrier, thinning-singulation, release, pick), 3D EIC-PIC stack (second carrier, Hot Tack TCB, formic acid reflow), package assembly (substrate pre-screen bake, inline TCB FAR, jet-valve UF, IHS + polymer TIM, LT-solder BGA, inspection, FAU butt-coupling at Tyndall).
- Optical: "3 FAUs (56 couplers, 127um pitch)" entered as channels 56 / pitch 127 um; per-FAU vs total ambiguous (noted). No loss or wavelength.
- Metrics: delamination yield loss ~50% after pre-screen bake, ~90% cumulative; none after lower-thermal-exposure TCB; die thickness +/-2 um and 50 um capability; modelling results qualitative only (Fig. 6-8 have no numeric values).
- primary_bucket cpo; buckets cpo;si_bridge (EMIB).
- Not reported: all bump/bridge pitches (Fig. 5 'EMIB pitch' label has no value), die/substrate dimensions, bonding conditions, material products, warpage numbers.

## ectc51687.2025.00178 (Shinko glass core build-up substrate with TGV)
- Figures opened: page_02-05 renders; 400 dpi re-crops of Fig. 4, 6, 7, 8, 10; 200 dpi re-crops of Fig. 6, Fig. 18; candidates p01_fig1, p03_fig6, p03_fig8, p04_fig13, p04_fig14, p04_table1.
- Key figures: f01 Fig. 14 cross_section (candidate p04_fig14); f02 Table 1 data_table (candidate p04_table1); f03 Fig. 13 package_photo (candidate p04_fig13); f04 Fig. 8 warpage_plot (manual); f05 Fig. 6 simulation_result (manual); f06 Fig. 18 reliability_plot (manual).
- TVs: a/b glass vs organic measurement samples (positional accuracy, DIC warpage); c-f warpage simulation models (organic, Low/Middle/High CTE glass; substrate-only vs after 2-chip assembly kept as metrics.variant, following the b020 stage convention); g SEWARE stress simulation (resin thickness, edge coating as variants); h edge-coating coupon (210 um resin, 10x 260 C reflow; coating split as variant); i TGV prototype (Table 1; Low/Middle CTE glass kept as variants since Table 1 lists them as one design option).
- Warpage sign: + convex / - concave (text) for top-view Fig. 4/6/7; Fig. 8 is bottom view (opposite sign), so only its labelled spans (82 vs 234 um) entered.
- has_process_flow = yes: TGV Cu fill plating, layer-by-layer build-up lamination with cure (180 C from the simulation stress-free statement), 5x 260 C reflow (TV i); resin lamination, edge coating, 10x reflow (coupon h). TGV formation method not described, not entered.
- Reliability: TS (JEDEC condition C, -55/+125 C, 1000 cyc), HTS 150 C 1000 h, u-HAST 130 C/85%RH 100 h, n=3 each, both glasses, all within +/-10% (pass).
- Not reported: glass CTE values/products, build-up resin product and per-layer thickness, TGV formation method, absolute daisy-chain resistance, stress simulation temperature load.

## Key-figure notes
- 18 figures: 14 candidate, 4 manual (00117 p.5 uncaptioned cross-section; 00178 Fig. 8 clipped x-axis title, Fig. 6 included previous caption tail and clipped bottom row, Fig. 18 missing because caption printed 'Fig,18').
- 00117 candidate p04_fig9 bbox starts at (0,0) (not used).
