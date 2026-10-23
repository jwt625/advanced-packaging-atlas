// Scene runtime for the hybrid bonding short (DevLog-015). Contract: STYLE.md.
// A scene registers once with APA.scene({init, render, meta, text}); the renderer calls APA.frame(t) per frame.
// URL params: any key=value is passed to init/render as `p` (strings); reserved: text, text_cues, text_color,
// text_size, text_grow, play, dur, _dur, speed, flip. text_cues = JSON [[t_seconds, "text"], ...]: the overlay shows
// the last cue with t <= frame time ("" clears).
// speed = scene-time multiplier (default 1): render receives t * speed (scene seconds) while text_cues, dur, _dur and
// text_grow stay in shot seconds, so an event at scene time T occurs T / speed after the shot starts.
// flip=1 mirrors the scene's visual output (all canvases / SVG / WebGL in #stage) vertically about y = LINE_Y, so
// content drawn above the line ends up below it and the line stays on y = 600 (display row y shows source row 1199 - y).
// The strip y 0-123 that has no usable source after mirroring (source rows 1080-1199 do not exist; rows 1076-1079 are
// dropped because zoomed / blurred scenes darken their last rows) shows source rows 952-1075 mirrored again (the image
// continues as its own reflection about y = 124, seamless at the seam). Done in CSS (transform + -webkit-box-reflect)
// on #stage only: scenes still draw unflipped and render(t) is unchanged; the overlay text is not mirrored and stays
// in its band just above the line.
//
// Overlay text (STYLE.md "Styled text"):
// - text_size = word size in px (default 64), text_grow = px per shot second (default 0, may be negative):
//   size(t) = text_size + text_grow * t_shot. The baseline stays fixed when the size changes.
// - Default renderer (scene has no `text` hook, or the hook returns false): a DOM div in the vendored serif
//   'APA Serif' (Newsreader, opsz 72), centred on x = 960, baseline fixed just above the line; unchanged from before
//   for text_size 64 / text_grow 0.
// - Scene hook: APA.scene({..., text(g, word, t, p, info) {...}}). Called every frame after render() while the
//   resolved word is non-empty. g = CanvasRenderingContext2D of the overlay canvas #overlay-text (1920x1080, sibling
//   of #stage, never flipped, cleared and state-reset each frame; the hook runs inside g.save() / g.restore()).
//   word = text / text_cues resolved for this frame; t = scene seconds (t_shot * speed, the same t as render);
//   p = URL params. May be async. Return false to draw the default serif word instead (e.g. a scene used in two
//   sections that styles only one of the words). The canvas exists only for scenes that define the hook.
//   info = {
//     x: 960, baseline (default serif baseline, y = 565 px), band: {x0: 560, y0: 500, x1: 1360, y1: 592},
//     size (px at this frame), size0 (text_size), grow (text_grow), color (resolved CSS color), tone (raw value),
//     fonts: APA.FONTS (family strings for ctx.font), LINE_Y, W, H, flip (bool), srcY(y) (display row -> scene
//     source row, flip-aware), stage (array of #stage canvases for sampling: scene coordinates, unflipped), layers
//     (all #stage children), t_shot (shot seconds), speed, dur (_dur, shot seconds, or null), canvas (g.canvas)
//   }
//   color resolves text_color, else meta.text, else 'light': 'light' -> #f4f1ea, 'dark' -> #141414, else as given.
// - Shared helpers for hooks: lib/textfx.js (window.TFX; load with <script src="../lib/textfx.js"></script>).
// - Fonts (vendored OFL, lib/fonts/, preloaded before APA_READY so renders are deterministic), APA.FONTS keys:
//   serif 'APA Serif' (Newsreader, wght 200-800), pixel 'APA Pixel' (Silkscreen), pixel8 'APA Pixel 8' (Press Start
//   2P), deco 'APA Deco' (Poiret One), nouveau 'APA Nouveau' (Cinzel Decorative; no U+00B5 micro sign: write U+03BC
//   or put 'APA Serif' after it in the family list), bauhaus 'APA Bauhaus' (Josefin Sans, wght 100-700), grotesk
//   'APA Grotesk' (Inter, wght 100-900), mono 'APA Mono' (IBM Plex Mono).
//   Example: g.font = `600 ${info.size}px ${APA.FONTS.grotesk}`.
(() => {
  const W = 1920, H = 1080, LINE_Y = 600, FPS = 25;
  const params = Object.fromEntries(new URLSearchParams(location.search));
  const SPEED = Number(params.speed || 1) > 0 ? Number(params.speed || 1) : 1;
  const FLIP = params.flip === '1';
  const FLIP_TRIM = 4; // flip: source rows 1076-1079 dropped (zoomed / blurred scenes darken their last rows)
  const SIZE0 = Number(params.text_size) > 0 ? Number(params.text_size) : 64;
  const GROW = Number(params.text_grow) || 0;
  const BAND = Object.freeze({ x0: 560, y0: 500, x1: 1360, y1: 592 });
  const TOP64 = LINE_Y - 64 - 18; // default word box top at 64 px (baseline region just above the bond line)

  // family, file, weight range; keys are the APA.FONTS names
  const FONT_FILES = {
    serif: ['APA Serif', 'Newsreader.ttf', '200 800'],
    pixel: ['APA Pixel', 'Silkscreen-Regular.ttf', '400'],
    pixel8: ['APA Pixel 8', 'PressStart2P-Regular.ttf', '400'],
    deco: ['APA Deco', 'PoiretOne-Regular.ttf', '400'],
    nouveau: ['APA Nouveau', 'CinzelDecorative-Regular.ttf', '400'],
    bauhaus: ['APA Bauhaus', 'JosefinSans-VF.ttf', '100 700'],
    grotesk: ['APA Grotesk', 'Inter-VF.ttf', '100 900'],
    mono: ['APA Mono', 'IBMPlexMono-Regular.ttf', '400'],
  };
  const FONTS = Object.freeze(Object.fromEntries(Object.entries(FONT_FILES).map(([k, [fam]]) => [k, `'${fam}'`])));

  const style = document.createElement('style');
  style.textContent = `
    @font-face { font-family: 'APA Serif'; src: url('../lib/fonts/Newsreader.ttf') format('truetype');
                 font-weight: 200 800; font-display: block; }${Object.values(FONT_FILES).slice(1).map(([fam, file, wt]) => `
    @font-face { font-family: '${fam}'; src: url('../lib/fonts/${file}') format('truetype');
                 font-weight: ${wt}; font-display: block; }`).join('')}
    html, body { margin: 0; padding: 0; background: #000; overflow: hidden; }
    #stage { position: relative; width: ${W}px; height: ${H}px; overflow: hidden; }${FLIP ? `
    #stage { height: ${H - FLIP_TRIM}px; margin-bottom: ${FLIP_TRIM}px; transform-origin: 0 ${LINE_Y}px; transform: scaleY(-1);
             -webkit-box-reflect: below 0px; }` : ''}
    #stage > canvas, #stage > svg { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; }
    #overlay { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; pointer-events: none; z-index: 10; }
    #overlay-text { position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; pointer-events: none; z-index: 11; }
    #overlay .word { position: absolute; left: 0; width: ${W}px; text-align: center;
                     font-family: 'APA Serif', serif; font-weight: 400; font-size: 64px; line-height: 1;
                     font-variation-settings: 'opsz' 72; letter-spacing: 0; white-space: nowrap; }`;
  document.head.appendChild(style);

  const stage = document.createElement('div');
  stage.id = 'stage';
  const overlay = document.createElement('div');
  overlay.id = 'overlay';
  let textCanvas = null, g = null; // created in boot() only for scenes with a text hook

  let def = null;
  let readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });

  // default serif metrics, measured in boot(): baseline offset inside the 64 px word box, and its slope per px of size
  let base64 = 0.8 * 64, baseSlope = 0.8;

  // mulberry32: deterministic PRNG; use instead of Math.random
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function canvas(kind = '2d', opts = {}) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    stage.appendChild(c);
    const ctx = c.getContext(kind, { preserveDrawingBuffer: true, ...opts });
    return { canvas: c, ctx };
  }

  function svg() {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('width', W); s.setAttribute('height', H);
    s.setAttribute('viewBox', `0 0 ${W} ${H}`);
    stage.appendChild(s);
    return s;
  }

  const cues = params.text_cues ? JSON.parse(params.text_cues) : null;

  function wordAt(t) {
    let text = params.text;
    if (cues) {
      text = '';
      for (const [ct, ctext] of cues) if (ct <= t + 1e-6) text = ctext;
    }
    return text || '';
  }

  function toneOf() {
    const tone = params.text_color || (def && def.meta && def.meta.text) || 'light';
    return { tone, color: tone === 'dark' ? '#141414' : tone === 'light' ? '#f4f1ea' : tone };
  }

  function sizeAt(t) { return Math.max(1, SIZE0 + GROW * t); }

  // display row -> scene source row (flip-aware; see the flip notes above)
  function srcY(y) { return !FLIP ? y : y >= 124 ? 1199 - y : 952 + y; }

  function drawDefault(text, t) {
    const { color } = toneOf();
    const size = sizeAt(t);
    const el = document.createElement('div');
    el.className = 'word';
    el.textContent = text;
    el.style.color = color;
    if (size !== 64) el.style.fontSize = `${size}px`;
    el.style.top = `${TOP64 - baseSlope * (size - 64)}px`; // baseline fixed: identical to the old layout at 64 px
    overlay.appendChild(el);
  }

  async function drawOverlay(t) {
    overlay.innerHTML = '';
    if (g) {
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
      g.clearRect(0, 0, W, H);
    }
    const text = wordAt(t);
    if (!text) return;
    if (def && def.text && g) {
      const { tone, color } = toneOf();
      const info = {
        x: W / 2, baseline: TOP64 + base64, band: BAND, size: sizeAt(t), size0: SIZE0, grow: GROW, color, tone,
        fonts: FONTS, LINE_Y, W, H, flip: FLIP, srcY, stage: [...stage.querySelectorAll('canvas')],
        layers: [...stage.children], t_shot: t, speed: SPEED, dur: params._dur ? Number(params._dur) : null,
        canvas: textCanvas,
      };
      g.save();
      let r;
      try { r = await def.text(g, text, t * SPEED, params, info); } finally { g.restore(); }
      if (r !== false) return;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
    }
    drawDefault(text, t);
  }

  async function frame(t) {
    await ready;
    await def.render(t * SPEED, params);
    await drawOverlay(t);
    return true;
  }

  // baseline of the default word inside its box, at 64 px and the change per px of size (DOM layout, after fonts load)
  function measureDefault() {
    const at = (px) => {
      const el = document.createElement('div');
      el.className = 'word';
      el.style.top = '0px'; el.style.visibility = 'hidden'; el.style.fontSize = `${px}px`;
      el.textContent = 'x';
      const m = document.createElement('span');
      m.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.appendChild(m);
      overlay.appendChild(el);
      const y = m.getBoundingClientRect().top - el.getBoundingClientRect().top;
      overlay.removeChild(el);
      return y;
    };
    base64 = at(64);
    baseSlope = (at(256) - base64) / (256 - 64);
  }

  function scene(d) {
    def = d;
    const boot = async () => {
      document.body.appendChild(stage);
      document.body.appendChild(overlay);
      if (d.text) {
        textCanvas = document.createElement('canvas');
        textCanvas.id = 'overlay-text';
        textCanvas.width = W; textCanvas.height = H;
        document.body.appendChild(textCanvas);
        g = textCanvas.getContext('2d');
      }
      await document.fonts.load("64px 'APA Serif'");
      await Promise.all(Object.values(FONTS).map((f) => document.fonts.load(`64px ${f}`)));
      measureDefault();
      if (d.init) await d.init(params);
      readyResolve();
      window.APA_READY = true;
      if (params.play) play();
      else await frame(Number(params.t || 0));
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }

  // ?play=1[&dur=2] : realtime loop preview in a normal browser (not used by the renderer)
  function play() {
    const dur = Number(params.dur || 2);
    const t0 = performance.now();
    let busy = false;
    const tick = async () => {
      if (!busy) {
        busy = true;
        await frame(((performance.now() - t0) / 1000) % dur);
        busy = false;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  window.APA = { W, H, LINE_Y, FPS, FONTS, BAND, params, stage, canvas, svg, rng, scene, frame, srcY };
})();
