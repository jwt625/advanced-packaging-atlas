# hero_bond: Cu/SiCN wafer-to-wafer hybrid bond forming, 0.4 um pitch

Style: contemporary 3D motion graphics. One analytic ray-traced WebGL2 fragment pass (no meshes, no textures): a
cutaway block whose front cut passes through the centres of one row of pads. Copper is drawn as polished metal with
studio reflections, and the dielectric as smoky frosted glass through which the pillars of the rows behind recede.
Palette follows `s00_horizon.html` (navy field, copper glow at the plane), so the shot bridges into the dark
"Hybrid bonding" card. `meta.text = 'light'`. No text in the scene.

## Camera and the line

- The camera sits at the height of the bond plane (y = 0), principal point (960, 600). The bond plane is
  therefore the horizon and projects to y = 600 at every depth: the line is a geometric fact, not an overlay.
- Pinhole, focal length 1441 px, 2.2 um from the cut face, yaw 7 deg (the rows recede toward the left of centre).
  Pitch on the cut face is 295 px at the left edge, 254 px at centre and 222 px at the right edge, inside STYLE's
  220-320 px. Scale is 650 px/um at screen centre, the same scale as l7a / l7b.
- Motion: camera truck 0.04 um/s (about 26 px/s on the cut face; no vertical motion). Truck does not change the
  per-column scale.

## Structure drawn (top wafer flipped, mirror of the bottom wafer)

| Element | Material | Size used | Source / basis |
|---|---|---|---|
| Pitch | - | 0.4 um | `iedm45741.2023.10413829-a-i1`, `ectc51846.2026.00187-a-i2`, `ectc51846.2026.00183-a-i3`, `ectc51909.2023.00008-a-i1` |
| Pad layout | circular pads on a hexagonal grid | nearest-neighbour 0.4 um, row spacing 0.346 um (P sqrt(3)/2, derived) | `iedm45741.2023.10413829` text p.1 Sec. II.A (hex grid, circular pads below 400 nm CD) |
| Bond pad (PAD) | Cu, equal pads both wafers | CD 0.20 um; Cu areal density 22.7 % (derived), within the 25 % maximum | CD: `ectc51846.2026.00187-a-i2`, `ectc51846.2026.00183-a-i3` (identical pads both sides), `iedm45741.2023.10413829-a-i5`; 25 % rule: `iedm45741.2023.10413829` Sec. II.A |
| Pad height | - | 0.40 um | estimated from `iedm45741.2023.10413829-f01` scale bar (+/-15 %); same value as l7a / l7b |
| Via | Cu | 0.30 um tall, CD 0.16 um | estimated from `iedm45741.2023.10413829-f01`; same as l7a / l7b |
| M1 daisy-chain links | Cu | 0.13 um thick, 0.30 um wide, centre-to-centre P along a hex-neighbour direction, 0.16 um overhang past each via | thickness / width estimated from `iedm45741.2023.10413829-f01`; daisy-chain topology (links alternate top / bottom wiring) `ectc51846.2026.00183-a-L02/L05`; link direction and overhang are my choice, not sourced |
| Bond dielectric around pads | SiCN | pad-level band, 0.40 um | `iedm45741.2023.10413829-a-L05/L06`, `ectc51846.2026.00187-a-L05/L06` |
| Via-level dielectric | oxide | above the SiCN band | `ectc51846.2026.00187-a-L04` (oxide around the bond via); the exact iedm stack is not stated |
| Barrier liner | TaN/Ta | drawn 6 nm, as a thin dark rim on the cut face only | `ectc51846.2026.00130-a-L05`; thickness not reported in any atlas source (same choice as l7a) |
| Top-wafer overlay | - | 25 nm shift | within <50 nm for 95 % of sites (`ectc51846.2026.00187` fig f08) and <150 nm best wafer (`iedm45741.2023.10413829-a-i1`); same as l7a |
| Cu recess (dishing) before anneal | - | per pad, seeded: centre 0.6-1.1 nm, edge 0.4 x centre, parabolic dish | `iedm45741.2023.10413829-a-L05` (pad height 0 to -2.5 nm, AFM, Fig. 7); `ectc51846.2026.00130` fig f08 (<1 nm average, medians -0.6 to -0.9 nm). Dish shape assumed |
| Cu expansion on anneal | - | 1.5 nm per side at the end, centre-weighted dome (0.35 at the edge, 1.0 at the centre) | `ectc51846.2026.00130` Sec. III.D (AFM, 400 C 5 min soak: 1.5 nm). `ectc51846.2026.00183` Fig. 12 reports less expansion at 0.2 um pads (value not read off). Dome profile assumed |
| Cu grains before anneal | fine-grain ECD Cu | Voronoi cell 46 nm | `ectc51846.2026.00187` Sec. III.A (PED average grain size 42 nm and 47 nm) |
| Cross-interface grains after anneal | - | two growers per pillar, final radius 0.13-0.18 um | `ectc51846.2026.00187` Sec. III.A, fig f03 (FG Cu grains extend across the interface after 210 / 350 C, 2 h). Grower sizes are rendering choices |
| Dielectric interface after anneal | interfacial SiOx | drawn as a faint line, not to thickness | `ectc51909.2023.00190-a-L06` (TEM 4.43-4.89 nm SiOx at the SiCN-SiCN bond) |

