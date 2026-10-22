# Validation results ledger

One row per case / study / target with the latest engine result recorded in the lane notes. No new runs were made
for this ledger (2026-10-20, lane L4). Values are copied from the cited lane note; the verdict applies the current
validation case (validation/cases/) where one exists, otherwise the sim config's own target and tolerance.

Verdicts:
- `pass` / `miss`: within / outside the tolerance.
- `untestable`: the validation case says the target cannot be tested with the current model (see the case).
- `indeterminate`: the quantity is mesh-dependent or ill-defined (singular stress, W / saddle shape).
- `calibration`: a fitted parameter makes the comparison circular.
- `superseded`: the target has been replaced by a newer form.
- `no target`: the study has nothing to compare against.

Homogenization (corrected 2026-10-20 after lane L11):
- `rom` = rule of mixtures. This was the library default before L2 wave 6 (15:57 PDT) and was used after that only
  when selected (`--homog rom`, first used by L3 at 18:30).
- `rve` = RVE resolver: computed live from 15:57 (runMechCase follows the library default since 16:03), and from the
  precomputed table from 18:08.
- Only the 18:30-18:55 "RVE" column of L3 wave 5 was wrong: the table ignored case overrides of constituents. L11
  fixed this with constituent fingerprints, and the fixed RVE reproduces the earlier live-RVE numbers to the printed
  digits. Those buggy values are not used here.
- Rows from before 15:57 are `rom`.

All dates are 2026-10-20. Tier = validation tier of the target (C paper-simulated, D measured, H trend, B cross-solver).

## Mechanics (warpage in um, JEITA ED-7306 sign as coded, + = dome)

