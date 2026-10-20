"""Mechanical conversion of v2.3 process_steps (keyed to TVs) into v2.4 process_flows + process_steps (DevLog-007).

Deterministic, no model, no network. Reads data/{papers,test_vehicles,process_steps}.csv and data/evidence/*.yaml (never
writes data/). Dry run by default: prints the report. --write stages the converted tables for ALL papers in --out
(default data/_staging/flow_v24): papers.csv (process_flow_level added), process_flows.csv, process_steps.csv,
unchanged copies of the other paper-scoped tables (test_vehicles, components, stack_layers, interconnects,
electrical_interfaces, optical_interfaces, metrics, figures, author_affiliations; the validator checks evidence row_ids
and n_test_vehicles against the staged tables), evidence/*.yaml (step ids rewritten), id_map.csv, review_rows.csv,
CONVERSION_REPORT.md. organizations/org_sites are not paper-scoped and are not staged. Apply with `merge_staging.py <out> --replace` (coordinator).

Rules (recorded in CONVERSION_REPORT.md):
1. Segment = the rows of one TV with one flow_name, ordered by seq. Row identity = (seq, every column except
   step_id, tv_id, flow_name), so a merge never drops a cell (content, basis/source/locator/overrides/qualifiers/notes).
2. Per paper, segments are clustered greedily in TV order: a segment joins the open flow (no member from the same TV)
   whose shared rows (identical incl. seq, so order is preserved) number >= max(1, 0.5 * max(len(segment), len(anchor)));
   best overlap wins, ties -> earliest flow. Shared rows of all members are flow steps (tv_id empty); the rest are
   TV deltas (tv_id set), keeping their seq. A TV's projection (flow steps + its deltas by seq) equals its old segment.
3. Typed conditions are parsed from `conditions` only when unambiguous (one value, native unit, no bound/range/split
   marker next to it); `conditions` keeps the original text. Native units only (no unit conversion).
4. step_kind: inspection -> inline_inspection; test/preconditioning -> empty (candidates for metrics); else fab.
   step_basis: inferred_order when the row notes say the order/seq/sequence is inferred / not stated / not given /
   not shown / implied; otherwise empty (agents grade).
5. Flags (review_rows.csv; nothing deleted): test, preconditioning, inspection, structure_only (no equipment/
   conditions/temp/time/pressure and `step` reads "<structure> with ...", a design statement, or a bare
   structure/configuration name), other_category.
6. Provisional process_flow_level (agents regrade): per flow and TV, n_seq = rows that are not flagged
   test/preconditioning/inspection/structure_only, not performed=no and not step_basis inferred_order; n_cond = those
   rows with a typed/numeric process condition (temp, time, ramp, pressure, force, dose, current density, atmosphere),
   a named tool (equipment) or a number with a process unit in `conditions`. Flow level = full if n_seq >= 3 and n_cond >= 2; ordered if
   n_seq >= 3; else fragments (best TV). Paper level = best flow level; none if the paper has no rows.
   has_process_flow = yes iff full/ordered. Flow scope = tv_build (agents set generic_platform/comparison).

Usage: uv run python scripts/convert_flows.py                       # dry run, report to stdout
       uv run python scripts/convert_flows.py --write [--out data/_staging/flow_v24] [--overwrite]
"""

from __future__ import annotations

import argparse
import collections
import csv
import re
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from validate_db import ROOT, TABLES, read  # noqa: E402

DATA = ROOT / "data"
CONVERTED_ON = "2026-10-20"
OLD_IDS = ("step_id", "tv_id", "flow_name")
NUMERIC_COND = ("temp_c", "temp_c_max", "time_s", "ramp_c_per_min", "pressure_mpa", "force_n", "dose_mj_cm2",
                "current_density_ma_cm2", "atmosphere")
COPY_TABLES = ("test_vehicles", "components", "stack_layers", "interconnects", "electrical_interfaces",
               "optical_interfaces", "metrics", "figures", "author_affiliations")
