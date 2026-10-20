# DevLog-008: 3D package viewer tab

Date: 2026-10-19. Status: in progress. Related: DevLog-005 (data), DevLog-007 (process flows; needed for the
process animation in phase 3).

## Request and decisions (Wentao, 2026-10-19 23:35)

- A 3D view of the actual package, as its own tab ("3D"), to give an intuitive picture of how each type of
  advanced packaging looks and how the companies' approaches differ.
- One illustration per packaging type (CoWoS-R, EMIB-T, ...), chosen from a dropdown.
- Scale: a toggle between in-scale and illustrative (mostly visible). The in-scale mode uses insets on the core
  regions and/or zoom levels and camera presets.
- View modes as proposed:
  - Section cutaway (default).
  - Exploded slider.
  - Per-material x-ray / translucency.
  - Interconnect unit cell.
  - Process animation later (needs DevLog-007 flows).
- Optimize clutter away.
- Iterate on modeling and rendering for performance; use a good framework (three.js).
- Camera: no auto-orbit; damped orbit/pan/zoom; presets (iso, front section, top, bottom, frame selection).
  Synchronized cameras in compare.
- Labels/callouts: a toggle, a click tooltip, or both.
- Family gallery: yes. Compare view (several families side by side): yes.
- Q&A:
  1. Models are based on actually reported data as much as possible, built into a default template per
     packaging type. References are exposed to the viewer and traceable.
  2. A research subagent verifies the family list.
  3. No paper figures on the site: build from scratch from the distilled information.
- Be mindful of CPU/GPU/memory/disk on this machine (12 cores, 24 GB RAM, disk 95% full / 24 GiB free at start).

## Data reality (2026-10-19, `data/` at 239 papers)

| geometry available | physical TVs |
|---|---|
| total physical TVs | 644 |
| outline | 162 |
| die x/y | 217 |
| die thickness | 204 |
| 3 or more layer thicknesses | 145 |
| interconnect pitch | 228 |
| interconnect diameter + height | 109 |
| all four of the above | 36 |

`package_class=other` on 127 TVs. A single paper rarely discloses a whole package, so a family model combines
several papers of the same family. Every value carries its reference.

## Design

### Value provenance (binding)

Every rendered dimension has a status, and the viewer encodes it:
- `reported`: a value from a database row of this family. Solid material color; the callout shows value, unit,
  basis, paper and locator.
- `derived`: arithmetic on reported values; the formula is in the reference.
- `template`: no paper in the database reports it. Rendered desaturated/hatched with dashed edges; the callout says
  "not reported; illustrative" plus the rationale (and an external public reference if the research agent
  verified one).
- No silent numbers: the generator refuses a value without a status and a reference or rationale.

### Files

- `config/package3d/families.yaml`: the family list (verified by the research agent): id, name, company,
  package_class, technology_name aliases, representative TVs, short description, sources.
- `config/package3d/<family>.yaml`: the template.
  - Topology: parts, layers and interconnect arrays.
  - Each dimension either points at a database cell (`ref: <row_id>.<field>`, resolved at build time so values
    stay traceable and update with the data) or is a template value with a rationale.
- `scripts/build_package3d.py`: resolves the templates against `data/*.csv` and writes
  `app/static/data/package3d.json`. It validates the provenance and reports the reported/derived/template share
  per family.
- App:
  - New route `app/src/routes/3d/` and a nav entry.
  - The engine in `app/src/lib/three/`: three.js; scene build, instancing, LOD, clipping, labels, camera.

### package3d.json contract (v1)

```jsonc
{
  "version": 1,
  "generated": "2026-10-19",
  "refs": {                       // every reference used anywhere below
    "R12": {"paper_id": "...", "doi": "...", "title": "...", "year": 2024, "table": "stack_layers",
            "row_id": "...-a-L03", "field": "thickness_um", "locator": "p.3 Fig. 4", "basis": "design_target"}
  },
  "families": [{
    "id": "cowos_r", "name": "CoWoS-R", "company": "TSMC", "package_class": "organic_rdl_interposer",
    "summary": "<= 40 words", "source_tvs": ["..."],
    "completeness": {"reported": 0.62, "derived": 0.08, "template": 0.30},
    "parts": [{                                   // closed solids, axis-aligned boxes in v1
      "id": "soc", "name": "SoC", "kind": "die",  // die|hbm|bridge|interposer|substrate|mold|underfill|lid|tim|...
      "material": "silicon", "x_mm": 0, "y_mm": 0, "w_mm": 26, "d_mm": 33, "z_um": 1450, "h_um": 775,
      "explode_group": 3, "xray_default": false,
      "dims": {"w_mm": {"status": "reported", "ref": "R12"}, "h_um": {"status": "template", "note": "..."}}
    }],
    "layers": [{                                  // thin films inside a part (RDL, dielectric, core, build-up)
      "id": "rdl1", "part": "interposer", "seq": 1, "material": "Cu / PI", "role": "conductor",
      "z_um": 1430, "h_um": 2.0, "line_um": 2, "space_um": 2, "dims": {"h_um": {...}}
    }],
    "arrays": [{                                  // interconnect fields: rendered instanced, LOD-gated
      "id": "ubump_soc", "kind": "microbump",     // c4|microbump|cu_pillar|hybrid_bond|tsv|tgv|bga|rdl_via
      "between": ["soc", "interposer"], "region": {"x_mm": 0, "y_mm": 0, "w_mm": 26, "d_mm": 33},
      "pitch_um": 40, "diameter_um": 25, "height_um": 30, "dims": {...}
    }],
    "callouts": [{"target": "rdl1", "text": "RDL 2/2 um L/S", "refs": ["R12"]}],
    "insets": [{"id": "die_edge", "label": "SoC-HBM edge", "box_mm": [x0, y0, x1, y1], "camera": {...}}]
  }]
}
```

