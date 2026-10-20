# Batch b078 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b078` -> `0 errors, 0 warnings (data/_staging/b078)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00209 | distilled | 6 | 6 | 16 | 4 | 20 | 0 | 0 | 16 | 6 | yes |
| ectc51846.2026.00024 | distilled | 5 | 3 | 16 | 3 | 15 | 0 | 0 | 17 | 6 | yes |
| tcpmt.2025.3538554 | distilled | 4 | 8 | 23 | 6 | 27 | 0 | 0 | 20 | 6 | yes |

## ectc51846.2026.00209 (Sciperio, glass-stacked interposers with Ag nanopaste)
- Figures opened: page_02-04 renders; candidates p02_fig2, p03_fig3, p03_fig4, p04_fig7, p04_fig8, p04_fig9.
- Key figures: f01 Fig. 9 package_photo (candidate p04_fig9); f02 Fig. 4 other, confocal via profile (candidate p03_fig4); f03 Fig. 7 package_photo (candidate p04_fig7); f04 Fig. 3 micrograph (candidate p03_fig3); f05 Fig. 2 micrograph (candidate p02_fig2); f06 Fig. 8 top_view_layout (candidate p04_fig8). No cross-section image exists in the paper.
- TVs: a = two-layer Bluetooth demonstrator (1 mm slide + two 150 um coverslips); b = single-via resistance coupon; c = four-point probe samples (US-202A and CL83A as layer features/metric variants); d = 15x15 mm single-paste adhesion pads (US-202A, CL83A); e = CL83A-over-US-202A adhesion pad; f = 300 um / 600 um pitch via array (Fig. 2).
- Judgment calls: 4-pt probe and single-paste adhesion samples grouped per pattern with paste as feature/variant (same pattern, paste swapped). Via geometry (400 +/- 25 top, 250 +/- 25 exit, 37.42 deg taper) attached to TV a; Fig. 4 marker values (411.285 / 228.144 um) entered as one example profile. Via resistance 0.620-0.840 ohm kept as two range rows in metrics, not in interconnects.resistance_mohm. 20 +/- 2.5 um US-202A thickness is a process value reused for the US-202A layers.
- Conflicts: base slide 22 x 75 mm (p.4) vs 25 x 75 mm (p.2); 22 mm chosen. Abstract calls the resistivity a "resistance".
- Not reported: via count/pitch in the demonstrator, layer alignment accuracy, CL83A bondline thickness, sample counts, RF/functional test, reliability.
- Source: paste names spelled inconsistently (CL83A/CL83-A/CLA83A; US-202A/US-202). Fig. 4 marker [3] 81.961 um is not explained.

## ectc51846.2026.00024 (IME A*STAR / Applied Materials, fine-grained Cu hybrid bonding)
- Figures opened: page_03-06 renders; candidates p04_fig3, p04_fig4, p05_fig5, p05_fig6, p05_fig7, p06_fig8; 300 dpi re-crops of the Fig. 2 legend and Fig. 6 (scratch).
- Key figures: f01 Fig. 6 cross_section (candidate p05_fig6); f02 Fig. 8 cross_section (candidate p06_fig8); f03 Fig. 7 xray_csam (candidate p05_fig7); f04 Fig. 4 micrograph (candidate p04_fig4); f05 Fig. 5 micrograph (candidate p05_fig5); f06 Fig. 3 cross_section (candidate p04_fig3).
- TVs: a = C2W hybrid bond (<220 C post-bond anneal); b = W2W 300 mm pair (pre-bond 200 C anneal yes/no and post-bond <220 C / 250 C kept as metrics.variant); c = standard Cu 400 C resistance reference; d = blanket ECP Cu films (optimized vs baseline recipe as variants); e = patterned damascene pad wafer before bonding (sub_assembly; damascene flow, grain stability, CMP dishing).
- Judgment calls: "bonding temperature below 220 C" treated as the post-bond anneal (anneal_temp_c 220 with qualifier lt). EVG Gemini FB XT is placed only in the W2W flow; the C2W bonder is not named. Pad "size" 3 um entered as pad_x_um. Resistance ~8 mohm entered with scope "structure not stated".
- Conflicts: Fig. 2 legend max grain size 8288 nm vs a 0-1.2 um histogram axis; max not entered.
- Not reported: dielectric materials/thicknesses, pad depth, die size/count, bond force/temperature, anneal times, alignment, resistance test structure, reliability.

## tcpmt.2025.3538554 (SIMIT CAS, double-layer-stacked Si interposer for 32x32 MMA)
- Figures opened: page_02-08 renders; candidates p04_fig2, p04_fig3, p06_fig6, p08_fig11, p08_fig13; re-crops of Table III (250 dpi), Fig. 2 (400 dpi) and Fig. 3 (manual bbox).
- Key figures: f01 Fig. 6 cross_section (candidate p06_fig6); f02 Fig. 2 stack_schematic (candidate p04_fig2); f03 Fig. 3 process_flow (manual: candidate spanned page header and full column); f04 Fig. 13 package_photo (candidate p08_fig13); f05 Table III data_table (manual: no candidate); f06 Fig. 11 warpage_plot (candidate p08_fig11).
- TVs: a = DLSSI (sub_assembly, 49.8 x 49.8 x 0.387 mm, 8-in wafer, 6 dies); b = MMA module (dummy MMA chip, PCB connector, 16 dummy HV-ASICs, 80 capacitors); c = FEA model on DLSSI; d = FEA model on ABF organic interposer.
- Judgment calls: 23 stack layers in top-down order mapped from Fig. 2 leader lines (A, N, B, O, C, P, core/TSV-1, Q, E, R, F, G, H, S, I, T, core/TSV-2, U, K, V, L, W, M). 10/10 um L/S applied to RDL-1..4 (the fan-out RDLs, Fig. 8). TSV-1/TSV-2 in one interconnect row. Table II routing study entered as 5 design metrics. Equivalent E/v/CTE entered as derived (paper's own calculation); Table IV/V constants are cited inputs (layer properties/notes only). HV-ASIC ball count 541 is per ASIC.
- Conflicts: MMA chip thickness 0.4 mm (Table I, abstract, Sec. II.B) vs 0.5 mm (Sec. I); 0.4 chosen.
- Not reported: Cu-Sn bond conditions, TSV count, RDL via sizes, thinning/etch methods, module electrical test, reliability, measured chip warpage after packaging.
- Source: Tables I-VI are images (read from renders); text layer drops the ohm symbol in "about 80 mOhm".

## Key-figure notes
- 18 figures: 16 candidate crops used as-is, 2 manual (tcpmt Fig. 3, Table III).
