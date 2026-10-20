# Package3D visual audit V1 (M7): substrate / 2.5D families

Date: 2026-10-20. Auditor: V1 (fresh context). Scope: fcbga_organic, glass_core_substrate, cowos_s, samsung_mios, cowos_r,
info_os, fan_out_panel, emib, emib_t, cpo_module, ibm_dbhi. Metric M7 of DevLog-011.

Inputs
- Standard renders: `cache/package3d_renders/2026-10-20_142108/` (default, front, insets; in-scale and illustrative).
- Extra renders (driven through `window.__apa3d` + mouse-wheel zoom-to-cursor), session scratchpad `v1/out/`:
  fcbga_top_zoom, fcbga_top_zoom2, fcbga_bga_zoom, glass_top_zoom, glass_bridge_zoom, glass_bridge_zoom2 (cut y = 27.5 um,
  on a 55 um bump row), glass_bridge_xcut (x-normal cut attempt; camera orbit failed, inconclusive), emib_gap_zoom (cut on a
  bump row), emibt_xs_zoom, cowos_s_beol, cowos_s_d2h_zoom, mios_beol, mios_dieedge_zoom, cowosr_rdl_zoom, info_d2d_zoom,
  fo_rdl_zoom, compare_default (`/3d` without hash).
- Paper figures: `references/<paper>/figures/key/<fig_id>.png` (listed per family).
- Reference checklists: `config/package3d/ROUTING_REF_{substrate,si,rdl}.md` sections 4-5.

Scoring: 0 absent/wrong, 1 present but misleading, 2 recognizable with notable deviations, 3 matches the figure's structure.
Items: (a) layer order, (b) relative thickness, (c) via shape and stacking, (d) routing levels and trace density, (e) pads /
bumps / balls / joints / SR openings, (f) die-to-die wiring, (g) through-vias. Scores are for the **in-scale** section render
(the structural reference). Illustrative mode is judged separately below (it fails (b) in every family viewed). N/A = item
does not exist in the family; excluded from the mean.

## Summary table

| family | figures used (fig_id) | a | b | c | d | e | f | g | mean |
|---|---|---|---|---|---|---|---|---|---|
| fcbga_organic | ectc51687.2025.00148-f01, estc60143.2024.10712019-f09, ectc51909.2023.00155-f08 | 3 | 2 | 3 | 2 | 2 | N/A | 3 | 2.50 |
| cowos_s | ectc51909.2023.00135-f01, eptc59621.2023.10457670-f01 (TSI peer, analog for BEOL / TSV) | 3 | 3 | 2 | 2 | 2 | 2 | 3 | 2.43 |
| info_os | ectc32696.2021.00033-f05, ectc51906.2022.00232-f06 (chip-first wafer FO, analog) | 3 | 3 | 2 | 2 | 2 | 2 | 3 | 2.43 |
| ibm_dbhi | ectc51846.2026.00050-f01, ectc51909.2023.00180-f01 | 3 | 3 | 2 | 2 | 2 | 2 | 3 | 2.43 |
| fan_out_panel | 2380-4505-2020.1.000042-f02, 2380-4505-2020.1.000042-f04 | 3 | 3 | 2 | 2 | 2 | 2 | N/A | 2.33 |
| emib | ectc.2016.201-f01, ectc51846.2026.00051-f02 (a) | 3 | 2 | 2 | 2 | 2 | 2 | 3 | 2.29 |
| samsung_mios | ectc51909.2023.00154-f01, ectc32696.2021.00315-f02 | 3 | 3 | 2 | 2 | 2 | 2 | 2 | 2.29 |
| cowos_r | ectc51687.2025.00047-f01, eptc62800.2024.10909872-f01 (I-Cube R panel RDL, analog) | 3 | 3 | 1 | 2 | 2 | 2 | 3 | 2.29 |
| cpo_module | ectc51687.2025.00012-f01 (schematic only); ectc.2016.201-f01 (closest analog: no CPO build-up section in the DB); ectc51687.2025.00052-f04 viewed (FEM model, no layers) | 3 | 2 | 2 | 2 | 2 | 2 | 3 | 2.29 |
| glass_core_substrate | ectc51687.2025.00178-f01, ectc51846.2026.00134-f01 | 3 | 3 | 2 | 2 | 2 | 1 | 2 | 2.14 |
| emib_t | ectc51846.2026.00051-f03, ectc51846.2026.00051-f02 (b) | 3 | 2 | 1 | 2 | 2 | 2 | 1 | 1.86 |

