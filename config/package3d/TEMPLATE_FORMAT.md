# package3d family template format

One YAML file per packaging family in `config/package3d/<family_id>.yaml`. `scripts/build_package3d.py` resolves
every template against `data/*.csv` and writes `app/static/data/package3d.json` (contract: DevLog-008).
Files named `families.yaml` and any YAML without a `parts` list are skipped. Run
`uv run python scripts/build_package3d.py --check` to validate without writing.

## Provenance (binding, DevLog-008)

Every rendered dimension is a **dimension spec**; a bare number is rejected.

| spec | status | meaning |
|---|---|---|
| `{ref: "<row_id>.<field>"}` | reported | one database cell, e.g. `ectc51529.2024.00049-a-c1.x_mm`, `...-a-L02.line_um`, `...-a-i2.pitch_um`. Error on a missing row/field or an empty cell. The row's TV must match `family_match`. |
| `{derived: "<expr>", refs: [cells]}` | derived | arithmetic over params and `r0, r1, ...` (= `refs[i]`). |
| `"<expr>"` | derived | shorthand over params; a bare param name reuses that param (with exact unit conversion). |
| `{template: <number or expr>, note: "...", source: "...", refs: [cells]}` | template | not reported in this family. `note` (rationale) is required; `source` is an optional public citation; `refs` are supporting cells (context or analogs), shown with the value. |
| `{analog: "<row_id>.<field>", note: "..."}` | template | template whose value is a cell of another family's row (the analog stays traceable). |

