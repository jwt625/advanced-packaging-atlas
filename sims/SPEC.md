# Simulation config and data contracts (v0)

Status: v0.25, 2026-10-22 (DevLog-012 T0; sections 7-25 additions; sections 21-25 and 14.6 from DevLog-013/014). Binding for all lanes. Changes: additive only, recorded in DevLog-012
"Contract changes" with date and lane. Plan and decisions: DevLog-010 (A1-A11).

Units: SI inside the engine (m, K, W, Pa, S/m). Config keys carry unit suffixes (`_mm`, `_um`, `_C`, `_K`, `_W`,
`_GPa`, `_ppmK`, `_GHz`). Temperatures in configs are `_C`; the engine converts to K.

## 1. Case config (`sims/<family>/<case>.yaml`)

```yaml
schema: ap-sim/0
id: cowos_l/warpage_rt_ht            # = path under sims/ without .yaml
title: CoWoS-L CoW-on-substrate warpage, 25 C and 240 C
status: unvalidated                  # unvalidated | verified | validated | measured_regression | draft
family: cowos_l                      # engine/src/families/<family>.mjs (D2)
params:                              # overrides of family params; value or "=expr" (EO params grammar)
  hbm_n: 8
  soc_w_mm: 26
geometry:
  symmetry: quarter                  # none | half_x | half_y | quarter; rejected if the layout is not symmetric
  drop_kinds: [ipd]                  # part kinds omitted from the sim model
  resolve: []                        # array ids kept as discrete solids (default: arrays become homogenized layers)
materials:
  map: {}                            # part id | part kind | template material key -> library key (D1)
  overrides: {}                      # library key -> partial property object with its own provenance
mesh:
  max_xy_mm: 1.0                     # in-plane target size
  min_cells_per_layer: 1             # through-thickness cells per box layer (>= 2 for elastic bending, A3)
  grading: 1.3                       # max neighbor size ratio in x and y
  max_nodes: 300000                  # hard budget; exceeding it is an error, never a silent coarsening
physics:
  thermal:
    sources: [{parts: "soc_*", power_W: 700, distribution: uniform_volume}]
    bcs:
      - {selection: "top:lid", type: htc, h_W_m2K: 20000, T_inf_C: 25}
      - {selection: default, type: adiabatic}
  mechanics:
    element: q2s                     # q2s (20-node serendipity) | q1im (Q1 + incompatible modes)
    stress_free_C: {default: 25, per_part: {}}
    supports: rigid_motion           # rigid_motion (3-2-1, zero reactions) | symmetry (mirror planes + 1 z point); never both
studies:
  - {id: s1, type: thermal_stationary}
  - {id: s2, type: thermo_elastic, temperature: {uniform_C: [25, 240]}}   # or {from: s1}
targets:                             # comparison rows, each keyed to the DB
  - {metric_id: ectc51909.2023.00091-a-m1, quantity: warpage_um, selection: "bottom:substrate",
     definition: jeita_ed7306, T_C: 25, tolerance: {rel: 0.3}, tier: D}
assumptions: []                      # free text, one per item
missing: []                          # inputs not disclosed by any source
```

Rules: a key the engine does not know is an error. Every number that is not a family default or a library value must
come with provenance in the case (`assumptions` entry or a `{value, status, ref|note}` object).

## 2. Box part list (family generator output, D2 -> E1)

`generate(familyId, params) -> {params, parts, arrays, layers, provenance, warnings}`, pure JS, deterministic.
`params`: resolved values with their dims entries `{value, unit, status, ref?, note?, formula?}`; `status` in
`reported | derived | public | template | user` (A11). Defaults come from `app/static/data/package3d.json`
(`families[].params`); user overrides get `status: user`.

Part (same field names as `package3d.json` parts, a subset):

```jsonc
{"id": "hbm_3", "kind": "hbm", "material": "silicon", "x_mm": 12.1, "y_mm": -8.0, "w_mm": 11.0, "d_mm": 11.0,
 "z_um": 2300.0, "h_um": 720.0, "in": "mold_1", "priority": 2, "dims": {"h_um": {"status": "public", "ref": "R12"}}}
```

- `x_mm`, `y_mm`: footprint center; package centered at (0, 0). `z_um`: bottom; z = 0 at the lowest point.
- Overlap: the cell material is the part with the highest `priority` containing the cell center; default priority =
  containment depth (a part `in` a host outranks the host).
