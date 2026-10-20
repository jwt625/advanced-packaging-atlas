#!/usr/bin/env python3
"""Build the app data view (app/static/data/atlas.json) for the Advanced Packaging Atlas.

Reads the extraction database (data/*.csv, data/evidence/*.yaml) and the schema
(data/schema/packaging.schema.yaml) and emits one JSON document the SvelteKit app loads.

The view is a faithful projection of the database: nothing is estimated here. Values that are not
reported stay absent, and every reported number keeps the basis/source/locator it was entered with.
Derived headline fields (minimum pitch, via diameter, ...) are computed by picking the most extreme
*matching* row and carrying that row's provenance; they never invent a number.

Usage: uv run python scripts/build_views.py [--out PATH]
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SCHEMA = yaml.safe_load((DATA / "schema" / "packaging.schema.yaml").read_text())
ENUMS: dict[str, list[str]] = SCHEMA["enums"]
TABLES: dict = SCHEMA["tables"]

DEFAULT_OUT = ROOT / "app" / "static" / "data" / "atlas.json"

# ----------------------------------------------------------------------------- enums/labels

# Token-level labels for the acronym-heavy packaging vocabulary; unknown tokens fall back to
# "capitalize first letter". Full-value overrides (below) win when a token pass reads awkwardly.
TOKENS = {
    "si": "Si", "cu": "Cu", "sn": "Sn", "ag": "Ag", "au": "Au", "ni": "Ni", "in": "In", "al": "Al",
    "w": "W", "ru": "Ru", "co": "Co", "ga": "Ga", "ti": "Ti", "ta": "Ta", "n": "N", "o": "O",
    "tsv": "TSV", "tgv": "TGV", "tdv": "TDV", "tmv": "TMV", "pth": "PTH", "rdl": "RDL", "ubm": "UBM",
    "sap": "SAP", "msap": "mSAP", "abf": "ABF", "pid": "PID", "dfr": "DFR", "bcb": "BCB", "emc": "EMC",
    "tim": "TIM", "cuf": "CUF", "ncf": "NCF", "ncp": "NCP", "muf": "MUF", "uv": "UV", "ir": "IR",
    "c4": "C4", "bga": "BGA", "csp": "CSP", "pcb": "PCB", "coc": "CoC", "fop": "FOP", "wlp": "WLP",
    "hbm": "HBM", "hbm2e": "HBM2E", "hbm3": "HBM3", "hbm3e": "HBM3E", "hbm4": "HBM4",
    "soc": "SoC", "asic": "ASIC", "gpu": "GPU", "cpu": "CPU", "fpga": "FPGA", "dram": "DRAM",
    "sram": "SRAM", "io": "IO", "ipd": "IPD", "dtc": "DTC", "ivr": "IVR", "pic": "PIC", "eic": "EIC",
    "ucie": "UCIe", "bow": "BoW", "aib": "AIB", "aib2": "AIB2", "openhbi": "OpenHBI", "lipincon": "LiPiCon",
    "xsr": "XSR", "usr": "USR", "mr": "MR", "lr": "LR", "pcie": "PCIe", "cxl": "CXL", "nvlink": "NVLink",
    "cpo": "CPO", "pdn": "PDN", "bspdn": "BSPDN", "isl": "ISL", "acer": "ACeR",
    "d2w": "D2W", "w2w": "W2W", "c2c": "C2C", "f2f": "F2F", "f2b": "F2B", "b2f": "B2F", "d2d": "D2D",
    "slid": "SLID", "tcb": "TCB", "tcc": "TCC", "tcg": "TCG", "hast": "HAST", "uhast": "uHAST",
    "hts": "HTS", "thb": "THB", "msl": "MSL", "ttv": "TTV", "ber": "BER", "vf": "VF", "hvm": "HVM",
    "aaa": "AAA", "2p5d": "2.5D", "2d": "2D", "3d": "3D", "2l": "2L", "4l": "4L", "8ml": "8ML",
    "tmvlast": "TMV-last", "i": "I", "s": "S",
}

LABEL_OVERRIDES = {
    # bucket
    "si_interposer": "Si interposer", "organic_rdl_fanout": "Organic RDL / fan-out", "si_bridge": "Si bridge",
    "panel": "Panel level", "hybrid_bonding": "Hybrid bonding", "microbump_3d": "Micro-bump 3D",
    "glass": "Glass", "advanced_substrate": "Advanced substrate", "cpo": "Co-packaged optics",
    "thermal_pdn": "Thermal / power delivery", "other": "Other",
    # tv_kind
    "package": "Package", "test_coupon": "Test coupon", "sub_assembly": "Sub-assembly",
    "wafer_level": "Wafer level", "panel_level": "Panel level", "die_stack": "Die stack",
    "simulation_model": "Simulation model",
    # package_class
    "si_interposer_2p5d": "Si interposer 2.5D", "organic_rdl_interposer": "Organic RDL interposer",
    "fan_out_wafer": "Fan-out wafer (FOWLP)", "fan_out_panel": "Fan-out panel (FOPLP)",
    "si_bridge_organic": "Si bridge (organic)", "si_bridge_fanout": "Si bridge (fan-out)",
    "hybrid_bonded_3d": "Hybrid-bonded 3D", "microbump_3d": "Micro-bump 3D",
    "glass_core_substrate": "Glass-core substrate", "glass_interposer": "Glass interposer",
    "glass_embedded_die": "Glass embedded die", "organic_substrate": "Organic substrate",
    "embedded_die_substrate": "Embedded-die substrate", "cpo_module": "CPO module",
    "photonic_interposer": "Photonic interposer", "fiber_subassembly": "Fiber sub-assembly",
    "wafer_scale": "Wafer scale",
    # interconnect_type
    "cu_cu_hybrid": "Cu-Cu hybrid bond", "cu_cu_direct": "Cu-Cu direct bond", "microbump": "Micro-bump",
    "cu_pillar": "Cu pillar", "c4": "C4", "bga": "BGA", "tsv": "TSV", "tgv": "TGV", "tdv": "TDV",
    "tmv": "TMV", "rdl_via": "RDL via", "microvia": "Microvia", "stacked_via": "Stacked via",
    "via_in_via": "Via-in-via", "pth": "PTH", "wire_bond": "Wire bond", "solder_ball": "Solder ball",
    "anisotropic": "Anisotropic (ACF)", "optical_coupling": "Optical coupling",
    # interconnect_level
    "die_to_die_hybrid": "Die-to-die (hybrid)", "die_to_wafer_hybrid": "Die-to-wafer (hybrid)",
    "wafer_to_wafer_hybrid": "Wafer-to-wafer (hybrid)", "die_to_interposer": "Die-to-interposer",
    "die_to_substrate": "Die-to-substrate", "die_to_bridge": "Die-to-bridge",
    "interposer_to_substrate": "Interposer-to-substrate", "substrate_to_board": "Substrate-to-board",
    "die_stack_internal": "Die-stack internal", "through_via": "Through-via", "rdl_via": "RDL via",
    "wire": "Wire bond", "optical": "Optical",
    # bonding_method
    "hybrid_bond_d2w": "Hybrid bond D2W", "hybrid_bond_w2w": "Hybrid bond W2W",
    "hybrid_bond_c2c": "Hybrid bond C2C", "fusion": "Fusion bond", "tcb": "TCB", "tcb_ncf": "TCB + NCF",
    "mass_reflow": "Mass reflow", "lab": "Laser-assisted bonding", "mr_muf": "Mass reflow + MUF",
    "sintering": "Sintering", "thermocompression_cu": "Thermocompression (Cu)", "adhesive": "Adhesive",
    "none": "None",
    # channel_type
    "si_interposer_rdl": "Si interposer RDL", "organic_rdl": "Organic RDL", "si_bridge": "Si bridge",
    "substrate": "Substrate", "hybrid_bond_3d": "Hybrid-bond 3D", "microbump_3d": "Micro-bump 3D",
    "glass": "Glass", "optical_fiber": "Optical fiber", "optical_waveguide": "Optical waveguide",
    "pcb": "PCB",
    # source_status
    "full_text": "Full text", "partial_text": "Partial text", "abstract_only": "Abstract only",
    "needs_download": "Needs download",
    # basis
    "measured": "measured", "design_target": "design target", "simulated": "simulated",
    "derived": "derived", "author_estimate": "author estimate", "stated": "stated",
    "unspecified": "unspecified",
    # source
    "text": "text", "table": "table", "figure_image": "figure", "schematic": "schematic",
    "caption": "caption", "mixed": "mixed",
    # metric_category
    "warpage": "Warpage", "reliability": "Reliability", "thermal": "Thermal",
    "power_delivery": "Power delivery", "electrical": "Electrical", "optical": "Optical",
    "yield": "Yield", "mechanical": "Mechanical", "geometry": "Geometry", "adhesion": "Adhesion",
    "cost": "Cost", "throughput": "Throughput",
}


def label(value: str) -> str:
    """Human label for an enum value: explicit override, else token-wise expansion."""
    if value in LABEL_OVERRIDES:
        return LABEL_OVERRIDES[value]
    parts = value.split("_")
    out = []
    for p in parts:
        t = TOKENS.get(p)
        if t is None:
            t = p[:1].upper() + p[1:]
        out.append(t)
    s = " ".join(out)
    s = s.replace("Cu Cu", "Cu-Cu")
    return s


def enum_table() -> dict[str, list[dict[str, str]]]:
    return {name: [{"value": v, "label": label(v)} for v in values] for name, values in ENUMS.items()}


# ----------------------------------------------------------------------------- readers


def read_csv(name: str) -> list[dict[str, str]]:
    path = DATA / f"{name}.csv"
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as fh:
        return [dict(r) for r in csv.DictReader(fh)]


def num(v: object) -> float | None:
    if v is None:
        return None
    s = str(v).strip()
    if s == "" or s.lower() in {"na", "n/a", "nan", "none"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def ival(v: object) -> int | None:
    f = num(v)
    return int(f) if f is not None and float(f).is_integer() else (int(f) if f is not None else None)


def s(v: object) -> str:
    return "" if v is None else str(v).strip()


def split_list(v: object) -> list[str]:
    return [x.strip() for x in s(v).split(";") if x.strip()]


def parse_quals(v: object) -> dict[str, str]:
    out: dict[str, str] = {}
    for item in split_list(v):
        if ":" in item:
            k, q = item.split(":", 1)
            out[k.strip()] = q.strip()
    return out


def parse_overrides(v: object) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for item in split_list(v):
        if ":" in item:
            k, val = item.split(":", 1)
            out.append({"field": k.strip(), "value": val.strip()})
    return out


def compact(row: dict[str, object]) -> dict[str, object]:
    """Drop empty cells so the JSON stays small; missing keys read as "not reported" in the app."""
    return {k: v for k, v in row.items() if v not in ("", None, [])}


# ----------------------------------------------------------------------------- derived headline

HYBRID_TYPES = {"cu_cu_hybrid", "cu_cu_direct"}
UBUMP_TYPES = {"microbump", "cu_pillar", "solder_ball"}
VIA_TYPES = {"tsv", "tgv", "tdv", "tmv", "pth", "via_in_via", "stacked_via", "microvia"}


def ic_pitch(r: dict[str, str]) -> float | None:
    return num(r.get("pitch_um")) if num(r.get("pitch_um")) is not None else num(r.get("pitch_min_um"))


def headline(tv: dict[str, str], layers: list[dict], ics: list[dict], steps: list[dict],
             eis: list[dict], ois: list[dict], mets: list[dict], comps: list[dict]) -> tuple[dict, dict]:
    """Extreme-value summary for the table and charts. Each value keeps the winning row's provenance."""
    h: dict[str, object] = {}
    meta: dict[str, dict[str, object]] = {}

    def setv(key: str, pair: tuple[float, dict] | None, *, note_prefix: str = "") -> None:
        if pair is None:
            return
        value, row = pair
        h[key] = value
        meta[key] = {
            "basis": row.get("basis"),
            "locator": row.get("locator"),
            "note": (note_prefix + s(row.get("notes"))).strip(),
            "row_id": row.get("ic_id") or row.get("layer_id") or row.get("step_id") or row.get("metric_id"),
        }

    def min_row(rows: list[dict], key: str, *, types: set[str] | None = None, tkey: str = "ic_type",
                value=None) -> tuple[float, dict] | None:
        best = None
        for r in rows:
            if types is not None and s(r.get(tkey)) not in types:
                continue
            v = value(r) if value else num(r.get(key))
            if v is None:
                continue
            if best is None or v < best[0]:
                best = (v, r)
        return best

    # --- pitches (interconnect centre-to-centre)
    anyp = None
    for r in ics:
        v = ic_pitch(r)
        if v is not None and (anyp is None or v < anyp[0]):
            anyp = (v, r)
    setv("min_pitch_um", anyp)
    if anyp:
        h["min_pitch_type"] = s(anyp[1].get("ic_type"))
        h["min_pitch_level"] = s(anyp[1].get("level"))
    setv("hb_pitch_um", min_row(ics, "pitch_um", types=HYBRID_TYPES))
    if "hb_pitch_um" not in h:
        # fall back to pitch_min_um for hybrid rows
        setv("hb_pitch_um", min_row(ics, "pitch_min_um", types=HYBRID_TYPES))
    hp = min_row(ics, "pitch_um", types=UBUMP_TYPES)
    setv("ubump_pitch_um", hp)
    if hp:
        h["ubump_pitch_type"] = s(hp[1].get("ic_type"))
    setv("c4_pitch_um", min_row(ics, "pitch_um", types={"c4", "bga"}))
    setv("c4_pitch_um_alt", min_row(ics, "pitch_min_um", types={"c4", "bga"}))

    # --- vias
    via = min_row(ics, "diameter_um", types=VIA_TYPES)
    setv("via_dia_um", via)
    if via:
        h["via_type"] = s(via[1].get("ic_type"))
    setv("via_pitch_um", min_row(ics, "pitch_um", types=VIA_TYPES))
    # aspect ratio: highest reported
    ar = None
    for r in ics:
        v = num(r.get("aspect_ratio"))
        if v is not None and (ar is None or v > ar[0]):
            ar = (v, r)
    setv("via_ar", ar)

    # --- stack layers
    h["n_stack_layers"] = len(layers)
    lines = [r for r in layers if num(r.get("line_um")) is not None]
    spaces = [r for r in layers if num(r.get("space_um")) is not None]
    rdl_vias = [r for r in layers if s(r.get("structure")) in {"interposer_rdl", "fan_out_rdl", "bonding_interface"} and num(r.get("via_diameter_um")) is not None]
    setv("rdl_line_um", min_row(lines, "line_um"))
    setv("rdl_space_um", min_row(spaces, "space_um"))
    setv("rdl_via_um", min_row(rdl_vias, "via_diameter_um", tkey="structure"))
    die_rows = [r for r in layers if s(r.get("structure")) in {"die", "die_stack"}]
    core_rows = [r for r in layers if s(r.get("structure")) in {"substrate_core", "glass_core"}]
    setv("die_thickness_um", min_row(die_rows, "thickness_um", tkey="structure"))
    setv("core_thickness_um", min_row(core_rows, "thickness_um", tkey="structure"))

    # --- bonding / process
    setv("bond_temp_max_c", _maxrow(ics, "bonding_temp_c"))
    setv("bond_pressure_mpa", _maxrow(ics, "bonding_pressure_mpa"))
    setv("anneal_temp_max_c", _maxrow(ics, "anneal_temp_c"))
    h["n_process_steps"] = len(steps)
    setv("proc_temp_max_c", _maxrow(steps, "temp_c"))

    # --- electrical / optical interfaces
    setv("energy_min_pj_per_bit", min_row(eis, "energy_pj_per_bit", tkey="protocol"))
    setv("lane_rate_max_gbps", _maxrow(eis, "lane_rate_gbps"))
    setv("agg_bw_max_tbps", _maxrow(eis, "aggregate_bw_tbps"))
    setv("coupling_loss_min_db", min_row(ois, "coupling_loss_db", tkey="coupler_type"))
    setv("fiber_pitch_min_um", min_row(ois, "fiber_pitch_um", tkey="coupler_type"))
    setv("wavelength_nm", min_row(ois, "wavelength_nm", tkey="coupler_type"))

    # --- metrics: warpage (largest magnitude) and yield
    warps = [r for r in mets if s(r.get("category")) == "warpage" and num(r.get("value")) is not None]
    best_w = None
    for r in warps:
        v = num(r.get("value"))
        if v is not None and (best_w is None or abs(v) > abs(best_w[0])):
            best_w = (v, r)
    if best_w:
        row = best_w[1]
        h["warpage_um"] = best_w[0]
        meta["warpage_um"] = {
            "basis": row.get("basis"), "locator": row.get("locator"),
            "note": " / ".join(x for x in [s(row.get("variant")), s(row.get("condition")), s(row.get("scope"))] if x),
            "row_id": row.get("metric_id"),
        }
    yields = [num(r.get("yield_pct")) for r in ics if num(r.get("yield_pct")) is not None]
    if yields:
        h["yield_pct"] = min(yields)
    else:
        my = [r for r in mets if s(r.get("category")) == "yield" and num(r.get("value")) is not None]
        if my:
            row = min(my, key=lambda r: num(r.get("value")) or 0)
            h["yield_pct"] = num(row.get("value"))
            meta["yield_pct"] = {"basis": row.get("basis"), "locator": row.get("locator"),
                                 "note": s(row.get("parameter")), "row_id": row.get("metric_id")}
    h["n_metrics"] = len(mets)

    # --- geometry
    px, py = num(tv.get("package_x_mm")), num(tv.get("package_y_mm"))
    if px and py:
        h["area_mm2"] = round(px * py, 3)
    if num(tv.get("interposer_x_mm")) and num(tv.get("interposer_y_mm")):
        h["interposer_area_calc_mm2"] = round(num(tv["interposer_x_mm"]) * num(tv["interposer_y_mm"]), 3)

    h["n_rows"] = len(layers) + len(ics) + len(steps) + len(eis) + len(ois) + len(mets) + len(comps)
    return h, meta


