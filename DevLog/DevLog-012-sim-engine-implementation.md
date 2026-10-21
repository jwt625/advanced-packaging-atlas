---
title: Simulation harness implementation - T0 and wave-1 lanes (engine core, materials, families, validation, references, UI shell, EM 2D)
date: 2026-10-20
status: wrapped up 2026-10-20 22:30 PDT for Wentao's testing; see 'Wrap-up' at the end
scope: engine/, sims/, validation/, app/src/routes/sim/, app/src/lib/sim/, DevLog/lanes/
authors: Claude (coordinator) and lane subagents, at Wentao Jiang's request
---

# DevLog-012: simulation harness implementation

Plan, decisions and tranche definitions: [DevLog-010](DevLog-010-multiphysics-sim-harness-proposal.md). Contracts:
[sims/SPEC.md](../sims/SPEC.md). Request (Wentao, 2026-10-20): "Go. Keep going until you absolutely need my feedback or
inspection."

## T0 (coordinator, 2026-10-20)

- `LICENSE` GPL-3.0 (repo) and `engine/LICENSE`; `engine/package.json` (`ap-sim-engine`, ESM, GPL-3.0-or-later, dep
  `yaml` via pnpm), `engine/README.md` (layout and lane map), `sims/SPEC.md` v0 (case config, box parts, grid,
  materials, results, validation cases).
- Port source: eo-modulator-atlas at commit eb97f96. Each ported file starts with
  `// Ported from eo-modulator-atlas engine/src/<path> at eb97f96 (GPL-3.0-or-later).` and lists local changes.

## Lanes (wave 1; 7 concurrent, project cap)

| Lane | Tranche | Write paths (exclusive) | Reads | Notes file |
|---|---|---|---|---|
| L1 | E1 core: port LA + params, grid, steady thermal, CLI, bench | `engine/src/{la,params,grid,thermal}/`, `engine/cli.mjs`, `engine/bench/`, `engine/tests/{la,grid,thermal,cli}*.test.mjs` | SPEC, EO engine | `DevLog/lanes/L1-engine-thermal.md` |
| L2 | D1 materials (MVP then tier 1) | `engine/src/materials/`, `engine/data/materials/`, `engine/tests/materials*.test.mjs` | R4, DB, cached text | `DevLog/lanes/L2-materials.md` |
| L3 | D2 family generators + case configs | `engine/src/families/`, `engine/tests/families*.test.mjs`, `sims/*/` (case YAML) | package3d.json, R5 | `DevLog/lanes/L3-families.md` |
| L4 | D3 validation set MVP + tier H | `validation/cases/`, `validation/README.md`, `validation/expected/` (scripts computing tier-A values) | R6, R3, DB | `DevLog/lanes/L4-validation.md` |
| L5 | R desktop references (uv project) | `validation/reference/` (own `pyproject.toml`, `.venv`) | L4 cases, R2/R6 | `DevLog/lanes/L5-references.md` |
| L6 | U1 UI shell | `app/src/routes/sim/`, `app/src/lib/sim/`, nav entry in `app/src/routes/+layout.svelte` (one line), `app/package.json` only if needed | EO app, `/3d` code (read-only), R7 | `DevLog/lanes/L6-ui.md` |
| L7 | E5 EM 2D | `engine/src/em2d/`, `engine/tests/em2d*.test.mjs`, `sims/em/` | EO engine (mesh, vector-mode, ldlt), R3 | `DevLog/lanes/L7-em2d.md` |

Shared rules for every lane:

- **Write scope:** write only in your own paths; read anything. Other files changed in `git status` usually belong to another session (the 3D lane, DevLog-011, owns `config/package3d/`, `scripts/build_package3d.py`, `app/src/lib/three/`, `app/src/routes/3d/`).
- **No git writes:** no commit, stash, checkout, reset, clean or add.
- **No retrieval:** no `ieee_fetch.py` or any other retrieval; no downloads except package installs inside your own paths.
- **Process:** write the plan into your notes file before coding; keep a timestamped progress log there (`date` for timestamps). Hand-off ready.
- **Tests and machine load:** `node --test` per lane file pattern. Heavy runs under `nice -n 10`, one at a time per lane. Benchmarks only by L1, when it says the machine is quiet.
- **Content rules:**
  - No emoji. ISO dates. No absolute local paths in tracked files.
  - Never mention or use any file in `~/Downloads`.
  - Every number traceable (source + locator, formula, or `template` with rationale).
- **Contracts:** contract changes must be additive; request them from the coordinator in your final message, or apply them only inside your own module with a note.

## Progress (coordinator)

- 2026-10-20: T0 skeleton and SPEC written; wave-1 lanes launched.
- L4 done. Validation set:
  - 59 YAML files: A 17, B 6, C 7, D 5, H 23.
  - Scripts in `validation/expected/` recompute the tier-A/B/EM-0 values.
  - Coordinator re-ran `check_db_targets.py`: 354 DB values and 62 script values checked, 0 errors.
  - Findings beyond R6: the MA5b gate uses the CLT value (0.816 um), not Stoney; the Suhir force matches CLT only with the equibiaxial rigidity; NAFEMS LE11 temperature is sqrt(x^2 + y^2) + z; T3 36.603 C and T4 18.2538 C by exact series.
  - Pending alignment: C/D `inputs.sim_case` ids are to be checked against L3's actual case ids.
- L1 done (E1):
  - **Ports and modules:** verbatim EO ports `la/{sparse,ldlt,complex}`, `params/{params,units}`; grid builder; stencil LA with own grid nested dissection; PCG + GMG (x-y semi-coarsening, 4-colour z-line smoother); Q1 thermal with k(T) by Picard; CLI; bench.
  - **Tests:** 40/40 lane tests; the coordinator re-ran them, 40/40.
  - **Gates:**
    - TA1 exact to 1e-9; TA3a FE order 1.82 vs the exact series; TA4 0.020918 vs 0.020919 W/K.
    - MMS L2 order 1.97-2.00; energy balance < 1e-10; direct vs MG 5e-13; crops vs full 2.5e-12 K.
  - **Bench** (PCG+MG): 9.4e4 nodes 196 ms, 2.7e5 nodes 518 ms (13 iterations), against direct 15.5 s at 2.7e5.
  - **Contract:** additions merged into SPEC section 7 (v0.1).
  - **Wave 2 (resumed with context):** units K dimension; thermal L4-1/2/3/4(/7); block MG for 3 DOF/node in `la/` for L8; first end-to-end thermal case runs.
- L8 (E2 thermo-elasticity) launched in the slot L4 freed.
- L6 done (U1): /sim workbench shell.
  - **Port and features:** EO shell ported (tree, settings, YAML splice, URL state, splitters, LinePlot, pool); Parameters table with R/D/P/T/U badges and ref tooltips; constraint messages; geometry preview from L3 `generate` (188 instanced boxes for CoWoS-L in ~26 ms); section trim; worker run plumbing to L1/L2.
  - **Checks:** `pnpm check` 0/0, `pnpm build` ok.
  - **Coordinator review:** viewed r4/geo-1440-dark.png and r1/params-1440-dark.png.
  - **Coordinator changes:** added `server.fs.allow ['..']` to `app/vite.config.ts`. L6 had added `yaml ^2.9.1` to `app/package.json`.
  - **Requests routed:** to L1 (browser-safe runCase; pcg_mg non-convergence in a stub run, likely a pure-Neumann problem), L2 (YAML parse error; Node-free library) and L3 (param bounds, package cases with studies, consistent rounding, case ids).
  - **Next:** L6 resumed with context for U2 (fields, slices, probe, derived values). It builds element kernels and tests against SPEC grids and integrates with L1's grid/la when they land.

- L2 done (D1):
  - **Library:** 47 entries (17 MVP + 30 tier 1), ~170 sourced leaves, 46 T/f tables, 93 alternatives. Tier-2 Anand, plasticity and cure-shrinkage data are stored but not yet used.
  - **Tests:** 14/14; the coordinator re-ran them, 14/14.
  - **Si check against Hopcroft:** E <100>/<110>/<111> = 130/169/188 GPa.
  - **Sources and fixes:** the 3 cached IEEE sim refs and 20 paper property tables were used; the YAML parse error is fixed; the browser modules are Node-free.
  - **Contract:** additions merged into SPEC section 8 (v0.2).
  - **Next:** resumed for the template-basis policy pass and the DB-string alias expansion.

- L7 done (E5):
  - **Tests:** 18/18; the coordinator re-ran them, 18/18.
  - **Gates:** coax 2.4e-6; parallel-plate skin effect at 1-100 GHz <= 6.6e-5; microstrip vs Hammerstad-Jensen -0.19/-0.28 % on Z0; CPW -0.47 %; Bessel wire <= 7.5e-5; lossless unitarity 1.3e-13.
  - **EM-1** (ABF microstrip on glass, measured TRL): +10 to +24 % with Hammerstad roughness, -18 to +1 % smooth. The measurement lies between the two; per-surface roughness and plated-Cu sigma are not reported. Not tuned.
  - **EM-2** (Si-bridge CPWG, 56 GHz): +3.8 to +11.4 % vs measured.
  - **Timing:** 54 frequencies in ~17 s (~300 ms per frequency, 47k triangles, P2).
  - **Contract:** SPEC section 9 (EM 2D case) merged. The cli.mjs dispatch has been requested from L1.
  - **Next:** resumed for E6 phase 1 (3D Nedelec blocks, PML, wave ports, <= 6e4 DOF).

