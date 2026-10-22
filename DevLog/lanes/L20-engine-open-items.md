---
title: Lane L20 - engine open items (mechanics, materials, EM) after L8, L11, L13
date: 2026-10-21
status: done (hand-off ready)
scope: engine/src/{mech,materials,homog,em2d,em3d}/, engine/tests/ (non-family), validation/reference/
authors: Claude (lane L20 subagent), at Wentao Jiang's request
---

# L20: engine open items

Binding: DevLog-013 shared rules and L20 row; sims/SPEC.md v0.19; L8 "Wave 4 open issues"; L11 hand-off; L13 open
hand-off; audit A3 S6 / M9. Suite at start: 292 / 292 (DevLog-013).

## Plan (2026-10-21 17:53 PDT, before implementation)

1. W shape class test (mech-core): a physical case whose JEITA diagonal profile is multi-modal (centre dome of a
   low-CTE centre region, rim lift from a high-CTE frame on the same substrate face), asserted `W` with the diagonal
   turn counts > 1; plus a prescribed-u_z surface (u_z = a r^2 - b r^4 type W/M profile) through `warpage()` to pin the
   classifier itself independent of a solve. No change to the criterion.
2. Plate bifurcation (thin bilayer, large square plate, uniform cooling): new scikit-fem total-Lagrangian SVK solid
   reference in validation/reference (3D hex, quarter model, load-stepped Newton; symmetric branch and an imperfect
   (slightly rectangular or slightly orthotropic-CTE) branch to locate the bifurcation). Compare principal curvatures
   k_x, k_y vs load with the engine's solveMechNonlinear on the same geometry. Report which branch the engine follows
   with exact symmetric data and with the imperfection; gate in mech-nl (engine vs reference values stored in the
   reference results JSON; tolerance stated). If the engine stays on the unstable symmetric branch, add a
   stability indicator (tangent inertia or a perturbation probe) and a warning, documented.
3. Newton robustness: measure iterations per load step on the bimetal strip and on the plate; add a residual-norm
   backtracking line search (Armijo on ||R||, lam halved, min 1/16, extra residual assemblies only) and a secant
   predictor (extrapolate the previous load-step increment); keep whichever reduces iterations; tests assert the
   counts.
4. q2s p-MG PCG on the tangent: reproduce on a plate above 1e5 DOF-equivalent (or force `linear: 'pcg'` on a small
   case), diagnose (indefinite geometric stiffness, coarse level built from the material operator only, or rigid
   modes), fix if tractable (e.g. coarse level from the assembled tangent by Galerkin projection, or MINRES / shifted
   preconditioner), else document precisely.
5. L11: canonical homog key (constituents through lib.canonicalKey, fraction as Number, default axis made explicit)
   for table indexing and lookup; the returned entry keeps the requested key; fingerprints already guard values.
   Tests: `homog:c4:copper+underfill:0.2101` hits the `copper+underfill_cuf` row with identical values. Table JSON
   untouched unless a rebuild is needed.
6. L13: port-Z check reference: em2d solve at the fixed mesh plus refinement (h/2 or P-order) with a convergence
   estimate (Richardson or difference of the last two levels); the 3 % warning compares against the converged
   (extrapolated) value; port_checks carries the levels and the estimated error. Tests.

Order as listed; suite (`cd engine && nice -n 10 npm test`) after each task; heavy runs one at a time under nice.

## TODO

- [x] 1 W shape test
- [x] 2 plate bifurcation reference + gate
- [x] 3 Newton line search / predictor (measured; defaults unchanged, options added)
- [x] 4 q2s p-MG on the tangent (column smoother; Hermite prolongation measured, not implemented)
- [x] 5 homog key canonicalization
- [-] 6 em2d port-Z reference refinement: dropped by the coordinator (new EM lane); nothing touched in em2d / em3d
- [x] final suite, hand-off, SPEC requests

## Progress log

