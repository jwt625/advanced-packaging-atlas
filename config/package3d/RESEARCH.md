# 3D package viewer: family research notes

Date: 2026-10-19. Scope: verified family list, physical topology per family, database coverage, sources. Companion
to `config/package3d/families.yaml` (DevLog-008). Reading order for a template author: section 1 (decisions), the
comparison tables (section 2), then the family section.

Conventions:
- `db:<paper_id> <locator>` = cached paper `references/<paper_id>/text.md` plus the page/section/figure locator.
  `url:` = public web page checked 2026-10-19, tagged primary (company / standards text) or secondary (trade press).
- Parts are listed top to bottom in the final orientation (heat-sink side up, board side down).
- Numbers are copied from database rows or the cited page. Where nothing citable gives a value, it says
  `not reported`, and the template must mark that value `template`.
- "Uncertain" marks topology statements we could not tie to a citable source.

## 1. Decisions

Final list: 23 families illustrated (`include: true`), 12 kept as non-illustrated entries (merged, peer data, or out
of scope). Changes from the starting proposal:

| proposal item | decision | why |
|---|---|---|
| CoWoS-S / -R / -L | kept (3 families) | 3 / 8 / 2 papers |
| InFO (InFO_oS / InFO_PoP) | InFO_oS kept; InFO_PoP `include: false` | InFO_PoP: 1 TV, no geometry, mobile scope |
| SoIC | kept | 7 papers |
| EMIB, EMIB-T, Foveros, Foveros Direct | kept (4) | 6 / 2 / 3 / 5 papers |
| (added) EMIB 3.5D / Co-EMIB | `include: false` | composite of EMIB + Foveros; DB TVs carry no geometry |
| glass core (Intel / Absolics) | kept as one vendor-neutral family | 14 papers; Absolics has only coupon/panel TVs |
| Samsung I-Cube (S / E) | split: `samsung_mios` (Si interposer, "I-Cube S class") + `samsung_i_cube_e`; I-Cube R `include: false` | MIoS papers carry the geometry; I-Cube R topology = CoWoS-R |
| Samsung X-Cube | kept | 2 papers (one only via HCB) |
| ASE FOCoS(-Bridge) | FOCoS-Bridge kept; FOCoS chip-last `include: false` | chip-last FOCoS topology = RDL interposer (cowos_r) |
| Amkor S-SWIFT / S-Connect / HPLT | S-Connect kept; S-SWIFT and HPLT `include: false` | S-SWIFT: 1 TV, no geometry, = RDL interposer; HPLT is a panel process platform, covered by fan_out_panel |
| panel-level fan-out | kept (`fan_out_panel`, vendor-neutral, Deca M-Series / nepes as main named variant) | 21 papers |
| CPO module | kept (generic) ; TSMC COUPE as variant note (`tsmc_coupe` false) | 9 papers; COUPE TVs have no geometry |
| hybrid bonding W2W / D2W | kept as two generic families | 15 / 9 papers; look different (full-wafer tiers vs smaller dies with gap fill) |
| HBM stack (MR-MUF / TC-NCF) | kept, includes hybrid-bond HBM variant | 6 papers; reused inside every HBM 2.5D template |
| (added) FCBGA baseline | kept, priority 1 | shared substrate sub-template + compare baseline; 27 papers |
| (added) IBM DBHi / DBrM | kept | 5 papers, 16 TVs; a third bridge placement (bridge joined to the dies first) |
| (added) UCLA Si-IF | kept, priority 3 | 5 papers; substrate-less wafer-scale extreme |
| (added) peer sets | `si_interposer_peers`, `bridge_fanout_other` (`include: false`) | vendor-neutral TVs with better geometry, used as `derived`/`template` support with their own references |
| (added 2026-10-20, audit M7) peer sets | `microbump_d2w_peers` (50 physical microbump_3d TVs outside the named families), `organic_interposer_peers` (IBM, Resonac and other organic RDL interposers) | peer data for foveros / samsung_x_cube / hbm_stack and cowos_r |

Priority 1 (first template wave): fcbga_organic, cowos_s, cowos_r, cowos_l, soic, emib, emib_t, foveros, hbm_stack.

### Matching rules and counts

Counts in `families.yaml` come from a read-only scan of `data/test_vehicles.csv`, `components.csv`,
`stack_layers.csv`, `interconnects.csv`, `papers.csv` (239 papers, 770 TV rows). Each family has a `match_rule`
(regex on `technology_name`, `package_class`, explicit paper list, or interconnect level). `db_physical_tvs`
excludes `tv_kind=simulation_model`; simulation TVs are counted separately and almost never carry geometry
(best simulation score 7.7 in `si_interposer_peers`, below 6 elsewhere).

Pinned representative TVs (topology relevance over raw score): fcbga_organic (100x100 mm 8-2-8 HPC FCBGA ahead of
an AiP module), glass_core_substrate (Intel 10-2-10 with EMIB first), cpo_module (Intel XPU + OIO first), emib,
samsung_mios, soic, foveros_direct, fan_out_panel.

Geometry coverage per included family (physical TVs with at least one value):