NOT_SEQ_FLAGS = {"test", "preconditioning", "inspection", "structure_only"}

# ----------------------------------------------------------------------------- typed-condition parsing
NUM = r"(\d+(?:\.\d+)?)"
BOUND_BEFORE = re.compile(r"(~|<|>|≤|≥|<=|>=|\+/-|±|about|approx\.?|approximately|up to|max\.?|min\.?|below|above|over|under|-|–|/|to)\s*$",
                          re.I)
UNIT_PATTERNS = {
    # column: (regex with one number group; match must be the only one of its unit in the text)
    "force_n": re.compile(NUM + r"\s*N(?![\w/²2])"),
    "dose_mj_cm2": re.compile(NUM + r"\s*mJ\s*/\s*cm(?:2|²|\^2)(?![\w])"),
    "current_density_ma_cm2": re.compile(NUM + r"\s*mA\s*/\s*cm(?:2|²|\^2)(?![\w])"),
    "ramp_c_per_min": re.compile(NUM + r"\s*(?:°\s*C|C|deg\s*C)\s*/\s*min(?![\w])"),
    "temp_c_max": re.compile(r"\bpeak(?:\s+(?:temperature|temp\.?|reflow\s+temperature))?\s*(?:of|at|=|:)?\s*" + NUM
                             + r"\s*(?:°\s*C|C|deg\s*C)(?![\w/])", re.I),
}
RANGE_AFTER = re.compile(r"^\s*(?:-|–|to|/|,\s*\d|x)\s*\d|^\s*(?:per\b|/)", re.I)
SPLIT_WORDS = re.compile(r"\b(split|splits|sweep|swept|varied|range|ranging|vs\.?|versus|or)\b", re.I)
ATMOS = [  # (enum value, phrase regex); only explicit ambient phrases
    ("forming_gas", re.compile(r"\bforming[- ]gas\b", re.I)),
    ("n2", re.compile(r"\b(?:in|under)\s+(?:a\s+)?N2\b|\bN2\s+(?:atmosphere|ambient|environment|purge|purged)\b"
                      r"|\b(?:nitrogen)\s+(?:atmosphere|ambient|environment)\b", re.I)),
    ("ar", re.compile(r"\b(?:in|under)\s+Ar\b|\bAr\s+(?:atmosphere|ambient|environment)\b", re.I)),
    ("h2", re.compile(r"\b(?:in|under)\s+H2\b|\bH2\s+(?:atmosphere|ambient|environment)\b", re.I)),
    ("vacuum", re.compile(r"\b(?:in|under)\s+(?:a\s+)?vacuum\b|\bvacuum\s+(?:atmosphere|ambient|environment)\b", re.I)),
    ("air", re.compile(r"\b(?:in|under)\s+(?:ambient\s+)?air\b|\bair\s+(?:atmosphere|ambient|environment)\b", re.I)),
    ("o2", re.compile(r"\bO2\s+(?:atmosphere|ambient|environment)\b", re.I)),
]
# a whole ';'/','-separated item that names only an ambient (e.g. "170 C, 0.6 MPa, 60 min, N2")
ATMOS_ITEM = {"n2": "n2", "nitrogen": "n2", "vacuum": "vacuum", "high vacuum": "vacuum", "air": "air",
              "ambient air": "air", "forming gas": "forming_gas"}
# convertible units left for agents (rule (e) conversions need an evidence `derived` entry)
CONVERTIBLE = {"force_n": re.compile(r"\d\s*(?:kN|kgf|gf)\b"),
               "current_density_ma_cm2": re.compile(r"\d\s*(?:A\s*/\s*dm(?:2|²)|ASD)\b")}
COND_UNIT = re.compile(r"\d\s*(?:°\s*C\b|C\b|K/min|s\b|sec\b|min\b|h\b|hr|hours?\b|MPa|kPa|Pa\b|Torr|mTorr|bar\b|psi|N\b|kN|kgf|gf"
                       r"|mJ|J/cm|mA|A/dm|ASD|W\b|kW|rpm|sccm|slm|kHz|MHz|V\b|kV)", re.I)


