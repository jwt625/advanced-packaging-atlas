---
title: Native browser 3D EM solver - higher-order Nedelec, iterative p-multigrid solver, lumped ports, adaptive sweep (Palace source as reference)
date: 2026-10-21
status: paused 2026-10-22 for commit (P1, P2, P4, P5 done; P3 near gate; P6 started; P7 in progress, unwired)
scope: engine/src/em3d/, engine/src/em2d/, engine/tests/em*, sims/em/, validation/cases (EM), validation/reference/ (EM), cache/third_party/palace (read-only reference, git-ignored)
authors: Claude (lane L22), at Wentao Jiang's request
---

# DevLog-014: native browser 3D EM solver

Request (Wentao, 2026-10-21, via DevLog-013): "no Palace. Make native EM solver in browser. Adapt their source code as
reference." No Palace build or binary. The engine's own JS (optional WASM SIMD) 3D EM solver is extended to reach what
the Palace backend was meant for in DevLog-010 A8 / E6: order-2 elements, blocks beyond the 6e4-DOF direct budget,
the full EM-5a chain, adaptive sweeps. Palace (github.com/awslabs/palace) is the algorithm and structure reference.
Lane notes (detailed log): [DevLog/lanes/L22-em3d-native.md](lanes/L22-em3d-native.md).

## Starting point (2026-10-21)

- em3d (lanes L7, L13): first-order Nedelec (Whitney) on layered extruded-prism tet meshes; PEC / PMC box sides;
  PEC / IBC / thin-conductor transition BC; stretched-coordinate PML; quasi-TEM multi-mode, TE10 and full-wave
  (single-mode) wave ports via a Woodbury low-rank update; line-run de-embedding on companions cut from the device
  mesh; direct complex supernodal LDL^T (blocked front update, optional WASM SIMD); DOF guard 6e4.
- EM-4 vs L5 NGSolve (L 9.03 pH, C1 = C2 9.37 fF, S11 -52.5 / -32.5 / -18.6 / -12.9 dB at 1 / 10 / 50 / 100 GHz;
  `DevLog/lanes/L5-references.md` wave 3): L 8.913 pH (59.5k DOF) / 8.966 pH (97.4k DOF); C 10.53 / 10.03 fF
  (+12 / +7 %); S11 +1.3 / +0.75 dB at 10 GHz; 97.4k DOF takes 173.6 s for 4 frequencies, 2.24 GB peak RSS
  (`DevLog/lanes/L13-em3d.md`).
- EM-5a reduced: 3D port impedance 53.9 ohm vs 68.9 ohm converged 2D; z-graded p1 meshes reach 66.9 ohm only at
  763k DOF (L7 wave 6). Case stays draft; L5 NGSolve (order 1, 169k DOF, 2.9 GB) is the reference.
- EM-5a full (paper geometry, 4 TSVs in series per line, G-S-G): no 3D reference exists. L5 has a quasi-TEM cascade
  bracket only (nominal dip 60 GHz; Monte Carlo 26-66.5 GHz, median 57.5).

## Phase 0: Palace study (2026-10-21)

Clone: `cache/third_party/palace` (shallow, `git clone --depth 1`), commit `29ad351f916e47e005a43730513f155eeb634e3e`
(2026-10-21 15:09 -0400), 167 MB, no build. Read-only.

### Licence check

- `LICENSE`: Apache License 2.0 (January 2004). Source headers: `SPDX-License-Identifier: Apache-2.0`.
- `NOTICE`: "Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved."
- The engine is GPL-3.0-or-later. Apache-2.0 is compatible with GPLv3 (FSF licence list), so GPL-3.0-or-later code
  may include work adapted from Apache-2.0 code. Apache-2.0 section 4 conditions for a derivative work: (a) give a
  copy of the licence, (b) modified files carry prominent change notices, (c) keep copyright / attribution notices,
  (d) carry the NOTICE attribution.
