---
title: Audit A2 - mechanics, EM 3D, UI, sensitivity runner, end-to-end physics (fresh context)
date: 2026-10-20
auditor: fresh-context audit subagent (read-only except this file)
scope: engine/src/mech, engine/src/em3d, engine/src/runner, app/src/lib/sim, app/src/routes/sim; audit A1 fixes (S2, S3, S5, S6, B1, S4); DevLog-012 end-to-end results; rule compliance of files changed since A1
snapshot: files read 2026-10-20 14:52-15:08 PDT while L1, L3, L5, L6, L7, L8 were editing (see Snapshot)
---

# Audit A2: mechanics, EM 3D, UI, runner

Binding inputs read: DevLog-012 (lanes, CD1-CD5, A1 summary), sims/SPEC.md v0.7 (sections 1-15), DevLog-010 A1-A11,
audit A1, lane notes L8, L7 (E6), L6, L3 (wave 3/4), L5. A1 checks were not repeated. All runs under `nice -n 10`;
peak RSS 1.6 GB (Xilinx s3 direct). Scratch scripts in the session scratchpad, nothing written to the repo except this
file. No servers, no screenshots.

## Snapshot

- Read early (unchanged since): mech/{elements 14:30, constitutive 14:17, supports 13:52, assemble 14:10},
  em3d/{elements 13:59, cascade 14:03, mesh 14:05}, materials/cubic 14:25, grid/spacing 14:29, families/boxes 14:35.
