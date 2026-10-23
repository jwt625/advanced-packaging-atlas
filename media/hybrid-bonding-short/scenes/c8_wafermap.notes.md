# c8_wafermap - notes

Pass C, modality 8: wafer-level map of a 300 mm W2W (wafer-to-wafer) hybrid-bonded wafer, top view, flat
metrology-UI rendering on a dark background. Two views by URL param `v`. No text, legend, colorbar, axes or numbers.
`meta.text = 'light'`.

## What is drawn

- Wafer outline (thin grey circle) with the notch at 6 o'clock, wafer disc slightly lighter than the background.
- Faint full-wafer field grid (partial fields included) clipped to the wafer, as the light grid in the reference map.
- The 138 full reticle fields as flat cells with 1 px gaps (staircase boundary; the ring between staircase and outline
  stays empty).
- v=1: pass / fail per reticle for the 660k-link via chain: 109 green (pass), 29 dark red (fail). A prober cursor
  (2 px light outline) steps one site per frame (25 sites/s) along a serpentine from the top row; it stays in the top
  rows for t <= 3 s (75 of 138 sites).
- v=2: bonding-overlay map, one site per reticle: cell fill = overlay magnitude on a jet LUT spanning 0-150 nm, a short
  dark vector from each site center (0.5 px per nm) and a 3 px site marker.
- Motif: the lowest staircase row's bottom edge is y = 600 (6 cells, x about 834-1086 before drift); the wafer rim dips
  to y = 642 below it, notch at the lowest point. Wafer center (960, 327), top of the wafer at y = 12.
- Motion: horizontal drift of the whole map, 10 px/s (from -15 px at t = 0 to +15 px at t = 3 s); v=1 cursor.
- Text band x 560-1360, y 500-592: covered by the three lowest staircase rows (24 cells); all are pass (v=1) or low
  overlay, dark navy with short low-contrast vectors (v=2).

## Grid generation (data-driven, in the scene)

`buildCells()`: 300 mm wafer, edge exclusion 3 mm (usable radius 147 mm), 20 x 20 mm fields, a vertical street on the
wafer axis and a field row centered on the horizontal axis; a field counts if all four corners lie inside the usable
radius. Result: 138 full fields, rows top to bottom 6, 8, 10, 12, 12, 14, 14, 14, 12, 12, 10, 8, 6 (13 rows, 14 columns
max). The scene logs a console error if the count is not 138.

## Facts and sources

| Item | Value | Source |
|---|---|---|
| Wafer | 300 mm W2W, Cu/SiCN, 300 nm pitch via chains | ectc51529.2024.00334-a-i1, -a-i2; tv ectc51529.2024.00334-a |
| Reticles tested | all 138 reticles across the wafer | ectc51529.2024.00334 p.2 Sec. II.C |
| Chain yields at 300 nm pitch | 3k links 100 %, 660k 79 %, 5.5M 49 % | ectc51529.2024.00334-f05 (table in the figure; the caption says "5k chains" for (a), the table 3k) |
| v=1 drawn yield | 109 / 138 = 78.99 % (29 fails = round(138 x 0.21)) | (derived) |
| Pass criterion | Rs/link <= 15 ohm | ectc51529.2024.00334 p.2 |
| Overlay | 95 % of sites < 50 nm, max 62 nm | ectc51846.2026.00187-f08 (Fig. 5), p.1, p.4; tv ectc51846.2026.00187-a (300 mm W2W) |
| Overlay color scale | 0-0.150 um jet LUT | ectc51846.2026.00187-f08 (crop, colorbar) |
| v=2 drawn overlay | max 62.00 nm; 131 / 138 = 94.9 % of sites < 50 nm; median 25.6 nm | (derived) checked by running the scene's data block in node, 2026-10-22; reference CDF median about 25 nm (crop, f08(b)) |
| SEMI notch | depth 1.0 mm (+0.25 / -0), angle 90 deg (+5 / -1) | vendor 300 mm wafer spec sheet citing the SEMI standard: https://svmi.com/wp-content/uploads/2020/09/SV031.pdf (SEMI M1 text itself not read) |

## Chosen values (not found in the sources)

