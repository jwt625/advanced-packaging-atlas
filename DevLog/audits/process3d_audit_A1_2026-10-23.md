# process3d audit A1 (DevLog-016): provenance, composition, physics, geometry

Date: 2026-10-23. Auditor: fresh-context A1 (read-only; only this file written).
Targets: `config/process3d/flows/*.yaml`, `config/process3d/geometry/*.yaml`, `app/static/data/process3d.json`
(strict build, contract 1.1, 342 refs), `RESEARCH_TOOLS_FAB.md`, `RESEARCH_TOOLS_ASSEMBLY.md`, `RESEARCH_PENDING.md`,
`COMPOSITION.md`, `PENDING.md`, the DB (`data/*.csv`) and cached `references/<paper_id>/text.md`.
Engine code was read only where needed to tell what a value does when drawn (`app/src/lib/process/ops.ts`, `state.ts`,
`physics.ts`, `solder.ts`).

Checks run: `uv run python scripts/build_process3d.py --check` (0 errors; 2p5d 120/87/167/0 na, cowos_s 71/63/327/2,
emib 81/75/317/0) and `uv run python scripts/check_process_flows.py` (0 errors). One web search was run, for J-STD-028
(P1/X1). No retrieval scripts were run.

## Summary verdict

- **Provenance bookkeeping is clean.** All 322 reported PDims in the JSON equal their DB cell; the number-in-text cells
  contain the quoted number. All 25 sampled reported values trace to the cited paper text. Every analog row I checked
  exists and says what its note claims. No PDim lacks a status. `na` appears only in the HUD (2 values). No emoji and
  no local paths.
- **Arithmetic is right where it is checked:** Faraday rates, Bosch loops, C4 cap volume, recess / liner-loss chain and
  Washburn formula all recompute.
