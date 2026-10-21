---
title: Lane L9 - warpage sign and magnitude root-cause study
date: 2026-10-20
status: done (2026-10-20); fixes proposed to L2 / L3 / L4 / L8, none applied here
scope: this file only (read-only on engine, sims, validation, data); diagnostics in the session scratchpad
owner: lane L9 (Claude subagent, DevLog-012)
---

# L9: warpage sign and magnitude mismatches (first end-to-end mechanics run, L1 2026-10-20)

Inputs read: DevLog-012 (lanes, CD1-CD7), sims/SPEC.md (sections 5, 15), DevLog/lanes/L8-mech.md (JEITA rule in
`engine/src/mech/post.mjs`), L1-engine-thermal.md (wave 3 mechanics table), validation/README.md, case YAMLs under
sims/, data/metrics.csv rows, cached paper text and figure renders (facts and locators only; no text copied).

## Plan (2026-10-20 15:53 PDT, before diagnostics)

1. Engine check (class c): minimal bilayer / trilayer plates through the same modules as the CLI (buildGrid ->
   solveMech -> post.mjs `warpage`), compared with CLT; sign on top and bottom surfaces; symmetric crop vs full.
2. Per case: paper text, figures and metrics.csv rows (surface, view side, smile / cry, signed or magnitude,
   temperature vs stress-free), case YAML, generator stack dump, one coarse run per study under `nice -n 10`,
   single-input diagnostics (sensitivity only, never tuned to a target).
3. fan_out_panel: sag / thickness; linear vs geometric nonlinearity.
4. Findings table: case, mismatch, root-cause class (a convention, b model input, c engine, d unmodelled physics),
   evidence with locators, proposed fix and owner lane.

Scratch scripts (session scratchpad, not committed): `bilayer.mjs` (engine check), `diag.mjs` (stack dump + one solve
through generate -> buildGrid -> solveMech with the case library and overrides; warpage on the target selection and
on the model top / bottom, curvature fits, u_z profiles along x and the diagonal), `subcte.mjs` (membrane CTE of a
layer list from resolved library entries). `diag.mjs` reproduces the CLI value exactly (fcbga bare, 2 mm mesh:
-5.66 um from both).

## Summary

No engine error found. The JEITA ED-7306 sign and the magnitude are correct on closed-form plates through the CLI
code path. Every mismatch is a model-input or measured-state issue, unmodelled physics, or (for cowos_l, possibly) a
viewing-side convention. Three cases have a sign set by a near-cancellation of two large terms, so their sign is not a
robust check with template inputs: lidded Xilinx, cowos_l at RT and 50 mm at 260 C.

## Engine check (class c): closed-form plates (2026-10-20 15:57 PDT)

20 x 20 mm plates, two 0.5 mm isotropic layers ("lo" E 130 GPa, nu 0.3, 3 ppm/K; "hi" E 120 GPa, nu 0.3, 17 ppm/K),
stress-free 150 C, q1im, 0.5 mm cells, 2 cells per layer, quarter crop with symmetry supports unless stated.
CLT reference: equi-biaxial laminate, centre minus corner = -w'' L^2 / 4.

| Plate | Load | CLT centre-corner (um) | Engine signed warpage, top / bottom surface (um) | Fitted w'' vs CLT |
|---|---|---|---|---|
| lo on top of hi | 150 -> 25 C | +262.40 (dome) | +262.28 / +262.29 | 1.3e-7 |
| same, full model, rigid_motion, 1 mm cells | 150 -> 25 C | +262.40 | +262.31 / +262.31 | 4.0e-5 |
| hi on top of lo | 150 -> 25 C | -262.40 (bowl) | -262.29 / -262.28 | 1.3e-7 |
| lo on top of hi | 150 -> 260 C | -230.91 (bowl) | -230.80 / -230.81 | 1.3e-7 |
| symmetric 0.1 / 1.0 / 0.1 mm trilayer | 150 -> 25 C | 0 | -0.17 / +0.17 (free-edge effect, opposite signs on the two faces) | - |
| 100 mm plate, 0.1 hi / 0.5 lo mm | 150 -> 25 C | +5841.96 | +5842.01 / +5842.02 | 2.1e-6 |

