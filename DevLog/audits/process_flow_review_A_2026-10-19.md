# Process-flow capture review A (2026-10-19)

Fresh-context, read-only review of `papers.has_process_flow` and `process_steps` for 13 papers (9 `yes`, 4 `no`).
For each paper I read the whole `references/<id>/text.md`, opened the page renders for the flow, stack and process
figures, and compared them with `data/process_steps.csv`, `data/papers.csv` and `data/test_vehicles.csv` (merged
tables, as of commit 9976c3e plus the working tree). Rule references: SKILL.md hard rule 7, schema v2.2
`process_steps`, DevLog-004.

## Grades

Disclosed grade (what the paper itself gives):
- FULL: an ordered fab/assembly flow for a TV, with materials and conditions.
- ORDERED: ordered steps with few or no conditions.
- FRAGMENTS: isolated steps or generic statements, with no real sequence.
- NONE: no process content.

Capture grade (how well our rows match the paper):
- complete: every disclosed step and condition is in the DB.
- complete+padding: complete, but the DB also holds rows that are not fab steps, or copies of the same step.
- missing: steps or conditions the paper discloses are not in the DB.
- wrong-TV: rows are attached to the wrong TV.
- generic: the rows restate structure or tests and contain no flow.

## Per-paper table

| paper | DB flag | disclosed | steps in DB | capture grade | misses |
|---|---|---|---|---|---|
| ectc32696.2021.00125 | yes | FRAGMENTS | 3 | generic; should be `no` | 3 |
| iwlpc52010.2020.9375855 | yes | ORDERED | 5 | missing (TV b has no flow) | 3 |
| ectc51687.2025.00085 | yes | ORDERED | 6 | complete (1 minor condition) | 1 |
| icep61562.2024.10535612 | yes | FULL (litho coupon) | 6 | complete | 0 |
| ectc51909.2023.00219 | yes | ORDERED (Fig. 5, no conditions) | 13 | complete | 1 (category nit) |
| ectc51529.2024.00093 | yes | FRAGMENTS | 18 | generic + padding; should be `no` | 5 |
| ectc51906.2022.00140 | yes | ORDERED (some thicknesses) | 15 | missing + wrong-TV | 5 |
| ectc51846.2026.00074 | yes | FULL (Fig. 11 + Sec. II.A, IV.D) | 28 | complete+padding | 3 |
| ectc51687.2025.00071 | yes | FULL (Fig. 1 + Sec. II) | 27 | complete+padding; 1 wrong-TV value | 2 |
| ectc51909.2023.00108 | no | NONE (concept) | 0 | correct `no` | 0 |
| ectc51529.2024.00144 | no | NONE (simulation only) | 0 | correct `no` | 0 |
| ectc51909.2023.00091 | no | FRAGMENTS | 0 | correct `no` | 0 |
| ectc51906.2022.00008 | no | FRAGMENTS | 0 | correct `no` (but see 00125) | 0 |

The 9 `yes` papers hold 121 rows. About 44 of them are copies of the same step on sibling TVs, and 17 are
test, inspection or preconditioning rows (counts below).

## Per-paper findings

### ectc32696.2021.00125 (CoWoS-R reliability), disclosed FRAGMENTS
The paper has no fab or assembly sequence. The only process content is "CoWoS-R adopts the same CoWoS process
assembly" (p.1 Sec. I, Fig. 1 arrows from dies to interposer to substrate), "non-stitching approach ... in RDL design
and formation" (p.3 Sec. II.B), and the JEDEC preconditioning reference (p.2 Sec. II).
1. `-a-s01`, `-b-s01`: JESD22-A113D MSL4 preconditioning before reliability tests (p.2 Sec. II) is recorded as a
   process step. It is a reliability-test condition and belongs in `metrics.condition`. ectc51909.2023.00091
   handles its MR6x preconditioning (p.4 Table 2) that way, with no step rows, so the two papers are inconsistent.
2. `-b-s02`: "RDL design and formation, non-stitching approach" has category `lithography`. The paper never names
   lithography; this is a design statement, not a step (p.3 Sec. II.B).
3. `-b-s01` and `-b-s02` both have seq=1, so TV b holds two one-row pseudo-flows.
4. Consistency: ectc51906.2022.00008 contains the same CoWoS-R boilerplate and has more process content (see below),
   yet it is `no`. Recommend `no` (or `fragments`, see recommendations) for 00125.

