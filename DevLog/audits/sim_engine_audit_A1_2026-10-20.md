---
title: Audit A1 - wave-1 simulation engine (fresh context)
date: 2026-10-20
auditor: fresh-context audit subagent (read-only except this file)
scope: engine/src/{la,params,grid,thermal,materials,families,em2d}/, engine/cli.mjs, engine/tests/, engine/data/materials/, sims/*/*.yaml, validation/, DevLog/lanes/L1, L2, L3, L4, L7; plus SPEC section 12 rotation check (coordinator addition)
snapshot: files read 2026-10-20 14:04-14:20 PDT; L1, L2, L3 (wave 2), L6, L7, L8 were editing during the audit (see "Snapshot" below)
---

# Audit A1: wave-1 simulation engine

Binding inputs read: DevLog-012 (lanes, CD1, CD2), sims/SPEC.md (v0.4 text plus section 12), DevLog-010 A1-A11, lane
notes L1, L2, L3, L4, L7. Everything below was run under `nice -n 10` (max RSS seen 0.33 GB). Scratch scripts lived in
the session scratchpad and were not written to the repo.

## Snapshot

- Engine file timestamps at audit start (14:04 PDT): thermal/index.mjs 14:00, thermal/assemble.mjs 13:58,
  grid/index.mjs 13:59, la/mg.mjs 13:52, materials/{library,homogenize,overrides}.mjs 14:02, families/resolve.mjs
  14:03, em2d/* before 13:57. New L3 wave-2 families and 8 new sims/ cases appeared 14:04-14:19.
- sims/cowos_r/thermal_rjc.yaml changed between my two runs (mesh.max_xy_mm 0.5 -> 1.0, 14:19).
- Findings tied to a case file give the file time of the run that produced them.

## Tests run (all pass)

`node --test` per file, 2026-10-20 14:05-14:10 PDT: grid 8, thermal-tierA 5, thermal-verify 7, thermal-wave2 5,
la-ldlt 2, la-sparse 7, la-params 8, la-block 4, cli 5, materials 21, families 45, families_cases 10, em2d-em0 8,
em2d-mtl 8, em2d-em1 1, em2d-em2 1: 145 pass, 0 fail.

## Findings, ranked

### Blocking

**B1. 12 of 17 package cases do not run their first study as committed** (CLI `--study s1`, run 14:19-14:20 PDT).
Wave-1 notes say the 9 L3 cases were "validated by the L1 parser"; none of the 9 was run end to end before hand-off.

| Case (file time) | Failure | Cause class |
|---|---|---|
| cowos_l/warpage_rt_ht (14:13) | 518,700 nodes > max_nodes 300,000 | mesh budget never tried |
| emib_t/bridge_stress (14:11) | 498,858 nodes > 300,000 | mesh budget |
| si_interposer_peers/120mm_warpage (14:11) | 624,624 nodes > 300,000 | mesh budget |
| fan_out_panel/panel_warpage (14:17) | 3,663,000 nodes > 300,000 | mesh budget |
| fcbga_organic/substrate_warpage_bare (13:57) | `bottom:sbt_bu_bot has no exterior faces` | selection names a part that owns no cells |
| hbm_stack/stack_thermal (14:17) | `top:top has no exterior faces` | same |
| soic/thermal_stack (14:17) | `bottom:die_bot has no exterior faces` | same |
| ucla_si_if/warpage (14:17) | `bottom:si_if has no exterior faces` | same |
| cpo_module/thermal, glass_core_substrate/warpage_vs_organic (14:17) | `glass_en_a1.k is N/A` | material gap, no case map/override |
| cowos_s/warpage_corner_stress (14:12) | abf_gl at 240.35 C outside valid_T_C [-55, 240] | BC (only `top:mold*` fixed at 40 C, 1000 W) drives the build-up past its data range |

Also: cowos_r/thermal_rjc failed at 14:04 (437,224 nodes); it runs after the 14:19 edit.

- **Same cause, mechanics side.** fcbga_organic/substrate_warpage targets `top:sbt_bu_top`
  (sims/fcbga_organic/substrate_warpage.yaml:47). The grid reports `sbt_bu_top owns no cells`, so the target selection
  will not exist when L8 evaluates s2.
- **Root of the selection class.** Layer boxes get priority 10 x depth + 2 (engine/src/families/boxes.mjs:56), so a part
  can be fully covered by its own layers. The grid then creates per-part selections only for parts that own cells
  (engine/src/grid/index.mjs:336).
- **Fix options:** (a) the generator emits selection aliases (part -> its outermost layer box); (b) the grid builds
  `top:/bottom:<part>` from the part's box extent over whatever cells occupy it; (c) the cases name the layer box ids.
  Each case also needs one real CLI run before hand-off.

### Significant

**S1. GMG convergence degrades on real cases and on in-plane cell anisotropy.**
- **Real cases** (14:19 run): 56-198 PCG iterations, against 11-22 on the L1 bench grids:
  - cowos_r 198 iterations, 4.4 s solve at 1.6e5 nodes, about the direct cost the bench reports at that size;
  - fcbga 128-140; xilinx 93-120.
- **Scratch reproduction:** 40 Cu strips 5 um wide on a 2 mm in-plane mesh (in-plane cell aspect 400, 4.9e4 nodes):
  - PCG+MG: 352 iterations, 1.8 s;
  - direct: 0.24 s, same answer to 4e-11 K.
- **k contrast alone is not the cause:** a 1e4 contrast (Cu pillars in a k = 0.04 matrix, misaligned with the coarse
  grids) converged in 13 iterations.
- **Cause:** the smoother is point-wise in x-y (z-line GS, engine/src/la/mg.mjs:122-152), and full x-y coarsening is
  applied whenever NX, NY >= 4 (mg.mjs:226-239), so strong x-only (or y-only) coupling is neither smoothed nor
  semi-coarsened.
- **Failure scenario:** a finer RDL or bridge model at 3e5+ nodes hits maxIter 1000 and the run throws "did not
  converge" (thermal/index.mjs:463). The block MG used by L8 (la/block.mjs) has the same structure.
- **Fixes:** choose the coarsening axis by coupling strength per level; or add an x-line / y-line (zebra) sweep; or
  raise AUTO_DIRECT_MAX for anisotropic grids. Add an anisotropy gate to thermal-verify.

**S2. Sheet homogenization: Poisson pair inverted and discontinuous in fill fraction**
(engine/src/materials/homogenize.mjs:190-200).
- **What the code does:** it sets nu_xz (in-plane load, z strain) = nu_ROM Ev / Er and falls back to nu_ROM when that
  exceeds 1.
- **Convention it breaks:** the column branch (line 206) uses the standard one: major Poisson (load along the Voigt
  direction) = ROM, minor = ROM x Et / Ea. The sheet branch is the reverse.
- **Measured** (cu_electroplated + abf_gx):
  - f = 0.05: nuxz 0.598;
  - f = 0.30: 0.293 (fallback, warning);
  - f = 0.70: 0.297.
  The through-thickness Poisson ratio thus jumps 2x between neighbouring fill fractions.
- **Failure scenario:** any routed level with low fill, e.g. a 5 % signal layer, gets a near-0.6 z contraction under
  in-plane stress. This biases RDL-layer thickness strain and local stress, and a fill-fraction sweep is discontinuous.
- **Fix:** nu_xz = nu_yz = nu_ROM; nu_zx = nu_ROM Er / Ev implied by the compliance.

**S3. Routed-layer direction is ignored** (engine/src/families/boxes.mjs:63-64).
- The generator records `dir` (route direction) but always emits `axis: 'xy'` (isotropic sheet). Homogenization then
  applies Voigt k and E in both x and y.
- **Example:** f = 0.3 Cu in ABF gives k = [120, 120, 0.29] W/(m K). For lines along x, ky should be close to the Reuss
  value (about 0.29), not 120.
- **Failure scenario:** the in-plane heat spreading of signal RDL layers is overstated by orders of magnitude across
  the lines, and so is the in-plane stiffness across the lines.
- **Fix:** pass `dir` to an `axis: x | y` columns topology for line-routed levels. Keep `xy` only for planes and meshes.

**S4. CD1 sensitivity spread is not reported by any engine path.**
- 19 template values are listed: 13 with basis analog and 3 placeholders, all nu or k only, all with a sensitivity
  block; CD1 compliance on that side is clean.
- But no code under engine/src/thermal, engine/src/mech or cli.mjs reads `sensitivity` or `provenance.template`
  (grep: no hits).
- **Failure scenario:** thermal results that depend on emc k 0.95, underfill_cuf k 0.95, abf k 0.2 or core_lowcte k
  1.7 (all template analogs) are printed as single values. CD1 requires the spread.
- **Fix:** the runner flags template-dependent results and offers a k x0.5 / x2 and nu +-0.05 rerun or bounds in
  `derived`.

**S5. Cubic rotation helper uses the opposite convention to SPEC section 12** (coordinator addition).
- **Materials helper:** engine/src/materials/cubic.mjs:40-50 builds a_ij = [[c, s, 0], [-s, c, 0], [0, 0, 1]], i.e.
  R^T. The doc line (83) is also passive: "lab x axis is the crystal [100] rotated by deg".
- **SPEC section 12:** active R, columns = local axes in global coordinates.
- **Mechanics:** engine/src/mech/constitutive.mjs:10-30 follows SPEC 12 (rotAxis active, a = R).
- **Measured** for Si C11/C12/C44 = 165.6/63.9/79.5 GPa at rotation_z_deg = 30:
  - `cubicStiffnessRotZ` C16 = +12.406 GPa;
  - mech `stiffnessLab` C16 = -12.406 GPa;
  - C11 identical (187.088).
  At the default 45 deg (SI_ORIENTATIONS.wafer_100_edges_110, library.mjs:15-19) both give C16 = 0, so default results
  agree.
- **Failure scenario:** any consumer of the exported `cubicStiffnessRotZ` (materials/index.mjs:7; tests check only 0 and
  45 deg) gets the wrong shear-extension coupling sign for a die rotated off the 45 deg default.
- **Also:** engine/src/mech/materials.mjs:23 still says "rotations of the lab frame" (passive wording) while the code
  is active.
- **Thermal:** `rotateK` (thermal/assemble.mjs:256-260) is R diag R^T with material axes as columns, consistent with
  SPEC 12.
- **Fix:** a = R in bondZ (swap the s signs) and a 30 deg test against constitutive.mjs.

**S6. Grid snapping can move faces by more than `snap_xy_um`** (engine/src/grid/spacing.mjs:34-40).
- **Answer to the audit question:** the reported shift is the true shift. `maxShift` comes from the actual member
  offsets, so snapping never moves a face by more than it reports.
- **But clustering is single-linkage:** consecutive gaps <= tol chain into one cluster. Measured:
  - 0, 0.9, 1.8, 2.7, 3.6 um at tol 1 um collapse onto 0, a 3.6 um shift reported as "moved by <= 3.6 um";
  - four adjacent 0.9 um strips are dropped as "thinner than the snap tolerance" (grid/index.mjs:244).
  That message is wrong for a part wider than tol that collapses through chaining.
- **Failure scenario:** fine-pitch in-plane features within a few um, such as a bridge edge plus pad edges or
  generator rounding, silently lose geometry. The only signal is a warning.
- **Fix:** complete-linkage clusters (span <= tol), or an error when a span exceeds tol.

**S7. Tier H rules generalized from one paper.**
- **n_papers = 1:** H07, H08, H09, H11, H15, H16, H18, H22. The titles are phrased as general laws.
- **Concrete overreach:** H15 ("one die instead of two raises the junction rise by 1.4-2.1x") rests on one InFO_oS
  paper (itherm45881.2020.9190542). Its `applies_to` includes cowos_l/warpage_rt_ht
  (validation/cases/H/H15-power-concentration.yaml:8-10), a 3-SoC + HBM package with a different spreading geometry.
- H02's range [0.5, 2.5] spans every observed value (0.575-2.31) and cannot fail.
- **Fix:** scope `applies_to` to the source package class, and mark one-paper rules `strength: weak` in the title or
  rule.

**S8. EM-1 gate does not discriminate the model; the base dielectric is non-causal.**
- **Reproduced at 14:10 PDT:**
  - EM-1 base: +21.2 / +23.6 / +23.7 / +10.4 % at 33 / 77 / 140 / 200 GHz;
  - EM-1 smooth: +1.0 / -8.3 / -12.0 / -18.5 %;
  - EM-2: +3.8 / +3.8 / +11.4 / +3.85 / +8.0 %.
  These match the DevLog-012 claims and the DB rows (ectc51846.2026.00389-b-m2, m5, m8, m11; eptc67330.2025.11392620-a-e1..e5;
  all `measured`).
- **Gate problem:** with `tolerance: {rel: 0.25}` both bracketing variants pass every target, so the gate cannot detect
  a roughness-model regression.
- **Causality:** the base variant uses `abf_type_a_25C` as a `table` model and warns "not causal". DevLog-010 A8 asks
  for causal DS dielectrics, and the Touchstone output of the base variant is not suitable for time-domain use.
- **Fix:** tighten per variant, or gate the base / smooth bracket explicitly; make `causal_fit` the base.

**S9. Mechanics will refuse every case with a polymer TIM.**
- `tim_polymer.cte` is N/A ("Table 2 prints '-'"), and every family with `tim` maps to it (cowos_l and others).
- Scan of every generated default material key through `resolve` (need k, elastic, cte):
  - 65 keys, 6 failures: tim (cte), `other` (by design), epoxy_generic (elastic), glass_en_a1 (k).
  - Every `homog:` key resolves (column and sheet kinds, void matrix, template-key constituents).
- **Fix:** case-level maps or overrides with sources, or a sourced TIM CTE, before L8 runs these cases.

### Minor

- **M1. Picard probe misses some T dependence** (thermal/index.mjs:195-210). T dependence is probed only at T0 +- 10 K,
  so a k(T) table that is flat near T0 but varies within the solved range skips Picard.
- **M2. Energy balance is not a discretization check** (thermal/index.mjs:534-540). `balance_rel` is a solver-residual
  identity (reaction from the assembled rows), not a discretization check. The 1e-10 gate verifies the solver, not
  the physics; label it so.
- **M3. Two symmetry tolerances disagree.**
  - The family `symmetry()` uses tol 1e-4 mm (families/boxes.mjs:105).
  - The grid mirror check uses 1e-6 mm (grid/index.mjs:66).
  - Effect: offsets between 1 nm and 0.1 um make `allowed` include quarter while the grid rejects it.
- **M4. Rule false negatives** (10 parameter combinations tried; 9 behaved as expected):
  - **Touching bumps accepted:** ubump d/p = 0.975 (f = 0.747) passes. resolve.mjs:484 rejects only d >= p.
  - **HBM-edge rule cannot fire on gap growth:** the reach is die gap + 0.5 mm (rules.mjs:77), so it grows with the
    gap. A 5 mm gap is caught only by die_outside_interposer.
  - **Duplicate issues:** one cause is listed up to 24 times (stiffener_overlap).
  - **No false positive found.** cowos_l with soc_n 1 warns die_exceeds_field correctly: the single die becomes
    18.7 x 56 mm.
- **M5. One reported CTE axis dropped.** sims/si_interposer_peers/xilinx_tsv_lid.yaml:48 maps the core CTE to an
  isotropic 11 ppm/K although Table 2 gives z = 16. The override shape (SPEC 11) has no per-axis CTE.
- **M6. Override CTE kind unspecified.** materials/overrides.mjs:85: a numeric `cte_ppmK` override defaults to
  `instantaneous`. SPEC 11 does not say so; datasheet CTEs are usually means (secant). The difference is zero for
  constants, not for future T-dependent overrides.
- **M7. Missing license lines.** About 35 new non-port files have no license line: tests, families, mech, la/block.mjs,
  materials/overrides.mjs, and 7 app/src/lib/sim files. All 9 EO ports and the vendored robust-predicates carry
  correct headers (commit eb97f96, local changes listed; units.mjs lists the K-dimension change).
- **M8. HBM3 / HBM3E height source.** The 720 um height cites one sentence of
  vlsitechnologyandcir65830.2026.11577576 about HBM development generally (text line 69). Footprint refs resolve:
  - ectc51909.2023.00154-a-c4: 11 x 11;
  - ectc51909.2023.00135-a-c2: 11 x 10;
  - ectc32696.2021.00315-a-c2: 685 um;
  - ectc51529.2024.00049-a-c2: 11 x 11.
- **M9. MMS coverage.** MMS (thermal-verify) uses Dirichlet on all faces. Robin is covered by TA1 and TA3, and Neumann
  by TA1. There is no MMS with Robin.

## Checks that passed (independent re-derivation)

### 1. Thermal physics

- **Q1 element matrix** (thermal/assemble.mjs:2-5, 95): kx hy hz / (36 hx) S M M = kx (1/hx) S (hy/6) M (hz/6) M.
  - Robin term: h a b / 36 M x M, load h T_inf a b / 4.
  - Uniform source: q V / 8. Mass: rho cp V / 216 MMM.
  - Cross terms (L4-7): int N_a' N_b = +-1/2, giving exy, exz, eyz as coded; the TA6 rotated test is exact to 1e-13 K.
- **Dirichlet elimination** (assemble.mjs:190-225) is symmetric: column entries 26 - s are moved to the RHS.
- **Sources and fluxes under symmetry:** power_W / (V_crop x symFactor) with a mirror-closed check
  (index.mjs:289-293); heat_flux power_W / (selArea x symFactor); patch q from the full rectangle and area from the
  crop (index.mjs:308, 323). The full-model heat totals are correct.
- **Singular problems:** a pure-Neumann body is detected before the solve (unanchoredBodies, index.mjs:582-626), with
  node-sharing connectivity, so a floating island named by its parts is caught.
- **MG assumptions hold:**
  - the z-line pivots come from SPD principal submatrices;
  - the 4-colour sweep is an exact block solve and its order is reversed post-smoothing, so the V-cycle is symmetric;
  - fixed rows get zero interpolation weight and zero residual.
- **TA1 by hand:** R = 0.052365 + 0.1 + 0.051282 + 1 = 1.203647 K/W, so T_bottom = 145.3647 C. TA2: +0.1 K/W, giving
  155.3647 C and a 10.0 K jump.
- **TA4 by hand:** m = 23.452 1/m, mL = 0.46904, q / theta_b = 0.020920 W/K.
- **TA5 by hand:** alpha = 9.0098e-5 m^2/s, theta 0.761151, T 48.8849 C, flux rise 2.28850 K.

### 2. Materials

- **CTE rebase** (eval.mjs:137-142): derived independently as (eps_m(T) - eps_m(Tr)) / ((T - Tr)(1 + eps_m(Tr))).
  Hand values for 150 C -> 25 C:
  - Cu 17 ppm/K constant: 16.9625 ppm/K;
  - EMC bilinear 7/25 ppm/K at Tg 140 C: (805 + 250) / 125 / 1.00109 = 8.4308 ppm/K.
  Both equal the library output.
- **Cubic averages:** directional E is 1 / E = s11 - 2 (s11 - s12 - s44/2) J. Hill: GV = (C11 - C12 + 3 C44) / 5,
  GR = 5 / (4 (s11 - s12) + 3 s44). The Bond matrix blocks are correct for the passive a used (see S5).
- **Homogenization formulas:** ROM, Voigt, Reuss, Turner (axial) and Schapery (transverse) as coded. The void matrix
  gives f k1 and f E1 axially and 1e-5 elsewhere; the compliance is positive definite.
- **Units:** ppm/K 1e-6, GPa 1e9, MPa 1e6, W/cmK 100, g/cm3 1000, uohm cm 1e-8 ohm m, % 0.01.
- **12 random cached-source leaves** (seeded sample of 144 local_cache leaves), checked against text.md or page
  renders. Verified (11):
  - Si CTE 3 ppm/K, ectc.2011.5898527 Table 2;
  - liner IL 81.1 GPa and PL 2.62 GPa, ectc51846.2026.00074 Table II;
  - tcpmt.2025.3614186 Table II p.6 (page_06 render):
    - bump underfill CTE 3.10E-5 (-50 to 83 C) and 1.19E-4 (93 to 250 C);
    - solder mask E 2.4 GPa, G 0.93 GPa, nu 0.29;
    - IMC E 51.72 GPa, G 19.89 GPa, nu 0.3;
  - SnAg CTE 2.05E-5 / 2.50E-5, Table III p.7;
  - BCB CTE 42 ppm/K, ectc51529.2024.00392 Table II;
  - ABF GL-102 nu 0.29, ectc51846.2026.00103 (a template analog for abf_gx);
  - CUF alpha1 26 ppm/K, ectc51909.2023.00155 Table 8 (page_03 render; the EMC row 18,000 / 400 MPa, 7 / 25 ppm,
    Tg 140 C also matches);
  - solder resist k ~0.2 W/(m K), ectc51846.2026.00119 lines 60 and 132 (a template analog for abf_gcp).
- **Not verifiable (1):** SAC305 E(T) digitized from Motalab 2012 Fig. 11. No p.9 render is cached and no PDF renderer
  is installed.
- **Si Cij:** 165.6 / 63.9 / 79.5 GPa from Hopcroft Table III, with the Eq. 7 rounding difference noted in the entry.

### 3. Families

Every ref in three cases resolves to the stated DB cell, with matching values:

- **cowos_r/thermal_rjc:** 19 refs, including the comment refs:
  - -c-m2 1866 W; -c-m6 Tc 84.6 C;
  - -c-L01 lid k 390; -c-L05 Si k(T); -d-m20 29.6 %;
  - consistency (104.9 - 84.6) / 1866 = 0.01088 C/W against -c-m1 0.0108 C/W.
- **si_interposer_peers/xilinx_tsv_lid:** 25 refs:
  - Table 2 values;
  - b-m2 / m3 / m4 variants match the study semantics (C4 UF stage; 1.0 mm lid on 42.5 mm).
- **fcbga_organic/substrate_warpage:** 10 refs.

### 4. EM 2D closed forms (from the formulas, not memory of results)

- **Quasi-static line formulas:**
  - Hammerstad-Jensen Z01, eps_eff, a, b and the thickness correction (du1, dur);
  - CPW: C = 2 eps0 (eps_r + 1) K(k)/K(k'), Z0 = 30 pi / sqrt(eps_eff) K(k')/K(k);
  - Cohn stripline 30 pi / sqrt(eps_r) K(k)/K(k');
  - coax.
- **Conductor impedances:** round wire k J0 / (2 pi a sigma J1) with k = (1 - j)/delta; slab coth real and imaginary
  parts.
- **RLGC and DS signs:** DS basis sign (Im < 0 for exp(+j w t)); G = -w Im C*.
- **Network transforms:** chainToY from [V2; I2] = T [V1; I1] with inward far-end current; S = (I + Yn)^-1 (I - Yn)
  with Yn = sqrt(Z) Y sqrt(Z); Bockelman-Eisenstadt M orthogonal.
- **Touchstone 2.0:**
  - [Version] 2.0 is first after comments;
  - option line;
  - [Number of Ports], [Two-Port Data Order] 21_12 for 2-port, [Number of Frequencies], optional [Reference];
  - [Network Data], [End];
  - at most 4 pairs per line for n >= 3.

### 5. Validation

- **Six tier-A values recomputed independently:**
  - TA1, TA2, TA4, TA5 (above);
  - MA5 runnable CLT kappa -5.51134e-3 1/m and bow -6.20025e-5 m (Timoshenko n = 1), Stoney 5.5344e-3 1/m with
    Q = 180.5 GPa;
  - MA7 p = 1.45048e8 Pa from displacement continuity. Plane-strain derivation:
    (1 + nu1)(1 - 2 nu1)/E1 + (1 + nu2)/E2 = 1.3528e-11 1/Pa against a misfit of 1.9622e-3.
- **MA1:** eps = 2.6e-4.
- **Seven C/D targets equal their DB rows:**
  - itherm45881.2020.9190542-a-m3 0.065, -m11 0.021, -m22 2.1;
  - ectc51529.2024.00155-g-m1 263, -a-m19 -85, -e-m3 645;
  - ectc51909.2023.00302-c-m3 40.776.

### 6. Rule compliance (engine/, sims/, validation/, DevLog/lanes/, app/src/lib/sim, app/src/routes/sim)

- No emoji (scripted scan).
- No absolute local paths (user-home, temp and system prefixes grepped).
- No ~/Downloads use. The "downloads" hits are config/sim/manual_downloads.md, a repo file.
- No private-context names (employer, startup): all "lambda" hits are math symbols.
- No current / recent / now wording in sims, validation cases or material data.
- Every sims/ number with status template, user, public or derived carries a note or ref.

## 7. Contract consistency (SPEC as written vs code)

| # | SPEC text | Implementation | Mismatch |
|---|---|---|---|
| C1 | Sec. 3: `selections` keyed `top:/bottom:<part>` for parts | grid/index.mjs:336 skips parts with no cells | case selections valid by name fail (B1) |
| C2 | Sec. 7 "Pending (requested by L4)": contact_resistance, source_patch, thermal_transient, temperature_field, full-tensor k | all implemented (thermal/index.mjs, transient.mjs; thermal-wave2 tests) | SPEC still lists them as pending; `interface:<a>|<b>` and `<a>/<b>` both accepted |
| C3 | Sec. 10 "Requested (parser support in progress)": study `params`, `stress_free_C`, `geometry`; target `study`, `reference_study`, `definition`, tolerance forms, `Rjc_C_W` | implemented in thermal/case.mjs:22-31, 121-157 | SPEC not updated |
| C4 | Sec. 7 heat_flux {q_W_m2 or power_W} | also `flux_W_m2` alias (thermal/index.mjs:29) | undocumented alias |
| C5 | Sec. 2 homog key `homog:<array kind>:<base materials>:<area fraction>` | `homog:<kind>:<inclusion>+<matrix>:<f>[:axis]` with kind mapping (tmv -> via_field) | Sec. 2 stale (Sec. 8 and 10 are right) |
| C6 | Sec. 8 `rdl_layer` default axis `xy` | families never pass the route `dir` | see S3 |
| C7 | Sec. 11 `cte_ppmK` number | defaults to `instantaneous` | kind not specified (M6) |
| C8 | Sec. 12 active R for cubic `rotation_z_deg` | materials/cubic.mjs passive; mech active | S5 |
| C9 | Sec. 4 resolve shape | k [kx, ky, kz]; elastic iso E_Pa / nu, ortho 9 constants, cubic + orientation; cte {kind: secant, Tref_K, alpha} | consistent |
| C10 | Sec. 5 results | Tmax_C {value, part}; heat_in / out full-model; timing keys | consistent |

## Recommended order

1. B1 (run every case once; fix the selection-of-covered-part class).
2. S2 and S3 (homogenization).
3. S5 (one-line sign fix plus a test).
4. S1 (MG anisotropy).
5. S4 (CD1 reporting).
6. S6.
7. S7, S8, S9.
8. The minors.
