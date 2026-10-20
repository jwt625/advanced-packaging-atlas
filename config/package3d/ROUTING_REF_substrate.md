# Routing reference: organic build-up substrates and glass-core substrates

Agent R1, 2026-10-20 (DevLog-011 wave 1). Feeds mock-up routing (C4 -> build-up -> core -> BGA) and metrics M2, M5,
M6, M7. Sources: `data/stack_layers.csv`, `interconnects.csv`, `components.csv`, `metrics.csv`, `test_vehicles.csv`,
`figures.csv` and 54 key-figure crops (section 7) as of 2026-10-20. No paper figure is copied anywhere.

Conventions
- Cell refs are `<row_id>.<field>` (usable as `ref:` / `analog:` specs). Row ids without a field: the value is in
  that row's numeric field named in the column header.
- Stats: min / median / max over distinct (paper, value) pairs, so 4 identical legs of one paper count once.
- `text:` = value only in a `notes` / `feature` text cell (not a numeric cell); a template can cite it only as
  `template` with `refs`, not as `ref:`.
- `fig:` = read from a figure crop (shape, proportion, label); qualitative unless a DB cell carries the number.
- `derived` = arithmetic over cited cells (formula shown). `est.` = my estimate, basis stated. N/A = DB has nothing.
- Family membership was computed with the `Matcher` of `scripts/build_package3d.py` (snapshot 2026-10-20) against
  `families.yaml`; it decides reported vs analog in section 6.

## 1. Archetypes (layer sequence top -> bottom)

### A. FCBGA n-2-n cored HPC substrate (organic core, ABF-type build-up)

Reported layer counts (build-up per side - core Cu - build-up per side):

| n-2-n | rows |
|---|---|
| 3-2-3 | ectc51909.2023.00091-a-L10/L11/L12 (CoWoS-L TV); ectc51846.2026.00375-a-L01/L07 |
| 4-2-4 | ectc51687.2025.00148-a-L05/L06 (Cu repeat 4); ectc51909.2023.00155-a-L16 (repeat 4) |
| 5-2-5 | ectc32696.2021.00125-a-L06/L08 (CoWoS-R); ectc51846.2026.00073-a-L07/L09 |
| 6-2-6 / 6-N-6 | ectc51909.2023.00154-a-L11/L13 (MIoS); estc60143.2024.10712019-b-L03/L11 |
| 7-2-7 | ectc51906.2022.00309-a-L08/L10; ectc51909.2023.00150-a-L05/L07 |
| 8-2-8 | ectc51529.2024.00265-a-L07 (L2-L8, repeat 7, plus L1 pad layer L06); ectc51529.2024.00155-a-L09; ectc51687.2025.00027-a-L11; ectc51687.2025.00187-a-L12; ectc51529.2024.00049-a.substrate_layer_count (CoWoS-R) |
| 11-2-11 | ectc51846.2026.00012-c-L02 (repeat 11) |
| 4+4-2-5 (HD layers on base) | ectc51909.2023.00235-a-L02 (HD repeat 4) / L03 (repeat 4) / L05 (repeat 5) |
| total 16 / 18 layers | 001c.147115-a.substrate_layer_count; tcpmt.2026.3672227-a.substrate_layer_count |

Element values (um):

