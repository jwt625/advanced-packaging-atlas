# Batch b079 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b079` -> `0 errors, 0 warnings (data/_staging/b079)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00115 | distilled | 2 | 3 | 7 | 1 | 16 | 0 | 0 | 15 | 6 | yes |
| ectc51846.2026.00208 | distilled | 2 | 4 | 9 | 5 | 17 | 0 | 0 | 11 | 6 | yes |
| ectc51687.2025.00356 | distilled | 1 | 1 | 5 | 1 | 12 | 0 | 0 | 30 | 6 | yes |

## ectc51846.2026.00115 (UCLA / Taiwan Foresight, Cu-diamond composite thermal TGV)
- Figures opened: page grids p.3, p.6; 250 dpi crops of p.2 equations; candidates p02_fig1, p03_fig2, p03_fig3, p05_fig6, p05_fig7, p06_fig8, p06_fig9, p07_fig10; re-crops of Fig. 2 and Fig. 9.
- Key figures: f01 Fig. 9 cross_section (manual); f02 Fig. 2 process_flow (manual); f03 Fig. 8 cross_section (candidate p06_fig8); f04 Fig. 6 other (candidate p05_fig6); f05 Fig. 1 simulation_result (candidate p02_fig1); f06 Fig. 3 micrograph (candidate p03_fig3).
- TVs: a = 1000 um borosilicate with 100 um Cu-diamond TGVs (AR 10); b = planar Cu-diamond plating verification coupon (Fig. 7).
- Judgment calls: Fig. 2 ten-step flow expanded with the three-step electroless encapsulation of Sec. III.A (14 steps). HJ-model k_eff (438/514 W/mK) and d_crit (9.1/13.2 um) entered as simulated metrics; model inputs from refs [23], [27] kept only as conditions. Cu shell thickness vs electroless time (Fig. 6) entered as mean values with std dev in scope. Fig. 6 kind = other (process plot with SEM insets).
- Not reported: any measured thermal conductivity, TGV pitch/count, seed thicknesses, plating chemistry/current, vacuum level, measured diamond fraction.
- Source: equation exponents garbled in text layer (hc = 1.25e8 W/m2K confirmed on render).

## ectc51846.2026.00208 (Tohoku / Micro Technology, EL-Ni seed TGV and Cu pillar insertion)
- Figures opened: candidates p02_fig1, p03_fig4, p03_fig5, p03_fig7, p05_fig10, p05_fig11, p05_fig13, p06_fig14 (all clean).
- Key figures: f01 Fig. 13 cross_section (candidate); f02 Fig. 14 cross_section (candidate); f03 Fig. 5 micrograph (candidate); f04 Fig. 4 process_flow (candidate); f05 Fig. 11 cross_section (candidate); f06 Fig. 1 top_view_layout (candidate).
- TVs: a = 1 mm glass wafer with four 40x40 TGV arrays (10/30/50/100 um, 250 um pitch), EL-Ni + Ti/Cu + double-sided Cu ECP; b = 100 um TGV with inserted 74 um Cu pillar and resin.
- Judgment calls: via diameters kept in one TV (same stack) with one interconnect row per diameter; count 1600 per array derived (40x40). Two Cu sputter layers described (adhesion Cu under EL-Ni, Sec. III.A; Ti/Cu 40/500 nm over EL-Ni, Sec. II.A): both entered, position of the adhesion Cu inferred. Initial 5 A/dm2 / 3.5 h plating kept as a split step (s14) next to the optimized 0.5 A/dm2 / 14 h step. Pillar diameter 74 um (Fig. 14) over 75 um (Fig. 4 schematic), logged as conflict.
- Not reported: glass type, wafer size, via resistance, reliability, pillar length/count, resin product, seam size.
- Excluded: Kaijo pillar mounter (Fig. 15) not stated as used; ~4 GPa Cu-O-Si fracture stress from refs [19], [20].

## ectc51687.2025.00356 (IME A*STAR, 1x15 um via-middle TSV)
- Figures opened: candidates p02_fig2, p03_fig3, p03_fig4, p03_fig5, p04_fig6, p04_fig7, p04_fig8; 450 dpi re-crops of Fig. 3, Fig. 3(d-f), Fig. 8(a-e); 500 dpi crop of Fig. 2(a).
- Key figures: f01 Fig. 8 cross_section (candidate); f02 Fig. 3 cross_section (manual); f03 Fig. 4 cross_section (candidate); f04 Fig. 6 cross_section (candidate); f05 Fig. 5 cross_section (candidate); f06 Figure 2 other (candidate).
- TV: single 300 mm Si TSV wafer; all splits (resist, etch recipe, seed % of POR, duty cycle, current density %, anode distribution) as metrics.variant. package_class other (TSV module test wafer); bucket kept si_interposer from batch file.
- Judgment calls: seed thickness and current density only relative (% of POR / % of optimized); entered as variant text. Fig. 2(a) mean bottom CDs read by pixel scale (approx, +/-10 nm); Fig. 2(b) CDU ranges as value_text. Fig. 8(a-e) measured CDs entered per panel (wafer positions of (d),(e) not labelled).
- Not reported: TSV pitch, wafer thickness, absolute layer thicknesses, etch/ECP/anneal/CMP parameters, resistance, reliability.
- Source: Fig. 7(a) and Fig. 8(a) are the same image; Fig. 3(a) 8.10 um label unexplained (excluded).

## Key-figure notes
- 18 figures, 3 manual (00115 Fig. 2 cut at bottom, Fig. 9 full-width with caption line; 00356 Fig. 3 includes section heading), 15 candidate.
