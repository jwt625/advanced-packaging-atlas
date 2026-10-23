# l6a_hb1_pointillism: L6 pass B (1880s), Cu-Cu hybrid bond W2W F2F, 1 um pitch, Seurat divisionism

Role (owner decision 2026-10-22: styles follow eras by section): this file now fills the **l6b slot** (pass B, 1 beat =
0.5 s, overlay "1 µm" rides the line, `meta.text = 'dark'`). The file name is unchanged; edit.json maps it.

## Structure drawn (top of frame to bottom)

Cross-section through one row of a face-to-face (F2F) wafer-to-wafer (W2W) Cu-Cu daisy chain, Sony-style test
structure (one wiring level per wafer, as in the atlas stack rows of the sources below).

| y (px) | Layer | Material | Notes |
|---|---|---|---|
| 0-166 | upper wafer substrate (flipped, face down) | Si | cropped by frame top |
| 166-314 | dielectric between Si and wiring | SiO2 | |
| 314-426 | upper Cu wiring: daisy-chain links joining pads (2m, 2m+1) | Cu | |
| 426-502 | via, pad to wiring | Cu (Ta barrier) | |
| 502-600 | upper bond pad, widest at the bond face | Cu in SiO2 | |
| **600** | **bond interface (Cu-Cu and SiO2-SiO2), on LINE_Y** | | |
| 600-698 | lower bond pad | Cu in SiO2 | |
| 698-774 | via | Cu (Ta barrier) | |
| 774-886 | lower Cu wiring: links joining pads (2m+1, 2m+2) | Cu | staggered by one pitch vs upper links |
| 886-1034 | dielectric | SiO2 | |
| 1034-1080 | lower wafer substrate | Si | cropped by frame bottom |

Scale: 280 px/um, pitch 1 um = 280 px (6.9 pitches across the frame).

## Dimensions and sources

| Item | Value used | Source / basis |
|---|---|---|
| Pitch | 1.0 um | atlas `ectc51906.2022.00057-a-i1` (W2W, F2F, design target); also `ectc51529.2024.00218-a-i1` |
| Pad size at bond face | 0.50 um (space 0.50 um) | `ectc51906.2022.00057-a-i1` pad_x 0.5; `ectc51906.2022.00057-a-L02` ("500 nm pad; 0.5 um space") |
| Pad size, top and bottom | equal | `ectc51906.2022.00057-f02` schematic shows equal upper/lower pads; no asymmetry stated |
| Dielectric | SiO2 | `ectc51906.2022.00057-a-i1` dielectric; `ectc51846.2026.00183-a-L03/L04` |
| Barrier | Ta | `ectc51846.2026.00183` p.2 Sec. II.A; `ectc51846.2026.00183-a-L03` (thickness not given) |
| Pad thickness per side | 0.35 um | estimate: measured on `ectc51846.2026.00183-f01` (a), 0.8 um pitch, same Sony test-module lineage, against its 500 nm scale bar (about 4.9 nm/px after 3x upscaling; about +/-10 %). Applied unscaled at 1 um pitch because the vertical stack in that figure looks the same at 0.8, 0.6 and 0.4 um pitch |
| Pad sidewall | 0.50 um at the face, about 0.42 um at the back, convex | estimate from the barrel-shaped pads in `ectc51846.2026.00183-f01` (max about 0.44 um for a 0.4 um pad); `ectc51906.2022.00057-f02` shows a tapered pad, wider at the bond face |
| Via | 0.27 um tall, 0.21 to 0.19 um wide | estimate, same measurement (`ectc51846.2026.00183-f01` (a): about 0.27 um x 0.19 um) |
| Wiring (link) thickness | 0.40 um | estimate, same measurement (0.38-0.41 um) |
| Link length | 1.5 um (from 0.25 um before one pad centre to 0.25 um past the next), gap 0.5 um | estimate: links in `ectc51846.2026.00183-f01` end about flush with the pad's widest edge |
| Dielectric between wiring and Si | 0.53 um | estimate from contrast in `ectc51846.2026.00183-f01` (a) left; the grey region past it is not labelled in the figure, it is identified as Si substrate by stack order `ectc51846.2026.00183-a-L01..L06` and `ectc51906.2022.00057-a-L01/L03` |
| Daisy-chain topology | upper links (2m, 2m+1), lower links (2m+1, 2m+2) | `ectc51906.2022.00057-a-i1` (200K-connection daisy chain); `ectc51846.2026.00183-f01`, `-f03` |
| Misalignment | 0 nm drawn | within the measured spread: `ectc51846.2026.00183-a-m5` (93 % of bonds <= 100 nm) |

## Motion (anneal, grain growth)

- t = 0: as-bonded state; fine grains in each pad, a dark Cu-Cu seam along y = 600 inside every pad pair.
- t ~ 0.01-0.40 s: post-bond anneal. 1-3 grains per pad pair nucleate at the interface and grow across it; the
  seam dissolves where they pass. In some pad pairs a one-sided grain keeps a short piece of the seam (the
  interface is not always fully consumed). The seam is visibly breaking up by about 0.1 s and mostly gone by
  0.25 s. Every dot has switched by 0.40 s at speed 1; after that a cached settled image is panned.
- Retimed 2026-10-22 after audit A1 (`DevLog/audits/hybrid_bonding_short_audit_A1_2026-10-22.md`). The cut is
  31 frames (1.24 s) and the old timing settled at about 1.9 s. Changes: column start delay 0-0.12 s (was
  0-0.3 s), front speed 180 px/s (was 80 px/s), switch jitter 0.08 s (was 0.12 s), and a hard settle at 0.98 s.
  The seeds and the number of PRNG draws are unchanged, so the grains, colours, geometry and pan are the same.
