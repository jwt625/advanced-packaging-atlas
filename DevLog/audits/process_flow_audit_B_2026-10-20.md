# Process-flow audit B (2026-10-20, schema v2.4 re-pass)

Fresh-context, read-only audit of the re-passed process-flow data (DevLog-007). Contract checked against:
`data/_staging/REPASS_INSTRUCTIONS.md`, SKILL.md rule 7, schema v2.4 rule (n), and the defect classes of
`process_flow_review_{A,B}_2026-10-19.md`.

Method per paper:
- read the whole `references/<id>/text.md`;
- opened the flow figures and tables on the page renders, with crops for Fig. 6 / Fig. 15 of iedm45741, Tables IV-V of 00322 and Fig. 6 of 00019;
- dumped `papers`, `process_flows`, `process_steps`, `test_vehicles`, `metrics` and the evidence `revisions:` (2026-10-20).

The DB-wide checks are scripts over `data/` (merged state, 239 papers, 489 flows, 3812 steps).

## Sample

| paper | level (DB) | my grade | phys TVs | flows | steps | deltas | rows with typed cond. | substantive defects |
|---|---|---|---|---|---|---|---|---|
| tcpmt.2025.3628798 | full | full | 4 | 7 | 39 | 4 | 5 | 3 (+1 minor) |
| iedm45741.2023.10413759 | full | full | 3 | 2 | 18 | 0 | 6 | 1 (+1 minor) |
| tcpmt.2025.3610036 | full | full (laser parameters, no T/t/P) | 4 | 1 | 11 | 4 | 0 | 1 (minor) |
| ectc51529.2024.00322 | full | full | 6 | 3 | 24 | 1 | 6 | 0 |
| tcpmt.2023.3312037 | ordered | ordered (pieced from scattered statements) | 5 | 8 | 23 | 0 | 0 | 0 |
| ectc51906.2022.00218 | ordered | ordered | 4 | 2 | 23 | 0 | 0 | 2 |
| ectc.2011.5898527 | ordered | ordered, but generic | 1 | 2 | 23 | 0 | 1 | 1 (13 rows) |
| iedm19573.2019.8993659 | ordered | ordered (borderline fragments) | 2 | 2 | 5 | 0 | 0 | 0 |
| ectc51846.2026.00019 | fragments | fragments | 1 | 2 | 6 | 0 | 0 | 0 (+1 minor) |
| ectc51687.2025.00055 | none | none (confirmed) | 3 | 0 | 0 | 0 | 0 | 0 |
| ectc51529.2024.00144 | none | none (simulation only, confirmed) | 0 | 0 | 0 | 0 | 0 | 0 |
| total | | 11/11 grades agree | 33 | 29 | 172 | 9 | 18 | 8 substantive, 3 minor |

None and fragments papers:
- ectc51687.2025.00055: the text gives only the C-Layer bonding structure ("replaces dielectric", p.1 Sec. II.A), the C-SAM check and the D5470 thermal method. No fabrication step is stated, so none is correct.
- ectc51529.2024.00144: HSPICE/ADS models only. None is correct.
- ectc51846.2026.00019 (p.4 Sec. III.B):
  - The text says "Glass-IP was mounted on a package substrate, and an EML was flip-chip bonded", plus chip resistors on AuSn. No conditions are given.
  - The connector assembly (p.2 Sec. II.A) is a concept.
  - Fragments is correct. The "Au stud" material is verified on the p.4 Fig. 6(a) label.

## Error rates by defect type (sample: 11 papers, 29 flows, 172 steps)