- **The physics and geometry still have defects a packaging engineer would see immediately:**
  - reflow melting of alloys below their liquidus (the 00027 paper's key LTS / SAC result);
  - a wrong grind-stage removal in the CoWoS-S TSV reveal;
  - underfill times of 7.7-25 h;
  - an EMIB die with no interconnect under it, and only one of the two bridges;
  - mixed-pitch joint overlap;
  - a floating EMIB lid with no TIM;
  - an EMIB-T direct via that misses its pad after collapse;
  - CoWoS TSVs not connected to M1, and pads sitting on unopened passivation.
- **One provenance-policy inconsistency:** "reported" is used for values from papers outside the CoWoS / EMIB families
  inside the composites.

Counts: critical 1, major 12, minor 22.

## Findings

### Critical

**C1. 00027 board reflow melts solders that never reach their liquidus.**
- Location:
  - flow `ectc51687.2025.00027-F1`, steps `s25_lts_sac` and `s25_sac_lts`, op `reflow`;
  - engine `ops.ts` reflow: when no profile is given, melt = 1 for every listed solder over u 0.3-0.8, ignoring
    `liquidus_c` / `peak_c`.
- Evidence:
  - `s25_lts_sac`: solder [bga_lts, paste_sac], liquidus_c 138, peak 160 C (R112). SAC305 paste liquidus 220 C (paper
    p.5: "The melting point of Sn-3Ag-0.5Cu is 220°C"). At 160 C the SAC paste does not melt, but it is drawn molten and
    reflowed.
  - `s25_sac_lts`: solder [bga_sac, paste_lts], op liquidus_c 220 > peak_c 210 ("around 210 °C", p.5). By the op's own
    data nothing should melt, yet both bodies are drawn molten and the SAC ball collapses.
  - This is the paper's main subject (LTS lowers the top reflow temperature).
- Fix:
  - Give each solder body its own liquidus, or list in `reflow.solder` only the bodies that melt.
  - In the no-profile branch, gate melt on `peak_c >= liquidus` per body, or synthesize a T profile from `peak_c`.
  - Draw the hybrid joint (molten LTS wets a solid SAC ball / paste) rather than two independently melted bodies.

### Major

**M1. CoWoS-S TSV-reveal grind stages use the remaining thickness instead of the removed thickness.**
- Location: `geometry/cowos_s.yaml:387-393` (`tsv_reveal.grind`).
- Evidence:
  - `to_z_um` = 775 - 110 = 665, so 665 um is removed.
  - Stages: rough = reveal_grind_um - rough_stop_um = 110 - 30 = 80, fine = 30, sum 110.
  - HUD / op duration = 80/5 + 30/0.25 = 136 s.
  - The engine (`grindPlan`) rescales the stages to 483.6 / 181.4 um, so the drawn fine #2000 stage removes 181 um
    (725 s of weight) while the HUD says 136 s.
  - Correct values (F125 rough stop 30 um, F126 5 um/s, F124 0.25 um/s): rough 635 um / 5 = 127 s, fine 30 um / 0.25 =
    120 s, total 247 s.
  - `logic_thin` uses the right form (die_h0 - soc_h - rough_stop = 60; 60 + 30 = 90 = removal).
- Fix: rough `removal_um: "ip_h0_um - reveal_grind_um - rough_stop_um"`.

**M2. Washburn fill times are implausible wherever the 25 C TDS viscosity is used at the 70-100 C stage.**
- Location:
  - 00027 `s18` (mu 22.12, gap 60, L 42 mm);
  - CoWoS `uf2_dispense` (mu 22.12, gap 75, L 26 mm);
  - EMIB `cuf` (mu 22.12, gap 30, L 19 mm).
- Evidence: t = 3 mu L^2 / (gamma h cos theta), with gamma 0.025 and theta 30 deg:

  | step | arithmetic | t |
  |---|---|---|
  | s18 | 3 x 22.12 x 0.042^2 / (0.025 x 60e-6 x 0.8660) | 90,113 s = 25.0 h |
  | uf2 | 3 x 22.12 x 0.026^2 / (0.025 x 75e-6 x 0.8660) | 27,626 s = 7.7 h |
  | EMIB cuf | 3 x 22.12 x 0.019^2 / (0.025 x 30e-6 x 0.8660) | 36,883 s = 10.2 h |

  - These ops have no `duration_s`, so the engine uses the Washburn time as the real elapsed process time.
  - The notes call it an "upper bound", but the HUD shows it as process time.
  - For contrast, 00027 `s03` (mu 1.4, gap 26.05, L 20 mm) gives 2,979 s against its 3,600 s analog: consistent.
- Fix: use an effective viscosity at the dispense temperature (A114-style calibration), or set the duration to `na`
  and drive the front playback-linear. Do not show 7-25 h as real time.

**M3. EMIB draws one bridge, not two, and DIE 2 has no interconnect under it.**
- Location:
  - `geometry/emib.yaml` sites `fv` (x 9550 only) and `cbump` (x -1100, w 16800, so x -9500..7300);
  - `tcb` call for `die2` (solder [fb_cap, ft_cap]).
- Evidence:
  - package3d emib `bridge_n` = 2 ("two bridges, one under each die-die edge", Fig. 4(a)); the flow has one bridge
    (DIE 1 / DIE 3 gap).
  - DIE 2 is centred at x = -15100, spanning -20600..-9600. No fine, coarse or any other bump site lies under it, so it
    is TCB-bonded onto nothing.
  - DIE 3 (9600..20600) has fine bumps only over 9600..10550 (950 um of 11 mm) and no coarse field.
- Fix:
  - Add the second bridge (cavity, adhesive, bridge, fv / fvt site at -bx).
  - Add coarse-bump fields under DIE 2 / DIE 3, and add `cb_cap` to the die2 solder list.

**M4. EMIB mixed-pitch joints overlap after collapse.**
- Location: `state.ts` finalize (collapse = max over the join's solders); EMIB `tcb`.
- Evidence (zero-load joint H between equal pads, V = pi r^2 h):

  | cap | H | collapse |
  |---|---|---|
  | fine (d 20, h 20) | 14.70 um | 5.30 um |
  | coarse (d 70, h 20) | 19.06 um | 0.94 um |
  | EMIB-T FLI (d 16.36, h 20) | 13.65 um | 6.35 um |

  - DIE 1 sinks 5.30 um, so the coarse joints are drawn 4.36 um into the die face.
  - On the EMIB-T route the overlap is 6.35 - 0.94 = 5.41 um.
- Fix: honour `bond_tcb.standoff_um` (position-controlled TCB; contract section 14 defers this) or compute one common
  standoff for the die. The data could also give fine and coarse caps equal volume-to-pad ratios ("bump height
  control").

**M5. The EMIB lid floats, with no TIM body.**
- Location: `geometry/emib.yaml` `lid` place (z = bump_top_um + d1_h_um + tim_h_um) and `lid_body`.
- Evidence:
  - z = 2296 + 725 + 85 = 3106 um.
  - The DIE 1 top after collapse = 2296 - 5.30 + 725 = 3015.7 um, leaving a 90.3 um empty gap; no TIM body exists.
  - The lid is a flat 65 x 65 x 2 mm plate with no foot or sealant, 840 um above the solder resist.
  - A real IHS has a cavity and a foot bonded with sealant to the substrate.
- Fix: add a TIM fill body (85 um) over the die backs, give the lid a foot ring (or a cavity slab plus a ring), and
  place it on the collapsed die top.

**M6. The EMIB-T direct via misses the bridge pad after the cavity-joint collapse; the bridge solder overhangs its pad.**
- Location: `geometry/emib.yaml` `t_via_depth_um`, `mv5t`, `bt_sol`, `bt_bpad`.
- Evidence:
  - mv5t bottom = 2233 - 45 = 2188 = the as-placed bridge pad top (2098 + 90).
  - bt_sol (d 70, h 40, plated, a = b = 35): V = 153,938 um3, H = 34.47 um, so the bridge drops 5.53 um. That leaves a
    5.5 um dielectric gap between the via bottom and the pad.
  - bt_sol (70 um) sits on a bt_bpad of 28.5 um (TSV land), so the solder is wider than its pad.
- Fix: derive the via depth from the collapsed joint height (or hold standoff = as-plated). Draw a backside UBM / pad of
  at least the bump diameter.

**M7. The coarse via grid runs through the bridge region.**
- Location: site `mv` (whole substrate, 130 um pitch) used by `mv5c` / `vf5c` (decision 19 acknowledges this).
- Evidence:
  - 40 um coarse vias at 130 um pitch overlap the 16 um fine vias at 55 um pitch (EMIB) and the 10.7 um direct vias at
    45 um (EMIB-T).
  - They land on bridge pads and BEOL (EMIB) or end in the cavity encapsulant (EMIB-T).
  - This is overlapping Cu bodies in the hero cross-section.
- Fix: split `mv` into rects that exclude the cavity footprint (several sites), or add an `exclude` rect to the site
  contract.

**M8. CoWoS-S electrical topology is broken.**
- Location: `geometry/cowos_s.yaml` bodies `tsv_cu`, `imd_{i}` / `dcu_{i}`, `pass`, `ub_pad_*`.
- Evidence:
  - TSV to M1:
    - The TSV Cu top is at 775.4 (CMP stop).
    - `imd_1` spans 775.4..776.94 with trenches only in its top 1.0 um (depth cu_h_um), so 0.54 um of oxide separates
      the TSV top from the M1 lines.
    - There is no Cu1 landing pad (package3d `tsv_land_um` 15 exists).
    - 2013 p.2 says the opposite: "For a TSV in CoWoS, one terminal connects to the first layer of Cu interconnect";
      "TSV overburden CMP to first layer of front-side Cu interconnect".
  - Pads on passivation:
    - The front passivation film `pass` has no openings.
    - The uBump pads (`ub_seed`, `ub_pad_*`) sit on top of the passivation, with no contact to the Al.
- Fix: add a level-1 via / landing-pad post at the `tsv` site, and add passivation openings at the pad sites, with the
  pads stacked in them.

**M9. CoWoS-S chip D2 has no interposer pads, and it is inside the default block window.**
- Location: bodies `ub_pad_c`, `ub_pad_d1` only (no `ub_pad_d2`); interposer block x -500..500, y -4100..-2900.
- Evidence:
  - pad_d2 spans x -12075..-75 and y -10575..-3575, so the strip x -500..-75 is in the window.
  - D2's bumps hover 5.15 um above the passivation (placed at `ub_top_um`). The joint is solved against a 27 um pad
    that is not drawn.
- Fix: add `ub_pad_d2` (and add it to the plate, strip `keep_under` and resist openings), or move the block window.

**M10. Durations copied onto added strip ops: numbers with no basis.**
- Location: JSON cowos `tsv_etch` op 4 and `fs_interconnect` "resist removal level i".
- Evidence:
  - "resist strip (not listed in the module)" has duration_s = 1645.57 s, which is the Bosch etch time
    (100 / 0.79 x 13).
  - "resist removal level i" has 181.18 s, which is the trench etch time ((0.54 + 1) / 0.51 x 60).
  - The builder fills `duration_s` from the content op's `hud.time_s` for every call of that content op.
- Fix: apply `hud.time_s` only to the op that owns it; added strips get no duration (N/A).

**M11. "Reported" status is inconsistent for values from papers outside the composite's family.**
- Location: cowos_s and emib, expansion ops and inserted steps.
- Evidence:
  - CoWoS-S: 51 of 87 reported PDims come from out-of-family papers (00155: 34; 00027: 11; 00322: 6).
  - EMIB: 65 of 90 come from 00103 (31), 00298 (24), 00359 (7), 00360 (2) and 00021 (1). These include glass-core and
    academic SAP rows (e.g. ABF lamination 100 C / 0.7 MPa, seed etch 25 s).
  - The same 00155 TCB row is an analog (template) in `cow_bond`, because that is a backbone step.
  - DevLog-016 (2026-10-23) states "A ref must come from the step's own paper; anything else is an analog".
    COMPOSITION 1.1(b) widens this to op rows. A viewer sees solid "reported" in a "CoWoS-S" / "EMIB" flow for numbers
    no CoWoS / EMIB paper states.
- Fix: decide one rule. Either downgrade out-of-family expansion and inserted values to analog (template), or add a
  distinct HUD style "reported (other build: <paper>)".

**M12. J-STD-020 classification Tc is used as the SnPb process reflow peak, and the solder hierarchy is not addressed.**
- Location: cowos `c4_bumping.reflow` `temp_c_max` 235 C; `on_substrate.reflow` 220 C (RESEARCH_PENDING P10, P11).
- Evidence:
  - P11's own source (TB493) says: "Reflow profiles in this document are for classification/preconditioning and are
    not meant to specify board assembly profiles".
  - 235 C is also above the 221 C liquidus of the already-joined SnAg uBumps, so the uBumps remelt under UF1 / mold
    during the C4 bump reflow. This is neither drawn nor noted.
- Fix: label these values as classification limits, not process peaks (or find a SnPb bump-reflow source), and note
  the uBump remelt (or pick a peak at or below 220 C with a source).

### Minor

**m1. CoWoS C4 penetrates the substrate at mount; the UF2 gap uses the plated height.**
- After the bump reflow the C4 is an 80.49 um cap. Placement uses the declared 75 um column (`pieceZ` zmin), so at
  mount the C4 sits 5.49 um inside the substrate until the reflow collapse.
- Joint H (V 589,049 um3, a = b = 50) = 60.35 um, but `uf2` gap_um = 75 (fill time 24 % short of the real gap).
- No substrate pad or solder resist is drawn.

**m2. 00027 BGA / board joint shape and placement.**
- After `ball_attach` the 500 um ball is a 378.1 um cap (wetted d = ball d). At `s24` the package therefore floats
  121.9 um above the paste.
- The final joint is a ball (H 277) plus separate paste (H about 96) with no merge.
- The BGA wetted diameter = ball diameter in every flow (unphysical; SR opening about 0.8 D). For the 600 um ball
  (cowos, emib) the reflowed height is 453.7 um against the HUD `bga_h_um` 478.

**m3. Mold grind stops at the as-plated die top.**
- The joint collapse lowers the dies: 1.59 um (CoWoS: cap 7 -> 5.41) and 0.89 um (00027: 9 -> 8.11).
- EMC therefore remains over the die backs, contradicting "ground to expose molded dies".

**m4. TSV tip body issues.**
- `tsv_tip` has d 10 = the hole diameter and spans z 675..680, so it overlaps the liner, barrier and seed films. The
  "liner-covered tip" is covered by Cu at the bottom.
- `plate` grows [tsv_cu, tsv_tip] in that order (the via bottom is plated last), inverted for bottom-up superfill.

**m5. Remaining tip oxide fails the cited criterion.**
- Remaining = liner bottom 0.4 x 0.43 = 0.172 um, minus loss 0.075 um, = 0.097 um.
- F142 (cited in the note as satisfied) asks for more than 200 nm.

**m6. TSV ECP duration does not match the model.**
- Duration 18,600 s (analog 10 + 180 + 120 min, a 10 x 39 um fill).
- Model: 100 um / 0.5 um/min = 12,000 s, plus a 3 um overburden at 6 mA/cm2 (0.1323 um/min) = 1,361 s, total 13,361 s.

**m7. CMP times do not match the removed thickness.**
- `tsv_cmp`: 3 um / 1.0268 um/min = 175.3 s, but the geometric removal is 778.8 -> 775.4 = 3.4 um (198.7 s).
- Reveal CMP: the formula uses 6 um (protrusion + passivation), but the tip removal is about 5.1 um (674 -> 679). The
  rate is the blanket Cu rate.

**m8. Bosch time uses fractional loops.**
- HUD 1645.6 s = 126.58 x 13 s; the engine staircase uses 127 loops = 1651 s.

**m9. Derived PDims without `refs`.**
- 36 derived PDims have formulas over package3d params but no `refs`: cowos 10 (e.g. `pieces/interposer_wafer/unit/w_um`
  = ip2013_w_mm x 1000) and emib 26 (e.g. substrate 65 mm, bridge sites).
- Contract sections 0.1 and 13.1 require `refs` (leaf cells) on derived values.

**m10. Expansion-op order provenance is not in the JSON.**
- OpCall carries no source row or flow, e.g. the damascene order from 00060-F1, the reveal order from eptc59621-F1 and
  the uBump order from 00155-F1. The HUD cannot show which paper ordered a sub-op.
- Added ops not in any DB module are marked only in their label.

**m11. The EMIB-T cavity-joint alloy rationale is incomplete.**
- X5 / `liq_cav_c` picks SnAg 221 C so the joint survives the 100-120 C lamination and the 180 C cure.
- It does not address the later top-die TCB with a 250 C joint peak directly above the bridge (about 45 um of
  dielectric away).

**m12. Small note errors.**
- X3 says "3 s above liquidus"; the profile gives a TAL of 4.68 - 0.81 = 3.87 s.
- X6 area ratio 400 / (4 x 101.6) = 0.98, but the drawn stencil is 100 um, so 1.00. The paste is drawn at 100 % height
  although X6 cites 84 % transfer.
- X8 calls 2 um ENi "the thin end" of IPC-4552 3-6 um; it is below the range.

**m13. The reveal-grind analog description is not supported by the text.**
- `reveal_grind_um` analog eptc67330-F2-s11 is described as "a 10 x 100 um TSV interposer". The text gives a 100 um
  superconducting interposer with Ta-lined TSVs and no TSV diameter.
- The 110 um is read from a figure label (DB source "mixed").

**m14. ABF cure HUD.**
- The HUD shows 180 C with time 3600 s (derived 1800 + 1800), but the first 1800 s are at 130 C (00103 p.3).

**m15. CoWoS bump counts are too high.**
- The full C4 array is 130 x 120 = 15,600, against the 2013 "8,700 C4".
- The uBump fields are about 315,000, against the 2013 270,000.

**m16. 00027 front pads drawn only under A1 / B1.**
- The other 8 dies hover 3.05 um above bare Si. This shows only at the work scale; the block window is fine.

**m17. EMIB `cuf` region is too large.**
- 41.2 x 19 mm, which includes 4.5 mm strips beyond the 10 mm-deep DIE 2 / DIE 3: underfill with no die over it.

**m18. 00027 `s08` coat temperature.**
- The coat op carries temp_c 230 C, which is the polyimide cure analog (2 h), not a coat temperature.

**m19. Die B rotation has no provenance.**
- Die B `rot_deg: 90` is a layout claim from the Fig. 1(a) reading but is carried as a bare view number.

**m20. EMIB-T route steps not marked as borrowed.**
- The route runs 2016 steps `via_plating` and `cuf` as "backbone", but neither is in 00051-F1 and neither carries
  `represents`. They are not marked as borrowed for that route.

**m21. P1 / X1 C4 diameter remains unverified.**
- P1 / X1 (c4_d_um 100) rest on a J-STD-028 table title seen in a search excerpt.
- An independent search (2026-10-23) did not surface the table. It stays low; keep the "low confidence" style.

**m22. Rules hygiene.**
- `RESEARCH_PENDING.md` P22 has "Henkel TDS (Aug 2024)" (not ISO, should be 2024-08).
- `PENDING.md` uses "now" in prose (lines 8, 32, 72). This is not data, but the rule says avoid it.

## Physics recomputation (pass / fail)

| check | arithmetic | result |
|---|---|---|
| Cu Faraday | 63.546 / (2 x 96485.33 x 8.96) x 1e-3 A/cm2 -> 0.022052 um/min per mA/cm2 (data 0.02205; engine rho 8.935 -> 0.02211) | pass |
| Ni Faraday | 58.693 / (2F x 8.907) -> 0.02049 (F70 0.02050) | pass (no Ni plating op has a j) |
| SnAg (as Sn) | 118.71 / (2F x 7.289) -> 0.05064 per mA/cm2 (F70 0.0492 with another rho) | pass (3 % spread) |
| SnPb 63/37 | M_eff = 100 / (63/118.71 + 37/207.2) = 141.0; 141.0 / (2F x 8.4) -> 0.05219; 75 um at 20 mA/cm2 = 4311 s | pass (engine uses Sn: 4443 s, +3 %) |
| EMIB SAP Cu | 15 / (0.02205 x 11 x 0.81) = 76.35 min = 4581 s | pass |
| Bosch | ceil(100 / 0.79) = 127 loops; 127 x 0.79 = 100.33 um; 127 x 13 = 1651 s (HUD 1645.6) | pass (m8) |
| Recess | (110 - 95) / 9 x 60 = 100 s | pass |
| Damascene CMP | 1.0 / 1.0268 x 60 = 58.4 s | pass |
| TSV CMP | 3.4 um actual vs 3 um used (175.3 vs 198.7 s) | fail, minor (m7) |
| Grind, logic_thin | 60 / 5 + 30 / 0.25 = 132 s, removal 90 = to_z | pass |
| Grind, tsv_reveal | stages 110 vs 665 removed; 136 s vs 247 s | fail (M1) |
| Washburn 00027 s03 | 2,979 s vs 3,600 s analog | pass |
| Washburn CoWoS UF1 | 3 x 1.4 x 0.024^2 / (0.025 x 27.15e-6 x 0.866) = 4,116 s | pass (borderline vs "within 60 min") |
| Washburn s18 / UF2 / EMIB cuf | 25.0 h / 7.7 h / 10.2 h | fail (M2) |
| Washburn EMIB-T bridge UF | 3 x 22.12 x 0.003^2 / (0.025 x 40e-6 x 0.866) = 690 s | pass |
| C4 cap | V = pi 50^2 75 = 589,049; h^3 + 7500 h = 1.125e6 -> h = 80.49; R = (2500 + 6479) / 160.98 = 55.78 (d 111.6) | pass (note says 80.5 / 111.5) |
| C4 joint | h^3 + 15000 h = 1.125e6 -> H = 60.35 | pass; UF2 gap mismatch (m1) |
| 00027 backside bump free cap | V = pi 37.5^2 25 = 110,447 -> h = 37.5 (exact hemisphere) | pass |
| 00027 uBump joint | V = pi 10^2 9 = 2,827; H(600 + H^2) = 5400 -> H = 8.11 | pass |
| CoWoS uBump joint | V = pi 11^2 7 = 2,661; a 11, b 13.5 -> H = 5.41 | pass; mold grind (m3) |
| EMIB fine / coarse joints | H 14.70 / 19.06 | fail, overlap 4.36 um (M4) |
| TSV reveal chain | grind stop 775 - 665 = 110 (10 um over the via bottom at 675); recess 15 -> Si 95; protrusion 680 - 675 = 5; passivation 679..680; CMP stop 679; liner loss 15 / 200 = 0.075 < 0.172 | pass (m5 tip oxide < 200 nm) |
| Mold, CoWoS | pass_top 782.02 + 0.15 + 5 + 22 + 685 = 1494.17 die top; +120 = 1614.17 = mold_top; grind removal 120 | pass |
| Mold, 00027 | 775 + 1 + 26.05 + 675 = 1477.05; +200 = 1677.05 | pass |
| EMIB stack | base_top 2098; levels of 30 um; cavity 2128..2218; adhesive 15 + bridge 75 = 90 -> pad top 2218 = via bottom | pass (EMIB route) |
| EMIB-T stack | bridge 40 + 50 = 90 on 2098 -> 2188 = via bottom, but collapse 5.53 | fail (M6) |
| Reflow peak vs liquidus | SnPb 235 / 220 vs 183 (+52 / +37); SnAg TCB 250 vs 221; s15 233.2 vs 221 (+12); SAC BGA 255 vs 220; LTS 160 vs 138, 175 vs 138 | pass |
| Reflow, mixed alloys | LTS / SAC 160 vs paste 220; SAC / LTS 210 vs ball 220 | fail (C1) |
| EMIB TCB profile | 140 -> 250 in 1.1 s = 100 C/s; 250 -> 140 in 2.2 s = 50 C/s; 221 C at 0.81 s | pass (TAL 3.87 s, m12) |

## Composition faithfulness

- **cowos_s:** backbone 2013-F1 s01-s11, then F2 s01-s04, in DB order. The inserted steps carry `src.note` "inserted: ..."
  with the flow that shows the position: fs_passivation, UF1 + cure, mold, PMC, mold grind, carrier bond, debond, UF2
  (2013-F4) + cure, ring + cure, BGA. Pass.
- **emib:** route emib = 2016-F2 s01-s09 in order; route emib_t = 00051-F1 seq 1-8 (s01, s02, s03, s04, s05, s08, s06,
  s07) in order. Inserted cure, lid and BGA are marked. Pass, except m20.
- **00027:** 27 DB steps in seq order, with s29 first as the DB orders it (`inferred_order`); s22 / s23 / s25 are split
  per route. Pass.
- **Expanded sub-ops:** marked in YAML only (m10).
- **Reported values:** the paper states every one I checked. The issue is presentation scope (M11).

## Rules

- No emoji: pass. Non-ASCII appears only in verbatim quotes in the RESEARCH files (deg, mu, en-dash).
- ISO dates: pass in data. Minor exceptions in research prose (m22).
- No local absolute paths in config/process3d, scripts, JSON, engine or lanes: pass.
- Every number carries a status: pass. The bare numbers are only step `n`, block windows, `rot_deg`, `w` and
  completeness, all view or meta values.
- `na` only in the HUD: pass (2 values, both in `steps[].hud`).

## Sample (seed 20261023; stratified per flow; plus every "proposal:" value)

Reported (DB cell = value and unit; text at the locator):

| id | flow / path | value | ref row.field | text check | scope | result |
|---|---|---|---|---|---|---|
| S01 | 00027 bodies/bbump_snag/h_um | 25 um | -a-i2.cap_height_um | Table I "SnAg 25" | own | pass |
| S02 | 00027 s25_sac_lts peak_c | 210 C | -a-i5.bonding_temp_c (approx) | p.5 "around 210°C" | own | pass (drawn melt wrong, C1) |
| S03 | 00027 au_a1 h_um | 0.05 um | -a-L04 | Table I "Au 0.05" | own | pass |
| S04 | 00027 s18 length_mm | 42 mm | -a-c3.x_mm | "42 mm x 46 mm" | own | pass |
| S05 | 00027 release h_um | 1 um | F1-s06.conditions | "release layer ... 1 μm" | own | pass |
| S06 | 00027 bbump_cu d_um | 75 um | -a-i2.diameter_um | Table I "75" | own | pass |
| S07 | 00027 s19 time_s | 7200 s | F1-s19.time_s | "cured at 165°C for 2 h" | own | pass |
| S08 | 00027 tba h_um | 70 um | F1-s06.conditions | "70 μm" | own | pass |
| S09 | 00027 die_a d_mm | 20 mm | -a-c1.y_mm | "Die A, 20 mm x 20 mm" | own | pass |
| S10 | cowos carrier_bond time_s | 120 s | 00027-F1-s06.time_s | "215°C for 120 s" | inserted, out-of-family | pass (M11) |
| S11 | cowos substrate w_mm | 40 mm | 2013-a-c4.x_mm | "40mm x 40mm organic" | own | pass |
| S12 | cowos carrier_bond temp_c | 215 C | 00027-F1-s06.temp_c | same | out-of-family | pass (M11) |
| S13 | cowos uBump seed thickness | 0.15 um | 00155-F1-s01 | "25 mu-thick Ti and 150 mu-thick Cu" (OCR; nm) | expansion, out-of-family | pass (M11) |
| S14 | cowos tres opening d_um | 10 um | 2013-a-i2.diameter_um | "10μm in diameter and 100μm deep" | own | pass |
| S15 | cowos al_pitch_um | 5 um | 2013-F1-s06.target | "Al redistribution layer at 5μm pitch" | own | pass |
| S16 | cowos singulate unit_d_mm | 24 mm | 2013-a-c3.y_mm | "26mm x 24mm interposer" | own | pass |
| S17 | cowos uf1_cure temp_c | 165 C | 00322-F1-s03 | text l.329 "165 ℃" (Table IV) | inserted, out-of-family | pass (M11) |
| S18 | emib brpt pitch | 45 um | 00051-a-i1 | "45um bump pitch EMIB" | own | pass |
| S19 | emib buildup seed etch duration | 25 s | 00298-F1-s12 | "spray ... 30 ºC for a time of 25 s" | expansion, out-of-family | pass (M11) |
| S20 | emib ABF lamination temp | 100 C | 00103-F1-s03 | "laminated in two steps at 100 °C" | expansion, out-of-family | pass (M11) |
| S21 | emib substrate d_mm | 65 mm | 00061-a.package_y_mm | "65 x 65 mm" | family | pass |
| S22 | emib bridge_h_um | 75 um (lt) | 2016-a-c1 | "thinning (below 75m)" | own | pass (drawn as exactly the upper bound) |
| S23 | emib ABF lamination pressure | 0.7 MPa | 00103-F1-s03 | "1 minute of 0.7 MPa" | out-of-family | pass (M11) |
| S24 | emib substrate w_mm | 65 mm | 00061-a.package_x_mm | same | family | pass |
| S25 | emib bridge_t w_mm | 3 mm | 2026.00051-b-c1 | "bridge of 3 mm x 18 mm" | family | pass |

Plus the full check: 322 / 322 reported PDims equal their DB cell. Number-in-text cells contain the value.

Derived (recomputed):

| id | path | formula -> value | result |
|---|---|---|---|
| S26 | 00027 substrate unit d | 120 x 1000 = 120000 | pass |
| S27 | 00027 cap_a z | 675 + 13 + 2 = 690 | pass |
| S28 | 00027 pcb unit d | 160 x 1000 | pass |
| S29 | 00027 substrate unit w | 120 x 1000 | pass |
| S30 | 00027 die_a unit w | 20 x 1000 | pass |
| S31 | cowos die_d unit w | 12 x 1000 | pass |
| S32 | cowos interposer unit w | 26 x 1000 = 26000 | arithmetic pass; no refs (m9) |
| S33 | cowos liner cov_side_top | "1" datum | pass |
| S34 | cowos interposer unit d | 24 x 1000 | arithmetic pass; no refs (m9) |
| S35 | cowos substrate unit d | 40 x 1000 | pass |
| S36 | emib mv rect x | "0" datum | pass |
| S37 | emib bridge_t unit w | 3 x 1000 | arithmetic pass; no refs (m9) |
| S38 | emib bridge_t unit d | 18 x 1000 | arithmetic pass; no refs (m9) |
| S39 | emib mv rect w | 65000 - 130 = 64870 | arithmetic pass; no refs (m9) |
| S40 | emib bridge unit w | 2 x 1000 | arithmetic pass; no refs (m9) |

Template (rationale; cited row says it):

| id | path | value | basis checked | result |
|---|---|---|---|---|
| S41 | 00027 pad_b1 x | 14150 = 10000 + 150 + 4000 | Fig. 1(a) reading, gap analog 00049-a-c1 150 | pass |
| S42 | 00027 s18 mu | 22.12 Pa s | A104 TDS "22,120" mPa s at 25 C | row pass; use fails (M2) |
| S43 | 00027 pad_a1 y | 10075 = 10000 + 75 | as S41 | pass |
| S44 | 00027 sbt h | 1600 | 00155-a-c10 "4/2/4 ... 1.6 mm" | pass |
| S45 | 00027 glass h | 700 | 00227-F1-s21 thickness_in 700 | pass |
| S46 | 00027 pcb_pad d | 119000 | 120000 - 1000 | pass |
| S47 | 00027 kerf | 50 | F164 quote | pass |
| S48 | 00027 s08 temp | 230 | 00155-F2-s04 230 C, 7200 s | pass (m18) |
| S49 | cowos ring_w | (40 - 26) / 2 - 3 = 4 | rationale | pass |
| S50 | cowos uf1 h | 0.15 + 5 + 22 = 27.15 | 00155 rows | pass (as-plated gap) |
| S51 | cowos sbt z | 600 | 00155-a-i4 600 | pass (m2) |
| S52 | cowos reveal rough removal | 110 - 30 = 80 | wrong variable | fail (M1) |
| S53 | cowos c4_res z | 775 - 95 - 1 - 0.5 - 80 = 598.5 | rows exist | pass |
| S54 | cowos cap_c h | 7 | 00155-a-i1 cap 7 | pass |
| S55 | cowos seed thickness | 0.3 | 00071-a-L04 0.3 | pass |
| S56 | cowos tsv pitch | 200 | rationale (C4 on TSV) | pass (m15) |
| S57 | cowos c4 d | 100 | P1 / X1 search excerpt only | pass, low (m21) |
| S58 | emib bridge_place_t head T | 280 | P18 "~280 ºC" | pass |
| S59 | emib SAP plate duration | 15 / (0.02205 x 11 x 0.81) x 60 = 4581 s | F70, F71 | pass |
| S60 | emib abf_2 z | 2098 + 30 = 2128 | geometry | pass |
| S61 | emib cu_1 h | 15 | 00148-a-L06 15 | pass |
| S62 | emib cuf_cure temp | 150 | A106 TDS | pass |
| S63 | emib final_lam temp | 100 | 00076-F1-s04 100 C | pass |
| S64 | emib dfr_1 z | 2098 + 15 + 0.15 = 2113.15 | geometry | pass |
| S65 | emib mv_1 d_bot | 36.35 | taper rule (implied wall tan 30 / 3.65 = 8.2; `values` absent) | pass |

Proposals ("proposal:" notes):

| item | value | check | result |
|---|---|---|---|
| X1 c4_d_um | 100 | J-STD-028 title unconfirmed | pass, low (m21) |
| X2 c4_h_um | 75 (cap 80.5 / 111.5) | recomputed 80.49 / 111.6 | pass |
| X3 tcb_T / tcb_F | 140 -> 250 -> 250 -> 140 C, 0.81 s, 39.2 N | ramps 100 / 50 C/s; 4 kgf = 39.2266 N | pass (TAL wording, m12) |
| X4 btcb_T, 10 N, 6 s | as X3 | A15 10 N, A13 6 s | pass, low |
| X5 liq_cav_c | 221 | A60 | pass (m11) |
| X6 paste_d_um | 400 | AR = 400 / (4 x 100) = 1.00 (note 0.98) | pass (m12) |
| X7 bridge force | 1 N | P24 0.14-0.41 N, VCM floor | pass |
| X8 cavity finish | 2.05 um | IPC-4552 3-6 um EN | pass (m12 wording) |
| X9 bump equipment text | text | wording only | pass |
