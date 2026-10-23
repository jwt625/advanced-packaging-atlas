# l1a_bga_engraving - L1 BGA, 1.0 mm pitch, copper engraving (pass A)

Cross-section through one row of BGA (ball grid array) joints, package substrate above, board below. Scale 0.28 px/um
(pitch 1000 um = 280 px). Joint plane = top surface of the board Cu pads = y 600. Motion: horizontal pan 28 px/s
(56 px at 2 s, 84 px at 3 s). Plus a carving animation, t 0-0.85 s, described below. Everything is engraved once in
init (seeded). render(t) translates the plates and reveals the carved Cu through a clip. It is stateless and the
geometry is unchanged.

## Carving animation (owner request 2026-10-22; first content shot, 1.0 s, no overlay)

Frame 0 is revealed by the opening split-horizon transition, so it already reads as an engraving: board, core with
resin-plugged holes, build-up dielectric, BGA pads, SR, the interposer bumps, the underfill boundaries, and the
solder balls as engraved outlines with empty (paper) interiors (amended 2026-10-23). Cut during the shot: the build-up
Cu (RDL traces and planes, via lands), the via plating, the ball interior hatching, and the underfill stipple. Each cut is drawn by a burin head:
a swelling-and-tapering lozenge 30 px long. A spiral copper curl (the burr) lifts behind it. Holes and traces carve at
a steady push.

| Order | Feature (count incl. off-frame margin) | Direction | Start-end (s) |
|---|---|---|---|
| 1 | PTH wall plating (10 walls), staggered left to right | top to bottom | 0.00-0.65 (on-frame walls by about 0.5) |
| 2 | Microvia Cu (32 vias in stacks) | top to bottom | 0.15-0.44 |
| 2 | Via lands (27) | left to right | 0.18-0.45 |
| 3 | L6 core Cu: planes, PTH lids | left to right | 0.34-0.64 |
| 3 | L7 traces incl. the stack-to-PTH routes | left to right | 0.41-0.70 |
| 3 | L8 traces | left to right | 0.49-0.75 |
| 3 | L9 plane, toward the ball pads | left to right | 0.56-0.85 |
| 3 | Top side L5, L4, L3, L2 (in parallel with L6-L9) | left to right | 0.34-0.84 |
| 4 | Solder ball interiors (contour hatching on latitude circles, meridian cross-hatching in shadow). Each ball starts when the microvia stack to its pad is done. Hatching grows as a cap from the highlight to the shaded lower right, 18 angle bins, one burin head on the line being cut | along each hatch line | ball by ball, left to right: on-frame balls start 0.26-0.43 and finish 0.66-0.83 (each 0.40 s) |
| 5 | Capillary underfill stipple and hatching between the interposer bumps; a burin head rides the fill front | left to right | 0.20-0.85 |

At t >= 0.85 s the finished plate (identical to the pre-animation version of this scene) holds and pans through 3 s.


Base test vehicle: `ectc51909.2023.00155-a` (2.5D package on organic substrate, BLR (board-level reliability) mount,
SAC305 600 um balls at 1.0 mm pitch). Chosen because it gives ball, standoff, substrate and board numbers in one paper.

## Structure drawn (top to bottom)

| y (px) | Layer | Material / rendering |
|---|---|---|
| 0-5 | Si interposer back side (cropped) | close dark horizontal cuts |
| 5-27 | interposer-to-substrate gap: Cu/SnAg bumps at 150 um pitch in capillary underfill | stipple (filled epoxy), vertical cuts (Cu post), light vertical cuts (solder) |
| 27-41 | top SR (solder resist) + L1 pads | stipple + light lines; Cu = dense cuts |
| 41-70 | top build-up: L2-L5 Cu levels, 4 dielectric films | thin lines, Cu traces/planes as dense cuts |
| 70-434 | core, 1.3 mm, plated through holes (resin plugged, Cu lids) | open horizontal lines, glass cloth as lens-shaped fill yarns + weaving warp yarn |
| 434-468 | bottom build-up: L6 (core Cu, PTH lids), BU1, L7, BU2, L8, BU3, L9, BU4; stacked 40 um microvias under each ball pad | as above; vias = vertical cuts |
| 468-477 | L10 BGA pads (SMD (solder-mask-defined), 700 um) + bottom SR, opening 500 um | Cu cuts; SR stipple |
| 477-600 | SAC305 solder balls (truncated spheres) in air | contour hatching on latitude circles + meridian cross-hatching in shadow; cavity = dense horizontal + cross-hatching |
| 600-610 | board pads, NSMD (non-solder-mask-defined) 400 um, Cu; solder fillet on the pad sidewall; SR 30 um with 500 um openings | Cu cuts; SR stipple; clearance ring dark |
| 610-1080 | board laminate (cropped at ~1.68 mm of 2.8 mm) with inner Cu planes | lines + glass lenses; diagonal cuts darken toward the lower plate edge |

