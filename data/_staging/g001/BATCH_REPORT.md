# Batch g001 affiliation report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g001` -> 0 errors, 0 warnings.
Totals: 30 papers, 275 author_affiliations rows, 27 organizations rows (A*STAR is a parent-only row).

Byline order: every page-1 byline was checked against `figures/page_01.png`. For multi-column author grids the
author_index follows row-major reading order (left to right, then next row). The pymupdf text layer reads several
grids column-wise, so its order differs from the rows here for: ectc51529.2024.00144, ectc51909.2023.00175,
ectc51909.2023.00307, eptc67330.2025.11392108, ectc51906.2022.00218. ectc51909.2023.00274 text layer omits two
authors (Tianyu Xiang, Guangqi Ouyang); they were read from the image.

## Per paper (authors / rows; gaps and ambiguities)
| paper_id | authors | rows | notes |
|---|---|---|---|
| ectc51529.2024.00144 | 12 | 12 | TSMC Hsinchu; row-major grid order (text layer column-major) |
| ectc32862.2020.00185 | 3 | 3 | A*STAR IME, Singapore |
| ectc51906.2022.00057 | 9 | 9 | Sony Semiconductor Solutions, "Kanagawa" (prefecture as printed) |
| ectc51906.2022.00179 | 17 | 17 | imec Leuven |
| ectc51906.2022.00309 | 4 | 4 | ASE Kaohsiung; units differ per author (Advanced Wafer Interconnect / New Panel-level Packaging) |
| ectc51687.2025.00233 | 15 | 15 | DuPont (Marlborough MA, Miaoli TW) + Unimicron Hsinchu |
| eptc53413.2021.9663896 | 4 | 4 | Two address blocks without markers; mapped by email domain (Deca: Sandstrom, Olson; ASE: Fang, Yang) |
| ectc51909.2023.00175 | 12 | 12 | Amkor Korea Incheon x10, Amkor Inc Tempe x2 (Hiner, Kelly); row-major order |
| ectc51909.2023.00091 | 5 | 5 | TSMC Hsinchu (name printed with typos) |
| ectc32696.2021.00315 | 7 | 7 | Samsung Electronics, Chonan-Si |
| ectc51909.2023.00274 | 5 | 5 | UCLA CHIPS; first author Haoxiang Ren per image |
| iedm45625.2022.10019499 | 31 | 31 | Intel, numbered units; no city printed (country US printed) |
| ectc51906.2022.00061 | 6 | 6 | ASE Kaohsiung x4, NCKU Tainan x2 |
| ectc51906.2022.00218 | 6 | 6 | Amkor Korea Incheon; 2-column grid, row-major order assumed (column-major would differ) |
| ectc32696.2021.00174 | 5 | 15 | AMBIGUOUS: no organization name printed; nepes from email domain nepes.co.kr and acknowledgement; three addresses (San Diego CA; Cheongju-si Chungbuk KR; Binan Laguna PH) with no author mapping, so each author gets all three (order 1 primary, 2-3 additional) |
| ectc51909.2023.00180 | 8 | 8 | IBM Systems Bromont/East Fishkill, IBM Research Tokyo (Kawasaki)/Albany; "IBM Sysytems" typo for Taneja |
| ectc51906.2022.00108 | 6 | 6 | Samsung Electronics, Chonan-Si |
| eptc67330.2025.11392108 | 8 | 8 | Unimicron, Hsinchu County / Taoyuan; row-major order |
| ectc51687.2025.00052 | 12 | 12 | IBM Research (Yorktown Heights, Albany, Kawasaki), IBM Infrastructure Bromont |
| ectc51909.2023.00174 | 7 | 7 | TSMC Hsinchu |
| vlsitechnologyandcir46769.2022.9830182 | 6 | 6 | TSMC Pathfinding for System Integration, Hsinchu |
| ectc51906.2022.00038 | 8 | 8 | ASE Kaohsiung City x5, NTU Taipei City x3 |
| ectc51687.2025.00063 | 8 | 8 | Corning Technology Center Korea (Asan) x5, Corning R&D Corp (Corning NY) x3 |
| ectc51909.2023.00307 | 5 | 5 | AIST Tsukuba x4, Kobe University x1; Kikuchi is 5th (second grid row) |
| tcpmt.2023.3266666 | 12 | 14 | p.1 footnote: IBM Watson x10, IBM Midrange Systems Rochester (Mann); Cordes "was with" IBM Watson, present_address ASML Wilton CT; Sakuma additional Tohoku University (visiting professor, p.9 biography; locality Sendai taken from his degree line in the same biography) |
| ectc51906.2022.00232 | 4 | 4 | MediaTek San Jose CA x1, Hsinchu x3 |
| ectc51906.2022.00135 | 11 | 11 | Amkor Vila do Conde PT (superscript 1) x9, Amkor Incheon KR (superscript 2) x2 |
| tcpmt.2023.3312037 | 11 | 11 | p.1 footnote: all Intel ATTD, Chandler AZ; no biographies in the paper |
| ectc51687.2025.00148 | 10 | 10 | Ajinomoto Fine-Techno (Kanagawa) x6, Fukuoka University IMAP x2, Fukuoka IST x2 |
| ectc51687.2025.00062 | 6 | 6 | Celestial AI, Santa Clara (USA) |

