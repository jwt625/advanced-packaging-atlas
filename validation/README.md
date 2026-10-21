# Validation set (D3)

Validation cases for the simulation harness (thermal, thermo-elastic, EM). Plan and tiers: DevLog-010 (D3, Decisions
item 3), R6 `DevLog/research/2026-10-20-sim-validation-set.md`, R3 sections 4-5. Case contract: `sims/SPEC.md`
section 6. Lane notes: `DevLog/lanes/L4-validation.md`.

## Layout

```text
validation/
  README.md
  RESULTS.md    results ledger: latest engine result per case / study / target, verdict, homogenization, source lane note
  cases/
    A/          analytic closed forms (TA1-TA6 thermal, MA1-MA9 + MA5b mechanical, em_0_analytic)
                _materials_tier_a.yaml: synthetic material set shared by the tier-A cases
    B/          published benchmarks: NAFEMS LE1, LE10, LE11, T1, T3, T4
    C/          paper-simulated targets (basis = simulated), incl. em_3
    D/          paper-measured targets (basis = measured), incl. em_1, em_2
    H/          high-level trends across papers: ranges, directions, rank orders (H01-H23)
  expected/     stdlib scripts that recompute expected values (no solver code)
    tier_a.py          -> tier_a_values.json   (all tier-A numbers)
    tier_b.py          -> tier_b_values.json   (independent checks of NAFEMS T1, T3, T4)
    em0.py             -> em0_values.json      (EM-0 closed forms)
    derived_checks.py  internal-consistency checks of tier C/D thermal rows (reads data/metrics.csv)
    implied_tsf.py     -> implied_tsf.json     (implied stress-free temperature of two-temperature warpage cases; diagnostic)
    check_db_targets.py  every case value vs data/*.csv, the script JSON and L5 reference_fe values (exit 1 on mismatch)
  reference/    desktop reference solvers (lane L5; own uv project; not written by L4)
```

Run (no project install needed):

```bash
uv run --no-project python validation/expected/tier_a.py --json validation/expected/tier_a_values.json
uv run --no-project python validation/expected/tier_b.py --json validation/expected/tier_b_values.json
uv run --no-project python validation/expected/em0.py --json validation/expected/em0_values.json
uv run --no-project python validation/expected/derived_checks.py
uv run --no-project --with pyyaml python validation/expected/implied_tsf.py --json validation/expected/implied_tsf.json
uv run --no-project --with pyyaml python validation/expected/check_db_targets.py
```

## Tiers

| Tier | Meaning | Comparison | Typical tolerance (R6 4.3, proposals) |
|---|---|---|---|
| A | closed form, synthetic inputs | value at a probe or a global quantity, after mesh refinement | rel 1e-3 global; 1e-2 point stress; round-off for patch / free-expansion tests |
| B | public benchmark (NAFEMS) | target at the benchmark point; report coarse / fine like the vendor manuals | rel 1e-2 after refinement |
| C | paper FEM / CFD result (basis simulated) | same quantity and definition as the paper | warpage max(10 um, 10 %); Tj rise, Rjc, ThetaJC 5 % |
| D | paper measurement (basis measured) | sign at every T, transition T, magnitude | warpage sign, +-20 C, max(20 um, 25 %); thermal 10 % |
| H | trend across papers | rule: `range`, `ratio_range`, `order_of_magnitude`, `monotonic`, `direction`, `sign_flip`, `rank_order`, `range_by_class` | pass / fail of the rule; no point tolerance |

`box_compatible` on A/B cases: `true` = representable on the structured box grid of the browser engine; `partial` =
part of the geometry needs a staircase or Gauss-point indicator, with the error to be measured; `false` = curved
geometry, run on the desktop reference only (MA7 Lame TSV, NAFEMS LE1 / LE10 / LE11).

## Cross-solver verification record (tier B)

Lane L5 engine cross-check, 2026-10-20 (`validation/reference/results/engine-xcheck-thermal.json`,
`engine-xcheck-mech.json`; method in `DevLog/lanes/L5-references.md`):

- **Thermal:** TA1, TA2, TA3a/b, TA4, TA6, XB4, XB5. Each engine deck carries every reference grid plane, so the two
  grids are identical (max coordinate difference 1e-18 m). Engine Q1 equals the scikit-fem Q1 reference node by node
  to <= 1.1e-10 K. Against the converged references, 17 of 23 rows are within 1e-3. The other 6 are coarse levels
  (TA3a/b avg, XB4 avg, XB5): discretization error, not a disagreement.
- **Mechanics:** MA1, MA3, MA4a, MA4b, MA5b, MA6, XB1 (w 1 / 10 mm), XB2 (50 / 120 mm). On the same grid, engine q2s
  equals the reference Q2s: corner-node displacement 1e-13 to 1.6e-8 relative after removing rigid motion, probe
  stresses equal to 8-9 digits.
- **Engine limitation (L5):** `curvatureFit` needs an explicit `region` on a 1 mm strip.

This counts as verification (two independent codes, same discrete problem), not validation. Status transitions still
need a logged engine run per case.

Gate quantities for TSV-type stresses (MA7, XB3): the 9-angle ring means (`*_mean_Pa`). Single-point P2 values
scatter about +-1.7 % with angle and are reference only.

## Status

`status` on every case, changed only by a logged run (DevLog progress entry with the run log path):

