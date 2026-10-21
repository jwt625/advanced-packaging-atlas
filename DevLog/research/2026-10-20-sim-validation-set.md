---
title: Validation set for the thermal and thermo-mechanical solvers (tiers A-D), with EM pointers
date: 2026-10-20
status: research report (nothing built, nothing run; all numbers below are formulas, published targets, DB rows, or own arithmetic)
parent: DevLog/DevLog-010-multiphysics-sim-harness-proposal.md
pattern: eo-modulator-atlas DevLog-023 "Validation reference set" + DevLog-028 L-REF (isolated reference lane)
author: Claude (research subagent), for Wentao Jiang
---

# Sim validation set: thermal and thermo-mechanical

## Summary

- Four tiers, same as the EO simulator: A analytic, B published benchmark / cross-solver, C paper-simulated, D paper-measured.
  Compare like with like: a paper's own FEM number (basis `simulated`) is the first literature tier because it removes
  fabrication spread, process history and moire noise.
- Tier A: 16 closed-form cases, each with a defined test geometry and an expected number computed here (own arithmetic,
  script kept outside the repo; formulas and inputs listed so anyone can redo it). They cover element order, thin-layer
  locking, interfaces, anisotropy, rigid-body handling, convection/fin BCs, transient time stepping.
- Tier B: NAFEMS LE1, LE10, LE11, T1, T2, T3, T4 have targets that are freely readable through vendor verification
  manuals (Abaqus, Altair OptiStruct) and open re-implementations (FeenoX, FEATool); the NAFEMS documents themselves are
  paid (R0006 Background to Benchmarks, P18, P02 thermal-stress set). COMSOL Application Gallery models relevant to
  packaging exist (layered plate 273, flip-chip thermal cycle 131051, solder-ball warpage 124581, surface-mount package
  847) but publish few numeric results; they are useful as user-run cross-solver decks (Wentao has COMSOL).
  Open-source runnable references: FEniCSx (Bleyer comet-fenicsx thermoelasticity tours), scikit-fem (already used in
  the EO L-REF lane), FeenoX (NAFEMS LE/thermal inputs public), CalculiX (NAFEMS T2/T3 community runs).
- Tier C/D from our DB (metrics 913 warpage / 586 thermal / 459 mechanical rows): warpage is the strongest literature
  class (729 absolute-unit rows: 565 measured, 145 simulated). Best reproducible cases are the JOINT2 consortium 2.5D
  papers (Si interposer on organic substrate, CoWoS-S-like), which disclose layer thicknesses plus E / CTE alpha1 / alpha2
  / Tg tables, and the 2011 Xilinx TSV-interposer ABAQUS model. Thermal: the TSMC CoWoS-R thermal TV (Rjc, Tj, Tc,
  calibrated FloTHERM model with measured vs simulated within 1 C) and the MediaTek InFO_oS ThetaJC sim-vs-test table
  are the best targets; most thermal rows need a cold-plate or heat-sink BC the papers do not fully state.
  Stress is weak: of 181 mechanical stress/strain rows, only 47 carry MPa/GPa; 134 are normalized/relative.
  Max-stress values from paper FEMs sit at bimaterial corners (singular) and are mesh dependent: use them only as
  order-of-magnitude checks.
- No paper in the top lists discloses Poisson ratios, viscoelastic EMC/underfill data, or a complete BC set. Every
  Tier C/D case therefore carries an explicit `assumptions` list (class `project_inference`) and a `missing` list, as
  the EO configs do with `provenance` / `missing`.
- Effort: about 200 h (range 150-260 h) to curate the full set (A 30 h, B 45 h, C/D 105 h, protocol + audits 25 h);
  a minimum viable set (A all, B 4, C 6) is about 70 h.

## Tier table

| Tier | Cases (proposed IDs) | Quantities | Reference source | Freely accessible numbers | Gate |
|---|---|---|---|---|---|
| A thermal | TA1-TA6: 1D multilayer R, interface R, spreading (Lee 1995), fin, semi-infinite transient, linear-T patch | T, R_th, q, T(t) | closed form (this report) | yes | rel err < 1e-3 (P2, converged), observed order |
| A mech | MA1-MA9 + MA5b: free expansion, constrained bar, Timoshenko, CLT N-layer, Stoney, thin-film locking, free-plate linear gradient, Lame TSV, orthotropic free expansion, Suhir far-field force | u, kappa, sigma | closed form (this report) | yes | rel err < 1e-3 global, < 1e-2 point stress |
| B NAFEMS | LE1, LE10, LE11, T1, T2, T3, T4 | sigma at point, T at point | NAFEMS TNSB Rev. 3 (1990) via Abaqus/Altair/FeenoX/FEATool pages | targets yes; geometry partly figure-only | within 1 % after refinement; report coarse/fine like vendors |
| B cross-solver | XB1-XB5 package-like decks (bilayer strip 3D, CLT 3-layer square, TSV unit cell, die-on-lid spreading, two-die power map) | kappa, w_max, sigma(r), T_max | FEniCSx / scikit-fem / CalculiX (local uv), COMSOL (Wentao) | after runs | < 0.5 % global, < 2 % stress away from singularities |
| C paper simulated | 6-10 per category (lists in section 3) | warpage(T), Tj, Rjc, ThetaJC | DB metrics `basis=simulated` | DB rows + locators | warpage +-10 % or +-10 um; dT_j +-5 % ; Rth +-5 % (proposed) |
| D paper measured | 6-10 per category | shadow-moire warpage(T), Tj, Rjc | DB metrics `basis=measured` | DB rows + locators | sign/shape, +-25 % or +-20 um; Tj rise +-10 % (proposed) |

Tolerances in the last column are proposals (assumptions), not literature values; see section 4.3.

## EM (brief; another lane covers it)

- Tier A: coax TEM Z0 = (eta0 / 2 pi sqrt(eps_r)) ln(b/a); rectangular waveguide TE10 cutoff fc = c / (2 a sqrt(eps_r));
  stripline and microstrip closed forms (Hammerstad-Jensen); CPW by conformal map (EO repo already has an own AGM K(k));
  lossless passivity |S11|^2 + |S21|^2 = 1 and reciprocity S21 = S12 as structural checks; PML reflection vs layer count.
- Tier B: openEMS and Palace example decks; IEEE P370 fixture data for de-embedding checks (verify availability).
- Tier C/D: 961 electrical metric rows (IL/RL/xtalk per length) need the same completeness scoring as below.

---

## 1. Tier A: analytic and closed-form cases

Material set used for all Tier A numbers (synthetic, isotropic, stated here so expected values are reproducible; not a
claim about real material data):

| Key | E (GPa) | nu | alpha (ppm/K) | k (W/m K) | rho (kg/m3) | cp (J/kg K) |
|---|---|---|---|---|---|---|
| si_iso | 130 | 0.28 | 2.6 | 148 | 2330 | 705 |
| cu | 110 | 0.34 (0.35 in MA7) | 17 | 390 | - | - |
| uf (underfill) | 8 | 0.35 | 30 | - | - | - |
| sub (organic substrate, effective) | 25 | 0.30 | 15 | - | - | - |
| tim | - | - | - | 5 | - | - |
| al (fin) | - | - | - | 200 | - | - |

Biaxial modulus Q = E / (1 - nu): si_iso 180.56 GPa, cu (nu 0.34) 166.67 GPa.

### 1.1 Mechanical cases (thermo-elastic, linear, small strain)

