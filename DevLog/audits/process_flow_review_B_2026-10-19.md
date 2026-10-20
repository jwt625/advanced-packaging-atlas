# Process-flow capture review B (2026-10-19)

Fresh-context, read-only review of 14 papers: 9 with `has_process_flow=yes`, 5 with `no`. For each paper I read the full `references/<id>/text.md`, opened the flow figures in the page renders, and compared them with `data/process_steps.csv` (and `papers.csv`, `test_vehicles.csv`, plus evidence/stack rows where relevant). Rule baseline: SKILL.md rule 7, schema `process_steps` v2.2, DevLog-004.

Grades
- Disclosed: FULL = ordered flow with materials/conditions; ORDERED = ordered steps with few or no conditions; FRAGMENTS = isolated or generic steps with no real sequence; NONE.
- Capture: complete / minor misses / structural problems (duplication, wrong TV, imposed order) / invented.
- "Misses" counts the concrete items listed below. Cosmetic issues are counted only when they change how the flow can be read.

## Per-paper table

| paper | has_process_flow | disclosed | steps in DB | capture grade | misses |
|---|---|---|---|---|---|
| itherm45881.2020.9190542 | yes | FRAGMENTS | 6 | content faithful; order imposed; test steps padded | 3 |
| vlsitechnologyandcir65830.2026.11577576 | yes | ORDERED (generic POR flow) | 4 | complete | 1 |
| ectc51529.2024.00133 | yes | FULL | 6 | minor misses | 2 |
| ectc51906.2022.00232 | yes | ORDERED (no conditions) | 6 | complete content; structural | 3 |
| eptc59621.2023.10457670 | yes | ORDERED (materials, dims; no conditions) | 15 | minor misses + missing TV | 4 |
| ectc51846.2026.00199 | yes | FULL | 18 | complete | 1 |
| ectc51529.2024.00321 | yes | ORDERED (materials, equipment; few conditions) | 15 | complete; split TVs empty | 2 |
| ectc32862.2020.00185 | yes | FULL | 29 | near complete | 4 |
| estc60143.2024.10712129 | yes | FULL for TCB; ORDERED for SAP, embedding, 2.5D | 73 (43 unique) | structural: duplication, branch seq, missing TV, unlinked targets | 6 |
| ectc51906.2022.00008 | no | FRAGMENTS | 0 | `no` correct | 0 |
| ectc51529.2024.00049 | no | NONE | 0 | `no` correct | 0 |
| ectc51909.2023.00135 | no | NONE (finished structure only) | 0 | `no` correct | 0 |
| ectc51687.2025.00047 | no | NONE | 0 | `no` correct | 0 |
| ectc51687.2025.00055 | no | NONE | 0 | `no` correct | 0 |

Headline: none of the 172 rows reviewed contains an invented process step or wrong chemistry. The problems are structural:
- the same flow copied onto sibling TVs;
- sibling or split TVs left with no rows;
- alternative routes flattened into one seq;
- step targets left in other tables;
- a yes/no field that cannot express how much flow the paper actually discloses.

## Per-paper misses

### itherm45881.2020.9190542 (FRAGMENTS, 6 rows)
The paper names the BLT and coverage levers but gives no sequence. Text: dispense patterning, curing profile, film pick and place, lid attach with BLT set by lid cavity depth, adhesive thickness and clamping force (p.2 Sec. Development). Figs. 1-2 (p.2) are a configuration drawing and a cross-section, not flows.
1. Order imposed: s01-s04 put the levers in a sequence the paper does not state. The rows' own notes say "assembly order not stated" (itherm45881.2020.9190542-a-s01..s04).
2. Non-fab steps padded into the flow: s05 (mount on test PCB) and s06 (JEDEC ThetaJC test) are measurement setup (p.2 Sec. Experiment, p.3 Fig. 4), not fab or assembly.
3. Label inconsistency: this disclosure level got `yes`. The comparable FRAGMENTS paper ectc51906.2022.00008 (landside IPD attach plus underfill, p.4 Sec. III.A) got `no`.
No conditions are missing: the paper gives none (clamping force, cure profile and dispense pattern values are absent).

