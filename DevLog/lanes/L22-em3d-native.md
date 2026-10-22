---
title: Lane L22 - native browser 3D EM solver (order-2 Nedelec, GMRES + p-multigrid, lumped ports, adaptive sweep), Palace source as reference
date: 2026-10-21
status: in progress
scope: engine/src/em2d/, engine/src/em3d/, engine/tests/em*, sims/em/, validation/cases (EM), validation/reference/ (EM), cache/third_party/palace
authors: Claude (lane L22), at Wentao Jiang's request
---

# L22: native browser 3D EM solver

Plan, decisions, gates and the summary record: [DevLog-014](../DevLog-014-browser-em3d-solver.md). This file is the
detailed log. Binding: DevLog-013 shared rules; SPEC section 14 (14.1-14.5); L7 / L13 notes; L5 wave 3 references.

## Progress log

- 2026-10-21 18:2x PDT Read DevLog-013 (shared rules, 2026-10-21 entries), DevLog-010 A8 / E6, DevLog-012 (L7 waves,
  L13, L5 wave 3), L7 / L13 / L5 notes, SPEC 14.x, em3d source (solver, ports, mesh, run, elements, order), case
  yamls (EM-4, EM-5a reduced) and the EM-5a deck.
- 2026-10-21 18:28 PDT Palace shallow clone in `cache/third_party/palace` (git-ignored), commit 29ad351f, 167 MB, no
  build. LICENSE Apache-2.0, NOTICE "Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.".
- 2026-10-21 18:2x-18:33 PDT Palace study (files and findings in DevLog-014 Phase 0): linalg/{ksp,gmg,
  distrelaxation,hcurl,iterative}.cpp, models/{spaceoperator (preconditioner assembly 1083-1290),
  lumpedportoperator,romoperator (MRI, SolvePROM)}.cpp, drivers/drivensolver.cpp (SweepAdaptive),
  utils/iodata.cpp (defaults 485-610), utils/configfile.hpp (tol 1e-6, max_it 100, adaptive max 20 samples,
  memory 2).
- 2026-10-21 18:33 PDT Baseline: em2d + em3d tests 38 / 38 pass, 67.1 s (nice 10; scratch log).
- 2026-10-21 18:4x-19:2x PDT P1 order-2 elements:
  - `em3d/hcurl.mjs` (new): hierarchical Nedelec order 1 / 2 and H1 order 1 / 2 as barycentric polynomials, exact
    simplex integration, compiled coefficient tables; tet ND2 = 20 functions. Unit checks (scratch): order-1 tables
    reproduce `elements.mjs` tetMatrices to 1.6e-16 and faceMass to 5.4e-17; curl rows of the 6 edge gradients are
    exactly 0; ND2 mass SPD.
  - `em3d/space.mjs` (new): face enumeration, DOF map (Whitney = edge ids, then gradients, then 2 per face).
  - `solver.mjs` / `ports.mjs`: generic DOF loops (order 1 arithmetic unchanged), PEC on faces, IBC / thin / port face
    terms with 8 x 8 trace masses, port statics in hierarchical P2 (e = -grad phi maps exactly), TE10 by L2 projection
    (16-point collapsed Gauss rule, CG on the port mass), order-2 full-wave port (ND2 + P2 Lee-Sun-Cendes).
  - Order-1 regression: em3d.test + em3d-ports 10 / 10, gate numbers identical to L7 (TE10 1.06e-2, -51.7 dB; coax
    -7.66e-3; PML -22.7 / -30.6 / -41.8 dB).
  - Order-2 checks (scratch t2 / t3, direct solver): TE10 1 x 0.5 mm 200 GHz h 200 um 18.7k DOF beta +1.80e-5, S11
    -87.0 dB; h 100 um 130.7k DOF beta +3.54e-6, S11 -112.4 dB (L5 NGSolve order 2 h 100: -3.6e-5, -104.7 dB). Coax
    Z0 vs em2d 33.692 ohm: -9.8e-4 (18.7k DOF), -6.4e-4 (76.3k); beta +3e-5. Thin sheet alpha 2.8e-8 / 7.8e-8. IBC
    coax alpha -1.10e-2 / -6.1e-3 (coarser mesh than the order-1 gate). PML 2 / 4 / 8 cells -33.0 / -47.9 / -52.1 dB.
    Microstrip Z 50.85 ohm (em2d fine 50.92); full-wave port 60 GHz S11 -47.5 dB vs quasi-TEM -34.4 dB.