| defect type | instances | rate | examples (row id, locator) |
|---|---|---|---|
| paper level grade wrong | 0 | 0/11 papers | iedm19573 ordered vs fragments is borderline: a 2-step TCB sequence (p.2 Sec. IV) plus the Fig. 8 caption order |
| flow level generous | 1 | 1/29 flows | tcpmt.2025.3628798-F7 `full`: no typed T/t/P, only the plasma-temperature split and atmosphere |
| flow tv_ids incomplete | 1 | 1/29 flows | tcpmt.2025.3628798-F2 (damascene landing pad) lists only TV a. CUF TV b bonds to the same Cu-pad landing die (p.7 Fig. 22 cartoon; p.2 Sec. I "bottom bump replaced by damascene pad ... followed by CUF") |
| alternative route stored as a separate tv_build flow | 1 | 1/29 | tcpmt.2025.3628798-F4 (photo-patternable WLUF, p.5 Fig. 14). Its notes say "instead of F1 s09-s12", but it is a second flow on TV a, so the per-TV projection runs both WLUF routes, and runs F4 after the F3 stacking |
| cross-flow build order wrong | 1 | 1/29 | ectc51906.2022.00218: F1 = S-SWIFT assembly, F2 = ETR RDL. Fig. 8 step 1 "Multi-ETR" (p.5) comes first, but the projection orders by flow_id. Nothing notes it, and the "never renumber" rule blocks the fix |
| identical step kept as TV deltas instead of a shared step | 1 | 2/172 rows | tcpmt.2025.3610036-F1-s08 / -s09: the same ESI CornerStone laser step for a and b (p.4 Sec. IV.A). The agent folded cure and desmear into shared rows but not this step |
| split mixing a sweep with a per-TV material change | 1 | 1/172 | ectc51906.2022.00218-F2-s01: coating-level sweep (p.4 Fig. 4) + prototype vs modified dielectric for TVs c vs a/d (p.6 Table I) |
| generic platform flow carrying a simulation TV in tv_ids | 1 (minor) | 1/29 | ectc51846.2026.00019-F2 tv_ids = TV b (simulation_model) |
| physical TV neither linked nor not_reported | 0 | 0/33 TVs | the not_reported entries are correct (iedm45741 c, tcpmt.2025.3610036 c/d) |
| test/measurement/FA left as a step | 0 | 0/172 | deleted inspection rows are present in metrics (00322 a-m1..m3, b-m1..m4; ectc.2011 a-m1/a-m2 conditions; iedm19573 a-m9) |
| structure-only step | 0 | 0/172 | |
| missing step | 1 | 1 | tcpmt.2025.3628798-F7: the reflow at 140 C after the Ar/H2 plasma DOE is missing (p.11 Fig. 33 caption) |
| missing target / dimension | 1 (minor) | 1/172 | tcpmt.2025.3628798-F6-s04: landing-bump diameters 6 um Cu / 13 um Ni, Co are not on the target (p.3 Fig. 8 labels) |
| value misread in conditions | 1 | 1/172 | iedm45741.2023.10413759-F1-s05 conditions say "interface ~233 C". The Fig. 6 plateau sits on the 240 C gridline (p.3, checked on the 220 dpi crop). The typed temp_c 250 `lt` (Fig. 5 bound) is correct |
| unit conversion value wrong | 0 | 0/10 checked | kgf->N (4, 2 kgf), kN->N (300 kN x2), min/h->s (5 min, 30 min, 2 h, 5 h, 1 h), 10 nm->0.01 um |
| conversion without evidence `derived` entry | 1 (minor) | 1/10 | iedm45741.2023.10413759-F1-s07 thickness_um 0.01 (from "10 nm", p.2 Sec. II.B). The evidence `derived` list is empty; the other 9 conversions have entries |
| step_basis / scope wrong | 1 | 13/172 rows (7.6%) | ectc.2011.5898527-F1-s01..s14 are `stated_in_flow`, tv_build. The source is the Introduction's generic "Typically ..." paragraph (p.1). The same evidence file excludes that paragraph's dimensions as "generic industry statement" |
| invented content | 0 | 0/172 | |

Summary:
- Papers with at least one substantive defect: 5/11 (5/9 papers with flows).
- Flows with a structural defect: 6/29 (21%).
- Wrong values: 1/172 rows (0.6%).
- Wrong step_basis: 13/172 rows, all in one paper.

## Ranked defects and fixes

