# Batch b056 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b056` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| itherm55368.2023.10177502 | distilled | 1 | 5 | 14 | 5 | 21 | 0 | 0 | 18 | 6 | yes |
| ectc51687.2025.00323 | distilled | 1 | 3 | 10 | 5 | 12 | 0 | 0 | 25 | 6 | yes |
| ectc51846.2026.00062 | distilled | 3 | 8 | 22 | 5 | 28 | 0 | 0 | 23 | 6 | yes |

## itherm55368.2023.10177502 (PKU, embedded-cooling 5-layer Si 3D stacking TTV)
- Figures opened: page_02-06, page_08 renders; re-crops of Fig. 1(a), Fig. 3, Table I (150 dpi), Fig. 9, Fig. 10 (300 dpi); candidates p04_fig4, p07_fig9, p08_fig10.
- Key figures: f01 Fig. 1(a) stack_schematic (manual); f02 Fig. 3 process_flow (manual); f03 Fig. 4 micrograph (candidate p04_fig4); f04 Table I data_table (manual); f05 Fig. 10 thermal_plot (manual); f06 Fig. 9 simulation_result (manual).
- One TV: 5 DSP Si wafers (500 um, 4 inch) L1-L5 joined by SDB (1100 C, 600 C 5 min anneal) and Au-Au (320 C), reflow-bonded (240 C) to a 60x60x20 mm LTCC pedestal; 32 TTCs (16 on L3 in L4 cavities, 16 on L5). package_class `other` (microfluidic Si cooler stack; no enum fits). TTCs typed `other` with is_emulator yes (no thermal-test-chip enum).
- Process flow: 21 steps from Sec. II.B and Fig. 3 (15 numbered steps split where the text lists distinct operations).
- Judgment calls: metal thicknesses printed as "Cr/Au (50/500 um)", "Cr/Cu (50/500 um)" and Au pattern "500 um" thick are implausible and were not entered as numbers (noted in rows). Heat-transfer coefficient units disagree across Table I (kW/cm2-C), Table II/text (kW/m2-C) and Fig. 10 axis (W/cm2-C); 25.6 kW/m2-C entered from Table I with all alternatives logged. Text dT values (2.6/3.1/4.8 C at 200 W/cm2) entered; Fig. 10 points at 200 W/cm2 read differently (logged). Manifold branch length: 3 mm (text) vs 3500 um (Table I), table used. SDB residual stresses entered as simulated (Fig. 9 labels 3.85/3.4/2.71/2.67 GPa). The "2000 mPa" simulation pressure is quoted as printed in the condition only.
- Not reported: TTC size/power per chip, bond pressures/times, solder alloy, through-hole sizes other than 2 mm pillars, reliability, warpage.

## ectc51687.2025.00323 (Sony, F2B CoW 2.0 um pitch hybrid bonding, CoWoW)
- Figures opened: page_02-05 renders; re-crops of Fig. 5, 12, 13, 14, 15; candidates p02_fig4, p02_fig5, p04_fig12, p05_fig13_2, p05_fig14, p05_fig15.
- Key figures: f01 Fig. 13 cross_section (manual); f02 Fig. 5 stack_schematic (manual); f03 Fig. 4 process_flow (candidate p02_fig4); f04 Fig. 14 electrical_plot (manual); f05 Fig. 12 other (AFM Cu-depth box plot, manual); f06 Fig. 15 reliability_plot (manual).
- One TV (three pad/pitch configurations on one chip -> three interconnect rows i1-i3: 3.0/6.0, 1.4/2.8, 1.0/2.0 um). Conventional vs inhibitor CMP kept as metrics.variant (rule f); interconnect yield_pct carries the advanced-CMP Kelvin yields.
- Process flow: 12 steps from Fig. 4 / Sec. II.A plus the inhibitor-CMP step (Sec. II.C; its position in the flow is inferred, noted).
- Few dimensions: top chip 17 x 24 mm, 0.15 mm; 200 mm wafer; misalignment < 0.5 um. No bonding/anneal temperatures, no dielectric, no TSV dimensions. Kelvin and EM plots have no numeric x-axis values.
- Predicted Cu expansion (5.7/4.6 nm at 400 C) entered as author_estimate; the ref [9] inputs excluded.

## ectc51846.2026.00062 (UCLA CHIPS + K&S, fine-pitch Cu-Cu TCB for 3D)
- Figures opened: page_02-06 renders; 300 dpi re-crops of Fig. 1, 2, 3, 4, 5, 11; 150 dpi re-crops of Fig. 8, 10, Tables I, II; candidates p02_fig1, p03_fig4, p04_tablei, p05_tableii.
- Key figures: f01 Fig. 10 cross_section (manual); f02 Fig. 8 cross_section (manual); f03 Fig. 4 process_flow (manual); f04 Fig. 1 process_flow (manual); f05 Table II data_table (manual); f06 Table I data_table (manual).
- TVs: a = mechanical multi-tier F2B stacks (5x5 and 10x10 mm dies, 10 um pitch, up to 3 tiers on Si-IF); b = DoE test coupon (10x10 mm die on blanket Cu, three temperature/force splits in metrics); c = 20 um pitch electrical pyramid (Si-IF + 3x3 mm 3D die + 2x2 mm 2D die). package_class `other` (solder-free Cu-Cu TCB; neither hybrid_bonded_3d nor microbump_3d fits); primary_bucket kept microbump_3d from batch file.
- Process flows: a 12 steps (Sec. II.A + Fig. 1), b 3 steps, c 13 steps (Sec. II.B, IV + Fig. 4, Table II).
- Judgment calls: measured pillar protrusion 138 nm (Fig. 2b label) entered over ~150 nm text; shear 25 kgf (Table I) over "250 N" text; backside-pad roughness Fig. 9 ~8.4 nm (unbonded) vs text "< 7 nm" logged; SiN passivation step ordered per text (Fig. 1 shows it in step 2). Fig. 11 chain-resistance ranges/medians read off CDF plots; which chain set the before/after-anneal panel shows is not stated (range matches 2D die chains; noted). Specific contact resistance 0.704 ohm-um2 entered as basis derived (de-embedded by authors).
- carrier_format `other` with "4 inch"/"100" size: enum has no 100 mm wafer.
- Not reported: Si-IF details, design pillar diameter, sample counts for DoE/shear, anneal atmosphere (ref [12]), chain yield, reliability.

## Candidate quality notes
- itherm: only 3 of 6 chosen figures had a usable candidate (p04_fig4 used; p07_fig9 and p08_fig10 clip scale bars/axis title); p04_fig3 and p05_fig5 are caption-only boxes at page top-left; Fig. 1 and Fig. 8 had no candidate; p06_tablei covers only the header.
- 00323: page 2/4/5 candidates shifted upward (include the preceding caption, clip bottom labels); only p02_fig4 used as-is.
- 00062: all candidates shifted up ~0.015-0.025 page height (include section heading or clip title/bottom); Fig. 2, 5, 8, 10 had none.
- Totals: 18 key figures, 2 candidate, 16 manual.
