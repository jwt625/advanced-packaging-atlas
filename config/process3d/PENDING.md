# Process-animation pendings (lane L34 -> research lane L39)

Values the process-animation flows still lack. Classified by what they drive (coordinator 2026-10-23). Dated
2026-10-23. Regenerate the live list with `uv run python scripts/build_process3d.py --check --draft`.

- **drawing_required**: the geometry or an op's physics cannot be built without it. These keep `{pending}` and make
  the strict build fail. Research these first.
- **hud_only**: shown in the HUD only (doses, tool names, bath temperatures, times, optional op inputs). Since 2026-10-23 they are
  `{na: "..."}` (status `na`, "N/A, not reported") in the flow files; replace with a sourced value if research finds
  one. "Optional op input" = the op uses it when present (rate, peak, stage temperature, force), otherwise falls back
  to playback-linear / no peak marker.

Fill format (`config/process3d/COMPOSITION.md` section 1.1): `{ref}` only for a DB cell in the step's own scope;
otherwise `{analog: "<row>.<field>", note}` or `{template: value, source: "<citation>", note}`. Location column = the
file and key to edit.

## 1. drawing_required (10)

| # | quantity (unit) | flow | step | drives | what is needed | location |
|---|---|---|---|---|---|---|
| 1 | SnPb eutectic C4 diameter (um), plated | cowos_s | c4_bumping (plate, reflow), on_substrate, uf2_dispense | C4 solder body, resist openings, joint and UF2 gap | diameter of a plated SnPb eutectic C4 at 200 um pitch (2013 TSMC CoWoS TV or a comparable 2.5D interposer C4) | flows/cowos_s.yaml `geometry.c4_d_um` |
| 2 | SnPb C4 height (um), as plated (and after reflow if given) | cowos_s | c4_bumping, on_substrate, uf2_dispense | C4 solder body volume, interposer-substrate standoff, UF2 gap | plated height at 200 um pitch; reflowed height or standoff if stated | flows/cowos_s.yaml `geometry.c4_h_um` |
| 3 | C4 plating resist thickness (um) | cowos_s | c4_bumping (litho) | resist body (must exceed the plated C4 height) | resist / dry-film thickness used for C4 solder plating (or a rule from the C4 height) | geometry/cowos_s.yaml `c4_res_h_um` |
| 4 | TCB joint temperature profile (C vs s) | emib | tcb | bond_tcb profile T (melt timing, HUD plot); with bond-head set, time and force if available | top-die TCB on an organic substrate with mixed 55 / 130 um bumps (EMIB or similar) | geometry/emib.yaml `profiles.tcb_T` (and flows/emib.yaml tcb hud, na as of 2026-10-23) |
| 5 | EMIB-T bridge TCB joint temperature profile (C vs s) | emib (emib_t) | bridge_place_t | bond_tcb profile T of the bridge-to-cavity joint | panel-level TCB attach of a thin TSV bridge to cavity pads (EMIB-T or similar) | geometry/emib.yaml `profiles.btcb_T` |
| 6 | EMIB-T cavity-side joint solder alloy and liquidus (C) | emib (emib_t) | bridge_place_t | bond_tcb liquidus_c (required) | alloy of the bridge back-side bumps (then a liquidus with a citation) | flows/emib.yaml `geometry.liq_cav_c` |
| 7 | EMIB package BGA low-temperature solder alloy and liquidus (C) | emib | bga | ball_attach liquidus_c (required) | alloy of the "low-temperature solder" BGA of the EMIB CHIPS prototype (ectc51687.2025.00061-F3-s05), or an EMIB-class BGA alloy | flows/emib.yaml `geometry.liq_bga_c` |
| 8 | polymer TIM bond-line thickness (um) | emib | lid | lid placement height | bond line of the polymer TIM under the IHS lid (EMIB or similar FCBGA) | flows/emib.yaml `geometry.tim_h_um` |
| 9 | solder paste print / stencil thickness (um) | 2p5d_120mm | s23_lts, s23_sac, s24 | paste body height, print op (required), package placement height | stencil thickness for 0.5 mm balls (ectc51687.2025.00027 or a comparable board mount) | flows/2p5d_120mm.yaml `geometry.stencil_um` |
| 10 | solder paste deposit / aperture diameter (um) | 2p5d_120mm | s23_lts, s23_sac | paste body diameter | stencil aperture or pad size on the PCB for 0.5 mm balls | geometry/2p5d_120mm.yaml `paste_d_um` |

## 2. hud_only (`na` as of 2026-10-23; 34)

