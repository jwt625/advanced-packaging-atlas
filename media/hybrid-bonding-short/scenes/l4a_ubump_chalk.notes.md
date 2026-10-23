# l4a_ubump_chalk - L4 hero: thermocompression bonding (TCB) of a TSV die, 10 um pitch microbumps, Leonardo study

Style: red chalk (sanguine) hatching and iron-gall brown ink contours on toned laid paper, in the manner of a
Leonardo da Vinci notebook study. Hatching is left-handed, i.e. strokes run from upper left to lower right (Leonardo's
documented direction, Getty: https://blogs.getty.edu/iris/leonardo-da-vinci-renaissance-lefty). On the round metal
forms (TSV Cu, Ni UBM, Sn solder) the same diagonal is kept only where the form turns from the light (upper left),
with a slight bow, so the shade builds toward the right flank. Pen hatching in the deepest shade, faint red-chalk
lay-in lines on the TSV walls (pentimenti), ruled chalk guides along the interfaces. Cu (TSV cores, M1 plates, pad
Cu) carries a stumped sanguine wash (#9c3f24 at 26 % alpha, fading with the drawing toward the frame top and bottom)
plus denser hatching (tone floor 0.30 on the TSV, 0.68-0.70 on M1 and pad Cu), so Cu reads apart from the bare-paper
Si on a freeze frame (audit A1, 2026-10-22). Paper: low-frequency mottling,
laid and chain lines, foxing, an old vertical fold, edge darkening (all static, seeded). No text, no mirror writing.

## Animation (all a function of t; strokes generated once, seeded; nothing re-randomized per frame)

| t (s) | Event | Basis |
|---|---|---|
| 0 - 0.80 | Upper TSV die (bumps down, Sn caps flat, as plated) descends; solder-to-pad gap 5 um -> 0, decelerating | D2W TCB, top die with Ni/Sn bumps onto landing-die Ni/Cu pads (paper Sec. III, Fig. 4 = f03) |
| 0.80 | Sn caps touch the pads | |
| 0.95 - 1.60 | Sn melts under force, wets the pad and collapses: 3.5 -> 2.93 um tall, 7 um -> 8.6 um wide at the pad, volume kept | pre-bond Sn 3.5 um x 7 um (`-b-L03`, `-b-i2`); wetting per f06 (Fig. 6) |
| 1.60 - 3.0 | Settled joint held: Sn 2.93 um, upper die surface 5.63 um above the pad | derived, see below |
| 0 - 3 | Camera trucks right, content moves left: sheet offset 20 + 28 t_shot px (28 / speed px per scene second; 14.7 at speed 1.9) | pass-A group pan (2026-10-22) |

Camera (pass-A group pan, owner request 2026-10-22): content moves left at 28 px per second of shot time (camera trucks right), horizontal only, constant (no ease), from t = 0; identical on screen across the pass-A group (l1a, l1fa, l2a, l3a, l4a, l5a, l6a, l7a slots). Scene-time rate = 28 / `speed`, read from the `speed` URL param (`APA.params.speed`), so the on-screen rate stays 28 px/s if the shot's speed is retimed. Measured on the rendered shot frames, f00 -> f24: 26.9 px leftward (lower-die rows, speed 1.9; target 26.9). Before: 20 px per scene second
at speed 1.9 = 38 px/s on screen (36.4 px over 24 frames measured). Sheet 2040 px wide: offset 104 px at 3 s shot
time, clamps at 116 px (3.4 s). Composition at t = 0 unchanged (offset 20).

Only the upper die moves (rigid layer, plus the solder reshaped per frame from a stored stroke set in normalised
coordinates); the lower die and its pad top stay on y = 600 throughout.

TCB conditions in the source (`ectc51906.2022.00179-a-i2` / `-b-i2`, text Sec. III): Besi TC-advanced D2W bonder,
1 kgf (9.81 N), 250 C interface temperature, flux dip for SnOx / CuOx removal and wetting; bonding time not stated.
No pre-applied film (NCF): the paper uses capillary underfill (CUF) after bonding, so the gap is empty during the
bond. The CUF step itself is not shown (removed after audit A1, 2026-10-22: it fell outside the 2.0 s cut); the gap
stays empty through t = 3 s. For comparison, nearby atlas rows give 235 C / 7 s (`ectc51909.2023.00153-d-i1`) and
260 C / 10 s / 5 N (`ectc51529.2024.00094-a-i1`) for 10-14 um pitch TCB.

Time compression: approach + contact + heat + melt + collapse is shown in 1.6 s; the real bond cycle is seconds to tens
of seconds (7-10 s holds in the rows above; the imec time is not reported). Event times (contact 0.8 s, collapse
0.95-1.6 s) are fixed; sound effects are keyed to them.
The 5 um starting gap is chosen for legibility; the bonder's approach height is not in the source.

Render: mean 268 ms/frame, max 344 ms (12-frame sheet, t = 0..3 s; 2026-10-22, after audit A1 fixes).

## Structure drawn (top to bottom), B2F stack of TSV dies (final, bonded state)

Model: imec back-to-face (B2F) TSV die stack, ectc51906.2022.00179 test vehicles -c (die build) and -d (N > 2
stacking). Each die: TSV-middle (5 x 50 um), front-side M1F / VIA1F / Ni/Cu pad, backside M1B / VIA1B / Ni raised UBM /
Ni/Sn solder. Upper die backside faces down onto the lower die front-side pads. TSV, bump and pad are coaxial in every
column, as in the FIB / SEM cross-sections (f01 = paper Fig. 13, f16 = Fig. 18, f17 = Fig. 14).

Scale 26 px/um; pitch 10 um = 260 px. z = height above the joint plane; y = 600 - 26 z.

| Layer | z (um) | Lateral | Source / basis |
|---|---|---|---|
| Upper die Si, thinned | above 10.21 (cropped at frame top) | full | 50 um thick: `ectc51906.2022.00179-c-L08`; ~13 um visible |
| TSV Cu in upper die | from 7.21 up (cropped) | 5 um dia (hole) | `ectc51906.2022.00179-c-i1` (5 x 50 um, TSV-middle); one TSV per bump column: f01, f17 |
| TSV liner SiO2 / barrier Ta | 0.15 / 0.10 um wall | Cu core 4.5 um | not stated for this TSV; nearest atlas values `ectc51687.2025.00071-a-L02`, `-a-L03` |
| Backside knock-off oxide | 7.21 - 10.21 (3.0) | full | `ectc51906.2022.00179-c-L07` (3 um deposited after 3 um TSV reveal, then CMP); post-CMP thickness not given, drawn 3 um |
| M1B plate (Cu damascene) | 6.15 - 7.21 (1.06) | 8 um wide | thickness `ectc51906.2022.00179-c-L06` (1.06-1.07 um); plate width not stated, drawn 8 um |
| VIA1B (Cu) | 5.63 - 6.15 (0.52) | 0.54 um CD, 5 per bump at 1.3 um spacing | `ectc51906.2022.00179-c-L05`, `-c-i2`; count / spacing not stated, read loosely from f01 |
| Ni raised UBM | 3.63 - 5.63 (2.0) | 7 um dia | Ni 2 um remaining: `ectc51906.2022.00179-b-L03`, `-b-i2` (FS bump; BS R-UBM thickness not stated, same value used) |
| Ni3Sn4 IMC | 2.93 - 3.63 (0.7) | 7 um | 600-800 nm: `ectc51906.2022.00179-b-L03` |
| Sn solder (bonded) | 0 - 2.93 | 7 um at the UBM, slight barrel, 8.6 um where it wets the pad | pre-bond 3.5 um x 7 um: `-b-L03`, `-b-i2`; standoff derived below |
| Gap between bumps (empty; CUF comes in a later step, not shown) | 0 - 5.63 | 3 um at the UBM, 1.4 um at the pad | CUF: `ectc51906.2022.00179-a-L03`, `-b-L04`, paper Sec. III |
| **Joint plane y = 600** | 0 | | top surface of the lower-die Cu/Ni pad, flush with the pad dielectric |
| Pad Cu (thin) / Pad Ni | 0 to -0.5 / -0.5 to -1.0 | 9 um dia | Ni/Cu FS pad: `ectc51906.2022.00179-c-L10`; thicknesses and 9 um pad at 10 um pitch from the same imec group's damascene pad `tcpmt.2025.3628798-a-L08`, `-a-L09`, `-a-i2` |
| VIA1F | -1.0 to -1.52 | as VIA1B | FS layer `ectc51906.2022.00179-c-L09`, thickness not stated; BS values reused |
| M1F plate | -1.52 to -2.58 | 8 um | as M1B (thickness not stated for FS) |
| Lower die Si, TSV continuing down | below -2.58 (cropped at frame bottom) | TSV 5 um | `ectc51906.2022.00179-c-L08`, `-c-i1`; M1 lands on the TSV: paper Sec. IV, Fig. 7 |

Pitch 10 um: `ectc51906.2022.00179-b-i2` (also `-a-i2`; BS bumps at 10 um in `-c-i3`, Fig. 13 = f01).
Bump diameter 7 um at 10 um pitch: `ectc51906.2022.00179-b-i2` (`-a-i2`), also figures.csv for f07 (Fig. 3).

Derived (estimate, stated basis): bonded Sn standoff 2.93 um, bond line (die surface to pad) 5.63 um. The paper gives
3.5 um Sn left before bonding and shows the solder wetting out over the pad after 1 kgf / 250 C TCB (f06 = Fig. 6),
but no bonded standoff. The scene computes the height at every frame from the Sn volume (7 um dia x 3.5 um cylinder,
134.7 um^3) and the current barrel-and-wetting profile; at full wetting it is 2.93 um. Range if no spreading: up to
3.5 um. The 8.6 um wetting width is read from the appearance of f06, not a reported number.

## Figures looked at (visual reference only, nothing traced)

ectc51906.2022.00179-f01, ectc51906.2022.00179-f03, ectc51906.2022.00179-f06, ectc51906.2022.00179-f16,
ectc51906.2022.00179-f17, tcpmt.2025.3628798-f11.

## Deviations from reality (deliberate)

- Time compression and the 5 um starting gap (see above).
- Shading (light from the upper left, cast shade right of each TSV in the Si) is artistic modelling of a flat
  cross-section; it carries no material meaning. Tone fades toward the frame top and bottom (study focus on the joint).
  The chalk on the moving solder is one stroke set stretched with the shape, not redrawn.
- Capillary underfill and its die-edge fillets are not shown (later process step; no die edge in frame either).
- Omitted: flux; Ni spacer dummy bumps (`ectc51906.2022.00179-c-L01`, lower density, not at every site); pre-metal
  dielectric / FEOL between the lower-die Si and M1F; Cu-Sn / Ni-Sn IMC growth at the pad side during the bond
  (thickness not reported; the thin pad Cu is drawn intact); higher BEOL levels (the source die has M1/VIA1 only on
  each side).
- TSV fill metal is not named in the source; drawn Cu, the standard TSV-middle fill (5 x 50 um Cu TSV in the atlas:
  `ectc51906.2022.00031-b-i3`).
- The N > 2 stack of the paper (`-d`) used 3 x 50 um TSVs at 7 um pitch; the 5 x 50 um TSV of `-c` is drawn because
  `-c` is the die that carries the 10 um pitch BS bumps shown with their TSV in f01.
- Brief said hatching slants "down to the left from upper right"; drawn the other way (upper left to lower right),
  which is Leonardo's documented left-handed direction (Getty link above).
