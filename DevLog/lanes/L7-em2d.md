---
title: Lane L7 (tranche E5) - EM 2D cross-section solver, RLGC(f), MTL, S-parameters, Touchstone
date: 2026-10-20
status: wave 1 complete (hand-off ready); open issues listed at the end
scope: engine/src/em2d/, engine/tests/em2d*.test.mjs, sims/em/
authors: Claude (lane L7 subagent), at Wentao Jiang's request
---

# L7: EM 2D cross-section solver

Binding: DevLog-012 (lanes, shared rules), sims/SPEC.md, DevLog-010 A8, R3 (`DevLog/research/2026-10-20-sim-em-regional-method.md`).
Port source: eo-modulator-atlas `engine/` at commit eb97f96 (GPL-3.0-or-later).

## Plan (written before coding)

### Modules (`engine/src/em2d/`)

| File | Contents | Origin |
|---|---|---|
| `_port/robust-predicates.mjs` | orient2d, incircle (Shewchuk adaptive predicates) | vendored from npm `robust-predicates` 3.0.3 (Unlicense, public domain); engine/package.json is not in L7 write scope |
| (`../la/sparse.mjs`, `../la/ldlt.mjs`, `../la/complex.mjs`) | CSR patterns, AMD, supernodal analysis, complex-symmetric multifrontal LDL^T | L1's ports of EO `src/{sparse,ldlt,complex}.mjs` (private `_port/` copies were used until 13:35, then removed) |
| `geometry.mjs`, `mesh.mjs` | PSLG, Delaunay + Ruppert refinement, graded size field | EO `src/geometry.mjs`, `src/mesh.mjs`; local change: conductor triangles are refined (not frozen), predicates import path |
| `section.mjs` | cross-section spec (rectangles / polygons / circles, conductors with roles, dielectric regions, box BCs) -> mesh with skin-depth grading | new |
| `fe.mjs` | P1/P2 Lagrange spaces, stiffness and mass assembly with complex per-triangle coefficients, Dirichlet restriction | new (P2 space from EO `fem.mjs` p2Space) |
| `dielectric.mjs` | constant, Djordjevic-Sarkar (1-point fit), multi-term causal fit (DS + Debye + Lorentz, non-negative least squares), table (non-causal, flagged) | new |
| `roughness.mjs` | Hammerstad-Jensen, Huray (snowball), cannonball-Huray parameters | new |
| `rlgc.mjs` | electrostatics with complex permittivity -> C(f), G(f); magneto-quasi-static A_z with eddy currents and per-conductor voltage-drop unknowns -> R(f), L(f); PEC-conductor path L = mu0 eps0 C0^-1; roughness as per-conductor loss scaling | new |
| `dense.mjs` | small complex dense linear algebra: LU solve/inverse, Hessenberg + shifted QR eigen, singular values | new |
| `mtl.mjs` | modal decomposition of ZY, characteristic admittance, chain matrix, 2N-port Y and S, renormalization, mixed mode, cascade, NEXT/FEXT, passivity/reciprocity | new |
| `touchstone.mjs` | Touchstone 2.0 writer, 1.x/2.0 reader | new |
| `closed-forms.mjs` | coax, parallel plate, Hammerstad-Jensen microstrip, Cohn stripline, CPW conformal map (AGM K(k)), Bessel round-wire internal impedance, skin depth, slab surface impedance | new (formulas; EO rf-line.mjs slab impedance) |
| `run.mjs` | `runEm2d(caseConfig)` -> results JSON (SPEC section 5 style) | new |
| `cli.mjs`, `index.mjs` | stand-alone case runner (until `engine/cli.mjs` dispatches `family: em2d`); public exports | new |

### Physics

