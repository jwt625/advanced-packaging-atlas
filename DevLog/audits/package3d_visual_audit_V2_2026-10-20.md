# Package3D visual audit V2 (M7): bridge-in-mold, 3D stack and hybrid-bond families

Date: 2026-10-20. Auditor: V2 (fresh context, DevLog-011 wave 3). Read-only on the repo except this file.

Scope: cowos_l, ase_focos_bridge, amkor_s_connect, samsung_i_cube_e, soic, hbm_stack, samsung_x_cube, foveros,
foveros_direct, hybrid_bond_d2w, hybrid_bond_w2w, ucla_si_if.

## Method

- Renders: `cache/package3d_renders/2026-10-20_142108/` (cowos_l, ase_focos_bridge, hbm_stack, samsung_x_cube, foveros,
  foveros_direct, hybrid_bond_d2w, hybrid_bond_w2w) and `cache/package3d_renders/2026-10-20_135536/` (soic,
  amkor_s_connect, samsung_i_cube_e, ucla_si_if). Section views (front / inset) in-scale and illustrative.
- Probe renders against the running dev server (current viewer; `app/src/lib/three/routing.ts` was modified at 14:41,
  after both render sets): hybrid_bond_w2w `unit_cell` in-scale at cut y = 0, +0.75 um, +1.0 um (outputs in the session
  scratchpad `v2/out/`). The default-cut probe is pixel-identical in structure to the 142108 render.
- Model facts read from `app/static/data/package3d.json` (parts, layers, arrays, routing vias / nets, insets,
  `xray_default`) and the viewer code (`build.ts` array phase snap, `viewer.ts` camera, `model.ts` default x-ray).
- Figures: `references/<paper_id>/figures/key/<fig_id>.png`, chosen from `data/figures.csv` rows of the family's
  source TV papers (kind cross_section / stack_schematic / micrograph) and the figure lists in
  `config/package3d/ROUTING_REF_{si,rdl}.md`.
- Score per item 0-3: 0 absent / wrong, 1 present but misleading, 2 recognizable with notable deviations, 3 matches
  the figure's structure. Items: (a) layer order, (b) relative thicknesses, (c) via shapes and stacking style,
  (d) routing levels and trace density, (e) pads / bumps / joints and SR / passivation openings, (f) die-to-die path
  (lateral wiring for side-by-side dies; for stacked dies the vertical die-to-die path pad -> via -> metal -> TSV must
  be continuous in the section), (g) through-vias. N/A items are excluded from the mean.
- Bumps: the viewer phase-snaps endpoint arrays to the cut (`build.ts` "section polished through a row") and draws
  cut half-cylinders; the flat light rectangles in the gaps are the cut bumps, the shaded cylinders beside them are
  rows behind the plane seen through x-rayed fills. Checked: cut bumps are aligned with the TSVs in hbm_stack,
  samsung_x_cube, foveros.

## Scores

| family | a | b | c | d | e | f | g | mean M7 |
|---|---|---|---|---|---|---|---|---|
| hybrid_bond_d2w | 3 | 3 | 3 | 2 | 2 | 3 | 3 | 2.71 |
| samsung_x_cube | 3 | 3 | 2 | 2 | 2 | 3 | 3 | 2.57 |
| soic | 3 | 2 | 3 | 2 | 3 | 3 | 2 | 2.57 |
| hbm_stack | 3 | 3 | 2 | 2 | 2 | 3 | 2 | 2.43 |
| cowos_l | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2.29 |
| ase_focos_bridge | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2.29 |
| hybrid_bond_w2w | 3 | 3 | 1 | 2 | 3 | 1 | 3 | 2.29 |
| foveros | 3 | 2 | 2 | 2 | 2 | 3 | 1 | 2.14 |
| foveros_direct | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2.14 |
| amkor_s_connect | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2.14 |
| samsung_i_cube_e | 3 | 2 | 2 | 2 | 2 | 2 | 2 | 2.14 |
| ucla_si_if | 2 | 3 | 2 | 2 | 1 | 2 | N/A | 2.00 |

All 12 meet the M7 target (mean >= 2). Item-level 1s: foveros (g), hybrid_bond_w2w (c, f), ucla_si_if (e).
Common ceiling: (d) is 2 everywhere because in-scale insets resolve fine levels only as tinted slabs and illustrative
insets are unreadable for sub-um / few-um levels (see Artifacts A3); (e) is 2 for most bump families because every
solder joint is a single-material cylinder or ball (no Cu pillar / solder cap / Ni split).

