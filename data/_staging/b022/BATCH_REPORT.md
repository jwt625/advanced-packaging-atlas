# Batch b022 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b022` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00219 | distilled | 2 | 4 | 8 | 4 | 13 | 0 | 0 | 12 | 6 | yes |
| ectc51906.2022.00181 | distilled | 1 | 5 | 7 | 4 | 11 | 0 | 0 | 8 | 6 | yes |
| ectc51906.2022.00008 | distilled | 3 | 11 | 10 | 5 | 0 | 1 | 0 | 21 | 6 | no |

## ectc51909.2023.00219 (Sony, 6 um pitch CoW Cu-Cu hybrid bonding, >400 mm2 chips)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 5, 10, 11, 12, 15; Fig. 14 re-crop; candidates p02_fig5, p02_tablei, p03_fig7, p04_fig12, p04_fig13, p04_fig14, p05_fig16.
- Key figures: f01 Fig. 14 cross_section (manual); f02 Fig. 5 process_flow (manual); f03 Table I data_table (candidate p02_tablei); f04 Fig. 7 other/void maps (candidate p03_fig7); f05 Fig. 12 electrical_plot (candidate p04_fig12); f06 Fig. 13 other/alignment scatter (candidate p04_fig13).
- TVs: a = CoW (17x24 mm chips, Table I area 410 mm2); b = WoW reference (paper compares both at 6 um pitch, 100K chains).
- Judgment calls: daisy-chain and Kelvin resistances read off cumulative plots at the 50% line (approx, +/-0.02 Ohm); Kelvin 0.09 Ohm entered as interconnect resistance_mohm 90. EM ">10 years" entered as derived (projected lifetime; Fig. 16 time axis unlabelled). Process flow from Fig. 5 plus text (backgrinding before dicing; order vs planarization not shown). "Planarization" mapped to category cmp with a note. Fig. 7/13 kind = other (void-inspection method and alignment scatter have no dedicated enum).
- Not reported: wafer size, die thicknesses, pad diameter at 6 um pitch, all bonding/anneal/pretreatment conditions, SIV exact temperature, EM temperature, sample counts.
- Source: text.md figure labels font-garbled; values from renders. Table I unit printed "mm" for chip area.

## ectc51906.2022.00181 (SPIL, 3DIC CoW by soldering)
- Figures opened: page_02-04 renders; 400 dpi re-crops of Fig. 7, Fig. 10; re-crops of Fig. 11, Table III; candidates p02_fig3, p02_tablei, p03_fig7, p03_tableiii, p04_fig10, p04_fig11.
- Key figures: f01 Fig. 11 cross_section (manual); f02 Fig. 3 process_flow (candidate p02_fig3); f03 Table I data_table (candidate p02_tablei); f04 Fig. 7 stack_schematic (candidate p03_fig7); f05 Fig. 10 micrograph (candidate p04_fig10); f06 Table III data_table (manual).
- TV: one build (ASIC 70 mm2 on memory 110 mm2, both 50 um, 20/13 um ubump, mass reflow). Ubump DOE legs (POR X/Y, Leg1 X/1.3Y, Leg2 0.5X/1.3Y) kept as metrics.variant; absolute X, Y not disclosed.
- Judgment calls: TCCUF/TCNCF/TCNCP flows (Fig. 4-6) and Table II MR-vs-TCB values treated as generic (excluded). TSV in bottom die entered only as a schematic-sourced through_via (drawn in Fig. 3, not in text). Leg numbering conflict text vs Table IV resolved to Table IV (logged). HTSL 1000: unit and leg not stated; JEDEC reference is ref [8] JESD22-A104C (temperature cycling) as cited. Memory die component_type = other (memory type not given).
- Not reported: die x/y, package/substrate size and layers, reflow profiles, joint height, HTSL temperature, sample counts.

## ectc51906.2022.00008 (TSMC CoWoS-R+)
- Figures opened: page_03-05 renders; 450 dpi re-crop of Fig. 8; candidates p03_fig4, p04_fig6, p04_fig7, p05_fig10, p05_fig11, p05_tableii.
- Key figures: f01 Figure 6 stack_schematic (candidate p04_fig6); f02 Figure 7 package_photo (candidate p04_fig7); f03 Figure 11 warpage_plot (candidate p05_fig11); f04 Table II data_table (candidate p05_tableii); f05 Figure 10 xray_csam (candidate p05_fig10); f06 Figure 4 electrical_plot (candidate p03_fig4).
- TVs: a = 20-IPD package (32x35 mm interposer, 55x55 mm package, 2 SOC + 2 HBM, C4 150 um); b = Si connection block + 2 IPD (0.8/0.8 um routing, 24 um ubump; sizes not stated); c = plain CoW module (warpage reference) from Fig. 11 case (a).
- has_process_flow = no: only "same CoWoS process assembly" and landside attach are mentioned, no ordered flow or discrete steps.
- Judgment calls: Fig. 11 table gives unsigned magnitudes; the unlabelled curve is + at 25 C and - near 260 C (sign noted in scope, conflict logged). HBM3 6.4 Gbps eye width (88% with IPD, 76% without) entered as basis unspecified (measured/simulated not stated); the 76% case attached to TV c with a note that identity is not stated. IR-drop 1/0.5/0.3X entered as relative values. Fig. 8 capacitance density/leakage read off plots. 2/2 um L/S is the stated platform minimum, applied to all three TVs. buckets add thermal_pdn (de-cap IPD / IR drop focus).
- Not reported: RDL layer count/thickness/vias, top-die ubump pitch, die sizes, IPD size/capacitance, block size/count, reliability sample counts and precon level.

## Key-figure notes
- 18 figures chosen: 12 candidates as-is, 6 manual. Manual reasons: body-text line included (00219 Fig. 5, Fig. 14), SEM panels clipped at bottom (00181 Fig. 11), table merged with next figure (00181 Table III).
- 00008 candidates were all clean.