| ID | Case | Formula | Test geometry and BC | Expected (own arithmetic) | What it tests |
|---|---|---|---|---|---|
| MA1 | Uniform-temperature free expansion | eps_ij = alpha dT delta_ij, sigma = 0 | si_iso cube 10 mm, dT = +100 K, 3-2-1 constraint (no RBM) | eps = 2.6e-4; u at 5 mm from fixed point = 1.30 um; sigma = 0 (report max abs sigma / (E alpha dT) < 1e-10) | thermal load assembly, reference temperature handling, RBM suppression does not induce stress |
| MA2 | Constrained bar / film / block | uniaxial -E alpha dT; biaxial -E alpha dT / (1 - nu); triaxial -E alpha dT / (1 - 2 nu) | cu, dT = +100 K; u_x = 0 at both ends (uniaxial); u_x = u_y = 0 on sides (biaxial); all normal u = 0 (triaxial) | -187.0 MPa; -283.3 MPa; -584.4 MPa | sign convention, constitutive matrix with thermal strain, Poisson coupling, near-incompressible sensitivity (repeat with nu = 0.49: volumetric locking test for P1) |
| MA3 | Timoshenko bimetal strip | kappa = 6 (a2 - a1) dT (1 + m)^2 / ( h [3 (1 + m)^2 + (1 + m n)(m^2 + 1/(m n))] ), m = t1/t2, n = E1/E2, h = t1 + t2 (Timoshenko 1925) | si_iso 0.5 mm + cu 0.5 mm, strip L = 10 mm, width 1 mm (beam: plane stress, uniaxial), dT = -100 K | abs(kappa) = 2.1562 1/m (R = 0.4638 m); sag over L: kappa L^2 / 8 = 26.95 um; Cu side concave | curvature from layer mismatch; strip vs plate (use Q = E/(1-nu) for a wide plate) |
| MA4 | Classical lamination theory (CLT), N isotropic layers, free plate, uniform dT | [A B; B D][eps0; kappa] = [N_T; M_T]; A = sum Q_i t_i, B = sum Q_i (z_i+1^2 - z_i^2)/2, D = sum Q_i (z_i+1^3 - z_i^3)/3, N_T = sum Q_i alpha_i dT t_i, M_T = sum Q_i alpha_i dT (z_i+1^2 - z_i^2)/2; sigma_i(z) = Q_i (eps0 + kappa z - alpha_i dT) | (a) 2-layer si_iso 0.5 + cu 0.5 mm with equal nu 0.28 (reduces exactly to MA3 with Q): kappa 2.1562 1/m, stresses Si 67.4 / -127.3 MPa (bottom/top), Cu 112.3 / -52.4 MPa. (b) 3-layer package-like: sub 1.0 mm / uf 0.05 mm / si_iso 0.775 mm (bottom to top), stress-free 150 C, dT = -125 K, 50 x 50 mm | (b) kappa = 1.1928 1/m (R = 0.838 m), eps0 = -2.137e-3 (at z = 0, bottom); sag over 50 mm edge: 372.7 um; over 70.71 mm diagonal: 745.5 um; dome (die side convex) after cooling; Si stress -101.1 MPa at UF interface, +65.8 MPa at top; sub -9.4 / +33.2 MPa | the core warpage gate: multi-layer, thin compliant layer, large-plate interior; compare at plate centre region (edges have free-edge effects) |
| MA5 | Stoney (thin film on thick substrate) | sigma_f = Q_s h_s^2 kappa / (6 h_f); kappa = 6 sigma_f h_f / (Q_s h_s^2) (Stoney 1909) | Si 775 um wafer, 300 mm, Q_s = 180.5 GPa (Si(001) biaxial, Brantley 1973), film 1 um, sigma_f = 100 MPa (intrinsic, as initial stress or eigenstrain) | kappa = 5.534e-3 1/m (R = 180.7 m); centre-to-edge bow at r = 150 mm: kappa r^2 / 2 = 62.3 um | initial stress / eigenstrain input (needed for cure shrinkage, BEOL and PI film stress), extreme aspect ratio (300 mm / 1 um) |
| MA5b | Thin film: Stoney vs CLT | as MA4 / MA5 | si_iso 775 um + cu 5 um, dT = -100 K (film stress Q_f (a_s - a_f) dT = +240 MPa) | Stoney kappa 0.06639 1/m, CLT 0.06525 1/m (Stoney 1.7 % high: neglects film stiffness); sag L = 10 mm 0.83 um | thin-layer locking: 5 um layer in a 10 mm plate (aspect 2000) with 1 element through the film; linear tets lock, P2 / hex20 / solid-shell do not |
| MA6 | Free plate, linear temperature through thickness | T(z) linear -> thermal strain compatible -> sigma = 0 exactly in 3D elasticity; kappa = alpha dT_z / h | si_iso 50 x 50 x 0.775 mm, T = 25 C bottom, 35 C top (dT_z = 10 K), free | kappa = 0.03355 1/m; sag over 50 mm 10.5 um; sigma = 0 everywhere | exactness for linear fields (P1 must be exact), coupling T -> u on the same mesh, absence of spurious stress |
| MA7 | Lame / plane-strain cylindrical inclusion (TSV) | inclusion radius a (Cu, 1) in infinite matrix (Si, 2), eps_zz = 0: p = [(1+nu1) a1 - (1+nu2) a2] dT / [ (1+nu1)(1-2 nu1)/E1 + (1+nu2)/E2 ]; Cu: sigma_rr = sigma_tt = -p; Si: sigma_rr = -p (a/r)^2, sigma_tt = +p (a/r)^2 (own derivation; equal-constant limit gives E da dT / (2 (1 - nu)) as in Ryu et al. 2011) | cu (E 110, nu 0.35) in si_iso, a = 5 um, matrix radius 100 um (= 20 a, error ~ (a/R)^2 = 0.25 %), dT = +100 K, 3D slab with u_z = 0 on both faces | p = 145.0 MPa; Si at r = a: sigma_rr = -145.0, sigma_tt = +145.0 MPa; at r = 2a: +-36.3 MPa; equal-constant check (Si constants) 130.0 MPa | interface stress continuity (sigma_rr continuous, sigma_tt jumps), curved interface meshing, 1/r^2 decay; 3D near-surface TSV is not closed form (use Tier B) |
| MA8 | Orthotropic free expansion | eps_i = alpha_i dT, sigma = 0 | cube, alpha = (11, 11, 16) ppm/K (substrate core values as in ectc.2011.5898527 Table 2, p.2), dT = +100 K | eps = (1.1e-3, 1.1e-3, 1.6e-3), sigma = 0 | anisotropic CTE tensor and frame rotation (repeat with the material frame rotated 30 deg) |
| MA9 | Bilayer far-field force and edge shear (Suhir) | interior force T_inf = da dT / lambda, lambda = sum (1 - nu_i)/(E_i h_i) + (h1 + h2)^2 / (4 D); edge shear tau(x) = (da dT k / lambda) sinh(kx)/cosh(kl), k = sqrt(lambda / kappa_int), kappa_int = h1/(3 G1) + h2/(3 G2) (Suhir 1986/1989; structure as cited by secondary sources; coefficients UNVERIFIED against the primary) | MA3 geometry | T_inf must equal CLT layer force (integral of sigma over Cu thickness from MA4a); tau_max not used as a hard target | the shear-lag edge zone; FE at the free edge has a Bogy-type singularity, so compare T(x) and integral of tau, never the corner node |

Notes:
- Sign and orientation: z up, layer 1 at the bottom. Cooling makes the higher-CTE layer the concave side.
- MA4 is exact for the plate interior (Kirchhoff, equibiaxial, isotropic layers); a 3D FE result differs near free edges
  over a distance of order the total thickness. Compare kappa from a quadratic fit of w(x, y) over the central 50 %.
- Large-deflection check: for the 50 mm plate in MA4b, sag 0.37 mm vs thickness 1.83 mm (ratio 0.2): geometric
  nonlinearity begins to matter for panels and 100 mm+ substrates; add MA4c (same stack, 120 mm, expect bifurcation
  from spherical to cylindrical shape in the nonlinear solver; no closed-form target, Tier B only).

### 1.2 Thermal cases (steady and transient conduction)

