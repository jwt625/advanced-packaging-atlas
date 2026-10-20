# Batch g004: author affiliations (2026-10-19)

30 papers, 259 author_affiliations rows, 39 organizations rows (37 used + 2 parent-only rows).
Validator: `uv run python scripts/validate_db.py --staging data/_staging/g004` -> 0 errors, 0 warnings.

## Method
- Bylines read from `references/<paper_id>/text.md` page 1; author order and block-to-author mapping checked
  against page-1 text block coordinates (pymupdf) for every multi-column author grid, and against page-1 crops
  for grids where the text layer order differs from the visual order, for OCR pages (EPTC 2023), and for the IEDM
  superscript byline.
- Author grids: author_index follows row-major reading order (left to right, then next row). The text layer reads
  column-major for ectc51529.2024.00334 and ectc51846.2026.00156, so those two have different orders than the text
  layer (both noted in the rows). All other grids read the same either way in the text layer.
- TCPMT paper: affiliations from the p.1 footnote; the text has no author biographies.
- Prefecture- or state-only localities kept as printed and noted ("printed locality is a prefecture/state").

## Per paper
| paper_id | authors | rows | notes |
|---|---|---|---|
| ectc51687.2025.00028 | 6 | 6 | Samsung S.LSI Business, Hwaseong-si |
| icep61562.2024.10535612 | 4 | 4 | USHIO, Gotenba (printed "USHIO.Inc") |
| ectc51529.2024.00023 | 6 | 6 | Corning, NY; Corning Research & Development Corporation kept as unit of Corning Incorporated (earlier-batch convention) |
| eptc59621.2023.10457918 | 5 | 5 | LightSpeed Photonics, Singapore; OCR text checked on page image |
| ectc51529.2024.00128 | 18 | 18 | Intel; Hillsboro / Chandler / Santa Clara per author |
| ectc51529.2024.00064 | 10 | 10 | Samsung Advanced Package Business Team, Chonan-Si |
| ectc51687.2025.00085 | 12 | 12 | TSMC Hsinchu, one shared block |
| eptc59621.2023.10457652 | 2 | 2 | STMicroelectronics Singapore |
| ectc51846.2026.00051 | 12 | 12 | Intel APTM, Chandler |
| ectc51846.2026.00176 | 5 | 5 | Lightmatter (Arizona x2, Boston), PHIX Enschede, Amkor (Arizona). "Arizona" is a state, no city printed |
| ectc51846.2026.00092 | 14 | 14 | TSMC Hsinchu |
| ectc51529.2024.00133 | 9 | 9 | UTokyo (Chiba x3, Tokyo), Ajinomoto Fine-Techno (Kanagawa), Spectronix (Osaka), Mitsubishi Electric (Hyogo). Text layer drops authors 5-9 before the abstract; read from page image. "Hroharu Tamaru" as printed (references spell Hiroharu) |
| ectc51529.2024.00229 | 6 | 6 | AIST Tsukuba |
| ectc51529.2024.00396 | 6 | 6 | A*STAR IME Singapore |
| ectc51529.2024.00334 | 12 | 12 | AMAT (Albany / Santa Clara), EV Group (St. Florian am Inn, AT). Row-major order from page image; text layer is column-major. AMBIGUOUS order for authors 2-12 if the true byline is column-major |
| ectc51529.2024.00322 | 6 | 11 | Five authors print "Consortium JOINT2 ..., Resonac Corporation" -> two rows each (JOINT2 primary, Resonac additional, earlier-batch convention); Shan Ho Tsai prints Resonac only |
| ectc51529.2024.00096 | 12 | 12 | AMAT: Cambridge MA, Santa Clara, Albany, Taichung City (TW), Singapore |
| icep58572.2023.10129684 | 5 | 5 | ASE Kaohsiung |
| ectc51529.2024.00013 | 4 | 4 | AOI Electronics (Kagawa), Tokyo Institute of Technology (Kanagawa) |
| tcpmt.2021.3123384 | 8 | 8 | p.1 footnote: 5 Fraunhofer IZM (Wafer Level System Integration, Berlin), Ngo at "University of Applied Science Berlin" (exact institution not named in print; kept as printed), 2 TU Berlin. No biographies in the text |
| ectc51846.2026.00336 | 14 | 14 | imec Leuven x13, ASM Belgium x1 (org ASM International, earlier-batch convention) |
| ectc51687.2025.00014 | 12 | 12 | SEI (Kanagawa) x9, FICT (Nagano) x2, Institute of Science Tokyo (Kanagawa) x1 |
| ectc51687.2025.00378 | 2 | 2 | Georgia Tech ECE, Atlanta, GA; no country printed (US from city) |
| ectc51529.2024.00218 | 6 | 6 | Sony Semiconductor Solutions, Kanagawa |
| ectc51529.2024.00094 | 5 | 5 | Samsung Advanced Package Laboratory, Hwaseong-si |
| eptc59621.2023.10457909 | 7 | 7 | Printed "ASE Technology", Kaohsiung City; mapped to org Advanced Semiconductor Engineering, Inc. |
| ectc51529.2024.00051 | 16 | 16 | IBM: Research Tokyo (Kawasaki) x6, Infrastructure Bromont x5, Yorktown Heights x1, Research Albany x3, Infrastructure East Fishkill x1 |
| ectc51906.2022.00332 | 6 | 6 | UCLA CHIPS / ECE, Los Angeles, CA; no country printed (US from city) |
| ectc51846.2026.00156 | 12 | 12 | Microsoft (Mountain View, Hillsboro, Redmond, Calgary CA, Nantes FR) x8, Corintis Lausanne x4. Row-major order from page image; text layer is column-major. Printed emails of Dogruoz and Majety are swapped; cities kept as printed under each name |
| iedm50572.2025.11353491 | 12 | 12 | IBM superscripts 1-4: Research Tokyo (Kawasaki), Infrastructure Bromont (Quebec), Research Albany (NY), Research Watson Research Center ("NY, USA", no city printed) |

