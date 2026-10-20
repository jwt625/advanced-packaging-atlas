"""Export every row of the given merged papers (all tables + evidence YAML) into a staging dir, for revision.

The revised dir is merged back with `scripts/merge_staging.py <dir> --apply --replace`, which drops all existing rows of
the staged paper_ids first. Refuses to write into a non-empty dir.

Usage: uv run python scripts/export_paper.py data/_staging/<name> <paper_id> [<paper_id> ...]
"""

from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_db import ROOT, TABLES, read  # noqa: E402


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    out, pids = ROOT / sys.argv[1], set(sys.argv[2:])
    if out.exists() and any(out.iterdir()):
        print(f"refusing: {out} is not empty")
        return 1
    data = ROOT / "data"
    known = {r["paper_id"] for r in read(data, "papers")[1]}
    if pids - known:
        print(f"not in data/papers.csv: {sorted(pids - known)}")
        return 1
    tv2p = {r["tv_id"]: r["paper_id"] for r in read(data, "test_vehicles")[1]}
    f2p = {r["flow_id"]: r["paper_id"] for r in read(data, "process_flows")[1]}  # v2.4: steps hang off flows
    (out / "evidence").mkdir(parents=True)
    counts = {}
    for table, ts in TABLES.items():
        rows = [r for r in read(data, table)[1]
                if (r.get("paper_id") or tv2p.get(r.get("tv_id") or "") or f2p.get(r.get("flow_id") or "")) in pids]
        with (out / f"{table}.csv").open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=list(ts["columns"]))
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, "") for k in ts["columns"]})
        counts[table] = len(rows)
    for pid in sorted(pids):
        shutil.copyfile(data / "evidence" / f"{pid}.yaml", out / "evidence" / f"{pid}.yaml")
    print(f"{out.relative_to(ROOT)}: {len(pids)} papers, rows {counts}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