- 2026-10-21 17:53 PDT: plan written; baseline suite started (nice 10, background).
- 2026-10-21 17:56 PDT: baseline suite 293 / 293 pass, 160.4 s wall, peak RSS 1.10 GB (count 293, not 292: another
  lane's test or my W test was already in).
- 2026-10-21 17:58 PDT (logged 18:16): task 1 done. `engine/tests/mech-core.test.mjs` new test "shape_class W (lane L20)": (a)
  prescribed u_z = 10 um cos(2 pi r / Rc) (W) and its negative (M) on a 20 mm plate, full model and quarter crop ->
  W with >= 2 turns per diagonal; parabola control -> dome; (b) solved: 20 x 20 x 0.5 mm substrate (E 25 GPa, 15
  ppm/K), centre Si die 8 x 8 x 0.7 mm, 3 mm wide 0.5 mm Cu perimeter ring, 150 -> 25 C, q1im quarter -> W, diagonal
  turns [3, 3], deviation from the chord max 0 / min -29.01 um (max_xy 1 mm) and -29.04 um (0.5 mm, same class).
  Criterion unchanged. Scratch variant (die 10 mm): mixed-sign deviation (+10.9 / -24.1 um) also W, with
  `diagonal_turns` null because the single-sign check returns before counting turns (reporting detail only).
- 2026-10-21 18:00 PDT (logged 18:16): coordinator update: task 6 dropped (new EM lane owns em2d / em3d). No em2d / em3d file was
  touched by this lane. Materials edits limited to task 5 (key canonicalization).
- 2026-10-21 18:16 PDT: tasks 2 and 3 implemented and gated (details in "Task 2" / "Task 3" below).

## Task 2: plate bifurcation (engine vs scikit-fem total Lagrangian)

Reference: new `validation/reference/apref/nonlinear.py` (TL SVK on scikit-fem hex bases, numpy assembly from the
continuum equations; tangent checked against central differences of the residual: rel. error 4.0e-11 at h 1e-4;
symmetric to 8e-17) and `scripts/ref_plate_nl.py` -> `results/PLATE-NL-skfem.json` (full record with timings in
`logs/ref-PLATE-NL-*.json`). Run 2026-10-21 18:08-18:10 PDT, 147 s, peak RSS 1.14 GB.
Deck (synthetic): 20 x 20 mm square, bottom 50 um alpha 0, top 50 um alpha 10 ppm/K, both E 100 GPa nu 0.3, quarter
model, symmetry supports as the engine (ux = 0 on x = 0, uy = 0 on y = 0, uz = 0 at the origin), one element per
layer, 10 x 10 in-plane cells (1 mm), dT = 0 .. -60 K in -5 K steps. Probes: bottom-face u_z at (L/2, 0), (0, L/2),
(L/2, L/2) minus the centre.

| Quantity | Reference (skfem q2s n10) | Engine | Note |
|---|---|---|---|
| lowest tangent eigenvalue, symmetric path, dT -30 / -35 K | +0.10701 / -0.15875 | Cholesky ok at -30; 1 negative LDL^T pivot at -35 | bifurcation dT -32.01 K (linear interpolation of the eigenvalue) |
| symmetric path sag_x = sag_y, dT -30 / -35 / -40 / -60 K (um) | 133.566 / 144.541 / 154.109 / 181.104 | same (max rel. diff 2.7e-8 over all steps) | branch 'follow' |
| stable branch after switching, edge sags dT -35 K (um) | 88.5502 / 213.105, corner 341.691 | 88.5502 / 213.1048, corner 341.6910 (max rel. diff 2.7e-8) | energy 1.73620e-5 J (symmetric) -> 1.73228e-5 J |
| stable branch dT -60 K (um) | 31.6513 / 481.454 | 31.6513 / 481.4541 | cylindrical |
| 1 % CTE imperfection, dT -35 / -60 K (um) | 222.613 / 83.0198; 487.349 / 30.769 | same (max rel. diff 2.9e-8) | natural branch, all steps stable |
| Rayleigh quotient of the engine's critical mode vs reference eigenvalue at -35 K | -0.158746 | -0.158746 | inverse iteration with a PD shift |
| discretization of the imperfect path: q2s n20 / q2 n10 vs q2s n10 | max 0.31 % / 0.039 % (sag_y at -60 K) | - | the gate compares on the same mesh |

Before this lane, the engine (Cholesky per Newton iteration) followed the symmetric branch of the perfect plate up to
-30 K and then threw "stiffness not positive definite (unconstrained rigid-body mode ...)" at the first Newton
iteration of the -35 K step (misleading message); with the 1 % imperfection it followed the natural branch.
Now (nonlinear.mjs): one symbolic analysis for all tangent solves; supernodal Cholesky first (success = positive
definite), symmetric indefinite LDL^T fallback (inertia); every converged load step reports `negative_pivots` /
`stable`; `branch: 'stable'` (default) at an unstable converged state: critical mode by inverse iteration with
(K + mu I)^-1 (mu: smallest x4 multiple of 1e-12 max diag that makes the LDL^T positive definite), strain energy
minimised along +-mode (step doubling + parabola), energy-descent Newton (shifted tangent while indefinite, Armijo
on the strain energy) until a stable state converges; `bifurcation[]` events, warnings; `branch: 'follow'` keeps the
unstable path and warns per step. Reference uses the same idea with scipy eigsh and a 1.5 |lambda_min| shift.
case.mjs: nonlinear results carry the solver warnings and `extra.nonlinear.bifurcation`; `nonlinear.branch` passed
through (SPEC request).
Answer to the task question: with exactly symmetric data the old engine stayed on the symmetric branch until it
became unstable and then failed; the new default switches to the bifurcated (cylindrical) branch identical to the
reference; 'follow' reproduces the symmetric (unstable) reference path.
Gates (mech-nl): perfect/stable, perfect/follow (inertia = sign of the reference eigenvalue at every step),
imperfect (natural branch) at 1e-6 relative on the same mesh, 8 load steps each (7-10 s per test).
Existing strip gate: curvature 101.2194607 1/m, sag 4.615677629 mm, Newton 5,10,...,10 before and after (identical
to 10 digits; HEAD copy run in scratch).

## Task 3: Newton robustness (measured; total Newton iterations)

| Variant | strip (8 steps) | imperfect plate (12 steps to -60 K) | remark |
|---|---|---|---|
| plain (L8) | 75 | 80 | residual pattern 1 -> 5e-3 -> 0.87 -> 2e-3 -> 0.31 ... (period-2 overshoot, then quadratic) |
| residual-norm Armijo backtracking | did not converge (step 2, 20 its) | did not converge (step 6) | cuts the rotation with the membrane overshoot |
| slope (energy-consistent, du . R(u + t du) = 0) search | did not converge (step 2) | 91 | same reason |
| secant predictor | 40 | 68, but jumps to the complementary (y-curved, stable) branch at -35 K | sag 93.5 / 206.6 um vs natural 222.6 / 83.0 |
| secant predictor guarded by the residual | - | same jump (70) | guard does not detect it |
| secant + slope search | 40 | 69 | no gain over secant |

Decision: defaults unchanged (no predictor, full Newton steps: the plain iteration converges and follows the correct
branch); `predictor: 'secant'` (opt-in, halves iterations on smooth paths, branch-jump hazard documented in the
code) and `lineSearch: 'slope'` (opt-in) kept; residual Armijo removed. Arc-length: not needed for these paths (no
limit point; the critical points are bifurcations, handled by the branch logic above). Test: strip with the secant
predictor <= 0.6 x the iterations and the same u to 1e-7.

## Task 5: canonical homog keys for the RVE table (L11 open item)

`engine/src/homog/resolver.mjs`: `canonicalHomogKey(lib, key)` (exported): constituents through `lib.canonicalKey`
(template aliases -> library keys), fraction and stack thicknesses as JS number strings, default axis dropped (z for
column kinds, plane for rdl_layer), kind kept, registered stack ids and unknown names unchanged. The table is indexed
by the canonical key (`indexTable(t, keyOf)`) and looked up by the canonical key of the request; the served entry
keeps the requested key; the cache key stays literal; fingerprints unchanged (they already canonicalize).
Shipped table (`rve_table_defaults.json`, not rebuilt or written by this lane): 53 literal keys -> 49 canonical keys; merged
spellings `copper+oxide` / `copper+sio2_film` at 0.5:x, 0.5:y, 0.5 plane, 0.85 plane; 36 duplicate (canonical key, T,
Tsf) groups, all bit-identical (C6, alpha6, k, rho, cp, fp, fp_k). Test (homog-overrides): alias / trailing-zero /
library-name spellings hit the full row of `homog:c4:copper+underfill_cuf:0.2101` exactly (C6, alpha, k deepEqual),
conduction rows of `homog:c4:copper+underfill:0.1963` serve the canonical spelling, an underfill_cuf k override under
the alias spelling misses on the fingerprint.
Possible numeric effect on runs: a request whose spelling previously missed (live RVE) or bracketed only its own
spelling's rows can now hit or interpolate rows of the other spelling (table rule: exact = live to 1e-12;
interpolation within 50 K). Suite gates checked below.

