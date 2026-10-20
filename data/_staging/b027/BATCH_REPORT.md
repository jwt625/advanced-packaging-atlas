# Batch b027 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b027` -> `0 errors, 0 warnings`.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51909.2023.00155 | distilled | 4 | 33 | 47 | 14 | 46 | 0 | 0 | 33 | 6 | yes |
| ectc51529.2024.00164 | distilled | 5 | 15 | 18 | 0 | 17 | 0 | 0 | 44 | 6 | yes |
| ectc51846.2026.00375 | distilled | 4 | 8 | 12 | 3 | 13 | 0 | 0 | 22 | 6 | yes |

Rows were generated from per-paper scripts kept in the session scratchpad (not in the repo); CSVs here are the output.

## ectc51909.2023.00155 (Resonac / JOINT2, extremely large 2.5D package)
- Source problem: the text.md body is a font-shifted text layer (every character offset by 29 code points; digits
  partly mapped to control characters), and each page carries a second garbled copy. `source.json` does not flag it
  (`garbled_text_layer: false`, no TEXT_LAYER_WARNING.md). I decoded it in the scratchpad for reading only and checked
  every number against the page renders, which are clean. papers.notes says so. Suggest the coordinator flag this
  paper in references (I did not touch references/).
- Figures opened: page_01-08 renders; 300 dpi re-crop of Fig. 3; candidates p02_fig1_2, p04_fig4, p07_fig16,
  p02_tablei, p02_table3; manual crop of Fig. 9.
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1_2); f02 Fig. 4 process_flow (candidate p04_fig4);
  f03 Fig. 16 cross_section (candidate p07_fig16); f04 Table 1 data_table (candidate p02_tablei); f05 Table 3
  data_table (candidate p02_table3); f06 Fig. 9 simulation_result (manual, no candidate).
- TVs: a = TV1 on Substrate-A (CCL core 2.8 ppm/C); b = TV2 on Substrate-B (0.7 ppm/C), a distinct core material,
  so a separate TV; c = MUF leg (liquid EMC wafer-level molding, no CUF; sub_assembly, rejected for voids under Die A);
  d = FEM quarter model of the original design without filler dies (simulation_model, -189 um at 260 C).
  The modified-design FEM result (-47 um) is a simulated metric on TV a, since that design was built.
- Judgment calls: design values in components/layers/interconnects; measured "actual" values (Tables 10-12) as
  geometry metrics with the design value in notes. Die bonding temperature 440 C entered as written (tool setting),
  with actual max 250 C in notes. Interposer-to-substrate bump typed cu_pillar (paper: "Cu/SnAg bumps", Cu 30 um +
  SnAg 25 um). Interposer bonding temperature = measured peak substrate temperature 233.2 C (Fig. 15). Process flow
  (46 steps) on TV a only; TV b was built by the same method (p.7), noted on the TV row. Package substrate and
  motherboard fabrication steps entered as lamination steps (substrate by SHINKO, stated in text).
- Conflicts: post-reflow bump height Cu/SnAg 34/25 um (Table 10) vs 33/32 um (Sec. III.D text); table chosen.
- Not reported: TSVs (none described), CUF cure under dies, filler-die count, EMC/CUF/film products, measured
  warpage of the interposer with molded dies, warpage sign convention for the bare-substrate values (91 / 63 um).
- TCT result "15/15 pass" per test line with 3 TVs per substrate: the unit of the 15 is not defined (entered as
  value_text).

## ectc51529.2024.00164 (TSMC IMC-Si micro-cooler)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 2, Fig. 4, Fig. 7; candidates p02_fig1, p02_fig2,
  p03_fig4, p04_fig7, p04_fig8, p05_fig9.
- Key figures: f01 Fig. 2 process_flow (candidate p02_fig2; includes the assembled stack in panel (e)); f02 Fig. 1
  micrograph (candidate p02_fig1); f03 Fig. 4 simulation_result (candidate p03_fig4); f04 Fig. 7 thermal_plot
  (candidate p04_fig7); f05 Fig. 9 thermal_plot (candidate p05_fig9); f06 Fig. 8 thermal_plot (candidate p04_fig8).
