# Process materials (DevLog-016, lane L36)

Procedural, image-free, physically based materials for the process-flow animation. No texture files: every pattern is
GLSL noise in object-attached um coordinates, so feature sizes stay physical at any zoom and in illustrative vs actual
scale modes. three.js 0.186, `MeshPhysicalMaterial` + `onBeforeCompile`.

## Files

| file | content |
|---|---|
| `index.ts` | `createMaterial`, `MATERIAL_KEYS`, `ALIASES`, `createProcEnvironment` |
| `types.ts` | `MatState`, `ProcMaterial`, `FrontAxis`, `FrontDir`, `CreateOpts`, `MatKeyMeta`, `DEFAULT_STATE` |
| `recipes.ts` | per-key recipe: static look + state -> uniform mapping (S/T ids refer to the table below) |
| `optics.ts` | measured optical constants reduced to F0 / ior / absorption; Planck colour; Draper point |
| `shader.ts` | the shared procedural layer shader (one program family) |
| `lab/index.htm`, `lab/lab.ts` | dev-only lab page (see "Lab") |
| `lab/shoot.py` | headless screenshots of the lab (Playwright) |
| `lab/f0_from_nk.py` | reproduces every F0 / n / alpha in `optics.ts` from the refractiveindex.info tables |

## Interface

```ts
createMaterial(key: string, opts?: { instanced?: boolean; frontDir?: FrontDir;
  grindWheel?: { radius_um: number; offset_um?: number } }): ProcMaterial
type ProcMaterial = {
  key: string; material: THREE.Material;
  set(state: Partial<MatState>): void;           // uniforms / scalars only, never recompiles
  setScale(umPerUnit: number): void;             // um per world unit
  setClipping(planes: THREE.Plane[] | null): void;
  setFront(axis: 'x' | 'y' | 'z' | 'radial' | THREE.Vector3, box: THREE.Box3): void;  // added for L35, 2026-10-23
  setGrindWheel(radiusUm: number, offsetUm?: number): void;  // added for L37, 2026-10-23; uniform-only
  setGrindCentre(world: THREE.Vector3 | null): void;          // audit V1 M8: wafer / chuck centre, world coords
  dispose(): void;
}
type MatState = { finish; melt; cure; exposed; wet; temp_c; front }   // all 0..1 except temp_c (C)
createProcEnvironment(renderer): THREE.Texture   // dark studio environment -> PMREM, for scene.environment
createRoomEnvironment(renderer): THREE.Texture   // the previous bright RoomEnvironment (comparison only)
RENDER_SETTINGS                                  // recommended renderer / light settings (below)
```

- Unknown key: neutral grey material and a console warning, never a throw.
- `opts.instanced` is accepted for the contract; nothing else is needed (three's `USE_INSTANCING` covers it). Texture
  coordinates of instances include the instance matrix, so every instance gets its own noise.
- One ProcMaterial per mesh (the engine already does this). The bounding box used by dishing and by the default local
  flow front is read from the drawn geometry in `material.onBeforeRender`; three uploads material uniforms when the
  material changes between draws, so sharing one ProcMaterial across meshes with different geometry bounds would mix
  their bowls / local fronts (the world-space front of `setFront` has no such restriction).
- `setClipping`: requires `renderer.localClippingEnabled = true`. A change of plane count recompiles (three program
  parameter); same count does not. Section caps are the engine's (solid noise is continuous, so a cap mesh built in the
  same object frame textures seamlessly; see the lab).
- Metals reflect the environment; without `scene.environment` they render near black.
- Grind marks in the wafer frame (audit V1 M8): after `setGrindCentre(c)` the marks are evaluated at world xz minus
  c.xz (times umPerUnit), so a die that sat at (x, y) on the ground wafer carries the arc segment of that position.
  The engine passes, per piece, the world position the wafer centre would have relative to the piece. The scratch
  direction is applied in the mesh's x / z axes, so it is exact for pieces not rotated about y (flips about x keep
  the arc family, mirrored). `null` returns to each mesh's own centre.

### Recommended renderer settings (for L35, audit V1 C2)

