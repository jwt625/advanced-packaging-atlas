#!/usr/bin/env python3
"""Score the 3D package models (app/static/data/package3d.json) on the DevLog-011 fidelity metrics M1-M6.

Inputs: the package3d.json contract (DevLog-008 v1 + DevLog-011 routing), config/package3d/fidelity_checklist.yaml
(archetype element checks + per-family mapping) and the extraction database data/stack_layers.csv,
data/interconnects.csv, data/test_vehicles.csv (DB ranges for M5 / M6).

Metrics (per family)
  M1 provenance share   reported / derived / template share of all dims, recounted from the JSON the way the
                        generator counts them (once per declared part / layer element / array / via class / net;
                        fill parts skip h_um) and including layer `route` dims and routing via / net dims.
  M2 structural         present / expected checklist elements over the family's archetype entries (missing listed).
  M3 continuity         every vertical net (segment) walked by z from the bottom of its `from` array down to the top
                        of its `to` array through conductor layers, via classes and arrays under one xy probe point:
                        z gaps / overlaps > tol and non-conductor layers crossed with no via are issues. xy issues
                        (F2): a grid through-via (pth / tsv / tgv / tdv / tmv with pitch_um) on the walk whose nearest
                        endpoint array above or below it on the chain (bump / pillar / hybrid bond / BGA) is reached
                        with no jog level of the net in between, and neither pitch divides the other (ratio within
                        1 % of an integer). A segment with z or xy issues is not clean. Segments that share an endpoint
                        array are chained (to of one = from of the next); a chain from a die joint array to the
                        board-level array is the top-to-board chain. Orphans: routed levels that no via class touches
                        (upper / lower). M3 and M4 are completeness / consistency checks, not fidelity.
  M4 resolution         routed conductor levels / conductor levels; dielectrics between consecutive routed levels of a
                        scope (archetype entry, else host part) spanned by a via class / such dielectrics.
  M5 plausibility       each routing dim vs the DB range of the same structure class (mapping in LAYER_CLASS /
                        VIA_CLASS below; route line / space over conductor rows only), built from PHYSICAL rows only
                        (see physical_row: no simulation_model / simulated TV, no simulated row, no sweep or
                        simulation-input row by notes text; `--all-rows` disables the filter, the all-row min-max is
                        kept per item as `db_all`). M5a = outside the min-max (listed with the bounding rows);
                        M5b = inside it but outside the P10-P90 band of the physical rows (n >= 10), counted in its own
                        column. A single-valued range (min = max) is not counted when the value is within 50 % of it
                        (`single_row_range`, shown in the table with its count).
  M6 rules              (heuristics) land > via diameter; through-via pitch >= land; microvia aspect ratio
                        h / laser-entry (larger of diameter_um, bottom_diameter_um) diameter within the DB range of the
                        host class (AR_PCLASS; range n printed); pitch hierarchy die bump <= C4 <= BGA;
                        land_space: effective via pitch - land >= space of each routed level the via lands on (1 um
                        floor when the level states no space), for every via class with a land; effective pitch = the
                        class grid pitch, else the smallest endpoint-array pitch of the endpoint stretches the via sits
                        in (stretch = vias between an endpoint array and the net's first / last jog level; hybrid-bond
                        fields included); escape_ls: one trace between two lands (pitch - land >= line + 2 x space) on
                        AT LEAST ONE routed signal level of each endpoint stretch at the endpoint pitch, and of each
                        grid via class at its grid pitch (A1 S4: escape routing needs one level, not every level);
                        beol_via / bridge_via classes and hybrid-bond endpoints get land_space only (full-array pad
                        fields). Via classes without land_um are listed (`no-land`): their land rules are not
                        evaluated. Secondary flags (atypical, not counted): microvia AR outside the DB P10-P90, Cu
                        level thicker than the via dielectric.
  F1 fix pass (2026-10-20): through-part via ends (null upper / lower from the generator) resolve to the conductor
  level, via class, or endpoint array (through a cover layer opening) of the neighbouring part at each via z face
  (M2 `needs: [upper, lower]`, M3 orphans); M2 checks may be not applicable (die_encap of a joint with no next-level
  part below it), shown as `n/a` and not counted; `when: {dies_share_min: n}` = >= n dies on one instance of the
  scope; M3 / M4 count a joint array (bump / pillar / hybrid bond) as the link across the gap it spans and a level in
  z contact with a touched routed level as touched; M5 rows with an empty / `unspecified` material_class take a class
  inferred from material / layer name text, restricted to classes consistent with the row's layer_role (ROLE_MCLASS,
  F2); beol_via lands have no DB class (the DB pad cells are RDL-via caps); tmv ranges include through-via Cu pillars.
  F2 fix pass (2026-10-20, audit DevLog/audits/package3d_routing_audit_A1_2026-10-20.md): microvia AR on the entry
  diameter (S1); physical-row ranges + counted M5b (S2); M3 xy check (S3); the former L/S-between-lands skips for
  beol_via / bridge_via / bond fields replaced by land_space, and the L/S rule relaxed to one escape level per stretch
  (S4, S6); no-land listing (S8); checklist pth_class gated on core thickness and plug (S9).
  L18 (2026-10-21): per-region level properties (`route.regions`): M1 counts region dims, M5 checks the L/S a region
  states, M6 land_space / escape_ls take the region's space / use for a via class whose `regions` lie inside the
  region, and skip a landed level an embedded part cuts out at the via region (route_at, landed).
  N/A where a metric has nothing to evaluate (no routing, no vertical nets, no routed levels).

Outputs: outputs/package3d_scores/<YYYY-MM-DD>_<HHMMSS>.json and .md (table + per-family details); the table is
printed.

Usage: uv run python scripts/score_package3d.py [package3d.json] [--family ID ...] [--json OUT.json]
       [--checklist PATH] [--all-rows] [--label TEXT]
"""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import itertools
import json
import math
import re
import sys
from collections.abc import Callable
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DEFAULT_JSON = ROOT / "app" / "static" / "data" / "package3d.json"
DEFAULT_CHECKLIST = ROOT / "config" / "package3d" / "fidelity_checklist.yaml"
OUT_DIR = ROOT / "outputs" / "package3d_scores"
TOL = 0.1  # um, z gap / overlap tolerance (DevLog-011 M3)
STATUSES = ("reported", "derived", "template")
CORE_MATERIALS = {"organic_laminate", "glass", "silicon", "mold_compound"}
BUMP_KINDS = {"microbump", "cu_pillar", "c4", "hybrid_bond"}
GRID_VIAS = {"pth", "tsv", "tgv", "tdv", "tmv"}
ENCAP_MATERIALS = {"underfill", "mold_compound", "oxide"}

# M5 class mapping. Layers: (archetype, zone class) -> stack_layers.structure values. The zone class is "core" for
# layers inside the archetype's core range (core layer / core part), "cover" for passivation, else "levels".
LAYER_CLASS: dict[str, dict[str, list[str]]] = {
    "organic_substrate": {"levels": ["substrate_buildup"], "core": ["substrate_core"],
                          "cover": ["solder_mask", "substrate_buildup"]},
    "glass_core_substrate": {"levels": ["substrate_buildup"], "core": ["glass_core"],
                             "cover": ["solder_mask", "substrate_buildup"]},
    "si_tsv_interposer": {"levels": ["interposer_rdl", "interposer"], "core": ["interposer"],
                          "cover": ["interposer_rdl", "interposer"]},
    "organic_rdl_interposer": {"levels": ["interposer_rdl", "fan_out_rdl"], "core": ["interposer", "mold"],
                               "cover": ["interposer_rdl", "fan_out_rdl"]},
    "si_bridge_substrate": {"levels": ["bridge"], "core": ["bridge"], "cover": ["bridge"]},
    "bridge_in_mold": {"levels": ["bridge"], "core": ["bridge"], "cover": ["bridge"]},
    "hybrid_bond_stack": {"levels": ["bonding_interface", "die"], "core": ["die"], "cover": ["bonding_interface"]},
    "hbm_stack": {"levels": ["die_stack", "die"], "core": ["die_stack", "die"], "cover": ["die_stack", "die"]},
    "die": {"levels": ["die"], "core": ["die"], "cover": ["die"]},
}
# fallback by host part kind when a layer's host is in no archetype entry
KIND_ARCHETYPE = {"substrate": "organic_substrate", "interposer": "organic_rdl_interposer", "bridge": "bridge_in_mold",
                  "die": "die", "hbm": "die"}


def host_kind(fam: Fam, tid: str) -> str:
    """Part kind for archetype binning; a kind-`other` part embedded `in:` a host takes the host's kind (e.g. the
    emib_t build-up over the bridge is substrate build-up, not a die)."""
    p = fam.ptpl[tid][0] if tid in fam.ptpl else {}
    kind = str(p.get("kind", ""))
    seen = {tid}
    while kind not in KIND_ARCHETYPE and p.get("in"):
        h = str(p["in"])
        hp = next((q for qs in fam.ptpl.values() for q in qs if q["id"] == h or q.get("template_id") == h), None)
        if hp is None or h in seen:
            break
        seen.add(h)
        p, kind = hp, str(hp.get("kind", ""))
    return kind
# Via kinds -> interconnects.ic_type values (+ optional interconnects.level filter) and stack_layers structures whose
# via_diameter_um / via_pitch_um also bound the range. beol_via: the DB has no BEOL via type; rdl_via rows at level
# rdl_via plus the BEOL structures' via cells are used. bridge_via: EMIB-style laser vias onto bridge pads and
# bridge-in-mold studs / vias are recorded as microvia / stacked_via / rdl_via.
VIA_CLASS: dict[str, dict[str, list[str]]] = {
    "microvia": {"ic_type": ["microvia", "stacked_via", "via_in_via"], "sl": ["substrate_buildup", "glass_core"]},
    "rdl_via": {"ic_type": ["rdl_via"], "sl": ["interposer_rdl", "fan_out_rdl"]},
    "beol_via": {"ic_type": ["rdl_via"], "level": ["rdl_via"], "sl": ["interposer_rdl", "bridge", "die"]},
    "pth": {"ic_type": ["pth"], "sl": ["substrate_core"]},
    "tsv": {"ic_type": ["tsv"], "sl": ["interposer"]},
    "tgv": {"ic_type": ["tgv"], "sl": ["glass_core"]},
    "tdv": {"ic_type": ["tdv"], "sl": []},
    "tmv": {"ic_type": ["tmv", "tiv", "cu_pillar"], "level": ["through_via"], "sl": []},
    "bridge_via": {"ic_type": ["microvia", "stacked_via", "rdl_via"], "sl": ["bridge"]},
}
# via kind -> dims without a DB class (beol_via: interconnects pad cells are RDL-via caps, 11-60 um, not BEOL lands)
VIA_NO_DB = {"beol_via": {"land_um"}}
# M5 via dims -> DB columns
VIA_IC_FIELDS = {"diameter_um": ["diameter_um"], "bottom_diameter_um": ["diameter_um"],
                 "land_um": ["pad_x_um", "pad_y_um"], "pitch_um": ["pitch_um", "pitch_min_um", "pitch_max_um"]}
VIA_SL_FIELDS = {"diameter_um": ["via_diameter_um"], "bottom_diameter_um": ["via_diameter_um"],
                 "pitch_um": ["via_pitch_um"]}
# M5 layer thickness: JSON material key -> stack_layers.material_class values of comparable rows (so a polymer
# build-up dielectric is not bounded by a nitride liner of the same structure class); unmapped keys: no filter
MATERIAL_CLASS = {"copper": ["metal"], "organic_build_up": ["dielectric_polymer", "organic_laminate"],
                  "polymer_dielectric": ["dielectric_polymer"], "organic_laminate": ["organic_laminate"],
                  "glass": ["glass"], "silicon": ["silicon"], "oxide": ["dielectric_inorganic"],
                  "mold_compound": ["mold_compound"]}


# stack_layers rows with an empty / unspecified material_class: class inferred from material + layer name text
# (first match wins); no match = the row stays out of material-filtered ranges
MCLASS_TEXT = [
    (r"polyimide|\bPI\d*\b|\bPBO\b|\bPID\b|\bPM\d*\b|repassivation|polymer|\bBCB\b|\bABF\b|photo.?dielectric",
     "dielectric_polymer"),
    (r"\bEMC\b|mold", "mold_compound"),
    (r"SiO2|oxide|nitride|\bSiN\b|SiCN|\bUSG\b", "dielectric_inorganic"),
    (r"glass", "glass"),
    (r"\bCu\b|copper|\bAl\b|alumin", "metal"),
    (r"silicon|\bSi\b", "silicon"),
]


# inferred classes must be consistent with the row's layer_role (A1 minor M8): a conductor row is never inferred as
# silicon, a dielectric row never as metal; roles not listed accept any inferred class
ROLE_MCLASS = {"conductor": {"metal"}, "seed": {"metal"},
               "dielectric": {"dielectric_polymer", "dielectric_inorganic", "mold_compound", "glass"},
               "passivation": {"dielectric_polymer", "dielectric_inorganic"},
               "bonding": {"dielectric_polymer", "dielectric_inorganic", "metal"}}


