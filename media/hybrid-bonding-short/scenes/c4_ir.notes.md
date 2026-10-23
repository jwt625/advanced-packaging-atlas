# c4_ir: pass C modality 4, IR transmission image through a D2W hybrid-bonded pair, alignment marks

Overlay tone: `meta.text = 'dark'` (grey IR field, about 150-190 counts in the band; dark word checked with
`text=Until` on both views).
Views (`v`): `1` = 4 px/um, the bottom-left die corner with its mark set (frame 480 x 270 um). `2` = 16 px/um, one
0.1 um horizontal vernier (frame 120 x 68 um).

## What is drawn (top view through the stack)

The look is transmission-like and high-key. Metal marks are dark on a light grey field, as in
ectc51909.2023.00023-f07. Two mark sets are superimposed:
- substrate-site marks: transmission 0.60, mid-grey;
- top-die marks: transmission 0.25, near black;
- both are shifted by the die-to-substrate offset (dx, dy) = (+0.8, -0.5) um, true to scale (3.2 / 2.0 px at v=1,
  12.8 / 8 px at v=2).

| Element | v=1 (px, t = 0) | v=2 |
|---|---|---|
| Top-die footprint | x > 120, y < 600 (corner at 120, 600) | y < 600, full width |
| **Die bottom edge on y = 600** | edge-scatter line 1.5 um wide just outside the edge (T 0.55); substrate-only field below, T 0.86 | same |
| Concentric-annulus fiducial | centre (410, 320). Substrate ring OD 80 / ID 72 um plus a 12 um centre cross. Die ring OD 60 / ID 36 um with a 1 um crosshair across the bore | - |
| Corner verniers, 0.25 um resolution | x comb above the fiducial (baseline y 104), y comb left of it (baseline x 200) | - |
| H vernier, 0.1 um resolution | baseline y 230, centred x 1010 | baseline y 300, centred x 960 (ticks span x 320-1600) |
| V vernier, 0.1 um resolution | baseline x 1560, centred y 300 | - |
| Text band x 560-1360, y 500-592 | plain Si field | plain Si field |

Vernier reading (physics of the drawing): the substrate ticks are the main scale (pitch P) and the die ticks the
vernier (pitch P - resolution). The coincident pair sits k = offset / resolution ticks from the index: H 0.1 um at
k = +8, V 0.1 um at k = -5, corner x 0.25 um at k = 3.2 (between 3 and 4), corner y at k = -2. Index ticks are 3 um
longer.

## Facts and sources

| Fact | Value | Source |
|---|---|---|
| Fiducials | concentric annuli on all die corners of the component die and of the substrate bonding sites | ectc51909.2023.00023 p.2 Sec. II.C |
| Verniers | 0.25 um resolution (corner structure), 0.1 um (horizontal and vertical verniers) | ectc51909.2023.00023 p.2 Sec. II.C |
| Use | IR images of each bonded die; alignment offset (x, y, theta); distortion from vernier readings on all four corners | ectc51909.2023.00023 p.3 Sec. III |
| Offset scale | average radial die-centre offset 0.99 +/- 0.60 um, worst corner 1.25 +/- 0.6 um; chosen (0.8, -0.5) um = 0.94 um radial | ectc51909.2023.00023 p.3 Sec. IV.A |
| Stack | top die thinned to 200 um, on a 200 mm Si substrate wafer, SiO2 bond layer | ectc51909.2023.00023 p.2-3 |
| Si transparency | Si transmits beyond ~1.1 um wavelength (band gap 1.12 eV) | textbook |

## Choices (not found in the atlas; stated basis)

- Mark sizes: annulus diameters, ring widths, crosshair width, vernier tick pitch (main 4.0 um), tick width (2 um),
  tick length (8 um), index extension (3 um), +/-10 ticks. All not found. The tick pitch is set so that 2 um ticks
  are resolved by the IR optics below.
- Mark placement on the die (corner set, then separate H and V verniers) is a constructed layout. The paper states
  only that the marks exist.
- IR blur: Gaussian sigma 0.47 um = Airy FWHM 0.51 lambda / NA / 2.355 with lambda = 1.2 um and NA = 0.55 (assumed
  objective). Applied in world units, so v=2 is softer on screen.
