# Batch g003 affiliation report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g003` -> 0 errors, 0 warnings.
Totals: 30 papers, 237 authors, 262 author_affiliations rows, 27 organizations rows.
Sources: references/<paper_id>/text.md page 1; page-1 renders (byline crops, scratch only) checked for every
author-grid layout, the two font-shifted text layers (ectc51909.2023.00048, ectc51909.2023.00252) and the paper whose
byline is absent from the text layer (eptc59621.2023.10457670). One journal paper (tcpmt.2025.3599484): first-page
footnote used, biographies consistent.

## Per paper (authors / rows; gaps and ambiguities)

| paper_id | authors | rows | notes |
|---|---|---|---|
| tcpmt.2025.3599484 | 4 | 4 | p.1 footnote. Authors 1-3 Amkor Technology Korea, Inc. (Global R&D Center, Incheon); author 4 Sogang University (Dept. Electronic Engineering, Seoul). |
| ectc51909.2023.00266 | 6 | 6 | Per-author blocks. nepes hayyim (Binan PH) x3, nepes laweh (Cheongan-myeon KR), nepes corporation printed "Sandiego, USA" -> locality San Diego, Deca Technologies (Tempe). |
| ectc51687.2025.00051 | 22 | 22 | 4-column grid, text and image agree (row-major). Units: Substrate Packaging TD / Chandler Assembly TD / Wafer Assembly TD / Advanced Design Technology and Systems, all "Intel Foundry". GAP: Chandolu printed "Oregon, OR, USA" (no city) -> locality empty. |
| eptc59621.2023.10457670 | 2 | 2 | Byline missing from page-1 text layer (appears out of order lower in the text); order read from page image: Ya-Ching Tseng, King-Jien Chui. |
| ectc51909.2023.00252 | 5 | 5 | Text layer font-shifted; OCR copy and page image used. Third author printed "Paul Castillou" in image (OCR "Castillon"). Qorvo printed "San Jose, United States". |
| ectc51529.2024.00049 | 21 | 21 | Single shared TSMC block (Hsinchu Science Park, Hsinchu). Abbreviated names kept as printed. |
| ectc51906.2022.00136 | 5 | 15 | AMBIGUOUS: no org name in byline; three addresses printed (San Diego CA; Cheongan-myeon, Goesan-gun KR; Binan, Laguna PH) without per-author mapping. Org nepes Corporation from email domain nepes.co.kr and acknowledgement. Each author got all three sites (precedent: ectc32696.2021.00174 in g-batches). |
| eptc67330.2025.11392593 | 14 | 14 | AMBIGUOUS ORDER: 3-column grid with template markers "1st" (Jay Kim), "2nd" (In Soo Kang), "2nd" (Jung Won Lee) on row 1; read row-major. Text layer is column-major. All nepes Corporation, Cheongju. |
| ectc51909.2023.00048 | 9 | 14 | Text layer font-shifted (decoded) and column-major; 4-column grid read row-major from page image. SUNY block printed as one block "The Research Foundation for State University of New York, State University of New York Polytechnic Institute" -> 2 rows each (RF SUNY primary, SUNY Polytechnic Institute additional), Albany NY. Analog Photonics, Boston MA. |
| ectc51687.2025.00009 | 13 | 13 | Per-author blocks; Hillsboro / Chandler, "USA" only (no state). |
| ectc51687.2025.00131 | 11 | 11 | Per-author blocks, all TSMC Hsinchu. |
| ectc51529.2024.00207 | 4 | 4 | Renesas Taichung TW x3, Germering DE x1. |
| ectc51846.2026.00346 | 7 | 7 | Marvell Technology, Inc., Santa Clara. |
| ectc51909.2023.00008 | 7 | 7 | Per-author blocks, all TSMC Hsinchu. |
| ectc51909.2023.00153 | 4 | 8 | Block "Consortium JOINT2 (...), Resonac Corporation" -> JOINT2 primary + Resonac additional (g-batch convention). Kawasaki. |
| ectc51846.2026.00199 | 7 | 7 | Georgia Tech, Atlanta GA. |
| ectc51687.2025.00026 | 12 | 12 | Text dump showed 11; image shows 12 (Jun He). Printed "Hishchu" (sic) -> locality Hsinchu, noted. |
| ectc51909.2023.00094 | 7 | 7 | AMBIGUOUS UNIT: shared block prints two units (Substrate Packaging TD; Assembly & Test TD), Intel Corporation, Chandler AZ; one row per author with both units in `unit`. |
| ectc51687.2025.00048 | 6 | 6 | Samsung Electronics, Yongin Si. |
| ectc51909.2023.00135 | 4 | 4 | MediaTek: author 1 San Jose CA US, authors 2-4 Hsinchu TW. |
| ectc51687.2025.00187 | 8 | 8 | Printed "Intel". Hsinchu TW x6, Munich DE x1. GAP: Jason Zhang printed "Arizona, US" (no city) -> locality empty. |
| ectc51529.2024.00265 | 7 | 7 | Resonac Kawasaki, Kanagawa; Johno at Chikusei, Ibaraki. |
| ectc51909.2023.00324 | 2 | 2 | AIST Platform photonics research center, Tsukuba; second author block is placed lower in text layer, confirmed on image. |
| ectc51906.2022.00055 | 4 | 4 | AMBIGUOUS ORDER: 2x2 grid read row-major (Yu, Dongsu Kim, Han, Yook); text layer column-major (Yu, Han, Kim, Yook). Printed "Korea Electronic Technology Institute, KETI". |
| ectc51909.2023.00178 | 8 | 8 | Samsung Advanced Package Team, Cheonan-si, Chungcheongnam-Do. |
| ectc51529.2024.00311 | 6 | 6 | IMEC Leuven x4; MEC Co., Ltd Amagasaki x2. |
| ectc51687.2025.00047 | 10 | 10 | TSMC; printed "Hishchu" (sic) -> Hsinchu, noted. |
| ectc51909.2023.00268 | 6 | 6 | Samsung AVP Engineering Team, Cheonan-si; trailing commas after names dropped. |
| ectc51846.2026.00050 | 10 | 10 | IBM Research - Tokyo (Kawasaki) x7, IBM Research - Watson Research Center (Yorktown, NY) x1, IBM Infrastructure (Bromont, Canada) x2. |
| ectc51529.2024.00155 | 6 | 12 | JOINT2 + Resonac (2 rows each); Murai at Shimodate, others Kawasaki. |