## Task 4: q2s p-MG PCG on the nonlinear tangent

Diagnosis (scratch scripts, nice 10; synthetic bilayer plate 2 x 50 um, quarter, one q2s cell per layer):
- Not specific to the nonlinearity: the LINEAR q2s system already needs 472 PCG iterations (rtol 1e-8) at cell aspect
  (in-plane cell / layer thickness) 20, 142 at 10, 52-56 at 5, 20 at 2 (point-block smoother, Galerkin q1 coarse).
  On the nonlinear tangents of the same plate (12 load steps to -60 K): 509-951 iterations, 13 of 80 tangents not
  converged in 1000. Thin-plate models with coarse in-plane cells (the nonlinear regime, and the snapped case
  geometries of L8) sit exactly at large aspect.
- Cause, isolated with a Python two-grid on the dumped engine matrix (exact coarse solve, rtol 1e-8): (a) the
  Galerkin coarse space (corner q1 functions inside q2s) locks in bending: Hermite-corrected mid-edge prolongation
  (w_mid += h (s0 - s1) / 8, slopes from the through-thickness difference of u_x / u_y) cuts 437 -> 81 (aspect 20),
  139 -> 64 (aspect 10); (b) the 3 x 3 point-block smoother does not smooth the stiff through-thickness coupling:
  a column (all nodes at one (x, y)) block smoother cuts 437 -> 48 and 139 -> 26 with the linear prolongation, 20 / 17
  with both. A q1im (incompatible modes) coarse operator instead of the Galerkin one made it worse (2375 at aspect 20:
  its bending modes are not representable through the linear prolongation).
