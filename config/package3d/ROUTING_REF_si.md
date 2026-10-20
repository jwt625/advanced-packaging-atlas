# Routing reference: Si interposers and Si bridges (R2, DevLog-011)

Date: 2026-10-20. Author: reference agent R2. Scope: Si TSV interposer (CoWoS-S class, MIoS, peers), EMIB / EMIB-T,
LSI / bridge-in-mold (CoWoS-L, FOCoS-Bridge, S-Connect, I-Cube E, embedded-bridge interposers), DBHi, Si-IF, and
die-to-die (D2D) wiring. Feeds mock-up routing (DevLog-011 contract) and metrics M2 (checklist), M5 (ranges), M7
(visual audit).

Conventions
- Row ids are full DB ids: `layer_id` (stack_layers), `ic_id` (interconnects), `ei_id` (electrical_interfaces),
  `comp_id` (components). A cell is `<row_id>.<field>`.
- Status: **R** = DB cell (reportable for the matching family, analog elsewhere). **T** = DB text only (feature /
  notes / material column, not a numeric cell; usable as `template` with `refs`). **F** = number printed in a figure
  label or caption, not in the DB (cite fig_id; template with `source`). **E** = my estimate from a figure's pixel
  proportions (template only; never `ref`). **N/A** = not in the DB or figures reviewed.
- min / med / max are over distinct (paper, value) pairs, so repeated TV rows of one paper count once.
- Figures: `references/<paper_id>/figures/key/<fig_id>.png`, all viewed 2026-10-20. No figure is copied into the app.

---

## 1. Archetypes (layer sequence top -> bottom)

### 1.1 Si TSV interposer (CoWoS-S class; MIoS; si_interposer_peers)

| # | element | values (status) | rows / figs |
|---|---|---|---|
| 1 | Microbump joint die -> interposer | pitch min/med/max 10 / 40 / 73 um, n=19 incl. fine-pitch research TVs (R); production-type set 35-73 um: 40 (CoWoS, MIoS ASIC, peers), 45 (Xilinx), 36 (microbump baseline of the SoIC_H paper, Foveros SIB), 35 (die B), 50 (MIoS chiplet Cu pillar), 73 (MIoS HBM3) (R). Diameter 5 / 16.5 / 22 um (R). Die-side stack Cu 13 / Ni 2 / SnAg 9 um (R); Cu 15 / SnAg 7 (R); Cu 3 / Ni 2 / SnAg 5 at 10-20 um pitch (R). Joint layer 35 um (MIoS, R). Die-interposer gap 16-21 um at 35-40 um pitch (F) | ectc.2013.6575597-a-i1, ectc51909.2023.00135-a-i1, ectc51529.2024.00155-a-i1, ectc51687.2025.00027-a-i1, ectc51909.2023.00154-a-i3/-i4/-i5, ectc.2011.5898527-a-i1, vlsitechnologyandcir46769.2022.9830182-d-i1, vlsitechnologyandcir46783.2024.10631478-a-i1, ectc51909.2023.00155-a-i1/-i2, estc60143.2024.10712129-g-i2, ectc51909.2023.00153-a..d-i1, ectc51529.2024.00322-a-i1/-i2, ectc51846.2026.00034-a-i1, ectc32696.2021.00315-a-L03; gap: ectc51909.2023.00155-f07 |
| 2 | Interposer top pad / UBM | Al-Cu pad 20 um dia at 40 um pitch + e-less Ni 2 um + Au 0.05 um (R); Cu pad 5 um thick, 27 x 27 um, on Ti 0.025 / Cu seed 0.15 over SiN (R); Ni 2 / Au 0.1 pads (R); FS UBM Cu/Ni/Au, thickness N/A (T); Cu uBump to Al pad (CoWoS, T) | ectc51687.2025.00027-a-L04/-L05/-L06, ectc51529.2024.00155-a-L04, ectc51909.2023.00155-a-L05..-L08, ectc51846.2026.00227-a-L02/-L03, eptc59621.2023.10457670-a-L01, ectc.2013.6575597-a-i1 |
| 3 | Top passivation | present, material and thickness N/A (T) | eptc59621.2023.10457670-a-L02, ectc.2011.5898527-a-L06 |
| 4 | Top thick metal / Al RDL | CoWoS: Al RDL at 5 um line pitch (T, feature column) | ectc.2013.6575597-a-L03 |
| 5 | Cu damascene BEOL | levels: 3 Cu (CoWoS, R repeat=3; pitch < 1 um T; MIM between Cu1 and Cu2 optional, 2.0 fF/um2 T), 5 (TSI peer, R; SoIC_H interposer, R repeat=5), 4 (link model, R), 3 (Foveros passive interposer M1-M3, T). Cu thickness 1 um per level dual damascene (R). L/S N/A for every Si-interposer damascene row; nearest cells: 0.4/0.4 um CoWoS-based BEOL of iOIS (R, photonic_interposer), 0.8/0.8 um, 2 um thick LSI-1 dual damascene (R, CoWoS-L), 1 um line pitch on 2 levels (R, model). IMD material N/A (T: "stress-optimized IMD") | ectc.2013.6575597-a-L04, eptc59621.2023.10457670-a-L03..-L08, vlsitechnologyandcir46769.2022.9830182-a-L03, ectc51529.2024.00144-c-L01, vlsitechnologyandcir46783.2024.10631478-a-L02/-L05/-L06, ectc51909.2023.00108-a-L01, ectc51909.2023.00174-d-L02, ectc32696.2021.00166-e-L01 |
| 5b | Polymer RDL variant on Si (not damascene) | 4 Cu levels, metal <= 2 um, polymer <= 6 um, L/S 4/4 um, via >= 8 um, staggered vias (R + fig rules); imec RF: RDL1/RDL2 5 um Cu, 5/5 um, PID 7 um, via 15 um, 15 um PID1 with 10 um Cu pillar to M1 (R); DLSSI 10/10 um, 1 and 5 um Cu, SiO2 1-2 um (R) | 001c.129513-a-L01..-L03 + 001c.129513-f04, 3dic63395.2024.10830178-a-L02..-L08, -i1/-i2, tcpmt.2025.3538554-a-L01..-L23 |
| 6 | Si core | thinned TSV interposers: thickness 20 / 100 / 300 um, n=17 (R); CoWoS 100 and 50 um (R), MIoS 110 um (R), peers 100-200 um (R). Unthinned 725-775 um wafers in peer TVs are carriers, not routing interposers. Size: CoWoS 26 x 24 mm (R), MIoS 51 x 55 mm (R), peers 42 x 46, 50 x 50 mm (R) | ectc.2013.6575597-a-L05/-c3, ectc51909.2023.00135-a-L04/-c-L04, ectc32696.2021.00315-a-L04/-c3, ectc51909.2023.00154-a-L09, ectc.2011.5898527-a-L08, ectc51529.2024.00155-a-L05, ectc51909.2023.00155-a-L09, estc60143.2024.10712129-g-L04 |
| 7 | TSV | diameter 9 / 10 / 30 um, n=9 (R); depth 20 / 100 / 300 um, n=7 (R); AR 5.7-10 (R); pitch: 50-100 um (TSI), 20 um (polymer-RDL interposer; next release 15 um, <= 7 um), 60 um (TiN TSV), 15-16 um (Foveros base die, 3D) (R). CoWoS TSV 10 x 100 um (R) | eptc59621.2023.10457670-a-i1, ectc.2013.6575597-a-i2, ectc.2011.5898527-a-i2, vlsitechnologyandcir46783.2024.10631478-a-i3, ectc51906.2022.00053-a-i1, 001c.129513-a-i2, tcpmt.2025.3538554-a-i1, ectc51909.2023.00316-a-i1, eptc67330.2025.11392196-a-i3, iedm19573.2019.8993637-a-i2 |
| 7b | TSV liner / barrier | thermal SiO2 liner + barrier/seed + ECD Cu (T); SiO2 0.5 um + Ta barrier (R / T); thermal SiO2 0.5 um (R); TEOS + Ta liner (T); thermal SiO2 1 um / Ti 1 um / Cu seed 2 um (R, process study, 70 um TSV) | ectc.2011.5898527-a-i2, vlsitechnologyandcir46783.2024.10631478-a-i3, tcpmt.2025.3538554-a-L07, eptc67330.2025.11392196-a-i3, tcpmt.2026.3708099-a-L02..-L04 |
| 8 | Backside passivation | after TSV reveal (CMP), material N/A (T); PI 3 um (R); dielectric after backgrind N/A (T); backside SiN 1.5 um stress layer (R, RF interposer) | eptc59621.2023.10457670-a-L10, ectc51909.2023.00155-a-L10, ectc51529.2024.00155-a-L06, ectc51687.2025.00027-a-L08, 3dic63395.2024.10830178-a-L10 |
| 9 | Backside RDL | 2 levels of 3 um Cu with polymer passivation between (R); MIoS backside RDL with increased volume, dims N/A (T); CoWoS: none, C4 directly on TSV (T) | eptc59621.2023.10457670-a-L11..-L14, ectc32696.2021.00315-a-L05, ectc.2013.6575597-a-i3 |
| 10 | Backside UBM / pad | Cu pad 5 um on Ti 0.1 / Cu 0.5 seed, 75 um dia at 150 um pitch (R); E-Cu pads 75 um / 150 um (R); BS UBM Cu/Ni/Au (T); bump UBM Cu 10 / Ni 2 / Cu 1 um (R) | ectc51909.2023.00155-a-L11..-L13, ectc51529.2024.00155-a-L07, ectc51687.2025.00027-a-L09, eptc59621.2023.10457670-a-L15, ectc51846.2026.00227-a-L05..-L07 |
| 11 | C4 / Cu pillar to substrate | pitch 110 / 150 / 200 um, n=7 (R): 200 SnPb C4 (CoWoS 2013), 180 eutectic (Xilinx), 150 Cu pillar (CoWoS 2023, peers), 110 (Foveros PSB). Cu pillar 75 um dia, Cu 30 + SnAg 25 um = 55 um (R; measured 34/25, R notes). Joint gap 72.2 center / 69.5 edge (MIoS, R), 59-77 mean 67 (R); C4 standoff 60-90 um FEA, 65 vs 85 um sections (F). SnAg 55 um on Cu 10 um (R) | ectc.2013.6575597-a-i3, ectc.2011.5898527-a-i3, ectc51909.2023.00135-a-i2, ectc51529.2024.00155-a-i2, ectc51687.2025.00027-a-i2, ectc51909.2023.00155-a-i3, ectc51846.2026.00227-a-i2/-L08, vlsitechnologyandcir46783.2024.10631478-a-i2, ectc32696.2021.00315-a-i2/-L06, ectc51909.2023.00154-a-i7; fig ectc51909.2023.00135-f07 |

