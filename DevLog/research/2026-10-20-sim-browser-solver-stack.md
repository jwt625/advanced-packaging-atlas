---
title: R2 - Browser-native 3D solver stack for the packaging multiphysics harness (mesh, FEM libraries, WASM/WebGPU, scaling)
date: 2026-10-20
status: research report (nothing built; no benchmarks run)
parent: DevLog/DevLog-010-multiphysics-sim-harness-proposal.md
authors: Claude (research subagent R2)
---

# R2: browser-native 3D solver stack

Scope: heat conduction, linear thermo-elasticity (warpage/stress), and regional EM (IL, RL, crosstalk) for
CoWoS-S/L, EMIB-T, SoIC, Foveros, FCBGA, HBM in a static, dependency-free SvelteKit app hosted on GitHub Pages.
All sources retrieved 2026-10-20. Labels: **[src]** sourced (URL in Sources), **[calc]** own arithmetic shown here,
**[sym]** own symbolic fill count (see S8.1; pattern analysis only, no numeric factorization, no timings),
**[est]** estimate with stated assumption, **[unverified]** not confirmed from a primary source in this survey.

Acronyms: FEM finite element method; FDTD finite-difference time-domain; FIT finite integration technique;
MoM method of moments; PEEC partial element equivalent circuit; MTL multiconductor transmission line;
PML perfectly matched layer; CPML convolutional PML; PCG preconditioned conjugate gradient; GMG / AMG geometric /
algebraic multigrid; AMS auxiliary-space Maxwell solver (hypre); ND nested dissection; AMD approximate minimum
degree; DOF degree of freedom; SIMD single instruction multiple data; WASM WebAssembly; WGSL WebGPU Shading
Language; COOP / COEP Cross-Origin-Opener / -Embedder-Policy; COI cross-origin isolation; SAB SharedArrayBuffer;
SIBC surface impedance boundary condition; df64 double-single (two-f32) emulated precision.

## 1. Recommendation summary

Keep the EO engine's D1/D4 posture (dependency-free ES modules in a Web Worker, Node runs the same code, WASM only
behind a measured gate, no SAB), but change two things for 3D:

1. **The workhorse is not sparse direct.** In 3D, direct Cholesky fill and flops scale as ~n^(4/3) and ~n^2
   ([sym] measured exponents 1.375 and 2.01, S8.1). A CoWoS-L-class elasticity model at 0.5 mm in-plane / 40 layers
   (3.2 M DOF) needs ~70 GB of factor ([calc] S8.3). The workhorse is **matrix-free PCG + geometric multigrid on a
   structured extruded hex grid**, with z-line (column) smoothing and in-plane semi-coarsening to survive the
   25:1 to 100:1 element aspect ratios of thin package layers. The EO engine's supernodal Cholesky is reused as
   the MG coarse-grid solver, the coarse-model path (<= ~1e5 elasticity DOF), and the validation oracle.
2. **Design the data layout for WebGPU from day 1, ship it behind a gate.** Structured grids + per-layer
   materials + matrix-free element kernels are the ideal GPU workload; WebGPU now ships by default in Chrome/Edge
   desktop, Chrome Android 12+, Safari 26 (macOS/iOS), Firefox 141+ Windows and 145+/147+ macOS [src]. It is the
   only path that reaches fine models (~1.9e7 DOF) in seconds rather than minutes ([est] S8.4). WGSL has no f64
   [src: WGSL extension list has f16 only], so the GPU path is f32 inner MG/PCG inside an f64 outer Krylov /
   iterative refinement on the CPU (or df64 on GPU).

Recommended stack per physics:

| Physics | Discretization | Mesh | Solver (JS baseline, ships first) | Accelerator (behind gate) | Desktop reference |
|---|---|---|---|---|---|
| Steady/transient heat | Q1 hex (trilinear), per-layer homogenized anisotropic k | Structured extruded tensor grid from 2D floorplan + layer stack; tensor-product grading | Matrix-free PCG + GMG (z-line GS smoother, x-y semi-coarsening), supernodal Cholesky on coarse level; direct Cholesky for grids <= ~2.5e5 nodes | WebGPU f32 MG/PCG + f64 outer refinement; WASM SIMD element kernel (D4 rule) | scikit-fem (uv), CalculiX, Elmer, FEniCSx (conda) |
| Thermo-elasticity (warpage, stress) | Q1 hex + enhanced-strain / incompatible modes (statically condensed) to avoid bending locking in thin layers; or Q2 serendipity | Same grid as heat (one-way coupling, T -> thermal strain) | Same as heat, 3 DOF/node, block z-line smoother, rigid-body-mode-aware coarse level | Same | scikit-fem, CalculiX, Code_Aster, FEniCSx |
| EM, uniform line sections | 2D cross-section Nedelec mode solve (EO engine D2 already exists) -> gamma(f), Z0, coupled-mode / MTL per-unit-length; lossy metal resolved or SIBC | EO engine 2D Delaunay mesher | Existing LDL^T / complex LDL^T | - | Palace (2D/3D), openEMS, scikit-rf |
| EM, discontinuities (bump, TSV, via, bend; ~0.2-0.3 mm boxes) | Option A: FDTD (Yee, CPML, graded grid) f32; Option B: 3D first-order Nedelec FEM frequency domain, complex-symmetric LDL^T | A: tensor grid; B: tet mesh (own or Netgen-class) | B for <= ~6e4 DOF blocks (direct, 23-68 s per frequency [est]); A in a single worker for small blocks | A on WebGPU (est 1-3 Gcells/s on M4 Pro class, [est] S8.5) | openEMS (FDTD), Palace (FEM), Meep, gprMax, fdtdx |
| S-parameter post-processing | Cascade of 2-port/4N-port blocks, mixed-mode, renormalization | - | Own JS (small dense complex algebra) | - | scikit-rf |

Libraries in the shipped app: none. Pyodide-based stacks (NGSolve-in-JupyterLite, scikit-fem in Pyodide) exist
and work [src], but they are heavy, single-threaded in practice, LGPL (NGSolve/Netgen) or need SciPy's sparse
stack, and they cannot reach the GPU. They are useful as a cross-check, not as the engine.

Gates (extend EO D4; all measured on fixed configs, logged JSONL with timestamped filenames):