def parse_typed(cond: str) -> tuple[dict[str, str], list[str]]:
    """Return (typed values, skipped-ambiguous column names) parsed from a conditions string."""
    out: dict[str, str] = {}
    skipped: list[str] = []
    if not cond:
        return out, skipped
    for col, rx in UNIT_PATTERNS.items():
        ms = list(rx.finditer(cond))
        if not ms:
            continue
        if len(ms) != 1:
            skipped.append(col)
            continue
        m = ms[0]
        before, after = cond[:m.start()], cond[m.end():]
        num_before = cond[:m.start(1)] if col == "temp_c_max" else before
        if BOUND_BEFORE.search(num_before) or RANGE_AFTER.match(after) or SPLIT_WORDS.search(cond):
            skipped.append(col)
            continue
        out[col] = m.group(1)
    hits = {v for v, rx in ATMOS if rx.search(cond)}
    hits |= {ATMOS_ITEM[x.strip().lower()] for x in re.split(r"[;,]", cond) if x.strip().lower() in ATMOS_ITEM}
    if len(hits) == 1:
        out["atmosphere"] = hits.pop()
    elif len(hits) > 1:
        skipped.append("atmosphere")
    return out, skipped


# ----------------------------------------------------------------------------- flags
# structure restatement: "<structure> with ..." (no operation named), a design statement, or a bare structure name
STRUCT_WITH = re.compile(r"^\s*(?:(?:[A-Z][\w/+-]*|glass|silicon|organic|metal)\s+){0,2}(?i:TGVs?|TSVs?|TDVs?|TMVs?|vias?|"
                         r"RDLs?|pillars?|bumps?|pads?|interposers?|substrates?|cores?|layers?|electrodes?|structures?|"
                         r"stacks?)\s+with\b")
STRUCT_DESIGN = re.compile(r"^\s*(?:[\w/+-]+\s+){0,2}design\b|^\s*(?:[\w/+-]+\s+){0,4}(?:structure|stack-up|configuration)\s*$", re.I)


def is_structure_only(r: dict) -> bool:
    """Candidate structure restatement (heuristic, review only): no equipment/conditions/temp/time/pressure and the step
    text is "<structure> with ...", a design statement, or a bare structure/configuration name."""
    if any((r.get(c) or "").strip() for c in ("equipment", "conditions", "temp_c", "time_s", "pressure_mpa")):
        return False
    st = (r.get("step") or "").strip()
    return bool(STRUCT_WITH.search(st) or STRUCT_DESIGN.search(st))


INFERRED = re.compile(r"\b(seq|order|sequence|position)\b[^.;]{0,60}?\b(inferred|not stated|not given|not shown|implied|"
                      r"unstated)\b", re.I)


def flags_of(r: dict) -> list[str]:
    cat = r.get("category", "")
    out = []
    if cat in ("test", "preconditioning", "inspection"):
        out.append(cat)
    elif is_structure_only(r):
        out.append("structure_only")
    if cat == "other":
        out.append("other_category")
    return out


def has_cond(r: dict) -> bool:
    """A process condition or a named tool on the step (level rule 6)."""
    return (any((r.get(c) or "").strip() for c in NUMERIC_COND) or bool((r.get("equipment") or "").strip())
            or bool(COND_UNIT.search(r.get("conditions") or "")))


# ----------------------------------------------------------------------------- conversion


def seq_int(r: dict) -> int:
    try:
        return int(r["seq"])
    except (KeyError, ValueError):
        return 10**6


