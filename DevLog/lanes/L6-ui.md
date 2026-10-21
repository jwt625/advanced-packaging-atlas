---
title: Lane L6 - U1 /sim workbench UI shell
date: 2026-10-20
status: in progress
scope: app/src/routes/sim/, app/src/lib/sim/, one nav line in app/src/routes/+layout.svelte, this file
owner: lane L6 (Claude subagent, DevLog-012)
---

# L6: /sim workbench UI shell (tranche U1)

Binding inputs: DevLog-012 (lanes, shared rules), sims/SPEC.md (case config, box parts, grid, results), DevLog-010
(A10, A11, U1-U2 row, Decisions 2026-10-20: GPL, deformation scale COMSOL-style automatic, JEITA warpage sign,
product presets), R7 (`DevLog/research/2026-10-20-sim-ui-ux-visualization.md`: reuse table 2.2, UI spec section 6,
gates 6.8). Port source: eo-modulator-atlas at eb97f96, `app/src/lib/sim/*`, `app/src/routes/sim/` (read-only).
`app/src/lib/three/` is owned by the 3D session (DevLog-011): import only, never edit.

## Plan (2026-10-20 13:16 PDT, before implementation)

1. **Ported generic modules** (`app/src/lib/sim/`, header line
   `// Ported from eo-modulator-atlas app/src/lib/sim/<file> at eb97f96 (GPL-3.0-or-later).` plus local changes):
   `Splitter.svelte`, `Icon.svelte`, `ticks.ts`, `colormap.ts`, `colorbar.ts`, `fieldmath.ts` (Range/autoRange/scaleT
   only), `exportUtil.ts`, `sweepValues.ts` (+ `logspace`), `units.ts` (packaging key suffixes), `LinePlot.svelte`,
   `pool.ts`, `urlState.ts`, `yamlEdit.ts`; from the EO engine: `yamlSplice.ts` (engine/src/yaml-edit.mjs),
   `siUnits.ts` (engine/src/postproc/units.mjs, + kelvin dimension), `expr.ts` (engine/src/params.mjs expression
   parser). Generalized from EO: `workbench.svelte.ts`, `ModelTree.svelte`, `Settings.svelte`, `BottomPanel.svelte`,
   `Field.svelte`. Tooltip: the atlas already mounts `app/src/lib/Tooltip.svelte` (same `data-tip` design as EO) in the
   layout, so it is reused, not copied.
2. **Cases**: `import.meta.glob('sims/*/*.yaml', ?raw)` inside `app/src/lib/sim/cases.ts`: lists every case at dev
   and build without copying into `app/static/` and without touching `vite.config.ts` or package scripts (each case is
   a lazy chunk). If no case exists for a family, the picker offers "family only": an in-memory `ap-sim/0` case text
   (`family`, empty `params`) so the YAML tab and splice edits work the same way.
3. **Engine adapter** `app/src/lib/sim/engine.ts`: `import.meta.glob('engine/src/*/index.mjs')` detects which lane
   modules exist (families L3, grid/thermal L1, materials L2). Families: `generate(familyId, params)` (SPEC 2) when
   present, else fixture = `package3d.json` family (parts/params with provenance; derived params re-evaluated from
   their `formula` with the ported expression parser; geometry stays the published default and the UI says so).
   Thermal Compute runs in `sim.worker.ts` only when L1's API exists; otherwise the button is disabled with the
   reason in its tooltip.
4. **Tree (R7 6.2 subset)**: Model; Global Definitions > Parameters, Materials; Component 1 > Geometry (parts by
   kind), Materials (per part), Mesh, Heat Transfer in Solids (sources, BCs from the case), Solid Mechanics
   (placeholder until E2), Electromagnetic Waves (placeholder); Study (studies from the case); Results (Datasets,
   Derived Values, Tables, Plot Groups placeholders). Tags: default, template, stale, blocked, off.
5. **Parameters node**: table Name / Expression / Value / Range / Status (R reported, D derived, P public, T
   template, U user) / Ref (hover: paper id, locator, table/row/field, basis); sliders for params with a bounded
   range (bounds only from the generator; none invented); constraint messages from generator `warnings`; product
   preset selector when L3 exports presets.
