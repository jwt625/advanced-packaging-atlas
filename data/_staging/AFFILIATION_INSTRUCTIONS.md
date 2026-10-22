# Affiliation extraction instructions (DevLog-006, 2026-10-19)

You extract per-author affiliations for the institutions map. Work from the project root. No network, no git, no
emoji. Never invent: an author or affiliation the paper does not print is a gap (write it in the report), never filled
from memory.

## Input
Batch file `data/_staging/batches/<batch>.csv` (paper_id, title, first_author, orgs_as_listed: hints only).
Source: `references/<paper_id>/text.md` page 1 (byline, superscripts, footnotes, "Affiliation"/email lines) and, for
IEEE journals (TCPMT etc.), the first-page footnote ("X is with ...") and the author biographies at the end. If the text
layer is garbled or the byline is ambiguous, read `references/<paper_id>/figures/page_01.png` (crop/zoom into your
scratch folder). Schema: `data/schema/packaging.schema.yaml` v2.3 tables `author_affiliations` and `organizations`.

## author_affiliations.csv (one row per author x printed affiliation)
- aff_id `<paper_id>-a<NN>-<k>`: NN = author_index zero-padded to 2 digits, k = aff_order.
- author_index: 1-based byline order. author: name exactly as printed.
- aff_order: order of this author's affiliations as printed. kind: primary (first), additional, present_address
  ("now with", "present address").
- org_name: the organization's canonical English name as the organization names itself (e.g. "Taiwan Semiconductor
  Manufacturing Company" -> "TSMC" only if that is how it brands itself; pick one form and use it consistently across
  the batch). Divisions/departments/labs go in `unit`, not org_name (e.g. org "Intel Corporation", unit
  "Assembly Test Technology Development"). A named lab that is its own legal entity or institute (imec, ITRI, A*STAR IME,
  Fraunhofer IZM) is its own org; record a parent in organizations.parent_org when it has one (IME -> A*STAR).
- locality: city as printed ("Hsinchu", "Chandler, AZ"); empty if no city is printed (do not fill from memory).
- country: ISO 3166 alpha-2 from the printed address (HK and TW have their own codes, not CN). If the paper prints no
  country, use the country the printed city unambiguously lies in and add note "country from printed city".
  If the paper prints neither a country nor a city for that affiliation, country may be taken from the
  organization's headquarters (its organizations.csv country); the row note must then say "country = org HQ, not
  printed" and locality stays empty (decision 2026-10-21, DevLog-013 A5 F4; precedent ectc51909.2023.00108 TSMC,
  001c.147203 authors 9-13).
- source `paper`, locator e.g. "p.1 affiliations", "p.1 footnote", "p.8 biography". note: optional, <= 20 words.
- Shared affiliation blocks without per-author markers: assign each author the block(s) the layout ties them to; if the
  mapping is ambiguous, say so in the note and the report.

- Subsidiaries (2026-10-20): an entity printed under its own name (parent brand + region/function, or its own legal form: "SK hynix America Inc.", "Amkor Technology Korea, Inc.") is its own org with parent_org = the parent brand org; a location printed after the parent's name ("Intel Corporation, Kulim, Malaysia", "ASM, Belgium") stays the parent; divisions, labs, offices and facility names go in unit. Canonical names drop legal-form suffixes (Co., Ltd., Inc., Corporation) and keep the other printed words.

## organizations.csv (proposed, one row per org_name you used)
org_name, org_type (university | company | research_institute | government_lab | foundry | facility | consortium |
other), country (headquarters / main campus), region (north_america | south_america | europe | east_asia | south_asia
| southeast_asia | middle_east | oceania | africa), parent_org (must also be a row), notes (printed variants seen, e.g.
"printed: Taiwan Semiconductor Manufacturing Company, Ltd.; TSMC"). A coordinator merges names across batches later.

## Validation and report
`uv run python scripts/validate_db.py --staging data/_staging/<batch>` until 0 errors. Write
`data/_staging/<batch>/BATCH_REPORT.md`: per paper authors found / rows written, gaps, ambiguous mappings; the list of
org names you created with their printed variants. Write only inside `data/_staging/<batch>/` and your scratch folder.
