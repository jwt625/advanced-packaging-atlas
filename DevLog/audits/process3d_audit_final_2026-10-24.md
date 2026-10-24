---
title: Audit final (V3 + A3) - process-flow animation (DevLog-016), combined visual / data / physics re-check
date: 2026-10-24
auditor: fresh-context combined audit (built none of it; read-only on source)
scope: 3D tab Process mode (app/src/lib/process/, app/src/routes/3d/+page.svelte), app/static/data/process3d.json, config/process3d/
---

# Audit final (V3 + A3): process-flow animation

## Verdict

**Not ready to show (close).** No critical left. Every A2 item is fixed, and the user directives hold:

- the camera keeps its angles exactly, never moves inside a step and follows the workpiece on flip / join / dice;
- one z map per step: untouched bodies keep their on-screen height to 0.01 px while ground / polished / plated bodies
  shrink or grow monotonically;
- the layout group, the secondary-view controls and the hash round-trip all work, and the old PiP button is gone.

The physics recomputes: melt / remelt per route, the IMC gate, the TSV reveal chain, the EMIB common standoff, the
00027 hybrid joints and contact at every mount.

Four majors remain. All are in the engine and all are visible in an ordinary play-through:

1. **F1.** At the Block scale, BGA lands are drawn about 2x too wide and are not clipped. They show as a pink slab
   sticking out of the section on every package step of all 6 routes (V2 N2 was fixed only at the Cell scale).
2. **F2.** The 00027 board joint, the paper's subject, is unreadable at s24-s27: the 28-layer PCB takes most of the z
   map, and the joint is about 25-30 px at Block and Cell.
3. **F3.** At the Wafer scale in Actual mode, the wafer top z-fights into a pink / white starburst (ECP, CMP, PVD).
4. **F4.** In EMIB-T, the region under the bridge renders as dark triangular hatching (aliasing) at the Block scale.

Counts:

| | critical | major | minor |
|---|---|---|---|
| remaining | 0 | 4 | 9 |

| item list | fixed | partly | not fixed |
|---|---|---|---|
| V2 + open V1 (28) | 20 | 6 | 2 |
| A2 (17) | 17 | 0 | 0 |

## Method (what ran)

- Own dev server: tmux `apa-v3`, http://127.0.0.1:47381, stopped at the end. The user's `apa-app` :47331 was not
  touched.
- Headless Chromium (SwiftShader), 1600x950 and 390x844. Everything is driven through `window.__apaProc` plus real
  mouse, wheel and keyboard. All scripts and cited shots are in
  `cache/process3d_renders/audit_final/20261024_001801/`; paths below are relative to that folder.
- Full render run: `scripts/render_process3d.py` copied as `render_copy.py`, with only the output and log paths
  redirected into this folder.
  - Command: `--all-routes --scales`, over 6 routes x every step x t 0 / 0.5 / 1 x Illustrative and Actual, plus
    Wafer / Block / Cell overrides.
  - Output: `full/20261024_001830/report.json` (render checks below).
- Directive scripts:
  - `directives.py a|b|c` (camera, aspect, layouts) -> `dir/directives_*.json`;
  - `flipcheck.py` (fine t at flip steps);
  - `cam2.py` and `cam3.py` (orbit-only and orbit + zoom camera sequences);
  - `zf.py` (Wafer scale, Actual vs Illustrative, tool hidden).
- Physics probes in the page:
  - `probe.py` -> `probe_melt.json`: max melt per solder body per step, 21 t points, all 6 routes;
  - `probe2.py` -> `probe_z.json`: body z (piece frame) at step ends;
  - `probe3.py` -> `probe_pieces.json`: joins, contact planes and collapses at the last step.
- Data checks:
  - `build_process3d.py --check`: 0 errors;
  - `check_process_flows.py`: 0 errors;
  - strict builds with PYTHONHASHSEED 1 and 2 (to the session scratchpad) are identical to each other and to the
    committed JSON.
- Mid-audit hygiene: one probe wrote 3 PNGs to `<repo>/dir/` (cwd mistake). They were moved into this folder at once,
  and the empty folder removed.
- Not tested:
  - GPU frame time;
  - touch;
  - light theme (V2 passed it, not re-checked);
  - playback rate on a real GPU (see m8).

## Directives

