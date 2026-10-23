"""Render the hybrid bonding short video (DevLog-015): scene frames via headless Chromium, contact sheets, final MP4.

Scenes live in media/hybrid-bonding-short/scenes/ and follow media/hybrid-bonding-short/STYLE.md; edit.json holds the
cut list. Frames go to cache/video/ (git-ignored); the MP4 goes to the path in edit.json. A local static server binds
127.0.0.1 on an OS-assigned free port for the duration of a run.

--edit FILE (before or after the command; default media/hybrid-bonding-short/edit.json) picks another cut list, e.g.
edit_exempt.json, for frames / assemble / all / retime. Its frames go to cache/video/frames/<edit stem>/<shot> (edit.json
keeps cache/video/frames/<shot>), so cut lists never invalidate each other; its MP4 goes to that file's "output".
A shot's params.speed (default 1) multiplies scene time (lib/apa.js): render gets t * speed.

Usage:
  uv run python scripts/render_video.py sheet SCENE [--param k=v ...] [--dur 2.0] [--n 12]
      contact sheet of one scene (file name in scenes/) -> cache/video/sheets/<stem>[__params].png
  uv run python scripts/render_video.py frames [--only SHOT ...] [--force]
      all edit shots -> cache/video/frames[/<edit stem>]/<shot>/f00000.png (skips shots whose stamp is unchanged)
  uv run python scripts/render_video.py assemble [--audio FILE] [--allow-missing]
      encode H.264 High yuv420p + AAC 48 kHz stereo, +faststart; silent AAC when no --audio; --allow-missing puts
      black frames for shots whose scene file does not exist yet (or whose frames are incomplete), for drafts
  uv run python scripts/render_video.py all [--audio FILE] [--allow-missing]
  uv run python scripts/render_video.py retime --bpm 120 [--offset 0.0] [--dry-run]
      rewrite each shot's frames from its "beats" so cuts land on the beat grid (cumulative rounding, no drift),
      and store the bpm; a shot's "cues" ([[beat, text], ...], beats from shot start) become timed overlay text;
      --offset (s) lengthens the first shot so the first cut lands on the track's first counted beat
Assemble also takes --audio-start S (seconds into the track where the video begins).
"""

from __future__ import annotations

import argparse
import datetime as dt
import functools
import hashlib
import http.server
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
import urllib.parse
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parent.parent
MEDIA = ROOT / "media" / "hybrid-bonding-short"
SCENES = MEDIA / "scenes"
CACHE = ROOT / "cache" / "video"
PW_CACHE = Path.home() / "Library" / "Caches" / "ms-playwright"
CHROMIUM_ARGS = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist",
                 "--font-render-hinting=none"]
W, H = 1920, 1080
DEFAULT_EDIT = MEDIA / "edit.json"
EDIT = DEFAULT_EDIT  # set from --edit in main()


