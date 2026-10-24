#!/usr/bin/env python3
"""Headless screenshots of the dev-only material lab (lane L36).

The dev server must already run (tmux apa-l36: `pnpm dev --port 47362 --strictPort --host 127.0.0.1` in app/).
Saves cache/process3d_renders/materials/<ts>/<name>.png plus console errors to report.json.

Usage: uv run --with playwright python app/src/lib/process/materials/lab/shoot.py [--base URL] [--only NAME ...]
       [--chromium PATH]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[6]
PW_CACHE = Path.home() / "Library" / "Caches" / "ms-playwright"
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
PAGE = "/src/lib/process/materials/lab/index.htm"

# name -> hash
SHOTS: dict[str, str] = {
    "grid_default": "mode=grid&shape=block&um=10",
    "grid_rig_room": "mode=grid&shape=block&um=10&rig=room",
    "grid_rig_rec": "mode=grid&shape=block&um=10&rig=rec",
    "grid_plain": "mode=grid&shape=block&um=10&plain=1",
    "grid_section": "mode=grid&shape=block&um=10&cut=1",
    "si_coarse_wafer": "key=si&shape=wafer&um=150000&finish=0",
    "si_fine_wafer": "key=si&shape=wafer&um=150000&finish=0.5",
    "si_fine_wafer_r100": "key=si&shape=wafer&um=150000&finish=0.5&wheel_mm=100&offset_mm=100",
    "si_fine_wafer_off120": "key=si&shape=wafer&um=150000&finish=0.5&wheel_mm=150&offset_mm=120",
    "si_polished_wafer": "key=si&shape=wafer&um=150000&finish=1",
    "si_fine_100um": "key=si&shape=block&um=50&finish=0.5",
    "cu_plated_10um": "key=cu&um=5&finish=0",
    "cu_cmp_10um": "key=cu&um=5&finish=1",
    "cu_plated_inst_cut": "key=cu&um=20&finish=0&inst=1&cut=1",
    "cu_seed": "key=cu_seed&um=10",
    "solder_plated": "key=solder&um=10&finish=0&melt=0",
    "solder_liquid": "key=solder&um=10&melt=1",
    "solder_solid": "key=solder&um=10&finish=1&melt=0",
    "paste": "key=solder_paste&um=60&finish=0&melt=0",
    "paste_molten": "key=solder_paste&um=60&melt=1",
    "emc_molded": "key=emc&um=60&finish=0&cure=1",
    "emc_ground": "key=emc&um=60&finish=1&cure=1",
    "emc_front": "key=emc&um=60&cure=0&front=0.6",
    "underfill_front": "key=underfill&um=60&cure=0&front=0.55",
    "underfill_world_front_inst": "key=underfill&um=60&cure=0&front=0.5&inst=1&wfront=1",
    "underfill_cured": "key=underfill&um=60&cure=1",
    "core_weave": "key=core&um=600&cut=1",
    "core_weave_fine": "key=core&um=60&cut=1",
    "resist_unexposed": "key=resist&um=10&exposed=0",
    "resist_exposed": "key=resist&um=10&exposed=1",
    "dry_film": "key=dry_film&um=50&exposed=0",
    "dry_film_exposed": "key=dry_film&um=50&exposed=1",
    "polyimide": "key=polyimide&um=10&cure=1",
    "glass": "key=glass&um=500",
    "steel": "key=steel&um=200&finish=0",
    "solder_resist": "key=solder_resist&um=100",
    "au": "key=au&um=10",
    "al": "key=al&um=10",
    "slurry": "key=slurry&um=1000&front=0.7",
    "electrolyte": "key=electrolyte&um=1000",
    "ceramic": "key=ceramic&um=100&finish=0",
    "ceramic_lapped": "key=ceramic&um=100&finish=1",
    "ceramic_sic": "key=ceramic_sic&um=100",
    "silicone": "key=silicone&um=200&cure=1",
    "silicone_front": "key=silicone&um=200&cure=0&front=0.6",
    "pet": "key=pet&um=200",
    "water": "key=water&um=1000",
    "temp_900": "key=steel&um=200&temp_c=900",
}


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
    ap.add_argument("--base", default="http://127.0.0.1:47362")
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--chromium")
    ap.add_argument("--settle-ms", type=int, default=2500)
    a = ap.parse_args()
    ts = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = ROOT / "cache" / "process3d_renders" / "materials" / ts
    out.mkdir(parents=True, exist_ok=True)
    report: dict[str, object] = {}
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium(a.chromium), args=ARGS)
        pg = b.new_page(viewport={"width": 1500, "height": 900})
        errs: list[str] = []
        pg.on("console", lambda m: errs.append(m.text) if m.type in ("error", "warning") else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for name, h in SHOTS.items():
            if a.only and name not in a.only:
                continue
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