| directive | status | evidence |
|---|---|---|
| a. Camera: no reset between steps; follows only on flip / join / dice, keeping angles and relative zoom; orbit, then step, scrub, play | **Pass** (minor F9) | `dir/directives_a.json`, `cam3.py` output; see below |
| b. Constant aspect within a step | **Pass** | `dir/directives_b.json`, `flipcheck.py` output; see below |
| c. Secondary-view controls, layouts Main only / Inset / Side by side / Stacked / Swap, hash round-trip, no PiP button | **Pass** | `dir/directives_c.json`; `dir/C_side_secW_act.png`, `dir/C_side_swap.png`, `dir/C_roundtrip.png`, `dir/C_390_side.png` |

**a. Camera.** Three sequences, each starting with a real mouse orbit (140 x 50 px) plus a wheel zoom (1.13x). The
runs were CoWoS Block override, CoWoS Auto, and 00027 lts_lts Auto. Each was then stepped with the Right key through
the rest of the flow, scrub-dragged, and played for 3 s.

- View direction against the orbited direction: 0.000 deg at every step, scrub and play (65 samples).
- Inside an unchanged workpiece the camera never moved (0.0).
  - CoWoS Block: cow_bond -> singulate, 10 steps.
  - It moved only at on_substrate (join onto the substrate; distance 1921 -> 3413, i.e. scaled with the box).
- In Auto it moves only when the scale changes (one pose per scale) or the piece changes:
  - 00027 s04 Wafer, s08 / s09 flip, s13 new PCB piece, s23 / s24.
- Scrub and play: direction 0.000 deg.
- Orbit + zoom, then seek mid-step (`cam3.py`, `sh_H.png`): the package stays in frame through s13-s25 (one pose
  kept from s13 on).
- The empty frame at 00027 s13 t = 0 (`dir/A_ectc5_auto_10.png`) is not a camera fault: build_stack starts with no
  layers, and the PCB is in frame at t = 0.5 (`dir/H_s13.png`).
- Residual: F9.

**b. Constant aspect.** Illustrative mode; frame fitted once at t = 0, then seek only, with no re-fit. The camera
moved 0.0 in all 9 runs. On-screen heights (px) from `screenBox`:

| step (scale) | untouched body: t 0 / .5 / 1 | processed body: t 0 / .25 / .5 / .75 / 1 |
|---|---|---|
| CoWoS mold_grind (Block) | ip_si 352.55 / 352.55 / 352.55; die_c_si 240.92 (all t) | emc 339.6 / 332.7 / 319.4 / 306.1 / 298.2 |
| CoWoS tsv_cmp (Cell) | ip_si 571.81; liner 207.75 (all t) | tsv_cu 244.4 / 239.0 / 228.8 / 218.6 / 183.2 |
| CoWoS tsv_ecp (Cell) | ip_si 571.81; liner 207.75 | tsv_cu - / 34.5 / 97.2 / 161.0 / 244.4 |
| CoWoS c4_bumping (Cell) | imd_1 55.87; ip_si 86.59 | c4_sol - / - / 39.9 / 69.9 / 73.9 |
| 00027 s09 (Cell) | bs_diel 44.41; ip_si 97.87 | bbump_cu 30.2 -> 55.9; bbump_snag 10.9 / 31.5 / 43.6 |
| CoWoS mold_grind etc. on flip steps: logic_thin, tsv_reveal, 00027 s07 (Block) | constant after the flip: glass 301.55 (s07), pil_c 279.09 (logic_thin) | ip_si 231.1 / 185.8 / 179.4 / 178.1 (s07) |

- The flip steps (orient change) rotate the piece over t of about 0 to 0.15.
  - The map switches at the step boundary: a 2-5 % jump between t = 1 of the previous step and t = 0, as specified.
  - During the rotation the piece briefly overfills the frame (`dir/F_logic_thin_t0.06.png`; minor F10).
- From about t = 0.2 on, untouched heights are constant.

**c. Layouts and secondary view** (`dir/directives_c.json`).

- No button with the text "PiP".
- Layout group: Main only / Inset / Side by side / Stacked / Swap.
- Hash per layout:
  - Main only writes `layout=main`;
  - Inset is the default and writes nothing;
  - the others write `layout=side` / `layout=stack`.
