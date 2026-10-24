#!/usr/bin/env python3
"""Check the process-animation flow files (config/process3d/flows/*.yaml) against data/*.csv.

Format: config/process3d/COMPOSITION.md (DevLog-016, lane L34; shaped for config/process3d/CONTRACT.md v1). Every
value is a provenance spec:

  {ref: "<row_id>.<field>"}                 reported   (DB cell; text cell + `value:` = number quoted in that cell)
  {analog: "<row_id>.<field>", note}        template   (DB cell of another build used as a stand-in)
  {derived: "<expr>", refs: [cells]}        derived    (arithmetic over r0, r1, ... and flow geometry names)
  {template: <number|text|expr>, note}      template   (rationale required; optional source, refs)
  {package3d: "[family[@variant].]param"}   status of that resolved package3d template param
  {geom: "<name>"}                          the flow's own geometry param
  {pending: "<quantity, unit, what is needed>"}  pending (no source yet)
  {na: "<quantity, why>"}                   na: not reported, HUD-only values (hud / targets / equipment only)

Checks: every ref / analog resolves (row, field, non-empty cell; text cells need the quoted value); refs stay in
scope (composite flows: the flow's family_papers only, so a cell of another build is an analog even when its row
orders an inserted or expansion step; paper flows: the paper itself); derived values carry their leaf cells;
units match the key suffix; expressions evaluate; categories are schema step_category values and a step keeps its
DB row's category; pieces, routes, groups resolve; every route covers each backbone flow once in DB (route, seq)
order (paper flows: nothing else); required HUD keys per category are present (pending allowed); ASCII only, no
absolute paths. Prints status counts per flow (pending counts include geometry references).

Usage: uv run python scripts/check_process_flows.py [--flow ID] [--pending] [--table] [--verbose]
"""

from __future__ import annotations

import argparse
import ast
import csv
import json
import math
import operator
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
FLOW_DIR = ROOT / "config" / "process3d" / "flows"
GEO_DIR = ROOT / "config" / "process3d" / "geometry"
SCHEMA = DATA / "schema" / "packaging.schema.yaml"
PKG3D = ROOT / "app" / "static" / "data" / "package3d.json"

TABLES = {
    "papers": "paper_id",
    "test_vehicles": "tv_id",
    "components": "comp_id",
    "stack_layers": "layer_id",
    "interconnects": "ic_id",
    "process_flows": "flow_id",
    "process_steps": "step_id",
    "electrical_interfaces": "ei_id",
    "optical_interfaces": "oi_id",
    "metrics": "metric_id",
    "figures": "fig_id",
}

# HUD keys every step of a category must carry (a {pending} spec is allowed). COMPOSITION.md "Required HUD keys".
REQUIRED_HUD: dict[str, list[str]] = {
    "lithography": ["dose_mj_cm2", "thickness_um"],
    "etch_dry": ["time_s"],
    "tsv_tgv_formation": ["time_s"],
    "via_reveal": ["thickness_in_um", "thickness_um"],
    "deposition_cvd": ["temp_c", "thickness_um"],
    "deposition_pvd": ["thickness_um"],
    "deposition_other": ["thickness_um"],
    "electroplating": ["current_density_ma_cm2", "time_s", "thickness_um"],
    "electroless": ["temp_c", "thickness_um"],
    "surface_finish": ["thickness_um"],
    "sap_msap": ["current_density_ma_cm2", "thickness_um"],
    "cmp": ["pressure_mpa", "time_s"],
    "grinding_thinning": ["thickness_in_um", "thickness_um"],
    "bonding": ["temp_c", "time_s", "force_n"],
    "die_attach": ["temp_c", "force_n"],
    "temporary_bonding": ["temp_c", "time_s", "thickness_um"],
    "underfill": ["temp_c"],
    "dispense": ["temp_c"],
    "cure": ["temp_c", "time_s"],
    "anneal": ["temp_c", "time_s"],
    "molding": ["temp_c", "time_s"],
    "reflow": ["temp_c_max"],
    "lamination": ["temp_c", "time_s", "pressure_mpa", "thickness_um"],
    "desmear": ["time_s"],
    "bumping": ["thickness_um"],
}
HUD_KEYS = {
    "temp_c", "temp_c_max", "time_s", "ramp_c_per_min", "force_n", "pressure_mpa", "atmosphere", "thickness_um",
    "thickness_in_um", "current_density_ma_cm2", "dose_mj_cm2",
    # stage / follow-on values shown beside the main condition (audit A1 m14, m18)
    "temp_stage1_c", "time_stage1_s", "cure_temp_c", "cure_time_s", "stage_temp_c",
}
UNIT_SUFFIXES = ["c_per_min", "ma_cm2", "mj_cm2", "mm2", "mpa", "pct", "um", "mm", "min", "c", "s", "n"]
TEXT_KEYS = {"atmosphere", "equipment", "material", "name", "joint_material"}
STATUS_ORDER = ["reported", "derived", "template", "na", "pending"]
SPEC_KEYS = {"ref", "analog", "derived", "template", "package3d", "geom", "pending", "na"}
NA_SECTIONS = {"hud", "equipment", "targets"}  # `na` (not reported) only for HUD-only values
NUM_RE = re.compile(r"[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?")


