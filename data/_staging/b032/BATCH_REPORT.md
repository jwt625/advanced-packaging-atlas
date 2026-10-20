# Batch b032 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b032` -> `0 errors, 0 warnings (data/_staging/b032)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00179 | distilled | 2 | 5 | 4 | 2 | 12 | 2 | 0 | 36 | 6 | yes |
| ectc51909.2023.00151 | distilled | 6 | 9 | 15 | 3 | 12 | 0 | 0 | 19 | 6 | yes |
| tcpmt.2025.3599484 | distilled | 4 | 0 | 12 | 6 | 22 | 0 | 0 | 51 | 6 | yes |

## ectc51909.2023.00179 (SK hynix, C2W hybrid bonding for 8Hi HBM)
- Figures opened: page_02-04 renders; 300 dpi re-crops of Fig. 1, 2, 4, 6, 10, 11, Table 1; candidates p02_fig1, p02_fig2, p02_fig4, p03_fig6, p04_fig12.
- Key figures: f01 Fig. 1 cross_section (candidate p02_fig1); f02 Fig. 12 thermal_plot (candidate p04_fig12); f03 Table 1 data_table (manual, no candidate); f04 Fig. 4 xray_csam (candidate p02_fig4); f05 Fig. 2 micrograph (candidate p02_fig2); f06 Fig. 6 other (candidate p03_fig6).
- TVs: a = HBI 8Hi HBM2E real device (C2W Cu/oxide); b = conventional MR-MUF 8Hi reference (thermal/electrical comparison only).
- Judgment calls: the HBI 8.0% vs 20% bump-density structures in Fig. 12 kept as metrics.variant on TV a (pad layout not described). 58 um chip thickness is the Fig. 1 equal-thickness comparison case, entered as design_target with note. Fig. 12, the R/L/C reductions and the >100 um length reduction have basis unspecified (method not stated). Fig. 4 bond strength printed "J"; unit taken as J/m2 from Sec. II.E. HBM2E functional >4.0 Gbps entered as electrical_interfaces (lane_rate gt). Process order: front CMP, TBDB, backside, debond, dicing, cleaning, remount, plasma, megasonic, bond, anneal, mold; relative order of plasma vs megasonic and remount position not stated (noted).
- Conflicts logged: stack height 15% (Fig. 1) vs 10~15% (text) vs >15% (abstract, 16hi); thermal resistance 22.8% lower vs abstract "<20% of conventional"; Fig. 6 Sample 2 annotation 14 nm vs ~9.5 nm bar difference.
- Not reported: die size, pad pitch/count, passivation material/thickness, TSVs, bond force/time, plasma gases, wafer size, reliability durations/sample counts.
- Source: no Fig. 3 in the paper (numbering skips).

## ectc51909.2023.00151 (SK hynix, MR-MUF C2W for HBM3 8Hi)
- Figures opened: page_02-04 renders; candidates p02_fig3, p02_fig4, p03_fig8, p03_fig12, p04_fig14, p04_tableii.
- Key figures: f01 Fig. 8 cross_section (candidate p03_fig8); f02 Fig. 3 stack_schematic (candidate p02_fig3); f03 Fig. 4 process_flow (candidate p02_fig4); f04 Fig. 14 thermal_plot (candidate p04_fig14); f05 Table II data_table (candidate p04_tableii); f06 Fig. 12 xray_csam (candidate p03_fig12).
- TVs: a = HBM3 8Hi MR-MUF stack (logic 10.8x9.8 mm, memory 10.5x9.5 mm, 720 um height, 15 um gap); b = 2.5D proxy package (Si interposer + organic substrate) for JEDEC reliability and Tj; c = TC-NCF 8Hi reference; d/e/f = blanket coupons, 550 um LMC A/B/C on 775 um Si (one TV per resin, as different stacks).
- Judgment calls: Tj results attached to proxy package b (Sec. II.B says thermal evaluated in proxy packages); TC-NCF test package not described. Mount order (vertical vs planar) and dispense patterns are metrics.variant. Blanket warpage values 3.6/1/0.5 have no unit on the axis; entered as relative. Bonding method mr_muf for the microbump level; height_um = chip-to-chip gap.
- Conflict: text cites "Table I" for reliability; table printed as Table II (logged).
- Not reported: bump pitch/diameter/count/alloy, reflow profile, chip thicknesses, mold pressure/vacuum values, wafer size, interposer/substrate dimensions, sample counts. Fig. 1 is reprinted from ref [1] (not chosen).

## tcpmt.2025.3599484 (Amkor/Sogang, single-mask grayscale ETR)
- Figures opened: page_03, 04, 06, 07, 08, 09 renders; re-crops of Fig. 1, Fig. 3(a), Fig. 4; candidates p03_fig1, p04_fig4, p06_fig8, p07_fig9, p08_fig10, p09_fig12.
- Key figures: f01 Fig. 9 cross_section (candidate p07_fig9); f02 Fig. 4 process_flow (manual: candidate included running header); f03 Fig. 1 stack_schematic (manual: same reason); f04 Fig. 10 cross_section (candidate p08_fig10); f05 Fig. 12 reliability_plot (candidate p09_fig12); f06 Fig. 8 micrograph (candidate p06_fig8).
- TVs: a = ETR (up to 4 Cu layers, wafer test structures); b = SAP RDL comparison (same dielectric); c = ETR with Ti cap (extra mask, EM <10% after 4000 h); d = HFSS microstrip model (rectangular vs rounded edges as variants).
- Judgment calls: package_class organic_rdl_interposer inferred (paper targets organic interposers/bridges; noted). Table I routing densities entered as derived metrics (16 rows); SAP via sizes there are typical values, not the fabricated SAP (noted). Stacked via diameters entered as design (5, 2 um) with measured per-level values in evidence entries; stepper overlay 0.3 um (3 sigma) in alignment_um with override stated. Fig. 3(a) S21 at 70 GHz read off the plot (simulated). SAP seed deposition step taken from the general Sec. II.B.2 description (noted).
- Conflicts: smallest via 3 um (Sec. II.B.1) vs 1.5 um measured (Fig. 9(b)); dielectric 3 um target vs 3.3-3.5 um opening depth vs 3.9 um EM sample (logged).
- Not reported: wafer size, dielectric product, Cu roughness of this work, EM sample counts, Ti-cap EM conditions, measured S-parameters.

## Candidate quality
- 18 figures chosen: 15 candidates used as-is, 3 manual (00179 Table 1 missing; tcpmt Fig. 1 and Fig. 4 candidates start at page top including the running header).
