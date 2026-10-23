# c2_sem: pass C modality 2, plan-view SEM (secondary electrons) of a sub-micron HB pad lattice

Two views (URL param `v`), both greyscale SE images, top view, no text. Overlay tone `meta.text = 'light'` (both views).

| View | What it shows | Lattice | Screen scale |
|---|---|---|---|
| `v=1` | Post-CMP bond surface: Cu-filled square pads, brighter than the dielectric (material contrast), normal incidence | square, 0.64 um pitch | 375 px/um: pitch 240 px, pad 120 px |
| `v=2` | Pad openings after hard-mask deposition and etch, before Cu fill: dark holes, bright rims, far sidewall visible as a bright crescent, 20 deg tilt | rectangular 0.33 (x) x 0.4 (y) um ("0.36 um effective") | x 636.4 px/um (pitch 210 px); y foreshortened x cos 20 deg = 598.0 px/um (pitch 239.2 px) |

## Structure and composition

- Top surface of the bonding layer (dielectric field with pads), array above y = 600.
- **y = 600:** a cleaved sample edge running through the inter-row gap (my sample-preparation choice). The lowest pad
  row ends at y = 500; the next row would start at y = 620 (v1) or y = 619.6 (v2), so the cleave crosses plain
  dielectric only. The edge is drawn as the strongest SE edge in the frame (bright 3-5 px edge effect).
  - Below the edge, v1: nothing (no sample), near black with a short SE glow.
  - Below the edge, v2: the cleaved face seen at 20 deg tilt, facing away from the detector, dim with faint vertical
    hackle. The cleave lies in the inter-row gap, so the face carries no pad profiles (featureless by geometry).
- Text band x 560-1360, y 500-592: plain dielectric speckle, no pads, no scan-line rows.
- Columns: v1 centres 960 + k 240 px; v2 centres 1065 + k 210 px (half-pitch offset).

## Dimensions and sources

| Item | Value | Source / basis |
|---|---|---|
| Square lattice | 0.64 um pitch, square pads | `ectc51529.2024.00128-a-i1`; text p.3 Sec. III.A |
| Rectangular lattice | 0.33 x 0.4 um pitch, rectangular pads (same IO density as 0.36 um square) | `ectc51529.2024.00128-a-i3`; text p.3 |
| Cu density | 25 % at every pitch; upper and lower pads equal | `ectc51529.2024.00128` p.3 |
| Pad side, v1 | 0.32 um = sqrt(0.25) x 0.64 um | **(derived)** from the two rows above |
| Opening, v2 | 0.165 x 0.2 um | **(derived + assumption)**: 25 % density, pad aspect assumed equal to the lattice aspect (pad dimensions not stated) |
| Corner radius | v1 18 px = 0.048 um; v2 40 px (0.063 um), near-oval | estimate from the rounded openings in `ectc51529.2024.00128-f03` (crop) |
| Tilt, v2 | 20 deg | assumption; the tilt of the reference SEMs is not stated |
| Opening depth, v2 | 0.15 um, gives a visible far sidewall of 0.15 x sin 20 deg = 0.051 um = 32.6 px | assumption (pad etch depth not found) |
| Dielectric | hermetic metal-diffusion-barrier dielectric, not named | `ectc51529.2024.00128-a-i1`; rendered as a neutral grey field |
| Cu brighter than dielectric in post-CMP SE | material contrast as in the plan-view SEM of Cu DBI pads | `ectc51909.2023.00023-f06` (7 um pitch TV; look only) |

## SE vocabulary used

- Edge brightening, asymmetric: edges whose outward normal points toward the detector (upper left) are brighter
  (0.6 + 0.4 cos of the angle).
- v1: Cu pads bright with faint grain mottle and a bright rim; a soft glow just outside each pad, then a darker
  charging halo (~22 px) in the dielectric.
- v2: dark floor, shadowed near the lip; bright far sidewall crescent (floor outline = rim outline shifted down by
  the projected wall height); bright rim.
