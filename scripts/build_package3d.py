#!/usr/bin/env python3
"""Build the 3D package view data (app/static/data/package3d.json) from family templates.

Inputs: config/package3d/<family>.yaml (one file per packaging family; families.yaml, RESEARCH.md and any YAML
without a `parts` list are skipped) and the extraction database data/*.csv. Output: the package3d.json contract
(DevLog-008, v1 plus the documented additions). Format reference: config/package3d/TEMPLATE_FORMAT.md.

Template format (summary; the .md file is the full reference)
  id, name, company, package_class, summary ("{param}" placeholders), backbone_tv, family_match (which TVs may
  supply reported/derived values: a case-insensitive regex on technology_name, or a rule dict {tn, cls, cls_only,
  papers, tvs, ic_level, excl, excl_papers, excl_tvs}, or {families: true} = the match_rule of families.yaml).
  params:   name -> dimension spec. Units come from the name suffix: _mm, _um, _n (count); other names are
            unitless or text.
  parts:    boxes. Stacking is computed, never hand-placed: `base: true` (z = 0), `on: <part>` (+ `standoff:
            <array>` or `gap_um`), `in: <part>` (embedded; top at parent top minus `depth_um`), `under: <part>`;
            `fill: {above, parts, margin_mm}` (underfill between `above` and the parts on it) or `fill: {per,
            margin_mm}` (one fill under every instance of a stacked part); `repeat: {nx, ny, pitch_x_mm,
            pitch_y_mm, nz, pitch_um | stack: true}` (centered grid, vertical repeat); `shape: frame` +
            `frame_w_mm` (ring as 4 boxes).
  layers:   groups {id?, part, repeat, pattern: [layer, ...]} stacked downward from the part's top surface.
  arrays:   interconnect fields: `per: <part>` (one per instance), `upper`/`lower` (gap between), `in: <part>`,
            `in_layer: <layer group or layer id>`, `under: <part>`, or `span: ["top:<part>", "top:<part>"]`;
            `region` = footprint (default) or {part}, {intersect: [...]}, {subtract: [...]}, or explicit
            {x_mm, y_mm, w_mm, d_mm}; optional `repeat: {nz, pitch_um | stack: true}`.
  callouts: {target, text (<= 6 words) and note (tooltip) with "{param}" placeholders, refs: ["<row>.<field>"]}.
  insets:   {id, label, box_mm: [x0, y0, x1, y1] (view framing), z: ["bottom:<part|array>", "top:<part|array>"],
            view}.
  modules / use: named reusable blocks {params, parts, layers, arrays, callouts, routing}; `use: [{module, from?,
            drop?, rename?}]` merges them, the template winning on params, ids and layer hosts.
  routing:  layer `route: {use, dir, line_um, space_um, matrix, fill?, regions?}` on conductor layers (`regions`:
            per-region level properties [{region, use?, dir?, line_um?, space_um?, fill?, note?}]); family `routing:
            {layout_note, vias: [{id, kind, through, diameter_um, ...}], nets: [{id, kind, from, to?, share, ...}]}`
            (DevLog-011). Net `share` / `length_um` may be bare numbers (template dims noted with layout_note).

Dimension specs (no silent numbers: a bare number is rejected)
  {ref: "<row_id>.<field>"}                      reported: one database cell (exact um <-> mm conversion only)
  {derived: "<expr>", refs: [cells]}             derived: arithmetic on params and r0, r1, ... (= refs[i])
  "<expr>"                                       shorthand derived over params (a bare name reuses the param)
  {template: <number or expr>, note, source?, refs?}   template: not reported in this family; note required
  {analog: "<row_id>.<field>", note}             template whose value is that cell of another family's row
  Any result computed from a template input is a template value (status never upgrades).

Usage: uv run python scripts/build_package3d.py [--check] [--out PATH]
"""

from __future__ import annotations

import argparse
import ast
import copy
import csv
import datetime as dt
import json
import math
import operator
import re
import sys
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CONFIG = ROOT / "config" / "package3d"
DEFAULT_OUT = ROOT / "app" / "static" / "data" / "package3d.json"
SCHEMA = yaml.safe_load((DATA / "schema" / "packaging.schema.yaml").read_text())
BASIS_ENUM = set(SCHEMA["enums"]["basis"])
SOURCE_ENUM = set(SCHEMA["enums"]["source"])
TABLE_KEYS = {name: spec["key"] for name, spec in SCHEMA["tables"].items()}
SKIP_FILES = {"families.yaml", "families.yml"}

PART_KINDS = {"die", "hbm", "bridge", "interposer", "substrate", "mold", "underfill", "lid", "tim", "stiffener",
              "ipd", "other"}
ARRAY_KINDS = {"c4", "microbump", "cu_pillar", "hybrid_bond", "tsv", "tgv", "bga", "rdl_via", "pth"}
MATERIALS = {"silicon", "organic_laminate", "organic_build_up", "polymer_dielectric", "copper", "solder",
             "underfill", "stainless_steel", "mold_compound", "tim", "glass", "oxide", "other"}
CALLOUT_MAX_WORDS = 6
PART_REPEAT_KEYS = {"nx", "ny", "pitch_x_mm", "pitch_y_mm", "nz", "pitch_um", "stack"}
# multi-grid repeat (L28, 2026-10-21): `repeat: [{nx, ny, pitch_x_mm, pitch_y_mm, x_mm, y_mm}, ...]`, one centered grid
# per entry, offset (x_mm, y_mm) from the part center; instances numbered grid by grid, row-major from +y
GRID_KEYS = ("nx", "ny", "pitch_x_mm", "pitch_y_mm", "x_mm", "y_mm")
# variants (L28, 2026-10-21): `variants: {base: {id, name, note?}, default, list: [{id, name, ...overlay}]}`
VARIANTS_KEYS = {"base", "default", "list"}
VARIANT_KEYS = {"id", "name", "note", "source", "summary", "backbone_tv", "drop", "callouts_drop", "params", "parts",
                "arrays", "layers", "callouts", "insets", "routing"}
VARIANT_ID = re.compile(r"[a-z][a-z0-9_]*")
MATCH_LIST_KEYS = ("cls", "cls_only", "papers", "tvs", "ic_level", "excl_papers", "excl_tvs")
MATCH_RE_KEYS = ("tn", "excl")
FAMILIES_RULE_KEYS = "tn|cls|cls_only|papers|ic_level|excl|excl_papers"
# routing (DevLog-011): layer `route` and family `routing`
ROUTE_KEYS = {"use", "dir", "line_um", "space_um", "matrix", "fill", "regions"}
# per-region level properties (L18, 2026-10-21): `route.regions: [{region, use?, dir?, line_um?, space_um?, fill?, note?}]`
ROUTE_REGION_KEYS = {"region", "use", "dir", "line_um", "space_um", "fill", "note"}
ROUTE_USES = {"signal", "plane", "pad", "mixed"}
ROUTE_LS_USES = {"signal", "mixed"}  # uses that need line/space and a direction
ROUTE_DIRS = {"x", "y", "alt"}
ROUTE_FILL_DEFAULT = {"plane": 0.85, "pad": 0.5}
ROUTING_KEYS = {"layout_note", "vias", "nets"}
VIA_KINDS = {"microvia", "rdl_via", "beol_via", "pth", "tsv", "tgv", "tdv", "bridge_via", "tmv"}
VIA_KEYS = {"id", "name", "kind", "through", "diameter_um", "bottom_diameter_um", "land_um", "pitch_um", "fill", "plug",
            "region", "cluster",
            "wall_um", "liner_um", "note"}
VIA_DIMS = ("diameter_um", "bottom_diameter_um", "land_um", "pitch_um", "wall_um", "liner_um")
VIA_FILLS = {"filled", "conformal", "plugged"}
VIA_PLUGS = {"resin", "copper", "none"}  # core material of a plugged / conformal via (text, not a dim)
REGION_KEYS = {"part", "intersect", "subtract", "x_mm", "y_mm", "w_mm", "d_mm"}
# optional array dims (2026-10-20): landing pad / UBM and SR / passivation opening diameters, solder cap height
ARRAY_PAD_DIMS = ("pad_um", "opening_um", "cap_h_um")
CLUSTER_KEYS = {"n", "pitch_um"}
NET_KINDS = {"vertical", "lateral", "plane_tie", "escape"}
NET_KEYS = {"id", "kind", "from", "to", "style", "jog", "levels", "plane", "share", "length_um", "note"}
NET_STYLES = {"stacked", "staggered"}

CONVENTIONS = {
    "xy": "x_mm/y_mm are the footprint CENTER; the package is centered at x = y = 0; w along x, d along y",
    "z": "z_um is the BOTTOM of a solid; z = 0 at the lowest point of the model (bottom of the lowest array or part)",
    "box_mm": "inset box_mm = [x0, y0, x1, y1] corners in mm",
    "status": "reported = database cell of this family; derived = arithmetic on reported values; template = not "
              "reported in this family (illustrative, with note and optional analog refs)",
}


class TemplateError(Exception):
    pass


# ----------------------------------------------------------------------------- database


def read_csv(name: str) -> list[dict[str, str]]:
    path = DATA / f"{name}.csv"
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as fh:
        return [dict(r) for r in csv.DictReader(fh)]


def split_pairs(v: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for item in (v or "").split(";"):
        if ":" in item:
            k, val = item.split(":", 1)
            out.setdefault(k.strip(), []).append(val.strip())
    return out


class DB:
    def __init__(self) -> None:
        self.rows: dict[str, tuple[str, dict[str, str]]] = {}
        for table, key in TABLE_KEYS.items():
            for r in read_csv(table):
                rid = r.get(key, "")
                if rid:
                    self.rows.setdefault(rid, (table, r))
        self.papers = {r["paper_id"]: r for r in read_csv("papers")}
        self.tvs = {r["tv_id"]: r for r in read_csv("test_vehicles")}
        # schema v2.4: shared process_steps hang off a flow (tv_id empty); the flow names its paper and TVs
        self.flows = {r["flow_id"]: r for r in read_csv("process_flows")} if (DATA / "process_flows.csv").exists() else {}
        self.levels: dict[str, set[str]] = {}  # tv_id -> interconnect levels (families.yaml `ic_level` rule)
        for r in read_csv("interconnects"):
            if r.get("tv_id") and r.get("level"):
                self.levels.setdefault(r["tv_id"], set()).add(r["level"])

    def cell(self, key: str) -> tuple[str, str, dict[str, str]]:
        """'<row_id>.<field>' -> (raw value, table, row). Errors on a missing row, field or empty cell."""
        if "." not in key:
            raise TemplateError(f"bad cell reference {key!r} (want <row_id>.<field>)")
        rid, fld = key.rsplit(".", 1)
        if rid not in self.rows:
            raise TemplateError(f"row not found: {rid!r} (from {key!r})")
        table, row = self.rows[rid]
        if fld not in row:
            raise TemplateError(f"field {fld!r} not in table {table} (from {key!r})")
        raw = (row.get(fld) or "").strip()
        if raw == "":
            raise TemplateError(f"empty cell: {key!r} (table {table})")
        return raw, table, row

    def tv_of(self, table: str, row: dict[str, str]) -> dict[str, str] | None:
        if table == "test_vehicles":
            return row
        tv_id = row.get("tv_id")
        return self.tvs.get(tv_id) if tv_id else None


def field_unit(fld: str, row: dict[str, str]) -> str | None:
    if fld.endswith("_um"):
        return "um"
    if fld.endswith("_mm"):
        return "mm"
    if fld in {"count", "repeat", "n_dies", "n_hbm"}:
        return "n"
    if fld == "value" and row.get("unit") in {"um", "mm"}:
        return row["unit"]
    return None


def name_unit(name: str) -> str | None:
    for suf, unit in (("_mm", "mm"), ("_um", "um"), ("_n", "n")):
        if name.endswith(suf):
            return unit
    if name in {"nx", "ny", "nz"}:
        return "n"
    return None


def convert(v: float, src: str | None, dst: str | None, where: str) -> tuple[float, str]:
    if src == dst or src is None or dst is None or (src == "n" and dst == "n"):
        return v, ""
    if (src, dst) == ("um", "mm"):
        return v / 1000.0, "um->mm"
    if (src, dst) == ("mm", "um"):
        return v * 1000.0, "mm->um"
    raise TemplateError(f"{where}: no exact conversion {src} -> {dst}")


def fmt(v: Any) -> str:
    if isinstance(v, str):
        return v
    if float(v).is_integer():
        return str(int(v))
    return f"{v:.4f}".rstrip("0").rstrip(".")


def rnd(v: float) -> float | int:
    r = round(float(v), 4)
    return int(r) if float(r).is_integer() else r


# ----------------------------------------------------------------------------- values and expressions


@dataclass
class Val:
    value: Any
    unit: str | None
    status: str  # reported | derived | template
    cells: list[str] = field(default_factory=list)  # leaf database cells ("row.field")
    note: str = ""
    source: str = ""
    formula: str = ""
    values: str = ""
    conv: str = ""
    inputs: list[str] = field(default_factory=list)  # param names used
    template_inputs: list[str] = field(default_factory=list)

    def num(self, where: str) -> float:
        if not isinstance(self.value, (int, float)):
            raise TemplateError(f"{where}: value {self.value!r} is not numeric")
        return float(self.value)


OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
       ast.Pow: operator.pow}
FUNCS = {"min": min, "max": max, "floor": math.floor, "ceil": math.ceil}
IDENT = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")


def eval_expr(expr: str, lookup: Any, where: str) -> tuple[float, list[str]]:
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as e:
        raise TemplateError(f"{where}: bad expression {expr!r}: {e}") from None
    used: list[str] = []

    def ev(n: ast.AST) -> float:
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float)) and not isinstance(n.value, bool):
            return float(n.value)
        if isinstance(n, ast.Name):
            used.append(n.id)
            return float(lookup(n.id))
        if isinstance(n, ast.BinOp) and type(n.op) in OPS:
            return OPS[type(n.op)](ev(n.left), ev(n.right))
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.USub, ast.UAdd)):
            return -ev(n.operand) if isinstance(n.op, ast.USub) else ev(n.operand)
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in FUNCS and not n.keywords:
            return float(FUNCS[n.func.id](*[ev(a) for a in n.args]))
        raise TemplateError(f"{where}: unsupported syntax in {expr!r}")

    return ev(tree), used


