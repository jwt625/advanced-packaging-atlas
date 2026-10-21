---
title: Lane L2 - D1 materials library (MVP then tier 1)
date: 2026-10-20
status: in progress
scope: engine/src/materials/, engine/data/materials/, engine/tests/materials*.test.mjs, this file
owner: lane L2 (Claude subagent, DevLog-012)
---

# L2: materials library

Binding inputs: DevLog-012 (lanes, shared rules), sims/SPEC.md section 4 (materials contract), DevLog-010 A6 and
Decision 2 (proprietary classes: basis `paper_model_input` with alternatives), R4
(`DevLog/research/2026-10-20-sim-materials-library-scope.md`), R1 section 1.2 (secant CTE re-basing closed form).
Pattern: eo-modulator-atlas DevLog-038 and `engine/data/materials.json` `library` (field provenance: value,
condition, source_read, locator, primary_cited, verification, verified_on; `alternatives` with `use`; `missing`).

## Plan (2026-10-20 13:12 PDT, before implementation)

1. Schema `ap-sim.materials/1`, YAML, one file per material group under `engine/data/materials/`:
   - File header: `schema`, `group`, `verified_on`, `materials: {key: entry}`.
   - Entry: `description`, `class`, `template_key`, `valid_T_C: [lo, hi]`, `basis` (entry default), `status`
     (`ok | pending_source | partial`), property blocks, `alternatives`, `missing`.
   - Property leaf ("quantity"): exactly one of `value` (scalar or per-axis list), `table` (`{T_C: [...], value: [...]}`
     or `{f_GHz: [...], value: [...]}`; f x T 2D table for Dk/Df), or `value: N/A`; plus `unit` (stored unit as
     written in the source, converted to SI at load), `basis` (`datasheet | handbook | measured | paper_model_input |
     derived`), `source` (paper_id or full citation), `locator`, `condition`, `verified_on`; optional
     `primary_cited`, `note`, `interp` (`linear` default).
   - Properties: `density`, `cp`, `k` (iso or `[kx, ky, kz]` or table), `elastic` (`model: iso | ortho | cubic |
     bilinear_tg | table_T`), `cte` (`kind: secant` + `Tref_C`, or `kind: instantaneous` converted once at load to
     secant at a declared Tref; `model: constant | table_T | bilinear_tg`), `tg` (`T_C` + `method`), `eps_r`,
     `tan_delta` (with `f_GHz`), `sigma` (or `resistivity`), tier-2 placeholders `viscoelastic`, `viscoplastic`,
     `plasticity`, `cure_shrinkage` (`status: tier2_pending`).
2. Loader `engine/src/materials/index.mjs`:
   - `loadLibrary()` reads every YAML in `engine/data/materials/` (Node fs; a `fromObjects()` variant for the browser
     bundler), validates, converts to SI once, converts instantaneous CTE to secant once.
   - `resolve(key, T_K, opts)` -> SPEC section 4 object (SI). `opts.need` = list of properties required (default all
     of thermal + elastic + cte); a needed property that is `N/A` throws naming key and property; unknown key throws.
     `T_K` outside `valid_T_C` (entry or leaf) throws unless `opts.allowExtrapolation === true` (clamped, warning in
     provenance). `opts.alternative` picks a named alternative set; `opts.f_Hz` for Dk/Df tables.
   - `rebaseSecantCte(entry, Tsf_K, T_K)`: alpha_r(T) = [alpha_m(T)(T - Tm) - alpha_m(Tr)(Tr - Tm)] / [(T - Tr)(1 +
     alpha_m(Tr)(Tr - Tm))], derivative form when |T - Tr| < 1e-3 K (R1 sec. 1.2; COMSOL guard).
   - `aliasTemplateKey(templateKey)` -> default library key; `other` -> error (must be mapped per part).
   - `homogenize({kind, constituents, fraction, axis})` -> resolved-like entry with orthotropic k, E (Voigt along the
     fibre/column axis, Reuss across), CTE (Turner / Schapery-type ROM for the axial direction, volume ROM across),
     labelled `homogenization: rom`, with Voigt and Reuss bounds attached.
   - Si cubic: `cubicDirectionalE(C, dir)` from compliance S; isotropic shortcut only on request
     (`opts.elastic: 'iso_110' | 'iso_100' | 'iso_vrh'`).
3. MVP (about 15 materials): si_crystal, cu_bulk (+ cu_electroplated), sac305, snag, underfill_cuf, emc, abf_gl,
   core_bt (organic_laminate), polyimide, sio2, ss304, cu_lid (alias of cu_bulk), tim_indium, tim_polymer,
   glass_alkali_free. Values: primary sources where cached (Hopcroft Si, Krupka Si, Motalab SAC305), NIST open reprints
   where readable, paper model-input tables (R4 5.4) with cross-paper spread as alternatives; image-only values ->
   `missing` with locator.
4. Tier 1 (R4 7.1, ~30): add sio2_fused, sin_pecvd, low_k_beol (N/A placeholder), aln_film, ni, au, ti, al, abf_gx92,
   abf_type_a (f x T), lmc, pbo/bcb, pid_lowloss, solder_resist, prepreg_lowloss, adhesive, tim_graphite, glass grades,
   si_hr. Paywalled non-IEEE sources (config/sim/manual_downloads.md) -> `status: pending_source` with paper_id.
5. Tests `engine/tests/materials*.test.mjs`: schema validation of every file; SI conversion; CTE rebase identity and an
   analytic check (linear alpha_t); cubic-to-directional E for Si <100>/<110> vs Hopcroft values; Reuss <= ROM <= Voigt;
   resolve refusals (unknown key, N/A, out of range).
6. Self-checks: two passes, 10 random entries each, value + locator re-read against source text.

## TODO

- [x] Read Hopcroft, Krupka, Motalab cached text; R4 5.4 paper tables
- [x] Schema + loader + homogenize
- [x] MVP data files
- [x] Tests green (14/14)
- [x] Tier 1 data (web: open NIST reprints, vendor TDS, moderate)
- [x] Self-check 1, self-check 2
- [x] Final report
- [ ] Wentao: Poisson ratio policy for EMC / core / ABF-class gaps (see Open gaps)
- [ ] Download list (config/sim/manual_downloads.md) -> replace inherited / secondary Si, electroplated Cu, EMC viscoelastic, Anand primaries

## Progress log

- 2026-10-20 13:12 PDT plan written.
- 2026-10-20 13:15-13:30 PDT sources read: Hopcroft (Table III p.4, Table IV p.6, renders), Krupka (Table I, Fig. 2),
  Motalab (Fig. 11, Fig. 12); paper tables of R4 sec. 5.4 (renders where the text layer is image-only:
  ectc51529.2024.00155 p.3, ectc51909.2023.00155 p.3, tcpmt.2025.3614186 p.6-7, ectc51687.2025.00085 p.2-3,
  tcpmt.2025.3538554 p.7, ectc51846.2026.00389 p.5, tcpmt.2025.3610036 p.4). Web (about 15 requests, one at a time):
  NIST JPCRD reprints Swenson 1983, Matula 1979, Ho-Powell-Liley 1972, Ledbetter-Naimon 1974; NBSIR 80-1627; NIST
  cryogenic pages (OFHC Cu, 304); NIST solder DB v4; SCHOTT B33, Korth silica, UPMET 304, Indium PDS 100346, Henkel UF
  8830S, Panasonic CV8710. PDFs were rendered in the session scratchpad only (deleted after the self-checks); nothing
  saved in the repo. Unreachable: Corning EAGLE XG (403), Indium Corp constants (connection reset), Heraeus Suprasil
  sheet (404); Panasonic CV8710 2023 brochure has no table.