## Per family

### hybrid_bond_d2w (2.71)

Figures: ectc51906.2022.00031-f04 (8-die SEM, TSV columns), ectc51906.2022.00031-f01 (DBI pad on TSV end),
ectc51906.2022.00031-f05 (Logic / Cap / Thru layer stacks). Renders: inset column, interface, gap (in-scale,
illustrative), front.

The `column` inset reproduces f04 closely: straight 5 um TSVs at 35 um aligned through four 50 um thru dies, thin bond
bands, cap die on top.

| # | deviation | fix |
|---|---|---|
| 1 | Width hierarchy flat: DBI pad 15, RDL land 15, so the T-junction of f01 (TSV < DBI pad < RDL pad) is not visible | template: RDL land > DBI pad (e.g. land 1.5x pad as template rule, status template, note f01) |
| 2 | Isolation oxide between RDL and Si (f05 a/b) absent; RDL sits directly on Si | template: add a thin `oxide` dielectric layer under `*_rdl` in host / thru / cap (thickness template, note f05) |
| 3 | RDL links drawn as 35 um `escape` stubs, not pad-to-pad daisy-chain straps (f05 a shows one RDL strap joining two DBI pads) | template: lateral net between neighbouring pads on `*_rdl` or an escape length = pitch landing on the next pad |

Artifacts: `gap` inset in-scale shows a large dark perspective wedge (die side walls converging to a vanishing point,
host top face as a grey trapezoid) (A1). Illustrative `interface` stretches the 2 um bond and 1 um RDL levels to tens
of um, pads read as tall columns (A3).

### samsung_x_cube (2.57)

Figures: iwlpc52010.2020.9375855-f02 (schematic: SRAM / ubump / logic with TSVs, red RDL both sides / Cu pillar /
substrate / BGA, mold on SRAM), iwlpc52010.2020.9375855-f01 (package SEM; ubump and Cu pillar joint zooms).
Renders: front (both), inset f2b, logic_xs, sbt_xs.

| # | deviation | fix |
|---|---|---|
| 1 | Cu pillar (logic to substrate) drawn all Cu, 55 um; f01 bottom-right zoom shows Cu pillar + solder cap onto the substrate pad | viewer / template: composite joint for `cu_pillar` arrays (Cu height + solder height, both as dims; 30 + 25 um analog ectc51529.2024.00155-a-i2 already cited in ROUTING_REF_si) |
| 2 | SRAM-logic micro-bumps single material; f01 zoom shows pillar + solder + pad | viewer: composite micro-bump (same mechanism as 1) |
| 3 | Substrate 2-2-2 thin core is a template; the level count in the f01 SEM substrate cannot be read reliably from the crop, so the deviation is unverified | none beyond the existing "(template)" callout; revisit if a level count is extracted from the paper |

Artifacts: logic_xs in-scale shows dark triangular teeth at the base of each cut pillar (rows behind, seen through
x-rayed underfill in perspective) (A1, A2).

### soic (2.57)

Figures: ectc.2019.00095-f01 (CoWoS / InFO_PoP with SoIC, schematic), vlsitechnologyandcir46769.2022.9830182-f01
(SoIC_H schematic + interposer BEOL SEM). The SoIC figures are package-level schematics without bond-level detail, so
the bond unit cell was scored against the closest analog, ectc51846.2026.00218-f01 (D2W hybrid bond SEM at 5/3/2/1 um
pitch; hybrid_bond_d2w family). Renders: inset hb_interface, die_edge, tsv_column (in-scale, illustrative).

In-scale `hb_interface` matches ectc51846.2026.00218-f01 (c): metal line / narrower HB via / 1.5 um pad / interface /
mirrored pad / via / line, pad = pitch / 2.

| # | deviation | fix |
|---|---|---|
| 1 | Die BEOL = 2 Cu levels (~3 um) on each die; a logic SoIC die has a full BEOL (vlsi...9830182-f01 b shows 4-5 rows, upper rows wider) | template: 4-6 BEOL levels with thickness growing upward (analog rows from ectc51906.2022.00179-c, status analog), keep the 1 um M1 |
| 2 | Gap fill around the 6 mm top die is x-rayed by default and reads as a void in `die_edge` | template: `xray_default: false` on gap_fill_n/s/e/w (A2) |
| 3 | TSV 5 um at 35 um pitch under every bottom micro-bump; TSV size / pitch not reported (callout says so) and SoIC_H f01 a shows TSVs sparse | template: keep as template but sparsen (e.g. TSV pitch = 2-4 bump pitches) or state "one TSV per bump assumed" in the callout |

