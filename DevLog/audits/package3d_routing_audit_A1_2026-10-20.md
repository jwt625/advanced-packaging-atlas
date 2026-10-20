# Audit A1: package3d mock-up routing, provenance and scorer legitimacy (2026-10-20)

Fresh-context audit of DevLog-011 wave 2 + F1 (23 family templates with `route` / `routing`, `scripts/score_package3d.py`,
`config/package3d/fidelity_checklist.yaml`). Read-only except this file.

## What was run / read

- `uv run python scripts/build_package3d.py --out <session scratchpad>`: rebuilt JSON is identical to
  `app/static/data/package3d.json` (except `generated`), so the app JSON is in sync with the YAMLs. `--check` passes
  (23 families, 866 refs); 4 warnings (cpo `oio_*` / `fau_*` footprints), none routing.
- `uv run python scripts/score_package3d.py`: wrote `outputs/package3d_scores/2026-10-20_134425.{json,md}`; table
  identical to `2026-10-20_133750.md` (only the "(F1 final)" label differs). Both files I created were copied to the
  scratchpad and deleted from `outputs/`.
- Scorer variants (patched copies in the session scratchpad, not in the repo; outputs to the scratchpad):
  (a) microvia AR on the entry (wide) diameter; (b) no L/S skip for beol_via / bridge_via / hybrid-bond endpoints;
  (c) no joint-array gap coverage / orphan exemptions. Results quoted below.
- Automated provenance pass over every dim in the JSON (7734 dims; 3015 in routing scope: route, routing vias / nets,
  array pad / opening, layer h_um): for every `reported` / `derived` dim, each ref cell re-read from `data/*.csv`,
  compared with the JSON refs table and the dim value (incl. um/mm conversion), and its TV tested with the generator's
  `Matcher` against the family rule in `families.yaml`. 404 reported / derived routing-scope dim instances:
  0 value mismatches, 0 out-of-family cells, 0 refs table / CSV mismatches.
- Manual semantic check of 99 routing dims (section "Provenance sample"), with the CSV row, and for figure / text
  claims the key figure or `text.md` (figures viewed: ectc51687.2025.00148-f01, ectc51687.2025.00178-f01, -f04,
  ectc.2013.6575597-f06, ectc51687.2025.00095-f04, 001c.129513-f04; text: ectc51529.2024.00265 Table I,
  ectc51846.2026.00051 p.1-3, ectc51529.2024.00049 Sec. IV.A, ectc51846.2026.00199 Sec. III.A).
- M2 / M3 spot checks by reading the JSON directly: fcbga_organic, emib_t, soic (section "Spot checks").

Counts: **2 blocking, 10 should-fix, 12 minor.**

## Blocking