def parse_families_rule(rule: str, where: str) -> dict:
    """families.yaml `match_rule` string ("tn=...; cls=[...]; papers=[...]") -> rule dict."""
    out: dict[str, Any] = {}
    for part in re.split(rf"; (?=(?:{FAMILIES_RULE_KEYS})=)", rule.strip()):
        if "=" not in part:
            raise TemplateError(f"{where}: cannot parse match_rule part {part!r}")
        k, v = part.split("=", 1)
        k = k.strip()
        if k in MATCH_RE_KEYS:
            out[k] = v
        else:
            try:
                out[k] = list(ast.literal_eval(v))
            except (ValueError, SyntaxError):
                raise TemplateError(f"{where}: bad list in match_rule {k}={v!r}") from None
    return out


class Matcher:
    """Which TVs may supply reported/derived values of a family (families.yaml semantics, case-insensitive).

    A TV matches when it is in `tvs`, or when any inclusion holds - `tn` regex on technology_name, package_class
    in `cls_only`, paper in `papers` (and package_class in `cls` when `cls` is given), an interconnect level in
    `ic_level` - and no exclusion holds: `excl` regex on technology_name + paper title, paper in `excl_papers`.
    `excl_tvs` removes a TV in every case. A row without a TV is tested on its paper (tn on the paper's
    technology_name, `papers`, `excl_papers`).
    """

    def __init__(self, spec: Any, fid: str, rules: dict[str, str], where: str) -> None:
        if isinstance(spec, str):
            spec = {"tn": spec}
        if not isinstance(spec, dict):
            raise TemplateError(f"{where}: family_match must be a regex string or a rule dict")
        spec = dict(spec)
        rule: dict[str, Any] = {}
        fam = spec.pop("families", None)
        if fam:
            fam_id = fid if fam is True else str(fam)
            if fam_id not in rules:
                raise TemplateError(f"{where}: no families.yaml match_rule for {fam_id!r}")
            rule = parse_families_rule(rules[fam_id], f"{where} (families.yaml {fam_id})")
        bad = set(spec) - set(MATCH_LIST_KEYS) - set(MATCH_RE_KEYS)
        if bad:
            raise TemplateError(f"{where}: unknown family_match keys {sorted(bad)}")
        for k, v in spec.items():  # template keys extend the families.yaml rule
            if k in MATCH_RE_KEYS:
                rule[k] = f"(?:{rule[k]})|(?:{v})" if rule.get(k) else str(v)
            else:
                if not isinstance(v, list):
                    raise TemplateError(f"{where}: family_match.{k} must be a list")
                rule[k] = list(dict.fromkeys(list(rule.get(k, [])) + [str(x) for x in v]))
        self.rule = rule
        try:
            self.tn = re.compile(rule["tn"], re.IGNORECASE) if rule.get("tn") else None
            self.excl = re.compile(rule["excl"], re.IGNORECASE) if rule.get("excl") else None
        except re.error as e:
            raise TemplateError(f"{where}: bad family_match regex: {e}") from None
        self.sets = {k: set(rule.get(k, [])) for k in MATCH_LIST_KEYS}

    def tv_ok(self, tv: dict[str, str], db: DB) -> bool:
        s = self.sets
        tid, pid, cls = tv.get("tv_id", ""), tv.get("paper_id", ""), tv.get("package_class", "")
        tn = tv.get("technology_name", "") or ""
        if tid in s["excl_tvs"]:
            return False
        if tid in s["tvs"]:
            return True
        inc = bool(self.tn and self.tn.search(tn)) or cls in s["cls_only"] or (
            pid in s["papers"] and (not s["cls"] or cls in s["cls"])) or bool(db.levels.get(tid, set()) & s["ic_level"])
        if not inc:
            return False
        title = db.papers.get(pid, {}).get("title", "")
        if self.excl and self.excl.search(f"{tn} {title}"):
            return False
        return pid not in s["excl_papers"]

    def paper_ok(self, pid: str, db: DB) -> bool:
        tn = db.papers.get(pid, {}).get("technology_name", "") or ""
        if pid in self.sets["excl_papers"]:
            return False
        return bool(self.tn and self.tn.search(tn)) or pid in self.sets["papers"]


class Family:
    """Resolution context for one template."""

    def __init__(self, tpl: dict, db: DB, path: Path, rules: dict[str, str] | None = None) -> None:
        self.tpl = tpl
        self.db = db
        self.path = path
        self.fid = tpl.get("id") or path.stem
        self.params_spec: dict[str, Any] = tpl.get("params") or {}
        self.params: dict[str, Val] = {}
        self._resolving: set[str] = set()
        self.warnings: list[str] = []
        self.match = (Matcher(tpl["family_match"], self.fid, rules or {}, f"{path.name}: family_match")
                      if tpl.get("family_match") else None)

    # -- cells
    def cell_val(self, key: str, unit: str | None, where: str, *, in_family: bool) -> Val:
        raw, table, row = self.db.cell(key)
        fld = key.rsplit(".", 1)[1]
        if in_family:
            self.check_family(key, table, row, where)
        src_unit = field_unit(fld, row)
        try:
            v: Any = float(raw)
        except ValueError:
            return Val(raw, None, "reported", [key])
        v, conv = convert(v, src_unit, unit, where)
        return Val(v, unit or src_unit, "reported", [key], conv=conv)

    def check_family(self, key: str, table: str, row: dict[str, str], where: str) -> None:
        if not self.match:
            return
        tv = self.db.tv_of(table, row)
        flow = self.db.flows.get(row.get("flow_id", "")) if table == "process_steps" and not tv else None
        if flow:  # shared step (or v2.5 multi-TV delta): in family if any of its TVs matches, else by the flow's paper
            ids = (row.get("tv_id") or "").split(";") if ";" in (row.get("tv_id") or "") else (flow.get("tv_ids") or "").split(";")
            tvs = [self.db.tvs[t.strip()] for t in ids if t.strip() in self.db.tvs]
            ok = any(self.match.tv_ok(t, self.db) for t in tvs) or (not tvs and self.match.paper_ok(flow["paper_id"], self.db))
            who = f"flow {flow['flow_id']} (TVs {flow.get('tv_ids', '')})"
        elif tv:
            ok = self.match.tv_ok(tv, self.db)
            who = (f"TV {tv.get('tv_id')} (technology_name {tv.get('technology_name', '')!r}, package_class "
                   f"{tv.get('package_class', '')!r})")
        else:
            pid = row.get("paper_id", "")
            ok = self.match.paper_ok(pid, self.db)
            who = f"paper {pid}"
        if not ok:
            raise TemplateError(f"{where}: {key} is not a {self.fid} row ({who}); reported and derived values "
                                f"must come from this family; use `analog:` for other families")

    # -- params
    def param(self, name: str) -> Val:
        if name in self.params:
            return self.params[name]
        if name not in self.params_spec:
            raise TemplateError(f"{self.fid}: unknown param {name!r}")
        if name in self._resolving:
            raise TemplateError(f"{self.fid}: circular param {name!r}")
        self._resolving.add(name)
        v = self.resolve(self.params_spec[name], name_unit(name), f"params.{name}", is_param=True)
        self._resolving.discard(name)
        self.params[name] = v
        return v

    # -- specs
    def resolve(self, spec: Any, unit: str | None, where: str, *, is_param: bool = False) -> Val:
        if isinstance(spec, bool) or isinstance(spec, (int, float)):
            raise TemplateError(f"{where}: bare number {spec!r} (no silent numbers: use ref/derived/template)")
        if isinstance(spec, str):
            return self.expr_val(spec, [], unit, where, forced_template=False, note="")
        if not isinstance(spec, dict):
            raise TemplateError(f"{where}: bad spec {spec!r}")
        kinds = [k for k in ("ref", "derived", "template", "analog") if k in spec]
        if len(kinds) != 1:
            raise TemplateError(f"{where}: spec needs exactly one of ref/derived/template/analog: {spec!r}")
        kind = kinds[0]
        note = str(spec.get("note", "")).strip()
        source = str(spec.get("source", "")).strip()
        refs = spec.get("refs") or []
        if kind == "ref":
            v = self.cell_val(spec["ref"], unit, where, in_family=True)
            if note:
                v = replace(v, note=note)
            return v
        if kind == "derived":
            return self.expr_val(str(spec["derived"]), refs, unit, where, forced_template=False, note=note)
        if not note:
            raise TemplateError(f"{where}: template value without a `note` rationale")
        if kind == "analog":
            v = self.cell_val(spec["analog"], unit, where, in_family=False)
            extra = [c for r in refs for c in self.cell_val(r, None, where, in_family=False).cells]
            return replace(v, status="template", note=note, source=source, cells=v.cells + extra)
        t = spec["template"]
        if isinstance(t, bool):
            raise TemplateError(f"{where}: bad template value {t!r}")
        if isinstance(t, (int, float)):
            cells = [c for r in refs for c in self.cell_val(r, None, where, in_family=False).cells]
            return Val(float(t), unit, "template", cells, note=note, source=source)
        if isinstance(t, str) and re.fullmatch(r"[A-Za-z0-9 ,.\-]+", t) and not IDENT.search(t):
            return Val(t, None, "template", [], note=note, source=source)
        v = self.expr_val(str(t), refs, unit, where, forced_template=True, note=note)
        return replace(v, source=source)

    def expr_val(self, expr: str, refs: list[str], unit: str | None, where: str, *, forced_template: bool,
                 note: str) -> Val:
        expr = expr.strip()
        if expr in self.params_spec and not refs:  # bare param reuse
            p = self.param(expr)
            if isinstance(p.value, str):
                return replace(p, inputs=[expr])
            v, conv = convert(p.num(where), p.unit, unit, where)
            out = replace(p, value=v, unit=unit or p.unit, conv=conv or p.conv, inputs=[expr])
            if forced_template:
                out = replace(out, status="template", note=note or p.note)
            elif note:
                out = replace(out, note=note)
            return out
        ref_vals: dict[str, Val] = {}
        for i, r in enumerate(refs):
            ref_vals[f"r{i}"] = self.cell_val(r, None, where, in_family=not forced_template)

        def lookup(name: str) -> float:
            if name in ref_vals:
                return ref_vals[name].num(where)
            return self.param(name).num(f"{where} ({name})")

        value, used = eval_expr(expr, lookup, where)
        if not math.isfinite(value):
            raise TemplateError(f"{where}: non-finite result of {expr!r}")
        inputs = [u for u in dict.fromkeys(used) if u not in ref_vals]
        cells: list[str] = []
        statuses = []
        tmpl_inputs = []
        for u in dict.fromkeys(used):
            v = ref_vals[u] if u in ref_vals else self.param(u)
            cells += v.cells
            statuses.append(v.status)
            if v.status == "template":
                tmpl_inputs.append(u)
        for rv in ref_vals.values():  # supporting cells listed in refs stay traceable even if not in the formula
            cells += rv.cells
        status = "template" if forced_template or "template" in statuses else "derived"
        if status == "template" and not note:
            note = "computed from template inputs: " + ", ".join(tmpl_inputs)
        values = IDENT.sub(lambda m: m.group(0) if m.group(0) in FUNCS else fmt(lookup(m.group(0))), expr)
        return Val(value, unit, status, list(dict.fromkeys(cells)), note=note, formula=expr, values=values,
                   inputs=inputs, template_inputs=tmpl_inputs)


# ----------------------------------------------------------------------------- refs table


class Refs:
    def __init__(self, db: DB) -> None:
        self.db = db
        self.ids: dict[str, str] = {}
        self.table: dict[str, dict] = {}

    def rid(self, key: str) -> str:
        if key in self.ids:
            return self.ids[key]
        raw, table, row = self.db.cell(key)
        rid_, fld = key.rsplit(".", 1)
        tv = self.db.tv_of(table, row)
        pid = row.get("paper_id") or (tv or {}).get("paper_id", "")
        if not pid and row.get("flow_id"):  # process_steps rows without a TV: the paper of their flow
            pid = self.db.flows.get(row["flow_id"], {}).get("paper_id", "")
        paper = self.db.papers.get(pid, {})
        ov = split_pairs(row.get("overrides", ""))
        basis = next((x for x in ov.get(fld, []) if x in BASIS_ENUM), row.get("basis", ""))
        source = next((x for x in ov.get(fld, []) if x in SOURCE_ENUM), row.get("source", ""))
        qual = split_pairs(row.get("qualifiers", "")).get(fld, [])
        entry = {
            "paper_id": pid, "doi": paper.get("doi", ""), "title": paper.get("title", ""),
            "year": int(paper["year"]) if paper.get("year", "").isdigit() else paper.get("year", ""),
            "table": table, "row_id": rid_, "field": fld, "locator": row.get("locator", ""), "basis": basis,
            "source": source, "value": raw, "unit": field_unit(fld, row) or row.get("unit", "") or "",
            "tv_id": (tv or {}).get("tv_id", ""), "technology_name": (tv or {}).get("technology_name", ""),
        }
        if qual:
            entry["qualifier"] = ";".join(qual)
        entry = {k: v for k, v in entry.items() if v not in ("", None)}
        r = f"R{len(self.ids) + 1}"
        self.ids[key] = r
        self.table[r] = entry
        return r


def dim_json(v: Val, refs: Refs) -> dict:
    out: dict[str, Any] = {"status": v.status, "value": rnd(v.value) if not isinstance(v.value, str) else v.value}
    if v.status == "reported":
        out["ref"] = refs.rid(v.cells[0])
        if v.conv:
            out["conv"] = v.conv
        if v.note:
            out["note"] = v.note
        return out
    if v.formula:
        out["formula"] = v.formula
        out["values"] = v.values
    if v.cells:
        out["refs"] = [refs.rid(c) for c in v.cells]
    if v.inputs:
        out["inputs"] = v.inputs
    if v.note:
        out["note"] = v.note
    if v.source:
        out["source"] = v.source
    if v.conv:
        out["conv"] = v.conv
    return out


def fill_from_ls(line: Val, space: Val, where: str) -> Val:
    """Default Cu fill of a signal / mixed route = line / (line + space): derived from reported L/S, template if
    either input is a template value."""
    lv, sv = line.num(f"{where}.line_um"), space.num(f"{where}.space_um")
    tmpl = [n for n, v in (("line_um", line), ("space_um", space)) if v.status == "template"]
    note = "default fill = line_um / (line_um + space_um)"
    if tmpl:
        note += "; computed from template inputs: " + ", ".join(tmpl)
    return Val(lv / (lv + sv), None, "template" if tmpl else "derived", list(dict.fromkeys(line.cells + space.cells)),
               note=note, formula="line_um / (line_um + space_um)", values=f"{fmt(lv)} / ({fmt(lv)} + {fmt(sv)})",
               inputs=list(dict.fromkeys(line.inputs + space.inputs)), template_inputs=tmpl)


