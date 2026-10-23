# l6b_hb1_cyanotype: L6 pass A (1840s), Cu-Cu hybrid bond W2W F2F, 1 um pitch, Anna Atkins cyanotype

Role (owner decision 2026-10-22: styles follow eras by section): this file now fills the **l6a slot** (pass A,
2 beats = 1.0 s, no overlay text). The file name is unchanged; edit.json maps it. `meta.text = 'light'` stays in
case the scene is reused as a text shot.

## Structure drawn

The cross-section geometry is identical to `l6a_hb1_pointillism`. Its notes have the full table of dimensions and
sources. Summary (280 px/um):

| y (px) | Layer | Rendering |
|---|---|---|
| ~56 | upper edge of the brush-coated sensitizer; bare paper above | |
| to 166 | upper wafer Si (face down) | soft, mid-blue mottled band |
| 166-314 | SiO2 | full Prussian blue |
| 314-426 | upper Cu wiring (links join pads 2m, 2m+1) | soft pale-blue "lifted specimen" ghost |
| 426-502 | via | ghost |
| 502-600 | upper bond pad (0.50 um at the face) | ghost |
| **600** | **bond interface on LINE_Y** | fine pale thread across the full width (SiO2-SiO2 bond line) |
| 600-698 | lower bond pad | crisp white contact silhouette |
| 698-774 | via | crisp white |
| 774-886 | lower Cu wiring (links join pads 2m+1, 2m+2) | crisp white |
| 886-~1040 | SiO2 | full Prussian blue |
| ~1040 | lower edge of the coated area, bare paper below | the lower-wafer Si (from y = 1034) falls under the ragged coat edge |

Dimensions: pitch 1.0 um; pad 0.50 um at the bond face, 0.35 um thick per side; via 0.27 um tall, about 0.2 um wide;
wiring 0.40 um; link 1.5 um, gap 0.5 um; 0.53 um dielectric to Si. Sources: `ectc51906.2022.00057-a-i1`, `-a-L02`
(pitch, pad, space, SiO2, F2F); vertical dimensions are estimates measured on `ectc51846.2026.00183-f01` against its
scale bar (details in the l6a notes).

Pad centres sit at x = 260 + 280 k.

## Style mapping

- Photogram logic: Cu is opaque, so it prints white. The SiO2 field is fully exposed (deep Prussian blue). Si is
  rendered as a translucent, mottled mid-blue.
- The lower wafer's Cu is "in contact" with the paper (crisp, 1.8 px soft edge). The upper wafer's Cu is "lifted"
  (9 px blur, only 30 % shading). This is how an Atkins print renders parts of a specimen that do not lie flat.
  This was first chosen to keep the pass-B overlay band calm. The scene is now pass A with no overlay, and the
  lifted look is kept as a photogram convention. Upper and lower Cu could both be crisp if wanted.
- Faint blue stain inside the whites (uneven clearing). Very soft per-grain tone patches in the lower Cu: annealed
  grains, some reaching the bond face. No boundary lines are drawn, so nothing reads as cracks.
- Paper: seeded fibres (4200 strokes, plus 120 in the pan margin from their own seed), broad mottle, faint vertical brush streaks. The coat edge is ragged with
  clustered bristle fingers and drybrush gaps, plus a slightly darker pooled rim. The coat edges are only at the
  top and bottom so the y = 600 line stays unbroken across the full width.
- All texture is built once in `init` (seeded): the final exposure per pixel, the coat coverage, and the fibre
  shading, plus the ink front's arrival distance. `render(t)` spreads the ink from these and pans the sheet.

## Motion: ink-drop diffusion (owner request 2026-10-22, replaces the global development fade)

The owner found the earlier pale-to-blue development read as a flat global fade. Now the Prussian blue spreads
outward from the bond line like an ink drop in wet paper. All of it is a function of t only (seeded noise built once
in `init`; the developed sheet is cached per t, the settled sheet from 0.85 s on).

