# RESEARCH_TOOLS_ASSEMBLY: assembly, substrate and package-level tools for the process animation

Owner: research lane L33 (DevLog-016, research agent R-b). Date: 2026-10-23. Status: first pass, done.
Scope: flip-chip TCB (incl. CoW on a 300 mm wafer, NCF/NCP, gang), mass reflow, solder reflow physics, flux,
capillary underfill (jet/needle), compression molding and post-mold cure, ball attach, stiffener/lid attach,
organic build-up substrate (ABF lamination, laser via, desmear, electroless Cu, SAP, solder resist, finishes),
EMIB / EMIB-T specifics. Wafer-level fab tools are in `RESEARCH_TOOLS_FAB.md` (lane R-a).

## How to read this file

- Every row: ID, quantity, value/range, unit, applies to, kind, source + quote/locator, accessed, confidence.
- Kind: `F` fact (stated by the source), `D` derived (formula over F rows; formula given), `E` typical-range
  estimate (several sources, range stated), `A` assumption (no source found; rationale given; render as template).
- Repo papers are cited as `paper_id p.N Sec./Table/Fig.` from `references/<paper_id>/text.md`; DB step rows as
  `step_id` from `data/process_steps.csv`. Web sources: URL, accessed 2026-10-23.
- Confidence: `high` = primary document quoted verbatim (paper text, vendor datasheet/spec page, standard summary in
  a vendor note); `med` = primary but via search-result summary or secondary page, or a different-but-similar
  material/tool; `low` = derived with strong assumptions or figure reading.
- "N/A (not found)" = searched, absent. Do not fill these with invented values; the engine should render them as
  template with the stated assumption.
- Units: SI-ish engineering units as the source states them (um, mm, N, kN, MPa, C, s, Pa s, mN/m).

Not reached (rate limits / anti-bot, 2026-10-23): nordson.com product pages (HTTP 403, stopped), mdpi.com (403;
PMC mirror used), Mitsubishi Electric laser-drill pages and findlight datasheets (404), Taiyo AUS datasheet URL now
serves HTML, Ajinomoto ECTC presentations (404). No logins, no paywalled downloads, no paper retrieval scripts.

---

## 1. Flip-chip thermocompression bonding (TCB), incl. CoW TCB on a 300 mm wafer

### 1.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A1 | bonder used for CoW TCB (120 mm 2.5D flow) | Panasonic MD-P300 flip chip bonder | - | ectc51687.2025.00027-F1 s03; ectc51529.2024.00155-F1 s03 | F | ectc51687.2025.00027 p.2 Sec. II.B: "bonded onto a 12-inch silicon interposer by thermal compression bonding using a flip chip bonder (MD-P300, Panasonic Connect Co., Ltd.)" | 2026-10-23 (repo) | high |
| A2 | MD-P300 bonding load | 1 to 50 (option 2 to 100) | N | MD-P300 VCM head | F | https://connect.panasonic.com/en/products-services/fa_products_device-related/lineup/md-p300 : "VCM head : 1 N to 50 N ( Option : 2 N to 100 N )" | 2026-10-23 | high |
| A3 | MD-P300 head heating (thermosonic) | up to 300 | C | MD-P300 head | F | https://connect.na.panasonic.com/smart-factory/electronics-assembly/microelectronics/md-p300-flip-chip-bonder : "Thermosonic : Up to 300℃" | 2026-10-23 | high (TCB head max not separately stated) |
| A4 | MD-P300 substrate heating | constant, up to 200; heated stage max substrate 330 x 220 mm | C; mm | MD-P300 stage | F | same NA page: "Constant heating, Up to 200℃ (Heating bonding stage specifications : Max. substrate size L 330 × W 220 mm)" | 2026-10-23 | high |
| A5 | MD-P300 die supply / die size | wafer frame 12 in (option 8 in); die 1 x 1 to 25 x 25 | in; mm | MD-P300 | F | global page: "Wafer frame 12 inches ( Option : 8 inches )"; "L 1 mm × W 1 mm to L 25 mm × W 25 mm" | 2026-10-23 | high |
| A6 | MD-P300 placement accuracy | +/-5 (3 sigma) | um | MD-P300 | F | global page: "XY ( 3σ at Panasonic conditions ) : ±5 μm" | 2026-10-23 | high |
| A7 | MD-P300 cycle time | 0.5 (dry run); 0.65 (C4 incl. dipping motion) | s/IC | MD-P300 | F | NA page: "C4 : 0.65s/IC (including dipping motion)"; overview "0.5 seconds per IC (dry run)" | 2026-10-23 | high |
| A8 | MD-P300 machine footprint | W 1380 x D 1640 x H 1430 (without loader/unloader) | mm | MD-P300 | F | NA page: "W 1,380 × D 1,640 × H 1,430 ( without loader / unloader)" | 2026-10-23 | high |
| A9 | CoW TCB: stage temperature | 100 | C | Panasonic FCB3, Si interposer wafer, 12 in | F | ectc51909.2023.00155 p.2 Sec. II.C: "The stage temperature was kept at 100°C during bonding"; Table 5 "Stage temperature (OC) 100" | 2026-10-23 (repo) | high |
| A10 | CoW TCB: head set temperature and time | 440 set, 7 s (actual max 250 at joint) | C; s | same | F | ectc51909.2023.00155 Table 5 (p.2-3): "Bonding temperature (0C) 440°C, 7 seconds. (actual max temperature at 250°C)" | 2026-10-23 (repo) | high (OCR text) |
| A11 | CoW TCB: bond force | 1 | N | same (Die A + 4 Die B) | F | ectc51909.2023.00155 Table 5: "Bonding force IN" (= 1 N; DB step ectc51909.2023.00155-F1-s08 force_n = 1) | 2026-10-23 (repo) | med (OCR) |
| A12 | TCB with flux: bond temperature / stage / time | 235 / 70 / 7 | C; C; s | Si interposer TV | F | DB estc60143.2024.10712129-F1-s01: "bond temperature 235 C; stage 70 C; 7 s" (p.2 Sec. II.A, Table I); same set for ectc51909.2023.00153-F1-s08 | 2026-10-23 (repo) | high |
| A13 | fluxless D2W TCB head temp, ramp, force, time | 325; 100 C/s; 4 kgf (39.2 N); 6 s | C; C/s; N; s | Besi TC-advanced | F | DB ectc51529.2024.00311-F1-s08: "bond-head 325 C, ramp 100 C/s; electrical lot 4 kgf, 6 s" (p.3 Sec. IV) | 2026-10-23 (repo) | high |
| A14 | D2W TCB, Besi | 4 kgf polymer, 2 kgf CUF samples; interface 250 C; two-step RT-150-250 C | N; C | Besi TCadvanced / TCnext | F | DB tcpmt.2025.3628798-F3-s01, -F5-s03 (p.5-6 Sec. IV.A) | 2026-10-23 (repo) | high |
| A15 | small-force TC placement head profile (large chip) | 75 -> 250 -> 275 C, hold 2.5 s, back to 75 C; 10 N; strip at RT | C; s; N | P&P head, chip-on-RDL strip | F | 2380-4505-2020.1.000042 p.4: "temperature rises very fast from 75oC to 250oC and then 275oC and stays there for 2.5 seconds, then drops very fast to 75oC. The applied force is small (10N)" | 2026-10-23 (repo) | high |
| A16 | same, small chips | 75 -> 225 -> 260 C, hold 1 s; 5 N | C; s; N | same | F | 2380-4505-2020.1.000042 p.5: "rises very fast from 75oC to 225oC and then 260oC and stay there for 1 second ... The applied force is very small (5N)" | 2026-10-23 (repo) | high |
| A17 | TCB profile phases (3 zones) | Zone 1 pre-heat at constant force to solidus; Zone 2 melt with z-height "solder chase"; Zone 3 rapid cooling ("exponential decay"), vacuum release, pull away | - | ASE FOCoS-Bridge CM-to-substrate TCB | F | ectc51529.2024.00151 p.4-5 Sec. II.E, Fig. 9: "CM shifts to a lower position (solder chase) as C4 joints melt"; "bond head releases the vacuum holding the CM and pulls away" | 2026-10-23 (repo) | high |
| A18 | TCB profile phases (6 steps) | initial contact at constant searching speed, low force; pre-heat; heated stage; displacement-based melt detection; timed drive-in; controlled cooling | - | fluxless TCB with in-situ plasma | F | ectc51846.2026.00227 p.4 Sec. III.A: "A controlled low-force approach was applied at a constant searching speed"; "A displacement-based trigger was used to identify the onset of solder wetting" | 2026-10-23 (repo) | high |
| A19 | TCB pre-step sequence | substrate flux jetting; substrate on vacuum chuck; die picked by vacuum bond head; flux dipping; bond; flux clean | - | FOCoS-Bridge TCB | F | ectc51529.2024.00151 p.4 Sec. II.E: "The substrate is first treated to flux jetting ... The CM is then picked up by the bond head, which is vacuum secured, to perform the flux dipping process" | 2026-10-23 (repo) | high |
| A20 | bond head thermal Z growth | ~15 um when heating 160 -> 280 C (needs compensation) | um | K&S TCB head | F | https://sst.semiconductor-digest.com/insights-from-leading-edge/2015/04/iftle-235-kns-update-on-thermocompression-bonding-and-dow-update-on-mechanical-laser-debondable-temp-adhesives : "Heating bond head from 160C to 280C creates ~15 um Z movement which requires compensation." | 2026-10-23 | high (vendor talk summary) |
| A21 | TCB force need; planarity; UPH threshold; op count | forces "upwards of 300N"; planarity < 2 um / 10 mm; 1000 UPH; "can require 10 operations" | N; um; UPH | K&S TCB | F | same IFTLE 235 page: "forces upwards of 300N may be required"; "Planarity of the bond head to the target surface must be < 2um/10mm"; "1000 UPH is generally considered to be the threshold" | 2026-10-23 | high |
| A22 | TC-NCF force model | F = alpha beta A^2; beta = 5e-6 chi + 0.516 (chi = bump count); TC-NCF peak 380 C | N; -; C | Samsung TC-NCF | F | ectc51529.2024.00064 p.3: "F= αβA2 ... β = 5x10-6 χ + 0.516"; DB ectc51529.2024.00064-F1-s04 temp_c_max 380 | 2026-10-23 (repo) | high (alpha expression is an image; not in text) |
| A23 | NCP TCB profile | contact at head ~170 C, stage ~150 C; head ramped fast; force reduced during heating; SnAg reflow 230 C; NCP cures in "a couple of seconds" at 230 C; head set peak ~260 C | C | Finetech FEMTO2, NCP | F | DB 001c.74770-F1-s03 (p.4-5 Sec. III, Fig. 5) | 2026-10-23 (repo) | high |
| A24 | gang / collective bonding (TC-NCF HBM) | stack tacked one at a time, then collective or gang bond; tacking "1700 to 3500" UPH for 4-die NCF stack | UPH | K&S HBM flow | F | https://sst.semiconductor-digest.com/insights-from-leading-edge/2018/02/iftle-370-3d-asip-part-3-bonding-and-assembly-in-hbm-memory-stacks : "Die stack tacked followed by Gang Bond"; "Tacking has the potential to move machine UPH from 1700 to 3500 for a 4 die stacked process using NCF" | 2026-10-23 | high |
| A25 | CoW unit layout on 12 in interposer wafer | 2 Die A 20 x 20 mm + 8 Die B 10 x 8 mm per 42 x 46 mm interposer; die Si 0.675 mm | mm | ectc51687.2025.00027 TV | F | ectc51687.2025.00027 p.2 Sec. II.A, Table II | 2026-10-23 (repo) | high |
| A26 | microbumps (die side) | pitch 40; dia 20; Cu 13 / Ni 2 / SnAg 9 | um | Die A/B | F | ectc51687.2025.00027 p.2 Table II: "Bump pitch (μm) 40 / Bump diameter (μm) 20 / Cu pillar height 13 / Ni height 2 / SnAg bump height 9" | 2026-10-23 (repo) | high |
| A27 | interposer front pads | pitch 0.04 mm; dia 0.02 mm; Al-Cu with electroless Ni 2 um / Au 0.05 um | mm; um | same | F | ectc51687.2025.00027 p.2 Table I | 2026-10-23 (repo) | high |
| A28 | die-interposer gap (CUF layer) | 22 | um | 00155 TV FEM model | F | ectc51909.2023.00155 p.3 Fig. 3 label "CUF 22 ,..m" (OCR) | 2026-10-23 (repo) | med (figure label via OCR) |
| A29 | bond head / collet geometry (tool tip size vs die, material, vacuum hole layout) | N/A (not found) | - | all TCB | - | no public dimensioned drawing found; vendor pages give load/temperature only | 2026-10-23 | - |
| A30 | collet / tool assumption for rendering | flat heated tool face slightly smaller than or equal to die; vacuum pick from die backside; pulse-heated ceramic heater above tool; bond stage = heated vacuum chuck | - | template | A | rationale: A17 ("vacuum secured" pick, vacuum release), A18 (heated stage), ectc51846.2026.00204 ("SiC pulse heater, vacuum tool", DB step -F1-s14) | 2026-10-23 | low |
| A31 | head ramp-down shape | exponential decay toward initial temperature | - | TCB cooling | F | ectc51529.2024.00151 p.4: "the bond head temperature graph's exponential decay characteristic" | 2026-10-23 (repo) | high |

