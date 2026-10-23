# Pass C reference sheet: 8 inspection-modality top views (DevLog-015)

Date: 2026-10-22. Scope: references and facts for pass C (8 shots x 0.25 s, after pass B, before the hero).
Scene builders read this together with `STYLE.md`. Crops under `references/<paper_id>/figures/key/<fig_id>.png` are
licensed, local-only visual references: look, never trace, embed or reproduce a figure's composition. This sheet holds
fig_ids and descriptions only.

Method: `data/figures.csv` searched (caption + shows + notes) for SEM / optical / DIC / AFM / IR / CSAM / SAM / SAT /
EBSD / IPF / PED / TEM / STEM / plan view / wafer map / overlay / vernier / void, joined to `test_vehicles.csv` and
`interconnects.csv` (hybrid-bond rows: 59 TVs in 35 papers). About 60 crops viewed; cached `text.md` read for numbers.
Conventions: "(crop)" = read off a figure by eye, approximate; "(derived)" = arithmetic on sourced numbers;
"(textbook)" = general physics, not from the atlas; "not found" = searched, absent. Page numbers are the
`<!-- page N -->` markers in `text.md`.

## Summary

| # | Modality | Keep? | Top reference (fig_id) | Featured HB facts (source) | Gaps |
|---|---|---|---|---|---|
| 1 | Optical brightfield | keep | ectc51909.2023.00179-f07 (color), 001c.129764-f05 (array corner) | 7 um pitch, 3.5 um pad, die 8 x 12 mm, edge chain 50 um from die edge (ectc51909.2023.00023-a-i1, p.2, p.5) | DIC: no atlas example |
| 2 | SEM (SE), plan view | keep | ectc51529.2024.00128-f03 | 0.64 um square lattice, 25 % Cu density (ectc51529.2024.00128-a-i1, p.3) | pad side only derived |
| 3 | AFM height map | keep | ectc51846.2026.00130-f08 | 0.45 um pitch W2W, recess medians -0.6 to -0.9 nm, 2 x 2 um scan (ectc51846.2026.00130-a-i1, f08, p.2) | pad CD for that TV not found |
| 4 | IR transmission, alignment marks | keep | ectc51909.2023.00023-f07 | annulus fiducials on all die corners, vernier resolution 0.25 / 0.1 um (ectc51909.2023.00023 p.2) | vernier tick pitch, mark sizes not found |
| 5 | CSAM / SAM | keep | ectc51909.2023.00219-f06 (CoW voids), ectc51909.2023.00023-f05 | dark = bonded, white = defect (ectc51846.2026.00218 p.3); 1.7 % of dies voided (ectc51909.2023.00023 p.4) | atlas HB SAM images are greyscale, no false-color LUT; void diameters, transducer MHz not found |
| 6 | EBSD / PED orientation map | keep (plan view is a constructed composition) | ectc51687.2025.00071-f04 (IPF vocabulary), ectc51846.2026.00130-f06 | 3 um pad / 6 um pitch; as-plated 79 +/- 74 nm, ~400 nm after < 220 C bond anneal (ectc51846.2026.00024 p.3, p.5) | no plan-view orientation map of HB pads in the atlas |
| 7 | Plan-view TEM | **substitute**: high-mag SEM of one pad edge | ectc51529.2024.00021-f04, ectc51687.2025.00060-f08 (top row) | single 0.32 um square pad of the 0.64 um lattice (derived); FG Cu grains 42-47 nm (ectc51846.2026.00187 p.4) | plan-view TEM / STEM: not found anywhere in the atlas text or figures |
| 8 | Wafer-level map | keep | ectc51529.2024.00334-f05 (pass/fail map), ectc51909.2023.00023-f08 (die map) | 300 mm W2W, 300 nm pitch, 3k / 660k / 5.5M-link chain yields 100 / 79 / 49 % (ectc51529.2024.00334-f05; a-i2) | edge exclusion width, notch size not found |

## Global composition rule for pass C (all 8 shots)

- Top views. The motif line y = 600 is a physical edge of the object that carries the array, array above it.
- Text band x 560-1360, y 500-592: keep it free of pads. The simplest real-geometry way: the lowest feature row ends at
  y <= 500 and the physical edge at y = 600 falls inside the next inter-row gap (needs pitch - pad >= 100 px on screen,
  i.e. pitch >= 200 px when pad = pitch / 2). Per-shot numbers below.
- Pitch on screen 200-250 px for the array shots, so pass C reads as dense as passes A and B.
- No text in scene: every reference crop carries scale bars, info bars, colorbars, axis labels, panel letters, red
  circles and arrows. Drop all of them. Colorbars and axes are text-like; omit.
- 0.25 s per shot: a static image or very slow drift reads best. Instrument noise (SEM shot noise, AFM roughness, IR
  sensor noise) must be seeded once and static (STYLE.md: no full-frame per-frame noise).
