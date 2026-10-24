# process3d audit A2 (DevLog-016): A1 re-check, provenance, physics, placement

Date: 2026-10-23. Auditor: fresh-context A2 (read-only; only this file written).

Targets:
- `config/process3d/flows/*.yaml`, `config/process3d/geometry/*.yaml`;
- `app/static/data/process3d.json` (strict, contract 1.1, 346 refs);
- engine code that decides what is drawn: `physics.ts`, `ops.ts`, `solder.ts`, `joint.ts`, `state.ts`, `model.ts`, and the
  trim / cut paths of `prims.ts`;
- DB `data/*.csv`, cached `references/<paper_id>/text.md`, the three research files.

Checks run:
- `uv run python scripts/build_process3d.py --check`: 0 errors (2p5d 162 / 87 / 214 / 0 na; cowos_s 29 / 57 / 402 / 2;
  emib 28 / 92 / 589 / 0).
- `uv run python scripts/check_process_flows.py`: 0 errors.
- A strict build to the session scratchpad matches the committed JSON in every value. Only ref numbering and note word
  order differ (n9).
- Headless engine probe:
  - `data.ts`, `physics.ts`, `model.ts`, `joint.ts`, `ops.ts`, `state.ts` and `solder.ts` transpiled with the repo's
    TypeScript into scratch JS;
  - `Evaluator.evalAt(k, 1)` on all 6 routes;
  - per-step body extents, joins, melt per body, op durations, and vertical "core samples" through the root-frame stack
    at chosen (x, y).
- No retrieval; no web requests. No git writes.

## Verdict

- **Most A1 items are fixed, with evidence:**
  - C1 is fixed: melt per body against its liquidus, plus remelt;
  - 11 of 12 majors are fixed; M8 is fixed in the data, then undone by a new engine defect (N1);
  - 16 of 22 minors are fixed (m4 is moot after N1); 6 are partly fixed or open: m1, m10, m12, m19 (data fixed, engine
    ignores it: N3), m21 (open by design), m22.
- **Provenance is clean:**
  - every reported value equals its DB cell (248 checked, 54 of them numbers quoted in text cells);
  - every sampled value traces to its text or research row;
  - the M11 scope rule holds: composite "reported" comes only from family papers (cowos_s: 2013 x22, 00135 x9; emib:
    2016 x15, 00061 x6, 2026.00051 x5, 00051 x4).
- **One critical regression and two majors in what is drawn:**
  - the reveal CMP removes the TSV column instead of the tips (N1);
  - the 40 nm logic wafer is never thinned (N2);
  - Die B's 90 deg rotation is ignored by the engine, so Die A and Die B overlap in the 00027 flow (N3).
- **The rest of the arithmetic recomputes:** Faraday, grind, CMP, Washburn, joint volumes, the reveal chain, liquidus
  gating against the 00027 LTS / SAC results, and contact heights after the current-extent change.

Counts (new): critical 1, major 2, minor 14.

## A1 status

