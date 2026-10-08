# Captured live-model responses (replayed by `tests/ai_contract_browser.py`, section 8)

Every `*.json` file here is run through the real parse -> validate pipeline on each CI run. Use it to turn a response that failed in a
real session into a permanent regression test.

## How to capture one (about 30 seconds)
1. Open the app with `?aiDebug=1` in the URL (or run `localStorage.reader_ai_debug = '1'` once).
2. Reproduce the failure. The Grammar error banner now shows **AI diagnostics (developer)** with the exact `reason`, provider, model,
   token budget, finish reason, counts by rejection reason and — in this mode only — the full raw reply and the analysed text.
   Prompts and API keys are never included.
3. Press **Copy** and save the JSON entry as `tests/live_responses/<short-name>.json` in this shape (the diagnostics entry has these
   fields under `capture`):

```json
{
  "task": "grammar_analysis",
  "provider": "openai",
  "model": "…",
  "sourceLanguage": "fr",
  "text": "the analysed text (capture.text)",
  "raw": "the exact raw reply (capture.raw)",
  "expect": { "ok": true, "minItems": 1 }
}
```
For Practice use `"task": "practice_reading"`, `"mode": "verbs"|"adjectives"` and no `text`.

`expect.ok` is what the CORRECTED code must do with it (`true` = the reply must be accepted with at least `minItems`; `false` = a genuinely
invalid reply that must stay rejected).
