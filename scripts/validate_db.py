"""Validate packaging extraction tables against data/schema/packaging.schema.yaml.

Checks: headers, required columns, types (int/float/date/enum/list), enum membership, unique keys, parent references,
id prefixes (child ids start with their parent id), locator format ("p.N" with N <= pages in text.md), qualifier
syntax, evidence YAML (paper_id, derived entries reference existing rows), and that paper references exist.
figures (v2.2): bbox format/range, page range, tv_ids belong to the paper, rank unique per paper, cand_id present in
references/<paper_id>/figures/candidates.json. A staging dir holding only figures.csv (backfill for merged papers) needs
no papers.csv.
process flows (v2.4, DevLog-007): has_process_flow == yes iff process_flow_level full/ordered; level none has no flows,
full/ordered has at least one; flow tv_ids are TVs of the paper; a delta step's tv_id is in its flow's tv_ids;
(route, seq) unique per TV and flow; typed condition columns in range; warning for every physical TV of a
full/ordered paper that is in no flow's tv_ids and not listed as "process_steps: <tv_id>" in evidence not_reported.
v2.5: process_flows.build_seq (int >= 1); a delta step's tv_id is a ';' list, each TV in the flow's tv_ids. Warnings
(flow_v25_issues, also used by scripts/fix_flows_v25.py): split names a temperature but temp_c/temp_c_max are empty;
paper level full with no typed process condition on any step; identical delta step text on 2+ rows of a flow;
target with no number; two flows of one TV with equal build_seq (unless both notes say "parallel").
papers.venue (2026-10-21): value in enums.venue (acronym only); every config/venues.yaml key is in enums.venue.

Usage: uv run python scripts/validate_db.py                 # data/
       uv run python scripts/validate_db.py --staging data/_staging/<batch>
       uv run python scripts/validate_db.py --write-templates   # data/_staging/TEMPLATE/*.csv headers
Exit 0 = no errors (warnings allowed), 1 = errors.
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SCHEMA = yaml.safe_load((ROOT / "data" / "schema" / "packaging.schema.yaml").read_text())
ENUMS = SCHEMA["enums"]
TABLES = SCHEMA["tables"]
COMMON = list(SCHEMA.get("common", {}))
VENUES_CFG = yaml.safe_load((ROOT / "config" / "venues.yaml").read_text())["venues"]
for _t in TABLES.values():  # YAML merge keys land first; put the shared basis/source/... columns last
    cols = _t["columns"]
    _t["columns"] = {**{k: v for k, v in cols.items() if k not in COMMON},
                     **{k: cols[k] for k in COMMON if k in cols}}
LOC_RE = re.compile(r"\bp\.(\d+)")
QUAL_RE = re.compile(r"^[a-z0-9_]+:(gt|lt|ge|le|approx)$")
LEVEL_RANK = {"none": 0, "fragments": 1, "ordered": 2, "full": 3}
PHYSICAL_TV = {"package", "test_coupon", "sub_assembly", "die_stack", "wafer_level", "panel_level"}
# typed process_steps columns: (min, max) sanity range in the column's unit (v2.4)
TYPED_RANGE = {"temp_c": (-273.0, 1500.0), "temp_c_max": (-273.0, 1500.0), "time_s": (0.0, 1e7),
               "ramp_c_per_min": (0.0, 60000.0),  # TCB bond heads ramp ~100 C/s = 6000 C/min
               "pressure_mpa": (0.0, 1000.0), "force_n": (0.0, 1e6),
               "dose_mj_cm2": (0.0, 1e5), "current_density_ma_cm2": (0.0, 1e4), "thickness_um": (0.0, 1e5)}
# v2.5: typed process conditions that make a flow `full` (rule n); a temperature written in free text
TYPED_COND = ("temp_c", "temp_c_max", "time_s", "ramp_c_per_min", "pressure_mpa", "force_n", "atmosphere",
              "dose_mj_cm2", "current_density_ma_cm2")
TEMP_TEXT = re.compile(r"\d\s*(?:°\s*C|℃|deg\.?\s*C|C)(?![\w/])")


def split_ids(v: str | None) -> list[str]:
    return [x.strip() for x in (v or "").split(";") if x.strip()]


def pages_of(paper_id: str) -> int | None:
    t = ROOT / "references" / paper_id / "text.md"
    if not t.exists():
        return None
    m = re.search(r"^pages: (\d+)", t.read_text()[:2000], re.M)
    return int(m.group(1)) if m else None


def read(d: Path, table: str) -> tuple[list[str], list[dict]]:
    p = d / f"{table}.csv"
    if not p.exists():
        return [], []
    with p.open(newline="") as f:
        r = csv.DictReader(f)
        return list(r.fieldnames or []), list(r)


def check_cell(col: str, spec: dict, v: str) -> str | None:
    if v == "":
        return "required" if spec.get("required") else None
    t = spec["type"]
    try:
        if t == "int":
            int(v)
        elif t == "float":
            float(v)
        elif t == "date":
            dt.date.fromisoformat(v)
        elif t == "enum":
            if v not in ENUMS[spec["enum"]]:
                return f"'{v}' not in enum {spec['enum']}"
        elif t == "list" and spec.get("enum"):
            bad = [x for x in v.split(";") if x.strip() and x.strip() not in ENUMS[spec["enum"]]]
            if bad:
                return f"{bad} not in enum {spec['enum']}"
    except ValueError:
        return f"'{v}' is not {t}"
    return None


def validate(d: Path, base: Path | None = None) -> tuple[list[str], list[str]]:
    errs, warns = [], []
    data: dict[str, list[dict]] = {}
    for table, ts in TABLES.items():
        hdr, rows = read(d, table)
        if not hdr:
            if table == "papers" and (d / "test_vehicles.csv").exists():
                errs.append(f"{table}.csv missing")
            continue
        expected = list(ts["columns"])
        if hdr != expected:
            missing = [c for c in expected if c not in hdr]
            extra = [c for c in hdr if c not in expected]
            errs.append(f"{table}.csv header mismatch (missing {missing}, extra {extra})")
        data[table] = rows
        key = ts["key"]
        seen = set()
        for i, r in enumerate(rows, start=2):
            rid = r.get(key, "")
            where = f"{table}.csv:{i} ({rid})"
            if rid in seen:
                errs.append(f"{where}: duplicate {key}")
            seen.add(rid)
            for col, spec in ts["columns"].items():
                e = check_cell(col, spec, (r.get(col) or "").strip())
                if e:
                    errs.append(f"{where}: {col} {e}")
            for o in filter(None, (r.get("overrides") or "").split(";")):
                f_, _, v_ = o.strip().partition(":")
                if f_ not in ts["columns"] or v_ not in ENUMS["basis"] + ENUMS["source"]:
                    errs.append(f"{where}: bad override '{o}' (field:basis|source)")
            for q in filter(None, (r.get("qualifiers") or "").split(";")):
                if not QUAL_RE.match(q.strip()):
                    errs.append(f"{where}: bad qualifier '{q}'")
                elif q.split(":")[0] not in ts["columns"]:
                    errs.append(f"{where}: qualifier field '{q.split(':')[0]}' not a column")
            if "locator" in ts["columns"] and r.get("locator") and not LOC_RE.findall(r["locator"]):
                errs.append(f"{where}: locator '{r['locator']}' has no p.N")
            notes = r.get("notes") or ""
            if len(notes.split()) > 40:
                warns.append(f"{where}: notes > 40 words")
    # seq uniqueness (warning): stack_layers per (tv, structure, side, feature); process_steps: see process flows below
    for table, keyf in (("stack_layers", ("tv_id", "structure", "side", "feature", "seq")),):
        seen_k: set = set()
        for r in data.get(table, []):
            k = tuple(r.get(x, "") for x in keyf)
            if k in seen_k:
                warns.append(f"{table}: duplicate {keyf} = {k}")
            seen_k.add(k)

    # locator page range (paper via test_vehicles)
    tv2p = {r["tv_id"]: r["paper_id"] for r in data.get("test_vehicles", [])}
    if base is not None:
        tv2p.update({r["tv_id"]: r["paper_id"] for r in read(base, "test_vehicles")[1]})
    flow_rows = {r["flow_id"]: r for r in (read(base, "process_flows")[1] if base is not None else [])}
    flow_rows.update({r["flow_id"]: r for r in data.get("process_flows", [])})
    f2p = {k: r["paper_id"] for k, r in flow_rows.items()}
    for table, ts in TABLES.items():
        if "locator" not in ts["columns"]:
            continue
        for r in data.get(table, []):
            pid = r.get("paper_id") or tv2p.get(r.get("tv_id", "")) or f2p.get(r.get("flow_id", ""))
            np = pages_of(pid) if pid else None
            pages = [int(x) for x in LOC_RE.findall(r.get("locator") or "")]
            if np and any(pg < 1 or pg > np for pg in pages):
                errs.append(f"{table}: {r[ts['key']]} locator page out of range 1..{np}")

    # parent references and id prefixes
    def keys(table: str) -> set[str]:
        own = {r[TABLES[table]["key"]] for r in data.get(table, [])}
        if base is not None:
            _, rows = read(base, table)
            own |= {r[TABLES[table]["key"]] for r in rows}
        return own
    for table, ts in TABLES.items():
        par = ts.get("parent")
        if not par or table not in data:
            continue
        pk = keys(par["table"])
        for r in data[table]:
            v = r.get(par["column"], "")
            if v and v not in pk:
                errs.append(f"{table}: {ts['key']}={r[ts['key']]} references missing {par['table']}.{par['column']}={v}")
            if v and not r[ts["key"]].startswith(v + "-"):
                errs.append(f"{table}: id {r[ts['key']]} does not start with parent id {v}-")
    # papers.venue: acronym from enums.venue (column stays str); the screening list config/venues.yaml must be a subset
    venues = set(ENUMS.get("venue", []))
    for v in sorted(set(VENUES_CFG) - venues):
        errs.append(f"schema: config/venues.yaml venue {v} missing from enums.venue")
    for r in data.get("papers", []):
        if r.get("venue") and r["venue"] not in venues:
            errs.append(f"papers: {r['paper_id']} venue '{r['venue']}' not in enums.venue (acronym only; year is its own column)")
    # papers: one evidence file each, source cached
    for r in data.get("papers", []):
        pid = r["paper_id"]
        ev = d / "evidence" / f"{pid}.yaml"
        if not ev.exists():
            errs.append(f"papers: {pid} has no evidence/{pid}.yaml")
        else:
            try:
                y = yaml.safe_load(ev.read_text()) or {}
                if y.get("paper_id") != pid:
                    errs.append(f"evidence/{pid}.yaml: paper_id mismatch")
                all_ids = {rr[TABLES[t]["key"]] for t in data for rr in data[t]}
                for sect in ("derived", "entries", "conflicts"):
                    for e in (y.get(sect) or []):
                        if sect == "derived" and not e.get("formula"):
                            errs.append(f"evidence/{pid}.yaml: derived entry without formula ({e.get('field')})")
                        rid = e.get("row_id")
                        if rid and rid not in all_ids:
                            errs.append(f"evidence/{pid}.yaml: {sect} row_id {rid} not found in staged tables")
            except yaml.YAMLError as exc:
                errs.append(f"evidence/{pid}.yaml: YAML error {str(exc)[:80]}")
        if r.get("source_status") == "full_text" and not (ROOT / "references" / pid / "text.md").exists():
            errs.append(f"papers: {pid} source_status full_text but no references/{pid}/text.md")
        n_tv = sum(1 for t in data.get("test_vehicles", []) if t["paper_id"] == pid)
        if r.get("n_test_vehicles") and int(r["n_test_vehicles"]) != n_tv:
            errs.append(f"papers: {pid} n_test_vehicles={r['n_test_vehicles']} but {n_tv} test_vehicles rows")
    # process flows (v2.4)
    check_flows(d, base, data, tv2p, flow_rows, errs, warns)
    # figures
    tv_paper = dict(tv2p)
    fig_seen: set[tuple[str, str]] = set()
    for r in data.get("figures", []):
        fid, pid = r["fig_id"], r["paper_id"]
        try:
            bb = [float(x) for x in r["bbox"].split(",")]
            if len(bb) != 4 or not (0 <= bb[0] < bb[2] <= 1 and 0 <= bb[1] < bb[3] <= 1):
                errs.append(f"figures: {fid} bbox '{r['bbox']}' not x0<x1, y0<y1 within 0..1")
        except ValueError:
            errs.append(f"figures: {fid} bbox '{r['bbox']}' is not 4 comma-separated numbers")
        np_ = pages_of(pid)
        if np_ and r["page"].isdigit() and not 1 <= int(r["page"]) <= np_:
            errs.append(f"figures: {fid} page {r['page']} out of range 1..{np_}")
        for tv in filter(None, (x.strip() for x in (r.get("tv_ids") or "").split(";"))):
            if tv_paper.get(tv) != pid:
                errs.append(f"figures: {fid} tv_id {tv} is not a test vehicle of {pid}")
        if (pid, r["rank"]) in fig_seen:
            errs.append(f"figures: {fid} duplicate rank {r['rank']} for {pid}")
        fig_seen.add((pid, r["rank"]))
        if r.get("bbox_source") == "candidate":
            cj = ROOT / "references" / pid / "figures" / "candidates.json"
            ids = {c["cand_id"] for c in yaml.safe_load(cj.read_text())} if cj.exists() else set()
            if r.get("cand_id") not in ids:
                errs.append(f"figures: {fid} cand_id '{r.get('cand_id')}' not in {pid} candidates.json")
        for col, lim in (("caption", 30), ("shows", 25)):
            if len((r.get(col) or "").split()) > lim:
                warns.append(f"figures: {fid} {col} > {lim} words")
    # institutions (v2.3)
    org_names = {r["org_name"] for r in data.get("organizations", [])}
    if base is not None:
        org_names |= {r["org_name"] for r in read(base, "organizations")[1]}
    for r in data.get("organizations", []):
        if r.get("parent_org") and r["parent_org"] not in org_names:
            errs.append(f"organizations: {r['org_name']} parent_org '{r['parent_org']}' not an organization")
    aff_seen: set[tuple[str, str, str]] = set()
    for r in data.get("author_affiliations", []):
        if org_names and r["org_name"] not in org_names:
            errs.append(f"author_affiliations: {r['aff_id']} org_name '{r['org_name']}' not in organizations.csv")
        if not re.fullmatch(r"[A-Z]{2}", r.get("country", "")):
            errs.append(f"author_affiliations: {r['aff_id']} country '{r.get('country')}' not ISO alpha-2")
        k = (r["paper_id"], r["author_index"], r["aff_order"])
        if k in aff_seen:
            errs.append(f"author_affiliations: {r['aff_id']} duplicate (paper, author_index, aff_order)")
        aff_seen.add(k)
    if data.get("org_sites") and data.get("author_affiliations"):
        site_keys = set()
        for r in data["org_sites"]:
            for loc in [r.get("locality", "")] + [x.strip() for x in (r.get("locality_variants") or "").split(";") if x.strip()]:
                k = (r["org_name"], loc, r["country"])
                if k in site_keys:
                    errs.append(f"org_sites: {r['site_id']} key {k} maps to more than one site")
                site_keys.add(k)
        for r in data["author_affiliations"]:
            if (r["org_name"], r.get("locality", ""), r["country"]) not in site_keys:
                warns.append(f"author_affiliations: {r['aff_id']} has no org_sites row for ({r['org_name']}, {r.get('locality', '')}, {r['country']})")
    for r in data.get("org_sites", []):
        if org_names and r["org_name"] not in org_names:
            errs.append(f"org_sites: {r['site_id']} org_name '{r['org_name']}' not in organizations.csv")
        has = bool(r.get("lat")) and bool(r.get("lon"))
        if (r.get("precision") == "unresolved") == has:
            errs.append(f"org_sites: {r['site_id']} coordinates must be empty iff precision unresolved")
        if has and not (-90 <= float(r["lat"]) <= 90 and -180 <= float(r["lon"]) <= 180):
            errs.append(f"org_sites: {r['site_id']} lat/lon out of range")
    # privacy
    for p in d.rglob("*"):
        if p.is_file() and p.suffix in (".csv", ".yaml", ".md"):
            s = p.read_text(errors="ignore")
            if "/Users/" in s or "\\Users\\" in s:
                errs.append(f"{p.name}: absolute local path")
    return errs, warns


def check_flows(d: Path, base: Path | None, data: dict[str, list[dict]], tv2p: dict[str, str],
                flow_rows: dict[str, dict], errs: list[str], warns: list[str]) -> None:
    """process_flow_level / has_process_flow, flow and step links, per-TV (route, seq), typed columns, TV coverage."""
    staged_flows = "process_flows" in data
    # flows visible for the staged papers: the staged table when present, else the base table
    if staged_flows:
        flows = data["process_flows"]
    else:
        flows = read(base, "process_flows")[1] if base is not None else []
    flows_by_paper: dict[str, list[dict]] = {}
    for f in flows:
        flows_by_paper.setdefault(f["paper_id"], []).append(f)
    tv_rows = data["test_vehicles"] if "test_vehicles" in data else (read(base, "test_vehicles")[1] if base else [])
    tv_kind = {r["tv_id"]: r.get("tv_kind", "") for r in tv_rows}
    for f in data.get("process_flows", []):
        fid, pid = f["flow_id"], f["paper_id"]
        tvs = split_ids(f.get("tv_ids"))
        for tv in tvs:
            if tv2p.get(tv) != pid:
                errs.append(f"process_flows: {fid} tv_id {tv} is not a test vehicle of {pid}")
        if len(set(tvs)) != len(tvs):
            errs.append(f"process_flows: {fid} tv_ids has duplicates")
        if f.get("scope") == "tv_build" and not tvs:
            warns.append(f"process_flows: {fid} scope tv_build but no tv_ids")
        bs = (f.get("build_seq") or "").strip()
        if bs.lstrip("-").isdigit() and int(bs) < 1:
            errs.append(f"process_flows: {fid} build_seq {bs} < 1")
    steps = data.get("process_steps", [])
    by_flow: dict[str, list[dict]] = {}
    for r in steps:
        by_flow.setdefault(r.get("flow_id", ""), []).append(r)
        sid = r["step_id"]
        f = flow_rows.get(r.get("flow_id", ""))
        dtvs = split_ids(r.get("tv_id"))  # v2.5: ';' list of the flow's TVs the delta applies to
        if len(set(dtvs)) != len(dtvs):
            errs.append(f"process_steps: {sid} delta tv_id has duplicates")
        for tv in dtvs:
            if f is not None and tv not in split_ids(f.get("tv_ids")):
                errs.append(f"process_steps: {sid} delta tv_id {tv} not in tv_ids of {f['flow_id']}")
        for col, (lo, hi) in TYPED_RANGE.items():
            v = (r.get(col) or "").strip()
            try:
                x = float(v) if v else None
            except ValueError:
                continue  # type error reported by check_cell
            if x is not None and not lo <= x <= hi:
                warns.append(f"process_steps: {sid} {col}={v} outside sanity range {lo:g}..{hi:g}")
        try:
            if r.get("temp_c_max") and r.get("temp_c") and float(r["temp_c_max"]) < float(r["temp_c"]):
                warns.append(f"process_steps: {sid} temp_c_max < temp_c")
        except ValueError:
            pass
    for fid, rs in by_flow.items():
        f = flow_rows.get(fid)
        if f is None:
            continue  # parent check reports it
        tvs = split_ids(f.get("tv_ids")) or [""]
        for tv in tvs:
            seen: dict[tuple[str, str], str] = {}
            for r in rs:
                dtvs = split_ids(r.get("tv_id"))
                if dtvs and tv not in dtvs:
                    continue
                k = ((r.get("route") or "").strip(), (r.get("seq") or "").strip())
                if k in seen:
                    errs.append(f"process_steps: {r['step_id']} and {seen[k]} share (route, seq) = {k} for TV {tv or '(none)'}")
                seen[k] = r["step_id"]
    for p in data.get("papers", []):
        pid, lvl, flag = p["paper_id"], (p.get("process_flow_level") or "").strip(), (p.get("has_process_flow") or "").strip()
        if lvl in LEVEL_RANK:
            want = "yes" if lvl in ("full", "ordered") else "no"
            if flag != want:
                errs.append(f"papers: {pid} has_process_flow={flag or '(empty)'} but process_flow_level={lvl} (expect {want})")
        pf = flows_by_paper.get(pid, [])
        if not staged_flows and base is None and "process_flows" not in data:
            continue
        if lvl == "none" and pf:
            errs.append(f"papers: {pid} process_flow_level none but {len(pf)} process_flows rows")
        if lvl in ("full", "ordered") and not pf:
            errs.append(f"papers: {pid} process_flow_level {lvl} but no process_flows rows")
        if pf and lvl in LEVEL_RANK:
            top = max(LEVEL_RANK.get(f.get("level", ""), 0) for f in pf)
            if top != LEVEL_RANK[lvl]:
                warns.append(f"papers: {pid} process_flow_level {lvl} differs from its best flow level")
        if lvl not in ("full", "ordered"):
            continue
        linked = {tv for f in pf for tv in split_ids(f.get("tv_ids"))}
        ev = d / "evidence" / f"{pid}.yaml"
        nr: list[str] = []
        if ev.exists():
            try:
                nr = [str(x) for x in ((yaml.safe_load(ev.read_text()) or {}).get("not_reported") or [])]
            except yaml.YAMLError:
                pass
        for tv, kind in tv_kind.items():
            if tv2p.get(tv) != pid or kind not in PHYSICAL_TV or tv in linked:
                continue
            if any("process_steps" in x and re.search(re.escape(tv) + r"(?![\w])", x) for x in nr):
                continue
            warns.append(f"process_flows: {pid} physical TV {tv} ({kind}) is in no flow and not in not_reported")
    # v2.5 warnings over the staged rows (the steps of staged papers come from the base when not staged)
    v25_steps = steps if "process_steps" in data else (read(base, "process_steps")[1] if base is not None else [])
    staged_p = {p["paper_id"] for p in data.get("papers", [])}
    f2p = {k: r["paper_id"] for k, r in flow_rows.items()}
    if "process_steps" not in data:
        v25_steps = [r for r in v25_steps if f2p.get(r.get("flow_id", "")) in staged_p]
    for pid, rid, kind, detail in flow_v25_issues(data.get("papers", []), data.get("process_flows", []), v25_steps, f2p):
        table = "papers" if rid == pid else ("process_flows" if re.fullmatch(r".*-F\d+", rid) else "process_steps")
        warns.append(f"{table}: {rid} [{kind}] {detail}")


def flow_v25_issues(papers: list[dict], flows: list[dict], steps: list[dict],
                    f2p: dict[str, str]) -> list[tuple[str, str, str, str]]:
    """v2.5 warnings as (paper_id, row_id, issue_type, detail). papers/flows/steps = the rows to check; steps of the
    `full` papers must all be in `steps`; f2p maps flow_id -> paper_id."""
    out: list[tuple[str, str, str, str]] = []
    pid_of = lambda r: f2p.get(r.get("flow_id", ""), "")  # noqa: E731
    for r in steps:
        sid = r["step_id"]
        if TEMP_TEXT.search(r.get("split") or "") and not (r.get("temp_c") or "").strip() \
                and not (r.get("temp_c_max") or "").strip():
            out.append((pid_of(r), sid, "split_temp_untyped",
                        f"split names a temperature ('{(r.get('split') or '')[:60]}') but temp_c and temp_c_max are empty"))
        tg = (r.get("target") or "").strip()
        if tg and not re.search(r"\d", tg):
            out.append((pid_of(r), sid, "target_no_number", f"target '{tg[:60]}' has no number (object name?)"))
    typed_papers = {pid_of(r) for r in steps if any((r.get(c) or "").strip() for c in TYPED_COND)}
    for p in papers:
        if (p.get("process_flow_level") or "").strip() == "full" and p["paper_id"] not in typed_papers:
            out.append((p["paper_id"], p["paper_id"], "full_without_typed_condition",
                        "process_flow_level full but no step has a typed process condition (" + ", ".join(TYPED_COND) + ")"))
    groups: dict[tuple[str, str], list[str]] = {}
    for r in steps:
        if split_ids(r.get("tv_id")):
            groups.setdefault((r.get("flow_id", ""), " ".join((r.get("step") or "").lower().split())), []).append(r["step_id"])
    for (fid, _), ids in groups.items():
        if len(ids) > 1:
            out.append((f2p.get(fid, ""), ids[0], "identical_delta_text",
                        f"{len(ids)} delta rows of {fid} have the same step text: {', '.join(ids)}"))
    by_tv: dict[str, dict[str, list[dict]]] = {}
    for f in flows:
        for tv in split_ids(f.get("tv_ids")):
            by_tv.setdefault(tv, {}).setdefault((f.get("build_seq") or "").strip(), []).append(f)
    seen: set[frozenset[str]] = set()
    for tv, by_bs in by_tv.items():
        for bs, fs in by_bs.items():
            ids = frozenset(f["flow_id"] for f in fs)
            if not bs or len(fs) < 2 or ids in seen:
                continue
            seen.add(ids)
            if all(re.search(r"\bparallel\b", f.get("notes") or "", re.I) for f in fs):
                continue
            out.append((fs[0]["paper_id"], sorted(ids)[0], "equal_build_seq",
                        f"flows {', '.join(sorted(ids))} of TV {tv} share build_seq {bs} (notes do not say parallel)"))
    return out


def write_templates() -> None:
    t = ROOT / "data" / "_staging" / "TEMPLATE"
    t.mkdir(parents=True, exist_ok=True)
    for table, ts in TABLES.items():
        (t / f"{table}.csv").write_text(",".join(ts["columns"]) + "\n")
    print(t)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--staging")
    ap.add_argument("--write-templates", action="store_true")
    a = ap.parse_args()
    if a.write_templates:
        write_templates()
        return 0
    d = ROOT / a.staging if a.staging else ROOT / "data"
    errs, warns = validate(d, base=ROOT / "data" if a.staging else None)
    for w in warns:
        print("WARN", w)
    for e in errs:
        print("ERROR", e)
    print(f"{len(errs)} errors, {len(warns)} warnings ({d.relative_to(ROOT)})")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