def convert() -> dict:
    papers = read(DATA, "papers")[1]
    tvs = read(DATA, "test_vehicles")[1]
    old_steps = read(DATA, "process_steps")[1]
    old_cols = list(read(DATA, "process_steps")[0])
    content_cols = [c for c in old_cols if c not in OLD_IDS]
    tv_order = {r["tv_id"]: i for i, r in enumerate(tvs)}
    tv2p = {r["tv_id"]: r["paper_id"] for r in tvs}

    # segments per paper: (tv, flow_name) in TV order, first appearance of the flow_name within the TV
    segs: dict[str, list[dict]] = collections.defaultdict(list)
    seg_idx: dict[tuple[str, str], dict] = {}
    for r in sorted(old_steps, key=lambda r: tv_order.get(r["tv_id"], 10**6)):
        k = (r["tv_id"], r["flow_name"])
        if k not in seg_idx:
            seg_idx[k] = {"tv": r["tv_id"], "name": r["flow_name"], "rows": []}
            segs[tv2p[r["tv_id"]]].append(seg_idx[k])
        seg_idx[k]["rows"].append(r)
    seq_ties = []
    for sg in seg_idx.values():
        sg["rows"].sort(key=seq_int)
        sg["keys"] = [tuple([r["seq"]] + [r[c] for c in content_cols]) for r in sg["rows"]]
        if len(set(r["seq"] for r in sg["rows"])) < len(sg["rows"]):
            seq_ties.append((sg["tv"], sg["name"]))

    flows_out: list[dict] = []
    steps_out: list[dict] = []
    id_map: list[dict] = []
    review: list[dict] = []
    paper_level: dict[str, str] = {}
    stats = collections.Counter()
    typed_hits = collections.Counter()
    typed_skips = collections.Counter()
    convertible = collections.Counter()
    flag_counts = collections.Counter()
    name_variant_flows = []
    rank = {"fragments": 1, "ordered": 2, "full": 3}

    for p in papers:
        pid = p["paper_id"]
        groups: list[dict] = []
        for sg in segs.get(pid, []):
            best, best_n = None, 0
            for g in groups:
                if sg["tv"] in g["tvs"]:
                    continue
                n = len(set(sg["keys"]) & g["base"])
                need = max(1.0, 0.5 * max(len(sg["keys"]), len(g["anchor"]["keys"])))
                if n >= need and n > best_n:
                    best, best_n = g, n
            if best is None:
                groups.append({"tvs": [sg["tv"]], "members": [sg], "anchor": sg, "base": set(sg["keys"])})
            else:
                best["tvs"].append(sg["tv"])
                best["members"].append(sg)
                best["base"] &= set(sg["keys"])
        levels = []
        for n_f, g in enumerate(groups, start=1):
            fid = f"{pid}-F{n_f}"
            multi = len(g["members"]) > 1
            items = []  # (seq, order, tv_id, old_row, key)
            done_base = set()
            for mi, sg in enumerate(g["members"]):
                for r, k in zip(sg["rows"], sg["keys"]):
                    if k in g["base"]:
                        if k in done_base:
                            items_old = next(it for it in items if it[4] == k and it[2] == "")
                            items_old[5].append(r["step_id"])
                            continue
                        done_base.add(k)
                        items.append((seq_int(r), -1, "", r, k, [r["step_id"]]))
                    else:
                        items.append((seq_int(r), mi, sg["tv"], r, k, [r["step_id"]]))
            items.sort(key=lambda it: (it[0], it[1]))
            width = max(2, len(str(len(items))))
            flow_steps = []
            for n_s, (_, _, tvd, r, _, olds) in enumerate(items, start=1):
                sid = f"{fid}-s{n_s:0{width}d}"
                new = {c: "" for c in TABLES["process_steps"]["columns"]}
                for c in content_cols:
                    if c in new:
                        new[c] = r[c]
                new.update({"step_id": sid, "flow_id": fid, "tv_id": tvd})
                typed, skipped = parse_typed(r.get("conditions", ""))
                for c, v in typed.items():
                    new[c] = v
                    typed_hits[c] += 1
                for c in skipped:
                    typed_skips[c] += 1
                for c, rx in CONVERTIBLE.items():
                    if not typed.get(c) and rx.search(r.get("conditions", "")):
                        convertible[c] += 1
                cat = new["category"]
                new["step_kind"] = "inline_inspection" if cat == "inspection" else ("" if cat in ("test", "preconditioning") else "fab")
                if INFERRED.search(r.get("notes") or ""):
                    new["step_basis"] = "inferred_order"
                fl = flags_of(new)
                for f_ in fl:
                    flag_counts[f_] += 1
                    review.append({"step_id": sid, "old_step_ids": ";".join(olds), "paper_id": pid, "flag": f_,
                                   "category": cat, "step": new["step"]})
                new["_flags"] = fl
                for o in olds:
                    id_map.append({"old_step_id": o, "new_step_id": sid, "flow_id": fid, "delta_tv_id": tvd})
                flow_steps.append(new)
                stats["deltas" if tvd else "flow_steps"] += 1
            # flow level from the best TV projection
            best_lvl = "fragments"
            for tv in g["tvs"]:
                proj = [s_ for s_ in flow_steps if s_["tv_id"] in ("", tv)]
                ok = [s_ for s_ in proj if not (set(s_["_flags"]) & NOT_SEQ_FLAGS) and s_["performed"] != "no"
                      and s_["step_basis"] != "inferred_order"]
                n_seq, n_cond = len(ok), sum(1 for s_ in ok if has_cond(s_))
                lvl = "full" if n_seq >= 3 and n_cond >= 2 else ("ordered" if n_seq >= 3 else "fragments")
                if rank[lvl] > rank[best_lvl]:
                    best_lvl = lvl
            levels.append(best_lvl)
            names = list(dict.fromkeys(sg["name"] for sg in g["members"]))
            note = ""
            if len(names) > 1:
                name_variant_flows.append(fid)
                note = "flow_name as on " + g["members"][0]["tv"].rsplit("-", 1)[-1] + "; other TVs: " + "; ".join(
                    f"{sg['tv'].rsplit('-', 1)[-1]} '{sg['name']}'" for sg in g["members"][1:] if sg["name"] != names[0])
            all_rows = [r for sg in g["members"] for r in sg["rows"]]
            sources = {r["source"] for r in all_rows}
            loc_parts = list(dict.fromkeys(x.strip() for r in all_rows for x in r["locator"].split(";") if x.strip()))
            flows_out.append({
                "flow_id": fid, "paper_id": pid, "flow_name": names[0], "scope": "tv_build", "level": best_lvl,
                "tv_ids": ";".join(g["tvs"]),
                "basis": "stated",  # the flow row states a fact; numeric cells live on the steps
                "source": sources.pop() if len(sources) == 1 else "mixed",
                "overrides": "", "locator": "; ".join(loc_parts), "qualifiers": "", "notes": note,
            })
            stats["flows"] += 1
            stats["multi_tv_flows"] += multi
            steps_out.extend(flow_steps)
        paper_level[pid] = max(levels, key=lambda x: rank[x]) if levels else "none"
        stats["papers_with_flows"] += bool(levels)

    for r in steps_out:
        r.pop("_flags", None)
    stats["rows_before"] = len(old_steps)
    stats["rows_after"] = len(steps_out)
    stats["segments"] = len(seg_idx)
    stats["inferred_order"] = sum(1 for r in steps_out if r["step_basis"] == "inferred_order")
    return {"papers": papers, "tvs": tvs, "flows": flows_out, "steps": steps_out, "id_map": id_map, "review": review,
            "paper_level": paper_level, "stats": stats, "typed_hits": typed_hits, "typed_skips": typed_skips, "convertible": convertible,
            "flag_counts": flag_counts, "name_variant_flows": name_variant_flows, "seq_ties": seq_ties}