- 2026-10-21 19:0x-19:3x PDT P2 GMRES + p-multigrid (`krylov.mjs`, `pmg.mjs`, solver `iterative`):
  - iterative = direct to 6e-12 / 4e-13 / 4e-11 in S (TE10, coax, microstrip at order 2).
  - Iterations (rtol 1e-10): TE10 29, coax 84 (frequency-independent 1-100 GHz: 83 / 84 / 90), microstrip axis x
    (needle cells) 400 without convergence (3.8e-9). Smoothing sweeps 2 / 3: coax 55 / 44. ILU(0) smoother tried and
    removed (breakdown, no progress).
  - Diagnosis (scratch t7): two-level block Gauss-Seidel with EXACT Whitney and complement solves still needs 78
    iterations on the coax mesh (in-plane 60, dz 200 um) and 29 on an isotropic one (dz 60), also with a positive
    shift: the limit is the coupling (CBS constant) between the Whitney space and the hierarchical complement on
    anisotropic cells, not the smoother. Moving the edge gradients into the coarse space does not change it (78 / 26).
  - EM-4 base at order 2 (mesh max_edge 24, max_dz 8, grade 0.42; 282,264 DOF, coarse 49,710, nnzL 1.55e7), 10 GHz:
    L 9.1050 pH, C1 9.5543 / C2 9.5546 fF, S11 -32.295 dB, S21 -0.0039 dB; port Z 42.53 vs em2d 43.32 ohm (-1.8 %);
    86 GMRES iterations per excitation (companions 62 / 63); 46.1 s DUT + 28.2 s companions; peak RSS 2.38 GB.
- 2026-10-21 19:4x PDT Memory: assembly straight into the restricted matrix (element slot -> restricted entry), value
  buffers / factor objects / GMRES basis reused across frequencies; order-1 numbers bit-identical (em3d 19 / 19).
- 2026-10-21 19:5x PDT EM-4 order 2 smoothing sweeps (291k DOF, port extension, 10 GHz): 1 / 2 / 3 sweeps 84 / 51 / 41
  iterations, 45.3 / 36.5 / 39.9 s, peak 1.32 / 1.59 / 1.25 GB; default set to 2. h_scale 2: 146.5k DOF, C1 9.67 fF,
  17.8 s; h_scale 3 + max_edge 40: 91.6k DOF, 94 iterations (L 10.05 pH with port extension: lead mismatch).
- 2026-10-21 20:0x PDT EM-4 order 2 line run, 145,148 DOF, 1 / 10 / 50 / 100 GHz: L 9.0964 / 9.0960 / 9.0879 / 9.0627 pH,
  C1 9.6522 / 9.6527 / 9.6647 / 9.7027 fF, S11 -52.178 / -32.183 / -18.301 / -12.565 dB, S21 -0.0002 / -0.0040 /
  -0.0720 / -0.2633 dB; 61 iterations; 19-20 s + 11.5 s per frequency; peak 2.22 GB; port Z 42.42 vs 43.32 (-2.1 %).
- 2026-10-21 20:0x PDT Lumped ports (`lumped.mjs`): parallel plate exact match (order 2 |S11| <= 8.1e-8); microstrip
  vs wave port S21 within 0.0015 / 0.0044 dB at 5 / 20 GHz, 0.12 dB at 50 GHz (port parasitics).
- 2026-10-21 20:1x PDT PROM (`prom.mjs`): stub microstrip 12 samples, 3.4e-8 over 31 points; EM-4 order 1 21 points:
  4 samples per operator, 1.65e-10, 58 s vs 270 s.
- 2026-10-21 20:1x PDT em2d port-Z refinement study and `portZ2d` change (cells 4 -> 32, stop at 5e-4).
- 2026-10-21 20:2x PDT EM-5a reduced port-Z study (hr_si): order 1 / 2 base 53.92 / 65.97 ohm; z-graded order 2 67.28
  (1.03M DOF); + h_scale 0.5 68.24 (2.16M DOF); em2d 68.896.
- 2026-10-21 20:3x PDT AMG (`amg.mjs`) standalone: 3D Laplacian 27k / 64k nodes PCG 10-12 iterations, anisotropic
  (100:1) 19; coarse-level strength threshold 0 (theta only on the finest level) fixed a stall. AMS (`ams.mjs`)
  written, not wired.
- 2026-10-22 Paused for the commit (coordinator): AMS unwired with status headers, NOTICE lists all adapted files,
  DevLog-014 updated (results, state, next steps). Palace clone stays in git-ignored `cache/third_party/palace`
  (`git check-ignore`: .gitignore `cache/`).
- 2026-10-22 00:20 PDT Engine suite `cd engine && nice -n 10 npm test`: 330 / 330 pass, 257.2 s (includes the other lanes' current tests). Hand-off ready.