| Gate | Adopt when | Scope if adopted |
|---|---|---|
| G1 WASM SIMD | end-to-end solve > 2x faster than JS (D4 rule) | Element kernels, z-line solves, supernodal fronts; module bytes from the in-repo JS encoder (EO S3.10), no toolchain |
| G2 WebGPU | end-to-end >= 5x faster than JS + workers on grid B, same f64-refined answer (rel. diff <= 1e-8 on displacement), on >= 2 GPUs (Apple, one non-Apple) | Optional accelerator with automatic JS fallback; feature-detected per session |
| G3 Threads (SAB via coi-serviceworker) | worker + transferable halo exchange gives < 50 % parallel efficiency at 8 workers | Scope the service worker to `/sim/` only |
| G4 Memory64 | never in v1 (Safari has no Memory64 [src]) | - |

## 2. Platform facts (2026-10-20)

| Item | Status | Label |
|---|---|---|
| WebGPU Chromium (Chrome, Edge) | Shipping: macOS, Windows x86/x64, ChromeOS since 113; Android 12+ ARM/Qualcomm/Intel since 121 (Imagination since 139); Linux Intel Gen12+ since 144, NVIDIA Wayland since 147, others behind flag; Windows ARM64 behind flag | [src] gpuweb wiki |
| WebGPU Safari | Enabled by default in Safari 26 (macOS Tahoe 26, iOS/iPadOS 26, visionOS 26) | [src] gpuweb wiki |
| WebGPU Firefox | Windows since 141 (2025-07); Apple Silicon macOS since 145 on macOS 26+, since 147 all macOS; Linux Nightly only (ship expected 2026); Android behind flag | [src] gpuweb wiki |
| WGSL f64 | No f64 type or extension. Enable-extensions in the 2026-09-21 Candidate Recommendation Draft: f16, clip_distances, dual_source_blending, subgroups, primitive_index, subgroup_size_control | [src] W3C WGSL |
| f64 emulation | luma.gl ships df64 for WGSL/GLSL; notes WGSL reassociation/fusion can break classic double-single, uses an integer-based variant on Apple | [src] luma.gl |
| WebGPU buffer limits | Spec defaults: maxStorageBufferBindingSize 128 MiB, maxBufferSize 256 MiB; adapters often report ~2 GiB (Windows AMD/Intel/NVIDIA); some Linux/Qualcomm stay at 128 MiB; request via requiredLimits | [src] MDN, web3dsurvey |
| WASM 32-bit memory | Max 4 GiB (Chrome since M83, opt-in beyond 2 GiB in Emscripten) | [src] v8.dev |
| Memory64 | Chrome/Edge 133+, Firefox 134+, Chrome Android (155 listed); **not** Safari (through 27.1) or iOS Safari | [src] caniuse |
| WASM fixed SIMD | Chrome 91+, Firefox 89+, Safari 16.4+ | [src] Emscripten docs |
| WASM relaxed SIMD | Chrome 114+, Firefox 146+; Safari not by default | [src] caniuse |
| Threads / SAB | Requires COI (COOP + COEP). GitHub Pages cannot set headers | [src] coi-serviceworker |
| coi-serviceworker | MIT; injects COOP/COEP via service worker; reloads the page on first visit; must be a separate same-origin file (no CDN, no bundling); HTTPS or localhost; COEP credentialless by default, degrades to require-corp | [src] |
| Document-Isolation-Policy | Chrome 137+ header alternative to COOP/COEP; still a header, so not settable on GitHub Pages; other browsers [unverified] | [src] Chrome blog |
| iOS Safari WASM memory | WebKit bug 269777 (2024-02, iOS 17): ~1 GB on first load, 300-500 MB after reload, 28 MB in one iPhone Xs case; closed as duplicate of a fragmentation "MegaBug"; no fix version listed | [src] |
| Mobile Chrome WASM memory | Report of ~4 GB reliably on a Redmi Note 10 5G (Chrome 121); a counter-report cites ~500-700 MB in practice due to address-space fragmentation | [src] WebKit bug threads |
| JS ArrayBuffer max | MDN: 2^33 bytes (8 GiB) on 64-bit (Firefox 89+); Chrome exact cap [unverified] | [src] MDN |
| Dev machine | Apple M4 Pro: 273 GB/s unified memory, up to 14 CPU cores (10P + 4E), up to 20 GPU cores | [src] MacRumors, Low End Mac |

Design budgets that follow [est]: desktop working set <= 1.5-2 GB per tab (stay well inside wasm32 4 GiB and
leave headroom for three.js); iOS/Android <= 300 MB (anchored on WebKit 269777); GPU working set <= 1 GB with
every individual buffer <= 256 MiB so no raised limits are needed for grids up to C (S8.4).

Notes:
- COI side effects: every cross-origin subresource needs CORP/CORS (or credentialless). The atlas also serves
  `/explore` and figure pages; register the service worker only under `/sim/` so the rest of the site is
  unaffected. Safari behaviour of credentialless COEP inside coi-serviceworker [unverified].
- GPU watchdog: long single dispatches can trigger device loss on some OS/drivers [unverified per platform].
  Kernels must be chunked (one V-cycle level or N FDTD steps per submit) and must handle `device.lost`.

## 3. 3D mesh generation in the browser

Packaging geometry is overwhelmingly axis-aligned boxes (substrate, interposer, dies, HBM stacks, mold, underfill,
lid, stiffener) plus arrays of cylinders (C4, micro-bumps, TSVs, BGA balls, vias) that thermal/mechanical models
homogenize into anisotropic layers (R1/R4 own the homogenization).

| Option | Fit for packaging | Effort | Licence | Browser status | Label |
|---|---|---|---|---|---|
| **Structured extruded tensor-product hex grid** (x/y breakpoints = all rectangle edges + grading; z breakpoints = layer interfaces) | Exact for boxes; cylinders homogenized; conforming at every material interface; trivially GPU-friendly; z-columns enable line smoothers | Low (hundreds of lines) | Own code | Pure JS | [est] |
| Tensor grid with local in-plane grading only | Fine resolution under die/HBM edges and corners, coarse elsewhere; grading propagates as full lines (cost: "tartan" over-refinement) | Low | Own | Pure JS | [est] |
| Non-conforming octree / quadtree-in-plane with hanging nodes (2:1 balance) | Removes tartan cost; local corners and bump fields | Medium-high: hanging-node constraints, MG transfer on non-conforming grids | Own | Pure JS | [est] |
| Prism extrusion of the EO 2D Delaunay mesh (triangles x z-layers) | Non-rectangular floorplans, round features in plan view (TSV/bump cross-section, keep-out rings) | Medium (reuse EO mesher) | Own | Pure JS | [est] |
| TetGen | General tets, quality, constrained | Port with Emscripten | AGPL-3.0 (or commercial from WIAS) | No WASM build found | [src] licence |
| Gmsh | General CAD + tets/hex | Port is heavy (OpenCASCADE) | GPL-2.0+ with Gmsh exception | No WASM build found; PyPI wheel 4.15.2 incl. macOS arm64 (desktop only) | [src] |
| fTetWild | Robust tets from dirty surfaces | Port; needs GMP | MPL-2.0 | No WASM mention | [src] |
| CGAL 3D mesh generation | Quality tets, sizing fields | Port; Boost/GMP | Mostly GPL-3 (kernel LGPL-3) or commercial | No WASM build found | [src] |
| Netgen | Tets, OCC geometry | Already compiled to WASM inside NGSolve-in-JupyterLite (Pyodide) | LGPL-2.1 | Exists via Pyodide [src]; standalone WASM size [unverified] | [src] |