| family | papers | TVs | outline | die x/y | die t | >=3 layer t | ic pitch | ic d+h |
|---|---|---|---|---|---|---|---|---|
| fcbga_organic | 27 | 48 | 22 | 12 | 9 | 19 | 14 | 9 |
| cowos_s | 3 | 7 | 4 | 4 | 0 | 0 | 5 | 0 |
| (si_interposer_peers) | 15 | 33 | 25 | 24 | 23 | 22 | 23 | 19 |
| cowos_r | 8 | 25 | 12 | 6 | 0 | 0 | 8 | 0 |
| cowos_l | 2 | 7 | 5 | 0 | 0 | 1 | 2 | 0 |
| info_os | 3 | 6 | 3 | 1 | 0 | 0 | 3 | 0 |
| soic | 7 | 13 | 1 | 1 | 0 | 0 | 6 | 0 |
| emib | 6 | 11 | 2 | 1 | 1 | 0 | 2 | 0 |
| emib_t | 2 | 5 | 2 | 1 | 2 | 0 | 3 | 0 |
| foveros | 3 | 5 | 0 | 0 | 1 | 0 | 2 | 0 |
| foveros_direct | 5 | 8 | 0 | 1 | 0 | 0 | 7 | 0 |
| hbm_stack | 6 | 11 | 0 | 1 | 2 | 0 | 2 | 0 |
| samsung_mios | 3 | 3 | 2 | 1 | 1 | 1 | 1 | 0 |
| samsung_x_cube | 2 | 5 | 3 | 2 | 0 | 0 | 5 | 0 |
| samsung_i_cube_e | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 |
| ase_focos_bridge | 3 | 4 | 3 | 1 | 0 | 0 | 2 | 0 |
| amkor_s_connect | 1 | 2 | 2 | 2 | 1 | 0 | 2 | 0 |
| ibm_dbhi | 5 | 16 | 4 | 8 | 8 | 0 | 12 | 0 |
| glass_core_substrate | 14 | 45 | 9 | 0 | 0 | 11 | 10 | 0 |
| fan_out_panel | 21 | 47 | 10 | 3 | 3 | 7 | 7 | 0 |
| cpo_module | 9 | 15 | 4 | 2 | 0 | 1 | 3 | 0 |
| hybrid_bond_d2w | 9 | 19 | 1 | 11 | 12 | 8 | 15 | 1 |
| hybrid_bond_w2w | 15 | 21 | 0 | 2 | 4 | 0 | 18 | 0 |
| ucla_si_if | 5 | 10 | 0 | 6 | 4 | 6 | 6 | 0 |

Main gap: the TSMC CoWoS-R/-L, SoIC and Intel EMIB/Foveros papers almost never state thicknesses (die, RDL,
interposer, mold, substrate). Those families will be mostly `template` in the vertical axis unless the template
borrows `derived` values from peer TVs (si_interposer_peers, bridge_fanout_other, fcbga_organic) with their own
references.

## 2. Cross-family comparison

### 2.1 Where the die-to-die wiring sits

| placement | families | carrier of the fine wiring | vertical path beside it |
|---|---|---|---|
| full Si interposer | cowos_s, samsung_mios, foveros (Foveros-S variant) | Si interposer BEOL, TSV through it | TSV in interposer |
| full organic RDL interposer | cowos_r (also i_cube_r, focos chip-last, s_swift) | polymer/Cu RDL stack, no TSV | RDL vias |
| fan-out RDL on molded dies (chip-first) | info_os, fan_out_panel | RDL built on die face + mold | none in the 2.5D case (TIV only in InFO_PoP) |
| Si bridge in molded interposer, above the substrate | cowos_l, ase_focos_bridge, amkor_s_connect, samsung_i_cube_e | bridge chips embedded in mold with RDL above (and below) | Cu pillars / TIV / TMV through the mold; TSV in bridge optional (LSI has TSV; FOCoS-Bridge with TSV; S-Connect TSV optional) |
| Si bridge in substrate cavity | emib, emib_t, glass_core_substrate (EMIB in glass substrate) | bridge under the top build-up layer | substrate vias; TSV through bridge only in EMIB-T |
| Si bridge joined to the dies, under them | ibm_dbhi | bridge solder-joined to adjacent die faces before substrate attach | tall Cu pillars from die to laminate |
| direct 3D bond | soic, foveros_direct, hybrid_bond_d2w/w2w, x_cube (HCB), hbm_stack (HB variant) | die-to-die bond interface | TSV in the lower die |
| 3D microbump | foveros, x_cube, hbm_stack (MR-MUF / TC-NCF) | top die on base die microbumps | TSV in base / logic die |
| bare-die on Si wafer | ucla_si_if | Si-IF wafer BEOL | none (TSV-less) |

### 2.2 Interconnect levels that template authors must place

| level (schema `interconnects.level`) | typical ic_type | families |
|---|---|---|
| die_to_interposer | microbump, cu_pillar | cowos_s/r/l, samsung_mios, focos_bridge, s_connect, i_cube_e |
| die_to_bridge | microbump | emib, emib_t, ibm_dbhi |
| die_to_substrate | c4, cu_pillar | emib (coarse region), emib_t, ibm_dbhi, x_cube, fcbga_organic, cpo_module |
| interposer_to_substrate | c4, cu_pillar, bga (uBGA) | cowos_s/r/l, info_os, samsung_mios, focos_bridge, s_connect, i_cube_e |
| die_stack_internal | microbump, cu_cu_hybrid | hbm_stack, foveros, x_cube |
| die_to_wafer_hybrid, die_to_die_hybrid, wafer_to_wafer_hybrid | cu_cu_hybrid | soic, foveros_direct, hybrid_bond_d2w/w2w |
| through_via | tsv, tmv, tgv, tdv, pth, cu_pillar | interposer TSV, LSI TSV + TIV, EMIB-T bridge TSV, glass TGV, SoIC TDV, substrate PTH |
| rdl_via | rdl_via, microvia, stacked_via | every RDL / build-up stack |
| substrate_to_board | bga, solder_ball | all packaged families |

### 2.3 Visual differentiators (what the viewer must make obvious)

- CoWoS-S vs CoWoS-R vs CoWoS-L: same top-die layout and substrate; the interposer slab changes: one Si slab with
  TSV array (S), a polymer/Cu laminate with no TSV (R), a mold slab with embedded Si LSI chips plus Cu TIV posts and
  RDL on both faces (L). db:ectc51909.2023.00174 p.2 Sec. II.A.
- CoWoS-L vs EMIB: the bridge sits in the interposer at CoW level (above the C4) in CoWoS-L, but inside the
  substrate build-up (below the first-level bumps, no interposer, no C4 layer between die and substrate) in EMIB.
  db:ectc51909.2023.00174 p.2; db:ectc.2016.201 p.6 Sec. III.
- EMIB vs EMIB-T: EMIB bridge has no TSV and is held by adhesive; EMIB-T bridge has a TSV array and MIM capacitors
  and is solder-joined to pads at the cavity floor, with underfill under it. url:EMIB brief (primary);
  db:ectc51687.2025.00051 p.3 Fig. 4, p.4 Sec. III; db:ectc51846.2026.00051 p.4-5 Fig. 9.
- EMIB vs FOCoS-Bridge / S-Connect / I-Cube E: OSAT/Samsung bridges sit face-up in a mold layer with tall Cu pillars
  and RDL, i.e. the CoWoS-L placement, not the EMIB placement. db:ectc51529.2024.00151 p.2; db:ectc51909.2023.00175 p.2;
  db:ectc51687.2025.00048 p.2.
