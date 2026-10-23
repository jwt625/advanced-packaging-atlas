# l3b_pillar_tiling: L3 Cu-pillar microbump array, 40 um pitch, Islamic geometric mosaic (top view)

Level L3 (DevLog-015). Role (owner decision 2026-10-22, eras by section): pass-A shot, edit.json slot l3a (2 beats,
1.0 s), no overlay text. File name kept. `meta.text = 'light'` is left set (harmless; the lapis border band stays plain).

## Style

Persian / Timurid mosaic faience: cut glazed pieces in lapis, turquoise, white and gold, set in dark grout, with
interlaced white strapwork (girih). Glaze texture: per-piece colour jitter, edge pooling, a soft sheen gradient,
pinholes and iron specks, hairline crazing, low-frequency mottling. No per-pixel noise (static, H.264 friendly).

Pattern construction (vocabulary of the style, built on the real bump grid): Hankin's polygons-in-contact method on
the 4.8.8 (octagon-square) tiling, with every octagon centred on a bump and the squares on the cell corners;
contact angle 67.5 deg. This gives the classic 8-point star and 4-point cross pattern: around each bump an 8-point
lapis star plus a ring of eight turquoise petals (the rosette), white 4-point crosses between four bumps. Straps
interlace with consistent alternation (at every crossing the strand leaving counter-clockwise is over).

## Motion (signature: the girih is constructed on the bump grid)

All a pure function of t; bumps, grid, border, text band and die edge are present and fixed from t = 0.

| t (s) | Phase |
|---|---|
| 0 | dark grout field, gold bump discs, thin gold construction guides (the 4.8.8 octagon-square polygons in contact) |
| 0.00-0.45 | white strapwork grows radially out of every bump (reveal radius from the bump ring to 0.71 P + strap width); straps interlace as they reach the crossings |
| 0.19-0.53 | lapis 8-point stars flood outward from the bumps |
| 0.32-0.68 | turquoise petals flood in; construction guides fade (0.21-0.69) |
| 0.47-0.85 | white 4-point crosses at the cell corners; glaze crazing and mottling fade in (0.53-0.85) |
| >= 0.85 | finished mosaic (single pre-composited panel), holds |

Build time is t * 0.8 / 0.85 (schedule authored to end at 0.80, stretched to settle at 0.85 s in the 1.0 s pass-A
slot); tuned for runtime `speed` = 1.

Camera (pass-A group pan, owner request 2026-10-22): content moves left at 28 px per second of shot time (camera trucks right), horizontal only, constant (no ease), from t = 0; identical on screen across the pass-A group (l1a, l1fa, l2a, l3a, l4a, l5a, l6a, l7a slots). Scene-time rate = 28 / `speed`, read from the `speed` URL param (`APA.params.speed`), so the on-screen rate stays 28 px/s if the shot's speed is retimed. Measured on the rendered shot frames, f00 -> f24: 26.9 px leftward (border-band rows; target 26.9). Was 30 px/s. 84 px at t = 3 s; clamps
at 94 px (panel margin 100 px) from t = 3.4 s. Straps and lapis are in by 0.5 s;
complete at 0.85 s; good for any t in [0, 3] s. The overlay text band (lapis border piece) is static and plain at
every phase.

## Geometry drawn and dimensions

View: top view of the die bonded on the interposer, showing the microbump array through the die (IR see-through
convention, as in IR inspection of flip-chip joints). The die edge is on y = 600 with the array above it; the field
below y = 600 is outside the die: the underfill fillet and interposer surface, drawn plain.

Scale 5.5 px/um; pitch 40 um = 220 px (lower end of the 220-320 px band, to fit two full rows above the border).

| Element | Drawn | Source / basis |
|---|---|---|
| Bump pitch | 40 um, square grid, columns at x = 960 + k * 220 (minus pan) | pitch: `ectc51529.2024.00155-a-i1`, `ectc51687.2025.00027-a-i1` (Table I). Grid type (square vs staggered) not stated in the source: square chosen |
| Bump diameter | 20 um = 110 px disc centred on each rosette (gold disc + dark outline; outline outer edge = bump edge) | same rows (bump diameter 20 um). A white ring and grout line sit just outside the bump edge (2-7 px), decoration |
| What is seen | the bump array of the bonded die seen through the die from above (IR see-through style top view; Si is transparent in the near IR): round bump footprints, 20 um dia | metallurgy Cu 13 / Ni 2 / SnAg 9 um, same rows |
| Last bump row to die edge | bump centre 43.6 um (240 px) above y = 600 | not in the atlas or sources; assumption. The bump-free periphery (keep-out, seal ring region) is drawn as the plain border band; no internal structure depicted |
| Die edge | y = 600 (bottom of the thin gold edge line) | STYLE.md motif |
| Below the line | outside the die: underfill fillet over the interposer, plain dark glaze | no structure drawn; fillet width not sourced |

Only bump positions, pitch and bump diameter are physical; the star, petal, cross and strap geometry is ornament
generated from the bump lattice.

## Text band

x 560-1360, y 500-592: one plain lapis glaze piece (panel x 500-1460, so no joint enters the band for pan 0-94 px, the clamp),
low-contrast mottling only. Kept from the earlier pass-B role; in the pass-A role it simply frames the die edge.

## Figures looked at (visual reference only, not traced)

`ectc51529.2024.00155-f01` (incl. its IR top view of the bump array corner), `ectc51909.2023.00155-f07`.

## Deviations

- Square grid assumed (grid type not reported).
- Bump-to-die-edge distance assumed (not reported).
- Border bands (white guard strap, lapis text band, gold edge line) are ornamental framing of the bump-free die
  periphery; widths are not physical.
