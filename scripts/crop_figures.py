"""Render key-figure crops from figures.csv rows, and gridded page renders for reading a manual bbox (DevLog-005).

Crops are local-only (licensed sources): by default references/<paper_id>/figures/key/<fig_id>.png from data/figures.csv.

Usage:
  uv run python scripts/crop_figures.py                                   # all data/figures.csv rows (skip existing)
  uv run python scripts/crop_figures.py --staging data/_staging/<b> --out <dir>   # check a batch's crops
  uv run python scripts/crop_figures.py --paper ID --grid PAGE --out <dir>        # page render with a 0.05 grid
  uv run python scripts/crop_figures.py --paper ID --page N --bbox x0,y0,x1,y1 --out <dir>   # one ad-hoc crop
  uv run python scripts/crop_figures.py --paper ID --spec N:x0,y0,x1,y1 [--spec ...] --out <dir>  # several
  uv run python scripts/crop_figures.py --edge-check [--paper ID] [--apply]       # bbox edges cutting through ink
  uv run python scripts/crop_figures.py --sliver-check [--paper ID] [--apply]     # edges cutting a text line
Options: --force (overwrite existing crops), --dpi (default 200).

--edge-check (L15): for every data/figures.csv row, test each bbox edge for ink that continues past it
(figure_candidates.edge_extend: page render at 120 dpi, extend to the first blank gap, extend-only, refused when the
added strip holds caption/body/page-wide text or no gap within 0.08 of the page). Dry run by default: report only.
--apply writes the extended bboxes to data/figures.csv (candidate rows become bbox_source manual with cand_id empty,
note appended, as in DevLog-009) and re-renders those rows' key crops; --skip FIG_ID (repeatable) leaves a row that
failed visual review unchanged. Report: logs/figure_edge_check_<ts>.jsonl.

--sliver-check (L29): for every row, the edges that edge_extend reports as "sliver" (the edge cuts a caption, body or
page-wide text line) are tested against a text-only render of the page (in-memory redaction of images and line art):
- no_glyph: no glyph ink of that text lies inside the bbox (only its line box overlaps): nothing to trim, left as is;
- shrink: the edge moves inward past the glyph ink of the straddling line and of caption/body lines attached to it,
  to the blank pixel line next to the text (one blank line stays outside when there are two);
- ambiguous (left as is): a straddling line is a short "label" line (figure-internal or garbled text), non-text ink in
  the strip that would be removed (figure ink, frame lines), no blank line between figure ink and text, or a shrink
  beyond 0.05 of the page / 0.3 of the bbox.
Text roles accepted: caption / body / page-wide (page_text_lines) and header/footer lines in the top/bottom 7 % of the
page. The stored (rounded) bbox is re-checked with edge_extend: a shrunk edge must not cut ink. Dry run by default;
--apply writes data/figures.csv (as --edge-check: bbox_source manual, cand_id empty, dated note with the old bbox)
and re-renders the changed crops; --skip FIG_ID (repeatable) leaves a row unchanged.
Report: logs/figure_sliver_check_<ts>.jsonl.
"""

from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import date, datetime
from pathlib import Path
from typing import Any

import pymupdf as fitz
from figure_candidates import EDGE_DPI, _ink, body_font_size, edge_extend, page_text_lines

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "references"


def rect_of(page: fitz.Page, bbox: str) -> fitz.Rect:
    x0, y0, x1, y1 = (float(v) for v in bbox.split(","))
    W, H = page.rect.width, page.rect.height
    return fitz.Rect(x0 * W, y0 * H, x1 * W, y1 * H)


def crop(pid: str, page_no: int, bbox: str, dest: Path, dpi: int) -> None:
    doc = fitz.open(REF / pid / "source.pdf")
    page = doc[page_no - 1]
    dest.parent.mkdir(parents=True, exist_ok=True)
    page.get_pixmap(clip=rect_of(page, bbox), dpi=dpi).save(dest)