- L3 done (D2):
  - **Generators:** 5 families (cowos_l, cowos_s, emib_t, fcbga_organic, cowos_r). Each reproduces every `package3d.json` box within 1e-9.
  - **Rules:** constraint rules with clear messages; HBM generation table (HBM4 12-Hi 720 um, 775 alternative); presets for the MI300X/MI355X/MI455X class (public facts only; no NVIDIA presets).
  - **Cases:** 9 under `sims/`, with ids matching L4.
  - **Tests:** 34/34; the coordinator re-ran them, 34/34.
  - **Coordinator smoke:**
    - cowos_l `hbm_n: 12` errors with a fix hint.
    - With `fit_dies` it then errors on the reticle area (1.08x of 3x).
    - With `reticle_x: 4` it gives 12 HBM, 14 bridges, quarter allowed.
  - **Contract:** SPEC section 10 (v0.3) merged.
  - **Routed:**
    - Homog-constituent aliasing and the overrides shape to L2 (this blocked end-to-end runs).
    - Parser keys and homog pass-through to L1.
  - **Next:** resumed for the 00091-a dummy-die / SC-RDL knob and the M2 category generators.

- L2 wave 2 done:
  - **Tests:** 21/21; the coordinator re-ran them, 21/21.
  - **CD1 implemented:** 18 template values (nu for emc/lmc/tim_polymer are placeholders at 0.30; the rest are analogs). Real sources were found for Ni nu (0.296, Ledbetter-Reed 1973) and Al nu (0.300 from NIST E and G).
  - **DB alias coverage:** 415/1016 strings, 2299/3575 rows. Multi-material and missing-library strings are left unmapped on purpose.
  - **Aliasing:** template-key aliasing works, including `homog:` constituents and the `void` matrix.
  - **Overrides:** `applyOverrides` added.
  - **Remaining refusals** (routed to L3 for case-level fixes):
    - lid parts with material `other`;
    - SAC305 BGA outside -50..217 C;
    - SS304 CTE above 100 C (an alternative exists);
    - tim_polymer above 150 C.
  - **Contract:** SPEC section 11 (v0.4) merged.
- Audit A1 (fresh context, wave-1 engine) launched in the slot L2 freed.

- Usage limit hit (reset 14:10 PDT); L1, L3, L7 and A1 were interrupted. Usage reset, and all agents were resumed from saved state.
- L5 done (R, wave 1). `validation/reference/` uv project:
  - **Environment:** Python 3.12.11, venv 282 MB; scikit-fem, scipy, scikit-rf, gmsh, pyamg, qdldl. pytest 37 pass, ruff clean.
  - **Numbers:** 31 deterministic results files.
  - **Q2 vs closed forms:** agreement to round-off on the exact cases. MA4b is -6.4e-5 vs CLT, a physical finite-plate correction, so tight engine gates should use the FE value.
  - **Q1 locking:** -16 % (MA4b) to -61 % (MA6, 1 cell), which settles the low end of the A3 bake-off.
  - **TA3:** the closed form is 0.6-1.5 % off the 3D square-on-square FE, so gate on FE.
  - **Model limit:** XB2 at 120 mm has sag/thickness 2.35, so geometric nonlinearity is needed for absolute warpage of very large thin plates.
  - **Coordinator fixes from L5 findings:**
    - MA4 definition text: kappa = -d2w/dx2, > 0 = dome.
    - MA8 sign (L4 used a passive rotation): now -2.16506e-4. The `tier_a.py` and JSON diff is that one value only; `check_db_targets` gives 0 errors.
    - SPEC section 12 rotation convention (v0.5).
  - **LE10 geometry:** came from recollection in L5's script. L5 is resumed to verify it from public inputs, build LE11/T1, and cross-check the JS thermal engine against the references.

- L3 wave 2 done:
  - **Tests:** 64/64 family tests; the coordinator re-ran them, 64/64.
  - **cowos_l:** dummy-die (`dummy_n`, `rows_y`) and `sc_rdl: substrate` knobs. The flagship case now models TV 00091-a: 2 SoC, 4 HBM2E, 8 dummies, 91 mm SC-RDL. Dummy sizes and positions remain `missing`.
  - **M2:** 7 more generators (info_os, hbm_stack, soic, glass_core_substrate, fan_out_panel, cpo_module, ucla_si_if). Each is transcribed from its template and reproduces package3d.json exactly. All 12 illustrated categories now have a generator and a canonical case.
  - **Materials:** `other` materials replaced by library keys with a basis. The silicone adhesive remains a gap (routed to L2).
- First package-level thermal result (coordinator re-run), `cowos_r/thermal_rjc` s1:
  - Grid 1.6e5 nodes; heat balance 2.4e-16; 5.7 s total.
  - Rjc 0.00791 C/W vs measured 0.0108 (-27 %). This is +4.2 % vs the paper's own model without TIM contact resistance (0.00759, d-m12), and the case has no contact resistance because it is not disclosed.
  - Tj 99.4 vs 104.9 C (-5 %).
  - PCG+MG needed 198 iterations at max cell aspect 500 (synthetic bench: 13). MG robustness was routed to L1.

- Audit A1 (fresh context, wave-1 engine), `DevLog/audits/sim_engine_audit_A1_2026-10-20.md`:
  - **Tests:** 145/145 pass.
  - **Verified correct:**
    - thermal Q1 / Robin / sources / Dirichlet / symmetry factor;
    - hand recomputations of TA1, TA2, TA4, TA5, MA1, MA5, MA7;
    - CTE rebase, cubic averages and homogenization formulas;
    - 11/12 random library values (the 12th was not checkable without a page render);
    - family refs; EM 2D formulas and Touchstone keywords; 7 C/D targets;
    - rule compliance.
  - **Findings and owners:**

    | Item | Finding | Owner |
    |---|---|---|
    | B1 | 12 of 17 package cases failed s1 as written: node budget, selections on parts owning no cells, glass k N/A, ABF over its range under an unrealistic BC | L3 cases, L1 selections, L2 glass k |
    | S1 | MG degrades on real aspect ratios (56-198 iterations; 352 at aspect 400) | L1 |
    | S2 | Sheet homogenization Poisson pair inverted | L2 |
    | S3 | Routed RDL direction ignored | L3 emits it, L2 homogenizes it |
    | S4 | CD1 sensitivity never reported | L3 new runner module |
    | S5 | `cubic.mjs` builds R^T (wrong for angles other than 45 deg) | L2 |
    | S6 | Snapping chains move faces beyond tolerance | L1 |
    | S7 | Tier H rules over-generalized | L4 |
    | S8 | EM-1 gate does not discriminate | L4 |
    | S9 | Polymer TIM CTE N/A | L2 |
    | Minor | Assigned per lane; license lines on new files to be added by the coordinator at the end | various |

  - **SPEC:** contract mismatches fixed by the coordinator (implemented items no longer listed as pending; `flux_W_m2` alias; homog key-form pointer).
  - **Concurrency:** resuming L3 and L4 together exceeded the 7-agent cap, so L4 was deferred until a slot frees.

