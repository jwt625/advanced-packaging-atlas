# Batch b072 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b072` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51687.2025.00097 | distilled | 4 | 12 | 24 | 3 | 42 | 0 | 0 | 24 | 6 | yes |
| ectc51846.2026.00204 | distilled | 3 | 6 | 15 | 5 | 22 | 0 | 0 | 34 | 6 | yes |
| ectc51846.2026.00153 | distilled | 6 | 25 | 25 | 0 | 57 | 0 | 0 | 34 | 6 | yes |

All three sources: full text, clean text layer (no TEXT_LAYER_WARNING), no truncation, correct paper.

## ectc51687.2025.00097 (Micron, recyclable carriers for memory W2W)
- Figures opened: page_01-06 renders; candidates p03_table1, p04_fig8, p04_fig10, p05_fig12, p05_fig13, p06_fig14, p06_fig17; manual re-crop of Table 1 (p.3).
- Key figures: f01 Fig. 17 cross_section (candidate p06_fig17); f02 Fig. 13 process_flow (candidate p05_fig13); f03 Table 1 data_table (manual; candidate had a half-cut title line); f04 Fig. 8 stack_schematic (candidate p04_fig8); f05 Fig. 10 stack_schematic (candidate p04_fig10); f06 Fig. 12 stack_schematic (candidate p05_fig12).
- TVs: a/b/c = carrier technologies A (Si carrier, inorganic film, blade debond), B (Si carrier, dielectric/ablation/dielectric/reflection release stack, IR laser), C (glass carrier, absorption layer + high-T adhesive, photonic debond); d = sacrificial-carrier baseline flow of Fig. 5 (775 um -> 30 um grind, CMP, Si etch).
- Judgment calls: generic Fig. 13 flow and Figs. 14-16 results applied to A/B/C (conclusion states void-free CSAM and <2 um thinning for all); Fig. 17 X-section attached to TV a (technology not stated; inorganic temporary layer). Permanent bond entered as level wafer_to_wafer_hybrid, ic_type unspecified (only "hydrophilic bonding" and an SiO2 transit layer described). Requirements (350 C >= 2 h thermal budget, Device 1 TTV <200 nm, bonding-layer TTV <1 um) entered as design_target metrics.
- Not reported: wafer diameter, layer materials/thicknesses (except release stack <1 um), Cu pad pitch/metallurgy, bonding/anneal conditions, laser and flash parameters, bond energies, measured TTV, yield. Paper is largely qualitative.
- Fig. 1 (HBM core-wafer flow) and Fig. 2 (CMOS/Array flow) are concepts without data: not TVs.

## ectc51846.2026.00204 (Nopion/Hanyang, SACA-X nanosolder adhesive)
- Figures opened: page_02-06 renders; 400 dpi crops of Fig. 2(b), Fig. 12(b); candidates p02_fig1, p03_fig4, p04_fig5, p04_fig7, p05_fig10, p06_fig12; manual re-crops of Fig. 1, 4, 5, 12.
- Key figures: f01 Fig. 5 cross_section (manual; candidate clipped panel (b)); f02 Fig. 10 cross_section (candidate p05_fig10); f03 Fig. 7 stack_schematic (candidate p04_fig7); f04 Fig. 1 process_flow (manual; candidate clipped stages and had body text); f05 Fig. 4 micrograph (manual; scale bars clipped); f06 Fig. 12 mechanical_plot (manual; x-axis title clipped).
- TVs: a = 40 um pitch 4.6 mm chip, bumping only; b = 10 um pitch 10x10 mm chip pair (hot-plate bond); c = 20 um pitch 4.6 mm chip pair with hot-plate bond and TCB 0.5/1.0 N, 2 min as variants.
- Values: bump height <1 um, pad height 3 um (Fig. 4); bonding layer ~1 um (Fig. 5); ~40,000 XRM sites; gap 9.91/9.87 um, solder 2.91/2.87 um (Fig. 10); shear 20-23 MPa, curve peaks ~20.4/~22.8 MPa (Fig. 12, read +/-0.3); interface temperatures vs heater setpoint (Fig. 2(b), +/-3 C); DSC peaks (Fig. 8 labels); viscosity minimum 130-140 C; particles 50-70 nm.
- Conflicts: pad thickness Fig. 4 profile 3 um vs text ~3.5 um (40 um pitch; profile chosen); 10 um pitch metallization Fig. 5 label Ti/Cu/Ni/Au vs text Ti/Ni/Cu/Au (figure chosen).
- Judgment calls: interconnect level/type "other" (chip-to-chip self-assembled nanosolder joint); paste-material metrics attached to TV c with scope "applies to all TVs"; insulation statement entered as author_estimate (EDS only).
- Not reported: TCB temperature for Fig. 10-12 samples, chip thickness, resistance/continuity, reliability, shear sample count, which alloy was used per test.

## ectc51846.2026.00153 (Resonac, TBF TM-420 with Xe flash debond on panels)
- Figures opened: page_02-06 renders; 400 dpi crops of Figs. 6, 7, 8, 9; candidates p02_fig1, p03_fig3, p04_tableii, p04_fig6, p05_fig9, p06_tableiv.
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1); f02 Fig. 3 process_flow (candidate p03_fig3); f03 Table II data_table (candidate p04_tableii); f04 Fig. 9 warpage_plot (candidate p05_fig9); f05 Fig. 6 warpage_plot (candidate p04_fig6); f06 Table IV package_photo (candidate p06_tableiv).
- TVs: a 320 mm LW 0.3 mm; b 320 mm LW 0.3 mm + 81 Si dummy chips; c 320 mm 400ZHF 0.3 mm; d 320 mm 400ZHF 0.6 mm; e 510x515 mm LW 0.3 mm; f 320 mm panel-to-panel bare-glass coupon.
- Warpage: plotted values per stage (before PMC, <1 day, few days after), sign + = Cry (EMC side), - = Smile (carrier side); read +/-0.1 mm. Overlapping duplicates entered once with n_samples 2. No before-PMC markers for 320 mm LW coupons.
- Conflicts: 400ZHF final warpage text "around 0.5 mm" vs plot ~-0.3 mm; Sec. III.B "<1 mm across all sizes" vs Fig. 6 510 mm final +1.0/+1.3 mm (plots entered).
- Judgment calls: metal light-to-heat layer added to stacks from Fig. 1 (text calls the coupon three-layer); chip-bonding step performed=no for EMC-only coupons, pressure-oven cure performed left blank; package_class fan_out_panel inferred for chip-first coupons; buckets add organic_rdl_fanout.
- Excluded: method features attributed to refs [4]-[6] (>60 wph, <100 ms), Table I generic comparison, Si CTE ref [7].
- Not reported: glass/TBF/metal-layer thicknesses, warpage tool and temperature, flash pulse details, panel-to-panel cure conditions; no interconnects or interfaces.

## Key-figure notes
- 18 figures chosen: 12 candidate, 6 manual (00097: 1; 00204: 4; 00153: 1).
- 00204 candidates were mostly clipped at the bottom by a few percent of page height (Fig. 4, 5, 12) or included body text (Fig. 1).
- Table candidates (00097 Table 1, 00153 Tables II/IV) start inside the multi-line title; the 00153 ones were accepted (title fragment only), the 00097 one was re-cropped because it also extended to the page edge.
