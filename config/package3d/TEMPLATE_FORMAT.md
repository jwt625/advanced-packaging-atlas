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
routing: {layout_note, vias, nets}   # optional (see "routing")
```

`dim_counts` / `completeness` count every resolved dim once per declared element (params only through the elements
that use them): parts, layers, arrays and, since 2026-10-20, layer `route` dims, via class dims and net dims
(a family without routing is unchanged).

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
technology_name, `papers`, `excl_papers`). All templates use `{families: true}`, so families.yaml is the one place to
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

### Layer `route` (routed conductor levels, 2026-10-20, DevLog-011)

A layer with `role: conductor` may carry `route`; it is then drawn as its `matrix` dielectric with Cu features inside
the viewer's routing window (a full-sheet slab without it). Any other role with `route` is an error.

```yaml
      - {id: bu_cu, name: Build-up Cu, material: copper, role: conductor, h_um: bu_cu_h_um,
         route: {use: signal, dir: alt, line_um: bu_line_um, space_um: bu_space_um, matrix: organic_build_up}}
```

| key | rule |
|---|---|
| `use` | `signal`, `plane`, `pad` or `mixed` (required) |
| `dir` | `x`, `y` or `alt`; required for signal / mixed, optional for plane / pad (omitted from the JSON when not given). `alt` alternates over the repeats of the group, starting at x (repeat 1 = x, 2 = y, ...); the JSON holds the resolved `x` / `y` |
| `line_um`, `space_um` | dimension specs (provenance rules apply; bare numbers rejected); required for signal / mixed, optional for plane / pad (a plane's `space_um` sets the antipad clearance) |
| `matrix` | material key of the dielectric around the Cu (required) |
| `fill` | Cu area fraction in (0, 1], a spec (unitless). Default: signal / mixed = `line_um / (line_um + space_um)` (status `derived` when L/S are reported or derived, `template` when either is a template); plane = 0.85, pad = 0.5 (status `template`, note "generator default, not reported") |

JSON: the layer gets `route: {use, dir?, line_um?, space_um?, matrix, fill, dims}` (resolved numbers; `dims` holds
`line_um`, `space_um`, `fill` entries like every other dim). Route dims count once per layer element in
`dim_counts` / `completeness`, like the layer's own dims.

## arrays (interconnect fields)

Keys: `id`, `name`, `kind` (c4, microbump, cu_pillar, hybrid_bond, tsv, tgv, bga, rdl_via, pth), `pitch_um` (required),
`diameter_um`, `height_um`, `note`, optional `between: [upper, lower]` labels. Optional (2026-10-20): `pad_um` (landing
pad / UBM diameter on the routed level the array touches) and `opening_um` (solder-resist / passivation opening
diameter): normal dimension specs, > 0 (error otherwise), a warning when >= `pitch_um`; emitted on the array as
`pad_um` / `opening_um` with `dims` entries and counted in `dim_counts` / `completeness`. Optional `cap_h_um` (R2,
2026-10-20): solder cap height at the array's lower end (Cu pillar / micro-bump drawn as Cu column + solder cap;
absent = one material); a normal spec, needs `height_um`, 0 < `cap_h_um` < `height_um` (error otherwise); emitted as
`cap_h_um` (after `opening_um`) with a `dims` entry, counted in completeness. Placement:

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

## routing (mock-up vias and nets, 2026-10-20, DevLog-011)

Top-level `routing` holds via classes and net classes; the viewer synthesizes the geometry deterministically from
them. `layout_note` is required when `routing` exists.

```yaml
routing:
  layout_note: "mock-up routing: net layout, shares and jogs are illustrative; dims carry their own status"
  vias:
    - {id: mv_top, kind: microvia, through: bu_d, diameter_um: mvia_d_um, land_um: mvia_land_um, fill: filled}
    - {id: pth, kind: pth, through: sbt_core, diameter_um: pth_d_um, pitch_um: pth_pitch_um, fill: plugged,
       wall_um: pth_wall_um}
  nets:
    - {id: io, kind: vertical, from: bump, to: bga, style: staggered, jog: [bu_cu_3, bb_cu], share: 0.4}
    - {id: pg, kind: plane_tie, from: bga, plane: bb_pl, share: 0.3}
