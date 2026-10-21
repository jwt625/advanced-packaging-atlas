---
title: Lane L1 - E1 engine core (LA + params port, grid, steady thermal, CLI, bench)
date: 2026-10-20
status: E1 wave-1 deliverables done (2026-10-20); open issues listed below
scope: engine/src/{la,params,grid,thermal}/, engine/cli.mjs, engine/bench/, engine/tests/{la,grid,thermal,cli}*.test.mjs, this file
owner: lane L1 (Claude subagent, DevLog-012)
---

# L1: engine core and steady thermal

Binding inputs: DevLog-012 (lanes, shared rules), sims/SPEC.md (sections 1-3, 5), DevLog-010 (A1-A4, E1 gates),
R2 (`DevLog/research/2026-10-20-sim-browser-solver-stack.md`, S1, S8), R1 sections 1, 2.5 and implications A/B,
R6 section 1.2 (tier-A thermal) and 4.1 (verification protocol). Port source: eo-modulator-atlas `engine/` at
eb97f96 (GPL-3.0-or-later).

## Plan (2026-10-20 13:16 PDT, before implementation)

1. Port (verbatim code, header line + local-change list):
   - `src/la/sparse.mjs`, `src/la/ldlt.mjs`, `src/la/complex.mjs` (no imports in the sources; API identical to EO).
   - `src/params/params.mjs` (EO `src/params.mjs`), `src/params/units.mjs` (EO `src/postproc/units.mjs`).
   - Tests: `la-ldlt.test.mjs` (EO `vector-ldlt.test.mjs`, verbatim), `la-sparse.test.mjs` (EO `perf-sparse.test.mjs`
     with the 2D FEM fixture replaced by a 3D Q1 grid matrix, since `fem.mjs` is not ported), `la-params.test.mjs`
     (EO `params-expressions.test.mjs` minus the `config.mjs` free-text test).
2. `src/grid/` rectilinear grid (SPEC section 3):
   - Input: SPEC section 2 part list (mm / um), options `{max_xy_mm, max_z_mm?, min_cells_per_layer, grading,
     max_nodes, symmetry, drop_kinds, materialOf}`.
   - Breakpoints = every part face (+ the symmetry plane); merge tolerance 1 nm.
   - In-plane spacing: size field h(x) = min(max_xy, min_b(h_b + (g - 1)|x - b|)) with h_b = shortest adjacent
     interval; equidistribution of 1/h per interval; iterate local size caps until the achieved neighbour ratio is
     <= grading everywhere (sizes only decrease, so it terminates).
   - z: each z interval gets ceil(L / max_z) cells (1 when max_z is unset), then each part gets at least
     min_cells_per_layer cells through its own thickness (split its largest z cells first).
   - Tensor node count > max_nodes: throw (message with nx, ny, nz and the knobs); never silent coarsening.
   - Cell owner: highest priority part containing the cell centre; default priority = containment depth via `in`;
     equal-priority overlaps: later part in the list wins, reported as a warning.
   - Symmetry: half_x (keep x >= 0, plane sym:x at x = 0), half_y, quarter; mirror check of the part list (each part
     has a partner with mirrored centre and equal size, z, h, kind, material, priority); else error naming the part.
   - Selections: `top:<part>`, `bottom:<part>`, `side:<part>` = exterior faces (neighbour void or outside the model,
     not on a symmetry plane) of the part's own cells facing +z, -z, +-x/+-y; `default` = all exterior faces;
     `sym:x`, `sym:y`. Stored as `{groups: [{axis, side, cells}], area_m2}` plus SPEC's `axis/side/cells` when there is
     a single group (additive; contract note).
   - Stats: tensor nodes, active nodes, cells, active cells, maxAspect, min/max cell size, achieved grading.
3. `src/thermal/`:
   - Q1 on box cells, diagonal k: exact tensor-product element matrices (1D stiffness x 1D mass); assembled into a
     structured 27-point stencil (27 coefficients per tensor node; inactive and Dirichlet nodes are identity rows with
     their couplings moved to the RHS).
   - Sources: `{parts: glob, power_W | density_W_m3, distribution: uniform_volume}`; with a symmetry crop the matched
     part set must be mirror-closed, the full-model power is divided by the symmetry factor.
   - BCs: `temperature` (T_C), `htc` (h_W_m2K, T_inf_C), `heat_flux` (q_W_m2 or power_W, positive inward),
     `adiabatic`, `symmetry` (only on sym:*); later BCs override earlier ones on shared faces; `default` covers only
     faces no explicit BC claimed; Dirichlet nodes win over flux terms.
   - Materials: `resolve(key, T_K, {need: ['k']})` (L2 contract); constant k by default, Picard on k(T) when the
     resolver is T-dependent (cell-mean T, cached per material and 0.01 K).
   - Solvers: `direct` (CSR from the stencil, own grid nested-dissection ordering or AMD, ported SparseCholesky);
     `pcg_mg` (PCG + V(1,1) cycle, symmetric z-line Gauss-Seidel, x-y semi-coarsening with linear interpolation by
     node coordinates, Galerkin RAP coarse operators, Cholesky on the coarsest level); `pcg_jacobi` for reference;
     `auto` picks by size (threshold set from the bench).
   - Post: energy balance (sources + inward flux vs Robin outflow + Dirichlet reactions, consistent from the
     assembled residual), Tmax / Tavg per part, results per SPEC section 5 with timing.
   - Closed forms in `src/thermal/analytic.mjs` (multilayer resistance, Song-Lee-Au spreading, rectangular flux
     channel series, convective-tip fin) for tests and L4.
4. Gates (tests): TA1, TA2 (as a thin resistive box), TA3 (a) and (b) vs the exact rectangular series and vs the
   Song-Lee-Au value, TA4 (fin), TA6 patch, MMS order ~2 (L2 norm), energy balance <= 1e-10, direct vs PCG+MG <= 1e-8,
   quarter / half crop equal to the full model.
5. `cli.mjs`: load case YAML, unknown keys error, family generator via `src/families/index.mjs` (clear error if
   absent), grid, thermal studies, summary or `--json`; exit 0 / 1 / 2.
6. `bench/bench.mjs`: fixed synthetic grids (1e4, 1e5, 3e5 nodes), median of N, JSONL to `../logs/`, under nice.
7. One profile-driven pass on the MG path; before/after numbers here.

Design for E2 (mechanics): the grid, selections and free-node masks are physics-agnostic; the stencil level object
(nx, ny, nz, coordinates, free mask, coefficients) generalises to b x b blocks per neighbour (b = 3), the z-line
solve to block-tridiagonal Thomas, and P to P_scalar (x) I_3. Q1 with incompatible modes condenses per element, so
it keeps the 27-point block stencil; Q2 serendipity does not (mid-edge nodes), it would need its own operator.

## Progress log

- 2026-10-20 13:16 PDT: read DevLog-012, SPEC, DevLog-010, R2, R1 (1, 2.5, A/B), R6 (1.2, 4); EO sources inspected
  at eb97f96 (sparse 1514 lines, ldlt 827, complex 39, params 352, units 167; no imports between them). Plan written.
- 2026-10-20 13:20 PDT: ports done (`src/la/{sparse,ldlt,complex}.mjs`, `src/params/{params,units}.mjs`,
  `params.d.mts`; verbatim, header + "Local changes: none"). Ported tests `la-ldlt` (verbatim), `la-params` (minus the
  EO config free-text test; plus a units smoke test), `la-sparse` (2D FEM fixture replaced by a 3D Q1 hex fixture):
  16/16 pass. complex/ldlt API identical to EO: stable for L7.
- 2026-10-20 13:28 PDT: grid (`src/grid/{index,spacing}.mjs`), stencil LA (`src/la/{stencil,mg,pcg}.mjs`), thermal
  (`src/thermal/{assemble,index,analytic}.mjs`) written. Smoke: TA1 T_bottom 145.3647 C with direct, PCG+MG and
  Jacobi-PCG; die-on-substrate 6e4 nodes: MG 10 iterations, direct vs MG max |dT| 1.2e-8 K at rtol 1e-10.