TSV-less Si interposer (UCLA Si-IF): Si 500-525 um (R), 2 Cu levels SuperCHIPS (R repeat=2), 4-level PDN model M1 power /
M2-M3 signal / M4 ground, 3 um thick, 12/5 um (R, simulated), RDL < 30 um total (R), Cu pillars 4 um at 9.8 um pitch
(R), dielet gap 59 um (R). Rows: ectc51906.2022.00332-b-L02/-L03/-i1/-c2, ectc51906.2022.00303-a-L01..-L04,
ectc51906.2022.00303-c-L01/-L02, ectc51846.2026.00062-c-L10.

### 1.2 EMIB bridge in organic substrate

| # | element | values (status) | rows / figs |
|---|---|---|---|
| 1 | Die bumps | fine pitch over bridge 55 um (R), 45 um (R); coarse outside 130 um (R); mixed CD / mixed pitch bumps with height control (T) | ectc.2016.201-a-i1/-i2, ectc51687.2025.00051-b-i1; fig ectc.2016.201-f07 |
| 2 | Substrate surface (SR, top pads) | per R1 substrate reference; EMIB-specific N/A | - |
| 3 | Build-up dielectric over bridge + fine vias | bridge embedded within top 2 layers of the package, dielectric laminated after bridge placement (T); fine-pitch vias land fully on bridge pads (T); coarse vias outside bridge (T); via dims N/A | ectc.2016.201-a-L04/-i3/-i4; figs ectc.2016.201-f01, -f04 |
| 4 | Bridge pad layer | present, metal N/A (T) | ectc.2016.201-a-L01 |
| 5 | Bridge BEOL | up to 4 routing levels M1-M4 + pad layer, L/S 2/2 um (lower possible), vias 2 um dual damascene (R); Vss level 50-70 % metal density (F) | ectc.2016.201-a-L02; fig ectc.2016.201-f10 |
| 6 | Bridge Si | < 75 um design (R); ~50 um generic EMIB (R, EMIB-T paper); size 2 x 2 to 8 x 8 mm, > 5 bridges / package (R / F) | ectc.2016.201-a-L03/-c1, ectc51846.2026.00051-a-L03; fig ectc.2016.201-f10 |
| 7 | Cavity + adhesive | cavity formed after final build-up layer, bridge attached with adhesive; depth N/A (T) | ectc.2016.201-a-L05; fig ectc.2016.201-f04 |
| 8 | Substrate below | standard build-up / core / PTH / BGA (R1 reference) | ectc.2016.201-f01 |

### 1.3 EMIB-T (TSV bridge)

| # | element | values (status) | rows / figs |
|---|---|---|---|
| 1 | Die bumps (FLI) | 45 um (R); mixed 110 / 55 / 36 um regions (R); 25 um (R) | ectc51687.2025.00051-a-i1, ectc51846.2026.00051-a-i1, -b-i1 |
| 2 | Micro-vias through encapsulating dielectric onto bridge pads | present under 36 um FLI (T); direct vias dielectric -> bridge pads, via-to-pad overlay critical (T); POR overlay up to ~6.4 um, new scheme below ~1.8 um (R notes / F) | ectc51846.2026.00051-a-i2, ectc51687.2025.00051-a-i4, ectc51846.2026.00051-b-i2; fig ectc51846.2026.00051-f06 |
| 3 | Bridge BEOL | "at least 10 metal layers", bridge or package not specified (R repeat=10); high-density MIM between Metal 1 and Metal 2 over full bridge area, 500 nF/mm2 (T) | ectc51846.2026.00051-d-L01/-L02/-c1 |
| 4 | Bridge Si with TSV arrays | ~50 um (R); 3 x 18 mm bridge (R); TSV dims N/A (T) | ectc51846.2026.00051-a-L03, -b-L02, -b-c1, -b-i4, ectc51687.2025.00051-a-i2 |
| 5 | Cavity-side bumps | solder joints from TSV bridge back to cavity pads, underfilled; TCB at panel level; pitch / metallurgy N/A (T) | ectc51687.2025.00051-a-i3, ectc51846.2026.00051-b-i3 |
| 6 | Cavity pads + substrate | cavity pad finish N/A (T) | ectc51687.2025.00051-a-i3; fig ectc51846.2026.00051-f03 |

### 1.4 LSI / bridge in mold (CoWoS-L, FOCoS-Bridge, S-Connect, I-Cube E, embedded-bridge interposers)