- Slow brightness drift across the field (charging), granular dielectric speckle, probe blur ~1 px.
- Screen-fixed static detector noise and 14 scan-line gain rows (kept out of y 492-600), plus 5 single rows with a
  1-2 px horizontal scan jitter (y 40-480).
- All noise seeded once in `init`; nothing random per frame.

## Motion

- Stage drift 24 px/s to the left (72 px at t = 3 s; contract limit 30 px/s).
- Clamped at t = 3.4 s. The line stays at y = 600; any t in [0, 3] is valid.
- The world image is 96 px wider than the frame.

## Figures looked at (visual reference only; nothing traced or embedded)

`ectc51529.2024.00128-f03`, `ectc51529.2024.00128-f04`, `ectc51909.2023.00023-f06`.

## Deliberate deviations

- v1 combines geometry from one test vehicle with contrast from another:
  - Geometry: the 0.64 um lattice of `ectc51529.2024.00128`.
  - Contrast: Cu-filled post-CMP surface, the look of `ectc51909.2023.00023-f06` (a different TV, 7 um pitch).
  - The 0.64 um reference image itself shows openings before Cu fill, which is what v2 shows.
- **Opening size in the crop:** by eye, the openings in `ectc51529.2024.00128-f03(a)` look larger than 0.32 um,
  about 0.35-0.4 um (crop estimate). I used the stated 25 % density.
  - Possible reason (speculation): the top CD of a tapered opening is larger than the pad CD; `-f04` shows sloped walls.
- **Composition:** the full-frame 8-column array and the cleaved edge are my own.
  - I avoided the tilted cleaved-face composition of `-f04`: the cleave crosses no openings, so the face shows no trench profiles.
- **Noise:** screen-fixed noise over a drifting sample is the physically right order (detector noise does not move
  with the stage). It is static rather than a fresh noise frame each frame, per STYLE.md.

## Render

- **In-page `APA.frame` + 1-pixel readback (flush):** mean 48 ms (v1, first frame 201 ms warm-up) and 26 ms (v2).
- **Init:** ~0.4-0.5 s.
- **render_video.py sheet:** 275-370 ms mean per frame, including the PNG screenshot.

## Overlay word: `text` hook (2026-10-23)

- Shots: c02 (`v=1`, "There’s", 64 px, flip=1, text_color light), m15 (`v=2`, "more to", text_size 106.94 +
  42.15 px/s, not flipped, light from `meta.text`).
- Treatment (both words, one hook): SEM data-bar label. An opaque full-width data-bar strip across the text band:
  #030303 for the light tone, #d6d6d6 for the dark tone. It has thin 70 % grey rules at the top and bottom, and
  two thin vertical dividers frame one cell around the word. The word is centred in APA Mono (IBM Plex Mono) in
  `info.color`.
  - Strip geometry: top = baseline - cap height (0.698 size) - 0.3 size; bottom = min(594, baseline + 0.3 size).
    At 64 px that is y 500-584, which fills the band. At m15 (107-110 px) it is about y 458-594, so the strip
    thickens cut to cut with the word.
  - The bottom stays at least 6 px above y = 600, so the cleave edge stays visible. The overlay is never flipped
    (display-fixed placement).
- Not text: the rules and dividers are bar graphics only. The bar carries no fields, numbers or scale bar.
- Deviation: at m15 the strip covers the lower ~40 px of the lowest opening row (rows end at y = 500). This is
  accepted as a data bar laid over the image.
- Contrast, measured: word L 0.881 on the bar L 0.001, 18.3:1 (all cases). Against the raw scene under the bar:
  6.7:1 (v=1), 17.6:1 (v=1 flipped, the band is the dark no-sample field), 4.0:1 (v=2). The bar is opaque, so the
  18.3:1 figure is the one that applies.
- Render: in-page `APA.frame` is 29-33 ms median with the word and 30-31 ms without. The sheet tool reports
  334-420 ms per frame, which includes the screenshot.
- Sheets: `cache/video/sheets/c2_sem__v-1__text-Theres.png`, `c2_sem__flip-1__text_color-light__v-1__text-Theres.png`,
  `c2_sem__v-2__text-moreto__text_size-80.png` (+ `__full.png`).