1. **Cross-flow build order is not modelled** (ectc51906.2022.00218 F1/F2; tcpmt.2025.3628798 F3 before F4).
   - Projections order by flow_id, and the contract forbids renumbering, so a flow added or split later lands after the flows that follow it in the build.
   - DB-wide, 77 TVs in 52 papers sit in 2 or more tv_build flows and depend on this ordering.
   - The name heuristic found 2 inverted pairs: ectc51906.2022.00031 F1/F2 and 00218 F1/F2.
   - Fix: add `process_flows.build_seq` (int, order within the paper) and/or `follows` (flow_id). build_views sorts by it. Backfill from flow notes; default = flow number.
2. **Alternative routes split into separate tv_build flows on the same TV** (tcpmt.2025.3628798-F4 vs F1-s09..s12).
   - DB-wide, 3 such flows: tcpmt.2025.3628798-F4, ectc51909.2023.00150-F2/F3.
   - Fix: move the F4 rows into F1 as `route: photo-patternable WLUF` (s09-s12 get `route: CMP reveal`), or set F4 scope to `comparison`.
   - Rule text: "an alternative to part of a flow is a route in that flow, not a second tv_build flow on the same TV".
3. **Generic introduction flow recorded as the TV's executed flow** (ectc.2011.5898527-F1, 13 rows). Fix:
   - set step_basis `generic_description` on F1;
   - keep tv_ids a, because the Conclusions (p.5) confirm DRIE, thermal oxide, barrier/seed, Cu fill and CMP for AR <= 10;
   - say this in the flow notes.
   - Same check for F2-s01/s02 (bumping at a "30-60 um" range, dicing): same paragraph.
4. **Flow tv_ids incomplete** (tcpmt.2025.3628798-F2 missing TV b).
   - Fix: tv_ids a;b, or a TV-b note if the CUF landing wafer is the bumped variant ("bottom wafer with microbump", p.6 Table I). The paper does not tie the variants to the CUF samples. The Fig. 22 cartoon shows a Cu pad.
5. **Missing step and misread figure value**:
   - tcpmt.2025.3628798-F7: add "reflow at 140 C" after s04 (temp_c 140, p.11 Fig. 33 caption).
   - iedm45741.2023.10413759-F1-s05: change "~233 C" to "~240 C" in conditions.
6. Minor:
   - tcpmt.2025.3610036-F1-s08/s09: fold into one shared step; TV-a target in split.
   - ectc51906.2022.00218-F2-s01: move the dielectric variant to per-TV material or note it; keep the coating-level sweep in split.
   - tcpmt.2025.3628798-F6-s04: add target "bump dia 6 um (Cu) / 13 um (Ni, Co)".
   - tcpmt.2025.3628798-F7: level full -> ordered.
   - ectc51846.2026.00019-F2: empty tv_ids, because the flow is not built.

## DB-wide checks (data/, 3812 steps, 489 flows)

| check | count | notes / examples |
|---|---|---|
| `target` with no number | 11 / 482 targets (2.3%), 4 papers | ectc51906.2022.00176-F1-s01..s10 "TD wafer; BW" (8 rows), ectc51529.2024.00396-F1-s15 "glass wafer", ectc51846.2026.00346-F1-s01 "PIC wafer", ectc51846.2026.00336-F2-s15 "TDV landing on STI floor". The convention says to move object names to `step` |
| `split` rows | 271; 39 name TVs | see the breakdown below |
| tv_build flows with empty tv_ids | 0 | |
| non-tv_build flows with tv_ids | 30 (20 generic_platform, 10 comparison) | schema says tv_ids = "TVs built with this flow". The meaning for generic/comparison flows is undefined (e.g. ectc51846.2026.00019-F2 points at a simulation_model) |
| full papers with no typed condition | 9 / 85 | see the breakdown below |
| category `other` | 178 rows in 93 papers (v2.3: 388) | keyword pass and 20-row sample below |
| typed value vs `conditions` text | see below | |

Split rows that name TVs (39):
- About 22 are per-TV values on the same step, which the contract allows.
  - Examples: ectc51687.2025.00063-F2-s01 "TV b 47 um / TV c 65 um via"; ectc51529.2024.00322-F2-s02.