- Arrays (bumps, TSVs, vias) and thin layers become **homogenized boxes** with `kind` = the array kind and
  `material` = a derived library key (`homog:<array kind>:<base materials>:<area fraction>`), unless the case lists
  them in `geometry.resolve`. Key forms: section 10 (`homog:<kind>:<inclusion>+<matrix>:<fraction>`) and section 11.

## 3. Grid (E1 `src/grid/`)

```jsonc
{
  "xs": Float64Array, "ys": Float64Array, "zs": Float64Array,   // node coordinates (m), strictly increasing
  "nx": 0, "ny": 0, "nz": 0,                                      // cell counts = xs.length - 1, ...
  "cellPart": Int32Array,      // nx*ny*nz, index into parts, -1 = void (air, not meshed)
  "cellMat": Int32Array,       // index into materials
  "parts": [/* box parts */], "materials": [/* resolved material keys */],
  "selections": {"bottom:substrate": {"axis": "z", "side": "-", "cells": Int32Array}},   // boundary faces by name
  "symmetry": "quarter", "stats": {"nodes": 0, "cells": 0, "maxAspect": 0}
}
```

Cell index `c = i + nx * (j + ny * k)`; node index `n = i + (nx + 1) * (j + (ny + 1) * k)`. Every box boundary lies on a
grid plane. Named selections: `top:<part>`, `bottom:<part>`, `side:<part>`, `default` (all exterior faces not otherwise
assigned), and the symmetry planes `sym:x`, `sym:y`.

## 4. Materials (D1 `src/materials/`, data in `engine/data/materials/*.yaml`)

`resolve(key, T_K) -> {k_W_mK: [kx, ky, kz], rho_kg_m3, cp_J_kgK, elastic: {type: iso, E_Pa, nu} | {type: ortho, Ex,
Ey, Ez, nuxy, nuyz, nuxz, Gxy, Gyz, Gxz} | {type: cubic, C11, C12, C44, orientation}, cte: {kind: secant, Tref_K,
alpha: [ax, ay, az]}, eps_r, tan_delta, f_ref_Hz, sigma_S_m, provenance}`. The secant alpha is rebased to the
requested stress-free temperature by `rebaseSecantCte(entry, Tsf_K, T_K)` (R1 Sec. 1.2 closed form). Unknown key or a
property needed but `N/A`: error naming the key and property; never a silent default.

## 5. Results (E1/E2)

```jsonc
{"study": "s1", "type": "thermal_stationary", "grid": {...}, "fields": {"T_K": Float64Array /* per node */},
 "derived": {"Tmax_C": {"value": 0, "part": "soc_1"}, "heat_in_W": 0, "heat_out_W": 0, "balance_rel": 0},
 "timing": {"grid_ms": 0, "assemble_ms": 0, "solve_ms": 0, "iterations": 0, "nnzL": 0}, "warnings": []}
```

Thermo-elastic adds `fields.u_m` (3 per node, interleaved) and derived warpage per JEITA ED-7306 (`warpage_um` with
`sign_convention`, `surface`, `view_side`), best-fit-plane coplanarity, max von Mises per part (flagged when at a
re-entrant corner).

## 6. Validation cases (`validation/cases/<tier>/<id>.yaml`, D3)

Tiers: A analytic, B benchmark / cross-solver, C paper-simulated, D paper-measured, H high-level reported trends
(range or direction). Each case: `inputs` (same blocks as a sim config, or a self-contained analytic geometry),
`expected` (value, unit, tolerance, source / formula), `provenance`, `missing`, `assumptions`, `status`.

## 7. v0.1 additions (2026-10-20, from lane L1; implemented in engine/src/grid and engine/src/thermal)

- Selections: exterior faces only (neighbour void or outside the model; symmetry planes excluded), shape
  `{groups: [{axis, side, cells}], area_m2, faces}` plus `axis/side/cells` when there is a single group. Kinds
  `top: bottom: side: xmin: xmax: ymin: ymax:<part>`, globs on part ids (`top:hbm_*`), `default`, `sym:x`, `sym:y`.
  `half_x` keeps x >= 0 with plane `sym:x` at x = 0 (same for y).