- 2026-10-20 13:33 PDT: tests grid (7), thermal-tierA (5), thermal-verify (7), cli (4): 23/23 pass. Measured:
  - TA3a exact rectangular series (own derivation) Rs_max 0.66708, Rs_avg 0.52633 K/W; FE quarter model 675 /
    3645 / 24336 nodes: Rs_avg 0.52199 / 0.52497 / 0.52594 (order 1.82); Song-Lee-Au 0.6572 / 0.5039 (R6: 0.657 /
    0.504; article 0.66): the circular-equivalent formula is 1.5 % (max) and 4.3 % (avg) below the square geometry.
  - TA3b series 0.07853 / 0.05009, FE 0.07854 / 0.05005 (23409 nodes); Song-Lee-Au 0.0804 / 0.0491 (R6).
  - TA4 FE 0.020918 W/K vs 1D 0.020919 W/K (R6 0.02092).
  - MMS (two layers, flux-continuous): L2 errors 9.77e-5, 2.49e-5, 6.25e-6, 1.57e-6 K; orders 1.97, 1.99, 2.00.
  - Direct vs PCG+MG (4 levels, 12 iterations): max |dT| / range 5.0e-13. Jacobi-PCG: 376 iterations.
  - Quarter / half_x / half_y crops vs full: max |dT| 2.3e-12 / 2.9e-12 / 2.4e-12 K.
  - Picard k(T) slab: FE 85.410201 K vs Kirchhoff 85.410197 K, 7 Picard iterations.
- 2026-10-20 13:36 PDT: L3 generator output (cowos_l defaults) exposed 0.05 um y slivers (thirds rounded to 4
  decimals: 10.6667 vs 10.66665 mm) -> ny 1025, 4.2 M nodes at max_xy 1 mm. Added breakpoint snapping
  (`snap_xy_um` default 1, `snap_z_um` default 0.01; representative = domain bound / crop plane, else the most
  frequent value, else the mean; every shift reported): cowos_l 104 x 132 x 38 (5.4e5 nodes), quarter 1.4e5 nodes,
  PCG+MG 22 iterations; cowos_s quarter 1.2e5 nodes, 21 iterations (unit-k smoke run, not physics).
- 2026-10-20 13:38 PDT: bench `engine/bench/bench.mjs` (fixed synthetic 2.5D package: substrate, interposer, SoC +
  4 HBM, micro-bump and underfill layers, mold, TIM, lid; synthetic k), baseline run (label before-opt).
- 2026-10-20 13:41 PDT: profile pass on the MG path (node --cpu-prof, grid L, 2 solves):
  1. before: vcycle + lineSweep 66 % of samples (z-line sweep per slot with a branch and a table lookup), RAP 8 %.
  2. unrolled the 24 off-line couplings in the sweep; RAP without per-entry array allocations: solve 1145 -> 588 ms.
  3. lexicographic column order walked memory with stride NX NY (sweep at ~0.5 G mul-add/s vs ~2 G/s for the stencil
     apply): replaced by a four-colour z-line Gauss-Seidel (colour (i mod 2, j mod 2); colours 0..3 pre, 3..0 post,
     so the V-cycle stays symmetric), eliminated plane by plane in memory order: 13 iterations instead of 11 but
     solve 447 ms.
  4. RAP specialised per axis with the parent pairs unrolled: setup 176 -> 92 ms (iteration counts unchanged).
  Same answers: all 12 thermal tests pass after each step; Tmax identical to 3 decimals in the bench.
- 2026-10-20 13:43 PDT: after-opt bench, one direct-ND run at grid L, an MG-only fresh-process run for memory.
  `AUTO_DIRECT_MAX` set to 1e4 free nodes from these numbers. 40/40 lane tests pass (la 16, grid 8, thermal 12, cli 4).

## Bench (2026-10-20, Apple M-series dev machine shared with other agents, load average 5-11, nice -n 10)

Logs: `logs/bench-20261020T1338.jsonl` (before), `-T1341` (after), `-T1342` (direct L once), `-T1343` (MG only, fresh
process). Median of 3 runs unless noted. Times in ms; nnzL of the direct factor (for pcg_mg: of the MG coarsest level).

| Grid | Nodes (active) | Solver | Before total / setup / solve | After total / setup / solve | Iterations before / after | nnzL | RSS MB |
|---|---|---|---|---|---|---|---|
| S | 18,400 (13,400) | direct_nd | 170 / 146 / 9 | 154 / 127 / 9 | - | 1.87e6 | 157 |
| S | 18,400 | direct_amd | 281 / 264 / 6 | 269 / 247 / 6 | - | 2.46e6 | 292 |
| S | 18,400 | pcg_mg | 113 / 39 / 65 | 93 / 26 / 51 | 17 / 22 | 3.8e5 | 320 |
| M | 93,840 (59,790) | direct_nd | 2003 / 1932 / 49 | 1834 / 1763 / 42 | - | 1.72e7 | 618 |
| M | 93,840 | direct_amd | 8443 / 8350 / 75 | 8056 / 7962 / 67 | - | 2.67e7 | 827 |
| M | 93,840 | pcg_mg | 438 / 43 / 362 | 196 / 18 / 145 | 11 / 13 | 9.4e4 | 442 (fresh process, max) |
| L | 274,428 (179,630) | pcg_mg | 1240 / 135 / 1036 | 518 / 58 / 407 | 11 / 13 | 4.2e5 | 387 (fresh process, max) |
| L | 274,428 | direct_nd (1 run) | - | 15509 / 15226 / 199 | - | 7.76e7 | 1331 |

Readings:
- Own grid nested dissection vs ported AMD on these 3D grids: fill 1.3-1.55x lower, factor 1.9-4.5x faster (R2
  S8.1 reported AMD 1.4-1.7x worse fill on cubes).
- PCG + GMG: 11-22 iterations to rtol 1e-10 at aspect ratios up to 1000 (bench, cowos_l / cowos_s smoke runs);
  2.4x faster than before the pass on grid L; 30x faster than direct at 2.7e5 nodes, with 3.4x less memory.
- MG per iteration on grid L: about 31 ms (2.7e5 nodes), i.e. ~0.11 us per node per iteration.
- The S grid is 1.8e4 nodes, not 1e4: the fixed package has ~45 x-breakpoint intervals; kept as the small grid.

## API (for L2, L3, L6, L7; ES modules, no Node APIs outside cli.mjs and bench)

- `src/la/sparse.mjs`, `src/la/ldlt.mjs`, `src/la/complex.mjs`: EO API unchanged (SparseCholesky, analyze,
  factorNumeric, solveNumeric(Multi), amdOrder, ndOrder, buildPattern, buildElementPattern, ...; SymbolicLDLT, LDLT,
  ComplexLDLT, SupernodalLDLT, ComplexSupernodalLDLT; cx, cadd, csub, cscale, cmul, cabs, cdiv, csqrt, cexp, ccosh,
  csinh). Stable for L7 since 2026-10-20 13:20.
- `src/params/params.mjs`, `src/params/units.mjs`: EO API unchanged (parseExpression, evaluateExpression,
  resolveParams, substituteExpressions, unitOfKey, ...; parseUnit, formatUnit, displayConversion, UnitError).
- `src/la/stencil.mjs`: `createStencil(NX, NY, NZ)`, `applyStencil(op, x, y)`, `padded(op)`, `stencilToCSR(op)`,
  `gridNDOrder(NX, NY, NZ, map, leaf?)`, `new StencilCholesky(op, {ordering})` + `.solvePadded(b, x)`, `slot`,
  `stencilOffsets`, `stencilAsymmetry`.
- `src/la/mg.mjs`: `buildMG(op, xs, ys, {coarseMax = 6000, maxLevels = 30, ordering = 'nd'}) -> mg` (`mg.stats`),
  `mgPrecond(mg, r, z)`. `src/la/pcg.mjs`: `pcg(op, precond, b, x, {rtol, maxIter}) -> {iterations, relres,
  converged, history}`, `jacobiPrecond(op)`.
- `src/grid/index.mjs`: `buildGrid(parts, {max_xy_mm = 1, max_z_mm = null, min_cells_per_layer = 1, grading = 1.3,
  max_nodes = 300000, symmetry = 'none', drop_kinds = [], materialOf = p => p.material, snap_xy_um = 1,
  snap_z_um = 0.01, planes = {x_mm, y_mm, z_um}}) -> grid` (SPEC section 3 fields plus `partMat, partRange,
  partCells, priority, symFactor, mirror {x, y}, warnings, stats`); `resolveSelection(grid, name)`,
  `matchParts(grid, glob)`, `activeNodes(grid)`, `partBox(p)`, `partPriorities(parts)`,
  `mirrorPartners(parts, prio, axis)`, `faceArea(grid, c, d)`, `groupDir(group)`, `FACE_DIRS`, `SYMMETRIES`, `SEL_RE`.