| # | element | min / median / max | rows | notes |
|---|---|---|---|---|
| 1 | solder resist (SR) top/bottom thickness | 15 / 17.5 / 20 | ectc51909.2023.00155-a-L15 (18), estc60143.2024.10712129-g-L07 (17), ectc51909.2023.00021-a-L01 (15), ectc51846.2026.00119-a-L01 (20) | measured 17 vs design 18: ectc51909.2023.00155-a-m4 |
| 2 | SR opening, die side (C4 / FLI pad) | 52 / 52.5 / 53 (numeric, metrics) | ectc51909.2023.00155-a-m5, -b-m5 | text: 130 (ectc51529.2024.00265-a-L05 feature), 120 (ectc51687.2025.00148-a-L03 notes), 75 (ectc51846.2026.00073-a-i4 notes), 50 design (ectc51909.2023.00155-a-L15 notes) |
| 3 | top pad (C4 / FLI land) diameter | N/A numeric | - | text: 150 (ectc51529.2024.00265-a-L06 feature, at 200 pitch; ectc51687.2025.00148-a-i1 notes, at 300 pitch). Both SMD (pad > opening) |
| 4 | build-up dielectric per layer | 15 / 30 / 40 | ectc51687.2025.00148-a-L04 (40), ectc51909.2023.00155-a-L16 (15), estc60143.2024.10712129-g-L08 (15), estc60143.2024.10712019-b-L04 (30, RCC), ectc51909.2023.00021-a-L04 (30, prepreg), ectc51906.2022.00142-b-L04 (30, prepreg) | derived: ectc51846.2026.00012-c-L02 200 cumulative / 11 layers = 18.2 per layer |
| 5 | build-up Cu thickness | 12 / 15 / 20 | ectc51687.2025.00148-a-L06 (15), estc60143.2024.10712019-b-L03 (13), -L05 (18, core-adjacent L7), ectc51909.2023.00021-a-L05 (12), ectc51906.2022.00142-b-L03 (20) | |
| 6 | build-up line / space | line 2 / 19.5 / 30; space 2 / 22.5 / 50 | ectc51687.2025.00148-a-L06 (30/50), ectc51909.2023.00155-a-L16 (14/20), estc60143.2024.10712019-b-L03 (25/25), ectc51909.2023.00235-a-L02 (2/2, HD layers only) | standard build-up only (excl. HD): 14-30 / 20-50 |
| 7 | microvia top diameter (laser, filled) | 30 / 40 / 60 | ectc51687.2025.00148-a-i2 (60), ectc51909.2023.00155-a-i6 (40), ectc51909.2023.00021-a-i1 (30) | measured stacked-via widths per level 44.18-56.33: estc60143.2024.10712019-b-m5 |
| 8 | microvia bottom diameter / taper | N/A for FCBGA build-up | - | analogs in section 2 |
| 9 | microvia land (capture/target pad) | N/A for cored FCBGA | - | in-family coreless: 001c.147203-a-i1.pad_x_um 110 for 70 via; est. land/via = 110/70 = 1.57 (derived ratio, analog) |
| 10 | microvia aspect ratio (depth/diameter) | derived 0.38 / 0.67 / 1.0 | 15/40 (ectc51909.2023.00155-a-L16), 40/60 (ectc51687.2025.00148-a-L04 / -i2), 30/30 (ectc51909.2023.00021-a-i1.depth_um / diameter_um) | depth = dielectric thickness (assumption except 00021 where depth is a cell) |
| 11 | core thickness | 750 / 1220 / 2000 | ectc51529.2024.00265-a-L08 (1400), ectc51687.2025.00148-a-L07 (1200), ectc51909.2023.00155-a-L17 (1300), estc60143.2024.10712129-g-L09 (1300), ectc51846.2026.00012-c-L03 (2000), tcpmt.2026.3672227-a-L07 (1240), estc60143.2024.10712019-b-L07 (750), ectc51909.2023.00021-a-L09 (800), ectc51906.2022.00142-b-L05 (800), 001c.147115-a-L07 (1200), ectc51909.2023.00091-a-L11 (1400), ectc32696.2021.00033-c-L02 (1200), -a-L09 (1400), ectc51906.2022.00108-b-L04 (1200), ectc.2011.5898527-a-L12 (800), ectc51906.2022.00232-a-L10 (1400) | core Cu levels = 2 (repeat=2 rows, e.g. ectc51529.2024.00155-a-L10) |
| 12 | PTH (core through hole) diameter | 200 / 200 / 204.17 | ectc51687.2025.00148-a-i4 (200), ectc51909.2023.00155-a-i5 (200), estc60143.2024.10712019-b-i3 (204.17) | |
| 13 | PTH pitch | 500 (one source) | ectc51687.2025.00148-a-i4.pitch_um (= -L07.via_pitch_um) | |
| 14 | PTH aspect ratio | derived 3.7 / 6 / 6.5 | 750/204.17 (estc60143.2024.10712019-b), 1200/200 (ectc51687.2025.00148-a), 1300/200 (ectc51909.2023.00155-a) | |
| 15 | PTH wall plating, plug, land | N/A (cored HPC) | - | thin-core X-hole barrel 11-18.5: eptc62800.2024.10909809-a-m17..m20 (archetype B). Plug: fig only (section 2) |
| 16 | BGA pad (substrate) | N/A numeric | - | text: 700 SMD pad, SRO 500 (ectc51529.2024.00265-a-L10/L11 feature; -i2 notes) |
| 17 | SR opening, BGA side | 479 / 480 / 481 (numeric, metrics) | ectc51909.2023.00155-a-m6, -b-m6 | text: 500 design (ectc51909.2023.00155-a-L19 notes; ectc51529.2024.00265-a-L11 feature; estc60143.2024.10712129-g-i4 notes) |
| 18 | BGA pitch | 1000 / 1000 / 1100 | ectc51529.2024.00265-a-i2, ectc51909.2023.00155-a-i4, ectc51846.2026.00073-a-i5, ectc51909.2023.00235-a-i5, tcpmt.2026.3672227-a-i2, ectc51909.2023.00091-a-i4, ectc51909.2023.00135-a-i3, estc60143.2024.10712129-g-i4, ectc.2011.5898527-a-i4 (all 1000); 001c.147115-a-i1 (1100) | |
| 19 | BGA ball diameter | 500 / 600 / 600 | 600: ectc51529.2024.00265-a-i2, ectc51909.2023.00155-a-i4, ectc51846.2026.00073-a-i5, tcpmt.2026.3672227-a-i2, 001c.147115-a-i1; 500: ectc51529.2024.00155-a-i3, ectc51687.2025.00027-a-i3 | text: measured ball height 478, standoff 444 (ectc51909.2023.00155-a-i4 notes) |
| 20 | substrate total thickness | 800 / 1800 / 2300 | ectc51529.2024.00265-a-c2 (1800), ectc51909.2023.00155-a-c10 (1600), estc60143.2024.10712129-g-c5 (1600), tcpmt.2026.3672227-a-c2 (1964), estc60143.2024.10712019-b-c2 (1400), 001c.147115-a-c5 (2000), ectc51846.2026.00050-a-c3 (2000), ectc32696.2021.00033-a-c4 (2300), -c-c2 (1800), ectc51846.2026.00227-a-c3 (800) | |
| 21 | per-side build-up budget | derived 150 / 200 | (1800-1400)/2 (ectc51529.2024.00265-a-c2, -L08; 8 Cu levels + SR); (1600-1300)/2 (ectc51909.2023.00155-a-c10, -L17; 4 levels + SR) | 4-2-4 of 00148: 4 x 40 = 160 dielectric per side (derived, Cu embedded in the 40) |

Interconnect endpoints on the substrate top:

| endpoint | min / median / max | rows |
|---|---|---|
| C4, interposer/module -> substrate, pitch | 110 / 147.5 / 200 | itherm45881.2020.9190542-a-i1 (130), ectc51906.2022.00309-a-i4 (130), ectc51906.2022.00232-a-i2 (130), ectc51687.2025.00158-a-i1 (130), ectc51529.2024.00049-a-i2 (145), ectc51906.2022.00008-a-i3 (150), ectc51529.2024.00151-a-i4 (150), ectc51846.2026.00227-a-i2 (150), ectc51909.2023.00155-a-i3 (150, Cu pillar 75 dia), ectc.2011.5898527-a-i3 (180), ectc.2013.6575597-a-i3 (200), vlsitechnologyandcir46783.2024.10631478-a-i2 (110, dia 70) |
| FLI, monolithic die -> FCBGA, pitch | 130 / 175 / 300 | ectc51529.2024.00265-a-i1 (200, Cu pillar 90 dia), ectc51687.2025.00148-a-i1 (300, 100 dia), ectc51909.2023.00235-a-i4 (150, 90 dia), tcpmt.2026.3672227-a-i1 (130, pad_x 70) |

### B. Coreless / thin-core organic