- Implementation of those conditions here: every adapted file carries a header
  `Adapted from awslabs/palace <path> at 29ad351f (Apache-2.0); changes: <summary>`; `engine/src/em3d/NOTICE` holds
  the Palace NOTICE text and the list of adapted files; `engine/src/em3d/LICENSE-APACHE-2.0` is a verbatim copy of
  Palace's LICENSE. Request to the coordinator: reference `engine/src/em3d/NOTICE` from the repository README /
  a root NOTICE (outside this lane's write paths).
- Nothing is copied verbatim: Palace is C++ on MFEM / hypre / libCEED; the engine re-implements the algorithms in JS.
  Attribution is kept anyway where the structure follows Palace.

### What Palace does (files read)

| Topic | Palace (file) | Notes |
|---|---|---|
| Spaces | `fem/fespace.cpp`, MFEM `ND_FECollection` / `H1_FECollection` | Nedelec first kind, order p (`Solver.Order`), H1 order p auxiliary space; hierarchy of p levels p..1 (then optional h levels) |
| Driven solver default | `utils/iodata.cpp` 485-610 | Krylov GMRES (restart = max_it 100), tol 1e-6; preconditioner: geometric (p) multigrid, coarse level = sparse direct (SuperLU / STRUMPACK / MUMPS) when built, else AMS; `pc_mat_real` false: the preconditioner is built from the complex system matrix |
| Multigrid | `linalg/gmg.cpp` | V-cycle: pre-smooth, residual, restrict P^T, recurse, prolong P, post-smooth (transpose); Dirichlet rows zeroed on restriction |
| Smoother | `linalg/distrelaxation.cpp`, `linalg/chebyshev.cpp` | Hiptmair distributive relaxation: y += B(x - Ay), then y += G B_G G^T (x - Ay) with A_G = G^T A G on the H1 auxiliary space; B, B_G Chebyshev (4th kind, order max(2p, 4)); transpose order for post-smoothing |
| AMS | `linalg/ams.cpp` (hypre AMS) | used as coarse solver or standalone; Palace shifts the mass term to |a2| (`pc_mat_shifted`) when AMS is the PC |
| Preconditioner matrix | `models/spaceoperator.cpp` 1083-1290 | same complex coefficients as the system (real and imaginary parts assembled separately on every level), essential DOFs with unit diagonal |
| Krylov | `linalg/iterative.cpp` | GMRES / FGMRES with restart, CGS2 / MGS orthogonalization, left or right preconditioning |
| Lumped port | `models/lumpedportoperator.cpp`, `fem/lumpedelement.hpp` | rectangle of length l (E direction) and width w; surface impedance Z_s = R w / l (and L, C); Robin term i w / Z_s int E_t . v_t; drive 2 i w H_inc with unit incident power; V = (1/w) int E . l dS; S = V / sqrt(R_ref) |
| Wave port | `models/waveportoperator.cpp` | 2D boundary-mode eigenproblem (Lee-Sun-Cendes ND x H1) on the port face; the engine already has its own (L7) |
| Adaptive sweep | `drivers/drivensolver.cpp` SweepAdaptive, `models/romoperator.cpp` | PROM: Galerkin projection on a real basis (Re and Im of each HDM sample, orthonormalized); greedy sampling: start at the band ends, next sample at argmin |Q(z)| of the minimal rational interpolation (MRI) of the samples (SVD of the R factor of [u_i, i w_i u_i]); stop when the relative HDM vs PROM error < tol for `adaptive_memory` (2) consecutive samples or at 20 samples |
| Error estimate / AMR | `linalg/errorestimator.cpp`, `utils/dorfler.cpp` | flux-recovery indicator (smoothed D, B in RT / ND), Dorfler marking, MFEM conforming refinement |

### Portability to the browser

- One Web Worker, no threads: SharedArrayBuffer needs cross-origin isolation, which GitHub Pages cannot set by
  header; coi-serviceworker would force a reload and COEP side effects on the whole atlas (R2). Decision: single-worker
  design; all memory in one worker, target <= 1.5 GB per worker.
- No MPI / hypre / MFEM: the parts that matter are small algorithms (V-cycle, Hiptmair smoother, GMRES, MRI greedy,
  lumped-port forms). The engine already has the coarse direct solver (complex supernodal LDL^T, WASM SIMD option).
- Not ported: libCEED partial assembly and GPU backends (CPU JS assembles CSR); MFEM AMR (the layered prism mesh is
  not refinable element-wise without breaking the extrusion structure that thin-conductor pairing and sub-mesh
  companions rely on); hypre AMG (only needed if the order-1 coarse problem exceeds the direct budget; phase 5).

## Decisions

| # | Decision | Reason |
|---|---|---|
| D1 | Hierarchical Nedelec first kind, order 2: Whitney (6 per tet), edge gradients grad(l_i l_j) (6), face functions l_k w_ij, l_j w_ik (2 per face, 8 per tet): 20 per tet, the same space as MFEM ND order 2 | the p-multigrid prolongation p1 -> p2 is injection and the coarse operator is exactly the existing order-1 matrix; the discrete gradient H1-P2 -> ND2 is trivial (vertex functions -> Whitney as in order 1; edge bubble l_i l_j -> its gradient DOF); quasi-TEM port modes e = -grad phi with phi in P2 map exactly into the port trace space |
| D2 | Element matrices by exact integration of barycentric monomials (int l^a = a! 3! V / (|a| + 3)!), basis held as symbolic polynomials in (l, grad l) | exact for any order, no quadrature tables; extends to p = 3 |
| D3 | Solver: right-preconditioned complex GMRES; preconditioner = p-multigrid V-cycle: fine level Hiptmair distributive relaxation (symmetric Gauss-Seidel on A and on A_G = G^T A G, assembled by sparse triple product), coarse level = existing order-1 direct LDL^T with the port Woodbury update | Palace's default driven structure; Gauss-Seidel instead of Chebyshev (no eigenvalue estimates on complex indefinite operators; Hiptmair's original smoother); a fixed linear preconditioner, so plain GMRES (not FGMRES) and only one Krylov basis in memory |
| D4 | Port low-rank terms (Woodbury) applied matrix-free in the fine operator; the coarse solve includes them exactly | one iterative solve per excitation instead of one per low-rank column |
| D5 | Direct solver stays the default for blocks whose operator fits the direct budget; iterative is selected by `solver` (case key, additive SPEC request) or automatically above `max_dof_direct` | no regression of existing gates; direct is exact for the low-frequency pi extraction (det-Z cancellation 1e-6..1e-8) |
| D6 | Lumped ports follow Palace's normalization (Z_s = R w / l, Robin i w mu0 / Z_s in this engine's units, drive with unit incident power), extracted as terminal V and I so the existing Z / ABCD / renormalization path is reused | same S path as wave ports (de-embedding, pi, Touchstone) |
| D7 | Adaptive sweep = Palace PROM greedy + MRI, but the reduced operator V^T A(w) V is formed per frequency by sparse products (assembly + n SpMV) instead of an affine decomposition | PML (1/w stretch), IBC (sqrt w), dispersive eps and port terms are not affine in w; assembly is cheap next to a solve |
| D8 | No AMR (see portability); mesh convergence by user mesh settings plus p-refinement | layered mesh structure |