class Log:
    def __init__(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.fh = path.open("a", encoding="utf-8")

    def __call__(self, msg: str) -> None:
        line = f"{dt.datetime.now().isoformat(timespec='seconds')} {msg}"
        print(line, flush=True)
        self.fh.write(line + "\n")
        self.fh.flush()


log = Log(ROOT / "logs" / f"render_video_{dt.datetime.now().strftime('%Y%m%dT%H%M%S')}_{os.getpid()}.log")


def find_chromium() -> str | None:
    """Newest Playwright headless shell in the user cache, else None (Playwright's default browser)."""
    env = os.environ.get("APA_CHROMIUM")
    if env:
        return env

    def rev(p: Path) -> int:
        m = re.search(r"-(\d+)$", p.name)
        return int(m.group(1)) if m else -1

    for d in sorted(PW_CACHE.glob("chromium_headless_shell-*"), key=rev, reverse=True):
        exe = sorted(d.glob("chrome-headless-shell-*/chrome-headless-shell"))
        if exe:
            return str(exe[0])
    return None


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass


def serve() -> tuple[http.server.ThreadingHTTPServer, str]:
    handler = functools.partial(QuietHandler, directory=str(MEDIA))
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, f"http://127.0.0.1:{srv.server_address[1]}"


def scene_url(base: str, scene: str, params: dict[str, str]) -> str:
    q = urllib.parse.urlencode(params)
    return f"{base}/scenes/{scene}" + (f"?{q}" if q else "")


def open_scene(page: Page, url: str, errors: list[str]) -> None:
    errors.clear()
    page.goto(url, wait_until="load")
    page.wait_for_function("window.APA_READY === true", timeout=60_000)
    if errors:
        raise RuntimeError(f"page errors on load: {errors}")


def render_frame(page: Page, t: float, dest: Path, errors: list[str]) -> float:
    t0 = time.perf_counter()
    page.evaluate("t => APA.frame(t)", t)
    page.screenshot(path=str(dest), clip={"x": 0, "y": 0, "width": W, "height": H}, animations="disabled")
    if errors:
        raise RuntimeError(f"page errors at t={t:.3f}: {errors}")
    return time.perf_counter() - t0


def with_browser(fn):  # type: ignore[no-untyped-def]
    srv, base = serve()
    chromium = find_chromium()
    log(f"server {base}; chromium {chromium or 'Playwright default'}")
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(executable_path=chromium, args=CHROMIUM_ARGS, headless=True)
            ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=1)
            page = ctx.new_page()
            errors: list[str] = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            try:
                return fn(page, base, errors)
            finally:
                browser.close()
    finally:
        srv.shutdown()


def parse_params(items: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    for it in items:
        k, _, v = it.partition("=")
        out[k] = v
    return out


def cmd_sheet(a: argparse.Namespace) -> int:
    scene = a.scene
    if not (SCENES / scene).exists():
        log(f"ERROR no scene {SCENES / scene}")
        return 1
    params = parse_params(a.param)
    tag = "__".join(f"{k}-{re.sub(r'[^A-Za-z0-9.]+', '', v)}" for k, v in params.items())
    stem = Path(scene).stem + (f"__{tag}" if tag else "")
    tmp = CACHE / "sheets" / f"_{stem}"
    shutil.rmtree(tmp, ignore_errors=True)
    tmp.mkdir(parents=True)
    n = max(a.n, 1)
    times = [a.dur * i / max(n - 1, 1) for i in range(n)]

    def run(page: Page, base: str, errors: list[str]) -> list[float]:
        open_scene(page, scene_url(base, scene, {**params, "_dur": f"{a.dur:.4f}"}), errors)
        return [render_frame(page, t, tmp / f"s{i:03d}.png", errors) for i, t in enumerate(times)]

    secs = with_browser(run)
    out = CACHE / "sheets" / f"{stem}.png"
    cols = 4 if n > 3 else n
    rows = -(-n // cols)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "s%03d.png"),
                    "-vf", f"scale=480:-1,tile={cols}x{rows}:padding=4:color=gray", "-frames:v", "1", str(out)],
                   check=True)
    full = CACHE / "sheets" / f"{stem}__full.png"
    shutil.copy(tmp / f"s{n // 2:03d}.png", full)
    shutil.rmtree(tmp)
    log(f"sheet {out.relative_to(ROOT)} ({n} frames, t = 0..{a.dur} s; frame ms mean {1000 * sum(secs) / n:.0f}, "
        f"max {1000 * max(secs):.0f}); full-res mid frame {full.relative_to(ROOT)}")
    return 0


def load_edit() -> dict:
    return json.loads(EDIT.read_text(encoding="utf-8"))


def resolve_edit(arg: str | None) -> Path:
    if not arg:
        return DEFAULT_EDIT
    for cand in (Path(arg), ROOT / arg, MEDIA / arg):
        if cand.exists():
            return cand.resolve()
    raise SystemExit(f"no edit file {arg}")


def edit_tag() -> str:
    """'' for the default edit.json, else the edit file's stem (separate frame cache and timeline dirs)."""
    return "" if EDIT.resolve() == DEFAULT_EDIT.resolve() else EDIT.stem