## Physics sequence and timing (t in s; valid and complete-looking for t in [0, 4])

| t | Step | Source |
|---|---|---|
| 0 - 0.63 | Bond wave: the contact front enters at the left edge at t = 0, is mid-frame at ~0.34 s and leaves the right edge at ~0.63 s. Ahead of it the top wafer is still lifted (thin open wedge, opening exaggerated: see below); behind it the dielectrics are in contact. A cool flash rides the front. | plasma activation, DI rinse, room-temperature bond: `ectc51846.2026.00187` Sec. II.E; bond wave: `ectc51909.2023.00008` p.3 Sec. IV, `ectc51529.2024.00076` Sec. II |
| 0 - 0.9 | Room-temperature state behind the front: the dielectric is bonded and the Cu pads stay separated by their recess (dark lens between the facing pads, also visible on the pillars behind). | as above; recess sources in the table |
| 0.55 - 0.95 | Anneal begins (warm glow ramps). | 200-350 C post-bond anneal: `ectc51846.2026.00187` Sec. II.E; 250 C dielectric strength, 350 C Cu bulge-out: `iedm45741.2023.10413829` Sec. II.B; 400 C: `ectc51846.2026.00183` Sec. II.A |
| 0.62 - 1.08 | Cu expands more than the dielectric (CTE mismatch) and closes the recess. Each pad makes contact at its centre first (~0.87-0.92 s, short flash), then out to its edge (~0.90-0.96 s). | `ectc51846.2026.00130` Sec. III.D; `ectc51846.2026.00187` Sec. I ("gaps ... close through thermal expansion") |
| 0.9 - 1.45 | Interdiffusion and grain growth across the interface: the Cu-Cu line breaks up and disappears through the Cu; the dielectric line fades to 12 % (faint, as the SiOx interfacial layer remains). | `ectc51846.2026.00187` Sec. III.A, fig f03; `ectc51909.2023.00190-a-L06` |
| 1.5 - 4.0 | Hold: the anneal glow cools (heat down to 20 % by 3.0 s), exposure eases down 22 % by 4.0 s, camera truck continues. | - |