- Changed during the audit (findings re-checked on the newer version where marked): em3d/{ports 14:55, solver 14:56,
  run 14:58} (L7 phase 2), mech/post 15:00 (curvature-fit fix), mech/{case, index, materials} 15:07,
  runner/sensitivity 15:07 (CTE rows added), materials/homogenize 15:05, grid/index 15:05,
  app/src/lib/sim/{post 15:03, Graphics 15:07, workbench 15:07}, sims/*.yaml 14:55-15:07.
- Resolved during the audit: the `status: user` TIM1 CTE 100 ppm/K overrides in xilinx_tsv_lid and cowos_l (seen at
  15:00) were replaced by the L2 CD5 template CTE at 15:07. Not listed as a finding.

## Tests and runs (all pass)

| Run | Result |
|---|---|
| mech-tierA + mech-core + mech-case | 20/20, 13.0 s wall |
| em3d.test.mjs | 5/5, 12.2 s; gate log TE10 +1.06e-2, S11 -51.7 dB; coax Z0 -0.77 / -0.61 %; PML 2/4/8 cells -22.7 / -30.6 / -41.8 dB |
| em3d-em4.test.mjs | 1/1, 18 s, 1.0 GB RSS |
| runner.test.mjs | 4/4 |
| app `pnpm check` | 0 errors, 1 warning (EmSection.svelte:125 canvas role img, a11y) |
| app `pnpm build` | ok (adapter-static; chunk > 500 kB warning) |
| CLI s1 of the A1 B1 cases: hbm_stack, soic, ucla_si_if, fcbga bare, glass_core, cpo_module | all exit 0, balance <= 5e-12 |
| CLI cowos_r/thermal_rjc (s1-s4) | Rjc 0.0079134 (s1); s2-s4 0.0063673 / 0.0065883 / 0.0070302; 14 s, 0.53 GB |
| CLI info_os/theta_jc_tim (s1, s2) | theta-JC 0.022661 / 0.041270; 5.4 s, 0.60 GB |
| CLI xilinx_tsv_lid s3 / s2 at max_xy 2 mm, 1 cell/layer (case file of 15:00) | +338.27 um / -53.07 um; s2 von Mises 103.35 MPa [bimaterial_edge]; GMG 240 iterations |

## Independent re-derivations (pass)

- **CLT (own script, Q_i = E_i / (1 - nu_i), z from the bottom):** MA4b kappa 1.1927822 1/m, eps0 -2.137350e-3,
  sag50 3.727444e-4 m, sag_diag 7.454889e-4 m; MA4a -2.1562304; MA5b -6.525124e-2, sag -8.15640e-7 m, film stress
  2.400e8 Pa, Stoney 6.63924e-2; MA5 runnable -5.511335e-3, bow -6.200252e-5 m; Stoney (Q 180.5 GPa) 5.53440e-3.
  All equal the YAML / tier_a.py values to the printed digits.
- **TE10:** k0 = 4191.690 rad/m, beta = sqrt(k0^2 - (pi / 1 mm)^2) = 2775.006 rad/m, beta L = 8.32502 rad
  (fc 149.896 GHz); the engine's +1.06 % is the expected sign and size for first-order Nedelec at about 23 edges per
  guide wavelength.
- **q1im (elements.mjs):** 9 Wilson DOF (3 bubbles x 3 components, dP = -2 xi etc.); reference integrals of the
  bubble gradients vanish (patch test); K = Kcc - Kci Kii^-1 Kic; condensed load f_c - G^T f_i with G = Kii^-1 Kic
  (lines 198-212, 261-272); internal modes Kii^-1 (f_i - Kic u). Check run: free graded block, rotated orthotropic
  material (25, -40, 70 deg), T linear in x, y and z: max |sigma| / (E alpha dT) = 4.0e-14 (q1im), 1.4e-12 (q2s),
  4.8e-2 (q1); reactions 6e-14 N. A two-part bilayer with per-part stress-free temperatures (150 / 200 C) under
  rigid_motion gives reactions 3e-11 N and the expected sign (-9.68 um, top shrinks more).
- **q2s:** corner N = (1/8)(1 + x xa)(1 + y ya)(1 + z za)(x xa + y ya + z za - 2), mid-edge (1/4)(1 - x^2)(...),
  derivatives as coded; 3x3x3 Gauss (sqrt(3/5); 5/9, 8/9).
- **Constitutive (SPEC 12):** rotAxis active, R = Rz Ry Rx; Bond matrix sigma_g = K sigma_l with the shear-pair sum;
  D_g = K D_l K^T; thermal strain a e a^T with engineering shear. Near-incompressible soft layer (nu 0.49): q1im and
  q2s agree within 4e-4 on a 3-layer plate (no volumetric locking relative to q2s).
- **Supports:** 3-2-1 points remove the 6 rigid modes (P2 uy -> rot z, P2 uz -> rot y, P3 uz -> rot x); quarter: ux /
  uy on sym:x / sym:y plus one uz point; half crops: the 2 points on the mirror plane remove the remaining
  translation and rotation. Statically determinate as stated.
- **Warpage (post.mjs):** sign = sign(AB_max + AB_min + CD_max + CD_min) of the deviation of u_z from the diagonal
  chords, + = top convex, as R1 2.4 (source: ED-7306 search snippet only; the standard itself was not read by anyone).
  The rule uses u_z (z up), so measuring the bottom surface gives the same sign as the top. Crop: only the constant is
  fitted, so coplanarity on the quarter equals the full range.
- **EM 3D formulas:** Whitney basis, curl W = 2 grad li x grad lj, S = 4 V c_a . nu c_b, mass with
  int lp lq = V (1 + delta) / 20; global edge orientation consistent (tet vertices sorted ascending, mesh.mjs:116, and
  face keys sorted). PML s = 1 - j sigma / (w eps0) (decays for exp(+j w t)), sigma_max = -(m + 1) ln R0 / (2 eta0 L),
  Lambda as coded. Port BC n x curl E = j beta (b - a) q matches the weak form with alpha = j beta. Woodbury
  (A0 + U C U^T)^-1 with unconjugated U^T (complex symmetric); block inverses (j / beta_bar) G and N / (j beta) as coded.
  De-embedding a e^{-j beta d}, b e^{+j beta d} moves the reference plane inward by d (correct sign). IBC alpha =
  j w mu0 / Zs, Re > 0 (lossy). Thin-sheet pair admittance (1 / Zs)[coth, -csch; -csch, coth]; its kt -> 0 limit gives
  the sheet conductance sigma t. Redheffer star product and S <-> ABCD (Pozar forms) correct.
- **Rjc symmetry factor:** quarter model reports heat_in 1866.00 W (full model); (99.366 - 84.6) / 1866 = 0.007913 =
  printed Rjc. No factor-of-4 error. InFO heat_in 100.000 W, likewise.

## Audit A1 fixes (verified landed)

| A1 item | State | Evidence |
|---|---|---|
| S2 sheet Poisson | fixed | homogenize.mjs plane branch nu_xz = nu_yz = ROM; columns nu_TA = nu_AT E_t / E_a; test `homogenized Poisson convention` |
| S3 routing axis | fixed end to end | boxes.mjs emits `:x` / `:y` for signal / mixed levels; counts: cowos_l x 29, y 8, plane 13; cowos_s x 6, y 4; cowos_r x 7, y 8; emib_t x 7, y 2; fcbga x 6, y 2; info_os x 6, y 6; homogenize accepts x / y |
| S5 cubic rotation | fixed | cubicStiffnessRotZ equals mech stiffnessLab to 8e-6 Pa at 30, 45, -20 deg (C16 -12.406 / 0 / +14.107 GPa); 30 deg test exists |
| S6 snapping | fixed | spacing.mjs:32-40 complete linkage (v - c.lo <= tol), shift <= span <= tol |
| B1 box-face selections | fixed | grid/index.mjs:358-385; the six previously failing cases run s1 |
| S4 sensitivity runner | partial | see S1 and S2 below |

## Findings, ranked

### Blocking

None found.

### Significant

**S1. CD1 / CD5 spread is never computed for any mechanics result.** (owner: L3 runner, L1 CLI)
- runner/node.mjs:31 calls `runSensitivity` with L1's thermal `runCase` and no `physics`, so `physics` defaults to
  `thermal` (sensitivity.mjs:81) and only k rows are perturbed (PHYSICS_PROPS, sensitivity.mjs:15).
- Even with `physics: 'mechanics'`, thermal `runCase` passes thermo_elastic studies through as skipped
  (thermal/case.mjs:199-201); `runCaseAll` / `runMechCase` is never called from the runner.
- The CLI `--sensitivity` path uses the same wrapper (cli.mjs:112-118).
- **Failure scenario:** the Xilinx +338 um match and every warpage number are reported without the nu spread of emc,
  core_lowcte (nu 0.11 +-0.05), abf_gx, daf, tim_polymer, or the CD5 TIM CTE x1/3..x3, which CD1 / CD5 require.
- **Fix:** select the runner by study type (runCaseAll with the mech module for thermo_elastic), pass
  `physics: 'mechanics'` for those studies, and add a mechanics case to runner.test.mjs.

**S2. Asymmetric silicone nu bound is silently skipped.** (owner: L3 runner; L2 for the delta shape)
- tims_adhesives.yaml:106 (and alternative :110) carries `delta: {minus: 0.05, plus: 0.19}`; `boundsOf`
  (sensitivity.mjs:51-57) knows only `factor` and `abs`, so both rows land in `unsupported` ("no delta in the
  sensitivity block").
- The silicone placeholder is the one CD4 calls physically poor; its +0.19 bound is the one that matters.
- No admissibility guard: nu + abs >= 0.5 throws inside `stiffnessMaterialFrame` (constitutive.mjs:84) and aborts the
  whole report (no try/catch around the bound runs, sensitivity.mjs:93-98). Present values stay below 0.5 (max 0.49
  for silicone, 0.40 otherwise), so this is latent.
- **Fix:** support `{minus, plus}`, clamp nu to < 0.5 with a warning, catch per-bound failures into `unsupported`.

**S3. InFO_oS: the DevLog-012 explanation of the gap (missing TIM contact resistance) does not fit the BLT dependence.**
(owner: coordinator for DevLog-012:207; L3 / L4 for the calibration case)
- Engine (this audit): theta-JC 0.02266 (BLT 60 um) and 0.04127 (BLT 140 um) against measured 0.031 / 0.065
  (-27 % / -36.5 %) and the paper's simulation 0.033 / 0.063.
- Engine BLT slope 0.0186 C/W per 80 um equals the 1D bulk-TIM value over both dies, 80e-6 / (6.0 x 707.9e-6 m^2) =
  0.0188 C/W. The paper's slope is 0.030 (sim) / 0.034 (test), 1.6-1.8x larger. A BLT-independent contact
  resistance cannot close a gap that grows from 0.008-0.010 to 0.022-0.024 C/W.
- The same paper's Table 5 (metrics -a-m5..m12) is internally inconsistent with any single full-area bulk TIM:
  3.2 vs 6.0 W/(m K) at 60 um differs by 0.003 (sim) / 0.002 (test) C/W against a 1D 0.0124; 6.0 vs 25 differs by
  0.008 / 0.013 against 0.0107. L3's calibrated effective k 3.32 W/(m K) (fitted on the BLT pair) would predict a TIM
  A-B difference several times the reported one.
- CoWoS-R, by contrast, is consistent with a constant offset: the gap is 0.0029-0.0035 C/W over BLT 25-200 um and the
  contact-resistance share gives 0.296 x 0.0108 = 0.0032 C/W; the paper model at zero contact (0.00759) is +4.3 % from
  the engine.
- **Fix:** reword DevLog-012:207 ("both about 27 % low; neither has contact resistance") per vehicle; label the InFO
  k_eff 3.32 as a fitted parameter, not a TIM property; add the Table 5 points (m5-m12) as unused checks of the
  calibration; check the extraction of Table 5 and the TIM coverage / heater footprint (uniform volume power over the
  whole die is an assumption; localized heaters raise Tj max and steepen the BLT slope).

**S4. Tier-C von Mises target passes on a value flagged singular.** (owner: L1 target evaluation, L4 case)
- xilinx_tsv_lid -b-m4 reports "pass got 103.35 expected 115 (-10.1 %) [bimaterial_edge]" (this run). L8's own table
  shows the Gauss-point maximum rising with refinement (108.4 MPa at 2 mm, 132.6 MPa at 0.5 mm / 2 cells): the value
  is mesh dependent and unbounded.
- **Failure scenario:** a "pass" that reverses on mesh refinement; the target does not test anything.
- **Fix:** when `vm_max_gp_flag` is non-null, set status `unchecked (singular)` or evaluate a non-singular measure
  (a fixed-distance or volume-averaged stress), as SPEC 15 flags intend.

### Minor

- **M1. Accuracy of the A3 claim** (owner: L8; coordinator for SPEC). SPEC.md:328 and DevLog-012:218 say q1im equals
  q2s "within ~1e-5 on MA4b, MA4a thin layers and MA5b". The L8 table gives MA5b differences up to 4.9e-4 (0.25 mm:
  q2s +9.3e-5, q1im -4.0e-4) and MA4b q1im errors up to 3.2e-5. L8-mech.md:96 ("both within 1e-5 of the reference")
  contradicts the same table. Suggested wording: "within 5e-5 on MA4b / MA4a_thin and 5e-4 on MA5b"; plain q1 locks
  -6 % (MA6, 1 mm) to -100 %.
- **M2. Cut line on mechanics results is empty** (owner: L6). workbench.svelte.ts:305 sends `{op: 'line', axis, p}`
  without `expr`; the worker defaults to `T` (sim.worker.ts:36) and a mechanics session has `T = null`
  (post.ts `field`), so every value is NaN. `vm` is not supported by `field` either. Pass `this.pg.expr` and add `vm`.
- **M3. Log colour scale on signed fields** (owner: L6). ResultPages.svelte:88 allows `log` for uz; the shader clamps
  `max(v, 1e-30)` (FieldLayer.ts:36) while the colorbar labels the quantity `|uz|` (colorbar.ts:45). Negative values
  then all take the bottom colour and the legend disagrees with the drawing. Use |v| in the shader for log, or disable
  log for signed expressions.
- **M4. Thin-conductor single-sided face assumes H = 0 behind** (owner: L7). solver.mjs:373 uses
  j w mu0 / (Zs coth(kt)) (open back face). When the partner face is not in the domain because it touches a PEC tet or
  a PEC box wall, E = 0 behind and the admittance is coth(kt) / Zs. The two differ by about 25 % at t / delta = 1, e.g.
  a 2 um plane near 1 GHz. Identical for t >> delta.
- **M5. Port local term on evanescent fields** (owner: L7, note only). Non-modal fields at a port see j beta_bar
  (solver.mjs:379), a first-order absorbing condition, not their own decay; with `deembed_um` 0 next to a discontinuity
  this reflects higher-order fields. State a minimum port-to-discontinuity distance in SPEC 14.
- **M6. Stale numbers and wording.** DevLog-012:186 "PML 8 cells -44.5 dB" vs -41.8 dB in the current test log
  (solver changed 14:56); L8-mech.md open issue 3 and the 14:48 log line still say `cubicStiffnessRotZ` is passive
  (fixed, S5); mech/materials.mjs:23 still says "rotations of the lab frame" (A1 S5 note); thermal_rjc_calibrated.yaml:85
  still says contact resistance is "not modelled" in the calibrated case. Owners: coordinator, L8, L3.
- **M7. Study-level stress_free_C drops per_part** (owner: L8). mech/case.mjs:115 replaces
  `physics.mechanics.stress_free_C` (with per_part) by `{default}` when a study sets `stress_free_C`. Merge instead.
- **M8. Runner labels CTE bounds `status: user`** (owner: L3). sensitivity.mjs:66 (15:07): in A11 `user` means a value
  supplied by Wentao; CD5 was introduced because of exactly this mislabel. Use a run-only status or ask L2 to accept
  `template` for CTE overrides under CD5.
- **M9. Singular-corner flag over-reports** (owner: L8, note). classifyCorner (post.mjs:37-66) keys on part ids, so two
  adjacent parts of the same material (e.g. stacked layer boxes with one key) at a free edge are flagged
  `bimaterial_edge`. Conservative; key on material instead of part if the flag is used for gating.
- **M10. GMG iterations on the lidded Xilinx case grow** (owner: L1, note). 240 iterations at 1.17e5 DOF (this run,
  with the lid-adhesive knob) vs 195-209 in L8's table; cell aspect up to 3670. Within maxIter 3000; watch with E4
  process steps.
- **M11. License lines** (A1 M7, still open): no license line in 5 validation/expected scripts, 11 validation/reference
  apref modules, 15 engine tests (incl. new em3d-ports, la-wasm, la-mg), families/tools/transcribe.mjs and 10 app
  files (incl. new EmSection.svelte, EmPages.svelte, SmithChart.svelte, emResults.ts). All files marked "Ported from"
  carry the eb97f96 header.
- **M12. Each Compute clones package3d.json (2.5 MB) into the worker** (workbench.svelte.ts compute, `data: this.p3d`;
  owner: L6, performance only).

## Physics plausibility of the DevLog-012 end-to-end results

- **CoWoS-R Rjc 0.00791 vs 0.0108:** consistent with the inputs. Zero contact resistance, model within +4.3 % of the
  paper's zero-contact model, gap constant over BLT (see S3). The calibrated variant's R'' = (0.01082 - 0.00759) x
  4 x 332.8 mm^2 = 4.30e-6 m^2 K/W (metrics -d-m18, -d-m12) is arithmetically right. The engine BLT slope (0.00154 C/W
  over 175 um) equals 1D over the SoC area (0.00153) and is 1.5x the paper's (0.00100, figure-read values).
- **InFO_oS theta-JC:** see S3.
- **Xilinx no lid +338 um vs +335.28 um (-b-m2):** reproduced (+338.27 um, 0.9 %). Sign consistent: the 11 ppm/K core
  under 2.6-3 ppm/K Si shrinks more on cooling from 150 C, giving a dome, which is JEITA + and the paper's positive
  ("negative = smiley face", metrics notes). DB values -b-m2 335.28, -b-m3 162.56, -b-m4 115 MPa match L8's notes.
  L8's "plausibility, not validation" label is right (nu, build-up and homogenization are template / ROM).
- **Xilinx lidded sign miss (-53.07 um now, -63.8 earlier, vs +162.56):** the explanation is consistent with the
  inputs. A 1 mm Cu lid (130 GPa, 17 ppm/K) bonded through a stiff perimeter foot to an 18.9 GPa / 11 ppm/K core
  dominates the membrane stiffness of the stack and shrinks more on cooling, so the top goes concave. A compliant lid
  adhesive, a cavity / foot geometry or a lower lid stress-free temperature each reduce that pull. A sequential
  attach at a temperature near 150 C alone would not change the single-step result, so adhesive compliance and foot
  geometry are the more likely missing inputs. E4 (process sequence) can test the attach-temperature part.
- **No unit or symmetry-factor error found** in Rjc, theta-JC, quarter-model power or warpage.

## Rule compliance (files changed since A1)

- No emoji: scripted scan of 401 files (engine, sims, validation, app/src/lib/sim, app/src/routes/sim, lanes,
  DevLog-012, config/sim), 0 hits.
- No absolute local paths: grep for user-home, temp and system prefixes in engine/, sims/, validation/, app/src/,
  DevLog/, config/sim/: only URL path segments in research notes and quoted grep patterns in audit files.
- No ~/Downloads use (only config/sim/manual_downloads.md) and no private-context names (all "lambda" hits are
  math or Python).
- Material data: 460 numeric leaves, 0 without basis / source / note on the leaf or an ancestor (scripted).
- Case YAML: every params / override leaf has status and ref or note. Fixed-temperature BCs (25 / 40 C) and template
  powers (10 W, 100 W, 500 W) have no inline comment on the line, but each is labelled in the case `assumptions`
  (checked: fcbga bare, 50mm_quarter, cowos_l, hbm_stack, emib_t).
- ISO dates in the new files read; no "current / recent / now" wording found in data.
- Process note: one read-only one-liner listing metrics rows ran with the system `python3 -I`, against the uv-only
  rule; no files written. Everything else used node.

## Recommended order

1. S1 and S2 (mechanics spread is a CD1 requirement and the silicone bound is the reason CD4 exists).
2. S3 (DevLog wording; InFO calibration labelling and the Table 5 cross-check).
3. S4 (no pass on singular maxima).
4. M1, M6 (documentation numbers), then M2-M5, M7-M12.
