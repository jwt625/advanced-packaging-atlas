"""Detect figure and table regions in cached PDFs and crop them, as candidates for the key-figure pass (DevLog-005).

Per caption ("Fig. N" / "Figure N" below a figure; "TABLE N" above a table) the region is the column span between the
caption and the nearest body-text block, tightened to the graphics (images, drawings, label text) inside it. Output is
local-only (references/*/figures/ is git-ignored):

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
                cb0 = fitz.Rect(b["bbox"])
                for nb in blocks:  # caption continuation lines split into their own blocks
                    r = fitz.Rect(nb["bbox"])
                    if (nb is not b and nb["type"] == 0 and 0 <= r.y0 - cb0.y1 <= 4 and abs(r.x0 - cb0.x0) < 30
                            and abs(block_size(nb) - block_size(b)) < 0.3):
                        t += " " + block_text(nb)
                        cb0 |= r
                caps.append((b, t, c[0], c[1]))
    cap_ids = {id(c[0]) for c in caps}
    body = [fitz.Rect(b["bbox"]) for b in blocks if is_body(b, body_sz) and id(b) not in cap_ids]
    labels = [fitz.Rect(b["bbox"]) for b in blocks if b["type"] == 0 and not is_body(b, body_sz) and id(b) not in cap_ids
              and b["bbox"][2] - b["bbox"][0] < 0.6 * W]  # page-wide lines are headers/footers, not figure labels
    margin = (0.05 * H, 0.95 * H)  # running header / footer / download stamp zone
    graphics = [g for g in graphics if g.y1 > margin[0] and g.y0 < margin[1]]
    labels = [g for g in labels if g.y1 > margin[0] and g.y0 < margin[1]]
    out: list[dict[str, Any]] = []
    claimed: list[fitz.Rect] = []
    caps.sort(key=lambda c: c[2] != "table")  # tables first: their regions bound figure regions
    for b, t, kind, m in caps:
        cb = fitz.Rect(b["bbox"])
        centered = abs((cb.x0 + cb.x1) / 2 - W / 2) < 0.04 * W
        wide = cb.width > 0.55 * W or centered
        cx0, cx1 = (0.0, W) if wide else ((0.0, W / 2) if (cb.x0 + cb.x1) / 2 < W / 2 else (W / 2, W))

        def hov(r: fitz.Rect) -> bool:  # real horizontal overlap with the caption's column
            return min(r.x1, cx1) - max(r.x0, cx0) > 0.2 * min(r.width, cx1 - cx0) + PAD

        stops = [r for r in body if hov(r)] + [fitz.Rect(c[0]["bbox"]) for c in caps if c[0] is not b
                                                and hov(fitz.Rect(c[0]["bbox"]))] + [r for r in claimed if hov(r)]
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