### 1.2 Animation-ready summary (TCB)

- Geometry: stage = 300 mm wafer on a heated vacuum chuck (A4: stage up to 200 C; A9: 100 C used). Bond head =
  vertical column with a flat tool face sized to the die (A30, template). Die A 20 x 20 x 0.675 mm, Die B 10 x 8 x
  0.675 mm (A25); 10 dies per interposer site. Microbump 20 um dia, 40 um pitch, Cu 13 / Ni 2 / SnAg 9 um (A26).
- Kinematics per die (A17-A19, A31): pick from wafer frame (A5) with vacuum -> (flip) -> flux dip (if flux route) ->
  align over site -> descend at constant search speed under low force (A18) -> contact (force step) -> head ramp
  (A13: 100 C/s; A15/A16 shapes) -> melt detected by Z step -> drive-in / solder chase to target standoff -> hold
  (A10: 7 s; A13: 6 s; A15: 2.5 s) -> fast exponential cool -> vacuum release -> retract. Head Z thermal growth
  ~15 um across 160-280 C (A20) can be shown as a tiny HUD correction.
- HUD profile defaults (CoW, flux route): stage 100 C (A9), head set 440 C for 7 s with joint peak 250 C (A10),
  force 1 N (A11). Alternative fluxless: 325 C, 100 C/s, 39 N, 6 s (A13). NCF: F = alpha beta A^2 (A22), peak up
  to 380 C. Gang: show tack each die, then one large tool pressing the stack (A24).
- Physics: TCB collapse = SnAg cap (9 um on 20 um pillar) melts at contact; standoff target from A28 (22 um gap);
  volume conservation as in Sec. 3.

---

## 2. Mass reflow (conveyor oven) and reflow profiles

