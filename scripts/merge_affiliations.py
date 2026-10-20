"""Merge affiliation staging batches into data/author_affiliations.csv and data/organizations.csv (DevLog-006).

Applies config/org_aliases.yaml (canonical name <- batch variants) to org_name and parent_org, merges the proposed
organization rows (first non-empty value per field wins; conflicting org_type/country are reported), records the
merged variants in organizations.notes, and validates the result. Dry run by default.

Usage: uv run python scripts/merge_affiliations.py data/_staging/g000 [data/_staging/g001 ...] [--apply]
"""

from __future__ import annotations

import argparse
import csv
import sys
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_db import ROOT, TABLES, read, validate  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("batches", nargs="+")
    ap.add_argument("--apply", action="store_true")
    a = ap.parse_args()
    aliases = yaml.safe_load((ROOT / "config" / "org_aliases.yaml").read_text()) or {}
    canon = {v: k for k, vs in aliases.items() for v in vs}
    fix = lambda n: canon.get(n, n)  # noqa: E731
    affs: list[dict] = []
    orgs: dict[str, dict] = {}
    variants: dict[str, set[str]] = {}
    issues = []
    for b in a.batches:
        d = ROOT / b
        for r in read(d, "author_affiliations")[1]:
            affs.append({**r, "org_name": fix(r["org_name"])})
        for r in read(d, "organizations")[1]:
            name = fix(r["org_name"])
            if name != r["org_name"]:
                variants.setdefault(name, set()).add(r["org_name"])
            r = {**r, "org_name": name, "parent_org": fix(r.get("parent_org", ""))}
            if name not in orgs:
                orgs[name] = r
                continue
            o = orgs[name]
            for k in ("org_type", "country", "region"):
                if r.get(k) and o.get(k) and r[k] != o[k]:
                    issues.append(f"{name}: {k} {o[k]} vs {r[k]} ({b}); kept {o[k]}")
            for k, v in r.items():
                if v and not o.get(k):
                    o[k] = v
    for name, vs in variants.items():
        extra = "merged names: " + "; ".join(sorted(vs - {name}))
        if vs - {name}:
            orgs[name]["notes"] = "; ".join(x for x in (orgs[name].get("notes", ""), extra) if x)[:400]
    used = {r["org_name"] for r in affs} | {o["parent_org"] for o in orgs.values() if o.get("parent_org")}
    dropped = sorted(set(orgs) - used)
    orgs = {k: v for k, v in orgs.items() if k in used}
    for n in sorted(used - set(orgs)):
        issues.append(f"{n}: used but no organization row")
    affs.sort(key=lambda r: (r["paper_id"], int(r["author_index"]), int(r["aff_order"])))
    out = ROOT / "data" / "_staging" / "_affil_merged"
    out.mkdir(parents=True, exist_ok=True)
    for table, rows in (("author_affiliations", affs), ("organizations", sorted(orgs.values(), key=lambda r: r["org_name"].lower()))):
        cols = list(TABLES[table]["columns"])
        with (out / f"{table}.csv").open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, "") for k in cols})
    errs, warns = validate(out, base=ROOT / "data")
    for i in issues:
        print("ISSUE", i)
    for e in errs:
        print("ERROR", e)
    print(f"{len(affs)} affiliation rows, {len(orgs)} organizations (dropped unused: {dropped}); "
          f"{len(errs)} errors, {len(warns)} warnings; staged in {out.relative_to(ROOT)}")
    if errs or not a.apply:
        return 1 if errs else 0
    for table in ("author_affiliations", "organizations"):
        (ROOT / "data" / f"{table}.csv").write_bytes((out / f"{table}.csv").read_bytes())
    print("applied to data/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
