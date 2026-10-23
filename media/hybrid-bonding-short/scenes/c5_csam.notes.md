# c5_csam - notes

Pass C, modality 5: C-mode scanning acoustic microscopy (CSAM / SAM) of hybrid-bonded parts, top view, greyscale.
Two views by URL param `v`. No text, scale bar or gate box inside the image; the overlay word is lettered by the scene's `text` hook (section "Overlay word"). `meta.text = 'light'`.

## What is drawn

Common to both views: greyscale only, dark = bonded, bright = non-bond / void. The image is drawn once at init on a
half-resolution canvas, given static seeded raster bands (horizontal, 14-44 half-res px tall, +/-1.75 % brightness) and
static fine noise (+/-7 grey levels), then upscaled nearest-neighbour, so every image pixel is a 2 x 2 px block (coarse
scan step). `render(t)` only transforms that image: no per-frame noise.

### v=1: whole 300 mm W2W bonded pair

- Wafer disc (grey 40) on a near-black background (grey 16); lowest point of the wafer tangent to y = 600 at x = 960;
  radius 290 px (1.93 px/mm); top at y = 20.
- Bevel ring: 3 px bright ring (grey 200) along the rim = unbonded edge; notch at 12 o'clock.
- Faint lighter street grid (pad-free streets read lighter), 20 mm fields on the same grid as c8.
- Ragged edge non-bond band on the upper-left rim (bright grey 150), inner boundary stepped, width up to about 6 px
  (3 mm).
- 11 bright voids (grey 222), round or slightly elongated along the rim: 8 edge voids clustered on the right rim, 3
  sparse interior voids; one particle void (14 mm, dark core = the particle) in the upper-left interior.
- Low-frequency bond mottling (+/-3 %) inside the disc.
- Motion: zoom about (960, 600), 1.00 to 1.02 over 3 s, ease-out (the tangent point stays on the line).
- Text band: the word sits on the dark disc just above the rim's lowest point; no voids or edge bands below y = 470.

### v=2: die-level zoom, D2W (die-to-wafer) bonded dies

- 40 px/mm. One row of 8 x 12 mm bonded dies (320 x 480 px, portrait) with their bottom edges on y = 600; a die is
  centered on x = 960; part of the next row above (y < 80).
- Streets between placed dies: the target-wafer surface, mid grey (96).
- Sites that would cross the edge-exclusion radius are unpopulated: bright (164), the strong echo of the bare
  target wafer, as the bright partial sites in the reference. The whole row below the line (y 640-1120) is partial;
  two partial sites at the left of the bonded row as well.
- Wafer bevel: an 18 px bright ring crossing the lower frame (200 mm wafer, center at (1300, -3150) px), dark beyond.
- Gate artifact: 2 px lighter outline on every bonded die.
- Voids: 11 round bright voids of 6-40 px (0.15-1.0 mm), and one half-moon edge void (radius 34 px) cut by the right edge
  of the die at x 1520-1840. Nothing in the text band (all voids at y <= 470 or outside x 560-1360, with pan margin).
- Motion: horizontal pan, 15 px/s, held after t = 3 s (45 px total).
- Text band: on the dark center die, with the two street edges at x 760-800 and 1120-1160.

## Facts and sources

| Item | Value | Source |
|---|---|---|
| Polarity | dark pixels = good bond, white = defect | ectc51846.2026.00218 p.3 |
| Greyscale LUT | all atlas HB SAM images are greyscale | refs_passC.md section 5 (no false-color HB SAM found) |
| v=1 wafer | 300 mm W2W, Cu/SiCN | ectc51529.2024.00334-a-i1 (300 mm W2W); the CSAM references (ectc51909.2023.00008-f01, ectc51529.2024.00125-f01) do not state wafer size |
| Bright edge ring, edge non-bond spots, ragged edge band | look | ectc51909.2023.00008-f01 (a, b), ectc51529.2024.00125-f01 (a), ectc51906.2022.00113-f06 (crops) |
| Edge voids | from die-edge damage or bond-wave propagation | ectc51906.2022.00031 p.7 |
| Longer bond-wave propagation raises void risk | - | ectc51909.2023.00219 p.2 |
| Lighter streets | systematic voids only in pad-free streets (W2W), < 1 % voids in the active area | ectc51529.2024.00128 p.1, p.5 |
| Raster bands | faint horizontal bands across the scan | ectc51529.2024.00125-f01 (crop) |
| v=2 die | 8 x 12 mm dies | ectc51909.2023.00023 p.2 Sec. II.A; ic ectc51909.2023.00023-a-i1 |
| v=2 wafer | 200 mm Si | ectc51909.2023.00023-a-i1; p.2 Sec. II.D |
| Voided dies | voids on 1.7 % of bonded dies (lot 3), 1-4 % in fine-pitch lots, small die-edge voids | ectc51909.2023.00023 p.4 Sec. IV.C |
| Bright partial sites, darker bonded dies, lighter streets | look | ectc51909.2023.00023-f05 (crop) |
| Half-moon voids at chip edges, round voids of many sizes | look | ectc51909.2023.00219-f06 (crop, before optimization) |
| Gate outline on die edges | look | ectc51906.2022.00031-f08 (b) (crop) |
| SEMI notch | depth 1.0 mm (+0.25 / -0), 90 deg (+5 / -1) | vendor 300 mm wafer spec sheet citing the SEMI standard: https://svmi.com/wp-content/uploads/2020/09/SV031.pdf |

