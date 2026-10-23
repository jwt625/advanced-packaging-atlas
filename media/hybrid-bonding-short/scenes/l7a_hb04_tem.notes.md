# l7a_hb04_tem: L7 Cu-Cu hybrid bond, W2W, 0.4 um pitch, false-color STEM-EDS

**Slot (owner decision, 2026-10-22):** this file now fills the L7 **pass-B** shot: 1 beat = 0.5 s, overlay "0.4 µm" riding the line, `meta.text = 'light'`. The file name is kept; the coordinator swaps the references in `edit.json`. **Speed: 1** (the motion is settled by 0.38 s scene time).

## Style

Contemporary scientific imaging. Layers, bottom to top:
- **Base image:** HAADF-like grain contrast. Cu grains carry bend contours, annealing-twin lamellae and thickness fringes at inclined grain boundaries; the amorphous dielectric carries fine speckle.
- **EDS tints:** the base is multiplied by blurred element tints: Cu orange, SiCN cyan-teal, SiO2 blue-violet, Ta magenta, interfacial SiOx pale blue.
- **Counts:** sparse shot-noise EDS counts on top.
- **Static textures:** FIB curtaining streaks, low-frequency lamella-thickness variation and screen-fixed scan-line rows.

All noise is seeded once in `init`.

## Section and framing (my own composition)

- **Section plane:** a daisy-chain via-chain section cut **along the M1 links**, so the links lie in the image plane.
  - Top wafer: M1T links join columns (0,1), (2,3), ... and sit at the top edge of the frame.
  - Bottom wafer: M1B links join (1,2), (3,4), ... and lie just below the frame.
- **Scale:** 700 px/um (1 nm = 0.7 px), so the 0.4 um pitch is 280 px and 6.9 pitches cross the frame.
- **Vertical crop:** asymmetric. The full top stack is shown (link, via, pad); the bottom shows the pad and the via running off the lower edge.
- **Bond interface:** the boundary between rows 599 and 600 (y = 600).

## Structure drawn (top to bottom)

| Layer | Material | y (px, t=0) | Size used | Source / basis |
|---|---|---|---|---|
| Top-wafer ILD (cropped) | SiO2 | 0-19 | - | assumed oxide; not stated |
| M1T links | Cu, TaN/Ta liner on sides and far face | 19-110 | 0.13 um thick; each link spans pitch + 0.30 um | 0.13 and 0.30 um: my estimates from the `iedm45741.2023.10413829-f01` scale bar (+/-15 %); link topology `ectc51846.2026.00183-a-L02/L05` (fig f03) |
| Cu cap on M1 | SiCN | 110-120 | ~15 nm | assumption (standard Cu BEOL cap); not stated in sources |
| ViaT | Cu in SiO2 | 110-320 | 0.30 um tall, CD 0.16 um (pad side) to 0.14 um (M1 side) | my estimate from the `iedm45741.2023.10413829-f01` scale bar; oxide around the bond via per `ectc51846.2026.00187-a-L04` |
| PADT | Cu in SiCN | 320-600 | 0.40 um tall, CD 0.20 um at the bond surface, 0.188 um at the far end | CD: `ectc51846.2026.00187-a-i2` (0.2 um at 0.4 um pitch), `ectc51846.2026.00183-a-i3`, `iedm45741.2023.10413829-a-i5` (equal-pad 0.226 um in `-a-i1`). Height: my scale-bar estimate as above. SiCN: `iedm45741.2023.10413829-a-L05`, `ectc51846.2026.00130-a-L06` |
| Interfacial SiOx | SiOx at the SiCN-SiCN bond | rows 598-600 | 3 px = 4.3 nm | `ectc51909.2023.00190-a-L06` (TEM 4.43 / 4.89 nm) |
| PADB, ViaB | mirror of the top wafer | 600-880, 880-1090 (via cropped) | same | `iedm45741.2023.10413829-a-L06/L07` (equal-pad stack order) |

Further sources and bases:
- **Pitch 0.4 um:** `iedm45741.2023.10413829-a-i1`, `ectc51909.2023.00008-a-i1`, `ectc51846.2026.00183-a-i3`, `ectc51846.2026.00187-a-i2`.
- **Pad + via as one Cu body:** pad and via are one dual-damascene Cu body (`ectc51909.2023.00008-a-L01/L03`, BPM/BPV formed by dual damascene).
  - The Cu runs straight from via into pad; there is no barrier across the junction.
  - The TaN/Ta liner covers the outer walls only: pad sidewalls, the pad ledge outside the via footprint, via sidewalls and the via landing on M1. It is open on the bonding face, where the Cu is exposed.