| A1 | item | status | evidence |
|---|---|---|---|
| C1 | reflow melts below liquidus | fixed | `ops.ts` thermal(): `melts = pk >= liq` per body. Probe at the end of s25: lts_sac 160 C melts bga_lts (138) and leaves paste_sac (220) solid; sac_lts 210 C melts paste_lts and leaves bga_sac solid. Hybrid modes 'ball' / 'paste' drawn (contract 16.5). |
| M1 | reveal grind stages | fixed | stages 775 - 110 - 30 = 635 at 5 um/s + 30 at 0.25 um/s = 247.0 s (engine timing 247.0); removal 665 = start 0 to 665 |
| M2 | Washburn at 25 C viscosity | fixed (caveat n11) | mu 1.4 Pa.s everywhere. s18: 3 x 1.4 x 0.042^2 / (0.025 x 60e-6 x 0.8660) = 5,703 s. UF1 4,371 s, UF2 2,173 s, EMIB CUF 2,410 / 668 s, EMIB-T bridge UF 50.7 s (engine identical) |
| M3 | one bridge; DIE 2 on nothing | fixed | sites fv_1 / fv_2 at x = +-9550; cb_2 / cb_3 at +-15925 (w 9350). Core sample (15925, -65): cb_cap_3 joint 19.058 um under die2 |
| M4 | mixed-pitch overlap | fixed | all fields collapse 0.9418 (probe). Fine cap (0.942 x 600)^(1/3) + 0.942 = 9.21; coarse H^3 + 7350 H = 147,000, so H = 19.06; FLI H 7.232 (probe). One standoff 29.058 above SR |
| M5 | floating lid, no TIM | fixed | core (65, -65): d1_si 2295.058-3020.058, tim_1 to 3105.058, lid_body from 3105.058; foot 754.058 on the 85 um sealant at 2351 |
| M6 | EMIB-T via misses pad | fixed | core (8537.5, -22.5): bt_pad top 2182.441 = vf5t_1 bottom 2182.441; bt_bpad d 70 = bump d; collapse 5.5585 |
| M7 | coarse vias through bridge band | fixed | cb_1 half width 7850 = 9550 - 1700; no via column in the cavity rect (core samples) |
| M8 | TSV not on M1; pads on unopened passivation | data fixed, **regressed by N1** | v1_cu 775.4-776.94 on the TSV top; po_c / po_d1 / po_d2 openings 27 um, pads stand on the Al. After step 18 the TSV Cu ends at 679 (N1), so M1 sits over a void. |
| M9 | D2 without pads | fixed | `ub_pad_d2` on site pad_d2; listed in the plate, seed-etch keep and resist openings |
| M10 | copied strip durations | fixed | engine timing: "resist strip (added)" = N/A, "resist ash level i (added)" = N/A |
| M11 | out-of-family "reported" | fixed | scan of every reported PDim: composite refs are family papers only. Wording issue in the family list: n8 |
| M12 | J-STD-020 Tc as process peak | fixed | 217.5 C = middle of the Kester EP256 Sn63Pb37 210-225 C window (source URL in the PDim); probe: uBumps (221) stay solid at the C4 reflows and remelt at the 255 C BGA (noted in the HUD) |
| m1 | C4 penetrates; UF2 gap | partly | contact at the 80.485 um cap tip (probe zmin 598.015 = 678.5 - 80.485); UF2 gap 60.348. Still no substrate pad / SR (n4) |
| m2 | BGA float, wet d, merge | fixed | s24: ball tip 3300.000 = paste top; wet 454.8 um; hybrid joints (probe collapses 133.41 / 52.50 / 100.00 for the three routes) |
| m3 | mold grind vs collapse | fixed | CoWoS emc top 1492.582 = die back; 00027 emc top = die back (core samples) |
| m4 | tsv_tip body | fixed (moot) | body removed; tips are the tsv_cu bottom (but see N1) |
| m5 | tip oxide < 200 nm | fixed | note: 0.4 x 0.43 - 0.075 = 0.097 um, below the F142 > 200 nm |
| m6 | ECP duration | fixed | 100 / 0.5 x 60 + 3 / (0.022052 x 6) x 60 = 12,000 + 1,360.5 = 13,360.5 s |
| m7 | CMP times | fixed | 3.4 / 1.0268 x 60 = 198.7 s; reveal 5 / 1.0268 x 60 = 292.2 s |
| m8 | fractional Bosch loops | fixed | ceil(100 / 0.79) = 127 x 13 = 1,651 s |
| m9 | derived without refs | fixed | 0 non-datum derived PDims without refs |
| m10 | op-level order provenance | open | engine reads `OpCall.src` (contract 16.4) but 0 of 236 JSON ops carry it (n7) |
| m11 | EMIB-T alloy rationale | fixed | liq_cav_c note covers the later 250 C top-die TCB |
| m12 | note errors | partly | flow notes fixed (TAL 3.87 s, AR 1.00); RESEARCH_PENDING.md X8 still calls 2 um "the thin end" of IPC-4552 3-6 um (n13) |
| m13 | reveal-grind analog text | fixed | note now "110 um back-grind ... of a 100 um superconducting Si interposer" |
| m14 | ABF cure stage 1 | fixed | HUD shows 130 C / 1,800 s and 180 C |
| m15 | bump counts | fixed | C4 floor(19416.5 / 200) x floor(17922.9 / 200) = 97 x 89 = 8,633; uBump 555 x 324 + 2 x 277 x 162 = 269,568 |
| m16 | 00027 pads under 2 dies only | fixed | al_1..al_10, ni_k, au_k |
| m17 | EMIB CUF region | fixed | cuf, cuf_2, cuf_3 per die |
| m18 | s08 coat T | fixed | shown as cure_temp_c |
| m19 | Die B rotation provenance | data fixed, **engine ignores it** | s02 note added; `joinXf` has no rotation, so Die B overlaps Die A (N3) |
| m20 | EMIB-T borrowed steps | fixed | via_plating / cuf notes "Route emib_t borrows this 2016 step" |
| m21 | X1 unverified | unchanged (low by design) | still a J-STD-028 table title from a search excerpt |
| m22 | dates / "now" | partly | PENDING.md fixed; RESEARCH_PENDING.md P22 "Henkel TDS (Aug 2024)" remains |