- About 12 are true sweeps that only match the regex.
- 5 encode different processes per TV and should be deltas or routes:
  - icep-iaac64884.2025.11002958-F2-s01/s02: CCP vs LIS ion gun vs none/preheat per TV;
  - tcpmt.2026.3740312-F2-s02: 200 nm film vs 5 um bump;
  - ectc51846.2026.00050-F3-s02: Cu pillar 150 um (a) vs bridge solder bumps 175 um (e);
  - ectc51906.2022.00218-F2-s01.

Full papers with no typed condition (9 / 85):
- ectc51529.2024.00133, ectc51846.2026.00106, eptc59621.2023.10457918, ectc51687.2025.00378, ectc51906.2022.00053, estc60143.2024.10712070, ectc51909.2023.00023, ectc51906.2022.00180, tcpmt.2025.3610036.
- Spot read:
  - estc60143.2024.10712070 and ectc51909.2023.00023 look `ordered`: materials only, and the anneal is a 250-300 C range.
  - ectc51846.2026.00106 has an untyped 325-425 C ion-exchange range.
  - ectc51906.2022.00053 has only normalized temperatures and pressures.
  - The others carry laser, thickness or tool conditions, so `full` is defensible.
- Reverse case: ectc51846.2026.00227 is `ordered` but has 4 typed temperature steps plus gas and tool. It is a candidate for full.

Category `other`, keyword pass over all 178 rows:
- 19 are RDL/BEOL wiring, so `rdl_layer`.
- 15 are via formation, so `laser_drill` or etch.
- 14 are profile fragments (cool to RT, hold, release mold, pressurize). Merge them into the parent step's conditions.
- 13 are device/front-end fabrication (HEMT, Si capacitor, implant, fs-laser waveguide writing).
- 6 are glass ion exchange.
- 1 is fs-laser modification (SLE).
- 110 are heterogeneous.

Category `other`, random 20 (seed 20261020), proposed categories:
- `rdl_layer` (5):
  - vlsitechnologyandcir65830.2026.11577374-F1-s07;
  - ectc51909.2023.00008-F1-s01;
  - ectc51906.2022.00332-F2-s03 and -F1-s02;
  - ectc.2016.201-F1-s01.
- `lamination`: ectc51906.2022.00142-F7-s02 (prepreg cover) and ectc51846.2026.00012-F3-s07 (membrane pressurize).
- `laser_drill`: ectc.2016.201-F2-s05 and ectc51687.2025.00051-F2-s06.
- `cmp` or `grinding_thinning`: tcpmt.2026.3717381-F1-s02 (polish glass wafer).
- `carrier_prep`: ectc51529.2024.00023-F1-s04 (slice and finish to 150 mm wafers).
- `lithography`: ectc51906.2022.00176-F1-s07 (fiducial marks).
- New `ion_exchange`: ectc51529.2024.00023-F1-s08.
- New `laser_modification`: ectc51846.2026.00302-F1-s02.
- New `device_fab` (front-end):
  - ectc51687.2025.00028-F1-s01 (Si capacitor);
  - ectc51846.2026.00092-F1-s03 (Si micropillars by front-end process).
- Merge into the parent step (profile fragments): ectc51846.2026.00012-F2-s09 (cool / release) and ectc51906.2022.00061-F1-s10 (air cool).
- No information, delete or keep: ectc51909.2023.00178-F2-s02 "backside processes (not detailed)".
- Structure-like, check: ectc51909.2023.00174-F4-s06 "Cu via on LSI top metal".

Typed value vs `conditions` text:
- 15 temperature flags. After inspection there is 1 true wrong number: the iedm45741 F1-s05 text value.
  - The rest are set-vs-actual or stage-vs-head temperatures, stated ranges, or ramp text.
  - Example: ectc51909.2023.00155-F1-s08 has temp_c 440 (set) and "actual max 250 C" in text. Both match the source (p.3 Table 5), but which temperature temp_c holds is undefined.