Artifacts: illustrative `hb_interface` is a vertical barcode with no layer structure (A3).

### hbm_stack (2.43)

Figures: ectc51909.2023.00151-f01 (8Hi SEM: bump rows, TSV lines; ubump zoom), ectc51909.2023.00151-f03 (Top / 7 Core
/ Base schematic, central TSV bundle), ectc51909.2023.00179-f01 (ubump vs HCB joint). Renders: front (both), inset gap,
column, base_xs, stack_edge.

| # | deviation | fix |
|---|---|---|
| 1 | TSV under every bump (TSV pitch 36 = bump pitch) and bumps only in the same 1 mm band; f01 / f03 show bumps across the die gap with TSVs through a subset (central bundle) | template: separate bump field (full die, dummy / support bumps) from the TSV band; TSV via `regions` = central band only |
| 2 | Micro-bump single-material cylinder; f01 zoom: Cu pillar + solder + pad, TSV entering the bottom pad | viewer: composite micro-bump (Cu pillar + solder heights as dims) |
| 3 | Core-die BEOL = M1 + via + pad (~3.6 um); f01 zoom shows a multi-level BEOL band above the bump | template: 3-4 BEOL levels (analog imec TSV-middle die rows already used) |

Artifacts: `stack_edge` in-scale shows a beige diagonal wedge under the transparent side-mold wall (perspective of
`muf_1` through x-rayed mold) (A1, A2). Front in-scale is a 10.8 mm x 0.74 mm strip; structure only in insets.

### cowos_l (2.29)

Figures: ectc51909.2023.00174-f01 (CoWoS-L schematic: HBM / SoC, RI with LSI + TIV, F/S and B/S RDL, C4, substrate),
ectc51909.2023.00174-f03 (LSI-1 / LSI-2 build: TSV, 3 metal levels, top via), ectc51909.2023.00091-f01 (6x
construction: tall TIVs in mold, LSI with TSVs, thick B/S RDL with Z-routing, uBGA + IPD). Renders: front (both),
inset lsi_edge, ri_stack, lsi_ss, sbt_stack.

| # | deviation | fix |
|---|---|---|
| 1 | RI core (mold) x-rayed by default: the reconstituted interposer reads as an empty slot with ghost brown TIVs (ri_stack in-scale); f00091-f01 shows TIVs as solid Cu in mold | template: `xray_default: false` on `ri_core` (A2) |
| 2 | Insets `lsi_edge` and `lsi_ss` span 8 mm: the 75 um RI is ~10 px, LSI BEOL / D2D wires / studs invisible in-scale | template: inset span 0.3-0.5 mm centred on the LSI edge under the HBM-SoC gap, z range RI only (2179-2300 um) |
| 3 | LSI-to-RDL contact: 5 um stud layer drawn as `mold_compound` with 18 um studs, no visible top Cu via on the LSI (f03 last step shows a Cu via cap on top metal) | template: stud / via land visible (land > via), material of the stud layer = mold kept; check the stud draws at inset scale after fix 2 |

Other: B/S RDL is the 1-level TV (00174-a); the 6x production stack (6 x 11/11, 00091-a-L07) is only a callout.

### ase_focos_bridge (2.29)

Figures: ectc51529.2024.00151-f01 (schematic + SEM: 2-RDL, ubump on stacked via, C4 = Cu pillar + solder),
ectc51687.2025.00095-f01 (FO module schematic + D2D gap SEM). Renders: front (both), inset module_stack, bridge_edge,
sbt_stack, module_edge.

| # | deviation | fix |
|---|---|---|
| 1 | Tall Cu pillars ghosted (mold `ri_core` x-rayed) | template: `xray_default: false` on `ri_core` (A2) |
| 2 | C4 drawn as a solder ball; f01 (E) shows the C4 as Cu pillar + solder cap under a pad | viewer / template: composite C4 (Cu post + solder) |
| 3 | FO-RDL vias plain cylinders; ectc51687.2025.00095-f04 (staggered / stacked) shows T-profile filled vias (stem ~0.45x pad) | template: `land_um` >= 2x via (now 22 vs 10, ok) plus taper `bottom_diameter_um` < `diameter_um`; viewer: draw the land as a cap so the T-profile reads |

