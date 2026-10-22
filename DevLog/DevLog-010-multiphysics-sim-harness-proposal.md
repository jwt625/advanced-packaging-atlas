---
title: Multiphysics simulation harness for advanced packaging - proposal and tranche plan (EM, thermal, thermo-mechanical)
date: 2026-10-20
status: proposal (research and audit done 2026-10-20; nothing built; awaiting answers to the open questions)
scope: future engine/, app/src/routes/sim/, sims/ configs, materials library, validation suite
authors: Claude (at Wentao Jiang's request)
---

# DevLog-010: multiphysics simulation harness (proposal)

## Request (Wentao, 2026-10-20)

- Propose and scope a simulation harness for advanced packaging, analogous to the eo-modulator-atlas 2D
  cross-section simulator, but 3D.
- Three physics, at minimum:
  1. EM waves: insertion loss (IL), return loss / reflection, crosstalk (xtalk).
  2. Thermal: temperature distribution and gradients.
  3. Solid mechanics with thermal expansion: warpage, strain and stress distributions.
- Research how COMSOL implements thermo-mechanical coupling, existing packages, and a UI/UX similar to COMSOL and
  to the EO modulator `/sim` workbench. Browser native as much as possible; optimize performance iteratively.
- At least one canonical sim per packaging type/category, with configurable variants of the most popular ones
  (CoWoS-S/L, EMIB-T): die size, array size, HBM count, etc.
- EM can be regional and representative: mesh only around the signal path, with proper PML.
- Deliverable: phases/tranches of implementation steps with effort (materials gathering, canonical config
  extraction, engine development, validation set curation, ...). Research and proposal delegated to subagents.

## Research reports (`DevLog/research/`)

Seven research subagents launched 2026-10-20 (project cap 7). Each writes one report; no other files touched.

| # | Topic | Report |
|---|---|---|
| R1 | COMSOL / industry methods (thermal expansion coupling, homogenization, process sequence, RF ports/PML) | `2026-10-20-sim-comsol-industry-methods.md` |
| R2 | Browser-native solver stack (mesh, FEM libs, WASM/WebGPU, scaling estimates) | `2026-10-20-sim-browser-solver-stack.md` |
| R3 | EM regional method and canonical EM cases | `2026-10-20-sim-em-regional-method.md` |
| R4 | Materials library scope and schema | `2026-10-20-sim-materials-library-scope.md` |
| R5 | Canonical configs and parameter schema (CoWoS-S/L, EMIB-T first) | `2026-10-20-sim-canonical-configs.md` |
| R6 | Validation set (thermal, thermo-mechanical; EM brief) | `2026-10-20-sim-validation-set.md` |
| R7 | UI/UX and 3D result visualization, reuse plan | `2026-10-20-sim-ui-ux-visualization.md` |

All seven finished 2026-10-20 (R7, R4, R3, R6, R2, R5, R1 in that order).

## Findings that shape the plan (details and sources in the reports)

| Topic | Finding | Report |
|---|---|---|
| Geometry | Every `config/package3d` template part is an axis-aligned box. A rectilinear grid aligned to all part boundaries replaces CAD + tet meshing for thermal and mechanics. Bump, TSV, via and RDL fields become homogenized layers. | R5, R2 |
| Model size | CoWoS-L-class quarter model ~0.45 M DOF (R5 arithmetic). Full 80 x 80 mm package: grid A (1 mm, 30 layers) 0.2 M heat / 0.6 M elasticity DOF; grid B (0.5 mm, 40 layers) 1.06 M / 3.2 M. | R5, R2 |
| Direct solve limit | Measured symbolic fill on 14 hex grids up to 931k nodes: factor ~n^1.375, work ~n^2.01. Direct is practical to ~2e5 heat nodes / ~1e5 elasticity DOF. Grid-B elasticity would need ~70 GB of factor. | R2 |
| Workhorse solver | PCG + geometric multigrid (z-line smoother, x-y semi-coarsening) on the structured grid. The EO supernodal Cholesky stays as coarse solver and oracle. COMSOL's own iterative option is GMG for quadratic and SA-AMG for linear elements, with line smoothing for slender geometry. | R2, R1 |
| Elements | COMSOL: quadratic serendipity displacement, temperature one order lower. R2: trilinear hex locks in bending at the 25:1-100:1 aspect ratios of package layers; needs incompatible modes or Q2. | R1, R2 |
| Coupling | Thermal stress is a one-way quasi-static chain; segregated thermal-then-mechanics matches fully coupled where it applies. | R1 |
| CTE | Secant CTE with the dataset's strain-free temperature; re-base in closed form to each domain's stress-free temperature. Convert tangent data once at load time. Only one cached paper states the CTE kind ("instantaneous", ectc51846.2026.00103 p.4, a cached paper not yet in the DB). | R1, R4 |
| Process sequence | Activation per step (domains, stress-free T, load, BCs). Elastic strain is reset at activation. COMSOL scales inactive stiffness by 1e-5; dropping inactive DOFs avoids that conditioning problem. Validation deck: COMSOL model 273. | R1 |
| Warpage | Free body with rigid-motion suppression (3-2-1, zero reactions) or quarter symmetry plus one z point. Remove the best-fit plane; always state sign convention and viewing side (JEITA ED-7306). | R1, R7 |
| Mold compound | Elastic EMC overpredicts: 2.247 mm elastic, 1.473 mm viscoelastic, 0.887 mm measured (cited FOWLP case). Absolute warpage of molded packages needs Prony + WLF; elastic is trend-only. | R1 |
| Homogenization | Rule of mixtures is 23.2 % low on laminate in-plane E versus +0.9 % for a trace-mapped RVE. Use RVE FEM for 9 orthotropic constants; per-layer metal-fraction grids (Ansys trace-mapping style); submodels for local stress. | R1 |
| EM method | 2D cross-section multiconductor RLGC(f) + exact MTL cascade for uniform runs (2 mm 3-line 2/2 um channel: ~3e4 triangles versus ~2.8e6 DOF in 3D). 3D FEM only for discontinuities, with wave ports from the 2D solver and Redheffer cascade. The same flow appears in a DB paper (`ectc51846.2026.00199-b`). | R3, R1 |
| EM conductors | Cu skin depth 2.09 um at 1 GHz, 0.66 um at 10 GHz, 0.21 um at 100 GHz. SIBC is invalid below ~3 skin depths, i.e. under 9.8 / 39 / 61 GHz for 2 / 1 / 0.8 um lines. HBM and UCIe bands therefore need volumetric conductors in 2D. | R3, R1 |
| EM boundary | Regions are electrically small (lambda_g 1.65 mm at 100 GHz, eps_r 3.3). Default is a ground-tied PEC box whose first resonance stays above 1.5 f_max, plus PML on open faces. PML layer count: openEMS uses 6-20 cells (8 default) (R3); R1 gives at least 8 for polynomial stretching, carried over from COMSOL Acoustics guidance (inference). Cutout rules: lateral margin ~2.2-3 b (stripline; R3 gives both values) or ~10 h (microstrip); victim plus 2 aggressors per side. | R3, R1 |
| EM browser budget | R2's calibrated fill and flop constants put browser direct 3D FEM at about 6e4 DOF: 0.38-0.75 GB complex factor, 23-68 s per frequency in JS. The microbump-to-RDL block (~2.1e5 order-1 DOF) needs 2-4 GB and 4.6-14 min per frequency, so 1-5 h for an adaptive sweep. It does not fit. R3's "about 2e5 fits" was an unlabelled inference, corrected by the audit. EMIB-T bridge TSV is 3.9e5 order-1 / 2.1e6 order-2 DOF. FDTD: ~3.2e12 cell-updates for the microbump block at uniform 0.5 um (R3); R2 gives 4.2e11 at 1 um cells. | R2, R3, audit |
| Platform | WebGPU is on by default in Chrome/Edge on macOS, Windows x86/x64 and ChromeOS, partly on Linux, and behind a flag on Windows ARM64. It is also on in Safari 26 and in Firefox 141+ (Windows) / 145-147+ (macOS). There is no f64 in WGSL. wasm32 is limited to 4 GiB; no Memory64 in Safari; iOS WASM memory is unreliable (300 MB-1 GB). coi-serviceworker can enable threads on GitHub Pages. No WASM build was found for TetGen, gmsh, deal.II, DOLFINx, PETSc, hypre or AMGCL. | R2 |
| Rendering | Stay on three.js WebGLRenderer, already used by `/3d`, with one custom field ShaderMaterial. In r186 the official manual still calls WebGPURenderer experimental and says it does not support ShaderMaterial. A worker marching-tets kernel produces slices and isosurfaces; picking uses an ID buffer. vtk.js, Babylon, deck.gl and regl were rejected. | R7 |
| UI reuse | About 10 EO workbench modules copy almost unchanged: colormap, colorbar, ticks, LinePlot, Splitter, Tooltip, CSV export, sweep values, worker pool. Tree, settings, results model and plot-group settings generalize to 3D. Expressions, units and YAML splice import the GPL-3.0-or-later EO engine. | R7 |
| Materials | Public primary sources exist for Si (Hall 1967, Okada-Tokumaru 1984, Glassbrenner-Slack 1964, Krupka 2006), Cu, solder (NIST, Anand 1985, Motalab 2012). For EMC, ABF, BT core and low-k no usable public datasheet values were read: the ABF brochure link is dead, and a Henkel underfill sheet was located but not read. 33 of 296 cached papers carry property tables (17 FE input tables). DB papers model Si with E = 120-170 GPa, so the library should store cubic Cij. | R4 |
| Validation, thermal / mechanical | 16 tier-A closed forms with expected values (e.g. CLT 3-layer curvature 1.1928 1/m; Lame TSV p = 145.0 MPa). NAFEMS LE1/LE10/LE11/T1-T4 targets are public via the Abaqus/Altair/FeenoX manuals. Warpage is the strongest DB class (729 rows in um/mm); stress is weak (134 of 181 rows normalized). | R6 |
| Validation, by family | R6 warpage ranking, by completeness of inputs:<br>1. ectc51909.2023.00155-d/-a: JOINT2 50 mm Si interposer, quarter model; material table with E1/E2 and alpha1/2; stress-free 150 C; viscoelastic EMC in the paper.<br>2. ectc51529.2024.00155: JOINT2 120 x 120 mm; Table IV; simulated and moire-measured.<br>3. ectc.2011.5898527-b: Xilinx TSV interposer with lid; RT property table; stress-free 150 C; CoWoS-S-like.<br>5. ectc51687.2025.00027: measured coplanarity 30-200 C.<br>FCBGA ectc51687.2025.00178 has no material rows (its ABF table is in a different paper, 00148), so it is a trend case, not grade A. Measured CoWoS-L warpage: ectc51909.2023.00091-a/b. Thermal: CoWoS-R ectc51687.2025.00085 (Rjc 0.0108 C/W at 1866 W). EMIB-T has no warpage, thermal or stress row. No CoWoS or EMIB paper in the DB gives material tables, stress-free T or BCs. | R5, R6, audit |
| Validation, EM | EM-1 ABF microstrip on glass (ectc51846.2026.00389; Dk/Df 16.5-216 GHz at 3 temperatures, measured TRL IL/mm 33-200 GHz). EM-2 CPWG on Si-bridge RDL (eptc67330.2025.11392620-a). EM-3 fine-pitch crosstalk. EM-4 microbump transition (cross-solver only). EM-5 TSV GSG (ectc51909.2023.00230-a). | R3 |
| Config rules found | One reticle = 830 mm2 (TSMC footnote); DB interposers give 814-833 mm2 per reticle multiple. LSI count = HBM + SoC count on all 3 TSMC CoWoS-L TVs (derived fit, not a stated rule). | R5 |

DB defect found by the research lanes. Not edited; queued for the next ingest audit: `eptc67330.2025.11392176` has a "stainless steel" layer row carrying Tg 65-75 C and E 1.9 GPa, which look like adhesive values. R3 also reported two "missing" EM rows. The audit showed both are already in the DB: `eptc67330.2025.11392620-a-e1..e7` in `electrical_interfaces.csv`, and `ectc51846.2026.00199-b-e1` together with the `pass_criterion` of `-b-m1`. R3 had searched only `metrics.csv`, so the EM case curation (D3) must also read `electrical_interfaces.csv`.

## Proposal

### Architecture decisions (proposed; record changes here)

- A1 **Engine:** a new `engine/` in this repo. Dependency-free ES modules in a Web Worker; Node runs the same code for CLI and tests (EO D1). Ported EO modules carry a header with their source path and EO commit. Extract a shared package later, once at least 5 modules are identical in both repos.
- A2 **Geometry:** generated from the `package3d` templates through parameter overrides, so `/3d` and `/sim` share one set of knobs and one provenance chain. Thermal and mechanics use a rectilinear grid aligned to every part boundary, with tensor-product grading and quarter/half symmetry when the layout allows. Cylindrical features (bumps, TSVs, pillars) are resolved only in RVE cells and submodels.
- A3 **Elements:** temperature Q1. For displacement, run a bake-off gate between Q2 serendipity (COMSOL default) and Q1 with incompatible modes (cheaper, GMG-friendly), on CLT warpage, Stoney thin film and NAFEMS LE10 accuracy per DOF and per second. The winner becomes the default; the loser stays as the reference. If Q1 with incompatible modes wins, temperature and displacement have the same order, which departs from R1's "temperature one order lower" rule. The bake-off then also has to pass a linear-through-thickness thermal-gradient bending case.
- A4 **Solvers:** the ported supernodal Cholesky for models up to ~2e5 heat / ~1e5 elasticity DOF, MG coarse levels and the oracle. PCG + GMG (z-line block smoother, x-y semi-coarsening) for the rest. Smoothed-aggregation AMG with the 6 rigid-body modes only if GMG fails on a case.
- A5 **Coupling:** one-way segregated chain: thermal (or uniform T) then mechanics. Temperature-dependent properties are re-solved at each temperature point of a warpage-vs-T study.
- A6 **Materials:** secant CTE stored with its dataset T_ref and re-based per domain. Si is cubic Cij. Every value has a basis (`datasheet | handbook | measured | paper_model_input | derived`) and alternatives. Homogenized layers are derived entries with formula and validity note.
- A7 **Process sequence:** a first-class step list (activate domains, stress-free T, temperature load, BCs) using DOF dropping, not stiffness scaling. Elastic tier first; Prony/WLF EMC and Anand solder in E8.
- A8 **EM:**
  - 2D cross-section RLGC(f) with volumetric lossy conductors, causal Djordjevic-Sarkar dielectrics and roughness, then MTL cascade, mixed-mode and Touchstone output.
  - 3D Nedelec FEM only for discontinuity blocks, with 2D-solver wave ports, PEC box plus PML, complex-symmetric LDL^T, adaptive Pade sweep and Redheffer cascade.
  - Report disagreements, resolved:
    - **Element order:** R1 (COMSOL/HFSS practice) recommends order-2 Nedelec. The browser direct budget is about 6e4 DOF, so the browser runs order 1 on blocks up to that size: single via, single bump pair, coarse transitions. Order 2 and larger blocks (the full microbump-to-RDL block at ~2.1e5 DOF, the EMIB-T TSV) run on desktop references (AWS Palace, openEMS) with the same config.
    - **Conductors:** R3 says volumetric, R1 says TBC for thin films. Both apply: volumetric in 2D, where it is cheap; in 3D blocks, TBC/IBC chosen per thickness-to-skin-depth ratio (R1), because meshing the skin depth in 3D is unaffordable.
    - **FDTD:** R2 gives 4.2e11 cell-updates at 1 um cells, R3 3.2e12 at 0.5 um. Either way it is a cross-check. WebGPU FDTD for blocks above 6e4 DOF is evaluated at gate G2. An iterative auxiliary-space (AMS-type) solver is a research spike, since R1 notes convergence trouble with PML.
- A9 **Accelerators behind measured gates** (EO D4 extended):
  - G1 WASM SIMD: adopt at more than 2x end-to-end.
  - G2 WebGPU: f32 MG/PCG inside an f64 outer refinement. Adopt at 5x or more on grid B, on at least 2 GPUs, with the same answer.
  - G3 threads via coi-serviceworker, scoped to `/sim/`.
  - No Memory64.
- A10 **Rendering:** three.js WebGLRenderer with an on-demand custom field material (LUT, scale, deformation scale, z-exaggeration, clip). Worker marching-tets kernel for slices and isosurfaces. The section face is the slice of the current expression. WebGPU port only after G2.
- A11 **Provenance and status:** three separate axes, each with its own fixed vocabulary.
  - Geometry dimensions carry `reported | derived | public | template | user` (DevLog-008 plus `public` and `user`).
  - Material values carry the A6 basis.
  - Both are shown in the UI.
  - Every sim and case carries `validation_status` (EO enum plus `measured_regression`).
  - Targets are keyed by `metric_id`.
  - Solver outputs are never committed.

### Tranches

Effort in agent-days (1 agent-day ~ 8 agent-hours). R4, R6 and R7 numbers are from those reports; the rest are coordinator estimates. All are estimates.

| Tranche | Scope | Gates (exit criteria) | Depends on | Effort |
|---|---|---|---|---|
| **T0 Decisions + scaffold** | Licence (Q1); `engine/` skeleton; `sims/SPEC.md` (config schema: params, family, geometry overrides, materials refs, physics, BCs, studies, targets); bench harness (JSONL, timestamped logs); port list | Spec reviewed; engine `node --test` and bench run on an empty engine; app `pnpm check` | Q1 | 1-2 |
| **D1 Materials** | Tier-1 library: ~30 materials, ~300 entries, ~60 T- or f-tables, 5-8 derived homogenized entries, alias map for ~720 DB material strings, 2 audits. A T0-MVP subset (12 materials, constants from DB paper inputs) comes first so E1/E2 are not blocked | Loader and schema tests; audit; every value sourced or `N/A` | T0 spec | MVP 1; tier 1 4.5-7.5 |
| **D1b Materials tier 2** | Prony + WLF for EMC and underfill, Anand for SAC305 and SnAg, Cu plasticity, cure shrinkage | Same as D1 | D1, Q4 downloads | 3-6 |
| **D2 Canonical configs** | Family parameter schema and constraint rules for CoWoS-L, CoWoS-S, EMIB-T, then FCBGA, the 120 mm and 50 mm Si-interposer peers, Xilinx TSV interposer, CoWoS-R. Knobs: die size and count, die array (nx, ny), HBM count, bridge count, interposer size, bump array size, pitch and region. Generator from package3d to sim grid plus homogenized layer assignment. Power maps. Bridge-count and HBM-placement rules. Fix the R5 sketch, which combines rigid-motion suppression with symmetry mirrors (R1: never combine) | Generator reproduces the `/3d` geometry; every dimension carries a status; constraint negative tests | T0; coordinate with the DevLog-008 SOTA template lane | 4-7 |
| **D3 Validation set** | MVP: tier A (16 cases); NAFEMS LE1, LE10, LE11, T1, T3, T4; the E2 gate warpage cases (ectc.2011.5898527-b, ectc51529.2024.00155, ectc51909.2023.00155-d); top-3 thermal DB cases; comparison harness. Full set: tier B decks, 30 tier C/D cases, 10 digitized moire curves, EM-0..EM-5 targets (reading `metrics.csv` and `electrical_interfaces.csv`) | Each case has inputs with provenance, `missing`, `assumptions`, targets by metric_id | T0 spec | MVP ~10; full 19-34; EM curation 3-5 |
| **R Desktop references** | `validation/` uv project: scikit-fem, NGSolve, gmsh, scikit-rf (uv-installable on arm64); later Palace/openEMS built from source, CalculiX (Q3) | The same tier-A/B decks run and are logged | T0, D3 | 3-5 |
| **E1 Thermal** | Structured grid builder, Q1 heat, anisotropic homogenized k, power maps, BCs (fixed T, HTC, adiabatic, thin resistive layer), direct solver then PCG + GMG, energy-balance report | Tier A thermal 6/6; NAFEMS T1/T3/T4; MMS order; energy balance | T0, D1 MVP, D2 grid (a hand-built grid can start E1 earlier), D3 MVP | 6-10 |
| **E2 Thermo-elastic** | Element bake-off (A3); thermal strain with per-domain stress-free T; cubic Si, orthotropic layers; rigid-motion suppression or symmetry (never both); derived values (raw, best-fit-plane warpage, coplanarity, von Mises, principal); warpage-vs-T study; GMG for 3 DOF/node | Patch test, CLT, Stoney, Lame TSV, NAFEMS LE1/LE10/LE11. Then Xilinx ectc.2011.5898527-b (elastic, lid, stress-free 150 C) and the 120 mm peer ectc51529.2024.00155 (Table IV). ectc51909.2023.00155-d uses viscoelastic EMC, so it is an elastic-bias check until E8. FCBGA 00178, CoWoS-L 00091 and CoWoS-S 00135 are trend/sign cases | E1, D3 MVP | 10-15 |
| **E3 Homogenization** | RVE FEM for bump + underfill, TSV field and RDL metal fraction (9 orthotropic constants, CTE, k); per-layer metal-fraction grids; global-local submodel for corner bump / TSV stress | RVE vs bounds and vs a resolved model; submodel vs full-resolution small case | E2 | 4-6 |
| **E4 Process sequence** | Step list, activation by DOF dropping, stress-free T per step; molding, reflow and lid attach steps | COMSOL model 273 (Wentao runs it) or an equivalent analytic layered case; process-step warpage rows in the DB | E2 | 4-6 |
| **U1-U2 UI core** | Port the EO shell; Parameters node with provenance badges and constraint messages; geometry preview from the `/3d` box model; mesh view; field material; slice + cap; probe; derived values; warpage-vs-T plot with DB overlay | R7 gates: exact kernel tests, screenshot set, 60 fps orbit at 1M surface triangles, WebGL context loss | T0; runs alongside E1/E2 | 10-15 |
| **M1 First canonical sim** | `cowos_l/warpage_rt_ht` (plus the bring-up cases) in the browser, with adjustable die size, die array, HBM count, bridge count and bump array. Homogenized layers use rule-of-mixtures / metal-fraction rules until E3, which R1 shows can be 23 % low on laminate in-plane stiffness. Results are labelled `homogenization: ROM`, and the bias is stated in the comparison table | End-to-end browser run, convergence study, comparison table vs DB rows, 2 fresh-context audits | D1 MVP, D2, D3 MVP, E2, U1-U2 | 2-3 |
| **E5 EM 2D** | Port the EO 2D mesher and Nedelec mode solver; multiconductor lossy volumetric conductors; RLGC(f); DS dielectric; roughness; MTL cascade; mixed-mode; Touchstone | EM-0 closed forms (H-J microstrip, CPW conformal map, coax, stripline FEXT = 0); EM-1 vs measured IL/mm; EM-2; EM-3 | T0, D1 Dk/Df | 8-12 |
| **U3 EM UI** | Channel picker on the package view, region gizmo, ports, S dB/phase, Smith chart, Touchstone export | R7 gates | U1-U2, E5 | 4-6 |
| **E6 EM 3D blocks** | 3D Nedelec FEM order 1 in the browser for blocks up to ~6e4 DOF; tet or structured hex/prism meshing of bump/TSV blocks (spike first, since no permissive WASM tet mesher exists); TBC/IBC conductors; wave ports from E5; PML; complex-symmetric LDL^T; Pade sweep; Redheffer cascade with 2D segments. Full EM-4 / EM-5 blocks run on desktop references with the same config | PML reflection test; waveguide/coax 3D; reduced EM-4 (single bump pair) browser vs Palace/openEMS; EM-5a on desktop vs measured S11 resonance | E5, R | 12-20 |
| **E7 Performance + transient** | Profile-driven passes; gates G1/G2/G3; transient thermal | Bench JSONL before/after; same answers | E1-E2 | 6-10 |
| **E8 Tier-2 constitutive** | Prony + WLF EMC and underfill; Anand solder; Cu plasticity; time stepping through the process steps | Relaxation/creep closed forms; the FOWLP elastic vs viscoelastic vs measured case | E4, D1b | 8-12 |
| **M2 Category coverage** | One canonical sim per remaining illustrated `package_class`:<br>- `cowos_s/warpage_corner_stress`<br>- `emib_t/bridge_stress`, plus the regional EM HBM channel once E5 lands<br>- `cowos_r/thermal_rjc`<br>- `info_os/theta_jc_tim` (fan_out_wafer)<br>- `hbm_stack/stack_thermal` (microbump_3d)<br>- `soic/thermal_stack` (hybrid_bonded_3d)<br>- `glass_core/warpage_vs_organic`<br>- `fan_out_panel` panel warpage after molding (needs E4 + E8 for absolute values)<br>- `cpo_module` thermal<br>- `ucla_si_if` (wafer_scale) warpage<br>Configurable CoWoS-S and EMIB-T variants with the same knobs as M1 | Per case: convergence, comparison vs DB rows or explicit "no validation source", audit | M1 (E1/E2), E5 for EM parts, E4/E8 for panel | 8-12 |
| **U4-U5** | Isosurface, arrows, compare runs, VTU export; WebGPU visualization spike | R7 gates | U2, E7 | 7-11 |
| **Audits** | Fresh-context audit after each of D1, D2, E2, M1, M2, E5, E6 (twice for E2 and M1) | Findings dispositioned in this DevLog | - | 8-12 |

- **Totals (estimates):**
  - About 135-218 agent-days for the full scope (sum of the table rows; D3 counted at its full range).
  - Through M1 (T0, D1 MVP, D2, D3 MVP, E1, E2, U1-U2, M1, 5-7 days of audits): about 49-70 agent-days.
- **Critical path:** T0 -> D2 (grid generator) -> E1 -> E2 -> M1, about 23-37 agent-days. Starting E1 on a hand-built grid while D2 matures shortens it by up to D2's 4-7 days.
- **Parallel work at the 7-agent cap:**
  - D1, D2, D3 and R start right after T0 (the D1 MVP is ready before E1 needs it).
  - U1-U2 runs alongside E1/E2.
  - E5 (EM 2D) can start after T0, independent of E1-E4.
  - M2 cases run in parallel once E2 passes.

### First canonical sims

| Priority | Case | Physics | Validation basis |
|---|---|---|---|
| bring-up 1 | `si_interposer_peers/xilinx_tsv_lid` | warpage, elastic, no mold | ectc.2011.5898527-b (ABAQUS quarter model, RT property table, stress-free 150 C; CoWoS-S-like) |
| bring-up 2 | `si_interposer_peers/120mm_warpage` | warpage | ectc51529.2024.00155 Table IV (sim + moire); ectc51687.2025.00027 (measured coplanarity 30-200 C) |
| bring-up 3 | `si_interposer_peers/50mm_quarter` | warpage | ectc51909.2023.00155-d/-a (material table, stress-free 150 C; viscoelastic EMC in the paper, so this is an elastic-bias check until E8) |
| trend | `fcbga_organic/substrate_warpage` | warpage | ectc51687.2025.00178 (no material rows; ABF table only in 00148) |
| user 1 | `cowos_l/warpage_rt_ht` (lid / ring) | warpage, then thermal, then EM (LSI line) | ectc51909.2023.00091-a/b measured 25 / 240 C (regression; inputs partly template) |
| user 2 | `cowos_s/warpage_corner_stress` | warpage + normalized corner stress sweeps | ectc51909.2023.00135-a/b (ratios) |
| user 3 | `emib_t/bridge_stress` + regional EM HBM channel | warpage/stress, then EM | none for EMIB-T (sensitivity only); EMIB ectc.2016.201-c IL/NEXT for EM |
| thermal 1 | `cowos_r/thermal_rjc` | steady thermal | ectc51687.2025.00085 (Table 3 is image-only) |

### Open questions for Wentao (only those that block or change the plan)

1. **Licence** for this repo (it has no LICENSE file). Options:
   - GPL-3.0-or-later lets EO engine code (sparse, mesher, Nedelec, expressions, units, YAML splice) be copied as-is.
   - A permissive licence means re-deriving those modules clean-room (more E1/E5 effort).
   - Blocks T0.
2. **Proprietary materials** (EMC, underfill, ABF, BT core, solder resist): accept `paper_model_input` as the default basis, with the spread across papers as alternatives and sensitivity runs?
3. **Desktop references:** OK to add a separate `validation/` uv project (scikit-fem, NGSolve, gmsh, scikit-rf) now, and later build Palace/openEMS from source and brew-install CalculiX? Will you run COMSOL decks (model 273, gallery 847 etc.), and which version?
4. **Downloads:** ~10-15 paywalled papers for Si tables, Anand sets and EMC Prony data (list in R4 Sec. 4). Retrieval is yours; gates E8 and part of D1.
5. **Defaults:**
   - HBM4 stack height: 720 um (DB paper) or 775 um (secondary reports of JESD270-4).
   - Warpage sign: adopt the JEITA ED-7306 convention, labelled in every output?
   - Product presets (B200- / MI455X-class) in the parameter UI: yes or no?
   - Deformation scale: COMSOL auto or true scale with z-exaggeration?

## Decisions (Wentao, 2026-10-20, received after 12:36 PDT)

1. **Licence:** GPL. Repo `LICENSE` = GPL-3.0 text, copied from eo-modulator-atlas `engine/LICENSE` (identical sha1); code is GPL-3.0-or-later as in EO. EO engine modules may be ported as-is. Cached sources keep their own rights (README).
2. **Proprietary materials** (EMC, underfill, ABF, cores, solder resist): `paper_model_input` is the default basis, with alternatives from other papers.
3. **Desktop references:** yes (`validation/` uv project first; Palace/openEMS/CalculiX later). Addition: also validate high-level results reported across papers. D3 gains a **tier H**: headline values from many DB papers used as broad regression/sanity targets, e.g.:
   - warpage sign flip between RT and HT;
   - warpage vs stiffener width or lid trends;
   - Rjc / theta-JC order of magnitude;
   - IL/mm vs frequency bands.

   Each target is a range or a direction with its metric_id, not a point tolerance.
4. **Downloads:** only 3 of the 10 named sources are IEEE:
   - Hopcroft 2010 (JMEMS), Krupka 2006 (TMTT) and Motalab 2012 (ITherm) are queued in `config/sim/fetch_queue.csv` and fetched with `scripts/ieee_fetch.py --queue` (new flag; same throttle, breaker and `references/<id>/` layout; `source.json` gains `purpose`).
   - The other 7 (APS x2, AIP, Elsevier x3, Emerald; DOIs and titles checked against Crossref) are in `config/sim/manual_downloads.md` for manual download into `references/_inbox/`; `scripts/ingest_inbox.py` now also reads that list.
   - These are sim-library sources, not DB papers: ingestion-backlog checks must skip ids listed in `config/sim/`.
   - EMC/underfill Prony sources beyond Sadeghinia 2012 are still to be identified in D1b.
5. **Defaults** (Wentao: deformation scale COMSOL-style automatic; the rest by coordinator judgement):
   - **Deformation scale:** automatic, about 10 % of geometry size (COMSOL), with the factor shown and editable.
   - **HBM4 12-Hi stack height:** default 720 um, the value read in a primary paper (vlsitechnologyandcir65830.2026.11577576 p.1). 775 um is carried as an alternative until JESD270-4 itself is read.
   - **Warpage sign:** JEITA ED-7306 convention, with surface and viewing side stated in every output, plot axis and CSV header.
   - **Product presets:** yes, but only facts from primary sources (e.g. MI455X 12 HBM4, MI355X 8 HBM3E 12-Hi, MI300X 8 HBM3). Every other preset dimension is `template`. Products whose primary sources contradict each other (B300 stack count) get no preset until resolved.

## TODO

- [x] Research R1-R7
- [x] Synthesis, decisions A1-A11, tranches, first canonical sims
- [x] Fresh-context audit (`DevLog/audits/sim_proposal_audit_2026-10-20.md`) and corrections
- [x] Answers to open questions 1-5 (Decisions above)
- [x] LICENSE (GPL-3.0); sim fetch queue + manual list; `--queue` flag; inbox reads the sim list
- [x] IEEE sim queue fetched (3/3, 12:47-12:51 PDT; PDFs and text.md under `references/<id>/`, `source.json` purpose set)
- [x] 7 manual downloads (Wentao; `config/sim/manual_downloads.md`; all 8 incl. the silicone-nu paper downloaded and ingested 2026-10-21, DevLog-013)
- [x] T0, then D1/D2/D3/R/U1/E5 in parallel (implementation record: DevLog-012; wrapped up 2026-10-20 for testing)

## Progress log

- 2026-10-20: request recorded; 7 research subagents launched; all 7 reports in; synthesis and tranche plan written.
- 2026-10-20 12:36 PDT: audit found 1 blocking, 7 significant and 12 minor issues; applied:
  - **B1:** the browser 3D EM direct budget is ~6e4 DOF, not ~2e5. A8 and E6 were rescoped; full EM-4/EM-5 blocks go to desktop references.
  - **S1:** two false DB-defect reports were withdrawn (the rows exist in `electrical_interfaces.csv`).
  - **S2:** bring-up order changed to the Xilinx and JOINT2 grade-A cases; FCBGA 00178 is now a trend case.
  - **S3:** D3 MVP is now a dependency of E1/E2 and covers LE1/LE10 and the E2 gate cases.
  - **S4:** the critical path now includes D2 (23-37 days).
  - **S5:** M2 category-coverage tranche added; "die array" and "bump array" knobs named.
  - **S6:** the M1 homogenization bias is stated.
  - **S7:** report disagreements reconciled in A8.
  - **Minor items:** provenance axes, A3 order caveat, D1b row, U3 dependency, audit allowance, platform row precision, CoWoS/EMIB scope of the no-material-table claim, CTE-kind locator, datasheet wording, PML count attribution, R5 sketch fix noted in D2, front matter, pnpm.
  - **Not changed:** inconsistencies inside the research reports themselves (audit M10) stay as written; the DevLog uses the reconciled values.
- 2026-10-20 (12:36-12:50 PDT): decisions recorded.
  - LICENSE added.
  - `scripts/ieee_fetch.py --queue` and the `scripts/ingest_inbox.py` sim list added. Dry runs OK. ruff shows only 4 pre-existing findings, none on the changed lines.
  - Incident: during a lint command I ran `git stash` by mistake. It stashed all tracked changes, including another session's uncommitted `scripts/build_package3d.py` and `config/package3d/TEMPLATE_FORMAT.md`. I ran `git stash pop` within about a minute; it applied cleanly, all 4 files were restored and the stash list is empty.
  - 12:47 PDT: IEEE sim queue started in tmux `apa-ieee-sim` (log `logs/ieee_sim_20261020T124701.log`). The session was still signed in; jmems.2009.2039697 saved at 12:47:21.