| # | element | values (status) | rows / figs |
|---|---|---|---|
| 1 | Microbumps to top RDL | 55 um (FOCoS-B, R), 50 / 55 um (S-Connect ASIC / HBM, R), 45 / 73 um, 25 um dia, 45 um high (embedded bridge interposer, R); CoWoS-L ubump pitch N/A ("may be scaled to 35 um or lower", T) | ectc51529.2024.00151-a-i1, ectc51909.2023.00175-a-i1/-i2, eptc67330.2025.11392593-a-i1/-i2, ectc51909.2023.00091-a-i1 |
| 2 | Top (front) RDL | CoWoS-L: 1 F/S RDL level (R repeat=1, L/S N/A); FOCoS-B 1 level 10/10 um (R), 2 levels 8/8 um (R, 3P3M in text), 3 levels 5/5 um (R); embedded-bridge interposer 2 levels 7/7 um (R); OMIB 2/2 um (R, cpo_module); PIC-in-mold FS 2 levels 2 um Cu / 5 um PI (R). Stacked and staggered RDL vias (T); passivation via 10 um landing on pillar / stud (R) | ectc51909.2023.00091-a-L05, ectc51909.2023.00174-a-L03, ectc51529.2024.00151-a-L04, -b-L08, ectc51687.2025.00095-a-L05/-i2/-i3, ectc51687.2025.00158-a-L02, eptc67330.2025.11392593-a-L04, ectc51687.2025.00062-a-L06, ectc51846.2026.00016-a-L03/-L04 |
| 3 | Bridge top contact | LSI top Cu via to F/S RDL (T); Cu studs on bridge revealed by mold grind (T), ~5 um high (S-Connect, R); bridge Cu bump ground open (I-Cube E, T) | ectc51909.2023.00174-d-L01/-a-i4, ectc51687.2025.00095-a-i5, ectc51687.2025.00158-a-i4, ectc51909.2023.00175-a-i3, ectc51687.2025.00048-a-i2 |
| 4 | Bridge BEOL | LSI-1 dual damascene Cu / USG, 0.8/0.8 um, 2 um thick (R); LSI-2 SAP Cu / PI, 2/2 um, 2.3 um (R); M1 single damascene (T); levels N/A (fig shows 3, F); 4-level PI RDL bridges: 2 um Cu, 4 um via dielectric (R) | ectc51909.2023.00174-d-L02..-L04, -e-L02..-L04, ectc51846.2026.00016-a-L06/-L07, eptc67330.2025.11392620-a-L02..-L16; fig ectc51909.2023.00174-f03 |
| 5 | Bridge Si (+ TSV, eDTC) | LSI with TSV and eDTC (T); FOCoS-B TSV bridge thickness simulated 47-65 um only (T); S-Connect connect die 70 um measured, 7 x 6, 6 x 6, 3 x 8 mm (R); FO-EB bridge 2.36 x 6.36 mm (R); FOCoS-B 6.2 x 6.4 mm x 8 (R); PSB bridge 20 um after grind (R) | ectc51909.2023.00174-d-L05, ectc51687.2025.00158-a-L04/-c3, ectc51909.2023.00175-a-L06/-c3, -b-c3/-c4, ectc51687.2025.00187-a-c2, ectc51529.2024.00151-a-c3, 001c.74775-a-L07 |
| 6 | Through-mold verticals beside bridge (TIV / TMV / tall Cu pillar / Cu post) | CoWoS-L TIV 50 um dia, 100 um pitch (R); S-Connect tall Cu pillar 135 um high, 260 um pitch (R); FOCoS-B tall Cu pillar up to 120 um, ~vertical sidewall (R); Cu post 70 um dia, 150 um pitch, 100 um high (R); coaxial Cu post concept (T) | ectc51909.2023.00091-a-L06/-i2, ectc51909.2023.00175-a-i4, ectc51687.2025.00095-a-i4, eptc67330.2025.11392593-a-i3, eptc67330.2025.11392593-c-i1 |
| 7 | Mold (bridge level) | EMC; thickness N/A for CoWoS-L / FOCoS-B / S-Connect; PSB 2nd mold 120 um (R) | ectc51909.2023.00174-a-L04, ectc51529.2024.00151-a-L06, ectc51529.2024.00013-a-L04 |
| 8 | Bridge back attach | DAF (I-Cube E, embedded-bridge interposer; T); solder C4 on bridge back for TSV bridge (FOCoS-B with TSV, T) | ectc51687.2025.00048-a-L05, eptc67330.2025.11392593-a-L07, ectc51687.2025.00158-a-i2 |
| 9 | Bottom (back) RDL | CoWoS-L 6x: 6 B/S levels, 11/11 um Cu, low-loss dielectric (R); CoWoS-L TV: 1 level (R); FOCoS-B 1 bottom passivation (R); embedded-bridge: PSV + plated UBM (T) | ectc51909.2023.00091-a-L07/-L08, ectc51909.2023.00174-a-L06, ectc51687.2025.00095-a-L08, eptc67330.2025.11392593-a-L08/-L09 |
| 10 | C4 / uBGA to substrate | C4 150 um (FOCoS-B), 130 um (FOCoS-B TSV) (R); CoWoS-L 6x uBGA 500 um pitch, 200 um layer with IPDs (R); C4 min 150 um, SR opening 75 um (Si-bridge MTV, R) | ectc51529.2024.00151-a-i4, ectc51687.2025.00158-a-i1, ectc51909.2023.00091-a-i3/-L09, ectc51846.2026.00073-a-i4 |

### 1.5 DBHi (surface bridge, no substrate routing through bridge)

Chip -> uC4 75 or 30 um pitch (R) -> Si bridge 60 um, 2.5 x 3.2 mm (R) -> (cavity in laminate, or none in
surface-DBHi / DBrM) -> laminate. Chips also on Cu pillar C4 150 um pitch, 100 um pillar, 110 um total standoff (R).
TSV bridge variant: bottom solder bumps 175 um pitch (R). Rows: ectc51529.2024.00051-a-i1/-i2/-L04/-L06/-c2,
ectc51529.2024.00051-c-i1, ectc51846.2026.00050-a-L02/-i1, ectc51846.2026.00050-e-i2, ectc51909.2023.00180-a-L06.

---

## 2. Via styles