Recommendation: thermal/mechanical = structured extruded hex grid (plus prism extrusion when plan-view geometry is
non-rectangular). EM discontinuity blocks = tensor grid for FDTD (staircased cylinders with sub-cell
averaging) or prism extrusion for FEM; a general tet mesher is a later item, with Netgen-in-WASM the only
license-compatible prebuilt route found (LGPL obligations for a statically linked WASM module need review;
not legal advice).

## 4. FEM / linear-algebra libraries: browser feasibility

| Library | Licence | WASM / browser evidence | Fit | Verdict | Label |
|---|---|---|---|---|---|
| MFEM | BSD-3 | Serial MFEM is compiled with Emscripten inside glvis-js (BSD-3) for visualization; no solver-oriented WASM distribution found | Excellent FEM core (H(curl), partial assembly) but parallel/solver deps (hypre, MPI) absent in WASM | Possible but heavy C++ port; no prebuilt | [src] glvis-js README |
| deal.II | Apache-2.0 with LLVM exception OR LGPL-2.1+ | No WASM mention | Matrix-free GMG is a strength; large Trilinos/p4est deps | No | [src] |
| FEniCSx (DOLFINx) | LGPL-3.0 | No Pyodide/emscripten-forge package found; needs PETSc/MPI | Desktop only (conda; pip wheels still in development per forum) | No (browser); desktop reference | [src] |
| NGSolve + Netgen | LGPL-2.1 | Runs in browser via Pyodide/JupyterLite; UMFPACK/PARDISO unavailable, SuperLU via SciPy; 32-bit memory; threads "not yet perfected" | Full FEM incl. H(curl); Python-driven | Cross-check only; too heavy for the product; desktop wheel 6.2.2608 (2026-10-01) macOS universal2 | [src] |
| scikit-fem | BSD-3 | Pure-Python wheel (py3-none-any), numpy+scipy only; added `solver_iter_cg` explicitly for Pyodide (7.0.0) | Clean, small; assembly is vectorized NumPy | Works in Pyodide in principle (Pyodide load size [unverified]); slow at 1e6 DOF in WASM [est] | [src] |
| SfePy | BSD | sdist only on PyPI (2026.3, 2026-09-29); no wheels | Desktop | No (browser) | [src] |
| Elmer | GPL-2.0 / LGPL-2.1 (per badges; split per component in the licence policy) | None | Desktop reference (heat, elasticity, EM) | Desktop only | [src] |
| AMGCL | MIT, header-only C++ | No WASM build found; header-only + no mandatory deps makes Emscripten plausible [est] | Best candidate if own AMG proves too costly; smoothed aggregation with near-null-space (rigid body modes) | Candidate for G1-style WASM experiment, not v1 | [src] |
| hypre (BoomerAMG, AMS, ADS) | MIT or Apache-2.0 | No WASM found; C + MPI-centric | AMS is the reference H(curl) preconditioner; defined for curl-curl + beta mass with alpha > 0, beta >= 0 (definite) | Algorithmic reference; do not port | [src] |
| PETSc | BSD-2 [unverified, GitHub API shows NOASSERTION] | No Pyodide recipe found | Desktop | No | [src] search |
| SuiteSparse / CHOLMOD | Check, Cholesky, Partition LGPL-2.1+; Supernodal, MatrixOps, Modify GPL-2+ | One write-up compiles AMD/COLAMD/CHOLMOD with emcmake (needs BLAS/LAPACK; build errors but usable archives) | Supernodal module is GPL; EO engine already has own supernodal multifrontal | No | [src] |
| Eigen | MPL-2.0 [unverified here] | Header-only; Emscripten use common [unverified] | Sparse Cholesky (simplicial) and CG; no AMG | No added value over own code | [unverified] |
| Ginkgo | BSD-3 | Backends: reference, OpenMP, CUDA, HIP, SYCL; no WebGPU/WASM mention | GPU Krylov/AMG but not for browsers | No | [src] |
| Palace | Apache-2.0 | None; MFEM + libCEED + hypre + MPI, CUDA/HIP | Desktop EM validation | Desktop only (Spack/CMake) | [src] |
| Own JS (EO engine lineage) | Repo's own (see risk R9) | Exists: 2D Delaunay, AMD, supernodal multifrontal Cholesky ~2-2.9 G mul-add/s kernel, LDL^T, complex LDL^T, Nedelec 2D mode solver, worker pool | Direct path + coarse solves + 2D EM ports reuse as-is; 3D needs new mesh, Q1 hex kernels, GMG | **Recommended baseline** | [src] EO DevLog-023/024 |

Binary-size note: no measured WASM sizes for MFEM/AMGCL/NGSolve were found in this survey [unverified]; the own-JS
path adds only source, and a hand-encoded SIMD kernel module (EO S3.10) is a few KB [est].

## 5. WebGPU compute for sparse iterative solvers

Facts and design consequences:

- f32 only (plus optional f16). Mixed-precision FEM solvers on single-precision GPUs (f32 inner CG/MG, f64
  residual + update) were analysed by Goeddeke, Strzodka, Turek, IJPEDS 22(4) 2007 [src]. Practical scheme here:
  outer flexible CG / iterative refinement in f64 (CPU JS, or df64 on GPU), inner GMG V-cycle (or a few f32 PCG
  steps) on GPU as the preconditioner. Required outer iterations for kappa ~ 1e8-1e10 [unverified; measure].
- Matrix-free operators fit structured grids: per element, K_e is selected by material ID (per layer, per
  in-plane region) from a small table; no global matrix stored. Elasticity Q1: 24 x 24 = 576 mul-add per element
  apply; heat Q1: 8 x 8 = 64 [calc]. Write conflicts: colour elements (8 colours on a hex grid) or use a
  node-centric gather (each thread owns one node and loops over its 8 elements; recomputes, no atomics) [est].
