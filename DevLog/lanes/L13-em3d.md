---
title: Lane L13 - em3d owner after L7 - same-mesh line-run de-embedding, de-embedding and port-check guards, A3 S3 / S4 / M9
date: 2026-10-20
status: done (hand-off ready)
scope: engine/src/em3d/, engine/src/em2d/, engine/tests/em2d*.test.mjs, engine/tests/em3d*.test.mjs, sims/em/
authors: Claude (lane L13 subagent), at Wentao Jiang's request
---

# L13: em3d (and em2d) after L7

Binding: DevLog-012 shared rules, sims/SPEC.md sections 9 and 14 (14.1-14.4), L7 notes (waves 4-6), L5 wave 3 (EM-4
desktop reference), audit A3 items S3, S4 and M9 (`DevLog/audits/sim_engine_audit_A3_2026-10-20.md`).

EM-4 reference (L5 wave 3, quasi-static, order 3-4; full wave order 3 at 202k DOF agrees within 0.1 dB at 50-100 GHz):
L 9.03 +- 0.03 pH, C1 = C2 9.37 +- 0.02 fF, S11 -52.5 / -32.5 / -18.6 / -12.9 dB at 1 / 10 / 50 / 100 GHz.

## Plan (written before coding, 2026-10-20 21:39 PDT)

### 1. A3 S3: companion on the device mesh

Problem (A3): `companionLine` (run.mjs:173-175) re-meshes the solids that cross the port face over the lead. The
layered mesher takes z-planes from all solids (mesh.mjs:32-35), so the companion z-planes differ (DUT 0 6 8 11 16.5
22 27.5 33 36 38 44; companion 0 6 8 14 20 26 32 38 44 um), its in-plane triangulation differs too (no pad / bump
grading sources), and it drops all PML (run.mjs:185).

Fix: cut the companion out of the DUT mesh instead of re-meshing.
- `buildLayeredMesh(spec)` gains `spec.cuts: [{axis: 'x'|'y'|'z' (physical), at_um}]`.
  - In-plane cut (axis is a frame u / v direction): a constraint line across the whole box at that coordinate, added
    to the 2D PSLG as a box-spanning rectangle loop, so the triangulation has edges along the reference plane.
  - Axial cut (axis = extrusion axis): an extra z-plane.
- `subMesh(mesh, axis, lo, hi)` (mesh.mjs): the DUT prisms between the port face and the reference plane, same 2D
  triangles (in-plane cut) or same layers (axial cut), same z-planes, the same tet split, nodes renumbered
  monotonically (keeps the sorted-tet and layered `v + nV2 k` numbering that the thin-conductor pairing needs).
- Companion: `prepare3d(subMesh, ...)` with the DUT's solid properties, bc, materials, factor; ports at the DUT face
  and at the reference plane; PML kept on every side whose axis is not the port normal (identical stretch: same box
  bounds on those axes); error if the lead overlaps a PML slab on the port-normal axis.
- Same eligibility as before (2-port, single-signal TEM, deembed_um > 0).
- Reproduce the A3 helper numbers first (companion with DUT z-planes: L 8.913 pH, C1 10.57 fF), then the cut mesh.
- Report EM-4 L, C, S11 at the browser budget (~6e4 DOF) and at ~1e5 DOF with the shipped code; the 103k-DOF
  9.07 pH (L7 prototype) is re-run or withdrawn.

### 2. A3 S4 guards

- `deembed_um > lead_um` (lead = distance from the port face to the nearest solid boundary along the normal) is an
  error, for both methods.
- `deembed_method` must be `line_run | port_extension` (error otherwise).
- Explicit `line_run` on an ineligible case: warning naming the reason, then port extension.
- `port_z_check`: a record and a warning `not checked: <reason>` for multi-signal ports, fullwave / te10 ports, a
  signal that does not cross the face, and em2d errors (message included).
- Per-terminal indexing: `r.zref` is per terminal; use the port's terminal offset (run.mjs:316 / 318).

### 3. A3 M9

- Touchstone header: the de-embedding method actually used (line run with lengths, port extension, or none).
- Companion cost claim: companions are solved at every frequency (factor per frequency; mesh and symbolic analysis
  once per sweep). Correct the claim in SPEC 14.4 notes and this file; report the timing.
- Low frequency: use the solver's Z directly (no S -> Z round trip); measure where the ABCD de-embedding / pi
  extraction loses precision on EM-4 and warn below that frequency.