### 2.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A40 | oven used for interposer-to-substrate and bump reflow | Senju SNR-1065GT (N2 reflow) | - | ectc51687.2025.00027-F1 s15; ectc51909.2023.00155 | F | ectc51687.2025.00027 p.3 Sec. II.B "reflow oven (SNR-1065GT, ..."; ectc51909.2023.00155 p.4 "fused at 260°C by reflow oven (SNR-1065GT, SENJU METAL INDUSTRY CO.,LTD)" | 2026-10-23 (repo) | high |
| A41 | SNR-1065GT dimensions L x W x H | 7,900 x 1,490 x 1,460 | mm | SNR-1065GT | F | Senju FA catalog 2018-12 https://www.senju.com/ja/download/pdf/SMICcat201812_FA_J_E.pdf (SNR-1065GT spec table): "7,900 x 1,490 x 1,460 mm" | 2026-10-23 | high |
| A42 | SNR-1065GT heated / cooling zones | 14 / 2 | count | SNR-1065GT | F | same table: "Heated zones 14", "Cooling zones 2" | 2026-10-23 | high |
| A43 | SNR-1065GT conveyor speed; conveyor height | 0.3 - 2.0 m/min; 900 +/- 20 mm | m/min; mm | SNR-1065GT | F | same table: "0.3 - 2.0 m/min"; "900±20 mm" | 2026-10-23 | high |
| A44 | SNR-1065GT board size; component height | W 50-500, L 100-500, T 0.8-3.0 mm; <= 10 mm (option 35 mm) top | mm | SNR-1065GT | F | same table: "W: 50 - 500, L: 100 - 500, T: 0.8 - 3.0 mm"; "≦10mm [OP: 35mm]" | 2026-10-23 | high |
| A45 | SNR-1065GT N2 supply; power | >= 99.999 %, >= 0.4 MPa, 400 L/min; 200 V, max 48 kW | -; MPa; L/min; kW | SNR-1065GT | F | same table: "≧99.999%, ≧0.4MPa, 400L/min"; "200V, max. 48kW, 200A, 3-phase" | 2026-10-23 | high |
| A46 | SNR-GT features | vertical labyrinth curtain at inlet/outlet; N2 curtain; cross-nozzles; flux collection cup | - | SNR-GT series | F | same catalog p. SNR-GT: "Vertical labyrinth curtain at inlet/outlet", "N² curtain", "Heating capacity improved by the cross-nozzles", "Flux collection cup" | 2026-10-23 | high |
| A47 | heated tunnel length | N/A (not found); total machine length is 7.9 m (A41) | m | SNR-1065GT | - | catalog gives only overall length | 2026-10-23 | - |
| A48 | J-STD-020E Pb-free classification profile | Ts 150-200 C for 60-120 s; ramp TL->Tp 3 C/s max; TL 217 C; tL 60-150 s; Tp <= 260 C; tp (within 5 C of Tc) 30 s; ramp-down 6 C/s max; 25 C -> peak 8 min max | C; s; C/s; min | Pb-free (SAC) classification | F | TT Electronics TN012 (J-STD-020E based), https://www.ttelectronics.com/TTElectronics/media/ProductFiles/Application-Note/TN012-Reflow-Soldering-Profile-for-SMD-Resistors.pdf : "Liquidus temperature TL 217°C"; "Duration above liquidus tL 60 to 150s"; "Peak temperature Tp ≤260°C"; "Magnitude of ramp-down rate from Tp to TL 6°C/s max."; "Time from 25°C to peak temperature 8 minutes max." | 2026-10-23 | high (secondary statement of the standard) |
| A49 | SAC305 liquidus / reflow window | liquidus 220; reflow 238-248 | C | Sn-3.0Ag-0.5Cu | F | NIST Database for Solder Properties v4 (2002) p.32 Table 2.1.1, https://www.msed.nist.gov/solder/NIST_LeadfreeSolder_v4.pdf : "Sn-3.0Ag-0.5Cu* 220** 238 – 248" | 2026-10-23 | high |
| A50 | SAC/SAC board reflow need | 250-260 (SAC melts 220) | C | 120 mm package to PCB | F | ectc51687.2025.00027 p.5 Sec. III.B: "The melting point of Sn-3Ag-0.5Cu is 220°C, so a bonding temperature of around 250°C to 260°C is required." | 2026-10-23 (repo) | high |
| A51 | LTS (Sn-58Bi) reflow top temperature | 160 (LTS on backside); ~210 for SAC/LTS | C | same | F | ectc51687.2025.00027 p.5: "successfully processed at a reflow top temperature of 160°C. The reflow top temperature for the combination of SAC/LTS was around 210°C." | 2026-10-23 (repo) | high |
| A52 | Sn-58Bi melting point | 138 (eutectic) | C | Sn-58Bi | F | NIST v4 p.49 Table 2.2.19: "Sn-58Bi 138" | 2026-10-23 | high |
| A53 | measured SAC305 profile (single-zone oven) | ramp 1 C/s; peak 260 C; time above 220 C 109 s | C/s; C; s | LPKF ProtoFlow S, jetted bumps | F | DB eptc59621.2023.10457729-F1-s04 (p.3 Fig. 4) | 2026-10-23 (repo) | med (figure reading by distiller) |
| A54 | five-zone oven zone set range | 145 to 260 | C | panel mass reflow | F | ectc.2019.00-29 p.8 Sec. V.B: "Five zone reflow oven used for this purpose and it maintains temperature ranging from 145C to 260C" | 2026-10-23 (repo) | high |
| A55 | SnAg-cap chip mass reflow peak | 250 | C | chip-on-RDL strip | F | 2380-4505-2020.1.000042 p.5: "the maximum temperature is 250oC for the SnAg solder cap" | 2026-10-23 (repo) | high |
| A56 | belt-furnace chip join peak | 230-240 | C | Cu pillar microbumps | F | DB ectc51909.2023.00235-F1-s02 (p.2 Table I) | 2026-10-23 (repo) | high |
| A57 | bump reflow (water-soluble flux) | 260 | C | Cu/SnAg backside bumps | F | ectc51909.2023.00155 p.4: "the bumps were fused at 260°C by reflow oven" | 2026-10-23 (repo) | high |
| A58 | dwell time in oven at belt speed | 4.0 (2.0 m/min) to 26.3 (0.3 m/min) over 7.9 m machine length | min | SNR-1065GT | D | 7.9 m / v (A41, A43); heated length unknown (A47) so true time-in-heat is shorter | 2026-10-23 | low |

### 2.2 Animation-ready summary (reflow oven)

- Geometry: tunnel ~7.9 m long (A41) incl. load/unload; render 14 heated zones + 2 cooling zones (A42) as equal
  segments (equal zone length = assumption A, not sourced); N2 curtains at inlet/outlet (A46). Edge-chain conveyor
  at 900 mm height (A43). Board/panel up to 500 x 500 mm (A44).
- Kinematics: board moves at constant belt speed 0.3-2.0 m/min (A43); profile point T(x) = zone setpoint
  convolved with board lag; HUD plots T(t) with J-STD-020E envelope (A48) and TL line 217 C (SAC) or 138 C (SnBi).
- Default HUD profiles: SAC: preheat 150-200 C 60-120 s, TAL 60-150 s, peak 245-260 C (A48-A50; A53 example:
  1 C/s, 260 C, 109 s above 220 C). LTS: peak 160 C (A51). Microbump/cap mass reflow peak 230-250 C (A55-A56).

---

## 3. Solder reflow physics (surface tension, wetting, IMC, shape)

### 3.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A60 | surface tension Sn-3.5Ag at Tliq + 50 C | 431 (air), 493 (N2) | mN/m | Sn-3.5Ag (SnAg caps) | F | NIST v4 p.49 Table 2.2.19 (Glazer 1994): "Sn-3.5Ag 221 431 493 Ag3Sn" (column header prints "mN/mm"; values are mN/m) | 2026-10-23 | high |
| A61 | surface tension Sn-0.7Cu | 491 (air), 461 (N2) | mN/m | Sn-Cu | F | same table: "Sn-0.7Cu 227 491 461 Cu6Sn5" | 2026-10-23 | high |
| A62 | surface tension Sn-58Bi | 319 (air), 349 (N2); another source 300 dyne/cm | mN/m | Sn-58Bi | F | same table: "Sn-58Bi 138 1.5 319 349"; NIST v4 p.50 Table 2.2.20 (Artaki 1995): Sn-58Bi contact angle 43 deg, surface tension 300 dyne/cm | 2026-10-23 | high |
| A63 | surface tension SAC-type (Sn-2.5Ag-0.8Cu-0.5Sb) | 510 dyne/cm; contact angle 44 deg | mN/m; deg | wave-solder wetting test | F | NIST v4 p.50 Table 2.2.20: "Sn-2.5Ag-0.8Cu-0.5Sb 217 44 4280 510" | 2026-10-23 | high (alloy close to SAC305, not identical) |
| A64 | Cu6Sn5 thickness after 1 min at 265 C | 2.65 (scallop, Cu6Sn5 only) | um | SAC305 on Cu | F | PMC9318113 (Metals/Materials 2022), https://pmc.ncbi.nlm.nih.gov/articles/PMC9318113/ : average thickness "2.65 µm" (L/S-1); 60 min: "6.9 µm" | 2026-10-23 | high |
| A65 | liquid-state IMC growth constant | Cu6Sn5 k = 1.05 +/- 0.122; Cu3Sn 0.175; total 1.225 | um/min^0.5 | SAC305/Cu at 265 C, dx = k t^0.5 | F | same PMC9318113 (Table of L/S kinetics) | 2026-10-23 | high |
| A66 | Ni3Sn4 on ENIG after reflow | ~2.03 (1st) -> ~4.25 (6th reflow); Cu6Sn5 on Cu-OSP ~4.98 -> ~11.28 | um | Sn-3.5Ag, 250 C 60 s, ~900 um balls | F | PMC10302092, https://pmc.ncbi.nlm.nih.gov/articles/PMC10302092 : "from ~2.03 μm after being reflowed to ~4.25 μm after the sixth reflow" | 2026-10-23 | high |
| A67 | reflowed SnAg microbump shape | truncated sphere on 20 um pillar from 9 um plated SnAg: V = 2,827 um^3, cap height ~12.1 um | um^3; um | A26 microbump | D | V = pi a^2 h_plated; solve pi h (3a^2 + h^2)/6 = V, a = 10 um (wetting confined to pillar top: assumption) | 2026-10-23 | low |
| A68 | reflowed backside bump shape | Cu 30 / SnAg 25 on 75 um dia -> V = 110,447 um^3; hemisphere h = 37.5 um | um | interposer backside bump (A27 Table I) | D | same formula, a = 37.5 um; check vs measured: ectc51909.2023.00155 p.6 "average height of the Cu and SnAg was 33 um and 32 um" after reflow (plated 34/25, diameter not given in that paper) | 2026-10-23 | low |
| A69 | reflow transforms appearance of Pb-free joints | Pb-free joints "dull or frosty" vs SnPb "smooth, bright, shiny" | - | SAC joints | F | iConnect007 "Matte-Finish Solder Joints after Lead-Free Wave Soldering", https://iconnect007.com/article/46189/mattefinish-solder-joints-after-leadfree-wave-soldering/46192/smt (search-result quote) | 2026-10-23 | med |
| A70 | molten-solder viscosity, density (for flow dynamics) | N/A (not found in this pass) | - | - | - | not needed by the static truncated-sphere model | 2026-10-23 | - |