Item (g) for cowos_r, info_os, emib, cpo_module, ibm_dbhi, fcbga scores the substrate PTH (the only through-via of the
family); TSV / TIV are correctly absent there.

Ranking (M7 mean, in-scale): fcbga_organic 2.50 > cowos_s 2.43 = info_os 2.43 = ibm_dbhi 2.43 > fan_out_panel 2.33 >
emib 2.29 = samsung_mios 2.29 = cowos_r 2.29 = cpo_module 2.29 > glass_core_substrate 2.14 > emib_t 1.86.
M7 target (mean >= 2) met by 10 / 11; emib_t fails.

Illustrative mode (all families viewed: fcbga c4_bga, glass sbt_xs, emib bridge_gap, emib_t bridge_xs, cowos_s ip_stack,
cowos_r rdl, info_os rdl_xs, fan_out_panel rdl_xs): item (b) = 1 everywhere. The z map inflates thin layers past thick ones
(cowos_s: 5 um BEOL drawn taller than the 100 um Si; fcbga / glass: one-side build-up drawn thicker than the 1400 / 1000 um
core; emib_t: bridge BEOL takes ~3/4 of the bridge), via stacks become thin lines spanning several levels (read as
through-vias), decimated 2/2 levels read as empty, and the illustrative inset frame is not the in-scale inset box
(cowos_r `rdl`: 0.14 mm wide in-scale vs ~3.8 mm illustrative; fcbga `c4_bga`: 2 mm box vs ~10 mm shown).

## Per family

### fcbga_organic (2.50)
Matches: SR / pad / 8 build-up levels / core Cu / plugged PTH core / mirrored side / BGA; filled tapered microvias with
lands, a stacked column with a one-land jog onto the PTH cap (as estc60143.2024.10712019-f09 "6c6"); planes with gaps;
PTH Cu wall + dark resin plug + Cu cap on both faces at 500 um pitch (ectc51687.2025.00148-f01).
Top deviations and fixes
1. Most PTHs in the cut carry no via stack (only 1-2 of ~13 in `c4_bga`); in ectc51687.2025.00148-f01 every PTH has stacks
   above and below. Fix (viewer): when a vertical net passes a grid through-via, prefer grid sites inside the routing
   window so each PTH in the cut gets a stack; or raise `io` share and place net endpoints on PTH-aligned C4 rows.
2. Build-up per side drawn ~344 um (8 x (30 + 13), 6-N-6 geometry) vs 200 um per side of the reported 8-2-8 TV (1.8 mm /
   1.4 mm core, ectc51529.2024.00265-a-c2); core / one-side ratio 4.1 vs ~7 (ROUTING_REF_substrate section 4). Documented in
   the `sbt_core` callout note; on screen it is not visible. Fix (template): add the ratio to the callout text, or show the
   reported total in the `8-2-8 substrate` label (text only, geometry stays coherent).
3. Signal levels sparse: L4 shows short dash groups with long empty gaps; ectc51909.2023.00155-f08 and
   estc60143.2024.10712019-f09 show dense dashes on every signal level. Fix (template): raise `esc` share / length on
   L2/L4/L6 and L11-L17, or (viewer) fill signal levels to the route `fill` fraction inside the window.
Also: BGA balls not cut by the default section (rows sit off y = 0), so the ball / pad / SRO joint is never seen in section;
balls are 12-16-gon faceted.