## Agents (at most 7 at once across all work; the revision pass uses 4 until it finishes)

1. Research agent (web): verify the family list; for each family, the topology from public sources (company
   pages, the papers in this database first) and the representative TVs in our data. Writes
   `config/package3d/families.yaml` and `config/package3d/RESEARCH.md` with sources. No code.
2. Data/template agent: `scripts/build_package3d.py`, the template format and validator, then the first two
   templates (CoWoS-R, EMIB-T) from database rows with references. More families follow once the research agent
   finishes and slots free up.
3. Frontend agent: the 3D tab against the contract, using a fixture until real data lands.
   - Dropdown, gallery, compare, section/explode/x-ray/unit cell, in-scale vs illustrative toggle with insets and
     zoom levels.
   - Camera presets, callouts toggle plus click tooltip, reference panel.
   - Performance: render on demand, instanced meshes, LOD, no continuous loop.
   - Checks: svelte-check, build, screenshots.

## TODO

- [ ] Research: verified family list + topology notes
- [ ] Generator + template format + validator; CoWoS-R and EMIB-T templates
- [ ] 3D tab engine and UI on a fixture
- [ ] Remaining family templates (agents, after the research list)
- [ ] Wire the real package3d.json; compare view; gallery thumbnails
- [ ] Performance pass (draw calls, triangles, memory; target 60 fps orbit on this machine) and clutter pass
- [ ] Fresh-context review (data provenance + UI), fixes
- [ ] Phase 3: process animation from DevLog-007 flows

## Progress log

- 2026-10-19 23:36: decisions recorded, contract written. Slots: affiliations done, revision pass at 4 agents,
  3 free.

## Contract changes

v1 additions by the generator (2026-10-19, `scripts/build_package3d.py`); nothing renamed or removed.

- Conventions made explicit (top-level `conventions` object): `x_mm`/`y_mm` (parts and array regions) are the
  footprint center, package centered at 0; `z_um` is the bottom of a solid with z = 0 at the lowest point of the
  model; `box_mm` = [x0, y0, x1, y1].
- `refs` entries add `source`, `value` (raw cell), `unit`, `tv_id`, `technology_name` and, when the row has one for
  that field, `qualifier` (approx, gt, lt, ge, le).
- `dims` entries: every entry carries `value`. Reported: `ref`, optional `conv` ("um->mm") and `note`. Derived:
  `formula` (over param names / r0..), `values` (formula with numbers substituted), `refs` (all leaf cells),
  `inputs` (param names). Template: `note` (rationale), optional `source`, `refs` (supporting or analog cells from
  other families; their own TVs are in the refs table), and `formula`/`values`/`inputs` when computed. Dims keys
  beyond the box fields: `x_mm`, `y_mm`, `repeat_nx`, `repeat_ny`, `repeat_pitch_x_mm`, `repeat_pitch_y_mm`,
  `gap_um`, `depth_um`, `frame_w_mm`, `margin_mm`, `repeat_n` (layers).
- Family: `backbone_tv`, `summary_refs`, `dim_counts` (counts behind `completeness`), `params` (every template
  param with its dim entry, so derived/template chains can be shown).
- Parts: `material` is a key (silicon, organic_laminate, organic_build_up, polymer_dielectric, copper, solder,
  underfill, stainless_steel, mold_compound, tim, glass, other) plus `material_label` (as written); `kind` adds
  `stiffener`, `ipd`, `other`; `template_id` (declared id; instances are `<id>_1..n`, frames `<id>_n/s/e/w`); `in`
  (host part id for embedded solids, e.g. an EMIB bridge inside the substrate); optional `note`.
- Layers: `template_id`, `material_label`, `via_um`.
- Arrays: `mount` (between | in | under | span), `z_um` and `h_um` (computed vertical extent), `count_est`
  (floor(w/p) * floor(d/p), for LOD), `template_id`, optional `note`. `height_um` is always present (for in/span
  arrays it equals `h_um`). For `in`/`under` arrays `between` repeats the host id twice.
- Insets: `z_um` [z0, z1]; `camera` = {view (front | right | top | iso), target [x_mm, y_mm, z_um], span_mm}.

## Progress (coordinator)