- Each modality has its own LUT; together they give the montage its color rhythm: tan/teal (optical), grey (SEM),
  copper-gold (AFM), grey (IR), grey-black (CSAM), RGB IPF (EBSD), grey (SEM zoom), green/red flat cells (wafer map).
  Suggested order to avoid back-to-back greys: 1 optical, 2 SEM, 3 AFM, 4 IR, 6 EBSD, 5 CSAM, 7 SEM zoom, 8 wafer map,
  or keep the planned order (4 IR and 5 CSAM are adjacent greys, acceptable at 0.25 s).

---

## 1. Optical micrograph (brightfield): D2W pad field after CMP

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51909.2023.00179-f07 | Cu oxide row: single HB Cu pad (round) inside an octagonal frame; clean pad pale yellow-grey on olive-tan dielectric; oxidized pads orange to red-orange with a halo; cross-hatched fine texture of the field | HBM HBI pads; 10 um diameter pads mentioned in text (p.2, Cu pop-up measurement); the imaged pad size is not stated |
| 001c.129764-f05 (non-HB, 9 um pitch microbumps) | panel (a): corner of a dense bump array on a flat field: low mag left (array edge visible as a sharp corner), higher mag right; color: yellow-green field, olive-dark pads with speckled tops | 9 um pitch (caption) |
| ectc51529.2024.00106-f06 | "Optical" inset: die corner, copper-orange field, rows of fine pads, alignment marks near the edge, die edge as a bright line; full dies: pale tan with gold pad banks on a blue mount | D2W dies, size not stated |
| iedm45625.2022.10019499-f11 | (a) brightfield green field with a slightly brighter gap-fill cross between four chiplets, dark edge lines; (b) cross-polarized variant: blue field, bright edge glints at corners | chiplet gaps; no scale in caption |

### Visual vocabulary checklist (optical brightfield)

- Flat, even Koehler illumination with a slight radial vignette (corners 5-10 % darker).
- Dielectric color = thin-film interference tint of the bond dielectric on Si (seen as teal-green, yellow-green,
  olive-tan in the refs above). Film thickness for any HB TV not used here; pick one tint and keep it uniform.
- Cu pads: higher reflectance, pale salmon / pale yellow-grey; very slightly brighter rim (edge scatter).
  Oxidized pads: orange-red, mottled (ectc51909.2023.00179-f07, text p.2: oxidation causes discoloration).
- nm-scale recess is invisible in brightfield: pads read as flat colored discs, no relief shading.
- Fine field texture (CMP micro-scratches, subtle speckle) is static and low contrast.
- Slight chromatic softness: pad edges 1-2 px blur; no sharpening halos.
- DIC (Nomarski) would add one-directional relief shading (one side of each pad bright, the opposite dark, along the
  shear axis) on a grey-violet or bronze background. No atlas example found; if used, it is from general microscopy
  knowledge, not a sourced reference. Recommendation: brightfield.

### Facts (hybrid bonding)

| Fact | Value | Source |
|---|---|---|
| Pitch / pad | 7 um / 3.5 um diameter (pitch = 2 x pad) | ectc51909.2023.00023-a-i1; text p.2 Sec. II.A |
| Die size | 8 x 12 mm | ectc51909.2023.00023 p.2 Sec. II.A |
| Edge chain | 7 rows x 426 links; closest row 50 um from the bottom die edge, then every 21 um (50-176 um) | ectc51909.2023.00023 p.5 Sec. IV.G |
| Wafer | 200 mm Si | ectc51909.2023.00023-a-i1; p.2 Sec. II.D |
| Pad shape | octagonal Cu (DBI) pads in plan-view SEM of the same TV | ectc51909.2023.00023-f06 (crop) |
| Alternative pad set | 3 um pad / 6 um pitch | ectc51846.2026.00024-a-i1; ectc51687.2025.00060-b-i1 |

### Composition (true to scale, 2 px/um)

- Scale 2 px/um: frame = 960 x 540 um of the die corner region; pitch 14 px, pad 7 px (octagons or discs).
- Die edge on y = 600 (bottom die edge). Below: dicing street / target wafer (darker, neutral grey, faint saw texture);
  street width not found, so let it run off the bottom of the frame.
- Edge chain: first pad row 50 um above the die edge = y 500 (pad bottoms at y = 500), then 6 more rows every
  21 um = 42 px (y 458, 416, ..., 248); above y = 248 the dense bottom array at 14 px pitch (gap row spacing to it not
  found, use one pitch). The band y 500-600 is the real 50 um keep-out: plain dielectric.
- Optional: an annulus alignment fiducial at a die corner, outside x 560-1360.

---