- Wave-2/3 reports (L1, L7, L6, L3, L4), coordinator checks:
  - **L1 wave 2:**
    - **Tests:** 56/56.
    - **Thermal additions:** units K dimension; contact resistance (TA2 exact); source_patch; temperature_field; full-tensor k (TA6 exact); transient BE/CN (observed orders 1.00/2.00, TA5 to 2e-5).
    - **Block MG for L8:** 11-20 iterations, agreement with direct to 1e-13.
    - **MG robustness:** strong-coupling-only semi-coarsening plus 2 sweeps. Real grids now take 17-26 iterations per linear solve (Cu strip 640 -> 12).
    - **CLI and runner:** browser-safe runCase; em2d dispatch.
    - **Audit items:** B1 box-face selections, S6, M1, M9.
    - **Contract:** SPEC section 13.
  - **L7 E6 phase 1** (3D EM blocks):
    - **Mesh and elements:** extruded-prism tet mesh (40-130x better per DOF than staircase); first-order Nedelec; IBC and thin-conductor BC; PML; E/H-shape wave ports via a Woodbury update.
    - **Tests:** 24/24 em2d + em3d.
    - **Gates:** TE10 +1.06 %, S11 -51.7 dB; coax 3D vs 2D -0.6 to -0.8 %; PML 8 cells -44.5 dB at phase 1 (-41.8 dB after the phase-2 power-wave reference change, audit A2 M6); reciprocity 5e-15.
    - **EM-4 reduced** (microbump GSG, 6e4 DOF): pi model L 10 pH, C 10.8 fF; 14-16 s per frequency. Mesh band: L -2.3 %, C -8 %.
    - **Contract:** SPEC section 14.
  - **L6 U2:**
    - **Browser run:** end-to-end Compute; cowos_r in 3.4-4.7 s in the browser, Rjc 0.00791 (same as CLI).
    - **Rendering:** field shader with LUT, slice and exact section face, mirrored symmetry display, probe and cut line, derived values.
    - **Performance:** largest browser solve 1.12e6 nodes in 17.9 s. First paint 92 ms; orbit 1.4-2.7 ms per frame; slice drag 4-9 ms; section drag 19-71 ms (partly over the 50 ms target).
  - **L3 wave 3:**
    - **Cases:** all 16 package cases run s1.
    - **Audit items:** S3 routing axes, S4 sensitivity runner (fcbga Tmax range 41.3-43.5 C over template k; cowos_r Rjc spread 0.1 %), M4, M8.
    - **Template drift:** the emib_t template changed upstream (DevLog-011 lane) and the reproduction test caught it.
  - **L4 wave 2:**
    - **Tier H:** 23 rules re-scoped, each with a `fails_if` statement; 15 marked weak.
    - **EM-1:** variant-specific targets (cannonball passes; base fails at 140 GHz).
    - **reference_fe:** entries from L5 added.
    - **Checker bug fixed:** PyYAML read `1.45e8` as a string, so 27 tier-A values had been skipped silently.
    - **EM-0:** switched to eta0/4.
    - **Checks:** 0 errors over 354 DB, 89 script and 15 reference values.
  - **Coordinator verification run:**
    - 14 of 16 cases ran s1 cleanly (exit 0). info_os exits 2 on its known theta-JC miss. cowos_l and cowos_r were interrupted by the coordinator, then re-run singly: cowos_l 5.2e5 nodes, 114 iterations, 12.6 s, balance 6.7e-12, with the Q1 overshoot warning (mold +0.48 K; routed to L3).
    - L8's in-progress `mech-case.test.mjs` ran > 10 min at 100 % CPU, so mech tests were excluded from the coordinator suite run.
  - **Main physics finding so far** (corrected after audit A2 S3): both thermal TVs with measured targets land about 27 % low at the nominal BLT, but the causes differ.
    - CoWoS-R fits a missing constant TIM contact resistance: the run is within 4 % of the paper's own zero-contact model, and the implied offset of 0.0029-0.0035 C/W matches the expected 0.0032.
    - InFO_oS does not: its gap grows with BLT (-27 % at 60 um, -36.5 % at 140 um). The engine's BLT slope (0.0186 C/W) equals the 1D bulk-TIM value (0.0188), while the paper's slope is 1.6-1.8x larger, and the paper's Table 5 rows are inconsistent with any single bulk TIM.
    - So InFO's fitted k_eff 3.32 W/(m K) is a fitted parameter, not a TIM property.
  - **Next wave:**
    - L1: CLI `--sensitivity`, em3d dispatch, `sim_targets.json` for browser target checks, WASM SIMD gate G1.
    - L3: transcribed specs for the 5 hand-written families (drift-proof), mesh for the overshoot, TIM contact-resistance calibration variants, cowos_r mesh convergence.
    - L6: U3 EM UI, section-drag cache, transient picker, mechanics binding.
    - L7: E6 phase 2 (differential ports, full-wave port mode, EM-5a TSV, IBC corner rule); causal_fit as the EM-1 base variant.
    - L2: per-axis CTE override, sourced silicone nu.

- L8 done (E2 mechanics):
  - **Elements and features:** q1im (Wilson incompatible modes, condensed, including the thermal load), q2s 20-node, plain q1 as a reference; iso/ortho/cubic with SPEC-12 orientation; per-part stress-free T rebase; rigid_motion or symmetry supports; direct, PCG + block MG (L1) and q2s p-MG solvers; JEITA ED-7306 warpage, coplanarity, curvature, von Mises with singular-corner flags.
  - **Tests:** 20/20; the coordinator re-ran tierA + core (19/19, 13.6 s) and case (1/1, 10 s).
  - **A3 bake-off:** q1im equals q2s within 7e-6..3e-5 on MA4b, ~1e-6 on MA4a thin layers, <= 4.9e-4 on MA5b, and is exact on MA6 (corrected per audit A2 M1), at 3.3-3.8x fewer DOF. Plain q1 locks by -10 % to -100 %. Default set to q1im (SPEC section 15).
  - **Xilinx bring-up:**
    - **No lid:** +338 um vs the paper's FEM +335.28 um (0.7-0.9 %), across 5 meshes. This is a plausibility check only: nu, build-up and homogenization are template/ROM inputs.
    - **Lidded:** -63.8 vs +162.56 um, a sign miss. The cause is model form: the template lid foot has no adhesive and the attach temperature is unknown.
    - **TIM1 CTE:** 100 ppm/K used for the run only (no source). x3 changes the lidded result by 1 %. It is to become a labelled template override (routed to L3).
  - **Performance:** 1e5 DOF in 3.0 s with MG (direct 14.8 s, 1.35 GB); 3e5 DOF in 6.3 s / 678 MB.
- L2 wave 4 done:
  - **Tests:** 27/27.
  - **Overrides:** per-axis CTE override added.
  - **Silicone nu:** no readable source, so the placeholder stays with asymmetric sensitivity -0.05/+0.19. The candidate paper (Mueller et al., Soft Matter 2019, doi 10.1039/c8sm02105h, Crossref-checked by the coordinator) was added to `config/sim/manual_downloads.md` (now 8 items).
  - **Resolution:** 727/756 key resolutions across all 12 families at 25/240 C; the refusals are documented.
- Coordinator fixes:
  - MA6 stress tolerance abs 1e-10 -> 1e-7 (below the f64 floor of both solvers); `check_db_targets` 0 errors.
  - SPEC section 15 (mechanics, v0.7).
- Next:
  - L1: thermo_elastic CLI dispatch and a run table, ahead of the WASM gate.
  - L3: Xilinx case fixes (q1im, TIM template, lid adhesive, core z CTE).
  - L8 wave 2: E3 RVE homogenization, then E4 process sequence.
  - Audit A2 (mechanics, em3d, UI, runner) launched.

- L5 wave 2 done:
  - **LE10:** geometry verified from public inputs (FeenoX step/geo/fee, Abaqus page); converges to -5.3847 MPa (+0.09 % vs FeenoX -5.37968). Wave 1 had stalled at -5.44 for lack of resolution at the clamped face and the EE' line.
  - **LE11:** -105.54 MPa (+0.95 %).
  - **T1:** hot spot r = 1.0 confirmed by the Abaqus deck; 50.448 MPa, consistent with the finite-plate closed form 50.50.
  - **Engine cross-check on identical grids:**
    - Thermal Q1 equals scikit-fem Q1 node by node within 1.1e-10 K.
    - Mechanics q2s equals scikit-fem Q2s to 1e-13..1.6e-8 (displacements) and 8-9 digits (stresses).
    - q1im is within 1.2e-4 on curvature at level 2.
  - **Engine bug:** the curvature fit is singular on narrow strips (routed to L8).
  - **MA7:** ring-mean stresses are within 0.3 % of the finite-matrix closed form; single points scatter about 1.7 % on tets.
  - **Model limit (carried here):** large thin plates (XB2 120 mm, sag/thickness 2.35) need geometric nonlinearity for absolute warpage. The engine is linear.
  - **Next:** L4 resumed for the reference updates (LE10 gated, T1 finite-plate value, MA7/XB3 ring means, cross-solver verification note).

- L4 wave 3 done:
  - **LE10:** gated at rel 3e-3 on L5's verified values.
  - **T1:** geometry from the Abaqus deck; finite-plate closed form 50.50 MPa (the coordinator re-derived (E alpha dT / 2)(1 + a^2/R^2) = 50.5).
  - **MA7:** gates are now ring means.
  - **README:** tier-B cross-solver verification record added.
  - **Checks:** 0 errors over 354 DB, 92 script and 23 reference values (coordinator re-run).
- L3 wave 4 done:
  - **Drift:** all 12 families build from transcribed specs plus edit functions; a drift-alarm test was added (it fired once on an upstream rename and was fixed).
  - **Tests:** 73/73.
  - **Overshoot:** fixed with max_z 0.2 mm.
  - **cowos_r mesh convergence:** Rjc spread 0.012 % over 1.6e5-6.1e5 nodes.
  - **Calibration variants** (labelled calibration, not validation):
    - CoWoS-R contact resistance R_c = 4.30e-6 m2K/W, derived from the paper's own model-vs-measured gap over the SoC area. It gives Rjc +3.4 % and Tj +0.5 %, and predicts the unused BLT points within -1.9..+0.3 %.
    - InFO: an effective TIM k of 3.32 W/(m K) from the measured BLT slope gives +9.5 / +3.4 %.
  - **Xilinx:** lid-attach adhesive knob added. The lidded sign miss persists (-52.8 vs +162.56 um); no-lid +337.9 vs +335.28 um.
  - **Mechanics dry check:** blocked studies are marked. The main blocker is SUS430 elastic N/A, which blocks the grade-A 120 mm targets.
  - **Mislabel:** the Xilinx TIM1 CTE 100 ppm/K was labelled `user` (not supplied by Wentao). Fixed by policy CD5, applied by L2, then relabelled by L3.

