---
title: Lane L8 - E2 linear thermo-elasticity (warpage, stress)
date: 2026-10-20
status: E2 wave deliverables done (2026-10-20); open issues listed below
scope: engine/src/mech/, engine/tests/mech*.test.mjs, this file
owner: lane L8 (Claude subagent, DevLog-012)
---

# L8: linear thermo-elasticity (tranche E2)

Binding inputs: DevLog-012 (lanes, shared rules), sims/SPEC.md (sections 3, 4, 5), DevLog-010 (A3 element bake-off
incl. the thermal-gradient caveat, A4, A5, A6, E2 row and gates, Decisions 2026-10-20: JEITA ED-7306 sign in every
output), R1 (`DevLog/research/2026-10-20-sim-comsol-industry-methods.md` 1.2-1.6, 2.4, implications B), R2
(`DevLog/research/2026-10-20-sim-browser-solver-stack.md`: locking, MG for 3 DOF/node, rigid-body modes),
validation/README.md, validation/cases/A/MA*.yaml, validation/cases/C/ectc.2011.5898527-b.yaml,
validation/expected/tier_a_values.json (L4; read-only here).

Reads (never edits): `engine/src/grid/` and `engine/src/la/` (L1), `engine/src/materials/` (L2),
`engine/src/families/` (L3).

## Plan (2026-10-20 13:45 PDT, before implementation)

Module layout (`engine/src/mech/`):

| File | Contents |
|---|---|
| `constitutive.mjs` | 6x6 Voigt stiffness (order xx, yy, zz, yz, xz, xy; engineering shear strains, as L2 `cubic.mjs`) for iso, ortho (engineering constants, axes aligned or rotated by a 3x3 frame), cubic (C11, C12, C44 + orientation `rotation_z_deg` from L2, or a general frame); Bond rotation; thermal-strain Voigt vector from the secant alpha in the material frame |
| `elements.mjs` | Hex kernels on axis-aligned cells (constant diagonal Jacobian): `q1` (8 nodes, 2x2x2 Gauss), `q1im` (Wilson incompatible modes, 9 internal DOF, statically condensed; on a parallelepiped Wilson = Taylor and the patch test holds because the integral of each bubble gradient is zero), `q2s` (20-node serendipity, 3x3x3 Gauss). Element stiffness, thermal load from nodal temperatures (Q1 interpolation of T at the Gauss points for every element, i.e. Q2s displacement uses Q1 temperature), stress at Gauss points and at element nodes (extrapolated) |
| `numbering.mjs` | Extended node numbering for Q2s (corner nodes = SPEC node index; mid-edge x, y, z edges after them), active-node compaction, DOF map (3 per node, interleaved) |
| `materials.mjs` | Mechanical material adaptor: library (L2 `resolve`, `rebaseSecantCte`) or an explicit object (tier-A sets) -> `{D (lab frame), epsTh(T_K) -> Voigt 6, Tsf_K}`; per-part stress-free temperature (A6 rebase); temperature cache |
| `supports.mjs` | `rigid_motion` (3-2-1 statically determinate point constraints, zero reactions for self-equilibrated loads), `symmetry` (mirror planes `sym:x` / `sym:y` plus the minimal statically determinate points for the remaining rigid modes; for quarter: one z point), never both (error), explicit face / point BCs for tier-A (`fixed`, `roller`, `point`) |
| `assemble.mjs` | Global CSR assembly over free DOFs (element cache by cell size and material), RHS, reactions by element residual |
| `solve.mjs` | `direct` (ported SparseCholesky from `../la/sparse.mjs`, node-level ordering expanded to 3 DOF), `pcg` with `jacobi` / `block_jacobi` / `gmg` preconditioners, iteration report |
| `gmg.mjs` | Vector GMG for Q1 / Q1im on the node grid: 27-point 3x3-block stencil, x-y semi-coarsening (as L1 `la/mg.mjs`, P = Px (x) Py (x) I_z (x) I_3, which reproduces the 6 rigid-body modes exactly), Galerkin coarse operators, 4-colour z-line block-tridiagonal Gauss-Seidel smoother, supernodal Cholesky on the coarsest level. Q2s: two-level p-multigrid (Q2s -> Q1 embedding, block-Jacobi smoothing) on top of the same GMG |
| `post.mjs` | Strain / stress at Gauss points, nodal-averaged per part, von Mises and principal stresses, re-entrant-corner flag, warpage per JEITA ED-7306 on a named surface (raw max-min of u_z, best-fit plane removed, signed by the diagonal rule with surface and view side stated), coplanarity, curvature fit for plate cases |
| `index.mjs` | `solveMech(grid, opts)` driver returning the SPEC section 5 result |

Element and support rules:

- Plain `q1` is kept only as the bake-off reference (it locks in bending at layer aspect ratios; R2 8.2).
- Q1im thermal load includes the incompatible-mode part `f_i = int B_i^T D eps_th` (non-zero for non-uniform T),
  condensed as `f_c - K_ci K_ii^-1 f_i`; this is what makes MA6 (linear T through the thickness) exact.
- Thermal strain is evaluated at the Gauss points, never as an element mean (MA6 / LE11 audit check).
- Supports: `rigid_motion` with a symmetry crop is an error; `symmetry` without a crop is an error (R1 1.5: never
  combine).

Gates (tests, `engine/tests/mech*.test.mjs`):

1. Patch tests: constant strain (displacement BC with a linear field, all three elements, distorted-size cells),
   constant thermal strain free expansion -> zero stress (round-off).
2. MA1-MA9 (excluding MA7, box_compatible false) at the tolerances of the YAMLs, values read from
   `validation/expected/tier_a_values.json` at test time.
3. A3 bake-off table: q2s vs q1im vs q1, error vs DOF and time on MA4b CLT warpage, MA5 thin film at in-plane
   aspect 25:1 to 100:1, MA6 thermal-gradient bending. Recommendation with numbers.
4. Symmetry crop equals full model (MA4b quarter vs full).
5. Direct vs iterative agreement 1e-8 (relative, displacement).

Then: Xilinx bring-up (if L3 has the family and case), performance at 1e4 / 1e5 / 3e5 DOF, one optimization pass.

Machine rules: heavy runs `nice -n 10`, one at a time, < 4 GB RSS, < ~3 min each.

## A3 element bake-off (2026-10-20)

Quarter models, direct solver (supernodal Cholesky; q1 / q1im grid ND order, q2s xy coordinate ND), `nice -n 10`
on the shared 12-core machine (times are wall clock of assembly + solve + curvature fit, single runs: +-30 % noise).
Error = signed relative error of the CLT curvature `kappa_clt = -d2w/dx2` fitted on the bottom face over the central
50 %. References: MA4b 1.192706 1/m and MA5b -0.0652403 1/m = L5 converged Q2s (scikit-fem,
`validation/reference/results/MA4b-skfem.json`, `MA5b-skfem.json`; finite-plate offsets vs CLT -6.4e-5 and
-1.7e-4 are physical); MA4a_thin = MA4a scaled to 50 um + 50 um layers on a 40 mm plate (CLT is scale invariant:
kappa = 10 x MA4.a.kappa_1_m = -21.5623 1/m, derived); MA6 0.0335483871 1/m (exact). Aspect = in-plane cell / the
thinnest layer's cell thickness. Scripts: scratchpad `bakeoff.mjs` (not committed).