def grid(pid: str, page_no: int, dest: Path) -> None:
    """Page render (110 dpi) with grid lines every 0.05 of width/height, labeled in fractions."""
    doc = fitz.open(REF / pid / "source.pdf")
    page = doc[page_no - 1]
    W, H = page.rect.width, page.rect.height
    for i in range(1, 20):
        f = i / 20
        major = i % 2 == 0
        col = (0.85, 0, 0) if major else (0.2, 0.4, 1)
        page.draw_line((f * W, 0), (f * W, H), color=col, width=0.6 if major else 0.3)
        page.draw_line((0, f * H), (W, f * H), color=col, width=0.6 if major else 0.3)
        if major:
            page.insert_text((f * W + 1, 8), f"{f:.1f}", fontsize=6, color=col)
            page.insert_text((1, f * H - 1), f"{f:.1f}", fontsize=6, color=col)
    dest.parent.mkdir(parents=True, exist_ok=True)
    page.get_pixmap(dpi=110).save(dest)


def fmt(v: float) -> str:
    return f"{v:.4f}".rstrip("0").rstrip(".") if v not in (0.0, 1.0) else f"{v:.1f}"


def edge_check(pid_filter: str | None, apply: bool, dpi: int, skip: set[str]) -> int:
    """Edge-continuation check over data/figures.csv (see module doc)."""
    p = ROOT / "data" / "figures.csv"
    with p.open(newline="") as f:
        rd = csv.DictReader(f)
        cols = list(rd.fieldnames or [])
        rows = list(rd)
    logs = ROOT / "logs"
    logs.mkdir(exist_ok=True)
    rep_path = logs / f"figure_edge_check_{datetime.now().strftime('%Y%m%dT%H%M%S')}.jsonl"
    docs: dict[str, Any] = {}
    page_cache: dict[tuple[str, int], tuple[Any, Any, Any]] = {}
    n_checked = 0
    counts: dict[str, int] = {}
    changed: list[dict[str, str]] = []
    with rep_path.open("w") as rep:
        for r in rows:
            pid = r["paper_id"]
            if pid_filter and pid != pid_filter:
                continue
            if pid not in docs:  # one open document at a time
                d = fitz.open(REF / pid / "source.pdf")
                docs = {pid: (d, body_font_size(d))}
                page_cache.clear()
            doc, body_sz = docs[pid]
            pno = int(r["page"])
            if (pid, pno) not in page_cache:
                page = doc[pno - 1]
                page_cache[(pid, pno)] = (page, page_text_lines(page, body_sz),
                                          page.get_pixmap(dpi=EDGE_DPI, colorspace=fitz.csGRAY, alpha=False))
            page, lines, pix = page_cache[(pid, pno)]
            old = rect_of(page, r["bbox"])
            new, st = edge_extend(page, old, lines, pix)
            n_checked += 1
            cut = {e: v for e, v in st.items() if v != "touch"}
            ext = {e for e, v in cut.items() if v == "extend"}
            amb = {e: v for e, v in cut.items() if v != "extend"}
            cls = ("clean" if not cut else "extend" if not amb else "ambiguous" if not ext else "extend+ambiguous")
            counts[cls] = counts.get(cls, 0) + 1
            W, H = page.rect.width, page.rect.height
            old_b = [float(v) for v in r["bbox"].split(",")]
            new_b = [new.x0 / W, new.y0 / H, new.x1 / W, new.y1 / H]
            # extend only: an unchanged edge keeps its stored value exactly
            for i, e in enumerate(("left", "top", "right", "bottom")):
                if e not in ext:
                    new_b[i] = old_b[i]
                else:
                    new_b[i] = min(new_b[i], old_b[i]) if i < 2 else max(new_b[i], old_b[i])
            bbox_new = ",".join(fmt(v) if new_b[i] != old_b[i] else r["bbox"].split(",")[i]
                                for i, v in enumerate(new_b))
            if cut:
                rep.write(json.dumps({"fig_id": r["fig_id"], "page": pno, "bbox_source": r["bbox_source"],
                                      "class": cls, "edges": st, "bbox": r["bbox"],
                                      "bbox_new": bbox_new if ext else None}) + "\n")
            if ext and apply and r["fig_id"] not in skip:
                was_cand = r["bbox_source"] == "candidate"
                note = (f"{'candidate ' + r['cand_id'] + ' ' if was_cand else ''}bbox {'/'.join(sorted(ext))} edge cut "
                        f"through ink; extended to the first blank gap (L15 edge check {date.today().isoformat()})")
                r["bbox"] = bbox_new
                r["bbox_source"] = "manual"
                r["cand_id"] = ""
                r["notes"] = f"{r['notes']}; {note}" if r["notes"] else note
                changed.append(r)
    print(f"{n_checked} rows checked: {counts}; report {rep_path.relative_to(ROOT)}")
    if apply and changed:
        with p.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
        for r in changed:
            crop(r["paper_id"], int(r["page"]), r["bbox"],
                 REF / r["paper_id"] / "figures" / "key" / f"{r['fig_id']}.png", dpi)
        print(f"applied: {len(changed)} rows extended in data/figures.csv, key crops re-rendered")
    return 0