def row_mclass(r: dict[str, str]) -> str:
    mc = r.get("material_class") or ""
    if mc and mc != "unspecified":
        return mc
    text = f"{r.get('material', '')} {r.get('layer_name', '')}"
    ok = ROLE_MCLASS.get(r.get("layer_role") or "")
    for rx, cls in MCLASS_TEXT:
        if (ok is None or cls in ok) and re.search(rx, text, re.IGNORECASE):
            return cls
    return mc


# ----------------------------------------------------------------------------- helpers


def num(v: Any) -> float | None:
    if v is None or v == "":
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if math.isfinite(x) else None


def read_csv(name: str) -> list[dict[str, str]]:
    with (DATA / name).open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


Rect = tuple[float, float, float, float]


def rect(o: dict) -> Rect:
    x, y, w, d = (float(o.get(k, 0) or 0) for k in ("x_mm", "y_mm", "w_mm", "d_mm"))
    return (x - w / 2, y - d / 2, x + w / 2, y + d / 2)


def overlap(a: Rect, b: Rect) -> bool:
    return min(a[2], b[2]) - max(a[0], b[0]) > 1e-9 and min(a[3], b[3]) - max(a[1], b[1]) > 1e-9


def contains(a: Rect, p: tuple[float, float]) -> bool:
    return a[0] - 1e-9 <= p[0] <= a[2] + 1e-9 and a[1] - 1e-9 <= p[1] <= a[3] + 1e-9


def covers(a: Rect, b: Rect) -> bool:
    return a[0] <= b[0] + 1e-9 and a[1] <= b[1] + 1e-9 and a[2] >= b[2] - 1e-9 and a[3] >= b[3] - 1e-9


def route_at(lyr: dict, rects: list[Rect] | None) -> dict | None:
    """The level's route properties where `rects` lie: a `route.regions` entry (L18 2026-10-21, per-region level
    properties) when every rect lies inside one of its footprints, else the level's own route."""
    r = lyr.get("route")
    if not isinstance(r, dict):
        return None
    if rects:
        for rg in r.get("regions") or []:
            fr = [rect(x) for x in rg.get("rects") or []]
            if fr and all(any(covers(f, q) for f in fr) for q in rects):
                return rg
    return r


def fmt(v: float | None) -> str:
    if v is None:
        return "N/A"
    return f"{v:.6g}"


def lst(v: Any) -> list:
    if v is None:
        return []
    return list(v) if isinstance(v, (list, tuple)) else [v]


# ----------------------------------------------------------------------------- database ranges


@dataclass
class Range:
    lo: float | None = None
    hi: float | None = None
    lo_row: str = ""
    hi_row: str = ""
    n: int = 0
    vals: list[float] = field(default_factory=list)

    def add(self, v: float | None, row: str) -> None:
        if v is None:
            return
        self.n += 1
        self.vals.append(v)
        if self.lo is None or v < self.lo:
            self.lo, self.lo_row = v, row
        if self.hi is None or v > self.hi:
            self.hi, self.hi_row = v, row

    def pct(self, q: float) -> float | None:
        """Nearest-rank percentile of the DB values (used for the secondary `atypical` flag only)."""
        if not self.vals:
            return None
        xs = sorted(self.vals)
        return xs[min(len(xs) - 1, max(0, math.ceil(q / 100 * len(xs)) - 1))]

    def json(self) -> dict:
        return {"min": self.lo, "max": self.hi, "n": self.n, "min_row": self.lo_row, "max_row": self.hi_row,
                "p10": self.pct(10), "p90": self.pct(90)}


# Physical-row filter (A1 S2, F2 2026-10-20). A DB row is non-physical when (1) its TV has
# test_vehicles.tv_kind = simulation_model, or (2) its TV has test_vehicles.basis = simulated, or (3) the row itself has
# basis = simulated, or (4) the row's notes match SWEEP_RX (parameter sweeps and simulation-input rows recorded under a
# physical TV, e.g. ectc51687.2025.00178-g-L01 "Thickness swept 60-300 um (simulation)"). DOE legs of fabricated
# hardware stay in (their value is a built structure).
SWEEP_RX = re.compile(r"\bswe(?:pt|ep|eps|eping)\b|simulation input|\(simulation\)|assumed in simulation|"
                      r"simulation assumes|swept analysis", re.IGNORECASE)


def physical_row(r: dict[str, str], tvs: dict[str, dict[str, str]]) -> bool:
    tv = tvs.get(r["tv_id"], {})
    if tv.get("tv_kind") == "simulation_model" or tv.get("basis") == "simulated" or r.get("basis") == "simulated":
        return False
    return not SWEEP_RX.search(r.get("notes") or "")


class DB:
    def __init__(self, all_rows: bool) -> None:
        tvs = {r["tv_id"]: r for r in read_csv("test_vehicles.csv")}
        sl, ic = read_csv("stack_layers.csv"), read_csv("interconnects.csv")
        self.sl = sl if all_rows else [r for r in sl if physical_row(r, tvs)]
        self.ic = ic if all_rows else [r for r in ic if physical_row(r, tvs)]
        self.n_tv = len(tvs)
        self.n_sl_all, self.n_ic_all = len(sl), len(ic)
        self.pclass = {k: v.get("package_class", "") for k, v in tvs.items()}
        self.physical_only = not all_rows
        self.cache: dict[tuple, Range] = {}

    def sl_range(self, structures: list[str], roles: list[str] | None, fields: list[str],
                 feature_re: str | None = None, mclass: list[str] | None = None) -> Range:
        key = ("sl", tuple(structures), tuple(roles or []), tuple(fields), feature_re, tuple(mclass or []))
        if key in self.cache:
            return self.cache[key]
        rg = Range()
        rx = re.compile(feature_re, re.IGNORECASE) if feature_re else None
        for r in self.sl:
            if structures and r["structure"] not in structures:
                continue
            if roles and r["layer_role"] not in roles:
                continue
            if mclass and row_mclass(r) not in mclass:
                continue
            if rx and not rx.search(f"{r['feature']} {r['layer_name']}"):
                continue
            for f in fields:
                rg.add(num(r.get(f)), f"{r['layer_id']}.{f}")
        self.cache[key] = rg
        return rg

    def ic_range(self, types: list[str], levels: list[str] | None, fields: list[str]) -> Range:
        key = ("ic", tuple(types), tuple(levels or []), tuple(fields))
        if key in self.cache:
            return self.cache[key]
        rg = Range()
        for r in self.ic:
            if r["ic_type"] not in types or (levels and r["level"] not in levels):
                continue
            for f in fields:
                rg.add(num(r.get(f)), f"{r['ic_id']}.{f}")
        self.cache[key] = rg
        return rg

    def ar_range(self, types: list[str], pclasses: list[str] | None = None,
                 sl_structures: list[str] | None = None) -> Range:
        """Aspect ratio (depth / diameter): interconnects rows (the aspect_ratio cell, else (depth or height) /
        diameter of the same row) plus stack_layers dielectric rows of `sl_structures` carrying both thickness_um
        and via_diameter_um (depth taken as the dielectric thickness, as in ROUTING_REF_substrate.md). `pclasses`
        restricts both to TVs of those package classes; with fewer than 3 values the restriction is dropped."""
        key = ("ar", tuple(types), tuple(pclasses or []), tuple(sl_structures or []))
        if key in self.cache:
            return self.cache[key]
        rg = self._ar(types, pclasses, sl_structures)
        if pclasses and rg.n < 3:
            rg = self._ar(types, None, sl_structures)
        self.cache[key] = rg
        return rg

    def _ar(self, types: list[str], pclasses: list[str] | None, sl_structures: list[str] | None) -> Range:
        rg = Range()
        for r in self.sl:
            if not sl_structures or r["structure"] not in sl_structures or r["layer_role"] != "dielectric":
                continue
            if pclasses and self.pclass.get(r["tv_id"]) not in pclasses:
                continue
            t, d = num(r.get("thickness_um")), num(r.get("via_diameter_um"))
            if t and d:
                rg.add(t / d, f"{r['layer_id']}.thickness_um/via_diameter_um")
        for r in self.ic:
            if r["ic_type"] not in types:
                continue
            if pclasses and self.pclass.get(r["tv_id"]) not in pclasses:
                continue
            ar = num(r.get("aspect_ratio"))
            src = f"{r['ic_id']}.aspect_ratio"
            if ar is None:
                d = num(r.get("diameter_um"))
                h = num(r.get("depth_um")) or num(r.get("height_um"))
                if d and h:
                    ar, src = h / d, f"{r['ic_id']}.(depth_um|height_um)/diameter_um"
            rg.add(ar, src)
        return rg


# ----------------------------------------------------------------------------- family model


@dataclass
class Fam:
    raw: dict
    parts: list[dict] = field(default_factory=list)
    layers: list[dict] = field(default_factory=list)
    arrays: list[dict] = field(default_factory=list)
    vias: list[dict] = field(default_factory=list)
    nets: list[dict] = field(default_factory=list)

    def __post_init__(self) -> None:
        f = self.raw
        self.parts, self.layers, self.arrays = f.get("parts", []), f.get("layers", []), f.get("arrays", [])
        rt = f.get("routing") or {}
        self.vias, self.nets = rt.get("vias", []) or [], rt.get("nets", []) or []
        self.pby = {p["id"]: p for p in self.parts}
        self.ptpl: dict[str, list[dict]] = {}
        for p in self.parts:
            self.ptpl.setdefault(p.get("template_id", p["id"]), []).append(p)
        self.lby = {lyr["id"]: lyr for lyr in self.layers}
        self.aby = {a["id"]: a for a in self.arrays}

    @property
    def id(self) -> str:
        return str(self.raw["id"])

    def ptid(self, pid: str) -> str:
        p = self.pby.get(pid)
        return str(p.get("template_id", pid)) if p else pid

    def layer_insts(self, lyr: dict) -> list[dict]:
        ids = lyr.get("instances") or [lyr["part"]]
        out = [self.pby[i] for i in ids if i in self.pby]
        if not out and lyr["part"] in self.ptpl:
            out = self.ptpl[lyr["part"]]
        return out

    def layer_host(self, lyr: dict) -> str:
        return self.ptid(lyr["part"])

    def via_insts(self, v: dict) -> list[dict]:
        if v.get("instances"):
            return [self.pby[i] for i in v["instances"] if i in self.pby]
        host = str(v.get("part", ""))
        if host in self.pby and self.pby[host].get("template_id", host) != host:
            return [self.pby[host]]
        insts = self.ptpl.get(host, [])
        z0, z1 = float(v["z_um"]), float(v["z_um"]) + float(v["h_um"])
        return [p for p in insts if p["z_um"] - TOL <= z0 and p["z_um"] + p["h_um"] + TOL >= z1] or insts

    def arrays_of(self, ref: str) -> list[dict]:
        return [a for a in self.arrays if a["id"] == ref or a.get("template_id") == ref]

    def atid(self, ref: str) -> str:
        a = self.aby.get(ref)
        return str(a.get("template_id", ref)) if a else ref


def top(o: dict) -> float:
    return float(o["z_um"]) + float(o["h_um"])


def via_rects(fam: Fam, v: dict) -> list[Rect]:
    regs = v.get("regions")
    if regs:
        return [rect(r) for r in regs]
    return [rect(h) for h in fam.via_insts(v)]


def via_end(fam: Fam, v: dict, k: str) -> str | None:
    """The via's `upper` / `lower` id; a null end (through-part via, or a span ending at a host face) resolves to the
    element of a neighbouring part at that z face with xy overlap: a conductor layer, else another via entry, else an
    endpoint array, else an array reached through a cover layer (passivation / dielectric opening) at that face."""
    if v.get(k):
        return str(v[k])
    up = k == "upper"
    zf = top(v) if up else float(v["z_um"])
    rs = via_rects(fam, v)

    def hit(rr: list[Rect]) -> bool:
        return any(overlap(a, b) for a in rs for b in rr)

    def face(o: dict) -> float:
        return float(o["z_um"]) if up else top(o)

    for lyr in fam.layers:
        if is_conductor(lyr) and abs(face(lyr) - zf) <= TOL and hit([rect(h) for h in fam.layer_insts(lyr)]):
            return str(lyr["id"])
    for w in fam.vias:
        if w["id"] != v["id"] and abs(face(w) - zf) <= TOL and hit(via_rects(fam, w)):
            return str(w["id"])
    for a in fam.arrays:
        if a["kind"] in BUMP_KINDS | {"bga"} and abs(face(a) - zf) <= TOL and hit([rect(a["region"])]):
            return str(a["id"])
    for lyr in fam.layers:  # cover layer with an opening onto an endpoint array
        if lyr.get("role") in ("passivation", "dielectric") and abs(face(lyr) - zf) <= TOL \
                and hit([rect(h) for h in fam.layer_insts(lyr)]):
            zo = top(lyr) if up else float(lyr["z_um"])
            for a in fam.arrays:
                if a["kind"] in BUMP_KINDS | {"bga"} and abs(face(a) - zo) <= TOL and hit([rect(a["region"])]):
                    return str(a["id"])
    return None