class Err(Exception):
    pass


def read_csv(name: str) -> list[dict[str, str]]:
    with open(DATA / f"{name}.csv", newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


class DB:
    def __init__(self) -> None:
        self.rows: dict[str, tuple[str, dict[str, str]]] = {}
        self.tables: dict[str, list[dict[str, str]]] = {}
        for t, key in TABLES.items():
            p = DATA / f"{t}.csv"
            if not p.exists():
                continue
            rows = read_csv(t)
            self.tables[t] = rows
            for r in rows:
                self.rows[r[key]] = (t, r)
        self.tv_paper = {r["tv_id"]: r["paper_id"] for r in self.tables["test_vehicles"]}
        self.flow_paper = {r["flow_id"]: r["paper_id"] for r in self.tables["process_flows"]}
        self.flow_steps: dict[str, list[dict[str, str]]] = defaultdict(list)
        for r in self.tables["process_steps"]:
            self.flow_steps[r["flow_id"]].append(r)

    def paper_of(self, row_id: str) -> str | None:
        if row_id not in self.rows:
            return None
        t, r = self.rows[row_id]
        if t == "papers":
            return r["paper_id"]
        if "paper_id" in r and r["paper_id"]:
            return r["paper_id"]
        if t == "process_steps":
            return self.flow_paper.get(r["flow_id"])
        if "tv_id" in r:
            return self.tv_paper.get(r["tv_id"])
        return None

    def split(self, cell: str) -> tuple[str, str]:
        if "." not in cell:
            raise Err(f"bad cell '{cell}' (want <row_id>.<field>)")
        # row ids contain dots (DOI suffixes); the field is the part after the last dot
        row, field = cell.rsplit(".", 1)
        return row, field

    def cell(self, cell: str) -> tuple[str, str, str]:
        row, field = self.split(cell)
        if row not in self.rows:
            raise Err(f"unknown row '{row}'")
        t, r = self.rows[row]
        if field not in r:
            raise Err(f"row '{row}' ({t}) has no field '{field}'")
        if r[field].strip() == "":
            raise Err(f"empty cell '{cell}'")
        return t, r[field], row


def unit_of(name: str) -> str | None:
    for suf in ("nm_min", "um_min"):  # rate units end in _min (V2 n6: rr_nm_min is nm/min, not a minimum)
        if name == suf or name.endswith("_" + suf):
            return suf
    name = re.sub(r"_(max|min)$", "", name)
    for suf in UNIT_SUFFIXES:
        if name == suf or name.endswith("_" + suf):
            return suf
    return None


_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
        ast.Pow: operator.pow, ast.USub: operator.neg, ast.UAdd: operator.pos}
_FUNCS = {"min": min, "max": max, "floor": math.floor, "ceil": math.ceil, "round": round}


