---
title: L4 lane notes - D3 validation set MVP plus tier H
date: 2026-10-20
lane: L4 (DevLog-012)
write_paths: validation/cases/{A,B,C,D,H}/, validation/expected/, validation/README.md, this file
status: done (wave 1), 2026-10-20
---

# L4: validation set MVP (D3) plus tier H

Binding inputs: DevLog-012 (lanes, shared rules), sims/SPEC.md sections 1 and 6, DevLog-010 (D3 row, E1/E2 gates,
Decisions item 3: tier H), R6 `DevLog/research/2026-10-20-sim-validation-set.md`, R3 `...-sim-em-regional-method.md`
sections 4-5, audit `DevLog/audits/sim_proposal_audit_2026-10-20.md` (S1: EM rows also in `electrical_interfaces.csv`;
S3: D3 MVP must include LE1/LE10 and the E2 gate cases).

## Plan (written before any case file)

1. `validation/expected/tier_a.py` (stdlib only, `uv run --no-project python`): recompute every tier-A expected value
   from the R6 formulas; print a table and write `validation/expected/tier_a_values.json` (consumed by nobody yet; the
   YAML carries the same numbers with a pointer to the script). Any disagreement with R6 is recorded below, the script
   value wins after a second check.
2. Tier A YAML (16): TA1-TA6, MA1, MA2, MA3, MA4 (a, b), MA5, MA5b, MA6, MA7, MA8, MA9. Box geometry where possible
   (`inputs.geometry.boxes`, SPEC section 2 field names); MA7 (cylinder) and TA3 (circular-equivalent) flagged as
   needing curved or staircase geometry. Tolerance per R6 4.3; `tests:` list.
3. Tier B NAFEMS (6): LE1, LE10, LE11, T1, T3, T4. Targets and geometry from the public vendor / open pages (WebFetch,
   moderate, URL + retrieval date). Flags: LE11 temperature-field ambiguity, T1 figure-only geometry, T3 bar length.
   Mark `box_compatible` per case.
4. Tier C/D (6 TVs, cases split by basis): warpage ectc.2011.5898527-b, ectc51529.2024.00155, ectc51909.2023.00155-d;
   thermal ectc51687.2025.00085, itherm45881.2020.9190542, ectc51909.2023.00302. Inputs reference L3 sim case ids
   under `sims/` (no geometry duplication); targets keyed by metric_id, value checked against `data/metrics.csv` by a
   read-only script (`validation/expected/check_db_targets.py`, which re-reads every tier C/D/H/EM target).
5. Tier H (15-30): mined from metrics.csv and electrical_interfaces.csv across papers; each a range or direction rule
   with supporting metric_ids and applicable canonical sim.
6. EM: `A/em0_analytic.yaml`, `C/em1_...`, `C/em2_...`, `C/em3_...` or D by basis.
7. `validation/README.md`.
8. Self-check: 10 random targets re-verified vs DB and source text (`references/<id>/text.md`), recorded below.

## Decisions / conventions (lane-local)

- Case schema: `schema: ap-sim-val/0`, keys `id, tier, title, status, physics, inputs, expected, provenance, missing,
  assumptions, tests` (SPEC section 6 lists inputs / expected / provenance / missing / assumptions / status; `tier`,
  `tests`, `title` are additive and recorded as a contract-change request).
- Status enum for cases: `unvalidated | verified | validated | measured_regression` (README); all cases start
  `unvalidated`.
- Tier H rules use a small expression vocabulary: `range`, `sign_flip`, `monotonic`, `ratio_range`, `order_of_magnitude`.

## TODO

- [x] tier_a.py + values json
- [x] Tier A 16 YAML
- [x] Tier B 6 YAML (web pages fetched, dated)
- [x] Tier C/D YAML (6 TVs)
- [x] Tier H YAML set (23)
- [x] EM YAML set (em_0 A, em_1 D, em_2 D, em_3 C)
- [x] check_db_targets.py run clean (59 files, 354 DB values, 62 script values, 0 errors)
- [x] README
- [x] Self-check of 10 random targets
- [ ] (next) align `inputs.sim_case` ids and variant keys with L3 once sims/ cases exist; add info_os/theta_jc_tim to L3 or M2
- [ ] (next) tier B cross-solver decks XB1-XB5 (with L5); digitized moire curves (D3 full)

## Progress log