- `src/thermal/index.mjs`: `solveThermal(grid, thermal, resolve, {solver = 'auto', rtol = 1e-10, maxIter = 1000,
  ordering = 'nd', coarseMax = 6000, nonlinear: {max_iter, tol_K}, study}) -> results` (SPEC section 5),
  `parseBCs(bcs)`, `partTemperatures(grid, theta, T0)`, `cellMeanT`, `C_TO_K`, `AUTO_DIRECT_MAX`, `SOLVERS`.
  `resolve(key, T_K, {need: ['k']})` must return `{k_W_mK: [kx, ky, kz] | k}`.
- `src/thermal/analytic.mjs`: `multilayerResistance(layers, A, h)`, `songLeeAu({k, t, As, Ap, h})`,
  `rectSpreadingSeries({a, b, t, k, h, c, d, Xc, Yc, M})`, `finConvectiveTip({h, k, t, w, L})` (usable by L4).
- `cli.mjs`: `parseCase(c)`, `runCase(c, {generate, resolve, data, study, solver})`, `summarize(out)`, `toJson(out)`,
  `main(argv, deps?, io?)`, `materialMapper(map)`, `overrideResolver(resolve, overrides)`, `evalTarget(t, res)`.
  The CLI uses the generator's `boxes` (fallback `parts`) and `loadLibrary().resolve` or `resolve` from
  `src/materials/index.mjs`; it fails with a clear message while either module is missing.

## Decisions and contract notes (additive; requested from the coordinator)

1. Selections are exterior faces only (neighbour void or outside the model; symmetry planes excluded) of the part's
   own cells. Shape `{groups: [{axis, side, cells}], area_m2, faces}`, plus SPEC's `axis/side/cells` when there is a
   single group. New kinds `xmin: / xmax: / ymin: / ymax:<part>` (single side; needed for the TA4 fin base) and
   globs on the part id (`top:hbm_*`). `default` in the grid = all exterior faces; thermal applies a `default` BC only
   to faces no explicit BC claimed; later explicit BCs override earlier ones; Dirichlet nodes win over flux terms.
2. Mesh keys added: `max_z_mm` (optional through-thickness cap), `snap_xy_um` (default 1), `snap_z_um` (default
   0.01). Snapping is needed for generator output (item 9).
3. Thermal BC vocabulary: `temperature` {T_C | T_K}, `htc` {h_W_m2K, T_inf_C | T_inf_K}, `heat_flux` {q_W_m2 |
   power_W} (positive inward; power_W is full-model power), `adiabatic`, `symmetry` (sym:* only); `note` allowed.
   Sources: {parts: glob or list, power_W | density_W_m3, distribution: uniform_volume, note}; power_W is full-model
   power over the meshed volume of the matched parts; under a crop the matched set must be mirror-closed.
4. Results additions: `derived.components_W`, `derived.symmetry_factor`, `derived.parts {id: {Tmax_C, Tmin_C,
   Tavg_C, volume_m3}}`, `derived.T0_K`; `heat_in_W` / `heat_out_W` are full-model equivalents; `timing.setup_ms,
   total_ms, solver, relres, mg, free_nodes, picard_iterations, picard_change_K`. Tmax ties (shared interface node)
   go to the part with the higher Tavg.
5. Symmetry naming: `half_x` keeps x >= 0, plane `sym:x` at x = 0 (same convention as L3's `symmetry()` note).
6. Material map precedence (SPEC lists the three keys, not the order): part id, then kind, then template material.
7. Case `targets` in the CLI: optional `value` (expected) and `study`; thermal quantities `Tmax_C`, `Tmin_C`,
   `Tavg_C` (selection = part glob, optional `part:` prefix), `heat_in_W`, `heat_out_W`. Only targets with a value are
   checked (exit 2 on a miss); others are listed as unchecked.
8. `materials.overrides` in the CLI: only `k_W_mK` is applied (value or {value, ...}); other properties pass through
   to the library.
9. For L3: 4-decimal rounding of thirds gives 0.05 um face offsets (cowos_l: lsi_3..6 vs tiv_* y edges, e.g.
   10.6667 vs 10.66665 mm), which forced ny = 1025 before snapping. The grid now snaps them (reported in warnings);
   consistent rounding in the generator would remove the warnings.

## Open issues

- Units (EO port): base dimensions m, kg, s, A only; no temperature dimension, so W/(m K) is not representable. An
  additive fifth base unit is needed if the UI or the materials loader uses `parseUnit` for thermal units.
- Contact / thin resistive layer as a boundary feature: not built (TA2 passes with a thin box of k = t / R_c).
- `geometry.resolve` (discrete arrays): not supported by the E1 grid (error).
- Picard on k(T) evaluates k at the cell-mean temperature (piecewise constant per cell).
- MG robustness at extreme in-plane cell anisotropy (hx << hy) is untested; z-line + x-y semi-coarsening targets thin
  layers. AMG fallback not needed so far.
- CLI end to end on a real case waits for `src/materials/index.mjs` (L2).
- TA5 (transient) is outside E1.

## E2 (mechanics) reuse

Grid, selections, symmetry and mirror maps, the free-node masks, stencil storage, ND ordering, PCG and the MG
transfer / RAP code are physics-agnostic. For 3 DOF / node: stencil entries become 3 x 3 blocks (27 x 9 per node),
z-line solves become block-tridiagonal Thomas, P = P_scalar (x) I_3 (RAP per axis unchanged in structure), and the
coarsest level stays the ported Cholesky. Q1 + incompatible modes condenses per element and keeps the 27-point block
stencil; Q2 serendipity does not (mid-edge nodes) and needs its own operator.

# Wave 2 (assigned 2026-10-20 13:45 PDT by the coordinator)

Scope: units K dimension; thermal L4-1 / L4-2 / L4-3 / L4-4 / L4-7; block MG for 3 DOF per node (API for L8);
end-to-end CLI runs once L2 materials and L3 families exist. Same write paths and rules.

## Wave 2 plan (2026-10-20, written between 13:45 and 13:56 PDT, before implementation)

1. Units (`src/params/units.mjs`, local change in the port header): fifth base dimension K; dimension vectors of
   length 5, all operations treat a missing fifth entry as 0 (EO 4-entry inputs behave as before); symbols `K`
   (prefixable: mK) and `ppm` (dimensionless 1e-6); named forms W/(m*K), W/(m^2*K), K/W, J/(kg*K), 1/K. Tests for
   W/(m K), W/(m2 K), K/W, ppm/K, J/(kg K) in `la-params.test.mjs`.
2. Block MG (`src/la/block.mjs`, done second because L8 starts now):
   - Operator: 3 x 3 blocks per 27-point slot, `A[(27 n + s) 9 + 3 r + c]`; DOF-level `fixed` (3 N; a symmetry plane
     fixes one component); padded interleaved vectors `3 (N + 2 pad)`.
   - `applyBlock`, `blockToCSR`, `BlockCholesky` (ported supernodal Cholesky on free DOFs, grid ND on nodes expanded
     to DOFs), four-colour block z-line Gauss-Seidel (block-tridiagonal Thomas with 3 x 3 pivots), x-y
     semi-coarsening with P = P_scalar (x) I_3 (per-component prolongation), per-axis Galerkin RAP on blocks.
   - Rigid-body awareness: `rigidBodyModes(op, xs, ys, zs)` (6 modes; linear interpolation reproduces them on every
     level); coarsest level with `nullspace`: when the free block is singular (floating body), pin 6 DOFs chosen
     so the modes restricted to them are invertible (3-2-1 nodes), solve, project the modes out; PCG option
     `nullspace` projects residual and preconditioned residual.
   - Tests (`la-block.test.mjs`): vector Laplacian equals three scalar solves; Q1 elasticity operator built in the
     test only (isotropic, 2 x 2 x 2 Gauss, layered high-contrast E): direct vs PCG+MG <= 1e-8, iteration counts;
     DOF-level symmetry constraints; floating body with self-equilibrated load and nullspace.
3. Thermal:
   - L4-4 `temperature_field` BC: `{selection, type: temperature_field, T_C | T_K: "<expr in x, y, z (m)>",
     origin: model | min_corner}` evaluated with the ported params grammar (explicit operators).
   - L4-7 full-tensor k: still a 27-point stencil (the Q1 cross terms couple only the 8 nodes of a cell); separable
     box integrals with C = int N' N; resolver may return `k_W_mK` as a 3 x 3 tensor; `rotateK(kdiag, R)` helper.
     Gate: TA6 rotated variant R_z(30 deg) diag(10, 50, 148) R_z^T exact.
   - L4-2 `source_patch` (object or list): `{selection, x_mm, y_mm, w_mm, d_mm, total_W | q_W_m2}` uniform inward
     flux on the faces of a face selection inside the rectangle; `thermalGridPlanes(thermal)` gives the grid planes
     the patch needs (CLI passes them to buildGrid); covered area must equal the patch area.
   - L4-1 `interface:<a>|<b>` (also `<a>/<b>`) + `contact_resistance` {R_m2K_W}: z-normal interfaces only. The grid
     inserts a sliver node plane at z0 + delta (delta = 1e-3 of the first cell above) on the upper side of every
     requested interface (not a breakpoint, so no grading or snapping effect). Sliver cells inside the a/b contact
     footprint get kx = ky = 0 and kz = delta / (R + delta / kz_upper): the element matrix is the consistent
     zero-thickness contact matrix (R^-1 int N_a N_b dA (x) [[1, -1], [-1, 1]]), and the delta / kz term
     restores the upper part's sliver so a 1D stack is exact. x- or y-normal interfaces: error (would need
     duplicated in-plane planes in the semi-coarsened MG). Gate: TA2 exact (155.36 C, 10.0 K jump).
   - L4-3 `solveThermalTransient`: theta scheme (backward Euler theta = 1, Crank-Nicolson theta = 1/2 with 2 BE
     start-up steps against the step-BC oscillation), consistent (default) or lumped Q1 mass from rho cp
     (`resolve(key, T, {need: ['rho', 'cp']})`), constant BCs and loads, operator built and factored once, outputs
     at `output_s`, discrete energy balance (stored energy change vs integrated net heat). Gates: TA5 step 48.8849 C
     and flux 2.2885 K (validation/cases/A/TA5), observed dt order 1 (BE) and 2 (CN).
