---
title: L5 desktop reference solvers (tranche R) - scikit-fem thermal and thermo-elastic references, comparison helper, EM utilities
date: 2026-10-20
status: wave-1 done 2026-10-20 (audit pending)
owner: L5 (lane subagent; independence rule: reference code written from physics and package docs, never from engine/ sources)
scope: validation/reference/ (own uv project), this notes file
---

# L5: desktop reference solvers

Parent: [DevLog-012](../DevLog-012-sim-engine-implementation.md) (lanes, shared rules), [DevLog-010](../DevLog-010-multiphysics-sim-harness-proposal.md)
row R and Decisions 2026-10-20 item 3, R6 validation set (`DevLog/research/2026-10-20-sim-validation-set.md`, sections
1, 2.3, 4), R2 solver stack (section 7). Pattern: eo-modulator-atlas `validation/` (DevLog-028 L-REF).

Independence: allowed engine reads are `sims/SPEC.md` and `engine/README.md` only (input/output formats). The reference
formulations come from the physics and the scikit-fem documentation.

## Plan (written 2026-10-20 13:12 PDT, before any install or run)

1. **uv project** `validation/reference/` (Python 3.12, `package = false`, own `.venv` and `uv.lock`; uv only): numpy,
   scipy, scikit-fem, pyyaml, scikit-rf; dev: ruff, pytest. pyamg only if a direct solve exceeds the RSS budget.
   NGSolve and gmsh only if a case needs curved geometry: LE10 (elliptic plate) and LE11 (cylinder/taper/sphere) and
   the MA7 TSV need curved boundaries. Check wheel sizes first; venv cap ~1.5 GB.
2. **Package `apref/`** (inside `validation/reference/`):
   - `boxcase.py`: reader of a small JSON/YAML box-part input mirroring SPEC sections 1-3 (parts with `x_mm, y_mm, w_mm,
     d_mm, z_um, h_um`, priority, material key; inline material table; BCs by named selection `top:<part>`,
     `bottom:<part>`, `side:<part>`, `default`, `sym:x`, `sym:y`). Rectilinear grid aligned to all part boundaries
     (same rule as SPEC 3), so the same case runs in the JS engine and here.
   - `thermal.py`: steady conduction, Q1/Q2 hex (and P1/P2 tet for distorted-mesh checks), diagonal or full anisotropic
     k tensor per cell, volumetric sources (W per part, uniform), Robin (h, T_inf), flux, Dirichlet, adiabatic.
     Energy balance (source vs Robin outflow + Dirichlet reaction).
   - `elastic.py`: linear thermo-elasticity, Q1/Q2 hex and P1/P2 tet; isotropic, orthotropic (engineering constants)
     and cubic (C11, C12, C44, rotation about z) stiffness; secant CTE with rebase to the stress-free temperature
     (eps_th = alpha_sec(T) (T - Tref) - alpha_sec(Tsf) (Tsf - Tref); constant alpha reduces to alpha (T - Tsf));
     temperature as uniform, nodal field from `thermal.py`, or analytic function; supports: 3-2-1 rigid-motion
     suppression (zero reactions, checked), symmetry planes, Dirichlet on faces. Outputs: displacement, stresses at
     points (L2 projection to the same basis), curvature fit over a central region, warpage per JEITA ED-7306
     (signed, surface and view side named).
   - `compare.py`: given an engine result JSON (SPEC section 5) and a reference JSON, compute R6 section 4.3 metrics
     (rel error of globals, point-value error, field L2 diff on a common sampling grid, tolerance verdict by tier).
   - `convergence.py`: observed order, Richardson extrapolation, GCI (Roache, Fs 1.25).
   - `rf.py` (EM): scikit-rf wrappers for Touchstone read/write, renormalization, cascading, mixed-mode conversion,
     passivity/reciprocity checks; closed-form microstrip (Hammerstad-Jensen), stripline (Cohn, zero thickness),
     CPW (conformal map, K(k) via AGM), coax, rect waveguide cutoff.
