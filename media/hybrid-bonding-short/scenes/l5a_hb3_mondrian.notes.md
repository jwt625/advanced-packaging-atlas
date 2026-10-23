# l5a_hb3_mondrian - notes

L5 pass A: Cu-Cu hybrid bond, die-to-wafer (D2W), 3 um pitch. Cross-section along a daisy chain, drawn as Mondrian / De
Stijl. Joint plane on y = 600 = the bonding interface (SiO2-SiO2 in the field, Cu-Cu at the pads).

Reference vehicle: CEA-Leti TV1, atlas `tv_id` ectc51846.2026.00218-a (6 x 6 mm Si die D2W hybrid bonded on a 300 mm Si
wafer, multi-pitch daisy chains 5/3/2/1 um, anneal 400 C / 120 min). The 3 um row is `ic_id` ectc51846.2026.00218-a-i2.

## Scale

106.67 px/um: 3 um pitch = 320 px (STYLE range 220-320 px), 6 pitches across the frame.

## Structure drawn (top to bottom)

| Region | Material | Drawn | Size used | Source |
|---|---|---|---|---|
| top die Si | Si | grey-white plane, cropped by frame | die thinned to ~8 um (frame shows ~3.9 um of it) | layer ectc51846.2026.00218-a-L02 |
| oxide between Si and MZ | SiO2 | white strip | 0.25 um | estimate from SEM scale bar, fig ectc51846.2026.00218-f01 panel (d) (1 um pitch DC; ~0.24 um, +/-0.05 um); not stated in text |
| MZ routing line | Cu | thick black bar | 0.5 um thick; 4.5 um long (left edge of pad n to right edge of pad n+1) | thickness: SEM estimate f01 panels (c), (d) (~0.5 um); length: estimate from f01 panel (c) (2 um pitch: line spans both pads' outer edges); level named in layer -a-L03 / -a-L08 |
| SiCN cap on MZ | SiCN | thin black line, full width | thickness not stated | process flow fig ectc51846.2026.00218-f07 (Fig. 3: SiCN + SiO2 deposited after MZ; SiCN under each dielectric level) |
| HBV via level | Cu via in SiO2 | thick black bar, centred under pad; white SiO2 cells | via CD 0.5 um, height 0.5 um, 1 via per pad at 3 um pitch | CD and count: `ic_id` ectc51846.2026.00218-a-i5, -a-i2, layer -a-L04 / -a-L07 (Table 1, fig -f13); centred: fig -f12 (Fig. 7(c)); height: SEM estimate f01 panel (b) (~0.5 um) |
| SiCN etch stop at HBM base | SiCN | thin black line, open only where the via meets the pad | thickness not stated | fig -f07 (Fig. 3) |
| HBM bond pad, top die | Cu (dual damascene with HBV) | red | 1.5 um square CD (pad = pitch / 2), 0.5 um thick | CD: `ic_id` -a-i2 pad_x 1.5 / pad_y 1.5, layer -a-L05 ("pad = pitch/2"); thickness: SEM estimate f01 panel (b) (0.47 um top, 0.49 um bottom) |
| bonding dielectric, top die | SiO2 (over SiCN) | yellow | 0.5 um (HBM level) | dielectric "SiO2 (SiCN)" in -a-i2; Fig. 3 order |
| bond plane, y = 600 | SiO2-SiO2 / Cu-Cu | thin black line in the dielectric only; no line across the pads | - | Cu-Cu joint has no barrier: pads meet metal to metal (SEM f01 shows one continuous Cu body with the interface line) |
| bonding dielectric, bottom wafer | SiO2 (over SiCN) | blue | 0.5 um | as above |
| HBM bond pad, bottom wafer | Cu | red, same size, aligned | 1.5 um, 0.5 um thick | symmetric pads: -a-i2 (one CD per pitch, Table 1); ectc51529.2024.00017-a-i1 also notes symmetric pads |
| HBV, SiCN, MZ, oxide, bottom wafer | mirror of the top die | as above | as above | Fig. 3 applies to both base wafers ("top & bottom") |
| bottom wafer Si | Si | grey-white plane, cropped | ~775 um | layer -a-L09 |

Daisy-chain topology: top-die MZ links pads (2k, 2k+1), bottom-wafer MZ links pads (2k+1, 2k+2), so the chain alternates
tiers through every bond (fig -f12, Fig. 7(a) "1 link"). Stack order per tier, from Si outward: oxide, MZ, SiCN, via
SiO2, SiCN, HBM SiO2, bond plane (Fig. 3).

## Color code (deliberate choices)

- Thick black = Cu routing (MZ + HBV) at true size; red = the bonded Cu pads (HBM). Same material, split by function so
  the joint reads first. Thin black = thin films (SiCN, pad barrier liner), the Si / oxide boundary and the bond plane.
- Bonding-layer SiO2 is yellow on the top die and blue on the bottom wafer: same material class, colored by tier so the
  two bonded films meet on y = 600. ILD SiO2 (via and MZ levels) white; Si grey-white (Mondrian's grey-white planes).

## Motion

- Horizontal pan 28 px/s (84 px over 3 s; STYLE limit 30 px/s). No vertical motion.
- The black grid (metal and films) is present from t = 0; the red / yellow / blue planes paint in as a left-to-right
  wave, each plane wiping away from the bond plane in 0.16 s. Left quarter painted at t = 0, all painted by ~0.7 s,
  then the pan alone continues to t = 3 s.
- Paint texture: static seeded horizontal brush drag at low alpha, panned with the painting (no per-frame noise).

## Deviations from reality

- Thin lines are 12 px (0.11 um) wide, centred on the true boundaries; real SiCN and barrier films are thinner
  (thicknesses not stated in the source; barrier material not named). Boundary positions are true; visible colored areas
  shrink by 6 px per side.
- Pads drawn perfectly aligned. Measured overlay for TV1: max(|mean| + 3 sigma) X 0.899 um, Y 1.104 um (-a-i2);
  the 3 um SEM (f01 panel (b)) shows a local offset < 0.1 um.
- Cu recess / dishing not drawn: a few nm (e.g. ectc51687.2025.00323 median Cu depth -6.7 to -7.0 nm for 1.0-3.0 um pads; ectc51906.2022.00113
  3-5 nm) is < 1 px at this scale.
- Thicknesses of MZ, HBV, HBM and the oxide under MZ are read off SEM scale bars (no values in the text); the 0.25 um
  oxide comes from the 1 um pitch panel and is assumed equal at 3 um pitch.
- TV1 has no TSV and a single routing level (MZ) per tier; no further BEOL levels are drawn because the source shows
  none. A product die would carry a full BEOL stack above MZ.
- Via sidewall taper (vias trapezoidal in SEM, -a-i5 notes) drawn straight (Mondrian orthogonality).

## Figures looked at

ectc51846.2026.00218-f01, ectc51846.2026.00218-f05, ectc51846.2026.00218-f07, ectc51846.2026.00218-f12. Looked at only;
nothing traced or embedded. Composition is the daisy-chain geometry from the data, not any figure's layout.

## Verify

`uv run python scripts/render_video.py sheet l5a_hb3_mondrian.html --dur 3.0 --n 12` -> mean 125 ms/frame including
screenshot (first frame ~600 ms warm-up); in-page render ~25-45 ms after warm-up.
