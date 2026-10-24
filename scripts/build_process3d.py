#!/usr/bin/env python3
"""Build app/static/data/process3d.json (contract v1, config/process3d/CONTRACT.md) from the process flows.

Inputs: config/process3d/flows/<id>.yaml (content + provenance, lane L34) and config/process3d/geometry/<id>.yaml
(geometry companion: pieces, sites, bodies, profiles, per-step orient / view / op calls). Format of both:
config/process3d/COMPOSITION.md. Every value resolves through scripts/check_process_flows.py (same specs, ref scope,
units); the refs table has the package3d.json shape.

Modes:
  (default)  strict: any {pending} is an error; writes the JSON when there is no error.
  --draft    a {pending} becomes a template PDim / PText with note "pending: <quantity>" and no value; listed.
  --check    run every check, write nothing (combine with --draft to check a draft build).

Builder checks (CONTRACT.md section 13): PDim status rules; id references and body kinds per op; creation order per
route (no use before creation or after a strip); routes / default / unique ids / monotone n; required op dims;
geometry sanity (z >= 0, openings smaller than their site pitch, solder volume > 0, grind / CMP planes inside the
piece); joined-piece site alignment (the placed piece's solder site lands on a site of the target with the same
pitch); completeness per flow.

Usage: uv run python scripts/build_process3d.py [--check] [--draft] [--flow ID]
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_process_flows as cpf  # noqa: E402

ROOT = cpf.ROOT
OUT = ROOT / "app" / "static" / "data" / "process3d.json"

# ---------------------------------------------------------------- units and keys

UNIT_SUFFIX = [
    ("c_per_min", "C/min"), ("ma_cm2", "mA/cm2"), ("mj_cm2", "mJ/cm2"), ("um_min", "um/min"), ("nm_min", "nm/min"),
    ("um_s", "um/s"), ("mm_s", "mm/s"), ("m_s", "m/s"), ("pa_s", "Pa.s"), ("n_m", "N/m"), ("mpa", "MPa"),
    ("kpa", "kPa"), ("deg", "deg"), ("rpm", "rpm"), ("um", "um"), ("mm", "mm"), ("nm", "nm"), ("c", "C"),
    ("s", "s"), ("n", "N"),
]
UNITLESS = {"cov_side_top", "cov_side_bot", "cov_bottom", "planarization", "efficiency", "step_coverage", "kp",
            "metal_vol_frac"}
TEXT_KEYS = {"equipment", "material", "atmosphere", "ball_alloy", "paste_alloy", "stiff_mat", "ring_mat", "tim",
             "joint_material"}
PLAIN_KEYS = {"rot_deg", "w", "n"}  # view / count parameters (plain numbers)
HUD_LABEL = {  # short human labels (visual audit V1 M2 / m6): quantity only, unit shown by the value
    "temp_c": "T", "temp_c_max": "T peak", "time_s": "time", "ramp_c_per_min": "ramp", "force_n": "force",
    "pressure_mpa": "pressure", "atmosphere": "atmosphere", "thickness_um": "thickness", "thickness_in_um":
    "thickness in", "current_density_ma_cm2": "current density", "dose_mj_cm2": "dose",
    "temp_stage1_c": "T stage 1", "time_stage1_s": "time stage 1", "cure_temp_c": "cure T", "cure_time_s": "cure time",
    "adh_h_um": "adhesive", "al_pitch_um": "Al pitch", "au_um": "Au", "ball_alloy": "ball alloy", "ball_d_um":
    "ball diameter", "ball_h_um": "ball height", "ball_pitch_um": "ball pitch", "barrier_um": "barrier",
    "bottom_up_um_min": "bottom-up rate", "bridge_h_um": "bridge height", "cap_um": "solder cap", "carrier_h_um":
    "carrier", "cav_floor_um": "cavity floor", "cav_pitch_um": "cavity pad pitch", "cav_w_mm": "cavity width",
    "coarse_cap_um": "coarse cap", "coarse_cu_um": "coarse Cu", "coarse_d_um": "coarse diameter",
    "coarse_pitch_um": "coarse pitch", "cu_h_um": "Cu level", "cu_um": "Cu", "cycle_s": "loop time", "diameter_um":
    "diameter", "die_d_mm": "die depth", "die_w_mm": "die width", "equipment": "equipment", "etch_per_cycle_um":
    "etch per loop", "feed_um_s": "infeed", "fine_bot_um": "fine via bottom", "fine_cap_um": "fine cap",
    "fine_cu_um": "fine Cu", "fine_d_um": "fine diameter", "fine_land_um": "fine land", "fine_pitch_um": "fine pitch",
    "foot_h_um": "lid foot", "gamma_n_m": "surface tension", "gap_um": "gap", "grind_depth_um": "grind depth",
    "joint_d_um": "joint diameter", "joint_h_um": "joint height", "kerf_um": "kerf", "land_um": "land", "lid_h_um":
    "lid", "line_um": "line", "liner_loss_um": "liner loss", "liquidus_c": "liquidus", "liquidus_paste_c":
    "paste liquidus", "material": "material", "mold_h0_um": "as-molded", "mu_pa_s": "viscosity", "ni_um": "Ni",
    "overlay_um": "overlay", "pad_d_um": "pad diameter", "pad_pitch_um": "pad pitch", "pad_um": "pad", "paste_alloy":
    "paste alloy", "pitch_um": "pitch", "protrusion_um": "protrusion", "release_um": "release layer", "removal_um":
    "removal", "ring_h_um": "ring height", "ring_mat": "ring material", "ring_w_mm": "ring width", "rr_nm_min":
    "removal rate", "scallop_amp_um": "scallop", "seal_h_um": "sealant", "snag_um": "SnAg", "space_um": "space",
    "sr_h_um": "solder resist", "standoff_um": "standoff", "step_coverage": "step coverage", "stiff_mat":
    "stiffener material", "stiff_w_mm": "stiffener width", "theta_deg": "contact angle", "thinning_2013_um":
    "thinned to (2013)", "ti_um": "Ti", "tim": "TIM", "tim_h_um": "TIM", "tsv_d_um": "TSV diameter",
    "tsv_depth_um": "TSV depth", "ubump_count": "uBump count", "unit_d_mm": "unit depth", "unit_w_mm": "unit width",
    "via_bot_um": "via bottom", "via_d_um": "via diameter", "joint_material": "joint", "imc_melt_c": "IMC first liquid", "stage_temp_c": "stage T",
}


def unit_for(key: str) -> str | None:
    if key in UNITLESS or key.startswith("cov_"):
        return "1"
    for suf, u in (("nm_min", "nm/min"), ("um_min", "um/min"), ("c_per_min", "C/min")):  # rates (V2 n6)
        if key == suf or key.endswith("_" + suf):
            return u
    key = re.sub(r"_(max|min)$", "", key)
    for suf, u in UNIT_SUFFIX:
        if key == suf or key.endswith("_" + suf):
            return u
    return None


def is_dim_key(key: str) -> bool:
    return key not in PLAIN_KEYS and key not in TEXT_KEYS and unit_for(key) is not None


# ---------------------------------------------------------------- op vocabulary (CONTRACT.md section 10)

# arg -> kind: dim | dims (list or one) | id | ids | enum | bool | profiles | at | stages | scan
OP_ARGS: dict[str, dict[str, str]] = {
    "build_stack": {"bodies": "ids", "method": "enum"},
    "etch_via": {"hole": "id", "method": "enum", "etch_per_cycle_um": "dim", "cycle_s": "dim", "rate_um_min": "dim",
                 "mask": "id"},
    "etch_recess": {"cut": "id", "method": "enum", "rate_um_min": "dim", "raster_pitch_um": "dim"},
    "deposit": {"film": "id", "method": "enum", "rate_nm_min": "dim", "temp_c": "dim"},
    "coat": {"body": "id", "method": "enum", "planarization": "dim", "rpm": "dim", "temp_c": "dim",
             "pressure_mpa": "dim"},
    "pattern": {"body": "id", "method": "enum", "tone": "enum", "dose_mj_cm2": "dim", "develop": "bool"},
    "plate": {"bodies": "ids", "mode": "enum", "current_density_ma_cm2": "dims", "efficiency": "dim",
              "rate_um_min": "dims", "bottom_up_um_min": "dim"},
    "strip": {"bodies": "ids", "method": "enum", "keep_under": "ids", "rate_um_min": "dim"},
    "cmp": {"stop_z_um": "dim", "bodies": "ids", "rr_nm_min": "dim", "kp": "dim", "pressure_kpa": "dim",
            "velocity_m_s": "dim", "overpolish_s": "dim", "dishing_um": "dim", "erosion_um": "dim",
            "dish_bodies": "ids"},
    "grind": {"face": "enum", "to_z_um": "dim", "stages": "stages", "reveal": "ids"},
    "reflow": {"solder": "ids", "profile": "id", "liquidus_c": "dim", "peak_c": "dim", "tal_s": "dim",
               "atmosphere": "text"},
    "place": {"piece": "id", "onto": "id", "at": "at", "flip": "bool", "medium": "enum", "medium_body": "id",
              "force_n": "dim", "solder": "ids"},
    "bond_tcb": {"piece": "id", "onto": "id", "at": "at", "flip": "bool", "solder": "ids", "profiles": "profiles",
                 "liquidus_c": "dim", "standoff_um": "dim",
                 "stage_c": "dim"},  # final audit F7: temperature of solder not listed (L34 request to L35)
    "bond_temp": {"carrier": "id", "onto": "id", "adhesive": "ids", "temp_c": "dim", "time_s": "dim",
                  "pressure_mpa": "dim"},
    "debond": {"carrier": "id", "method": "enum", "release": "id", "scan": "scan"},
    "underfill": {"fill": "id", "gap_um": "dim", "gamma_n_m": "dim", "mu_pa_s": "dim", "theta_deg": "dim",
                  "length_mm": "dim", "dispense": "enum", "stage_c": "dim"},
    "mold": {"fill": "id", "method": "enum", "mold_top_z_um": "dim", "temp_c": "dim", "pressure_mpa": "dim",
             "time_s": "dim", "charge": "enum"},
    "cure": {"bodies": "ids", "profile": "id", "temp_c": "dim", "time_s": "dim"},
    "dice": {"piece": "id", "method": "enum", "kerf_um": "dim", "feed_mm_s": "dim", "spindle_rpm": "dim",
             "cut": "id"},
    "ball_attach": {"solder": "ids", "flux": "id", "method": "enum", "profile": "id", "liquidus_c": "dim",
                    "peak_c": "dim"},  # peak_c: L34 request to L35 (audit A1 C1: ball-attach reflow gates remelt)
    "print": {"solder": "ids", "stencil_um": "dim", "method": "enum"},
    "inspect": {"method": "enum", "target": "ids"},
    "etch_lines": {"body": "id", "method": "enum", "rate_um_min": "dim"},          # v1.1
    "clean": {"method": "enum", "bodies": "ids"},                                  # v1.1
}
COMMON_ARGS = {"op", "label", "w", "tool", "duration_s"}
REQUIRED = {
    "cmp": ["stop_z_um"], "grind": ["to_z_um", "stages"], "reflow": ["liquidus_c"],
    "bond_tcb": ["profiles", "liquidus_c"], "underfill": ["gap_um", "gamma_n_m", "mu_pa_s", "theta_deg", "length_mm"],
    "mold": ["mold_top_z_um"], "dice": ["kerf_um"], "ball_attach": ["liquidus_c"], "print": ["stencil_um"],
}
# body kinds an op accepts for its body-id args
KIND_OK = {
    ("etch_via", "hole"): {"hole"}, ("etch_recess", "cut"): {"cut"}, ("deposit", "film"): {"film", "slab"},  # slab: a deposited level with open lines (v1.1)
    ("coat", "body"): {"slab", "fill"}, ("pattern", "body"): {"slab"},
    ("plate", "bodies"): {"post", "solder", "via_fill", "line_fill", "film", "slab"},
    ("etch_lines", "body"): {"slab"}, ("clean", "bodies"): None, ("place", "solder"): {"solder"},
    ("cmp", "bodies"): None, ("reflow", "solder"): {"solder"}, ("bond_tcb", "solder"): {"solder"},
    ("underfill", "fill"): {"fill"}, ("mold", "fill"): {"fill"}, ("cure", "bodies"): None,
    ("ball_attach", "solder"): {"solder"}, ("print", "solder"): {"solder"}, ("debond", "release"): {"slab", "film"},
    ("bond_temp", "adhesive"): {"slab", "fill", "film"}, ("strip", "bodies"): None,
}
CREATES_BODY = {"build_stack": ["bodies"], "etch_via": ["hole"], "etch_recess": ["cut"], "deposit": ["film"],
                "coat": ["body"], "plate": ["bodies"], "underfill": ["fill"], "mold": ["fill"],
                "ball_attach": ["solder"], "print": ["solder"]}
CREATES_PIECE = {"place": "piece", "bond_tcb": "piece", "bond_temp": "carrier"}
REMOVING_STRIP = {"resist_strip", "ash", "flux_clean", "adhesive_clean"}  # strip methods; clean removes its bodies
# op arg <- content key (physics first, then hud); the content key may differ (alias)
AUTO = {
    "etch_via": {"etch_per_cycle_um": "etch_per_cycle_um", "cycle_s": "cycle_s", "rate_um_min": "rate_um_min"},
    "deposit": {"temp_c": "temp_c", "rate_nm_min": "rate_nm_min"},
    "coat": {"temp_c": "temp_c", "pressure_mpa": "pressure_mpa"},
    "pattern": {"dose_mj_cm2": "dose_mj_cm2"},
    "plate": {"current_density_ma_cm2": "current_density_ma_cm2", "bottom_up_um_min": "bottom_up_um_min"},
    "cmp": {"rr_nm_min": "rr_nm_min"},
    "reflow": {"liquidus_c": "liquidus_c", "peak_c": "temp_c_max", "atmosphere": "atmosphere"},
    "bond_tcb": {"liquidus_c": "liquidus_c", "stage_c": "stage_temp_c"},
    "bond_temp": {"temp_c": "temp_c", "time_s": "time_s"},
    "underfill": {"gamma_n_m": "gamma_n_m", "mu_pa_s": "mu_pa_s", "theta_deg": "theta_deg", "stage_c": "temp_c"},
    "mold": {"temp_c": "temp_c", "time_s": "time_s", "pressure_mpa": "pressure_mpa"},
    "cure": {"temp_c": "temp_c", "time_s": "time_s"},
    "dice": {"kerf_um": "kerf_um"},
    "ball_attach": {"liquidus_c": "liquidus_c", "peak_c": "temp_c_max"},
    "print": {"stencil_um": "thickness_um"},
}
DURATION_FROM_TIME = {"etch_via", "deposit", "coat", "plate", "strip", "cmp", "cure", "mold", "bond_temp", "underfill",
                      "etch_recess", "pattern", "etch_lines", "clean"}
TOOL = {"build_stack": None, "etch_via": "drie", "etch_recess": "laser_drill", "deposit": "pvd",
        "coat": "spin_coater", "pattern": "litho", "plate": "ecp", "strip": "wet_bench", "cmp": "cmp",
        "grind": "grinder", "reflow": "reflow_oven", "place": "pick_place", "bond_tcb": "tcb_head",
        "bond_temp": "wafer_bonder", "debond": "laser_debond", "underfill": "jet_dispenser", "mold": "mold_chase",
        "cure": "cure_oven", "dice": "dicing_blade", "ball_attach": "ball_placer", "print": "stencil_printer",
        "inspect": "xray_ct", "etch_lines": "drie", "clean": "wet_bench"}
VIEW_DEFAULT = {  # category -> (primary, pip)
    "work": ({"grinding_thinning", "temporary_bonding", "debonding", "dicing", "singulation"}, "block"),
    "block": ({"bonding", "die_attach", "underfill", "reflow", "molding", "cure", "assembly", "ball_attach",
               "cleaning", "dispense", "inspection", "lamination"}, "work"),
}


def tool_for(op: dict) -> str | None:
    o, m = op["op"], op.get("method")
    if o in ("etch_via", "etch_lines", "etch_recess") and m == "laser":
        return "laser_drill"
    if o == "etch_recess" and m == "etch":
        return "drie"  # blanket plasma recess (visual audit V1 M6)
    if o == "coat" and m == "print":
        return None  # dispensed / printed adhesive, TIM, sealant: form not stated, no tool actor (V1 M7)
    if o == "deposit" and m in ("cvd", "pecvd", "ald", "thermal"):
        return "cvd"
    if o == "deposit" and m in ("electroless", "immersion"):
        return "wet_bench"
    if o == "coat" and m in ("dry_film", "vacuum_laminate"):
        return "laminator"
    if o == "dice" and m == "laser":
        return "laser_drill"
    return TOOL.get(o)


# ---------------------------------------------------------------- refs table (package3d.json shape)

class RefTable:
    def __init__(self, db: cpf.DB, p3d_refs: dict) -> None:
        self.db = db
        self.p3d_refs = p3d_refs
        self.ids: dict[str, str] = {}
        self.table: dict[str, dict] = {}

    def rid(self, cell: str) -> str:
        if cell in self.ids:
            return self.ids[cell]
        t, raw, row_id = self.db.cell(cell)
        row = self.db.rows[row_id][1]
        fld = cell.rsplit(".", 1)[1]
        pid = self.db.paper_of(row_id) or ""
        paper = self.db.rows.get(pid, ("", {}))[1] if pid in self.db.rows else {}
        ov = {}
        for item in (row.get("overrides") or "").split(";"):
            if ":" in item:
                k, v = item.split(":", 1)
                ov[k.strip()] = v.strip()
        qual = [x.split(":", 1)[1] for x in (row.get("qualifiers") or "").split(";") if x.startswith(fld + ":")]
        tv = row.get("tv_id", "")
        entry = {
            "paper_id": pid, "doi": paper.get("doi", ""), "title": paper.get("title", ""),
            "year": int(paper["year"]) if str(paper.get("year", "")).isdigit() else paper.get("year", ""),
            "table": t, "row_id": row_id, "field": fld, "locator": row.get("locator", ""),
            "basis": ov.get(fld) if ov.get(fld) in cpf_basis() else row.get("basis", ""),
            "source": row.get("source", ""), "value": raw, "unit": unit_for(fld) or row.get("unit", "") or "",
            "tv_id": tv,
        }
        if qual:
            entry["qualifier"] = ";".join(qual)
        entry = {k: v for k, v in entry.items() if v not in ("", None)}
        r = f"R{len(self.ids) + 1}"
        self.ids[cell] = r
        self.table[r] = entry
        return r

    def p3d_cell(self, rid: str) -> str | None:
        e = self.p3d_refs.get(rid)
        if not e or not e.get("row_id") or not e.get("field"):
            return None
        return f"{e['row_id']}.{e['field']}"


_BASIS = None


def cpf_basis() -> set:
    global _BASIS
    if _BASIS is None:
        s = yaml.safe_load(cpf.SCHEMA.read_text(encoding="utf-8"))
        _BASIS = set(s["enums"]["basis"])
    return _BASIS


# ---------------------------------------------------------------- flow builder

class FlowBuild:
    def __init__(self, fc: cpf.FlowChecker, refs: RefTable, draft: bool) -> None:
        self.fc = fc
        self.refs = refs
        self.draft = draft
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.pendings: list[tuple[str, str]] = []
        self.nas: list[tuple[str, str]] = []
        self.geo = fc.geo
        self.flow = fc.flow
        self.cur_step_order: dict | None = None

    # ---- values
    def _cells(self, info: dict) -> list[str]:
        cells = list(info.get("cells") or [])
        for r in info.get("p3d") or []:
            c = self.refs.p3d_cell(r)
            if c:
                cells.append(c)
        out = []
        for c in cells:
            if c not in out:
                out.append(c)
        return out

    def pdim(self, key: str, spec, where: str, scope: set | None = None, names: dict | None = None,
             unit: str | None = None, hud_ok: bool = False) -> dict | None:
        try:
            st, v, info = self.fc.resolve_full(key, spec, where, scope, names=names, expr_ok=True)
        except cpf.Err as e:
            self.errors.append(f"{where}: {e}")
            return None
        u = unit or unit_for(key) or "1"
        cells = self._cells(info)
        rids = []
        for c in cells:
            try:
                rids.append(self.refs.rid(c))
            except cpf.Err as e:
                self.errors.append(f"{where}: ref {c}: {e}")
        if st == "pending":
            self.pendings.append((where, info.get("pending") or "pending"))
            if not self.draft:
                self.errors.append(f"{where}: pending ({info.get('pending')})")
            d = {"unit": u, "status": "template", "note": f"pending: {info.get('pending')}"}
            if rids:
                d["refs"] = rids
            return d
        if st == "na":
            if not hud_ok:
                self.errors.append(f"{where}: na (not reported) is allowed only for HUD-only values")
            self.nas.append((where, info.get("na")))
            return {"unit": u, "status": "na", "note": f"N/A, not reported: {info.get('na')}"}
        if isinstance(v, str):
            self.errors.append(f"{where}: '{key}' resolved to text '{v[:40]}', a number is needed")
            return None
        d: dict = {"value": round(float(v), 6), "unit": u, "status": st}
        if st == "reported":
            if rids:
                d["ref"] = rids[0]
                if len(rids) > 1:
                    d["refs"] = rids
            q = self.refs.table.get(rids[0], {}).get("qualifier") if rids else None
            if q in ("approx", "gt", "lt", "ge", "le"):
                d["qualifier"] = q
        else:
            if rids:
                d["refs"] = rids
        if info.get("formula"):
            d["formula"] = info["formula"]
            if info.get("values") and info["values"] != info["formula"]:
                d["values"] = info["values"]
        if st == "derived" and not d.get("formula"):
            d["formula"] = info.get("param") or "package3d derived param"
        if info.get("note"):
            d["note"] = info["note"]
        if st == "template" and not d.get("note"):
            d["note"] = info.get("param") and f"package3d template param {info['param']}" or "template"
        if info.get("source"):
            d["source"] = info["source"]
        return d

    def ptext(self, spec, where: str, scope: set | None = None, hud_ok: bool = False) -> dict | None:
        try:
            st, v, info = self.fc.resolve_full("equipment", spec, where, scope)
        except cpf.Err as e:
            self.errors.append(f"{where}: {e}")
            return None
        rids = [self.refs.rid(c) for c in self._cells(info)]
        if st == "pending":
            self.pendings.append((where, info.get("pending") or "pending"))
            if not self.draft:
                self.errors.append(f"{where}: pending ({info.get('pending')})")
            return {"text": "", "status": "template", "note": f"pending: {info.get('pending')}"}
        if st == "na":
            if not hud_ok:
                self.errors.append(f"{where}: na (not reported) is allowed only for HUD-only values")
            self.nas.append((where, info.get("na")))
            return {"text": "", "status": "na", "note": f"N/A, not reported: {info.get('na')}"}
        d: dict = {"text": str(v), "status": st if st != "derived" else "template"}
        if st == "reported" and rids:
            d["ref"] = rids[0]
        elif rids:
            d["refs"] = rids
        note = info.get("note") or spec.get("note") if isinstance(spec, dict) else None
        if note:
            d["note"] = note
        if d["status"] == "template" and not d.get("note"):
            d["note"] = "template"
        return d

    def is_pending(self, spec, scope, names) -> bool:
        try:
            st, _, _ = self.fc.resolve_full("x_um", spec, "probe", scope, names=names, expr_ok=True)
        except cpf.Err:
            return False
        return st in ("pending", "na")

    # ---- generic structure converter (bodies, sites, pieces, call args)
    def conv(self, obj, where: str, names: dict, scope: set | None = None, key: str = ""):
        if isinstance(obj, dict) and (cpf.SPEC_KEYS & set(obj)) and key:
            if key in TEXT_KEYS:
                return self.ptext(obj, where, scope)
            return self.pdim(key, obj, where, scope, names)
        if isinstance(obj, dict):
            out = {}
            for k, v in obj.items():
                if k in ("repeat_var",):
                    continue
                out[k] = self.conv(v, f"{where}.{k}", names, scope, k)
            return out
        if isinstance(obj, list):
            return [self.conv(v, f"{where}[{i}]", names, scope, key) for i, v in enumerate(obj)]
        if key and is_dim_key(key) and not isinstance(obj, bool) and isinstance(obj, (str, int, float)):
            return self.pdim(key, obj, where, scope, names)
        if isinstance(obj, str):
            return self.subst(obj, names)
        return obj

    @staticmethod
    def subst(s: str, names: dict) -> str:
        for k, v in names.items():
            s = s.replace("{" + k + "}", str(int(v)) if float(v).is_integer() else str(v))
        return s

    def repeat_n(self, spec, where: str) -> int:
        d = self.pdim("repeat_n", spec, where)
        if not d or "value" not in d:
            return 1
        n = d["value"]
        if not float(n).is_integer() or n < 1:
            self.errors.append(f"{where}: repeat count {n} is not a positive integer")
            return 1
        return int(n)

    def expand(self, items: list, where: str) -> list[tuple[dict, dict]]:
        """(item, names) for every item, repeated items expanded over their `repeat: {n, var}`."""
        out = []
        for it in items or []:
            rep = it.get("repeat_over")
            if rep:
                n = self.repeat_n(rep["n"], f"{where}.{it.get('id')}.repeat_over")
                for i in range(1, n + 1):
                    out.append(({k: v for k, v in it.items() if k != "repeat_over"}, {rep.get("var", "i"): i}))
            else:
                out.append((it, {}))
        return out

    # ---- build
    def build(self) -> dict:
        f, g = self.flow, self.geo
        fid = f["id"]
        if not g:
            self.errors.append(f"no geometry companion {self.fc.geo_path.relative_to(ROOT)}")
            return {}
        txt = self.fc.geo_path.read_text(encoding="utf-8")
        bad = sorted({ch for ch in txt if ord(ch) > 126})
        if bad:
            self.errors.append(f"geometry companion: non-ASCII characters {bad[:10]}")
        # routes
        routes = []
        for rid, r in f["routes"].items():
            e = {"id": rid, "name": r["name"]}
            for k in ("note", "default", "family"):
                if r.get(k) is not None:
                    e[k] = r[k]
            routes.append(e)
        # pieces
        pieces = []
        gp = g.get("pieces") or {}
        for pid, p in (f.get("pieces") or {}).items():
            gpp = gp.get(pid)
            if gpp is None:
                self.errors.append(f"piece {pid}: no geometry in the companion")
                continue
            e = {"id": pid, "name": p.get("name", pid), "kind": p.get("kind", "other")}
            e["carrier"] = self.conv(gpp.get("carrier"), f"pieces.{pid}.carrier", {})
            e["unit"] = self.conv(gpp.get("unit"), f"pieces.{pid}.unit", {})
            if gpp.get("repeat"):
                e["repeat"] = self.conv(gpp["repeat"], f"pieces.{pid}.repeat", {})
            e["block"] = gpp.get("block")
            e["initial"] = bool(gpp.get("initial", False))
            for k in ("routes", "note"):
                if p.get(k):
                    e[k] = p[k]
            pieces.append(e)
        # sites, bodies, profiles
        sites = []
        for it, names in self.expand(g.get("sites"), "sites"):
            s = self.conv(it, f"sites.{it.get('id')}", names)
            s["id"] = self.subst(it["id"], names)
            sites.append(s)
        bodies = []
        for it, names in self.expand(g.get("bodies"), "bodies"):
            b = self.conv(it, f"bodies.{self.subst(it['id'], names)}", names)
            bodies.append(b)
        profiles = [self.profile(p) for p in g.get("profiles") or []]
        # steps
        steps = []
        gs = g.get("steps") or {}
        paper = f["kind"] == "paper"
        for idx, s in enumerate(f["steps"], 1):
            st = self.step(s, gs, idx, paper)
            if st:
                steps.append(st)
        unknown = set(gs) - {s["id"] for s in f["steps"]} - {f"{s['id']}.{o['id']}" for s in f["steps"]
                                                            for o in s.get("ops") or []}
        for k in sorted(unknown):
            self.errors.append(f"companion steps: '{k}' matches no step or op")
        source_flows = []
        for s in f["steps"]:
            for row in [(s.get("order") or {}).get("db")] + [(o.get("order") or {}).get("db") for o in s.get("ops") or []]:
                if row and row in self.fc.db.rows:
                    fl = self.fc.db.rows[row][1]["flow_id"]
                    if fl not in source_flows:
                        source_flows.append(fl)
        out = {
            "id": f["json_id"], "name": f["name"], "family": f.get("family"), "kind": f["kind"],
            "source_flows": source_flows, "routes": routes, "summary": " ".join(str(f.get("summary", "")).split()),
            "refs": [], "pieces": pieces, "sites": sites, "bodies": bodies, "profiles": profiles, "steps": steps,
        }
        if f.get("family") is None and f.get("family_label"):
            out["family_label"] = f["family_label"]
        if g.get("note"):
            out["note"] = " ".join(str(g["note"]).split())
        if len(out["summary"].split()) > 60:
            self.warnings.append("summary longer than 60 words")
        out["completeness"] = completeness(out)
        self.checks(out)
        return out

    def profile(self, p: dict) -> dict:
        where = f"profiles.{p.get('id')}"
        pts, sts, rids, notes = [], [], [], []
        for i, (ts, vs) in enumerate(p.get("points") or []):
            dt_ = self.pdim("time_s", ts, f"{where}.pts[{i}].t")
            dv = self.pdim("value_" + {"T": "c", "F": "n", "P": "mpa"}.get(p["q"], "1"), vs, f"{where}.pts[{i}].v",
                           unit=p.get("unit"))
            for d in (dt_, dv):
                if d is None:
                    continue
                sts.append(d["status"] if "value" in d else "template")
                rids += [r for r in ([d.get("ref")] if d.get("ref") else []) + (d.get("refs") or []) if r not in rids]
                if d.get("note") and d["note"] not in notes:
                    notes.append(d["note"])
            if dt_ and dv and "value" in dt_ and "value" in dv:
                pts.append([dt_["value"], dv["value"]])
        st = cpf.worst(sts) if sts else "template"
        e = {"id": p["id"], "q": p["q"], "unit": p["unit"], "pts": pts, "status": "template" if st == "pending" else st}
        for k in ("trace", "label"):
            if p.get(k):
                e[k] = p[k]
        if rids:
            e["refs"] = rids
        e["note"] = " ".join(x for x in [p.get("note")] if x) or "; ".join(notes) or "profile"
        pend = [n for n in notes if n.startswith("pending")]
        if pend and not pts:
            e["note"] = "pending: " + "; ".join(x[len("pending: "):] for x in pend)
        if st == "derived":
            e["formula"] = p.get("formula") or "points from stated set values"
        return e

    def step(self, s: dict, gs: dict, idx: int, paper: bool) -> dict | None:
        sid = s["id"]
        comp = gs.get(sid) or {}
        o = s.get("order") or {}
        self.cur_step_order = o
        db = o.get("db")
        dbrow = self.fc.db.rows[db][1] if db in self.fc.db.rows else {}
        scope = self.fc.order_scope(f"step {sid}", o)
        e: dict = {"id": sid, "n": int(dbrow["seq"]) if paper and dbrow.get("seq") else idx, "name": s["name"],
                   "category": s["category"]}
        if dbrow.get("step_kind"):
            e["step_kind"] = dbrow["step_kind"]
        e["db_step"] = db
        src = {}
        if db:
            src["order_ref"] = self.refs.rid(f"{db}.step")
            src["flow_id"] = dbrow.get("flow_id")
        note = o.get("note") or ""
        src["note"] = f"{o.get('kind')}" + (f": {' '.join(note.split())}" if note else "")
        e["src"] = src
        if s.get("routes"):
            e["routes"] = s["routes"]
        e["piece"] = s["piece"]
        e["orient"] = comp.get("orient", "up")
        e["view"] = self.view(s, comp)
        # ops
        ops, hud = [], []
        content_ops = s.get("ops") or []
        if content_ops:
            # consecutive content ops of one repeated group run level by level (visual audit V1 C3: one build-up layer
            # is laminate, cure, via, ..., seed etch; then the next layer), not op type by op type
            blocks: list[tuple[list[dict], list[dict]]] = []
            for co in content_ops:
                grp = (self.flow.get("groups") or {}).get(co.get("group") or "", {})
                reps = [{}]
                if grp.get("repeat"):
                    n = self.repeat_n(grp["repeat"], f"groups.{co['group']}.repeat")
                    reps = [{"i": i} for i in range(1, n + 1)]
                if blocks and co.get("group") and blocks[-1][0][-1].get("group") == co.get("group"):
                    blocks[-1][0].append(co)
                else:
                    blocks.append(([co], reps))
            for cos, reps in blocks:
                for names in reps:
                    for co in cos:
                        oscope = scope | self.fc.order_scope(f"step {sid}.op {co['id']}", co.get("order") or {})
                        calls = gs.get(f"{sid}.{co['id']}")
                        if calls is None:
                            if names == reps[0]:
                                self.errors.append(f"step {sid}.op {co['id']}: no op call in the companion")
                            continue
                        calls = calls if isinstance(calls, list) else [calls]
                        for c, nm, owns in self.owned_calls(calls, names, co, f"step {sid}.op {co['id']}"):
                            oc = self.call(c, co, f"step {sid}.op {co['id']}", oscope, nm, co["name"], owns)
                            if oc:
                                ops.append(oc)
                for co in cos:
                    oscope = scope | self.fc.order_scope(f"step {sid}.op {co['id']}", co.get("order") or {})
                    hud += self.hud(co, f"step {sid}.op {co['id']}", oscope, prefix=co["name"],
                                    short=co.get("label") or co["id"].replace("_", " "))
            hud = self.hud(s, f"step {sid}", scope) + hud
        else:
            calls = comp.get("calls")
            if not calls:
                self.errors.append(f"step {sid}: no op calls in the companion")
                calls = []
            for c, nm, owns in self.owned_calls(calls, {}, s, f"step {sid}"):
                oc = self.call(c, s, f"step {sid}", scope, nm, None, owns)
                if oc:
                    ops.append(oc)
            hud = self.hud(s, f"step {sid}", scope)
            if s.get("equipment"):
                eq = self.ptext(s["equipment"], f"step {sid}.equipment", scope, hud_ok=True)
                if eq:
                    e["equipment"] = eq
        e["ops"] = ops
        tools = [op.get("tool", {}).get("id") for op in ops if op.get("tool")]
        e["tool"] = {"id": tools[0]} if tools else None
        e["hud"] = hud
        for k in ("weight", "phases", "note"):
            if comp.get(k) is not None:
                e[k] = comp[k]
        if s.get("note") and "note" not in e:
            e["note"] = " ".join(str(s["note"]).split())
        return e

    def op_src(self, item: dict, added: bool) -> dict | None:
        """OpCall.src: the DB row that orders this op (content op order, else the step order)."""
        o = item.get("order") or {}
        if o.get("kind") == "self" or not o:
            o = {**(self.cur_step_order or {}), "note": o.get("note") or (self.cur_step_order or {}).get("note")}
        db = o.get("db")
        src: dict = {}
        if db and db in self.fc.db.rows:
            src["order_ref"] = self.refs.rid(f"{db}.step")
            src["flow_id"] = self.fc.db.rows[db][1].get("flow_id")
            src["step_id"] = db
        note = " ".join(str(o.get("note") or "").split())
        kind = o.get("kind") or ""
        if added:
            src["note"] = "added: not a step of the ordering DB module (" + (kind + (": " + note if note else "")) + ")"
        elif kind or note:
            src["note"] = kind + (": " + note if note else "")
        return src or None

    def owned_calls(self, calls: list, names: dict, item: dict, where: str) -> list[tuple[dict, dict, bool]]:
        """Expand companion calls (meta keys: `repeat_over` {n, var}; `only` / `except` {var: [values]} against the
        group repeat names; `time: true` marks the call that owns the content's hud.time_s) and decide which call owns
        the stated time (audit A1 M10): the marked call, else the only call whose op takes a time-based duration.
        Every other call gets no duration_s (real time not reported; playback weight stays a view constant)."""
        out: list[tuple[dict, dict]] = []
        for c in calls:
            if not isinstance(c, dict):
                self.errors.append(f"{where}: call is not a mapping")
                continue
            skip = False
            for k in ("only", "except"):
                for var, vals in (c.get(k) or {}).items():
                    hit = names.get(var) in (vals if isinstance(vals, list) else [vals])
                    if (k == "only" and not hit) or (k == "except" and hit):
                        skip = True
            if skip:
                continue
            reps = [dict(names)]
            if c.get("repeat_over"):
                ro = c["repeat_over"]
                n = self.repeat_n(ro["n"], f"{where}.repeat_over")
                reps = [{**names, ro.get("var", "k"): j} for j in range(1, n + 1)]
            cc = {k: v for k, v in c.items() if k not in ("only", "except", "repeat_over")}
            for nm in reps:
                out.append((cc, nm))
        tv = (item.get("hud") or {}).get("time_s")
        marked = [i for i, (c, _) in enumerate(out) if c.get("time") is True]
        elig = [i for i, (c, _) in enumerate(out) if c.get("op") in DURATION_FROM_TIME and c.get("time") is not False]
        owner: set[int] = set()
        if marked:
            owner = set(marked)
        elif len(elig) == 1:
            owner = set(elig)
        elif len(elig) > 1 and tv is not None:
            self.errors.append(f"{where}: {len(elig)} calls could own hud.time_s; mark the owner with `time: true`")
        return [({k: v for k, v in c.items() if k != "time"}, nm, i in owner) for i, (c, nm) in enumerate(out)]

    def view(self, s: dict, comp: dict) -> dict:
        v = dict(comp.get("view") or {})
        if "primary" not in v:
            prim, pip = "cell", "work"
            for scale, (cats, p) in VIEW_DEFAULT.items():
                if s["category"] in cats:
                    prim, pip = scale, p
            v["primary"] = prim
            v.setdefault("pip", pip)
        v.setdefault("pip", "work" if v["primary"] != "work" else "block")
        if "cell_site" not in v:
            ps = ((self.geo.get("pieces") or {}).get(s["piece"]) or {}).get("cell_site")
            if ps:
                v["cell_site"] = ps
        return v

    def hud(self, item: dict, where: str, scope: set, prefix: str | None = None, short: str | None = None) -> list[dict]:
        out = []
        pre = f"{short or prefix}: " if (short or prefix) else ""
        for sec, kind in (("hud", "condition"), ("targets", "target"), ("physics", "condition")):
            for k, spec in (item.get(sec) or {}).items():
                if k in TEXT_KEYS or (isinstance(spec, dict) and isinstance(spec.get("template"), str)
                                      and not is_dim_key(k)):
                    q = self.ptext(spec, f"{where}.{sec}.{k}", scope, hud_ok=sec != "physics")
                    kk = "material"
                else:
                    q = self.pdim(k, spec, f"{where}.{sec}.{k}", scope, hud_ok=sec != "physics")
                    kk = kind
                if q is not None:
                    if k not in HUD_LABEL:
                        self.errors.append(f"{where}: HUD key '{k}' has no label (HUD_LABEL)")
                    if isinstance(q, dict) and q.get("unit") == "1":
                        q = {**q, "unit": ""}  # dimensionless HUD value: no unit printed (visual audit V1 m6)
                    out.append({"key": f"{prefix or ''}{'.' if prefix else ''}{k}", "label":
                                pre + HUD_LABEL.get(k, k.replace("_", " ")), "q": q, "kind": kk})
        if prefix and item.get("equipment"):
            q = self.ptext(item["equipment"], f"{where}.equipment", scope, hud_ok=True)
            if q:
                out.append({"key": f"{prefix}.equipment", "label": pre + "equipment", "q": q, "kind": "equipment"})
        return out

    def call(self, c: dict, item: dict, where: str, scope: set, names: dict, label: str | None,
             owns_time: bool = True) -> dict | None:
        opn = c.get("op")
        if opn not in OP_ARGS:
            self.errors.append(f"{where}: unknown op '{opn}'")
            return None
        spec = OP_ARGS[opn]
        out: dict = {"op": opn}
        lab = c.get("label") or label
        if lab:
            out["label"] = self.subst(lab, names) + (f" ({names['i']})" if "i" in names and "{i}" not in lab else "")
        for k, v in c.items():
            if k in ("op", "label", "added"):
                continue
            if k not in spec and k not in COMMON_ARGS:
                self.errors.append(f"{where}: op {opn} has no arg '{k}'")
                continue
            kind = spec.get(k)
            w = f"{where}.{opn}.{k}"
            if k == "w":
                out[k] = v
            elif k == "tool":
                out[k] = v
            elif k == "duration_s" or kind in ("dim",):
                d = self.conv(v, w, names, scope, k)
                if d is not None:
                    out[k] = d
            elif kind == "dims":
                out[k] = [self.conv(x, w, names, scope, k) for x in v] if isinstance(v, list) else \
                    self.conv(v, w, names, scope, k)
            elif kind == "at":
                out[k] = [self.conv(p, f"{w}[{i}]", names, scope) for i, p in enumerate(v)]
            elif kind == "stages":
                out[k] = [self.conv(p, f"{w}[{i}]", names, scope) for i, p in enumerate(v)]
            elif kind == "scan":
                out[k] = self.conv(v, w, names, scope)
            elif kind == "text":
                out[k] = self.ptext(v, w, scope) if isinstance(v, dict) else {"text": v, "status": "template",
                                                                             "note": "op setting"}
            elif kind == "ids":
                out[k] = [self.subst(x, names) for x in v]
            elif kind == "id":
                out[k] = self.subst(v, names)
            else:
                out[k] = v
        # auto-filled args from the step / op content (physics first, then hud)
        for arg, src in AUTO.get(opn, {}).items():
            if arg in out:
                continue
            for sec in ("physics", "hud", "targets"):
                sv = (item.get(sec) or {}).get(src)
                if sv is not None and arg not in REQUIRED.get(opn, []) and self.is_pending(sv, scope, names):
                    break  # optional arg without a value (pending / na): left out; the HUD still lists it
                if sv is not None:
                    if spec.get(arg) == "text":
                        q = self.ptext(sv, f"{where}.{opn}.{arg}", scope)
                    else:
                        q = self.pdim(arg, sv, f"{where}.{opn}.{arg}", scope, names, unit=unit_for(src))
                    if q is not None:
                        out[arg] = q
                    break
        if opn == "cmp" and "pressure_kpa" not in out and (item.get("hud") or {}).get("pressure_mpa"):
            q = self.pdim("pressure_mpa", item["hud"]["pressure_mpa"], f"{where}.cmp.pressure_kpa", scope, names)
            if q and "value" in q:
                q = dict(q)
                q["formula"] = (q.get("formula") or "pressure_mpa") + " * 1000"
                q["value"] = round(q["value"] * 1000, 6)
                q["unit"] = "kPa"
            if q:
                out["pressure_kpa"] = q
        if "duration_s" not in out and opn in DURATION_FROM_TIME and owns_time:
            tv = (item.get("hud") or {}).get("time_s")
            if tv is not None and not self.is_pending(tv, scope, names):
                q = self.pdim("time_s", tv, f"{where}.{opn}.duration_s", scope, names)
                if q is not None:
                    out["duration_s"] = q
        src = self.op_src(item, bool(c.get("added")))  # contract 16.4 (audit A2 n7)
        if src:
            out["src"] = src
        if "tool" not in out:
            t = tool_for(out)
            out["tool"] = {"id": t} if t else None
        for r in REQUIRED.get(opn, []):
            if r not in out:
                self.errors.append(f"{where}: op {opn} misses required '{r}'")
        return out

    # ---- builder checks
    def checks(self, fl: dict) -> None:
        pieces = {p["id"]: p for p in fl["pieces"]}
        sites = {s["id"]: s for s in fl["sites"]}
        bodies = {}
        for b in fl["bodies"]:
            if b["id"] in bodies:
                self.errors.append(f"duplicate body id {b['id']}")
            bodies[b["id"]] = b
        profiles = {p["id"]: p for p in fl["profiles"]}
        for s in fl["sites"]:
            if s.get("piece") not in pieces:
                self.errors.append(f"site {s['id']}: unknown piece {s.get('piece')}")
        for b in fl["bodies"]:
            if b.get("piece") not in pieces:
                self.errors.append(f"body {b['id']}: unknown piece {b.get('piece')}")
            for k in ("site",):
                if b.get(k) and b[k] not in sites:
                    self.errors.append(f"body {b['id']}: unknown site {b[k]}")
            for op_ in b.get("openings") or []:
                if op_.get("site") not in sites:
                    self.errors.append(f"body {b['id']}: opening on unknown site {op_.get('site')}")
                else:
                    pitch = val(sites[op_["site"]].get("pitch_x_um"))
                    dv = val(op_.get("d_um"))
                    if pitch is not None and dv is not None and dv >= pitch:
                        self.errors.append(f"body {b['id']}: opening {dv} um >= site pitch {pitch} um")
            for h in b.get("hosts") or []:
                if h not in bodies and h not in [x["id"] for x in fl["bodies"]]:
                    self.errors.append(f"body {b['id']}: unknown host {h}")
            if b.get("kind") == "via_fill" and b.get("hole") not in [x["id"] for x in fl["bodies"]]:
                self.errors.append(f"body {b['id']}: unknown hole {b.get('hole')}")
            if b.get("kind") == "line_fill":
                hb = bodies.get(b.get("host")) or next((x for x in fl["bodies"] if x["id"] == b.get("host")), None)
                if not hb or hb.get("kind") != "slab" or not hb.get("lines") or hb["lines"].get("material"):
                    self.errors.append(f"body {b['id']}: line_fill host must be a slab with open lines (no material)")
            if b.get("kind") == "solder" and b.get("dir") == "down":
                zz, hh = val(b.get("z_um")), val(b.get("h_um"))
                if zz is not None and hh is not None and zz - hh < -1e-6:
                    self.errors.append(f"body {b['id']}: hanging solder below z 0")
            z = val(b.get("z_um"))
            if z is not None and z < -1e-6:
                self.errors.append(f"body {b['id']}: z {z} < 0")
            if b.get("kind") == "hole":
                zt, dpt = val(b.get("z_top_um")), val(b.get("depth_um"))
                if zt is not None and dpt is not None and zt - dpt < -1e-6:
                    self.errors.append(f"body {b['id']}: hole bottom below z 0")
            if b.get("kind") == "solder":
                dv, hv = val(b.get("d_um")), val(b.get("h_um"))
                if dv is not None and hv is not None and (dv <= 0 or hv <= 0):
                    self.errors.append(f"body {b['id']}: solder volume <= 0")
            if b.get("material") not in (None,) and not isinstance(b.get("material"), str):
                self.errors.append(f"body {b['id']}: material must be a key")
        # piece top (max z) for plane checks
        ztop: dict[str, float] = {}
        for b in fl["bodies"]:
            z, h = val(b.get("z_um")), val(b.get("h_um"))
            if z is not None and h is not None:
                ztop[b["piece"]] = max(ztop.get(b["piece"], 0.0), z + h)
        # routes
        if sum(1 for r in fl["routes"] if r.get("default")) != 1:
            self.errors.append("exactly one default route")
        ids = [s["id"] for s in fl["steps"]]
        if len(ids) != len(set(ids)):
            self.errors.append("duplicate step ids")
        ns = [s["n"] for s in fl["steps"]]
        if ns != sorted(ns):
            self.errors.append("step n not monotone")
        for r in fl["routes"]:
            rid = r["id"]
            rsteps = [s for s in fl["steps"] if not s.get("routes") or rid in s["routes"]]
            if not rsteps:
                self.errors.append(f"route {rid}: no steps")
            live_b = {b["id"] for b in fl["bodies"] if b.get("initial")
                      and (not b.get("routes") or rid in b["routes"])}
            gone: set[str] = set()
            live_p = {p["id"] for p in fl["pieces"] if p.get("initial")}
            rb = {b["id"] for b in fl["bodies"] if not b.get("routes") or rid in b["routes"]}
            for s in rsteps:
                w = f"route {rid} step {s['id']}"
                if s["piece"] not in pieces:
                    self.errors.append(f"{w}: unknown piece {s['piece']}")
                v = s.get("view") or {}
                if v.get("cell_site") and v["cell_site"] not in sites:
                    self.errors.append(f"{w}: unknown cell_site {v['cell_site']}")
                if v.get("primary") == "cell" and not v.get("cell_site"):
                    self.errors.append(f"{w}: cell view without cell_site")
                for op in s["ops"]:
                    on = op["op"]
                    ow = f"{w} op {on}"
                    created = set()
                    for arg in CREATES_BODY.get(on, []):
                        x = op.get(arg)
                        created |= set(x if isinstance(x, list) else [x] if x else [])
                    for arg, kind in OP_ARGS[on].items():
                        x = op.get(arg)
                        if x is None:
                            continue
                        if kind in ("id", "ids") and arg not in ("piece", "onto", "carrier", "profile"):
                            for bid in (x if isinstance(x, list) else [x]):
                                if bid not in bodies:
                                    self.errors.append(f"{ow}: unknown body {bid} ({arg})")
                                    continue
                                if bid not in rb:
                                    continue  # route filter: a body of another route is ignored in this route
                                ok = KIND_OK.get((on, arg))
                                if ok and bodies[bid]["kind"] not in ok:
                                    self.errors.append(f"{ow}: body {bid} kind {bodies[bid]['kind']} not valid for {arg}")
                                if bid not in created and bid not in live_b:
                                    self.errors.append(f"{ow}: body {bid} used before it is created")
                                if bid in gone:
                                    self.errors.append(f"{ow}: body {bid} used after a strip removed it")
                        if arg in ("piece", "onto", "carrier") and x not in pieces:
                            self.errors.append(f"{ow}: unknown piece {x}")
                        if arg == "profile" and x not in profiles:
                            self.errors.append(f"{ow}: unknown profile {x}")
                    if on == "bond_tcb":
                        for pk, pid_ in (op.get("profiles") or {}).items():
                            if pid_ not in profiles:
                                self.errors.append(f"{ow}: unknown profile {pid_} ({pk})")
                            elif not profiles[pid_]["pts"] and not str(profiles[pid_].get("note", "")).startswith("pending"):
                                self.errors.append(f"{ow}: profile {pid_} has no points")
                    if on in CREATES_PIECE:
                        pc = op.get(CREATES_PIECE[on])
                        if op.get("onto") not in live_p:
                            self.errors.append(f"{ow}: target piece {op.get('onto')} does not exist yet")
                        live_p.add(pc)
                        self.align(op, fl, sites, bodies, ow)
                    live_b |= created
                    if (on == "strip" and op.get("method") in REMOVING_STRIP) or on == "clean":
                        gone |= set(op.get("bodies") or [])
                    if on in ("grind", "cmp"):
                        zk = "to_z_um" if on == "grind" else "stop_z_um"
                        zz = val(op.get(zk))
                        top = ztop.get(s["piece"])
                        if zz is not None and top is not None and not (0 <= zz <= top + 1e-6):
                            self.errors.append(f"{ow}: {zk} {zz} outside the piece (0 .. {top})")
                if s["piece"] not in live_p and not any(op["op"] in CREATES_PIECE and
                                                        op.get(CREATES_PIECE[op["op"]]) == s["piece"]
                                                        for op in s["ops"]):
                    self.errors.append(f"{w}: piece {s['piece']} does not exist yet")
        # PDim status rules (contract check 1)
        for path, d in walk_dims(fl):
            if "value" not in d and d["status"] != "na" and not str(d.get("note", "")).startswith("pending"):
                self.errors.append(f"{path}: PDim without value")
            if d["status"] == "reported" and not d.get("ref"):
                self.errors.append(f"{path}: reported without ref")
            if d["status"] == "derived" and not d.get("formula"):
                self.errors.append(f"{path}: derived without formula")
            if d["status"] == "template" and not d.get("note"):
                self.errors.append(f"{path}: template without note")
            if d["status"] == "na" and ".hud[" not in path:
                self.errors.append(f"{path}: na outside the HUD")

    def align(self, op: dict, fl: dict, sites: dict, bodies: dict, ow: str) -> None:
        """the placed piece's solder sites land on same-pitch sites of the target piece"""
        piece, onto = op.get("piece") or op.get("carrier"), op.get("onto")
        solder = op.get("solder") or [b["id"] for b in fl["bodies"] if b.get("piece") == piece
                                      and b.get("kind") == "solder" and b.get("site")]
        flip = bool(op.get("flip"))
        for bid in solder:
            b = bodies.get(bid)
            if not b or b.get("site") not in sites or b.get("piece") != piece:
                continue
            s = sites[b["site"]]
            sx, sy = val(s["rect"]["x_um"]) or 0.0, val(s["rect"]["y_um"]) or 0.0
            pitch = val(s.get("pitch_x_um"))
            if flip:
                sy = -sy
            for i, at in enumerate(op.get("at") or []):
                rot = math.radians(at.get("rot_deg") or 0)
                x = sx * math.cos(rot) - sy * math.sin(rot) + (val(at.get("x_um")) or 0)
                y = sx * math.sin(rot) + sy * math.cos(rot) + (val(at.get("y_um")) or 0)
                hit = False
                for t in sites.values():
                    if t["piece"] != onto or pitch is None:
                        continue
                    tp = val(t.get("pitch_x_um"))
                    tx, ty = val(t["rect"]["x_um"]), val(t["rect"]["y_um"])
                    if None in (tp, tx, ty):
                        continue
                    if abs(tp - pitch) < 1e-6 and abs(tx - x) <= pitch / 2 and abs(ty - y) <= pitch / 2:
                        hit = True
                        break
                if not hit:
                    self.errors.append(f"{ow}: solder site {s['id']} of {piece} (at[{i}] = {x:.1f}, {y:.1f} um) "
                                       f"lands on no {onto} site with pitch {pitch}")


def val(d) -> float | None:
    if isinstance(d, dict) and "value" in d and isinstance(d["value"], (int, float)):
        return float(d["value"])
    return None


def walk_dims(obj, path: str = ""):
    if isinstance(obj, dict):
        if "status" in obj and "unit" in obj and ("value" in obj or "note" in obj) and "pts" not in obj:
            yield path, obj
            return
        for k, v in obj.items():
            yield from walk_dims(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from walk_dims(v, f"{path}[{i}]")


def completeness(fl: dict) -> dict:
    c = Counter(d["status"] for _, d in walk_dims({k: v for k, v in fl.items() if k != "completeness"}))
    tot = sum(c.values()) or 1
    return {"reported": round(c["reported"] / tot, 4), "derived": round(c["derived"] / tot, 4),
            "template": round(c["template"] / tot, 4), "na": round(c["na"] / tot, 4), "n": tot}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--check", action="store_true", help="check only, write nothing")
    ap.add_argument("--draft", action="store_true", help="allow pending values (emitted as template, no value)")
    ap.add_argument("--flow", help="build only this flow id")
    ap.add_argument("--quiet", action="store_true", help="do not list pendings")
    ap.add_argument("--out", help="output path (default app/static/data/process3d.json)")
    a = ap.parse_args()
    db = cpf.DB()
    p3d = cpf.Package3D()
    p3d_json = json.loads(cpf.PKG3D.read_text(encoding="utf-8")) if cpf.PKG3D.exists() else {"refs": {}}
    refs = RefTable(db, p3d_json.get("refs") or {})
    cats = cpf.schema_step_categories()
    flows, n_err, pend_all = [], 0, []
    print(f"{'flow':<14} {'mode':<6} {'steps':>5} {'ops':>4} {'bodies':>6} {'reported':>8} {'derived':>7} "
          f"{'template':>8} {'na':>4} {'pending':>7} {'errors':>6}")
    for path in sorted(cpf.FLOW_DIR.glob("*.yaml")):
        fc = cpf.FlowChecker(path, db, p3d, cats)
        if a.flow and fc.fid != a.flow:
            continue
        fc.check()
        fb = FlowBuild(fc, refs, a.draft)
        fb.errors += [f"content: {e}" for e in fc.errors]
        out = fb.build() if not fc.errors else {}
        cmpl = out.get("completeness") or {}
        n = cmpl.get("n", 0)
        cnt = Counter(d["status"] for _, d in walk_dims(out)) if out else Counter()
        print(f"{fc.fid:<14} {'draft' if a.draft else 'strict':<6} {len(out.get('steps') or []):>5} "
              f"{sum(len(s['ops']) for s in out.get('steps') or []):>4} {len(out.get('bodies') or []):>6} "
              f"{cnt['reported']:>8} {cnt['derived']:>7} {cnt['template'] - len(fb.pendings):>8} {cnt['na']:>4} "
              f"{len(fb.pendings):>7} "
              f"{len(fb.errors):>6}")
        for e in fb.errors[:200]:
            print(f"  ERROR {e}")
        if len(fb.errors) > 200:
            print(f"  ... {len(fb.errors) - 200} more errors")
        for w in fb.warnings:
            print(f"  warn  {w}")
        if a.draft and not a.quiet:
            seen = set()
            for where, txt in fb.pendings:
                if txt not in seen:
                    seen.add(txt)
                    print(f"  pending {where}: {txt}")
        n_err += len(fb.errors)
        seen_p = set()
        for where, txt in fb.pendings:
            if (where, txt) not in seen_p:
                seen_p.add((where, txt))
                pend_all.append({"flow": out.get("id", fc.fid) if out else fc.fid, "where": where, "quantity": txt})
        if out:
            flows.append(out)
        _ = n
    doc = {"version": 1, "contract": "1.1", "generated": dt.date.today().isoformat(), "fixture": False,
           **({"draft": True, "pending": pend_all} if a.draft else {}),
           "note": ("process-animation flows (DevLog-016); provenance per PDim; built by scripts/build_process3d.py"
                    + (" in DRAFT mode: PDims with note 'pending: ...' have no value" if a.draft else "")),
           "refs": refs.table, "flows": flows}
    blob = json.dumps(doc, ensure_ascii=True, separators=(",", ":"))
    print(f"refs: {len(refs.table)}; JSON size {len(blob) / 1e6:.3f} MB")
    if a.check or n_err:
        if n_err:
            print(f"{n_err} errors; nothing written")
        return 1 if n_err else 0
    out = Path(a.out) if a.out else OUT
    out.write_text(blob, encoding="utf-8")
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
