# Routing reference: RDL interposers, fan-out, hybrid bonding, 3D stacks (R3)

Date: 2026-10-20. Author: reference agent R3 (DevLog-011 wave 1). Feeds `route` / `routing` specs in the family templates,
the M2 checklist (`fidelity_checklist.yaml`), M5 ranges and the M7 visual audit.

Sources: `data/stack_layers.csv`, `data/interconnects.csv`, `data/test_vehicles.csv`, `data/metrics.csv`,
`data/electrical_interfaces.csv`, `data/components.csv`, key-figure crops `references/<paper_id>/figures/key/*.png` (52
viewed, section 7), `references/<paper_id>/text.md` (context only). Family membership was computed with the
`Matcher` of `scripts/build_package3d.py` (snapshot 2026-10-20) and the `match_rule`s in `families.yaml`.

Conventions
- Values in um unless stated. `min / med / max` over DB rows with the row id of the extreme in brackets.
- Status tags: **R** = row whose TV matches that family (usable as `ref:`); **A** = row of another family (use as
  `analog:`); **E** = estimate read from a figure by eye (proportion or pixel ratio, +/-30 %), never a DB cell, must be a
  `template:` with the fig_id in `note`; **D** = derived arithmetic from cited cells; **N/A** = absent in the DB.
- "Pitch" for micro-bumps often exists only as `pitch_min_um` (design minimum); listed separately.
- Naming trap: in hybrid-bond papers "HBM" = hybrid bonding metal (bond pad) and "HBV" = hybrid bonding via
  (ectc51529.2024.00057, ectc51846.2026.00218). Not High Bandwidth Memory.
- Row ids are full ids (`<tv_id>-L..` layer, `<tv_id>-i..` interconnect, `<tv_id>-m..` metric, `<tv_id>-e..` electrical).

## 1. Archetypes (layer sequence top -> bottom)

### 1A. Organic RDL interposer (CoWoS-R; panel RDL interposers I-Cube R / 2.3D RDL; ETR / S-SWIFT; DNP glass-panel RDL)

Population: families cowos_r (32 TVs), samsung_i_cube_r (2), organic_interposer_peers (23), amkor_s_swift (1) + ETR
coupon ectc51906.2022.00218-b (unmatched by any family -> A everywhere).

| # | element | material (as written) | values (reported) | rows / notes |
|---|---|---|---|---|
| 1 | top dies (SoC, HBM) | Si | - | out of scope |
| 2 | micro-bumps + CUF | Cu pillar + solder, capillary UF | SoC min pitch 35 (min 35 / med 35 / max 45 over `pitch_min_um`); nominal pitch 24 / 40 / 150 (`pitch_um`); HBM 55 | min-pitch: ectc51529.2024.00049-a-i1, ectc51687.2025.00047-a-i1, ectc51687.2025.00026-a-i1 (35), ectc32696.2021.00125-a-i1 (40), ectc51687.2025.00090-a-i1 (45). Nominal: ectc51906.2022.00008-b-i1 (24, Si block to interposer), ectc51909.2023.00150-a-i1 (40 FPGA), -a-i2 (55 HBM2), -a-i3 (150 AI chip). HBM I/O pad 55: 001c.129747-c-i1. Diameter / height N/A |
| 3 | top bond pad + finish | Cu pad, ENEPIG | thickness, size N/A | ectc51909.2023.00150-a-L03 (ENEPIG), ectc51687.2025.00090-a-L03 (bonding pad layer, plating uniformity only) |
| 4 | fine RDL levels (repeat) | Cu (SAP or ETR) in low-k / low-Dk polymer, PM, PID, PI | L: 1 / 2 / 8 (n=40); S: 1 / 1.7 / 3.5 (n=34); CoWoS-R only: L 1.4 / 2 / 2 (n=14); levels 4 / 6 / 9 (n=13), CoWoS-R 4 / 8 / 9 | L/S 2/2 POR: ectc51529.2024.00049-a-L02 (9L), -b-L01 (8L), -c-L01 (7L), ectc51687.2025.00047-a-L01, ectc51687.2025.00026-a-L03, ectc32696.2021.00125-a-L03 (4L). 1.4/1.4 KY: ectc51687.2025.00047-b-L01. 1/1: 001c.129747-a-L03. 6L 2/2: eptc62800.2024.10909872-a-L03, ectc51687.2025.00090-a-L04 |
| 4a | fine Cu thickness | Cu | 2 / 2 / 3 (n=9) | 001c.129747-f-L01..L03 (2-3, model), tcpmt.2025.3599484-a-L01 (3, ETR), ectc51846.2026.00016-b-L01 (2). CoWoS-R itself: N/A ("thicker than Si interposer lines", ectc51529.2024.00049-a-L02 notes) |
| 4b | dielectric per level | polymer | 3 / 4 / 5 (n=3) | tcpmt.2025.3599484-a-L04 (3 below trace; 6.3 coated), 001c.129747-f-L04 (4, PI), ectc51846.2026.00016-b-L03 (5, PI). CoWoS-R: N/A |
| 4c | seed / barrier | Ti/Cu | 0.15-0.175 | tcpmt.2025.3599484-a-L02 (0.15), ectc51687.2025.00326-b-L04 (0.175, Ti 25 nm / Cu 150 nm); Ti barrier 0.05 tcpmt.2025.3599484-a-L03. Not drawable (< 1.5 px) |
| 5 | RDL vias | Cu filled, in PM / PID | CoWoS-R via CD 8, cap 11, via pitch 35, 3 stacked; KY via 3; peers 1.5 / 7.3 / 45 (n=17) | ectc51687.2025.00047-a-L02 (8 / 35 pitch), -a-i3 (CD 8, pad 11), -b-i3 (3), -c-i1 (5), -c-i2 (3); ectc51529.2024.00049-a-i3 (stacked, 8, path ~50 total_length); ectc51687.2025.00326-a-i1 (8, misalignment < 2); PID vias top/bottom 5.7/3.0, 7.8/4.9, 9.5/7.4: 001c.129747-b-i1..i3 |
| 6 | coarse / power level near C4 | Cu | "thick/wide power RDL (relative only)"; values N/A | ectc51906.2022.00008-a-L02 notes. No per-level coarse L/S in CoWoS-R rows |
| 7 | C4 via ("via on C4") | Cu | diameter 45 | ectc51529.2024.00049-a-i4 |
| 8 | UBM (C4 side, formed first in chip-last panel flow) | Cu | thickness N/A; PID undulation over UBM 0.5-2.5 | eptc62800.2024.10909872-a-L05, ectc51687.2025.00090-a-L06; undulation eptc62800.2024.10909872-c-m1..m7, ectc51687.2025.00090-a-m1..m7 |
| 9 | C4 + UF | Cu/solder bump | pitch 145 / 145 / 150 (n=5) | ectc51529.2024.00049-a-i2, ectc51687.2025.00047-a-i2, ectc51687.2025.00026-a-i2 (145), ectc51906.2022.00008-a-i3 (150) |
| 10 | landside IPD between C4 | IPD | count only | ectc51906.2022.00008-a-i4, ectc51529.2024.00049-a (fig ectc51529.2024.00049-f01) |
| - | total RDL stack | - | 21 (all layers, DNP panel) | 001c.147214-a-L02 (A for cowos_r). Excluded from per-level stats |
| - | interposer-to-substrate alternative | Cu pillar (S-SWIFT), large Cu posts (FPGA module) | N/A | ectc51906.2022.00218-a-i3; fig ectc51909.2023.00150-f01 |

### 1B. InFO_oS / chip-first wafer fan-out

Population: info_os (9 TVs), info_pop (1); chip-first wafer fan-out rows without a templated family (ectc51906.2022.00232,
ectc51909.2023.00266 (fan_out_panel extra_tvs), ectc51909.2023.00053, eptc56328.2022.10013262) -> A.

| # | element | values | rows / notes |
|---|---|---|---|
| 1 | dies + mold (chip-first, face down onto RDL) | thickness N/A | ectc32696.2021.00033-a-L01, -a-L02; itherm45881.2020.9190542-a-L03, -L04 |
| 2 | die pad -> RDL "Cu via" (thick, filled) | N/A | fig ectc51906.2022.00232-f06 (A) |
| 3 | fine RDL1-4 (D2D) | L/S 2/2 each; 4 fine levels (ectc32696.2021.00033-a) or 2 (itherm45881.2020.9190542-a) | ectc32696.2021.00033-a-L03..L06, -b-L01 (repeat 4); itherm45881.2020.9190542-a-L05, -L06 |
| 4 | normal-pitch RDL5 (bump side, "stress buffer") | L/S 5/5 | ectc32696.2021.00033-a-L07, -b-L02; itherm45881.2020.9190542-a-L07 |
| 5 | PM dielectric between RDLs | thickness N/A | ectc32696.2021.00033-a-L08 |
| 6 | RDL vias | stagger (reference) and stacked 3-4 tier; sizes N/A | ectc32696.2021.00033-a-i2 (stacked), -a-i3 (stagger); fig ectc32696.2021.00033-f05 |
| 7 | C4 (InFO to substrate) | pitch 130 (n=3) | itherm45881.2020.9190542-a-i1, ectc32696.2021.00033-a-i4, -b-i2 |
| 8 | D2D IO pitch (die pad to RDL) | 36 | ectc32696.2021.00033-a-i1, -b-i1 (`ic_type` unspecified) |
| - | RDL count variants | 3 (TV-1/TV-2) | ectc32696.2021.00033-c-L01, -d-L01, -e-L01 |
| - | Cu / dielectric thickness | N/A in info_os | analog: CoWoS-R uses the InFO process for its RDL (ectc51529.2024.00049 text Sec. IV.A, "Leveraging info process"), so 1A rows 4a/4b are the closest A; chip-first panel A: ectc51909.2023.00266-a-L02 (RDL 5 thick, 10/10) |

