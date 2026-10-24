---
title: Lane L34 - process-animation flow composition (content + provenance)
date: 2026-10-23
status: fill pass done (2026-10-23 17:55); strict process3d.json written (contract 1.1, 0 pendings, 2 HUD-only na)
scope: config/process3d/flows/{cowos_s,emib,2p5d_120mm}.yaml, config/process3d/geometry/{cowos_s,emib,2p5d_120mm}.yaml, config/process3d/COMPOSITION.md, scripts/check_process_flows.py, scripts/build_process3d.py, this file
owner: lane L34 (Claude subagent, DevLog-016 flow agent D)
---

# L34: process-animation flows (CoWoS-S composite, EMIB / EMIB-T composite, 120 mm 2.5D paper flow)

Binding inputs: DevLog-016 (decisions 1-6, provenance rules), DevLog-007 (flow schema v2.5),
data/schema/packaging.schema.yaml, config/package3d/TEMPLATE_FORMAT.md, config/package3d/{cowos_s,emib,emib_t}.yaml,
RESEARCH_SOTA_{COWOS,EMIB}.md, the lane brief, and the coordinator message of 2026-10-23 (contract v1 approved:
DB step granularity with sub-ops, inserted steps marked, value-only route differences as separate steps, every number
a PDim; 00027 flow family null, label "Si interposer 2.5D").

