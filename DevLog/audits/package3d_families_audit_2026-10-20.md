# Audit: 3D package family list and templates (fresh context)

Date: 2026-10-20. Scope: `config/package3d/families.yaml`, `config/package3d/RESEARCH.md`, finished templates
(cowos_r, emib_t, cowos_s, cowos_l, emib, soic, foveros, hbm_stack) at the topology level, DevLog-008. Read-only
audit. Nothing else in the repo was changed.

Method:
- Re-ran every `match_rule` in families.yaml against `data/test_vehicles.csv` and `data/interconnects.csv`.
  - Paper and physical-TV counts reproduce for 34 of 35 families. The exception is ucla_si_if: 11 physical TVs now
    vs 10 in the yaml.
  - `data/test_vehicles.csv` has uncommitted changes from the revision pass, so counts can drift.
- Scanned for overlaps and unmatched TVs.
- Checked `db:` locators against `references/<id>/text.md` and the page/figure renders.
- Fetched 7 public URLs, one at a time.

Severity: blocking = the viewer would show a topology or claim that a source or physics contradicts.
metadata = attribution, tagging, matching or provenance is wrong or incomplete. minor = locator or wording.

Counts: blocking 2, metadata 10, minor 6.

## Blocking

### B1. soic: "gap fill with TDVs" placed around the top die (template, RESEARCH 3/soic item 2, RESEARCH 2.3)

- Claim:
  - Topology item 2 reads: "Gap fill dielectric around the top die with TDVs".
  - The template draws a dielectric frame around the smaller top die, with the callout "Gap fill with TDVs".
  - RESEARCH 2.3 says Intel QMC "shows the same oxide-fill-with-TDV idea".
- Evidence:
  - db:ectc.2019.00095 p.4 Sec. VI and Figs. 12-13 only report TSV and TDV reliability. Nothing there places
    the TDV.
  - The only placement evidence in that paper is p.2 Fig. 4(b) and (d) (page render checked). In a packaged SoIC
    the smaller chiplets (SoC-2, SoC-3) sit under the larger SoC-1, on the bump/RDL side.
  - db:iedm45625.2022.10019499 p.3 Fig. 2 caption: the TDVs run through the oxide fill so that "top chiplets may
    connect directly to the package". The fill with TDVs is therefore on the package side. QMC contradicts the
    RESEARCH 2.3 statement.
  - A TDV in a fill around a top die on the heat-sink side has nothing to connect to.
  - The template orientation (small top die on a large TSV bottom die) does match the SoIC4 CoW TV
    (db:ectc51906.2022.00176 p.3 Sec. III.A, 6x6 on 16x16 mm).
  - It also matches AMD 3D V-Cache (SoIC, ISSCC 2022 paper 26.4). There, structural Si dies are oxide-bonded
    beside the top die instead of a dielectric fill. This is secondary and was seen only via search snippets
    (wikichip fuse.wikichip.org/?p=5531, which refused the connection; slideshare of ISSCC 26.4). Verify before
    citing.
- Fix:
  1. Remove "with TDVs" from the top-die fill: change the callout and the RESEARCH topology item, and label the
     fill "gap fill (material not stated; structural Si in some products)".
  2. Add a variant note: in packaged SoIC (Fig. 4) the smaller dies plus fill and TDVs face the bumps.
  3. Correct the QMC sentence in RESEARCH 2.3.
  4. Partly resolves RESEARCH uncertainty 8 (support Si): a public product uses structural Si (secondary source).

### B2. foveros: one monolithic 32 x 62 mm active base die plus a tile count from a passive-interposer TV

- Claims:
  - `base_w_mm` / `base_d_mm` come from ectc51846.2026.00365-j-c1, drawn "as one base die".
  - `tile_n` = 3 comes from vlsitechnologyandcir46783.2024.10631478-a.
  - The backbone is Lakefield (iedm19573.2019.8993637-a: one top die on a 22FFL active base die).