### iwlpc52010.2020.9375855 (Samsung X-Cube), disclosed ORDERED, no conditions
The flow is CoW solder bond of the SRAM front side to the logic wafer backside, then wafer-level molding, sawing,
and mount on a 12x12 mm substrate by 125 um Cu pillar (p.3 "X-Cube Test Vehicles"; p.4 "Package Test Vehicle
Results"). TV a captures it.
1. TV b (SAINT-S functional TV) has no steps. p.3 "X-Cube Test Vehicles" describes molding, sawing and substrate
   mount for both TVs ("both test vehicles", "the X-Cube is mounted on the 12mm x 12mm package substrate"), and
   Fig. 3 is captioned "Details of package and functional test vehicles". The flow is shared, but only one TV has it.
2. `-a-s01` TSV formation comes from the generic "What is X-Cube" text (p.3). Its seq=1 position is inferred (the
   row's note says so), but `performed` and `basis` do not flag the inference.
3. Logic-wafer thinning ("on the thinned wafer", p.3 "What is X-Cube") is not captured. It is a generic statement, so
   this is minor.
Fig. 1 (p.2, generic 2.5D CoW vs CoS flows) is correctly not attached to a TV.

### ectc51687.2025.00085 (CoWoS-R thermal TV), disclosed ORDERED
The rows match the six-step metal-TIM assembly for TV c in p.2 Sec. III, in the right order: BSM on die and lid,
CoW attach to substrate, oxide removal on the TIM, TIM placement, lid attach, then solder.
1. The 200 um metal-TIM bond-line thickness (p.3 Sec. IV.B, Table 2) is not set as `thickness_um` on `-c-s04`/`-c-s06`.
   It may already be in metrics; for flow retrieval it belongs on the step.
The graphite and liquid-metal TVs (a, b) have no disclosed flow, so the empty rows there are correct. The IMC-Si sealant
assembly (p.5) is cited prior work [13] and is correctly excluded.

### icep61562.2024.10535612 (DFR lithography margin), disclosed FULL
The rows match p.1 Sec. II: 15 um DFR lamination, exposure, 60 C/60 s bake, 30 min RT hold, 1.0 wt% Na2CO3 develop
at 27 C, and DI rinse. The dose legends (50-120 mJ/cm2) and the focus range (-60 to +60 um) on `-a-s02` check out
against p.2 Figs. 2-4. No misses.

### ectc51909.2023.00219 (Sony 410 mm2 CoW HB), disclosed ORDERED from Fig. 5 only, no conditions
The CoW flow (p.2 Fig. 5) is planarization, dicing, pretreatment, CoW bonding and anneal on the top wafer; the base
wafer gets planarization and pretreatment. The WoW flow has no dicing. Both flows are captured faithfully for TVs a
and b, and the backgrinding row (`-a-s02`, p.2 Sec. I) is correctly marked as order not shown.
1. The two "Pretreatment" boxes in Fig. 5 carry different categories: `cleaning` (`-a-s04`) and
   `surface_treatment` (`-a-s06`, `-b-s03`). This is a nit, but category retrieval will split them.
The pretreatment and bonding recipes are not disclosed (p.3 Sec. II.A-B). The DB correctly leaves them empty.

### ectc51529.2024.00093 (DNP glass core TGV), disclosed FRAGMENTS
The paper has no sequence. TGVs use "DNP's proprietary technology" (p.1). The fragments are "one insulating and one
wiring layer were formed" (p.4 Sec. II.C) and "one wiring layer of RDL was formed" (p.3 Sec. II.B). No process figure
exists: Fig. 7 (p.3) is the measurement setup.
1. `-a/b/c/d/e/f-s01` (6 rows), category `tsv_tgv_formation`: these restate the via-fill type, which is structure and
   has no process content. That information belongs in `interconnects`.
2. `-a/b/c/d/e/f-s02` (6 rows) are the same single sentence copied to 6 TVs, with no method.
3. `-a/b/c-s03` and `-d/e/f-s03` (6 rows) are a thermal-cycle test and an S-parameter measurement. These are tests,
   not fab steps, and duplicate metrics.
4. `-c-s03` gives -55 to 120 C (p.4 text). The Fig. 11 caption on p.4 says -55 to 122 C, and the conflict is not
   noted.
5. Glass thickness is 300 um for TV a and 400 um for TVs b and c (p.4 Sec. II.C). It is not on their s01 rows, while
   d/e/f s01 carry "400 um". This is inconsistent.
Recommend `no` (or `fragments`). If fragment rows are kept, keep only the 1-2 actual statements, not 18 rows.

### ectc51906.2022.00140 (Samsung chip-last FOPLP fine RDL), disclosed ORDERED
p.2 Sec. 2.1 gives the chip-last flow, and p.3 Sec. 2.3 gives the RDL sub-sequence: PID 8.5 um, cure, seed, PR 7 um,
expose, develop, EP Cu, PR strip, seed etch. TV a captures this well.
1. The PID via opening is missing. PID is photo-imageable and is exposed and developed before cure (p.3 Fig. 6, which
   shows the exposure/non-exposure, develop and cure chemistry). The via opening is drawn in p.3 Fig. 7(b), and the
   abstract and conclusion discuss via dimple/via fill. `-a-s02` goes straight from coat to cure (`-a-s03`).
2. TV b (T-shape UBM) has 0 rows, and its TV note says "Process flow as TV a". Its distinguishing build is not
   captured: organic carrier, PID release layer, stopper metal and 8 um T-shape UBM (p.5 Fig. 10), plus "optimized
   the exposure conditions" (p.5 Sec. 3.2). A free-text note cannot be used to retrieve the flow.
3. The NA split 0.12/0.16/0.18/0.24 sits in `-a-s06` conditions. It belongs to the resolution study (p.5 Sec. 3.3,
   Fig. 12), which is TV c in the DB, so it is on the wrong TV.
4. TV d (chip-first comparison) has 0 rows. p.2 Sec. 2.1 and Fig. 2 (left) describe the chip-first flow: singulate,
   place face-up on thermal-release adhesive on a carrier, over-mold, mold-grind to reveal Cu pillars, RDL, solder
   bump, then debond. The text calls it generic ("Normally ..."), but it is the flow of a DB TV.
5. The UBM Cu thickness of 11 um (p.3 Fig. 5) appears only in the `-a-s01` notes, not in `thickness_um`. The organic
   carrier (p.5 Fig. 10) is not named on `-a-s01`.

### ectc51846.2026.00074 (GT glass core TGV liners), disclosed FULL
The flow is captured with equipment and thicknesses: Ti/Cu 200/1600 nm on a Unifilm sputterer, Chemcut plating with
Atotech chemistry (p.2 Sec. II.A), and the TV d RDL trial with 15 um ABF GX-92, 50/150 nm Ti/Cu, 15 um RY5115 and
MLA150 at 375 nm and 100 mJ/cm2 (p.4-5 Sec. IV.D). The order matches p.5 Fig. 11.
1. `-a-s04/-s05/-s06`, `-b-s05/-s06/-s07` and `-c-s05/-s06/-s07` (9 rows) are X-ray imaging and liquid thermal-shock
   tests (p.5 Sec. IV.E). They are reliability and inspection, not fab, and duplicate metrics.
2. The Cu plating bath temperature of 30 C (p.3 Sec. III.C; stated as the plating bath temperature) is not in
   `temp_c` of the plating rows (`-a-s03`, `-b-s04`, `-c-s04`, `-d-s04`).
3. The TGV aspect ratios 3 and 5 (p.2 Sec. II.A) are not in any step `target`.
The flow is copied 3 times across a/b/c, with only the liner step differing (see Pattern D).

### ectc51687.2025.00071 (Purdue 3 um TSV AR study), disclosed FULL
The full Fig. 1 and Sec. II flow is captured with thicknesses, plating waveform and anneal: Bosch etch, 150 nm PECVD
SiO2, 100 nm Ta, 300 nm Cu seed, electroless Cu, DC/PR plating, CMP, and anneal at 400 C for 1 h.
1. `-b-s07` (AR 7:1) conditions include "average 2.2 mA/cm2". The paper gives the average and the 5 h fill only for
   AR 10:1 (p.2 Sec. II.A). The row note admits this, but the value still sits on TV b.
2. The DC current sweep from 1 to 5 mA/cm2 on AR 10:1 (p.2 Sec. II.A, Fig. 2: pores below 2.5, pinch-off at 2.5 and
   above) is not represented as a split of the plating step. It explains the process choice, so it is useful.
The 9-step flow is copied across 3 TVs (27 rows for 9 distinct steps); only s02 target and s07 differ.

### `no` papers
- ectc51909.2023.00108: NONE. This is an iOIS architecture paper; Fig. 1 shows OE structure types and there is no
  build. `no` is correct.
- ectc51529.2024.00144: NONE. The paper is HSPICE/ADS simulation only, and SoIC is named as a technology with no
  steps. `no` is correct.
- ectc51909.2023.00091: FRAGMENTS. The process content is "completed process feasibility check with good wafer
  warpage control" (p.3 Sec. II.A; p.4 Sec. II.B), "6 layers of backside RDL are processed with 11 um Cu L/S"
  (p.2 Sec. II), and MR6x preconditioning (p.4 Table 2). There is no sequence. `no` is correct, and no flow was
  missed.
- ectc51906.2022.00008: FRAGMENTS. The fragments are: known-good IPD attached to the interposer landside
  (p.4 Sec. III.A), underfill between IPD and substrate (p.4), the CoW module joined to the substrate (p.5 Sec. III.C),
  and 3x mass reflow and precon before TCG/uHAST (p.5 Table II). They imply the order CoW, then landside IPD attach,
  then oS join, then underfill, but the paper never states it. `no` is defensible, and no flow was missed. It carries
  more process content than 00125, which is `yes`.

## Failure patterns (counts over the 9 `yes` papers, 121 rows)

A. **The binary flag mixes fragments with flows.** 2 of 9 `yes` papers are FRAGMENTS (00125, 00093), while 2 of 4
   `no` papers are FRAGMENTS of equal or greater content (00091, 00008). The same evidence level gets opposite labels.
   Only 4 of 9 `yes` papers (00085, icep, 00219, 00140) and 2 FULL ones (00074, 00071) carry a usable sequence.
   DB-wide, all 231 papers with step rows are `yes` and 3 of them have 3 or fewer rows, so the flag currently tracks
   "has any row".

B. **Tests, inspection and preconditioning are logged as process steps.** This covers 17 rows in 3 papers:
   00125 (2), 00093 (6), 00074 (9). DB-wide there are 120 `test`, 237 `inspection` and 11 `preconditioning` rows,
   and in 13 `yes` papers at least a third of the rows fall in these categories. Some in-line inspection is part of a
   real flow (00140 `-a-s11` AVI is legitimate), but post-build reliability tests are not.

C. **Structure-restating pseudo-steps.** 7 rows: 00093 s01 x6 ("TGV with ... Cu electrode") and 00125 `-b-s02`.

D. **The flow is copied per TV.** About 44 of 121 rows are copies of an identical step on a sibling TV:
   00071 (18), 00074 (about 14), 00093 (12). DB-wide, 752 of 4441 rows (17%) duplicate an identical
   (paper, step, category) on another TV. The copies inflate counts and make the flow hard to read, and edits must be
   applied N times.

E. **A shared flow is missing on a sibling or variant TV.** 3 TVs in 2 papers: iwlpc b, 00140 b and 00140 d. This is
   the inverse of D. There is no way to say "TV b uses flow X with these deltas", so extractors either copy (D) or
   drop (E).

F. **Conditions or splits sit on the wrong TV.** 2 cases: 00140 `-a-s06` NA split (belongs to TV c) and 00071 `-b-s07`
   average current (stated for AR 10:1 only).

G. **Missing steps or conditions within a captured flow.** 1 missing step (00140 PID expose/develop). 4 missing or
   misplaced conditions: 00085 BLT 200 um, 00074 bath 30 C, 00140 UBM 11 um in notes only, 00093 TC 120 vs 122 C
   conflict.

H. **Conditions forced into free text.** Current density and waveform (00071, 00074), dose and focus (icep, 00074,
   00140) and NA live in `conditions`. DB-wide, 17 rows hold a current density, 15 a dose and 26 a force in free text.
   73 rows mention a temperature in `conditions`/`step` with `temp_c` empty; some of these are ranges such as TC
   tests, which also points back to B. There is no `force_n` column, though bonding force is a core TCB/HB parameter.

I. **`performed` and the flow source are unused.** `performed` is empty in 4062 of 4441 rows. The inferred position
   of the iwlpc TSV row, the generic chip-first flow in 00140 and the generic Fig. 1 flows in iwlpc cannot be told
   apart from the build's own executed steps.

What works: when a paper has a real flow (icep, 00085, 00219, 00071, 00074 TV d, 00140 TV a), step order,
materials, thicknesses and named equipment are captured faithfully, nothing is invented, and undisclosed recipes are
left empty with a note. The weak points are scope (A-C) and structure (D-F, I), not reading accuracy.

## Recommendations

### (a) Extraction rule and schema
1. **Replace the binary flag with a graded field**, `papers.process_flow_level: full | ordered | fragments | none`,
   using the definitions in this file. Keep `has_process_flow` as derived (`yes` = full or ordered) or drop it. The
   triage and app filters can then ask for flows that have conditions.
2. **Define what counts as a step.** A step is a fab or assembly operation that changes the build. Exclude
   post-build reliability tests (TC, TS, uHAST, HTS, MR preconditioning), electrical and optical measurement, and
   failure-analysis cross-sections; they go to `metrics`. Keep in-line inspection (AVI, CSAM, X-ray) only when the
   paper places it inside the flow, and mark it. Never write a step that only restates a structure ("TGV with filled
   Cu").
3. **Add a flow-level table** (`process_flows`): `flow_id`, `paper_id`, `flow_name`, `scope`
   (`tv_build | generic_platform | comparison | prior_work`), `level`, `source_locator`, `tv_ids` (the TVs that use
   it). `process_steps` then keys on `flow_id`. TV-specific deltas go in `process_steps` rows with `tv_id` set (and
   `performed=no` for skipped steps), or in a `variant` column. This removes Pattern D (about 17% of rows) and
   Pattern E together.
4. **Use `performed` and add `step_basis`** (`stated_in_flow | inferred_order | generic_description`). This makes
   inferred positions (iwlpc `-a-s01`, 00219 `-a-s02`) and generic flows (00140 chip-first, iwlpc Fig. 1) explicit
   instead of hiding them in notes.
5. **Add typed condition columns** for the parameters that are now in free text or missing: `force_n`,
   `current_density_ma_cm2`, `dose_mj_cm2`, `atmosphere`, `ramp_c_per_min`, and `temp_c_max` for profiles. Keep
   `conditions` for the rest. Add a `split` column (for example "NA 0.12/0.16/0.18/0.24", "DC 1-5 mA/cm2") for
   parameter sweeps on a step, so they stay on the step of the TV that ran them.
6. **Put the conditions and splits on the TV that ran them.** When a value is stated for one variant only, put it
   only on that variant's row.
7. **Add a checklist line to rule 7:** "for every TV with `tv_kind` package/test_coupon/sub_assembly, either link a
   flow or list `process_steps` in not_reported for that TV". This catches Pattern E.

### (b) Re-pass
Warranted, but targeted, not a full re-extraction. The reading quality is good; the problems are scope and structure,
and most can be found mechanically.
1. **Mechanical pass (script, no LLM):** flag papers where at least a third of the rows are
   test/inspection/preconditioning (13 papers), papers with 3 or fewer rows, and rows whose `step` matches a
   structure-only pattern. Also cluster identical (paper, step, category) rows across TVs (752 rows) into candidate
   shared flows.
2. **LLM re-pass on the flagged set plus every `no` paper:** reclassify `process_flow_level`, delete or move
   test rows to `metrics`, and build `process_flows` with TV links and deltas. Fill the typed condition columns from
   the existing `conditions` text, using the paper only where text is ambiguous. Check sibling and variant TVs for a
   missing flow (Pattern E).
3. **Spot-check pass on FULL/ORDERED papers** (about 20, stratified by bucket) for missing intermediate steps such as
   the PID litho in 00140 and for conditions on the wrong TV. The rate here was 1 missing step and 2 wrong-TV values
   in 6 papers with real flows, which is too low to justify re-reading every paper.
4. Before the re-pass, back up `data/process_steps.csv` and the evidence files, and run it through `_staging` and
   `merge_staging.py` with a diff report. Do not rewrite merged rows in place.
