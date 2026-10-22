---
title: Lane L27 - materials library follow-ups (audit A8) and mechanics viscoelastic case-level wiring (E8)
date: 2026-10-21
status: wrapped up 2026-10-22 (Parts A, B and A7 items done; Part C not started per coordinator, drafts reverted)
scope: engine/data/materials/, engine/src/materials/ (not overrides.mjs), engine/src/homog/rve_table_defaults.json (Part A rows only), engine/src/mech/ (Part C), engine/tests/materials*, engine/tests/mech-visco* (new), validation/reference (visco scripts), this file
owner: lane L27 (Claude subagent, DevLog-013), materials-library owner after L21; mechanics viscoelastic path from Part C
---

# L27: materials (A8 follow-ups) and viscoelastic wiring

Binding inputs: DevLog-013 shared rules and 2026-10-21 entries; DevLog/lanes/L21-materials.md; audit
DevLog/audits/round1_audit_A8_2026-10-21.md; DevLog/lanes/L8-mech.md (E8 skeleton); sims/SPEC.md sections 8, 11, 18,
20-23.

## Plan (2026-10-21 19:07 PDT)

Part A (urgent; L26 runs cases that use it): coordinator decision on A8 S1, approved by Wentao 2026-10-21.
1. silicone_adhesive default nu 0.495 -> CD4 placeholder 0.30; sensitivity -0.05 / +0.195 (0.25-0.495) with
   rationale (RT stiffness: E 358 MPa at 25 C, K 11.9 GPa with 0.495).
2. Keep 0.495 as a labelled elastic alternative "rubbery-state PDMS analog (Mueller 2019)" (same E table).
3. YAML caveat states the RT stiffness issue; `missing` extended.
4. Tests: wave-3 test and the L21 silicone test updated with before / after comments; template-policy test.
5. Materials tests; RVE fingerprint check over the whole table (rebuild rows only if a row uses silicone).

Part B (A8 minors owned by materials): M1 shift note +41.6; M2 Ea 401450; M3 Fig. 12 legend swap; M4 Frobenius
norm 3.3e-4 (notes); M5 Okada vs Swenson "within 0.06 ppm/K" (instantaneous 0.053); M6 Read 14 vs 16 tests; M9
machine-readable `analog_of` on cte_pdms_sylgard184 and the EMC tier-2 block (schema additive); M10 library.mjs
comment placement; M11 Anand params whitelist (ANAND_PARAMS), `verified_on` on new nested alternatives.
Added by the coordinator (2026-10-21 19:08): si_crystal has no cp, so thermal_transient fails on every Si case
(found by L24). Add a sourced Si cp(T) (cached reference or a citable public primary source read now, URL +
retrieval date), check density / cp of the other materials used by transient cases, test a transient Si case.

Added by the coordinator (2026-10-21 ~19:20): audit A7 finished; L27 also owns engine/src/homog/ and engine/src/mech/
for A7's findings, before Part C: S1 (k-only RVE table hits served full-row k), M1 (pytest for the scikit-fem tangent
FD check), M2 (engine-side text only), M4 (column smoother setup), M5 (column Cholesky error routed to the named error),
M6 (perturbed pivots), M7 (Newton count after a switch; `switched` on every step), M8 (inverse-iteration measure).

Part C plan (2026-10-21 19:29 PDT, before implementation):
1. `piecewise` shift in mech/viscoelastic.mjs shiftFactor (below Tc: `below` branch, at and above Tc: `above`; the
   source branches are not continuous at Tc (about 0.95 decade in a_T at 90 C): kept as stored, stated).
