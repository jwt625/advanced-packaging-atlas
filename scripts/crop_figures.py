"""Render key-figure crops from figures.csv rows, and gridded page renders for reading a manual bbox (DevLog-005).

Crops are local-only (licensed sources): by default references/<paper_id>/figures/key/<fig_id>.png from data/figures.csv.

Usage:
  uv run python scripts/crop_figures.py                                   # all data/figures.csv rows (skip existing)
  uv run python scripts/crop_figures.py --staging data/_staging/<b> --out <dir>   # check a batch's crops
  uv run python scripts/crop_figures.py --paper ID --grid PAGE --out <dir>        # page render with a 0.05 grid
  uv run python scripts/crop_figures.py --paper ID --page N --bbox x0,y0,x1,y1 --out <dir>   # one ad-hoc crop
  uv run python scripts/crop_figures.py --paper ID --spec N:x0,y0,x1,y1 [--spec ...] --out <dir>  # several
Options: --force (overwrite existing crops), --dpi (default 200).
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import pymupdf as fitz

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
    a = ap.parse_args()
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