## New findings

### Critical

**N1. The TSV-reveal CMP polishes the wrong side of the face-down wafer: it removes the TSV column and keeps the tips.**
- Location:
  - engine `ops.ts` cmp: `trimAsm(s, c, 'top', plane, only)` with `z0` = the highest declared top of the listed bodies.
    The op has no face, and the root's orientation is not used.
  - data `geometry/cowos_s.yaml` `tsv_reveal.cmp`: bodies [bs_pass, tsv_cu, liner, barrier, seed], stop 679.
  - This became visible when V1 M11 moved the tips into `tsv_cu`.
- Evidence: probe, piece-frame extents after step 18 (tsv_reveal) and in every later step:

  | body | before the reveal | after the reveal |
  |---|---|---|
  | `tsv_cu` | [675, 775.4] | [675, 679] |
  | `liner` (front field film) | [775, 775.4] | [775, 775] |
  | `bs_pass` | intended 679..680 | [679, 679] |

  - Core sample at (0, 0), final state:
    - Si 2246.848-2356.848; `tsv_cu` only 2256.848-2260.848; `tsv_hole` void up to 2356.848;
    - nothing between the Si top 2356.848 and imd_1 at 2357.248.
  - `prims.ts` clips the via fill and its lining films by `trim_hi`, so this is what renders.
  - Effect, in steps 18-27 (10 of 28):
    - the TSV is an empty 96 um hole over a 4 um stub;
    - the C4 connects to nothing, and M1 lands on a void;
    - a 0.4 um void separates the Si and the BEOL;
    - there is no backside passivation.
- Fix:
  - Give `cmp` a face (or take it from `step.orient`): on a face-down root, set `trim_lo = plane`, with the plane
    rising from the lowest declared bottom of the listed bodies to `stop_z_um`.
  - Add a builder / probe check that no listed body loses more than the stated removal.

### Major

**N2. The 40 nm (chip D) logic wafer is never thinned.**
- Location: `flows/cowos_s.yaml` `logic_thin` (piece: die_c) and `geometry/cowos_s.yaml` (one grind on root die_c).
- Evidence (probe):
  - `die_c_si` goes from [0, 775] to [90, 775] at step 9;
  - `die_d_si` stays [0, 775] through cow_bond (step 11), so chip D is 775 um tall next to the 685 um chip C;
  - at mold_grind (step 16) the mold grind removes 90 um of chip D Si.
  - The step is named "Thin the logic wafers" (2013 F1-s09: "logic wafers thinned"), and the HUD shows 685 um.
- Fix: a second grind call with root die_d (or a step per wafer), as `logic_saw` already does with two dice calls.

**N3. 00027 Die B `rot_deg: 90` is ignored by the engine: Die A and Die B overlap, and the B bump fields miss their pads.**
- Location:
  - `model.ts` `Xf` / `joinXf` (no rotation term); `types.ts` Placement `rot_deg`;
  - the DevLog marks it "stubbed";
  - `build_process3d.py:973` rotates in its alignment check, so the builder passes what the engine does not draw.
- Evidence:
  - Die B unit is 10,000 x 8,000 um, placed unrotated at x = +-14,150, so it spans x 9,150-19,150.
  - Die A spans |x| <= 10,000 over y 75-20,075: an 850 um overlap for all 8 Die B.
  - Core sample (9600, 5075) after s02: `die_a_si` and `die_b_si` both at 801.161-1476.161.
  - The B bump grid (250 x 200 at 40 um) sits on pad_3..10 grids of 200 x 250: about 1 mm strips of bumps without pads
    on each side.
- Fix: implement 90 / 180 / 270 deg in `joinXf` and siteGrid (swap x / y), or declare Die B as 8 x 10 mm in the
  geometry and drop `rot_deg`.

### Minor

