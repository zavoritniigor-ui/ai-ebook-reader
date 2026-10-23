# Syntax & Localization Quote Safety

Reference documentation moved from root `AGENTS.md`.

## 1. Mandatory Local Syntax Gate
Before EVERY push, run:
```bash
for f in js/*.js; do
  echo "Checking $f"
  node --check "$f" || exit 1
done
node --check sw.js
node --check archive-guard.worker.js
```
If ANY syntax error exists: DO NOT PUSH. DO NOT START CI. Fix all syntax errors locally first.

## 2. Localization & Quote Safety
Never perform blind global quote replacements. Be especially careful with apostrophes in French and other languages:
- Unsafe: `fr: 'Demander à l'IA'`
- Safe: `fr: "Demander à l'IA"` or `fr: 'Demander à l\'IA'`

After ANY edit to localization or `js/core.js`, immediately run:
```bash
node --check js/core.js
```
Do not push until it passes. Check for mismatched quote delimiters such as `"some text'` or `'some text"`.