- Grey levels: transmissions 1 / 0.60 / 0.25 (field / substrate mark / die mark), read by eye off
  ectc51909.2023.00023-f07 (two greys). Camera counts = 34 + 150 T: the haze offset gives the low-contrast IR look.
- Outside the top-die footprint the transmission is 14 % lower (about 11 % fewer counts), following the atlas IR crops
  (ectc51529.2024.00106-f05 / -f06), not a transmission calculation. The dark line at the edge is edge scatter from
  the die sidewall.
- Fringes: faint circular fringes, +/-3.5 % amplitude, 70 um spacing, from a far-off centre (wafer-pair thickness
  wedge / bow). The atlas crops show no fringes (refs_passC.md); they are added at low contrast because the brief
  asks for them. Plus a +/-1.2 % low-frequency illumination nonuniformity.
- Camera: a static seeded sensor-noise layer (sigma 4.5 grey levels, plus column fixed-pattern offsets of +/-1.5),
  blended as a 50 % overlay (about 1-2 counts in the image); off-centre vignette, corners about 28-30 % darker. Nothing changes from frame to frame (STYLE.md).
- Seal ring and 45 deg chamfer are left out: seal-ring width and position are not found, and a seal ring a few um
  inside the edge would cross the text band.
- Motion: autofocus snap (a defocused copy fades from 60 % with tau 50 ms) and a horizontal stage drift of 8 px/s
  (24 px at 3 s). The image reads from the first frame.

## Deviations

- The composition is constructed: die corner bottom-left, an L of corner verniers opening toward the die interior,
  separate 0.1 um verniers. It does not reproduce any figure's layout. The fiducial vocabulary (thin outer ring, thick
  dark inner ring, crosshair) follows the description in ectc51909.2023.00023 p.2 and the look of its Fig. 2.
- The H vernier in v=2 is placed about 8-11 um above the die edge to put y = 600 on the edge. Its real position is
  not stated.

## Figures looked at (visual reference only)

ectc51909.2023.00023-f07, ectc51529.2024.00106-f05, ectc51529.2024.00106-f06, ectc51906.2022.00176-f02.

## Verify (2026-10-22)

`uv run python scripts/render_video.py sheet c4_ir.html --param v=1|2 [--param text=Until] --dur 0.3 --n 4`.
Draw time (APA.frame plus a forced canvas flush, no screenshot) is 32-56 ms per frame. The first composite is warmed
up in `init`. The sheet's per-frame time, which includes the PNG screenshot, is about 340-430 ms.

## Overlay word: `text` hook (2026-10-23)

- Shots: c04 (`v=1`, "There’s", 64 px, flip=1, text_color dark), m10 (`v=2`, "more to", text_size 84.88 +
  33.45 px/s, flip=1, text_color dark). In both, the band shows the darker substrate-only field (L about 0.35-0.40).
- Treatment (both words, one hook): monochrome camera OSD (on-screen display) character string.
  - Font: APA Pixel 8 (Press Start 2P), an 8 x 8 dot bitmap face, drawn directly. Its outlines are square dots.
    An earlier TFX.pixelate rebuild showed seams at fractional cell sizes and was dropped.
  - Colour: glyphs in `info.color`, with a one-dot border in the opposite grey (#ececec for dark text, #0a0a0a for
    light). This is the OSD edge mode: the word is stamped at the 8 one-dot offsets first.
  - Size: set at 0.72 * `info.size`, because the face's cap height is 1 em. That matches the other words' cap height
    and still scales with `info.size`, so the word grows cut to cut.
  - Centred on x = 960, baseline 565. The overlay is display-fixed and never flipped. No other text or marks.
- Contrast, measured (dark fill L 0.007 against the scene in a 2-10 px ring): 7.2:1 (c04 config, flipped), 7.0:1
  (m10 config, flipped, 80 px), and 8.7-9.0:1 unflipped. The light border raises the local edge contrast further.
- Render: in-page `APA.frame` is 41-56 ms mean, within run-to-run noise of the no-word runs (39-55 ms). The sheet tool
  reports 383-424 ms per frame, which includes the screenshot.
- Sheets: `cache/video/sheets/c4_ir__v-1__text-Theres.png`, `c4_ir__v-2__text-moreto__text_size-80.png`,
  `c4_ir__flip-1__text_color-dark__v-1__text-Theres.png`, `c4_ir__flip-1__text_color-dark__v-2__text-moreto__text_size-80.png`
  (+ `__full.png`).
