# Local source cache

Tracked here: `source.json` (url, doi, arnumber, sha256, bytes, pages, access, text-quality flags) and the
per-source `TEXT_LAYER_WARNING.md` flag. Cached `source.pdf`, extracted `text.md` and `figures/` are
git-ignored: the PDFs carry an institutional licensed-download stamp and the extracted text/figures have
source-specific rights. Recreate them locally with `scripts/ieee_fetch.py` (download) and
`scripts/extract_source.py` (page renders + page-delimited text).

Layout per source:

    references/<paper_id>/
      source.pdf                     raw download (local-only, institutional stamp)
      source.json                    url, doi, arnumber, sha256, bytes, pages, access, text-quality flags
      text.md                        extracted text, page-delimited ("<!-- page N -->"), metadata header
      figures/page_NN.png            150 dpi render of every page
      figures/page_NN_220dpi.png     220 dpi render + tesseract OCR fallback (garbled text layers only)
      figures/img_pNN_k.png          embedded raster images (>= 150 px)
      figures/figures.json           page/caption index
      TEXT_LAYER_WARNING.md          present when the PDF text layer was garbled and text.md is OCR

Paywalled non-IEEE sources (IMAPS/Allen Press, SMTA/IWLPC) are requested manually; see
`data/manual_downloads.md` and drop them in the git-ignored `_inbox/`.
