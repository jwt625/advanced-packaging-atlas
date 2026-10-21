"""Build app/static/data/sim_targets.json: the DB rows referenced by simulation cases (lane L1, DevLog-012 wave 3).

Read-only on data/metrics.csv and data/electrical_interfaces.csv. Collects every `metric_id` and `ei_id` value found
anywhere in sims/**/*.yaml and validation/cases/**/*.yaml, keeps only those rows and a few fields, and writes a
deterministic JSON (sorted keys, no timestamps) for the browser target lookup (engine/src/thermal/case.mjs
metricLookupFromJson). Unresolved ids are listed under "missing".

Usage: uv run python scripts/build_sim_targets.py [--check]
  --check: exit 1 when the committed JSON differs from a fresh build (nothing is written).
License: GPL-3.0-or-later.
"""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "app" / "static" / "data" / "sim_targets.json"
CASE_GLOBS = ["sims/**/*.yaml", "validation/cases/**/*.yaml"]
METRIC_FIELDS = ["value", "value_text", "unit", "basis", "locator", "tv_id", "condition", "parameter", "variant", "statistic"]
EI_FIELDS = [
    "tv_id", "basis", "locator", "protocol", "channel_type", "lane_rate_gbps", "reach_mm", "line_um", "space_um",
    "insertion_loss_db", "il_freq_ghz", "energy_pj_per_bit", "bump_pitch_um",
]
NUMERIC = {"value", "lane_rate_gbps", "reach_mm", "line_um", "space_um", "insertion_loss_db", "il_freq_ghz", "energy_pj_per_bit", "bump_pitch_um"}


def collect_ids(node, out: dict[str, set[str]]) -> None:
    """Walk a parsed YAML document; record values of metric_id / ei_id keys."""
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ("metric_id", "ei_id") and isinstance(v, str) and v:
                out[k].add(v)
            else:
                collect_ids(v, out)
    elif isinstance(node, list):
        for v in node:
            collect_ids(v, out)


def num(x: str):
    try:
        v = float(x)
    except ValueError:
        return x
    return int(v) if v.is_integer() and "." not in x and "e" not in x.lower() else v


def pick(row: dict[str, str], fields: list[str]) -> dict:
    out = {}
    for f in fields:
        v = (row.get(f) or "").strip()
        if v:
            out[f] = num(v) if f in NUMERIC else v
    return out


def build() -> dict:
    ids: dict[str, set[str]] = {"metric_id": set(), "ei_id": set()}
    files = []
    for g in CASE_GLOBS:
        for p in sorted(ROOT.glob(g)):
            with p.open(encoding="utf-8") as fh:
                for doc in yaml.safe_load_all(fh):
                    collect_ids(doc, ids)
            files.append(p.relative_to(ROOT).as_posix())
    rows: dict[str, dict] = {}
    with (ROOT / "data" / "metrics.csv").open(encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            if r["metric_id"] in ids["metric_id"]:
                rows[r["metric_id"]] = {"table": "metrics", **pick(r, METRIC_FIELDS)}
    with (ROOT / "data" / "electrical_interfaces.csv").open(encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh):
            if r["ei_id"] in ids["ei_id"] or r["ei_id"] in ids["metric_id"]:
                rows[r["ei_id"]] = {"table": "electrical_interfaces", **pick(r, EI_FIELDS)}
    wanted = ids["metric_id"] | ids["ei_id"]
    return {
        "schema": "ap-sim.targets/1",
        "source": "data/metrics.csv, data/electrical_interfaces.csv (rows referenced by the case files)",
        "case_files": len(files),
        "rows": {k: rows[k] for k in sorted(rows)},
        "missing": sorted(wanted - rows.keys()),
    }


def main() -> int:
    data = build()
    text = json.dumps(data, indent=1, sort_keys=True, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        same = OUT.exists() and OUT.read_text(encoding="utf-8") == text
        print("sim_targets.json up to date" if same else "sim_targets.json differs from a fresh build")
        return 0 if same else 1
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(data['rows'])} rows, {len(data['missing'])} missing ids, {len(text.encode())} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