- Indefinite tangents (past a bifurcation, e.g. 40 mm plate with -5 K steps): CG breaks down (p^T K p < 0); CG cannot
  be used there in any case.
Fix (mech/gmg.mjs, mech/nonlinear.mjs):
- `q2sColumnBlocks` + `buildQ2sPMG(..., {smoother: 'column'})`: banded Cholesky per (x, y) column (nodes sorted by
  z), damped column-block Jacobi (omega from the same power iteration). Default for solveMech q2s PCG unchanged
  ('block'); reachable there through `gmg: {smoother: 'column'}`; the nonlinear PCG path uses 'column'.
- Engine numbers: linear plate (rtol 1e-8): aspect 20: 472 -> 48 iterations (1153 -> 178 ms); 10: 142 -> 26; 5: 56
  -> 28 and 52 -> 17; 2: 20 -> 17. Nonlinear tangents (same 80 tangents): 43 - 104 iterations (median 64), all
  converged. End to end, 20 mm plate at 0.5 mm cells (14175 DOF, 12 steps): direct 65.8 s / 308 MB, PCG 66.2 s /
  507 MB, same Newton counts, max |du| / max |u| 8e-15. 40 mm plate (54735 DOF, 2 steps to -6 K): direct 78.7 s /
  965 MB, PCG 56.1 s / 449 MB (753 CG iterations in 13 solves), max |du| / max |u| 1.1e-13.
- PCG breakdown now raises "iterative tangent solve broke down (...): indefinite tangent, likely past a bifurcation;
  use linear 'direct'". The PCG path has no inertia, so no stability check or branch switching (warning
  'tangent stability not checked'). Case-level runs stay on direct (case.mjs NONLINEAR_MAX_DOF 1e5 unless raised).
- Not implemented: the Hermite-corrected prolongation (needs cross-component, z-offset parents in the Galerkin block
  stencil; measured two-grid gain 48 -> 20 at aspect 20). la/ untouched.
Test (mech-nl): aspect-20 plate: column < 100 iterations and > 4 x fewer than point blocks, solution = direct to 1e-6
(rtol 1e-10 on the residual; measured 1.6e-7); nonlinear 'pcg' path = 'direct' path (same Newton counts, u to 1e-8).

## Suite (hand-off)

- 2026-10-21 18:17-18:20 PDT (after tasks 1-3): 298 tests, 295 pass, 3 fail (families.test.mjs: emib_t defaults vs
  package3d.json, data injection browser path, transcribe drift alarm: config/package3d edits of another lane).