def routed(lyr: dict) -> bool:
    return isinstance(lyr.get("route"), dict)


def is_conductor(lyr: dict) -> bool:
    return lyr.get("role") == "conductor"


# ----------------------------------------------------------------------------- M1


def m1(fam: Fam) -> dict:
    base = {s: 0 for s in STATUSES}
    rout = {s: 0 for s in STATUSES}

    def add(c: dict[str, int], dims: dict) -> None:
        for v in (dims or {}).values():
            st = v.get("status") if isinstance(v, dict) else None
            if st in c:
                c[st] += 1

    for sec in ("parts", "layers", "arrays"):
        seen: set[str] = set()
        for e in fam.raw.get(sec, []):
            t = e.get("template_id", e["id"])
            if t in seen:
                continue
            seen.add(t)
            dims = dict(e.get("dims") or {})
            if sec == "parts" and "margin_mm" in dims:  # fill part: its height is the standoff array's height
                dims.pop("h_um", None)
            add(base, dims)
            if sec == "layers" and routed(e):
                add(rout, e["route"].get("dims") or {})
                for rg in e["route"].get("regions") or []:
                    add(rout, rg.get("dims") or {})
    seen = set()
    for v in fam.vias:
        t = v.get("template_id", v["id"])
        if t not in seen:
            seen.add(t)
            add(rout, v.get("dims") or {})
    for n in fam.nets:
        add(rout, n.get("dims") or {})
    tot = {s: base[s] + rout[s] for s in STATUSES}
    total = sum(tot.values())
    gen = fam.raw.get("dim_counts") or {}
    gen_c = {s: int(gen.get(s, 0)) for s in STATUSES}
    match = "base+routing" if gen_c == tot else ("base only" if gen_c == base else "MISMATCH")
    return {"counts": tot, "base_counts": base, "routing_counts": rout, "routing_dims": sum(rout.values()),
            "share": {s: round(tot[s] / total, 3) if total else 0.0 for s in STATUSES},
            "generator_counts": gen_c, "generator_match": match}


# ----------------------------------------------------------------------------- scopes and zones


@dataclass
class Scope:
    fam: Fam
    archetype: str
    tids: list[str]
    variants: list[str]
    parts: list[dict] = field(default_factory=list)

    def __post_init__(self) -> None:
        self.parts = [p for t in self.tids for p in self.fam.ptpl.get(t, [])]
        self.ids = {p["id"] for p in self.parts} | set(self.tids)
        self.top = max((top(p) for p in self.parts), default=0.0)
        self.bottom = min((float(p["z_um"]) for p in self.parts), default=0.0)
        self.rects = [rect(p) for p in self.parts]
        self.layers = [lyr for lyr in self.fam.layers if self.fam.layer_host(lyr) in self.tids]
        self.vias = [v for v in self.fam.vias if str(v.get("part")) in self.tids
                     or self.fam.ptid(str(v.get("part"))) in self.tids]
        self.core = self._core()

    def _core(self) -> tuple[float, float] | None:
        cores = [lyr for lyr in self.layers if lyr.get("role") == "core"]
        if cores:
            c = max(cores, key=lambda x: float(x["h_um"]))
            return (float(c["z_um"]), top(c))
        if len(self.tids) > 1:
            cand = [p for p in self.parts if p.get("material") in CORE_MATERIALS
                    and not any(self.fam.layer_host(lyr) == p.get("template_id", p["id"]) for lyr in self.layers)]
            if cand:
                c = max(cand, key=lambda x: float(x["h_um"]))
                return (float(c["z_um"]), top(c))
        return None

    def overlaps(self, r: Rect) -> bool:
        return any(overlap(r, s) for s in self.rects)

    def in_zone(self, o: dict, zone: str | None, conductors: list[dict] | None = None) -> bool:
        z0, z1 = float(o["z_um"]), top(o)
        if zone in (None, "any"):
            return True
        if zone == "face_top":
            return abs(z1 - self.top) <= TOL
        if zone == "face_bottom":
            return abs(z0 - self.bottom) <= TOL
        if zone in ("outer_top", "outer_bottom"):
            cs = conductors if conductors is not None else [lyr for lyr in self.layers if is_conductor(lyr)]
            if not cs:
                return False
            ref = max(cs, key=top) if zone == "outer_top" else min(cs, key=lambda x: float(x["z_um"]))
            return o is ref or (abs(z0 - float(ref["z_um"])) <= TOL and abs(z1 - top(ref)) <= TOL)
        c = self.core
        if zone == "above_core":
            return c is None or z0 >= c[1] - TOL
        if zone == "below_core":
            return c is not None and z1 <= c[0] + TOL
        if zone == "core_faces":
            if c is None:
                return False
            inside = z0 >= c[0] - TOL and z1 <= c[1] + TOL
            touch = abs(z0 - c[1]) <= TOL or abs(z1 - c[0]) <= TOL
            return inside or touch
        raise ValueError(f"unknown zone {zone!r}")

    def array_face(self, a: dict, face: str) -> bool:
        r = rect(a["region"])
        if not self.overlaps(r):
            return False
        if face == "top":  # on the top face, or an in-layer array (die-pad via) reaching it
            return abs(float(a["z_um"]) - self.top) <= TOL or (a.get("mount") == "in" and abs(top(a) - self.top) <= TOL)
        if face == "bottom":
            return abs(top(a) - self.bottom) <= TOL
        if face == "inside":
            return (float(a["z_um"]) >= self.bottom - TOL and top(a) <= self.top + TOL
                    and bool(set(lst(a.get("between"))) & self.ids))
        if face == "any":
            return any(self.array_face(a, f) for f in ("top", "bottom", "inside"))
        raise ValueError(f"unknown face {face!r}")

    def dies_share(self, gap_max: float) -> int:
        """Most die / hbm instances sitting on one scope part instance (two tiles on two separate base dies = 1)."""
        best = 0
        for s in self.parts:
            n = 0
            for p in self.fam.parts:
                if p.get("kind") not in ("die", "hbm") or p["id"] in self.ids:
                    continue
                dz = float(p["z_um"]) - top(s)
                if -TOL <= dz <= gap_max + TOL and overlap(rect(s), rect(p)):
                    n += 1
            best = max(best, n)
        return best

    def dies_over(self, gap_max: float) -> int:
        n = 0
        for p in self.fam.parts:
            if p.get("kind") not in ("die", "hbm") or p["id"] in self.ids:
                continue
            dz = float(p["z_um"]) - self.top
            if -TOL <= dz <= gap_max + TOL and self.overlaps(rect(p)):
                n += 1
        return n


# ----------------------------------------------------------------------------- M2 element checks


