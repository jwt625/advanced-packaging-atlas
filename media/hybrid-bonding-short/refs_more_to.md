# "more to" reference sheet: 16-shot top-view ladder (DevLog-015)

Date: 2026-10-22. Scope: the 16 cuts under the overlay words "more to" (shots m01-m16, 0.25 beat = 0.125 s each,
3-4 frames). Scope correction (owner, 2026-10-22): 8 NEW single-view scenes (`m1.html` ... `m8.html`, no `v` param)
interleaved with the 8 existing pass-C second views (`c1_optical` ... `c8_wafermap` with `v=2`), ordered by
characteristic feature size from large to small, so the section reads as a fast top-view ladder of the whole technology
that ends at the hybrid-bond pad. Builders read this with `STYLE.md` and `refs_passC.md` (same format).

Crops under `references/<paper_id>/figures/key/<fig_id>.png` are licensed, local-only visual references: look, never
trace, embed or reproduce a figure's composition. This sheet holds fig_ids and descriptions only.

Method: `data/figures.csv` (kinds package_photo, xray_csam, micrograph, top_view_layout; 885 with key crops) searched by
caption / shows for panel, wafer, package, HBM, BGA, ball, C4, X-ray, TGV, TSV, pillar, stud, bump, bridge, EMIB,
Si-IF, RDL, L/S; joined to `test_vehicles.csv`, `interconnects.csv`, `components.csv`; about 45 crops viewed; cached
`text.md` read for numbers. Conventions as in refs_passC.md: "(crop)" = read off a figure by eye, approximate;
"(derived)" = arithmetic on sourced numbers; "(chosen)" = composition choice, not a fact; "not found" = searched,
absent. Page numbers are the `<!-- page N -->` markers in `text.md`.

## The 16-shot order

Ordering key: the featured pitch of the array, or the object size for the shots that show a whole carrier, package or
die row. Frames / beats are the current `edit.json` values (unchanged). Reused c* views keep their own `meta.text`.

| Shot | Scene | Params | Frames | Item | Modality | Featured scale (source) | Field of view |
|---|---|---|---|---|---|---|---|
| m01 | `m1.html` | `{"text": "more to"}` | 3 | 510 x 515 mm glass-core substrate panel, 6 x 6 units | photo | panel 510 x 515 mm (ectc51846.2026.00134 p.3) | ~800 mm (2.4 px/mm) |
| m02 | `c8_wafermap.html` | `{"v": "2", "text": "more to"}` | 3 | 300 mm W2W wafer, IR overlay vector map | metrology map | 20 x 20 mm fields, 300 mm wafer | ~910 mm (2.1 px/mm) |
| m03 | `m2.html` | `{"text": "more to"}` | 3 | 50 x 50 mm package, 2 SoC + 8 HBM on embedded glass interposer | photo | SoC 19 x 20 mm, HBM 7.7 x 5.5 mm (ectc51906.2022.00180-b) | 96 mm (20 px/mm) |
| m04 | `c5_csam.html` | `{"v": "2", "text": "more to"}` | 4 | row of D2W-bonded 8 x 12 mm dies | CSAM | 8 x 12 mm dies | 48 mm (40 px/mm) |
| m05 | `m3.html` | `{"text": "more to"}` | 3 | BGA ball array, package underside | macro photo | 1.0 mm pitch, 600 um SAC305 (ectc51909.2023.00155-a-i4) | 13.7 mm (140 px/mm) |
| m06 | `m4.html` | `{"text": "more to"}` | 3 | C4 joints under the CoW corner | 2D X-ray | 150 um pitch (ectc51906.2022.00008-a-i3) | 1.92 mm (1 px/um) |
| m07 | `m5.html` | `{"text": "more to"}` | 3 | through-glass via array (etched, open) | optical microscope | 75 um pitch, 49.49 um holes (ectc51529.2024.00092-a-i1) | 640 um (3 px/um) |
| m08 | `m6.html` | `{"text": "more to"}` | 3 | Cu stud array at a chiplet die edge | tilted SEM | 20 x 30 um pitch, 12 um studs (ectc51909.2023.00053-a-i1) | 240 um (8 px/um) |
| m09 | `m7.html` | `{"text": "more to"}` | 3 | two dielets on Si-IF, 59 um gap with fine-pitch links | optical microscope | 9.8 um pillar pitch, 4 um wire pitch (ectc51906.2022.00332-b-i1) | 480 um (4 px/um) |
| m10 | `c4_ir.html` | `{"v": "2", "text": "more to"}` | 3 | bonded die edge with 0.1 um vernier | IR transmission | 0.1 um vernier resolution, die edge | 120 um (16 px/um) |
| m11 | `c1_optical.html` | `{"v": "2", "text": "more to"}` | 3 | HB edge daisy chain at the die edge | optical brightfield | 7 um pitch, 3.5 um pads | 384 um (5 px/um) |
| m12 | `c3_afm.html` | `{"v": "2", "text": "more to"}` | 3 | HB pad array, recess map | AFM | 6 um pitch, 3 um pads | 48 um (40 px/um) |
| m13 | `c6_ebsd.html` | `{"v": "2", "text": "more to"}` | 4 | HB pads after anneal, grain map | EBSD / PED (constructed plan view) | 6 um pitch, ~400 nm grains | 48 um (40 px/um) |
| m14 | `m8.html` | `{"text": "more to"}` | 3 | 2 um line / 2 um space Cu RDL | optical microscope | 4 um line pitch (ectc51909.2023.00298 p.3) | 64 um (30 px/um) |
| m15 | `c2_sem.html` | `{"v": "2", "text": "more to"}` | 3 | sub-um HB pad openings, 20 deg tilt | SEM (SE) | 0.33 x 0.4 um lattice | 3.0 um (636 px/um) |
| m16 | `c7_sem_pad.html` | `{"v": "2", "text": "more to"}` | 3 | one 0.32 um HB pad | SEM (BSE) | 0.32 um pad | 0.53 um (3600 px/um) |