- L2 wave 5 done:
  - **Tests:** 28/28.
  - **SUS430:** Combined Metals data sheet, E 200 GPa; nu template 0.290 from 304.
  - **CD5:** implemented. tim_polymer CTE 149 ppm/K is the midpoint of two filled-silicone above-Tg CTEs, with a rationale; resolve refuses if E > 100 MPa.
  - **CD6:** implemented (hold-last, provenance.extrapolated flags).
  - **Resolution:** 728/756 key resolutions; the rest are documented refusals that CD6 or alternatives can unlock.
- L7 E6 phase 2 done:
  - **Tests:** 28/28.
  - **EM-1:** the base dielectric is now causal_fit (L4 request). Cannonball passes all 4 measured points; base fails at 140 GHz.
  - **Ports:** multi-mode/differential wave ports with mixed-mode S. The GSSG CPWG 3D cascade vs 2D agrees to 4.4e-4..2.5e-3.
  - **Full-wave port eigenmode:** re-implemented from the EO DevLog-025 formulation, with no EO code copied. It drops the dispersive microstrip S11 floor from -36/-32 dB to -50/-90 dB.
  - **IBC needle-tet error:** 0.76x on along-line strips; now enforced as an error unless overridden.
  - **EM-5a:** not comparable; the DB lacks GSG layout, liner and Si resistivity. A reduced browser case and a desktop deck exist.
  - **Contract:** SPEC 14.1 merged (v0.8).
  - **Routed:** L4 updates its EM-1 variant ids and baselines; L5 starts the desktop EM cross-check (scikit-fem Nedelec first).

- Audit A2 (fresh context: mechanics, em3d, UI, runner), `DevLog/audits/sim_engine_audit_A2_2026-10-20.md`:
  - **Verdict:** no blocking findings.
  - **Verified correct:**
    - CLT values re-derived to the printed digits.
    - The q1im condensed thermal load is stress-free to 4e-14 under a linear T on a graded, rotated orthotropic block (plain q1 4.8e-2).
    - 3-2-1 reactions 6e-14 N; q2s, rotation, symmetry and the JEITA sign rule as coded.
    - All em3d formulas, with TE10 beta = 2775.006 rad/m analytic.
    - A1 fixes landed.
    - Headline numbers reproduced: CoWoS-R Rjc 0.0079134; InFO theta-JC 0.02266/0.04127; Xilinx no-lid +338.27 um, lidded -53.07 um.
    - Compliance: 401 files clean, 460 material leaves labelled.
  - **Significant findings and owners:**
    - S1: no mechanics sensitivity spread is ever computed. Owners: L3 runner, L1 CLI.
    - S2: asymmetric silicone nu bounds are silently skipped, with no nu < 0.5 guard. Owner: L3.
    - S3: the InFO gap is not a contact-resistance offset. It grows with BLT, the engine BLT slope equals 1D bulk while the paper's is 1.6-1.8x, and k_eff 3.32 is a fitted parameter. The coordinator corrected the "main physics finding" text above.
    - S4: the Xilinx von Mises "pass" sits on a singular flagged point. L1 is adding an `indeterminate` rule.
  - **Minor:** M1 q1im-vs-q2s claim (corrected in SPEC and here: up to 4.9e-4 on MA5b); M2/M3/M12 UI (L6); M4/M5 em3d (L7); M6 stale text (fixed here; L3, L8 notes); M7/M9 (L8); M8 runner status label (L3); M10 Xilinx lidded GMG 240 iterations (L1); M11 license lines (coordinator, at the end).
  - **Process note:** A2 used system python3 once, read-only, against the uv-only rule.
- L4 wave 4 done:
  - EM-1 variant ids re-pointed (causal base, `table` as reference).
  - Baselines refreshed from an engine re-run (144 s). Base and cannonball match L7 exactly, and the bracket rules still hold.
  - Cannonball's 140 GHz margin is thin (0.0417 vs 0.0423).
  - `check_db_targets` 0 errors.

- L6 wave 3 done (U3):
  - **EM pages:** S dB/phase with log-f, mixed-mode blocks, Smith chart, RLGC(f), targets, Touchstone download.
  - **EM geometry:** em2d cross-section canvas and em3d solids view.
  - **Mechanics bound:** displacement with COMSOL auto deformation scale, von Mises per part with flags, warpage vs T with JEITA label and DB overlay hook.
  - **Pick channel v1:** clicking a routed level creates an in-memory em2d draft with statuses; the cowos_l LSI level runs in 0.2 s.
  - **Section drag:** cache brings it to 5-24 ms at 1-2e6 cells.
  - **Other:** transient T(t) page; A2 UI fixes.
  - **Checks:** `pnpm check` 0/0, build ok.
  - **Coordinator review:** viewed mech-warp-fcbga_bare-1440-dark and res-em-s-em4-1440-dark; both correct.
  - **Browser runs:** em2_cpwg runs in 29-30 s with all 5 alpha targets passing; em4 takes 181 s.
  - **M1 blocker:** cowos_l mechanics at the case mesh (~1.7e6 DOF) fails in the browser with "Array buffer allocation failed". Routed to L8 (memory cut to <= 1.5 GB per worker) and L3 (quarter symmetry for uniform-T warpage studies).

- L7 wave 4 done:
  - **Tests:** 29/29 in 51 s.
  - **M4 fixed:** thin conductor on a PEC wall within 1.4e-6 of the closed form; the old formula was 12.6x off at t/delta = 0.5.
  - **PML change explained:** -41.8 vs -44.5 dB is the real-part impedance reference (lossy line), not a regression.
  - **M5:** port lead rule >= max(2h, w_max), merged as SPEC 14.2 (v0.9).
  - **Performance:** blocked complex front update plus auto AMD/ND3 ordering gives EM-4 16.0 -> 8.5 s per frequency; the em2d sweep 17.5 -> 14.6 s.
  - **Next:**
    - L7: enforce the port rule; WASM SIMD for the complex front update (compute-bound, 95 % of EM time); progress events.
    - L6: U4 (isosurface, arrows, compare, VTU), EM progress, URL drafts, and the M1 browser re-run once L8 cuts memory.

- L7 wave 5 done:
  - **Tests:** 31/31.
  - **Port rule:** enforced. EM-5a reduced warns (lead 40 vs 60 um required, DOF budget) and the case notes it.
  - **WASM SIMD complex front update:** EM-4 7.9 -> 4.3 s per frequency (1.82x vs the blocked default), em2d sweep 1.27x; S identical to 5.5e-11. Below the A9 > 2x gate, so it is opt-in (`factor: 'wasm'`). EM-4 overall since wave 3: 16.0 -> 4.3 s with WASM.
  - **Progress events** for the UI.
  - **Contract:** SPEC 14.3 (v0.10).

- L8 wave 2 done:
  - **Tests:** 31/31 (the coordinator re-ran 30, excluding the long mech-case test).
  - **Memory:** half-stencil f64 operator, f32 coarse levels, freed hierarchy. cowos_l at the case mesh (1.08e6 DOF) peaks at 1.40 GB in 158 s (`f32full`: 1.50 GB / 107 s); the 1.8e6-DOF mesh peaks at 2.0 GB. This unblocks the M1 browser run.
  - **E3 RVE:**
    - Periodic q1im cells for columns, strips, planes, line levels and stacks.
    - Checks: exact laminate to 1e-12, inside the Hill and Hashin-Shtrikman bounds, CTE identity to 1e-10, k equal to the thermal solver to 1e-9; Richardson n = 32/64 within 0.5 %.
    - ROM bias quantified (CD7).
    - Xilinx no-lid moves only +0.34 % with RVE.
  - **Thin-layer rule:** sub-cell film stacks merge into an exact laminate.
  - **E4 process_sequence:** DOF-dropping activation, stress-free on activation (a quarter-model bug was found and fixed). The COMSOL-273-style gate is within 2e-3 of lamination superposition.
  - **A2 minor items** fixed; curvature-fit and CD6 hooks added.
  - **Open:** the tcpmt.2026.3672227 process case is blocked (ROM void-matrix shear, the need for an underfill-cure material switch, undisclosed build-up). Material switch per step was assigned to L8 wave 3.

- L1 wave 3 done:
  - **Tests:** 67/67.
  - **CLI:** `--sensitivity` (thermal + CD5 CTE bounds), em3d dispatch, thermo_elastic and process_sequence dispatch with JEITA-labelled targets.
  - **Singular-point targets** become `indeterminate` (A2 S4; the Xilinx von Mises target is now indeterminate).
  - **`sim_targets.json`:** 247 rows, 89.6 kB, deterministic.
  - **Other:** CD6 plumbing; study-level thermal patches; x/y-normal contact resistance.
  - **G1 WASM gate failed:** 1.37-1.43x end to end (kernels 2.6-3.4x; setup dominates), so WASM stays opt-in.