| item | style | evidence |
|---|---|---|
| Interposer BEOL vias | dual damascene, one via per IMD; in a vertical daisy chain the via stack is a staircase (each level offset laterally by roughly one landing width), not a straight stack (F) | eptc59621.2023.10457670-f02 (M1 -> M5 staircase), eptc59621.2023.10457670-a-L03..-L07 |
| TSV-to-M1 | TSV top terminates on M1 (a full M1 landing pad wider than the TSV); signal leaves laterally in M1/M2 and rises through a via stack to the microbump pad elsewhere (F) | ectc.2013.6575597-f06, eptc59621.2023.10457670-f01, vlsitechnologyandcir46783.2024.10631478-f04 (TSV -> M1 -> M2 -> M3 -> SIB) |
| TSV shape | straight cylinder, parallel walls (Bosch-free look in SEM), Cu fully filled, grains visible; liner oxide 0.5-1 um not resolved at package zoom (R / F) | eptc59621.2023.10457670-f01, vlsitechnologyandcir46783.2024.10631478-f05, ectc51909.2023.00316-f01 (scalloped wall visible at 30 um, unfilled TiN) |
| Microbump over TSV? | No in general: microbumps sit at 35-45 um pitch on the top pad grid; TSVs sit at C4 positions. Xilinx section shows ~6 microbump pitches between TSVs (E); Amkor / CoWoS-type sections show TSV pairs above each C4 with microbumps in a dense row above (F) | ectc.2011.5898527-f04, 001c.147115-f02, ectc51909.2023.00135-f01 |
| C4 at backside | CoWoS 2013: C4 UBM directly on the revealed TSV, centered, no backside RDL ("C4 directly on TSV", T); TSI peer: TSV lands on BS RDL1 pad, RDL1 runs laterally, via down to RDL2, UBM / bump offset (F); Foveros passive interposer and peers: 1-2 TSVs per PSB / C4, directly above it (F) | ectc.2013.6575597-a-i3 + ectc.2013.6575597-f02/-f03, eptc59621.2023.10457670-f02/-f03, vlsitechnologyandcir46783.2024.10631478-f01, iedm19573.2019.8993637-f02 |
| TSVs per C4 | 1 (CoWoS EM structure, F), 2 (Foveros PSB, Amkor 2.5D, F), 3 per vertical interconnection (DLSSI, R), cluster sharing one bump (Foveros, T) | ectc.2013.6575597-f06, vlsitechnologyandcir46783.2024.10631478-f01, 001c.147115-f02, tcpmt.2025.3538554-a-i1, iedm19573.2019.8993637-a-i3 |
| Polymer RDL vias on Si | staggered (each level offset), via opening >= 8 um, land overlap >= 4 um (R / F) | 001c.129513-f04, 001c.129513-a-L02 |
| RDL-on-Si stacked vias | stacked VIA1-VIA3 of 4 um dielectric each, total 14.9 um stack, 868 nm M1-to-Si (R / F) | eptc67330.2025.11392620-a-L08/-L10/-L14/-L16, eptc67330.2025.11392620-f01 |
| EMIB fine vias | laser vias through build-up dielectric landing fully on bridge pads, under each fine bump; coarse vias outside the bridge stacked down to core (T / F) | ectc.2016.201-a-i3/-i4, ectc.2016.201-f01, -f04 |
| EMIB-T | top: 2 stacked tapered micro-vias from surface pad to bridge pad (F); bottom: TSV groups (3-4 TSVs per group, F) end on bridge back pads, cavity-side solder bump, cavity pad, stacked vias down (F) | ectc51846.2026.00051-f03, ectc51846.2026.00051-f01 (d), ectc51846.2026.00051-f04 (b) |
| CoWoS-L | ubump -> F/S RDL -> LSI top Cu via -> LSI BEOL -> LSI TSV -> B/S RDL -> C4, or ubump -> F/S RDL -> TIV -> B/S RDL (T / F) | ectc51909.2023.00174-a-i2..-i5, ectc51909.2023.00174-f01, -f05 |
| FOCoS-B / S-Connect | ubump -> stacked RDL vias -> passivation via (10 um) -> Cu stud on bridge (face up) or tall Cu pillar -> bottom RDL -> C4 (R / F) | ectc51687.2025.00095-a-i2/-i3/-i4/-i5, ectc51529.2024.00151-f01 (D), ectc51909.2023.00175-f03 |

---

## 3. D2D routing

| quantity | values (status) | rows / figs |
|---|---|---|
| Levels carrying D2D lanes | EMIB: up to 4 routing levels; density example uses a single level (R); EMIB-T: >= 10 levels total (R); Si interposer link model: 4 levels, 8 GSGS groups (R); passive interposer model: 2 levels at 1 um pitch (R); Si-IF: 2 levels (R); PSB bridge: 1 level (Model B) or 3 signal levels 4-3-4 + solid GND (Model C) (R); 4-level PI bridge: signal on M4 or M2, GND plane M1 or M3 (R); CoWoS-S: N/A | ectc.2016.201-a-L02, ectc.2016.201-a-e1, ectc51846.2026.00051-d-L01, ectc51529.2024.00144-c-L01/-e1, ectc32696.2021.00166-e-L01, ectc51906.2022.00332-b-L03, ectc51846.2026.00035-b-L01, -c-L01, eptc67330.2025.11392620-a-L03..-L13 |
| L/S of D2D wires | 2/2 um EMIB (R); 0.8/0.8 um LSI-1, 2/2 um LSI-2 (R); 0.75/0.75 um dual damascene, 1.4/1.4 um SAP bridge (R); 1 um pitch passive interposer model (R); 2/2 um CPWG minimum on 4-level PI bridge, signal-signal 4-4.5 um (R); 4 um pitch SuperCHIPS wires (T) | ectc.2016.201-a-L02, ectc51909.2023.00174-d-L02, -e-L02, ectc51846.2026.00035-a-L01, -c-L01, ectc32696.2021.00166-e-L01, eptc67330.2025.11392620-a-L03, ectc51906.2022.00332-b-L03 |
| Lane density (wires per mm of die edge) | EMIB 300 IO/mm in one level (R; 4096 signals over 14 mm = 293 IO/mm own arithmetic); IO/mm/layer = Py / ((Rows - 1)(L + S) + (D + S)), ~500 at 1 um and ~250 at 2 um half line pitch (F); EMIB-T ~355 IO/mm at 55 um bump pitch, ~1430 at 25 um (R, read off plot); passive interposer model 2000 IO/mm (R notes); Si-IF 64 links per interface, 7 interfaces per dielet pair (R) | ectc.2016.201-a-e1, ectc.2016.201-f05, ectc51846.2026.00051-d-e2/-e3, ectc51846.2026.00051-f10, ectc32696.2021.00166-e-L01, ectc51906.2022.00332-b-e1 |
| Bump-row geometry feeding the wires | EMIB 4-row staggered pattern, via pad lands on the line (D = L) (F); PSB hexagonal 25 um bump array, 21.7 um row offset, ~11 lines between rows (R / F) | ectc.2016.201-f05, ectc51846.2026.00035-a-i1, ectc51846.2026.00035-f04 |
| Shielding | EMIB Vss level 50-70 % metal density (F); GSSG pair test (F); Si interposer GSGS vs GSSG, 4 levels (R / F); PSB Model A checkerboard S/G, Model B parallel + GND mesh, Model C solid GND plane (R); 4-level PI bridge CPWG over M1 or M3 GND plane, 4 x 4 um mesh in planes (R / F); Si-IF M1 power, M2/M3 signal, M4 ground (R); CoWoS-L LSI GSG test lines (T) | ectc.2016.201-f10, ectc.2016.201-f08, ectc51529.2024.00144-c-L01, ectc51529.2024.00144-f02, ectc51846.2026.00035-a/-b/-c-L01, eptc67330.2025.11392620-a-L03..-L15, eptc67330.2025.11392620-f04, ectc51906.2022.00303-a-L01..-L04, ectc51909.2023.00174-d-L02 |
| Die-edge gap (wire span between dies) | Si-IF 59 um (R); interposer TV 50-60 um (F); PVC DtD as small as 100 um (R); DBrM glue line 25 um (range 25-450, R); CoWoS-S / CoWoS-L / EMIB: N/A (sections show a mold- or underfill-filled gap of a few tens of um, E) | ectc51906.2022.00332-b-c2, ectc51909.2023.00153-f04, tcpmt.2023.3312037-a-c2, ectc51846.2026.00050-i-c1; ectc51846.2026.00051-f02, ectc51529.2024.00151-f01 (B) |
| Reported channel lengths | Si-IF 0.35 mm (R); passive interposer model 0.25 / 0.85 / 1.85 / 3.3 / 5.05 mm at 10-50 um bump pitch (R); PSB 0.4 and 2 mm (R); 4-level PI bridge 1 mm de-embedded, 2 mm CPWG (R); bridge + FOWLP XPU-OE ~3 mm (R); EMIB 5 mm (6-8 Gb/s) and 10 mm (3 Gb/s) (R); EMIB-T HBM4e ~6 mm at 12 Gb/s (R); Si interposer HBM3 7 mm (R) | ectc51906.2022.00332-b-e1, ectc32696.2021.00166-e-e1..-e5, ectc51846.2026.00035-a-e1..-e4, eptc67330.2025.11392620-a-e1, ectc51846.2026.00016-c-e1, eptc67330.2025.11392620-b-e1, ectc.2016.201-d-e1..-e3, ectc51846.2026.00051-d-e1, ectc51529.2024.00144-c-e2 |
| Lane rates (context) | EMIB 2 Gb/s x 4096 (R); EMIB-T 64 Gb/s at 55 um, 32 Gb/s at 25 um (R); SoIC_H / microbump interposer 32 Gb/s x 256 (R); Si-IF 1.1 Gb/s x 64 (R) | ectc.2016.201-a-e1, ectc51846.2026.00051-d-e2/-e3, vlsitechnologyandcir46769.2022.9830182-d-e1, ectc51906.2022.00332-b-e1 |