def eval_expr(expr: str, names: dict[str, float]) -> float:
    def ev(n: ast.AST) -> float:
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)):
            return float(n.value)
        if isinstance(n, ast.BinOp) and type(n.op) in _OPS:
            return _OPS[type(n.op)](ev(n.left), ev(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in _OPS:
            return _OPS[type(n.op)](ev(n.operand))
        if isinstance(n, ast.Name):
            if n.id not in names:
                raise Err(f"unknown name '{n.id}' in '{expr}'")
            return float(names[n.id])
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in _FUNCS:
            return float(_FUNCS[n.func.id](*[ev(a) for a in n.args]))
        raise Err(f"unsupported expression '{expr}'")

    return ev(ast.parse(str(expr), mode="eval"))


def expr_names(expr: str) -> list[str]:
    """Names of an expression in sorted order (deterministic ref numbering, audit A2 n9)."""
    return sorted({n.id for n in ast.walk(ast.parse(str(expr), mode="eval")) if isinstance(n, ast.Name)} - set(_FUNCS))


def worst(statuses: list[str]) -> str:
    return max(statuses, key=STATUS_ORDER.index) if statuses else "derived"


class Package3D:
    def __init__(self) -> None:
        self.ok = PKG3D.exists()
        self.fams: dict[str, dict] = {}
        if self.ok:
            d = json.loads(PKG3D.read_text(encoding="utf-8"))
            for f in d["families"]:
                self.fams[f["id"]] = f
                for v in f.get("variants") or []:
                    self.fams[f"{f['id']}@{v['variant']}"] = v

    def param(self, spec: str, default_family: str | None) -> dict:
        if not self.ok:
            raise Err("app/static/data/package3d.json missing (run scripts/build_package3d.py)")
        if "." in spec:
            fam, p = spec.split(".", 1)
        else:
            fam, p = default_family or "", spec
        if fam not in self.fams:
            raise Err(f"package3d family '{fam}' not found")
        params = self.fams[fam].get("params") or {}
        if p not in params:
            raise Err(f"package3d param '{fam}.{p}' not found")
        return params[p]


class FlowChecker:
    def __init__(self, path: Path, db: DB, p3d: Package3D, step_cats: set[str]) -> None:
        self.path = path
        self.db = db
        self.p3d = p3d
        self.step_cats = step_cats
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.counts: Counter = Counter()
        self.counts_by_section: dict[str, Counter] = defaultdict(Counter)
        self.pendings: list[tuple[str, str, str]] = []
        self.analogs = 0
        self.cur: str | None = None
        self.step_counts: dict[str, Counter] = defaultdict(Counter)
        self.step_papers: dict[str, set[str]] = defaultdict(set)
        self.geom_cache: dict[str, tuple[str, object]] = {}
        self.geom_stack: list[str] = []
        self.flow = yaml.safe_load(path.read_text(encoding="utf-8"))
        self.fid = self.flow.get("id", path.stem)
        # geometry companion (builder pass): config/process3d/geometry/<id>.yaml adds geometry names
        self.geo_path = GEO_DIR / f"{self.fid}.yaml"
        self.geo: dict = {}
        self.geo_names: set[str] = set()
        if self.geo_path.exists():
            self.geo = yaml.safe_load(self.geo_path.read_text(encoding="utf-8")) or {}
            g = self.flow.setdefault("geometry", {})
            for k, v in (self.geo.get("geometry") or {}).items():
                if k in g:
                    self.errors.append(f"companion geometry '{k}' duplicates a flow geometry name")
                g[k] = v
                self.geo_names.add(k)
        self.family_papers = set(self.flow.get("family_papers") or [])
        for p in self.family_papers:
            if p not in db.rows or db.rows[p][0] != "papers":
                self.errors.append(f"family_papers: unknown paper '{p}'")

    # ---- spec resolution -------------------------------------------------------------------------------------
    def resolve(self, key: str, spec, where: str, scope: set[str] | None, count: bool = True,
                section: str = "") -> tuple[str, object]:
        """Return (status, value). scope = papers allowed for `ref` (None = family_papers only)."""
        try:
            status, value = self._resolve(key, spec, where, scope)
        except Err as e:
            self.errors.append(f"{where}: {e}")
            status, value = "pending", None
        if status == "na" and (section not in NA_SECTIONS):
            self.errors.append(f"{where}: na (not reported) is allowed only for HUD-only values (hud, equipment, "
                               f"targets), not in {section}")
        if count:
            if self.cur:
                self.step_counts[self.cur][status] += 1
                if isinstance(spec, dict):
                    cells = [spec[k] for k in ("ref", "analog") if k in spec] + list(spec.get("refs") or [])
                    for c in cells:
                        pp = self.db.paper_of(str(c).rsplit(".", 1)[0])
                        if pp:
                            self.step_papers[self.cur].add(pp)
                    if "package3d" in spec:
                        self.step_papers[self.cur].add("package3d")
                    if "geom" in spec:
                        self.step_papers[self.cur].add("geometry")
                    if spec.get("source"):
                        self.step_papers[self.cur].add("public (L33)")
            self.counts[status] += 1
            self.counts_by_section[section or "other"][status] += 1
            if isinstance(spec, dict) and "analog" in spec:
                self.analogs += 1
            if status == "pending" and isinstance(spec, dict) and "pending" in spec:
                self.pendings.append((where, key, str(spec["pending"])))
        return status, value

    def ref_scope(self, scope: set[str] | None) -> set[str]:
        """Papers whose cells may be `reported` (audit A1 M11, 2026-10-23). Composite flow: the family papers only
        (a cell of any other build, even the order row of an inserted or expansion step, is an analog). Paper flow:
        its own paper (family_papers) plus the step's own rows."""
        if self.flow.get("kind") == "composite":
            return set(self.family_papers)
        return set(self.family_papers) | (scope or set())

    def _numeric(self, key: str) -> bool:
        return key not in TEXT_KEYS and unit_of(key) is not None

    def _cell_value(self, key: str, spec: dict, cellname: str, where: str) -> object:
        t, raw, row = self.db.cell(cellname)
        field = cellname.rsplit(".", 1)[1]
        if "value" in spec:
            nums = [float(x) for x in NUM_RE.findall(raw)]
            v = float(spec["value"])
            if not any(math.isclose(v, n, rel_tol=1e-9, abs_tol=1e-12) for n in nums):
                raise Err(f"value {spec['value']} not found in text cell {cellname} ('{raw[:80]}')")
            return v * float(spec.get("scale", 1))
        if self._numeric(key):
            try:
                v = float(raw)
            except ValueError:
                raise Err(f"cell {cellname} is not numeric ('{raw[:60]}'); add value: <number quoted in the cell>")
            ku, fu = unit_of(key), unit_of(field)
            if field == "value" and t == "metrics":
                fu = None
            if ku and fu and ku != fu:
                raise Err(f"unit mismatch: key '{key}' ({ku}) vs field '{field}' ({fu}); use derived")
            return v
        return raw

    def _resolve(self, key: str, spec, where: str, scope: set[str] | None) -> tuple[str, object]:
        st, v, _ = self.resolve_full(key, spec, where, scope)
        return st, v

    def resolve_full(self, key: str, spec, where: str, scope: set[str] | None,
                     names: dict[str, float] | None = None, expr_ok: bool = False) -> tuple[str, object, dict]:
        """(status, value, info). info: cells (leaf DB cells), formula, values, note, source, pending, p3d (package3d
        param refs), kind. names: extra expression names (loop variables). expr_ok: a bare string or number is a
        derived expression over geometry names (geometry companions only)."""
        names = dict(names or {})
        if expr_ok and isinstance(spec, (str, int, float)) and not isinstance(spec, bool):
            spec = {"derived": str(spec)}
        if not isinstance(spec, dict):
            raise Err(f"bare value {spec!r} (every value needs a provenance spec)")
        kinds = SPEC_KEYS & set(spec)
        if len(kinds) != 1:
            raise Err(f"spec needs exactly one of {sorted(SPEC_KEYS)}: {spec}")
        kind = kinds.pop()
        info: dict = {"kind": kind, "cells": [], "note": spec.get("note"), "source": spec.get("source")}
        if kind == "pending":
            if not str(spec["pending"]).strip():
                raise Err("empty pending text")
            info["pending"] = str(spec["pending"])
            return "pending", None, info
        if kind == "na":
            if not str(spec["na"]).strip():
                raise Err("empty na text")
            info["na"] = str(spec["na"])
            return "na", None, info
        if kind == "ref":
            cellname = spec["ref"]
            row = self.db.split(cellname)[0]
            paper = self.db.paper_of(row)
            allowed = self.ref_scope(scope)
            if row in self.db.rows and paper not in allowed:
                if self.flow.get("kind") == "composite":
                    raise Err(f"ref {cellname} (paper {paper}) is not a family paper of this composite "
                              f"(family_papers {sorted(allowed)}); a value from another build is an analog")
                raise Err(f"ref {cellname} (paper {paper}) is outside this step's sources {sorted(allowed)}; "
                          f"use analog")
            info["cells"] = [cellname]
            return "reported", self._cell_value(key, spec, cellname, where), info
        if kind == "analog":
            if not spec.get("note"):
                raise Err("analog without note")
            info["cells"] = [spec["analog"]]
            return "template", self._cell_value(key, spec, spec["analog"], where), info
        if kind in ("template", "derived"):
            if kind == "template" and not spec.get("note"):
                raise Err("template without note")
            expr = spec[kind]
            refs = spec.get("refs") or []
            info["cells"] = list(refs)
            statuses = []
            allowed = self.ref_scope(scope)
            for i, c in enumerate(refs):
                _, raw, row = self.db.cell(c)
                statuses.append("reported" if self.db.paper_of(row) in allowed else "template")
                try:
                    names[f"r{i}"] = float(raw)
                except ValueError:
                    if kind == "derived":
                        raise Err(f"derived ref {c} is not numeric")
            if kind == "template" and not (isinstance(expr, str) and self._numeric(key)):
                return "template", expr, info
            used = []
            for n in expr_names(expr):
                if n in names:
                    continue
                st, gv, ginfo = self.geom_full(n, where)
                if st == "na":
                    raise Err(f"input {n} is na (not reported); na values cannot feed a computation")
                statuses.append(st)
                used.append(n)
                if st == "template":
                    info.setdefault("tmpl_inputs", []).append(n)
                info["cells"] += ginfo["cells"]
                for r in ginfo.get("p3d") or []:  # leaf cells of package3d inputs (contract 0.1 / 13.1: refs)
                    if r not in info.setdefault("p3d", []):
                        info["p3d"].append(r)
                if gv is None:
                    info["pending"] = ginfo.get("pending") or f"input {n} pending"
                    return "pending", None, info
                if isinstance(gv, str):
                    raise Err(f"input {n} resolved to text '{gv[:40]}' (give it a unit suffix or a derived spec)")
                names[n] = gv
            v = eval_expr(expr, names)
            info["formula"] = str(expr)
            vals = str(expr)
            for n in sorted(names, key=len, reverse=True):
                vals = re.sub(rf"\b{re.escape(n)}\b", f"{names[n]:g}", vals)
            info["values"] = vals
            if kind == "template":
                return "template", v, info
            if not used and not refs:
                info["note"] = info.get("note") or "datum / constant (no measured input)"
            st = worst(statuses)
            if st == "template" and not info.get("note"):
                info["note"] = "computed from template inputs: " + ", ".join(info.get("tmpl_inputs") or ["refs"])
            return ("derived" if st == "reported" else st), v, info
        if kind == "package3d":
            p = self.p3d.param(str(spec["package3d"]), self.flow.get("package3d"))
            info["p3d"] = list(p.get("refs") or ([p["ref"]] if p.get("ref") else []))
            info["note"] = p.get("note")
            info["formula"] = p.get("formula")
            info["source"] = p.get("source")
            info["param"] = str(spec["package3d"])
            return p["status"], p.get("value"), info
        if kind == "geom":
            return self.geom_full(spec["geom"], where)
        raise Err(f"unknown spec {spec}")

    def geom(self, name: str, where: str) -> tuple[str, object]:
        st, v, _ = self.geom_full(name, where)
        return st, v

    def geom_full(self, name: str, where: str) -> tuple[str, object, dict]:
        if name in self.geom_cache:
            return self.geom_cache[name]
        g = self.flow.get("geometry") or {}
        if name not in g:
            raise Err(f"unknown geometry name '{name}' (in {where})")
        if name in self.geom_stack:
            raise Err(f"circular geometry '{name}'")
        self.geom_stack.append(name)
        try:
            res = self.resolve_full(name, g[name], f"geometry.{name}", None, expr_ok=name in self.geo_names)
        except Err:
            res = ("pending", None, {"cells": [], "pending": f"geometry {name} has an error"})
        finally:
            self.geom_stack.pop()
        self.geom_cache[name] = res
        return res

    # ---- structure -------------------------------------------------------------------------------------------
    def order_scope(self, where: str, *orders: dict) -> set[str]:
        """Papers of the DB rows named by these order blocks (db, evidence, represents)."""
        papers = set()
        for o in orders:
            o = o or {}
            rows = ([o["db"]] if o.get("db") else []) + list(o.get("evidence") or []) + list(o.get("represents") or [])
            for r in rows:
                p = self.db.paper_of(r)
                if p is None:
                    self.errors.append(f"{where}: order row '{r}' not in the DB")
                else:
                    papers.add(p)
        return papers

    def check_block(self, w: str, item: dict, cat: str | None, scope: set[str], need_equipment: bool) -> None:
        """equipment / hud / targets / physics of a step or an op."""
        if "equipment" in item:
            self.resolve("equipment", item["equipment"], f"{w}.equipment", scope, section="equipment")
        elif need_equipment:
            self.errors.append(f"{w}: missing equipment spec (use pending or template when not named)")
        hud = item.get("hud") or {}
        for k, spec in hud.items():
            if k not in HUD_KEYS:
                self.errors.append(f"{w}: unknown HUD key '{k}' (geometry targets go under targets)")
            self.resolve(k, spec, f"{w}.hud.{k}", scope, section="hud")
        for k in REQUIRED_HUD.get(cat or "", []):
            if k not in hud:
                self.errors.append(f"{w}: category {cat} needs HUD key '{k}' (pending allowed)")
        if cat == "molding" and not ({"force_n", "pressure_mpa"} & set(hud)):
            self.errors.append(f"{w}: molding needs force_n or pressure_mpa (pending allowed)")
        for k, spec in (item.get("targets") or {}).items():
            self.resolve(k, spec, f"{w}.targets.{k}", scope, section="targets")
        for k, spec in (item.get("physics") or {}).items():
            self.resolve(k, spec, f"{w}.physics.{k}", scope, section="physics")

    def check_order(self, w: str, o: dict, allowed: tuple[str, ...]) -> None:
        if o.get("kind") not in allowed:
            self.errors.append(f"{w}: order.kind must be one of {allowed}")
        if o.get("kind") in ("backbone", "paper") and not o.get("db"):
            self.errors.append(f"{w}: {o.get('kind')} needs order.db")
        if o.get("kind") in ("inserted", "expansion"):
            if not (o.get("db") or o.get("evidence") or o.get("template")):
                self.errors.append(f"{w}: {o.get('kind')} needs order.db, order.evidence or order.template")
            if not o.get("note"):
                self.errors.append(f"{w}: {o.get('kind')} needs order.note (why here)")
        if o.get("db") and (o["db"] not in self.db.rows or self.db.rows[o["db"]][0] != "process_steps"):
            self.errors.append(f"{w}: order.db '{o['db']}' is not a process_steps row")
        for r in o.get("represents") or []:
            if r not in self.db.rows or self.db.rows[r][0] != "process_steps":
                self.errors.append(f"{w}: order.represents '{r}' is not a process_steps row")

    def check(self) -> None:
        f = self.flow
        for k in ("id", "json_id", "name", "kind", "routes", "steps", "pieces"):
            if k not in f:
                self.errors.append(f"missing top-level key '{k}'")
        if self.errors:
            return
        if f["kind"] not in ("composite", "paper"):
            self.errors.append(f"kind must be composite or paper, not {f['kind']}")
        if "family" not in f or (f["family"] is None and not f.get("family_label")):
            self.errors.append("family (package3d id) or family: null + family_label required")
        routes = f["routes"]
        if sum(1 for r in routes.values() if r.get("default")) != 1:
            self.errors.append("exactly one route needs default: true")
        steps = f["steps"]
        ids = [s.get("id") for s in steps]
        dup = [i for i, c in Counter(ids).items() if c > 1]
        if dup:
            self.errors.append(f"duplicate step ids {dup}")
        groups = f.get("groups") or {}
        pieces = f.get("pieces") or {}
        # geometry, start state, groups
        for name, spec in (f.get("geometry") or {}).items():
            if name in self.geo_names and not isinstance(spec, dict):
                spec = {"derived": str(spec)}
            self.resolve(name, spec, f"geometry.{name}", None, section="geometry")
        for pc, block in (f.get("start") or {}).items():
            if pc not in pieces:
                self.errors.append(f"start: unknown piece '{pc}'")
            scope = self.order_scope(f"start.{pc}", {"evidence": block.get("evidence")})
            for k, spec in (block.get("values") or {}).items():
                self.resolve(k, spec, f"start.{pc}.{k}", scope, section="start")
        for gid, g in groups.items():
            src = g.get("order_source")
            if src and (src not in self.db.rows or self.db.rows[src][0] != "process_flows"):
                self.errors.append(f"group {gid}: order_source '{src}' is not a process_flows row")
            if "repeat" in g:
                scope = {self.db.paper_of(src)} if src and src in self.db.rows else set()
                self.resolve("repeat_n", g["repeat"], f"groups.{gid}.repeat", scope, section="groups")
        # steps and ops
        for s in steps:
            sid = s.get("id")
            self.cur = sid
            w = f"step {sid}"
            for k in ("name", "category", "order", "piece"):
                if k not in s:
                    self.errors.append(f"{w}: missing '{k}'")
            cat = s.get("category")
            if cat not in self.step_cats:
                self.errors.append(f"{w}: category '{cat}' not in schema step_category")
            if s.get("piece") and s["piece"] not in pieces:
                self.errors.append(f"{w}: unknown piece '{s['piece']}'")
            for r in s.get("routes") or []:
                if r not in routes:
                    self.errors.append(f"{w}: unknown route '{r}'")
            o = s.get("order") or {}
            self.check_order(w, o, ("backbone", "paper", "inserted"))
            if o.get("kind") in ("backbone", "paper") and o.get("db") in self.db.rows:
                dbcat = self.db.rows[o["db"]][1]["category"]
                if dbcat != cat:
                    self.errors.append(f"{w}: category {cat} differs from the DB row ({dbcat}); steps keep the DB "
                                       f"category (put the operation type on an op)")
            scope = self.order_scope(w, o)
            ops = s.get("ops") or []
            self.check_block(w, s, None if ops else cat, scope, need_equipment=not ops)
            op_ids = [op.get("id") for op in ops]
            if len(op_ids) != len(set(op_ids)):
                self.errors.append(f"{w}: duplicate op ids")
            for op in ops:
                ow = f"{w}.op {op.get('id')}"
                for k in ("id", "name", "category", "order"):
                    if k not in op:
                        self.errors.append(f"{ow}: missing '{k}'")
                ocat = op.get("category")
                if ocat not in self.step_cats:
                    self.errors.append(f"{ow}: category '{ocat}' not in schema step_category")
                if op.get("group") and op["group"] not in groups:
                    self.errors.append(f"{ow}: unknown group '{op['group']}'")
                oo = op.get("order") or {}
                self.check_order(ow, oo, ("self", "expansion"))
                if oo.get("kind") == "self" and o.get("kind") not in ("backbone", "paper", "inserted"):
                    self.errors.append(f"{ow}: kind self needs a step with a DB row")
                oscope = scope | self.order_scope(ow, oo)
                self.check_block(ow, op, ocat, oscope, need_equipment=True)
        self.cur = None
        # routes: filter of the flow order
        for rid, r in routes.items():
            rsteps = [s for s in steps if not s.get("routes") or rid in s["routes"]]
            if not rsteps:
                self.errors.append(f"route {rid}: no steps")
            for fl in r.get("backbones") or []:
                self.check_db_order(rid, rsteps, fl, exact=f["kind"] == "paper")
        if f["kind"] == "paper" and not all(r.get("backbones") for r in routes.values()):
            self.errors.append("paper flow: every route needs backbones: [<the paper flow>]")
        # text hygiene
        txt = self.path.read_text(encoding="utf-8")
        bad = sorted({ch for ch in txt if ord(ch) > 126})
        if bad:
            self.errors.append(f"non-ASCII characters in file: {bad[:10]}")
        if re.search(r"/Users/|C:\\\\", txt):
            self.errors.append("absolute local path in file")

    def check_db_order(self, rid: str, rsteps: list[dict], flow_id: str, exact: bool) -> None:
        """Every DB step of the backbone flow appears in the route, once, in DB (route, seq) order."""
        dbs = self.db.flow_steps.get(flow_id)
        if not dbs:
            self.errors.append(f"route {rid}: backbone flow {flow_id} has no DB steps")
            return
        seq = {r["step_id"]: (r["route"], int(r["seq"])) for r in dbs}
        mine: list[str] = []
        others = 0
        for s in rsteps:
            o = s.get("order") or {}
            cand = ([o["db"]] if o.get("kind") in ("backbone", "paper") and o.get("db") in seq else [])
            cand += [x for x in (o.get("represents") or []) if x in seq]
            if not cand:
                others += 1
            mine += cand
        if sorted(set(mine)) != sorted(seq):
            self.errors.append(f"route {rid}: backbone {flow_id} steps missing {sorted(set(seq) - set(mine))}")
        if len(mine) != len(set(mine)):
            self.errors.append(f"route {rid}: a step of backbone {flow_id} appears twice")
        keys = [seq[m] for m in mine]
        if keys != sorted(keys):
            self.errors.append(f"route {rid}: backbone {flow_id} order differs from the DB (route, seq)")
        if exact and others:
            self.errors.append(f"route {rid}: paper flow has {others} steps that are not DB steps of {flow_id}")


def schema_step_categories() -> set[str]:
    s = yaml.safe_load(SCHEMA.read_text(encoding="utf-8"))
    return set(s["enums"]["step_category"])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--flow", help="check only this flow id")
    ap.add_argument("--pending", action="store_true", help="list every pending spec")
    ap.add_argument("--verbose", action="store_true", help="print warnings and per-section counts")
    ap.add_argument("--table", action="store_true", help="print a markdown table per flow (COMPOSITION.md)")
    a = ap.parse_args()
    db = DB()
    p3d = Package3D()
    cats = schema_step_categories()
    paths = sorted(FLOW_DIR.glob("*.yaml"))
    if not paths:
        print(f"no flow files in {FLOW_DIR.relative_to(ROOT)}")
        return 1
    n_err = 0
    print(f"{'flow':<14} {'steps':>5} {'ops':>4} {'routes':>6} {'reported':>8} {'derived':>7} {'template':>8} "
          f"{'(analog)':>8} {'na':>4} {'pending':>7} {'errors':>6}")
    for p in paths:
        fc = FlowChecker(p, db, p3d, cats)
        if a.flow and fc.fid != a.flow:
            continue
        fc.check()
        c = fc.counts
        nops = sum(len(st.get("ops") or []) for st in fc.flow.get("steps") or [])
        print(f"{fc.fid:<14} {len(fc.flow.get('steps') or []):>5} {nops:>4} {len(fc.flow.get('routes') or {}):>6} "
              f"{c['reported']:>8} {c['derived']:>7} {c['template']:>8} {fc.analogs:>8} {c['na']:>4} {c['pending']:>7} "
              f"{len(fc.errors):>6}")
        if a.verbose:
            for sec, cc in sorted(fc.counts_by_section.items()):
                print(f"    {sec:<10} " + " ".join(f"{k}={cc[k]}" for k in STATUS_ORDER))
            for r in fc.flow.get("routes") or {}:
                n = sum(1 for st in fc.flow.get("steps") or [] if not st.get("routes") or r in st["routes"])
                print(f"    route {r}: {n} steps")
        for e in fc.errors:
            print(f"  ERROR {e}")
        if a.verbose:
            for wmsg in fc.warnings:
                print(f"  warn  {wmsg}")
        if a.table:
            print(f"\n| # | step | routes | order source | value sources | rep / der / tpl / pend |")
            print("|---|---|---|---|---|---|")
            for i, st in enumerate(fc.flow.get("steps") or [], 1):
                o = st.get("order") or {}
                src = f"{o.get('kind')}: `{o.get('db') or ', '.join(o.get('evidence') or [])}`"
                if o.get("represents"):
                    src += " (+ `" + "`, `".join(o["represents"]) + "`)"
                ops = st.get("ops") or []
                if ops:
                    osrc = sorted({x.rsplit("-s", 1)[0] for op in ops if (x := (op.get("order") or {}).get("db"))})
                    src += f"; {len(ops)} ops" + (" (sub-step order / values: " + ", ".join(f"`{x}`" for x in osrc)
                                                  + ")" if osrc else "")
                cc = fc.step_counts[st["id"]]
                vs = ", ".join(sorted(fc.step_papers[st["id"]])) or "-"
                rts = ", ".join(st.get("routes") or []) or "all"
                print(f"| {i} | {st['id']}: {st.get('name')} | {rts} | {src} | {vs} | "
                      f"{cc['reported']} / {cc['derived']} / {cc['template']} / {cc['pending']} |")
        if a.pending:
            for where, key, txt in fc.pendings:
                print(f"  pending {where}: {txt}")
        n_err += len(fc.errors)
    return 1 if n_err else 0


if __name__ == "__main__":
    sys.exit(main())
