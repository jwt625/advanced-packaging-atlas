# l7b_hb04_swiss: L7 Cu-Cu hybrid bond, W2W, 0.4 um pitch, Swiss International Style

**Slot (owner decision, 2026-10-22):** this file now fills the L7 **pass-A** shot (eras by section: Swiss Style, 1950s, is pass A). The slot is 2 beats = 1.0 s with no overlay text. The file name is kept; the coordinator swaps the references in `edit.json`. **Speed: 1** (the assembly settles by 0.86 s scene time). Remove the old pass-B `speed 2.0` / `text` params from this shot.

## Style and composition

- **Vocabulary:** Swiss International Typographic Style (Mueller-Brockmann). Flat color fields only, with no gradients or texture.
- **Module grid (0.1 um = 65 px), what is actually on it:**
  - On the module: pad width and gap (2 each), pad height (4), via height (3), M1 width per column end (3) and link length (pitch + M1 width = 7).
  - On the module at t = 0 only: horizontal positions, with the grid origin at x = 0. Pad edges sit at 455 + 260 k, the array-edge column at 520 and the red column at 780-1170. The pan then shifts everything off-grid.
  - Vertical edges sit on a grid anchored at the line y = 600: 340, 145, 860 and 1055 are on it.
  - Off the module: via width (1.6 modules, 0.16 um), M1 thickness (1.3 modules, 0.13 um, so M1 edges at 60.5 and 1139.5) and the 3 px SiOx rule. These keep their true dimensions rather than being snapped.
- **Dominant field:** the whole top wafer is one red field, 55 % of the frame. The SiCN bond layer is one tonal step darker, and top Cu is tonal dark red.
- **Accent:** black is reserved for the bottom pads, the featured element. Everything else is paper and tonal greys.
- **Asymmetric tension:** the daisy chain ends at an array edge on the left (first column at x = 520 at t = 0), leaving ~450 px of open red over open paper. The 3 px black SiOx rule on y = 600 carries the eye across that space into the pads.
- **No text in the scene, and no overlay in this slot.** `meta.text = 'light'` is kept only in case a cue is ever added; the red column at t = 0 would sit under centred type.

Scale: 650 px/um. Pitch 0.4 um = 260 px. Bond interface on y = 600.

## Motion (kinetic assembly on the grid; all a pure function of t; timed for the 1.0 s pass-A slot)

| t (s) | Event |
|---|---|
| 0 | Paper ground with a red column at x 780-1170 (modules 12-18) |
| 0-0.40 | Red field opens sideways to full width (ease-out cubic) |
| 0.04-0.49 | SiOx rule draws left to right along y = 600 |
| 0.10 + 0.06 k | Column k (array edge first): the bottom pad rises through its SiCN slot and the top pad drops through its slot 0.03 s later (ease-out expo, 0.3 s). Each pad is clipped to its own layer, so nothing crosses the line |
| +0.10 / +0.13 | Vias slide in the same way through the oxide slot (0.25 s) |
| 0.34-0.86 | Chain links wipe in from their left ends (0.36 + 0.05 k, 0.2 s each); the column-0 lead runs out to the left edge |
| ~0.75-0.86 | Settled (visually complete by ~0.75 s, within 1 px by 0.86 s); after this only the pan |

- **Pan:** 28 px/s throughout, content moving left (56 px over 2 s; the limit is 60 px). Line fixed at y = 600.
- **Readability:** within 0.5 s the field is open and 5 columns have pads in place or nearly in place.
- **Hold:** from 0.86 to 3 s the composition holds with the pan.
- **Verified:** sheets over 0-1.0 s and 0-3.0 s without text.

## Structure drawn (final state, top to bottom)

| Layer | Field / shape | y (px) | Size used | Source |
|---|---|---|---|---|
| Top-wafer oxide (via + M1 levels) | red `#d52b1e` | 0-340 | - | oxide around the bond via: `ectc51846.2026.00187-a-L04` |
| M1T daisy-chain links | tonal dark red, joining columns (0,1), (2,3), ... | 60-145 | 0.13 um thick, 0.30 um wide per column end | estimated from `iedm45741.2023.10413829-f01` scale bar |
| ViaT | tonal dark red | 145-340 | 0.30 um tall, 0.16 um wide | estimated from `iedm45741.2023.10413829-f01` |
| Top SiCN bond layer | red, one tonal step `#cd281c` | 340-600 | 0.40 um | `iedm45741.2023.10413829-a-L05`, `ectc51846.2026.00187-a-L05` |
| PADT | tonal dark red `#ac1d14` | 340-600 | CD 0.20 um, height 0.40 um | CD: `ectc51846.2026.00187-a-i2`, `ectc51846.2026.00183-a-i3`, `iedm45741.2023.10413829-a-i5`; height estimated from `iedm45741.2023.10413829-f01` |
| Interfacial SiOx | 3 px black rule on y = 600; pads cover it where Cu meets Cu | 598.5-601.5 | 4.6 nm | `ectc51909.2023.00190-a-L06` (4.43-4.89 nm) |
| PADB | black | 600-860 | CD 0.20 um (equal pads) | `ectc51846.2026.00187-a-i2`, `iedm45741.2023.10413829-a-i1` (equal-pad design) |
| Bottom SiCN bond layer | paper `#ece8df` | 600-860 | 0.40 um | as above |
| ViaB, M1B links (1,2), (3,4), ...; column 0 M1B is the lead to the left edge | tonal grey on paper grey | 860-1080 (M1B cropped) | as top | as top |

- Pitch 0.4 um: `iedm45741.2023.10413829-a-i1`, `ectc51909.2023.00008-a-i1`, `ectc51846.2026.00183-a-i3`, `ectc51846.2026.00187-a-i2`.
- Daisy-chain topology (links alternate between the top and bottom wiring levels): `ectc51846.2026.00183-a-L02/L05`, fig `ectc51846.2026.00183-f03`.

## Figures looked at (visual reference only)

`iedm45741.2023.10413829-f01`, `ectc51846.2026.00183-f01`, `ectc51846.2026.00183-f04`, `ectc51846.2026.00187-f03`.

## Deliberate deviations (geometric abstraction)

- **Rectangles only:** the following real features are omitted:
  - Sidewall taper: the pad narrows from 0.20 to ~0.19 um and the via from 0.16 to 0.14 um (values from the A scene).
  - The TaN/Ta liner (~6 nm).
  - The CMP recess (<= 2.5 nm).
- **No overlay error:** pads are drawn perfectly aligned (the design intent). The A scene shows a 25 nm offset.
- **Color encodes wafer, not material identity.** The top-wafer oxide and SiCN are both red (one tonal step apart), and the top and bottom SiCN differ (red vs paper). Top Cu is tonal so the type band stays calm. Black is used only for PADB.
- **The assembly is a graphic device, not a process step.** Pads, vias and links are never fabricated or moved like this. The settled frame (t >= 0.8 s) has the true geometry.
- **The array edge on the left is a compositional choice.** Real 0.4 um daisy chains sit in dense arrays, but a dielectric-only field at the array edge is still topologically valid.
- **The cut runs along the M1 links** (links in plane). The A scene cuts across them. Both are valid sections of a daisy chain.

## Render

- In-page render: 0-5 ms/frame.
- render_video.py sheet: 57 ms mean, 129 ms max (0-1.0 s); 58 ms mean, 122 ms max (0-3.0 s). Both include the screenshot.
