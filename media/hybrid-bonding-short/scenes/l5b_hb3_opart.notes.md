# l5b_hb3_opart - notes

L5 pass B: Cu-Cu hybrid bond, die-to-wafer (D2W), 3 um pitch. Top view as Bridget Riley op-art (black / white, square
units, moire vibration, grey tonal progression). Overlay text "3 µm" rides the line; `meta.text = 'dark'`.

## What is drawn

- Top view of the bonding plane as seen through the die (as in an infrared overlay view: Cu opaque, Si and SiO2
  transparent). Both pad arrays are drawn; the image is their union.
- Top-die array: fixed to the frame, the die edge on y = 600, array above it (STYLE top-view rule).
- Bottom-wafer landing array: identical pads, rotated by theta(t) about (960, 600) and offset by a small residual shift,
  i.e. the die-to-wafer alignment step before contact.
- Where the two arrays coincide the field is 25 % Cu (single pads); half a pitch off in x or y the pads touch into
  stripes; half a pitch off diagonally they form a checkerboard. The slow sweep through these phases is the moire.
- Below y = 600: the bottom-wafer surface outside the die footprint, plain (no landing pads outside the die).

## Dimensions

| Item | Value | Source |
|---|---|---|
| pitch | 3 um, drawn 24 px (8 px/um) | `ic_id` ectc51846.2026.00218-a-i2 (pitch 3 um) |
| pad | 1.5 um square (pad = pitch / 2), drawn 12 px | -a-i2 pad_x / pad_y 1.5 um; square pad shape fig ectc51846.2026.00218-f12 (Fig. 7(c)); layer -a-L05 "pad = pitch/2" |
| top vs bottom pad | same size | -a-i2 (one pad CD per pitch, Table 1); ectc51529.2024.00017-a-i1 "symmetric pads" |
| first pad row | centre 1 pitch (3 um) inside the die edge | assumption: die-edge keep-out / seal ring width not stated in the source |
| rotation theta(t) | 5.2 deg at t = 0 easing to 3.0 deg at t = 3 s | deliberate exaggeration (below) |
| residual offset | (0.35, -0.2) pitch at t = 0, drifting 1.6 / 0.9 px/s (0.20 / 0.11 um/s) | illustrative |

On-screen pitch (24 px) is below the 220-320 px cross-section rule on purpose: that rule is for cross-sections; a
moire needs tens of periods in frame.

## Deviations from reality

- Rotation is exaggerated by orders of magnitude so the moire fits the frame: fringe period = pitch / theta
  (24 px / 0.09 rad = 264 px at t = 0, 464 px at t = 3 s). Measured TV1 post-bond overlay is max(|mean| + 3 sigma)
  X 0.899 um, Y 1.104 um over the die (-a-i2), rotation not reported; at 1 mrad the fringe period would already be
  3 mm, larger than the field of view. The shot shows alignment converging, not a bonded state.
- The see-through view (both arrays visible, Cu opaque, Si and SiO2 transparent, full contrast) is an art device,
  not a simulated infrared image.
- Die-edge keep-out and seal ring not drawn (width unknown); the tonal ramp hides the edge rows.
- Tonal ramp (Riley grey progression) from y = 360 to the die edge: pad contrast falls from ~30 % to ~10 % across
  the text band (x 560-1360, y 500-592), so the overlay reads on a calm, light field. Color only; geometry unchanged.

## Motion and encoding

- theta(t) = 1.6 + 3.6 / (1 + 0.55 t) deg: fringes swell outward from the pivot (period +18 % in the first 0.5 s) and
  slide with the offset drift. Stateless in t; keeps going gracefully to t = 3 s.
- Fastest pad motion < 0.6 px/frame (rotation at r ~ 1000 px); the die array is static.
- Test encode (1 s, 25 frames, libx264 High yuv420p, 5.1 Mb/s target): 4.05 Mb/s, decoded mid frame inspected, no
  visible blocking or strobing. Scratch files removed.

## Styled text

Styled text (2026-10-23): the `text` hook letters "3 µm" as Riley line lettering (lib/textfx.js; APA Grotesk 800 at
1.25 x `info.size`, centred on x = 960, baseline `info.baseline`). One field of horizontal wavy lines (period 8 px, sine
undulation amplitude 2.2 px, wavelength 230 px, drifting 24 px/s: < 0.06 px vertical change per frame, no strobing):
inside the glyph mask thick black lines with 1.3 px paper hairlines; around the glyphs the same field phase-shifted by
half a period as black hairlines on paper, thinning outward in three hard-edged rings (1.6 / 1.1 / 0.6 px at 4 / 8 / 12
px from the glyph), on a paper patch with a 2 px soft edge. Black and paper only; legible at t = 0; touched rows
493-593. Contrast vs the no-text band (t = 0 / 0.3 s): black line pixels median 12.3:1 (p5 5.8:1); area means, glyph
vs ring halo 3.1-3.2:1, glyph vs band 4.1-4.3:1. Shot l5b: mean 185 ms/frame (`render_video.py frames`).

## Figures looked at

ectc51846.2026.00218-f12 (pad / via top-view design rule), ectc51846.2026.00218-f01. Looked at only; nothing traced
or embedded.

## Verify

`uv run python scripts/render_video.py sheet l5b_hb3_opart.html --dur 3.0 --n 12 --param text="3 µm"` -> mean
118 ms/frame including screenshot (first frame ~540 ms warm-up); in-page render ~5 ms after warm-up.
