---
title: R7 - /sim UI/UX and 3D result visualization; reuse plan from eo-modulator-atlas and the /3d viewer
date: 2026-10-20
status: research report (read-only; nothing built)
parent: DevLog/DevLog-010-multiphysics-sim-harness-proposal.md
author: research subagent R7 (Claude, at Wentao Jiang's request)
---

# R7: /sim workbench UI/UX, 3D result rendering, reuse plan

Conventions: "EO" = sibling repo eo-modulator-atlas; "atlas" = this repo. Code claims cite repo-relative paths
(prefixed `EO:` or `atlas:`). External claims cite the Sources section [S#], retrieved 2026-10-20. Lines marked
**(estimate)** are engineering estimates to be benchmarked; **(unverified)** = not confirmed from a primary source
in this session; **(target)** = proposed budget, not a measurement.

## 1. Summary and recommendation

- **Renderer: stay on three.js 0.186 `WebGLRenderer`** (already used by `/3d`, atlas `app/src/lib/three/viewer.ts`),
  with one custom field `ShaderMaterial` (colormap LUT texture, scale mode, range, deformation scale, z-exaggeration,
  clip planes) and render-on-demand. `WebGPURenderer` exists in r186 (class present in the installed
  `three/build/three.webgpu.js`; `ClippingGroup`, storage buffer attributes also present), but the official manual
  still calls it experimental and says `ShaderMaterial`/`onBeforeCompile` are unsupported there (TSL node materials
  only) [S1]. Keep the field material and the geometry kernels behind a thin interface so a TSL port is local.
- **Geometry kernels in a worker (CPU, typed arrays, transferables)** for boundary extraction, slice planes,
  isosurfaces (one marching-tetrahedra kernel serves both: a slice is the zero isosurface of a signed distance),
  arrows and probes. Slice/iso outputs scale ~N^(2/3) of the volume, so their upload cost is small. Move the kernel
  to WebGPU compute only when the solver (R2) keeps fields on a WebGPU device; WebGPU is in Chrome/Edge 113+,
  Firefox 141 (Windows first), Safari 26 [S2], and browser marching cubes on WebGPU compute is shown to be fast [S3].
- **Cut face = slice plot.** For FEM results the section cap is not a stencil cap but the slice of the current
  expression through the volume cells, drawn at the GPU clip plane. Stencil caps (three.js `webgl_clipping_stencil`
  pattern, fragile per forum reports [S4]) are not needed: the atlas `/3d` already uses exact box trimming and cap
  quads (atlas `app/src/lib/three/build.ts`), which stays for the geometry/CAD view.
- **Skip volume rendering** (thin layered stacks; slices + isosurfaces + x-ray cover packaging use). Skip vtk.js,
  Babylon.js, deck.gl, regl as the main stack (Section 4.3). Own VTU writer for ParaView cross-checks.
- **Reuse: port, do not share yet.** About 20 EO modules port with little change (colormaps, colorbar, ticks,
  LinePlot, Splitter, Tooltip, export, sweep values, worker pool, results model, plot-group settings, tree pattern,
  YAML splice edits, URL state). Engine-coupled ones (YAML edit, expressions, units) import GPL-3.0-or-later EO
  engine code (`EO: engine/package.json` licence field). The atlas has **no LICENSE file** (checked repo root and
  `README.md`), so a licence decision is needed before copying engine-derived code (question Q1, Section 8).
  Extract a shared package only after both workbenches stabilise (Section 2.3).
- **Workflow:** family configurator as a COMSOL-style Parameters node with constraint messages and per-value
  provenance badges (reported/derived/template, the `/3d` convention, atlas `DevLog-008`); a "Pick channel" graphics
  mode that spawns a cut-out EM component with PML and numbered ports; COMSOL-style stale markers; run registry for
  compare; exports CSV, PNG, Touchstone `.sNp` [S12], VTU [S13].

## 2. Reuse plan

### 2.1 What exists

| Codebase | Scope | Key facts (file paths) |
|---|---|---|
| EO `/sim` | 2D cross-section workbench, ~9.7k lines in `EO: app/src/lib/sim/` | Model Builder tree `ModelTree.svelte` (379 lines); `Settings.svelte` (467); state class `workbench.svelte.ts` (909, runes, `$state.raw` for typed arrays); own WebGL2 renderer `renderer.ts` (755: layers surface/contour/region, colormap LUT texture, refined P2 display, Canvas2D fallback); `Graphics.svelte` (1209: pan/zoom, probe, cut line, select, ruler, export); results model `results.svelte.ts` (578: datasets, plot groups, features, selections, derived, tables); `PlotGroupSettings.svelte`; `LinePlot.svelte` (Canvas 2D, log axes, y2, CSV/PNG); `pool.ts` (sweep worker pool, no SharedArrayBuffer); `urlState.ts`; `yamlEdit.ts` (wraps `EO: engine/src/yaml-edit.mjs` splice edits); expression and unit system in the engine `EO: engine/src/postproc/{expr,units}.mjs` (521 + 167 lines, SI dimension vectors) |
| EO DevLogs | design record | `DevLog-027` layout/state/worker protocol/gates; `DevLog-030` COMSOL Results model, expression namespace, P1-P7 decisions; `DevLog-032` COMSOL semantics table; `DevLog-034` refined element-local display, smoothing "inside material domains" |
| atlas `/3d` | 3D package viewer, ~3k lines in `atlas: app/src/lib/three/`, `app/src/routes/3d/+page.svelte` | one `WebGLRenderer`, scissor viewports for compare with shared camera, render on demand (`viewer.ts`); merged box meshes, exact section trimming with unlit caps, dashed edges for template dims, instanced arrays with pixel-size LOD (instanced only when diameter >= 3 px and pitch >= 5 px, else pad slab; caps 40k per zoom window, 150k per family) (`build.ts`, `viewer.ts`); provenance types `DimStatus = reported | derived | template` (`types.ts`, `data.ts`); camera presets iso/front/top/bottom; hash URL `#f=<family>` |
| Stack parity | both apps | identical Svelte 5.57, Kit 3, Vite 8, adapter-static 4, TS 5.9 (`EO: app/package.json`, `atlas: app/package.json`); atlas adds three 0.186.1 |

Measured in atlas `DevLog-008` (2026-10-20): CoWoS-R 8-18 draw calls, 79k-923k triangles, orbit at 60 fps (cap) in
headless Chromium on Metal; three.js chunk 630 KB, loaded only on `/3d`.

### 2.2 Module reuse table

Action: **R** reuse near-verbatim (copy, header note "ported from EO <path>"), **P** port with changes, **G**
generalise to 3D, **N** new. "Engine import" = imports `EO: engine/src/*` (GPL-3.0-or-later).

| Module (EO unless noted) | Engine import | Action | Change for packaging /sim |
|---|---|---|---|
| `colormap.ts` (7 COMSOL-named tables, own anchors, tips) | no | R | add Jet-free default `Thermal` for T, `Wave` for signed stress/uz |
| `colorbar.ts` (legend draw, ticks, log/symmetric) | no (local `fieldmath`) | R | none; draws on the 2D overlay canvas over the three.js canvas |
| `ticks.ts` (linear/log ticks, labels) | no | R | none |
| `exportUtil.ts` (CSV, download) | no | R | add Touchstone + VTU writers (N) |
| `sweepValues.ts` (list, range, linspace, 200-point cap) | no | R | add `logspace(a,b,n)` for frequency |
| `Splitter.svelte`, `Tooltip.svelte` (sharp custom tooltip via `data-tip`), `Icon.svelte` | no | R | none |
| `LinePlot.svelte` (Canvas 2D, log toggles, y2, overlay points, CSV/PNG) | no | R/P | add dB/deg presets, overlay of DB metric points (shadow moire), error bars |
| Smith chart | - | N | Canvas 2D component sharing LinePlot hover/export conventions |
| `pool.ts` (`SweepPool`, `min(4, hardwareConcurrency-1)`, `?pool=N`, cancel = terminate) | types only | R | job payload = YAML text + overrides; 3D points are heavier: default pool 1-2 (target), memory-gated |
| `units.ts` (`unitOf` key suffix `_um`, `_ghz` ...) | no | P | add `_mm`, `_C`, `_K`, `_W`, `_Wpm2K`, `_ppmK`, `_GPa`, `_MPa` |
| `postproc/units.mjs`, `postproc/expr.mjs` (engine; parser, SI dims, display units) | is engine | P (licence Q1) | 4 base units (m, kg, s, A) must add K (temperature) for thermal |
| `yamlEdit.ts` + `engine/src/yaml-edit.mjs` (source splice: scalar edit changes one line; delete restores bytes) | yes | P (licence Q1) | none functionally; YAML stays canonical (EO D6) |
| `urlState.ts` (`?id&section&mesh&stages&set=path=value&sweep&values`) | via yamlEdit | P | grammar in Section 6.5 |
| `workbench.svelte.ts` (runes class, staleness keys, log, jobs) | yes | G | per-component and per-study-step hashes (Section 5.5); snapshot undo stack |
| `ModelTree.svelte` (flat node list with depth, tags warn/muted/crit, context menu) | no (imports workbench) | G | node set Section 6.2; selection-level icons; override/contribution decorations |
| `Settings.svelte`, `Field.svelte`, `UnitInput.svelte`, `ExprInput.svelte` | partly | G | sections per node type; provenance badge per field |
| `results.svelte.ts` (datasets, plot groups, features, selections, derived, tables) | no | G | 3D feature types (Section 3.4), selection levels domain/boundary/edge/point |
| `PlotGroupSettings.svelte`, `DerivedValues.svelte`, `ResultsPages.svelte` | partly | G | 3D features; derived kinds volume/surface/line/point; warpage/coplanarity |
| `renderer.ts`, `refined.ts`, `fieldmath.ts` (2D WebGL2, triangle bin index, P2 refinement) | refined: yes | concept only | 3D uses three.js; reuse the LUT/scale-mode shader math, refinement-level idea and "smoothing inside material domains" (EO `DevLog-034`) |
| `Graphics.svelte` (2D tools) | no | concept only | 3D tools listed in Section 6.1 |
| `post/contract.ts`, `post/client.ts` (request/reply with ids, cancel, stale replies dropped) | contract imports engine types | P | same protocol, 3D ops (Section 6.6) |
| atlas `three/viewer.ts` (renderer, OrbitControls damping, presets, scissor compare, render on demand, near/far, scale bar, thumbnails) | - | G | add orthographic camera, z-exaggeration, field layers, ID-buffer picking |
| atlas `three/build.ts`, `model.ts` (box model, trimming, caps, instanced arrays, LOD) | - | R | geometry/CAD view of the parameterised family before meshing |
| atlas `three/types.ts`, `data.ts` (`DimStatus`, `STATUS_TIP`, `dimRefs`, `worstStatus`) | - | R | provenance badges in Parameters/Materials/Geometry settings |
| atlas `app.css` sharp corners (`border-radius: 0` rules) | - | R | none |

### 2.3 Shared package between the two repos

- Licences: EO engine `GPL-3.0-or-later` (`EO: engine/LICENSE`, `engine/package.json`); EO app: no LICENSE file and
  no `license` field (`EO: app/package.json`), but it imports the GPL engine by relative path; atlas: no LICENSE file.
  Without a licence the atlas is all-rights-reserved by default. Wentao is the copyright holder of agent-written code
  in both repos (EO `DevLog-023` notes the engine's origin is his own `eo_fem` PlayGround project, GPL), so he can
  relicense; the question is which licence the atlas `/sim` should carry, not whether reuse is allowed. **(Legal
  status of agent-generated code not assessed here.)**
- Engine-free modules (colormap, colorbar, ticks, LinePlot, Splitter, Tooltip, exportUtil, sweepValues, pool) could
  go in a permissively licensed package; expression/units/YAML-splice are engine files and follow Q1.
- Recommendation: **port now, extract later.** A shared package (pnpm workspace or third repo) adds versioning and
  build coupling while both APIs still churn (2D vs 3D datasets, mesh types differ). Extract when >= 5 modules are
  byte-identical in both repos after the first packaging tranche. Until then, each ported file carries a one-line
  header with source path and EO commit, and a `PORTED.md`-style table is kept in the sim DevLog (not a new doc type;
  a section in the existing DevLog).
- Package managers: atlas uses pnpm (`atlas: DevLog-008` "pnpm check"); EO app scripts are npm-style
  (`EO: DevLog-027` "npm test"). Irrelevant for copy-port; matters only for a workspace package.

## 3. COMSOL 3D UX patterns to adopt

### 3.1 Geometry and selections

| COMSOL pattern | Semantics (source) | Adopt as |
|---|---|---|
| Work plane + Extrude, multiple distances = layers, "Keep cross-sectional faces" off removes interior boundaries | layers by distance list; Extrude can propagate named selections to resulting objects; "Extrude selections from work plane" carries 2D selections to 3D [S5] | Geometry is generated from the family template: one XY outline per layer (work plane at layer z) extruded by layer thickness. Tree shows Geometry > Layer stack (one row per layer, z range, material, provenance) instead of a free CAD history. Interior layer boundaries kept (they carry material interfaces and named selections). |
| Entity levels: domain, boundary, edge, point in 3D [S5] | selection lists per level | Selection mode toggle in graphics toolbar: Domain / Boundary / Edge / Point. Click picks via ID buffer; shift-click adds; ctrl-click removes. |
| Named selections ("Resulting objects selection", propagated) [S5] | selections auto-created per object | Auto selections from the template: per part (`soc`, `hbm_1..n`, `bridge_1..n`, `interposer`, `substrate`, `lid`), per material class, per layer, plus derived boundary sets (`substrate_bottom`, `top_surfaces`, `die_backsides`, `bga_seating`). Physics features select by name; user selections add to the list. |
| Layered Material / Layered Material Stack (layers bottom to top: material, thickness, mesh per layer; stack nodes compose subsets for drop-offs) [S6] | thin-layer modelling without meshing every layer | Show the BEOL/RDL/build-up stacks as Layered Material nodes with an "equivalent" (homogenised, R1) vs "explicit" toggle per stack; drop-offs map to the template's per-part layer lists. |

### 3.2 Physics node defaults and override indicators

- COMSOL: exclusive nodes override earlier ones on shared selections, the settings window lists entities as
  "(overridden)"; contributing nodes (loads, sources) add up; Model Builder decorates icons (red arrows for
  overrides, dot for contributions); an "Override and Contribution" section lists the relationships [S7].
- Adopt: default nodes created with each physics (greyed name, "default" tag, not deletable): ht "Solid", "Thermal
  insulation", "Initial values"; solid "Linear elastic material", "Free", "Initial values"; emw "Wave equation",
  "PEC", "Initial values". User nodes listed below defaults; later exclusive nodes win. Tree tag `ovr` on overridden
  nodes; settings show the selection list with "(overridden by <node>)" per entity; tooltip lists relationships.
- Defaults derived from the family template (heat sources on die domains, HTC on lid top and BGA side, rigid-body
  suppression) are tagged `template` with their rationale in the tooltip, the same provenance rule as `/3d`.

### 3.3 Study steps

- COMSOL predefined "Thermal Stress, Solid" interface adds Heat Transfer in Solids + Solid Mechanics + a Thermal
  Expansion coupling; temperature drives the structure one way (no feedback from displacement); the structural side is
  treated as quasistatic in time-dependent runs [S8].
- Adopt the three study templates (one click in the toolbar "Add study"):
  1. **Thermal**: Stationary (ht). Outputs T, heat flux, Rth = (Tmax - Tamb) / P.
  2. **Thermo-mechanical**: Step 1 Stationary (ht), Step 2 Stationary (solid, T from step 1; Thermal Expansion
     coupling, stress-free reference temperature field). Variant **Warpage vs temperature**: uniform temperature load
     (no heat solve) under a Parametric Sweep over T (reflow-profile points from the Parameters node), which is how
     shadow moire data are reported (JESD22-B112C scope: package warpage across surface-mount reflow conditions [S9]).
  3. **EM**: Frequency Domain with a frequency list (linear or log) and a port sweep for the full S-matrix (COMSOL
     needs numeric port names for port sweeps and Touchstone export [S10]).
- Study step settings show which physics/coupling nodes are solved; a node disabled in a step is marked with `*`
  (COMSOL marks study-step state that differs from Model Builder with an asterisk [S7]).

### 3.4 Results for packaging (3D)

Plot types present in COMSOL 3D: Surface (3D boundary), Slice, Multislice, Volume, Isosurface, Arrow Volume,
Streamline, Line (edges), Max/Min Volume, Mesh; Deformation is an attribute on a plot, not a plot type [S11].

| Feature | COMSOL semantics | Packaging use | Phase |
|---|---|---|---|
| Surface | quantity on boundaries [S11] | T on all exterior surfaces; uz on substrate bottom | 1 |
| Slice / Multislice | scalar on planes; number of planes or explicit coordinates per axis [S11] | T and von Mises through die/bump/underfill section | 1 |
| Isosurface | levels; Surface or Filled; transparency recommended for filled [S14] | T = Tjmax hot-spot shell; von Mises threshold shells at bump corners | 2 |
| Volume | quantity inside domains [S11] | filtered by selection (e.g. underfill only) as cell-faces of the selected domains | 1 (as filtered surface of selected domains) |
| Arrow Volume | arrows on a grid in 3D [S11] | heat flux, displacement direction | 2 |
| Streamline | vector field lines [S11] | heat flux paths from die to lid / board | 3 |
| Max/Min Volume / Surface | location + value markers, table of coordinates [S15] | Tmax, max von Mises location | 1 |
| Deformation (attribute) | default scale makes max deformation about 10% of geometry size; manual scale factor; scale 1 + offsets for side-by-side [S16] | every solid-mechanics plot; scale factor shown in the title and legend | 1 |
| Mesh plot | element color = quality (default skewness, 0 to 1, about 0.1 minimum satisfactory in 3D), size, type; filter `qual < eps` for inverted [S17] | mesh node view and mesh QA gate | 1 |
| Line (edges) | quantity on edges [S11] | domain outlines on slices and surfaces | 1 |
| Cut Plane dataset | 2D coordinate system in 3D; parallel planes with plane-number variable [S18] | section views exported as 2D plots; warpage maps on a plane | 2 |
| Cut Line 3D | two points in x, y, z [S19] | uz along package diagonal; T along die centreline; stress along the bump row | 1 |
| Cut Point 3D | evaluate over parameter or frequency [S20] | T at sensor point vs power; uz at corner vs T | 1 |
| Derived: Volume/Surface Max/Min/Average/Integration, Point Evaluation, Global | results into Tables; Surface Max over boundaries in 3D, Lagrange or Gauss points [S15] | Tmax per die, average T per HBM, max von Mises per domain, total heat | 1 |
| Global derived: warpage, coplanarity | project definitions (Section 5.7) | warpage(T) table and 1D plot | 1 |
| 1D: Global vs parameter, Point Graph, Line Graph, Table Graph [S11] | | warpage vs T with shadow moire overlay; Tmax vs power | 1 |
| S-parameter plots | dB variables S11dB, S21dB predefined; Smith plots predefined in RF Module [S10] | IL (S21 dB), RL (S11 dB), FEXT/NEXT (Sij dB), phase (deg, unwrapped toggle), group delay; Smith chart for Sii | 2 |
| Port mode field | port boundary mode fields (RF Module) **(unverified detail)** | E-field magnitude on each port face with mode impedance in title | 2 |
| Touchstone export | S, Y, Z, G or H; MA, RI or dB-angle; `.sNp` [S10] | `.sNp` from the port sweep, MA default, reference impedance from ports | 2 |

## 4. Browser rendering techniques for 3D FEM fields (0.1-5 M elements)

### 4.1 Techniques

| Technique | Approach | Cost **(estimate)** | Decision |
|---|---|---|---|
| Boundary surface extraction | hash each element face (sorted node triple); faces seen once = exterior; faces between different domains = interfaces. Keep both, tagged (domain pair, boundary id). Hex/prism faces split to triangles. | O(faces) = 4N for tets; 1M tets ~ 4M face visits in a worker, 0.1-0.4 s JS (estimate); done once per mesh | 1. Exterior + interface faces enable x-ray and per-domain filtering without volume traversal |
| Per-domain vertex duplication | vertices on interfaces duplicated per side so per-domain smoothing keeps material jumps (EO `DevLog-034` "inside material domains") | memory x ~1.1-1.5 on surfaces (estimate) | 1. Default smoothing = inside material domains; element-constant option |
| Field coloring | per-vertex Float32 value attribute; fragment: scale (linear, symmetric, log10, symlog) then 256x1 LUT `DataTexture`; range uniforms; contour bands from `fract` (EO `renderer.ts`) | one draw call per layer; expression switch = upload one Float32Array (1 value per surface vertex) | 1. Reuse EO shader math |
| Deformation | vertex shader `p = x + s * u`, u as vec3 attribute, `s` uniform; normals recomputed on CPU only when s changes and lighting is on (or use flat shading via derivatives `dFdx/dFdy` in fragment) | slider is free (uniform only) with derivative normals | 1. Scale default per COMSOL 10% rule [S16]; "true scale" button sets 1 |
| Z-exaggeration | separate uniform `kz` on z after deformation; axes, probe, ruler report true units | free | 1. Packaging aspect ratio (mm lateral, um layers) needs it; COMSOL-like View scale **(unverified COMSOL detail)** |
| Clip planes | `material.clippingPlanes` (WebGLRenderer, local clipping) on all field materials; up to 3 planes; intersect or union | free on GPU | 1 |
| Cut face cap | not stencil: the cap is the slice of the current expression at the clip plane, computed by the slice kernel (below) | as slice | 1. Atlas exact box-trim caps remain for the CAD view |
| Slice | marching tetrahedra on f = n.x - d (linear per tet, exact for P1 geometry): each tet gives 0, 1 or 2 triangles; field interpolated on cut edges. Hex/prism split to tets (hex 5 or 6, prism 3). Active-cell prefilter by per-cell min/max of n.x (bucket cells along each axis once) | 1M tets: tens of ms per plane in a worker (estimate); output ~N^(2/3) | 1. Drag-to-move coalesces to latest request (EO stale-reply pattern) |
| Isosurface | same kernel on the field; per-level; optional cell min/max interval tree for fast active-cell lookup | like slice plus tree build once per field | 2. CPU worker first; WebGPU compute when fields live on GPU (marching cubes on WebGPU compute performs close to native Vulkan per [S3]; Chrome shows 8 fps JS vs 60 fps compute for a marching-cubes demo [S21]) |
| Higher-order display | element-local refinement of level r on surface and slice triangles (EO `DevLog-034` lattice), capped total triangles | x r^2 triangles | 2 (P2 thermal/solid) |
| Volume rendering | tetrahedral ray casting or splatting | high complexity | skip (justified: thin layered domains, slices + filtered domains suffice) |
| Arrows | instanced arrow mesh on a 3D sample grid or on surface sample points; per-instance position, direction, length, color; length modes proportional/normalized/log (EO `DevLog-032`) | 10k-100k instances is one draw call | 2 |
| Streamlines | RK4 in a worker with tet neighbour walk; tube or line output | per seed ms (estimate) | 3 |
| Repeated cells (bumps, TSVs) | geometry: atlas instancing + pixel LOD (`build.ts`, `viewer.ts`). Results on homogenised bump layers: instanced glyphs with per-instance color from the field sampled at each bump centre (point location via cell bucket grid) | 150k instance cap per family already used | 1 for geometry, 2 for result glyphs |
| LOD / progressive | first paint = exterior surface with coarse colors (decimated proxy optional), then interfaces, then slices; >5M elements: show exterior + selected domains only, slices on demand | | 1: order of upload; decimation not needed below ~2-3M surface triangles (estimate) |
| Picking | GPU ID buffer render on click/hover-pause only: RGBA8 target encodes (layer, triangle id) in 32 bits (or `R32UI` integer target); read 1 pixel; then exact ray-triangle on CPU for barycentrics; interpolate value, domain, boundary id. Three.js manual describes the color-ID technique [S22]; the `webgl_interactive_cubes_gpu` example had a color-management regression after r152 [S23], so use a linear-color, no-tonemapping target | 1 extra pass on demand | 1. Raycaster on 1M triangles without BVH is too slow (estimate); three-mesh-bvh (MIT, licence unverified 2026-10-20) is the fallback |
| Context loss | `webglcontextlost`/`restored` handling, re-upload from worker caches (EO `DevLog-027` U1) | | 1 |

### 4.2 Memory sizing **(estimate)**

| Item | 1M tets | 5M tets |
|---|---|---|
| connectivity int32 x4 | 16 MB | 80 MB |
| nodes (tets/nodes ~5-6 for Delaunay-type meshes, estimate) ~180k x 3 float32 | 2 MB | 11 MB |
| one nodal scalar float32 | 0.7 MB | 3.6 MB |
| exterior + interface triangles (geometry-dependent; layered packages have many interfaces) | 0.3-1.5 M | 1-5 M |
| surface GPU buffers (pos + u + value, float32, duplicated per domain) | 15-75 MB | 50-250 MB |

Volume data stay in the solver worker; the main thread holds only surface/slice buffers (EO P1 decision: postprocessing
runs where the solution lives, `EO: DevLog-030`).

### 4.3 Library evaluation

| Library | Licence | Fit | Verdict |
|---|---|---|---|
| three.js 0.186 `WebGLRenderer` | MIT (three.js; not re-verified this session) | already in atlas; ShaderMaterial, clipping planes, instancing, render targets | **use** |
| three.js `WebGPURenderer` (r186) | MIT | experimental; WebGL2 fallback via `forceWebGL`; ShaderMaterial/onBeforeCompile unsupported, EffectComposer unsupported; async `init()` [S1] | evaluate in a spike (tranche 2+), port field material to TSL only if compute sharing needs it |
| vtk.js | BSD-3-Clause [S24] | rendering for ImageData/PolyData, some filters as demonstrations [S24]; tetrahedral grids typically reach it as extracted surfaces [S25] | no as main stack (second scene graph, bundle size); optional reference for filter algorithms |
| itk-wasm | Apache-2.0 [S26] | C++ to Wasm with worker pool, file IO bridges [S26] | not needed for v1; candidate for mesh import (gmsh/VTK) later |
| Babylon.js | Apache-2.0 [S27] | full engine, WebGPU topic [S27] | no (duplicates three.js) |
| deck.gl | MIT; WebGL2/WebGPU, geospatial-oriented large-data layers [S28] | 2.5D maps | no |
| regl | MIT; "still under active development"; WebGL1-style examples [S29] | low-level | no (EO already has its own 2D renderer) |

## 5. Workflow UX

### 5.1 Parameters node (family configurator)

- Global Definitions > Parameters: table with columns Name, Expression, Value (SI and display unit), Range, Status,
  Ref. Numeric fields with slider for bounded params (die x/y, interposer x/y, HBM count, bridge count, bump pitch,
  layer thicknesses, T_ref, power per die).
- Constraint rules declared in the family config (R5), evaluated on every edit, shown inline under the field and
  collected in Messages: severity `error` (blocks mesh: HBM count not placeable on the interposer edge, bridge count >
  die-edge pairs, negative gaps), `warn` (outside the reported range of the database, reticle-multiple exceeded,
  value beyond the material library's validity range), `info` (derived parameter changed). The specific limits come
  from R5; none are invented here.
- Derived parameters read-only, formula in tooltip (atlas `dims` entries carry `formula`, `values`, `inputs`,
  `atlas: DevLog-008` contract changes).
- Edits splice into YAML (EO `yamlEdit.ts`), recorded as URL overrides; geometry preview (atlas box model,
  `build.ts`) updates live before meshing; stale markers on Mesh and Results.

### 5.2 Provenance display

- Every dimension and material value shows a 3-state badge: `R` reported (paper + locator on hover, DOI link),
  `D` derived (formula), `T` template (rationale; desaturated + dashed edges in the 3D view as in `/3d`,
  `atlas: build.ts`, `DevLog-008`). User edits add a 4th state `U` user override (shows the original value and status
  in the tooltip). Material values carry the same badges from the R4 library (source, temperature range).
- Model node shows completeness bars (reported/derived/template/user share), reusing `completeness` from
  `package3d.json`.
- Results titles and exports carry a provenance line (family id, share of template values, user overrides count) so
  a PNG or CSV never looks more authoritative than its inputs.

### 5.3 Regional EM model picker

1. Graphics toolbar "Pick channel" mode (EM study present). Channels come from the config (R3/R5: named nets or lane
   bundles, e.g. die-to-die lanes over a bridge, HBM PHY lanes); hover highlights the channel path; no free-form net
   extraction from geometry in v1.
2. Click spawns Component "EM region k": bounding box of the channel + lateral and vertical margins + PML thickness
   (defaults from R3), drawn as a box gizmo with draggable faces (snap to layer boundaries in z). Ports placed at
   channel ends (numbered 1..N, required for port sweep and Touchstone [S10]); PML domains shown hatched.
3. The cut-out inherits materials and layer stack from the package component by reference (provenance kept);
   frequency-dependent dielectric data from R4.
4. Settings: margins, PML thickness/layers, port type, reference impedance, frequency list, mesh per wavelength;
   inline estimate of DOFs and memory before Compute (from R2 scaling) with a warning above the browser budget.
5. View: package translucent (x-ray) with region box solid; results of the region rendered inside it; S-parameter
   plot groups created by default.

### 5.4 Progress and cancel

- Bottom panel Progress tab: phase list (geometry, mesh, assemble, solve, postprocess) with elapsed time; solver
  residual vs iteration (log y, LinePlot) live; sweep `k/n` with per-point time (EO `DevLog-027` U8).
- Stop = terminate the solver worker (EO pool cancel); partial sweep results kept and marked incomplete.
- Compute/Build mesh disabled while running (EO U9). Long tasks never on the main thread (gate 6.8).

### 5.5 Staleness

- Hash chain per component: geometry (params + template) -> mesh (+ mesh settings) -> physics -> study -> results.
  Each upstream change marks downstream nodes `stale` (tag in tree, banner on graphics). Stale data stay visible with
  the geometry snapshot of their run (EO `DevLog-027` U4 pattern), never silently replaced.
- EM region components hash their parent's geometry subset: a change outside the region box does not stale the EM
  result (only params referenced by the region).

### 5.6 Compare runs

- Run registry under Results > Datasets: each Compute stores (config text hash, overrides, timestamp ISO, solver
  stats). Keep N in memory (default 4, target), older runs keep globals and tables only.
- Compare view reuses the `/3d` scissor-viewport compare with shared camera (`atlas: viewer.ts`): 2-4 panes, locked
  color range across panes (one legend), per-pane title with run label.
- Difference dataset A - B when meshes are identical (same mesh hash); otherwise interpolate B onto A in the worker
  (tranche 3).
- 1D overlay: global values of several runs (e.g. warpage vs T for HBM count 4/8/12) in one plot.

### 5.7 Warpage and coplanarity definitions (to confirm with R1/R6)

- Raw warpage on a named boundary selection (default `substrate_bottom`): w = max(uz) - min(uz).
- Best-fit-plane warpage: remove the least-squares plane, then max - min; sign convention by centre vs corner
  displacement (convex/concave). JEITA ED-7306 measures on the substrate surface, not on solder ball crowns [S30].
- Coplanarity: max distance of BGA ball apex points from the seating plane (JESD22-B108B-type definition per a
  secondary source [S31]; exact standard wording unverified).
- Display: Derived Values rows per T point; 1D plot warpage vs T with overlay of database rows. The atlas has 913
  `warpage` category rows in `data/metrics.csv`, 232 mentioning moire (grep counts, 2026-10-20); overlay points carry
  tv_id, condition and locator tooltips (EO paper-overlay pattern).

### 5.8 Export

| Export | Format | Notes |
|---|---|---|
| Table | CSV (EO `toCsv`) | header with units; provenance comment lines prefixed `#` |
| Plot data | CSV of plotted values | per feature (EO `DevLog-032` Export: Data) |
| Image | PNG at chosen size, legend and title options | off-screen render target; transparent option |
| S-parameters | Touchstone `.sNp`; v1 option-line `# GHz S MA R 50`, v2.1 keywords optional | spec ratified 2024-01-26 [S12]; MA default (COMSOL default too [S10]) |
| Field | VTU (XML UnstructuredGrid, base64 appended data, point + cell data, domain ids) | VTK XML spec [S13]; enables ParaView cross-check of our renderer (validation value) |
| Config | YAML (canonical text) + shareable URL | EO pattern |

## 6. UI spec draft

### 6.1 Layout

```
+-------------------------------------------------------------------------------------------------+
| toolbar: family [CoWoS-L v] | Build geometry | Build mesh | Compute | Stop | Add study v | undo redo | link | PNG |
+---------------------+------------------------+--------------------------------------------------+
| Model Builder tree  | Settings               | Graphics (three.js canvas + 2D overlay canvas)   |
| (240-320 px)        | (300-420 px)           |  bar: presets iso/front/top/bottom/right, ortho/persp,
|                     |  sections, fields with |  zoom extents, select level D/B/E/P, x-ray, clip,|
|                     |  unit + provenance     |  deform scale, z-exag, mesh edges, legend, probe |
|                     |                        |  overlay: legend(s), title, scale bar, axis triad,|
|                     |                        |  max/min markers, probe readout line              |
+---------------------+------------------------+--------------------------------------------------+
| bottom tabs: Messages | Progress | Log | Table: <name> | Convergence          (splitter, 160-320 px) |
+-------------------------------------------------------------------------------------------------+
```

- Pointer-drag splitters, sizes in localStorage (try/catch), graphics size independent of solve state (EO
  `DevLog-027`). <= 760 px: stacked column, graphics 340 px.
- Dark default, sharp corners (atlas `app.css`), custom tooltip, no Plotly on `/sim` (EO D7); three.js chunk only
  on `/sim` and `/3d`.
- Orthographic camera default for results (measurement views), perspective toggle; camera presets as `/3d`.

### 6.2 Model Builder tree (node set)

```
Model (provenance summary)
Global Definitions
  Parameters (family configurator)          Materials (library refs, provenance)
  Variables                                 Selections (named; auto from template)
Component 1: Package (3D)
  Definitions: Selections, Coordinate systems, Probes (domain/boundary/point probes)
  Geometry: Family template > Layer stack (layer rows) > Parts > Interconnect arrays (explicit | homogenised)
  Materials (per domain, from library; Layered Material per BEOL/RDL/build-up stack)
  Heat Transfer in Solids (ht): Solid [default], Thermal insulation [default], Initial values [default],
      Heat source (per die: total W or power map), Heat flux (convective, h and T_amb), Temperature,
      Thin layer / thermal contact (TIM, R''), Symmetry
  Solid Mechanics (solid): Linear elastic material [default] > Thermal expansion (alpha(T), T_ref),
      Free [default], Fixed constraint, Rigid motion suppression, Symmetry, Spring foundation (board), Initial values
  Multiphysics: Thermal Expansion (ht -> solid)
  Mesh: Size, Swept / layered (per layer elements in z), Free tetrahedral, Boundary layers, Statistics
Component k: EM region k (cut-out, 3D)
  Geometry: Region box (from channel), PML domains
  Materials (inherited, frequency-dependent)
  Electromagnetic Waves, Frequency Domain (emw): Wave equation [default], PEC [default], Impedance boundary
      (conductor roughness, R4), Lumped port n / Wave port n (numbered), Scattering boundary, PML
  Mesh: size per wavelength and per conductor skin depth (R3)
Study 1: Thermal               Step 1 Stationary (ht)
Study 2: Thermo-mechanical     Step 1 Stationary (ht), Step 2 Stationary (solid), Parametric Sweep (T or params)
Study 3: EM region k           Frequency Domain (list/range/log), Port sweep
Results
  Datasets: Solution (per study/step/sweep point), Cut Plane, Cut Line 3D, Cut Point 3D, Parametric, Run k
  Derived Values: Volume/Surface/Line Max, Min, Average, Integration; Point Evaluation; Global (warpage,
      coplanarity, Rth, S-parameter at f)
  Tables
  3D Plot Groups (defaults after solve): Temperature (Surface T + Max/Min), Temperature slices (Slice T),
      Displacement (Surface uz + Deformation), von Mises (Surface + Slice, + Deformation), Principal stress
      (Arrow Volume of principal directions, phase 3), Heat flux (Arrow Volume), EM |E| (Slice in region),
      Port modes (Surface on port faces)
  1D Plot Groups: Warpage vs T (+ database overlay), Tmax vs parameter, S-parameters dB, Phase, Smith,
      Convergence
  Export: Data, Table, Image, Touchstone, VTU
```

Tree tags: `default`, `template`, `stale`, `ovr` (overridden), `+` (contributing), `blocked` (reason in tooltip,
EO stage readiness pattern), `*` (study-step state differs).

### 6.3 Settings fields (selected nodes)

| Node | Sections and fields (units) |
|---|---|
| Parameters | table (Name, Expression, Value, Unit, Min, Max, Status R/D/T/U, Ref); constraint messages under rows |
| Layer stack row | material, z0 (um), thickness (um), model explicit/equivalent, mesh layers in z, provenance per value |
| Interconnect array | kind, pitch (um), diameter (um), height (um), count (est.), representation explicit / homogenised (R1 effective properties shown read-only with formula) |
| Material (domain) | k (W/(m K)), rho (kg/m^3), Cp (J/(kg K)), E (GPa), nu, alpha (ppm/K, function of T), eps_r, tan_delta, sigma (S/m); each with source badge and validity range |
| Heat source | selection, mode total power (W) / density (W/m^3) / map (CSV upload, per-viewer) |
| Heat flux (convective) | selection, h (W/(m^2 K)), T_amb (degC) |
| Thermal expansion | alpha source, T_ref (degC; stress-free temperature, process-dependent, R1) |
| Constraints | fixed / rigid motion suppression (3-2-1 points, auto from template corners), board spring (N/m^3) |
| Port | number, type lumped/wave, Z_ref (ohm), selection (picked faces), mode count |
| PML | thickness (um), layers, stretching type (R3) |
| Mesh | element order (P1/P2), max/min size (um), z layers per layer, curvature, quality report (min skewness, histogram) |
| Study step | physics checklist, solver (direct/iterative, R2), tolerance, max iterations, warm start from previous point |
| Parametric sweep | parameter (Parameters node or YAML path), values (list, range, linspace, logspace), keep fields yes/no |
| Plot feature | dataset, expression (ExprInput), unit (UnitInput), range auto/manual, scale linear/symmetric/log/symlog, color table, reverse, selection filter, deformation (on, scale auto/manual), resolution (refinement r), smoothing (none / inside material domains / everywhere) |
| Slice | plane normal x/y/z/custom, entry by number of planes or coordinates (um), interactive drag |
| Isosurface | levels (number or list), display surface/filled, transparency |
| Derived value | kind, selection, expression, unit, dataset (all sweep points -> one row each) |

### 6.4 Graphics interactions

- Left drag orbit, right/middle pan, wheel zoom at cursor (OrbitControls with damping, render on demand, as `/3d`).
- Click: select at current level (ID buffer); hover pause (150 ms): probe readout (value + unit, domain, material,
  boundary, x/y/z in um) in a fixed status line.
- Clip plane gizmo: drag along normal; numeric field in settings; cap = slice of current expression.
- Keyboard: `F` zoom extents, `1-5` presets, `X` x-ray toggle, `D` deformation toggle, `Esc` clear selection.

### 6.5 URL state

`/sim?fam=<family>&set=<yaml.path>=<value>&...&study=<id>&pg=<plotgroup>&view=<preset|cam:x,y,z,tx,ty,tz>&clip=<axis>:<pos_um>&dscale=<s>&kz=<k>&em=<channel_id>&sweep=<path>&values=<spec>&pool=<n>`

- Same grammar as EO `urlState.ts` for `set`, `sweep`, `values`, `pool`. Query params (not hash) since `/sim` is a
  workbench page; `/3d` keeps `#f=`. Free YAML-tab edits not encoded (tooltip says so, EO U16).
- Cross-link: `/3d#f=cowos_l` "Simulate" button -> `/sim?fam=cowos_l`.

### 6.6 Worker protocol (3D additions to EO `post/contract.ts`)

```
in : {type:'mesh', text, overrides}                          -> {type:'mesh', stats, surface: SurfaceBuffers} | error
in : {type:'run', text, overrides, study}                     -> progress* (phase, iter, residual) -> result | error
in : {type:'post', id, op:'surface', dataset, expr, unit, smoothing, r}   -> Float32Array values (per surface vertex)
in : {type:'post', id, op:'slice', dataset, expr, plane:{n,d}}            -> {pos, val, domain} typed arrays
in : {type:'post', id, op:'iso',   dataset, expr, levels}                 -> {pos, nrm, val} typed arrays
in : {type:'post', id, op:'deform', dataset}                              -> Float32Array u (per surface vertex x3)
in : {type:'post', id, op:'derived', kind, selection, expr, unit}         -> {value, unit, at?}
in : {type:'post', id, op:'probe', tri, bary}                              -> {value, domain, material, boundary}
in : {type:'post', id, op:'export', format:'vtu'|'snp'|'csv'}             -> Blob parts
in : {type:'cancel', ids}
```
SurfaceBuffers = node positions, triangle index, per-triangle (domain, boundary id), per-vertex domain-duplicate map.
All typed arrays transferred; replies with an old sequence number per feature are dropped (EO `DevLog-032`).

### 6.7 Performance budgets **(target)**

Reference machine: this Mac (12 cores, 24 GB RAM per `atlas: DevLog-008`), Chrome stable, hardware GPU.

| Metric | Target |
|---|---|
| `/sim` shell interactive (cached, no model) | <= 1.0 s |
| Family geometry preview after a parameter edit | <= 100 ms |
| First field paint after solve, 1M tets | <= 500 ms (surface extraction cached from mesh step) |
| Expression switch on same dataset, 1M tets | <= 100 ms |
| Orbit frame time, 1M surface triangles + 1 slice | <= 16.7 ms (60 fps) |
| Orbit frame time, 5M tets (2-5M surface triangles) | <= 33 ms |
| Slice drag update, 1M tets | <= 50 ms per update (coalesced) |
| Isosurface, 1M tets, 1 level | <= 200 ms CPU worker; <= 30 ms WebGPU path (tranche 3) |
| Pick + probe | <= 10 ms |
| Main-thread long tasks during interaction | none > 50 ms (EO P6) |
| Tab memory at 5M tets | <= 2 GB (solver memory budgeted by R2) |
| Draw calls, default results view | <= 30 |

### 6.8 Verification gates

Automated (vitest + Playwright headless, per EO `DevLog-027` gates; screenshots in the session scratchpad only):

1. Kernels: boundary extraction on an n^3 cube split into 6 tets per hex gives exactly 12 n^2 exterior triangles;
   slice of a linear field equals the analytic plane values to round-off; isosurface of r^2 on a ball mesh converges
   in area with refinement; deformation at scale 1 equals x + u exactly.
2. Derived identities: volume integral of 1 = sum of domain volumes; Surface Max equals max over surface vertices;
   warpage of an analytic spherical-cap uz equals its sag; best-fit-plane removal zeroes a pure tilt.
3. Exports: Touchstone written then parsed back equals the source matrix; VTU parsed back (test reader) equals
   point/cell arrays; CSV headers carry units.
4. Screenshot set (1440 x 900 and 390 px; dark and light): geometry view, mesh quality, Temperature surface,
   slice with cap, deformation with scale label, von Mises, warpage vs T with overlay, S-parameters dB, Smith,
   compare 2 panes. Checks per shot: legend present with unit, no `NaN`/`undefined` text in DOM, title carries
   deformation scale when deformed, cap visible on clip, no overlap of legend and axes, computed `border-radius`
   0 on all elements (EO U17 scan).
5. Perf: `renderer.info` (calls, triangles) and `performance.mark` timings logged to a timestamped log file for a
   synthetic 1M and 5M tet mesh; gate on Section 6.7 targets; long-task observer.
6. Robustness: WebGL context loss/restore (WEBGL_lose_context), worker crash -> Messages error, cancel mid-solve.
7. Fresh-context UX audit against Sections 3 and 6 after tranche 1 (project rule).

## 7. Tranche mapping (UI side; effort for the proposal)

| Tranche | UI/visualization scope | Effort **(estimate)** |
|---|---|---|
| U1 | Port EO shell (tree, settings, splitters, tooltip, YAML splice, URL, log, pool, LinePlot, colormaps); Parameters node with provenance; geometry preview from atlas box model | 4-6 agent-days |
| U2 | Mesh view (quality colors), boundary extraction, field material (LUT, scale, deformation, z-exag, clip), slice + cap, probe/picking, Surface/Slice/Max-Min/Deformation features, derived values incl. warpage, warpage-vs-T plot with DB overlay | 6-9 agent-days |
| U3 | EM: channel picker, region gizmo, port faces, S-parameter dB/phase plots, Smith chart, Touchstone export | 4-6 agent-days |
| U4 | Isosurface, arrows, compare runs + difference, VTU export, P2 refinement on surfaces | 4-6 agent-days |
| U5 | WebGPU spike (TSL field material, compute marching tets sharing solver buffers), streamlines | 3-5 agent-days |

## 8. Open questions for Wentao

1. Licence for the atlas repo / `/sim` code: GPL-3.0-or-later (matches EO engine, allows copying expr/units/YAML
   splice as-is) or a permissive licence (then those three get re-derived)?
2. Shared package now or later? Recommendation: later (Section 2.3).
3. Default deformation scale: COMSOL auto 10% of geometry [S16] or always true scale with z-exaggeration only?

## 9. Sources (retrieved 2026-10-20)

- [S1] three.js manual, WebGPURenderer: https://threejs.org/manual/pages/webgpurenderer.html
- [S2] web.dev, "WebGPU is now supported in major browsers" (2025-11-25): https://web.dev/blog/webgpu-supported-major-browsers
- [S3] W. Usher, "GPU Compute in the Browser at the Speed of Native: WebGPU Marching Cubes" (2024-04-23), listing:
  https://daily.dev/posts/gpu-compute-in-the-browser-at-the-speed-of-native-webgpu-marching-cubes-hbnxnfvtg ;
  code: https://github.com/Twinklebear/webgpu-experiments ; earlier paper: https://ar5iv.arxiv.org/html/2009.03254
  (original post on willusher.io not fetched; benchmark numbers unverified)
- [S4] three.js forum, stencil capping issues: https://discourse.threejs.org/t/how-to-render-caps-like-webgl-clipping-stencil/36727 ;
  https://discourse.threejs.org/t/webgl-clipping-stencil-plane/73867
- [S5] COMSOL 6.4 Extrude: https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_geometry.23.082.html ;
  6.3 Extrude: https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_geometry.23.079.html ;
  geometry nomenclature: https://www.comsol.com/support/learning-center/article/geometry-concepts-and-nomenclature-in-comsol-multiphysics-36081
- [S6] COMSOL 6.3 Layered Material: https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_materials.25.16.html ;
  Layered Material Stack (5.5): https://doc.comsol.com/5.5/doc/com.comsol.help.comsol/comsol_ref_materials.16.14.html
- [S7] COMSOL 6.3 Physics Node Status: https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_modeling.19.017.html ;
  exclusive/contributing (5.5): https://doc.comsol.com/5.5/doc/com.comsol.help.comsol/comsol_ref_modeling.10.15.html ;
  study-step selection (6.3): https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_solver.36.013.html
- [S8] COMSOL 6.4 Modeling Thermal Expansion: https://doc.comsol.com/6.4/doc/com.comsol.help.sme/sme_introduction.02.32.html ;
  Thermal Stress, Solid (6.3): https://doc.comsol.com/6.3/doc/com.comsol.help.sme/sme_ug_multiphysics.18.02.html
- [S9] JEDEC JESD22-B112C (2023-11) listing: https://www.jedec.org/taxonomy/term/1958 (standard text not read)
- [S10] COMSOL 6.3 Touchstone export: https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_results.37.219.html ;
  RF Module introduction: https://doc.comsol.com/6.3/doc/com.comsol.help.rf/IntroductionToRFModule.pdf ;
  RF 5.5 release notes: https://www.comsol.com/release/5.5/rf-module
- [S11] COMSOL 6.3 Plot Types: https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_results.37.103.html
- [S12] Touchstone File Format Specification 2.1 (IBIS, ratified 2024-01-26): https://www.ibis.org/touchstone_ver2.1/touchstone_ver2_1.pdf
- [S13] VTK XML file formats: https://docs.vtk.org/en/latest/vtk_file_formats/vtkxml_file_format.html ;
  binary details: https://andreask.cs.illinois.edu/what-they-dont-tell-you-about-vtk-xml-binary-formats
- [S14] COMSOL 6.4 Isosurface: https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_results.37.143.html
- [S15] COMSOL 6.4 Volume/Surface/Line Maximum and Minimum: https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_results.37.094.html ;
  Max/Min plots: https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_results.37.152.html
- [S16] COMSOL Deformation (6.4 page; content via search summary, direct fetch timed out):
  https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_results.37.205.html
- [S17] COMSOL 6.3 Mesh (Plot): https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_results.37.144.html ;
  Mesh Element Quality: https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_mesh.24.24.html
- [S18] COMSOL 6.4 Cut Plane: https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_results.37.050.html
- [S19] COMSOL 6.4 3D Cross-Section Line Plots: https://doc.comsol.com/6.4/doc/com.comsol.help.comsol/comsol_ref_results.37.116.html
- [S20] COMSOL 6.0 Cut Point 3D: https://doc.comsol.com/6.0/doc/com.comsol.help.comsol/comsol_ref_results.33.037.html
- [S21] Chrome for Developers, WebGPU at I/O 2023: https://developer.chrome.com/blog/webgpu-io2023
- [S22] three.js manual, Picking: https://threejs.org/manual/pages/picking.html
- [S23] three.js forum, GPU picking example regression: https://discourse.threejs.org/t/gpu-interactive-cubes-broken/52044
- [S24] vtk.js repository: https://github.com/Kitware/vtk-js
- [S25] pyvista-js UnstructuredGrid (surface decomposition for vtk.js): https://pyvista-js.readthedocs.io/en/latest/api/_autosummary/pyvista_js.UnstructuredGrid.html
- [S26] ITK-Wasm repository: https://github.com/InsightSoftwareConsortium/ITK-Wasm
- [S27] Babylon.js repository: https://github.com/BabylonJS/Babylon.js
- [S28] deck.gl repository: https://github.com/visgl/deck.gl
- [S29] regl repository: https://github.com/regl-project/regl
- [S30] JEITA ED-7306: https://home.jeita.or.jp/tsc/std-pdf/ED-7306_E.pdf (via search snippet)
- [S31] IMAPS article on coplanarity (JESD22-B108B description): https://imapsource.org/article/147117.pdf (via search snippet)
- COMSOL-hosted warpage paper (STMicroelectronics, FEA vs shadow moire): https://www.comsol.com/paper/warpage-assessment-in-ic-packaging-134192