Copy-paste block for `edit.json` (replaces the current m01-m16 lines; frames and beats unchanged):

```json
    {"id": "m01", "scene": "m1.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m02", "scene": "c8_wafermap.html", "frames": 3, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
    {"id": "m03", "scene": "m2.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m04", "scene": "c5_csam.html", "frames": 4, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
    {"id": "m05", "scene": "m3.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m06", "scene": "m4.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m07", "scene": "m5.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m08", "scene": "m6.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m09", "scene": "m7.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m10", "scene": "c4_ir.html", "frames": 3, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
    {"id": "m11", "scene": "c1_optical.html", "frames": 3, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
    {"id": "m12", "scene": "c3_afm.html", "frames": 3, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
    {"id": "m13", "scene": "c6_ebsd.html", "frames": 4, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
    {"id": "m14", "scene": "m8.html", "frames": 3, "beats": 0.25, "params": {"text": "more to"}},
    {"id": "m15", "scene": "c2_sem.html", "frames": 3, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
    {"id": "m16", "scene": "c7_sem_pad.html", "frames": 3, "beats": 0.25, "params": {"v": "2", "text": "more to"}},
```

Order notes:

- Monotonic in featured scale except two deliberate swaps: c4 v2 (m10, no array pitch; its scale is the 120 um field
  and a 0.1 um vernier) sits before c1 v2 (m11, 7 um pitch, 384 um field), so that m09 (two dielets across a dark
  gap) and m11 (die edge with a dark kerf band) are not back to back; and m01 (510 mm panel) precedes m02 (300 mm
  wafer) by object size although the c8 v2 frame is wider.
- Colour rhythm (no two greys of the same modality adjacent): green/gold photo, jet blue map, teal photo, grey CSAM,
  silver-on-green photo, light-grey X-ray, blue-grey optical, grey SEM, tan/gold optical, grey IR, olive optical, gold
  AFM, RGB IPF on black, copper on black, grey SE, grey BSE. The last two are both grey SEM; they differ in content
  (dark tilted openings lattice vs one large bright pad) and are the natural end of the ladder.
- Only the hybrid-bond scale is carried by reused views (m10-m13, m15-m16); m14 (RDL) is the one new item inside it.
- `c8_wafermap` v2 and `c5_csam` v2 are not hybrid-bond-pitch shots, but they are the wafer and die rungs of the same
  ladder; reusing them saves two new builds (panel and package remain new).

## Global composition rule for m1-m8

- Top view (m6 is a top-down SEM with tilt, as the reference). One view per file; no `v` param.
- y = 600 is a physical edge of the object that carries the array, array (or object) above it.
- Text band x 560-1360, y 500-592: calm (no array features, low contrast). Per scene below.
- 0.125 s = 3-4 frames: a static image reads best. `render(t)` must still be valid for t in [0, 3] s; at most a slow
  horizontal drift (<= 28 px/s, the pass-A pan) or nothing. No per-frame noise; seed all grain once.
- No text: every reference crop carries labels, scale bars, SEM info bars, arrows, panel letters, silkscreen; omit all.
- Bold: the featured pitch is drawn large (60-240 px on screen) so the array reads in 3 frames; high global contrast
  outside the band.

---

