# Batch b034 report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/b034` -> `0 errors, 0 warnings`.

Resumed batch: ectc51687.2025.00131 and ectc51529.2024.00207 were inherited complete from the previous agent (rows,
evidence, 6 figures each); spot-checked 2 crops each (00131 f01, f04; 00207 f01, f04), all correct. The only change to
inherited rows: `shows` of 00131-f06 and 00207-f05 trimmed to <= 25 words (same facts) to clear 2 validator warnings.
ectc51846.2026.00346 was not started and was distilled in this session.

| paper_id | status | TV | comp | layers | ic | steps | ei | oi | metrics | figures (manual) | has_process_flow |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ectc51687.2025.00131 | distilled (inherited) | 3 | 12 | 7 | 3 | 10 | 0 | 0 | 19 | 6 (2) | yes |
| ectc51529.2024.00207 | distilled (inherited) | 2 | 7 | 8 | 5 | 23 | 0 | 0 | 23 | 6 (1) | yes |
| ectc51846.2026.00346 | distilled | 3 | 12 | 11 | 8 | 22 | 3 | 1 | 14 | 6 (2) | yes |

## ectc51687.2025.00131 (TSMC, direct-to-Si liquid cooling on CoWoS-R) - inherited, summary from rows/evidence
- TVs: a = 3.3X CoWoS-R TTV with IMC-Si (sealant + lid + manifold; 4 SoC + 8 HBM thermal test dies); b = same with
  micropillar-patterned SoC backside (simulation_model); c = 0.8X single-die TTV with sealant and metal lid (immersion).
- Figures opened (previous agent): page_02-05; candidates p02_fig1/2/3, p03_fig5, p04_fig7, p05_tablei, p05_fig9; re-crops of Fig. 5, Fig. 9.
- Key figures: f01 Fig. 1 stack_schematic (candidate p02_fig1); f02 Fig. 3 process_flow (candidate p02_fig3);
  f03 Fig. 2 package_photo (candidate p02_fig2); f04 Fig. 5 thermal_plot (manual); f05 Fig. 9 reliability_plot (manual);
  f06 Table I data_table (candidate p05_tablei).
- Judgment calls: micropillar 3.4 kW claim entered as simulated (Sec. III.B, Fig. 5 legend); HTS read-point conflict
  text vs Fig. 9 logged, only the 1000 h endpoint entered; 0.8X IMC-Si results of ref [5] excluded.
- Not reported: interposer/substrate/package sizes, RDL dims, bump/C4/BGA dims, micropillar geometry, sealant/lid
  materials, reliability sample counts.
- Observation for audit: papers.notes says "2.5 kW measured (unpatterned)" while metric rows and Fig. 5 show measured
  up to ~3.2 kW (caption "> 3 kW"); 2.5 kW is the 11.5 LPM point. Not changed (inherited text, not a cell value).

## ectc51529.2024.00207 (Renesas, ultra-thin double-side SiP on 3L ETS) - inherited, summary from rows/evidence
- TVs: a = double-side molded SiP on 3L 85 um ETS (ENIG), 0.85 mm max; b = SOH DOE with Cu OSP ETS pad finish.
- Figures opened (previous agent): page_02-04; candidate p02_fig3; 400 dpi re-crops of Fig. 4, Tables II, IV, V.
- Key figures: f01 Fig. 5 cross_section (manual); f02 Fig. 1 stack_schematic (candidate p02_fig1); f03 Fig. 3
  process_flow (candidate p02_fig3); f04 Fig. 4 warpage_plot (candidate p03_fig4); f05 Table IV data_table (candidate
  p04_tableiv); f06 Table V data_table (candidate p04_tablev).
- Judgment calls: both flows (top SMT first, chosen; bottom die first, compared) entered as process_steps of TV a with
  flow_name; Table I 3.5x vs 1x warpage ratio and plotted Fig. 4 extremes both entered (conflict logged).
- Source: Tables I-V are raster images; die thickness masked ('~5x um'); SOH relative only.
- Not reported: die size/count, bump pitch, ETS dielectric and L/S, ball/TMV dims, EMC products, reliability conditions.

## ectc51846.2026.00346 (Marvell, low-cost 2.5D photonic Si interposer, OMM / Photonic Fabric)
- Figures opened: page_01-07 renders; candidates p02_fig3, p03_fig5, p04_fig7, p04_fig8, p05_fig12, p06_fig15;
  re-crops: Fig. 3 at 400 dpi (pitch labels), Fig. 12 and Fig. 15 at 300 dpi, Fig. 10 at 200 dpi, Fig. 7 and Fig. 8 manual.
- Key figures: f01 Fig. 8 cross_section (manual; candidate had wide blank margins); f02 Fig. 3 stack_schematic
  (candidate p02_fig3); f03 Fig. 5 process_flow (candidate p03_fig5); f04 Fig. 7 micrograph (manual; candidate had a
  text sliver); f05 Fig. 15 electrical_plot (candidate p06_fig15); f06 Fig. 12 simulation_result (candidate p05_fig12).
- TVs: a = OMM TV package (1x-reticle PIC interposer, ASIC + 2 HBM test chips, glass block, organic HDI substrate,
  stiffener; passive daisy chains); b = open tapered TSV vs std TSV TM model; c = SI/PI model Cases 1-3.
- has_process_flow yes: 22 steps from Sec. II.B + Fig. 5 + Sec. III.A/B (TDV in PIC fab, recon on glass carrier, mold,
  grind, Bosch/non-Bosch TSV etch, PECVD, selective nitride etch, conformal Cu plating, RDL, passivation, offset C4;
  chiplet attach, optical epoxy dispense with dam, block place, cure, underfill, EMC, mold grind, singulation, substrate
  attach, underfill, stiffener). Carrier debond and FAU attach not described, not entered.
- Judgment calls:
  - Only dimensions in the paper: 40 um min microbump pitch and 160 um min C4 pitch (Fig. 3 labels, pitch_min_um);
    PI model array 5x5, 160 um pitch.
  - Via-path differential IL at 16 GHz (0.041 / 0.176 / 0.110 dB, Fig. 15 markers, simulated) entered as
    electrical_interfaces with protocol unspecified, following the ectc.2019.00095 precedent; sign flipped to positive loss (logged).
  - Fig. 12 normalized stress/strain (open/std) read from bars (0.83, 0.82, 0.65, 0.66, approx) rather than the text
    percentages (~20 %, ~35 %), which agree; Cu strain is figure-only.
  - Fig. 10 (alignment, overflow, BLT) and Fig. 16 (TDR) have no printed axis values: value_text rows only.
  - 1 Tbps/mm2 OMM bandwidth density excluded (solution-level claim, not this passive TV).
  - Conflict logged: TDR paragraph says Case3 "more lossy", while Fig. 15 and the ~40 % sentence show Case3 below Case2.
  - technology_name "OMM; Photonic Fabric" (both used in the paper; OMM never expanded).
- Not reported: die/interposer/substrate sizes and thicknesses, TSV/TDV dimensions and counts, RDL L/S, bump
  metallurgy and bonding conditions, adhesive product and cure, optical coupling loss/wavelength, warpage values,
  reliability (future work).
- Source: clean text layer, 7 pages. Fig. 7 caption labels panels (a) and (ii).

## Schema gaps
- No natural home for a via/vertical-path insertion loss that is not a protocol interface (used electrical_interfaces with
  protocol unspecified per precedent).
- Normalized-only geometry (TSV openings 5.5x / 8x of an unstated x) has no column; kept in notes and evidence entries.