| element | value | rows |
|---|---|---|
| coreless 10-layer AiP: Cu levels | 18 thick, L/S 30/30, repeat 10 | 001c.147203-a-L01 |
| coreless dielectric | 65 per layer, repeat 9 | 001c.147203-a-L02 |
| stacked microvia | dia 70, pitch 125, pad 110; up to 4 stacked in product, 7 and 9 stacked chains | 001c.147203-a-i1; -b-i1/-i2; fig 001c.147203-f02 |
| coreless total | 765 | 001c.147203-a-c1 |
| 3-layer ETS (embedded trace) | 85 total; L/S, Cu, dielectric N/A | ectc51529.2024.00207-a-L04, -a-c3 |
| thin core | 200 | eptc62800.2024.10909809-a-L04 |
| thin-core through hole | 80 dia, X-shape, laser both sides, Cu filled, no plug | eptc62800.2024.10909809-a-i1; fig -f01, -f04 |
| thin-core surface Cu | 10-23 | eptc62800.2024.10909809-a-L01 (min/max) |
| thin-core barrel min Cu | 11 / 14 / 18.5 (legs 1-4 at 23 surface Cu) | eptc62800.2024.10909809-a-m17..m20 |
| ultra-thin laminate (coupon) | 60 core, 2 Cu clad | tcpmt.2025.3610036-a-L04/L03 |
| thin IC carrier | 230 | eptc67330.2025.11392108-a-L05 |

Gaps: SR, BGA and FLI sizes of coreless TVs N/A; no coreless HPC (large-body) TV in the DB.

### C. Glass-core substrate (TGV in place of PTH)

Reported layer counts: 1-2-1 (icep-iaac64884.2025.11003038-e), 2-2-2 (ectc51687.2025.00178-i), 3-2-3 (001c.147214-b),
3+3 DF-PID per side (ectc51687.2025.00233-b), 4+4 (8ML, ectc51909.2023.00298-a), 10-2-10 with 2 embedded EMIB bridges
(ectc51846.2026.00134-a-L01/L04), 6 single-sided RDL (ectc51846.2026.00103-a-L01).

| # | element | min / median / max | rows | notes |
|---|---|---|---|---|
| 1 | SR | N/A in glass_core_substrate class | - | glass interposer analog: 20 both sides, ectc51906.2022.00180-b-L02/L16 |
| 2 | build-up dielectric per layer | 5 / 15 / 50 | ectc51846.2026.00199-a-L04 (15), ectc51909.2023.00298-a-L06 (15), -L03 (5, outermost GX92P), ectc51846.2026.00103-a-L04 (15), ectc51846.2026.00074-d-L04 (15), ectc51687.2025.00233-a-L01 (20, DF-PID), tcpmt.2025.3614186-b-L04 (50, model), ectc51846.2026.00389-b-L02 (30) | 210 coupon (ectc51687.2025.00178-h-L01) excluded as non-routing |
| 3 | build-up Cu | 4 / 7 / 22 | ectc51846.2026.00199-a-L01 (5), ectc51846.2026.00103-a-L01 (7), ectc51687.2025.00178-i-L01 (20), tcpmt.2025.3614186-a-L04 (22), ectc51846.2026.00389-b-L01 (4) | |
| 4 | line width (space) | 2 / 5 / 100 | ectc51909.2023.00298-a-L01 (2/2 M4), -L04 (5/5 M3), -L07 (15/15 M2); ectc51846.2026.00199-a-L05 (5/5), -L09 (10/15); 001c.147214-b-L01 (2/2 top), -L03 (100/100 inner); ectc51846.2026.00140-a-L02 (2/2) | metric: 9/12 comb, ectc51687.2025.00233-b-m6 |
| 5 | microvia diameter | 15 / 20 / 50 | ectc51909.2023.00298-a-i1 (15), ectc51846.2026.00199-a-i1 (20) .. -i4 (50) | measured 17: ectc51909.2023.00298-a-m2. Both: not fully filled (notes) |
| 6 | glass core thickness (substrate / panel TVs) | 300 / 1000 / 1100 | ectc51687.2025.00178-i-L04 (1000), 001c.147214-b-L04 (1000), ectc51846.2026.00199-a-L13 (1000), ectc51846.2026.00103-a-L05 (1100), -b-L05 (1000), tcpmt.2025.3614186-a-L06 (500), ectc51687.2025.00233-b-L08 (400), ectc51909.2023.00298-a-L13 (300), 001c.129747-h-i1.depth_um (500) | coupons 200-400 (ectc51529.2024.00093-a/b-L03, ectc51529.2024.00092-a-L01, icep-iaac64884.2025.11003038-a-L02, ectc51846.2026.00389-a-L07) |
| 7 | TGV diameter | 40 / 80 / 100 | ectc51687.2025.00178-i-i1 (90), 001c.147214-b-i1 (100), ectc51687.2025.00233-b-i1 (100), 001c.129747-h-i1 (80), ectc51529.2024.00093-a-i1 (60), -b-i1 (80), -c-i1 (40), ectc51529.2024.00092-a-i1 (49.49), ectc51906.2022.00055-c-i1 (80) | |
| 8 | TGV pitch | 75 / 167.5 / 1000 | ectc51687.2025.00178-i-i1.pitch_min_um (175), 001c.147214-b-i1 (1000), 001c.129747-h-i1 (160), ectc51529.2024.00093-i-i1 (110), ectc51529.2024.00092-a-i1 (75), ectc51846.2026.00074-e-i1 (300, model) | |
| 9 | TGV aspect ratio | 4 / 11 / 12 | ectc51687.2025.00233-b-i1 (4), ectc51687.2025.00178-i-i1 (11), ectc51529.2024.00093-h-i1 (10, conformal), -i2 (12, filled) | design matrix 2-14: ectc51529.2024.00092-d-m1..m12 |
| 10 | TGV land / RDL pad over TGV | N/A | - | fig: pad wider than TGV mouth, ectc51687.2025.00178-f04 |
| 11 | BGA | pitch 1000, ball 580 (reflowed 550) | tcpmt.2025.3614186-a-i1; -a-m12 | glass interposer analog 800 / 650: ectc51906.2022.00180-b-i7 |