- 2nd scale:
  - W / B write `s2=work` / `s2=block`, and the secondary scale follows;
  - C while the main shows Cell falls back to the complement (work), as the tooltip says;
  - A clears it.
- Act -> `m2=act`; Tool -> `t2=0`.
- Swap -> `swap=1`: the main becomes the Wafer view (actual, tool hidden), the secondary the Cell view.
- A fresh page loaded with `...&layout=side&swap=1&s2=work&m2=act&t2=0` writes back the identical hash, with the same
  buttons on and the same primary / secondary.
- At 390 px, Side by side falls back to stacked, scrollWidth 390 (`dir/C_390_side.png`).
- 0 page errors.

## Physics spot-check (own arithmetic; values from the in-page probes)

| check | result | arithmetic / evidence |
|---|---|---|
| Melt per body, 00027 lts_lts | pass | s02 TCB joint max 241 C (data 250 C at 7 s): cap_a / cap_b (221) melt. s06 215 C: solid. s15 233 C peak: bbump_snag, cap_a, cap_b melt (remelt). s19 165 C: solid. s22 160 C: bga_lts (138) melts, SnAg (221) solid. s25 160 C: ball + paste_lts melt |
| lts_sac | pass | s25 160 C: bga_lts melts; paste_sac (220) and SnAg stay solid |
| sac_lts | pass | s22 255 C: bga_sac (220) and every SnAg (221) remelt. s25 about 210 C: paste_lts (138) melts; bga_sac (220) stays solid |
| CoWoS, IMC gate 415 C | pass | cow_bond: cap_c / cap_d melt and convert. Later peaks: uf1 cure 165, pmc 175, carrier bond 215, C4 reflow, on_substrate, BGA 255 C. Every later peak is < 415 C, so cap_c / cap_d never remelt, though 255 C > 221 C. c4_sol (183) melts at c4_bumping, on_substrate and bga, and stays solid at uf2 cure 170 C |
| EMIB / EMIB-T | pass (known open) | tcb 250 C melts the listed caps; BGA 175 C melts bga_ball (138), SnAg solid. EMIB-T bridge_place_t 250 C melts bt_sol. bt_sol stays solid during the top-die TCB at 250 C: TCB heats listed solder only, the open note A2 m11 |
| TSV reveal chain | pass | piece z after tsv_reveal: ip_si 665-775 with si_recess 665-680, so Si = 95 um; tsv_cu 679-775.4 (the column reaches the M1 landing v1_cu 775.4); bs_pass 679-680, so the tip is flush at 679; front liner 775-775.4 kept. c4_seed 678.5-679 is kept under c4_sol 598.015-678.5: cap 80.485 = h from h^3 + 7500 h = 1.125e6 (80.49). Regression rule in render_copy.py: see the render checks |
| EMIB common standoff | pass | top_dies and die2 at 2296 (cap tip contact), collapse 0.941799 on every field. Die bottom 2296 - 0.9418 = 2295.058. Coarse H^3 + 7350 H = 147,000: H = 19.06 (19.06^3 + 7350 x 19.06 = 147,015). EMIB-T bridge_t at 2100.05 = cavity floor 2098 + ENi / Au 2.05 (cpfin 2098-2100.05), collapse 5.5585 |
| 00027 hybrid joints | pass | lts_lts collapse 152.91, computed below. lts_sac 52.50 (paste solid; unchanged from A2). sac_lts 100.00 (solid ball drops to the pad through the molten paste) |
| Mount contact (no float / no interpenetration) | pass | see the list below |
| Die B rotation (A2 N3) | pass | joins carry rot 90. Die B 10 x 8 mm turned 90 deg at x = 14,150: x 10,150-18,150, a 150 um gap to Die A (abs x <= 10,000). y centres 5,075 / 15,225 +- 5,000: a 150 um gap |
| Builder determinism | pass | seeds 1 and 2 identical; equal to the committed JSON |

lts_lts hybrid joint, step by step:

- ball (pi / 6) x 500^3 = 65.45e6 um3;
- paste pi x 200^2 x 100 x 0.4688 = 5.89e6 um3;
- V = 71.34e6 um3;
- (pi H / 6)(3 x 227.4^2 + 3 x 200^2 + H^2) = V, so H(275,132 + H^2) = 136.25e6, H = 345.4;
- collapse = 398.33 + 100 - 345.4 = 152.9.

