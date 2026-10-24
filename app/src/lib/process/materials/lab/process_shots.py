#!/usr/bin/env python3
"""Material check shots in the real 3D-tab Process mode (lane L36, audit V1 C2 / M8-M10).

Drives the page through window.__apaProc (setFlow, setRoute, setIllustrative, setScale, seek) like the V1 audit
shots.py. Saves cache/process3d_renders/materials/process_<tag>_<ts>/<name>.png and swatch.json (mean RGB of small
probe boxes is NOT computed here; look at the images).

Usage: uv run --with playwright python app/src/lib/process/materials/lab/process_shots.py --base-url URL --tag before
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[6]
PW = Path.home() / "Library" / "Caches" / "ms-playwright"
ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
C, E, P = "cowos_s_composite", "emib_composite", "ectc51687.2025.00027-F1"
JOBS = [
    {"name": "cmp_cell", "flow": C, "route": "main", "k": 4, "t": 0.5, "scale": "cell"},
    {"name": "cmp_t090_cell", "flow": C, "route": "main", "k": 4, "t": 0.9, "scale": "cell"},
    {"name": "ecp_t060_cell", "flow": C, "route": "main", "k": 3, "t": 0.6, "scale": "cell"},
    {"name": "grind_auto", "flow": C, "route": "main", "k": 9, "t": 0.5, "scale": None},
    {"name": "reflow_c4_cell", "flow": C, "route": "main", "k": 19, "t": 1.0, "scale": "cell"},
    {"name": "cow_block", "flow": C, "route": "main", "k": 11, "t": 1.0, "scale": "block"},
    {"name": "onsub_cell", "flow": C, "route": "main", "k": 22, "t": 1.0, "scale": "cell"},
    {"name": "tcb_block", "flow": E, "route": "emib", "k": 7, "t": 0.5, "scale": "block"},
    {"name": "bga_block", "flow": E, "route": "emib", "k": 11, "t": 1.0, "scale": "block"},
    {"name": "bga_cell", "flow": E, "route": "emib", "k": 11, "t": 1.0, "scale": "cell"},
    {"name": "ball_block", "flow": P, "route": "lts_lts", "k": 21, "t": 0.5, "scale": "block"},
    {"name": "debond_glass_block", "flow": P, "route": "lts_lts", "k": 10, "t": 0.5, "scale": "block"},
    {"name": "debond_work", "flow": P, "route": "lts_lts", "k": 10, "t": 0.5, "scale": "work"},
    {"name": "carrier_bond_block", "flow": P, "route": "lts_lts", "k": 7, "t": 1.0, "scale": "block"},
    {"name": "carrier_bond_work", "flow": P, "route": "lts_lts", "k": 7, "t": 1.0, "scale": "work"},
]


def chromium() -> str | None:
    def rev(p: Path) -> int:
        m = re.search(r"-(\d+)$", p.name)
        return int(m.group(1)) if m else -1

    for d in sorted(PW.glob("chromium_headless_shell-*"), key=rev, reverse=True):
        ex = sorted(d.glob("chrome-headless-shell-*/chrome-headless-shell"))
        if ex:
            return str(ex[0])
    return None


def hook(page, fn, *a):
    return page.evaluate(
        "async ([fn,a]) => { const h = window.__apaProc; if(!h) return null; const r = await h[fn](...a); return r===undefined?true:r; }",
        [fn, list(a)],
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--tag", default="check")
    ap.add_argument("--only", nargs="*")
    a = ap.parse_args()
    out = ROOT / "cache" / "process3d_renders" / "materials" / f"process_{a.tag}_{dt.datetime.now():%Y%m%d_%H%M%S}"
    out.mkdir(parents=True, exist_ok=True)
    errs: list[str] = []
    w, h = 1600, 950
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=chromium(), args=ARGS)
        ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
        ctx.add_init_script("try{localStorage.setItem('ap-atlas-theme','dark')}catch(e){}")
        page = ctx.new_page()
        page.on("console", lambda m: errs.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
        page.goto(f"{a.base_url}/3d#mode=process", wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=120000)
        hook(page, "ready")
        cur = None
        for j in JOBS:
            if a.only and j["name"] not in a.only:
                continue
            if (j["flow"], j["route"]) != cur:
                hook(page, "setFlow", j["flow"])
                hook(page, "setRoute", j["route"])
                cur = (j["flow"], j["route"])
            hook(page, "setIllustrative", True)
            hook(page, "setScale", j["scale"])
            page.mouse.move(w // 2, h - 5)
            hook(page, "seek", j["k"], j["t"])
            page.evaluate("async () => { const h = window.__apaProc; if (h && h.frame) await h.frame(); }")
            page.wait_for_timeout(600)
            page.screenshot(path=str(out / f"{j['name']}.png"), clip={"x": 0, "y": 96, "width": w - 250, "height": h - 140})
            st = hook(page, "stats") or {}
            nm = page.evaluate("() => document.querySelector('.hudbox')?.innerText?.split('\\n').slice(0, 3).join(' | ') ?? ''")
            print(j["name"], st.get("materials"), st.get("primary"), nm, flush=True)
        br.close()
    (out / "errors.json").write_text(json.dumps(errs, indent=1))
    print("ERRORS", len(errs), errs[:5])
    print(out)


if __name__ == "__main__":
    main()