### vlsitechnologyandcir65830.2026.11577576 (ORDERED, 4 rows)
- Fig. 1 (p.2) gives (a) flux dipping, (b) high-speed die attach (no align, lower force, RT), (c) one-time batch reflow (~260 C), (d) wafer-level molding, MUF (EMC). All four steps are captured, with the 260 C approx qualifier (a-s03).
- Miss 1: the flow is the platform POR ("used since HBM2E", Fig. 1 caption, p.2; p.1 Introduction), not an MTV4-specific recipe. MTV4's "material and process innovations" (p.1) are not disclosed. Only a free-text note on a-s01 records this; the schema has no field for it.
- Possible extra: panel (b) is labelled "Air". This could be the attach atmosphere but is ambiguous, so it is not counted.

### ectc51529.2024.00133 (FULL, 6 rows)
- The flow in Fig. 1 / Fig. 2 (p.2) and the text (p.2 Sec. II) is captured in order, with sputter tool SPC-2507, DUV laser parameters from Fig. 4 (p.3), and the 3 um / 6 um ABF result.
- Miss 1: the starting ABF film thickness is 5 um ("A 5 um [ABF] was applied ... spread over the entire uneven area", p.1 last line to p.2 first line, Sec. II). a-s04 records only the 3 um result, and no table holds the 5 um input.
- Miss 2: the trimmed Cu geometry (10 um stripes at 30 um spacing, p.4 Sec. IV) is not on a-s03. It exists only in stack_layers ectc51529.2024.00133-a-L03.
- s06 (OM/SEM inspection) is characterization, not part of the Fig. 1 flow. Acceptable, but should carry an inspection flag.

### ectc51906.2022.00232 (ORDERED, 6 rows)
The flow is captured, but only as one generic sentence: dies on temporary carrier, EMC mold to reconstituted wafer, RDL, C4 (p.1-2 Sec. II), then module to substrate with 130 um Cu pillar (p.2). No conditions are given.
1. Miscategorized: c-s04 "form C4 (Cu pillar) bumps" uses `ball_attach`. Pillar bumping is not ball attach, and the enum has no bumping category.
2. Duplication: a-s01 and b-s01 are identical rows (TV1 and TV2 share the same assembly).
3. Flow split: the module flow sits on sub_assembly TV c, while TVs a and b hold only the attach step. No field links c's flow to a and b.
Not invented: underfill, which appears in Fig. 13 (p.5), and stiffener attach are correctly left out because no step is described.

### eptc59621.2023.10457670 (ORDERED, 15 rows)
- The text sequence (p.1 "TSI Process Fabrication") is captured completely and in the right order.
1. Composite collapse: a-s14 merges "2 layers of 3 um Cu RDL ... polymer-based passivation" into one row. Fig. 4 (p.3) orders them as RDL1, BS Passivation 1, RDL2, BS Passivation 2, and Fig. 5 reports warpage after RDL1 and passivation 1 separately. The row's notes record the order, but the rows do not.
2. Missing TV flow: TV b (BEOL-only wafer, no TSV) has 0 rows, although p.3 text and Fig. 6 give its sequence (Bare Si, Metal 1-5, FS Passivation, FS UBM).
3. Missing targets: TSV pitch 50/100 um, pattern density about 0.60%, and 300 mm wafer (p.1) are not on a-s01/a-s02.
4. Locator: flow_name says "Fig. 1", but no row cites p.2 Fig. 1 (the 6-step flow schematic).

### ectc51846.2026.00199 (FULL, 18 rows)
- p.4 Sec. III.B is captured step by step with every vendor, chemical, tool and number in the text:
  - O2 plasma; ABF GL102 15 um vacuum lamination and cure;
  - Ti 35 nm / Cu 200 nm; TOK 5 um DFR; MLA 300; 2.38% TMAH;
  - 1 A/dm2 for 28 min; Remover 1165 at 50 C; Cu Etch 49-1; Ti RIE;
  - second ABF; Optec fs laser; M2 repeat.