# Sliver shrink (L29): an edge that edge_extend reports as "sliver" cuts a caption/body/page-wide text line; the bbox
# holds a sliver of that line. Shrink that edge to just inside the text, only when it is unambiguous.
SLIVER_MAX = 0.05  # max shrink, fraction of page height (top/bottom) or width (left/right)
SLIVER_MAX_FRAC = 0.3  # max shrink, fraction of the bbox height/width
SLIVER_MARGIN = 0.07  # a short "label" line in the top/bottom 7 % of the page = running header/footer
SLIVER_TOL_PT = 3.0  # max gap between lines of one caption/paragraph attached to the edge
SLIVER_DIL_PX = 1  # text-line rects grown by this many pixels when testing "this ink is text"


def text_only_pixmap(pdf: Path, page_no: int) -> Any:
    """Grayscale EDGE_DPI render of the page's text only (images and line art removed by an in-memory redaction of a
    separate copy of the document; the source PDF is never written). Glyph ink vs figure ink for the sliver check."""
    d = fitz.open(pdf)
    pg = d[page_no - 1]
    pg.add_redact_annot(pg.rect, fill=False)
    pg.apply_redactions(images=fitz.PDF_REDACT_IMAGE_REMOVE, graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED,
                        text=fitz.PDF_REDACT_TEXT_NONE)
    pix = pg.get_pixmap(dpi=EDGE_DPI, colorspace=fitz.csGRAY, alpha=False)
    d.close()
    return pix