| Case / study | Target (metric_id) | T C | Target value | Engine result | Verdict | Homog | Source |
|---|---|---|---|---|---|---|---|
| cowos_l/warpage_rt_ht s2 (M1, case mesh 1.08e6 DOF; browser = CLI to 1.9e-7 um at rtol 1e-10) | ectc51909.2023.00091-a-m1 (D) | 25 | +64; gate: coplanarity 64 +- 20 | -250.745, bowl | miss (magnitude 251 vs 64) | rve | DevLog-012 M1 final; L6 wave 7 |
| cowos_l/warpage_rt_ht s3 | ectc51909.2023.00091-a-m2 (D) | 240 | -148; gate: coplanarity 148 +- 37 | +187.647, dome | miss (188 vs 148, +40 > 37) | rve | same |
| cowos_l RT / HT ratio | D/ectc51909.2023.00091-cowos_l rt_ht_ratio | 25 / 240 | -2.31, band [-4.2, -1.3] | -0.75 | miss | rve | same; L3 wave 5 spreads (tsf90 variant -2.73) |
| cowos_l sign flip | H/H01 | 25 / 240 | sign change | bowl -> dome | pass (shape_class bowl / dome) | rve | same |
| si_interposer_peers/xilinx_tsv_lid s3 (no lid) | ectc.2011.5898527-b-m2 (C) | 25 | +335.28 | +341.215 (+1.8 %); ROM +340.641 (+1.6 %) | pass (plausibility only: nu, build-up and homogenization are template inputs, DevLog-012 L8; a tier-C match with template inputs is not a validation) | rve (rom alt.) | L11 run table (main, case mesh) |
| si_interposer_peers/xilinx_tsv_lid s2 (lid) | ectc.2011.5898527-b-m3 (C) | 25 | +162.56 | -50.770 (W shape, L9); ROM -51.598 | miss (W shape; paper Fig. 3(b) dome) | rve (rom alt.) | same |
| same, von Mises max | ectc.2011.5898527-b-m4 (C) | 25 | 115 MPa | 131.13 MPa [bimaterial_edge] (soc_1); ROM 127.35 | indeterminate (singular) | rve | same |
| si_interposer_peers/50mm_quarter_e2 s2 | ectc51909.2023.00155-d-m1 (C) | 260 | -189 | +100.136; ROM +132.902 | miss (sign; cure shrinkage not modelled, L9) | rve (rom alt.) | same |
| si_interposer_peers/120mm_warpage stiffener_attach_sequence (SUS430; coarse mesh 2.4e5 DOF) | a-m16..m19 (D), trend targets | ramp_30 / 148 / 222 / 243 | +485 / +135 / +65 / -85; trend: monotone decrease, sign change in (222, 243) | +184.0 (W) / +165.4 (dome) / +209.7 (W) / +230.3 (W) | miss (not monotone; no sign change, W shapes, so the sign gate is reported only) | rom | L3 wave 6 |
| same, glue bounds 50 / 300 um | same | same | same | +181.9..+237.3 / +161.3..+208.1 (glue changes the curve <= 10 %) | sensitivity (does not explain the miss) | rom | L3 wave 6 |
| same | ectc51529.2024.00155-a-m23 (C) | ramp_260 | +247 (FEM; sign convention to confirm) | +247.4 (W) | indeterminate (W shape; FEM sign convention unconfirmed) | rom | L3 wave 6 |
| si_interposer_peers/120mm_warpage_cu stiffener_attach_sequence (Cu ring) | e-m1..m4 (D), trend targets | ramp_30 / 148 / 222 / 243 | -330 / +260 / +645 / +770; trend: monotone increase, one sign change in (30, 148) | -638.1 (W) / +281.4 / +804.1 / +958.4 (dome) | pass (monotone); sign change at about 112 C (linear) vs about 96 C measured, reported (30 C is W); magnitudes 1.1-1.9x | rom | L3 wave 6 |
| si_interposer_peers/120mm_warpage s2 (single step) | (none since L3 wave 6) | 30-260 | - | earlier +458..+546 (per-part Tsf, flat) | superseded (constant-eigenstrain artefact, L9 wave 2) | - | L3 wave 5; L9 wave 2 |
| fcbga_organic/substrate_warpage_bare s2 / s2h | ectc51687.2025.00178-c-m1, -c-m2, -b-m4, -b-m5 | 25 / 265 / 30 / 260 | +122 / -47 / +166 / -68 | -5.80 / +1.22 / -5.59 / +1.15 | untestable (undisclosed stack asymmetry) | rve | L3 wave 5 (after column, 16:40-17:31) |
| fcbga_organic/substrate_warpage s2 / s2h | ectc51687.2025.00178-c-m3, -c-m4 (C, sign only) | 25 / 265 | +439 / -292 | +242.6 / -194.4 | pass (sign) | rve | same |
| fcbga_organic/substrate_warpage s2, core_lowcte nu +-0.05 | c-m3 | 25 | - | -3.6 / +3.5 % of nominal | sensitivity (bounds act under RVE after the L11 fix) | rve | L11 |
| glass_core_substrate/warpage_vs_organic s2 / s2h | ectc51687.2025.00178-d-m3, -d-m4 (C, sign only) | 25 / 265 | +160 / -75 | +64.6 / -48.5 | pass (sign) | rve | L3 wave 5 |
| glass_core_substrate s3 / s3h (bare) | ectc51687.2025.00178-d-m1, -d-m2 | 25 / 265 | +97 / -31 | -4.97 / +2.10 | untestable | rve | same |
| fan_out_panel/panel_warpage s2 | 2380-4505-2020.1.000042-a-m9 (D) | 25 | 700 (strip on carrier) | +12633 (free strip) | untestable (carrier, geometric nonlinearity) | rom | L1 wave 3 (15:04-15:48) |
| cowos_s/warpage_corner_stress s2 | ectc51909.2023.00135-a-m1 (D) | 25 | -198 as printed = JEITA +198 (dome; audit A6, see the 2026-10-21 section) | -339.5 (batch 15:20-16:30); L9 diag -340.57 (3 mm) / -341.08 (6 mm) | miss (sign: bowl vs measured dome; recorded 2026-10-20 as "+71 %" against the printed sign) | rom or rve (batch spans the 15:57 default change); diag rve | L3 wave 5; L9 wave 2 |
| cowos_s s3-s7 stress_norm | ectc51909.2023.00135-a-m10, m13, m14, m16 (C) | 25 | ratios | not rerun after the selection fix | indeterminate (corner maxima, audit S4) | - | L3 wave 5; L9 wave 2 |
| emib_t/bridge_stress s2 | none | 25 / 240 | - | timed out (1800 s); earlier run vm maxima flagged reentrant | no target | - | L3 wave 5; L1 wave 3 |
| ucla_si_if/warpage s2 | none | 25 | - | if_m2 107.8 MPa | no target | - | L3 wave 5 |

