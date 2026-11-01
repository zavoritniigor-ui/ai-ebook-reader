Tesseract.js 7.0.0 (Apache-2.0, LICENSE.md) and tesseract.js-core 7.0.0 (Apache-2.0, LICENSE-core), from npm.
Only the LSTM cores are kept (SIMD and non-SIMD); js/scanner.js picks one by its own SIMD check and passes the full
path, so the worker never asks for the other variants. Language data: @tesseract.js-data/<lang> 4.0.0_best_int
(lang/<code>.traineddata.gz). SHA-256 of every file: SHA256SUMS. Loaded only when the scanner recognises text.
