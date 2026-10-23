# Scene contract: hybrid bonding short (DevLog-015)

A 20 s, 1920x1080, 25 fps release-style video. Every shot shows one interconnect level of the pitch ladder
(1 mm BGA down to 0.4 um Cu-Cu hybrid bond) in a different art style. Cut lists: `edit.json` (default) and `edit_exempt.json`. Plan: `DevLog/DevLog-015-hybrid-bonding-short-video.md`.

## The motif (non-negotiable)

- The joint plane of the featured interconnect lies on the horizontal line **y = 600 px** (`APA.LINE_Y`), across
  the full width, in every frame of the shot. Which plane: the top surface of the lower landing pad for solder joints
  (BGA, C4, microbump), the bonding interface for hybrid bonds.
- In a top / oblique view, the edge of the die or package that carries the array lies on y = 600 (array above it).
- Cross-section shots draw the featured pitch at **220-320 px** on screen (6-9 pitches across the frame), so every
  level looks about equally dense while the number falls.
- The line is a geometric fact of the drawing, not a drawn overlay line (unless the style naturally has one).

## Runtime

- One self-contained HTML file per scene in `scenes/`, loading `../lib/apa.js`. Template:

```html
<!doctype html>
<html><head><meta charset="utf-8"><title>l1a bga engraving</title><script src="../lib/apa.js"></script></head>
<body><script>
const { W, H, LINE_Y } = APA;
let ctx;
APA.scene({
  meta: { text: 'light' },            // overlay tone over this scene: 'light' | 'dark' (pass B shots)
  async init(p) { ({ ctx } = APA.canvas('2d')); /* build static geometry/textures once, seeded */ },
  render(t, p) { /* full redraw for time t (seconds, from 0), stateless */ },
});
</script></body></html>
```

- `APA.canvas(kind)` adds a 1920x1080 canvas (`'2d'` or `'webgl2'`); `APA.svg()` adds an SVG; `APA.rng(seed)` is a
  seeded PRNG. Canvas2D, SVG and raw WebGL2 only; no external libraries, no network, no images, no fonts (except
  the vendored `APA.FONTS` inside a `text` hook, see "Styled text").
- Deterministic: no `Math.random`, `Date`, `performance.now` or animation loops. `render(t)` must give the same
  frame for the same `t` regardless of call order. Under 400 ms per frame (headless Chromium, SwiftShader).
- Preview in a browser: open the file with `?play=1&dur=2` through any static server rooted at
  `media/hybrid-bonding-short/`.

## Motion

- Shots run 0.5-1.4 s now, but cut lengths will be re-timed to the music's tempo, so `render(t)` must look good for
  any t in [0, 3.0] s (motion keeps going or settles gracefully; never depends on the shot length) and the motion must
  read within 0.5 s.
- Allowed: slow camera drift (horizontal pan up to 60 px over 2 s, or zoom up to 4 % about a point on the line;
  the line stays at y = 600), and physical process motion true to the level (solder reflow / collapse, underfill flow
  front, die approach, Cu expansion on anneal, grain growth). No vertical camera motion.
- Per-shot `speed` (reserved URL param, set in the edit file's shot `params`, default 1): `render` receives
  `t * speed`, so a scene event at scene time T lands T / speed after the shot starts; overlay cues, `dur` and `_dur`
  stay in shot seconds. Used to finish a scene's motion before its cut (about 85 % of the shot). It also speeds pans
  and drifts, so keep it at or below about 2.5; beyond that change the scene's own timing constants instead (never
  its geometry) and note it in the scene's notes.