- Companion warnings are propagated (prefixed). Spurious ones (solids absent from the cut) are suppressed at source.
- `clipSolidAlong` z-bounds bug: function removed with the re-meshing companion.
- Other M9 items (em4 yaml stale text: fix; WASM-without-SIMD silent fallback: warning; fixed-P2 2D reference: note;
  UI label in app/: not in scope, routed to the coordinator).

### 4. Tests

- em3d-ports: guards (lead length, method value, fallback warning, port-Z not-checked reasons, terminal indexing),
  sub-mesh identity (companion face impedance equals DUT face impedance), PML kept.
- em3d-em4: line-run on the cut mesh vs L5; Touchstone header.
- Then em2d + em3d files, then the full engine suite once (`cd engine && nice -n 10 npm test`).

## TODO

- [x] Reproduce A3 S3 numbers (as coded; DUT z-planes injected)
- [x] cuts + subMesh in mesh.mjs; companion from the DUT mesh in run.mjs
- [x] S4 guards
- [x] M9 items
- [x] EM-4 at ~6e4 and ~1e5 DOF with shipped code
- [x] tests; em2d + em3d; full suite
- [x] SPEC 14 note (for the coordinator)

## Progress log

- 2026-10-20 21:39 PDT Plan written. Read DevLog-012, L7 waves 4-6, L5 wave 3, SPEC 9 / 14, A3 S3 / S4 / M9, em3d
  run / mesh / solver / ports code.
- 2026-10-20 21:42 PDT Reproduced A3 S3 on a scratch copy of the shipped src (outside the repo), EM-4 base,
  59,836 DOF, 1 / 10 / 50 / 100 GHz:
  - as coded (companions 20,389 / 20,192 DOF, own z-planes): L 9.271 / 9.270 / 9.248 / 9.180 pH, C1 10.392 fF,
    S11 -51.44 / -31.44 / -17.57 / -11.84 dB; 39.0 s for 4 frequencies, peak RSS 1.50 GB.
  - companion forced onto the DUT z-planes (26,115 / 25,866 DOF): L 8.913 / 8.913 / 8.904 / 8.876 pH, C1 10.569 fF,
    S11 -51.19 / -31.20 / -17.33 / -11.64 dB. Matches the A3 helper (8.913 pH, 10.57 fF).
  - Process note: one empty `python3 -` heredoc was invoked by mistake in a shell edit (no script content, no
    effect); all edits are perl / Edit, nothing else ran under system python.
- 2026-10-20 21:54 PDT Implemented (engine/src/em3d):
  - mesh.mjs: `cuts` (in-plane: box-spanning 2D constraint line; axial: extra z-plane), `buildEdges` helper,
    `subMesh(mesh, axis, lo, hi)` (same prisms / tet split / z-planes; monotone renumbering; conformity checked).
  - run.mjs: `deembedPlan` (method values, deembed_um <= lead, fallback warning), `prepareCompanion` (cut from
    the device mesh; PML on sides parallel to the lead kept, overlap with a lead-axis PML is an error), port-Z check
    with `not checked: reason` records and per-terminal indexing, de-embedding and pi model from the solver's Z,
    det-Z low-frequency check, Touchstone header names the method; `clipSolidAlong` / `companionLine` removed.
  - solver.mjs: the thin-conductor "no faces normal to the axis" warning only for solids present in the mesh.
  - EM-4 with the reference-plane cut lines: 60,106 DOF at grade 0.4 (cut lines +270 DOF) > max_dof 6e4; case
    mesh grade 0.4 -> 0.42 gives 59,512 DOF (sims/em/em4_microbump_gsg.yaml).
- 2026-10-20 21:54 PDT EM-4 runs with the shipped code (nice -n 10, one at a time):
  - 59,512 DOF (companions 25,968 + 25,968 DOF, reference planes x = -13.5 / +13.5 um), 6 frequencies 72.7 s, peak
    RSS 1.57 GB: L 8.913 / 8.913 / 8.904 / 8.878 pH at 1 / 10 / 50 / 100 GHz; C1 10.532, C2 10.540 fF;
    S11 -51.21 / -31.22 / -23.29 / -17.35 / -13.97 / -11.67 dB at 1 / 10 / 25 / 50 / 75 / 100 GHz; S21 -0.0882 /
    -0.3230 dB at 50 / 100 GHz. Port Z 39.22 vs em2d 43.32 ohm (-9.5 %, warning).
  - 97,392 DOF (mesh max_edge 13, max_dz 4; companions 42,095 / 42,163), 4 frequencies 173.6 s, peak RSS 2.24 GB:
    L 8.966 / 8.965 / 8.957 / 8.931 pH; C1 10.031, C2 10.026 fF; S11 -51.74 / -31.75 / -17.87 / -12.16 dB; S21
    -0.0789 / -0.2888 dB at 50 / 100 GHz. Port Z 40.43 ohm (-6.7 %).
  - L now rises toward the reference with refinement (8.913 -> 8.966 vs 9.03); C falls (10.53 -> 10.03 vs 9.37).
  - The L7 "9.07 pH at 103k DOF" was a prototype value; not reproduced by shipped code; withdrawn (97.4k DOF gives 8.966).