Mock-up guidance (estimates, template status): D2D wires run straight and parallel between the two bump fields in one
direction (x), fan in from staggered bump rows with 45-degree jogs inside each bump field (ectc.2016.201-f05,
ectc51846.2026.00035-f04, ectc51846.2026.00073-f07); levels alternate signal / ground-or-power (EMIB Vss level,
Si-IF M4 ground); wire length = die gap + escape into both bump fields, so a 1-6 mm span is consistent with the rows
above.

---

## 4. Visual description of real cross-sections (for the renderer)

Si TSV interposer
- Overall (ectc.2011.5898527-f01 a, ectc51909.2023.00135-f01, ectc51909.2023.00154-f01): a uniform grey Si slab
  ~100 um thick; a thin bright BEOL band on top (eptc59621.2023.10457670-f01: 5 x 1 um Cu levels + UBM band ~14-20 um, E from
  pixel ratio to the 10 um TSV width / 100 um TSV length); a row of microbumps above, much finer than the C4 row below; C4 / Cu pillars below at
  ~3.5-5x the microbump pitch (R ratio 150/40, 200/40). Mold fills between dies above the interposer; UF1 fillet at
  die edges, UF2 fillet at interposer edge.
- BEOL (eptc59621.2023.10457670-f01 inset, vlsitechnologyandcir46769.2022.9830182-f01 b): 5 thin Cu lines stacked
  with slotted gaps (wide plates interrupted by gaps), equal thickness; top UBM a thick plate spanning several
  TSV pitches. SoIC_H interposer SEM: rectangular Cu lines in 4-5 rows, upper rows wider / thicker (E).
- TSV (eptc59621.2023.10457670-f01, vlsitechnologyandcir46783.2024.10631478-f05): straight, constant 9-10 um
  width, 10:1 aspect; center spacing in the section ~4x diameter (E; R pitch 50-100 um); top touches M1; bottom flush with
  the backside passivation.
- Backside (eptc59621.2023.10457670-f01/-f02): two Cu RDL plates; RDL1 lands under the TSV and runs sideways as a
  wide strap, RDL2 thicker below, connected by an offset via; dark polymer passivation lens between. CoWoS 2013
  (ectc.2013.6575597-f02/-f03): no RDL, the TSV ends on the center of a C4 UBM; the C4 is a barrel ~10x the TSV
  diameter (E).
- Microbump (ectc.2011.5898527-f02, ectc51909.2023.00153-f01): Cu pillar on die side, solder cap, flat pad on the
  interposer; barrel shape with IMC band; joint height ~ 0.5x pitch (E).
- C4 Cu pillar (ectc51909.2023.00155-f09, ectc51909.2023.00154-f01 b): cylinder Cu bump on a thin Cu pad with a
  hemispherical SnAg cap (Cu 30 / SnAg 25 um R); after joining, a column with a solder waist to the substrate pad.

Foveros passive Si interposer (vlsitechnologyandcir46783.2024.10631478-f01/-f04): SIB microbumps 36 um pitch in a
continuous row; base die with 2 TSVs per package-side bump directly above it; 3 metal levels (M1-M3) with an HDMIM
trench band between M2 and M3; PSB bumps 110 um pitch, much wider than SIB.

EMIB (ectc.2016.201-f01/-f04, ectc51846.2026.00051-f02, ectc51687.2025.00051-f01)
- Bridge: a thin flat Si bar, width spanning both die edges, sitting just under the top 1-2 build-up dielectric
  levels; top BEOL a thin band (unresolved at package zoom). Die-to-die gap above it is filled with underfill / mold.
- Bumps: dense uniform fine-pitch bumps only over the bridge footprint, coarse bumps elsewhere; fine-bump height
  similar to coarse (mixed-CD bumps). Under each fine bump one short laser via drops to a bridge pad.
- Substrate below: several continuous Cu planes and a core with PTH, as in a normal FCBGA.

EMIB-T (ectc51846.2026.00051-f03/-f01/-f02)
- As EMIB, plus: TSVs drawn as thin vertical lines through the bridge in groups of 3-4; under each group a
  cavity-side solder bump (flattened barrel) onto a cavity pad; the cavity around the bridge is filled with a
  lighter dielectric / underfill; outside the bridge, large stacked tapered vias run the full build-up height.
- The bridge top BEOL is a band of ~10 thin lines (F schematic) with a MIM band at its bottom.
- 25 um FLI zoom (ectc51846.2026.00051-f01 d): slender bump columns, each aligned (with visible overlay offset)
  to a tapered micro-via.

CoWoS-L (ectc51909.2023.00174-f01/-f03/-f05, ectc51909.2023.00091-f01)
- Reconstituted interposer: mold layer with LSI chips (face up) and TIV columns at regular pitch on both sides of
  each LSI; one F/S RDL above, B/S RDL below (6 levels in the 6x TV, drawn as a thick red RDL block with Z-shaped
  routing), C4 / uBGA below with IPDs between joints.
- LSI: Si with TSV from M1 down, eDTC trenches near the top surface, 3 drawn metal levels, top Cu vias up to the F/S
  RDL. TIVs are as tall as the LSI layer; TSVs inside the LSI are thinner than TIVs.

FOCoS-Bridge / bridge-in-mold (ectc51529.2024.00151-f01/-f04, ectc51687.2025.00095-f01, ectc51687.2025.00158-f01,
ectc51909.2023.00175-f01/-f03, eptc67330.2025.11392593-f01, ectc51687.2025.00048-f01/-f03)
- Top dies -> microbumps -> 2-3 RDL levels (stacked / staggered vias) -> bottom mold with face-up bridges and tall Cu
  pillars (pillar height ~ bridge thickness + stud, up to 120-135 um R) -> bottom passivation / RDL -> C4.
- Bridge die: Si block with thin BEOL band at its top, short Cu studs on the pads; in TSV bridges a TSV pair through
  the Si onto a solder joint below. Tall pillars are straight Cu cylinders, ~1:1 top / bottom diameter.
- Embedded bridge interposer (eptc67330.2025.11392593-f01): over the bridge, NPU microbumps sit on short pads one
  RDL level above the bridge; over mold, the same bumps sit on wide Cu posts.

Si bridges with polymer RDL (eptc67330.2025.11392620-f01/-f02, ectc51846.2026.00016-f01)
- 4 Cu levels of 2 um in PI with 4 um via dielectrics; stacked via column ~15 um tall; first metal 0.87 um above Si.
  In PIC-in-mold, bridge TSVs sit directly under each 55 um Cu pillar to the FOWLP RDL.

DBHi / DBrM (ectc51846.2026.00050-f01, ectc51909.2023.00180-f01): a 60 um bridge flip-chipped under the gap between
two chips on 30 or 75 um bumps, hanging between tall 150 um-pitch Cu pillars to the laminate; no Cu wiring under
the bridge in that TV.

Si-IF (ectc51906.2022.00332-f01): straight 350 um links in parallel across a 59 um dielet gap, pillar arrays at
9.8 um pitch at both ends.