- `unvalidated`: case written, never compared.
- `verified`: tier A / B passes (code correctness; analytic or benchmark agreement, with observed convergence order).
- `validated`: tier C / H passes (agreement with a paper model or a cross-paper trend).
- `measured_regression`: tier D passes (agreement with measurement within the tier-D band).
- `untestable`: the target cannot be compared with the current model because of an input no source discloses, a
  different measured object, or missing physics. The case must carry `untestable_reason` (with locators) and
  `activation` (what makes it testable). Targets stay recorded but are not gated. This status is added by L4 (wave 5,
  from lane L9); requested as an additive SPEC change.

Sign-only gates (`sign`, `sign_flip`, sign relations) apply only when the warpage result's `shape_class` (L8, being
added; L9 proposal: dome | bowl | W | saddle) is dome or bowl. For W or saddle shapes the signed value is ill-defined,
and the gate is reported, not evaluated. Cases mark this with `requires_shape_class: [dome, bowl]`.

`expected/implied_tsf.py` writes `implied_tsf.json`: for every two-temperature warpage case, the linear stress-free
temperature implied by w(T_HT) / w(T_RT) = (T_HT - Tsf) / (T_RT - Tsf) (or the zero crossing of a series), next to the
sim case's input. It is a diagnostic only. The paper FEMs of ectc51687.2025.00178, with stated Tsf, already sit +18 to
+38 C off it.

Sim configs (`sims/<family>/<case>.yaml`) carry the highest status reached by any validation case that references
them; `draft` exists only for sim configs (SPEC section 1).

## Case file (schema `ap-sim-val/0`)

Common keys: `schema, id, tier, title, status, physics, inputs, expected | targets, provenance, missing, assumptions`.
Additive keys used here (contract-change request L4, DevLog-012): `tests`, `box_compatible`, `geometry_note`,
`variants`, `formula`, `tolerance`, `relations`, `derived`, `reference_results`, `independent_check`, `observations`,
`gate`, `source`, `rule`, `support`, `counter_examples`, `applies_to`, `n_papers`.

- Tier A: `inputs.geometry.boxes` uses the SPEC section 2 part fields (`id, kind, material, x_mm, y_mm, w_mm, d_mm,
  z_um, h_um`); materials `tierA:<key>` from `cases/A/_materials_tier_a.yaml`. Each expected row has `script_key`
  pointing into `expected/tier_a_values.json`.
- Tier C / D: `inputs.sim_case` names the sim config under `sims/` (lane L3; geometry is not duplicated here) and
  `variants` lists the parameter overrides per target. Targets are keyed by `metric_id` (or `ei_id` for rows of
  `data/electrical_interfaces.csv`) with value, unit, basis, locator, T or f, tolerance.
- Tier H: `rule` (type + expression), `fails_if` (the result that fails the rule), `strength` (`weak` = one paper
  or one consortium / organization; `moderate` = several independent papers), `scope_package_classes` (the classes
  the supporting papers cover; `applies_to` stays inside them), `support` (DB rows copied by id), optional
  `counter_examples`, `n_papers`, `revision`.
- Tier A / B `expected` rows may carry `form`: (none) = closed form; `closed_form_finite_R` = closed form of the
  modelled finite geometry; `reference` = informative only; `reference_fe` = lane L5 converged FE value
  (`ref: {file, path, field}` into `validation/reference/results/`) used as the tight target where the closed form
  differs physically from the modelled geometry (MA3, MA4b, MA5b, MA7, TA3, TA4, NAFEMS T1, T4, LE10; LE11 is
  listed with `gated: false`). `closed_form_finite` (T1) is the closed form of the modelled finite domain. Closed
  forms keep their own tolerance.
- Numbers such as `1.45e8` are floats in YAML 1.2 (the JS engine) but strings in PyYAML (YAML 1.1);
  `check_db_targets.py` reads both. New files may write `1.45e+8`.

## How a run is compared (to be implemented by the engine lanes)

1. Load the case; resolve `inputs` (box geometry, or the referenced sim config plus variant overrides).
2. Run each study on at least three meshes (refinement ratio >= 1.5); record DOFs, timings and the raw value per level.
3. Extrapolate (Richardson; GCI with safety factor 1.25) where a convergence order is defined (tiers A, B).
4. Compare the extrapolated (A, B) or finest (C, D, H) value with the target using the case tolerance; for `relations`
   and tier-H rules evaluate the rule on the set of runs it names.
5. Write `validation/reference/<case>-<solver>.json` (L5 format) or the engine equivalent with inputs hash, solver and
   version, mesh levels, values, error vs target, pass / fail, ISO date; log to `logs/val-<case>-YYYYMMDDTHHMM.log`.
6. Never compare a nodal maximum at a bimaterial corner (singular); use the probes, fits and integrals the case names.
7. Warpage: state the definition (signed centre-to-corner, coplanarity, JEITA ED-7306) and the sign mapping per paper.

## How to add a case

1. Pick the tier by basis (simulated -> C, measured -> D, trend -> H, closed form -> A, benchmark -> B).
2. Read the source row(s) in `data/metrics.csv` / `data/electrical_interfaces.csv` and the cached paper text for the
   locator; copy values by id, never retype from memory. Paper text is licensed: facts and locators only.
3. Write the YAML with `missing` (inputs no source discloses) and `assumptions` (every inferred value, labelled).
4. Tier A: add the formula to `expected/tier_a.py` (or `em0.py`), regenerate the JSON, reference it by `script_key`.
5. Run `check_db_targets.py`; it must report 0 errors.
6. Record the addition in the lane notes or the owning DevLog with an ISO date.
