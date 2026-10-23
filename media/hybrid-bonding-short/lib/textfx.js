// Text effects for scene text hooks (DevLog-015, STYLE.md "Styled text"). Dependency-free, deterministic (no
// Math.random / Date / performance.now). Load after apa.js:  <script src="../lib/textfx.js"></script>  -> window.TFX.
//
// Coordinates: a "mask" is a word rendered white-on-transparent into its own canvas with the pen origin (left end of
// the baseline) at (m.ox, m.oy). blit / splitHalves place it so the baseline sits on `baseline` and the advance
// width is aligned on x like CSS text-align ('center' default, as the default serif word), 'left' or 'right'.
//
//   TFX.font(family, size, weight = 400, style = '')       -> ctx.font string, e.g. TFX.font(APA.FONTS.pixel, 64)
//   TFX.mask(word, {family, size, weight, style, letterSpacing, pad})
//       -> {canvas, w, h, ox, oy, alpha (Uint8ClampedArray w*h), cov(x, y) (0..1, mask px), width (advance), ascent,
//           descent (ink, from the baseline), left, right (ink extents from the pen origin), xHeight, capHeight}
//       cached by arguments: treat the result as read-only.
//   TFX.blit(g, src, m, x, baseline, {align, alpha})        draw a mask (or a fill canvas of the same size) in place
//   Fills (each returns a new canvas the size of m, transparent outside the glyphs; draw it with TFX.blit):
//   TFX.fill(m, paint)                       paint = CSS color | CanvasGradient | CanvasPattern | canvas |
//                                            fn(ctx, w, h) drawing anything; clipped to the glyph alpha
//   TFX.halftone(m, {cell, angle, color, gain, square, tone(x, y)})   dots on a rotated grid, area ~ coverage * tone
//   TFX.pixelate(m, {cell, threshold, color, gap, phase: [px, py], palette, seed})   coarse grid of solid squares
//   TFX.stipple(m, {density, r, palette, seed, rJitter})  random dots (seeded) inside the glyphs, colors from palette
//   TFX.hatch(m, {spacing, angle, width, color, cross})   parallel lines (cross = second set at angle + 90) in glyphs
//   TFX.outline(m, {width, color})                        stroke-like rim (glyph minus eroded glyph), via offsets
//   TFX.splitHalves(g, m, x, baseline, {src, color, split, gap, shift, align, alpha, seam})
//       draw top and bottom halves of the word apart: split = 'ink' (middle of the ink box, default) | 'x' (middle
//       of the x-height) | number (px from the baseline, negative = up); gap = vertical separation (px, top half
//       moves up gap/2, bottom down gap/2); shift = horizontal offset (top half +shift/2, bottom -shift/2);
//       src = a fill canvas from the fills above (default: the glyphs filled with `color`, default #fff);
//       seam = {color, width, alpha, blur, mode: 'ink' | 'line'}: glow on the split row ('ink' = only where the glyphs
//       cross it, 'line' = a line across the ink width). Returns {ySplit, x0, x1} in display px.
//   TFX.dataBar(g, word, {x0, x1, y, h, bg, fg, family, size, weight, align, pad, fields, rule})
//       instrument data-bar label: a filled bar from x0 to x1 with top at y, the word in a mono / sans font; fields =
//       [{text, align: 'left' | 'center' | 'right'}] extra cells. Returns {x0, y0, x1, y1}.
//   TFX.layout(word, {family, size, weight, letterSpacing}) -> {width, glyphs: [{ch, x, w}]} per-character advances
//   TFX.hash(a, b, c)  -> [0, 1) deterministic;  TFX.jitter(seed, i, amp, t, rate) -> [-amp, amp], stepping every
//       1 / rate s when t / rate are given (boiling-line look); without t a fixed offset per (seed, i)
//   TFX.sampleStage(info, x, y, w, h) -> ImageData of the composited #stage canvases at display coordinates
//       (flip-aware; SVG layers are not included)
//
// Example (in a scene; ctx.font size follows the shot's text_size / text_grow through info.size):
//   APA.scene({ meta: {text: 'light'}, init, render,
//     text(g, word, t, p, info) {
//       const m = TFX.mask(word, {family: info.fonts.pixel, size: info.size});
//       TFX.blit(g, TFX.pixelate(m, {cell: 8, color: info.color}), m, info.x, info.baseline);
//     } });
//   Split word closing with a bond wave:
//       const m = TFX.mask(word, {family: info.fonts.serif, size: info.size});
//       const k = Math.min(1, t / 0.6);
//       TFX.splitHalves(g, m, info.x, info.baseline, {gap: 40 * (1 - k), color: info.color,
//                       seam: {color: '#ffb070', alpha: 1 - Math.min(1, t / 1.5), blur: 12}});
//   SEM data bar:  TFX.dataBar(g, word, {x0: 0, x1: 1920, y: 1020, h: 60, family: info.fonts.mono, size: 30});
(() => {
  const maskCache = new Map();

  function font(family, size, weight = 400, style = '') {
    return `${style ? style + ' ' : ''}${weight} ${size}px ${family}`;
  }

  function newCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  function mask(word, o = {}) {
    const family = o.family || "'APA Serif'", size = o.size || 64, weight = o.weight || 400, style = o.style || '';
    const ls = o.letterSpacing || 0, pad = o.pad == null ? Math.ceil(size * 0.25) : o.pad;
    const key = JSON.stringify([word, family, size, weight, style, ls, pad]);
    if (maskCache.has(key)) return maskCache.get(key);
    const probe = newCanvas(1, 1).getContext('2d');
    probe.font = font(family, size, weight, style);
    probe.letterSpacing = `${ls}px`;
    const mt = probe.measureText(word);
    const left = Math.max(mt.actualBoundingBoxLeft, 0), right = Math.max(mt.actualBoundingBoxRight, mt.width);
    const asc = Math.max(mt.actualBoundingBoxAscent, mt.fontBoundingBoxAscent || 0);
    const desc = Math.max(mt.actualBoundingBoxDescent, mt.fontBoundingBoxDescent || 0);
    const c = newCanvas(left + right + 2 * pad, asc + desc + 2 * pad);
    const ox = pad + left, oy = pad + asc;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.font = probe.font;
    ctx.letterSpacing = `${ls}px`;
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(word, ox, oy);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    const alpha = new Uint8ClampedArray(c.width * c.height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = data[4 * i + 3];
    const w = c.width, h = c.height;
    const m = {
      canvas: c, w, h, ox, oy, alpha, width: mt.width,
      ascent: mt.actualBoundingBoxAscent, descent: mt.actualBoundingBoxDescent,
      left: -mt.actualBoundingBoxLeft, right: mt.actualBoundingBoxRight,
      xHeight: probe.measureText('x').actualBoundingBoxAscent, capHeight: probe.measureText('H').actualBoundingBoxAscent,
      cov(x, y) {
        const xi = Math.floor(x), yi = Math.floor(y);
        return xi < 0 || yi < 0 || xi >= w || yi >= h ? 0 : alpha[yi * w + xi] / 255;
      },
    };
    if (maskCache.size > 64) maskCache.clear();
    maskCache.set(key, m);
    return m;
  }

  // left edge of the mask canvas for an advance-aligned pen at x
  function originX(m, x, align = 'center') {
    const pen = align === 'left' ? x : align === 'right' ? x - m.width : x - m.width / 2;
    return pen - m.ox;
  }

  function blit(g, src, m, x, baseline, o = {}) {
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    g.drawImage(src.canvas || src, originX(m, x, o.align), baseline - m.oy);
    g.restore();
  }

  function clipTo(c, m) {
    const ctx = c.getContext('2d');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(m.canvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }

  function fill(m, paint) {
    const c = newCanvas(m.w, m.h), ctx = c.getContext('2d');
    if (typeof paint === 'function') paint(ctx, m.w, m.h);
    else if (paint instanceof HTMLCanvasElement || paint instanceof HTMLImageElement) ctx.drawImage(paint, 0, 0);
    else { ctx.fillStyle = paint || '#fff'; ctx.fillRect(0, 0, m.w, m.h); }
    return clipTo(c, m);
  }

  // mean coverage of the mask in a square of side s centred at (cx, cy) (mask px), 3x3 samples
  function covAt(m, cx, cy, s) {
    let a = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) a += m.cov(cx + i * s / 3, cy + j * s / 3);
    return a / 9;
  }

  function halftone(m, o = {}) {
    const cell = o.cell || 8, ang = ((o.angle == null ? 45 : o.angle) * Math.PI) / 180, gain = o.gain || 1;
    const c = newCanvas(m.w, m.h), ctx = c.getContext('2d');
    ctx.fillStyle = o.color || '#fff';
    const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.hypot(m.w, m.h);
    // grid anchored at the pen origin so a growing word keeps its dot phase near the baseline
    for (let v = -R; v <= R; v += cell) for (let u = -R; u <= R; u += cell) {
      const x = m.ox + u * ca - v * sa, y = m.oy + u * sa + v * ca;
      if (x < -cell || y < -cell || x > m.w + cell || y > m.h + cell) continue;
      let k = covAt(m, x, y, cell) * gain * (o.tone ? o.tone(x - m.ox, y - m.oy) : 1);
      if (k <= 0.02) continue;
      k = Math.min(k, 1);
      ctx.beginPath();
      if (o.square) { const s = cell * Math.sqrt(k); ctx.rect(x - s / 2, y - s / 2, s, s); }
      else ctx.arc(x, y, (cell / Math.SQRT2) * Math.sqrt(k), 0, 2 * Math.PI);
      ctx.fill();
    }
    return c;
  }

  function pixelate(m, o = {}) {
    const cell = o.cell || 8, th = o.threshold == null ? 0.5 : o.threshold, gap = o.gap || 0;
    const [px, py] = o.phase || [0, 0];
    const c = newCanvas(m.w, m.h), ctx = c.getContext('2d');
    // grid anchored at the pen origin (+ phase): baseline lies on a cell edge
    const x0 = ((m.ox + px) % cell) - cell, y0 = ((m.oy + py) % cell) - cell;
    for (let y = y0; y < m.h; y += cell) for (let x = x0; x < m.w; x += cell) {
      if (covAt(m, x + cell / 2, y + cell / 2, cell) < th) continue;
      ctx.fillStyle = o.palette
        ? o.palette[Math.floor(hash(o.seed || 1, Math.round(x - m.ox), Math.round(y - m.oy)) * o.palette.length)]
        : o.color || '#fff';
      ctx.fillRect(x + gap / 2, y + gap / 2, cell - gap, cell - gap);
    }
    return c;
  }

  function stipple(m, o = {}) {
    const density = o.density == null ? 0.08 : o.density, r = o.r || 2, rj = o.rJitter || 0;
    const palette = o.palette || ['#fff'];
    const c = newCanvas(m.w, m.h), ctx = c.getContext('2d');
    const n = Math.round(density * m.w * m.h);
    const rnd = window.APA ? APA.rng(o.seed || 1) : seq(o.seed || 1);
    for (let i = 0; i < n; i++) {
      const x = rnd() * m.w, y = rnd() * m.h, keep = rnd(), ci = rnd(), rr = rnd();
      if (keep >= m.cov(x, y)) continue;
      ctx.fillStyle = palette[Math.floor(ci * palette.length)];
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.3, r * (1 + rj * (2 * rr - 1))), 0, 2 * Math.PI);
      ctx.fill();
    }
    return c;
  }

  function hatch(m, o = {}) {
    const sp = o.spacing || 6, w = o.width || 1.5;
    const c = newCanvas(m.w, m.h), ctx = c.getContext('2d');
    ctx.strokeStyle = o.color || '#fff'; ctx.lineWidth = w;
    const sets = o.cross ? [o.angle == null ? 45 : o.angle, (o.angle == null ? 45 : o.angle) + 90] : [o.angle == null ? 45 : o.angle];
    const R = Math.hypot(m.w, m.h);
    for (const a of sets) {
      const ang = (a * Math.PI) / 180, ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.beginPath();
      for (let v = -R; v <= R; v += sp) {
        const cx = m.ox - v * sa, cy = m.oy + v * ca;
        ctx.moveTo(cx - R * ca, cy - R * sa); ctx.lineTo(cx + R * ca, cy + R * sa);
      }
      ctx.stroke();
    }
    return clipTo(c, m);
  }

  function outline(m, o = {}) {
    const wd = o.width || 2;
    const c = newCanvas(m.w, m.h), ctx = c.getContext('2d');
    ctx.fillStyle = o.color || '#fff'; ctx.fillRect(0, 0, m.w, m.h);
    clipTo(c, m);
    // erode: keep only pixels covered by every offset copy, then cut that core out of the glyph
    const core = newCanvas(m.w, m.h), k = core.getContext('2d');
    k.drawImage(m.canvas, 0, 0);
    k.globalCompositeOperation = 'destination-in';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      k.drawImage(m.canvas, Math.round(wd * Math.cos(a)), Math.round(wd * Math.sin(a)));
    }
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(core, 0, 0);
    return c;
  }

  function splitHalves(g, m, x, baseline, o = {}) {
    const src = o.src ? (o.src.canvas || o.src) : fill(m, o.color || '#fff');
    let sy; // split row in mask px
    if (typeof o.split === 'number') sy = m.oy + o.split;
    else if (o.split === 'x') sy = m.oy - m.xHeight / 2;
    else sy = m.oy - (m.ascent - m.descent) / 2;
    const gap = o.gap || 0, shift = o.shift || 0;
    const left = originX(m, x, o.align), top = baseline - m.oy;
    g.save();
    if (o.alpha != null) g.globalAlpha *= o.alpha;
    const syc = Math.max(0, Math.min(m.h, sy));
    if (syc > 0) g.drawImage(src, 0, 0, m.w, syc, left + shift / 2, top - gap / 2, m.w, syc);
    if (syc < m.h) g.drawImage(src, 0, syc, m.w, m.h - syc, left - shift / 2, top + syc + gap / 2, m.w, m.h - syc);
    g.restore();
    const ySplit = top + sy, x0 = left + m.ox + m.left, x1 = left + m.ox + m.right;
    const s = o.seam;
    if (s && (s.alpha == null || s.alpha > 0)) {
      const sw = s.width || 3, col = s.color || '#ffb070';
      g.save();
      g.globalAlpha *= s.alpha == null ? 1 : s.alpha;
      g.shadowColor = col; g.shadowBlur = s.blur == null ? 10 : s.blur;
      if (s.mode === 'line') {
        g.fillStyle = col;
        g.fillRect(x0, ySplit - sw / 2, x1 - x0, sw);
      } else {
        // the glyph cross-section at the split row, as a band sw tall, centred on the seam
        const b = newCanvas(m.w, sw), bc = b.getContext('2d');
        bc.drawImage(m.canvas, 0, Math.round(sy) - 1, m.w, 2, 0, 0, m.w, sw);
        bc.globalCompositeOperation = 'source-in';
        bc.fillStyle = col; bc.fillRect(0, 0, m.w, sw);
        g.drawImage(b, left, ySplit - sw / 2);
      }
      g.restore();
    }
    return { ySplit, x0, x1 };
  }

  function dataBar(g, word, o = {}) {
    const x0 = o.x0 == null ? 0 : o.x0, x1 = o.x1 == null ? 1920 : o.x1, h = o.h || 48, y = o.y == null ? 1080 - h : o.y;
    const size = o.size || Math.round(h * 0.55), pad = o.pad == null ? Math.round(h * 0.4) : o.pad;
    const fam = o.family || "'APA Mono'", wt = o.weight || 400;
    g.save();
    if (o.bg !== null) { g.fillStyle = o.bg || 'rgba(0, 0, 0, 0.82)'; g.fillRect(x0, y, x1 - x0, h); }
    if (o.rule) { g.fillStyle = o.rule; g.fillRect(x0, y, x1 - x0, 1); }
    g.font = font(fam, size, wt);
    g.fillStyle = o.fg || '#f4f1ea';
    g.textBaseline = 'middle';
    const cell = (text, align) => {
      g.textAlign = align;
      g.fillText(text, align === 'left' ? x0 + pad : align === 'right' ? x1 - pad : (x0 + x1) / 2, y + h / 2);
    };
    cell(word, o.align || 'left');
    for (const f of o.fields || []) cell(f.text, f.align || 'right');
    g.restore();
    return { x0, y0: y, x1, y1: y + h };
  }

  function layout(word, o = {}) {
    const ctx = newCanvas(1, 1).getContext('2d');
    ctx.font = font(o.family || "'APA Serif'", o.size || 64, o.weight || 400);
    ctx.letterSpacing = `${o.letterSpacing || 0}px`;
    const chars = [...word], glyphs = [];
    let prev = 0;
    for (let i = 0; i < chars.length; i++) {
      const adv = ctx.measureText(chars.slice(0, i + 1).join('')).width; // prefix widths keep kerning
      glyphs.push({ ch: chars[i], x: prev, w: adv - prev });
      prev = adv;
    }
    return { width: prev, glyphs };
  }

  // integer hash (lowbias32) of up to three numbers -> [0, 1)
  function hash(a, b = 0, c = 0) {
    let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77) ^ Math.imul(c | 0, 0xc2b2ae3d)) >>> 0;
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15; h = Math.imul(h, 0x846ca68b); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function jitter(seed, i, amp, t, rate) {
    const step = t == null || !rate ? 0 : Math.floor(t * rate + 1e-6);
    return amp * (2 * hash(seed, i, step) - 1);
  }

  function seq(seed) { let k = 0; return () => hash(seed, k++, 7); }

  function sampleStage(info, x, y, w, h) {
    const c = newCanvas(w, h), ctx = c.getContext('2d', { willReadFrequently: true });
    const layers = info.stage || [];
    for (let r = 0; r < h; r++) {
      const sy = info.srcY ? info.srcY(y + r) : y + r;
      for (const L of layers) ctx.drawImage(L, x, sy, w, 1, 0, r, w, 1);
    }
    return ctx.getImageData(0, 0, w, h);
  }

  window.TFX = {
    font, mask, blit, fill, halftone, pixelate, stipple, hatch, outline, splitHalves, dataBar, layout, hash, jitter,
    sampleStage,
  };
})();
