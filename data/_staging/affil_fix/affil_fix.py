"""Apply audit D2/D3/D5/D6/D8 fixes to data/_staging/affil_fix (copies of data/ tables). Writes changes.json."""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(sys.argv[1])
D = ROOT / "data" / "_staging" / "affil_fix"
SRC = ROOT / "data"
OUT_LOG = Path(sys.argv[2])

AFF_COLS = ["aff_id", "paper_id", "author_index", "author", "aff_order", "kind", "org_name", "unit", "locality",
            "country", "note", "source", "locator"]
ORG_COLS = ["org_name", "org_type", "country", "region", "parent_org", "notes"]


def rd(p: Path) -> list[dict]:
    with p.open(newline="") as f:
        return list(csv.DictReader(f))


def wr(p: Path, rows: list[dict], cols: list[str]) -> None:
    with p.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in cols})


# always start from the pristine data/ copies so the script is idempotent
affs = rd(SRC / "author_affiliations.csv")
orgs = {r["org_name"]: r for r in rd(SRC / "organizations.csv")}
log: list[dict] = []

# ---------------------------------------------------------------- D6 legal-suffix strip (rename)
RENAME = {
    "Ableprint Technology Co. Ltd.": "Ableprint Technology",
    "Adeia Inc.": "Adeia",
    "AGC Inc.": "AGC",
    "Ajinomoto Co., Inc.": "Ajinomoto",
    "Ajinomoto Fine-Techno Co., Inc.": "Ajinomoto Fine-Techno",
    "Ajinomoto Fine-Techno USA Corporation": "Ajinomoto Fine-Techno USA",
    "Asahi Kasei Corporation": "Asahi Kasei",
    "Brewer Science, Inc.": "Brewer Science",
    "Corintis SA": "Corintis",
    "Corning Incorporated": "Corning",
    "DISCO Corporation": "DISCO",
    "FICT LIMITED": "FICT",
    "JSR Corporation": "JSR",
    "KLA Corporation": "KLA",
    "LightSpeed Photonics Private Limited": "LightSpeed Photonics",
    "MEC Co., Ltd.": "MEC",
    "Microsoft Corporation": "Microsoft",
    "Mitsubishi Electric Corporation": "Mitsubishi Electric",
    "Mitsubishi Materials Corporation": "Mitsubishi Materials",
    "Murata Electronics North America Inc.": "Murata Electronics North America",
    "Powerchip Semiconductor Manufacturing Corporation": "Powerchip Semiconductor Manufacturing",
    "Renesas Electronics Corporation": "Renesas Electronics",
    "Resonac Corporation": "Resonac",
    "SAIMEMORY Corp.": "SAIMEMORY",
    "Shinko Electric Industries Co., Ltd.": "Shinko Electric Industries",
    "Sony Semiconductor Manufacturing Corporation": "Sony Semiconductor Manufacturing",
    "Sony Semiconductor Solutions Corporation": "Sony Semiconductor Solutions",
    "Spectronix Co.": "Spectronix",
    "Sumitomo Electric Industries, Ltd.": "Sumitomo Electric Industries",
    "SUSS MicroTec Lithography GmbH": "SUSS MicroTec Lithography",
    "Taiyo Ink Mfg. Co., Ltd.": "Taiyo Ink Mfg.",
    "Thin Film Technology Corporation": "Thin Film Technology",
    "ULVAC, Inc.": "ULVAC",
    "USHIO Inc.": "USHIO",
    "Xperi Corporation": "Xperi",
}
assert not set(RENAME.values()) & set(orgs), set(RENAME.values()) & set(orgs)
for old, new in RENAME.items():
    o = orgs.pop(old)
    n_rows = sum(1 for r in affs if r["org_name"] == old)
    o["org_name"] = new
    if "printed:" not in o["notes"]:
        o["notes"] = f"printed: {old}; " + o["notes"]
    orgs[new] = o
    log.append({"type": "rename", "org": old, "before": old, "after": new, "rows": n_rows,
                "evidence": "printed variants kept in organizations.notes"})
for r in affs:
    if r["org_name"] in RENAME:
        r["org_name"] = RENAME[r["org_name"]]
for o in orgs.values():
    if o["parent_org"] in RENAME:
        o["parent_org"] = RENAME[o["parent_org"]]


# ---------------------------------------------------------------- D2 subsidiary rule: new org rows
def add_org(name: str, org_type: str, country: str, region: str, parent: str, notes: str) -> None:
    assert name not in orgs, name
    assert parent in orgs, parent
    orgs[name] = {"org_name": name, "org_type": org_type, "country": country, "region": region,
                  "parent_org": parent, "notes": notes}
    log.append({"type": "new_org", "org": name, "before": "(none)",
                "after": f"{org_type}, {country}, {region}, parent {parent}", "rows": 0, "evidence": notes})