### 3.2 Animation-ready summary (solder physics)

- Shape model: volume-conserving spherical cap on the wetted pad (A67, A68). Melt when T > TL (220 C SAC305 A49;
  221 C SnAg; 138 C SnBi A52). Surface tension 430-490 mN/m (SnAg/SnCu, A60-A61) or 320-350 mN/m (SnBi, A62)
  only needed if a dynamic relaxation is animated (Bond number tiny at um scale: gravity negligible; assumption).
- IMC layer: draw Cu6Sn5 scallops at the Cu interface growing as k sqrt(t) with k = 1.05 um/min^0.5 above TL
  (A65); after a normal reflow (~1 min above TL) ~2-3 um (A64). On Ni (ENIG pad / Ni barrier) Ni3Sn4 ~2 um (A66).
- Look: paste/plated = matte grey; liquid = mirror-like; solidified Pb-free = dull/frosty (A69).

---

## 4. Flux application and cleaning

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A80 | flux at CoW TCB | water-soluble flux applied to Cu pads on interposer; cleaned with purified water after bonding | - | ectc51909.2023.00155 | F | p.2 Sec. II.C: "a water-soluble flux was applied to the Cu pad on the interposer. After bonding dies, the flux was cleaned by purified water." | 2026-10-23 (repo) | high |
| A81 | flux dipping layer and force | flux thickness 50 um; dipping force 5 N | um; N | Indium NC-506 dip, chip stack | F | DB ectc51846.2026.00096-F2-s07 (p.5 Fig. 12 Step 7) | 2026-10-23 (repo) | high |
| A82 | flux jetting on substrate before TCB | substrate "first treated to flux jetting" | - | FOCoS-Bridge | F | ectc51529.2024.00151 p.4 Sec. II.E | 2026-10-23 (repo) | high |
| A83 | flux cleaner after interposer mount | Sakura Seiki YWV-4635S | - | ectc51687.2025.00027-F1 s16 | F | ectc51687.2025.00027 p.3 Sec. II.B (DB step) | 2026-10-23 (repo) | high |
| A84 | fluxless alternative | formic-acid reflow avoids flux residues that cause CUF voiding | - | DBHi chip-bridge-chip | F | ectc51906.2022.00106 p.3: "This bonding method avoids flux residues which can cause voiding in capillary underfill." | 2026-10-23 (repo) | high |
| A85 | flux residue appearance (colour, gloss) | N/A (not found) | - | - | - | no primary description found | 2026-10-23 | - |
| A86 | flux residue render assumption | thin translucent amber film around joints before clean; absent after clean | - | template | A | rationale: rosin-type no-clean fluxes are commonly amber; not sourced in this pass, keep template | 2026-10-23 | low |

Animation summary: flux = thin translucent layer (dip 50 um, A81) on bump tips or jetted dots on pads (A82); wash =
spray/rinse step that removes the layer (A80, A83). Fluxless route (formic acid) skips both (A84).

---

## 5. Capillary underfill (jet / needle dispenser), materials, Washburn

### 5.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A90 | jet dispenser used (CoW CUF) | Musashi FAD2500 | - | ectc51687.2025.00027-F1 s04; ectc51529.2024.00155; ectc51909.2023.00155; ectc51529.2024.00322 | F | ectc51687.2025.00027 p.2: "The CUF material was injected by a jet dispenser (FAD2500, MUSASHI ..." | 2026-10-23 (repo) | high |
| A91 | FAD2500 work area; axis speeds | 500 x 500 mm; X,Y 1,000 mm/s; Z 500 mm/s | mm; mm/s | FAD2500 | F | Musashi brochure https://musashi-engineering.de/wp-content/uploads/2022/05/MUSASHI-FAD2500.pdf : "(W)500x(D)500mm", "X,Y axis : 1,000mm/s", "Z axis : 500mm/s" | 2026-10-23 | high |
| A92 | FAD2500 machine size; heater | W 1,270 x D 1,500 x H 1,660 mm, 800 kg; "Non contact Heater" option (50 A) | mm; kg | FAD2500 | F | same brochure: "(W)1,270x(D)1,500x(H)1,660mm", "800kg", "30A Max(Non contact Heater 50A )" | 2026-10-23 | high |
| A93 | CUF dispense temperatures and amount | syringe 72 C; stage 100 C; 60 mg per unit | C; mg | FAD2500, 12 in CoW wafer | F | ectc51909.2023.00155 Table 6 (p.3): "Syringe Temperature 72 / Stage Temperature 100 / CUF amount (mg) 60" (OCR) | 2026-10-23 (repo) | high |
| A94 | stage 110 C; syringe 72 C; 30 min per wafer | C; min | FAD2500, CUF + solid EMC | F | DB ectc51529.2024.00322-F1-s02 (p.3 Sec. II.C, Table IV) | 2026-10-23 (repo) | high |
| A95 | CUF dispense time and pattern for 2 Die A + 8 Die B | "within 60" min; Method III: dispense left Die B side first, start right side after CUF reached end of Die B (no voids); Method I (both sides continuously) left voids | min | ectc51529.2024.00155 TV | F | ectc51529.2024.00155 p.4 Sec. III.A, Table V | 2026-10-23 (repo) | high |
| A96 | fine-jet nozzle and dot | nozzle 50 um ID / 150 um OD; flying rod ~50 um dia; landed dot up to 120 um; dot ~100 um | um | IBM DBHi fine jet | F | ectc51906.2022.00106 p.3: "The dot ejected from the nozzle forms a long rod shape with around 50 um diameter"; "the actual flying dot diameter reaches a maximum value of 120 um" | 2026-10-23 (repo) | high |
| A97 | jet frequency | 300 Hz continuous (Nordson NexJet NJ-8); 166 Hz (older DJ-9500) | Hz | jet valve | F | Nordson NJ-8 page and customer story (search-result quotes; page fetch HTTP 403): "300 Hz continuous operation pneumatic actuation" | 2026-10-23 | med |
| A98 | needle placement | 0.003-0.005 in from die edge; 0.005-0.008 in above substrate (76-127 um; 127-203 um) | in (um) | needle dispense | F | B. Miquel (MRSI), "The back-end process: Step 8 Flip Chip Underfill", https://sst.semiconductor-digest.com/?p=36128 : "0.003 to 0.005″ away from the die"; "0.005 to 0.008″ above the substrate" | 2026-10-23 | high |
| A99 | substrate preheat for needle CUF | 70-80 | C | needle dispense | F | same page: "70° to 80°C" | 2026-10-23 | high |
| A100 | dispense patterns | single bead along longest edge (perimeter bumps); L-shaped line along two adjacent edges for array bumps, fillet on opposite sides after flow-out | - | needle / jet | F | same page: "dispensing an L-shaped line along two adjacent edges of the die" | 2026-10-23 | high |
| A101 | L-pass time and flow-out (12 x 12 mm die) | L pass ~0.6 s; complete flow-out ~20 s | s | Adamson, CSP/flip-chip | F | S.J. Adamson, "CSP and flip chip underfill", https://sst.semiconductor-digest.com/?p=35593 : "an L-shaped dispensing pass can be accomplished in approximately 0.6 seconds"; "complete flow out under the die, however, is about 20 seconds" | 2026-10-23 | high (gap not stated) |
| A102 | fillet height | >= 70 % of die thickness | % | needle CUF | F | Miquel page: "the fillet should cover at least 70 percent of the die thickness" | 2026-10-23 | high |
| A103 | line jetting, 5 um gap, 3 cm^2 die | line jetted in < 1 s; three 0.5 mg lines (1.5 mg); intervals 2-3 then 5-7 min; total flow ~30 min; viscosity 225-425 cPs | s; mg; min; mPa s | Nordson DJ9000, 5 um gap | F | H. Liang, IMAPS 2012, https://imapsource.org/article/56262.pdf : "Jetting will dispense the line within one second"; "Three 0.5mg lines were dispensed"; "Total underfill flow time is about 30 minutes"; "Epoxy with viscosity of 225- 425 cPs" | 2026-10-23 | high |
| A104 | CUF viscosity (Henkel UF 8830S) | 22,120 (Brookfield sp. 51, 5 rpm, 25 C); thixotropic index 0.85; SG 1.6 | mPa s; -; - | FCBGA CUF | F | Henkel TDS (2017-01) https://datasheets.tdx.henkel.com/LOCTITE-ECCOBOND-UF-8830S-en_GL.pdf : "Spindle 51, Speed 5 rpm 22,120"; "Specific Gravity @ 25ºC 1.6" | 2026-10-23 | high |
| A105 | CUF appearance (uncured) | grey paste | - | UF 8830S | F | same TDS: "Appearance Grey paste" | 2026-10-23 | high |
| A106 | CUF cure | 30 min ramp 25 -> 150 C, hold 2 h at 150 C | min; C; h | UF 8830S | F | same TDS: "30 minute ramp from 25°C to 150°C, hold 2hrs at 150°C" | 2026-10-23 | high |
| A107 | CUF cure (papers) | 165 C 2 h; 170 C 2 h; 150 C 2 h; 160 C 2 h; 175 C 2 h | C; h | various | E | DB ectc51687.2025.00027-F1-s19 (165/2 h), ectc51909.2023.00155-F3-s05 (170/2 h), ectc51529.2024.00311-F1-s10 (150/2 h), ectc51846.2026.00176-F2-s06 (160/2 h), 001c.129764-F1-s11 (175/2 h) | 2026-10-23 (repo) | high |
| A108 | CUF / NCP filler and viscosity (IBM table) | CUF-A: epoxy, filler 55 wt %, filler < 1 um, viscosity 30-50 Pa s at 25 C, Tg < 150 C | wt %; um; Pa s | DBHi fine-filler CUF | F | ectc51906.2022.00106 p.2 Table I: "Filler content wt% 55 60 60 55"; "Viscosity@25°C Pa-s <20 <20 30~50 30~50" (OCR) | 2026-10-23 (repo) | high |
| A109 | narrow-gap filler limits | LCMUF-B (largest filler 1.7 um, 83.5 wt %) failed to fill 20 um pitch; smaller filler and content needed | um; wt % | 15-20 um pitch CoW | F | ectc51529.2024.00322 p.4 Sec. III.A: "LCMUF-B has the largest filler size at 1.7 µm, has the highest filler content at 83.5 wt%" | 2026-10-23 (repo) | high |
| A110 | Washburn front (parallel plates) | x(t) = sqrt(gamma h cos(theta) t / (3 mu)); t_fill = 3 mu L^2 / (gamma h cos theta) | - | CUF model | F | Hsu, Chiu, Chang (Moldex3D), https://www.moldex3d.com/assets/2011/09/3D-SIMULATION-OF-UNDERFILL-ENCAPSULATION-IN-SEMICONDUCTOR-PROCESSING.pdf eq. (12): "most studies reported in the reference applied the Washburn model"; filling time grows with mu and L^2, falls with h, gamma, cos theta | 2026-10-23 | high (form) |
| A111 | underfill surface tension; contact angles | 25 mN/m (at 60 C); theta 35 deg FR4, 25 Al2O3, 33 Cu, 30 SnSb5, 25 Ag | mN/m; deg | Siemens component-level CUF (67 % quartz, max 1.5 um, density 1730 kg/m^3) | F | Stencel et al., Micromachines 2023, PMC10609424, https://pmc.ncbi.nlm.nih.gov/articles/PMC10609424/ (Table 2) | 2026-10-23 | med (board-level underfill, gaps 200-600 um, not CoW CUF) |
| A112 | underfill rheology note | non-Newtonian at low shear and time-dependent contact angle strongly affect fill-time prediction | - | same | F | same PMC10609424 abstract/results | 2026-10-23 | high |
| A113 | Washburn fill time with UF 8830S at 25 C | L = 20 mm: ~55,700 s (15.5 h); L = 10 mm: ~13,900 s (3.9 h) | s | gamma 25 mN/m (A111), theta 30 deg, h 22 um (A28), mu 22.12 Pa s (A104) | D | A110 formula | 2026-10-23 | low (shows why dispense is done hot) |
| A114 | effective viscosity implied by "within 60 min" | mu_eff <= ~1.4 Pa s (L = 20 mm), <= ~5.7 Pa s (L = 10 mm) | Pa s | 100 C stage CoW CUF (A93, A95) | D | mu = t gamma h cos theta / (3 L^2), t = 3600 s upper bound (whole-wafer-unit time), gamma, theta, h as A113 | 2026-10-23 | low (calibration knob for the animation) |
| A115 | Moldex3D example geometry | die 1.0 x 1.0 mm, gap 0.05 mm, bump pitch 0.087 mm, bump dia 0.056 mm, two-pass L-shape dispenser path | mm | Washburn front around bumps demo | F | Hsu et al. (A110 URL): "1.0 mm wide, 1.0 mm long and 0.05 mm high. The bump pitch is about 0.087 mm and the bump diameter is 0.056 mm"; "we define two pass as L -shape" | 2026-10-23 | high |
| A116 | cured underfill appearance | N/A (not found) | - | - | - | TDS lists uncured colour only | 2026-10-23 | - |