Mount contact, piece by piece:

- CoWoS interposer at 2215 = substrate 2200 + 15 um pad, zmin 598.015 = C4 tip, collapse 20.137;
  uf2 2200-2275.348 = pad top + H 60.348.
- Dies at 787.17 = pad top, collapse 1.588.
- 00027 interposer at 2115 = 2100 + 15 um pad, collapse 1.532; cuf_bot top 2173.468 = 2115 + 58.468 = the bs_diel
  bottom (A2 n3 closed).
- Substrate on the PCB at 3300 = paste top, ball tip zmin 101.667 = 500 - 398.333.
- Stiffener at 2100 = sbt top; ring at 2200; EMIB lid at 2351 (seal top); bridge at 2143 (adhesive top).

## Render checks (report.json)

Source: `full/20261024_001830/report.json`; 1,224 shots over 6 routes.

- Budget OK: max 129 draw calls (limit 150); max 0.736 M triangles (limit 1 M); max 6,111 instances.
- Update: max 43.5 ms CPU in SwiftShader. Frame time 698 ms is software GL, not a laptop GPU number.
- Determinism, forward vs backward state sweep: 61 points per route, 0 mismatches on all 6 routes.
- Pixel arrival check: 3 per route, all identical. This includes EMIB k0 t 0.6, the old wet_bench case.
- Regression A2 N1 (tsv_reveal and c4_bumping end):
  - ok: tsv_cu [679, 775.4], bs_pass [679, 680], liner [775, 775.4].
- `cell_over`: 0. The check covers only the Cell scale, so F1 (Block scale) is outside it.
- `low_work_frac`: 5 Wafer-override shots below 0.15 (0.104-0.11): 00027 s20 x3, CoWoS on_substrate and ring_attach.
  A 50-160 mm part in a wafer-sized frame, by design of the forced Wafer scale.
- Page errors: 0. Console: only the SwiftShader "GPU stall due to ReadPixels" warnings.

## V2 items (and V1 items V2 marked partly / not fixed)

