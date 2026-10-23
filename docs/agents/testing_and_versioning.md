# Testing & App-Shell Versioning Gates

Reference documentation moved from root `AGENTS.md`.

## 1. Focused Test Gate
After syntax passes, run the smallest test that proves the change using:
```bash
python3 tools/run_tests.py <focused_test.py>
```
Do not push a fix that has not passed its focused local test.

## 2. Regression Gate
After focused tests pass, run all directly related regression tests. For Practice / Reader work, include when applicable:
```bash
python3 tools/run_tests.py tests/practice_browser.py tests/learning_ux_browser.py tests/ai_providers_browser.py tests/migration_audit_browser.py tests/app_shell_versions.py tests/ci_suite_coverage.py
```
Do not weaken valid tests merely to obtain green CI. Behavioral requirements must be tested behaviorally.

## 3. App-Shell Versioning Gate
If production JS, `index.html`, service worker app-shell content, or versioned assets change:
```bash
python3 tools/version_app_shell.py
python3 tests/app_shell_versions.py
```
After generation, rerun syntax checks because generated files may have changed.