6. **Geometry preview** `app/src/lib/sim/graphics/`: own minimal three.js viewer (the `/3d` Viewer/FamilyScene API is
   tied to its Family model and is being edited concurrently): instanced boxes, exact axis-aligned section trim
   (closed boxes, so the cut face is filled), camera presets iso/front/top, z-exaggeration, render on demand,
   picking tooltip; provenance: solid edges = reported/derived/public, dashed edges and desaturated fill = template,
   accent edges = user-edited. Colors from `app/src/lib/three/materials.ts` (import).
7. **Run plumbing**: worker per Compute; progress rows, Cancel = terminate; staleness hash chain geometry -> mesh ->
   physics -> study -> results (COMSOL: stale tags, results kept); Messages with first-seen timestamps.
8. **Gates**: `pnpm check` 0/0, `pnpm build`, `/` and `/3d` unaffected, screenshots 1440 and 390 px, dark and light,
   in the session scratchpad; look at them.

## TODO

- [ ] Generic ports (1)
- [ ] Cases + engine adapter + fixture (2, 3)
- [ ] Workbench state, tree, settings, bottom panel, page, nav line (4, 7)
- [ ] Parameters node (5)
- [ ] Geometry viewer (6)
- [ ] Worker + Compute wiring (7)
- [ ] Gates (8)

## Progress log

- 2026-10-20 13:16 PDT: read DevLog-012, SPEC, DevLog-010, R7, EO sources; engine/src and sims/ cases are still empty
  (no lane API yet); plan written.
- 2026-10-20 13:30 PDT: generic ports done (Splitter, Icon, ticks, colormap, colorbar, fieldmath subset, exportUtil,
  sweepValues + logspace, units, LinePlot, pool, urlState, yamlEdit; engine ports yamlSplice, siUnits + K, expr).
  `yaml` added to app/package.json dependencies (needed by the YAML tab parse and splice edits; same ^2.9.1 as the
  engine; installed offline from the pnpm store). Workbench, ModelTree, Settings, BottomPanel, Field, ParamsTable,
  Graphics + graphics/BoxViewer, cases.ts (import.meta.glob of sims/*/*.yaml), engine.ts adapter (import.meta.glob of
  engine/src/*/index.mjs), engineRun.ts + sim.worker.ts, route /sim, nav line. `pnpm check` 0/0.
- 2026-10-20 13:31 PDT: dev server tmux `apa-sim-ui`, port 47352 (log logs/ui-dev-20261020T1400.log). First
  screenshots (scratchpad): fixture geometry, Parameters table, override via `set=`, expression edit splice and clear
  restore the text, picking selects the part node; computed border-radius 0 on every element, no NaN/undefined text.
- 2026-10-20 13:33 PDT: L1 grid/thermal index.mjs landed: `buildGrid(parts, opt)`, `solveThermal(grid, thermal,
  resolve, opt)`; engineRun chains them with the previewed part list (passed to the worker) and the L2 resolver.
  API shape checked in Node with a stub resolver (scratchpad only; grid 90 x 255 x 9 for cowos_l at 2 mm). Compute
  stays disabled until engine/src/materials/index.mjs exists.
- 2026-10-20 13:35 PDT: L3 families/index.mjs landed: `generate(familyId, overrides, {data})` -> parts, layers,
  arrays, boxes (grid input), params, warnings; GeneratorError with `issues`. Adapter uses `boxes` (dims attached
  from the source part / layer host / array), constraint errors keep the last valid geometry (first load: family
  defaults) with a red banner and the issue under the parameter row; presets via `params.preset`. `pnpm build` ok
  (first attempt failed while L3 index.mjs imported a file not yet written: the build depends on in-progress lanes).
