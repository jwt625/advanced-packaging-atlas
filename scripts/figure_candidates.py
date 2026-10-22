"""Detect figure and table regions in cached PDFs and crop them, as candidates for the key-figure pass (DevLog-005).

Per caption ("Fig. N" / "Figure N" below a figure; "TABLE N" above a table) the region is the column span between the
caption and the nearest body-text block, tightened to the graphics (images, drawings, label text) inside it. Text
rects come from non-blank spans only, and an edge-continuation post-pass (edge_extend, L15) grows any edge that still
cuts through ink to the first blank gap. Output is local-only (references/*/figures/ is git-ignored):

  references/<paper_id>/figures/candidates.json   [{cand_id, label, kind, page, bbox (fractions of page w/h), caption}]
  references/<paper_id>/figures/cand/<cand_id>.png crop at --dpi (default 200)

Usage: uv run python scripts/figure_candidates.py [--paper ID ...] [--all] [--force] [--dpi 200] [--dry-run]
Skips papers that already have candidates.json unless --force. Log: logs/figure_candidates_<ts>.log
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any

import pymupdf as fitz

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "references"
LOGS = ROOT / "logs"
FIG_RE = re.compile(r"^\s*(?:Fig\.?|FIG\.?|Figure|FIGURE)\s*(\d+)\s*(\([a-z]\))?\s*[.:\-–— ]", re.S)
TAB_RE = re.compile(r"^\s*(?:TABLE|Table)\s+([IVXLC]+|\d+)\b\s*[.:\-–—]?", re.S)
PAD = 4.0  # points around the tightened region
GAP = 14.0  # max vertical gap (points) inside one figure
GAP_TABLE = 6.0  # tables grow first with a tight gap, so a figure right below is not absorbed


def block_text(b: dict[str, Any]) -> str:
    return " ".join("".join(s["text"] for s in ln["spans"]) for ln in b.get("lines", [])).strip()


def block_size(b: dict[str, Any]) -> float:
    sz = [s["size"] for ln in b.get("lines", []) for s in ln["spans"] if s["text"].strip()]
    return max(set(sz), key=sz.count) if sz else 0.0


def body_font_size(doc: Any) -> float:
    c: Counter[float] = Counter()
    for page in doc:
        for b in page.get_text("dict")["blocks"]:
            if b["type"] == 0:
                for ln in b["lines"]:
                    for s in ln["spans"]:
                        c[round(s["size"], 1)] += len(s["text"])
    return c.most_common(1)[0][0] if c else 10.0


def is_body(b: dict[str, Any], body_sz: float) -> bool:
    """Running text (incl. short last lines of paragraphs): body font size, several words."""
    if b["type"] != 0:
        return False
    t = block_text(b)
    if abs(block_size(b) - body_sz) > 0.6:
        return False
    return (len(t) >= 40 and t.count(" ") >= 5) or (len(t) >= 15 and t.count(" ") >= 2 and t.endswith((".", ",", ":")))


def is_caption(b: dict[str, Any], t: str, body_sz: float) -> tuple[str, re.Match[str]] | None:
    """A caption, not an in-text reference ("Fig. 6 shows ..."): smaller font, punctuation or a gap after the label."""
    for kind, rx in (("figure", FIG_RE), ("table", TAB_RE)):
        m = rx.match(t)
        if not m:
            continue
        after = re.match(r"(\s*)(\S?)", t[m.end(1) + len(m.group(2) or "") if kind == "figure" else m.end(1):])
        gap, first = (after.group(1), after.group(2)) if after else ("", "")
        if (t.lstrip().startswith("TABLE") or block_size(b) < body_sz - 0.3 or first in (".", ":", "-", "\u2013", "\u2014")
                or len(gap) >= 2 or first.isupper() or len(t) < 25):
            return kind, m
    return None


def text_rect(b: dict[str, Any]) -> fitz.Rect:
    """Block rect from its non-blank spans. Word-made PDFs often start a caption block with a whitespace-only line one
    line height above the caption; the raw block bbox then reaches into the figure and clipped its bottom (L15)."""
    rects = [fitz.Rect(s["bbox"]) for ln in b.get("lines", []) for s in ln["spans"] if s["text"].strip()]
    return union(rects) or fitz.Rect(b["bbox"])


# Edge-continuation post-pass (L15): a bbox edge that cuts through ink (the pixel rows/columns just inside and just
# outside the edge both dark) is moved outward to the first blank gap. Extend-only; refused when the added strip holds
# caption, body or page-wide text, or the gap is not found within EDGE_REACH.
EDGE_DPI = 120
INK = 230  # gray level (0-255) below which a pixel is ink
EDGE_MIN_COLS = 3  # continuing pixels needed along an edge to call it a cut
EDGE_REACH = 0.08  # max extension, fraction of page height (top/bottom) or width (left/right)
EDGE_MIN_EXT = 0.003  # extensions below this (a hairline on the edge) are reported as "touch" and not applied
EDGE_PAD_PX = 3  # blank pixels kept beyond the content after an extension


def page_text_lines(page: Any, body_sz: float) -> list[tuple[fitz.Rect, str]]:
    """(rect, role) of every non-blank text line; role in caption | body | wide (page-wide block or long rotated
    margin stamp) | label."""
    W = page.rect.width
    out: list[tuple[fitz.Rect, str]] = []
    for b in page.get_text("dict")["blocks"]:
        if b["type"] != 0:
            continue
        t = block_text(b)
        if not t:
            continue
        role = ("caption" if is_caption(b, t, body_sz) else "body" if is_body(b, body_sz)
                else "wide" if text_rect(b).width > 0.6 * W else "label")
        for ln in b["lines"]:
            rs = [fitz.Rect(s["bbox"]) for s in ln["spans"] if s["text"].strip()]
            lt = "".join(s["text"] for s in ln["spans"]).strip()
            rotated = abs(ln.get("dir", (1.0, 0.0))[0]) < 0.5
            if rs:  # a long rotated line is a margin stamp ("Downloaded from ..."), not a figure label
                out.append((union(rs) or fitz.Rect(), "wide" if rotated and len(lt) > 30 else role))
    return out


def _ink(pix: Any, x: int, y: int) -> bool:
    return pix.samples_mv[y * pix.stride + x] < INK


def edge_extend(page: Any, rect: fitz.Rect, lines: list[tuple[fitz.Rect, str]], pix: Any | None = None
                ) -> tuple[fitz.Rect, dict[str, str]]:
    """Extend rect (page points) outward on edges that cut through ink. Returns (new rect, {edge: status}), status:
    extend | touch | sliver (the cut ink is caption/body text) | text (gap found, but the strip holds caption, body or
    page-wide text, or a line wider than half the bbox) | reach (no blank gap within EDGE_REACH).
    Only "extend" changes the rect."""
    if pix is None:
        pix = page.get_pixmap(dpi=EDGE_DPI, colorspace=fitz.csGRAY, alpha=False)
    s = pix.width / page.rect.width  # px per point
    pw, ph = pix.width, pix.height
    r = fitz.Rect(rect)
    status: dict[str, str] = {}

    def texty(line: tuple[fitz.Rect, str]) -> bool:
        """Caption, body or page-wide text, or a line wider than half the bbox: a figure label is short. The width
        test also covers garbled text layers and caption blocks merged with other text, where the role is unknown."""
        return line[1] != "label" or line[0].width > 0.5 * r.width

    for _ in range(3):  # an extension changes the span of the other edges
        changed = False
        for edge in ("bottom", "top", "right", "left"):
            if status.get(edge) in ("sliver", "text", "reach"):
                continue
            x0, y0 = max(0, int(round(r.x0 * s))), max(0, int(round(r.y0 * s)))
            x1, y1 = min(pw, int(round(r.x1 * s))), min(ph, int(round(r.y1 * s)))
            horiz = edge in ("bottom", "top")
            out_dir = 1 if edge in ("bottom", "right") else -1
            pos = {"bottom": y1, "top": y0 - 1, "right": x1, "left": x0 - 1}[edge]  # first pixel line outside
            lim = ph if horiz else pw
            if not (0 <= pos < lim and 0 <= pos - out_dir < lim):
                continue
            span = range(x0, x1) if horiz else range(y0, y1)

            def at(line: int, k: int) -> bool:
                return _ink(pix, k, line) if horiz else _ink(pix, line, k)

            cut = [k for k in span if at(pos, k) and at(pos - out_dir, k)]
            if len(cut) < EDGE_MIN_COLS:
                continue
            # what is the cut ink: a caption/body/page-wide text line straddling the edge?
            e_pt = pos / s
            straddle = [(lr, role) for lr, role in lines
                        if (lr.y0 < e_pt < lr.y1 if horiz else lr.x0 < e_pt < lr.x1)
                        and (lr.x1 > r.x0 and lr.x0 < r.x1 if horiz else lr.y1 > r.y0 and lr.y0 < r.y1)]
            if straddle and all(texty(lr) for lr in straddle):
                status[edge] = "sliver"
                continue
            reach = int(EDGE_REACH * lim)
            p, blank = pos, -1
            while 0 <= p < lim and abs(p - pos) <= reach:
                if not any(at(p, k) for k in span):
                    blank = p
                    break
                p += out_dir
            if blank < 0:
                status[edge] = "reach"
                continue
            q = blank
            for _k in range(EDGE_PAD_PX - 1):  # keep a few blank pixels, never into the next ink
                nq = q + out_dir
                if not (0 <= nq < lim) or any(at(nq, k) for k in span):
                    break
                q = nq
            new_pt = (q + (1 if out_dir > 0 else 0)) / s
            new_pt = min(max(new_pt, 0.0), page.rect.height if horiz else page.rect.width)
            old_pt = {"bottom": r.y1, "top": r.y0, "right": r.x1, "left": r.x0}[edge]
            ext = abs(new_pt - old_pt) / (page.rect.height if horiz else page.rect.width)
            if (new_pt - old_pt) * out_dir <= 0 or ext < EDGE_MIN_EXT:
                status.setdefault(edge, "touch")
                continue
            strip = (fitz.Rect(r.x0, min(old_pt, new_pt), r.x1, max(old_pt, new_pt)) if horiz
                     else fitz.Rect(min(old_pt, new_pt), r.y0, max(old_pt, new_pt), r.y1))
            def inside(lr: fitz.Rect) -> bool:  # the line really sits in the added strip
                ov = lr & strip
                return not ov.is_empty and (ov.height >= 0.4 * lr.height if horiz else ov.width >= 2.0)

            if any(texty((lr, role)) and inside(lr) for lr, role in lines):
                status[edge] = "text"
                continue
            if edge == "bottom":
                r.y1 = new_pt
            elif edge == "top":
                r.y0 = new_pt
            elif edge == "right":
                r.x1 = new_pt
            else:
                r.x0 = new_pt
            status[edge] = "extend"
            changed = True
        if not changed:
            break
    return r, status


def union(rects: list[fitz.Rect]) -> fitz.Rect | None:
    if not rects:
        return None
    r = fitz.Rect(rects[0])
    for x in rects[1:]:
        r |= x
    return r


def coalesce(rects: list[fitz.Rect], tol: float = 2.0) -> list[fitz.Rect]:
    """Merge touching rects (tiled images can put 40k fragments on a page) into a few clusters."""
    rects = sorted(rects, key=lambda r: (r.y0, r.x0))
    while True:
        out: list[fitz.Rect] = []
        for r in rects:
            grown = fitz.Rect(r.x0 - tol, r.y0 - tol, r.x1 + tol, r.y1 + tol)
            for c in out:
                if c.intersects(grown):
                    c |= r
                    break
            else:
                out.append(fitz.Rect(r))
        if len(out) == len(rects):
            return out
        rects = out


def grow(seed: float, elems: list[fitz.Rect], up: bool) -> list[fitz.Rect]:
    """Collect elements contiguous with a caption edge, growing up (figures, GAP) or down (tables, GAP_TABLE)."""
    gap = GAP if up else GAP_TABLE
    members: list[fitz.Rect] = []
    edge, rest, changed = seed, list(elems), True
    while changed:
        changed = False
        for e in list(rest):
            if (up and e.y1 >= edge - gap) or (not up and e.y0 <= edge + gap):
                members.append(e)
                rest.remove(e)
                edge = min(edge, e.y0) if up else max(edge, e.y1)
                changed = True
    return members


def page_candidates(page: Any, body_sz: float) -> list[dict[str, Any]]:
    W, H = page.rect.width, page.rect.height
    blocks = [b for b in page.get_text("dict")["blocks"]]
    graphics: list[fitz.Rect] = [fitz.Rect(i["bbox"]) for i in page.get_image_info()]
    for d in page.get_drawings():
        r = fitz.Rect(d["rect"])
        if not (r.width >= 0.9 * W and r.height >= 0.9 * H) and (r.width > 1 or r.height > 1):  # skip page frames
            graphics.append(r)
    if len(graphics) > 200:
        graphics = coalesce(graphics)
    try:
        found_tables = [fitz.Rect(t.bbox) for t in page.find_tables().tables]
    except Exception:  # noqa: BLE001  table finder failures are non-fatal
        found_tables = []
    caps = []
    for b in blocks:
        if b["type"] == 0:
            t = block_text(b)
            c = is_caption(b, t, body_sz)
            if c:
                cb0 = text_rect(b)
                for nb in blocks:  # caption continuation lines split into their own blocks
                    r = text_rect(nb) if nb["type"] == 0 else fitz.Rect()
                    if (nb is not b and nb["type"] == 0 and 0 <= r.y0 - cb0.y1 <= 4 and abs(r.x0 - cb0.x0) < 30
                            and abs(block_size(nb) - block_size(b)) < 0.3):
                        t += " " + block_text(nb)
                        cb0 |= r
                caps.append((b, t, c[0], c[1]))
    cap_ids = {id(c[0]) for c in caps}
    body = [text_rect(b) for b in blocks if is_body(b, body_sz) and id(b) not in cap_ids]
    labels = [text_rect(b) for b in blocks if b["type"] == 0 and block_text(b) and not is_body(b, body_sz)
              and id(b) not in cap_ids
              and text_rect(b).width < 0.6 * W]  # page-wide lines are headers/footers, not figure labels
    margin = (0.05 * H, 0.95 * H)  # running header / footer / download stamp zone
    graphics = [g for g in graphics if g.y1 > margin[0] and g.y0 < margin[1]]
    labels = [g for g in labels if g.y1 > margin[0] and g.y0 < margin[1]]
    out: list[dict[str, Any]] = []
    claimed: list[fitz.Rect] = []
    caps.sort(key=lambda c: c[2] != "table")  # tables first: their regions bound figure regions
    for b, t, kind, m in caps:
        cb = text_rect(b)
        centered = abs((cb.x0 + cb.x1) / 2 - W / 2) < 0.04 * W
        wide = cb.width > 0.55 * W or centered
        cx0, cx1 = (0.0, W) if wide else ((0.0, W / 2) if (cb.x0 + cb.x1) / 2 < W / 2 else (W / 2, W))

        def hov(r: fitz.Rect) -> bool:  # real horizontal overlap with the caption's column
            return min(r.x1, cx1) - max(r.x0, cx0) > 0.2 * min(r.width, cx1 - cx0) + PAD

        stops = [r for r in body if hov(r)] + [text_rect(c[0]) for c in caps if c[0] is not b
                                                and hov(text_rect(c[0]))] + [r for r in claimed if hov(r)]
        tight: fitz.Rect | None = None
        if kind == "figure":
            limit = max([s.y1 for s in stops if s.y1 <= cb.y0 + 1] + [0.0])
            region = fitz.Rect(cx0, limit, cx1, cb.y0)
        else:
            limit = min([s.y0 for s in stops if s.y0 >= cb.y1 - 1] + [H])
            region = fitz.Rect(cx0, cb.y1, cx1, limit)
            near = [r for r in found_tables if hov(r) and cb.y1 - 5 <= r.y0 <= cb.y1 + 60]
            if near:
                tight = min(near, key=lambda r: r.y0)
        if tight is None:
            elems = [g for g in graphics + labels if region.y0 - 1 <= (g.y0 + g.y1) / 2 <= region.y1 + 1
                     and cx0 - 2 <= (g.x0 + g.x1) / 2 <= cx1 + 2 and not any(g in c for c in claimed)]
            grown = union(grow(cb.y0 if kind == "figure" else cb.y1, elems, up=kind == "figure"))
            tight = (grown & region) if grown else None
        r = tight if tight and not tight.is_empty else region
        r = fitz.Rect(r.x0 - PAD, r.y0 - PAD, r.x1 + PAD, r.y1 + PAD) & page.rect
        r &= fitz.Rect(page.rect.x0, region.y0, page.rect.x1, region.y1)  # no caption or body-text sliver
        if r.height < 20 or r.width < 40:
            continue
        claimed.append(r)
        label = (f"Fig. {m.group(1)}{m.group(2) or ''}" if kind == "figure" else f"Table {m.group(1)}")
        out.append({"label": label, "kind": kind, "page_rect": r, "caption": t[:400], "has_graphics": bool(tight)})
    if out:  # edge-continuation post-pass: a region that still cuts through ink grows to the first blank gap
        lines = page_text_lines(page, body_sz)
        pix = page.get_pixmap(dpi=EDGE_DPI, colorspace=fitz.csGRAY, alpha=False)
        for c in out:
            c["page_rect"], _st = edge_extend(page, c["page_rect"], lines, pix)
    return out


def run_paper(pid: str, dpi: int, force: bool, dry: bool, log: Any) -> str:
    d = REF / pid
    pdf, out_json = d / "source.pdf", d / "figures" / "candidates.json"
    if not pdf.exists():
        return "no_pdf"
    if out_json.exists() and not force:
        return "skip_existing"
    doc = fitz.open(pdf)
    body_sz = body_font_size(doc)
    cands: list[dict[str, Any]] = []
    seen: Counter[str] = Counter()
    for pno, page in enumerate(doc, start=1):
        for c in page_candidates(page, body_sz):
            seen[c["label"]] += 1
            n = seen[c["label"]]
            slug = re.sub(r"[^a-z0-9]", "", c["label"].lower())
            cid = f"p{pno:02d}_{slug}" + (f"_{n}" if n > 1 else "")
            r, W, H = c["page_rect"], page.rect.width, page.rect.height
            cands.append({"cand_id": cid, "label": c["label"], "kind": c["kind"], "page": pno,
                          "bbox": [round(r.x0 / W, 4), round(r.y0 / H, 4), round(r.x1 / W, 4), round(r.y1 / H, 4)],
                          "has_graphics": c["has_graphics"], "caption": c["caption"],
                          "file": f"cand/{cid}.png"})
            if not dry:
                (d / "figures" / "cand").mkdir(parents=True, exist_ok=True)
                page.get_pixmap(clip=r, dpi=dpi).save(d / "figures" / "cand" / f"{cid}.png")
    if not dry:
        out_json.write_text(json.dumps(cands, indent=1))
    n_fig = sum(c["kind"] == "figure" for c in cands)
    print(f"{pid}: {n_fig} figures, {len(cands) - n_fig} tables, pages {doc.page_count}", file=log, flush=True)
    return "ok"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--paper", nargs="*", default=[])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    pids = a.paper or (sorted(p.name for p in REF.iterdir() if (p / "source.pdf").exists()) if a.all else [])
    if not pids:
        ap.error("give --paper ID ... or --all")
    LOGS.mkdir(exist_ok=True)
    ts = datetime.now().strftime("%Y%m%dT%H%M%S")

    class Tee:
        def __init__(self, f: Any) -> None:
            self.f = f

        def write(self, s: str) -> None:
            self.f.write(s)
            sys.stdout.write(s)

        def flush(self) -> None:
            self.f.flush()

    with (LOGS / f"figure_candidates_{ts}.log").open("w") as lf:
        log = Tee(lf)
        st: Counter[str] = Counter()
        for pid in pids:
            try:
                st[run_paper(pid, a.dpi, a.force, a.dry_run, log)] += 1
            except Exception as exc:  # noqa: BLE001  pymupdf raises its own error types
                st["error"] += 1
                print(f"{pid}: ERROR {exc!r}", file=log, flush=True)
        print(f"done: {dict(st)}", file=log, flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
