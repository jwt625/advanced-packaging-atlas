"""Result records: package versions, timing, peak RSS, JSON output, timestamped logs."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import platform
import resource
import sys
from importlib import metadata
from pathlib import Path

import numpy as np

REF_DIR = Path(__file__).resolve().parents[1]  # validation/reference
REPO = REF_DIR.parents[1]
RESULTS = REF_DIR / "results"
LOGS = REPO / "logs"


def versions() -> dict:
    out = {"python": sys.version.split()[0], "platform": platform.platform()}
    for pkg in ("scikit-fem", "numpy", "scipy", "pyamg", "gmsh", "scikit-rf"):
        try:
            out[pkg] = metadata.version(pkg)
        except metadata.PackageNotFoundError:
            out[pkg] = None
    return out


def max_rss_mb() -> float:
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / (1024 * 1024 if sys.platform == "darwin" else 1024)


def stamp() -> str:
    return dt.datetime.now().strftime("%Y%m%dT%H%M%S")


def today() -> str:
    return dt.date.today().isoformat()


def input_hash(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, default=str).encode()).hexdigest()[:16]


def _clean(o):
    if isinstance(o, dict):
        return {k: _clean(v) for k, v in o.items()}
    if isinstance(o, list | tuple):
        return [_clean(v) for v in o]
    if isinstance(o, np.ndarray):
        return _clean(o.tolist())
    if isinstance(o, np.floating | np.integer):
        return o.item()
    if isinstance(o, float):
        return None if not np.isfinite(o) else float(f"{o:.10g}")
    return o


VOLATILE = {"runtime_s", "max_rss_mb", "solve", "grid_s", "date", "platform", "timing"}


def strip_volatile(o):
    """Drop run-dependent fields (timings, RSS, dates, platform) so results/ files are deterministic."""
    if isinstance(o, dict):
        return {k: strip_volatile(v) for k, v in o.items() if k not in VOLATILE}
    if isinstance(o, list):
        return [strip_volatile(v) for v in o]
    return o


def write_result(name: str, payload: dict) -> Path:
    """Full record (with timings, peak RSS, date) -> logs/ref-<name>-<stamp>.json; deterministic numbers-only copy
    -> results/<name>-skfem.json."""
    RESULTS.mkdir(parents=True, exist_ok=True)
    LOGS.mkdir(exist_ok=True)
    full = _clean({"date": today(), "solver": "scikit-fem (apref)", "versions": versions(), **payload})
    (LOGS / f"ref-{name}-{stamp()}.json").write_text(json.dumps(full, indent=1) + "\n")
    p = RESULTS / f"{name}-skfem.json"
    p.write_text(json.dumps(strip_volatile(full), indent=1) + "\n")
    return p


class Log:
    def __init__(self, case: str):
        LOGS.mkdir(exist_ok=True)
        self.path = LOGS / f"ref-{case}-{stamp()}.log"
        self.f = self.path.open("w")

    def __call__(self, *a):
        line = dt.datetime.now().strftime("%Y-%m-%dT%H:%M:%S ") + " ".join(str(x) for x in a)
        print(line, flush=True)
        self.f.write(line + "\n")
        self.f.flush()