- 2026-10-20 13:45 PDT: L2 `materials/index.mjs` is the Node entry (node:fs): the adapter globs the browser entry
  `materials/library.mjs` and bundles `engine/data/materials/*.yaml` (?raw) into `createLibrary({files, sources,
  aliases})`; aliasTemplateKey returns `{key, rationale}`. Materials node lists template key -> library key and k at
  25 C with provenance on hover. Dev-server finding: `?raw` imports of files outside app/ are refused by Vite
  (server.fs.allow = app/), the plain /@fs/ file is served: `cases.ts loadRaw` falls back to fetching the loader URL
  in dev only (build inlines the text). One console error per raw file remains in dev ("Failed to load module
  script"). Clean fix (outside this lane): `server: { fs: { allow: ['..'] } }` in app/vite.config.ts.
- 2026-10-20 13:45 PDT: em2d cases (sims/em, L7) are listed; they open in the YAML tab with a "U3" note and no 3D
  preview; the default case is the first 3D package case, else the CoWoS-L family session. Per-box T max coloring with
  the ported colormap/colorbar after a thermal run (derived value, labelled; field plots are U2). /3d and / spot-checked
  in the dev server: no page errors.
- 2026-10-20 13:50 PDT: hand-off. `pnpm check` 0/0, `pnpm build` ok (sim.html emitted; /, /3d, /table, /explore,
  /about unchanged). Compute is engine-wired but not yet exercised end to end: no 3D package case in sims/ yet (L3)
  and the L2 library does not load yet (YAML error in an in-progress data file). Dev server left running in tmux
  `apa-sim-ui` (port 47352).

## Open items (next session)

- [ ] End-to-end Compute on the first L3 case once the L2 library loads: progress rows, stale tags after a param edit,
  per-box T max colors, T(z) line plot; screenshot set again.
- [ ] Sliders: need generator bounds (`min`/`max`/`integer` on knob params, L3).
- [ ] Presets: PRESETS is empty in L3 at hand-off; selector wired (`params.preset`).
- [ ] `materials.overrides` (SPEC 1) not applied by the UI resolver wrapper.
- [ ] Orthographic camera toggle, ID-buffer picking, field material: U2.

## Wave 2 (U2) plan (2026-10-20 13:52 PDT, before implementation)

Coordinator assignment 2026-10-20 (U2 per R7 tranche U2, sections 4, 6.4, 6.7, 6.8). Coordinator added
`server.fs.allow ['..']` to app/vite.config.ts: the dev fetch fallback in cases.ts is removed (dev raw imports now
transform; no console errors on the Materials node). L2 `materials/index.mjs` is now Node-free (Node helpers in
node.mjs): the adapter uses index.mjs.

Engine state at 13:50 (Node probe, scratchpad only): cowos_l grid at max_xy 2 mm = 90 x 121 x 37 cells (4.2e5 nodes)
in 56 ms; a real thermal solve is blocked by library gaps, not by the UI: k is N/A for abf_*, core_lowcte,
underfill_cuf, polyimide_rdl, bcb, pid_*, snag, glass_en_a1 (13 of 47 keys have k); homogenized keys carry template
constituents (`homog:bga:solder+void:...`) that the library does not alias, and `void` has no entry.

1. Worker post session (`post.ts`, runs in sim.worker.ts; the worker stays alive after a solve and holds grid + fields,
   EO DevLog-030 P1): ops `surface` (exterior faces of active cells; optional axis-aligned clip: the clip plane is
   inserted as a grid plane and the field interpolated there, so the cut face is the exact slice of the expression),
   `slice` (axis-aligned plane, exact for Q1 on the rectilinear grid), `line` (values along x/y/z through a point),
   `probe` (cell lookup + trilinear interpolation). Expressions: T (K, display degC or K), cell size (mm), synthetic
   displacement (debug only, labelled). Typed arrays transferred; stale replies dropped by sequence number.
2. Field renderer (`graphics/FieldLayer.ts`): one ShaderMaterial (256x1 LUT DataTexture from colormap.ts, linear/log
   scale, range uniforms, deformation `p + s u` in the vertex shader with COMSOL automatic scale ~10 % of the geometry
   size shown and editable, z-exaggeration, flat shading from derivatives), wireframe overlay of the surface cells with
   cell-size coloring; added to BoxViewer as a second layer (boxes hidden in result views).
3. Probe and cut line: hover readout (value, part, material, x/y/z) from the hit triangle (barycentric, no worker
   round trip), click to pin; Cut Line x/y/z through the pin -> LinePlot.
4. Results tree: Datasets (Solution), Derived Values (Tmax per part, heat balance, timing), Temperature plot group
   (Surface + Slice settings: expression, unit, scale, range auto/manual, color table), T along z, Cut Line, Mesh view;
   placeholders Displacement / von Mises / Warpage with the JEITA ED-7306 sign-convention label (surface, view side),
   bound when L8 results exist.
5. End-to-end Compute: on L3 cases when they exist; meanwhile "Add default thermal study" on a family session splices
   an in-memory draft study into the YAML: die power, top HTC on the lid (or die tops), bottom HTC on the substrate,
   BGA dropped; every number `template` with rationale in `assumptions`; organics without library k mapped to the
   library entry `epoxy_generic` as an explicit, labelled substitution (UI exercise, not a prediction); banner on
   results of draft cases.
6. Performance (R7 6.7): largest buildable case; log surface triangles, first paint after solve, slice update time,
   orbit frame time (headless Chrome; GPU path if available) in this file.
7. Gates: check 0/0, build, screenshots 1440/390 dark/light (temperature surface, slice, probe, derived table) in
   scratchpad shots/u2/.

## Wave 2 progress log

- 2026-10-20 13:50 PDT: dev fetch fallback removed (fs.allow in place); Materials node loads the L2 library with no
  console errors. Adapter entry for materials switched to the Node-free `materials/index.mjs`.
- 2026-10-20 14:00 PDT: worker post session (`post.ts`: surface with exact clip plane, slice, line), FieldLayer
  (ShaderMaterial, LUT texture, linear/log, affine display unit, deformation uniform, derivative flat shading,
  wireframe), PostClient (stale replies dropped per channel), results tree and pages (Solution, Derived Values with
  per-part T and targets, Temperature plot group with Surface/Slice/range/color table, Mesh view with cell-size
  coloring, Probes with pin/CSV, Cut Line 3D, Displacement / von Mises / Warpage placeholders with the JEITA label).
- 2026-10-20 14:05 PDT: default thermal study (defaults.ts) on a family session: 100 W on the dies, HTC 5000 on the
  lid top, HTC 10 on all bottom faces, BGA dropped, every number `template` in `assumptions`; substitutions only for
  template keys whose library k fails (at 14:05 only `other` on the lid kind -> cu_lid; L2 had filled the organic k
  values by then). End to end in the browser on cowos_l: 90 x 121 x 37 grid, 9.1 s wall, Tmax 35.4 C, balance 3e-13.
- 2026-10-20 14:25 PDT: L1 `thermal/case.mjs runCase` + `libraryAdapter` (materials.map, materials.overrides via L2
  applyOverrides, per-study params) used in the worker when the family has a generator (package3d data sent with the
  run); the UI chain stays for fixture families. L3 case `cowos_r/thermal_rjc` runs end to end: grid 53 x 47 x 61
  (160,704 nodes), 3.4-4.7 s, Tmax 99.36 C (ubump_soc_soc_2), Rjc 0.00791 C/W; targets come back `unchecked` (no
  metric lookup in the browser; the CLI reads data/metrics.csv).
- 2026-10-20 14:30 PDT: symmetry crops drawn mirrored (COMSOL Mirror 3D, display only, toggle); every mirrored copy
  requests its own surface / slice with the clip plane mapped into its data frame, so a section across the mirror
  plane is continuous; pins on copies map back with |x|, |y| for cut lines. Camera fit uses the field bounds.
- Dev-server note: other lanes' engine edits trigger full reloads in dev; screenshots and perf were taken against
  `pnpm build` + `pnpm preview` on port 47353 (stopped afterwards); the preview must be restarted after each build
  (sirv caches the file list).

### Performance (R7 6.7), Apple M4 Pro via ANGLE Metal, headless Chrome, production build

| Case | Grid | Measure | Result | R7 target |
|---|---|---|---|---|
| cowos_l default study, max_xy 0.5 mm | 158 x 185 x 37 cells, 1,123,812 nodes | solve (L1 pcg_mg) | 17.9 s wall | - |
| same | 121,878 surface faces (243,756 triangles) | first field paint after the result | 92 ms | <= 500 ms |
| same | 243,756 triangles, 1 draw call | orbit frame (render + readPixels sync) | median 1.4 ms, p95 1.8 ms | <= 16.7 ms |
| same | surface + slice + wireframe, 284,876 triangles, 4 calls | orbit frame | median 2.7 ms, p95 3.7 ms | <= 16.7 ms |
| same | 1.08e6 cells | slice drag (worker, per update) | 3.7-9.0 ms | <= 50 ms |
| same | 1.08e6 cells | section drag (surface re-extraction with clip, worker) | 19-71 ms | <= 50 ms (partly above) |
| Node kernels, cowos_l max_xy 0.35 mm | 2.09e6 cells | surface / clip / slice z | 206 / 81 / 8.4 ms, 417,424 triangles | - |

Not reached: ~1M surface triangles (the largest package surface built here is 417k triangles at 2.1e6 cells; the
0.35 mm browser solve did not finish within the 15 min script limit). Section drag above 50 ms at about 1e6 cells:
the clip path re-extracts the whole surface; a cached exterior surface plus a per-clip cap would fix it (open item).

## Open items after wave 2

- [ ] Targets: expected values need a metric lookup in the browser (metrics.csv equivalent in app/static/data).
- [ ] Section drag at >= 1e6 cells: cache the unclipped exterior and recompute only the cut-adjacent cells.
- [ ] Displacement / stress / warpage plot groups: bind to L8 `solveMech` results (u_m per node) and JEITA warpage.
- [ ] Deformation path is wired to a synthetic field behind `?debug=1` only (labelled), until u_m exists.
- [ ] Transient thermal studies (L1 has thermal_transient) are not offered in the Study picker yet.

## Wave 3 (U3 + mechanics binding) plan (2026-10-20 14:55 PDT, before implementation)

Coordinator assignment 2026-10-20 (wave 3). Decision on wave-2 open issue 1: L1 writes
`app/static/data/sim_targets.json` (scripts/build_sim_targets.py; referenced metric rows only); the worker passes it as
runCase `metricLookup` once it exists (not present at 14:55: targets stay `unchecked`, with the reason).

Engine state at 14:55 (read): em2d `runEm2d(case, {variants, log})` (SPEC 9; result variants[] with derived.rlgc,
modes, lines[].tables / s_params ([re, im] per entry) / mixed_mode, targets, touchstone [{name, text}], mesh, timing;
Node: em1 16 s, em2 7 s); em3d `runEm3d` (SPEC 14; derived.rows[] {f_GHz, S, S_port_ref, ports, checks, pi?};
Node: em4 92 s); mech `runMechCase(c, {generate, lib, applyOverrides, data, study, onProgress})` in mech/case.mjs
(results per uniform T: fields.u_m per node, derived.warpage[] {surface, warpage_um, sign_convention, view_side, ...},
von_mises_per_part, max_abs_u_m; targets); thermal_transient via L1 runCase (probes {t_s, T_C}, outputs).

1. Mechanics: thermo_elastic studies run `runMechCase` in the worker; the session keeps u_m per T point; expressions
   uz, |u| on the surface and slice; deformation from u_m (automatic COMSOL scale, editable); Warpage vs T plot
   (JEITA ED-7306 label with surface and view side in title, axis and CSV header; DB points from case targets with
   values / sim_targets.json); von Mises per part table (field recovery per node is not in the engine output).
2. Transient: thermal_transient studies runnable; T(t) per probe (LinePlot); final field shown.
3. EM: em2d / em3d cases dispatched in the worker; Results pages for EM: S-parameters dB and phase (LinePlot, log-f
   toggle, port-pair picker), Smith chart (own canvas), RLGC(f) table and plots, mixed-mode toggle (Sdd / Scc),
   Touchstone download, targets table, variant picker; geometry: em2d cross-section on a 2D canvas, em3d block in the
   three.js viewer (boxes, cylinders).
4. Pick channel (first version): geometry toolbar button; click a layer / bridge box -> em2d draft case (microstrip
   over the picked conductor level: line / space / thickness from the layer route, dielectric from the layer below;
   every value with status; eps_r / tan_delta from the library when present, else template).
5. Section drag: cache the unclipped exterior surface per expression; a clip only rebuilds the cells within the clip
   layer plus the cap (target <= 50 ms at ~1e6 cells).
6. Gates: check 0/0, build, screenshots in scratchpad shots/u3/ (EM S-params, Smith, a cross-section, mech).

## Wave 3 progress log

- 2026-10-20 15:00 PDT: mechanics bound. thermo_elastic studies run L8 `runMechCase` in the worker; the session holds
  u_m and L8's cell-corner von Mises per temperature point; expressions uz, |u|, von Mises (unsmoothed cell corners);
  deformation from u_m with the COMSOL automatic scale; temperature-point picker; Warpage vs T page (JEITA ED-7306
  label with surface and view side, sign convention in the tooltip and the CSV header; target points from case values
  or sim_targets.json rows); max von Mises per part table with L8 corner flags. fcbga_organic/substrate_warpage_bare
  s2 (mesh max_xy edited to 2 mm in the session): 17 x 17 x 26 grid, 25 C and 30 C, warpage -7.38 / -7.12 um on
  top:sr_top, 5.4 s wall. cowos_l/warpage_rt_ht s2 at its case mesh (77 x 69 x 109) fails in the browser with "Array
  buffer allocation failed" (L8 memory at that size; reported).
- 2026-10-20 15:05 PDT: section drag cache: exterior faces computed once per session; a clip draws only the kept
  side plus the cap of the clip layer. Node kernels on cowos_l: clip updates 5-12 ms at 5.1e5 cells, 5-15 ms at
  1.1e6, 9-24 ms at 2.1e6 cells (before: 19-71 ms at 1.1e6). Transient: thermal_transient studies runnable (L1 runner),
  T(t) probe page; no case in sims/ has a transient study yet (exercise via the YAML tab).
- 2026-10-20 15:20 PDT: EM UI. em2d / em3d cases run `runEm2d` / `runEm3d` (all variants) in the worker; pages:
  S-parameters (|S| dB and unwrapped phase, log-f toggle, Sij picker, single-ended per line and Sdd/Scc/Sdc/Scd
  blocks, em3d S at zref and at port impedance), Smith chart (own canvas, hover z), RLGC(f) plots and table plus modal
  alpha / eps_eff / Zc (em2d), targets (computed vs value, pass), Touchstone downloads, run info; geometry: em2d
  cross-section canvas (fit conductors / box, zoom, pan, hover with status and ref), em3d solids in the box viewer
  (cylinders for bumps, dielectrics translucent). em2 (6 variants) 29-30 s wall, 5 alpha targets pass; em4 (2
  variants) 181 s wall in the browser.
- 2026-10-20 15:30 PDT: pick channel (first version): geometry toolbar toggle; a picked routed level (or a part with
  routed levels) opens an in-memory em2d draft case: line width / thickness / dielectric below from the generator dims
  with their status, template ground / box / sweep / length listed in assumptions, eps_r / tan_delta / sigma from the
  L2 library or listed under missing. cowos_l LSI level lsi_ss_m_1: 0.8 um line, 2 um Cu, 1 um oxide (eps_r 3.75
  sio2_film), runs in 0.2 s.
- 2026-10-20 15:40 PDT: coordinator audit A2: M2 cut lines on mechanics results use the active expression (uz / |u| /
  T; von Mises and cell size fall back with a log line): 27/27 finite values on the fcbga case; M3 log scale disabled
  for signed uz (forced linear when uz is selected); M12 the worker fetches package3d.json once by URL (browser cache)
  instead of a 2.5 MB clone per Compute; EmSection a11y warning removed. sim_targets.json is fetched when present and
  passed as runCase metricLookup and as warpage overlay rows (absent at 15:40).
- Shared scratchpad note: other lanes write into the same session scratchpad; L6 scripts now live in `scratchpad/l6/`
  (an earlier `perf.mjs` of mine was overwritten by another lane's file of the same name).

## Wave 4 (U4) plan (2026-10-20 15:40 PDT, before implementation)

1. Isosurface: worker op `iso` (marching tetrahedra, 6 tets per active hex, nodal T / uz / |u|; levels as a count or a
   list); drawn with the field material (value = level) and optional transparency.
2. Arrows: worker op `arrows` sampling active cells on a stride grid (density = target arrow count): heat flux
   q = -k grad T at the cell centre (k diagonal per cell from the library resolver at the cell-mean T; Q1 gradient
   from the 8 corners) and displacement u (cell-centre mean of the corner nodes); instanced cone+shaft mesh, colored by
   |v| with the LUT, length proportional / normalized.
3. Compare runs: "Pin as A" keeps the solution worker of the current run; the next Compute is B; side-by-side panes
   with one camera (second renderer view), shared color range; difference A - B when the grids match (same nx ny nz
   and coordinates), computed in B's worker after A's nodal field is sent once.
4. VTU export: worker op `vtu`: UnstructuredGrid of the active cells (VTK_HEXAHEDRON 12), points = nodes, PointData T_K
   / u_m, CellData part_id, von_mises_Pa (corner mean) when present; inline binary (base64, UInt32 header), one file;
   checked by re-reading the XML structure (no ParaView here).
5. EM progress: consume L7 progress events when they land (per-frequency timing and ETA in the Progress tab).
6. Link: in-memory cases (pick channel, default study, YAML edits) encoded as `text=` (deflate-raw + base64url via
   CompressionStream) when the encoded length is <= 6000 characters; else a warning that the link carries only
   overrides.
7. M1: re-run cowos_l/warpage_rt_ht mechanics when L8 lands its memory fix (not in L8 notes at 15:38).

## Wave 4 progress log

- 2026-10-20 15:55 PDT: isosurfaces (worker marching tetrahedra, 6 tets per active hex; levels as a count inside the
  color range or an explicit list in display units; drawn translucent with the field material); arrows (worker:
  strided active cells, about N arrows; heat flux -k grad T with k from the case resolver at the cell-mean T, or
  displacement; instanced shaft+cone colored by |v|; proportional or normalized length; drawn in the solved domain
  only, not on mirrored copies); VTU export (UnstructuredGrid, VTK_HEXAHEDRON, nodal T_K / u_m, cell part_id and
  von_mises_Pa when present, inline base64 binary): cowos_r/thermal_rjc -> 160,704 points, 137,089 cells, 14.4 MB in
  184-205 ms, XML re-parsed (ElementTree) with the expected DataArrays; compare runs: "Pin as A" keeps A's worker
  (its replies routed to A's client), the next Compute is B; side by side with A's camera following the main view and
  one color range over both; difference B - A when the grids match (A's nodal T sent once to B's worker; cowos_r
  1866 W vs 1500 W: dT 0 at the fixed lid top to about -2.7 K at the dies); link carries in-memory case text
  (deflate-raw + base64url, <= 6000 characters; the pick-channel draft packs to 1226 characters and round-trips
  byte-identical); EM progress: per-step time and ETA from L7 progress events ({i, n, f_GHz, ms} objects or "k/n"
  strings) - L7 events not landed at 15:55, wired only. Camera fit now uses the narrower field of view (split panes,
  phone width).
- 2026-10-20 15:48-15:57 PDT: M1 in the browser after L8's memory pass (production build, ANGLE Metal, headless
  Chrome, one worker): cowos_l/warpage_rt_ht, case mesh unchanged (grid 77 x 69 x 65 at L8's thin-layer merge, quarter
  symmetry). s2 25 C: warpage -256.99 um on bottom:sbt_sr_b (JEITA ED-7306), 161 s wall; s3 240 C: +207.54 um,
  284 s wall (RT concave -> HT dome, sign flip). Matches L8's Node value at 25 C (-256.988 um). Peak RSS (ps
  sampling every 2 s): 1.43 GB for the largest Chrome process (the worker's renderer), 2.83 GB for all headless Chrome
  processes. Targets unchecked: no expected values in the browser yet (sim_targets.json absent).

## Wave 5 log (2026-10-20 15:58-16:04 PDT)

- sim_targets.json: the loader worked (247 rows read in the browser); my wave-4 statement that the file was absent
  was an unchecked assumption, and the mechanics path did not pass the rows on. Fixed: thermal targets get expected
  values through L1 runCase metricLookup (cowos_r/thermal_rjc: Rjc 0.00791 vs 0.0108 measured miss -26.7 %, vs
  0.00759 simulated pass +4.2 %; Tmax 99.36 vs 104.9 miss); thermo-elastic targets get the DB value attached for
  display (tolerance check stays with the engine) and every target row carries the DB condition / variant / basis /
  locator in its tooltip; warpage overlay points show the paper's condition and variant, with a note that signs are
  as reported by each paper (convention under review by lane L9).
- EM progress: L7 events (mesh, setup, ready, frequency, frequency_done, em3d factor fraction) shown with variant
  index, per-frequency time (mean of the last 8) and ETA over the remaining frequencies and variants; frequency start
  and factor fraction update the status line only (no row flood). em2: 224 progress rows, ETA reaches 0.0 s at the
  last frequency, 23.4 s wall.
- Arrows: drawn on every mirrored copy; mapped to the viewer world per arrow (direction follows the exaggerated
  geometry, shape and length not scaled). Mechanics screenshot tag now includes the study.
- 2026-10-20 16:03 PDT: cowos_l/warpage_rt_ht s2 in the browser with DB overlay: -256.95 um sim at 25 C vs DB +64 um (25 C) and -148 um (240 C) shown with condition / variant and the L9 sign note; 167 s wall.

## Wave 6 log (2026-10-20, after 17:45 PDT)

- Thermal and thermo-elastic studies now run through L10's `runCaseAll` in the worker with the CLI's deps
  (libraryAdapter resolve / materialOf, lib, applyOverrides, overrideStatuses, mech {runMechCase, mechLibrary,
  modelSurface, solveMech}, metricLookupFromJson over sim_targets.json, study, onProgress); the fixture chain remains
  only for families without a generator. Direct runMechCase call removed.
- Parity finding: the browser library lacked the E3 RVE homogenization resolver that `materials/node.mjs` attaches by
  default (CD7); with `lib.attachHomogResolver(createRveResolver)` added, browser = CLI exactly:
  cowos_r/thermal_rjc s1 Rjc 0.0079144 C/W, Tmax 99.368 C (25.5 s wall); fcbga_organic/substrate_warpage_bare s2
  -5.8026 um at 25 C, -5.5877 um at 30 C (71 s wall). Before the fix the browser gave -7.49 / -7.22 um (rule-of-mixtures
  homogenization).
- Note: the M1 browser numbers (wave 4, cowos_l -256.99 / +207.54 um) were computed without the RVE resolver and should
  be re-run for the record.

## Wave 7 log (2026-10-20 18:02-18:45 PDT): M1 re-run with the RVE resolver, RVE table, shape class

- Worker library: L8's precomputed RVE table (engine/src/homog/rve_table_defaults.json, bundled as a lazy chunk,
  loaded once per worker) attached with `createRveResolver(view, {...cfg, table})`; misses fall back to live RVE;
  page `?rve=live` forces live (measurements). shape_class shown on the Warpage page and in Derived Values.
- M1, cowos_l/warpage_rt_ht at the case mesh (grid 77 x 69 x 65, 1,081,080 DOF, q1im, pcg_gmg), production build,
  one headless Chrome (Metal):

| Run | s2 25 C warpage (um) | s2 centre - corner | s3 240 C warpage (um) | s3 centre - corner | wall s2 / s3 (s) | peak RSS |
|---|---|---|---|---|---|---|
| browser, live RVE (18:02 build) | -250.74496324 bowl | -246.04702 | +187.64744266 dome | +187.64744 | 169.4 / 272.5 | 1.51 GB largest Chrome process, 1.71 GB all |
| CLI, live RVE (loader before L2's 18:08 table default) | -250.74 bowl | -246.05 | +187.65 dome | +187.65 | 169.8 / 264.1 | 1.71 / 1.76 GB |
| browser, RVE table (18:16 build) | -250.74496324 bowl | -246.04702 | +187.64744266 dome | +187.64744 | 151.4 / 251.0 | 1.52 GB largest, 1.72 GB all |
| CLI, RVE table (default loader, --json) | -250.74496343 bowl | -246.04702397 | +187.64744258 dome | +187.64744258 | 143.2 / 259.8 | 1.56 / 1.58 GB |

  Browser vs CLI with the table in both: |dw| = 1.9e-7 um (s2) and 7.9e-8 um (s3), relative < 1e-9 (PCG rtol 1e-10
  level). Browser live vs browser table: identical to the printed 11 digits (exact table hits); the table saves
  18 s (s2) and 21.5 s (s3) of browser wall time. The wave-4 M1 numbers (-256.99 / +207.54 um, rule-of-mixtures
  homogenization) are superseded.
