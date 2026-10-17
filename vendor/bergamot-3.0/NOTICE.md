# Bergamot translation engine (offline translator)

The engine that translates on the device when there is no internet (`js/offline-translate.js`). Mozilla Public License 2.0 (`LICENSE` in this folder).

| File | What it is | Source |
| --- | --- | --- |
| `bergamot-translator.js` | Emscripten glue, bergamot-translator v0.6.0+1de4a085d, unmodified | https://github.com/mozilla/gecko-dev/tree/c7818d570e8e3a5d326483f62276b7b2494b72ed/toolkit/components/translations/bergamot-translator |
| `bergamot-translator.wasm` | The engine (Marian NMT compiled to WebAssembly), version 3.0, unmodified | Mozilla Remote Settings, collection `translations-wasm` (the same binary Firefox downloads); source: https://github.com/browsermt/bergamot-translator and https://github.com/mozilla/translations |

Both files are byte-for-byte copies; `tools/offline_models_catalog.py --engine` re-downloads them and checks the wasm against Mozilla's record (SHA-256 `a3a89d9ad0a4ed8f27bf3e403701b23f5709816f6376438503f2fa5b0182c2dc`).

The language models are NOT in this repository. The app downloads them on the reader's request from Mozilla's public translation-model storage (https://github.com/mozilla/firefox-translations-models, now https://github.com/mozilla/translations; MPL-2.0), through the site's own `/api/offline-model`, and verifies the SHA-256 pinned in `js/offline-catalog.js`.