- 3 time flags. All are correct sums (00092 5x15 min = 4500 s; 00194 336+300 s; 00416 30+30 min).
- Questionable typing: ectc51909.2023.00154-F2-s10 stores "vacuum, below 1 atm" as pressure_mpa 0.101325 `lt`. Atmosphere `vacuum` alone carries this.
- Untyped values in conditions:
  - temperature: 19 rows / 15 papers;
  - time: 13 rows / 10 papers;
  - pressure: 7 rows / 5 papers.
- Most untyped values are ranges:
  - ectc51906.2022.00055-F3-s02 580-600 C;
  - ectc51909.2023.00023-F1-s08 250-300 C;
  - ectc51906.2022.00055-F1-s03 45-60 min;
  - ectc51846.2026.00416-F1-s13 8-10 mA/cm2, 4-8 h.
- Others are chamber pressures:
  - ectc51846.2026.00208-F1-s12 0.5 Pa;
  - tcpmt.2026.3708099-F1-s01 25 mTorr.
- Single misses: ectc51846.2026.00115-F2-s01 "30 min electroless" and ectc51846.2026.00062-F1-s15 "chuck 180 C".

## Comparison with the 2026-10-19 review patterns

| 2026-10-19 pattern | status in this sample | DB-wide |
|---|---|---|
| 1 flow copied onto sibling TVs | fixed (shared flows + deltas). One over-correction: identical laser step kept as 2 deltas (tcpmt.2025.3610036) | 112 shared flows (DevLog) |
| 2 sibling/split TVs with no rows | fixed: 0/33 physical TVs uncovered | validator 0 warnings |
| 3 numbers/equipment not on the step | largely fixed (targets, tools, thickness_in_um on 00322, tcpmt.2025.3628798, 00218). 1 minor miss | 11 object-name targets |
| 4 composite collapse / `other` | composite splits done (ectc.2011 F1-s07/s10/s11; iedm45741 F2-s05/s07) | other 388 -> 178 |
| 5 imposed order / flattened branches | inferred_order flagged correctly. Branch flattening reappears one level up as alternative flows on the same TV and as flow-order inversion | 3 alternative flows; 77 TVs depend on flow numbering |
| 6 tests/measurements in flows | fixed: 0 in sample. Moved content found in metrics | 84 inline_inspection rows remain by design |
| 7 generic vs executed flow | improved (generic_platform + performed=no in tcpmt.2023.3312037 F2-F4, ectc51846.2026.00019 F2). Residual: ectc.2011 F1 | 32 generic_platform flows |
| 8 label inconsistency | fixed: 11/11 levels agree | levels 85/133/15/6 |
| 9 invented content | 0 | |

## Recommendations

1. Schema:
   - add `process_flows.build_seq` (and optionally `follows`) and sort the projection by it;
   - define tv_ids for generic_platform/comparison flows (empty, or "TVs it is compared against");
   - add typed ranges for process steps (`temp_c_min`, `time_s_max`, ... or a qualifiers convention) so stated ranges stop staying in free text;
   - define temp_c as the process temperature at the part when the paper gives both set and actual, with the other value in conditions.
2. Rule text (REPASS_INSTRUCTIONS / SKILL rule 7):
   - an alternative to part of a flow is a `route` inside that flow;
   - identical steps on all tv_ids are shared rows, even when only the target differs (put it in split);
   - an Introduction "typically ..." paragraph is `generic_description` unless the paper says it was executed.
3. Targeted fixes (small, by hand or one agent):
   - the 6 sample fixes above;
   - the 11 object-name targets;
   - the 5 splits that encode per-TV processes;
   - regrade the 9 full-without-typed papers and ectc51846.2026.00227.
4. Category additions (`device_fab`, `ion_exchange`, `laser_modification`) plus a scripted remap of the 34 rdl/via `other` rows. Merge the 14 profile-fragment rows into their parent steps.
5. Recheck the 77 multi-flow TVs for build order once `build_seq` exists. Use flow notes and figure order; most are single-direction (module flow, then attach) and need only the default.