## Phases and gates

Gate numbers are pass / fail criteria for this lane; values are recorded in the Results section.

| Phase | Work | Gates |
|---|---|---|
| P1 | ND2 elements on the layered mesh (faces, DOF map, PEC on faces, IBC / thin / port face terms, PML), quasi-TEM ports with P2 face electrostatics, TE10 ports by L2 projection, full-wave port at order 2; direct solver | G1 TE10 1 x 0.5 mm at 200 GHz, h 100 um: beta error <= 1e-3 (L5 NGSolve order 2: -3.6e-5), S11 < -80 dB; G2 coax PEC 3D vs analytic Z0 = (60 / sqrt eps_r) ln(b / a) and vs em2d P2: Z0 within 0.2 %; G3 order-1 results unchanged (all existing em3d tests) |
| P2 | GMRES + p-multigrid (Hiptmair GS smoother, direct order-1 coarse with Woodbury); `solver: iterative` | G4 iterative = direct (same discretization) to 1e-6 in S on TE10, coax, microstrip and EM-4 coarse; G5 iteration count <= 60 per excitation at tol 1e-10 on those cases |
| P3 | EM-4 converged in the browser: p2 on the browser mesh and on a refined one; line-run companions at p2 | G6 EM-4 vs L5: L within 1 % of 9.03 pH, C within 3 % of 9.37 fF, S11 within 0.3 dB at 1 / 10 / 50 / 100 GHz; G7 wall time per frequency and peak RSS recorded at the browser budget (Node, nice 10) and peak <= 1.5 GB for the browser setting |
| P4 | Lumped ports | G8 lumped-port microstrip / CPW vs wave port: S21 within 0.05 dB below 50 GHz on a matched line; reciprocity 1e-10 |
| P5 | Adaptive frequency sweep (PROM, greedy, MRI) | G9 PROM S vs HDM S at every fine-sweep point <= 1e-4 (|dS|) on EM-4 and EM-5a reduced, with <= 50 % of the HDM solves of a 21-point sweep |
| P6 | EM-5a reduced at order 2, port-Z check refined (em2d convergence), then EM-5a full (paper geometry from L5's Fig. 2 reconstruction, 4 TSVs per line) | G10 EM-5a reduced: 3D port Z within 2 % of the converged 2D value; S11 / S21 within 1 dB / 0.05 dB of L5 NGSolve (h 4, 169k order-1 DOF) at 1-67 GHz for both Si variants; G11 EM-5a full runs in the browser budget (peak <= 1.5 GB) and is compared with L5's cascade bracket (nominal dip 60 GHz) and with a desktop reference if one can be built (validation/reference, NGSolve) |
| P7 | AMS-style coarse solver (hypre AMS structure: Hiptmair + AMG on G^T A G and Pi^T A Pi) if the order-1 coarse problem of EM-5a full exceeds the direct budget | G12 same S as the direct-coarse path to 1e-6; peak memory scales linearly |
| all | regression | G13 `cd engine && npm test` green at every hand-off; em2d / em3d gates of L7 / L13 unchanged |

Order rationale: P1 first (the order-1 under-resolution of thin conductors is the root cause of the EM-4 C and EM-5a
port-Z misses, L7 wave 6); P2 before P3 because p2 at the EM-4 browser mesh is ~5x the order-1 DOF; lumped ports and
the adaptive sweep are independent of the mesh fidelity; EM-5a full last because it needs all of the above.

## Risks

1. Gauss-Seidel smoothing on the complex indefinite operator may stall at high k h or in lossy Si; fallback: more
   smoothing steps, damped Jacobi-Chebyshev (Palace) or AMS on the coarse level.
2. Low-frequency accuracy: the iterative residual tolerance must reach about 1e-10 for pi-model extraction of
   electrically tiny blocks (det-Z cancellation 7e-6 at 1 GHz on EM-4, L13); direct stays the default there.
3. Memory of p2 fine operators (about 20 B per nonzero, ~45 nonzeros per row) plus the order-1 factor; the browser
   setting may have to use a coarser mesh at p2 than the order-1 browser mesh.
4. EM-5a full geometry is reconstructed from a figure (L5: +-ranges); a 3D desktop reference may not fit 4 GB.

## TODO

- [x] Phase 0: Palace clone, licence check, study, this plan
- [x] NOTICE + Apache licence copy in engine/src/em3d; attribution headers on adapted files
- [x] P1 ND2 elements, ports, PML, IBC / thin; G1-G3
- [x] P2 GMRES + p-MG; G4 pass; G5 pass on TE10 / coax, open on anisotropic meshes (see Results)
- [ ] P3 EM-4 converged; G6 at the edge (C +3.0 %, S11 +0.30-0.34 dB at 145k DOF), G7 memory over budget with companions
- [x] P4 lumped ports; G8
- [x] P5 adaptive sweep; G9
- [ ] P6 EM-5a: port-Z reference refined (done); order-2 port-Z study done; 3D S runs and the full chain not done
- [ ] P7 AMS coarse: amg.mjs + ams.mjs written, AMG verified standalone, not wired (needed for EM-5a)
- [x] L13 hand-off item: em2d port-Z reference refinement (from L20 task 6)
- [ ] L13 hand-off items, routed (not this lane): record fixes (DevLog-012 L7 wave 6
      entry, RESULTS.md EM-4 row: coordinator / L4 scope, routed); UI label (L24 scope, routed)
- [x] Full engine suite green at hand-off (see Progress); SPEC 14.6 and UI requests in the final report

## Progress

- 2026-10-21 18:33 PDT Phase 0 done: Palace cloned (29ad351f), licence Apache-2.0 checked, study table and plan
  written. Baseline em2d + em3d tests started.
- 2026-10-21 18:4x-19:2x PDT P1 done: `hcurl.mjs` (hierarchical ND / H1 orders 1-2, exact barycentric integration),
  `space.mjs` (faces, DOF map), order-2 paths in `solver.mjs` / `ports.mjs` (order-1 arithmetic unchanged).
- 2026-10-21 19:0x-19:4x PDT P2: `krylov.mjs` (GMRES), `pmg.mjs` (two-level p-MG, Hiptmair GS smoothing, direct
  order-1 coarse with Woodbury port terms); restricted assembly (no full pattern kept), buffer / factor / Krylov reuse.
- 2026-10-21 19:4x-20:1x PDT P4 `lumped.mjs` + mesher `surfaces`; P5 `prom.mjs` + runner key `em3d.adaptive`;
  em2d port-Z reference refinement in `portZ2d`; new test file `engine/tests/em3d-p2.test.mjs` (7 tests).
- 2026-10-21 20:1x-20:3x PDT P7 started: `amg.mjs` (smoothed aggregation, verified standalone), `ams.mjs` (written, not
  wired, untested).
- 2026-10-22 Engine suite 330 / 330 pass (257.2 s).
- 2026-10-22 Paused at the coordinator's request for the commit: AMS left unwired, defaults unchanged (order 1 /
  direct unless a case sets `order: 2`), engine suite run (result below).