- First end-to-end mechanics run table (L1, 15:04-15:48 PDT):
  - Xilinx no-lid +337.9 vs +335.3 um (pass); lidded sign miss.
  - fcbga 25 C sign-only pass; fcbga bare -7.6 vs +122 um (sign and magnitude miss).
  - glass s2 pass, s3 sign miss.
  - 50 mm at 260 C +852 vs -189 um (sign miss).
  - fan_out_panel 12.6 mm vs 0.7 mm (18x).
  - 120 mm timed out at 600 s.
  - Several high-temperature studies stop on library ranges (CD6 needed).
  - Coordinator assessment: the sign-miss pattern needs a root-cause study before any physics reading. A fresh lane L9 was launched for warpage sign/magnitude (convention vs inputs vs engine vs unmodelled physics). L1 is on M10 (selective coarsening for L8's low-memory MG: cowos_l 207, lidded Xilinx 514 iterations).

- **Milestone M1 reached (L6 wave 4; browser run 15:48-15:57 PDT):** `cowos_l/warpage_rt_ht` mechanics runs in the browser at the case mesh.
  - **Run:** quarter symmetry, grid 77 x 69 x 65. JEITA warpage on bottom:sbt_sr_b = -256.99 um at 25 C (161 s) and +207.54 um at 240 C (284 s). Superseded: these browser values used ROM homogenization, because the browser library had no RVE resolver (found by L6 wave 6); re-run requested. Largest Chrome process peaks at 1.43 GB; the result equals Node (-256.988 um).
  - **Against measurement:** TV 00091-a measured +64 um (25 C) and -148 um (240 C), and its DB row notes "sign as labeled in Fig. 6(c), convention not stated". Both flip sign RT -> HT but with opposite signs, and the RT magnitude is ~4x. Under L9 investigation; not interpreted yet.
  - **U4 delivered:** isosurfaces, flux and displacement arrows, compare runs (side by side and B - A), VTU export (cowos_r 14.4 MB in 0.2 s), compressed in-memory cases in the URL.

- L2 wave 6 done (CD7):
  - **Tests:** 29/29.
  - **RVE default:** `homog:` keys resolve through L8's RVE via an injected resolver (no import cycle), with ROM fallback (warning plus `provenance.rve_error`). RVE equals homog/resolveHomog to 1e-12.
  - **ROM fixes:** RDL z treated as a parallel path; void-matrix axial shear f x G.
  - **All-families RVE sweep:** 59 keys x 2 T, 136 s, no failures.
  - **Cost:** the first RVE call is ~1.8 s per key (cached after), adding ~30-40 s to a first browser run. A precomputed RVE table for the generator defaults was requested from L8.

- L8 wave 3 done:
  - **Tests:** 34/34.
  - **Per-step material switch:** stress-free restart in the new phase. The reflow-then-cure gate is within 3e-3 of lamination superposition.
  - **E8 skeleton:** Prony with WLF/Arrhenius shift, Simo-Hughes recursion. Constant-strain relaxation matches the Prony sum to 1e-10; the cooling ramp matches the hereditary integral to 3.9e-4 (order ~1.6).
  - **Data gap:** no readable Prony/WLF table exists in the cached corpus (JOINT2 Table 8 gives only E1/E2/Tg/CTE), so tests use a labelled synthetic set and the library is untouched. Viscoelastic EMC data must come from downloads; candidates for Wentao's list are to be identified.
  - **Not yet done:** viscoelasticity inside process sequences, non-uniform T, a case-level study type, the RVE precompute table (in progress).

- L6 wave 5 done:
  - **Targets:** browser target checks work (cowos_r: Rjc miss -26.7 % vs measured, pass +4.2 % vs paper model). Mechanics targets are attached for display, with DB condition/locator tooltips and a sign-convention note.
  - **EM:** progress with per-frequency timing and ETA.
  - **Arrows:** drawn on mirrored copies.
  - **Corrections by L6:** its wave-4 claim that `sim_targets.json` was missing was an unchecked assumption, now corrected; M1 run timestamps corrected.

- L9 warpage root-cause investigation done (`DevLog/lanes/L9-warpage-investigation.md`):
  - **Engine:** verified. Bilayer/trilayer plates through the CLI code path match CLT within 0.05 %, with the correct sign on both faces, quarter and full models, layer-order and heating/cooling flips.
  - **Root causes:**

    | Case | Cause |
    |---|---|
    | fcbga and glass bare | The modelled stacks are near-symmetric (only a pad-level Cu-fraction difference); the papers' asymmetry is undisclosed |
    | Xilinx lidded | The template lid foot gives a W shape (centre dome, rim lift), so the sign rule turns negative |
    | 50 mm at 260 C | Below-Tg EMC modulus used above Tg; cure shrinkage (0.16 %) not modelled. With shrinkage as an equivalent CTE: -150 vs -189 um, same sign |
    | fan_out | The measured strip was on a glass carrier, and sag/thickness is 28.5, so linear theory is invalid |
    | cowos_l | RT sign is a near-cancellation set by template lid/TIM coupling. The measured RT/HT ratio -2.31 implies a stress-free T of ~90 C, vs the 150 C template. The paper states no view side, and the RT shape is saddle-like |
    | 120 mm | The measured zero crossing is near 231 C, vs the 170 C input |

  - **Bugs found:** solder resist mapped to polyimide_rdl (the override was unused); C4 and micro-bump underfills share one key.
  - **Fixes dispatched:**
    - L4: re-scope untestable targets; implied-Tsf diagnostic; shape-aware sign gates.
    - L3: mapping fixes; 50 mm E2 variant; cowos_l full-area uBGA plus Tsf and lid-coupling sensitivity; 120 mm variant.
    - L8: shape_class; eigenstrain (cure shrinkage); E(T) across Tg; geometric nonlinearity.
    - L2: cure_shrinkage field; solder_resist alias; unusedOverrideKeys.
    - L1: unused-override warnings; per-temperature budgets; shape printout.
  - **Coordinator note:** the remaining warpage gaps are input and measurement-definition gaps in the source papers, plus documented unmodelled physics (viscoelastic EMC, cure shrinkage, geometric nonlinearity). None is tuned away.

- L2 wave 7 done:
  - **Tests:** 30/30.
  - **cure_shrinkage field:** EMC 0.16 % from JOINT2 Table 8, kind not stated. L8 is told to bracket the linear and volumetric readings, not to pick one.
  - **Mapping and helpers:** solder_resist routed to its own key; `unusedOverrideKeys` helper added.

- L4 wave 5 done:
  - **Checks:** 0 errors over 62 files.
  - **Untestable (with reason and activation conditions):** bare-substrate targets; fan-out a-m9 (strip on a carrier).
  - **CoWoS-L 00091:** sign-agnostic gates (coplanarity magnitude, RT/HT ratio bands lid [-4.2, -1.3] and ring [-0.96, -0.35], sign flip).
  - **Implied-Tsf diagnostic:**
    - CoWoS-L lid 90 C vs 150 C input; ring 161 vs 150.
    - 120 mm SUS430 231 vs 170; Cu stiffener 96 vs 170.
    - CoWoS-S 152 vs 150.
    - Paper FEMs that state their Tsf land 18-38 C above it.
  - **Shape gates:** sign gates require shape_class dome/bowl.
  - **Contract:** SPEC section 16 (v0.11).

- L1 wave 4 done (M10):
  - **Tests:** 70/70.
  - **Delivered:** `la/halfmg.mjs`, a direction-selective block MG on L8's half stencil (equal answers to 1e-8; 197 -> 82 iterations on an anisotropic plate).
  - **Real packages unchanged:** Xilinx lidded stays at 281 iterations, because the package is isotropic in-plane.
  - **Root cause:** the q1im fine level does not lock, but Galerkin coarse levels built with trilinear prolongation behave like Q1 and lock in bending, so MG misses the warpage modes. Measured on fcbga s2 (132k DOF): q1 33 iterations vs q1im 113. It is not caused by supports, anisotropy, the coarse solve or smoothing.
  - **Next (M10b):** a non-locking coarse space (rediscretised q1im coarse levels, or a smoothed prolongation); interim nu = 3.
  - **CLI:** unused-override warnings, `--mech-budget-s`, `--stream`, shape_class in the summary.

- L1 wave 5 done (M10b), gate failed, an honest negative result:
  - **Tests:** 71/71.
  - **Variants:** rediscretised q1im coarse levels gave 119 iterations; enriched coarse bending modes 228; a q1 hierarchy on the q1im system 284; Galerkin baseline 113 (fcbga s2, 132k DOF). Smoothed prolongation was not built (a 7x7x3 stencil breaks the 1.5 GB budget).
  - **Root-cause correction:** coarse-level locking is not the mechanism. q1im's softer bending spectrum converges slowly under z-line smoothing; plain q1 takes 33 iterations.
  - **Defaults:** nu stays 2 (nu 3/4 are not a time win). `buildHalfBlockMG` stays the drop-in.
  - **Open performance options** (not attempted):
    - warm start / Krylov recycling across temperature sweeps (cheap; queued for L8);
    - low bending-mode deflation reused across temperatures;
    - plane or patch smoothers.
  - L1 retired after 5 waves (context size).

- L5 wave 3 done (desktop EM references):
  - **Tooling:** scikit-fem has only lowest-order 3D Nedelec, so NGSolve 6.2 (uv wheel, LGPL) was added; venv 548 MB.
  - **Gates:** TE10 at orders 1/2/3 (order 1 -1.23 %, the same class as L7's +1.06 %); coax order 3 at 2e-4.
  - **EM-4 converged reference:** L 9.03 pH, C 9.37 fF (static order 3-4, cross-checked by full-wave order 3 at 202k DOF). L7's browser values are L +11/+14 %, C +15/+6 %, S11 +1.3 dB, and L rises with refinement. Suspect: ground-post return current.
  - **EM-5a reduced:** L5 port impedance 68.6 ohm. L7's high-resistivity S11 (-50 dB) is not physically possible (the line alone gives about -30 dB). Both routed to L7.
  - **EM-5a paper dip** (40-45 GHz): not bracketed. Fig. 2 geometry recovered within ranges; a Monte Carlo over 150 samples puts the dip at 26-66.5 GHz, median 57.5. The decisive unknown is the pad-to-TSV lead.
  - **Open decision for Wentao:** building Palace from source (est. hours, 1-2 GB build tree, unverified) for a full 12-TSV 3D model.

- L7 wave 6 done (bug hunt vs L5):
  - **Tests:** 31/31.
  - **Cause:** the 3D mesh under-resolves thin-line cross-sections. 3D port impedance is low (EM-4 39.2 vs converged 2D 43.3 ohm; EM-5a 53.9 vs 68.9 ohm). Ground posts were not the issue.
  - **EM-4 L fixed** with line-run de-embedding (L5's method, now the default): L 10.06 -> 9.27 pH (+2.7 %) at 60k DOF, 9.07 (+0.4 %) at 103k.
  - **Correction (audit A3 S3):** the companion was not on the same z-mesh as the device. With matching z-planes the auditor got 8.91 pH (-1.3 %), so the +2.7 % agreement was partly luck. The 103k-DOF value came from a prototype, not the shipped code. Lane L13 is re-running.
  - **Mesh-limited:** C stays +7..+11 % and S11 about +1.1 dB.
  - **EM-5a:** not fixable within the browser budget (would need > 7.6e5 DOF). L5's NGSolve results stand as the reference, and the case stays draft.
  - **New safeguard:** a port-impedance check (3D vs converged 2D, warns above 3 %).
  - **Contract:** SPEC 14.4 (v0.12).
  - **Coordinator note:** browser 3D EM is accurate for L to a few % with line-run de-embedding. C and fine-line blocks need the desktop reference or more DOF than the 6e4 browser budget, which is consistent with DevLog-010 A8.

- L3 wave 5 (interim):
  - **Tests:** 70/70 plus runner 8/8.
  - **Runner:** A2 S1/S2/S3/M6 done; mechanics sensitivity (nu, CTE); a variants runner for labelled knobs.
  - **Mapping:** solder resist now maps to `solder_resist` in all 8 SR families, so the overrides apply. With that fix, fcbga and glass assembled pass their signs at both temperatures; the bare substrates stay sign misses (symmetric stacks, untestable per L4).
  - **50 mm:** the E2 variant gives +100 vs -189 (cure shrinkage not modelled).
  - **cowos_l:** -250.7 / +187.6 vs +64 / -148. Spreads (not fits) at 25/240 C:
    - Tsf 90 C: -128 / +350, ratio -2.73 vs measured -2.31;
    - TIM E x0.1: +158 / +43;
    - TIM E x10: -603 / +300;
    - Al lid: -612 / +488.
    - So lid/TIM coupling and Tsf dominate the sign. These are template inputs not disclosed by the paper.
  - **InFO Table 5:** one k_eff does not fit all rows (+55 / 0 / -30 / -35 %).
  - **New issues:**
    - 120 mm warpage nearly flat with T (+458/+459/+503 at 30/148/222 C), physically suspicious. Routed to L9 wave 2.
    - cowos_s solver failures (not positive definite, once; MG non-convergence). Routed to L9.
    - CLI drops allow_extrapolation (L1 retired; new lane L10 owns cli.mjs and thermal/case.mjs).
    - L2: `sensitivity` status and an `underfill_c4` entry.

- L2 wave 8 done:
  - **Tests:** 31/31.
  - **`sensitivity` override status:** accepted for nu, k and CTE only.
  - **`underfill_c4`:** from the Bottom CUF row of ectc51529.2024.00155 Table IV, with inherited values marked `inherited_from` and the Xilinx C4 UF row as an alternative.

- L10 done (CLI and case-runner owner after L1):
  - **Fixes:** allow_extrapolation pass-through on all mechanics paths; one target unit-conversion helper; `mesh.thin` case key; study-level material overrides; `sensitivity` status plumbing.
  - **Bug fixed:** process_sequence studies were mis-dispatched as transients.
  - **Full engine suite:** 260/260 in 209 s (17:47-17:50 PDT, max RSS 1.2 GB).
  - **Regressions unchanged:** fcbga bare s2h; cowos_r Rjc 0.0079144.
  - **Contract:** SPEC section 17 (v0.13).
  - **Open:** the UI (`engineRun.ts`) and L3's variants runner call runMechCase directly, so they miss the case features. Routed to L6 and L3.

- L6 wave 6 done:
  - **Routing:** UI thermal and mechanics runs go through runCaseAll with the library and applyOverrides.
  - **Fix:** the browser library now attaches the RVE resolver (it was missing, so the browser used ROM).
  - **Browser = CLI:** cowos_r Rjc 0.0079144 C/W; fcbga bare -5.8026 / -5.5877 um.
  - **M1 browser numbers superseded:** they were ROM. A re-run is in progress.

- L8 wave 4 done:
  - **Tests:** 41/41 (coordinator re-ran 39 matching files, all pass).
  - **CD7 follow-up:** the library default is respected; conduction-only RVE for thermal calls.
  - **RVE precompute table:** 279 KB / 40 KB gz, 625 rows, 97.2 % hit rate on all family defaults.
  - **shape_class:** on the SPEC 16 path.
  - **Cure-shrinkage eigenstrain:** both readings bracketed; bilayer vs lamination to 2e-3.
  - **Rate-form E(T) sweep:** across Tg to 2e-3 (the total form is off by > 5 %).
  - **Total-Lagrangian geometric nonlinearity:** circular-arc sag within 0.6 %, where linear is 8.9 % high. The nonlinear/linear ratio is only +2.4 % (120 mm) and +3.8 % (fan-out), on heavily snapped geometry with the bifurcation check still open, so 'nonlinearity is not the cause of those gaps' is an estimate, not a result (audit A3 S6).
  - **Status (audit A3 S6):** nonlinearity, the rate-form sweep, viscoelasticity and cure-shrinkage eigenstrain are library functions only. No case key, CLI, runner or UI path reaches them yet; L10 is wiring case keys.
  - **Warm start:** -10..14 % iterations on Xilinx sweeps, no gain on cowos_l.
  - **Contract:** SPEC section 18 (v0.14).
  - **Open (L8 retired after 4 waves, context size):** MG deflation; a W-shape test; plate bifurcation vs L5; full-mesh nonlinear runs (q2s MG fails on the tangent); Newton line search; rate-form sweep without stresses/eigenstrain; no viscoelastic case-level study type.

- L2 small fix done:
  - **Tests:** 32/32.
  - **Guard:** RVE cte/elastic access is guarded (null when not requested; an error naming the key when needed).
  - **Default table:** Node loadLibrary() now attaches the precomputed RVE table by default, so the CLI and browser use the same values.

- **M1 final (L6 wave 7, 18:45 PDT; supersedes the ROM numbers above):** `cowos_l/warpage_rt_ht` at the case mesh.
  - **Mesh:** grid 77 x 69 x 65, 1,081,080 DOF, q1im, pcg_gmg, RVE homogenization via the precomputed table.
  - **Warpage** (JEITA ED-7306, bottom:sbt_sr_b, view top):
    - 25 C: -250.745 um, bowl, centre-minus-corner -246.0 um.
    - 240 C: +187.647 um, dome.
  - **Browser = CLI:** to 1.9e-7 um. Table vs live RVE: identical to 11 digits.
  - **Cost:** browser wall 151 s (s2) and 251 s (s3); peak 1.52 GB in the largest Chrome process (target 1.5 GB, marginally over). These were measured at rtol 1e-10. The package default is now 1e-7 (warpage change 1.5e-4 um), but Node RSS rose 1.36 -> 1.58 GB at 1e-7, so the browser peak at the new default is unmeasured and probably higher (audit A3 S7).
  - **Coordinator review:** viewed the s3 warpage page screenshot.
  - **Vs measured** (+64 / -148 um): opposite signs. Per L9 and the L3 spreads, the sign is set by the template lid/TIM coupling and the stress-free temperature, which the paper does not disclose, and the paper states no view side. L4 gates this case sign-agnostically (coplanarity, ratio, flip).
- L6 retired after 7 waves (context size). The UI is complete through U4 plus the EM pages.

- L3 wave 5 final:
  - **Tests:** 78/78.
  - **Runner:** routed through runCaseAll (L10 features).
  - **InFO Table 5:** now studies s3-s5 (one k_eff does not fit them).
  - **Materials:** C4 underfill keys applied; extrapolation lists with reasons.
  - **120 mm:** nearly flat with T because the template stiffener is bonded rigidly at 130 C (glue omitted). With the offset removed the package term is linear but its trend opposes the measured one. Full mesh not run.
  - **Critical bug found:** under the CD7 RVE default, case overrides of constituents never reach homogenized layers, and sensitivity bounds on constituents have no effect. Results swing 30-100 %: Xilinx no-lid ROM +340.6 (+1.6 %) vs RVE +226.7 (-32 %); fcbga core nu bounds have no effect under RVE.
    - Interim rule: runs that rely on overrides or sensitivity use `--homog rom`.
    - Fresh lane L11 launched to fix override propagation and table/cache fingerprinting, and to attribute the post-18:08 ROM shifts.
  - **Not done:** cowos_s re-runs, emib_t (1800 s timeout), fan_out re-run.

- L9 wave 2 done:
  - **120 mm flat warpage:** caused by a per-part stress-free 130 C on the SUS430 ring in a single-step model, a constant +440 ue strain.
    - With one common Tsf the response is exactly linear in (T - Tsf) (2.838 um/K on a minimal deck); the runner, temperature list and material strains are correct.
    - The paper cures the stiffener at 130 C after a 170 C underfill cure, which is a process sequence.
  - **cowos_s:**
    - The "not positive definite" failure does not reproduce. It was a transient code state while engine files were being edited.
    - "No convergence" is slow q1im/MG convergence, not singularity.
    - Warpage converges within 0.01 um by residual 1.5e-6, so the 1e-10 default wastes 80-95 % of wall time.
  - **Fixes dispatched:**
    - L3: 120 mm as a process_sequence with a glue layer.
    - L10: mechanics rtol default 1e-7 for package cases (1e-10 for gates), residual reporting, a per-part-Tsf warning, engine version stamp on results.
    - L4: 120 mm trend target on the sequence model; new `validation/RESULTS.md` ledger.

- L4 wave 6 done:
  - **Checks:** 0 errors.
  - **120 mm:** trend targets moved to the process_sequence `stiffener_attach_sequence`; single-step stiffener targets superseded.
  - **Results ledger:** `validation/RESULTS.md` added. It is the one-page verdict view (pass / miss / untestable / indeterminate / calibration per case, homogenization mode, lane source). RVE rows are flagged pending L11.

- L10 wave 2 done:
  - **Suite:** 270/270 in 153 s, 19:38-19:40 PDT. An earlier 267/270 run hit L11's homog test file mid-edit; it passed alone.
  - **Mechanics tolerance:** rtol 1e-7 for package studies, 1e-10 for gate cases; case key plus `--mech-rtol`.
  - **Convergence:** a `convergence` record on every result. Not converged below 1e-6 is a warning; at or above it, an error.
  - **Warnings and stamp:** per-part-Tsf single-step warning; `engine_version` stamp (source hash, data hash, dirty flag) on every result.
  - **Blocked:** runMechCase does not forward rtol, so L10 was authorized for a one-line cross-lane edit in mech/case.mjs (L8 retired).

- L10 wave 3 done:
  - **Cross-lane edit:** 3 lines in mech/case.mjs (authorized) forward rtol and maxIter.
  - **Suite:** 271/271 in 158 s.
  - **Package rtol 1e-7 vs 1e-10:**
    - Warpage changes by 1.5e-4 um.
    - cowos_l s2: 208 -> 83 iterations, total 198 -> 120 s (-39 %). fcbga s2 total -19 %.
    - cowos_l peak RSS 1.36 -> 1.58 GB at 1e-7 (unexplained, noted).

- L11 done (RVE override bug):
  - **Root cause:** the precomputed RVE table (attached by default since 18:08) was keyed by (key, T, Tsf) only, so overridden constituents got default rows.
  - **Fix:** constituent fingerprints on table rows and cache keys, plus a settings match; `provenance.rve_table`; `lib.homogStats()`. Table rebuilt with fingerprints: 625 rows, 302 KB. The 597 shared rows are bit-identical to the old table.
  - **Tests:** new `homog-overrides` (6); full suite 271/271. A fresh-context audit found one HIGH issue (thermal-only rows served rho/cp outside the fingerprint), fixed; 107/107 relevant tests after.
  - **After fix, case mesh:**
    - Xilinx no-lid RVE +341.2 um (+1.8 %), ROM +340.6.
    - Xilinx lidded RVE -50.8 (still the W-shape miss).
    - 50 mm E2 RVE +100.1.
    - fcbga core nu bounds now act under RVE (-3.6 / +3.5 %).
  - **Correction:** there was no ROM shift. L3's pre-18:08 values were live RVE (valid); its 18:30 "RVE" column was the bug.
  - **M1:** unaffected (cowos_l has no material overrides; table = live to 11 digits).
  - **Retired rule:** the interim `--homog rom` requirement is lifted.
  - **Contract:** SPEC 18.1 (v0.15).

- L3 wave 6 done:
  - **Tests:** 80/80.
  - **120 mm `stiffener_attach_sequence`:** package_cure at 170 -> 130 C, ring_attach with a silicone glue frame (template 100 um, bounds 50/300) at 130 C, then ramp_30..ramp_260. Coarse mesh, ROM; one coarse sequence takes 14-16 min.
  - **Cu-ring case** `120mm_warpage_cu.yaml`: trend passes (one sign change near 112 C vs ~96 C measured; magnitudes 1.1-1.9x).
  - **SUS430:** trend fails, +184/+165/+210/+230 vs +485/+135/+65/-85 um. The ring nearly freezes the 130 C shape; glue thickness changes it by <= 10 %. Untested suspects: ring stiffness and coupling, substrate CTE vs SUS430.
  - **Other cases:** none uses per-part stress-free temperatures.
- Wrap-up phase started: L4 aligns step names and refreshes `validation/RESULTS.md`; fresh-context audit A3 launched.

- L4 wave 7 done: 120 mm step names aligned; Cu trend wired; `validation/RESULTS.md` refreshed (L11 labels, M1, 120 mm sequence, L10 tolerance, EM-4).
- Final audit A3 (`DevLog/audits/sim_engine_audit_A3_2026-10-20.md`):
  - **Verdict:** no blocking findings.
  - **Runs:** suite 274/274 (139 s); `pnpm check` 0/0; build ok.
  - **Reproduced exactly:** cowos_r Rjc 0.0079144; fcbga +242.55 um; Xilinx no-lid +341.21 um; em2 5/5.
  - **Verified correct:** the override paths cannot bypass the fingerprint; L10 changes; ABCD algebra; browser routing.
  - **Significant findings and owners:**
    - S1: silent RVE -> ROM fallback, and no nu validation. L11, L10.
    - S2: browser crash on process_sequence results. New UI lane L12.
    - S3: EM-4 companion not on the same mesh, so the agreement is partly luck. New EM lane L13; record corrected above.
    - S4: em3d silent skips. L13.
    - S5: browser flux arrows ignore study overrides. L12.
    - S6: nonlinear, sweep, viscoelastic and cure-shrinkage are library-only. L10 is wiring case keys; record corrected above and in SPEC 18.
    - S7: record errors. L4 for RESULTS.md; coordinator for the M1 rtol/memory caveat above.
  - **Minors:** SPEC 14.2 wording and SPEC 19 (L10 contract) fixed by the coordinator (v0.16); others routed. Licence SPDX pass by the coordinator at the end (81 of 247 code files lack a header).

- L4 wave 8 done: RESULTS.md record fixes (cowos_r rows cite c-m1 and d-m10; Tj 99.368 C; Xilinx no-lid marked plausibility only; EM-4 marked under re-run; M1 rtol note).
- L11 wave 2 done:
  - **Tests:** suite 277/277.
  - **Override admissibility validation:** the A3 nu 0.6 probe is now refused.
  - **RVE -> ROM fallbacks** counted in `homogStats({family: true})`.
  - **Expression-form k overrides:** now reach homog constituents (`expr_T`).
  - **Contract:** SPEC 11.1 (v0.17).

- L10 wave 4 done:
  - **Suite:** 283/283 in 143 s.
  - **Now reachable from cases:** nonlinear (q2s total Lagrangian, <= 1e5 DOF), `thermo_elastic_sweep` (rate form across Tg), cure shrinkage off/library/both.
  - **Viscoelastic:** refused at parse time (no sourced data).
  - **homogenization_record** on results: fcbga s2 had 12 exact table hits, 0 live, 0 fallbacks.
  - **Engine stamp:** adds package3d/metrics hashes; dirty = 'untracked'.
  - **Contract:** SPEC section 20 (v0.18). The A3 S6 status line is updated.

- L13 done (em3d, after audit A3):
  - **Companions:** cut from the device mesh (same triangulation, z-planes, tet split, PML).
  - **EM-4 vs L5** (9.03 pH / 9.37 fF):
    - L 8.913 pH (-1.3 %) at 59.5k DOF and 8.966 pH (-0.7 %) at 97.4k DOF, converging from below.
    - C 10.53 / 10.03 fF (+12 / +7 %, mesh-limited); S11 still about +1.1 dB.
    - The 103k-DOF 9.07 pH figure is withdrawn (prototype). L7's +2.7 % was partly a mesh-mismatch offset.
  - **Guards:** deembed length, method validation, eligibility warnings, explicit z_check reasons, per-terminal zref, det-cancellation low-frequency warning (C off by +26 % at 0.01 GHz).
  - **Claim corrected:** companions are factorized per frequency, not once per sweep.
  - **Suite:** 290/290.
  - **Contract:** SPEC 14.5 (v0.19).

- L4 wave 9 done: EM-4 ledger rows updated from L13; withdrawn values marked.
- L12 done (UI owner after L6):
  - **A3 S2:** process_sequence results handled (`mechPack.ts`, per-step points, step picker, warpage per step). A finished solve is never lost.
  - **A3 S5:** flux arrows use the study's resolved library (info_os s3 TIM qz 1.178e5 W/m2; the old code was 1.875x off).
  - **A3 minors:**
    - fixture fallback blocked with a banner;
    - targets race fixed;
    - RVE counters summed over the attachment family;
    - the sim worker split (1.16 MB single file -> 129 kB entry + 31 lazy chunks). The 4.64 MB chunk is plotly on /explore and unchanged.
  - **em3d:** S/S_port_ref labels corrected; run page shows port checks and companions.
  - **Checks:** `pnpm check` 0/0, build ok.
  - **Coordinator review:** viewed seq-warpage-per-step.png.
  - **Engine bugs found, routed to L10:** an evalMechTarget throw on sequence step targets; step summary missing warpage; a false unused-override warning on thermal runs.

- L10 wave 5 done: sequence step targets no longer throw (unchecked with a reason); step summary shows warpage; no false unused-override warning on thermal runs. Suite 292/292.

### Coordinator decisions pending Wentao review

| # | Decision (2026-10-20) | Why | Revisit if |
|---|---|---|---|
| CD1 | Missing Poisson ratio or k may be filled only with basis `template`: same-class analog with a source, then a sourced class-range midpoint, then placeholder nu 0.30 for polymers. Every such value carries a sensitivity block (nu +-0.05; k x0.5 / x2), and engine results must report the spread. Never used for E, CTE or Tg. | No source in the corpus gives nu for EMC or the core laminate, the two materials that dominate warpage. Without this, mechanics refuses every package case. | Wentao prefers per-case overrides, or a source with nu appears |
| CD3 | A plain-number `cte_ppmK` case override means a secant (mean) CTE referenced to 25 C, recorded as an assumption (L2 wave 3, audit A1 M6) | Most paper tables give mean TMA values without stating the kind | A paper states instantaneous values |
| CD4 | `glass_en_a1` k = Borofloat 33 value 1.2 W/(m K), template analog with x0.5 / x2 sensitivity; silicone_adhesive nu uses the 0.30 placeholder for now | No public EN-A1 k. For silicone the placeholder is physically poor (near-incompressible rubber), so a sourced silicone nu is queued | A sourced silicone nu is found (queued for L2) |
| CD5 | Template CTE is allowed only for compliant layers (E <= 100 MPa at the study temperature: polymer/film TIMs, gels), with a CTE sensitivity factor [1/3, 3] and a rationale. Never for E, Tg or stiff materials | No source exists for TIM CTE. L8 shows x3 changes lidded warpage by ~1 %. The alternative was labelling an unsourced 100 ppm/K as `user`, which is wrong | A sourced TIM CTE appears, or sensitivity runs show it matters |
| CD6 | A case may set `materials.allow_extrapolation` (case or study level) to run beyond a material's data range; results carry an `extrapolated` provenance flag. Tables hold the last value; no extrapolation across Tg | Reflow-temperature warpage targets (250-265 C) sit above the ABF / underfill / polyimide data ranges (240-260 C) | Sourced high-temperature data appear |
| CD7 | `homog:*` keys resolve through L8's RVE resolver by default (`homogenization: rve`), with ROM as a selectable fallback (`materials.homogenization`). The RDL through-thickness topology follows the RVE (metal spans its level) | RVE is verified against exact and bounding solutions. ROM is 13-25 % low on bump-field transverse E/G/k and 25-30 % high on TSV fields, matching R1 lesson 9 | RVE cost becomes a problem in the browser |
| CD2 | Accepted L2 defaults, each recorded as an assumption in its entry: in-plane CTE applied to z for ABF and core; Cu CTE handbook constant 17.0 ppm/K above RT; SS304 CTE 20-100 C default (20-870 C mean as alternative); one paper's set per proprietary default | Keeps one traceable set per material | Sensitivity runs show these dominate |

## Contract changes

Requested by L4, 2026-10-20 (additive; to be merged into SPEC when an engine lane implements them):

| id | addition |
|---|---|
| L4-1 | `interface:<a>/<b>` selections and a `contact_resistance` thermal BC |
| L4-2 | `source_patch`: heat source on part of a face |
| L4-3 | `thermal_transient` study |
| L4-4 | `temperature_field` BC (prescribed T(x, y, z)) |
| L4-5 | per-face and point selections; roller, pin and fixed-component mechanical BCs |
| L4-6 | `initial_stress` / eigenstrain |
| L4-7 | full-tensor k and orthotropic material orientation |
| L4-8 | validation schema `ap-sim-val/0` keys as listed in `validation/README.md` |


## Wrap-up (2026-10-20 22:30 PDT)

Final checks by the coordinator:
- Engine suite: 292/292 in 157 s.
- `pnpm check`: 0 errors, 0 warnings. `pnpm build`: ok.
- CLI smoke: `cowos_r/thermal_rjc` s1 Rjc 0.0079144 C/W, balance 3e-13, RVE table hits, 0 ROM fallbacks.
- Dev server: tmux `apa-sim-ui`, http://localhost:47352/sim (log `logs/sim_ui_dev_<ts>.log`).
- Nothing committed. The licence SPDX pass was skipped per Wentao (78 code files lack a line).

How to test:
- **Browser:** http://localhost:47352/sim.
  - Case picker: 18 package cases, 5 EM cases, plus "Family defaults" sessions for the 12 families.
  - Parameters node (knobs with provenance badges), geometry preview, Compute.
  - Results: T field, slices and probes; displacement, von Mises and warpage vs T (JEITA); EM S / Smith / RLGC; process-sequence per-step tables; VTU export.
- **CLI:** `cd engine && node cli.mjs ../sims/<family>/<case>.yaml [--study sN] [--json] [--sensitivity] [--mech-rtol 1e-7]`.
  - Fast cases: cowos_r/thermal_rjc s1 (3 s), fcbga_organic/substrate_warpage s2 (~15 s), em/em2_cpwg_si_bridge (~20 s).
  - Heavy cases: cowos_l s2/s3 (2-4 min), em/em4_microbump_gsg (~1-2.5 min).
- **Results ledger:** `validation/RESULTS.md`. Root causes of the warpage misses: `DevLog/lanes/L9-warpage-investigation.md`.
- **Tests:** `cd engine && npm test`.

Status against DevLog-010 tranches:

| Tranche | Status |
|---|---|
| T0 | done |
| D1 materials | done (53 entries plus tier-2 Anand/plasticity data) |
| D2 families | done (12 generators) |
| D3 validation | MVP done, plus tier H and the results ledger |
| R desktop references | done (scikit-fem and NGSolve, thermal / mechanical / EM) |
| E1 thermal | done (incl. transient) |
| E2 thermo-elastic | done (q1im default) |
| E3 RVE | done (default, with precomputed table) |
| E4 process sequence | done (incl. per-step material switch) |
| E5 EM 2D | done |
| E6 EM 3D | done for browser-budget blocks (6e4 DOF); larger blocks need a desktop reference |
| E7 performance | gates measured: WASM opt-in (1.4-1.8x, below the 2x rule); MG robustness partly fixed |
| E8 constitutive | skeleton only (no sourced Prony data) |
| U1-U4 UI | done |
| M1 | done (cowos_l in the browser) |
| M2 | 12 categories have canonical cases |

Known limits:
- Absolute warpage accuracy is bounded by undisclosed paper inputs (lid/TIM, asymmetry, stress-free T) and by elastic EMC.
- q1im MG needs 100-300 iterations on large packages.
- EM-4 C is mesh-limited in the browser; EM-5a needs a desktop reference.
- Browser mechanics memory is ~1.5-1.6 GB on cowos_l.

Open decisions for Wentao:
1. CD1-CD7 (table above).
2. Palace build for a full EM-5a 3D model (L5 estimate: hours, 1-2 GB build tree, unverified).
3. The 8 manual downloads in `config/sim/manual_downloads.md` (viscoelastic EMC data, silicone nu, Si tables).
4. Whether to pursue absolute warpage agreement through more input research (lid/TIM, stress-free T) or keep it as sensitivity bands.
5. A commit plan for the new files (engine/, sims/, validation/, app/src/lib/sim, DevLog).
