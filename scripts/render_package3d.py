#!/usr/bin/env python3
"""Headless renders of the 3D tab for the DevLog-011 visual audit (M7) and render budget (M8).

Per family (one page at a time): illustrative and in-scale, each at the default camera and the Front preset, then
every inset (frame button `button.ico` in the inspector) in-scale and illustrative. Saves
cache/package3d_renders/<ts>/<family>_<view>.png, the renderer stats per view (window.__apa3d.stats() when the viewer
exposes it, else the inspector stats line), console / page errors, and a report.json with the M8 budget check
(draw calls <= 40, triangles <= 2M). Log: logs/render_package3d_<ts>.log.

The dev server must already run (tmux apa-app, http://127.0.0.1:47331); this script never starts or stops it.
Orbit frame rate is not measured here (SwiftShader software GL); `ms` is the CPU time of the last frame.

Chromium: `--chromium PATH`, else env APA_CHROMIUM, else the newest chromium_headless_shell-* under the user's
Playwright cache (~/Library/Caches/ms-playwright), else Playwright's default browser. No local path is stored here.

Variants (L28, 2026-10-21): a family with `variants` is rendered once per variant as `<family>@<variant>` (opened
with `#f=<family>&v=<variant>`, insets of that variant); `--family ID` takes all variants of ID, `ID@VARIANT` one.
`--compare` also renders the default compare view (no hash: the page's compare default with each family's default
variant), saved as `compare_<view>.png`.

Usage: uv run --with playwright python scripts/render_package3d.py [--family ID ...] [--base-url URL]
       [--chromium PATH] [--settle-ms N] [--json PATH] [--compare] [--top] [--no-insets]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

from playwright.sync_api import BrowserContext, Page, sync_playwright
from playwright.sync_api import Error as PlaywrightError

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_JSON = ROOT / "app" / "static" / "data" / "package3d.json"
PW_CACHE = Path.home() / "Library" / "Caches" / "ms-playwright"  # Playwright's browser cache on macOS
CHROMIUM_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"]
VIEWPORT = {"width": 1600, "height": 950}
BUDGET = {"calls": 40, "triangles": 2_000_000}  # DevLog-011 M8


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
    """Chromium executable: `--chromium`, else env APA_CHROMIUM, else the newest Playwright headless shell in the user
    cache (chromium_headless_shell-<rev>/chrome-headless-shell-*/chrome-headless-shell), else None (Playwright's own
    default browser)."""
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


def kfmt_num(s: str) -> float:
    m = re.fullmatch(r"([\d.]+)([kM]?)", s.strip())
    if not m:
        return float("nan")
    return float(m.group(1)) * {"": 1, "k": 1e3, "M": 1e6}[m.group(2)]


def has_hook(page: Page) -> bool:
    return bool(page.evaluate("() => typeof window.__apa3d === 'object' && window.__apa3d !== null"))


def hook_call(page: Page, fn: str, *args: Any) -> Any:
    """Call window.__apa3d.<fn>(...args) if present (awaiting a promise); None when absent."""
    return page.evaluate(
        "async ([fn, args]) => { const h = window.__apa3d; if (!h || typeof h[fn] !== 'function') return null;"
        " const r = await h[fn](...args); return r === undefined ? true : r; }", [fn, list(args)])


def stats(page: Page) -> dict | None:
    if has_hook(page):
        s = hook_call(page, "stats")
        if isinstance(s, dict):
            return {**s, "source": "hook"}
    loc = page.locator(".stats").first
    if loc.count() == 0:
        return None
    txt = loc.inner_text().strip()
    m = re.match(r"(\d+) calls\s*\S\s*([\d.]+[kM]?) tris\s*\S\s*([\d.]+[kM]?) inst\s*\S\s*(\d+) geo\s*\S\s*([\d.]+) ms",
                 txt)
    if not m:
        return {"raw": txt, "source": "inspector"}
    return {"calls": int(m.group(1)), "triangles": kfmt_num(m.group(2)), "instances": kfmt_num(m.group(3)),
            "geometries": int(m.group(4)), "ms": float(m.group(5)), "source": "inspector (rounded)"}


def settle(page: Page, ms: int) -> None:
    if has_hook(page):
        hook_call(page, "ready")
    page.wait_for_timeout(ms)


class FamilyMismatch(PlaywrightError):
    pass


class Session:
    """One fresh page per family state: the 3D page reads `#f=<id>` only on mount, so every (re)load is a new page."""

    def __init__(self, ctx: BrowserContext) -> None:
        self.ctx = ctx
        self.page: Page | None = None
        self.errors: list[str] = []

    def new_page(self) -> Page:
        if self.page is not None:
            self.page.close()
        pg = self.ctx.new_page()
        pg.on("console", lambda m: self.errors.append(f"console.{m.type}: {m.text}") if m.type == "error" else None)
        pg.on("pageerror", lambda e: self.errors.append(f"pageerror: {e}"))
        self.page = pg
        return pg


def shown_family(page: Page) -> str:
    sel = page.locator('select[aria-label="Packaging family"]')
    return str(sel.first.input_value()) if sel.count() else ""


def shown_variant(page: Page) -> str:
    sel = page.locator('select[aria-label="Variant"]')
    return str(sel.first.input_value()) if sel.count() else ""


def verify_family(page: Page, fid: str) -> None:
    """`fid` = family id or `<family>@<variant>`."""
    fam, _, var = fid.partition("@")
    got = shown_family(page)
    if got != fam:
        raise FamilyMismatch(f"family mismatch: page shows {got or '(no family select)'!r}, expected {fam!r}")
    if var and shown_variant(page) != var:
        raise FamilyMismatch(f"variant mismatch: page shows {shown_variant(page)!r}, expected {var!r}")


def open_family(sess: Session, base: str, fid: str, settle_ms: int) -> Page:
    page = sess.new_page()
    fam, _, var = fid.partition("@")
    page.goto(f"{base}/3d#f={fam}" + (f"&v={var}" if var else ""), wait_until="networkidle")
    try:
        page.wait_for_selector("canvas", timeout=30_000)
    except PlaywrightError:
        ov = page.locator("vite-error-overlay")
        if ov.count():  # dev server build error (e.g. a module mid-edit): report its first line
            msg = ov.first.evaluate("e => (e.shadowRoot ? e.shadowRoot.textContent : e.textContent) || ''")
            raise PlaywrightError(f"vite error overlay: {' '.join(str(msg).split())[:300]}") from None
        raise
    settle(page, settle_ms)
    verify_family(page, fid)
    return page


def bar_button(page: Page, label: str) -> None:
    page.get_by_role("button", name=label, exact=True).first.click()


def set_scale(page: Page, illustrative: bool) -> None:
    if has_hook(page) and hook_call(page, "setIllustrative", illustrative) is not None:
        return
    bar_button(page, "Illustrative" if illustrative else "In-scale")


def preset(page: Page, name: str) -> None:
    if has_hook(page) and hook_call(page, "preset", name) is not None:
        return
    bar_button(page, name.capitalize())


def frame_inset(page: Page, idx: int, inset_id: str, keep_scale: bool = False) -> str:
    # hook inset(id) always frames in-scale; inset(id, true) frames with the current (illustrative) z map
    if has_hook(page) and hook_call(page, "inset", inset_id, keep_scale) is not None:
        return "hook"
    page.locator("button.ico").nth(idx).click()
    return "button"


def check_budget(st: dict | None) -> dict:
    if not st or "calls" not in st:
        return {"ok": None, "note": "no stats"}
    over = [k for k, lim in BUDGET.items() if float(st.get(k, 0)) > lim]
    return {"ok": not over, "over": over}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--family", nargs="*", default=None, help="family ids (default: all in the JSON)")
    ap.add_argument("--base-url", default="http://127.0.0.1:47331")
    ap.add_argument("--chromium", default=None,
                    help="Chromium / headless-shell executable (default: env APA_CHROMIUM, else the newest Playwright "
                         "headless shell in the user cache, else Playwright's default)")
    ap.add_argument("--json", type=Path, default=DEFAULT_JSON, help="package3d.json (family list and insets)")
    ap.add_argument("--settle-ms", type=int, default=1500, help="wait after each state change before capture")
    ap.add_argument("--no-insets", action="store_true")
    ap.add_argument("--compare", action="store_true", help="also render the default compare view (no hash)")
    ap.add_argument("--top", action="store_true", help="also capture the Top preset (layout / topology check)")
    args = ap.parse_args()
    ts = dt.datetime.now().strftime("%Y-%m-%d_%H%M%S")
    out = ROOT / "cache" / "package3d_renders" / ts
    out.mkdir(parents=True, exist_ok=True)
    log = Log(ROOT / "logs" / f"render_package3d_{ts}.log")
    doc = json.loads(args.json.read_text())
    allf: list[dict] = []  # variants as `<family>@<variant>` entries (the base too, when the family has variants)
    for f in doc["families"]:
        if f.get("variants"):
            allf.append({**f, "id": f"{f['id']}@{f['variant']}"})
            allf += [{**v, "id": f"{f['id']}@{v['variant']}"} for v in f["variants"]]
        else:
            allf.append(f)
    fams = [f for f in allf if not args.family or f["id"] in args.family or f["id"].split("@")[0] in args.family]
    known = {f["id"] for f in allf} | {f["id"].split("@")[0] for f in allf}
    if args.family and set(args.family) - known:
        log(f"ERROR unknown family in {args.family}")
        return 1
    base = args.base_url.rstrip("/")
    chromium = find_chromium(args.chromium)
    log(f"renders -> {out.relative_to(ROOT)}; {len(fams)} families; base {base}; "
        f"chromium {chromium or 'Playwright default'}")
    report: dict[str, Any] = {"generated": ts, "base_url": base, "viewport": VIEWPORT, "budget": BUDGET,
                              "families": {}}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=chromium, args=CHROMIUM_ARGS, headless=True)
        ctx = browser.new_context(viewport=VIEWPORT)  # type: ignore[arg-type]
        sess = Session(ctx)
        errors = sess.errors
        if args.compare:
            views_c: list[dict] = []
            errors.clear()
            page = sess.new_page()
            page.goto(f"{base}/3d", wait_until="networkidle")
            page.wait_for_selector("canvas", timeout=30_000)
            settle(page, args.settle_ms)
            report["families"]["compare"] = {"load_errors": list(errors)}
            for ill, tag in ((True, "illustrative"), (False, "inscale")):
                set_scale(page, ill)
                for cam in ("default", "front", *(("top",) if args.top else ())):
                    preset(page, "iso" if cam == "default" else cam)
                    settle(page, args.settle_ms)
                    n_err = len(errors)
                    png = out / f"compare_{cam}_{tag}.png"
                    page.screenshot(path=str(png))
                    st = stats(page)
                    views_c.append({"view": f"{cam}_{tag}", "png": str(png.relative_to(ROOT)), "stats": st,
                                    "budget": check_budget(st), "errors": errors[n_err:]})
                    log(f"  compare_{cam}_{tag}: {st.get('calls') if st else '?'} calls, "
                        f"{st.get('triangles') if st else '?'} tris")
            report["families"]["compare"]["views"] = views_c
        for f in fams:
            fid = f["id"]
            insets = f.get("insets", [])
            views: list[dict] = []
            t0 = time.time()

            def capture(name: str, extra: dict | None = None, fid: str = fid, views: list[dict] = views) -> None:
                page = sess.page
                assert page is not None
                verify_family(page, fid)  # fail loudly rather than save another family's render
                n_err = len(errors)
                png = out / f"{fid}_{name}.png"
                page.screenshot(path=str(png))
                st = stats(page)
                v = {"view": name, "png": str(png.relative_to(ROOT)), "stats": st, "budget": check_budget(st),
                     "family_shown": fid, **(extra or {})}
                v["errors"] = errors[n_err:]
                views.append(v)
                s = (f"{st.get('calls')} calls, {st.get('triangles')} tris, {float(st.get('ms') or 0):.1f} ms" if st else "no stats")
                log(f"  {fid}_{name}: {s}")

            try:
                for ill, tag in ((True, "illustrative"), (False, "inscale")):
                    errors.clear()
                    page = open_family(sess, base, fid, args.settle_ms)
                    hook = has_hook(page)
                    if tag == "illustrative":
                        log(f"{fid}: hook {'present' if hook else 'absent (button fallback, inspector stats)'}; "
                            f"{len(insets)} insets; load errors {len(errors)}")
                        report["families"][fid] = {"hook": hook, "load_errors": list(errors)}
                    set_scale(page, ill)
                    settle(page, args.settle_ms)
                    capture(f"default_{tag}")
                    preset(page, "front")
                    settle(page, args.settle_ms)
                    capture(f"front_{tag}")
                    if args.top:
                        preset(page, "top")
                        settle(page, args.settle_ms)
                        capture(f"top_{tag}")
                if not args.no_insets:
                    n_btn = page.locator("button.ico").count()
                    for k, ins in enumerate(insets):
                        page = open_family(sess, base, fid, args.settle_ms)
                        if k >= n_btn and not has_hook(page):
                            log(f"  {fid}: inset {ins['id']} has no frame button ({n_btn} buttons); skipped")
                            continue
                        how = frame_inset(page, k, ins["id"])
                        settle(page, args.settle_ms)
                        capture(f"inset_{ins['id']}_inscale", {"inset": ins["id"], "label": ins.get("label"),
                                                                "via": how})
                        set_scale(page, True)
                        settle(page, args.settle_ms)
                        how = frame_inset(page, k, ins["id"], keep_scale=True)
                        settle(page, args.settle_ms)
                        capture(f"inset_{ins['id']}_illustrative", {"inset": ins["id"], "via": how})
            except PlaywrightError as e:  # keep going with the next family; the error is in the report and the log
                log(f"ERROR {fid}: {type(e).__name__}: {e}")
                report["families"].setdefault(fid, {})["error"] = f"{type(e).__name__}: {e}"
            fr = report["families"].setdefault(fid, {})
            fr["views"] = views
            fr["seconds"] = round(time.time() - t0, 1)
            fr["budget_ok"] = all(v["budget"]["ok"] is not False for v in views)
        ctx.close()
        browser.close()
    rp = out / "report.json"
    rp.write_text(json.dumps(report, indent=1))
    n_err = sum(len(v["errors"]) for fr in report["families"].values() for v in fr.get("views", []))
    log(f"done: {sum(len(fr.get('views', [])) for fr in report['families'].values())} views, {n_err} view errors; "
        f"report {rp.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
