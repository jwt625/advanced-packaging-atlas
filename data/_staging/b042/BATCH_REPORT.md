# Batch b042 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b042` -> `0 errors, 0 warnings (data/_staging/b042)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00128 | distilled | 3 | 2 | 8 | 3 | 11 | 0 | 0 | 20 | 6 | yes |
| ectc51529.2024.00064 | distilled | 1 | 4 | 4 | 2 | 9 | 0 | 0 | 30 | 6 | yes |
| ectc51687.2025.00085 | distilled | 4 | 25 | 23 | 0 | 6 | 0 | 0 | 46 | 6 | yes |

## ectc51529.2024.00128 (Intel, 0.64-0.36 um pitch W2W hybrid bonding)
- Figures opened: page_03-05 renders; re-crops of Fig. 4, 11, 13; candidates p03_fig5a, p03_fig6a, p04_fig8, p05_fig10a.
- Key figures: f01 Fig. 11 cross_section (manual); f02 Fig. 5 stack_schematic (candidate p03_fig5a); f03 Fig. 6 micrograph (candidate p03_fig6a); f04 Fig. 10 xray_csam (candidate p05_fig10a); f05 Fig. 8 simulation_result (candidate p04_fig8); f06 Fig. 13 electrical_plot (manual).
- TVs: a = W2W test chip pair (3 pitch lattices as 3 interconnect rows, not separate TVs, since the lattices share one die/stack); b = D2D link power vs pitch analysis (Fig. 4, simulation_model); c = FEM contact area vs recess model (Fig. 8, simulation_model).
- Judgment calls: 0.36 um = 0.33 x 0.4 um rectangular lattice (pitch_min/max). Density 7.7M/mm2: abstract "over", conclusion "up to" -> qualifier approx, conflict logged. Fig. 8 empty columns (0.25 a.u. recess at 0.6 and 0.3 um pitch) entered as value_text "no bar plotted", not 0. Bottom-wafer bond layer assumed identical to top (upper/lower pads equal; Fig. 11 symmetric), noted. Dielectric material_class inorganic is inferred (not named).
- Not reported: wafer diameter, die size, any layer thickness, pad/via size, dielectric names, bond/anneal conditions, alignment value, absolute chain resistance, chain yield, 0.48 um results; Fig. 9 AFM height axis has no numbers (1-2 nm pad height taken from conclusion text).
- Source: candidates labelled "(a)" hold both panels; Fig. 11 and Fig. 13 had no candidate. Fig. 9 caption cites "Fig. 8(b)" for its own panel (b).

## ectc51529.2024.00064 (Samsung, TC-NCF CoW for mobile AP)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 1, 2, 3(b), 4, 5(a), 5(b-c), 6; all six candidates.
- Key figures (all candidate): f01 Fig. 6 cross_section (p05_fig6); f02 Fig. 1 process_flow (p02_fig1); f03 Fig. 5 xray_csam (p04_fig5); f04 Fig. 4 other (p04_fig4); f05 Fig. 2 simulation_result (p03_fig2); f06 Fig. 3 simulation_result (p03_fig3).
- TVs: one TV for the PV1-PV5 family with per-PV values in metrics.variant. Judgment call: PVs are different die sets, but the paper discloses no per-PV construction (only bump count 30k-100K range), so separate TVs would be empty duplicates.
- Conflicts logged: yield >97% (text) vs >98% (Fig. 5 caption) vs wafer-map label YLD 99.61% (both 97 gt and 99.61 entered); chip area +4.2% (text) vs 5% (Fig. 6(a) label) vs abstract wording "fillet 4.2% of top chip area"; +6k vs +5k bumps; "within 12%" vs PV3 label 12.2%.
- Excluded: obfuscated values (Force A/B/C, viscosity B, thickness C, Fig. 3(c) Cpk table, 1.5B N at 1.03C), Fig. 2 inner-volume axis (inconsistent labels on equal gridlines). Fig. 2 NCF thickness read on right axis (+/-0.2 um).
- Process order: wafer test vs wafer-level mold/grind order not explicit; noted on step s07.
- Not reported: chip sizes/thicknesses, wafer size, TSV dimensions, NCF product, mold material, exact TCB conditions per PV (window 300-380 C, 100-300 N only), reliability, warpage.

## ectc51687.2025.00085 (TSMC, CoWoS-R thermal TV)
- Figures opened: page_02, 04, 05 renders; 300 dpi re-crops of Fig. 1, Fig. 5-6, Fig. 8, 9, 11, Tables 1-5; manual crops of Fig. 2, Table 1, Table 3; candidates p01_fig1, p02_fig2, p02_table1, p03_table2, p03_table3, p04_fig9.
- Key figures: f01 Fig. 1 stack_schematic (candidate p01_fig1); f02 Fig. 2 top_view_layout (manual); f03 Table 1 data_table (manual); f04 Table 2 data_table (candidate p03_table2); f05 Table 3 data_table (manual); f06 Fig. 9 thermal_plot (manual).
- TVs: a/b/c = same 3.3x reticle CoWoS-R TTV with graphite film, liquid-metal gel, indium metal TIM1 (TIM changes the stack -> separate TVs); d = calibrated FloTHERM model (indium TIM), with BLT, contact-resistance and cold-plate/flow-rate variants in metrics.variant.
- Tables 1-5 are images missing from text.md; all values read from re-crops. Package areas (interposer 2,685, substrate 5,616, lid 5,556, SoC 332.8, HBM 121 mm2) come from model-geometry Table 3; entered on TVs a-c with notes.
- has_process_flow = yes on the metal TIM assembly sequence (BSM, CoW attach, TIM oxide removal, TIM place, lid attach, solder); TV c only. Paste vs sheet indium inconsistency logged.
- primary_bucket kept organic_rdl_fanout per batch file; buckets add thermal_pdn (paper is thermal-solution focused).
- Excluded: IMC-Si direct liquid cooling results (2 kW, >3000 W) attributed to refs [12], [13].
- Not reported: interconnects (bumps only drawn), die x/y and thickness, RDL layers/L/S, substrate layers, lid/TIM2/underfill materials, BLT of graphite and liquid-metal TIMs, sample counts.

## Schema gaps
- No column for area-only sizes (components x/y absent but area given, e.g. SoC 332.8 mm2): kept in notes.
- Bonding temperature/force windows (300-380 C, 100-300 N) have no min/max columns in interconnects; kept in notes and process_steps.conditions.
- No metric/figure kind for a process map (fillet vs non-coverage, Fig. 4 of 00064): used kind other.