## 2. SEM (secondary electrons), plan view: sub-um pad lattice

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51529.2024.00128-f03 | (a) 0.64 um square lattice of rounded-square openings: mid-grey granular field, openings dark with a bright rim, brighter on the upper / one side (edge effect + slight tilt); (b) 0.33 um x-pitch rectangular lattice of oval openings, more contrast, shadowed lower lip | 0.64 um pitch; 0.33 x 0.4 um lattice (caption) |
| ectc51909.2023.00023-f06 | plan-view SEM of Cu DBI pads on unbonded substrate: Cu pads bright white octagons with a soft glow on dark grey dielectric (material contrast reversed vs. f03 because these are Cu-filled); defective pads dark with a bright ring and textured interior | 7 um pitch TV (ectc51909.2023.00023-a-i1) |
| ectc51529.2024.00128-f04 | tilted SEM of the 0.64 um openings, wafer edge vs center: foreshortened rows, bright top edges, cleaved front face | tilt angle not stated |
| tcpmt.2025.3628798-f21 (non-HB, bumps in polymer after CMP) | 4 magnifications per pitch: dense array, charging halos (dark rings) around pads at mid mag, faint grain / scratch lines on pad tops at high mag, smooth brightness gradients across the field | 5-20 um pitch (caption) |

### Visual vocabulary checklist (SE image)

- Greyscale only. Cu (higher Z) brighter than the dielectric in a post-CMP Cu-filled surface (ectc51909.2023.00023-f06);
  open (unfilled) holes are dark with bright rims (ectc51529.2024.00128-f03).
- Edge brightening: 2-6 px bright rim on every pad edge, asymmetric (one side brighter) from detector position.
- Charging: soft dark or bright halo in the dielectric around pads; slow brightness gradient across the field.
- Fine granular speckle on the dielectric (static, seeded).
- Horizontal scan-line artifacts: a few rows with slight brightness offset or 1-2 px horizontal jitter (static).
- Shot noise: fine, static; slight blur (probe size) at high mag.
- Instrument info bar at the bottom of real SEM images is text: omit.

### Facts

| Fact | Value | Source |
|---|---|---|
| Lattice | square 0.64 um pitch lattice of square pads; also 0.48 um square and 0.33 x 0.4 um rectangular | ectc51529.2024.00128-a-i1..a-i3; p.3 Sec. III.A |
| Cu density | local Cu density 25 % at every pitch; upper and lower pads equal | ectc51529.2024.00128 p.3 |
| Pad side | 0.32 um at 0.64 um pitch (sqrt(0.25) x pitch) | (derived) from the two rows above |
| Dielectric | hermetic, metal-diffusion-barrier dielectric (not named) | ectc51529.2024.00128-a-i1 |
| W2W voids | < 1 % voids across the active area; systematic voids only in pad-free streets | ectc51529.2024.00128 p.1, p.5 Fig. 10 caption |

### Composition

- 375 px/um: pitch 240 px, pad 120 x 120 px (rounded corners, radius ~15-20 px per f03 crop look), 8 columns,
  column centers 960 + k x 240.
- Lowest pad row: bottom edges at y = 500 (rows at y 380-500, 140-260, -100-20).
- y = 600: a cleaved / FIB-cut sample edge running through the inter-row gap (the next row would start at y = 620).
  Draw it as the strongest SE edge in the frame: 4-8 px bright line, then black below (no sample). Alternative: the
  edge of a pad-free street (W2W streets carry no pads, ectc51529.2024.00128 p.5), with a mild contrast step.
- Band y 500-592 is plain dielectric speckle.

---

## 3. AFM height map: Cu recess per pad

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51846.2026.00130-f08 | 2D AFM of a Cu pad array: copper-gold LUT, recessed pads darker brown discs with mottled interiors, lighter dielectric, clear horizontal scan-line bands (row offsets), white header text (omit) | 2.00 x 2.00 um scan (header in crop), 0.45 um pitch TV |
| ectc51846.2026.00024-f10 | 20 um 2D scans at wafer center / edge: pads with a darker rim ring (edge dishing) and lighter centers, fine grain-like noise, white line-scan markers (omit) | colorbar about +1.8 to -2.8 nm (crop); 3 um pad / 6 um pitch |
| ectc51687.2025.00060-f08 | middle row: AFM of 1 / 3 / 5 um pads, orange-brown LUT, pads with bright rim rings; bottom row line scans | Ra ~0.13 / 0.18 / 0.14 nm; dishing ~0.4 / 1.2 / 2 nm (atlas shows + crop) |
| ectc51529.2024.00128-f06 | olive-yellow-red LUT, protruded pads bright yellow, irregular dark-red pitting at pad edges, blurry; 0.36 um panel: pads barely resolved blobs | 0.64 and 0.36 um pitch; profiles over 2.7 um |
| iedm45625.2022.10019499-f12 | very clean two-tone map: dark maroon square recessed pads on yellow field | not stated |

### Visual vocabulary checklist (AFM)

- One sequential LUT: dark brown (low) -> copper -> gold -> cream (high), the default "AFM gold" look of the references.
- Scan-line offsets: each fast-scan row (horizontal) carries a small constant offset; visible as horizontal bands.
- Tip convolution: pad edges rounded over a few px; recessed pads look slightly smaller than drawn; no vertical walls.
- Edge rings: a darker ring at the Cu/dielectric boundary (edge dishing / erosion, ectc51846.2026.00024-f10) or a
  bright rim (ectc51687.2025.00060-f08), pick one.