- 2026-10-20 13:12 PDT: read DevLog-012, SPEC, DevLog-010, R6, R3 sec. 4-5, audit. `sims/` has only SPEC.md (L3 has
  not written case configs yet); C/D cases refer to the case ids named in DevLog-010 "First canonical sims". Plan written.
- 2026-10-20 (between 13:12 and 13:41 PDT; step 1): `validation/expected/tier_a.py` written and run; all R6 tier-A numbers reproduced (TA1-TA6,
  MA1-MA9). Findings: (1) MA5b sag 0.83 um in R6 is the Stoney value; CLT gives 0.816 um (gate on CLT). (2) MA9:
  R6 leaves D undefined; with the equibiaxial D = E h^3 / (12 (1 - nu)) the Suhir far-field force equals the CLT Cu
  layer force (14973.8 N/m) exactly, with the cylindrical-bending D it is 17.3 % low; hard target = CLT. (3) MA5
  runnable form (CTE-offset film) gives kappa 0.39 % below Stoney (film stiffness). 16 tier-A YAML written.
- 2026-10-20 (between 13:12 and 13:41 PDT; step 2): tier B: fetched Abaqus LE10/LE11/T1, Altair LE11/T1/T3/T4, FeenoX examples + LE1/LE10/LE11
  .geo, CAST3M elas11, CalculiX T2/T3 thread, FEATool T4, RecurDyn NAFEMS PDF (via WebFetch; PDF text extracted in
  the scratchpad, not kept). `validation/expected/tier_b.py`: T1 infinite-plate hoop stress = 50.0 MPa (matches
  target -> circular hot spot r = 1 mm, D at (a+, 0)); T3 exact series 36.603 C (sinusoid at B confirmed); T4
  exact series 18.2538 C (FD cross-check 18.2546 at h = 5 mm). LE10 planform/thickness inferred, flagged.
- 2026-10-20 (between 13:12 and 13:41 PDT; step 3): tier C/D written: C Xilinx (5 warpage + 3 stress OoM + 4 relations), C JOINT2-2024 FEM
  stiffener sweep (6), D JOINT2-2024 moire (10 points, 2 zero crossings derived), C JOINT2-2023 (2), C CoWoS-R
  model (11), D CoWoS-R measured (4), C InFO_oS sim (10) + D test (7), C Georgia Tech (6 + 3 spans). L3 has not
  written its sims/ cases yet; C/D inputs refer to the L3 planned ids (si_interposer_peers/{xilinx_tsv_lid,
  120mm_warpage, 50mm_quarter}, cowos_r/thermal_rjc) and to DevLog-010 M2 `info_os/theta_jc_tim` (not in L3 plan);
  Georgia Tech is self-contained with template layout. `validation/expected/derived_checks.py`: CoWoS-R
  (Tj - Tc)/P consistent; BLT slope A_eff 2031 mm2 in [1331, 2685]; InFO_oS VC model linear superposition fits all
  14 cases within 0.06 C; InFO_oS TIM-type rows inconsistent with a 1D TIM term (recorded as observation).
- 2026-10-20 (between 13:12 and 13:41 PDT; step 4): tier H (23 files, generated from DB rows by id with a scratch generator; values not
  retyped), EM set (em_0 analytic with `validation/expected/em0.py`: microstrip H-J 70.583 ohm / eps_eff 2.4703
  matches scikit-rf MLine exactly; CPW 56.002 ohm matches the Palace example 56.02), README, `check_db_targets.py`.
  EM-3 derived: PSB DCR slope 22.75 ohm/mm vs bulk-Cu 22.9 (model A), 4.96 vs 4.91 (model C).
- 2026-10-20 13:41 PDT (`date`): self-check (below); ruff clean on validation/expected; outputs unchanged after lint fixes.
  Correction: steps 1-4 were first logged with clock times I had not read from `date`; replaced by the bracket above.

## Self-check (2026-10-20): 10 random targets, seed 20261020, from the 230 distinct ids in the case files

