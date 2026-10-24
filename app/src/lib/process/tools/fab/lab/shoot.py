#!/usr/bin/env python3
"""Headless screenshots of the dev-only fab tool lab (lane L37).

The dev server must already run (tmux apa-l37: `pnpm dev --port 47363 --strictPort --host 127.0.0.1` in app/).
Saves cache/process3d_renders/tools_fab/<ts>/<tool>_<scale>[_<method>]_t<t>[_<view>].png plus report.json (lab
state, draw calls, triangles, console errors).

Usage: uv run --with playwright python app/src/lib/process/tools/fab/lab/shoot.py [--tools ID ...] [--t 0 0.3 0.6 1]
       [--block] [--views iso ...] [--extra 'tool=cmp&scale=block&t=0.5' ...] [--base URL] [--chromium PATH]
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
PAGE = "/src/lib/process/tools/fab/lab/index.htm"
TOOLS = [
    "cmp", "grinder", "drie", "cvd", "pvd", "ecp", "litho", "spin_coater", "laminator_roll", "wet_bench", "cure_oven",
    "wafer_bonder", "laser_debond", "dicing_blade",
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
    ap.add_argument("--base", default="http://127.0.0.1:47363")
    ap.add_argument("--tools", nargs="*", default=TOOLS)
    ap.add_argument("--t", nargs="*", type=float, default=[0, 0.3, 0.6, 1])
    ap.add_argument("--views", nargs="*", default=["iso"])
    ap.add_argument("--block", action="store_true", help="also the block scale at t = 0.5")
    ap.add_argument("--actual", action="store_true", help="also actual (non-illustrative) work scale at t = 0.5")
    ap.add_argument("--extra", nargs="*", default=[], help="raw hashes, saved as extra_<i>.png")
    ap.add_argument("--chromium")
    ap.add_argument("--out", help="output folder name (default: timestamp)")
    ap.add_argument("--settle-ms", type=int, default=600)
    a = ap.parse_args()
    ts = a.out or dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = ROOT / "cache" / "process3d_renders" / "tools_fab" / ts
    out.mkdir(parents=True, exist_ok=True)
    shots: list[tuple[str, str]] = []
    for tool in a.tools:
        for view in a.views:
            for t in a.t:
                shots.append((f"{tool}_work_t{t:g}_{view}", f"tool={tool}&scale=work&t={t}&view={view}"))
        if a.block:
            shots.append((f"{tool}_block_t0.5", f"tool={tool}&scale=block&t=0.5&view=iso"))
        if a.actual:
            shots.append((f"{tool}_work_actual_t0.5", f"tool={tool}&scale=work&t=0.5&ill=0&view=iso"))
    for i, h in enumerate(a.extra):
        shots.append((f"extra_{i}_" + re.sub(r"[^a-z0-9]+", "_", h)[:60], h))
    report: dict[str, object] = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium(a.chromium), args=ARGS)
        pg = b.new_page(viewport={"width": 1500, "height": 900})
        errs: list[str] = []
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for name, h in shots:
            errs.clear()
            pg.goto(f"{a.base}{PAGE}#{h}")
            pg.reload()
            pg.wait_for_function("window.__lab && window.__lab.ready", timeout=120_000)
            pg.wait_for_timeout(a.settle_ms)
            pg.screenshot(path=str(out / f"{name}.png"))
            report[name] = {"hash": h, "lab": pg.evaluate("window.__lab"), "errors": list(errs)}
            print(name, report[name]["lab"], errs[:2], flush=True)
        b.close()
    (out / "report.json").write_text(json.dumps(report, indent=1))
    print(out)


if __name__ == "__main__":
    main()