---

## 5. Visual / structural checklist (M2 items; M7 audit items)

Si TSV interposer (cowos_s, samsung_mios, peers)
- [ ] Top pad / UBM level on the interposer under every microbump (Al-Cu or Cu pad + Ni/Au or Cu).
- [ ] Top passivation with openings at microbump pads.
- [ ] 3-5 thin Cu damascene levels (1 um class) plus an optional thick top metal (Al for CoWoS 2013).
- [ ] BEOL vias stacked as staircases or short stacks; one via per IMD.
- [ ] Si core 50-110 um (production class) with straight Cu TSVs, ~10 um dia, AR ~10.
- [ ] TSV oxide liner (0.5-1 um) shown as a ring at the cut.
- [ ] TSV top lands on an M1 pad; TSV not under every microbump.
- [ ] Backside passivation after reveal.
- [ ] Backside either C4 UBM directly on TSV (CoWoS 2013) or 1-2 backside RDL levels (TSI / MIoS) with offset vias.
- [ ] 1-2 TSVs per C4 / Cu pillar, directly above it.
- [ ] C4 / Cu pillar pitch 150-200 um, 3.5-5x microbump pitch.
- [ ] D2D wires on 1-2 upper BEOL levels between SoC and HBM bump fields, with ground / power levels between.
- [ ] Relative thickness: BEOL band << Si core; microbump joint << C4 joint.

EMIB (emib)
- [ ] Thin bridge (< 75 um) embedded in the top 1-2 build-up dielectric levels, inside a cavity with adhesive.
- [ ] Bridge BEOL band with up to 4 levels + pad level; wires 2/2 um.
- [ ] Fine bumps (45-55 um) only over the bridge, coarse bumps (130 um) elsewhere.
- [ ] One fine laser via per fine bump, landing fully on a bridge pad.
- [ ] Coarse vias outside the bridge stacked down to the core.
- [ ] Bridge spans both die edges; die gap filled.
- [ ] No TSV, no bridge-bottom joints.

EMIB-T (emib_t)
- [ ] All EMIB items except "no TSV".
- [ ] TSV groups through the ~50 um bridge.
- [ ] Cavity-side solder bumps + cavity pads under TSV groups; underfill / dielectric fills the cavity.
- [ ] MIM band in lower bridge BEOL; >= 10 bridge-region metal levels.
- [ ] Fine FLI 25-45 um with tapered micro-vias aligned to bridge pads.

LSI / bridge in mold (cowos_l, ase_focos_bridge, amkor_s_connect, samsung_i_cube_e)
- [ ] Top RDL (1-3 levels) between microbumps and the bridge layer; stacked / staggered vias.
- [ ] Face-up bridge with top contacts (Cu via / Cu stud) into the RDL.
- [ ] Through-mold verticals (TIV / tall Cu pillar / Cu post) beside the bridge at 100-260 um pitch.
- [ ] Bridge-level mold the height of the bridge plus studs.
- [ ] Bottom attach: DAF (I-Cube E, S-Connect type) or solder joint for TSV bridges (FOCoS-B with TSV), TSV in LSI (CoWoS-L).
- [ ] Bottom RDL (1 level; 6 levels 11/11 um in CoWoS-L 6x) and C4 / uBGA.
- [ ] D2D wires inside the bridge BEOL (sub-um to 2 um L/S), not in the mold-level RDL.

DBHi (ibm_dbhi)
- [ ] Bridge 60 um under the chip gap on 30 / 75 um uC4; chips on 150 um Cu pillars around it; optional cavity.

---

## 6. Mapping to atlas families

Family match rules from `config/package3d/families.yaml` (2026-10-20); `families: true` in every template. A row is
**reportable** only for families whose rule matches its TV; elsewhere it is an `analog:`.