- DBHi: bridge hangs under the dies (die-attached first), laminate below has no cavity in surface-DBHi; Cu pillars
  give the standoff. db:ectc51909.2023.00180 p.1-2.
- SoIC vs Foveros vs Foveros Direct: SoIC and Foveros Direct = bumpless Cu hybrid bond (no solder, no underfill at the
  stack interface); Foveros = solder microbump (50 um, 36 um) with underfill. SoIC has TDVs (db:ectc.2019.00095 p.4
  Sec. VI) but our TSMC sources do not place them; in packaged SoIC the smaller chiplets sit under the larger die on the
  bump side (p.2 Fig. 4(b),(d)), so a fill with TDVs faces the bumps. In Intel QMC the oxide fill with TDVs lets the
  chiplets connect directly to the package (db:iedm45625.2022.10019499 p.3 Fig. 2), i.e. also on the package side
  (corrected 2026-10-20, audit B1). db:iedm19573.2019.8993637 p.1 Sec. II.A.
- X-Cube vs Foveros: both microbump 3D with TSV in the lower die; X-Cube demo stacks SRAM on a logic die of similar
  footprint with mold around the SRAM, Foveros stacks one or more top tiles on a larger base die.
  db:iwlpc52010.2020.9375855 p.3; db:iedm19573.2019.8993637 p.3 Fig. 1.
- HBM MR-MUF vs TC-NCF vs hybrid bond: same die stack; the fill between dies differs (molded underfill that also
  encapsulates the stack, NCF film per joint, or no fill with bonded oxide). db:ectc51909.2023.00151 p.1-2.
- Glass core vs FCBGA: same build-up stack; the core slab is glass with Cu-filled TGV instead of laminate with PTH.
  db:ectc51846.2026.00134 p.1-3; db:ectc51529.2024.00265 p.2 Table I.
- InFO_oS vs CoWoS-R: both organic RDL under the dies; InFO_oS builds the RDL directly on molded dies (no microbump
  joint between die and RDL in the stated flow), CoWoS-R has a microbump layer + underfill between dies and a
  pre-built RDL interposer. db:ectc32696.2021.00033 p.2 Sec. II; db:ectc32696.2021.00125 p.2 Fig. 2.

## 3. Families (illustrated)

### fcbga_organic: FCBGA on organic build-up substrate (baseline)

Topology (top to bottom):
1. Stiffener ring (Cu) on silicone adhesive, around the die; or lid + TIM (db:ectc51529.2024.00265 p.3-4 Sec. III.B, IV.B).
2. Monolithic Si die (flip chip, face down).
3. First-level Cu pillar + SnAg joints in capillary underfill (CUF).
4. Solder resist, top build-up layers (N), substrate core (glass-fiber laminate with PTH), bottom build-up (N), solder resist.
5. BGA balls.

DB reports (best TV ectc51529.2024.00265-a, p.2 Table I, p.3 Tables II-III): 100x100 mm 8-2-8 substrate 1800 um, CCL core
1400 um; die 50x50x725 um; Cu pillar 200 um pitch / 90 um dia / 30 um high; BGA 1 mm pitch / 600 um; Cu stiffener 2500 um,
adhesive 150 um. Per-layer build-up thickness: not in that TV; ectc51909.2023.00155 p.2 Table 3 gives build-up film 15 um,
L/S 14/20 um, microvia 40 um, core 1300 um, PTH 200 um, solder resist 18 um; ectc51687.2025.00148 has 8 layer thicknesses.
Missing: underfill fillet geometry, solder resist openings.
Uncertain: none for topology.

### cowos_s: CoWoS-S (TSMC)

Topology:
1. Cu stiffener ring (db:ectc51909.2023.00135 p.1 Sec. II, Fig. 1); a lid + TIM option is not stated in our CoWoS-S
   sources (corrected 2026-10-20, audit m1).
2. SoC and HBM side by side; epoxy mold compound between SoC and HBM (same locator).
3. Microbumps (40 um pitch) in UF1 (die-interposer underfill).
4. Si interposer: front BEOL (Cu damascene + Al RDL top layer, db:ectc.2013.6575597 p.1), Si core with TSV
   (dia 10 um, depth 100 um, ECP Cu with oxide liner; same locator), backside to C4 pads.
5. Cu-pillar C4 (150 um pitch, db:ectc51909.2023.00135 p.2 Table I; 200 um SnPb in the 2013 TV) in UF2.
6. Organic build-up substrate.
7. BGA (1 mm pitch, db:ectc51909.2023.00135 p.2 Table I).

Interconnect levels: die_to_interposer microbump; through_via TSV; interposer_to_substrate C4 / Cu pillar;
substrate_to_board BGA.
Relative sizes: MediaTek TV 85x85 mm package, two 1.5x-reticle interposers each with SoC 27x18 mm + 4 HBM2E 11x10 mm
(db:ectc51909.2023.00135 p.2 Table I); TSMC 2013 TV: interposer 26x24 mm on 40x40 mm substrate, logic 24x14 mm,
2 DRAM-like dies 12x7 mm (db:ectc.2013.6575597 p.1-2).
Public: CoWoS is chip-last on interposer (url:tsmc.com WLSI, primary). CoWoS-S up to 3.3X reticle (~2700 mm2)
(url:3dfabric.tsmc.com cowos.htm, primary; seen only via search snippet, direct fetch returned HTTP 403).
DB reports: outline, die x/y, interposer thickness 100 um, bump pitches, TSV dia/depth.
Missing: die thickness, mold and underfill heights, bump diameter/height, interposer BEOL layer count/thickness,
substrate stack, stiffener size. Peer set `si_interposer_peers` (vendor-neutral Si interposer TVs, e.g.
ectc51909.2023.00155-a: die 675 um, interposer 200 um, EMC 698 um, microbump d22 h15 um at 40 um, Cu pillar d75 h30 um,
substrate 1600 um, Cu stiffener 2000 um; p.2 Tables 1-3, p.6 Table 10) can fill these as `derived`/`template` with
its own reference; these are not TSMC values.
Uncertain: whether HVM CoWoS-S uses mold between dies on all products (the MediaTek TV does; the 2013 TV does not
state it). Deep-trench capacitors in the interposer: not stated in our CoWoS-S sources (CoWoS-L eDTC is stated,
db:ectc51909.2023.00174 p.3 Sec. II.D).

