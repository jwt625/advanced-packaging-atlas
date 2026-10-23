# l2a_c4_ukiyoe: C4 flip-chip bumps, 150 um pitch, Edo woodblock print (pass A)

Level L2 of DevLog-015: C4 (controlled-collapse chip connection) solder bumps joining a Si die to an organic build-up
substrate. Cross-section at the die edge during capillary underfill; animated hero shot of the solder generation. Scale 2.0 px/um,
pitch 300 px; die edge at x = 240, five bump columns at x = 640 + 300 k.
Joint plane on y = 600: top surface of the substrate Cu landing pads.

## Structure drawn (top to bottom)

| Element | Drawn | Value | Source / basis |
|---|---|---|---|
| Si die bulk | grey block, die edge at x = 240, cropped by the frame top | full thickness not shown (775 um in ectc51846.2026.00227-a-L01) | cropped |
| BEOL | dark band with wiring dashes | 10 um | estimate; not featured |
| Al pad | thin pale strip in the BEOL top | 80 um wide, 2 um thick | estimate |
| Passivation | dark band, opening over each Al pad | 7 um; opening 50 um | thickness: eptc59621.2023.10457909-a-L01 (PI 7 um); opening estimate |
| UBM (under-bump metallization) | ochre plug through the opening plus disc below the die face | 75 um dia, 5 um below the passivation | diameter estimate = SR opening (symmetric joint); thickness estimate, atlas UBM rows 4 um (ectc51687.2025.00049-a-L04), 7 um (ectc51906.2022.00135-a-L03) |
| C4 solder joint (SnAg) | collapsed barrel, wets UBM and fills the SR opening | pitch 150 um; max dia 90 um; joint height pad-top to UBM 70 um | pitch: ectc51909.2023.00235-a-i4, ectc51846.2026.00227-a-i1/-i2, ectc51906.2022.00106-a-i2; dia: ectc51909.2023.00235-a-i4 (Table I, 90 um); height: between 64 um (ectc51846.2026.00227-a-i1) and 75 um (ectc51846.2026.00227-a-i2), measured avg 69.3 um after reflow (ectc51846.2026.00176-a-i3); alloy Sn1.8Ag (ectc51846.2026.00227-a-L08) |
| Capillary underfill | Prussian-blue fluid: bead at the die edge, flow front in the gap | gap die face to SR top 70 um (follows from the stack); bead 225 um high on the die wall, 250 um wide | process: capillary underfill after chip join (ectc51909.2023.00235 p.2 Sec. II.D; tcpmt.2023.3312037-a-i2); bead size estimate |
| Pad finish | thin ochre line on the pad inside the SR opening | Ni of ENEPIG, ~1.5 um drawn | ENEPIG pads: ectc51909.2023.00235-a-L01 |
| Solder resist (SR) | green, solder-mask-defined openings | 20 um over the dielectric (5 um over the pad); opening 75 um at the pad, 78 um at the SR top | thickness: ectc51906.2022.00180-b-L02, ectc51846.2026.00119-a-L01 (20 um); opening: ectc51846.2026.00073-a-i4 (SR opening 75 um at 150 um min C4 pitch); top flare estimate |
| L1 Cu C4 pads | copper, SMD (SR overlaps the edge) | 105 um dia, 15 um thick | thickness: ectc51687.2025.00148-a-L06 (build-up Cu 15 um); diameter estimate (opening + 15 um overlap per side) |
| Build-up dielectric (ABF) | ochre field, 5 dielectric layers between L1..L6 Cu | 30 um each | ectc51846.2026.00123-a-L06, ectc51687.2025.00076-a-L02 (ABF 30 um) |
| Build-up Cu L2..L6 | via landing pads, traces, plane pieces (seeded) | 15 um thick; traces 12-30 um wide | thickness as L1; layout illustrative |
| Microvias | stacked / staggered filled vias under each C4 pad, depth 2-5 layers | 36 um top, 26 um bottom | estimate (atlas BVH 60 um in ectc51687.2025.00148-a-L04 is a coarser layer) |
| Stack count | 5 build-up metal layers above the core (core cropped) | 5/2/5 | ectc51846.2026.00073 Table I (12 layers 5/2/5) |

## Motion (hero shot of the solder generation)

Flow model (all a function of t, no randomness per frame):
- Capillary underfill leaves the dispensed bead at the die edge (x = 240) at t = 0 and advances left to right only
  inside the gap between the die face (y = 450) and the SR top (y = 590); all front drawing is clipped to that gap.