4. End to end: when `src/materials/index.mjs` and the families exist, run cowos_r/thermal_rjc and a cowos_l thermal
   case through cli.mjs; compare against validation/cases/C and D (CoWoS-R 00085); thin adapter in thermal/ if the
   resolver API differs.

## Wave 2 progress log

- 2026-10-20 13:45-13:56 PDT (per-entry times not captured; range verified with `date`): read L4 requests (DevLog-012 contract table; TA2, TA3, TA5, TA6, MA8 case files). Plan
  written. Note: L4's TA5 flux variant uses `flux_W_m2`; accepted as an alias of `q_W_m2`.
- 2026-10-20 13:45-13:56 PDT: coordinator relayed two L6 items, added as plan items 5 and 6: (5) reproduce pcg_mg not
  converging in 1000 iterations on cowos_l with a k = 1 stub and a 'default' BC that may have no fixed-T / HTC face;
  if singular (pure Neumann), detect it and fail with a clear message, else fix the MG; (6) a browser-safe
  `runCase(config, {study, onProgress, generate, resolve, data})` without Node imports (cli.mjs stays Node-only).
- 2026-10-20 13:45-13:56 PDT: units K dimension done (8 la-params tests). L6 item reproduced: cowos_l (k = 1 stub) with
  real BCs converges (top HTC 25 / default HTC 27 iterations at 1 mm; 34 / 37 at 2 mm); adiabatic-only is singular
  and gave an obscure "p^T A p < 0" failure (with the 13:33 grid, before snapping, L6 saw 1000 iterations). Added
  `unanchoredBodies` (union-find over node-sharing cells; anchored = touches a fixed-T face or an HTC face with
  h > 0): solveThermal now fails before any solve, naming the body's parts. Tests for adiabatic-only and a floating
  island. Browser-safe runner `src/thermal/case.mjs` (parseCase, runCase with onProgress and materialOf injection,
  libraryAdapter for the L2 library object), cli.mjs now a Node wrapper (uses `src/materials/node.mjs`
  loadLibrary()).
- 2026-10-20 13:45-13:56 PDT: block MG `src/la/block.mjs` + PCG generalised (`op.bs`, option `nullspace`). Tests
  `la-block` 4/4: vector Laplacian equals three scalar direct solves (1e-10); clamped layered elasticity (17,325 DOF):
  19 iterations, MG vs direct 2.1e-13; DOF-level symmetry constraints: 25 iterations, 4.2e-12; floating body:
  rigid-body modes are null vectors to 1e-12, pinned + projected direct solve residual < 1e-9, PCG with nullspace
  25 iterations to 1e-11 (round-off floor 1.3e-12), agreement 3.7e-11. Scratch timing (4 layers incl. 50 um, graded
  in-plane): 3.6e4 DOF MG setup 110 + solve 211 ms (18 iterations), direct 2.9 s (nnzL 2.0e7); 1.4e5 DOF 184 + 669
  ms; 2.4e5 DOF 340 + 1167 ms (17 iterations), RSS 0.86 GB (test-built operator included).
