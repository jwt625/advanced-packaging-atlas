# Affiliation fix report (2026-10-20, DevLog-006; audit `DevLog/audits/affiliations_audit_2026-10-20.md` D2/D3/D5/D6/D8)

Written by the coordinator from the fix agent's final report. Every individual change is in `changes.csv` (148 entries:
type, aff_id/org, before, after, rows, evidence locator); org renames in `org_renames.csv` (35); the script is
`affil_fix.py` (rebuilds from data/). Staged tables validated with 0 errors; applied to data/ by the coordinator after review.

| change | count |
|---|---|
| orgs renamed (legal suffix stripped, D6) | 35 orgs / 268 rows |
| new subsidiary orgs (D2) | 8: SK hynix America, Amkor Technology Korea, Corning Research and Development, Corning Optical Communication, IBM Canada, ASMPT Technology Hong Kong, ASMPT Singapore, ASM Belgium |
| rows moved to a subsidiary org (D2) | 48 (unit cleared on 28) |
| nepes multi-site rows (D3) | 38 -> 14 (one row per author, locality empty, note "multi-site block, no per-author mapping") |
| parent_org changes | 3 (Ajinomoto Fine-Techno -> Ajinomoto; Ajinomoto Fine-Techno USA -> Ajinomoto Fine-Techno; Sony Semiconductor Manufacturing parent cleared) |
| org country/region corrected (D5) | 1 (Kulicke & Soffa SG -> US from the printed Fort Washington, PA address) |
| org_type aligned (D8) | 1 (CNRS -> government_lab: national multi-institute agencies are government_lab; their single institutes and independent non-profits are research_institute) |

Totals: affiliation rows 2020 -> 1996; organizations 136 -> 144.

Subsidiary rule: an entity printed under its own name (parent brand + region/function, or its own legal form) is its own
org with parent_org = the parent brand org; a location printed after the parent's name stays the parent; divisions, labs,
offices and facility names go in unit. Parent links rest on the printed names, not on printed ownership statements.

Coordinator decisions on the agent's open questions (2026-10-20): Intel "ATTD, Intel Technology, Malaysia" stays Intel;
Corning Technology Center Korea stays a unit; the nepes multi-site rows keep the first printed address's country (US) with
the note (no locality, so no pin); ASMPT HK remains a labelled placeholder; the narrow suffix rule stands (AGC, JSR, ULVAC,
USHIO, DISCO, FICT, MEC); parent links from printed names are accepted; ASM International left as is.