M1 note: the browser = CLI equality (1.9e-7 um) and the 1.52 GB browser peak were measured at PCG rtol 1e-10, before 1e-7 became the package default. At 1e-7 the Node peak for cowos_l rose 1.36 -> 1.58 GB (L10, unexplained), so the browser peak at the current default is not measured (audit A3 S7).

Solver tolerance (L10): package studies run at PCG rtol 1e-7 (gate cases 1e-10). Going from 1e-10 to 1e-7 changes
warpage by +-1.5e-4 um (fcbga, cowos_l), well below every tolerance above.

## Mechanics, 2026-10-21 runs (L19 run queue and lane L26)

Rows below supersede the 2026-10-20 rows of the same case / study. Conventions as above (JEITA ED-7306 as coded, + =
dome). High-temperature points run at the CD6 overlap ceiling (SPEC section 23; 225 C for organic-substrate stacks,
limited by solder_resist) and are compared with targets measured at 240-265 C with the offset stated. Every run is
stamped dirty (nothing committed): `engine` = engine_version src / data hash of the run. Source = the run log in the
session scratchpad named in DevLog/lanes/L26-sim-cases-2.md (L19 queue `logs/<job>_<ts>.out`, L26 `L26/logs/`).
Labels on variant rows: `calibration` (an input calibrated to a stated input value, never to the target),
`sensitivity` (bound of a template / estimated input), `diagnostic` (model-form probe); none of them is validation.
Homogenization: `rve` = library default (RVE table / live RVE). Mesh = case mesh unless stated; PCG rtol 1e-7.