- Sign: + = dome (centre up, top surface convex) on both faces, flips with the layer order and with the sign of
  T - Tsf. This is the JEITA ED-7306 rule as coded.
- Magnitude: within 0.05 % of CLT. Signed warpage equals coplanarity equals centre minus corner for a spherical cap.
- CLI path: `evalMechTarget` passes `warpage_um` through unchanged (`engine/src/thermal/case.mjs` mechValue),
  `checkTolerance` sign_only compares Math.sign. No extra sign flip anywhere.

## Findings

| Case | Mismatch (engine vs target) | Class | Evidence (locators) | Proposed fix, owner |
|---|---|---|---|---|
| fcbga_organic/substrate_warpage_bare (c-m1, b-m4) | 25 C -7.6 vs +122 um; 30 C -7.3 vs +166 um | b | (1) The modelled 2-2-2 stack is mirror-symmetric except the pad-level Cu fraction: fc_pad 0.4418 vs bk_pad 0.3848 (generator dump). (2) Diagnostic, 2 mm mesh: base -5.66 um; bk_pad mapped to the fc_pad key -> -0.28 um (curvature 1e-5 1/m). The whole engine value is that 6 % Cu-fraction difference, as linear CLT predicts for a symmetric laminate. (3) Paper p.2 Sec. II.B gives only "2-2-2", 65 mm, stress-free 180 C. Fig. 5(a) (p.3) shows a top face with a central region of a different colour and scattered pads, i.e. the paper's model is not mirror-symmetric, but that asymmetry is not described. Diagnostic: the top solder resist removed (E 1 MPa) -> +28 um, positive (paper sign) but 4x short of 122. (4) b-m4 / b-m5 are measured parts (DIC) with real Cu residual and SR asymmetry. | L4: mark c-m1 / c-m2 / b-m4 / b-m5 as untestable with this stack (status indeterminate, reason "sign set by undisclosed top / bottom asymmetry"), keep them as trend rows only. L3: if kept, add explicit asymmetry knobs (SR opening area over the die region, per-side Cu residual) as template with sensitivity bounds; never pick values to hit the sign. |
| glass_core_substrate/warpage_vs_organic s3 (d-m1) | 25 C -4.5 vs +97 um | b | Same mechanism. Symmetric stack except the signal-level Cu fraction, g_fsig 0.5 vs g_b9 0.4 (generator dump). Same paper and Fig. 5(a). s2 (with chips) +66.6 vs +160 is a sign pass driven by the chips, as expected. | Same as above (L4 untestable flag; L3 knobs). |
| fcbga_organic/substrate_warpage (c-m3) | 25 C +236 vs +439 um (sign_only pass) | b | Sign correct (Si chips on organic, dome at RT). The magnitude has no basis: the paper gives no material table (case `missing`). The core maps to library core_lowcte (E 33 GPa, 6.9 ppm/K) for an "organic core" of unknown CTE. The solder resist maps to polyimide_rdl (see the cross-cutting item). | Keep sign_only. L3: solder resist mapping (below). |
| si_interposer_peers/xilinx_tsv_lid s2 lidded (b-m3) | 25 C -52.6 vs +162.6 um | b | (1) Paper Table 3 (p.3): no lid 13.2 mil (+335 um), lid 1.0 mm 6.4 mil (+163 um). Text p.2-3 Sec. a: "negative = smiley", one stress-free temperature 150 C for the whole package, "non-linear" models, T-dependent properties (only RT values given). Fig. 3(b) (p.3): the lidded result is a monotonic dome (centre highest, corner lowest). (2) Engine shape is a W, not a dome: u_z along the diagonal on the substrate bottom (2 mm mesh) = 0 (centre), -25 um at 12.5 mm (interposer edge), +18 um at the corner. The central curvature is a dome (kappa_clt_x +0.47 1/m) and the lid-foot ring bends the rim up, so the diagonal rule gives a negative sign. (3) Diagnostics: foot decoupled (adhesive E 1 MPa) -> +101.8 um (dome, via the TIM alone); lid CTE set to the substrate membrane CTE (14.5 ppm/K) -> +44.3 um. (4) Substrate membrane CTE in the model is 14.5 ppm/K (core 11 ppm/K plus template build-up with 10 Cu levels of 15 um at 0.41-0.85 Cu). The paper says the Cu lid "balances" because its CTE is close to the substrate's. In the model the 17 ppm/K lid still exceeds the substrate by about 2.5 ppm/K, and the rigidly bonded 3 mm Cu foot turns that into a rim bowl. (5) Lid foot, attach adhesive and thickness, lid cavity, TIM thickness and the substrate stack are template (case `missing`). | L3: lid-attach model form from the paper's description (forged lid; foot geometry and adhesive as sensitivity knobs with bounds, not tuned). Report the shape class (dome / W / saddle) next to the signed value. L4: tolerance on the lidded row: sign plus shape class, magnitude only if the lid inputs are sourced. No engine change. |
| si_interposer_peers/xilinx_tsv_lid (cross-check) | override `solder_resist` (Table 2: 2.9 GPa, 68 ppm/K) never applied | b | The generator maps sbt_sr_t / sbt_sr_b to polymer_dielectric -> alias polyimide_rdl (`engine/data/materials/_aliases.yaml` line 10). No part in the model uses solder_resist (key census of the generated parts). Table 2's C4 UF (8.5 GPa, 31.5 ppm/K) is also not separated: uf1 and uf2 share underfill_cuf with the ubump-UF override. | L3: solder-resist layers -> library `solder_resist` (exists, `engine/data/materials/buildup.yaml` line 138). L3: separate C4 underfill key. L1 / L8: warn when a materials.overrides key is used by no part (silent no-op today). |
| si_interposer_peers/50mm_quarter (d-m1) | 260 C +852 vs -189 um | d + b | (1) Sign convention checked: Fig. 9 (p.5, key figure f18) pictograms show (+) = dome with bumps down and (-) = bowl with bumps down, so the paper's sign equals JEITA. (2) Paper p.3 Sec. E: EMC, CUF and DAF viscoelastic, MARC non-linear, 20-node hexahedra, stress-free 150 C. Table 8 (p.3): EMC Tg 140 C, E1 18 GPa, E2 0.4 GPa, alpha 7 / 25 ppm/K, cure shrinkage 0.16 %. CUF Tg 160 C, E1 8.9 GPa, E2 0.1 GPa, alpha 26 / 104 ppm/K. Insulation layer E 32 GPa, alpha 65 ppm/K, cure shrinkage 21 %. (3) The base case applies E1 over 150 -> 260 C, a path entirely above the EMC Tg: +852 um. With E2 (the existing variant 50mm_quarter_e2, CLI, case mesh): +100.1 um. (4) Diagnostics on e2 (1 mm mesh): EMC E -> 0 gives -388 um, CUF E -> 0 gives +127 um, insulation E -> 0 gives +345 um. The 260 C sign is a balance between the rubbery EMC on top (dome) and the 3 um, 32 GPa, 65 ppm/K insulation layer under the interposer (bowl). (5) With the Table 8 EMC cure shrinkage 0.16 % entered as an equivalent CTE reduction over 150 -> 260 C (alpha2 25 -> 10.45 ppm/K; diagnostic stand-in for an eigenstrain): -150 um, same sign as the paper and within 21 % of -189. How the paper applied the shrinkage is not stated. | L3: move the 260 C target to the E2 variant (the E1 case is invalid above Tg). L8: add a per-material / per-part eigenstrain (cure shrinkage) input, plus E(T) with an incremental (hypoelastic) update for paths that cross Tg, ahead of E8 viscoelasticity. L2: carry cure shrinkage as a material field (Table 8 values with locators). L4: the 25 C study has no target; keep it. |
| fan_out_panel/panel_warpage (a-m9) | +12,633 vs 700 um (18x) | b + d | (1) What was measured: p.6 Sec. III.E says the strip was transferred to a second glass carrier, the first carrier was removed, and "the final warpage is 0.7mm". So the measured object is the strip bonded to a glass carrier; the model is a free strip (case `assumptions`: "modelled free (rigid-motion suppression, no carrier)"). Carrier thickness and bond layer are not stated. (2) Geometric nonlinearity: modelled thickness 444 um (RDL 44 + EMC 400), engine sag 12.63 mm, so sag / thickness = 28.5 (threshold about 0.5). Linear curvature about 1.6 1/m gives kappa L^2 / h = 207, far past the bifurcation of a free bilayer plate, so a free strip would curl cylindrically along its length; at that curvature a 240 mm span still gives about 11.5 mm. Geometric nonlinearity changes the shape but cannot bring the free strip near 0.7 mm. (3) Elastic EMC, no underfill (dropped for the mesh budget), stress-free 120 C = lamination stage (EMC cure not stated); the sign is not stated (metric scope). | L4: retarget a-m9 as "strip on carrier" (or mark it untestable until the carrier is defined); tolerance magnitude-only. L3: carrier variant (glass plate plus bond layer, thickness as a template knob with bounds). L8: geometric nonlinearity (total Lagrangian) is a prerequisite for any free large thin strip or panel (sag / thickness > 0.5). |
| cowos_l/warpage_rt_ht (a-m1, a-m2) | 25 C -257 vs +64 um; 240 C +208 vs -148 um | b (sign at RT ill-conditioned), possibly a | (1) Paper p.3 Sec. II.A and Fig. 6(c) (key figure f02): "65 um at RT and ~150 um at 240 C", labels +64 / -148. Measured surface, view side and method are not stated (DB scope). The HT plot shows corners high with a low ring around a raised centre; the RT plot is saddle-like (two opposite edges high, the other two low), a shape for which a signed value is ill-defined (R1 2.4, Akrometrix study). (2) Engine (2.5 mm coarse mesh, -254 um vs -257 at the case mesh): a smooth bowl, corners +249 um above the centre. (3) Diagnostics at 25 C: no lid -> +534 um (dome, Si-rich module on organic); TIM E x0.1 (0.58 MPa) -> +156 um. The RT sign is the difference of a +534 um module term and an even larger template lid term (2 mm Cu over a full-area 60 um TIM at 5.8 MPa, stress-free 150 C): it flips with a x0.1 change of a template TIM modulus. (4) RT / HT ratio: measured -148 / 64 = -2.31, independent of the sign convention. Engine +208 / -257 = -0.81; a linear model with constant properties gives (240 - Tsf) / (25 - Tsf) = -0.72 at Tsf 150 C. The measured ratio corresponds to Tsf = (240 + 2.31 x 25) / 3.31 = 90 C in a linear model (derived estimate). The template stress-free 150 C (case `assumptions`) is inconsistent with the measured ratio. Softening above Tg would lower the HT magnitude, the opposite direction. (5) Convention: if the moire sign was reported as seen from the ball side (the usual shadow-moire side; R1 2.4; same-corpus example ectc51687.2025.00178 Fig. 8 "bottom side" with sign opposite to Fig. 7 top view, DB row -a-m7 / -b-m6), the JEITA values would be -64 / +148, in sign agreement with the engine. Not verifiable from this paper. (6) Templates: 8 dummy dies (19.9 mm squares, positions not dimensioned), SC-RDL / side mold over 91 x 91 mm, the uBGA layer as 200 um of underfill_cuf over the full 91 x 91 mm with Cu only inside the interposer footprint, lid Cu (material not stated), TIM film properties. | L4: change the a-m1 / a-m2 comparison to sign-agnostic quantities: (i) coplanarity magnitude per temperature, (ii) RT / HT ratio and sign flip (H01), with a note that the view side is unknown. L3: stress-free temperature as a study parameter, with the ratio-implied 90 C as a labelled sensitivity bound next to 150 C; lid coupling (TIM E, lid CTE) via the `--sensitivity` runner; the uBGA field over the full SC-RDL area (500 um pitch, -a-i3). L5 / L4: look for a TSMC CoWoS paper in the corpus that states its moire view side, to settle the convention. |
| si_interposer_peers/120mm_warpage | timed out at 600 s (5 temperatures, 6.2e5 nodes) | - (run budget) | Not a mismatch yet. Predicted issue from the DB rows: measured a-m16..m19 (p.5 Fig. 11, "+ convex (center up)") = +485 / +135 / +65 / -85 um at 30 / 148 / 222 / 243 C. The zero crossing interpolates to about 231 C, while the case uses stress-free 170 C (stiffener 130 C), so a linear model flips sign near 170 C and will miss the 222 C sign. a-m23 (FEM, 260 C, +247 um, Fig. 12) has no sign convention in the DB row, and its sign is opposite to the measured -85 um at 243 C. L5 reports sag / thickness 2.35 for the 120 mm XB2 plate, so geometric nonlinearity also matters for this size. | L1: one runMechCase call per temperature with its own budget, or a coarser mesh for the sweep. L3: stress-free temperature knob (measured zero crossing about 231 C as a labelled bound). L4: confirm the a-m23 sign convention from Fig. 12 before it is gated. |

