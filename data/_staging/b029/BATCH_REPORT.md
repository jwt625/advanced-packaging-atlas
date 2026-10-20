# Batch b029 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b029` -> `0 errors, 0 warnings`.

Resume note: all three papers were distilled by a previous agent that was stopped by a usage limit before writing
this report. The resuming agent re-counted rows, re-rendered all 18 key-figure crops, opened 2 per paper
(00252 f02, f03; 00049 f04, f05; 00136 f05, f06; all correct, content matches `shows`), shortened one `shows` cell
(00049-f02, >25-word warning; content only trimmed, nothing added) and wrote this report. Per-paper details below are
summarized from the existing rows and evidence YAMLs.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00252 | distilled | 3 | 6 | 23 | 7 | 14 | 0 | 0 | 37 | 6 | yes |
| ectc51529.2024.00049 | distilled | 5 | 9 | 8 | 4 | 0 | 2 | 0 | 42 | 6 | no |
| ectc51906.2022.00136 | distilled | 2 | 2 | 10 | 2 | 26 | 0 | 0 | 20 | 6 | yes |

## ectc51909.2023.00252 (IME/GF/Qorvo 3D RF FEM chiplet stack)
- Figures opened (per evidence): page_01-06 renders; 200-400 dpi re-crops of abstract, Fig. 7, Fig. 8 S-parameter tables, Fig. 13; candidates p02_fig1, p02_fig3, p02_fig4, p03_fig8, p06_tablei.
- Key figures: f01 Fig. 3 stack_schematic (candidate p02_fig3); f02 Fig. 4 process_flow (candidate p02_fig4); f03 Fig. 13 top_view_layout (manual, no candidate); f04 Fig. 1 top_view_layout (candidate p02_fig1); f05 Table I data_table (candidate p06_tablei); f06 Fig. 8 electrical_plot (candidate p03_fig8).
- TVs: a = 1.4x1 mm small-footprint module (simulated), b = 1.4x1.4 mm module (simulated), c = CPW/TSV RF test structures on HRSi (measured).
- Judgment calls: ball counts 9 / 12 derived from removed ball sites (Sec. III, Fig. 10); package_y 1.4 chosen over 1.44 (Sec. II); module height 0.5 mm chosen over "about 400 um"; abstract <0.2 dB kept for test structures, 0.15 dB conclusion assigned to the package estimate; TSV via-last (Fig. 4 caption, Sec. II) over "TSV first" wording in Sec. V.
- Not reported: die/SOI/HRSi thickness, TSV depth, RDL L/S and dielectric, Cu pillar geometry and bonding, ball alloy/diameter, mold product, reliability/warpage/thermal; functional 3D module build stated as future work.
- Source: text layer partly font-garbled plus OCR-like errors ("SSW" for 8SW, "1x14"); every number checked on page renders.

## ectc51529.2024.00049 (TSMC CoWoS-R 5.5x reticle)
- Figures opened (per evidence): page_02-04 renders; 400 dpi re-crop of Fig. 1; 150 dpi re-crops of Fig. 4-6 and Tables II/III; candidates p02_fig1, p02_fig2, p02_fig3b, p04_fig7.
- Key figures: f01 Fig. 3(b) stack_schematic (candidate p02_fig3b, generic, no tv_ids); f02 Fig. 2 top_view_layout (candidate p02_fig2); f03 Fig. 1 package_photo (candidate p02_fig1); f04 Table II data_table (manual); f05 Table III data_table (manual); f06 Fig. 7 simulation_result (candidate p04_fig7).
- TVs: a/b/c = 5.5x TV in 9L / 8L / 7L RDL variants (eye sims and reliability), d = 3.3x TV (4 SoC + 8 HBM3, Fig. 1), e = CoWoS-R vs TSV Si interposer SI/PI comparison.
- Judgment calls: substrate_x 97.3 mm (Sec. III) over rounded 97 (Fig. 2/abstract); TCG condition -40/125 C from Table III over -55/125 C in Sec. VI; Fig. 1 PoC + TCC1000 and Sec. VI TCC500 kept as separate metrics; Fig. 5 scope "vs SI spec" from table header over text wording. has_process_flow = no ("leveraging InFO process" only); process_steps in not_reported.
- Not reported: RDL Cu/dielectric thickness and Dk/Df, microbump and C4 diameter/metallurgy, bonding method, substrate materials/thickness, package thickness, underfill/TIM/lid, warpage, reliability sample counts and standards, energy/bit, BER, insertion loss in dB, HBM stack height and assembled generation (HBM3 vs HBM3/4 inconsistent between Fig. 2 and Fig. 1).
- Excluded: roadmap products of Fig. 1 (1.4x/1.7x/1.6x), MP yield claim, future qual plans, Table I requirements, results of refs [1], [4].
- Source: Tables I-III have no candidates and garbled titles in text.md; values read from renders.

## ectc51906.2022.00136 (nepes 600 mm FOPLP, 6-sided die protection)
- Figures opened (per evidence): page_02, 03, 05, 06, 07 renders; 400 dpi re-crops of Fig. 2, 3, 4, Fig. 15 (p.5), Fig. 15 (p.6), Table 3; candidates p02_fig2, p02_fig4, p05_fig15, p06_table2, p06_table3.
- Key figures: f01 Figure 15 (p.6) cross_section (manual); f02 Figure 4 stack_schematic (candidate p02_fig4); f03 Figure 2 process_flow (candidate p02_fig2); f04 Figure 15 (p.5) top_view_layout (candidate p05_fig15); f05 Table 2 data_table (manual); f06 Table 3 data_table (manual).
- TVs: a = 4.5x5.5 mm chip-first FOPLP package (0.35 mm pitch SAC405, 0.55 mm height), b = 200x200 mm test panel for slit-coated PM1/PM2.
- Judgment calls: process flow (26 steps) from Fig. 2 and Sec. III; Table 2 values are process targets (design_target) with pass results; two figures numbered "Figure 15" kept as printed (page disambiguates); text cites a nonexistent Table 6 for drop guideline, Table 4 used; BLR first fail >70 drops entered as measured.
- Not reported: die size/thickness/count, fan-out ratio, mold and polymer products, cure conditions, RDL thickness/space, via sizes, seed metals, ball count/diameter, reflow profile, warpage, CLR sample standards (JEDEC numbers), electrical/optical interfaces.
- Excluded: 300 mm FOWLP baseline (ref [1]), vendor/background illustrations (Fig. 8, 9, 12, 13), generic electrolyte chemistry, Table 4 guideline, Fig. 1 die-count image.
- Source: low-resolution embedded images; p.6 cross-section dimension labels illegible (no values taken). Candidate p06_table2 holds the cross-section image, p06_table3 is empty margin; Table 3 right edge is clipped in the source page itself.

## Candidate quality
- 18 key figures: 12 candidate, 6 manual (00252: 1; 00049: 2; 00136: 3, one of them the cross-section image that candidate p06_table2 mislabels).
- Tables in 00049 have no candidates; 00136 table candidates mis-assigned (p06_table2 = cross-section, p06_table3 = blank); 00252 Fig. 13 not detected.