- 2026-10-19 23:56: the generator/template agent finished. Files: `scripts/build_package3d.py`,
  `config/package3d/TEMPLATE_FORMAT.md`, `cowos_r.yaml`, `emib_t.yaml`, `app/static/data/package3d.json`
  (2 families, 78 refs; `--check` ok).
  - CoWoS-R: 40% reported, 4% derived, 56% template. Backbone ectc51529.2024.00049-a; gaps from 00047-a/b.
  - EMIB-T: 27% reported, 73% template. Backbone ectc51846.2026.00051-b.
  - Our CoWoS-R and EMIB-T rows report almost no thicknesses or bump heights, so most z dimensions are
    template. Many are "analog" values from other families' rows (still traceable); a few are the agent's own
    illustrative values: ring width, underfill fillets, EMIB-T bump height, cavity clearance.
  - The validator was negative-tested: it rejects a bare number, a template without a note, an empty cell, a
    missing row, and a cross-family "reported" value.
- Coordinator check: no file under config/, scripts/, app/ or the DevLogs mentions the cross-check reference.
- 2026-10-20 00:00: research agent finished. `config/package3d/families.yaml` + `RESEARCH.md`.
  - 35 entries: 23 to illustrate (priority 1: fcbga_organic, cowos_s, cowos_r, cowos_l, soic, emib, emib_t,
    foveros, hbm_stack) and 12 kept as peer data, merged or out of scope.
  - Changes vs the proposal:
    - Added the FCBGA baseline, IBM DBHi and UCLA Si-IF.
    - Split I-Cube into MIoS and I-Cube E, and hybrid bonding into W2W and D2W.
    - Dropped InFO_PoP, I-Cube R, FOCoS chip-last, S-SWIFT and HPLT as separate illustrations.
    - CoWoS-L, FOCoS-Bridge, S-Connect and I-Cube E share a bridge-in-mold template.
  - Uncertainties: no TSMC/Intel paper in our data gives a full vertical stack. TSMC 3DFabric pages returned
    HTTP 403 (facts from search snippets). The MIoS = I-Cube S mapping and Foveros Direct attribution are
    inferred. A fresh-context audit of families.yaml is pending.
- 00:00: template agent 2 launched: cowos_s, cowos_l (reusable bridge-in-mold), emib.
- Frontend: the coordinator inspected its screenshots at 23:57. The UI chrome works, but the viewport is empty
  ("NaN um" scale bar) and the software-GL attempt gave a 500. The agent was asked to fix rendering with the real
  package3d.json, then save review set r01-r08 for Wentao.
- 2026-10-20 00:09: frontend agent finished.
  - Files: `app/src/routes/3d/+page.svelte`, `app/src/lib/three/{types,fixture,data,materials,model,build,viewer}.ts`,
    `Viewer3D.svelte`; nav entry; three 0.186.1.
  - `pnpm check` 0 errors / 0 warnings; `pnpm build` ok (3d.html prerendered); other pages unaffected.
  - Renderer (CoWoS-R): 8-18 draw calls; 79k-923k triangles; bump instances LOD-capped (8k rows, 40k window,
    150k per family). Orbit at 60 fps (the cap) with headless Chromium on Metal. Screenshots use SwiftShader
    (about 0.9 s first frame). The three.js chunk (630 KB) loads only on /3d.
  - Review set r01-r08 plus checks c01-c04 (390 px, click tooltip, fixture fallback, light theme) in the
    session scratchpad.
  - Coordinator review of r01-r08:
    1. Hatching dominates (most dims are template).
    2. Callouts are long sentences: truncated and overlapping.
    3. The section cut face has no cap, so it does not read as a cross-section.
    4. EMIB-T section framing is too tight, with a bump moire.
    5. Compare panes are portrait.
    6. Gallery thumbnails are small.
    Held for Wentao's feedback before the next frontend iteration.
- Dev server for review: tmux `apa-app`, http://127.0.0.1:47331/3d (log `logs/app_dev_<ts>.log`).
- Template agent 3 launched: soic, foveros, hbm_stack (short callout text rule added).
- 2026-10-20 00:18: template agent 2 finished: `cowos_s.yaml`, `cowos_l.yaml`, `emib.yaml`. package3d.json now
  has 5 families and 195 refs (366.6 kB); `--check` is clean. Re-checking CoWoS-R/EMIB-T with refs resolved
  showed no change.

  | family | backbone TV | reported / derived / template |
  |---|---|---|
  | cowos_s | ectc51909.2023.00135-a | 32% / 0 / 68% |
  | cowos_l | ectc51909.2023.00174-a | 33% / 0 / 67% |
  | emib | ectc.2016.201-a | 33% / 0 / 67% |

  - Generator additions (backward compatible, documented in TEMPLATE_FORMAT.md):
    1. `modules:` + `use: [{module, from?}]`. `bridge_in_mold`, defined in cowos_l.yaml, is reusable by
       FOCoS-Bridge, S-Connect and I-Cube E.
    2. `in` on a part inside a repeated host names the instance (e.g. `mold_2`).
    3. Layer `instances` for repeated hosts.
    4. `--out` outside the repo works.