- Surface roughness: fine static noise on both materials; Cu interior mottled (grain relief).
- Occasional streak (tip pickup) along one row, a few spikes; static.
- No 3D rendering for a top view (several refs are 3D renders: ectc51529.2024.00017-f05, ectc51909.2023.00240-f01, not
  the target look).

### Facts

| Fact | Value | Source |
|---|---|---|
| Pitch | 0.45 um, W2W, SiCN, 300 mm | ectc51846.2026.00130-a-i1 |
| Recess | < 1 nm on average after Cu CMP (AFM); per-die medians about -0.6 to -0.9 nm | ectc51846.2026.00130 p.2; f08 (crop / atlas shows) |
| Scan | 2 x 2 um | ectc51846.2026.00130-f08 (crop header) |
| Pad CD (this TV) | not found | - |
| Dielectric roughness | SiCN < 2 A RMS after CMP; Cu dishing < 2 nm, < 1 nm variation | ectc51909.2023.00190 p.1 |
| Alternative set | 1 um pad / 2.5 um pitch, dishing ~0.4 nm, Ra ~0.13 nm | ectc51687.2025.00060-b-i3; f08 |
| Recess growth on anneal | 10 um pads expand ~10 nm at 200 C | ectc51909.2023.00179 p.2 |

### Composition

- Frame = 4.0 x 2.25 um crop of a larger scan, 480 px/um: pitch 216 px. Pad CD not found for this TV; the crop shows
  pads about half the pitch (estimate), so pad ~108 px discs.
- Lowest pad row bottoms at y = 500; y = 600 is the bottom edge of the scanned field (next row would begin at
  y = 608). Below 600: no data, flat near-black UI background. Alternative: macro boundary with pad-free field below.
- Height mapping: dielectric 0 nm; pad interior -0.6 to -0.9 nm (vary per pad); LUT span about -1.5 to +0.5 nm so the
  pads read clearly; row offsets ~ +/-0.1 nm (estimate) visible as bands. Keep rows in the band y 500-592 offset-free
  or very weak.

---

## 4. IR transmission through the bonded pair: alignment fiducials and verniers

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51909.2023.00023-f07 | die-stack corner: concentric annulus fiducial (outer thin grey ring, thick black ring, white center with a thin black crosshair); vernier combs along the top and right edges, two interleaved tick sets in two greys (top die vs substrate), longer index ticks at the center; very clean, high-key | resolution 0.25 um corner, 0.1 um H/V verniers (text p.2) |
| ectc51529.2024.00106-f05 | lower-left IR image: die corner with a chamfered (45 deg) seal ring as a bright double line, darker beyond the die, "O" ring mark, "+" cross mark, comb vernier, all bright with dark outlines and soft halos | D2W tiers, 20-5 um pitch pads |
| ectc51529.2024.00106-f06 | IR of an N=4 stack corner: several nested, offset seal-ring outlines (one per tier, misalignment visible as parallel offsets), pad grid as grey squares, dark field outside | not stated |
| ectc51906.2022.00176-f02 | bond-tool IR of a fiducial: raw (low contrast, noisy, blurred) vs. contrast-enhanced vs. binarized | not stated |
| ectc51687.2025.00049-f09 (non-HB) | IR through a Si bridge: dark field, blurry bright cross centered among substrate squares | 20 um bar (crop) |

### Visual vocabulary checklist (IR microscope)

- Greyscale, low resolution: features soft (Si is transparent beyond ~1.1 um wavelength; diffraction blur at that
  wavelength, textbook). Edges blurred 3-6 px at the chosen scale.
- Two looks in the refs: transmission-like high-key (metal marks dark on a bright field, ectc51909.2023.00023-f07) and
  reflection-like (metal marks bright on grey/dark, ectc51529.2024.00106-f05/f06). Pick one.
- Two superimposed layers: top-die marks and bottom-wafer marks overlap with a small offset; verniers show it as a
  shift of the coincident tick pair.
- Low contrast, mild sensor noise (static), vignetting, slight haze.
- Interference fringes (Newton-type rings at gaps / voids): not seen in the atlas crops; omit or keep very faint.

### Facts

| Fact | Value | Source |
|---|---|---|
| Fiducials | concentric annuli on all die corners of component die and substrate sites | ectc51909.2023.00023 p.2 Sec. II.C |
| Verniers | 0.25 um resolution (corner), 0.1 um (horizontal and vertical verniers) | ectc51909.2023.00023 p.2 Sec. II.C |
| Measurement | IR images of each bonded die; vernier readings on all four corners | ectc51909.2023.00023 p.3 |
| Bonder spec / connectivity limit | +/-3 um (3 sigma); misalignment < 2.8 um (80 % of the 3.5 um pad) needed | ectc51909.2023.00023 p.2, p.3 |
| D2W overlay example | |mean| + 3 sigma: 0.899 um X, 1.104 um Y | ectc51846.2026.00218-a-i1; f06(c) |
| W2W IR overlay | max 80 nm, 3 sigma 64 nm (EVG IR tool) | ectc51529.2024.00334 p.3; f08(a) |
| Vernier tick pitch, mark diameters | not found | - |