### 5.2 Animation-ready summary (jet dispenser + capillary front)

- Tool part: gantry-mounted jet head over the wafer (A91: 500 x 500 mm area, X/Y 1 m/s, Z 0.5 m/s); heated syringe
  72 C (A93) above a piezo/pneumatic jet valve; nozzle 50 um ID / 150 um OD (A96); stage heated 100-110 C (A93,
  A94). Needle variant: needle tip 76-127 um from die edge, 127-203 um above substrate (A98), substrate 70-80 C (A99).
- Kinematics: head traverses along die edge(s) in an I-line (single long edge) or L-shape (A100) while firing dots
  at up to 300 Hz (A97); dots ~100 um land, merge into a bead (fillet reservoir, A101); multiple passes with waits
  (A103: 2-3 min, then 5-7 min). Multi-die CoW: dispense one side first, the other side after the front reaches
  the far edge (A95 Method III).
- Front physics: Washburn x(t) (A110) with gamma 25 mN/m and theta 25-35 deg (A111), h = 22 um (A28). Use mu_eff
  ~1-6 Pa s (A114, derived) so a 20 mm die fills in tens of minutes at 100 C, consistent with A95; HUD shows the
  25 C TDS viscosity (A104) separately. Around bumps: front lags behind in bump rows (A115 demo geometry).
- Look: uncured CUF grey paste (A105); cured state colour N/A (A116; keep grey, slightly darker/glossier =
  assumption). Cure 150-175 C, 2 h (A106, A107).

---

## 6. Compression molding and post-mold cure