- 2026-10-20 14:03 PDT: em2d dispatch in cli.mjs (family em2d -> runEm2d before parseCase; --variants;
  --json passes the result through; exit 2 on any pass === false); em1_abf_microstrip_glass base variant through
  cli.mjs under nice: 19.0 s, 4/4 targets pass, exit 0. Thermal core restructured (prepareThermal, assembleThermal,
  makeSolver shared by steady and transient). Added L4-1 contact_resistance (grid `interfaces` sliver planes,
  exact 1D), L4-2 source_patch, L4-4 temperature_field, L4-7 full-tensor k (27-point stencil kept; cross terms via
  C = int N' N), L4-3 transient (src/thermal/transient.mjs). Tests thermal-wave2 5/5:
  - TA2 via contact_resistance: T_bottom 155.364692 C, interface jump 10.000000000 K (direct and MG), balance 2e-15.
  - TA3a via source_patch on a single plate: Rs_max within 5e-4 of the exact series.
  - TA6 rotated R_z(30) diag(10, 50, 148) with temperature_field (min_corner origin): max error 1.1e-13 K (direct),
    1.6e-11 K (MG) over a 124 K range; 90 deg rotation equals swapping kx, ky to 1e-9 K.
  - TA5 (dt 1e-5 / 5e-6 / 2.5e-6, 10 um cells): BE orders 0.99 / 1.00, CN 2.00 / 1.99; Richardson 48.88441 (BE),
    48.88450 (CN) vs 48.8849 C, 2.28845 vs 2.2885 K (rel on the rise -1.7e-5 to -2.2e-5); discrete energy balance
    below 1e-10.
- 2026-10-20 14:29 PDT: case runner additions (study params / geometry.drop_kinds / transient keys,
  mechanics keys passed through, targets study / reference_study / definition / tolerance {rel, abs, abs_C,
  sign_only}, Rjc_C_W, part: selections, {value, status, ref} unwrapping, metric lookup from data/metrics.csv in the
  CLI, L2 applyOverrides with status user filled in, k {expr} in T_C via the adapter, thermal-only override fields,
  run-time --mesh overrides). Picard: k(T) linear between 0.5 K resolver samples (the 0.01 K rounding cache had a
  floor that kept cowos_l at the 30-pass cap; now 5 passes). Max-principle overshoot warning (cowos_l: mold 0.49 K
  above the SoC at the default mesh; vanishes with max_z_mm 0.15). MG robustness (audit S1, coordinator): real-grid
  harness; operator-dependent interpolation and alternating x/y/z line smoothing did not help on the real grids
  (42 -> 43 / 24 iterations); direction-selective semi-coarsening ('auto': coarsen only in-plane axes whose collapsed
  coupling is >= 0.1 x the other's) fixed the audit-type strip case (640 -> 12 iterations; direct 202 ms, MG 124 ms);
  nu = 2 brings the real grids under 30 (cowos_r 42 -> 26, cowos_l 43 -> 26, xilinx 25 -> 17 per linear solve).
  Defaults now coarsen auto, interp operator (scalar), nu 2. Block MG: same auto rule and nu 2, geometric weights
  (block-trace operator weights measured worse: 31 vs 21); anisotropic elasticity 221 -> 43. PCG warm starts stop on
  ||r|| <= rtol ||b|| (cowos_r Picard total 198 -> 72 iterations, solve 4.5 -> 2.5 s).
- 2026-10-20 14:34 PDT: audit A1 items: B1 (per-part selections from the part's box faces; cases naming
  covered host parts now run), S6 (complete-linkage snapping: no face moves more than the tolerance), M1 (k(T)
  probes at T0 +- 10 / 50 / 100 / 200 K), M9 (MMS with Robin faces: orders 2.018 / 2.005 / 2.001; internal
  T_inf_K_fn with Gauss-integrated load), S1 (above). SPEC 12 rotation helper rotationFromDeg; TA6 rotated centre
  55.0 C to 1e-10; MA8 example eps_yz -2.16506e-4. theta_jc_C_W evaluated like Rjc_C_W. Coverage report for parts
  owning no cells: benign (contained parts / homogenized array fields) except emib_t and cpo_module, where the bridge
  stack sits in a substrate cavity without `in: substrate` (geometric embedding by L3's design; reported).
  Overshoot warning threshold 1e-3 of the range. All 17 3D cases' study s1 run end to end (table below).
  Lane tests 56/56 (la 23, grid 9, thermal 19, cli 5).

## Wave 2 results

### End-to-end thermal studies (study s1, cli.mjs, nice -n 10, 2026-10-20 14:31-14:33 PDT, generator state at that time)

Iterations are PCG totals over the Picard passes (k(T) materials); all heat balances <= 7e-12.

| Case | Grid nodes | PCG it. | Solve s | Tmax C (part) | Targets (expected from DB metrics.csv) |
|---|---|---|---|---|---|
| cowos_r/thermal_rjc | 160,704 | 81 | 2.6 | 99.37 (ubump_soc_soc_2) | Rjc 0.007913 C/W vs measured 0.0108 (-26.7 %, miss at rel 0.2) and 0.01082 (-26.9 %, miss); vs the paper's zero-contact-resistance model 0.00759 (+4.3 %, pass); Tmax 99.37 vs 104.9 C (miss, abs 3 C) |
| info_os/theta_jc_tim | 223,872 | 24 | 1.1 | 27.42 (pm1, overshoot warning) | theta_jc 0.02266 C/W vs 0.031 (-26.9 %, pass at its tolerance) and 0.033 (-31.3 %, miss) |
| cowos_l/warpage_rt_ht | 518,700 | 114 | 11.9 | 65.90 (mold, overshoot 0.48 K) | warpage targets: mechanics (L8) |
| cowos_s/warpage_corner_stress | 233,856 | 54 | 2.5 | 42.54 | mechanics |
| emib_t/bridge_stress | 509,472 | 64 | 6.5 | 41.62 | - |
| cpo_module/thermal | 75,816 | 51 | 0.9 | 50.65 | - |
| fan_out_panel/panel_warpage | 258,302 | 33 | 1.8 | 28.34 | mechanics |
| fcbga_organic/substrate_warpage | 47,988 | 59 | 0.6 | 42.17 | mechanics |
| fcbga_organic/substrate_warpage_bare | 31,212 | 14 | 0.2 | 42.03 | mechanics |
| glass_core_substrate/warpage_vs_organic | 50,220 | 61 | 0.7 | 42.17 | mechanics |
| hbm_stack/stack_thermal | 32,208 | 23 | 0.2 | 48.35 | - |
| si_interposer_peers/120mm_warpage | 624,624 | 83 | 10.0 | 43.04 | mechanics |
| si_interposer_peers/50mm_quarter | 81,536 | 30 | 0.6 | 43.65 | mechanics |
| si_interposer_peers/xilinx_tsv_lid | 193,200 | 55 | 2.0 | 48.88 | mechanics |
| soic/thermal_stack | 16,335 | 21 | 0.1 | 36.32 | - |
| ucla_si_if/warpage | 12,393 | 34 | 0.1 | 26.84 | - |

Reading of the CoWoS-R result: the case states that TIM1 contact resistance is not modelled and that Rjc should
come out low by up to the 29.6 % contact-resistance share (ectc51687.2025.00085-d-m20). The engine is 26.7 % below
the measured Rjc and 4.3 % above the paper's own zero-contact-resistance model value, consistent with that.

### MG robustness on real grids (one linear solve, constant k at T0; harness in the scratchpad)

| Grid | Before (xy, geometric, nu 1) | After (auto, operator, nu 2) |
|---|---|---|
| cowos_r (1.6e5 nodes, aspect 500, k 0.15-390) | 42 | 26 |
| xilinx_tsv_lid (1.9e5, aspect 1852) | 25 | 17 |
| cowos_l (5.2e5, aspect 1975) | 43 | 26 |
| emib_t (5.0e5) | 32 | 19 (nu 2, geometric) |
| Cu strips, in-plane aspect ~280 (audit S1 type) | 640 (direct 0.2 s) | 12 (0.12 s; coarsened x only) |
| block elasticity, 5 um x cells vs 1 mm y cells | 369 | 43 |

Tried and rejected (measured): operator-dependent interpolation alone (42 -> 43), alternating x/y/z line smoothing
(24 iterations but 1.5x the time of nu 2), block-trace operator weights for the block MG (21 -> 31).
Bench (synthetic package, logs/bench-20261020T1427.jsonl): S 14, M 11, L 10 iterations; L total 701 ms.

### Block MG API (for lane L8, `src/la/block.mjs`; vectors padded and interleaved, DOF (n, r) at 3 (pad + n) + r)

- `createBlockStencil(NX, NY, NZ) -> op` ({bs: 3, NX, NY, NZ, N, A: Float64Array(243 N), fixed: Uint8Array(3 N),
  off, pad}); block (r, c) of slot s at node n at `bidx(n, s, r, c) = (27 n + s) 9 + 3 r + c`.
- `addBlockElement(op, i, j, k, Ke)`: 24 x 24 row-major element matrix of cell (i, j, k), local node a = ia + 2 ja +
  4 ka, DOF 3 a + r.
- `constrainBlock(op, F, g, active?) -> {dof, rows, loads}`: per-DOF Dirichlet values g (NaN free), inactive nodes;
  rows / loads for reactions R = rows . u - load.
- `paddedBlock(op)`, `applyBlock(op, x, y)`, `blockToCSR(op)`, `blockAsymmetry(op)`.
- `new BlockCholesky(op, {nullspace})` + `.solvePadded(b, x)` (grid ND on nodes, DOFs of a node together; with
  nullspace: pins 6 DOFs and projects the modes out).
- `rigidBodyModes(op, xs, ys, zs)` (6 padded vectors), `orthonormalize(Z)`, `projectOut(U, x)`.
- `buildBlockMG(op, xs, ys, zs, {coarseMax = 3000, nu = 2, coarsen = 'auto', interp = 'geometric', floating = false})`,
  `blockMGPrecond(mg, r, z)`.
- `pcg(op, precond, b, x, {rtol, maxIter, nullspace, ref})` (src/la/pcg.mjs) works for scalar and block operators;
  floating bodies: pass nullspace (round-off floor ~1e-12, use rtol >= 1e-11).
- Measured (test-built Q1 elasticity, 4 layers incl. 50 um): 3.6e4 DOF MG 211 ms (18 it.) vs direct 2.9 s;
  2.4e5 DOF 1.2 s (17 it.).

### Wave 2 contract notes (additive; for the coordinator)

1. Units: fifth base dimension K in the ported units module (local change in the header).
2. Grid: `interfaces` option and `interface:<a>|<b>` (`<a>/<b>`) selections (z-normal only); per-part selections from
   box faces (B1); complete-linkage snapping (S6).
3. Thermal: `temperature_field` {T_C | T_K expression in x, y, z (m), origin model | min_corner};
   `contact_resistance` {R_m2K_W} on interface selections; `source_patch` {selection, x_mm, y_mm, w_mm, d_mm,
   total_W | q_W_m2} (object or list; patch edges added as grid planes by thermalGridOptions); `heat_flux` alias
   `flux_W_m2`; resolver k may be a 3 x 3 tensor (SPEC 12 active R; helper rotationFromDeg); physics.thermal keys
   `initial_C`, `solver`.
4. Studies: `thermal_transient` {t_end_s, dt_s, output_s, scheme be | cn, mass consistent | lumped, be_steps,
   initial_C, probes}; study-level `params`, `geometry.drop_kinds`, `solver`; thermo_elastic keys passed through.
5. Targets: `study`, `reference_study`, `definition` (max_over_part, tj_max_minus_tc_over_p, ratio_to_reference),
   tolerance {rel | abs | abs_C | sign_only}, quantities Rjc_C_W, theta_jc_C_W (Tc = `tc_C` or the first fixed-T
   BC; P = heat_in_W), `part:<glob>`; expected values from the case `value` or the DB metric (CLI).
6. CLI: `--mesh key=value,...` run-time overrides, `--variants`, family em2d dispatch.

### Open issues (wave 2)

- Q1 discrete maximum-principle overshoot at the default L3 meshes (cowos_l mold 0.48 K, info_os 0.16 K): warned;
  refining z removes it (cowos_l max_z_mm 0.15). L3 may want min_cells_per_layer or max_z_mm in those cases.
- Data / case issues (not engine): sus430 k N/A in the library (earlier 120 mm run), abf_gl valid only to 240 C
  (cowos_s with all heat through the mold top reached 240 C earlier), case max_nodes budgets (raised by L3 since).
- contact_resistance only on z-normal interfaces (in-plane would need duplicated planes in the semi-coarsened MG).
- Transient: constant BCs and loads, fixed dt, k at the initial temperature (warned when T dependent).
- MG: a global anisotropy measure picks the coarsening direction per level; local anisotropy in otherwise isotropic
  grids is handled only by the smoothing (nu 2). Block MG keeps geometric weights.
- `balance_rel` is a solver-residual identity (audit M2), not a discretization check.

# Wave 3 (assigned 2026-10-20 by the coordinator; plan written 14:48 PDT, before implementation)

New write paths: scripts/build_sim_targets.py, app/static/data/sim_targets.json (generated). Same rules.

## Wave 3 plan

1. cli.mjs: `--sensitivity` (dynamic import of L3 `src/runner/node.mjs` sensitivityNode / summarizeSensitivity;
   `--json` passes the report through; clear error when the module is absent); `family: em3d` dispatch to
   `runEm3d(case, {variants, log})` (`src/em3d/run.mjs`, SPEC 14) before parseCase, exit 2 on any target
   pass === false. Tests with injected runners (as em2d).
2. scripts/build_sim_targets.py (`uv run python scripts/build_sim_targets.py`, pyyaml from the repo project,
   read-only on data/metrics.csv and data/electrical_interfaces.csv): collect every metric_id referenced by
   sims/**/*.yaml and validation/cases/**/*.yaml (targets, expected, any `metric_id` key), keep only those rows,
   fields value, unit, basis, locator, tv_id, condition (+ source table), sorted keys, no timestamps (deterministic);
   app/static/data/sim_targets.json. runCase metricLookup accepts that JSON (`metricLookupFromJson(json)` in
   case.mjs); the CLI keeps the CSV reader. Report size and row count.
3. G1 WASM SIMD (DevLog-010 A9; EO DevLog-024 S3.10 approach; EO's encoder was a scratchpad script, so a new one):
   - `src/la/wasm/encoder.mjs`: minimal module encoder (LEB128, type / import / function / export / code sections,
     i32 / f64 / v128 ops used here); no toolchain, module bytes built at run time.
   - `src/la/wasm/kernels.mjs`: kernels generated per (NX, NY) so the 27 node offsets are load immediates (base
     pointer shifted by the minimum offset): scalar stencil apply (unrolled, f64), SIMD apply (f64x2 over the di
     triples of each slot row: 9 vector + 9 scalar multiply-adds per node), four-colour z-line sweep, block (3 x 3)
     apply and block z-line sweep.
   - Integration: after the JS hierarchy is built, `accel: 'wasm'` relocates every level's arrays (A, line factors,
     work vectors) and the PCG vectors into one WebAssembly.Memory (views replace the JS arrays, so the JS code paths
     keep working on the same data); applyStencil / lineSweep dispatch to WASM when a level carries kernels.
   - Correctness: identical PCG iterations and answers to <= 1e-12 relative vs JS on the thermal tests and a block
     case; feature flag (`accel` option, CLI `--wasm`), JS fallback when WebAssembly SIMD is unavailable.
   - Gate: end-to-end s1 on cowos_r and cowos_l (and the block MG on a test-built elasticity operator; L8's operator
     if present), JS vs WASM, median of 3, logs/bench-<stamp>.jsonl; adopt by default only if > 2x end to end,
     else keep off and record. Caveat: shared machine (load ~8), not a quiet machine.
4. Optional: contact_resistance on x / y-normal interfaces.

## Wave 3 progress log

- 2026-10-20 15:04 PDT:
  - CLI: `--sensitivity` (L3 runner; thermal via sensitivityNode, thermo_elastic via runSensitivity with physics
    mechanics and runCaseAll), `family: em3d` dispatch (em4_microbump_gsg base: 6 frequencies, 92 s, peak RSS
    1.27 GB, no targets in the case), `--wasm`. fcbga bare sensitivity reproduces L3's numbers (Tmax 42.028 C, range
    41.283 .. 43.519 C).
  - thermo_elastic dispatch (coordinator priority): `runCaseAll` in thermal/case.mjs: uniform-temperature studies
    through L8 runMechCase, `temperature: {from: <thermal study>}` through solveMech on that study's grid and field;
    mechanics targets evaluated here (warpage_um / coplanarity_um with the JEITA label, von_mises_max_MPa with flags,
    stress_norm at corner:<part> = ratio of the part's Gauss-point von Mises maximum to the reference study's,
    sign_only, rel); expected values from the metric lookup; exit 2 on a miss; `--json` drops field arrays.
  - L8 test speed check: every engine test file run alone and serially (nice, load 5-7): all files <= 16 s, mech-case
    9 s, mech-core 6 s, mech-tierA 13 s, whole suite ~80 s, peak RSS 0.96 GB per file. No pathological test; the
    > 10 min full-suite run is most likely the default parallel runner (one process per core, 0.4-0.96 GB each on a
    shared 24 GB machine) - package.json pins --test-concurrency=1.
  - sim_targets.json: scripts/build_sim_targets.py (uv run --no-sync python): 247 rows (222 metrics, 25 electrical),
    0 missing ids, 89,565 bytes, deterministic (--check passes); metricLookupFromJson in case.mjs (test vs the CSV
    lookup).
  - Study-level thermal patches (L3 request): study keys `thermal: {bcs | bcs_patch | sources | source_patch}` and
    `contact_resistance: {<interface selection>: R_m2K_W}` (studyThermal); the grid cache key includes the patched
    interfaces and planes.
  - G1 WASM: encoder (src/la/wasm/encoder.mjs), per-level kernels (kernels.mjs: scalar apply, f64x2 apply, z-line
    row elimination / back substitution, block apply / elimination / back substitution), relocation into one
    pre-sized WebAssembly.Memory (accel.mjs); dispatch in applyStencil, applyBlock, the line sweeps and pcg (pool
    vectors). Tests la-wasm 3/3 (same iterations, <= 1e-12). Kernel microbench (5.2e5 nodes): stencil apply JS
    7.3 ms (1.91 G mul-add/s), WASM scalar 2.8 ms (2.61x), WASM f64x2 2.2 ms (3.36x).
- 2026-10-20 15:06 PDT: G1 end-to-end gate measured (logs/g1-20261020T1501.jsonl; median of 3, nice -n 10,
  shared machine at load 5.7-6.5, not quiet):

  | Case | JS total / solve ms | WASM total / solve ms | End to end | Solve | PCG it. (JS / WASM) | abs dTmax K |
  |---|---|---|---|---|---|---|
  | cowos_r/thermal_rjc s1 (1.6e5 nodes) | 3197 / 2433 | 2235 / 1474 | 1.43x | 1.65x | 81 / 81 | 1.1e-13 |
  | cowos_l/warpage_rt_ht s1 (5.2e5 nodes) | 14389 / 12033 | 10502 / 7894 | 1.37x | 1.52x | 113 / 113 | 3.7e-12 |
  | block MG, Q1 elasticity 49 x 49 x 19 (1.4e5 DOF), setup + solve | 1181 | 1160 | 1.02x | - | 16 / 16 | - |

  Verdict: below the 2x end-to-end rule, so WASM stays off by default (opt-in `accel: 'wasm'`, CLI `--wasm`). Where
  the time goes after WASM: the JS-side setup (RAP, assembly, grid, Picard re-assembly) and the transfers; the block
  case is dominated by the JS RAP setup. A further gain would need the RAP and the transfers in WASM too.
  x / y-normal contact_resistance (optional item 4): sliver planes on any axis, TA2 laid along x exact (direct and
  MG); interfaces on a symmetry plane rejected.

## Wave 3 API and contract notes (additive)

- CLI: `--sensitivity`, `--wasm`, `family: em3d` dispatch; thermo_elastic studies run through runCaseAll (mechanics
  targets checked, exit 2 on a miss).
- case.mjs: `runCaseAll(c, {...runCase deps, mech: {runMechCase, solveMech, mechLibrary, modelSurface}, lib,
  applyOverrides})`, `summarizeAll`, `toJsonAll`, `evalMechTarget`, `studyThermal(base, study)`,
  `metricLookupFromJson(json)`; runCase deps `accel`.
- Study keys (thermal studies): `thermal: {bcs, bcs_patch, sources, source_patch}`, `contact_resistance:
  {<interface selection>: R_m2K_W}`. thermo_elastic: `temperature: {from: <thermal_stationary study>}` supported.
- Mechanics target definitions: stress_norm at `corner:<part>` = ratio of the part's Gauss-point von Mises maximum
  to the reference study's (flag reported); warpage selections of parts without cells fall back to the model
  bottom / top plane (L8 rule).
- Grid: contact interfaces on x, y or z planes; selection objects carry `axis`.
- WASM: `src/la/wasm/{encoder,kernels,accel}.mjs`; `accelerateMG(mg)`, `accelerateBlockMG(mg)` (L8 may call the
  latter after buildBlockMG); `simdSupported()`.
- app/static/data/sim_targets.json (`ap-sim.targets/1`: rows {id: {table, value, unit, basis, locator, tv_id,
  condition, ...}}, missing ids) from scripts/build_sim_targets.py.
- 2026-10-20 15:08 PDT: L2 CD6 / CD5: `materials.allow_extrapolation` (true | [keys]) at case and study level
  passed to every resolve (thermal through extrapolatingResolver; mechanics through a resolve-wrapped library with
  the case overrides pre-applied, so runMechCase / solveMech see the same option), extrapolated provenance flags
  surfaced as study warnings (test with a range-limited stub resolver). `--sensitivity` on thermo_elastic studies
  adds the CD5 template CTE bounds (factor 1/3, 3; override status user since applyOverrides accepts status template
  for nu and k only) and recomputes the spread with L3's rules (request to L3: PHYSICS_PROPS / FIELD could carry cte
  natively). x / y-normal contact_resistance done (optional item 4).
- 2026-10-20 15:51 PDT: audit A2: S4 (mechanics targets at points flagged reentrant / bimaterial_edge ->
  status indeterminate, not counted for exit codes, unless allow_singular: true with a reason; Xilinx -b-m4 now
  indeterminate at 126 MPa); S1 (mechanics sensitivity runs go through runCaseAll -> runMechCase); M10 analysis:
  lidded Xilinx (512k DOF) and emib_t (1.49M) take L8's low-memory half-stencil MG (`LOWMEM_DOF` 3e5,
  src/mech/lowmem.mjs: full x-y coarsening always, f32 coarse levels, no 'auto' rule), not la/block.mjs; the
  lidded case needs 514 iterations vs 228 without the lid. Harness prepared (scratchpad m10.mjs: L8 lowmem vs
  la/block.mjs f64 auto / nu 2 vs xy / nu 1 on the same grid), not run (time). Expected-value unit conversion
  (DB 0.7 mm -> 700 um for warpage_um; length, stress, power suffixes only). Mechanics studies run one temperature
  per runMechCase call, failures reported per study / temperature with partial results (exit 1). CTE rebase also
  receives allow_extrapolation. process_sequence studies and per-step targets (`step`) accepted and dispatched whole
  to runMechCase (no case in sims/ uses them yet: parser-level only).

