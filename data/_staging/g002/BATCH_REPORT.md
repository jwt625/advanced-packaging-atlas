# Batch g002 - author affiliations (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g002` -> 0 errors, 0 warnings.
Totals: 30 papers, 267 authors, 272 author_affiliations rows, 29 organizations (A*STAR is a parent-only row).
Source: `references/<paper_id>/text.md` p.1; page image `figures/page_01.png` used where the text layer was garbled or missing.

## Per paper (authors / rows)
| paper_id | authors | rows | notes |
|---|---|---|---|
| icep-iaac64884.2025.11003038 | 7 | 7 | Affiliations print country only (no cities): Intel (MY, printed "ATTD, Intel Technology"), AGC (JP), Shinko (JP). iNEMI locality "Shanghai" taken from printed "iNEMI Shanghai". |
| ectc51846.2026.00117 | 5 | 5 | All ASE, Kaohsiung City. |
| ectc51687.2025.00061 | 13 | 13 | All Intel, Chandler. |
| ectc51687.2025.00178 | 5 | 5 | All Shinko, Nagano. |
| ectc51909.2023.00219 | 6 | 6 | All Sony Semiconductor Solutions; printed locality "Kanagawa" is a prefecture. |
| ectc51906.2022.00181 | 10 | 10 | Single shared block: SPIL, Taichung. |
| ectc51906.2022.00008 | 7 | 7 | Single shared block: TSMC, Hsinchu. |
| ectc51906.2022.00140 | 7 | 7 | Samsung, unit Test & System Package (TSP), Cheonan-si. |
| ectc51529.2024.00151 | 12 | 12 | ASE; authors 1 and 12 Austin (US), rest Kaohsiung. Byline order verified on page image (row-major). |
| ectc51909.2023.00154 | 8 | 8 | Samsung, unit AVP TD Team, Cheonan-si. |
| vlsitechnologyandcir46783.2024.10631441 | 20 | 20 | Text layer font-shifted; byline read from page image. Superscripts: 1 ASM Belgium (Leuven, Kapeldreef 75), 2 ASM Helsinki, 3 KLA Newport UK; unmarked authors assigned to the IMEC block. "K. D'Have" printed with typographic apostrophe; stored as ASCII. |
| ectc51846.2026.00389 | 7 | 7 | Penn State (2), Georgia Tech (1), Ajinomoto Fine-Techno USA Cupertino (3), Ajinomoto Co. Tokyo (1). |
| ectc51687.2025.00284 | 12 | 12 | All TSMC, Hsinchu. |
| ectc51846.2026.00134 | 12 | 12 | Intel, unit Intel Foundry; 2 authors Livingston, UK; one prints "Chandler, AZ". |
| ectc51909.2023.00190 | 7 | 7 | Applied Materials Santa Clara, CA (3); EV Group St. Florian am Inn, Austria (4). |
| icep55381.2022.9795565 | 13 | 13 | Byline absent from text layer; read from page image. Single block: IMEC, Leuven. |
| ectc51909.2023.00053 | 8 | 8 | Deca Tempe, AZ (5); nepes hayyim Laguna, Philippines (3). |
| eptc56328.2022.10013262 | 6 | 6 | OCR text; superscripts verified on page image. Printed "ASE Technology" (Kaohsiung NEPZ address) mapped to Advanced Semiconductor Engineering, Inc.; see issues. |
| ectc51687.2025.00158 | 8 | 8 | ASE; Lihong Cao Austin (US), rest Kaohsiung. |
| ectc51909.2023.00155 | 5 | 10 | Text layer font-shifted; read from page image. Each author prints one block "Consortium JOINT2 (Jisso Open Innovation Network of Tops 2), Resonac Corporation, Kawasaki" -> two rows (JOINT2 primary, Resonac additional). "Kazuyki Mitsukura" as printed (email reads kazuyuki). |
| ectc51529.2024.00164 | 7 | 7 | All TSMC, Hsinchu. |
| ectc51846.2026.00375 | 6 | 6 | All Murata, Kyoto. |
| ectc51687.2025.00012 | 15 | 15 | Intel; Chandler except Matthew Fritz (Hillsboro) and John Oh (Santa Clara). |
| ectc51846.2026.00140 | 9 | 9 | All SCHMID Group, Freudenstadt; names kept with printed "Dr." prefixes. |
| iedm45741.2023.10413829 | 14 | 14 | Single block: IMEC, Leuven. |
| icep58572.2023.10129695 | 5 | 5 | Taiyo Ink, unit Technology development department; no address printed, country JP from .jp email domain (gap: locality). |
| ectc51846.2026.00016 | 11 | 11 | Single block: Institute of Microelectronics, A*STAR, Singapore. |
| ectc51846.2026.00110 | 4 | 4 | All Dai Nippon Printing, Chiba. |
| ectc51909.2023.00179 | 12 | 12 | SK hynix, per-author cities (Ichon-si, Dongtan-si, Seoul-si, Hanam-si, Suwon-si; "Ichon-si" as printed). Ambiguity: 4x3 grid, text layer reads column-major; author_index follows that order (first and last author identical either way). "Song. Na", "Jaehyun. Yeom" as printed. |
| ectc51909.2023.00151 | 6 | 6 | All SK hynix, Icheon-si. |