| family (rule) | reportable rows for routing | analog sources (row ids) | gaps |
|---|---|---|---|
| cowos_s (tn CoWoS / CoWoS-S) | Si 100 / 50 um: ectc.2013.6575597-a-L05, ectc51909.2023.00135-a-L04, -c-L04; Cu damascene levels repeat=3: ectc.2013.6575597-a-L04 (pitch text only); Al RDL: ectc.2013.6575597-a-L03 (text); TSV 10 x 100: ectc.2013.6575597-a-i2; ubump 40: ectc.2013.6575597-a-i1, ectc51909.2023.00135-a-i1; C4 200 SnPb: ectc.2013.6575597-a-i3; Cu pillar C4 150: ectc51909.2023.00135-a-i2; interposer 26 x 24 mm: ectc.2013.6575597-a-c3 | BEOL Cu thickness 1 um: eptc59621.2023.10457670-a-L03; backside RDL 3 um: eptc59621.2023.10457670-a-L11/-L13; TSV pitch 50: eptc59621.2023.10457670-a-i1.pitch_min_um; front pad: ectc51687.2025.00027-a-L04..-L06; C4 Cu pillar 75 dia / 30 + 25: ectc51529.2024.00155-a-i2; ubump dims 20 dia, 13/9: ectc51529.2024.00155-a-i1; D2D levels / GSGS: ectc51529.2024.00144-c-L01; HBM3 7 mm: ectc51529.2024.00144-c-e2 | L/S of damascene levels, IMD thickness, TSV liner, C4 height (only F: 65-85 um in ectc51909.2023.00135-f07), D2D lane density |
| samsung_mios (tn MIoS; papers ectc51909.2023.00154) | Si 110: ectc32696.2021.00315-a-L04, ectc51909.2023.00154-a-L09; 51 x 55 mm: ectc32696.2021.00315-a-c3; ubump layer 35: ectc32696.2021.00315-a-L03/-i1; ubump 40 / Cu pillar 50 / HBM 73: ectc51909.2023.00154-a-i3/-i4/-i5; C4 joint gap 72.2 / 67: ectc32696.2021.00315-a-i2, ectc51909.2023.00154-a-i7; Cu pillar layer 70: ectc32696.2021.00315-a-L06; backside RDL (no dims): ectc32696.2021.00315-a-L05 | TSV: ectc.2013.6575597-a-i2 or eptc59621.2023.10457670-a-i1; BEOL: eptc59621.2023.10457670-a-L03..-L07; backside RDL thickness: eptc59621.2023.10457670-a-L11; C4 pitch 150: ectc51909.2023.00135-a-i2 | TSV dims, BEOL, C4 pitch |
| cowos_l (tn CoWoS-L or LSI-) | TIV 50 / 100: ectc51909.2023.00091-a-L06/-i2; B/S RDL 6 x 11/11: ectc51909.2023.00091-a-L07; F/S RDL 1 level: ectc51909.2023.00091-a-L05, ectc51909.2023.00174-a-L03; B/S RDL 1 level: ectc51909.2023.00174-a-L06; LSI-1 0.8/0.8, 2 um: ectc51909.2023.00174-d-L02; LSI-2 2/2, 2.3 um: ectc51909.2023.00174-e-L02; uBGA 500 / 200: ectc51909.2023.00091-a-i3; RI 43 x 58 mm: ectc51909.2023.00174-a-c3; LSI GSG IL: ectc51909.2023.00174-d-e1 | LSI thickness: ectc51909.2023.00175-a-L06 (70) or ectc51846.2026.00051-a-L03 (50); LSI TSV: eptc59621.2023.10457670-a-i1; ubump 40: ectc51909.2023.00135-a-i1; C4 150: ectc51529.2024.00151-a-i4 | ubump and C4 pitch, LSI thickness, TSV dims, mold thickness, LSI count of levels (F: 3 in ectc51909.2023.00174-f03) |
| emib (tn ^EMIB$ etc.) | bridge M1-M4 2/2, via 2: ectc.2016.201-a-L02; Si 75: ectc.2016.201-a-L03/-c1; 2 x 2 mm min: ectc.2016.201-a-c1; bumps 55 / 130: ectc.2016.201-a-i1/-i2; 45: ectc51687.2025.00051-b-i1; D2D 300 IO/mm, 2 Gb/s: ectc.2016.201-a-e1; reach 5 / 10 mm: ectc.2016.201-d-e1..-e3; bridge vias (text): ectc.2016.201-a-i3/-i4 | build-up dielectric / micro-via dims: R1 substrate reference rows; bridge thickness 50: ectc51846.2026.00051-a-L03 | via dims over bridge, cavity depth, adhesive thickness, die gap |
| emib_t (tn EMIB-T or EMIB25T) | Si 50: ectc51846.2026.00051-a-L03, -b-L02; 3 x 18 mm: ectc51846.2026.00051-b-c1; >= 10 levels: ectc51846.2026.00051-d-L01; MIM: ectc51846.2026.00051-d-L02; FLI 45: ectc51687.2025.00051-a-i1; 36-110: ectc51846.2026.00051-a-i1; 25: ectc51846.2026.00051-b-i1; IO density / rate: ectc51846.2026.00051-d-e1..-e3 | TSV dims: vlsitechnologyandcir46783.2024.10631478-a-i3 (9 x 75) or eptc59621.2023.10457670-a-i1; bridge L/S: ectc.2016.201-a-L02; cavity-side bump pitch: ectc51846.2026.00050-e-i2 (175, DBrM TSV bridge) | TSV dims and pitch, cavity-side bump pitch / size, via dims |
| ase_focos_bridge (tn FOCoS.?Bridge) | RDL 10/10 x1: ectc51529.2024.00151-a-L04; 8/8: ectc51529.2024.00151-b-L08, ectc51687.2025.00095-a-L05 (x2); 5/5 x3: ectc51687.2025.00158-a-L02; ubump 55: ectc51529.2024.00151-a-i1; C4 150 / 130: ectc51529.2024.00151-a-i4, ectc51687.2025.00158-a-i1; tall pillar 120: ectc51687.2025.00095-a-i4; via 10: ectc51687.2025.00095-a-i2; bridge 6.2 x 6.4 x 8: ectc51529.2024.00151-a-c3 | bridge thickness: ectc51909.2023.00175-a-L06 (70); stud height: ectc51909.2023.00175-a-i3 (5); bridge BEOL: ectc51909.2023.00174-d-L02 | bridge thickness, pillar dia / pitch, bridge BEOL |
| amkor_s_connect (tn S-Connect) | connect die 70 um, 7 x 6 / 6 x 6 / 3 x 8 mm: ectc51909.2023.00175-a-L06/-c3, -b-c3/-c4; Cu stud 5: ectc51909.2023.00175-a-i3; tall pillar 135 / 260: ectc51909.2023.00175-a-i4; ubump 50 / 55: ectc51909.2023.00175-a-i1/-i2 | RDL L/S: ectc51687.2025.00095-a-L05 (8/8); C4: ectc51529.2024.00151-a-i4 | RDL levels and L/S, C4, pillar dia |
| samsung_i_cube_e (tn I-Cube E) | interposer 95 x 105 mm: ectc51687.2025.00048-a-c5 (all other rows text only: -L02..-L06, -i2..-i5) | Cu post: eptc67330.2025.11392593-a-i3 (70 / 150 / 100); RDL 7/7: eptc67330.2025.11392593-a-L04; bridge thickness: ectc51909.2023.00175-a-L06 | every dimension except outline |
| ibm_dbhi (tn DBHi or DBrM) | bridge 60, 2.5 x 3.2 mm: ectc51529.2024.00051-a-L04/-c2; uC4 75 / 30: ectc51529.2024.00051-a-i1, -c-i1; Cu pillar 150 / 100, standoff 110: ectc51529.2024.00051-a-i2/-L06; bottom bumps 175: ectc51846.2026.00050-e-i2 | bridge BEOL: ectc.2016.201-a-L02 | bridge BEOL, D2D |
| foveros (tn Foveros; 2.5D passive interposer TV) | SIB 36 / 18: vlsitechnologyandcir46783.2024.10631478-a-i1; PSB 110 / 70: -a-i2; TSV 9 x 75, 0.5 um SiO2: -a-i3; M1-M3 (text): -a-L02/-L05/-L06; base-die TSV 9 at 15-16 pitch: iedm19573.2019.8993637-a-i2 | BEOL thickness: eptc59621.2023.10457670-a-L03 | metal L/S and thickness |
| ucla_si_if (tn Si-IF / GaN-IF) | Si 525: ectc51846.2026.00062-c-L10; 500 + RDL 30: ectc51906.2022.00303-c-L01/-L02; M1-M4 3 um, 12/5 (simulated): ectc51906.2022.00303-a-L01..-L04; 2 levels: ectc51906.2022.00332-b-L03; pillars 4 / 9.8: ectc51906.2022.00332-b-L02/-i1; gap 59: ectc51906.2022.00332-b-c2; 64 links 0.35 mm: ectc51906.2022.00332-b-e1 | - | wire L/S on fabricated Si-IF (T: 4 um pitch) |
| cpo_module (cls cpo_module; Si-bridge rows) | Si bridge RDL 2 um x4, PI 4 um: ectc51846.2026.00016-a-L06/-L07; bridge Si + TSV: -a-L08; FS RDL 2 um / PI 5 um: -a-L03/-L04; OMIB 2/2: ectc51687.2025.00062-a-L06/-L10 | bridge CPWG rows: eptc67330.2025.11392620-a (no family) | bridge TSV dims |
| emib_3p5d (tn Co-EMIB) | none numeric (tcpmt.2023.3312037-a-c2 gap 100 um only) | EMIB rows above | everything |

No-family rows used as analogs (TV matches no family rule): ectc51529.2024.00144-c/-d (Si interposer link model),
vlsitechnologyandcir46769.2022.9830182-d (microbump interposer), eptc67330.2025.11392620-a/-b (4-level PI Si bridge),
ectc51846.2026.00016-c (bridge CPWG), ectc51846.2026.00073-a..f (Si-bridge MTV), itherm55376.2025.11235616-a
(embedded bridge substrate, no numbers).

---

## 7. Figures reviewed (viewed 2026-10-20)