## Chosen values (not found in the sources)

| Item | Value | Basis |
|---|---|---|
| v=1 void diameters | 3.6-9.5 mm, edge voids elongated 1.4-1.8x along the rim; particle void 14 mm | crop estimate: spots in ectc51909.2023.00008-f01 (a) are about 1.3-5 % of the wafer diameter (4-15 mm on 300 mm) |
| Particle void dark core | 4.4 px dot | general wafer-bonding knowledge (a particle holds the wafers apart in a round unbonded area around it); not from the atlas |
| v=2 void diameters | 0.15-1.0 mm; half-moon 1.7 mm | chosen; void diameters not found |
| v=2 street (die gap) | 1.0 mm (site pitch 9 x 13 mm) | not found; chosen to read as a street at 40 px/mm |
| Edge exclusion (v=2) | 3 mm | not found; same as c8 |
| Field grid (v=1) | 20 x 20 mm | c8's reticle choice (see c8_wafermap.notes.md); not from the CSAM references |
| Scan step | 2 px blocks: about 1 mm (v=1), 50 um (v=2) | not found (transducer frequency and scan step not found); chosen for a visible SAM pixel look |
| Notch position | 12 o'clock in v=1 | references show it at the top (ectc51909.2023.00023-f08) or bottom (ectc51906.2022.00113-f06); top keeps the tangent point clean |
| v=2 wafer placement | rim crossing the lower frame, center (1300, -3150) px | composition: explains the unpopulated row below the line |

## Deviations from reality

- Notch drawn 3 mm deep (3x the SEMI 1.0 mm) so it reads at 1.93 px/mm.
- v=2 voids sit on 7 of the about 11 visible bonded dies (several only partly in frame): the shot is a zoom on a
  defective region, far above the 1.7 % voided-die rate of ectc51909.2023.00023.
- v=2 mixes the 8 x 12 mm die and 200 mm wafer of ectc51909.2023.00023 with void shapes from other papers
  (ectc51909.2023.00219: > 400 mm2 chips).
- The 2 px block size is a look, not a measured scan step.
- No gate / ROI box, scale bar or info bar (text-like).

## Figures looked at (visual reference only)

ectc51909.2023.00219-f06, ectc51909.2023.00023-f05, ectc51909.2023.00008-f01, ectc51906.2022.00113-f06,
ectc51529.2024.00125-f01.

## Render

Steady-state draw 21-33 ms/frame (headless Chromium, SwiftShader, forced flush; a single drawImage of the prebuilt
image); first frame after load 41-104 ms. Sheet harness (draw + screenshot) mean 168-270 ms/frame.

## Overlay word (text hook, 2026-10-23)

Shots: c05 (v=1, "There’s", 64 px) and m04 (v=2, "more to", text_size 64.33 + 19.01 px/s; no flip, no text_color).

- Look: SAM software image annotation burned into the exported scan. The word is set in `APA.FONTS.mono` (IBM Plex
  Mono) on a half-resolution canvas at info.size / 2 inside a black box (82 % opaque) with a 1-block frame in the ink
  colour at 55 %, then upscaled nearest-neighbour onto the overlay, so glyph edges carry the same 2 x 2 px blocks as
  the image (even display offsets keep the block grid aligned).
- Ink: annotation yellow #ffd84a; an explicit `text_color` param replaces it with info.color.
- Same vocabulary for both words (branch-free); font, padding (0.30 / 0.24 x size) and box scale with info.size, so
  v=2 grows with the shot's text_size / text_grow.
- Placement: centred on x = 960, baseline on info.baseline (565); box bottom 565 + 0.24 x size (580 px at 64 px),
  above the line. Display coordinates only; the overlay is never flipped.
- Only the word: no gate, ROI, scale bar, transducer or file fields.
- Contrast (measured on the sheets' full-res frames, diffed against the same frame rendered without the word): ink #ffd84a
  (L = 0.709) vs box median 14.5:1 (v=1 and v=2 at 80 px); vs the scene under the glyphs >= 5.8:1 even without
  the box.
- Time (in-page APA.frame + canvas readback, SwiftShader): c05 39 ms/frame mean with the word (27 ms without),
  m04 43 ms (24 ms).
- Sheets: `cache/video/sheets/c5_csam__v-1__text-Theres.png`, `c5_csam__v-2__text-moreto__text_size-80.png`
  (+ `__full.png`); shots c05, m04 re-rendered with `render_video.py frames --only`.