### Contract changes (coordinator, from template agent 2)

- Layer `instances` (list of host instance ids).
- `in` names a host instance for parts inside repeated hosts.
- Parts with `kind: mold` host dies (`in: mold_n`).
- The CoWoS-L lid is a frame sidewall plus a plate.
- The EMIB adhesive is `kind: other`.
- The TIV is drawn as array kind `cu_pillar`.
- Mold and the CoWoS-L lid are `xray_default: true`. The viewer must draw them translucent by default, or they
  hide the dies.
- 2026-10-20 00:23: template agent 3 finished: soic.yaml, foveros.yaml, hbm_stack.yaml. package3d.json has 8
  families, 258 refs (467 kB); --check clean; no private-reference mentions.

  | family | backbone TV | reported / derived / template |
  |---|---|---|
  | soic | ectc51906.2022.00176-a | 48% / 4% / 48% |
  | foveros | iedm19573.2019.8993637-a | 40% / 0% / 60% |
  | hbm_stack | ectc51909.2023.00151-a (MR-MUF HBM3 8Hi) | 43% / 11% / 46% |

  - Generator features requested (not yet built; another template agent is using the generator):
    1. Callout `note` field.
    2. Vertical repeat for stacked dies/gaps.
    3. Family matching by paper list/exclusion, since `^Foveros$` also matches the hybrid-bond TV
       ectc32696.2021.00166-b.
    4. Inset z anchors on arrays.
    5. An oxide/dielectric material key.
  - Data note: HBM TVs ectc51909.2023.00151-b and vlsitechnologyandcir46769.2022.9830182-j have no
    technology_name, so their rows cannot count as reported for hbm_stack.
  - Foveros base-die TSV field: about 8.8M estimated instances; viewer LOD windowing required.
- 2026-10-20 00:38: family-list audit (`DevLog/audits/package3d_families_audit_2026-10-20.md`): 2 blocking, 10 metadata,
  6 minor.
  - Blocking:
    - soic: the TDV gap fill is drawn around the top die; in packaged SoIC the fill/TDVs face the bump side
      (ectc.2019.00095 p.2 Fig. 4).
    - foveros: a 32x62 mm "die complex" is drawn as one active base die (about 2.3x the reticle), and the tile
      count comes from a passive-interposer TV.
  - Metadata:
    - emib_t: the 50 um bridge thickness is a general EMIB statement, not EMIB25T.
    - hbm_stack: match rule differs from families.yaml; untagged HBM TVs.
    - The 58 um core die is a comparison case.
    - cowos_r omits the molding compound.
    - Peer sets missing: 50 microbump D2W TVs; IBM/Resonac organic interposers.
    - Tagging candidates; case-sensitive matching; 3 double-counted TVs.
  - Queued fix pass, after template agent 4 releases the generator and the revision re-run merges (data tagging
    edits would collide with `--replace` merges):
    1. Template fixes per the audit.
    2. Generator features: callout note, vertical repeat, paper-list matching, case-insensitive rules, inset z
       anchors, oxide material.
    3. technology_name tagging with evidence, then regenerate.
- 00:38: frontend iteration 2 launched (contract additions, subtler template marking, short callouts, section
  caps, inset framing/moire, landscape compare, gallery). It uses the coordinator's dev server; owner feedback
  will be forwarded to it.
- 2026-10-20 00:41: template agent 4 finished: fcbga_organic, ase_focos_bridge, amkor_s_connect, samsung_i_cube_e.
  package3d.json has 12 families, 358 refs (835 kB); --check clean; no private-reference mentions.
  - Reported shares: FCBGA 70% / FOCoS-Bridge 32% / S-Connect 34% / I-Cube E 0%.
  - I-Cube E is 100% template because the agent drew the 51 x 67.72 mm "unit" as the interposer. The DB row
    stores 95 x 105 mm as the interposer, with the conflict unresolved. Re-check queued.
  - The FCBGA family match is "^$" (TVs without a technology name); all its reported refs were checked to come
    from organic_substrate TVs.
- 00:41: 3D fix pass launched:
  - A: generator features (callout note + 6-word check, vertical repeat, package_class/TV-list/case-insensitive
    matching, inset z anchors, oxide + pth, module drop/rename, layer-spanning arrays).
  - B: template fixes per the family audit.
  - C: technology_name tagging proposals, written to `config/package3d/tagging_proposals.csv`; the
    coordinator applies them after the revision merge.