| Case | xy cell (mm) | cells / layer | min-layer aspect | q2s DOF | q2s err | q2s ms | q1im DOF | q1im err | q1im ms | q1 err |
|---|---|---|---|---|---|---|---|---|---|---|
| MA4b | 2 | 1 | 40 | 8484 | +1.3e-05 | 446 | 2352 | +3.2e-05 | 63 | -3.4e-01 |
| MA4b | 1 | 1 | 20 | 29796 | +5.6e-06 | 2568 | 8112 | +1.0e-05 | 162 | -1.7e-01 |
| MA4b | 1 | 2 | 40 | 53664 | +3.9e-06 | 18856 | 14196 | +8.0e-06 | 358 | -1.2e-01 |
| MA4b | 0.5 | 1 | 10 | 115821 | +2.7e-06 | 21626 | 31212 | +7.0e-06 | 694 | -1.0e-01 |
| MA4a_thin | 5 | 1 | 100 | 735 | -3.9e-06 | 56 | 225 | +1.7e-06 | 7 | -1.0e+00 |
| MA4a_thin | 2.5 | 1 | 50 | 2511 | -7.3e-06 | 61 | 729 | -8.3e-07 | 12 | -9.9e-01 |
| MA4a_thin | 1.25 | 1 | 25 | 9231 | -4.1e-06 | 314 | 2601 | -8.1e-07 | 22 | -9.8e-01 |
| MA4a_thin | 1.25 | 2 | 50 | 15963 | -3.6e-05 | 1400 | 4335 | -2.1e-06 | 85 | -9.8e-01 |
| MA5b (5 um film) | 0.5 | 1 | 100 | 3795 | +1.1e-04 | 182 | 1089 | +4.8e-04 | 16 | -2.8e-01 |
| MA5b (5 um film) | 0.25 | 1 | 50 | 14175 | +9.3e-05 | 598 | 3969 | -4.0e-04 | 49 | -2.3e-01 |
| MA5b (5 um film) | 0.125 | 1 | 25 | 54735 | +8.4e-05 | 4094 | 15129 | +7.2e-05 | 184 | -2.2e-01 |
| MA6 (linear T(z)) | 2 | 1 | 2.6 | 3948 | -3.2e-09 | 99 | 1176 | +1.7e-10 | 37 | -4.6e-01 |
| MA6 (linear T(z)) | 2 | 2 | 5.2 | 6216 | -1.1e-08 | 207 | 1764 | +6.6e-10 | 26 | -5.9e-01 |
| MA6 (linear T(z)) | 1 | 1 | 1.3 | 13884 | -1.1e-09 | 286 | 4056 | -1.9e-10 | 28 | -6.3e-02 |

Iterative timings at matched sizes (MA4b, scratchpad `perf.mjs`): q2s 115821 DOF p-multigrid 3.4 s (28 iterations)
vs direct 22.5 s; q1im 101439 DOF GMG 3.0 s (47 iterations) vs direct 14.8 s.

Reading:
- q1 locks everywhere it bends: -10 % to -34 % (MA4b), -98 % to -100 % (MA4a_thin at aspect 25-100), -22 % to -28 %
  (MA5b), -6 % to -63 % (MA6). Reference only.
- q1im and q2s are both within 1e-5 of the reference on MA4b, MA4a_thin and MA6 with one cell per layer up to aspect
  100; on the MA5b thin film q1im is within 4.8e-4 and q2s within 1.1e-4 (wording corrected 2026-10-20, audit A2
  M1). Per DOF they are comparable (MA4b 2 mm q2s 8484 DOF +1.3e-5 vs q1im 1 mm 8112 DOF +1.0e-5; MA5b q2s is about
  4x more accurate per DOF, q1im still within 5e-4). Package grids are fixed by part breakpoints, not by accuracy,
  so on a given grid q2s costs 3.3-3.8x the DOF and 2.7-53x the direct time (MA4b 7x / 16x / 53x / 31x) for errors
  that are already below 5e-4 with q1im; with iterative solvers the time ratio at 1e5 DOF is about 1.1x per DOF
  but the 3.7x DOF remains.
- The A3 caveat (q1im has the same order as the Q1 temperature): MA6 passes for q1im to round-off (1e-10), as for
  q2s; the thermal strain is evaluated at Gauss points and the incompatible-mode load is condensed, so a linear
  through-thickness T bends a free plate stress-free.
- **Recommendation: q1im default** (solveMech default changed to q1im), q2s kept as the reference element and for
  cases with few cells across a bending span. Thresholds: q1im gives <= 5e-4 on all gate cases at 1 cell per layer
  up to aspect 100; use >= 2 cells per layer only where through-thickness stress gradients matter (stress probes,
  MA4a at 2 cells: probe stresses within 2e-6).

## Performance (2026-10-20, MA4b quarter plate, 4 cells per layer, q1im unless stated; `nice -n 10`, shared machine)

| DOF | Solver | Total (s) | Factor / PCG (s) | Iterations | MG setup (ms) | nnzL | Peak RSS (MB) |
|---|---|---|---|---|---|---|---|
| 2.06e4 | direct (grid ND) | 1.15 | 0.89 | - | - | 9.4e6 | 275 |
| 2.06e4 | PCG + GMG (L1 hierarchy) | 0.78 | 0.45 | 44 | 183 | - | 213 |
| 1.01e5 | direct | 14.8 | 13.6 | - | - | 7.4e7 | 1348 |
| 1.01e5 | PCG + GMG | 3.0 | 2.2 | 47 | 350 | - | 349 |
| 3.02e5 | PCG + GMG | 6.3 | 4.9 | 35 | 464 | - | 678 at exit (730 peak, earlier run) |
| 3.02e5 | PCG + GMG (own gmg.mjs, impl l8) | 6.1 | 4.8 | 60 | 385 | - | 676 at exit |
| 1.16e5 (q2s) | PCG + p-MG | 3.4 | 2.5 | 28 | 556 | - | 449 |
| 1.16e5 (q2s) | direct (xy ND) | 22.5 | 21.6 | - | - | 1.04e8 | 1965 |

Direct at 3e5 DOF not run (R2 8.3 estimate for 2.15e5 elasticity DOF: 125 s, 1.7 GB factor). Assembly is 0.16 s at
3e5 DOF (element-operator cache by cell size and material). Optimization pass: post-processing evaluated the shape
derivatives with fresh allocations for every Gauss and corner point of every cell; a per-point derivative cache
(`elements.mjs pointDerivs`) cut post-processing at 3.02e5 DOF from 1255 to 712 ms (-43 %), same results. The GMG
V-cycle is L1's `la/block.mjs` (141 ms per PCG iteration at 3e5 DOF); not edited here.

## Xilinx bring-up (sims/si_interposer_peers/xilinx_tsv_lid, L3; validation/cases/C/ectc.2011.5898527-b, L4)

Run through `runMechCase` (cowos_s generator, L2 library with the case's Table 2 overrides, homogenization = L2 ROM
`homog:` entries), q1im, quarter, symmetry supports, stress-free 150 C, uniform 25 C, PCG + GMG (rtol 1e-10), surface
`bottom:sbt_sr_b` (the case selection), JEITA ED-7306 sign (+ = dome, viewed from +z). Case mesh knobs varied; the
in-plane grid is dominated by part breakpoints (max_xy 2 -> 0.5 mm changes nx from 22 to 45). Run-only assumption:
TIM1 CTE 100 ppm/K (`user`, library N/A because the paper prints '-'); 300 ppm/K changes the lidded warpage by 1 %.
Runs 2026-10-20 (scratchpad `xil1.mjs`), after L2 / L3 data edits during the day (an earlier set gave 336.2-336.4 /
-61.2 um: the inputs moved by 0.6 %).

| Study | max_xy (mm) | cells / layer | DOF | GMG iterations | Wall (s) | Peak RSS (MB) | Warpage (um, JEITA) | Paper (um, sim) |
|---|---|---|---|---|---|---|---|---|
| s3 no lid (m2) | 2 | 1 | 93525 | 120 | 9.0 | 653 | +338.27 | +335.28 |
| s3 | 1 | 1 | 113175 | 117 | 11.2 | 678 | +338.14 | |
| s3 | 0.5 | 1 | 218295 | 121 | 20.9 | 926 | +338.37 | |
| s3 | 1 | 2 | 222486 | 127 | 23.2 | 1038 | +337.67 | |
| s3 | 0.5 | 2 | 428862 | 133 | 45.2 | 1236 | +337.88 | |
| s2 lid 1.0 mm (m3) | 2 | 1 | 114051 | 197 | 15.0 | 728 | -63.83 | +162.56 |
| s2 | 1 | 1 | 135882 | 195 | 16.8 | 753 | -63.92 | |
| s2 | 0.5 | 2 | 511623 | 209 | 68.3 | 1387 | -63.75 | |

- s3 (no lid): mesh-converged to +337.7 .. +338.4 um (spread 0.2 %); paper +335.28 um (Table 3, -b-m2): +0.7 to +0.9 %, sign
  agrees (paper "negative = smiley face" maps to JEITA negative). The agreement is better than the inputs justify:
  Poisson ratios, build-up stack, die / bump heights are templates and the homogenized layers are ROM, which R1 2.1
  shows can be 23 % low on laminate in-plane E. Treat as a plausibility pass, not a validation.
- s2 (lidded): mesh-converged at -63.8 um; paper +162.56 um (-b-m3). Sign and magnitude miss: model-form. The lid is
  a template (3 mm Cu foot ring bonded directly to the substrate top, no lid adhesive; TIM 60 um at 5.8 MPa); the
  Cu lid (17 ppm/K) on the 11 ppm/K core then pulls the top concave. Sensitivity (1 mm, 1 cell): lid feet mapped to
  a DAF-like adhesive (2.9 GPa) -39.5 um (earlier input set, where the Cu foot gave -61.4 um), still negative. Needed inputs (missing in the paper): lid adhesive
  material and thickness, foot geometry, lid attach temperature (stress-free T of the lid may not be 150 C).