### cowos_r: CoWoS-R (TSMC)

Topology:
1. SUS430 stiffener ring (db:ectc51529.2024.00049 p.2 Sec. III) or lid + graphite-film TIM1 (db:ectc51687.2025.00085 p.2 Table 1).
2. SoC(s) + HBM side by side; molding (db:ectc32696.2021.00125 p.3 Sec. II.C).
3. Microbumps (40 um, 35 um) + uBump underfill.
4. Organic RDL interposer: 4 RDL (2021 TV) to 9 RDL (2024-2025 TVs) Cu in low-k polymer, 2/2 um L/S (1.4/1.4 um in
   ectc51687.2025.00047-b), via CD 8 um / cap 11 um (ectc51687.2025.00047 p.4 Sec. IV.A), TSV-less (db:ectc51906.2022.00008 p.2 Table I).
5. Land-side IPDs on the interposer bottom (20 in CoWoS-R+, 248 in the 5.5x TV).
6. C4 (145-150 um pitch) + C4 underfill.
7. Organic substrate (5-2-5 at 55x55 mm, 8-2-8 at 97.3x95 mm), BGA.

Relative sizes: 5.5x TV interposer 66x68 mm, 4 SoC 32x21 mm + 12 HBM 11x11 mm, SoC gap 150 um (db:ectc51529.2024.00049 p.2 Fig. 2).
DB reports: outlines, die x/y, L/S, via CD, layer count, bump pitches, IPD size 0.7x0.9 mm.
Missing: every thickness (die, RDL layer, interposer total, substrate, ring), bump dia/height, IPD thickness.
Public: RDL interposer = polymer + Cu traces, min 4 um pitch (url:3dfabric cowos.htm via snippet, primary).
Uncertain: whether the 9L interposer is built on a carrier before CoW (chip-last) in all generations; the TSMC
platform page calls CoWoS chip-last (url:tsmc.com WLSI).

### cowos_l: CoWoS-L (TSMC)

Topology (db:ectc51909.2023.00174 p.2 Sec. II.A-B):
1. Lid with film TIM, or ring.
2. SoC/chiplets + HBM; underfill and molding compound around them.
3. Microbumps.
4. Reconstituted interposer (RI): front RDL; molding compound body with embedded LSI chips (with TSV, Cu via on top
   metal, p.3 Sec. II.C) and TIV posts; eDTC can be embedded (p.3 Sec. II.D); back RDL.
5. C4 (6x SC-RDL variant: uBGA 500 um pitch, 200 um high, with embedded IPD in the uBGA layer;
   db:ectc51909.2023.00091 p.3 Table 1).
6. Substrate (3-2-3, 1.4 mm core in the 6x TV), BGA (1 mm).

Interconnect levels: die_to_interposer microbump; through_via TIV (TMV) and LSI TSV; rdl_via; interposer_to_substrate
C4/uBGA; substrate_to_board BGA.
Relative sizes: package 70x76 mm (text) / 70x78 mm (figure), interposer 43x58 mm, 3 SoC + 8 HBM, >10 LSI
(db:ectc51909.2023.00174 p.2; the conflict is logged in the TV notes). 6x TV: 91x91 mm, lid 2 mm, TIV pitch 100 / dia 50 um,
6 LSI, 45 IPD (db:ectc51909.2023.00091 p.3 Table 1).
LSI wiring: LSI-1 dual damascene 0.8/0.8 um, 2 um thick; LSI-2 SAP RDL 2/2 um, 2.3 um thick (p.3 Sec. II.C).
Missing: LSI x/y/thickness, die sizes, mold and RDL thicknesses, microbump pitch.
Uncertain: order of TIV formation vs LSI placement (the 2023 paper: TIV on carrier first, then LSI placement;
other generations may differ). Number of RDL layers per face in HVM (TV: one per face; 6x TV: 6 back-side layers).

### info_os: InFO_oS (TSMC)

Topology:
1. Ring heat spreader (110x110 mm TV, 2 mm) or metal lid + TIM1 (itherm TV, TIM 60-140 um).
2. Chiplets embedded in wafer molding compound (top faces at mold surface).
3. Fan-out RDL formed after molding: RDL1-4 at 2/2 um, RDL5 at 5/5 um, PM dielectric (db:ectc32696.2021.00033 p.2 Sec. II-III, Fig. 3).
4. C4 Cu bumps, 130 um pitch.
5. Organic substrate (lower-CTE core 1400 um, total 2300 um in the TV; p.5 Table VI), BGA.

Relative sizes: InFO 51x42 mm on 110x110 mm, 2 logic + 8 IO chiplets (db:ectc32696.2021.00033 p.2);
itherm TV: dies 21.78x16.25 mm, InFO 22.78x34.0 mm, substrate 62.5x62.5 mm (db:itherm45881.2020.9190542 p.2 Table 1).
Public: InFO_oS 2/2 um RDL, min 40 um SoC I/O pitch, min 130 um C4, >2X reticle on >65x65 mm substrates
(url:tsmc.com InFO, primary).
Missing: die thickness, mold thickness, RDL/PM layer thickness, die-to-RDL via geometry.
Uncertain: chip-first is inferred from "interconnect formation after wafer molding"; the DB carries an `other`
interconnect at 36 um pitch on the 2.5x TV whose physical meaning (die pad / via pitch) should be checked in the paper
figure before the template uses it.

### soic: SoIC (TSMC)

Topology of the SoIC unit (db:ectc.2019.00095 p.2-4; db:ectc51906.2022.00176 p.2-3 Sec. III.A):
1. Top die(s), thinned, smaller footprint than the bottom die (SoIC4 TV: 6x6 mm top on 16x16 mm bottom).
2. Gap fill around the smaller die(s), material not stated. TDVs (through dielectric vias) exist (db:ectc.2019.00095
   p.4 Sec. VI) but no TSMC source places them; in packaged SoIC the smaller chiplets sit under the larger die on the
   bump side (p.2 Fig. 4(b),(d)), so a fill with TDVs faces the bumps, not the heat-sink side (corrected 2026-10-20,
   audit B1). The SoIC4 CoW TV (small die on top of the large wafer die) describes no fill.
