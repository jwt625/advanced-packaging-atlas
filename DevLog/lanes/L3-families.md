---
title: Lane L3 - D2 parameterized package-family generators and canonical case configs
date: 2026-10-20
status: wave-1 deliverables done (2026-10-20); open items below
scope: engine/src/families/, engine/tests/families*.test.mjs, sims/<family>/*.yaml (case configs), this file
owner: lane L3 (Claude subagent, DevLog-012)
---

# L3: family generators and case configs

Binding inputs: DevLog-012 (lanes, shared rules), sims/SPEC.md sections 1-2, DevLog-010 (D2 row, first canonical sims,
Decisions 2026-10-20), R5 (`DevLog/research/2026-10-20-sim-canonical-configs.md`), DevLog-008 provenance rules,
`config/package3d/TEMPLATE_FORMAT.md` and the templates (read-only), `app/static/data/package3d.json` (read-only input).

## Plan (2026-10-20 13:20 PDT, before implementation)

Design: the generator mirrors the package3d template semantics in JS so `/3d` and `/sim` share one geometry and one
provenance chain (A2). Defaults come from `package3d.json` (`families[].params`, injected as data); the structure
(stacking, repeats, fills, frames, layer groups, arrays) is transcribed from each template into a declarative JS
family spec, extended by sim knobs. The browser passes the JSON it fetched; Node uses a helper that reads the file.

1. `engine/src/families/expr.mjs`: tokenizer/parser/evaluator for the template expression grammar (`+ - * / **`,
   parentheses, `min max floor ceil`, numbers, identifiers); `rValues(formula, values)` recovers the `r0, r1, ...`
   cell values by aligning the JSON `formula` with its `values` string (the JSON `refs` list is de-duplicated, so it
   cannot be used positionally).
2. `params.mjs`: param graph from the JSON entries (`formula`, `inputs`, alias via single `inputs`, `conv`), family
   formula generalizations (e.g. SoC array nx), family extension params (new knobs), user overrides (value, `=expr`,
   or `{value, status, ref|note}`); topological evaluation; status rule: dominance user > template > public >
   derived > reported, a derived formula over reported inputs is `derived` (DevLog-008: status never upgrades).
   Every default formula re-evaluated against its JSON value (mismatch = warning).
3. `resolve.mjs`: shared structure resolver (parts: base/on/in/under/fill, standoff, gap, depth, repeat or explicit
   centers, frame, `when`; layers: groups stacked down from the host top; arrays: per/lower, upper/lower, in,
   in_layer, under, region part/intersect/subtract) with the builder's ordering, ids and 4-decimal rounding; z shifted
   so the lowest point is 0. Per-dim provenance for x, y, z, w, d, h of every part.
4. `homog.mjs`: array area fraction `pi d^2 / (4 p^2)` (filled) or Cu annulus (plugged PTH), matrix = material of the
   solid the array sits in, key `homog:<kind>:<inclusion>+<matrix>:<fraction>`; routed conductor layers
   `homog:layer_<use>:<metal>+<matrix>:<fill>`. Flattened `boxes` list (parts, layer boxes, homogenized array boxes)
   with explicit priorities.
5. `rules.mjs`: constraints (positive dims, integer counts, reticle area vs `reticle_x * 830 mm2`, logic die <= one
   scanner field, die array fits interposer, no top-die overlap, HBM along logic-die edges, bridge under both dies,
   bridge count rule `n_lsi = n_hbm + n_soc` (R5 fit, default) vs edge rule, array region inside its die footprint,
   pitch > diameter, interposer inside substrate, stiffener/lid clear of the interposer). Errors throw
   `GeneratorError` (code + message list); `check()` returns all issues without throwing.
6. `symmetry.mjs`: mirror test of the box list in x and y; allowed `geometry.symmetry` values for the grid lane.
7. Families: cowos_l, cowos_s, emib_t first; then fcbga_organic and cowos_r (needed by the peer and thermal cases).
   Knobs: die size/count/array (nx, ny), HBM count and generation (footprint, height; HBM4 720 um default, 775 um
   alternative), bridge count/size, interposer size / reticle multiple, substrate size, core and build-up thickness,
   lid vs ring vs none, TIM, bump array region/pitch per array.
8. `presets.mjs`: MI300X / MI355X / MI455X class, values only from the AMD white papers (R5 2.2; re-verify by fetch).
9. Cases `sims/<family>/<case>.yaml` (SPEC section 1): cowos_l/warpage_rt_ht, cowos_s/warpage_corner_stress,
   emib_t/bridge_stress, si_interposer_peers/{xilinx_tsv_lid, 120mm_warpage, 50mm_quarter},
   fcbga_organic/substrate_warpage, cowos_r/thermal_rjc. Every geometry value from DB rows (`uv run python`, read-only)
   or cached text with locator; `missing` and `assumptions` lists; targets by metric_id with tier and JEITA definition.
   Supports: rigid_motion or symmetry, never both.
10. Tests `engine/tests/families*.test.mjs`: provenance for every box dim, determinism, constraint negatives, default
    reproduction of package3d.json part boxes (1e-9 after the builder rounding), HBM 4/8/12 part counts.

## Decisions (lane-local)

- Generator output keeps package3d ids, names and rounding (4 decimals, as `scripts/build_package3d.py` `rnd`).
  Sim-only via fields (TIV, TSV, PTH) are cut from rounded edges so shared faces coincide (L1 note, 2026-10-20).
- Output adds `boxes` (parts + layer boxes + homogenized array boxes, explicit `priority`) and `symmetry`.
- Priorities: parts 10 x containment depth (+4 for underfill-kind parts), layers 10 x depth(host) + 2, arrays
  10 x depth(host) + 6 (6 for arrays between parts). `host` = containment without top alignment (dies sit on their
  bumps; identical z to the template while SoC and HBM heights are equal).
- Homog keys: arrays `homog:<kind>:<inclusion>+<matrix>:<f>` (kind tmv emitted as L2's via_field); routed levels
  `homog:rdl_layer:<metal>+<matrix>:<fill>`. Constituents are template material keys; matrix = material of the
  highest-priority solid containing the array box center (`void` if none). Inclusion: Cu for Cu-pillar joints and
  vias, solder for BGA; per-array override where a param exists (cowos_s `c4_inclusion`).
- Area-fraction status follows its inputs (DevLog-008 "status never upgrades"), so a fraction from a template pitch
  is `template` although it is computed.
- Bridge count: `lsi_target_n` = n_hbm + n_soc (R5 fit, status derived, default rule `r5_fit`); the layout draws one
  bridge per die-to-die edge; the difference is an info issue (bridges without reported placement are not drawn).
- Errors throw `GeneratorError` with `issues`; `check()` returns issues; warnings carry `{code, level, message}`.
- Bounds (`min`, `max`, `integer`, `bounds_basis`) only where R5 tables, DB rows or a layout rule give them
  (`engine/src/families/bounds.mjs`); out of range = warn (error for layout-rule counts).
- Case files use only keys the L1 parser accepts today; study-level variants are kept as YAML comments.
- Presets: AMD white-paper facts recorded by R5 (2026-10-20); lane re-fetch timed out 3x (PDFs), recorded in
  presets.mjs. No B300 / B200 / Rubin preset.

## TODO

- [x] expr, params, resolve, homog (boxes.mjs), rules, symmetry
- [x] cowos_l, cowos_s, emib_t specs; fcbga_organic, cowos_r specs
- [x] presets (re-verification attempted; timeouts recorded)
- [x] DB reads for the 8 cases; case YAML (9 files: FCBGA bare stage split out)
- [x] tests green (families.test.mjs 24, families_cases.test.mjs 10)
- [x] self-check: every `reported` case ref resolved against data/*.csv (scratch script; derived sums and text cells
      listed, no missing cell)
- [ ] fresh-context audit (coordinator)
- [ ] study-level params / ratio targets once SPEC allows them (variants commented in the cases)
- [ ] dummy-Si and SC-RDL knobs for the 6x CoWoS-L TVs (ectc51909.2023.00091)

## Contract change requests (additive)

1. generate() output: `boxes` (flattened, prioritized grid input), `symmetry` {mirror_x, mirror_y, allowed},
   per-part `priority` and `dims` for x_mm / y_mm / z_um; warnings as {code, level, message}.
2. Params entries may carry `min`, `max`, `integer`, `bounds_basis`, `options`, `alternatives`, `generalized`.
3. Case `studies[]`: `params` (variant overrides), `stress_free_C`, `geometry.drop_kinds` (per study).
4. Case `targets[]`: `study`, `reference_study` (ratio targets), `definition` values `ratio_to_reference`,
   `max_over_part`, `tj_max_minus_tc_over_p`; tolerance forms `{rel}`, `{abs_C}`, `{sign_only: true}`; quantities
   `stress_norm`, `von_mises_max_MPa`, `Rjc_C_W`, `Tmax_C`; selections `part:<glob>`, `corner:<part>`.
5. Numbers given as `{value, status, ref|note}` inside `physics` (e.g. stress_free_C.default): engine should accept.
6. materials.overrides property shape (`E_GPa`, `cte_ppmK` with value or alpha1 / alpha2 / Tg_C, `k_W_mK` with value
   or expr) needs an L2 decision.
7. L1 / L2: homog key constituents are template keys (copper, underfill, ...); `libraryAdapter` currently skips homog
   keys, so `homog:rdl_layer:copper+...` fails with "unknown material key copper". Alias constituents through the case
   map / aliasTemplateKey (L1) or inside homogenize (L2).


## Progress log

- 2026-10-20 13:20 PDT: inputs read; plan written.
- 2026-10-20 13:39 PDT: expr, params, resolve, boxes, rules, common, index, node written; cowos_l, cowos_s, emib_t,
  fcbga_organic, cowos_r specs written. All five reproduce every package3d.json part, layer and array box (x, y, z,
  w, d, h within 1e-9 after 4-decimal rounding; scratch comparison script). DB rows and cached text read for the 8
  cases (Xilinx 2011, 120 mm 2024, 50 mm 2023, FCBGA 00178, CoWoS-R 00085, CoWoS-L 00091, CoWoS-S 00135, EMIB-T 00051).
- 2026-10-20 13:50 PDT: presets (AMD PDFs timed out on re-fetch), tests, knobs from the cases (cowos_s scope module,
  top_encap, ring_wy_mm, ring_part_mat, per-HBM bump pitch, c4_inclusion; cowos_l HBM column tied to the SoC block).
- 2026-10-20 13:58 PDT: coordinator note handled: sourced bounds; thermal studies in every case; sim-only field edges
  rounded; case ids as L4 expects. Cases validated by the L1 parser; total-power semantics of `power_W` adopted.
  CLI run of fcbga_organic/substrate_warpage s1 stops at L1/L2 homog constituent aliasing (request 7).

## Wave 2 (coordinator assignment 2026-10-20)

Scope: (1) CoWoS-L knobs for the 00091-a TV: dummy Si dies (count, size, placement rule) and a substrate-sized
SC-RDL / side-mold option, values from the paper with locators, `missing` otherwise; (2) M2 category generators for
info_os, hbm_stack, soic, glass_core_substrate, fan_out_panel, cpo_module, ucla_si_if (all 7 exist in
package3d.json), each reproducing its package3d.json defaults, main knobs, one canonical case each with a
thermal_stationary study and DB targets where supported; (3) modules importable at all times.

### Plan (2026-10-20 14:00 PDT)

1. Transcription tool `engine/src/families/tools/transcribe.mjs` (Node only, run by hand, read-only on
   config/package3d): parse a template YAML (YAML 1.2, so `on:` stays a key), expand `use:` modules with the
   builder's merge / drop / rename rules, convert parts / layers / arrays to the resolver spec format, resolve inline
   dimension specs (`{template|analog|ref|derived}`) to `{value, status, note, ref|refs}` from the matching
   package3d.json dims, and write `engine/src/families/specs/<id>.mjs` (plain `export default` object, so the
   browser build needs no JSON import). Routing, callouts and insets are not transcribed. Header records the source
   template and the package3d.json `generated` date; re-run when the templates change.
2. Resolver extensions (builder semantics): vertical repeats (`nz` with `stack: true` or `pitch_um`), `fill.per`,
   arrays per stacked part (level k on level k - 1), `in` arrays / layers on stacked hosts (one entry per level),
   `span` arrays with `top:` / `bottom:` anchors, explicit expression regions, array `repeat.nz`.
3. Family modules (thin): import the transcribed spec, add knobs as params / structure edits (die count and size,
   stack count and height, panel or wafer size, core thickness), layout facts for the rules.
4. CoWoS-L: `dummy_n`, `dummy_w_mm`, `dummy_d_mm`, `dummy_rule` (template placement around the die block) and
   `sc_rdl` (none | substrate: SC-RDL and side mold to the substrate edge), with 00091-a cells; unknown sizes stay
   template with rationale.
5. Cases: info_os/theta_jc_tim, hbm_stack/stack_thermal, soic/thermal_stack, glass_core/warpage_vs_organic,
   fan_out_panel/panel_warpage, cpo_module/thermal, ucla_si_if/warpage (DB rows read first; gaps reported).
6. Tests: the default-reproduction, provenance, determinism tests cover the new families through listFamilies();
   new knob tests; case tests unchanged.

### Wave 2 progress

- 2026-10-20 14:08 PDT: resolver extended (vertical repeats, fill.per, stacked-host layers and arrays, spans,
  expression regions, array nz); transcriber written; 7 specs generated; all 7 families reproduce package3d.json
  (parts, layers, arrays) on the first run. Existing 5 families unchanged (tests green).
- 2026-10-20 14:12 PDT: L2 refusals: `other` parts / layers get sim library keys with basis (lid_mat cu_lid, al_mat al,
  mim_mat / beol_diel_mat / bond_tier_mat / gap_fill_mat sio2_film, adhesive_mat epoxy_generic, ring / hs cu_lid);
  the part keeps the template key, boxes carry the sim key (`material_template` recorded). fcbga_organic adhesive
  (silicone) has no library entry: stays `other` (case must map; reported).
- 2026-10-20 14:15 PDT: cowos_l 00091-a knobs (dummy_n / size / rows_y rule, sc_rdl substrate); flagship case
  rewritten (8 dummies, 2 SoC side by side, 1.6x interposer by fit_dies, SC-RDL and side mold 91 x 91 mm).
  Case overrides moved to the L2 applyOverrides shape and library keys; commented study variants restored
  (L1 now accepts study params / geometry / stress_free_C).
- 2026-10-20 14:19 PDT: 7 M2 cases written and validated by the L1 parser; CLI end-to-end thermal runs:
  info_os/theta_jc_tim s1 (theta_jc quantity not yet evaluated by L1), fcbga_organic/substrate_warpage s1,
  cowos_r/thermal_rjc s1 (Rjc 0.0079 C/W vs 0.0108 measured, vs 0.00759 for the paper's zero-contact-resistance
  model; mesh max_xy_mm raised to 1.0 for the 300k-node budget). Tests 64/64 families, 17/17 cases.

### Wave 2 gaps (reported, not invented)

- No DB target fits hbm_stack, soic, cpo_module or ucla_si_if canonical cases (reasons in each case's assumptions).
- Glass CTEs of the 00178-d/-e/-f glasses are not given: only the low-CTE case, sign-only targets.
- fan_out_panel: strip model (11 x 3 units assumed); absolute molded-strip warpage needs E4 + E8 (elastic EMC bias).
- cowos_l/warpage_rt_ht s3 (240 C) blocked by the unsourced high-temperature film-TIM CTE (L2 tim_polymer, 150 C cap).

## Wave 3 (coordinator, audit A1 fixes, 2026-10-20)

### Plan (2026-10-20 14:25 PDT)

1. B1: run every case `node cli.mjs <case> --study s1` (nice, one at a time); fix selections that name parts without
   cells (name the outermost layer box until L1's fix lands), node budgets (coarser max_xy_mm, symmetry crops, or a
   stated max_nodes raise <= 1e6), cooling BCs (die tops plus mold top, sourced or template values), glass k
   (template analog override until L2 adds it); record a run table.
2. S3: routed levels emit the direction: `homog:rdl_layer:<metal>+<matrix>:<fill>:<axis>`, axis = route dir (x | y)
   for signal / mixed levels, xy for planes and pads (L2 homogenize already accepts x | y | xy).
3. M5 Xilinx core z CTE (per-axis override request to L2 / coordinator if the shape cannot carry it), M8 HBM 720 um
   locator and status, M4 rules (touching bumps, HBM-edge reach independent of the die gap, de-duplicated issues).
4. S4: `engine/src/runner/sensitivity.mjs` (browser-safe): template-basis properties used by a case (L2
   listTemplateValues + resolve provenance), nominal + per-bound runs through L1 runCase, spread of every target
   quantity; tests `engine/tests/runner*.test.mjs`; CLI flag request `--sensitivity` to L1.

### Wave 3 progress (2026-10-20 14:35 PDT)

- B1: every package case runs `node cli.mjs <case> --study s1` (16 cases, all pass the run; table in the final report
  to the coordinator). Fixes: selections / sources name the outermost layer box where a part owns no cells; max_nodes
  1e6 with reasons (cowos_l 5.2e5, emib_t 5.1e5, 120 mm 6.2e5 nodes); fan_out_panel underfill dropped + grading 2.0
  (3.7e6 -> 2.6e5 nodes, assumption stated); cooling on die tops + mold top (cowos_s, 120 mm); 50 mm mold top only
  (EMC covers the dies by 1 um); sus430 k template analog (ss304 at 20 C); glass k now from L2.
- S3: routed levels emit `homog:rdl_layer:<metal>+<matrix>:<fill>:<axis>`, axis x | y for signal / mixed lines,
  plane for planes and pads (L2 vocabulary x | y | xy | plane).
- M4: bump d/p warning above the DB maximum 0.8125; HBM reach a fixed family param (hbm_reach_mm); duplicate issues
  merged. M5: Xilinx core z CTE 16 recorded as missing (per-axis override requested from L2). M8: 720 um locator and
  note now say it is a general HBM-direction statement. M7: license lines added to L3 files.
- emib_t synced with the edited template (new br_bpad layer, core_cu_t routed mixed): the reproduction test caught the
  drift; hand-written specs (cowos_l, cowos_s, emib_t, fcbga_organic, cowos_r) can drift again when another session
  edits their templates (the transcribed families can be regenerated).
- S4: `engine/src/runner/sensitivity.mjs` (browser-safe) + `node.mjs` wrapper; tests `runner.test.mjs` (4).
  Example: fcbga bare substrate Tmax 42.03 C, range 41.28 .. 43.52 C over abf_gl / polyimide_rdl / core_lowcte k
  x0.5 / x2; cowos_r Rjc spread 0.1 % (template-k materials are off the main heat path).
- Tests: 70 pass (families.test.mjs, families_cases.test.mjs, runner.test.mjs).

## Wave 4 (coordinator, 2026-10-20)

### Plan

1. Move cowos_l, cowos_s, emib_t, fcbga_organic, cowos_r to transcribed specs (tools/transcribe.mjs) plus edit
   functions that re-apply every knob by element id (soc / die arrays, host-on-bumps placement, HBM generation,
   lid / ring / none, SC-RDL, dummy Si, scope module, top_encap, region-size params, sim-only via fields, sim material
   params); edits throw when an id they patch disappears from the template. Keep all reproduction and knob tests.
2. Q1 overshoot: mesh max_z_mm / min_cells_per_layer in cowos_l and info_os until the maximum-principle warning is gone,
   within the node budget; record the choice.
3. TIM contact resistance: labelled `calibration` variant studies for cowos_r and info_os with the value derived from
   each paper's own numbers (formula + locator); report nominal and calibrated results.
4. Mesh convergence on cowos_r s1 (max_xy 1.0 / 0.7 / 0.5 mm, z refinement): Rjc and Tmax.
5. Re-run every case s1 (and the thermal variants); run table.

### Wave 4 progress (2026-10-20 15:00 PDT)

- All 12 families now build from transcribed specs (specs/*.mjs) plus edit functions; the 5 former hand specs keep
  every knob (edits by element id, throwing when the template drops an id). New test: transcribed specs equal a fresh
  transcription of config/package3d (drift alarm; it fired once for glass_core_substrate param renames upstream,
  re-transcribed). Tests 73/73 (families, cases, runner).
- Q1 overshoot: cowos_l and info_os mesh.max_z_mm 0.2 (warning gone; 6.0e5 / 2.9e5 nodes; theta-JC unchanged to
  4 digits).
- Calibration cases (separate files, contact resistance is a case-level BC): cowos_r/thermal_rjc_calibrated
  (TIM1 / lid contact 4.30e-6 m2K/W = (0.01082 - 0.00759) C/W x 4 x 332.8 mm2 from the paper's Fig. 9 model
  points; a first try on the full TIM1 area doubled the step: heat crosses over the SoC footprint) and
  info_os/theta_jc_tim_calibrated (effective TIM k 3.32 W/mK from the measured BLT slope; a constant contact
  resistance cannot explain the BLT-proportional deficit; best-fit added contact resistance is zero).
- cowos_r mesh convergence (s1): max_xy 1.0 / 0.7 / 0.5 mm, max_z 0.2 / 0.1 mm, 2 cells per layer: Rjc 0.0079125 -
  0.0079134 C/W (0.012 %), Tmax 99.365 - 99.366 C; 1.6e5 to 6.1e5 nodes.
- L8 items: element q1im in all cases; Xilinx lid attach adhesive knob (lid_attach, lid_adh_h_um, lid_adh_mat) with
  the paper's single stress-free 150 C; TIM1 E 5.8 MPa (Table 2) and a user CTE 100 ppm/K (L2 refuses template CTE);
  core CTE [11, 11, 16]. Rerun: lidded -52.8 um (paper +162.56, sign still opposite: open model-form issue), no-lid
  +337.9 um (paper +335.28), die von Mises 126 MPa (paper 115).
- Mechanics dry check (grid + material resolution at each study temperature): all studies resolve except the ones
  now marked BLOCKED in the cases: cowos_l s3 (tim_polymer above 150 C), cowos_s s2h (abf_gl above 240 C), fcbga /
  glass 260-265 C studies (abf_gl 240 C, underfill_cuf / polyimide_rdl 260 C), 120 mm s2 (sus430 elastic N/A).
  emib_t high temperature lowered to 240 C (template). HT studies split from the 25 C ones so those run.

## Wave 5 (coordinator, 2026-10-20)

Plan: (1) drop the `user` TIM CTE overrides (Xilinx, cowos_l) for the L2 CD5 template; (2) unblock 120 mm s2 (sus430
E now in the library); (3) `materials.allow_extrapolation` only where a target needs it, reason per case; (4) run
every mechanics study end to end (CLI dispatch) one at a time under nice, run table; (5) CD1 / CD5 sensitivity of
warpage for the grade-A cases (runSensitivity with the mechanics runner). No tuning toward targets.

### Wave 5 progress

- 2026-10-20 15:09 PDT: Xilinx and cowos_l `user` TIM CTE overrides removed (library CD5 template 149 ppm/K);
  120 mm s2 unblocked (sus430 E 200 GPa); `materials.allow_extrapolation` (case level, the mechanics runner reads
  only that level) set with reasons in cowos_l [tim_polymer], cowos_s [abf_gl], fcbga [abf_gl, underfill_cuf,
  polyimide_rdl], fcbga bare [abf_gl, polyimide_rdl], glass [abf_gl, underfill_cuf, polyimide_rdl]; BLOCKED markers
  replaced. Sensitivity runner: CTE bounds (CD5, x1/3 / x3) with status user (L2 takes template only for nu / k).
- Template drift handling: templates edited at 15:04-15:05 by another session are ahead of package3d.json (14:38).
  The transcriber now skips a template newer than the JSON (unless --force) and the drift test ignores such
  in-flight templates. ucla_si_if spec restored to the JSON-consistent structure (reproduction test passes); re-run the
  transcriber after the JSON rebuild.
- Mechanics batch (24 studies, one at a time, nice) started in the background; log in the scratchpad.
- 2026-10-20 15:40 PDT, audit A2 items:
  - S1: runner/node.mjs routes uniform-temperature thermo_elastic studies through L8 `runMechCase` (physics
    `thermo_elastic`: nu and CTE rows; k does not enter), mixed or `temperature.from` selections through L1
    `runCaseAll` (physics `coupled`: nu, k, CTE); thermal studies unchanged. `physicsOf(c, study)` picks it. Physics
    `mechanics` (nu, k) is kept for the CLI path, which adds its own CTE bounds (cli.mjs addCteBounds); listing cte
    there too would run the CTE bounds twice.
  - S2: boundsOf supports `{minus, plus}` (silicone nu -0.05 / +0.19), clips nu to [0, 0.499] with a warning, and
    every bound run is wrapped in try/catch (failure -> `unsupported` entry, report continues); study errors returned
    by runCaseAll are carried as warnings.
  - M8: CTE bound overrides take `boundStatus`; node.mjs uses `sensitivity` when L2's OVERRIDE_STATUSES lists it,
    else `user` with a report warning (L2 does not accept `sensitivity` yet: request). Target keys of the spread now
    include `@ T C`.
  - M6: cowos_r/thermal_rjc_calibrated assumption text now states the contact resistance is modelled (fitted, on the
    SoC footprint) and its 0.0032 C/W cross-check against the paper's 29.6 % share.
  - Tests: runner.test.mjs + asymmetric bounds / nu clip, failing-bound isolation and boundStatus, physicsOf and a
    coarse real mechanics route (fcbga s2).
- 2026-10-20 15:45 PDT, batch findings and case fixes (no tuning):
  - L1 bug (report): runCaseAll pre-wraps `resolve` for `materials.allow_extrapolation` and deletes the key before
    calling runMechCase, so the CTE rebase (rebaseSecantCte) never sees it: every s2h / s3h above a range end fails
    ("CTE rebase ... outside valid_T_C"). runMechCase itself passes allowExtrapolation to the rebase; those studies are
    rerun through runMechCase directly (scratch script) until L1 fixes the dispatch.
  - cowos_s stress_norm targets: `ip_si@interposer_1` owns no cells (the TSV field box `tsv_a`, homog Cu 0.0035 in
    Si, owns the interposer Si; `tsv_b` is in the cropped half): selection -> `corner:tsv_*`. Ratio targets need the
    reference study in the same run (s2 / s6), so per-study CLI runs cannot evaluate them.
  - fan_out_panel -a-m9 is 0.7 mm in the DB; the runner does not convert DB units: target now states value 700 um.
  - Xilinx 0.04 um z sliver (lid adhesive top 1734.00 vs BEOL face 1733.96, independent template dimensions, not a
    rounding error): mesh.snap_z_um 0.05 (max aspect 12500 -> 2000, node count unchanged; 0.5 gives the same grid).
  - cowos_l browser memory (coordinator): already quarter (generator symmetry mirror_x and mirror_y); mesh
    min_cells_per_layer 2 -> 1 (warpage-only targets; L8 q1im gate <= 5e-4 at 1 cell per layer): 6.006e5 nodes /
    1.80e6 DOF -> 3.604e5 / 1.08e6 DOF; max_z_mm 0.2 kept for the thermal study.
  - New model-form variant si_interposer_peers/50mm_quarter_e2 (EMC / CUF above-Tg moduli E2 over the 150 -> 260 C
    path; labelled, not fitted).
- 2026-10-20 16:20-17:45 PDT, coordinator items (L8 wave 2, L9 root-cause report):
  - Solder resist: every SR layer (element name "Solder resist ...", template material polymer_dielectric) now uses
    the sim param `sr_mat` = library `solder_resist` (generic.mjs `mapSolderResist`, templateFamily auto; cowos_l,
    cowos_s, cowos_r, emib_t, fcbga_organic via build). fan_out_panel dl3b ("solder mask", a PID level) not mapped.
    Effect: Xilinx and 120 mm `solder_resist` overrides now reach sbt_sr_t / sbt_sr_b (were silent no-ops).
    solder_resist data end at 225 C: allow_extrapolation extended (cowos_l, cowos_s, fcbga x2, glass, emib_t, 120 mm);
    the first high-T runs also exposed core_lowcte and glass_en_a1 ending at 260 C (265 C studies): added with reasons.
  - C4 underfill: param `c4_uf_mat` on uf2 (cowos_s), c4uf (cowos_l), osuf (cowos_r); default underfill_cuf because
    the library has no distinct C4 underfill entry (request to L2: e.g. `underfill_c4` inheriting underfill_cuf).
    Until then Xilinx Table 2 C4 UF (8.5 GPa, 31.5 ppm/K) cannot be applied separately (stated in the case).
  - Specs re-transcribed after the package3d.json rebuild (15:36); reproduction and drift tests pass (70 / 70).
  - 50 mm: -d-m1 (260 C) moved to 50mm_quarter_e2 (E1 over a path above Tg is invalid); base keeps no target.
  - cowos_l: uBGA (C4) field over the full 91 x 91 mm SC-RDL (c4_region = sbt, template; Cu 0.0177 at 75 um / 500 um).
  - Variants runner (engine/src/runner/variants.mjs, node.mjs --variants): labelled knobs (params, overrides, map, mesh,
    stress_free_C), one runMechCase call per temperature, optional `common` coarse mesh for spreads.
  - InFO S3: k_eff 3.32 relabelled a fitted calibration parameter; Table 5 check recorded in the case (one k_eff does
    not fit: +55 / 0 / -30 / -35 % for TIM A-D).
  - Not drafted: ectc51529.2024.00322 process_sequence (12-inch reconstituted wafer, 7 measured steps -d-m2..m15).
    Missing: EMC-B thickness before / after grinding, glass carrier thickness and E, bond / debond temperatures and
    adhesive, PMC temperature and time, passivation material / thickness / cure, sputter film stack, EMC above-Tg E and
    CTE, DAF properties; and no wafer-level reconstituted generator family (closest: fan_out_panel).
  - Not done: thin-layer merge (`thin`) is a runMechCase dep only (no case key in the L1 parser: request
    mesh.thin or physics.mechanics.thin); RVE-vs-ROM column; grade-A CD1 / CD5 sensitivity runs (queued behind 120 mm).

### Wave 5 mechanics run table (2026-10-20; signed JEITA warpage, um)

Before = CLI batch 15:20-16:30 (pre SR mapping, pre fixes; L9 / L1 values where noted). After = runMechCase per
temperature (runner/node.mjs --variants), 16:40-17:31, after the SR mapping, re-transcription and case fixes.

| Case / study | T C | Target (tier) | Before | After | DOF after | Status after |
|---|---|---|---|---|---|---|
| fcbga bare s2 c-m1 | 25 | +122 sign (C) | -7.60 | -5.80 | 9.4e4 | sign miss (symmetric stack, L9) |
| fcbga bare s2 b-m4 | 30 | +166 | -7.33 | -5.59 | 9.4e4 | sign miss |
| fcbga bare s2h b-m5 | 260 | -68 | failed (L1 rebase) | +1.15 | 9.4e4 | sign miss |
| fcbga bare s2h c-m2 | 265 | -47 sign (C) | failed | +1.22 | 9.4e4 | sign miss |
| fcbga s2 c-m3 | 25 | +439 sign (C) | +236.2 | +242.6 | 1.3e5 | sign pass |
| fcbga s2h c-m4 | 265 | -292 sign (C) | failed | -194.4 | 1.3e5 | sign pass |
| glass s2 d-m3 | 25 | +160 sign (C) | +66.6 | +64.6 | 1.4e5 | sign pass |
| glass s2h d-m4 | 265 | -75 sign (C) | failed | -48.5 | 1.4e5 | sign pass |
| glass s3 d-m1 | 25 | +97 sign (C) | -4.52 | -4.97 | 9.4e4 | sign miss |
| glass s3h d-m2 | 265 | -31 sign (C) | failed | +2.10 | 9.4e4 | sign miss |
| Xilinx s2 b-m3 (lid) | 25 | +162.56 rel 0.3 (C) | -52.6 | -50.8 | 5.1e5 | miss (W shape, L9) |
| Xilinx s2 b-m4 von Mises | 25 | 115 MPa (C) | 126.3 [bimaterial_edge] | 129.6 [bimaterial_edge] (soc_2) | 5.1e5 | indeterminate (singular) |
| Xilinx s3 b-m2 (no lid) | 25 | +335.28 rel 0.3 (C) | +337.9 | +341.5 (+1.9 %) | 4.3e5 | pass |
| 50 mm E1 s2 d-m1 | 260 | -189 rel 0.5 (C) | +851.9 | target moved to e2 | - | - |
| 50 mm E2 s2 d-m1 | 260 | -189 rel 0.5 (C) | (L9 +100.1) | +100.1 | 2.4e5 | miss (sign; cure shrinkage not modelled) |
| cowos_l s2 a-m1 | 25 | +64 rel 0.5 (D) | -257 (L9, 1.80e6 DOF) | -250.7 | 1.08e6 | miss (sign) |
| cowos_l s3 a-m2 | 240 | -148 rel 0.5 (D) | +208 (L9) | +187.6 | 1.08e6 | miss (sign) |
| 120 mm s2 a-m16 (coarse) | 30 | +485 rel 0.3 (D) | timeout (L1) | +458.2 | 4.6e5 | pass (-5.5 %) |
| 120 mm s2 a-m17 (coarse) | 148 | +135 (D) | timeout | +459.1 | 4.6e5 | miss |
| 120 mm s2 a-m18 (coarse) | 222 | +65 (D) | timeout | +503.2 | 4.6e5 | miss |
| 120 mm s2 a-m19 / a-m23 | 243 / 260 | -85 / +247 | timeout | failed (solder_resist range; fixed, rerun queued) | - | pending |
| fan_out_panel s2 a-m9 | 25 | 700 (was compared to 0.7) | +12633 | not rerun | 7.7e5 | miss 18x (free strip vs on carrier, L9) |
| cowos_s s2 a-m1 | 25 | -198 rel 0.5 (D) | -339.5 | not rerun | 6.1e5 | miss (+71 %) |
| cowos_s s3-s7 stress_norm | 25 | ratios (C) | not evaluable (selection owned no cells; per-study runs) | selection fixed (tsv_*), not rerun | 6.1e5 | pending (55 min) |
| emib_t s2 | 25 / 240 | (no warpage target) | timeout 1800 s | not rerun | - | pending |
| ucla s2 | 25 | none | if_m2 107.8 MPa | - | 3.2e4 | no target |

cowos_l spreads (coarse spread mesh max_xy 2.5 mm, 2.3e5 DOF; coarse base -250.6 / +187.9 matches the case mesh):

| Variant (label) | 25 C | 240 C | 240 / 25 ratio |
|---|---|---|---|
| base (Tsf 150, TIM E 5.8 MPa, Cu lid) | -250.6 | +187.9 | -0.75 |
| tsf90 (Tsf 90 C, L9 ratio-implied bound) | -128.0 | +350.1 | -2.73 |
| tim_E_x0.1 (0.58 MPa, assumption bound) | +158.2 | +42.6 | +0.27 |
| tim_E_x10 (58 MPa, assumption bound) | -603.3 | +299.5 | -0.50 |
| lid_adhesive | -250.6 | +187.9 | inert: the cowos_l lid has no foot (plate on a full-area TIM) |
| lid_al (Al lid, lid material not reported) | -612.3 | +488.4 | -0.80 |
| measured a-m1 / a-m2 | +64 | -148 | -2.31 |

- 2026-10-20 17:50-18:30 PDT, L2 wave 8 / L10 notes:
  - Bound runs use status `sensitivity` for nu, k and CTE (L2 OVERRIDE_STATUSES lists it; node.mjs BOUND_STATUS).
  - c4_uf_mat: underfill_c4 set where the paper lists the C4 underfill separately: Xilinx (Table 2 C4 UF 8.5 GPa,
    32 ppm/K as overrides on underfill_c4, -a-L10) and 120 mm (library underfill_c4 = Table IV Bottom CUF).
  - runner/node.mjs: thermo_elastic sensitivity and variants now go through runCaseAll (L10: SPEC 17 features,
    allow_extrapolation incl. the CTE rebase, study-level overrides, mesh.thin, unit conversion). Check: 50 mm E2 260 C
    +100.1358 um and fcbga s2h -194.397 um, identical to the direct runMechCase values.
  - fan_out a-m9 back to a plain DB reference (0.7 mm -> 700 um by the runner).
  - InFO theta_jc_tim: Table 5 TIM A / C / D as studies s3 / s4 / s5 with study-level TIM k (TIM B = s1); targets
    -a-m5..m12. CLI 2026-10-20: 0.0349 / 0.0227 / 0.0120 / 0.0114 C/W vs measured 0.036 / 0.034 / 0.021 / 0.021.
  - 120 mm (coarse spread mesh max_xy 2.5, grading 2, 1 cell per layer, 2.4e5 DOF; SR, C4 UF and allow_extrapolation
    applied): base 458.0 / 459.1 / 509.4 / 529.4 / 546.2 um at 30 / 148 / 222 / 243 / 260 C vs measured +485 / +135 /
    +65 / -85 and FEM +247 (260 C); tsf231 variant 1174 / 1156 / 1165 / 1181 / 1195. Near-constant warpage: the
    stiffener stress-free offset dominates (ring 130 C rigidly bonded, compliant glue omitted). Diagnostic ring at
    170 C (= package): -155.1 / -23.4 / +53.3 / +74.9 / +92.3, i.e. a linear package term with the sign opposite to
    the measured trend at both ends. Case-mesh run (1.87e6 DOF) not done.
  - Xilinx with underfill_c4: lidded -50.8 um (miss), von Mises 131.1 MPa [bimaterial_edge] (soc_1), no lid
    +341.2 um vs +335.28 (+1.8 %, pass).
- 2026-10-20 18:30-18:55 PDT, RVE vs ROM (L2 18:08 library change: homog keys default to the RVE resolver, CD7;
  runner flag `--homog rom | rve`), grade-A cases, same code state for both columns:

  | Case / target | T C | Target | ROM | RVE | RVE / ROM |
  |---|---|---|---|---|---|
  | Xilinx lid b-m3 | 25 | +162.56 | -51.60 | -107.06 | 2.07 |
  | Xilinx von Mises b-m4 | 25 | 115 MPa | 127.35 [bimaterial_edge] | 133.13 [bimaterial_edge] | 1.05 |
  | Xilinx no lid b-m2 | 25 | +335.28 | +340.64 (+1.6 %) | +226.72 (-32.4 %) | 0.67 |
  | 50 mm E2 d-m1 | 260 | -189 | +132.90 | +219.96 | 1.66 |
  | 120 mm a-m16 (coarse) | 30 | +485 | +438.6 | +638.3 | 1.46 |
  | 120 mm a-m17 | 148 | +135 | +458.9 | +514.9 | 1.12 |
  | 120 mm a-m18 | 222 | +65 | +519.0 | +402.4 | 0.78 |
  | 120 mm a-m19 | 243 | -85 | +541.3 | +467.4 | 0.86 |
  | 120 mm a-m23 | 260 | +247 (FEM) | +560.0 | +469.9 | 0.84 |

  - The `rom` path after 18:08 is not identical to the earlier runMechCase ROM either: 50 mm E2 +100.14 -> +132.90,
    Xilinx lid -50.77 -> -51.60, 120 mm 30 C +458.0 -> +438.6 (same case files). Reported to the coordinator (L2 / L8);
    not investigated here. L8's "Xilinx no-lid +0.34 %" does not reproduce (-33 % here).
  - CD1 / CD5 sensitivity (runner, status sensitivity): 50 mm E2 (ROM, before 18:08): emc nu +-0.05 -> 81.9 .. 120.7
    um (-18 / +21 %); Xilinx no lid (ROM): core_lowcte nu -> -1.2 / +1.1 %; Xilinx lid (RVE, after 18:08): nominal
    -107.06, 4 rows (core_lowcte nu, tim_polymer nu, tim_polymer CTE x1/3..x3, silicone_adhesive nu -0.05 / +0.19)
    -> -107.8 .. -103.9 um (+0.7 / -3.0 %); von Mises 130.0 .. 134.9 MPa. 120 mm sensitivity not run.
- 2026-10-20 19:00 PDT, RVE default finding (report to L2 / L8): with the CD7 RVE resolver (precomputed table) a
  material override of a constituent does not reach homogenized keys. fcbga s2 coarse, core_lowcte nu -0.05 / +0.05:
  ROM 247.14 / 232.93 um (nominal 240.03), RVE 243.83 / 243.83 (nominal 243.83, no change). Case overrides of
  constituents (Xilinx core_lowcte / underfill / cu, 120 mm Table IV abf_gl / cu / underfill, 50 mm Table 8) are
  therefore dropped inside homog keys under RVE; this likely drives much of the RVE / ROM gap above. The runner test of
  the mechanics route pins homogenization rom. Until fixed, sensitivity and override-bearing grade-A runs should use
  `--homog rom`.
- Tests 2026-10-20 19:00 PDT: runner + families + cases 78 / 78.

## Wave 6 (coordinator, 2026-10-20 19:30 PDT): 120 mm stiffener attach as a process sequence

Plan: (1) cowos_s knob ring_attach (none | adhesive) with an explicit glue frame (ring_adh_h_um template 100 um,
corpus bounds 50 / 300 um; ring_adh_mat silicone_adhesive); (2) 120mm_warpage: study `stiffener_attach_sequence`
(L4 id): package_cure (stress-free 170 C -> 130 C), ring_attach (ring + glue stress-free 130 C), ramp_30 / ramp_148 /
ramp_222 / ramp_243 / ramp_260 (L8 steps take one temperature each, so L4's single step `ramp` is five steps
`ramp_<T>`); s2 becomes a common-170 C single-step reference without targets; per_part offsets removed; (3) Cu-ring
case 120mm_warpage_cu (TV -e, targets e-m1..m4); (4) coarse mesh, `--homog rom` (L11 RVE override propagation
pending); (5) runner: process_sequence = one job, outputs stamped with engineVersion().

### Wave 6 progress
- 2026-10-20 19:40-20:40 PDT: knob, studies and Cu case written; first sequence run failed at 222 C
  (silicone_adhesive E table ends at 150 C): silicone_adhesive added to allow_extrapolation with the reason.
- Other cases with per-part stress-free temperatures: none (120 mm was the only one; all others use per_part {}).
- Results (coarse mesh max_xy 2.5 mm, grading 2, 1 cell per layer; ROM; engine src 098603c37bf3, dirty):

  | Step | T C | SUS430 model | SUS430 measured | Cu model | Cu measured |
  |---|---|---|---|---|---|
  | package_cure | 130 | +166.4 (dome) | - | +166.4 (dome) | - |
  | ramp_30 | 30 | +184.0 (W) | +485 | -638.1 (W) | -330 |
  | ramp_148 | 148 | +165.4 (dome) | +135 | +281.4 (dome) | +260 |
  | ramp_222 | 222 | +209.7 (W) | +65 | +804.1 (dome) | +645 |
  | ramp_243 | 243 | +230.3 (W) | -85 | +958.4 (dome) | +770 |
  | ramp_260 | 260 | +247.4 (W) | +247 (FEM a-m23) | +1083.5 (dome) | - |

  - Cu trend (L4 secondary): strictly increasing, one sign change in (30, 148) C, model crossing about 112 C
    (linear) vs measured about 96 C; magnitudes 1.1-1.9x measured.
  - SUS430 trend: fails (not monotone, no sign change near 231 C); the SUS430 ring nearly freezes the 130 C shape
    (package alone would move about -4.2 um/K, from the 170 -> 130 C step). Shapes W at 30 / 222-260 C (L4 gates sign
    only for dome / bowl).
- Glue-thickness bounds (SUS430, same mesh / ROM), ramp_30 / 148 / 222 / 243 / 260 C: 50 um +181.9 / +166.9 /
  +215.8 / +237.3 / +255.4; 100 um (template) +184.0 / +165.4 / +209.7 / +230.3 / +247.4; 300 um +188.4 / +161.3 /
  +190.9 / +208.1 / +222.1. The glue changes the curve by <= 10 %, so it does not explain the missing SUS430 trend. The
  base run repeated bit-identically (determinism check).
- Case mesh not run: L8's process sequence solves each step directly (solveDirect), and the 120 mm case mesh is
  1.87e6 DOF; each coarse sequence (7 steps, 2.4e5 DOF) took 14-16 min.
- Runner: process_sequence studies are one job (`perTemperature`), physicsOf counts them as mechanics, warpage rows
  carry step and shape_class; `--variants` and sensitivity JSON are stamped {engine: engineVersion(), homogenization}.
- Tests 2026-10-20 21:40 PDT: runner + families + cases 80 / 80 (incl. the new Cu case dry check).