- von Mises max over the FPGA slices (s2, -b-m4, paper 115 MPa, order-of-magnitude rule [50, 250] MPa): Gauss-point
  max 108.4 (2 mm) / 132.6 MPa (0.5 mm, 2 cells), at a `bimaterial_edge` of soc_2: mesh dependent (singular), as the
  case note expects; inside the order-of-magnitude band.
- Max cell aspect 920-3670 (1 um BEOL layers in 0.5-2 mm cells): GMG converges (117-209 iterations, more than the
  35-47 of the plate cases); MA5 showed a round-off floor near aspect 1e4. Thin-layer elements (R1 1.6) would remove
  these cells.

## Proposed SPEC additions (request to the coordinator; implemented inside engine/src/mech only)

1. Section 3, q2s node numbering: corner nodes keep the SPEC node index; mid-edge x-edges `Nc + i + nx (j + (ny+1) k)`,
   y-edges `Nc + Ex + i + (nx+1)(j + ny k)`, z-edges `Nc + Ex + Ey + i + (nx+1)(j + (ny+1) k)`, Ex = nx (ny+1)(nz+1),
   Ey = (nx+1) ny (nz+1) (`engine/src/mech/numbering.mjs`). Result field `u_mid_m` (3 per mid-edge node, same order).
2. Section 5 mechanics fields: `u_m` 3 per SPEC corner node (0 on inactive nodes) + `node_active` (Uint8 per node);
   `sigma_cellnode_Pa` (48 per active cell = 8 corners x Voigt 6 [xx, yy, zz, yz, xz, xy], averaged within the part),
   `vm_cellnode_Pa` (8 per active cell), `sigma_cell_Pa` and `eps_cell` (6 per active cell, engineering shear),
   optional `sigma_gp_Pa`; active-cell order = increasing cell index.
3. Section 5 derived: `warpage[]` = {surface, definition: jeita_ed7306, sign_convention, view_side, warpage_um
   (signed coplanarity), coplanarity_um, raw_um, centre_minus_corner_um, diagonals_um, best_fit_plane};
   `von_mises_per_part[id]` = {vm_max_gp_Pa, vm_max_gp_xyz_m, vm_max_gp_flag, vm_max_node_Pa, vm_max_node_xyz_m,
   vm_max_node_flag}, flag in {null, reentrant, bimaterial_edge}; `curvature[]` = {z_m, w_xx_1_m, w_yy_1_m, w_xy_1_m,
   kappa_clt_x_1_m, kappa_clt_y_1_m}; `reactions` = {max_abs_N, sum_N, points}.
4. Section 1 physics.mechanics: `element` default `q1im` (A3); `bcs` list for supports `none`
   ({selection, type: fixed | roller | symmetry | displacement, value_m}, {type: point, at_m, dofs}); selection aliases
   `side:<part>:x-` etc. (L4 MA2) map to the grid's `xmin:<part>`; `bottom:model` / `top:model` = all z faces on the
   lowest / highest node plane (for parts that own no cells, e.g. a substrate container covered by its layers).
5. Section 4 / 12: orientation on any elastic entry or per part (`orientation: {rotation_deg: [ax, ay, az]}`), SPEC 12
   active convention; already used by MA8.

## API (engine/src/mech/)

- `solveMech(grid, {element, resolve, rebase, stress_free_C: {default, per_part}, orientation, supports, bcs,
  temperature: {uniform_C | uniform_K | T_K (per SPEC node)}, solver: auto | direct | pcg_gmg | pcg_block_jacobi |
  pcg_jacobi, rtol, maxIter, gmg: {impl: l1 | l8, coarseMax}, warpage: [selection], curvature: [{z_m, frac, region}],
  stress, keepGauss, ordering: auto | amd | nd | nd_xy})` -> SPEC 5 result (`index.mjs`). auto = direct up to 1e5 DOF.
- `runMechCase(case, {generate, lib, applyOverrides, data, study, element, solver, mesh, surface, onProgress})`
  (`case.mjs`, browser-safe; reuses L1 `thermal/case.mjs` parseCase / unwrapValues / materialMapper).
- Helpers: `probeStress(result, partId, xyz_m)`, `probeU(result, xyz_m)`, `warpage`, `curvatureFit`,
  `classifyCorner`, `explicitResolver` / `explicitRebase` (tier-A material sets).
- CLI dispatch (request): `cli.mjs` should call `runMechCase` for studies of type thermo_elastic (L1 runCase passes them
  through as `skipped`).

## TODO

- [x] constitutive + elements + numbering
- [x] assembly, supports, direct solve
- [x] post-processing (stress, von Mises, principal, warpage, coplanarity, curvature)
- [x] tests: patch, MA1-MA6, MA8, MA9 (`mech-tierA` 10, `mech-core` 9, `mech-case` 1)
- [x] bake-off table + recommendation
- [x] PCG + block Jacobi + GMG; direct vs iterative 1e-8
- [x] Xilinx bring-up run
- [x] performance 1e4 / 1e5 / 3e5 DOF, one optimization pass
- [x] final report (2026-10-20)

## Progress log

- 2026-10-20 13:45 PDT: read DevLog-012, SPEC, DevLog-010, R1 1.2-1.6 / 2.4 / B, R2 (locking, MG), validation
  README, MA1-MA9, Xilinx tier-C case, tier_a_values.json, L1 grid / la / thermal code, L2 materials API. L3 has no
  Xilinx family or `sims/si_interposer_peers/` case yet. Plan written.
- 2026-10-20 14:15 PDT: implemented `engine/src/mech/` constitutive, elements (q1, q1im, q2s; box-cell reference
  matrices), numbering (extended q2s numbering), materials adaptor, supports, assemble (CSR), solve (direct, PCG,
  Jacobi, block Jacobi), post (stress, von Mises, principal, corner flag, JEITA warpage, curvature fit, probes), gmg
  (block stencil assembly, own block GMG, q2s p-multigrid), index (`solveMech`). Scratch checks (scratchpad scripts,
  not committed):
  - MA1 free expansion: du exact to 1e-14 rel, max |sigma| / (E alpha dT) ~1e-13, reactions ~1e-11 N.
  - MA2 uniaxial / biaxial / triaxial: rel error <= 2e-13 (q2s, q1im).
  - MA3 strip: |kappa| 2.1577-2.1581 (q2s, q1im), inside the beam-plate bracket [2.15623, 2.15913]; q1 -2.2 to -3.8 %.
  - MA4a: kappa and the 4 probe stresses within 2e-6 rel. MA4b (quarter, 1 mm): kappa -5e-5 rel (q1im, q2s);
    q1 -17 % (1 cell per layer) / -12 % (2 cells).
  - MA5 (300 mm, 1 um film, 5 mm cells = film aspect 5000): kappa -4.2e-4 (q2s) / -1.2e-4 (q1im) with 1 cell per
    layer; 2 cells per layer (aspect 1e4) +2.6e-3 (q2s): round-off floor (iterative refinement does not reduce the
    residual 2.7e-10 and moves kappa by 2e-3), not discretization.
  - MA6 linear gradient: q2s and q1im exact to round-off (kappa 2.5e-9 .. 1.7e-8 rel); max |sigma| / (E alpha dT_z)
    2.4e-10 (q1im, 1 cell) to 5.4e-8 (q2s, 4 cells): the case tolerance abs 1e-10 is below the f64 round-off floor of
    this conditioning; q1 kappa -46 % to -62 %.
  - MA8 aligned and rot30x (lab frame = material frame rotated +30 deg about x, materials convention): all strains to
    1e-16, eps_yz +2.165064e-4, max |sigma| / (E alpha_z dT) <= 2e-12.
  - MA9: Cu force at the centre exact (8e-7); integrated interface shear along y = 0 needs geometric grading toward
    the free edge (Gauss-point integration on the first cell row): q1im with 9 / 12 halvings -3.2e-3 / +3.6e-4 rel.
  - Solvers: L1 shipped `la/block.mjs` (same block layout as gmg.mjs); default GMG is now L1's hierarchy
    (`gmg.impl: 'l1'`), own `gmg.mjs` kept as cross-check (`impl: 'l8'`, identical iteration counts). MA4b q1im
    quarter 14196 DOF: GMG 45 iterations, direct vs GMG 2.8e-11; full model 54621 DOF 53 iterations. q2s p-MG:
    first version diverged (omega 0.6 > 2 / lambda_max, lambda_max(B^-1 K) = 5.1); omega = 1 / (1.05 lambda_max)
    gives 32 iterations, 1.6e-11 vs direct.