### glass_core_substrate (2.14)
Matches: thick featureless glass with dense tapered Cu-filled TGVs at 175 um pitch (ectc51687.2025.00178-f01 b), 10 thin
build-up levels per side, embedded bridges in the top levels, BGA.
Top deviations and fixes
1. D2D wiring and fine bridge vias not visible: in `bridge_gap` (cut y = 0) and in a bump-row cut (y = 27.5 um, 55 um
   rows) no fine via under the fine bumps and no Cu D2D line in the bridge is seen; the bridge is a grey striped slab
   (ROUTING_REF_si EMIB checklist: one fine via per fine bump). Fix (viewer): phase the inset cut onto the fine-bump row
   (`insetCut` snaps to the inset's first endpoint array) and draw bridge `br_sig` lines at in-scale >= 1.5 px; check why
   `bv` (bridge_via, through g_d1) is not emitted under `fine_d1/d2` in this family (it is in emib).
2. TGVs have no Cu cap / land on either face except where a net lands (one column per ~1.2 mm in `sbt_xs`);
   ROUTING_REF_substrate C checklist "Cu pad / RDL cap on both TGV ends", ectc51687.2025.00178-f04, and U-shaped lands joining
   TGV pairs in ectc51846.2026.00134-f01. Fix (viewer): draw `land_um` caps on every grid TGV in the window (same rule as PTH
   caps in fcbga, which are drawn).
3. Vertical nets sparse: one full stacked column per field of view; the first build-up level shows only L1-L2 vias under die
   pads. Fix: as fcbga fix 1.
Also: default view callouts crowd the 1 mm-thick edge strip (8 labels in ~40 px of height); illustrative `sbt_xs` draws the
glass core thinner than one build-up side.

### emib (2.29)
Matches: bridge in a cavity in the top build-up levels, die gap filled, fine bumps over the bridge with one short via each
onto a bridge pad (emib_gap_zoom, bump-row cut), coarse stacked microvias, plugged PTH core (ectc.2016.201-f01).
Top deviations and fixes
1. Bridge reads ~70 um thick in a ~150 um build-up; in ectc51846.2026.00051-f02 (a) the bridge is a thin band under the
   bump row. Value is the reported < 75 um design bound (ectc.2016.201-a-L03); fix (template): use the ~50 um generic EMIB
   value already cited for EMIB-T (ectc51846.2026.00051-a-L03) as `analog:` if the owner prefers the measured look.
2. Bridge BEOL / D2D wires are a 3-5 px band at the default `bridge_gap` zoom, only legible in illustrative (where the BEOL
   is inflated to ~half the bridge). Fix (insets): add a `bridge_beol` inset ~0.2 mm wide on a bump row so M1-M4 2/2 lines
   resolve in-scale.
3. Illustrative `bridge_gap` shows build-up levels as dense vertical comb bars (y-direction traces z-stretched). Fix (viewer):
   in illustrative mode draw cross-cut traces as squares of the level height cap, or tint the level instead of drawing
   z-stretched sections.

### emib_t (1.86, below target)
Matches: TSV bridge face-up in a cavity on cavity-side solder joints, underfilled cavity, plugged PTH under the cavity,
fine FLI over the bridge (ectc51846.2026.00051-f03, -f02 b).
Top deviations and fixes
1. TSVs: one TSV column per cavity bump at 175 um; ectc51846.2026.00051-f03 shows groups of 3-4 TSVs per backside pad (the
   template note says so). Fix (generator + viewer): via `cluster: {n: 3, sub_pitch_um: ...}` for grid through-vias (also
   wanted for Foveros, DevLog-011 T7 note); until then a callout on screen.
2. Fine vias missing under most 25 um FLI bumps (only ~6 stubs in ~0.6 mm of `bridge_xs` zoom), and the two levels above
   the bridge read as near-solid Cu (20 um pads at 25 um pitch leave ~5 um dielectric slivers); f03 / f01 (d) show one
   tapered via per FLI with discrete pads. Fix (template): over-bridge pad level at FLI pitch with `pad_um` ~= FLI diameter
   (template) and one `bridge_via` per FLI (region = bridge); (viewer) ensure every endpoint in a via region gets its via.
3. Dark wedge artifact at both bridge ends in `bridge_xs` / `bridge_edge` in-scale and illustrative (triangular dark
   polygon in the cavity, also in emibt_xs_zoom). Fix (viewer): cavity-cut of the underfill / cavity_fill box (likely a
   clipped fillet or cap face not cut by the `in:` cavity rule).
Also: cavity floor = core-top Cu (template note cites Fig. 1(c)); f03 shows the floor on a build-up level with stacked vias
below; mixed evidence, keep with the note. Illustrative `bridge_xs` is unreadable (BEOL ~3/4 of the bridge, comb of joints).

### cowos_s (2.43)
Matches: microbumps 40 um / top pads / thin BEOL (3 Cu + Al) / 100 um Si with straight 10 um TSVs, one per C4 directly
above it (CoWoS 2013) / Cu-pillar C4 at 150 um / substrate (ectc51909.2023.00135-f01). BEOL lines resolve at a 20 um zoom
(cowos_s_beol).
Top deviations and fixes
1. Mold and underfill are x-ray by default: the SoC-HBM gap reads as an air trench with a floating fillet (d2h,
   cowos_s_d2h_zoom); f01 shows the gap filled with molding compound. Fix (viewer): x-ray off for mold / underfill in
   section mode (keep the chip for users), or render the cut cap of x-rayed parts opaque.
2. BEOL via staircase (callout "BEOL via staircase to TSV") not visible at any standard inset; at 20 um zoom only a few via
   stubs; eptc59621.2023.10457670-f01/-f02 show the M1-M5 staircase. Fix (insets): add a `beol` inset (~60 um wide, 20 um
   tall) centred on a TSV so TSV -> M1 -> staircase -> top pad reads in-scale.
3. Microbumps are plain grey cylinders (no die-side Cu pillar, no solder cap / IMC band; ectc.2011.5898527-f02 per
   ROUTING_REF_si section 4); HBM drawn as one block (no core-die stack). Fix (viewer): two-part microbump (Cu pillar + solder
   cap) using the existing `height_um` split when the array has Cu / solder dims; HBM stack is a separate family (ok).

### samsung_mios (2.29)
Matches: ASIC / HBM on 35 um microbump layer, 110 um Si with TSVs and 5 thin BEOL levels (mios_beol), Cu pillar + solder
70 um to a 6-2-6 substrate, ring frame (ectc51909.2023.00154-f01 a, ectc32696.2021.00315-f02).
Top deviations and fixes
1. EMC encapsulation (the defining MIP feature) is x-rayed by default: die gaps read as air and the molded interposer edge
   is a faint glass block (`mip_edge`, `die_edge`). Fix: as cowos_s fix 1.
2. TSVs at 100 um do not sit over the ~200 um-pitch Cu pillars (only every second TSV is near a pillar); the backside RDL
   that would connect them is a 2-3 px band with no visible lateral strap. Fix (template): TSV pitch = pillar pitch or
   2 TSVs per pillar (ROUTING_REF_si "1-2 TSVs per C4, directly above it"); or (viewer) draw the backside RDL strap from
   each TSV to its pillar pad.
3. Callout "3.5D: hybrid-bonded 3D-ASIC" on a model that draws a single 2D ASIC block (backbone is the 2.5D TV). An expert
   would look for the top/bottom die and oxide gap fill of f01 (b). Fix (template): reword to "3.5D variant (not drawn)" or
   move to the notes.
Also: Cu pillar drawn as a straight Cu block with a thin solder band; f01 (b) shows a solder bulge wider than the pillar.

### cowos_r (2.29)
Matches: microbumps / 9-level RDL with rows of ~2 um square line sections and wide straps (eptc62800.2024.10909872-f01 a) /
thick power planes / via on C4 / C4 145 um / substrate; RDL thin relative to bumps and C4 (S-SWIFT proportions).
Top deviations and fixes
1. The `rdl` inset (in-scale) contains no RDL via at all, although the callout "Stacked vias 8/11 um" points into it; the
   only vertical Cu is the 45 um via on C4. ectc51687.2025.00047-f01 shows a via + cap every 35 um. Fix (viewer): snap the
   inset cut / window to a microbump row so the stacked via column under a bump is cut; (template) widen the `rdl` box to
   >= 2 microbump pitches.
2. Line rows are decimated into pairs with gaps; 2/2 um levels in f01 / eptc62800 read as a continuous comb. Fix (viewer):
   in-scale, draw every line when >= 1.5 px (it is ~17 px here), do not decimate.
3. C4 drawn as a plain solder ball with no Cu UBM / bump column and no T-shaped top bond pad under the microbumps
   (ectc51687.2025.00090-f01, ROUTING_REF_rdl section 4). Fix (template): UBM / pad keys on `c4` and `ubump` arrays (`pad_um`,
   `opening_um` already exist) and a pad level on top of the RDL.
Also: polymer hatching texture produces a moire band at 100 um zoom (cowosr_rdl_zoom); budget: three illustrative insets
2.02-4.19 M triangles (> 2 M, M8).

### info_os (2.43)
Matches: dies face-down in mold, die-pad Cu vias, RDL1-4 2/2 + RDL5 5/5, GND plane, staggered T-profile vias, D2D lines
across the logic-IO gap, UBM + C4 130 um, no interposer substrate (ectc32696.2021.00033-f05, info_d2d_zoom).
Top deviations and fixes
1. The logic-IO gap reads as an empty trench with perspective die sidewalls (mold x-ray + perspective camera; `d2d`,
   info_d2d_zoom). Fix: cowos_s fix 1 + orthographic camera for front insets.
2. Vias are filled T-pillars; ectc51906.2022.00232-f06 shows conformal cup vias (U-shaped plated into the opening), the
   chip-first wafer FO default per ROUTING_REF_rdl checklist. Fix (template): `fill: conformal` with `wall_um` on `rdl_via`
   classes (contract supports it); (viewer) draw conformal as cup + dielectric core.
3. `rdl_xs` (in-scale) shows 2/2 levels nearly empty (4-6 squares in 140 um) and no die-pad via in view. Fix: move the
   `rdl_xs` box onto the D2D edge or a die-pad row; raise d2d / escape share.
Also: `sbt_stack` illustrative 3.51 M triangles (> 2 M).

### fan_out_panel (2.33)
Matches: EMC / chips on Cu pillars / ML1 2/2, ML2 5/5, ML3 10/10 with ML3 ~3x thicker (2380-4505-2020.1.000042-f04) /
solder mask / 350 um balls (f02); D2D lines on ML1 across the chip gap.
Top deviations and fixes
1. Only the top via level (pillar pad -> ML1, trapezoid) is visible in `rdl_xs` and fo_rdl_zoom; f02 shows tapered vias in
   DL01, DL12 and DL23 under each pillar column. Fix: snap the cut to a pillar row; check that `rdl_via` classes on DL12 /
   DL23 are emitted under the pillar nets.
2. PID polymer (gold) and Cu (orange) are near-identical hues; level structure is hard to read in in-scale and
   illustrative views. Fix (viewer palette): desaturate / shift `polymer_dielectric` (e.g. toward grey-green as in f02).
3. Cu pillar has no distinct solder cap / Cu pad (f02: pillar + solder cap on Cu pad; f07: Cu 37 / Ni 3 / SnAg 15 um).
   Fix: two-part pillar rendering from the array's Cu / solder heights (same as cowos_s fix 3).
Also: balls are 12-16-gon faceted at inset zoom.

### cpo_module (2.29)
No CPO paper in the DB gives a substrate / bridge cross-section; the electrical stack is the emib analog set (template
header says so), so it is judged against ectc.2016.201-f01 plus the package schematic ectc51687.2025.00012-f01.
Matches: XPU and OIO chiplets over EMIB bridges, OIO overhang beyond the substrate edge, FAU at the chip edge, 5-2-5
substrate with plugged PTH and 500 um micro-BGA.
Top deviations and fixes
1. Variant callouts anchor on unrelated geometry: "IBM: polymer waveguide to ferrule (+3)" points at the PTH core and
   "Fine vias land on bridge pads" appears in `buildup_xs`, which contains no bridge. Fix (template / viewer): give variant
   callouts no 3D anchor (panel-only) and hide callouts whose target is outside the inset box.
2. No optical structure: the OIO chiplet is a plain die; edge couplers / V-grooves / fiber in grooves (f01) are absent and
   the FAU is a 280 um cyan block under the overhang. Acceptable as electrical-only per the header, but on screen nothing
   says so. Fix: callout "optics not modeled" on the FAU.
3. Inherits emib deviations (bridge BEOL / D2D only legible in illustrative; fine vias tiny). Fix: as emib fix 2.

### ibm_dbhi (2.43)
Matches: 60 um bridge flip-chip joined (30 um) under the chip gap, face toward the chips, 150 um Cu pillars around it,
cavity-free laminate with build-up, plugged PTH (ectc51846.2026.00050-f01, ectc51909.2023.00180-f01).
Top deviations and fixes
1. Laminate under the bridge carries planes and signal levels; ectc51846.2026.00050-f01 states "no Cu wire here in this
   test vehicle". Not wrong for a product view, but the backbone TV differs. Fix (template): keep, add the TV fact to the
   build-up callout.
2. Bridge BEOL levels are analog (EMIB) and read as a uniform band; D2D lines visible only in `br_beol`. Fix: fine; keep the
   "(analog levels)" callout, add 2/2 um in-scale LOD as emib fix 2.
3. Cu pillars drawn as orange columns without solder cap (f01 shows pillar + solder barrel). Fix: as fan_out fix 3.

## Default compare view (`/3d`, no hash)

Render compare_default: illustrative, iso, CoWoS-S / CoWoS-L / EMIB / EMIB-T, "Fit each"; 40 calls (budget limit),
1.78 M triangles.
- Readable as a catalogue overview (labels name the key structures), but no routing, bridge or interposer detail is
  legible at this camera; packages occupy ~35-40 % of each panel.
- "Fit each" gives each panel its own scale (20 mm bars of 90-115 px), so relative package size is not comparable; no
  on-panel hint.
- "z not to scale" tag appears once (top-right panel) for the whole grid.
- Callouts sit on the model and overlap section stripes; leader lines cross each other in the EMIB-T panel.
Suggested viewer behaviour: default compare to the front section at a common scale (or show "scale differs" per panel), with
one shared inset preset per family (e.g. die bump -> BGA) so the routing is visible.

## Artifacts and readability (cross-family)

| # | issue | where | fix |
|---|---|---|---|
| A1 | mold / underfill x-ray by default: die gaps read as air, molded interposer invisible | cowos_s, samsung_mios, info_os, cowos_r, fan_out_panel | x-ray off in section mode or opaque cut caps |
| A2 | perspective camera in front insets shows die sidewalls as large trapezoids in gaps | info_os d2d, fan_out_panel d2d_gap, cowos_r d2d | orthographic camera for front / section insets |
| A3 | dark triangular wedge in the cavity | emib_t bridge_xs, bridge_edge (both scales) | fix cavity cut of underfill / fillet faces |
| A4 | faceted spheres (12-16 segments) for BGA / C4 at inset zoom | fcbga, glass, emib, cpo, fan_out_panel, cowos_r | more segments at inset LOD |
| A5 | BGA rows off the default cut: balls never sectioned | fcbga, glass, emib | phase BGA grid onto the cut like grid vias |
| A6 | thin dark lines at every dielectric interface | fcbga, glass build-up zooms | drop edge lines on interior layer boundaries in section caps |
| A7 | polymer hatching moire | cowos_r RDL at 100 um zoom | lower hatch frequency with zoom |
| A8 | Cu vs PID polymer hue clash | fan_out_panel | palette |
| A9 | illustrative insets framed on a different box than in-scale; z map non-monotonic | all families viewed | see top fix 1 |
| A10 | M8 > 2 M triangles in illustrative insets | cowos_r d2d / d2h / sbt_stack (2.02-4.19 M), info_os sbt_stack 3.51 M, samsung_mios die_edge 2.06 M | cap routing instance count in illustrative window |
| A11 | references panel showed "?" for 4 process-step refs (emib_t) in the 142108 renders | emib_t | already fixed (coordinator 2026-10-20); emibt_xs_zoom shows paper ids |

## Top 10 fixes (priority order)

1. Illustrative z map: keep thickness order monotonic (a layer thicker in reality is never drawn thinner; e.g. per-layer
   z' = a + b log(1 + t / t0) with a floor) and frame illustrative insets on the in-scale `box_mm`. Affects (b) in every
   family.
2. Section cut snapping: `insetCut` snaps the cut to the nearest row of the inset's main endpoint array (fine bumps,
   microbumps, pillars, BGA) so vias, fine bridge vias, stacked RDL vias and balls are actually cut (cowos_r `rdl` shows 0
   vias; glass / emib fine vias; BGA never sectioned).
3. Mold / underfill not x-rayed in section mode (or opaque cut caps): die gaps currently read as air in 5 families.
4. EMIB-T: TSV clusters (3-4 per cavity bump; via `cluster` option) and one fine via per FLI over the bridge with discrete
   pads (over-bridge levels now read as solid Cu). Lifts emib_t above the M7 target.
5. Grid through-vias get caps and via stacks: every PTH / TGV in the routing window gets its land / cap on both faces and
   vertical nets prefer grid sites inside the window (fcbga, glass, all organic substrates).
6. Bridge BEOL / D2D legibility: in-scale bridge inset (~0.2 mm wide, on a bump row) for emib, glass, cpo, dbhi; glass
   `bv` bridge vias not emitted under fine bumps (check generator / synth).
7. In-scale signal-level density: no decimation when lines are >= 1.5 px (cowos_r 2/2 rows split into pairs) and raise
   signal-level fill toward the route `fill` so levels look like ectc51909.2023.00155-f08 / eptc62800.2024.10909872-f01.
8. Two-part bumps / pillars (Cu column + solder cap, UBM / pad under C4, T-shaped top pad): cowos_s, cowos_r, fan_out_panel,
   samsung_mios, ibm_dbhi.
9. Orthographic camera for front / section insets and callouts hidden when their target is outside the inset box
   (cpo `buildup_xs`, info_os / fan_out gap views).
10. Template text fixes: samsung_mios "3.5D hybrid-bonded 3D-ASIC" callout (structure not drawn), fcbga build-up / core ratio
    vs the reported 8-2-8 TV on screen, cpo "optics not modeled", info_os `fill: conformal` RDL vias.

## Method notes

- Custom views: `uv run --with playwright python shot.py ...` in the scratchpad `v1/` (hook `inset`, `setSection` after
  the inset, label toggle, mouse-wheel zoom-to-cursor). One x-normal orbit attempt (glass_bridge_xcut) produced an oblique
  top view; not used for scoring.
- Not checked: per-level L/S gradients by measurement (only by eye), the stiffener / ring-frame insets, BGA SR opening sizes
  in section (balls not cut). No scores were inferred from DevLog claims without a render.
- Dev server (tmux apa-app, port 47331) was used read-only; nothing restarted; no repo file changed except this report.
