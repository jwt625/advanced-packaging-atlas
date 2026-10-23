# c1_optical: pass C modality 1, optical brightfield micrograph of a D2W hybrid-bond die after Cu CMP

Overlay tone: `meta.text = 'dark'` (olive-tan field; dark word checked with `text=Until` on both views).
Views (`v`): `1` = 2 px/um, `2` = 5 px/um. Same die, same region, two objective magnifications.

## What is drawn (top view, top to bottom)

| Region | v=1 (y px) | v=2 (y px) | Rendering |
|---|---|---|---|
| Dense daisy-chain array (bottom array) | rows centred 202.5 and up, every 14 px | off-frame | 3.5 um octagonal Cu pads, 7 um pitch, square grid |
| Gap to the edge chain | 21 um centre to centre (42 px) | off-frame | plain dielectric |
| Bottom-edge daisy chain, 7 rows | pad rows centred 244.5 ... 496.5, every 42 px | 4 visible rows centred 26.25 ... 341.25, every 105 px | one row of pads at 7 um pitch per chain row |
| Keep-out to the die edge | 500-600 (50 um) | 350-600 (50 um) | plain SiO2 field, the calm text band |
| **Die edge (saw cut) on y = 600** | 600 | 600 | sharp edge, small chips (0.4-1.6 um) kept outside x 560-1360 |
| Kerf over dicing tape | 600-680 | 600-800 | near black, out of focus (tape ~200 um below the die surface) |
| Neighbour die, plain field | 680-1080 | 800-1080 | same dielectric tint |

State shown: dies on tape after saw dicing, before bonding. The source TV was CMP'd as wafers, then thinned to 200 um,
saw-diced, and kept on tape frame for clean and activation before bonding (ectc51909.2023.00023 p.3 Sec. III).

Faint buried Cu straps join pad pairs (2k, 2k+1) under the bond-layer oxide. They show the daisy chain's RDL
(redistribution layer) seen through the transparent SiO2 (two-metal stack: 0.9 um RDL, 0.5 um via, bond pad;
ectc51909.2023.00023 p.2 Sec. II.D).

## Dimensions and sources

| Value | Used | Source |
|---|---|---|
| Pad diameter / pitch | 3.5 um / 7 um | ectc51909.2023.00023-a-i1; text p.2 Sec. II.A |
| Pad shape | octagon (flat-to-flat = 3.5 um) | ectc51909.2023.00023-f06 (plan-view SEM of the same TV's DBI pads), crop look |
| Edge chain | 7 rows; nearest row 50 um from the bottom die edge, then 21 um per row (50-176 um) | ectc51909.2023.00023 p.5 Sec. IV.G (also p.2 Sec. II.B) |
| Die size | 8 x 12 mm (frame shows 0.96 x 0.54 mm at v=1, 0.38 x 0.22 mm at v=2) | ectc51909.2023.00023 p.2 Sec. II.A |
| Dielectric | SiO2 | ectc51909.2023.00023 p.2 Sec. II.D |
| Discoloration from Cu oxidation | a few pads tinted orange-red, most slight | ectc51909.2023.00179 p.2 (oxidation causes discoloration, in a temporary-bond / debond context) and -f07 (crop look) |

## Choices (not found in the atlas; stated basis)

- "50 um from the die edge" is read as edge-to-pad-edge, so pad bottoms sit at y = 500 (v=1) / 350 (v=2). The paper
  does not say whether 50 um is measured to the pad edge or the pad centre (1.75 um difference).
- Link pitch along a chain row = array pitch (7 um). 426 links per row then span 2.98 mm, wider than either frame.
- Gap from chain row 7 to the dense array: 21 um, the same as the row spacing. Not found.
- Kerf width 40 um. Blade kerf width is not in the atlas; the neighbour die makes the edge read as a cut edge.
- RDL strap width 2 um, drawn at low contrast. Width and routing are not found.
- Field tint: olive-tan, one uniform tint plus ±1-2 % low-frequency drift. The oxide thickness that would set the
  interference color is not used; the tint follows the olive-tan field of ectc51909.2023.00179-f07 (crop look).
- Cu color: pale salmon (true Cu reflectance: higher in red than in blue). The edge rim is about 20 % lighter
  (edge scatter). The nm-scale recess is invisible in brightfield, so there is no relief shading. DIC was not used:
  the atlas has no DIC reference.
- Microscope artifacts: radial vignette (corners about 11 % darker) with a faint warm cast; field-curvature defocus
  toward the corners; 0.55 / 0.8 px in-focus softness. CMP micro-scratch arcs and speckle are static and seeded.
- Motion: focus snap (a defocused copy fades from 60 % with tau 50 ms), zoom settle 1.5 % about (960, 600) with
  tau 80 ms (y = 600 stays fixed), and a horizontal stage drift of 10 px/s (30 px at 3 s). The image reads from the
  first frame.

## Deviations

- The chain layout along the edge, the dense array's position, and the link routing are schematic. The paper gives
  the edge chain's row distances but not its x extent or routing.
- The oxidation tint reference (ectc51909.2023.00179) is an HBM temporary-bond / debond study, not the
  ectc51909.2023.00023 TV. It is used only for the look of discolored Cu.

## Figures looked at (visual reference only)

ectc51909.2023.00179-f07, 001c.129764-f05, ectc51529.2024.00106-f06, ectc51909.2023.00023-f06.

## Verify (2026-10-22)

`uv run python scripts/render_video.py sheet c1_optical.html --param v=1|2 [--param text=Until] --dur 0.3 --n 4`.
Draw time (APA.frame plus a forced canvas flush, no screenshot) is 52-69 ms per frame. The sheet's per-frame time,
which includes the 1920x1080 PNG screenshot, is about 410-470 ms.

## Overlay word: `text` hook (2026-10-23)

- Shots: c01 (`v=1`, "There’s", 64 px, not flipped), m11 (`v=2`, "more to", text_size 88.89 + 35.03 px/s, not
  flipped). Both resolve to the dark tone (`meta.text = 'dark'`).
- Treatment (both words, one hook): microscope-software text annotation. APA Grotesk (Inter) weight 500 in
  `info.color`, with the thin offset shadow of an image annotation (opposite tone: light shadow for dark text,
  60 % alpha, offset max(1, size / 40) px, blur size / 48). Size = `info.size`, so "more to" grows cut to cut.
  Centred on x = 960, baseline `info.baseline` (565). No other text or marks. The hook flips nothing: the overlay
  canvas is never flipped, and the placement is display-fixed.
- Contrast, measured on rendered frames: glyph fill L 0.007 against the scene in a 2-10 px ring around the ink,
  L 0.271-0.335 (p5-p95). Worst case 5.6:1 (v=1) and 5.7:1 (v=2, 80 px).
- Render: in-page `APA.frame` plus readback is 63-66 ms mean with or without the word, so the hook cost is below
  run-to-run noise. The sheet tool reports 423-494 ms per frame, which includes the PNG screenshot.
- Sheets: `cache/video/sheets/c1_optical__v-1__text-Theres.png`, `c1_optical__v-2__text-moreto__text_size-80.png`
  (+ `__full.png`).