- 2026-10-20 14:48 PDT: SPEC 12 rotation convention adopted (active R = Rz Ry Rx, `rotation_deg`); MA8 rot30x eps_yz -2.165064e-4.
  L2 `cubicStiffnessRotZ(C, deg)` equals the SPEC-12 Rz(-deg) (passive sense); identical at the only used angle 45 deg
  (cubic symmetry), reported as an open issue. Tests: `mech-tierA` 10/10, `mech-core` 9/9, `mech-case` 1/1 (all under
  nice; 21 s + 9 s). Bake-off, performance, Xilinx sections written (above). solveMech default element -> q1im.
  Curvature fit on symmetry crops drops odd terms and halves mirror-plane weights (crop fit = full fit to 1e-6).

## Open issues

1. L4 MA4 `definition` text says "d2w/dx2 ... > 0 = dome"; the values use kappa = -d2w/dx2 (also found by L5).
2. L4 MA6 `max_abs_sigma_over_scale` tolerance abs 1e-10 is below the f64 round-off floor (engine 2.4e-10 .. 5.4e-8;
   L5 scikit-fem q2s 1.4e-9 / 5.4e-9); gated at 1e-7 here. Suggest 1e-7.
3. (Closed 2026-10-20: L2 fixed `cubicStiffnessRotZ` to the SPEC 12 active sense.)
4. Xilinx lidded variant: lid attach model missing (see section); L3 case asks for `element: q2s` (3.7x DOF; q1im
   recommended) and needs a TIM1 CTE (library N/A) for any lidded study; mechanics overrides on E_GPa alone need the
   library entry to be isotropic (L2 rule).
5. Round-off floor at cell aspect ~1e4 (MA5 with 2 cells per 1 um film: kappa error 2.6e-3, iterative refinement does
   not help): thin films should become thin-layer elements or be merged into homogenized layers (R1 1.6).
6. q2s p-multigrid needs 28-126 iterations (block-Jacobi smoothing, omega = 1 / (1.05 lambda_max)); a line smoother on
   the q2s level would cut this. q1im + GMG is the production path.
7. MA9 interface-shear integral needs geometric grading to the free edge (12 halvings) to reach 2e-2; with a uniform
   0.25 mm grid it is 11-41 % off (singular corner).
8. cli.mjs dispatch for thermo_elastic studies (request to the coordinator / L1): call `runMechCase`.
9. Temperature-dependent E(T) with a nodal T field uses the cell-mean T rounded to 0.01 K for D (thermal strain is
   exact per Gauss point); no warpage-vs-T sweep runner yet beyond the uniform_C list.

# Wave 2 (coordinator 2026-10-20): E3 RVE homogenization, E4 process sequence, thin films

New write paths: `engine/src/homog/`, `engine/tests/homog*.test.mjs` (plus `engine/src/mech/`, `engine/tests/mech*`,
this file). Coordinator feedback on wave 1 accepted (SPEC section 15; q1im default; MA4 text, MA6 tolerance and L2
cubic rotation fixed by others; CLI dispatch by L1; Xilinx case fixes by L3).

## Wave 2 plan (2026-10-20 14:51 PDT, before implementation)

1. E3 RVE homogenization (`engine/src/homog/`):
   - `rve.mjs`: periodic unit-cell solver on a box grid built here (SPEC 3 layout; staircased cylinders by
     area-matched cell selection on a uniform or graded in-plane grid; exact strips / laminae for lines and stacks).
     Periodicity by node identification (opposite faces share DOFs), one pinned node; u = E x + w. Six unit
     macro-strain cases + one thermal case on one factorization (ported Cholesky), element kernels from
     `../mech/elements.mjs` (q1im default, q2s option), materials through `../mech/materials.mjs` (D(T), thermal
     strain re-based to Tsf, cubic Si with its orientation). Volume-averaged stress -> C_eff (6x6); thermal case ->
     alpha_eff = -S_eff sigma_th / (T - Tsf). Scalar periodic conduction (Q1) for k_eff (3x3).
   - Topologies from the L2 key `homog:<kind>:<inclusion>+<matrix>:<f>[:<axis>]`: columns along z / x / y (cylinder,
     bumps, pillars, TSV, vias; f = area fraction), rdl_layer lines along x / y (strip of width f p through the layer
     thickness), `plane` (metal sheet with a circular dielectric antipad of area 1 - f), `xy` (two equal sublevels:
     x-lines then y-lines, each of fraction f), plus `stack` (z-laminate of N layers with thickness fractions, for
     build-up stacks and thin-film merging). Void matrix: not an RVE problem, delegated to the L2 ROM entry (labelled).
   - Output: resolved-like entry (`homogenization: rve`, `topology`, 9 orthotropic constants from S_eff, CTE secant
     at (Tsf, T), k [3], rho volume mean, cp mass mean, full C6 and residual non-orthotropic terms in provenance,
     Voigt / Reuss values, mesh and achieved fraction). Cache by (key, T_K, Tsf_K, mesh).
   - `resolver.mjs`: `createRveResolver(lib | resolve, opts)` -> `(key, T_K, opts) => entry` that handles `homog:`
     keys by RVE and passes other keys to the library; `resolveHomog(key, T_K, opts)` for L2 to call when a case
     selects `homogenization: rve` (hook coordinated through these notes; no edits to engine/src/materials).
   - Checks (tests `homog*.test.mjs`): Hill (Voigt / Reuss) matrix bounds (C_V - C_eff and C_eff - C_R positive
     semidefinite); exact laminate (Backus) for strips and stacks (machine precision); the two-phase uniform-field
     CTE identity (Levin / Rosen-Hashin: alpha_eff = (eps*/dT) I - (p*/dT) S_eff I, any geometry, isotropic phases);
     Hill's axial relations for fibre composites; Hashin-Shtrikman bounds on the axial shear modulus and transverse
     conductivity of the cylinder cells (2D problems with square symmetry are isotropic); staircase convergence study
     (n = 16 .. 128) with observed order; comparison with the L2 ROM values (report the ROM bias per topology).
