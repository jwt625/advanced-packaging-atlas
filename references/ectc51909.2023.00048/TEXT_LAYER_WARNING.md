text layer partly damaged (flagged 2026-10-21, DevLog-013 L16): digit_ratio=0.0293, common_word_ratio=0.131; text.md is the PDF's own text layer (not replaced by tesseract OCR); verify numbers and units against figures/page_NN.png
- Every page (p.1-p.6) holds two copies: a font-shifted copy (each character offset by 29 code points, spaces as control characters) (p.1 starts '$,0 3KRWRQLFV' = 'AIM Photonics') and a readable OCR-like copy with digit/glyph errors.
- OCR-copy errors: um reads '11m' (p.2 '100 11m', p.3 '5-l 0 11m deep', p.4 '-400 11m', p.5 'below 1 11m'); '§' for an approximation sign (p.4 '§0.9 J/m2', '§ 1 .3 J/m2'); misspellings (p.6 'relatrve', 'wavegurde').
- p.3 figure labels also have Calibri glyph-ID garbling (letters as 'Ğ', 'ƌ', 'Ă', 'ƚ').