### Composition

- Scale about 4 px/um (frame = 480 x 270 um of the die corner region); a 1 um misalignment = 4 px, readable in the
  vernier as a tick mismatch.
- Bottom die edge (seal ring as a bright double line) on y = 600, with the 45 deg chamfer at one frame side
  (x < 300 or x > 1620). Below 600: the target wafer seen through, darker and featureless.
- Annulus fiducial with crosshair and both vernier combs placed at x < 560 or x > 1360 (e.g. fiducial centered near
  x = 300, y = 330, combs along it). Band x 560-1360, y 500-592: plain Si.
- Optional: faint pad grid above y ~ 420, at very low contrast.

---

## 5. CSAM / SAM acoustic scan: bond void map

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51909.2023.00219-f06 | CoW SAM after anneal on a bright wafer disc: large dark chips; left (before optimization) chips full of bright round voids of many sizes and one large edge void; right void-free; dashed reticle grid (overlay, omit) | chips > 400 mm2 |
| ectc51909.2023.00023-f05 | bonded 200 mm wafer, dark grey die grid with lighter streets; edge partial dies bright (unbonded), three small bright voids; dark background, two small round features on the rim (unexplained in caption) | 8 x 12 mm dies, 200 mm |
| ectc51687.2025.00323-f05 | 200 mm WoW populated with CoW chips: black chip block with thin street lines, grey textured base wafer around, bright thin ring at the wafer edge | 200 mm |
| ectc51909.2023.00008-f01 | W2W 0.4 um pitch pair: black wafer, bright edge ring; (a) bright round non-bond spots near the edge, (b) clean | 0.4 um pitch (ectc51909.2023.00008-a-i1) |
| ectc51529.2024.00125-f01 | SoIC W2W pair: (a) ragged bright unbonded band around the edge with a staircase inner boundary, (b) uniform; faint horizontal raster bands across the wafer | not stated |
| ectc51906.2022.00113-f06 | whole-wafer CSAM: faint die grid, thin bright outline, notch at the bottom, small bright voids near the edge (inset) | not stated |
| ectc51846.2026.00218-f06 | (b) binarized SAM die map: black dies on flat green with a few white defect pixels; the only non-grey map in the atlas | 158 dies, 300 mm |

### Visual vocabulary checklist (C-mode SAM)

- Greyscale LUT in every HB reference (no false color); bonded = dark, non-bond / void = bright (stated by
  ectc51846.2026.00218 p.3: "Dark pixels denote good bonding quality, whereas white pixels indicate a defect").
- Voids: bright round or elliptical spots with crisp edges, sizes from a few px to ~10 % of a die; clustering near the
  wafer / die edge (ectc51909.2023.00008-f01a, ectc51906.2022.00113-f06, ectc51909.2023.00023-f05).
- Edge: thin bright ring at the wafer rim (edge non-bond / bevel); in bad cases a ragged unbonded band
  (ectc51529.2024.00125-f01a).
- Streets without pads read lighter (systematic street voids in W2W, ectc51529.2024.00128-f05 / p.5).
- Raster artifacts: faint horizontal bands from the scan (ectc51529.2024.00125-f01), static.
- Gate artifacts (bright outline where the gate catches the die edge) seen as bright die outlines in
  ectc51906.2022.00031-f08b; optional.
- Pixelated: SAM resolution is coarse; slight blockiness at die-level zoom.

### Facts

| Fact | Value | Source |
|---|---|---|
| Polarity | dark = good bond, white = defect | ectc51846.2026.00218 p.3 |
| Voided dies | voids on 1.7 % of bonded dies (lot 3); 1-4 % voiding in fine-pitch lots; small die-edge voids | ectc51909.2023.00023 p.4 Sec. IV.C |
| Large-chip CoW | > 400 mm2 chips; before optimization 9 of 50 void-free, after 52 of 52 | ectc51909.2023.00219 p.1, f06 (atlas shows) |
| Bond wave | longer bonding-wave propagation distance for large chips raises void risk | ectc51909.2023.00219 p.2 |
| Edge voids | can come from die edge damage or bond wave propagation | ectc51906.2022.00031 p.7 |
| Void diameters, transducer frequency | not found | - |

### Composition (die-level CoW, recommended)

- 40 px/mm; 8 x 12 mm dies (ectc51909.2023.00023) = 320 x 480 px; or > 400 mm2 square chips (20 x 20 mm = 800 px, too
  big for a row; use the 8 x 12 mm die).
