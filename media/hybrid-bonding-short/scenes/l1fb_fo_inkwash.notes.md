# l1fb_fo_inkwash - L1F fan-out package to board, 0.4 mm ball pitch, sumi-e ink wash (pass-A slot)

Role (owner decision 2026-10-22, styles follow eras by section): this file plays the pass-A shot (2 beats = 1.0 s, no
overlay text); the file name is kept, edit.json maps it. Speed in the slot: 1.

Same section and geometry as `l1fa_fo_artdeco` (see its notes for every dimension and source), framed on the fan-out
side: dark Si die block at the left (die edge x 420), pale mold wash running past the die edge to the package saw edge
(x 1620), balls under the mold, board below, bare paper to the right of the package with a vermilion seal. Scale
0.8 px/um (pitch 400 um = 320 px). Joint plane = top surface of the board Cu pads = y 600 (crisp, fully loaded pad
tops). Ball columns at x 20 (fan-in, partly cropped), 660, 980, 1300 (fan-out); the column at x 340 (100 um inside the
die edge) is depopulated as in l1fa. `meta.text = 'dark'` (unused in this slot; the band is still calm).

## Structure drawn (top to bottom)

| y (px) | Layer | Rendering |
|---|---|---|
| < 480 | Si die (x < 420), EMC (x 420-1620), die face and mold face coplanar at y 480 | die: broad dark strokes pulled from the die edge, drying to kasure (dry-brush) at the frame edge; mold: pale wash, filler as sparse ink dots (tenten) |
| 480 - 504 | PI1 7 um, Cu RDL 5 um (die-pad vias, in-plane traces, ball pads), PI2 9 um, UBM 9 um | fine grey brush line with dense-ink Cu and UBM steps |
| 504 - 600 | solder joints (120 um high, 216 um max diameter), air | pale ink washes with wet edges and a light contour on the shadow side; bare paper |
| 600 - 620 | board Cu pads 180 um NSMD (flat top on y 600), SR 20 um with 245 um openings | dense ink dabs; mid-grey stroke |
| > 620 | board laminate with Cu planes every 138 um (cropped) | dielectric as wide wash strokes thinning with depth (bokashi); each Cu plane one confident horizontal stroke |
| 128 - 214 (x 1716 - 1802) | seal | vermilion square, border and 3 x 3 ball-array dots cut in negative; no characters |

Dimensions: as `l1fa_fo_artdeco.notes.md` (pitch, ball, joint, RDL, UBM, board), scaled by 0.8 px/um.

## Motion (scene time, speed 1): strokes laid down by 0.80 s, then hold

The stroke plan below is in plan time; render runs it 1.9x slower (scene time = 1.9 x plan time), so the painting
completes at 0.80 s scene time.

Camera (pass-A group pan, owner request 2026-10-22): content moves left at 28 px per second of shot time (camera trucks right), horizontal only, constant (no ease), from t = 0; identical on screen across the pass-A group (l1a, l1fa, l2a, l3a, l4a, l5a, l6a, l7a slots). Scene-time rate = 28 / `speed`, read from the `speed` URL param (`APA.params.speed`), so the on-screen rate stays 28 px/s if the shot's speed is retimed. Measured on the rendered shot frames, f00 -> f24: 27.2 px leftward over the stroke-free board-pad rows (f21 -> f24 on the settled frame: 26.8 px per 24
frames; target 26.9). The earlier slow push-in (1 % at 1 s, 3 % at 3 s about (960, 600)) is removed: at the right edge
it moved content right by up to 9.6 px per second, against the pan. Layers, paper and the cached final frame are
painted 120 px wider than the frame (pan clamps at 110 px, t = 3.9 s; 84 px at 3 s). In-frame strokes are unchanged:
rightward brush chains simply run on into the margin, leftward chains keep their strokes and get a short rightward
chain of their own beyond x = 1950, margin fibres and blooms come from separate seeds; the left-to-right brush fronts
keep their sweep speed (end at x = 1930) and uncover the margin once complete. Frame 0 differs from before only in the
last ~30 px at the right edge.

| Stroke | Brush front | Plan time (s) | Scene time (s) |
|---|---|---|---|
| board pads + SR (the joint line) | left to right | complete at 0 | present in frame 0 |
| laminate washes | left to right | 0.00 - 0.15 | 0.00 - 0.29 |
| Cu planes | left to right | 0.03 - 0.17 | 0.06 - 0.32 |
| die | top to bottom | 0.08 - 0.19 | 0.15 - 0.36 |
| mold | die edge to saw edge | 0.12 - 0.27 | 0.23 - 0.51 |
| RDL line | spreads both ways from the die-pad cluster | 0.17 - 0.31 | 0.32 - 0.59 |
| balls | a brush circling each ball clockwise from the top, staggered by distance from the die pads | 0.19 - 0.37 | 0.36 - 0.71 |
| seal | pressed (scale 1.04 to 1, density rises) | 0.32 - 0.37 | 0.61 - 0.70 |

Ink bloom: each stroke's soft wet halo (blurred copy, 25-40 % ink) follows its brush front (0.035 s plan time =
0.067 s scene time), and the stroke darkens from 82 % to 100 % as it soaks in. Everything settles by 0.78 s; from
0.80 s render draws one cached final frame under the pan (hold to 3 s). (First version, for the pass-B slot,
completed at 0.42 s with no camera motion.)

## Figures looked at (visual reference only, nothing traced)

As l1fa: `ectc32862.2020.00185-f01`, `ectc32862.2020.00185-f02`, `ectc51906.2022.00136-f02`,
`ectc32696.2021.00174-f01`, `2380-4505-2020.1.000042-f17`.

## Deliberate deviations

- All of l1fa's geometric deviations apply (depopulated column under the die edge, illustrative in-plane routing,
  centered die, assumed UBM / pad / opening diameters, illustrative board stack).
- Ink tone is rendering, not material: the laminate lightens with depth (bokashi), brush texture and dry-brush gaps
  run through every material, and Cu planes show the joins between brush strokes (they are continuous planes).
- EMC filler shown as sparse ink dots; the real filler is dense (77 wt%).
- The seal is ornament (no characters); its 3 x 3 dot motif is decorative.
- The stroke order is a painting order, not a process order.

## Render

- In-page `APA.frame` time (headless Chromium, SwiftShader, forced raster): mean 48 ms, max 180 ms (during the
  stroke laying); ~25 ms in the hold. Sheet log incl. PNG screenshot: mean ~315 ms.
- Sheets (no text): `cache/video/sheets/l1fb_fo_inkwash.png` (0-3 s, 12 frames), full frame
  `cache/video/sheets/l1fb_fo_inkwash__full.png`, shot-length check `cache/video/sheets/l1fb_fo_inkwash__1s.png`
  (0-1.0 s, 12 frames).