def sliver_shrink(page: fitz.Page, rect: fitz.Rect, lines: list[tuple[fitz.Rect, str]], pix: Any, tpix: Any,
                  edges: list[str]) -> tuple[fitz.Rect, dict[str, str]]:
    """Shrink the given sliver edges of rect (page points). pix = full render, tpix = text-only render (same dpi).
    Returns (new rect, {edge: status}), status: shrink | no_glyph (no glyph ink of the straddling text inside the
    bbox: only its line box overlaps, nothing to trim) | ambiguous:<reason>. Reasons: no_line (no text line straddles
    the edge), label (a straddling line is a short figure-internal/garbled "label" line), figure_ink (non-text ink in
    the strip that would be removed), touch (figure ink on the pixel line next to the text), too_far (shrink beyond
    SLIVER_MAX / SLIVER_MAX_FRAC). Only "shrink" changes the rect."""
    s = pix.width / page.rect.width
    pw, ph = pix.width, pix.height
    H = page.rect.height
    r = fitz.Rect(rect)
    out: dict[str, str] = {}

    def text_role(lr: fitz.Rect, role: str) -> bool:
        return role in ("caption", "body", "wide") or lr.y1 < SLIVER_MARGIN * H or lr.y0 > (1 - SLIVER_MARGIN) * H

    for edge in ("bottom", "top", "right", "left"):
        if edge not in edges:
            continue
        horiz = edge in ("bottom", "top")
        out_dir = 1 if edge in ("bottom", "right") else -1
        x0, y0 = max(0, int(round(r.x0 * s))), max(0, int(round(r.y0 * s)))
        x1, y1 = min(pw, int(round(r.x1 * s))), min(ph, int(round(r.y1 * s)))
        pos = {"bottom": y1, "top": y0 - 1, "right": x1, "left": x0 - 1}[edge]  # first pixel line outside
        e_pt = pos / s
        span = range(x0, x1) if horiz else range(y0, y1)
        extent_px = (y1 - y0) if horiz else (x1 - x0)
        lim = ph if horiz else pw

        def lo(lr: fitz.Rect) -> float:
            return lr.y0 if horiz else lr.x0

        def hi(lr: fitz.Rect) -> float:
            return lr.y1 if horiz else lr.x1

        def across(lr: fitz.Rect) -> bool:
            return lr.x1 > r.x0 and lr.x0 < r.x1 if horiz else lr.y1 > r.y0 and lr.y0 < r.y1

        straddle = [(lr, role) for lr, role in lines if lo(lr) < e_pt < hi(lr) and across(lr)]
        if not straddle:
            out[edge] = "ambiguous:no_line"
            continue
        if not all(text_role(lr, role) for lr, role in straddle):
            out[edge] = "ambiguous:label"
            continue
        txt = [lr for lr, role in lines if across(lr) and text_role(lr, role)]
        # inner boundary of the text attached to the edge (a multi-line caption/paragraph inside the bbox)
        b = min(lo(lr) for lr, _ in straddle) if out_dir > 0 else max(hi(lr) for lr, _ in straddle)
        while True:
            nb = b
            for lr in txt:
                if out_dir > 0 and lo(lr) < nb and hi(lr) > nb - SLIVER_TOL_PT:
                    nb = lo(lr)
                elif out_dir < 0 and hi(lr) > nb and lo(lr) < nb + SLIVER_TOL_PT:
                    nb = hi(lr)
            if nb == b:
                break
            b = nb
        tpx = [fitz.Rect(lr.x0 * s - SLIVER_DIL_PX, lr.y0 * s - SLIVER_DIL_PX,
                         lr.x1 * s + SLIVER_DIL_PX, lr.y1 * s + SLIVER_DIL_PX) for lr in txt]

        def xy(p: int, k: int) -> tuple[int, int]:
            return (k, p) if horiz else (p, k)

        def in_txt(x: int, y: int) -> bool:
            return any(t.x0 <= x + 0.5 <= t.x1 and t.y0 <= y + 0.5 <= t.y1 for t in tpx)

        def glyph(x: int, y: int) -> bool:  # text ink within 1 px (antialiasing differs between the two renders)
            return any(_ink(tpix, xx, yy) for xx in (x - 1, x, x + 1) for yy in (y - 1, y, y + 1)
                       if 0 <= xx < pw and 0 <= yy < ph)

        def row(p: int) -> tuple[bool, bool, int]:
            """(text glyph ink of the edge text on this pixel line, figure ink on it, number of ink pixels)."""
            t = f = False
            n = 0
            for k in span:
                x, y = xy(p, k)
                if not _ink(pix, x, y):
                    continue
                n += 1
                if glyph(x, y) and in_txt(x, y):
                    t = True
                else:
                    f = True
            return t, f, n

        b_px = int(b * s) if out_dir > 0 else int(b * s + 0.999)  # inner side of the attached text, px
        # glyph ink of the attached text inside the bbox: pixel lines from the last inside line to b_px
        p, gi = pos - out_dir, None
        while (p - b_px) * out_dir >= -1 and 0 <= p < lim:
            if row(p)[0]:
                gi = p
            p -= out_dir
        if gi is None:
            out[edge] = "no_glyph"
            continue
        # figure ink in the strip that would be removed (from the glyph ink to the old edge)?
        if any(row(q)[1] for q in range(gi, pos, out_dir)):
            out[edge] = "ambiguous:figure_ink"
            continue
        p1 = gi - out_dir  # first pixel line inward of the glyph ink
        if not (0 <= p1 < lim) or row(p1)[2]:
            out[edge] = "ambiguous:touch"  # no blank pixel line between figure ink and text
            continue
        p2 = p1 - out_dir
        keep_blank = 0 <= p2 < lim and not row(p2)[2]  # two blank lines: leave one of them outside
        last_in = p2 if keep_blank else p1  # last pixel line inside the new bbox (blank)
        boundary = last_in + 1 if out_dir > 0 else last_in
        if abs(boundary - (pos if out_dir > 0 else pos + 1)) > min(SLIVER_MAX * lim, SLIVER_MAX_FRAC * extent_px):
            out[edge] = "ambiguous:too_far"
            continue
        new_pt = boundary / s
        if edge == "bottom":
            r.y1 = new_pt
        elif edge == "top":
            r.y0 = new_pt
        elif edge == "right":
            r.x1 = new_pt
        else:
            r.x0 = new_pt
        out[edge] = "shrink"
    return r, out