## Naming decisions (for the merge)
- Subsidiaries/segments collapsed to the brand org, site kept in locality, printed entity kept in unit or note:
  Amkor Technology Korea -> Amkor Technology; Advanced Semiconductor Engineering Inc. / ASE Technology -> ASE Group;
  DuPont Electronics & Industrial -> DuPont (unit); Corning Technology Center Korea / Corning Research and Development
  Corporation -> Corning Incorporated (unit); IBM Research / Systems / Infrastructure -> IBM (unit).
- Kept as own org: Sony Semiconductor Solutions Corporation, Ajinomoto Fine-Techno Co., Inc., A*STAR Institute of
  Microelectronics (parent A*STAR), imec.
- TSMC spelled out as "Taiwan Semiconductor Manufacturing Company".

## Organizations created (printed variants)
- Taiwan Semiconductor Manufacturing Company: Taiwan Semiconductor Manufacturing Company, Ltd.; Taiwan Semicondutor Manufaturing Company, Ltd; ... Company Ltd
- A*STAR Institute of Microelectronics: Institute of Microelectronics, A*STAR (Agency for Science, Technology and Research)
- A*STAR (parent only)
- Sony Semiconductor Solutions Corporation
- imec: IMEC
- ASE Group: Advanced Semiconductor Engineering Inc.; ASE Group; Advanced Semiconductor Engineering (ASE) Group; ASE Technology
- DuPont: DuPont Electronics & Industrial
- Unimicron: Unimicron; Unimicron Technology Co.
- Deca Technologies: Deca Technologies Inc.
- Amkor Technology: Amkor Technology Korea; Amkor Technology Korea, Inc.; Amkor Technology,Inc.; Amkor Technology
- Samsung Electronics: Samsung Electronics Co., Ltd
- University of California, Los Angeles: UCLA
- Intel Corporation
- National Cheng Kung University
- nepes Corporation: not printed in byline (email domain + acknowledgement)
- IBM: IBM Research; IBM Research – Tokyo; IBM Research – Albany; IBM Systems; IBM Infrastructure; IBM Thomas J. Watson Research Center; IBM, Midrange Systems
- Corning Incorporated: Corning Technology Center Korea; Corning Research and Development Corporation
- National Institute of Advanced Industrial Science and Technology: ... (AIST)
- Kobe University
- ASML: ASML Wilton
- Tohoku University (biography only)
- MediaTek: MediaTek Inc
- National Taiwan University
- Ajinomoto Fine-Techno Co., Inc.
- Fukuoka University: Fukuoka University, IMAP
- Fukuoka IST: Fukuoka IST (Industry, science, and technology)
- Celestial AI: Celestial AI Inc.