- z-line smoother maps one thread per (x, y) column: block tridiagonal solve (Thomas algorithm, 3x3 blocks for
  elasticity) along 31-61 nodes; independent columns, no atomics [est].
- Dot products in PCG need workgroup reductions; the `subgroups` WGSL extension exists [src] and helps.
- Existing WebGPU sparse/FEM solvers with published throughput: **none found** in this survey (GitHub searches for
  WebGPU FDTD / multigrid / CG / FEM returned only two 0-star WebGPU FDTD antenna sandboxes, one MIT
  (vkopitsa/webantenna), one unlicensed) [src]. A Swedish thesis reports WebGPU slower than CUDA in most
  cases, gap widening with size, for SpMV/power method [src]; no numbers transferred here.
- Throughput anchor used below: M4 Pro 273 GB/s [src]; fraction achievable from WebGPU compute 50-80 %
  [unverified assumption]; effective f32 rate on matrix-free element kernels 0.5-2 TFLOP/s on an M4 Pro-class GPU
  [unverified assumption, to be measured in G2].

## 6. EM method options in the browser

Physical scales [calc]: copper skin depth at 100 GHz, delta = sqrt(2 rho / (omega mu0)) with rho = 1.7e-8 ohm m
-> 0.21 um. Guided wavelength at 100 GHz: 1.60 mm in eps_r 3.5, 0.87 mm in Si (eps_r 11.9). Interposer/RDL
line width and spacing are ~0.4-2 um [assumption; R3/R5 own the real values], i.e. the mesh is
geometry-limited (um), not wavelength-limited (mm).

| Method | Strengths here | Weaknesses here | Browser fit | Label |
|---|---|---|---|---|
| FDTD (Yee) + CPML | Broadband S-parameters from one run; trivially parallel; f32 standard; GPU-proven (gprMax CUDA up to 1194 Mcells/s Kepler, 3405 Mcells/s Pascal; ~30x its OpenMP CPU solver on i7-4790K) | dt set by smallest cell (sub-um cells -> ~1e-15 s steps); staircased cylinders; unresolved skin depth needs sub-cell / SIBC conductor models for credible IL | WebGPU excellent; CPU-JS multi-worker poor without SAB (one sync per time step) | [src] gprMax; [est] |
| FIT | Same grid as FDTD, integral form, better material averaging | Same dt limit | Same as FDTD | [est] |
| FEM frequency domain, Nedelec (H(curl)) | Conformal geometry, impedance BC for metals, per-frequency accuracy, adaptive fast sweep (Palace does this) | Complex-symmetric indefinite system: direct factorization (memory) or AMS-type preconditioner on a positive-definite surrogate (Palace `PCMatShifted`: flip the sign of the mass term; default on for driven + AMS) | Small 3D blocks only with direct; EO engine already has 2D Nedelec + complex LDL^T | [src] Palace schema, hypre AMS |
| MoM / PEEC | Only conductors + dielectric interfaces meshed; natural for package interconnect R/L/C and partial inductance | Dense matrices O(N^2) memory, O(N^3) direct; layered-media Green's functions are complex to implement; acceleration (FMM/ACA) is a research project | Possible for quasi-static RLGC extraction of small nets [est] | [est] |
| 2D cross-section mode + MTL cascade | Per-unit-length gamma, Z0 of coupled lines (IL per mm, NEXT/FEXT) at 2D cost; reuses EO D2 | Misses 3D discontinuities | Exists in EO engine | [src] EO DevLog-023 |

Desktop references for EM validation:

| Tool | Method | Licence | Install on macOS arm64 | Label |
|---|---|---|---|---|
| openEMS | EC-FDTD, UPML/Mur, lumped ports, NF2FF, SSE2 multi-threaded; Python via Cython | GPL-3.0 | Build from source (meta-repo script / CMake); Python module `pip install .` from local source | [src] |
| AWS Palace | FEM (MFEM + libCEED), driven (lumped / wave ports, adaptive sweep), eigenmode, transient, electro/magnetostatics; p-multigrid, AMG/AMS, sparse direct | Apache-2.0 | Spack or CMake (MPI, BLAS/LAPACK, C++20); macOS CI badge, no documented macOS install path | [src] |
| Meep | FDTD | GPL-2.0+ | conda-forge `pymeep` (macOS ARM binaries); no official pip | [src] |
| gprMax | FDTD (CPU OpenMP, CUDA) | GPL-3.0 | [unverified on arm64] | [src] |
| fdtdx | FDTD in JAX, multi-GPU, autodiff | MIT | `pip install fdtdx` (CPU JAX on macOS [est]) | [src] |
| Tidy3D (client) | FDTD (cloud) | LGPL-2.1 (client) | pip; solver is a paid cloud service [unverified pricing] | [src] GitHub |
| scikit-rf | S-parameter post-processing | BSD-3 | `pip install scikit-rf` (uv-compatible) | [src] |

## 7. Desktop reference solvers for thermal / mechanical (uv on macOS arm64)

| Tool | Licence | uv/pip on macOS arm64 | Physics | Label |
|---|---|---|---|---|
| scikit-fem 12.0.2 (2026-06-05) | BSD-3 | Yes: pure-Python wheel, numpy + scipy | Heat, elasticity (incl. thermal strain via forms), Nedelec available | [src] |
| NGSolve 6.2.2608 (2026-10-01) | LGPL-2.1 | Yes: macOS universal2 wheels, CPython 3.10-3.14 | Heat, elasticity, H(curl) EM, Netgen meshing | [src] |
| gmsh 4.15.2 (2026-03-24) | GPL-2.0+ | Yes: macosx_12_0_arm64 wheel | Meshing for the references | [src] |
| SfePy 2026.3 | BSD | sdist only; needs local C build | Heat, elasticity, thermo-elasticity | [src] |
| FEniCSx / DOLFINx | LGPL-3.0 | No official wheels yet; conda-forge recommended (M2 users report conflicts); arm64 Docker | Everything | [src] |
| CalculiX ccx 2.22 | GPL-2.0 [unverified here] | Community Homebrew tap (costerwi), tested on M2 | Coupled thermo-mechanical, the de facto open Abaqus-like reference | [src] forum |
| Code_Aster | GPL-3.0 [unverified] | No macOS arm64 route found [unverified]; Linux/containers | Thermo-mechanics incl. warpage benchmarks | [unverified] |
| Elmer | GPL-2.0 / LGPL-2.1 | macOS compile guide, no prebuilt | Heat, elasticity, EM | [src] |

Recommendation: validation scripts under `uv` use scikit-fem (primary, small, BSD) and NGSolve (second
independent code, H(curl) too); CalculiX via Homebrew as the industrial-style third reference for warpage.

