# c7_sem_pad: pass C modality 7, high-magnification top view of one Cu bond pad

This scene replaces plan-view TEM. Basis (`refs_passC.md` Sec. 7):
- No plan-view TEM or STEM of HB pads exists in the atlas.
- The atlas TEM vocabulary is already used by `l7a_hb04_tem`.

Both views are greyscale, top view, with no text. They show one 0.32 um square pad of the 0.64 um lattice. The pad's
outer edge (the barrier / dielectric boundary) lies on y = 600, with the pad above it. The neighbouring pads lie off frame.

| View | Imaging mode | Scale | Pad on screen | Overlay tone |
|---|---|---|---|---|
| `v=1` | Ion-induced SE image (FIB, Ga+), channeling contrast. Cu grains are flat grey tiles with a wide tone range and straight annealing-twin lamellae. The TaN/Ta barrier is a mid-bright ring. The dielectric is dark. | 2400 px/um | x 576-1344, y -168-600 | `light` |
| `v=2` | Backscattered electrons at higher magnification. Z contrast: the Ta ring is brightest, Cu is bright and the dielectric dark. Electron-channeling grain contrast is weak. | 3600 px/um | x 300-1452, y -552-600 (off-centre, both lower corners visible) | `dark` |

`meta.text` is chosen per view from `v` at load time.

How it differs from the neighbouring scenes:
- **From l7a:** l7a is a false-color (orange / cyan) STEM-EDS cross-section with bend contours and thickness fringes. c7 is a greyscale top view with flat channeling tiles and no bend contours.
- **From c2:** c2 is a lattice of many pads at a 240 px pitch. c7 is a single pad that reveals its grains.

## Structure (top view)

- **Cu pad interior:** a polycrystalline tessellation. It is a power diagram on a jittered grid, gently domain-warped, which gives curved polygonal boundaries and a broad size spread.
  - About 45 % of grains carry 1-4 parallel twin lamellae of a second tone.
  - Grain-boundary grooves are drawn darker. Twin boundaries are fainter.
- **Barrier ring:** TaN/Ta, inside the pad opening, exposed at the surface as a ring.
- **Dielectric:** around and below the pad. The pad gap is 0.32 um (768 px in v1, 1152 px in v2), so no neighbour reaches the frame.
- **Text band (x 560-1360, y 500-592):** lies inside the pad.
  - v1: grain tones are bounded to 0.09-0.48 grey so the light word stays legible (checked with `text=Until`).
  - v2: the grain contrast is weak (about ±0.055 around Cu 0.60 grey) and the word is dark.

## Dimensions and sources

| Item | Value | Source / basis |
|---|---|---|
| Lattice | 0.64 um square pitch, 25 % Cu density | `ectc51529.2024.00128-a-i1`; text p.3 Sec. III.A |
| Pad side | 0.32 um | **(derived)**: sqrt(0.25) x 0.64 um |
| Corner radius | 0.045 um | estimate from the rounded-square openings in `ectc51529.2024.00128-f03` (crop) |
| Grain size | mean grain area = a circle of 45 nm diameter (seed density); twins not counted as grains | FG (fine-grain) Cu 42 nm and 47 nm average, 10 and 30 days after plating: `ectc51846.2026.00187` p.4. **Different TV** (500 nm pitch FG Cu); the grain size of the 0.64 um TV is not reported. |
| Barrier material | TaN/Ta (PVD TaN/Ta or ALD TaN / PVD TaN) | `ectc51846.2026.00130-a`, `-b` (450 nm pitch TVs; **different TV**). Barrier of the 0.64 um TV not stated. |
| Barrier thickness | 6 nm (14.4 px v1, 21.6 px v2) | **assumption**: not found in the atlas. It is the same value as `l7a_hb04_tem`. |
| Dielectric | not named for this TV (hermetic metal-diffusion-barrier dielectric) | `ectc51529.2024.00128-a-i1` |
| Twin fraction, lamella widths, grain-size spread | about 45 % of grains; lamellae 0.08-0.28 x cell size | rendering choices, not sourced |

## Contrast physics used (textbook, not from atlas references)

- **Ion-induced SE channeling contrast:**
  - The SE yield under a Ga+ beam depends strongly on grain orientation, so grains appear as flat tones and twins as straight bands of a second tone.
  - Insulators charge positively under the ion beam and appear dark.
  - The SE yield of TaN/Ta relative to Cu is not sourced: drawn mid-bright (0.50) with a thin edge highlight.