PB = "parent from printed name (parent brand + qualifier)"
add_org("SK hynix America", "company", "US", "north_america", "SK hynix",
        f"printed: SK hynix America Inc. (San Jose, USA); {PB}")
add_org("Amkor Technology Korea", "company", "KR", "east_asia", "Amkor Technology",
        f"printed: Amkor Technology Korea; Amkor Technology Korea, Inc.; {PB}")
add_org("Corning Research and Development", "company", "US", "north_america", "Corning",
        f"printed: Corning Research and Development Corporation; Corning Research & Development Corporation; {PB}")
add_org("Corning Optical Communication", "company", "DE", "europe", "Corning",
        f"printed: Corning Optical Communication GmbH & Co. KG (Berlin, Germany); {PB}")
add_org("IBM Canada", "company", "CA", "north_america", "IBM", f"printed: IBM Canada (Bromont, Canada); {PB}")
add_org("ASMPT Technology Hong Kong", "company", "HK", "east_asia", "ASMPT",
        f"printed: ASMPT Technology Hong Kong Limited (Tsing Yi, Hong Kong); {PB}")
add_org("ASMPT Singapore", "company", "SG", "southeast_asia", "ASMPT",
        f"printed: ASMPT Singapore Pte. Ltd (Yishun, Singapore); {PB}")
add_org("ASM Belgium", "company", "BE", "europe", "ASM International",
        f"printed: ASM Belgium (Leuven, Belgium); {PB}")

by_id = {r["aff_id"]: r for r in affs}


def reassign(ids: list[str], new_org: str, clear_unit: str | None, evidence: str, note: str | None = None) -> None:
    for i in ids:
        r = by_id[i]
        before = f"org {r['org_name']}; unit '{r['unit']}'"
        r["org_name"] = new_org
        if clear_unit is not None:
            assert r["unit"] == clear_unit, (i, r["unit"])
            r["unit"] = ""
        if note is not None:
            before += f"; note '{r['note']}'"
            r["note"] = note
        after = f"org {new_org}; unit '{r['unit']}'" + (f"; note '{r['note']}'" if note is not None else "")
        log.append({"type": "subsidiary_row", "org": i, "before": before, "after": after, "rows": 1,
                    "evidence": evidence})


P = "vlsitechnologyandcir65830.2026.11577576"
reassign([f"{P}-a01-1", f"{P}-a06-1", f"{P}-a07-1"], "SK hynix America", "SK hynix America Inc.",
         f"{P} text.md p.1: '2SK hynix America Inc., San Jose, USA'")
P = "ectc51909.2023.00175"
reassign([f"{P}-a{n:02d}-1" for n in (1, 2, 3, 4, 5, 6, 7, 10, 11, 12)], "Amkor Technology Korea", None,
         f"{P} text.md p.1: 'R&D / Amkor Technology Korea / Incheon, Korea' (a08, a09 print 'Amkor Technology,Inc.', Tempe: unchanged)")
P = "ectc51906.2022.00218"
reassign([f"{P}-a{n:02d}-1" for n in range(1, 7)], "Amkor Technology Korea", None,
         f"{P} text.md p.1: 'R&D, Amkor Technology Korea, Inc., Incheon, Republic of Korea'")
P = "tcpmt.2025.3599484"
reassign([f"{P}-a{n:02d}-1" for n in range(1, 4)], "Amkor Technology Korea", None,
         f"{P} text.md p.1 footnote: '... and Development Center, Amkor Technology Korea, Inc., Incheon 21991, South Korea'")
P = "ectc51529.2024.00023"
reassign([f"{P}-a{n:02d}-1" for n in range(1, 7)], "Corning Research and Development",
         "Corning Research & Development Corporation",
         f"{P} text.md p.1: 'Corning Research & Development Corporation / Corning, NY, United States'")
P = "ectc51687.2025.00063"
reassign([f"{P}-a{n:02d}-1" for n in (3, 4, 8)], "Corning Research and Development",
         "Corning Research and Development Corporation",
         f"{P} text.md p.1: 'Corning Research and Development Corporation / Corning, NY, USA'")
P = "ectc51846.2026.00106"
reassign([f"{P}-a{n:02d}-1" for n in range(2, 11)], "Corning Research and Development",
         "Corning Research and Development Corporation",
         f"{P} text.md p.1: 'Corning Research and Development Corporation / Corning, NY, United States'", note="")
reassign([f"{P}-a01-1"], "Corning Optical Communication", "Corning Optical Communication GmbH & Co. KG",
         f"{P} text.md p.1: 'Corning Optical Communication GmbH & Co. KG / Berlin, Germany'", note="")