## Cross-cutting items

1. Solder resist modelled as polyimide_rdl (E 2.5 GPa, 54 ppm/K) in every generator that uses `polymer_dielectric` for
   SR (fcbga_organic sr_top / sr_bot, glass_core_substrate, cowos_s / cowos_l sbt_sr_t / sbt_sr_b), although the
   library has `solder_resist` (2.4 GPa, 60 / 130 ppm/K bilinear, tcpmt.2025.3614186). The effect on the symmetric
   bare substrates is nil, but it matters for any SR asymmetry (SR opening) and for case overrides keyed on
   solder_resist (Xilinx: silent no-op). Owner L3 (spec materials), L2 (alias note).
2. Unused overrides should warn (owner L1 parseCase / L8 runMechCase).
3. Shape class: lidded and stiffened cases produce W or saddle shapes, for which a signed coplanarity is ill-defined
   (R1 2.4). Proposal for L8 post.mjs: add `shape_class` (dome / bowl / W / saddle from the sign pattern of the
   central curvature fit vs centre-minus-corner vs diagonal extremes) and `centre_minus_corner_um` in the CLI summary.
   Proposal for L4: sign-only gates only for dome / bowl shapes.
4. Near-cancellation cases (lidded Xilinx, cowos_l RT, 50 mm 260 C): report the two component terms (diagnostic runs
   above) with the result, and gate on magnitude or trend, not on the sign alone, until the cancelling inputs are
   sourced.