### 1C. Chip-last fan-out: FOCoS chip-last, FOPLP RDL-first, HPLT, chip-first panel (M-Series / 6-sided)

Population: fan_out_panel (54 TVs), ase_focos_chip_last (2), amkor_hplt (2). Two sub-flavours.

C1. Chip-last / RDL-first (FOCoS-CL, FOPLP 2.5D, HPLT, 2380-4505 3-RDL substrate), top (die side) -> bottom (ball/C4 side):

| # | element | values (min / med / max or listed) | rows |
|---|---|---|---|
| 1 | dies + mold (ground to die back) | EMC 400 | 2380-4505-2020.1.000042-a-L12 |
| 2 | die bumps (Cu pillar + SnAg) | pitch 60 / 90; dia 35; height 37 (Cu 37 / Ni 3 / SnAg 15 in fig) | 2380-4505-2020.1.000042-a-i1, -a-i2; fig 2380-4505-2020.1.000042-f07 |
| 2' | FOCoS-CL hybrid micro-bumps | small 45 pitch / 30 dia (D2D), large 150 pitch / 50 dia, L-S 100 | ectc51906.2022.00309-a-i3, -a-i1, -a-i2 |
| 3 | top pad + finish (die side) | Cu pad 8 thick, 35 dia; EPIG | 2380-4505-2020.1.000042-a-L02, -L01 |
| 4 | fine level (ML1, die side) | L/S 2/2, Cu 2.5 (measured 1.68 thick, 2.15-2.24 wide, 1.4-1.49 space) | 2380-4505-2020.1.000042-a-L04; fig 2380-4505-2020.1.000042-f04 |
| 5 | mid level (ML2) | L/S 5/5, Cu 2.5 (measured 2.15 thick) | 2380-4505-2020.1.000042-a-L06 |
| 6 | coarse level (ML3, ball side) | L/S 10/10, Cu 8 (measured 7.49 thick, 10.38 wide), ball pad 180 | 2380-4505-2020.1.000042-a-L08 |
| 7 | dielectrics (PID / PI / photo-dielectric) | 4.1 / 6.7 / 34 (n=20); typical 5-7 | 2380-4505-2020.1.000042-a-L03 (5), -L05, -L07 (6.5); ectc51906.2022.00309-a-L06 (5, x3); ectc.2019.00-29-a-L08 (4.1), -L12 (6.91); ectc32862.2020.00185-a-L03 (7); max is a 2nd EMC layer ectc51529.2024.00011-b-L03 |
| 8 | vias | 6 / 22 / 30 (n=7 `diameter_um`); FOCoS-CL 10; photo-dielectric 10 | ectc32862.2020.00185-a-i1 (30), 2380-4505-2020.1.000042-a-i3 (22), -i4, -i5 (30), ectc51906.2022.00309-a-i5 (10), ectc.2019.00-29-a-i2 (10), eptc53413.2021.9663896-c-i2 (6 at 20 pitch, 3 enclosure) |
| 9 | FOCoS-CL RDL | 3 RDL, min L/S 2/2 (2 levels carry 2/2 in D2D area); fine line between two 5 um passivation layers; total fan-out 30 (notes) | ectc51906.2022.00309-a-L07, -L06 |
| 10 | HPLT 6-metal RDL-first (glass panel) | M1-M4 Cu 5 (nominal), dielectric 5, CD M1 30 / M2 10 / M3 20 / M4 20; measured Cu 4.41-5.07, dielectric 1.76-3.97 | ectc51906.2022.00135-a-L05..L12; measured ectc51906.2022.00135-a-m14..m24 |
| 11 | UBM / ball pad | UBM 7 (die side CD 85, package side CD 110); planar UBM 11 / T-shape 8; solder-mask opening 245 | ectc51906.2022.00135-a-L03, -L13; ectc51906.2022.00140-a-L05, -b-L05; 2380-4505-2020.1.000042-a-L09 |
| 12 | C4 / balls | FOCoS-CL C4 130; panel balls 350 / 350 / 400 pitch, dia 200, height 154.7-180 | ectc51906.2022.00309-a-i4; 2380-4505-2020.1.000042-a-i6, ectc51906.2022.00136-a-i1, ectc32696.2021.00174-a-i2, ectc32862.2020.00185-a-i2 |

C2. Chip-first panel (M-Series, 6-sided protection, mold-first), die face up, top (ball side) -> bottom (die):

| # | element | values | rows |
|---|---|---|---|
| 1 | solder ball | pitch 350-400, height 180 | ectc51906.2022.00136-a-i1, ectc32696.2021.00174-a-i2 |
| 2 | UBM | 9 | ectc51906.2022.00136-a-L08, ectc32696.2021.00174-a-L08 |
| 3 | PM2 / PI2 repassivation | 7 / 9 | eptc59621.2023.10457909-a-L01 (7), ectc51906.2022.00136-a-L07 (9), ectc32696.2021.00174-a-L07 (9) |
| 4 | RDL | thickness 5 / 7 / 8; width 10-15 | ectc32862.2020.00185-a-L06 (5, 10/10), ectc32696.2021.00174-a-L06 (7, width 15), eptc59621.2023.10457909-a-L02 (8, model), ectc51906.2022.00136-a-L06 (15 wide) |
| 5 | PM1 / PI1 (via 1 to Cu stud) | 7 / 7.5 | eptc59621.2023.10457909-a-L03, ectc51906.2022.00136-a-L05, ectc32862.2020.00185-a-L03 |
| 6 | Cu stud through front mold | height 25 (+/-15); Gen 2 stud 12 dia / 20 pitch | ectc51906.2022.00136-a-L04, -a-i2; ectc51529.2024.00011-a-i1; eptc53413.2021.9663896-c-i1 |
| 7 | die + mold | mold 300 incl. die, die 250 (model) | eptc59621.2023.10457909-a-L04, -L05 |

### 1D. Bridge-in-mold RDL interposer (RDL part only; bridges are R2)

FOCoS-Bridge, S-Connect, I-Cube E, CoWoS-L RI. Top RDL -> mold with TMV / tall pillar -> bottom RDL -> C4/uBGA.

| element | values | rows |
|---|---|---|
| top FO-RDL | 10/10 (1 layer), 8/8 (2 layers), 5/5 (3 layers); PI passivation x3, via opening 10 | ectc51529.2024.00151-a-L04, -b-L08; ectc51687.2025.00095-a-L05 (8/8 x2), -a-L04 (PI x3), -a-i2 (10); ectc51687.2025.00158-a-L02 (5/5 x3) |
| CoWoS-L SC-RDL | front 1 level; back 6 levels L/S 11/11 | ectc51909.2023.00091-a-L05, -a-L07 (repeat 6); ectc51909.2023.00174-a-L03, -L06 (1 + 1) |
| micro-bumps to RDL | 50 / 55 / 55 | ectc51909.2023.00175-a-i1 (50 ASIC), -a-i2 (55 HBM), ectc51529.2024.00151-a-i1 (55) |
| through-mold vertical | TIV 50 dia / 100 pitch; tall Cu pillar 120-135 high, 260 pitch; die-embedded TMV 100 high | ectc51909.2023.00091-a-i2; ectc51687.2025.00095-a-i4 (120); ectc51909.2023.00175-a-i4 (135 / 260); ectc51529.2024.00321-a-i1 (100, A) |
| Cu stud on bridge | 5 high | ectc51909.2023.00175-a-i3 |
| C4 / uBGA | C4 130-150; uBGA 500 pitch, 200 high; BGA 1000 | ectc51687.2025.00158-a-i1, ectc51529.2024.00151-a-i4; ectc51909.2023.00091-a-i3, -a-i4 |

### 1E. Hybrid-bond stacks (SoIC, Foveros Direct, X-Cube HCB, generic D2W / W2W)

Population: soic (21 TVs), foveros_direct (20), samsung_x_cube (5), hybrid_bond_d2w (19), hybrid_bond_w2w (22). Unit
cell top -> bottom (F2F): top die Si -> top BEOL -> top metal (MZ / M3) -> HB via(s) -> HB pad -> bond interface ->
HB pad -> HB via(s) -> bottom top metal -> bottom BEOL -> bottom Si (with TSV if a further tier follows).

