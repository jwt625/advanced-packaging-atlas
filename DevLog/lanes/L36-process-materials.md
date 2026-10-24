---
title: Lane L36 - procedural process materials library and dev-only lab page
date: 2026-10-23
status: done (2026-10-23); hand-off below
scope: app/src/lib/process/materials/ (library, README.md, lab/), this file
owner: lane L36 (Claude subagent, DevLog-016 materials agent E2)
---

# L36: procedural process materials

Binding inputs: DevLog-016 (procedural materials section; request 2026-10-23), coordinator brief 2026-10-23
(interface `createMaterial(key, opts)` / `ProcMaterial` / `MatState`, adopted verbatim by engine lane L35).

Constraints: no git writes; no subagents; edit only `app/src/lib/process/materials/` and this file; own dev server in
tmux `apa-l36` on 127.0.0.1:47362, stopped at the end; screenshots to `cache/process3d_renders/materials/<ts>/`;
public web sources only, rate-limited; never `scripts/ieee_fetch.py`.

## Plan (2026-10-23, before implementation)

1. Optical constants: fetch n,k tables (refractiveindex.info database, public GitHub raw YAML) for Cu, Au, Ni, Sn,
   Ti, Ta, Fe/steel, Si, SiO2, Si3N4; compute normal-incidence F0 = ((n-1)^2+k^2)/((n+1)^2+k^2) at 3 wavelengths
   (R 630 nm, G 532 nm, B 465 nm) with a small uv script into scratch; values and sources into README.md.
2. Product appearance and feature sizes (EMC filler d50, plated Cu grain, grind-mark geometry, glass-fiber weave
   pitch, solder paste powder type): public datasheets / standards; anything without a source labelled template.
