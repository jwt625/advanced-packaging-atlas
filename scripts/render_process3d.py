#!/usr/bin/env python3
"""Headless renders and checks of the 3D tab Process mode (DevLog-016, lane L35).

Per flow (default: every flow the page lists): every step at t = 0, 0.5, 1 in illustrative and actual mode, saved as
cache/process3d_renders/engine/<ts>/<flow>/<k>_<step>_<t>_<ill|act>.png, with renderer stats per shot (draw calls,
triangles, instances, update and render CPU ms), console / page errors, a determinism check (forward sweep vs
backward sweep of the evaluated state through the page's seek path) and a pixel check (the same (step, t) rendered
after arriving forward and after arriving backward gives the same PNG). Report: report.json in the output folder.
Log: logs/render_process3d_<ts>.log.

The dev server must already run; this script never starts or stops it. SwiftShader software GL: frame times here
are not the M-class laptop numbers (CPU ms of the update are still meaningful as an upper bound).

Usage: uv run --with playwright python scripts/render_process3d.py --base-url http://127.0.0.1:47361
       [--flow ID ...] [--ts T ...] [--no-actual] [--chromium PATH] [--settle-ms N]
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PW_CACHE = Path.home() / "Library" / "Caches" / "ms-playwright"
CHROMIUM_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
VIEWPORT = {"width": 1600, "height": 950}
BUDGET = {"calls": 150, "triangles": 1_000_000}  # L35 performance budget
# (flow, route or "", step, t, bodies, rule over {body: [z0, z1]} piece frame, label)
REGRESSION = [
    ("cowos_s_composite", "", step, 1.0, ["tsv_cu", "bs_pass", "liner"],
     lambda z: abs(z["tsv_cu"][0] - z["bs_pass"][0]) < 0.05 and z["tsv_cu"][1] >= 775 and z["liner"][1] - z["liner"][0] > 0.1,
     "A2 N1: TSV column intact to the M1 landing, tips flush with the backside passivation, front liner kept")
    for step in ("tsv_reveal", "c4_bumping")
]


class Log:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.fh = path.open("a", encoding="utf-8")

    def __call__(self, msg: str) -> None:
        line = f"{dt.datetime.now().isoformat(timespec='seconds')} {msg}"
        print(line, flush=True)
        self.fh.write(line + "\n")
        self.fh.flush()


def find_chromium(cli: str | None) -> str | None:
    if cli:
        return cli
    env = os.environ.get("APA_CHROMIUM")
    if env:
        return env

    def rev(p: Path) -> int:
        m = re.search(r"-(\d+)$", p.name)
        return int(m.group(1)) if m else -1

    for d in sorted(PW_CACHE.glob("chromium_headless_shell-*"), key=rev, reverse=True):
        exe = sorted(d.glob("chrome-headless-shell-*/chrome-headless-shell"))
        if exe and exe[0].is_file():
            return str(exe[0])
    return None


def hook(page: Page, fn: str, *args: Any) -> Any:
    return page.evaluate(
        "async ([fn, args]) => { const h = window.__apaProc; if (!h || typeof h[fn] !== 'function') return null;"
        " const r = await h[fn](...args); return r === undefined ? true : r; }", [fn, list(args)])


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://127.0.0.1:47361")
    ap.add_argument("--flow", action="append", default=[])
    ap.add_argument("--ts", type=float, action="append", default=[])
    ap.add_argument("--no-actual", action="store_true")
    ap.add_argument("--chromium")
    ap.add_argument("--settle-ms", type=int, default=250)
    ap.add_argument("--fixtures", action="store_true", help="append the development fixtures (?fixture=process, DEV server)")
    ap.add_argument("--all-routes", action="store_true", help="every route of every flow (file names carry the route)")
    ap.add_argument("--scales", action="store_true", help="also every step at t 0.5 forced to the wafer, block and cell scale")
    ap.add_argument("--min-work-frac", type=float, default=0.15, help="flag primary views whose workpiece box covers less of the frame")
    a = ap.parse_args()
    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = ROOT / "cache" / "process3d_renders" / "engine" / stamp
    out.mkdir(parents=True, exist_ok=True)
    log = Log(ROOT / "logs" / f"render_process3d_{stamp}.log")
    ts = a.ts or [0.0, 0.5, 1.0]
    modes = [True] if a.no_actual else [True, False]
    report: dict[str, Any] = {"generated": stamp, "base_url": a.base_url, "shots": [], "checks": {}, "errors": []}
    with sync_playwright() as pw:
        exe = find_chromium(a.chromium)
        br = pw.chromium.launch(executable_path=exe, args=CHROMIUM_ARGS) if exe else pw.chromium.launch(args=CHROMIUM_ARGS)
        ctx = br.new_context(viewport=VIEWPORT, device_scale_factor=1)
        page = ctx.new_page()
        errors: list[str] = []
        page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: errors.append(f"pageerror: {e}"))
        page.goto(f"{a.base_url}/3d{'?fixture=process' if a.fixtures else ''}#mode=process", wait_until="networkidle")
        page.wait_for_selector("canvas", timeout=60_000)
        hook(page, "ready")
        flows = hook(page, "flows") or []
        if a.flow:
            flows = [f for f in flows if f["id"] in a.flow]
        log(f"flows: {[f['id'] for f in flows]} -> {out}")
        jobs = []
        for f in flows:
            routes = f.get("routes") or [{"id": "", "default": True, "steps": f["steps"]}]
            for r in routes if a.all_routes else ([x for x in routes if x.get("default")] or routes[:1]):
                jobs.append((f, r))
        for f, r in jobs:
            fid = f["id"]
            hook(page, "setFlow", fid)
            if r["id"]:
                hook(page, "setRoute", r["id"])
            f = {**f, "steps": r["steps"]}
            fdir = out / re.sub(r"[^A-Za-z0-9_.-]", "_", fid + (f"@{r['id']}" if a.all_routes and r["id"] else ""))
            fdir.mkdir(exist_ok=True)
            for ill in modes:
                hook(page, "setIllustrative", ill)
                for k, sid in enumerate(f["steps"]):
                    for t in ts:
                        hook(page, "seek", k, t)
                        hook(page, "frame", True)  # the camera persists across steps (2026-10-23): re-fit for comparable shots
                        page.wait_for_timeout(a.settle_ms)
                        name = f"{k + 1:02d}_{sid}_{t:.2f}_{'ill' if ill else 'act'}.png"
                        page.screenshot(path=str(fdir / name))
                        st = hook(page, "stats") or {}
                        shot = {"flow": fid, "route": r["id"], "k": k, "step": sid, "t": t, "illustrative": ill, "file": str((fdir / name).relative_to(ROOT)), **st}
                        report["shots"].append(shot)
                        log(f"{fid} {name} calls={st.get('calls')} tris={st.get('triangles')} inst={st.get('instances')} upd={st.get('ms', 0):.1f}ms ren={st.get('frameMs', 0):.1f}ms primary={st.get('primary')}")
            if a.scales:
                hook(page, "setIllustrative", True)
                for sc in ("work", "block", "cell"):
                    hook(page, "setScale", sc)
                    for k, sid in enumerate(f["steps"]):
                        hook(page, "seek", k, 0.5)
                        hook(page, "frame", True)
                        page.wait_for_timeout(a.settle_ms)
                        name = f"S_{sc}_{k + 1:02d}_{sid}.png"
                        page.screenshot(path=str(fdir / name))
                        st = hook(page, "stats") or {}
                        report["shots"].append({"flow": fid, "route": r["id"], "k": k, "step": sid, "t": 0.5, "illustrative": True, "scale": sc, "file": str((fdir / name).relative_to(ROOT)), **st})
                hook(page, "setScale", None)
            # regression checks (A2 N1): body extents at given steps
            for (cfid, crid, csid, ct, ids, rule, label) in REGRESSION:
                if cfid == fid and (not crid or crid == r["id"]) and csid in f["steps"]:
                    z = hook(page, "bodyZ", f["steps"].index(csid), ct, ids) or {}
                    ok = bool(z) and all(z.get(i) for i in ids) and rule(z)
                    report["checks"].setdefault("regression", []).append({"flow": fid, "route": r["id"], "step": csid, "t": ct, "check": label, "ok": ok, "z": z})
                    log(f"regression {fid}@{r['id']} {csid} t{ct}: {label}: {'ok' if ok else 'FAIL'} {z}")
            # determinism: evaluated states, forward vs backward sweep
            hook(page, "setIllustrative", True)
            rc = hook(page, "reverseCheck", 60)
            # pixels: arrive forward and backward at the same (k, t)
            n = len(f["steps"])
            pix = []
            for k, t in [(0, 0.6), (n // 2, 0.4), (n - 1, 0.7)]:
                hook(page, "seek", max(0, k - 1), 0.5)
                hook(page, "seek", k, t)
                hook(page, "frame", True)
                page.wait_for_timeout(a.settle_ms)
                h1 = hashlib.sha256(page.locator(".view").first.screenshot()).hexdigest()
                hook(page, "seek", min(n - 1, k + 1), 0.5)
                hook(page, "seek", k, t)
                hook(page, "frame", True)
                page.wait_for_timeout(a.settle_ms)
                h2 = hashlib.sha256(page.locator(".view").first.screenshot()).hexdigest()
                pix.append({"k": k, "t": t, "same": h1 == h2})
            report["checks"][f"{fid}@{r['id']}"] = {"state_sweep": rc, "pixels": pix, "steps": len(f["steps"])}
            log(f"{fid}@{r['id']} determinism: state {rc}; pixels {pix}")
        report["errors"] = errors
        br.close()
    shots = report["shots"]
    if shots:
        worst = {k: max((s.get(k) or 0) for s in shots) for k in ("calls", "triangles", "instances", "ms", "frameMs")}
        report["budget"] = {"limits": BUDGET, "max": worst, "ok": worst["calls"] <= BUDGET["calls"] and worst["triangles"] <= BUDGET["triangles"]}
        log(f"max over shots: {worst} budget ok={report['budget']['ok']}")
    # process phase only (t in (0.12, 0.9) or the forced-scale pass): the approach pulls the camera back on purpose
    low = [x for x in shots if x.get("workFrac") is not None and x["workFrac"] < a.min_work_frac and x.get("primary") == "work" and 0.12 < x["t"] < 0.9]
    report["low_work_frac"] = [{"file": x["file"], "workFrac": round(x["workFrac"], 3)} for x in low]
    log(f"wafer-scale views with workpiece < {a.min_work_frac:.0%} of the frame: {len(low)}")
    for x in low[:20]:
        log(f"  {x['file']} {x['workFrac']:.3f}")
    # V2 N2 / final F1: block / cell bodies wider than the window whose material does not take the window clip
    for key, nm in (("cellOver", "cell"), ("blockOver", "block")):
        over = [x for x in shots if x.get(key)]
        report[f"{nm}_over"] = [{"file": x["file"], "bodies": x[key]} for x in over]
        log(f"{nm} views with bodies past the window and not clipped: {len(over)}")
        for x in over[:20]:
            log(f"  {x['file']} {x[key]}")
    log(f"console errors / warnings: {len(report['errors'])}")
    for e in report["errors"][:30]:
        log(f"  {e[:300]}")
    (out / "report.json").write_text(json.dumps(report, indent=1))
    log(f"report: {(out / 'report.json').relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