```

### Via classes

Keys: `id`, `name?`, `kind` (microvia, rdl_via, beol_via, pth, tsv, tgv, tdv, bridge_via, tmv), `through`,
`diameter_um` (required), `bottom_diameter_um?` (taper), `land_um?` (capture / landing pad), `pitch_um?` (grid
vias: the grid nets pick from), `fill?` (filled, conformal, plugged), `plug?`, `region?`, `wall_um?` (plating),
`liner_um?` (TSV liner), `note?`. Every `_um` key is a dimension spec (a bare number is an error). Unknown keys are
errors.

- `plug` (2026-10-20): `resin`, `copper` or `none`, the material of the PTH / TGV core; text, not a dim. Only with
  `fill: plugged` or `fill: conformal` (error otherwise).
- `region` (2026-10-20): where the via class may be placed, same forms as array regions: `{part: <id>}`,
  `{intersect: [ids]}`, `{subtract: [ids]}` (combinable with `part`), or explicit `{x_mm, y_mm, w_mm, d_mm}` specs
  (all four, nothing else; explicit region specs are view placement and are not counted in `completeness`, as for
  arrays). Without `part`, the base is the host level's instances. Resolved per via entry to `regions: [{x_mm, y_mm,
  w_mm, d_mm}]` (package frame, footprint centers, like array `region`; `subtract` can give several rectangles).
  Errors: unknown keys or parts, a partial or mixed explicit box, w/d <= 0, an empty result. Warning: a rectangle not
  inside the host. Without `region` the key is absent (the viewer uses the host footprint). Module `rename` updates
  region part ids.
- `cluster` (R2, 2026-10-20): `{n: <count spec>, pitch_um: <spec>}` (exactly these keys): n vias on a compact grid
  (ceil(sqrt n) columns) at `pitch_um`, centered on each site (grid site, net path point or pad); e.g. TSV pairs or
  groups, hybrid-bond vias per pad. Errors: n not an integer >= 1, pitch <= 0, bare numbers. Warnings: cluster extent
  ((ceil(sqrt n) - 1) x pitch + diameter) > the via's `pitch_um` or `land_um`; cluster pitch < diameter (n > 1).
  JSON: `cluster: {n, pitch_um, dims: {n, pitch_um}}` (nested dims like a layer `route`); counted once per via class.

`through` names one of:

| through | entries | span |
|---|---|---|
| a layer id (`bu_d_2`, or the id of an unrepeated layer) | one, id = via id | that layer |
| the template id of a repeated layer (`bu_d`) | one per repeat (and per level of a stacked host); id = via id + the layer's suffix (`mv_top_1..n`, `v_2_core_3`); `template_id` = via id | each repeat |
| a layer group id | one per host level | the whole group |
| a part id | one per vertical level (`<id>_<instance>` / `_z<k>` like layers) | the full part thickness |

`upper` / `lower` = the layer directly above / below the span inside the same host level; it must be a conductor
layer, or the span edge must be the host's top / bottom face (then `null`). Part spans always have `null` ends.
Anything else (a dielectric / passivation neighbour, or an unlayered gap) is an error.

JSON entry: `{id, template_id, name, kind, part (host template id), through (resolved layer id, group id, part id or
level instance id), through_kind (layer | group | part), z_um, h_um, upper, lower, instances? (host instance ids when
the host level has several xy instances), regions?, diameter_um, bottom_diameter_um?, land_um?, pitch_um?, wall_um?,
liner_um?, fill?, plug?, cluster?, note?, dims}`. Via dims count once per via class.

### Net classes

Keys: `id`, `kind`, `from`, `to?`, `style?`, `jog?`, `levels?`, `plane?`, `share`, `length_um?`, `note?`.

| kind | needs | meaning |
|---|---|---|
| `vertical` | from, to | top endpoint array down to a bottom one; `style` stacked (default) or staggered; lateral jogs only on `jog` levels |
| `lateral` | from, to, levels | wires between two bump fields on the listed levels (D2D) |
| `plane_tie` | from, plane | bumps tied down to one plane level |
| `escape` | from, levels | short traces leaving a bump field (`length_um` optional) |

- `from` / `to` are array ids (template ids or concrete output ids).
- `jog`, `levels`, `plane` name layers: a concrete id (`bu_cu_3`) or a repeated layer's template id (`bb_cu` = all
  its repeats and levels). The JSON lists the resolved concrete ids. `jog` / `levels` must be conductor layers with
  `route` use signal or mixed; `plane` must resolve to exactly one layer with use plane. `style` is only for vertical
  nets.
- `share` (fraction in (0, 1]) and `length_um` (> 0) may be bare numbers: the only dims where a bare number is allowed.
  They become template dims whose note is `layout_note`. A spec is also accepted.
- JSON entry: `{id, kind, from, to?, style? (vertical), jog?, levels?, plane?, share, length_um?, note?, dims}`. Net
  dims count once per net class.

JSON family key: `routing: {layout_note, vias, nets}` (absent when the template has no routing). Callouts may target
a via entry id, a via class id or a net id.

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
    drop: [lsi_tsv, lsi_tsv_pitch_um, lsi_tsv_d_um, lsi_tsv_land_um, lsi_tsv_liner_um]   # no bridge TSV in this family
    rename:
      ri_core: {name: "Bottom mold (bridges, Cu pillars)", material_label: "molding compound (not named)"}
      tiv: {name: "Tall Cu pillars"}
```
- Module params are resolved in the importing family: a module `ref:` to another family's row fails the family
  check, so an importer re-points those params to its own rows or to `analog:`/`template:` specs.
