# DevLog-003: retrieval rate limit and second batch

Date: 2026-10-18. Follows DevLog-002 (standalone spin-off).

## Request (Wentao, 2026-10-18)

Fetch the next 60 IEEE papers. The 60-per-calendar-day cap is too aggressive; use a rolling limit of
roughly 60 per 2 hours instead.

## Decisions

- Replace the calendar-day cap in `scripts/ieee_fetch.py` with a rolling-window cap: at most 60 saved
  PDFs in any 2-hour window (defaults `CAP = 60`, `CAP_WINDOW_H = 2.0`).
- When the window is saturated, sleep until the oldest saved download ages out, then continue. The
  60-120 s gap between downloads is unchanged, as is the breaker on captcha / access warnings.
- Expose `--cap N` and `--window-hours H` for explicit batches; defaults preserve 60 per 2 hours.
- Keep `--max N` as an attempt limit for a single run.

## State before this batch

- `outputs/cache_list.csv`: 300 selected (279 IEEE-hosted, 21 manual).
- Cached: 60 PDFs, all priority 1, 6 per bucket. 58 of them merged into `data/papers.csv`.
- Remaining: 219 IEEE (101 priority 1, 82 priority 2, 36 priority 3) and 21 manual
  (`data/manual_downloads.md`, inbox empty).

## Session and access

- 2026-10-18 ~22:40: headed probe returned `institute: True`; headless returned HTTP 418 (WAF
  challenge), so runs must use `--headed`. No re-login was needed.
- Run started 2026-10-18 22:43:57 in tmux session `apa-ieee-2`:

  ```sh
  uv run python scripts/ieee_fetch.py --run --headed --max 60 --cap 60 --window-hours 2
  ```

- Log: `logs/ieee_run_20261018T224357.log`.
- First save: `ectc51687.2025.00148` at 22:44:12.

## 2026-10-19 retry, login grace, and resume

- Batch 2 stopped at 35/60 on 2026-10-18 23:43:07: WAF challenge page for `tcpmt.2025.3599484`
  (arnumber 11127098). Breaker `logs/.ieee_blocked.json` was set.
- Retrieval now retries a challenge page and a throttled PDF request twice, 8-10 s apart, before
  setting the breaker (was one 8 s re-read for challenges, no retry for PDF requests).
- `access_status()` tolerates a page that is mid-navigation (SSO redirects) by retrying three times.
  Headed `--run` now waits up to 10 minutes for institutional sign-in in the opened window instead of
  closing immediately; headless still fails fast.
- Breaker cleared and batch resumed 2026-10-19 00:02:20 in tmux `apa-ieee-4`:

  ```sh
  uv run python scripts/ieee_fetch.py --run --headed --max 25 --cap 60 --window-hours 2
  ```

- Log: `logs/ieee_run_20261019T000220.log`. The previously blocked paper saved at 00:02:43 on the
  first attempt; 96 cached at 00:03.
- Batch completed 2026-10-19 00:45:22: 25/25 saved in the resume, 60/60 for batch 2, **120/300 cached**.
  No breaker, no failed downloads. All 120 are priority 1; 120/120 have `text.md`.
- Per bucket: advanced_substrate 10; cpo, glass, organic_rdl_fanout, panel, si_bridge, si_interposer,
  thermal_pdn 12 each; hybrid_bonding, microbump_3d 13 each.
- Remaining: 159 IEEE (41 p1, 82 p2, 36 p3) and 21 manual (180 records total).

## 2026-10-19 09:24 batch 3

- Target: next 60 IEEE papers, 180 cached total.
- Command: `uv run python scripts/ieee_fetch.py --run --headed --max 60 --cap 60 --window-hours 2`.
- Rolling window empty at 09:23 (last save 00:45), so full 60-slot capacity.
- Started 09:24:09 in tmux `apa-ieee-5`; log `logs/ieee_run_20261019T092409.log`. The first access
  probe hit an SSO navigation race; the login-grace loop retried and reported `institute: True` at
  09:24:30. First save: `ectc51687.2025.00085` at 09:24:45.
- Stopped at 37/60 on 10:25:43: `icep-iaac64884.2025.11002987` (priority 1, panel) still returned a
  WAF challenge after both retries (8 s, 9 s), so the breaker fired.
- Restarted 10:27:58 in tmux `apa-ieee-6` after a fresh `--login`, then
  `--run --headed --max 23 --cap 60 --window-hours 2`. Login returned `institute: True`; the previously
  blocked paper saved at 10:28:45. Log: `logs/ieee_run_20261019T102758.log`.
