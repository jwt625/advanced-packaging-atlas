# Batch g000 affiliation report (2026-10-19)

Validator: `uv run python scripts/validate_db.py --staging data/_staging/g000` -> 0 errors, 0 warnings.
Totals: 30 papers, 236 authors, 243 author_affiliations rows, 22 organizations rows.
Sources: references/<paper_id>/text.md page 1; page_01.png crops checked for every author-grid layout and for the three
OCR-text papers (ectc51906.2022.00244, ectc51906.2022.00106, ectc32696.2021.00166). No footnotes or biographies apply
(all conference papers).

## Per paper (authors / rows; gaps and ambiguities)

| paper_id | authors | rows | notes |
|---|---|---|---|
| ectc51906.2022.00142 | 5 | 5 | Chikusei, Ibaraki prints no country (JP from city). |
| ectc51906.2022.00072 | 20 | 20 | 3-column author grid; byline order = text-layer (column-major) order. 18 GlobalFoundries (Malta / Hopewell Junction / Burlington / Santa Clara), 2 IBM Bromont, Canada. |
| ectc51906.2022.00180 | 4 | 6 | Marker scheme: PRC line unmarked (shared), schools by marker. Swaminathan and Tummala carry two school markers -> 2 rows each. |
| ectc.2019.00095 | 4 | 4 | Single shared block (TSMC R&D, Hsinchu). |
| iedm19573.2019.8993637 | 26 | 26 | Unmarked authors -> Logic Technology Development (Hillsboro OR); superscripts 1/2/3 mapped. No country printed (US from city). |
| itherm45881.2020.9190542 | 7 | 7 | Shared block. |
| ectc.2019.00-29 | 5 | 5 | Shared block. |
| ectc.2016.201 | 11 | 11 | Shared block. |
| ectc.2011.5898527 | 4 | 4 | San Jose CA, no country printed (US from city). |
| ectc51906.2022.00244 | 5 | 5 | OCR text layer; verified on page render. Printed "Imec, vzw". |
| ectc51909.2023.00009 | 12 | 12 | 4-column grid; rows 2-3 order taken from text layer (column-major) -> authors 5-12 order ambiguous. Printed "CEA-Leti, Univ Grenoble Alpes" kept as one row (org CEA-Leti), UGA not split out. |
| ectc51909.2023.00298 | 4 | 5 | Swaminathan 1,2 -> GT + Penn State. Printed typos "Packaing", "Intitute" kept in unit/note. |
| ectc51909.2023.00150 | 8 | 8 | Watson block prints "Yorktown Heights / Albany, NY" (two cities, kept as printed). IBM Research - Tokyo prints only "Japan" (locality empty). IBM Systems prints only "NY, U.S.A." (locality empty). |
| iwlpc52010.2020.9375887 | 4 | 8 | AMBIGUOUS: one shared block "Nepes / San Diego, CA, USA, Binan, Laguna, Philippines"; per-author site not stated, so each author got both sites (primary San Diego US, additional Binan PH). |
| ectc51906.2022.00106 | 8 | 8 | OCR text layer; verified on page render, row-major grid. Turcotte printed "IBM Sysytems" (sic). |
| ectc32696.2021.00166 | 6 | 6 | OCR text layer missed the order and Pasdast's block; order and blocks taken from page render (row-major). Pasdast printed "Intel Coporation" (sic). No country printed (US from city). |
| iedm19573.2019.8993659 | 3 | 3 | Superscripts 1/2 mapped. |
| ectc32696.2021.00125 | 11 | 11 | Shared block. |
| ectc.2013.6575597 | 7 | 7 | Shared block. |
| ectc51906.2022.00303 | 6 | 6 | Shared block. |
| ectc51909.2023.00235 | 6 | 6 | Two blocks, layout ties author 1 to IBM Research and authors 2-6 to IBM Systems. |
| ectc51909.2023.00108 | 12 | 12 | GAP: no address or country printed anywhere (only "TSMC" + email). country TW set from org HQ, locality empty. 4-column grid, order from text layer (column-major). |
| ectc51529.2024.00093 | 4 | 4 | Printed "DNP Co., Ltd." mapped to org Dai Nippon Printing. |
| ectc51909.2023.00333 | 6 | 6 | Per-author blocks. |
| ectc51529.2024.00227 | 17 | 17 | All authors superscript 1 (imec Leuven). |
| ectc51529.2024.00092 | 5 | 5 | Per-author blocks. |
| ectc51906.2022.00176 | 6 | 6 | Shared block. |
| iwlpc52010.2020.9375855 | 2 | 2 | Shared block. |
| ectc32696.2021.00033 | 6 | 6 | Shared block (TSMC R&D). |
| ectc51529.2024.00088 | 12 | 12 | 4-column grid, text-layer order (row-major); 3 authors in Singapore. |

## Organizations created (printed variants)

- Showa Denko Materials (company, JP) - Showa Denko Materials Co., Ltd.
- GlobalFoundries (foundry, US) - Globalfoundries Inc.
- IBM (company, US) - IBM; IBM T. J. Watson Research Center; IBM Research - Tokyo; IBM Research - Albany; IBM Research; IBM Systems; IBM Sysytems (sic). Divisions kept in `unit`.
- Georgia Institute of Technology (university, US) - also "Georgia Intitute of Technology" (sic)
- Taiwan Semiconductor Manufacturing Company (foundry, TW) - Taiwan Semiconductor Manufacturing Company Ltd. / , Ltd.; TSMC
- Intel Corporation (company, US) - Intel Corp.; Intel Coporation (sic)
- MediaTek (company, TW) - MediaTek Inc.
- Agency for Science, Technology and Research (government_lab, SG) - parent of IME
- Institute of Microelectronics, A*STAR (research_institute, SG; parent A*STAR)
- Xilinx (company, US) - Xilinx, Inc.
- imec (research_institute, BE) - imec; Imec, vzw
- CEA (government_lab, FR) - parent of CEA-Leti, not printed separately
- CEA-Leti (research_institute, FR; parent CEA) - CEA-Leti, Univ Grenoble Alpes
- Pennsylvania State University (university, US)
- Nepes (company, KR) - Nepes
- University of California, Los Angeles (university, US) - UCLA
- Dai Nippon Printing (company, JP) - DNP Co., Ltd.
- Corning Incorporated (company, US)
- Absolics (company, US) - Absolics Inc.
- Yield Engineering Systems (company, US)
- Samsung Electronics (company, KR) - Samsung Electronics Co. Ltd
- Applied Materials (company, US) - Applied Materials, Inc.

## Merge questions for the coordinator

- org_type for TSMC / GlobalFoundries set to `foundry`; Samsung Electronics set to `company` (it is also a foundry).
- Org HQ countries (organizations.country) are org-level facts, not printed in the papers.
- CEA-Leti / Univ Grenoble Alpes: kept as one affiliation; split if the merge policy treats UGA as a co-affiliation.
- Nepes double-site assignment (iwlpc52010.2020.9375887) and TSMC country without printed address (ectc51909.2023.00108).
