#!/usr/bin/env python3
"""Draw calls and visible transmissive meshes for the budget-overage shots (lane L36, 2026-10-23).

Same page state as scripts/render_process3d.py (default scale per step, PiP on): seek (k, t), frame(), then
__apaProc.stats().calls and __apaProc.debugScene() (per scene: meshes, transmissive mesh count). Prints a table and
writes cache/process3d_renders/materials/calls_<tag>_<ts>.json.

Usage: uv run --with playwright python app/src/lib/process/materials/lab/calls_check.py --base-url URL --tag before
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
# (flow, route, step id suffix, t list, illustrative list)
TARGETS = [
    ("cowos_s_composite", "main", "c4_bumping", [0.0, 0.5, 1.0], [True, False]),
    ("ectc51687.2025.00027-F1", "lts_lts", "s09", [0.5, 1.0], [True]),
    ("ectc51687.2025.00027-F1", "lts_sac", "s09", [0.5, 1.0], [True]),
    ("ectc51687.2025.00027-F1", "sac_lts", "s09", [0.5, 1.0], [True]),
    ("emib_composite", "emib", "bumps", [0.0], [True, False]),
    ("emib_composite", "emib_t", "fli_t", [0.0], [True, False]),
    ("emib_composite", "emib_t", "bga", [0.5, 1.0], [True, False]),
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
        "async ([fn,a]) => { const h = window.__apaProc; if(!h || !h[fn]) return null; const r = await h[fn](...a); return r===undefined?true:r; }",
        [fn, list(a)],
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", required=True)
    ap.add_argument("--tag", default="check")
    a = ap.parse_args()
    rows = []
    with sync_playwright() as pw:
        br = pw.chromium.launch(executable_path=chromium(), args=ARGS)
        page = br.new_page(viewport={"width": 1600, "height": 950})
        page.goto(f"{a.base_url}/3d#mode=process", wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=120000)
        hook(page, "ready")
        flows = {f["id"]: f for f in hook(page, "flows")}
        for flow, route, suffix, ts, ills in TARGETS:
            hook(page, "setFlow", flow)
            hook(page, "setRoute", route)
            steps = next(r["steps"] for r in flows[flow]["routes"] if r["id"] == route)
            k = next(i for i, s in enumerate(steps) if s.endswith(suffix))
            for ill in ills:
                hook(page, "setIllustrative", ill)
                hook(page, "setScale", None)
                for t in ts:
                    hook(page, "seek", k, t)
                    hook(page, "frame")
                    page.wait_for_timeout(250)
                    st = hook(page, "stats") or {}
                    dbg = hook(page, "debugScene") or {}
                    row = {"flow": flow, "route": route, "step": steps[k], "k": k, "t": t, "ill": ill, "calls": st.get("calls"),
                           "primary": st.get("primary"), "pip": st.get("pip"), "scene": dbg}
                    rows.append(row)
                    print(f"{flow:26s} {route:8s} {steps[k]:18s} t={t:.2f} {'ill' if ill else 'act'} calls={st.get('calls')} "
                          f"{st.get('primary')}/{st.get('pip')} {json.dumps(dbg)[:220]}", flush=True)
        br.close()
    out = ROOT / "cache" / "process3d_renders" / "materials" / f"calls_{a.tag}_{dt.datetime.now():%Y%m%d_%H%M%S}.json"
    out.write_text(json.dumps(rows, indent=1))
    print(out)


if __name__ == "__main__":
    main()
