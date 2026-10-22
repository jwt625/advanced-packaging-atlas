"""Re-extract every cached PDF with the current extractor and list papers whose garbled flag changed.
Writes logs/recheck_text_layers_<ts>.jsonl. Usage: uv run python scripts/recheck_text_layers.py

--scan-text (DevLog-013 L16/L25): text-only, report-only scan of every references/<id>/text.md for partial damage the
garbled-page flag misses. Never re-extracts, never writes text.md, source.json or warnings. Per page:
  shift29   >= 50 control characters (Unicode Cc except tab/newline/CR) and the lines holding U+0003, decoded by
            +29 code points, have a common-word ratio >= 0.05 (a font-shifted copy or shifted labels/headings);
  unit_loss >= 3 hits of a lost unit glyph: digit + 'Pm' (micro as 'P'), 'urn' / '11m' / '!lm' / '/lm' / '!-Lm'
            (OCR-like copies of um), or 'm' + U+0002 (lost Ohm sign).
Papers whose warning says the text is tesseract OCR ("unusable") are skipped (the patterns would hit OCR noise).
Report: logs/recheck_text_layers_scan_<ts>.jsonl (one row per flagged paper plus a summary row); each new hit needs a
manual check against the page renders before a TEXT_LAYER_WARNING.md is written.
Usage: uv run python scripts/recheck_text_layers.py --scan-text
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from extract_source import COMMON  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "references"
PAGE = re.compile(r"<!-- page (\d+) -->")
UNIT_LOSS = re.compile(r"\d\s?(Pm\b|urn\b|11m\b|!lm|/lm\b|!-Lm)|m\x02")
SHIFT_MIN_CC, SHIFT_MIN_COMMON, UNIT_MIN_HITS = 50, 0.05, 3


def warning_kind(d: Path) -> str:
    w = d / "TEXT_LAYER_WARNING.md"
    if not w.exists():
        return "none"
    head = w.read_text(encoding="utf-8").split("\n", 1)[0]
    return "unusable" if head.startswith("text layer unusable") else "partly_damaged"


def shift29(page: str) -> tuple[int, float] | None:
    cc = sum(1 for c in page if unicodedata.category(c) == "Cc" and c not in "\t\n\r")
    if cc < SHIFT_MIN_CC:
        return None
    lines = [ln for ln in page.splitlines() if "\x03" in ln]
    dec = "\n".join("".join(chr(ord(c) + 29) for c in ln) for ln in lines)
    ratio = len(COMMON.findall(dec)) / max(1, len(dec.split()))
    return (cc, round(ratio, 3)) if ratio >= SHIFT_MIN_COMMON else None


def scan_text() -> int:
    ts = f"{dt.datetime.now():%Y%m%dT%H%M%S}"
    log = ROOT / "logs" / f"recheck_text_layers_scan_{ts}.jsonl"
    log.parent.mkdir(exist_ok=True)
    rows, skipped, scanned = [], [], 0
    for d in sorted(REFS.iterdir()):
        tm = d / "text.md"
        if d.name.startswith("_") or not tm.exists():
            continue
        kind = warning_kind(d)
        if kind == "unusable":
            skipped.append(d.name)
            continue
        scanned += 1
        parts = PAGE.split(tm.read_text(encoding="utf-8"))
        s29, unit, examples = [], [], []
        for i in range(1, len(parts), 2):
            pno, body = int(parts[i]), parts[i + 1]
            if shift29(body) is not None:
                s29.append(pno)
            hits = [m.group(0) for m in UNIT_LOSS.finditer(body)]
            if len(hits) >= UNIT_MIN_HITS:
                unit.append(pno)
                examples.append(f"p.{pno}: " + ", ".join(repr(h) for h in hits[:3]))
        if s29 or unit:
            rows.append({"paper_id": d.name, "warning": kind, "shifted_copy_pages": s29,
                         "unit_glyph_loss_pages": unit, "unit_examples": examples[:4]})
    warned = {d.name for d in REFS.iterdir() if (d / "text.md").exists() and warning_kind(d) == "partly_damaged"}
    flagged = {r["paper_id"] for r in rows}
    summary = {"summary": True, "scanned": scanned, "skipped_ocr_warning": len(skipped), "flagged": len(flagged),
               "flagged_with_warning": sorted(flagged & warned), "flagged_without_warning": sorted(flagged - warned),
               "warned_not_flagged": sorted(warned - flagged)}
    with log.open("w", encoding="utf-8") as f:
        for r in rows + [summary]:
            f.write(json.dumps(r, ensure_ascii=True) + "\n")
    for r in rows:
        print(json.dumps(r, ensure_ascii=True))
    print(json.dumps(summary, ensure_ascii=True))
    print(f"report {log.relative_to(ROOT)}")
    return 0


def recheck() -> int:
    from extract_source import extract

    log = ROOT / "logs" / f"recheck_text_layers_{dt.datetime.now():%Y%m%dT%H%M%S}.jsonl"
    for d in sorted(REFS.iterdir()):
        if d.name == "_inbox" or not (d / "source.pdf").exists():
            continue
        before = json.loads((d / "source.json").read_text()).get("garbled_text_layer") if (d / "source.json").exists() else None
        info = extract(d.name)
        row = {"paper_id": d.name, "before": before, "after": info["garbled_text_layer"],
               "pages": info.get("garbled_pages"), "number_missing_pages": info.get("number_missing_pages")}
        with log.open("a") as f:
            f.write(json.dumps(row) + "\n")
        print(json.dumps(row), flush=True)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scan-text", action="store_true", help="report-only text.md scan (shift29, unit_loss)")
    a = ap.parse_args()
    return scan_text() if a.scan_text else recheck()


if __name__ == "__main__":
    sys.exit(main())