P = "ectc51687.2025.00049"
reassign([f"{P}-a04-1", f"{P}-a05-1"], "IBM Canada", "IBM Canada", f"{P} text.md p.1: 'IBM Canada / Bromont, Canada'")
P = "ectc51846.2026.00227"
reassign([f"{P}-a05-1", f"{P}-a06-1"], "ASMPT Singapore", "ASMPT Singapore Pte. Ltd",
         f"{P} text.md p.1: 'ASMPT Singapore Pte. Ltd / Yishun, Singapore'")
reassign([f"{P}-a07-1", f"{P}-a08-1"], "ASMPT Technology Hong Kong", "ASMPT Technology Hong Kong Limited",
         f"{P} text.md p.1: 'ASMPT Technology Hong Kong / Limited / Tsing Yi, Hong Kong'")
P = "ectc51846.2026.00336"
reassign([f"{P}-a10-1"], "ASM Belgium", None, f"{P} text.md p.1: 'ASM Belgium / Leuven, Belgium'", note="")


# ---------------------------------------------------------------- org field edits (D2 parents, D5, D8, notes)
def set_org(name: str, field: str, value: str, evidence: str) -> None:
    o = orgs[name]
    before = o[field]
    if before == value:
        return
    o[field] = value
    log.append({"type": f"org_{field}", "org": name, "before": before or "(empty)", "after": value or "(empty)",
                "rows": 0, "evidence": evidence})


set_org("Ajinomoto Fine-Techno", "parent_org", "Ajinomoto",
        "printed names: 'Ajinomoto Fine-Techno Co., Inc.' (ectc51529.2024.00133, ectc51687.2025.00148, .00359) and "
        "'Ajinomoto Co., Inc., Tokyo, Japan' (ectc51846.2026.00389) share the brand; ownership itself not printed")
set_org("Ajinomoto Fine-Techno", "notes",
        "printed: Ajinomoto Fine-Techno Co., Inc.; Ajinomoto Fine-Techno Co. Inc.; " + PB, "notes")
set_org("Ajinomoto Fine-Techno USA", "parent_org", "Ajinomoto Fine-Techno",
        "ectc51846.2026.00389 text.md p.1: 'Ajinomoto Fine-Techno USA / Corporation, Cupertino, USA'")
set_org("Ajinomoto Fine-Techno USA", "notes", "printed: Ajinomoto Fine-Techno USA Corporation; " + PB, "notes")
set_org("Ajinomoto", "notes", "printed: Ajinomoto Co., Inc.", "notes")
set_org("Murata Electronics North America", "notes",
        "printed: Murata Electronics North America, Inc. (font-shifted text layer, decoded); " + PB,
        "ectc51529.2024.00170 text.md p.1 (font-shifted +29, decoded): 'Murata Electronics North / America, Inc'")
set_org("nepes hayyim", "notes",
        "printed: nepes hayyim; nepes hayyim Corporation; " + PB,
        "ectc51909.2023.00053 p.1 '2nepes hayyim Corporation, Laguna, Philippines'; ectc51909.2023.00266 p.1 'nepes hayyim / Binan, Philippines'")
set_org("nepes laweh", "notes",
        "printed: nepes laweh (Cheongan-myeon, Korea; email nepes.co.kr); " + PB,
        "ectc51909.2023.00266 text.md p.1: 'Kwang-Sun Oh / nepes laweh / Cheongan-myeon, Korea / oks0403@nepes.co.kr'; "
        "dropped 'parent not printed, verify at merge'")
set_org("Sony Semiconductor Manufacturing", "parent_org", "",
        "ectc51687.2025.00141 text.md: no parent or group relation printed; the parent was general knowledge")
set_org("Sony Semiconductor Manufacturing", "notes",
        "printed: Sony Semiconductor Manufacturing Corporation (Kumamoto, Japan); parent not printed, not set", "notes")
set_org("Sony Semiconductor Solutions", "notes", "printed: Sony Semiconductor Solutions Corporation", "notes")
set_org("ASMPT", "notes",
        "brand parent of the printed entities ASMPT Technology Hong Kong Limited and ASMPT Singapore Pte. Ltd; "
        "not printed alone; HQ not printed: country HK unverified placeholder",
        "ectc51846.2026.00227 p.1 prints only the two entities; dropped 'HQ country uncertain (HK listing), verify at merge'")
set_org("Kulicke & Soffa", "country", "US",
        "ectc51846.2026.00062 text.md p.1: 'Kulicke & Soffa Industries, Inc. / Fort Washington, PA, USA' (only printed address)")
set_org("Kulicke & Soffa", "region", "north_america", "follows country")
set_org("Kulicke & Soffa", "notes",
        "printed: Kulicke & Soffa Industries, Inc. (Fort Washington, PA, USA); HQ not printed: country = printed affiliation country",
        "dropped 'HQ country from general knowledge, verify at merge'")