- 2026-10-20 13:32-13:45 PDT code (units, cubic, schema, eval, library, homogenize, index, node) and 11 data files.
- 2026-10-20 13:45 PDT coordinator note: `_sources.yaml` line 117 did not parse (unquoted `[14]` in a flow map):
  all `read:` values quoted; test "every data file parses as YAML and validates" added; Node file reading moved from
  `index.mjs` to `node.mjs` (`index.mjs` and `library.mjs` now have no Node imports; test "no Node imports in browser
  modules" added).
- 2026-10-20 13:47 PDT `node --test tests/materials.test.mjs`: 14/14 pass.
- 2026-10-20 13:49 PDT self-check 1 and 2 (seeded random, 10 leaves each, value + locator against the source text or
  page render): 20/20 match; one ambiguity noted (NIST DB Table 2.2.7 prints 180 in the Cu Young's-modulus column;
  only Cu density and CTE are taken from that row). Earlier, during transcription, one locator was corrected
  (ectc51529.2024.00265 footnote text is font-shifted; "DMA tensile" -> "DMA, footnotes e, f").

## Layout and API (hand-off)

| File | Role |
|---|---|
| `engine/src/materials/index.mjs` | pure entry (browser, worker): `createLibrary`, `libraryInputFromDocs`, cubic helpers, `parseHomogKey`, `validateFile` |
| `engine/src/materials/node.mjs` | Node helper: `loadLibrary(dir)`, `library()`, bound `resolve`, `rebaseSecantCte`, `homogenize`, `aliasTemplateKey`, `aliasDbString`, `materialKeys`, `materialEntry`, `alternativesOf`; re-exports index.mjs |
| `engine/src/materials/library.mjs` | validation + compilation + resolve / rebase / alias logic |
| `engine/src/materials/{schema,eval,cubic,homogenize,units}.mjs` | schema `ap-sim.materials/1`; leaf evaluators and CTE strain machinery; cubic elasticity; ROM; units |
| `engine/data/materials/_sources.yaml`, `_aliases.yaml` | source registry (every leaf `source` must exist), template-key and DB-string aliases |
| `engine/data/materials/*.yaml` | 9 data files, 47 entries |

- `resolve(key, T_K, opts)` returns the SPEC section 4 object (SI) plus `key`, `T_K`, `Tg_K`, `provenance`
  (per-property basis, source, citation, locator, alternative used, warnings). opts: `need` (default
  `['k', 'elastic', 'cte']`; thermal callers pass `['k']`, EM callers `['eps_r', 'tan_delta']` or `['sigma']`),
  `allowExtrapolation`, `allowFrequencyExtrapolation`, `f_Hz`, `use: {property: alternativeName}`, `elastic`
  (`cubic` | `iso_hill` | `iso_110` | `iso_100`), `orientation` (`wafer_100_edges_110` default, rotation 45 deg about
  z; or `crystal`), `Tsf_K` (for `homog:` keys). A needed property that is N/A, pending or outside its data range
  throws naming key and property; a non-needed one is `null` with its status in provenance.
- `rebaseSecantCte(entryOrKeyOrResolved, Tsf_K, T_K)` -> `{kind: 'secant', Tref_K: Tsf_K, alpha: [3]}`; R1 sec. 1.2
  closed form, derivative limit within 1e-3 K. Instantaneous data are integrated once at load (exact midpoint rule on
  linear segments; 0.5 K grid for smooth steps). Datasets without a stated Tref use 293.15 K (recorded as
  `Tref_basis: convention`).
- `homogenize({kind, constituents: {inclusion, matrix}, fraction, axis, T_K, Tsf_K, opts})` and keys
  `homog:<kind>:<inclusion>+<matrix>:<fraction>[:<axis>]`. Columns (bump, pillar, TSV, TGV, via; RDL lines with axis x
  or y): axial Voigt, transverse Reuss, G Reuss, nu ROM with reciprocity, CTE Turner axial / Schapery transverse.
  Sheet (`rdl_layer`, axis `xy`): in-plane Voigt, out-of-plane Reuss. Output `homogenization: 'rom'`, `bounds`,
  formulas, warnings. Cubic constituents enter with the Voigt-Reuss-Hill average. Its CTE is strain-free at Tsf_K.

## Decisions (this lane, 2026-10-20)

1. Defaults for proprietary classes = paper_model_input (DevLog-010 Decision 2); the set is chosen per entry for
   completeness and for the D3 bring-up warpage paper: underfill_cuf and emc = ectc51909.2023.00155 Table 8;
   core_lowcte = ectc51529.2024.00155 Substrate B; abf_gl = ectc51687.2025.00148 (+ nu from ectc51846.2026.00103);
   solder_resist = tcpmt.2025.3614186 (only complete set); polyimide_rdl = JSR5100 (tcpmt.2025.3538554, only complete
   set). A property may come from a second source (each leaf has its own provenance; e.g. underfill nu 0.29 from
   tcpmt.2025.3614186, EMC k and density from Panasonic CV8710U).
2. Si default elastic = cubic Hall constants via Hopcroft Table III; orientation default wafer (100) with die edges
   along <110> (rotation 45 deg). Isotropic shortcuts only on request.
3. Constants carry no T dependence unless the source gives one (`condition` says "T dependence not applied").
   Tables refuse extrapolation; entry `valid_T_C` gates every call.
4. In-plane-only polymer CTEs (ABF, core) are applied to all three axes; recorded in each leaf `note` (assumption).
5. Bilinear-Tg models use a sharp step (no DMA curves read); `width_K` is supported for later placeholders.
6. Alias `copper` -> cu_electroplated (lid / stiffener parts map by kind to cu_lid), `solder` -> sac305 (microbumps to
   snag), `other` -> no default (error).

## Open gaps (need data or a decision)

- Poisson ratio missing: emc, core_lowcte, lmc, abf_gx, abf_gcp, bcb, parylene_n, pid_eptc, daf, tim_polymer,
  tim_indium (elastic all N/A), sus430 (no E), ni, al. With the defaults, `resolve` refuses mechanics for emc and
  core_lowcte (the two warpage-dominant materials) until a case gives an override with provenance or Wentao approves
  a placeholder policy. The complete ortho `pcb_board` set (tcpmt.2025.3614186) exists for boards.
- Thermal conductivity missing for every polymer except EMC (0.95, other grade), gel TIM, generic epoxy (0.5) and
  AlN film: underfill, ABF, core, polyimide, solder resist, SnAg k.
- Above-RT data missing: Cu CTE (constant handbook 17.0 used), SS304 CTE above 100 C (alternative 20-870 C mean),
  Si cp, Cu cp above 300 K, Si Cij(T).
- Image-only / bound-only values not stored: graphite TIM k ("> 20 W/m-K"), ectc51909.2023.00175 EMC DOE ranges.
- pending_source (manual downloads): physrev.161.756, physrev.134.a1058, 1.333965, j.ijadhadh.2011.10.007,
  j.mee.2003.09.012, 09540910010331428, j.microrel.2013.07.100 (listed in leaf `primary_cited` / entry `missing`).

## Contract change requests (additive)

- SPEC section 4: add `opts.need` (properties required; default thermo-mechanical), `Tg_K`, `key`, `T_K` and
  `provenance` fields in the resolve output; `homog:` keys need `opts.Tsf_K` when CTE is needed; homogenized outputs
  carry `homogenization`, `topology`, `bounds`.
- SPEC section 4 cubic `orientation` is an object `{frame, rotation_z_deg, note}`.


## Wave 2 (coordinator assignment, 2026-10-20)

Coordinator decision (recorded in DevLog-012 for Wentao's review): policy "template basis with mandatory sensitivity".
A missing nu or k may be filled only with basis `template`: (a) `analog_of` a sourced same-class grade, (b)
`range_from` = midpoint of a sourced class range, (c) `placeholder: true`, nu = 0.30 for polymers / composites only.
Never for E, CTE or Tg. Every template value carries `sensitivity: {property, delta}` (nu `{abs: 0.05}`, k
`{factor: [0.5, 2]}`). Gap-3 choices accepted as recorded assumptions.

### Progress log (wave 2)

- 2026-10-20 13:52-13:58 PDT schema: basis `template` (validated: allowed fields k / nu only, sensitivity block, exactly
  one of analog_of / range_from / placeholder, placeholder only nu = 0.30 with a 'placeholder' note); entry
  `assumptions: [{id, text}]` and leaf `assumption`. resolve(): `provenance.template` lists template properties
  (e.g. `elastic.nu`, `k`) with sensitivity and kind; `provenance.assumptions`. New `listTemplateValues()`.
- Sources found instead of templates: Ni nu 0.296 (Ledbetter-Reed 1973 JPCRD 2, 531, Table 18 best value, open
  reprint, measured); Al nu 0.300 derived from NIST solder DB Table 1.10 (E 68.9, G 26.5 GPa; Al E changed to 68.9 from
  the same row). tim_indium and sus430 elastic: no source found; left refused.
- Template values (18): nu: abf_gx, abf_gcp (analog abf_gl 0.29); bcb, parylene_n, pid_eptc (analog JSR5100 0.35);
  daf (analog die_attach_tcpmt 0.3); core_lowcte (analog PCB in-plane 0.11, tcpmt.2025.3614186); emc, lmc,
  tim_polymer (placeholder 0.30). k: underfill_cuf and emc (analog Panasonic CV8710U 0.95); abf_gl, abf_gx, abf_gcp,
  solder_resist (analog 'conventional package SR, k approx. 0.2 W/(m K)', ectc51846.2026.00119 p.1-2); polyimide_rdl
  (analog effective RDL cross-plane k 0.15, ectc51846.2026.00065 Table I); core_lowcte (analog FR-4 1.7, NIST DB
  Table 2.2.6); snag (analog SAC305 61, Indium PDS). No class-range midpoints (b) were available.
- Not used (suspect): NIST DB Table 2.2.6 'Polyimides' row thermal conductivity 8 W/(m K) (implausible for a polyimide;
  not checked against its original source).
- Assumptions recorded: z_cte_from_xy (abf_gl, abf_gx, abf_gcp, core_lowcte), cu_cte_handbook_constant (cu_bulk and
  inheritors), ss304_cte_20_100_default, single_paper_set (underfill_cuf, emc, lmc, core_lowcte, abf_gl,
  solder_resist, polyimide_rdl).
- DB aliasing: `aliasDbString(material, material_class)` / `aliasDbStringDetail`: exact table, then 42 ordered
  keyword rules (tokens / contains / none vetoes / exclusive metal tokens / class filter), then class defaults (silicon,
  mold_compound only). Multi-material strings (Ti/Cu, Ni/Pd/Au, 'Cu; SiO2') are deliberately left unmapped.
  Coverage on data/stack_layers.csv (2026-10-20 13:59 PDT): {"distinct":1016,"mapped":415,"rows":3575,"mappedRows":2299,"via":{"exact":41,"rule":362,"class_default":12}}.
- Tests: 17/17 pass (`node --test tests/materials.test.mjs`), including every template value has a sensitivity block,
  schema refusal of template E / CTE, assumptions in provenance, aliasing cases and a coverage floor (>= 35 % of
  distinct strings).

- 2026-10-20 13:58-14:02 PDT coordinator request (L3 keys):
  - resolve() and homogenize() map 3D-template keys (copper, underfill, polymer_dielectric, ...) through
    aliasTemplateKey when they are not library keys; recorded as `provenance.alias` (resolve) and
    `provenance.aliases.{inclusion, matrix}` (homogenize). New `canonicalKey(name)`.
  - `void` as matrix (e.g. `homog:bga:solder+void:0.2827`): the void carries no load and no heat (gas conduction and
    radiation neglected); the continuous-path direction gets f k1 and f E1; other directions and shear get
    VOID_RATIO = 1e-5 x the axial value (regularization, cf. R1 lesson 7: COMSOL scales inactive material by 1e-5);
    CTE = inclusion CTE re-based to Tsf; `void` as inclusion is an error.
  - Case overrides: `applyOverrides(library, overrides)` (engine/src/materials/overrides.mjs, exported from index.mjs
    and node.mjs) returns a new library with the same API. Shape per library or template key:
    `E_GPa`, `nu`, `cte_ppmK` (number = instantaneous constant, `{alpha1, alpha2, Tg_C}` = instantaneous bilinear,
    optional `kind: secant` + `Tref_C`), `k_W_mK` (number or [kx, ky, kz]), `rho_kg_m3`, `cp_J_kgK`; each
    `{value, status, ref | note}` with status reported | derived | public | template | user (A11). Leaves get basis
    `case_override` (status template -> basis template with default sensitivity, allowed only for nu and k_W_mK) and
    a synthetic source `case:<key>.<field>`. E_GPa or nu on a cubic / ortho entry needs both (becomes isotropic).
  - L3 generator check (generateNode, 25 C; need ['k'] and ['k', 'elastic', 'cte']): cowos_l 21 keys: thermal 20/21
    (refuses `other` = lid feet, no default mapping), mechanics 19/21 (+ `tim` -> tim_polymer CTE N/A). Across
    families and -55 / 25 / 240 / 260 C the remaining refusals are: `other` (cowos_l, emib_t, fcbga_organic lids;
    cowos_s `homog:rdl_layer:other+oxide`), tim_polymer CTE N/A and valid_T_C ends 150 C (lane choice), sac305 outside
    -50..217 C (BGA at -55 C and above the solidus at 240 / 260 C), abf_gl above 240 C (source range), ss304 CTE
    outside 20-100 C (cowos_r stiffener; alternative cte_mean_20_870 available).
  - Tests: 21/21 pass.


## Wave 3 and audit A1 fixes (2026-10-20)

### Progress log

- 2026-10-20 14:05-14:15 PDT audit A1 (DevLog/audits/sim_engine_audit_A1_2026-10-20.md):
  - S5: `cubic.mjs` Bond matrix now uses the active R = Rz(deg) of SPEC section 12 (was R^T). Test: at 30 deg the 6x6
    equals an independent 4th-order tensor rotation C'_ijkl = R_ip R_jq R_kr R_ls C_pqrs; C16 = -12.406 GPa,
    C11 = 187.088 GPa (audit values). Default 45 deg unchanged (C16 = 0). No other consumer of cubicStiffnessRotZ.
  - S2: plane topology Poisson pair fixed to the standard convention (major ratio, load along the stiff in-plane
    direction, nu_xz = nu_yz = ROM; minor by reciprocity). Test: reciprocity, PD and continuity over f = 0.02-0.95
    for plane, xy, x and z topologies.
  - S3: rdl_layer axes: `:x` / `:y` = lines along x / y (along-line Voigt, across-line and z Reuss), `:xy` =
    orthogonal line levels averaged (x and y = mean of along- and across-line k, E, CTE; z and shear Reuss), `:plane`
    = continuous plane (in-plane Voigt). An rdl_layer key without suffix defaults to `plane` (the previous behaviour).
  - M6: a numeric `cte_ppmK` override without `kind` is secant with Tref 25 C, recorded as assumption
    `override_cte_secant_Tref_25C`; `kind` secant | instantaneous accepted; bilinear form stays instantaneous.
  - glass_en_a1.k: no EN-A1 k found (AGC sheets found are soda-lime); template analog glass_bf33 1.2 W/(m K)
    (SCHOTT TDS), sensitivity x0.5 / x2.
  - M7: license line added to tests/materials.test.mjs.
- 2026-10-20 14:15-14:27 PDT wave 3 entries:
  - silicone_adhesive: Henkel LOCTITE ECCOBOND 3005 TDS (2012-08): Tg -15 C (TMA), tensile modulus (DMTA)
    7918 / 358 / 52 MPa at -65 / 25 / 150 C, CTE 32 / 136 ppm/C; k template analog ECCOBOND 3003 (1 W/(m K));
    nu placeholder 0.30; alternative ECCOBOND 3003 flexural modulus to 250 C and CTE 39 / 162 (Tg 49 C).
    Note: silicone rubbers are usually near-incompressible; the CD1 placeholder 0.30 may be far off for this class
    (sensitivity +-0.05 does not cover it) - flagged for Wentao.
  - Polymer / film TIM high-temperature CTE: none found (cache, Parker CoolTherm sheets HTTP 403, Momentive page
    garbled, DOWSIL gel pages list no CTE). tim_polymer CTE stays refused.
  - sin_film: MIT 6.777 PECVD nitride page (compiled, cited refs): density 2500, E 160 GPa, nu 0.253, eps_r 7,
    k template range_from 16-33 W/(m K) (midpoint 24.5). CTE N/A (no source).
  - sicn_film, ncf: placeholders (all N/A; cached SiCN and NCF papers give no property values).
  - ncp: ectc51906.2022.00106 p.2 Table I NCP-C (epoxy): E 10 GPa, CTE 30 ppm; NCP-A / NCP-B alternatives; nu and k
    template analogs (underfill 0.29, CV8710U 0.95).
  - snbi: tcpmt.2025.3538554 p.7 Table V (Bi 52 %): E 11.9 GPa, nu 0.35, CTE 14.0; NIST DB Sn-58Bi CTE 15 ppm/K
    alternative; valid to the 138 C solidus; k template analog SAC305.
  - SoIC / hybrid-bond gap-fill oxide: no source distinct from SiO2 film data; maps to sio2_film.
  - Aliases: rules for snbi, ncp, ncf, sicn_film, sin_film, silicone_adhesive (composite strings vetoed). Coverage
    436 / 1009 distinct strings, 2384 / 3575 rows.
- 2026-10-20 14:28 PDT all 12 families (listFamilies, generateNode, 188 family-keys) at 25 and 240 C, need ['k'] and
  ['k', 'elastic', 'cte']: remaining refusals
  - `other`: fcbga_organic (likely the stiffener adhesive; silicone_adhesive now exists for L3 to map).
  - tim (tim_polymer): CTE N/A (mechanics, all T); valid_T_C ends 150 C (lane choice; the source gives none).
  - BGA `homog:bga:solder+void` (9 families): sac305 above its 217 C solidus at 240 C.
  - epoxy_generic (glass_core_substrate, cpo_module): elastic N/A; valid_T_C 20-110 C is a lane choice.
  - ss304 (cowos_r stiffener): CTE outside 20-100 C at 240 C (alternative cte_mean_20_870).
  Test added (all families, refusal reasons limited to the documented ones, >= 90 % resolve). Tests 26/26 pass.


## Wave 4 (2026-10-20)

- 2026-10-20 14:40-14:49 PDT
  - Per-axis CTE override: `cte_ppmK: {value: [ax, ay, az], kind?, Tref_C?}` (audit A1 M5); same default as a scalar
    (secant, Tref 25 C, assumption `override_cte_secant_Tref_25C`). Test with the Xilinx core [11, 11, 16].
  - Silicone Poisson ratio: no value in the cache; the candidate open-access measurement (Mueller et al., Soft Matter
    2019, RSC c8sm02105h; search snippet nu 0.495 for Sylgard 184) could not be read (RSC HTTP 403; HAL anti-bot page,
    no further HAL requests). Placeholder 0.30 kept for silicone_adhesive (default and ECCOBOND 3003 alternative) with
    sensitivity widened to {minus: 0.05, plus: 0.19} (up to 0.49) and a note; schema accepts the asymmetric delta.
    Suggested manual download: doi 10.1039/c8sm02105h (inferred from the RSC article id; not checked on Crossref).
  - All-families sweep (12 families, 25 / 240 C, thermal and mechanics): 727 / 756 resolve; refusals: tim_polymer
    (CTE N/A; valid to 150 C), SAC305 BGA above the 217 C solidus at 240 C (9 families), silicone_adhesive default E
    table ends 150 C (ECCOBOND 3003 alternative to 250 C), ss304 CTE outside 20-100 C (cowos_r), epoxy_generic
    (elastic N/A; valid 20-110 C). fcbga_organic `other` is now mapped by L3 (silicone_adhesive).
  - Tests 27/27 pass.


## Wave 5 (2026-10-20; coordinator decisions CD5, CD6)

- 2026-10-20 14:52-15:05 PDT
  - SUS430: Combined Metals 430 data sheet (file 2024-01-11; "for reference only"): density 7.74 g/cm3, E 200 GPa,
    k 26.1 W/(m K), resistivity 60 uOhm cm (20 C), mean CTE 10.4 ppm/C (20-300 C, alternative). nu: no readable 430
    source (TotalMateria paywalled) -> template analog of ss304 0.290 (CD1 a), +-0.05. Default CTE stays the
    11 ppm/C of the 120 mm package papers (recorded assumption). Outokumpu / Aperam sheets not found.
  - CD5: schema accepts basis template for CTE only with sensitivity {property: cte, delta: {factor: [<= 1/3, >= 3]}}
    and a `rationale`; resolve() and rebaseSecantCte() refuse it unless the entry's isotropic E at T is <= 100 MPa.
    tim_polymer CTE = 149 ppm/K (range_from: above-Tg CTE of filled silicone adhesives ECCOBOND 3005 136 /
    ECCOBOND 3003 162 ppm/C; rationale in the leaf). No gel-TIM CTE source read. L3 should drop its `user` 100 ppm/K
    and use the library value. listTemplateValues() rows now carry `rationale`.
  - CD6: resolve(key, T, {allowExtrapolation: true | [keys]}) - the list matches library keys, template keys aliased
    to the entry, requested keys and homog keys (a listed homog key extends to its constituents). Rules: table leaves
    hold the last value; CTE strain continues with the end instantaneous alpha (hold-last alpha); bilinear Tg models
    never extrapolate (they are defined everywhere); entry-level valid_T_C overrun uses the stored constants. Every
    overrun is recorded in `provenance.extrapolated: [{property, T_C, range_C, rule}]` (homogenized results list
    their constituents' flags). Engine lanes map the case `materials.allow_extrapolation` to this option.
  - Sources above 240-260 C checked: abf_gl none in the cache (ectc51529.2024.00392 states a 250 C thermal budget
    only); underfill_cuf and polyimide_rdl defaults already valid to 260 C (constants / bilinear); no change.
  - All-families sweep 728 / 756; remaining refusals: tim_polymer and epoxy_generic valid_T_C (lane choices; CD6),
    SAC305 BGA above its solidus at 240 C, silicone_adhesive default E table ends 150 C (ECCOBOND 3003 alternative),
    ss304 CTE outside 20-100 C (alternative), epoxy_generic elastic N/A. Tests 28/28 pass.


## Wave 6 (2026-10-20; coordinator decision CD7)

- 2026-10-20 15:10-15:57 PDT
  - CD7 a: `lib.attachHomogResolver(createFn, cfg)` (library.mjs; no import of engine/src/homog). With a resolver
    attached, `homog:` keys resolve by the E3 RVE (`homogenization: 'rve'`); `opts.homogenization: 'rom'` selects the
    rule of mixtures per call; an RVE exception falls back to ROM with a `RVE failed (...)` warning and
    `provenance.rve_error`. The resolver gets a ROM view of the library (resolve forced to rom), so its constituent
    and void-matrix calls never recurse. `materials/node.mjs` loadLibrary() attaches homog/resolver.mjs
    createRveResolver by default (`loadLibrary(dir, {homogenization: 'rom'})` to opt out); applyOverrides() keeps the
    attachment. Browser: call lib.attachHomogResolver(createRveResolver) after createLibrary(). Thermal-only calls
    without Tsf_K evaluate the RVE at Tsf = T and return cte null. Cache: the RVE resolver's own cache (key incl.
    fraction, T, Tsf, n, element).
  - CD7 b: ROM rdl_layer topologies now treat z as a parallel path (metal spans the level): x | y lines = along and z
    Voigt, across Reuss, in-plate shear Voigt; plane = Voigt in all directions (upper bound); xy = two stacked
    sublevels (in-plane mean, z Voigt, out-of-plane shear in series).
  - CD7 c: void-matrix ROM: shear in planes containing the column axis = f G_inclusion (was 1e-5 of axial); shear
    without an inclusion path stays regularized.
  - Tests: resolve(homog) equals homog/resolveHomog to 1e-12 for 3 keys (microbump, TSV, RDL x lines); ROM option;
    void delegation; failure fallback; overrides keep RVE. ROM-specific tests pin `homogenization: 'rom'`; the
    resolvability sweeps (cowos_l, all families) run with ROM for speed. 29/29 pass in 8.9 s.
  - Timing (all 12 families, 59 distinct homog keys, 25 and 240 C, Tsf 150 C): 118 calls, 136 s total; RVE first call
    median 1.76 s, max 2.65 s (TSV in Si), RDL line strips about 3 ms; cached calls about 0.01 ms. No RVE failures;
    void-matrix keys (bga, unfilled microbumps, cu_pillar in void) use ROM by design; 4 refusals = SAC305 BGA at 240 C.
  - Note for the mech lane: the library default is now RVE, so mech/case.mjs 'rom' mode must pass
    `homogenization: 'rom'` to lib.resolve; its own createRveResolver(mat.lib) wrapper becomes optional.


## Wave 7 (2026-10-20)

- 2026-10-20 16:00-16:22 PDT
  - Cure shrinkage is a regular property (`cure_shrinkage: {value, unit: "%", kind: volumetric | linear | not_stated,
    basis, source, locator}`, schema-checked); resolve() returns `cure_shrinkage: {value (fraction), kind, linear,
    volumetric}` with provenance (linear = volumetric / 3 and vice versa; null when kind not_stated) for the L8
    eigenstrain. emc default 0.16 % (ectc51909.2023.00155 p.3 Table 8; kind not stated by the source); alternative
    Panasonic CV8710U mold shrinkage 0.21 % (JIS K6911; treated as linear; may include thermal contraction).
    underfill_cuf: N/A. No other cure-shrinkage value in the cache (3 papers mention it without numbers).
  - solder_resist: the library key resolves to itself; template key polymer_dielectric still maps to polyimide_rdl;
    DB strings 'solder resist' / 'solder mask' map to solder_resist (test).
  - `unusedOverrideKeys(overrides, usedKeys, lib?)` (overrides.mjs, exported from index.mjs / node.mjs): override
    keys matching no used material after template aliasing; homog keys contribute their constituents.
  - Tests 30/30 pass (7.7 s).


## Wave 8 (2026-10-20)

- 2026-10-20 16:25-17:37 PDT
  - Override status `sensitivity` accepted (bound runs of template values; fields nu, k_W_mK, cte_ppmK only); leaves
    get basis case_override, provenance `override_status: sensitivity` and `sensitivity_bound: true`. Every override
    leaf now shows `override_status` (its A11 status) in provenance.
  - Inheritance markers: properties taken from an `inherits` parent carry `inherited_from: <parent>` in provenance
    (applies to cu_electroplated, cu_lid, si_hr, sio2_film and the new entry).
  - underfill_c4 (inherits underfill_cuf): Tg 160 C, E below Tg 6.9 GPa, CTE 20 / 93 ppm/C from 'Bottom CUF'
    (ectc51529.2024.00155 p.3 Table IV; same row in ectc51687.2025.00027); E above Tg 0.1 GPa and nu 0.29 inherited
    from underfill_cuf (marked); k inherited (template analog, marked). Alternative Xilinx C4 UF (ectc.2011.5898527
    p.2 Table 2: 8.5 GPa, 32 ppm, room temperature). DB alias rule 'C4 UF' / 'Bottom CUF' -> underfill_c4; template
    key `underfill` still maps to underfill_cuf (L3 selects underfill_c4 via c4_uf_mat).
  - Tests 31/31 pass (8.5 s).


## Wave 8b (2026-10-20, from L8)

- 2026-10-20 17:40-18:08 PDT
  - resolveHomogKey guards conduction-only RVE answers: cte / elastic null are passed through as null for thermal
    calls; a caller whose `need` includes elastic or cte gets an error naming the key ("RVE returned no elastic data" /
    "RVE returned no CTE") instead of a crash.
  - node.mjs loadLibrary() attaches L8's precomputed table (engine/src/homog/rve_table_defaults.json, schema
    ap-sim-rve-table/0) to the RVE resolver by default (`rveTable: null` for live RVE only; `rve.table` to supply
    another); helper readDefaultRveTable(). Browser: pass the same JSON as `{table}` to attachHomogResolver.
  - Tests 32/32 pass (6.0 s).

### Review list: DB material strings left unmapped (count of rows in parentheses), by material_class

These need a library entry that does not exist yet (SiN, SiCN, NCF / NCP, SnBi, AuSn, Ni/Pd/Au stacks, polymer brands),
are multi-material descriptions, or are too generic. Generated 2026-10-20 13:59 PDT from the rules above.

- glass 41: glass (69); glass (type not stated) (13); soda glass (6); glass (AGC Inc., ack) (5); glass (Corning) (3); Ag+ ion-exchanged region, buried by Na+ IOX (3); CPO optimized glass (3); photosensitive glass (3); Corning AFG glass (3); Glass C (2); glass carrier (2); AGC EN-1 glass (2); alkaline earth boro-aluminosilicate glass (2); Corning AFG clad glass (2); glass (Low CTE) (1); glass (Middle CTE) (1); glass (High CTE) (1); glass (Low CTE or Middle CTE) (1); Ag+ ion-exchanged alkali glass, buried by Na+ IOX (1); optimized alkali glass (1); alkali glass (1); Ag-IOX alkali glass (1); glass types A-K (internal designations) (1); SCHOTT D 263 glass (1); Glass A (1); Glass B (1); glass (A, B or C) (1); glass (Corning, CTE compatible with Si) (1); glass (linear elastic) (1); glass panel (1); bare glass (1); glass (Corning Inc.) (1); glass panel (Mitsui-Kinzoku HRDP) (1); Ag+/Na+ ion-exchanged D 263 T eco (1); Schott D 263 T eco (1); photosensitive glass (TS technology) (1); commercially available glass frit (1); glass; Cu (MOG1-4) (1); Corning AFG core glass (1); glass (all glass types, Table II) (1); Boro-33 glass (1)
- metal 175: Ti/Cu (30); Nb (14); TiW (11); metal (not stated) (9); TiN (8); not stated (7); Ni/Pd/Au (7); metal layer (6); XTPL CL83A Ag nanopaste (6); Ti/Cu/Ni/Au (6); Cu (NB SEMIPLATE CU 100) (6); ENEPIG (6); US-202A Ag nanopaste (glass frit) (5); Ti/Cu/Au (5); Al-Cu (0.5) with electroless Ni 2 um / Au 0.05 um (4); Ta (PVD) (4); diffusion barrier (material not disclosed) (4); Cu; Sn-Ag-Cu pre-solder on electroless Ni/Au (4); Cu; electroless Ni/Au (4); Cu (electroplated, SAP) on Ti/Cu PVD seed (4); fine-grained ECP Cu pads in PECVD dielectric (4); Cu; SiO2 (4); Ti/TiN (4); Cu (single damascene) in SiO2 (4); Cu / SiO2 (4); Ti-TiN / AlCu / Ti-TiN (PVD) (4); Cu (ECD on Ti/Cu seed) (4); metal (3); Cu/Ni/Au (3); ENIG (3); Cu (Ti/Cu seed, SAP) (3); Ti/Cu seed; electroplated bumps (metal not stated) (3); electroplated Cu on Ti/Cu seed (3); electroplated Cu (SAP) on Ti/Cu seed (3); Cu (electroless + electrolytic) (3); Ti/Au (3); electroless Ni/Au (3); Cr/Cu (2); Ti/Cu (DC sputtered) (2); Cu RDL / dielectric (2); metal (not specified) (2); SMS (matte tin option) (2); Cu pillar + solder cap (SAC in FEM C4 model) (2); M (new metal, not disclosed) (2); RDL metal (not named) (2); Cu wiring in dielectric (2); Cu / dielectric (2); Al (porous etched) / aluminum oxide (2); Al-Cu (0.5) (2); Cu/Ni/Cu (2); UBM (2); Cu with PVD TaN/Ta barrier, CuMn (2); Cu with ALD TaN/PVD TaN barrier, CuMn (2); Cu (wet SAP); dielectric not stated (2); probing pad metal (not stated) (2); Cu with Ta barrier; SiO2 (2); Cu (damascene); SiO2 (2); Cu; SiO2/SiCN (2); Cu (electroplated on Ti/Cu seed) (2); Cu pillar / electroless plated Cu / Cu pillar (2); CuGa2 (2); Cu on Ni (NiCu pad) (2); Cu damascene in deposited dielectric (2); barrier / Cu seed (2); Cu; ENIG (2); Ti/Cu; Cu (2); metal (not named), PVD (2); Cu RDL + dielectric (2); Co (2); Cu / SiCN (2); Ti/Cu (sputtered seed) + electroplated Cu (2); RDL_BEOL (metal not named) (2); Cu, surface Au-plated (2); Cu pads; dielectric oxide (2); M (metal pillar, not disclosed) (2); AlCu (2); metal (one lift-off step) (2); Ti/Cu/Au (evaporated) (2); Ta/Cu (2); TiN (ALD) (2); CZT (Co-Zr-Ta), sputtered (2); Ti adhesion / sputtered Cu seed / electroplated Cu (2); Ti-Cu (2); Ti/Cu (sputtered) (2); Cr/Au (1); Ni/Au (1); Cr (1); BEOL metal (not specified) (1); standard backend fab metal (1); Cu hybrid bonding pads + specially fabricated dielectric surface (1); sputtered Ti/Cu (1); Cu/Ti (1); bond pad metal (dual damascene) in dielectric (1); material D (not named) (1); material C (not named) (1); material B (not named) (1); material A (not named) (1); Ni3Sn4 (1); Cu wiring; p-well Si (1); Cu with TaN liner (single damascene) (1); stud bumps (metal not stated) (1); barrier metal (not named) (1); Ag (electroless, Ag sulfamate bath) (1); Ni, Ni/Ag or SnAg (1); NP-Cu with Ni, Ni/Ag or SnAg (1); Ti 25 nm / Cu 150 nm (1); electroplated Cu (CMP) in photosensitive dielectric (1); Cu and Ti (sputtered) (1); 50 nm Ti / 500 nm Cu (subtractive wet etch) (1); Cu/Ni/Au (PVD seed + plating) (1); Cu/Ni/Au (PVD seed + electroplating) (1); Cu in M0P dielectric film stack (1); Cu in M0 dielectric film stack (1); Cu (ECD) on PVD Ti adhesion and Cu seed (1); Mo or TiN/W fill (1); Cu / dielectric material (1); Cu pillar / electroless Cu / Cu pillar (1); Cu connection pads in SiO2 field (1); X-alloy (1); stopper metal (1); Cu (Ti/Cu seed) (1); Cu, Ni, Sn (1); Cu, Ni, Sn (Ni3Sn4 IMC after BS processing) (1); Ni/Cu (1); Ni, Sn in wafer-level photo-patternable polymer (1); Cu on Ni (1); CVD-W (W type A or W type B) (1); CVD-Ru (1); CVD-W (W type A) (1); Ti 10 nm / TiN 100 nm (1); TiSi2 (1); Ti 100 nm / Cu 200 nm (PVD) (1); Ti 200 nm / Cu 400 nm (1); ENEPIG (Ni/Pd/Au) (1); pad metal (material not stated) (1); top metal (material not stated) (1); bottom metal (material not stated) (1); NiPdAu (ENEPIG) (1); Cu wiring in organic dielectric (not named) (1); Cu; top dielectric (not named) (1); Ti (Ti-Cu sputter) (1); Al-Cu (1); Ta (1); CuNiAu (PVD seed + electroplating) (1); CuNiAu on PVD Ti/Cu seed (Fig. 2f: CuNiAu/CuSnAg) (1); metal (not named) (1); Ti / Cu (1); damascene metallization (1); UBM (material not stated) (1); damascene metallization; Al pads (1); Co/Sn -> CoSn3 (1); Ti/Cu seed; electroplated Cu + Sn (1); Cu or Ni (1); Ti / TiWN / Au + ECD Au (1); final three metal layers of a 45-nm process (1); Sn (1); TiW / Cu (1); Ta barrier / Cu seed (1); Cu or Ni or Co (1); Ti/Cu or TiW/Cu (sputtered) (1); Cu; Ti (1); In (e-beam evaporated) (1); TiN/W (TiN barrier 2.5 or 5 nm) with SiO2 liner (1); Mo (barrier-free) with SiO2 liner (1); Cu pads; CVD dielectric oxide (1); EPIG (electroless Pd, immersion Au) (1); electroless Pd (1); Ni+Au, Au, Cu, Solder (1); ENIG (electroless NiAu) (1); backside metal (1); Ti-Nb-Ti (1); Au/Cu/Ni stack (UBM); Au pad (1); Al/TiN (1); TiN/Cu (1); Cu/Ni/Sn (1)
- dielectric_inorganic 65: SiCN (19); SiN (17); low temperature SiCN (6); Applied Materials Insepra SiCN (4); HDP (4); Al2O3 (4); SiO2 / SiN (4); PECVD silicon nitride (3); SiOx (3); silicon nitride (2); SiN (low-temperature CVD) (2); hermetic and metal diffusion barrier dielectric; Cu (2); planarizing oxide; Cu-seed layer or damascene-like plating (2); Cu (single damascene) in SiCN (Producer GT Insepra) (2); dielectric (2); Al2O3 (ALD) (2); Si3N4 (ICPCVD) (2); inorganic liner (PECVD) (2); Insepra SiCN (2); oxide; fine-grain (nanocrystalline) ECD Cu via (2); oxide; standard ECD Cu via (2); STI dielectric; active Si (2); SiCN film1 (Si, N, C, H) (2); SiCN film2 (Si, N, C, H) (2); SiN (PECVD) (2); SiCN (SiCN#2, PECVD) (2); BOX (2); SiN- and TEOS-based SiO2 (2); HfO2 (2); Si3N4 (ICPCVD 90 C) (2); C-Layer (high thermal conductivity thin film) with Cu interconnects (1); CVD A (1); CVD B (1); SiNx (dielectric); Cu via (1); SiNx (PECVD), CMP-planarized; electroplated Cu via (1); SiN (Si3N4) (1); higher modulus dielectric (replaces standard low-k); Cu (1); higher modulus dielectric; Cu (1); SiO2; Al (FS M1) (1); in-organic dielectric film (controlled bonding strength) (1); CVD bonding dielectric; SiO2 transit layer at interface (1); bonding dielectric (1); PECVD dielectric stack (materials not named) (1); VV dielectric; Al (1); silicon box layer (BOX) (1); nitride (Nit, Fig. 7) (1); SiCN + SiO2 (1); PECVD SiOxNy, O:N ~2:1 (1); SiO2; M1 metal (1); low temperature SiN (PECVD) (1); oxide passivation (low-outgassing film) with Cu pads (1); SiN (PECVD, 300 C) (1); SiO2; Al2O3 (1); PECVD layer (material not stated) (1); SiOCH (carbon-doped silica) (1); Si3N4 (1); gapfill dielectric material (1); inorganic layer (1); inorganic dielectric (1); TiO2 (1); low temperature silicon nitride (1); polycrystalline (microcrystalline) CVD diamond (1); Al2O3 (ALD, TMA + H2O) (1); SiO2 (ICPCVD 90 C); Ti/Cu pillars (1); passivation (1)
- unspecified 63: process standard (18); Cu pads + DBI dielectric (11); insulating layer (not named) (8); not stated (8); PI (Fig. 7/8 labels) (5); dielectric (not named) (4); LIO (3); passivation (3); passivation (material not stated) (3); organic interposer (3); TSV dielectric + Cu TSV ends (3); blanket carrier wafer (material not stated) (3); core material (not named) (3); innovative dielectric layer with low loss characteristic (2); PSV (2); fusion bonding film (2); bonding dielectric (2); release layer (2); insulating resin (2); Cu-Cu hybrid bond (dielectric not stated) (2); liner (2); dielectric (not stated) with pad via (2); Cu wiring and dielectric (not specified) (2); insulator (2); nanosheet stack, STI (as written) (2); diffusion barrier (new material, not named) (2); BS film (not named) (1); Film (1); Carrier Plate (1); multiple ILDs with etch-stop layers (not named) (1); substrate dielectric (not named); Cu vias (1); commercial release layer (laser debondable) (1); Cu/low-k (1); passivation (not specified) (1); passivation + UBM (not specified) (1); Cu RDL (1); resin material (1); opaque layer (material not stated) (1); not stated (MPW PIC) (1); not named (1); IR-absorbing ablation layer (1); reflection (laser shield) layer (1); energy absorption layer (pre-coated on glass) (1); bonding layer (1); fusion bond (1); wafer (type not stated) (1); III-V EML chip (material not stated) (1); III-V devices (1); Si power MOSFET (material not stated) (1); solder pad (1); carrier (1); organic carrier (1); laser release layer (1); bond film (composition not stated) (1); dielectric (not labelled) with pad via (1); TTC-1002 thermal test chip (1); passivation (product not stated) (1); metal micro ball (composition not stated) (1); UBM (material not stated) (1); low loss insulation layer (1); BEOL stack (1); plating seed layer (material not stated) (1); low-k dielectric (1)
- dielectric_polymer 92: polymer (16); HP19 (Cuptronic photosensitive material) (7); SR (product not stated) (6); photo imageable interlayer film (epoxy-acrylate oligomer, bis maleimide oligomer, cross linker, silica filler, photo initiator) (4); polymer optical waveguide resin (not named) (4); CX-series dry film resist (4); insulation film (4); polymer (product not stated) (4); Prepreg B (4); low-k polymer (low Dk) (3); low Dk dielectric polymer (3); Polymer (m-PPE in HFSS model) (3); PM (3); positive-tone photo dielectric (TMAH developable) (3); positive-tone PR (commercial, TMAH developable) (3); dry film resist (DFR) (3); dry-film dielectric laminate (product not stated) (3); UV TP-1 (UV-curable polyurethane) (3); WPR-1201 (3); Prepreg A (3); low-k polymer (2); polymer-based passivation (2); polymer dielectric film (PM) (2); resin (2); photo imageable interlayer film (this work) (2); polymer liner (CVD) (2); Resonac RY5115 (2); Prepreg without Glass cross (2); SU8; plated Cu (2); polymer cladding (2); polymer (not specified) (2); DFR (dry film resist) (2); JSR5100 (2); epoxy based organic dielectric (2); organic polymer dielectric with semi-additive Cu (2); UV-curable polyurethane (UV TP-1) (2); insulation film (resin + filler, no glass cloth) (2); polymer passivation (2); Panasonic R-G740M RCC resin (RG740 30um Cu 3/0) (2); Panasonic R-G740M RCC resin (2); polymer dielectric (2); AZ-series photoresist (1); PXi/XI series photoresist (Sumitomo Chemicals) (1); SM (1); low temperature cured photo-dielectric (1); positive-tone photo dielectric (two commercial materials, TMAH developable) (1); liquid polymer cladding resist (UV-cured) (1); Nissan Chemical SUNCONNECT (1); dielectric (not named) (1); dielectric (1); polymer dielectric film (low Dk) (1); photoresist (1); dry-film dielectric laminate (1); PET (polyethylene terephthalate) (1); transparent resin, n = 1.5 (1); core material (1); cladding material (1); HTCSR (photosensitive dry film, 1.2 W/mK grade) (1); Reference 1 (dry-film SR for package substrate) (1); HTCSR (1.2 W/mK grade) (1); HTCSR-2 (1.0 W/mK) (1); HTCSR-1 (0.7 W/mK) (1); Reference package SR (0.2 W/mK) (1); HTCSR formulations; Reference 1 (1); thermosetting resin (1); photo-sensitive organic dielectric (modified) (1); photo-sensitive organic dielectric (1); prototype organic dielectric (1); modified organic dielectric (1); thick polymer (SU-8 in this work) (1); SU-8 (photo-sensitive polymer) (1); SU-8 (1); Low Temperature Curing (LTC) passivation polymer (1); insulation layer (1); polymer core (1); polymer core material (1); liquid resist tailored for 405 nm (1); photo-sensitive passivation (PSV) (1); SU8; Cu (1); backside epoxy (1); spin-coated polymer (1); phenolic resin-based positive-tone photosensitive polymer with PAC (1); same phenolic positive-tone dielectric as ETR (1); thin film polymer (1); dry film resist (1); liquid resist (1); liquid film (1); material B: Panasonic R-G740M RCC (1); PE (1); PET (1); parylene-F (1); polymer with a low dielectric constant and a low loss tangent (1)
- solder 26: Sn (9); solder (4); Sn (NB SEMIPLATE SN 100) (4); In (indium sulfamate bath) (4); Ni/Sn (3); uBump; underfill (2); Cu/solder bump; underfill (2); solder (Sn in FEM uC4 model) (2); Sn-based nanosolder (SACA-X), fused with pad metal (2); solder (solder-to-solder) (2); solder micro-bump (2); electroplated solder (alloy not stated) (2); 99.9 indium solder ball (2); solder micro bumps (1); ubump; underfill (1); Cu pillar + solder; underfill (1); solder (composition not stated) (1); indium-based STIM (1); Sn-based nanosolder (SACA-X) (1); Sn1.8%Ag (1); Sn pre-solder (1); Cu/Ni/Cu/SnAg bumps on Cu/Ni/Cu pads (1); Cu pillar + SnAg solder (both dies) (1); solder (paste, screen printed) (1); high-melting-point Pb-Sn solder (1); electroplated In (1)
- ceramic 8: SiC (9); Ni-Zn ferrite, Laird's 28 material (3); LTCC (2); Alumina Ribbon Ceramic (ARC) (2); SiC epitaxial layer (2); undoped 4H monocrystalline SiC (2); ceramic (1); 4H-SiC (1)
- adhesive 43: adhesive (7); TM-420 (Resonac TBF) (6); optical adhesive (4); silicone adhesive with glass beads (4); adhesive (CVL) (4); polymer-based sealant (3); thermal release tape (3); TBM (3); NCF (2); thermal tape (2); conductive epoxy film (2); NAMICS H9890-7 sinter glue (2); Intervia diluted with PGMEA 2:1 (2); tape (1); Tape (1); elastomeric sealant (1); high temperature adhesive (spin-coated or film-laminated) (1); not stated (1); warpage-tolerant sealant (1); EM-310J1-P (1); PW1500S (Toray), B-staged 200 C (1); PW1500S (Toray), B-staged (1); conventional thermoplastic resin (1); CYCLOTENE 3022-46 (DOW) (1); adhesive (not named) (1); adhesive tape (1); 3M Onefilm LTHC release film (1); bonding sheet resin film (Advanced Material Corporation) (1); adhesive (not specified) (1); wax (1); silver paste (1); Dymax OP-29 (1); non-conductive epoxy (1); edge bond (1); temporary adhesive (1); conductive epoxy (1); APTMS (3-aminopropyltrimethoxysilane) (1); BrewerBOND T1107 (1); BrewerBOND C1301-50 (1); InterVia/BCB (1); high E lid foot adhesive (1); low E lid foot adhesive (1); SMT 158M (1)
- organic_laminate 17: prepreg (6); Megtron 7N (4); low loss organic substrate (2); organic carrier (2); ETS (2); SR; ABF (2); organic build-up substrate (HDBU) (2); Prepreg R-1551S (2); organic substrate (1); E705G (1); high-modulus glass-reinforced epoxy (1); SR a (1); resin A: Panasonic R-G640(L) prepreg (1); material A: Panasonic R-G640(L) prepreg (1); material C: prepreg (1); Megtron (1); Panasonic Megtron 6 R5775(K) 0.750 17/17 (RTF) (6x2116) (1)
- other 47: magnetic metal composite (iron powder + epoxy binder) (4); HPE2 (4); Cu pads + dielectric (not named) (3); RDL, 5 metal + 5 dielectric layers (3); Cu-Cu + dielectric (2); conductive polymer (2); releasable temporary bonding layer (2); uC4 solder + underfill (equivalent properties) (2); AP9000C (liquid adhesion promoter, DuPont) (2); GaN (2); HPE1 (2); dielectric with embedded metal pads (materials not named) (2); Cu; TEOS oxide or SiCN; SiN/TEOS (2); HP19 grafting molecule (2); 8 layers CZT + 8 layers AlN, laminated, sputtered (2); silane reagent (2); formulated prototype passivation chemistry (MEC Co., Ltd) (1); Cu / extreme low-K (ELK) (1); Cu array in conventional dielectric (1); Cu array in C-Layer (1); high-k oxide between TiN electrodes (1); Developed product A (water-based treatment) (1); Si/glass (1); water (40 C inlet) (1); Cu OSP (1); RDL (1); Cu 70% / resin 30% (1); underfill + solder joints (equivalent properties) (1); DI water (1); electroplated Cu matrix with 20 um TiC-coated diamond particles (1); electroplated Cu with Cu-encapsulated TiC-coated diamond particles (1); Ge (selective epitaxy, RPCVD) (1); photoresist, positive tone liquid (1); laser-releasable tentative layer (1); TiN (1); black paint (1); carrier wafer, Ni or Cu plated (1); ZIF-8 MOF (1); vacuum; Cu-Sn-Cu (1); GaN / SiGe (1); Cu; inorganic dielectric; insulation layer (1); CNTs (water-based CNT solution, vacuum-assisted filling) (1); glass or silicon (1); micro-inductor (Cu track) (1); Silk Screen (1); OSP (1); InP (1)
- underfill 12: UF8410-302 (3); cured SACA-X organopolysiloxane binder (2); pre-applied NCP (2); EPO-TEK 301-2 (2); Namics U8443-14 (1); epoxy resin + silica filler + additives (1); epoxy (1); NCF (1); Laser NCF (epoxy-based non-conductive film) (1); solder uC4; NCP (1); NCP (1); epoxy-based polymer (1)
- tim 11: silicone matrix with liquid metal filler (2); TIM (2); Liquid-metal gel TIM (1); solder (1); TIM1 (1); adhesive-type PTIM (1); PTIM (1); TSMC POR (1); high-k TIM (1); Honeywell PTM7950 (1); Dow Corning TC-5888 (1)
- (none) 1: integrated BEOL (no porous ULK dielectric) (1)
