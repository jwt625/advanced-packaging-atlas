# l3a_pillar_riso: L3 Cu-pillar microbump, 40 um pitch, risograph cross-section

Level L3 (DevLog-015): Cu-pillar microbump with SnAg cap, die on Si interposer (2.5D, CoWoS-class). Role (owner decision 2026-10-22, eras by section): pass-B shot, edit.json
slot l3b (1 beat, 0.5 s); overlay "40 µm" rides the line; `meta.text = 'dark'`. File name kept.

## Style

Two-colour risograph print: fluorescent pink (#FF48B0) and teal (#00838A) plates on off-white paper with static fibres.
Each plate is an AM halftone (cell 9 px; pink screen 15 deg, teal 75 deg) with static grain, low-frequency drum
unevenness, ragged edges and ink-starvation speckle, composited with multiply (overprint gives navy). The teal plate
is misregistered by a static (+5, +1) px; the pink plate is registered, so the pad top lands exactly on y = 600.
Halftone ramps on the two Si regions are a print idiom, not a doping or density gradient.

Colour key (pass-B tones; the joint region lies under the overlay text, so metals print as light tints):
Cu (pillar, TSV, wiring) = pink 50 % everywhere (same material, same tint); Si = teal ramp; dielectrics / passivation =
teal; Ni, ENi = pink 30 % + teal 42 % overprint; Ni-Sn IMC = 24 % + 36 %; SnAg = 4 % + 10 % (near paper); underfill =
24 % pink + 10 % teal with paper-white silica filler; air = paper. Grain jitter scales with tint so light areas print
as clean dots.

## Text band (x 560-1360, y 500-592)

Holds the lower Cu pillars (pink 50 % dots), the light Ni band, near-white solder and light underfill: light, low
contrast, no solid or dark ink; dark overlay text. Checked with `--param text="40 µm"` on 8-frame sheets over
t = 0..0.6 s and 12-frame sheets over 0..3 s.

Styled text (2026-10-23, `text` hook, lib/textfx.js): 'APA Grotesk' 800 at 1.05 x text_size printed on the scene's
two drums with the scene's own screening (screenPlates spot function, cell 9 px): pink plate 100 % on its 15 deg
screen, teal 90 % on its 75 deg screen, both clipped to the glyph coverage, with static seeded drum unevenness,
grain and starvation speckle. Plates overprint with multiply (navy where both lie) and the overlay canvas blends
with CSS mix-blend-mode multiply onto the scene (paper and dots show through the ink). Teal plate offset = the
scene's static (+5, +1) px misregistration; it starts at (+8, +2) and settles onto it by ~0.25 s in whole-pixel
steps. Legible from frame 0. Contrast (t = 0.3 s frame, measured): navy overprint vs band mean 9.6:1, vs
worst-decile band pixel 4.2:1.

## Motion

Capillary underfill front (concave meniscus: walls lead, mid-gap lags) sweeping left to right through the die-
interposer gap: x = 800 + 1450 * (1 - (1 - u)^2), u = t / 0.40 (ease-out), so it leaves the right frame edge before
t = 0.40 s; after that the gap is underfilled across the frame and only the 30 px/s camera drift (whole pixels)
continues. Good for any t in [0, 3] s. Tuned for runtime `speed` = 1 in the 0.5 s slot. The front speed is art time
(real CUF flow takes seconds to minutes per die).

History: 330 px/s (first build, pass A) -> 1850 px/s linear (l3a 1.0 s slot retime) -> ease-out complete at 0.40 s
(pass-B role, 2026-10-22).

## Structure drawn (top to bottom) and dimensions

Scale 7 px/um; pitch 40 um = 280 px (in the 220-320 px band). Pillar centres at x = 820 + k * 280 (cropped at both
frame edges).

| Element | Drawn | Source / basis |
|---|---|---|
| Die Si | y 0-380, cropped | 675 um thick: `ectc51529.2024.00155-a-L01` (Table I) |
| Die BEOL (Cu / low-k), wiring rows | 8 um, y 380-436 | thickness not reported (`ectc.2013.6575597-a-L02` notes); 8 um is an assumption; routing pattern illustrative |
| Die top-metal Al pad, passivation | pad ~1.3 um, passivation 1.5 um, opening 14 um | not stated in sources; assumptions |
| Cu pillar | 20 um dia x 13 um (140 x 91 px) | `ectc51529.2024.00155-a-i1`, `ectc51687.2025.00027-a-i1` (Table I: Cu 13 um, dia 20 um) |
| Ni barrier on pillar | 2 um | same rows (Ni 2 um) |
| SnAg joint after bonding | 7 um, barrel bulging ~1 um per side, wetting the full 20 um pad top | plated cap 9 um (same rows). 7 um is an estimate: volume of the 20 x 9 um cap (2830 um3) reflowed between two 20 um faces with a slight bulge (~2500 um3 drawn), minus Sn consumed into IMC. Bonded gap not reported for this TV; a comparable TV (15 um Cu + 7 um cap) measured 16-21 um die/interposer gap (`ectc51909.2023.00155-a-L04`, fig `ectc51909.2023.00155-f07`) |
| Ni-Sn IMC scallops | ~1 um on both Ni interfaces | not stated; generic Ni3Sn4 on Ni after TCB, assumption |
| Joint plane, y = 600 | top of the ENi/Au interposer pad, flush with the interposer passivation surface, so the full-width passivation / gap edge (the dominant edge in the print) and the pad top are both on the line | STYLE.md; flush pad chosen after audit A1 finding #10 (2026-10-22), see Deviations |
| Interposer pad ENi / Au | ENi 2 um filling a 20 um passivation opening, top flush with the passivation; Au 0.05 um not drawable (0.35 px) | `ectc51529.2024.00155-a-L04` (Table II: pad dia 20 um, Al-Cu with electroless Ni 2 um / Au 0.05 um); `ectc51687.2025.00027-a-L04`, `-L05` |
| Interposer Al-Cu pad | 24 um wide, ~1.4 um, edges under passivation, opening 20 um | material from `ectc51687.2025.00027-a-L06`; thickness, width and opening not stated, assumptions |
| Interposer passivation | 3 um over the BEOL, 2 um over the Al-Cu pad edges (equal to the ENi), top surface on y = 600 | not stated; assumption |
| Interposer BEOL | 5 um: thick Al RDL row + 3 Cu damascene rows | layer count and pitches from `ectc.2013.6575597-a-L03`, `-L04` (Al RDL 5 um pitch, 3 Cu damascene levels < 1 um pitch); total thickness assumption; lines drawn wider than real (sub-um pitch is below the halftone cell) |
| Interposer Si | y 656 to frame bottom (61 um of 100-200 um), cropped | 200 um `ectc51529.2024.00155-a-L05`; 100 um `ectc51687.2025.00027-a-L07` |
| TSVs | 10 um dia (70 px) Cu with oxide liner, landing on M1, two in frame between pillars | 10 um dia x 100 um deep, etched from the front side and contacted by the front-side interconnect: `ectc.2013.6575597-a-L05` and its text p.1 (Test Vehicle and Fabrication). TSV positions in frame are arbitrary (not under the microbumps); liner drawn ~0.7 um, assumption |
| Underfill (CUF) | fills die passivation to interposer passivation, silica filler 0.7-3.4 um dia | CUF: `ectc51529.2024.00155-a-L03`; filler size and loading not stated, assumption |

Bump pitch 40 um, pillar 20 um and pad 20 um are the values the scene is built around and are drawn to scale; die and
interposer thin films (passivation, BEOL, Al pad) are estimates at their rough real thickness, not sourced.

## Figures looked at (visual reference only, not traced)

`ectc51529.2024.00155-f01`, `ectc51909.2023.00155-f07`, `vlsitechnologyandcir46783.2024.10631478-f01`.

## Deviations

- Halftone ramps on Si are stylistic.
- BEOL wiring patterns are invented and coarser than real (sub-um lines cannot be shown in a 9 px halftone).
- Teal plate misregistered by (+5, +1) px by design; the pink plate carries the y = 600 pad top.
- Underfill is shown flowing after bonding (correct process order: TCB, then CUF); flow speed is art time.
- Pad height relative to the passivation is not reported. The first version had the ENi standing 1 um proud
  (passivation surface at y = 607), which made the full-width edge read 7 px below the line. It is now drawn flush
  (passivation thickness chosen = ENi thickness above the Al-Cu pad), an equally plausible assumption, so the joint
  plane and the dominant edge coincide at y = 600. Pillar, Ni, solder, pad and pitch dimensions are unchanged.
- Metals are printed as light tints (not solid ink) to keep the overlay text band calm in the pass-B role.