- Batch 3 completed 11:06:08: **180/300 cached**, 60/60 for the batch, no breaker.
  Priority 1 is complete (161/161); 19 priority-2 papers cached.
- Remaining: 99 IEEE (63 p2, 36 p3) and 21 manual (120 records total).

## 2026-10-19 20:11 batch size 30 and batch 4

- Batch size changed from 60 to 30 papers per run (`BATCH_SIZE = 30`, `--max` default). 30 papers at
  ~100 s each is ~50 min, which fits inside one institutional login session; 60-paper runs were
  crossing the session lifetime and ending in WAF challenges.
- The rolling cap is unchanged at 60 per 2 hours; `--cap` and `--window-hours` still override it.
- Batch 4 starts with a fresh `--login`, then `--run --headed` (default 30). Target: 210 cached total;
  all 30 are priority 2 (priority 1 is complete).
- Started 20:11:44 in tmux `apa-ieee-7`; log `logs/ieee_run_20261019T201144.log`. Login returned
  `institute: True`; first save `ectc51529.2024.00265` at 20:12:37.
- Batch 4 completed 21:03:53: **209/300 cached**, 29 saved and 1 `not_pdf` out of 30 attempts; no breaker.
- Failure: `ectc51846.2026.00153` (priority 2, panel) returned HTTP 502 with a 17.5 kB HTML body at
  20:21:57. It stays uncached and will be retried in the next batch.
- Remaining: 70 IEEE (34 p2, 36 p3) and 21 manual (91 records total).
- At 21:04 `data/papers.csv` had 61 rows (concurrent extraction work); this caching run did not merge
  the 209 cached PDFs.

## 2026-10-19 21:18 batch 5

- Target: next 30 IEEE papers (all priority 2), 240 cached total.
- Started 21:18:21 in tmux `apa-ieee-8`; log `logs/ieee_run_20261019T211821.log`. Login returned
  `institute: True`.
- The first save at 21:18:59 was the batch-4 HTTP 502 failure `ectc51846.2026.00153`, now cached
  (210 total). No breaker.
- Batch 5 completed 22:05:47: **239/300 cached**, 30/30 saved, no breaker. Priority 2 is 78/82.
- Remaining: 40 IEEE (4 p2, 36 p3) and 21 manual (61 records total).
- At 22:06 `data/papers.csv` had 94 rows (concurrent extraction work).

## 2026-10-20 00:39 batch 6

- Target: next 30 IEEE papers (4 p2 + 26 p3), 269 cached total.
- Started 00:39:57 in tmux `apa-ieee-10`; log `logs/ieee_run_20261020T003957.log`. Login returned
  `institute: True`; first save `ectc51846.2026.00356` at 00:40:58.
- Remaining before the batch: 40 IEEE (4 p2, 36 p3).
- Batch 6 completed 01:32:34: **269/300 cached**, 30/30 saved, no breaker. All p2 are cached.
- Remaining: 10 IEEE (all p3) and 21 manual. `data/papers.csv` is 239, so 30 cached PDFs await ingestion.

## Progress

- [x] Second batch of 60 PDFs complete (120 cached total)
- [x] Third batch of 60 PDFs complete (180 cached total)
- [x] Batch 4 (30 attempts) complete (209 cached total; one HTTP 502)
- [x] Retry `ectc51846.2026.00153` (HTTP 502) in the next batch (saved 21:18:59)
- [x] Batch 5 (30 attempts) complete (239 cached total)
- [x] Batch 6 (30 attempts) complete (269 cached total)
- [ ] Batch 7 (remaining 10 p3) complete (target: 279 IEEE cached)
- [x] Reconcile `data/papers.csv` with cached PDFs (239 cached, 239 papers in DB)
- [ ] Ingest the 30 PDFs cached by batch 6 (269 cached vs 239 in `data/papers.csv`)
- [ ] Fetch the 21 manual IMAPS/IWLPC PDFs via `scripts/ingest_inbox.py`

## 2026-10-20 09:18 batch 7

- Target: the final 10 IEEE papers (all p3), 279 IEEE cached.
- Started 09:18:10 in tmux `apa-ieee-11`; log `logs/ieee_run_20261020T091810.log`. Login returned
  `institute: True`; first save `eptc67330.2025.11392620` at 09:18:56.