## Results so far (Node 23.7.0, nice 10, shared machine; scratch scripts and logs outside the repo)

### Gates

| Gate | Result | Status |
|---|---|---|
| G1 TE10 1 x 0.5 mm, 200 GHz | order 2 h 200 um (18.7k DOF): beta +1.80e-5, S11 -87.0 dB; h 100 um (130.7k DOF): +3.54e-6, -112.4 dB (order 1 h 100: +1.06e-2, -51.7 dB; L5 NGSolve order 2 h 100: -3.6e-5, -104.7 dB) | pass |
| G2 coax 3D vs em2d (33.692 ohm, same polygons) | order 2: Z0 -9.8e-4 (18.7k DOF), -6.4e-4 (76.3k); beta +3.0e-5 | pass |
| G3 order-1 regression | all L7 / L13 gate numbers identical (em3d 19 / 19 tests; EM-4 59.5k DOF L 8.91 pH, C1 10.53 fF) | pass |
| G4 iterative = direct (order 2) | TE10 2.6e-11, coax 2.2e-12, microstrip 3.8e-11 in S | pass |
| G5 GMRES iterations (rtol 1e-10, 2 GS sweeps) | TE10 19, coax 54, EM-4 order 2: 51-61; microstrip on needle cells (axis x): no convergence in 400 | partly (see finding) |
| G6 EM-4 vs L5 (L 9.03 pH, C 9.37 fF, S11 -52.5 / -32.5 / -18.6 / -12.9 dB) | order 2, 145,148 DOF (mesh max_edge 30, max_dz 10, h_scale 2; companions 58,322 DOF): L 9.096 / 9.096 / 9.088 / 9.063 pH (+0.7 %), C1 9.652 fF (+3.0 %), S11 -52.18 / -32.18 / -18.30 / -12.57 dB (+0.30 to +0.34 dB) at 1 / 10 / 50 / 100 GHz. Order 2, 282,264 DOF (max_edge 24, max_dz 8): 10 GHz L 9.105 pH (+0.8 %), C1 9.554 fF (+2.0 %), S11 -32.30 dB (+0.20 dB). Order 1 59.5k DOF (L13): L -1.3 %, C +12 %, S11 +1.3 dB | at the edge of the C / S11 bounds at 145k; pass at 282k (one frequency) |
| G7 time and memory (EM-4) | order 2 145k DOF: 19-20 s device + 11.5 s companions per frequency, 125 s for 4 frequencies, peak RSS 2.22 GB (companions direct order 2); 282k DOF: 74 s per frequency, 2.38 GB; device only (no companions) 291k DOF: 36.5 s, 1.25-1.59 GB | fail (memory with companions) |
| G8 lumped ports | parallel-plate TEM with full-cross-section ports: order 1 |S11| <= 7.7e-4, order 2 <= 8.1e-8 (exact match expected); microstrip lumped vs wave S21 within 0.0015 / 0.0044 dB at 5 / 20 GHz (0.12 dB at 50 GHz: lumped-port parasitics, lumped S11 -35 / -33 / -15 dB) | pass (<= 20 GHz) |
| G9 adaptive sweep | EM-4 order 1, 21 points 1-100 GHz: 4 HDM samples per operator, max |S_PROM - S_HDM| 1.65e-10, L / C identical to 4 digits, 58.2 s vs 270.3 s (4.6x); stub microstrip 31 points 1-60 GHz: 12 samples, 3.4e-8 (online 0.42 s vs HDM 4.6 s per point) | pass |
| G10 EM-5a reduced | port-Z study only (hr_si, em2d converged 68.896 ohm): order 1 base 53.92; order 2 base 65.97 (-4.2 %, 325k DOF, coarse 58.6k); order 2 z-graded 67.28 (-2.3 %, 1.03M DOF); + h_scale 0.5 68.24 (-1.0 %, 2.16M DOF). No 3D S run yet | not reached |
| G11 EM-5a full | not started (geometry from L5 nominal: P 100, W 60, Lh 96, Lend 120, d 10, liner 0.5, t_front 3, t_back 1 um) | not started |
| G12 AMS coarse | not wired | not started |
| G13 engine suite | 330 / 330 pass, 257.2 s (2026-10-22, nice 10) | pass |

