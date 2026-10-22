# Audit A7 (round 1): L20 engine work, 2026-10-21

Fresh-context audit of lane L20 (notes `DevLog/lanes/L20-engine-open-items.md`): `engine/src/mech/{nonlinear,gmg,case}.mjs`,
`engine/src/homog/resolver.mjs`, `engine/tests/{mech-core,mech-nl,homog-overrides}.test.mjs`,
`validation/reference/apref/nonlinear.py`, `validation/reference/scripts/ref_plate_nl.py`,
`validation/reference/results/PLATE-NL-skfem.json`, `sims/SPEC.md` section 21. Diffs read with `git diff HEAD`.
This file is the only write. Scratch scripts (session scratch dir, not tracked) ran under `nice -n 10`, one at a time;
Python only through `uv run` in `validation/reference`; no reference result or log file was written (the reference
driver was not re-run; its classes were called from a scratch script with logging off).
Attribution: `rve_table_defaults.json` (39 Si-TSV rows), `engine/data/materials`, `engine/src/materials` diffs are
L21's (coordinator note); not audited here except where they affect L20 checks.

Severity: **BLOCKING** = wrong result shipped by default or a broken gate; **SIGNIFICANT** = a contract or stated
rule not met, or a claim that does not hold as stated; **MINOR** = robustness, reporting, documentation.

## Verdict