## Gaps and ambiguities
- Byline order (row-major vs column-major) for ectc51529.2024.00334 and ectc51846.2026.00156; first author is the same either way.
- No city printed: Lightmatter/Amkor "Arizona, USA" (3 rows), IBM Watson "NY, USA" (2 rows); state written in locality with a note.
- Prefecture-level localities (Kanagawa, Kagawa, Hyogo, Chiba, Nagano) as printed.
- University of Applied Science Berlin: printed name does not identify the specific university.
- Tokyo Institute of Technology (2024) and Institute of Science Tokyo (2025) kept as separate orgs as printed; same author (Yoichiro Kurita). Coordinator may merge.

## Organizations created (org_name: printed variants)
- Samsung Electronics: Samsung Electronics Co. Ltd.; Samsung Electronics Co., Ltd.
- USHIO Inc.: USHIO.Inc
- Corning Incorporated: Corning Research & Development Corporation (as unit)
- LightSpeed Photonics Private Limited: LightSpeed Photonics Private Limited.
- Intel Corporation: Intel Corporation
- Taiwan Semiconductor Manufacturing Company: Taiwan Semiconductor Manufacturing Company; Taiwan Semiconductor Manufacturing Company, Ltd.
- STMicroelectronics: STMicroelectronics
- Lightmatter: Lightmatter
- PHIX Photonics Assembly: PHIX Photonics Assembly
- Amkor Technology: AMKOR
- The University of Tokyo: The University of Tokyo
- Ajinomoto Fine-Techno Co., Inc.: Ajinomoto Fine-Techno Co. Inc.
- Spectronix Co.: Spectronix Co.
- Mitsubishi Electric Corporation: Mitsubishi Electric Co.
- National Institute of Advanced Industrial Science and Technology: ... (AIST)
- A*STAR (parent only) and A*STAR Institute of Microelectronics: Institute of Microelectronics (IME), Agency for Science, Technology and Research (A*STAR)
- Applied Materials: Applied Materials
- EV Group: EV Group
- JOINT2: Consortium JOINT2 (Jisso Open Innovation Network of Tops 2)
- Resonac Corporation: Resonac Corporation
- Advanced Semiconductor Engineering, Inc.: Advanced Semiconductor Engineering, Inc.; ASE Technology
- AOI Electronics: AOI Electronics
- Tokyo Institute of Technology: Tokyo Institute of Technology
- Institute of Science Tokyo: Institute of Science Tokyo
- Fraunhofer-Gesellschaft (parent only) and Fraunhofer Institute for Reliability and Microintegration IZM: Fraunhofer-Institut fur Zuverlassigkeit und Mikrointegration (IZM)
- University of Applied Science Berlin: University of Applied Science Berlin
- Technische Universität Berlin: Technische Universität Berlin
- imec: imec
- ASM International: ASM Belgium
- Sumitomo Electric Industries, Ltd.: Sumitomo Electric Industries, Ltd.
- FICT LIMITED: FICT LIMITED
- Georgia Institute of Technology: Georgia Institute of Technology
- Sony Semiconductor Solutions Corporation: Sony Semiconductor Solutions Corporation
- IBM: units IBM Research – Tokyo / – Albany / – Yorktown Heights / – Watson Research Center; IBM Infrastructure
- University of California, Los Angeles: University of California, Los Angeles (UCLA)
- Microsoft Corporation: Microsoft
- Corintis SA: Corintis SA

Organization HQ country and region are general knowledge, not printed in the papers (for example STMicroelectronics CH,
ASM International NL, LightSpeed Photonics SG taken from its printed address).