### thermo_elastic studies end to end (cli.mjs, nice -n 10, 15:04-15:48 PDT; RSS watchdog 3.8 GB, 600 s cap)

| Case | Exit | Runtime | Peak RSS | Mechanics result vs target |
|---|---|---|---|---|
| cowos_l/warpage_rt_ht | 1 | 256 s | 2.6 GB | s3 at 240 C: tim_polymer valid to 150 C (no allow_extrapolation in the case); the run predates per-study error handling, so s2 (25 C) was lost; rerun not completed |
| cowos_s/warpage_corner_stress | 1 | 560 s | 1.6 GB | s2 at 250 C: abf_gl valid to 240 C; same (predates the per-temperature split); rerun not completed |
| emib_t/bridge_stress | 0 | 456 s | 2.3 GB | 1.49M DOF q1im, 210 / 228 GMG iterations, 196 / 251 s per temperature; vm maxima flagged reentrant / bimaterial_edge; no targets |
| fan_out_panel/panel_warpage | 2 | 228 s | 1.5 GB | warpage +12,633 um (top:mold, JEITA) vs DB 0.7 mm (= 700 um after the unit fix): miss by 18x; 612 GMG iterations |
| fcbga_organic/substrate_warpage | 1 | 12 s | 0.6 GB | 25 C: +236 um vs 439 um (pass, sign_only); 265 C: polyimide_rdl valid to 260 C |
| fcbga_organic/substrate_warpage_bare | 1 | 46 s | 1.6 GB | 25 C: -7.6 um vs +122 (sign miss); 30 C: -7.3 vs +166 (miss); 260 / 265 C: abf_gl / polyimide_rdl ranges |
| glass_core_substrate/warpage_vs_organic | 1 | 39 s | 1.7 GB | s2 25 C: +66.6 vs +160 (pass, sign_only); s3 25 C: -4.5 vs +97 (miss); 265 C: polyimide_rdl range |
| si_interposer_peers/120mm_warpage | killed | 603 s | 3.0 GB | exceeded the 600 s cap (5 temperatures, 6.2e5 nodes) |
| si_interposer_peers/50mm_quarter | 2 | 46 s | 0.8 GB | 260 C: +852 um vs -189 um (miss, sign); 25 C: -170 um (no target) |
| si_interposer_peers/xilinx_tsv_lid | 2 | 154 s | 1.3 GB | s2 lidded 25 C: -52.6 vs +162.6 um (miss, sign); vm 126 MPa vs 115 indeterminate (bimaterial_edge); s3 no lid 25 C: +337.9 vs +335.3 um (+0.8 %, pass); GMG 514 (lid) / 228 iterations |
| ucla_si_if/warpage | 0 | 4 s | 0.5 GB | 32k DOF direct, no targets |