- Mesh keys: `max_z_mm` (optional through-thickness cap), `snap_xy_um` (default 1), `snap_z_um` (default 0.01);
  every snap is reported in `warnings`.
- Thermal BCs: `temperature` {T_C | T_K}; `htc` {h_W_m2K, T_inf_C | T_inf_K}; `heat_flux` {q_W_m2 | power_W},
  positive inward, `power_W` is full-model power; `adiabatic`; `symmetry` (on `sym:*` only); optional `note`. BC
  precedence: later explicit BCs override earlier ones on shared faces; `default` covers only faces no explicit BC
  claimed; Dirichlet nodes win over flux terms.
- Sources: `{parts: glob | list, power_W | density_W_m3, distribution: uniform_volume, note}`; `power_W` is full-model
  power over the meshed volume of the matched parts; under a symmetry crop the matched set must be mirror-closed.
- Results: `derived.components_W`, `derived.symmetry_factor`, `derived.parts {id: {Tmax_C, Tmin_C, Tavg_C,
  volume_m3}}`, `derived.T0_K`; `heat_in_W` / `heat_out_W` are full-model equivalents; `timing` adds `setup_ms,
  total_ms, solver, relres, mg, free_nodes, picard_iterations, picard_change_K`.
- Material map precedence: part id, then part kind, then template material key.
- Resolver call: `resolve(key, T_K, {need: ['k', ...]})`; thermal accepts `k_W_mK` as a scalar or `[kx, ky, kz]`.
- CLI targets: optional `value` and `study`; thermal quantities `Tmax_C`, `Tmin_C`, `Tavg_C` (selection = part glob),
  `heat_in_W`, `heat_out_W`; only targets with a `value` are checked (exit 2 on a miss).

Requested by L4 (status 2026-10-20 per audit A1): implemented by L1 in engine/src/thermal - `interface:<a>/<b>` +
`contact_resistance`, `source_patch`, `thermal_transient`, `temperature_field`, full-tensor k and orthotropic
orientation (section 12 convention); `heat_flux` also accepts the alias `flux_W_m2` for `q_W_m2`. Still pending:
point/face mechanical selections and roller/pin/fixed-component BCs, `initial_stress` (lane L8), validation schema
`ap-sim-val/0` (documented in validation/README.md).

## 8. v0.2 additions (2026-10-20, from lane L2; implemented in engine/src/materials)

- `resolve(key, T_K, opts)`: `opts.need` (default `['k', 'elastic', 'cte']`; thermal callers pass `['k']`),
  `opts.Tsf_K` (for `homog:` keys), `opts.f_Hz`, `opts.use: {property: alternative}`, `opts.elastic` (`iso_hill`,
  `iso_110`, `iso_100` shortcuts for cubic Si), `opts.orientation`, `allowExtrapolation`,
  `allowFrequencyExtrapolation` (both add a warning). Output adds `key`, `T_K`, `Tg_K`, per-property `provenance`;
  homogenized output adds `homogenization` (`rom` until E3), `topology`, `bounds` (Voigt/Reuss).
- Cubic `orientation`: `{frame, rotation_z_deg, note}`; default (100) wafer with edges along <110>.
- Homogenized keys: `homog:<kind>:<inclusion>+<matrix>:<fraction>[:axis]`.
- Browser use: `createLibrary(libraryInputFromDocs([{name, doc}, ...]))` from `materials/index.mjs` (no Node imports);
  Node file loading in `materials/node.mjs`.
- Template-basis policy (coordinator decision 2026-10-20, pending Wentao review): missing nu or k only, basis
  `template` (same-class analog > sourced class range midpoint > placeholder nu 0.30 for polymers), each with a
  `sensitivity` block that engine lanes must report.

## 9. EM 2D case (2026-10-20, from lane L7; implemented in engine/src/em2d, entry runEm2d)

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

Results: section 5 shape with `type: em2d_rlgc`, `fields: null` (no field arrays); API details in `DevLog/lanes/L7-em2d.md`.


## 10. v0.3 additions (2026-10-20, from lane L3; implemented in engine/src/families)