## 8. Scaling estimates

### 8.1 Calibration: symbolic fill of 3D Q1 hex grids [sym]

Method: own script (scratchpad, not in any repo) built Q1 hex element patterns (8-node scalar, 24-DOF
elasticity), ordered them with a simple geometric nested dissection (node-plane separators on the longest axis,
leaves <= 64 nodes), and ran the EO engine's `analyze` (pattern only; `nnzL` and `flops = sum colCount^2`).
Multiply-adds for the numeric factorization ~ 0.5 x sum colCount^2. METIS-quality ND would do somewhat better;
AMD was 1.4-1.7x worse in fill and 2.4-3.4x worse in flops on the two cubes checked.

| Grid (elements) | DOF/node | n | nnz(A) lower | nnz(L) | fill | sum colCount^2 | max front |
|---|---|---|---|---|---|---|---|
| 16^3 | 1 | 4,913 | 61,281 | 677,890 | 11.1 | 1.42e8 | 425 |
| 24^3 | 1 | 15,625 | 202,321 | 3,515,838 | 17.4 | 1.50e9 | 925 |
| 32^3 | 1 | 35,937 | 474,305 | 11,284,659 | 23.8 | 8.13e9 | 1,617 |
| 40^3 | 1 | 68,921 | 920,241 | 27,906,306 | 30.3 | 3.04e10 | 2,501 |
| 32^3 | 3 | 107,811 | 4,160,934 | 101,454,120 | 24.4 | 2.19e11 | 4,851 |
| 64x64x8 | 1 | 38,025 | 484,625 | 7,681,707 | 15.9 | 3.06e9 | 882 |
| 128x128x8 | 1 | 149,769 | 1,927,697 | 39,486,007 | 20.5 | 2.67e10 | 1,746 |
| 256x256x8 | 1 | 594,441 | 7,689,233 | 195,505,227 | 25.4 | 2.25e11 | 3,474 |
| 64x64x16 | 1 | 71,825 | 948,513 | 23,702,946 | 25.0 | 1.85e10 | 1,666 |
| 96x96x12 | 1 | 122,317 | 1,606,297 | 39,616,906 | 24.7 | 3.19e10 | 1,898 |
| 96x96x24 | 1 | 235,225 | 3,166,129 | 122,550,855 | 38.7 | 2.02e11 | 3,650 |
| 128x128x16 | 1 | 282,897 | 3,772,961 | 126,086,170 | 33.4 | 1.71e11 | 3,298 |
| 128x128x32 | 1 | 549,153 | 7,463,489 | 394,045,682 | 52.8 | 1.11e12 | 6,402 |
| 192x192x24 | 1 | 931,225 | 12,617,521 | 647,497,815 | 51.3 | 1.86e12 | 7,250 |

Fits [calc]:
- Fixed aspect (in-plane : thickness = 4): nnz(L) ~ n^1.378, flops ~ n^2.013 (96x96x24 -> 128x128x32).
  Aspect 8: n^1.373, n^2.004 (128x128x16 -> 192x192x24). The classical 3D exponents 4/3 and 2 hold even for
  flat package slabs once the thickness has >= 8-16 element layers.
- Cubes: nnz(L) ~ 9.5-9.9 n^(4/3), sum colCount^2 ~ 6.3-6.4 n^2 (scalar). 3 DOF/node on the same grid:
  nnz(L) x 9.0, flops x 27.0 (32^3: 101.5e6 / 11.28e6; 2.19e11 / 8.13e9), i.e. per-DOF constants ~20 and ~19.
- Very thin slabs (8 layers) behave 2D-like: 256x256x8 has fill only 25.

Time model [est]: EO engine supernodal factor at 2 G mul-add/s in JS (DevLog-024 kernel 2.6-2.9 G/s; dense
kernels ~75 % of factor time); WASM SIMD whole-factor gain 2.2x estimated (EO S3.10). Memory: 8 B per f64
factor entry (complex: 16 B), excluding indices and relaxed-amalgamation zeros.

### 8.2 Model sizes for a CoWoS-L-class package [calc, geometry assumed]

Assumption (R5 owns real geometry): 80 x 80 mm substrate, 30-60 homogenized layers through ~3-4 mm total
height (substrate build-up + core, BGA layer, C4/underfill, interposer + RDL, micro-bump layer, dies/HBM, mold,
TIM, lid). Uniform in-plane spacing h; one or more elements per homogenized layer.

| Grid | Elements | Nodes | Heat DOF | Elasticity DOF | Heat apply mul-add | Elasticity apply mul-add | f64 vector (elast.) |
|---|---|---|---|---|---|---|---|
| A: h = 1 mm, 80x80x30 | 192,000 | 203,391 | 2.0e5 | 6.1e5 | 1.23e7 | 1.11e8 | 4.9 MB |
| B: h = 0.5 mm, 160x160x40 | 1,024,000 | 1,062,761 | 1.06e6 | 3.19e6 | 6.55e7 | 5.90e8 | 25.5 MB |
| C: h = 0.25 mm, 320x320x60 | 6,144,000 | 6,285,501 | 6.29e6 | 1.89e7 | 3.93e8 | 3.54e9 | 151 MB |

Element aspect ratios: h = 0.5 mm against 10-50 um layers gives 10:1 to 50:1 [calc]. Trilinear hexes lock in
bending at such ratios (standard FEM behaviour; warpage is a bending response) [est]: use incompatible-modes /
enhanced-strain Q1 (internal DOF condensed per element, no global DOF increase) or quadratic serendipity
(~4x global DOF for the same elements [est]). Tensor-product grading (fine only near die/HBM edges) can cut
grid C node counts several-fold [est].

### 8.3 (a) Sparse direct Cholesky in JS/WASM [sym + calc]

