---
title: Lane L26 - sim package cases 2 (L19 queue results to the ledger, A6-vetted warpage-input change list, sensitivity status on E_GPa overrides, L28 drift sync)
date: 2026-10-21
status: wrapped up 2026-10-22 00:17 PDT at the coordinator's request (commit); runs partly pending, see Hand-off
scope: sims/, engine/src/families/, engine/tests/families*, engine/src/materials/overrides.mjs + its test, validation/cases (package cases), validation/RESULTS.md, this file
owner: lane L26 (Claude subagent, DevLog-013); sim package case owner after L19
---

# L26: sim package cases 2

Inputs read: DevLog-013 (shared rules, all 2026-10-21 entries), L19 notes (Hand-off), validation/RESULTS.md,
validation/README.md, sims/SPEC.md sections 16-23, DevLog/research/2026-10-21-warpage-input-research.md (L23),
DevLog/audits/round1_audit_A6_2026-10-21.md (A6).

## Plan (2026-10-21 19:02 PDT, before edits or runs)

Rules: write only sims/, engine/src/families/, engine/tests/families*, engine/src/materials/overrides.mjs + its test,
validation/cases (package cases), validation/RESULTS.md, this file. No git writes, no retrieval, no subagents, no dev
servers. Heavy runs under `nice -n 10`, one at a time, own run list (not L19's queue). Every result carries the engine
stamp (all dirty: nothing committed; record the src / data hashes). Variants are labelled calibration / diagnostic /
sensitivity, never validation; nothing is tuned to a target.

Part A (L19 queue, session scratchpad `scripts/queue.sh`, `jobs_2.txt`): do not kill or restart. As each job ends,
summarize (`scripts/summ.mjs` or runner JSON) and add ledger rows (case, study, T, target, value, verdict per the
validation case, homog, stamp, source L26). cowos_s rows carry "target sign under review (L23/A6)" until B1 lands.
Do not edit a case file whose queued job has not run (check `.done` markers).

Part B (A6 dispositions of the L23 list):
1. cowos_s: explicit JEITA target values (TV1 +198 at 25 C, -153 at 250 C compared at 225 C; TV2 +250 / -173) with
   provenance (Fig. 4 legend "(-) Convex" = dome, "BGA side is up", p.2 text; A6); assumption text fixed. Edit after
   the queued `cowos_s_all` job ran (or put in the validation case first if it is not read by the run).
2. Substrate membrane CTE variants (labelled): 120 mm via template core thickness or build-up Cu toward 11.97;
   cowos_s toward ~15 (MediaTek, labelled variant); cowos_l 11.97-15 as a labelled related bound. Method: CLT
   membrane CTE (A^-1 N) as in A6, computed with the engine generator and library (script in the scratchpad).
3. cowos_s ring variants: width 8.6-19 mm (nominal 9), thickness 2.5 mm, adhesive ring attach as a process sequence at
   150 C (bounds 130-180 C).
4. cowos_l lid / TIM attach as a process sequence; TIM variant film polymer vs indium with a consistent sourced E / nu
   pair (or a bracket); targets sign-agnostic.
5. 120 mm rerun with the item-2 substrate route and package-stage Tsf 180 C bound.
6. 50 mm: shrinkage bracket kept; insulation 21 % out of default runs; above-Tg flag; "E 32 GPa as printed".
7. Xilinx: lid foot 2 mm labelled low-confidence variant; no substrate-at-Cu-CTE variant.
8. Optional bare-substrate SR-opening sign-only variant.
9. SR ceiling unchanged.

Part C: `sensitivity` status on `E_GPa` overrides (overrides.mjs, admissibility kept) with a test; later the L28 drift
sync on coordinator forward (`node --test tests/families*.test.mjs`, s1 re-runs).

## TODO

- [x] A: L19 queue jobs that completed recorded in RESULTS.md (cowos_l s2 / s3, ring48x, fcbga s2h, fcbga bare s2h);
      the rest failed at 19:13 (library parse error) -> my run list (cowos_s_all done; others pending)
- [x] C1: sensitivity status on E_GPa overrides + test
- [x] B2: membrane-CTE script; variant routes per case (files written; cowos_s and cowos_l runs done)
- [x] B1: cowos_s JEITA targets (validation case D + sim-case target values + assumption text)
- [~] B3: cowos_s ring variants run (width / thickness); ring attach sequence case written, not run
- [~] B4: cowos_l lid attach case written (run in progress at wrap-up, unrecorded); indium diagnostic case written, not run
- [~] B5: 120 mm substrate route variants + Tsf 180 case written, not run
- [x] B6: 50 mm notes / flags / shrinkage bracket key (run pending)
- [~] B7: Xilinx foot 2 mm variant written, not run
- [ ] B8: optional bare-substrate SR opening: not done (no family knob)
- [x] B9: SR ceiling unchanged
- [x] PLATE-NL row (coordinator, A7 M9)
- [ ] C2: L28 drift sync (no forward received)
- [x] Hand-off

## Progress log

- 2026-10-21 19:02 PDT: inputs read; plan written. Queue state: cowos_l_s2_v2 done 19:00:30 (rc 2 = target miss),
  cowos_l_s3_v2 running.
- 2026-10-21 19:05 PDT: Part C1 done. `engine/src/materials/overrides.mjs`: `E_GPa` joins the fields that accept
  status `sensitivity` (admissibility checks unchanged: E > 0, isotropy rule, stiffness check over the valid range);
  header comment updated. Test `engine/tests/materials-overrides.test.mjs` "status sensitivity on E_GPa" (accepted,
  provenance `override_status: sensitivity`, `sensitivity_bound: true`; E 0 / -1 / NaN refused; cubic Si without nu
  refused; cp still refuses the status). The old assertion in `engine/tests/materials.test.mjs` (wave 8, "E_GPa refuses
  sensitivity") now checks `rho_kg_m3` instead (one line; needed to keep the suite green, flagged to the coordinator).
  materials-overrides + materials tests 36 / 36.
- 2026-10-21 19:06 PDT: coordinator message: audit A8 -> silicone_adhesive nu default back to 0.30 (L27 applying);
  0.495 = rubbery alternative and upper bound (bounds 0.25-0.495). Queue jobs with silicone_adhesive run before L27's
  completion are recorded as "silicone nu 0.495 (upper bound)" and the defaults re-run after L27. Checked: the
  cowos_l lid model (warpage_rt_ht) contains no silicone_adhesive (generator material list), so cowos_l s2 / s3 are
  unaffected; cowos_s base (ring_attach none) has none either.
- 2026-10-21 19:08 PDT: B2 membrane CTE (A6 script copied to the session scratchpad `L26/scripts/subcte.mjs`, plus
  env overrides). Reproduces A6: cowos_s 9.58, cowos_l 8.92 / 8.84, 120 mm 9.47, Xilinx 14.55 ppm/K (25 C, secant from
  the case Tsf). Routes (template inputs only):
  - 120 mm (core material reported, Table IV): core thickness with the 1.8 mm template total held (dielectric
    65 ppm/K closes it): 1000 um 12.29, 1030 um 12.03, 1040 um 11.95 (12.11 at 225 C), 1050 um 11.86, 1100 um 11.46.
    Build-up Cu route cannot reach 11.97 (20 um -> 10.12; 25 um makes the dielectric negative). Chosen: core 1040 um.
  - cowos_s (core material and thickness template): core CTE constant 13.91 ppm/K -> 15.00 (16.83 at 225 C). Core
    thickness route (A6 example) 800 um -> 14.18 but the template closure then makes build-up Cu 64.4 um per level
    (kept as a geometry-route variant only). Dielectric-closure route: 600 um -> 13.71 only.
  - cowos_l (core thickness reported 1.4 mm, core material template): core CTE 10.58 -> 11.97 / 11.92, 14.24 ->
    15.00 / 14.98 (related bounds; 00091 states none).
- 2026-10-21 19:10 PDT: B1 validation case `validation/cases/D/ectc51909.2023.00135-cowos_s.yaml` (new; JEITA mapping
  with provenance, TV1 / TV2 measured rows as printed plus `jeita_um`; TV2 recorded only, no sim case);
  check_db_targets 0 errors (63 files). Sim-case targets wait for queue job cowos_s_all.
- 2026-10-21 19:11 PDT: variant files `sims/cowos_s/variants/substrate_ring_inputs.yaml` (7 variants; ring width
  upper bound 19 mm fits only along x on the 85 mm TV, y capped at the 9.9 mm fit limit) and
  `sims/cowos_l/variants/substrate_cte_bounds.yaml` (2); dry-checked (geometry, parse, library). Own run queue started
  (session scratchpad `L26/scripts/queue.sh`, `L26/jobs_1.txt`, logs `L26/logs/`): cowos_s s2 / s2h variants, cowos_l
  s2 / s3 substrate bounds.
- 2026-10-21 19:13 PDT: coordinator (A7 M9): PLATE-NL verification row added to validation/RESULTS.md (bifurcation
  -32.00 +- 0.02 K, engine = scikit-fem reference to 2.7e-8; sources L20 notes task 2, A7). Noted: case key
  `nonlinear.branch` now accepted by case validation (coordinator fix).
- 2026-10-21 19:12 PDT: B4 case `sims/cowos_l/warpage_lid_attach.yaml` (new; params copied from warpage_rt_ht; coarse
  common mesh for the direct process-sequence solver; studies s1, s2, s3 (same-mesh single-step reference),
  lid_attach_125, lid_attach_180, module161_lid150; attach at 150 C with the module at 150 C equals s2 / s3 exactly, not
  run). families_cases test passes for it.
- 2026-10-21 19:15 PDT: L19 queue ended early: from 19:13:21 every remaining job (glass s2h / s3h, cowos_s_all,
  fanout_all, sus430_variants, sus430_rigid, cu_subcte, emib s1 / s2, xilinx_s2) failed in 0.1 s with a YAML parse
  error in `engine/data/materials/encapsulants.yaml` line 244-245 (another lane's edit in progress; the library did
  not load). The queue script marks failures `.done` too, so it ran through and stopped; nothing was killed or
  restarted. Completed before that: cowos_l s2 / s3 (L21 library), ring48x all, fcbga s2h, fcbga bare s2h. The
  failed jobs move to my run list (session scratchpad `L26/jobs_2.txt`, `L26/scripts/queue2.sh`: waits until the
  library loads, `.done` only on rc 0 / 2, `.failed` otherwise, stdin from /dev/null); silicone_adhesive cases after
  L27's nu change.
- 2026-10-21 19:20 PDT: B5 files: `sims/si_interposer_peers/variants/substrate_a_cte.yaml` (core 1040 calibration,
  core 1000 / 1100 bounds; coarse common mesh) and new case `sims/si_interposer_peers/120mm_warpage_tsf180.yaml`
  (core 1040 + package stress-free 180 C, ectc51687.2025.00027 p.3 Sec. II.E; coarse mesh). B3: new case
  `sims/cowos_s/warpage_ring_attach.yaml` (ring 9 x 2.5 mm on the silicone adhesive frame, attach sequences at 150 /
  130 / 180 C, s2 / s2h same-mesh references with the ring bonded directly; JEITA target values with provenance) and
  `sims/cowos_s/variants/ring_attach_substrate.yaml` (sub_cte15_core). B7: `sims/si_interposer_peers/variants/
  xilinx_lid_foot.yaml` (foot 2 mm, L confidence; no substrate-at-Cu-CTE variant). B6: 50 mm cases: insulation E
  32 GPa "as printed" note, above-Tg flag and 21 % shrinkage kept out (missing list); 50mm_quarter_e2 gets
  `materials.cure_shrinkage: both` (targets stay on the off run; EMC 0.16 % linear / volumetric bracket reported).
  B4b: new case `sims/cowos_l/warpage_lid_attach_indium.yaml` (diagnostic; indium TIM 200 um, attach at the melting
  point 156.63 C, RT only; E 11 GPa with nu 0.45 / 0.35 bracket: no single-source pair in the repo, A6 M7, primary
  pair blocked on the L23 manual-download list). B8 (optional bare-substrate SR opening): not done, the fcbga_organic
  family has no SR-opening knob (would need a family feature; L9's top-SR-removed diagnostic +28 um already gives the
  sign). families_cases tests 26 / 26.
- 2026-10-21 19:2x-2026-10-22 00:08 PDT: own runs (session scratchpad `L26/logs/`): cs_var_s2 (19:11-21:04),
  cs_var_s2h_b (-22:10), cowos_s_all (-23:54, wall 6259 s), cl_sub_s2_b (-00:00), cl_sub_s3_b (-00:08); cl_lid_attach
  started 00:08. Smoke tests (tiny mesh) caught: cowos_l has no lid feet in the sc_rdl geometry (activate lists fixed
  to ["tim", "lid"]); cowos_s ring attach needs `allow_extrapolation: [silicone_adhesive]` (compliant, CD6; added).
  120mm_warpage_tsf180 smoke run exited 0. The indium case printed "materials.overrides used by no part: tim_indium"
  from the thermal-side unused-override check (map tim -> tim_indium); whether the mechanics solve used tim_indium is
  not verified yet.
- 2026-10-22 00:15 PDT: coordinator: usage limit hit; wrap up, no new work. queue2 runner stopped (00:16); the running
  cl_lid_attach job left to finish (its output is not recorded). B1 applied to `sims/cowos_s/warpage_corner_stress.yaml`
  (target values +198 / -153 with provenance, assumption text fixed) after cowos_s_all ran. Checks: families tests
  76 / 76, every touched case parses (parseCase), variant files parse, check_db_targets 0 errors (63 files),
  materials-overrides + materials 36 / 36.

## Results (2026-10-21 / 22; all rve, dirty stamps in RESULTS.md)

| Run | 25 C | 225 C | Note |
|---|---|---|---|
| cowos_s base (6.1e5 DOF) | -339.774 W | +169.119 W | target JEITA +198 / -153; s2 and s3-s7 hit PCG max_iter 3000 (relres 5.2-8.9e-7, accepted with warning) |
| cowos_s sub_cte15_core (calibration) | +340.741 W | -184.603 bowl | substrate CTE alone flips both signs to the measured ones |
| cowos_s sub_core800 | +299.223 W | -217.505 bowl | geometry route, same direction |
| cowos_s ring 9 / 9 x 2.5 / 8.6 x 2.5 / 19-9.9 x 2.5 | -372.6 / -351.8 / -346.7 / -402.3 | +185.1 / +169.7 / +167.4 / +186.7 | ring geometry moves 10-20 %, never the sign |
| cowos_s sub15 + ring 9 x 2.5 | +251.571 W | -135.210 bowl | 225 C within 153 +- 38 (calibration label) |
| cowos_l base | -250.738 bowl | +156.339 dome | gates: coplanarity miss / pass, ratio miss |
| cowos_l sub_cte1197 | -93.590 W | +71.061 dome | related bound |
| cowos_l sub_cte15 | +97.866 W | -15.873 saddle | related bound |

Reading: the substrate membrane CTE is the dominant lever for the CoWoS ring / lid cases (A6 hypothesis supported for
cowos_s: a sourced ~15 ppm/K substrate gives the measured RT dome and HT bowl, magnitude at RT 1.3-1.7x), ring
geometry is secondary. Not validation: the substrate CTE is calibrated to a stated value.

## Hand-off (2026-10-22 00:17 PDT)

Pending runs (one at a time, nice 10; `L26/scripts/queue2.sh` waits for a loadable library; commands as in the
variant file headers):
1. cowos_l/warpage_lid_attach (was running; read `L26/logs/cl_lid_attach_*.out` if it completed, else re-run).
2. cowos_l/warpage_lid_attach_indium: verify the mechanics grid used tim_indium (thermal-side unused-override warning).
3. cowos_s/warpage_ring_attach with `variants/ring_attach_substrate.yaml` (silicone nu 0.30 default since L27).
4. 120 mm: `variants/substrate_a_cte.yaml` and `variants/sus430_suspects.yaml` on 120mm_warpage
   (stiffener_attach_sequence), substrate_a_cte on 120mm_warpage_cu, and 120mm_warpage_tsf180.
5. Xilinx s2 with `variants/xilinx_lid_foot.yaml` (base = the default re-run with silicone nu 0.30).
6. 50mm_quarter_e2 s2 (cure_shrinkage both).
7. L19 jobs that failed at 19:13: glass s2h / s3h, fanout_all, emib_t s1 / s2, sus430_rigid (L19 scratch variant).
8. cowos_s 25 C studies do not converge to rtol 1e-7 in 3000 PCG iterations (relres 5-9e-7): try
   `gmg.smoother: column` or a higher max_iter before trusting the C4-sweep ratios.
9. C2 L28 drift sync when forwarded. B8 needs a family SR-opening feature (optional).

Requests for the coordinator: (a) one-line change in `engine/tests/materials.test.mjs` (wave 8 assertion moved from
E_GPa to rho_kg_m3 because E_GPa now accepts status sensitivity); (b) new tracked folders `sims/<family>/variants/`
(variant files read by `src/runner/node.mjs --variants`; outside the app glob `sims/*/*.yaml` and the families test);
SPEC note proposed (additive): "variant files live in sims/<family>/variants/ (runner/variants.mjs format)"; (c) the
indium E / nu pair stays blocked until a primary source (Kim and Ledbetter 1998 full text) is read.
