# Batch l25 report (2026-10-21, DevLog-013 lane L25)

Scope: figure-borne values requested by L17 (`config/package3d/RESEARCH_SOTA_COWOS.md` D1/D4, `RESEARCH_SOTA_EMIB.md` E7),
added to three already-distilled papers. The batch holds every existing packaging-table row of the three papers
(unchanged) plus the new rows, merged with `scripts/merge_staging.py data/_staging/l25 --apply --replace`.

| paper | new rows | source |
|---|---|---|
| ectc51909.2023.00091 | TVs c-e (2016/2020/2022 generations), 6 components, 6 metrics, figure f06 | p.1 Fig. 2 (table in figure) |
| ectc51909.2023.00174 | TVs f-i (1.5X/2X/3X/4X points), 8 components, 1 metric, figure f11 | p.1 Fig. 1 |
| ectc51687.2025.00051 | TVs d-j (2017/2018 .. 2027 & Future), 7 components, 7 interconnects, 3 metrics, figure f06 | p.4 Fig. 6 |

- All new TVs: tv_kind `other` (roadmap/generation points, not builds of the paper). papers.n_test_vehicles 2->5,
  5->9, 3->10.
- Projections (00174-i dotted 4X point; 00051-j "2027 & Future"): basis `author_estimate` and notes starting
  "ROADMAP PROJECTION". Schema gap: no field for projected/roadmap values.
- Not entered: 00091 Fig. 3 (fifth-generation CoWoS 3x interposer 58.9 x 44.1 mm, 2 SoC + 1 chiplet + 8 HBM): the
  paper attributes it to ref [5] (schema rule (a)); stays in evidence `excluded`.
- Product names (Sapphire Rapids, Ponte Vecchio, Granite Rapids) are image captions in 00051 Fig. 6; kept in notes
  only (2024 attribution ambiguous).
- Validator: `uv run python scripts/validate_db.py --staging data/_staging/l25` -> 0 errors, 0 warnings.