The order of the steps is true to the sources. The timing is free: the real bond wave and the 1-2 h anneal
(`ectc51846.2026.00187`: 2 h) are compressed into about 1.5 s. The overlay text is synced to these events (see "Overlay
text"). To move the dissolve, edit `grow` / `diel` in `state(t)`.

## Overlay text (scene `text` hook; owner 2026-10-23: shot "hero", 4 beats = 2.0 s, text "shrink & bond")

- Drawn by `heroText` / `bondWord` with `lib/textfx.js` (`TFX.mask`, `TFX.fill`, `TFX.layout`, `TFX.hash`), in the
  default serif (`info.fonts.serif`) at `info.size`, colour `info.color` (light, #f4f1ea), centred on x = 960 on the
  default baseline. The whole phrase runs one sequence (owner: "all separate into top and bottom half, shrink, and
  then bond and anneal"). A single word gets the same treatment.

| t (scene s) | Text | Tied to |
|---|---|---|
| 0 | Every glyph is split at mid x-height: top half 3.5 px up, bottom half 3.5 px down (7 px gap at 64 px; 0.11 x size, at least 5 px). Legible from frame 0. | - |
| 0 - 0.22 | The whole phrase scales 1.0 -> 0.85 about (x = 960, baseline), still split. It finishes as its first columns start to close. | chosen so the shrink completes before the bond |
| 0.22 - 0.38 | Halves close column by column (2 px columns composed offscreen, so the scale adds no seams), left to right, as the scene's bond front passes. Each column's gap ramps from 0 at the front to full 1.6 x size (102 px, unscaled) ahead of it. A cool-white glint rides the split at the front. No lag: the front reaches the scaled phrase (ink about x 773-1147) at ~0.25 s and leaves it at ~0.37 s. | `frontSX(t)`: `state(t).xf` projected with the shader camera (front crosses the frame at ~1570 px/s, leaves at ~0.63 s) |
| ~0.24 - 0.38 | Each letter's seeded hairline cracks fade in as it closes, dark like voids: a jagged fissure on the split, 2-4 branches 4-12 px into the halves, 1-2 small voids. Clipped to the glyphs. | letter closure |
| 0.55 - 0.85 | Cracks turn warm off-white with a peach tint (rgb 255/218/192, rgba 255/206/172 halo, 7 px blur); a pale seam (#fff2e6, #ffcfae glow) appears on the split. | scene anneal ramp (`heat` 0.55-0.95) |
| 0.85 - 1.45 | Cracks heal from the tips inward (largest path distance from the letter centre first); the seam fades over 1.0-1.45. | scene grain growth / dielectric fade (0.9-1.45) |
| 0.22 - 1.45 | Strike-through anneal line (owner 2026-10-23): one continuous line on the split row across the phrase's ink width, plus 14 px each side with 22 px tapered ends. It is drawn only behind the front, with a 26 px soft leading edge, so it follows the bond left to right. Strength 0.45 at bonding, rising to 1 over 0.55-0.85 s, then fading to 0 over 0.9-1.45 s. 2 px core rgba(255, 246, 236, 0.9 x strength), 6 px halo rgb 255/214/186 at 0.3 x strength, peach bloom (rgba 255/206/172, blur 16 / 6). It sits over the cracks. | scene front; anneal ramp; scene interface fade (`grow` 0.9-1.45) |
| 1.45 - | Solid phrase; hold. The shot cuts at 2.0 s. | - |

- Cracks are seeded per letter (`TFX.hash(letter index, char)`), deterministic, and built once per phrase / size.
  They are a typographic metaphor for the room-temperature voids and anneal healing, not a dimensioned feature.
- No scene physics timing changed. The band background is unchanged by the hook. Measured 5th-percentile contrast
  of #f4f1ea against the band is >= 3.67:1 (t = 0.3, 0.6, 1.0, 1.45), via the band highlight compressor (below).

## Exaggerations and deliberate deviations

- **Recess and Cu expansion are drawn 15x vertically** (`XG = 15`): 1 nm is 9.75 px instead of 0.65 px. This applies
  only to those nm-scale heights. All other geometry is to scale (650 px/um at centre, perspective).
- **The bond-wave opening ahead of the front is exaggerated, by at least 15x** (audit A1, 2026-10-22). It is drawn
  as g = A (x - x_front)^1.5, reaching 15 nm about 3 um ahead of the front: 8 px at the right edge at t = 0, about 3 px
  mid-frame. That is the smallest opening that still reads as a wedge. A few um behind a real bond-wave front the
  opening is well below 1 nm, because wafer bow spreads over mm-cm lengths; the atlas gives no number at this scale.
  The drawn 15 nm is therefore the same 15x factor as the recess, applied to a 1 nm upper bound, so the true factor
  is 15x or more. The profile shape is a choice. The top wafer's pads move rigidly with the local gap; tilt is ignored.
  (The first version opened to 0.30 um, a 4-7 deg wedge; corrected.)
- Pads and vias are straight cylinders. The ~6 % taper estimated in l7a is omitted.
- The glow at the bond plane is the video's motif light, not thermal emission. Cu at 200-400 C does not glow visibly.
  The wave flash and the contact flashes are stylization.
- SiCN and SiO2 are optically transparent. The frosted, smoky glass (extinction 2.8-3.2 /um) is a depth cue.
- The TaN/Ta liner is not rendered on the curved surfaces seen through the glass, only as a rim on the cut face.
- Expansion past contact is clamped (in reality it becomes compressive stress); the gap does not reopen on cooling.
- Text band (x 560-1360, y 500-592) is kept calm in two ways. (1) A smooth contrast reduction over x 380-1540,
  y 430-690, strongest over 560-1360. (2) A soft-knee highlight compressor on HDR luminance (knee 0.08, cap 0.15
  after exposure) that lowers only bright pixels, at full strength over x 560-1360 and y 495-600, feathered to 0 by
  x 400 / 1520, y 440 and y 690. Both are continuous through y = 600, so neither draws a box or a line. The 1-3 px
  interface core and the contact flashes are added after the compressor; they lie below the band. Effect: the
  anneal glow is visibly capped behind the text and stays full-strength at the frame sides. This is time-independent,
  so all event times are unchanged.
- Measured contrast of `#f4f1ea` text against the band (frames rendered without text, sRGB relative luminance),
  for t = 0, 0.15, 0.3, 0.45, 0.6, 0.8-1.6 in 0.1 s steps, 1.8, 2.0, 2.2, 2.6, 3.0, 4.0: 5th percentile >= 3.67:1 and
  minimum >= 3.55:1 at every t. Worst is t = 0.9-1.0 s, where it was 1.83:1 before the fix.
- Copper and glass colours are display choices (copper tint 0.95 / 0.56 / 0.36 linear), not measured optics.

## Figures looked at (visual reference only; nothing traced or embedded)

`iedm45741.2023.10413829-f01` (pad / via height estimate check: 1 um scale bar ~140 px; via + pad ~0.75-0.8 um).

## Render

In-page draw about 150-180 ms per frame (min of 5, headless Chromium SwiftShader, readPixels-synced, machine shared
with other renders). Harness sheet (after audit fixes): mean 330 ms, max 692 ms per frame including the PNG screenshot (the max is the first
frame, which includes the shader compile).
Sheets: `cache/video/sheets/hero_bond.png`, `hero_bond__full.png`, `hero_bond__text-shrinkbond.png` (+ `__full`;
2.0 s, 12 frames, harness mean 459 ms, max 1397 ms per frame under load (max is the first frame, with shader compile), including the screenshot and the text hook).
Cut: `render_video.py frames --only hero` (50 frames, mean 361 ms/frame) and `assemble` ->
`media/hybrid-bonding-short/out/hybrid-bonding-short.mp4` (550 frames, 22.00 s; hero = frames 425-474).
