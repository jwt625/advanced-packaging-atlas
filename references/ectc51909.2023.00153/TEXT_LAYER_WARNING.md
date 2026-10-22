text layer partly damaged (flagged 2026-10-21, DevLog-013 L16): digit_ratio=0.0264, common_word_ratio=0.194; text.md is the PDF's own text layer (not replaced by tesseract OCR); verify numbers and units against figures/page_NN.png
- Roman table numerals garbled: Table I/II/III/IV print as 'ᶙ'/'ᶚ'/'ᶛ'/'ᶜ' (p.1 text 'Table ᶙshows'; p.2 captions of Tables I-II; p.3 captions of Tables III-IV); the in-text 'table Ⅳ' (p.3) uses a Roman-numeral code point.
- Table bodies I-IV (p.2, p.3) are not in the text layer (captions only); read them from figures/page_02.png and page_03.png.
- p.4: figure scale labels '10 μm' carry a stray '㻌'; no content lost.