| id | DB value | Source check | Result |
|---|---|---|---|
| estc60143.2024.10712129-i-m4 | 565 um | p.4 Fig. 15 bar (t 1.0, w 18.5 mm, 25 C), page image viewed | OK (bar reading, +-30 um) |
| ectc51846.2026.00035-a-m11 | 54.7 ohm | text.md p.5 Table II and Sec. III.B.3 | OK |
| eptc67330.2025.11392620-a-m9 | 0.89 dB | p.4 Fig. 11 inset table (no meshing, 56 GHz), page image | OK |
| ectc51909.2023.00091-b-m2 | -107 um | p.4 Fig. 7(c) (HT 240 C, ring 18-12-2 mm), page image | OK |
| itherm45881.2020.9190542-a-m3 | 0.065 C/W | text.md p.4 Table 3 | OK |
| ectc51687.2025.00085-d-m1 | 104.7 C | p.3 Table 4 (image-only in text.md), page image | OK; Table 3 TIM1 area 2,685 mm2 also confirmed |
| ectc51529.2024.00265-a-m12 | 130 um | p.5 Fig. 6 (16 mm, 245 C, Cu 100 %), page image | OK (marker reading) |
| ectc51846.2026.00035-c-m5 | 3.87 ohm | text.md p.5 Table II | OK |
| 001c.147115-c-m27 | 80 um | p.4 Fig. 9 (leg 6 RT), page image | OK; all 7 RT/HT pairs read |
| itherm45881.2020.9190542-b-m40 | 113.7 C | text.md p.6 Table 8 | OK |

Finding from the self-check: Amkor Fig. 9 leg 7 (SUS 430 stiffener) warps more than leg 3 (stiffener, material not
stated) at both RT and HT, against the JOINT2 SUS430-vs-Cu direction. Added as a counter-example in H06; H06 now
applies only to si_interposer_peers/120mm_warpage.

## Findings (for the coordinator)

- R6 MA5b sag 0.83 um is the Stoney value (CLT 0.816 um); MA9 Suhir force equals CLT only with the equibiaxial
  plate rigidity (cylindrical-bending D gives 0.827x).
- NAFEMS: LE11 field is sqrt(x^2 + y^2) + z (FeenoX, Altair 2023, CAST3M; the Abaqus 2017 page renders it without
  the root); T1 hot spot circular r = 1 mm (RecurDyn doc) and the 50 MPa target equals the infinite-plate closed
  form; T3 exact series 36.603 C confirms sinusoid at B; T4 exact 18.2538 C; LE10 planform / thickness inferred.
- CoWoS-R BLT sweep: A_eff 2031 mm2 between SoC area and TIM1 area; InFO_oS VC model is linear to 0.06 C over 14
  cases; InFO_oS TIM-type rows are 4-6x below a 1D TIM term (recorded as observation, rank-order use only).
- DNP glass TGV IL rows (ectc51529.2024.00093 d-f, 001c.129747 j-l) carry identical values: one independent source.

## Contract-change requests (additive; for DevLog-012)

- L4-1 selection `interface:<a>|<b>` and thermal BC `contact_resistance` (TA2, CoWoS-R calibration).
- L4-2 partial-face heat source `source_patch` (TA3), or accept a thin heater box.
- L4-3 study `thermal_transient` (t_end_s, dt_s, output_s, initial_C) and time-dependent Dirichlet (TA5, NAFEMS T3).
- L4-4 BC `temperature_field` (Dirichlet from expression; TA6) and prescribed temperature field input (LE11).
- L4-5 per-face selections `side:<part>:<x-|x+|y-|y+>`, point selections, BC types roller / pin / fixed components
  (MA2, NAFEMS T4, LE1/LE10/LE11 on the reference path).
- L4-6 material or part property `initial_stress_MPa` / `eigenstrain` (MA5; cure shrinkage, film stress).
- L4-7 full-tensor k and orientation for orthotropic entries (TA6 rotated, MA8 rot30x).
- L4-8 validation case schema `ap-sim-val/0` with the additive keys listed in validation/README.md.

## Wave 2 (coordinator, after audit A1; plan: S7 tier-H re-scope, S8 EM-1 targets, L5 reference_fe)