class Checker:
    def __init__(self, fam: Fam, cfg: dict) -> None:
        self.fam = fam
        self.gap_max = float(cfg.get("dies_over_gap_max_um", 300))

    # each returns (ok, detail)
    def run(self, sc: Scope, chk: dict) -> tuple[bool | None, str]:
        """(ok, detail); ok None = not applicable (the element is not expected for this scope)."""
        t = chk["type"]
        fn = getattr(self, f"c_{t}", None)
        if fn is None:
            raise ValueError(f"unknown check type {t!r}")
        ok, det = fn(sc, chk)
        return (None if ok is None else bool(ok)), str(det)

    def c_any_of(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        dets = []
        for sub in chk["of"]:
            ok, det = self.run(sc, sub)
            if ok:
                return True, f"{sub['type']}: {det}"
            dets.append(f"{sub['type']}: {det}")
        return False, " | ".join(dets)

    def c_part(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        pool = self.fam.parts if chk.get("where") == "family" else sc.parts
        hits = []
        rx = re.compile(chk["name_re"], re.IGNORECASE) if chk.get("name_re") else None
        dies = [rect(p) for p in self.fam.parts if p.get("kind") in ("die", "hbm")]
        for p in pool:
            if chk.get("kind") and p.get("kind") not in chk["kind"]:
                continue
            if chk.get("material") and p.get("material") not in chk["material"]:
                continue
            if chk.get("in_kind"):
                host = self.fam.pby.get(str(p.get("in", "")))
                if host is None or host.get("kind") not in chk["in_kind"]:
                    continue
            if chk.get("z_index") and "z_index" not in p:
                continue
            if chk.get("max_h_um") is not None and float(p["h_um"]) > float(chk["max_h_um"]):
                continue
            if chk.get("frame") and not re.search(r"_[nsew]$", p["id"]):
                continue
            if rx and not rx.search(f"{p.get('template_id', '')} {p.get('name', '')}"):
                continue
            if chk.get("covers_die") and not any(covers(rect(p), d) for d in dies):
                continue
            hits.append(p["id"])
        need = int(chk.get("count_min", 1))
        return len(hits) >= need, f"{len(hits)} part(s){': ' + ', '.join(hits[:6]) if hits else ''} (need {need})"

    def c_layer(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        hits = []
        for lyr in sc.layers:
            if chk.get("role") and lyr.get("role") not in chk["role"]:
                continue
            if chk.get("material") and lyr.get("material") not in chk["material"]:
                continue
            if chk.get("routed") and not routed(lyr):
                continue
            if chk.get("use") and (not routed(lyr) or lyr["route"].get("use") not in chk["use"]):
                continue
            if not sc.in_zone(lyr, chk.get("zone")):
                continue
            hits.append(lyr["id"])
        hits = list(dict.fromkeys(hits))
        need = int(chk.get("count_min", 1))
        return len(hits) >= need, f"{len(hits)} layer(s){': ' + ', '.join(hits[:8]) if hits else ''} (need {need})"

    def _vias(self, sc: Scope, chk: dict) -> list[dict]:
        pool = self.fam.vias if chk.get("where") == "family" else sc.vias
        out = []
        for v in pool:
            if chk.get("kind") and v.get("kind") not in chk["kind"]:
                continue
            if chk.get("fill") and v.get("fill") not in chk["fill"]:
                continue
            if chk.get("plug") and v.get("plug") not in chk["plug"]:
                continue
            if chk.get("core_h_max_um") is not None:
                # core thickness: the scope core (thickest role-core layer / core part), else the via span
                ch = (sc.core[1] - sc.core[0]) if sc.core else float(v["h_um"])
                if ch > float(chk["core_h_max_um"]) + TOL:
                    continue
            if any((via_end(self.fam, v, k) if k in ("upper", "lower") else v.get(k)) in (None, "")
                   for k in chk.get("needs", [])):
                continue
            if chk.get("where") != "family" and not sc.in_zone(v, chk.get("zone")):
                continue
            out.append(v)
        return out

    def c_via(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        hits = list(dict.fromkeys(v.get("template_id", v["id"]) for v in self._vias(sc, chk)))
        need = int(chk.get("count_min", 1))
        extra = f"; needs {','.join(chk['needs'])}" if chk.get("needs") else ""
        return len(hits) >= need, f"{len(hits)} via class(es){': ' + ', '.join(hits[:6]) if hits else ''}{extra}"

    def c_via_per_gap(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        gaps = gap_elements(sc, chk.get("zone"))
        if not gaps:
            return False, "no dielectric between two conductor levels in the zone"
        vias = self._vias(sc, {**chk, "zone": None})
        miss = [g["id"] for g in gaps if not spanned(sc.fam, g, vias)]
        return not miss, f"{len(gaps) - len(miss)}/{len(gaps)} gap dielectrics spanned" + (
            f"; missing {', '.join(miss[:6])}" if miss else "")

    def c_array(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        hits = [a["id"] for a in self.fam.arrays if (not chk.get("kind") or a["kind"] in chk["kind"])
                and sc.array_face(a, chk.get("face", "any"))]
        need = int(chk.get("count_min", 1))
        return len(hits) >= need, f"{len(hits)} array(s){': ' + ', '.join(hits[:6]) if hits else ''} (need {need})"

    def c_array_over(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        hits = []
        for a in self.fam.arrays:
            if chk.get("kind") and a["kind"] not in chk["kind"]:
                continue
            dz = float(a["z_um"]) - sc.top
            if -TOL <= dz <= self.gap_max and sc.overlaps(rect(a["region"])):
                hits.append(a["id"])
        return bool(hits), f"{len(hits)} array(s) over the scope{': ' + ', '.join(hits[:6]) if hits else ''}"

    def c_part_adjacent(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        refs = [p for p in sc.parts if not chk.get("of_kind") or p.get("kind") in chk["of_kind"]]
        if chk.get("of_frame"):  # ring / lid sidewall only (not the lid plate, whose underside is the TIM)
            refs = [p for p in refs if p.get("kind") == "stiffener" or re.search(r"_[nsew]$", p["id"])
                    or re.search(r"foot|wall|side", f"{p.get('template_id', '')} {p.get('name', '')}", re.IGNORECASE)]
        hits = []
        for p in self.fam.parts:
            if chk.get("kind") and p.get("kind") not in chk["kind"]:
                continue
            if chk.get("material") and p.get("material") not in chk["material"]:
                continue
            for r in refs:
                if p["id"] == r["id"]:
                    continue
                touch = (abs(top(p) - float(r["z_um"])) <= TOL if chk.get("relation", "below") == "below"
                         else abs(float(p["z_um"]) - top(r)) <= TOL)
                if touch and overlap(rect(p), rect(r)):
                    hits.append(p["id"])
                    break
        return bool(hits), f"{len(hits)} part(s){': ' + ', '.join(hits[:6]) if hits else ''}"

    def c_each_part_has(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        insts = sorted([p for p in sc.parts if p.get("kind") in chk.get("kind", [])], key=lambda p: float(p["z_um"]))
        if chk.get("skip_top") and insts:
            insts = insts[:-1]
        if not insts:
            return False, "no part instance of the kind"
        has = chk.get("has", {})
        miss = []
        for p in insts:
            tid = p.get("template_id", p["id"])
            a_ok = any(a["kind"] in has.get("array_kind", []) and a.get("mount") == "in"
                       and set(lst(a.get("between"))) & {p["id"], tid}
                       and float(a["z_um"]) >= float(p["z_um"]) - TOL and top(a) <= top(p) + TOL
                       for a in self.fam.arrays)
            v_ok = any(v.get("kind") in has.get("via_kind", []) and p in self.fam.via_insts(v)
                       and float(v["z_um"]) >= float(p["z_um"]) - TOL and top(v) <= top(p) + TOL
                       for v in self.fam.vias)
            if not (a_ok or v_ok):
                miss.append(p["id"])
        return not miss, f"{len(insts) - len(miss)}/{len(insts)} instances" + (
            f"; missing {', '.join(miss[:6])}" if miss else "")

    def net_arrays(self, n: dict, key: str) -> list[dict]:
        return self.fam.arrays_of(str(n.get(key, ""))) if n.get(key) else []

    def c_net(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        hits = []
        lids = {lyr["id"] for lyr in sc.layers}
        for n in self.fam.nets:
            if chk.get("kind") and n.get("kind") not in chk["kind"]:
                continue
            fa, ta = self.net_arrays(n, "from"), self.net_arrays(n, "to")
            if chk.get("from_kind") and not any(a["kind"] in chk["from_kind"] for a in fa):
                continue
            if chk.get("to_kind") and not any(a["kind"] in chk["to_kind"] for a in ta):
                continue
            if chk.get("from_face") and not any(sc.array_face(a, chk["from_face"]) for a in fa):
                continue
            if chk.get("to_face") and not any(sc.array_face(a, chk["to_face"]) for a in ta):
                continue
            if chk.get("through_scope") and not (
                    fa and ta and max(top(a) for a in fa) >= sc.top - TOL
                    and max(top(a) for a in ta) <= sc.bottom + TOL and any(sc.overlaps(rect(a["region"])) for a in fa)):
                continue
            if chk.get("crosses"):
                if not (fa and ta):
                    continue
                hi, lo = max(top(a) for a in fa), min(float(a["z_um"]) for a in ta)
                if not any(a["kind"] in chk["crosses"] and sc.array_face(a, "any")
                           and float(a["z_um"]) >= lo - TOL and top(a) <= hi + TOL for a in self.fam.arrays):
                    continue
            levels = lst(n.get("levels")) + lst(n.get("jog"))
            if chk.get("levels_in_scope") and not set(levels) & lids:
                continue
            if chk.get("jog_min") and len(lst(n.get("jog"))) < int(chk["jog_min"]):
                continue
            if chk.get("plane_in_scope") and n.get("plane") not in lids:
                continue
            hits.append(n["id"])
        return bool(hits), f"{len(hits)} net class(es){': ' + ', '.join(hits[:6]) if hits else ''}"

    def c_opening(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        zone = "face_top" if chk["face"] == "top" else "face_bottom"
        cover = [lyr["id"] for lyr in sc.layers if lyr.get("role") in chk.get("role", ["passivation"])
                 and sc.in_zone(lyr, zone)]
        if not cover:
            return False, f"no cover layer at the {chk['face']} face"
        ends = [a["id"] for n in self.fam.nets for k in ("from", "to") for a in self.net_arrays(n, k)
                if sc.array_face(a, chk["face"])]
        if not ends:
            return False, f"cover {cover[0]}; no net endpoint array at the {chk['face']} face"
        return True, f"cover {cover[0]}; endpoint {ends[0]}"

    def c_symmetric(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        cs = [lyr for lyr in sc.layers if is_conductor(lyr) and routed(lyr)]
        up = [c for c in cs if sc.in_zone(c, "above_core") and not sc.in_zone(c, "core_faces")]
        dn = [c for c in cs if sc.in_zone(c, "below_core") and not sc.in_zone(c, "core_faces")]
        ok = sc.core is not None and len(up) == len(dn) and len(up) > 0
        return ok, f"{len(up)} routed levels above the core, {len(dn)} below"

    def c_dies_on(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        n = sc.dies_over(self.gap_max)
        return n >= int(chk.get("min", 1)), f"{n} die instance(s) on the scope"

    # die entries: evaluated per die template (scope = one template)
    def die_joints(self, p: dict) -> list[dict]:
        tid = p.get("template_id", p["id"])
        out = []
        for a in self.fam.arrays:
            if a["kind"] not in BUMP_KINDS | {"rdl_via"}:
                continue
            btw = set(lst(a.get("between")))
            named = bool(btw & {p["id"], tid}) and a["kind"] in BUMP_KINDS
            if named or (abs(top(a) - float(p["z_um"])) <= TOL and overlap(rect(a["region"]), rect(p))):
                out.append(a)
        return out

    def c_die_joint(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        miss = [p["id"] for p in sc.parts if not self.die_joints(p)]
        return not miss, f"{len(sc.parts) - len(miss)}/{len(sc.parts)} instances" + (
            f"; no joint: {', '.join(miss[:6])}" if miss else "")

    def c_die_encap(self, sc: Scope, chk: dict) -> tuple[bool | None, str]:
        bad = []
        n_last = n_other = 0
        for p in sc.parts:
            js = self.die_joints(p)
            if not js:
                bad.append(p["id"])
                continue
            for a in js:
                if a["kind"] == "hybrid_bond" or (a["kind"] == "rdl_via" and a.get("mount") == "in"):
                    continue
                n_other += 1
                below = any(q["id"] != p["id"] and abs(top(q) - float(a["z_um"])) <= TOL
                            and overlap(rect(q), rect(a["region"])) for q in self.fam.parts)
                if not below:  # joint to a next-level part outside this family (carrier / board)
                    n_last += 1
                    continue
                enc = any(q["id"] != p["id"] and (q.get("kind") in ("underfill", "mold")
                                                   or q.get("material") in ENCAP_MATERIALS)
                          and float(q["z_um"]) <= float(a["z_um"]) + TOL and top(q) >= top(a) - TOL
                          and overlap(rect(q), rect(a["region"])) for q in self.fam.parts)
                if not enc:
                    bad.append(f"{p['id']}:{a['id']}")
        if not bad and n_last and n_last == n_other:
            return None, "joints land on no part of this family (next level outside the model): not applicable"
        return not bad, "all joints encapsulated" if not bad else f"not encapsulated: {', '.join(bad[:6])}"

    def c_die_net(self, sc: Scope, chk: dict) -> tuple[bool, str]:
        ends = {r for n in self.fam.nets for r in (n.get("from"), n.get("to")) if r}
        miss = []
        for p in sc.parts:
            js = self.die_joints(p)
            if not any(a["id"] in ends or a.get("template_id") in ends for a in js):
                miss.append(p["id"])
        return not miss, f"{len(sc.parts) - len(miss)}/{len(sc.parts)} instances are net endpoints"


def gap_elements(sc: Scope, zone: str | None) -> list[dict]:
    """Non-conductor, non-core layers (and unlayered non-core scope parts) between consecutive conductor levels."""
    cs = sorted([lyr for lyr in sc.layers if is_conductor(lyr) and sc.in_zone(lyr, zone)], key=top, reverse=True)
    layered = {sc.fam.layer_host(lyr) for lyr in sc.layers}
    out: list[dict] = []
    for up, lo in itertools.pairwise(cs):
        g0, g1 = top(lo), float(up["z_um"])
        if g1 - g0 <= TOL:
            continue
        for lyr in sc.layers:
            if is_conductor(lyr) or lyr.get("role") == "core" or lyr in out:
                continue
            if float(lyr["z_um"]) >= g0 - TOL and top(lyr) <= g1 + TOL:
                out.append(lyr)
        for p in sc.parts:
            tid = p.get("template_id", p["id"])
            if tid in layered or p.get("material") in CORE_MATERIALS or p in out:
                continue
            if float(p["z_um"]) >= g0 - TOL and top(p) <= g1 + TOL:
                out.append(p)
    return out


def spanned(fam: Fam, el: dict, vias: list[dict]) -> bool:
    host = fam.layer_host(el) if "role" in el else el.get("template_id", el["id"])
    for v in vias:
        vh = fam.ptid(str(v.get("part")))
        if vh != host and str(v.get("part")) != host:
            continue
        if float(v["z_um"]) <= float(el["z_um"]) + TOL and top(v) >= top(el) - TOL:
            return True
    return False


def m2(fam: Fam, entries: list[dict], cfg: dict) -> dict:
    ck = Checker(fam, cfg)
    res: list[dict] = []
    present = expected = 0
    by_group = {"structure": [0, 0], "routing": [0, 0]}
    warnings: list[str] = []
    for ent in entries:
        arch = cfg["archetypes"].get(ent["archetype"])
        if arch is None:
            warnings.append(f"unknown archetype {ent['archetype']}")
            continue
        variants = lst(ent.get("variants"))
        for t in ent["parts"]:
            if t not in fam.ptpl:
                warnings.append(f"{ent['archetype']}: part {t!r} not in the family")
        scopes = ([Scope(fam, ent["archetype"], [t], variants) for t in ent["parts"] if t in fam.ptpl]
                  if arch.get("per_part") else [Scope(fam, ent["archetype"], [t for t in ent["parts"]
                                                                              if t in fam.ptpl], variants)])
        for sc in scopes:
            items = []
            na: list[dict] = []
            for el in arch["elements"]:
                if el.get("only") and not set(el["only"]) & set(variants):
                    continue
                if el.get("not_in") and set(el["not_in"]) & set(variants):
                    continue
                w = el.get("when") or {}
                if "dies_over_min" in w and sc.dies_over(ck.gap_max) < int(w["dies_over_min"]):
                    continue
                if "dies_share_min" in w and sc.dies_share(ck.gap_max) < int(w["dies_share_min"]):
                    continue
                ok, det = ck.run(sc, el["check"])
                g = el.get("group", "structure")
                if ok is None:
                    na.append({"id": el["id"], "name": el["name"], "detail": det})
                    continue
                by_group.setdefault(g, [0, 0])
                by_group[g][1] += 1
                expected += 1
                if ok:
                    present += 1
                    by_group[g][0] += 1
                items.append({"id": el["id"], "name": el["name"], "group": g, "ok": ok, "detail": det})
            res.append({"archetype": ent["archetype"], "parts": sc.tids, "variants": variants,
                        "present": sum(i["ok"] for i in items), "expected": len(items), "items": items,
                        "not_applicable": na})
    # coverage: every major part should be in an entry
    mapped = {t for ent in entries for t in ent["parts"]}
    for t, insts in fam.ptpl.items():
        if insts[0].get("kind") in ("substrate", "interposer", "bridge", "die", "hbm", "lid", "stiffener", "tim") \
                and t not in mapped and t not in lst(cfg.get("unmapped_ok", {}).get(fam.id)):
            warnings.append(f"part {t} ({insts[0].get('kind')}) is in no archetype entry")
    missing = [f"{r['archetype']}[{','.join(r['parts'])}].{i['id']}" for r in res for i in r["items"] if not i["ok"]]
    return {"score": round(present / expected, 3) if expected else None, "present": present, "expected": expected,
            "by_group": {g: {"present": v[0], "expected": v[1]} for g, v in by_group.items()},
            "missing": missing, "entries": res, "warnings": warnings}


# ----------------------------------------------------------------------------- M3


@dataclass
class Elem:
    kind: str  # layer | via | array
    obj: dict
    z0: float
    z1: float

    @property
    def id(self) -> str:
        return str(self.obj["id"])


def probe_point(fam: Fam, fa: dict, ta: dict | None) -> tuple[float, float]:
    """A point inside the from-array region, off any bridge footprint when possible (and inside the to region)."""
    r = rect(fa["region"])
    bridges = [rect(p) for p in fam.parts if p.get("kind") == "bridge"]
    tr = rect(ta["region"]) if ta else None
    pts = []
    for i in range(9):
        for j in range(9):
            pts.append((r[0] + (r[2] - r[0]) * (i + 0.5) / 9, r[1] + (r[3] - r[1]) * (j + 0.5) / 9))
    cx, cy = (r[0] + r[2]) / 2, (r[1] + r[3]) / 2
    pts.sort(key=lambda p: (p[0] - cx) ** 2 + (p[1] - cy) ** 2)
    for p in pts:
        if any(contains(b, p) for b in bridges):
            continue
        if tr and not contains(tr, p):
            continue
        return p
    return (cx, cy)


def cutouts(fam: Fam, p: tuple[float, float]) -> list[tuple[str, float, float]]:
    """(host template id, z0, z1) ranges that embedded parts (`in:` a host) cut out of their host at xy p: the
    viewer removes host layers there, so host layers / vias overlapping that z range do not exist under p."""
    out = []
    for q in fam.parts:
        host = fam.pby.get(str(q.get("in", "")))
        if host is not None and contains(rect(q), p):
            out.append((fam.ptid(host["id"]), float(q["z_um"]), top(q)))
    return out


def cut_out(cuts: list[tuple[str, float, float]], host: str, z0: float, z1: float) -> bool:
    return any(h == host and min(z1, c1) - max(z0, c0) > TOL for h, c0, c1 in cuts)


def via_at(v: dict, p: tuple[float, float]) -> bool | None:
    """True / False when the via class declares `regions` (G1) and p is / is not inside one; None without regions."""
    regs = v.get("regions")
    if not regs:
        return None
    return any(contains(rect(r), p) for r in regs)


def walk(fam: Fam, fa: dict, ta: dict) -> dict:
    """Walk one vertical segment from the bottom of `fa` to the top of `ta` (z descending)."""
    p = probe_point(fam, fa, ta)
    zt, zb = float(fa["z_um"]), top(ta)
    cuts = cutouts(fam, p)
    elems: list[Elem] = []
    for lyr in fam.layers:
        if is_conductor(lyr) and any(contains(rect(h), p) for h in fam.layer_insts(lyr)) \
                and not cut_out(cuts, fam.layer_host(lyr), float(lyr["z_um"]), top(lyr)):
            elems.append(Elem("layer", lyr, float(lyr["z_um"]), top(lyr)))
    for v in fam.vias:
        if via_at(v, p) is False or cut_out(cuts, fam.ptid(str(v.get("part"))), float(v["z_um"]), top(v)):
            continue
        if any(contains(rect(h), p) for h in fam.via_insts(v)):
            elems.append(Elem("via", v, float(v["z_um"]), top(v)))
    for a in fam.arrays:
        if a["id"] in (fa["id"], ta["id"]):
            continue
        if contains(rect(a["region"]), p):
            elems.append(Elem("array", a, float(a["z_um"]), top(a)))
    elems = [e for e in elems if e.z0 < zt - TOL and e.z1 > zb + TOL]
    end = Elem("array", ta, float(ta["z_um"]), top(ta))
    issues: list[str] = []
    openings: list[str] = []
    chain = [fa["id"]]
    used: set[int] = set()
    z, prev = zt, Elem("array", fa, float(fa["z_um"]), top(fa))
    for _ in range(len(elems) + 2):
        cands = [e for i, e in enumerate(elems) if i not in used and e.z0 < z - TOL]
        nxt = end
        if cands:
            # highest top first; on a tie prefer the via whose `upper` is the level just left, then the end array
            best = max(cands, key=lambda e: (round(e.z1, 3), e.kind == "via" and via_at(e.obj, p) is True,
                                             e.kind == "via" and e.obj.get("upper") == prev.id))
            if best.z1 > end.z1 + TOL:
                nxt = best
        if nxt.z1 < z - TOL:  # gap: what is crossed between nxt top and z
            crossed = crossed_between(fam, p, nxt.z1, z, cuts)
            cover_ok: list[str] = []
            for c in crossed:
                at_array_face = ((prev.kind == "array" and abs(top(c) - z) <= TOL)
                                 or (nxt.kind == "array" and abs(float(c["z_um"]) - nxt.z1) <= TOL))
                if at_array_face and c.get("role") in ("passivation", "dielectric") and len(cover_ok) < 2:
                    cover_ok.append(c["id"])
            rest = [c["id"] for c in crossed if c["id"] not in cover_ok]
            openings += cover_ok
            if rest:
                issues.append(f"gap {fmt(z - nxt.z1)} um ({fmt(nxt.z1)}..{fmt(z)}) between {prev.id} and {nxt.id}; "
                              f"crossed without via: {', '.join(rest[:6])}")
            elif not crossed:
                issues.append(f"gap {fmt(z - nxt.z1)} um ({fmt(nxt.z1)}..{fmt(z)}) between {prev.id} and {nxt.id}")
        elif nxt.z1 > z + TOL:
            issues.append(f"overlap {fmt(nxt.z1 - z)} um: {nxt.id} top {fmt(nxt.z1)} above {prev.id} bottom {fmt(z)}")
        chain.append(nxt.id)
        if nxt is end:
            break
        used.add(elems.index(nxt))
        z, prev = nxt.z0, nxt
    else:
        issues.append("walk did not reach the bottom endpoint")
    return {"from": fa["id"], "to": ta["id"], "probe_mm": [round(p[0], 4), round(p[1], 4)], "ok": not issues,
            "issues": issues, "openings": openings, "chain": chain,
            "vias": [c for c in chain if any(v["id"] == c for v in fam.vias)]}


def crossed_between(fam: Fam, p: tuple[float, float], z0: float, z1: float,
                    cuts: list[tuple[str, float, float]]) -> list[dict]:
    out: list[dict] = []
    for lyr in fam.layers:
        if is_conductor(lyr) or not any(contains(rect(h), p) for h in fam.layer_insts(lyr)):
            continue
        if cut_out(cuts, fam.layer_host(lyr), float(lyr["z_um"]), top(lyr)):
            continue
        if min(top(lyr), z1) - max(float(lyr["z_um"]), z0) > TOL:
            out.append(lyr)
    layered = {fam.layer_host(lyr) for lyr in fam.layers}
    for q in fam.parts:
        if q.get("template_id", q["id"]) in layered or not contains(rect(q), p):
            continue
        if q.get("kind") in ("underfill", "mold", "lid", "tim", "stiffener"):
            continue
        if min(top(q), z1) - max(float(q["z_um"]), z0) > TOL:
            out.append(q)
    return out


XY_REL_TOL = 0.01  # pitch ratio tolerance for "divides" (ratio within 1 % of an integer)


def pitch_divides(a: float, b: float) -> bool:
    lo, hi = min(a, b), max(a, b)
    if lo <= 0:
        return False
    r = hi / lo
    return abs(r - round(r)) <= XY_REL_TOL * r


def xy_issues(fam: Fam, w: dict, jogs: set[str]) -> list[str]:
    """Grid through-vias (pth / tsv / tgv / tdv / tmv with pitch_um) on the walked chain vs the nearest endpoint array
    above and below them on the chain (bump / pillar / hybrid-bond / BGA array): unless a jog level of the net lies
    between the two, the via pitch must divide the array pitch or vice versa, else most endpoints cannot sit on a via
    (the viewer phases such grids only when one pitch divides the other)."""
    out = []
    vby = {v["id"]: v for v in fam.vias}
    chain = w["chain"]
    for i, cid in enumerate(chain):
        v = vby.get(cid)
        if v is None or v.get("kind") not in GRID_VIAS or num(v.get("pitch_um")) is None:
            continue
        vp = float(v["pitch_um"])
        for step in (-1, 1):
            j = i + step
            while 0 <= j < len(chain):
                c = chain[j]
                if c in jogs:
                    break
                a = fam.aby.get(c)
                if a is not None and a["kind"] in BUMP_KINDS | {"bga"} and num(a.get("pitch_um")) is not None:
                    ap = float(a["pitch_um"])
                    if not pitch_divides(vp, ap):
                        side = "above" if step < 0 else "below"
                        out.append(f"xy: {v.get('kind')} {v.get('template_id', cid)} pitch {fmt(vp)} um vs "
                                   f"{a['kind']} {fam.atid(c)} pitch {fmt(ap)} um {side} it, no jog level between "
                                   "(neither pitch divides the other)")
                    break
                j += step
    return out


def m3(fam: Fam) -> dict:
    vert = [n for n in fam.nets if n.get("kind") == "vertical"]
    routed_lv = [lyr for lyr in fam.layers if routed(lyr)]
    orphans = orphan_levels(fam, routed_lv)
    other_issues: list[str] = []
    lids = {lyr["id"]: lyr for lyr in fam.layers}
    for n in fam.nets:
        for k in ("from", "to"):
            if n.get(k) and not fam.arrays_of(str(n[k])):
                other_issues.append(f"net {n['id']}: {k} array {n[k]!r} not found")
        for lv in lst(n.get("levels")) + lst(n.get("jog")) + lst(n.get("plane")):
            if lv not in lids:
                other_issues.append(f"net {n['id']}: level {lv!r} not found")
            elif not routed(lids[lv]):
                other_issues.append(f"net {n['id']}: level {lv} has no route")
    if not vert:
        return {"score": None, "segments": [], "chains": [], "orphans": orphans, "net_issues": other_issues,
                "xy_issues": [],
                "top_to_board": False, "top_to_board_clean": False,
                "note": "no vertical nets" if fam.vias or fam.nets or routed_lv else "no routing"}
    segs = []
    for n in vert:
        fas, tas = fam.arrays_of(str(n.get("from"))), fam.arrays_of(str(n.get("to")))
        walks = []
        jogs = set(lst(n.get("jog")))
        for fa in fas:
            cands = [t for t in tas if contains(rect(t["region"]), probe_point(fam, fa, None))] or tas
            if cands:
                w = walk(fam, fa, cands[0])
                w["xy"] = xy_issues(fam, w, jogs)
                w["ok"] = w["ok"] and not w["xy"]
                walks.append(w)
        ok = bool(walks) and all(w["ok"] for w in walks)
        segs.append({"net": n["id"], "from": n.get("from"), "to": n.get("to"), "ok": ok, "walks": walks})
    # chains: segments sharing an endpoint array (to of one = from of the next), by array template id
    nxt: dict[str, list[dict]] = {}
    for s in segs:
        nxt.setdefault(fam.atid(str(s["from"])), []).append(s)
    tos = {fam.atid(str(s["to"])) for s in segs}
    heads = [s for s in segs if fam.atid(str(s["from"])) not in tos] or segs[:1]
    chains = []

    def extend(path: list[dict]) -> None:
        if len(path) > len(segs):
            return
        more = [s for s in nxt.get(fam.atid(str(path[-1]["to"])), []) if s not in path]
        if not more:
            chains.append(path)
            return
        for s in more:
            extend(path + [s])

    for h in heads:
        extend([h])
    board = board_arrays(fam)
    die_j = die_joint_tids(fam)
    chains_out = []
    for c in chains:
        first, last = fam.atid(str(c[0]["from"])), fam.atid(str(c[-1]["to"]))
        t2b = first in die_j and last in board
        chains_out.append({"nets": [s["net"] for s in c], "from": c[0]["from"], "to": c[-1]["to"],
                           "ok": all(s["ok"] for s in c), "top_to_board": t2b})
    n_ok = sum(s["ok"] for s in segs)
    xy = list(dict.fromkeys(f"net {s['net']}: {i}" for s in segs for w in s["walks"] for i in w["xy"]))
    n_z = sum(1 for s in segs if any(w["issues"] for w in s["walks"]))
    return {"score": round(n_ok / len(segs), 3), "segments_ok": n_ok, "segments_total": len(segs),
            "segments_z_fail": n_z, "xy_issues": xy, "segments": segs,
            "chains": chains_out, "orphans": orphans, "net_issues": other_issues,
            "top_to_board": any(c["top_to_board"] for c in chains_out),
            "top_to_board_clean": any(c["top_to_board"] and c["ok"] for c in chains_out),
            "board_arrays": sorted(board)}


def joint_touches(fam: Fam, lyr: dict) -> bool:
    """A joint array (bump / pillar / hybrid bond) whose top or bottom face meets the level's bottom or top face."""
    hosts = [rect(h) for h in fam.layer_insts(lyr)]
    for a in fam.arrays:
        if a["kind"] not in BUMP_KINDS:
            continue
        faces = (float(a["z_um"]), top(a))
        if any(abs(f - z) <= TOL for f in faces for z in (float(lyr["z_um"]), top(lyr))) \
                and any(overlap(rect(a["region"]), h) for h in hosts):
            return True
    return False


def orphan_levels(fam: Fam, routed_lv: list[dict]) -> list[str]:
    """Routed levels that no via class end (resolved, see via_end) touches, no joint array meets, and that are not in
    z contact (same host) with a touched routed level."""
    touched = {e for v in fam.vias for k in ("upper", "lower") if (e := via_end(fam, v, k))}
    ok = {lyr["id"] for lyr in routed_lv if lyr["id"] in touched or joint_touches(fam, lyr)}
    changed = True
    while changed:
        changed = False
        for lyr in routed_lv:
            if lyr["id"] in ok:
                continue
            if any(o["id"] in ok and fam.layer_host(o) == fam.layer_host(lyr)
                   and (abs(top(o) - float(lyr["z_um"])) <= TOL or abs(top(lyr) - float(o["z_um"])) <= TOL)
                   for o in routed_lv):
                ok.add(lyr["id"])
                changed = True
    return [lyr["id"] for lyr in routed_lv if lyr["id"] not in ok]


def board_arrays(fam: Fam) -> set[str]:
    """Board-level endpoint: BGA arrays, else the lowest array(s) of the family."""
    bga = {a.get("template_id", a["id"]) for a in fam.arrays if a["kind"] == "bga"}
    if bga or not fam.arrays:
        return bga
    zmin = min(float(a["z_um"]) for a in fam.arrays)
    return {a.get("template_id", a["id"]) for a in fam.arrays if float(a["z_um"]) <= zmin + TOL}


def die_joint_tids(fam: Fam) -> set[str]:
    out = set()
    for a in fam.arrays:
        btw = lst(a.get("between"))
        upper: dict | None = None
        if btw:
            upper = fam.pby.get(btw[0]) or next(iter(fam.ptpl.get(btw[0], [])), None)
        if upper is not None and upper.get("kind") in ("die", "hbm") and a["kind"] in BUMP_KINDS:
            out.add(a.get("template_id", a["id"]))
    for p in fam.parts:  # chip-first: die pads land on rdl vias / arrays touching the die bottom
        if p.get("kind") not in ("die", "hbm"):
            continue
        for a in fam.arrays:
            if abs(top(a) - float(p["z_um"])) <= TOL and overlap(rect(a["region"]), rect(p)):
                out.add(a.get("template_id", a["id"]))
    return out


# ----------------------------------------------------------------------------- M4


def scope_groups(fam: Fam, entries: list[dict]) -> list[tuple[str, list[str]]]:
    groups: list[tuple[str, list[str]]] = []
    seen: set[str] = set()
    for ent in entries:
        tids = [t for t in ent["parts"] if t in fam.ptpl]
        if not tids:
            continue
        if ent["archetype"] == "die":
            for t in tids:
                if t not in seen:
                    groups.append(("die", [t]))
            seen |= set(tids)
            continue
        groups.append((ent["archetype"], tids))
        seen |= set(tids)
    for lyr in fam.layers:
        h = fam.layer_host(lyr)
        if h not in seen:
            groups.append((KIND_ARCHETYPE.get(host_kind(fam, h), "die"), [h]))
            seen.add(h)
    return groups


def m4(fam: Fam, entries: list[dict]) -> dict:
    cond = list({lyr["id"]: lyr for lyr in fam.layers if is_conductor(lyr)}.values())
    rt = [lyr for lyr in cond if routed(lyr)]
    gaps_total = gaps_cov = 0
    uncovered: list[str] = []
    for arch, tids in scope_groups(fam, entries):
        sc = Scope(fam, arch, tids, [])
        rl = sorted([lyr for lyr in sc.layers if routed(lyr)], key=top, reverse=True)
        layered = {fam.layer_host(lyr) for lyr in sc.layers}
        for up, lo in itertools.pairwise(rl):
            g0, g1 = top(lo), float(up["z_um"])
            if g1 - g0 <= TOL:
                continue
            between = [x for x in sc.layers if not is_conductor(x) and float(x["z_um"]) >= g0 - TOL
                       and top(x) <= g1 + TOL]
            between += [p for p in sc.parts if p.get("template_id", p["id"]) not in layered
                        and float(p["z_um"]) >= g0 - TOL and top(p) <= g1 + TOL]
            # one gap = the z range between two routed levels; covered when a chain of via classes spans it, or a
            # joint array (bump / pillar / hybrid bond, incl. a bond-pad field) spans the elements it fills
            gaps_total += 1
            joints = [a for a in fam.arrays if a["kind"] in BUMP_KINDS and sc.overlaps(rect(a["region"]))]

            def by_joint(el: dict, js: list[dict] = joints) -> bool:
                return any(float(a["z_um"]) <= float(el["z_um"]) + TOL and top(a) >= top(el) - TOL for a in js)

            joint_gap = not between and any(float(a["z_um"]) <= g0 + TOL and top(a) >= g1 - TOL for a in joints)
            if joint_gap or (between and all(spanned(fam, b, sc.vias) or by_joint(b) for b in between)):
                gaps_cov += 1
            else:
                uncovered.append(f"{lo['id']}..{up['id']}")
    return {"levels_routed": len(rt), "levels_total": len(cond),
            "routed_share": round(len(rt) / len(cond), 3) if cond else None,
            "gaps_with_via": gaps_cov, "gaps_total": gaps_total,
            "via_share": round(gaps_cov / gaps_total, 3) if gaps_total else None, "uncovered": uncovered}


# ----------------------------------------------------------------------------- M5


def archetype_of(fam: Fam, entries: list[dict], host: str) -> str:
    for ent in entries:
        if host in ent["parts"]:
            return str(ent["archetype"])
    return KIND_ARCHETYPE.get(host_kind(fam, host), "die")


def check_range(rg: Range, v: float) -> str:
    """in_range / out_of_range against the DB min-max. A single-valued range (min = max) is `single_row_range`
    (not counted) unless the value is more than 50 % away from it."""
    if rg.n == 0 or rg.lo is None or rg.hi is None:
        return "no_db_range"
    if rg.lo - 1e-9 <= v <= rg.hi + 1e-9:
        return "in_range"
    if abs(rg.hi - rg.lo) <= 1e-9 and abs(v - rg.lo) <= 0.5 * abs(rg.lo):
        return "single_row_range"
    return "out_of_range"


Getter = Callable[["DB"], Range]


def sl_getter(structs: list[str], roles: list[str] | None, fields: list[str],
              mclass: list[str] | None = None) -> Getter:
    def get(d: DB) -> Range:
        return d.sl_range(structs, roles, fields, mclass=mclass)
    return get


def m5(fam: Fam, entries: list[dict], db: DB, db_all: DB | None = None) -> dict:
    """Ranges from `db` (physical rows by default); `db_all` (every row) gives the secondary min-max per item."""
    rows: list[dict] = []
    if not fam.vias and not any(routed(lyr) for lyr in fam.layers):
        return {"evaluated": 0, "out_of_range": None, "atypical": None, "no_db_range": None, "items": [],
                "note": "no routing"}
    via_layers = set()
    for v in fam.vias:
        for lyr in fam.layers:
            if fam.layer_host(lyr) == fam.ptid(str(v.get("part"))) and not is_conductor(lyr) \
                    and float(v["z_um"]) <= float(lyr["z_um"]) + TOL and top(v) >= top(lyr) - TOL:
                via_layers.add(lyr["id"])
    def add(elem: str, dim: str, val: float, cls: str, get: Getter) -> None:
        rg = get(db)
        st = check_range(rg, val)
        it = {"elem": elem, "dim": dim, "value": val, "class": cls, "status": st,
              "atypical": st in ("in_range", "single_row_range") and atypical(rg, val), "db": rg.json()}
        if db_all is not None:
            ra = get(db_all)
            it["db_all"] = {"min": ra.lo, "max": ra.hi, "n": ra.n}
        rows.append(it)

    done: set[tuple[str, str]] = set()
    for lyr in fam.layers:
        tid = str(lyr.get("template_id", lyr["id"]))
        host = fam.layer_host(lyr)
        arch = archetype_of(fam, entries, host)
        sc = Scope(fam, arch, [t for ent in entries if host in ent["parts"] for t in ent["parts"]] or [host], [])
        zone = "core" if (sc.core and sc.in_zone(lyr, "core_faces") and lyr.get("role") == "core") else (
            "cover" if lyr.get("role") == "passivation" else "levels")
        structs = LAYER_CLASS.get(arch, LAYER_CLASS["die"])[zone]
        mcl = MATERIAL_CLASS.get(str(lyr.get("material")))
        checks: list[tuple[str, float, Getter, str]] = []
        thick = ["thickness_um", "thickness_min_um", "thickness_max_um"]
        if routed(lyr):
            r = lyr["route"]
            for k in ("line_um", "space_um"):
                if num(r.get(k)) is not None:
                    checks.append((f"route.{k}", float(r[k]), sl_getter(structs, ["conductor"], [k]),
                                   f"stack_layers.{k} (conductor rows)"))
            for ri, rg in enumerate(r.get("regions") or []):  # per-region L/S stated by the region (L18)
                for k in ("line_um", "space_um"):
                    if k in (rg.get("dims") or {}) and num(rg.get(k)) is not None:
                        checks.append((f"route.regions[{ri}].{k}", float(rg[k]),
                                       sl_getter(structs, ["conductor"], [k]), f"stack_layers.{k} (conductor rows)"))
            checks.append(("h_um (Cu)", float(lyr["h_um"]),
                           sl_getter(structs, ["conductor"], thick, mcl),
                           "stack_layers.thickness_um"))
        elif lyr["id"] in via_layers:
            role = str(lyr.get("role")) if lyr.get("role") in ("passivation", "core") else "dielectric"
            # a Si body is recorded as role core or device (bridge / die rows); both bound a Si core layer
            roles = ["core", "device"] if role == "core" and lyr.get("material") == "silicon" else [role]
            checks.append((f"h_um ({role})", float(lyr["h_um"]),
                           sl_getter(structs, roles, thick, mcl),
                           "stack_layers.thickness_um"))
        for name, val, get, col in checks:
            if (tid, name) in done:
                continue
            done.add((tid, name))
            add(f"layer {tid}", name, val, f"{col} [{','.join(structs)}]", get)
    seen: set[str] = set()
    for v in fam.vias:
        tid = str(v.get("template_id", v["id"]))
        if tid in seen:
            continue
        seen.add(tid)
        kind = str(v.get("kind"))
        vc = VIA_CLASS.get(kind, {"ic_type": [], "sl": []})
        for k in ("diameter_um", "bottom_diameter_um", "land_um", "pitch_um", "liner_um", "wall_um"):
            vval = num(v.get(k))
            if vval is None:
                continue
            elem = f"via {tid} ({kind})"
            if k in VIA_NO_DB.get(kind, set()):
                add(elem, k, vval, "no DB class for this via kind", lambda _d: Range())
                continue
            src = []
            if k in VIA_IC_FIELDS and vc["ic_type"]:
                src.append(f"interconnects.{'|'.join(VIA_IC_FIELDS[k])} [{','.join(vc['ic_type'])}]")
            if k in VIA_SL_FIELDS and vc["sl"]:
                src.append(f"stack_layers.{VIA_SL_FIELDS[k][0]} [{','.join(vc['sl'])}]")
            if k == "liner_um":
                src.append("stack_layers.thickness_um [feature/layer_name ~ liner]")

            def get(d: DB, k: str = k, vc: dict = vc) -> Range:
                if k == "liner_um":
                    return d.sl_range([], None, ["thickness_um"], feature_re=r"liner")
                rg = Range()
                if k in VIA_IC_FIELDS and vc["ic_type"]:
                    rg = merge(rg, d.ic_range(vc["ic_type"], vc.get("level"), VIA_IC_FIELDS[k]))
                if k in VIA_SL_FIELDS and vc["sl"]:
                    rg = merge(rg, d.sl_range(vc["sl"], None, VIA_SL_FIELDS[k]))
                return rg

            add(elem, k, vval, "; ".join(src) or "no DB class", get)
    return {"evaluated": len(rows), "out_of_range": sum(r["status"] == "out_of_range" for r in rows),
            "atypical": sum(bool(r["atypical"]) for r in rows),
            "no_db_range": sum(r["status"] == "no_db_range" for r in rows),
            "single_row_range": sum(r["status"] == "single_row_range" for r in rows), "items": rows}


def atypical(rg: Range, v: float) -> bool:
    """Outside the DB P10-P90 band (needs >= 10 values). M5b counts it for values inside the min-max (or off a
    single-valued range); M6 lists it for microvia AR (not counted there)."""
    lo, hi = rg.pct(10), rg.pct(90)
    return rg.n >= 10 and lo is not None and hi is not None and not (lo - 1e-9 <= v <= hi + 1e-9)


def merge(a: Range, b: Range) -> Range:
    out = Range()
    for rg in (a, b):
        out.n += rg.n
        out.vals += rg.vals
        for v, row in ((rg.lo, rg.lo_row), (rg.hi, rg.hi_row)):
            if v is None:
                continue
            if out.lo is None or v < out.lo:
                out.lo, out.lo_row = v, row
            if out.hi is None or v > out.hi:
                out.hi, out.hi_row = v, row
    return out


# ----------------------------------------------------------------------------- M6


def array_tier(fam: Fam, a: dict) -> str | None:
    k = a["kind"]
    if k == "bga":
        return "bga"
    btw = lst(a.get("between"))
    lower = fam.pby.get(btw[1]) if len(btw) > 1 and btw[1] in fam.pby else (
        fam.ptpl[btw[1]][0] if len(btw) > 1 and btw[1] in fam.ptpl else None)
    if k == "c4":
        return "c4"
    if k == "cu_pillar":
        if a.get("mount") == "in":
            return None  # TIV / tall pillar through a mold core
        return "c4" if lower is not None and lower.get("kind") == "substrate" else "die"
    if k in ("microbump", "hybrid_bond"):
        return "die"
    return None


# M6 microvia AR: host archetype -> TV package classes whose rows bound the range (others: all rows)
AR_PCLASS = {"organic_substrate": ["organic_substrate"], "glass_core_substrate": ["glass_core_substrate"]}


def m6(fam: Fam, db: DB, seg: list[dict], entries: list[dict]) -> dict:
    viol: list[str] = []
    rules: dict[str, int] = {}
    # pitch hierarchy (arrays; evaluated with or without routing)
    tiers: dict[str, list[tuple[float, str]]] = {"die": [], "c4": [], "bga": []}
    for a in fam.arrays:
        t = array_tier(fam, a)
        if t:
            tiers[t].append((float(a["pitch_um"]), a["id"]))
    order = [t for t in ("die", "c4", "bga") if tiers[t]]
    if len(order) >= 2:
        rules["pitch_hierarchy"] = 0
        for lo_t, hi_t in itertools.pairwise(order):
            hi_lo = max(tiers[lo_t])
            lo_hi = min(tiers[hi_t])
            if hi_lo[0] > lo_hi[0] + 1e-9:
                viol.append(f"pitch hierarchy: {lo_t} {hi_lo[1]} {fmt(hi_lo[0])} um > {hi_t} {lo_hi[1]} "
                            f"{fmt(lo_hi[0])} um")
                rules["pitch_hierarchy"] += 1
    mv_types = ["microvia", "stacked_via", "via_in_via"]
    ar_used: dict[str, dict] = {}
    lids = {lyr["id"]: lyr for lyr in fam.layers}
    seen: set[str] = set()
    atyp: list[str] = []  # secondary flags, not counted as violations
    for v in fam.vias:
        tid = str(v.get("template_id", v["id"]))
        d, land, pitch = num(v.get("diameter_um")), num(v.get("land_um")), num(v.get("pitch_um"))
        first = tid not in seen
        seen.add(tid)
        if first and d is not None and land is not None:
            rules["land_gt_via"] = rules.get("land_gt_via", 0)
            if not land > d:
                viol.append(f"land <= via: {tid} land {fmt(land)} <= diameter {fmt(d)}")
                rules["land_gt_via"] += 1
        if first and v.get("kind") in GRID_VIAS and pitch is not None and land is not None:
            rules["through_pitch_ge_land"] = rules.get("through_pitch_ge_land", 0)
            if pitch < land:
                viol.append(f"through-via pitch < land: {tid} pitch {fmt(pitch)} < land {fmt(land)}")
                rules["through_pitch_ge_land"] += 1
        if v.get("kind") == "microvia" and d:
            # laser-entry (larger) diameter: back-side vias are stored narrow top / wide bottom (contract)
            d_entry = max(d, num(v.get("bottom_diameter_um")) or d)
            ar = float(v["h_um"]) / d_entry
            arch = archetype_of(fam, entries, fam.ptid(str(v.get("part"))))
            ar_rg = db.ar_range(mv_types, AR_PCLASS.get(arch), VIA_CLASS["microvia"]["sl"])
            ar_used[arch] = {**ar_rg.json(), "package_classes": AR_PCLASS.get(arch, "all")}
            if first:
                rules["microvia_ar"] = rules.get("microvia_ar", 0)
                if ar_rg.n and ar_rg.lo is not None and ar_rg.hi is not None and not (
                        ar_rg.lo - 1e-9 <= ar <= ar_rg.hi + 1e-9):
                    viol.append(f"microvia AR {tid}: {fmt(ar)} outside DB [{fmt(ar_rg.lo)}, {fmt(ar_rg.hi)}] "
                                f"(n={ar_rg.n}; {ar_rg.lo_row}; {ar_rg.hi_row})")
                    rules["microvia_ar"] += 1
                elif atypical(ar_rg, ar):
                    atyp.append(f"microvia AR {tid}: depth {fmt(float(v['h_um']))} / entry diameter {fmt(d_entry)} = "
                                f"{fmt(ar)} outside DB P10-P90 [{fmt(ar_rg.pct(10))}, {fmt(ar_rg.pct(90))}] (n={ar_rg.n})")
        # build-up / RDL levels: dielectric between levels expected thicker than the Cu (R1 checklist)
        if first and v.get("kind") in ("microvia", "rdl_via") and v.get("through") in lids:
            diel = lids[str(v["through"])]
            for k in ("upper", "lower"):
                cu = lids.get(str(v.get(k)))
                if cu is not None and float(cu["h_um"]) > float(diel["h_um"]) + 1e-9:
                    atyp.append(f"Cu thicker than dielectric: {cu['id']} {fmt(float(cu['h_um']))} um vs "
                                f"{diel['id']} {fmt(float(diel['h_um']))} um (via class {tid})")
                    break
    # land spacing and escape routing (A1 S4 / S6, F2 2026-10-20)
    vby = {v["id"]: v for v in fam.vias}
    ends = via_end_pitches(fam, seg)
    spacing: list[dict] = []
    sp_seen: set[tuple[str, str]] = set()
    no_land: list[str] = []
    nl_seen: set[str] = set()

    def landed(v: dict) -> list[dict]:
        """Levels the via lands on, minus levels an embedded part cuts out at the via's region (cavity / bridge)."""
        out = [lids[str(v[k])] for k in ("upper", "lower") if v.get(k) and str(v[k]) in lids]
        regs = v.get("regions")
        if not regs:
            return out
        rr = [rect(r) for r in regs]
        cuts = cutouts(fam, ((rr[0][0] + rr[0][2]) / 2, (rr[0][1] + rr[0][3]) / 2))
        return [lv for lv in out if not cut_out(cuts, fam.layer_host(lv), float(lv["z_um"]), top(lv))]

    def lv_route(v: dict, lv: dict) -> dict | None:
        regs = v.get("regions")
        return route_at(lv, [rect(r) for r in regs] if regs else None)

    def eff_pitch(v: dict) -> tuple[float | None, str]:
        p = num(v.get("pitch_um"))
        if p is not None:
            return p, "grid pitch"
        es = ends.get(v["id"], [])
        if not es:
            return None, ""
        pe, src = min(es)
        return pe, f"endpoint {src} pitch"

    for v in fam.vias:
        tid = str(v.get("template_id", v["id"]))
        land = num(v.get("land_um"))
        pe, psrc = eff_pitch(v)
        if land is None:
            if tid not in nl_seen:
                nl_seen.add(tid)
                no_land.append(f"{tid} ({v.get('kind')})")
            continue
        if pe is None:
            continue
        lvls: list[dict | None] = [*landed(v)] or [None]
        for lv in lvls:
            lt = str(lv.get("template_id", lv["id"])) if lv else "-"
            if (tid, lt) in sp_seen:
                continue
            sp_seen.add((tid, lt))
            lr = lv_route(v, lv) if lv is not None else None
            sp = num(lr.get("space_um")) if lr is not None else None
            req, rsrc = (sp, f"space of {lt}") if sp is not None else (MIN_SPACE_UM, "1 um floor (level has no space)")
            gap = pe - land
            ok = gap >= req - 1e-9
            spacing.append({"via": tid, "kind": v.get("kind"), "level": lt, "pitch": pe, "pitch_src": psrc,
                            "land": land, "gap": round(gap, 4), "required": req, "required_src": rsrc, "ok": ok})
            rules["land_space"] = rules.get("land_space", 0)
            if not ok:
                viol.append(f"land space: via class {tid} on {lt}: {psrc} {fmt(pe)} - land {fmt(land)} = {fmt(gap)} "
                            f"< {rsrc} {fmt(req)}")
                rules["land_space"] += 1

    def esc_pair(v: dict, lv: dict, pitch: float) -> tuple[float, str] | None:
        lr = lv_route(v, lv)
        if lr is None or lr.get("use") not in ("signal", "mixed"):
            return None
        ln, sp, land = num(lr.get("line_um")), num(lr.get("space_um")), num(v.get("land_um"))
        if ln is None or sp is None or land is None:
            return None
        need = ln + 2 * sp
        return pitch - land - need, (f"{v.get('template_id', v['id'])} on {lv.get('template_id', lv['id'])}: "
                                     f"{fmt(pitch)} - land {fmt(land)} = {fmt(pitch - land)} vs line {fmt(ln)} + "
                                     f"2 x space {fmt(sp)} = {fmt(need)}")

    escape: list[dict] = []
    # grid vias (own pitch): one trace between two lands on at least one routed signal level the class lands on
    g_seen: set[str] = set()
    for v in fam.vias:
        tid = str(v.get("template_id", v["id"]))
        pitch = num(v.get("pitch_um"))
        if pitch is None or tid in g_seen or v.get("kind") in NO_ESCAPE_KINDS:
            continue
        g_seen.add(tid)
        pairs = [x for lv in landed(v) if (x := esc_pair(v, lv, pitch)) is not None]
        if pairs:
            escape.append({"scope": f"grid via {tid}", "pairs": pairs})
    # endpoint stretches (endpoint array -> first / last jog level of the net): at least one routed signal level in
    # the stretch fits one trace between two lands at the endpoint pitch (A1 S4: real escape routing needs one
    # escape level, not every level). Hybrid-bond endpoints and BEOL / bridge vias: land_space only.
    st_seen: set[tuple[str, str, str]] = set()
    for st in seg:
        key = (st["net"], st["end"], st["array"])
        if key in st_seen or st["kind"] == "hybrid_bond":
            continue
        st_seen.add(key)
        pairs = []
        for vid in st["vias"]:
            v = vby[vid]
            if v.get("kind") in NO_ESCAPE_KINDS or num(v.get("pitch_um")) is not None:
                continue
            pairs += [x for lv in landed(v) if (x := esc_pair(v, lv, st["pitch"])) is not None]
        if pairs:
            escape.append({"scope": f"net {st['net']} {st['end']} stretch at {st['array']} pitch {fmt(st['pitch'])}",
                           "pairs": pairs})
    for e in escape:
        rules["escape_ls"] = rules.get("escape_ls", 0)
        best = max(e["pairs"], key=lambda x: x[0])
        e["ok"] = best[0] >= -1e-9
        if not e["ok"]:
            viol.append(f"escape L/S: {e['scope']}: no level fits one trace between lands; best {best[1]}")
            rules["escape_ls"] += 1
    return {"violations": len(viol), "rules_evaluated": sorted(rules), "rule_violations": rules, "items": viol,
            "atypical": atyp, "spacing": spacing, "escape": [{**e, "pairs": [p[1] for p in e["pairs"]]} for e in escape],
            "no_land": no_land,
            "microvia_ar_db": ar_used, "pitch_tiers": {t: sorted(x) for t, x in tiers.items()}}


MIN_SPACE_UM = 1.0  # land-to-land floor where the landed level states no space (BEOL / bond fields; F2)
NO_ESCAPE_KINDS = {"beol_via", "bridge_via"}  # full-array pad fields: land_space only, no trace-between-lands rule


def seg_stretches(fam: Fam, m3r: dict) -> list[dict]:
    """Endpoint stretches of the walked vertical segments: the vias between the top endpoint and the net's first jog
    level (end top) and between the last jog level and the bottom endpoint (end bottom), with that endpoint's pitch.
    A jog moves the net off the endpoint grid, so vias between jogs have no endpoint pitch."""
    out: list[dict] = []
    nets = {n["id"]: n for n in fam.nets}
    for s in m3r.get("segments", []):
        jogs = set(lst(nets.get(s["net"], {}).get("jog")))
        for w in s["walks"]:
            fa, ta = fam.aby.get(w["from"]), fam.aby.get(w["to"])
            if not fa or not ta:
                continue
            chain = w["chain"]
            jog_idx = [i for i, c in enumerate(chain) if c in jogs]
            first, last = (min(jog_idx), max(jog_idx)) if jog_idx else (len(chain), -1)
            top_v = [c for i, c in enumerate(chain) if c in w["vias"] and i < first]
            bot_v = [c for i, c in enumerate(chain) if c in w["vias"] and i > last]
            for end, a, vs in (("top", fa, top_v), ("bottom", ta, bot_v)):
                if vs and num(a.get("pitch_um")) is not None:
                    out.append({"net": s["net"], "end": end, "array": fam.atid(a["id"]), "kind": a["kind"],
                                "pitch": float(a["pitch_um"]), "vias": vs})
    return out


def via_end_pitches(fam: Fam, seg: list[dict]) -> dict[str, list[tuple[float, str]]]:
    """Via entry id -> (endpoint pitch, endpoint array) of every stretch it sits in (effective pitch = the minimum)."""
    out: dict[str, list[tuple[float, str]]] = {}
    for st in seg:
        for vid in st["vias"]:
            out.setdefault(vid, []).append((st["pitch"], st["array"]))
    return out


# ----------------------------------------------------------------------------- output


def row_cells(r: dict) -> list[str]:
    s = r["M1"]["share"]
    m1s = f"{s['reported']:.2f}/{s['derived']:.2f}/{s['template']:.2f}"
    m2r = r["M2"]
    m2s = f"{m2r['score']:.2f} ({m2r['present']}/{m2r['expected']})" if m2r["score"] is not None else "N/A"
    m3r = r["M3"]
    if m3r["score"] is None:
        m3s = "N/A" + (f", {len(m3r['orphans'])} orphan" if m3r["orphans"] else "")
    else:
        m3s = (f"{m3r['score']:.2f} ({m3r['segments_ok']}/{m3r['segments_total']}), "
               f"{len(m3r['xy_issues'])} xy, {len(m3r['orphans'])} orphan, "
               f"t2b {'yes' if m3r['top_to_board'] else 'no'}"
               f"{' clean' if m3r['top_to_board_clean'] else ''}")
    m4r = r["M4"]
    a = f"{m4r['levels_routed']}/{m4r['levels_total']}" if m4r["levels_total"] else "N/A"
    b = f"{m4r['gaps_with_via']}/{m4r['gaps_total']}" if m4r["gaps_total"] else "N/A"
    m5r = r["M5"]
    m5s = "N/A" if m5r["out_of_range"] is None else (
        f"{m5r['out_of_range']} (of {m5r['evaluated']}"
        + (f"; {m5r['single_row_range']} single-row" if m5r.get("single_row_range") else "") + ")")
    m5b = "N/A" if m5r["atypical"] is None else f"{m5r['atypical']}"
    m6r = r["M6"]
    m6s = (f"{m6r['violations']} ({len(m6r['rules_evaluated'])} rules; {len(m6r['atypical'])} atyp"
           + (f"; {len(m6r['no_land'])} no-land" if m6r.get("no_land") else "") + ")"
           if m6r["rules_evaluated"] else "N/A")
    return [r["id"], m1s, m2s, m3s, f"lv {a}; gaps {b}", m5s, m5b, m6s]


HEAD = ["family", "M1 r/d/t", "M2", "M3", "M4", "M5 out-of-range", "M5b atypical", "M6 violations"]


def table(rows: list[dict]) -> str:
    lines = ["| " + " | ".join(HEAD) + " |", "|" + "---|" * len(HEAD)]
    lines += ["| " + " | ".join(row_cells(r)) + " |" for r in rows]
    return "\n".join(lines)


def details_md(r: dict) -> str:
    out = [f"### {r['id']} ({r['name']})", ""]
    m1r = r["M1"]
    out.append(f"- M1 counts {m1r['counts']} (routing dims {m1r['routing_dims']}); generator dim_counts "
               f"{m1r['generator_counts']} -> {m1r['generator_match']}")
    m2r = r["M2"]
    bg = ", ".join(f"{g} {v['present']}/{v['expected']}" for g, v in m2r["by_group"].items() if v["expected"])
    out.append(f"- M2 {m2r['present']}/{m2r['expected']} ({bg})")
    for e in m2r["entries"]:
        miss = [i["id"] for i in e["items"] if not i["ok"]]
        var = f" [{','.join(e['variants'])}]" if e["variants"] else ""
        out.append(f"  - {e['archetype']}({','.join(e['parts'])}){var}: {e['present']}/{e['expected']}"
                   + (f"; missing: {', '.join(miss)}" if miss else "")
                   + (f"; n/a: {', '.join(i['id'] for i in e.get('not_applicable', []))}"
                      if e.get("not_applicable") else ""))
    for w in m2r["warnings"]:
        out.append(f"  - WARN {w}")
    m3r = r["M3"]
    if m3r["score"] is None:
        out.append(f"- M3 N/A ({m3r.get('note', '')})" + (f"; orphans: {', '.join(m3r['orphans'])}"
                                                          if m3r["orphans"] else ""))
    else:
        out.append(f"- M3 {m3r['segments_ok']}/{m3r['segments_total']} segments clean; top-to-board chain "
                   f"{'yes' if m3r['top_to_board'] else 'no'} (clean: {'yes' if m3r['top_to_board_clean'] else 'no'};"
                   f" board arrays {', '.join(m3r['board_arrays']) or 'none'})")
        for s in m3r["segments"]:
            iss = [i for w in s["walks"] for i in w["issues"] + w.get("xy", [])]
            out.append(f"  - net {s['net']} {s['from']} -> {s['to']}: {'ok' if s['ok'] else 'FAIL'}"
                       + (f"; {'; '.join(dict.fromkeys(iss))}" if iss else ""))
        for c in m3r["chains"]:
            out.append(f"  - chain {' > '.join(c['nets'])}: {c['from']} -> {c['to']} "
                       f"{'ok' if c['ok'] else 'FAIL'}{', top-to-board' if c['top_to_board'] else ''}")
        if m3r["orphans"]:
            out.append(f"  - orphan routed levels: {', '.join(m3r['orphans'])}")
    for i in m3r["net_issues"]:
        out.append(f"  - net issue: {i}")
    m4r = r["M4"]
    out.append(f"- M4 routed levels {m4r['levels_routed']}/{m4r['levels_total']}; gaps with via "
               f"{m4r['gaps_with_via']}/{m4r['gaps_total']}"
               + (f"; uncovered {', '.join(m4r['uncovered'][:8])}" if m4r["uncovered"] else ""))
    m5r = r["M5"]
    if m5r["out_of_range"] is None:
        out.append("- M5 N/A (no routing)")
    else:
        out.append(f"- M5 {m5r['out_of_range']} out of range (M5a), {m5r['atypical']} atypical (M5b: inside the "
                   f"min-max but outside P10-P90, n >= 10), {m5r['no_db_range']} without a DB range, "
                   f"{m5r.get('single_row_range', 0)} off a single-valued DB range (within 50 %, not counted), "
                   f"{m5r['evaluated']} evaluated")
        for it in m5r["items"]:
            if it["status"] != "in_range" or it.get("atypical"):
                d = it["db"]
                rng = f"[{fmt(d['min'])}, {fmt(d['max'])}] n={d['n']} ({d['min_row']}; {d['max_row']})" if d["n"] \
                    else "no DB rows"
                da = it.get("db_all")
                if da and da["n"] != d["n"]:
                    rng += f"; all rows [{fmt(da['min'])}, {fmt(da['max'])}] n={da['n']}"
                tag = ("M5b atypical: outside P10-P90 "
                       f"[{fmt(d['p10'])}, {fmt(d['p90'])}]" if it.get("atypical") else it["status"])
                out.append(f"  - {tag}: {it['elem']} {it['dim']} = {fmt(it['value'])} vs {it['class']} {rng}")
    m6r = r["M6"]
    out.append(f"- M6 {m6r['violations']} violation(s); rules evaluated: {', '.join(m6r['rules_evaluated']) or 'none'}")
    for i in m6r["items"]:
        out.append(f"  - {i}")
    for i in m6r["atypical"]:
        out.append(f"  - atypical (not counted): {i}")
    for arch, d in m6r.get("microvia_ar_db", {}).items():
        pc = d["package_classes"]
        out.append(f"  - microvia AR DB range for {arch}: [{fmt(d['min'])}, {fmt(d['max'])}] n={d['n']} "
                   f"(package classes {', '.join(pc) if isinstance(pc, list) else pc}; physical rows)")
    if m6r.get("no_land"):
        out.append(f"  - via classes without land_um (land rules not evaluated): {', '.join(m6r['no_land'])}")
    tight = [x for x in m6r.get("spacing", []) if not x["ok"] or x["gap"] < 2 * x["required"]]
    for x in tight:
        out.append(f"  - land space {'ok' if x['ok'] else 'FAIL'}: {x['via']} ({x['kind']}) on {x['level']}: "
                   f"{x['pitch_src']} {fmt(x['pitch'])} - land {fmt(x['land'])} = {fmt(x['gap'])} vs "
                   f"{x['required_src']} {fmt(x['required'])}")
    out.append("")
    return "\n".join(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("json_in", nargs="?", type=Path, default=DEFAULT_JSON, help="package3d.json to score")
    ap.add_argument("--family", nargs="*", default=None, help="family ids (default: all)")
    ap.add_argument("--checklist", type=Path, default=DEFAULT_CHECKLIST)
    ap.add_argument("--json", type=Path, default=None, help="output JSON path (the .md goes next to it)")
    ap.add_argument("--label", default="", help="free text recorded with the input (e.g. 'git HEAD 0b141ca')")
    ap.add_argument("--all-rows", action="store_true",
                    help="M5 / M6 DB ranges over every row (default: physical rows only, see physical_row)")
    args = ap.parse_args()
    doc = json.loads(args.json_in.read_text())
    cfg = yaml.safe_load(args.checklist.read_text())
    db = DB(args.all_rows)
    db_all = None if args.all_rows else DB(True)
    # variants (L28, 2026-10-21) are scored as `<family>@<variant>` after their base family; `--family ID` selects a
    # family with all its variants, `--family ID@VARIANT` one variant
    allf: list[dict] = []
    for f in doc["families"]:
        allf.append(f)
        for v in f.get("variants") or []:
            allf.append({**v, "id": f"{f['id']}@{v['variant']}"})
    fams = [f for f in allf if not args.family or f["id"] in args.family or f["id"].split("@")[0] in args.family]
    if args.family:
        unknown = set(args.family) - {f["id"] for f in fams} - {f["id"].split("@")[0] for f in fams}
        if unknown:
            print(f"ERROR unknown family id(s): {', '.join(sorted(unknown))}", file=sys.stderr)
            return 1
    rows = []
    for f in fams:
        fam = Fam(f)
        entries = cfg.get("families", {}).get(fam.id)  # a variant may have its own mapping (`<family>@<variant>`)
        if entries is None:
            entries = cfg.get("families", {}).get(fam.id.split("@")[0])
        if entries is None:
            print(f"WARN {fam.id}: no checklist mapping", file=sys.stderr)
            entries = []
        r3 = m3(fam)
        rows.append({"id": fam.id, "name": f.get("name", fam.id), "has_routing": "routing" in f,
                     "M1": m1(fam), "M2": m2(fam, entries, cfg), "M3": r3, "M4": m4(fam, entries),
                     "M5": m5(fam, entries, db, db_all), "M6": m6(fam, db, seg_stretches(fam, r3), entries)})
    now = dt.datetime.now()
    out_json = args.json or OUT_DIR / f"{now:%Y-%m-%d_%H%M%S}.json"
    out_json.parent.mkdir(parents=True, exist_ok=True)

    def rel(p: Path) -> str:
        rp = p.resolve()
        return str(rp.relative_to(ROOT)) if rp.is_relative_to(ROOT) else p.name  # no absolute local paths

    res = {"generated": now.isoformat(timespec="seconds"), "input": rel(args.json_in),
           "input_generated": doc.get("generated"), "label": args.label, "checklist": rel(args.checklist),
           "db": {"stack_layers": len(db.sl), "interconnects": len(db.ic), "test_vehicles": db.n_tv,
                  "stack_layers_all": db.n_sl_all, "interconnects_all": db.n_ic_all,
                  "physical_only": db.physical_only},
           "tolerance_um": TOL, "families": rows}
    out_json.write_text(json.dumps(res, indent=1, ensure_ascii=False))
    tbl = table(rows)
    head = (f"Input `{res['input']}`{' (' + args.label + ')' if args.label else ''} (generated "
            f"{res['input_generated']}); checklist `{res['checklist']}`; DB "
            f"stack_layers {len(db.sl)} of {db.n_sl_all} rows, interconnects {len(db.ic)} of {db.n_ic_all} rows"
            f"{' (physical rows only)' if db.physical_only else ' (all rows)'}. Metrics: DevLog-011 M1-M6.")
    legend = ("M1 = reported/derived/template share; M2 = checklist elements present/expected; M3 = clean vertical "
              "net segments (z and xy), xy = grid-via / endpoint pitch mismatches with no jog between, orphan routed "
              "levels, t2b = top-to-board chain; M4 = routed/conductor levels and via-spanned / all gaps between "
              "routed levels; M5 = routing dims outside the DB min-max of physical rows (single-row = off a one-valued "
              "range by <= 50 %, not counted); M5b = inside the min-max but outside its P10-P90 (n >= 10), counted; "
              "M6 = rule violations (atyp = microvia AR outside the DB P10-P90, Cu thicker than the dielectric between "
              "levels, not counted; no-land = via classes without land_um, land rules not evaluated). M2-M4 are "
              "completeness checks, M5-M6 heuristics; none is a fidelity score on its own.")
    md = [f"# package3d fidelity scores {now:%Y-%m-%d %H:%M:%S}", "", head, "", legend, "", tbl, "", "## Details", ""]
    md += [details_md(r) for r in rows]
    out_md = out_json.with_suffix(".md")
    out_md.write_text("\n".join(md))
    print(tbl)
    print(f"\nwrote {rel(out_json)} and {rel(out_md)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