- Per-shot `flip` (reserved URL param, `"1"` in the edit file's shot `params`): the runtime mirrors the scene's whole
  visual output vertically about y = 600 (CSS on `#stage`, works for every canvas / SVG / WebGL scene), so a top view
  whose array sits above the edge shows it below the edge; the edge stays on y = 600 (display row y = source row
  1199 - y). Display rows 0-123 (no usable source after mirroring) show source rows 952-1075 mirrored again (seamless
  reflection about y = 124; source rows 1076-1079 are dropped, since zoomed / blurred scenes darken their last rows). Scenes still draw
  unflipped and `render(t)` is unchanged. The overlay is not mirrored and stays in the band above the line, which now
  shows the scene's old below-line field, so set `text_color` ('light' | 'dark' | hex) on every flipped shot for
  >= 4.5:1 contrast. Used to alternate top-heavy and bottom-heavy shots in the fast top-view sections.
- No full-frame per-frame random noise (H.264 bitrate); grain and paper textures are static (seeded once) or slow.

## Styled text

The overlay word is the only text. By default the runtime draws it as a DOM word in 'APA Serif' (Newsreader),
centred on x = 960 with its baseline just above the line. A scene may instead letter it itself, in its own style:

```js
APA.scene({ meta, init, render,
  text(g, word, t, p, info) {   // after render, every frame the word is non-empty; may be async
    const m = TFX.mask(word, { family: info.fonts.pixel, size: info.size });
    TFX.blit(g, TFX.pixelate(m, { cell: 8, color: info.color }), m, info.x, info.baseline);
    // return false -> the default serif word is drawn instead (e.g. style only one of the words a scene carries)
  } });
```

- `g`: 2D context of a dedicated 1920x1080 overlay canvas (sibling of `#stage`, never flipped, cleared and
  state-reset each frame). `word`: from `text` / `text_cues`. `t`: scene seconds (same as `render`). `p`: params.
- `info`: `x` (960), `baseline` (the default word's baseline, y = 565), `band` {x0 560, y0 500, x1 1360, y1 592},
  `size` (px this frame), `size0`, `grow`, `color` (resolved `text_color` / `meta.text`), `tone`, `fonts`, `LINE_Y`,
  `flip`, `srcY(y)` (display row -> scene row), `stage` (scene canvases, unflipped, for sampling), `layers`,
  `t_shot`, `speed`, `dur`, `canvas`.
- Reserved params (edit file shot `params`, shot seconds): `text_size` (px, default 64), `text_grow` (px/s, default
  0): size = text_size + text_grow * t_shot, baseline fixed. Honoured by the default word and passed to hooks.
- Fonts (`lib/fonts/`, OFL, preloaded): `APA.FONTS.serif` 'APA Serif' (Newsreader), `pixel` 'APA Pixel'
  (Silkscreen, caps only), `pixel8` 'APA Pixel 8' (Press Start 2P), `deco` 'APA Deco' (Poiret One), `nouveau`
  'APA Nouveau' (Cinzel Decorative; no U+00B5, use U+03BC or add 'APA Serif' as fallback), `bauhaus` 'APA Bauhaus'
  (Josefin Sans, wght 100-700), `grotesk` 'APA Grotesk' (Inter, wght 100-900), `mono` 'APA Mono' (IBM Plex Mono).
- Helpers: `<script src="../lib/textfx.js"></script>` -> `TFX`: `mask` (word -> alpha mask + metrics), `blit`,
  fills `fill` / `halftone` / `pixelate` / `stipple` / `hatch` / `outline`, `splitHalves` (top / bottom halves
  with gap, shift and seam glow), `dataBar` (instrument data-bar label), `layout` (per-glyph advances), `hash` /
  `jitter` (deterministic), `sampleStage` (scene pixels under a display rect, flip-aware). Usage in the file header.
- Intent per section (owner, 2026-10-22):
  - Pass B (l1b-l7b): the pitch value lettered in the scene's own art style (pixel font, Deco, Nouveau, riso,
    Bauhaus, op art, pointillist dots, TEM ...), legible at 0.5 s.
  - "There's" (c01-c08): blends into the instrument view as the instrument's own label: SEM data-bar text,
    microscope annotation, AFM software label, IR camera overlay, CSAM / EBSD / wafer-map software text.
  - "more to" (m01-m16): a bit bigger on every cut, matching each shot's style; sizes are set per shot in
    `edit.json` (`text_size` 56 -> 112 px geometric, `text_grow` so each shot ends near the next start size); a
    hook draws at `info.size`.
  - "shrink" (hero): split along its horizontal midline; the top and bottom halves come together with the bond
    wave and the seam anneals away with the interface (`TFX.splitHalves`, seam alpha tied to the scene's anneal).
- Keep it legible (>= 4.5:1 against the local background or a halo / bar of its own), inside or near the band,
  deterministic, and within the 400 ms frame budget.

## Content rules

- **No text** inside scenes: no labels, numbers, scale bars, arrows, logos, signatures. The overlay word is the only
  text (drawn by the runtime or by the scene's `text` hook).
- Topology accurate: stack order, materials, shapes, which side the pads/pillars sit on, underfill / dielectric where
  it really is. Dimensions to scale for the featured interconnect (pitch, ball / bump / pad diameter, height, pad
  recess where visible) and the layers immediately adjacent; distant layers may be cropped by the frame. The art
  style changes rendering (line, color, texture), never geometry.
- Pass B shots (the overlay value rides the line): keep the text band x 560-1360, y 500-592 calm (low contrast, no
  fine detail) and set `meta.text` for legibility.
- The art style must be recognizable within 0.5 s at 1080p, built from that style's real vocabulary. Avoid the
  generic glossy-gradient look.

## Sources and provenance

- Facts: atlas tables `data/*.csv` (interconnects, stack_layers, test_vehicles, figures), cached paper text
  `references/<paper_id>/text.md`, and citable public sources for well-known values.
- Figure crops `references/<paper_id>/figures/key/<fig_id>.png` are licensed, local-only **visual references**: look,
  never trace, never embed or encode their pixels, never reproduce a specific figure's composition.
- Do not read anything under `~/Downloads`.
- Every scene has `scenes/<scene stem>.notes.md`: structure drawn (top to bottom, materials), each dimension used
  with its source (atlas `ic_id` / `tv_id` / `layer_id` / `fig_id`, or URL + title), figures looked at (`fig_id`
  only), and every deliberate deviation from reality with the reason.

## Verify

```
uv run python scripts/render_video.py sheet <scene>.html --dur 3.0 --n 12 [--param text="40 µm"]
```

Writes `cache/video/sheets/<stem>.png` (12-frame contact sheet) and `<stem>__full.png` (full-res frame at mid t).
Look at both. Check: line at y = 600, style legible, motion visible, no text, topology right, render time.

## Ownership

Create and edit only your own scene files and their notes. Do not edit `lib/`, `edit.json`, this file, other
scenes, data or DevLogs; report needed runtime changes instead. No git commands.