## 2. Via styles

| topic | evidence |
|---|---|
| stacked microvias | ectc51687.2025.00148-a-i3 (4-stacked crack pattern; fig -f01, -f04); 001c.147203-a-i1 (max 4 stacked; 7 / 9 stacked chains, fig 001c.147203-f02); estc60143.2024.10712019-b-i2 (configs 4-2-c-2-4, full stacked, 6-c-6, 4-5stacked-4, 3-7stacked-3, 3-3-c-3-3; fig -f09, -f10, -f12); ectc51909.2023.00235-a-i6 (8 stacked-chain variants, fig -f04, -f08); ectc32696.2021.00033-a-i2 (3- and 4-tier, InFO_oS substrate); glass-embedded 2-level stack tcpmt.2026.3736233-a-i2, ectc51687.2025.00076-b-i2 |
| staggered / jogged | fig ectc51909.2023.00235-f04 (chains with 1-3 lateral jogs, HD -> std build-up -> PTH land); tcpmt.2025.3533388-a-i4 (staggered microvias, glass interposer); ectc51687.2025.00095-a-i3 + fig -f04 (staggered and stacked, fan-out RDL); fig ectc51909.2023.00298-f02 (glass 8ML: staggered offsets between M1-M4) |
| microvia taper (top / bottom, um) | no FCBGA build-up row. Analogs: 42 / 38 (ectc51687.2025.00378-a-L04 notes, glass-embedded die, 30 dielectric); 124 / 110 and 139 / 126 (tcpmt.2026.3736233-a-i1/-i2 notes); 25 / 16 (estc55720.2022.9939446-b-i1 notes, ABF over MMIC); sidewall 72 deg (ectc51687.2025.00076-b-i1 notes); 83.3 / 87.6 deg for 3-7 um vias (ectc51687.2025.00359-a-m1/-m2). Derived bottom/top 0.64-0.91 for the >= 25 um vias above (16/25, 110/124, 58/67 radius, 38/42, 126/139). Shape in figs: trapezoid, wide at top (ectc51909.2023.00235-f08, ectc51909.2023.00150-f01, estc55720.2022.9939446-f13, ectc51687.2025.00359-f02) |
| filled vs conformal microvia | filled: ectc51687.2025.00148-a-i2 ("full filling"), ectc51909.2023.00021-a-i1 (via-fill plating), 001c.147203-a-i1 (Cu-filled). Not filled / sidewall seed: ectc51909.2023.00298-a-i1, ectc51846.2026.00199-a-i1 (glass R&D coupons) |
| land / capture pad | 110 for 70 via (001c.147203-a-i1); 136 / 152 for 124 / 139 via, "pad 12 um larger than via top" (tcpmt.2026.3736233-a-i1/-i2); text: min via pad 30 for 15 via (eptc67330.2025.11392176-a-L05 notes); plate-to-via-pad gap 20 (tcpmt.2026.3736233-a-L04 notes). Fig: land 1.3-2x via top, thin disc (ectc51909.2023.00235-f08, tcpmt.2026.3736233-f09) |
| PTH wall / plug | cored HPC: wall thickness N/A. Conventional core >= 400 um: mechanically drilled, resin plug + Cu; core <= 200 um: double-side laser, pure Cu fill (fig eptc62800.2024.10909809-f04; -a-i1 notes "no resin plug"). Plugged barrels with Cu caps visible: estc60143.2024.10712019-f09/-f12, ectc51846.2026.00051-f01(c). Barrel min Cu 11-18.5 for 80 um X-hole: eptc62800.2024.10909809-a-m17..m20 |
| PTH pitch | 500 (ectc51687.2025.00148-a-i4); others N/A |
| TGV fill | filled: ectc51687.2025.00178-i-i1, ectc51846.2026.00134-a-i1/-b-i1, 001c.129747-h-i1, ectc51529.2024.00093-a-i1, tcpmt.2025.3557232-a-i1 (20 um straight); conformal: ectc51529.2024.00093-b-i1 (80/50), ectc51687.2025.00233-b-i1 (DF-PID core fill), ectc51906.2022.00180-b-i4 (ABF-filled + via-in-via -i5); partially filled: ectc51529.2024.00093-c-i1 (40 top / 60 bottom); inserted Cu pillar + resin: ectc51846.2026.00208-b-i1 |
| TGV shape | tapered straight: 60 / 30 and 80 / 50 top/bottom (ectc51529.2024.00093-a/-b-i1 notes), "80-50-70" (001c.129747-h-i1 notes), taper ~1.6 deg (ectc51846.2026.00074-e-i1 notes); hourglass 80-55-80 (icep-iaac64884.2025.11002958-f-i1, fig -f01), hourglass AR 1:5-1:40 (fig 001c.74577-f01), V-shape (fig 001c.74577-f04); X-shape 150-60-150 and 180-60-180 with 30 Cu (ectc51529.2024.00093-g-i3/-i4, simulation); straight cylindrical 20 (tcpmt.2025.3557232-a-i1) |

## 3. Plane vs signal usage, openings and pads