3. Hybrid bond interface (Cu pads in dielectric), F2F or F2B; bond pitch 9 um (SoIC1), 3 um (SoIC4); wafer-level
   sub-0.5 um and 200 nm studies (ectc51909.2023.00008, ectc51529.2024.00125).
4. Bottom die BEOL + Si with TSV.
5. Bumps to the next package level.
Packaging context: the SoIC unit is placed like an SoC into CoWoS, InFO (InFO_PoP demo) or flip chip
(db:ectc.2019.00095 p.2 Sec. III, Fig. 4); SoIC_H puts logic and memory cubes F2F-bonded on a Si interposer
(db:vlsitechnologyandcir46769.2022.9830182 p.1).
Template recommendation: render the SoIC stack on a CoWoS-S carrier (reuse cowos_s template) with the stack zoomed.
Public: SoIC-X (bumpless) vs SoIC-P (microbump) naming, SoIC-X pitch 9 um toward 3 um (url:semiwiki, url:anandtech;
secondary).
Missing: all thicknesses (die, gap fill, bond layer), TSV geometry, die sizes beyond SoIC4.
Uncertain: whether a support / structural Si layer is bonded on top in TSMC SoIC (not stated in our TSMC papers;
Intel QMC states a support Si, db:iedm45625.2022.10019499 p.3 Fig. 2).

### emib: EMIB (Intel)

Topology (db:ectc.2016.201 p.5-6; url:EMIB brief, primary):
1. Lid / IHS + TIM (not in the 2016 paper; Intel CPO TV shows a heat spreader, db:ectc51687.2025.00012 p.2 Sec. III).
2. Two or more dies, edges overlapping the bridge.
3. First-level bumps: fine pitch over the bridge (55 um; 45 um 2nd gen, url:Clearwater Forest WP), coarse 130 um
   elsewhere (p.5 Fig. 4(a)); TCB attach + capillary underfill.
4. Top build-up / surface layer; fine vias down to bridge pads, coarse vias elsewhere.
5. Si bridge (2x2 to 8x8 mm, <75 um thick, M1-M4 at 2/2 um, no TSV; p.5 Table II, p.6 Sec. III(b)) in a cavity at
   the final build-up layer, held by adhesive.
6. Lower build-up, core, build-up, BGA.
Interconnect levels: die_to_bridge microbump; die_to_substrate (coarse); rdl_via microvia; substrate_to_board BGA.
EMIB-M variant: MIM capacitors in the bridge (url:EMIB brief).
DB reports: bridge size range and thickness bound, bump pitches, bridge L/S.
Missing: die sizes/thickness, substrate stack, bump heights, cavity depth, adhesive thickness.
Uncertain: adhesive type (die-attach film vs paste) is not stated in our sources.

### emib_t: EMIB-T (Intel)

Topology: as EMIB, except the bridge:
- carries a TSV array and on-bridge MIM capacitors (db:ectc51846.2026.00051 p.4-5 Sec. B, Fig. 9; url:EMIB brief);
- is placed into a cavity opened down to prepared cavity pads and solder-joined to them (db:ectc51687.2025.00051 p.3
  Sec. III.B, Fig. 4), with underfill between bridge backside and cavity (p.4 Sec. III);
- is then encapsulated by dielectric with direct vias to bridge pads.
Power path: package bottom -> substrate -> bridge TSV -> HBM (db:ectc51687.2025.00051 p.2 Fig. 2).
Relative sizes: EMIB25T bridge 3x18 mm (thickness not given; "~50 um thick" in p.1 Sec. I is the paper's general EMIB
statement, corrected 2026-10-20, audit M1), two 1x-reticle top dies, 25 um FLI bump pitch
(db:ectc51846.2026.00051 p.3 Sec. II.A.ii, Fig. 4); 36 um TV with mixed 110/55/36 um bump regions (p.2-3 Fig. 3);
2025 TV 77x56 mm, 3 TSV bridges, 45 um D2D pitch (db:ectc51687.2025.00051 p.4 Sec. IV).
Missing: TSV pitch/diameter, cavity depth, joint height, build-up layer thickness, die thickness.
Uncertain: bridge-to-cavity underfill material and whether it is a film (not stated).

### foveros: Foveros (Intel)

Topology (db:iedm19573.2019.8993637 p.1-3):
1. Lid / heat spreader + TIM (not in this paper; generic).
2. Top logic die, face down (F2F).
3. Microbump layer: Cu pillar + SnAg, 50 um pitch (36 um in the 2.5D Foveros paper and Foveros-S 25 um in HVM:
   db:vlsitechnologyandcir46783.2024.10631478 p.1; db:ectc51846.2026.00051 p.2 Sec. I).
4. Base die: upper interconnect, Si with TSV-mid (pitch 15-16 um, dia 9 um), base die ground to approximately 75 um
   to reveal TSVs (p.1 Sec. II.B), backside nitride.
5. Package-side bumps to package substrate; BGA.
Foveros-S / 2.5D variant: passive Si interposer with HDMIM as the base, CPU/GPU/SOC chiplets, TSV dia 9 um / depth
75 um, C4 110 um pitch / 70 um dia (db:vlsitechnologyandcir46783.2024.10631478 p.1-2).
Mold: Ponte Vecchio Foveros stacks have a mold shelf / wafer-level mold (db:tcpmt.2023.3312037 p.2 Sec. II); the 2019
Lakefield paper does not state mold.
Die complex: ~32 x 62 mm (2X reticle) and ~51 x 65 mm (4X, active base die communication) with mold on the die edge
(db:ectc51846.2026.00365 p.5 Sec. V, Fig. 9). 32 x 62 mm is about 2.3x one 26 x 33 mm field, so the 2X complex holds
more than one base die; the partition is not reported (template draws reticle-multiple base dies of <= 1X each).
Missing: die x/y, top die thickness, underfill, substrate stack.

### foveros_direct: Foveros Direct (Intel)