| ID | Case | Formula | Test geometry and BC | Expected (own arithmetic) | What it tests |
|---|---|---|---|---|---|
| TA1 | 1D multilayer resistance with convection | R = sum t_i / (k_i A) + 1/(h A) | 10 x 10 mm column, bottom flux 100 W, sides adiabatic: si_iso 0.775 mm, tim 50 um, cu 2 mm, top h = 1e4 W/m2 K, T_amb = 25 C | R_Si 0.05236, R_TIM 0.1000, R_Cu 0.05128, R_conv 1.000 K/W; R_tot 1.2036 K/W; T_bottom = 145.36 C | piecewise k, Robin BC, energy balance (heat out through h equals 100 W) |
| TA2 | Contact / interface resistance | jump dT = R_c'' q'' | TA1 with R_c'' = 1e-5 m2 K/W at TIM/Cu (R = 0.1 K/W) | T_bottom = 155.36 C; jump 10.0 K | thin-layer or interface element (TIM BLT and contact R, as used in the CoWoS-R calibration) |
| TA3 | Spreading resistance, centred source on a plate with convective back face (Song-Lee-Au 1994, Lee-Song-Au-Moran 1995) | a = sqrt(A_s/pi), b = sqrt(A_p/pi), eps = a/b, tau = t/b, Bi = h b / k with h = 1/(R0 A_p), lambda_c = pi + 1/(sqrt(pi) eps), phi_c = (tanh(lambda_c tau) + lambda_c/Bi) / (1 + (lambda_c/Bi) tanh(lambda_c tau)), psi_max = eps tau/sqrt(pi) + (1 - eps) phi_c / sqrt(pi), psi_avg = (1 - eps)^1.5 phi_c / 2, R_sp = psi / (sqrt(pi) k a) | (a) Electronics Cooling 1998 example: Al k 200, base 100 x 100 x 1.3 mm, source 25 x 25 mm, R0 = 1.0 K/W. (b) die-on-lid: 25 x 25 mm source, cu 50 x 50 x 2 mm, h = 5000 W/m2 K | (a) R_sp,max = 0.657 K/W, R_sp,avg = 0.504 K/W; article states 0.66 K/W (central source), which confirms the formula as written here. (b) R_sp,max = 0.0804, R_sp,avg = 0.0491 K/W | 3D spreading, source-edge flux concentration, Robin back face. The formula maps circular-equivalent geometry, so the FE square-on-square result differs slightly; Simons 2004 reports agreement of the approximation with the exact series; use the exact series (Yovanovich) for a tight gate if needed |
| TA4 | Straight fin with convective tip | q = sqrt(h P k A_c) theta_b [sinh mL + (h/mk) cosh mL] / [cosh mL + (h/mk) sinh mL], m = sqrt(h P / (k A_c)) (Incropera, Table 3.4) | al, t = 1 mm, w = 10 mm, L = 20 mm, h = 50 W/m2 K | m = 23.45 1/m, mL = 0.469, q/theta_b = 0.02092 W/K (adiabatic tip 0.02052 W/K), efficiency 0.930 | convection on many faces, heat sink building block, 1D vs 3D fin |
| TA5 | Semi-infinite transient (step surface temperature; constant flux) | theta = erf(x / (2 sqrt(alpha t))); constant flux: T_s - T_i = 2 q'' sqrt(alpha t / pi) / k | si_iso, alpha = 9.01e-5 m2/s; T_i = 25 C, T_s = 125 C at x = 0; point x = 0.5 mm, t = 1 ms. Flux case q'' = 1e6 W/m2 | T(0.5 mm, 1 ms) = 48.88 C (theta = 0.7612); flux case surface rise 2.289 K at 1 ms | time integrator (backward Euler O(dt), Crank-Nicolson / BDF2 O(dt^2)), mass matrix lumping, domain depth > 4 sqrt(alpha t) = 1.2 mm |
| TA6 | Linear temperature patch and MMS | T = a + b x + c y + d z reproduced exactly by P1 on distorted meshes; MMS see section 4 | any mesh, Dirichlet from T exact | error at round-off | assembly correctness, distorted elements, anisotropic k (rotate k tensor) |

---

## 2. Tier B: published benchmarks and runnable references

### 2.1 NAFEMS standard benchmarks (TNSB Rev. 3, October 1990; background in R0006, 1993)

R0006 lists LE1-LE11 and T1-T4 only (no T5). The thermal-stress set (bimetallic strip under uniform thermal load, pipe
under radial thermal load, plate with circular hot spot, torus) is in P02 / P18 (paid). Targets below are read from
vendor verification manuals and open implementations, which are free to read.

| ID | Problem | Material | Load / BC | Target | Free source of target | Geometry access | Relevance |
|---|---|---|---|---|---|---|---|
| LE1 | Elliptic membrane, plane stress | E 210 GPa, nu 0.3 | 10 MPa outer edge tension; symmetry | sigma_yy at D = 92.7 MPa | FeenoX mechanical examples (computes 92.7011) | FeenoX repo `nafems-le1.geo` | stress recovery at a curved boundary, element distortion |
| LE10 | Thick plate, normal pressure (3D) | E 210 GPa, nu 0.3 | 1 MPa on top face | sigma_yy at D = -5.38 MPa | Abaqus Benchmarks LE10 (C3D20 coarse -6.72 / fine -5.64 MPa) | FeenoX (STEP); Abaqus figure | 3D stress at an edge point; shows how much hex20 coarse meshes miss (25 %) |
| LE11 | Solid cylinder/taper/sphere, temperature load | E 210 GPa, nu 0.3, alpha 2.3e-4 /C | T = sqrt(x^2 + y^2) + z (FeenoX); Abaqus page renders (x^2 + y^2) + z: verify against figure; symmetry planes + face HIH'I' fixed | sigma_zz at A = -105 MPa | Abaqus LE11 (C3D20 fine -103.26 MPa, -1.7 %; C3D20R fine -99.60), Altair OS-V 0070, CAST3M test page, FeenoX (-105.04) | FeenoX repo `nafems-le11.msh` | the canonical 3D thermal-stress gate with a spatially varying T |
| T1 | Membrane with hot spot, plane stress | E 100 GPa, nu 0.3 | alpha T = 1e-3 inside hot spot, 0 outside; quarter model | sigma_yy at D = 50.0 MPa | Abaqus T1 (CPS4 50.94, CPS8 51.53, CPS4R 23.65 MPa); Altair OS-V 0100 (Quad4 45.51) | dimensions in figure only (Abaqus, Altair): obtain from FeenoX/Code_Aster inputs or R0006 (paid) | stress from a discontinuous thermal strain (die hot spot); exposes reduced-integration failure |
| T2 | 1D steady conduction with radiation | k 55.6 W/m C | T_A = 1000 K; end B radiates to 300 K, emissivity 0.98; L = 0.1 m | T_B = 927 K | Abaqus T2 (all elements exact), COMSOL heat_radiation_1d, CalculiX forum (C3D20 927.004 K) | yes (1D) | nonlinear BC; low priority for packaging (radiation small vs liquid cooling) |
| T3 | 1D transient, sinusoidal end temperature | k 35.0 W/m C, cp 440.5 J/kg C, rho 7200 kg/m3 | T = 0 at t = 0; T = 0 at one end; other end 100 sin(pi t / 40) C | T at x = 0.08 m, t = 32 s = 36.60 C | Altair OS-V 0110 | bar length 0.1 m (UNVERIFIED here; not on the fetched page) | transient gate with time-varying Dirichlet (reflow profile surrogate); NAFEMS notes a revised T3 exists: check revision |
| T4 | 2D steady conduction with convection | k 52.0 W/m C | 0.6 x 1.0 m plate; bottom 100 C, left insulated, right and top h = 750 W/m2 C to 0 C | T at E (0.6, 0.2) = 18.3 C | Altair OS-V 0120 (Quad4 17.77, Quad8 17.10 C), FEATool heattransfer4 | FEATool states geometry | convective BC accuracy; note vendor coarse results are 3-8 % low: a good refinement-study example |

Additional public thermo-elastic references:
- FeenoX orthotropic free expansion (ASME TE-2 data) and Veeder finite cylinder (alpha 1e-5): both in FeenoX examples;
  Veeder is the closest classical analogue to a short TSV/pillar under a radial T field.
- Abaqus Benchmarks Manual and Altair verification pages publish element-by-element tables; the same coarse/fine
  reporting format should be used for our engine.

### 2.2 COMSOL Application Gallery (cross-solver decks; Wentao runs them)

| App ID | Model | Physics | Public numeric result | Use |
|---|---|---|---|---|
| 273 | Thermal Stresses in a Layered Plate | 2D plane strain, 3 layers: carrier 2 mm (E 215 GPa, nu 0.3, alpha 6e-6), substrate 10 mm (E 130, nu 0.28, alpha 3e-6), coating 2 mm (E 70, nu 0.17, alpha 5e-7); width 20 mm; stress-free 800 C, cool to 150 C, activate carrier stress-free, cool to 20 C; rigid motion suppression | figures only (sigma_x plots, warping); no tabulated values in the 6.4 PDF | process-sequence activation (die attach / underfill cure / lid attach are the same pattern); compute our own CLT-by-stage reference (2 stages of MA4) |
| 131051 | Thermal Cycle Test of a Flip-Chip Device | chip/bumps/underfill stress, warpage, viscoplastic solder | not checked beyond the page summary | Tier B for viscoplastic solder later; out of scope for linear phase |
| 124581 | Optimization of the Solder Ball Array to Minimize Chip Warpage | BGA warpage, ball placement optimization | not checked | warpage with discrete joints; cross-solver after phase 1 |
| 847 | Heat Transfer in a Surface-Mount Package for a Silicon Chip | conduction + convection, thin-layer ground plane | max Si temperature 47.7 C (documentation) | Tier B thermal with a published number; also tests a thin-layer conduction feature |
| 74251 | Bimetallic Strip in Airflow | Cu/Fe 100 mm x 0.5 mm strips, FSI + thermal expansion | not checked | only the solid part (MA3-like) is relevant |

The .mph files need a COMSOL account; the PDFs are free. COMSOL documentation text is licensed: cite parameters, do not copy.

### 2.3 Open-source runnable references (to run later in an isolated `validation/` uv project, as in EO L-REF)