- One row of dark bonded dies with their bottom edges on y = 600, dies above (y 120-600), thin lighter streets
  between them; base wafer below y = 600 lighter grey, slightly textured (ectc51687.2025.00323-f05 look).
- Voids: 2-4 bright round spots, all outside the band (y < 480 or outside x 560-1360), more toward one side to imply
  the wave end; one larger void touching a die edge at the frame side.
- Optional: wafer rim as a bright arc in an upper corner.
- Alternative (full W2W wafer): wafer disc with its lowest point tangent to y = 600; then the bright rim crosses the
  band near x 800-1120, which conflicts with "calm"; prefer the die-level view.

---

## 6. EBSD / PED orientation map: Cu grains in pads after anneal

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51687.2025.00071-f04 (non-HB, TSV) | IPF maps on black (non-indexed) background: before anneal fine blocky grains with visible square step pixels; after anneal larger polygonal grains, straight twin lamellae, thin dark grain-boundary lines, a few black non-indexed specks | 4 um bar (caption) |
| tcpmt.2026.3708099-f04 (non-HB, TSV) | dense IPF maps, very fine grains, grey for voids / unindexed, green phase for surrounding material | not stated |
| ectc51846.2026.00130-f06 | PED maps of bonded vias (cross-section): mostly blue (111) large grains spanning top and bottom pads, a few red / green / pink twinned grains, horizontal banding artifacts | 100 nm bars; 0.45 um pitch TV |
| ectc51846.2026.00024-f07 | TEM-PED map of a 3 um pad (cross-section): many small grains, all IPF colors, pixel-noise edge band where indexing fails | 0.3 um bar (crop) |
| ectc51846.2026.00187-f03 | (d) IPF key triangle, (e) PED map with large cyan / red / green grains, (f) boundary-only map | 500 nm pitch pair |
| ectc51846.2026.00024-f01 | (b) EBSD grain map across a C2W interface colored by grain (green / yellow / orange / red), 2 um bar | 3 um pads |

### Visual vocabulary checklist (orientation map)

- IPF color key (cubic, IPF-Z): <001> red, <101> green, <111> blue, mixtures in between (key triangles in
  ectc51687.2025.00071-f04, ectc51846.2026.00187-f03). Do not draw the key (it carries labels).
- Grains: equiaxed polygons in plan view, flat color per grain with a slight within-grain gradient; annealing twins as
  straight parallel bands of a second color crossing a grain.
- Thin dark grain-boundary lines (1-2 px).
- Non-indexed points: black or white specks, denser at grain boundaries and along the pad rim; dielectric is entirely
  non-indexed (black).
- Step-size pixelation: visible square pixels (blocky edges), static.
- Texture: HB pads often show strong (111) preference (mostly blue) after anneal (ectc51846.2026.00130 p.3 reports
  large (111) grains at failed sites); a mixed palette reads more like "EBSD" at 0.25 s. The IPF reference direction
  of these maps is not stated in the text (not found).

### Facts

| Fact | Value | Source |
|---|---|---|
| Pad / pitch | 3 um pad, 6 um pitch, C2W and W2W, 300 mm | ectc51846.2026.00024-a-i1, -b-i1 |
| As-plated grain size in 3 um pad | 79 +/- 74 nm (N = 281, 34-8288 nm) | ectc51846.2026.00024 p.3; f07 |
| After < 220 C bond anneal | average ~400 nm near the bond interface | ectc51846.2026.00024 p.5 |
| Mapping method | TEM-PED (ASTAR), 5 nm step, ~2 nm beam | ectc51846.2026.00024 p.2-3 |
| Fine-grain Cu | 42 and 47 nm average after 10 and 30 days | ectc51846.2026.00187 p.4 |
| Failed-link signature | large (111) grains on top and bottom pads | ectc51846.2026.00130 p.3; f06 |
| Plan-view orientation map of HB pads | not found (all HB maps are cross-sections; the plan view is a constructed composition) | - |

### Composition

- 40 px/um: pitch 240 px, pad 120 px discs, grains ~400 nm = 16 px (7-8 grains across a pad), some twins.
- Lowest pad row bottoms at y = 500; y = 600 = bottom edge of the mapped field (next row would start at y = 620).
  Below 600: unmapped, flat dark grey (or the matching SE image in grey). Dielectric between pads: black
  (non-indexed) with sparse noise.
- Mixed IPF colors with a blue bias (strong but not total (111)).

---

## 7. Plan-view TEM: substitute with high-mag SEM of a single pad edge