Artifacts: `bridge_edge` 7.2 mm span (A4); illustrative `module_stack` framed at 500 um scale (A3). References panel
showed `R551 ?` in the 142108 render; the current JSON has the paper (fixed by the coordinator after the render).

### hybrid_bond_w2w (2.29)

Figures: ectc51529.2024.00057-f07 (3-tier FIB-SEM: MZ / 2 HBV / HBM pad pair / TSV landing), ectc51529.2024.00057-f08
(HBM / HBV / MZ schematic), ectc51529.2024.00218-f01 (WoWoW STEM, tapered via-last TSVs). Renders: inset unit_cell,
f2b_tsv, stack_edge; probes at cut 0, +0.75, +1.0 um.

| # | deviation | fix |
|---|---|---|
| 1 | HBVs not visible at any probed cut: pads float on the HBV dielectric with no Cu link to MZ (f07: 2 HBVs per pad in the section; callout "HBV 0.6 um, 4 per pad") | viewer / template: draw the HBV class as a 2 x 2 sub-grid per pad (count from the callout row) with one row phase-aligned to the cut |
| 2 | Because of 1 the vertical tier-3 -> tier-2 -> tier-1 path is broken in the section (item f) | same fix |
| 3 | TSV straight 1 um; ectc51529.2024.00218-f01 (WoWoW) shows tapered via-last TSVs (wide at backside) | template: optional `bottom_diameter_um` for the w2w TSV only if a W2W TV with taper is the backbone; for the 00057 backbone (straight TSV in f06) keep straight, add the taper as a variant callout |

Artifacts: illustrative `unit_cell` framed at 50 um scale: a barcode of decimated stripes, no unit cell (A3).

### foveros (2.14)

Figures: iedm19573.2019.8993637-f01 (F2F ubump row, base TSV pairs, package bumps), iedm19573.2019.8993637-f02 (TSV
pair onto a package-side bump pad), vlsitechnologyandcir46783.2024.10631478-f01 (top die / MLB-SIB / base die TSVs /
PSB / substrate). Renders: front (both), inset tsv_column, base_gap, die_edge, sbt_stack.

| # | deviation | fix |
|---|---|---|
| 1 | One 9 um TSV per 110 um package bump; f01 / f02 show TSV pairs (clusters at 15-16 um pitch, iedm19573.2019.8993637-a-i2) per bump. Callout "TSV 9 um, 15 um pitch" contradicts the drawn 110 um | generator + viewer: TSV-cluster grid (n TSVs at the reported 15 um sub-pitch per endpoint site; DevLog-011 feature idea); interim template: 2 TSVs per PSB |
| 2 | No backside pad / RDL under the TSV: TSV ends on the bump directly; f02 shows a Cu pad between TSV pair and PSB solder | template: backside pad level on base die (thickness template) |
| 3 | Micro-bumps single material; vlsi...10631478-f01 inset: MLB Cu / Ni / solder over SIB Cu / Ni / Cu / solder | viewer: composite micro-bump |

Also: top tile 50 um vs base 86 um; vlsi...f01 shows the top die thicker than the base die (b = 2). Artifacts:
illustrative `die_edge` is a transparent perspective box (A1, A2).

### foveros_direct (2.14)

Figures: iedm45625.2022.10019499-f02 (3 um pitch: HB pad / HB via / top metal), iedm45625.2022.10019499-f05 (QMC:
support Si, top chiplets, HB interface, base chiplets with TDVs in oxide, package bumps), ectc32696.2021.00166-f01
(daisy-chain SEM), ectc32696.2021.00166-f07 (F2F solder vs hybrid). Renders: front (both), inset hb_interface,
top_gap, tsv_column, sbt_stack.

| # | deviation | fix |
|---|---|---|
| 1 | Oxide gap fill between top dies (`fill`, material oxide) x-rayed by default: reads as an empty gap in `top_gap` | template: `xray_default: false` on `fill` (A2) |
| 2 | Pad 3.5 um per side vs HB via 0.5 um: f02 shows via height ~ pad height and via width ~ 1/2 pad; the HBV is not discernible in hb_interface | template: pad thickness from a 9 um pitch row if one exists, else analog with via:pad ~ 1:1 (f02); viewer: same HBV sub-grid fix as w2w |
| 3 | TSV one per PSB at 110 um ("TSV drawn, not dimensioned"); QMC f05 shows grouped TSV / TDV columns | as foveros fix 1 |

