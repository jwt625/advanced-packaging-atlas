# Batch b060 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b060` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| vlsitechnologyandcir65830.2026.11577576 | distilled | 4 | 19 | 0 | 4 | 4 | 0 | 0 | 21 | 6 | yes |
| icep61562.2024.10535587 | distilled | 1 | 2 | 6 | 2 | 22 | 0 | 0 | 3 | 5 | yes |
| vlsitechnologyandcir65830.2026.11577374 | distilled | 1 | 2 | 6 | 2 | 7 | 1 | 0 | 9 | 6 | yes |

## vlsitechnologyandcir65830.2026.11577576 (SK hynix HBM4 MTV4)
- Figures opened: page_02, page_03 renders; candidates p02_fig1, p02_fig3, p02_fig5; 200 dpi re-crops of Fig. 1-8.
- Key figures: f01 Fig. 3 micrograph (manual); f02 Fig. 1 process_flow (manual); f03 Fig. 5 stack_schematic (manual); f04 Fig. 4 reliability_plot (manual); f05 Fig. 8 simulation_result (manual); f06 Fig. 6 simulation_result (manual).
- TVs: a = MTV4 12-layer MR-MUF stack (die_stack); b/c/d = simulation models on Si interposer, Si bridge interposer, advanced substrate (same floor plan: 2 logic + 8 HBM read from Fig. 5(a)).
- Judgment calls: process flow (4 steps) from Fig. 1 MR-MUF schematic, which the text says MTV4 uses. 720 um total HBM height entered as package_thickness (design direction). Fig. 2 normalized chip thickness 0.7 and C2C BLT 0.87 at the 12-stack point entered as design_target (x axis unlabeled). Si-bridge TV package_class = other (construction not drawn). Core die is_emulator = yes inferred from "mechanical test vehicle" + daisy chain.
- Not reported: die size/thickness, bump pitch/metallurgy, reliability conditions and sample sizes, absolute stress/warpage/resistance values (all plots relative or unlabeled). Table I roadmap excluded (not tied to MTV4).

## icep61562.2024.10535587 (ASE 600 mm FOPLP)
- Figures opened: page_01, page_02 renders; candidates p01_fig1, p02_fig2, p02_fig3_2, p02_fig4; re-crops of Fig. 2, 3, 4 (200 dpi) and Fig. 5 (500 dpi).
- Key figures: f01 Figure 2 process_flow (manual); f02 Figure 4 top_view_layout (candidate p02_fig4); f03 Figure 3 stack_schematic (manual); f04 Figure 5 other (yield line chart, manual); f05 Figure 1 other (equipment photo, candidate p01_fig1). Five figures only: the paper has five.
- TV: one panel-level chip-first face-up fully molded FOPLP on 600x600 mm panel. Process flow 22 steps from Sec. II text plus Fig. 2 boxes.
- Judgment calls: text lists Cu-stud electroplating before resist patterning; Fig. 2 order used (conflict logged). 10/10 um L/S entered on the RDL layer as design_target (abstract capability claim). Yield 99% (approx) and "die shift ratio from 0.07% to 15.27%" entered as written; Fig. 5 per-lot labels too blurred to enter.
- Source problems: Sec. IV onward (conclusions, acknowledgment, references) is unedited conference template text; title lacks a subject; Fig. 5 is a low-resolution raster. Candidate p02_fig5 bbox points at the page header.
- Not reported: any package/die/ball dimension, RDL layer count, materials, conditions, reliability, warpage.

## vlsitechnologyandcir65830.2026.11577374 (SAIMEMORY/PSMC/Intel via-in-one 9-wafer DRAM cube)
- Figures opened: page_02, page_03 renders; candidates p02_fig1, p02_fig2, p02_fig4, p02_fig6, p03_fig7, p03_fig9; 350 dpi re-crops of Fig. 6 and Fig. 7.
- Key figures: f01 Fig. 7 cross_section (candidate p03_fig7); f02 Fig. 2 process_flow (candidate p02_fig2); f03 Fig. 1 stack_schematic (candidate p02_fig1); f04 Fig. 4 top_view_layout (candidate p02_fig4); f05 Fig. 6 micrograph (candidate p02_fig6); f06 Fig. 9 electrical_plot (candidate p03_fig9).
- TV: one 300 mm wafer-level 1 logic + 8 DRAM oxide-fusion-bonded stack (package_class other: no hybrid Cu pads; TSV-last). primary_bucket kept hybrid_bonding per batch file, although the bond is oxide fusion only.
- Judgment calls: Fig. 7/12 show the via-in-one TSV in three segments (DRAM1-2, 3-5, 6-8) while the text says one etch "through all the wafer layers"; segmented version noted (conflict logged). F2F (logic-DRAM) then F2B from Fig. 6 labels. 0.7 pJ/bit, ~0.25 Tb/s/mm2, <0.35 W/mm2 are abstract claims -> author_estimate. EM Imax >6 mA per ring for 10 years -> basis derived (paper's extrapolation). Fusion bond recorded as interconnect level wafer_to_wafer_hybrid, ic_type other (closest enum).
- Not reported: bonding conditions, TSV diameter/depth/metallurgy, absolute resistances, EM/TC conditions, sample counts.

## Schema gaps
- No interconnect level/type for oxide-only fusion bonds (used wafer_to_wafer_hybrid + other); no package_class for fusion-bonded TSV-last wafer stacks (used other).
- No figure_kind for yield/process-control charts (used other); no package_class for a generic "silicon bridge interposer" without a carrier type (used other).