Plan-view TEM / STEM of HB pads: not found (no figure in `figures.csv`, no "plan-view TEM / STEM" in any cached text).
The atlas TEM references are all cross-sections, and their vocabulary (bend contours, twin bands, thickness fringes)
is already used by l7a (`scenes/l7a_hb04_tem.notes.md`). Recommended substitute: high-magnification top-view SEM of
one bond pad edge: it shows what the TEM shot was meant to show (single pad, grain texture, barrier / edge ring) and
has real references. Fallback if the owner keeps TEM: use ectc51846.2026.00187-f03 (a-c) for bright-field diffraction
contrast (dark and light grains, straight twin bands, mottled bend contours) and accept the l7a overlap.

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51529.2024.00021-f04 | high-mag SE image across a Cu pad edge: granular Cu surface texture, a dark dissolution gap with a bright lip along the edge (a), no gap (b), dielectric with a different, finer texture | 1 um bar (crop); HBM HCB TV |
| ectc51687.2025.00060-f08 | top row: single 1 / 3 / 5 um pads: 1 um pad dark with a bright crescent (charging / edge), 3 um pad with visible grain texture, 5 um pad with a bright ring at its edge | 1, 3, 5 um pads |
| tcpmt.2025.3628798-f21 (non-HB) | right column: single pad at high mag: faint grain boundaries and scratch lines on the pad top, soft shading around | 2-7 um diameter |
| ectc51906.2022.00057-f06 | SEM insets of pad surfaces after wet processes: rough vs. smooth Cu | Cu protrusion -2.1 to +1.3 nm (caption) |
| ectc51846.2026.00183-f04 | Ta EDS map: thin barrier liner outlining each pad and via (cross-section) for the barrier ring idea | 200 nm bars; 0.4 um pitch |

### Visual vocabulary checklist (SE, high mag)

- Grey, low noise, slight blur at the highest mag; very subtle grain contrast on CMP'd Cu (faint polygons, a few
  twin lines), finer and flatter dielectric speckle.
- Pad edge: bright 4-10 px edge line (edge effect), optionally a narrow dark gap just inside it (dissolution gap,
  ectc51529.2024.00021-f04a); the barrier liner itself is too thin to resolve as a material band in SE (barrier
  thickness not found in the atlas).
- Mild charging gradient on the dielectric side.

### Facts

| Fact | Value | Source |
|---|---|---|
| Pad | one 0.32 um square pad of the 0.64 um lattice | (derived) ectc51529.2024.00128-a-i1, p.3 |
| Grain size | not found for that TV; nearest atlas values: FG Cu 42-47 nm (ectc51846.2026.00187 p.4), as-plated 79 +/- 74 nm in 3 um pads (ectc51846.2026.00024 p.3) | different TVs, flag in notes |
| Barrier | ALD TaN / PVD TaN or PVD TaN/Ta (450 nm pitch TVs) | ectc51846.2026.00130-a, -b (tv names); f06 caption |
| Edge gap | dissolution gap at pad edge after high-CO2 DI rinse, none with low-CO2 rinse | ectc51529.2024.00021-f04 caption |

### Composition

- 2400 px/um: the pad is 768 x 768 px, x 576-1344, bottom edge on y = 600 (top off-frame at y = -168). Neighbors
  (pitch 1536 px) fall outside the frame; dielectric left, right and below.
- The band y 500-592 lies inside the pad: keep grain contrast there very low (consistent with weak SE grain contrast
  on polished Cu); stronger texture in the upper part of the pad.
- Grains ~45-80 nm = 110-190 px.

---

## 8. Wafer-level map: bonded 300 mm wafer, die grid

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51529.2024.00334-f05 | pass / fail wafer maps: flat green (pass) and dark red (fail) cells on a staircase-circle die layout, thin light grid lines, no wafer outline; fails cluster toward the edge as the chain length grows | 300 nm pitch, 300 mm |
| ectc51909.2023.00023-f08 | (a) die map: light green cells (numbers inside, omit), thin grid, wafer circle outline with a notch at the top, partial edge dies excluded | 200 mm |
| ectc51846.2026.00187-f08 / ectc51846.2026.00130-f07 / ectc51529.2024.00334-f08 | IR overlay vector maps: grey wafer circle, center axis cross, square sites colored by a jet LUT (blue low to red high), short black arrows | 300 mm; color scale to 0.150 / 0.100 um (crop) |
| ectc51909.2023.00178-f03 | interpolated contour map of Cu dishing over the wafer (green-yellow-blue), black dots at measurement sites | not stated |
| ectc51846.2026.00218-f06 | (a) photo of a 300 mm wafer with 158 placed dies: pink-magenta interference sheen, blue-teal dies, reflections | 300 mm, 6 x 6 mm dies |

### Visual vocabulary checklist (metrology wafer map)

- Flat UI rendering: solid cell fills, 1 px light grid lines, thin grey wafer outline, notch (top or bottom in the
  refs: ectc51909.2023.00023-f08 top, ectc51906.2022.00113-f06 and ectc51529.2024.00334-f08b bottom).
- Staircase boundary: only full dies inside the usable radius; the ring between the staircase and the outline is empty.
- Pass green / fail dark red (yield) or jet LUT dots + arrows (overlay); no text, no colorbar.
- Optional photo variant: specular sheen and thin-film colors (ectc51846.2026.00218-f06a).

### Facts