| # | quantity (unit) | flow | step / op | role | what would fill it |
|---|---|---|---|---|---|
| 11 | PCB press temperature (C) | 2p5d_120mm | s13 | HUD | batch-lamination profile of a 28-layer CCL / prepreg board (VH-2347) |
| 12 | PCB press time (s) | 2p5d_120mm | s13 | HUD | same |
| 13 | PCB press pressure (MPa) | 2p5d_120mm | s13 | HUD | same |
| 14 | i-line dose for the TSV resist (mJ/cm2) | cowos_s | tsv_etch.pattern | HUD; optional op input (pattern dose) | TSV litho dose for a 12 um class resist |
| 15 | damascene dielectric CVD temperature (C) | cowos_s | fs_interconnect.diel | HUD; optional op input | SiN / TEOS BEOL deposition temperature |
| 16 | damascene exposure dose (mJ/cm2) | cowos_s | fs_interconnect.litho | HUD; optional op input | sub-um line litho dose |
| 17 | damascene lithography tool | cowos_s | fs_interconnect.litho | HUD (equipment) | scanner / stepper type for < 1 um pitch interposer BEOL |
| 18 | damascene trench etch time (s) | cowos_s | fs_interconnect.etch | HUD (op duration) | dielectric trench etch time / rate |
| 19 | dielectric etch tool | cowos_s | fs_interconnect.etch | HUD (equipment) | plasma etcher type |
| 20 | damascene ECP current density (mA/cm2) | cowos_s | fs_interconnect.ecp | HUD; optional op input (Faraday rate) | damascene Cu plating recipe |
| 21 | damascene ECP time (s) | cowos_s | fs_interconnect.ecp | HUD (op duration) | same |
| 22 | damascene CMP time (s) | cowos_s | fs_interconnect.cmp | HUD (op duration) | removal amount / time for a 1 um Cu level |
| 23 | Al RDL exposure dose (mJ/cm2) | cowos_s | fs_interconnect.al_litho | HUD; optional op input | Al RDL litho dose |
| 24 | Al RDL dry-etch time (s) | cowos_s | fs_interconnect.al_etch | HUD (op duration) | Al etch rate |
| 25 | front passivation tools | cowos_s | fs_passivation | HUD (equipment) | deposition and opening tools |
| 26 | SnPb plating current density (mA/cm2) | cowos_s | c4_bumping.plate | HUD; optional op input (Faraday rate) | SnPb C4 plating recipe |
| 27 | SnPb plating time (s) | cowos_s | c4_bumping.plate | HUD (op duration) | same |
| 28 | C4 bump reflow peak (C) | cowos_s | c4_bumping.reflow | HUD; optional op input (peak_c) | SnPb bump reflow profile |
| 29 | C4 joining reflow peak (C) | cowos_s | on_substrate.reflow | HUD; optional op input (peak_c) | SnPb flip-chip reflow profile |
| 30 | electroless Cu seed bath temperature (C) | emib | buildup.seed, via_plating.seed | HUD; optional op input | electroless Cu bath temperature on ABF |
| 31 | cavity-pad surface finish thickness (um) | emib (emib_t) | cavity_t | HUD (finish not drawn) | finish type and thickness of the EMIB-T cavity pads |
| 32 | bridge attach temperature / adhesive cure (C) | emib | bridge_place | HUD | EMIB bridge adhesive attach conditions |
| 33 | bridge placement force (N) | emib | bridge_place | HUD; optional op input (place force) | same |
| 34 | EMIB-T bridge TCB bond-head temperature (C) | emib (emib_t) | bridge_place_t | HUD (profile #5 drives the joint) | same source as #5 |
| 35 | EMIB-T bridge TCB force (N) | emib (emib_t) | bridge_place_t | HUD | same |
| 36 | EMIB-T bridge TCB time (s) | emib (emib_t) | bridge_place_t | HUD | same |
| 37 | bridge underfill dispense temperature / cure (C, s) | emib (emib_t) | bridge_uf_t | HUD; optional op input (stage_c) | bridge underfill conditions |
| 38 | bridge underfill dispense tool | emib (emib_t) | bridge_uf_t | HUD (equipment) | same |
| 39 | substrate bumping process / tool (55 / 130 um) | emib | bumps | HUD (equipment) | EMIB substrate FLI bump process |
| 40 | FLI bump plating tool | emib (emib_t) | fli_t | HUD (equipment) | same |
| 41 | top-die TCB bond-head temperature (C) | emib | tcb | HUD (profile #4 drives the joint) | same source as #4 |
| 42 | top-die TCB time (s) | emib | tcb | HUD | same |
| 43 | top-die TCB force (N) | emib | tcb | HUD (force profile dropped until sourced) | same |
| 44 | low-temperature BGA reflow peak (C) | emib | bga | HUD; optional op input | same source as #7 |

Count: 10 drawing_required + 34 hud_only (44 distinct quantities; the earlier 46 included the backside CMP time,
a template from F105 since 2026-10-23, and the top-die TCB force profile, folded into #43).

## 3. Status after the L39 fill pass (2026-10-23 17:55)

Source file: `config/process3d/RESEARCH_PENDING.md` (rows P1-P55, proposals X1-X9). From the 2026-10-23 fill pass on, the strict build
passes with 0 pendings; `app/static/data/process3d.json` is written without the draft flag.

| # | status | value (spec) | source |
|---|---|---|---|
| 1 | filled, template (low) | 100 um | P1, X1 (J-STD-028 table title, search excerpt only) |
| 2 | filled, template (proposal) | 75 um plated | X2 (P3, P4, P9) |
| 3 | filled, analog | 80 um | 001c.74748-F1-s02 (F78, P4) |
| 4 | filled, template profile (proposal, low) | 140 -> 250 -> 250 -> 140 C over 6.3 s; force 39.2 N to 0.81 s | X3 (P17, P18, A10, A13, A55) |
| 5 | filled, template profile (proposal, low) | as #4 | X4 |
| 6 | filled, template (proposal) | Sn-3.5Ag, 221 C | X5, A60 |
| 7 | filled, template | 138 C (Bi-Sn) | P14, P16 |
| 8 | filled, analog | 85 um | ectc51687.2025.00187-c-c6 notes (P49) |
| 9 | filled, analog | 100 um | tcpmt.2025.3614186-F1-s21 conditions (P51, P52) |
| 10 | filled, template (proposal) | 400 um | X6 (P52) |
| 11-13 | filled, analog | 195 C, 10800 s, 2.6 MPa | estc60143.2024.10712019-F1-s05 (P53-P55) |
| 14 | kept `na` (coordinator rule: different exposure generation) | - | the only value (P27, 1550 mJ/cm2) is a gh-line broadband stepper dose; the TSV litho is i-line |
| 15 | filled, template | 350 C | P31 |
| 16 | filled, template (med) | 25 mJ/cm2 | P28 |
| 17 | filled, template | KrF (248 nm) scanner | P28, P30 |
| 18 | filled, template (derived, low) | (imd + cu) / 0.51 um/min | P32, P33 |
| 19 | filled, analog | fluorine RIE | ectc51529.2024.00392-F1-s12 (P32) |
| 20 | filled, template | 20 mA/cm2 | P36 |
| 21 | filled, template (derived) | Faraday time of the overburden | F70, P37 |
| 22 | filled, template (derived) | overburden / 1.0268 um/min | F105, P38 |
| 23 | filled, template | 245 mJ/cm2 | P29 |
| 24 | kept `na` (coordinator rule: obsolete chemistry) | - | P34 is 1984 Al(Si) RIE with CCl4 |
| 25 | filled, analog | PECVD; litho + fluorine RIE | ectc51846.2026.00065-F1-s01 (P40, P41) |
| 26 | filled, template | 20 mA/cm2 | P3 |
| 27 | filled, template (derived) | Faraday time for 63Sn37Pb | P7, P8 |
| 28 | filled, template | 217.5 C (audit A1 M12, 2026-10-23; was the 235 C J-STD-020 Tc) | Kester EP256 Sn63Pb37 profile, peak 210-225 C (COMPOSITION.md 9) |
| 29 | filled, template | 217.5 C (audit A1 M12, 2026-10-23; was the 220 C J-STD-020 Tc) | Kester EP256 Sn63Pb37 profile, peak 210-225 C (COMPOSITION.md 9) |
| 30 | filled, template | 40 C (both seed ops) | P42 |
| 31 | filled, template (proposal) | 2.05 um ENIG | X8 |
| 32 | filled, analog | > 95 C at placement | ectc51846.2026.00416-F1-s06 (P21, P22) |
| 33 | filled, template (proposal) | 1 N | X7 |
| 34 | filled, template (low) | 280 C | P18 |
| 35 | filled, template (proposal, low) | 10 N | X4 |
| 36 | filled, template (proposal, low) | 6 s | X4 |
| 37 | filled, template | stage 100 C | A93, P46 |
| 38 | filled, analog | jet valve | ectc51687.2025.00061-F3-s03 (P46) |
| 39, 40 | filled, template (proposal) | panel electroplating line | X9 |
| 41 | filled, template (low) | 280 C | P18 (A13 325 C alternative) |
| 42 | filled, analog | 6 s | ectc51529.2024.00311-F1-s08 (A13) |
| 43 | filled, analog | 39.2 N (also the tcb_F profile) | ectc51529.2024.00311-F1-s08 (A13) |
| 44 | filled, template | 175 C | P15 |

Remaining `na` (HUD only): #14 TSV exposure dose, #24 Al RDL etch time.
