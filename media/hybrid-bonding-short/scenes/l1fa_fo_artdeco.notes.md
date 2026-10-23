# l1fa_fo_artdeco - L1F fan-out package to board, 0.4 mm ball pitch, Art Deco (pass-B slot, overlay "0.4 mm")

Role (owner decision 2026-10-22, styles follow eras by section): this file plays the pass-B shot (1 beat = 0.5 s,
overlay "0.4 mm" rides the line); the file name is kept, edit.json maps it. `meta.text = 'light'`. Speed in the slot: 1.

Cross-section through one ball row at the die edge of a mold-first fan-out panel-level package (FO-PLP) with one RDL
(redistribution layer), mounted on a board. Die (left), mold compound continuing past the die edge with balls under it
(the fan-out), package saw edge at the right. Scale 0.75 px/um (pitch 400 um = 300 px). Joint plane = top surface of
the board Cu pads = y 600. Die edge at x 760 (t = 0). Ball columns at x 85, 385, 985, 1285, 1585; the column at
x 685 (100 um inside the die edge) is depopulated (see deviations).

Base test vehicle: `ectc32862.2020.00185-a` (mold-first FO-PLP on a 600 x 600 mm panel; 7 x 7 mm die, 10 x 10 mm
package, 1 Cu RDL, 392 I/O at 400 um, 200 um balls). Missing layers (PI2, UBM) from the 0.35 mm-pitch FOPLP rows
`ectc51906.2022.00136-a` / `ectc32696.2021.00174-a`; board-side pad and 0.2 mm ball mounting from
`2380-4505-2020.1.000042-a`.

## Structure drawn (top to bottom)

| z (um above board pad top) | y (px) | Layer | Rendering |
|---|---|---|---|
| > 850 | < -38 | die back side and mold over the die (cropped) | - |
| 150 - 850 | -38 - 488 | Si die (left of x 760), face down; EMC (epoxy mold compound) around it, die face and mold face coplanar | die: cream with fine vertical pinstripes; mold: black lacquer with gold filler flecks; die edge as a gold rule |
| 150 | 488 | Al die pads, 40 um, 4 peripheral rows at 60 um pitch (-50, -110, -170, -230 um from the die edge) | thin pale gold strips |
| 143 - 150 | 488 - 493 | PI1 (polyimide) 7 um, vias over the die pads (20 um at the pad, 28 um at the Cu) | bronze; Cu-filled vias gold |
| 138 - 143 | 493 - 497 | Cu RDL 5 um: 200 um ball pads, 30 um via lands, traces | gold with a light top highlight |
| 129/134 - 138/143 | 493 - 503 | PI2 9 um, conformal over the Cu (face at z 129 under the pads, z 134 elsewhere; 5 um steps) | bronze, black keyline |
| 120 - 138 | 497 - 510 | UBM (under-bump metallization) 9 um, 180 um flange on PI2, lining a 150 um PI2 opening onto the Cu pad | pale gold, stepped |
| 0 - 129 | 503 - 600 | SAC solder joint: truncated sphere between the 180 um UBM and the 180 um board pad, recess into the UBM dimple, NSMD fillet down the board pad sidewall | dark bronze sunburst from the joint-line point (cx, 600), gold contour |
| - | 503 - 604 | air gap (package to board) | dark teal with fine horizontal rules |
| -25 - 0 | 600 - 619 | board Cu pads 180 um, NSMD (non-solder-mask-defined), 25 um | gold |
| -25 - -5 | 604 - 619 | board solder resist 20 um, 245 um openings | jade |
| < -25 | > 619 | board laminate (FR-4), Cu planes every 138 um (cropped at ~640 um of 992 um) | deep teal; glass fill yarns as gold-outlined lenses with line shading, warp yarn as a wave; Cu planes as gold bands |

## Dimensions and sources

