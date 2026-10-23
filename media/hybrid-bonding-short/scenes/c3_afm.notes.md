# c3_afm: pass C modality 3, AFM height map of the hybrid-bond surface after Cu CMP

Shots: c03 (`v=1`) and c11 (`v=2`), 0.25 s each. `meta.text = 'dark'` (the dielectric band under the overlay is
mid gold). Top view. Built 2026-10-22.

## What each view shows

| View | Sample | Screen scale | Look |
|---|---|---|---|
| `v=1` | 0.45 um pitch W2W pads, Cu/SiCN (ectc51846.2026.00130-a) | 480 px/um: pitch 216 px, pad 108 px, frame 4.0 x 1.25 um of scan | flat Cu discs recessed 0.5-1.0 nm, mottled Cu, strong horizontal flattening bands, fine scan-line jitter, one tip-pickup streak, a few particles |
| `v=2` | 3 um pad / 6 um pitch (ectc51846.2026.00024-a/-b, the same pads as c6_ebsd) | 40 px/um: pitch 240 px, pad 120 px, frame 48 x 15 um of scan | pads with a darker edge-dishing ring and lighter centre, dielectric eroded next to the pads (lighter far from Cu), grain-like noise, weaker flattening bands |

The two views are two scan sizes of the same modality, both in 2D (no 3D render).

## Structure drawn (top view, top to bottom)

- y 0-600: the scanned field. Pad rows (array above the line). `v=1`: rows centred at y = 446, 230, 14; `v=2`: rows
  at y = 440, 200, -40. The last row ends at y = 500, so y 500-600 is plain dielectric (calm band for the overlay).