5. Linearity: W(T_HT) / W(T_RT) = (T_HT - Tsf) / (T_RT - Tsf) for constant properties. Measured ratios therefore test
   the stress-free temperature independently of the sign convention (cowos_l: implied 90 C vs template 150 C; 120 mm:
   measured zero crossing about 231 C vs 170 C). Proposal for L4: an `implied_Tsf` derived check in
   validation/expected for every case with two temperatures.

## Top fixes (priority order)

1. L4: re-scope targets whose sign the model cannot determine: fcbga / glass bare substrates (untestable, symmetric
   stack), fan-out a-m9 (measured on a carrier), cowos_l (sign-agnostic coplanarity plus RT / HT ratio until the view
   side is known).
2. L3 + L8: 50 mm module: E2 variant as the 260 C case; eigenstrain (cure shrinkage) input in the engine; E(T) with an
   incremental update across Tg.
3. L3: stress-free temperature as an explicit sensitivity knob (cowos_l, 120 mm) and lid-coupling sensitivity
   (TIM E, foot / adhesive) through the existing `--sensitivity` runner. Report spreads, do not fit.
4. L3 / L2: solder resist -> `solder_resist`; separate C4 / ubump underfill keys; L1 / L8: unused-override warning.
5. L8: `shape_class` in the warpage result; geometric nonlinearity (total Lagrangian) before free large panels
   (fan-out, 120 mm).