| Package | Relevant example | What it gives us | Notes |
|---|---|---|---|
| FEniCSx (dolfinx) | Bleyer, comet-fenicsx: "Linear thermoelasticity (weak coupling)", "Thermo-elastic evolution problem (full coupling)", "Isotropic and orthotropic plane stress elasticity" | P1/P2 thermo-elastic reference for XB1-XB5 | conda/pip wheels for dolfinx: check uv installability before planning on it; a forum thread reports divergence in a full-coupling variant |
| scikit-fem | gallery: Poisson / 3D Poisson, 3D linear elasticity, elastic eigenproblem | pure-Python P1/P2 tets and hexes; thermal strain is a few lines of own forms | already proven in the EO L-REF lane (scikit-fem 12.0.2 + gmsh wheel + pyamg); lowest-risk choice |
| FeenoX | NAFEMS LE1, LE10, LE11, orthotropic free expansion, Veeder cylinder; thermal examples | ready inputs + meshes for the Tier B NAFEMS set | C binary; not a uv package (download/build is an install step: ask first) |
| CalculiX (ccx) | community NAFEMS T2/T3 runs (forum), C3D20 / C3D20R thermal-stress | Abaqus-like element zoo for locking studies | binary install; ask first |
| Code_Aster, Elmer | validation manuals include NAFEMS-type thermal and thermo-mechanical tests | additional cross-checks | test-case names not verified in this round |

Proposed package-like cross-solver decks (no published numbers; reference = two open solvers agreeing after Richardson
extrapolation, then COMSOL by Wentao):

| ID | Deck | Output | Why |
|---|---|---|---|
| XB1 | 3D bilayer strip MA3 with 1 mm width and 10 mm width | kappa vs width (beam to plate transition) | quantifies the beam vs plate correction used in MA3/MA4 |
| XB2 | MA4b 3-layer square, 50 mm and 120 mm, linear and geometrically nonlinear | w(x, y), kappa centre, edge zone length | warpage gate for panel-size bodies |
| XB3 | TSV unit cell: Cu 10 um dia x 100 um in Si, free top surface, dT = -250 K | sigma near surface, Cu protrusion | near-surface 3D field not available in closed form |
| XB4 | Die-on-lid spreading (TA3b geometry with TIM layer) | T_max, R_th | links TA1 + TA3 |
| XB5 | Two dies on interposer, unequal powers, cold plate h | T_max per die, ThetaJC per JEDEC definition | superposition and multi-source power maps |

---

## 3. Tier C/D: literature cases from the DB

### 3.1 Method (read-only, own scratch scripts outside the repo, run with `uv run --no-sync python -I`)

- Joined metrics -> test_vehicles -> stack_layers / components / interconnects -> papers.
- Kept rows with absolute units (warpage um/mm; thermal C, C/W, K/W, C-mm2/W, mm2K/W; mechanical MPa/GPa) and a value.
- Completeness score (0-6.5): outline present (package/interposer/substrate x,y or component x,y) +1; fraction of stack
  layers with thickness (0-1); fraction with material (0-1); material properties disclosed (layer `properties` filled, or
  property-unit metrics, or a property table in text.md) +1; temperature condition on the metric +1; numeric result +1;
  both measured and simulated rows on the same TV +0.5.