set_org("CNRS", "org_type", "government_lab",
        "D8: national multi-institute public research organizations (CEA, CAS, CAEP, AIST, A*STAR, CNRS) = government_lab")
set_org("Amkor Technology", "notes",
        "OSAT; printed: Amkor Technology; Amkor Technology,Inc.; Amkor Technology Korea is its own org (parent_org = this org)", "notes")
set_org("SK hynix", "notes",
        "printed: SK hynix Inc.; SK Hynix Semiconductor Co., LTD (ectc51906.2022.00113, Icheon); merged names: SK hynix Inc.; "
        "SK hynix America moved to its own org", "notes")
set_org("Corning", "notes",
        "printed: Corning Incorporated; Corning Technology Center Korea kept as unit (facility name, no legal entity printed)",
        "notes")
set_org("IBM", "notes", orgs["IBM"]["notes"] + "; IBM Canada moved to its own org", "notes")
set_org("ASM International", "notes",
        "printed: ASM, Belgium (vlsitechnologyandcir46783.2024.10631441); ASM, Helsinki, Finland; ASM Belgium moved to its own org",
        "notes")

# ---------------------------------------------------------------- D3 nepes multi-site bylines -> one row per author
D3 = {
    "ectc32696.2021.00174": ("multi-site block, no per-author mapping; org from email domain nepes.co.kr; country = first printed address",
                             "9808 Scranton Road, Suite 410, San Diego, CA 92121 | 116, Gwahaksaneop, 3-ro, Ochang-eup, "
                             "Cheongwon-Gu, Cheongju-si Chungbuk, Korea | 100 East Main Ave, Laguna Technopark, Binan, "
                             "Laguna, 4024 Philippines; email Jacinta AmanLim@nepes.co.kr; acknowledgement thanks teams of nepes Corporation"),
    "ectc51906.2022.00136": ("multi-site block, no per-author mapping; org from email domain nepes.co.kr; country = first printed address",
                             "9808 Scranton Road, Suite 4100, San Diego, CA 92121 | 13-4, Jocheon-ri, Cheongan-myeon, "
                             "Goesan-gun, Chungcheongbuk-do, Korea | 100 East Main Ave, Laguna Technopark, Binan, Laguna, "
                             "4024 Philippines; email Jacinta.AmanLim@nepes.co.kr; acknowledgement thanks teams of nepes Corporation"),
    "iwlpc52010.2020.9375887": ("multi-site block, no per-author mapping; printed: Nepes; country = first printed site",
                                "Nepes / San Diego, CA, USA, Binan, Laguna, Philippines; email Jacinta.AmanLim@nepes.co.kr"),
}
new_affs = []
for r in affs:
    if r["paper_id"] in D3:
        note, printed = D3[r["paper_id"]]
        if r["aff_order"] == "1":
            before = f"{r['aff_id']}: primary, locality '{r['locality']}', {r['country']}"
            r["locality"] = ""
            r["country"] = "US"
            r["note"] = note
            log.append({"type": "multisite_collapse", "org": r["aff_id"], "before": before,
                        "after": "primary, locality '', US, note '" + note + "'", "rows": 1,
                        "evidence": f"{r['paper_id']} p.1 printed: {printed}"})
        else:
            log.append({"type": "multisite_drop", "org": r["aff_id"],
                        "before": f"{r['kind']}, locality '{r['locality']}', {r['country']}", "after": "(row removed)",
                        "rows": 1, "evidence": f"{r['paper_id']}: no per-author address mapping printed"})
            continue
    new_affs.append(r)
affs = new_affs

# ---------------------------------------------------------------- checks + write
used = {r["org_name"] for r in affs}
parents = {o["parent_org"] for o in orgs.values() if o["parent_org"]}
assert used <= set(orgs), used - set(orgs)
assert parents <= set(orgs), parents - set(orgs)
unused = sorted(set(orgs) - used - parents)
for n in unused:
    log.append({"type": "note", "org": n, "before": "", "after": "org row unused (no rows, not a parent)", "rows": 0,
                "evidence": ""})
wr(D / "author_affiliations.csv", affs, AFF_COLS)
wr(D / "organizations.csv", sorted(orgs.values(), key=lambda o: o["org_name"].lower()), ORG_COLS)
wr(D / "org_renames.csv",
   [{"old_org_name": k, "new_org_name": v} for k, v in RENAME.items()], ["old_org_name", "new_org_name"])
OUT_LOG.write_text(json.dumps(log, indent=1, ensure_ascii=False))
print(len(affs), "aff rows;", len(orgs), "orgs;", len(log), "log entries; unused:", unused)