- Miss 1 (minor): Fig. 5 (p.4, schematic) shows the second 15 um ABF on both sides. The text says only "laminated over M1", and a-s12 does not note the schematic.
- Process-development context (Ti cut from 50 to 35 nm, three PVD tools compared, p.5 Sec. IV.A) is only partly in a-s04 conditions. This is acceptable.

### ectc51529.2024.00321 (ORDERED, 15 rows)
- The Fig. 1 (p.2) panels a-i and the p.1 Sec. II.A text are captured in order, including slit coater, i-line stepper, flip chip bonder, 100 um Cu pillars, edge-plating masking, liquid compression mold and PMC.
1. Locator: a-s05's "9x9 shots" comes from Fig. 7 (p.3), but the row cites only p.1 Sec. II.A.
2. Split TVs empty: TVs b-f have 0 rows. Their process differences sit only as conditions on TV a:
   - film EMC by vacuum lamination plus PMC (p.2 Sec. III.A, p.3 Sec. III.D);
   - Cu edge-plating prevention with dummy DF, polyimide tape and Cu tape (p.2-3 Sec. III.B).
   The process each warpage split actually received is therefore not queryable per TV.

### ectc32862.2020.00185 (FULL, 29 rows)
- This is the best capture in the sample. Integration a-s01..s23 follows p.3-6, with tape lamination at 200 kPa, compression mold 150 C / 420 s / 50 kgf/cm2 (Table 3, p.4), PMC 130 C 4 h, debond 150 C 60 s, degas 150 C 1 min, Ar etch, 1000 A Ti / 1000 A Cu, 7 um PR, 5 um Cu.
- The 7 vs 10 um dielectric conflict is logged in evidence.
1. Equipment named in the text is left in conditions or omitted, with the equipment column empty: "tape laminator" (a-s01, p.2 Sec. IV.A) and "compression molding tool with bottom cavity" (a-s04, p.3).
2. Scope: thinning 800 to 400 um and dicing were "evaluated" as demonstrations (p.6 Sec. IV.B), while the reliability units are 10x10x0.8 mm (p.6 Sec. IV.C). a-s22/a-s23 are presented as part of the package flow without this caveat.
3. Partial TV flow: TV e (Table 4 runs 5-6, "glass with mold tape N1/M1 and dies", p.4) has the 3-step lamination but not the tape-lamination and die-placement steps that define it.
4. Chosen split not recorded: Table 5 (p.5) and the text select "lower pressure, shorter vacuum" (<27 um TTV, <1 mm overflow). e-s02 lists only "split: lamination pressure, vacuum duration".

### estc60143.2024.10712129 (73 rows, 43 unique)
Disclosure by build:
- Fig. 3/4 (p.2): TCB 235 C bond, 70 C stage, 7 s; 80 C warm-water flux clean; CUF+EMC vs MUF; flux-less.
- Fig. 5 / Sec. II.B: SAP on a 320 mm panel.
- Fig. 6: die-embedded interposer.
- Fig. 7 (p.3): 16-step 2.5D package flow.

Misses:
1. Duplication: TVs a/b/c carry identical 7-row flows (14 duplicate rows), and TVs g/h carry identical 16-row flows (16 duplicate rows). 30 of 73 rows are copies. The "73 steps" figure overstates the information by 1.7x.
2. Inconsistent coverage: TV i is the same Fig. 7 build (stiffener study, p.4 Sec. III.C) but has 0 rows, while g and h each carry a full copy.
3. Branch flattening: on TVs a/b/c, the alternative routes "CUF+EMC" (s01-s04) and "MUF" (s05-s07) share one seq 1-7. Read by seq, MUF follows CUF+EMC on the same part. The MUF branch also lacks the "CUF skip" row that Fig. 3 shows. The d-s03 `performed=no` convention exists but is not used here.
4. Step targets stranded in tables:
   - interposer thickness 200 um after grinding (Table 3, p.2) for g-s07;
   - backside bumps Cu/SnAg 30/25 um, 75 um diameter, 150 um pitch (Table 3) for g-s09;
   - selected stiffener t=2.0 mm, w=20.5 mm (p.4 Sec. III.C) for g-s14;
   - BGA pitch 1000 um (Table 4, p.3) for g-s15.