- 2026-10-20 14:36 PDT (`date`; work done between resume and this entry):
  - **S7 tier H:** every rule now has `strength` (weak = one paper or one consortium / organization; 15 of 23 weak),
    `scope_package_classes`, a `fails_if` statement, and a `revision` record. `applies_to` was narrowed to the
    supporting classes: H15 is InFO_oS only (cowos_l removed) and is split by BC (cold plate [1.8, 2.3], vapor chamber
    [1.25, 1.6]); H02's band [0.5, 2.5], which could not fail, is replaced by per-class rules (Amkor-type ratio in
    [0.75, 1.0]; CoWoS-L lid > 1 > ring). cowos_l was also removed from H03, H04 and H05 (no CoWoS-L support). H08
    now applies to a bridge-die sub-model, not emib_t. Ids are aligned with the existing sims/ configs.
  - **S8 EM-1:** `D/em_1_abf_microstrip_glass.yaml` rewritten. Tolerance comes from the measurement:
    0.029 dB/mm (thru +-0.1 dB averaged over the 2/4/8 mm lines, a bounding assumption) plus 5 % (width deviation
    +1.54 um / 34 um). Roughness, plated-Cu sigma and profile are bracketed by variants, not absorbed into the
    tolerance. At definition (L7 values): cannonball passes all four points; base fails at 140 GHz; smooth fails
    at 200 GHz; T115C fails at 140 GHz. Added a bracket rule that fails if base loses its roughness, a causal-fit
    target (|causal / table - 1| <= 4.5 % from Df misfit 8.8 % x dielectric share <= 0.5; observed <= 1.5 %),
    engine regression baselines (rel 5e-3 from L7 clearance / mesh sensitivities), and a request to L7 to make
    causal_fit the base.
  - **reference_fe** (15 values, checked against `validation/reference/results/*-skfem.json`): MA3, MA4b (kappa,
    sags, Si stresses), MA5b, MA7 (Cu centre), TA3a/b (R max / avg), TA4, NAFEMS T4. MA7 also got the closed form of
    the modelled finite matrix (R = 20 a; own derivation in `tier_a.py`, 144.668 MPa, which matches L5's closed form).
    L5's extrapolated Si sigma_rr(2a), -35.26 MPa, is 1.8 % from that closed form (-35.90 MPa); flagged in the MA7
    file as a probe-placement question for L5.
  - **EM-0:** CPW / stripline now use eta0 / 4 (exact) instead of 30 pi (6.9e-4 high; L5 finding 5): 55.963 / 50.216 ohm.
  - **Checker bug found and fixed:** PyYAML reads `1.45e8` (no exponent sign) as a string, so 27 tier-A values had
    been skipped silently. `check_db_targets.py` now parses numeric strings. Result: 59 files, 354 DB values, 89
    script values, 15 reference_fe values, 0 errors. A planted mismatch is caught. ruff clean.

## Wave 3 (coordinator, after L5 wave 2)

- 2026-10-20 15:01 PDT (`date`):
  - **LE10:** geometry verified by L5 (FeenoX .step / .geo / .fee and the Abaqus page); the missing item is removed.
    reference_fe is now gated: P2 tets -5.38466 MPa and Q2s graded -5.38781 MPa (finest values; L5 says the Richardson
    columns do not apply), rel 3e-3.
  - **LE11:** L5 Q2s finest -105.54 MPa (Richardson -105.99) is added as reference_fe with `gated: false`. It is within
    the 1 % band, but the 0.9 % offset vs FeenoX -105.04 is unexplained. Reference temperature 0 C assumed (L4 and L5).
  - **T1:** geometry from the Abaqus deck nt1xxf8x.inp (via L5): quarter 10 x 10, r = 1.0, D = (1, 0); figure-only gaps
    removed. Added the free-disk closed form (own derivation in `tier_b.py`): E e* (R^2 + a^2) / (2 R^2) = 50.50 MPa,
    which matches L5. reference_fe 50.4475 MPa (rel 1e-2); the NAFEMS 50.0 band is widened to 1.5 %, because the
    exact square answer is +0.9 %.
  - **MA7:** ring means at r = 1.05a and 2a (and Cu at 0.5a) are now the gate quantities against the finite-R closed form
    (rel 3e-3), with r = 1.05a values added to `tier_a.py`. The four L5 ring-mean reference_fe values are within
    0.3 %; single points are reference only. XB3 has no L4 case file; the README records ring means as its gate quantity.
  - **README:** tier-B cross-solver verification record from L5 engine_xcheck (thermal node-by-node <= 1.1e-10 K;
    mechanics q2s same-grid identity).
  - **Checker:** list-form `path` added (needed for the key `hex_graded_1.25`). Result: 59 files, 354 DB, 92 script,
    23 reference_fe values, 0 errors; ruff clean.

## Wave 4 (coordinator; EM-1 after L7 switched the base to the causal fit)

- 2026-10-20 15:10 PDT (`date`): `D/em_1_abf_microstrip_glass.yaml` updated. The causal rule is now `causal_vs_table`
  (table vs base, <= 4.5 %; observed -1.1 / +0.3 / -1.5 / +0.8 %). Baselines come from one engine run
  (`node src/em2d/cli.mjs ../sims/em/em1_abf_microstrip_glass.yaml --json`, nice 10, 144 s, output kept in the
  scratchpad only); base and cannonball equal L7's wave-3 numbers. Bracket and best_estimate rules are unchanged and
  still hold. Cannonball passes all four points, but its 140 GHz margin is small (+0.0417 vs tol 0.0423). Base fails
  at 140 GHz, smooth at 200 GHz, T115C at 140 GHz. check_db_targets: 0 errors.

## Wave 5 (coordinator; re-scope after lane L9's warpage study)

- 2026-10-20 16:23 PDT (`date`):
  - **New status `untestable`** (README; additive SPEC request) with `untestable_reason` (locators) and `activation`.
    New cases:
    - `C/ectc51687.2025.00178-bare-substrates.yaml`: FCBGA bare c-m1 / c-m2, DIC b-m4 / b-m5, glass bare d-m1 / d-m2.
      The asymmetry that sets the sign is undisclosed (Fig. 5(a), p.3); the modelled stacks are near-symmetric. Not
      kept as a tier-H direction: one paper, and the trend has no driver in a symmetric stack.
    - `D/2380-4505-2020.1.000042-a-m9-strip.yaml`: the strip was measured on a second glass carrier (p.6 Sec. III.E),
      and sag / thickness is 28.5. A magnitude-only strip-on-carrier future target (rel 0.5) activates once the carrier
      variant (L3) and geometric nonlinearity (L8) exist.
  - **cowos_l** (`D/ectc51909.2023.00091-cowos_l.yaml`), sign-agnostic gates:
    - coplanarity magnitude per T: max(20 um, 25 %);
    - RT / HT ratio: lid -2.31 in [-4.2, -1.3], ring -0.575 in [-0.96, -0.35] (bands from the tier-D tolerance in
      the worst direction);
    - sign flip through H01, only for dome / bowl shapes.
  - **Implied Tsf diagnostic** (`validation/expected/implied_tsf.py` -> `implied_tsf.json`), for 10 two-temperature pairs
    and series:

    | Pair / series | Implied Tsf | Case input |
    |---|---|---|
    | cowos_l lid | 90 C | 150 |
    | cowos_l ring | 161 C | 150 |
    | 120 mm SUS430 | zero crossing 231 C (fit 222) | 170 |
    | 120 mm Cu | 96 C | 170 |
    | FCBGA bare, paper FEM | 198 C | stated 180 |
    | FCBGA bare, DIC | 193 C | 180 |
    | FCBGA assembled, paper FEM | 169 C | stated 150 |
    | glass bare, paper FEM | 207 C | stated 180 |
    | glass assembled, paper FEM | 188 C | stated 150 |
    | CoWoS-S | 152 C | 150 |

    The paper FEMs with stated Tsf are themselves +18 to +38 C off a linear single-Tsf model; that is the reference
    spread for the diagnostic.
  - **Sign-only gates** now carry `requires_shape_class: [dome, bowl]`: H01 and H02 (generator), the JOINT2 moire sign
    rule, and the Xilinx sign relation. Xilinx lidded rows are gated on sign plus shape; magnitude only once the lid
    inputs are sourced (W shape, L9).
  - **Checks:** check_db_targets 62 files, 365 DB values, 92 script, 23 reference_fe, 0 errors; ruff clean.

## Wave 6 (coordinator; 120 mm sequence trend, results ledger)

- 2026-10-20 19:32 PDT (`date`):
  - **120 mm** (`D/ectc51529.2024.00155-moire.yaml`): new process_sequence study definition `stiffener_attach_sequence`.
    The id is to be aligned with L3. Steps, from L9 wave 2 and paper p.3 Sec. II.E: package cure 170 C -> 130 C; ring
    + glue attach stress-free 130 C; ramp to 30 / 148 / 222 / 243 C.
    - Trend targets on step `ramp`:
      - SUS430 sign change between 222 and 243 C (shape_class dome / bowl);
      - SUS430 strictly decreasing 30 -> 243 C;
      - secondary: Cu increasing with a sign change between 30 and 148 C.
    - The single-step comparisons of the stiffener variants (a-m16..m19, e-m1..m4, and the sims/ single-step targets)
      are marked `superseded`, with L9's constant-eigenstrain reason. Module rows stay single-step.
  - **`validation/RESULTS.md`** ledger: mechanics, thermal, EM and verification rows, filled from DevLog-012
    (M1 final, L3 wave 5 / 4, L7 wave 3, audit A2), the L3 wave 5 run and RVE / ROM tables, L1 waves 2-3, the L10
    progress log, L5 engine_xcheck and my wave-4 EM-1 run. No new runs. Verdicts follow the current validation cases;
    `rve*` marks rows affected by the override-propagation bug.
  - **Checks:** check_db_targets 62 files, 365 DB, 92 script, 23 reference_fe, 0 errors.

## Wave 7 (coordinator; wrap-up)

- 2026-10-20 21:19 PDT (`date`):
  - **120 mm moire case:** steps renamed to L3's names (package_cure, ring_attach, ramp_30 / ramp_148 / ramp_222 /
    ramp_243 / ramp_260); trend targets carry `sim_case` + `steps`; the Cu trend is wired to
    `si_interposer_peers/120mm_warpage_cu`. `first_result` lines from L3 wave 6:
    - SUS430: not monotone, no sign change; W shapes, so the sign gate is reported only -> miss.
    - Cu: monotone pass; sign change at about 112 C vs 96 C, reported (30 C is W).
  - **RESULTS.md refreshed**, no new runs:
    - Homogenization labels corrected per L11: live RVE from 15:57 (library) / 16:03 (runMechCase); only L3's 18:30 RVE
      column was wrong (now fixed and not used).
    - L11 main RVE values: Xilinx no-lid +341.215 (pass), lidded -50.770 (W miss), von Mises 131.13 (indeterminate),
      50 mm E2 +100.136 (miss); ROM alternatives listed. fcbga core-nu bounds -3.6 / +3.5 %.
    - 120 mm sequence rows (SUS430 miss, Cu pass, a-m23 indeterminate); single-step s2 superseded.
    - L10 rtol note (+-1.5e-4 um).
    - EM-4 line-run L 9.27 / 9.07 pH vs 9.03; C +11 / +7 % mesh-limited.
  - **Checks:** check_db_targets 62 files, 365 DB, 92 script, 23 reference_fe, 0 errors.

