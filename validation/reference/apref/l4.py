"""Read-only adapter to the L4 validation cases (validation/cases/, validation/expected/): box lists, the tier-A
material set and the expected values, converted to the `ap-ref-box/0` input of apref.boxcase."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

import yaml

VAL = Path(__file__).resolve().parents[2]  # validation/
CASES = VAL / "cases"
EXPECTED = VAL / "expected" / "tier_a_values.json"


@lru_cache
def tier_a_materials() -> dict:
    return yaml.safe_load((CASES / "A" / "_materials_tier_a.yaml").read_text())["materials"]


@lru_cache
def expected() -> dict:
    return json.loads(EXPECTED.read_text())["values"]


def case_yaml(rel: str) -> dict:
    hits = sorted((CASES / rel.split("/")[0]).glob(rel.split("/")[1] + "*.yaml"))
    if not hits:
        raise FileNotFoundError(rel)
    return yaml.safe_load(hits[0].read_text())


def material(key: str, override: dict | None = None) -> dict:
    """tierA:<key> -> apref material dict."""
    k = key.split(":", 1)[1] if ":" in key else key
    src = dict(tier_a_materials()[k])
    src.update(override or {})
    out: dict = {}
    if "k_W_mK" in src:
        out["k_W_mK"] = src["k_W_mK"]
    if "E_GPa" in src:
        out["elastic"] = {"type": "iso", "E_GPa": src["E_GPa"], "nu": src["nu"]}
    if "cte_ppmK" in src:
        out["cte"] = {"alpha_ppmK": src["cte_ppmK"]}
    return out


def boxes_to_case(boxes: list[dict], case_id: str, overrides: dict | None = None) -> dict:
    """L4 boxes (material 'tierA:<key>') -> ap-ref-box/0 dict with parts + materials (keys stripped of 'tierA:')."""
    parts, mats = [], {}
    for b in boxes:
        p = dict(b)
        key = p["material"].split(":", 1)[-1]
        p["material"] = key
        parts.append(p)
        mats[key] = material(key, (overrides or {}).get(key))
    return {"schema": "ap-ref-box/0", "id": case_id, "parts": parts, "materials": mats}