- Units SI internally; geometry in um at the mesher (EO convention), converted at assembly.
- Phasor exp(+j w t); eps* = eps' - j eps''; Y' = G' + j w C' = j w C*'; G' = w Im(-C*').
- C*, G: Laplace on the dielectric DOFs, conductor DOFs Dirichlet (signal i at 1 V, others and grounds 0), box sides `pec` (phi = 0) or `pmc` (natural). C*_ij = eps0 phi_i^T K* phi_j (bilinear, no conjugation).
- R, L: -div(1/mu grad A) + j w sigma A = sigma u_k in conductor k (u_k = voltage drop per length, unknown per conductor), I_k = int_k sigma (u_k - j w A). Schur complement on the conductor unknowns: Y_c = G_dc - j w B^T (K + j w M)^-1 B; impose I_ground = -sum I_signal ("return: ground") or let a PEC box carry the remainder ("return: ground_and_box"); Z = R + j w L = loop impedance u_i - u_g. Box sides `pec` -> A = 0, `pmc` -> natural.
- Mesh: one mesh per cross-section, graded to delta(f_max)/n inside and around every lossy conductor (window around signal conductors on wide planes), symbolic factorization reused for all frequencies.
- Roughness: per-conductor dissipation split R = sum_k Re D_k (D_k = int_k J_i conj(J_j) / sigma); rough R = sum_k K_k(f) Re D_k; optional equal increase of internal reactance.
- MTL: ZY = T diag(gamma^2) T^-1; Y_C = Z^-1 T gamma T^-1; 2N-port Y from gamma coth / csch in the modal domain (series near gamma l = 0); S from Y with real per-port reference impedances; mixed mode by the Bockelman-Eisenstadt M matrix.

### Gates (tests, `engine/tests/em2d*.test.mjs`)

EM-0: coax C', L', Z0; parallel plate C, L, slab surface impedance R + j w L_int exact; microstrip Z0, eps_eff vs Hammerstad-Jensen; stripline vs Cohn; CPW vs conformal map (56.0 ohm case); coupled stripline FEXT = 0 (homogeneous, matched sqrt(Ze Zo)); round-wire R(f) vs Bessel; DC R vs 1/(sigma A); lossless unitarity; reciprocity; Touchstone round trip; DS causality (Kramers-Kronig numeric check).
EM-1: ABF microstrip on glass vs measured IL/mm (`ectc51846.2026.00389-b-m2,m5,m8,m11`). EM-2 if time allows.

### Out of scope here / later

- Full-wave Nedelec check (EO vector-mode.mjs): optional; decided after EM-1 (see progress).
- Lossy-Si eddy currents in the MQS solve (Si sigma enters only the electrostatic eps*).

## Progress log

- 2026-10-20 13:17 Plan written. L1 `engine/src/la/` not present yet -> private copies in `em2d/_port/`.
- 2026-10-20 13:30 Ported geometry.mjs, mesh.mjs (import path only), vendored robust-predicates (Unlicense) into `_port/`.
  Wrote closed-forms, dense (complex LU, Hessenberg + shifted QR eigen, expm, singular value), fe (P1/P2), section
  (region table, skin-depth size field, ground-face window), dielectric (const, DS, causal NNLS fit, table),
  roughness (Hammerstad, Huray, cannonball), rlgc (ES complex C/G, MQS A_z with Schur on conductor voltage drops,
  DC inductance, dissipation split), mtl, touchstone.
- 2026-10-20 13:33 Scratch checks (not yet tests): parallel plate P2 R(100 GHz) vs slab coth formula -6.6e-5, L -5e-7
  (P1: 0.7 %); microstrip vs Hammerstad-Jensen within 0.3 % Z0 / 0.5 % eps_eff; coax C, L 2.4e-6 (256-gon);
  round wire R vs Bessel <= 7.5e-5 at a/delta = 1, 3, 10; coupled stripline FEXT -115 dB, NEXT at lambda/4 equals
  the coupler value (Ze - Zo)/(Ze + Zo) to 3 decimals; unitarity and reciprocity 1e-13.
- 2026-10-20 13:35 L1 landed `engine/src/la/{sparse,ldlt,complex}.mjs` (bodies identical to EO eb97f96, checked by
  diff). Switched em2d imports to `../la/`, removed the private copies from `_port/` (robust-predicates stays).
- 2026-10-20 13:38 EM-1 mesh convergence (P2, 200 GHz, smooth Cu): R' 2846.2 (skin_cells 3, 282k tris) vs 2849.9
  (skin_cells 1, 84k) vs 2859.6 (skin_cells 1, grade 0.6, window 30 um, 36k tris, 170 ms/frequency); ground window
  45 / 90 / 180 um changes R' by < 0.03 %. New defaults: skin_cells 1, grade 0.45, window 1.5 x signal-ground gap.
- 2026-10-20 13:39 ABF Type-A 25 C causal fit (DS + Debye + Lorentz NNLS) cannot follow the DB points: max error
  Dk 1.3 %, Df 8.8 % (the extracted Dk rises 2 % with f while Df rises 4x; a passive causal model does not reproduce
  both). EM-1 therefore runs the `table` model (HFSS-style, exact at the points, non-causal) as primary and the causal
  fit as a variant.
- 2026-10-20 13:41 `run.mjs` (case parser, name-keyed variant patches, targets), `cli.mjs`; EM-1 case
  `sims/em/em1_abf_microstrip_glass.yaml` with 6 variants. Profiling pass (EM-1 base, 54 frequencies): 70.5 % of CPU
  in the complex supernodal LDL^T factor, 6.6 % update, 6.6 % solves, 7 % em2d assembly / Schur / capacitance loops.
  AMD vs nested dissection on the 95.6k-DOF MQS matrix: nnzL 3.0e6 vs 2.2e7, factor 217 ms vs 22.6 s -> AMD stays.
- 2026-10-20 13:45 EM-2 case `sims/em/em2_cpwg_si_bridge.yaml` (5 of 7 designs; M2M3 skipped, Si resistivity N/A);
  target mode selection by parity (`mode: odd`); target `variant` may be a list. EM-1 80 C / 115 C variants added.
- 2026-10-20 13:48 Tests: 18/18 pass (`node --test tests/em2d*.test.mjs`, 10.7 s). DC / low-frequency continuity
  checked (EM-1 L' 691.98 nH/m at DC vs 692.14 at 1 kHz; R' 135.43 ohm/m both). EM-1 Touchstone (54 f) re-read:
  max singular value 0.9937, reciprocity 2.9e-12.
- 2026-10-20 13:49 Full-wave Nedelec check not done (decision below, open issue 1).

## Implemented (wave 1)

- Mesher and geometry ported (EO eb97f96); conductor interiors refined with a skin-depth size field (h0 = delta(f_max) /
  skin_cells, grade, fine window only on signal-facing faces of wide ground planes, far_factor elsewhere); circles,
  half annuli (coax shells), polygons, rectangles; tied ground conductors may touch.
- P1 / P2 Lagrange spaces (P2 default). One mesh and one symbolic factorization per section for the whole sweep.
- C, G: electrostatics with complex permittivity per material, exact complex solve per frequency (cached when the
  permittivities do not change); vacuum C0 for L_ext = mu0 eps0 C0^-1.
- R, L: A_z magneto-quasi-statics with volumetric conductors (skin and proximity effects), conductor voltage-drop
  unknowns eliminated by a Schur complement; returns `ground` (net current zero in the ground group) or `box`
  (pec box is the return); exact DC limit (uniform currents, DC inductance); discrete power identity check
  (`power_balance_rel`, 1e-15..1e-9 in every run).
- Conductor model `pec` (R = 0, L = mu0 eps0 C0^-1) for lossless / closed-form checks.
- Roughness: Hammerstad-Jensen, Huray, cannonball-Huray as per-conductor scaling of that conductor's dissipation
  share (exact split R = sum_k Re D_k), optional equal increase of internal reactance (default on).
- Dielectrics: const, Djordjevic-Sarkar 1-point fit (causal), multi-point causal fit (DS + Debye + Lorentz, NNLS,
  passive), frequency table (non-causal, warned), DC conductivity term.
- Conductor temperature: sigma(T) = sigma_ref / (1 + tcr (T - T_ref)).
- MTL: modal decomposition (eigenvalues of ZY by complex Hessenberg-QR, sorted by beta, parity for pairs), Yc / Zc,
  exact chain matrix by matrix exponential (degeneracy-proof; modal chain matrix kept as a cross-check, agree 1e-10),
  2N-port Y, S with per-port real references, S <-> Y <-> Z, renormalization, chain cascade, mixed mode
  (Bockelman-Eisenstadt), IL / RL / NEXT / FEXT tables, passivity (max singular value), reciprocity, unitarity.
- Touchstone 2.0 writer (RI, `[Two-Port Data Order] 21_12`, `[Reference]` when references differ) and 1.x / 2.0 reader.
- `runEm2d(caseConfig)` and `src/em2d/cli.mjs`.

## API

```js
import { runEm2d } from './src/em2d/run.mjs';      // or './src/em2d/index.mjs'
const res = runEm2d(caseObject, { variants: ['base', 'smooth'], log: console.error });
// res = {case, title, family: 'em2d', status, assumptions, missing, variants: [VariantResult]}
// VariantResult = {variant, title, status, type: 'em2d_rlgc', fields: null,
//   mesh: {nodes, tris, condTris, minAngleDeg, mesh_ms, order, sizing, dof_es, dof_mqs, nnzL_es, nnzL_mqs},
//   derived: {signals, conductors: {name: {sigma_S_m, basis}}, return, freqs_GHz,
//             rlgc: [{f_GHz, R_ohm_per_m, L_H_per_m, G_S_per_m, C_F_per_m (N*N row-major), diag}],
//             modes: [{f_GHz, modes: [{alpha_dB_mm, alpha_Np_m, beta_rad_m, eps_eff, parity, voltage_vector}], Zc_ohm}],
//             lines: [{length_mm, zref_ohm, tables: [{f_GHz, IL_dB, RL_dB, NEXT_dB, FEXT_dB}], checks, mixed_mode?, s_params}],
//             materials: {key: {model, causal, params, fit}}},
//   targets: [{metric_id, quantity, f_GHz, value, unit, computed, rel_err, tolerance, pass, tier}],
//   touchstone: [{name, text}], timing: {mesh_ms, setup_ms, per_freq: [...], mean_freq_ms, total_ms}, warnings}
```

Lower level: `buildSection(spec)`, `prepareRlgc(sec, makeMaterials(table), {conductor_model, return,
roughness_reactance})`, `rlgcAt(P, fHz)`, `vacuumCapacitance(P)`; `mtl.*` (zyFromRlgc, modalAnalysis, chainMatrix,
chainToY, yToS, sToY, sToZ, zToS, renormalize, lineS, cascadeChain, mixedMode, crosstalk, passivityMaxSv,
reciprocityError, unitarityError); `writeTouchstone`, `readTouchstone`; `closedForms.*`.

CLI hook for L1 (`engine/cli.mjs`): dispatch before its own `parseCase` (which rejects the `em2d` key):
`if (c.family === 'em2d') return runEm2d(c, {variants})`; `--touchstone-dir` writes `v.touchstone[i].text` to
`v.touchstone[i].name`. Exit code 2 when any target has `pass === false` (as `src/em2d/cli.mjs`).

## Proposed SPEC addition: section 7 "EM 2D case" (coordinator to merge)

`sims/em/<case>.yaml`, `family: em2d`. Top-level keys: `schema, id, title, status, family, em2d, targets,
assumptions, missing, notes`. Unknown keys are errors. Lengths in um (`_um`), frequencies in GHz (`_GHz`), temperatures
in C (`_C`), conductivity `_S_m`.

```yaml
em2d:
  section:
    box: {x_um: [x0, x1], y_um: [y0, y1], bc: {left|right|bottom|top: pec | pmc}}   # pec: phi = 0, A_z = 0 (tied to
                                                                                  # the reference); pmc: natural
    background: air                        # material key ('air' / 'vacuum' predefined, eps_r 1)
    dielectrics: [{name, material, rect_um: {x: [a, b], y: [c, d]} | poly_um: [[x, y], ...], ref?, note?, status?}]
    conductors:  [{name, role: signal | ground, conductor: <conductor_materials key> | sigma_S_m,
                   rect_um | poly_um | circle_um: {c: [x, y], r, n} | half_annulus_um: {c, r_in, r_out, n, upper},
                   roughness?: {model: hammerstad, rq_um} | {model: cannonball, h_rms_um} |
                               {model: huray, spheres: [{a_um, n}], tile_um2, area_ratio}, ref?, note?, status?}]
  materials:  {key: {model: const, eps_r, tan_delta?, sigma_S_m?} | {model: djordjevic_sarkar, eps_r, tan_delta,
              f_ref_Hz, f_low_Hz?, f_high_Hz?} | {model: causal_fit | table, points: [{f_GHz, Dk, Df}], ...}; ref?, note?}
  conductor_materials: {key: {sigma_S_m, tcr_per_K?, T_ref_C?, ref?, note?, status?}}
  temperature_C: 25                       # conductor sigma via tcr
  conductor_model: volumetric | pec       # default volumetric
  return: auto | ground | box             # auto: ground if a ground conductor exists, else box
  roughness_reactance: true
  mesh: {order: 1 | 2, skin_cells: 1, grade: 0.45, f_max_GHz, max_edge_um, layer_cells: 3, conductor_cells: 4,
         window_um, far_factor: 6, max_vertices: 400000, min_edge_um}
  sweep: {f_GHz: [...]} | {start_GHz, stop_GHz, points, spacing: lin | log}       # target frequencies are merged in
  lines: [{length_mm, zref_ohm: 50 | [per signal] | z0}]                        # S of the 2N-port per length
  mixed_mode_pairs: [[i, j], ...]          # signal indices
  touchstone: true | false
  variants: [{id, title?, patch: {...}, note?}]   # deep merge, null deletes; dielectrics / conductors keyed by name
targets: [{metric_id, quantity: alpha_dB_mm | Z0_ohm | eps_eff | IL_dB | RL_dB | NEXT_dB | FEXT_dB | R_ohm_per_m |
           L_H_per_m | C_F_per_m | G_S_per_m, f_GHz, value, unit, tolerance: {rel | abs}, tier, variant?: id | [ids],
           signal?, victim?, aggressor?, line?, mode?: index | odd | even, locator?, note?}]
```

Results: section 5 shape with `type: em2d_rlgc`, `fields: null` (no field arrays), as in API above.

## Gate results (EM-0 and unit tests; `EM2D_GATE_LOG=1 node --test tests/em2d*.test.mjs` prints these)

| Gate | Reference | Result | Tolerance |
|---|---|---|---|
| coax C', L', Z0 (b/a = e, eps_r 2.25, 256-gon) | 2 pi eps / ln(b/a), mu / (2 pi) ln(b/a) | +2.35e-6, -2.35e-6, -2.35e-6 | 2e-4 |
| parallel plate C, G/(w C) | eps w / h, tan delta | 1e-13, 2e-13 | 1e-10 |
| parallel plate DC R, DC L | 2/(sigma w t); mu0 h / w + 2 mu0 t / (3 w) | 4e-15, 3e-14 | 1e-10, 1e-6 |
| parallel plate R, L at 1 / 10 / 100 GHz (P2) | slab Z_s = (k / sigma) coth(k t) | R 6e-8 / 8e-6 / 6.6e-5; L 5e-8 / 9e-7 / 5e-7 | 1e-3, 1e-4 |
| microstrip u = 1, 3 (t/h 0.02, eps_r 4) | Hammerstad-Jensen | Z0 -0.19 %, -0.28 %; eps_eff -0.008 %, -0.10 % | 1 % |
| CPW w 30, s 18 um, eps_r 9.3 (t 0.2 um) | conformal map 55.96 ohm (30 pi form 56.00, R3) | -0.47 % | 1 % |
| stripline w/b 0.5, t/b 0.0025 | Cohn K(k)/K(k') | -0.81 %; L C = mu eps to 7e-14 | 1 % |
| coupled stripline, homogeneous, Zref sqrt(Ze Zo) | FEXT = 0; NEXT(lambda/4) = (Ze - Zo)/(Ze + Zo) | FEXT -116 .. -124 dB; NEXT -10.5258 vs -10.5257 dB | < -60 dB; 0.01 dB |
| lossless S unitarity, reciprocity | S^H S = I, S = S^T | 1.3e-13, 1.3e-13 | 1e-10 |
| round wire R, X_int at a/delta = 1, 3, 10 | Bessel J0/J1 | R 1e-6 / 7.4e-5 / 7.5e-5; X 3e-5 / -7e-6 / 7e-5 | 2e-3 |
| round wire DC R | 1 / (sigma A) | 2e-16 | 1e-12 |
| lossy coupled microstrip (DS PI) | low-loss even / odd R/(2 Z0) + G Z0/2 | <= 1.2e-3 | 2 % |
| expm vs modal chain matrix, cascade of halves, Y symmetry | identities | < 1e-10 | - |
| Touchstone 2.0 round trip (2, 4 ports), 1.x MA read | identity | < 1e-12 | - |
| DS model vs log-uniform Debye integral | Djordjevic-Sarkar construction (causal) | < 1e-6 | - |

## EM-1 comparison (ectc51846.2026.00389-b, measured TRL IL/mm, paper p.5 Table II), modal alpha in dB/mm

| Variant | 33 GHz (0.08) | 77 GHz (0.155) | 140 GHz (0.265) | 200 GHz (0.45) |
|---|---|---|---|---|
| base: Hammerstad Rq 0.19 um on all Cu, ABF table, sigma 5.69e7 (25 C) | 0.0969 (+21.2 %) | 0.1916 (+23.6 %) | 0.3279 (+23.7 %) | 0.4968 (+10.4 %) |
| smooth | 0.0808 (+1.1 %) | 0.1421 (-8.3 %) | 0.2333 (-12.0 %) | 0.3666 (-18.5 %) |
| rough_signal_only | 0.0938 (+17.2 %) | 0.1818 (+17.3 %) | 0.3090 (+16.6 %) | 0.4708 (+4.6 %) |
| cannonball (h_rms 0.19 um, all Cu) | 0.0905 (+13.1 %) | 0.1729 (+11.5 %) | 0.3016 (+13.8 %) | 0.4749 (+5.5 %) |
| causal_fit ABF | 0.0980 (+22.4 %) | 0.1911 (+23.3 %) | 0.3329 (+25.6 %, miss) | 0.4929 (+9.5 %) |
| box_20h (clearance) | 0.0967 | 0.1911 | 0.3269 | 0.4951 |

| Temperature (base roughness) | 33 GHz | 77 GHz | 140 GHz | 200 GHz |
|---|---|---|---|---|
| 80 C (measured 0.096 / 0.2 / 0.32 / 0.519, b-m3,m6,m9,m12) | 0.1046 (+8.9 %) | 0.2036 (+1.8 %) | 0.3503 (+9.5 %) | 0.5371 (+3.5 %) |
| 115 C (measured 0.11 / 0.21 / 0.43 / 0.596, b-m4,m7,m10,m13) | 0.1098 (-0.2 %) | 0.2108 (+0.4 %) | 0.3783 (-12.0 %) | 0.5720 (-4.0 %) |

- Z0 70.7-72.0 ohm over 10-220 GHz (design 70 ohm), eps_eff (beta / k0)^2 2.52-2.57. Loss split at 200 GHz (R/(2 Z0), G Z0 / 2): smooth
  conductor 0.177 + dielectric 0.189 dB/mm; base conductor 0.307 + dielectric 0.190 dB/mm.
- Box clearance (10 h -> 20 h): alpha changes -0.2 .. -0.4 %. Mesh: skin_cells 1 vs 3 changes R' by 0.13 % at 200 GHz
  (convergence study run with the causal-fit ABF, smooth Cu).
- Reading: smooth Cu matches at 33 GHz and falls 8-19 % short above; Hammerstad on every surface overshoots by
  21-24 % up to 140 GHz. The truth sits between (cannonball +5..+14 %, signal-only +5..+17 %). Likely causes, not
  resolved with the DB inputs: (1) roughness per surface is unknown (one Rq value, surface not stated) and the
  Hammerstad form already gives K = 1.23 at 33 GHz (Rq/delta 0.53); (2) plated-Cu conductivity is N/A (IACS used);
  (3) the measured 25 C row rises 20 % to 80 C at 33 GHz while the model rises 8 % (TCR + Df only), so the 25 C row
  may be low relative to the other two temperatures; at 80 / 115 C the base model is within -12 .. +10 %; (4) the
  ABF table is exact at the 6 points, the causal fit is off by up to 8.8 % in Df (KK-inconsistent extracted data).

## EM-2 comparison (eptc67330.2025.11392620-a-e1..e5, measured L-2L differential IL/mm at 56 GHz, p.3 Table I)

| Design | Measured | Odd-mode alpha | Error | Zdiff = 2 (Zc11 - Zc12) |
|---|---|---|---|---|
| M4M1W25 (base) | 0.441 | 0.458 | +3.8 % | 95.6 ohm |
| M4M1W2 | 1.353 | 1.405 | +3.8 % | 95.0 |
| M4M1W10 | 0.634 | 0.706 | +11.4 % | 95.3 |
| M4M3W2 | 1.351 | 1.403 | +3.8 % | 95.8 |
| M4M3W5 | 0.937 | 1.012 | +8.0 % | 95.0 |
| M4M1W25 air_top (no top PI) | 0.441 | 0.417 | -5.4 % | 101.5 |

Design target Zdiff 100 ohm (a-m1). The unknown top-PI thickness brackets the W25 result (-5.4 .. +3.8 %). Not run:
M2M3W2/W5 (Si resistivity N/A). Metal cheesing and via walls not modelled (assumptions in the case file).

## Timing (Node 23.7.0, `nice -n 10`, machine shared with other lanes)

| Case | Mesh | DOF (es / mqs) | Frequencies | Wall | Per frequency |
|---|---|---|---|---|---|
| EM-1 base | 47.2k tris, 113 ms; setup 385 ms | 46.5k / 95.5k (nnzL 1.0e6 / 3.0e6) | 54 (10-220 GHz) | 16.4-18.6 s | 295-334 ms (MQS factor ~211 ms, ES ~70 ms) |
| EM-2 base | 32.7k tris | 35.2k / 66.0k | 34 (1-65 GHz) | 7.2 s | 201 ms |
| EM-0 + unit + EM-1 + EM-2 tests | - | - | - | 10.7 s (18 tests) | - |

Peak RSS 876 MB (EM-1, all 6 25 C variants in one process). The 50-point target (< ~30 s) holds for EM-1.

## Open issues

1. Full-wave check (EO Nedelec vector-mode solver) not done. Reason: the EO solver is built around the optical
   model chain (optics.mjs, section.mjs, materials.mjs, vector-dense.mjs); its lossy-metal path is validated for
   eps_m = -100 - 10 j (EO DevLog-025 G8), not for RF Cu (eps ~ -j 1e7 at 100 GHz) at k0 h ~ 0.06, where Nedelec
   formulations show low-frequency breakdown. Needs a port plus a scaled formulation; candidate for E6 (3D blocks need
   the same 2D port mode solver anyway).
2. EM-1 25 C sits between smooth and Hammerstad-on-all-surfaces (see reading above); no tuning was applied.
3. ABF Type-A Table I data are not representable by a passive causal model to better than 1.3 % Dk / 8.8 % Df.
   Time-domain use (TDR, eye) should use the causal_fit variant and state the Df misfit.
4. Magnetic materials (mu_r != 1) and eddy currents in lossy Si are not in the MQS solve; Si enters only through
   eps* in the electrostatics (the right quasi-TEM / MIS slow-wave treatment for typical Si resistivity, not for
   heavily doped Si with skin depth < substrate thickness).
5. Ground-plane cheesing (EM-2 3D variant) and via walls need E6 (3D) or an equivalent-sheet model.
6. The Huray / cannonball tile-area reading is R3's [unverified] interpretation of Simonovich Eq. 5.
7. Hammerstad-Jensen microstrip formulas were transcribed from memory [unverified]; the gate tolerance (1 %) is the
   closed-form accuracy class, and the FEM agrees to 0.3 %.
8. The DS corner defaults (1 kHz, 1 THz) are template values; cases should set them when a source gives them.
9. Touchstone with `zref_ohm: z0` (frequency-dependent reference) is not written (warning); use a fixed reference and
   renormalize.

# Wave 2 / E6 phase 1: 3D EM discontinuity blocks

Assignment (coordinator, 2026-10-20): E6 phase 1 per DevLog-010 A8 and R3 Sec. 2-3. Write paths: `engine/src/em3d/`,
`engine/tests/em3d*.test.mjs`, `sims/em/` (3D cases), this section.

## Plan (written before coding)

- **Mesh (spike first):** candidates are (a) structured hex grid with staircased cylinders, (b) layered "2.5D" mesh:
  the em2d Delaunay mesher triangulates the xy plane conforming to every footprint (traces, pads, bump / via circles,
  box), the triangles are extruded through the z planes of every solid (plus subdivision), and each prism is split
  into 3 tets with the min-global-index diagonal rule (Dompierre et al. 1999), which keeps neighbouring quad faces
  conforming. Spike metric: coax C' error per DOF on the cross-section (the 3D mesh is that cross-section extruded, so
  for vertical cylinders the per-DOF accuracy is the 2D one). Decision recorded below.
- **Elements:** first-order Nedelec (Whitney) edge elements on tets, oriented by global vertex index; closed-form
  curl-curl and mass matrices with diagonal complex tensors (PML). Units SI (mesh um -> m at assembly).
- **Weak form:** int (1/mu_r) curl E . curl v - k0^2 int eps_r E . v + boundary terms = 0, phasor exp(+j w t).
  - PEC (conductor volumes and pec box sides): edges Dirichlet 0; pmc sides natural.
  - IBC (thick conductor): + j w mu0 / Z_s int E_t . v_t on conductor faces, Z_s = (1 + j)/(sigma delta) (x roughness K).
  - Transition BC (thin horizontal conductor slab, top / bottom faces paired by the extrusion): + j w mu0 sum_ij Y_ij
    int E_j . v_i, Y = Z_s^-1 [[coth k t, -csch k t], [-csch k t, coth k t]], k = (1 + j)/delta; thick limit -> IBC,
    thin limit -> sheet resistance 1/(sigma t). Side faces of thin slabs get the thick IBC.
  - Stretched-coordinate PML on box slabs: Lambda = diag(sy sz/sx, sx sz/sy, sx sy/sz), nu = Lambda^-1 / mu_r,
    eps_eff = eps_r Lambda, s = 1 - j a(d), a = a_max (d / L)^m scaled as 1/w (frequency-independent absorption),
    a_max from a target normal-incidence reflection R0.
  - Wave port on a box side: single-mode first-order modal port n x curl E = j beta E_t - 2 j beta a e_t (exact for
    a TEM or TE mode with E_n = 0). Mode e_t: quasi-TEM from a 2D electrostatic solve on the port face triangles
    (same physics as em2d: phi = 1 V on the port's signal conductor, beta = k0 sqrt(C/C0), Z0 = 1/(c sqrt(C C0)));
    the Whitney edge values of e_t = -grad phi are exactly phi_a - phi_b. Analytic TE10 mode for waveguide gates.
  - S extraction: port voltage V_q = (e_q^T M_q E)/(e_q^T M_q e_q) = a_q + b_q; S_qp = (b_q / sqrt(Re Z0q)) /
    (a_p / sqrt(Re Z0p)); renormalization to user references; de-embedding by port extension exp(+gamma (d_p + d_q)).
- **Solver:** `engine/src/la` ComplexSupernodalLDLT (AMD), one symbolic analysis per mesh, one factor per frequency,
  all ports as right-hand sides; DOF guard default 6e4 (error unless `max_dof` is raised).
- **Cascade:** Redheffer star product of 2N-ports and 2-port chain matrices; 2D segments from em2d `mtl.lineS`.
- **Gates (tests):** rectangular waveguide TE10 beta from S21 phase, S11 < -40 dB; PML-terminated line reflection vs
  PML thickness; coax 3D Z0 and beta vs 2D; uniform microstrip 3D block cascaded with 2D segments = pure 2D;
  reciprocity and passivity.
- **EM-4 reduced:** G-S-G microbump transition between two RDL lines (<= 6e4 DOF), S11/S21, de-embedded, pi lumped
  model; reference deck description for lane L5.

## Progress log (wave 2)

- 2026-10-20 13:58 Mesh spike (coax a 100, b 230 um, P1, same em2d electrostatics; scratch script, not committed):
  conforming Delaunay (polygon circles) C' error 3.3e-3 / -1.3e-3 / -3.5e-4 / -8.5e-5 at 319 / 1215 / 4922 / 19603
  DOF; structured grid with staircased circles 1.2e-1 / 5.0e-2 / 2.5e-2 / 1.1e-2 at 264 / 1216 / 5140 / 21060 DOF
  (first order in h, 40-130x worse per DOF). **Decision: layered extrusion of the conforming xy triangulation, prisms
  split into tets.** Vertical cylinders (bumps, vias, TSVs) are exact polygons in xy; horizontal box features align
  with the z planes. Limitation: no inclined or horizontal-axis curved features (not needed for EM-4 / EM-5).
- 2026-10-20 14:12 `engine/src/em3d/{mesh,elements,solver,cascade}.mjs`: layered tet mesher (prism split, extrusion
  axis x / y / z), Whitney elements, PEC / PMC / IBC / thin TBC, PML, ports, Woodbury port correction, star product.
- 2026-10-20 14:15 Port finding: a purely local port operator (n x curl E = j beta E_t - 2 j beta a e_t) is exact for
  TEM / TE modes but gives a frequency-independent S11 = -36 dB and |S21| 0.982 on a microstrip, because the quasi-TEM
  H field follows the epsilon-independent magnetostatic shape. Fix: modal port with separate E shape e_t = -grad phi
  and H shape q_t = -grad phi0 (vacuum potential; derivation: (w mu0 / beta) n x h_t = (k0 / beta)(Z0vac / Z0) grad
  phi0 = grad phi0 since Z0vac / Z0 = beta / k0), single-mode condition n x curl E = -j beta (a - b) q_t, plus the
  local j beta M term restricted to the non-modal part. Implemented as a rank-2 Woodbury correction per port (sparse
  pattern unchanged; first version with dense port blocks raised nnzL 2.1e6 -> 6.9e6 and factor time 10x). Matched
  microstrip S11 -36 dB -> -76 dB (5 GHz) / -67 dB (20 GHz).
- 2026-10-20 14:17 Box finding: pmc side walls with a pec cover support a parallel-plate TEM mode; the port absorbs
  it and a lossless line then shows length-proportional "loss". Line gates use shielded (pec) side walls.
- 2026-10-20 14:20 IBC finding: coax (inner, outer, both) within 0.6 % of Rs (1/a + 1/b)/(2 eta ln(b/a)); round wire
  over ground 0.985 of em2d volumetric; TE10 guide with IBC walls +1.8 % / +5.7 % vs the perturbation formula at
  200 / 250 GHz. Rectangular strip (50 x 10 um) on a line-extruded (needle-tet) mesh: 0.74-0.80 of em2d volumetric
  (Wheeler SIBC 440 vs volumetric 429 ohm/m), improving only as the axial cell size approaches the cross-section size
  near the corners (dx 300 / 100 / 50 um -> 0.745 / 0.760 / 0.797). Lowest-order elements under-resolve the corner
  current on anisotropic tets. Consequence: conductor loss of long lossy lines belongs to em2d segments; 3D blocks
  carry the discontinuity (open issue E6-3).
- 2026-10-20 14:22 Thin TBC: sheet between plates, t/delta 0.5 / 1 / 3: alpha exact to 1.2e-6 (thick IBC gives
  0.25 / 0.49 / 1.09 of the right value there).
- 2026-10-20 14:24 Tests `engine/tests/em3d.test.mjs`: 5/5 pass (14.3 s).

## Proposed SPEC addition: section 10 "EM 3D block case" (coordinator to merge)

`sims/em/<case>.yaml`, `family: em3d`, entry `runEm3d(case, {variants, log})` in `engine/src/em3d/run.mjs`
(stand-alone runner `node src/em3d/cli.mjs <case.yaml> [--variants ..] [--json] [--touchstone-dir ..]`).
Top-level keys: `schema, id, title, status, family, em3d, targets, assumptions, missing, notes, reference_deck`.

```yaml
em3d:
  box_um: {x: [x0, x1], y: [y0, y1], z: [z0, z1]}
  axis: z | x | y                  # extrusion axis of the layered tet mesh (z: stacks, bumps, vias; x / y: long lines)
  bc: {xmin|xmax|ymin|ymax|zmin|zmax: pec | pmc}   # port sides are set by `ports`; default pec
  background: <material key>
  materials: {key: <em2d dielectric spec>}         # same models as section 9
  conductor_materials: {key: {sigma_S_m, tcr_per_K?, T_ref_C?}}
  temperature_C: 25
  solids:                          # painter order, later wins; conductors are removed from the mesh interior
    - {name, kind: dielectric, material, box_um | cylinder_um: {c: [x, y], r, n, z: [a, b]} | poly_um: {poly, w},
       h_um?, dz_um?}
    - {name, kind: conductor, model: pec | ibc | thin, conductor | sigma_S_m, roughness?, <shape>, h_um?, dz_um?}
      # thin = two-sided transition BC on the faces normal to `axis` (thickness along the extrusion axis)
  ports: [{name, side, signal: <conductor name> | mode: {type: te10, eps_r?}, deembed_um}]   # one port per box side
  pml: {side: {thickness_um, R0: 1e-6, order: 2}}
  mesh: {max_edge_um, max_dz_um, grade, max_vertices, min_edge_um}
  max_dof: 60000                   # guard: an error above it unless raised explicitly
  sweep: <as section 9>
  zref_ohm: 50
  lumped: pi                       # 2-port pi model from Y
  touchstone: true
  variants: [{id, title, patch}]   # solids patched by name
targets: [{metric_id?, quantity: S_dB | L_H | C1_F | C2_F, f_GHz, value, tolerance, to?, from?, variant?}]
```

Results: `type: em3d_sparams`, `fields: null`, `derived.rows[]` = {f_GHz, S (zref), S_port_ref, ports [{Z0_ohm,
beta_rad_m}], checks {max_singular_value, reciprocity_error}, pi?, timing}, `timing.rss_MB`.

## Wave 2 results

- 2026-10-20 14:33 EM-4 reduced case `sims/em/em4_microbump_gsg.yaml` (base PEC, variant `lossy`), reference deck
  `sims/em/em4_microbump_gsg_reference_deck.md`, runner `src/em3d/cli.mjs`, test `tests/em3d-em4.test.mjs`.
  First mesh (max_edge 14 um, dz 4 um) was 103k DOF: guard tripped at 6e4; with max_dof raised once for a
  sensitivity point: 79 s / frequency, RSS 1.9 GB. Production mesh 59.8k DOF.
- 2026-10-20 14:35 All em2d + em3d tests 24/24 pass (40.6 s).

### E6 gate table (`EM2D_GATE_LOG=1 node --test tests/em3d*.test.mjs`)

| Gate | Result | Tolerance |
|---|---|---|
| WR-like guide 1 x 0.5 mm, TE10, 200 GHz, h 100 um (23.1k DOF) | beta +1.06 % (h 200 um: +2.8 %); S11 -51.7 dB; |S21| 0.99995 | 1.5 %; < -40 dB |
| DOF guard | error above max_dof (tested at 1000) | - |
| Coax PEC 3D vs em2d on the same polygons (13.7k DOF) | Z0 -0.77 % / -0.61 % at 10 / 50 GHz; beta +5e-4 / +6e-4; S11 -74.6 / -53.2 dB | 1 %; 2e-3; < -50 dB |
| Coax IBC alpha vs Rs (1/a + 1/b) / (2 eta ln(b/a)) | -0.44 % / +0.19 % at 10 / 40 GHz | 2 % |
| Thin TBC sheet between plates, t/delta 0.5 / 1 / 3 | alpha 1.1e-6 / 1.1e-6 / 1.2e-6 | 1e-3 |
| Shielded microstrip, matched 3D block (15.0k DOF) | S11 -76.1 / -67.0 dB at 5 / 20 GHz | < -40 dB |
| 2D(2 mm) * 3D(1 mm) * 2D(3 mm) star product vs 2D(6 mm), port-mesh 2D line | max |dS| 7.5e-4 / 2.7e-3 | 5e-3 |
| same vs independent fine em2d (Z0 49.96 vs 50.92 ohm: coarse 3D cross-section) | 3.1e-3 / 1.2e-2 | 2e-2 |
| Line into PML, 2 / 4 / 8 cells (R0 1e-6, m 2), 20 GHz | S11 -22.9 / -31.2 / -44.5 dB (16 cells: -41 .. -44 dB floor) | monotonic, 8 cells < -35 dB |
| Reciprocity / passivity (all gates) | <= 5e-15 / max singular value <= 1 | 1e-10 / 1 |
| EM-4 10 GHz | S11 = S22 (mirror-symmetric block) to < 5e-3; C1 / C2 = 1.003 | 5e-3; 5 % |

### EM-4 reduced (G-S-G micro-bump, 40 um pitch, d 22 um, standoff 22 um; 50 ohm, de-embedded to pad edges)

| f (GHz) | S11 (dB) | S21 (dB) | L (pH) | C1 / C2 (fF) | lossy: S21 (dB) | lossy: L (pH) | lossy: R (ohm) |
|---|---|---|---|---|---|---|---|
| 1 | -51.2 | -0.000 | 10.06 | 10.79 / 10.76 | -0.008 | 17.54 | 0.097 |
| 10 | -31.2 | -0.004 | 10.06 | 10.79 / 10.76 | -0.021 | 13.56 | 0.198 |
| 25 | -23.3 | -0.023 | 10.05 | 10.79 / 10.77 | -0.050 | 12.47 | 0.338 |
| 50 | -17.3 | -0.086 | 10.03 | 10.81 / 10.79 | -0.126 | 11.74 | 0.495 |
| 75 | -14.0 | -0.186 | 10.00 | 10.84 / 10.82 | -0.238 | 11.38 | 0.607 |
| 100 | -11.6 | -0.320 | 9.95 | 10.89 / 10.87 | -0.385 | 11.12 | 0.692 |

- Mesh sensitivity at 10 GHz (base): 103k-DOF mesh L 10.30 pH, C 9.95 / 9.96 fF vs 59.8k-DOF L 10.06 pH,
  C 10.79 / 10.76 fF (L -2.3 %, C +8 %). This spread is the browser error band handed to L5.
- Base S21 loss at 100 GHz (-0.32 dB, R 0.042 ohm in the pi model) is the underfill tan delta 0.012 plus mismatch:
  the conductors are PEC. In `lossy` the de-embedding uses the lossless port beta, so the conductor loss of the two
  66.5 um lead-ins stays inside R (lead-in correction: open issue E6-5). Lossy L at 1 GHz includes internal
  inductance of the 5 um pads under IBC at t/delta = 2.4, where IBC is outside its validity (E6-3).
- No DB target exists (R3: cross-solver only); `targets: []`.

### Timing and memory (Node 23.7.0, `nice -n 10`, shared machine)

| Block | DOF | nnzL | Per frequency | Peak RSS |
|---|---|---|---|---|
| Guide TE10 (axis z) | 23.1k | - | 0.9 s | - |
| Coax (axis z) | 13.7k | - | 0.55 s | - |
| Microstrip (axis x) | 15.0k | 2.1e6 | 0.5 s | - |
| Microstrip (axis x, finer) | 41.4k | 8.3e6 | 1.3 s | - |
| Microstrip (axis z, layered) | 55.7k | 1.8e7 | 12.2 s | - |
| EM-4 base | 59.8k | 2.2e7 | 14-16 s | 1.0 GB (single process, 6 f) |
| EM-4 lossy | 56.9k | 1.9e7 | 11.9 s | 1.48 GB (both variants in one process) |
| EM-4 sensitivity mesh | 103k | 5.6e7 | 79 s | 1.9 GB |

Factorization dominates (as in em2d). Line-like blocks are 10-25x cheaper per DOF with the extrusion along the line
(cross-section mesh is anisotropically fine, axial cells coarse). The 6e4 browser budget of DevLog-010 A8 (R2) is
consistent with 14-16 s per frequency here.

### Open issues (E6)

1. E6-1 Multi-mode ports (two signals on one face, differential pairs) are not implemented: one single-mode port
   per box side; port faces are whole box sides.
2. E6-2 Port modes are quasi-TEM (electrostatic e and vacuum q) or analytic TE10; no full-wave 2D port eigenmode
   (EO vector-mode port not done). Dispersive / hybrid modes (CPW on thick high-k Si, slot modes) need it.
3. E6-3 IBC on rectangular strips in line-extruded (needle-tet) meshes under-predicts conductor loss by 20-26 %
   (corner current); smooth or well-shaped cases are within 1-6 %. Thick-IBC also fails below t/delta ~ 3 (TBC is
   exact there but only for faces normal to the extrusion axis; a warning is raised otherwise).
4. E6-4 No higher-order elements (order 2 belongs to the desktop references per A8); no adaptive refinement; no
   tree-cotree gauge (low-frequency limit: the gradient null space is handled by the direct solver down to 1 GHz in
   these tests; below about 0.1 GHz on um meshes precision degrades).
5. E6-5 De-embedding is port extension with the lossless port beta; lossy lead-ins should use the 2D (em2d)
   complex gamma or an L-2L step.
6. E6-6 FDTD not implemented (behind gate G2 per A8). PML only on box sides (no corner-specific profile tests).
7. E6-7 The EM-4 dimensions besides the bump / pad analog are templates; L5 cross-check (deck file) is the only
   validation route.

# Wave 3 / E6 phase 2

Assignment (coordinator, 2026-10-20): multi-mode / differential wave ports and mixed-mode S for 3D blocks; full-wave
2D port eigenmode for the port face; EM-5a TSV GSG chain (ectc51909.2023.00230-a); the IBC corner error; L4's request
on EM-1 causal_fit; timing / memory. Same write paths.

## Plan (written before coding)

- **EM-1 causal_fit (L4 request, audit S8):** done first. Base dielectric -> causal_fit, the table becomes variant
  `table`; targets take L4's tolerance (0.029 dB/mm + 5 % of measured). Reason to accept: the base Touchstone is the
  one downstream time-domain users take, so it must be causal; the alpha change is <= 1.5 % (L4 regression bound 4.5 %).
- **Multi-mode ports:** a port face carries K signal conductors. Quasi-TEM: K electrostatic solves on the face give
  e_i = -grad phi_i, q_i = -grad phi0_i, C (complex) and C0; modes from C V = lambda C0 V (beta_m = k0 sqrt(lambda_m)),
  e_m = sum_i V_mi e_i, q_m = sum_i V_mi q_i (derivation: the H shape of mode m in E units is the vacuum field of the
  same modal voltage vector, since I_m = C0 beta_m V_m / (w mu0 eps0) for L = mu0 eps0 C0^-1). Modes are
  C0-orthogonal, so int e_m . q_n = 0 for m != n. Port operator: local j beta_bar M minus its M-orthogonal projection
  on span{e_m} plus sum_m j beta_m (M q_m)(M q_m)^T / N_m (Woodbury, block-diagonal core).
- **Terminal S:** modal amplitudes a, b per port -> terminal V = T(a + b), I = Yc T(a - b) (Yc from the 2D modal data),
  all excitations -> terminal Z = V I^-1 -> single-ended S at zref, mixed mode via em2d `mixedMode`. De-embedding per
  mode (a e^{-gamma d}, b e^{+gamma d}).
- **Full-wave port mode (single-signal ports):** 2D Nedelec (edges) + P1 (e_z) Lee-Sun-Cendes eigenproblem
  A x = -beta^2 B x on the port-face triangles of the 3D mesh (so the edge DOFs map 1:1 to the 3D port edges),
  shift-invert inverse iteration from the quasi-TEM beta^2. H shape q_t = e_t + grad_t e_z (with E_z = j beta e_z).
  Voltage = projection on the quasi-TEM 1 V mode, power-voltage impedance. Decision on porting EO vector-mode.mjs
  recorded in the log.
- **Gates:** inhomogeneous microstrip matched-line S11 floor vs frequency, quasi-TEM vs full-wave port; differential
  CPWG 3D block (2-mode ports) vs em2d 4-port cascade, single-ended and Sdd21.
- **IBC corner error:** test the same strip with the extrusion across the strip (axis y) against em2d; if it
  converges, enforce a case-builder rule (lossy rectangular conductor along the extrusion axis with axial cell >
  k x cross-section size -> error naming the fix).
- **EM-5a:** read the DB rows and cached text; build the GSG TSV chain with axis z, lossy Si as eps* with sigma,
  oxide liner as a dielectric annulus; if the DOF budget or missing inputs prevent a faithful case, a reduced case and a
  desktop deck.

## Progress log (wave 3)

- 2026-10-20 14:50 EM-1: base dielectric switched to causal_fit, variant `table` added (the old `causal_fit` variant
  id is gone: L4 rule "causal_fit vs base" now reads "table vs base"); L4 tolerance adopted. 25 C: base 0.0980 /
  0.1911 / 0.3329 / 0.4929 (miss at 140 GHz, as L4 predicted), smooth misses at 200 GHz, cannonball 0.0914 / 0.1724 /
  0.3067 / 0.4711 passes all four. Test `em2d-em1` now asserts cannonball within tolerance and smooth < cannonball <
  base.
- 2026-10-20 14:54 IBC corner study: same 50 x 10 um strip, alpha from two lengths (port effects cancel): axis x
  (needle tets, h 2 um, dx 100 um) 0.760-0.763 of em2d volumetric at L 300 / 600 um; axis z (layered, near-isotropic
  corner cells h 5 um, dz 5 um) 1.108 / 1.111 at L 150 / 300 um (coarse cross-section: Z0 -4 %). The low result is a
  needle-tet effect, not a port or IBC-formula error (coax IBC within 0.6 %, face areas exact). Extrusion across the
  strip (axis y) costs 0.66-2.9 M DOF for this strip and is not practical. Decision: documented rule enforced by the
  case builder (`em3d/run.mjs` checkNeedleIbc): error for ibc / thin rectangular conductors whose longest side is the
  extrusion axis with axial cell > 2 x cross-section cell, unless `allow_needle_ibc: true`.
- 2026-10-20 14:57 `em3d/ports.mjs`: port data, multi-signal quasi-TEM modes (C V = lambda C0 V), TE10, full-wave
  Lee-Sun-Cendes port eigenmode on the port-face triangles. Solver now builds terminal V, I for every (port, mode)
  excitation -> terminal Z -> S at native references (Re diag Zc); mixed mode via em2d. Porting decision: the EO
  vector-mode.mjs solver is built on the EO optical model chain (own CrossSection mesh, optics materials,
  vector-dense Arnoldi); the 3D port needs the eigenmode on exactly the port-face triangles of the 3D mesh with the
  3D edge numbering and PEC from the 3D conductors. A 260-line re-implementation of the same formulation (EO
  DevLog-025: Lee-Sun-Cendes, first-order Nedelec + P1) with shift-invert from the quasi-TEM beta^2 was simpler and
  converges in 2-4 iterations; no EO code copied (no header needed).
- 2026-10-20 14:59 Gates: full-wave port S11 floor on a microstrip (h 100 um, eps_r 3.5) -49.5 / -90.3 dB at 60 /
  90 GHz vs quasi-TEM -36.4 / -31.8 dB; beta_port vs beta_3D -1.6e-3 (quasi-TEM -1.5e-2 / -2.6e-2). GSSG CPWG
  two-mode ports: cascade vs port-mesh 2D 4.4e-4 / 2.5e-3, vs fine em2d 8.9e-3 / 3.2e-2 (cross-section mesh), Sdd21
  -0.141 vs -0.157 dB / -0.267 vs -0.237 dB at 10 / 40 GHz. Earlier E6 gates unchanged except the matched-microstrip
  S11 (-76 -> -62 dB at 5 GHz): S is now referenced to the real part of the complex line impedance (lossy dielectric),
  which is the power-wave definition; the cascade consistency improved (7.5e-4 -> 1.8e-4).
- 2026-10-20 15:03 EM-5a: DB rows (`ectc51909.2023.00230-a-i1`, `-L02..L13`, `-m1..m6`) and the paper (p.2 Sec. II.B,
  Fig. 2-3; p.4 Sec. IV) give TSV d 10 um x 100 um, Al 1 um RDL and 1 um SiO2 on both sides, GSG pads, 2 / 4 / 6
  TSVs in series, but not the pitch, pad / line layout, TSVs per pad, liner or Si resistivity. The 40 GHz (HFSS) /
  45 GHz (measured) S11 dip is set by those lengths, so it cannot be reproduced. Built a reduced browser case
  `sims/em/em5a_tsv_gsg_chain_reduced.yaml` (2 TSVs, templates, 58.6k DOF after four mesh coarsening steps from
  618k) and the desktop deck `sims/em/em5a_tsv_gsg_reference_deck.md`. Test `em3d-em5`.
- 2026-10-20 15:05 Full suite em2d + em3d: 28/28 pass (77 s).

## Wave 3 results

### EM-5a reduced (2 TSVs in series, PEC metal, liner 1 um, 50 ohm, no de-embedding)

| f (GHz) | Si 10 S/m: S11 / S21 (dB) | Si 0.1 S/m: S11 / S21 (dB) |
|---|---|---|
| 1 | -26.1 / -0.250 | -59.1 / -0.010 |
| 10 | -20.4 / -0.857 | -54.6 / -0.011 |
| 20 | -20.4 / -0.904 | -50.6 / -0.014 |
| 40 | -20.8 / -0.946 | -49.5 / -0.028 |
| 45 | -21.0 / -0.957 | -50.5 / -0.034 |
| 67 | -22.2 / -1.016 | -47.7 / -0.065 |

- Loss is dominated by the conductive Si seen through the 1 um liner (MIS slow-wave regime at 10 S/m); with
  high-resistivity Si the 2-TSV chain is nearly lossless. The 180 um block has no S11 dip below 67 GHz; the paper's
  dip comes from its longer pad / line layout (missing). The pi-model R becomes negative with lossy Si (lumping a
  distributed shunt-loss network into a series R); use S / Y directly for these blocks.
- 7.0 s (10 S/m) / 6.6 s (0.1 S/m) per frequency at 58.6k DOF (nnzL 1.3e7), peak RSS 1.41 GB.

### Timing (wave 3 additions; Node 23.7.0, nice -n 10, shared machine)

| Block | DOF | Per frequency | Peak RSS |
|---|---|---|---|
| Microstrip, full-wave ports (port eigen 2-4 inverse iterations) | 28.7k | 3.0-3.3 s (quasi-TEM ports 3.2-3.4 s) | - |
| GSSG CPWG, two-mode ports (4 terminals) | 47.0k | 3.0-3.2 s | - |
| EM-4 base (unchanged by the port rewrite) | 59.8k | 14.7-15.3 s | 1.0 GB |
| EM-5a reduced | 58.6k | 6.6-7.0 s | 1.41 GB |

### Proposed SPEC additions to section 14 (EM 3D block case; coordinator to merge)

- `ports[].signal` may be a list (one port face, K quasi-TEM modes, K terminals); `ports[].mode_type: tem |
  fullwave` (full-wave port eigenmode, one signal only); results `rows[].terminals`, `rows[].zref_native_ohm`.
- `em3d.mixed_mode_pairs: [[i, j], ...]` (terminal indices; result `rows[].mixed_mode` {Sdd, Scc, Sdc}).
- `solids[].allow_needle_ibc: true` overrides the needle-IBC rule (error otherwise; rule text in `em3d/run.mjs`
  checkNeedleIbc).
- S is now referenced to the real part of each terminal's characteristic impedance (power waves) before
  renormalization to `zref_ohm`.

### Open issues (after wave 3)

1. E6-1 done for quasi-TEM ports (K modes per face). Full-wave ports are single-mode; multi-mode full-wave ports
   (needed for strongly dispersive coupled lines) are not implemented.
2. E6-2 done: full-wave port eigenmode (Lee-Sun-Cendes) re-implemented on the port face rather than ported from EO
   (reason in the log); it starts from the quasi-TEM mode and may lock onto a different mode if a higher-order mode is
   closer to the quasi-TEM beta^2 than the fundamental (no mode-tracking check yet).
3. E6-3: rule enforced, not fixed. IBC loss on rectangular conductors meshed along their length is 20-26 % low;
   layered (axis z) meshes with near-isotropic corner cells gave +11 % at a coarse cross-section (h = w/10); the
   converged value needs a finer study (blocked by DOF cost).
4. EM-5a: not comparable with the measured / HFSS dip until the geometry is recovered (deck asks L5 to rebuild it
   from Fig. 2 with uncertainties). Si resistivity remains N/A.
5. De-embedding still uses the port's modal gamma without conductor loss (E6-5).
6. EM-1 base is now the causal fit; L4's rule "causal_fit vs base within 4.5 %" should be re-pointed to variant
   `table` vs base (measured: table and causal fit differ by <= 1.5 % in alpha, values in the EM-1 tables above).

# Wave 4 (audit A2 items, port distance rule, performance)

## Plan

M4 PEC-backed thin conductor; M5 port distance study (microstrip step, EM-4) and rule; PML -41.8 vs -44.5 dB check;
profile EM-4 and em2d sweeps; ordering / symbolic reuse; WASM only if L1's G1 shows an end-to-end gain.

## Progress log (wave 4)

- 2026-10-20 15:12 M4 fixed (`em3d/solver.mjs`): a thin slab whose partner face lies on a pec side or against another
  conductor now gets K1 = (coth(kt)/Zs) E1 (E = 0 behind) instead of the open-behind 1/(Zs coth(kt)); pmc / port
  sides keep the open form. Old / new conductor R for a PEC-backed sheet: 12.6x / 1.34x / 1.007x at t/delta 0.5 / 1 / 3.
  New gate (thin ground sheet on the pec box bottom under a plate): alpha within 1.4e-6 of the closed form
  Z' = j w mu0 h / W + Zs tanh(kt) / W at all three thicknesses.
- 2026-10-20 15:15 PML check: with tan delta 0.01 the PML-terminated microstrip (8 cells) gives modal reflection
  -44.5 dB (complex Zc reference, identical to the pre-wave-3 value) and -41.8 dB in the power-wave S11 at Re(Zc)
  = 49.962 ohm, Im Zc = 0.214 ohm (|Im Zc| / (2 Re Zc) = -53.4 dB adds to the PML term). Lossless substrate: -44.4 dB
  in both definitions. Reference-definition effect, not a regression.
- 2026-10-20 15:19 Port distance (M5), quasi-TEM ports, 50 GHz:
  - Microstrip step w 60 -> 20 um, h 30 um, t 5 um, eps_r 3.5 (axis z; native references; reference = 160 um lead):
    d|S11| 2.4e-3 / 2.0e-3 / -1.8e-4 / -2.1e-4 and d|S21| -9.1e-4 / -5.4e-4 / 3.4e-5 / 4.8e-5 at leads 10 / 20 / 40 /
    80 um (0.33 / 0.67 / 1.3 / 2.7 h). The evanescent error falls below the mesh-to-mesh noise (~2e-4) from 40 um.
  - EM-4 block, leads 21.5 / 36.5 / 66.5 um vs 96.5 um: max d|S| 1.0e-3 / 2.2e-4 / 1.3e-3 (non-monotonic: mesh
    noise; L 10.04 / 9.84 / 10.03 / 10.49 pH, C1 10.69 / 10.64 / 10.81 / 10.86 fF across the four meshes).
  - S21 phase after port extension drifts 0.3-0.5 deg between meshes at 50 GHz (3D vs quasi-TEM port beta over
    2 x lead); full-wave ports remove most of it (wave-3 gate: beta error -1.6e-3 vs -1.5e-2).
- 2026-10-20 15:22 Profile EM-4 (2 frequencies, 59.8k DOF): complex supernodal factor 60.4 % + its front update
  34.4 %, solves 2.4 %, element matrices 0.4 %, ordering + symbolic 0.5 %. Symbolic analysis was already done once
  per mesh (em2d: once per cross-section; em3d: once per block) and reused at every frequency; the numeric factor
  cannot be reused across frequencies (K - k0^2 M, port beta, PML 1/w, IBC sqrt(w) all change).
- 2026-10-20 15:28 Changes: (1) `em2d/ldlt-blocked.mjs` BlockedComplexLDLT (subclass of la ComplexSupernodalLDLT,
  only factor replaced): 4 source columns per pass over the target column; used by em2d (rlgc.mjs) and em3d. (2)
  `em3d/order.mjs` 3D nested dissection (coordinate bisection on edge midpoints, AMD leaves of <= 8000 DOF); em3d
  `ordering: 'auto'` analyses both AMD and ND3 and keeps the lower predicted flops (ND3 on layered blocks, AMD on
  line-extruded meshes, where ND3 was 40x slower on the GSSG block). Results unchanged to 7e-12 (S) / 8e-11 (alpha).
- 2026-10-20 15:36 Full em2d + em3d suite 29/29 pass in 51 s (77 s before, with one test fewer).

## Wave 4 results

### Port distance rule (M5; for SPEC 14, coordinator to merge)

Quasi-TEM and full-wave ports apply the single-mode condition to the mode and a first-order absorbing term (local
j beta M) to the rest, so evanescent fields reaching the port face are partly reflected. Measured at 50 GHz
(numbers in the log above): the error in |S| from evanescent fields drops below the mesh-to-mesh noise (~2e-4 on the
step, ~1e-3 on EM-4) once the lead-in reaches about 1.3 h (step, h = 30 um) and is already at the noise level at
21.5 um on EM-4 (3.6 h, 0.8 x the pad size). Proposed rule:

- Port lead-in from the nearest discontinuity >= max(2 h, w_max), with h the signal-to-reference distance and w_max
  the largest conductor width on the port face (both at the port); for |S| errors <= 1e-3.
- Keep leads no longer than needed: the S21 phase after port extension carries the 3D-vs-port beta mismatch over
  2 x lead (0.3-0.5 deg at 50 GHz with quasi-TEM ports on the step); use `mode_type: fullwave` when phase matters
  above ~30 GHz (beta error -1.6e-3 vs -1.5e-2 quasi-TEM at 60 GHz on the wave-3 microstrip).
- The case builder does not enforce this yet (needs h and w_max per port); a warning hook can be added to run.mjs.

### Performance before / after (Node 23.7.0, nice -n 10, shared machine)

| Case | Before | After | Change |
|---|---|---|---|
| EM-4, 59.8k DOF, one frequency: factor / total | 15.4 / 16.0 s | 8.0 / 8.5 s (ND3 + blocked) | 1.9x |
| EM-4 ordering alone (AMD -> ND3): flops, nnzL | 2.52e10, 2.16e7 | 2.08e10, 2.04e7 | -17 % flops |
| EM-4 blocked update alone (AMD) | 15.4 s factor | 10.0 s | 1.5x |
| EM-4 test (10 GHz) | 15.3 s | 7.5 s | 2.0x |
| EM-5a test (20 GHz) | 7.0 s | 4.2 s | 1.7x |
| EM-1 em2d sweep, 54 frequencies (MQS factor) | 17.5 s (11.7 s) | 14.6 s (9.1 s) | 1.2x |
| em2d + em3d test suite | 77 s (28 tests) | 51 s (29 tests) | 1.5x |

Peak RSS on EM-4 rose from 668 MB to 818 MB (ND3 symbolic data) - within the < 4 GB rule.

### WASM SIMD

Not attempted, per the condition in the assignment: L1's G1 verdict (DevLog/lanes/L1-engine-thermal.md, 15:06 PDT)
is below the 2x end-to-end rule (kernel 3.36x, end to end less), so WASM stays opt-in there. Note for G1 follow-up:
in em3d and em2d the time is 95 % in one dense kernel (complex front update), compute-bound with f64x2-friendly
complex multiply-adds, so a WASM front-update kernel is a better G1 candidate than the stencil was; a microbench of
that kernel alone would decide it.

### Proposed upstream (lane L1)

`em2d/ldlt-blocked.mjs` factor is a drop-in replacement for la/ldlt.mjs ComplexSupernodalLDLT.factor (same
interface, same results to rounding); the same 4-column blocking applies to the real SupernodalLDLT used by the
thermal / mechanics solvers.

# Wave 5 (port-distance enforcement, WASM front-update kernel, progress events)

## Plan

1. `runEm3d`: per port face, h = distance from the signal conductor(s) to the nearest other conductor / pec side
   along the face normal plane (computed from the solids' boxes on the face), w_max = widest signal / ground conductor
   width on the face, lead = distance along the port normal from the face to the nearest solid boundary that breaks
   the axial uniformity of the port cross-section; warn below max(2 h, w_max), error below half of it unless
   `allow_short_lead: true`.
2. WASM SIMD f64x2 kernel for the complex front update, built with L1's encoder (`engine/src/la/wasm/encoder.mjs`,
   imported read-only), fronts and the per-column weight vector in WASM memory, JS fallback; flag `factor:
   'wasm'`; adopt as default only if EM-4 per-frequency time improves > 2x end to end with S identical to 1e-10.
3. Progress callback `onProgress({stage, i, n, f_GHz, ms})` in runEm2d / runEm3d (per frequency and per factorization).

## Progress log (wave 5)

- 2026-10-20 15:40 Blocked factor refactored (`_update`, `_trailing` methods) so the WASM subclass replaces only the
  update; `em2d/ldlt-wasm.mjs` WasmComplexLDLT: module built with L1's encoder (imported read-only), kernels `upd`
  (one target column, 4 source columns, f64x2 over row pairs, scalar tails) and `upd2` (two trailing target columns
  sharing every source load); front and weights in WebAssembly memory; `em2d/ldlt-select.mjs` makeFactor('base' |
  'blocked' | 'wasm'), JS fallback when SIMD is unavailable.
- 2026-10-20 15:44 Port-distance rule enforced in `runEm3d` (`checkPortLeads`): EM-4 ok (lead 66.5 um, required 12 um);
  EM-5a reduced warns (lead 40 um < 60 um; kept, DOF budget; noted in the case).
- 2026-10-20 15:45 Progress events: `runEm3d(case, {onProgress})` / `runEm2d(case, {onProgress})`.
- 2026-10-20 15:47 Suite em2d + em3d 31/31 pass (56 s).

## Wave 5 results

### WASM SIMD front-update kernel (G1-style gate)

| Case | base (la) | blocked JS (default since wave 4) | WASM f64x2 | WASM vs blocked | S / alpha vs base |
|---|---|---|---|---|---|
| EM-4, one frequency (59.8k DOF), factor / total | 12.2 / 12.6 s | 7.5 / 7.9 s | 3.9 / 4.3 s | 1.82x total (1.9x factor) | 5.5e-11 (blocked 3.6e-12) |
| EM-1 em2d sweep, 54 frequencies, total (MQS factor) | - | 13.4 s (8.4 s) | 10.6 s (6.1 s) | 1.27x | alpha 7.7e-11 |
| 3D 7-point test matrix, n 10648 (factor) | - | 221-254 ms | 130-152 ms | 1.7x | solution 4.9e-15 |

- Profile of the WASM path on EM-4: kernel 70 %, JS factor bookkeeping 7 %, solves 6 %, rest setup.
- The second kernel (`upd2`, two target columns per source load) changed EM-4 by < 5 % (3.93 vs 4.1 s): the
  kernel is limited by streaming the source columns of large fronts, not by the target loads.
- **Decision: not adopted as default.** The gate asks for > 2x end to end against the current default (the JS
  blocked factor, same algorithm): 1.82x on EM-4, 1.27x on em2d. Against the wave-3 code (base factor, AMD) EM-4 is
  16.0 -> 4.3 s (3.7x). WASM stays opt-in: `runEm3d(case, {factor: 'wasm'})`, `runEm2d(case, {factor: 'wasm'})`,
  `prepare3d(mesh, {factor: 'wasm'})`; test `em2d-wasm` checks it equals the JS factor (1e-12 solution, 1e-10 S).
- Next step if wanted: a 2-source x 4-target register block or row tiling for cache reuse; f64x2 relaxed-FMA is
  not in L1's encoder.

### Port-distance rule enforcement (SPEC 14.2)

`checkPortLeads(em3d)` in `em3d/run.mjs`, called by runEm3d before meshing; per port: lead = distance along the port
normal to the nearest solid boundary inside the box; h = in-plane gap from the signal conductor(s) to the nearest other
conductor on the face or a pec box side; w_max = largest in-plane extent of a signal conductor on the face. Warning
when lead < max(2 h, w_max); error when lead < 0.5 max(2 h, w_max) unless the port sets `allow_short_lead: true`.
Result `derived.port_checks: [{port, lead_um, h_um, w_max_um, required_um, status}]`. Test in `em3d-ports`.

### Progress events (for the UI)

`opts.onProgress(event)` on runEm3d and runEm2d; events carry `{case, variant, stage, ...}`:
`mesh`, `setup` {ms, tets}, `ready` {dof | dof_es, dof_mqs, nnzL, n}, `frequency` {i, n, f_GHz},
`factor` {fraction 0..1, f_GHz, i, n} (em3d only: 0 at start, then about every 2 % of the estimated factor work,
throttled to >= 200 ms, then 1), `frequency_done` {i, n, f_GHz, ms}. Synchronous callbacks: in a Web Worker,
postMessage from the callback reaches the main thread while the factorization continues. EM-4 one frequency emits
18 factor events. Test in `em3d-em4`.

### Proposed SPEC 14 additions (coordinator to merge)

- `ports[].allow_short_lead` and `derived.port_checks` (above).
- Run options (not case keys): `factor: 'blocked' (default) | 'wasm' | 'base'`, `onProgress`.

# Wave 6 (priority bug hunt: EM-4 and EM-5a vs lane L5 references)

## Plan

Compare against L5's converged desktop references (DevLog/lanes/L5-references.md wave 3): EM-4 L 9.03 pH, C 9.37 fF,
S11 -52.5 / -32.5 / -18.6 / -12.9 dB at 1 / 10 / 50 / 100 GHz; EM-5a hr_si port Zc 68.6 ohm, S11 -34.8 / -24.1 /
-22.3 dB at 10 / 40 / 67 GHz. Check post meshing, conductor models, port reference, de-embedding, reference-impedance
handling, variant patch; fix and test.

## Progress log (wave 6)

- 2026-10-20 17:00 EM-5a hr_si: the variant patch applies (port beta 538.6 - 3.0j rad/m at 0.1 S/m vs 645.8 - 238.3j at
  10 S/m) and the power-wave / renormalization path is consistent (native S11 -37.6 dB, 50 ohm S11 -54.5 dB for a
  53.9 ohm native reference). The error is upstream: the 3D port-face (= 3D line) impedance is 53.9 ohm, while em2d
  on the same cross-section gives 68.87 + 0.38j ohm (L5's independent 2D: 68.88 + 0.38j). Port C and C0 are both
  23-28 % high: the layered mesh at 58.6k DOF has 25 um z-cells in the Si under the 1 um lines and one 20 um air layer
  above them (P1-type discretizations over-estimate C). Refinement study (port Z only): 55.0 (71k DOF) / 57.7 (118k)
  / 58.2 (178k) / 59.0 (271k) / 60.0 (422k) ohm with uniform layers; with the new z-grading (mesh.dz_min_um,
  dz_growth) 61.7 (234k) / 65.1 (383k) / 66.9 (763k): converging to 68.9 but far beyond the browser budget.
- 2026-10-20 17:05 EM-4: 3D port-face impedance 39.22 ohm vs em2d 43.32 ohm (-9.5 %), same cause. Ground posts are
  PEC solids joining both ground planes (no modelling gap). L drift with refinement (10.06 -> 10.30 pH) traced to
  port-extension de-embedding across 66.5 um lead-ins whose discrete impedance and beta differ from the port mode
  (1 pH = 3.5 um of line). Same-mesh line-run de-embedding (L5's method) prototype: L 9.19 pH (59.8k DOF) / 9.07 pH
  (103k), C1 10.43 / 10.03 fF, S11 -31.40 / -31.76 dB at 10 GHz.
- 2026-10-20 17:10 Implemented in `em3d/run.mjs`: (1) `deembed_method: line_run` (default for 2-port single-mode TEM
  cases with deembed_um > 0): per port a uniform-line companion (the solids crossing the port face, extruded over
  the lead, same mesh settings, ports at both ends) is solved at the same frequencies; T_core = T1^-1 T_raw
  reverse(T2)^-1 with generic 2-port ABCD (`cascade.mjs` zToAbcd, abcdToZ, abcdMul, abcdInv, abcdReverse; different
  references per port allowed). (2) Port-impedance check (`port_z_check`, default on): a converged em2d solve of each
  single-signal port cross-section at the first frequency; warning above 3 %; `derived.port_checks[]` gains
  z_port_ohm, z_em2d_ohm, z_rel. (3) Axial z-grading in the layered mesher (`mesh.dz_min_um`, `mesh.dz_growth`).
- 2026-10-20 17:13 Tests: em3d-em4 now asserts L within 5 % and C within 15 % of L5 and S11 within 1.5 dB at 10 GHz,
  plus the port-Z check value; em3d-em5 asserts that the port-Z check flags EM-5a (z_rel < -15 %, em2d 68.87 ohm).
  Suite 31/31 (58 s).

## Wave 6 results

### EM-4 before / after (59.8k DOF; reference L5)

| Quantity | L5 reference | before (port extension) | after (line-run de-embedding) | 103k DOF (line run) |
|---|---|---|---|---|
| L (pH) | 9.03 +- 0.03 | 10.06 (+11 %) | 9.27 (+2.7 %) at 1-10 GHz, 9.18 at 100 GHz | 9.07 (+0.4 %) |
| C1 = C2 (fF) | 9.37 +- 0.02 | 10.79 (+15 %) | 10.39 / 10.37 (+11 %) | 10.03 (+7 %) |
| S11 1 / 10 / 50 / 100 GHz (dB) | -52.5 / -32.5 / -18.6 / -12.9 | -51.2 / -31.2 / -17.3 / -11.6 | -51.4 / -31.4 / -17.6 / -11.8 | - / -31.8 / -17.9 / - |
| S21 50 / 100 GHz (dB) | -0.067 / -0.241 | -0.086 / -0.320 | -0.084 / -0.310 | -0.079 / - |
| time per frequency | - | 8.5 s (blocked JS) | DUT 8.2 s + two 20k-DOF companions (~3 s total, once per sweep) | 100 s (all, 2.6 GB) |

- L fixed (de-embedding). The remaining C excess (+11 % at the browser budget, +7 % at 103k DOF, decreasing with
  refinement) and the 1.1 dB S11 offset are mesh resolution: thin 2 um lines and 5 um pads in 6 um z-cells. z-graded
  meshes that resolve it need 1.0-1.6e5 DOF (4.4 GB peak at 156k: stopped, above the 4 GB rule).
- The port-Z check flags the EM-4 port (-9.5 %) as a warning; the de-embedded block S is not referenced to it (the
  line-run removes the lead-ins on their own discretization), so the warning concerns raw (non-de-embedded) S only.

### EM-5a hr_si

- No reference-handling or patch bug. The browser case resolves the 1 um CPW lines on 100 um Si too coarsely: line /
  port impedance 53.9 ohm vs 68.9 ohm. Its 0.1 S/m S at 50 ohm (S11 -54.6 dB at 10 GHz) is therefore wrong, as L5
  said; the 10 S/m case agreed with L5 within 1-2 dB only because its true impedance (50.7 + 18.7j ohm) happens to sit
  near the coarse 3D value at 50 ohm reference.
- A browser-budget layered mesh cannot fix this (68.9 ohm needs > 7.6e5 DOF with z-grading). Status: the case keeps
  `status: draft`; runEm3d now warns automatically (port-Z check) and the test asserts the warning. L5's NGSolve run
  (169k unstructured DOF) is the reference for this case.

### Proposed SPEC 14 additions (coordinator to merge)

- `em3d.deembed_method: line_run (default when a 2-port single-mode TEM case has deembed_um > 0) | port_extension`;
  `derived.deembed_method`, `derived.companions[] {dof, ms}`; progress events of companions carry `companion: <port>`.
- `em3d.port_z_check: true (default)`; `derived.port_checks[]` adds `z_port_ohm, z_em2d_ohm, z_rel, f_GHz`; warning
  above 3 %.
- `em3d.mesh.dz_min_um`, `em3d.mesh.dz_growth` (axial grading at every layer interface).