- **BSE:**
  - The backscatter coefficient rises with Z (Ta 73 > Cu 29 > Si/C/N/O), giving a bright ring, bright Cu and a dark dielectric.
  - Electron-channeling contrast between Cu grains is weak (a few %).

## Motion

- **v1:** slow zoom about (960, 600), 1.2 %/s, clamped at 3.4 s (3.6 % at t = 3 s; contract limit 4 %). The line stays at y = 600.
- **v2:** stage drift of 20 px/s to the left (60 px at t = 3 s).
  - The pad spans x 240-1392 at t = 3 s, so it still covers the text band.
  - The world image is 72 px wider than the frame.
- **Noise:** static and screen-fixed, seeded once. It has 10 faint scan-line gain rows, kept out of y 492-600.

## Figures looked at (visual reference only; nothing traced or embedded)

- `ectc51529.2024.00021-f04`: the high-mag SE look across a pad edge.
- `ectc51687.2025.00060-f08`: top row, single-pad SEMs.
- `ectc51529.2024.00128-f03`: pad corner rounding.

Neither crop shows channeling contrast. The grain rendering follows the textbook mechanisms above.

## Deliberate deviations

- **Motif line:** y = 600 is a physical edge only across the pad width: x 576-1344 (v1) and x 300-1452 (v2, moving with the drift).
  - Left and right of the pad, the dielectric continues across the line, with no edge there.
  - This follows the single-pad composition in `refs_passC.md` Sec. 7. A full-width edge would need either a lower magnification (then this is c2) or an invented feature.
- **Grain size:** taken from a different test vehicle (FG Cu, 500 nm pitch) and declared above.
- **Barrier thickness:** 6 nm is an assumed value.
- **v2 resolution:** v2 is rendered with ~1 nm blur (box r 4 x 2 passes, sigma ~3.7 px). Real BSE resolution at the
  kV needed for Cu is coarser, so the 6 nm ring would appear broader and with less peak contrast. This is a stylisation for a 0.25 s read.
- **Dissolution gap:** the pad-edge dissolution gap of `ectc51529.2024.00021-f04(a)` is a process defect and is not drawn. The pad is the ideal case.

## Render

- **In-page `APA.frame` + 1-pixel readback (flush):** mean 26 ms (v1) and 31 ms (v2); max 57 ms.
- **Init:** ~0.35 s.
- **render_video.py sheet:** 340-370 ms mean per frame, including the PNG screenshot.

## Overlay word (text hook, 2026-10-23)

Shots: c07 (v=1 FIB channeling, "There’s", 64 px, no flip) and m16 (v=2 BSE, "more to", text_size 112.00 + 44.14 px/s,
flip=1, text_color light).

- Look: in-image annotation written with the microscope's annotation tool, distinct from c2's data bar: UI sans
  `APA.FONTS.grotesk` (Inter) weight 500 in info.color, thin contrasting rim (stroke 0.06 x size, min 3 px) and a
  small drop shadow (offset 0.025 x size, blur 0.05 x size) in the rim colour; no box or bar. Rim is black for light
  ink, #f4f1ea for dark ink (v=2 without text_color resolves to meta 'dark').
- Same vocabulary for both words; rim, shadow and size follow info.size (m16 is the largest cut: 112.0, 113.8,
  115.5 px over its 3 frames at 44.14 px/s).
- Placement: centred on x = 960, baseline on info.baseline. Display coordinates; on m16 the flip brings the dark
  dielectric above the line under the word.
- Only the word: no measurement lines, HV / WD / mag fields or scale bar.
- Contrast (measured): ink vs rim median 16.6:1 (v=1), 16.0:1 (v=2 dark ink on bright Cu), 18.2:1 (v=2 flipped,
  light). Ink vs the scene under the glyphs (without rim): worst 4.7:1 (v=1), 4.9:1 (v=2), 13.4:1 (v=2 flipped).
- Time (in-page APA.frame + readback): c07 32 ms/frame mean with the word, m16 38 ms (35 ms without).
- Sheets: `cache/video/sheets/c7_sem_pad__v-1__text-Theres.png`, `c7_sem_pad__v-2__text-moreto__text_size-80.png`,
  `c7_sem_pad__v-2__text-moreto__text_size-80__flip-1__text_color-light.png` (+ `__full.png`); shots c07, m16
  re-rendered.