- Front position x_F(t) comes from a precomputed table of t(x) = integral dx / (v0 m(x)), with v0 chosen so the contact
  lines reach x = W + 60 at T_CROSS = 2.2 s (v0 = 801 px/s; mean 773 px/s = ~390 um/s; time-compressed, no atlas
  value for underfill flow speed). m(x) drops to ~0.45 where the meniscus meets each bump's left flank (the front pins and
  wets the bump) and rises to ~1.9 while the front is hidden behind the bump in this section (it wraps round out of
  plane), so the front re-emerges on the bump's far side and closes behind it, necks first (the concave meniscus shows
  its die-side and SR-side contact lines before mid-gap).
- Meniscus concave: contact lines on die and SR lead mid-gap by 17 um. Behind the front the gap is completely filled
  (no voids drawn; none shown in the sources looked at).
- Timing: front in the open gap by 0.2 s (x = 440); pinned on bumps 1-5 at t = 0.38, 0.77, 1.15, 1.54, 1.93 s;
  off the right edge at 2.2 s (x = 1980). From 2.2 to 3.0 s: fully filled gap; flow lines keep drifting downstream at 110 px/s and the
  bead's surface lines and foam keep sliding, so the frame stays alive without the front.
- Crest (secondary motion): the die-side contact line is drawn as a curling Hokusai lip (length 84 +/- 9 px, curl
  3.7 +/- 0.45 rad, lift +/- 0.1 rad on 3.9-5.3 rad/s clocks) with five claw fingers whose length and flick run on
  their own phases; two small fingers at the SR-side contact line curl upward.
- Flow lines in the filled gap move at 110 px/s (4.4 px/frame at 25 fps, spacing 64 px) so they never strobe; this is
  slower than the true mean fluid velocity, chosen for smooth 25 fps motion.
- Camera (pass-A group pan, owner request 2026-10-22): content moves left at 28 px per second of shot time (camera trucks right), horizontal only, constant (no ease), from t = 0; identical on screen across the pass-A group (l1a, l1fa, l2a, l3a, l4a, l5a, l6a, l7a slots). Scene-time rate = 28 / `speed`, read from the `speed` URL param (`APA.params.speed`), so the on-screen rate stays 28 px/s if the shot's speed is retimed. Measured on the rendered shot frames, f00 -> f24: 26.9 px leftward (substrate rows, speed 2.6; target 26.9). Scene-time rate
  28 / 2.6 = 10.8 px/s. The print (base, top layer, washi grain) is painted 120 px wider than the frame (pan clamps
  at 110 px; 84 px at 3 s shot time = 7.8 s scene time). The flow front, flow lines and bead motion keep their timing;
  the front still leaves the frame after T_CROSS (content x = W + 60 is at screen x 1956 at 2.2 s scene time). In-frame
  traces, BEOL dashes, grain and fibres are unchanged: margin detail comes from separate seeds (rndX). Frame 0 differs
  from before only in the last ~30 px at the right edge.

## Figures looked at (visual reference only)

ectc51846.2026.00227-f01, ectc51846.2026.00227-f03, ectc.2011.5898527-f04, ectc51909.2023.00235-f01,
ectc51906.2022.00106-f01.

## Deliberate deviations

- The curling crest, foam claws and foam lace are ukiyo-e ornament (Hokusai fingers) on a real concave meniscus. The
  crest and its claws protrude up to ~40 um ahead of the die-side contact line; the real front is a smooth meniscus.
- While the front is behind a bump in this section it is hidden; its speed there is raised and its speed at the bump
  flank lowered (pinning), a schematic of 3D wrap-around, not a computed flow field.
- Si die drawn with a woodblock ichimonji bokashi (dark wipe at the top) and wood grain; sky beside the die is
  decorative print background.
- Die edge to first bump centre 200 um, bead size and flow speed are estimates; flow is time-compressed to cross
  ~850 um of gap in 2.2 s.
- Colour-block offset of ~2 px from the key lines imitates woodblock misregistration.

## Render

- Render ~85 ms/frame (APA.frame only, SwiftShader); sheet log mean 322 ms incl. PNG screenshot.
- Sheet: `cache/video/sheets/l2a_c4_ukiyoe.png`, full frame `cache/video/sheets/l2a_c4_ukiyoe__full.png`.