3. Library: one shared `MeshPhysicalMaterial` + `onBeforeCompile` program family; a per-key "recipe" (uniform
   values + one of a few pattern modes) so that keys with the same feature set share a program
   (`customProgramCacheKey` = mode + instanced flag). Object-space triplanar procedural noise scaled by
   `uUmPerUnit`; state uniforms only (finish, melt, cure, exposed, wet, temp_c, front + front axis); clipping via
   `material.clippingPlanes` (three's clipping chunks stay in the program; plane count change recompiles only).
4. Lab: dev-only Vite page (plain HTML `.htm` under `materials/lab/`, served raw by the Vite dev server, never an
   entry of `vite build` / SvelteKit routes, so nothing is emitted to `app/build`). Grid of all keys, per-key
   sliders, section-cut toggle, instanced variant.
5. Verify: `pnpm check`, `pnpm build` (grep build for lab), Playwright screenshots per material and state sweep; look
   and iterate.

## TODO

- [x] optical constants + F0 table (`lab/f0_from_nk.py` reproduces them)
- [x] appearance / feature-size sources (README "Parameter sources": 30 sourced / derived rows, 30 template rows)
- [x] library + README
- [x] lab page (dev-only Vite `.htm`, not a route)
- [x] check / build / screenshots / iterate
- [x] L35 additions: `setFront(axis, box)` (world-space front), keys `al`, `release`, alias `prepreg` -> core

## Progress log

- 2026-10-23: plan written.
- 2026-10-23: n,k tables fetched from the refractiveindex.info database (GitHub raw, 1.5 s apart): Cu, Au (J&C 1972),
  Ni, Ti, Fe, Cr (J&C 1974), Al (Rakic 1995), Ta (Werner 2009), Sn (Golovashkin 1964, starts at 730 nm), Si (Green 2008,
  Aspnes 1983), SiO2 (Malitson), Si3N4 (Luke), BOROFLOAT 33, Kapton-H (Kumar 2011), ferritic stainless (Karlsson 1982).
  Web sources for appearance / sizes listed in README (S10-S26). Not found: ABF colour, EMC filler volume fraction,
  IMC optical constants, JIS grit-to-um table (templates T7, T13, T3, T10/T11).
- 2026-10-23: library written: one `MeshPhysicalMaterial` program family (`apa-procmat-v1`), all keys as uniforms;
  layers grain / particles (two-layer cell-confined spheres) / scratches (grind arcs, CMP micro-scratches, rolling) /
  weave / flow front / dishing / wet / emission; footprint fade with unresolved part to roughness or mean colour.
- 2026-10-23: coordinator message (L35 request): `setFront(axis: Vector3 | 'x' | 'y' | 'z', box: Box3)` added (also
  accepts 'radial'), world-space front shared by instanced tiles; keys `al` (Rakic F0) and `release` (LTHC) present,
  `prepreg` alias of `core`; MatKey union of `app/src/lib/process/types.ts` fully covered (`void` = not a material,
  falls back to grey with a warning). Other aliases: paste / sac -> solder_paste, snag -> solder, sus430 -> steel,
  tan -> ta, lthc -> release, pi -> polyimide, cuf -> underfill, mold -> emc, seed -> cu_seed.
- 2026-10-23: lab: SvelteKit route rejected (adapter-static strict + default handleUnseenRoutes fail on an unlinked /
  non-prerendered route; excluding it needs a vite.config change outside this lane). Instead
  `app/src/lib/process/materials/lab/index.htm`, served raw by the Vite dev server (static middleware skips only
  `.html`), module `lab.ts` transformed on request; nothing imports it. `pnpm build` 2026-10-23: no lab files or
  `procmat` strings in `app/build`. `pnpm check`: 0 errors, 0 warnings.
- 2026-10-23: iterations from screenshots: (1) every material white: `new Vector4()` defaults w = 1, which switched
  the weave and grind layers on for all keys; fixed (all uniform vectors zero-initialised). (2) faceted / sparkling
  grains: height steps between cells removed (F1 domes, creases only), bump tilt clamped to ~60 deg, anisotropy faded
  where its direction degenerates. (3) overlapping polygonal filler: replaced Worley spheres by cell-confined spheres
  in two layers (coarse d50 + fine), exact circles on sections. (4) weave filaments were overwritten by the yarn colour
  (order fixed). (5) resin skin now hides particle relief on as-molded EMC / cured CUF. (6) lab env intensity 0.45.
- 2026-10-23: final screenshots `cache/process3d_renders/materials/20261023_165911/` (37 views incl. all-keys grid,
  all-keys section, plain reference grid, si wafer coarse / fine / polished, cu plated / CMP / instanced + cut, solder
  plated / liquid / solidified, paste / molten, EMC molded / ground / flow front, underfill local front / world front
  instanced / cured, core weave 1.2 mm and 120 um, resist unexposed / exposed, dry film, polyimide, glass, steel,
  solder resist, au, al, slurry, electrolyte, 900 C emission); report.json: 0 console errors, max 4 live programs.
  Intermediate runs removed. Dev server tmux `apa-l36` stopped.

- 2026-10-23 17:31: follow-up (coordinator, for the tool lanes): keys `ceramic` (AlN, grey, n 2.162), `ceramic_sic`
  (n 2.675, colour template), `silicone` (grey filled silicone, PDMS n 1.435), `pet` (n 1.576), `water` (n 1.334);
  aliases aln, sic, pdms, di_water, coolant. n values from refractiveindex.info (Pastrnak 1966, Shaffer 1971,
  Schneider 2009, Zhang 2020, Hale and Querry 1973) via `lab/f0_from_nk.py` (now also handles Sellmeier-2 and Cauchy
  formulas; earlier values unchanged). README rows S29-S35, T31-T34. `pnpm build` passes and has no lab files (the
  3D tab now bundles the library through L35's `src/lib/process/mat.ts`, as intended). `pnpm check`: 3 errors, all in
  `src/lib/process/Hud.svelte` (engine lane, PNa type), none in materials. Screenshots
  `cache/process3d_renders/materials/20261023_173120/` (grid with 38 keys, ceramic as fired / lapped, SiC, silicone
  cured / flow front, PET, water). tmux `apa-l36` stopped again.

- 2026-10-23 17:48: follow-up (L37 via coordinator): grind arcs were hard-wired to a 100 mm wheel radius. Now
  `uGrind = (Rw, D)`: general cup-wheel geometry (mark = circle of radius Rw, centre at distance D from the wafer
  centre); `ProcMaterial.setGrindWheel(radiusUm, offsetUm?)` (uniform-only) and `opts.grindWheel`; default 150 mm /
  150 mm per RESEARCH_TOOLS_FAB F129 (DGP8761 300 mm wheel) and F123 (rim over the centre). README S10 row, interface
  and lab updated (wheel R / offset inputs, hash `wheel_mm`, `offset_mm`). `pnpm check`: 0 errors. Screenshots
  `cache/process3d_renders/materials/20261023_174825/` (coarse and fine at 150 mm, fine at 100 mm for comparison,
  fine at 150 mm with a 120 mm offset (untouched central disc), fine at the 100 um block scale).

- 2026-10-23 19:58: audit V1 items (C2, M8, M9, M10). Own server tmux `apa-l36` :47362 (apa-app :47331 untouched).
  New `lab/process_shots.py` drives the real Process mode via `window.__apaProc` (CMP, ECP, grind, C4 reflow, CoW,
  on-substrate joint, EMIB TCB, BGA block / cell, LTS ball attach).
  - C2: cause = bright uniform RoomEnvironment reflected by metals / Si (F0 unchanged, physically right). New
    `createProcEnvironment` = dark studio (T35); old one kept as `createRoomEnvironment`. Recommended renderer
    settings for L35 in README (`RENDER_SETTINGS`: NeutralToneMapping, exposure 1, env 1, hemisphere 0.6,
    directional 1.2); lab rigs `#rig=engine|rec|room`.
  - M9: reflowed solder (finish 1) has no relief, roughness 0.24 satin; as-plated grains 3 um, 0.06 um relief.
  - M10: global footprint rule, features fade in between 3 and 6 px; plated Cu grain colour +-3.5 %, relief 0.05 um.
  - M8: `setGrindCentre(world | null)` (uniform `uGrindC`), marks in wafer frame; L35 passes the wafer centre.
  - Before: `cache/process3d_renders/materials/process_before_20261023_194928/`; after:
    `cache/process3d_renders/materials/process_after2_20261023_195656/`; lab grid (engine rig, new env)
    `cache/process3d_renders/materials/20261023_195249/`. `pnpm check` 0 errors.

- 2026-10-23 22:20: audit V2 m2 (glass carrier reads as an opaque dark slab like Si). Checked: data uses key `glass`
  for the carrier body (cowos_s_composite and ectc51687.2025.00027-F1; release / tba separate), so the key is right
  (L34 fine); the engine does not force opacity (only xray / occluder fades set transparent / opacity). Cause: glass
  was alpha 0.16 over a dark background with the dark studio environment (C2) reflecting little, so it read as dark
  grey. Fix: `glass` uses physical transmission (ior 1.474, roughness 0.02, attenuation tint T36 over 6 x slab
  thickness, thickness set per draw from the bbox) and `DoubleSide`; the slab now shows its far faces, internal
  reflections and the refracted TBA / release above. Before: `cache/process3d_renders/audit_V2/20261023_211920/r2/tgt/
  T_p11_debond_t050_block.png`; after (superseded by the 23:40 entry, transmission dropped): `cache/process3d_renders/materials/process_glass5_20261023_233812/`
  (debond step 11 and carrier-bond step 8, block). Note: the brown background tint in those shots is in the scene
  with transmission off too (A/B checked), not from the glass.

- 2026-10-23 23:40: draw-call budget (L35: 19 shots at 151-205 > 150). New `lab/calls_check.py` (stats().calls and
  debugScene() transmissive counts per scene at the same (k, t), default scale, PiP). Findings: every over-budget
  shot except EMIB-T bga had a visible transmission mesh: the `glass` carrier in CoWoS c4_bumping / 00027 s09 (cell
  and block), and in EMIB bumps / fli_t the laminator tool's PET support film, which L38 draws with key `glass`
  (`tools/assembly/laminator.ts`; key `pet` exists since the follow-up). three's transmission pre-pass re-renders the
  opaque scene per render call (main and PiP). Fix: glass no longer uses transmission (alpha, double-sided,
  src + dst (1 - a) blending, path-length edge tint; work-scale reflection lowered for L37's debond overlay).
  Calls before -> after: c4_bumping 149-169 -> 93-105; s09 158 -> 84 (3 routes); bumps 172 -> 95; fli_t 205 / 201 ->
  111 / 109; EMIB-T bga 151 -> 151 (0 transmissive meshes in block and work: not material-caused, the block scene's
  mesh count). JSON: `cache/process3d_renders/materials/calls_before_20261023_233415.json`,
  `calls_after_20261023_233942.json`; glass look `cache/process3d_renders/materials/process_glass5_20261023_233812/`.

## Hand-off

- Engine: create one ProcMaterial per mesh, `setScale(umPerUnit)`, `set(state)` per frame, `setFront` for fills
  (world box of the whole fill region), `renderer.localClippingEnabled = true` for `setClipping`, and set
  `scene.environment` (e.g. `createProcEnvironment(renderer)`, intensity ~0.45 in the lab) or metals render black.
- Open: thin-film interference (oxide / nitride / OSP), transmission-based transparency, PI blue absorption below
  490 nm, IMC constants, polymer colours that are templates (README T-rows). Grinding arcs are centred on each mesh's
  bbox centre: the wafer body must be one mesh centred on the wafer.
- Possible collateral (to check): the session scratchpad folder `dl/` was reused by this lane for one PDF and removed
  at cleanup; if another lane had files in `scratchpad/dl/` (siblings `dl2`..`dl6` exist), they were deleted.