| element | values | rows |
|---|---|---|
| pitch D2W | 1 / 5.5 / 35 (n=28) | ectc51846.2026.00218-a-i4 (1) ... ectc51906.2022.00031-a-i1 (35) |
| pitch W2W | 0.3 / 0.75 / 6 (n=48 `cu_cu_hybrid`); SoIC W2W 0.2-0.4 (ic_type unspecified) | ectc51529.2024.00334-a-i2 (0.3), ectc51909.2023.00219-b-i1 (6); ectc51529.2024.00125-a-i1..i3 |
| pitch D2D / SoIC | SoIC1 9, SoIC4 3, SoIC_H 9 (3-9 range), InFO_PoP SoIC 10, SoIC_HBM model 36 | ectc51906.2022.00176-b-i1, -a-i1; vlsitechnologyandcir46769.2022.9830182-a-i1, -c-i1, -i-i1; ectc.2019.00095-a-i1 |
| pad size | D2W 0.5 / 2.25 / 5 (n=18); W2W 0.2 / 2 / 3 (n=11); dominant rule pad = pitch / 2 | pad=pitch/2: ectc51846.2026.00218-a-i1..i4, ectc51687.2025.00323-a-i1..i3, ectc51529.2024.00057-a-i1..i4, ectc51846.2026.00183-a-i1..i3, ectc51906.2022.00057-a-i1, ectc51529.2024.00396-a-i1, ectc51687.2025.00060-a-i1, ectc51846.2026.00024-a-i1, ectc51909.2023.00023-a-i1, ectc51909.2023.00178-a-i1. Exceptions: 15 / 35 (ectc51906.2022.00031-a-i1), 5 / 20 (tcpmt.2021.3104326-c-i1), 3 / 10 (ectc51687.2025.00060-b-i2), 0.226 / 0.4 (iedm45741.2023.10413829-a-i1) |
| unequal pads | top 200 nm vs bottom 300 nm at 500 pitch; 3 vs 5 at 10 pitch | iedm45741.2023.10413829-a-i7; ectc51687.2025.00060-b-i2 |
| pad thickness | 0.5 / 2 / 3.5 | tcpmt.2021.3104326-c-L05 (0.5), ectc51906.2022.00031-a-L04 (2, DBI layer), ectc51909.2023.00023-a-L05 (3.5) |
| HB via under pad | CD 0.5-0.6; depth 0.5; 4 vias/pad at 5 pitch, 1 at <= 3 pitch; 4 per 3 um pad, 2 per 2 um pad; 5 per DBI pad; 16 per pad (20 pitch) | ectc51846.2026.00218-a-L04, -a-i5; ectc51529.2024.00057-a-L04, -a-i6; ectc51909.2023.00023-a-L04, -a-i2 (count 5); tcpmt.2021.3104326-c-L04, -c-i2 (count 16) |
| routing metal under pad | 0.85-1.0 thick; line 2-12 | ectc51909.2023.00023-a-L03 (0.9), ectc51906.2022.00031-a-L03 (1, linewidth 10), tcpmt.2021.3104326-c-L02 (0.85, line 12), ectc51687.2025.00060-a-L04 (line 2) |
| bond dielectric | SiO2, TEOS, SiCN (Insepra), "DBI dielectric", C-Layer (SoIC-CS); interfacial SiOx 4.4-4.9 nm / 10 nm | ectc51909.2023.00219-a-L03, ectc51687.2025.00060-a-L05/-L06, ectc51846.2026.00130-a-L06, ectc51687.2025.00055-a-L02; ectc51909.2023.00190-a-L06, ectc51906.2022.00113-a-L06 |
| pad recess / protrusion | -2.2 ... +5.4 nm; 5-20 nm dishing | ectc51906.2022.00057-a-m1..m10; ectc51529.2024.00057-a-m5; ectc51529.2024.00021-a-m1..m4. Sub-pixel: draw flat |
| thinned tier Si | 2 / 50 / 200 (n=29) | ectc51687.2025.00097-a-L03 (2), ectc51529.2024.00218-a-L05 (3), ectc51529.2024.00057-a-L10 (9), ectc51906.2022.00031-b-L06 (50), ectc51909.2023.00023-a-L01 (200) |
| TSV (thinned tier) | dia 1 / 5 / 13 (n=13); depth 10 / 50 / 75; pitch 6 / 35 / 50 | 1 x 10 (ectc51529.2024.00057-a-i5), 2.5 @ 6 (ectc51529.2024.00218-a-i3), 4 @ 50 (iwlpc52010.2020.9375855-a-i2), 5 x 50 @ 35 (ectc51906.2022.00031-b-i3), 9 x 75 (vlsitechnologyandcir46783.2024.10631478-a-i3), 9 @ 15-16 (iedm19573.2019.8993637-a-i2), 7-13 test (iedm19573.2019.8993637-b-i1..i4) |
| TSV liner | SiO2 0.5; isolation 0.25 | vlsitechnologyandcir46783.2024.10631478-a-i3; ectc51529.2024.00218-a-m21 |
| TDV / TOV (through gap-fill oxide) | TOV 4 x 9 (A); TDV dims N/A | ectc51846.2026.00218-c-i1; iedm45625.2022.10019499-b-i2, ectc.2019.00095-a-i3 (no dims) |
| gap fill (D2W) | oxide; thickness N/A | iedm45625.2022.10019499-b-L06, -c-L01; 001c.129733-a-L05 |
| bond density | 12,000 /mm2 (SoIC 10 pitch); 100,000 /mm2 (3 pitch); 7.7M connections at 0.36 pitch | ectc.2019.00095-a-i1, ectc51906.2022.00176-a-i1, iedm45625.2022.10019499-b-i1 (`density_per_mm2`); ectc51529.2024.00128-a-i3 (count) |

Variants (same table, different columns):
- DBI multi-die (ectc51906.2022.00031-d, 8 dies): Cap die / 7 x Thru die (50 Si, TSV 5 x 50 @ 35) / Logic wafer; F2B
  bond lands the DBI pad directly on the revealed TSV end (-d-L05, -d-i2).
- Foveros (micro-bump F2F, not hybrid): micro-bump 50 / 25 dia (iedm19573.2019.8993637-a-i1), 36 / 18
  (vlsitechnologyandcir46783.2024.10631478-a-i1); base die 75 (iedm19573.2019.8993637-a-L04); package-side bump 110 /
  70 (vlsitechnologyandcir46783.2024.10631478-a-i2).
- X-Cube (micro-bump F2B): SRAM on thinned logic, TSV 4 @ 50 (iwlpc52010.2020.9375855-a-i2), Cu pillar 125, BGA 400
  (-a-i3, -a-i4); X-Cube HCB variant 4 pitch / 2 pad (ectc51909.2023.00178-a-i1).
- QMC / Foveros Direct multi-layer: base chiplets in oxide fill with TDVs, top chiplets HB at 3 pitch, support Si on
  top (iedm45625.2022.10019499-b-L02..L06, fig iedm45625.2022.10019499-f05).

### 1F. HBM stack (core-die TSV + micro-bump or HCB columns)

Population: hbm_stack (18 TVs). Sparse.

| element | values | rows |
|---|---|---|
| top memory die | thick (relative); thickness N/A | ectc51909.2023.00151-a-L01 |
| core dies | 7-8 x (8Hi), 12, 16H; thickness 58 | ectc51909.2023.00151-a-L02 (repeat 7), ectc51909.2023.00179-a-L01 (58, repeat 8), ectc51529.2024.00021-a (16H) |
| chip-to-chip gap (micro-bump, MR-MUF) | 15 | ectc51909.2023.00151-a-i1 (`height_um` = gap) |
| micro-bump pitch | 36 (model) | vlsitechnologyandcir46769.2022.9830182-j-i1 |
| HCB / HBI Cu pad | dia 10; HCB pitch 6 (pad 3) in C2W HCB study | ectc51909.2023.00179-a-i1; ectc51846.2026.00024-a-i1 |
| core-die TSV | dims N/A (drawn only) | ectc51909.2023.00151-a-i2 |
| base (logic) die + bottom bumps | N/A | ectc51909.2023.00151-a-L04 |
| A for missing dims | TSV-middle 5 x 50 (ectc51906.2022.00179-b-i5, -c-i1), 3 x 50 @ 7 (ectc51906.2022.00179-d-i2); TC-NCF micro-bump 25 pitch, Ni 3 + SnAg 9 (ectc51529.2024.00064-a-i1); DBI TSV 5 x 50 @ 35 (ectc51906.2022.00031-b-i3); HBM-like die 50 x 10 (tcpmt.2025.3614186-a) | all A |

## 2. Via styles

### 2.1 RDL via stacking