# ----------------------------------------------------------------------------- geometry


Rect = tuple[float, float, float, float]  # x0, y0, x1, y1


def rect_of(x: float, y: float, w: float, d: float) -> Rect:
    return (x - w / 2, y - d / 2, x + w / 2, y + d / 2)


def rect_xywd(r: Rect) -> tuple[float, float, float, float]:
    return ((r[0] + r[2]) / 2, (r[1] + r[3]) / 2, r[2] - r[0], r[3] - r[1])


def intersect(a: Rect, b: Rect) -> Rect | None:
    r = (max(a[0], b[0]), max(a[1], b[1]), min(a[2], b[2]), min(a[3], b[3]))
    return r if r[2] - r[0] > 1e-9 and r[3] - r[1] > 1e-9 else None


def subtract(a: Rect, b: Rect) -> list[Rect]:
    i = intersect(a, b)
    if i is None:
        return [a]
    out = [(a[0], a[1], i[0], a[3]), (i[2], a[1], a[2], a[3]), (i[0], a[1], i[2], i[1]), (i[0], i[3], i[2], a[3])]
    return [r for r in out if r[2] - r[0] > 1e-9 and r[3] - r[1] > 1e-9]


def inside(a: Rect, b: Rect, tol: float = 1e-6) -> bool:
    return a[0] >= b[0] - tol and a[1] >= b[1] - tol and a[2] <= b[2] + tol and a[3] <= b[3] + tol


@dataclass
class Inst:
    id: str
    tid: str
    name: str
    rect: Rect
    zk: int = 0  # vertical level of a `repeat: {nz}` part (0 = lowest)
    xk: int = 0  # index in the xy grid of the part


def center(r: Rect) -> tuple[float, float]:
    return (r[0] + r[2]) / 2, (r[1] + r[3]) / 2


def grow_rect(r: Rect, m: float) -> Rect:
    return (r[0] - m, r[1] - m, r[2] + m, r[3] + m)


