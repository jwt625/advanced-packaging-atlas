# l1b_bga_pixel - L1 BGA, 1.0 mm pitch, 8-bit pixel art (pass B, overlay "1 mm")

Same cross-section as `l1a_bga_engraving` (test vehicle `ectc51909.2023.00155-a`), drawn on a 320x180 logical grid
scaled 6x with nearest neighbour, PICO-8 16-color palette, ordered (4x4 Bayer) dithering on the ball shading.
One logical pixel (lp) = 6 screen px = 21.28 um, so pitch = 47 lp = 282 px = 1000 um exactly. Row 100 starts at
y 600 = board pad top (joint plane). `meta.text = 'light'`.

Motion (all a function of t, whole logical-pixel steps):

1. Signature motion, board-level reflow, t 0-0.51 s. The balls are already on the package pads (ball attach is done).
   - t 0-0.16 s: the package with its balls drops the last 5 rows (106 um), accelerating, until the ball bottoms touch
     the board pads. Board pad top stays at y 600.
   - Before melting, each ball has its as-attached shape: a sphere hanging from the 500 um SR opening, 478 um tall.
   - t 0.18-0.36 s: the balls melt one after another, left to right, every 25 ms (about 0.6 frame at 25 fps). As each
     ball melts it wets its pad: the bottom row widens to the 400 um pad. It squashes for 2 frames (x 1.12 wider, white
     wetting glint at the pad edges, row 99), then takes the truncated-sphere shape.
   - Once the last ball has melted, the package collapses 2 rows (478 um to the 444 um standoff). It overshoots by one
     row for one frame (the whole row squashes) and settles at t 0.51 s.
2. Pan: tile-scroller pan, 4 lp/s in whole-pixel steps (24 px/s; 48 px at 2 s, 72 px at 3 s). It runs from t 0
   through t 3 s.

Overlay band (x 560-1360, y 500-592 = rows 84-98): flat navy cavity and the lower ball bodies, which are shaded
darker (the package shades them) with a narrower dither range; ball highlights sit in rows 80-83, above the band. At
t = 0 the text centre (x 960) sits in the gap between two balls.

Styled text (2026-10-23, `text` hook, lib/textfx.js): the word in Press Start 2P ('APA Pixel 8') sampled on the
scene's logical grid, one font pixel = one logical pixel (6 px) at text_size 64 (whole multiples above), pen and
baseline snapped to the grid (baseline y 564); PICO-8 colours only: fill K7 with the bottom two ink rows K15, K0
outline (8-neighbour) plus K0 drop shadow (+1, +1). One K10 glint steps diagonally across the letters at scene
t 0.06-0.34 s; the word is complete from frame 0. tone 'dark' swaps to K0 fill / K7 rim. Contrast (t = 0.3 s frame,
measured): fill vs band mean 7.5:1, vs worst-decile band pixel 6.4:1; K0 rim locally 19:1.

## Structure drawn (rows, top to bottom)

| Rows | Layer | Colors |
|---|---|---|
| 0-8 | top build-up (cropped): Cu levels on even rows, dielectric on odd rows | orange / plum |
| 9-69 | core 1300 um (61 lp), glass cloth as lens beads, PTHs 200 um (Cu wall 1 lp, resin plug) every second pitch | brown / plum / peach; orange walls, grey plug |
| 70-77 | bottom build-up: L6 core Cu with PTH lids, L7 and L8 signal traces, L9 plane, 4 dielectric rows; 2-lp via stack under each pad, L7 route to a PTH lid on every second ball | orange / plum |
| 78 | package BGA pads, 700 um (33 lp), SMD; SR between pads | orange / dark green |
| 79 | package SR, 500 um openings (ball neck inside) | dark green / light grey |
| 80-99 | SAC305 balls (truncated sphere) in air | greys, navy cavity |
| 100-101 | board pads 400 um NSMD (19 lp), Cu; SR row 101 with 500 um openings | peach top row + orange; dark green |
| 102-179 | board laminate with Cu planes every 395 um, one glass ply per dielectric | green / bright green / orange |

## Dimensions and sources

Same sources as `l1a_bga_engraving.notes.md`: pitch 1000 um and ball 600 um SAC305 (`ectc51909.2023.00155-a-i4`),
standoff 444 um (same row, measured), package SR opening 500 um (`-a-L19`), package pad 700 um SMD
(`ectc51529.2024.00265-a-L10`/`-L11`), board pad 400 um NSMD with 500 um opening (`-a-L20`), core 1300 um and through
hole 200 um (`-a-L17`, `-a-i5`), build-up 4 x 15 um per side with 40 um vias (`-a-L18`, `-a-i6`).

Ball: truncated sphere, radius 316.4 um = 14.87 lp, centre 245 um above the board pad top (derivation in the A notes),
rows 80-99, last row clipped to the 400 um pad. Drawn standoff (package SR bottom at y 480 to board SR top at y 606):
126 px = 447 um vs 444 um measured.

## Figures looked at (visual reference only, nothing traced)

`ectc51909.2023.00155-f02`, `ectc51909.2023.00155-f08`, `estc60143.2024.10712129-f03`, `ectc.2011.5898527-f01`.

## Reflow motion: basis

- Pre-reflow ball height 478 um: measured mean after ball attach, `ectc51909.2023.00155` p.7 Sec. III.G (the same
  sentence as the 444 um standoff in `-a-i4`). Derived as-attached shape: a sphere through the 500 um SR opening with a
  478 um drop, radius 304 um, center 174 um below the SR. Its volume is about 4 % under a 600 um ball, which is
  consistent.
- During the collapse the melted ball is a truncated sphere through the two wetting circles at the current gap. The
  shape is recomputed per frame, so its volume is not exactly conserved (within the pixel quantization).

## Deliberate deviations (pixel quantization, 21.28 um per lp)

- Each thin layer gets at least one row: package SR 1 row (21 um vs 18 um), board SR 1 row (21 um vs 30 um), board
  pad 2 rows (43 um vs 35 um assumed), package pad 1 row (21 um vs 15 um).
- Bottom build-up is 8 rows (170 um) for 4 Cu levels + 4 films (actual 120 um). Topology kept, thickness exaggerated
  by 50 um; the core is shifted up by about 2 rows. Top build-up is cropped by the frame.
- The package pad surface sits at 447 um above the board pad (actual 457 um); the SR-opening neck is one row.
- Colors are stylized (green board, brown core, plum build-up); they encode material classes, not real colors.
- Glass cloth, PTH positions, via stacks and routing are illustrative (as in the A scene). No surface finish or IMC.
- Ball lower bodies are darkened for overlay legibility (lighting choice, geometry unchanged).
- Reflow motion is game-timed, not process-timed. Real reflow takes minutes, and the 5-row drop stands in for
  placement.
- The left-to-right melt stagger stands for a temperature gradient across the package. Here the rigid package collapses
  only after the last ball has melted.
- The 1.12 squash and the one-row overshoot are stylized. Solder paste on the board pads is not drawn: 00155 does not
  report it.