## Dimensions and sources

| Quantity | Value used | Source |
|---|---|---|
| BGA pitch | 1000 um | `ectc51909.2023.00155-a-i4` (p.2 Table 3); same value in 22 atlas `bga`/`solder_ball` rows |
| Ball diameter (as placed) | 600 um, SAC305 | `ectc51909.2023.00155-a-i4`; also `ectc51846.2026.00073-a-i5`, `ectc51529.2024.00265-a-i2`, `tcpmt.2026.3672227-a-i2` |
| Package-to-board standoff | 444 um (measured) | `ectc51909.2023.00155-a-i4` notes; text p.7 Sec. III.G. Interpreted as package SR surface to board SR surface |
| Package bottom SR | 18 um, opening 500 um | `ectc51909.2023.00155-a-L19` (Table 3) |
| Package BGA pad | 700 um, SMD | `ectc51529.2024.00265-a-L10` / `-L11` (1.0 mm pitch, SR opening 500 um). 00155 does not state its pad diameter |
| Build-up | 4 films per side, 15 um each; microvia 40 um; L/S 14/20 um | `ectc51909.2023.00155-a-L16`, `-L18`, `-i6` |
| Build-up Cu thickness, package pad Cu | 15 um | not reported. Derived: 1300 + 2 x (18 SR + 4 x 15 film + 5 x 15 Cu) = 1606 um vs stated total 1.6 mm (Table 3) |
| Core | 1300 um CCL (copper clad laminate); through hole 200 um | `ectc51909.2023.00155-a-L17`, `-i5` |
| PTH wall Cu | 20 um | assumption (not reported); typical plated-through-hole average thickness |
| Board pad | 400 um NSMD, SR 30 um, opening 500 um | `ectc51909.2023.00155-a-L20` (Table 4) |
| Board pad Cu | 35 um | assumption (not reported); 1 oz finished outer-layer Cu |
| Board total, layer stack | 2.8 mm; layer count not reported | `ectc51909.2023.00155-a-L21`. Drawn: dielectric 360 um / Cu plane 35 um repeating (8-layer-like), illustrative only |
| Interposer-to-substrate bumps | 150 um pitch, Cu/SnAg 75 um dia, Cu 30 um, SnAg 25 um; gap 81 um | `ectc51909.2023.00155-a-i3`, `-a-L14` |
| L1 C4 pad | 90 um | assumption (not reported; 50 um SR opening + 20 um SR overlap each side) |

Collapsed ball shape (derived, not measured): a truncated sphere through the two wetting circles, radius 250 um at the
package SR surface (SR opening) and 200 um at the board pad top, height 439 um (444 um standoff minus the 5 um the pad
top stands above the board SR). Result: sphere radius 316 um, center 245 um above the board pad, maximum diameter
633 um (177 px). Volume of that segment plus the SR-opening neck = 1.19e8 um^3 vs 1.13e8 um^3 for a 600 um sphere
(+5 %, within the unreported paste volume), so the shape is consistent with the stated ball and standoff.

## Figures looked at (visual reference only, nothing traced)

`ectc51909.2023.00155-f02`, `ectc51909.2023.00155-f08`, `estc60143.2024.10712129-f03`, `ectc.2011.5898527-f01`.

## Deliberate deviations

- Sectioned balls are toned like spheres (light from upper left, reflected light on the lower rim). A true section face
  is flat; sphere-like tonal modeling is the usual schematic convention and the outline is the true section outline.
- The cavity between balls is dark cross-hatching (air; the next ball row hides directly behind each ball).
- Surface finishes (ENIG/ENEPIG/OSP) and IMC (intermetallic) layers are not drawn (under 2 px at this scale).
- Glass cloth ply count, yarn size and weave phase are illustrative; 00155 does not specify the cloth.
- Routing is illustrative: stacked microvias under every pad, every second ball routed on L7 to a PTH lid; L6/L9 drawn
  as planes with clearances. Board dog-bone vias are not in this section plane and are not drawn.
- Interposer bump joints at the top are simplified (Cu post + solder, no pad recess detail).