- Any result computed from a template input is a template value; status never upgrades.
- Units come from the name: `_mm`, `_um`, `_n` (count); cells take the unit of their column (`*_um`, `*_mm`,
  `count`, `repeat`; `metrics.value` uses the row's `unit`). Only exact um <-> mm conversion is applied, and only
  when a bare name or a `ref` is used for a key with the other unit. Expressions run on raw values in each name's
  own unit; the result is taken in the target key's unit (write `gap_um / 1000` for mm).
- Expressions: `+ - * / **`, parentheses, `min`, `max`, `floor`, `ceil`, numeric literals as arithmetic constants.
- Text (`summary`, callouts) may embed `{param}` placeholders; only reported/derived params are allowed there,
  and their cells become the text's refs. Literal numbers in text need a supporting cell in the callout `refs`.

## Top level

```yaml
id: cowos_r                      # family id (matches families.yaml when present)
name: CoWoS-R
company: TSMC
package_class: organic_rdl_interposer   # schema enum
family_match: {families: true}   # which TVs may supply reported/derived cells (see "Family matching")
backbone_tv: ectc51529.2024.00049-a
summary: "... {param} ..."       # <= 40 words
params: {name: spec, ...}
parts: [...]
layers: [...]
arrays: [...]
callouts: [...]
insets: [...]
```

## Family matching (`family_match`)

Decides which TVs may supply `ref:` / `derived` cells (a cell of any other TV must be `analog:` or `template:`). Same
semantics as the `match_rule` of `families.yaml`; all regexes are case-insensitive (2026-10-20):

| form | meaning |
|---|---|
| `"<regex>"` | shorthand for `{tn: "<regex>"}` |
| `{families: true}` | the `match_rule` of this template's id in `families.yaml` (`{families: <id>}` for another entry) |
| `{tn, cls, cls_only, papers, tvs, ic_level, excl, excl_papers, excl_tvs}` | explicit rule; with `families:` these keys extend that rule (lists are unioned, regexes OR-ed) |

A TV matches when it is in `tvs`, or when an inclusion holds - `tn` regex on `technology_name`, `package_class` in
`cls_only`, `paper_id` in `papers` (and `package_class` in `cls` when `cls` is given), an interconnect row at a level in
`ic_level` - and no exclusion holds: `excl` regex on technology_name + paper title, `paper_id` in `excl_papers`.
`excl_tvs` removes a TV in every case. A cell whose row has no TV is tested on its paper (`tn` on the paper's
technology_name, `papers`, `excl_papers`). All 12 templates use `{families: true}`, so families.yaml is the one place to
change a rule.

## parts (axis-aligned boxes)

Common keys: `id`, `name`, `kind` (die, hbm, bridge, interposer, substrate, mold, underfill, lid, tim, stiffener,
ipd, other), `material` (silicon, organic_laminate, organic_build_up, polymer_dielectric, copper, solder,
underfill, stainless_steel, mold_compound, tim, glass, oxide, other; `oxide` = bond or gap-fill dielectric, use it only
where a source states an oxide), `material_label` (as written), `explode_group`, `explode_step`, `xray_default`, `note`.
Sizes: `w_mm` (x), `d_mm` (y), `h_um`; optional `x_mm`, `y_mm` (center, default 0).

Placement is computed from the stack, never hand-placed:

| key | z rule |
|---|---|
| `base: true` | bottom at 0 (one part) |
| `on: <part>` | bottom = top of `<part>` + gap; gap = `standoff: <array>` height or `gap_um` |
| `in: <part>` | embedded; top = host top - `depth_um` (default 0) |
| `under: <part>` | top = host bottom - gap |
| `fill: {above, parts, margin_mm}` | underfill: footprint = bbox(parts) + margin (clipped to `above` unless `clip: false`); z from top(`above`) to the parts' bottom; its height is the standoff and is not counted twice |
| `fill: {per: <part>, margin_mm}` | one fill under every instance of `<part>` (ids `<id>_1..n` numbered like the part's instances): footprint = instance + margin, clipped to the solid below it (the previous level of a stacked part, else its `on` host) unless `clip: false`; height = the part's standoff / `gap_um` (must be uniform) |

`repeat: {nx, ny, pitch_x_mm, pitch_y_mm}` places a centered grid (instance ids `<id>_1..n`, row-major from +y).
`repeat` also takes `nz` (vertical levels) with exactly one of `pitch_um` (level-to-level pitch) or `stack: true`
(pitch = `h_um` + the part's standoff / `gap_um`, i.e. each level sits on the previous one like the first sits on its
`on` host). Instance numbers count up the stack (z-major, then row-major). A part `on:` a stacked part sits on its top
level; `top:`/`bottom:` anchors of a stacked part are its top / bottom level, and anchors may also name one instance
(`top:core_3`). Each level adds `explode_step` (default 0) to `explode_group`. Frames cannot repeat vertically; a part
cannot be `in:` a vertically repeated host.
`shape: frame` + `frame_w_mm` emits a ring as 4 boxes (`<id>_n/_s/_e/_w`).

## layers

Groups stacked downward from the host part's top surface, in file order (optional group `id`, used by `in_layer`
arrays; it must differ from every layer id):

```yaml
layers:
  - part: interposer
    repeat: rdl_n                # count spec; ids become <id>_1..n
    pattern:
      - {id: rdl_cu, name: RDL Cu, material: copper, role: conductor, h_um: cu_t_um, line_um: ..., space_um: ...}
      - {id: rdl_pm, name: PM dielectric, material: polymer_dielectric, role: dielectric, h_um: pm_t_um, via_um: ...}
```

The generator warns when the layers do not add up to the host thickness.

## arrays (interconnect fields)

Keys: `id`, `name`, `kind` (c4, microbump, cu_pillar, hybrid_bond, tsv, tgv, bga, rdl_via, pth), `pitch_um` (required),
`diameter_um`, `height_um`, `note`, optional `between: [upper, lower]` labels. Placement:

- `per: <part>` + `lower: <part>`: one array per instance, in the gap between the instance and `lower`. On a vertically
  repeated part, level k > 1 sits on level k - 1 (`lower` applies to the first level).
- `upper` + `lower`: the gap between two parts. A part with `standoff: <array>` sits on that array's `height_um`.
- `in: <part>`: spans the host thickness (TSV, stacked vias); on a vertically repeated host, one array per level
  (ids `<id>_<instance>`).
- `in_layer: <layer group id | layer id>`: spans exactly that layer group (or all repeats of that layer) inside its host,
  e.g. a PTH through the core layer of a one-part substrate; one array per level on a stacked host. Output: mount `in`
  plus `layer`.
- `under: <part>`: hangs below the host by `height_um` (BGA).
- `span: ["top:<part>", "top:<part>"]` (or `bottom:`): explicit z range.
- `repeat: {nz, pitch_um | stack: true}`: copies the array `nz` times upward (`stack: true` = pitch equal to its own
  height); ids get `_z1.._zN`.

`region`: default = the instance / host footprint; `{part: <id>}`; `{intersect: [ids]}`; `{subtract: [ids]}`
(rectangle difference, may emit several arrays with suffixes `_a`, `_b`, ...); or explicit
`{x_mm, y_mm, w_mm, d_mm}` specs.

## modules and use (reusable sub-assemblies)

A template may declare named blocks under `modules:` and pull them in with `use:` (added 2026-10-20 for the
bridge-in-mold interposer shared by CoWoS-L, FOCoS-Bridge, S-Connect and I-Cube E):

```yaml
modules:
  bridge_in_mold:              # {params, parts, layers, arrays, callouts}; declaring it does nothing by itself
    params: {...}
    parts: [...]
use:
  - {module: bridge_in_mold}                      # from this file
  # another template: - {module: bridge_in_mold, from: cowos_l.yaml}
```

- Merge rule: the template wins. Its own params, parts/arrays with the same `id`, and layer groups on the same host
  part replace the module's; module callouts are appended. A module cannot `use` another module.
- `drop: [names]` (2026-10-20) removes module parts, arrays, layer elements (and layer groups hosted on dropped
  parts), params and callouts targeting a dropped id, before the merge. Every name must match something.
- `rename: {old: new}` renames a module element id and every reference to it inside the module (stacking, standoff,
  fill, per/upper/lower/in/under, region part/intersect/subtract, span anchors, between, layer hosts, callout
  targets). `rename: {old: {id?, name?, material_label?, note?}}` changes display fields (and optionally the id) without
  restating the element; geometry changes still need a full override. Both use the module's original ids; drop runs
  first.

```yaml
use:
  - module: bridge_in_mold
    from: cowos_l.yaml
    drop: [lsi_tsv, lsi_tsv_pitch_um, lsi_tsv_d_um]       # no bridge TSV in this family
    rename:
      ri_core: {name: "Bottom mold (bridges, Cu pillars)", material_label: "molding compound (not named)"}
      tiv: {name: "Tall Cu pillars"}
```
- Module params are resolved in the importing family: a module `ref:` to another family's row fails the family
  check, so an importer re-points those params to its own rows or to `analog:`/`template:` specs.
- The module's comment block (see `cowos_l.yaml`) lists what it requires from the importer and what it provides.

## Output notes for repeated hosts

- A part `in:` a repeated host gets the containing host instance id (e.g. `mold_2`) in the JSON `in` field.
- Layers in a repeated host keep `part` = the first instance and add `instances` = every instance id of the host
  (the same stack repeats in each). A vertically repeated host gets one set of layer entries per level (ids
  `<layer id>_<instance>`, `part` = that level's instance), because each level has its own z.
- Vertically repeated parts: each instance has its own `z_um`, the levels add `z_index` (1 = lowest) and
  `explode_group` + (level - 1) x `explode_step`. Arrays between levels name both instances in `between`.

## callouts and insets

```yaml
callouts:
  - {target: rdl_cu, text: "{rdl_n} RDL layers, L/S {rdl_line_um}/{rdl_space_um} um", refs: [<row_id>.<field>]}
insets:
  - {id: d2d, label: "SoC-SoC D2D gap", box_mm: [-1.5, -1.5, 1.5, 1.5], z: ["bottom:interposer", "top:soc"], view: front}
```

Callout `text` is the on-screen label: at most 6 words (the check warns above that); put the explanation in `note`,
the click-tooltip text (same `{param}` rules; its cells join the callout refs). Callout targets may be an instance id
or a template id. Inset `box_mm` entries are view framing (numbers or expressions over params), not rendered
dimensions; `z` anchors give the vertical range and may name a part, a part instance or an array (template id = the
union of its copies, or one array id), e.g. `z: ["bottom:bumps", "top:top"]`.

## Checks

Errors: unknown/missing/empty cells, out-of-family reported cells, bare numbers, templates without a note,
unknown kinds/materials, circular stacking, empty regions or z spans, non-integer repeat counts, vertical repeat
without exactly one of `pitch_um` / `stack`, non-uniform `fill.per` gaps, unknown `in_layer`, bad anchors, unknown
`family_match` keys, `drop` / `rename` names that match nothing, `rename` of geometry fields, template values in text,
a families.yaml that does not parse. Warnings: footprints outside their parent, overlapping solids, layers not filling
the host, array gap != joint height, diameter >= pitch, vertical pitch < part height, summary > 40 words, callout text
> 6 words.