- Evidence:
  - db:ectc51846.2026.00365 p.3 says "die size of approximately 32 mm by 62 mm" (a 2X-reticle die complex, "mold
    material is present on the die edge"). The 4X TV mentions "active base die communication", i.e. several base
    dies.
  - 32 x 62 mm = 1984 mm2. That is about 2.3x the 26 x 33 mm lithography field, so a single unstitched base die
    of that size is not physical.
  - The 2024 TV is "2.5D Foveros" on a passive TSV Si interposer (db:vlsitechnologyandcir46783.2024.10631478
    p.1). Intel's product brief now calls this Foveros-S 2.5D, a different variant from an active base die.
- Fix: choose one of these.
  - (a) Model the 2X complex as 2 base dies of 1X or less plus a mold frame. The partition is template, with the
    note "partition not reported".
  - (b) Keep a single base die but use a template footprint of 1X reticle or less.
  - In both cases take the tile count from the backbone (1) or mark it template. Do not import the
    passive-interposer TV's 3 tiles as "reported" for an active base die.

## Metadata

### M1. emib_t: the 50 um bridge thickness is generic EMIB, not EMIB25T

- Where it appears:
  - families.yaml emib_t sources: "EMIB25T: 3x18 mm bridge, 50 um thick".
  - RESEARCH emib_t: "EMIB25T bridge 3x18 mm, 50 um thick".
  - Template `bridge_h_um` (reported) and the callout "~{bridge_h_um} um Si with TSVs".
- Evidence:
  - db:ectc51846.2026.00051 p.3 Sec. II.A.ii gives 3 x 18 mm with no thickness.
  - p.1 Sec. I (text.md line 120): "multiple thin (~50 um thick) silicon bridges", which is about EMIB in general.
  - The row ectc51846.2026.00051-b-c1 already notes "generic EMIB ~50 um (Sec. I)".
- Fix: correct the families.yaml and RESEARCH text. In the template, keep the ref but write the callout as
  "~50 um (EMIB generic, Sec. I)", or reclassify as analog-like with that note.

### M2. cowos_r template omits the molding compound

- The claim is in RESEARCH cowos_r item 2 ("molding", db:ectc32696.2021.00125 p.3 Sec. II.C).
- Evidence: db:ectc32696.2021.00125 p.3 (text.md line 262) lists "the molding and C4 underfill" among the
  package interfaces. db:ectc51687.2025.00026 p.1 (line 156) names "molding compound". The template has UF1 only.
- Fix: add a mold part, the same pattern as cowos_s/cowos_l (`mold_h_um = ubump_h_um + max(die h)`, template). Or
  record in the template header why it is omitted.

### M3. hbm_stack: template `family_match` differs from the families.yaml rule; core thickness is a comparison value

- Template: `MR-MUF|TC-NCF|^HBI$|^HCB$|SoIC_HBM`. families.yaml: `tn=MR-MUF|TC-NCF|^HBI|SoIC_HBM; papers=[ectc51529.2024.00021, ectc51846.2026.00024, vlsitechnologyandcir65830.2026.11577576]`.
- Because the template has no paper fallback, rows of ectc51846.2026.00024-a..e and
  vlsitechnologyandcir65830.2026.11577576-b/c/d cannot be `reported` in hbm_stack, although the family counts
  them.
- `core_h_um` = 58 um comes from ectc51909.2023.00179-b-c1 (basis design_target, caption). The paper uses 58 um
  only as the Fig. 1 equal-thickness comparison case (text.md line 138: "in case of same chip thickness of
  58um"). The row notes say so.
  - The derived top-die thickness (720 - 75 - 7x58 - 8x15 = 119 um) inherits this.
- Fix:
  1. Make the generator accept the families.yaml rule, or tag the TVs (see M5).
  2. Change the callout to "58 um (comparison case, Fig. 1)".

### M4. foveros template `^Foveros$` admits the hybrid-bond TV ectc32696.2021.00166-b

- families.yaml excludes this paper (`excl_papers`); the generator check does not. db:ectc32696.2021.00166 p.5
  (OCR) describes a "Foveros architecture" active test chip with 4 top dies and 1 base die at 9 um, which is
  Cu-Cu hybrid bonding.
- No current foveros ref uses it, but nothing prevents one.
- Fix: retag 00166-b `technology_name` as `Foveros Direct`, or support exclusions in `family_match`.
- Optional: tag vlsitechnologyandcir46783.2024.10631478-a as `Foveros; Foveros-S` (see B2).

### M5. hbm_stack tagging gaps (TVs that belong to the family but are not matched)

| tv_id | kind / class | evidence | proposed tag |
|---|---|---|---|
| ectc51909.2023.00151-b | package / si_interposer_2p5d | "2.5D SiP proxy package: MR-MUF 8Hi HBM on Si interposer"; paper technology_name MR-MUF; currently counted in si_interposer_peers | `MR-MUF` (then si_interposer_peers `excl` drops it) |
| vlsitechnologyandcir46769.2022.9830182-j | simulation / microbump_3d | "12-Hi microbump_HBM model (base + 12-Hi cube, reference)"; the hbm_stack template already uses it as an analog for `ub_pitch_um` (36 um) | `HBM (microbump)` + add to the rule |
| ectc51846.2026.00024-a, -b, -c, -e | die_stack / wafer / sub-assembly, hybrid_bonded_3d | paper title "... Hybrid Bonding for High-Bandwidth Memory (HBM) Stack Integration"; untagged, matched by families.yaml only through the paper list | `HBI` or `hybrid bond (HBM)` |
| ectc51846.2026.00024-d | blanket ECP Cu films | process coupon, not a stack | leave untagged |
| vlsitechnologyandcir65830.2026.11577576-b, -c, -d | simulation | HBM4 package models; paper technology_name MR-MUF | `MR-MUF` (simulation, no effect on physical shares) |

### M6. Tagging and rule gaps in other families

- info_os:
  - ectc51906.2022.00232-a/b/c (MediaTek, fan_out_wafer, untagged): "chip-first ... integrated fan-out
    multi-chip assembly on large organic substrate"; acknowledges TSMC; cites InFO_oS
    (references/ectc51906.2022.00232/text.md lines 59, 118, 558, 565).
  - This is an InFO_oS candidate, but the paper does not name InFO_oS. Confirm on the figures before tagging.
- fan_out_panel: the rule is `cls_only=['fan_out_panel']`. The Deca M-Series TVs classed fan_out_wafer are not
  matched, although the family lists them as aliases and as `extra_tvs`:
  - eptc53413.2021.9663896-b
  - eptc56328.2022.10013262-a, -c, -e
  - ectc51909.2023.00053-a, ectc51909.2023.00266-a
  - Fix: add `tn=M-Series|6-sided` to the rule, or decide explicitly that wafer-format M-Series stays out.
- ucla_si_if, untagged:
  - ectc51846.2026.00062-b
  - iedm45741.2023.10413759-b, -c
  - ectc51909.2023.00274-b, -c (TSV-less dielet PDN daisy chains on Si-IF, class wafer_scale)
- emib: ectc51529.2024.00087-b (Intel substrate team, "510x515 mm embedded bridge die substrate TV", class
  si_bridge_organic, untagged). An EMIB substrate by inference; the paper text does not say "EMIB". Tag only if a
  figure confirms it.
- ibm_dbhi, untagged:
  - ectc51846.2026.00050-f ("PDN simulation model: non-TSV bridge (DBHi)")
  - ectc51687.2025.00049-a/b (Si-bridge self-alignment coupons in a DBHi paper)

### M7. Families the database covers but the list lacks

- Generic microbump 3D (D2W / C2C TCB):
  - 50 physical microbump_3d TVs match no family, for example:
    - imec ectc51906.2022.00179, tcpmt.2025.3628798, icep55381.2022.9795565
    - SPIL ectc51906.2022.00181-a (already used as a Foveros analog)
    - Resonac estc60143.2024.10712129-a..d
    - CEA tcpmt.2021.3104326
    - ASE MELI-Cu ectc51906.2022.00038
  - Add a non-illustrated peer set `microbump_d2w_peers` (counterpart of hybrid_bond_d2w), to feed Foveros,
    X-Cube and HBM analogs with their own refs.
- Organic RDL interposer peers: IBM ectc51909.2023.00150-a/b (FPGA/HBM2 on organic interposer, untagged) and
  Resonac ectc51687.2025.00326 are unmatched. Add them to a cowos_r peer set, next to
  samsung_i_cube_r / ase_focos_chip_last.
- No other packaging family with physical TVs is missing. The rest of the unmatched TVs are class `other`
  (120) or process/material coupons.

### M8. Double-claimed TVs (shares and counts overlap)

| TV | families | note |
|---|---|---|
| ectc51909.2023.00178-a/b/c | samsung_x_cube, hybrid_bond_d2w | add the paper to hybrid_bond_d2w `excl_papers` |
| vlsitechnologyandcir46769.2022.9830182-i | soic, hbm_stack | `SoIC_HBM` is in both the soic and hbm_stack aliases |
| ectc51687.2025.00323-a | hybrid_bond_d2w, hybrid_bond_w2w | CoWoW |
| vlsitechnologyandcir65830.2026.11577576-d | fcbga_organic, hbm_stack | simulation |
| ectc51687.2025.00012-a/b/c, 00061-a | emib, cpo_module | probably intended (EMIB-based CPO) |
| ectc51846.2026.00134-a | emib, glass_core_substrate | probably intended |

Fix: make overlaps deliberate (a `shared_with` note), or exclude them.

### M9. foveros_direct attribution is broader than the product

- The family holds 5 Intel hybrid-bond papers. Only ectc32696.2021.00166-b ties to the Foveros brand, and the
  Clearwater Forest white paper ties Foveros Direct to "direct attach of one or more chiplets to an active base
  tile" at 9 / 3 um.
- ectc51529.2024.00128 (0.64-0.36 um W2W lattices), iedm45625.2022.10019499 (QMC) and ectc51687.2025.00009 (MLV)
  are pathfinding. The white paper does allow "direct bonding of entire wafers", so W2W is not excluded outright.
- Fix: name the family "Intel hybrid bonding (Foveros Direct and pathfinding)", or move ectc51529.2024.00128 to
  hybrid_bond_w2w. RESEARCH already flags the inference; carry the qualifier into the UI summary.

### M10. URL claim not found on the cited page

- Claim: url:aseglobal.com/press-room/focos-bridge says "Si bridges embedded in the fan-out RDL layer (primary)".
- The fetch on 2026-10-20 returned no placement statement. The page gives 47 x 31 mm FO structures, each with
  1 ASIC + 4 HBM + 4 bridges, two per 70 x 78 mm package, and submicron L/S.
- Fix: replace the claim with what the page states. The placement is already supported by
  db:ectc51529.2024.00151 p.2 Sec. II.A.

## Minor

- m1. cowos_s locators:
  - "100 um interposer" is not on p.2 Table I. It is at db:ectc51909.2023.00135 p.3 Sec. III.E and p.4 Table II.
  - RESEARCH item 1 cites the same paper for "Lid + TIM", but the paper has only a Cu stiffener ring.
  - The CoWoS-S backbone is a MediaTek paper (customer TV tagged CoWoS). Show the author org in the refs panel.
- m2. RESEARCH samsung_i_cube_e says "bridge orientation (face up) is implied by DAF attach, not stated". It is
  supported by process_steps ectc51687.2025.00048-a-s05 ("grind mold to expose bridge Cu bumps", p.3 Sec. III.B)
  and the DAF text (text.md line 146). The flow is RDL-first: lower RDL and Cu posts on the carrier, then the
  bridges (p.2 Sec. II.B).
- m3. `scripts/build_package3d.py` compiles `family_match` case-sensitively (line 248). families.yaml documents
  the `tn` rules as case-insensitive. This has no effect today. Align them.
- m4. Counts drift: recomputing gives ucla_si_if 11 physical TVs (yaml 10), and `data/test_vehicles.csv` is
  modified and uncommitted. Re-run the counts after the revision pass merges.
- m5. foveros_direct summary: the cited white paper (Clearwater Forest, 2024-02) says "thermocompression bonding
  of copper vias", F2F or F2B, chips or wafers. It does not state the base-tile TSVs or "no underfill". The TSV is
  supported by db:ectc51529.2024.00017 p.2 Sec. II.A instead. Re-attribute it.
- m6. hbm_stack MUF wall flush with the base-die edge is a derived (10.8 - 10.5)/2 layout, not a reported edge
  geometry. Note it in the callout.

## Verified (sampled; no change needed)

- cowos_s:
  - db:ectc.2013.6575597 p.1 gives TSV 10 um x 100 um, ECP Cu with an oxide liner, 3 Cu damascene levels below
    1 um pitch plus Al RDL at 5 um, 40 um ubump, and SnPb C4 at 200 um directly on the TSV.
  - db:ectc51909.2023.00135 p.1-2 gives 40 um ubump, 150 um Cu-pillar C4, UF1/UF2, mold between the SoC and the
    memory, Cu ring, Table I sizes, and the Fig. 3 floor plan as templated.
- cowos_r:
  - db:ectc32696.2021.00125 p.2: 4 RDL, 2 um Cu, 5-2-5 substrate.
  - db:ectc51529.2024.00049 p.2: 9L, 2/2 um, via 8/11 um with 3 stacked vias, 248 IPD, 150 um D2D gap, 35 um
    ubump, 66 x 68 / 97.3 x 95 mm, SUS430, ~50 um ubump-to-C4 path, no TSV.
  - db:ectc51906.2022.00008 p.2 Table I: TSV-less.
  - db:ectc51687.2025.00085 p.2 Table 1: graphite film, lid.
- cowos_l, db:ectc51909.2023.00174:
  - p.2 Sec. II.A-B: TIV on the carrier first, then LSI placement, mold, CMP; one RDL per RI face; chip-last.
  - p.3 Sec. II.C: LSI has TSV; LSI-1 0.8/0.8 um, 2 um thick; LSI-2 2/2 um, 2.3 um thick; Cu via on the top
    metal to the front RDL. The face-up LSI in the template is consistent.
  - db:ectc51909.2023.00091 p.2-3: 7 RDL (1 front + 6 back), uBGA layer ~200 um with IPD, 3-2-3 substrate,
    91 x 91 mm, 6 LSI, 45 IPD.
- emib:
  - db:ectc.2016.201 p.6 Sec. III: cavity at the final build-up layer, adhesive, final build-up dielectric,
    fine/coarse vias, TCB plus capillary underfill, bridge below 75 um.
  - p.5 Fig. 4(a) render: 55 vs 130 um, bridge in the top build-up.
  - Table II: 2x2 to 8x8 mm, M1-M4 2/2 um.
  - Intel EMIB brief (2025-07) states the adhesive, EMIB-M MIM, EMIB-T TSV for HBM power, and the Foveros-S /
    Foveros-R / Foveros Direct lineup.
- emib_t:
  - db:ectc51687.2025.00051 p.2 Fig. 2 (power path through the TSV bridge to HBM); p.3 Sec. III.B (cavity pads,
    solder joint, encapsulation and vias); p.4 Sec. III (underfill between the bridge backside and the cavity;
    face-up is consistent); p.4 Sec. IV (77 x 56 mm, 3 bridges, 45 um).
  - db:ectc51846.2026.00051 p.4-5 (TSV arrays + MIM 500 nF/mm2), p.3 (<3 um overlay).
- foveros:
  - db:iedm19573.2019.8993637 p.1-2: F2F, 50 um pitch / 25 um diameter ubump with solder on both dies, TSV-mid
    in 22FFL, 9 um target, 15-16 um array pitch, ~75 um reveal, nitride, bump aligned to the TSV.
  - db:ectc51846.2026.00051 p.2: FOVEROS-S 25 um in HVM.
- hbm_stack:
  - db:ectc51909.2023.00151 p.2: 10.8 x 9.8 / 10.5 x 9.5 mm, 720 um, 15 um gap, MR-MUF flow (Fig. 4), thick top
    die.
  - db:vlsitechnologyandcir65830.2026.11577576 p.1: 12-layer kept at 720 um.
- foveros_direct: db:ectc32696.2021.00166 p.5 (OCR) "Foveros architecture", 4 top + 1 base, 9 um.
  db:iedm45625.2022.10019499 p.2-3: oxide fill, TDV, support wafer, 3 um.
- samsung_mios: db:ectc32696.2021.00315 p.2 gives 85 x 85 mm, 51 x 55 mm interposer 110 um, EMC, Cu-pillar
  solder bumps.
- samsung_x_cube: db:iwlpc52010.2020.9375855 p.3 gives F2B SRAM on logic with TSV, mold around the SRAM,
  12 x 12 mm substrate, 125 um Cu pillar, 1.1 mm, 0.4 mm BGA.
- amkor_s_connect: db:ectc51909.2023.00175 p.2 gives face-up connect die and IPD with Cu stud, tall Cu pillars,
  first mold, double-side RDL, 2nd mold.
- ibm_dbhi: db:ectc51909.2023.00180 p.1-2 gives the machined cavity in the original DBHi, a 60 um bridge, and
  the Cu-pillar standoff in surface-DBHi.
- Family boundaries judged sound:
  - I-Cube R and FOCoS chip-last fold into cowos_r. Both are RDL interposers built on a temporary carrier with
    microbumped dies and C4 (eptc62800.2024.10909872 p.2; ectc51906.2022.00309 p.1-2).
  - MIoS kept separate and labelled "I-Cube S class, unverified". A web search on 2026-10-20 found no public
    MIoS = I-Cube mapping. I-Cube4 is stated mold-free (press reports), and 3dincites confirms I-CubeS = Si
    interposer, 3x reticle, 8 HBM + 2 logic.
  - EMIB-T bridge attach (solder + underfill) is per the Intel paper.
- URLs checked 2026-10-20 that support their claims:
  - tsmc.com InFO (InFO_oS 2/2 um, 40 um I/O, 130 um C4, >2X on >65 mm; InFO_PoP no substrate/C4)
  - tsmc.com WLSI ("chip-last on interposer")
  - amkor.com S-Connect (TSV optional, tall pillar, 40-50 um)
  - 3dincites ?p=84689 (I-CubeS, I-CubeE 12 HBM, X-Cube microbump or bumpless)
  - Intel EMIB brief
  - Intel Clearwater Forest white paper (Foveros Direct 9 then 3 um; EMIB 55 to 45 um)