def rewrite_evidence(text: str, mapping: dict[str, str]) -> tuple[str, int]:
    """Replace whole old step ids with their new ids (exact token match)."""
    n = 0

    def sub(m: re.Match) -> str:
        nonlocal n
        n += 1
        return mapping[m.group(0)]
    if not mapping:
        return text, 0
    rx = re.compile(r"(?<![\w.])(?:" + "|".join(re.escape(k) for k in sorted(mapping, key=len, reverse=True)) + r")(?![\w])")
    return rx.sub(sub, text), n


# disclosed grades from the 2026-10-19 process-flow reviews (A, B), used only to report the rule's agreement
REVIEW_GRADES = {
    "ectc32696.2021.00125": "fragments", "iwlpc52010.2020.9375855": "ordered", "ectc51687.2025.00085": "ordered",
    "icep61562.2024.10535612": "full", "ectc51909.2023.00219": "ordered", "ectc51529.2024.00093": "fragments",
    "ectc51906.2022.00140": "ordered", "ectc51846.2026.00074": "full", "ectc51687.2025.00071": "full",
    "itherm45881.2020.9190542": "fragments", "vlsitechnologyandcir65830.2026.11577576": "ordered",
    "ectc51529.2024.00133": "full", "ectc51906.2022.00232": "ordered", "eptc59621.2023.10457670": "ordered",
    "ectc51846.2026.00199": "full", "ectc51529.2024.00321": "ordered", "ectc32862.2020.00185": "full",
    "estc60143.2024.10712129": "full",
}