## Progress log

- 2026-10-20 15:52 PDT: read inputs; CLI fcbga bare s2 at max_xy 2 mm: 25 C -5.66 um, 30 C -5.45 um (case mesh
  1 mm: -7.6 / -7.3, L1).
- 2026-10-20 15:57 PDT: engine check (bilayer.mjs): sign and magnitude correct to 0.05 % of CLT, both faces, crop and
  full model.
- 2026-10-20 15:58 PDT: fcbga bare: symmetric-pad diagnostic -0.28 um; top SR removed +28 um. Paper Fig. 4 / 5 / 7 / 8
  read (p.3).
- 2026-10-20 16:00 PDT: glass s3 stack dump: same symmetric-stack mechanism (signal Cu 0.5 vs 0.4).
- 2026-10-20 16:01-16:05 PDT: Xilinx lidded: W-shaped u_z; foot decoupled +101.8 um, lid CTE 14.5 ppm/K +44.3 um;
  substrate membrane CTE 14.5 ppm/K; solder_resist override unused. Paper Table 2 / 3, Fig. 3 read.
- 2026-10-20 16:06-16:09 PDT: 50 mm: Fig. 9 pictograms = JEITA sign; e2 variant CLI +100.1 um; EMC / CUF / insulation
  sensitivities; shrinkage-equivalent EMC CTE -150 um. Table 8 read.
