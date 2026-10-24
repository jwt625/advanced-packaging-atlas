# DevLog-016: process-flow animation (3D tab, Process mode)

Date: 2026-10-23. Status: done for the first pass (2026-10-24 01:15); see "State" for open items. Closes DevLog-008 phase 3 ("process animation from DevLog-007 flows").
Related: DevLog-007 (flow schema v2.5), DevLog-008 / DevLog-011 (3D tab, provenance rules, routing).

## Request (Wentao, 2026-10-23)

- Continue the process-flow visualization: animated steps that play back and forth (forward, backward, step,
  scrub) for representative packaging approaches and for the approach with the most complete process flow; at
  least one CoWoS and one EMIB.
- three.js, fully front-end, rendered and animated in real time.
- Materials carry representative textures through the process (plating, solder reflow, CMP, ...).
- Where a tool is closely involved, show its most involved part (CMP slurry and head, grind wheel, ...).
- As physically faithful as possible.

## Decisions (Wentao, 2026-10-23 answers)

1. Flows: (a) CoWoS-S composite, (b) EMIB composite with an EMIB-T route, (c) `ectc51687.2025.00027-F1` exactly as
   the paper reports it. CoWoS-L and CoWoS-R later in the same format.
2. Placement: a Process mode inside the 3D tab.
3. Scale: illustrative vs actual toggle, as in the 3D view.
4. Tool parts: the proposed default list (below).
5. Timing: similar playback duration per step; a HUD shows real process time and parameters.
6. Physics: the proposed models (below). Per-step warpage from the sim engine is out of scope for the first pass.

## Starting point (inspection 2026-10-23)

| target | backbone flow | steps | typed conditions | equipment |
|---|---|---|---|---|
| CoWoS-S | `ectc.2013.6575597-F1` (TSMC: TSV, front-side interconnect, uBump, CoW) | 11 | 0 | 0 |
| most complete paper flow | `ectc51687.2025.00027-F1` (120 mm 2.5D Si interposer: CoW to board) | 27 | 10 | 15 |
| same group, earlier | `ectc51529.2024.00155-F1` | 22 | 9 | 13 |
| CoWoS-L | `ectc51909.2023.00174-F1` | 11 | 0 | 0 |
| EMIB | `ectc.2016.201-F2` | 9 | 0 | 0 |
| EMIB-T | `ectc51687.2025.00051-F1` | 8 | 0 | 0 |

Branded flows give order but almost no conditions. Conditions come from DB papers of the same step type (e.g.
`3dic63395.2024.10830178-F1` imec Si interposer, 25 steps / 14 typed) first, then public sources, then template.

## Design

### Provenance (binding, same as DevLog-008)

- Every rendered number (geometry, HUD parameter, profile point, tool dimension/kinematics) is `reported` (DB cell),
  `derived` (formula over cells), or `template` (rationale required; public source when one exists).
- A composite flow shows, per step, which paper supplies the order and which supplies each value.
- Template values look template (desaturated / dashed in the HUD; "not reported; illustrative" in tooltips).
- No paper figures; geometry built from distilled values.

### Engine (front-end, `app/src/lib/process/`)

- Deterministic: the scene is a pure function of (step index, t in [0,1]) per flow and route. Reverse play, step
  back and scrub are evaluations at other times; step-boundary snapshots are cached.
- Three linked scales: wafer/panel + tool, package cross-section block, feature unit cell (TSV, bump, via). Each
  step names its primary scale; the secondary scale is a picture-in-picture synced to the same t. Camera moves
  between scales at step boundaries.
- Illustrative vs actual toggle (illustrative z-map as in the 3D tab; actual = true scale + ruler).
- Controls: play/pause, reverse play, step back/forward, scrub bar with step ticks, speed, loop; keyboard; URL hash.
- HUD: step n/N, name, route, category, equipment (DB), real elapsed process time, typed parameters with status,
  and a mini profile plot (T(t), F(t), P(t)) when a profile exists.
- Render loop runs only while playing or moving; idle = render on demand.

### Physical models (first pass)

| process | model |
|---|---|
| capillary underfill | Washburn front x(t) = sqrt(gamma h cos(theta) t / (3 mu)) between parallel plates, front shape around bumps |
| via fill plating | bottom-up superfill (fill height vs time at a stated current density; Faraday rate), then overburden |
| through-mask plating | uniform growth at the Faraday rate within resist openings |
| CMP | Preston removal dz/dt = Kp P v; overburden cleared, then Cu dishing / oxide erosion |
| grinding | thickness vs time at a wheel feed rate; coarse then fine; reveal when the target plane is reached |
| DRIE (Bosch) | etch/passivate cycles; scallop count = depth / etch per cycle; liner follows the scalloped wall |
| PVD | conformal-ish film with sidewall/bottom step coverage fractions |
| solder reflow | volume-conserving truncated sphere on the wetted pad (height solved from volume and pad diameter); paste/plated texture to liquid sheen |
| TCB | bond head force/temperature profile; contact, solder melt, collapse to the stated standoff |
| compression molding | mold gap closes, EMC flows over dies; cure state |
| laser debond / dicing / ball attach | scan front, kerf, ball drop and reflow |

### Procedural materials (no image textures)

As-deposited vs polished Cu, plated Cu grain, sputtered seed sheen, ground vs polished Si (grind marks), solder
paste vs reflowed solder, EMC with silica filler, underfill flow front, polyimide, photoresist (exposed/unexposed),
dry film, ABF build-up, glass carrier, Ni/Au, OSP, temporary bonding adhesive, slurry film. Feature sizes in um so
they stay physical in both scale modes. Materials support clipping planes and instancing.

### Tools (most involved part only)

CMP (platen, grooved pad, carrier head with retaining ring, pad conditioner, slurry arm and film); grinding (cup
wheel with diamond segments, chuck table, coolant); DRIE (Bosch cycles, plasma glow); PVD (target, plasma, flux);
ECP (wafer face down, anode, electrolyte flow); litho (reticle, exposure light, resist); TCB bond head; jet
dispenser with the capillary front; compression mold chase; conveyor reflow oven with live profile; laser debond
scan; dicing blade; ball placement. Geometry and kinematics from public sources (research files below).

### Files and ownership