def sliver_check(pid_filter: str | None, apply: bool, dpi: int, skip: set[str]) -> int:
    """Sliver shrink over data/figures.csv (see module doc). Report: logs/figure_sliver_check_<ts>.jsonl."""
    p = ROOT / "data" / "figures.csv"
    with p.open(newline="") as f:
        rd = csv.DictReader(f)
        cols = list(rd.fieldnames or [])
        rows = list(rd)
    logs = ROOT / "logs"
    logs.mkdir(exist_ok=True)
    rep_path = logs / f"figure_sliver_check_{datetime.now().strftime('%Y%m%dT%H%M%S')}.jsonl"
    docs: dict[str, Any] = {}
    page_cache: dict[tuple[str, int], tuple[Any, Any, Any]] = {}
    tpix_cache: dict[tuple[str, int], Any] = {}
    n_checked = 0
    counts: dict[str, int] = {}
    changed: list[dict[str, str]] = []
    with rep_path.open("w") as rep:
        for r in rows:
            pid = r["paper_id"]
            if pid_filter and pid != pid_filter:
                continue
            if pid not in docs:
                tpix_cache.clear()
                d = fitz.open(REF / pid / "source.pdf")
                docs = {pid: (d, body_font_size(d))}
                page_cache.clear()
            doc, body_sz = docs[pid]
            pno = int(r["page"])
            if (pid, pno) not in page_cache:
                page = doc[pno - 1]
                page_cache[(pid, pno)] = (page, page_text_lines(page, body_sz),
                                          page.get_pixmap(dpi=EDGE_DPI, colorspace=fitz.csGRAY, alpha=False))
            page, lines, pix = page_cache[(pid, pno)]
            n_checked += 1
            old = rect_of(page, r["bbox"])
            _, st = edge_extend(page, old, lines, pix)
            sl = [e for e, v in st.items() if v == "sliver"]
            if not sl:
                counts["no_sliver"] = counts.get("no_sliver", 0) + 1
                continue
            if (pid, pno) not in tpix_cache:
                tpix_cache[(pid, pno)] = text_only_pixmap(REF / pid / "source.pdf", pno)
            new, sst = sliver_shrink(page, old, lines, pix, tpix_cache[(pid, pno)], sl)
            W, H = page.rect.width, page.rect.height
            old_s = r["bbox"].split(",")
            nb = [new.x0 / W, new.y0 / H, new.x1 / W, new.y1 / H]
            shr = [e for e in sl if sst[e] == "shrink"]
            idx = {"left": 0, "top": 1, "right": 2, "bottom": 3}
            new_s = [fmt(nb[i]) if e in shr else old_s[i] for e, i in idx.items()]
            # re-check: a shrunk edge must not cut ink (edge_extend on the stored, rounded bbox)
            rst: dict[str, str] = {}
            if shr:
                _, rst = edge_extend(page, rect_of(page, ",".join(new_s)), lines, pix)
                for e in shr:
                    if rst.get(e, "touch") != "touch":
                        sst[e] = f"ambiguous:recheck_{rst[e]}"
                        new_s[idx[e]] = old_s[idx[e]]
                shr = [e for e in sl if sst[e] == "shrink"]
            amb = {e: sst[e] for e in sl if sst[e].startswith("ambiguous")}
            cls = ("+".join(c for c, on in (("shrink", shr), ("ambiguous", amb)) if on)
                   or "no_glyph")  # no_glyph: only the line box of the text overlaps the bbox, no glyph ink
            if r["fig_id"] in skip:
                cls = f"skip({cls})"
            counts[cls] = counts.get(cls, 0) + 1
            shrink_frac = {e: round(abs(float(new_s[idx[e]]) - float(old_s[idx[e]])), 4) for e in shr}
            rep.write(json.dumps({"fig_id": r["fig_id"], "page": pno, "bbox_source": r["bbox_source"],
                                  "class": cls, "edges": st, "sliver": sst, "shrink": shrink_frac,
                                  "bbox": r["bbox"], "bbox_new": ",".join(new_s) if shr else None,
                                  "recheck": rst or None}) + "\n")
            if shr and apply and r["fig_id"] not in skip:
                was_cand = r["bbox_source"] == "candidate"
                note = (f"{'candidate ' + r['cand_id'] + ' ' if was_cand else ''}bbox {'/'.join(sorted(shr))} edge cut "
                        f"a caption/body text line; shrunk to just inside it (L29 sliver check "
                        f"{date.today().isoformat()}; was {r['bbox']})")
                r["bbox"] = ",".join(new_s)
                r["bbox_source"] = "manual"
                r["cand_id"] = ""
                r["notes"] = f"{r['notes']}; {note}" if r["notes"] else note
                changed.append(r)
    print(f"{n_checked} rows checked: {counts}; report {rep_path.relative_to(ROOT)}")
    if apply and changed:
        with p.open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            w.writerows(rows)
        for r in changed:
            crop(r["paper_id"], int(r["page"]), r["bbox"],
                 REF / r["paper_id"] / "figures" / "key" / f"{r['fig_id']}.png", dpi)
        print(f"applied: {len(changed)} rows shrunk in data/figures.csv, key crops re-rendered")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--staging")
    ap.add_argument("--out")
    ap.add_argument("--paper")
    ap.add_argument("--grid", type=int)
    ap.add_argument("--page", type=int)
    ap.add_argument("--bbox")
    ap.add_argument("--spec", action="append", default=[], help="PAGE:x0,y0,x1,y1 (repeatable)")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dpi", type=int, default=200)
    ap.add_argument("--edge-check", action="store_true", help="report bbox edges that cut through ink")
    ap.add_argument("--sliver-check", action="store_true", help="report/shrink bbox edges that cut a text line")
    ap.add_argument("--apply", action="store_true",
                    help="with --edge-check / --sliver-check: write the new bboxes and re-crop")
    ap.add_argument("--skip", action="append", default=[], help="with --apply: fig_id to leave unchanged (repeatable)")
    a = ap.parse_args()
    if a.edge_check and a.sliver_check:
        ap.error("--edge-check and --sliver-check are separate passes")
    if a.edge_check:
        return edge_check(a.paper, a.apply, a.dpi, set(a.skip))
    if a.sliver_check:
        return sliver_check(a.paper, a.apply, a.dpi, set(a.skip))
    if a.apply:
        ap.error("--apply needs --edge-check or --sliver-check")
    out = Path(a.out).resolve() if a.out else None
    if a.grid:
        if not (a.paper and out):
            ap.error("--grid needs --paper and --out")
        dest = out / f"{a.paper}_p{a.grid:02d}_grid.png"
        grid(a.paper, a.grid, dest)
        print(dest)
        return 0
    specs = a.spec + ([f"{a.page}:{a.bbox}"] if a.bbox else [])
    if specs:
        if not (a.paper and out) or (a.bbox and not a.page):
            ap.error("--bbox/--spec need --paper and --out (and --page with --bbox)")
        for sp in specs:
            pg, _, bb = sp.partition(":")
            dest = out / f"{a.paper}_p{int(pg):02d}_{bb.replace(',', '_')}.png"
            crop(a.paper, int(pg), bb, dest, a.dpi)
            print(dest)
        return 0
    src = (ROOT / a.staging) if a.staging else ROOT / "data"
    if a.staging and not out:
        ap.error("--staging needs --out (crops of unmerged rows never go into references/)")
    p = src / "figures.csv"
    rows = list(csv.DictReader(p.open())) if p.exists() else []
    n = skipped = 0
    for r in rows:
        if a.paper and r["paper_id"] != a.paper:
            continue
        dest = (out / f"{r['fig_id']}.png") if out else REF / r["paper_id"] / "figures" / "key" / f"{r['fig_id']}.png"
        if dest.exists() and not a.force:
            skipped += 1
            continue
        crop(r["paper_id"], int(r["page"]), r["bbox"], dest, a.dpi)
        n += 1
    print(f"{n} crops written, {skipped} existing skipped ({src.relative_to(ROOT)}/figures.csv)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