| style | papers / evidence | fig_ids |
|---|---|---|
| stacked, filled, T-profile (via stem + pad cap per level) | CoWoS-R POR 3 stacked vias (ectc51529.2024.00049-a-i3); FOCoS-Bridge (ectc51529.2024.00151-a-i3, -b-i3; ectc51687.2025.00095-a-i3); FOPLP 3-layer stacked via-pads (ectc51846.2026.00008-a-i2) | ectc51687.2025.00095-f04 (bottom), ectc51529.2024.00151-f01 (D), ectc51846.2026.00008-f03 |
| staggered, filled (offset one pad per level) | FOCoS (ectc51687.2025.00095-a-i3 "staggered and stacked"); FOCoS-CL "stacked or staggered" (ectc51906.2022.00309-a-i5); InFO "typical stagger via reference" (ectc32696.2021.00033-a-i3) | ectc51687.2025.00095-f04 (top), ectc32696.2021.00033-f05 |
| staggered, conformal (cup / U-shaped, RDL plated into the opening, not filled) | chip-first wafer FO (ectc51906.2022.00232), HPLT RDL-first (ectc51906.2022.00135), early panel (ectc.2019.00-29) | ectc51906.2022.00232-f06, ectc51906.2022.00135-f01, ectc.2019.00-29-f01 |
| stacked pad-less (ETR, dual damascene-like single exposure) | S-SWIFT 4-level, 2 CD (ectc51906.2022.00218-b-i1); tcpmt ETR 4-stacked 2 and 5 (tcpmt.2025.3599484-a-i2, -a-i3); 2-stacked 20 (-a-i4) | ectc51906.2022.00218-f02, tcpmt.2025.3599484-f01 |
| InFO stacking via2 (three parallel vias per level) | ectc32696.2021.00033-f; IL slightly better than stagger (ectc32696.2021.00033-f-e3) | ectc32696.2021.00033-f05 |

### 2.2 Via taper (bottom / top)

| via | top | bottom | depth | ratio | rows |
|---|---|---|---|---|---|
| PID positive tone | 5.7 / 7.8 / 9.5 | 3.0 / 4.9 / 7.4 | N/A | 0.53 / 0.63 / 0.78 (D) | 001c.129747-b-i1..i3 |
| ETR via (S-SWIFT) | 3.15 / 3.72 / 4.9 / 7.26 | 1.64 / 2.31 / 3.29 / 5.31 | 5.66 / 6.63 | 0.52-0.73 (D) | ectc51906.2022.00218-b-i2..i5 |
| ETR single via | 3.2 | 1.5 | N/A | 0.47 (D) | tcpmt.2025.3599484-a-i1 |
| FOPLP PID | 22-17 / 30-25 as written (top/bottom assignment not stated) | - | N/A | 0.77 / 0.83 (D) | 2380-4505-2020.1.000042-a-i3..i5 notes |
| HB via | trapezoidal in SEM | N/A | 0.5 | N/A | ectc51846.2026.00218-a-i5 notes |
| W2W via-last TSV (thin tier) | tapered, wide at backside | 2.0-3.0 | 3 | N/A | ectc51529.2024.00218-a-i3; figs ectc51529.2024.00218-f01, -f02 |

### 2.3 Via vs line width, pads, UBM

- CoWoS-R: via CD / line = 8 / 2 = 4; cap / line = 11 / 2 = 5.5 (D, ectc51687.2025.00047-a-i3, -a-L01). KY: 3 / 1.4
  (ectc51687.2025.00047-b-i3, -b-L01); pad 5 at 1.4/1.4 (ectc51687.2025.00047-e-m7).
- SAP capture pad 15 for 10 via at 50 pitch; ETR pad-less 10 via (tcpmt.2025.3599484-b-i1, -a-i5).
- Panel: via opening 10 on RDL 8/8 (ectc.2019.00-29-a-i2, -a-L05); FOPLP via 22-30 on 2/5/10 lines (2380-4505-2020.1.000042).
- M-Series: 15 via contact on a 30 Cu stud (fig eptc53413.2021.9663896-f02, caption values, E-tag if used); Gen 2: via
  6 / stud 12 / pitch 20 (eptc53413.2021.9663896-c-i1, -c-i2).
- UBM: 7 (HPLT, CD 85 / 110), 9 (6-sided panel), 11 planar / 8 T-shape (chip-last FOPLP), 50 pad (ectc.2019.00-29-a-i3).
  T-shape UBM: stem through lower PID, wider cap above (fig ectc51906.2022.00140-f04).

### 2.4 Hybrid-bond pad over via; TSV / TDV landing

- Pad on 1-4 small vias on a wider top-metal line (cross / "I" shape in section): ectc51846.2026.00218-f01,
  ectc51687.2025.00323-f01, ectc51529.2024.00057-f07, ectc51909.2023.00023-f01.
- Sub-micron W2W: pad and via merge into a straight column (via-to-via bonding): iedm45741.2023.10413829-f01,
  ectc51846.2026.00187-f01 (150 CD, 300 pitch), ectc51909.2023.00190-a-i2..i8.
- TSV lands on the bottom of the top metal (MZ) through an oxide window; TSV top meets the backside HB pad directly:
  ectc51529.2024.00057-f06 (Ox bottom / Ox top labels).
- DBI F2B: DBI pad (wider) bonded straight onto the revealed TSV end; RDL pad above TSV on the front: ectc51906.2022.00031-f01.
- TOV / TDV: Cu through gap-fill oxide stopping on SiCN (ectc51846.2026.00218-f03; 4 x 9, ectc51846.2026.00218-c-i1);
  QMC TDVs from top-chiplet HB layer down to package bumps through oxide beside base chiplets (iedm45625.2022.10019499-f05).
- Foveros base die: TSV pairs/clusters share one package-side bump; TSV lands via redundant vias under thick upper Cu
  (iedm19573.2019.8993637-a-i3 notes, -a-L03 notes; fig iedm19573.2019.8993637-f02).
- HBM: TSV column runs through each core die and lands in the micro-bump pad above/below (fig
  ectc51909.2023.00151-f01, ectc51529.2024.00021-f01).

## 3. Routing usage

### 3.1 Level roles

| archetype | signal levels | plane levels | rows / figs |
|---|---|---|---|
| CoWoS-R | 2/2 traces both short D2D and long chiplet links; "thick/wide power RDL" | power RDL (relative) | ectc51906.2022.00008-a-L02 notes; fig ectc51906.2022.00008-f05 (schematic: multi-level line bands under the HBM-chiplet and chiplet-chiplet spans) |
| I-Cube R panel RDL | 6 layers; inner layers SSGSS (signal-signal-ground-signal-signal) | G level(s) in the middle | eptc62800.2024.10909872-a-L03 notes, -a-e1 |
| InFO_oS | RDL1-4 fine 2/2 for D2D; RDL5 5/5 for external connection and stress buffer | PDN model: RDL1/3/5 PWR, RDL2/4 GND (simulation case) | ectc32696.2021.00033-a-L03..L07; ectc32696.2021.00033-f-L01..L05; fig ectc32696.2021.00033-f06 |
| FOCoS-CL | 3 RDL; 2 levels carry 2/2 in the D2D area; bottom level wide traces only | N/A | ectc51906.2022.00309-a-L07; fig ectc51906.2022.00309-f07 |
| FOPLP 2.xD | RDL L1 fine lines AP-HBM, avg length 4 mm, "dozens of lines" | N/A | ectc51909.2023.00268-a-L01 |
| FOPLP 3-RDL substrate | ML1 2/2 (die side), ML2 5/5, ML3 10/10 (ball pads) | N/A | 2380-4505-2020.1.000042-a-L04, -L06, -L08 |
| UCIe RDL model | GSG and SSG at 1/1 (3 thick) over 4 PI over ground plane; SSS 2/3.5 fails spec | ground plane 2-3 thick | 001c.129747-f-L01..L06, -f-e1..e3 |
| hybrid bond | near-zero fan-out, direct vertical routing pad-to-pad | power planes in thick top metals; MLVs skip power planes to land on lower metal at Tx/Rx | ectc32696.2021.00166-c-i1 notes, fig ectc32696.2021.00166-f07; fig ectc51687.2025.00009-f02 |

### 3.2 D2D lanes in RDL interposers (numbers)

| quantity | value | rows |
|---|---|---|
| line density, CoWoS-R POR (2/2, via 8 / cap 11) | > 1100 lines/mm | ectc51529.2024.00049-a-m1, ectc51687.2025.00047-a-m3 |
| line density, CoWoS-R KY (1.4/1.4, via 3) | > 2200 lines/mm | ectc51687.2025.00047-b-m5 |
| layers for 1000 lines/mm at 35 via pitch | 7 (2/2, 11 pad); 4 (1.4/1.4, 5 pad) | ectc51687.2025.00047-e-m6, -e-m7 |
| layers needed, HBM (>= 5 mm) | 7 (2/2), 5 (1.6/1.6) | ectc51687.2025.00047-e-m1, -e-m2 |
| layers needed, UCIe (<= 2 mm) | 6 (2/2), 4 (1.6), 3 (1.4) | ectc51687.2025.00047-e-m3..m5 |
| per-layer line density | 1000 / 7 = ~143 lines/mm/layer (2/2, 11 pad, 35 pitch); 1000 / 4 = 250 (1.4/1.4, 5 pad) | D from ectc51687.2025.00047-e-m6, -e-m7 |
| traces between two vias at 50 pitch | SAP 2/2: 8; ETR 2/2: 9; ETR 2/1: 12 | tcpmt.2025.3599484-b-i1, -a-i5 notes; fig tcpmt.2025.3599484-f02 |
| SoC D2D gap | 150 | ectc51529.2024.00049-a-c1 (`gap_um`) |
| die-to-HBM line length | 6000 (D2D lines: "hundreds of um") | ectc51529.2024.00049-e-m14 |
| HBM channel studied | 6.5 mm, L/S 1.4-2.0, 8-10 Gbps | ectc51687.2025.00047-d-e1, -d-e2 |
| I-Cube R PHY wiring | 2/2, max 5 mm; UCIe x32 | eptc62800.2024.10909872-a-e1, -a-e2 |
| UCIe x64 at 32 Gbps on 9 RDL | 64 lanes | ectc51529.2024.00049-a-e1 |
| InFO_oS D2D IO pitch | 36; > 60,000 I/O through inter-chip RDL daisy chains | ectc32696.2021.00033-a-i1 notes |
| ubump-to-C4 vertical path | ~50 (3 stacked vias) | ectc51529.2024.00049-a-i3 (`total_length_um`, approx) |
| hybrid-bond analysis | 1 um routing pitch on 2 interposer layers, 2000 IO/mm (assumed in analysis) | ectc32696.2021.00166-e-L01 |