### amkor_s_connect (2.14)

Figures: ectc51909.2023.00175-f01 (SEM: connect die under ASIC / HBM, tall Cu pillars 135 um, ubump on Cu stud, C4),
ectc51909.2023.00175-f03 (schematic: 2 top RDL with tapered vias, connect die with BEOL, thin attach layer, bottom
RDL, bumps). Renders: front, inset module_stack, bridge_edge, sbt_stack, module_edge.

| # | deviation | fix |
|---|---|---|
| 1 | `lsi_gap` (60 um, material not described) renders as a solid grey block under the connect die, ~45 % of the mold height; f03 shows the die filling the layer above a thin attach film | template: keep the derived 60 um but render it as the 1st-mold EMC (kind mold, x-ray off) with the "medium not described" note, so it does not read as a second Si slab |
| 2 | Tall pillars ghosted (x-rayed `ri_core`), and in-scale shows shaded uncut pillar cylinders behind the cut | template: `xray_default: false` on `ri_core`; viewer: orthographic section camera (A1, A2) |
| 3 | RDL vias straight cylinders; f03 shows tapered funnel vias with caps; C4 balls vs f01 (b) Cu post + solder | template taper + viewer composite C4 (as FOCoS) |

### samsung_i_cube_e (2.14)

Figures: ectc51687.2025.00048-f02 (SEM: pillar + solder on RDL pad, tapered via narrowing downward to a Cu post in
filled mold), ectc51687.2025.00048-f03 (structure schematic: bridges between Cu posts, RDL both sides, C4),
ectc51687.2025.00048-f01 (package SEM). Renders: front, inset interposer_stack, bridge_edge, ll_bridge, sbt_stack.

| # | deviation | fix |
|---|---|---|
| 1 | Upper RDL via onto the Cu post drawn straight 10 um; f02: via tapers downward and the post is wider than the via, dielectric undulates over pads | template: `bottom_diameter_um` < `diameter_um` on `rv_f_2` (template, note f02) |
| 2 | Cu posts ghosted (x-rayed `ri_core`) | template: `xray_default: false` on `ri_core` |
| 3 | Logic / HBM bumps single material; f02: Cu pillar + solder cap | viewer: composite micro-bump |

All dimensions except the outline are analog / template (ROUTING_REF_si 1.4), so (b) is 2 by construction.
Artifacts: bridge_edge / ll_bridge 8 mm span (A4).

### ucla_si_if (2.00)

Figures: iedm45741.2023.10413759-f01 (GaN/Si-IF bond SEM: 2 um Cu pad / 3 um Cu pillar / 2 um Cu pad, recessed SiO2,
gap), ectc51846.2026.00062-f02 (3D on Si-IF: trapezoid dielet pad on IF pillar, bonding interface). The backbone paper
ectc51906.2022.00332 has only top views (ectc51906.2022.00332-f01: 9.8 um pillars, 350 um links, 59 um gap), used for
the link layout only. Renders: front (both), inset joint, gap, edge.

| # | deviation | fix |
|---|---|---|
| 1 | Dielet side has no Cu pad, no passivation and no BEOL: the joint is a 0.5 um dark seam between the IF pillar and bare Si; both figures show a 2 um dielet-side Cu pad on the pillar | template: add dielet bottom layers (passivation + Cu pad level; 2 um pad thickness is labelled in iedm45741.2023.10413759-f01 c: use a DB row if one carries it, else template with that fig_id in the note) and draw the joint as Cu |
| 2 | IF pillar a straight 4 um cylinder; both figures show trapezoid pillars (wider at the base) in a recessed oxide | template: `bottom_diameter_um` > `diameter_um` on `pil_base` (template, note figures) |
| 3 | 350 um links across the 59 um gap not legible: in-scale they are a slab, illustrative shows one short Cu block under the gap | viewer: in `gap` inset draw the lateral D2D net as continuous lines across the gap on if_m2 / if_m1 (share 0.1 is too sparse to read; raise the drawn share in the gap band or add a dedicated inset across the links) |

