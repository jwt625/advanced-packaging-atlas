# Process-animation flow composition (DevLog-016, lane L34)

Content and provenance of the animated flows in `config/process3d/flows/*.yaml`, geometry in
`config/process3d/geometry/*.yaml` (section 5). `scripts/build_process3d.py` builds `app/static/data/process3d.json`
(contract v1, `config/process3d/CONTRACT.md`). Dated 2026-10-23.

- Content check: `uv run python scripts/check_process_flows.py [--flow ID] [--pending] [--table] [--verbose]`.
- Build: `uv run python scripts/build_process3d.py [--check] [--draft] [--flow ID] [--out PATH]` (section 6).

| file | json id | family | kind | backbone(s) | steps | ops | routes |
|---|---|---|---|---|---|---|---|
| `cowos_s.yaml` | `cowos_s_composite` | cowos_s | composite | `ectc.2013.6575597-F1`, `-F2` | 28 | 29 | main |
| `emib.yaml` | `emib_composite` | emib (route emib_t: emib_t) | composite | `ectc.2016.201-F2`; `ectc51687.2025.00051-F1` | 18 | 21 | emib (12 steps), emib_t (13) |
| `2p5d_120mm.yaml` | `ectc51687.2025.00027-F1` | null, label "Si interposer 2.5D" | paper | `ectc51687.2025.00027-F1` | 31 (27 per route) | 0 | lts_lts, lts_sac, sac_lts |

## 1. Format

### 1.1 Provenance specs (every value)

Same spirit as `config/package3d/TEMPLATE_FORMAT.md`; a bare value is an error.

| spec | status | meaning |
|---|---|---|
| `{ref: "<row_id>.<field>"}` | reported | one DB cell (row id = the key of any `data/*.csv` table). Error on a missing row / field or an empty cell. Numeric keys need a numeric cell. |
| `{ref: "<row>.<text field>", value: N, scale?: k}` | reported | a number quoted in a text cell (`conditions`, `target`, `notes`, ...); the checker requires N to appear in the cell; `scale` = exact unit conversion (nm -> um 0.001). |
| `{analog: "<row>.<field>", note, value?}` | template | a DB cell of another build used as a stand-in; note says which build and why. |
| `{derived: "<expr>", refs: [cells]}` | derived | arithmetic over `r0, r1, ...` and flow geometry names; any template / pending input downgrades the result (never upgrades). |
| `{template: <number, text or expr>, note, source?, refs?}` | template | not reported; rationale required; `source` = public citation (here: RESEARCH_TOOLS_ASSEMBLY.md row IDs); expressions over `r0..` (refs) and geometry names. |
| `{package3d: "[family[@variant].]param"}` | status of that param | a resolved package3d template param (read from `app/static/data/package3d.json`; default family = the flow's `package3d`); keeps the 3D tab and the process view on one geometry. |
| `{geom: "<name>"}` | status of that name | the flow's own geometry entry. |
| `{pending: "<quantity, unit, what is needed>"}` | pending | no source yet and the value drives geometry or op physics (drawing_required, `PENDING.md`). Never a number. Strict build error. |
| `{na: "<quantity, why>"}` | na | "not reported" (coordinator 2026-10-23): HUD-only values (doses, tool names, bath temperatures, times, optional op inputs); allowed only in `hud`, `targets`, `equipment`; never feeds a computation, body or required op arg. Passes strict mode; JSON PDim / PText `{status: na, note: "N/A, not reported: ..."}` without value. |

Ref scope (checker-enforced; coordinator rule after audit A1 M11, 2026-10-23): in a composite flow a `ref` must
point to a paper of the flow's `family_papers` (cowos_s: the TSMC CoWoS papers ectc.2013.6575597 and
ectc51909.2023.00174; ectc51909.2023.00135 is a MediaTek CoWoS MCM paper and ectc51687.2025.00055 a TSMC SoIC paper, so
both are out of family since audit A2 n8; emib: the Intel EMIB / EMIB-T papers). A cell of
any other paper is an `analog` (template, ref shown) even when its row orders an inserted or expansion step, so
"reported" in a CoWoS-S or EMIB flow means a CoWoS or EMIB paper states the number. A paper flow (00027) keeps its
own paper's values as reported (`family_papers` = the paper, plus the step's own rows). Template / derived `refs`
outside that scope make the value template. Units: the key suffix (`_c`, `_s`,
`_n`, `_mpa`, `_um`, `_mm`, `_ma_cm2`, `_mj_cm2`, `_c_per_min`) must match the cell's column suffix.

Thickness rule: HUD thicknesses that define drawn geometry (film, layer, bump heights) use the flow's geometry
(`geom` / `package3d`), so the HUD and the 3D body agree; process conditions (T, t, F, P, J, dose) come from the
step's DB row or an analog. Counts below include `geom` references, so a pending geometry value counts once per use.

### 1.2 Top level

```yaml
id: cowos_s                   # file id; json_id = Flow.id in process3d.json
json_id: cowos_s_composite
family: cowos_s               # package3d family, or null + family_label
kind: composite               # composite | paper
summary: "..."
backbone: {flow, note}        # composite only (informative; the checked list is routes.*.backbones)
family_papers: [paper ids]    # ref scope (1.1)
package3d: cowos_s            # default family for {package3d: param}
pieces: {id: {kind, name, routes?, note?}}    # contract Piece kinds: wafer panel strip die substrate board carrier stiffener stencil other
start: {piece: {note, evidence: [rows], values: {key: spec}}}   # incoming state of each piece
geometry: {name: spec}        # per-flow dims (package3d params reused where they fit)
groups: {id: {name, order_source: <flow_id>, repeat?: spec, note}}   # repeated op blocks (one damascene level x3)
routes: {id: {name, default?, family?, backbones: [flow ids], note?}}  # a route is a filter on the step order
steps: [Step]
```

### 1.3 Steps and ops (contract granularity)

One step = one DB step (step i/N counts DB steps); a composite DB step carries `ops` (its sub-steps), each with its
own source row, equipment and values. Inserted steps (not in the backbone flow) are steps with `order.kind:
inserted`. Value-only route differences are separate steps with disjoint `routes`.

```yaml
- id: tsv_etch                # stable (URL)
  name: "..."
  category: tsv_tgv_formation # = the DB row's category (checker); the op carries the operation type
  piece: interposer_wafer     # root piece the step works on
  routes: [emib_t]            # absent = all routes
  order: {kind: backbone | paper | inserted, db: <step_id>, evidence: [rows], represents: [step ids], note}
  equipment: spec             # steps without ops
  hud: {temp_c, temp_c_max, time_s, ramp_c_per_min, force_n, pressure_mpa, atmosphere, thickness_um,
        thickness_in_um, current_density_ma_cm2, dose_mj_cm2}: spec      # contract HudParam kind condition
  targets: {name: spec}       # stated geometry targets (contract HudParam kind target / material)
  physics: {name: spec}       # required op Dims the paper does not state (liquidus_c, gamma_n_m, mu_pa_s,
                              # theta_deg, kerf_um, etch_per_cycle_um, feed_um_s, rr_nm_min, step_coverage, ...)
  ops:
    - id: pattern
      name: "..."
      category: lithography   # schema step_category of the operation
      group: cu_damascene     # optional repeat group
      order: {kind: self | expansion, db: <source step_id>, evidence: [rows], note}   # self = the step's own DB row
      equipment / hud / targets / physics: as on a step
```

- `order.kind`: `backbone` = a step of a route's backbone flow; `paper` = a step of the paper flow; `inserted` = a DB
  step of another flow put at a position the backbone does not cover (note: why here, citing the flow that shows
  the position); op `expansion` = a sub-step whose order comes from a DB flow of the same module (`groups.*.order_source`
  or the note).
- `represents`: the step also stands for a DB step of another route's backbone (EMIB-T steps that 00051 says are
  "same as EMIB").
- The checker requires, per route, every step of each backbone flow once, in DB (route, seq) order; for a paper
  flow, nothing else.

### 1.4 Required HUD keys per category (pending allowed)