Line-density curve vs L/S for 3-6 layers: fig ectc51906.2022.00008-f05 (b) (read-off values not in DB; E only).

## 4. Visual description of real cross-sections (for the renderer)

Proportions are E (eye estimates from the crops) unless a DB value is cited.

RDL interposer (organic, CoWoS-R class)
- ectc51687.2025.00090-f01 / eptc62800.2024.10909872-f01 (Samsung 6-layer panel RDL, SEM, 50 um bar): from top: a
  T-shaped bonding pad (wide flat cap ~4x the stem width, stem down to the level below), then alternating full-width
  wide straps (plane-like) and one level of a dense row of 2 um square line sections (pitch ~4, i.e. 2/2), then more wide
  straps. Line sections are near-square (aspect ~1:1, slightly rounded top). Vertical spacing between metal levels
  ~2-3x the 2 um line height. Dielectric reads uniform dark; no visible interfaces between dielectric layers.
- ectc51687.2025.00047-f01 (CoWoS-R scheme): one PM layer with two wide via caps at 35 pitch and 4 line sections between
  them at 2/2; caps sit on a trapezoid via (wider at top). Use as the canonical unit cell for the via-row / line-row
  interleave.
- 001c.129747-f01 (DNP 5-metal RDL on glass, SEM): top: micro-bump pads as thick mushroom pads (cap wider than stem)
  on a thick top level; directly under each pad a group of 1.5/1.5 fine lines embedded in a thin inorganic-capped layer;
  below: 3 full-width thin levels (planes) separated by dielectric ~2x metal thickness; glass carrier at bottom.
- ectc51906.2022.00218-f01 (S-SWIFT, ASIC and HBM sides): proportions top-down: chip / micro-bump (~2 units) / 4L RDL
  (~1 unit, 4 thin dashed levels, wide pads under each bump, fine dashes under HBM) / Cu pillar to substrate (~4.5 units,
  barrel slightly wider than its pad, solder at bottom) / substrate pad. The RDL is the thinnest band in the picture.
- ectc51906.2022.00218-f02 and tcpmt.2025.3599484-f02 (ETR): embedded traces are U-shaped (flat top, rounded bottom),
  4 identical rows; stacked pad-less vias form a straight column of stacked trapezoids (each wider at top). SAP trace
  is rectangular with rough sidewalls; ETR trace rounded bottom (tcpmt.2025.3599484-f03).
- ectc51909.2023.00150-f01 (FPGA on organic interposer on build-up substrate): Cu-pillar micro-bumps in a dense row;
  a thin multi-dash RDL band under them; then thick Cu posts (~3-4x bump width) through the interposer body down to
  very wide pads joined by solder to the build-up substrate pads.

InFO / chip-first wafer fan-out
- ectc51906.2022.00232-f06 (3-layer chip-first RDL, SEM): die pad -> thick filled "Cu via" dome; RDL1-RDL3 are thin
  (conformal-plated) lines; each inter-level via is a U-shaped cup of the upper RDL plated into the dielectric opening
  (not filled), vias staggered (each offset ~1-2 cup widths from the one above); RDL3 lands on a wide C4 UBM, C4 bump
  below. Line thickness ~1/4 of the inter-level spacing.
- ectc51906.2022.00232-f01: RDL band is a very thin layer under mold and die (~1/10 of the C4 height); C4 Cu pillars
  in underfill below.
- ectc32696.2021.00033-f05 (schematic): stagger via = pads offset left/right alternately; stacking via1 = one column;
  stacking via2 = 3 parallel via columns per level, S and G pads alternate along the chip edge.

Chip-last / panel fan-out
- ectc51906.2022.00309-f01 / -f06 / -f07 (FOCoS-CL, SEM): 3 RDL levels in passivation; level 1 and 2 show groups of 4
  fine line sections (2/2) alternating with wider traces (~4-5x fine width), level 3 only wide traces and small via
  stubs. Micro-bumps (two sizes, large / small dia 50 / 30 = 1.67, D: ectc51906.2022.00309-a-i1, -a-i3) sit on pads on top of the RDL; C4 bumps below are ~2x the small
  micro-bump width and taller; C4 has a flat pad (UBM) at its top on the RDL bottom.
- ectc51687.2025.00095-f04 (FOCoS, SEM): filled vias with T-profile: stem width ~0.45x pad width, stem height ~= pad
  thickness. Top image: staggered (each level shifted by ~half a pad); bottom: stacked straight columns.
- 2380-4505-2020.1.000042-f04 (FOPLP 3-RDL, labelled SEM): ML1 2.2 wide x 1.68 thick, rounded-top near-squares; ML2
  5.1 wide x 2.15 thick slabs; ML3 10.4 wide x 7.49 thick domed slab. Coarse level is ~4x thicker than fine.
- ectc51906.2022.00135-f01 (HPLT 6-layer RDL-first, labelled SEM): 4 Cu levels ~4.4-5.1 thick with thin dielectric
  1.8-4.0 between; vias appear as downward kinks/steps of the conformal line (no separate pillar); bottom UBM 8.2 thick
  is the thickest slab.
- ectc.2019.00-29-f01 (RDL-first on glass, labelled SEM): RDL#1 + UBM 5.98 thick, steps down through dielectric #1
  (6.91); RDL#2 7.97 thick on dielectric #2 (4.10); conformal step via.
- ectc51846.2026.00008-f03 (FOPLP chip-last, SEM): 3-level stacked via-pads, each an I-beam (wide pad + narrow neck);
  one pad bridges sideways to the next stack.
- ectc51909.2023.00266-f01 (chip-first panel, 100 um bar): solder ball (~250-280 wide, E from bar) on a UBM with a cup into
  the top passivation; 5 thin RDL levels of long dashes; Cu studs through filled mold to the Si die below.
- eptc53413.2021.9663896-f02 (M-Series): 30 wide Cu stud in EMC, 15 via contact landing on it, RDL above (caption values).

Through-mold vertical (bridge-in-mold interposers)
- ectc51687.2025.00095-f05: tall Cu pillar with straight vertical sidewalls through filler-laden mold (fillers visible
  as spheres); RDL pad on top, passivation step, C4 solder cap below. Pillar width ~0.6-0.7x the visible mold
  thickness (E; crop may cut the pillar).
- ectc51909.2023.00175-f01 (S-Connect): tall Cu pillars (135 high, ectc51909.2023.00175-a-i4) with micro-bumps above and
  C4 below; connect die with 5 um Cu studs (ectc51909.2023.00175-a-i3) between the die and a single thin RDL.
- ectc51529.2024.00151-f01 (FOCoS-Bridge): schematic = SoCs on micro-bumps over 2-RDL, bridge in bottom mold with tall
  Cu pillars both sides, C4 at the bottom; SEM D shows micro-bump over a stacked via column through 2 RDL.
- ectc51687.2025.00048-f02 (I-Cube E): Cu pillar + solder on an RDL pad; tapered via (narrowing downward) through the
  RDL dielectric to a Cu post in filled mold below; the dielectric surface undulates over the pads.
- eptc56328.2022.10013262-f05: tall through-mold Cu post with T-flared ends, between thin top and bottom RDL.

Hybrid bonding
- ectc51846.2026.00218-f01 (D2W, 5/3/2/1 pitch, SEM): symmetric cross: metal line (wide) / via(s) / HB pad / interface /
  HB pad / via(s) / metal line. At 5 pitch 2 vias visible per pad, at <= 3 pitch 1 via. Pad thickness ~= via height;
  pad width = pitch/2 (ectc51846.2026.00218-a-i1..i4). Interface line barely visible (nano-voids only).
- ectc51909.2023.00023-f01 (DBI 3.5 / 7, SEM): pad is a near-cube (3.5 wide x 3.5 tall, slightly tapered sidewalls);
  3 tiny vias (0.5 tall) under each pad onto a 0.9 RDL slab that spans both pads; isolation oxide below.
