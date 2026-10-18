# Manual download inbox (git-ignored except this file)

Drop paywalled PDFs here named exactly `<paper_id>.pdf` (the `save_as` names in
`data/manual_downloads.md`), then run:

    uv run python scripts/ingest_inbox.py --dry-run
    uv run python scripts/ingest_inbox.py

The ingest step moves each `<paper_id>.pdf` to `references/<paper_id>/source.pdf`, writes `source.json`
and extracts text/figures. A file that fails the `%PDF` check is left in place and reported.