### 6.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A120 | molding tools in DB flows | APIC Yamada VCM-330MS / VCM-300 / WCM-300 / WCM330MS; TOWA CPM1080, Y-120 | - | CoW wafer and panel molding | F | ectc51687.2025.00027 p.2; ectc51909.2023.00155 p.3; ectc51529.2024.00322 p.3; 001c.129513 p.5; DB ectc51846.2026.00153-F1-s17 | 2026-10-23 (repo) | high |
| A121 | compression molding principle (cavity down, TOWA) | EMC dosed into wafer-shaped cavity (lower half); components on carrier held in upper half; mold closes, cavity evacuated, EMC pressed by moving mold onto carrier; in-mold cure; PMC in oven | - | TOWA wafer compression molding | F | 001c.129513 p.4: "an epoxy molding compound (EMC), an epoxy-based polymer filled with SiO2 particles, is dosed into a cavity in wafer form (lower half of the tool)"; "the mold is closed, the cavity is evacuated and the EMC is pressed into the cavity" | 2026-10-23 (repo) | high |
| A122 | bottom-chase kinematics (panel) | granular EMC pre-weighed, spread by jig into bottom chase cavity; carrier held by top chase; bottom chase moves up | - | panel compression molding | F | ectc32862.2020.00185 p.3 Sec. IV.A: "Pre-weighted granular mold material is dispensed uniformly using dispensing jig"; "Glass panel carrier with mold tape and dies is hold by top mold chase and bottom chase move up words" | 2026-10-23 (repo) | high |
| A123 | EMC charge mass rule | weight "calculated based on the panel size and required mold thickness" | - | same | F | ectc32862.2020.00185 p.3 | 2026-10-23 (repo) | high |
| A124 | release film placement and kinematics | film pulled taut between unwind and wind rolls over the movable lower mold; vacuum vent sucks film onto cavity surface; substrate held by vacuum on stationary upper mold | - | compression molding with release film | F | AGC patent US9613832B2, https://patents.google.com/patent/US9613832 (description of compression molding apparatus) | 2026-10-23 | high (patent example, not a specific tool) |
| A125 | release film material and thickness | fluororesin, ETFE particularly preferred; 16-75 um preferred (40-75; 50-60 for one-side texture) | um | same | F | US9613832B2: "preferably from 16 to 75 μm"; ETFE "particularly preferred, since the elongation at a high temperature is large" | 2026-10-23 | high |
| A126 | mold resin temperature range (patent) | 100-185, particularly 150-180 | C | same | F | US9613832B2 (WebFetch summary of claims/description) | 2026-10-23 | med |
| A127 | CoW compression mold, granular EMC | 294 kN; 140 C; 900 s; PMC 175 C 5 h | kN; C; s | TOWA CPM1080, 12 in | F | ectc51909.2023.00155 Table 7 (p.3): "Pressure (kN) 294 570 / Cure Temperature 140 120 / Cure time (s) 900 600 / Post Mold Cure 175°C, 5 h 150°C, 1 h" | 2026-10-23 (repo) | high |
| A128 | wafer MUF, liquid EMC | 570 kN; 120 C; 600 s; PMC 150 C 1 h | kN; C; s | APIC Yamada WCM-300 | F | same Table 7 | 2026-10-23 (repo) | high |
| A129 | solid EMC / LCMUF over-mold | 300 kN; 130 C 900 s (solid) / 120 C 600 s (LCMUF); mold 895 um; PMC 150 C 5 h / 1 h | kN; C; s; um | WCM330MS | F | DB ectc51529.2024.00322-F1-s04, -F2-s02, -F1-s05, -F2-s03 (p.4 Table V) | 2026-10-23 (repo) | high |
| A130 | panel granular EMC | 50 kgf/cm^2 (4.9 MPa); 150 C 420 s (optimized); 800 um mold | MPa; C; s; um | bottom-cavity panel tool | F | DB ectc32862.2020.00185-F1-s04 (p.3-5, Table 3) | 2026-10-23 (repo) | high |
| A131 | panel EMC (TOWA CPM1080) | 130 C, 600 s; 4.0 MPa on 320 mm panel; 7.0 MPa on 510 x 515 mm | C; s; MPa | panel FO | F | DB ectc51846.2026.00153-F1-s17 (p.3 Sec. III.A.3, Table II) | 2026-10-23 (repo) | high |
| A132 | EMC filler (wafer molding) | granular EMC A: 82 wt %, max filler 20 um, IMC 10 min @ 130 C; liquid B: 82 wt %, 10 um, 10 min @ 110 C; liquid C: 83.5 wt %, 5 um, 10 min @ 120 C | wt %; um | TOWA Y-120 study | F | 001c.129513 p.4 Table 1 | 2026-10-23 (repo) | high |
| A133 | MUF filler (HBM MR-MUF) | 77 % filler, 3 um max | wt %; um | LMC MUF | F | ectc51909.2023.00151 p.2: "77% filler content, 3 μm maximum size" | 2026-10-23 (repo) | high |
| A134 | EMC silica loading (generic) | ~70-85 wt % fused silica (crushed + spherical) | wt % | EMC formulations | E | US5434199A (search-result summary), https://patents.google.com/patent/US5434199 | 2026-10-23 | med |
| A135 | EMC colour | black (carbon black colourant ~0.1-0.5 %) | - | EMC | E | package composition breakdown (Lattice CSBGA material declaration, search-result summary), https://media.latticesemi.com/-/media/LatticeSemi/Documents/QualityAssurance/AE/CSBGA-Pbfree-Auwire100.ashx?la=zh-CN ; Hysol GR300S listed as "Black Epoxy Mold Compound" with 77 % filler, https://storefront.caplinq.com/products/gr300s | 2026-10-23 | med |
| A136 | mold-closing speed / gap-closure profile | N/A (not found) | mm/s | - | - | no tool spec or paper value found | 2026-10-23 | - |
| A137 | in-mold vacuum, pressure sensors | gap by proximity sensor, pressure by sensor; 6.5 MPa | MPa | panel compression mold | F | DB eptc59621.2023.10457652-F1-s03 (p.1, p.4) | 2026-10-23 (repo) | high |
| A138 | post-mold grind after molding | 200 um removed to expose dies (DAG810) | um | ectc51687.2025.00027 s06 | F | DB step (p.2 Sec. II.B) (fab-lane tool; listed here for continuity) | 2026-10-23 (repo) | high |

### 6.2 Animation-ready summary (compression mold chase)

- Geometry: two platens; upper (stationary) holds the CoW wafer/carrier face-down by vacuum; lower movable cavity
  block (wafer-shaped cavity, depth = target mold thickness, e.g. 800-895 um, A129-A130) lined with ETFE release
  film 50 um thick (A125) fed from unwind roll to wind roll across the lower mold (A124).
- Kinematics: (1) film indexes and is vacuum-sucked into the cavity (A124); (2) EMC charge (granules spread by jig,
  or liquid bead) placed in cavity, mass = rho x area x thickness (A123; EMC density N/A); (3) cavity evacuated,
  lower mold rises; gap closes; EMC melts and flows over dies (gap-closure speed N/A, A136: use template linear
  closure); (4) clamp hold 294-570 kN (A127-A129) at 120-150 C for 400-900 s (A127-A132); (5) open, film peels,
  wafer released; (6) PMC 150-175 C, 1-5 h (A127-A129).
- Look: uncured granular EMC = black granules (A135); liquid EMC = black viscous paste; cured = matte black slab
  (finish under ETFE film; mirror vs matte N/A). Filler: spherical silica, max 3-20 um (A132-A133).

---

## 7. Ball attach (flux print, ball placement, reflow)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A140 | BGA balls on 120 mm substrate | 0.5 mm; SAC (Sn-3.0Ag-0.5Cu) or LTS (Sn-58Bi) | mm | ectc51687.2025.00027-F1 s22 | F | ectc51687.2025.00027 p.3: "solder balls of 0.5 mm-diameter were attached on the bottom" | 2026-10-23 (repo) | high |
| A141 | BGA balls on 100 mm substrate | 600 um, 1 mm pitch; water-soluble flux; average height after attach 478 um | um; mm | ectc51909.2023.00155 | F | p.7: "After applying the water soluble flux on the bottom of the package substrate, solder balls of φ600 um were mounted and bonded"; "average height of the solder balls was 478 um"; p.2 Sec. II.B: "The bottom side has φ600 um solder balls in 1 mm pitch" | 2026-10-23 (repo) | high |
| A142 | package-to-board standoff after reflow | 444 | um | same | F | p.7: "The average height between the package and motherboard was 444 um" | 2026-10-23 (repo) | high |
| A143 | interposer-to-substrate standoff | 81 | um | same | F | p.7: "The average height between the interposer and package substrate was 81 um" | 2026-10-23 (repo) | high |
| A144 | Shibuya ball mounter range | SBM 350 (BGA), SBM 360 (wafer): 200-1000 um balls, +/-50 um; SBP662: balls up to 50 um, < 5 um accuracy | um | Shibuya | F | EPP Europe "Solder ball mounter for wafer and packaging applications", https://epp-europe-news.com/allgemein/solder-ball-mounter-for-wafer-and-packaging-applications/ ; Leuze "Assembly and inspection systems for solder balls up to 50 um" (search-result quotes) | 2026-10-23 | med |
| A145 | flux transfer method (SBM) | pin transfer with adjustable squeegee for flux | - | Shibuya SBM | F | EPP Europe page (search-result quote): "Using a pin-transfer technique ... An adjustable squeegee guarantees the transfer of a precisely defined amount of flux." | 2026-10-23 | med |
| A146 | ball mask hole size | <= 1.5 x ball diameter | - | ball array mask (patent) | F | ball mounting patent (search-result quote) "less than or equal to 1.5 times greater than the diameter of the solder balls"; https://patents.google.com/patent/US8302836 family | 2026-10-23 | low |
| A147 | micro-ball flux and placement (panel/wafer) | flat stencil flux printing, brush ball planting through stencil (55 um balls); horizontal brush with anti-static (70 um balls) | um | micro-ball mount | F | DB icep58572.2023.10129684-F2-s02/-s03; icep-iaac64884.2025.11002987-F1-s06/-s07 | 2026-10-23 (repo) | high |
| A148 | ball reflow | SAC305: peak 255 (single zone, printed paste balls); BGA reflow in N2 for Bi-Sn | C | various | F | DB tcpmt.2025.3614186-F1-s20; tcpmt.2025.3533388-F2-s05 | 2026-10-23 (repo) | high |

Animation summary: substrate flipped ball-side up on a vacuum pedestal; flux printed through a stencil or pin-
transferred (A145, A147); ball-mount head / mask with holes <= 1.5 x ball dia (A146) drops 500-600 um balls
(A140-A141) onto pads; reflow (Sec. 2) turns sphere into truncated sphere: 600 um ball -> 478 um height (A141).

---