- 2026-10-20 01:20: frontend iteration 2 finished (files under `app/src/lib/three/` and `app/src/routes/3d/` only).
  - Contract: layer `instances` (one layer box per host instance, id `<layer>@<host>`); `in` and array
    `between` resolve instance or template ids (the instance holding the center); mold hosts dies; `kind: other`
    and unknown materials/kinds fall back to neutral; `pth`/`tiv` treated as vertical vias; callout `note` shown
    in the click tooltip; inset `z_um` used only when it is a 2-number array.
  - X-ray defaults come from `xray_default` only (class when all its parts are flagged, else per part `#id`);
    mold, CoWoS-L lid and underfills are translucent on load. The CoWoS-L TIM is not flagged, so it still
    covers the die tops in plan view (tim chip makes it translucent).
  - Provenance encoding: full colour + solid edges = all box dims reported/derived; full colour + dashed edges
    = some template; grey + dashed = all template; faint hatch only when the view spans < 20% of the package.
  - Section: unlit cut caps per piece in the material colour (opaque also for x-ray parts), so layer bands
    show on the cut face; depth order edges/bumps > caps > bodies.
  - Callouts: one per target, <= 6 words cut at a clause or word boundary with an ellipsis, "(+n)" for more
    callouts; full text, notes and refs in the click tooltip (labels are clickable); priority selection >
    on-screen size; no overlap with labels, anchors, leaders or the z ruler; repeated parts labelled once
    ("HBM x12").
  - LOD: an array is instanced only when its diameter spans >= 3 px and its pitch >= 5 px, else a pad-region
    slab (no moire); the non-instanced remainder of a windowed field is also a slab. Foveros base-die TSVs
    (~8.8M est.) stay windowed (1574 instances at the TSV inset).
  - Camera: presets frame the section-trimmed content and are refined on the projected box (tight fit);
    inset frame switches to in-scale and frames max(span, box) x z range with margin.
  - Compare: landscape grid chosen for the largest per-pane package size; "Fit each" (default) scales each
    family to the same size with its own scale bar, cameras shared; each family cut through its own central
    largest die (slider = offset). Gallery: 400 px min tiles, 480 x 270 thumbnails cropped to content,
    completeness share as text and tooltip.
  - renderer.info (1440 x 900, SwiftShader), before -> after: CoWoS-R default 8 calls / 359.6k tris / 3589
    inst / 6 geo -> 8 / 359.5k / 3589 / 7; Foveros default 7 / 288 / 0 / 5 -> 7 / 258 / 0 / 6.
  - Checks: `pnpm check` 0 errors 0 warnings; `pnpm build` ok. Review set v01-v21 in the session scratchpad
    (`3d_review2/`).
- 2026-10-20 00:59: frontend iteration 2 finished (agent entry above).
  - The 12 families render; `pnpm check` 0 / 0 and build ok.
  - Coordinator check of v01 (CoWoS-R), v14 (CoWoS-S section caps), v16 (compare 3) and v17 (gallery):
    - Template encoding is subtler: dashed edges / grey for all-template parts, solid colour for reported.
    - Section caps read as a cross-section (interposer BEOL, TSV, C4, substrate bands).
    - Compare grid is landscape, with fit-each plus a common-scale toggle; gallery tiles are tight with share text.
  - Remaining visual issue: stiffener rings and lids dominate several views and thumbnails. Candidate: make
    ring/lid translucent by default or render them as outlines.
  - Data/gen follow-ups: CoWoS-L TIM needs `xray_default`; inset z anchors in other forms fall back to full
    height.
  - Review set: session scratchpad 3d_review2/v01-v21.

## Contract changes (3D fix pass, 2026-10-20)

All additive; no key renamed or removed. `package3d.json` regenerated (12 families, 361 refs, 843 kB).

- Parts: vertically repeated parts (`repeat: {nz, pitch_um | stack: true}`) emit one instance per level with its own
  `z_um`, plus `z_index` (1 = lowest level). `explode_group` grows by the template's `explode_step` per level.
  Used by hbm_stack (`core_1..core_7`, `muf_1..muf_7`).
- `dims` keys: `repeat_nz`, `repeat_pitch_um` (parts and arrays).
- Layers in a vertically repeated host: one set of entries per level, id `<layer>_<instance>`, `part` = that level's
  instance (`instances` only when a level has several xy instances). No current template uses this.