Topology: chiplets Cu-Cu hybrid bonded onto an active base tile (no solder, no underfill at that interface), base
tile bumped to the package (url:Clearwater Forest WP, primary: 9 um gen 1, 3 um gen 2; the white paper does not state the
base-tile TSVs or the absence of underfill: the TSV is from db:ectc51529.2024.00017 p.2 Sec. II.A; corrected 2026-10-20,
audit m5).
DB: active HB test chip, 4 top dies on 1 base die at 9 um, on package (db:ectc32696.2021.00166 p.5 Sec. IV.B, Fig. 9);
3 um C2W, 6.2x7.7 mm top die on base wafer with TSV (db:ectc51529.2024.00017 p.2 Sec. II.A, Fig. 1); QMC: oxide fill
with TDVs around base chiplets, top chiplets, support Si on top (db:iedm45625.2022.10019499 p.3 Fig. 2); sub-1 um W2W
lattices (db:ectc51529.2024.00128); MLV toward 1 um C2W (db:ectc51687.2025.00009).
Missing: thicknesses, base die size.
Uncertain: only ectc32696.2021.00166-b is tagged `Foveros` in the DB; linking the other Intel HB papers to the
Foveros Direct product is an inference from topology and affiliation.

### hbm_stack: HBM stack (SK hynix, Samsung)

Topology (db:ectc51909.2023.00151 p.2 Sec. II.B, Fig. 3-4):
1. Top DRAM die (thick).
2. Core DRAM dies (7 in 8Hi), each with TSVs, joined by microbumps; chip-to-chip gap 15 um.
3. Gap fill: MR-MUF (mass reflow, then wafer mold that fills gaps and encapsulates the stack) or TC-NCF
   (thermo-compression with non-conductive film per joint; p.1 Sec. I).
4. Base logic die (10.8x9.8 mm; core 10.5x9.5 mm), bumps to interposer.
Total height 720 um for 8Hi HBM3 and kept at 720 um for 12-layer HBM4 (db:vlsitechnologyandcir65830.2026.11577576 p.1).
Hybrid-bond variants: 8Hi HBM2E by C2W Cu/oxide bonding; its Fig. 1 compares solder-bump and HBI stacks at an assumed
equal 58 um chip thickness, a comparison case, not a product value (db:ectc51909.2023.00179 p.2 Fig. 1);
Samsung 16H D2W HCB (db:ectc51529.2024.00021 p.1).
Missing: die thicknesses for MR-MUF stacks, TSV/bump pitch, mold cap thickness.
Uncertain: none for topology.

### samsung_mios: Samsung MIoS (I-Cube S class)

Topology (db:ectc32696.2021.00315 p.2 Sec. II.A, Fig. 3):
1. ASIC + HBM (685 um thick) encapsulated in EMC (molded interposer module).
2. Microbump layer with device underfill (35 um high).
3. Si interposer 51x55 mm, 110 um, with backside RDL.
4. Cu pillar + solder bumps (70 um; 72.2 um measured) with interposer underfill.
5. Organic substrate 85x85 mm with ring frame (710 um); package total 3.082 mm. BGA.
3.5D variant: 4x-reticle molded Si interposer with a Cu-Cu hybrid-bonded 3D-ASIC (4 um pitch), 12 HBM3, microbump
40 / Cu pillar 50 / 73 um regions, 6-2-6 substrate (db:ectc51909.2023.00154 p.2 Sec. II, Table 1).
Public: I-CubeS = Si interposer, 3x reticle, 8 HBM + 2 logic (url:3dincites, secondary). I-Cube4 = mold-free, ~100 um
Si interposer (url:iconnect007 press reprint).
Uncertain: MIoS is not called I-Cube in our papers; since I-Cube4 is stated mold-free, MIoS is a molded variant and
the brand mapping is unverified. Keep the family name "MIoS" in the UI.

### samsung_x_cube: X-Cube (Samsung)

Topology (db:iwlpc52010.2020.9375855 p.3, Fig. 3):
1. SRAM die(s), face down, 9x9 mm, molded.
2. SRAM-to-logic microbumps.
3. Logic die 9.5x9.5 mm: backside metal, thinned Si with TSV (pitch 50 um, dia 4 um), front metal.
4. Cu pillar (125 um pitch) to 12x12 mm substrate; package 1.1 mm thick; BGA 400 um.
Bumpless variant: D2W hybrid Cu bonding (db:ectc51909.2023.00178 p.1-2); public: X-Cube with microbump or bumpless
Cu-Cu (url:3dincites, secondary).
Missing: die thicknesses, bump height.

### samsung_i_cube_e: I-Cube E (Samsung)

Topology (db:ectc51687.2025.00048 p.2 Sec. II.A, Fig. 2.1-2.3):
1. Logic + 12 HBM.
2. Bumps to the interposer.
3. Upper RDL.
4. Interposer mold (EMC) with Cu posts (TMV) and multiple Si bridges attached with DAF.
5. Lower RDL, C4, package substrate.
Size: Fig. 2.2 labels 'Interposer Size 95.00x105.00' and 'Unit Size 51.00x67.72' mm, 4.3x reticle. Panel-level
process. The drawn floor-plan rectangle has a width/height ratio of about 0.75 (51/67.72 = 0.75, 95/105 = 0.90), so the
template draws the 51 x 67.72 mm unit as the interposer (re-checked 2026-10-20 on the page render).
Missing: nearly all dimensions. Treat as a variant of the bridge-in-mold template (shared with cowos_l,
ase_focos_bridge, amkor_s_connect).
Bridge orientation: face up; the mold is ground to expose the bridge Cu bumps (p.3 Sec. III.B; process step s05)
after DAF attach (s03) (2026-10-20, audit m2).

### ase_focos_bridge: FOCoS-Bridge (ASE)

Topology (db:ectc51529.2024.00151 p.2 Sec. II.A, Fig. 1; p.3 Fig. 2):
1. ASIC + HBM, FO wafer mold (top mold).
2. Microbumps (55 um) + CoW underfill.
3. Fan-out RDL, 3 passivation + 3 metal (10/10 um).
4. Bottom mold with Si bridges (6.2x6.4 mm) and tall plated Cu pillars.
5. Optional backside metallization; C4 (150 um) + CoS underfill.
6. FCBGA substrate 70x78 mm, BGA; lid (TSV variant).
TSV variant: TSV bridges, 5/5 um RDL x3, C4 130 um, 85x85 mm (db:ectc51687.2025.00158 p.2).
Public: 47x31 mm fan-out structures, each 1 ASIC + 4 HBM + 4 bridges, two per 70x78 mm package, submicron L/S
(url:ASE press room, primary; as fetched 2026-10-20 in the family audit, which found no bridge-placement statement there;
the placement is from db:ectc51529.2024.00151 p.2 Sec. II.A).
Missing: thicknesses, pillar height/diameter, die sizes.
Uncertain: whether BSM refers to a backside metal on the module bottom or on die backsides; read the Fig. 1 render
before modeling.