Range errors are honest library limits; cases that cross them need `materials.allow_extrapolation` (CD6) or L2
range data. The sign misses (fcbga bare, glass s3, 50 mm at 260 C, lidded Xilinx) and the fan-out panel magnitude
are for L3 / L8 (geometry, stress-free temperatures, supports or the warpage surface), not engine faults found here.

### Not done / open (wave 3)

- WASM on L8's half-stencil smoother (lowmem.mjs): not done; the kernels are exposed (src/la/wasm/kernels.mjs
  `levelKernels(NX, NY, memory, {block: true})` with row elimination / back substitution over the full 3 x 3 block
  stencil); a half-stencil variant would need its own row kernel.
- cowos_l ~207 block-MG iterations (L8 report): same low-memory path as M10; the comparison harness above is the next
  step (direction-selective coarsening and nu 2 in lowmem.mjs are the likely cheap fixes, as measured on la/block.mjs:
  369 -> 43 on in-plane anisotropy).

# Wave 4 (coordinator, 2026-10-20): M10 - mechanics MG above 3e5 DOF (plan written 15:56 PDT)

Plan: `src/la/halfmg.mjs` = block MG on L8's half-stencil storage (fine level f64 H, no full fine copy): own z-line
factors / four-colour sweep / apply on H, direction-selective ('auto') first coarsening from collapsed block traces
of H, one Galerkin pass H -> first coarse level, then la/block.mjs (auto, nu 2) below, coarse operators stored f32
(as L8). No edits in src/mech. Gates: same answers <= 1e-8 vs L8 buildHalfMG on the same assembled H; iterations,
time, peak RSS before / after on cowos_l (L8 reported 207), lidded Xilinx (514), emib_t (210-228); the harness
assembles exactly as solveMech's low-memory path (buildNumbering, createMechMaterials, buildConstraints,
operatorProvider, makeLoadOf, assembleHalfStencil, L8 pcg) and runs one variant per process (logs/m10-*.jsonl).
Optional WASM row kernels for the half sweep: only if time remains.

