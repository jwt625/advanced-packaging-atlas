# Batch b061 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b061` -> `0 errors, 0 warnings (data/_staging/b061)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tcpmt.2025.3628798 | distilled | 4 | 8 | 26 | 8 | 38 | 0 | 0 | 27 | 6 | yes |
| ectc51687.2025.00326 | distilled | 4 | 1 | 16 | 1 | 22 | 0 | 0 | 20 | 6 | yes |
| ectc51906.2022.00113 | distilled | 3 | 0 | 22 | 6 | 18 | 0 | 0 | 20 | 6 | yes |

## tcpmt.2025.3628798 (imec, microbump pitch scaling 20-5 um, In bumps for QC)
- Figures opened: candidate crops p03_fig5-8, p04_fig9-13, p05_fig14-16, p06_tablei, p06_fig17-19, p07_fig20-22, p08_fig23, p08_fig26, p09_tableii, p09_fig28-29, p10_fig31, p11_fig33-35.
- Key figures (all candidate): f01 Fig. 22 cross_section (p07_fig22); f02 Fig. 15 process_flow (p05_fig15); f03 Fig. 9 process_flow (p04_fig9); f04 Fig. 20 electrical_plot (p07_fig20); f05 Table II data_table (p09_tableii); f06 Fig. 34 cross_section (p11_fig34, reprinted=yes, cited to ref [18]).
- TVs: a = Ni/Sn bumps embedded in polymer WLUF (CMP reveal) on damascene Ni/Cu pad; b = same bumps with CUF after TCB; c = landing-wafer semiadditive Cu/Ni/Co bump coupon; d = In bumps / In-In bonded chips.
- Judgment calls: one interconnect row per pitch for TV a (top bump and landing pad diameters differ; pad_x/y = landing pad diameter from Fig. 10 labels). Photo-patternable polymer route entered as an alternative flow_name under TV a (no separate bonded results). Flux / wet passivation / plasma splits as TV b metric variants. kgf converted to N (logged). Yields 95% / 85% from the conclusion text (Fig. 20 plateaus not read).
- Conflicts: Ni bump 2 um (text) vs 500 nm (Fig. 15 schematic); landing bump density ~25% (text) vs 28.3%/50% (Fig. 6); bump protrusion 300 nm (SEM) vs 450 nm (AFM), both entered.
- Excluded per rule (a): In-In 95% yield, 300-connection chains and Tc ~3 K (all attributed to ref [18]); conclusion's 100% In yield (same data, conflicts with 95%); roadmap/TSV generic numbers.
- Not reported: die sizes/thickness, polymer/CUF products and cure, bonding time, reliability sample counts, EM results (ongoing).

## ectc51687.2025.00326 (Resonac, panel-level 1.5/1.5 um SAP RDL)
- Figures opened: page_02-05 renders; candidates p02_fig1, p03_fig5, p05_fig10; manual re-crops of Figs. 3, 5, 6, 8, 10.
- Key figures: f01 Fig. 8 cross_section (manual, no candidate); f02 Fig. 1 process_flow (candidate p02_fig1); f03 Fig. 3 package_photo (manual, no candidate); f04 Fig. 5 electrical_plot (manual, candidate clipped x-axis labels); f05 Fig. 10 data_table (manual, candidate cut Sz row); f06 Fig. 6 reliability_plot (manual, no candidate).
- TVs: a = 3-layer SAP RDL on 320x320 mm glass carrier; b = single-layer SAP meander/comb coupons (etchant change as variant); c = damascene 1.5/1.5 wiring on wafer; d = SAP comb with protective material (b-HAST reference, material from ref [5], not described).
- Judgment calls: yield 98.3% from the Fig. 5(a) label (text says >95% and >98%, logged). b-HAST results set to `na`: time axis has no values and the 1E6 ohm line is not defined as a criterion. Text calls the daisy-chain plot "Fig 10"; caption is Fig. 9 (caption cited).
- Note: abstract says "assembled", but no die assembly is described; primary_bucket kept as panel.
- Not reported: wiring height, dielectric thickness used, dielectric/resist products, cure conditions, b-HAST durations.

## ectc51906.2022.00113 (SK hynix, SiCN composition and Cu pad shape for W2W hybrid bonding)
- Figures opened: page_02-05 renders; candidates p02_fig2, p02_fig3, p04_fig7, p04_fig8, p04_tableii, p05_tableiv; 400 dpi rotated crop of Fig. 6 x labels; manual re-crops of Figs. 3 and 8.
- Key figures: f01 Figure 8 cross_section (manual; candidate had wide margins); f02 Figure 3 stack_schematic (manual; candidate had blank top half); f03 Figure 2 process_flow (candidate p02_fig2); f04 Table IV data_table (candidate p05_tableiv); f05 Table II data_table (candidate p04_tableii); f06 Figure 7 xray_csam (candidate p04_fig7).
- TVs: a = SiCN film1 (C ~10%) W2W; b = SiCN film2 (C 10-20%) W2W with P3 CMP split; c = unpatterned dielectric bonding coupons (film pairs as variants because Fig. 6 has no numeric axis).
- Judgment calls: pad types A/B/C as separate interconnect rows (pitch ~2 um, pad ratio in notes). Table IV sign read as + protrusion / - dishing (from text: higher pressure, more dishing). EMMI/TEM 81.8% match attached to TV b; film not stated. Full flow placed on TV b only.
- Source problems: text.md omits the p.5 right column (3-5 nm dishing optimum, Conclusion), read from page render. Table I vs II disagree on pad type C top shape (square vs circle). Figure 3 caption duplicates Figure 2's. Table IV inner header is a copy of Table III's.
- Not reported: wafer size, film thicknesses, pad size, anneal conditions for patterned wafers, absolute yields and surface energies.

## Key-figure notes
- 18 figures: 11 candidate, 7 manual (b061 paper 1: 0 manual; paper 2: 5; paper 3: 2).
- Candidate failures: missing candidates for Figs. 3, 6, 8 of 00326; bottom clipping (00326 Fig. 5, Fig. 10); blank-margin over-wide boxes (00113 Fig. 3 y0=0, Fig. 8 x0=0).
