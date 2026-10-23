# l2b_c4_nouveau: C4 flip-chip bumps, 150 um pitch, Art Nouveau stained glass (pass B)

Level L2 of DevLog-015: C4 (controlled-collapse chip connection) solder bumps joining a Si die to an organic build-up
substrate. Cross-section through a bump row during reflow (before underfill). Scale 2.0 px/um, pitch 300 px, bump
row centred on x = 960 (a gap at frame centre). Joint plane on y = 600: top surface of the substrate Cu pads.
`meta.text = 'dark'`; overlay "150 µm" sits on the ivory gap band.

## Structure drawn (top to bottom)

Same stack and dimensions as `l2a_c4_ukiyoe.notes.md` (sources listed there), without underfill:

| Element | Value | Source / basis |
|---|---|---|
| Si die (stained-glass panel), BEOL 10 um, Al pad 80 um x 2 um | cropped / estimates | see l2a notes |
| Passivation 7 um, opening 50 um | | eptc59621.2023.10457909-a-L01; opening estimate |
| UBM 75 um dia, 5 um below the die face | estimate | see l2a notes |
| SnAg C4 joint, pitch 150 um, max dia 90 um, joint height 70 um (final) | | ectc51909.2023.00235-a-i4; ectc51846.2026.00227-a-i1/-i2; ectc51846.2026.00176-a-i3 |
| Gap (air, no underfill yet) | 70 um die face to SR top | follows from the stack |
| SR 20 um over dielectric, SMD opening 75 um | | ectc51906.2022.00180-b-L02; ectc51846.2026.00073-a-i4 |
| L1 Cu pad 105 um x 15 um, ENEPIG Ni line | | ectc51687.2025.00148-a-L06; ectc51909.2023.00235-a-L01; diameter estimate |
| ABF 30 um x 5, Cu 15 um, microvias 36/26 um, stacked/staggered | | see l2a notes |

## Motion

- Signature motion, ornament growth (all a function of t): six whiplash stems grow out of the foot of the Si panel along
  fixed paths, length fraction f = 1 - exp(-(t - d)/0.15) with start delays d = 0-0.12 s (f = 0.92-0.96 at 0.5 s).
  While growing, each tip carries an extra curl (fiddlehead) that relaxes as f -> 1; leaves open once the stem has
  passed them. A running vine creeps outward from the halo along the panel foot (tau 0.2 s) with tendrils that unfurl
  as it passes; the bottom frieze scroll is drawn on from the centre outward (tau 0.18 s). After growth: gentle sway
  (stem base angle +/- 0.018 rad, leaf angle +/- 0.05 rad, tendril curl +/- 0.12 rad) through t = 3 s.
- All ornament stays inside the Si panel (above y = 416 - lift) or in the frieze band (y >= 1025); the text band never
  carries ornament at any phase.
- Reflow collapse: the die starts 10 um above its final stand-off and settles exponentially (time constant 0.32 s);
  each molten joint keeps its volume while its wetted ends (UBM 75 um, SR opening 78 um) stay fixed, so it shortens
  from 80 um to 70 um and its waist grows from 81 um to 90 um diameter. The 10 um collapse amplitude is illustrative
  (no atlas value); the final shape matches the atlas dimensions.
- Camera pan 24 px/s to the right (content moves left; 72 px at t = 3 s).

## Text band (x 560-1360, y 500-592)

Contains the lower halves of the bumps (pale pewter, mid-tone soft outlines) on an ivory gap and the SR top rail at
y = 590. No ornament, no fine detail there; text tone dark.

Styled text (2026-10-23, `text` hook, lib/textfx.js): 'APA Nouveau' (Cinzel Decorative) for the figures it draws
legibly; Cinzel is a caps face (its '1' is a bare I, lowercase are small caps, its U+03BC is a capital-mu form, so
"150 µm" read "I50 MM"), so '1', lowercase and the micro sign come from 'APA Serif' (Newsreader wght 500, scaled
to Cinzel's figure height). Lead-brown fill (#2b2318), a pale-gold glass rim (goldLt, 0.04 em) and an outer lead
hairline, like a pane in its came; one restrained whiplash came under the word (sagging S rolling into a small
spiral at each end, lead with a gold core) drawn on from the centre outward (scene tau 0.09 s, done in < 0.1 s shot
time at speed 2.4). Word complete from frame 0. tone 'light' inverts to ivory fill / lead rim. Contrast (t = 0.3 s
frame, measured): fill vs band mean 8.1:1, vs worst-decile band pixel 6.3:1.

## Figures looked at (visual reference only)

ectc51846.2026.00227-f01, ectc51846.2026.00227-f03, ectc.2011.5898527-f04, ectc51909.2023.00235-f01,
ectc51906.2022.00106-f01.

## Deliberate deviations

- The Si bulk is rendered as a stained-glass panel: Mucha-style halo, radiating cames, growing whiplash stems, leaves,
  a running vine with tendrils. This is ornament on a uniform Si region, not structure; the C4 geometry is fixed.
- ABF layers are tinted in alternating sage glass tones (one material in reality); lead lines outline every region.
- A gold-and-olive frieze along the bottom 55 px (y 1025-1080, fixed to the frame) crops the deepest build-up layers (L6 Cu and
  part of the fifth dielectric); poster framing, not structure.
- Joint profile is a parabolic barrel between fixed wetted ends; real molten-solder profiles are close to this but
  not exactly parabolic.

## Render

- Render ~64 ms/frame (APA.frame only, SwiftShader; ornament drawn on a software canvas, then composited); sheet log
  mean 378 ms incl. PNG screenshot.
- Sheets: `cache/video/sheets/l2b_c4_nouveau__text-150m.png` (+ `__full.png`), `cache/video/sheets/l2b_c4_nouveau.png`.