- 2026-10-20 16:10 PDT: fan-out: measured state on the second glass carrier (p.6 Sec. III.E); sag / thickness 28.5.
- 2026-10-20 16:11-16:17 PDT: cowos_l (coordinator request): coarse base -254 um, no lid +534 um, TIM E x0.1 +156 um;
  Fig. 6(c) shapes; RT / HT ratio implies Tsf about 90 C.
- 2026-10-20 16:18 PDT: 120 mm: DB rows read; predicted stress-free issue (zero crossing about 231 C). Report written.
  Peak RSS of all runs <= 1.46 GB, one heavy run at a time, all under nice -n 10.

# Wave 2 (coordinator, 2026-10-20 17:35 PDT): 120 mm flat warpage(T), cowos_s solver failures

Same rules: report only; diagnostics in the session scratchpad (`epsprobe.mjs` per-material thermal strain through
createMechMaterials; `ringlin.mjs` minimal ring deck; `zgrid.mjs` grid z census; `case120_2T.yaml` + `v120.yaml`
runner-path deck; `diag.mjs` now passes `gmg` / `maxIter`).

## W2.1 si_interposer_peers/120mm_warpage: warpage nearly independent of T

Root cause: model form, not the engine or the runner. The case sets `stress_free_C: {default: 170, per_part: {ring_*:
130}}` in a single-step total-strain model. A per-part stress-free temperature there is a temperature-independent
eigenstrain on the SUS430 ring: e_ring(T) = alpha_r (T - 130) = alpha_r (T - 170) + alpha_r x 40 K, i.e. +440 ue
relative to a common-Tsf model at every T (epsprobe: sus430 +439.5 ue at 170 C, all other materials exactly 0 at
170 C). On this stack the common-Tsf part of the response is small in the centre-minus-corner sense (W shape), so the
constant ring term dominates and w(T) looks flat.

Evidence:
- Per-material thermal strain (epsprobe.mjs, case library + overrides + allow_extrapolation): every material is
  strain-free at its own Tsf; no frozen CTE, no hold-last effect at 30-222 C; bilinear overrides (core, SR, EMC, CUF)
  behave as secant (T - Tsf).
- diag (max_xy 4 mm, 1 cell per layer): signed warpage +457.6 / +458.5 / +460.3 um at 30 / 100 / 170 C (centre minus
  corner 457.6 / 458.5 / 457.6); at T = Tsf_default = 170 C the warpage is +460 um because only the ring is strained.
  Ring set to 170 C (common Tsf): -155.0 um at 30 C (W shape: centre-minus-corner +0.7 um, rim up). Superposition in the
  linear centre-minus-corner metric: w = A (T - 170) + B (T - 130) with B = 457.6 / 40 = 11.4 um/K and A + B = -0.005
  um/K, so A = -B and w(T) = 40 B = const.
- Minimal deck (ringlin.mjs; explicit T-independent materials: substrate 30 GPa / 15 ppm/K, Si die, steel ring 200 GPa /
  11 ppm/K; q1im, quarter): common Tsf 170 C gives 397.35 / 198.67 / 113.53 / 0.00 / -147.59 um at 30 / 100 / 130 /
  170 / 222 C, exactly linear in (T - Tsf) (2.838 um/K at every T); ring Tsf 130 C adds a constant +191.45 um at every
  T (588.80 / 390.12 / 304.98 / 191.45 / 43.86 um centre-minus-corner).
- Runner path (engine/src/runner/node.mjs --variants, runMechCase per temperature, coarse common mesh, 3.7e5 DOF):
  base +457.66 / +509.37 um at 30 / 222 C; variant `tsf130_all` (every part stress-free 130 C) -111.91 / +95.91 um,
  i.e. the sign changes through Tsf, ratio -0.86 vs -0.92 for constant properties (secant CTE T-dependence, Tg of
  SR / CUF / EMC). The temperature list reaches runMechCase correctly.