- The module's comment block (see `cowos_l.yaml`) lists what it requires from the importer and what it provides.
- Routing (2026-10-20): a module may hold `routing`. Its via and net classes merge by id like arrays (the template's
  own classes win and come first); the template's `layout_note` wins over the module's. `drop` also takes via / net
  ids and removes via classes whose `through` and nets whose from / to / plane / jog / levels name a dropped element
  (incl. `<layer>_<k>` repeats of a dropped layer element). `rename` also takes via / net ids, and via `through`,
  net from / to / plane / jog / levels follow renamed ids (`bb_cu_2` follows `bb_cu: bk_cu` to `bk_cu_2`).

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

## Template rules (harmonized 2026-10-20, DevLog-011 audit A1 S4 / S5 / S7)

One rule per structure class for dims no family row reports; every family applies it (note text: "harmonized rule").
A family deviates only when its own source shows something else, and the param note says which source.

| structure | rule | basis |
|---|---|---|
| organic build-up microvia land | land = via x 110 / 70 | 001c.147203-a-i1 (pad >= 110 um for a 70 um Cu-filled stacked via; coreless 150 GHz AiP substrate, minimum design rule) |
| glass-core build-up microvia land | land = via + 12 um | tcpmt.2026.3736233-a-i1 (136 / 124 um, "pad 12 um larger than via top", glass-embedded package) |
| PTH land (drilled core, also thin-core through hole) | 1.5 x hole | fig ectc51687.2025.00148-f01 (4-2-4 schematic, scaled by the 500 um TH pitch) |
| PTH wall (plating) | mean of eptc62800.2024.10909809-a-m17..m20 = 14.875 um | minimum barrel Cu of legs 1-4 of a thin-core through hole (11-18.5 um) |
| PTH plug | `fill: plugged, plug: resin` for drilled cores >= 400 um; Cu-filled for thin cores | ROUTING_REF_substrate.md sec. 2 (fig eptc62800.2024.10909809-f04) |
| Si TSV landing pad | 1.5 x TSV | figs ectc.2013.6575597-f06, eptc59621.2023.10457670-f01 (pad wider than the TSV); exception hybrid_bond_d2w (RDL capture pad drawn as the 15 um DBI pad, fig ectc51906.2022.00031-f01) |
| Si TSV grid pitch, TSV ends directly on an endpoint array (no routing level between) | TSV pitch = that array's pitch (one TSV column per joint; clusters drawn as one) | CoWoS C4 on TSV (ectc.2013.6575597-a-i3), Foveros TSV clusters per bump, EMIB-T TSV groups per cavity bump (ectc51846.2026.00051-f03) |
| TSV cluster landing pad (via `cluster`) | land = cluster pitch + 1.5 x TSV diameter (one pad covers the group) | foveros, foveros_direct, emib_t (R2 2026-10-20); Foveros TSV pairs at 15 um (iedm19573.2019.8993637-f01/-f02), EMIB-T groups of 3-4 (ectc51846.2026.00051-f03) |
| Si TSV grid pitch, other cases, no family value | 100 um = eptc59621.2023.10457670-a-i1.pitch_max_um | upper pitch of the row's 50 / 100 um pair, consistent with its ~0.60% TSV pattern density |
| BEOL via + inter-metal dielectric | via and IMD from the same row: 0.3 um via in 0.54 um (ectc51909.2023.00009-a-L06), 0.75 um via in 1.5 um (-L04) | audit A1 S5 (no 0.3 um via in a 1 um IMD) |
| space when only the line is known | space = line | e.g. CoWoS-S Al RDL "5 um pitch" |
| PTH aspect ratio | drilled 200 um holes in 1.2-1.4 mm cores (AR 6-7) are drawn; the DB range 3.7-6.5 has n = 3 | stated in the PTH via notes |

## Checks

Errors: unknown/missing/empty cells, out-of-family reported cells, bare numbers, templates without a note,
unknown kinds/materials, circular stacking, empty regions or z spans, non-integer repeat counts, vertical repeat
without exactly one of `pitch_um` / `stack`, non-uniform `fill.per` gaps, unknown `in_layer`, bad anchors, unknown
`family_match` keys, `drop` / `rename` names that match nothing, `rename` of geometry fields, template values in text,
a families.yaml that does not parse. Routing errors: `route` on a non-conductor layer, unknown `route` / via / net
keys, bad `use` / `dir` / `matrix` / via `kind` / via `fill` / net `kind` / `style`, signal or mixed route without
`dir` / `line_um` / `space_um`, fill outside (0, 1], unknown `through`, a via span whose neighbour above or below is
not a conductor and is not the host face, missing `layout_note`, bare numbers in route or via dims, unknown arrays
or layers in nets, `jog` / `levels` not signal / mixed routed conductors, `plane` not exactly one plane level,
missing `to` / `levels` / `plane` for the net kind, share outside (0, 1], duplicate via / net ids, bad via `plug` or
`plug` without fill plugged / conformal, bad via `region`, array `pad_um` / `opening_um` <= 0, bad via `cluster`,
array `cap_h_um` without `height_um` or outside (0, `height_um`). Warnings: footprints outside their parent, overlapping solids, layers not filling
the host, array gap != joint height, diameter >= pitch, vertical pitch < part height, summary > 40 words, callout text
> 6 words.