| fig_id | paper | what it shows | used for |
|---|---|---|---|
| eptc59621.2023.10457670-f01 | TSI 300 mm wafer | SEM: 2 Cu TSVs, FS M1-M5 + UBM, BS RDL1/RDL2 | BEOL band, TSV shape, TSV-M1 contact, backside RDL |
| eptc59621.2023.10457670-f02 | same | SEM daisy chain: M1-M5 staircase, RDL1 strap to offset RDL2 via | via staircase, backside routing |
| eptc59621.2023.10457670-f03 | same | schematic 3-TSV chain via FS BEOL and BS RDL | via style |
| ectc.2013.6575597-f01 | CoWoS 2013 | schematic + 3D X-ray: ubump cluster, TSV, C4 | vertical chain |
| ectc.2013.6575597-f02 | same | X-SEM TSV landing on C4 center | C4-on-TSV |
| ectc.2013.6575597-f03 | same | SEM TSV / C4 UBM interface | C4-on-TSV |
| ectc.2013.6575597-f06 | same | schematic TSV + C4 EM structure through BEOL | TSV-M1, lateral BEOL path |
| ectc.2011.5898527-f01 | Xilinx 28 nm | SEM overall assembly, TSV interposer | proportions |
| ectc.2011.5898527-f02 | same | SEM microbump row and one TSV | microbump shape, offset TSV |
| ectc.2011.5898527-f04 | same | SEM C4 row; microbumps and TSVs to C4 | TSV not under microbumps |
| ectc51909.2023.00135-f01 | CoWoS MCM | section SoC / HBM / 100 um interposer / C4 | proportions |
| ectc51909.2023.00135-f04 | same | CoWoS MCM schematic, UF1 / UF2, mold, ring | layer order |
| vlsitechnologyandcir46783.2024.10631478-f01 | Foveros 2.5D | SEM MLB / SIB 36 um, TSV pairs, PSB | TSVs per PSB |
| vlsitechnologyandcir46783.2024.10631478-f04 | same | M1-M3 over TSV, HDMIM between M2-M3 | TSV -> M1 -> M3 -> SIB |
| vlsitechnologyandcir46783.2024.10631478-f05 | same | SEM TSV 9 x 75 um | TSV shape |
| iedm19573.2019.8993637-f02 | Foveros 3D | 2 TSVs from PSB to BE routing and microbumps | TSV cluster per bump |
| iedm19573.2019.8993637-f04 | same | TSV top under BE stack | TSV-BEOL contact |
| ectc51909.2023.00154-f01 | MIoS 3.5D | SEM HBM / 3D ASIC / Si interposer / Cu pillar | proportions |
| ectc32696.2021.00315-f02 | MIoS | schematic with heights 0.035 / 0.11 / 0.07 mm | layer order |
| 001c.147115-f02 | 2.5D TSV CoW | cutaway + sections: microbumps, TSV pairs to C4 | TSVs per C4 |
| vlsitechnologyandcir46769.2022.9830182-f01 | SoIC_H | schematic + interposer BEOL SEM | BEOL line shapes |
| ectc51909.2023.00155-f09 | 2.5D peer | SEM interposer bottom Cu / SnAg bumps | C4 Cu pillar shape |
| 001c.129513-f04 | Si interposer RDL | design-rule section: 4 Cu levels, staggered vias, TSV 20 um pitch | polymer RDL on Si |
| ectc51909.2023.00316-f01 | TiN TSV | SEM 29.6 x 300.9 um TSVs | TSV outlier |
| 3dic63395.2024.10830178-f01 | imec RF interposer | SEM M1 / Cu pillar / RDL1 / VIA2 / RDL2 | RDL-on-Si via shapes |
| ectc51529.2024.00144-f02 | link model | GSGS / GSSG 4-level schemes on Si | shielding |
| ectc.2016.201-f01 | EMIB | FCBGA schematic, bridges in top layers, SEM insets | EMIB layer order |
| ectc.2016.201-f04 | same | process renders: cavity, placement, lamination, fine / coarse vias | cavity, vias |
| ectc.2016.201-f05 | same | 4-row bump / trace layout and IO density formula; IO/mm/layer plot | D2D density |
| ectc.2016.201-f10 | same | Table II bridge attributes | bridge BEOL, Vss density |
| ectc51846.2026.00051-f01 | EMIB-T | EMIB25T X-SEM, 25 um FLI, via overlay | FLI / via |
| ectc51846.2026.00051-f02 | same | X-SEM EMIB vs EMIB-T | bridge proportions, TSV |
| ectc51846.2026.00051-f03 | same | EMIB-T schematic: MIM, TSV groups, cavity-side bumps | EMIB-T layer order |
| ectc51846.2026.00051-f04 | same | 36 um FLI on micro-vias, mixed bump regions | FLI on vias |
| ectc51846.2026.00051-f10 | same | IO/mm and Gb/s vs bump pitch | D2D density |
| ectc51687.2025.00051-f01 | EMIB-T 2025 | sections EMIB vs EMIB-T | bridge proportions |
| ectc51909.2023.00174-f01 | CoWoS-L | schematic RI with LSI, TIV, RDL | layer order |
| ectc51909.2023.00174-f03 | same | LSI-1 / LSI-2 build: TSV, M1, eDTC, 3 levels | LSI BEOL |
| ectc51909.2023.00174-f05 | same | daisy-chain paths ubump / TSV / TIV / C4 | vertical paths |
| ectc51909.2023.00091-f01 | CoWoS-L 6x | schematic: LSI with TSV, TIV, 6-level SC-RDL, uBGA + IPD | layer order |
| ectc51529.2024.00151-f01 | FOCoS-Bridge | schematic + SEM: D2D gap, 2-RDL, stacked via, C4 | bridge-in-mold |
| ectc51529.2024.00151-f04 | same | labelled stack with bridge, pillars, molds | layer order |
| ectc51687.2025.00095-f01 | FOCoS Bridge 3x | module schematic and sections | bridge-in-mold |
| ectc51687.2025.00158-f01 | FOCoS-B with TSV | TSV bridge with Cu studs and solder joint | TSV bridge |
| ectc51687.2025.00158-f07 | same | TMV path vs TSV path drawings | power path |
| ectc51909.2023.00175-f01 | S-Connect | SEM: connect die, tall Cu pillar, ubump on stud | S-Connect |
| ectc51909.2023.00175-f03 | same | schematic zoom of connect die and RDL | layer order |
| ectc51687.2025.00048-f01 | I-Cube E | section logic / bridge / substrate (no scale) | I-Cube E |
| ectc51687.2025.00048-f03 | same | 3D render HBM-Logic-HBM over 2 bridges and Cu posts | I-Cube E |
| eptc67330.2025.11392593-f01 | embedded bridge interposer | schematic + sections over Cu post and bridge | bridge-in-mold |
| eptc67330.2025.11392620-f01 | 4-level PI Si bridge | stack M1-M4 / VIA1-3 + SEM stacked via | bridge BEOL, via stack |
| eptc67330.2025.11392620-f02 | same | 7 CPWG sections with GND planes | shielding |
| ectc51846.2026.00016-f01 | PIC-in-mold | Si bridge section: TSV under microbumps, 4 RDL | bridge TSV |
| ectc51846.2026.00035-f04 | PSB RDL | top view lines under bump rows, 21.7 um | D2D wire layout |
| ectc51846.2026.00035-f07 | same | Models A / B / C signal-ground sections | shielding |
| ectc51846.2026.00073-f07 | Si-bridge MTV | Bridge1 layout: pillar matrices, parallel traces | D2D wire layout |
| itherm55376.2025.11235616-f01 | embedded bridge substrate | section: ABF over bridge, via on bridge pad | EMIB-like via |
| ectc51846.2026.00050-f01 | DBrM | 60 um bridge on 30 um bumps, 150 um bumps | DBHi |
| ectc51909.2023.00180-f01 | surface-DBHi | bridge under chip gap, Cu pillar C4 | DBHi |
| ectc51906.2022.00332-f01 | Si-IF | 350 um links, 9.8 um pillars, 59 um gaps | D2D length / gap |

---

## Gaps (for G1 / wave-2 template agents)

- No DB cell gives line / space for Si-interposer Cu damascene levels; only text (CoWoS < 1 um pitch, Al 5 um pitch)
  and analogs (LSI-1 0.8/0.8, iOIS 0.4/0.4). IMD thickness N/A everywhere.
- No TSV pitch or liner thickness for CoWoS-S / MIoS / CoWoS-L / EMIB-T; TSV diameter N/A for CoWoS-L, EMIB-T, FOCoS-B.
- EMIB / EMIB-T fine-via diameter, depth and land, cavity depth, adhesive thickness, cavity-side bump pitch: N/A.
- CoWoS-S D2D lane density, D2D levels and die gap: N/A (EMIB and model rows are the closest analogs).
- I-Cube E: only the outline; every routing dimension must be analog.
- Bridge-level mold thickness in CoWoS-L / FOCoS-B / S-Connect: N/A (pillar height 120-135 um bounds it).