PASS with corrections. The bifurcation machinery is correct and the gate is reproduced; existing gates are unchanged;
the column smoother is exact and confined to the nonlinear PCG path. Two SIGNIFICANT items: k-only RVE table lookups
serve the k of full rows (older L11 bug, made reachable for more spellings by L20's canonical keys), and the
`nonlinear.branch` case key in SPEC 21 is rejected by case validation.
Counts: BLOCKING 0, SIGNIFICANT 2, MINOR 9.

## Checks and evidence

### 1. Bifurcation machinery (nonlinear.mjs)

- Inertia: `factor()` tries the supernodal Cholesky first; it fails only on a pivot `!(d > 0)`. It then falls back to
  `SupernodalLDLT` (1x1 pivots, fixed symbolic ordering, so the factorization is a congruence). The negative-pivot
  count is therefore the number of negative eigenvalues of the tangent (Sylvester). Constrained DOFs carry diagonal 1
  with zero rows and columns (assemble), so they add positive pivots only: `negative_pivots` = negative eigenvalues of
  the free-DOF tangent. The check runs on `res.val`, the tangent assembled at the converged iterate (it is assembled
  before the `rel < tol` break). Correct.
- Critical mode: `shifted()` gives the smallest x4 multiple mu of 1e-12 max|diag| with K + mu I positive definite.
  Inverse iteration with (K + mu I)^-1 converges to the eigenvector of the smallest eigenvalue of K + mu I, which is
  the most negative eigenvalue of K. Constrained entries are zeroed after each solve, and the Rayleigh quotient is
  taken on the unshifted K. Correct.
- Energy minimisation along +-phi: step doubling, then a parabola through the bracketing points. At an equilibrium
  the first-order term vanishes and the curvature is negative, so both signs decrease the energy and the better one
  is taken. If neither decreases the energy, t = 0, and the 3-attempt loop ends with the "branch switching failed"
  warning (handled). The energy-descent Newton shifts the tangent while it is indefinite and uses Armijo on the strain
  energy (g = R . du < 0 for a positive definite shift). It reverts to plain Newton once the tangent at the iterate
  factors positive definite. The strain energy is the total potential here: the nonlinear residual has no external
  load term. Correct.
- Branch labelling: `bifurcation[].branch` echoes the mode; each step carries `negative_pivots` and `stable`;
  `switched` appears only on steps where a switch was attempted (see M7).
- Reproduction (run here):
  - `node --test tests/mech-nl.test.mjs`: 6/6 pass, 34.8 s.
  - Reference, scratch run of `apref.nonlinear` with finer steps on the symmetric path: lowest free-DOF eigenvalue
    -30 K +0.107011, -31 K +0.053312, -32 K -0.000113, -32.5 K -0.026722, -33 K -0.053263, -35 K -0.158746. The
    bifurcation is at -31.998 K (interpolated in [-31, -32]); L20's -32.01 K (5 K bracket) is within 0.015 K.
  - Engine at 2.5 K steps (13 steps to -32.5 K): `follow` gives negative pivots 0 at every step to -30 K and 1 at
    -32.5 K, with sag 139.2469 um (reference 139.2469). `stable` switches at -32.5 K, Rayleigh -0.026722 (reference
    eigenvalue -0.026722), and lands on 115.29 / 165.23 um with every step stable.
  - Reference energies at -35 K: symmetric 1.736205e-5 J, switched 1.732283e-5 J (L20 notes match). The reference
    eigenvalue after the switch is +0.260 (stable).

### 2. scikit-fem total-Lagrangian reference

- Independence: the implementation is independent. It uses numpy on scikit-fem `ElementHexS2` bases (intorder 5),
  scipy `spsolve` and `eigsh` shift-invert, and is vectorized per element chunk; it is not a port of the JS. The
  formulation is shared by design: SVK, additive thermal strain on Green-Lagrange, constant D, the same B_NL and
  geometric-stiffness formulas, and the same branch-switch recipe. So the gate verifies the implementation (shape
  functions, assembly, BCs, inertia, switching outcome), not the constitutive choice. The stable-branch values do not
  depend on the algorithm, because the stable equilibrium is unique up to the x/y orientation and the test sorts the
  two edge sags.
- Tangent consistency (my own check, scratch): random large-rotation state (curvature 30 1/m plus noise), dT -30 K.
  The central-difference error of K v falls as h^2 (1.28e-5, 1.28e-7, 1.27e-9 at h 1e-3, 1e-4, 1e-5 relative steps):
  the tangent is consistent. Symmetry |K - K^T| / |K| = 2.9e-16. R = dE/du to 3e-9. L20's "4.0e-11" uses a different
  step scaling; the check itself is not committed (M1).
- Deck and BCs are the same as the engine test: 20 x 20 mm, 50 + 50 um, E 100 GPa, nu 0.3, alpha 0 / 10 ppm/K (alpha_x
  x 1.01 imperfect), quarter, 10 x 10 cells, one element per layer. Supports: ux = 0 on x = 0, uy = 0 on y = 0, uz = 0
  at the origin. Engine `supports.mjs` symmetry quarter fixes uz at "the lowest node on the symmetry axis" = (0, 0, 0).
  Bottom-face probes relative to the centre node in both. dT steps -5 K (engine 8 steps to -40 K, reference 12 to -60
  K; compared on common steps). `ruff check` passes on both Python files.

### 3. Existing gates

- Strip gate, HEAD engine/src (git archive into scratch) vs working tree, same script: curvature 101.2194607 1/m, sag
  4.615677629 mm, Newton [5,10,10,10,10,10,10,10] in both (L20 claim confirmed). Working tree: all steps stable.
- Linear solves: `mech/index.mjs` untouched. `buildQ2sPMG` default `smoother: 'block'`; solveMech passes `gmg` options
  through, so the linear q2s PCG default is unchanged. q1im and q1 paths are not touched.
- RVE/ROM: the working-tree source was run against a hybrid (working tree with the HEAD `resolver.mjs`) on every table
  row plus alias spellings. Every full (C6) request is identical (max rel C6 difference 0). Value differences occur
  only in k-only requests at 298.15 K (S1).

### 4. Column smoother

- Banded Cholesky reviewed line by line: storage L[i][i-t], row-oriented, sum over q in [max(0, i-hb), j); the
  half-band hb is the maximum in-block offset, so there is no fill outside the band and the block solve is exact.
  Numerical check (scratch): 3-material, 2 cells per layer, rigid_motion constraints, 10011 DOF, 481 columns,
  max |B^-1 B x - x| / max|x| = 4.5e-14. Both smoothing passes are the same symmetric damped block-Jacobi with a
  symmetric positive definite B, so the V-cycle stays a valid PCG preconditioner. omega = 1 / (1.05 lambda_max(B^-1 K))
  from the column solve.
- Scope: `smoother: 'column'` is passed only in `nonlinear.mjs` `tangentSolve` on the non-direct branch (`linear: 'pcg'`
  or ndof > 1e5). The linear default stays 'block'.
- Iterations (my run, linear system of the mech-nl smoother test deck at uniform -35 C (dT -60 K), rtol 1e-8; aspect via in-plane cell size and layer thickness; block -> column):

  | aspect | DOF | block | column | wall block / column |
  |---|---|---|---|---|
  | 40 | 3795 | 1503 | 97 | 3.58 / 0.28 s |
  | 20 | 3795 | 526 | 53 | 1.30 / 0.19 s |
  | 10 | 14175 | 156 | 28 | 1.71 / 0.47 s |
  | 5 | 54735 | 56 | 28 | 2.66 / 1.53 s |
  | 2 | 334815 | 25 | 23 | 7.26 / 7.50 s |

  L20 claimed 472 -> 48 (aspect 20), 142 -> 26, 56 -> 28, 20 -> 17. The ratios hold; the block counts here are about
  10 % higher (load or deck detail differs). Error vs direct is 1e-7 for both.

### 5. canonicalHomogKey

- Kind kept; constituent order kept (inclusion+matrix; `a+b` and `b+a` do not merge); fraction and stack thicknesses
  through `Number()`, the same as `parseHomogKey` / `rveSpecOf`. Distinct strings merge only when they parse to the
  same number. The default axis is dropped exactly where `parseHomogKey` defaults it (`plane` for rdl_layer, `z`
  otherwise); `rdl_layer ...:z` (a column) stays distinct from the default plane. Registered stacks and malformed keys
  are unchanged. Adversarial spellings were checked (`:0.20:z`, `:2e-1`, `:x`, `:xy`, `void`, unknown names,
  `Copper` case).
- Fingerprints: the row fingerprint covers topology and the canonical constituent values, but not the fraction, kind
  or axis. The canonical key keeps all three, so merged rows can only be the same RVE. Values stay guarded, and the L20
  override test (miss_fingerprint under the alias spelling) passes.
- Bit identity: 53 literal -> 49 canonical keys in both the HEAD table and the working-tree table (L21's 39 rows
  included). 36 duplicate (canonical key, T, Tsf, row type) groups, all cross-spelling, 0 non-identical (C6, alpha6,
  k, rho, cp, fp, fp_k). Claim confirmed. It does not cover full-row vs k-only-row pairs at the same T (S1).

### 6. Engine suite

`cd engine && nice -n 10 npm test` (2026-10-21, about 19:05 PDT): **311 tests, 311 pass, 0 fail**, 202.7 s. No failure
to attribute. The 5 failures in L20's hand-off (3 families drift, 2 materials) are no longer present (other lanes
synced).