def frames_dir(shot_id: str) -> Path:
    tag = edit_tag()
    return CACHE / "frames" / tag / shot_id if tag else CACHE / "frames" / shot_id


def stamp_of(shot: dict, fps: int, bpm: float) -> str:
    h = hashlib.sha256()
    for f in sorted((MEDIA / "lib").glob("*.js")) + sorted((MEDIA / "lib" / "fonts").glob("*.ttf")):
        h.update(f.read_bytes())
    h.update((SCENES / shot["scene"]).read_bytes())
    reveal = shot.get("params", {}).get("reveal")  # a scene shown inside this one (s00_horizon open)
    if reveal and (SCENES / reveal).exists():
        h.update((SCENES / reveal).read_bytes())
    h.update(json.dumps([shot, fps, bpm], sort_keys=True).encode())
    return h.hexdigest()[:16]


def shot_params(shot: dict, fps: int, bpm: float) -> dict[str, str]:
    """URL params for a shot: its params, `_dur` (s), and `text_cues` (s) from its `cues` (beats from shot start)."""
    params = {**shot.get("params", {}), "_dur": f"{(shot['frames'] - 1) / fps:.4f}"}
    if "cues" in shot:
        params["text_cues"] = json.dumps([[round(b * 60.0 / bpm, 4), txt] for b, txt in shot["cues"]],
                                         ensure_ascii=False)
    return params


def cmd_frames(a: argparse.Namespace) -> int:
    edit = load_edit()
    fps = edit["fps"]
    bpm = float(edit.get("bpm", 120))
    todo = []
    for shot in edit["shots"]:
        if a.only and shot["id"] not in a.only:
            continue
        if not (SCENES / shot["scene"]).exists():
            log(f"MISSING scene {shot['scene']} for shot {shot['id']} (assemble --allow-missing: black placeholder)")
            continue
        d = frames_dir(shot["id"])
        st = stamp_of(shot, fps, bpm)
        sf = d / ".stamp"
        if not a.force and sf.exists() and sf.read_text() == st and len(list(d.glob("f*.png"))) == shot["frames"]:
            log(f"skip {shot['id']} (unchanged)")
            continue
        todo.append((shot, d, st))
    if not todo:
        return 0

    def run(page: Page, base: str, errors: list[str]) -> None:
        for shot, d, st in todo:
            shutil.rmtree(d, ignore_errors=True)
            d.mkdir(parents=True)
            open_scene(page, scene_url(base, shot["scene"], shot_params(shot, fps, bpm)), errors)
            secs = [render_frame(page, i / fps, d / f"f{i:05d}.png", errors) for i in range(shot["frames"])]
            (d / ".stamp").write_text(st)
            log(f"frames {shot['id']}: {shot['frames']} from {shot['scene']} "
                f"(mean {1000 * sum(secs) / len(secs):.0f} ms/frame)")

    with_browser(run)
    return 0