- ectc51529.2024.00057-f07 / -f06 (3-tier W2W, FIB-SEM): Die 3 / Die 2 / Die 1. Each interface: MZ line, 2 HBV, pad
  pair. Die 2 is thin (9 Si) with a single 1 x 10 TSV running from the top MZ (oxide window) to the bottom HB pad;
  TSV = 1/3 of the 3 um pad (D: ectc51529.2024.00057-a-i5, -a-i1).
- ectc51529.2024.00218-f01 (WoWoW 1 um pitch, STEM, 5 um bar): rows of small pads (hexagonal blobs) at both interfaces;
  via-last TSVs through the 3 um middle Si are tapered (wide at backside), ~2.5 wide, every ~6 (6 pitch).
- iedm45741.2023.10413829-f01 (400 nm pitch, TEM): M1T-ViaT-PADT | PADB-ViaB-M1B appear as continuous barrel columns;
  pads only slightly wider than vias; column pitch = 0.4.
- ectc51687.2025.00323-f01 (F2B CoW 3.0 / 1.4 / 1.0 pads): pads become relatively taller as pad size drops; vias ~1/3-1/2
  of pad width at 3.0, ~= pad width at 1.0.
- iedm45625.2022.10019499-f02 (3 um pitch): HB pad (trapezoid, wider top) over a narrower HB via over top metal.
- ectc51909.2023.00178-f01 (X-Cube HCB, 4 um bar): wide Cu pads on both sides, pad pair taller than wide, single via
  stub below the bottom pad.
- ectc51906.2022.00031-f04 / -f01 (8-die DBI, SEM): straight TSV columns aligned through all 7 Thru dies at 35 pitch;
  each tier boundary is a thin dark DBI band; at the bond a wider DBI pad sits directly on the TSV end (T-junction), RDL
  pad wider still above.
- iedm19573.2019.8993637-f01 (Foveros F2F, SEM): very dense micro-bump row (50 pitch) between top die and base die;
  base die thin with TSV pairs every ~7-8 micro-bump pitches (E); each TSV pair lands on one package-side pad; large
  bottom bumps/balls at ~10x the micro-bump pitch (E).

HBM stack
- ectc51909.2023.00151-f01 (8Hi MR-MUF, SEM 400 um and 10 um bars): 8 horizontal rows of micro-bumps (dashes) at each
  die gap; vertical TSV lines through all dies aligned with selected bump columns. Zoom: Cu pillar + solder + pad on
  top, MUF with spherical fillers around; TSV enters the bottom pad, TSV width ~1/5-1/4 of the pillar width (E).
- ectc51909.2023.00179-f01 / ectc51529.2024.00021-f01: micro-bump joint (pillar + solder bulge, gap fill) vs gap-less
  Cu/Cu HCB pad joint on the TSV; stack height reduced 15 % (caption). HCB pad width ~2x TSV width (E).
- vlsitechnologyandcir65830.2026.11577576-f01 (12-layer micro-bump stack): 12 bump rows, central field of TSV columns,
  sparse bumps at the edges.
- ectc51909.2023.00151-f03 (schematic): Top (memory, thicker) / 7 x Core / Base (logic, wider); TSV bundle in the
  center column through Core dies; micro-bumps in every gap; bottom bumps under Base only.

## 5. Structural / visual checklist per archetype (M2 items, M7 criteria)

Organic RDL interposer (cowos_r; RDL part of cowos_l)
- micro-bump field + CUF on top pads; pads wider than bump stem
- >= 4 RDL Cu levels (CoWoS-R 4-9) in polymer, fine L/S 2/2 (1.4/1.4 variant) drawn as rows of near-square sections
- filled via with cap (8 CD / 11 cap) at 35 via pitch; vias stacked under micro-bumps (3-stack)
- at least one plane / wide-strap level (power RDL) distinct from signal levels
- via-on-C4 (45) and Cu UBM at the bottom; C4 145-150 pitch with UF
- D2D lane band in the die gap (150) on the fine levels; HBM lanes ~6 mm long
- landside IPD between C4 (if the family shows it)
- RDL total thickness thin vs micro-bump and C4 heights (S-SWIFT picture)

InFO_oS / chip-first wafer FO
- dies face-down in mold, die pad -> thick Cu via into RDL1
- 4 fine levels 2/2 + 1 normal 5/5 nearest the bump side
- staggered conformal (cup) vias as the default; stacked column option
- PWR / GND plane alternation on some levels (PDN)
- C4 130 pitch on UBM at the bottom, underfill to substrate
- no interposer substrate between RDL and C4 (RDL directly on C4)

Chip-last FOCoS / FOPLP
- dies flip-chipped (bumps 45-150, two sizes in FOCoS-CL) onto top pads of a pre-built RDL
- fine level(s) nearest the die (2/2), coarse levels toward the ball side (5/5 -> 10/10, thicker Cu)
- dielectric 5-7 per level, vias 10-30 (larger than RDL interposer vias)
- stacked or staggered T-profile filled vias
- UBM 7-11 (planar or T-shape) and solder-mask opening at the bottom
- C4 130 (to substrate) or balls 350-400 (to board)
- mold over dies ground to die backside

Chip-first panel (fan_out_panel M-Series / 6-sided)
- die face up, Cu studs (~25 high) through front mold
- PM1 (7-7.5) / RDL (5-8 thick, 10-15 wide) / PM2 (7-9) / UBM (9) / ball (350-400 pitch)
- via 1 lands directly on stud (adaptive patterning)

Bridge-in-mold RDL interposer (ase_focos_bridge, amkor_s_connect, samsung_i_cube_e, cowos_l)
- top RDL 1-3 levels (5/5-10/10 FOCoS; front 1 level CoWoS-L)
- mold layer with straight-wall tall Cu pillars / TIV (50 dia, 100 pitch CoWoS-L; 120-135 high)
- bridge Cu studs (5) up into top RDL
- bottom RDL (CoWoS-L 6 levels 11/11) then C4 / uBGA (500 pitch, 200 high)

Hybrid bond (soic, foveros_direct, samsung_x_cube, hybrid_bond_d2w, hybrid_bond_w2w)
- bond interface plane with Cu pads in dielectric, pads mirror-aligned top/bottom, pad = pitch / 2
- each pad on 1-4 vias down to a wider top-metal line (cross section shape)
- no solder, no underfill, zero gap
- thinned upper tier(s) with TSVs (D2W: 5 x 50; W2W: 1 x 10 or 2.5 x 3) landing on top metal and on backside pads
- D2W: oxide gap fill around the smaller top dies (TDV through it when needed); W2W: equal footprints, no gap fill
- package side: bumps under the base die / wafer

HBM stack (hbm_stack)
- base logic die (wider) + N core dies (8/12/16) + thicker top die
- per gap: micro-bump row with MUF/NCF (gap 15) or gap-less HCB pads
- TSV columns through every core die aligned with bump columns, central bundle
- side mold around the cube; bottom bumps under the base die only

## 6. Mapping to atlas families (reported vs analog)

R = matches the family rule in families.yaml (verified with the Matcher); A = use `analog:`. Only rows with numbers listed.

