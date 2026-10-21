"""One-off: move run-dependent fields of existing results/*.json into a full copy under logs/ and rewrite the
results file numbers-only (same rule as apref.record.write_result)."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from apref import record  # noqa: E402

for p in sorted(record.RESULTS.glob("*-skfem.json")):
    d = json.loads(p.read_text())
    if "date" not in d:
        continue
    case = p.name.removesuffix("-skfem.json")
    (record.LOGS / f"ref-{case}-full-{record.stamp()}.json").write_text(json.dumps(d, indent=1) + "\n")
    p.write_text(json.dumps(record.strip_volatile(d), indent=1) + "\n")
    print("stripped", p.name)