| category | keys |
|---|---|
| lithography | dose_mj_cm2, thickness_um (resist) |
| etch_dry, tsv_tgv_formation, desmear | time_s |
| via_reveal, grinding_thinning | thickness_in_um, thickness_um |
| deposition_cvd | temp_c, thickness_um |
| deposition_pvd, deposition_other, surface_finish, bumping | thickness_um |
| electroplating | current_density_ma_cm2, time_s, thickness_um |
| electroless | temp_c, thickness_um |
| sap_msap | current_density_ma_cm2, thickness_um |
| cmp | pressure_mpa, time_s |
| bonding | temp_c, time_s, force_n |
| die_attach | temp_c, force_n |
| temporary_bonding | temp_c, time_s, thickness_um |
| underfill, dispense | temp_c |
| cure, anneal | temp_c, time_s |
| molding | temp_c, time_s, force_n or pressure_mpa |
| reflow | temp_c_max |
| lamination | temp_c, time_s, pressure_mpa, thickness_um |

Steps with ops are checked per op. Other categories (cleaning, inspection, dicing, singulation, debonding,
assembly, ball_attach, resist_strip, etch_other, etch_wet, laser_drill, other) have no required key.

## 2. Status counts (2026-10-23, after the audit A2 data round)

Content checker (`check_process_flows.py`; flow file + companion geometry block):

| flow | steps (ops) | reported | derived | template (of which analog) | na | pending |
|---|---|---|---|---|---|---|
| 2p5d_120mm | 31 (0) | 101 | 10 | 91 (26) | 0 | 0 |
| cowos_s | 29 (29) | 35 | 2 | 274 (72) | 2 | 0 |
| emib | 18 (21) | 34 | 2 | 273 (54) | 0 | 0 |

Builder (`build_process3d.py`, strict; every PDim in the JSON, incl. bodies, sites, ops and profiles):

| flow | steps | op calls | bodies | reported | derived | template | na | completeness r / d / t / na |
|---|---|---|---|---|---|---|---|---|
| 2p5d_120mm | 31 (27 per route) | 52 | 58 | 164 | 87 | 222 | 0 | 0.35 / 0.18 / 0.47 / 0 |
| cowos_s | 29 | 84 | 54 | 29 | 57 | 416 | 2 | 0.06 / 0.11 / 0.83 / 0.004 |
| emib | 18 (12 / 13) | 106 | 128 | 32 | 96 | 660 | 0 | 0.04 / 0.12 / 0.84 / 0 |

`app/static/data/process3d.json`: strict build, `"contract": "1.1"`, no draft flag, 0 pendings, 0.72 MB, 379 refs;
byte-identical across `PYTHONHASHSEED` values (sorted expression names, audit A2 n9).
The drop in reported share of the composites is the M11 rule (out-of-family cells now analog); the body / op growth
is the second EMIB bridge, per-field coarse vias, TIM / sealant / lid foot, CoWoS TSV landings, passivation openings,
D2 pads and the 00027 pads under all ten dies.

Template counts include package3d params whose status is template and generic equipment types where no tool is
named. Public values come from `RESEARCH_TOOLS_ASSEMBLY.md` (lane L33, row IDs A..) and `RESEARCH_TOOLS_FAB.md`
(lane L32, row IDs F..), always as template with `source` = row ID; med / low confidence rows say so in the note.
CMP is driven by the removal rate (F105; the Preston constant is not computable, F109); the TSV bottom-up rate (F73)
and the Bosch cycle / scallop set (F2, F3) are low / med confidence.

## 3. Composition decisions (for review)

1. CoWoS-S continues with the TSMC paper's own F2 (backside reveal to 100 um, SnPb eutectic C4 plated directly on
   the TSV at 200 um pitch, singulation, FCBGA assembly) and F4 (C4 underfill), not with the Cu-pillar C4 at 150 um
   of the package3d base TV (00135). The C4 size is pending (no eutectic C4 size in the DB).
2. CoWoS-S includes UF1 + cure, compression mold + PMC and mold grind (00135 has mold between dies and UF1 / UF2;
   the 2013 TV reports no mold) and a glass carrier bonded on the ground mold side (no carrier in 2013; position
   from 00027 / 00155 CoW-first flows). A no-mold 2013-exact route and a lid / TIM finish (00174-F3) are not built.
3. CoWoS-S finishes with a Cu ring (00135 a-c5) in the TSMC ring-type order (00174-F2: ring, then BGA); the ring
   adhesive cure is from 00155-F3. Board mount (2013-F3) is out of scope.
4. CoWoS-S CoW joining: 2013 does not say TCB (bonding_method unspecified); the bond values are analogs of a 40 um
   pitch TCB on a 12-inch Si interposer wafer (00155-F1-s08), shown as template.
5. Expansions with a DB source of the same module: TSV litho (eptc59621-F1-s01); 3 Cu damascene levels as 6 ops x3
   (00060-F1 s01-s08) + Al RDL 3 ops (eptc67330-F2 s07-s09); interposer uBump 5 ops (00155-F1 s01-s06); reveal 4
   ops (eptc59621-F1 s14-s17); C4 6 ops (00155-F2 s05-s12); on-substrate 3 ops (00027-F1 s14-s16). Not added
   because no DB source shows them in this module position: TSV anneal (only 00009 TSV-middle), the Al-to-Cu via
   level, the optional MIM, cleans between damascene ops. Inserted step: front-side passivation (eptc59621-F1-s11).
6. EMIB bridge dies arrive pre-fabricated (start state). Reason: both backbones start at the substrate with the
   bridge as an input; the bridge's own flow (ectc.2016.201-F1: BEOL, thinning < 75 um, singulation) is a separate
   generic_platform wafer-fab flow with no conditions, and 00051 gives no EMIB-T bridge fab flow. The incoming
   bridge carries its geometry from package3d emib / emib_t.
7. EMIB build-up module (9 ops x (bu_n - 1)): op order from ectc51909.2023.00298-F1 (glass-core SAP, the cleanest
   ABF module sequence in the DB); values from the closest typed row per op (00103 ABF lamination / cure / plating,
   00021 CO2 laser via, 00359 plasma desmear, 00360 electroless seed). Mixed sources by design; each value cites its
   row. Repeat count = package3d emib bu_n (analog 5) - 1 = 4 (template).
8. EMIB categories kept from the DB: via drilling (2016-F2-s05) and EMIB-T via formation (00051-F1-s08) are `other`
   in the DB; their single op is drawn as `laser_drill` (template choice, said so in the op note). Via plating
   (`deposition_other`) is drawn as SAP electroplating ops.
9. EMIB bump side: 2016 does not say; bumps are formed on the substrate, as the 00051 EMIB baseline flow does
   (F2-s04 "surface layer and first level interconnect formation").