| family | R rows (dims usable as `ref:`) | gaps -> suggested A rows |
|---|---|---|
| cowos_r | L/S 2/2: ectc51529.2024.00049-a-L02 (9L, via 8), -b-L01, -c-L01, ectc51687.2025.00047-a-L01, ectc51687.2025.00026-a-L03, ectc32696.2021.00125-a-L03 (4L), ectc51906.2022.00008-a-L02; KY 1.4: ectc51687.2025.00047-b-L01; via: ectc51687.2025.00047-a-L02 (8 / pitch 35), -a-i3 (pad 11), -b-L02 (3), -c-i1, -c-i2; ectc51529.2024.00049-a-i3 (stacked), -a-i4 (45 C4 via); ubump min 35: ectc51529.2024.00049-a-i1, ectc51687.2025.00047-a-i1, ectc51687.2025.00026-a-i1; 40: ectc32696.2021.00125-a-i1; C4 145: ectc51529.2024.00049-a-i2, ectc51687.2025.00047-a-i2, ectc51687.2025.00026-a-i2; 150: ectc51906.2022.00008-a-i3; gap 150: ectc51529.2024.00049-a-c1; lines/mm: ectc51529.2024.00049-a-m1, ectc51687.2025.00047-b-m5; HBM length 6000: ectc51529.2024.00049-e-m14 | Cu thickness: 001c.129747-f-L01 (3), tcpmt.2025.3599484-a-L01 (3), ectc51846.2026.00016-b-L01 (2); dielectric: 001c.129747-f-L04 (4), ectc51846.2026.00016-b-L03 (5), tcpmt.2025.3599484-a-L04 (3); coarse level: 2380-4505-2020.1.000042-a-L08 (10/10, 8); UBM: ectc51906.2022.00135-a-L13 (7); micro-bump dia / height: N/A in all A sets for 35-40 pitch |
| info_os | L/S: ectc32696.2021.00033-a-L03..L07, -b-L01, -b-L02, itherm45881.2020.9190542-a-L05..L07; RDL count 3: ectc32696.2021.00033-c-L01; C4 130: itherm45881.2020.9190542-a-i1, ectc32696.2021.00033-a-i4, -b-i2; D2D IO pitch 36: ectc32696.2021.00033-a-i1 | Cu / PM thickness and via size: cowos_r A (same InFO-process RDL) ectc51687.2025.00047-a-L02 (via 8), tcpmt / 001c rows above; chip-first wafer FO RDL 5 thick: ectc51909.2023.00266-a-L02; via on die pad: N/A |
| ase_focos_bridge | FO-RDL: ectc51529.2024.00151-a-L04 (10/10), -b-L08 (8/8), ectc51687.2025.00095-a-L05 (8/8 x2), ectc51687.2025.00158-a-L02 (5/5 x3); via 10: ectc51687.2025.00095-a-i2; tall pillar 120: ectc51687.2025.00095-a-i4; ubump 55: ectc51529.2024.00151-a-i1; C4 150: ectc51529.2024.00151-a-i4, 130: ectc51687.2025.00158-a-i1 | Cu / PI thickness: ase_focos_chip_last ectc51906.2022.00309-a-L06 (5); pillar dia / pitch: ectc51909.2023.00091-a-i2 (50 / 100), ectc51909.2023.00175-a-i4 (pitch 260) |
| amkor_s_connect | ubump 50 / 55: ectc51909.2023.00175-a-i1, -a-i2; Cu stud 5: -a-i3; tall pillar 135 / 260: -a-i4; bridge 70: -a-L06 | RDL L/S, levels, thickness: all N/A -> ase_focos_bridge rows (A) or 1C rows |
| samsung_i_cube_e | none with numbers (ectc51687.2025.00048-a rows are qualitative) | RDL: samsung_i_cube_r eptc62800.2024.10909872-a-L03 (6L 2/2), ectc51687.2025.00090-a-L04; ubump 45: ectc51687.2025.00090-a-i1; Cu post: ectc51909.2023.00091-a-i2 |
| fan_out_panel | chip-first: ectc51906.2022.00136-a-L04..L08, -a-i1, -a-i2; ectc32696.2021.00174-a-L05..L08, -a-i2; eptc59621.2023.10457909-a-L01..L05; ectc32862.2020.00185-a-L03, -L06, -a-i1, -a-i2; Gen 2 eptc53413.2021.9663896-c-i1, -c-i2; chip-last: 2380-4505-2020.1.000042-a-L02..L12, -a-i1..i6; ectc51906.2022.00140-a-L03..L05, -b-L05; ectc51846.2026.00008-a-L05 (5/8 x3); ectc.2019.00-29-a-L04..L12, -a-i1..i3; fine L/S demos ectc51909.2023.00268-a-L01, -b-L01..L03, ectc51906.2022.00140-c-L01..L03; TMV 100: ectc51529.2024.00321-a-i1 | ectc51909.2023.00266-a and ectc51909.2023.00053-a are listed as `extra_tvs` but are outside the rule: R only if the template adds them to `family_match.tvs`, else A |
| cowos_l (RDL part) | ectc51909.2023.00091-a-L05 (F/S 1 level), -a-L07 (B/S 6 levels 11/11), -a-L09 (uBGA layer 200), -a-i2 (TIV 50 / 100), -a-i3 (uBGA 500 / 200), -a-i4 (BGA 1000); ectc51909.2023.00174-a-L03, -L06; LSI: ectc51909.2023.00174-d-L02 (0.8/0.8, 2), -e-L02 (2/2, 2.3) | RDL thickness, via: cowos_r rows (A) |
| soic | pitch: ectc51906.2022.00176-a-i1 (3), -b-i1 (9); vlsitechnologyandcir46769.2022.9830182-a-i1 (3-9), -c-i1, -e-i1 (9), -i-i1 (36); ectc.2019.00095-a-i1 (10, 12,000/mm2); W2W 0.2-0.4: ectc51529.2024.00125-a-i1..i3 (CD 0.1-0.2); ectc51909.2023.00008-a-i1 (0.4) | pad size at 3-9 pitch, pad thickness, HB via, TSV dims, TDV dims: hybrid_bond_d2w rows ectc51846.2026.00218-a-i1..i5, ectc51909.2023.00023-a-L03..L05, ectc51906.2022.00031-b-i3 (TSV); TOV ectc51846.2026.00218-c-i1 |
| foveros | micro-bump 50 / 25: iedm19573.2019.8993637-a-i1; 36 / 18: vlsitechnologyandcir46783.2024.10631478-a-i1; TSV 9 x 75: vlsitechnologyandcir46783.2024.10631478-a-i3, iedm19573.2019.8993637-a-i2 (pitch 15-16), -b-i1..i4; base die 75: iedm19573.2019.8993637-a-L04; package bump 110 / 70: vlsitechnologyandcir46783.2024.10631478-a-i2 | base-die BEOL thickness: N/A |
| foveros_direct | pitch 3: ectc51529.2024.00017-a-i1, -a-L03, iedm45625.2022.10019499-a-i1, -b-i1, ectc51687.2025.00009-b-i1; 9-10: ectc32696.2021.00166-a-i1, -b-i1, -c-i1; sub-um: ectc51529.2024.00128-a-i1..i3; MLV 1 x 9 @ 3: ectc51687.2025.00009-a-i1; chiplet 20: iedm45625.2022.10019499-c-L02 | pad size / via: hybrid_bond_d2w ectc51846.2026.00218-a-i2 (3 pitch, 1.5 pad), ectc51687.2025.00323-a-i2; TDV dims: ectc51846.2026.00218-c-i1 (A) |
| samsung_x_cube | HCB 4 / 2: ectc51909.2023.00178-a-i1, -b-i1, -c-i1; TSV 4 @ 50: iwlpc52010.2020.9375855-a-i2, -a-L05; Cu pillar 125, BGA 400: -a-i3, -a-i4 | die thickness: N/A -> ectc51529.2024.00106-a-L02 (50, A) |
| hybrid_bond_d2w | ectc51846.2026.00218-a-L02..L06, -a-i1..i5, -b-L03; ectc51909.2023.00023-a-L01..L08, -a-i1, -a-i2; ectc51906.2022.00031-a..d (pads 15 / 35, TSV 5 x 50 @ 35, Si 50, DBI 2, RDL 1); ectc51687.2025.00323-a-i1..i3; ectc51687.2025.00060-a/-b; tcpmt.2021.3104326-c-L01..L09, -c-i1, -c-i2; ectc51529.2024.00106-a..d; ectc51909.2023.00219-a-i1, -a-i2; 001c.129733-a-i2. IHB Cu-Cu TCB rows tcpmt.2026.3650893-a/-c are direct Cu bonds with 1 um gap + MOF, not hybrid: exclude from hybrid ranges | TOV / HD TSV coupons ectc51846.2026.00218-c-i1 (4 x 9), -d-i1 (2 x 6) match no family (Matcher) -> A |
| hybrid_bond_w2w | ectc51529.2024.00057-a-L04, -L10, -a-i1..i6; ectc51529.2024.00218-a-L05, -a-i1..i3, -a-m21; ectc51846.2026.00183-a-i1..i3; ectc51846.2026.00187-a/-b; ectc51846.2026.00130-a/-b; ectc51909.2023.00190-a-i1..i8, -a-L06; iedm45741.2023.10413829-a-i1..i8; ectc51906.2022.00057-a-i1, -b-i2; ectc51906.2022.00113-a/-b; ectc51529.2024.00334-a-i1, -i2; ectc51529.2024.00396-a-i1; ectc51909.2023.00219-b-i1; vlsitechnologyandcir65830.2026.11577374-a-L02 (3 um DRAM tiers), -a-i1 (TSV 20 pitch); ectc51687.2025.00323-a-i4; 001c.129733-a-i1 | pad thickness: ectc51909.2023.00023-a-L05 (A); TSV liner 0.5: vlsitechnologyandcir46783.2024.10631478-a-i3 (A) |
| hbm_stack | core die 58 x 8: ectc51909.2023.00179-a-L01; gap 15: ectc51909.2023.00151-a-i1; HCB pad 10: ectc51909.2023.00179-a-i1; micro-bump 36 (model): vlsitechnologyandcir46769.2022.9830182-j-i1; HCB 6 / 3: ectc51846.2026.00024-a-i1, -b-i1 | core-die TSV: ectc51906.2022.00179-b-i5 (5 x 50), -d-i2 (3 x 50 @ 7), ectc51906.2022.00031-b-i3 (5 x 50 @ 35); micro-bump: ectc51529.2024.00064-a-i1 (25 pitch, 3 Ni + 9 SnAg); HBM base bump 55: ectc51909.2023.00150-a-i2 |
| non-templated (A sources only) | samsung_i_cube_r: eptc62800.2024.10909872-a-L03, ectc51687.2025.00090-a-L04, -a-i1; ase_focos_chip_last: ectc51906.2022.00309-a-L06, -L07, -a-i1..i5, ectc51687.2025.00095-b-L04; amkor_hplt: ectc51906.2022.00135-a-L03..L13, -a-m1..m24; amkor_s_swift: ectc51906.2022.00218-a-L06..L08 (no dims); ETR coupon ectc51906.2022.00218-b-L01 (2/1, via 2, x4), -b-i1..i5 | - |