## Wave 8 (coordinator; audit A3 S7 ledger corrections)

- 2026-10-20 21:37 PDT (`date`): `validation/RESULTS.md` corrected.
  - **cowos_r:** now cites the case targets c-m1 (0.0108, -26.7 %) and d-m10 (0.01082, -26.9 %) instead of c-m7.
  - **Tj:** refreshed to 99.368 C (current engine, conduction-only RVE). It passes the validation case's rel_rise 0.10
    (rise -6.5 %) and misses the sims abs 3 C; both stated.
  - **Xilinx no-lid:** pass qualified as plausibility only (template nu / build-up / homogenization inputs).
  - **EM-4:** marked "under re-run by lane L13" (A3 S3: companion on a different z-mesh, 9.07 pH from a prototype;
    matching z-planes 8.91 pH, -1.3 %), to be updated when L13 reports.
  - **M1 note:** equality and the browser peak were measured at rtol 1e-10.
  - **Checks:** check_db_targets 0 errors.

## Wave 9 (coordinator; EM-4 after lane L13)

- 2026-10-20 22:10 PDT (`date`): RESULTS.md EM-4 rows replaced with L13's values (companions cut from the device mesh).
  - L: 8.913 pH (-1.3 %, 59.5k DOF) and 8.966 pH (-0.7 %, 97.4k DOF) vs 9.03 -> pass within 3 %, converging from below.
  - C: 10.53 / 10.03 fF vs 9.37 -> indeterminate (mesh-limited).
  - S11: -51.21 / -31.22 / -17.35 / -11.67 and -51.74 / -31.75 / -17.87 / -12.16 dB vs -52.5 / -32.5 / -18.6 / -12.9 ->
    indeterminate (mesh-limited).
  - Withdrawn: 9.27 pH (companion on a different z-mesh) and 9.07 pH (prototype).
  - No EM-4 validation case exists under validation/cases/ (EM-4 is cross-solver only), so no expected bands needed
    changing.
  - check_db_targets: 0 errors.
