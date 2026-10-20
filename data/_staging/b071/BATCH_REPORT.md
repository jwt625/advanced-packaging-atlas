# Batch b071 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b071` -> `0 errors, 0 warnings (data/_staging/b071)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tcpmt.2025.3610036 | distilled | 4 | 4 | 13 | 6 | 18 | 0 | 0 | 18 | 6 | yes |
| ectc51846.2026.00019 | distilled | 2 | 16 | 11 | 6 | 5 | 1 | 1 | 6 | 6 | yes |
| ectc51846.2026.00416 | distilled | 2 | 6 | 11 | 1 | 16 | 0 | 0 | 23 | 6 | yes |

## tcpmt.2025.3610036 (Georgia Tech PRC / JSR, ps-UV laser microvias)
- Figures opened: page_04-07 renders; 300 dpi re-crops of Table II, Fig. 7, Fig. 8; candidates p05_fig7, p06_fig10, p06_fig12, p07_fig13, p07_fig15.
- Key figures: f01 Fig. 12 micrograph (candidate p06_fig12); f02 Fig. 13 micrograph (candidate p07_fig13); f03 Fig. 10 micrograph (candidate p06_fig10); f04 Table II data_table (manual, no candidate); f05 Fig. 15 other (candidate p07_fig15); f06 Fig. 7 cross_section (candidate p05_fig7).
- TVs: a = 2 um JSR GT-N01 coupon (main result); b = 5 um ABF GX92P filler benchmark; c = Fig. 7 thicker-dielectric coupons (13.6 and 5.9 um, dielectric not stated, kept as one TV); d = holes in thin Cu hard mask (Fig. 8, dielectric not stated).
- Judgment calls: process flow (Sec. IV.C, 7 numbered steps; "application and curing" split into apply + cure -> 9 rows) written for both a and b. Fig. 6 DoE (0.7-0.8 W opens, <=0.6 W none) put in TV a laser-step conditions with "coupon material not stated". Fig. 13-15 (5 um pitch, landing accuracy) attributed to JSR per Conclusion. Abstract-only "5 um via in 5 um ABF without Cu buffer" entered on TV b with note.
- Conflicts logged: 0.08 W (Fig. 12 caption, Sec. V.E) vs 0.8 W (Sec. V.D); Fig. 8 caption 5 um pitch vs text 10/5 um (scale bars agree with text); 3.06 vs 3.0 um; 11.8 vs ~12 um; minimum via 1.26 um vs Conclusion 1.5 um; landing accuracy +/-0.34 (abstract) vs mean 0.24 / max 0.67 um; barrier 80 nm vs 80-100 nm; Df 0.005 vs <0.005.
- Not reported: coupon/carrier size, laminate product, cure/desmear/etch conditions, via resistance, reliability, yield. Fig. 7 may be prior-study data (text says "previous studies") without citation.

## ectc51846.2026.00019 (Mitsubishi Electric, Glass-IP vertical-coupled photonic package)
- Figures opened: page_02-04 renders; 300 dpi re-crops of Fig. 5, 6, 7; candidates p02_fig1, p03_fig3, p04_fig6, p04_fig7, p04_fig9.
- Key figures: f01 Fig. 6 stack_schematic (candidate p04_fig6); f02 Fig. 1 stack_schematic (candidate p02_fig1); f03 Fig. 3 stack_schematic (candidate p03_fig3); f04 Fig. 7 electrical_plot (candidate p04_fig7); f05 Fig. 5 simulation_result (manual; candidate p03_fig5 spans Fig. 4 and 5); f06 Fig. 9 optical_plot (candidate p04_fig9).
- TVs: a = measured single-channel flip-chip EML on Glass-IP on package substrate (package, glass_interposer); b = proposed full Tx/Rx package (simulation_model) carrying the concept components and simulated optics.
- Judgment calls: has_process_flow = yes on thin evidence (three stated assembly actions for TV a, order of the resistor mount not stated; two concept assembly steps for TV b with performed = no). The 212.5 Gbps PAM4 lane entered as an electrical_interface (protocol other, channel_type glass per rule i) because the electrical path substrate -> TGV -> EAM is what was measured; TDECQ/ER/89 GHz as metrics. Peak simulated coupling loss 0.72 dB read from Fig. 5 (approx). 'Au stud' interconnect from Fig. 6(a) label only. primary_bucket kept cpo; buckets glass;cpo.
- Almost no dimensions disclosed: only 90 um EML height, h = 20 um bump height, d = 40/46 um (simulation geometry). Glass-IP, TGV, RDL, die and substrate dimensions not reported.
- Source issues: section headings garbled in the text layer; Fig. 8 caption repeats Fig. 7's caption (image is the test setup).

## ectc51846.2026.00416 (Georgia Tech / Thin Film Technology, blind-cavity embedded MOSFET with glass-Cu vias)
- Figures opened: page_02-07 renders; 300 dpi re-crops of Fig. 3 (4c), Fig. 4, Fig. 6; manual crops of Fig. 2, 3, 7, 12, 13, 16; candidates p03_fig2, p03_fig3, p05_fig12, p06_fig13, p07_fig16.
- Key figures: f01 Fig. 13 cross_section (manual); f02 Fig. 2 process_flow (manual); f03 Fig. 12 cross_section (manual); f04 Fig. 3 process_flow (manual); f05 Fig. 16 xray_csam (manual); f06 Fig. 7 micrograph (manual, no candidate).
- TVs: a = die-embedded glass package (plating splits DC THF/MVF, RP 12/20 h as metrics.variant); b = bare-glass laser cavity etch coupons (Fig. 5, 6).
- Judgment calls: 16-step flow from Sec. II.B + Fig. 2/3/4 (RP waveform read from Fig. 4: +1 mA/cm2 5 x 2.5 ms, -2 mA/cm2 2 x ~2 ms, units as printed). Via count 12 counted on Fig. 16 X-ray. Fig. 6 depth plateaus read +/-3 um. MOSFET thickness 110 um (materials section) chosen over abstract "110 + 30 um" and "~120 +/- 30 um incl. DAF". Thermal shock result = pass (no microcracks/delamination >~50 um by micro-CT), with seed-contact-area delamination noted. buckets extended with thermal_pdn (vias serve as heat path).
- Conflicts logged: DAF 10 vs ~8 um; thickness matching ~10-12 vs ~10 um; via diameters cross-section vs optical; via depth 200 vs height 220 um; DC plating 4-8 h vs 3.5 h sample; overburden ~100 um (thermal shock TV) vs >250 um (conclusion).
- Not reported: die and cavity x/y size, via pitch, coupon size in mm, thermal performance numbers, front-side electrical connection, thermal-shock sample count.
- Candidate quality: all five chosen candidates on p.3, 5, 6, 7 are clipped at the bottom (~0.01-0.02 page height); Fig. 7 has no candidate -> all six key figures manual.

## Key-figure summary
- 18 figures: 10 candidate (5 tcpmt, 5 00019), 8 manual (Table II of tcpmt; Fig. 5 of 00019; all 6 of 00416).