5. Incomplete result: f-s09 records L/S 5/5 um only. 10/10 um was also formed (p.4 Sec. III.B; abstract p.1).
6. Locators: only Fig. 7 is registered as a process_flow key figure. Figs. 3-6 (p.2) are also flow figures. The rows cite them, so this only matters for the figures table.

Handled correctly: e-s02 keeps "Ti 25 um, Cu 150 um" as printed in conditions (likely an nm typo, p.2 Sec. II.B) and leaves thickness_um blank.

### `no` papers: was a flow missed?
- ectc51906.2022.00008: no flow was missed. The only process statements are "known-good IPD attached to the landside" plus a void-free underfill CSAM check (p.4 Sec. III.A). The Si connection block is "assembled on the landside same as a discrete IPD" (p.3 Sec. II.B). These are FRAGMENTS with no sequence or conditions, so `no` is defensible. It is the same disclosure level as itherm's `yes`.
- ectc51529.2024.00049: no flow was missed. It says only "leveraging InFO process to form RDL interposer from 6L to 9L" (p.3 Sec. IV.A) and "leveraging current InFO process and tooling" (p.4 Sec. V). "Simplified flow" there means the design flow (PDK/tape-out). NONE.
- ectc51909.2023.00135: no flow was missed. Sec. II (p.1) describes the finished structure (40 um microbumps, 150 um C4 Cu pillar, UF1/UF2, EMC side mold, Cu stiffener) with no order or conditions. The "optimized" TV is a design change (50 um interposer, taller C4), not a process. NONE.
- ectc51687.2025.00047: no flow was missed. The "KY process" is undisclosed (p.4 Sec. IV.A). The "short cut flow" (p.4 Sec. IV.B, Fig. 12 p.5) is a tape-out of SPICE calibration structures. NONE.
- ectc51687.2025.00055: no flow was missed. C-Layer "replaces dielectric to some degree" (p.1 Sec. II.A), and Fig. 1 shows bonding schemes, not steps. The thermal TV description (p.2 Sec. II.B: 5 laminate layers, 27x27 mm specimens on 300 mm wafers) is structure, not a flow. NONE.

## Failure patterns (this sample: 172 rows, 9 yes-papers)

| # | pattern | papers | rows / instances | locators |
|---|---|---|---|---|
| 1 | Identical flow copied onto sibling TVs | 2 | 31 duplicate rows (estc 30, ectc51906.2022.00232 1) | estc a/b/c, g/h; 00232 a-s01=b-s01 |
| 2 | Sibling/split TVs with no rows, or only a partial flow, while the flow sits on another TV | 5 | eptc TV b; 00321 TVs b-f; estc TV i; 00185 TV e partial; 00232 a/b vs c | see per-paper |
| 3 | Numbers or equipment in the paper not on the step (held in other tables or omitted) | 4 | 00133 (5 um ABF, stripes); eptc (TSV pitch, wafer); estc (4 targets); 00185 (2 equipment) | see per-paper |
| 4 | Composite or unenumerated steps collapsed or put in `other` / wrong enum | 4 | 12 `other` rows; 1 `ball_attach` misuse; eptc a-s14 collapse | eptc a-s06/a-s14, 00232 c-s03/c-s04, estc g-s01/g-s08/g-s09 |
| 5 | Order imposed where none is stated, or alternative branches flattened into one seq | 2 | itherm s01-s04; estc a/b/c s01-s07 | |
| 6 | Measurement/test setup inside the flow | 5 | itherm s04-s06, 00133 s06, 00321 s15, 00185 a-s08, estc e-s07 | |
| 7 | Platform-generic or "evaluated" flow not distinguished from the TV's actual build | 3 | vlsi (POR since HBM2E); 00232 (generic chip-first sentence); 00185 a-s22/s23 | |
| 8 | yes/no label inconsistent at the FRAGMENTS level | 3 | itherm yes vs 00008 no (and 00135 no) | |
| 9 | Invented steps, chemistry or conditions | 0 | 0 | |