- `generate(familyId, overrides = {}, {data})` -> `{family, generator, source, params, parts, layers, arrays, boxes,
  symmetry, provenance, warnings}`; `boxes` is the sim box list (parts + homogenized arrays/layers) consumed by the grid;
  `symmetry = {mirror_x, mirror_y, allowed, note}` (geometry and materials only; loads are checked by the case).
  `check(familyId, overrides, {data})` returns all issues without throwing; `listFamilies()`, `PRESETS`, `HBM_TABLE`,
  `GeneratorError.issues`. Node helpers in `families/node.mjs` (`loadPackage3d`, `generateNode`, `checkNode`).
- Overrides: number, string, `"=expr"`, `{value, status, ref | refs | note | source}`, `{preset: name}`. Status
  dominance user > template > public > derived > reported; dependents of a user override become `user`.
- Param entries may carry `min`, `max`, `integer`, `bounds_basis`, `options`, `alternatives`.
- Parts carry `priority` and per-dimension `dims` provenance for x/y/z/w/d/h; warnings are `{code, level, message}`.
- Homogenized keys: `homog:<kind>:<inclusion>+<matrix>:<fraction>` (area fraction pi d^2 / (4 p^2); Cu annulus for
  plugged PTH; matrix = host solid material or `void`), routed metal levels `homog:rdl_layer:<metal>+<matrix>:<fill>`;
  the fraction's status follows its inputs (never upgrades).
- `{value, status, ref}` objects are allowed wherever a number is in a case.

Implemented by L1 (audit A1, 2026-10-20): study-level `params` / `stress_free_C` / `geometry.drop_kinds`;
target keys `study`, `reference_study`, `definition` (`ratio_to_reference`, `max_over_part`,
`tj_max_minus_tc_over_p`), tolerance forms `{rel}`, `{abs_C}`, `{sign_only: true}`, quantities `stress_norm`,
`von_mises_max_MPa`, `Rjc_C_W`, selections `part:<glob>`, `corner:<part>`.

## 11. v0.4 additions (2026-10-20, from lane L2 wave 2)

- `materials.overrides` shape (case level), keyed by library or template key; each field `{value, status, ref | note}`:
  `E_GPa`, `nu`, `cte_ppmK` (number or `{alpha1, alpha2, Tg_C}`), `k_W_mK` (number or `[kx, ky, kz]`),
  `rho_kg_m3`, `cp_J_kgK`. `status` in reported | derived | public | template | user (template only for nu and k, with
  the default sensitivity). Applied by `applyOverrides(library, overrides)` (`materials/overrides.mjs`, browser-safe);
  basis `case_override`, source `case:<key>.<field>`.
- `resolve()` maps template keys through `aliasTemplateKey` (also inside `homog:` constituents); output adds
  `requested_key`, `provenance.alias(es)`, `provenance.template` (template-filled properties), `provenance.assumptions`.
- `void` matrix in `homog:` keys: no load, no heat; axial (column) direction gets f k and f E, other directions and
  shear 1e-5 of axial; CTE = inclusion CTE rebased to the stress-free temperature.
- Data basis values add `template` (nu and k only, with `sensitivity` and one of `analog_of | range_from |
  placeholder`) and `case_override`. `listTemplateValues()` lists all template values.

## 12. Material-frame rotation convention (2026-10-20, coordinator; binding for materials, thermal, mechanics)

Material axes are given in global coordinates (COMSOL / Abaqus style): `R` is the active rotation whose columns are
the local axes expressed in the global frame; tensors transform as `T_global = R T_local R^T` (k, CTE, strain,
stress; stiffness via the corresponding 6x6 Bond matrix). Angles `rotation_deg: [ax, ay, az]` compose as
`R = Rz(az) Ry(ay) Rx(ax)` (rotate about global x, then y, then z), right-handed, degrees. Example (validation MA8):
local CTE (11, 11, 16) ppm/K with the material axes rotated +30 deg about x gives a global tensor strain
eps_yz = (eps_yy - eps_zz) sin 30 cos 30 = -2.16506e-4 at dT = 100 K. The cubic `orientation.rotation_z_deg` of
section 8 follows the same convention.

## 13. v0.6 additions (2026-10-20, from lane L1 wave 2; engine/src/{grid,thermal,params}, cli.mjs)


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


Browser-safe runner: `runCase(config, {study, onProgress, generate, resolve, materialOf, data, metricLookup})`, `libraryAdapter(lib, map, {overrides, applyOverrides})`, `parseCase` in `engine/src/thermal/case.mjs`; `cli.mjs` is the Node wrapper.