class Builder:
    def __init__(self, fam: Family, refs: Refs) -> None:
        self.f = fam
        self.refs = refs
        self.tpl = fam.tpl
        self.pdecl = {p["id"]: p for p in self.tpl.get("parts", [])}
        self.adecl = {a["id"]: a for a in self.tpl.get("arrays", [])}
        self.pdims: dict[str, dict[str, Val]] = {}
        self.insts: dict[str, list[Inst]] = {}
        self.byid: dict[str, Inst] = {}  # part instance id -> instance
        self.adims: dict[str, dict[str, Val]] = {}
        self.arep: dict[str, tuple[int, float | None]] = {}  # array vertical repeat: (nz, pitch_um or None = stack)
        self.z: dict[str, float] = {}  # bottom of the lowest level
        self.h: dict[str, float] = {}
        self.nz: dict[str, int] = {}  # vertical levels per part
        self.zp: dict[str, float] = {}  # vertical pitch of z-repeated parts (um)
        self.az: dict[str, tuple[float, float]] = {}  # array id or template id -> z range (before the final shift)
        self.lz: dict[str, list[tuple[float, float, str, int]]] = {}  # layer (group) id -> (z0, z1, host, level)
        self.counts: dict[str, int] = {"reported": 0, "derived": 0, "template": 0}
        self.template_list: list[str] = []
        # concrete layer id -> {tid, host, lv, group, role, route, z0, z1}; template / group id -> concrete ids
        self.lmeta: dict[str, dict[str, Any]] = {}
        self.ltids: dict[str, list[str]] = {}
        self.lgroups: dict[str, list[str]] = {}

    def count(self, elem: str, dims: dict[str, Val]) -> None:
        for k, v in dims.items():
            self.counts[v.status] += 1
            if v.status == "template":
                self.template_list.append(f"{elem}.{k} = {fmt(v.value)}: {v.note}")

    def r(self, spec: Any, key: str, where: str) -> Val:
        return self.f.resolve(spec, name_unit(key), where)

    # -- instances and levels
    def register(self, tid: str, insts: list[Inst], dims: dict[str, Val]) -> list[Inst]:
        self.insts[tid] = insts
        self.pdims[tid] = dims
        self.nz[tid] = max(i.zk for i in insts) + 1
        for i in insts:
            self.byid[i.id] = i
        return insts

    def levels(self, tid: str) -> list[list[Inst]]:
        insts = self.footprint(tid)
        return [[i for i in insts if i.zk == lv] for lv in range(self.nz[tid])]

    def top_level(self, tid: str) -> list[Inst]:
        return self.levels(tid)[-1]

    def level_inst(self, tid: str, zk: int, xk: int) -> Inst:
        return next(i for i in self.insts[tid] if i.zk == zk and i.xk == xk)

    def below(self, tid: str, inst: Inst) -> Inst | None:
        """The solid an instance sits on: the previous level of a stacked part, else its `on` host instance."""
        if inst.zk > 0:
            return self.level_inst(tid, inst.zk - 1, inst.xk)
        host = self.pdecl[tid].get("on")
        if not host:
            return None
        cands = self.top_level(host)
        cx, cy = center(inst.rect)
        for c in cands:
            if inside((cx, cy, cx, cy), c.rect):
                return c
        return cands[0] if len(cands) == 1 else None

    def label_top(self, tid: str) -> str:
        """Label for the top surface of a part (the top-level instance of a stacked part)."""
        if self.nz.get(tid, 1) > 1:
            lv = self.top_level(tid)
            return lv[0].id if len(lv) == 1 else tid
        return tid

    def label_bottom(self, tid: str) -> str:
        if self.nz.get(tid, 1) > 1:
            lv = self.levels(tid)[0]
            return lv[0].id if len(lv) == 1 else tid
        return tid

    # -- parts: footprint pass
    def footprint(self, tid: str) -> list[Inst]:
        if tid in self.insts:
            return self.insts[tid]
        if tid not in self.pdecl:
            raise TemplateError(f"{self.f.fid}: unknown part {tid!r}")
        p = self.pdecl[tid]
        where = f"parts.{tid}"
        if p.get("kind") not in PART_KINDS:
            raise TemplateError(f"{where}: kind {p.get('kind')!r} not in {sorted(PART_KINDS)}")
        if p.get("material") not in MATERIALS:
            raise TemplateError(f"{where}: material {p.get('material')!r} not in {sorted(MATERIALS)}")
        dims: dict[str, Val] = {}
        if "fill" in p:
            fl = p["fill"]
            if ("per" in fl) == ("parts" in fl or "above" in fl):
                raise TemplateError(f"{where}: fill needs either `per` or `above` + `parts`")
            margin = self.r(fl["margin_mm"], "margin_mm", f"{where}.fill.margin_mm")
            m = margin.num(where)
            dims["margin_mm"] = margin
            if "per" in fl:  # one fill under every instance of a (stacked) part
                bases = self.footprint(fl["per"])
                finsts: list[Inst] = []
                for k, bi in enumerate(bases, 1):
                    bb = grow_rect(bi.rect, m)
                    low = self.below(fl["per"], bi)
                    if low is not None and p.get("clip", True):
                        bb = intersect(bb, low.rect) or bb
                    one = len(bases) == 1
                    finsts.append(Inst(tid if one else f"{tid}_{k}", tid, p["name"] if one else f"{p['name']} {k}", bb,
                                      bi.zk, bi.xk))
                return self.register(tid, finsts, dims)
            rects = [i.rect for t in fl["parts"] for i in self.footprint(t)]
            bb = (min(r[0] for r in rects) - m, min(r[1] for r in rects) - m,
                  max(r[2] for r in rects) + m, max(r[3] for r in rects) + m)
            above = self.top_level(fl["above"])
            if len(above) == 1:
                clipped = intersect(bb, above[0].rect) if p.get("clip", True) else bb
                bb = clipped or bb
            return self.register(tid, [Inst(tid, tid, p["name"], bb)], dims)
        for key in ("w_mm", "d_mm", "h_um"):
            if key not in p:
                raise TemplateError(f"{where}: missing {key}")
            dims[key] = self.r(p[key], key, f"{where}.{key}")
        w, d = dims["w_mm"].num(where), dims["d_mm"].num(where)
        for key in ("x_mm", "y_mm"):
            if key in p:
                dims[key] = self.r(p[key], key, f"{where}.{key}")
        x0 = dims["x_mm"].num(where) if "x_mm" in dims else 0.0
        y0 = dims["y_mm"].num(where) if "y_mm" in dims else 0.0
        for key in ("gap_um", "depth_um", "frame_w_mm"):
            if key in p:
                dims[key] = self.r(p[key], key, f"{where}.{key}")
        centers = [(x0, y0)]
        nz = 1
        if isinstance(p.get("repeat"), list):  # multi-grid repeat (L28): one centered grid per entry
            if not p["repeat"]:
                raise TemplateError(f"{where}: empty repeat list")
            centers = []
            for gi, g in enumerate(p["repeat"], 1):
                wg = f"{where}.repeat[{gi}]"
                if not isinstance(g, dict):
                    raise TemplateError(f"{wg}: grid must be a mapping {{{', '.join(GRID_KEYS)}}}")
                bad = set(g) - set(GRID_KEYS)
                if bad:
                    raise TemplateError(f"{wg}: unknown keys {sorted(bad)} (a grid takes {', '.join(GRID_KEYS)})")
                gv = {k: self.r(g[k], k, f"{wg}.{k}") for k in GRID_KEYS if k in g}
                gnx = gv["nx"].num(wg) if "nx" in gv else 1.0
                gny = gv["ny"].num(wg) if "ny" in gv else 1.0
                if not (gnx.is_integer() and gny.is_integer()) or min(gnx, gny) < 1:
                    raise TemplateError(f"{wg}: repeat counts must be positive integers (nx={gnx}, ny={gny})")
                gpx = gv["pitch_x_mm"].num(wg) if "pitch_x_mm" in gv else 0.0
                gpy = gv["pitch_y_mm"].num(wg) if "pitch_y_mm" in gv else 0.0
                gx = x0 + (gv["x_mm"].num(wg) if "x_mm" in gv else 0.0)
                gy = y0 + (gv["y_mm"].num(wg) if "y_mm" in gv else 0.0)
                centers += [(gx + (i - (gnx - 1) / 2) * gpx, gy + ((gny - 1) / 2 - j) * gpy)
                            for j in range(int(gny)) for i in range(int(gnx))]
                dims.update({f"repeat{gi}_{k}": v for k, v in gv.items()})
        elif "repeat" in p:
            rp = p["repeat"]
            bad = set(rp) - PART_REPEAT_KEYS
            if bad:
                raise TemplateError(f"{where}: unknown repeat keys {sorted(bad)}")
            vals = {k: self.r(rp[k], k, f"{where}.repeat.{k}")
                    for k in ("nx", "ny", "pitch_x_mm", "pitch_y_mm", "nz", "pitch_um") if k in rp}
            nx = vals["nx"].num(where) if "nx" in vals else 1.0
            ny = vals["ny"].num(where) if "ny" in vals else 1.0
            nzf = vals["nz"].num(where) if "nz" in vals else 1.0
            if not (nx.is_integer() and ny.is_integer() and nzf.is_integer()) or min(nx, ny, nzf) < 1:
                raise TemplateError(f"{where}: repeat counts must be positive integers (nx={nx}, ny={ny}, nz={nzf})")
            nz = int(nzf)
            if "nz" in rp and ("pitch_um" in vals) == bool(rp.get("stack")):
                raise TemplateError(f"{where}: vertical repeat needs exactly one of `pitch_um` or `stack: true`")
            px = vals["pitch_x_mm"].num(where) if "pitch_x_mm" in vals else 0.0
            py = vals["pitch_y_mm"].num(where) if "pitch_y_mm" in vals else 0.0
            centers = [(x0 + (i - (nx - 1) / 2) * px, y0 + ((ny - 1) / 2 - j) * py)
                       for j in range(int(ny)) for i in range(int(nx))]
            dims.update({f"repeat_{k}": v for k, v in vals.items()})
        insts: list[Inst] = []
        if p.get("shape") == "frame":
            if nz > 1:
                raise TemplateError(f"{where}: a frame cannot repeat vertically")
            fw = dims["frame_w_mm"].num(where)
            if 2 * fw >= min(w, d):
                raise TemplateError(f"{where}: frame width {fw} too large for {w} x {d}")
            sides = {"n": (x0, y0 + d / 2 - fw / 2, w, fw), "s": (x0, y0 - d / 2 + fw / 2, w, fw),
                     "e": (x0 + w / 2 - fw / 2, y0, fw, d - 2 * fw), "w": (x0 - w / 2 + fw / 2, y0, fw, d - 2 * fw)}
            for s, (x, y, ww, dd) in sides.items():
                insts.append(Inst(f"{tid}_{s}", tid, f"{p['name']} ({s.upper()})", rect_of(x, y, ww, dd)))
        else:
            n = len(centers) * nz
            k = 0
            for zk in range(nz):  # z-major: instance numbers count up the stack, row-major within a level
                for xk, (x, y) in enumerate(centers):
                    k += 1
                    insts.append(Inst(tid if n == 1 else f"{tid}_{k}", tid, p["name"] if n == 1 else f"{p['name']} {k}",
                                      rect_of(x, y, w, d), zk, xk))
        return self.register(tid, insts, dims)

    # -- arrays: dims pass
    def array_dims(self, aid: str) -> dict[str, Val]:
        if aid in self.adims:
            return self.adims[aid]
        a = self.adecl.get(aid)
        if a is None:
            raise TemplateError(f"{self.f.fid}: unknown array {aid!r}")
        where = f"arrays.{aid}"
        if a.get("kind") not in ARRAY_KINDS:
            raise TemplateError(f"{where}: kind {a.get('kind')!r} not in {sorted(ARRAY_KINDS)}")
        dims = {k: self.r(a[k], k, f"{where}.{k}") for k in ("pitch_um", "diameter_um", "height_um", *ARRAY_PAD_DIMS)
                if k in a}
        for k in ARRAY_PAD_DIMS:
            if k in dims and dims[k].num(f"{where}.{k}") <= 0:
                raise TemplateError(f"{where}: {k} must be > 0")
        if "cap_h_um" in dims:
            if "height_um" not in dims:
                raise TemplateError(f"{where}: cap_h_um needs height_um")
            if dims["cap_h_um"].num(where) >= dims["height_um"].num(where):
                raise TemplateError(f"{where}: cap_h_um {fmt(dims['cap_h_um'].num(where))} must be < height_um "
                                    f"{fmt(dims['height_um'].num(where))}")
        if "pitch_um" not in dims:
            raise TemplateError(f"{where}: missing pitch_um")
        if "repeat" in a:
            rp = a["repeat"]
            bad = set(rp) - {"nz", "pitch_um", "stack"}
            if bad or "nz" not in rp:
                raise TemplateError(f"{where}: array repeat takes {{nz, pitch_um | stack: true}}")
            dims["repeat_nz"] = self.r(rp["nz"], "nz", f"{where}.repeat.nz")
            nzf = dims["repeat_nz"].num(where)
            if not nzf.is_integer() or nzf < 1:
                raise TemplateError(f"{where}: repeat nz must be a positive integer ({nzf})")
            if ("pitch_um" in rp) == bool(rp.get("stack")):
                raise TemplateError(f"{where}: vertical repeat needs exactly one of `pitch_um` or `stack: true`")
            zp = None
            if "pitch_um" in rp:
                dims["repeat_pitch_um"] = self.r(rp["pitch_um"], "pitch_um", f"{where}.repeat.pitch_um")
                zp = dims["repeat_pitch_um"].num(where)
            self.arep[aid] = (int(nzf), zp)
        self.adims[aid] = dims
        return dims

    # -- z pass
    def zpos(self, tid: str, stack: tuple[str, ...] = ()) -> float:
        if tid in self.z:
            return self.z[tid]
        if tid in stack:
            raise TemplateError(f"{self.f.fid}: circular stacking at {tid!r}")
        st = stack + (tid,)
        p = self.pdecl[tid]
        dims = self.pdims[tid]
        if "fill" in p:
            fl = p["fill"]
            if "per" in fl:
                per = fl["per"]
                zper = self.zpos(per, st)
                gap = self.gap_val(per)
                if gap is None or gap.num(tid) <= 0:
                    raise TemplateError(f"parts.{tid}: fill.per needs a part with a standoff array or gap_um")
                g = gap.num(tid)
                if self.nz[per] > 1 and abs(self.zp[per] - self.h[per] - g) > 1e-6:
                    raise TemplateError(f"parts.{tid}: the gaps of the stacked part {per} are not uniform")
                self.h[tid] = g
                dims["h_um"] = gap
                self.zp[tid] = self.zp.get(per, 0.0)
                self.z[tid] = zper - g
                return self.z[tid]
            z0 = self.top(fl["above"], st)
            z1 = min(self.zpos(t, st) for t in fl["parts"])
            if z1 - z0 <= 0:
                raise TemplateError(f"parts.{tid}: nothing to fill (gap {z1 - z0} um)")
            self.h[tid] = z1 - z0
            first = fl["parts"][0]
            gap = self.gap_val(first)
            dims["h_um"] = gap if gap is not None else Val(z1 - z0, "um", "derived", note="gap below parts")
            self.z[tid] = z0
            return z0
        h = dims["h_um"].num(tid)
        self.h[tid] = h
        if p.get("base"):
            z = 0.0
        elif "on" in p:
            gap = self.gap_val(tid)
            z = self.top(p["on"], st) + (gap.num(tid) if gap else 0.0)
        elif "in" in p:
            if self.nz.get(p["in"], 1) > 1:
                raise TemplateError(f"parts.{tid}: `in:` a vertically repeated host is not supported")
            depth = dims["depth_um"].num(tid) if "depth_um" in dims else 0.0
            z = self.top(p["in"], st) - depth - h
            pz = self.zpos(p["in"], st)
            if z < pz - 1e-6:
                self.f.warnings.append(f"part {tid}: extends below its host {p['in']} ({fmt(z)} < {fmt(pz)} um)")
        elif "under" in p:
            gap = self.gap_val(tid)
            z = self.zpos(p["under"], st) - (gap.num(tid) if gap else 0.0) - h
        else:
            raise TemplateError(f"parts.{tid}: needs base/on/in/under/fill")
        self.z[tid] = z
        if self.nz[tid] > 1:
            if p["repeat"].get("stack"):
                gap = self.gap_val(tid)
                pitch = h + (gap.num(tid) if gap else 0.0)
            else:
                pitch = dims["repeat_pitch_um"].num(tid)
            if pitch <= 0:
                raise TemplateError(f"parts.{tid}: vertical pitch must be > 0")
            if pitch < h - 1e-6:
                self.f.warnings.append(f"part {tid}: vertical pitch {fmt(pitch)} um < height {fmt(h)} um (levels overlap)")
            self.zp[tid] = pitch
        return z

    def top(self, tid: str, stack: tuple[str, ...] = ()) -> float:
        return self.zpos(tid, stack) + self.zp.get(tid, 0.0) * (self.nz.get(tid, 1) - 1) + self.h[tid]

    def iz(self, inst: Inst) -> float:
        return self.zpos(inst.tid) + inst.zk * self.zp.get(inst.tid, 0.0)

    def itop(self, inst: Inst) -> float:
        return self.iz(inst) + self.h[inst.tid]

    def gap_val(self, tid: str) -> Val | None:
        p = self.pdecl[tid]
        if "standoff" in p:
            dims = self.array_dims(p["standoff"])
            if "height_um" not in dims:
                raise TemplateError(f"parts.{tid}: standoff array {p['standoff']} has no height_um")
            return dims["height_um"]
        return self.pdims[tid].get("gap_um")

    def anchor(self, s: str, *, arrays: bool = False) -> float:
        side, _, name = str(s).partition(":")
        if side in {"top", "bottom"}:
            if name in self.pdecl:
                return self.top(name) if side == "top" else self.zpos(name)
            if name in self.byid:
                inst = self.byid[name]
                return self.itop(inst) if side == "top" else self.iz(inst)
            if arrays and name in self.az:
                return self.az[name][1] if side == "top" else self.az[name][0]
        want = "top:<part|instance|array>" if arrays else "top:<part|instance>"
        raise TemplateError(f"{self.f.fid}: bad anchor {s!r} (want {want} or bottom:...)")

    def layer_span(self, name: str, where: str) -> tuple[float, float, str]:
        if name not in self.lz:
            raise TemplateError(f"{where}: in_layer {name!r} is not a layer group id or layer id")
        ent = self.lz[name]
        if len({(h, lv) for _, _, h, lv in ent}) > 1:
            raise TemplateError(f"{where}: in_layer {name!r} spans several hosts or levels (use it without `per`)")
        return min(e[0] for e in ent), max(e[1] for e in ent), ent[0][2]

    # -- build
    def build(self) -> dict:
        f, tpl, refs = self.f, self.tpl, self.refs
        for tid in self.pdecl:
            self.footprint(tid)
        for aid in self.adecl:
            self.array_dims(aid)
        # layers (resolved before z so the host thickness check can run)
        layer_groups = []
        el_ids = {el["id"] for g in tpl.get("layers", []) for el in g.get("pattern", [])}
        for gi, g in enumerate(tpl.get("layers", [])):
            host = g["part"]
            if host not in self.pdecl:
                raise TemplateError(f"layers[{gi}]: unknown part {host!r}")
            gid = g.get("id")
            if gid and gid in el_ids:
                raise TemplateError(f"layers[{gi}]: group id {gid!r} is also a layer id")
            rep = self.r(g["repeat"], "repeat_n", f"layers[{gi}].repeat") if "repeat" in g else None
            n = int(rep.num("repeat")) if rep else 1
            pats = []
            for el in g["pattern"]:
                where = f"layers.{el['id']}"
                if el.get("material") not in MATERIALS:
                    raise TemplateError(f"{where}: material {el.get('material')!r} not in {sorted(MATERIALS)}")
                ld = {k: self.r(el[k], k, f"{where}.{k}") for k in ("h_um", "line_um", "space_um", "via_um")
                      if k in el}
                if "h_um" not in ld:
                    raise TemplateError(f"{where}: missing h_um")
                if rep is not None:
                    ld["repeat_n"] = rep
                rt = self.route_spec(el, where) if "route" in el else None
                pats.append((el, ld, rt))
                self.count(f"layer {el['id']}", ld)
                if rt is not None:
                    self.count(f"layer {el['id']} route", rt[3])
                    for ri, rg in enumerate(rt[4]):
                        self.count(f"layer {el['id']} route region {ri + 1}", rg["own"])
            layer_groups.append((host, n, pats, gid))
        for tid in self.pdecl:
            self.zpos(tid)
        # count part dims once per declared part
        for tid, decl in self.pdecl.items():
            dims = self.pdims[tid]
            if "fill" in decl:  # a fill height is the standoff array's height, already counted there
                dims = {k: v for k, v in dims.items() if k != "h_um"}
            self.count(f"part {tid}", dims)
        # layers: stack downward from the host top (every vertical level of a stacked host gets its own entries)
        layers_out = []
        cursor: dict[tuple[str, int], float] = {}
        seq: dict[tuple[str, int], int] = {}
        for host, n, pats, gid in layer_groups:
            lvls = self.levels(host)
            for lv, linsts in enumerate(lvls):
                key = (host, lv)
                ztop = cursor.get(key, self.itop(linsts[0]))
                rrects: dict[str, list[list[Rect]]] = {}  # layer element id -> rects of each route region
                for el, _ld, rt in pats:
                    if rt is not None and rt[4]:
                        rl = []
                        for ri, rg in enumerate(rt[4]):
                            wr = f"layers.{el['id']}.route.regions[{ri}]"
                            rcs = self.array_region({"region": rg["region"]}, linsts, wr)
                            for rc in rcs:
                                if not any(inside(rc, i.rect) for i in linsts):
                                    f.warnings.append(f"layer {el['id']}: route region {[rnd(c) for c in rc]} not "
                                                      f"inside {host}")
                            rl.append(rcs)
                        rrects[el["id"]] = rl
                for k in range(1, n + 1):
                    for el, ld, rt in pats:
                        h = ld["h_um"].num(el["id"])
                        ztop -= h
                        seq[key] = seq.get(key, 0) + 1
                        lid = el["id"] if n == 1 else f"{el['id']}_{k}"
                        if len(lvls) > 1:
                            lid += f"_{linsts[0].id}" if len(linsts) == 1 else f"_z{lv + 1}"
                        lo = {"id": lid, "part": host if len(self.insts[host]) == 1 else linsts[0].id,
                              "seq": seq[key], "name": el.get("name", lid) + ("" if n == 1 else f" {k}"),
                              "material": el["material"], "material_label": el.get("material_label", ""),
                              "role": el.get("role", ""), "z_um": rnd(ztop), "h_um": rnd(h)}
                        for kk in ("line_um", "space_um", "via_um"):
                            if kk in ld:
                                lo[kk] = rnd(ld[kk].num(kk))
                        lo["template_id"] = el["id"]
                        if len(linsts) > 1:  # repeated host: the same stack in every instance of this level
                            lo["instances"] = [i.id for i in linsts]
                        ro = self.route_json(rt, k, rrects.get(el["id"])) if rt is not None else None
                        if ro is not None:
                            lo["route"] = ro
                        lo["dims"] = {kk: dim_json(v, refs) for kk, v in ld.items()}
                        layers_out.append({k2: v2 for k2, v2 in lo.items() if v2 != ""})
                        for name in (el["id"], gid):
                            if name:
                                self.lz.setdefault(name, []).append((ztop, ztop + h, host, lv))
                        self.lmeta[lid] = {"tid": el["id"], "host": host, "lv": lv, "group": gid,
                                           "role": el.get("role", ""), "route": ro, "z0": ztop, "z1": ztop + h}
                        self.ltids.setdefault(el["id"], []).append(lid)
                        if gid:
                            self.lgroups.setdefault(gid, []).append(lid)
                cursor[key] = ztop
        for (host, lv), zb in cursor.items():
            if lv:
                continue
            used = self.itop(self.levels(host)[0][0]) - zb
            if used > self.h[host] + 1e-6:
                f.warnings.append(f"layers in {host} total {fmt(used)} um > part height {fmt(self.h[host])} um")
            elif abs(used - self.h[host]) > 1e-6:
                f.warnings.append(f"layers in {host} total {fmt(used)} um of {fmt(self.h[host])} um (rest unlayered)")
        # arrays
        arrays_out = []
        for aid, a in self.adecl.items():
            arrays_out += self.build_array(aid, a)
        # shift z so the lowest point is 0
        zmin = min([self.z[t] for t in self.pdecl] + [a["z_um"] for a in arrays_out])
        parts_out = []
        for tid, p in self.pdecl.items():
            dj = {k: dim_json(v, refs) for k, v in self.pdims[tid].items()}
            for inst in self.insts[tid]:
                x, y, w, d = rect_xywd(inst.rect)
                po = {"id": inst.id, "name": inst.name, "kind": p["kind"], "material": p["material"],
                      "material_label": p.get("material_label", ""), "x_mm": rnd(x), "y_mm": rnd(y), "w_mm": rnd(w),
                      "d_mm": rnd(d), "z_um": rnd(self.iz(inst) - zmin), "h_um": rnd(self.h[tid]),
                      "explode_group": int(p.get("explode_group", 0)) + inst.zk * int(p.get("explode_step", 0)),
                      "xray_default": bool(p.get("xray_default")), "template_id": tid}
                if self.nz[tid] > 1:
                    po["z_index"] = inst.zk + 1
                if "in" in p:  # host instance that contains this one (repeated hosts: the matching instance)
                    hosts = self.insts[p["in"]]
                    po["in"] = next((h.id for h in hosts if inside(inst.rect, h.rect)), hosts[0].id)
                if p.get("note"):
                    po["note"] = p["note"]
                po["dims"] = dj
                parts_out.append({k: v for k, v in po.items() if v != ""})
        for lo in layers_out:
            lo["z_um"] = rnd(lo["z_um"] - zmin)
        for ao in arrays_out:
            ao["z_um"] = rnd(ao["z_um"] - zmin)
        self.sanity(parts_out)
        routing = self.build_routing(tpl["routing"], arrays_out, zmin) if "routing" in tpl else None
        callouts = [self.callout(c) for c in tpl.get("callouts", [])]
        ids = {x[k] for x in parts_out + layers_out + arrays_out for k in ("id", "template_id")}
        if routing is not None:  # callouts may target via entries / classes and nets
            ids |= {x.get(k, x["id"]) for x in routing["vias"] + routing["nets"] for k in ("id", "template_id")}
        for c in callouts:
            if c["target"] not in ids:
                raise TemplateError(f"callout target {c['target']!r} not found")
        insets = [self.inset(i, zmin) for i in tpl.get("insets", [])]
        total = sum(self.counts.values())
        completeness = {k: round(v / total, 3) if total else 0.0 for k, v in self.counts.items()}
        summary, srefs = self.fill_text(tpl.get("summary", ""), "summary")
        if len(summary.split()) > 40:
            f.warnings.append(f"summary has {len(summary.split())} words (> 40)")
        source_tvs = self.source_tvs()
        params_out = {name: dim_json(v, refs) for name, v in sorted(f.params.items())}
        fam = {
            "id": f.fid, "name": tpl["name"], "company": tpl["company"], "package_class": tpl["package_class"],
            "summary": summary, "summary_refs": srefs, "backbone_tv": tpl.get("backbone_tv", ""),
            "source_tvs": source_tvs, "completeness": completeness, "dim_counts": dict(self.counts),
            "parts": parts_out, "layers": layers_out, "arrays": arrays_out, "callouts": callouts, "insets": insets,
            "params": params_out,
        }
        if routing is not None:
            fam["routing"] = routing
        return fam

    # -- routing (DevLog-011)
    def check_region(self, reg: Any, where: str) -> None:
        """Via class `region`: {part}, {intersect: [...]}, {subtract: [...]} (combinable) or explicit x/y/w/d specs."""
        if not isinstance(reg, dict) or not reg:
            raise TemplateError(f"{where}: want {{part}}, {{intersect: [...]}}, {{subtract: [...]}} or {{x_mm, y_mm, "
                                f"w_mm, d_mm}}")
        bad = set(reg) - REGION_KEYS
        if bad:
            raise TemplateError(f"{where}: unknown keys {sorted(bad)} (allowed {sorted(REGION_KEYS)})")
        box = {"x_mm", "y_mm", "w_mm", "d_mm"} & set(reg)
        if box and (box != {"x_mm", "y_mm", "w_mm", "d_mm"} or set(reg) - box):
            raise TemplateError(f"{where}: an explicit region needs exactly x_mm, y_mm, w_mm, d_mm")
        for k in ("intersect", "subtract"):
            if k in reg and (not isinstance(reg[k], list) or not reg[k]):
                raise TemplateError(f"{where}.{k}: want a non-empty list of part ids")
        for t in [reg.get("part"), *(reg.get("intersect") or []), *(reg.get("subtract") or [])]:
            if t is not None and t not in self.pdecl:
                raise TemplateError(f"{where}: unknown part {t!r}")
        for k in ("w_mm", "d_mm"):
            if k in reg and self.r(reg[k], k, f"{where}.{k}").num(where) <= 0:
                raise TemplateError(f"{where}: {k} must be > 0")

    def cluster_dims(self, cl: Any, dims: dict[str, Val], where: str) -> dict[str, Val]:
        """Via `cluster: {n, pitch_um}`: n vias on a compact grid (ceil(sqrt n) columns) at pitch_um per site."""
        if not isinstance(cl, dict) or set(cl) != CLUSTER_KEYS:
            raise TemplateError(f"{where}: want exactly {{n: <count spec>, pitch_um: <spec>}}")
        cd = {"n": self.f.resolve(cl["n"], "n", f"{where}.n"), "pitch_um": self.r(cl["pitch_um"], "pitch_um",
                                                                                     f"{where}.pitch_um")}
        n, cp = cd["n"].num(f"{where}.n"), cd["pitch_um"].num(f"{where}.pitch_um")
        if not n.is_integer() or n < 1:
            raise TemplateError(f"{where}: n must be an integer >= 1 ({fmt(n)})")
        if cp <= 0:
            raise TemplateError(f"{where}: pitch_um must be > 0")
        dia = dims["diameter_um"].num(where)
        cols = math.ceil(math.sqrt(n))
        extent = (cols - 1) * cp + dia  # the grid has cols >= rows
        if n > 1 and cp < dia:
            self.f.warnings.append(f"{where}: cluster pitch {fmt(cp)} um < via diameter {fmt(dia)} um (vias overlap)")
        for k in ("pitch_um", "land_um"):
            if k in dims and extent > dims[k].num(where) + 1e-9:
                self.f.warnings.append(f"{where}: cluster extent {fmt(rnd(extent))} um ({cols} columns) > via "
                                       f"{k} {fmt(dims[k].num(where))} um")
        return cd

    def route_spec(self, el: dict, where: str) -> tuple[str, str | None, str, dict[str, Val], list[dict]]:
        """Layer `route` -> (use, dir or None, matrix, dims, regions). Only conductor layers may carry one."""
        rt = el["route"]
        w = f"{where}.route"
        if not isinstance(rt, dict):
            raise TemplateError(f"{w}: want {{use, dir, line_um, space_um, matrix, fill?}}")
        if el.get("role") != "conductor":
            raise TemplateError(f"{w}: only role `conductor` layers may carry `route` (role {el.get('role')!r})")
        bad = set(rt) - ROUTE_KEYS
        if bad:
            raise TemplateError(f"{w}: unknown keys {sorted(bad)} (allowed {sorted(ROUTE_KEYS)})")
        use = rt.get("use")
        if use not in ROUTE_USES:
            raise TemplateError(f"{w}: use {use!r} not in {sorted(ROUTE_USES)}")
        d = rt.get("dir")
        if d is not None and d not in ROUTE_DIRS:
            raise TemplateError(f"{w}: dir {d!r} not in {sorted(ROUTE_DIRS)}")
        if rt.get("matrix") not in MATERIALS:
            raise TemplateError(f"{w}: matrix {rt.get('matrix')!r} not in {sorted(MATERIALS)}")
        dims = {k: self.r(rt[k], k, f"{w}.{k}") for k in ("line_um", "space_um") if k in rt}
        if use in ROUTE_LS_USES:
            miss = [k for k in ("dir", "line_um", "space_um") if k not in rt]
            if miss:
                raise TemplateError(f"{w}: use {use} needs {', '.join(miss)}")
        for k, v in dims.items():
            if v.num(f"{w}.{k}") <= 0:
                raise TemplateError(f"{w}: {k} must be > 0")
        if "fill" in rt:
            dims["fill"] = self.f.resolve(rt["fill"], None, f"{w}.fill")
        elif use in ROUTE_LS_USES:
            dims["fill"] = fill_from_ls(dims["line_um"], dims["space_um"], w)
        else:
            dims["fill"] = Val(ROUTE_FILL_DEFAULT[use], None, "template",
                               note=f"default Cu area fraction of a {use} level (generator default, not reported)")
        fv = dims["fill"].num(f"{w}.fill")
        if not 0 < fv <= 1:
            raise TemplateError(f"{w}: fill {fmt(fv)} not in (0, 1]")
        regs = self.route_regions(rt.get("regions"), str(use), d, dims, w)
        return str(use), d, str(rt["matrix"]), dims, regs

    def route_regions(self, spec: Any, use: str, d: str | None, base: dict[str, Val], w: str) -> list[dict]:
        """`route.regions` (L18, 2026-10-21): the level's properties inside a footprint region (same forms as a via
        `region`). Keys not given inherit the level's; `fill` is recomputed when the region's L/S or use differ.
        Returns [{region, use, dir, own (dims stated by the region), vals (merged dims), note}]."""
        if spec is None:
            return []
        if not isinstance(spec, list) or not spec:
            raise TemplateError(f"{w}.regions: want a non-empty list of {{region, use?, dir?, line_um?, space_um?, "
                                f"fill?, note?}}")
        out = []
        for ri, rg in enumerate(spec):
            wr = f"{w}.regions[{ri}]"
            if not isinstance(rg, dict) or "region" not in rg:
                raise TemplateError(f"{wr}: want {{region, use?, dir?, line_um?, space_um?, fill?, note?}}")
            bad = set(rg) - ROUTE_REGION_KEYS
            if bad:
                raise TemplateError(f"{wr}: unknown keys {sorted(bad)} (allowed {sorted(ROUTE_REGION_KEYS)})")
            self.check_region(rg["region"], f"{wr}.region")
            ruse = str(rg.get("use", use))
            if ruse not in ROUTE_USES:
                raise TemplateError(f"{wr}: use {ruse!r} not in {sorted(ROUTE_USES)}")
            rd = rg.get("dir", d if ruse in ROUTE_LS_USES else None)
            if rd is not None and rd not in ROUTE_DIRS:
                raise TemplateError(f"{wr}: dir {rd!r} not in {sorted(ROUTE_DIRS)}")
            own = {k: self.r(rg[k], k, f"{wr}.{k}") for k in ("line_um", "space_um") if k in rg}
            for k, v in own.items():
                if v.num(f"{wr}.{k}") <= 0:
                    raise TemplateError(f"{wr}: {k} must be > 0")
            # inherited L/S only where the region use needs them (signal / mixed L/S, a plane's antipad space)
            inh = {"line_um", "space_um"} if ruse in ROUTE_LS_USES else {"space_um"} if ruse == "plane" else set()
            vals: dict[str, Val] = {}
            for k in ("line_um", "space_um"):
                got = own.get(k) or (base.get(k) if k in inh else None)
                if got is not None:
                    vals[k] = got
            if ruse in ROUTE_LS_USES:
                miss = [k for k in ("line_um", "space_um") if k not in vals] + ([] if rd else ["dir"])
                if miss:
                    raise TemplateError(f"{wr}: use {ruse} needs {', '.join(miss)} (stated or inherited)")
            if "fill" in rg:
                own["fill"] = self.f.resolve(rg["fill"], None, f"{wr}.fill")
            elif ruse in ROUTE_LS_USES and (own or ruse != use):
                own["fill"] = fill_from_ls(vals["line_um"], vals["space_um"], wr)
            elif ruse != use:
                own["fill"] = Val(ROUTE_FILL_DEFAULT[ruse], None, "template",
                                  note=f"default Cu area fraction of a {ruse} level (generator default, not reported)")
            vals["fill"] = own.get("fill", base["fill"])
            fv = vals["fill"].num(f"{wr}.fill")
            if not 0 < fv <= 1:
                raise TemplateError(f"{wr}: fill {fmt(fv)} not in (0, 1]")
            note = " ".join(str(rg.get("note") or "").split())
            out.append({"region": rg["region"], "use": ruse, "dir": rd, "own": own, "vals": vals, "note": note})
        return out

    def route_json(self, rt: tuple[str, str | None, str, dict[str, Val], list[dict]], k: int,
                   rects: list[list[Rect]] | None = None) -> dict:
        """Resolved route of repeat k (1-based): `alt` alternates x / y over the repeats, starting at x. `rects` =
        resolved footprints of each `route.regions` entry at this level (package frame)."""
        use, d, matrix, dims, regs = rt
        ro: dict[str, Any] = {"use": use}
        if d is not None:
            ro["dir"] = ("x" if k % 2 else "y") if d == "alt" else d
        for kk in ("line_um", "space_um"):
            if kk in dims:
                ro[kk] = rnd(dims[kk].num(kk))
        ro["matrix"] = matrix
        ro["fill"] = rnd(dims["fill"].num("fill"))
        ro["dims"] = {kk: dim_json(v, self.refs) for kk, v in dims.items()}
        if regs:
            out = []
            for rg, rr in zip(regs, rects or [[] for _ in regs]):
                e: dict[str, Any] = {"rects": [dict(zip(("x_mm", "y_mm", "w_mm", "d_mm"),
                                                        (rnd(c) for c in rect_xywd(rc)))) for rc in rr],
                                     "use": rg["use"]}
                if rg["dir"] is not None:
                    e["dir"] = ("x" if k % 2 else "y") if rg["dir"] == "alt" else rg["dir"]
                for kk in ("line_um", "space_um"):
                    if kk in rg["vals"]:
                        e[kk] = rnd(rg["vals"][kk].num(kk))
                e["fill"] = rnd(rg["vals"]["fill"].num("fill"))
                if rg["note"]:
                    e["note"] = rg["note"]
                e["dims"] = {kk: dim_json(v, self.refs) for kk, v in rg["own"].items()}
                out.append(e)
            ro["regions"] = out
        return ro

    def layer_refs(self, names: Any, where: str) -> list[str]:
        """Layer names in nets: a concrete layer id (`<id>_<k>`) or a template id (= all its repeats / levels)."""
        if not isinstance(names, list) or not names:
            raise TemplateError(f"{where}: want a non-empty list of layer ids")
        out: list[str] = []
        for nm in names:
            nm = str(nm)
            if nm in self.lmeta:
                ids = [nm]
            elif nm in self.ltids:
                ids = self.ltids[nm]
            else:
                raise TemplateError(f"{where}: unknown layer {nm!r}")
            out += [i for i in ids if i not in out]
        return out

    def check_levels(self, ids: list[str], uses: set[str], where: str) -> None:
        for lid in ids:
            m = self.lmeta[lid]
            if m["role"] != "conductor" or m["route"] is None:
                raise TemplateError(f"{where}: layer {lid} is not a conductor layer with `route`")
            if m["route"]["use"] not in uses:
                raise TemplateError(f"{where}: layer {lid} has route use {m['route']['use']!r}; want "
                                    f"{' or '.join(sorted(uses))}")

    def via_spans(self, thr: str, where: str, zmin: float) -> list[tuple[str, str, int, float, float, str, str]]:
        """`through` -> [(id suffix, host, level, z0, z1, through id, through kind)] (z after the final shift)."""
        def lv_suffix(host: str, lv: int) -> str:
            if self.nz[host] == 1:
                return ""
            linsts = self.levels(host)[lv]
            return f"_{linsts[0].id}" if len(linsts) == 1 else f"_z{lv + 1}"

        if thr in self.lmeta or thr in self.ltids:
            lids = [thr] if thr in self.lmeta else self.ltids[thr]
            base = "" if thr in self.lmeta else thr
            return [(lid[len(base):] if base else "", self.lmeta[lid]["host"], self.lmeta[lid]["lv"],
                     self.lmeta[lid]["z0"] - zmin, self.lmeta[lid]["z1"] - zmin, lid, "layer") for lid in lids]
        if thr in self.lgroups:
            out = []
            ents = [self.lmeta[lid] for lid in self.lgroups[thr]]
            for host, lv in dict.fromkeys((e["host"], e["lv"]) for e in ents):
                es = [e for e in ents if e["host"] == host and e["lv"] == lv]
                out.append((lv_suffix(host, lv), host, lv, min(e["z0"] for e in es) - zmin,
                            max(e["z1"] for e in es) - zmin, thr, "group"))
            return out
        if thr in self.pdecl:
            out = []
            for lv, linsts in enumerate(self.levels(thr)):
                z0 = self.iz(linsts[0]) - zmin
                label = thr if self.nz[thr] == 1 or len(linsts) > 1 else linsts[0].id
                out.append((lv_suffix(thr, lv), thr, lv, z0, z0 + self.h[thr], label, "part"))
            return out
        raise TemplateError(f"{where}: unknown through {thr!r} (want a layer id, layer group id or part id)")

    def via_end(self, host: str, lv: int, z: float, side: str, where: str, zmin: float) -> str | None:
        """Conductor layer directly above (side top) / below (bottom) a via span in its host level; None at a face."""
        tol = 1e-6
        for lid, m in self.lmeta.items():
            if m["host"] != host or m["lv"] != lv:
                continue
            edge = (m["z0"] if side == "top" else m["z1"]) - zmin
            if abs(edge - z) <= tol:
                if m["role"] != "conductor":
                    raise TemplateError(f"{where}: layer {lid} directly {'above' if side == 'top' else 'below'} the "
                                        f"via span is role {m['role']!r}, not a conductor")
                return lid
        inst = self.levels(host)[lv][0]
        face = (self.itop(inst) if side == "top" else self.iz(inst)) - zmin
        if abs(face - z) <= tol:
            return None
        raise TemplateError(f"{where}: no conductor layer directly {'above' if side == 'top' else 'below'} the via "
                            f"span (z {fmt(rnd(z))} um) and the span is not at the {side} face of {host}")

    def build_routing(self, spec: Any, arrays_out: list[dict], zmin: float) -> dict:
        refs = self.refs
        if not isinstance(spec, dict):
            raise TemplateError("routing: want {layout_note, vias, nets}")
        bad = set(spec) - ROUTING_KEYS
        if bad:
            raise TemplateError(f"routing: unknown keys {sorted(bad)} (allowed {sorted(ROUTING_KEYS)})")
        note = " ".join(str(spec.get("layout_note") or "").split())
        if not note:
            raise TemplateError("routing: `layout_note` is required when `routing` exists")
        vias_out: list[dict] = []
        seen: set[str] = set()
        for vi, v in enumerate(spec.get("vias") or []):
            vid = v.get("id") if isinstance(v, dict) else None
            where = f"routing.vias.{vid or vi}"
            if not vid:
                raise TemplateError(f"{where}: via class needs an id")
            if vid in seen:
                raise TemplateError(f"{where}: duplicate via id")
            seen.add(vid)
            bad = set(v) - VIA_KEYS
            if bad:
                raise TemplateError(f"{where}: unknown keys {sorted(bad)} (allowed {sorted(VIA_KEYS)})")
            if v.get("kind") not in VIA_KINDS:
                raise TemplateError(f"{where}: kind {v.get('kind')!r} not in {sorted(VIA_KINDS)}")
            if "through" not in v:
                raise TemplateError(f"{where}: missing through")
            if "diameter_um" not in v:
                raise TemplateError(f"{where}: missing diameter_um")
            if v.get("fill") is not None and v["fill"] not in VIA_FILLS:
                raise TemplateError(f"{where}: fill {v['fill']!r} not in {sorted(VIA_FILLS)}")
            if v.get("plug") is not None:
                if v["plug"] not in VIA_PLUGS:
                    raise TemplateError(f"{where}: plug {v['plug']!r} not in {sorted(VIA_PLUGS)}")
                if v.get("fill") not in {"plugged", "conformal"}:
                    raise TemplateError(f"{where}: `plug` needs fill plugged or conformal (fill {v.get('fill')!r})")
            if "region" in v:
                self.check_region(v["region"], f"{where}.region")
            dims = {k: self.r(v[k], k, f"{where}.{k}") for k in VIA_DIMS if k in v}
            cdims = self.cluster_dims(v["cluster"], dims, f"{where}.cluster") if "cluster" in v else None
            for suffix, host, lv, z0, z1, thr, tk in self.via_spans(str(v["through"]), where, zmin):
                if z1 - z0 <= 0:
                    raise TemplateError(f"{where}: empty z span through {thr}")
                vo: dict[str, Any] = {"id": vid + suffix, "template_id": vid, "name": v.get("name", vid),
                                      "kind": v["kind"], "part": host, "through": thr, "through_kind": tk,
                                      "z_um": rnd(z0), "h_um": rnd(z1 - z0),
                                      "upper": None if tk == "part" else self.via_end(host, lv, z1, "top", where, zmin),
                                      "lower": None if tk == "part" else self.via_end(host, lv, z0, "bottom", where,
                                                                                         zmin)}
                linsts = self.levels(host)[lv]
                if len(linsts) > 1:
                    vo["instances"] = [i.id for i in linsts]
                if "region" in v:
                    rects = self.array_region({"region": v["region"]}, linsts, where)
                    for rc in rects:
                        if not any(inside(rc, i.rect) for i in linsts):
                            self.f.warnings.append(f"via {vo['id']}: region {[rnd(c) for c in rc]} not inside {host}")
                    vo["regions"] = [dict(zip(("x_mm", "y_mm", "w_mm", "d_mm"), (rnd(c) for c in rect_xywd(rc))))
                                     for rc in rects]
                for k in VIA_DIMS:
                    if k in dims:
                        vo[k] = rnd(dims[k].num(f"{where}.{k}"))
                if v.get("fill") is not None:
                    vo["fill"] = v["fill"]
                if v.get("plug") is not None:
                    vo["plug"] = v["plug"]
                if cdims is not None:
                    vo["cluster"] = {"n": int(cdims["n"].num("n")), "pitch_um": rnd(cdims["pitch_um"].num("pitch_um")),
                                     "dims": {k: dim_json(x, refs) for k, x in cdims.items()}}
                if v.get("note"):
                    vo["note"] = v["note"]
                vo["dims"] = {k: dim_json(x, refs) for k, x in dims.items()}
                vias_out.append(vo)
            self.count(f"via {vid}", dims)
            if cdims is not None:
                self.count(f"via {vid} cluster", cdims)
        array_ids = set(self.adecl) | {a["id"] for a in arrays_out}
        nets_out: list[dict] = []
        seen = set()
        for ni, n in enumerate(spec.get("nets") or []):
            nid = n.get("id") if isinstance(n, dict) else None
            where = f"routing.nets.{nid or ni}"
            if not nid:
                raise TemplateError(f"{where}: net class needs an id")
            if nid in seen:
                raise TemplateError(f"{where}: duplicate net id")
            seen.add(nid)
            bad = set(n) - NET_KEYS
            if bad:
                raise TemplateError(f"{where}: unknown keys {sorted(bad)} (allowed {sorted(NET_KEYS)})")
            kind = n.get("kind")
            if kind not in NET_KINDS:
                raise TemplateError(f"{where}: kind {kind!r} not in {sorted(NET_KINDS)}")
            need = {"vertical": ("from", "to"), "lateral": ("from", "to", "levels"), "plane_tie": ("from", "plane"),
                    "escape": ("from", "levels")}[str(kind)]
            miss = [k for k in (*need, "share") if k not in n]
            if miss:
                raise TemplateError(f"{where}: a {kind} net needs {', '.join(miss)}")
            for k in ("from", "to"):
                if k in n and str(n[k]) not in array_ids:
                    raise TemplateError(f"{where}: {k} {n[k]!r} is not an array id")
            no: dict[str, Any] = {"id": nid, "kind": kind, "from": str(n["from"])}
            if "to" in n:
                no["to"] = str(n["to"])
            if kind == "vertical":
                style = n.get("style", "stacked")
                if style not in NET_STYLES:
                    raise TemplateError(f"{where}: style {style!r} not in {sorted(NET_STYLES)}")
                no["style"] = style
            elif "style" in n:
                raise TemplateError(f"{where}: `style` applies to vertical nets only")
            for k, uses in (("jog", ROUTE_LS_USES), ("levels", ROUTE_LS_USES)):
                if k in n:
                    ids = self.layer_refs(n[k], f"{where}.{k}")
                    self.check_levels(ids, uses, f"{where}.{k}")
                    no[k] = ids
            if "plane" in n:
                ids = self.layer_refs([n["plane"]], f"{where}.plane")
                if len(ids) != 1:
                    raise TemplateError(f"{where}.plane: {n['plane']!r} names {len(ids)} layers; name one repeat")
                self.check_levels(ids, {"plane"}, f"{where}.plane")
                no["plane"] = ids[0]
            dims = {}
            for k in ("share", "length_um"):
                if k not in n:
                    continue
                x = n[k]
                if isinstance(x, (int, float)) and not isinstance(x, bool):  # net layout numbers: template + layout_note
                    dims[k] = Val(float(x), name_unit(k), "template", note=note)
                else:
                    dims[k] = self.r(x, k, f"{where}.{k}")
                no[k] = rnd(dims[k].num(f"{where}.{k}"))
            if not 0 < no["share"] <= 1:
                raise TemplateError(f"{where}: share {no['share']} not in (0, 1]")
            if "length_um" in no and no["length_um"] <= 0:
                raise TemplateError(f"{where}: length_um must be > 0")
            if n.get("note"):
                no["note"] = n["note"]
            no["dims"] = {k: dim_json(x, refs) for k, x in dims.items()}
            nets_out.append(no)
            self.count(f"net {nid}", dims)
        return {"layout_note": note, "vias": vias_out, "nets": nets_out}

    def source_tvs(self) -> list[str]:
        tvs: list[str] = []
        bb = self.tpl.get("backbone_tv", "")
        if bb:
            tvs.append(bb)
        for v in self.f.params.values():
            if v.status in {"reported", "derived"}:
                for c in v.cells:
                    table, row = self.f.db.rows[c.rsplit(".", 1)[0]]
                    tv = self.f.db.tv_of(table, row)
                    if tv and tv["tv_id"] not in tvs:
                        tvs.append(tv["tv_id"])
        return tvs

    def place(self, aid: str, a: dict, base: Inst | None) -> tuple:
        """Vertical placement of one array (one per `per` instance): (suffix, z0, z1, between, mount, src)."""
        dims = self.adims[aid]
        where = f"arrays.{aid}"
        per = a.get("per")
        upper = base.id if base else a.get("upper")
        utid = per if per else a.get("upper")
        src: list[Inst] | None = [base] if base else None
        if "span" in a:
            z0, z1 = self.anchor(a["span"][0]), self.anchor(a["span"][1])
            host = a.get("host") or a["span"][1].split(":", 1)[1]
            between, mount = [host, host], "span"
        elif "in" in a:
            if self.nz.get(a["in"], 1) > 1:
                raise TemplateError(f"{where}: `per` + `in:` a vertically repeated host is not supported")
            z0, z1 = self.zpos(a["in"]), self.top(a["in"])
            between, mount = [a["in"], a["in"]], "in"
        elif "in_layer" in a:
            z0, z1, host = self.layer_span(a["in_layer"], where)
            between, mount = [host, host], "in"
            if src is None:
                src = self.insts[host]
        elif "under" in a:
            hgt = dims["height_um"].num(where)
            z1 = self.zpos(a["under"])
            z0 = z1 - hgt
            between, mount = [self.label_bottom(a["under"])] * 2, "under"
        else:
            lower = a.get("lower")
            if not (utid and lower):
                raise TemplateError(f"{where}: needs per/upper + lower, in, in_layer, under or span")
            if base is not None and base.zk > 0:  # stacked part: level k sits on level k-1
                prev = self.level_inst(str(per), base.zk - 1, base.xk)
                z0, low_lab = self.itop(prev), prev.id
            else:
                z0, low_lab = self.top(lower), self.label_top(lower)
            z1 = self.iz(base) if base else self.zpos(utid)
            between, mount = [upper if base else self.label_bottom(utid), low_lab], "between"
            if "height_um" in dims and abs((z1 - z0) - dims["height_um"].num(where)) > 1e-6:
                self.f.warnings.append(f"array {aid}{'' if not base else ' ' + base.id}: gap {fmt(z1 - z0)} um != "
                                       f"joint height {fmt(dims['height_um'].num(where))} um")
        if "between" in a:  # explicit [upper, lower] labels; must be declared parts
            for t in a["between"]:
                if t not in self.pdecl:
                    raise TemplateError(f"{where}: between names unknown part {t!r}")
            between = [base.id if (base and a["between"][0] == per) else a["between"][0], a["between"][1]]
        return ("" if not base else f"_{base.id}"), z0, z1, between, mount, src

    def build_array(self, aid: str, a: dict) -> list[dict]:
        f, refs = self.f, self.refs
        dims = self.adims[aid]
        where = f"arrays.{aid}"
        per = a.get("per")
        places: list[tuple] = []
        if per:
            places = [self.place(aid, a, base) for base in self.insts[per]]
        elif "in" in a and self.nz.get(a["in"], 1) > 1:  # one array per vertical level of the host
            host = a["in"]
            for lv, linsts in enumerate(self.levels(host)):
                z0 = self.iz(linsts[0])
                one = len(linsts) == 1
                places.append((f"_{linsts[0].id}" if one else f"_z{lv + 1}", z0, z0 + self.h[host],
                               [linsts[0].id] * 2 if one else [host, host], "in", linsts))
        elif "in_layer" in a and len({e[3] for e in self.lz.get(a["in_layer"], [])}) > 1:  # stacked host
            ent = self.lz[a["in_layer"]]
            host = ent[0][2]
            if len({e[2] for e in ent}) > 1:
                raise TemplateError(f"{where}: in_layer {a['in_layer']!r} spans several hosts")
            for lv, linsts in enumerate(self.levels(host)):
                zs = [(e[0], e[1]) for e in ent if e[3] == lv]
                one = len(linsts) == 1
                places.append((f"_{linsts[0].id}" if one else f"_z{lv + 1}", min(z[0] for z in zs),
                               max(z[1] for z in zs), [linsts[0].id] * 2 if one else [host, host], "in", linsts))
        else:
            places = [self.place(aid, a, None)]
        pitch = dims["pitch_um"].num(where)
        if "diameter_um" in dims and dims["diameter_um"].num(where) >= pitch:
            f.warnings.append(f"array {aid}: diameter >= pitch")
        for k in ("pad_um", "opening_um"):
            if k in dims and dims[k].num(where) >= pitch:
                f.warnings.append(f"array {aid}: {k} >= pitch")
        rep = self.arep.get(aid)
        out = []
        for suffix, z0, z1, between, mount, src in places:
            if z1 - z0 <= 0:
                raise TemplateError(f"{where}: empty z span ({fmt(z0)}..{fmt(z1)} um)")
            rects = self.array_region(a, src, where, level_src=(mount == "in" and not per and src is not None))
            reps = [(0.0, "")]
            if rep and rep[0] > 1:
                zp = rep[1] if rep[1] is not None else z1 - z0
                reps = [(k * zp, f"_z{k + 1}") for k in range(rep[0])]
            for dz, zsuf in reps:
                for ri, rect in enumerate(rects):
                    x, y, w, d = rect_xywd(rect)
                    rid_ = aid + suffix + zsuf + ((f"_{chr(97 + ri)}" if ri < 26 else f"_r{ri + 1}") if len(rects) > 1 else "")
                    ao = {"id": rid_, "name": a.get("name", aid), "kind": a["kind"], "between": between,
                          "mount": mount, "region": {"x_mm": rnd(x), "y_mm": rnd(y), "w_mm": rnd(w), "d_mm": rnd(d)},
                          "z_um": z0 + dz, "h_um": rnd(z1 - z0), "pitch_um": rnd(pitch)}
                    for k in ("diameter_um", "height_um"):
                        if k in dims:
                            ao[k] = rnd(dims[k].num(where))
                    for k in ARRAY_PAD_DIMS:
                        if k in dims:
                            ao[k] = rnd(dims[k].num(where))
                    ao.setdefault("height_um", rnd(z1 - z0))  # in/span arrays: the element spans its host range
                    ao["count_est"] = int(math.floor(w * 1000 / pitch + 1e-9) * math.floor(d * 1000 / pitch + 1e-9))
                    ao["template_id"] = aid
                    if "in_layer" in a:
                        ao["layer"] = a["in_layer"]
                    if a.get("note"):
                        ao["note"] = a["note"]
                    ao["dims"] = {k: dim_json(v, refs) for k, v in dims.items()}
                    self.az[rid_] = (z0 + dz, z1 + dz)
                    out.append(ao)
        if out and aid not in self.az:
            self.az[aid] = (min(o["z_um"] for o in out), max(o["z_um"] + o["h_um"] for o in out))
        self.count(f"array {aid}", dims)
        return out

    def array_region(self, a: dict, src: list[Inst] | None, where: str, *, level_src: bool = False) -> list[Rect]:
        reg = a.get("region") or {}
        if "x_mm" in reg:
            vals = {k: self.r(reg[k], k, f"{where}.region.{k}").num(where) for k in ("x_mm", "y_mm", "w_mm", "d_mm")}
            return [rect_of(vals["x_mm"], vals["y_mm"], vals["w_mm"], vals["d_mm"])]
        if "part" in reg:
            srcs = src if (level_src and src and reg["part"] == src[0].tid) else self.insts[reg["part"]]
        elif src is not None:
            srcs = src
        else:
            host = a.get("in") or a.get("under") or a.get("upper")
            if not host:
                raise TemplateError(f"{where}: region needs a part")
            srcs = self.insts[host]
        rects = [i.rect for i in srcs]
        if len(srcs) > 1 and len({i.zk for i in srcs}) > 1:  # stacked part: one footprint per xy position
            rects = [i.rect for i in srcs if i.zk == 0]
        for t in reg.get("intersect", []):
            nxt = []
            for r in rects:
                for i in self.insts[t]:
                    if i.zk:
                        continue
                    x = intersect(r, i.rect)
                    if x:
                        nxt.append(x)
            rects = nxt
        for t in reg.get("subtract", []):
            for i in self.insts[t]:
                if i.zk:
                    continue
                rects = [s for r in rects for s in subtract(r, i.rect)]
        if not rects:
            raise TemplateError(f"{where}: empty region")
        return rects

    def sanity(self, parts: list[dict]) -> None:
        f = self.f
        by_tid: dict[str, list[dict]] = {}
        for p in parts:
            by_tid.setdefault(p["template_id"], []).append(p)

        def rect(p: dict) -> Rect:
            return rect_of(p["x_mm"], p["y_mm"], p["w_mm"], p["d_mm"])

        for tid, decl in self.pdecl.items():
            parent = decl.get("on") or decl.get("in") or decl.get("under")
            if parent and decl.get("shape") != "frame":
                prs = by_tid[parent]
                for p in by_tid[tid]:
                    if not any(inside(rect(p), rect(q)) for q in prs):
                        f.warnings.append(f"part {p['id']}: footprint not inside {parent}")
        solids = [p for p in parts if p["kind"] not in {"underfill"}]
        for i, a in enumerate(solids):
            for b in solids[i + 1:]:
                if a["template_id"] == b["template_id"] and self.pdecl[a["template_id"]].get("shape") == "frame":
                    continue
                if a.get("in") == b["id"] or b.get("in") == a["id"]:
                    continue
                za, zb = (a["z_um"], a["z_um"] + a["h_um"]), (b["z_um"], b["z_um"] + b["h_um"])
                if min(za[1], zb[1]) - max(za[0], zb[0]) > 1e-6:
                    x = intersect(rect(a), rect(b))
                    if x and (x[2] - x[0]) * (x[3] - x[1]) > 1e-6:
                        f.warnings.append(f"parts {a['id']} and {b['id']} overlap")

    def fill_text(self, text: str, where: str) -> tuple[str, list[str]]:
        cells: list[str] = []

        def sub(m: re.Match) -> str:
            v = self.f.param(m.group(1))
            if v.status == "template":
                raise TemplateError(f"{where}: placeholder {{{m.group(1)}}} is a template value; text shows only "
                                    f"reported/derived values")
            cells.extend(v.cells)
            return fmt(v.value)

        out = re.sub(r"\{([A-Za-z_][A-Za-z0-9_]*)\}", sub, " ".join(str(text).split()))
        return out, [self.refs.rid(c) for c in dict.fromkeys(cells)]

    def callout(self, c: dict) -> dict:
        where = f"callout {c['target']}"
        text, rids = self.fill_text(c["text"], where)
        if len(text.split()) > CALLOUT_MAX_WORDS:
            self.f.warnings.append(f"{where}: text has {len(text.split())} words (> {CALLOUT_MAX_WORDS}); move detail "
                                   f"to `note`: {text!r}")
        note = ""
        if c.get("note"):
            note, nrids = self.fill_text(c["note"], f"{where} note")
            rids += [r for r in nrids if r not in rids]
        for key in c.get("refs", []):
            raw, table, row = self.f.db.cell(key)
            self.f.check_family(key, table, row, where)
            rid = self.refs.rid(key)
            if rid not in rids:
                rids.append(rid)
        out = {"target": c["target"], "text": text}
        if note:
            out["note"] = note
        out["refs"] = rids
        return out

    def inset(self, i: dict, zmin: float) -> dict:
        where = f"insets.{i['id']}"
        box = []
        for v in i["box_mm"]:
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                box.append(float(v))  # view framing, not a rendered dimension
            else:
                val, _ = eval_expr(str(v), lambda n: self.f.param(n).num(where), where)
                box.append(val)
        if box[2] <= box[0] or box[3] <= box[1]:
            raise TemplateError(f"{where}: empty box {box}")
        z0 = self.anchor(i["z"][0], arrays=True) - zmin
        z1 = self.anchor(i["z"][1], arrays=True) - zmin
        if z1 <= z0:
            raise TemplateError(f"{where}: empty z range")
        cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
        return {"id": i["id"], "label": i["label"], "box_mm": [rnd(b) for b in box], "z_um": [rnd(z0), rnd(z1)],
                "camera": {"view": i.get("view", "front"), "target": [rnd(cx), rnd(cy), rnd((z0 + z1) / 2)],
                           "span_mm": rnd(max(box[2] - box[0], box[3] - box[1]))}}