| Quantity | Value used | Source / basis |
|---|---|---|
| Ball pitch | 400 um | `ectc32862.2020.00185-a-i2` (p.2 Table 1); also `iwlpc52010.2020.9375855-a-i4`, `-b-i4` (0.4 mm BGA) |
| Ball size (as dropped) | 200 um | `ectc32862.2020.00185-a-i2` |
| Die | 7 x 7 mm, 700 um, face down, Al pads 40 um (opening 30 um), 1585 pads at 60 um | `ectc32862.2020.00185-a-L02`, `-a-i1`; fig `ectc32862.2020.00185-f14` (Table 1) |
| Package | 10 x 10 x 0.8 mm, die centered (assumed) -> die edge 1.5 mm from the package edge | test vehicle `ectc32862.2020.00185-a`; centering is an assumption |
| EMC | granular EMC G1, filler 77 wt%, cut point 20 um | `ectc32862.2020.00185-a-L01` |
| PI1 | 7 um (paper text says 10 um coated; table value used, conflict logged in the atlas) | `ectc32862.2020.00185-a-L03` |
| Cu RDL | 5 um, L/S 10/10 um | `ectc32862.2020.00185-a-L06` |
| PI2 | 9 um (not reported in 00185) | `ectc51906.2022.00136-a-L07`, `ectc32696.2021.00174-a-L07` (PM2 9 um target) |
| UBM | 9 um thick (not reported in 00185, which only says the 2nd dielectric opens the pads for bumping) | `ectc51906.2022.00136-a-L08`, `ectc32696.2021.00174-a-L08`; stepped UBM-over-PM2-opening topology as in fig `ectc32696.2021.00174-f01` |
| UBM diameter | 180 um | assumption; basis: 180 um ball pad for 0.2 mm balls in `2380-4505-2020.1.000042-a-L08` |
| PI2 opening, Cu ball pad | 150 um, 200 um | assumptions (UBM overlaps the opening by 15 um, pad encloses the opening by 25 um) |
| PI1 via, via land | 20 um at the pad, 30 um land | assumptions; atlas notes "dielectric via size not given" (`ectc32862.2020.00185-a-i1`) |
| Board pad / SR opening | 180 um NSMD / 245 um, OSP | `2380-4505-2020.1.000042` p.7 Sec. IV.A (0.35 mm-pitch board for 0.2 mm SAC305 balls; row `-a-i6` notes) |
| Board | FR-4, 0.992 mm, 8 layers | `2380-4505-2020.1.000042` p.7 Sec. IV.A. Layer stack not given: drawn as Cu 20 um / dielectric 118 um (even split), illustrative |
| Board pad Cu, board SR | 25 um, 20 um | assumptions (not reported) |
| Joint height (UBM face to board pad top) | 120 um | derived, see below |
| Joint maximum diameter | 216 um | derived |

Joint shape (derived, not measured): a truncated sphere through the two 180 um wetting circles (UBM, board pad),
volume = 200 um sphere (4.19e6 um^3). Zone volume pi h (3 a1^2 + 3 a2^2 + h^2) / 6 with a1 = a2 = 90 um gives
h = 120 um for 3.96e6 um^3; the UBM dimple fill (1.2e5) and the pad-sidewall fillet (~6e4) bring the total to
4.14e6 um^3 (-1 % vs the ball). Sphere radius 108.2 um, centre 60 um above the pad. Cross-check: atlas row
`eptc67330.2025.11392108-a-i3` (0.2 mm ball drawn, 350 um pitch) measures a 230 um wide, 120 um high joint.
Ball-grid registration (derived): a symmetric 24-column grid at 400 um on the 10 mm package puts ball centres at
-100, +300, +700, +1100 um from the die edge and the outer ball 400 um from the package edge.

## Motion (scene time, speed 1): settled by 0.39 s

- Pan: 20 px/s, plate moves left (10 px over a 0.5 s shot, 60 px at 3 s; capped at 80 px). No vertical motion.
- Signature: the in-plane RDL traces draw out from the die pads with a bright head and a gold glow (pad -50 um to the
  first fan-out ball pad, 0.02-0.18 s; pad -230 um to the first fan-in ball pad, 0.02-0.15 s). Stubs of traces
  arriving out of plane draw into the other ball pads (0.13-0.26 s). When a trace reaches its pad, an arrival flash
  (0.12 s) and the ball's sunburst opening from the joint-line point (0.13 s): last ball done at 0.39 s.
  A Deco sunburst (alternating tone wedges) spreads over the die and mold from the die-pad cluster, 0.02-0.36 s.
