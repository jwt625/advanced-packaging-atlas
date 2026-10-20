# Batch b026 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b026` -> `0 errors, 0 warnings (data/_staging/b026)`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00053 | distilled | 1 | 3 | 4 | 4 | 28 | 0 | 0 | 2 | 5 | yes |
| eptc56328.2022.10013262 | distilled | 5 | 7 | 8 | 6 | 11 | 0 | 0 | 48 | 6 | yes |
| ectc51687.2025.00158 | distilled | 2 | 8 | 6 | 6 | 30 | 0 | 0 | 28 | 6 | yes |

## ectc51909.2023.00053 (Deca / nepes hayyim, M-Series Gen 2 chips-first FOWLP TV)
- Figures opened: page_03-06 renders; candidates p03_fig5, p03_fig6, p03_fig7, p04_fig8, p06_fig14; re-crop of Fig. 6.
- Key figures: f01 Fig. 5 top_view_layout (candidate p03_fig5); f02 Fig. 7 process_flow (candidate p03_fig7); f03 Fig. 6 micrograph (manual, candidate clipped bottom SEM row); f04 Fig. 8 micrograph (candidate p04_fig8); f05 Fig. 14 micrograph (candidate p06_fig14). Only 5: no cross-section, warpage or result plots exist; Figs. 1-4 are comparisons with other companies' or reprinted examples.
- One TV: 18x14 mm, 2 processor chiplets + 4 HBM footprint dies (emulators, n_hbm 4), 300 mm reconstituted wafer.
- Judgment calls: the TV was processed only through PI via opening (p.6: RDL "in subsequent work"); process steps 17-28 (seed, RDL/UBM, ball drop, reflow, finishing) entered with `performed: no`. 2/2 um L/S and 6 um PI via are process-capability demonstrations (Fig. 8), entered as design_target layer rules with figure_image override for the via, not as measured TV features. Cu studs as level `other` / `cu_pillar` (repo convention). DMS accuracy (<0.5 um, 3 sigma) as author_estimate metric.
- Not reported: die sizes/thickness, stud height, encapsulant product, PI thickness/cure, RDL thickness, ball pitch, any yield/warpage/reliability.

## eptc56328.2022.10013262 (Deca / ASE, LDI + Adaptive Patterning on 600 mm)
- Source: OCR text (TEXT_LAYER_WARNING); all 5 page_NN_220dpi.png renders viewed and every number checked on them. Fig. 3 table re-cropped at 300 dpi.
- Figures opened: candidates p02_fig3, p03_fig6, p03_fig7, p03_fig8, p04_fig9, p05_fig13; re-crops of Fig. 7 and Fig. 3.
- Key figures: f01 Fig. 8 cross_section (candidate p03_fig8, paper-level: generic M-Series structure); f02 Fig. 6 stack_schematic (candidate p03_fig6); f03 Fig. 7 cross_section (manual, candidate had wide blank margin); f04 Fig. 3 data_table (manual, candidate included caption fragment); f05 Fig. 13 top_view_layout (candidate p05_fig13); f06 Fig. 9 micrograph (candidate p04_fig9).
- TVs: a embedded active die interposer (3D PoP, Cu posts through EMC, 3 top + 2 bottom RDL, 4 chips-last dies); b 36x36 mm 9-die customer TV (format efficiency 73% on 300 mm vs 92% on 600 mm); c planar Gen 2 design (design only, tv_kind other); d 2 um L/S + 5 um PI via LDI coupon (Fig. 9, measured SEM); e platform/roadmap TV (tv_kind other) holding Fig. 3 design rules for Gen 1 to Gen 3 (36 metric rows), LDI/dry-film throughput claims and the 600 mm format flow (Fig. 10).
- Judgment calls: TV e is not a physical build; it exists to hang platform-level numbers (roadmap, throughput) and the Fig. 10 flow. has_process_flow yes from the dry-film Cu post flow (lamination, LDI exposure, coversheet removal, aqueous develop; chips-last mount; lid) for TV a and the Fig. 10 panel flow for TV e. Cu post diameter entered as the required resist CD (<80 um) with pitch <150 um, AR 4.
- Conflicts: Gen 1 bond pad pitch 55 um (Fig. 3 table) vs 45 um (text, Fig. 2) -> 55 entered; planar design pitch 20 x 40 um (text) vs 20 x 44 um (Fig. 13) -> 40 entered (text over schematic).
- primary_bucket kept as panel (600 mm panel is the paper's subject); buckets organic_rdl_fanout;panel.
- Not reported: die/package sizes for TV a/c, Cu post height, RDL thicknesses/dielectrics, bonding conditions, warpage/reliability/yield.

## ectc51687.2025.00158 (ASE FOCoS-Bridge with TSV)
- Figures opened: page_02-04 renders; candidates p02_fig1, p02_fig2, p03_fig3, p03_fig5; 300 dpi re-crops of Fig. 4 and Fig. 5; manual crops of Fig. 6 (two iterations) and Fig. 7.
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1); f02 Fig. 3 process_flow (candidate p03_fig3); f03 Fig. 2 process_flow (candidate p02_fig2); f04 Fig. 6 cross_section (manual, no candidate); f05 Fig. 7 cross_section (manual; candidate p04_fig7 covered the page top, not the images); f06 Fig. 5 warpage_plot (manual, candidate clipped x-axis title).
- TVs: a 85x85 mm package with 2 FO modules (~1.8x reticle, ~1500 mm2 each); b simulation_model for the TMV-path reference (FOCoS-B without TSV) used as reference_tv_id for the normalized R (0.28x) and L (0.5x).
- Judgment calls: MR vs TCB is a split variable (metrics.variant), not new TVs; interconnect bonding_method tcb with notes on MR failure. Fig. 5 (simulated bare bridge warpage, 5 thicknesses x 4 temperatures) entered as 20 simulated rows read +/-1 um; sign convention not stated. 'C4 micro-bump pitch 130 um' entered as FO-module-to-substrate C4 pitch. Two flows (bridge die, Fig. 2; assembly, Fig. 3) in one continuous seq on TV a, distinguished by flow_name.
- Not reported: die/bridge dimensions, TSV/Cu stud/microbump dimensions, TCB/MR conditions, materials, substrate layers, measured warpage, reliability.

## Notes
- Candidate quality: 11 of 17 chosen figures used as-is; 6 manual (crops clipped, blank margins, caption fragments, or a candidate pointing at the wrong region).
- No electrical_interfaces or optical_interfaces rows in this batch (no protocol/data-rate properties reported).