- Arrays:
  - kind `pth` (plated through hole; fcbga_organic `pth`).
  - optional `layer`: the layer group or layer id that an `in_layer` array spans (mount `in`; `z_um`/`h_um` = that
    layer range, not the host's full height).
  - Between stacked levels, `between` names both instances (`["core_2", "core_1"]`). Ids: `<id>_<instance>` per level
    for arrays in or on a stacked part; `_z<k>` for an array's own vertical repeat.
- Material key `oxide` (bond or gap-fill dielectric). No template uses it yet: no TSMC source states the SoIC fill
  material.
- Callouts: optional `note` (click-tooltip text; on-screen `text` is now <= 6 words in all 12 families). Cells
  referenced by `{param}` placeholders in the note are added to the callout `refs`.
- Insets: `z` anchors may name arrays and part instances (template-side only; `z_um` stays [z0, z1]).
- Id changes the viewer may notice (data, not contract):
  - hbm_stack: `muf_8` -> `muf_top`; `ub_1..ub_8` -> `ub_core_1..7` + `ub_top`; `tsv_1..7` -> `tsv_core_1..7`.
    Callouts target the template ids `core`, `muf`, `ub`.
  - foveros: `base` -> `base_1`, `base_2` (`in: mold`). The frame `mold_n/s/e/w` -> one `mold` body hosting the base
    and top dies. `wluf` -> `wluf_1`, `wluf_2`. `tsv`, `psb` -> `_a`, `_b` per base die.
  - cowos_r: new part `mold`; `soc_*` and `hbm_*` now have `in: mold`.
  - ase_focos_bridge, amkor_s_connect, samsung_i_cube_e: `lsi_tsv_*` -> `rdl_via_br_*` (same geometry).

## Progress (3D fix pass agent, 2026-10-20)

- Generator (`scripts/build_package3d.py`). With unchanged templates the output was byte-identical to the previous
  JSON. 16 scratch tests pass (feature and negative).
  - Features:
    1. Callout `note` plus a warning when callout text is over 6 words.
    2. Vertical repeat (`repeat.nz` with `pitch_um` or `stack: true`, `fill: {per}`, per-level `per`/`in`/`in_layer`
       arrays, array `repeat.nz`, `explode_step`).
    3. `family_match` as a regex, a rule dict, or `{families: true}` (families.yaml semantics: tn / cls / cls_only /
       papers / ic_level / excl / excl_papers, plus `tvs` / `excl_tvs`; case-insensitive).
    4. Inset anchors on arrays and instances.
    5. `oxide` and `pth`.
    6. `use` options `drop:` / `rename:`, and `in_layer` arrays.
  - A families.yaml that does not parse is now an error (it used to be ignored silently).
  - ruff and mypy findings are the 5 pre-existing ones each.
- All 12 templates use `family_match: {families: true}`. Every reported cell passes. fcbga_organic is now checked by
  package_class instead of "^$".
- Audit dispositions (each checked against the cited text.md and page render):

  | finding | disposition |
  |---|---|
  | B1 soic TDV fill | confirmed (ectc.2019.00095 p.2 Fig. 4(b),(d); iedm45625.2022.10019499 p.3 Fig. 2 caption). Fill renamed "Gap fill" (material not stated); "with TDVs" removed; note and callout explain that packaged-SoIC fill/TDVs face the bump side. RESEARCH soic item 2 and the 2.3 QMC sentence corrected. Structural-Si claim not added (secondary source not verifiable offline). |
  | B2 foveros | confirmed (ectc51846.2026.00365 p.5: ~32 x 62 mm, about 2.3x one field; Fig. 9(a) shows two halves). The complex is a mold body of the reported outline holding reticle_multiple (2) base dies, each capped at 26 x 33 mm (drawn 26 x 30.7 mm). Partition is template. Tile count = 1 per base die from the backbone (Lakefield c1.count); the 2024 passive-interposer TV's 3 tiles are a callout only. |
  | M1 emib_t 50 um | confirmed (ectc51846.2026.00051 p.1 Sec. I). bridge_h_um is now template (r0 ref kept); callout and note reworded; families.yaml and RESEARCH fixed. |
  | M2 cowos_r mold | confirmed (ectc32696.2021.00125 p.3 Sec. II.C, p.4 Sec. III.A; row 00125-a-c7). Mold part added; dies `in: mold`; height template. |
  | M3 hbm_stack | rule = families.yaml (paper fallbacks). 58 um confirmed as the Fig. 1 equal-thickness comparison case (ectc51909.2023.00179 p.2), now template with the cell as ref. Stack rewritten with the vertical repeat; geometry identical to before. |
  | M4 foveros 00166-b | excluded through families `excl_papers` (negative test passes). Not retagged: the paper says "Foveros architecture", not "Foveros Direct". |
  | M5/M6 tagging | see `config/package3d/tagging_proposals.csv` and the declined list below. |
  | M7 peer sets | added `microbump_d2w_peers` (24 papers / 50 physical / 3 sim) and `organic_interposer_peers` (6 / 13 / 1), include false. peer_family set on cowos_r, foveros and hbm_stack. |
  | M8 double counts | X-Cube paper ectc51909.2023.00178 added to hybrid_bond_d2w `excl_papers`. si_interposer_peers excludes ectc32696.2021.00166 and vlsitechnologyandcir65830.2026.11577576. The 14 remaining overlaps are recorded as `shared_with` with reasons. |
  | M10 FOCoS URL | claim replaced with the page content the audit recorded on 2026-10-20; placement attributed to db:ectc51529.2024.00151 p.2 Sec. II.A (families.yaml and RESEARCH). |
  | m1 cowos_s | 100 um locator moved to p.3 Sec. III.E / p.4 Table II; RESEARCH lid + TIM claim removed (paper has a Cu stiffener ring only). |
  | m2 I-Cube E face up | confirmed (p.3 Sec. III.B, step s05); template note and RESEARCH updated. |
  | m3 case | generator now case-insensitive, same as families.yaml. |
  | m4 counts | all 37 entries recounted. Changes: fan_out_panel 21/47/6, hybrid_bond_d2w 8/16/0, ucla_si_if 5/11/2, si_interposer_peers 13/33/7. A re-run reproduces every count. |
  | m5 foveros_direct | TSV re-attributed to db:ectc51529.2024.00017 (families.yaml and RESEARCH). |
  | m6 hbm MUF wall | the callout and the mold note say the wall is a derived layout. |
  | I-Cube E outline | kept 51 x 67.72 mm as the interposer. The Fig. 2.2 rectangle width/height ratio is ~0.75 = 51/67.72, vs 0.90 for 95/105. Recorded in the template header and RESEARCH. |
  | importers | FOCoS-Bridge, S-Connect and I-Cube E use `drop: [lsi_tsv, lsi_tsv_pitch_um, lsi_tsv_d_um]` and `rename` (display fields). The duplicated module parts and the reused-TSV workaround are gone. Output is geometry-identical. |

- Callouts: the 31 over-6-word callouts (cowos_s, cowos_r, cowos_l, emib, emib_t) are now short text + `note`
  holding the old text. `--check` has no warnings.
- Completeness, reported / derived / template, before -> after:

  | family | before | after |
  |---|---|---|
  | fcbga_organic | 70 / 18 / 12 | 70 / 18 / 12 |
  | cowos_s | 32 / 0 / 68 | 32 / 0 / 68 |
  | cowos_r | 40 / 4 / 56 | 42 / 4 / 55 |
  | cowos_l | 33 / 0 / 67 | 33 / 0 / 67 |
  | soic | 48 / 4 / 48 | 48 / 4 / 48 |
  | emib | 33 / 0 / 67 | 33 / 0 / 67 |
  | emib_t | 27 / 0 / 73 | 24 / 0 / 76 |
  | foveros | 40 / 0 / 60 | 30 / 0 / 70 |
  | hbm_stack | 43 / 11 / 46 | 40 / 10 / 50 (dims now counted once per declared part) |
  | samsung_i_cube_e | 0 / 0 / 100 | 0 / 0 / 100 |
  | ase_focos_bridge | 32 / 0 / 68 | 32 / 0 / 68 |
  | amkor_s_connect | 34 / 3 / 64 | 34 / 3 / 64 |

- Tagging proposals: 6 rows in `config/package3d/tagging_proposals.csv` (data/*.csv not edited).
  - Proposals:
    - ectc51909.2023.00151-b MR-MUF
    - vlsitechnologyandcir46769.2022.9830182-j ubump_HBM (the hbm_stack rule already matches `bump_HBM`)
    - iedm45741.2023.10413759-b GaN/Si-IF
    - ectc51846.2026.00050-f DBrM
    - ectc51687.2025.00049-a and -b DBHi (coupons, medium confidence)
  - Declined (the paper does not state the tag):
    - ectc51846.2026.00024-a..e (IME hybrid-bond process TVs for HBM; already counted through the paper list)
    - vlsitechnologyandcir65830.2026.11577576-b/c/d (simulation packages; HBM technology not stated for them)
    - ectc51846.2026.00062-b (bonded to a blanket Cu substrate)
    - iedm45741.2023.10413759-c (wafer type not stated)
    - ectc51909.2023.00274-b/c (substrate stated as a 4-inch Si wafer)
    - ectc51529.2024.00087-b ("EMIB" not in the text)
    - ectc51906.2022.00232-a/b/c (InFO_oS only in a reference)
    - ectc32696.2021.00166-b to "Foveros Direct" (the paper says "Foveros architecture")
- Open:
  - fan_out_panel rule vs the wafer-format M-Series TVs (audit M6): not decided here.
  - foveros_direct family naming (M9).
  - CoWoS-L TIM `xray_default` (frontend note).
  - Counts drift again after the revision merge; re-run `scripts/build_package3d.py --check` and the recount.
- 2026-10-20 01:16: 3D fix pass finished (agent report; contract changes appended above by the agent).
  - Audit dispositions:
    - soic: TDV fill corrected.
    - foveros: split into 2 base dies of at most 1X; tile count from the backbone.
    - foveros: 00166-b excluded via excl_papers.
    - emib_t: 50 um bridge thickness now template.
    - hbm_stack: match per families.yaml; 58 um core die marked as the comparison case; vertical repeat used.
    - cowos_r: mold added.
    - I-Cube E: outline kept (Fig. 2.2 aspect ratio 0.75 matches 51 x 67.72 mm).
    - Bridge-in-mold importers simplified with drop/rename.
    - families.yaml: recounted; locators fixed; peer sets microbump_d2w_peers and organic_interposer_peers;
      shared_with reasons for 14 intended overlaps.
  - Generator features A1-A7 done; 31 long callouts shortened (old text moved to `note`).
  - Coordinator applied the 6 tagging proposals to data/test_vehicles.csv (backup in cache/backups; evidence
    appended to each TV's notes): ectc51909.2023.00151-b MR-MUF, vlsitechnologyandcir46769.2022.9830182-j
    ubump_HBM, iedm45741.2023.10413759-b GaN/Si-IF, ectc51846.2026.00050-f DBrM, ectc51687.2025.00049-a/-b
    DBHi.
  - Validator 0 errors; package3d.json regenerated (12 families, 361 refs, 843 kB); atlas.json rebuilt
    (0 warnings).
  - No private-reference mentions (grep).
  - Open:
    - M6: M-Series wafer TVs in fan_out_panel?
    - M9: foveros_direct naming.
    - CoWoS-L TIM xray_default.
    - Rings/lids dominate views.
- 01:16: template agents 5 and 6 launched for the remaining 11 included families: info_os, foveros_direct,
  glass_core_substrate, fan_out_panel, cpo_module, hybrid_bond_w2w | samsung_mios, samsung_x_cube, ibm_dbhi,
  ucla_si_if, hybrid_bond_d2w. Generator frozen for them; family_match {families: true}; xray_default on
  occluding parts.
- 2026-10-20 01:33: template agent 6 finished: samsung_mios 50/13/37, samsung_x_cube 41/3/55, ibm_dbhi 44/22/34,
  ucla_si_if 56/31/12, hybrid_bond_d2w 62/6/31 (reported/derived/template %).
  - package3d.json at that point: 21 families, 629 refs (1.3 MB); --check clean; no private-reference mentions.
  - To verify: the DBHi 30 vs 75 um bridge-pitch assignment follows ectc51529.2024.00051 Fig. 4(b) labels; the
    text does not state the split.
  - MIoS: no I-Cube S claim anywhere.
  - Generator features requested:
    - text refs inside expressions;
    - footprint grow/subtract regions (DBHi C4 keep-out);
    - layer anchors in inset z;
    - wire_bond array kind;
    - layer group from the part bottom.
- 2026-10-20 01:53: template agent 5 finished: info_os 42/4/54, foveros_direct 10/0/90 (named "Intel hybrid
  bonding (Foveros Direct and pathfinding)"), glass_core_substrate 42/4/54, fan_out_panel 93/7/0 (region specs
  not counted), cpo_module 13/2/84, hybrid_bond_w2w 40/0/60.
  - The agent could not write the JSON: the v2.4 migration renamed process_steps ids referenced by 5 older
    templates.
  - Coordinator fix: re-pointed 10 refs via the converter id map; the generator family check resolves shared
    steps through process_flows.
  - package3d.json: 23 families, 690 refs, 1.38 MB; --check ok; no private-reference mentions.
  - Generator feature requests from agents 5/6 are pending (overhang flag, top-surface array mount, ring
    regions, square pads, count region specs in completeness, layer anchors in inset z, substrate cut-outs, text
    refs in expressions, footprint grow/subtract, wire_bond kind).
- 2026-10-20 09:25: owner feedback, two fixes:
  1. "Clicking x-ray should turn on transparency for all objects."
     - The toolbar X-ray button (and the inspector "all" checkbox) now set the x-ray token `*`, which makes every
       object translucent.
     - With it off, the per-material set applies: data defaults from xray_default plus the inspector chips.
       Clicking a chip while "all" is on switches to "every class except this one".
     - Files: `app/src/routes/3d/+page.svelte`; `XRAY_ALL` and `isXray` in `app/src/lib/three/build.ts`.
  2. "The section surface is not getting the transparency."
     - Section caps of x-ray parts now go into a separate translucent cap mesh (MeshBasic, transparent, no depth
       write, alpha 0.28, slightly denser than the 0.14 body so the cut stays legible). Caps of opaque parts stay
       opaque.
     - Previously all caps were one opaque mesh by design.
  - Checks: `pnpm check` 0/0. Headless CoWoS-L in default / X-ray all (iso, front) / X-ray off: 0 console errors.
    All-on shows dies, LSIs, TIVs and C4 through the lid/mold/substrate, with translucent cut faces; off restores
    the defaults.

## SOTA CoWoS / EMIB models and compare default (Wentao, 2026-10-20 11:40)

Request:
1. The 3D tab opens on the compare view with two CoWoS and two EMIB families.
2. Iterate the CoWoS and EMIB models toward state-of-the-art complexity (die count, HBM count, interposer/bridge
   size and count).

Decisions (coordinator):
- Compare default: cowos_s, cowos_l, emib, emib_t (the HBM-class CoWoS platforms; CoWoS-R stays in the list). A
  `#f=<family>` hash still opens single view.
- Product-level topology (die/HBM count, layout, interposer and bridge count/size, substrate size) comes from public
  primary sources (company disclosures, conference papers in or outside the DB), researched first and written to
  `config/package3d/RESEARCH_SOTA_{COWOS,EMIB}.md` with URLs and retrieval dates. Such values are `template` dims
  with `source`; DB values stay `reported`; nothing from memory.

Plan:
- [ ] Research agents (web): CoWoS-S/L and EMIB/EMIB-T SOTA configurations.
- [x] Compare default in `app/src/routes/3d/+page.svelte` (2026-10-20 11:50; pnpm check 0/0; headless render ok, 0 console errors).
- [ ] Template agents: cowos_s + cowos_l, emib + emib_t (generator frozen unless a feature is required).
- [ ] Regenerate package3d.json (`--check`), render the compare view, coordinator check.
- [ ] Fresh-context audit of the 4 templates (provenance + topology), fixes.