- 2026-10-20 21:54 PDT Low-frequency conditioning, EM-4 59.5k DOF, solver Z: L 8.870 / 8.870 / 8.914 /
  8.913 / 8.913 / 8.913 pH and C1 -4161 / -9.7 / 82.6 / 13.24 / 10.532 / 10.532 fF at 1e-5 / 1e-4 / 1e-3 / 0.01 /
  0.1 / 1 GHz; det-Z cancellation 5.1e-14 / 2.2e-14 / 2.8e-11 / 8.1e-10 / 7.4e-8 / 7.4e-6. Limit set at 1e-8 (warn).
- 2026-10-20 22:09 PDT (logged after the work, done between the 21:5x and 22:02 entries) S4 / M9 additions: WASM-without-SIMD fallback warning (`em2d/ldlt-select.mjs`
  factorFallbackWarning, used by em2d and em3d runners); warning when a port face crosses a PML slab (port modes use
  the unstretched materials; test microstrip with PML on zmax across both port faces: zero-length de-embedded core
  |S11| 2e-2 at 10 GHz vs 6e-5 without PML). EM-4 lossy variant with cut companions: 56,618 DOF (companions 23,994
  each), L 9.332 / 9.091 pH and C1 10.62 / 10.63 fF at 10 / 50 GHz, S11 -31.22 / -17.31 dB.