- **n1. The C4 UBM is stripped completely.**
  - Location: `geometry/cowos_s.yaml` `c4_bumping.seed_etch` strips `c4_seed` with no `keep_under`.
  - Evidence:
    - the probe shows `c4_seed` gone = 1;
    - the C4 base is at 678.5, but the tip and passivation plane is at 679;
    - core sample: the C4 joint ends at 2260.348, while the TSV / passivation starts at 2260.848, a 0.5 um gap with no
      UBM.
  - Fix: `keep_under: [c4_sol]`.
- **n2. Fine / FLI bumps sit in the 100 um D2D gap, with no die above.**
  - Location: sites `fv_k` (2 mm, 55 um) and `fvt_k` (3 mm, 45 um).
  - Evidence:
    - EMIB grid columns at x = 9,522.5 / 9,577.5 and EMIB-T at 9,527.5 / 9,572.5 fall between DIE 1 (<= 9,500) and
      DIE 3 (>= 9,600);
    - core sample (9522.5, -27.5): `fb_cap_1` is drawn as a joint ending at 2295.058 with nothing above it.
  - Fix: split each site into two rects that skip the gap.
- **n3. The 00027 bottom-CUF body and its Washburn gap use the as-plated 60 um.**
  - Evidence:
    - after s15 the joint is H 23.468 (collapse 1.532), so the gap is 58.468;
    - `cuf_bot` reaches 2160.000 against the backside dielectric bottom at 2158.468, 1.53 um inside it;
    - fill 5,703 s vs 5,852 s at the real gap.
  - CoWoS UF2 already uses the joint height. Fix the same way (`bpad_h + bbump_cu + joint H`).
- **n4. Joints land on bare slabs (A1 m1 remainder):**
  - no substrate C4 pads or SR (CoWoS);
  - no substrate pads under the 00027 backside bumps;
  - no EMIB-T cavity pads (`cpad_k` sites have no body; the 2.05 um finish is HUD-only);
  - no BGA lands.
- **n5. Damascene time vs geometry.**
  - Trench etch 181.2 s:
    - it is (0.54 + 1.0) / 0.51 um/min, a via + line etch (P33);
    - the drawn trench is 1.0 um, and levels 2-3 have no inter-level vias, so M1-M3 are not connected (only the
      level-1 TSV landing spans the level).
  - ECP 136.05 s:
    - it covers only the 1 um overburden (P37);
    - the op plates 1 um fill + 1 um overburden = 2 um, i.e. 271 s at 20 mA/cm2 (Faraday 0.0221 um/min per mA/cm2).
- **n6. 00027 s09 plates the SnAg cap at the Cu current density.**
  - One j for [bpad, bbump_cu, bbump_snag], 50 mA/cm2, although the HUD note says SnAg 1 A/dm2 (F65).
  - Cap time:

    | j | arithmetic | time |
    |---|---|---|
    | 50 mA/cm2 (drawn) | 25 / (0.05064 x 50) x 60 | 592 s |
    | 10 mA/cm2 (F65) | 25 / (0.05064 x 10) x 60 | 2,962 s |

  - Fix: a per-body array [50, 50, 10].
- **n7. A1 m10 is still open on the data side.** `OpCall.src` is emitted on 0 of 236 ops, so the HUD cannot show the
  expansion order source (00060-F1, eptc59621-F1, 00155-F1, 00298-F1).
- **n8. Stale text.**
  - `geometry/cowos_s.yaml` (C4 block comment) still says the engine "places the declared extent ... the drawn unit
    floats" and quotes "collapse 75 - 60.35 = 14.65 um (engine probe 14.652)". The current collapse is
    80.485 - 60.348 = 20.137 (probe).
  - `geometry/2p5d_120mm.yaml` has the same placement comment.
  - COMPOSITION section 2 builder counts are stale:

    | flow | section 2 | current build |
    |---|---|---|
    | cowos_s | 33 / 57 / 390 | 29 / 57 / 402 |
    | emib (template) | 588 | 589 |
    | 2p5d (template) | 207 | 214 |

  - COMPOSITION 1.1 calls ectc51909.2023.00135 a "TSMC CoWoS paper". It is a MediaTek CoWoS MCM paper. The family also
    lists 00055 (TSMC SoIC Cool-Stacking), which is not CoWoS-S.
- **n9. The builder is non-deterministic across `PYTHONHASHSEED`.**
  - Builds with seeds 1 and 2 differ in ref numbering (R132 / R133, R145 / R146 swap) and in the order of
    "computed from template inputs" notes. Values are identical.
  - Fix: sort the sets before numbering.