| Fact | Value | Source |
|---|---|---|
| Wafer | 300 mm W2W, Cu/SiCN, 300 nm and 500 nm pitch | ectc51529.2024.00334-a-i1, -a-i2 |
| Reticles tested | all 138 reticles across the wafer | ectc51529.2024.00334 p.2 |
| Yield at 300 nm pitch | 3k links 100 %, 660k 79 %, 5.5M 49 % | ectc51529.2024.00334-f05 (caption table, atlas shows) |
| Reticle field | about 26 x 33 mm (WLI map axes) | ectc51909.2023.00008-f05 (atlas shows) |
| D2W alternative | 158 dies of 6 x 6 mm on a 300 mm wafer, 90 % defect-free (SAM) | ectc51846.2026.00218-a; p.2-3 |
| Overlay alternative | 95 % of sites < 50 nm, max 62 nm | ectc51846.2026.00187-f08; p.1, p.4 |
| Edge exclusion width, notch dimensions | not found | - |

### Composition

- 2 px/mm: wafer 600 px across; reticle cells 26 x 33 mm = 52 x 66 px (138 cells fit a 300 mm staircase).
- Bottom row of full cells: bottom edges on y = 600 (the staircase's lowest row, spanning roughly x 800-1120); the
  wafer outline arc dips just below (lowest point ~ y 615-640, the empty edge zone); notch at the bottom of the arc.
  Wafer center about (960, 330); the top of the wafer near y 30.
- Fail cells (dark red) mostly near the rim and outside the band; cells inside x 560-1360, y 500-592 are flat green
  (calm). Use the 660k-link map proportion (79 % pass) as the target.
- Alternative: the D2W placement grid (158 dies of 6 x 6 mm = 12 x 12 px at 2 px/mm) as a sparse dot grid; less
  legible at 0.25 s.

---

## Gaps and recommendations

- Keep 1-6 and 8. Replace 7 (plan-view TEM, not in the atlas, overlaps l7a) with the high-mag SEM single-pad edge.
- Optional swap for variety: replace 8's pass/fail map with the IR overlay vector map (jet-colored sites + arrows,
  ectc51846.2026.00187-f08) if a stronger color accent is wanted; facts: 95 % < 50 nm, max 62 nm.
- Not found in the atlas: DIC images; false-color CSAM LUTs; plan-view EBSD / PED of HB pads; plan-view TEM; SAM
  transducer frequency; void diameters; vernier tick pitch; IR mark sizes; edge-exclusion width; notch size; seal-ring
  width; dicing street width; pad CD of the 0.45 um TV (ectc51846.2026.00130).
- Derived numbers to declare in scene notes: 0.32 um pad side (25 % density at 0.64 um pitch); AFM pad CD ~ half pitch
  (crop estimate); per-shot screen scales above are compositional choices.

## Figures viewed (fig_id only)

ectc51909.2023.00179-f07, ectc51529.2024.00106-f05, ectc51529.2024.00106-f06, ectc51529.2024.00106-f07,
ectc51529.2024.00106-f08, iedm45625.2022.10019499-f11, 001c.129764-f05, ectc51529.2024.00128-f03,
ectc51529.2024.00128-f04, ectc51529.2024.00128-f05, ectc51529.2024.00128-f06, ectc51909.2023.00023-f05,
ectc51909.2023.00023-f06, ectc51909.2023.00023-f07, ectc51909.2023.00023-f08, ectc51529.2024.00021-f04,
tcpmt.2025.3628798-f21, ectc51687.2025.00060-f08, ectc51846.2026.00130-f05, ectc51846.2026.00130-f06,
ectc51846.2026.00130-f07, ectc51846.2026.00130-f08, ectc51846.2026.00024-f01, ectc51846.2026.00024-f07,
ectc51846.2026.00024-f10, iedm45625.2022.10019499-f12, ectc51529.2024.00017-f05, ectc51909.2023.00240-f01,
ectc51906.2022.00176-f02, ectc51687.2025.00049-f09, ectc51906.2022.00240-f06, ectc51909.2023.00008-f01,
ectc51909.2023.00008-f05, ectc51529.2024.00125-f01, ectc51906.2022.00113-f06, ectc51906.2022.00113-f07,
ectc51529.2024.00334-f04, ectc51529.2024.00334-f05, ectc51529.2024.00334-f08, ectc51846.2026.00218-f06,
ectc51687.2025.00323-f05, ectc51909.2023.00219-f02, ectc51909.2023.00219-f06, ectc51909.2023.00219-f07,
ectc51687.2025.00071-f04, tcpmt.2026.3708099-f04, ectc51909.2023.00331-f03, ectc51846.2026.00183-f04,
ectc51846.2026.00187-f03, ectc51846.2026.00187-f08, ectc.2019.00095-f03, ectc51909.2023.00178-f03,
ectc51906.2022.00031-f08, ectc51909.2023.00190-f05, ectc51906.2022.00057-f06.