| Item | Value | Basis |
|---|---|---|
| Reticle field | 20 x 20 mm | Not stated in ectc51529.2024.00334. The 26 x 33 mm full field (ectc51909.2023.00008-f05, another paper) cannot give 138 full fields on 300 mm (at most about 82 by area). 20 x 20 mm with this grid placement gives exactly 138 full fields and a 13-row staircase with 6-cell end rows, close to the reference map's look (about 13 columns, ectc51529.2024.00334-f05 crop). |
| Edge exclusion | 3 mm | Not found. 2 mm and 3 mm both give 138 full 20 mm fields; 3 mm chosen. |
| Fail pattern | seeded (rng 660) weighted draw without replacement: weight (0.12 + 2.4 (r / 147 mm)^4) x (1 + 0.8 cos(angle - upper right)) x (1 + 2.2 x failed neighbours) | Only the count is sourced. The shape imitates the reference look (fails toward the rim, clustered, one side heavier; ectc51529.2024.00334-f05 (b) crop). |
| Overlay field | translation + rotation + magnification with its null point at the bottom-center field (x 0, y -118 mm), rotation / magnification ratio 0.55, plus a seeded Gaussian part (rng 187); magnitudes then remapped monotonically, directions kept: nm = 62 (m / m_max)^gamma, gamma set so the 133rd of 138 sorted sites is 50.5 nm | Only max and the 95 % value are sourced. The vector pattern is synthetic. |
| Overlay sites | one per reticle (138) | The reference map has its own site grid (about 120 sites, crop estimate); one site per field keeps v=1 and v=2 on the same grid. |
| Scale | 2.1 px/mm | Largest scale at which the whole wafer fits above the line with the lowest row on y = 600. |

## Deviations from reality

- Notch drawn 3 mm deep (3x the SEMI 1.0 mm), 90 deg, so it reads at 2.1 px/mm (true size would be 2 px).
- The 24 cells under the text band are locked to pass in v=1 (calm band); the 29 fails are drawn among the other 114.
  The yield statistic is exact; the spatial pattern is not data.
- v=2 places the null point of the overlay field at the bottom of the wafer so the band cells are low-overlay (dark,
  calm); real W2W overlay maps usually have their minimum nearer the center.
- The overlay map (ectc51846.2026.00187) and the pass / fail map (ectc51529.2024.00334) are different test vehicles;
  the shot draws both on one reticle grid.
- Dark UI background instead of the white plot background of the references; no axes, center cross, colorbar or
  site labels (text-like).
- The prober cursor is an illustrative instrument cue; the reference maps are final results.

## Figures looked at (visual reference only)

ectc51529.2024.00334-f05, ectc51846.2026.00187-f08, ectc51909.2023.00023-f08.

## Render

Steady-state draw 4-6 ms/frame (headless Chromium, SwiftShader, forced flush); the first frame after load about
120-440 ms (one-off canvas warm-up). Sheet harness (draw + screenshot) mean 183-240 ms/frame.

## Overlay word (text hook, 2026-10-23)

Shots: c08 (v=1, "There’s", 64 px, flip=1, text_color light) and m02 (v=2, "more to", text_size 58.65 + 23.11 px/s,
no flip).

- Look: wafer-map viewer UI badge: translucent panel in the UI background colour (rgba(12,14,16,0.84)), 1 px panel
  border, 4 px (min; 0.06 x size) accent stripe #4c9aff on the left, clean UI sans `APA.FONTS.grotesk` (Inter)
  weight 600 in info.color; sharp corners. A dark text_color flips the panel to light (rgba(236,238,240,0.88)).
- Same vocabulary for both words; font, padding (0.34 / 0.18 x size) and panel scale with info.size (v=2 grows cut
  to cut).
- Placement: centred on x = 960 (word offset by half the stripe), baseline on info.baseline; panel bottom
  565 + 0.18 x size, above the line. Display coordinates; on c08 the flip brings the dark background above the line.
- Only the word: no lot / wafer IDs, yield numbers, colour bar or axes.
- Contrast (measured): ink vs panel median 14.9:1 (v=1 over pass cells), 17.1:1 (v=1 flipped), 16.8:1 (v=2 over the
  jet cells, 80 px).
- Time (in-page APA.frame + readback): c08 7.6 ms/frame mean with the word, m02 10.5 ms (9.0 ms without); first
  frame after load 170-590 ms (canvas warm-up, as before).
- Sheets: `cache/video/sheets/c8_wafermap__v-1__text-Theres.png`,
  `c8_wafermap__v-1__text-Theres__flip-1__text_color-light.png`, `c8_wafermap__v-2__text-moreto__text_size-80.png`
  (+ `__full.png`); shots c08, m02 re-rendered.