## m1. Glass-core substrate panel, 510 x 515 mm (photo)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51846.2026.00134-f06 | the hero look: square panel on a blue chuck/table; dark green build-up/solder-resist surface; 6 x 6 units, each a portrait light-gold pad field with fine horizontal striations; thin dark grid lines between units; a bright pale rim (edge band) around the panel; a few small bright marks along the vertical centre line | 510 x 515 mm (caption) |
| ectc51846.2026.00198-f02 | 510 x 515 mm glass panel on chuck after exposure, 4 x 4 shot grid: alternative glass look (transparent, greenish edges) | 510 x 515 mm |
| ectc32696.2021.00174-f06 | 600 x 600 mm reconstituted FO panel under yellow light, four quadrants: alternative (yellow cleanroom cast) | 600 x 600 mm |

### Visual vocabulary checklist (panel photo)

- Large flat dielectric surface with a soft specular gradient (overhead light), slight colour shift across the panel.
- Unit grid: repeated identical sites in rows and columns; pad fields lighter (Cu / surface finish) than the dark
  green dielectric; thin darker saw streets.
- Panel rim: a narrow bright edge band and a hard outline against the darker table.
- Background: the chuck / table, blue-grey, out of the panel's plane, slightly darker.
- Photo softness: 1-2 px blur, mild vignette; no text, no fiducial labels.

### Facts

| Fact | Value | Source |
|---|---|---|
| Panel | 24-layer (10-2-10) glass core substrate panel, 510 x 515 mm | ectc51846.2026.00134-a; text p.3 Fig. 5 caption |
| Units | 6 x 6 array on the panel | ectc51846.2026.00134-f06 (atlas shows; crop count) |
| Unit content | singulated unit carries 2 embedded bridges (EMIB) | ectc51846.2026.00134 p.4 Fig. 8 caption; tv -a name |
| TGV | Cu-filled; diameter, pitch, depth, count not reported | ectc51846.2026.00134-a-i1 |
| Unit size / pitch, pad-field size, border width | not found. Crop estimates: unit pitch ~72 mm, pad field ~33 x 47 mm, pad-field bottom to panel edge ~70 mm | ectc51846.2026.00134-f06 (crop) |
| Glass core thickness | not found | - |

### Composition

- 2.4 px/mm (chosen): panel 1224 px wide (x 348-1572), bottom edge on y = 600, top off-frame; about 3.4 unit rows
  visible above the edge; both bottom corners in frame.
- Units at the crop-estimate pitch ~72 mm = 173 px; pad fields ~80 x 113 px; lowest pad-field row bottom at
  y = 600 - 70 x 2.4 = 432. Band y 500-592: plain dark green dielectric (calm); `meta.text = 'light'`.
- Panel rim glint on y 592-600 (below the band), hard outline at 600. Below 600 and left / right of the panel: blue-grey
  table, darker, slightly defocused.
- Must read in 3 frames as "a big sheet of many packages": keep the gold pad fields bright, the grid regular.

---

## m2. Package top: 2 SoC + 8 HBM on a 50 x 50 mm embedded-glass-interposer package (photo)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51906.2022.00180-f06 | (b) assembled package: teal solder-resist surface, two large dark SoC dies stacked vertically, four HBM dies each side, amber CUF fillets, brown routing regions between SoC and HBM, columns of small pads at the left and right edges; (a) the bare substrate top with pad fields | 50 x 50 mm (caption) |
| ectc51906.2022.00180-f09 | floorplan (positions only): SoC 19 x 20 mm x 2, HBM 5.5 mm wide, glass core / build-up / ball stack | 50 x 50 mm |
| ectc51906.2022.00008-f02 | (a) CoWoS-R+ 55 x 55 mm: true top-down photo look: light outer frame, dark recessed molded area, two HBM and the split SoC as flat specular grey blocks | 55 x 55 mm |
| ectc51846.2026.00365-f02 | (a) EMIB > 5X reticle package: very clean top-down photo, gold underfill border, central tiles, HBM columns at the sides | 85 x 110 mm (tv -h) |