# ----------------------------------------------------------------------------- main


class TemplateLoader(yaml.SafeLoader):
    """SafeLoader where only true/false are booleans (YAML 1.1 reads the key `on:` as True)."""


TemplateLoader.yaml_implicit_resolvers = {
    k: [(tag, rx) for tag, rx in v if tag != "tag:yaml.org,2002:bool"]
    for k, v in yaml.SafeLoader.yaml_implicit_resolvers.items()
}
TemplateLoader.add_implicit_resolver("tag:yaml.org,2002:bool", re.compile(r"^(?:true|True|TRUE|false|False|FALSE)$"),
                                     list("tTfF"))


RENAME_FIELDS = {"id", "name", "material_label", "note"}
PART_REFS = ("on", "in", "under", "standoff")
ARRAY_REFS = ("per", "upper", "lower", "in", "under", "host")


def module_drop(mod: dict, names: list[str], where: str) -> None:
    """Remove module elements by id: parts, arrays, layer elements (and groups hosted on dropped parts), params,
    routing via / net classes, callouts that target a dropped id, and via / net classes that name a dropped element
    (via `through`; net from / to / plane / jog / levels, incl. `<layer>_<k>` repeats)."""
    names_s = {str(n) for n in names}
    found: set[str] = set()
    for key in ("parts", "arrays"):
        keep = []
        for x in mod.get(key) or []:
            if x.get("id") in names_s:
                found.add(x["id"])
            else:
                keep.append(x)
        mod[key] = keep
    dropped_parts = {n for n in names_s if n in found}
    groups = []
    dropped_layers: set[str] = set()  # layer elements (and groups) gone, for the routing that names them
    for g in mod.get("layers") or []:
        if g.get("part") in dropped_parts:
            dropped_layers |= {el["id"] for el in g.get("pattern", []) if el.get("id")} | {g.get("id") or ""}
            continue
        pat = [el for el in g.get("pattern", []) if el.get("id") not in names_s]
        found |= {el["id"] for el in g.get("pattern", []) if el.get("id") in names_s}
        dropped_layers |= {el["id"] for el in g.get("pattern", []) if el.get("id") in names_s}
        if pat:
            groups.append({**g, "pattern": pat})
    mod["layers"] = groups
    params = mod.get("params") or {}
    for n in names_s & set(params):
        del params[n]
        found.add(n)
    mod["callouts"] = [c for c in mod.get("callouts") or [] if c.get("target") not in names_s]
    rt = mod.get("routing")
    if isinstance(rt, dict):  # via / net classes by id; then those that name a dropped element
        for key in ("vias", "nets"):
            found |= {x["id"] for x in rt.get(key) or [] if x.get("id") in names_s}

        dropped_layers.discard("")

        def gone(ref: Any) -> bool:  # a dropped id, or a repeat `<layer>_<k>` of a dropped layer element
            r = str(ref)
            return r in names_s or r in dropped_layers or any(r.startswith(f"{n}_") for n in dropped_layers)

        rt["vias"] = [v for v in rt.get("vias") or [] if v.get("id") not in names_s and not gone(v.get("through"))]
        rt["nets"] = [x for x in rt.get("nets") or [] if x.get("id") not in names_s and not any(
            gone(r) for r in [x.get("from"), x.get("to"), x.get("plane"), *(x.get("jog") or []),
                              *(x.get("levels") or [])] if r is not None)]
    missing = names_s - found
    if missing:
        raise TemplateError(f"{where}: drop names nothing in the module: {sorted(missing)}")