- Paper (ectc51529.2024.00155 p.3 Sec. II.E): CUF cured 170 C for 2 h, then the stiffener glued with silicone and
  cured 130 C for 0.5 h. The physical meaning is a process sequence: the ring is attached stress-free to the package as
  deformed at 130 C, not to the as-built geometry. The single-step per-part Tsf instead forces the ring onto the
  undeformed geometry with a 40 K length mismatch (spurious constant eigenstrain), so w(130) is +305 um in the minimal
  deck instead of the ringless package's own value at 130 C.

Fix (owners):
- L3: express the stiffener attach as a `process_sequence` study (L8 E4, already in runMechCase): step 1 all parts
  except ring (and glue) stress-free 170 C, cool to 130 C; step 2 activate ring + glue stress-free at 130 C; step 3
  ramp to each target T. Drop `per_part` stress-free offsets from single-step studies unless the part is genuinely
  pre-stressed. Add the omitted silicone glue layer (thickness template with bounds).
- L8 / L10: warn when `stress_free_C.per_part` differs from the default in a single-step thermo_elastic study ("per-
  part Tsf is a constant eigenstrain; use process_sequence for attach steps").
- L4: the measured zero crossing (about 231 C between a-m18 +65 and a-m19 -85) is a trend check for the sequence model;
  the common-Tsf runner result already crosses at Tsf, so neither single-step variant can match it without the
  sequence (or a different effective Tsf), which is information, not a target to fit.

## W2.2 cowos_s/warpage_corner_stress: s4 / s5 "not positive definite", s6 / s7 no convergence in 3000 iterations

Sources: the coordinator batch log in the session scratchpad (`mech_run_20261020T150916.log`, last write 16:35 PDT),
reruns 2026-10-20 17:58-19:29 PDT (current engine), all under nice, one heavy run at a time, peak RSS <= 1.76 GB.

| Run | Mesh / DOF | Solver path | Iterations | relres | Warpage bottom (um) | Wall |
|---|---|---|---|---|---|---|
| batch s4, s5 (about 16:06 PDT) | case, 6.1e5 | then-current low-memory path | - | ERROR after 3-4 s in la/block.mjs BlockCholesky (coarsest level) | - | 3-4 s |
| batch s6 / s7 | case, 6.1e5 | lowmem | 3000 (cap) | 3.1e-9 / 2.4e-8 | - | 617 / 1101 s |
| CLI s4, current engine | case, 6.14e5 | lowmem (l8-half, 5 levels) | 3000 (cap) | 4.5e-7 | (no s4 warpage target) | 1113 s |
| diag s4 A, maxIter 600 | case, 6.14e5 | lowmem, f32 coarse levels | 600 | 6.5e-7 | - | 230 s |
| diag s4 B, maxIter 600 | case, 6.14e5 | full f64 stencil, L1 la/block hierarchy | 600 | 5.7e-7 | - | 236 s |
| diag s4, max_xy 3 mm | 4.4e5 | lowmem | 2304 (converged 1e-10) | 9.9e-11 | -340.57 | 498 s |
| diag s4, max_xy 6 mm, 1 cell/layer | 2.2e5 | f64 L1 hierarchy | 667 (converged) | 9.4e-11 | -341.08 | 70 s |
| same, ring removed (lid_type none) | 2.1e5 | same | 382 (converged) | 8.9e-11 | +535.08 | 39 s |
| same, base, maxIter 30 / 60 / 90 / 150 | 2.2e5 | same | capped | 1.4e-5 / 1.5e-6 / 3.7e-7 / 4.4e-8 | -341.03 / -341.08 / -341.08 / -341.08 | 15-25 s |

Classification:
- "not positive definite" (s4, s5 in the 16:06 batch): not reproduced with the current engine (s4 runs to the
  iteration cap without error). Not a singular or unsupported region: the s2-s7 grids have identical topology
  (57 x 55 x 71, min dz 0.270 um = two cells in the 0.54 um via films, max aspect 3704, no sliver; only the C4 standoff
  shifts z planes), every part is bonded (z continuity checked per study), and the material census has no soft or
  negative-stiffness entry at 25 C (no TIM, no void matrix; allow_extrapolation only beyond 240 C). s6 and s7, with
  the same structure, ran minutes later. The failures came 3-4 s after start, in the coarsest-level Cholesky of
  la/block.mjs. The current low-memory path builds its coarse levels through mech/gmg.mjs, which has a different error
  message, so the 16:06 code path differed from today's. Engine files were being edited during the batch:
  homog/table.mjs (16:02), L8's precomputed RVE table (16:03), L1's halfmg M10 work (15:55-16:35); la/block.mjs and
  halfmg.mjs were last saved at 16:30 / 16:35. Verdict: a transient code state, not attributable further. Fix
  (L10 / L1): stamp every run log with an engine version (hash of src/ or git describe plus a dirty flag), and do not
  run batches while lanes edit engine files.
- No convergence in 3000 iterations (s6, s7, and s4 today): solver tolerance and multigrid conditioning, not
  singularity. Iterations grow with refinement (667 -> 2304 -> > 3000 at 2.2e5 / 4.4e5 / 6.1e5 DOF) and with the
  2 mm Cu stiffener bonded directly to the substrate (382 without ring vs 667 with, same mesh). The f64 L1 hierarchy is
  no better than the f32 low-memory one (5.7e-7 vs 6.5e-7 at 600 iterations), so f32 storage is not the cause. This
  matches L1's M10b diagnosis: the q1im bending spectrum is reduced only slowly by the z-line smoother plus trilinear
  coarse corrections. The cowos_s ring is a stiff frame, a strong case of that spectrum. Consequence: harmless for
  warpage. The warpage is within 0.05 um (1.5e-4 relative) of the converged value at relres 1.4e-5 and identical to
  0.01 um from relres 1.5e-6. The default rtol 1e-10 spends 80-95 % of the wall time on digits the outputs do not
  use. Fix (L8): a quantity-based stop (rtol 1e-7, or stop when warpage and the probed stresses change by less than
  1e-5 relative over 50 iterations), keeping 1e-10 for the tier-A gates. Report relres next to every result. Treat
  "not converged" with relres < 1e-6 as a warning, not a failure (it is a warning today; make the CLI summary say the
  outputs are converged to the stated level). Longer term (L1 / L8, M10b list): deflation of the lowest bending
  modes, reused across temperatures and variants. The stress_norm corner targets are ratios of Gauss-point maxima
  at flagged corners (indeterminate per audit S4), so they do not need a tighter tolerance either.
- Note (3) from the coordinator (runCaseAll strips allow_extrapolation before runMechCase): consistent with the batch
  s2h failures in the log ("abf_gl T = 250 C outside valid_T_C"); owned by the fixing lane, not re-investigated.

## Wave 2 progress log

- 2026-10-20 17:35 PDT: read L3 wave 5 table, 120 mm case, runner/variants.mjs, runner/node.mjs.
- 2026-10-20 17:36-17:41 PDT: 120 mm diag at 170 / 30 / 100 C (+460 / +458 / +458 um); epsprobe: all materials zero
  strain at their Tsf, sus430 +439.5 ue at 170 C; ring at 170 C -> -155 um.
- 2026-10-20 17:44 PDT: minimal ring deck: exact linearity with common Tsf; a per-part Tsf adds a constant.
- 2026-10-20 17:45-17:50 PDT: runner path (node.mjs --variants): base +457.7 / +509.4 um, common Tsf 130 C -111.9 /
  +95.9 um at 30 / 222 C. Paper sequence (CUF 170 C, stiffener glue 130 C) read.
- 2026-10-20 17:58-18:09 PDT: cowos_s s4 CLI, current engine: no PD error; 3000 iterations, relres 4.5e-7, 1113 s.
- 2026-10-20 18:20-18:42 PDT: s4 diag A / B (lowmem vs f64 L1 hierarchy), coarse meshes (2304 / 667 iterations).
  A first A/B attempt aborted on a scratch-script curvature-fit window (empty top plane), rerun without it.
- 2026-10-20 19:24-19:29 PDT: ring removed 382 iterations; warpage vs iteration cap (converged by relres 1.5e-6).
  Wave 2 written.