| path | owner |
|---|---|
| `config/process3d/RESEARCH_TOOLS_FAB.md` | research agent R-a (wafer-level tools and conditions) |
| `config/process3d/RESEARCH_TOOLS_ASSEMBLY.md` | research agent R-b (assembly tools and conditions) |
| `config/process3d/flows/*.yaml`, `config/process3d/COMPOSITION.md` | flow agent D (content + provenance) |
| `config/process3d/CONTRACT.md`, `app/src/lib/process/` (core), 3D-tab integration | engine agent E1 |
| `app/src/lib/process/materials/` | materials agent E2 |
| `app/src/lib/process/tools/` | tool agents E3 (after research) |
| `scripts/build_process3d.py` -> `app/static/data/process3d.json` | flow agent D (after the contract) |

Shared dev server: tmux `apa-app`, http://127.0.0.1:47331 (repo convention). Screenshots go to
`cache/process3d_renders/` (git-ignored).

## TODO

- [x] Inspect data and 3D tab; questions answered (2026-10-23)
- [x] Phase 1 (parallel): R-a, R-b research; D flow composition (content); E1 contract + architecture + fixture;
      E2 materials library with a dev-only lab page
- [x] Coordinator review of the contract; D converts flows to the contract and writes the builder
- [x] Phase 2: E1 engine (ops, physics, scales, playback, HUD, integration); E3 tools (fab, assembly)
- [x] Phase 3: wire real process3d.json; illustrative/actual; performance pass
- [x] Fresh-context audits A1, V1, A2, V2, final combined; fixes through 2026-10-24 01:10
- [x] DevLog-008 phase 3 ticked
- [ ] README pointer (not done: README is outside this request's scope; add when asked)
- [ ] Commit (awaiting Wentao)

## State at 2026-10-24 01:15 (hand-off)

- What exists:
  - 3D tab -> Process mode plays 3 flows / 6 routes: cowos_s_composite (30 steps), emib_composite (emib 12 /
    emib_t 13), ectc51687.2025.00027-F1 (3 routes, 27 steps each).
  - Data: `app/static/data/process3d.json`, strict build, 0 pendings, 0.76 MB; built by
    `scripts/build_process3d.py` from `config/process3d/{flows,geometry}/`; checked by
    `scripts/check_process_flows.py`.
  - Engine `app/src/lib/process/`; materials `materials/` (38 keys, one shader family); tools `tools/fab/` (14)
    and `tools/assembly/` (10).
  - Contract `config/process3d/CONTRACT.md` sections 1-21.
- Verified (final L35 run `cache/process3d_renders/engine/20261024_010153/`):
  - pnpm check 0 / 0;
  - budget max 126 draw calls, 0.88 M triangles;
  - 0 state and 0 pixel mismatches forward vs backward on all 6 routes;
  - cell-over / block-over / low-work-fraction checks at 0.
  - The final combined audit passed all three user directives and all physics checks; its F1-F13 were fixed
    after it, verified by L35 / L37 / L38 shots and a coordinator spot check (no further fresh-context audit,
    to save usage).
- Known open items:
  - EMIB-T TCB at block scale: fine-pitch bumps still read as tall pillars (lateral clamp 0.4 pitch vs the
    active-body z share); a dotted noise patch near the top edge (likely tool-face texture aliasing).
  - m14: Single-mode framing after a Compare visit (pre-existing 3D-tab behaviour, outside this scope).
  - m8: playback can stall under software GL (low confidence).
  - GPU frame time not measured on real hardware (all budgets from headless SwiftShader).
  - Composite flows are mostly template (CoWoS-S reported 29 of about 500 values; EMIB 32). This is honest:
    branded papers give order, not conditions.
  - Low-confidence geometry drivers: SnPb C4 100 um (X1), EMIB / EMIB-T TCB profiles (X3 / X4), EMIB-T cavity
    joint SnAg (X5), underfill effective viscosity 1.4 Pa s (A114), 00027 paste deposit 400 um (X6).
  - CoWoS-L and CoWoS-R flows (decision 1, "later in the same format") not started.
- Dev server for inspection: tmux apa-app, http://127.0.0.1:47331/3d (left running).

## Progress log

- 2026-10-23: decisions recorded; plan written.
- 2026-10-23: phase 1 launched (5 agents): L32 research fab tools, L33 research assembly tools, L34 flow
  composition (content + provenance, `{pending}` where no source yet), L35 engine contract + architecture + fixture
  (stops for coordinator review), L36 procedural materials + dev-only lab page (own server, tmux apa-l36, :47362).
  Lane notes in `DevLog/lanes/L32-L36`.
- 2026-10-23: L35 phase 1 done: `config/process3d/CONTRACT.md` (process3d.json v1), `app/src/lib/process/types.ts`,
  7-step fixture. Model: pieces (wafer/panel/die/substrate/carrier...) with joins (place, TCB, temp bond), flip and
  orient; sites (repeated feature grids); 8 body kinds (slab, film, hole, via_fill, post, solder, fill, cut) declared
  once as built, ops drive state only; 22 ops with physics (Bosch cycles, step coverage, Faraday plating, Preston
  CMP + dishing, grind infeed, volume-conserving solder, Washburn underfill, squeeze-flow mold); scales work / block /
  cell with PiP; steps have approach / ops / retract phases; 6 s x weight per step at 1x. Every physical number is
  a PDim (Dim + value/unit).
- Coordinator decisions on L35 questions: PDim everywhere; 00027 flow family null, label "Si interposer 2.5D";
  composite DB steps run as sub-ops (step i/N = DB steps); joints drawn by the upper piece's solder; constants in
  engine code with citations; value-only route differences become separate steps. Relayed to L36: setFront(axis,
  box) for one continuous scene-space flow front; keys al, release, prepreg (alias of core).
- 2026-10-23: [x] contract review. L35 phase 2 started (engine, 22 ops, director, HUD, controls, Process mode in the
  3D tab; second fixture with join/flip/debond; tmux apa-l35 :47361).
- 2026-10-23: L33 done: `config/process3d/RESEARCH_TOOLS_ASSEMBLY.md`, 165 sourced rows (A1-A202) over 10 sections.
  Gaps:
  - TCB tool-tip/collet geometry (template).
  - Compression-mold closing speed, EMC density.
  - Reflow zone lengths (only 7.9 m overall).
  - CoW underfill gamma/theta/viscosity at dispense temperature: 22 Pa s at 25 C datasheet vs about 1.4 Pa s
    effective implied by a 60 min fill; the underfill fill-time knob is derived and low confidence.
  - ABF / cured underfill / flux residue colours.
  - EMIB cavity depth, bridge adhesive, top-die TCB conditions.
  - HUD shows TCB head set vs actual joint temperature separately (440 C set / 250 C actual in an FCB3 run).
- 2026-10-23: L38 assembly tool actors launched (tools/assembly/, ASSEMBLY_TOOLS map, dev-only tool lab,
  tmux apa-l38 :47364). L35 told to merge ASSEMBLY_TOOLS / FAB_TOOLS in its registry and plot two temperature
  traces for TCB.
- 2026-10-23: L34 content phase done (`config/process3d/flows/{cowos_s,emib,2p5d_120mm}.yaml`, `COMPOSITION.md`,
  `scripts/check_process_flows.py`, 0 errors):

  | flow | steps | routes | reported | derived | template | pending (unique) |
  |---|---|---|---|---|---|---|
  | 2p5d_120mm (00027) | 27 per route | lts_lts, lts_sac, sac_lts (the paper's joint combinations) | 101 | 2 | 42 | 21 |
  | cowos_s | 28 (29 sub-ops) | main | 63 | 0 | 102 | 57 |
  | emib | 12 / 13 | emib, emib_t | 61 | 3 | 106 | 37 |

  Coordinator approved the 10 composition calls (COMPOSITION.md section 3):
  - CoWoS-S follows the 2013 paper: SnPb C4 on the revealed TSV, no backside RDL.
  - Glass carrier inserted from the 00027 / 00155 order; ring + BGA finish.
  - CoW bond values are analogs (template).
  - EMIB bridges arrive pre-fabricated; EMIB-T shares build-up and assembly with EMIB.
  - A ref must come from the step's own paper; anything else is an analog.

  L34 builder pass started: geometry (pieces, sites, bodies, views, profiles), `scripts/build_process3d.py`
  (strict / draft / check), filling pendings from L33 now and L32 when it lands.
- 2026-10-23: L32 done: `config/process3d/RESEARCH_TOOLS_FAB.md`, 181 sourced rows (F1-F181), 16 sections.
  - Key values:
    - Bosch: 0.79 um etch per cycle, 265 nm scallop at 10 um.
    - Cu CMP: Reflexion recipe from a patent; 1.03 um/min at 3 psi, linear in pressure.
    - Grinding: wheel 3000-6000 rpm; rough 4-6 um/s, #2000 0.05-0.25 um/s.
    - Debond / dicing: laser debond 308 nm, 12.2 m/s scan; blade 20000 rpm, 50 um kerf.
  - Gaps:
    - CMP wafer-platen offset and head oscillation, so CMP is driven by removal rate, not a Preston constant.
    - TSV-scale dishing.
    - Wheel segment size.
    - Laser line size.
    - A primary-source 300 mm Bosch recipe (current set is from a search excerpt, med).
    - ECP flow and anode distance.
    - Stepper optics geometry.
- 2026-10-23: L36 done: `app/src/lib/process/materials/` (one uber-shader, per-key uniforms; 33 keys + aliases;
  setFront for one continuous scene-space flow front; createProcEnvironment from RoomEnvironment, no image files).
  - Metal / Si F0 come from refractiveindex.info n,k (`lab/f0_from_nk.py`); README table has 30 sourced/derived and
    30 template rows.
  - Lab: `/src/lib/process/materials/lab/index.htm` (plain Vite page, not a route; not in `app/build`).
  - Coordinator look at the screenshots (`cache/process3d_renders/materials/20261023_165911/`):
    - plated Cu grain reads right; ground Si shows spiral grind arcs; underfill shows a ragged wet front.
    - Polyimide too pale (known).
  - L36 deleted a scratchpad `dl/` folder at cleanup that may have been a research lane's temporary PDF download;
    both research lanes had finished, nothing in the repo is affected.
- 2026-10-23: L34 builder pass: `config/process3d/geometry/*.yaml`, `scripts/build_process3d.py` (strict / --draft
  / --check), 7 contract checks + joint site alignment, 11 negative cases. Draft JSON 0.48 MB, 328 refs.

  | flow | steps | ops | bodies | reported / derived / template | pendings (unique) |
  |---|---|---|---|---|---|
  | 00027 | 27 per route | 36 | 32 | 118 / 87 / 167 | 5 |
  | cowos_s | 28 | 78 | 53 | 71 / 86 / 313 | 20 |
  | emib | 12 / 13 | 75 | 64 | 81 / 75 / 307 | 21 |

- Coordinator decisions (2026-10-23):
  - SnPb 183 C template accepted, with a public citation to add.
  - New PDim status `na` (not reported) only for HUD-only params; strict build errors only on drawing-required
    pendings, listed in `config/process3d/PENDING.md`.
  - The CoWoS-S TSV reveal is drawn physically: grind stops above the via bottoms, Si recess etch with tip
    protrusion, backside passivation, CMP opens the tips. Numbers from the L32 reveal rows.
  - A draft JSON is written to app/static/data with `"draft": true` and a `pending` array; the engine shows a DRAFT
    banner.
  - Contract v1.1 amendments sent to L35: line patterns, face-down solder, route filter in ops, `clean` op, joint
    solder from `onto`, place solder arg, completeness n, `na`.
  - L39 research on the remaining pendings launched (`config/process3d/RESEARCH_PENDING.md`).
- 2026-10-23: L38 done: 10 assembly tool actors in `app/src/lib/process/tools/assembly/`:
  - tcb_head: separate set / joint temperature traces, 440 C set / 250 C joint max from A10;
  - pick_place: collet or 3-nozzle mounter;
  - jet_dispenser: 300 Hz jet, L-pass, needle bead mode;
  - mold_chase: granular EMC, ETFE film;
  - reflow_oven: 14 + 2 zones;
  - ball_placer, stencil_printer, laminator, laser_drill (CO2 / UV), xray_ct (CT / SAM).

  Lab at `/src/lib/process/tools/assembly/lab/index.htm`; 256 screenshots in
  `cache/process3d_renders/tools_assembly/20261023_171930/`. Coordinator look:
  - The jet L-pass, TCB descent with the dual-trace profile, and the mold chase read right.
  - Tools look flat grey in the lab (no environment map there).

  Follow-ups routed:
  - L35: HUD extras on ToolActor (readouts / traces / defaultDuration), held-piece hand-off, ctx.live keys,
    mold `charge: granular | liquid`, engine-owned front mapping at block scale.
  - L37: cvd, wafer_bonder, cure_oven.
  - L36: ceramic, silicone, pet, water keys.
  - Three lanes hit API 529 overloads mid-run (L38, L39, L35); all resumed.
- 2026-10-23: L34 decisions applied.
  - SnPb 183 C cited from cached itherm.2012.6231522 p.2.
  - `na` allowed only in hud / targets / equipment; 34 hud_only pendings are now `na`.
  - CoWoS-S TSV reveal is physical:
    - grind stop at 110 um (10 um of Si over the via bottoms);
    - Si recess 15 um at > 9 um/min (F141);
    - tip protrusion 5 um (F140);
    - final Si 95 um;
    - liner loss 0.075 um, below the 0.17 um bottom liner;
    - passivation, then CMP opens the tips (new `tsv_tip` body).
  - Draft `app/static/data/process3d.json` written (0.49 MB, `"draft": true`, 27 pending uses).
  - Strict build blocked by 10 drawing_required values (`config/process3d/PENDING.md`):
    - SnPb C4 diameter / height / resist;
    - EMIB top-die and EMIB-T bridge joint temperature profiles;
    - EMIB-T cavity-joint alloy;
    - EMIB LTS BGA alloy;
    - TIM bond line;
    - 00027 stencil thickness and paste diameter.
- 2026-10-23: L36 follow-up: keys ceramic (AlN), ceramic_sic, silicone, pet, water (+ aliases), indices sourced
  (README S29-S35, T31-T34); 38 keys, 2 programs. `pnpm check` errors at that moment were in L35's in-progress
  Hud.svelte (PNa type), not in materials.
- 2026-10-23: L37 done: 13 fab tool ids in `app/src/lib/process/tools/fab/`, plus laminator_roll as an extra.
  - Tools:
    - cmp: 762 mm grooved pad, 5-zone head, conditioner sweep, slurry arm and film; 113 / 107 rpm.
    - grinder: 300 mm cup wheel, 42 segments; 6000 / 300 rpm.
    - drie: ICP, Bosch sub-phase glow 5 / 3 / 5 s.
    - cvd, pvd: racetrack target.
    - ecp: clamshell, perforated plate.
    - litho: stepper with step-and-repeat; spin_coater.
    - wet_bench, cure_oven, wafer_bonder.
    - laser_debond: line scan.
    - dicing_blade: 50 um kerf.
  - Budgets: 12 draw calls and 16.5k triangles max per tool; 100 screenshots in
    `cache/process3d_renders/tools_fab/final_20261023_173813/`.
  - Coordinator look: CMP, grinder and DRIE read right.
  - Interface notes routed to L35: faceDown flip, workRot, phase window and opPlay_s in ToolCtx, repeat / back_y in
    ToolFrame, rpm trace, fresh ctx.mat instances.
  - L36 asked for a grind-wheel radius uniform (arcs assumed a 100 mm wheel).
- 2026-10-23: L36 grind wheel: setGrindWheel(radius_um, offset_um) on `si`, default 150 / 150 mm (F129, F123);
  0 check errors. L35 told to drive it from the grinder spec.
- 2026-10-23: L39 done: `config/process3d/RESEARCH_PENDING.md` (P1-P55, proposals X1-X9).

  | class | total | found | proposal |
  |---|---|---|---|
  | drawing_required | 10 | 5 | 5 |
  | hud_only | 34 | 28 | 6 |

  - Weakest values that drive geometry:
    - SnPb C4 100 um at 200 um pitch (J-STD-028 table title in a search excerpt), 75 um plated height (reasoned);
    - EMIB top-die and EMIB-T bridge TCB profiles: 140 -> 250 C over 6.3 s, head 280 C, 39 N / 10 N, built from
      Intel 2015 process text and non-EMIB rows;
    - EMIB-T cavity joint Sn-3.5Ag and ENIG 2.05 um, proposed.
  - Coordinator call: the Al etch rate (1984, CCl4) stays `na`; values from a different process generation or
    chemistry are not shown as if they applied.
  - L34 fill + strict build started.
- 2026-10-23: L34 fill pass: strict build writes `app/static/data/process3d.json` (contract 1.1, 0.50 MB, 342 refs,
  0 pendings).

  | flow | steps | bodies | reported | derived | template | na |
  |---|---|---|---|---|---|---|
  | 00027 | 27 per route | 32 | 120 | 87 | 167 | 0 |
  | cowos_s | 28 | 47 | 71 | 63 | 327 | 2 |
  | emib | 12 / 13 | 64 | 81 | 75 | 317 | 0 |

  - `na` values: Al RDL etch time (1984 CCl4) and TSV exposure dose (gh-line broadband source vs the flow's
    i-line), both under the different-generation rule.
  - v1.1 adopted: etch_lines / line_fill damascene levels, dir: down solder, route-filtered ops, clean,
    place.solder, mold.charge granular.
  - Contract text to update: deposit may target a slab.
- 2026-10-23: coordinator check: no private-reference mention, no local absolute paths, no emoji in the process3d
  files, lanes, JSON or engine. Fresh-context audit A1 launched on data provenance, composition and physics
  arithmetic (`DevLog/audits/process3d_audit_A1_2026-10-23.md`); visual/UX audit V1 follows the L35 engine report.
- 2026-10-23: audit A1 (`DevLog/audits/process3d_audit_A1_2026-10-23.md`): 1 critical, 12 major, 22 minor.
  - Holds: 322/322 reported values equal their DB cells; 25/25 sampled confirmed in paper text; Faraday, Bosch,
    C4 cap, reveal chain and Washburn formula recompute.
  - C1: reflow melts solder regardless of liquidus (00027 LTS routes melt SAC at a 160 C peak).
  - Majors:
    - M1 grind stages use remaining instead of removed thickness;
    - M2 Washburn with 25 C viscosity gives 8-25 h fills;
    - M3 EMIB draws 1 bridge vs 2; M4 mixed-pitch collapse overlap; M5 EMIB lid floats, no TIM;
    - M6 EMIB-T via misses its pad; M7 coarse vias through the bridge region;
    - M8 TSV not connected to M1, passivation without openings; M9 CoWoS D2 without pads;
    - M10 invented strip durations;
    - M11 most composite "reported" values come from papers outside the family;
    - M12 SnPb peaks are J-STD-020 classification limits; uBump remelt during C4 reflow not shown.
  - Coordinator decisions:
    - M11: in a composite flow, `reported` only for papers of that family; other papers' values are analogs.
    - M10: unknown durations are `na`.
    - M12: SnPb process peak from a process source; the uBump remelt shown as physically real.
  - Data fixes to L34; engine fixes (per-body melt vs liquidus, per-field collapse) to L35. Re-audit after.
- 2026-10-23: L35 phase 2 done: Process mode in the 3D tab plays all three flows on all 6 routes + 3 fixtures.
  - Code: `app/src/lib/process/` (data, physics, ops, state, model, solder, geom, viewer, Hud, ProfilePlot,
    Controls); lazy chunk 115 kB.
  - Verification: `pnpm check` 0 / `pnpm build` ok; 804 screenshots on the 17:53 strict build
    (`cache/process3d_renders/engine/20261023_181912/`).
  - Forward vs backward state sweep: 0 mismatches.
  - Budget: max 105 draw calls, 0.78 M triangles (headless software GL; GPU frame time not measured).
  - One WebGL context; 0 idle frames.
  - Contract v1.1 final (CONTRACT.md sections 14-15).
  - A1 C1 in the engine: melt per body vs `liquidus_c`, with remelt. A1 M4: per-field collapse, rigid die settles
    on the smallest.
  - Stubbed: box fillets, no capillary lag around bumps, rot_deg ignored, standoff displayed but not enforced,
    template styling only in the HUD.
  - Coordinator look:
    - CoWoS CMP cell, CoW TCB with the dual-trace profile, and the EMIB build-up section read right.
    - HUD panel overlaps the z-ruler labels; Si renders near-white.
  - L34 asked for per-body liquidus_c and M6 consistency.
  - Visual / UX audit V1 launched (`DevLog/audits/process3d_audit_V1_2026-10-23.md`).
- 2026-10-23 18:43: dev server for Wentao's live inspection: tmux apa-app, http://127.0.0.1:47331/3d (agents use
  their own ports).
- 2026-10-23: L34 A1 fix pass done; strict build 0.63 MB, 346 refs, 0 pendings.
  - C1: per-body liquidus_c; probes confirm:
    - lts_sac keeps SAC solid at 160 C;
    - sac_lts keeps SAC solid at about 210 C;
    - SnAg uBumps remelt at 233 C;
    - the CoWoS C4 reflow leaves the uBumps solid.
  - Analog TCB profiles get cool-down.
  - M1: rough 635 um / 127 s + fine 30 um / 120 s.
  - M2: effective viscosity 1.4 Pa s (A114, low); fills 51 s to 95 min.
  - M3 / M7: 2 bridges, 3 coarse fields kept out of the bridge band.
  - M4: all bumps plated to 30 um, caps sized for a common 0.94 um collapse, standoff 29.06 um.
  - M5: TIM 85 um, sealant, lid foot.
  - M6: 70 um UBM, joint H 34.44 um, via depth 50.56 um.
  - M8: 15 um M1 landing on each TSV; passivation slab with 27 um openings. M9: D2 pads.
  - M10: durations only on the owning op.
  - M11: 60 cells converted to analogs. Composites now reported / derived / template: cowos_s 34 / 2 / 269, emib
    34 / 0 / 257.
  - M12: Kester EP256 Sn63Pb37 210-225 C window, 217.5 C drawn.
  - 19 of 22 minors fixed.
  - Engine round 1 sent to L35: placement on the current (trimmed / reflowed) extent (CoWoS unit floats about
    600 um), ball_attach peak gating, OpCall.src, ball and paste merge.
- 2026-10-23: visual audit V1 (`DevLog/audits/process3d_audit_V1_2026-10-23.md`): 3 critical, 13 major, 14 minor.
  - Holds: playback controls, URL restore, 0 idle frames, other modes unchanged, tooltips resolve, no page errors.
  - Critical:
    - C1: camera inside or behind tools at wafer scale (blank thinning frame; mold, carrier bond and print show
      only tool parts).
    - C2: Si / Cu / solder near-white (bright environment + lights + low-roughness metals).
    - C3: EMIB cavity not an open pocket; ABF layers float with 15 um gaps at cell scale.
  - Majors:
    - M1 ruler over the HUD; M2 HUD up to 757 px tall;
    - M3 step real time voided by one N/A sub-op; M4 390 px layout clipped;
    - M5 tool parts swamp block scale; M6 TSV recess drawn with the laser drill; M7 bridge adhesive as spin coat;
    - M8 grind sunburst per die; M9 faceted reflowed solder; M10 noisy plated Cu;
    - M11 white plug at the TSV bottom; M12 oversized flux at ball attach; M13 EMIB BGA without balls.
  - Routed (round 2):
    - L35 engine: framing rule with tool focusBox, lights / tone mapping, cut rendering, HUD / ruler / narrow
      layout, step clock, grind centre, theme / hash / route minors.
    - L36 materials: C2 material response + recommended renderer settings, M9, M10, M8 API.
    - L37 / L38 tools: focusBox, occluder fade, per-scale reduced tools, M12, ball_placer budget.
    - L34 data: C3, M6, M7, M11, M13, HUD labels, sub-op durations.
  - Re-audit V2 after the round lands.
- 2026-10-23: L36 V1 round done.
  - C2: cause was the uniformly white RoomEnvironment; now a dark studio environment (radiances template, T35).
    Measured F0 unchanged.
  - M9: reflowed solder smooth, satin roughness 0.24.
  - M10: procedural features fade in over 3-6 px on screen; plated Cu grain contrast about +-3.5 %.
  - M8: setGrindCentre API.
  - Recommended RENDER_SETTINGS: Neutral tone mapping, hemisphere 0.6, directional 1.2. Grind-only steps end at
    finish 0.5.
  - Coordinator look (`cache/process3d_renders/materials/process_after2_20261023_195656/`): CoW block and C4 cell
    read right (Si slate grey, Cu copper, SnPb dome on the revealed tip, EMC black). Hooks sent to L35.
- 2026-10-23: L37 V1 round done.
  - C1: chucks placed on back_y for face-down steps; grinder axis and bonder hardware moved or cut so no tool sits
    between the default camera and the wafer.
  - focusBox + userData.occluders on every fab actor (engine wiring pending in L35).
  - M5: block / cell scale keep only the contact element, dimmed to 60 %.
  - M6: drie does a continuous SF6 recess (F141); real Bosch cadence when <= 2 cycles per playback second.
  - Data item sent to L34: logic thinning and saw must act on a 300 mm logic wafer (repeat grid), not a single die
    under a 300 mm wheel; same check for 00027 and EMIB dies.
- 2026-10-23: L38 V1 round done.
  - focusBox + occluders / setOccluderOpacity on every assembly actor.
  - Work-scale cutaways: mold chase (charge and gap now visible), stencil printer, ball placer.
  - Block / cell dimming; reflow oven hidden at block / cell scale.
  - ball_placer LOD: 110k -> 27.7k triangles.
  - pick_place uses the mounter head for pieces > 25 mm (A5).
  - M12 traced to the engine's solder bodies (flattened, unclipped) -> L35.
- 2026-10-23: L34 V1 round done (strict, 0.63 MB, 0 pendings).
  - C3: cause in the builder (repeated group ops emitted op type by op type); now level by level. EMIB / EMIB-T
    cavities are open pockets; CoWoS damascene fixed too.
  - M6: recess on drie. M7: adhesive / TIM / sealant print with no tool, "form not reported".
  - M11: tsv_tip removed; tips are the tsv_cu column bottom.
  - M13: BGA window fixed.
  - HUD labels: short human labels required by the builder.
  - Sub-op durations from F37 / F76 where sourced.
  - CoWoS logic dies now come from 300 mm logic wafers (bump, thin, saw at wafer level). 00027 dies stay die
    pieces: the paper gives no die wafer or saw step.
  - Engine bugs found and sent to L35: recess progresses from the wrong side on face-down pieces; a determinism
    pixel mismatch at EMIB step 1 (tool hysteresis suspected).
- 2026-10-23: L35 engine rounds 1 + 2 done (CONTRACT.md sections 16-17); final run
  `cache/process3d_renders/engine/20261023_205829/`.
  - Placement on the current extent: CoWoS C4 tips contact at 598 um then 20.14 um collapse; 00027 package on
    398.3 um ball caps.
  - ball_attach gates remelt; OpCall.src in the HUD tooltip.
  - Hybrid board joints: lts_lts merges (133.4 um collapse); lts_sac molten LTS on solid SAC (52.5 um); sac_lts
    SAC ball sinks through molten LTS paste with a fillet (100 um).
  - Framing on tool focusBox with occluder fade; RENDER_SETTINGS adopted; grind finish 0.5 with wafer grind
    centre.
  - Cuts remove from the exposed side (fixes the step-19 Si sheet); compact HUD, ruler on the right, 390 px
    layout; step clock sums known durations.
  - Budget: max 131 draw calls, 0.76 M triangles.
  - Determinism: state 0 mismatches; pixels identical except EMIB step 1 t 0.6, traced to wet_bench Points
    history (-> L37).
  - L35 deleted render folders of other lanes in cache/process3d_renders/engine/ (git-ignored, regenerable);
    it now deletes only its own.
  - Coordinator check: L35's "logic dies are die-sized" note is stale; process3d.json (20:19) has die_c / die_d as
    300 mm wafers with die grids.
  - Small tool fixes sent: L37 wet_bench determinism + spray puddle; L38 laminator diaphragm occluder.
  - Re-audits V2 (visual) and A2 (data / physics) launched.
- 2026-10-23 (Wentao): "do not reset camera between each step." Sent to L35:
  - the pose persists across steps, scrub, play, reverse and route switch;
  - one remembered pose per scale (fit once on first use);
  - the illustrative / actual toggle keeps the pose;
  - re-framing only via the Frame button, first load or flow change.
- 2026-10-23: L38 laminator fix: the diaphragm is an occluder, translucent (30 %) while conforming;
  `cache/process3d_renders/engine/20261023_212102/`. Its remaining pixel diff at EMIB step 1 t 0.6 is the known
  wet_bench history issue (L37 fixing).
- 2026-10-23: camera persistence done (L35, CONTRACT.md section 18).
  - Pose persists within a scale; one remembered pose per scale for main and PiP; first use fits once, keeping
    the view direction; Frame / first load / flow change re-fit.
  - The illustrative toggle shifts only the target height.
  - Fixed OrbitControls damping drift (about 1 unit per step after an orbit): damping off in Process mode.
  - Hooks `__apaProc.frame()` / `camera()`; render_process3d.py re-fits after each seek. V2 notified.
- 2026-10-23: audit A2 (`DevLog/audits/process3d_audit_A2_2026-10-23.md`).
  - A1 status:
    - C1 and 11/12 majors fixed;
    - M8 fixed in data, then undone by engine N1;
    - 16/22 minors fixed.
  - Holds:
    - 248/248 reported values equal their DB cells; seeded sample (20261024) all pass; M11 scope holds.
    - Plating / grind / CMP / Washburn / C4 / EMIB 29.058 um common standoff / EMIB-T via all recompute.
    - 00027 melt behaviour matches the paper on all routes.
    - No floating contacts.
  - New findings:
    - N1 (critical, engine): reveal CMP on the face-down wafer trims the front side (TSV column, field liner and
      passivation removed, steps 18-27).
    - N2 (major, data): chip D logic wafer never thinned.
    - N3 (major, engine): rot_deg ignored, so 00027 Die B overlaps Die A.
    - 14 minors: C4 UBM stripped, bumps in the die gap, missing pads, damascene etch / ECP time scope, 00027 SnAg
      current density, OpCall.src not emitted, 00135 is MediaTek, deterministic ref numbering, paste metal
      fraction, Washburn as an upper bound, full-IMC uBump, P22 date.
  - Routed: engine round 3 (N1 with a directional-op audit, N3, IMC rendering) to L35; data fixes to L34.
- 2026-10-23: L37 small fixes done.
  - Pixel mismatch cause: transparent draw-order ties broken by object id (creation history), not actor state;
    explicit renderOrder on fab tool objects.
  - Spray-coater puddle thin and dim at block / cell scale, confined to the piece.
  - The remaining 2-pixel EMIB k0 t0.6 difference persists with the tool hidden, so it is engine-side -> L35
    round 3.
- 2026-10-23: L34 A2 data round done (strict, 0.72 MB, 379 refs; builds identical across PYTHONHASHSEED).
  - N2: new `logic_thin_d` step (inserted, same 2013 F1-s09 row).
  - n1: C4 seed kept under the bump. n2: fine fields split at the die gap (EMIB 17 + 17, EMIB-T 32 + 32
    columns).
  - n3: 00027 UF gap 58.47 um, 5852 s.
  - n4: 15 um pads (analog 00148-a-L06); EMIB-T cavity ENi/Au 2.05 um; via depth 48.51 um.
  - n5: damascene etch labelled via + line, ECP 272 s. n6: per-body current density.
  - n7: OpCall.src 236 / 236. n8: cowos_s family is TSMC CoWoS papers only (00135 MediaTek and 00055 SoIC out).
  - n10: paste metal_vol_frac SAC 0.511 / SnBi 0.469 (88.5 wt%, vendor densities; flux density assumed).
  - n12: to_imc on uBump caps. n14: 2013 pitch row.
  - Follow-up: sourced IMC melt field; the engine gates remelt of IMC joints on it (to L34 / L35).
- 2026-10-23: `imc_melt_c` 415 C added on the CoWoS to_imc uBump caps.
  - Source: NIST Cu-Sn invariant equilibria, peritectic L + Cu3Sn -> Cu6Sn5 at 415.0 C.
  - No CoWoS peak reaches it (max 255 C BGA), so the converted uBumps stay solid after the CoW bond.
  - HUD shows "IMC first liquid 415 C". L35 gates remelt on it (round 3).
- 2026-10-23: visual audit V2 (`DevLog/audits/process3d_audit_V2_2026-10-23.md`): not ready.
  - V1 status: criticals 3/3 fixed; majors 8 fixed / 5 partly; minors 7 / 2 / 5. Camera persistence mechanics
    pass.
  - New findings:
    - N1 (critical): the persistent camera loses the workpiece on flip / join / dice; the PiP stays at wafer zoom.
    - N2: cell scale does not clip big bodies.
    - N3: dicing leaves one die on empty tape.
    - N4: mold step static.
    - N5: laser debond beam and head misplaced.
    - Minors: illustrative solder distortion, early necking, cure-oven backdrop, spin-coater bowl, diaphragm,
      units, HUD overflow, 390 px ruler, Single framing after Process.
  - Coordinator decision on N1 (interpreting "do not reset camera"): keep the orbit angles and the zoom relative
    to the workpiece; re-target only when the workpiece itself changes (flip, join, dice); never move within an
    unchanged workpiece.
  - Routed: engine round 4 to L35 (after round 3); data to L34 (dice pieces, PCB planes, Ni-plated lid, glass
    key); L37 (debond, cure oven, spin bowl); L38 (mold motion, laser colour by wavelength, diaphragm, ball
    LOD); L36 (glass carrier transparency).
- 2026-10-23 (Wentao): "make the aspect ratio constant within each step. e.g. when layer is getting thinned, do
  not stretch the body." Sent to L35 (round 4, high priority):
  - one frozen illustrative z-map per step (start state, or the union of start and end extents);
  - bodies change only by true geometry under that map; the map changes only at step boundaries (uniform blend or
    an instant switch);
  - the horizontal scale is constant within a step;
  - solder / posts keep their own aspect;
  - verify that untouched bodies keep a constant on-screen height across t while ground bodies shrink.
- 2026-10-23: L36 V2 m2: the glass carrier is physical transmission (Borofloat n 1.474, roughness 0.02,
  double-sided, path tint template T36). Cause: alpha 0.16 over the dark studio environment read as a Si-like
  slab; data key and engine were fine. Coordinator look: see-through at debond. Added to L35 round 4: brown-tinted
  canvas background, unreadable HUD time line.
- 2026-10-23: L37 V2 fixes:
  - N5: the debond beam terminates at the release layer and scans; the track overlay sits at the release plane;
    the lift plate appears only in the lift phase; head 150 mm above (template).
  - n3: cure oven hidden at block / cell. n4: spin bowl and puddle gone at block.
  - Data issue: 00027 s10 orient: down puts the carrier on the chuck side. Sent to L34 (orient) and L35 (pass
    release_z_um).
- 2026-10-23: L38 V2 fixes:
  - N4: the mold chase now opens / closes (u 0.2-0.6) / holds / opens; the stroke is drawn at 2x the 30 mm
    template in illustrative wafer views; granules melt.
  - m5: beam colour by wavelength class (CO2 / IR faint neutral, UV faint violet; the fs tool says "wavelength
    N/A (not stated)").
  - n5: diaphragm behind the section plane, 0.15 opacity while pressing.
  - Ball LOD raised.
  - Engine-side blockers sent to L35: mold live.front stuck at 1, gap_um non-monotonic, tReal 0 in the close
    phase, empty profile; faceted engine solder balls.
- 2026-10-23: L34 V2 data round done (strict, 0.76 MB, 380 refs).
  - N3: chip D gets its own saw step `logic_saw_d`; CoWoS-S is now 30 steps.
  - m12: 00027 PCB with 28 Cu layers (34.1 um at 1 oz/ft2, an assumption; 83.2 um dielectric).
  - m13: EMIB IHS is a Cu core with 3 um Ni (template, F176 low end, low confidence).
  - n6: builder had stripped `_min` from rate keys; now nm/min.
  - Both laser debond steps (00027 s10 and CoWoS-S) were orient: down; now up, with the carrier facing the
    laser.
  - Budget flag: 5 shots at 1.01 M triangles (00027 s07 / s09 / s10, CoWoS c4_bumping at t 0.7 / 1.0) -> L35
    round 4.
- 2026-10-23 (Wentao): "add selection/toggle button for what to show also for the smaller view, as well as button
  for different view layout." Sent to L35 (round 4):
  - secondary-view controls: scale Auto / Wafer / Block / Cell, Actual / Illustrative, tool show / hide, cell
    site;
  - layouts: Main only / Inset / Split side by side / Split stacked / Swap; side by side falls back to stacked at
    390 px;
  - per-view persistent cameras and Frame buttons;
  - all state in the URL hash; budget checked in the split layouts.
- 2026-10-23: L35 rounds 3 + 4 done (CONTRACT.md sections 19-20; `cache/process3d_renders/engine/20261023_230958/`).
  - Checks: 0 state and 0 pixel mismatches on all 6 routes; `pnpm check` clean.
  - Round 3: IMC gate (converted uBumps never remelt); metal_vol_frac in joint volumes; N1 regression passes
    (tsv_cu [679, 775.4]).
  - Constant aspect per step: one z map per step and scale, no approach blend. Untouched bodies keep their
    on-screen height while ground bodies shrink:
    - CoWoS mold_grind EMC 339.6 -> 298.2 px with ip_si fixed at 352.5;
    - 00027 s07 Si 231.1 -> 178.1 with glass fixed at 301.5.
  - Bumps: one uniform scale per site, clamped to 0.48 pitch.
  - Camera N1: a pose follows its workpiece when the box changes > 1.5x or leaves the frame; angles and relative
    zoom are kept.
  - Layouts: Main only / Inset / Side by side / Stacked / Swap. The "2nd" group sets the secondary scale, mode
    and tool; per-view Frame; hash keys layout, swap, s2, m2, t2.
  - Also fixed: N2, N3, n2, M8 (grindRoot), M11 (true-thickness floor films), M3 clock, m8, n7, n8; mold ctx
    (monotonic gap 1661 -> 831 um, front 0 -> 1, real time during close, T 140 C); debond release_z_um.
  - Open:
    - 19 shots at 151-205 draw calls vs 150 (attributed to the glass transmission pre-pass; L36 to verify, since
      EMIB has no glass);
    - the brown background is L37's debond track mesh;
    - m14 Single framing is pre-existing 3D-tab behaviour (Compare -> Single differs from Gallery / Process ->
      Single), not caused by Process; left as is, outside this scope.
- 2026-10-23: L37 debond tracks: a thin overlay on the release face, confined to the piece / window, dimmed; the
  brown block tint is gone. At work scale the opaque-looking carrier hides the tracks; the constraint (glass
  see-through at work scale) was added to L36's budget fix.
- 2026-10-23: L36 budget fix: glass transmission dropped (no pre-pass); glass is now near-black base + alpha 0.06,
  double-sided, edge tint T36, low specular at work scale (T37), see-through at every scale.
  - 15 / 19 shots back under 150 calls (e.g. CoWoS c4_bumping 163 -> 102, EMIB-T fli_t 205 -> 111).
  - The EMIB pre-pass was triggered by the laminator PET film drawn with `glass` (-> L38: use `pet`).
  - EMIB-T bga at 151 calls is mesh count (-> L35: merge static meshes).
  - New `lab/calls_check.py`.
- 2026-10-23: L38: laminator PET film uses `pet` (both scales). The PiP button was replaced by the layout group
  (V2 scripts that click "PiP" need updating).
- 2026-10-23 23:43 (Wentao): cap weekly usage below 66 %; wrap up agents if exceeded.
  - Estimate from local transcripts: the last ~4 h used 77.0 M cost-weighted tokens for ~15 % weekly, i.e. about
    5.1 M per 1 % (weights assumed from API price ratios).
  - Gate script in the session scratchpad (`usage_gate.py`): baseline 55 % at 23:43 PDT, wrap-up at 64.5 %; run at
    every report and before launches.
- 2026-10-24: L35 budget item done: per-body mesh merge (EMIB-T bga 151 -> 77 calls); the N2 `cellOver` check is in
  render_process3d.py (first run flagged 18 via-grid tiles, now clipped, 0).
  - Final run `cache/process3d_renders/engine/20261024_000113/`: max 126 draw calls, 0.74 M triangles; 0 state
    and 0 pixel mismatches on all 6 routes.
  - Usage gate 55.6 % OK. Final combined audit (V3 + A3, one agent) launched.
- 2026-10-24: final combined audit (`DevLog/audits/process3d_audit_final_2026-10-24.md`): close, not ready.
  - Item status:
    - V2 + open V1 items: 20 fixed / 6 partly / 2 not (m14 out of scope; m8 software-GL only);
    - A2 items: 17 / 17 fixed.
  - Directives pass:
    - camera: 0.000 deg drift over 65 samples;
    - constant aspect: ip_si 352.55 px at t 0 / .5 / 1;
    - layouts and the hash round-trip work.
  - Physics pass:
    - melt and IMC gate;
    - TSV chain;
    - EMIB 0.9418 um collapse;
    - 00027 hybrid H 345.4 / collapse 152.9 um (matches the engine);
    - no floating.
  - Render run: 1224 shots, max 129 calls, 0.74 M triangles, 0 mismatches.
  - Remaining:
    - F1 block-scale pads too wide, unclipped;
    - F2 00027 board joint too small under the z-map;
    - F3 actual-mode wafer z-fighting;
    - F4 EMIB-T hatching artefact;
    - minors F5-F13.
  - Final fix round: L35 F1-F4, F6, F8-F10, F13; L34 F5, F7 (buried bridge joint at stage temperature, made
    explicit); L37 F11, F12. Usage gate 56.3 %.
- 2026-10-24: L34 final round:
  - F5: the EMIB cavity step opens at block scale across the cavity edge.
  - F6: the CoWoS-S substrate window moved inside the C4 field.
  - F7: stage temperature 140 C (P17, template) as a HUD param and as `bond_tcb.stage_c`; joints buried below the
    die stack sit at about the stage temperature. The engine field BondTcbOp.stage_c went to L35.
- 2026-10-24: L37 final round:
  - F11: the dicing blade lifts 80 mm and exits during retract, hidden at t 1.
  - F12: the coat film is clipped to the window and the section plane; the same clip was applied to the debond
    tracks. Coordinator: extend the clip to every block / cell tool overlay (wet bench etc.).
- 2026-10-24: L37 block-window section clip in FabBase (4 clip planes per update, incl. library materials); 8
  shots in `cache/process3d_renders/tools_fab/clip_20261024/`. Same rule sent to L38 (assembly base). Usage gate
  57.1 %, about 2 %/h.
- 2026-10-24: L38 final round:
  - Assembly BaseActor clips at block / cell scale (same rule as FabBase).
  - Held and falling balls are true spheres at the engine's per-site factor (code clamps at 0.4 pitch; the
    contract says 0.48, to be fixed in the doc).
  - Laminator clip confirmed on EMIB final_lam.
  - The engine's landed ball overhangs the block edge (-> L35 F1).
- 2026-10-23: L37 fab tool actors launched (tools/fab/, FAB_TOOLS map, tmux apa-l37 :47363). L34 told to fill fab
  pendings from L32.