2. E4 process sequence (`engine/src/mech/process.mjs`): study `process_sequence` with steps {id, activate,
   deactivate, stress_free_C (newly active parts; default the step start temperature), temperature: {uniform_C}
   (end of step), supports / bcs}. Total formulation per part: sigma_p = D_p (eps(u - u_act,p) - eps_th,p(T)); u_act,p
   = displacement field at activation (shared nodes: current solution; new nodes: minimum-energy elastic extension of
   the new part with the shared nodes fixed, the limit of COMSOL's soft inactive material), so the elastic strain is
   reset at activation and deactivated parts simply leave the sum. DOF dropping: only nodes of active cells carry
   DOFs. Validation: COMSOL-273-style layered plate (coating + substrate stress-free at 800 C -> 150 C; carrier
   activated stress-free at 150 C; cool to 20 C) against a CLT superposition written in the test (bilayer step +
   trilayer increment); then one DB process-flow case (tcpmt.2026.3672227: FCBGA flip-chip-first vs ring-attach-first,
   measured warpage after each step, data/metrics.csv rows -a-m1..m10) as a trend / sign check.
3. Thin films (wave-1 open issue 5): merge rule `mergeThinLayers(parts, {cell_xy_mm, max_aspect})`: consecutive
   full-overlap layers whose cell aspect exceeds max_aspect are merged into one `homog:stack:` block (exact laminate
   membrane properties from the RVE); quantify the bending (moment-arm) error on MA5 / MA5b and the BEOL stack of the
   Xilinx case.
- 2026-10-20 15:00 PDT: coordinator bug report (L5 cross-check): curvature fit threw "singular least-squares
  system" on a 1 mm strip and a coarse cube with the default window. Fixed in mech/post.mjs: a term is fitted only
  when the window spans enough distinct node lines (x / y: 2, xx / yy: 3, or 2 on a symmetry crop; xy: 2 and 2);
  unfitted terms are null; the result lists `terms`, `distinct_x`, `distinct_y`. Test added (mech-core 10/10).
  L5 also reports q1im probe stresses 1.1-1.4 % off at 1 cell per layer (MA4b level 1): consistent with the bake-off
  advice (>= 2 cells per layer where stress probes matter).

## E3 results (2026-10-20)

Implemented `engine/src/homog/`: `cells.mjs` (unit cells), `rve.mjs` (periodic elastic + conduction solves),
`laminate.mjs` (exact laminate), `resolver.mjs` (`createRveResolver`, `resolveHomog`, stack registry), `merge.mjs`
(thin-layer rule). Tests `engine/tests/homog-rve.test.mjs` 6/6.

Checks (tests): stack and strip cells equal the exact laminate to 1e-12 (C and CTE); column cells orthotropic to
2e-15, Hill bounds (C_V - C_eff and C_eff - C_R positive semidefinite), the two-phase uniform-field CTE identity
(Levin 1967 / Rosen-Hashin 1970 form, derived in the test) to 1e-10, axial shear and transverse k inside the 2D
Hashin-Shtrikman bounds, axial k parallel to 1e-12; periodic conduction equals L1's solveThermal on the same
staircase (fixed T on the x faces of the mirror-symmetric cell) to 1e-9.

Staircase convergence (Cu column in an E 8 GPa matrix, f 0.1877, fraction-interpolated pair of cells; scratchpad
`conv.mjs`): Ex 12.071 / 11.904 / 11.806 / 11.760 GPa and transverse k 0.7591 / 0.7463 / 0.7384 / 0.7336 W/m/K at
n = 16 / 32 / 64 / 128 cells across the pitch: first order (staircase). The resolver therefore runs n and 2n
(default 32 / 64) and extrapolates with p = 1 (Richardson; (16, 32) and (32, 64) extrapolations agree within 0.5 %;
k extrapolated from (32, 64) 0.7305 vs the 2D HS lower bound 0.7303). Cost 1.3-2.5 s per staircase key, 2-75 ms for
strips / xy / stacks; cached per (key, T, Tsf, mesh).

RVE vs the L2 ROM entries on keys the family generators emit (25 C, Tsf 150 C, library constituents; scratchpad
`table.mjs`). "ROM vs RVE" = ROM / RVE - 1:

| key | topology | RVE Ex / Ez / Gxz / Gxy (GPa) | ROM vs RVE Ex / Ez / Gxz / Gxy (%) | RVE kx / kz | ROM vs RVE kx / kz (%) | RVE ax / az (ppm/K) | ROM - RVE ax / az (ppm/K) | ms |
|---|---|---|---|---|---|---|---|---|
| microbump:copper+underfill:0.2077 | column | 13.11 / 32.25 / 4.98 / 4.51 | -15.9 / -0.0 / -14.3 / -5.4 | 1.459 / 84.04 | -17.9 / 0.0 | 24.85 / 18.99 | 0.69 / 0.01 | 1942 |
| microbump:copper+underfill:0.3181 | column | 16.28 / 44.65 / 6.11 / 5.21 | -22.5 / -0.0 / -19.9 / -6.1 | 1.854 / 128.2 | -24.9 / 0.0 | 23.62 / 18.26 | 0.87 / 0.01 | 1724 |
| c4:copper+underfill:0.2101 | column | 13.17 / 32.52 / 5.01 / 4.53 | -16.1 / -0.0 / -14.5 / -5.5 | 1.468 / 85.00 | -18.1 / 0.0 | 24.82 / 18.97 | 0.70 / 0.01 | 1977 |
| cu_pillar:copper+underfill:0.159 | column | 11.98 / 26.77 / 4.57 / 4.25 | -12.9 / -0.0 / -11.5 / -4.8 | 1.318 / 64.56 | -14.4 / -0.0 | 25.37 / 19.53 | 0.57 / 0.01 | 1786 |
| hybrid_bond:copper+sio2_film:0.1963 | column | 80.39 / 82.77 / 33.97 / 33.75 | -1.5 / -0.4 / -1.0 / -0.4 | 2.068 / 79.83 | -17.0 / -0.0 | 4.74 / 5.81 | -0.91 / -0.53 | 1800 |
| tsv:copper+silicon:0.0079 | column | 168.50 / 129.95 / 79.17 / 50.82 | -3.8 / 24.8 / -16.3 / 30.3 | 150.1 / 151.0 | -0.2 / -0.0 | 3.14 / 3.13 | 0.01 / -0.02 | 1904 |
| pth:copper+organic_laminate:0.0346 | column | 34.20 / 36.12 / 15.41 / 15.30 | -1.0 / -0.2 / -1.2 / -0.5 | 1.824 / 15.52 | -3.5 / 0.0 | 7.45 / 8.20 | -0.24 / -0.12 | 1271 |
| rdl_layer:copper+oxide:0.5:x | strip | 97.62 / 97.62 / 39.06 / 37.58 | -0.5 / -6.6 / -3.8 / -0.0 | 201.2 / 201.2 | 0.0 / -98.6 | 11.53 / 11.53 | -0.69 / -2.64 | 2 |
| rdl_layer:copper+organic_build_up:0.4118:x | strip | 57.60 / 57.60 / 22.18 / 7.96 | -0.0 / -64.3 / -64.1 / 0.0 | 165.3 / 165.3 | 0.0 / -99.8 | 17.44 / 17.44 | 0.00 / 1.70 | 2 |
| rdl_layer:copper+organic_build_up:0.5:plane | plane | 50.67 / 67.15 / 19.57 / 12.14 | 32.5 / -65.0 / -53.5 / 113.0 | 128.9 / 200.6 | 55.6 / -99.8 | 17.84 / 17.33 | -0.50 / 1.51 | 1731 |
| rdl_layer:copper+organic_build_up:0.85:plane | plane | 91.76 / 105.06 / 36.56 / 32.75 | 14.5 / -48.7 / -43.0 / 23.4 | 295.6 / 340.9 | 15.3 / -99.6 | 17.23 / 17.11 | -0.11 / 0.49 | 1784 |
| rdl_layer:copper+oxide:0.85:plane | plane | 112.41 / 114.30 / 44.01 / 43.81 | 1.5 / -3.5 / -1.2 / 1.3 | 296.2 / 341.1 | 15.2 / -97.4 | 15.33 / 15.77 | 0.14 / -1.14 | 1710 |
| rdl_layer:copper+sio2_film:0.0218:plane | column | 73.78 / 74.09 / 31.73 / 31.71 | 0.4 / -0.6 / -0.1 / 0.3 | 1.443 / 10.09 | 599.5 / -86.0 | 1.01 / 1.18 | 0.08 / -0.30 | 1524 |
| rdl_layer:copper+polymer_dielectric:0.5:xy | xy | 39.33 / 40.16 / 10.86 / 6.48 | -15.1 / -87.8 / -83.3 / -72.0 | 124.6 / 147.7 | -19.4 / -99.8 | 21.12 / 20.01 | 8.53 / 21.49 | 44 |

Reading:
- Column fields (bumps, C4, pillars): ROM transverse E 13-23 % low, transverse shear 11-20 % low, transverse k 14-25 %
  low; axial values agree (Voigt is near-exact axially). Same sign and size as R1's "ROM 23 % low" finding.
- TSV in Si: the library Si is cubic (lab x along <110>); ROM mixes the VRH isotropic average, so Ez is 25 % high
  (162 vs 130 GPa, Si [001]) and Gxy 30 % high. The RVE keeps the anisotropy.
- RDL levels (strips, planes, xy): the large z differences are a topology difference, not a mixing error: the
  generator's rdl_layer is one metal level (the via / IMD dielectrics are separate layers), so the metal spans the
  level thickness and the through-thickness path is parallel (RVE), while L2's ROM uses series (Reuss) in z
  (k_z -97 % to -99.8 %, Ez -49 % to -88 %). In-plane, ROM Voigt over-estimates a metal plane with antipads
  (+14 % to +32 %). For xy levels (two sublevels, h = p assumed) ROM - RVE CTE_z is +21 ppm/K.
- Request to L2 / coordinator: decide the rdl_layer through-thickness topology (series vs parallel); with
  homogenization: rve the topology above is used.
- Sparse metal 'plane' (f < 1 - pi/4 = 0.2146, e.g. soic copper+sio2_film 0.0218): no antipad fits; modelled as
  isolated Cu columns (labelled).
- Xilinx s3 (no lid, 1 mm, 2 cells per layer): ROM 337.67 um, RVE 338.82 um (+0.34 %): the bulk layers dominate this
  package; RVE resolve adds about 50 s for the 14 keys (no lasting cache across runs yet).

## Thin-layer rule (wave-1 open issue 5)

Measured on MA5 (1 um film, q1im, scratchpad `ma5asp.mjs`): kappa error -1.6e-4 / +2.1e-4 / -4.0e-3 with 1 / 2 / 4
cells through the film at 5 mm cells, but 3.3e-5 / -5.1e-5 with 1 cell at 10 / 20 mm (aspect 1e4 / 2e4). The floor is
set by stacking several very thin cells, not by the aspect of one cell. Rule (`merge.mjs`, `runMechCase` option
`thin: {max_aspect}`): layers with cell_xy / h > max_aspect (500) get one cell; runs of >= 2 such layers on one
footprint are merged into one exact-laminate block; thicker parts get min_cells_per_layer cells through extra grid
planes (skipped inside thin layers and within t_thin of any part face, to avoid slivers). Xilinx: the 8 BEOL layers
(7.58 um) become one block; s3 337.67 -> 337.66 um, s2 -52.80 -> -52.80 um, DOF -14 %, GMG iterations -15 to -20 %.
The remaining max aspect (4715) came from a 0.04 um generator sliver (lid adhesive top 1734.00 um vs BEOL face
1733.96 um): L1's snap_z_um default 0.01 um does not catch it; with snap_z_um 0.5 the max aspect is 400 and s2 is
unchanged (-52.8 um). Request: L3 aligns that face, or the case sets snap_z_um >= 0.05.

- 2026-10-20 15:16 PDT: E3 and thin-layer rule done (above). CD6 (L2): `materials.allow_extrapolation` passed by runMechCase into
  resolve / rebase (also through the RVE constituents); extrapolation flags surfaced in `derived.extrapolated` (per
  material, parts, flags) and warnings; test in mech-core. CD5 (template CTE sensitivity): no mechanics
  sensitivity runner exists yet (planned after E4). Audit A2: M7 study-level stress_free_C merges per_part, M9 corner
  flag keyed on material, M6 / M1 notes fixed; mech-core 12/12. L1 parseCase does not know
  `materials.allow_extrapolation` nor a `process_sequence` study: runMechCase validates those itself (request to L1).

## Memory pass for cowos_l/warpage_rt_ht (coordinator priority, M1 blocker; 2026-10-20 15:45 PDT)

Measured in Node under nice (scratchpad `cowl.mjs` / `cowl2.mjs`, runMechCase study s2, pcg_gmg, `memProbe`;
peak RSS from /usr/bin/time; arrayBuffers from process.memoryUsage at the stage marks).

| Mesh | Version | DOF | Peak RSS (GB) | arrayBuffers at solve (GB) | GMG iterations | Wall (s) | Warpage (um) |
|---|---|---|---|---|---|---|---|
| 2 cells / layer (77 x 69 x 109 cells) | before (full f64 stencil 1.17 GB, Map-based nodal stress averaging) | 1.80e6 | 2.79 | 2.02 | 223 | 247 | -256.969 |
| same | f64 half stencil + f32 full copy for the L1 hierarchy (`storage: f32full`) | 1.80e6 | 2.59 | 1.86 | 224 | 203 | -256.969 |
| same | f64 half stencil + half-stencil fine level, f32 coarse levels (`storage: lowmem`, nu 1) | 1.80e6 | 2.00 | 1.19 | 381 | 267 | -256.969 |
| 1 cell / layer (current case file) | f32full | 1.08e6 | 1.50 | 1.13 | 208 | 107 | -256.988 |
| same | lowmem, nu 2 (default above 3e5 DOF) | 1.08e6 | 1.40 | 0.75 | 207 | 158 | -256.988 |

Changes (all in engine/src/mech/): `lowmem.mjs` (half-stencil assembly and apply, exact f64 operator at 126 instead
of 243 doubles per node; half-stencil z-line Gauss-Seidel and one-pass Galerkin coarsening, so no full fine copy;
coarse levels stored f32 after the build; arithmetic stays f64, so M^-1 is a fixed symmetric operator and the
solution accuracy is that of the f64 operator: direct vs lowmem 1e-8 in mech-core); `index.mjs` (assembly and
solve in an inner scope so operator and hierarchy are garbage before post-processing; `gmg.storage: auto | f64 |
lowmem | f32full`, auto = lowmem above 3e5 DOF; `memProbe`); `post.mjs` (nodal averaging with sorted typed-array
slots instead of a Map of Float64Array per (node, part); per-cell stress fields Float32 above 2e5 cells, derived
maxima in f64); `assemble.mjs` (element-operator cache 64 MB above 2e5 cells: 124665 distinct (cell size,
material) operators on this case, so the cache cannot hold them all anyway). Remaining per-node cost (lowmem):
H 1.0 KB/node, coarse levels about 0.2 KB/node, line factors 0.14 KB/node, vectors about 0.2 KB/node.
Speed: the half-stencil smoother is pure JS; L1's hierarchy (f32full) is about 1.5x faster per solve on this case
(it has a WASM line sweep); `gmg.storage: 'f32full'` trades 0.1 GB for that speed.

## E4 process sequence (2026-10-20)

`engine/src/mech/process.mjs` `solveProcessSequence(grid, {steps, ...})`, total formulation per activation group
(plan above), DOF dropping by masked grids, stress-free activation through the minimum-energy extension of the new
group (shared nodes held, mirror planes held; without the mirror constraint the extension broke stress-free
activation on a quarter model: bond-without-cooling moved kappa from -12.495 to -11.340 1/m; fixed, now -12.495),
per-group stress recovery with u - u_act, warpage on the faces exposed at each step, `probeStepStress`.
Gate (`engine/tests/mech-process.test.mjs`, COMSOL-273-style plate, carrier 0.5 / Si 0.5 / Cu 0.1 mm, 20 mm, quarter,
q1im 0.5 mm, 2 cells per layer): curvatures after deposition (800 -> 150 C), bonding + cooling (150 -> 20 C) and
debond within 2e-3 of the CLT superposition written in the test; substrate-bottom and carrier-top stresses within
2e-2; carrier in tension. Not yet: case-level `process_sequence` study type in runMechCase (L1 parseCase rejects the
type; request), the DB process-flow case (tcpmt.2026.3672227), temperature-dependent D within a step.
- 2026-10-20 15:48 PDT: runMechCase runs `process_sequence` studies (steps as solveProcessSequence; per-step targets with a `step`
  key) and validates them itself, since L1's parseCase rejects the type (stripped from the copy it validates); test
  added. All L8 tests: mech-tierA 10, mech-core 12, mech-case 1, mech-process 2, homog-rve 6 (31/31, under nice).

## Wave 2 open issues

1. DB process-flow case tcpmt.2026.3672227 (FCF vs RAF, measured warpage after each step at 30 C: FCF 86.9 / 640 /
   812 / 293 / 285 um, RAF 74.4 / -282 / 257 / 244 / 233 um, data/metrics.csv -a-m1..m10) not run. Blockers found
   while setting it up: (a) the joint layer before underfill: L2's void-matrix ROM sets every shear modulus to 1e-5
   of the axial value, but columns along z carry axial shear (Gxz, Gyz about f G of the column); the dies would float
   in shear before underfill; (b) underfill cure fills an existing layer: needs a second phase overlaid on the bump
   cells (activation of a phase inside a part); the one-owner grid cannot express it; (c) the paper gives no
   substrate build-up stack or properties (ref [7]); die, ring, adhesive and core geometry are in the DB (components
   -a-c1..c5, stack_layers -a-L01..L07). Proposal: overlay phases in process steps (per-cell phase list), and an RVE
   void phase (compliant placeholder) for un-underfilled joints.
2. CD5 (template CTE of compliant layers with sensitivity [1/3, 3]): no mechanics sensitivity runner exists yet; the
   template values reach solveMech through the library unchanged. A runner that re-runs a study with each
   template value at its sensitivity bounds is the next item.
3. Requests to L1: `materials.allow_extrapolation` and the `process_sequence` study type (with steps) in parseCase;
   CLI dispatch to runMechCase for both mechanics study types.
4. Request to L2 / coordinator: rdl_layer through-thickness topology (series in L2 ROM vs parallel metal through the
   level in the RVE: k_z differs by up to 99.8 %); void-matrix shear (issue 1a).
5. Request to L3: the 0.04 um z sliver in the Xilinx case (lid adhesive top 1734.00 vs BEOL face 1733.96 um).
6. Speed: lowmem multigrid is pure JS (158 s for 1.08e6 DOF, 207 iterations); L1's WASM line sweep on the half
   stencil would bring it to the f32full speed (107 s). Iteration counts (about 200) are high for this case
   (cell aspect up to 3700 next to the 1 um BEOL layers): the thin-layer rule (merge.mjs) cuts DOF by 14 % and
   iterations by 18-20 % on the Xilinx case.

# Wave 3 (coordinator 2026-10-20): per-step material switch, E8 viscoelastic skeleton

Coordinator decisions on wave 2: CD7 RVE is the default homogenization (L2 wires the resolver; ROM fallback fixed
for axial shear); RDL topology follows the RVE.

## Wave 3 plan (2026-10-20 15:52 PDT, before implementation)

1. Per-step material switch in process sequences: `steps[].materials.map` {part id | glob: material key}. A switched
   part becomes a new activation group in its new material: stress-free in the new phase at the step's
   stress_free_C (default: the step start temperature), u_act = current displacement on all its nodes (all shared,
   no extension), its previous stress is discarded (the phase change resets it; e.g. bump layer copper+void ->
   copper+underfill at underfill cure). Masked grids carry a per-cell material override (extended material list).
   Test: substrate / column-field layer / die plate; step 1 with a compliant placeholder phase, step 2 switch to an
   RVE column field (Cu in underfill) stress-free at the switch temperature, then cool; analytic CLT superposition
   with the switched layer's step-1 resultants released into the new laminate (written in the test).
2. E8 skeleton (`engine/src/mech/viscoelastic.mjs`): linear viscoelastic generalized Maxwell (Prony) with
   proportional relaxation (D(t) = D0 (g_inf + sum g_i exp(-t / tau_i)), same g(t) for bulk and shear; the usual
   EMC data form E(t) with constant nu), reduced time with WLF above a reference / Arrhenius option, recursive
   internal variables per Gauss point (Taylor-Pister-Goudreau / Simo-Hughes update, exact for strain linear in
   reduced time over a step): h_i^{n+1} = exp(-dxi / tau_i) h_i^n + (1 - exp(-dxi / tau_i)) / (dxi / tau_i) D0 de_mech,
   sigma = g_inf D0 e_mech + sum g_i h_i. Algorithmic stiffness g_alg D0 with g_alg = g_inf + sum g_i (1 - e^-x)/x;
   history and thermal loads condensed like the q1im thermal load. Time stepping through process_sequence steps
   with durations (`duration_s`, `substeps`, linear temperature ramp within a step).
   Data: the cached corpus has no readable Prony / WLF table (grep of all references/*/text.md, plain and the
   +29-shifted font encoding: 0 hits for Prony, WLF, Williams-Landel, relaxation modulus, master curve; JOINT2
   ectc51909.2023.00155 Table 8 gives only E1 / E2 / Tg / CTE for CUF, EMC, DAF). So the tests use a synthetic set,
   labelled synthetic in the test file; engine/data/materials untouched (L2 owns data).
   Gates: constant-strain relaxation equals the Prony sum to round-off; thermorheologically simple cooling ramp
   (biaxially constrained layer, WLF shift) equals a fine independent quadrature of the hereditary integral.
3. Optional: 1.8e6-DOF memory.

## Wave 3 results (2026-10-20 15:58 PDT)

1. Per-step material switch (`steps[].materials.map`, process.mjs): a switched active part becomes a new
   activation group in the new material, stress-free at the step's stress_free_C (default: step start temperature),
   u_act = current displacement, previous stress discarded; masked grids carry the per-part material override.
   Gate (mech-process): substrate 1 mm / joint layer 0.1 mm / Si 0.5 mm, 60 mm plate, quarter, q1im: reflow
   (stress-free 217 C, compliant placeholder phase E 2 GPa, cooled to 165 C), cure (switch to the RVE column field
   homog:microbump:cu+uf:0.2 stress-free at 165 C, cooled to 25 C): curvature after each step within 3e-3 of CLT
   superposition (the switched layer's step-1 force and moment released into the new laminate), joint-layer stress
   within 3e-2 of the increment-only value. With a 20 mm plate and a 0.5 GPa placeholder the step-1 curvature was
   0.6 % below CLT (shear lag of the compliant interlayer reaching the central fit window: physical, not an error).
   The RVE resolver now tolerates constituents without k (k null).
2. E8 skeleton (`engine/src/mech/viscoelastic.mjs`, `solveViscoelastic(grid, {viscoelastic, history, substeps,
   ...})`): proportional Prony relaxation, WLF or Arrhenius shift, recursive internal variables per Gauss point,
   algorithmic stiffness g_alg K0 (element matrices reused), history eigen-stress load condensed for q1im.
   Gates (`engine/tests/mech-ve.test.mjs`, synthetic parameters labelled in the file): constant-strain relaxation
   (uniaxial strain at Tref, q1im and q1) equals M0 e0 g(t) to 1e-10 at t = 0 .. 3000 s; cooling ramp 150 -> 60 C at
   0.1 K/s (biaxially constrained layer, WLF) vs an independent fine quadrature of the hereditary integral: max error
   3.8e-3 with 48 steps, 3.9e-4 with 192 steps (order about 1.6), sigma_zz free to 1e-6. Not yet: viscoelasticity
   inside solveProcessSequence (activation + history), temperature fields (uniform T only), D0(T), bulk-elastic
   (non-proportional) option, case-level study type.
   Data: no sourced Prony / WLF set in the cached corpus (wave-3 plan); JOINT2 ectc51909.2023.00155 Table 8 (decoded
   from its font-shifted text, text.md lines 661-720) gives only E1 / E2 / Tg / CTE alpha1 / alpha2 (CUF 8900 / 100 MPa, Tg 160 C;
   EMC 18000 / 400 MPa, Tg 140 C; DAF 2900 MPa, Tg 40 C) and states EMC, CUF and DAF were modelled viscoelastic.
3. 1.8e6-DOF memory: not attempted (optional).

## CD7 follow-up and the precomputed RVE table (2026-10-20 16:03 PDT)

- runMechCase: homogenization defaults to the library default (`lib.homogenizationDefault()`: rve when L2 attached the
  RVE resolver); the mode is passed per call (`homogenization: 'rom' | 'rve'`) on homog: keys; the local RVE resolver
  now serves only merged thin-layer stacks, its constituents follow the same mode. mech/materials.mjs: no linearity
  probe on homog: keys (each probe temperature cost a full RVE solve, 3 per key).
- resolver.mjs: thermal-only calls (need without elastic and cte) compute the conduction RVE only (scalar, cheap; no
  Tsf needed); `stats()` counters (table exact / interpolated, live full / k, cache).
- Precompute path: `buildRveTable(resolver, requests)` (resolver.mjs) -> JSON object {schema ap-sim-rve-table/0,
  version, cfg, rule, rows [{key, T_K, Tsf_K | null, topology, C6, alpha6, k, rho, cp}]}; `createRveResolver(lib,
  {table})` checks the table first. Rule (RVE_TABLE_RULE): exact (key, Tsf, T) hit, else linear interpolation in T of
  C6, eps_th = alpha (T - Tsf) and k between the bracketing tabulated temperatures within 50 K at the same Tsf;
  thermal-only calls use the conduction rows (and full rows) by the same rule; anything else is computed live;
  calls with allowExtrapolation bypass the table. `homog/table.mjs`: `familyHomogKeys`, `defaultTableRequests`,
  `buildDefaultRveTable` (family default generations; full rows at the thermo-elastic sim cases' (Tsf, T) pairs,
  DEFAULT_MECH_POINTS; conduction rows at 25 .. 225 C every 25 K). Test (homog-rve): exact hit equals live to 1e-12,
  interpolated within 1e-2 at a 50 K bracket midpoint, conduction interpolation, other Tsf computed live.
- Browser wiring (L6): `lib.attachHomogResolver((view, cfg) => createRveResolver(view, {...cfg, table}))` with the
  shipped JSON.
- Note for L2: if a caller passes Tsf_K with need ['k'], my resolver returns cte null (conduction only) and
  resolveHomogKey would copy r.cte; guard `r.cte` there.

# Wave 4 (coordinator queue 2026-10-20, from L9's root-cause report)

## Wave 4 plan (2026-10-20 16:37 PDT, before implementation)

1. `derived.warpage[i].shape_class` (SPEC section 16 path and values: dome | bowl | W | saddle | flat) with
   `shape_criterion` (stated) and `shape_detail`; centre-minus-corner already in the block. Criterion: flat if
   coplanarity < 1 um; saddle if the principal curvatures of a quadratic fit of the plane-removed surface have
   opposite signs and the smaller magnitude is >= 10 % of the larger; dome / bowl if the deviation from the chord
   along both diagonals is single-signed (+: dome, -: bowl) and unimodal (one interior extremum, 2 % tolerance);
   W otherwise. Tests: dome (MA4b), bowl (MA4a), saddle (orthotropic-CTE bilayer), flat (free expansion).
2. Eigenstrain (cure shrinkage): `eigenstrain: {part id | glob | material key: {linear} | {volumetric}}` in
   solveMech (added to the thermal strain, sign: shrinkage negative), per activation group in process sequences
   (`steps[].eigenstrain`, applied to the parts activated or switched at that step). Library `cure_shrinkage`
   (L2): kind linear / volumetric used as stated; kind not_stated (EMC 0.16 %, JOINT2 Table 8): never picked
   silently: runMechCase runs both interpretations (linear 0.16 %; volumetric 0.16 % = linear 0.0533 %) as a
   bracketing pair, reports both, warns naming the ambiguity. Gate: free cube with linear shrinkage (exact strain,
   zero stress) and a bilayer CLT with shrinkage in one layer.
3. E(T) across Tg, rate form for uniform-temperature sweeps: d sigma = D(T) (d eps - alpha_inst(T) dT), integrated
   by load steps through the temperature path (midpoint D and alpha), state carried at Gauss points; output warpage
   at each requested temperature. Gate: bilayer with a bilinear-Tg layer where the rate-form CLT integral is exact
   (piecewise constant E, alpha: sum of CLT increments over the segments), and the contrast with the total
   (secant) form.
4. Geometric nonlinearity: total Lagrangian (Green-Lagrange strain, St. Venant-Kirchhoff with thermal eigenstrain),
   load-stepped Newton on the temperature change, q2s elements (no incompatible modes in the nonlinear tier).
   Gates: pure-moment bimetal strip (large rotation: the exact solution stays a circular arc with the linear
   curvature, while the sag follows R (1 - cos)), a thin-film plate in the bifurcation regime vs L5 scikit-fem
   nonlinear if needed; applied to fan_out_panel and the 120 mm case with the linear / nonlinear difference
   reported when > 5 %.

## RVE table numbers and wave 4 progress (2026-10-20 16:57 PDT)

- Default RVE table `engine/src/homog/rve_table_defaults.json` (built by `buildDefaultRveTable`, 5 chunks under
  nice, 251 s of RVE compute in total): 12 families, 53 distinct homog keys, 667 requests, 625 rows (148 full,
  477 conduction), 42 requests skipped (constituent outside its data range without allowExtrapolation: abf_gl above
  240 C, underfill_cuf above 260 C, ...; those run live), 278862 bytes JSON (39689 bytes gzip).
- Hit rate (scratchpad `hitrate.mjs`: each family's default generation, 4 mm quarter / half grid, one steady
  thermal solve with a 200 W volume source and HTC 2000 W/m2K, plus solveMech at every DEFAULT_MECH_POINTS
  (Tsf, T) with allowExtrapolation): 1322 distinct RVE requests (excluding 166 void-matrix keys, which the library
  serves by rule of mixtures): 199 exact + 1086 interpolated table hits, 37 live (all full rows at 240-265 C that
  were skipped at build time) -> 97.2 % hit rate. The table now also serves calls with allowExtrapolation (rows are
  built in range).
- shape_class (`derived.warpage[i].shape_class`, `shape_criterion`, `shape_detail`): tests dome / bowl / saddle /
  flat pass (mech-core). W is not covered by a test case yet.
- Eigenstrain: `solveMech({eigenstrain})`, `steps[].eigenstrain` (parts activated or switched in that step),
  runMechCase `cureShrinkage: 'library'`: kind not_stated -> bracketing pair (linear = value; volumetric = value)
  with a warning and `targets[].got_by_shrinkage`. Tests: free block exact strain and zero stress; volumetric =
  3 x linear; bilayer = CLT with the equivalent strain load (2e-3); library EMC 0.16 % pair ratio 3 (isothermal).
- Rate-form sweep (`engine/src/mech/sweep.mjs` `solveMechSweep`): bilayer with a synthetic bilinear-Tg layer
  (0.4 / 8 GPa at 100 C) on Si, 150 -> 100 -> 25 C in 5 K steps: curvature at 100 C and 25 C within 2e-3 of the
  integrated CLT; the total (secant) form differs by > 5 % at 25 C (test). Eigenstrain is not supported in the
  rate form yet.
- Geometric nonlinearity (`engine/src/mech/nonlinear.mjs` `solveMechNonlinear`, total Lagrangian, St.
  Venant-Kirchhoff, q2s, load-stepped Newton): tangent verified by finite differences (2.5e-5). Gate
  (`engine/tests/mech-nl.test.mjs`, synthetic 50 + 50 um bimetal strip, 20 mm, end rotation 1.01 rad): nonlinear
  curvature 101.2 vs linear 100.5 1/m (+0.7 %), arc radius at L/4 and L/2 equal to 4e-6, sag 4.616 mm vs
  R (1 - cos theta) 4.643 mm (-0.6 %), linear sag 5.025 mm (+8.9 %). Newton: 10 iterations per load step
  (oscillating first iterations; a line search would cut them).
- 2026-10-20 17:50 PDT: warm start (coordinator addition): runMechCase passes the previous temperature's solution on the same
  geometry (signature of the cell / material map) as the PCG initial guess, solveMech scales it to the Galerkin
  optimum on span{x0} (alpha = x0.b / x0.A x0); PCG stops on ||r|| <= rtol ||b|| (same accuracy as a cold start).
  Measured (q1im, lowmem GMG, rtol 1e-10):
  | Case | T (C) | cold iterations | warm iterations | warpage (um) |
  |---|---|---|---|---|
  | cowos_l s2 / s3 (dT-ratio scaling, before the energy scaling) | 25 / 240 | 208 / 374 | 208 / 375 | -250.745 / 187.647 |
  | Xilinx s2 sweep (energy scaling) | 25 / 75 / 125 | 282 / 281 / 281 | 282 / 243 / 253 | -50.830 / -27.264 / -8.403 |
  Warm start saves 10-14 % per temperature on the Xilinx sweep and nothing on cowos_l s2 -> s3 (the 25 C and
  240 C shapes differ in sign and form). Deflation with the lowest bending modes is the next step if more is needed
  (not implemented).
- Geometric nonlinearity on the cases (scratchpad `nlcase.mjs`: case geometry with thin runs merged at aspect 20,
  in-plane faces snapped to 4 mm (120 mm case) / 12 mm (panel) to keep the q2s Newton affordable: geometry is
  distorted, so only the nonlinear / linear ratio is meaningful): 120 mm case s2 at 30 C (Tsf 170 C), 25407 DOF:
  linear 469.0 um, nonlinear 480.3 um (+2.4 %, below the 5 % reporting threshold), dome in both; Newton 4 / 3 / 3 /
  3 iterations over 4 load steps, 166 s. A linear predictor (material tangent only) is used for the first iteration
  (the flat state with the full misfit prestress can have an indefinite geometric stiffness; the q2s p-MG PCG did
  not converge on it); tangent solves are direct up to 1e5 DOF.
- 2026-10-20 18:05 PDT: fan_out_panel s2 at 25 C (Tsf 120 C; geometry snapped to 12 mm in-plane, 99 thin runs merged, 40 x 10 x 10
  cells, 56463 DOF, q2s): linear 7030 um, nonlinear 7298 um (+3.8 %, below the 5 % threshold), dome in both;
  Newton 4-5 iterations per load step over 6 steps (tolerance 1e-5), 768 s (above the 3 min run guideline; one
  background run). The 40 x 10 cell layout suggests a strip-like model in which the bending is close to
  cylindrical (developable, little membrane penalty); a square panel in the bifurcation regime would need the L5
  reference. All L8 tests 41/41 (mech-tierA 10, mech-core 15, mech-case 2, mech-process 4, mech-ve 2, mech-nl 1,
  homog-rve 7).

## Wave 4 open issues

1. W shape class has no test case; the saddle and dome / bowl criteria are tested.
2. Nonlinear solver: q2s only, direct tangent solves up to 1e5 DOF (the q2s p-MG PCG failed on the panel tangent);
   Newton oscillates in the first iterations (an energy line search stalled); the case runs above used heavily
   snapped geometry. A plate bifurcation check against L5 scikit-fem nonlinear is still open.
3. Rate-form sweep: uniform temperature, no eigenstrain, no stress accumulation; T-dependent CTE is handled through
   the exact thermal-strain increment.
4. Cure shrinkage runs only through runMechCase (`cureShrinkage: 'library'`), not yet as a process-step default.
5. Warm start: 10-14 % on a temperature sweep, none across very different temperatures; deflation not done.