| Case | n | nnz(L) | Factor memory (f64) | Mul-add | JS @ 2 G/s | WASM SIMD (2.2x) | Verdict |
|---|---|---|---|---|---|---|---|
| Heat 64x64x8 (h 1.25 mm, 8 layers) | 38,025 | 7.7e6 | 61 MB | 1.5e9 | 0.8 s | 0.35 s | Interactive |
| Heat 128x128x8 | 149,769 | 3.9e7 | 316 MB | 1.3e10 | 6.7 s | 3 s | OK desktop |
| Heat grid A (from 96x96x24, n^1.375, n^2) | 2.0e5 | 1.0e8 | 0.8 GB | 7.6e10 | 38 s | 17 s | Desktop only, slow |
| Heat grid B (from 128x128x32) | 1.06e6 | 9.8e8 | 7.8 GB | 2.1e12 | 17 min | 8 min | Exceeds wasm32 |
| Elasticity 64x64x8 | 1.14e5 | 6.9e7 | 0.55 GB | 4.1e10 | 21 s | 9 s | Coarse/validation only |
| Elasticity 64x64x16 | 2.15e5 | 2.1e8 | 1.7 GB | 2.5e11 | 125 s | 57 s | Marginal |
| Elasticity grid A | 6.1e5 | 9.0e8 | 7.2 GB | 2.0e12 | 17 min | 8 min | Exceeds wasm32 |
| Elasticity grid B | 3.19e6 | 8.8e9 | 70 GB | 5.6e13 | 7.8 h | - | Impossible |

Conclusion: direct is the coarse-model, coarse-grid-solver and oracle path; the factor of an elasticity model
above ~1.5e5 DOF does not fit the desktop budget.

### 8.4 (b) PCG + GMG in JS/WASM and (c) WebGPU matrix-free [est]

Assumptions (all to be measured in G0-G2):
- Matrix-free element apply in JS: 1-2 G mul-add/s per worker (below the 2.6-2.9 G/s of the long-column dense
  kernel because of gather/scatter).
- One PCG iteration with a V-cycle (1 pre + 1 post z-line Gauss-Seidel sweep, residual, transfers; x-y
  semi-coarsening so coarse levels add 1 + 1/4 + 1/16 ... = 4/3) ~ 6 fine-grid apply-equivalents.
- Iterations to 1e-8 relative residual: heat 15-40, elasticity 20-60 (high-contrast materials: k 0.2-400 W/m/K,
  E ~3-200 GPa [assumption; R4 owns values]). Unverified until measured; plain point smoothers would be far worse
  at 10:1-50:1 aspect ratios.
- 8 workers, transferable halo exchange (grid B elasticity halo per x-y cut: 161 x 41 x 3 x 8 B = 158 KB [calc]),
  parallel efficiency 50-75 % -> speedup 4-6.
- WebGPU: f32, 0.5-2 TFLOP/s effective (2 flops per mul-add); outer f64 refinement 3-5 residuals.

| Case | Apply (JS, 1 worker) | Solve, JS 1 worker | JS 8 workers | WebGPU inner (f32) | WebGPU outer f64 residuals | Working set |
|---|---|---|---|---|---|---|
| Heat A (2.0e5) | 6-12 ms | 0.5-3 s | 0.1-0.7 s | < 0.01 s | CPU, negligible | < 30 MB |
| Heat B (1.06e6) | 33-66 ms | 3-16 s | 0.5-4 s | 0.01-0.06 s | CPU 3-5 x 33-66 ms | ~100 MB |
| Heat C (6.3e6) | 0.2-0.4 s | 18-94 s | 3-24 s | 0.04-0.4 s | CPU 0.6-2 s total | ~0.6 GB |
| Elasticity A (6.1e5) | 55-110 ms | 7-40 s | 1-10 s | 0.01-0.16 s | CPU 0.2-0.6 s | ~80 MB |
| Elasticity B (3.19e6) | 0.3-0.6 s | 36-210 s | 6-52 s | 0.07-0.85 s | CPU 1-3 s, or GPU df64 | ~0.3-0.5 GB |
| Elasticity C (1.89e7) | 1.8-3.5 s | 3.5-21 min | 35-320 s | 0.4-5 s | GPU df64 (CPU would be 5-18 s) | ~1.5-2 GB CPU / ~1 GB GPU |

Arithmetic example (elasticity B, JS 1 worker): 5.9e8 mul-add / (1-2e9 /s) = 0.3-0.6 s per apply; x 6 per
iteration = 1.8-3.5 s; x 20-60 iterations = 36-210 s. WebGPU: 1.18 GFLOP per apply / (0.5-2e12) = 0.6-2.4 ms;
x 6 x 20-60 = 0.07-0.85 s; memory traffic per apply ~13 MB in + 13 MB out (f32) + 4 MB material IDs = ~30 MB,
0.1-0.2 ms at 150-220 GB/s, so element kernels are compute-bound on GPU [calc]. Grid C GPU vectors are 76 MB
each (f32), under the 256 MiB default maxBufferSize [calc + src].

Transient heat: backward Euler, one warm-started solve per step (~5-15 iterations [est]); 100 steps on grid B is
~0.3-2.5 min in JS workers (100 x 5-15 x 6 x 33-66 ms / 4-6), seconds on WebGPU [est]. Process-sequence warpage (R1: reflow, cure steps, element
birth/death) multiplies these by the number of load steps.

Reading: JS + workers covers grids A-B interactively for heat and A (B in < 1 min) for elasticity; grid C
elasticity is WebGPU-only for interactive use. This supports "JS first, WebGPU gated", with the GPU path planned
in the data layout from the start.

### 8.5 EM region: 2 mm x 0.5 mm x 0.3 mm channel at 50-100 GHz [calc + est]

Assumptions: 2 differential pairs (or GSSG + neighbours) with 2 um lines, graded grid: 5 um along propagation
(x), 0.5 um minimum transverse cells near conductors grading to ~20 um; 8-cell CPML on each face.

FDTD:
- Grid ~ 400 x 120 x 100 interior, 416 x 136 x 116 = 6.56e6 cells with PML [calc].
- Courant dt = 1 / (c sqrt(2/(0.5 um)^2 + 1/(5 um)^2)) = 1.18e-15 s [calc].
- Duration: transit 2 mm at n_eff ~1.9 is ~12.5 ps; ~10 transits for ring-down = 125 ps [assumption] ->
  1.06e5 steps; 7.0e11 cell-updates [calc].
- Throughput: ~75 B/cell-update implied by the Microwave Journal bound (68 GB/s -> ~900 Mcells/s) [src + calc];
  M4 Pro 273 GB/s at 50-80 % -> 1.8-2.9 Gcells/s; range used 1-3 Gcells/s [est].
- WebGPU: 230-700 s (4-12 min). JS single worker at 50-150 Mcells/s [est; gprMax's 4-core 2014 CPU was ~30x
  below 3405 Mcells/s, i.e. order 100 Mcells/s]: 1.3-3.9 h. Multi-worker CPU FDTD without SAB pays a message
  round-trip every step (1e5 steps), so G3 matters for this path only.