- 2026-10-20 22:09 PDT (logged after the work, done before the 22:02 test runs) Self-review fix: line run now needs the two ports on opposite sides of one axis (for an L bend
  the lead region of one port touches the other port's side, a port boundary in the device and pec in a companion);
  reference planes that cross (d1 + d2 > box length) are an error. With that, every PML slab is parallel to the lead,
  so companions keep the device PML unchanged.
- 2026-10-20 22:02-22:08 PDT Tests. New `engine/tests/em3d-deembed.test.mjs` (7 tests); `em3d-em4` updated (L band
  5 % -> 3 %, companion z-planes / reference planes / face impedance asserted). em2d + em3d files: 38 / 38 pass.
  Full engine suite `cd engine && nice -n 10 npm test`: 290 / 290 pass, 156.5 s, peak RSS 1.08 GB (22:05:39-22:08:16
  PDT). The suite ran twice: the 22:02-22:05 run's summary lines were cut by my output filter, so it was re-run with
  the output in a log file (scratch, outside the repo).

## Results

### EM-4 vs L5 (base variant, quasi-static reference L 9.03 +- 0.03 pH, C1 = C2 9.37 +- 0.02 fF)

| Quantity | L5 | L7 shipped (59.8k DOF; companion re-meshed) | L13 (59.5k DOF; companion cut from device mesh) | L13 (97.4k DOF) |
|---|---|---|---|---|
| L at 1 / 10 GHz (pH) | 9.03 | 9.271 / 9.270 (+2.7 %) | 8.913 / 8.913 (-1.3 %) | 8.966 / 8.965 (-0.7 %) |
| L at 100 GHz (pH) | - | 9.180 | 8.878 | 8.931 |
| C1 / C2 (fF) | 9.37 | 10.392 / 10.374 (+11 %) | 10.532 / 10.540 (+12 %) | 10.031 / 10.026 (+7 %) |
| S11 1 / 10 / 50 / 100 GHz (dB) | -52.5 / -32.5 / -18.6 / -12.9 | -51.44 / -31.44 / -17.57 / -11.84 | -51.21 / -31.22 / -17.35 / -11.67 | -51.74 / -31.75 / -17.87 / -12.16 |
| S21 50 / 100 GHz (dB) | -0.067 / -0.241 | -0.0841 / -0.3104 | -0.0882 / -0.3230 | -0.0789 / -0.2888 |
| companions (DOF) | - | 20,389 / 20,192 (own mesh) | 25,968 / 25,968 | 42,095 / 42,163 |
| wall time, peak RSS | - | 4 f: 39.0 s, 1.50 GB | 6 f: 72.7 s, 1.57 GB | 4 f: 173.6 s, 2.24 GB |

- 97.4k DOF mesh: `mesh: {max_edge_um: 13, max_dz_um: 4, grade: 0.42}`, `max_dof: 2e5` (run override, not in the case).
- L7's 103k-DOF "9.07 pH (+0.4 %), C 10.03 fF, S11 -31.76 dB" were prototype values; the shipped code was not run
  there. Withdrawn. The shipped code at 97.4k DOF gives 8.966 pH, 10.03 fF, -31.75 dB.
- Reading: with the companion on the device mesh, L converges from below (8.913 -> 8.966, toward 9.03) and C from
  above (10.53 -> 10.03, toward 9.37). The L7 +2.7 % L agreement at the browser budget was partly a mesh-mismatch
  offset (A3 S3). C and S11 (+1.3 dB / +0.75 dB) are mesh-limited (port Z 39.2 / 40.4 vs 43.3 ohm converged 2D).
- Timing correction (A3 M9): companions are not "solved once per sweep". Mesh cut and symbolic analysis run once per
  variant; the numeric factor and solve run at every frequency (EM-4 browser mesh: about 2.4 s per companion per
  frequency on this shared machine; the DUT about 7.5 s).

## SPEC 14 note (coordinator to merge into 14.4; additive)

- `line_run` companions are cut from the device mesh (`subMesh`): same 2D triangulation, z-planes and tet split over
  the lead, same box sides, materials and PML. The device mesh conforms to each reference plane (`cuts`: a
  box-spanning constraint line for an in-plane plane, an extra z-plane for an axial plane), which can add a few hundred
  DOF (EM-4 +270; EM-4 grade 0.4 -> 0.42 to stay under 6e4).
- Eligibility: 2 ports on opposite sides of one axis, single-signal quasi-TEM, deembed_um > 0 on one port. An explicit
  `line_run` that does not apply warns and uses port extension. `deembed_method` must be `line_run | port_extension`.
- Errors: `deembed_um` < 0 or > the uniform lead (port face to the nearest solid boundary along the normal);
  d1 + d2 > box length.
- Companions are solved at every frequency (factor per frequency); `derived.companions[]` = {port, dof, tets,
  reference_plane {axis, at_um}, layers, tris2d, pml_sides, z_face_ohm, z_ref_ohm, setup_ms, ms}; companion warnings
  are prefixed `line-run companion <port>:`; progress stage `companion`; `timing.mean_freq_ms` includes companions.
- `port_checks[]` adds `z_check: ok | warn | not_checked` and `z_check_reason`; a `not checked: <reason>` warning for
  multi-signal, full-wave and te10 ports, a signal not crossing the face, and em2d errors.
- De-embedding and the pi model use the solver's Z (no S -> Z round trip). `rows[].checks.det_cancellation` =
  |det Z| / max(|Z11 Z22|, |Z12 Z21|); a warning below 1e-8 (EM-4: C +26 % at 0.01 GHz, exact to 1e-4 at 0.1 GHz).
- Warnings: a port face crossing a PML slab; `factor: 'wasm'` without WebAssembly SIMD (also em2d).
- Touchstone header states the de-embedding actually used.

## Open (hand-off)

- The em2d reference of the port-Z check is one fixed P2 mesh (A3 M9); not refined here.
- UI label "S (port modal impedance)" on raw `S_port_ref` (`app/src/lib/sim/emResults.ts:42`, A3 M9): app scope,
  routed to the coordinator.
- Record fixes outside this lane: DevLog-012 L7 wave 6 entry and `validation/RESULTS.md` EM-4 row ("9.07 pH,
  103k DOF") -> the table above.
- Fresh-context audit of this lane's changes not run here (project agent cap; other lanes active).

## TODO (final)

- [x] Reproduce A3 S3 numbers (as coded; DUT z-planes injected)
- [x] cuts + subMesh in mesh.mjs; companion from the DUT mesh in run.mjs
- [x] S4 guards
- [x] M9 items (except the fixed-P2 2D reference and the app label, see Open)
- [x] EM-4 at ~6e4 and ~1e5 DOF with shipped code
- [x] tests; em2d + em3d; full suite
- [x] SPEC 14 note (for the coordinator)