## Gaps
- No city printed: icep-iaac64884.2025.11003038 (Intel MY, AGC, Shinko rows); icep58572.2023.10129695 (Taiyo Ink, no address at all).
- No present_address or additional affiliations found anywhere except the JOINT2/Resonac pair.

## Organizations created (canonical -> printed variants)
- Intel Corporation <- Intel Corporation; Intel Foundry, Intel Corporation; ATTD, Intel Technology (Malaysia)
- AGC Inc.
- Shinko Electric Industries Co., Ltd. <- Shinko Electric Industries Co. Ltd.; Shinko Electric Industries Co., Ltd
- iNEMI <- iNEMI Shanghai
- Advanced Semiconductor Engineering, Inc. <- Advanced Semiconductor Engineering, INC (ASE); ASE Technology
- Sony Semiconductor Solutions Corporation
- Siliconware Precision Industries Co., Ltd. <- Siliconware Precision Industries Co. Ltd.
- TSMC <- Taiwan Semiconductor Manufacturing Company; Taiwan Semiconductor Manufacturing Company, Ltd.
- Samsung Electronics Co., Ltd. <- Samsung Electronics Co., Ltd; Samsung Electronics Co, Ltd
- imec <- IMEC
- ASM International <- ASM
- KLA Corporation <- KLA Corp
- Pennsylvania State University
- Georgia Institute of Technology
- Ajinomoto Fine-Techno USA Corporation
- Ajinomoto Co., Inc.
- Applied Materials, Inc.
- EV Group
- Deca Technologies Inc.
- nepes hayyim Corporation
- JOINT2 <- Consortium JOINT2 (Jisso Open Innovation Network of Tops 2)
- Resonac Corporation
- Murata Manufacturing Co., Ltd.
- SCHMID Group
- Taiyo Ink Mfg. Co., Ltd. <- Taiyo Ink MFG. Co., Ltd
- A*STAR (parent only)
- A*STAR Institute of Microelectronics <- Institute of Microelectronics, A*STAR (parent A*STAR)
- Dai Nippon Printing Co., Ltd.
- SK hynix Inc.

## Issues for merge
- "ASE Technology" (eptc56328) mapped to Advanced Semiconductor Engineering, Inc.; the coordinator may prefer a separate ASE Technology Holding row.
- "Intel Technology, Malaysia" (Intel's Malaysian entity) mapped to Intel Corporation with country MY.
- ASM printed as "ASM"; canonical ASM International (HQ NL) chosen. Ajinomoto Fine-Techno USA parent not set (relation not printed).
- org_type choices to review: TSMC = foundry; A*STAR = government_lab; iNEMI and JOINT2 = consortium.