def cmd_assemble(a: argparse.Namespace) -> int:
    edit = load_edit()
    fps = edit["fps"]
    seq = CACHE / ("timeline" + (f"_{edit_tag()}" if edit_tag() else ""))
    shutil.rmtree(seq, ignore_errors=True)
    seq.mkdir(parents=True)
    black = CACHE / "black.png"
    if a.allow_missing and not black.exists():
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=black:s={W}x{H}",
                        "-frames:v", "1", str(black)], check=True)
    k = 0
    missing = []
    for shot in edit["shots"]:
        d = frames_dir(shot["id"])
        frames = sorted(d.glob("f*.png")) if d.exists() else []
        if len(frames) != shot["frames"]:
            missing.append(shot["id"])
            if not a.allow_missing:
                continue
            frames = [black] * shot["frames"]
        for f in frames:
            (seq / f"{k:05d}.png").symlink_to(f.resolve())
            k += 1
    if missing and not a.allow_missing:
        log(f"ERROR missing or incomplete frames for shots {missing}; run `frames` or pass --allow-missing")
        return 1
    if missing:
        log(f"WARNING black placeholders for shots {missing}")
    dur = k / fps
    out = MEDIA / edit["output"]
    out.parent.mkdir(parents=True, exist_ok=True)
    cmd = ["ffmpeg", "-v", "error", "-y", "-framerate", str(fps), "-i", str(seq / "%05d.png")]
    if a.audio:
        cmd += ["-ss", f"{a.audio_start:.3f}", "-i", a.audio,
                "-af", f"apad,atrim=0:{dur:.3f},afade=t=out:st={max(dur - 1.0, 0):.3f}:d=1"]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000"]
    cmd += ["-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "16",
            "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-r", str(fps),
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2", "-t", f"{dur:.3f}",
            "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    shutil.rmtree(seq)
    log(f"assembled {out.relative_to(ROOT)} from {EDIT.relative_to(ROOT)}: {k} frames, {dur:.2f} s, "
        f"audio {a.audio or 'silent'}")
    return 0


def cmd_retime(a: argparse.Namespace) -> int:
    path = EDIT
    edit = load_edit()
    fps = edit["fps"]
    shots = edit["shots"]
    if any("beats" not in s for s in shots):
        log(f"ERROR shots without beats: {[s['id'] for s in shots if 'beats' not in s]}")
        return 1
    spb = 60.0 / a.bpm
    acc, prev = a.offset, 0
    for s in shots:
        acc += s["beats"] * spb
        end = round(acc * fps)
        old, s["frames"] = s["frames"], end - prev
        log(f"{s['id']:6s} {s['beats']:>5} beats  {old:3d} -> {s['frames']:3d} frames  cut at {end / fps:6.2f} s")
        prev = end
    log(f"total {prev} frames = {prev / fps:.2f} s at {a.bpm} bpm, offset {a.offset} s")
    edit["bpm"] = a.bpm
    if a.dry_run:
        return 0
    lines = ["{" + ", ".join(f'"{k}": {json.dumps(v, ensure_ascii=False)}' for k, v in s.items()) + "}" for s in shots]
    head = {k: v for k, v in edit.items() if k != "shots"}
    body = ",\n".join(f'  "{k}": {json.dumps(v)}' for k, v in head.items())
    path.write_text("{\n" + body + ',\n  "shots": [\n    ' + ",\n    ".join(lines) + "\n  ]\n}\n", encoding="utf-8")
    log(f"wrote {path.relative_to(ROOT)}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--edit", help="cut list (default media/hybrid-bonding-short/edit.json)")
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--edit", default=argparse.SUPPRESS, help="cut list (overrides the one before the command)")
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("sheet")
    s.add_argument("scene")
    s.add_argument("--param", action="append", default=[], help="k=v URL param (repeatable)")
    s.add_argument("--dur", type=float, default=2.0)
    s.add_argument("--n", type=int, default=12)
    f = sub.add_parser("frames", parents=[common])
    f.add_argument("--only", nargs="*")
    f.add_argument("--force", action="store_true")
    for name in ("assemble", "all"):
        x = sub.add_parser(name, parents=[common])
        x.add_argument("--audio")
        x.add_argument("--allow-missing", action="store_true")
        x.add_argument("--audio-start", type=float, default=0.0)
        if name == "all":
            x.add_argument("--only", nargs="*")
            x.add_argument("--force", action="store_true")
    r = sub.add_parser("retime", parents=[common])
    r.add_argument("--bpm", type=float, required=True)
    r.add_argument("--offset", type=float, default=0.0)
    r.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    global EDIT
    EDIT = resolve_edit(a.edit)
    if a.cmd == "retime":
        return cmd_retime(a)
    if a.cmd == "sheet":
        return cmd_sheet(a)
    if a.cmd == "frames":
        return cmd_frames(a)
    if a.cmd == "assemble":
        return cmd_assemble(a)
    rc = cmd_frames(a)
    return rc or cmd_assemble(a)


if __name__ == "__main__":
    sys.exit(main())
