# Batch b055 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b055` -> `0 errors, 0 warnings (data/_staging/b055)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00017 | distilled | 1 | 2 | 6 | 3 | 16 | 0 | 0 | 10 | 6 | yes |
| ectc51687.2025.00141 | distilled | 1 | 3 | 10 | 2 | 11 | 0 | 0 | 10 | 6 | yes |
| estc60143.2024.10712129 | distilled | 9 | 30 | 34 | 13 | 73 | 0 | 0 | 35 | 6 | yes |

## ectc51529.2024.00017 (Intel, sub-3 um pitch C2W hybrid bonding)
- Figures opened: page_02-04 renders; manual re-crop of Fig. 1; candidates p02_fig2, p03_fig4, p03_fig5, p03_fig7, p04_tablei.
- Key figures: f01 Fig. 5 cross_section (candidate p03_fig5); f02 Fig. 1 stack_schematic (manual, no candidate); f03 Fig. 2 process_flow (candidate p02_fig2); f04 Fig. 7 electrical_plot (candidate p03_fig7); f05 Table I data_table (candidate p04_tablei); f06 Fig. 4 xray_csam (candidate p03_fig4).
- One TV (die_stack, hybrid_bonded_3d). Pitch entered as 3 um with `le` qualifier ("3 um and below"); exact pitch and pad CD not disclosed.
- Judgment calls: Fig. 1(a) illustration shows base-wafer vias and bottom bumps; entered as stated/schematic rows without dimensions. Yield-loss regions from text; one value (~12% at ~80% CD) read off Fig. 7. W2W comparison curve in Fig. 7 not entered as a TV (build not described); noted in m7.
- Not reported: pad CD/count, dielectric, wafer size, thicknesses, anneal time, absolute resistance, package assembly.

## ectc51687.2025.00141 (Sony, BI-CIS CoW backside Cu wiring + low-profile micro-bump pad)
- Figures opened: page_02-06 renders; 300 dpi re-crops of Fig. 8(a), 9(a), 9(c), 10(a), 10(b); manual crop of Fig. 6(a)-(f); candidates p02_fig2, p03_fig4, p03_tablei, p04_fig7_2, p06_fig10.
- Key figures: f01 Fig. 7 cross_section (candidate p04_fig7_2); f02 Fig. 2 stack_schematic (candidate p02_fig2); f03 Fig. 6 process_flow (manual; panel (g) in the other column left out); f04 Fig. 4 stack_schematic (candidate p03_fig4); f05 Table I data_table (candidate p03_tablei); f06 Fig. 10 reliability_plot (candidate p06_fig10).
- One TV: 40x33 mm sensor chip + two 33x3.5 mm logic chips, 30k micro-bumps (20 um dia, 40 um min pitch), 0.18/0.18 um backside Cu L/S, 6 um pitch TSV, Cu pad <1 um.
- Judgment calls: microbump level = die_stack_internal (chip-on-wafer); sensor chip component_type other. Plot medians read approx (sheet R ~0.15 ohm/sq, TSV chain ~30.8 kOhm, EM t50 ~17 h, ~9 mOhm/bump). Text cites "Fig. 9(b)" for leakage; caption shows Fig. 8(b) (logged).
- primary_bucket microbump_3d kept.
- Not reported: thicknesses, TSV diameter/depth, solder composition, bonding conditions, barrier and interlayer materials, EM temperature.

## estc60143.2024.10712129 (Resonac, 2.xD: fine bump, fine Cu wiring, large package)
- Figures opened: page_01-05 renders; 300 dpi re-crops of Tables I-V, Fig. 11, Fig. 13, Fig. 15; 600 dpi crops of Fig. 13 scatter, Fig. 8-9, Fig. 10; manual crop of Fig. 7; candidates p02_tablei, p03_tableiv, p04_fig11, p04_fig14, p04_fig15.
- Key figures: f01 Fig. 14 cross_section (candidate p04_fig14); f02 Fig. 7 process_flow (manual, no candidate); f03 Table I data_table (candidate p02_tablei, includes Fig. 2 layout); f04 Table IV data_table (candidate p03_tableiv); f05 Fig. 15 warpage_plot (candidate p04_fig15); f06 Fig. 11 micrograph (candidate p04_fig11). Fig. 12 (die-embedded interposer) not chosen because of the 6-figure limit.
- TVs (9): a/b/c = micro-bump TV-A/B/C (15/15/10 um pitch); d = flux-less TCB TV (design not stated); e = 1.5/1.5 um SAP RDL coupon on 320x320 mm glass panel; f = die-embedded interposer on 515x510 mm panel; g/h = 100x100 mm 2.5D package on substrate-A/-B (different core material); i = stiffener warpage study (substrate A/B not stated).
- Judgment calls: underfill route (CUF+EMC vs MUF) is a split variable (two flows per TV a-c). The 15 um pitch no-void result is attached to both TV-A and TV-B (paper does not say which). Selected stiffener (t=2.0, w=20.5 mm) recorded on g/h following the sequential Sec. III.C narrative. Package f class = fan_out_panel (inferred). Ti 25 um / Cu 150 um seed thicknesses as printed are implausible (likely nm): kept as text in conditions only. Die mounting offset: text <20 um, Fig. 13 shows one point at about -22 um in y (plot value entered, conflict logged). Fig. 15 bars read +/-30 um.
- primary_bucket panel kept; buckets extended with si_interposer (2.5D on 50x50 mm Si interposer).
- Source: all tables are images; text.md has captions only.
- Not reported: die counts, substrate layer count, materials/products, TSV details, sample counts, wafer sizes.

## Candidate quality
- 18 figures: 15 candidate, 3 manual (00017 Fig. 1, 00141 Fig. 6, estc Fig. 7: no candidate; 00141 Fig. 6 also split across columns).