## 14. EM 3D block case (2026-10-20, from lane L7 E6 phase 1; engine/src/em3d, entry runEm3d)


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


## 15. Mechanics (2026-10-20, from lane L8 E2; engine/src/mech, entries solveMech / runMechCase)


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


Element default `q1im` (Q1 + Wilson incompatible modes, statically condensed; A3 bake-off: equal to q2s within 7e-6..3e-5 on MA4b, ~1e-6 on MA4a thin layers, <= 4.9e-4 on MA5b, exact on MA6 at 3.3-3.8x fewer DOF; plain q1 locks -10 to -100 %); `q2s` is the reference element.

### 14.1 E6 phase 2 additions (2026-10-20, lane L7 wave 3)


- `ports[].signal` may be a list (one port face, K quasi-TEM modes, K terminals); `ports[].mode_type: tem |
  fullwave` (full-wave port eigenmode, one signal only); results `rows[].terminals`, `rows[].zref_native_ohm`.
- `em3d.mixed_mode_pairs: [[i, j], ...]` (terminal indices; result `rows[].mixed_mode` {Sdd, Scc, Sdc}).
- `solids[].allow_needle_ibc: true` overrides the needle-IBC rule (error otherwise; rule text in `em3d/run.mjs`
  checkNeedleIbc).
- S is now referenced to the real part of each terminal's characteristic impedance (power waves) before
  renormalization to `zref_ohm`.


### 14.2 Port placement rule (2026-10-20, lane L7 wave 4; enforced since wave 5, see 14.3)

Wave-port lead-in length from the nearest discontinuity >= max(2 h, w_max), where h is the signal-to-reference
distance and w_max the widest conductor on the port face; this keeps |S| errors <= 1e-3 with quasi-TEM ports
(microstrip step test at 50 GHz: 2.4e-3 at 0.33 h, mesh noise ~2e-4 from 1.3 h). Keep leads short otherwise: S21
phase drifts 0.3-0.5 deg after de-embedding from the 3D-vs-port beta mismatch; use `mode_type: fullwave` above about
30 GHz when phase matters. S11 values are referenced to the real part of the port impedance (section 14.1): a PML
reflection of -44.5 dB against the complex impedance reads -41.8 dB with a lossy (tan delta 0.01) line.

### 14.3 Port checks and run options (2026-10-20, lane L7 wave 5)

- Enforced port-lead rule (section 14.2): warn below max(2 h, w_max), error below half of it unless
  `ports[].allow_short_lead: true`; results carry `derived.port_checks`.
- Run options (not case keys) for `runEm2d` / `runEm3d` / `prepare3d`: `factor: blocked (default) | wasm | base`
  (WASM SIMD complex front update: 1.82x on EM-4, below the > 2x adoption gate of A9, so opt-in), `onProgress(event)`
  with stages `mesh`, `setup`, `ready`, `frequency`, `frequency_done`, and em3d `factor` {fraction}.

## 16. Validation status `untestable` and shape-gated targets (2026-10-20, lane L4 wave 5 after the L9 investigation)

- Case/target status enum adds `untestable` with `untestable_reason` (what input or physics is missing) and
  `activation` (what must exist for the target to become testable). Untestable targets are reported, never gated.
- Sign-only warpage gates carry `requires_shape_class: [dome, bowl]` and are evaluated only when the result's
  `shape_class` (lane L8, mechanics derived warpage block) is in that list; otherwise `indeterminate`.
- `validation/expected/implied_tsf.py` writes `implied_tsf.json`: the linear stress-free temperature implied by two
  measured temperatures, (w_HT / w_RT) = (T_HT - Tsf) / (T_RT - Tsf); a diagnostic, not a gate (paper FEMs that state
  their own Tsf land 18-38 C above it, which sets the normal spread).

### 14.4 De-embedding and port checks (2026-10-20, lane L7 wave 6, after the L5 desktop cross-check)

- `deembed_method: line_run | port_extension`; `line_run` (default for 2-port single-mode TEM blocks with leads) runs a
  uniform-line companion per port on the same mesh settings and recovers the block by 2-port ABCD inversion; results add
  `deembed_method`, `companions`. Progress events from companions carry `companion: <port name>`.