## 7. Figures reviewed (52, all viewed 2026-10-20)

| fig_id | paper | what it shows | used for |
|---|---|---|---|
| ectc51687.2025.00047-f01 | CoWoS-R RDL scaling | via 8 / cap at 35 pitch, 2/2 lines between; KY 3 / 1.4 | 1A unit cell, 2.3, 3.2 |
| ectc51906.2022.00008-f05 | CoWoS-R+ | package schematic, line density vs L/S for 3-6 layers | 3.1, 3.2 |
| eptc62800.2024.10909872-f01 | I-Cube R panel RDL | multilayer RDL SEM, T pad, 2 um line row, plane straps | 4 RDL interposer |
| ectc51687.2025.00090-f01 | 2.3D RDL interposer | same SEM, 2 um pattern | 4 RDL interposer |
| ectc51906.2022.00218-f01 | S-SWIFT | chip / ubump / 4L RDL / Cu pillar / substrate proportions | 4, 5 |
| ectc51906.2022.00218-f02 | S-SWIFT ETR | 4 stacked ETR levels, 4-level pad-less via | 2.1, 4 |
| ectc51906.2022.00218-f03 | S-SWIFT ETR | trench 3.83 deep 2/1; via tapers | 2.2 |
| tcpmt.2025.3599484-f01 | ETR grayscale | 1.5-3 via arrays, stacked 5 and 2 vias, 4-layer RDL | 2.1, 2.2 |
| tcpmt.2025.3599484-f02 | ETR grayscale | 8 / 9 / 12 traces between 50-pitch vias | 3.2 |
| 001c.129747-f01 | DNP glass-panel RDL | 55 pitch HBM pads, 5-metal RDL SEM, 1.5/1.5 under inorganic cap | 4 |
| ectc51909.2023.00150-f01 | FPGA on organic interposer | ubump X-ray; section FPGA / ubump / RDL / posts / build-up | 4 |
| ectc32696.2021.00033-f05 | InFO_oS | stagger vs stacking via1 / via2 drawings | 2.1, 4 |
| ectc32696.2021.00033-f06 | InFO_oS | PDN: RDL1-5 PWR/GND planes | 3.1 |
| itherm45881.2020.9190542-f01 | InFO_oS TTV | lidded InFO_oS schematic | 1B order |
| ectc51906.2022.00232-f06 | chip-first wafer FO | 3-layer RDL SEM, conformal staggered cup vias, Cu via, C4 | 2.1, 4 InFO |
| ectc51906.2022.00232-f01 | chip-first wafer FO | die / mold / thin RDL / C4 / substrate | 4 InFO |
| ectc51906.2022.00309-f01 | FOCoS chip-last | full package section, zooms at chiplet edges and D2D gap | 4, 5 |
| ectc51906.2022.00309-f06 | FOCoS chip-last | large / small ubump and C4 joints on RDL | 4 |
| ectc51906.2022.00309-f07 | FOCoS chip-last | 3 RDL levels, fine groups vs wide traces | 3.1, 4 |
| ectc51687.2025.00095-f04 | FOCoS panel | staggered vs stacked filled vias | 2.1, 4 |
| ectc51687.2025.00095-f05 | FOCoS-Bridge panel | tall Cu pillar through filled mold, RDL pad, C4 | 4 |
| ectc51906.2022.00135-f01 | HPLT | 6-layer RDL-first SEM with measured thicknesses | 1C, 4 |
| 2380-4505-2020.1.000042-f04 | 3-RDL FOPLP substrate | ML1 / ML2 / ML3 labelled widths and thicknesses | 1C, 4 |
| ectc51846.2026.00008-f03 | FOPLP chip-last | 5/8 traces top view; 3-level stacked via-pads | 2.1, 4 |
| ectc.2019.00-29-f01 | RDL-first FOPLP | dielectric 1-3, RDL#1+UBM, RDL#2 labelled | 1C, 4 |
| eptc53413.2021.9663896-f02 | M-Series | 15 via on 30 Cu stud in EMC | 2.3, 4 |
| eptc59621.2023.10457909-f02 | M-Series model | chips, Cu studs, PI1/RDL/PI2/UBM/balls | 1C2 order |
| ectc51909.2023.00266-f01 | chip-first panel | ball on UBM, 5-layer RDL, studs through mold | 4 |
| ectc51906.2022.00140-f04 | chip-last FOPLP | planar 11 UBM vs T-shape 8 UBM in PID | 2.3 |
| ectc51529.2024.00151-f01 | FOCoS-Bridge | schematic + SEM: D2D gap, 2-RDL, ubump + stacked via, C4 | 2.1, 4 |
| ectc51909.2023.00175-f01 | S-Connect | tall Cu pillars, connect die, Cu stud, ubump | 4 |
| ectc51687.2025.00048-f02 | I-Cube E | pillar joint on RDL pad, via to Cu post in mold | 4 |
| ectc51687.2025.00158-f07 | FOCoS-Bridge TSV | TMV path vs TSV-through-bridge path schematic | 1D |
| eptc56328.2022.10013262-f05 | M-Series | tall through-mold Cu post between RDLs | 4 |
| ectc51846.2026.00218-f01 | D2W HB 5/3/2/1 pitch | line / via / pad / interface cross shapes | 2.4, 4 |
| ectc51909.2023.00023-f01 | DBI 3.5 / 7 | pad 3.5 x 3.5, 0.5 vias, 0.9 RDL | 1E, 4 |
| ectc51529.2024.00057-f07 | 3-tier W2W | F2F / F2B interfaces, HBV, 1 x 10 TSV | 2.4, 4 |
| ectc51529.2024.00057-f06 | 3-tier W2W | TSV landing on MZ and on HB pad, oxide windows | 2.4 |
| ectc51529.2024.00218-f01 | WoWoW 1 um | 3-wafer STEM, tapered via-last TSVs | 2.2, 4 |
| iedm45625.2022.10019499-f02 | QMC 3 um | HB pad / HB via / top metal | 2.4 |
| iedm45625.2022.10019499-f05 | QMC | support Si, top chiplets, HB, base chiplets with TDVs in oxide, bumps | 1E variant, 2.4 |
| iedm45741.2023.10413829-f01 | W2W 400 nm | TEM via-pad-pad-via columns | 2.4, 4 |
| ectc51687.2025.00323-f01 | CoWoW F2B | 3.0 / 1.4 / 1.0 pads with vias, M3 / M2 | 4 |
| ectc51909.2023.00178-f01 | X-Cube HCB | HCB flow; bonded Cu pads SEM | 4 |
| ectc51906.2022.00031-f04 | DBI 8-die stack | TSV columns through 7 Thru dies | 4, 5 |
| ectc51906.2022.00031-f01 | DBI stack | DBI pad on TSV end (F2B) | 2.4 |
| iedm19573.2019.8993637-f01 | Foveros | F2F ubump row, base TSV pairs, package bumps | 4 |
| ectc51909.2023.00151-f01 | HBM3 8Hi MR-MUF | stack overview, ubump + TSV zoom | 1F, 4 |
| ectc51909.2023.00151-f03 | HBM3 8Hi | Top / 7 Core / Base schematic with TSV bundle | 1F, 5 |
| ectc51909.2023.00179-f01 | HBI 8Hi | ubump vs HBI Cu/Cu joint, 15 % height reduction | 1F, 4 |
| ectc51529.2024.00021-f01 | 16H HCB | TCB ubump with gap fill vs gap-less HCB pad | 1F, 4 |
| vlsitechnologyandcir65830.2026.11577576-f01 | HBM4 12-layer MTV | 12-row ubump stack SEM | 4 |

## 8. Gaps (N/A in the DB; must be `template:` or `analog:`)

- CoWoS-R / InFO_oS: per-level Cu and dielectric thickness, coarse-level L/S, micro-bump diameter / height, UBM thickness,
  C4 diameter. InFO via sizes.
- HBM stack: core-die TSV diameter / pitch / depth, micro-bump pitch in a physical HBM (only a 36 model value), base die
  thickness, bump counts. Only analogs exist (1F).
- Hybrid bond: TDV dimensions (only a 4 x 9 TOV coupon), D2W gap-fill thickness, SoIC pad size and pad thickness, pad
  thickness at sub-um pitch (only via CD).
- Bridge-in-mold: S-Connect and I-Cube E RDL L/S and level counts; tall-pillar diameters (except TIV 50).
- D2D lane counts per mm of die edge: only aggregate lines/mm (1100 / 2200) and lanes per link (UCIe x32 / x64); no
  per-level assignment of signal vs plane for CoWoS-R (I-Cube R SSGSS is the only explicit layer order).
- Several dims exist only as figure labels (2380-4505-2020.1.000042-f04 measured widths are in -a-L04 notes / metrics;
  M-Series 15 / 30 via-on-stud is caption-only) - use E with fig_id.