| topic | evidence |
|---|---|
| plane / signal alternation | ectc51529.2024.00265-a-L07/L09 feature: L3/5/7 and L12/14/16 Cu 100% or 75%, L2/4/6/8 and L11/13/15/17 0% (warpage TV; alternating plane / empty levels). Core L9/L10 100% or 75% (-L08 notes) |
| residual Cu | 93% build-up Cu (ectc51687.2025.00148-a-L06 notes): near-plane density on routed levels |
| stripline GND | pad-layer GND (top) + signal + GND on core both sides (ectc51909.2023.00021-a-L03/L05/L08/L10; fig -f03); signal via does not penetrate GND land (ectc51909.2023.00021-a-m6) |
| dual planes (glass-embedded) | Cu#1 source / Cu#2 GND planes 6-10 thick, 15-30 dielectric (ectc51846.2026.00123-a-L01/L04, tcpmt.2026.3736233-a-L01/L04) |
| GND plane under microstrip (glass) | 3-6 Cu plane (ectc51846.2026.00389-a-L03 min/max) under 72.5 / 30 ABF signal dielectric (ectc51846.2026.00389-a-L02, -b-L02) |
| finer L/S outer vs inner | finest on the outermost (die-side) levels: glass 8ML M4 2/2, M3 5/5, M1-M2 15/15 (ectc51909.2023.00298-a-L01/L04/L07/L10); 2/2 on PID top vs 100/100 inner (001c.147214-b-L01/L03); HD 2/2 layers on top of std build-up (ectc51909.2023.00235-a-L02). Organic 4-2-4: same 30/50 on all levels (ectc51687.2025.00148-a-L06, repeat 4) |
| C4 / FLI pad vs SR opening | SMD: pad 150 / SRO 130 (ectc51529.2024.00265-a-L05/L06 feature); pad 150 / SRO 120 (ectc51687.2025.00148-a-i1 notes); SRO 50 design, 52-53 measured (ectc51909.2023.00155-a-L15 notes, -m5); SRO 75 (ectc51846.2026.00073-a-i4 notes) |
| BGA pad vs SR opening | substrate SMD pad 700 / SRO 500, board NSMD 425 / SRO 500 (ectc51529.2024.00265-a-i2 notes); SRO 500 design, 479-481 measured (ectc51909.2023.00155-a-m6, estc60143.2024.10712129-g-L11 notes); board pad 400 NSMD (ectc51909.2023.00155-a-i4 notes); board pad 390 / SRO 498 measured (ectc51909.2023.00155-a-m20 / -m19) |
| surface finish | ENIG (ectc51687.2025.00148-a-L03 notes), ENEPIG BGA (ectc51846.2026.00073-a-L10), NiPdAu top / SAC on NiPdAu bottom (ectc51909.2023.00235-a-L01/L06), Ni/Au BGA (ectc51529.2024.00265-a-L10), OSP (tcpmt.2025.3614186-a-L10) |

## 4. What real cross-sections look like (renderer guidance)

Proportions below are derived from the cited cells; shapes from the cited figures.

Organic FCBGA (A):
- Core dominates: core / one-side build-up = 1200 / 160 = 7.5 (ectc51687.2025.00148-a-L07, -L05 x4) and
  1400 / 200 = 7 (ectc51529.2024.00265-a-L08, -c2). Core shows glass-cloth weave as wavy bundles (estc60143.2024.10712019-f12, ectc51846.2026.00051-f01(c)); a flat tint is enough.
- Build-up levels: thin Cu lines (12-20) inside thicker dielectric (15-40); Cu sits at the bottom of each dielectric
  (SAP, embedded). Many levels read as dense horizontal dashes (ectc51909.2023.00155-f08, estc60143.2024.10712019-f09).
- Microvias: filled trapezoids, wider at top, about as wide as or wider than the dielectric is thick (AR 0.4-1.0, row 10),
  each with a thin disc land on the level above and a wider target land below (ectc51909.2023.00235-f08,
  ectc51909.2023.00150-f01). Stacked columns look like a stepped pillar of alternating land discs and trapezoids
  (estc60143.2024.10712019-f09 "full stacked", 001c.147203-f02).
- PTH: tall barrel, AR 3.7-6.5 (row 14), Cu wall lining the hole, dark resin plug inside, flat Cu cap / land on both
  core faces (estc60143.2024.10712019-f09/-f12, ectc51846.2026.00051-f01(c)); schematic style draws it solid Cu with
  lands (ectc51687.2025.00148-f01, ectc51529.2024.00265-f05).
- Via over PTH: build-up via stacks land on the PTH cap either directly above the barrel (full-stacked;
  estc60143.2024.10712019-f09, ectc51687.2025.00148-f01) or offset by one land via a short jog (6c6 config,
  estc60143.2024.10712019-f12; ectc51909.2023.00235-f04 bottom chains).
- Fan-out jogs: the lateral move from C4 pitch (130-300) to PTH pitch (500) to BGA pitch (1000) happens on the
  build-up levels: in ectc51909.2023.00235-f04 jogs occur in the fine-wiring levels and once more in std build-up
  just above the PTH land. Derived pitch ratios: BGA/C4 1000/150 = 6.7, PTH/C4 500/300 = 1.7, BGA/PTH 1000/500 = 2.
- Planes: full-width Cu sheets with round clearance holes (antipads) where foreign vias pass; in section they read as a
  continuous line broken by short gaps around via stacks (estc60143.2024.10712019-f09 middle, 9-levels; ectc51846.2026.00051-f01(c)).
- SR: thin green layer (15-20) on both outer faces; openings are slightly smaller than the pads (SMD), so the pad edge
  is buried under SR and the solder neck sits in the opening (ectc51846.2026.00073-f01/-f02, estc60143.2024.10712129-f03).
- BGA: truncated sphere, ball 500-600 at 1000 pitch, width > SRO, flattened top and bottom at the pads; standoff
  444 vs ball 600 (text, ectc51909.2023.00155-a-i4 notes) (ectc51909.2023.00155-f02, estc60143.2024.10712129-f03).
- Embedded bridge (EMIB family): bridge in a cavity of the top 1-2 build-up levels, fine vias land on bridge pads,
  coarse vias around it (ectc.2016.201-f01, itherm55376.2025.11235616-f03, ectc51846.2026.00051-f01).

Glass core (C):
- Glass core is thick relative to build-up: 1000 core vs 2 x 15 ABF per side (ectc51846.2026.00199-a-L13, -L04/-L12;
  fig -f01); glass is featureless (no weave).
- TGVs: dense parallel columns, tapered (top wider), filled Cu, pitch about 2x diameter (175 / 90,
  ectc51687.2025.00178-i-i1; fig -f01); in the 10-2-10 EMIB glass TV adjacent TGV pairs are joined by U-shaped lands
  on both faces (ectc51846.2026.00134-f01).
- Conformal TGV: thin Cu liner on the walls continuous with the surface Cu, centre filled with polymer
  (DF-PID / ABF), small dimple over the mouth (ectc51687.2025.00233-f01, -f02; ectc51906.2022.00180-f02).