| item | status | evidence | note |
|---|---|---|---|
| N1 camera loses the workpiece | Fixed | `dir/directives_a.json`, `sh_H.png`, `dir/sheet_G27.png` | angles kept, follows on joins; residual F9 |
| N2 cell clip of big bodies | Partly | report `cell_over` (render checks); `full/.../emib_composite_emib_t/08_fli_t_0.50_ill.png` | Cell fixed. The Block scale is still unclipped and the lands are over-wide (F1). The EMIB-T fli_t cell foot land still protrudes in depth (crop `crop_emt.png`, right) |
| N3 dicing leaves one die | Fixed | `full/.../cowos_s_composite_main/13_logic_saw_d_1.00_ill.png`, `24_singulate_1.00_ill.png` | Diced wafer stays on the tape with kerfs; chip D has its own saw step. Edge partial units are dropped (minor, not flagged). Blade left on the wafer at t = 1 (F11) |
| N4 mold static | Fixed | `full/.../cowos_s_composite_main/17_mold_0.00_ill.png` vs `17_mold_1.00_ill.png` (`sh_v2a.png`) | Chase open then closed; wafer black at the end |
| N5 laser debond | Fixed | `sh_v2a.png` (23_debond, 11_s10 at t = 1) | Beam terminates at the release plane from a head above; no floating disc |
| n1 illustrative BGA pill | Partly | `crop_s25_ill.png`, `crop_s25_cells.png` | The shape now keeps its aspect (per-site scale), but the joint is about 25-30 px (F2) |
| n2 early necking | Fixed | `full/.../ectc51687.2025.00027-F1_lts_lts/22_s22_lts_0.50_ill.png` | Balls are spheres at placement |
| n3 cure-oven wall | Fixed | `sh_cwa.png` (16_uf1_cure) | |
| n4 s08 spray puddle | Partly | `crop_sing_s08.png` (right) | Bowl gone; a translucent brown film plane still extends outside the block at 00027 s08 (F12) |
| n5 diaphragm wash-out | Fixed | `full/.../emib_composite_emib/S_work_04_final_lam.png` | Faint |
| n6 removal-rate unit | Fixed | `crop_hud.png` | "removal rate 1027 nm/min"; pressure 0.021 MPa = 3.0 psi |
| n7 HUD text overflow | Fixed | `crop_hud.png` | "Cu uBump to Al pad; full IMC joint" fits |
| n8 390 px ruler labels | Partly | `dir/C_390_side.png` | Top label cut at the right edge; the bottom label is under the Frame button; the footer caption is truncated (F13) |
| n9 / V1 m14 Single framing after Process | Not fixed | (L35: pre-existing 3D-tab behaviour, out of scope) | Accepted as out of scope by the coordinator |
| V1 M3 real time N/A | Fixed | HUD at 00027 s15: "t 3 min 43 s / total 7 min 38 s (template)" | Steps without a stated duration (place, clean, inspect) still show "total N/A": correct per the provenance rules |
| V1 M5 tool backdrops | Partly | see n3 / n4 | Only the s08 film remains |
| V1 M8 grind sunburst per die | Fixed | `crop_sing_s08.png` (left), `dir/sheet_thin.png` | Marks centred on the wafer across diced units |
| V1 M11 TSV bottom plug | Fixed | `dir/sheet_ecp.png` | Floor film at true thickness |
| V1 M12 ball attach | Partly | `full/.../ectc51687.2025.00027-F1_lts_lts/22_s22_lts_0.50_ill.png` | Balls are grey spheres, but the silhouette is still visibly faceted at the 1600 px Block view (minor) |
| V1 m2 opaque glass carrier | Fixed | `sh_v2a.png` (debond) | Near-black, see-through |
| V1 m4 bump needles | Fixed | `sh_27a.png` (03_s02) | Per-site uniform scale; no needles |
| V1 m5 red CO2 cone | Fixed | `sh_emib.png` (02_cavity PiP) | Faint neutral beam |
| V1 m7 0 s during approach | Fixed (per L35, not re-measured) | engine round 4 (mold ctx: real time over the close) | |
| V1 m8 slow playback | Not fixed (low confidence) | `dir/directives_a.json` play rows | 3 s of play advanced 0.47-0.49 of a step in two runs (expected 0.5), but only 0.023 in the CoWoS Block / mold run, where SwiftShader frames exceed 0.5 s (dt = 0 by design). On a real GPU this probably does not occur; not judged |
| V1 m12 uniform PCB | Fixed | `sh_27b.png` | 28 Cu planes visible |
| V1 m13 lid | Fixed | `crop_lid_bga.png` (left) | Cu core cut face with grey Ni top / bottom bands |
| (V2 known) wet_bench determinism | Fixed | report pixel check (render checks) | |
| (V2 known) laminator diaphragm | Fixed | see n5 | |

V2 tally: 20 fixed, 6 partly, 2 not fixed. The 2 not fixed are m14, which is out of scope, and m8, which is low
confidence.

## A2 items

| item | status | evidence |
|---|---|---|
| N1 reveal CMP polishes the wrong side | Fixed | `probe_z.json`: tsv_cu 679-775.4, bs_pass 679-680, liner 775-775.4 after tsv_reveal and c4_bumping; render regression check |
| N2 chip D not thinned | Fixed | new step `logic_thin_d` (CoWoS-S now 30 steps); `sh_cwa.png` 11 |
| N3 Die B rotation ignored | Fixed | `probe_pieces.json` join rot 90; arithmetic above; `sh_27a.png` 03_s02 shows two separated dies |
| n1 C4 UBM stripped | Fixed | c4_seed 678.5-679 under c4_sol |
| n2 bumps in the D2D gap | Fixed (data) | fv / fvt sites split (fv_1a / fv_1b ...); not re-probed by core sample |
| n3 00027 CUF uses 60 um | Fixed | cuf_bot top 2173.468 = 2115 + 58.468 |
| n4 joints on bare slabs | Fixed | sbt_c4pad 2200-2215, sbt_pad 2100-2115, cpfin 2098-2100.05, bga_land present |
| n5 damascene times | Fixed | ECP (1 + 1) / (0.02205 x 20) x 60 = 272.1 s; etch labelled via + line, 181.2 s |
| n6 SnAg at the Cu current density | Fixed | per-body j [50, 50, 10] mA/cm2 |
| n7 OpCall.src not emitted | Fixed | 242 / 242 ops carry `src` |
| n8 stale text | Fixed | no "floats" / "14.652" in geometry; COMPOSITION family line names 00135 as MediaTek and 00055 as SoIC, both out |
| n9 builder non-deterministic | Fixed | seeds 1 / 2 identical |
| n10 paste 100 % metal | Fixed | metal_vol_frac SnBi 0.4688 / SAC 0.5108; lts_lts H 345.4 recomputed |
| n11 Washburn as upper bound | Fixed | viscosity note "Fill times from it are upper bounds" (37 "upper bound" mentions in the JSON) |
| n12 full-IMC joint | Fixed | cap_c / cap_d `to_imc`, `imc_melt_c` 415 C; HUD "IMC first liquid 415 C" (`crop_hud.png`) |
| n13 research-file leftovers | Fixed | P22 "Henkel TDS (2024-08)"; "thin end" gone |
| n14 citation choice | Fixed | pad_c pitch ref R134 = ectc.2013.6575597-a-i1.pitch_um |