- Per pixel, an arrival distance `DE = d + g (70 fb - 34 fing^1.5 - 24 fib)`, `d = |y - 600|`, `g = d / (d + 60)`
  (the front gets more ragged as it travels): `fb` = 3-octave value noise along x (150, 48, 15 px scales; separate
  fields above and below the line), `fing` = narrow capillary fingers (11 px scale) that run ahead, `fib` = the paper
  fibre mask (fibres wick the ink ahead of the front).
- Front radius `R(t) = 5 + (R_END - 5) (1 - (1 - t / 0.8)^1.15)` (mild ease-out: ink slows as it spreads), clamped
  at 0.8 s. `R_END` = the largest `DE` over the coated area + 40 px, so by 0.8 s the front, its feather and rim have
  left the coated sheet (top coat edge ~y 30-80, bottom ~y 1040). Measured on the l6a frames (median front over x,
  upper / lower): y 591 / 609 at 0, 521 / 683 at 0.08 s, 420 / 781 at 0.2 s, 324 / 878 at 0.32 s, 194 / 1001 at
  0.48 s, 102 / (bottom coat edge passed) at 0.6 s; no unwetted coated pixel left at 0.72 s.
- Profile behind the front, `s = R - DE`: feathered edge (smoothstep over s = -9 .. 12 px) from the latent sheet
  (the old `dp = 0` tones: pale yellow-green sensitizer, faint latent image) to the finished print (the old `dp = 1`
  tones: Prussian blue SiO2, white Cu silhouettes); a darker tide-line rim (55 % toward RGB 12,38,86, Gaussian at
  s = 7 px, width 6 px) as in real ink blooms; and a wet sheen (16 % toward the same blue, decaying over 90 px
  behind the front) that dries between 0.6 and 0.85 s.
- t = 0: R = 5 px, so the rim draws a thin dark line along y = 600 across the full width (the motif reads from frame
  0, over the pads too); the rest of the coated sheet is the latent sensitizer tone.
- 0.72 s: whole coated area wet; 0.8 s: rim and fingers out of the sheet; 0.85 s: sheen dried, settled. The settled frame is the same finished print
  as before. Bare paper margins never change.
- Geometry, the y = 600 thread and the coat edges never move. Only tone changes, plus the pan.

Camera (pass-A group pan, owner request 2026-10-22): content moves left at 28 px per second of shot time (camera
trucks right), horizontal only, constant, from t = 0; scene-time rate 28 / `speed` read from `APA.params.speed`. Was
20 px/s. Sheet 110 px wider than the frame (was 72): 84 px at 3 s, clamps at 90 px (3.2 s) so the frame edge stays
clear of the blurred mask edge. Measured on the rendered l6a frames, f00 -> f24: 26.9 px leftward (bare-paper fibre
rows at the top and bottom; target 26.9).

## Deliberate deviations

- The difference between the upper and lower wafers is rendering only. Upper and lower Cu are the same material
  and pad size. Equal pads follow `ectc51906.2022.00057-f02`.
- No grain-boundary lines, no barrier and no dielectric layer boundaries are drawn: the style is a silhouette
  print.
- The lower Si substrate is hidden under the coated-area edge, so the sheet crops it.
- Misalignment is drawn as 0. Measured spread for the related Sony module: `ectc51846.2026.00183-a-m5`
  (93 % of bonds <= 100 nm).

## Figures looked at (visual reference only; nothing traced or embedded)

`ectc51906.2022.00057-f02`, `ectc51846.2026.00183-f01`, `ectc51529.2024.00218-f01`, `ectc51909.2023.00190-f01`

## Verify

2026-10-22, pass-A role, no text, times include capture:
- Ink diffusion (2026-10-22, later): `sheet l6b_hb1_cyanotype.html --dur 1.0 --n 12`: mean 157 ms/frame, max
  190 ms; shot frames (l6a, 25): mean 143 ms/frame. Edge check at t = 0, 1.0, 3.0 s: no uncovered columns.