- `port_z_check` (default on): a converged 2D solve of each single-signal port cross-section; warns when the 3D port
  impedance differs by > 3 %; `port_checks` adds `z_port_ohm`, `z_em2d_ohm`, `z_rel`. A failing check means the 3D
  mesh under-resolves the line cross-section; results of such blocks are mesh-limited.
- `mesh.dz_min_um`, `mesh.dz_growth`: axial grading at layer interfaces.

## 17. Case-runner additions (2026-10-20, lane L10)

- Case keys: `mesh.thin: true | {max_aspect}` (L8 thin-layer merge, mechanics uniform-T studies only);
  `studies[].materials.overrides` (merged over case level per material and field, study wins);
  `materials.allow_extrapolation` at case and study level validated as true | false | [keys] (study `false` disables).
- Targets: one conversion helper `expectedFor(t, metricLookup)` (suffix-based: `_nm _um _mm`, `_Pa _MPa _GPa`, `_W`,
  `_C_W`, absolute `_C`); a unit of another dimension is never compared (`expected_unit_mismatch`, status unchecked);
  `expected_source` is `db:<table>`; runs with sensitivity-bound overrides carry `sensitivity_bound`.
- Exports from `thermal/case.mjs`: `expectedFor`, `thinOf`, `allowOf`, `studyOverrides`, `sensitivityBound`;
  `runCaseAll` is the single entry that applies all case features; direct `runMechCase` callers miss them.
- process_sequence studies run only on the mechanics runner (were mis-dispatched as transients).

## 18. Mechanics additions (2026-10-20, lane L8 waves 3-4)

- `derived.warpage[i].shape_class` in dome | bowl | W | saddle | flat with `shape_criterion`, `shape_detail` (flat:
  coplanarity < 1 um; saddle: fitted principal curvatures of opposite sign, smaller >= 10 % of larger; dome/bowl: both
  diagonal profiles single-signed and unimodal; else W).
- Eigenstrain: `solveMech({eigenstrain})` (linear | volumetric), `steps[].eigenstrain` in process_sequence,
  `runMechCase({cureShrinkage: 'library'})`; when the library kind is `not_stated`, both readings run and results carry
  `targets[].got_by_shrinkage` with a warning.
- Per-step material switch `steps[].materials.map` (stress-free restart in the new phase).
- Rate-form temperature sweep (`mech/sweep.mjs`, modulus at each step midpoint; required across Tg).
- Geometric nonlinearity (`mech/nonlinear.mjs`, total Lagrangian, q2s, load-stepped Newton; direct solves <= 1e5 DOF).
- Linear viscoelastic skeleton `solveViscoelastic` (Prony + WLF/Arrhenius, uniform T); no case-level study type yet.
- Status (2026-10-20, after L10 wave 4): nonlinearity, the rate-form sweep and cure shrinkage are reachable from cases
  (section 20); viscoelasticity remains library-only and is refused at parse time (no sourced Prony / WLF data).
- RVE precompute: `buildRveTable`, `createRveResolver(lib, {table})`, shipped `engine/src/homog/rve_table_defaults.json`
  (exact hit, else linear interpolation in T within 50 K at the same stress-free T, else live).

### 18.1 RVE table fingerprints (2026-10-20, lane L11)

RVE table rows carry `fp` (full mechanical request: elastic constants incl. orientation, CTE rebased to (Tsf, T), k,
rho, cp of the constituents actually used; stacks also hash layers, thicknesses and mode) and `fp_k` (thermal-only:
k, rho, cp). A row is used only when its fingerprint and the table's discretization settings (n, element, h_over_p,
richardson) match the current library at that row's T and Tsf (both bracketing rows for interpolated hits); otherwise
the RVE is solved live. Cache keys include the fingerprint. Every RVE entry carries `provenance.rve_table {status,
fingerprint}`; run counters via `lib.homogStats()`. Case and study material overrides and sensitivity bounds on
constituents therefore reach homogenized layers in both RVE and ROM modes.

## 19. Solver tolerance, convergence record, engine stamp (2026-10-20, lane L10 waves 2-3)