def _maxrow(rows: list[dict], key: str) -> tuple[float, dict] | None:
    best = None
    for r in rows:
        v = num(r.get(key))
        if v is None:
            continue
        if best is None or v > best[0]:
            best = (v, r)
    return best


# ----------------------------------------------------------------------------- evidence


def load_evidence(paper_id: str) -> dict | None:
    path = DATA / "evidence" / f"{paper_id}.yaml"
    if not path.exists():
        return None
    doc = yaml.safe_load(path.read_text()) or {}
    entries = doc.get("entries") or []
    return {
        "verified_on": str(doc.get("verified_on") or ""),
        "figure_reading_method": s(doc.get("figure_reading_method")),
        "notes": s(doc.get("notes")),
        "n_entries": len(entries),
        "entries": [
            {k: e.get(k) for k in ("table", "row_id", "field", "basis", "locator", "note") if e.get(k) not in (None, "")}
            for e in entries
        ],
        "derived": doc.get("derived") or [],
        "conflicts": [
            {k: c.get(k) for k in ("table", "row_id", "field", "values", "locators", "chosen", "why") if c.get(k) not in (None, "")}
            for c in (doc.get("conflicts") or [])
        ],
        "excluded": doc.get("excluded") or [],
        "not_reported": doc.get("not_reported") or [],
    }