## Organizations created (27) with printed variants

| org_name | type | country | parent | printed |
|---|---|---|---|---|
| Amkor Technology | company | US | | Amkor Technology Korea, Inc. |
| Sogang University | university | KR | | Sogang University |
| nepes Corporation | company | KR | | nepes Corporation; nepes corporation; (email nepes.co.kr) |
| nepes hayyim | company | PH | nepes Corporation | nepes hayyim (parent not printed; verify) |
| nepes laweh | company | KR | nepes Corporation | nepes laweh (parent not printed; verify) |
| Deca Technologies | company | US | | Deca Technologies |
| Intel Corporation | company | US | | Intel Corporation; Intel Corp; Intel; "..., Intel Foundry" units |
| A*STAR | government_lab | SG | | parent row only (not used directly in rows) |
| A*STAR Institute of Microelectronics | research_institute | SG | A*STAR | Institute of Microelectronics (IME), Agency for Science, Technology(,) and Research (A*STAR) |
| GlobalFoundries | foundry | US | | GlobalFoundries |
| Qorvo | company | US | | Qorvo |
| Taiwan Semiconductor Manufacturing Company | foundry | TW | | ... Company; ..., Ltd.; ..., LTd. |
| Research Foundation for the State University of New York | other | US | | The Research Foundation for State University of New York |
| SUNY Polytechnic Institute | university | US | | State University of New York Polytechnic Institute; "Stat University ..." (sic) |
| Analog Photonics | company | US | | Analog Photonics |
| Renesas Electronics Corporation | company | JP | | Renesas Electronics Corporation |
| Marvell Technology | company | US | | Marvell Technology, Inc. |
| JOINT2 | consortium | JP | | Consortium JOINT2 (Jisso Open Innovation Network of Tops 2) |
| Resonac Corporation | company | JP | | Resonac Corporation |
| Georgia Institute of Technology | university | US | | Georgia Institute of Technology |
| Samsung Electronics | company | KR | | Samsung Electronics Co, Ltd; Samsung Electronics Co., Ltd |
| MediaTek | company | TW | | MediaTek Inc |
| National Institute of Advanced Industrial Science and Technology | government_lab | JP | | ... (AIST) |
| Korea Electronics Technology Institute | research_institute | KR | | Korea Electronic Technology Institute, KETI |
| imec | research_institute | BE | | IMEC |
| MEC Co., Ltd. | company | JP | | MEC Co., Ltd |
| IBM | company | US | | IBM Research - Tokyo; IBM Research - Watson Research Center; IBM Infrastructure |

## Merge notes
- Org naming follows forms already used in g000-g002 (Taiwan Semiconductor Manufacturing Company, Intel Corporation,
  IBM, imec, A*STAR Institute of Microelectronics, JOINT2 + Resonac split, Amkor Technology).
- KETI canonical form "Korea Electronics Technology Institute" differs from printed "Electronic"; confirm at merge.
- nepes hayyim / nepes laweh parent links and country assignments are not printed in the papers; confirm at merge.
- Research Foundation for SUNY typed `other` (non-profit research administration entity).