def module_rename(mod: dict, ren: dict, where: str) -> None:
    """Rename module element ids ({old: new}) and/or patch display fields ({old: {id?, name?, material_label?,
    note?}}). Every reference inside the module (stacking, standoff, fill, per/upper/lower/in/under, region,
    span anchors, between, layer hosts, callout targets, via `through`, net from / to / plane / jog / levels incl.
    `<layer>_<k>` repeats) follows the new id."""
    idmap: dict[str, str] = {}
    patch: dict[str, dict] = {}
    for old, v in ren.items():
        if isinstance(v, str):
            idmap[old] = v
        elif isinstance(v, dict):
            bad = set(v) - RENAME_FIELDS
            if bad:
                raise TemplateError(f"{where}: rename {old}: only {sorted(RENAME_FIELDS)} can be changed, not {sorted(bad)}")
            if "id" in v:
                idmap[old] = str(v["id"])
            patch[old] = {k: x for k, x in v.items() if k != "id"}
        else:
            raise TemplateError(f"{where}: rename {old}: want a new id or a dict of display fields")
    mrt = mod.get("routing")
    rt: dict = mrt if isinstance(mrt, dict) else {}
    layer_els = [el for g in mod.get("layers") or [] for el in g.get("pattern", [])]
    layer_ids = {str(el.get("id")) for el in layer_els}
    elems = [*(mod.get("parts") or []), *(mod.get("arrays") or []), *layer_els, *(rt.get("vias") or []),
             *(rt.get("nets") or [])]
    known = {x.get("id") for x in elems}
    missing = set(ren) - known
    if missing:
        raise TemplateError(f"{where}: rename names nothing in the module: {sorted(missing)}")

    def m(x: Any) -> Any:
        return idmap.get(x, x) if isinstance(x, str) else x

    def anchor(s: str) -> str:
        side, sep, name = s.partition(":")
        return f"{side}{sep}{m(name)}" if sep else s

    def ml(x: Any) -> Any:  # layer reference: exact id, or `<layer>_<k>` of a renamed layer element (longest match)
        if not isinstance(x, str) or x in idmap:
            return m(x)
        olds = [o for o in idmap if o in layer_ids and x.startswith(f"{o}_")]
        if not olds:
            return x
        o = max(olds, key=len)
        return idmap[o] + x[len(o):]

    for el in elems:
        old = el.get("id")
        for k, v in patch.get(old, {}).items():
            el[k] = v
        el["id"] = m(old)
    for p in mod.get("parts") or []:
        for k in PART_REFS:
            if k in p:
                p[k] = m(p[k])
        if "fill" in p:
            fl = p["fill"]
            for k in ("above", "per"):
                if k in fl:
                    fl[k] = m(fl[k])
            if "parts" in fl:
                fl["parts"] = [m(x) for x in fl["parts"]]
    for a in mod.get("arrays") or []:
        for k in ARRAY_REFS:
            if k in a:
                a[k] = m(a[k])
        if "between" in a:
            a["between"] = [m(x) for x in a["between"]]
        if "span" in a:
            a["span"] = [anchor(x) for x in a["span"]]
        reg = a.get("region")
        if isinstance(reg, dict):
            if "part" in reg:
                reg["part"] = m(reg["part"])
            for k in ("intersect", "subtract"):
                if k in reg:
                    reg[k] = [m(x) for x in reg[k]]
    for g in mod.get("layers") or []:
        g["part"] = m(g.get("part"))
        for el in g.get("pattern", []):
            rte = el.get("route")
            for rr in (rte.get("regions") or []) if isinstance(rte, dict) else []:
                reg = rr.get("region") if isinstance(rr, dict) else None
                if isinstance(reg, dict):
                    if "part" in reg:
                        reg["part"] = m(reg["part"])
                    for k in ("intersect", "subtract"):
                        if k in reg:
                            reg[k] = [m(x) for x in reg[k]]
    for c in mod.get("callouts") or []:
        c["target"] = m(c.get("target"))
    for v in rt.get("vias") or []:
        if "through" in v:
            v["through"] = ml(v["through"])
        reg = v.get("region")
        if isinstance(reg, dict):
            if "part" in reg:
                reg["part"] = m(reg["part"])
            for k in ("intersect", "subtract"):
                if k in reg:
                    reg[k] = [m(x) for x in reg[k]]
    for n in rt.get("nets") or []:
        for k in ("from", "to"):
            if k in n:
                n[k] = m(n[k])
        if "plane" in n:
            n["plane"] = ml(n["plane"])
        for k in ("jog", "levels"):
            if isinstance(n.get(k), list):
                n[k] = [ml(x) for x in n[k]]