2. Library -> solver spec: `veFromLibrary(lib, key, {scaling})` in mech/viscoelastic.mjs: Prony g_i, tau_i and shift
   from `lib.tier2(key, 'viscoelastic')`; instantaneous modulus E0 by a required, labelled scaling:
   `as_is` (E0 of the analog Prony set, 6.431 GPa for emc) or `glassy_default` (proportional scaling to the default
   grade's library E at 25 C, 18 GPa for emc; same g_i, tau_i, shift). nu and CTE stay the library default grade's
   (stated). Resolver wrapper: VE keys resolve their elastic block as {E0, nu} (thermorheologically simple: E(t, T) =
   E0 g(xi)); other materials as before (held at the history's start temperature by the skeleton: warned).
3. Case level (mech/case.mjs, runMechCase): study type `viscoelastic` handled like process_sequence (validated in
   mech/case.mjs, filtered before L1's parseCase): keys id, type, note, params, geometry, history [{t_s, T_C,
   substeps?}] (uniform T, piecewise linear), substeps, stress_free_C, supports, element, viscoelastic {materials
   [keys], scaling as_is | glassy_default | [both]}. One result per scaling with steps (t_s, T_C, warpage,
   sigma_mean_Pa) and `viscoelastic` provenance (source, locator, analog_of, scaling rule, E0 used / model, factor,
   shift, Tref, nu / CTE origin, warnings). Targets on these studies: unchecked (stated). The parse-time refusal in
   thermal/case.mjs (not mine) blocks the CLI path: request to the coordinator.
4. process_sequence with viscoelastic steps: assess; not this round unless tractable (process.mjs is elastic per step).
5. Gates (tests/mech-visco-l27.test.mjs): (a) constant-strain relaxation with the emc tier-2 data (both scalings) =
   E0 g(t) of the stored Prony sum; (b) cooling ramp across Tc (piecewise shift) vs the hereditary integral (fine
   trapezoid, library CTE path); (c) EMC-on-Si bilayer, step cooling then isothermal hold: FE central curvature vs
   classical lamination theory with the correspondence principle (biaxial film modulus s M(s) of the Prony series,
   numerical Laplace inversion by the fixed Talbot method; independent of the FE time stepping), with the FE/CLT
   spatial-model offset calibrated by the two elastic limits; run through runMechCase with both scalings. Existing
   L8 gates (mech-ve.test.mjs) unchanged. Elastic default results unchanged (VE only on request).

## TODO

- [x] Part A: silicone nu placeholder restored, alternative, caveat, tests, RVE check
- [x] Part B: M1-M6, M9-M11; Si cp; transient check (Cu cp extended; RVE rows refreshed)
- [x] A7: S1, M1, M4-M8 (M2: no engine-side text)
- [ ] Part C: NOT STARTED this round (coordinator 2026-10-22: commit now). Exploratory drafts were reverted to HEAD
  (see "Part C pending" below)
- [x] Final report

## Progress log

- 2026-10-21 19:07 PDT notes started; inputs read (DevLog-013, A8, L21 notes).
- 2026-10-21 19:08 PDT **Part A complete.**
  - tims_adhesives.yaml silicone_adhesive.properties.elastic.nu: 0.495 (template analog_of PDMS, delta -0.045 /
    +0.004) -> 0.30 (template placeholder, delta -0.05 / +0.195 = 0.25-0.495) with `rationale` (A8 S1: E 358 MPa at
    25 C; K = E / (3 (1 - 2 nu)) = 11.9 GPa with 0.495 vs 0.30 GPa with 0.30, 0.24 GPa with 0.25; 194 GPa at -40 C).
  - New elastic alternative `pdms_rubbery_analog_nu` (E = default ECCOBOND 3005 table, nu 0.495 analog_of PDMS
    Sylgard 184 rubbery state, delta -0.045 / +0.004; note with the K(T) list 264 / 194 / 82 / 11.9 / 1.73 GPa at
    -65 / -40 / 0 / 25 / 150 C). Runner sensitivity uses only `properties.` rows, so the alternative adds no runs.
  - `missing` now names the filled-silicone nu / bulk-modulus gap at every temperature.
  - Tests: materials.test.mjs "wave-3 entries" (before / after comment; default 0.30 placeholder, alternative
    0.495) and template-policy nu-delta rule; materials-l21.test.mjs silicone test (before / after comment; bounds
    0.25 / 0.495 from the listed row; overrides 0.25 / 0.45 / 0.495 / 0.499 admissible).
  - `nice -n 10 node --test tests/materials*.test.mjs`: 46/46 pass (6.0 s).
  - RVE table: 0 rows use silicone_adhesive; fingerprint check of all 625 rows against the working-tree library
    (k-only and full fingerprints): 0 stale. No rebuild.
- 2026-10-21 19:10-19:16 PDT **Part B (A8 minors)** done:
  - M1 encapsulants.yaml emc shift note: "about +71" -> +41.6 at 60 C (+45.2 at 80 C), recomputed from Eq. 9 with
    T0 = 200.5 K, H 401 kJ/mol, R 8.314 (41.642 / 45.207).
  - M2 Ea_J_mol 401448 -> 401450.7 (H ln10 / 2.30 = 401000 x 1.0011240 = 401450.7). Note: A8's own figure 401449.8 is
    an arithmetic slip; the stored value follows the recomputation (relative change 6.7e-6, no effect).
  - M3 Fig. 12 legend line-style swap recorded in the emc shift note (attributed to A8's vector-data check; not
    re-checked by L27).
  - M4 (L21 notes wording, recorded here because L21-materials.md is not in my write paths): the RVE C6 change by L21
    is a Frobenius-norm-relative change, max 3.30e-4 (A8), not "<= 2.6e-4".
  - M5 silicon.yaml cte_okada1984 `use`: "within 0.06 ppm/K" (secant max 0.0495, instantaneous max 0.053).
  - M6 metals.yaml read2004_film_curve locator: text p.67 Sec. 3.1 says 16 tensile tests 'reported in Table 1',
    Table 1 rows list 6 + 3 + 2 + 3 = 14 (checked in references/j.mee.2003.09.012/text.md).
  - M9 machine-readable `analog_of` on cte_pdms_sylgard184 and the emc tier-2 viscoelastic block; schema: `analog_of`
    allowed on any leaf (non-empty text); provenance exposes it for non-template leaves (additive).
  - M10 library.mjs: aliasTemplateKey doc comment moved back above its function.
  - M11 tier2() Anand params = whitelist ANAND_PARAMS (+ verified_on returned); verified_on on all nested tier-2
    alternatives (Zhang x3, Cheng, Read: 2026-10-21; Motalab x2: 2026-10-20, present in HEAD under the parent block
    verified 2026-10-20); schema requires verified_on on nested alternatives.
  - M7 (Read curve preload) and M8 (CD1 letter, coordinator) are not materials-lane items: untouched.
- 2026-10-21 19:09-19:22 PDT **Si cp (coordinator addition, L24 finding)**:
  - si_crystal cp = NIST-JANAF (Chase 1998, JPCRD Monograph 9 p.1881, Si reference-state table; web table
    https://janaf.nist.gov/tables/Si-001.html and the scanned page, retrieved 2026-10-21; A_r 28.0855 read from the
    page render): Cp / A_r at 100-700 K (712.1 J/kg K at 298.15 K). si_hr inherits it. Source `janaf_si_1998`.
  - cu_bulk cp extended 400-700 K from NIST-JANAF Cu (p.1005, A_r 63.546; `janaf_cu_1998`, retrieved 2026-10-21);
    200-300 K NIST-cryo fit values unchanged; join step 1.2 % at 300 K stated (inside the fit's 5 %). Reason: with
    Cu cp ending at 300 K, any transient starting above 26.85 C failed on Cu.
  - Transient check: test runs solveThermalTransient on a library si_crystal slab (adiabatic, flux q), bottom rise
    60.18417 K vs quasi-steady closed form 60.18431 K (rel 2.3e-6); energy balance < 1e-10.
  - Conduction-only RVE entries (kEntry) now carry rho and cp by the same mixture rule as full entries (rho = sum f
    rho_i, rho cp = sum f rho_i cp_i, nominal fractions; null when a constituent lacks it), so homogenized TSV layers
    work in transients.
  - Coverage gap (reported, not filled): at 25 C only 8 of 54 library keys resolve both rho and cp (glass_bf33,
    sio2_fused, cu_bulk, cu_electroplated, cu_lid, ss304, si_crystal, si_hr); 38 lack rho, 46 lack cp (all organics,
    emc, underfills, laminates, solders, Ni, Au, Al, Ti, SUS430, TIMs, adhesives). glass_bf33 / sio2_fused / ss304 cp
    stop at <= 100 C. So thermal_transient still fails on almost every package case (e.g. hbm_stack with a transient
    study: emc.cp N/A). Needs a sourcing lane.
- 2026-10-21 19:16-19:22 PDT **RVE table refresh** (`engine/src/homog/rve_table_defaults.json`; backup of the pre-L27
  file in the session scratchpad `L27`-prefixed): rows recomputed live with the table cfg where stale; diff vs the
  pre-L27 file: 535 of 625 rows changed in fp_k (513), fp (94), rho (153: k-only rows now carry rho), cp (39);
  C6, alpha6 and k bit-identical in every row (max relative change 0). Fingerprint check after: 0 stale of 625.
- 2026-10-21 19:20-19:27 PDT **A7 findings**:
  - S1 homog/resolver.mjs indexTable: k-only lookups use k-only rows only (every tabulated key with full rows also
    has k-only rows: 41 such keys, 0 keys lose thermal coverage). Changed answers: 36 (canonical key, T) pairs, all at
    298.15 K, k moves by up to 1.74e-2 relative (largest: microbump cu_electroplated+underfill_cuf:0.2277 1.74e-2,
    rdl_layer cu_electroplated+polyimide_rdl:0.5 1.72e-2, +abf_gl:0.5 1.72e-2, +underfill_cuf:0.5 1.68e-2). Affects
    thermal studies evaluating these homog keys exactly at 25 C (the full rows' k no longer served). Test: all 53
    k-only exact hits at 298.15 K equal the live conduction RVE (k rel 0, rho, cp equal).
  - M1 validation/reference/tests/test_nonlinear.py: FD of R vs K v (h 1e-6 / 1e-7 / 5e-8 -> 1.15e-5 / 1.15e-7 /
    2.87e-8, h^2), symmetry 1.0e-16, R = dE/du; 3 passed in 1.0 s (`uv run pytest`), ruff clean.
  - M2: no engine-side text carries -32.01 (sim lane / RESULTS item).
  - M4 gmg.mjs: column grouping cached per numbering (WeakMap), loop index instead of blocks.indexOf.
  - M5 nonlinear.mjs: buildQ2sPMG inside the PCG try: a non-positive-definite column block now ends in the named
    "use linear 'direct'" error (tested by negating the tangent through onTangent).
  - M6 `perturbed_pivots` on every checked step and after branch switching; warning when > 0.
  - M7 `switched` (false / true) on every checked step; step Newton count sums every branch-switch attempt (test:
    equals the number of linear solves at step 7).
  - M8 inverse iteration: `mode_residual` (||K x - q x|| / |q|) and `mode_iterations` in attempts[].
  - mech-nl.test.mjs 6/6 unchanged (bifurcation reference within 1e-6 as before).
- 2026-10-21 19:29-19:40 PDT Part C plan written (above) and drafts explored: piecewise shift, veFromLibrary
  (as_is / glassy_default), a runMechCase `viscoelastic` study, an EMC-on-Si bilayer gate vs CLT + correspondence
  principle (fixed Talbot inversion; Talbot self-check on g(t) 1e-12). Scratch result (20 mm plate, 300 + 300 um,
  hold at 120 C after a 150 -> 120 C step): FE / CLT curvature ratio 0.9945-0.9975 over 0-1e5 s (both scalings),
  0.9973-0.9994 on a 40 mm plate (spatial offset, shrinks with plate size). Not part of the hand-off.
- 2026-10-22 00:1x PDT **wrap-up** (coordinator: commit now, Part C not started): Part C drafts in
  engine/src/mech/viscoelastic.mjs and engine/src/mech/case.mjs reverted to HEAD (both files had no other diff vs
  HEAD); drafts kept in the session scratchpad (L27/viscoelastic.partC.mjs, L27/case.partC.mjs, L27/bilayer.mjs).
  The emc shift note says piecewise is pending.
  - `node --test tests/materials*.test.mjs tests/homog*.test.mjs`: 66/66. `nice -n 10 npm test`: 330/330 (259 s,
    2026-10-22 00:20 PDT).

## Done / pending (2026-10-22)

Done: A (silicone nu 0.30 placeholder, bounds 0.25-0.495, PDMS analog alternative, RT stiffness caveat; 19:08 PDT
2026-10-21); B M1, M2, M3, M4 (recorded here), M5, M6, M9, M10, M11; Si cp + Cu cp extension + kEntry rho/cp; RVE
rows refreshed; A7 S1, M1, M4, M5, M6, M7, M8 (M2 nothing engine-side).

Pending:
- Part C (E8 case-level viscoelastic): piecewise shift, library conversion with explicit scaling, `viscoelastic`
  study, provenance, gates (constant strain, ramp across Tc, bilayer vs CLT/Talbot). Drafts in scratchpad; needs the
  coordinator to lift the parse-time refusal in thermal/case.mjs for the CLI path.
- rho / cp for 46 library keys (transients on package cases).
- A8 M7 (Read curve preload; plasticity lane), M8 (CD1 acknowledgment in DevLog-012; coordinator).
- SPEC additive: 18.1 note that k-only lookups use k-only rows; conduction-only RVE entries carry rho / cp; 21: nonlinear
  steps carry `perturbed_pivots`, attempts `mode_residual` / `mode_iterations`; 22: `analog_of` on any leaf, nested
  tier-2 alternatives need verified_on; wording "follow stays on the current (unstable) path" (A7 M7).