- 2026-10-21 18:42-18:45 PDT (after tasks 1-5): 300 tests, 295 pass, 5 fail, 204.4 s wall, peak RSS 1.10 GB. The 5:
  the 3 families drift tests above, and materials.test.mjs "cubic rotation follows SPEC 12 (active R)" and "wave-3
  entries resolve within their sourced ranges; placeholders refuse" (engine/data/materials/*.yaml modified in the
  working tree by another lane: silicon, encapsulants, metals, solders, tims_adhesives, _sources). None touches a file
  of this lane. Every L20 test passes; mech-nl 6 / 6 (about 37 s), mech-core, homog-overrides pass.
- Baseline at start: 293 / 293, 160.4 s, 1.10 GB. Added by L20: 7 tests (mech-core 1, mech-nl 5, homog-overrides 1);
  about +40 s of suite time (mech-nl plate gates 7-11 s each).

## Hand-off

Files changed (engine): `src/mech/nonlinear.mjs` (task 2-4), `src/mech/gmg.mjs` (task 4: q2sColumnBlocks, smoother
and coarseOp options of buildQ2sPMG), `src/mech/case.mjs` (nonlinear warnings, `extra.nonlinear.bifurcation`,
`nonlinear.branch` pass-through), `src/homog/resolver.mjs` (task 5), `tests/mech-core.test.mjs`,
`tests/mech-nl.test.mjs`, `tests/homog-overrides.test.mjs`. Reference: `validation/reference/apref/nonlinear.py`,
`scripts/ref_plate_nl.py`, `results/PLATE-NL-skfem.json` (logs/ref-PLATE-NL-20261021T180820.log and
-181047.json, gitignored). Not touched: engine/src/em2d, em3d, la, materials, families, data/materials, sims, cli.
Existing gate numbers: unchanged (strip gate identical to 10 digits). `rve_table_defaults.json` was not written by
this lane; it shows as modified in the working tree since 2026-10-21 18:45 PDT (another lane; presumably the
materials data edits). Re-checked against that version at 18:48: 625 rows, 53 keys, 36 duplicate canonical groups,
all identical; homog-overrides 7 / 7 pass.

SPEC requests (additive, coordinator):
1. Section 18 (nonlinear): `nonlinear.branch: stable | follow` (default stable); per load step `negative_pivots`,
   `stable`, `switched`; `extra.nonlinear.bifurcation[]` {step, T_C, negative_pivots, branch, attempts[{rayleigh,
   energy_J [before, after], newton, negative_pivots_after}], switched}; warnings on bifurcation / unstable steps;
   iterative tangent solves (`linear: pcg`, only above max_dof) have no stability check (warning) and fail with a
   named error on an indefinite tangent. Options `predictor: none | secant`, `lineSearch: none | slope` (library
   level, defaults none).
2. Section 18 (homog table rule): rows are indexed and matched by `canonicalHomogKey` (constituents through the
   alias map, numbers normalized, default axis dropped, kind kept); fingerprints unchanged.
3. Optional (mechanics solver options): `gmg.smoother: block | column` for q2s PCG (default block).

Open items:
- q2s PCG default for linear solveMech: 'column' is faster at every aspect measured (472 -> 48 at aspect 20, 20 ->
  17 at aspect 2); switching the default changes iterative results only at the PCG tolerance. Not switched (rule:
  existing defaults); coordinator decision.
- Hermite-corrected q2s -> q1 prolongation (two-grid 48 -> 20 at aspect 20 on top of the column smoother).
- Branch switching on the PCG path (CG breakdown direction is a negative-curvature direction; not used).
- Secant predictor can jump branches near a bifurcation (plate case above); a safe predictor would need a branch
  check (e.g. energy comparison with the unpredicted solve).
- Nonlinear case runs (120 mm, fan-out panel, L8 snapped geometry) were not re-run with the stability check; they
  completed with a Cholesky factorization at every Newton iterate (a failure threw), so every factorized iterate
  tangent was positive definite; the converged-state tangents themselves were not factored then. Whether those paths,
  a finer load stepping or the unsnapped geometry meet a bifurcation is not checked.
- Fresh-context audit of this lane: not run here (project agent cap); queued with the coordinator's round audits.