## Findings

### SIGNIFICANT

**S1. k-only RVE table hits serve the k of a full row, off by up to 1.75 % from the live conduction RVE. This is an
older L11 bug; L20's key merge serves it to more spellings.**
Evidence: `indexTable` pushes every row with `k` into `e.k`, both full rows (Tsf 423.15) and k-only rows. `bracket`
takes the first exact match. At 298.15 K the full row's k differs from the k-only row's k, yet both carry the same
`fp_k`. Examples: `c4:copper+underfill_cuf:0.2101` 1.46839 vs 1.46063; `rdl_layer:copper+oxide:0.85:plane` 296.187 vs
296.825; `tsv:copper+silicon:0.0079` 150.1285 vs 150.1212. Measured against a live conduction-only library:
- HEAD: 25 of 53 literal keys with k-only rows at 298.15 K already serve the full-row k, rel. error 1.3e-5 to 1.74e-2.
  This violates the table rule "exact = live to 1e-12".
- With L20: previously-live alias spellings (e.g. `cu_electroplated+...`, `...:0.5` without `:plane`) now hit the
  same full-row k: 26 more spellings, up to 1.75e-2.
- `rdl_layer:copper+sio2_film:0.85:plane` k-only at 298.15 K was correct in HEAD (its own k-only row) and now serves
  the oxide spelling's full row: 2.15e-3 change.
L20's "duplicates bit-identical, no numeric effect" holds per (T, Tsf) group but misses this interaction. The two k
values probably come from different discretizations: `kEntry` uses n / 2n Richardson for staircased cells, while the
full-path k computation was not inspected.
Fix:
- A k-only lookup uses k-only rows (Tsf null) when the key has any at that T; otherwise the full rows' k must be made
  equal to `kEntry`. Separating `fp_k` between the two row types is an alternative.
