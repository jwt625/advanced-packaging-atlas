# Batch b062 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b062` -> `0 errors, 0 warnings (data/_staging/b062)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51846.2026.00365 | distilled | 11 | 15 | 0 | 0 | 8 | 0 | 0 | 24 | 6 | yes |
| ectc51687.2025.00090 | distilled | 1 | 8 | 6 | 2 | 9 | 0 | 0 | 22 | 6 | yes |
| ectc51906.2022.00031 | distilled | 4 | 11 | 47 | 10 | 18 | 0 | 0 | 29 | 6 | yes |

## ectc51846.2026.00365 (Intel, underfill encapsulation of ultra-large die complexes)
- Figures opened: page_02-05 renders; candidates p02_fig2, p03_fig3, p04_tablei, p04_fig6, p05_fig7a, p05_fig9a.
- Key figures: f01 Fig. 3 cross_section (candidate p03_fig3); f02 Fig. 7 package_photo (candidate p05_fig7a); f03 Table I data_table (candidate p04_tablei); f04 Fig. 6 xray_csam (candidate p04_fig6); f05 Fig. 9 package_photo (candidate p05_fig9a); f06 Fig. 2 package_photo (candidate p02_fig2).
- TVs: 11 distinct packages shown (Fig. 2 a/b/c, Fig. 4 flow-test package, Table I flow-test TV, 2x3 tile TV, 2x4 tile TV, >5X EMIB, >7X 2x4 FCBGA, 2X and 4X Foveros). Materials A/B and formulations 1-3 and the two cure conditions are split variables (metrics.variant).
- Judgment calls: primary_bucket changed from microbump_3d to si_bridge (2 of 3 demo packages and Fig. 2(b)(c) are EMIB/Co-EMIB; keyword EMIB-T); buckets kept si_bridge;microbump_3d. package_class inferred (Co-EMIB/EMIB -> si_bridge_organic, FCBGA -> organic_substrate, Foveros -> microbump_3d), noted per TV. has_process_flow = yes on thin evidence: discrete dispense / cure / CSAM steps for the flow-test and cure-optimization TVs. Table I filler loading, viscosity, gel time are normalized properties with basis unspecified; flow time measured. BHAST taken as 275 h (sentence groups BHAST and UHAST "at 275 hours").
- Conflicts logged: >7X reticle (Sec. V) vs "2X to 6X" (conclusion).
- Not reported: stack layers, all interconnect dimensions, underfill products and absolute properties, cure conditions, most package sizes, reliability sample counts, TC-B temperature range. Roadmap numbers (4X with 8 HBM/12 bridges in 2023; >12X and >120 x 180 mm by 2028; 50X panel) excluded as non-TV.

## ectc51687.2025.00090 (Samsung panel-level RDL interposer)
- Figures opened: page_02-04 renders; 300 dpi re-crops of Fig. 3, Fig. 4(a)(b), Fig. 4(d), Fig. 2; crop of Table 3; candidates p02_fig1, p02_fig3, p03_fig6.
- Key figures: f01 Fig. 4(a)(b) cross_section (manual, no candidate; panels (c)(d) on p.3 left out); f02 Fig. 2 process_flow (manual; candidate p02_fig2 points at the caption in the other column); f03 Fig. 1 top_view_layout (candidate p02_fig1); f04 Fig. 6 micrograph (candidate p03_fig6); f05 Fig. 3 other/box plot (manual; candidate includes Eq. (1) and cuts the legend); f06 Table 3 data_table (manual, no candidate).
- TV: one 4.3x reticle panel-level chip-last RDL interposer package, 16 chips; carrier and Cu-volume DOEs are split variables. Process flow (9 steps) from Sec. II.B + Fig. 2; UBM-first order taken from "RDL on the thick Cu UBM pad" in a chip-last structure (noted).
- Values: Fig. 3 DOE 1-5 means read off the box plot (+/-0.03 um); Leg 6 0.5 um from text; measured line width 2.14 um (Fig. 4(d)); pad plating uniformity 24.60% -> 6.27%; Tables 1/2 warpage "level" in % (reference undefined) entered as simulated; Table 3 reliability.
- Judgment calls: n_hbm left blank (Fig. 1 has 12 unlabelled Chip 2 sites; conclusion says "more than 12 HBM"); chip types per Fig. 1 entered as unspecified with counts from the floor plan; microbump ic_type chosen from Fig. 6(c) pillar-solder joint (not named in text).
- Not reported: die/interposer/package/panel sizes, RDL and PID thicknesses, via sizes, bump diameters/metallurgy/bonding conditions, absolute panel warpage, reliability sample count.

## ectc51906.2022.00031 (Xperi DBI Ultra die-edge pads; OCR text)
- Source: TEXT_LAYER_WARNING present; text.md is tesseract OCR. Every number verified on page_01-07_220dpi.png (OCR mangled um units, the +/-5 um misalignment and Table I). candidates.json is empty: all key figures manual.
- Figures opened: all seven 220 dpi pages; re-crops of Fig. 4, 6, 7, 10, 13 and Table I.
- Key figures: f01 Fig. 7 cross_section (manual); f02 Fig. 4 stack_schematic (manual); f03 Fig. 6 cross_section (manual); f04 Fig. 10 electrical_plot (manual); f05 Fig. 13 electrical_plot (manual); f06 Table I data_table (manual).
- TVs: one per stack height with data (D2W LC, 2-die LTC, 5-die LT4C, 8-die LT7C). Stack layers per TV from Fig. 4/5 and Sec. II.B (Thru-die layers with `repeat` = number of Thru die). Process flow (18 steps) entered once on the 5-die TV (the reliability build), flow_name states it applies to all stacks.
- Judgment calls: level die_stack_internal for face-to-back DBI-pad-to-TSV bonds; alignment_um 5 = measured +/-5 um 3 sigma; TSV resistance 50 mohm = paper's calculated ~0.05 ohm (derived). Table I values entered as basis derived (paper's subtraction/division).
- Conflicts logged: 9450 (text) vs 9,480 (abstract) main-array links; 85 um (text/data) vs 80 um (abstract) outermost column; 5-die yield drop at 155 um (results) vs 220 um (summary); ~100% vs 99% at 85 um; 8 x 315 = 2520 vs stated 2512 edge links.
- Not reported: DBI dielectric material, bond force/time, activation chemistry, reliability conditions/cycles/n (ref [6]).

## Schema gaps / friction
- No enum for damascene metallization (used step category `other`).
- Normalized/relative metrics (Intel Table I ratios, Samsung warpage "level %") have no explicit normalization field; recorded in `scope`.
- Paper-level structure/process figures with no TV (Intel Fig. 3 barrier cross-section) leave tv_ids empty, which is allowed.