### Findings

1. Order 2 fixes the order-1 thin-conductor under-resolution: on EM-4 the port impedance error drops from -9.5 % to
   -1.8 % / -2.1 %, C from +12 % to +2-3 %.
2. Two-level convergence is limited by the coupling between the Whitney space and the hierarchical complement on
   anisotropic cells (strengthened Cauchy-Schwarz constant), not by the smoother: block Gauss-Seidel with EXACT Whitney
   and complement solves needs 78 GMRES iterations on the coax mesh (in-plane 60, dz 200 um) vs 29 isotropic; moving
   the edge gradients into the coarse space does not help (78 / 26); ILU(0) breaks down; GS ordering has no effect.
   Two GS sweeps are the best time trade-off (EM-4: 84 / 51 / 41 iterations for 1 / 2 / 3 sweeps, 45 / 37 / 40 s).
3. The em2d port-Z reference was within 0.1 % of converged: EM-4 43.319 / 43.346 / 43.355 / 43.358 ohm, EM-5a hr_si
   68.885 / 68.891 / 68.895 / 68.896 ohm at conductor_cells 4 / 8 / 16 / 32; `portZ2d` now refines to 5e-4.
4. EM-5a in the layered mesh: in-plane refinement near the 1 um lines is extruded through every layer and z-grading
   applies at every interval end, so DOFs grow multiplicatively; order 2 alone reaches -4.2 % port Z at the
   browser-mesh size; the 2 % gate needs about 1M order-2 DOF with this mesher, over the browser budget and over the
   direct coarse budget (needs P7 AMS and/or a mesher that grades z only near selected solids).

