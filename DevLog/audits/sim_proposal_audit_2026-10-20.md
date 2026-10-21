---
title: Fresh-context audit of DevLog-010 (multiphysics sim harness proposal) and its 7 research reports
date: 2026-10-20
scope: DevLog/DevLog-010-multiphysics-sim-harness-proposal.md; DevLog/research/2026-10-20-sim-*.md (R1-R7); data/*.csv; config/package3d/*; sibling eo-modulator-atlas engine/ + DevLog-023/024
mode: read-only (no file edited except this audit; no git, installs or retrieval)
---

# Audit: DevLog-010 sim harness proposal

Method: read DevLog-010 and all 7 reports in full; re-queried the cited DB rows with `uv run --no-sync python -I`
(read-only scratch script outside the repo); grepped cached `references/<id>/text.md` for 5 papers; recomputed the
closed forms; summed the tranche table; checked EO engine sources; verified 5 platform/vendor claims on the web
(2026-10-20).

## Findings, ranked

### Blocking

B1. **Browser 3D EM FEM budget contradicts R2's own calibrated cost model; DevLog does not reconcile it.**
- DevLog Findings "EM browser budget" says the microbump-to-RDL block (~2.1e5 order-1 edge DOF) "fits". A8 says
  "Order 1 in the browser up to ~2e5 DOF".
- That number is R3's, marked `[inference]` ("wasm32 address space is 4 GiB").
- R2 Sec. 8.5 uses the measured symbolic-fill constants and puts the browser direct FEM limit at ~6e4 DOF. Its
  2.4e5 case needs 2.4-4.8 GB of complex factor and 6-18 min per frequency in JS.
- Recomputed with R2's constants for n = 2.1e5:
  - nnz(L) = 10-20 n^(4/3) = 1.25-2.5e8, i.e. 2.0-4.0 GB of complex factor.
  - Real mul-add per frequency = 5.6e11-1.7e12, i.e. 4.6-14 min per frequency at 2 G/s.
  - An adaptive Pade sweep of ~10-20 factorizations (R2's assumption) takes 1-5 h.
- This exceeds R2's 1.5-2 GB per-tab design budget and can exceed wasm32's 4 GiB.
- Fix: set the A8 browser order-1 limit to ~6e4 DOF, or state an explicit alternative (iterative AMS-type solver,
  coarser block, WASM SIMD, which gives ~2.2x and does not close the gap). Label EM-4 as needing a desktop
  reference, or reduce its mesh. E6 effort and scope depend on this.

### Significant

S1. **Two of the three "DB defects" are false positives.** Both values are already in
`data/electrical_interfaces.csv`. R3 searched only `metrics.csv`.
- Defect 1: `eptc67330.2025.11392620-a` Table I IL/mm is present as `-a-e1..e7` (1.353 / 0.634 / 0.441 / 1.351 /
  0.937 / 1.402 / 1.04 dB/mm at 56 GHz, measured, locator p.3 Table I). R5 Sec. 7.2 even cites these rows.
- Defect 2: `ectc51846.2026.00199-b`:
  - Nyquist IL is present as `-b-e1` (insertion_loss_db 6.2 at 16 GHz).
  - The crosstalk-limit formula is present in `metrics.csv` `-b-m1.pass_criterion`: "XT <= min(-26 dB, 2.5 x L(fN) -
    10 dB)".
- Defect 3 is confirmed: `eptc67330.2025.11392176-a-L10` / `-b-L09` "stainless steel (SUS)" has E 1.9 GPa, Tg 65~75 C
  and CTE 31.2 ppm/C.
- Fix: drop defects 1 and 2 from the next-ingest-audit queue. Correct R3 Summary item 8 and the EM-2 / EM-3b
  validation notes, which say "not in DB".

S2. **Bring-up 1 (`fcbga_organic/substrate_warpage`) is not a single-source, grade-A case.**
- `ectc51687.2025.00178` has no material properties in the DB: zero `stack_layers.properties` rows, and R5 Sec. 7.2
  lists "full M table" as missing.
- The ABF table comes from a different build (`ectc51687.2025.00148`), which has no stated stress-free T.
- The DevLog row "Grade-A warpage inputs: ... FCBGA (ectc51687.2025.00148, 00178)" repeats R5 Sec. 7.3. R5's own
  Sec. 7.2 contradicts it.
- R6 ranks `ectc51909.2023.00155-d` first. That case has Table 8 materials, a stated stress-free 150 C, a MARC quarter
  model and a simulated target. R6 ranks `ectc51529.2024.00155` second and the Xilinx `ectc.2011.5898527` third.
  None of these three is in the DevLog.
- Fix: reconcile the R5 and R6 rankings explicitly. Either make bring-up 1 a cross-paper case labelled as such, or
  promote `ectc51909.2023.00155-d` (tier C, model-to-model) or the tier-A CLT 3-layer case to bring-up 1.

S3. **Tranche dependencies omit D3, but the E1/E2 gates consume D3 outputs.**
- E1 gates (tier A thermal, NAFEMS T-series, 00085 Rjc, InFO_oS theta-JC) and E2 gates (CLT, Stoney, Lame,
  NAFEMS LE1/LE10/LE11, 00178, 00155, 00027) are D3 deliverables. E1 and E2 list only T0, D1 MVP and D2 (E1), or E1
  (E2).
- The D3 MVP (R6 Sec. 5.1) covers NAFEMS LE11/T1/T3/T4 only. LE1 and LE10 (E2 gate, and the A3 bake-off on LE10)
  are in the full D3 set. The D3 MVP's "top-3 warpage" are R6's ranks 1-3, not the E2 gate cases (00178, 00027 are
  R6 rank 5 or unranked).
- The InFO_oS theta-JC case (E1 gate) is not in the D2 family list.
- Fix: add "D3 MVP" to the E1/E2 dependencies, align the MVP case list with the gates, and add InFO_oS to D2 or
  drop it from the E1 gate.

S4. **The critical-path claim ignores the E1 -> D2 dependency.** E1 depends on "D2 grid" (4-7 days), so the
critical path is T0 -> D2 -> E1 -> E2 -> M1 = 23-37 agent-days, not T0 -> E1 -> E2 -> M1 = 19-30. Either split D2
so E1 needs only a grid stub, or restate the path.

S5. **Canonical sim per category: the request is only partly covered.**
- `families.yaml` has 12 `package_class` values. The DevLog "First canonical sims" table covers 5:
  organic_substrate, si_interposer_2p5d, si_bridge_fanout, si_bridge_organic, organic_rdl_interposer.
- R5 Sec. 1.1 proposes canonical sims for 5 more (fan_out_wafer, microbump_3d, hybrid_bonded_3d, glass_core,
  Foveros/3.5D), but no tranche schedules them.
- fan_out_panel, cpo_module and wafer_scale have none at all.
- Configurable variants: only M1 (CoWoS-L, plus FCBGA) is a milestone. CoWoS-S (user 2), EMIB-T (user 3, warpage
  plus regional EM) and CoWoS-R thermal have no milestone or effort row after M1.
- "array size" (bump/TSV array pitch and extent) is not named as a configurable knob in M1. The R5 schema has the
  params.
- Fix: add M2..Mn rows (one per remaining class, effort each) or state explicitly which classes are deferred and why.

S6. **Homogenization order conflicts with the Findings.**
- Findings: "Rule of mixtures is 23.2 % low ... Use RVE FEM" (R1).
- M1 runs before E3. It will therefore use R5's v1 analytic rules: ROM for RDL with `rdl_cu_frac`, Voigt/Reuss/
  Mori-Tanaka for bump layers. R1 flags exactly this class of rule.
- Fix: state that M1 carries a known homogenization bias and list it in the M1 `limitations`, or move a minimal RVE
  (RDL and laminate only) ahead of M1.

S7. **R2 vs R3 disagree on the FDTD role; the DevLog does not reconcile them explicitly.**
- R2 recommends FDTD on WebGPU for larger or broadband blocks (~2-7 min, 1 um cells, 4.2e11 cell-updates).
- R3 rejects FDTD as the first engine (3.2e12 cell-updates at uniform 0.5 um).
- A8 ("FDTD evaluated only at G2") picks R3 without naming the ~7.6x cell-update difference that comes from the
  cell-size assumption.
- Related, also unreconciled:
  - R1 recommends order-2 Nedelec at >= 5 elements per wavelength (the COMSOL default) and TBC for thin conductors.
  - R3 recommends volumetric conductors.
  - A8 is silent on 3D conductor treatment and on order-1 dispersion accuracy.
- Fix: add one reconciliation line per disagreement to A8.

### Minor

M1. **Provenance vocabularies differ across A6, A11 and the reports.**
- A6 basis enum `datasheet | handbook | measured | paper_model_input | derived` matches neither R4
  (`primary_evaluated | primary_measurement | vendor_datasheet | paper_model_input | paper_measurement | derived |
  placeholder`) nor R6 (`paper_exact | figure_digitized | project_inference | standard_reference | unknown`).
- A11 uses the DevLog-008 / R5 set.
- Fix: pick one vocabulary per layer (dimension, material, validation input) in the T0 SPEC.

M2. **A3 + A1 temperature order.** If Q1 incompatible-modes displacement wins the bake-off, temperature (Q1) is the
same order as displacement. That contradicts R1 lesson 3 (temperature one order lower). Add a rule (for example,
element-mean or Gauss-point-consistent thermal strain) and a test (MA6 with a non-linear T field, LE11).

M3. **E8 dependency label "(Q2 downloads)" should be Q4 (Downloads).** "D1 tier 2" is referenced, but it has no
tranche row or effort. R4 gives 25-45 agent-hours, about 3-6 agent-days, not counted in the 120-200 total.

M4. **Missing UI dependency.** U3 depends on E5 only. It also needs U1-U2 (the shell and field material).

M5. **The through-M1 audit allowance (3-5 days) looks low** for 6 audits (D1, D2, 2x E2, 2x M1) at the table's own
rate (6-9 days for 8 audits, i.e. 4.5-6.75 days for 6).

M6. **The Platform row overgeneralizes.**
- "WebGPU on by default in Chrome/Edge desktop": per R2, Linux is partial (Intel Gen12+ from 144, NVIDIA Wayland
  from 147, others behind a flag) and Windows ARM64 is behind a flag.
- Firefox macOS 145/147 is omitted.

M7. **"No TSMC/Intel paper gives material tables, stress-free T or BCs" is broader than R5's claim.** R5 says "No
CoWoS-S/L/R or EMIB/EMIB-T paper in the DB". Narrow the wording to match.

M8. **"The CTE kind is stated in only one DB table" is imprecise.** R4 says one cached paper table
(`ectc51846.2026.00103` p.4 Table II) states "instantaneous", and that paper is "not in DB".

M9. **"No public datasheet values were found for EMC, underfill, ABF, BT core or low-k" is imprecise.** R4 located
the Henkel UF 8830S TDS (not read) and the ABF brochure (dead link). Better: "none read".

M10. **Report-level inconsistencies (not in the DevLog itself):**
- R2: element aspect ratio is 25:1-100:1 in Sec. 1 but 10:1-50:1 in Sec. 8.2. The direct heat limit is ~2.5e5 nodes
  in Sec. 1 but grid A (2e5) is "desktop only, slow" in Sec. 8.3.
- R3: the lateral wall rule is 2.2 b in Sec. 3.1 but >= 3 b in Sec. 2.4. Box resonance uses eps 3.5 while
  lambda_g uses eps 3.3. PML is "5-8 graded layers" in R3 but ">= 8 polynomial" in R1. R1 labels its count as
  transferred from the Acoustics module (inference). The DevLog states "at least 8" as fact.
- R5: the config sketch combines `support: free_3_2_1` with `mirrors: [x0, y0]`. R1 (COMSOL Rigid Motion
  Suppression) says the two must not be combined. The sketch also uses `si_100_isotropic` against A6's cubic Si.
- R6: the summary says 200 h (150-260); the table says 155-270 h. The DevLog used 155-270 (19-34 days), which is
  consistent with the table.

M11. **DevLog hygiene.**
- Front-matter `status: proposal (research in progress ...)` is stale; all seven reports are finished.
- There is no TODO checklist (project DevLog convention).
- The progress log has a date but no time.
- T0 gate says `npm test`; the atlas app uses pnpm (`app/pnpm-lock.yaml`). The EO engine `package.json` scripts run
  under either.

M12. **The `ectc51846.2026.00389-a` metric count is 44 rows, not "m1..m36".** m1..m36 are the Dk/Df table; m37+
are derived rows. Harmless; cite "m1..m36 (Table I)" as the target block.

## Spot-checks: numbers (DevLog vs report vs recompute)

| # | DevLog claim | Report | Recompute / DB | Result |
|---|---|---|---|---|
| 1 | Cu skin depth 2.09 / 0.66 / 0.21 um at 1 / 10 / 100 GHz | R3 Sec. 2.5, R1 Sec. 3.4 | sigma 5.8e7: 2.090 / 0.661 / 0.209 um | OK |
| 2 | SIBC invalid under 9.8 / 39 / 61 GHz for t 2 / 1 / 0.8 um | R3 summary 2 | t = 3 delta: 9.83 / 39.3 / 61.4 GHz | OK |
| 3 | lambda_g 1.65 mm at 100 GHz, eps_r 3.3 | R3 summary 4 | 1.650 mm (R2 uses eps 3.5: 1.60 mm) | OK |
| 4 | PEC box resonance c / (2 W sqrt(eps_r)) | R3: 400 GHz (200 um), 80 GHz (1 mm), eps 3.5 | eps 3.5: 400.6 / 80.1 GHz; eps 3.3: 412.6 / 82.5 GHz. TE101 of a square W x W box is sqrt(2) higher (567 / 113 GHz at eps 3.5), so the rule is conservative | OK |
| 5 | 1 reticle = 830 mm2; DB gives 814-833 | R5 1.2 item 3 | text.md 00091 line 169 "830 mm2"; 2500/3 = 833.3, 4000/4.8 = 833.3, 4488/5.5 = 816.0, 2685/3.3 = 813.6 | OK |
| 6 | CLT 3-layer curvature 1.1928 1/m | R6 MA4b | 1.19278 1/m; eps0 -2.137e-3; sag 372.7 um (50 mm), 745.5 um (diagonal) | OK |
| 7 | Lame TSV p = 145.0 MPa | R6 MA7 | 145.05 MPa; equal-constant check 130.0 MPa | OK |
| 8 | (R6) Timoshenko 2.1562 1/m; Stoney 5.534e-3 1/m, 62.3 um; MA5b 0.06639 vs 0.06525 1/m | R6 MA3, MA5, MA5b | 2.15623; 5.534e-3, 62.26 um; 0.066391 / 0.065251 | OK |
| 9 | Grid A 0.2 M / 0.6 M DOF; grid B 1.06 M / 3.2 M | R2 Sec. 8.2 | 203,391 / 610,173 nodes x DOF; 1,062,761 / 3,188,283 | OK |
| 10 | CoWoS-L quarter ~0.45 M DOF | R5 Sec. 5.3 | 61 x 81 x 31 x 3 = 459,513 | OK |
| 11 | 14 hex grids to 931k nodes; fill ~n^1.375, work ~n^2.01 | R2 Sec. 8.1 | 14 rows, max n 931,225 | OK |
| 12 | Grid-B elasticity factor ~70 GB | R2 Sec. 8.3 | 8.8e9 x 8 B = 70 GB | OK |
| 13 | 2D channel ~3e4 triangles vs ~2.8e6 DOF in 3D | R3 Sec. 3.2(a) | 3.2e4 x 25 slices x 3 tets x 1.2 = 2.8e6 | OK |
| 14 | Microbump block 2.1e5 order-1 DOF | R3 Sec. 3.2(b) | 1.74e5 tets x 1.2 = 2.09e5 | OK (count); "fits" wrong (B1) |
| 15 | FDTD microbump ~3e12 cell-updates | R3 Sec. 3.2(b) | 1.536e7 cells x 2.08e5 steps = 3.19e12 | OK |
| 16 | Elastic / viscoelastic / measured EMC warpage 2.247 / 1.473 / 0.887 mm | R1 lesson 10 | as R1 [S23] (web source not re-fetched) | matches report |
| 17 | ROM -23.2 % vs RVE +0.9 % | R1 lesson 9 | 30,951 / 40,317 = -23.2 %; 40,690 / 40,317 = +0.9 % | OK |
| 18 | 729 absolute warpage rows; 134 / 181 stress rows normalized | R6 summary | not re-counted | matches report |
| 19 | 33 / 296 papers with property tables, 17 FE input; ~720 material strings | R4 Sec. 5 | 174+266+49+50+48+46+45+28+17 = 723 | OK |
| 20 | EMIB-T no warpage / thermal / stress row | R5 Sec. 1.2 item 5 | metrics categories for ectc51846.2026.00051: geometry 6, power_delivery 2, reliability 1, electrical 1; ectc51687.2025.00051: reliability 3 | OK |
| 21 | Effort: D1 MVP 1, tier 1 4.5-7.5; D3 MVP ~9, full 19-34; U1-U2 10-15; U3 4-6; U4-U5 7-11 | R4 6-10 h / 35-60 h; R6 70 h / 155-270 h; R7 table | 0.75-1.25; 4.4-7.5; 8.75; 19.4-33.8; R7 sums match | OK |
| 22 | Total 120-200 agent-days; through M1 46-67 | DevLog | rows sum 122.5-196.5 (D3 full counted as including its MVP); through M1 46-67 | OK |
| 23 | M1 wall clock 19-30 | DevLog | T0 + E1 + E2 + M1 = 19-30; with D2 on the path 23-37 | see S4 |

## Spot-checks: DB references

| Ref | DevLog / report claim | DB row (read-only) | Result |
|---|---|---|---|
| ectc51909.2023.00091-a-m1 / -m2 | measured warpage 64 / -148 um at 25 / 240 C, lid TV | 64 um, -148 um, measured, p.3 Fig. 6(c) | OK |
| ectc51909.2023.00091-b-m1 / -m2 | 186 / -107 um ring TV 4.8x | 186, -107 um, measured, p.4 Fig. 7(c); TV 4000 mm2, 4.8x | OK |
| LSI fit n_hbm + n_soc | 6, 18, 11 vs >10 | 00091-a c1 2, c2 4, c4 6; 00091-b c1 6, c2 12, c3 18; 00174-a c1 3, c2 8, c4 10 (qualifier count:gt) | OK |
| ectc51687.2025.00085-c-m1 / -c-m2 | Rjc 0.0108 C/W at 1866 W | 0.0108 C/W measured; 1866 W max SoC power; text.md lines 198, 135 | OK |
| ectc51846.2026.00389-a | Dk/Df 16.5-216 GHz, 3 temperatures | a-m1 3.406, a-m2 0.00203 (16.5 GHz, 25 C); a-m31 3.479, a-m32 0.0083 (216 GHz); a-m41 +20.4 %; text.md Table I | OK |
| ectc51846.2026.00389-b | TRL IL/mm 33-200 GHz | 0.08 / 0.155 / 0.265 / 0.45 dB/mm at 33 / 77 / 140 / 200 GHz, measured, p.5 Table II | OK |
| eptc67330.2025.11392620-a | HFSS cheesing 0.89 -> 0.96 / 0.95 dB; Table I "missing" | a-m9 0.89, a-m11 0.96, a-m15 0.95 OK; Table I present as a-e1..e7 | defect claim wrong (S1) |
| ectc51846.2026.00199-b | Nyquist IL and XT limit "missing" | b-e1 6.2 dB at 16 GHz; b-m1 pass_criterion holds the formula | defect claim wrong (S1) |
| ectc51529.2024.00155 Table IV | Si 167 / 3.2, EMC 13 / 7 / 25 Tg 160, CUF 6.6 / 22 / 100 Tg 166, core 33.5 / 5.9 / 2.5 Tg 314 | stack_layers a-L01..L10 properties match, locator p.3 Table IV; text.md line 354 | OK |
| ectc51529.2024.00155-a-m8 / -m9 | -67 / +71 um at 23 / 243 C, moire | -67, 71 um measured, p.5 Fig. 8 | OK |
| ectc51687.2025.00178-c / -b | sim 122 / -47 um, stress-free 180 C; measured 166 / -68 | c-m1 122, c-m2 -47 (stress-free 180 C); b-m4 166, b-m5 -68; text.md line 200 "stress free temperature is 150 degrees C"; no property rows | values OK; "grade A" wrong (S2) |
| ectc51687.2025.00027-a | coplanarity 396 / 462 / 516 um; transition 200 C | a-m1..m3, a-m10 match | OK |
| ectc51909.2023.00135-a-m10 / -m11 | ratio 0.79 / 1.0 | 0.79, 1.0 a.u. simulated | OK |
| ectc51909.2023.00230-a-m3..m6 | S11 -11 / -19.5 dB; resonance 45 / 40 GHz | match | OK |
| ectc.2016.201-c | IL 3.5 dB at 10 GHz, NEXT -17 dB | c-e1 3.5 dB at 10 GHz (electrical_interfaces); c-m1 -17 dB | OK |
| eptc67330.2025.11392176 stainless | E 1.9 GPa, Tg 65-75 C | -a-L10 / -b-L09 "Young's modulus 1.9 GPa; Tg 65~75 C; CTE 31.2 ppm/C" | defect confirmed |

## Engine claims (eo-modulator-atlas)

All of the following were confirmed in the EO repo:
- Engine source files:
  - `engine/src/sparse.mjs`: own AMD, coordinate-bisection ND, relaxed supernodes, supernodal multifrontal Cholesky.
  - `engine/src/ldlt.mjs`: `LDLT`, `ComplexLDLT`, `SupernodalLDLT`, `ComplexSupernodalLDLT`.
  - `engine/src/vector-mode.mjs`: Nedelec orders 1 and 2.
  - `engine/src/mesh.mjs`: Bowyer-Watson Delaunay with robust predicates.
  - `engine/src/postproc/{expr,units}.mjs`.
- Licence: `engine/package.json` license `GPL-3.0-or-later`, and `engine/LICENSE` exists.
- DevLog-023: D1 wording and D4 gate.
- DevLog-024:
  - S3.6: dense kernels ~75 % of factor time.
  - S3.10: JS kernel 2.63-2.93 G mul-add/s; SIMD whole-factor estimate 2.2x, "not measured end to end".
- EO DevLog-023 line 70 names `PlayGround/20260614_2d_eo_fem_solver` as "GPL, the engine's origin".

Caveat: the engine depends on `yaml` and `robust-predicates` (`engine/package.json`), so "dependency-free" (EO D1,
quoted in A1) means "no heavy numeric deps", not zero npm deps.

## Web verification (2026-10-20)

| Claim | Source checked | Result |
|---|---|---|
| three.js WebGPURenderer experimental; ShaderMaterial unsupported | threejs.org/manual/pages/webgpurenderer.html | Confirmed. Quote: "still in an experimental state"; "Custom materials based on ShaderMaterial, RawShaderMaterial and modifications of built-in materials via onBeforeCompile() are not supported in WebGPURenderer". Atlas has three ^0.186.1. |
| No f64 in WGSL | w3.org/TR/WGSL (CRD 2026-09-21) | Enable-extensions: f16, clip_distances, dual_source_blending, subgroups, primitive_index, subgroup_size_control; no f64 found. The float-type section was not fully read. Confirmed to that extent. |
| Memory64 not in Safari | caniuse.com/wf-wasm-memory64 | Confirmed. Unsupported in Safari through 27.1 / TP and iOS Safari through 27.2; Chrome 133+, Firefox 134+. |
| WebGPU Safari 26; Firefox 141 Windows | gpuweb wiki implementation-status | Confirmed. Also Firefox 145 (macOS 26+), 147 (all macOS); Linux Nightly only; Android behind flag. |
| COMSOL displacement default quadratic serendipity | doc.comsol.com Solid Mechanics Interface pages 5.5-6.4 (search summary; the 6.4 page fetch timed out) | Confirmed (secondary read). |

Not verified here: the "no WASM build found" negatives for TetGen, gmsh, deal.II, DOLFINx, PETSc, hypre and AMGCL
(a survey negative, low stakes), and the PML layer-count guidance for EM (R1 itself labels it an inference from the
Acoustics module).

## Rule compliance (DevLog-010 + 7 reports)

- Emoji / non-ASCII: none (all 8 files are pure ASCII).
- Absolute local paths: no `/Users/`, `/private/` or `~/`. The only "Downloads" hit is DevLog Q4 (paywalled-paper
  downloads), not a local folder.
- Private-context names (employer, startup): no mention. All "lambda" hits are wavelength or Suhir symbols.
- Dates: ISO throughout. Slash-number hits are value lists (e.g. 25/80/115 C), not dates. No "current" / "recent"
  time words.
- Invented numbers: DevLog effort figures are labelled "coordinator estimates". Report numbers carry [src] / [calc] /
  [est] / [inference] labels. The one load-bearing unlabeled carry-over is B1 ("fits", R3 [inference]) and the R1 PML
  count (M10).

## Request coverage

Covered:
- 3D physics: EM IL/RL/xtalk, thermal distribution and gradients, thermo-elastic warpage/strain/stress (A5, E1, E2).
- COMSOL implementation research (R1).
- Existing packages (R2).
- COMSOL-like and EO-like UI (R7).
- Browser-native posture.
- Iterative performance gates (A9, E7).
- Regional EM with PML (R3, A8).
- Tranches with effort for materials (D1), config extraction (D2), engine (E1-E8), validation curation (D3) and
  desktop references (R).

Gaps:
- Canonical sim per category: 5 of 12 `package_class` values (S5).
- Configurable CoWoS-S and EMIB-T variants (S5).
- "Array size" as a named knob (S5).
- D1 tier-2 effort row (M3).