- `physics.mechanics.rtol`, `physics.mechanics.max_iter` (validated); CLI `--mech-rtol` overrides both. Defaults:
  1e-7 for package studies, 1e-10 for any study with a tier A or B target. Forwarded through runMechCase to solveMech
  (uniform-T studies; process_sequence and the rate-form sweep solve directly).
- Every iterative result carries `convergence` {relres, iterations, rtol requested and its source, converged,
  accepted}; not converged with relres < 1e-6 is a warning, >= 1e-6 a study error (targets unchecked).
- A single-step thermo_elastic study with per-part stress-free temperatures warns and suggests process_sequence.
- `engine_version` {src hash (engine/src *.mjs, *.json + cli.mjs), data hash (engine/data), dirty} on every CLI and
  runner result; printed first in summaries.

### 11.1 Override admissibility and expression k (2026-10-20, lane L11 wave 2)

- `applyOverrides` validates every value (including sensitivity bounds): E > 0; isotropic 0 <= nu < 0.5; k, rho, cp > 0
  (number or per axis); CTE finite; after rebuild the resolved stiffness is checked at the low, middle and high end of
  the valid temperature range (isotropic E > 0 and 0 <= nu < 0.5; orthotropic positive-definite compliance). Errors
  name key and field.
- `k_W_mK: {expr}` (or `{value: {expr}}`): scalar model `expr_T` (expression in T_C / T_K, params grammar; finite and
  > 0, checked at 21 temperatures); reaches plain keys and homog constituents in ROM and RVE (the fingerprint bypasses
  the table).
- `lib.homogStats({family: true})` adds `rom_fallback`, `rom_fallback_keys`, `rom_fallback_events` (RVE -> ROM
  fallbacks) over all libraries derived from one attachment.

## 20. Case keys for advanced mechanics and homogenization record (2026-10-20, lane L10 wave 4)

- `physics.mechanics.nonlinear` or study `nonlinear`: true | {max_dof, steps, tol}; total-Lagrangian q2s (forced, with
  a warning); default limit 1e5 DOF (error names the DOF count and fixes); uniform-temperature studies only; no stress
  fields in results.
- Study type `thermo_elastic_sweep` with `temperature: {path_C}`, `dT_max`, `max_dof` (rate form, required across Tg;
  one result per path temperature; 1e5 DOF guard).
- `materials.cure_shrinkage: off | library | both` (default off; stated in every mechanics result); `both` compares
  targets on the off run and attaches `got_cure_shrinkage`; `got_by_shrinkage` holds the linear/volumetric pair when the
  library kind is not stated; not applied to temperature.from, process_sequence or sweep studies.
- Viscoelastic studies (`visco*` types, `viscoelastic` keys) are refused at parse time.
- `homogenization_record` on results with homogenized parts: table exact/interpolated hits, fingerprint and other
  misses, live RVE solves, cache, RVE -> ROM fallback keys; label `rve` or `rve (with rom fallback for N keys)`.
- `engine_version` adds `package3d` and `metrics` hashes; `dirty` in true | false | 'untracked' | null.

### 14.5 Same-mesh companions and em3d guards (2026-10-20, lane L13 after audit A3)


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


## 21. Nonlinear stability, canonical homog keys, q2s smoother (2026-10-21, lane L20; DevLog-013)

- Nonlinear (section 18): case key `nonlinear.branch: stable | follow` (default `stable`). Each converged load step
  reports `negative_pivots` (inertia from an indefinite LDL^T fallback after a failed Cholesky), `stable` and
  `switched`. `stable` switches to the bifurcated branch (critical mode by inverse iteration, energy minimisation along
  it, then energy-descent Newton); `follow` stays on the current (unstable) path and warns at each unstable step. Results carry
  `extra.nonlinear.bifurcation[]` and bifurcation / unstable-step warnings.
- The q2s PCG path has no stability check: it warns, and an indefinite tangent raises a named error pointing to
  `linear: 'direct'`. Library opt-ins `predictor: 'secant'` and `lineSearch: 'slope'` exist (documented hazard: the
  secant predictor can jump to another stable branch); defaults unchanged.
- RVE table rows are indexed and matched by the canonical key `canonicalHomogKey(lib, key)` (constituents through the
  alias map, numbers normalized, default axis dropped, kind kept); entries keep the requested key; fingerprints
  (18.1) unchanged.