- **Barrier material:** PVD TaN/Ta (`ectc51846.2026.00130-a-i1`, `-a-L05`). A Ta liner is also seen in the EDS map at 0.4 um pitch (`ectc51846.2026.00183-a-L03`).
- **Barrier thickness:** not reported in any atlas source. I drew it at 4 px (~6 nm) because a few nm is the usual PVD liner range and a 1-2 px line would vanish under the EDS blur.
- **Taper:** every feature widens toward the bond interface, because each wafer's processing surface faces it.
- **Overlay:** the top wafer is shifted by +25 nm (17.5 px). This is within the reported overlay: <80 nm over 95 % of the wafer (`ectc51846.2026.00130-a-i1`), <50 nm (`ectc51846.2026.00187-a`), <150 nm on the best wafer (`iedm45741.2023.10413829-a-i1`).
- **Cu recess (dishing) before anneal:** up to 2.5 nm per side (1.75 px), parabolic across the pad. Basis: `iedm45741.2023.10413829-a-L05` (pad height 0 to -2.5 nm by AFM); `ectc51846.2026.00130` reports <1 nm on average. The recess closes on anneal (Cu expansion of ~1.5 nm, `ectc51846.2026.00130` fig f14).
- **Grains:**
  - A few grains per pad, in bamboo-like segments, some of them twinned. The link M1 carries about six grains.
  - This is consistent with large (111) grains spanning the pads (`ectc51846.2026.00130-f06`).
  - Grain sizes, twin widths and bend-contour spacing are rendering texture only, not featured dimensions.

## Motion

- **Anneal:** progress u = (1 - exp(-t / 0.13 s)) / (1 - exp(-0.38 / 0.13)) for t < 0.38 s, and u = 1 after (settled).
  - Timing history (2026-10-22), always the same curve family, end state and grains; only the time axis changed:
    1. u = 1 - exp(-t / 0.7 s).
    2. Then 0.85 s / tau 0.28 s for a 1.0 s slot.
    3. Now 0.38 s / tau 0.13 s for the 0.5 s pass-B slot.
  - The dishing gap closes by u = 0.45 (t ~ 0.07 s), with the seam visible at t = 0.
  - Grains cross the interface from t ~ 0.1 s: one seeded grain per column (top or bottom pad) grows across the Cu-Cu interface, breaking up the straight boundary. The end state is reached at 0.38 s.
  - Basis: cross-interface grain growth after post-bond anneal (`ectc51846.2026.00187` Sec. III.A, fig f03).
- **Stage drift:** 14 px/s to the left (7 px over the 0.5 s shot, 42 px at t = 3 s). The line stays at y = 600, and every t in [0, 3] s looks good.
- **Per-frame work:** only pad and via Cu pixels within 150 rows of the interface are recomputed; everything else is static.

## Text band (pass B)

- **Region:** x 560-1360, y 500-592 is calm by construction.
- **Weight:** a screen-fixed calm weight, feathered over x 300-560 and 1360-1620 and over y 452-500, is cut off at y 593-598 so the interface rows stay untouched.
- **Effect inside it:**
  - Grain contrast, twin and bend-contour detail, noise and EDS counts flatten toward a dark mean, and the brightness drops to ~40 %.
  - The pad and dielectric shapes stay visible at low contrast, with no fine detail.
- **Cost and check:** computed per pixel inside the per-frame band, so there is no extra canvas pass. Verified with `--param text="0.4 µm"`, `--dur 0.6 --n 8`.

## Styled text

Styled text (2026-10-23): the `text` hook letters "0.4 µm" as a STEM / EDS software annotation burned into the image
(lib/textfx.js loaded): APA Grotesk 600 at `info.size`, pure white fill, thin near-black outline (4 px stroke, 2 px
outside the glyph, round joins) and a 1.5 px hard drop shadow; no plate, no instrument text beyond the word. Static
(annotations do not follow the stage drift); centred on x = 960, baseline `info.baseline`, rows 517-579, inside the
darkened calm band. Contrast vs the no-text band (t = 0 / 0.3 s): white pixels median 15.0:1, p5 13.6:1, min
9.7:1. Shot l7b: mean 351 ms/frame (`render_video.py frames`).

## Figures looked at (visual reference only; nothing traced or embedded)

`iedm45741.2023.10413829-f01` was used for the dimension estimates only. `ectc51846.2026.00183-f01`, `ectc51846.2026.00183-f04` and `ectc51846.2026.00187-f03` were used for the general TEM / EDS look.

## Deliberate deviations

- **Hairline features:** the recess (1.75 px per side) and the SiOx (3 px) are drawn to true scale. The 6 nm barrier thickness is my choice, not a sourced value.
- **Anneal timing:** the 1-2 h furnace anneal (`ectc51846.2026.00187`: 210-350 C, 2 h) is compressed to 0.85 s.
- **Cross-interface grain growth:** it is pronounced in fine-grain Cu, while standard Cu often keeps a distinct interface (`ectc51846.2026.00187` Sec. III.A).
  - The scene shows the documented fine-grain end state.
  - Columns where the growing grain does not reach far keep part of the straight boundary.
- **Composite rendering:** the HAADF base times EDS tints is a stylisation. Real EDS data is usually shown per element or as a pure-color overlay.

## Render

- **In-page render:** 36-59 ms/frame (probe, SwiftShader).
- **render_video.py sheet:** 370 ms mean, 501 ms max per frame (`--dur 0.6 --n 8`, with text). This was measured while the machine was loaded (load average ~9.7, other scenes rendering), and it includes the PNG screenshot. The trivial `s00_horizon` scene reported ~304 ms mean on an idle machine.