| Case / study | Target (metric_id) | T C | Target value | Engine result | Verdict | Homog | Engine | Source |
|---|---|---|---|---|---|---|---|---|
| cowos_l/warpage_rt_ht s2 (1.08e6 DOF, 83 it) | ectc51909.2023.00091-a-m1 (D) | 25 | 64 (sign-agnostic: coplanarity 64 +- 20) | -250.738, bowl, cop 250.74 | miss (coplanarity 251 vs 64) | rve | e317ed2477da / 25cec1aa8723 (L21 library) | L19 queue cowos_l_s2_v2 (2026-10-21 18:58) |
| cowos_l/warpage_rt_ht s3 (167 it) | ectc51909.2023.00091-a-m2 (D) | 225 (measured 240, offset 15) | 148 (coplanarity 148 +- 37) | +156.339, dome, cop 156.34 | pass (coplanarity 156 within 148 +- 37; at 225 C) | rve | e317ed2477da / 25cec1aa8723 | L19 queue cowos_l_s3_v2 (19:00) |
| cowos_l RT / HT ratio | D/ectc51909.2023.00091-cowos_l rt_ht_ratio (lid) | 25 / 225 | -2.31, band [-4.2, -1.3] | -0.624 | miss | rve | same | same |
| cowos_l sign flip | H/H01 (lid) | 25 / 225 | sign change | bowl -> dome | pass (shape_class bowl / dome) | rve | same | same |
| cowos_l/warpage_rt_ht_ring48x s2 (new case, TV0_4.8x ring; 1.15e6 DOF, 97 it) | ectc51909.2023.00091-b-m1 (D) | 25 | 186 (coplanarity 186 +- 46.5) | -370.105, bowl, cop 370.11 | miss (coplanarity 370 vs 186) | rve | a0fd97c8f922 / 25cec1aa8723 | L19 queue ring48x_all (19:04) |
| same s3 (183 it) | ectc51909.2023.00091-b-m2 (D) | 225 (measured 240, offset 15) | 107 (coplanarity 107 +- 26.75) | +155.241, W, cop 155.24 | miss (coplanarity 155 vs 107) | rve | same | same |
| ring48x RT / HT ratio | D/ectc51909.2023.00091-cowos_l rt_ht_ratio (ring) | 25 / 225 | -0.575, band [-0.96, -0.35] | -0.419 | pass | rve | same | same |
| ring48x sign flip | H/H01 (ring) | 25 / 225 | sign change | bowl -> W | indeterminate (W at 225 C; reported: signed value changes sign) | rve | same | same |
| fcbga_organic/substrate_warpage s2h | ectc51687.2025.00178-c-m4 (C, sign only) | 225 (paper 265, offset 40) | -292 | -127.905, bowl | pass (sign) | rve | 65cd2edd8122 / 565a11a04c7c | L19 queue fcbga_s2h (19:11) |
| fcbga_organic/substrate_warpage_bare s2h | ectc51687.2025.00178-c-m2, -b-m5 | 225 (paper 265 / 260) | -47 / -68 | +0.612, flat | untestable (undisclosed stack asymmetry) | rve | d842cf1dac26 / 565a11a04c7c | L19 queue fcbga_bare_s2h (19:12) |
| cowos_s/warpage_corner_stress s2 (6.1e5 DOF; PCG stopped at max_iter 3000, relres 6.73e-7 > rtol 1e-7, accepted with warning) | ectc51909.2023.00135-a-m1 (D) | 25 | JEITA +198 (printed -198; audit A6) | -339.774, W, cop 339.77 | indeterminate (W shape, sign gate not evaluated); the signed value is opposite to the measured dome (sign miss as information) | rve | 1586e8ba5849 / af15b3ef8274 | L26 run cowos_s_all (2026-10-21 22:10, wall 6259 s) |
| same s2h (1146 it, converged) | ectc51909.2023.00135-a-m2 (D) | 225 (measured 250, offset 25) | JEITA -153 (printed 153) | +169.119, W | indeterminate (W shape); signed value opposite to the measured bowl (information) | rve | 1586e8ba5849 / af15b3ef8274 | same |
| cowos_s s3-s7 stress_norm (all 3000 it, relres 5.2-8.9e-7, not converged to rtol) | ectc51909.2023.00135-a-m10, m13, m14, m16 (C) | 25 | 0.79 / 1.15 / 1.1 / 0.98 | 1.1992 / 1.0002 / 1.0001 / 0.9998 | indeterminate (corner maxima, audit S4; ratios near 1.000 for the C4 sweep at unconverged PCG) | rve | 1586e8ba5849 / af15b3ef8274 | same |
| cowos_s s2 variant sub_cte15_core (calibration: substrate membrane CTE 15.0 via core CTE 13.91) | a-m1 | 25 | JEITA +198 | +340.741, W, cop 340.7 | calibration (sign now dome-side; magnitude 1.7x) | rve | 1586e8ba5849 / af15b3ef8274 | L26 run cs_var_s2 (variants file sims/cowos_s/variants/substrate_ring_inputs.yaml) |
| same, s2h | a-m2 | 225 | JEITA -153 | -184.603, bowl | calibration (sign and band max(20 um, 25 %) met: 185 vs 153 +- 38) | rve | 1586e8ba5849 / af15b3ef8274 | L26 run cs_var_s2h_b |
| cowos_s variant sub_core800 (calibration, geometry route, membrane 14.18) | a-m1 / a-m2 | 25 / 225 | +198 / -153 | +299.223 (W) / -217.505 (bowl) | calibration | rve | 1586e8ba5849 / af15b3ef8274 | cs_var_s2 / cs_var_s2h_b |
| cowos_s variant ring_w9 (sensitivity) | a-m1 / a-m2 | 25 / 225 | +198 / -153 | -372.555 (W) / +185.092 (W) | sensitivity | rve | 1586e8ba5849 / af15b3ef8274 | same |
| cowos_s variant ring_w9_h2p5 (sensitivity) | a-m1 / a-m2 | 25 / 225 | +198 / -153 | -351.755 (W) / +169.734 (W) | sensitivity | rve | 1586e8ba5849 / af15b3ef8274 | same |
| cowos_s variant ring_w8p6_h2p5 (sensitivity) | a-m1 / a-m2 | 25 / 225 | +198 / -153 | -346.703 (W) / +167.353 (W) | sensitivity | rve | 1586e8ba5849 / af15b3ef8274 | same |
| cowos_s variant ring_wmax_h2p5 (sensitivity; x 19 mm, y 9.9 mm) | a-m1 / a-m2 | 25 / 225 | +198 / -153 | -402.323 (bowl) / +186.716 (dome) | sensitivity | rve | 1586e8ba5849 / af15b3ef8274 | same |
| cowos_s variant sub_cte15_ring_w9_h2p5 (calibration + sensitivity: A6 items 2-3 input set) | a-m1 / a-m2 | 25 / 225 | +198 / -153 | +251.571 (W) / -135.210 (bowl) | calibration (225 C within 153 +- 38; 25 C 252 vs 198 +- 49.5, W shape) | rve | 1586e8ba5849 / af15b3ef8274 | same |
| cowos_l/warpage_rt_ht variant sub_cte1197 (sensitivity, related bound: membrane CTE 11.97) | a-m1 / a-m2 (sign-agnostic gates) | 25 / 225 | coplanarity 64 +- 20 / 148 +- 37 | -93.590 (W, cop 93.6) / +71.061 (dome, cop 71.1) | sensitivity (both outside the bands; ratio -0.76) | rve | 1586e8ba5849 / af15b3ef8274 | L26 runs cl_sub_s2_b / cl_sub_s3_b (variants file sims/cowos_l/variants/substrate_cte_bounds.yaml; base reproduced -250.738 / +156.339) |
| cowos_l variant sub_cte15 (sensitivity, related bound: membrane CTE 15.0) | same | 25 / 225 | same | +97.866 (W, cop 97.9) / -15.873 (saddle, cop 15.9) | sensitivity (RT sign turns dome-side; HT collapses) | rve | 1586e8ba5849 / af15b3ef8274 | same |
| pending (not run at wrap-up 2026-10-22) | - | - | - | cowos_l/warpage_lid_attach (running at wrap-up, log L26/logs/cl_lid_attach_*.out, not recorded); warpage_lid_attach_indium; cowos_s/warpage_ring_attach (+ ring_attach_substrate); 120 mm substrate_a_cte, sus430_suspects, 120mm_warpage_tsf180, 120mm_warpage_cu with substrate_a_cte; xilinx_lid_foot; 50mm_quarter_e2 (cure_shrinkage both); re-runs of the L19 queue jobs below | pending | - | - | DevLog/lanes/L26-sim-cases-2.md (Next steps) |
| L19 queue jobs not recorded | - | - | - | The L19 queue ended at 19:13 PDT 2026-10-21: from 19:13:21 every remaining job (glass s2h / s3h, cowos_s_all, fanout_all, sus430_variants, sus430_rigid, cu_subcte, emib_t s1, emib_t s2, xilinx s2) exited rc=1 in 0.1 s on a YAML parse error in engine/data/materials/encapsulants.yaml (another lane's edit in progress). cowos_s_all was re-run by L26 (rows above); the rest are pending | pending | - | - | L19 queue log; DevLog/lanes/L26-sim-cases-2.md |

M1 at the rtol 1e-7 default (L19 task 5, 2026-10-21; DevLog/lanes/L19-sim-cases.md): cowos_l/warpage_rt_ht Node s2
-250.745118 um, 121.9 s, peak RSS 1.344 GiB; s3 (225 C) +156.338865 um, 232.8 s, 1.376 GiB (library d354393892f2).
Browser (headless Chrome, own dev server): s2 -250.745118 um (|dw| vs Node 1.9e-7 um), 106 s, largest-process peak
1.290 GiB; s3 +156.338509 um (L21 library 25cec1aa8723; |dw| 3.6e-4 um vs the older-library Node run = the library
change), 226 s, 1.535 GiB, above the ~1.5 GB per-worker target. The L19 queue Node runs on the L21 library: s2 1.446
GiB, s3 1.591 GiB peak RSS (`time -l`).

## Thermal

| Case / study | Target (metric_id) | Target value | Engine result | Verdict | Homog | Source |
|---|---|---|---|---|---|---|
| cowos_r/thermal_rjc s1 | ectc51687.2025.00085-c-m1 (D) | Rjc 0.0108 C/W (measured, Table 2) | 0.0079144 C/W (-26.7 %); 0.007913 at 14:31 (rom) | miss (validation case rel 0.10; sims rel 0.2; TIM1 contact resistance not disclosed, not modelled) | rve (17:45; library default, conduction-only RVE) | L10 progress 17:45; L1 wave 2; audit A3 S7 |
| same | ectc51687.2025.00085-d-m10 (C) | 0.01082 C/W (paper model, BLT 200 um) | 0.0079144 (-26.9 %) | miss | rve | same |
| same | ectc51687.2025.00085-d-m12 (C) | 0.00759 C/W (paper model, zero contact R) | 0.0079144 (+4.3 %) | pass (5 %) | rve | same |
| same | ectc51687.2025.00085-c-m5 (D) | Tj 104.9 C (inlet 20 C) | 99.368 C (current engine, audit A3 CLI run) | pass under D/ectc51687.2025.00085-c (rise 79.4 vs 84.9 C, -6.5 % within rel_rise 0.10); miss under the sims tolerance abs 3 C | rve (conduction-only) | audit A3 S7 |
| cowos_r/thermal_rjc_calibrated | ectc51687.2025.00085-c-m7 | 0.0109 C/W | Rjc +3.4 %, Tj +0.5 % with fitted R_c 4.30e-6 m2K/W; unused BLT points -1.9..+0.3 % | calibration (BLT points: prediction within 2 %) | rom | DevLog-012 (L3 wave 4) |
| info_os/theta_jc_tim s1 (TIM B, BLT 60 um) | itherm45881.2020.9190542-a-m4 (D) / -a-m2 (C) | 0.031 / 0.033 C/W | 0.02266 C/W (-27 % / -31 %) | miss | rom | L1 wave 2; audit A2 |
| info_os BLT 140 um | itherm45881.2020.9190542-a-m3 (D) / -a-m1 (C) | 0.065 / 0.063 C/W | 0.04127 C/W | miss | rom | audit A2 (headline numbers) |
| info_os s3 / s4 / s5 (TIM A / C / D) | itherm45881.2020.9190542-a-m9, -m11, -m12 (D) | 0.036 / 0.021 / 0.021 C/W | 0.0349 / 0.0120 / 0.0114 C/W | pass (A, -3 %) / miss / miss | rve | L3 wave 5 (L10 notes, 17:50-18:30) |
| info_os s1 vs TIM B test | itherm45881.2020.9190542-a-m10 (D) | 0.034 C/W | 0.0227 C/W | miss | rve | same |
| info_os k_eff variant | -a-m3, -a-m4 | BLT slope | +9.5 / +3.4 % with fitted k_eff 3.32 W/(m K) | calibration (one k_eff does not fit Table 5: +55 / 0 / -30 / -35 %) | rom | DevLog-012 (L3 waves 4-5) |
| hbm_stack, soic, cpo_module (s1) | none | - | Tmax 48.35 / 36.32 / 50.65 C | no target | rom | L1 wave 2 |

## EM

| Case / variant | Target (metric_id) | Target value | Engine result | Verdict | Source |
|---|---|---|---|---|---|
| em/em1_abf_microstrip_glass cannonball | ectc51846.2026.00389-b-m2, m5, m8, m11 (D) | 0.08 / 0.155 / 0.265 / 0.45 dB/mm | 0.0914 / 0.1724 / 0.3067 / 0.4711 | pass (tol 0.029 + 5 %; 140 GHz margin 0.0006) | L4 wave 4 run; L7 wave 3 |
| em1 base (causal ABF, Hammerstad all Cu) | same | same | 0.0980 / 0.1911 / 0.3329 / 0.4929 | miss at 140 GHz | same |
| em1 smooth | same | same | 0.0818 / 0.1415 / 0.2385 / 0.3633 | miss at 200 GHz (bracket rule passes) | same |
| em1 table vs base | causal_vs_table | <= 4.5 % | -1.1 / +0.3 / -1.5 / +0.8 % | pass | same |
| em1 T80C | b-m3, m6, m9, m12 (D) | 0.096 / 0.2 / 0.32 / 0.519 | 0.1054 / 0.2031 / 0.3560 / 0.5318 | pass | same |
| em1 T115C | b-m4, m7, m10, m13 (D) | 0.11 / 0.21 / 0.43 / 0.596 | 0.1104 / 0.2126 / 0.3788 / 0.5714 | miss at 140 GHz | same |
| em/em2_cpwg_si_bridge (odd mode, 56 GHz) | eptc67330.2025.11392620-a-e1..e5 (D) | 1.353 / 0.634 / 0.441 / 1.351 / 0.937 dB/mm | +3.8 / +11.4 / +3.8 / +3.8 / +8.0 % | pass (rel 0.20) | L7 EM-2 table (wave 1); browser run 5 / 5 pass (DevLog-012) |
| em/em5a_tsv_gsg_chain_reduced | ectc51909.2023.00230-a-m3..m6 (D) | S11 dip 40 / 45 GHz | not comparable (GSG layout, liner, Si resistivity not in the DB) | untestable | DevLog-012 (L7 wave 3, L5) |
| em/em4_microbump_gsg (line-run de-embedding, companions cut from the device mesh) | L5 desktop reference (cross-solver; no DB target) | L 9.03 +- 0.03 pH | 8.913 pH (-1.3 %, 59.5k DOF); 8.966 pH (-0.7 %, 97.4k DOF), converging from below | pass (within 3 %) | L13 (DevLog/lanes/L13-em3d.md); L5 |
| same | same | C 9.37 +- 0.02 fF | 10.53 fF (+12 %, 59.5k); 10.03 fF (+7 %, 97.4k), decreasing with refinement | indeterminate (mesh-limited) | same |
| same | same | S11 -52.5 / -32.5 / -18.6 / -12.9 dB at 1 / 10 / 50 / 100 GHz | -51.21 / -31.22 / -17.35 / -11.67 (59.5k); -51.74 / -31.75 / -17.87 / -12.16 (97.4k) | indeterminate (mesh-limited) | same |
| same (withdrawn) | - | - | 9.27 pH (companion on a different z-mesh) and 9.07 pH at 103k DOF (prototype, not reproduced by shipped code) | withdrawn (audit A3 S3; L13) | L7 EM-4 table |

## Verification (tier A / B, engine vs reference)

| Scope | Result | Verdict | Source |
|---|---|---|---|
| Thermal: TA1, TA2, TA3a/b, TA4, TA6, XB4, XB5 | engine Q1 = scikit-fem Q1 node by node to <= 1.1e-10 K on identical grids; 17 / 23 rows within 1e-3 of the converged references, 6 coarse-level rows outside (discretization) | pass (verification) | L5 engine_xcheck; validation/README.md |
| Mechanics: MA1, MA3, MA4a, MA4b, MA5b, MA6, XB1, XB2 | engine q2s = reference Q2s on the same grid (u 1e-13 to 1.6e-8 relative after rigid-motion removal; probe stresses 8-9 digits) | pass (verification) | same |
| CLT plates through the CLI path (L9) | sign and magnitude within 0.05 % of CLT, both faces, crop and full model | pass (verification) | L9 engine check |
| PLATE-NL (tier B cross-solver, 2026-10-21): thin bilayer square plate under uniform cooling, engine total-Lagrangian q2s vs scikit-fem total-Lagrangian SVK reference (`validation/reference/results/PLATE-NL-skfem.json`; deck in `engine/tests/mech-nl.test.mjs`) | bifurcation at dT -32.00 +- 0.02 K (L20 -32.01 K, linear interpolation over the 5 K bracket; refined reference -31.998 K, audit A7); symmetric-path sags (133.566 / 144.541 / 154.109 / 181.104 um at -30 / -35 / -40 / -60 K) and the switched stable branch at -35 K equal the reference to 2.7e-8 relative on the same mesh; gates in `engine/tests/mech-nl.test.mjs` | pass (verification) | DevLog/lanes/L20-engine-open-items.md task 2; DevLog/audits/round1_audit_A7_2026-10-21.md (M2, M9); row added by L26 at the coordinator's request |