- **n10. Paste volume is counted as 100 % metal.**
  - The 400 x 100 um paste (12.57e6 um3) enters the hybrid joint in full. lts_lts joint: H(275,133 + H^2) = 149.0e6, so
    H = 364.9 um (probe 364.92).
  - At an assumed ~50 vol% metal (typical for solder paste; not sourced in the repo), H is about 346 um.
  - X6 already notes the 84 % transfer is not applied. Add a sourced metal-volume factor, or state it in the note.
- **n11. Washburn times are upper bounds.**
  - A114 gives mu_eff <= ~1.4 Pa.s from a whole-wafer "within 60 min" figure, so every derived fill time (UF1 4,371 s,
    s18 5,703 s, UF2 2,173 s, EMIB 2,410 s) is an upper bound.
  - The HUD process time should say "upper bound".
- **n12. The 2013 joint is not drawn as stated.**
  - 2013 states a "full IMC uBump joint" and a "uBump to Al pad" interface (p.2-3; DB 2013-a-i1 metallurgy "Cu uBump to
    Al pad; full IMC joint").
  - The composite draws a SnAg cap that stays solder, on a plated Cu pad (00155 analog).
  - It is not shown as reported, but a HUD note should say so.
- **n13. Research-file leftovers:**
  - RESEARCH_PENDING.md P22 "Henkel TDS (Aug 2024)" (not ISO);
  - X8 "2 um is the thin end" of 3-6 um (2 um is below the range).
- **n14. Citation choice.**
  - The CoWoS uBump pad sites cite 40 um pitch from `ectc51909.2023.00135-a-i1`. The backbone row
    `ectc.2013.6575597-a-i1.pitch_um` = 40 exists (2013 p.1: "uBumps are formed on top of the interposer with 40um
    pitch").
  - Cite the backbone row.

## Physics recompute (own arithmetic; engine values from the probe)

| check | arithmetic | result |
|---|---|---|
| Cu Faraday | 63.546 / (2 x 96485.33 x 8.935) x 1e-3 x 1e4 x 60 = 0.022113 um/min per mA/cm2 (data 0.02205 with rho 8.96) | pass |
| SnPb C4 plate | M_eff 141.0, rho 8.4: 0.05219 x 20 = 1.0438 um/min; 75 / 1.0438 x 60 = 4,311 s (JSON 4,311.2) | pass |
| EMIB SAP | 15 / (0.02205 x 11 x 0.81) x 60 = 4,581 s | pass |
| 00027 s09 | Cu 35 / (0.022113 x 50) x 60 = 1,899.5 + SnAg 25 / (0.05064 x 50) x 60 = 592.4; total 2,491.9 (engine 2,491.7) | pass (n6) |
| Damascene ECP | 2 um drawn / (0.0221 x 20) x 60 = 271 s vs 136 s shown | fail, minor (n5) |
| Grind: reveal | 635 / 5 + 30 / 0.25 = 247 s; stop 665 = 10 um below the 675 via bottom | pass |
| Grind: logic_thin | 60 / 5 + 30 / 0.25 = 132 s, removal 90 | pass for chip C; chip D not ground (N2) |
| Grind: 00027 s07 | 645 / 5 + 30 / 0.25 = 249 s, removal 675 | pass |
| CMP | TSV 3.4 / 1.0268 x 60 = 198.7 s; damascene 1 / 1.0268 x 60 = 58.4 s; reveal 5 / 1.0268 x 60 = 292.2 s | times pass; reveal removes the wrong side (N1) |
| Washburn (mu 1.4, gamma 0.025, theta 30) | s03 3,084 s (shown 3,600 analog); s18 5,703; UF1 4,371; UF2 2,173; EMIB 2,410 / 668; EMIB-T 50.7 | pass (n3, n11) |
| C4 cap / joint | h^3 + 7500 h = 1.125e6, so h = 80.49 (probe 80.485); H^3 + 15000 H = 1.125e6, so H = 60.35 (probe 60.348); collapse 20.14 | pass |
| uBump CoWoS / 00027 | 5.412 / 1.588; 8.11 / 0.889 (probe) | pass |
| EMIB common standoff | coarse 19.058 / fine 8.267 / FLI 7.232, collapse 0.9418 each; standoff 29.058 | pass |
| EMIB-T joint | H^3 + 7350 H = 294,000, so H = 34.44 (probe 34.441); via depth 150 - 15 - 90 + 5.559 = 50.559; bottom 2182.441 = pad top | pass |
| 00027 backside joint (s15) | (pi H / 6)(3 x 1406.25 x 2 + H^2) = 110,447, so H = 23.47 (probe 23.468) | pass (n3) |
| 00027 BGA cap | h^3 + 3 x 227.40^2 h = 500^3, so h = 398.3 (probe 398.333) | pass |
| Board joints | lts_lts: V 78.02e6 between a 227.4 / b 200, H = 364.9, c = 398.33 + 100 - 364.92 = 133.41. lts_sac: ball on solid paste top r 170, H 345.84, c 52.50. sac_lts: paste fillet, solid ball to pad, c = 100 | pass (n10) |
| Reveal chain | grind stop 665; recess 665..680 (15 um at 9 um/min = 100 s); Si final 95; protrusion 675..680 = 5; liner loss 15 / 200 = 0.075 < 0.172; passivation 679..680; CMP stop 679; UBM 678.5..679 | numbers pass; engine N1, UBM n1 |
| Bosch / TCB profile | 127 x 13 = 1,651 s; X3 ramps 110 / 1.1 = 100 C/s, 110 / 2.2 = 50 C/s, 221 C at 0.81 and 4.68 s (TAL 3.87) | pass |

Melt vs liquidus per thermal op (probe, max melt over the op):

| route | op (peak) | melts | stays solid | paper / note |
|---|---|---|---|---|
| 00027 all | s02 TCB (joint 250) | cap_a, cap_b (221) | - | analog 00155 |
| 00027 all | s15 reflow (233.2) | bbump_snag, cap_a, cap_b | - | remelt of uBumps noted in HUD |
| lts_lts / lts_sac | s22 ball attach (160) | bga_lts (138) | SnAg 221 x 3 | 160 C = paper's LTS top (shown as analog) |
| sac_lts | s22 ball attach (255) | bga_sac (220), bbump_snag, cap_a, cap_b | - | remelt noted in HUD |
| lts_lts | s25 (160) | ball + paste (138) | SnAg | paper: passed |
| lts_sac | s25 (160) | bga_lts | paste_sac (220), SnAg | paper p.5 "LTS on backside ... 160 C"; Table V passed |
| sac_lts | s25 (~210) | paste_lts | bga_sac (220), SnAg | paper p.5 "around 210 C"; edge failures in Table V not modelled |
| cowos | C4 bump / assembly reflow (217.5) | c4_sol (183) | cap_c, cap_d (221) | Kester window |
| cowos | BGA (255) | bga_ball, c4_sol, cap_c, cap_d | - | remelt noted |
| emib / emib_t | TCB (250); EMIB-T bridge TCB (250) | listed caps; bt_sol | bt_sol during top-die TCB (TCB heats listed solder only; open, m11 note) | X3 / X4 low |
| emib / emib_t | BGA (175) | bga_ball (138) | all SnAg | P15 |

Placement after the current-extent change (probe joins, contact plane = target top):
- no floating at any join:
  - CoWoS dies at 787.17 (pad top), CoWoS unit at 2200 (C4 cap tip);
  - 00027 dies at 778.05; interposer at 2100 (zmin 612 = plated cap tip); package at 3300 (ball cap tip 101.667);
  - EMIB bridge at 2143 (adhesive top); bridge_t at 2098; dies at 2296; lid at 2351 (seal top).
- Interpenetration only where reported above: Die A / Die B (N3) and `cuf_bot` vs the backside dielectric (n3).
- Gaps only where reported above: the C4 / tip 0.5 um gap (n1) and the reveal voids (N1).

## Composition

- Step order matches the DB backbones:
  - cowos_s = 2013-F1 s01-s11, then F2 s01, s02, debond (inserted), s03, s04;
  - emib = 2016-F2 s01-s09;
  - emib_t = 00051-F1 in seq order (s01, s02, s03, s04, s05, s08, s06, s07), with via_plating / cuf borrowed and
    marked;
  - inserted steps carry a `src` note.
- EMIB build-up runs level by level:
  - laminate, cure, vias x3, desmear, seed, DFR, expose, plate, strip, seed etch, times 4;
  - then level 5 in final_lam / encap_t;
  - the cavities cut levels 2-4 (EMIB) and 1-4 (EMIB-T) as open pockets (core samples).
- CoWoS logic-wafer remodel:
  - bump, thin and saw act at wafer level for chip C;
  - chip D is bumped and sawn but not thinned (N2).
- Reported values the papers state:
  - every reported value sampled is stated in the text;
  - "thinned to (2013) 100" is shown as reported, and the drawn 95 um Si is template with the reason given;
  - the 2013 joint metallurgy is not drawn (n12).

## Rules

- **No emoji:** pass (JSON, configs, scripts, engine).
- **No local absolute paths:** pass. One `~/` in RESEARCH_TOOLS_FAB F31 is a URL path (shu.ac.uk/~/media).
- **ISO dates:** pass in data; P22 prose remains (n13).
- **Every number has a status:** pass. Bare numbers only in `completeness`, `block`, `steps[].n`, `rot_deg`.
- **`na` only in the HUD:** pass (2: TSV pattern dose, Al etch time).

## Sample (seed 20261024; stratified per flow; dedup by ref / value / note)

Reported (DB cell checked for every reported value: 248 / 248 equal; the text check below):

| # | flow / path | value | ref | text | result |
|---|---|---|---|---|---|
| R1 | 00027 pieces/pcb w_mm | 160 mm | -a-c5.x_mm | p.3 "A 160 mm x 160 mm PCB" | pass |
| R2 | 00027 ni_1 h | 2 um | -a-L05 | Table I "Ni thickness 2" | pass |
| R3 | 00027 s10 equipment | laser debonding system (AIMECHATEC) | F1-s10 | p.2 "laser debonding system (AIMECHATEC Ltd.)" | pass |
| R4 | 00027 bbump_cu d | 75 um | -a-i2 | Table I "Bump diameter 75" | pass |
| R5 | 00027 pil_a h | 13 um | -a-i1 | Table II "Cu pillar height 13" | pass |
| R6 | 00027 s06 equipment | wafer bonder (AIMECHATEC) | F1-s06 | p.2 "wafer bonding equipment (AIMECHATEC, Ltd.)" | pass |
| R7 | 00027 s22_lts ball alloy | Sn-58Bi ball / Sn-58Bi paste | -a-i3.metallurgy | p.3 "Sn-58Bi as LTS" | pass |
| R8 | cowos tsv_hole depth | 100 um | 2013-a-i2 | "10um in diameter and 100um deep" | pass |
| R9 | cowos singulate unit depth | 24 mm | 2013-a-c3.y | "26mm x 24mm interposer" | pass |
| R10 | cowos ring material | copper | 00135-a-c5 | 00135 p.1 "a copper stiffener ring" | pass (family) |
| R11 | cowos uBump count | 270,000 | 2013-a-i1 | "270,000 micro-bump" | pass |
| R12 | cowos uf1 length | 24 mm | 2013-a-c1.x | chip C 24 x 14 mm | pass (used as flow length, template use) |
| R13 | cowos C4 pitch | 200 um | 2013-a-i3 | "SnPb eutectic plating solder with 200um pitch" | pass |
| R14 | cowos unit width | 26 mm | 2013-a-c3.x | same | pass |
| R15 | emib lid TIM | polymer TIM | 00061-F3-s04 | p.5 "Polymer TIM was chosen" | pass |
| R16 | emib fvt pitch | 45 um | 00051-a-i1 | "45um bump pitch EMIB" | pass |
| R17 | emib cb pitch | 130 um | 2016-a-i2 | figure label (DB source figure_image) | pass (figure-read) |
| R18 | emib fv pitch | 55 um | 2016-a-i1 | figure label "55um bump pitch" | pass (figure-read) |
| R19 | emib bridge_t w | 3 mm | 2026.00051-b-c1 | "bridge of 3 mm x 18 mm" | pass |
| R20 | emib substrate d | 65 mm | 00061-a | "65 x 65 mm" | pass |

Derived (recomputed):

| # | path | formula = value | result |
|---|---|---|---|
| D1 | 00027 interposer unit w | 42 x 1000 = 42,000 | pass |
| D2 | 00027 nib_a z | 675 + 13 = 688 | pass |
| D3 | 00027 substrate unit w | 120 x 1000 | pass |
| D4 | 00027 bump_a rect x | datum 0 | pass |
| D5 | 00027 interposer unit d | 46 x 1000 | pass |
| D6 | cowos interposer unit w | 26 x 1000 (refs 2013-a-c3) | pass |
| D7 | cowos substrate unit d | 40 x 1000 | pass |
| D8 | cowos die_d unit w | 12 x 1000 | pass |
| D9 | cowos die_c unit w | 24 x 1000 | pass |
| D10 | cowos tsv rect x | datum 0 | pass |
| D11 | emib bridge_t unit d | 18 x 1000 | pass |
| D12 | emib fv_1 rect y | datum 0 | pass |
| D13 | emib bridge unit d | 2 x 1000 | pass |
| D14 | emib substrate unit d | 65 x 1000 | pass |
| D15 | emib bridge unit w | 2 x 1000 | pass |

Template and analog (row or cell checked):

| # | path | value | basis | result |
|---|---|---|---|---|
| T1 | 00027 bga_lts wet_d | 454.8 um | 500 x 2 ((600^3 - 478^3) / 1434)^0.5 / 600; 00155-a-i4 notes "Measured ball height 478 um" | pass |
| T2 | 00027 ip_si h | 775 um | 00322-F4-s06 "775 um to 100 um" | pass |
| T3 | 00027 pad_3 x | 14,150 | 10,000 + 150 + 4,000 | pass (drawn unrotated, N3) |
| T4 | 00027 s22_sac peak | 255 C | tcpmt.2025.3614186-F1-s20 = 255; A148 | pass |
| T5 | 00027 s04 force | 300,000 N | 00322-F1-s04 = 300000 | pass |
| T6 | 00027 paste h | 100 um | tcpmt F1-s21 "4-mil (~100 um) thick stencil" | pass (n10) |
| T7 | 00027 glass h | 700 um | 00227-F1-s21 = 700 | pass |
| T8 | cowos ub_seed h | 0.15 um | 00155-F1-s01 = 0.15 | pass |
| T9 | cowos cap_c liquidus | 221 C | A60 quote "Sn-3.5Ag 221" (a surface-tension row; 221 is its T column) | pass |
| T10 | cowos pad_d1 x | 6,075 | 6,000 + 75 | pass |
| T11 | cowos tsv overburden | 3 um | 00009-F2-s07 "< 3 um" (upper bound, said so) | pass |
| T12 | cowos barrier | 0.1 um | 00071-a-L03 Ta 0.1 | pass |
| T13 | cowos logic_thin fine | 30 um | F125 "20 to 40 um" | pass |
| T14 | cowos barrier z | 775.4 | 775 + 0.4 | pass |
| T15 | emib seed | 0.15 um | 00360-F1-s03 = 0.15 (Georgia Tech glass panel, note says so) | pass |
| T16 | emib sbt_base z | 600 | 00155-a-i4 600 | pass |
| T17 | emib seal h | 85 um | 00187-c-c6 "BLT 85 um in FEA case" (note says FEA) | pass |
| T18 | emib bridge x | 9,550 | 19.1 x 500 (package3d bridge_px) | pass |
| T19 | emib bt_beol h | 20 um | 10 x (1 + 1) | pass |
| T20 | emib br_beol h | 12 um | 4 x (2 + 1) | pass |

Proposals (all "proposal:" values):

| item | value | check | result |
|---|---|---|---|
| X6 paste land | 400 um | 0.8 x 500; AR 400 / 400 = 1.00 at 100 um | pass |
| X2 C4 column | 75 um | cap 80.49 / dia 111.6 (note 80.5 / 111.5) | pass |
| X5 cavity alloy | 221 C | A60; open TCB question stated | pass |
| X3 tcb_T | 140-250-250-140 C at 0 / 1.1 / 4.1 / 6.3 s | 100 C/s, 50 C/s; 221 C at 0.81 / 4.68 s | pass |
| X3 tcb_F | 39.2 N to 0.81 s | 4 kgf x 9.80665 = 39.23 N (A13) | pass |
| X4 btcb_T | as X3 | same shape | pass, low |
| X4 force / time | 10 N / 6 s | A15 / A13 | pass, low |
| X7 bridge force | 1 N | 5-15 psi x 4 mm2 = 0.14-0.41 N (P24); VCM floor 1 N (A2) | pass |
| X8 cavity finish | 2.05 um | ENi 2 + Au 0.05 (HUD only) | pass (n13 wording in research file) |
| X9 bump equipment (2) | text | wording only | pass |
| X1 C4 d (low, not tagged) | 100 um | J-STD-028 title via search excerpt | pass, low |