## State at pause (2026-10-22)

- Done and tested (`engine/tests/em3d-p2.test.mjs`, 7 tests): order-2 elements, iterative solver, lumped ports, PROM.
- Case keys added (in `run.mjs`, additive; SPEC 14.6 request below): `em3d.order`, `em3d.solver`, `em3d.iterative`,
  `em3d.direct_max_dof`, `em3d.coarse_max_dof`, `em3d.adaptive`, `em3d.mesh.h_scale`, lumped ports in `em3d.ports`.
  No case yaml in `sims/em/` was changed; defaults (order 1, direct) reproduce L13 exactly.
- In progress, not wired: `em3d/amg.mjs`, `em3d/ams.mjs` (status header in each file).
- Small fix: Touchstone file name uses the terminal count (`.s{N}p`), comments list terminals (was the wave-port
  count, wrong for multi-mode ports).

## Next steps

1. Wire AMS as `coarse: ams` in `pmg.mjs` (real shifted order-1 matrix assembled per frequency; G1 / Pi from the mesh),
   gate G12 against the direct coarse on EM-4.
2. Memory: run companions with the iterative solver (direct_max_dof default 3e4 already) and release companion data
   between frequencies; measure G7 again at 145k DOF.
3. EM-4: one more mesh between 145k and 282k with line run at 4 frequencies (G6), then decide the browser default
   (proposed variant `order2` in `sims/em/em4_microbump_gsg.yaml`).
4. EM-5a: mesher option for z-grading near selected solids only; order-2 reduced runs vs L5 NGSolve (G10); full chain
   case yaml (half model, PMC at y = 0) once AMS is wired (G11).
5. Performance: f32 preconditioner values, WASM SIMD for SpMV / GS.