def expand_modules(path: Path, tpl: dict) -> dict:
    """Apply `use: [{module, from?, drop?, rename?}]`: merge named `modules:` blocks into the template.

    A module is {params, parts, layers, arrays, callouts, routing}. `from` names another template file in config/package3d
    (default: this file). `drop: [ids]` removes module elements first, then `rename: {old: new | {id?, name?,
    material_label?, note?}}` renames ids (references follow) or patches display fields; both use the module's
    original ids. The template wins on conflicts: its own params, parts/arrays with the same id and layer groups on
    the same host part replace the module's. Module callouts are appended. Routing via / net classes merge by id
    (template wins), and the template's `layout_note` wins over the module's. Modules cannot `use` others.
    """
    uses = tpl.get("use") or []
    if not uses:
        return tpl
    tpl = copy.deepcopy(tpl)
    for u in uses:
        if not isinstance(u, dict) or "module" not in u:
            raise TemplateError(f"{path.name}: bad `use` entry {u!r} (want {{module, from?, drop?, rename?}})")
        bad = set(u) - {"module", "from", "drop", "rename"}
        if bad:
            raise TemplateError(f"{path.name}: unknown `use` keys {sorted(bad)}")
        src = CONFIG / u["from"] if u.get("from") else path
        if u.get("from") and not src.exists():
            raise TemplateError(f"{path.name}: module file not found: {u['from']}")
        stpl = tpl if src == path else (yaml.load(src.read_text(), Loader=TemplateLoader) or {})  # noqa: S506
        mods = stpl.get("modules") or {}
        if u["module"] not in mods:
            raise TemplateError(f"{path.name}: module {u['module']!r} not in {src.name}")
        mod = copy.deepcopy(mods[u["module"]])
        where = f"{path.name}: use {u['module']}"
        if u.get("drop"):
            module_drop(mod, list(u["drop"]), where)
        if u.get("rename"):
            module_rename(mod, dict(u["rename"]), where)
        params = tpl.setdefault("params", {}) or {}
        tpl["params"] = params
        for k, v in (mod.get("params") or {}).items():
            params.setdefault(k, v)
        for key in ("parts", "arrays"):
            own = list(tpl.get(key) or [])
            ids = {x.get("id") for x in own}
            tpl[key] = own + [x for x in mod.get(key) or [] if x.get("id") not in ids]
        own_layers = list(tpl.get("layers") or [])
        hosts = {g.get("part") for g in own_layers}
        tpl["layers"] = own_layers + [g for g in mod.get("layers") or [] if g.get("part") not in hosts]
        tpl["callouts"] = list(tpl.get("callouts") or []) + list(mod.get("callouts") or [])
        mrt = mod.get("routing")
        if mrt:  # via / net classes merge by id like arrays; the template's layout_note wins
            if not isinstance(mrt, dict):
                raise TemplateError(f"{where}: module routing must be a mapping")
            trt = dict(tpl.get("routing") or {})
            if not trt.get("layout_note") and mrt.get("layout_note"):
                trt["layout_note"] = mrt["layout_note"]
            for key in ("vias", "nets"):
                own = list(trt.get(key) or [])
                ids = {x.get("id") for x in own}
                trt[key] = own + [x for x in mrt.get(key) or [] if x.get("id") not in ids]
            tpl["routing"] = trt
    return tpl