Package choice: ectc51906.2022.00180-b, because every die and the package are dimensioned in the atlas. CoWoS-R+
(ectc51906.2022.00008-a) is the CoWoS-class alternative, but its die sizes are not in the atlas (text p.2 gives only
generic HBM2E / HBM3 package widths of 10 / 11 mm, not this package's dies).

### Visual vocabulary checklist (package photo)

- Die backsides: flat, near-mirror Si, mid-dark grey with a soft diagonal specular gradient and faint grinding texture.
- Underfill: a narrow amber, translucent fillet ring around each die (fillet width not found; 0.5 mm chosen).
- Substrate top: teal / green solder resist with a faint orange-peel texture; small bright Cu pad columns near the
  left and right edges (crop).
- Package edge: crisp straight edge with a thin lighter edge band (laminate side), then the dark backdrop.
- No silkscreen, logos or labels (the real package has text; omit).

### Facts

| Fact | Value | Source |
|---|---|---|
| Package / interposer | 50 x 50 mm embedded glass interposer, 260 um | ectc51906.2022.00180-b-c4; p.5 Sec. IV, Fig. 9 |
| SoC emulators | 2 x 19 x 20 mm, 775 um | ectc51906.2022.00180-b-c1; p.3 Sec. III-A-1, p.5 Fig. 8(a) |
| HBM emulators | 8 x 7.7 x 5.5 mm, 775 um | ectc51906.2022.00180-b-c2; p.5 Fig. 8(c) |
| Embedded dies | 4 x 7.2 x 7.2 mm, 100 um, under the surface between SoC and HBM | ectc51906.2022.00180-b-c3 |
| Microbump pitches | 35 um D2D, 55 um HBM I/O, 150 um SoC P/G | ectc51906.2022.00180-b-i1..i3 |
| BGA | 650 um balls at 800 um pitch | ectc51906.2022.00180-b-i7; p.5 Fig. 9 |
| Underfill | capillary underfill (CUF) | ectc51906.2022.00180-b-c6 |
| Die positions | SoC gap ~1.1 mm; SoC-2 bottom ~7.6 mm above the package edge; lowest HBM bottom ~8 mm above the edge; HBM inner edge ~3.5 mm from the SoC | ectc51906.2022.00180-f09 (crop) |

### Composition

- 20 px/mm (chosen): package x 460-1460, bottom edge on y = 600, top off-frame (y = -400).
- SoC-2 (380 x 400 px) centred: x 770-1150, y 48-448; SoC-1 visible as a sliver above y = 26.
- HBMs 110 x 154 px (5.5 x 7.7 mm, portrait), two per side visible: inner edge 70 px from the SoC, lowest bottom
  at y = 440.
- Band y 500-592: teal surface below SoC-2, no pads; edge pad columns only at x < 560 and x > 1360.
  `meta.text = 'light'` (keep the teal dark enough, luminance below ~0.35).
- Below 600: dark neutral backdrop.

---

## m3. BGA ball array, package underside (macro photo)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51909.2023.00155-f13 | middle: full underside, very dense uniform silver array edge to edge on a light field; right zoom: reflowed SAC305 balls, bright white specular core with a dimpled / mottled surface, grey rim, on dark teal solder resist | 1.0 mm pitch (text Table 3) |
| ectc51909.2023.00155-f15 | bottom-side zoom before ball attach: gold Cu pads in round SR openings on teal, pads stop about one pitch from the edge | 1.0 mm pitch |
| ectc51846.2026.00008-f08 | optical top views of backside ball arrays after ball mount (alternative look) | not stated |
| tcpmt.2025.3614186-f02 | X-ray of a 1 mm-pitch BGA under a 100 x 100 mm glass substrate (not used: m06 is the X-ray shot) | 1.0 mm, 580 um |

### Visual vocabulary checklist (BGA macro photo)

- Spheres under ring / coaxial light: a bright specular core slightly off-centre, a darker grey annulus, a thin dark
  outline where the sphere meets the SR; reflowed SAC305 has a slightly dimpled, matte-and-shiny mottled surface
  (some balls show dark spots in the crop).
- Solder resist: dark teal-green, smooth, with faint lighter reflections between balls.
- Perfectly regular square grid; tiny per-ball variation in highlight position and size (+/- 2 %).
- Substrate edge: straight, slightly lighter laminate side band.

### Facts

| Fact | Value | Source |
|---|---|---|
| BGA | SAC305, 600 um balls, 1.0 mm pitch | ectc51909.2023.00155-a-i4; text p.2 Table 3 |
| Substrate | 100 x 100 mm, 1.6 mm, 4/2/4 build-up, 1.3 mm core | ectc51909.2023.00155 p.2 Table 3 |
| Bottom SR | opening 500 um, thickness 18 um | ectc51909.2023.00155 p.2 Table 3 |
| After board mount | ball height 478 um, standoff 444 um; board pad 400 um NSMD | ectc51909.2023.00155-a-i4 notes; p.7 Sec. III.G |
| Edge distance of the outer ball row | not found; ~1 pitch (crop of f15 bottom zoom) | - |
| Ball count | not found | - |

### Composition

- 140 px/mm (chosen): pitch 140 px, ball 84 px; 14 columns, one column centred on x = 960 (balls above the word
  band, none in it).
- Lowest ball row centred at y = 458 (ball bottoms at 500); substrate edge on y = 600 (edge distance 1.0 mm = 1 pitch,
  crop estimate). Rows at 458, 318, 178, 38.
- Band y 500-592: plain dark teal SR. `meta.text = 'light'`.
- Below 600: laminate side band (a few px) then a black backdrop.

---

## m4. C4 joints at the CoW corner (2D X-ray)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51906.2022.00008-f03 | four corner X-rays of a CoWoS-R+ package: light-grey field; dark discs and dark rings with lighter cores; denser small dark dots; faint grey orthogonal and diagonal routing shadows; a bright diagonal line at the die corner | C4 150 um nominal (text p.4) |
| ectc32696.2021.00033-f04 | InFO_oS corner X-rays: the "C4 bump" label points to a dark ring with a lighter core; dense small dark dots between; a bright diagonal edge line | C4 130 um (ic -a-i4) |

### Visual vocabulary checklist (2D transmission X-ray)

- Greyscale, inverted from optical: high-Z solder (Sn-Ag) absorbs, so joints are dark; low-Z polymer is light.
- C4 joint: dark disc or ring with a lighter centre (Cu core under solder reads lighter than solder; reading of the
  crops, not stated in the captions), soft edges (focal-spot blur, 2-4 px).
- Superimposed layers: everything through the stack is visible at once: faint routing shadows, a second, denser dot
  population (not identified in either caption), large soft shadows of deeper features.
- Smooth low-frequency brightness variation; slight geometric magnification blur; no colour.

### Facts

| Fact | Value | Source |
|---|---|---|
| Package | CoWoS-R+: 2 split SoC + 2 HBM, 32 x 35 mm organic interposer, 55 x 55 mm package | ectc51906.2022.00008-a; text p.4 Sec. III.A |
| C4 | nominal 150 um pitch, Cu/solder bump; X-ray: no cold joint or bridging at four corners | ectc51906.2022.00008-a-i3; p.4 Fig. 9 |
| C4 diameter (this TV) | not found. Nearest atlas value: 75 um Cu/SnAg bump at 150 um pitch, measured Cu / SnAg heights 34 / 25 um (different TV) | ectc51909.2023.00155-a-i3; p.2 Table 2, p.6 Table 10 |
| Identity of the small dense dots | not found | - |

### Composition

- 1 px/um (chosen): C4 pitch 150 px; joints 75 px (diameter from ectc51909.2023.00155-a-i3, declared), ring core ~35 px
  (crop estimate). 13 columns, one centred on x = 960.
- Lowest joint row centred at y = 462 (bottom 500); y = 600 = interposer (CoW) edge: a grey-level step, lighter below
  (less material in the beam), with a thin bright edge line (as the bright corner lines in both crops). Edge distance
  of the last row (chosen): 138 um.
- Band y 500-592: plain light grey with only a very faint routing shadow. `meta.text = 'dark'`.
- Below 600: lighter field with a few large soft dark shadows (substrate features, out of focus), low contrast.

---

## m5. Through-glass via array (optical)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51529.2024.00092-f01 | the hero look: square array of round etched holes, uniform dark slate discs on a flat blue-grey / lavender field; zoom: one hole, crisp circular edge, slightly lighter inner rim | 75 um pitch, 49.49 um (labels) |
| tcpmt.2025.3557232-f04 | (a, d) SEM top view of 20 um TGVs with Cu lines between rows (alternative, SEM) | 20 um, AR 15 |
| ectc51846.2026.00208-f10 | plated 40 x 40 TGV arrays, tan / orange field, black defect dots (not used: defects dominate) | 10-100 um |
| ectc51846.2026.00074-f04 | X-ray of plated TGVs, paired dark ellipses (not used: m06 is the X-ray shot) | not stated |

### Visual vocabulary checklist (reflected-light microscope, unmetallized glass)

- Flat field, slight blue-grey / lavender cast (glass on a stage), even illumination, faint vignette.
- Holes: uniformly dark (light leaves through the hole / scatters on the tapered wall), crisp round edges, a thin
  slightly lighter rim just inside the edge (taper), very small size scatter (+/- 1 %).
- Perfect square grid; occasional tiny surface particle (static, outside the band).

### Facts

| Fact | Value | Source |
|---|---|---|
| Holes | design 50 um, measured 49.49 um; pitch 75 um; unmetallized etched holes | ectc51529.2024.00092-a-i1; p.2 Fig. 4, Sec. II.B |
| Glass | laser-modified borosilicate, 200 um thick, aspect ratio 4:1 | ectc51529.2024.00092 p.2; tv -a |
| Edge distance of the array | not found | - |

### Composition

- 3 px/um (chosen): pitch 225 px, holes 148 px; 9 columns, one centred on x = 960.
- Lowest row centred at y = 426 (hole bottoms at 500); y = 600 = coupon edge (diced edge, thin bright line, dark
  stage below). Edge distance (chosen): 58 um from the last hole edge.
- Band y 500-592: plain glass field. `meta.text = 'dark'` (field luminance ~0.55-0.6).

---

## m6. Cu stud array at a chiplet die edge (tilted SEM)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51909.2023.00053-f01 | (a) chiplet die: tilted SE images of a dense Cu stud field next to coarser studs, an L-shaped corner mark, the die edge with its sidewall face below; studs are flat-topped cylinders, bright top rims, darker shadowed sides, grainy tops at high mag; (b) HBM footprint die: sparser 55 um-pitch studs | 20 x 30 um, 55 um, 180 um pitch (text p.3) |
| ectc51846.2026.00051-f04 | (c) EMIB TV "top down SEM" of 110 / 55 / 36 um mixed-pitch bump regions: domes with a bright crescent and soft drop shadow (alternative bridge-region look) | 110 / 55 / 36 um (caption p.3) |
| ectc51909.2023.00153-f07 | tilted SEM microbumps at 20 / 15 um pitch with rough SnAg tops (vocabulary for top texture) | 20, 15 um |

### Visual vocabulary checklist (SE, tilted)

- Greyscale; edge effect: bright rim on every top edge, brightest on the side facing the detector.
- Cylinders seen at tilt: elliptical tops, vertical sidewalls with soft vertical shading, a dark contact shadow at
  the base on the far side.
- Field (passivation / Si): smooth mid-dark grey, fine static speckle; a faint brightness gradient.
- Die edge: a strong bright line, then the sidewall face (dim, faint vertical texture) falling away.
- No info bar, no scale bar.

### Facts

| Fact | Value | Source |
|---|---|---|
| TV | M-Series Gen 2: 2 processor chiplets + 4 HBM footprint dies, 18 x 14 mm chips-first fan-out | ectc51909.2023.00053-a |
| Interface studs | 12 um diameter Cu studs on a 20 um x 30 um pitch array (interface region) | ectc51909.2023.00053-a-i1; p.3 Sec. IV.A (Figure 6 = f01) |
| Design rule | 12 um diameter with 8 um spacing | ectc51909.2023.00053 p.5 |
| Non-interface studs | 60 um diameter on 180 um pitch | ectc51909.2023.00053-a-i2; p.3 |
| HBM footprint die | 55 um pitch (JEDEC standard), diameter not given | ectc51909.2023.00053-a-i3 |
| Stud height | not found (crop: roughly 0.7-0.9 x diameter) | ectc51909.2023.00053-f01 (crop) |
| SEM tilt | not found (crop: ~30-45 deg) | - |
| Which pitch axis is 20 vs 30 um | not found (chosen: 20 um along x) | - |

### Composition

- 8 px/um (chosen), 30 deg tilt (chosen): x pitch 20 um = 160 px, y pitch 30 um x cos 30 deg = 208 px; stud top
  ellipse 96 x 83 px; stud height drawn 10 um (crop estimate) = 40 px of visible sidewall.
- 12 columns, one centred on x = 960. Lowest row: stud bases end at y = 500.
- y = 600: the die edge (strongest SE edge, 4-6 px bright line); below: the sidewall face, dim. Edge distance from the
  last stud base (chosen): ~10 um after foreshortening.
- Optional: one 60 um coarse stud partly in a frame corner (x < 300), to show the 180 um / 20 um contrast.
- Band y 500-592: plain field speckle. `meta.text = 'light'` (field luminance ~0.3).

---

## m7. Two dielets on a Si-IF, fine-pitch links across the gap (optical)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51906.2022.00332-f01 | (c) assembled 2 x 2 dielets: beige / grey dielet backsides, a dark narrow gap cross; zoom: a dense comb of fine gold lines crossing the gap (SuperCHIPS interface); (b) bare Si-IF: warm gold-tan, dense link bundles; (a) dielet face with pink Cu pads at 9.8 um pitch | 9.8 um, 59 um gap, 350 um links (labels) |
| ectc51906.2022.00332-f02 | GF-TS dielet on 5.5 x 5.5 mm Si-IF with fan-out pads (wider context) | 10 um pitch |

### Visual vocabulary checklist (brightfield, assembled dielets)

- Dielet backsides: smooth, warm beige-grey, mild mottling, slight sheen; edges crisp with a thin dark outline.
- Gap: dark (deep, low reflectance) with the Si-IF wiring visible as fine parallel bright gold-tan lines, slightly soft.
- Warm overall cast (tungsten / LED microscope white balance), mild vignette.

### Facts

| Fact | Value | Source |
|---|---|---|
| Interface | links of 350 um, each terminated by 4 um diameter Cu pillars at both ends; pillar pitch 9.8 um | ectc51906.2022.00332-b-i1; text p.3 |
| Wires | 4 um pitch Cu wires in two metal layers; 64 links per interface; 7 interfaces between any two dielets, 28 in the 2 x 2 | ectc51906.2022.00332 p.1, p.3 |
| Gap | inter-dielet spacing < 60 um after assembly; 59 um (figure label) | ectc51906.2022.00332 p.3 Fig. 3 caption; f01 (crop label) |
| Dielet / Si-IF | 2.5 mm UDSP dielets (TSMC 16FF), 8 mm 2 x 2 Si-IF | ectc51906.2022.00332-b-c1, -c2 |
| Bonding | Cu-Cu thermocompression with in-situ formic acid vapor (direct Cu-Cu, not hybrid) | ectc51906.2022.00332-a-i1, p.3 |
| Wire width, bundle width, interface spacing along the edge | not found | - |

### Composition

- 4 px/um (chosen): upper dielet fills y 0-600 (bottom edge on y = 600); gap 59 um = 236 px (y 600-836); lower dielet
  from y = 836 down.
- In the gap: one interface bundle centred on x = 960, wires at 4 um pitch = 16 px, width 8 px (2 um, chosen), bundle
  width 256 um = 1024 px (64 wires x 4 um, chosen reading of "4 um pitch"; the two-layer arrangement is not resolved).
  Optionally a second bundle edge at a frame side.
- Pillars sit under the dielets (bonded), so they are not visible in this top view.
- Band y 500-592: plain dielet backside (calm). `meta.text = 'dark'`.
- Deviation to declare: the array is below the edge (in the gap), not above it; the edge on y = 600 is the dielet edge.

---

## m8. 2 um line / 2 um space Cu RDL (optical)

### References

| fig_id | Look at | Scale |
|---|---|---|
| ectc51909.2023.00298-f07 | the hero look: parallel vertical copper-orange lines on a near-black dielectric, line ends terminate in one row with rounded, slightly darker tips; speckled grain and small dark spots in the Cu; soft optical edges | 2 um L/S, 20 um bar (crop) |
| ectc51909.2023.00298-f08 | SEM of the same lines: granular dielectric below the line ends, bright line edges (texture reference only; SEM look not used) | 10 um bar |
| ectc51687.2025.00090-f04 | (c) tilted SEM fan-out of 2/2 um lines, (d) 2.14 um lines at high mag (alternative SEM look) | 2/2 um |

### Visual vocabulary checklist (reflected-light optical, fine Cu lines)

- Copper: warm orange-salmon with a lighter centre and slightly darker edges (diffraction-limited rounding at 2 um),
  fine static mottling and sparse dark specks.
- Dielectric: near-black brown-grey, flat, faint noise.
- Edges soft (2 um lines are near the optical resolution limit): 3-5 px blur at 30 px/um.
- Line ends: rounded, slightly darker; small width variation line to line (+/- 5 %).

### Facts

| Fact | Value | Source |
|---|---|---|
| Lines | 2 um L/S target on the outermost layer (M4), aSAP with sputtered Ti/Cu seed | ectc51909.2023.00298 p.1, p.3 |
| Measured width | 1.8 um (optical, Fig. 6 = f07); 1.98 um (SEM, Fig. 7 = f08), different panel locations | ectc51909.2023.00298 p.3, p.4 |
| Panel | 8-metal-layer double-side RDL on 300 um thick 6" x 6" glass panel; inner layers 15 um L/S; microvias < 20 um | ectc51909.2023.00298-a; p.1 |
| Line length, termination pattern, nearby bus / plane | not found | - |

### Composition

- 30 px/um (chosen): pitch 4 um = 120 px, line 1.8 um = 54 px (optical value), 16 lines, one line centred on x = 960.
- Lines run from the top of the frame and end in one row at y = 500 (rounded ends).
- y = 600: the edge of a wide Cu plane / bus below (constructed: the reference shows line ends but no plane;
  the gap 3.3 um = 100 px is chosen). Below 600: copper plane, same optical look, slightly brighter.
- Band y 500-592: plain dark dielectric. `meta.text = 'light'`.

---

## Reused views (built, no work needed)

| Shot | Scene, view | Shows | Key facts (sources in the scene notes) |
|---|---|---|---|
| m02 | `c8_wafermap` v=2 | 300 mm W2W wafer, IR bonding-overlay map: jet-coloured sites with short vectors, staircase of 138 fields | 20 x 20 mm fields; overlay max 62 nm, 95 % of sites < 50 nm (ectc51846.2026.00187); 2.1 px/mm |
| m04 | `c5_csam` v=2 | one row of D2W-bonded 8 x 12 mm dies, bright voids, wafer rim | 200 mm wafer, voids on 1.7 % of dies (ectc51909.2023.00023); 40 px/mm |
| m10 | `c4_ir` v=2 | die edge through Si with the 0.1 um horizontal vernier | ectc51909.2023.00023; 16 px/um, frame 120 x 68 um |
| m11 | `c1_optical` v=2 | 4 rows of the edge daisy chain, 50 um keep-out, die edge and kerf | 7 um pitch, 3.5 um pads (ectc51909.2023.00023); 5 px/um |
| m12 | `c3_afm` v=2 | 3 um pads at 6 um pitch, edge-dishing rings, copper-gold LUT | ectc51846.2026.00024; 40 px/um |
| m13 | `c6_ebsd` v=2 | the same pads after the < 220 C anneal, ~400 nm grains, IPF colours on black | ectc51846.2026.00024 p.5; constructed plan view (declared) |
| m15 | `c2_sem` v=2 | rectangular 0.33 x 0.4 um lattice of pad openings at 20 deg tilt | ectc51529.2024.00128; 636 px/um |
| m16 | `c7_sem_pad` v=2 | one 0.32 um pad in BSE, Ta ring brightest | ectc51529.2024.00128 (derived pad side); 3600 px/um |

All eight already satisfy the line rule and the calm band (checked in pass C with the word "Until"; "more to" is wider:
re-check legibility on the sheet with `--param text="more to"`).

## Gaps and recommendations

- Not found in the atlas: panel unit size / pitch and border (m1, crop estimates used); glass core thickness (m1); CUF
  fillet width and exact die positions (m2, crop of f09); BGA edge distance and ball count (m3); C4 diameter of the
  CoWoS-R+ TV and identity of the dense small dots in the X-rays (m4); TGV array edge distance (m5); Cu stud height, SEM
  tilt and pitch-axis orientation (m6); Si-IF wire width, bundle width and interface spacing (m7); RDL line length and
  any bus / plane next to the 2 um lines (m8, constructed).
- Not a hybrid bond: m7 is direct Cu-Cu TCB on Si-IF (pillar to pad), used as the chiplet-to-chiplet rung; say so in
  its notes.
- Alternatives if a choice fails on the sheet: m2 -> CoWoS-R+ top-down look (ectc51906.2022.00008-f02, dies not
  dimensioned); m3 -> X-ray of a 1 mm BGA (tcpmt.2025.3614186-f02: 1.0 mm, 580 um, 7404 balls); m6 -> EMIB 110 / 55 /
  36 um mixed-pitch domes (ectc51846.2026.00051-f04 c, bump CDs not given); m8 -> SEM look (ectc51687.2025.00090-f04).
- Not chosen: HBM die-stack top views (no clear top-view crop), TSV reveal top views (ectc51906.2022.00179-f11; grey SEM
  would add a third adjacent grey), hybrid-bond pad layouts (ectc51846.2026.00218-f12, iedm45741.2023.10413829-f06;
  text-heavy diagrams), package X-ray (ectc51906.2022.00180-f06 c; same scale as c5 v2).
- Legibility: the overlay word changes from "There's" to "more to" (wider); every new scene keeps x 560-1360 clear.

## Figures viewed (fig_id only)

ectc51846.2026.00134-f06, ectc32696.2021.00174-f06, ectc.2013.6575597-f07, tcpmt.2025.3628798-f24,
ectc51529.2024.00049-f03, ectc32696.2021.00315-f04, ectc51906.2022.00180-f06, ectc51906.2022.00180-f09,
ectc51846.2026.00365-f02, ectc51909.2023.00155-f13, ectc51909.2023.00155-f14, ectc51909.2023.00155-f15,
ectc51909.2023.00155-f09, tcpmt.2025.3614186-f02, tcpmt.2025.3614186-f04, ectc51687.2025.00027-f05,
ectc51529.2024.00092-f01, ectc51846.2026.00074-f04, ectc51846.2026.00208-f10, tcpmt.2025.3557232-f04,
ectc51909.2023.00053-f01, ectc51687.2025.00026-f04, ectc51909.2023.00153-f07, ectc51906.2022.00008-f02,
ectc51906.2022.00008-f03, ectc32696.2021.00033-f04, ectc51687.2025.00048-f09, ectc51687.2025.00090-f04,
ectc51846.2026.00051-f04, ectc51906.2022.00179-f11, ectc32696.2021.00166-f06, ectc51906.2022.00031-f07,
iedm45741.2023.10413759-f03, ectc51846.2026.00062-f06, ectc51846.2026.00218-f06, ectc.2019.00095-f03,
ectc51906.2022.00332-f01, ectc51846.2026.00218-f12, iedm45741.2023.10413829-f06, ectc51906.2022.00113-f03,
ectc51529.2024.00322-f07, ectc51846.2026.00065-f05, ectc51687.2025.00007-f05, ectc51909.2023.00298-f07,
ectc51909.2023.00298-f08; pass-C v=2 renders in `cache/video/sheets/`.
