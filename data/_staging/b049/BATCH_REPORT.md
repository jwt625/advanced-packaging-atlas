# Batch b049 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b049` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| eptc59621.2023.10457909 | distilled | 3 | 5 | 11 | 3 | 2 | 0 | 0 | 27 | 6 | yes |
| ectc51529.2024.00051 | distilled | 4 | 13 | 16 | 9 | 16 | 0 | 0 | 16 | 6 | yes |
| ectc51906.2022.00332 | distilled | 3 | 4 | 8 | 4 | 16 | 2 | 0 | 19 | 6 | yes |

## eptc59621.2023.10457909 (ASE, 600x600 mm chip-first FOPLP warpage simulation)
- Figures opened: page_01-04 renders; 150-300 dpi re-crops of Fig. 1, 3, 7 (contour labels), 10; candidates p03_fig9, p04_fig10, p03_fig8, p02_fig5.
- Key figures: f01 Fig. 1 stack_schematic (manual); f02 Fig. 3 stack_schematic (manual); f03 Fig. 9 stack_schematic (candidate p03_fig9); f04 Fig. 10 warpage_plot (manual); f05 Fig. 8 simulation_result (candidate p03_fig8); f06 Fig. 5 simulation_result (candidate p02_fig5).
- TVs: a = M-series 2P2M model (simulation_model), b = aWLP model (simulation_model), c = real 600x600 mm panel (panel_level, measured Fig. 10). c inferred to be M-series because the Fig. 10 Simul. curve equals the Fig. 8 M-series values.
- Judgment calls: CPD thickness, CTE multiple, modulus multiple and fan-out ratio splits kept as metrics.variant on TV a (rule f). Simulated warpage values are the printed contour labels; real-panel values read off the Fig. 10 plot (+/-0.1 mm). has_process_flow = yes on thin evidence: incoming panel, Passivation 1 cure, Passivation 2 cure stages (2 steps on TV c). Stack seq follows Fig. 1 drawing (Passivation 2 on top).
- Conflicts: fan-out ratio 1.0-3.0 (Fig. 7, text) vs 1.5-3.5 (Table 5); 2P2M text vs one RDL row in Table 1; text cites "Figure 9" for the Fig. 8 data.
- Not reported: die/package size, absolute CTE/modulus per split, cure conditions, materials by product, measurement method and n for real panel.
- Source: candidate p01_fig2 actually covers Fig. 1; Fig. 3 had no candidate; p04_fig10 cuts x-axis labels.

## ectc51529.2024.00051 (IBM DBHi cavity-free Si bridge, QCM 30 um pitch)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 1, 4, 6, 7, 8, 10, 13, Tables II/III; candidates p02_fig1, p03_fig3, p02_tableii, p04_fig5.
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1); f02 Fig. 4 package_photo (manual); f03 Fig. 3 micrograph (manual); f04 Table III data_table (manual); f05 Table II data_table (candidate p02_tableii); f06 Fig. 5 simulation_result (manual).
- TVs: a = DCM with CUF-A, b = DCM with CUF-B (different encapsulant = different stack, following the b020 dielectric-leg precedent), c = QCM 67.5x67.5 mm, d = main-chip wafer for mixed-pitch probing (wafer_level).
- Judgment calls: FEM results attached to the physical TVs with basis simulated; Fig. 8/10 do not say which DCM underfill was modelled. 150 um C4 pitch taken from Sec. VI (main chip bumps) and applied to DCM/QCM C4. Probing metrics = highest plotted upper bar per Fig. 13 panel (approx). Process flow (thin bridge, bond bridge to chips, mass reflow tile to laminate, underfill, cap) from Sec. I/IV text, replicated for a, b, c.
- Conflicts: Sec. V text says CUF-A module showed superior reliability, contradicting Tables II/III (CUF-B passed 2000 cycles); tables entered.
- Not reported: uC4 diameter/height, bonding/reflow profiles, main-chip thickness, DCM laminate size/layers, failure criterion for the 29 nets, FEM legend units, wafer size.
- Source: p03_fig3 merges Table III lower block; p03_tableiii covers only the first block; p04_fig5 cuts labels; Fig. 4 has no candidate.

## ectc51906.2022.00332 (UCLA Si-IF SuperCHIPS, OCR source)
- OCR text (TEXT_LAYER_WARNING present); every number verified on page renders.
- Figures opened: page_01-06 renders; 300 dpi re-crops of Fig. 3; page crops of Fig. 4, 5, 6, 7, Table I. candidates.json is empty: all bboxes manual.
- Key figures: f01 Fig. 3 micrograph (manual); f02 Fig. 5 simulation_result (manual); f03 Fig. 7 electrical_plot (manual); f04 Fig. 6 electrical_plot (manual); f05 Table I data_table (manual); f06 Fig. 4 micrograph (manual). Fig. 2 skipped (reprinted from [12]).
- TVs: a = GF-TS GF22FDX dielet on Si-IF; b = 2x2 UDSP (TSMC 16FF) on 8 mm Si-IF; c = batch-B defect-detection Si-IF coupon.
- Judgment calls: package_class si_interposer_2p5d for Si-IF (no TSV; no better enum). 0.38 pJ/bit entered for TV b although the text says "reported in [13]": it is this paper's own 2x2 UDSP assembly and the title claim. GF-TS lane rate 3 Gbps (abstract) vs 2.8 GHz max oscillator frequency (logged). UDSP lane rate 1.1 Gbps derived from 1.1 GHz SDR. RLC joint values (Fig. 5 table) are simulated. ESD-free 1000+ links attached to TV b (assembly not specified).
- Excluded prior-work numbers: 400 um link < 20 ps / < 0.04 pJ/bit [12], IL -2 dB to 16 GHz [14], <= 1 um misalignment [5],[7], Fig. 2(a) 5.5 mm photo [12].
- Not reported: TCB conditions, Si-IF dielectric/thicknesses, dielet thickness, assembly yield, reliability.

## Key-figure notes
- 18 figures chosen: 5 candidate, 13 manual. Paper 3 had no candidates (OCR). Candidate failures: label mismatch (eptc p01_fig2 = Fig. 1), merged neighbour (ectc51529 p03_fig3), partial table (p03_tableiii), cut axis labels (eptc p04_fig10, ectc51529 p04_fig5).