A2 tally: 17 / 17 fixed.

## Remaining findings

Owner keys:

- engine = L35 (`app/src/lib/process/*.ts`, `*.svelte`);
- materials = L36;
- fab tools = L37;
- assembly tools = L38;
- data = L34.

### Major

**F1. Block scale: BGA lands (and the substrate C4 pads) are drawn about 2x their diameter and are not clipped to the
block window.**

- Shots:
  - `full/.../ectc51687.2025.00027-F1_lts_lts/15_s15_0.50_ill.png` (also s14-s21, `sh_27a.png` / `sh_27b.png`);
  - `22_s22_lts_0.50_ill.png`;
  - `full/.../cowos_s_composite_main/25_on_substrate_0.50_ill.png` (also uf2 ... bga, `sh_cwb.png`);
  - `full/.../emib_composite_emib/12_bga_1.00_ill.png` (`crop_lid_bga.png` right);
  - `full/.../emib_composite_emib_t/13_bga_0.50_ill.png`.
- What is wrong:
  - The lands under the substrate (`bga_land`, wetted diameter 454.8 um at 1000 um pitch) render as near-touching pink
    slabs about 0.9 of the pitch wide.
  - The land at the window edge is a rounded disc that sticks out of the section by a few hundred um (left in s15 /
    on_substrate, right in s22 / bga).
  - At s22 / bga the lands are wider than the 500 um balls sitting on them.
- Likely cause: the illustrative per-site lateral scale (contract 20.2, clamp 0.48 pitch) applied to pads. The round-4
  window clip exists only at the Cell scale (contract 20.5).
- Fix:
  - keep pads / lands at their true diameter (or the site's solder scale, never above the solder diameter);
  - apply the window clip at the Block scale too;
  - extend the `cellOver` check to the Block scale.
- Owner: engine.

**F2. 00027 s24-s27 (and the s25 Cell view): the board-level joint is unreadable.**

- Shots: `full/.../ectc51687.2025.00027-F1_lts_lts/25_s25_lts_lts_1.00_ill.png` (crop `crop_s25_ill.png`),
  `S_cell_25_s25_*` for all three routes (crop `crop_s25_cells.png`), `sh_27b.png`.
- What is wrong:
  - In the illustrative map the 28 Cu + 28 dielectric PCB layers each get their minimum band, so the PCB fills about
    2/3 of the frame height.
  - The package substrate is a thin sliver.
  - The hybrid ball + paste joint is a 25-30 px dark blob (Block) or sits inside a pink pad band (Cell). The three
    routes' different joints (the paper's comparison, collapses 152.9 / 52.5 / 100 um) cannot be told apart.
- Actual mode draws the joint correctly (`crop_s25_act.png`).
- Fix:
  - in the Cell and Block z maps, compress repeated PCB laminate bands below the top 2-3 layers into one band (or
    crop the board to its top layers);
  - give the joint gap a guaranteed share of the frame.
- Owner: engine (z map); data could mark the PCB inner layers as one view group.

**F3. Wafer scale, Actual mode: the wafer top z-fights.**

- Shots:
  - `dir/Z_tsv_ecp_act.png` vs `dir/Z_tsv_ecp_ill.png`;
  - `dir/Z_tsv_cmp_act.png` vs `dir/Z_tsv_cmp_ill.png` (`sh_zf.png`);
  - `dir/C_side_swap.png` (crop `crop_swap_wafer.png`);
  - the Actual PiP of fs_interconnect (`crop_pip_act.png`, third panel).
