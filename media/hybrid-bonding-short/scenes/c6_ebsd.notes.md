# c6_ebsd: pass C modality 6, EBSD orientation map (IPF colours) of Cu pads in plan view

Shots: c06 (`v=1`, as plated) and c14 (`v=2`, after the bond anneal), 0.25 s each. `meta.text = 'light'` (the overlay
sits on the black, non-indexed dielectric). Built 2026-10-22.

**Constructed view (declared).** The atlas has no plan-view EBSD / PED map of hybrid-bond pads. All hybrid-bond
orientation maps in the atlas are cross-sections (ectc51846.2026.00024-f07, ectc51846.2026.00130-f06,
ectc51846.2026.00187-f03); see refs_passC.md section 6. This scene is a plan view of the bond surface, synthesized
from the sourced grain sizes. Its look follows real IPF maps (ectc51687.2025.00071-f04 is a TSV, not a hybrid bond).

## What each view shows

| View | State | Map step | Look |
|---|---|---|---|
| `v=1` | as plated (fine-grained ECP Cu) | 25 nm = 1 px | fine multicoloured grains, coarser grains along the pad rim (sidewall), no boundary lines (raw IPF map), about 4 % unindexed points |
| `v=2` | after the < 220 C post-bond anneal | 50 nm = 2 px (visible square steps) | about 400 nm polygonal grains, thin black grain boundaries, annealing-twin lamellae with thin dark-grey twin boundaries, blue (<111>) bias, sparse unindexed points |

Seen one after the other, the two shots show grain growth on anneal. Pads, pitch and scale are identical in both.

## Structure drawn (top view)

- y 0-600: the mapped field. 3 um pads (120 px discs, staircase edge at the step size) on a 6 um square pitch
  (240 px). Rows centred at y = 440, 200, -40; a column on x = 960. The last row ends at y = 500.