- TVs: a = IMC-Si/TTV with LIO, sealant on ribs; b = plain TTV (DRIE bypassed); c = IMC-Si with ribs free of sealant
  (different sealant layout, treated as a distinct build); d = 1x1/2x2/3x3 compartment models (simulation_model,
  compartment count as variant); e = sealant reliability samples (test_coupon, construction not described).
  tv_kind die_stack and package_class other (WoW fusion-bonded Si cooler on TTV; no matching class).
- Judgment calls: interconnects empty (the fusion bond is a non-electrical film; no bump/TSV data). The abstract /
  conclusion headline "2 kW (3.2 W/mm2) at 4.5 LPM, 3.5 W" is entered on TV c with an "inferred attribution" note:
  Sec. IV.C gives at most 2.6 W/mm2 at 5.1 LPM for the standard (sealant-on-ribs) build, and only Fig. 9's no-sealant
  sample reaches about 2 kW at 4.5 LPM. Logged in evidence conflicts. Hot-spot and Fig. 9 values are printed data
  labels. Full-reticle (858 mm2) TDP values are the authors' scaling (basis derived).
- Not reported: TTV thickness, wafer size, bonding film material/conditions, micropillar pitch, sealant product,
  TCG/HTS conditions, hydrostatic pressure values. Paper prints "AMSE B31.3" (noted).
- primary_bucket kept thermal_pdn.

## ectc51846.2026.00375 (Murata L-type-iPaS inductor-embedded substrate)
- Figures opened: page_02-05 renders; 300 dpi re-crops of Fig. 3 and Fig. 4; candidates p02_fig3, p04_tableii,
  p04_tablei, p05_fig7, p04_fig6; manual crops of Fig. 4 and Table I.
- Key figures: f01 Fig. 4 stack_schematic (manual; candidate p03_fig4 covers panel (b) only); f02 Fig. 3
  cross_section (candidate p02_fig3); f03 Table II data_table (candidate p04_tableii); f04 Table I data_table (manual;
  candidate clips the Isat footnote); f05 Fig. 7 electrical_plot (candidate p05_fig7); f06 Fig. 6 electrical_plot
  (candidate p04_fig6).
- TVs: a = L-type-iPaS buck module (30x20 mm, 3-2-3, module height 1.7 mm); b = SMD-inductor reference module
  (2.4 mm); c = single coil unit sample (w 0.5 mm, inner diameter 1.6 mm); d = in-substrate series arrays N = 4-8
  (w 0.5, inner diameter 1.0 mm), N kept as metrics.variant since unit and stack are the same.
- Judgment calls: package_class organic_substrate (inductor formed in build-up, not an embedded die). Coil wire width
  w entered as line_um on the coil Cu layers. Metal composite mu' ~33 / Bs ~1.3 T in layer properties (extracted from
  device measurements). Module heights and Table II L/Rdc as design_target (paper does not say measured). Fig. 3
  "3.1 x 3.1" unit sample size left in notes only (unit not printed). Number of units in the module inductor not
  stated (board silkscreen "x4" not used). primary_bucket kept advanced_substrate (thermal_pdn in buckets).
- Conflict: text says L fell "to 30%" at 17 A; Table I footnote defines Isat at a 30% drop and Fig. 5 L/L0 stays
  above 70% to 16 A; entered as 30% drop, logged.
- Not reported: RDL materials and thicknesses, laser via size, composite product and cure, PMIC part, reference board
  stack, efficiency values other than peak (84 vs 86%) and the +2.8 pp delta at 7 A.

## Candidate quality
- 18 key figures: 15 candidate, 3 manual (00155 Fig. 9 missing; 00375 Fig. 4 split panels; 00375 Table I footnote clipped).
- 00155: candidate p01_fig1 is body text (caption match on "Fig. 1 illustrates"); otherwise candidates matched well
  despite the garbled text layer.

## Schema gaps
- No package_class for a Si micro-cooler die stack (fusion-bonded carrier on TTV); used `other`.
- No interconnect type for a non-electrical fusion bond film; recorded only as a stack layer.
- No component_type for a PMIC / voltage-regulator controller (ivr is an integrated regulator); used `other`.
- No structure value for a motherboard/PCB layer; used `other` with feature "motherboard".
