"""Consistency check of every validation case against its sources (read-only).

Run:  uv run --no-project --with pyyaml python validation/expected/check_db_targets.py

1. Every YAML under validation/cases/ parses.
2. Every mapping that carries `metric_id` (or `ei_id`) plus a numeric `value` (or `insertion_loss_db`) is compared
   with data/metrics.csv (or data/electrical_interfaces.csv). Sign is compared as stored (the IL rows of the
   electrical_interfaces table store positive dB; EM case files use the same sign).
3. Tier A / EM-0 expected values with a `script_key` are compared with the JSON written by tier_a.py / em0.py
   (relative 1e-4, i.e. the rounding of the YAML numbers).
4. Entries with `form: reference_fe` are compared with lane L5's validation/reference/results/<file> at `path` /
   `field` (relative 1e-6); `path` is a dotted string or a list (for keys that contain a dot).
Exit code 1 on any mismatch.
"""

from __future__ import annotations

import csv
import json
import math
import pathlib
import re
import sys

import yaml

ROOT = pathlib.Path(__file__).resolve().parents[2]
CASES = ROOT / "validation" / "cases"
EXP = ROOT / "validation" / "expected"


def load_csv(name: str, key: str) -> dict:
    with open(ROOT / "data" / name, newline="") as f:
        return {r[key]: r for r in csv.DictReader(f)}


def walk(node, out: list) -> None:
    if isinstance(node, dict):
        out.append(node)
        for v in node.values():
            walk(v, out)
    elif isinstance(node, list):
        for v in node:
            walk(v, out)


NUM = re.compile(r"^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$")


def as_num(v):
    """PyYAML (YAML 1.1) reads 1.45e8 (no exponent sign) as a string; YAML 1.2 readers (the JS engine) read a number."""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str) and NUM.match(v.strip()):
        return float(v)
    return None


def close(a: float, b: float, rel: float = 1e-9) -> bool:
    return math.isclose(a, b, rel_tol=rel, abs_tol=1e-12)


def lookup(vals: dict, key: str):
    cur = vals
    if key.endswith("]"):
        base, idx = key[:-1].split("[")
        lst = lookup(vals, base)
        return lst[int(idx)] if isinstance(lst, list) else None
    for part in key.split("."):
        if not isinstance(cur, dict) or part not in cur:
            return None
        cur = cur[part]
    return cur


def main() -> int:
    metrics = load_csv("metrics.csv", "metric_id")
    eis = load_csv("electrical_interfaces.csv", "ei_id")
    tier_a = json.loads((EXP / "tier_a_values.json").read_text())["values"]
    em0 = json.loads((EXP / "em0_values.json").read_text())["values"]
    n_files = n_db = n_script = n_ref = 0
    errors: list[str] = []
    for path in sorted(CASES.rglob("*.yaml")):
        rel = path.relative_to(ROOT)
        try:
            doc = yaml.safe_load(path.read_text())
        except yaml.YAMLError as e:
            errors.append(f"{rel}: YAML error {e}")
            continue
        n_files += 1
        nodes: list = []
        walk(doc, nodes)
        for d in nodes:
            mid, eid = d.get("metric_id"), d.get("ei_id")
            if isinstance(mid, str):
                if mid not in metrics:
                    errors.append(f"{rel}: unknown metric_id {mid}")
                    continue
                v = as_num(d.get("value"))
                if v is not None:
                    n_db += 1
                    try:
                        dbv = float(metrics[mid]["value"])
                    except ValueError:
                        errors.append(f"{rel}: {mid} DB value not numeric ({metrics[mid]['value']!r})")
                        continue
                    if not close(float(v), dbv):
                        errors.append(f"{rel}: {mid} value {v} != DB {dbv}")
            if isinstance(eid, str):
                if eid not in eis:
                    errors.append(f"{rel}: unknown ei_id {eid}")
                    continue
                v = as_num(d.get("insertion_loss_db", d.get("value")))
                if v is not None and d.get("quantity", "IL") not in ("IL_dB_per_mm",):
                    n_db += 1
                    dbv = float(eis[eid]["insertion_loss_db"])
                    if not close(float(v), dbv):
                        errors.append(f"{rel}: {eid} IL {v} != DB {dbv}")
                elif d.get("quantity") == "IL_dB_per_mm" and v is not None:
                    n_db += 1
                    dbv = abs(float(eis[eid]["insertion_loss_db"])) / float(eis[eid]["reach_mm"])
                    if not close(float(v), dbv, 1e-3):
                        errors.append(f"{rel}: {eid} IL/mm {v} != DB {dbv:.4f}")
            ref = d.get("ref")
            if d.get("form") == "reference_fe" and isinstance(ref, dict):
                f = ROOT / "validation" / "reference" / "results" / ref["file"]
                try:
                    cur = json.loads(f.read_text())
                    parts = ref["path"] if isinstance(ref["path"], list) else ref["path"].split(".")
                    for part in parts:
                        cur = cur[part]
                    rv = cur[ref.get("field", "f_ext")]
                except (OSError, KeyError, TypeError) as e:
                    errors.append(f"{rel}: reference_fe {ref} not resolvable ({e})")
                else:
                    n_ref += 1
                    if as_num(d["value"]) is None or not close(as_num(d["value"]), float(rv), 1e-6):
                        errors.append(f"{rel}: reference_fe {ref['path']!s} yaml {d['value']} != L5 {rv}")
            sk = d.get("script_key")
            if sk is not None and "value" in d:
                src = em0 if path.name.startswith("em_0") else tier_a
                keys = sk if isinstance(sk, list) else [sk]
                vals = d["value"] if isinstance(d["value"], list) else [d["value"]]
                if isinstance(sk, str) and isinstance(d["value"], list) and isinstance(lookup(src, sk), list):
                    keys = [f"{sk}[{i}]" for i in range(len(vals))]
                for k, v in zip(keys, vals):
                    v = as_num(v)
                    if not isinstance(k, str) or " " in k or v is None:  # e.g. "x 50 K" keys
                        continue
                    ref = lookup(src, k)
                    if isinstance(ref, list):
                        ref = None
                    if ref is None:
                        errors.append(f"{rel}: script_key {k} not found")
                        continue
                    n_script += 1
                    # YAML values may be rounded to ~5-6 significant digits; em0 fc in GHz vs Hz
                    if k == "wr90_te10":
                        ref = lookup(src, "wr90_te10.fc_Hz") / 1e9
                    if isinstance(ref, dict):
                        ref = ref.get("Z0_ohm", ref.get("dB_per_mm"))
                    if not close(float(v), float(ref), 1e-4):
                        errors.append(f"{rel}: {k} yaml {v} != script {ref}")
    print(f"files {n_files}, DB values checked {n_db}, script values checked {n_script}, "
          f"L5 reference_fe values checked {n_ref}, errors {len(errors)}")
    for e in errors:
        print("  " + e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
