# l4b_ubump_bauhaus - L4 fine-pitch microbump on TSV, 10 um pitch, Bauhaus (pass B, overlay "10 µm")

Style: Bauhaus colour-plane composition (Kandinsky / Moholy-Nagy / Bayer vocabulary): flat primaries with black and
off-white, bars, squares and one large disc, no gradients, no outlines. The topology is the structure itself: TSVs are
vertical bars, vias are squares, dies are planes, the dielectric layers are horizontal bands, the solder joints are the
yellow bodies on the joint line. One colour per material, identical in both dies:

| Material | Colour |
|---|---|
| Cu (TSV core, M1 plates, vias, pad top) | black |
| Sn solder | yellow |
| Ni (raised UBM, pad Ni) | red |
| Ni3Sn4 IMC | orange (the Ni-red / Sn-yellow mix) |
| Dielectric (backside oxide + BEOL dielectric, front-side BEOL dielectric, TSV liner/barrier edge) | blue |
| Si | off-white; red inside the disc |
| Capillary underfill | pale warm grey |

The disc (r 480 px, centre x 1250) is a rising sun: screen-anchored, painted only into the two Si planes, behind the
bond strip; a compositional device, not an object. Its centre rises from y 1250 (only a cap showing in the lower Si
plane) to y 610 as y(t) = 610 + 640 exp(-t / 0.06 s): 0.8 px left at 0.40 s, 0.4 px at 0.44 s, then it holds
through t = 3 s. It enters the upper Si plane at t ~ 0.07 s. (Timing change 2026-10-22: tau was 0.18 s, which left
the rise at 94 % at the 0.5 s cut of the 1-beat shot; a per-shot `speed` of ~2.9 would also have tripled the pan, so
the time constant was changed instead; disc geometry and pan unchanged.) Overlay: `meta.text = 'dark'`; the text band (x 560-1360, y 500-592)
holds only yellow solder, pale underfill and the orange IMC strip (y 506-525), all light, flat and low-contrast to each
other; no black or blue enters the band, and the disc never enters it (it paints Si only), so the band is identical at
every phase of the rise; checked on 8-frame sheets over t = 0..0.6 s and 12-frame sheets over 0..3 s with the overlay.
Motion: the sun rise, plus the structure panning left at 30 px/s (a CUF gap is centred on x = 960 at t = 0).
Render: mean 132 ms/frame, max 510 ms (first, warm-up frame), 12-frame sheet t = 0..3 s with the overlay (2026-10-22).
Styled text (2026-10-23): the scene's `text` hook letters "10 µm" itself (lib/textfx.js loaded). Glyphs are built only from
circles and bars in Herbert Bayer's universal-alphabet manner (perfect-circle 0, flagged bar 1, u-bowl + descender bar
µ, two-arch m), proportions from APA Bauhaus 700 metrics at 1.15 x `info.size`; Kandinsky's form-colour pairing: circle
parts blue (#1a4291, PAL.blue deepened ~10 % for contrast on the IMC strip), bars black (PAL.black). The circle parts
settle 3 px upward with the sun's tau (0.06 s); legible at t = 0. Centred on x = 960, baseline `info.baseline`, ink
rows 510-584. Contrast vs the no-text band at t = 0 / 0.3 s (per pixel): black median 10.9:1 (p5 6.0:1), blue median
5.6:1 (p5 3.5:1, min 3.2:1). Characters outside the constructed set fall back to APA Bauhaus 700 black. Shot l4b:
mean 139 ms/frame (`render_video.py frames`).

## Structure and dimensions

Geometry is identical to the settled (bonded) state of `l4a_ubump_chalk` (same constants, same solder profile, same
volume-derived standoff); full table with sources in
`l4a_ubump_chalk.notes.md`. Summary, scale 26 px/um, z above the joint plane (y = 600 - 26 z):

- Upper die Si (50 um, cropped), TSV 5 um hole (Cu core 4.5 um + 0.25 um liner/barrier), coaxial with each bump:
  `ectc51906.2022.00179-c-L08`, `-c-i1`; liner/barrier values `ectc51687.2025.00071-a-L02`, `-a-L03`.
- Backside oxide 3 um (z 7.21-10.21), M1B 1.06 um x 8 um (z 6.15-7.21), VIA1B 0.52 um x 0.54 um, 5 per bump
  (z 5.63-6.15): `ectc51906.2022.00179-c-L07`, `-c-L06`, `-c-L05`, `-c-i2`.
- Ni raised UBM 2 um x 7 um (z 3.63-5.63), Ni3Sn4 0.7 um (z 2.93-3.63), Sn 2.93 um bonded standoff, 7 um at the
  UBM widening to 8.6 um on the pad: `ectc51906.2022.00179-b-L03`, `-b-i2`; standoff derived by Sn volume
  conservation from the 3.5 um pre-bond Sn (see l4a notes).
- Capillary underfill between bumps: `ectc51906.2022.00179-a-L03`, `-b-L04`.
- Joint plane y = 600: top of the lower-die pad (Cu 0.5 / Ni 0.5 um, 9 um dia), flush with its dielectric:
  `ectc51906.2022.00179-c-L10`; thicknesses and diameter `tcpmt.2025.3628798-a-L08`, `-a-L09`, `-a-i2`.
- Lower die: VIA1F, M1F (BS values reused, FS not stated: `-c-L09`), Si with the TSV continuing down.
- Pitch 10 um, bump 7 um: `ectc51906.2022.00179-b-i2`.

## Figures looked at (visual reference only, nothing traced)

ectc51906.2022.00179-f01, ectc51906.2022.00179-f03, ectc51906.2022.00179-f06, ectc51906.2022.00179-f16,
ectc51906.2022.00179-f17, tcpmt.2025.3628798-f11.

## Deviations from reality (deliberate)

- Colours are a material code, not material appearance; the disc recolours Si only.
- The 0.15 um oxide liner and 0.10 um Ta barrier are merged into one 0.25 um dielectric-blue edge on each TSV.
- Omitted, as in l4a: Ni spacer dummy bumps, pre-metal dielectric / FEOL under M1F, pad-side IMC.
- TSV fill drawn Cu (not named in the source; standard TSV-middle fill).