def merge_by_id(base: list, over: list, where: str, key: str = "id") -> list:
    """Replace base entries that share `key` with an overlay entry (in place); append the others."""
    out = list(base)
    pos = {x.get(key): i for i, x in enumerate(out) if isinstance(x, dict)}
    for x in over:
        if not isinstance(x, dict) or not x.get(key):
            raise TemplateError(f"{where}: entry without `{key}`: {x!r}")
        if x[key] in pos:
            out[pos[x[key]]] = x
        else:
            pos[x[key]] = len(out)
            out.append(x)
    return out


def variant_spec(path: Path, tpl: dict) -> dict | None:
    """Validate a template's `variants:` block; None when absent."""
    vs = tpl.get("variants")
    if vs is None:
        return None
    where = f"{path.name}: variants"
    if not isinstance(vs, dict):
        raise TemplateError(f"{where}: must be a mapping {{base, default, list}}")
    bad = set(vs) - VARIANTS_KEYS
    if bad:
        raise TemplateError(f"{where}: unknown keys {sorted(bad)}")
    base = vs.get("base") or {}
    if not isinstance(base, dict) or set(base) - {"id", "name", "note"} or not base.get("id") or not base.get("name"):
        raise TemplateError(f"{where}: base needs {{id, name, note?}}")
    lst = vs.get("list") or []
    if not isinstance(lst, list) or not lst:
        raise TemplateError(f"{where}: list must be a non-empty list")
    ids = [str(base["id"])]
    for v in lst:
        if not isinstance(v, dict):
            raise TemplateError(f"{where}: bad entry {v!r}")
        badk = set(v) - VARIANT_KEYS
        if badk:
            raise TemplateError(f"{where}.{v.get('id')}: unknown keys {sorted(badk)}")
        if not v.get("id") or not v.get("name") or not v.get("note"):
            raise TemplateError(f"{where}: each variant needs id, name and note")
        ids.append(str(v["id"]))
    for i in ids:
        if not VARIANT_ID.fullmatch(i):
            raise TemplateError(f"{where}: bad variant id {i!r} (lowercase letters, digits, _)")
    if len(set(ids)) != len(ids):
        raise TemplateError(f"{where}: duplicate variant ids {ids}")
    if str(vs.get("default", base["id"])) not in ids:
        raise TemplateError(f"{where}: default {vs.get('default')!r} is not a variant id")
    return vs


def apply_variant(tpl: dict, var: dict, where: str) -> dict:
    """Overlay one variant on an expanded template (the variant wins). `drop` removes elements like a module drop
    (parts, arrays, layer elements, params, via / net classes, callouts on dropped targets) plus insets by id;
    `callouts_drop` removes base callouts by their exact `text`; params merge by name; parts, arrays, insets and via /
    net classes merge by id (replace in place, else append); layer groups replace every base group on the same host
    part; callouts are appended; `summary` replaces the summary."""
    t = copy.deepcopy(tpl)
    for k in ("variants", "modules", "use"):
        t.pop(k, None)
    if var.get("drop"):
        names = [str(n) for n in var["drop"]]
        ins_ids = {i.get("id") for i in t.get("insets") or []}
        t["insets"] = [i for i in t.get("insets") or [] if i.get("id") not in names]
        other = ({x.get("id") for k in ("parts", "arrays") for x in t.get(k) or []}
                 | {el.get("id") for g in t.get("layers") or [] for el in g.get("pattern", [])}
                 | set(t.get("params") or {})
                 | {x.get("id") for k in ("vias", "nets") for x in (t.get("routing") or {}).get(k) or []})
        rest = [n for n in names if n not in ins_ids or n in other]
        if rest:
            module_drop(t, rest, f"{where}: drop")
    for txt in var.get("callouts_drop") or []:
        before = len(t.get("callouts") or [])
        t["callouts"] = [c for c in t.get("callouts") or [] if c.get("text") != txt]
        if len(t["callouts"]) == before:
            raise TemplateError(f"{where}: callouts_drop names no callout text: {txt!r}")
    if var.get("params"):
        t["params"] = {**(t.get("params") or {}), **var["params"]}
    for key in ("parts", "arrays", "insets"):
        if var.get(key):
            t[key] = merge_by_id(t.get(key) or [], var[key], f"{where}.{key}")
    if var.get("layers"):
        hosts = {g.get("part") for g in var["layers"]}
        out, placed = [], set()
        for g in t.get("layers") or []:
            h = g.get("part")
            if h in hosts:
                if h not in placed:
                    out += [x for x in var["layers"] if x.get("part") == h]
                    placed.add(h)
                continue
            out.append(g)
        out += [x for x in var["layers"] if x.get("part") not in placed]
        t["layers"] = out
    if var.get("callouts"):
        t["callouts"] = list(t.get("callouts") or []) + list(var["callouts"])
    vrt = var.get("routing")
    if vrt:
        if not isinstance(vrt, dict) or set(vrt) - ROUTING_KEYS:
            raise TemplateError(f"{where}: routing takes {{layout_note?, vias?, nets?}}")
        rt = dict(t.get("routing") or {})
        if vrt.get("layout_note"):
            rt["layout_note"] = vrt["layout_note"]
        for key in ("vias", "nets"):
            if vrt.get(key):
                rt[key] = merge_by_id(rt.get(key) or [], vrt[key], f"{where}.routing.{key}")
        t["routing"] = rt
    if var.get("summary"):
        t["summary"] = var["summary"]
    if var.get("backbone_tv"):
        t["backbone_tv"] = var["backbone_tv"]
    return t


def families_yaml() -> list[dict]:
    fam_file = CONFIG / "families.yaml"
    if not fam_file.exists():
        return []
    try:
        fy = yaml.safe_load(fam_file.read_text())
    except yaml.YAMLError as e:
        raise TemplateError(f"families.yaml does not parse (family order and `families: true` rules need it): {e}") from None
    items = fy.get("families", fy) if isinstance(fy, dict) else fy
    if isinstance(items, dict):
        return [{"id": k, **(v or {})} for k, v in items.items()]
    return [x for x in items or [] if isinstance(x, dict) and x.get("id")]


def family_rules() -> dict[str, str]:
    """families.yaml id -> match_rule string (for `family_match: {families: true}`)."""
    return {x["id"]: str(x["match_rule"]) for x in families_yaml() if x.get("match_rule")}


def load_templates() -> list[tuple[Path, dict]]:
    order = [x["id"] for x in families_yaml()]
    out = []
    for path in sorted(CONFIG.glob("*.y*ml")):
        if path.name in SKIP_FILES:
            continue
        tpl = yaml.load(path.read_text(), Loader=TemplateLoader)  # noqa: S506 (safe subclass)
        if not isinstance(tpl, dict) or not tpl.get("parts"):
            continue
        out.append((path, tpl))
    rank = {fid: i for i, fid in enumerate(order)}
    out.sort(key=lambda pt: (rank.get(pt[1].get("id", pt[0].stem), len(rank)), pt[0].name))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--check", action="store_true", help="resolve and validate only; do not write")
    args = ap.parse_args()
    db = DB()
    refs = Refs(db)
    try:
        rules = family_rules()
        templates = load_templates()
    except TemplateError as e:
        print(f"ERROR {e}", file=sys.stderr)
        return 1
    families = []
    errors = 0
    pending: list[tuple[Path, dict, dict, dict]] = []  # (path, expanded template, variants block, base output)

    def report(out: dict, label: str, b: Builder, fam: Family) -> None:
        c, s = out["dim_counts"], out["completeness"]
        print(f"== {label}: {len(out['parts'])} parts, {len(out['layers'])} layers, "
              f"{len(out['arrays'])} arrays, {len(out['insets'])} insets")
        print(f"   dims: reported {c['reported']} ({s['reported']:.0%}), derived {c['derived']} ({s['derived']:.0%}), "
              f"template {c['template']} ({s['template']:.0%})")
        print(f"   source TVs: {', '.join(out['source_tvs'])}")
        for t in b.template_list:
            print(f"   template: {t}")
        for w in fam.warnings:
            print(f"   WARN: {w}")

    for path, tpl in templates:
        try:
            vs = variant_spec(path, tpl)
            etpl = expand_modules(path, tpl)
            fam = Family(etpl, db, path, rules)
            for name in fam.params_spec:
                fam.param(name)
            b = Builder(fam, refs)
            out = b.build()
        except TemplateError as e:
            errors += 1
            print(f"ERROR {path.name}: {e}", file=sys.stderr)
            continue
        families.append(out)
        report(out, f"{out['id']} ({path.name})", b, fam)
        if vs is not None:
            pending.append((path, etpl, vs, out))
    # variants after every base family, so the R-ids of the base families do not move (L28, 2026-10-21)
    for path, etpl, vs, base_out in pending:
        vouts = []
        for var in vs["list"]:
            vid = str(var["id"])
            try:
                vt = apply_variant(etpl, var, f"{path.name}: variant {vid}")
                fam = Family(vt, db, path, rules)
                for name in fam.params_spec:
                    fam.param(name)
                b = Builder(fam, refs)
                vo = b.build()
            except TemplateError as e:
                errors += 1
                print(f"ERROR {path.name} variant {vid}: {e}", file=sys.stderr)
                continue
            vo["variant"] = vid
            vo["variant_name"] = str(var["name"])
            vo["variant_note"] = " ".join(str(var["note"]).split())
            if var.get("source"):
                vo["variant_source"] = " ".join(str(var["source"]).split())
            vouts.append(vo)
            report(vo, f"{vo['id']}@{vid} ({path.name})", b, fam)
        base = vs["base"]
        base_out["variant"] = str(base["id"])
        base_out["variant_name"] = str(base["name"])
        if base.get("note"):
            base_out["variant_note"] = " ".join(str(base["note"]).split())
        base_out["variant_default"] = str(vs.get("default", base["id"]))
        base_out["variants"] = vouts
    if errors:
        print(f"{errors} template(s) failed", file=sys.stderr)
        return 1
    doc = {"version": 1, "generated": dt.date.today().isoformat(), "conventions": CONVENTIONS, "refs": refs.table,
           "families": families}
    if args.check:
        nv = sum(len(f.get("variants", [])) for f in families)
        print(f"check ok: {len(families)} families, {nv} variants, {len(refs.table)} refs (not written)")
        return 0
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False))
    shown = args.out.resolve().relative_to(ROOT) if args.out.resolve().is_relative_to(ROOT) else args.out
    nv = sum(len(f.get("variants", [])) for f in families)
    print(f"wrote {shown} ({args.out.stat().st_size / 1e3:.1f} kB): {len(families)} families, {nv} variants, "
          f"{len(refs.table)} refs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