## 8. Stiffener / lid attach (adhesive dispense, cure)

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A150 | stiffener | 2.0 mm thick; SUS430 or Cu; fixed with silicone glue | mm | 120 mm package | F | ectc51687.2025.00027 p.3: "a stiffener of 2.0 mm-thick was fixed on the substrate with silicone glue and cured at 130°C for 0.5 h" | 2026-10-23 (repo) | high |
| A151 | stiffener glue cure | 130 C 0.5 h (00027); 130 C 1 h (00155) | C; h | same | F | ectc51687.2025.00027 p.3; ectc51909.2023.00155 p.4 Sec. II.H "cured at 130°C for 1 hour" | 2026-10-23 (repo) | high |
| A152 | stiffener press-cure head | stiff press cure head, max 180 C | C | stiffener attach | F | DB ectc51906.2022.00108-F1-s03 (p.4 Fig. 6) | 2026-10-23 (repo) | high |
| A153 | lid thickness (CoWoS-class) | 2 | mm | CoWoS-L / CoWoS-S sim models | F | RESEARCH_SOTA_COWOS.md D7, line 127 (ectc51909.2023.00091; ectc51687.2025.00055) | 2026-10-23 (repo) | high |
| A154 | adhesive bead geometry (width, height, dispense speed), lid adhesive product | N/A (not found) | - | - | - | no public dispense spec found in this pass | 2026-10-23 | - |

Animation summary: dispense a silicone bead along the stiffener footprint (bead geometry template, A154), place
2.0 mm ring (A150), cure 130 C 0.5-1 h (A151). Lid: same with 2 mm lid (A153) plus TIM (out of scope here).

---

## 9. Organic substrate build-up (ABF, laser via, desmear, electroless Cu, SAP, solder resist, finishes)

### 9.1 Table

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A160 | ABF film structure | three layers: support PET, ABF resin, protective film | - | ABF | F | Ajinomoto Fine-Techno, https://www.aft-website.com/en/electron/abf : "Three-layer structure: Support medium (PET), ABF™ resin, and protective film." | 2026-10-23 | high |
| A161 | ABF PET cover thickness | 38 um PET on 10 um ABF | um | nanofiller ABF | F | DB ectc51687.2025.00359-F1-s01 (p.2 Fig. 2) | 2026-10-23 (repo) | high |
| A162 | ABF thicknesses used | 15 um GX92 (Meiki vacuum laminator); 5 um GX92P; 20 um GL-102; 30 um over embedded die; 3 um (DUV via work) | um | various | E | DB ectc51909.2023.00298-F1-s02 / -F2-s01; ectc51687.2025.00142-F1-s01; ectc51846.2026.00123-F1-s05; ectc51529.2024.00133-F1-s04 | 2026-10-23 (repo) | high |
| A163 | ABF vacuum lamination conditions | 100 C; 0.7 MPa then 0.55 MPa, 30 s each (two stage) | C; MPa; s | ABF over die/glass | F | DB ectc51687.2025.00076-F1-s04 (p.6 Sec. IV) | 2026-10-23 (repo) | high |
| A164 | ABF lamination over embedded die | 120 C; 0.55 MPa; 60 s; plus pre-press 100 C 1 MPa 5 s | C; MPa; s | 30 um ABF | F | DB ectc51846.2026.00416-F1-s09, -s07 | 2026-10-23 (repo) | high |
| A165 | ABF cure | 130 C 30 min + 170 C 30 min; or 100 C 30 min + 180 C 30 min | C; min | ABF / GX92 | F | DB ectc51687.2025.00076-F1-s05/-s06; ectc51846.2026.00416-F1-s10; itherm55376.2025.11235616-F2-s03/-s04 | 2026-10-23 (repo) | high |
| A166 | vacuum laminator models seen | Meiki (MVLP300), Nikko-Materials CV-300, Taisei VA-770A (roll) | - | lamination | F | DB ectc51909.2023.00298-F1-s02; ectc51846.2026.00416-F1-s04; ectc51846.2026.00153-F2-s03, -F1-s01 | 2026-10-23 (repo) | high |
| A167 | CO2 laser via limit | ~40 um minimum (9.3 um wavelength); IR lasers 60-80 um or greater | um | ABF microvias | F | ectc51529.2024.00133 p.1: "The vias are 40 μm in diameter and are directly drilled by a CO2 laser"; ectc51909.2023.00331 p.2: "microvias with a diameter of 60-80 μm or greater can be formed" (IR) | 2026-10-23 (repo) | high |
| A168 | UV-YAG (355 nm) via | ~5 um smallest; limited power/throughput | um | ABF | F | ectc51687.2025.00359 p.1: "A UV-YAG laser with a wavelength of 355 nm ... can form 5 μm diameter vias" | 2026-10-23 (repo) | high |
| A169 | ps UV laser drill (ESI CornerStone) | 355 nm, 5 ps, 80 MHz, 16 W source, beam ~6.5 um, percussion | nm; ps; um | ABF GX92P | F | DB tcpmt.2025.3610036-F1-s08 (p.4 Sec. IV.A) | 2026-10-23 (repo) | high |
| A170 | via taper | 40 um target: top ~42, bottom ~38 um (30 um dielectric); 72 deg taper (laser) | um; deg | microvia | F | ectc51687.2025.00378 p.4 Fig. 7: "Via top diameter is approximately 42 µm and via bottom diameter is approximately 38 µm"; ectc51687.2025.00076 p.4: "A 72-degree via cavity taper angle, created through laser ablation" | 2026-10-23 (repo) | high |
| A171 | wet desmear chemistry | swell in alkali (e.g. NaOH), etch in permanganate | - | via desmear | F | patent US9113547 (search-result quote): "swelling the walls of via ... using alkali solution such as sodium hydroxide, and them etching with highly reductive chemical such as permanganate based aqueous solution" | 2026-10-23 | med |
| A172 | dry (plasma) desmear | O2 + fluorinated gas, 300 s | s | ABF | F | DB ectc51687.2025.00359-F1-s03, -s10 (p.2 Sec. II.B.2) | 2026-10-23 (repo) | high |
| A173 | electroless Cu seed thickness | ~0.3 um (DuPont process note); 1 um (patent example); 0.15 um (paper) | um | SAP seed | E | DuPont Circuposit ADV 8550 page (search-result quote "Electroless copper thickness ~ 0.3µm"), https://www.pp.dupont.com/content/dupont/amer/us/en/products/electronic-materials-old/circuposit-adv-8550.html ; patent US9301399 ("thickness of the seed layer is 1 μm"); DB ectc51906.2022.00360-F1-s03 (0.15 um) | 2026-10-23 | med |
| A174 | SAP sequence and L/S | electroless seed -> resist pattern -> Cu plate in openings -> strip -> flash/seed etch; L/S ~12/13 um (patent); 5/5 um chemistry claim | um | SAP | F | US9301399 (search-result quote); MacDermid Alpha Systek SAP page (search-result quote "down to 5/5 µm line/space") | 2026-10-23 | med |
| A175 | SAP Cu thickness per layer | 4-8 um (5.7 um measured); 5 um RDL | um | build-up | F | DB ectc51687.2025.00142-F1-s02; 3dic63395.2024.10830178-F1-s14 | 2026-10-23 (repo) | high |
| A176 | solder resist (IC package dry film) | Taiyo AUS410 (PSR-800 AUS SR1): green, 20 +/- 2 um; exposure 500 mJ/cm^2 | um; mJ/cm^2 | package SR | F | Taiyo TDS URL https://www.taiyo-hd.co.jp/_cms/wp-content/uploads/2016/01/PSR800AUS-SR1-20um_TD_E.pdf (search-result quote; URL now serves HTML) | 2026-10-23 | med |
| A177 | solder resist thickness / openings in a TV | SR 18 / 17 / 17 um; top SR opening 50-53 um | um | 100 x 100 mm substrate | F | DB estc60143.2024.10712129-F5-s12 (p.3 Table IV) | 2026-10-23 (repo) | high |
| A178 | interposer pad finish | electroless Ni 2 um / Au 0.05 um | um | Si interposer pads | F | ectc51687.2025.00027 p.2 Table I | 2026-10-23 (repo) | high |
| A179 | ENIG / ENEPIG IPC thickness limits | N/A (not verified; IPC-4552B / IPC-4556 not read) | um | - | - | only secondary blogs found | 2026-10-23 | - |
| A180 | ABF colour / appearance | N/A (not found) | - | - | - | no primary description found | 2026-10-23 | - |
| A181 | CO2 laser drill machine geometry (galvo field, beams) | N/A (Mitsubishi GTF/GTW pages 404) | - | - | - | search snippets only: GTW5 optics "40 µm or less" holes; GTF series 4-beam | 2026-10-23 | low |
| A182 | substrate line/space and via (100 mm 2.5D TV substrate) | L/S 14/20 um; via dia 40 um; 100 x 100 mm, 1.6 mm thick | um; mm | ectc51909.2023.00155 substrate (Shinko) | F | ectc51909.2023.00155 p.2: "package substrates with L/S = 14/20 um and φ 40 um via was fabricated using build-up films by laminating on a core material" (OCR) | 2026-10-23 (repo) | high |