3. **Runs** (scripts `scripts/ref_*.py`, logs `logs/ref-<case>-YYYYMMDDTHHMM.log` at repo root, results
   `validation/reference/results/<case>-skfem.json` only when tiny and deterministic):
   - Tier A from R6 (or L4's YAML when present): MA1, MA2 (uni/bi/triaxial), MA3, MA4a, MA4b, MA5b, MA6, MA7, MA8,
     TA1, TA2, TA3 (a, b; vs the closed form, with the caveat that it is a circular-equivalent formula), TA4, TA6.
     h and p convergence (Q1 vs Q2, 1/2/4 elements per layer), observed orders.
   - NAFEMS: LE11 (gmsh or own mapped mesh of the cylinder/taper/sphere if the geometry is reproducible from public
     sources), LE10 (elliptic thick plate), T4 (2D plate with convection, extruded), T1 if geometry is public. Record
     which ones could not be reproduced and why.
   - Cross-solver decks XB1-XB5 (R6 2.3): Q2 hex reference with 3+ meshes and Richardson.
   - Each record: case, quantity, value, mesh, element order, DOF, runtime, max RSS, package versions, ISO date.
4. **Machine load**: every run through `run.sh` (nice -n 10, single-thread BLAS, `/usr/bin/time -l` for max RSS), one
   at a time, each < ~5 min and < ~4 GB RSS (RSS watchdog as in EO `run_guarded.sh`).
5. **Tests** (`pytest`): closed-form EM vs scikit-rf media; small-mesh solver gates (patch tests, free expansion, linear
   T); comparison helper on synthetic inputs.

## Layout and usage (hand-off)

```text
validation/reference/            own uv project (pyproject.toml, uv.lock, .venv/ gitignored by the root .venv/ rule)
  run.sh                         nice -n 10, single-thread BLAS, /usr/bin/time -l, RSS watchdog (RSS_LIMIT_KB, 4 GB)
  apref/materials.py             k tensor, Voigt stiffness (iso / ortho / cubic), frame rotation, secant CTE rebase
  apref/fem.py                   batched assembly (Q1 / Q2 / Q2s hex, P1 / P2 tet), BCs, solves, point strain
  apref/boxcase.py               ap-ref-box/0 box cases: grid, selections, solve_thermal, solve_mech, post-processing
  apref/curved.py                gmsh quarter-cylinder TSV meshes, P2 isoparametric snapping
  apref/convergence.py           observed order, Richardson, GCI
  apref/compare.py               engine result (SPEC 5) vs reference: R6 4.3 metrics, field sampling, CLI
  apref/rf.py                    scikit-rf wrappers + closed-form line impedances
  apref/l4.py                    read-only adapter to validation/cases and validation/expected (L4)
  apref/record.py                versions, RSS, results JSON (numbers only) + full JSON and log under logs/
  scripts/ref_mech_a.py          MA1 MA2 MA3 MA4a MA4b MA5b MA6 MA8
  scripts/ref_thermal_a.py       TA1 TA2 TA3a TA3b TA4 TA6, NAFEMS T4
  scripts/ref_tsv.py             MA7 (Lame, finite-R closed form), XB3 (TSV unit cell)
  scripts/ref_xb.py              XB1 XB2 XB4 XB5
  scripts/ref_nafems_le10.py     NAFEMS LE10 (mapped quadratic hex)
  scripts/summarize.py           markdown table of results/*.json
  tests/                         pytest: solver gates (test_fem.py), EM (test_rf.py)
  results/<case>-skfem.json      deterministic reference numbers (no timings / dates); full records in logs/
```

Run (from `validation/reference/`): `uv sync`, `./run.sh scripts/ref_mech_a.py MA4b`, `uv run --no-sync pytest -q`,
`uv run --no-sync python scripts/summarize.py`. Compare an engine result:
`uv run --no-sync python -m apref.compare --engine <eng.json> --reference results/<case>-skfem.json --spec rows.yaml`.

Input `ap-ref-box/0` (mirrors SPEC 1-3): `parts` (SPEC box fields), `materials` (inline, units as SPEC suffixes:
`k_W_mK`, `elastic {type iso|ortho|cubic, *_GPa, nu*}`, `cte {alpha_ppmK, Tref_C?}` or `cte {table, Tref_C}`,
`frame {rot_x_deg, rot_z_deg}`), `geometry.symmetry`, `mesh {max_xy_mm, max_z_um, min_cells_per_layer,
extra_lines_mm, refine_z}`, `thermal {sources [{parts, power_W}], bcs [{selection, type htc|flux|temperature|adiabatic,
rect_mm?, T_expr?}]}`, `mechanics {stress_free_C (number or {default, per_part}), temperature {uniform_C | linear_z |
expr | from_thermal}, supports rigid_motion | symmetry | {faces, points}}`. Powers and fluxes given as `power_W` are
full-model values (symmetry handled inside). Curvature sign: `kappa_clt = -d2w/dx2` (CLT, z up, layer 1 at the
bottom; > 0 = dome); warpage `center_minus_corner_m` > 0 = centre high (convex seen from +z).

## TODO

- [x] uv project (numpy, scipy, scikit-fem, pyyaml, scikit-rf, gmsh, pyamg, qdldl; ruff, pytest), 282 MB venv
- [x] box-case reader + grid (`ap-ref-box/0`)
- [x] thermal reference + gates (TA6 patch, energy balance)
- [x] thermo-elastic reference + gates (patch, MA1, MA6, MA8; Q1 / Q2s / Q2 hex, P1 / P2 tet)
- [x] tier-A runs with h/p convergence (MA1-MA8 except MA9; TA1-TA4, TA6)
- [x] NAFEMS T4, LE10 (recalled geometry, flagged)
- [x] NAFEMS LE11, T1 (wave 2, public inputs verified)
- [ ] NAFEMS T2 / T3 (radiation, transient: out of scope here)
- [x] XB1-XB5
- [x] comparison helper (`apref/compare.py`: R6 4.3 tolerances, engine-grid sampling, CLI)
- [x] EM utilities + pytest vs scikit-rf media
- [x] results table in this file, handoff
- [ ] MA9 (Suhir; coefficients unverified per R6), TA5 (transient), q1im (engine element; no reference here)
- [x] wave 2: LE10 verified, LE11, T1, engine thermal + mechanics cross-check, MA7 ring means
- [ ] fresh-context audit of this lane

## Progress log

- 2026-10-20 13:12 PDT Read DevLog-012, SPEC, DevLog-010 (A3, row R, decisions), R6 (sections 1-5), R2 section 7, EO
  validation/ layout and DevLog-028. `validation/` did not exist; L4 cases not yet present. Plan written.
- 13:15 uv project `validation/reference/` (Python 3.12.11): numpy 2.5.4, scipy 1.18.1, scikit-fem 12.0.2, pyyaml 6.0.3,
  scikit-rf 2.2.0; dev ruff 0.17.1, pytest 9.1.1. 167 MB. 13:17 added gmsh 4.15.2 (~80 MB lib, from the uv cache) and
  pyamg 5.3.0 -> 267 MB. NGSolve not installed: scikit-fem + gmsh cover every curved case planned here (MA7, XB3).
- 13:20 `apref/` written: materials (iso / ortho / cubic Voigt, frame rotation, per-direction secant CTE rebase per R1
  Sec. 1.2), fem (vectorised batched-matmul assembly on scikit-fem bases: Q1 / Q2 / Q2 serendipity hex, P1 / P2 tet),
  boxcase (`ap-ref-box/0`: box parts -> aligned rectilinear grid, priority/containment, void removal, named selections,
  thermal BCs, 3-2-1 / symmetry / face supports, point stress, curvature fit, warpage), convergence (observed order,
  Richardson, GCI), record (versions, RSS, JSON, timestamped logs), l4 (read-only adapter to L4 cases and expected values).
- 13:22 Smoke: MA1 free expansion u(5 mm) = 1.300000 um, sigma/(E a dT) < 2e-14 (Q1, Q2s, Q2); TA1 T_bottom 145.36469 C
  (Q1 and Q2; closed form 145.36469), energy balance 3e-14.
- 13:23 MA2 (uni/bi/triaxial, nu 0.49 variants) and MA8 (aligned, rot30x) exact to round-off. Finding: MA8 rot30x
  eps_yz = -2.165e-4 here vs L4 +2.165e-4 (active vs passive rotation sense; eps_yy, eps_zz agree). SPEC needs a stated
  rotation convention for material frames.
- 13:25 MA4b first run: Q2/Q2s converge to kappa 1.192711 vs CLT 1.192782 (-5.9e-5). Own CLT recomputation agrees with
  L4 (1.1927822). Controlled checks: deviation halves when the plate doubles at fixed element size (50 mm -4.4e-5, 100 mm
  -2.3e-5), present also with a stiff interlayer, absent in MA4a (equal nu, 2.5e-7): a physical O(h/L) finite-plate
  correction, not a solver error. Reference value for the 3D 50 mm plate = the FE value.
- 13:26 Memory: SuperLU fill ~1.3e8 at 44k DOF (Q2s elasticity) -> 4.3 GB peak, over the 4 GB cap; all SuperLU
  orderings similar (COLAMD 1.29e8, MMD_ATA 1.47e8, RCM 1.77e8); pyamg SA-CG (with rigid-body modes) did not converge in
  2000 iterations on the thin-layer Q2s system. Added qdldl 0.1.9 (AMD + LDL^T, L only): 2.2 GB peak, 34 s at 44k DOF.
  Policy: SuperLU <= 15k free DOF, qdldl above, hard cap 100k free DOF (elasticity) / 300k (heat). Watchdog pattern fixed
  (ps shows python3, the first pattern never matched).
- 13:36 Fit-domain fix: symmetric models now mirror surface points before the curvature fit (a one-quadrant fit picks
  up non-quadratic edge content differently from the full square: MA4b quarter vs full 2.85e-6 before). Plate runs
  started 13:33 used the old fit: re-run after MA5b.
- 13:40 EM utilities `apref/rf.py` + `tests/test_rf.py` (19 pass): HJ microstrip = scikit-rf MLine to 1e-6; CPW and
  stripline closed forms use eta0/4 (textbooks' 30 pi is 6.9e-4 high, found as a 0.07 % CPW Z0 mismatch vs
  scikit-rf, which uses Hilberg K/K' at about 2 ppm); coax, TE10, line S vs DefinedGammaZ0 (1e-12), cascade,
  renormalise, Touchstone round trip, mixed-mode of an uncoupled pair.
- 13:41 `tests/test_fem.py` (17 pass): patch tests (distorted hex/tet, rotated cubic Si stiffness), rotated anisotropic
  k thermal patch, free expansion (ortho, 3-2-1 / quarter / half) with zero reactions, secant rebase, 1D heat + balance,
  convergence helpers, comparison helper.
- 13:44-13:51 Thermal: TA1/TA2/TA6 exact; TA3a/b, TA4, NAFEMS T4 converged (table below). Watchdog killed T4 at Q2
  refine 8 (refine also multiplied the single z cell: ~1M DOF); added `mesh.refine_z: false`, re-run OK.
- 13:53-14:11 Sequential chain (mech plates, MA7, XB3, XB1-XB5, LE10). Fit fix confirmed: MA4b quarter vs full model
  3.8e-9 (was 2.85e-6). Watchdog killed XB4 at Q2 refine 4 (~250k DOF, 4.5 GB); XB4 Q2 capped at refine 3 and XB5 base
  mesh coarsened (14:12, re-run OK, peak 2.1 GB).
- 14:13 Single-level cases re-run so their results carry expected values; older results files stripped of timings
  (`scripts/strip_results.py`): `results/*.json` hold numbers only (22 files, 180 KB; count corrected 14:58, was written as 31); full records with runtime, peak
  RSS and date are `logs/ref-<case>-<stamp>.json` next to the `.log` files.

- 14:16 Final: pytest 37 pass, ruff clean, venv 282 MB, no absolute paths in tracked files, no lane processes left.

## Results (2026-10-20; scikit-fem 12.0.2, numpy 2.5.4, scipy 1.18.1, gmsh 4.15.2, qdldl 0.1.9)

Expected values: L4 `validation/expected/tier_a_values.json` (tier A), R6 section 2.1 (NAFEMS), own closed form (MA7
finite R). "Richardson" from the three finest levels; DOF = finest level. Full table: `scripts/summarize.py`.

| Case | Quantity | Reference value | Elem | DOF | p_obs | Expected | Rel. diff | Note |
|---|---|---|---|---|---|---|---|---|
| MA1 | u at 5 mm | 1.300000 um | Q1/Q2s/Q2 | 1275 | - | 1.3 um | 2e-12 | sigma/(E a dT) < 2e-11 |
| MA2 | sigma uni / bi / tri | -187.0 / -283.33 / -584.375 MPa | Q1, Q2s | 243 | - | same | 0 | nu 0.49: -9.35 GPa / -366.7 MPa exact |
| MA8 | eps aligned; rot30x eps_yy, eps_zz | 1.1e-3, 1.6e-3; 1.225e-3, 1.475e-3 | Q1, Q2s | 1275 | - | same | 0 | rot30x eps_yz -2.165e-4 vs L4 +2.165e-4 (rotation sense) |
| MA3 | kappa (3D strip 10 x 1 mm) | -2.157647 1/m | Q2s | 38859 | 1.5 | -2.156230 (beam) | -6.6e-4 | 3D strip between beam and plate (XB1) |
| MA4a | kappa | -2.1562307 1/m | Q2s | 45171 | 6.9 | -2.1562304 | -1.6e-7 | stresses at layer faces within 9e-7 |
| MA4b | kappa (50 mm plate) | 1.192706 1/m | Q2s | 65835 | 1.75 | 1.192782 (CLT) | -6.4e-5 | physical O(h/L) finite-plate correction (progress 13:25) |
| MA4b | sag edge / diag | 372.50 / 744.99 um | Q2s | 65835 | 2.4 | 372.74 / 745.49 | -6.7e-4 | edge zone |
| MA4b | sigma_xx si bottom / top | -101.09 / 65.80 MPa | Q2s | 65835 | ~1 | -101.10 / 65.81 | 7e-5 / -6e-5 | |
| MA5b | kappa (5 um Cu on 775 um Si) | -0.0652403 1/m | Q2s | 20064 | 2.2 | -0.0652512 (CLT) | 1.7e-4 | Stoney 0.06639 is 1.75 % high |
| MA5b | locking: 1 cell through film | Q2s -0.065245, Q2 -0.065244; Q1 -0.05511 | | 5181 | - | -0.065251 | Q2s 1e-4; Q1 -15.5 % | Q1 locks in Si bending (h-study Q1 refine 3: -7.6 %) |
| MA6 | kappa, sigma | 0.03354839 1/m, vM < 5e-9 scale | Q2s | 14175 | - | 0.0335484 | -6e-9 | Q1 (1-2 cells): -61 % / -36 % |
| MA7 R = 20a | Cu sigma_rr (uniform) | -144.6725 MPa | P2 | 58677 | 4.0 | -144.6676 (finite R) | -1.3e-5 | infinite-matrix p 145.05 (L4) |
| MA7 R = 20a | Si sigma_rr / sigma_tt at r = a+ | -145.53 / 145.12 MPa | P2 | 58677 | n.m. | -144.67 / 145.39 | -6e-3 / -2e-3 | interface point values oscillate with h |
| TA1 / TA2 | T_bottom | 145.364692 / 155.364692 C | Q1, Q2 | 675 | - | same | 0 | TA2 contact R as 1 um layer (exact in 1D) |
| TA3a | R_total max / avg | 1.667724 / 1.526976 K/W | Q2 | 190333 | 4.4 / 1.8 | 1.657880 / 1.504572 | +0.59 % / +1.49 % | square source and plate vs circular-equivalent formula |
| TA3b | R_total max / avg | 0.1605778 / 0.1321366 K/W | Q2 | 190333 | 4.0 / 2.0 | 0.1624434 / 0.1311441 | -1.15 % / +0.76 % | same |
| TA4 | q / theta_b | 0.02091809 W/K | Q2 | 117369 | 1.8 | 0.02091949 (1D fin) | -6.7e-5 | 3D vs 1D fin |
| TA6 | T centre (aniso, rot 30 deg) | 55.000000 C | Q1, Q2 | 2535 | - | 55 | 0 | max nodal error < 1e-9 K |
| NAFEMS T4 | T at E | 18.25376 C | Q2 | 185859 | 4.0 | 18.3 | -2.5e-3 | target given to 3 digits |
| NAFEMS LE10 | sigma_yy at D | -5.4423 MPa (finest) | Q2s | 62433 | 0.7 | -5.38 | +1.2 % | monotone -5.69, -5.57, -5.51, -5.47, -5.44; slow (edge point); geometry from recollection |
| XB1 | kappa_x vs width 1 / 2 / 5 / 10 mm | -2.15768 / -2.15836 / -2.15886 / -2.15906 | Q2s | 38859-45171 | - | beam -2.15623, plate -2.15913 | - | beam-to-plate transition |
| XB2 | kappa 50 / 120 mm | 1.192716 / 1.192763 1/m | Q2s | 28992 | - | CLT 1.192782 | -5.5e-5 / -1.6e-5 | coplanarity 744.6 / 4292.8 um (linear; 120 mm sag/thickness 2.35: nonlinear needed) |
| XB3 | Cu protrusion (top, vs r = 45 um) | -44.655 nm | P2 | 95568 | - | - | - | cooling 275 -> 25 C: Cu recess |
| XB3 | Cu axis sigma_zz / sigma_rr (mid-depth) | 625.0 / 349.7 MPa | P2 | 95568 | - | - | - | converging (633, 627, 625.3, 625.0) |
| XB3 | Si top surface r = 2a sigma_rr / sigma_tt | 116.2 / -120.3 MPa | P2 | 95568 | - | - | - | about 1 % level-to-level; r = 3a: 50.5 / -54.2 MPa |
| XB4 | T_max, R_th max / avg | 42.8959 C, 0.178959 / 0.154968 K/W | Q2 | 110323 | - | - | - | R_th max changes 1.4e-5 (relative) between the last two levels |
| XB5 | Tj A / B; psi_aa, psi_ab | 75.644 / 56.807 C; 0.46321, 0.086470 K/W | Q2 | 47550 | - | - | - | superposition error 8e-10 K; psi_ab = psi_ba |

Not converged / not usable as point targets: MA7 and XB3 stresses at r = a (interface, P2 tets; values oscillate
level to level), MA7 R = 10a and 40a (single coarse level set), XB1 kappa_y at 1 mm width (fit over 0.5 mm).
Q1 rows (bake-off low-order side) are in the results files: Q1 locks on every bending case (MA4b refine 4: -16 %).

## Findings for other lanes and the coordinator

1. L4 MA4 `expected[].definition` says "d2w/dx2 ... > 0 = dome", but the values (a: -2.156, b: +1.193 for a dome)
   use the CLT sign (eps = eps0 + kappa z), i.e. kappa = -d2w/dx2. Values are right; the definition text is inverted.
2. L4 MA8 rot30x eps_yz sign: active rotation (lab = R mat R^T, R = R_x(+30 deg)) gives -2.165e-4. SPEC needs one
   rotation convention for material frames (cubic `orientation` and any future ortho frame).
3. MA4b / MA5b / MA3 differ from the closed forms at 6e-5 / 1.7e-4 / 6.6e-4 for physical reasons (finite plate,
   strip width). Engine gates at 1e-3 vs closed form pass; tighter engine gates should use these FE references.
4. TA3 closed form (circular-equivalent Lee formula) differs from the square-on-square 3D answer by 0.6-1.5 %:
   gate the engine against the FE reference here, not the formula, if the tolerance is below 2 %.
5. Closed-form CPW / stripline with 30 pi instead of eta0 / 4 are 6.9e-4 high (relevant to L7 EM gates).
6. LE10 and LE11 geometry are not in the repo; LE10 here uses recalled TNSB geometry (reproduces -5.38 MPa within
   1.2 % on a still-converging sequence). LE11, T1 need their geometry sources (FeenoX inputs or the vendor manual pages)
   before they can be built; T2 (radiation) and T3 (transient) are outside these steady linear references.

## Wave 2 plan (coordinator assignment, written 2026-10-20 before any fetch or run)

1. LE10: verify geometry and BCs from public pages (Abaqus Benchmarks LE10, FeenoX examples nafems-le10.geo / .step /
   .fee, Altair and CAST3M pages cited in validation/cases/B/nafems-LE10.yaml), moderate WebFetch only, URLs + retrieval
   date recorded here. Fix the script; drop the UNVERIFIED flag only when verified.
2. LE11 and T1 from the public inputs listed in validation/cases/B/nafems-LE11.yaml and nafems-T1.yaml. T1: confirm or
   flag r = 1 mm and the membrane size / point D.
3. Engine cross-check: run TA1, TA2, TA3a/b, TA4, TA6, XB4, XB5 through engine/cli.mjs (node, nice 10) at matched
   meshes; compare with apref.compare; table engine vs reference vs closed form. Mechanics (engine/src/mech) if present:
   MA1-MA6, XB1, XB2.
4. XB2 120 mm geometric-nonlinearity finding: coordinator records it in DevLog-012 (model-limit item); noted here.

### Wave 2 progress log

- 14:18-14:20 LE10 sources fetched (retrieved 2026-10-20): FeenoX `examples/nafems-le10.step` (mm: inner ellipse
  2000 x 1000, outer 3250 x 2750, z -300..300, curve at z = 0 on the outer face), `nafems-le10.geo` (groups upper,
  DCD'C', ABA'B', BCB'C', midplane = curve), `nafems-le10.fee` (p 1 MPa on upper; v = 0 DCD'C'; u = 0 ABA'B';
  u = v = 0 BCB'C'; w = 0 midplane; E 210 GPa, nu 0.3; sigma_y at (2000, 0, 300)), Abaqus Benchmarks LE10 page (same
  BCs; uz = 0 on line EE'; target 5.38 MPa compressive). The wave-1 script already matched; UNVERIFIED flag removed,
  URLs in the script and the result file.
- 14:20-14:40 LE10 convergence work. Uniform Q2s levelled at -5.44 MPa, one-sided grading (toward D) at -5.412. An
  independent P2-tet model (gmsh, local refinement at D, extrusion split at z = 0 so line EE' exists; first attempt had
  only 2 EE' nodes and gave nonsense) gives -5.3976 -> -5.3847 MPa as the far field is refined. The result is sensitive
  to resolution at the clamped outer face / log-singular EE' support, not only near D. Two-sided s-grading (toward D and
  toward the outer face): Q2s -5.6022, -5.4563, -5.4182, -5.3878 MPa (66399 DOF); Q2 -5.4004 (62475 DOF). sigma_xx at D
  (free face, exact 0) is a local accuracy check: tet +939 Pa, hex Q2s -23 kPa. u_z near EE' is log-singular in 3D and
  is not a convergence measure. tet_p2 levels are not one h-family: their Richardson entries are not meaningful.
- 14:40-14:44 LE11 sources fetched: FeenoX `nafems-le11.geo` (points, arcs r 1.0 / 1.4, heights 0.345 + 0.345 + 0.400
  above z = sin 45, revolve Pi/2) and `nafems-le11.fee` (T = sqrt(x^2 + y^2) + z; E 210e3 MPa, nu 0.3, alpha 2.3e-4;
  v = 0 xz, u = 0 yz, w = 0 xy and HIH'I'; sigma_z(1, 0, 0)); reference temperature not stated (0 assumed, as L4).
  `scripts/ref_nafems_le11.py`: 3-block mapped MeshHex2 revolved. Axisymmetric field: 6 circumferential elements
  (12 changes the result by 2.7e-5). Q2s -103.44 ... -105.54 MPa (51495 DOF), Q2 -104.92 ... -105.84 (55263 DOF);
  Richardson -105.99 / -106.02 MPa (p_obs 1.3 / 1.7): +0.95 % vs -105 (FeenoX -105.04 on a coarse mesh; Abaqus C3D20
  fine -103.26). sigma_rr at A (free inner face) -0.34 MPa -> 0.
- 14:44-14:46 T1 sources: Abaqus page (no dimensions in text, figure only) and the Abaqus input deck
  `SIMAINPRefResources/nt1xxf8x.inp`: quarter square 10 x 10, hot spot quarter disk r = 1.0 (doubled arc nodes tied by
  *EQUATION), E 100e9, nu 0.3, alpha 1e-5, T = 100 on the hot set, SYMX/SYMY rollers, output elements 8 / 12 meeting at
  (1, 0): D = (1, 0) outside. L4's r = 1 inference confirmed; membrane size and D now known (Altair page: figure only).
  `scripts/ref_nafems_t1.py` (2D plane stress, gmsh P2 triangles, arc snapped; new `fem.assemble_elastic_2d`):
  sigma_yy(D) 50.440 MPa finest, Richardson 50.448 (p 1.8); inside -49.554. Closed forms (own, plane stress):
  infinite plate +-50.0, free disk R = 10: +50.50 / -49.50. The 50.0 target is the infinite-plate value; the
  10 x 10 square gives +0.9 %. Abaqus CPS8 51.53, CPS4 50.94.
- 14:47-14:50 Engine thermal cross-check (`engine_xcheck/run_engine.mjs` + `xcheck_thermal.py`): decks carry every
  reference grid plane (engine `planes`, grading and max_xy disabled), so the engine grid equals the reference grid
  (max coordinate difference 1e-18 m). Engine Q1 = reference Q1 node by node to <= 1.1e-10 K on all cases.
- 14:50-14:53 Engine mechanics cross-check (`run_engine_mech.mjs` + `xcheck_mech.py`): engine q2s vs reference Q2s
  corner-node u after removing the best-fit rigid motion of the difference (different pinned points): 1e-13 to 1.6e-8
  relative; probe stresses equal to 8-9 digits. Engine limitation found: `curvatureFit` throws "singular
  least-squares system" on a 1 mm strip (central-50 % window holds one y node line, the yy term is always fitted) and
  "1 nodes in the window" on a coarse cube; passing an explicit `region` works (used for MA3 / XB1-w1).
- 14:53-14:55 MA7 probe check (L4 note: Si sigma_rr(2a) 1.8 % off). Single-point values of the element-wise P2 stress on
  the unstructured tet mesh scatter by about +-1.7 % with angle at r = 2a (-35.27 at the 22.5 deg probe was the worst
  case); the 9-angle ring mean is -35.990 MPa vs -35.895 closed form (-0.27 %), sigma_tt -0.07 %, r = 1.05a -0.14 % /
  +0.16 %, Cu -2.7e-5 (P2 level 4, R = 20a). Ring means (`*_mean_Pa`, with `*_spread_rel`) added to MA7 and XB3 and are
  the gate quantities; single points kept for reference only. A ring at r = a(1 + 1e-6) defeats the isoparametric
  inverse map at the curved interface, so the near-interface ring is at 1.05a with the closed form evaluated there.
- 14:56 TA3 vs L1's exact rectangular-source series (`engine/src/thermal/analytic.mjs rectSpreadingSeries`, M = 2000):
  TA3a centre 1.667724062 / avg 1.526975501 K/W vs reference Q2 Richardson 1.667724256 / 1.526976147 (1.2e-7 / 4e-7);
  TA3b 0.1605777919 / 0.1321365628 vs 0.1605778127 / 0.1321365786 (1.3e-7 / 1.2e-7).

## Wave 2 results

NAFEMS (geometry, BCs and loads verified against public inputs, URLs in the progress log and in each results file):

| Case | Quantity | Reference value | Discretisation | DOF | Target | Diff | Note |
|---|---|---|---|---|---|---|---|
| LE10 | sigma_yy at D | -5.3847 MPa | P2 tet, local refinement at D, lc_far 0.09 m | 114603 | -5.38 (FeenoX -5.37968) | +0.09 % | sigma_xx(D) +939 Pa (exact 0) |
| LE10 | sigma_yy at D | -5.3878 MPa | Q2s mapped hex, two-sided grading 1.25, level 5 | 66399 | -5.38 | +0.15 % | one-sided grading plateaus at -5.412; Richardson columns in the LE10 results file are not meaningful (graded / tet levels are not one h-family): use the finest values |
| LE11 | sigma_zz at A | -105.99 MPa (Richardson; finest -105.54) | Q2s mapped hex, 3 blocks, level 8 | 51495 | -105 (FeenoX -105.04) | +0.95 % | Q2 Richardson -106.02; 6 vs 12 circumferential elements 2.7e-5 |
| T1 | sigma_yy at D (1, 0) | 50.448 MPa (Richardson; finest 50.440) | P2 triangles, plane stress, lc 0.0125 at r = 1 | 18330 | 50.0 | +0.9 % | 10 x 10 quarter vs infinite-plate target; free disk R = 10 closed form 50.50 |

Engine vs reference vs closed form, thermal (engine Q1 on the identical grid; "ref" = converged reference Q2):

| Case | Quantity | Level (DOF) | Engine | Engine - ref Q1 (same grid) | Engine vs ref | Engine vs closed form |
|---|---|---|---|---|---|---|
| TA1 / TA2 | T_bottom | 1 (126 / 135) | 145.364692 / 155.364692 C | 0 (nodes 2e-11 K) | -9e-14 | -9e-14 |
| TA3a | R_total max / avg | 2 (8405) | 1.667921 / 1.526316 K/W | 0 (4e-12 K) | +1.2e-4 / -4.3e-4 | +6.1e-3 / +1.4e-2 (Lee formula); series: +1.2e-4 / -4.3e-4 |
| TA3b | R_total max / avg | 2 (8405) | 0.1605823 / 0.1320757 K/W | 0 (3e-12 K) | +2.8e-5 / -4.6e-4 | -1.1e-2 / +7.1e-3 (Lee formula) |
| TA4 | q / theta_b | 2 (2583) | 0.02091836 W/K | 0 (1e-11 K) | +1.3e-5 | -5.4e-5 (1D fin) |
| TA6 | T centre | 1 (392) | 55.000000 C | 0 (7e-14 K) | 0 | 0 |
| XB4 | T_max; R_th avg | 2 (4695) | 42.89663 C; 0.154764 K/W | 0 (6e-12 K) | +1.3e-5; -1.3e-3 | - |
| XB5 | Tj A / B | 2 (2250) | 75.58746 / 56.77573 C | 0 (1e-10 K) | -8.1e-4 / -6.0e-4 | - |

Engine vs reference vs closed form, mechanics (engine q2s and q1im on the identical grid; u diff = engine q2s vs
reference Q2s, rigid motion removed; kappa fits differ by node set: engine corner nodes, reference all Q2s nodes):

| Case | Quantity | Level | q2s (DOF): value, u diff | q1im (DOF): value | Ref converged | q2s vs ref | q1im vs ref | q2s / q1im vs closed |
|---|---|---|---|---|---|---|---|---|
| MA1 | u | 2 | (1275) 8.4e-13 | (375) 8.7e-13 | exact | - | - | - |
| MA3 | kappa | 2 | (5967) -2.157739, 5e-12 | (1701) -2.157897 | -2.157647 | -4.3e-5 | -1.2e-4 | -7.0e-4 / -7.7e-4 (beam) |
| MA4a | kappa | 2 | (6567) -2.1562312, 2e-11 | (1815) -2.1563079 | -2.1562307 | -2.5e-7 | -3.6e-5 | -4.1e-7 / -3.6e-5 |
| MA4a | sigma Si bottom / Cu top | 2 | 67.38230 / -52.40847 MPa | 67.40062 / -52.42798 | 67.38224 / -52.40842 | +8e-7 / -9e-7 | +2.7e-4 / -3.7e-4 | +1.5e-6 / -1.8e-6 |
| MA4b | kappa | 2 | (9339) 1.1927247, 5e-10 | (2541) 1.1927913 | 1.192706 | +1.6e-5 | +7.2e-5 | -4.8e-5 / +7.6e-6 (CLT) |
| MA4b | sigma Si bottom / top | 2 | -101.0934 / 65.8059 MPa | -101.1666 / 65.7882 | -101.0922 / 65.8052 | -1.2e-5 / +1.1e-5 | -7.4e-4 / -2.6e-4 | +4.8e-5 / -3.8e-5 |
| MA5b | kappa | 2 | (6567) -0.0652447, 3e-10 | (1815) -0.0652452 | -0.0652403 | -6.8e-5 | -7.5e-5 | +1.0e-4 / +9.2e-5 (CLT) |
| MA6 | kappa | 2 | (14175) 0.03354839, 4e-10 | (3969) 0.03354839 | exact | -1.2e-9 | +2.7e-11 | same |
| XB1 w 1 / 10 mm | kappa_x | 1 | -2.157922 / -2.159072, 1e-12 / 5e-12 | -2.158179 / -2.159074 | -2.157682 / -2.159064 | -1.1e-4 / -3.5e-6 | -2.3e-4 / -4.6e-6 | - |
| XB2 50 / 120 mm | kappa | 2 | 1.1927247 / 1.1927683, 5e-10 / 1.6e-8 | 1.1927913 / 1.1928403 | 1.1927156 / 1.192763 | +7.6e-6 / +4.5e-6 | +6.3e-5 / +6.5e-5 | - |

Reading: the engine reproduces the reference on identical grids at round-off for Q1 heat and q2s elasticity (same
elements), so engine-vs-reference differences at a given grid are discretisation only. Engine Q1 heat at level 2 is
within 1.3e-5 to 8e-4 of the converged values; q1im is within 1.2e-4 on curvature and 7.4e-4 on probe stresses at level
2. All rows pass the tier-A global gate (1e-3) except q1im probe stresses at level 1 (MA4b 1.1-1.4 %) and the TA3
comparison against the circular-equivalent Lee formula (formula error, not engine error; the exact series agrees).
Full rows: `results/engine-xcheck-thermal.json`, `results/engine-xcheck-mech.json`; engine decks and raw outputs in
`logs/engine-xcheck-*/`.

Model-limit item for DevLog-012 (coordinator): XB2 at 120 mm has sag / thickness 2.35 (coplanarity 4.29 mm on a
1.825 mm stack); linear small-strain results there are not physical warpage magnitudes; geometric nonlinearity needed.

## Wave 3 plan (EM desktop reference; coordinator assignment, written 2026-10-20 before any EM code)

1. `apref/em3d.py`: frequency-domain E curl-curl on scikit-fem tets with H(curl) Nedelec elements (order 1 and, if
   scikit-fem provides it, order 2), complex eps (tan delta), PEC by eliminating tangential edge DOFs, wave ports by
   the standard modal port boundary term (2D port mode from a 2D solve on the port face: quasi-TEM electrostatic
   potential for TEM-like lines, analytic TE10 for guides), S from modal projection, de-embedding by the port beta,
   pi model from Y. PML by complex coordinate stretching (diagonal anisotropic eps, mu) only if a case needs it
   (EM-4 is a closed PEC box with wave ports).
2. Verification: TE10 beta and matched S11 on a rectangular guide; coax block Z0 / beta / S11 vs closed form; compare
   with L7's E6 gate table (DevLog/lanes/L7-em2d.md).
3. EM-4 from `sims/em/em4_microbump_gsg_reference_deck.md` (true cylinders via gmsh), order 1 and 2, two or more
   meshes, S11 / S21 / pi-model L, C at 1, 10, 25, 50, 75, 100 GHz; where L7's browser values sit.
4. EM-5a: rebuild Fig. 2 of ectc51909.2023.00230 from cached text / figure crops (local, read only) with locators and
   uncertainty; sweep pitch / pads / liner / Si sigma; report whether the 40-45 GHz dip can be bracketed.
5. openEMS / Palace only if scikit-fem is inadequate; report effort and size first.
Limits: nice 10, < 4 GB RSS (watchdog), < 5 min per run.

### Wave 3 progress log

- 15:07 Plan written. scikit-fem 12.0.2 H(curl): only ElementTetN1 (lowest order) in 3D (N2 / N3 exist in 2D only)
  and no complex sparse factorisation lighter than SuperLU (L7 measured nnzL 5.6e7 at 103k order-1 DOF), so an order-2
  3D EM reference within 4 GB is not possible with scikit-fem. NGSolve 6.2.2608 (LGPL, uv wheels incl. netgen-occt)
  installed instead (6 s; venv 282 -> 528 MB): H(curl) of any order, OCC true cylinders, complex-symmetric
  sparsecholesky (and UMFPACK). Allowed in the wave-1 brief; openEMS / Palace not needed (item 4).
- 15:15 `apref/em_ngs.py`: E curl-curl, PEC Dirichlet, first-order modal port term (exact for a homogeneous guide's
  single mode), modal projection S, terminal V / I sampling and line fits. TE10 1 x 0.5 mm, 200 GHz: order 1 h 100 um
  beta -1.23 %, S11 -51.8 dB (L7 browser gate on the same guide: +1.06 %, -51.7 dB); order 2 -3.6e-5 / -104.7 dB;
  order 3 h 200 -1.2e-6 / -123 dB. Coax 50 / 115 um, eps 2.1: order 3 Zc +2e-4, beta +3e-5 at 10 and 50 GHz.
- 15:20-15:55 EM-4 full-wave extraction attempts. Findings: (1) the deck's 66.5 um lead-ins do not isolate the ports:
  the slowest evanescent box mode (TE10-like across 140 um, cutoff ~550 GHz) decays 1 / e per ~45 um; (2) wave
  separation from V(x) alone is ill-posed below ~25 GHz (beta x window 0.025 rad at 10 GHz); (3) point-probe
  currents from curl E scatter 1-4 %; area-weighted (level-set averaged) loop integrals fix this; (4) a geometry bug:
  the strip bottom (z = 6) coincides with the oxide / underfill interface and inherited the name "interface", i.e. the
  strip had no PEC bottom (half model; the full model was right by luck); fixed by topological face naming (faces
  shared by two dielectric solids = interface, single-solid non-outer faces = conductor), checked by face areas;
  (5) even with clean V / I (+-0.5 % vs the 2D Zc, order 3), the pi-model Y of this electrically tiny block
  (beta x 27 um = 0.011 rad at 10 GHz) amplifies amplitude errors ~100x, and the unstructured lead-in's discrete Zc
  differs from the exact 2D Zc by ~1e-3: C2 swung between -3 and +66 fF at 10 GHz. Full-wave S11 / S21 at 50-100 GHz
  are robust; L and C are not, from full wave on unstructured tets (L7 avoids this with discretisation-consistent
  port modes on extruded meshes).
- 16:00-16:20 Quasi-static L and C reference instead (`apref/em4.py build_static / static_LC`,
  `scripts/ref_em4_static.py`): half model (y = 0 magnetic wall), electrostatics for C (signal 1 V, grounds 0,
  line-continuation faces natural), magnetic scalar potential for L (B . n = 0 on conductors and port faces,
  psi = 0 / 1/2 on the magnetic-wall pieces below / above the signal path). De-embedding by a same-mesh uniform-line run
  (C_block = C_total(DUT) - C_total(line) + C' 27 um; same for L); the 2D-only de-embedding is 1-12 % off because the
  3D lead-in carries a 0.2-1.2 % per-length discretisation error. Bug found by the uniform-line check: factor 2 in L
  (fixed). Physics fix: the ground posts join the two ground planes (multiply connected domain); their return
  current enters as kappa grad(theta) (angle about both post axes, same sense, so the magnetic wall holds) with kappa
  minimising the magnetic energy (inductive-limit current split): each post carries 0.237 I; L drops 10.9 -> 9.03 pH.
- 16:20 Cross-validation: the quasi-static pi model (L 9.032 pH, C1 = C2 = 9.367 - 0.049j fF) gives S11 -18.62 /
  -12.91 dB at 50 / 100 GHz; the independent full-wave NGSolve run (order 3, 202k DOF, V+I fit) gives -18.59 / -12.83 dB
  and S21 -0.066 dB at 50 GHz (pi: -0.067): agreement within 0.1 dB.

## Wave 3 results: EM gates and EM-4

Verification gates (`scripts/ref_em_gates.py`, `results/EM-gates-skfem.json`; NGSolve 6.2.2608 H(curl)):

| Gate | Discretisation | DOF | Result | L7 browser gate (DevLog/lanes/L7-em2d.md) |
|---|---|---|---|---|
| TE10 guide 1 x 0.5 mm, 200 GHz | order 1, h 100 um | 21.7k | beta -1.23 %, S11 -51.8 dB, abs(S21) 0.99997 | beta +1.06 %, S11 -51.7 dB (h 100 um, 23.1k DOF) |
| same | order 2, h 100 um | 82.8k | beta -3.6e-5, S11 -104.7 dB | - |
| same | order 3, h 200 um | 35.5k | beta -1.2e-6, S11 -123 dB | - |
| Coax 50 / 115 um, eps 2.1, 10 and 50 GHz | order 3, h 25 um | 213k | Zc +2e-4, beta +3e-5 (terminal V / I fit) | Z0 -0.77 % / -0.61 %, beta +5e-4 / +6e-4 |

EM-4 reduced (deck `sims/em/em4_microbump_gsg_reference_deck.md`; true cylinders; half model y >= 0, magnetic wall):

| Quantity | Desktop reference | Method / convergence | L7 browser (59.8k DOF / 103k DOF) | L7 vs reference |
|---|---|---|---|---|
| Series L (pad edge to pad edge) | 9.03 pH (8.95 / 9.02 / 9.04 / 9.03; ext 50 um 9.01) | 3D magnetostatics, order 3-4, h 5-3 um, ground-post return currents by energy minimisation, same-mesh line subtraction | 10.06 / 10.30 pH | +11 % / +14 % |
| Shunt C1 = C2 | 9.37 fF (C_block 18.83 / 18.76 / 18.76 / 18.73) | 3D electrostatics, same levels; C1 = C2 by the 180-degree rotation symmetry | 10.79 / 9.95 fF | +15 % / +6 % |
| G (tan delta, complex C) | Im C1 = -0.049 fF | complex-eps electrostatics | - | - |
| S11 at 50 / 100 GHz | -18.62 / -12.91 dB (pi model); full wave -18.59 / -12.83 dB | pi model from L, C; independent full-wave NGSolve order 3 (202k DOF), V+I fit | -17.3 / -11.6 dB | +1.3 dB (more reflective) |
| S21 at 50 / 100 GHz | -0.067 / -0.241 dB (pi); full wave -0.066 dB at 50 GHz | as above | -0.086 / -0.320 dB | 0.02 / 0.08 dB more loss |
| S11 at 1 / 10 / 25 / 75 GHz | -52.5 / -32.5 / -24.6 / -15.2 dB (pi) | quasi-static L, C | -51.2 / -31.2 / -23.3 / -14.0 dB | +1.3 dB at every frequency |

Reading: L7's browser values sit outside their own stated mesh band (L -2.3 %, C +8 %): its L is 11-14 % high and C 6-15 %
high; the 60k -> 103k trend moves C toward the reference but L away from it. The constant +1.3 dB S11 offset is the
C excess (capacitive mismatch dominates). Not resolved here: the deck's 1-10 GHz pi-model numbers from full wave on
unstructured tets (ill-conditioned for this 0.011-rad block, see the progress log); the quasi-static values are the
reference there, and the full-wave S at 50-100 GHz confirms them to 0.1 dB.
- 16:22-16:46 EM-5a reduced (L7 geometry) on NGSolve (`apref/em5a.py`, `scripts/ref_em5a.py`): geometry read from
  `sims/em/em5a_tsv_gsg_chain_reduced.yaml` (true cylinders), half model, quasi-TEM modal ports built on the 3D mesh's
  port faces (surface H1 electrostatics, lossy e_t and vacuum q_t; rank-1 modal term + local term on the complement,
  Woodbury on one sparse factorisation). Port Zc 68.64 + 0.38j (0.1 S/m) / 50.58 + 18.67j ohm (10 S/m) vs an independent
  2D cross-section solve 68.88 + 0.38j / 50.71 + 18.71j (0.3 %). Order 1 only: the 1 um liners force ~1 um isotropic
  tets along 100 um TSVs (169k DOF, 2.9 GB); order 2 exceeded 4 GB (watchdog) even at h 8 um.
- 16:46-16:54 EM-5a paper-geometry bracket (`apref/em5a_cascade.py`, `scripts/ref_em5a_bracket.py`): Fig. 2 (p.2)
  measured on 5x crops with the 0.3 mm scale bar (232 px = 0.3 mm, 1.30 um / px): top stadium segments ~155 um long,
  TSV-to-TSV pitch along the chain 94-98 um (TSV1 to TSV4 ~306 um), stadium width ~60 um (155 minus TSV pitch), TSVs
  rendered ~14-20 um wide (text: 10 um), G-S-G row pitch only bounded to ~60-145 um (perspective depth axis not
  calibrated). Quasi-TEM cascade (front strips, 3-wire TSV sections with liner in lossy Si, back strips; 2D C*(w), C0
  per section; skin R) validated against the 3D reduced results: S11 within 2-4 dB (cascade more reflective), S21
  within ~0.2 dB, no junction parasitics.

## Wave 3 results: EM-5a

Reduced case (L7 browser geometry), S at 50 ohm, NGSolve order 1, meshes h 4 / 6 um (169k / 152k DOF; values h 4):

| f (GHz) | 10 S/m: S11 / S21 (dB) | L7 10 S/m | 0.1 S/m: S11 / S21 (dB) | L7 0.1 S/m | 0.1 S/m, Zc-referenced S11 |
|---|---|---|---|---|---|
| 1 | -27.3 / -0.213 | -26.1 / -0.250 | -53.8 / -0.008 | -59.1 / -0.010 | -47.6 |
| 10 | -21.5 / -0.774 | -20.4 / -0.857 | -34.8 / -0.011 | -54.6 / -0.011 | -27.7 |
| 20 | -21.0 / -0.821 | -20.4 / -0.904 | -29.1 / -0.018 | -50.6 / -0.014 | -21.8 |
| 40 | -20.2 / -0.883 | -20.8 / -0.946 | -24.1 / -0.041 | -49.5 / -0.028 | -16.3 |
| 45 | -20.0 / -0.901 | -21.0 / -0.957 | -23.4 / -0.048 | -50.5 / -0.034 | -15.5 |
| 67 | -20.1 / -0.981 | -22.2 / -1.016 | -22.3 / -0.080 | -47.7 / -0.065 | -13.1 |

h 6 vs h 4: S11 within 0.5 dB, S21 within 0.01 dB. 10 S/m: agreement with L7 within 1-2 dB (S11) and 0.04-0.08 dB (S21).
0.1 S/m: L7's S11 is 20-27 dB lower than mine above 1 GHz. With a 68.9 ohm port line (independent 2D solve) a
50 ohm-referenced S11 of -50 dB over 10-67 GHz is not possible (the uniform line alone gives about -30 dB at 10 GHz,
cascade -30.8 dB); likely a reference-impedance or variant-patch issue in the L7 hr_si run (finding for L7).

Paper geometry (4 TSVs, G-S-G; HFSS dip 40 GHz a-m5, measured 45 GHz a-m4): quasi-TEM cascade bracket over the ranges
in `scripts/ref_em5a_bracket.py` (P 60-150, W 40-80, TSV pitch 85-110, pad-to-TSV 50-200 um, front oxide 1-5 um, back
oxide 1-2 um, liner 0.2-1 um, d 10-20 um, Si 0.1-10 S/m log-uniform; 150 samples):

| Result | Value |
|---|---|
| Nominal (P 100, W 60, pitch 96, lead 120, d 10, sigma 1) | dip 60 GHz, S11 max -11 dB, S21(67) -0.46 dB |
| One-at-a-time range of the dip | 53.5-65 GHz (d 20 um: 53.5; lead 200 um: 55; lead 50 um: 65); sigma moves depth and loss only |
| Monte Carlo: samples with a dip in 2-67 GHz | 130 of 150; dip 26-66.5 GHz, median 57.5, p10-p90 50-63.5 GHz |
| Fraction with the dip in 40-45 / 35-50 GHz | 1.3 % / 9.3 % (all need lead > 135 um and d 13-19 um) |
| Strongest drivers (Spearman with f_dip) | pad-to-TSV lead -0.74, TSV diameter -0.27, P +0.20, W +0.17 |
| S11 max over 2-67 GHz / S21(67) | median -13 dB (p10 -21, p90 -9) / median -0.54 dB |

Reading: the 40-45 GHz dip lies inside the plausible range but is not predicted: the nominal geometry gives 60 GHz,
and only geometries with long pad leads and fat TSVs reach 40-45 GHz. The cascade omits landing-pad and bend
parasitics (they add capacitance and lower the dip), so the true nominal dip is likely below 60 GHz, by an amount this
lane cannot quantify without a full 3D model of the 12-TSV chain, which does not fit 4 GB here (the 6-TSV reduced
case already needs 169k order-1 DOF). Honest status: not bracketed tightly; the missing pad / lead layout (probe-tip
reference to TSV1) is the decisive unknown.

## Item 4 (openEMS / Palace)

Not installed. NGSolve (uv wheel) covered the gates, EM-4 and the EM-5a reduced case. The remaining blocker (full
12-TSV EM-5a chain at order >= 1 with 0.2-1 um liners) is memory: a direct solver on ~3e5-6e5 complex DOF. Palace
(Apache-2.0; MFEM + hypre AMS iterative solver, MPI) would address it but needs a source build (Spack / CMake, MPI,
MFEM, hypre, libCEED: estimated hours and ~1-2 GB of build tree, not verified); openEMS (GPL, FDTD) would staircase
the 0.2-1 um liners on a 10 um TSV and needs sub-um cells (very small time steps). Recommendation: only if Wentao wants
the full-chain 3D model; ask first (install size and build time).

## Open issues (wave 3)

1. EM-4 full-wave pi-model L and C at 1-10 GHz are not resolved on unstructured tets (ill-conditioned for this
   0.011-rad block); the quasi-static values are the reference there (full-wave S at 50-100 GHz agrees to 0.1 dB).
2. EM-4 L7 values sit outside their own mesh band (L +11-14 %, C +6-15 %); L7 to check their L convergence (their L
   rises with refinement, away from 9.03 pH) and whether ground-post return currents are resolved.
3. EM-5a hr_si: L7 S11 20-27 dB below this reference above 1 GHz; check reference impedance / patch application.
4. EM-5a paper chain: dip not predicted; needs the pad / lead layout or a full 3D (Palace-class) model.
5. venv now 548 MB (NGSolve 246 MB, pillow 20 MB).