### B1. Absolute local path in a new script (privacy rule)
- `scripts/render_package3d.py:33` (untracked, S1 deliverable, will be committed with the scorer): `DEFAULT_CHROMIUM`
  is a hard-coded absolute path into the user's home Playwright cache (`.../Library/Caches/ms-playwright/
  chromium_headless_shell-1234/...`), including the user name.
- Fix: default to `None` and let Playwright resolve its own browser, or read an env var
  (`APA_CHROMIUM`) / a `--chromium` CLI arg; no path in the file. Re-grep staged files for `/Users/` before commit.

### B2. fcbga_organic routed build-up is physically impossible and contradicts its own backbone table
- Stack (JSON): 8 x (13 um Cu + 9.5 um "dielectric") per side; microvia 60 um top diameter through 9.5 um
  (AR 0.16; DB organic_substrate class 0.33-3, ROUTING_REF_substrate.md row 10 / section 3: "AR 0.4-1.0", "thin Cu
  (12-20) inside thicker dielectric (15-40)"); Cu thicker than the insulation on every level (8 atypical flags).
- Root cause 1 (three-TV chimera, each cell in-family so every status is formally right): totals from
  ectc51529.2024.00265-a (8-2-8, c2 1800 um, L08 1400 um), Cu 13 and L/S 25/25 from estc60143.2024.10712019-b
  (a space-SiP R-G740M RCC build-up whose own dielectric is 30 um, row -L04), via 60 um from ectc51687.2025.00148-a
  (a 40 um ABF stack, row -L04). Each source is self-consistent; the mix is not.
- Root cause 2 (new evidence for the pending owner decision): the backbone paper's Table I
  (`references/ectc51529.2024.00265/text.md` lines 200-235) states inner-layer Cu remaining ratio
  "L3, 5, 7, 9, 10, 12, 14, 16: 100% or 75%; L2, 4, 6, 8, 11, 13, 15, 17: 0%". It is a mechanical warpage / BLR TV.
  The model draws 25/25 signal Cu on L2/4/6/8 and L11/13/15/17 (`fc_sig_*`, `fc_l8`, `bk_l11`, `bk_sig_*`), i.e. on
  levels the backbone says carry no Cu, and it is the 13 um Cu on those levels that squeezes the derived insulation to
  9.5 um. The YAML header (lines 15-24) cites the Cu-rich rows but omits the 0% rows.
- Arithmetic of the options (all from DB cells; status as noted):
  - A, literal backbone: Cu only on L1/3/5/7 per side: (200 - 20 SR - 4 x 13) / 8 films = 16 um per film (derived);
    a via L1 -> L3 crosses two films (32 um) -> AR 0.53 for the 60 um via; but then no signal levels exist (it is a
    mechanical TV), which defeats the mock-up purpose.
  - B, one coherent in-family level stack (recommended): 10712019-b throughout (Cu 13, RCC 30, L/S 25/25, measured
    stacked-via widths 44.18-56.33 um, metric -m5): per side 20 + 8 x (13 + 30) = 364 um, total 1400 + 2 x 364 =
    2128 um (template, conflict with the reported 1.8 mm stated in a callout); AR about 30 / 50 = 0.6; with the
    110/70 land rule (~79 um) 200 - 79 = 121 um >= 25 + 2 x 25, so M6 L/S still passes. Alternative B': 00148 throughout
    (15 / 40 / 60 / 30/50) gives 2320 um and fails the M6 L/S heuristic at 200 um pitch.
  - C, keep 9.5 um and shrink the via: no in-family organic_substrate row supports a ~20-30 um laser via (only 15 um
    PID vias in 5 um PID, eptc67330.2025.11392176-a-L04); not recommended.
- The rule (M6 microvia AR) is right here; the model is wrong. Fix: option B (or A by owner choice), note the 0% rows
  in the header and in the `bu_d_h_um` note, and keep the reported 1.8 mm / 8-2-8 in a callout.

## Should-fix

### S1. Scorer M6 microvia AR uses the narrow end for vias drilled from the bottom (glass M6 = 4 is a scorer bug)
- `scripts/score_package3d.py:1477` `ar = float(v["h_um"]) / d` with `d = diameter_um` (top). Back-side laser vias are
  stored with `diameter_um` = narrow top and `bottom_diameter_um` = wide laser entry (contract, TEMPLATE_FORMAT
  routing section). glass `mv_bs/bp/b9/b10`: 15 / 10.2534 = 1.463 > DB glass-class max 1.0
  (ectc51909.2023.00298-a-L06 15/15). The same vias on the entry diameter: 15 / 20 = 0.75, inside [0.333, 1.0].
- Model is consistent (front 15/20 = 0.75; back mirrored). Rule implementation is wrong.
- Verified with patched copy (a): glass_core_substrate M6 4 -> 0; every other family unchanged (fcbga stays 8).
- Fix: `ar = h / max(diameter_um, bottom_diameter_um or diameter_um)`; update the docstring ("depth / top diameter"
  -> "depth / laser-entry (larger) diameter") and the DevLog statement that glass has 4 violations.
- Side note: the glass AR range is n = 6 rows of one paper (AR_PCLASS, `score_package3d.py:1433`); list n in the
  report so a single-paper range is visible.

### S2. M5 is non-discriminating: min-max ranges pooled across simulation sweeps and unrelated rows
- Examples from the rerun: substrate_buildup dielectric [2, 300] (2 um spin-on PID tcpmt.2025.3610036-a-L02;
  300 um from a simulation sweep ectc51687.2025.00178-g-L01 "Thickness swept 60-300 um (simulation)"); beol_via
  diameter [0.036, 240]; interposer RDL line [0.4, 190]. Result: M5 = 0 out-of-range for all 23 families, while the
  9.5 um fcbga dielectric (P10-P90 15-60) and 0.3 um BEOL vias (P10-P90 0.5-35) only appear as uncounted "atypical".
- Goodhart risk: "P10-P90 atypical not counted" plus polluted min-max means M5 cannot fail.
- Fix: build ranges with `--physical-only` by default (drop `tv_kind = simulation_model`), count P10-P90 (or P5-P95)
  outliers in M5 when n >= 10, and narrow classes by role + material_class (+ feature for vias). Keep min-max as a
  secondary column.

### S3. M3 checks z continuity only; grid-via / endpoint xy mismatches pass unseen
- `walk()` (`score_package3d.py:1013`) accepts any via class spanning a dielectric under the probe point; it never
  checks that a grid via (pitch_um) can sit under the endpoint array without a routing level in between. M3 is
  therefore close to M4 (both reduce to "every gap has a via class").
- Real mismatches found in the JSON:
  - cowos_s: TSV grid 100 um (`cowos_s.yaml:96`, analog pitch_max) vs C4 150 um; the TSV lands directly on the pad-only
    level `ip_bpad` (`cowos_s.yaml:358`), no backside RDL, so most C4 cannot sit on a TSV. The 2013 backbone states
    C4 directly on TSV (ROUTING_REF_si.md "C4 at backside": 1 TSV per C4).
  - emib_t: bridge TSV grid 50 um (`emib_t.yaml:158`) vs cavity bumps 175 um, TSV `lower` = null (bridge bottom, no
    backside pad / RDL level), so TSVs and cavity bumps do not line up.
- Fix (model): cowos_s TSV pitch = C4 pitch (one TSV, or a cluster, per C4, as done for Foveros); emib_t add a bridge
  backside pad / RDL level or set the TSV grid to the cavity pitch (groups of 3-4 TSVs per bump per R2 row EMIB-T).
  Fix (scorer): flag a grid via whose pitch does not divide (or equal) the pitch of the endpoint array it touches when
  no routed signal level lies between them.

### S4. Metric-driven parameter choices (Goodhart) and inconsistent rules for the same structure
- fcbga L/S 25/25 chosen over the 30/50 of the via / PTH source TV "so a trace fits between 94 um lands at 200 um"
  (YAML header lines 22-23, DevLog T1); source is a space-SiP RCC TV (see B2).
- foveros / foveros_direct `mv_land_um` = via + 12 um (`foveros.yaml:186`, `foveros_direct.yaml:180`), note: "(the
  module's 110/70 ratio does not)" fit the 110 um field; the same `sbt_828` module in cowos_r / info_os / ibm_dbhi
  keeps 110/70 (62.86 um vs 52 um for the same 40 um via).
- info_os `bu_n` 8 (`info_os.yaml:66`) and ibm_dbhi `bu_n` 8 (`ibm_dbhi.yaml:88`) chosen so the derived dielectric
  lands in the DB range (notes say so).
- hybrid_bond_w2w `mz_space_um` 1 (`hybrid_bond_w2w.yaml:78`) and hybrid_bond_d2w `rdl_space_um` (derived) sized to
  pass the L/S rule.
- These are transparent (notes state them) but they tune the model to the heuristic M6 L/S rule (one trace between
  every pair of lands at bump pitch on every level), which real escape routing does not require on every level.
- Fix: one land rule per archetype for all families (pick via+12 or 110/70 and apply everywhere, rule 4 "apply a fix
  everywhere"); record each metric-driven choice in the DevLog as such; state in the scorer docstring that the M6
  L/S check is a heuristic and change it to "on at least one signal level between the endpoint and the first jog".

### S5. BEOL via chimeras: 0.3 um via in a 1.0 um IMD (AR 3.3)
- cowos_s `bv2/bv3`, samsung_mios `bv2..bv5`, foveros `b_bv1`: `bv_d_um` 0.3 analog ectc51909.2023.00009-a-L06
  (POPSTAR Via 2, which sits in a 0.54 um interlayer) inside `imd_h_um` 1.0 analog ectc51846.2026.00035-a-L02 (PSB
  ILD). Lines: `cowos_s.yaml:131-134`, `samsung_mios.yaml:115-118`, `foveros.yaml:140-143`. No DB row has a 0.3 um via
  through 1 um.
- Fix: pair via CD with the dielectric of the same analog row (0.3 / 0.54 um, or 0.75 / 1.5 um from -L04).

### S6. L/S-between-lands skips hide real tight geometries
- `score_package3d.py:1502` skips `bridge_via` / `beol_via`; `:1539` drops hybrid-bond endpoint pitches. Patched copy
  (b) shows what is masked: emib_t `bv_top` / `bv_pad` lands 22 um at 25 um pitch (3 um land-to-land, below any SAP
  space in the DB); emib / cpo `bv_fine` 55 - 30 = 25 um < 14 + 2 x 20; soic `bv_bot` 3 - 1.5 = 1.5 um < 1 + 2 x 1 on
  M1 1/1.
- The skip assumes a via under every pad; with net shares that is not what the viewer draws.
- Fix: for bond / bridge fields use the effective via pitch `pitch / sqrt(share)` of the nets that use the class,
  and always check `pitch - land >= min space of the level` (no skip). Re-size emib_t bridge-via land (EMIB-T row
  gives overlay < 3 um; the 16 um via is a 55 um-pitch analog, too large for 25 um).

### S7. Same structure, different template rules across families
- PTH land: 1.6 x hole (fcbga, `fcbga_organic.yaml:103`) and 1.5 x hole (emib `:118`, emib_t `:115`, cpo `:159`) both
  "estimated from" the same 4-2-4 schematic ectc51687.2025.00148-f01; 110/70 (cowos_s `:203`, cowos_r module,
  samsung_mios `:196`); 1.6 x again in cowos_l module. PTH wall 14 / 14.875 / 15 um from the same eptc62800 legs.
- TSV land: 1.5 x (cowos_s, samsung_mios, foveros, soic, x_cube, hbm), 11/8 (cowos_l LSI), 110/70 (emib_t; note says
  "the only DB land/via ratio", untrue since 11/8 is used elsewhere).
- LSI / interposer TSV pitch from the same row eptc59621.2023.10457670-a-i1: pitch_max 100 (cowos_s, mios) vs
  pitch_min 50 (cowos_l, emib_t).
- Fix: one value per structure class (a shared module param or a table in TEMPLATE_FORMAT.md), applied to all
  families; the compare view otherwise shows template-rule differences as technology differences.

### S8. RDL via classes without lands make M6 vacuous
- fan_out_panel: `v01/v12/v23` have no `land_um`; M6 evaluates 1 rule (pitch hierarchy only). Same for every `c4v`
  and glass `bv`. Checklist `rdl_via` (`via_per_gap`) does not require `land_um`, unlike `microvia`.
- Fix: `needs: [land_um]` for rdl_via in organic_rdl_interposer; add a template land (e.g. via + 2 x overlap as
  001c.129513-f04 VLO >= 4 um, as samsung_mios already does) or report M6 as N/A when lands are absent.

### S9. Checklist names promise properties the checks do not test
- `pth_class` (`fidelity_checklist.yaml:116`): name says "resin plug (cores >= 400 um), or a Cu-filled through hole";
  the `filled` branch is not gated on core thickness (a 1.3 mm core with `fill: filled` would pass) and `plug` is not
  checked. fcbga (`fcbga_organic.yaml:243`), emib (`:343`), emib_t (`:363`) have `fill: plugged` without
  `plug: resin` although names / notes say resin-plugged (the viewer defaults to resin, so renders are right; the JSON
  and tooltips are not).
- Fix: gate the filled branch on core h < 400 um (R1 rule), require `plug` with `plugged`; add `plug: resin` to the
  three YAMLs.

### S10. M3 / M2 pass statements in the DevLog read stronger than the metrics are
- M2 is presence-only and M3 is z-continuity (S3); "M2 >= 0.92, M3 1.00, M4 full, M5 0" for 23 families should not
  be read as fidelity. Combined with S2 / S6, three of the five automatic metrics cannot currently fail for a
  plausible-looking layer stack.
- Fix: after S1-S3, S6, S8 re-score and report the new counts; describe M2-M4 as completeness checks in DevLog-011.

## Minor

- M1. FOCoS `rv_f` (`ase_focos_bridge.yaml:79`) is `reported` from ectc51687.2025.00095-a-i2 ("passivation via
  opening landing on tall Cu pillar and bridge Cu stud"); the class also spans `ri_f_diel_1` between the two RDL metals
  (`rv_f_1`), a via the cell does not describe. Split the class or make `rv_f_1` template with the cell as ref.
- M2. Reported cells applied beyond what they describe: ibm_dbhi 9/12 L/S (ectc51909.2023.00180-a-L09, one surface
  laminate row, "layer count, core and dielectric not given") on all 16 build-up levels incl. the BGA side; glass L2
  5/5 from a serpentine / comb test structure (ectc51846.2026.00199-a-L05) and single-metal-layer panel values
  (Sec. IV.B) on all 20 levels. Notes partly say so; add "applied to every level (template choice)".
- M3. hbm_stack `ub_pitch_um` (`hbm_stack.yaml:61`) is reported from vlsitechnologyandcir46769.2022.9830182-j
  (`tv_kind = simulation_model`, STCO 12-Hi micro-bump HBM model); the note does not say simulation.
- M4. fcbga / module microvia land ratio 110/70 comes from 001c.147203-a-i1, a 150 GHz coreless AiP antenna substrate
  (R-G640, qualifiers `pad_x_um:ge`, a minimum design rule); notes call it "coreless stacked-via TV" only.
- M5. emib_t `tsv_land_um` note claims 110/70 is "the only DB land/via ratio"; 11/8 (ectc51687.2025.00047-a-i3) and
  via + 2 x 4 um (001c.129513-f04) are used elsewhere.
- M6. Open fix-pass item not closed: PTH AR 7.0 (1400 / 200) in cowos_l, cowos_r, info_os, foveros, foveros_direct
  and 6.8 in fcbga vs DB 3.7-6.5 (n = 3, ROUTING_REF_substrate.md row 14). Mechanically drilled 200 um holes in
  1.4 mm cores are plausible; state it in the PTH note or close the item.
- M7. `single_row_range` (`score_package3d.py:1297`): a value up to 50 % off a one-valued range is not counted;
  arbitrary threshold (only samsung_x_cube `th` pitch 400 vs 500 affected). Report it with the row count.
- M8. M5 material-class inference (`MCLASS_TEXT`) misclassifies a few rows: eptc67330.2025.11392620-a-L16
  "M1-to-Si dielectric" -> silicon, 3 conductor rows -> silicon, 1 dielectric row -> metal. Restrict inference to
  role-consistent classes (conductor -> metal, dielectric / passivation -> dielectric_*).
- M9. Checklist F1 rationale "bridge_attach not for tsv (CoWoS-L LSI: no DAF and no bridge-bottom joint reported)":
  "not reported" is not "absent"; the justified reason is the R2 flow (LSI TSV lands on the B/S RDL,
  ROUTING_REF_si.md line 107 "CoWoS-L" path and line 242 "TSV in LSI (CoWoS-L)"). Reword.
- M10. DevLog-011 M1 target "no regression of reported share" is violated in share terms for every family
  (e.g. cowos_s 0.32 -> 0.13) because routing adds template dims; distinct reported cells did not drop (checked vs HEAD
  JSON for cowos_s, foveros, ase_focos_bridge, amkor_s_connect, cowos_l, samsung_mios, soic; fan_out_panel lost 11
  cells of the old backbone by design). Restate the target as "no reported cell lost".
- M11. `outputs/package3d_scores/` (not ignored) holds 10 intermediate snapshot pairs (13:00-13:37); keep the baseline
  `130445` and the final, delete the rest before commit (rule 5).
- M12. `config/package3d/TEMPLATE_FORMAT.md:67` "All 12 templates use `{families: true}`": 23 now (pre-existing text).

## Answers to the specific questions

### fcbga_organic, 9.5 um dielectric, M6 = 8
- 8 = one root cause counted once per microvia class template (4 front, 4 back). See B2: model wrong, rule right; the
  backbone's own Table I (L2/4/6/8 0% Cu) removes the reason for the 9.5 um. Recommendation: option B.

### glass_core_substrate, M6 = 4
- Fails: `microvia_ar` for the 4 back-side classes, 1.463 vs [0.333, 1.0]. The scorer divides by the narrow end of
  vias drilled from the BGA side. Model right, rule implementation wrong (S1). With the fix: 0.

## Scorer relaxations: verdicts

| relaxation (S1 / F1) | verdict | evidence / condition |
|---|---|---|
| `not_in` / `only` variants (no_tsv, single_level, surface, cored, tsv, heatsink) | justified | structural differences, but set by hand next to the expectations: cite the source row per variant |
| `no_back_rdl` (FOCoS TV-1) | justified | ectc51687.2025.00095-a-L08 "bottom passivation (1 layer)" verified |
| `dies_share_min` | justified | only changes foveros, whose 2-base-die split is itself a template choice (foveros.yaml header); the pass rests on that topology |
| net_d2d not for `cored` RDL | justified | D2D checked by bridge_in_mold.net_d2d |
| bridge_attach not for `tsv` | justified, wrong reason | see minor M9 |
| joint arrays cover gaps (M4) / prevent orphans (M3) | justified | patched copy (c): only soic (bond gap, `dt_hbv` / `db_hbv` orphans) and hbm_stack (8 inter-die gaps) change; bumps / bond pads are the conductor across those gaps. soic needs it because the HBV is drawn as a pad-use conductor slab, not a via class |
| orphan z-contact rule | justified | stacked pad / Cu levels |
| through-part via ends resolved to neighbours | justified | contract `upper/lower` null at part faces |
| cavity-aware walk | justified | the bridge cavity displaces build-up levels; viewer cuts them (E1) |
| die_encap n/a when joints land off-model | justified | SoIC bottom bumps to an off-model carrier |
| beol_via land: no DB range | justified | DB pad cells are RDL-via caps; listed as no_db_range |
| tmv range incl. tiv / cu_pillar through-vias | justified | a TIV is a Cu pillar through mold (ectc51909.2023.00175-a-i4) |
| pth_class `any_of` Cu-filled | partly | right for the X-Cube thin core (eptc62800.2024.10909809-a-i1); not gated on core thickness, plug unchecked (S9) |
| L/S rule skips beol_via, bridge_via, bond fields | not justified as a skip | masks 5 tight cases (S6); use effective pitch + min space |
| single-row ranges (within 50 %) | weak | minor M7 |
| P10-P90 atypical not counted | not justified with polluted min-max | M5 cannot fail (S2) |
| M5 material-class inference | justified in intent | a few wrong classes (minor M8) |
| microvia AR per package class (AR_PCLASS) | justified | but AR on the top diameter is a bug (S1); glass range n = 6, one paper |

## Spot checks (M2 / M3 read from the JSON)

- fcbga_organic: z chain bump (2278-2323) -> `sr_top` opening -> `fc_pad` -> `mv_f1` .. `mv_f8` (lower null at 2078)
  -> `core_cu_top` 2060-2078 -> `pth` 696-2060 -> `core_cu_bot` -> `mv_b1` .. `mv_b18` -> `bk_pad` -> `sr_bot`
  opening -> bga top 478: contiguous, M3 2/2 confirmed. Counts 8 front / 2 core / 8 back Cu levels = 8-2-8; planes on
  L3/5/7 and L12/14/16 as the backbone Cu-rich levels; signal on the backbone's 0% levels (B2).
- emib_t: M2 37/37 recounted by hand (organic_substrate 22, si_bridge_substrate [tsv] 11, die 4). Bridge 2016-2066
  sits in a cavity through `bu_pl_1`, `bu_ds_2`, `bu_sig_2`, `bu_dp_2`; cavity fill + 175 um cavity bumps 1976-2016
  land on `core_cu_t` (1961-1976). TSV `lower` null resolves to `cavity_bumps`; z contiguous, but xy pitch mismatch
  50 vs 175 (S3).
- soic: chain `hb` (72-73) -> `db_hbv` -> `db_mz` -> `bv_bot` -> `db_m1` -> `tsv` 27-69.07 (through `db_si` and
  `db_box`) -> `db_bpad` -> bumps 0-22: contiguous. M2 16/16 = hybrid_bond_stack 9 + die_top 4 + die_bot 3 (encap n/a).

## Provenance sample (99 routing dims; all cells re-read from data/*.csv)

Legend: ok = value equals the cell, status follows the family rule, note true. Issues reference the findings above.

| # | family | dim | value | status | source | verdict |
|---|---|---|---|---|---|---|
| 1 | fcbga_organic | sr_top h | 20 | reported | ectc51846.2026.00119-b-L01 | ok (coupon, in-family) |
| 2 | fcbga_organic | build-up Cu h | 13 | reported | estc60143.2024.10712019-b-L03 | ok cell; RCC space SiP TV (B2) |
| 3 | fcbga_organic | L/S | 25/25 | reported | 10712019-b-L03 | ok cell; metric-driven pick (S4) |
| 4 | fcbga_organic | dielectric h | 9.5 | derived | 00265-a-c2, -L08, -L07, 00119-b-L01, 10712019-b-L03 | arithmetic ok; contradicts Table I (B2) |
| 5 | fcbga_organic | microvia d | 60 | reported | ectc51687.2025.00148-a-i2 | ok cell; 40 um ABF source (B2) |
| 6 | fcbga_organic | microvia land | 94.29 | template | 001c.147203-a-i1 110/70 | ok; AiP source (minor M4) |
| 7 | fcbga_organic | microvia bottom | 53.83 | template | ectc51687.2025.00076-b-i1 notes "72 deg taper" | ok |
| 8 | fcbga_organic | PTH d / pitch | 200 / 500 | reported | 00148-a-i4 | ok |
| 9 | fcbga_organic | PTH land | 320 | template | fig 00148-f01 (viewed) | plausible; 1.5x elsewhere from same fig (S7) |
| 10 | fcbga_organic | PTH wall | 14.875 | template | eptc62800 m17-m20 16/18.5/11/14 | ok arithmetic |
| 11 | fcbga_organic | core-face Cu | 18 | reported | 10712019-b-L05 | ok |
| 12 | fcbga_organic | core laminate | 1364 | derived | 1400 - 2 x 18 | ok |
| 13 | cowos_s | interposer Si | 100 | reported | ectc.2013.6575597-a-L05 | ok |
| 14 | cowos_s | TSV d | 10 | reported | ectc.2013.6575597-a-i2 | ok |
| 15 | cowos_s | TSV pitch | 100 | template (analog) | eptc59621.2023.10457670-a-i1.pitch_max | value ok; density claim approximate (0.60 % vs 0.79 % for 10 um at 100 um); xy mismatch with 150 um C4 (S3) |
| 16 | cowos_s | TSV liner | 0.4 | template (analog) | ectc51909.2023.00307-a-L05 | ok |
| 17 | cowos_s | Cu L/S | 0.4/0.4 | template | ectc51909.2023.00108-a-L01 + ectc.2013-a-L04 "pitch below 1 um" | ok |
| 18 | cowos_s | Al L/S | 2.5/2.5 | template | ectc.2013-a-L03 "5 um pitch" | ok |
| 19 | cowos_s | BEOL via d | 0.3 | template (analog) | ectc51909.2023.00009-a-L06 | value ok; chimera with 1 um IMD (S5) |
| 20 | cowos_s | build-up Cu | 14.4 | template | (1600 - 1300 - 36 - 120) / 10 | ok |
| 21 | cowos_s | ubump pad | 27 | template (analog) | ectc51909.2023.00155-a-i1 (40 um pitch) | ok |
| 22 | cowos_s | C4 SR opening | 52 | template (analog) | 00155-a-m5 (measured, design 50) | ok |
| 23 | cowos_r | RDL L/S | 2/2 | reported | ectc51529.2024.00049-a-L02 | ok |
| 24 | cowos_r | RDL via d / land | 8 / 11 | reported | 00049-a-L02, ectc51687.2025.00047-a-i3 | ok ("via CD 8, cap 11") |
| 25 | cowos_r | via on C4 | 45 | reported | 00049-a-i4 | ok |
| 26 | cowos_r | fine Cu h | 2.0 | template (analog) | 001c.129747-f-L03 | ok |
| 27 | cowos_r | substrate bu_n | 8 | template | in-family text cell 00049-a "8-2-8" | ok (text cell, conservative) |
| 28 | cowos_r | PTH wall | 14 | template (analog) | eptc62800 m20 | ok (S7) |
| 29 | cowos_l | LSI L/S, Cu h | 0.8/0.8, 2 | reported | ectc51909.2023.00174-d-L02 | ok |
| 30 | cowos_l | B/S RDL L/S | 11/11 | reported | ectc51909.2023.00091-a-L07 | ok |
| 31 | cowos_l | TIV d / pitch | 50 / 100 | reported | 00091-a-i2 | ok (tmv mapping inferred, row note) |
| 32 | cowos_l | LSI TSV pitch | 50 | template (analog) | eptc59621 -i1.pitch_min | ok; pitch_max used in cowos_s (S7) |
| 33 | cowos_l | RI Cu h | 2.3 | template | ectc51909.2023.00174-e-L02 | ok |
| 34 | info_os | RDL1-4 L/S | 2/2 | reported | ectc32696.2021.00033-a-L03 | ok |
| 35 | info_os | RDL5 L/S | 5/5 | reported | 00033-a-L07 | ok |
| 36 | info_os | core | 1400 | reported | 00033-a-L09 | ok |
| 37 | info_os | RDL via d | 8 | template (analog) | 00047-a-L02; "InFO process" text 00049 l.149/239 | ok |
| 38 | info_os | bu_n | 8 | template | fit to DB range | ok note; metric-driven (S4) |
| 39 | soic | bond pad | 1.5 | template (analog) | ectc51846.2026.00218-a-i2 (3 um pitch) | ok |
| 40 | soic | HBV d | 0.5 | template (analog) | 00218-a-i5 "0.5 um at all pitches" | ok |
| 41 | soic | bond pad h | 0.5 | template (analog) | tcpmt.2021.3104326-c-L05 (20 um pitch) | ok |
| 42 | soic | TSV d / pitch | 5 / 35 | template (analog) | ectc51906.2022.00031-b-i3 | ok |
| 43 | emib | bridge L/S, via | 2/2, 2 | reported | ectc.2016.201-a-L02 | ok |
| 44 | emib | fine pitch | 55 | reported | ectc.2016.201-a-i1 | ok (SEM inset label) |
| 45 | emib | fine via d / land | 16 / 30 | template | ectc51906.2022.00180-a-i1 (pads 10/20/30) | ok |
| 46 | emib | build-up Cu / film | 15 / 15 | template (analog) | 00148-a-L06, 00155-a-L16 | ok |
| 47 | emib | PTH land | 300 | template | 1.5x "4-2-4 schematic" | inconsistent with fcbga 1.6x (S7) |
| 48 | emib_t | bridge-via pitch | 25 | reported | ectc51846.2026.00051-b-i1 | ok |
| 49 | emib_t | bridge-via land | 22 | template | 16 + 2 x 3 (overlay < 3, -b-m1) | ok note; 3 um land spacing (S6) |
| 50 | emib_t | bridge metal levels | 10 | reported | 00051-d-L01 "at least 10" (text l.312) | ok, note honest |
| 51 | emib_t | cavity bump pitch | 175 | template (analog) | ectc51846.2026.00050-e-i2 | ok |
| 52 | emib_t | TSV d / pitch | 9 / 50 | template (analog) | vlsi...10631478-a-i3, eptc59621 -i1 | ok; xy mismatch (S3) |
| 53 | foveros | base Si | 75 | reported | iedm19573.2019.8993637-a-c2 (approx) | ok |
| 54 | foveros | TSV d | 9 | reported | iedm -a-i2 | ok |
| 55 | foveros | TSV grid pitch | 110 | template | = PSB pitch; clusters 15-16 um (iedm -a-i2/-i3) | ok, note honest |
| 56 | foveros | microvia land | 52 | template | tcpmt.2026.3736233-a-i1 136/124 | ok value; metric-driven (S4) |
| 57 | foveros_direct | HBV level h | 0.5 | template (analog) | ectc51909.2023.00023-a-L04 (7 um pitch DBI) | ok |
| 58 | foveros_direct | TSV d | 9 | template (analog) | iedm -a-i2 | ok |
| 59 | hbm_stack | ubump pitch | 36 | reported | vlsi...9830182-j-i1 | ok cell; simulation TV not stated (minor M3) |
| 60 | hbm_stack | core die h | 58 | template | ectc51909.2023.00179-b-c1 ("assumed in Fig. 1") | ok |
| 61 | hbm_stack | TSV d | 5 | template (analog) | ectc51906.2022.00179-b-i5 (5 x 50) | ok |
| 62 | samsung_mios | substrate core | 1200 | reported | ectc51906.2022.00108-b-L04 (FEM row) | ok, note says simulation |
| 63 | samsung_mios | BS RDL h | 3 | template (analog) | eptc59621 -L11 | ok |
| 64 | samsung_mios | BS via land | 16 | template | 8 + 2 x 4; fig 001c.129513-f04 VLO >= 4 (viewed) | ok |
| 65 | samsung_mios | BEOL via d | 0.3 | template (analog) | POPSTAR -L06 | chimera (S5) |
| 66 | samsung_x_cube | TSV d / pitch | 4 / 50 | reported | iwlpc52010.2020.9375855-b-i2 | ok |
| 67 | samsung_x_cube | thin-core TH d | 80 | template (analog) | eptc62800 -a-i1 (X-shape, Cu filled) | ok |
| 68 | samsung_x_cube | pillar d | 75 | template (analog) | 00155-a-i3 | ok ("closest pitch": X-Cube 125 vs 150) |
| 69 | samsung_x_cube | HCB pad | 2 | reported | ectc51909.2023.00178-a-i1 | ok |
| 70 | samsung_i_cube_e | RDL L/S | 7/7 | template (analog) | eptc67330.2025.11392593-a-L04 | ok (row: level not explicit) |
| 71 | samsung_i_cube_e | bridge stud h | 5 | template (analog) | ectc51909.2023.00175-a-i3 | ok |
| 72 | ase_focos_bridge | FO-RDL L/S | 10/10 | reported | ectc51529.2024.00151-a-L04 | ok |
| 73 | ase_focos_bridge | RDL via d | 10 | reported | ectc51687.2025.00095-a-i2 | ok for rv_f_2; rv_f_1 overreach (minor M1) |
| 74 | ase_focos_bridge | RDL via land | 22.2 | template | 10 / 0.45, fig 00095-f04 (viewed, stem ~0.4-0.45 pad) | ok |
| 75 | ase_focos_bridge | TIV d / pitch | 70 / 150 | template (analog) | eptc67330...93-a-i3 | ok |
| 76 | ase_focos_bridge | bridge h | 95 | template | fill of bottom mold, fig 00095-f01 | ok note |
| 77 | amkor_s_connect | stud h | 5 | reported | 00175-a-i3 (approx) | ok |
| 78 | amkor_s_connect | TIV pitch | 260 | reported | 00175-a-i4 (cu_pillar through_via) | ok |
| 79 | amkor_s_connect | TIV d | 70 | template (analog) | ectc51529.2024.00013-a-i4 (120 um tall) | ok |
| 80 | ibm_dbhi | build-up L/S | 9/12 | reported | ectc51909.2023.00180-a-L09 | ok cell; applied to 16 levels (minor M2) |
| 81 | ibm_dbhi | bu_n | 8 | template | fit to DB range | ok note; metric-driven (S4) |
| 82 | ibm_dbhi | fine joint d | 13 | template (analog) | ectc51906.2022.00179-b-i1 (20 um pitch) | ok |
| 83 | glass_core_substrate | ABF / Cu h | 15 / 5 | reported | ectc51846.2026.00199-a-L04 / -L01 | ok |
| 84 | glass_core_substrate | L2 L/S | 5/5 | reported | 00199-a-L05 (comb test) | ok cell; note says finest; (minor M2) |
| 85 | glass_core_substrate | signal L/S | 10/15 | reported | 00199-a-L09 | ok |
| 86 | glass_core_substrate | microvia d | 20 | reported | 00199-a-i1; text l.431 "20, 30, 40, and 50" | ok |
| 87 | glass_core_substrate | TGV d / pitch / AR | 90 / 175 / 11 | reported | ectc51687.2025.00178-i-i1 | ok |
| 88 | glass_core_substrate | TGV land | 126 | template | 1.4x by eye, fig 00178-f04 (viewed) | ok |
| 89 | glass_core_substrate | TGV bottom | 45 | template | 60/30 row notes, fig 00178-f01 (viewed; alternating taper true) | ok |
| 90 | glass_core_substrate | microvia land | 32 | template | 20 + 12 (tcpmt.2026.3736233-a-i1) | ok |
| 91 | fan_out_panel | ML1/2/3 L/S | 2/2, 5/5, 10/10 | reported | 2380-4505-2020.1.000042-a-L04/-L06/-L08 | ok |
| 92 | fan_out_panel | ML / DL thickness | 2.5 / 2.5 / 8; 5 / 6.5 / 6.5 / 5 | reported | same TV -L02..-L09 | ok |
| 93 | fan_out_panel | V01 / V12 / V23 d | 22 / 30 / 30 | reported | -i3/-i4/-i5 ("22-17", larger entered) | ok; no lands (S8) |
| 94 | cpo_module | BGA d / h | 200 / 200 | template (analog) | ectc32862.2020.00185-a-i2, ectc51909.2023.00091-a-i3 | ok; pitch reported from IBM CPO module |
| 95 | hybrid_bond_d2w | DBI / RDL / thru Si | 2 / 1 / 50 | reported | ectc51906.2022.00031-c-L10/-L11/-L06 | ok |
| 96 | hybrid_bond_d2w | DBI pad as via d | 15 | reported | 00031-c-i2 (cu_cu_hybrid pad) | ok; pad modelled as rdl_via through the DBI layer |
| 97 | hybrid_bond_w2w | HBV d / TSV d / tier-2 Si | 0.6 / 1 / 9 | reported | ectc51529.2024.00057-a-L04/-i5/-L10 | ok |
| 98 | hybrid_bond_w2w | MZ line | 2 | template (analog) | ectc51687.2025.00060-a-L04 (pads 3 um at 6 um, -i1) | ok |
| 99 | ucla_si_if | metal h / pad | 3 / 7 | reported | ectc51906.2022.00303-a-L01 (simulation, stated), iedm45741.2023.10413759-a-i1 | ok |

No invented numbers found: every template number traces to a cell, a figure that shows it, or a stated rule; literal
constants (3.078 = tan 72 deg, 1.5x / 1.6x / 1.4x figure reads, +3 um Ni in fan_out_panel `bump_h_um`) are explained
in their notes.

## Privacy / hygiene

- Grep of `config/package3d/*`, `scripts/score_package3d.py`, `scripts/build_package3d.py`,
  `scripts/render_package3d.py`, DevLog-011, `app/static/data/package3d.json`, `outputs/package3d_scores/*` for
  `Downloads`, `/Users/`, `/private/tmp`, `/home/`, user name, e-mail: one hit, B1. DevLog-011 line 203
  mentions `~/Downloads` only as an instruction ("never open"); no file in it is named.
- Emoji scan (55 files, pictograph / dingbat ranges): none. Secret-like assignments (`api_key`, `token`, `password`,
  `secret`): none.
- Outside this audit's scope: `scripts/ieee_fetch.py` and `scripts/ingest_inbox.py` are modified in the working tree
  (not by DevLog-011 agents as far as the DevLog shows); their diffs contain no local path or secret.
