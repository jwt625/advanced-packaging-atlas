# Batch b053 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b053` -> `0 errors, 0 warnings (data/_staging/b053)`.

| paper_id | status | papers | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51529.2024.00125 | distilled | 1 | 2 | 2 | 4 | 4 | 8 | 0 | 0 | 20 | 6 | yes |
| ectc51687.2025.00007 | distilled | 1 | 2 | 3 | 12 | 4 | 12 | 0 | 0 | 12 | 6 | yes |
| ectc51529.2024.00011 | distilled | 1 | 2 | 9 | 16 | 6 | 23 | 0 | 0 | 25 | 6 | yes |

## ectc51529.2024.00125 (TSMC low-temperature SoIC, 200 nm bond pitch)
- Figures opened: page_02-05 renders; candidates p02_fig2, p03_fig6, p03_fig7, p04_fig8, p05_fig10; manual re-crop of Table 1.
- Key figures: f01 Fig. 7 xray_csam (candidate p03_fig7); f02 Fig. 2 stack_schematic (candidate p02_fig2, conceptual, paper-level); f03 Fig. 10 electrical_plot (candidate p05_fig10); f04 Fig. 8 electrical_plot (candidate p04_fig8); f05 Table 1 data_table (manual); f06 Fig. 6 other (overlay vs radius, candidate p03_fig6).
- TVs: a = F2F W2W SoIC test vehicle carrying all three BPM CD/pitch sets (0.1/0.2, 0.15/0.3, 0.2/0.4 um) as test features of one build (one interconnect row per pitch); b = Table 1 bond-pad schemes (direct shrink, A, B), tv_kind other, because the paper does not say whether they were built or simulated (metric basis unspecified).
- Judgment calls: the pad metal is never named and "hybrid" is never written; level wafer_to_wafer_hybrid / bonding_method hybrid_bond_w2w are used with ic_type unspecified and a note. Dual-damascene BPM formation entered as process step 1 from an indirect statement. Bonder (POR vs next-gen) and incoming-wafer splits are metric variants. The wafer size is not stated (the overlay axis runs to ~140 mm radius; 300 mm not entered).
- All plots are normalized (no absolute overlay, resistance or yield); only the inflection ranges (90-100 / 80-90 / 30-40 nm) and the 2.5x / 130 mm / <30 nm statements from the text were entered.
- Not reported: materials, wafer and TSV dimensions, bonding/anneal conditions other than <280 C, absolute yields.
- Source: Figures 3 and 4 do not exist (numbering jumps); Fig. 5 and 6 share an identical caption; candidate p03_table1 holds only the section heading.

## ectc51687.2025.00007 (SK hynix backside RDL with inorganic dielectric)
- Figures opened: page_02-04 renders; candidates p02_fig1, p02_fig2, p02_fig3, p02_tablei, p03_fig4, p04_tableii; manual re-crop of Fig. 4.
- Key figures: f01 Fig. 3 stack_schematic (candidate p02_fig3); f02 Fig. 1 process_flow (candidate p02_fig1); f03 Fig. 2 micrograph (candidate p02_fig2); f04 Table I data_table (candidate p02_tablei); f05 Fig. 4 reliability_plot (manual, the candidate lacked panel a); f06 Table II data_table (candidate p04_tableii).
- TVs: a = EM/TDDB coupon on bare Si (Cu RDL 5 um, 4 um via, SiNx, 60x60 um pads; EM lengths and TDDB spaces as features of one build); b = 8-layer stack on a daisy-chain bottom die with BS RDL (package_class unspecified, because the stack bonding method is not stated).
- Judgment calls: the 8 stacked dies are typed dram (inferred from "3D stacked memory"; whether they are DC dummies is not stated). Ni/Au back bump is ic_type other (no size or bonding method given). EM abrupt-failure times (~90 h at 1000 um, ~30 h at 2000 um) and plotted test durations were read off Fig. 4 (+/-5 h). TDDB leakage is entered as <1e-12 A per space.
- Conflicts logged: the abstract gives 5x3 um L/S, while Table I gives 2 and 3 um spaces (both entered); the text cites Fig. 8 (a),(b) but the caption labels them (b),(c).
- Not reported: all thicknesses, barrier/seed metals, bump geometry, stack bonding, die sizes, sample counts, EM failure criterion, JEDEC document numbers.

## ectc51529.2024.00011 (nepes/DECA 600x600 mm FOPLP leadframe-free QFN)
- Figures opened: page_03-06 renders; candidates p03_fig10, p04_fig12, p05_fig16, p05_fig19; 300/450 dpi re-crops of Fig. 10, 12, 16 (warpage chart) and of Table 1 and Table 2.
- Key figures: f01 Fig. 19 cross_section (candidate p05_fig19); f02 Fig. 10 stack_schematic (candidate p03_fig10); f03 Fig. 12 process_flow (candidate p04_fig12); f04 Table 1 data_table (manual); f05 Fig. 16 warpage_plot (candidate p05_fig16); f06 Table 2 data_table (manual).
- TVs: a = with 2 structural Si dies (FOR 1.5, main evaluation); b = without structural Si (FOR 3.5, warpage only). Yield and CLR are assigned to -a because the paper says the initial engineering samples used structural Si (inferred). The process flow (23 steps) is recorded once, on -a.
- Judgment calls: layer thicknesses come from the Fig. 10 schematic (0.025/0.034/0.025/0.665/0.100 mm); mapping the 0.100 mm base to the backside laminate is inferred. Cu stud is typed cu_pillar and Cu stump / LGA are typed other. Panel warpage was read by pixel scale (+/-0.3 mm) at 5 read points per TV; the sign convention and measurement temperature are not stated. primary_bucket kept as panel; organic_rdl_fanout added to buckets.
- Conflicts logged: LGA lead height 35 um Cu (+7 um SMS, text) vs 0.025 mm in Fig. 10 (text chosen); Table 2 sample qty 40 (TC, uHAST) vs text "80 units" for all (table chosen); abstract strip size 70x250 mm vs body 75x250 mm (body chosen); 0.85 vs 0.849 mm total thickness.
- Not reported: die x/y and function, structural die size, Cu stud diameter, material products, LDI/plating/mold conditions, board-level reliability.
- Source: the text layer renders the micro sign as "P" on p.3 (checked against the image); candidates p04_table1 and p06_table2 cover only the caption lines.

## Key-figure notes
- Of 18 chosen figures, 14 use candidates as-is and 4 are manual: 00125 Table 1, 00007 Fig. 4 (the candidate cut off panel a), and 00011 Table 1 and Table 2.
- All three table candidates in this batch whose caption sits below/above the table body (00125 Table 1, 00011 Tables 1 and 2) pointed at the caption line instead of the table.