## Artifacts and readability (cross-family)

| id | issue | where | fix |
|---|---|---|---|
| A1 | Perspective camera in section presets: converging die walls (dark wedge), receding bump rows, triangular "teeth" at pillar bases | hybrid_bond_d2w gap, hbm_stack stack_edge, foveros die_edge, foveros_direct top_gap, samsung_x_cube logic_xs, amkor_s_connect module_stack | viewer: orthographic camera for Front / Right presets and all insets when Section is on (`viewer.ts` uses `PerspectiveCamera` only) |
| A2 | Structural fills x-rayed by default (`xray_default: true`) render as voids and ghost the vias inside them | `ri_core` in cowos_l, ase_focos_bridge, amkor_s_connect, samsung_i_cube_e; soic gap_fill_*; foveros_direct `fill`; hbm_stack muf_* | template: `xray_default: false` for fills that carry interconnect (RI core, gap fill, MUF); keep x-ray for top-die mold / lid |
| A3 | Illustrative insets unreadable: barcode stripes (soic hb_interface, w2w unit_cell), bond / RDL levels stretched taller than Si (d2w interface), framing at 50-500 um scale (w2w unit_cell, focos module_stack) | 6+ insets | viewer: for insets, cap the illustrative per-interval stretch (e.g. <= 3x) or fall back to in-scale when the inset z-range < ~50 um; frame illustrative insets on the inset box |
| A4 | Bridge insets span 7.2-8 mm, so the bridge (75-100 um) is ~10 px and its BEOL / D2D wires / studs are not visible in-scale | cowos_l lsi_edge, lsi_ss; ase_focos_bridge bridge_edge; amkor_s_connect bridge_edge; samsung_i_cube_e bridge_edge, ll_bridge | template: span 0.3-0.5 mm on the bridge edge, z range = module only |
| A5 | Si-IF joint drawn as a dark jagged seam | ucla_si_if joint | see ucla_si_if fix 1 |
| A6 | References panel `R551 ?` | ase_focos_bridge (142108) | already fixed in the current JSON (R551 -> ectc51687.2025.00095) |

## Overall ranking (M7 mean)

1. hybrid_bond_d2w 2.71
2. samsung_x_cube 2.57
3. soic 2.57
4. hbm_stack 2.43
5. cowos_l 2.29
6. ase_focos_bridge 2.29
7. hybrid_bond_w2w 2.29
8. foveros 2.14
9. foveros_direct 2.14
10. amkor_s_connect 2.14
11. samsung_i_cube_e 2.14
12. ucla_si_if 2.00

## Top 10 fixes (priority order)

1. `xray_default: false` on interconnect-bearing fills: `ri_core` (cowos_l, ase_focos_bridge, amkor_s_connect,
   samsung_i_cube_e), soic `gap_fill_*`, foveros_direct `fill`, hbm_stack `muf_*` (A2).
2. Orthographic camera for Front / Right presets and insets in section mode (A1).
3. Bridge insets: span 0.3-0.5 mm on the bridge edge, z = module only (A4); then re-check D2D wires and studs in-scale.
4. hybrid_bond_w2w (and foveros_direct): draw HBVs as a per-pad sub-grid (4 per pad per callout) with a row on the cut;
   restores the vertical path (w2w items c, f).
5. Foveros / Foveros Direct: TSV-cluster grid (n TSVs at the reported 15 um sub-pitch per package-bump site), interim
   2 per PSB; removes the callout / render contradiction; add a base-die backside pad.
6. Composite joints: micro-bump / C4 / Cu pillar as Cu pillar + solder cap (+ pad), heights as dims (x_cube, hbm,
   foveros, focos, s_connect, i_cube_e).
7. Illustrative insets: cap z-stretch or use in-scale for thin insets; frame on the inset box (A3).
8. ucla_si_if: dielet-side passivation + 2 um Cu pad (analog) and trapezoid IF pillar; joint drawn as Cu.
9. Bridge-in-mold RDL vias: taper (`bottom_diameter_um`) and a visible land cap (T-profile) for FOCoS / S-Connect /
   I-Cube E; I-Cube E via onto post tapers downward (f02).
10. hbm_stack: bump field over the whole die gap (dummy / support bumps) with TSVs only in the central band; S-Connect
    `lsi_gap` rendered as mold, not a solid block.