- y 500-600: non-indexed dielectric (black). Nothing in the overlay band.
- y = 600: bottom edge of the mapped field. The next row would start at y = 620.
- y 600-1080: unmapped, flat viewer grey (#5c5d60).
- Dielectric: non-indexed, black. 260 dim (40 %) mis-indexed single steps scattered at y < 480, none in the band.

## Map model (built once in `init`, seeded per view)

- Grains per pad: equivalent diameters drawn from a log-normal. Seeds are placed by random sequential addition with a
  soft exclusion of 0.42 (d_i + d_j). Cells come from a power diagram, weight factor 0 for `v=1` (plain Voronoi) and
  0.35 for `v=2`.
  `v=1` puts the coarse sidewall grains in a 0.30 um rim zone.
- Measured grain statistics (node run of the scene's own `padGrains`, 6 pads, equivalent circle diameters at the
  map step):
  - `v=1`: about 920 grains/pad. Number mean 82 nm, sd 54 nm, median 69 nm, max 485 nm.
  - `v=2`: about 51 grains/pad. Mean 406 nm, sd 117 nm, median 395 nm, max 1084 nm.
- Orientations: a full rotation per grain. A fraction p111 of grains is near the <111> fibre (about 8 deg spread);
  the rest are uniform. p111 is 0.25 (`v=1`) and 0.45 (`v=2`). Every grain gets a random in-plane rotation.
- Colour: the standard cubic IPF key of the crystal direction parallel to the sample normal (IPF-Z): <001> red,
  <101> green, <111> blue, white towards the centre of the triangle. The gamma is 0.62. Within each grain there is a
  ±5 % brightness drift (orientation spread). No IPF key is drawn (it carries labels).
- Twins (`v=2`): 55 % of grains carry 1-2 lamellae. Each lamella is 0.14-0.40 of the grain diameter wide. The twin
  orientation is the parent rotated 60 deg about one {111} normal (Sigma3). That {111} is chosen among the planes
  inclined to the surface (|n_z| < 0.88). The lamellae run along the trace of that plane on the surface, so twin
  colours and directions are crystallographically consistent with their parent.
- Boundaries (`v=2`): high-angle boundaries are 1 px black and twin boundaries 1 px dark grey (70, 70, 70).
  `v=1` draws no boundary lines. At about 3 px grains, lines would turn the map black. The as-plated reference maps
  (ectc51846.2026.00024-f07, ectc51687.2025.00071-f04a) also show no boundary overlay.
- Non-indexed steps: 4 % in the interior and 8 % at boundaries and the rim (`v=1`); 0.8 % and 6 % (`v=2`).

`render(t)` blits the precomputed map with a whole-pixel horizontal drift of 20 px/s (60 px at t = 3 s). It is a
pure function of t and valid for t in [0, 3].

## Facts with sources

| Value | Used | Source |
|---|---|---|
| Pad / pitch | 3 um / 6 um | ectc51846.2026.00024-a-i1, -b-i1 (atlas `interconnects.csv`) |
| As-plated grain size, 3 um pad | target 79 +/- 74 nm; built 82 +/- 54 nm (number mean of resolved grains; the 25 nm step cannot resolve the smallest grains, and the 8288 nm outlier is not reproduced) | ectc51846.2026.00024 p.3, Fig. 2 (= f07): N = 281, 34-8288 nm, average 79 +/- 74 nm |
| Sidewall coarsening as plated | rim zone 0.30 um, grain mean 300 nm, sd 240 nm (input) | qualitative in ectc51846.2026.00024 p.3 ("localized grain coarsening, particularly near the sidewalls"). Zone width and sizes are **estimates**; no number given. |
| Grain size after anneal | about 400 nm (built 406 nm) | ectc51846.2026.00024 p.5: "average grain size of approximately 400 nm near the bonding interface", post-bond anneal < 220 C |
| Size spread after anneal | sd about 0.3 x mean | **estimate**; not stated |
| <111> texture | partial bias, stronger after anneal | ectc51846.2026.00130 p.3: large (111)-oriented grains at failed sites (another TV, 0.45 um pitch). The fractions (0.25 / 0.45) are **estimates**; the texture of the 3 um pads is not stated. |
| Twins after anneal | 55 % of grains, 1-2 lamellae | **estimate** from the look of annealed Cu maps (ectc51687.2025.00071-f04b) |
| Map steps | 25 nm (`v=1`), 50 nm (`v=2`) | **chosen**. The source used TEM-PED at a 5 nm step (ectc51846.2026.00024 p.2-3). An SEM-EBSD plan-view map would use a coarser step. The values were picked for 1-2 px steps at 40 px/um. |
| Scale | 40 px/um, pitch 240 px | refs_passC.md section 6 composition (pitch 200-250 px for pass C) |

## Figures looked at (visual reference only; nothing traced, embedded or recomposed)

ectc51687.2025.00071-f04, ectc51846.2026.00024-f07, ectc51846.2026.00130-f06 (via refs_passC.md description),
ectc51846.2026.00187-f03 (via refs_passC.md description).

## Deviations from reality (deliberate)

- Plan view constructed from cross-section statistics (see top). After a hybrid bond, the pad surface is buried at
  the interface. `v=2` therefore stands for the bond plane as if delayered, or as it would look at the surface after
  an equivalent anneal.
- Grain-size sd as plated is smaller than the source (54 vs 74 nm). The map step cannot resolve grains below about
  30 nm, and a single 8 um outlier grain is not drawn.
- The mapped field is a wide crop cut at y = 600 (motif line). Unmapped areas are shown as flat grey.
- No IPF key, scale bar or legend (text-like).
- Drift is a display pan.

## Verification (2026-10-22)

- Sheets: `cache/video/sheets/c6_ebsd__v-1.png`, `c6_ebsd__v-2.png`, `c6_ebsd__v-1__text-Until.png`,
  `c6_ebsd__v-2__text-Until.png`, plus the `__full.png` mid-frame for each.
- Render time, measured in-page with a forced canvas readback and no screenshot: mean 25-26 ms/frame, first frame
  92-98 ms. The sheet tool reports about 90-100 ms/frame including the screenshot.
- Overlay band x 560-1360, y 500-592: pure black (luminance 0). The light overlay #f4f1ea has 18.6:1 contrast.
- The right edge stays filled at t = 3 s.

## Overlay word (text hook, 2026-10-23)

Shots: c06 (v=1, "There’s", 64 px, flip=1, text_color light) and m13 (v=2, "more to", text_size 97.50 + 28.82 px/s,
no flip).

- Look: the opaque annotation box an orientation-map viewer lays over the map: box filled with info.color (paper;
  #f4f1ea for 'light'), the word in the contrasting ink (#101010 on a light paper, #f4f1ea on a dark one), UI sans
  `APA.FONTS.grotesk` (Inter) weight 500, 1 px black frame, sharp corners.
- Same vocabulary for both words; font, padding (0.30 / 0.17 x size) and box scale with info.size (v=2 grows cut to
  cut).
- Placement: centred on x = 960, baseline on info.baseline; box bottom 565 + 0.17 x size (582 px at 97.5 px), above
  the line. Display coordinates; the overlay is never flipped, so on c06 it sits on the flat grey unmapped field
  that the flip brings above the line.
- Only the word: no IPF key, step size, phase or scale-bar fields.
- Contrast (measured): ink vs paper 16.9:1 (v=1, v=1 flipped, v=2 at 80 px). Box vs flipped grey field: the 1 px
  black frame separates them.
- Time (in-page APA.frame + readback): c06 20 ms/frame mean with the word, m13 24 ms (23 ms without).
- Sheets: `cache/video/sheets/c6_ebsd__v-1__text-Theres.png`, `c6_ebsd__v-1__text-Theres__flip-1__text_color-light.png`,
  `c6_ebsd__v-2__text-moreto__text_size-80.png` (+ `__full.png`); shots c06, m13 re-rendered.