- TGV to build-up: Cu RDL pad caps the TGV, the first build-up via lands directly on that cap (stacked over TGV),
  pad wider than the TGV mouth (ectc51687.2025.00178-f04, -f02).
- Build-up on glass: thin (5-15) ABF levels with fine lines; finest L/S on the outermost levels (ectc51909.2023.00298-f02).

## 5. Visual / structural checklist (M2 presence, M7 scoring)

A. Organic FCBGA
- [ ] SR on top and bottom faces, thinner than one build-up level (15-20)
- [ ] SR openings at every C4 / FLI pad and BGA pad; opening smaller than pad (SMD)
- [ ] top pad level with discrete round pads under each C4
- [ ] N build-up Cu levels per side matching the family n-2-n (default 4-2-4 or 8-2-8)
- [ ] dielectric thicker than Cu on each level
- [ ] one microvia class per build-up dielectric, filled, tapered (top wider)
- [ ] microvia lands on both connected levels, land > via top diameter
- [ ] stacked via columns under C4 field; at least one jog / staggered segment per vertical net
- [ ] at least one plane level per side with antipads around foreign vias
- [ ] signal levels with parallel traces, L/S in 14-50 range (2/2 only on HD levels)
- [ ] core thickness 750-2000, core / one-side build-up ratio about 7
- [ ] 2 core Cu levels (core faces)
- [ ] PTH barrel through the full core with lands / caps on both faces
- [ ] PTH plug material distinct from Cu wall (cores >= 400 um)
- [ ] PTH pitch coarser than C4 pitch, finer than or equal to BGA pitch
- [ ] via stacks reach the PTH cap (direct or one-land jog)
- [ ] bottom build-up mirrors the top level count (symmetric n-2-n)
- [ ] BGA pads at BGA pitch on the bottom level, balls 500-600 at 1000 pitch
- [ ] continuous conductor chain C4 -> pad -> vias -> PTH -> vias -> BGA pad -> ball (M3)

B. Coreless / thin
- [ ] no core slab (coreless) or core <= 200 with X-shaped Cu-filled through hole
- [ ] all levels same dielectric, stacked via chains through many levels
- [ ] land 1.5x via (110 / 70) on every level

C. Glass core
- [ ] glass core slab, uniform, no weave texture
- [ ] TGV field through the full glass, tapered, filled or conformal + polymer core as the family states
- [ ] Cu pad / RDL cap on both TGV ends
- [ ] thin ABF build-up levels (5-15) both sides, symmetric count
- [ ] finest L/S on the outermost levels
- [ ] build-up microvias stacked onto TGV caps
- [ ] SR and BGA on the bottom face (if the family has board attach)

## 6. Mapping to atlas families (reported vs analog)

Reported = row TV matches the family rule (computed). Analog = any other row (cite as `analog:`).

| family | reported substrate rows (numeric) | gaps -> best analogs |
|---|---|---|
| fcbga_organic (cls organic_substrate) | ectc51529.2024.00265-a..d-L07/L08/L09 (+c2 total, i1 FLI, i2 BGA); ectc51687.2025.00148-a..c-L04..L10, -i1/-i2/-i4; ectc51846.2026.00012-c-L02/L03; tcpmt.2026.3672227-a-L07, -c2, -i1/-i2; ectc51909.2023.00021-a..c-L01/L04/L05/L09, -i1; ectc51906.2022.00142-a..e-L02..L06; estc60143.2024.10712019-b-L03..L11, -i3, -m5, -c2; ectc51909.2023.00235-a/b-L02..L05, -i4/-i5; ectc51846.2026.00119-a/b-L01 (SR 20); 001c.147203-a/b (coreless); ectc51529.2024.00207-a/b (ETS); eptc62800.2024.10909809-a (thin core) | SR opening numeric, BGA pad numeric, microvia land: analog ectc51909.2023.00155-a-m5/-m6 (si_interposer peers); land via analog ratio of 001c.147203-a-i1 (in family) |
| cowos_s (tn CoWoS) | ectc.2013.6575597-a-i3 (C4 200), -b-i1 (board pad 522); ectc51909.2023.00135-a/b/c-i3 (BGA 1000) | no build-up / core / SR numbers -> analog ectc51909.2023.00155-a (2.5D Si interposer on 4/2/4: L15..L19, i3..i6, m4..m6), estc60143.2024.10712129-g, ectc51529.2024.00155-a (8-2-8, ball 500), 001c.147115-a (core 1200, BGA 1100/600), ectc.2011.5898527-a (core 800, C4 180) |
| cowos_l | ectc51909.2023.00091-a/b-L10/L11/L12 (3-2-3, core 1400), -i3 (uBGA interposer->substrate 500 pitch, 200 high), -i4 (BGA 1000) | build-up thickness, L/S, vias -> analog fcbga rows (ectc51687.2025.00148-a) |
| cowos_r | ectc32696.2021.00125-a/b-L06/L07/L08 (5-2-5); ectc51529.2024.00049-a.substrate_layer_count (8-2-8); C4 145: ectc51529.2024.00049-a-i2, ectc51687.2025.00047-a/b-i2, ectc51687.2025.00026-a-i2; C4 150: ectc51906.2022.00008-a-i3 | core / build-up thickness N/A -> analog ectc51529.2024.00265-a (8-2-8) |
| emib (tn EMIB) | ectc51846.2026.00134-a-L01/L04 (10-2-10, but glass core); ectc.2016.201-a rows qualitative only | organic EMIB substrate numbers N/A -> analog fcbga rows; bridge-cavity layout from figs ectc.2016.201-f01, itherm55376.2025.11235616-f03 (analog TV) |
| emib_t | ectc51846.2026.00051-a-L02, -i2, -b-i2 (no numbers) | all dims analog; fig ectc51846.2026.00051-f01(c) shows plugged PTH under bridge cavity |
| info_os | ectc32696.2021.00033-a-L09 (core 1400), -c/-d/-e-L02 (1200); -a-c4 (2300), -c-c2 (1800); C4 130: -a-i4, -b-i2, itherm45881.2020.9190542-a-i1; 3/4-tier stacked via -a-i2 (no size) | build-up, vias, SR, BGA -> analog fcbga rows |
| glass_core_substrate (cls glass_core_substrate) | all C rows of section 1 except ectc51906.2022.00180-b (glass_interposer); key: ectc51687.2025.00178-i (2-2-2, TGV 90/175), 001c.147214-b (3-2-3, TGV 100/1000), ectc51846.2026.00199-a (ABF 15, Cu 5, vias 20-50), ectc51909.2023.00298-a (8ML L/S), ectc51846.2026.00134-a (10-2-10), tcpmt.2025.3614186-a (BGA 1000/580), ectc51529.2024.00093-a..i (TGV fill styles) | SR thickness, TGV land, BGA pad -> analog ectc51906.2022.00180-b-L02/L16 (SR 20), -i7 (BGA 800/650) |
| amkor_s_connect | ectc51909.2023.00175-a/b-L08 (HDBU label, no numbers), -i5 (no numbers) | all analog |
| ase_focos_bridge | C4: ectc51529.2024.00151-a-i4 (150), ectc51687.2025.00158-a-i1 (130); ectc51529.2024.00151-a-L09..L11, -b-L13..L15 (no numbers); module RDL staggered + stacked vias ectc51687.2025.00095-a-i3 (no size) | substrate build-up / core analog |
| samsung_mios | ectc51906.2022.00108-b-L04 (core 1200, FEM); ectc51909.2023.00154-a-L11/L13 (6-2-6), .substrate_layer_count | thickness / L/S analog |
| samsung_i_cube_e | ectc51687.2025.00048-a-i5 (C4, no numbers) | all analog |
| samsung_x_cube | iwlpc52010.2020.9375855-a/b-i4 (BGA 400) | rest analog |
| ibm_dbhi | ectc51909.2023.00180-a/b-L09 (laminate L/S 9/12); C4 150: ectc51906.2022.00106-a/b-i2; C4 height 65: ectc51909.2023.00180-c-i1 (FEM); laminate 2000: ectc51846.2026.00050-a-c3; SR + build-up + core layers (no numbers): ectc51687.2025.00049-c/d-L06..L08 | build-up / core thickness analog |
| foveros | vlsitechnologyandcir46783.2024.10631478-a-i2 (PSB 110 pitch, 70 dia) | substrate stack analog |
| foveros_direct, hbm_stack, soic | none | analog |
| cpo_module | ectc51687.2025.00052-b/c-i1 (C4 150), -i2 (micro-BGA 500); ectc51687.2025.00012-a, -00061-a, iedm50572.2025.11353491-a/b, ectc51687.2025.00062-a substrate rows (no numbers) | all thicknesses analog |

