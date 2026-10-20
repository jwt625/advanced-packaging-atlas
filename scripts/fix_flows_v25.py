"""Schema v2.5 mechanical process-flow fixes and the targeted fix list (DevLog-007, audits 2026-10-20).

Deterministic, no model, no network. Reads data/ (never writes it). Dry run by default: prints the report.
--write stages ALL papers in --out (default data/_staging/flow_v25), like convert_flows.py: papers.csv, the
paper-scoped tables (unchanged copies), process_flows.csv (build_seq added), process_steps.csv (deltas folded),
evidence/*.yaml (row_id references rewritten, revisions appended), fold_map.csv, fix_list.csv, fix_papers.csv.
Apply with `merge_staging.py <out> --replace` (coordinator).

Mechanical rules:
1. build_seq: kept when already set, else the flow number (F3 -> 3). Agents correct it where the build order differs.
2. Delta fold: delta rows (tv_id set) of one flow that are identical in every column except step_id, tv_id and
   locator become one row: the lowest step_id is kept, its tv_id = the union of the TVs (in the flow's tv_ids
   order), its locator = the union of the locator parts (first-seen order). Rows whose notes, values or provenance
   differ are not folded (they stay in the fix list as identical_delta_text). No renumbering: the folded-away ids
   are recorded in fold_map.csv and in evidence `revisions` (source flow_v25); references to them in evidence
   entries/derived/conflicts (everything above `revisions:`) are rewritten to the kept id. Refuses to fold a step id
   referenced by a 3D template (config/package3d/*.yaml).
3. Fix list (fix_list.csv: paper_id, row_id, issue_type, detail, source), deduplicated on (paper_id, row_id,
   issue_type) with sources joined:
   - audit_A / audit_B: every defect named in DevLog/audits/process_flow_audit_{A,B}_2026-10-20.md (AUDIT below);
   - validator: the v2.5 warnings (validate_db.flow_v25_issues) on the staged output, plus any other staged warning;
   - script: target_missing (interconnects pitch/pitch_min/pitch_max/diameter and stack_layers thickness/line/space/
     via_diameter/via_pitch of a TV of a full/ordered paper whose value appears in no target/conditions/split or
     typed thickness_um/thickness_in_um of any step of that TV's flows; nm/mm/mil/kA in the step text are converted;
     thickness of layers with layer_role device/core/carrier gets target_missing_preexisting, usually supplied
     material), category_other (every `other` row, with the auditor's mapping where given, else a keyword
     proposal), generic_intro_candidate (stated_in_flow steps of tv_build flows whose locators are only Sec. I /
     Introduction / Abstract), untyped_condition (a temperature/time/pressure with unit in `conditions` while the
     typed column is empty), build_order_note (flow notes that say a flow precedes a lower-numbered flow or follows a
     higher-numbered one), build_seq_unverified (a TV in 2+ tv_build flows: confirm build_seq; listed only for
     papers that already have another issue).
   fix_papers.csv: paper_id, n_issues, issue_types.

Usage: uv run python scripts/fix_flows_v25.py                      # dry run, report to stdout
       uv run python scripts/fix_flows_v25.py --write [--out data/_staging/flow_v25] [--overwrite]
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
from validate_db import ROOT, TABLES, flow_v25_issues, read, split_ids, validate  # noqa: E402

DATA = ROOT / "data"
FIX_DATE = "2026-10-20"
COPY_TABLES = ("test_vehicles", "components", "stack_layers", "interconnects", "electrical_interfaces",
               "optical_interfaces", "metrics", "figures", "author_affiliations")
FOLD_IGNORE = ("step_id", "tv_id", "locator")

# Defects named in the two audits (paper_id, row_id, issue_type, detail, source). Locators are the auditors'.
A, B = "audit_A", "audit_B"
AUDIT: list[tuple[str, str, str, str, str]] = [
    # audit A
    ("ectc51687.2025.00049", "ectc51687.2025.00049", "level_regrade", "full -> ordered: no temperature, time, pressure, dose or force in the paper (only formic acid atmosphere, p.3 Sec. II.C)", A),
    ("ectc51687.2025.00049", "ectc51687.2025.00049-F1", "flow_level", "F1 full without conditions -> ordered", A),
    ("ectc51687.2025.00049", "ectc51687.2025.00049-F2", "flow_level", "F2 full without conditions -> ordered", A),
    ("ectc51687.2025.00049", "ectc51687.2025.00049-F1-s14", "flow_structure", "Si-substrate SAP pads are a parallel component build (p.2 Sec. II.B): own flow 'Si substrate pads, SAP', tv_ids a;b, order vs bridge flow not stated", A),
    ("ectc51846.2026.00209", "ectc51846.2026.00209-F2", "flow_level", "F2 ordered but s03 carries 250 C / 60 min sinter (p.4 Sec. VII) -> full", A),
    ("ectc51846.2026.00209", "ectc51846.2026.00209-F1-s01", "value_not_in_paper", "conditions '1064 nm' not stated; only product names DIADEM 1064-10 / LMH-10X-1064 (p.2 Sec. IV): drop or mark as read from the product name", A),
    ("icep-iaac64884.2025.11003038", "icep-iaac64884.2025.11003038-F1-s05", "structure_derived_step", "1-2-1 build-up lamination rows (were s05..s08) restate the stack-up; Samples 3/4 are only 'four-metal-layers substrate' (p.1 Sec. II): delete or one generic row", A),
    ("icep-iaac64884.2025.11003038", "icep-iaac64884.2025.11003038-F1-s01", "step_basis", "'2-metal-layer core' for Samples 3/4 inferred from the structure: say so in notes", A),
    ("eptc59621.2023.10457612", "eptc59621.2023.10457612-F1-s11", "split_vs_route", "glass vs Si carrier changes the debond step (laser release vs mechanical shim-cutting, p.2 Fig. 3(l), p.3 Sec. II): route glass / Si, not split", A),
    ("eptc59621.2023.10457612", "eptc59621.2023.10457612-F1-s20", "split_vs_route", "glass vs Si carrier debond alternative in split: use route", A),
    ("eptc59621.2023.10457612", "eptc59621.2023.10457612-F1-s02", "target_missing", "heater line width 200 um (p.1)", A),
    ("eptc59621.2023.10457612", "eptc59621.2023.10457612-F1-s03", "target_missing", "sensor line width 20 um (p.1)", A),
    ("tcpmt.2025.3540665", "tcpmt.2025.3540665-F1-s05", "target_missing", "5x5 um bumps, 15 um pitch (p.1 Sec. I) on s05..s07", A),
    ("tcpmt.2025.3540665", "tcpmt.2025.3540665-F1-s06", "target_missing", "5x5 um bumps, 15 um pitch (p.1 Sec. I)", A),
    ("tcpmt.2025.3540665", "tcpmt.2025.3540665-F1-s07", "target_missing", "5x5 um bumps, 15 um pitch (p.1 Sec. I)", A),
    ("tcpmt.2025.3540665", "tcpmt.2025.3540665-F1-s13", "split_temp_untyped", "bond 170/150 C only in split; temp_c 170 / time_s 300 cleared by the re-pass (interconnect a-i1 keeps 170 C / 300 s): set temp_c_max", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s06", "target_missing", "L/S 8/8 um (p.2 Sec. II.A)", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s13", "target_missing", "L/S 8/8 um (p.2 Sec. II.A)", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s03", "target_missing", "via ~10 um; openings 10-200 um sit in notes (p.2 Sec. II.A)", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s11", "target_missing", "via ~10 um; openings 10-200 um (p.2 Sec. II.A)", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s08", "target_missing", "RDL design 5 um (p.2 Sec. II.A); keep 7 um UBM plating, note 5 vs 7 um", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s14", "target_missing", "RDL design 5 um (p.2 Sec. II.A); note 5 vs 7 um", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s05", "thickness_untyped", "Ti/Cu seed 'Ti 1 kA / Cu 1 kA' in target, thickness_um empty (stack_layers 0.1 um): thickness_um 0.1 + derived entry", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s12", "thickness_untyped", "Ti/Cu seed 1 kA in target, thickness_um empty: 0.1 + derived entry", A),
    ("ectc.2019.00-29", "ectc.2019.00-29-F2-s16", "step_basis", "final passivation position not in Fig. 6 or Sec. III.A (role only, p.7 Sec. V.A): inferred_order with a note", A),
    ("ectc51529.2024.00128", "ectc51529.2024.00128-F1-s02", "target_missing", "0.64 / 0.48 / 0.36 (0.33x0.4) um pitch (p.3 Sec. III.A)", A),
    ("ectc51529.2024.00128", "ectc51529.2024.00128-F1-s03", "target_missing", "0.64 / 0.48 / 0.36 (0.33x0.4) um pitch (p.3 Sec. III.A)", A),
    ("ectc51906.2022.00108", "ectc51906.2022.00108-F1-s03", "split_temp_untyped", "press cure 150/180 C only in split", A),
    ("ectc51846.2026.00209", "ectc51846.2026.00209-F4-s02", "split_temp_untyped", "500 C / 250 C only in split", A),
    # audit B
    ("tcpmt.2025.3628798", "tcpmt.2025.3628798-F7", "flow_level", "F7 full without typed T/t/P (only plasma-temperature split and atmosphere) -> ordered", B),
    ("tcpmt.2025.3628798", "tcpmt.2025.3628798-F7-s04", "missing_step", "add 'reflow at 140 C' after s04 (temp_c 140, p.11 Fig. 33 caption)", B),
    ("tcpmt.2025.3628798", "tcpmt.2025.3628798-F2", "flow_tv_ids", "damascene landing-pad flow lists only TV a; CUF TV b bonds to the same Cu-pad landing die (p.7 Fig. 22; p.2 Sec. I): tv_ids a;b or a TV-b note", B),
    ("tcpmt.2025.3628798", "tcpmt.2025.3628798-F4", "alternative_flow_same_tv", "photo-patternable WLUF (p.5 Fig. 14) is an alternative to F1 s09-s12 on TV a: route inside F1 (s09-s12 route 'CMP reveal') or scope comparison", B),
    ("tcpmt.2025.3628798", "tcpmt.2025.3628798-F6-s04", "target_missing", "landing-bump diameters 6 um Cu / 13 um Ni, Co (p.3 Fig. 8 labels)", B),
    ("iedm45741.2023.10413759", "iedm45741.2023.10413759-F1-s05", "value_misread", "conditions '~233 C' -> '~240 C' (Fig. 6 plateau on the 240 C gridline, p.3); typed temp_c 250 lt stays", B),
    ("iedm45741.2023.10413759", "iedm45741.2023.10413759-F1-s07", "derived_entry_missing", "thickness_um 0.01 from '10 nm' (p.2 Sec. II.B) has no evidence derived entry", B),
    ("tcpmt.2025.3610036", "tcpmt.2025.3610036-F1-s08", "identical_delta_text", "same ESI CornerStone laser step for a and b (s08/s09, p.4 Sec. IV.A): one shared step, TV-a target in split", B),
    ("ectc51906.2022.00218", "ectc51906.2022.00218-F1", "build_order", "Fig. 8 step 1 'Multi-ETR' (p.5) comes first: F2 (ETR RDL) precedes F1 (S-SWIFT assembly); set build_seq", B),
    ("ectc51906.2022.00218", "ectc51906.2022.00218-F2-s01", "split_misuse", "split mixes the coating-level sweep (p.4 Fig. 4) with prototype vs modified dielectric for TVs c vs a/d (p.6 Table I): per-TV material as delta or note", B),
    ("ectc51906.2022.00031", "ectc51906.2022.00031-F1", "build_order", "name heuristic: F1/F2 inverted (F2 TSV/backside prep precedes F1 tape mount s08); check build_seq", B),
    ("ectc51846.2026.00019", "ectc51846.2026.00019-F2", "flow_tv_ids", "generic_platform flow tv_ids = TV b (simulation_model); empty or a TV it is shown for (rule n v2.5)", B),
    ("ectc.2011.5898527", "ectc.2011.5898527-F1", "generic_intro", "F1-s01..s14 come from the Introduction's generic 'Typically ...' paragraph (p.1) but are stated_in_flow: generic_description; keep tv_ids a (Conclusions p.5 confirm DRIE, oxide, barrier/seed, Cu fill, CMP for AR <= 10), say so in notes", B),
    ("ectc.2011.5898527", "ectc.2011.5898527-F2-s01", "generic_intro", "bumping at '30-60 um' from the same generic paragraph: check step_basis", B),
    ("ectc.2011.5898527", "ectc.2011.5898527-F2-s02", "generic_intro", "dicing from the same generic paragraph: check step_basis", B),
    ("icep-iaac64884.2025.11002958", "icep-iaac64884.2025.11002958-F2-s01", "split_misuse", "split encodes different processes per TV (CCP vs LIS ion gun vs none/preheat): deltas or routes", B),
    ("icep-iaac64884.2025.11002958", "icep-iaac64884.2025.11002958-F2-s02", "split_misuse", "split encodes different processes per TV: deltas or routes", B),
    ("tcpmt.2026.3740312", "tcpmt.2026.3740312-F2-s02", "split_misuse", "split encodes 200 nm film vs 5 um bump: deltas or routes", B),
    ("ectc51846.2026.00050", "ectc51846.2026.00050-F3-s02", "split_misuse", "split encodes Cu pillar 150 um (a) vs bridge solder bumps 175 um (e): deltas or routes", B),
    ("ectc51909.2023.00150", "ectc51909.2023.00150-F2", "alternative_flow_same_tv", "alternative route stored as a separate tv_build flow on the same TV: route inside one flow", B),
    ("ectc51909.2023.00150", "ectc51909.2023.00150-F3", "alternative_flow_same_tv", "alternative route stored as a separate tv_build flow on the same TV: route inside one flow", B),
    ("ectc51846.2026.00227", "ectc51846.2026.00227", "level_regrade", "ordered but 4 typed temperature steps plus gas and tool: candidate for full", B),
    ("estc60143.2024.10712070", "estc60143.2024.10712070", "level_regrade", "full without typed condition; materials only, anneal a 250-300 C range: looks ordered (spot read)", B),
    ("ectc51909.2023.00023", "ectc51909.2023.00023", "level_regrade", "full without typed condition; anneal 250-300 C range only: looks ordered (spot read)", B),
    ("ectc51846.2026.00106", "ectc51846.2026.00106", "level_regrade", "full without typed condition; untyped 325-425 C ion-exchange range", B),
    ("ectc51906.2022.00053", "ectc51906.2022.00053", "level_regrade", "full without typed condition; only normalized temperatures and pressures", B),
    ("ectc51909.2023.00155", "ectc51909.2023.00155-F1-s08", "typed_value_definition", "temp_c 440 (set) vs 'actual max 250 C' in text (p.3 Table 5): both match the source; state which one temp_c holds", B),
    ("ectc51909.2023.00154", "ectc51909.2023.00154-F2-s10", "typed_value_questionable", "'vacuum, below 1 atm' stored as pressure_mpa 0.101325 lt; atmosphere vacuum alone carries it", B),
    ("ectc51906.2022.00055", "ectc51906.2022.00055-F3-s02", "untyped_condition", "580-600 C range in conditions only", B),
    ("ectc51906.2022.00055", "ectc51906.2022.00055-F1-s03", "untyped_condition", "45-60 min range in conditions only", B),
    ("ectc51909.2023.00023", "ectc51909.2023.00023-F1-s08", "untyped_condition", "250-300 C range in conditions only", B),
    ("ectc51846.2026.00416", "ectc51846.2026.00416-F1-s13", "untyped_condition", "8-10 mA/cm2, 4-8 h in conditions only", B),
    ("ectc51846.2026.00208", "ectc51846.2026.00208-F1-s12", "untyped_condition", "chamber pressure 0.5 Pa in conditions only", B),
    ("tcpmt.2026.3708099", "tcpmt.2026.3708099-F1-s01", "untyped_condition", "25 mTorr in conditions only", B),
    ("ectc51846.2026.00115", "ectc51846.2026.00115-F2-s01", "untyped_condition", "'30 min electroless' not typed (time_s)", B),
    ("ectc51846.2026.00062", "ectc51846.2026.00062-F1-s15", "untyped_condition", "'chuck 180 C' not typed (temp_c)", B),
]
# audit B random-20 sample of category `other`, with the auditor's proposed mapping
OTHER_AUDIT = {
    "vlsitechnologyandcir65830.2026.11577374-F1-s07": "rdl_layer", "ectc51909.2023.00008-F1-s01": "rdl_layer",
    "ectc51906.2022.00332-F2-s03": "rdl_layer", "ectc51906.2022.00332-F1-s02": "rdl_layer",
    "ectc.2016.201-F1-s01": "rdl_layer", "ectc51906.2022.00142-F7-s02": "lamination (prepreg cover)",
    "ectc51846.2026.00012-F3-s07": "lamination (membrane pressurize)", "ectc.2016.201-F2-s05": "laser_drill",
    "ectc51687.2025.00051-F2-s06": "laser_drill", "tcpmt.2026.3717381-F1-s02": "cmp or grinding_thinning (polish glass wafer)",
    "ectc51529.2024.00023-F1-s04": "carrier_prep (slice and finish to 150 mm wafers)",
    "ectc51906.2022.00176-F1-s07": "lithography (fiducial marks)",
    "ectc51529.2024.00023-F1-s08": "ion_exchange (proposed category, not in schema v2.5: keep other)",
    "ectc51846.2026.00302-F1-s02": "laser_modification (proposed category, not in schema v2.5: keep other)",
    "ectc51687.2025.00028-F1-s01": "device_fab (proposed category, not in schema v2.5: keep other; Si capacitor)",
    "ectc51846.2026.00092-F1-s03": "device_fab (proposed category, not in schema v2.5: keep other; Si micropillars)",
    "ectc51846.2026.00012-F2-s09": "merge into the parent step's conditions (cool / release)",
    "ectc51906.2022.00061-F1-s10": "merge into the parent step's conditions (air cool)",
    "ectc51909.2023.00178-F2-s02": "no information ('backside processes (not detailed)'): delete or keep",
    "ectc51909.2023.00174-F4-s06": "structure-like ('Cu via on LSI top metal'): check",
}
OTHER_KEYWORDS = [  # keyword proposal (audit B keyword classes), first match wins
    (re.compile(r"\b(cool(ed|ing)?|hold|release (the )?mold|pressuri[sz]|depressuri[sz]|ramp(ed)?)\b", re.I),
     "profile fragment: merge into the parent step's conditions"),
    (re.compile(r"\bion[- ]exchange", re.I), "ion_exchange (proposed category, not in schema v2.5: keep other)"),
    (re.compile(r"\b(femtosecond|fs[- ]laser|laser[- ]modif|SLE\b|selective laser)", re.I),
     "laser_modification (proposed category, not in schema v2.5: keep other)"),
    (re.compile(r"\b(HEMT|transistor|implant|front[- ]end|FEOL|capacitor fab|waveguide writ|device fab)", re.I),
     "device_fab (proposed category, not in schema v2.5: keep other)"),
    (re.compile(r"\b(RDL|redistribution|BEOL|wiring|metal layer|metallization layer)", re.I), "rdl_layer"),
    (re.compile(r"\blaser\b.*\b(via|hole|drill)|\b(via|hole)\b.*\blaser\b", re.I), "laser_drill"),
    (re.compile(r"\b(via|TGV|TSV|TDV|hole)s?\b.*\b(form|open|etch)|\b(form|open|etch)\w*\b.*\b(via|TGV|TSV|hole)s?\b", re.I),
     "tsv_tgv_formation or etch_dry/etch_wet (via formation)"),
]
INTRO_LOC = re.compile(r"^p\.\d+(?:-\d+)?\s+(?:Sec\.\s*I|Sec\.\s*1|Introduction|Abstract)$", re.I)
UNTYPED = {  # typed column(s) -> unit pattern in `conditions`
    ("temp_c", "temp_c_max"): re.compile(r"\d\s*(?:°\s*C|℃|deg\.?\s*C|C)(?![\w/])"),
    ("time_s",): re.compile(r"\d\s*(?:s|sec|min|mins|h|hr|hrs|hours?)\b"),
    ("pressure_mpa",): re.compile(r"\d\s*(?:MPa|kPa|Pa|Torr|mTorr|bar|mbar|psi)\b"),
}
ORDER_NOTE = re.compile(r"\b(after|follows|following|before|precedes|preceding|prior to)\b\s+(?:the\s+)?"
                        r"(?:(?!in\b)\w+\s+){0,3}?F(\d+)\b", re.I)  # "underfill follows in F5" names another subject
NUMRX = re.compile(r"(?<![\w.])(\d+(?:\.\d+)?)")


def fnum(fid: str) -> int:
    m = re.search(r"-F(\d+)$", fid)
    return int(m.group(1)) if m else 10**6


def snum(sid: str) -> int:
    m = re.search(r"-s(\d+)$", sid)
    return int(m.group(1)) if m else 10**6


# ----------------------------------------------------------------------------- mechanical fixes


def add_build_seq(flows: list[dict]) -> int:
    n = 0
    for f in flows:
        if not (f.get("build_seq") or "").strip():
            f["build_seq"] = str(fnum(f["flow_id"]))
            n += 1
    return n


def fold_deltas(flows: list[dict], steps: list[dict]) -> tuple[list[dict], list[dict]]:
    """Return (new steps, fold_map rows). Keeps CSV order of the kept rows."""
    tv_order = {f["flow_id"]: {tv: i for i, tv in enumerate(split_ids(f.get("tv_ids")))} for f in flows}
    cols = list(TABLES["process_steps"]["columns"])
    groups: dict[tuple, list[dict]] = collections.defaultdict(list)
    for r in steps:
        if split_ids(r.get("tv_id")):
            groups[(r["flow_id"],) + tuple(r.get(c, "") for c in cols if c not in FOLD_IGNORE)].append(r)
    drop: set[str] = set()
    fmap: list[dict] = []
    for rs in groups.values():
        if len(rs) < 2:
            continue
        rs = sorted(rs, key=lambda r: snum(r["step_id"]))
        keep = rs[0]
        order = tv_order.get(keep["flow_id"], {})
        tvs = sorted({tv for r in rs for tv in split_ids(r.get("tv_id"))}, key=lambda t: (order.get(t, 10**6), t))
        locs = list(dict.fromkeys(x.strip() for r in rs for x in (r.get("locator") or "").split(";") if x.strip()))
        old_tv, old_loc = keep["tv_id"], keep["locator"]
        keep["tv_id"], keep["locator"] = ";".join(tvs), "; ".join(locs)
        for r in rs[1:]:
            drop.add(r["step_id"])
            fmap.append({"removed_step_id": r["step_id"], "kept_step_id": keep["step_id"], "flow_id": keep["flow_id"],
                         "removed_tv_id": r["tv_id"], "kept_tv_id_before": old_tv, "kept_tv_id_after": keep["tv_id"],
                         "locator_changed": "yes" if keep["locator"] != old_loc else ""})
    return [r for r in steps if r["step_id"] not in drop], fmap


def template_step_refs() -> set[str]:
    out: set[str] = set()
    for p in (ROOT / "config" / "package3d").glob("*.yaml"):
        out |= set(re.findall(r"[\w.-]+-F\d+-s\d+", p.read_text()))
    return out


def rewrite_evidence(text: str, fmap: list[dict]) -> tuple[str, int]:
    """Rewrite removed ids to kept ids above `revisions:`; append one revision per changed row."""
    lines = text.split("\n")
    ri = next((i for i, ln in enumerate(lines) if ln.startswith("revisions:")), None)
    head = "\n".join(lines[:ri] if ri is not None else lines)
    tail = "\n".join(lines[ri:]) if ri is not None else "revisions:"
    mapping = {m["removed_step_id"]: m["kept_step_id"] for m in fmap}
    rx = re.compile(r"(?<![\w.])(?:" + "|".join(re.escape(k) for k in sorted(mapping, key=len, reverse=True)) + r")(?![\w])")
    head, n = rx.subn(lambda m: mapping[m.group(0)], head)
    add = []
    by_kept: dict[str, list[dict]] = collections.defaultdict(list)
    for m in fmap:
        by_kept[m["kept_step_id"]].append(m)
    reason = ("schema v2.5: a delta row lists every TV it applies to; the rows were identical except tv_id"
              " and locator")
    for kept, ms in by_kept.items():
        loc = "; locator -> union of the folded rows" if any(m["locator_changed"] for m in ms) else ""
        add.append(f'  - {{date: {FIX_DATE}, source: flow_v25, row_id: "{kept}", change: "tv_id '
                   f'{ms[0]["kept_tv_id_before"]} -> {ms[0]["kept_tv_id_after"]}{loc}; folded '
                   f'{", ".join(m["removed_step_id"] for m in ms)}", reason: "{reason}"}}')
        for m in ms:
            add.append(f'  - {{date: {FIX_DATE}, source: flow_v25, row_id: "{m["removed_step_id"]}", change: '
                       f'"deleted: folded into {kept} (tv_id {m["removed_tv_id"]} added to its list)", '
                       f'reason: "{reason}"}}')
    tail = tail.rstrip("\n") + "\n" + "\n".join(add) + "\n"
    return head + "\n" + tail, n


# ----------------------------------------------------------------------------- fix list


def nums_in(text: str) -> set[float]:
    out: set[float] = set()
    for m in NUMRX.finditer(text):
        x = float(m.group(1))
        out.add(x)
        tail = text[m.end():m.end() + 5]
        if re.match(r"\s*nm", tail):
            out.add(x / 1000)
        elif re.match(r"\s*(?:kA|Å|A\b)", tail):
            out.add(x / 10 if "k" in tail[:3] else x / 10000)
        elif re.match(r"\s*mm", tail):
            out.add(x * 1000)
        elif re.match(r"\s*mil", tail):
            out.add(x * 25.4)
    return out


def fmt(v: float) -> str:
    return f"{v:g}"


def build_fix_list(st: dict, staged_warns: list[str]) -> list[dict]:
    papers, flows, steps = st["papers"], st["process_flows"], st["process_steps"]
    f2p = {f["flow_id"]: f["paper_id"] for f in flows}
    level = {p["paper_id"]: p.get("process_flow_level", "") for p in papers}
    step_ids = {r["step_id"] for r in steps}
    all_ids = (set(level) | set(f2p) | step_ids | {r["tv_id"] for r in st["test_vehicles"]}
               | {r["ic_id"] for r in st["interconnects"]} | {r["layer_id"] for r in st["stack_layers"]})
    folded = {m["removed_step_id"]: m["kept_step_id"] for m in st["fold_map"]}
    tpl = template_step_refs()
    rows: list[dict] = []

    def add(pid: str, rid: str, kind: str, detail: str, source: str) -> None:
        if rid in folded:
            detail += f" (row folded into {folded[rid]} by flow_v25)"
            rid = folded[rid]
        if rid not in all_ids:
            detail += " (row id not found in the staged tables)"
        if rid in tpl:
            detail += " (3D-template-referenced step id: keep it)"
        rows.append({"paper_id": pid, "row_id": rid, "issue_type": kind, "detail": detail, "source": source})

    for t in AUDIT:
        add(*t)
    # validator v2.5 warnings (structured) + any other staged warnings
    for pid, rid, kind, detail in flow_v25_issues(papers, flows, steps, f2p):
        add(pid, rid, kind, detail, "validator")
    for w in staged_warns:
        if "] " in w and re.search(r"\[[a-z_0-9]+\]", w):
            continue  # a v2.5 warning, added above
        m = re.match(r"(\w+)(?:\.csv:\d+)?:? \(?([\w.-]+)\)?", w)
        rid = m.group(2) if m else ""
        pid = rid if rid in level else (f2p.get(rid) or f2p.get(rid.rsplit("-s", 1)[0], "") or rid.rsplit("-", 1)[0])
        add(pid, rid, "validator_other", w, "validator")
    # scripted: target_missing
    tvflows: dict[str, list[str]] = collections.defaultdict(list)
    for f in flows:
        for tv in split_ids(f.get("tv_ids")):
            tvflows[tv].append(f["flow_id"])
    sbf: dict[str, list[dict]] = collections.defaultdict(list)
    for r in steps:
        sbf[r["flow_id"]].append(r)
    pools: dict[str, set[float]] = {}
    for tbl, fields, key in (("interconnects", ("pitch_um", "pitch_min_um", "pitch_max_um", "diameter_um"), "ic_id"),
                             ("stack_layers", ("thickness_um", "line_um", "space_um", "via_diameter_um",
                                               "via_pitch_um"), "layer_id")):
        for r in st[tbl]:
            tv = r["tv_id"]
            pid = tv.rsplit("-", 1)[0]
            if level.get(pid) not in ("full", "ordered") or tv not in tvflows:
                continue
            if tv not in pools:
                pool: set[float] = set()
                for fid in tvflows[tv]:
                    for s in sbf[fid]:
                        d = split_ids(s.get("tv_id"))
                        if d and tv not in d:
                            continue
                        pool |= nums_in(" ".join((s.get("target") or "", s.get("conditions") or "", s.get("split") or "")))
                        for c in ("thickness_um", "thickness_in_um"):
                            if (s.get(c) or "").strip():
                                pool.add(float(s[c]))
                pools[tv] = pool
            for fld in fields:
                if not (r.get(fld) or "").strip():
                    continue
                v = float(r[fld])
                if any(abs(v - x) <= 1e-6 + 1e-3 * abs(v) for x in pools[tv]):
                    continue
                pre = fld == "thickness_um" and r.get("layer_role") in ("device", "core", "carrier")
                what = (f"{r.get('level', '')} {r.get('ic_type', '')}" if tbl == "interconnects"
                        else f"{r.get('structure', '')} {r.get('layer_name') or r.get('material') or ''} ({r.get('layer_role', '')})")
                add(pid, r[key], "target_missing_preexisting" if pre else "target_missing",
                    f"{tbl}.{fld} {fmt(v)} ({what.strip()}) of TV {tv.rsplit('-', 1)[-1]} appears in no step "
                    f"target/conditions/split/thickness of flows {', '.join(tvflows[tv])}", "script")
    # scripted: category other
    for r in steps:
        if r.get("category") != "other":
            continue
        pid = f2p.get(r["flow_id"], "")
        if r["step_id"] in OTHER_AUDIT:
            add(pid, r["step_id"], "category_other", f"'{r['step'][:60]}': proposed {OTHER_AUDIT[r['step_id']]}", "audit_B")
            continue
        prop = next((lab for rx, lab in OTHER_KEYWORDS if rx.search(r.get("step") or "")),
                    "no keyword match: choose an existing category or keep other")
        add(pid, r["step_id"], "category_other", f"'{r['step'][:60]}': keyword proposal {prop}", "script")
    # scripted: generic intro candidates
    fscope = {f["flow_id"]: f.get("scope", "") for f in flows}
    for r in steps:
        parts = [x.strip() for x in (r.get("locator") or "").split(";") if x.strip()]
        if (r.get("step_basis") == "stated_in_flow" and fscope.get(r["flow_id"]) == "tv_build" and parts
                and all(INTRO_LOC.match(x) for x in parts)):
            add(f2p.get(r["flow_id"], ""), r["step_id"], "generic_intro_candidate",
                f"stated_in_flow but located only in {r['locator']}: generic_description unless the paper says it was executed",
                "script")
    # scripted: untyped conditions
    for r in steps:
        cond = r.get("conditions") or ""
        for cols, rx in UNTYPED.items():
            m = rx.search(cond)
            if m and not any((r.get(c) or "").strip() for c in cols):
                add(f2p.get(r["flow_id"], ""), r["step_id"], "untyped_condition",
                    f"{'/'.join(cols)} empty but conditions has '{cond[max(0, m.start() - 15):m.end() + 5].strip()}' "
                    "(type it if single-valued and stated; ranges stay in conditions)", "script")
    # scripted: build order from flow notes
    for f in flows:
        n = fnum(f["flow_id"])
        for m in ORDER_NOTE.finditer(f.get("notes") or ""):
            w, k = m.group(1).lower(), int(m.group(2))
            if (w in ("before", "precedes", "preceding", "prior to") and k < n) or (w in ("after", "follows", "following") and k > n):
                add(f["paper_id"], f["flow_id"], "build_order_note",
                    f"notes say '{m.group(0)}' but build_seq defaults to the flow number ({f.get('build_seq')}): set build_seq",
                    "script")
    # build_seq_unverified (only for papers that already have an issue)
    with_issue = {r["paper_id"] for r in rows}
    tvb: dict[str, list[str]] = collections.defaultdict(list)
    for f in flows:
        if f.get("scope") == "tv_build":
            for tv in split_ids(f.get("tv_ids")):
                tvb[tv].append(f["flow_id"])
    st["multi_flow_tvs"] = {tv: fs for tv, fs in tvb.items() if len(fs) > 1}
    for tv, fs in st["multi_flow_tvs"].items():
        pid = f2p[fs[0]]
        if pid in with_issue:
            add(pid, tv, "build_seq_unverified",
                f"TV in {len(fs)} tv_build flows ({', '.join(fs)}); build_seq is the flow-number default: confirm the order",
                "script")
    # dedupe on (paper_id, row_id, issue_type)
    merged: dict[tuple[str, str, str], dict] = {}
    for r in rows:
        k = (r["paper_id"], r["row_id"], r["issue_type"])
        if k in merged:
            m = merged[k]
            if r["source"] not in m["source"].split(";"):
                m["source"] += ";" + r["source"]
            if r["detail"] not in m["detail"]:
                m["detail"] += " | " + r["detail"]
        else:
            merged[k] = dict(r)
    return sorted(merged.values(), key=lambda r: (r["paper_id"], r["row_id"], r["issue_type"]))


# ----------------------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--out", default="data/_staging/flow_v25")
    ap.add_argument("--overwrite", action="store_true", help="replace a previous output of this script in --out")
    a = ap.parse_args()
    st: dict = {t: read(DATA, t)[1] for t in ("papers", "process_flows", "process_steps") + COPY_TABLES}
    n_seq = add_build_seq(st["process_flows"])
    n_before = len(st["process_steps"])
    st["process_steps"], st["fold_map"] = fold_deltas(st["process_flows"], st["process_steps"])
    clash = template_step_refs() & {m["removed_step_id"] for m in st["fold_map"]}
    if clash:
        print(f"refusing: folded ids referenced by 3D templates: {sorted(clash)}")
        return 1
    f2p = {f["flow_id"]: f["paper_id"] for f in st["process_flows"]}
    by_paper: dict[str, list[dict]] = collections.defaultdict(list)
    for m in st["fold_map"]:
        by_paper[f2p[m["flow_id"]]].append(m)
    ev_out, ev_refs = {}, 0
    for pid, ms in by_paper.items():
        ev_out[pid], n = rewrite_evidence((DATA / "evidence" / f"{pid}.yaml").read_text(), ms)
        ev_refs += n
    kept = {m["kept_step_id"] for m in st["fold_map"]}
    L = [f"fix_flows_v25 ({FIX_DATE})",
         f"build_seq defaulted to the flow number: {n_seq} / {len(st['process_flows'])} flows",
         f"process_steps {n_before} -> {len(st['process_steps'])}: {len(st['fold_map'])} delta rows folded into "
         f"{len(kept)} rows ({len(kept) + len(st['fold_map'])} rows in {len(kept)} groups, {len(by_paper)} papers)",
         f"evidence: {len(by_paper)} files, {ev_refs} row_id references rewritten, "
         f"{len(kept) + len(st['fold_map'])} revisions appended"]
    for m in st["fold_map"]:
        L.append(f"  fold {m['removed_step_id']} -> {m['kept_step_id']} (tv_id {m['kept_tv_id_after']}"
                 f"{'; locator union' if m['locator_changed'] else ''})")
    if not a.write:
        print("\n".join(L))
        print("\n(dry run: nothing written; --write stages the tables and the fix list)")
        return 0
    out = ROOT / a.out
    if out.exists() and any(out.iterdir()):
        if not (a.overwrite and (out / "fold_map.csv").exists()):
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
    for t in ("papers", "process_flows", "process_steps") + COPY_TABLES:
        write(f"{t}.csv", list(TABLES[t]["columns"]), st[t])
    for ev in sorted((DATA / "evidence").glob("*.yaml")):
        dst = out / "evidence" / ev.name
        if ev.stem in ev_out:
            dst.write_text(ev_out[ev.stem])
        else:
            shutil.copyfile(ev, dst)
    write("fold_map.csv", ["removed_step_id", "kept_step_id", "flow_id", "removed_tv_id", "kept_tv_id_before",
                           "kept_tv_id_after", "locator_changed"], st["fold_map"])
    errs, warns = validate(out, base=DATA)
    fix = build_fix_list(st, warns)
    write("fix_list.csv", ["paper_id", "row_id", "issue_type", "detail", "source"], fix)
    per: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    for r in fix:
        per[r["paper_id"]][r["issue_type"]] += 1
    write("fix_papers.csv", ["paper_id", "n_issues", "issue_types"],
          [{"paper_id": p, "n_issues": sum(c.values()), "issue_types": ";".join(f"{k}:{v}" for k, v in sorted(c.items()))}
           for p, c in sorted(per.items())])
    print("\n".join(L))
    wc = collections.Counter(re.search(r"\[([a-z_0-9]+)\]", w).group(1) if re.search(r"\[([a-z_0-9]+)\]", w) else "other"
                             for w in warns)
    print(f"staged validation: {len(errs)} errors, {len(warns)} warnings {dict(wc)}")
    for e in errs[:20]:
        print("ERROR", e)
    ic = collections.Counter(r["issue_type"] for r in fix)
    print(f"fix_list: {len(fix)} rows, {len(per)} papers")
    for k, v in sorted(ic.items()):
        print(f"  {k}: {v} rows, {len({r['paper_id'] for r in fix if r['issue_type'] == k})} papers")
    mf = st["multi_flow_tvs"]
    print(f"TVs in 2+ tv_build flows: {len(mf)} in {len({f2p[v[0]] for v in mf.values()})} papers "
          f"({sum(1 for v in mf.values() if f2p[v[0]] not in per)} TVs in papers without other issues, not listed)")
    print(f"wrote {out.relative_to(ROOT)}")
    return 1 if errs else 0


if __name__ == "__main__":
    sys.exit(main())
