#!/usr/bin/env python3
"""Headless screenshots of the dev-only assembly tool lab (lane L38).

The dev server must already run (tmux apa-l38: `pnpm dev --port 47364 --strictPort --host 127.0.0.1` in app/).
Saves cache/process3d_renders/tools_assembly/<ts>/<tool>_<scale>_<ill|act>_t<t>.png plus report.json.

Usage: uv run --with playwright python app/src/lib/process/tools/assembly/lab/shoot.py [--only ID ...]
       [--scales work block] [--ts 0 0.3 0.6 1] [--actual] [--base URL]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[7]
PW_CACHE = Path.home() / "Library" / "Caches" / "ms-playwright"
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
PAGE = "/src/lib/process/tools/assembly/lab/index.htm"
IDS = [
    "tcb_head", "pick_place", "pick_place_nozzle", "jet_dispenser", "jet_dispenser_bead", "mold_chase",
    "reflow_oven", "ball_placer", "stencil_printer", "laminator", "laser_drill", "laser_drill_recess",
    "xray_ct", "xray_sam",
]


def chromium(cli: str | None) -> str | None:
    if cli:
        return cli
    if os.environ.get("APA_CHROMIUM"):
        return os.environ["APA_CHROMIUM"]

    def rev(p: Path) -> int:
        m = re.search(r"-(\d+)$", p.name)
        return int(m.group(1)) if m else -1

    for d in sorted(PW_CACHE.glob("chromium_headless_shell-*"), key=rev, reverse=True):
        exe = sorted(d.glob("chrome-headless-shell-*/chrome-headless-shell"))
        if exe:
            return str(exe[0])
    return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:47364")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--scales", nargs="*", default=["work", "block"])
    ap.add_argument("--ts", nargs="*", type=float, default=[0.0, 0.3, 0.6, 1.0])
    ap.add_argument("--actual", action="store_true", help="also shoot actual (non-illustrative) mode")
    ap.add_argument("--chromium")
    ap.add_argument("--settle-ms", type=int, default=600)
    ap.add_argument("--out")
    a = ap.parse_args()
    ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = Path(a.out) if a.out else ROOT / "cache" / "process3d_renders" / "tools_assembly" / ts
    out.mkdir(parents=True, exist_ok=True)
    report: dict[str, object] = {}
    modes = [1, 0] if a.actual else [1]
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium(a.chromium), args=ARGS)
        pg = b.new_page(viewport={"width": 1500, "height": 900})
        errs: list[str] = []
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        first = True
        for tid in IDS:
            if a.only and tid not in a.only:
                continue
            for sc in a.scales:
                for ill in modes:
                    for t in a.ts:
                        errs.clear()
                        h = f"tool={tid}&scale={sc}&ill={ill}&t={t:.3f}"
                        if first:
                            pg.goto(f"{a.base}{PAGE}#{h}")
                            first = False
                        else:
                            pg.evaluate(f"location.hash = '{h}'")
                        pg.wait_for_function("window.__toolLab && window.__toolLab.ready", timeout=120_000)
                        pg.wait_for_timeout(a.settle_ms)
                        name = f"{tid}_{sc}_{'ill' if ill else 'act'}_t{t:.1f}"
                        pg.screenshot(path=str(out / f"{name}.png"))
                        lab = pg.evaluate("({id: window.__toolLab.id, tris: window.__toolLab.tris, calls: window.__toolLab.calls})")
                        report[name] = {"hash": h, "lab": lab, "errors": list(errs)}
                        print(name, lab, errs[:2], flush=True)
        b.close()
    (out / "report.json").write_text(json.dumps(report, indent=1))
    print(out)


if __name__ == "__main__":
    main()