Cause of C2: the old environment (three `RoomEnvironment`, a uniformly bright white room) is reflected by every metal
and by Si at F0 0.35-0.92, so with no tone mapping polished Si sampled RGB 150-210 and smooth Cu / solder clipped to
white. Fix on the material side (2026-10-23): `createProcEnvironment` is now a dark studio (floor 0.03, horizon 0.16,
ceiling 0.10 linear radiance; soft boxes: top 2.0, left strip 1.0, front-right 0.6, back panel 0.6; template T35).
Mirror metals then show F0 times a dark grey plus soft-box streaks; rough metals show F0 times the mean radiance.
No material F0 was changed (they are the measured values); solder after reflow and plated Cu were changed (M9, M10).

| setting | engine as of 2026-10-23 | recommended | note |
|---|---|---|---|
| `scene.environment` | `createProcEnvironment` | `createProcEnvironment` (new studio) | already wired through `mat.ts` |
| `scene.environmentIntensity` | 1 | 1.0 | the studio is calibrated for 1 |
| `renderer.toneMapping` | NoToneMapping | `THREE.NeutralToneMapping` | hue-preserving highlight roll-off (no pink-white clipping of Cu) |
| `renderer.toneMappingExposure` | 1 | 1.0 | |
| HemisphereLight (sky #ffffff, ground #3a3a3a) | 1.4 | 0.6 | diffuse only (metals ignore it); 1.4 washes out dielectrics |
| DirectionalLight | 1.6 at (0.5, 1, 0.8) | 1.2 | metal highlight and dielectric key |

`RENDER_SETTINGS` exports the recommended column. Checked in the real Process mode with the engine's current
settings (only the new environment), and in the lab with `#rig=engine` (engine column), `#rig=rec` (recommended)
and `#rig=room` (engine with the old environment).
- Axes as the 3D tab: y up. Grinding marks and dishing act on faces whose normal is along y.
- Grind marks (`si`, finish < 1): each mark is a circle of the wheel radius Rw whose centre lies at distance D (wheel-
  centre offset) from the wafer centre, rotated about the wafer centre (wheel speed >> chuck speed). For a point P the
  mark through it has centre C with |C| = D, |P - C| = Rw; the scratch direction is the tangent there. Default
  Rw = D = 150 mm (300 mm wheel with the rim over the wafer centre, F129 / F123); `setGrindWheel(Rw, D)` or
  `opts.grindWheel` overrides (D omitted = Rw). With D != Rw the rim misses a central disc of radius |D - Rw|, which
  then takes the nearest reachable mark direction.

### Texture frame and scale

`vPmTex = modelScale * (instanceMatrix * position)`, non-instanced relative to the geometry bbox centre; times
`umPerUnit` = um. Rotation of the mesh is not applied, so textures stay attached to a moving / rotating part (wafer
under a CMP head). Isotropic patterns are solid 3D noise: boxes, cylinders, spheres and section faces need no UVs and
show no seams. Each feature fades by its pixel footprint (`fwidth` in um); the unresolved part goes to roughness or to
the area-weighted mean colour (sub-pixel filler = mixed colour), so there is no aliasing from wafer to unit-cell scale.
In illustrative mode a stretched z axis stretches textures along z as well (texture frame includes model scale).
Footprint rule (audit V1 M10): every procedural feature fades in between 3 and 6 px on screen (`pmVis`), so nothing
below ~3 px is drawn; plated Cu grain contrast is low (colour +-3.5 %, relief 0.05 um) and reads as satin copper.

### Flow front

`front` in 0..1. Default: local mode per key (`frontDir` from the recipe or `opts.frontDir`: +-x, +-y, +-z, radial xz),
normalised by the mesh's own geometry bbox. After `setFront(axis, box)` the front is one continuous world-space front:
s = (p . axis - lo) / (hi - lo) over the projection of `box` on the axis (radial: distance from the box centre in xz,
normalised by the half extents, / sqrt 2), so all instanced fill tiles share it. Material exists where s < front
(+ small noise wobble); a band just behind the front is glossy (wet meniscus, `uFront2`).

## Keys

`cls` maps to `CLASS_COLOR` of the 3D tab (`app/src/lib/three/materials.ts`). Every key also accepts `temp_c`.

| key | name | cls | states used | transparent |
|---|---|---|---|---|
| si | Silicon (ground / polished) | silicon | finish (0 coarse ground, 0.5 fine ground, 1 polished), wet | no |
| si_etched | Silicon (dry-etched / revealed) | silicon | wet | no |
| oxide | SiO2 | oxide | finish, wet | yes |
| nitride | SiN | oxide | wet | yes |
| cu_seed | Cu seed (sputtered) | copper | wet | no |
| cu | Cu (plated / CMP) | copper | finish (0 plated grains, 1 CMP mirror + micro-scratches + dishing), wet | no |
| al | Al (pad / RDL) | copper | finish, wet | no |
| ti | Ti barrier | copper | wet | no |
| ta | Ta / TaN barrier | copper | wet | no |
| ni | Ni (electroless Ni-P) | copper | wet | no |
| au | Au (ENIG) | copper | wet | no |
| osp | OSP on Cu | copper | wet | no |
| solder | Solder SnAg | solder | finish (0 as plated, 1 reflowed), melt (1 liquid), wet | no |
| solder_paste | Solder paste SAC Type 4 | solder | finish (1 reflowed), melt | no |
| imc | IMC Cu6Sn5 / Ni3Sn4 | solder | - | no |
| resist | Positive i-line DNQ resist | polymer | exposed, wet | yes |
| dry_film | Dry film resist | polymer | exposed, wet | yes |
| polyimide | Polyimide | polymer | cure, wet | yes |
| emc | EMC | mold | finish (0 as molded, 1 ground), cure, front (default radial) | no |
| underfill | Capillary underfill | underfill | cure, front (default +x), wet | no |
| abf | ABF build-up film | organic | cure, wet | no |
| core | Core laminate (glass weave) | organic | - | no |
| solder_resist | Solder resist | organic | cure, wet | no |
| glass | Glass carrier | glass | wet | yes (alpha, double-sided, src + dst (1 - a) blending; audit V2 m2) |
| tba | Temporary bonding adhesive | polymer | cure, melt | yes |
| release | Release layer (LTHC) | polymer | exposed (laser scanned) | no |
| daf | Die attach film | polymer | cure | yes |
| adhesive | Adhesive (lid / stiffener) | polymer | cure, front (default +x) | no |
| flux | Flux | other | wet (1 liquid, 0 residue) | yes |
| slurry | CMP slurry film | other | front (default radial) | yes |
| electrolyte | Acid Cu sulfate | other | front | yes |
| steel | SUS430 | lid | finish (0 rolled 2B, 1 bright) | no |
| cu_stiffener | Cu stiffener (bare) | lid | finish | no |
| ceramic | Ceramic AlN (TCB tool face) | other | finish (0 as fired / ground, 1 lapped), wet | no |
| ceramic_sic | Ceramic SiC (sintered) | other | finish, wet | no |
| silicone | Silicone adhesive (stiffener glue) | polymer | cure, front (default +x) | no |
| pet | PET film (laminator support) | polymer | wet | yes |
| water | Water (DI coolant, SAM coupling) | other | front (default +x) | yes |

Aliases (`ALIASES`): prepreg -> core (L35 request), paste / sac -> solder_paste, snag -> solder, sus430 -> steel,
tan -> ta, lthc -> release, pi -> polyimide, cuf -> underfill, mold -> emc, seed -> cu_seed, aln -> ceramic,
sic -> ceramic_sic, pdms -> silicone, di_water / coolant -> water (follow-up for the tool lanes, 2026-10-23). `void` is not a
material (holes / cuts); if requested it falls back to neutral grey with a warning.

### State semantics

- `finish`: 0 as deposited / plated / ground .. 1 polished. si: 0 coarse grind (#325 class), 0.5 fine grind (#2000
  class), 1 polished mirror (the engine's planarize op drives finish to 1 at the stop plane, so a ground-only back
  reads polished; mapping a grind end to 0.5 is the engine's call). solder / solder_paste: 0 before reflow, 1 after
  reflow: a liquid-formed surface, smooth and satin (roughness 0.24, no relief; audit V1 M9).
- `melt`: 0 solid / paste .. 1 liquid (solder mirror, softened TBA).
- `cure`: 0 uncured liquid (glossy, clearcoat) .. 1 cured.
- `exposed`: dose fraction. resist bleaches (amber -> pale); dry film darkens (print-out); release: laser scanned.
  Develop removes material (engine geometry), not a material state.
- `wet`: liquid film (rinse water, coolant, developer): clearcoat weight plus diffuse darkening of dielectrics.
- `temp_c`: no visible change below the Draper point (525 C), which packaging flows never reach (reflow peaks ~250 C,
  TCB / cure lower). Above it: blackbody emission colour from Planck's law at the three render wavelengths; the
  intensity ramp is a template (T30). Thermal tint by oxidation is chemistry, not temperature, and is not modelled.
- `front`: see "Flow front".

## Shader programs

One shader source for every key (`customProgramCacheKey` = `apa-procmat-v1`); all key differences are uniforms. three
adds its own program parameters, so the live program count is at most 2 (opaque `OPAQUE` vs transparent) x 2
(instanced or not) x (number of distinct clipping-plane counts). Measured in the lab (renderer.info.programs): all 38
keys in one view = 2 programs; with a section cut (clipped bodies + unclipped caps) = 4; instanced + cut = 3 for one
key. `USE_CLEARCOAT` and `USE_ANISOTROPY` are on in every program (constant `clearcoat = 1`, `anisotropy = 1`); the
shader sets the per-fragment weights, so no state change toggles a define.

## Lab (dev only)

`pnpm dev` (any port), then open `/src/lib/process/materials/lab/index.htm` (e.g.
http://127.0.0.1:47362/src/lib/process/materials/lab/index.htm). The Vite dev server serves `.htm` files under the app
root as static files (its static middleware skips only `.html`) and transforms the `lab.ts` module. It is not a
SvelteKit route and nothing imports it, so it is not in the nav, not prerendered, and `pnpm build` emits nothing of it
(checked 2026-10-23: no `procmat` / lab strings or files in `app/build`). A SvelteKit route was not used: with
`adapter-static` `strict` and the default `handleUnseenRoutes`, a non-prerendered or unlinked route fails the build,
and excluding it would need a config change outside this lane.

Controls: single key or all keys, state sliders, um per unit (log), grinding-wheel radius and offset in mm (hash
`wheel_mm`, `offset_mm`), specimen shape (block with pad and dome, 300 mm-class
wafer disk, ball), section cut with caps, instanced pillars, world-space front along x (`setFront`), plain reference
(`#plain=1`: the same base scalars in a stock MeshPhysicalMaterial). URL hash keeps the state, e.g.
`#key=cu&finish=1&um=5`. Screenshots: `uv run --with playwright python app/src/lib/process/materials/lab/shoot.py`
(server must run) -> `cache/process3d_renders/materials/<ts>/`.

## Parameter sources

S = sourced (public, fetched 2026-10-23), D = derived from sourced values, T = template (rationale given). F0 values are
computed by `lab/f0_from_nk.py` (normal incidence, R 630 / G 532 / B 465 nm, linear).

| id | key(s) | parameter | value | status | source / rationale |
|---|---|---|---|---|---|
| S1 | cu, cu_seed, cu_stiffener, osp | F0 (R, G, B) | 0.915, 0.602, 0.550 | S | Johnson and Christy, Phys. Rev. B 6, 4370 (1972), via refractiveindex.info |
| S2 | au | F0 | 0.942, 0.704, 0.404 | S | Johnson and Christy 1972 |
| S3 | ni | F0 | 0.690, 0.634, 0.583 | S | Johnson and Christy, Phys. Rev. B 9, 5056 (1974) |
| S3 | ti | F0 | 0.612, 0.575, 0.549 | S | Johnson and Christy 1974 |
| S4 | al | F0 | 0.908, 0.916, 0.921 | S | Rakic, Appl. Opt. 34, 4755 (1995) |
| S5 | ta | F0 | 0.883, 0.830, 0.775 | S | Werner et al., J. Phys. Chem. Ref. Data 38, 1013 (2009); TaN not tabulated (Ta used) |
| S6 | solder, solder_paste | Sn F0 | 0.828 (all channels) | S (out of range) | Golovashkin and Motulevich, Sov. Phys. JETP 19, 310 (1964), 293 K; table starts at 730 nm, value at 730 nm used for R, G, B |
| S7 | si, si_etched | F0 | 0.348, 0.374, 0.409 | S | Green, Sol. Energ. Mat. Sol. Cells 92, 1305 (2008); Aspnes and Studna 1983 gives 0.349, 0.374, 0.408 |
| S8 | oxide | ior | 1.461 | S | Malitson, J. Opt. Soc. Am. 55, 1205 (1965), 532 nm |
| S8 | nitride | ior | 2.056 | S | Luke et al., Opt. Lett. 40, 4823 (2015), LPCVD Si3N4, 532 nm |
| S8 | glass | ior | 1.474 | S | SCHOTT BOROFLOAT 33 optical properties (2021), Sellmeier fit in refractiveindex.info |
| S9 | polyimide | ior | 1.759 | S | Kumar et al., Adv. Appl. Sci. Res. 2, 79 (2011), Kapton-H, 532 nm |
| S9 | polyimide | absorption alpha (1/um) | 0.00731, 0.0319, 0.075 | D | alpha = 4 pi k / lambda from Kumar 2011 k; blue at 490 nm (table start), so blue absorption is understated |
| S28 | steel | F0 | 0.603, 0.585, 0.573 | S | Karlsson and Ribbing, J. Appl. Phys. 53, 6340 (1982), ferritic stainless steel (SUS430 is ferritic) |
| S10 | si | grinding-wheel radius, centre offset | 150 mm, 150 mm (default) | S | RESEARCH_TOOLS_FAB F129: DISCO DGP8761 catalog, "300 mm diamond wheel" (300 mm grinder); F123: rim sweeps across the wafer centre (offset = radius). 200 mm grinders (DAG811 / DFG8540) use a 200 mm wheel: `setGrindWheel(100000)` |
| S11 | si | grit classes | coarse #300-600, fine #2000 | S | US 7892072 / US 8994196 (directional backside grinding patents) |
| S11b | si | mark geometry | arcs through the wafer centre, curved outward | S | US 8994196 (conventional rotational grinding leaves curved marks from the centre) |
| S12 | cu | plated grain size | 2 um (self-annealed); seed 0.08 um | S | Harper et al., MRS Proc. 564, 387 (1999) / JAP 86, 2516: as-deposited 0.05-0.1 um, grows to several um within hours |
| S13 | cu | CMP micro-scratch width / depth | 0.2 um / 0.07 um | S | US 6350694: scratches 1000-3000 A wide, 500-900 A deep (dielectric; used for Cu) |
| S14 | cu | dishing depth | 0.03 um | S | US 10446441 family: 10-50 nm for 4-10 um wide, 1 um deep features |
| S15 | emc | filler mean size range | 10-25 um (max 75 um) | S | Semitracks newsletter, 2024-10 |
| S15b | emc | bimodal filler blend | coarse + fine spheres | S | US 6214905: spherical fillers > 20 um and < 2 um blended |
| S16 | emc | top cut | 53 / 75 um | S | Caplinq, Hysol GR900C Q1L4E (53 um cut vs 75 um) |
| S17 | solder_paste | powder size | Type 4: 80 % 20-38 um; d = 29 um midpoint | S / D | J-STD-005A Table 3-2 as excerpted in SMTA "Effects of solder powder size on paste"; Indium Corp. blog |
| S18 | core | weave | style 2116: 60 x 58 ends / inch -> 423 / 438 um pitch; 0.097 mm | S / D | Isola Glass Fabric catalog 2022-04 |
| S19 | resist | DNQ bleaching | absorbs below ~490 nm unexposed; largely transparent below ~440 nm after exposure | S | MicroChemicals, "Exposure of photoresists" (AZ 9260 spectra) |
| S20 | dry_film | colour behaviour | blue / green resists; exposed darker (print-out) | S | iConnect007, "Karl's Tech Talk: Color in Photoresists and Soldermasks" |
| S21 | solder_resist | colour, thickness | green, 20 um | S | Taiyo PSR-800 AUS SR1 technical data |
| S22 | release | LTHC | carbon-black layer 1.5-2.5 um | S | US 10522526 (LTHC as charging barrier in InFO) |
| S23 | underfill | colour | black | S | Henkel LOCTITE ECCOBOND UF 9000AG product page (black, flip-chip / Cu pillar underfill) |
| S24 | au, ni | ENIG | Ni 3-6 um, Au >= 0.05 um | S | IPC-4552 as summarised in iConnect007 "The Plating Forum: The IPC Surface Finish Specifications" |
| S25 | all | Draper point | 525 C | S | Draper 1847 (standard value ~798 K) |
| S26 | all | wet darkening | diffuse darkening under a liquid film | S | Lekner and Dorf, Appl. Opt. 27, 1278 (1988) |
| S27 | all | emission colour | Planck's law at 630 / 532 / 465 nm | S | physics |
| S29 | ceramic | ior | 2.162 | S | Pastrnak and Roskovcova, Phys. Stat. Sol. 14, K5 (1966), AlN single crystal, ordinary ray, 532 nm |
| S30 | ceramic | colour | grey | S | Maruwa AlN substrates (AN-170 / AN-200 grey, AN-230 beige); Kyocera AlN170-230 grey |
| S31 | ceramic_sic | ior | 2.675 | S | Shaffer, Appl. Opt. 10, 1034 (1971), beta-SiC, 532 nm (blue channel outside the 467-691 nm fit) |
| S32 | silicone | ior | 1.435 | S | Schneider et al., Sens. Actuators A 151, 95 (2009), Sylgard 184 (unfilled PDMS) |
| S33 | silicone | colour | grey | S | DOWSIL EA-7300 / SE 9188 grey (distributor listings, Ellsworth / Mascherpa); Dow lid seal adhesive page (silicone) |
| S34 | pet | ior | 1.576 | S | Zhang et al., Appl. Opt. 59, 2337 (2020) |
| S35 | water | ior | 1.334 | S | Hale and Querry, Appl. Opt. 12, 555 (1973), 25 C |
| T1 | all | roughness values | per recipe (0.02-0.6) | T | chosen to read as the finish named (mirror / matte); no measured BRDF |
| T2 | oxide, nitride | tint, opacity | #c4d2dc / #cdc5ad, 0.5 / 0.6 | T | translucent films; PECVD SiN slight yellow; thin-film interference not modelled |
| T3 | imc | F0 | 0.42, 0.40, 0.37 | T | no optical constants found for Cu6Sn5 / Ni3Sn4; dull grey metallic |
| T4 | osp | film tint on Cu | x 0.82, 0.72, 0.60 | T | thin organic film darkens / browns Cu; no data |
| T5 | resist | colours, opacity | amber (0.85, 0.42, 0.10) -> pale (0.90, 0.78, 0.45); 0.78 -> 0.6 | T | from the S19 absorption band edge, magnitudes not measured |
| T6 | dry_film | colours | #3a8f86 -> #1d5560 | T | S20 hue family; values chosen |
| T7 | abf | colour, filler 0.5 um | #a9a46c | T | no public appearance spec found; silica-filled film, filler size not obtained |
| T8 | core | resin / yarn colours | #6a5530 / #b9ad88 | T | BT / epoxy resin amber-brown, glass yarn pale |
| T9 | tba, daf, adhesive, flux, slurry, electrolyte | colours, opacity | per recipe | T | product appearance not sourced (flux: rosin amber; electrolyte: Cu(II) blue; slurry: colloidal silica milky) |
| T10 | si | coarse scratch spacing | 40 um | T | #300-600 class grit (S11); um mapping of mesh not verified (JIS R6001-2 table not obtained) |
| T11 | si | fine scratch spacing | 6 um | T | #2000 class grit (S11); same caveat |
| T12 | emc | filler d50 | 15 um | T | inside S15 range |
| T13 | emc | filler volume fraction | 0.6 | T | EMC fillers are heavily loaded; vendor number not obtained |
| T14 | solder_paste | metal volume fraction | 0.52 | T / D | assumes 89 wt% metal (typical, not sourced) with densities 7.4 / 1.0 g/cm3 |
| T15 | core | filament diameter | 7 um | T | "E" filament of the ECE 225 yarn (S18) by the yarn-letter convention; not verified here |
| T16 | polyimide | reference thickness | 10 um (double pass) | T | RDL dielectric layers ~5-10 um |
| T17 | underfill | filler size | 1 um, cover 0.85-0.95 | T | fine CUF filler; resin skin on free surfaces |
| T18 | polyimide | cure absorption factor | 0.6 -> 1.0 | T | imidisation darkens the film (Kumar 2011 studies heat-treated Kapton; factor not from it) |
| T19 | solder_paste | fine powder layer ratio | 1.6 | T | Type 4 tail (<= 10 % below 20 um) |
| T20 | emc | fine filler ratio | 3.2 | T | S15b bimodal blend; ratio chosen |
| T21 | ni, au | nodule size | 3 um | T | Ni-P nodules; not sourced |
| T22 | solder | grain size plated / solidified | 3 / 12 um | T | matte plated Sn; solidification cells |
| T23 | al | grain size | 1 um | T | sputtered Al grain; not sourced |
| T24 | steel, cu_stiffener | rolling line spacing | 4 / 5 um | T | rolled sheet texture |
| T25 | si | macro band frequency | 180 / rad | T | visible swirl banding of rotation grinding |
| T26 | emc, underfill, adhesive | front band coat / wobble | 0.8-1.0 / 0.06 | T | wet meniscus look |
| T27 | glass | (superseded 2026-10-23 by T36) | | | alpha blending replaced by transmission |
| T36 | glass | edge colour / strength | (0.05, 0.075, 0.07) linear, 0.06 per 1 / |n.v| | T | faint green-grey edge tint over long paths; low-iron borosilicate is near colourless at 0.7 mm (no Fe absorption data obtained) |
| T37 | glass | work-scale reflection | specularIntensity 0.3, edge 0.015, Schlick alpha 0.3 | T | illustrative: keeps the release layer under a 300 mm carrier readable at grazing views |
| T28 | all transparent | alpha Fresnel | Schlick with exponent 5 | T | grazing faces read more opaque |
| T29 | emc | filler albedo on section | 0.20 linear | T | fused silica in black epoxy reads light grey on a ground section |
| T30 | all | emission intensity | ((T - 525) / 400)^2, max 1 | T | colour physical (S27), absolute radiance not calibrated |
| T31 | ceramic, ceramic_sic | grain size, roughness | 4 / 5 um; 0.5 -> 0.15 | T | sintered grain and lapped face; not sourced |
| T32 | ceramic_sic | colour | #3b3d3f dark grey | T | sintered SiC appearance not sourced |
| T33 | silicone | filled-adhesive ior | uses unfilled PDMS 1.435 | T | grey filled grades differ; filler not modelled |
| T34 | pet, water | opacity | 0.2 / 0.18 | T | clear films / liquid kept visible; colourless at mm path |
| T35 | all | studio environment radiances | surround 0.03-0.16, soft boxes 0.6-2.0 | T | chosen so Si / Cu / Sn keep their identity at F0 (audit V1 C2) |

Share: 37 sourced or derived rows (S1-S35, incl. S9 / S11b / S15b / S17 / S18 derived), 37 template rows (T1-T37).
Sourced: every metal F0, every dielectric ior, polyimide absorption, Cu grain size, CMP scratch and dishing scales,
EMC filler size range and cut, paste powder size, weave pitch, the colours of underfill, solder resist, LTHC and the
behaviour of resist / dry film. Template: roughness, most polymer and liquid colours, opacities, grit-to-um mapping,
volume fractions.

## Known weaknesses

- Thin-film interference (oxide / nitride on Si, OSP on Cu) is not modelled; films are tinted translucent.
- Transparency is alpha blending for films and liquids (no refraction, no path-length absorption); polyimide colour
  is fixed at a 10 um reference thickness. `glass` (audit V2 m2, budget fix 2026-10-23): near-black base, alpha 0.06,
  custom blending src + dst (1 - a) so the Fresnel reflection is added at full strength and what is behind stays
  visible, `DoubleSide` so the far faces show through, Schlick alpha, and a green-grey edge colour growing with the
  path 1 / |n.v| (T36). No refraction. three's physical transmission was tried first and dropped: its pre-pass
  re-renders every opaque object once per render call (main view and PiP) whenever any `glass` mesh is in view,
  which put shots at 151-205 draw calls. At work scale (>= 100 um per unit) the reflection is lowered
  (specularIntensity 0.3, T37) so layers under the carrier (laser-debond tracks on the release layer) read through.
  Glass costs 2 draws per mesh (back and front faces), one extra program variant (transparent, double-sided).
- Sn F0 is the 730 nm value for all channels (no visible-range table found); IMC has no measured constants.
- Polyimide blue absorption uses the 490 nm value, so cured PI reads paler amber than real 5-10 um films.
- Bump (normal perturbation) uses screen-space derivatives: slight sparkle at geometry edges where two faces meet in a
  pixel; tilt is clamped to ~60 deg.
- Grinding marks and dishing act on y-normal faces only; arcs are centred on each mesh's bbox centre (the wafer).
- Particle layers sit on cubic cells (one sphere per cell, no overlap): at some zooms the lattice is faintly visible.
- The colours of ABF, core resin, TBA, DAF, adhesive, flux, slurry and electrolyte are templates.