- Add a test: a k-only resolve at 298.15 K of a key with both row types equals the live `kEntry` to 1e-12.
- Then re-check the table-hit statistics of thermal cases.
Owner: homog owner (L20 successor; coordinator assigns). Table rebuild only if the full-row k is changed (coordinate
with L21's table edits).

**S2. `nonlinear.branch` (SPEC 21 case key) is rejected by case validation.**
Evidence: `engine/src/thermal/case.mjs` `checkNonlinear` calls `keys(n, ['max_dof', 'steps', 'tol'], where)`, which
throws `unknown key branch`. `runMechCase` calls `parseCase` (mech/case.mjs line 120), so the new
`...(nlo.branch != null ? { branch: nlo.branch } : {})` pass-through cannot be reached from a validated case. No test
covers the case-level path. The default (`stable`) works; only `follow` from a case is unavailable.
Fix: add `branch` (enum stable | follow) to `checkNonlinear`, update its error text, and add a case-level test (the
mech-nl plate deck as a case with `nonlinear: {branch: follow}` reports `extra.nonlinear.bifurcation`).
Owner: coordinator (`thermal/case.mjs` is outside L20's write paths).

### MINOR

- **M1.** The reference tangent FD check (4.0e-11) and the task-4 two-grid diagnostics live only in L20's scratch.
  Add a pytest in `validation/reference/tests` (FD of R vs K v with h^2 scaling, symmetry, R = dE/du; the check above
  takes under 5 s). Owner: L20 successor.
- **M2.** "Bifurcation dT -32.01 K" is a linear interpolation over the 5 K bracket. The refined reference gives
  -31.998 K (bracket [-31, -32] K). State it as -32.00 +- 0.02 K, or add the refined points to the reference JSON.
  Owner: L20 successor.
- **M3.** Smoother claims (relevant to the open "column as linear default" decision): counts reproduce within about
  10 % (table above). At aspect 2 and 335k DOF, wall time is a wash (column 7.50 s vs block 7.26 s), so "faster at every
  aspect" holds for iterations, not wall time. Owner: coordinator (decision input).
- **M4.** `q2sColumnBlocks` calls `blocks.indexOf(b)` inside the block loop: O(columns^2) setup (30401 columns at 335k
  DOF), rebuilt at every Newton iteration on the PCG path. Use the loop index. Owner: L20 successor.
- **M5.** On an indefinite tangent, the column Cholesky throws "column block not positive definite" from
  `buildQ2sPMG`, outside the `pcg` try/catch. The named "iterative tangent solve broke down ... use linear 'direct'"
  error is then not raised. Wrap the preconditioner build too. Owner: L20 successor.
- **M6.** LDL^T static pivot perturbation (`nPerturbed > 0`) is not surfaced on the stability factorization. Near an
  exactly singular tangent the inertia can be off by one. Add a warning or record `perturbed_pivots` in the step entry.
  Owner: L20 successor.
- **M7.** Reporting:
  - `entry.newton` after switching adds only the last attempt's iterations.
  - `switched` is present only on bifurcation steps, while SPEC 21 says each step reports it.
  - SPEC 21 "follow stays on the symmetric path" should read "stays on the current (unstable) path".
  Owner: L20 successor (code) / coordinator (SPEC wording).
- **M8.** Inverse iteration runs a fixed 40 iterations without a convergence measure. Record ||K x - q x|| / |q| in
  `attempts[]`; it costs 1 matVec. Owner: L20 successor.
- **M9.** Bookkeeping:
  - `validation/RESULTS.md` has no PLATE-NL row.
  - `apref/nonlinear.py`, `scripts/ref_plate_nl.py` and `results/PLATE-NL-skfem.json` are untracked, and
    `mech-nl.test.mjs` reads the JSON at module load, so a commit without it fails the whole file. Commit them together.
  - Case runs of the L8 nonlinear cases with the new per-step stability check (now default `stable`, one extra
    factorization per step, possible branch switch) are still open, as L20 notes.
  Owner: coordinator.

Note (not a finding): `canonicalHomogKey` maps `' '` to `0` and `0x10` to `16` through `Number()`. This matches
`parseHomogKey`'s own parse, so no two keys with different physics merge.