- What is wrong:
  - A 300 mm wafer with um films at true thickness shows a radial starburst of pink / white / grey blocks over the
    whole top: coplanar film faces fight for depth.
  - Illustrative is clean.
  - It appears whenever the main or the secondary view is the Wafer scale in Actual (the default secondary when the
    main is Actual).
- Fix:
  - `logarithmicDepthBuffer`, or a tighter near / far plane at the Wafer scale;
  - or draw films thinner than about 1e-4 of the view extent as one top surface with polygonOffset.
- Owner: engine.

**F4. EMIB-T Block scale: dark triangular hatching under the bridge.**

- Shots: `full/.../emib_composite_emib_t/09_tcb_0.50_ill.png` (crop `crop_emt.png` left); also 05_encap_t, 10_cuf,
  11_cuf_cure, 13_bga (`sh_emt.png`).
- What is wrong:
  - The band under the TSV bridge (the bridge joint / underfill / ABF band) is filled with dark triangular hatching:
    sub-pixel features at the Block scale aliasing into moire.
  - It reads as cracks or voids.
- Fix: LOD the bridge joint / via field at the Block scale (draw as a band with a few representative columns), as done
  for other dense sites.
- Owner: engine (assembly LOD); check with L38 if a tool overlay is involved.

### Minor

| id | evidence | what is wrong | fix | owner |
|---|---|---|---|---|
| F5 | `full/.../emib_composite_emib/02_cavity_*.png` (`sh_cav.png`) | EMIB cavity step, main = Cell at fv_1a: the cell lies wholly inside the cavity, so the step reads as "the block got shorter", with no cavity wall in view | Primary = Block for `cavity` (as for `cavity_t`), or a cell site straddling the cavity edge | data (view) |
| F6 | `crop_onsub.png` | CoWoS on_substrate .. bga Block: the C4 field (19.4 x 17.9 mm, derived from the 8,633 count) ends inside the block window. Joints in about 1/3 of the cut, bare gap / UF over the rest; a half-cut C4 pad hole at the field edge | Centre the block window inside the C4 field, or note the field edge | engine (window) / data |
| F7 | `probe_melt.json` (emib_t tcb) | bt_sol stays solid through the top-die TCB at 250 C (> 221 C), because TCB heats only listed solder (open A2 m11 note) | Leave as stated, or list bt_sol as heated with a note | data |
| F8 | `full/.../ectc51687.2025.00027-F1_lts_lts/22_s22_lts_0.50_ill.png` | 500 um balls are visibly faceted at the Block scale (V1 M12 residual) | Raise segments at that on-screen size | engine |
| F9 | `dir/A_cowos_block_11.png`, `dir/H_s15.png` | After a user zoom-in, the follow keeps the relative zoom, so at a join the new workpiece may sit on the frame edge: CoWoS on_substrate t = 0 has the lifted unit off the top; 00027 s15 is cut at the bottom. Frame fixes it | After a follow, if the box overflows the frustum by more than about 20 %, pull back only that much | engine |
| F10 | `dir/F_logic_thin_t0.06.png` | During a flip (t about 0-0.15) the rotating piece overfills the frame and the ruler shows a single 0 | Frame on the union of the start / end orientation boxes during the flip | engine |
| F11 | `crop_sing_s08.png` (left), `full/.../cowos_s_composite_main/13_logic_saw_d_1.00_ill.png` | At saw / singulate t = 1 (retract) the blade disc and spindle bars lie on the wafer; the housing is faded | Retract the blade with the housing, or fade it too | fab tools (dicing_blade) |
| F12 | `crop_sing_s08.png` (right) | 00027 s08 Block: a translucent brown coat film plane extends outside the block (V2 n4 residual) | Confine the film to the piece / window | fab tools (spin_coater) |
| F13 | `dir/C_390_side.png` | 390 px: ruler top label cut at the right edge, bottom label under the Frame button, scale caption truncated | Inset the ruler by its label width, and lift it above the Frame button under 480 px | engine |

Not flagged:

- uf2 top at 2275.348 vs the bs_pass bottom at 2275.848: a 0.5 um gap equal to the C4 UBM thickness, invisible.
- 1 N bond force on the CoWoS CoW TCB is the sourced analog (00155-F1-s08), not changed by this audit.