### amkor_s_connect: S-Connect (Amkor)

Topology (db:ectc51909.2023.00175 p.2 Sec. II.A-B, Fig. 1-2):
1. Top dies (dummy ASIC 23x24 mm, HBM2 8x12 mm), 2nd mold, ground to expose die tops.
2. Microbumps (50/55 um) + capillary underfill.
3. Top RDL with solder capture pads.
4. 1st mold with face-up connect die (7x6 mm, 70 um) and IPD with Cu studs, tall Cu pillars (260 um pitch, 135 um high).
5. Bottom RDL, plated C4.
6. Substrate (HDBU) 67x67 mm.
Public: molded local S-Connect die, TSV optional, 40-50 um pitch (url:amkor.com S-Connect, primary).
Missing: RDL layer count/thickness, mold thicknesses.

### ibm_dbhi: DBHi / DBrM (IBM)

Topology (db:ectc51909.2023.00180 p.1-2; db:ectc51529.2024.00051 p.3 Sec. IV):
1. Lid + TIM + lid adhesive.
2. Main chips (19x19 mm).
3. Under the chip edges: Si bridge (2.5x3.2 mm or 3.5x2.5 mm, 60 um thick) solder-joined to both chips (30 or 75 um pitch);
   underfill.
4. Elsewhere under the chips: Cu pillar C4 (150 um pitch, 100 um high) to the laminate; the pillar standoff clears the bridge.
5. Organic laminate (67.5 or 68.5 mm, 2 mm thick in DBrM); no cavity in surface-DBHi; original DBHi used a
   machined cavity (db:ectc51909.2023.00180 p.1 Fig. 1).
DBrM: chips edge-glued first, then the bridge is attached (db:ectc51846.2026.00050 p.2 Sec. II.A).
Missing: die thickness, laminate stack.

### glass_core_substrate: Glass core substrate (Intel / Absolics / others)

Topology:
1. Dies and first-level bumps (as fcbga_organic or emib).
2. Top build-up (front RDL; EMIB bridges can sit in the top layers, db:ectc51846.2026.00134 p.3 Sec. III).
3. Glass core with Cu-filled TGVs (and core-surface Cu).
4. Bottom build-up, BGA.
Values: Intel 10-2-10 (24-layer) on 510x515 mm panel (db:ectc51846.2026.00134 p.1); Shinko 1.0 mm core, TGV dia 90 /
pitch 175 um, 2-2-2, 77.5x75 mm (db:ectc51687.2025.00178 p.4 Table 1); Georgia Tech 1 mm core, ABF 15 um, Cu 5 um,
microvias 20-50 um (db:ectc51846.2026.00199 p.4).
Public: TGV aspect ratio about 20:1 at 1 mm core (url:anandtech, secondary).
Missing: glass thickness in the Intel TV, die/package outline for a full glass-core package.
Uncertain: Absolics contributes only TGV etch coupons/panels (db:ectc51529.2024.00092); its product stack is not in the DB.

### fan_out_panel: Panel-level fan-out (Deca M-Series / nepes / IME / others)

Topology, chip-first face-up (M-Series, db:ectc51909.2023.00266 p.2 Sec. II, p.3 Fig. 7):
1. Mold back side.
2. Die(s) face up, with Cu studs (60 um pitch, 40 um dia in the chiplet TV).
3. Front-side mold over the die face, ground to expose studs (6-sided protection).
4. RDL stack (5 layers, 10/10 um, 5 um thick), polymer passivation, UBM.
5. Solder balls to board (no substrate).
Mold-first variant (db:ectc32862.2020.00185 p.2 Table 1): 10x10x0.8 mm package, 7x7x0.7 mm die, PI 7 um, Cu 5 um at
10/10 um, 400 um ball pitch on a 600x600 mm panel. RDL-first variant: db:ectc.2019.00-29; Amkor HPLT RDL-first on
650x650 mm glass panel (db:ectc51906.2022.00135 p.3).
Public: chips-first face-up, Cu studs, 20 um stud pitch with Adaptive Patterning (url:Deca/Siemens white paper, vendor).
Uncertain: the family spans three process orders; the template should pick one (chip-first face-up recommended,
best documented) and list the others as variants.

### cpo_module: Co-packaged optics module (generic)

Topology (generic; vendors differ):
1. Lid / heat spreader over the compute die and engines.
2. Compute die (XPU / switch) at the center; optical engines (PIC with EIC, or OIO chiplets) at the edges.
3. Die-to-substrate bumps or EMIB bridges between compute die and OIO chiplets (db:ectc51687.2025.00012 p.2 Fig. 1).
4. Fiber array units (FAU) or polymer waveguide + MT ferrule at the PIC edge, overhanging the package edge
   (db:ectc51687.2025.00012 p.2; db:ectc51687.2025.00052 p.3 Sec. V).
5. Substrate, BGA (500 um in the IBM TV).
Variants: PIC embedded in a molded RDL-first interposer with a Si bridge, FS 2L / BS 4L RDL, TMV, 79x52 mm
(db:ectc51846.2026.00016 p.2 Sec. III); TSMC COUPE = EIC SoIC-bonded on PIC (db:ectc51529.2024.00144 p.2).
DB reports: few dimensions (IBM PIC 8x10 mm on 17x17 mm substrate, C4 150 um; IME RDL thicknesses).
Missing: compute-die size, engine count/placement for a full module, FAU geometry.
Uncertain: no single DB TV covers a full switch-class CPO module; the template is mostly `template` values.

### hybrid_bond_d2w: Hybrid bonding, die-to-wafer (generic)

Topology (db:ectc51906.2022.00031 p.2-3 Sec. II, Fig. 4):
1. Cap die (thinned, 50 um), isolation oxide, single-layer Cu damascene RDL (1 um), DBI layer (2 um).
2. Thru dies (50 um) with TSV 5x50 um at 35 um pitch, RDL and DBI layers on both faces (repeat for 2/5/8-die stacks).
3. Host logic wafer: DBI layer, RDL, oxide, Si.
Sizes: 8x12 mm dies. Fine-pitch D2W: 7 um pitch / 3.5 um pad (db:ectc51909.2023.00023); down to 1 um pitch, 6x6 mm
top die on 300 mm wafer (db:ectc51846.2026.00218).
Missing: gap fill around dies (not in these TVs).