- `gmg.smoother: block | column` for q2s PCG (default `block`; the nonlinear PCG path uses `column`).

## 22. Tier-2 material data accessor and new units (2026-10-21, lane L21; DevLog-013)

- `lib.tier2(key, property, alternative?)` returns tier-2 data blocks (not used by default solves): viscoelastic Prony
  series with shift types `wlf`, `arrhenius` and `piecewise` (Arrhenius below Tc, WLF above); Anand 9-parameter sets;
  bilinear and multi-point plasticity; nested alternatives, each with source and locator. Schemas validated in
  `engine/src/materials/schema.mjs`.
- An instantaneous CTE given as an expression is integrated on a 0.5 K grid to the secant value.
- Units: modulus unit `1e12 dyn/cm2`.
- Pending for the viscoelastic engine lane: the `piecewise` shift in the mech viscoelastic code (it handles `wlf` and
  `arrhenius` only).

## 23. Layer regions and the CD6 overlap ceiling (2026-10-21, lane L19; DevLog-013)

- Generator layers with `route.regions` (package3d TEMPLATE_FORMAT "Per-region level properties") are transcribed by
  `engine/src/families/tools/transcribe.mjs`, resolved to rectangles with their own use, L/S and fill
  (`resolve.mjs`), and overlaid as homogenized boxes at the level's priority + 1 (`source: layer_region`).
- CD6 overlap ceiling (Wentao 2026-10-21, DevLog-012): a study above room temperature runs at most at the lowest upper
  data-range limit over the non-compliant materials of its stack (`engine/src/families/tools/ceiling.mjs` is the
  reference; it also reports the ceiling including compliant layers). Compliant layers (E <= 100 MPa at the study
  temperature) hold their last value beyond their range via `materials.allow_extrapolation` restricted to those
  keys, with the `extrapolated` provenance flag. Targets measured above the ceiling are compared at the ceiling with a
  note stating the measured temperature and the offset.

## 24. Variant files and E sensitivity status (2026-10-22, lane L26; DevLog-013)

- Labelled variant files live in `sims/<family>/variants/` (format of `engine/src/runner/variants.mjs`; read by
  `src/runner/node.mjs --variants`); they are not package cases (outside the app case glob and the families test).
- Material overrides of `E_GPa` accept status `sensitivity` (sections 11.1, 17), with the same admissibility checks.

### 14.6 Order-2 elements, iterative solver, lumped ports, adaptive sweep (2026-10-22, lane L22; DevLog-014)

- New `em3d` keys: `order` 1 | 2 (default 1); `solver` auto | direct | iterative; `iterative` {rtol, max_iter,
  restart, smooth, aux_smooth} (GMRES with two-level p-multigrid, direct order-1 coarse solve); `direct_max_dof`
  (default 3e4 at order 2); `coarse_max_dof` (default 6e4); `adaptive` {tol, max_samples, memory} (minimal-rational
  adaptive frequency sweep); `mesh.h_scale`. Order-2 DOF guard default 4e5.
- Lumped ports: `ports[]` entry {type: lumped, name, rect_um, direction, R_ohm}.
- Results: `rows[].solver`; `mesh.order`, `mesh.solver`, `mesh.pmg`; `derived.adaptive`; `port_checks[]` adds
  `z_em2d_cells`, `z_em2d_rel_change` (the em2d port-impedance reference now refines conductor cells 4..32 to 5e-4).
- Touchstone extension uses the terminal count (`.s{N}p`).
- Algorithms adapted from awslabs/palace (Apache-2.0) are listed in `engine/src/em3d/NOTICE`.

## 25. Thermal-only RVE rows, nonlinear step records, tier-2 provenance (2026-10-22, lane L27; DevLog-013)

- 18.1 addition: thermal-only (conduction) RVE requests are served only by thermal-only table rows (`fp_k`); a full
  row never serves k. Conduction-only RVE entries carry rho and cp by the mixture rule (homogenized layers work in
  `thermal_transient`).
- 21 addition: each checked nonlinear step carries `perturbed_pivots` (warning when > 0); branch-switch attempts carry
  `mode_residual` and `mode_iterations`; `switched` is present on every checked step; Newton counts sum all attempts.
- 22 addition: `analog_of` is allowed on any material leaf; nested tier-2 alternatives require `verified_on`.