10. EMIB-T shares build-up, via plating and final assembly with EMIB (00051 Sec. III.B: "no significant process
    difference before and after these few key steps"); its geometry is package3d emib_t (EMIB25T base) except the
    FLI pitch, which follows the 00051 TV (45 um).
11. EMIB finish after the 2016 backbone: underfill cure (00365-F6, values not disclosed), IHS lid with polymer TIM
    and LTS BGA (00061-F3 EMIB CHIPS prototype; order confirmed by 00012-F1 standard EMIB MCP flow).
12. 2p5d_120mm: three routes for the three board-joint combinations the paper investigates; s22 / s23 / s25 are
    separate steps per route. Stiffener (size L, SUS430, the paper's preferred) and substrate A / B stay defaults.
    The paper never mentions TSVs; the flow draws none. No post-mold cure is in this paper's
    flow (the earlier TV 00155 2024 shows one); not added.
13. Analog TCB / mold / reflow values in 2p5d come from the same tool set (FCB3 / DAG810 / SNR-1065GT, 00155) or the
    same mold maker (00322), always template.
14. Geometry floor plans are templates where the papers give sizes but no positions: 00027 from the undimensioned
    Fig. 1(a) (two Die A stacked along y, four Die B per side, Die B rotated 90 deg); CoWoS-S from the 2013 TV sizes
    (chip C on one side, two chips D side by side; the stated sizes tile 24 mm); EMIB from the package3d emib layout
    (DIE 2 | DIE 1 | DIE 3, bridge under each gap). Die gaps are analog (TSMC D2D gap) or package3d template.
15. CoWoS-S geometry follows the 2013 TV (26 x 24 mm interposer, 24 x 14 and 12 x 7 mm chips, 40 x 40 mm substrate)
    rather than the package3d base (00135, 85 x 85 mm); the ring width is a template that clears the interposer on
    the 40 mm substrate. The content geometry `sbt_w_mm` / `sbt_d_mm` now point to the 2013 substrate.
16. Line patterns (contract v1.1): each damascene level is an oxide slab with open `lines` (trench depth = Cu level
    thickness), opened by `etch_lines`, filled by a `line_fill` with overburden, then CMP; the barrier / seed film
    is drawn on the field only. The Al RDL is an Al slab whose open lines are the etched spaces (line = space,
    template). Resist strips that the DB module does not list are added as ops (labelled).
17. TSV reveal (coordinator 2026-10-23, replaces the earlier touch-polish drawing): grind stops 10 um above the TSV
    bottoms (analog 110 um grind, F140 5-10 um); Si recess dry etch (F141, > 9 um/min, 200:1 to the liner) exposes
    liner-covered tips protruding `protr_um` = 5 um (F140 ~5 um, range 2-5; F142, F143); final Si thickness
    `si_final_um` = TSV depth (100 um, 2013) - protrusion = 95 um (derived template; 2013 states 100 um, read here as
    the TSV depth reached by the reveal); liner loss = recess / 200 = 0.075 um < the 0.17 um liner bottom; backside
    passivation (SiN / oxide) wraps the tips (`tsv_tip` post); CMP opens the tips by polishing the nails flush with
    the passivation surface (time from the F105 rate), then the C4 sits on the tips. The other flows have no reveal
    (00027 states no TSV; the EMIB-T bridge arrives revealed and bumped).
18. EMIB-T route is drawn on the EMIB substrate and dies (package3d emib); bridge, cavity (through levels 1-4 to the
    core-top Cu), cavity-side joints, TSVs and FLI pitch follow package3d emib_t. EMIB bridge on adhesive in a cavity
    through levels 2-4 (package3d emib depths).
19. Build-up Cu levels are slabs with lines in an ABF matrix (the spaces fill at the next lamination); build-up via
    columns are drawn only under the three coarse-bump fields (one per die), which keep out of the bridge band
    (audit A1 M7; replaces the whole-substrate via grid).
20. Values filled from the research files this pass (template, source = row ID): Bosch 0.79 um / 13 s per loop,
    scallop 0.265 um (F2, F3, med); liner bottom coverage 0.43 (F20); seed bottom 0.1 / side 0.03 (F34-F36); TSV
    superfill 0.5 um/min (F73, low); CMP 3 psi, 1.027 um/min (F102, F105); grinding feeds (F124-F126); recess 9
    um/min (F141, med); kerf 50 um (F164); DFR dose 100 mJ/cm2 (F80, low); ECP Faraday rate / efficiency (F70, F71);
    Cu pillar 5 ASD (F62); underfill viscosities (A104 TDS at 25 C; A114 derived calibration, low), contact angle 30
    deg (A111 range middle), dispense preheat 70 C (A99), FCBGA CUF cure 150 C 2 h (A106), SAC305 220 C (A49), BGA
    peak 255 C (A148 DB analog), lid 2 mm (A153, other family), fs-laser cavity (A200 DB analog), CO2 / UV lasers
    (A167-A169). DB analogs added: 700 um glass carrier, 3.2 mm 28-layer PCB, 1.6 mm substrate, 1 mm BGA pitch,
    resist thicknesses (1, 2, 7, 12 um), 775 um full-thickness wafers / dies.
21. Template values with a stated physical rationale (no source row): SnPb eutectic 183 C (now cited:
    itherm.2012.6231522 p.2, cached reference text), 45 um-pitch FLI bump diameter scaled from the 55 um analog
    ratio, FLI height = EMIB analog Cu height, damascene overburden = level Cu thickness, EMIB cavity = bridge + the
    package3d clearance.

## 4. Flow tables (content)

Columns: order source (kind and DB row; ops list the flows that give their order / values), value sources (papers
whose cells the step's values cite; `geometry` = the flow geometry block), status counts of the step's content specs
(reported / derived / template / pending; na not shown). Regenerate with `check_process_flows.py --table`.

### 4.1 cowos_s (CoWoS-S composite)

| # | step | routes | order source | value sources | rep / der / tpl / pend |
|---|---|---|---|---|---|
| 1 | tsv_etch: TSV etch from the front side of the full-thickness wafer | all | backbone: `ectc.2013.6575597-F1-s01`; 2 ops (sub-step order / values: `eptc59621.2023.10457670-F1`) | eptc59621.2023.10457670, geometry, public (L33) | 3 / 0 / 7 / 0 |
| 2 | tsv_liner: Conformal liner oxide on the via sidewall | all | backbone: `ectc.2013.6575597-F1-s02` | geometry, public (L33) | 0 / 0 / 3 / 0 |
| 3 | tsv_barrier_seed: Barrier and seed layer deposition | all | backbone: `ectc.2013.6575597-F1-s03` | ectc51687.2025.00071, eptc59621.2023.10457670, geometry | 0 / 0 / 4 / 0 |
| 4 | tsv_ecp: Cu via fill by electrochemical plating (ECP) | all | backbone: `ectc.2013.6575597-F1-s04` | ectc51909.2023.00009, ectc51909.2023.00307, public (L33) | 0 / 0 / 5 / 0 |
| 5 | tsv_cmp: Cu overburden removal by CMP | all | backbone: `ectc.2013.6575597-F1-s05` | public (L33) | 0 / 0 / 4 / 0 |
| 6 | fs_interconnect: Front-side interconnect: 3 Cu damascene levels + Al RDL | all | backbone: `ectc.2013.6575597-F1-s06`; 9 ops (sub-step order / values: `ectc51687.2025.00060-F1`, `eptc67330.2025.11392196-F2`) | ectc.2013.6575597, ectc51529.2024.00392, ectc51909.2023.00230, geometry, public (L33), tcpmt.2021.3104326 | 1 / 0 / 27 / 0 |
| 7 | fs_passivation: Deposit and pattern the front-side passivation | all | inserted: `eptc59621.2023.10457670-F1-s11` | ectc51846.2026.00065, geometry | 0 / 0 / 2 / 0 |
| 8 | ubump_interposer: uBump formation on the interposer (40 um pitch) | all | backbone: `ectc.2013.6575597-F1-s07`; 5 ops (sub-step order / values: `ectc51909.2023.00155-F1`) | ectc.2013.6575597, ectc51846.2026.00199, ectc51906.2022.00180, ectc51909.2023.00155, geometry, public (L33) | 6 / 0 / 8 / 0 |
| 9 | ubump_logic: uBump formation on the 28 nm and 40 nm logic wafers | all | backbone: `ectc.2013.6575597-F1-s08` | geometry | 1 / 0 / 4 / 0 |
| 10 | logic_thin: Thin the logic wafers | all | backbone: `ectc.2013.6575597-F1-s09` | ectc51529.2024.00322, geometry, public (L33) | 0 / 0 / 4 / 0 |
| 11 | logic_saw: Die-saw the logic wafers | all | backbone: `ectc.2013.6575597-F1-s10` | geometry | 0 / 0 / 2 / 0 |
| 12 | cow_bond: Pick-and-place chip-on-wafer uBump joining on the full-thickness interposer wafer | all | backbone: `ectc.2013.6575597-F1-s11` | ectc51909.2023.00155, geometry | 1 / 0 / 6 / 0 |
| 13 | uf1_dispense: Dispense capillary underfill under the dies (UF1) | all | inserted: `ectc51909.2023.00155-F1-s11` | ectc51909.2023.00155, geometry | 2 / 0 / 3 / 0 |
| 14 | uf1_cure: Cure the uBump underfill | all | inserted: `ectc51529.2024.00322-F1-s03` | ectc51529.2024.00322 | 3 / 0 / 0 / 0 |
| 15 | mold: Compression mold the CoW wafer | all | inserted: `ectc51909.2023.00155-F1-s12` | ectc51909.2023.00155, geometry | 4 / 0 / 1 / 0 |
| 16 | pmc: Post-mold cure | all | inserted: `ectc51909.2023.00155-F1-s13` | ectc51909.2023.00155 | 2 / 0 / 1 / 0 |
| 17 | mold_grind: Grind the mold to expose the die backs | all | inserted: `ectc51909.2023.00155-F1-s15` | ectc51909.2023.00155, geometry | 1 / 0 / 2 / 0 |
| 18 | carrier_bond: Bond a glass carrier with temporary bonding adhesive | all | inserted: `ectc51687.2025.00027-F1-s06` | ectc51687.2025.00027, geometry | 4 / 0 / 1 / 0 |
| 19 | tsv_reveal: CoW wafer backside thinning to reveal the TSVs | all | backbone: `ectc.2013.6575597-F2-s01`; 4 ops (sub-step order / values: `eptc59621.2023.10457670-F1`) | ectc.2013.6575597, ectc51687.2025.00027, geometry, public (L33) | 1 / 0 / 18 / 0 |
| 20 | c4_bumping: C4 bumping: SnPb eutectic plated solder on the TSV backside (200 um pitch) | all | backbone: `ectc.2013.6575597-F2-s02`; 6 ops (sub-step order / values: `ectc51909.2023.00155-F2`) | ectc.2013.6575597, ectc51909.2023.00155, geometry, public (L33) | 5 / 0 / 12 / 0 |
| 21 | debond: Laser debond the glass carrier | all | inserted: `ectc51687.2025.00027-F1-s10` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
| 22 | singulate: Singulate the CoW wafer into units | all | backbone: `ectc.2013.6575597-F2-s03` | ectc51687.2025.00027, geometry | 2 / 0 / 2 / 0 |
| 23 | on_substrate: Assemble the CoW unit to the organic FCBGA substrate | all | backbone: `ectc.2013.6575597-F2-s04`; 3 ops (sub-step order / values: `ectc51687.2025.00027-F1`) | ectc51687.2025.00027, geometry, public (L33) | 3 / 0 / 2 / 0 |
| 24 | uf2_dispense: C4 underfill (UF2) | all | inserted: `ectc.2013.6575597-F4-s01` | geometry, public (L33) | 0 / 0 / 5 / 0 |
| 25 | uf2_cure: Cure the C4 underfill | all | inserted: `ectc51909.2023.00155-F3-s05` | ectc51909.2023.00155 | 2 / 0 / 1 / 0 |
| 26 | ring_attach: Attach the Cu stiffener ring | all | inserted: `ectc51909.2023.00174-F2-s01` | geometry | 1 / 0 / 3 / 0 |
| 27 | ring_cure: Cure the ring adhesive | all | inserted: `ectc51909.2023.00155-F3-s08` | ectc51909.2023.00155 | 2 / 0 / 1 / 0 |
| 28 | bga: BGA ball attach | all | inserted: `ectc51909.2023.00174-F2-s02` | geometry, tcpmt.2025.3614186 | 1 / 0 / 5 / 0 |
### 4.2 emib (EMIB / EMIB-T composite)

| # | step | routes | order source | value sources | rep / der / tpl / pend |
|---|---|---|---|---|---|
| 1 | buildup: Traditional organic build-up until the final build-up layer | all | backbone: `ectc.2016.201-F2-s01` (+ `ectc51687.2025.00051-F1-s01`); 9 ops (sub-step order / values: `ectc51687.2025.00359-F1`, `ectc51846.2026.00103-F1`, `ectc51906.2022.00360-F1`, `ectc51909.2023.00021-F1`, `ectc51909.2023.00298-F1`) | ectc51687.2025.00359, ectc51846.2026.00103, ectc51906.2022.00360, ectc51909.2023.00021, ectc51909.2023.00298, geometry, public (L33) | 17 / 1 / 13 / 0 |
| 2 | cavity: Bridge cavity formation | emib | backbone: `ectc.2016.201-F2-s02` | ectc51687.2025.00378, geometry | 0 / 0 / 3 / 0 |
| 3 | cavity_t: Cavity pad preparation (surface finish) and cavity formation | emib_t | backbone: `ectc51687.2025.00051-F1-s02` | ectc51687.2025.00378, geometry, public (L33) | 0 / 0 / 4 / 0 |
| 4 | bridge_place: Place the bridge in the cavity, held with adhesive | emib | backbone: `ectc.2016.201-F2-s03` | ectc51846.2026.00416, geometry, public (L33) | 1 / 0 / 4 / 0 |
| 5 | bridge_place_t: Place the thin TSV bridge with solder joints to the cavity pads | emib_t | backbone: `ectc51687.2025.00051-F1-s03` | ectc51846.2026.00051, geometry, public (L33) | 0 / 0 / 7 / 0 |
| 6 | bridge_uf_t: Underfill between the TSV bridge back side and the cavity | emib_t | backbone: `ectc51687.2025.00051-F1-s04` | ectc51687.2025.00061, geometry, public (L33) | 0 / 0 / 5 / 0 |
| 7 | final_lam: Final build-up dielectric lamination over the bridge | emib | backbone: `ectc.2016.201-F2-s04`; 2 ops (sub-step order / values: `ectc51846.2026.00103-F1`) | ectc51687.2025.00076, ectc51846.2026.00103, geometry | 1 / 1 / 6 / 0 |
| 8 | encap_t: Dielectric layer encapsulation of the TSV bridge | emib_t | backbone: `ectc51687.2025.00051-F1-s05`; 2 ops (sub-step order / values: `ectc51846.2026.00103-F1`) | ectc51687.2025.00076, ectc51846.2026.00103, geometry | 1 / 1 / 6 / 0 |
| 9 | via_drill: Fine + coarse via drilling: fine vias onto the bridge pads, coarse elsewhere | emib | backbone: `ectc.2016.201-F2-s05`; 1 ops | geometry, public (L33) | 0 / 0 / 5 / 0 |
| 10 | via_t: Via formation to the TSV bridge pads (direct vias) | emib_t | backbone: `ectc51687.2025.00051-F1-s08`; 1 ops | geometry, public (L33) | 1 / 0 / 3 / 0 |
| 11 | via_plating: Via plating | all | backbone: `ectc.2016.201-F2-s06`; 6 ops (sub-step order / values: `ectc51687.2025.00359-F1`, `ectc51906.2022.00360-F1`, `ectc51909.2023.00298-F1`) | ectc51687.2025.00359, ectc51846.2026.00103, ectc51906.2022.00360, ectc51909.2023.00298, geometry, public (L33) | 9 / 0 / 9 / 0 |
| 12 | bumps: Mixed-CD / mixed-pitch bump formation with bump height control | emib | backbone: `ectc.2016.201-F2-s07` | ectc51909.2023.00298, geometry, public (L33) | 2 / 0 / 6 / 0 |
| 13 | fli_t: Surface layer and first-level interconnect formation (45 um pitch) | emib_t | backbone: `ectc51687.2025.00051-F1-s06` | ectc51687.2025.00051, ectc51846.2026.00051, geometry, public (L33) | 1 / 0 / 5 / 0 |
| 14 | tcb: Chip attach by thermocompression bonding (TCB) | all | backbone: `ectc.2016.201-F2-s08` (+ `ectc51687.2025.00051-F1-s07`) | ectc51529.2024.00311, geometry, public (L33) | 0 / 0 / 7 / 0 |
| 15 | cuf: Capillary epoxy underfill | all | backbone: `ectc.2016.201-F2-s09` | ectc51687.2025.00061, geometry, public (L33) | 1 / 0 / 4 / 0 |
| 16 | cuf_cure: Cure the underfill | all | inserted: `ectc51846.2026.00365-F6-s02` | public (L33) | 0 / 0 / 3 / 0 |
| 17 | lid: IHS lid attach with polymer TIM | all | inserted: `ectc51687.2025.00061-F3-s04` | ectc51687.2025.00061, geometry | 1 / 0 / 3 / 0 |
| 18 | bga: BGA ball attach with low-temperature solder | all | inserted: `ectc51687.2025.00061-F3-s05` | geometry, public (L33) | 0 / 0 / 6 / 0 |
### 4.3 2p5d_120mm (ectc51687.2025.00027-F1, as reported)

| # | step | routes | order source | value sources | rep / der / tpl / pend |
|---|---|---|---|---|---|
| 1 | s29: Electroless Ni/Au finish on interposer front Al-Cu pads | all | paper: `ectc51687.2025.00027-F1-s29` | ectc51687.2025.00027 | 4 / 0 / 1 / 0 |
| 2 | s01: Electroplate Cu / Ni / SnAg microbumps on Die A and Die B | all | paper: `ectc51687.2025.00027-F1-s01` | geometry | 5 / 1 / 1 / 0 |
| 3 | s02: TCB of 2 Die A + 8 Die B per unit onto the 12-inch interposer wafer | all | paper: `ectc51687.2025.00027-F1-s02` | ectc51687.2025.00027, ectc51909.2023.00155, geometry | 1 / 0 / 5 / 0 |
| 4 | s03: Jet-dispense capillary underfill into the die-interposer gaps | all | paper: `ectc51687.2025.00027-F1-s03` | ectc51529.2024.00155, ectc51687.2025.00027, public (L33) | 2 / 0 / 4 / 0 |
| 5 | s04: Compression mold the CoW wafer with EMC | all | paper: `ectc51687.2025.00027-F1-s04` | ectc51529.2024.00322, ectc51687.2025.00027, geometry | 1 / 0 / 4 / 0 |
| 6 | s05: Grind the mold top surface to expose the dies | all | paper: `ectc51687.2025.00027-F1-s05` | ectc51687.2025.00027, geometry | 2 / 0 / 2 / 0 |
| 7 | s06: Bond a glass carrier with temporary bonding adhesive to the ground surface | all | paper: `ectc51687.2025.00027-F1-s06` | ectc51687.2025.00027, geometry | 5 / 0 / 1 / 0 |
| 8 | s07: Grind the Si interposer backside to 100 um | all | paper: `ectc51687.2025.00027-F1-s07` | ectc51687.2025.00027, geometry | 2 / 0 / 1 / 0 |
| 9 | s08: Form the backside dielectric layer | all | paper: `ectc51687.2025.00027-F1-s08` | ectc51909.2023.00155, geometry, public (L33) | 0 / 0 / 3 / 0 |
| 10 | s09: Form Cu / SnAg backside bumps by SAP and electroplating | all | paper: `ectc51687.2025.00027-F1-s09` | geometry, public (L33) | 5 / 0 / 2 / 0 |
| 11 | s10: Laser debond the glass carrier | all | paper: `ectc51687.2025.00027-F1-s10` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
| 12 | s11: Dice the interposer wafer into single pieces | all | paper: `ectc51687.2025.00027-F1-s11` | ectc51687.2025.00027, geometry | 1 / 0 / 1 / 0 |
| 13 | s13: Fabricate the 160 x 160 mm 28-layer PCB by batch lamination | all | paper: `ectc51687.2025.00027-F1-s13` | ectc51687.2025.00027, estc60143.2024.10712019, geometry | 1 / 0 / 4 / 0 |
| 14 | s14: Mount the 42 x 46 mm interposer on the 120 x 120 mm substrate with flux | all | paper: `ectc51687.2025.00027-F1-s14` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
| 15 | s15: Reflow the interposer bumps to the substrate | all | paper: `ectc51687.2025.00027-F1-s15` | ectc51687.2025.00027, ectc51909.2023.00155, geometry | 1 / 0 / 2 / 0 |
| 16 | s16: Wash out flux | all | paper: `ectc51687.2025.00027-F1-s16` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
| 17 | s17: X-ray CT check of mounted position accuracy | all | paper: `ectc51687.2025.00027-F1-s17` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
| 18 | s18: Jet-dispense CUF into the interposer-substrate gap | all | paper: `ectc51687.2025.00027-F1-s18` | ectc51687.2025.00027, public (L33) | 1 / 0 / 4 / 0 |
| 19 | s19: Cure the bottom CUF | all | paper: `ectc51687.2025.00027-F1-s19` | ectc51687.2025.00027 | 2 / 0 / 1 / 0 |
| 20 | s20: Fix the 2.0 mm stiffener on the substrate with silicone glue | all | paper: `ectc51687.2025.00027-F1-s20` | ectc51687.2025.00027, geometry | 3 / 0 / 1 / 0 |
| 21 | s21: Cure the stiffener glue | all | paper: `ectc51687.2025.00027-F1-s21` | ectc51687.2025.00027 | 2 / 0 / 1 / 0 |
| 22 | s22_lts: Attach 0.5 mm LTS (Sn-58Bi) solder balls to the substrate bottom | lts_lts, lts_sac | paper: `ectc51687.2025.00027-F1-s22` | ectc51687.2025.00027, geometry | 2 / 0 / 4 / 0 |
| 23 | s22_sac: Attach 0.5 mm SAC (Sn-3.0Ag-0.5Cu) solder balls to the substrate bottom | sac_lts | paper: `ectc51687.2025.00027-F1-s22` | ectc51687.2025.00027, geometry, tcpmt.2025.3614186 | 3 / 0 / 3 / 0 |
| 24 | s23_lts: Print LTS (Sn-58Bi) solder paste on the PCB | lts_lts, sac_lts | paper: `ectc51687.2025.00027-F1-s23` | ectc51687.2025.00027, geometry | 1 / 0 / 2 / 0 |
| 25 | s23_sac: Print SAC (Sn-3.0Ag-0.5Cu) solder paste on the PCB | lts_sac | paper: `ectc51687.2025.00027-F1-s23` | ectc51687.2025.00027, geometry | 1 / 0 / 2 / 0 |
| 26 | s24: Mount the package on the PCB | all | paper: `ectc51687.2025.00027-F1-s24` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
| 27 | s25_lts_lts: Reflow the package to the PCB (LTS ball / LTS paste) | lts_lts | paper: `ectc51687.2025.00027-F1-s25` | ectc51687.2025.00027, geometry | 2 / 0 / 1 / 0 |
| 28 | s25_lts_sac: Reflow the package to the PCB (LTS ball / SAC paste) | lts_sac | paper: `ectc51687.2025.00027-F1-s25` | ectc51687.2025.00027, geometry | 3 / 0 / 1 / 0 |
| 29 | s25_sac_lts: Reflow the package to the PCB (SAC ball / LTS paste) | sac_lts | paper: `ectc51687.2025.00027-F1-s25` | ectc51687.2025.00027, geometry | 3 / 0 / 1 / 0 |
| 30 | s26: Flux cleaning after board mount | all | paper: `ectc51687.2025.00027-F1-s26` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
| 31 | s27: X-ray CT for solder bridges and positional accuracy after board reflow | all | paper: `ectc51687.2025.00027-F1-s27` | ectc51687.2025.00027 | 1 / 0 / 0 / 0 |
## 5. Geometry companion (`config/process3d/geometry/<flow id>.yaml`)

One file per flow; it carries everything the contract needs beyond content: pieces' outlines and frames, sites,
bodies, profiles, and per-step orientation, view and op calls. Values use the same specs as section 1.1, plus:

- A bare string or number in a dimension field (a key whose suffix gives a unit, e.g. `z_um`, `w_mm`, `cov_*`) is a
  derived expression over geometry names; its status follows its inputs (any template input makes it template; the
  note then names those inputs). `"0"` is a datum. Plain numbers are allowed only for view parameters (`block`,
  `view`, `rot_deg`, `w`).
- `geometry:` adds names to the flow geometry (merged into the content flow; duplicates are errors).
- `repeat_over: {n: <spec>, var: i}` on a site, body or op call expands it n times; `{i}` in ids / labels and `i`
  in expressions take 1..n. Ops of a content op that belongs to a repeated group (`groups.<id>.repeat`) are expanded
  the same way.
- Op-call meta keys (stripped from the JSON): `only: {i: [1]}` / `except: {i: [1]}` keep a call for some group
  repeats only (CoWoS level-1 TSV landing); `time: true` marks the call that owns the content's `hud.time_s`.
- Every solder body carries its alloy's `liquidus_c` (contract 15.19, audit A1 C1): the engine melts each body from
  T(t) or the op's peak against that value, and remelts earlier joints in later mass reflows.

```yaml
note: "..."                          # Flow.note
geometry: {name: spec}
pieces:                               # keyed by the content `pieces` ids
  <piece>: {carrier: {shape: disk, diameter_mm} | {shape: rect, w_mm, d_mm}, unit: {w_um, d_um},
            repeat?: {pitch_x_um, pitch_y_um}, block: {x0_um, x1_um, y0_um, y1_um}, initial: bool,
            cell_site?: <site>}       # default cell site of steps on this piece
sites: [{id, piece, name, rect: {x_um, y_um, w_um, d_um}, pitch_x_um, pitch_y_um?, pattern}]
bodies: [{id, name, piece, kind, material, label?, initial?, routes?, group?, note?, <kind fields>}]
profiles: [{id, q: T|F|P, unit, trace?, label?, note, points: [[t_spec, value_spec], ...]}]
steps:
  <step id>: {orient?: up|down, view?: {primary, pip, cell_site, block?}, weight?, phases?, calls?: [OpCall]}
  <step id>.<op id>: [OpCall]          # steps with content ops: calls per content op
```

Conventions: piece frame z = 0 at the lowest point of the piece's as-built bodies (substrates: BGA ball bottom, so
every z >= 0); slabs / films / posts: `z_um` = lowest z; a solder body created while the piece faces down (backside
bumps, C4, BGA) carries `dir: down` (v1.1): base plane at `z_um`, extent `[z_um - h_um, z_um]`. Bodies of pieces that join later (carrier, ring,
lid, bridges, dies) are `initial: true` (they exist with their piece). Route-specific bodies carry `routes`; an op of a
shared step may list bodies of several routes, and a body outside the active route is ignored (route filter).

Op calls: contract section 10 args; ids are body / piece / site / profile ids; dimension args are specs or
expressions. Args not given are filled from the content op / step (physics first, then hud, then targets):
etch_per_cycle_um, cycle_s, temp_c, pressure_mpa, dose_mj_cm2, current_density_ma_cm2, bottom_up_um_min,
rr_nm_min, liquidus_c, peak_c (from temp_c_max; reflow and ball_attach), stage_c (from temp_c), gamma / mu / theta,
kerf_um, stencil_um (from thickness_um), cmp pressure_kpa (from pressure_mpa x 1000); `duration_s` from the hud
`time_s`, only on the call that owns it (audit A1 M10): the call marked `time: true`, else the only call whose op
takes a time-based duration; several candidates without a mark are an error. Added ops (e.g. resist strips the DB
module does not list) get no `duration_s`: real time not reported, playback weight stays a view constant. An optional arg
whose source is pending is left out (the HUD still shows it as pending); a required arg stays (strict error). Each op
gets a default tool id (contract table 10, method-dependent: laser etch_via -> laser_drill, CVD deposit -> cvd,
electroless -> wet_bench, dry-film / vacuum coat -> laminator).

HUD: step and op `hud` (kind condition), `targets` (kind target; text targets kind material), `physics` (kind
condition), op equipment (kind equipment, label "<op>: equipment"); step equipment is `Step.equipment` (PText).
Default views: wafer-scale steps (grind, carrier bond / debond, dicing, singulation) work + block PiP; assembly-like
steps (bonding, die attach, underfill, reflow, molding, cure, assembly, ball attach, cleaning, inspection,
lamination) block + work PiP; everything else cell + work PiP with the piece's `cell_site`.

## 6. Builder (`scripts/build_process3d.py`)

- Reuses `check_process_flows.py` (FlowChecker.resolve_full: same specs, ref scope, units) for every value; refs
  table in the package3d.json shape (`R<n>` -> paper, row, field, locator, basis, source, value, unit, tv;
  qualifiers kept); package3d params bring their own cells.
- PDim: reported = `ref`; derived = `formula` + `values` + `refs` (leaf cells); template = `note` (+ `source`,
  `refs`, `formula`). PText for equipment / material / atmosphere.
- Modes: strict (default: any pending is an error, JSON written only without errors); `--draft` (a pending becomes
  a template PDim with note `pending: <quantity>` and no `value`; the file gets `"draft": true` and a top-level
  `pending: [{flow, where, quantity}]`); `--check` (no write); `--out PATH`. `na` values pass both modes; `na`
  outside the HUD (bodies, sites, profiles, op args) is an error.
- Checks (contract section 13): PDim status rules; id references; body kinds per op arg; creation order per route
  (no use before the creating op, none after a removing strip); one default route, unique ids, monotone `n`;
  required op dims; z >= 0, holes inside the piece, openings smaller than their site pitch, solder volume > 0,
  grind / CMP planes inside the piece; joined-piece alignment (each solder site of the placed piece, after flip /
  rotation / placement, lands on a target site of the same pitch within half a pitch); every step and content op has
  op calls; unknown op args; companion ASCII. Completeness = status shares over every PDim of the flow (`n` = count).
- Negative cases (2026-10-23, scratch only): unknown body, use before creation, body kind mismatch, use after a strip,
  misaligned joint, z < 0, opening >= pitch, missing required op dim, grind plane outside the piece, missing op
  call, `na` in geometry, ambiguous time owner, repeated call naming a missing body, unknown op arg (builder, 15);
  missing row, empty cell, unit mismatch, out of scope, bare number, missing HUD key, text value, bad DB row, order
  swap, non-ASCII, template without note, composite ref to a non-family cell (CoWoS mold row, 00027 debond row)
  (checker, 13): each fires.

## 7. Pendings and `na`

All 10 drawing_required and 32 of 34 hud_only values are filled from `RESEARCH_PENDING.md` (lane L39; status per # in
`PENDING.md` section 3). Kept `na` (coordinator rule: a source from a different process generation or chemistry is
not used): #14 TSV exposure dose (only a gh-line broadband value, P27), #24 Al RDL etch time (1984 CCl4 RIE, P34).

Low-confidence values that drive geometry or op physics: SnPb C4 100 um (X1, standard's table title from a search
excerpt) and 75 um plated height (X2 proposal) with the 80 um resist; EMIB / EMIB-T TCB joint profiles (X3 / X4,
Intel 2015 process description plus non-EMIB rows) and the 39.2 N force profile (A13); EMIB-T cavity joint SnAg
221 C (X5); paste deposit 400 um (X6, assumed land) and 100 um stencil (analog); TIM 85 um (analog); TSV protrusion
5 um (F140, med); Bosch loop 0.79 um / 13 s and scallop 0.265 um (F2, F3, med); TSV bottom-up 0.5 um/min (F73, low);
effective underfill viscosity 1.4 Pa.s (A114, derived calibration, used for every capillary underfill at its
dispense temperature); SnPb reflow peak 217.5 C (middle of the Kester EP256 210-225 C window, board-paste profile);
TCB cool-down 50 C/s (P17) after the analog bond; floor plans (decision 14).

## 8. Contract v1.1 (adopted 2026-10-23 17:50)

The builder writes `"contract": "1.1"` and uses every L34 item of CONTRACT.md section 15:

1. Line patterns: damascene `slab.lines` (open, `depth_um`) + `etch_lines` + `line_fill`; Al RDL open lines; EMIB
   build-up Cu and bridge BEOL as as-built `lines` with `material` (decision 16). The representative-trench `cut`
   workaround is gone. `deposit` may target a slab (a deposited level with open lines).
2. `SolderBody.dir: down` on every face-down solder (backside bumps, C4, BGA, EMIB-T cavity bumps); the builder checks
   `z_um - h_um >= 0` for them.
3. Route filter inside ops: shared steps keep route-specific bodies; the builder ignores bodies outside a route.
4. `clean {method}` replaces `strip` with `bodies: []` (desmear, flux clean); a clean removes listed bodies.
5. / 6. Joint solder from `onto`: EMIB substrate-side caps carry `joint_top_d_um` (die pad drawn equal to the bump,
   template); die caps carry the target pad (`fpad_d_um`, `ubump_pad_um`); `place.solder` on the interposer-to-
   substrate and package-to-board placements (melted by the later `reflow`); alignment uses it.
7. `completeness` carries `n` and `na`.
8. `na` values only in the HUD (`PNa`); the builder refuses them in geometry and op args.
9. Draft builds (`draft`, `pending`) are still available with `--draft`.
Also adopted: method-dependent default tools (`etch_lines` -> drie, `clean` -> wet_bench); `mold.charge: granular` for
the CoWoS-S mold (source row ectc51909.2023.00155-F1-s12, granular EMC); 00027 EMC form not stated, left unset.

## 9. Audit A1 fix pass (2026-10-23; `DevLog/audits/process3d_audit_A1_2026-10-23.md`)

Data side by L34; engine side (melt per body, rigid-die collapse) by L35 (CONTRACT.md 15.19, 15.20).

- C1 melt per body. Every solder body has `liquidus_c`: SnAg 221 (A60) for uBumps, FLI, EMIB-T cavity joint, 00027
  caps and backside bumps; SnPb 183 (itherm.2012.6231522); SAC305 220 (00027 p.5; A49); Sn-58Bi 138 (A52); EMIB LTS
  BGA 138 (P14 / P16). Every reflow / ball attach carries a peak, every TCB a T profile. Engine check (headless
  probe, mid-reflow): 00027 s25 lts_lts: ball and paste melt; lts_sac (160 C): Sn-58Bi ball melts, SAC paste stays
  solid; sac_lts (~210 C): Sn-58Bi paste melts, SAC ball stays solid; s15 (233 C) remelts the SnAg microbumps with
  the backside bumps; CoWoS C4 reflow (217.5 C) melts the SnPb C4 and leaves the SnAg uBumps solid. The analog TCB
  profiles (00155-F1-s08: 100 -> 250 C in 7 s) now cool back to the 100 C stage at 50 C/s (P17, 3 s), so joints
  freeze after the bond. `ball_attach.peak_c` is written for the ball-attach reflows (L34 request to L35: gate the
  remelt like `reflow`; until adopted the engine does not remelt other joints during ball attach).
- M12 SnPb peak. Kester EP256 data sheet Rev 21Sep09 (2009-09-21), Sn63Pb37 profile: peak 210-225 C, reflow zone
  45-75 s. Drawn (210 + 225) / 2 = 217.5 C for the C4 bump reflow and the C4 assembly reflow. Hierarchy: the window
  straddles the 221 C SnAg uBump liquidus (solid at 217.5, remelt at 225 or at the 235 C J-STD-020 Tc used before);
  the 255 C SAC BGA reflow (analog) remelts both C4 (183) and uBumps (221) inside their underfill; all stated in the
  HUD notes.
- M1 reveal grind. Rough removal = ip_h0 - reveal_grind - rough_stop = 775 - 110 - 30 = 635 um at 5 um/s = 127 s;
  fine 30 um at 0.25 um/s = 120 s; total 247 s; removal 665 um shown as a target.
- M2 underfill. Effective viscosity 1.4 Pa.s (A114) at the dispense temperature everywhere; no viscosity-temperature
  relation exists in L33. Washburn t = 3 mu L^2 / (gamma h cos theta), gamma 0.025 N/m, theta 30 deg: 00027 s03
  (L 20 mm, h 25.16) 3,084 s against the "within 60 min" analog; s18 (L 42 mm, h 60) 5,703 s; CoWoS UF1 (L 24 mm,
  h 25.56) 4,372 s; UF2 (L 26 mm, h 60.35) 2,173 s; EMIB CUF DIE 1 (L 19 mm, h 29.06) 2,410 s, DIE 2 / 3 (L 10 mm)
  668 s; EMIB-T bridge UF (L 3 mm, h 34.44) 51 s. No other paper states a fill time.
- M3 / M7 EMIB layout. Two bridges at x = +-9,550 um (package3d bridge_n 2); fine field over each bridge spans the
  DIE 1 and DIE 2 / 3 edges; coarse fields: DIE 1 |x| <= 9,550 - 1,700 = 7,850 um, DIE 2 / 3 from 11,250 um to
  the 20,600 um die edge (keep-out half width 1,700 um = 1.5 mm EMIB-T bridge half width + 0.2 mm cavity clearance,
  both routes); build-up vias only as columns under the coarse fields; DIE 2 / 3 TCB lists their coarse caps.
- M4 bump height control (2016 Sec. III(e)). All bumps plated to bump_h = 30 um above the solder resist. Zero-load
  joint between equal pads: column V = pi a^2 h, joint (pi H / 6)(6 a^2 + H^2) = V, i.e. H^3 + p H - p h = 0,
  p = 6 a^2 = 1.5 d^2, root H = u - p / (3 u), u = (p h / 2 + ((p h)^2 / 4 + p^3 / 27)^(1/2))^(1/3). Coarse d 70,
  cap 20: p 7,350, H 19.06, collapse c = 0.94 um. Fine and FLI caps from the same c: H = (c p)^(1/3), cap = H + c:
  fine d 20: p 600, H 8.27, cap 9.21, Cu 20.79; FLI d 16.36: p 401.5, H 7.23, cap 8.17, Cu 21.83. Every field
  collapses 0.94 um; standoff above the solder resist 29.06 um (engine probe: DIE 1 and DIE 2 / 3 collapse 0.942).
- M5 lid. Polymer TIM 85 um (analog P49) over each die back (die top = 2,266 + 29.06 + 725 = 3,020.06 um); sealant
  bead = TIM bond line (template); foot ring inner edge 3 mm outside the 41.2 mm die block (47.2 mm square,
  template); foot height = 29.06 + 725 + 85 - 85 = 754.06 um; lid placed on the sealant (z = 2,266 + 85), plate
  bottom on the TIM top.
- M6 EMIB-T joint (also coordinator item 2). Backside pad / UBM = the 70 um bump diameter (the 28.5 um TSV-group land
  sits inside it). Cap 70 x 40 um: V = pi 35^2 40 = 153,938 um3; p = 7,350, H = 34.44 um, collapse 5.56 um (engine
  probe 5.5585). Direct via depth = 5 x 30 - 15 - (40 + 50) + 5.56 = 50.56 um, so the via bottom (2,233 - 50.56 =
  2,182.44) lands on the collapsed pad top (2,188 - 5.56); bridge underfill gap = 34.44 um.
- M8 / M9 CoWoS topology. Level 1 carries a 15 um landing (package3d tsv_land_um) through the whole level onto each
  TSV top (etched with the level-1 trenches, filled and polished with level 1); passivation is a slab with 27 um
  openings at the three pad fields, the pads stand on the Al in them (pad 5 um above the passivation as before);
  chip D2 pads added to resist openings, plating and the seed-etch keep list.
- M10 durations: see section 5 (owner call); the Bosch strip and the per-level resist ashes have no duration.
- M11: see section 1.1; 60 cells converted to analogs (cowos_s 32, emib 28); 00174 (TSMC CoWoS) added to the
  cowos_s family papers.
- Minors fixed: m1 UF2 gap = C4 joint 60.35 um (C4 cap 80.49 / joint 60.35 by the same Cardano root); m2 BGA wetted
  diameter 546 um for 600 um balls (reproduces the 478 um measured ball height of 00155-a-i4), 0.91 d = 455 um for
  the 00027 500 um balls (attached cap 398.3 um); placements stay at the contact plane (contract 14); m3 die tops include
  the uBump collapse (CoWoS 1.59, 00027 0.89 um); m4 TSV tip inside the lining (d 9.63, from 675.21), plated first;
  m5 tip-oxide note states 0.097 um < 200 nm; m6 ECP 13,361 s model time; m7 CMP 3.4 um / 198.7 s and reveal 5 um /
  292 s; m8 Bosch ceil(126.6) = 127 loops = 1,651 s; m9 derived values carry the package3d leaf cells (0 non-datum
  derived values without refs); m11 note on the later TCB over the bridge; m12 X3 / X4 notes (time above 221 C =
  3.87 s), X6 area ratio 1.00 with the drawn stencil; m13 reveal-grind analog description; m14 ABF cure stage 1
  (130 C, 1,800 s) shown; m15 field scaling to 270,000 uBumps (269,568 drawn) and 8,700 C4 (8,633 drawn); m16 pads
  and Ni / Au under all ten 00027 dies; m17 EMIB underfill one region per die; m18 s08 cure shown as cure T;
  m19 Die B rotation provenance in the s02 note; m20 emib_t borrowed steps say so; m22 PENDING.md wording.
- Not changed: m10 op-level order provenance in the JSON (needs `OpCall.src`, contract item for L35; the step
  `src.note` and labels carry it); m21 X1 stays low confidence (no new source); m22 RESEARCH_PENDING.md P22 date
  (L39 file); m2 ball and paste merge (engine).
- Engine items sent to L35 (seen in the 2026-10-23 renders and state probes): (1) placement uses the declared piece
  extent (`pieceZ` zmin = 0 for the interposer, whose Si below 680 um was ground and recessed), so the CoWoS-S unit
  and the 00027 interposer float about 600 um above the substrate at mount / reflow, and the 00027 package floats by
  the 500 - 398 um ball difference at board mount; placement should use the current (trimmed, reflowed) extent;
  (2) `ball_attach.peak_c` gate for remelt of earlier joints; (3) `OpCall.src` for op-level order provenance;
  (4) ball + paste merge at board reflow.

## 10. Visual audit V1 data fixes (2026-10-23; `DevLog/audits/process3d_audit_V1_2026-10-23.md`)

- C3 build-up order: the builder expanded a repeated group op type by op type (all four laminations first), which drew
  four floating ABF films with no Cu levels in between. Consecutive content ops of one repeated group now run level
  by level (laminate, cure, vias, desmear, seed, litho, plate, strip, seed etch; then the next level); the CoWoS
  damascene levels the same. With the current engine the EMIB / EMIB-T cavities render as open pockets at block and
  cell scale (the cuts list abf_2..4 and cu_2..4; dry film is stripped each level).
- M6: `etch_recess` method `etch` (blanket plasma Si recess, F141) maps to the `drie` tool; laser only for method
  `laser`.
- M7: `coat` method `print` (bridge adhesive, TIM, sealant: form not reported) gets no tool actor (no spin coater).
- M11: the separate `tsv_tip` body is gone; the protruding tips are the bottom of the TSV Cu column (`tsv_cu`), which
  the recess exposes and the reveal CMP trims. The backside passivation is drawn on the field only.
- M13: the EMIB BGA balls sit at y = +-500 um; the substrate block window (y +-400) held none. Block window moved to
  y 100..900 um (one BGA row, same area, same draw budget); BGA step keeps the default block + work view (a cell PiP at
  the 1 mm BGA cell drew 2.1 M triangles of bumps).
- M2 / m6: every HUD key has a short human label (builder `HUD_LABEL`, missing labels are a build error); sub-op
  params are prefixed with the short op id ("seed etch: time"), not the full op name; dimensionless HUD values carry
  no unit; long op labels shortened.
- M3 durations from sources: PVD barrier / seed times from the HIPIMS rates (F37: Ti 2.8, Ta 3.2, Cu 6.6 nm/s) for
  the TSV barrier (31 s) and seed (45 s), damascene barrier (3.6 s per level), uBump seed (31 s) and C4 UBM (112 s);
  00027 s08 coat = the PI-2600 track sequence (F76, 240 s); 00027 s07 back grind as rough 645 um at 5 um/s + fine
  30 um at 0.25 um/s (F124-F126, 249 s). Ops without any source stay without a duration (resist coats / strips,
  litho exposure, placement, debond, dicing, inspection, cleaning, laser vias and cavities).
- L37 item, wafer-level steps: CoWoS-S `die_c` / `die_d` are now 300 mm logic wafers (template, interposer wafer size)
  with a die grid at die size + 50 um kerf; bumping, thinning and the saw act on them; the saw dices both wafers and
  the CoW TCB places dies from them. 00027 Die A / B stay die pieces: the paper reports wafer-level bumping but no die
  wafer and no saw step, so a saw would be an unreported step. EMIB dies and bridges have no wafer-level step in the
  flow (bumps are on the substrate; bridges arrive singulated).

## 11. Audit A2 data round (2026-10-23; `DevLog/audits/process3d_audit_A2_2026-10-23.md`)

- N2: new step `logic_thin_d` (inserted, same 2013 F1-s09 row: "logic wafers" thinned) grinds the 40 nm chip D wafer
  to the chip C thickness (template; rough 30 um stop at 5 um/s, fine 0.25 um/s), since a grind acts on one wafer.
- n1: the C4 seed etch keeps the UBM under the C4 (`keep_under: [c4_sol]`).
- n2: each bridge's fine / FLI field is split at the 100 um D2D gap into a DIE 1 side and an outer-die side that keep
  the full-bridge grid columns (same phase as the bridge pads): EMIB 36 columns at 55 um, 17 under DIE 1 (last at
  9,467.5 um) and 17 under the outer die (first at 9,632.5 um); EMIB-T 66 at 45 um, 32 + 32.
- n3 / n4: 00027 backside-bump joint H = 23.47 um (d 75, cap 25, equal pads; collapse 1.53); bottom CUF gap = pad
  5 + Cu 30 + 23.47 = 58.47 um (Washburn 5,852 s, upper bound) over a substrate pad. Substrate pads drawn: CoWoS C4
  pads (100 um), 00027 bump pads (75 um), BGA lands (wetted diameter) on all three substrates, all 15 um thick
  (analog: 4-2-4 FCBGA build-up Cu, ectc51687.2025.00148-a-L06); EMIB-T cavity pads as the 2.05 um ENi / Au finish
  (X8), plated in the cavity step; bridge placement, bridge underfill and the direct-via depth include it (via
  45 - 2.05 + 5.56 = 48.51 um). UF2 gap = 15 + 60.35 = 75.35 um.
- n5: damascene etch labelled as via + line (0.54 + 1.0 um, 181 s; the drawn line part is 118 s); ECP time covers the
  plated 2 um (1 um fill + 1 um overburden): 272 s at 20 mA/cm2.
- n6: 00027 s09 plates per body: Cu pad and bump at 50 mA/cm2 (F62), SnAg cap at 10 mA/cm2 (F65; 2,962 s for 25 um).
- n7: every op carries `OpCall.src` (order row ref, flow, step, note; `added` ops say so).
- n8: CoWoS-S family = TSMC CoWoS papers only (00135 MediaTek and 00055 SoIC removed); stale placement comments and
  counts fixed.
- n9: deterministic build (sorted expression names).
- n10: paste metal volume fraction `metal_vol_frac` on the 00027 pastes (L34 request to L35 for the joint volume):
  v = (w / rho_m) / (w / rho_m + (100 - w) / rho_f), w = 88.5 wt% (Type 4 SAC305 paste listings: Multicore GC18,
  Indium8.9HF), rho_m 7.37 g/cm3 (Kester SAC305 data sheet) and 8.72 g/cm3 (AIM Sn42/Bi58 data sheet), rho_f 1.0 g/cm3
  (assumption): SAC 0.511, Sn-58Bi 0.469. No vendor states the volume fraction directly.
- n11: every underfill viscosity note says the Washburn fill times are upper bounds (A114 upper bound, no dispense
  pressure).
- n12: CoWoS uBump caps carry `to_imc: true` (2013: full-IMC joint, a-i1 metallurgy shown as the joint material).
  They also carry `imc_melt_c` = 415 C (NIST Cu-Sn calculated invariants: L + Cu3Sn -> Cu6Sn5 peritectic at 415.0 C,
  the first liquid of a Cu6Sn5 / Cu3Sn joint; Cu3Sn to 638-677 C; the 187.5 C Cu6Sn5 allotropic change forms no
  liquid), shown in the CoW HUD; the engine gates remelt of converted joints on it instead of 221 C.
- n13: RESEARCH_PENDING.md P22 date (2024-08) and X8 wording (2 um is below the IPC-4552 range).
- n14: CoWoS uBump pitch cites ectc.2013.6575597-a-i1 (reported) instead of the 00135 package3d param.

## 12. Visual audit V2 data items (2026-10-23; `DevLog/audits/process3d_audit_V2_2026-10-23.md`)

- N3: the chip D wafer gets its own saw step `logic_saw_d` (inserted, same 2013 F1-s10 row), so each wafer is the
  step's root piece while it is diced (the engine keeps the diced wafer on tape until the pick, L35).
- m12: the 00027 PCB is drawn as 28 Cu layers (stated) evenly spaced through the analog 3.2 mm board with CCL /
  prepreg between them: Cu 34.1 um per layer (1 oz/ft2 assumed: 28.35 g / 929.03 cm2 / 8.96 g/cm3, F69), dielectric
  (3,200 - 28 x 34.1) / 27 = 83.2 um.
- m13: the EMIB IHS is a Cu core with 3 um Ni plating on top and underside (Ni-plated Cu assumed; thickness at the
  lower end of the IPC-4552 electroless-Ni range, F176, nearest documented Ni finish, low).
- m2: both carriers already use the material key `glass` (00027, CoWoS-S); rendering is L36's.
- n6: rate keys ending in `_nm_min` / `_um_min` now get nm/min and um/min (the `_min` suffix was stripped as a
  minimum); CMP removal rate shows 1,026.8 nm/min.
- L37 item: both laser debond steps (00027 s10, CoWoS-S debond) were `orient: down`, which put the glass carrier on the
  chuck; set to `orient: up` so the carrier faces the laser (the 00027 text: laser debonding system, AIMECHATEC). The
  EMIB flow has no debond.

## 13. Final audit data items (2026-10-24; `DevLog/audits/process3d_audit_final_2026-10-24.md`)

- F5: EMIB `cavity` step view = block (cell PiP at fv_1a), so the cavity wall, floor and surrounding build-up show.
- F6: CoWoS-S substrate block window moved to x 7,000..8,900 um, inside the 19.4 x 17.9 mm C4 field.
- F7: EMIB `tcb` carries the stage temperature, 140 C (template, P17 Intel TCB "substrate e.g. 140 C"; = the first
  point of tcb_T), as HUD `stage_temp_c` with the note and as op arg `bond_tcb.stage_c` (L34 request to L35): the head
  profile applies to the listed top-die joints; every other solder body of the assembly (the buried EMIB-T bridge
  joint) is held at `stage_c` against its own liquidus (140 < 221 C, stays solid).
