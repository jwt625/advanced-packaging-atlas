# Batch b075 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b075` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tcpmt.2024.3443855 | distilled | 1 | 3 | 9 | 4 | 24 | 0 | 0 | 9 | 6 | yes |
| tcpmt.2025.3557745 | distilled | 3 | 9 | 25 | 6 | 13 | 0 | 0 | 40 | 6 | yes |
| ectc51687.2025.00142 | distilled | 5 | 2 | 20 | 3 | 25 | 0 | 0 | 25 | 6 | yes |

## tcpmt.2024.3443855 (IMECAS frontside via-last active TSV interposer)
- Figures opened: page_02-08 renders; page 4/5 grids; 300-400 dpi re-crops of Fig. 4, 6, 7(b), 11, 14(d), 16(c)(d), 17 (full and TSV/VIA panels), 19; candidates p03_fig2, p07_fig16, p08_fig17, p08_fig19.
- Key figures: f01 Fig. 17 cross_section (manual); f02 Fig. 2 stack_schematic (candidate p03_fig2); f03 Fig. 4 process_flow (manual); f04 Fig. 6 process_flow (manual); f05 Fig. 19 reliability_plot (candidate p08_fig19); f06 Fig. 16 micrograph (candidate p07_fig16).
- One TV: 22x20 mm active interposer die (tv_kind sub_assembly, package_class microbump_3d). The 3-D chiplet package with 4 PEDs and substrate (Fig. 1) is a design; PED/substrate components entered as design_target with "assembly not reported".
- Bump/TSV dimensions: measured SEM values (microbump 26.2/18.8 um, C4 77.6/77.3 um, TSV 9.676 um x 99.74 um) entered; design 30/18, 80/80, 10x100 um logged as conflicts.
- Process flow (24 steps) merges Fig. 6 (double-step SiO2 protection TSV module, incl. 350 C 1 h bake after VIA clean) into Fig. 4 BEOL flow, plus blade-saw-then-laser-groove dicing (Fig. 13/14). Rejected laser-then-blade route noted only.
- SiO2/SiOCH/SiO2 thicknesses (3.43/1.54/0.34 um) come from the Fig. 5 schematic labels (basis design_target, source schematic).
- TCT: 9 samples (Fig. 19), 8 pass -> about 89%; JESD22-A104F, -40/125 C, 15 min dwell, 11 C/min, 200 cycles.
- Not reported: bump pitch/metallurgy, TSV and RDL metal name, wafer size, process conditions, equipment.

## tcpmt.2025.3557745 (Georgia Tech dual-core spiral package-embedded inductors)
- Figures opened: page_03-08 renders; 300 dpi re-crops of Table II, Fig. 5(b), 6(b), 6(c), 7(b), 8(d); manual crops of Fig. 3, Fig. 4, Table IV; candidates p05_fig5, p05_tableii, p06_fig6.
- Key figures: f01 Fig. 6 cross_section (candidate p06_fig6); f02 Fig. 5 cross_section (candidate p05_fig5); f03 Fig. 4 process_flow (manual); f04 Table II data_table (candidate p05_tableii); f05 Fig. 3 stack_schematic (manual); f06 Table IV data_table (manual).
- TVs: Samples #1-#3 (single winding HPE2; two parallel windings HPE2; two parallel windings HPE1), tv_kind test_coupon, package_class organic_substrate (FR4 with embedded magnetic cores). Series configuration is modelled only (excluded).
- Table II "design dimensions obtained from cross-sectioning" treated as measured. Layer thicknesses of Samples #2/#3 assigned from Fig. 6 arrow positions and cross-checked (mean winding thickness = Table II tCu; summed gap layers ~ tgap).
- Stack layers use structure `other` (core/dielectric/spiral sandwich does not map cleanly to substrate_core vs buildup), orientation as printed in each cross-section.
- Model values (Lmon simulated, Lphy and DCR model derived) entered as separate metric rows; Table V 40 um Cu case as author_estimate. Conflict: text 36 um -> 40 mOhm vs Table V 40 um -> 36 mOhm (Table V entered).
- Process flow (13 steps) attached to Sample #1 (paper describes it for single winding); two-winding build not detailed.
- No package-level interconnect besides study-only vias, inter-winding microvias and soldering to a regulator board (no dimensions).

## ectc51687.2025.00142 (UCLA CHIPS / Applied Materials hybrid wiring layer)
- Figures opened: page_02-06 renders; 300 dpi re-crops of Fig. 3, 5, 6, 8, 11, 12; manual crops of Fig. 3, 8, 9, 10, 11, 12; all six corresponding candidates.
- Key figures: f01 Fig. 8 cross_section (manual); f02 Fig. 11 cross_section (manual); f03 Fig. 3 process_flow (manual); f04 Fig. 10 mechanical_plot (manual); f05 Fig. 9 mechanical_plot (manual); f06 Fig. 12 electrical_plot (manual).
- TVs: a organic gap-fill hybrid layer (main, UHAST); b inorganic (oxide) gap-fill variant (voids, abandoned); c 2x2 mm Si dies Cu-Cu TCB on the hybrid substrate (anneal temperature/time splits as metric variants); d ABF grinding coupons (3 wafers); e ABF dry-etch coupons.
- Judgment calls: substrate of TV c taken as organic gap fill from Fig. 11 (ABF-GL102 between Cu traces), noted as inferred. Fig. 2 (prior work [8]) and its 65.76 N shear excluded. Fig. 12 values at 5 V read off the log plot (approx). primary_bucket kept advanced_substrate; hybrid_bonding added (Cu-Cu direct TCB).
- Source inconsistencies: text cites "Figure 5a/5b-c" for the grinding data captioned Fig. 6; text sweep 0-10 V vs plot 0-5 V; oxide stack order text vs Fig. 3; 240 C/1 h shear 55.64 N (Fig. 9) vs 61.60 N (Fig. 10).
- Not reported: bonded-assembly electrical data, die thickness, pillar count, alignment value, tool/gas conditions.

## Candidate quality
- 18 key figures: 7 candidate, 11 manual. Truncated candidates: tcpmt.2024 p04_fig4 (legend only), p05_fig6 (bottom row), p08_fig17 (left third); tcpmt.2025 p03_fig3 (label fragment), p05_fig4 (partial), no Table IV candidate; ectc 00142 candidates clipped axis titles/scale bars or included captions.