- Memory: ~30 B/cell (6 f32 fields + material index) + CPML auxiliaries -> ~200-300 MB [est].
- 1 um minimum cells: dt 2.34e-15 s, ~4x fewer cells, ~8x fewer cell-updates -> ~30-90 s on WebGPU [calc],
  at the cost of 2 cells across a 2 um line and no skin-depth resolution (0.21 um at 100 GHz), so IL needs a
  sub-cell conductor/SIBC model to be credible [est].

FEM frequency domain, full 3D channel: the ND top separator is a full cross-section. For a cross-section with
w ~ 1e4 edge DOF, one dense complex front costs >= w^3/3 x 4 real mul-adds = 1.3e12 -> >= 11 min per frequency in
JS [calc]. Not viable; uniform sections belong to the 2D mode + MTL path (S6).

FEM, 3D discontinuity block (~0.2 x 0.2 x 0.3 mm around a bump/TSV/via), first-order Nedelec on tets:
- DOF ~ edges ~ 1.2 x tets (Euler: E ~ V + T with T ~ 5-6 V) [calc]; second order ~ 6.4 x tets (2 per edge +
  2 per face, F ~ 2T) [calc].
- Direct complex LDL^T with the calibrated constants (nnz(L) 10-20 n^(4/3), sum colCount^2 6.3-19 n^2;
  edge-element graphs assumed between scalar and 3-DOF hex graphs [assumption]):

| Block DOF | Tets (order 1) | nnz(L) | Factor memory (complex) | Real mul-add per frequency | JS @ 2 G/s | WASM SIMD |
|---|---|---|---|---|---|---|
| 6e4 | 5e4 | 2.4-4.7e7 | 0.38-0.75 GB | 4.5e10-1.4e11 | 23-68 s | 10-31 s |
| 2.4e5 | 2e5 | 1.5-3.0e8 | 2.4-4.8 GB | 7.3e11-2.2e12 | 6-18 min | 3-8 min |

  With an adaptive/rational fast sweep needing ~10-20 factorizations [assumption], the 6e4-DOF block costs
  ~4-23 min in JS; the 2.4e5 block needs an iterative AMS-type solver (Palace pattern) or is desktop-only.
- FDTD for the same block: 200^3 = 8e6 cells at 1 um, dt 1.93e-15 s, 100 ps -> 5.2e4 steps, 4.2e11
  cell-updates -> ~2-7 min on WebGPU at 1-3 Gcells/s [calc + est]. Low-frequency S-parameters (< ~10 GHz)
  need longer runs or extrapolation (frequency resolution ~ 1/T) [est].

EM conclusion: uniform interconnect = 2D modal (exists) + MTL; discontinuities = small 3D blocks, FEM-direct up
to ~6e4 DOF in JS/WASM, FDTD on WebGPU for larger or broadband blocks; cascade in a JS S-parameter module.
R3 owns the method choice; this section only bounds cost.

## 9. Implementation-order view (stack only; tranche planning is in DevLog-010)

1. Extruded tensor-grid mesher (2D floorplan rectangles + layer stack -> breakpoints, grading, material IDs).
2. Q1 hex heat: matrix-free apply, Jacobi-PCG first, then GMG with z-line smoother and x-y semi-coarsening;
   coarse level = EO supernodal Cholesky; direct path for small grids as oracle.
3. Same for elasticity (3 DOF, thermal strain load, enhanced-strain element, rigid-body constraints).
4. G0 measurements (iterations, G mul-add/s, worker efficiency) on grids A/B; G1 WASM SIMD kernel.
5. WebGPU backend for apply + smoother + transfers + reductions; f64 outer loop; G2 measurement.
6. EM: reuse 2D Nedelec ports, MTL cascade, S-parameter module; then the 3D block solver (FEM-direct or WebGPU
   FDTD per R3).

## 10. Risks

| # | Risk | Effect | Mitigation |
|---|---|---|---|
| R1 | MG iteration counts with 1e3 material contrast and 50:1 aspect much worse than 20-60 | Elasticity B/C slow on CPU | z-line + plane smoothers, operator-dependent (Galerkin) coarse operators, AMG coarse level (AMGCL-style) as fallback; measure early (G0) |
| R2 | f32 inner solves stall or outer refinement diverges for kappa ~ 1e9-1e10 | Wrong or slow GPU results | Flexible outer Krylov in f64 with GPU V-cycle as preconditioner; df64 residual on GPU; JS fallback; regression against direct oracle |
| R3 | Bending locking of Q1 in thin layers | Warpage under-predicted | Enhanced-strain / incompatible modes; Q2 serendipity option; plate-theory cross-check (R1/R6) |
| R4 | Mobile memory (iOS 300 MB-1 GB WASM; tab kills on overrun in Safari) | Crashes on phones | Mobile limited to grid A heat / coarse elasticity; size check before allocation; never rely on memory.grow failure on Safari |
| R5 | WebGPU unavailable (Firefox Linux/Android, Chrome Linux non-Intel, Windows ARM64) or device lost | No acceleration | JS path always complete; feature detection; chunked dispatch and `device.lost` handling |
| R6 | coi-serviceworker side effects (first-load reload, COEP blocking cross-origin assets) | Broken figures/fonts | Only if G3 passes; scope to `/sim/`; credentialless mode; self-host assets |
| R7 | FDTD loss accuracy with unresolved skin depth and staircased cylinders | IL wrong at 50-100 GHz | Conductor sub-cell/SIBC model; validate against Palace/openEMS on the same block; prefer 2D FEM for per-length loss |
| R8 | No published WebGPU sparse-solver throughput to anchor estimates | Estimates in S8.4/S8.5 may be off by several x | G2 measured early on 2 GPUs; publish own numbers in a DevLog |
| R9 | Licence lineage: EO engine origin is a GPL project (EO DevLog-023 lists `PlayGround/20260614_2d_eo_fem_solver` as "GPL, the engine's origin"); neither atlas repo has a LICENSE file; GPL/AGPL/LGPL deps (TetGen AGPL, Gmsh GPL, CGAL GPL, Netgen LGPL) would constrain the repo | Licence choice forced | Decide repo licence before copying engine code; keep the product dependency-free; references run out-of-tree. Not legal advice |
| R10 | Tartan over-refinement of tensor grids for many small dies/HBM edges | DOF blow-up | Graded spacing with a cap; later non-conforming in-plane quadtree with hanging nodes |

## 11. Open / unverified items (for the gate measurements, not for decisions)

- WebGPU achievable bandwidth and matrix-free FLOP rate on Apple/Intel/NVIDIA in Chrome and Safari.
- JS matrix-free Q1 element-kernel rate (assumed 1-2 G mul-add/s per worker).
- GMG iteration counts for real package stacks.
- Safari: WebGPU in workers, credentialless COEP, per-tab memory ceilings on iOS 26.
- Pyodide/NGSolve download sizes; WASM sizes for AMGCL/MFEM builds.
- Eigen, PETSc, CalculiX, Code_Aster licences were not re-verified in this survey.