- Then manual pass over text.md of top candidates to find model property tables (caption scan for "material
  properties" and inline E/CTE tables). Several tables are image-only in text.md (noted below).
- Heuristic caveat: "C" unit rows include Tg and TGA temperatures (e.g., estc60143.2024.10712019); these were removed by hand.

Row counts: warpage 913 rows, of which 729 absolute (565 measured, 145 simulated, 16 unspecified) and 184 relative.
Mechanical stress/strain rows 181: 47 in MPa/GPa, 134 normalized or relative.

### 3.2 (a) Warpage vs temperature and process step

| Rank | TV (paper) | Build | Target rows (metric_id: value) | Basis | Locator | Properties disclosed | Missing inputs |
|---|---|---|---|---|---|---|---|
| 1 | ectc51909.2023.00155-d, -a (JOINT2, ECTC 2023) | 50 x 50 mm Si interposer (200 um), Die A 21.9 x 21.9 + 4 Die B 10 x 8 (675 um), CUF, compression EMC 698 um; FEM quarter model | -d-m1: -189 um (original, 260 C); -a-m7: -47 um (filler dies, 260 C); stress-free 150 C; measured bare substrate -a-m3 91 um, -b-m3 63 um at 20 C | simulated (MARC, 20-node hex, EMC/CUF/DAF viscoelastic) | p.5 Fig. 9; p.5 Sec. III.C; Table 8 (image-only in text.md; values captured in stack_layers.properties: EMC E1 18 GPa / E2 0.4 GPa, CTE a1 7; CUF E1 8.9 GPa, a1 26 / a2 104; insulator E 32 GPa a1 65; Cu E 100 GPa a 17; Si E 170 GPa a 3) | E1/E2, alpha1/alpha2, Tg for EMC, CUF, insulator, Cu, Si | Poisson ratios; viscoelastic (Prony) data; filler-die layout; BCs of the quarter model; "warpage" definition (peak-to-valley vs signed) |
| 2 | ectc51529.2024.00155 (JOINT2, ECTC 2024) | 2 Die A 20 x 20 + 8 Die B 10 x 8 on 42 x 46 mm Si interposer (200 um), 120 x 120 mm 8-2-8 substrate, SUS430 stiffener | FEM substrate+stiffener at 260 C: -g-m1 263, -a-m23 247, -b-m4 216, -h-m1 317, -c-m6 282, -d-m4 249 um. Measured shadow moire: interposer module -a-m8 -67 um (23 C), -a-m9 +71 um (243 C); substrate with stiffener -a-m16..m19: 485 / 135 / 65 / -85 um at 30 / 148 / 222 / 243 C; bare substrate -e-m1..m4: -330 / 260 / 645 / 770 um | simulated + measured | p.5 Fig. 8, 11, 12; p.6 Fig. 13; p.3 Table IV | Table IV: Si 167 GPa / 3.2; Cu 100 / 17; solder 37.4 / 21.7; SR 4.3 / 43.1 / 91.2, Tg 151; dielectric 3.2 / 65; DAF; top CUF 6.6 / 22 / 100, Tg 166; bottom CUF 6.9 / 20 / 93, Tg 160; EMC 13 / 7 / 25, Tg 160; core A 33.5 / 5.9 / 2.5, Tg 314; core B 33 / 6.9 / 0.1, Tg 293 | Poisson; build-up/core thicknesses; stiffener width/thickness detail; adhesive; sign convention of moire |
| 3 | ectc.2011.5898527-b (Xilinx, ECTC 2011) | 28 nm FPGA (4 slices) on 25 x 31 x 0.1 mm Cu-TSV Si interposer, 42.5 / 45 mm package, Cu lid 1 mm, low-CTE core 0.8 mm; ABAQUS quarter model | warpage at 25 C, stress-free 150 C: -m1 -60.7 um (CoC after uF UF), -m2 335.3 (after C4 UF, 42.5 mm), -m3 162.6 (after lid, 42.5 mm), -m5 205.7 and -m7 113.0 (45 mm, two lid variants); die max von Mises -m4 115, -m6 127, -m8 147 MPa | simulated | p.3 Table 3; p.3 Fig. 3; Table 2 p.2 (inline text) | Table 2 at RT: core 18.9 GPa, CTE xy 11 / z 16; Si 150 / 3; uF UF 6 / 38; C4 UF 8.5 / 32; Cu 130 / 17; SM 2.9 / 68; SnAg 51 / 22.4; TIM1 5.8e-3 GPa; eutectic 31.5 | Poisson; die and UF thicknesses; lid adhesive and footprint; Tg / alpha2; build-up stack. CoWoS-S-like topology, closest public analogue |
| 4 | ectc51529.2024.00322-d, -e, -f (JOINT2, ECTC 2024) | 12-inch Si wafer 775 um with 52 / 68 / 92 Si dies 20 x 25 x 775 um (+ Die-B), DAF 20 um, EMC-B; wafer-level process sequence | per step, measured vs FEM: e.g. -d-m2 -1170 vs -d-m3 -990 um (after PMC); -d-m14 -2290 vs -d-m15 -2110 um (after debond); full sequence for -e, -f | measured (Akrometrix AXP2.0) + simulated (MARC 2023.2, 1/4 model, EMC viscoelastic) | p.6 Fig. 11; p.5 Sec. III.C | EMC filler 85 wt %, Tg 185 C, CTE (partial, in layers) | EMC thickness after grind, viscoelastic data, passivation film stress, glass carrier properties; process-history modeling (activation) required |
| 5 | ectc51687.2025.00027-a, -b (JOINT2, ECTC 2025) | 120 x 120 mm 2.5D, 42 x 46 mm Si interposer 100 um, dies 675 um, substrates A/B (CTE 11.97 / 12.81 ppm/C), Cu or SUS430 stiffener | coplanarity -a-m1..m3: 396 / 462 / 516 um at 30 / 195 / 200 C (Cu S); SUS430: 696 um (30 C), 71 um (195 C); transition temperature -a-m10 200 C | measured (shadow moire 30-200 C) | p.4 Fig. 3(a); p.5 Sec. III.B; p.3 Table III (stiffener), p.3 Table IV (materials) | Si 167 / 3.2; Cu 100 / 17; solder 37.4 / 21.7; dielectric 3.2 / 65; top CUF 8.5 / 16 / 82 ...; stiffener table | Poisson; build-up/core thickness; stiffener geometry per size; Tier D (measured only) |
| 6 | ectc51529.2024.00265-a (Resonac, ECTC 2024) | 100 x 100 mm 8-2-8 FCBGA, Si 50 x 50 x 0.725 mm, core 1.4 mm, Cu stiffener 2.5 mm, silicone adhesive 150 um | -a-m4 1035 um (no stiffener, 30 C); stiffener width 12 / 16 / 20 mm: -a-m5..m7 612 / 602 / 525 um (30 C) and -a-m11..m13 188 / 130 / 225 um (245 C) | measured | p.5 Fig. 6; p.4 Sec. IV.B; p.3 core property table (E per core A-D in GPa, one entry "no data") | core CTE 10.6 ppm/K (TMA), E, Tg | build-up thicknesses and properties; CUF; adhesive modulus; FCBGA match |
| 7 | 001c.147115-c (Amkor, IMAPS) | ANSYS model of lidded / stiffener 2.5D TSV package, 7 legs (UF Tg, core CTE and thickness, lid adhesive) | simulated warpage RT / HT per leg: -c-m17 78 / -c-m18 -73 um ... -c-m29 172 / -c-m30 -159 um | simulated | p.4 Fig. 9; p.4 Table II | partial (leg table) | HT temperature not stated; most layer data; underfill stress rows normalized (weak) |
| 8 | ectc51906.2022.00108-a (Samsung MIoS) | 85 x 85 mm 2.5D molded interposer on substrate, ring stiffeners A/B/C, adhesives A/B/C | RT / HT pairs, e.g. -a-m3 272 / -a-m4 372 um (Stiff A 1 mm); adhesive A/B/C -a-m17..m22 | measured | p.3-4 Fig. 4-8; Table III adhesive properties | adhesive properties | HT value not stated; layer thicknesses mostly absent; Tier D shape trends |
| 9 | ectc51909.2023.00091-a, -b (TSMC CoWoS-L 6x) | 91 x 91 mm CoWoS-L MTV with lid (-a) or stiffener ring (-b), 3-2-3 substrate core 1.4 mm | -a-m1 64 um (25 C), -a-m2 -148 um (240 C); -b-m1 186, -b-m2 -107 um | measured | p.3 Fig. 6(c); p.4 Fig. 7(c) | none | almost all thicknesses and all materials; Tier D sign/shape only (RT to HT sign flip) |
| 10 | ectc51846.2026.00073-a..f (Socionext/Renesas, Si-bridge 2.5D) | 60 x 60 x 4.8 mm, 4 top dies + 3 Si bridges in molded interposer, 5/2/5 substrate, Cu or SUS stiffener DOE | -a-m10 -164 um (30 C), -a-m11 -86 um (245 C), -a-m7 78 um change; hysteresis -a-m8 -13 um | measured; sim-vs-meas figure without values (-a-m12) | p.5 Fig. 9-11; p.7 Fig. 16; p.8 Fig. 18 | "process standard" materials | thicknesses, materials; EMIB-T / CoWoS-L-like topology; DOE deltas (stiffener thickness, width, SUS) are good relative targets |
| 11 | tcpmt.2026.3672227-a (FCBGA-S, 102 x 102 mm 4-die) | 18-layer substrate, ring attach, flip chip, UF | process-step warpage at 30 C -a-m1..m10 (e.g., 86.9 -> 640 -> 812 -> 293 -> 285 um FCF path); ring-substrate -a-m11 -451.5 um; SOP region -a-m15 0.48 um/C | measured (Akrometrix AXP, 30-245 C) | p.5-6 Sec. III.C-D; p.6 Fig. 13 | few | material properties; thickness fraction 0.57 |
| 12 | 3dic63395.2024.10830178-a (imec RF Si interposer, 300 mm) | BEOL Cu + 3 XP80 polymer layers (15 / 7 / 7 um) + 5 um Cu RDL, backside SiN 1.5 um | wafer warpage -a-m1 -120 um (BEOL), -a-m2 260 um (PID1+2), -a-m3 380 um (polymer contribution, derived), -a-m5 100 um (SiN compensation), -a-m6 230, -a-m7 330 um | measured | p.5 Sec. III.C; p.1 Abstract | cure temperatures, Tg | film stresses and moduli, Si thickness (assume 775 um, flagged); Stoney/CLT Tier D with intrinsic-stress input; sign convention not stated |

Not ranked (low completeness or relative-only): ectc51906.2022.00008 (CoWoS-R+, 2 rows each, few layers),
ectc51909.2023.00151-a (HBM3 8Hi MR-MUF: chip warpage window 20 / 30 um at 220 C; LMC Table I gives Tg, alpha1/alpha2,
modulus: useful as HBM material input, weak as a target), ectc51687.2025.00158-a (FOCoS-Bridge, 21 simulated rows,
no thicknesses), ectc51687.2025.00187 (Intel FO-EB lidded 75 x 75 mm: warpage rows partly `unspecified`).

### 3.3 (b) Thermal (theta-JC, Rth junction-to-inlet, Tj rise with power maps)

| Rank | TV (paper) | Build | Target rows (metric_id: value) | Basis | Locator | Properties disclosed | Missing inputs |
|---|---|---|---|---|---|---|---|
| 1 | ectc51687.2025.00085-c, -d (TSMC CoWoS-R thermal TV, ECTC 2025) | 3.3x-reticle RDL interposer, 4 SoC + 8 HBM heater dies, indium TIM1 200 um, lid, S-type liquid cold plate, inlet 20 C | measured -c-m5 Tj 104.9 C, -c-m6 Tc 84.6 C, -c-m7 Rjc 0.0109 C/W at 1866 W uniform SoC power; calibrated model -d-m1 104.7, -d-m2 84.5 C, -d-m3 0.0108 C/W; BLT sweep -d-m4/6/8/10: 0.00982 / 0.00996 / 0.01026 / 0.01082 C/W at 25 / 50 / 100 / 200 um; contact-R sweep -d-m12..m18 | measured + simulated (FloTHERM) | p.3 Table 2, 4; p.4 Fig. 8, 9; Table 3 model geometry and k is image-only in text.md | in DB layers: lid k 390; In 86 W/mK (model); Si k = 117.5 - 0.42 (T - 100) W/mK; orthotropic RDL/substrate k from Cu density | die/interposer sizes and thicknesses (Table 3 image: read from figure crop); TIM1 contact resistance value (normalized only); cold plate h or curve; HBM powers (SoC-only heating in calibration simplifies this) |
| 2 | itherm45881.2020.9190542-a (MediaTek InFO_oS TTV) | 62.5 x 62.5 mm substrate, InFO 22.78 x 34.0 mm, 2 thermal dies 21.78 x 16.25 mm, lid, TIM1 | ThetaJC sim vs test, gel 6 W/mK: BLT 140 um -a-m1 0.063 vs -a-m3 0.065 C/W; BLT 60 um -a-m2 0.033 vs -a-m4 0.031; TIM A-D (3.2 / 6 / 25 / 30 W/mK) sim -a-m5..m8 0.036 / 0.033 / 0.025 / 0.025 vs test -a-m9..m12 0.036 / 0.034 / 0.021 / 0.021 C/W; non-uniform power ratio -a-m21 2.05x sim vs -a-m22 2.1x test | simulated + measured | p.4 Tables 3-5; p.5 Table 6 | TIM k and BLT | lid, die, molding, RDL, substrate thicknesses and k; JEDEC ThetaJC cold-plate BC detail (Tc location) |
| 3 | itherm45881.2020.9190542-b (InFO_oS with vapor-chamber heat sink, model) | as above + VC heat sink, Tamb 55 C | Tj and Tcase for 7 power cases, e.g. -b-m1 114.0 C at 250 + 250 W; -b-m10 84.5 C at 125 + 125 W; uneven 200 / 150 W: -b-m13 98.8, -b-m14 93.8 C | simulated | p.5 Table 7; p.6 Table 8 | none beyond TIM | heat sink model; but internal check is available: (Tj - Tamb)/P = 0.1180, 0.1178, 0.1180, 0.1180 K/W for 500 / 400 / 350 / 250 W equal-split cases (own arithmetic from -b-m1, -m4, -m7, -m10): linear to 0.2 %, so a linear-superposition gate (influence-matrix test for multi-die power maps) |
| 4 | ectc51909.2023.00302-c (Georgia Tech reconstituted SiO2 tier, Ansys) | 4 chiplets 150 x 150 x 30 um; SiO2 12 um k 1.1; Cu 30 um k 380; EMC k 0.6; h 500 W/m2 K; 1 W/mm2 on one chiplet | max / min T of tier: EMC -c-m1 43.026 / -c-m2 35.744 C; SiO2 -c-m3 40.776 / -c-m4 35.201; SiO2 + Cu -c-m5 37.695 / -c-m6 36.421 C | simulated | p.2 Fig. 2; p.3 Sec. III.A; Table I p.2 | Table I complete for k, thicknesses, h | ambient temperature; chiplet spacing; domain size and which faces carry h. Small model: cheap Tier C once these are inferred and flagged |
| 5 | tcpmt.2025.3533388-a (Tyndall/IZM, glass interposer) | 5 x 5 x 0.5 mm thermal chip on 13 x 7 mm Borofloat 33 interposer (460 um), FR4 PCB 1.6 mm, Cu block on TEC 20 C, 0.5 W | max chip surface T vs thermal TGV pitch 100 / 200 / 300 / 400 um: -a-m1..m4 41.0 / 41.3 / 43.6 / 43.9 C | measured (IR) | p.5 Fig. 5, 6 | glass and Cu known; PI/RDL thickness missing | TGV diameter/fill, PCB stack, contact to TEC, IR emissivity |
| 6 | tcpmt.2023.3266666-a (IBM 300 mm wafer-scale microchannel) | 300 mm wafer-scale Si cooler, 13.8 kW, 32 L/min | max Tj rise -a-m1 18 C; sensor rises -a-m2..m9 (5.9-14.0 C); unit Rsub -a-m34 15.6 C-mm2/W (derived); hot-spot R -a-m35/36 45.5 / 32.2 C-mm2/W; happ -a-m31 96 000 W/m2 K (author estimate) | measured | p.6-7 Fig. 9-11; Sec. III | heater power densities -a-m51/52 | conduction-only model is possible with happ as Robin BC (assumption); full case needs CFD |
| 7 | ectc51846.2026.00065-b (Georgia Tech/UCSD AlN encapsulation, Icepak) | chiplet in AlN vs epoxy encapsulation, h_eff 8600 W/m2 K | max allowable power density at Tj <= 85 C: -b-m7 90 W/cm2; -c-m1 60 W/cm2; Tj reduction -b-m2 40 C | simulated | p.5 Fig. 9-11 | AlN k measured (-a-m1..m3: 10; 150 cross-plane / 60 in-plane W/mK) | full stack thicknesses, ambient |
| 8 | ectc51846.2026.00156-a (Microsoft/Corintis GH200 direct-to-Si microfluidic) | GH200 package, backside microchannels | Rth junction-to-inlet GPU -a-m4..m8 0.0152-0.0196 C/W; HBM -a-m9..m13 0.151-0.247 C/W; package -a-m14..m18; flow sweep -a-m34..m42 (0.0337 at 0.3 LPM to 0.0115 C/W at 2.0 LPM) | measured | p.3 Fig. 3-7 | none | power maps per workload, channel geometry, stack: Tier D trend only (Rth vs flow), needs conjugate CFD for absolute |
| 9 | ectc51909.2023.00151-b, -c (SK hynix MR-MUF vs TC-NCF HBM) | 8Hi HBM on Si interposer proxy | DRAM Tj at 200 s: MR-MUF -b-m7 100 C vs TC-NCF -c-m1 114 C; difference -b-m6 14 C | measured | p.4 Fig. 14 | LMC Table I (mechanical only) | power, stack, BC: relative target only (dTj between bonding schemes) |
| 10 | estc60143.2024.10712002-h (bridge-chip cross-section FEA) | bump cross-section model | Rth per bump -h-m1..m3: 104.4 / 202.6 / 232.4 K/W for gap 0 / 50 / 100 um, 1 C across each bump | simulated | p.3 Table I | in paper (check) | geometry details: verify before use |

Not used as absolute targets: itherm55375.2024.10709474 (microjet cooler; FLUENT conjugate CFD, out of conduction scope),
ectc51846.2026.00274-a (CoWoS-R MTV: thermocouple temperatures in TC chamber, not a thermal-resistance case).

### 3.4 (c) Stress (weak targets: say so)

Why weak: (1) 134 of 181 stress/strain rows are normalized or relative ("normalized ASIC underfill stress", "ratio to
case 1"); a ratio can validate trends only. (2) Reported "max stress" from paper FEMs is usually at a bimaterial corner
or crack tip, where linear elasticity is singular (stress grows without bound with refinement): mesh dependent, not a
physical target. (3) Measured micro-Raman stress depends on the conversion coefficient, probe depth and crystal
orientation. (4) Plasticity / grain growth dominate Cu TSV protrusion. Use these as order-of-magnitude and trend checks.

| Rank | TV (paper) | Target rows | Basis | Locator | Usable as | Missing / caveat |
|---|---|---|---|---|---|---|
| 1 | ectc.2011.5898527-b (Xilinx TSV interposer, -55 to 125 C global-local) | interposer corner in-plane / shear / out-of-plane: Si -m17 127.5 / -m18 4.28 / -m19 82.1 MPa; SiO2 -m20 120.3 / -m21 16.47 / -m22 77.06; Cu-TSV -m23 146.3 / -m24 21.75 / -m25 111.3 MPa; die von Mises -m4/-m6/-m8 115 / 127 / 147 MPa | simulated | p.5 Table 5; p.3 Table 3 | Tier C order of magnitude; die von Mises trend with package size and lid | local model geometry, TSV size, Poisson; corner values mesh dependent |
| 2 | tcpmt.2026.3708099-a..d (ultradeep Cu TSV, 70 um dia, 300 um deep, 210 um pitch, 500 um Si) | Cu protrusion measured -a-m1 0.114 um (200 C/3 h), -a-m2 0.333 um (300 C/3 h); FEM max deformation -a-m7 0.692 um at 300 C (COMSOL, thermal expansion only); Raman average Si surface stress -a-m3 354 MPa (unannealed) | measured + simulated | p.3 Fig. 3-4; p.4 Fig. 5-7 | elastic upper bound for protrusion (XB3-type deck); MA7 near-field order of magnitude | properties not stated; protrusion is plastic/creep; Raman conversion factor in the metric condition; 354-457 MPa looks high for Lame-type elastic stress and needs re-reading before use |
| 3 | ectc51687.2025.00071-a..c (3 um TSV, 6 um pitch, AR 4/7/10) | peak residual biaxial Si stress at gap centre after 400 C / 1 h: -a-m1 86, -b-m1 34, -c-m1 19 MPa | measured (Raman 532 nm) | p.4 Fig. 6 | trend vs TSV depth (decreasing) | Cu properties after anneal; Raman depth; plasticity |
| 4 | iedm45741.2023.10413759-b (UCLA GaN/Si-IF SU8 gap fill) | effective SU8 film tensile stress 100 / 200 um: -b-m2 23.5, -b-m4 44.5 MPa (no optimization); segmented -b-m3 8, -b-m5 16.5 MPa | measured | p.4 Fig. 16 | Stoney-type film stress (MA5) inverse check if wafer bow and thickness are recoverable | how stress was extracted (verify), wafer thickness |
| 5 | ectc51529.2024.00093-g (DNP glass core, 22 to 260 C) | max principal stress filled straight TGV 94 um: -g-m6 187 MPa | simulated | p.3 Fig. 6; Sec. II.A | Tier C order of magnitude for TGV (glass CTE 3.8 ppm in layers) | Cu and glass properties, model BCs |
| 6 | ectc51846.2026.00074-e (glass core TGV, -25 / 150 C) | peak peel -e-m1 80 MPa, shear -e-m2 60 MPa at Cu via / glass wall (150 C) | simulated | p.3 Fig. 5-6; Sec. IV.B | interface stress in TGV; liner moduli measured (-b-m4 2.62 GPa, -c-m4 81.1 GPa, nanoindentation) | singular interface corner |
| 7 | ectc51687.2025.00187-a, -c, -d (Intel FO-EB, TIM1 study) | UF1 stress in die gap: -c-m5 117 MPa (polymer TIM), -d-m7 298 MPa (STIM BLT 180 um), -a-m20..m22 146-168 MPa | simulated | p.4 Fig. 9(b) | relative effect of TIM/lid coupling on UF stress (EMIB/FO-EB family) | most stack data |
| 8 | ectc51687.2025.00178-g (glass core build-up) | glass tensile stress 56 / 95 / 49 MPa (-g-m1..m3) | simulated | p.4 Fig.; Sec. III.A | trend vs build-up resin thickness | properties |

---

## 4. Convergence and verification protocol

### 4.1 Verification (code correctness), run on every engine change

| Check | Setup | Pass criterion |
|---|---|---|
| Patch test (mechanics) | distorted 3D patch, prescribed linear u on boundary, constant strain inside | stress constant to round-off (1e-10 rel) for P1 and P2 |
| Thermal patch | linear T on distorted mesh with anisotropic k rotated 30 deg (TA6) | exact to round-off |
| Free expansion (MA1, MA8) | uniform dT, 3-2-1 constraint | max abs sigma / (E alpha dT) < 1e-10; reactions < 1e-10 of E alpha dT A |
| Stress-free linear gradient (MA6) | linear T(z) | sigma < 1e-10 rel; kappa exact |
| MMS heat | T_m = sin(pi x / Lx) cosh(y / Ly) exp(-z / Lz) + piecewise-linear term built so k1 dT/dn = k2 dT/dn at material interfaces; f = -div(k grad T_m) computed symbolically | L2 error order p + 1, H1 order p, on 4 meshes (h, h/2, h/4, h/8) |
| MMS thermo-elasticity | u_m = polynomial/trig, T_m given; body force f = -div(C : (eps(u_m) - alpha T_m I)) | displacement L2 order p + 1, stress L2 order p |
| Rigid-body modes | free-free warpage body; constraints by 3-2-1 vs by RBM projection (6 modes) vs by soft springs | results differ < 1e-8 rel; reaction forces < 1e-9 of internal force scale; K has exactly 6 near-zero eigenvalues before constraints |
| Symmetry | quarter vs half vs full model of MA4b and XB2 (as JOINT2 and Xilinx quarter models) | kappa and w_max differ < 1e-6 rel (same mesh density) |
| Energy balance (heat) | sum of nodal reaction flux on Dirichlet faces + Robin outflow = total source | rel imbalance < 1e-9 (consistent flux via reactions), < 1e-3 with recovered gradient flux |
| Energy balance (mechanics) | strain energy = 0.5 u^T K u = work of external + thermal loads | rel < 1e-9 |
| Transient order | TA5 with dt halving | backward Euler order 1, Crank-Nicolson / BDF2 order 2 |

### 4.2 Convergence of each validation result

- h-refinement: at least 3 meshes with refinement ratio r >= 1.5; compute observed order p_obs = ln((f3 - f2)/(f2 - f1)) / ln r.
- Richardson extrapolation and a grid convergence index (GCI, Roache) with safety factor 1.25 for 3+ meshes; report
  extrapolated value and uncertainty, as the EO L-REF lane does (`reference/<case>.json`).
- p-refinement: P1 vs P2 at fixed mesh; for thin layers (MA5b, XB2) also elements through thickness (1, 2, 4) to
  expose locking. Expect P1 tets to fail MA5b by tens of percent at 1 element through the film (to be measured, not assumed).
- Domain truncation: MA7 matrix radius 10a, 20a, 40a; TA5 depth vs 4 sqrt(alpha t).
- Singular points: never compare a nodal max at a bimaterial corner; compare (a) values at a fixed distance (e.g., 2x the
  thinnest layer thickness), (b) path-averaged or integrated quantities (T_inf in MA9, interface force), (c) J-integral-
  type quantities if fracture comes in later.
- Warpage definition: store which one is compared: signed centre-to-corner, coplanarity (max - min of the top or
  bottom surface), or JEDEC JESD22-B112 / JEITA ED-7306 shadow-moire definition (verify sign conventions per paper:
  several DB rows say "sign convention not stated").

### 4.3 Comparison metrics and tolerances (proposed; assumptions to be revised after the first runs)

| Tier | Quantity class | Metric | Tolerance |
|---|---|---|---|
| A | global (kappa, R_th, T at point, reaction) | rel err vs closed form after extrapolation | < 1e-3 (P2), and observed order within 0.3 of theory |
| A | point stress away from singularities | rel err | < 1e-2 |
| B NAFEMS | target quantity | rel err on finest mesh | < 1 % (vendor fine-mesh results are -1.7 % to +4.8 %: our gate is stricter only after Richardson) |
| B cross-solver | global / field L2 on a common sampling grid | rel diff between extrapolated values | < 0.5 % global; < 2 % stress at sampled points |
| C | warpage | abs or rel | max(10 um, 10 %) |
| C | Tj rise, Tc, Rjc, ThetaJC | rel on rise above reference temperature | 5 % (CoWoS-R paper reports its own model within 1 C of test) |
| D | warpage vs T curve | sign at each T, transition temperature, magnitude | sign match at all T; transition +-20 C; magnitude max(20 um, 25 %) |
| D | thermal | Tj rise / Rth | 10 % |
| C/D | normalized stress | trend (rank order, ratio) | rank order preserved; ratio +-15 % |

### 4.4 Recording (mirror EO `validation_status`)

- Each case YAML carries `validation_status: unvalidated | analytic_gates_pass | cross_solver | literature_regression |
  measured_regression` (EO uses the first four; add `measured_regression` for Tier D).
- Every input has provenance `class: paper_exact | figure_digitized | project_inference | standard_reference | unknown`
  plus locator; `unknown` values are listed under `missing` and never silently defaulted (EO SPEC rule).
- Results: `validation/reference/<case>-<solver>.json` with inputs hash, solver and version, mesh levels, DOFs, raw
  values per level, extrapolated value, GCI, error vs target, run time, ISO date; logs `logs/val-<case>-YYYYMMDDTHHMM.log`.
- A case changes status only by a logged run; a DevLog progress entry records the transition and any target correction.
- Independence: the reference lane (open-source decks) is written from physics and package docs only, never from the
  engine sources (EO DevLog-028 rule).

---

## 5. Effort sizing and file layout

### 5.1 Curation effort (estimates, hours; ranges reflect unknown paper-reading depth)

| Work item | Count | h per item | Total h |
|---|---|---|---|
| Tier A YAML + expected-value script (formulas above, own arithmetic re-done in the repo script) | 16 | 1.5-2.5 | 23-38 |
| Tier B NAFEMS: geometry from FeenoX/FEATool public inputs, targets, BC transcription | 7 | 2-4 | 14-28 |
| Tier B cross-solver decks XB1-XB5 (scikit-fem first, FEniCSx second), runs + convergence | 5 | 4-6 | 20-30 |
| Tier B COMSOL prep for Wentao (parameter sheets, what to export) | 4 | 1 | 4 |
| Tier C/D case curation: re-read paper, fill inputs with provenance, missing list, assumptions | 30 (12 warpage, 10 thermal, 8 stress) | 2-4 | 60-120 |
| Figure crops for image-only tables (JOINT2 Table 8, CoWoS-R Table 3) | 4 | 1 | 4 |
| Digitizing warpage-vs-temperature curves (shadow moire) into `reported_curves` | 10 | 1-2 | 10-20 |
| Comparison harness (metrics, tolerances, status transitions, JSON schema) | 1 | 12-18 | 12-18 |
| Fresh-context audits (2 rounds) | 2 | 4 | 8 |
| Total | | | 155-270 (point estimate about 200) |

Minimum viable set (first engine milestone): Tier A all (about 30 h), NAFEMS LE11 + T1 + T3 + T4 (about 10 h), Tier C
ranks 1-3 warpage + ranks 1-3 thermal (about 25 h), harness core (about 8 h): about 70 h.

### 5.2 Proposed layout

```text
validation/                         # isolated uv project, as in eo-modulator-atlas
  pyproject.toml                    # scikit-fem, gmsh, pyamg, numpy, scipy, pyyaml (later: dolfinx if installable)
  cases/
    A/TA1-multilayer-R.yaml ... MA9-suhir-force.yaml
    B/nafems-LE11.yaml, nafems-T1.yaml, ..., XB1-bilayer-strip.yaml
    C/ectc51909.2023.00155-d.yaml, ectc51687.2025.00085-d.yaml, ...
    D/ectc51529.2024.00155-a.yaml, ectc51909.2023.00091-a.yaml, ...
  refs/                             # expected-value scripts (closed forms), no solver code
  reference/<case>-<solver>.json    # small result fixtures
  scripts/                          # deck builders for scikit-fem / FEniCSx / CalculiX
logs/val-<case>-YYYYMMDDTHHMM.log   # not committed
```

Case YAML sketch (fields; values from section 3.2 rank 1):

```yaml
schema: pkg-atlas.val/v1
id: ectc51909.2023.00155-d
tier: C
physics: [thermo_elastic]
validation_status: unvalidated
source: {paper_id: ectc51909.2023.00155, tv_id: ectc51909.2023.00155-d}
model:
  symmetry: quarter
  stress_free_temperature_c: {value: 150, provenance: {class: paper_exact, locator: "p.5 Sec. III.C"}}
  load_temperature_c: 260
layers:                       # each with thickness_um, material key, provenance
  - {name: EMC, thickness_um: 698, material: emc_joint2_2023, provenance: {class: paper_exact, locator: "p.5 Fig. 3"}}
materials:
  emc_joint2_2023: {E1_mpa: 18000, E2_mpa: 400, alpha1_ppm: 7, tg_c: 140, nu: null}
assumptions:
  - {item: "nu = 0.3 for EMC", class: project_inference}
missing: [viscoelastic Prony series, filler-die layout, Poisson ratios]
targets:
  - {metric_id: ectc51909.2023.00155-d-m1, quantity: warpage_um, value: -189, definition: "as reported, sign per paper",
     tolerance: {abs_um: 10, rel: 0.10}}
```

### 5.3 Open items for Wentao (few, numbered)

1. OK to install FeenoX and CalculiX binaries later (not uv packages) for the NAFEMS set, or keep to uv-installable
   scikit-fem / FEniCSx only?
2. Will you run the COMSOL decks (273, 847, and XB1-XB5 parameter sheets)? If yes, which COMSOL version, to pin results.
3. Tier D tolerance policy: accept the proposed warpage band max(20 um, 25 %), or tighter for the JOINT2 cases that
   publish both FEM and moire on the same build?

---

## Sources (retrieved 2026-10-20)

Benchmarks and verification manuals
- NAFEMS R0006 Background to Benchmarks (contents list LE1-LE11, T1-T4): https://www.nafems.org/publications/resource_center/r0006/
- NAFEMS glossary, thermal-stress benchmarks (P02, P18, R0006, R0031): https://nafems.org/publications/glossaryofbenchmarks/thermalstress
- Abaqus Benchmarks LE11: https://abaqus-docs.mit.edu/2017/English/SIMACAEBMKRefMap/simabmk-c-le11.htm
- Abaqus Benchmarks LE10: https://abaqus-docs.mit.edu/2017/English/SIMACAEBMKRefMap/simabmk-c-le10.htm
- Abaqus Benchmarks T1: https://abaqus-docs.mit.edu/2017/English/SIMACAEBMKRefMap/simabmk-c-t1.htm
- Abaqus Benchmarks T2 (search result; page 404 on fetch): https://docs.software.vt.edu/abaqusv2023/English/SIMACAEBMKRefMap/simabmk-c-t2.htm
- Altair OptiStruct OS-V 0070 LE11: https://help.altair.com/2023/hwsolvers/os/topics/solvers/os/nafems_test_problem_le11_r.htm
- Altair OS-V 0100 T1: https://2021.help.altair.com/2021/hwsolvers/os/topics/solvers/os/nafems_test_problem_t1_r.htm
- Altair OS-V 0110 T3: https://2021.help.altair.com/2021/hwsolvers/os/topics/solvers/os/nafems_test_problem_t3_r.htm
- Altair OS-V 0120 T4: https://2021.help.altair.com/2021/hwsolvers/os/topics/solvers/os/nafems_test_problem_t4_r.htm
- CAST3M test cases (LE11): https://www-cast3m.cea.fr/html/CasTestsCastem/node9.html
- FeenoX mechanical examples (LE1, LE10, LE11, orthotropic expansion, Veeder): https://www.seamplex.com/feenox/examples/mechanical.html ; repo https://github.com/seamplex/feenox/
- FEATool T4 example: https://www.featool.com/doc/ex__heattransfer4_8m
- CalculiX forum, NAFEMS T2/T3: https://calculix.discourse.group/t/t2-and-t3-one-dimensional-with-radiation-and-heat-transfer-b32-discrepancy/2534
- COMSOL heat_radiation_1d (T2): https://doc.comsol.com/6.3/doc/com.comsol.help.models.mph.heat_radiation_1d/heat_radiation_1d.html

COMSOL Application Gallery
- Thermal Stresses in a Layered Plate (273): https://www.comsol.com/model/thermal-stresses-in-a-layered-plate-273 ; PDF https://doc.comsol.com/6.4/doc/com.comsol.help.models.sme.layered_plate/models.sme.layered_plate.pdf
- Thermal Cycle Test of a Flip-Chip Device (131051): https://www.comsol.com/model/thermal-cycle-test-of-a-flip-chip-device-131051
- Optimization of the Solder Ball Array to Minimize Chip Warpage (124581): https://www.comsol.com/model/optimization-of-the-solder-ball-array-to-minimize-chip-warpage-124581
- Heat Transfer in a Surface-Mount Package for a Silicon Chip (847): https://www.comsol.com/model/heat-transfer-in-a-surface-mount-package-for-a-silicon-chip-847 ; doc https://doc.comsol.com/6.2/doc/com.comsol.help.models.heat.surface_mount_package/models.heat.surface_mount_package.pdf
- Bimetallic Strip in Airflow (74251): https://www.comsol.com/model/bimetallic-strip-in-airflow-74251

Open-source
- Bleyer, Computational Mechanics Numerical Tours with FEniCSx: https://bleyerj.github.io/comet-fenicsx/
- scikit-fem examples: https://scikit-fem.readthedocs.io/en/latest/listofexamples.html

Closed forms (primary references; formulas used as written above)
- S. Timoshenko, "Analysis of bi-metal thermostats", J. Opt. Soc. Am. 11, 233-255 (1925).
- G. G. Stoney, "The tension of metallic films deposited by electrolysis", Proc. R. Soc. Lond. A 82, 172-175 (1909).
- W. A. Brantley, "Calculated elastic constants for stress problems associated with semiconductor devices", J. Appl.
  Phys. 44, 534 (1973) (Si(001) biaxial modulus 180.5 GPa; value as commonly cited, not re-fetched).
- E. Suhir, "Stresses in bi-metal thermostats", ASME J. Appl. Mech. 53, 657-660 (1986); "Interfacial stresses in bimetal
  thermostats", J. Appl. Mech. 56, 595-600 (1989) (formula structure in MA9 not verified against the primary).
- S. Song, S. Lee, V. Au, "Closed-form equation for thermal constriction/spreading resistances with variable resistance
  boundary condition", IEPS 1994; S. Lee, S. Song, V. Au, K. Moran, "Constriction/spreading resistance model for
  electronics packaging", ASME/JSME Thermal Engineering Conf. 1995. Worked example: S. Lee, "Calculating spreading
  resistance in heat sinks", Electronics Cooling, 1998-01: https://www.electronics-cooling.com/1998/01/calculating-spreading-resistance-in-heat-sinks/
  (0.66 C/W central case reproduced by the TA3 formula: 0.657 C/W). Comparison: R. Simons, Electronics Cooling 2004-05:
  https://www.electronics-cooling.com/2004/05/simple-formulas-for-estimating-thermal-spreading-resistance/
- S.-K. Ryu et al., "Impact of near-surface thermal stresses on interfacial reliability of through-silicon vias for 3-D
  interconnects", IEEE Trans. Device Mater. Rel. 11, 35-43 (2011) (equal-constant TSV limit; not re-fetched).
- F. P. Incropera et al., Fundamentals of Heat and Mass Transfer, fin table (Table 3.4) and semi-infinite solids.
- P. J. Roache, GCI method (Verification and Validation in Computational Science and Engineering, 1998).

DB and paper text (local, licensed: facts + locators only)
- data/metrics.csv, test_vehicles.csv, stack_layers.csv, components.csv, interconnects.csv, papers.csv (rows cited by id).
- references/<paper_id>/text.md for ectc51529.2024.00155 (Table IV), ectc51687.2025.00027 (Tables III-IV),
  ectc.2011.5898527 (Table 2), ectc51909.2023.00155 (Table 8, image-only), ectc51687.2025.00085 (Table 3, image-only),
  ectc51909.2023.00302 (Table I), ectc51909.2023.00151 (Table I), ectc51529.2024.00265 (core table), tcpmt.2026.3708099.
- Pattern: eo-modulator-atlas DevLog-023 "Validation reference set (TFLN), by tier"; DevLog-028 L-REF plan; sims/SPEC.md
  (`validation_status`, provenance classes, `missing`).