- Retimed again 2026-10-22 for the pass-B slot (0.5 s): column start delay 0-0.04 s, front speed 420 px/s,
  switch jitter 0.04 s, hard settle at 0.40 s. Seeds and draws are again unchanged.
- Slow pan, 16 px/s leftward (48 px at t = 3 s).
- Sources for grain growth across the interface on anneal: `ectc51846.2026.00024` p.1 (post-bond anneal above
  300 C promotes grain growth across the bonding interface); `ectc51909.2023.00219` p.5 Fig. 17 caption
  (recrystallized Cu grains across the bonding interface, ASTAR map). Anneal for the featured 1 um TV is not given in
  `ectc51906.2022.00057`; related Sony module `ectc51846.2026.00183` anneals at 400 C.

## Style mapping

- Every mark is a round dot of one pure pigment (ultramarine, cobalt, cerulean, viridian, emerald, lemon, chrome
  yellow, orange, vermilion, crimson, violet, white and pale tints) on a primed cream ground with a broad
  underpainting per material. Dots are seeded once (`APA.rng`) and never re-randomized.
- SiO2: luminous pale field, warm white near the bond plane, cooler lilac/blue toward the Si.
- Si: deep ultramarine/violet/viridian with sparse orange complements near the oxide.
- Cu: warm families. Each grain is its own dot family (golden, orange, or crimson-violet), so grains read as
  patches, much like diffraction contrast in a TEM image.
- Edges: Seurat's irradiation. Cu edges get a rim of dark ultramarine/violet dots and the oxide next to it a halo of
  white/yellow dots.
- Bond line in the oxide: a faint row of lilac/cobalt dots at y = 600. Faint green-blue rows at the wiring faces
  stand for the dielectric layer boundaries visible in `ectc51846.2026.00183-f01`. Their material is not stated
  in the source.
- Overlay band (pass B): a full-width strip from y = 472 to 595 (soft top edge 472-496) gets a calmer palette.
  The dark pigments (crimson, violet, ultramarine, cobalt, cerulean) are withheld there. The dark Cu rim
  becomes vermilion/orange, rose and green dots are thinned in the oxide, and the grain tones of the upper pads are
  compressed toward the light half. Dots, positions and geometry are unchanged, and grains still read. The strip
  stops above y = 595, so the Cu-Cu seam and the y = 600 bond line keep their dark dots. It is full-width rather
  than a box so it reads as light gathering above the bond plane, not as a patch.
- Measured contrast of the dark overlay (#141414) against the band x 560-1360, y 500-592 on no-text full-res
  frames: median 10.3-11.6:1 and darkest 1 % of pixels 4.1:1, at every t in {0, 0.1, 0.2, 0.4, 3.0} s.
  The pad at x = 960 sits under the text.

## Styled text

Styled text (2026-10-23): the `text` hook paints "1 µm" in Seurat's dots (lib/textfx.js; APA Grotesk 800 at 1.4 x
`info.size`, 7 % tracking, centred on x = 960, baseline `info.baseline`). Inside the glyphs: a navy underpainting
(#262c66, eroded 2 px so dots make the edge) and dense TFX.stipple dots (density 0.09/px^2, r 3.0 px +/-14 %, the
scene's accent-layer size) in the scene's dark pure pigments (navy, ultramarine, violet; crimson and cobalt accents).
Around them Seurat's irradiation: a 9 px halo of the complementary light pigments (warm white, pale yellow, lemon,
chrome; r 3.3 px). Fixed seeds (6101, 6102), cached per word / size: static, legible at t = 0; touched rows 487-595
(the seam rows stay untouched). Contrast vs the no-text band (t = 0 / 0.3 s): area means, glyph vs halo 5.6:1, glyph
vs band 4.5-5.0:1; dark-dot pixels median 5.9-6.0:1. Shot l6b: mean 322 ms/frame (`render_video.py frames`).

## Deliberate deviations

- The dark rim at Cu edges is the style's edge convention. It sits where the Ta barrier is but is not to scale
  (the real barrier is a few nm, under 1 px here). The source gives no barrier thickness.
- The Cu pad protrusion (> 5 nm, `ectc51906.2022.00057` p.2) is under 2 px and not drawn. The state shown is
  after bonding, with no gap.
- Grain sizes and the grain-front speed are stylized. A real anneal takes minutes to hours: e.g. 350 C, 120 min in
  `ectc51909.2023.00190-a-i1` and 400 C, 120 min in `ectc51846.2026.00218-a-i1`. Pre-anneal grain size is not
  quantified in the sources and is chosen at about 0.05-0.2 um.
- Vertical dimensions come from the 0.8 um pitch Sony module (`ectc51846.2026.00183`), not from the 1 um paper,
  which gives none.
- Only one wiring level per wafer (test-structure topology). Product wafers would have full multi-level BEOL
  (back end of line) between the pads and the Si.

## Figures looked at (visual reference only; nothing traced or embedded)

`ectc51906.2022.00057-f02`, `ectc51846.2026.00183-f01`, `ectc51529.2024.00218-f01`, `ectc51909.2023.00190-f01`

## Verify

2026-10-22, pass-B role:
- `uv run python scripts/render_video.py sheet l6a_hb1_pointillism.html --dur 0.6 --n 8 --param text="1 µm"`: mean
  284 ms/frame, max 375 ms.
- `--dur 3.0 --n 12 --param text="1 µm"`: mean 301 ms/frame, max 387 ms.
- `--dur 3.0 --n 12` without text: mean 287 ms/frame, max 347 ms.

All times include capture. One earlier run peaked at 513 ms, probably because of concurrent load on the machine.
Settled frames (t >= 0.40 s) draw one cached image, so their cost is mostly capture.