### hybrid_bond_w2w: Hybrid bonding, wafer-to-wafer (generic)

Topology (db:ectc51529.2024.00057 p.2 Sec. II, Fig. 1-3):
1. Tier 3 wafer (top): UBM / micro-pillar pads, passivation, line / via / bonding-pad levels.
2. F2F Cu-Cu + dielectric bond (4 / 6 um pitch).
3. Tier 2: bonding pads, vias, lines, thinned Si 9 um with 1x10 um TSV, backside pads.
4. F2B bond.
5. Tier 1: bonding pads, vias, lines, Si substrate.
Pitch range in DB: 6 um to 300 nm (db:ectc51846.2026.00187); Sony WoWoW 1 um F2F (db:ectc51529.2024.00218).
Missing: wafer thicknesses other than tier 2, BEOL thicknesses. Render as a unit-cell / die-edge inset; all tiers
share one footprint.

### ucla_si_if: Si-IF (UCLA CHIPS)

Topology (db:ectc51906.2022.00332 p.1-2):
1. Bare dielets, face down.
2. Cu pad to Cu pillar direct bonds (TCB, ~10 um pitch).
3. Si-IF wafer: BEOL Cu wiring on a Si substrate.
4. Wire bonds / edge connectors for I/O; TSV-less power delivery (db:ectc51906.2022.00303).
3D extension: F2B Cu-Cu TCB stacks on Si-IF (db:ectc51846.2026.00062).
Missing: wafer and BEOL thickness for the main TVs; package outline (wafer scale).

## 4. Not illustrated (include: false)

- info_pop: 1 TV (SoIC in InFO_PoP), no geometry. Public: high-density RDL + TIV, no substrate and C4 (url:tsmc.com InFO).
- emib_3p5d (Co-EMIB, Ponte Vecchio): build from emib + foveros templates later (db:tcpmt.2023.3312037 p.1-2;
  url:EMIB brief "EMIB 3.5D").
- samsung_i_cube_r, ase_focos_chip_last, amkor_s_swift: same topology as cowos_r; use as `peer` dimensions only
  (focos chip-last has 30 um interposer, 3 RDL 2/2 um, 45-150 um microbumps, 130 um C4, 7-2-7 74x74 mm;
  db:ectc51906.2022.00309 p.2 Table 1).
- amkor_hplt: panel process platform (650x650 mm), covered by fan_out_panel.
- tsmc_coupe: TVs have no geometry; variant note under cpo_module.
- photonic_interposer: wafer-level TVs; revisit after cpo_module.
- embedded_die, glass_interposer: power/RF modules and TGV coupons, outside the v1 comparison.
- si_interposer_peers, bridge_fanout_other, microbump_d2w_peers, organic_interposer_peers: peer data sets
  (vendor-neutral) for derived/template values.

## 5. Open uncertainties (summary)

1. No TSMC or Intel paper in the DB gives a full vertical stack (die, interposer/bridge, RDL, bump heights, substrate
   layers) for CoWoS-R/-L, SoIC, EMIB, EMIB-T or Foveros; the vertical axis of these templates will be mostly
   `template` or peer-`derived`.
2. TSMC 3DFabric pages returned HTTP 403 to direct fetch; CoWoS-S 3.3X and RDL 4 um pitch statements were read from
   search-result snippets of those pages.
3. Samsung MIoS vs I-Cube S brand mapping unverified (I-Cube4 stated mold-free; MIoS is molded).
4. Foveros Direct: only one Intel HB TV is tagged Foveros; the others are linked by inference.
5. CoWoS-L package size conflict 70x76 (text) vs 70x78 mm (figure) in db:ectc51909.2023.00174; already noted in the TV row.
6. InFO_oS die-to-RDL connection: chip-first inferred; the 36 um `other` interconnect row needs a figure check.
7. EMIB / EMIB-T attach materials (adhesive type, bridge-to-cavity underfill) not stated.
8. SoIC support/structural Si on top: not stated in our TSMC sources.
9. CPO: no full switch-class module TV; template mostly illustrative.

## 6. Public sources used

- Intel EMIB technology brief (2025-07): https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-07/emib-product-brief.pdf (primary)
- Intel Clearwater Forest white paper (2024-02): https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2024-02/intel-tech-clearwater-wp.pdf (primary)
- TSMC InFO page: https://www.tsmc.com/english/dedicatedFoundry/technology/InFO (primary)
- TSMC HPC WLSI page: https://www.tsmc.com/english/dedicatedFoundry/technology/platform_HPC_tech_WLSI (primary)
- TSMC 3DFabric CoWoS page: https://3dfabric.tsmc.com/english/dedicatedFoundry/technology/cowos.htm (primary; snippet only, fetch 403)
- ASE FOCoS-Bridge: https://www.aseglobal.com/press-room/focos-bridge and https://www.aseglobal.com/press-room/ase-announces-focos-bridge-with-tsv/ (primary)
- Amkor S-Connect: https://amkor.com/technology/s-connect/ (primary); S-SWIFT blog https://amkor.com/blog/revolutionizing-ic-packaging-with-s-swift-technology/ (primary)
- Samsung I-Cube4 press-release reprint: https://iconnect007.com/index.php/article/127456/samsung-electronics-next-generation-25d-integration-solution-i-cube4-available/127459/?skin=ein
- Samsung Foundry Forum report (I-Cube S/E, X-Cube): https://www.3dincites.com/?p=84689 (secondary)
- SoIC naming/pitch: https://semiwiki.com/semiconductor-manufacturers/tsmc/328139-tsmc-2023-north-america-technology-symposium-overview-part-3/ and https://at-web1.www.anandtech.com/show/21414/tsmcs-3d-stacked-soic-packaging-making-quick-progress-3um-pitch-in-2027 (secondary)
- Intel glass substrate: https://at-web1.www.anandtech.com/show/20058/intel-shows-off-glass-core-substrate-plans-deployment-late-decade (secondary)
- Deca Adaptive Patterning white paper: https://resources.sw.siemens.com/en-US/white-paper-deca-adaptive-patterning-white-paper (vendor)