# ----------------------------------------------------------------------------- columns meta


def columns_meta() -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for tname, tspec in TABLES.items():
        cols = []
        for cname, cspec in tspec.get("columns", {}).items():
            cols.append({
                "name": cname,
                "label": label(cname) if cname not in {"basis", "source", "locator", "notes", "overrides", "qualifiers"} else cname.capitalize(),
                "type": cspec.get("type"),
                "enum": cspec.get("enum"),
                "required": bool(cspec.get("required")),
            })
        out[tname] = cols
    return out


CHILD_TABLES = ["components", "stack_layers", "interconnects", "process_steps",
                "electrical_interfaces", "optical_interfaces", "metrics"]
TABLE_TITLE = {
    "papers": "Papers", "test_vehicles": "Test vehicles", "components": "Components",
    "stack_layers": "Stack layers", "interconnects": "Interconnects", "process_steps": "Process steps",
    "electrical_interfaces": "Electrical interfaces", "optical_interfaces": "Optical interfaces",
    "metrics": "Metrics",
}


# ----------------------------------------------------------------------------- build


def build() -> dict:
    papers_raw = read_csv("papers")
    tvs_raw = read_csv("test_vehicles")
    children = {t: read_csv(t) for t in CHILD_TABLES}

    by_tv: dict[str, dict[str, list[dict]]] = {}
    for t, rows in children.items():
        m: dict[str, list[dict]] = {}
        for r in rows:
            m.setdefault(s(r.get("tv_id")), []).append(r)
        by_tv[t] = m

    # integrity / distribution counts
    def count_by(rows: list[dict], key: str) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in rows:
            v = s(r.get(key))
            if v:
                out[v] = out.get(v, 0) + 1
        return out

    def count_by_list(rows: list[dict], key: str) -> dict[str, int]:
        out: dict[str, int] = {}
        for r in rows:
            for v in split_list(r.get(key)):
                out[v] = out.get(v, 0) + 1
        return out

    orgs: dict[str, int] = {}
    for p in papers_raw:
        for o in split_list(p.get("orgs")):
            orgs[o] = orgs.get(o, 0) + 1

    papers_out: list[dict] = []
    tvs_out: list[dict] = []
    warnings: list[str] = []

    tv_by_paper: dict[str, list[dict]] = {}
    for tv in tvs_raw:
        tv_by_paper.setdefault(s(tv.get("paper_id")), []).append(tv)

    for p in papers_raw:
        pid = s(p.get("paper_id"))
        ev = load_evidence(pid)
        tvs = tv_by_paper.get(pid, [])
        tables_present = set()
        for tv in tvs:
            for t in CHILD_TABLES:
                if by_tv[t].get(s(tv.get("tv_id"))):
                    tables_present.add(t)
        row = compact({
            "paper_id": pid,
            "label": (s(p.get("first_author")).split()[-1] if s(p.get("first_author")) else pid) + " " + s(p.get("year")),
            "first_author": s(p.get("first_author")),
            "title": s(p.get("title")),
            "year": ival(p.get("year")),
            "venue": s(p.get("venue")),
            "doi": s(p.get("doi")),
            "url": f"https://doi.org/{s(p.get('doi'))}" if s(p.get("doi")) else "",
            "primary_bucket": s(p.get("primary_bucket")),
            "buckets": split_list(p.get("buckets")) or [s(p.get("primary_bucket"))],
            "technology_name": s(p.get("technology_name")),
            "source_status": s(p.get("source_status")),
            "pages_read": s(p.get("pages_read")),
            "n_test_vehicles": ival(p.get("n_test_vehicles")),
            "verified_on": s(p.get("verified_on")),
            "orgs": split_list(p.get("orgs")),
            "notes": s(p.get("notes")),
            "n_tvs": len(tvs),
            "tables_present": sorted(tables_present),
            "evidence": ev,
        })
        # list fields are part of the app contract; compact() drops empties, so restore them
        row["orgs"] = split_list(p.get("orgs"))
        row["tables_present"] = sorted(tables_present)
        papers_out.append(row)

    for tv in tvs_raw:
        tv_id = s(tv.get("tv_id"))
        pid = s(tv.get("paper_id"))
        comps = by_tv["components"].get(tv_id, [])
        layers = by_tv["stack_layers"].get(tv_id, [])
        ics = by_tv["interconnects"].get(tv_id, [])
        steps = by_tv["process_steps"].get(tv_id, [])
        eis = by_tv["electrical_interfaces"].get(tv_id, [])
        ois = by_tv["optical_interfaces"].get(tv_id, [])
        mets = by_tv["metrics"].get(tv_id, [])
        hl, hmeta = headline(tv, layers, ics, steps, eis, ois, mets, comps)

        rows = {}
        for t, rs in (("components", comps), ("stack_layers", layers), ("interconnects", ics),
                      ("process_steps", steps), ("electrical_interfaces", eis),
                      ("optical_interfaces", ois), ("metrics", mets)):
            rows[t] = [compact({**{k: v for k, v in r.items() if k not in ("overrides", "qualifiers")},
                                "quals": parse_quals(r.get("qualifiers")),
                                "overrides": parse_overrides(r.get("overrides"))}) for r in rs]

        tvs_out.append(compact({
            "tv_id": tv_id,
            "paper_id": pid,
            "name": s(tv.get("name")),
            "tv_kind": s(tv.get("tv_kind")),
            "package_class": s(tv.get("package_class")),
            "technology_name": s(tv.get("technology_name")),
            "purpose": s(tv.get("purpose")),
            "carrier_format": s(tv.get("carrier_format")),
            "carrier_size_mm": s(tv.get("carrier_size_mm")),
            "package_x_mm": num(tv.get("package_x_mm")),
            "package_y_mm": num(tv.get("package_y_mm")),
            "package_thickness_mm": num(tv.get("package_thickness_mm")),
            "interposer_x_mm": num(tv.get("interposer_x_mm")),
            "interposer_y_mm": num(tv.get("interposer_y_mm")),
            "interposer_area_mm2": num(tv.get("interposer_area_mm2")),
            "reticle_multiple": num(tv.get("reticle_multiple")),
            "substrate_x_mm": num(tv.get("substrate_x_mm")),
            "substrate_y_mm": num(tv.get("substrate_y_mm")),
            "substrate_layer_count": s(tv.get("substrate_layer_count")),
            "n_dies": ival(tv.get("n_dies")),
            "n_hbm": ival(tv.get("n_hbm")),
            "basis": s(tv.get("basis")),
            "source": s(tv.get("source")),
            "locator": s(tv.get("locator")),
            "quals": parse_quals(tv.get("qualifiers")),
            "overrides": parse_overrides(tv.get("overrides")),
            "notes": s(tv.get("notes")),
            "headline": hl,
            "headline_meta": hmeta,
            "n_rows": hl.get("n_rows", 0),
            "rows": rows,
        }))

    counts = {
        "papers": len(papers_raw),
        "test_vehicles": len(tvs_raw),
        "components": len(children["components"]),
        "stack_layers": len(children["stack_layers"]),
        "interconnects": len(children["interconnects"]),
        "process_steps": len(children["process_steps"]),
        "electrical_interfaces": len(children["electrical_interfaces"]),
        "optical_interfaces": len(children["optical_interfaces"]),
        "metrics": len(children["metrics"]),
        "organizations": len(orgs),
    }
    counts["rows_total"] = sum(counts[t] for t in CHILD_TABLES)
    counts["papers_with_evidence"] = sum(1 for p in papers_out if p.get("evidence"))

    integrity = {
        "counts": counts,
        "per_bucket": count_by(papers_raw, "primary_bucket"),
        "per_tv_kind": count_by(tvs_raw, "tv_kind"),
        "per_package_class": count_by(tvs_raw, "package_class"),
        "per_year": {str(k): v for k, v in sorted(count_by(papers_raw, "year").items())},
        "per_venue_prefix": {},
        "per_source_status": count_by(papers_raw, "source_status"),
        "per_basis": count_by(tvs_raw, "basis"),
        "per_source": count_by(tvs_raw, "source"),
        "per_ic_type": count_by(children["interconnects"], "ic_type"),
        "per_step_category": count_by(children["process_steps"], "category"),
        "per_metric_category": count_by(children["metrics"], "category"),
        "per_material_class": count_by(children["stack_layers"], "material_class"),
        "per_structure": count_by(children["stack_layers"], "structure"),
        "per_bonding_method": count_by(children["interconnects"], "bonding_method"),
        "per_interconnect_level": count_by(children["interconnects"], "level"),
        "per_organization": dict(sorted(orgs.items(), key=lambda kv: -kv[1])),
        "tables_present": {t: sum(1 for tv in tvs_out if tv["rows"].get(t)) for t in CHILD_TABLES},
    }

    return compact({
        "meta": {
            "generated_on": dt.date.today().isoformat(),
            "schema_version": SCHEMA.get("version", 1),
            "title": "Advanced Packaging Atlas",
            "table_titles": TABLE_TITLE,
            "child_tables": CHILD_TABLES,
            "basis_definition": "Every extracted value carries basis (measured, design target, simulated, derived, "
                                "author estimate, stated, unspecified) and source (text, table, figure, schematic, caption, mixed). "
                                "Empty means not reported in the source; nothing is estimated.",
            "headline_definition": "Headline numbers pick the most extreme matching row (minimum pitch, via diameter, "
                                   "minimum RDL line/space, minimum coupon loss; maximum bonding/process temperature, "
                                   "energy basis is minimum). The tooltip names the winning row's basis and locator.",
        },
        "integrity": integrity,
        "enums": enum_table(),
        "columns": columns_meta(),
        "papers": papers_out,
        "tvs": tvs_out,
        "warnings": warnings,
    })


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = ap.parse_args()
    doc = build()
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False))
    size = args.out.stat().st_size / 1e6
    c = doc["integrity"]["counts"]
    print(f"wrote {args.out} ({size:.2f} MB): {c['papers']} papers, {c['test_vehicles']} test vehicles, "
          f"{c['rows_total']} child rows")


if __name__ == "__main__":
    main()