Constraints kept: no data/*.csv edits; no retrieval; no git writes; no subagents; uv for Python; ASCII only.

## Plan (2026-10-23)

- [x] Read inputs; inventory DB flows for CoWoS / Si-interposer, EMIB / EMIB-T, build-up modules, typed conditions.
- [x] Provenance format (ref / analog / derived / template / package3d / geom / pending) with a ref-scope rule.
- [x] Checker `scripts/check_process_flows.py` (refs, scope, units, expressions, categories, backbone order, required
      HUD keys, counts, `--pending`, `--table`); negative tests (10 cases, all fire; scratch only).
- [x] 2p5d_120mm: 27 DB steps as reported, paper values, TV-row geometry, analogs / pendings for the rest.
- [x] cowos_s: 2013 backbone F1 + F2 (+ F4), DB-sourced expansions and insertions to a finished package.
- [x] emib: 2016 backbone + EMIB-T route from 00051-F1; build-up module from DB SAP flows; bridge as start state.
- [x] Reshape to contract v1 after the coordinator message (steps = DB steps with ops; route filters; pieces).
- [x] Fill pendings from RESEARCH_TOOLS_ASSEMBLY.md (L33) where a sourced value exists (A52, A60, A111).
- [x] COMPOSITION.md (format, counts, decisions, per-flow tables, gaps); this note.
- [x] Builder pass (coordinator 2026-10-23): geometry companions (pieces, sites, bodies, profiles, views, op calls)
      for all three flows; scripts/build_process3d.py (strict / --draft / --check / --out) with the contract
      section 13 checks + joint alignment; 11 builder negative cases fire.
- [x] Fill pendings from RESEARCH_TOOLS_ASSEMBLY.md (L33) and RESEARCH_TOOLS_FAB.md (L32); remaining pendings only
      where no source or physical rationale exists.
- [x] Coordinator decisions (2026-10-23 17:28): SnPb 183 C cited; `na` status (checker, builder, CONTRACT.md note);
      pendings classified in config/process3d/PENDING.md (10 drawing_required, 34 hud_only -> na); CoWoS-S TSV
      reveal remodelled (grind above tips, recess, protruding liner-covered tips, passivation, tip-opening CMP);
      draft JSON written to app/static/data/process3d.json (`draft: true`, `pending` list).
- [x] Fill pass from RESEARCH_PENDING.md (L39): 10 / 10 drawing_required, 32 / 34 hud_only; #14 and #24 kept na
      (different exposure generation / obsolete chemistry); strict build written without the draft flag.
- [x] Contract v1.1 adopted (line patterns + etch_lines + line_fill, solder dir down, clean op, joint solder from
      onto + joint_top_d_um, place.solder, completeness n / na, contract "1.1"; mold charge granular for CoWoS-S).
- [x] Fresh-context audit A1 (coordinator-run): `DevLog/audits/process3d_audit_A1_2026-10-23.md`.
- [x] Audit A1 fix pass, data side (2026-10-23 18:25-19:20): C1, M1-M12, minors; strict build; both checkers;
      negative cases; COMPOSITION.md section 9; renders of every route (key steps inspected).
- [ ] L35 items from the fix pass (COMPOSITION.md section 9 end): placement by the current extent, ball_attach
      peak gate, OpCall.src, ball + paste merge.

## Results

Content phase (checker, 2026-10-23 16:45): pending specs / unique 28 / 21 (2p5d), 70 / 57 (cowos_s), 48 / 37 (emib).

Builder pass (2026-10-23 17:25):

| flow | steps | op calls | bodies | reported | derived | template | strict errors (= pending uses) | unique pending |
|---|---|---|---|---|---|---|---|---|
| 2p5d_120mm | 31 (27 per route) | 36 | 32 | 118 | 87 | 167 | 12 | 5 |
| cowos_s | 28 | 78 | 53 | 71 | 86 | 313 | 27 | 20 |
| emib | 18 (12 / 13 per route) | 75 | 64 | 81 | 75 | 307 | 25 | 21 |

Draft JSON 0.48 MB, 328 refs, 0 structural errors. Details: COMPOSITION.md sections 2-8.

After the audit A1 fix pass (2026-10-23 19:20, strict, 0 pendings, 0.63 MB, 346 refs):

| flow | steps | op calls | bodies | reported | derived | template | na |
|---|---|---|---|---|---|---|---|
| 2p5d_120mm | 31 (27 per route) | 52 | 56 | 162 | 87 | 210 | 0 |
| cowos_s | 28 | 82 | 53 | 33 | 57 | 391 | 2 |
| emib | 18 (12 / 13 per route) | 101 | 109 | 28 | 92 | 589 | 0 |

## Progress log

- 2026-10-23: inputs read; DB inventory (TSMC 2013 F1-F4, 00155 F1-F4, 00027 F1, 00155 2024 F1, 00322 F1, eptc59621
  F1, eptc67330 F2, 00060 F1, 00307 F1, 00009 F2, 2016 F1-F2, 00051 F1-F2, 00298 F1, 00103 F1, 00021 F1, 00359 F1,
  00061 F3, 00012 F1, 00365 F3-F6, 00174 F1-F4).
- 2026-10-23: checker written; 2p5d_120mm and cowos_s (first shape) written and passing.
- 2026-10-23: coordinator: contract v1 approved. Reshaped: composite DB steps carry ops, steps keep DB categories,
  routes are filters with `backbones`, pieces with contract kinds, `json_id` / `family` / `family_label`; 2p5d joint
  combinations as route-specific s22 / s23 / s25 steps; `physics` block for required op Dims (liquidus, underfill
  gamma / mu / theta, kerf, etch per cycle, grind feed, CMP rate, step coverage).
- 2026-10-23: emib written; L33 file found; three public values filled (template with source); COMPOSITION.md and
  this note written. ruff is not installed in the project env (not installed by this lane); the checker runs clean.

- 2026-10-23 16:50: coordinator: content accepted (judgment calls 1-10 approved); builder pass started.
- 2026-10-23 17:00: pendings filled from L33 / L32 rows (template, source = row ID) and DB analogs; checker resolver
  returns full provenance (cells, formula, values, note) for the builder; companion geometry loaded by the checker.
- 2026-10-23 17:05: scripts/build_process3d.py written; 2p5d_120mm companion first (draft build 0 errors), then
  cowos_s (2013 floor plan; damascene as representative trench per level) and emib (EMIB + EMIB-T cavities, bridges).
- 2026-10-23 17:15: geometry review of the z stacks (bump bases in SR openings, mold planes at the die backs, cavity
  hosts incl. via fills) fixed; strict errors = pending occurrences only (64; unique 5 / 20 / 21).
- 2026-10-23 17:25: COMPOSITION.md sections 2-8 updated (counts, decisions 14-21, companion format, builder,
  remaining pendings, contract gaps for the engine). No JSON written to app/static/data (strict fails on pendings);
  draft JSON 0.48 MB (scratch).

- 2026-10-23 17:28: coordinator decisions applied: SnPb eutectic cited from the cached reference itherm.2012.6231522
  p.2 (no web lookup needed); `na` status in checker / builder (HUD-only; error elsewhere; negative case fires);
  34 hud_only pendings -> na; TCB force profile dropped from the EMIB calls (force is HUD na); TSV reveal: protrusion
  5 um (F140), final Si 95 um (derived), liner loss 0.075 um (F141), tip-opening CMP time from F105; PENDING.md;
  one-line `na` note in CONTRACT.md section 0.1.
- 2026-10-23 17:30: draft build written (0.49 MB, 328 refs, 27 pending uses of 10 quantities); strict check = those
  27 errors only. Content checker and builder negative cases rerun: all fire.

- 2026-10-23 17:45: L39 fill block applied (template with P / X row sources, analogs kept analog; X3 / X4 TCB
  profiles with times as template points; EMIB force profile re-added from A13 / X3).
- 2026-10-23 17:50: contract v1.1 adopted in builder and companions; damascene / Al levels now slabs with open lines,
  etch_lines, line_fill (representative-trench cuts removed).
- 2026-10-23 17:53: strict build written: app/static/data/process3d.json, 0.50 MB, 342 refs, no draft flag, 0
  pendings. Content checker and 12 builder negative cases rerun: all fire as designed.

- 2026-10-23 18:25: audit A1 fix pass started. M11: checker scope for composites = family_papers only; 60 cells
  converted to analogs (cowos_s 32, emib 28); 00174 added to the cowos_s family papers; m9: derived values carry the
  package3d leaf cells.
- 2026-10-23 18:35: builder: hud.time_s goes only to the owning call (`time: true` or the only time-based op; M10);
  call-level `repeat_over`, `only` / `except`; ball_attach peak_c (L35 request); stage / cure HUD keys.
- 2026-10-23 18:40: EMIB companion rewritten (two bridges, three coarse fields with via columns, bump height control
  caps, EMIB-T pad / joint / via depth, per-die CUF, TIM, sealant, lid foot, BGA wet diameter, per-body liquidus).
- 2026-10-23 18:45: CoWoS-S: reveal grind stages, TSV landing on level 1, passivation openings, D2 pads, count-scaled
  fields, uBump / C4 joint heights, TSV tip inside the lining, ECP / CMP / Bosch times, Kester SnPb peak 217.5 C
  (web lookup: Kester EP256 data sheet Rev 21Sep09, peak 210-225 C), one A114 viscosity. 00027: per-body liquidus,
  pads under all ten dies, uBump collapse, A114 viscosity for s18, BGA wet diameter, s08 cure key.
- 2026-10-23 18:50-19:20: dev server in tmux apa-l34 on 127.0.0.1:47391 (stopped at the end); renders
  (`render_process3d.py --all-routes --no-actual --ts 1`); state probes: per-route board-reflow melt correct, TCB
  joints froze only after a cool-down point was added to the analog TCB profile (P17 50 C/s), EMIB collapse 0.942,
  EMIB-T 5.5585, C4 14.652; hanging joints got `joint_top_d_um` (EMIB-T bridge joints rendered as long cones
  without it). Engine placement float (interposer ~600 um above the substrate) reported to L35. Final renders:
  `cache/process3d_renders/engine/20261023_190957` (00027, EMIB) and `20261023_191743` (CoWoS-S); superseded runs
  removed.
- 2026-10-23 19:20: strict build 0.63 MB, 346 refs; content checker 0 errors; negatives 13 checker + 15 builder fire.

- 2026-10-23 19:40-20:15: visual audit V1 data round (COMPOSITION.md section 10): group-repeat ordering fix (the
  floating EMIB build-up), recess tool drie, no tool for printed / dispensed coats, tsv_tip removed, EMIB block window
  on a BGA row, HUD short labels and units, sourced PVD / spin / grind durations, CoWoS logic wafers (L37 item).
  Renders on the own server 127.0.0.1:47391 (tmux apa-l34), stopped at the end. Final renders:
  `cache/process3d_renders/engine/20261023_200501` (CoWoS-S), `20261023_201118` (00027), `20261023_201952` (EMIB).

- 2026-10-23 20:30-21:10: audit A2 data round (COMPOSITION.md section 11): chip D thinning step, C4 UBM keep, fine /
  FLI fields split at the D2D gap, post-reflow 00027 CUF gap, substrate / BGA / cavity pads, damascene times, per-body
  current density, OpCall.src, CoWoS family = TSMC CoWoS papers only, deterministic refs, paste metal volume
  fraction, upper-bound notes, to_imc, RESEARCH_PENDING.md P22 / X8, 2013 uBump pitch ref. Strict build 0.72 MB,
  379 refs; checkers 0 errors; negatives 13 + 15 fire. Render (own server :47391, stopped): every route, budget ok,
  determinism 0 mismatches, A2 N1 regression ok; `cache/process3d_renders/engine/20261023_214959` (earlier own runs removed).

- 2026-10-23 22:20: `imc_melt_c` 415 C (NIST Cu-Sn invariants, web lookup) on the to_imc uBump caps and in the CoW HUD.

- 2026-10-23 22:45: visual audit V2 data items (COMPOSITION.md section 12): chip D saw step, 28-layer PCB section, Ni-plated IHS, rate units.
- 2026-10-23 22:40: L37 item: laser debond steps (00027 s10, CoWoS-S debond) set to `orient: up` (glass carrier faces the laser).
  Renders (own server :47391, stopped): `cache/process3d_renders/engine/20261023_221754` (V2 items) and `20261023_223006`
  (debond); earlier own runs removed.

- 2026-10-24: final audit F5 (EMIB cavity block view), F6 (CoWoS substrate block inside the C4 field), F7 (TCB stage temperature 140 C, `bond_tcb.stage_c`); strict build 0.76 MB, 380 refs, checkers 0 errors.

## Hand-off

- Build: `uv run python scripts/build_process3d.py` (strict; current output written 2026-10-23 19:12);
  `--draft` writes with pending PDims (no value, note "pending: ..."); `--check` writes nothing.
- Open: the pendings of COMPOSITION.md section 7; contract gaps in section 8 (line patterns, solder growth
  direction, route-filtered op bodies, desmear / clean ops, substrate-side bumps in bond_tcb).