- y = 600: bottom edge of the scanned field. The next pad row would start at y = 608 (`v=1`) or 620 (`v=2`).
- y 600-1080: no data, flat near-black (#0c0b0a), as in an AFM viewer outside the scan.
- One column of pads sits on x = 960 (pads above the overlay word, none inside the band).

## Measurement chain (all built once in `init`, seeded)

1. Height model z(x, y) in nm. Dielectric at 0 nm plus roughness. Cu = per-pad recess + edge ring + grain relief.
   Cu/dielectric boundary softened over about 1 sample.
2. Particles: 5 Gaussian bumps of +1.2 to +2.4 nm, upper part of the field only.
3. Tip broadening: grey-scale dilation with a parabolic tip of radius 15 nm over 5 x 5 samples. At 4.17 nm/sample
   (`v=1`) this shrinks each recess by about 1 sample and rounds its edges; at 50 nm/sample (`v=2`) it has no
   visible effect, which is physically right.
4. Tip-pickup streak: one scan line (plus a weaker neighbour) stays high after leaving a pad. The excess is +0.55 nm,
   decaying along the fast axis.
5. Line levelling: 0th-order mean subtraction per scan line, with pads included. Lines that cross recessed pads are
   lifted, so the dielectric in the pad rows reads lighter than between rows. This is the flattening artifact.
   Residual per-line offsets are N(0, 0.045 nm), cut to 25 % inside the overlay band.
6. Colour: copper-gold LUT (dark brown -> copper -> gold -> cream, afmhot-like). The span is -1.25 to +0.75 nm
   (`v=1`) and -2.3 to +1.0 nm (`v=2`). No colourbar (it carries numbers).
7. One AFM sample = 2 screen px. The map is smoothly upsampled once in `init`.

`render(t)` only blits the precomputed map with a horizontal drift of 20 px/s (60 px at t = 3 s). It is a pure
function of t and valid for t in [0, 3].

## Dimensions and values with sources

| Value | Used | Source |
|---|---|---|
| Pitch (`v=1`) | 0.45 um | ectc51846.2026.00130-a-i1 (atlas `interconnects.csv`) |
| Cu recess (`v=1`) | per-pad N(-0.75, 0.09) nm, clipped to [-0.98, -0.3]: spans the per-die medians | ectc51846.2026.00130 p.2 ("<1nm Cu recess on average ... AFM"); f08 box plots, medians about -0.6 to -0.9 nm (crop / atlas `figures.csv` shows) |
| Scan size reference (`v=1`) | 2 x 2 um class; frame shows a 4.0 x 1.25 um crop | ectc51846.2026.00130-f08 (crop header) |
| Pad CD (`v=1`) | 0.225 um = pitch / 2 | **not found** for this TV. f08 reads about 0.55-0.65 x pitch by eye. Half pitch was chosen so the gap below the last row (108 px) holds the band y 500-600 (refs_passC.md composition rule). Declared deviation of up to about 0.1 x pitch. |
| Dielectric roughness (`v=1`) | about 0.07 nm amplitude | ectc51909.2023.00190 p.1-2: "< 2 Å RMS roughness" dielectric after CMP |
| Pad / pitch (`v=2`) | 3 um / 6 um | ectc51846.2026.00024-a-i1, -b-i1 |
| Cu recess (`v=2`) | centre about -0.6 nm, edge ring a further -1.0 nm (ring peak about -1.6 nm) | ectc51846.2026.00024 p.5: "Cu recess limited to approximately 1 nm". The ring/centre split is an estimate from the look of ectc51846.2026.00024-f10 (colourbar about +1.8 to -2.8 nm, crop) and ectc51687.2025.00060-f08 (3 um pad, dishing about 1.2 nm, Ra about 0.18 nm). |
| Cu roughness (`v=2`) | 0.2 nm amplitude | ectc51687.2025.00060-f08: Ra about 0.18 nm on 3 um pads; ectc51687.2025.00060 p.4: roughness < 0.3 nm (dielectric), < 0.4 nm (Cu) |
| Dielectric erosion near pads (`v=2`) | +/-0.18 nm over 1 um from the pad edge | estimate. Visual basis: lighter dielectric far from pads in ectc51846.2026.00024-f10. Not a sourced number. |
| Tip radius | 15 nm | estimate (textbook: sharp Si tips are about 2-10 nm new, larger when worn). Chosen so the broadening is just visible in `v=1`. |
| Row-offset and streak amplitudes | 0.045 nm, 0.55 nm | estimates, chosen to be visible but not dominant |

## Figures looked at (visual reference only; nothing traced, embedded or recomposed)

ectc51846.2026.00130-f08, ectc51846.2026.00024-f10, ectc51687.2025.00060-f08.

## Deviations from reality (deliberate)

- The frame is a wide crop (16:9) of a square scan. The scanned field is cut at y = 600 so its edge is the motif line.
- Pad CD in `v=1` is half the pitch (see table). The reference crop suggests slightly larger pads.
- The flattening bands follow the physically correct sign for mean levelling of recessed pads: the dielectric is
  lighter in the pad rows. f08 seems to show lighter bands between the rows, so its levelling or its topography may
  differ. Both read as the same artifact.
- No colourbar, scale header or line-scan markers (text-like). No 3D rendering.
- Drift is a display pan. A real AFM image does not move.

## Verification (2026-10-22)

- Sheets: `cache/video/sheets/c3_afm__v-1.png`, `c3_afm__v-2.png`, `c3_afm__v-1__text-Until.png`,
  `c3_afm__v-2__text-Until.png`, plus the `__full.png` mid-frame for each.
- Render time, measured in-page with a forced canvas readback and no screenshot: mean 37 ms/frame, first frame
  180-190 ms. The sheet tool reports about 290 ms/frame including the PNG screenshot.
- Overlay band x 560-1360, y 500-592, measured on the no-text full frames. Luminance p5 to p95 is 0.24-0.32 (`v=1`)
  and 0.30-0.42 (`v=2`). Worst-case contrast with the dark overlay #141414 is 5.1:1 (`v=1`) and 6.2:1 (`v=2`).
- The right edge stays filled at t = 3 s (60 px drift, 64 px margin).

## Overlay word: `text` hook (2026-10-23)

- Shots: c03 (`v=1`, "There’s", 64 px, not flipped, dark tone), m12 (`v=2`, "more to", text_size 93.10 +
  36.69 px/s, flip=1, text_color light; the band shows the no-data field there).
- Treatment (both words, one hook): AFM analysis-software label. A sharp label plate with a thin frame holds the
  word in APA Grotesk (Inter 500). Colours come from the scene's own copper-gold height LUT ends:
  - dark tone: LUT bottom (18, 7, 2) text and frame on a LUT-top cream plate (252, 241, 214, 86 % alpha);
  - light tone: cream text and frame on a dark-brown plate.
- Geometry: the plate is word width + 0.3 size on each side, and from cap top - 0.2 size to baseline + 0.2 size
  (bottom <= 596). Size = `info.size`, so "more to" grows cut to cut. Centred on x = 960, baseline 565. The overlay
  is display-fixed and never flipped. No other text, colourbar or marks.
- Contrast, measured (word fill against a 2-10 px ring around the ink): 5.8:1 (v=1), 7.0:1 (v=2 dark, 80 px),
  17.5:1 (v=2 flipped, light). The worst ring percentile includes the plate frame and the map outside it. Against
  the raw map under the word: 5.5:1 and 6.4:1.
- Render: in-page `APA.frame` is 22-28 ms mean, the same as without the word. The sheet tool reports 413-469 ms per
  frame, which includes the screenshot.
- Sheets: `cache/video/sheets/c3_afm__v-1__text-Theres.png`, `c3_afm__v-2__text-moreto__text_size-80.png`,
  `c3_afm__flip-1__text_color-light__v-2__text-moreto__text_size-80.png` (+ `__full.png`).