- 15:56 PDT: halfmg.mjs written; tests la-halfmg 2/2: half apply equals the full block apply to 1e-13;
  PCG + half MG equals PCG + la/block.mjs to <= 1e-8; graded plate 13 / 13 / 13 iterations (full, half xy, half
  auto); in-plane anisotropy 82 (la/block.mjs auto) / 197 (half xy) / 82 (half auto, first level coarsened x only).
  Real-case gate running (logs/m10-20261020T1555.jsonl).

## Integration note for L8 (src/mech/index.mjs, low-memory path; drop-in)

```js
import { buildHalfBlockMG } from '../la/halfmg.mjs';
// in the lowmem branch, instead of buildHalfMG(bs.op, grid.xs, grid.ys, mgo):
const mg = impl === 'l8' ? buildHalfMG(bs.op, grid.xs, grid.ys, mgo) : buildHalfBlockMG(bs.op, grid.xs, grid.ys, grid.zs, mgo);
precond = mg.precond;               // same (r, z) signature, padded interleaved vectors
mgStats = { storage: 'lowmem', ...mg.stats };
```
Options: {coarseMax = 3000, nu = 2, coarsen = 'auto' | 'xy' | 'x' | 'y', theta = 0.1, f32 = true}. Operator: the
`{NX, NY, NZ, N, H, fixed, off, pad}` object of assembleHalfStencil, unchanged; the apply stays applyHalf (or
la/halfmg.mjs applyHalfStencil, same arithmetic).
- 16:27 PDT: M10 gate results (logs/m10-20261020T1555.jsonl; machine load 5-9 with another session's
  cowos_s run):

  | Case (25 C, q1im, low-memory path) | DOF | L8 buildHalfMG it. / solve s / peak RSS | L1 buildHalfBlockMG it. / solve s / peak RSS | max abs du / max abs u |
  |---|---|---|---|---|
  | xilinx_tsv_lid s2 (lidded) | 511,623 | 281 / 81.4 / 1439 MB | 281 / 84.6 / 1401 MB (coarsened xy at every level) | 7.2e-9 |
  | emib_t s2 | 1.49e6 | timed out at 900 s (load) | not completed (batch stopped) | - |
  | cowos_l s2 | 1.08e6 | not run (batch stopped) | not run | - |

  Root cause found instead (scratchpad float.mjs / float_el.mjs, fcbga_organic s2, 132k DOF, same hierarchy):
  - supports are not it: symmetry supports 113 iterations, floating (point constraint removed, z-translation null
    space projected) 113;
  - in-plane anisotropy is not it on these packages ('auto' keeps xy: 113 vs xy 113; lidded Xilinx xy both);
  - coarsest size is not it: two levels with a 13k-node direct coarse solve 112;
  - smoothing helps only in proportion: nu 1 / 2 / 3 / 4 -> 186 / 113 / 90 / 77 iterations at about equal time;
  - the element is it: plain q1 on the same grid and hierarchy converges in 33 iterations (2.9 s), q1im in 113
    (9.1 s). The incompatible-mode element is free of bending locking on the fine level, but the Galerkin coarse
    operators with trilinear in-plane prolongation are effectively plain Q1 on 2x wider cells and lock in bending,
    so the coarse correction misses the bending (warpage) modes that dominate these solves.
  Next fix (not cheap in this structured framework, recommended to L8 / coordinator): a coarse space that does not
  lock in bending - rediscretised q1im coarse levels (coarse elements with homogenised cell moduli) or a smoothed /
  energy-minimising prolongation (wider coarse stencils). Cheap mitigation now: nu 3-4 on the fine level (-20 to
  -32 % iterations at similar time). halfmg.mjs is a drop-in (same answers, same memory class, selective coarsening
  for in-plane anisotropy: 197 -> 82 iterations on the anisotropic test plate); it does not fix the locking.
  WASM row kernels for the half sweep: not done.
- L9 requests: unused override keys warned (own check; L2 unusedOverrideKeys preferred when provided);
  `--mech-budget-s` (temperatures not started within the budget are skipped with a reason, not an error) and
  `--stream` (each mechanics result printed as it completes); warpage summary line prints shape_class (when L8
  provides it) and centre-minus-corner. Lane tests 70/70.

# Wave 5 (coordinator, 2026-10-20): M10b - non-locking coarse space (plan and results, 16:39 PDT)

Plan (as assigned): (a) rediscretised q1im coarse levels with volume-averaged cell stiffness (element kernel
injected: L8 elementOperator, read-only), (b) smoothed prolongation, chosen by measurement on fcbga s2 (132k DOF,
q1im; target < 40 iterations, same answer to 1e-8), then lidded Xilinx and cowos_l.

Results (fcbga_organic s2, 25 C, symmetry supports, half-stencil fine level, PCG rtol 1e-10, nice, load 3.5-5):

| Coarse space | Iterations | Time s | Peak RSS MB | max abs du / max abs u vs Galerkin |
|---|---|---|---|---|
| Galerkin (buildHalfBlockMG, baseline) | 113 | 8.2-8.8 | 706-758 | - |
| (a) rediscretised q1im, volume-averaged D (buildHalfRediscMG) | 119 | 8.8 | 858 | 1.6e-9 |
| local Galerkin, modes off (validation: equals Galerkin) | 113 | 8.7 | 816 | 8.5e-10 |
| local Galerkin enriched with condensed coarse bending modes (buildHalfEnrichedMG) | 228 | 17.0 | 758 | 6.2e-10 |
| hierarchy of the plain-q1 operator used for the q1im system | 284 | 20.0 | 829 | 1.2e-9 |
| reference: plain q1 operator with its own Galerkin hierarchy | 33 | 2.8 | 670 | (different operator) |

- (b) not built: one damped-Jacobi smoothing of the prolongator widens the coarse stencil to 7 x 7 x 3 blocks
  (1,323 coefficients per coarse node; about 0.5 GB f32 / 0.95 GB f64 for cowos_l's first coarse level alone),
  beyond the 27-point storage and L8's 1.5 GB budget.
- A first implementation of (a) and of the enriched variant pinned coarse DOFs inherited from void-region identity
  rows (257 / 245 iterations); fixed (constraints come only from active fine nodes); the table is after the fix.
- Correction to the wave-4 root cause: a non-locking (rediscretised q1im) coarse space does not help (119 vs 113),
  so the q1-vs-q1im gap (33 vs 113) is not coarse-level locking. Each fine q1im cell can absorb the linear parasitic
  shear of a trilinear coarse field with its own incompatible modes; the gap reflects the softer bending spectrum
  of the q1im operator (larger condition number) that the z-line smoother plus trilinear coarse corrections reduce
  only slowly. Remaining options, none cheap: deflation of the lowest bending modes (computed once per geometry and
  reused across temperatures), plate-aware block smoothers (x-z / y-z plane or overlapping patch smoothing), or a
  Krylov recycling across the temperature sweep. Not attempted.
- Interim nu = 3: not a net time win on fcbga (nu 2: 113 it, 8.8 s; nu 3: 90 it, 10.1 s; nu 4: 77 it, 10.7 s), so the
  default stays nu = 2 (la/block.mjs, la/halfmg.mjs).
- Gates on lidded Xilinx and cowos_l not run: no variant beats Galerkin on fcbga.
- Code: src/la/halfmg.mjs buildHalfRediscMG(op, grid, {cellD, elementOperator}, opt) and buildHalfEnrichedMG(op, grid,
  fineK, opt) (experimental, not recommended to L8); _internals for tests; la-halfmg test 3 (coarse operators equal
  halfRAP on a uniform material to 1e-12).