def report(res: dict, changes: list[tuple[str, str, str, str]], ev_counts: dict[str, int]) -> str:
    st, papers = res["stats"], res["papers"]
    pl = res["paper_level"]
    calib = (sum(pl.get(k) == v for k, v in REVIEW_GRADES.items()), len(REVIEW_GRADES),
             [f"{k} review {v}, rule {pl.get(k)}" for k, v in REVIEW_GRADES.items() if pl.get(k) != v])
    lv = collections.Counter(res["paper_level"].values())
    fl = collections.Counter(f["level"] for f in res["flows"])
    tvs_by_paper = collections.defaultdict(list)
    for t in res["tvs"]:
        tvs_by_paper[t["paper_id"]].append(t)
    linked = {tv for f in res["flows"] for tv in f["tv_ids"].split(";") if tv}
    physical = {"package", "test_coupon", "sub_assembly", "die_stack", "wafer_level", "panel_level"}
    unlinked = [(t["paper_id"], t["tv_id"], t["tv_kind"]) for t in res["tvs"]
                if res["paper_level"].get(t["paper_id"]) in ("full", "ordered") and t["tv_kind"] in physical
                and t["tv_id"] not in linked]
    tv_nflows = collections.Counter(tv for f in res["flows"] for tv in f["tv_ids"].split(";") if tv)
    multi_flow_tvs = sorted(tv for tv, n in tv_nflows.items() if n > 1)
    dedup = st["rows_before"] - st["rows_after"]
    L = [
        f"# Process-flow conversion report (schema v2.4, {CONVERTED_ON})",
        "",
        "Generated by `scripts/convert_flows.py --write` from `data/` (v2.3). Mechanical, deterministic; the rules are in",
        "the script docstring and repeated below. Nothing was deleted: every old row maps to one new row (`id_map.csv`).",
        "",
        "## Counts",
        "",
        "| item | n |",
        "|---|---|",
        f"| papers | {len(papers)} |",
        f"| papers with flows | {st['papers_with_flows']} |",
        f"| old segments (TV x flow_name) | {st['segments']} |",
        f"| flows | {st['flows']} |",
        f"| flows linked to more than one TV | {st['multi_tv_flows']} |",
        f"| merged flows whose TVs had different flow_name (first kept, others in notes) | {len(res['name_variant_flows'])} |",
        f"| process_steps rows before | {st['rows_before']} |",
        f"| process_steps rows after | {st['rows_after']} |",
        f"| rows de-duplicated (identical row on sibling TVs folded into one flow step) | {dedup} |",
        f"| flow steps (tv_id empty) | {st['flow_steps']} |",
        f"| TV deltas (tv_id set) | {st['deltas']} |",
        f"| step_basis inferred_order (from notes) | {st['inferred_order']} |",
        f"| segments with seq ties | {len(res['seq_ties'])} |",
        f"| evidence files with rewritten step ids | {sum(1 for v in ev_counts.values() if v)} ({sum(ev_counts.values())} ids) |",
        "",
        "## Typed conditions parsed from `conditions` (original text kept)",
        "",
        "| column | parsed | skipped as ambiguous |",
        "|---|---|---|",
    ]
    for c in ("force_n", "atmosphere", "dose_mj_cm2", "current_density_ma_cm2", "ramp_c_per_min", "temp_c_max"):
        L.append(f"| {c} | {res['typed_hits'][c]} | {res['typed_skips'][c]} |")
    L += ["", "Rows with a value in a convertible unit, left in `conditions` for agents (conversion needs an evidence",
          f"`derived` entry): force kN/kgf/gf {res['convertible']['force_n']}, current density A/dm2/ASD "
          f"{res['convertible']['current_density_ma_cm2']}. `split` is not parsed mechanically (agents fill it).", "",
          "## Flagged rows (review_rows.csv; kept, not deleted)", "", "| flag | rows |", "|---|---|"]
    for k in ("test", "preconditioning", "inspection", "structure_only", "other_category"):
        L.append(f"| {k} | {res['flag_counts'][k]} |")
    L += ["", "test/preconditioning rows have empty step_kind (candidates for metrics); inspection rows have step_kind",
          "inline_inspection (confirm they sit inside the flow). structure_only is a narrow heuristic (no equipment/",
          "conditions/temp/time/pressure, and `step` reads '<structure> with ...', a design statement or a bare",
          "structure name); agents also catch the ones it misses.", "",
          "## Provisional process_flow_level (agents regrade)", "",
          "| level | papers | flows |", "|---|---|---|"]
    for k in ("full", "ordered", "fragments", "none"):
        L.append(f"| {k} | {lv[k]} | {fl.get(k, 0)} |")
    L += ["", "Rule: per flow and TV, n_seq = rows not flagged test/preconditioning/inspection/structure_only, not",
          "performed=no and not step_basis inferred_order; n_cond = those rows with temp/time/ramp/pressure/force/dose/",
          "current density/atmosphere, a named tool (equipment) or a number with a process unit in `conditions`.",
          "full: n_seq >= 3 and n_cond >= 2; ordered: n_seq >= 3; else fragments (best TV). Paper = best flow; none = no",
          "rows. has_process_flow = yes iff full/ordered. All flows get scope tv_build.", "",
          "Calibration against the 18 `yes` papers graded in DevLog/audits/process_flow_review_{A,B}_2026-10-19.md:",
          f"{calib[0]}/{calib[1]} agree. Disagreements: " + ("; ".join(calib[2]) or "none") + ".", "",
          f"## Papers whose has_process_flow changes ({len(changes)})", "",
          "| paper | old flag | new flag | provisional level |", "|---|---|---|---|"]
    for pid, old, new, lvl in changes:
        L.append(f"| {pid} | {old} | {new} | {lvl} |")
    L += ["", f"## Physical TVs of full/ordered papers in no flow ({len(unlinked)}; validator warnings)", "",
          "Agents link them to a flow or list `process_steps: <tv_id>` in evidence not_reported.", ""]
    L += [f"- {tv} ({kind})" for _, tv, kind in unlinked]
    L += ["", f"## TVs linked to more than one flow ({len(multi_flow_tvs)}; check route vs sequential sub-flows)", ""]
    L += [f"- {tv} ({tv_nflows[tv]} flows)" for tv in multi_flow_tvs]
    L += ["", f"## Merged flows with differing TV flow names ({len(res['name_variant_flows'])})", ""]
    L += [f"- {f}" for f in res["name_variant_flows"]]
    L += ["", "## Files", "",
          "- `papers.csv`: adds process_flow_level (provisional); has_process_flow re-derived.",
          "- `test_vehicles`, `components`, `stack_layers`, `interconnects`, `electrical_interfaces`,",
          "  `optical_interfaces`, `metrics`, `figures`, `author_affiliations`: unchanged copies (the validator checks",
          "  evidence row_ids and n_test_vehicles against the staged tables).",
          "- `process_flows.csv`, `process_steps.csv`: v2.4 tables, all papers.",
          "- `evidence/*.yaml`: copies; old step ids replaced by the new ids (token match), nothing else changed.",
          "- `id_map.csv`: old_step_id -> new_step_id (many to one where sibling rows were folded).",
          "- `review_rows.csv`: flagged rows for agent review.", ""]
    return "\n".join(L)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true", help="stage the converted tables in --out")
    ap.add_argument("--out", default="data/_staging/flow_v24")
    ap.add_argument("--overwrite", action="store_true", help="replace a previous output of this script in --out")
    a = ap.parse_args()
    res = convert()
    papers_new = []
    changes = []
    for p in res["papers"]:
        lvl = res["paper_level"][p["paper_id"]]
        flag = "yes" if lvl in ("full", "ordered") else "no"
        if p.get("has_process_flow", "") != flag:
            changes.append((p["paper_id"], p.get("has_process_flow", ""), flag, lvl))
        papers_new.append({**{c: p.get(c, "") for c in TABLES["papers"]["columns"]},
                           "process_flow_level": lvl, "has_process_flow": flag})
    by_paper: dict[str, dict[str, str]] = collections.defaultdict(dict)
    f2p = {f["flow_id"]: f["paper_id"] for f in res["flows"]}
    for m in res["id_map"]:
        by_paper[f2p[m["flow_id"]]][m["old_step_id"]] = m["new_step_id"]
    ev_texts, ev_counts = {}, {}
    for p in res["papers"]:
        pid = p["paper_id"]
        src = DATA / "evidence" / f"{pid}.yaml"
        if src.exists():
            ev_texts[pid], ev_counts[pid] = rewrite_evidence(src.read_text(), by_paper.get(pid, {}))
    rep = report(res, changes, ev_counts)
    if not a.write:
        print(rep)
        print("\n(dry run: nothing written; --write stages the tables)")
        return 0
    out = ROOT / a.out
    if out.exists() and any(out.iterdir()):
        if not (a.overwrite and (out / "CONVERSION_REPORT.md").exists()):
            print(f"refusing: {out} is not empty (use --overwrite to replace a previous output of this script)")
            return 1
        shutil.rmtree(out)
    (out / "evidence").mkdir(parents=True)

    def write(name: str, cols: list[str], rows: list[dict]) -> None:
        with (out / name).open("w", newline="") as f:
            w = csv.DictWriter(f, fieldnames=cols)
            w.writeheader()
            for r in rows:
                w.writerow({k: r.get(k, "") for k in cols})
    write("papers.csv", list(TABLES["papers"]["columns"]), papers_new)
    for t in COPY_TABLES:
        hdr, rows = read(DATA, t)
        if hdr != list(TABLES[t]["columns"]):
            print(f"refusing: data/{t}.csv header differs from the schema")
            return 1
        write(f"{t}.csv", hdr, rows)
    write("process_flows.csv", list(TABLES["process_flows"]["columns"]), res["flows"])
    write("process_steps.csv", list(TABLES["process_steps"]["columns"]), res["steps"])
    write("id_map.csv", ["old_step_id", "new_step_id", "flow_id", "delta_tv_id"], res["id_map"])
    write("review_rows.csv", ["step_id", "old_step_ids", "paper_id", "flag", "category", "step"], res["review"])
    for pid, t in ev_texts.items():
        (out / "evidence" / f"{pid}.yaml").write_text(t)
    (out / "CONVERSION_REPORT.md").write_text(rep)
    print(f"wrote {out.relative_to(ROOT)}: {len(res['flows'])} flows, {len(res['steps'])} steps, "
          f"{len(papers_new)} papers, {len(ev_texts)} evidence files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