### 9.2 Animation-ready summary (build-up)

- Lamination: vacuum laminator = heated platens with diaphragm/flat press; ABF sheet (PET + resin + protective
  film, A160) is peeled (protective film), placed, vacuum-pressed at 100-120 C, 0.55-1.0 MPa, 30-60 s (A163-A164);
  PET removed after cure 130-180 C (A165). Thickness 15 um default (A162; 30 um over a cavity/die).
- Laser via: galvo-scanned spot; CO2 via >= 40 um (A167) for coarse vias; UV 5-15 um for fine (A168-A169). Taper
  from A170 (42 -> 38 um on 30 um, ~4 um diameter loss). Ablation = pulses removing resin to the Cu pad
  (KrF example ~0.5 um/pulse, DB ectc51687.2025.00359-F2-s02).
- Desmear: swell + permanganate wet bath (A171) or plasma 300 s (A172): smear removed, ABF surface roughened.
- Electroless Cu seed ~0.15-1 um (A173) conformal on via wall; dry film resist laminate/expose; electroplate 4-8 um
  Cu (A175) in openings; strip; flash-etch seed (A174).
- Solder resist: green dry film 20 um (A176-A177), openings over pads; finish: ENi 2 um / Au 0.05 um (A178).

---

## 10. EMIB / EMIB-T specifics

| ID | quantity | value / range | unit | applies to | kind | source + quote / locator | accessed | confidence |
|---|---|---|---|---|---|---|---|---|
| A190 | EMIB substrate flow | build-up to final layer -> cavity formation -> bridge placed in cavity, held with adhesive -> final build-up dielectric -> fine vias in bridge region, coarse vias elsewhere -> chip attach by TCB -> capillary underfill | - | EMIB | F | ectc.2016.201 p.6 Sec. III: "The bridge is placed in the cavity, held in place with an adhesive and the final layers of build-up dielectrics are applied followed by fine via formation in the bridge region and coarse via formation elsewhere." | 2026-10-23 (repo) | high |
| A191 | bridge size range; layers | 2 x 2 to 8 x 8 mm; up to 4 routing metal layers + pad; 2 um L/S; 2 um vias | mm; um | EMIB gen 1 | F | ectc.2016.201 p.5 Table II | 2026-10-23 (repo) | high |
| A192 | bridge thickness | thinned below 75 um (2016); "~50 um" thin bridges in top dielectric layers (2026) | um | EMIB | F | ectc.2016.201 p.6 Sec. III(b): "Bridge wafer thinning (below 75m)"; RESEARCH_SOTA_EMIB.md E10 (ectc51846.2026.00051 p.1) | 2026-10-23 (repo) | high |
| A193 | EMIB bump pitches | fine 55 um (gen 1), 45 um (gen 2); coarse 130 um | um | EMIB | F | data/interconnects.csv ectc.2016.201-a-i1 (55), -a-i2 (130) (p.5 Fig. 4(a) labels); RESEARCH_SOTA_EMIB.md E6 (55 -> 45) | 2026-10-23 (repo) | high (figure labels) |
| A194 | mixed-CD bump height control | "precise bump height control for mixed CD bumps" | - | EMIB | F | ectc.2016.201 p.6 Sec. III(e) | 2026-10-23 (repo) | high |
| A195 | fine via landing | "all the vias fully land on the bridge pads" | - | EMIB | F | ectc.2016.201 p.6 Sec. III(d) | 2026-10-23 (repo) | high |
| A196 | EMIB-T bridge attach | TSV bridge die solder-joined to cavity pads (cavity pad surface finish), underfilled, encapsulated by dielectric, direct vias to bridge pads | - | EMIB-T | F | ectc51687.2025.00051 p.3 Fig. 4, p.4 Sec. III.C; DB ectc51687.2025.00051-F1 s02-s06 | 2026-10-23 (repo) | high |
| A197 | EMIB-T panel-level bridge attach | panel 510 x 515 mm; bridge attach by panel-level TCB | mm | EMIB-T | F | ectc51846.2026.00051 p.1: "manufactured at panel scale (510 mm x 515 mm)"; p.3 Sec. II.A.ii: "EMIB-T panel level attach thermal compression bonding (TCB) tool accuracy" | 2026-10-23 (repo) | high |
| A198 | via-to-bridge-pad overlay | < 3 um (new scheme); POR up to ~6.4 um | um | EMIB-T 25 um | F | ectc51846.2026.00051 p.3: "a new via to bridge alignment scheme that meets <3 um overlay"; DB interconnect ectc51846.2026.00051-b-i2 | 2026-10-23 (repo) | high |
| A199 | EMIB-T FLI pitches | 45 / 40 (w/ TSV) / 36 / 25 um; EMIB25T bridge 3 x 18 mm | um; mm | EMIB-T | F | RESEARCH_SOTA_EMIB.md E7, E11, E13 | 2026-10-23 (repo) | high |
| A200 | bridge cavity process analog (academic) | 30 um dielectric laminated and cured; fs-laser half-cavity (min spot 6 um, 3 % of 5 W, 60 kHz); bonding material applied locally; chip placed face-up; 30 um encapsulating dielectric vacuum-laminated at min-viscosity temperature; 40 um microvias (42/38 um top/bottom) to pads | um; W; kHz | embedded chiplet in build-up (EMIB-like) | F | ectc51687.2025.00378 p.2-4 Sec. III.A-C; DB -F2-s06, -s09, -s11 | 2026-10-23 (repo) | high (not Intel process) |
| A201 | EMIB cavity depth, adhesive type/thickness, bridge placement tool, TCB conditions for top dies | N/A (not found) | - | - | - | Intel sources give flow only | 2026-10-23 | - |
| A202 | EMIB CUF across fine/coarse regions | void-free epoxy underfill "between fine and coarse pitch regions" | - | EMIB | F | ectc.2016.201 p.6; Fig. 7 | 2026-10-23 (repo) | high |

Animation summary (EMIB): substrate at the last-but-one build-up layer; laser-ablated rectangular cavity sized to
the bridge (2 x 2 to 8 x 8 mm, A191; depth = bridge + adhesive, N/A, A201); adhesive dot/film, bridge (<75 um,
~50 um, A192) placed face-up; ABF laminated over (Sec. 9); fine vias land on bridge pads (A195), coarse vias
elsewhere; mixed-pitch bumps 55/45 um over the bridge, 130 um elsewhere with equalised heights (A193-A194); top
dies by TCB (Sec. 1) then CUF (Sec. 5). EMIB-T: bridge with TSVs solder-attached by panel-level TCB to cavity pads
(A196-A197), underfilled, then encapsulated; via overlay < 3 um (A198).

---

## 11. Material appearance by state (render guide)

| material / state | appearance | basis |
|---|---|---|
| plated SnAg cap / solder paste | matte grey | A (paste: no source; plated: common knowledge, template) |
| liquid solder | mirror-like metallic, rounded (truncated sphere) | A67 model; look = A |
| solidified Pb-free solder | dull / frosty grey | A69 (med) |
| IMC layer (Cu6Sn5, Ni3Sn4) | thin scalloped band 2-3 um at interface (cross-section only) | A64-A66 |
| flux (fresh / residue) | translucent amber film | A86 (assumption), A85 N/A |
| CUF uncured | grey paste | A105 (high) |
| CUF cured | N/A; render grey, slightly darker | A116, assumption |
| EMC granules / liquid / cured | black; filled with spherical silica (max 3-20 um) | A132-A135 (med for colour) |
| release film | ETFE, ~50 um, translucent | A125 (material, thickness); translucency = A |
| ABF (with PET) | N/A colour; three-layer film | A160, A180 |
| solder resist (IC package dry film) | green, 20 um | A176 (med), A177 |
| ENi/Au pad | gold | A178 (finish), colour = A |
| Cu (plated, SAP) | copper; matte after desmear/seed | A |

## 12. Gaps (most important first)

1. Bond head / collet / tool-tip geometry and materials for any TCB tool (A29): no dimensioned public source.
2. Mold gap-closure speed and clamp ramp for compression molding (A136); EMC density; cured EMC surface finish.
3. Reflow oven heated length and zone lengths (A47): only overall 7.9 m.
4. Underfill surface tension and contact angle for CoW-class fine-filler CUF at dispense temperature (A111 is a
   board-level underfill at 60 C); temperature-dependent CUF viscosity (only 25 C TDS values).
5. Colours: ABF (A180), cured CUF (A116), flux residue (A85); EMC black and SR green are med confidence.
6. EMIB cavity depth, bridge adhesive (type, thickness), bridge placement and top-die TCB conditions (A201).
7. Laser drill tool geometry (galvo field, beams) (A181); IPC-4552B/4556 finish thickness limits (A179).
8. Lid / stiffener adhesive bead geometry and dispense speed (A154).
