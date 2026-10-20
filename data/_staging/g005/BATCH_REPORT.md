# Batch g005 affiliation report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g005` -> 0 errors, 0 warnings.
Totals: 30 papers, 250 author_affiliations rows, 37 organizations rows (incl. 3 parent-only rows).

## Per paper (authors found / rows written)

| paper_id | authors | rows | locator | gaps / ambiguities |
|---|---|---|---|---|
| tcpmt.2025.3557232 | 3 | 3 | p.1 footnote | no biographies in text |
| ectc51529.2024.00021 | 7 | 7 | p.1 | - |
| vlsitechnologyandcir46783.2024.10631478 | 35 | 35 | p.1 page render | text layer garbled; units by superscript 1/2/3; one shared Hillsboro, Oregon line applied to all units |
| icept59018.2023.10492317 | 6 | 6 | p.1 | 3x2 grid; order read row-major, text layer is column-major (ambiguous) |
| ectc51687.2025.00049 | 7 | 10 | p.1 | 3 authors carry 2 rows each (Universite de Sherbrooke 3IT + CNRS LN2, one printed block) |
| eptc59621.2023.10457912 | 8 | 8 | p.1 page render | OCR text; names checked against render |
| ectc51906.2022.00053 | 11 | 17 | p.1 page render | text layer garbled; 4-col grid read row-major (raw stream is column-major) -> author_index ambiguous |
| ectc51529.2024.00125 | 8 | 8 | p.1 | - |
| ectc51687.2025.00007 | 7 | 7 | p.1 | "Rebublic of Korea" (sic); author "Danee-Cho" as printed |
| ectc51529.2024.00011 | 7 | 7 | p.1 page render | byline absent from text layer; "Chungcheongbuk-do" is a province (as printed); Dunlap "Phoenix, AZ" no country -> US from printed city |
| ectc51846.2026.00035 | 6 | 6 | p.1 | - |
| ectc51909.2023.00230 | 5 | 5 | p.1 | - |
| eptc59621.2023.10457612 | 6 | 6 | p.1 page render | "Jong Ming Chinq" as printed (likely Ching) |
| ectc51529.2024.00017 | 5 | 5 | p.1 | - |
| ectc51687.2025.00141 | 7 | 7 | p.1 | - |
| estc60143.2024.10712129 | 4 | 4 | p.1 | - |
| itherm55368.2023.10177502 | 5 | 5 | p.1 | - |
| ectc51687.2025.00323 | 8 | 8 | p.1 | - |
| ectc51846.2026.00062 | 8 | 8 | p.1 | - |
| eptc62800.2024.10909872 | 8 | 8 | p.1 | - |
| ectc51529.2024.00258 | 11 | 10 | p.1 | King-Jien Chui prints only a gmail address, no affiliation -> no row (gap); 4-col grid read row-major, text layer column-major (ambiguous) |
| ectc51687.2025.00055 | 8 | 8 | p.1 | printed TSMC -> Taiwan Semiconductor Manufacturing Company |
| ectc51846.2026.00227 | 9 | 9 | p.1 | 3x3 grid read row-major, text layer column-major (ambiguous) |
| ectc51529.2024.00087 | 6 | 6 | p.1 | shared block with two Intel units; per-author unit not printed (both units in unit field) |
| ectc51846.2026.00183 | 6 | 6 | p.1 | "JPN" printed |
| tcpmt.2026.3650893 | 8 | 8 | p.1 footnote | footnote splits GT ECE (5) / UCSD Chem (3); no biographies in text |
| ectc51529.2024.00321 | 6 | 6 | p.1 | - |
| ectc51846.2026.00130 | 16 | 16 | p.1 | Ju Seon Goo: "South Korea" only, no city -> locality empty |
| vlsitechnologyandcir65830.2026.11577576 | 7 | 7 | p.1 | superscript 1 missing before "SK hynix Inc." in print; mapped by elimination |
| icep61562.2024.10535587 | 4 | 4 | p.1 | - |

## Grid-order rule used
Multi-column bylines were read row-major (left to right, then next row). In 4 papers (icept59018.2023.10492317,
ectc51906.2022.00053, ectc51529.2024.00258, ectc51846.2026.00227) the PDF text stream runs column-major, so the
published byline order (e.g. IEEE Xplore) may differ; affected rows carry a note. Affiliations per author are unaffected.

## Organizations created (printed variants)
- Purdue University (Purdue University)
- Samsung Electronics (Samsung Electronics Co., Ltd)
- Intel Corporation (Intel Corporation)
- STMicroelectronics (STMicroelectronics) - HQ country CH from general knowledge, verify
- Université de Sherbrooke (Université de Sherbrooke; unit 3IT)
- CNRS (Laboratoire Nanotechnologies Nanosystèmes (LN2) CNRS)
- IBM (IBM Canada; IBM Research- Tokyo; IBM Research)
- Agency for Science, Technology and Research (parent)
- Institute of Microelectronics, A*STAR (three printed long forms incl. "(IME)")
- Tokyo Institute of Technology
- Murata Manufacturing (Murata Manufacturing Co., Ltd.)
- DISCO Corporation
- Industrial Technology Research Institute
- Taiwan Semiconductor Manufacturing Company (Taiwan Semiconductor Manufacturing Company, Ltd.; TSMC)
- SK hynix (SK hynix Inc.; SK hynix America Inc. kept as unit)
- Nepes (nepes Corporation)
- Deca Technologies (DECA)
- AOI Electronics (AOI Electronics CO., LTD.)
- Institute of Science Tokyo
- Fraunhofer-Gesellschaft (parent only), Fraunhofer IZM
- CEA (parent only), CEA-Leti
- Sony Semiconductor Solutions Corporation; Sony Semiconductor Manufacturing Corporation (parent SSS, not printed)
- Resonac Corporation
- Peking University
- Chinese Academy of Sciences (parent only); Institute of Microelectronics, Chinese Academy of Sciences (The Institute of Microelectronics of the Chinese Academy of Sciences)
- University of California, Los Angeles (UCLA Center for Heterogeneous Integration and Performance Scaling (UCLA CHIPS))
- Kulicke & Soffa (Kulicke & Soffa Industries, Inc.) - HQ country SG from general knowledge, verify
- ASMPT (ASMPT Technology Hong Kong Limited; ASMPT Singapore Pte. Ltd kept as unit) - HQ country HK uncertain, verify
- Georgia Institute of Technology
- University of California, San Diego
- Applied Materials
- EV Group
- Advanced Semiconductor Engineering (Advanced Semiconductor Engineering, Inc.)

## Merge notes
- Regional subsidiaries printed on bylines (IBM Canada, IBM Research - Tokyo, SK hynix America Inc., ASMPT HK/SG
  entities) were folded into the parent org with the printed entity in `unit`; Sony Semiconductor Manufacturing kept
  as its own org (distinct manufacturing company) with parent SSS.
- Other batches use variant names (e.g. "Samsung Electronics Co., Ltd.", "SK hynix Inc.", "nepes Corporation",
  "Deca Technologies Inc.", "Applied Materials, Inc.", "ASE Group", "TSMC", "A*STAR Institute of Microelectronics").