- After 0.39 s only the pan. Valid for any t in [0, 3] s. (First version, for the pass-A slot, ran the same sequence
  over 0.85 s; timing constants compressed by about 2.2x for this slot, geometry unchanged.)

Text band x 560-1360, y 500-592: dark teal air with very low-contrast horizontal rules, and the lower bodies of the
balls at x 985 and 1285 (t = 0). Lit balls use a dark bronze sunburst (wedges #765723 / #46331a, luminance about
0.03-0.10 vs 0.88 for the #f4f1ea overlay text) with a 3 px gold contour; the bright half-disc sun core sits at
y 586-600, at the band's lower edge. The RDL trace glow (y ~490-503) touches only the band's top edge.

Styled text (2026-10-23, `text` hook, lib/textfx.js): 'APA Deco' (Poiret One) at 1.12 x text_size, tracked
0.1 em, built up to a monoline gold body (hairline glyph dilated by 0.05 em) with metallic banding (#f3d88f ->
#d6a84c -> #c0913a -> #e2bb63), a fine dark inline (#4a3612, the glyph eroded 1 px), and a black keyline around the
body; behind it 15 fine gold rays on a flattened half-ellipse from just under the baseline centre (echo of the ball
sunbursts), kept inside the band (top y 500), opening over scene t 0-0.3 s. Word complete from frame 0. tone 'dark'
swaps to black body / gold keyline. Contrast (t = 0.3 s frame, measured): gold fill vs band mean 5.1:1, vs
worst-decile band pixel 3.2:1, per-pixel 10th percentile 3.0:1 (bronze lit ball); black keyline adds local edge.

## Figures looked at (visual reference only, nothing traced)

`ectc32862.2020.00185-f01`, `ectc32862.2020.00185-f02`, `ectc51906.2022.00136-f02`, `ectc32696.2021.00174-f01`,
`2380-4505-2020.1.000042-f17`.

## Deliberate deviations

- Depopulated column under the die edge: the ball site 100 um inside the die edge would sit under the die-pad ring
  and its RDL vias (a short in a 1-layer RDL), so it is drawn empty. 392 of 576 grid sites are populated in 00185;
  which sites are depopulated is not stated.
- RDL routing is illustrative: two traces lie in the section plane (die pad to the nearest fan-in and fan-out ball);
  the other balls show only the in-plane stub of a trace that leaves the section. Real fan-out traces mostly run out of
  any one section plane.
- The draw-out of the traces and the lighting of the balls are a stylized reveal of the routing, not a process step
  (the RDL is plated before ball drop and board reflow).
- Sunburst wedges in the die and mold, the ball sunbursts and rings, the trace glow and the unlit/lit ball colours
  are Deco ornament (tone only, no structure); the bronze ball tone is chosen for overlay legibility. Material colours are role colours: Si cream, EMC black, PI bronze,
  Cu and UBM gold, SR jade, laminate teal, air dark teal.
- EMC filler drawn as sparse flecks of 2-14 um; the real filler is far denser (77 wt%).
- Not drawn (under ~1 px or not in the sources): Ti/Cu seed (0.1 um each), die passivation, OSP, IMC
  (intermetallic) layers, board via-in-pad / microvias, the mold over the die back side (cropped).
- Glass cloth yarn size, spacing and phase are illustrative.

## Render

- In-page `APA.frame` time (headless Chromium, SwiftShader, forced raster, after the init warm-up of every layer):
  mean 75 ms, max 101 ms. Sheet log incl. PNG screenshot: mean 135 ms.
- Sheets (with `text="0.4 mm"`): `cache/video/sheets/l1fa_fo_artdeco__text-0.4mm.png` (0-3 s, 12 frames), full frame
  `cache/video/sheets/l1fa_fo_artdeco__text-0.4mm__full.png`, settle check
  `cache/video/sheets/l1fa_fo_artdeco__text-0.4mm__settle.png` (0-0.6 s, 8 frames).