DB-wide heuristic scan (exact-signature match over `data/process_steps.csv`, 4441 rows; indicative, not verified row by row):
- `has_process_flow`: 231 yes, 8 no. The binary field separates almost nothing.
- 18 papers carry identical flows on more than one TV: 284 duplicate rows (6.4%).
- 388 rows (8.7%) are `other`, and 357 rows (8.0%) are `inspection`/`test`.
- 142 non-simulation TVs in 77 yes-papers have no process rows. Some are legitimate; this is the pattern-2 candidate list.
- 44 TVs carry more than one flow_name, so they are candidates for pattern 5 (branch seq).
- Only 365 rows (8.2%) have any of temp_c/time_s/pressure_mpa.

## Recommendations

### (a) Extraction rule and schema
1. Replace or augment the binary field with `papers.process_flow_disclosure`: full | ordered | fragments | none, defined as in this review. Keep `has_process_flow=yes` for full/ordered. Fragments get rows with `ordered=no` and no implied sequence. This fixes pattern 8 and gives the owner the graded signal they want.
2. Add process_steps columns:
   - `flow_scope`: tv_build | platform_generic | demonstration_only | prior_work | schematic_only. Fixes pattern 7.
   - `ordered` (yes/no): whether the paper states the order. Fixes the pattern 5 imposed order.
   - `branch`: the alternative route name, with seq restarting per branch. Fixes the pattern 5 flattening.
   - `step_kind`: fab | inspection | test. Or exclude test setup from process_steps. Fixes pattern 6.
   - `atmosphere` and `force_n`. Bond force and atmosphere currently have no home; the schema has pressure_mpa only.
   - `ref_ids`: links to stack_layers/interconnects/components rows that the step creates or targets, so stranded numbers can be joined. Fixes pattern 3.
3. Add step_category values: `bumping` (pillar/microbump formation), `rdl_layer` (composite SAP/damascene RDL when the paper gives no sub-steps), `degas`, `descum`, `carrier_prep`. This cuts `other` and stops the `ball_attach` misuse.
4. Shared flows: write a flow once and attach it to several TVs. Either add `flow_id` plus an `applies_to` list, or put the flow on the common sub_assembly/parent TV with child TVs referencing it. Rule text: "Do not copy identical rows to sibling TVs. Record only the steps that differ (branch or split) on the child TV."
5. Rule text additions to SKILL.md rule 7:
   - If a figure or table gives a finer order than the text, split the steps (eptc Fig. 4).
   - Put the stated result dimension on the step that produces it (thickness after grind, bump height, stiffener size), citing the table.
   - Fill `equipment` whenever a tool type is named, even generically ("tape laminator", "compression molding tool").
   - Cite the flow figure in the locator.
   - Do not assign seq to unordered statements.
   - Record the input as well as the result (film thickness before and after lamination).

### (b) Re-pass
A re-pass is warranted, but targeted. A full re-extraction is not justified: this sample has 0 invented steps, 5/5 correct `no` calls, and mostly complete step content. The failures are structural and can largely be found by script. Proposed order:
1. Scripted pass (no model, all papers):
   - collapse exact duplicate flows across sibling TVs into one flow plus references (284 rows);
   - list yes-paper TVs with no rows (142);
   - list TVs with more than one flow_name and continuous seq (44);
   - list `other` rows (388) and inspection/test rows (357) for re-categorization;
   - output a review queue as JSONL.
2. Model pass over the 231 yes-papers only, after the schema change, scoped to process_steps. Per paper:
   - set `process_flow_disclosure` and per-row `flow_scope`/`ordered`/`branch`/`step_kind`;
   - split composite rows where a figure gives sub-order;
   - attach stranded targets and named equipment;
   - add rows for split TVs whose process differs.
   Pilot on the 9 papers here first; the per-paper miss lists above are the expected diffs. Then batch, with a fresh-context audit on about 10% of papers.
3. `no` papers: low priority. All 5 here were correct, and only 8 exist. Re-check the other 3 only when assigning the disclosure grade, since FRAGMENTS-level papers (such as 00008) should get fragment rows under the new grade.