## Sources (all retrieved 2026-10-20)

Platform:
- WebGPU implementation status (gpuweb wiki): https://github.com/gpuweb/gpuweb/wiki/implementation-status
- WebGPU supported in major browsers (web.dev): https://web.dev/blog/webgpu-supported-major-browsers
- WGSL Candidate Recommendation Draft 2026-09-21: https://www.w3.org/TR/WGSL/
- luma.gl GPU floating-point precision / fp64: https://luma.gl/docs/api-guide/shaders/gpu-floating-point-precision
- W3C public-gpu thread on f64 (2022-04): https://lists.w3.org/Archives/Public/public-gpu/2022Apr/0004.html
- MDN GPUSupportedLimits: https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedLimits
- web3dsurvey maxStorageBufferBindingSize: https://web3dsurvey.com/webgpu/limits/maxStorageBufferBindingSize/platform/Windows
- V8 4 GB WASM memory (2020-05-14): https://v8.dev/blog/4gb-wasm-memory
- caniuse Memory64: https://caniuse.com/wf-wasm-memory64
- caniuse relaxed SIMD: https://caniuse.com/wf-wasm-simd-relaxed
- Emscripten SIMD: https://emscripten.org/docs/porting/simd.html
- coi-serviceworker (MIT): https://github.com/gzuidhof/coi-serviceworker
- Document Isolation Policy (Chrome 137): https://developer.chrome.com/blog/document-isolation-policy
- WebKit bug 269777 (iOS WASM memory): https://bugs.webkit.org/show_bug.cgi?id=269777
- WebKit bug 221530 (Safari memory.grow kills tab): https://bugs.webkit.org/show_bug.cgi?id=221530
- MDN invalid array length (ArrayBuffer max): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Invalid_array_length
- Apple M4 Pro 273 GB/s: https://macrumors.com/2024/10/29/apple-announces-m4-pro-chip
- M4 Pro core counts: https://lowendmac.com/2025/apple-silicon-m4-pro-chip-specs/

Meshing:
- TetGen licensing FAQ: https://wias-berlin.de/software/tetgen/FAQ-license.jsp
- Gmsh licence (Debian copyright): https://metadata.ftp-master.debian.org/changelogs/main/g/gmsh/stable_copyright
- Gmsh exception (SPDX): https://spdx.org/licenses/Gmsh-exception.html
- gmsh on PyPI: https://pypi.org/project/gmsh/
- fTetWild: https://github.com/wildmeshing/fTetWild
- CGAL licence: https://www.cgal.org/license.html
- NGSolve in JupyterLite: https://docu.ngsolve.org/ngs24/myaddons/lite.html
- NGSolve forum announcement: https://forum.ngsolve.org/t/ngsolve-in-jupyterlite/2452

FEM / linear algebra:
- MFEM: https://github.com/mfem/mfem
- glvis-js (MFEM compiled with Emscripten): https://github.com/GLVis/glvis-js
- deal.II licence: https://raw.githubusercontent.com/dealii/dealii/master/LICENSE.md
- DOLFINx: https://github.com/fenics/dolfinx
- DOLFINx pip wheel discussion: https://fenicsproject.discourse.group/t/potential-of-a-pypi-package/19440
- DOLFINx macOS conda issue: https://fenicsproject.discourse.group/t/conda-fenicsx-installation-error-in-macos-m2/14929
- scikit-fem on PyPI: https://pypi.org/project/scikit-fem/
- SfePy on PyPI: https://pypi.org/project/sfepy/
- NGSolve on PyPI: https://pypi.org/project/ngsolve/
- Pyodide (pure-Python wheels via micropip): https://pyodide.org/en/314.0.6/_sources/project/about.md
- Elmer: https://github.com/ElmerCSC/elmerfem
- AMGCL docs: https://amgcl.readthedocs.io
- AMGCL paper: https://arxiv.org/pdf/1811.05704
- hypre: https://github.com/hypre-space/hypre
- hypre AMS: https://hypre.readthedocs.io/en/latest/solvers-ams.html
- CHOLMOD licence: https://raw.githubusercontent.com/DrTimothyAldenDavis/SuiteSparse/dev/CHOLMOD/Doc/License.txt
- CHOLMOD to WASM write-up: https://cprimozic.net/notes/posts/compiling-boundary-first-flattening-to-wasm/
- Ginkgo: https://github.com/ginkgo-project/ginkgo
- pyodide-build: https://pyodide-build.readthedocs.io/en/latest/
- CalculiX Homebrew tap thread: https://calculix.discourse.group/t/homebrew-packages-for-ccx-and-cgx-for-macos/2729
- Goeddeke, Strzodka, Turek (mixed precision FEM, IJPEDS 2007): https://wwwold.mathematik.tu-dortmund.de/papers/GoeddekeStrzodkaTurek2006.pdf
- WebGPU vs CUDA thesis (cluster of browsers): https://www.diva-portal.org/smash/get/diva2:1674447/FULLTEXT01.pdf

EM:
- AWS Palace: https://github.com/awslabs/palace
- Palace config schema (PCMatShifted, PCMatReal, AMS): https://github.com/awslabs/palace/blob/main/scripts/schema/config-schema.json
- openEMS: https://github.com/thliebig/openEMS
- Meep installation: https://meep.readthedocs.io/en/latest/Installation/
- Meep licence: https://meep.readthedocs.io/en/latest/License_and_Copyright/
- gprMax: https://github.com/gprMax/gprMax
- gprMax CUDA engine (Warren et al., CPC 237, 2019): https://repository.uwl.ac.uk/id/eprint/5755/
- gprMax CUDA dataset description (Mcells/s figures): https://data.mendeley.com/datasets/kjjm4z87nj/1
- fdtdx: https://github.com/ymahlau/fdtdx
- Tidy3D client: https://github.com/flexcompute/tidy3d
- scikit-rf: https://github.com/scikit-rf/scikit-rf
- EMPIRE XPU / FDTD bandwidth bound (Microwave Journal, 2015-04-15): https://microwavejournal.com/articles/24173-empire-xpu-710-xpu-3d-em-solver
- WebGPU FDTD antenna sandbox (MIT): https://github.com/vkopitsa/webantenna

Internal:
- eo-modulator-atlas DevLog-023 (decisions D1-D8) and DevLog-024 (S3.6 supernodal, S3.10 WASM gate).