Out-of-family rows that are the best analogs (no template family matches them): ectc51909.2023.00155-a/b,
estc60143.2024.10712129-g/h, ectc51529.2024.00155-a..d, ectc51687.2025.00027-a/b, 001c.147115-a/b, ectc.2011.5898527-a
(si_interposer_peers); ectc51846.2026.00073-a..f (Si-bridge 2.5D MTV, 5/2/5); ectc51687.2025.00187-a..d (FO-EB 8-2-8);
ectc51906.2022.00309-a (CL-FOCoS 7-2-7); ectc51909.2023.00150-a (7-2-7); itherm55376.2025.11235616-a (embedded bridge,
8 metal levels); ectc51906.2022.00180-b (glass interposer).

## 7. Figures reviewed

| fig_id | paper | shows | used for |
|---|---|---|---|
| ectc51687.2025.00148-f01 | ectc51687.2025.00148 | 4-2-4 schematic: 1.2 mm core, TH 200/500, ABF 40, BVH 60 filled, L/S 30/50, C4 pad 150 / SRO 120 | A layout, stacked BVH over PTH |
| ectc51687.2025.00148-f03 | same | SR / ABF section with cracks, filler SEM | SR vs ABF proportion |
| ectc51687.2025.00148-f04 | same | 3D view 4-stacked via next to PTH land, resin-rich clearance | stacked via, antipad |
| ectc51529.2024.00265-f05 | ectc51529.2024.00265 | FCBGA and 2.5D on build-up + core with PTH, SR, BGA (schematic) | A layer order |
| ectc51909.2023.00155-f08 | ectc51909.2023.00155 | SEM section: core, through holes, build-up and line layers | PTH proportion, level density |
| ectc51909.2023.00155-f02 | same | package-board solder ball section | BGA shape |
| estc60143.2024.10712019-f09 | estc60143.2024.10712019 | stacked microvia widths 44-56, 6c6 and full-stacked configs, 204 um core via | stacking over PTH, plugged PTH |
| estc60143.2024.10712019-f10 | same | 6-N-6 stack-up table (Cu 13/18, RG740 30, Megtron 6 750) | B / A layer sequence |
| estc60143.2024.10712019-f12 | same | sections after thermal stress: plugged core vias, stacks offset by jog | jog over PTH |
| ectc51909.2023.00235-f04 | ectc51909.2023.00235 | stacked and jogged via chains, HD 2/2 over std build-up, onto plugged PTH | jog placement |
| ectc51909.2023.00235-f08 | same | FEA + SEM of via stack under solder: trapezoid vias, wide lands | via / land shape |
| 001c.147203-f02 | 001c.147203 | 7- and 9-stacked via chains (coreless) | B stacking |
| eptc62800.2024.10909809-f01 | eptc62800.2024.10909809 | X-shaped TH plating measurement points | thin-core TH |
| eptc62800.2024.10909809-f04 | same | conventional resin-plug PTH vs thin-core Cu-filled TH | PTH plug rule |
| ectc51909.2023.00021-f03 | ectc51909.2023.00021 | strip-line TV: pad / signal / GND layers, SR 15, prepreg 30, core 800 | plane usage |
| ectc51909.2023.00021-f11 | same | CO2 laser signal via, ~30 um | via size |
| ectc51687.2025.00359-f02 | ectc51687.2025.00359 | Cu-filled microvia row in ABF | filled via shape |
| estc55720.2022.9939446-f13 | estc55720.2022.9939446 | filled u-via through FR4 onto Cu pad | taper shape |
| ectc51909.2023.00150-f01 | ectc51909.2023.00150 | interposer on build-up substrate: big pads over tapered vias | pad / via relation |
| ectc51906.2022.00142-f03 | ectc51906.2022.00142 | FC-BGA mock-up prepreg x2 / core / prepreg x2 | A order |
| ectc.2016.201-f01 | ectc.2016.201 | EMIB FCBGA schematic with PTH core, bridges in top levels | emib layout |
| itherm55376.2025.11235616-f03 | itherm55376.2025.11235616 | embedded-bridge substrate, PTH core, BGA | emib analog |
| ectc51846.2026.00050-f01 | ectc51846.2026.00050 | DBrM: bridge on SR / build-up, 150 um bumps | ibm_dbhi |
| ectc51846.2026.00051-f01 | ectc51846.2026.00051 | EMIB-T: bridge in cavity, jogged vias, plugged PTH in cloth core | emib_t, plugged PTH |
| ectc51846.2026.00073-f01 | ectc51846.2026.00073 | C4 joints into SR openings after TC | SR opening shape |
| ectc51846.2026.00073-f02 | same | C4 joints at module corner, bump map | SR opening shape |
| ectc51529.2024.00151-f01 | ectc51529.2024.00151 | FOCoS-Bridge sections incl. C4 and stacked RDL vias | ase_focos_bridge |
| icep-iaac64884.2025.11003038-f01 | icep-iaac64884.2025.11003038 | 1-2-1 SR / build-up / core with filled vias | simple stack |
| tcpmt.2026.3672227-f04 | tcpmt.2026.3672227 | 102 mm four-die FCBGA, 0.6 mm balls 1 mm pitch, section schematic | A, BGA |
| estc60143.2024.10712129-f03 | estc60143.2024.10712129 | substrate-board joints, SR openings | BGA / SRO shape |
| ectc51529.2024.00049-f01 | ectc51529.2024.00049 | CoWoS-R structure table | cowos_r context |
| tcpmt.2026.3736233-f09 | tcpmt.2026.3736233 | stacked Via1 / Via2 with pad and plate definitions | land, antipad gap |
| ectc51687.2025.00178-f01 | ectc51687.2025.00178 | SEM: tapered filled TGVs, 175 pitch, 1.0 mm glass | C TGV |
| ectc51687.2025.00178-f02 | same | glass-core build-up schematic | C order |
| ectc51687.2025.00178-f03 | same | TGV daisy chain path through build-up | C net path |
| ectc51687.2025.00178-f04 | same | TGV landing on Cu RDL, via stacked on TGV cap | C via-over-TGV |
| ectc51846.2026.00134-f01 | ectc51846.2026.00134 | 24-layer glass-core substrate: filled TGV row, U-shaped lands, multi-level RDL | C, emib glass |
| ectc51846.2026.00134-f03 | same | X-ray and tapered filled TGVs | TGV taper |
| ectc51529.2024.00093-f01 | ectc51529.2024.00093 | filled / conformal / partially filled TGV schematics + SEM | TGV fill styles |
| ectc51529.2024.00093-f02 | same | conformal AR 10, filled AR 12 | TGV AR |
| 001c.147214-f04 | 001c.147214 | 3-2-3 glass core spec: 2/2 top, 100/100 inner, TGV 100 / 1.0 mm | C L/S gradient |
| ectc51909.2023.00298-f01 | ectc51909.2023.00298 | optical section M1-M4, 3 um and 15 um L/S | C density |
| ectc51909.2023.00298-f02 | same | 8ML stack: glass 300, ABF 15 / 5, L/S 15/15/7/2, staggered vias | C order, staggered |
| ectc51687.2025.00233-f01 | ectc51687.2025.00233 | DF-PID filled conformal TGV, dimple | conformal TGV |
| ectc51687.2025.00233-f02 | same | M1-M6 DF-PID stack, hourglass conformal TGV | C order |
| ectc51846.2026.00199-f01 | ectc51846.2026.00199 | 1 mm glass, 2 x 15 ABF per side, vias on top | C proportion |
| 001c.74577-f01 | 001c.74577 | hourglass TGV AR 1:5-1:40 | TGV shape |
| 001c.74577-f04 | same | V-shape TGV | TGV shape |
| ectc51906.2022.00180-f02 | ectc51906.2022.00180 | glass interposer: via-in-via ABF-filled TGV, ABF DL1-DL4, SR 20 | conformal + via-in-via |
| ectc51846.2026.00208-f01 | ectc51846.2026.00208 | seamed filled TGVs 10-100 um in 1 mm glass | filled TGV |
| icep-iaac64884.2025.11002958-f01 | icep-iaac64884.2025.11002958 | hourglass TGV fill vs void | hourglass |
| tcpmt.2025.3533388-f01 | tcpmt.2025.3533388 | glass interposer: hourglass thermal TGVs, microvias, backside RDL | C analog |
| ectc51846.2026.00140-f03 | ectc51846.2026.00140 | glass core with through vias, embedded-trace RDL | C schematic |

## Gaps (DB does not report)

- Microvia land / capture pad and microvia bottom diameter for any cored FCBGA build-up (only coreless and glass-embedded analogs).
- PTH plating wall thickness, plug material, PTH land diameter for cored HPC substrates; PTH pitch only from one paper.
- SR opening, C4 pad and BGA pad sizes as numeric cells (they sit in notes / feature text or metrics only).
- Microvia pitch for FCBGA build-up; antipad / clearance sizes (only one glass-embedded value, 20 um).
- Per-level Cu thickness and L/S per level of 8-2-8 HPC substrates (ectc51529.2024.00265 gives Cu ratios only).
- Glass-core: SR thickness, TGV land size, TGV wall thickness for conformal TGVs (only X-shape simulation 30 um), BGA pad.
- Which level is plane vs signal in a production HPC substrate (only test-vehicle Cu ratios and stripline TVs).
- No substrate numbers at all for amkor_s_connect, samsung_i_cube_e, emib_t, foveros_direct.
