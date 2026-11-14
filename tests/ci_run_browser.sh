#!/usr/bin/env bash
# One CI shard of the browser regression suites: starts the static server and headless Chrome, then runs the suites
# that tests/ci_browser_shard.py gives this shard, timing each («SUITE <file> <seconds>s», the input of
# tests/ci_suite_seconds.json). Moved out of .github/workflows/ci.yml unchanged (2026-11-14), so CI stays readable.
#   bash tests/ci_run_browser.sh <shard> <total>      # CI
#   bash tests/ci_run_browser.sh 1 1                  # every suite, locally (needs google-chrome)
shard="${1:?shard}"; total="${2:?total}"
set -euo pipefail
# Keep failures visible through the checks API when signed Actions
# log downloads are unavailable. Preserve the failing exit status.
browser_ci_log="${RUNNER_TEMP:-/tmp}/reader-browser-tests.log"
report_browser_failure() {
  local failed_status="$1" failed_command="$2"
  trap - ERR
  python3 - "$browser_ci_log" "$failed_command" <<'PYCI' || true
import pathlib, sys
path = pathlib.Path(sys.argv[1])
tail = '\n'.join(path.read_text(errors='replace').splitlines()[-55:]) if path.exists() else 'No captured output'
message = 'Failed command: ' + sys.argv[2] + '\n' + tail[-3000:]
message = message.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A')
print('::error title=Browser suite failure::' + message, flush=True)
PYCI
  exit "$failed_status"
}
trap 'report_browser_failure "$?" "$BASH_COMMAND"' ERR
exec > >(tee "$browser_ci_log") 2>&1


# 1. Start HTTP Server
echo "Starting HTTP Server..."
python3 -m http.server 8765 --bind 127.0.0.1 > http_server.log 2>&1 &
SERVER_PID=$!

# 2. Start Headless Chrome
echo "Finding Chrome binary..."
if command -v google-chrome >/dev/null 2>&1; then
    CHROME_BIN="google-chrome"
elif command -v google-chrome-stable >/dev/null 2>&1; then
    CHROME_BIN="google-chrome-stable"
else
    echo "Error: Google Chrome not found."
    exit 1
fi

echo "Runner CPU: $(lscpu | sed -n 's/^Model name: *//p') / $(nproc) cores"
echo "Starting Headless Chrome ($CHROME_BIN)..."
# The runner pipes kernel core dumps to systemd-coredump; a crashed renderer then sat in the kernel's
# core-dump write indefinitely (kernel stack: vfs_coredump -> anon_pipe_write), so Chrome never
# reported the crash and the suite hung. No core dumps: a renderer crash surfaces immediately.
sudo -n sysctl -q -w kernel.core_pattern=core || true
ulimit -c 0
mkdir -p /tmp/pdf-ux-test-profile
$CHROME_BIN --headless --enable-logging=stderr --v=0 --remote-debugging-port=9222 --user-data-dir=/tmp/pdf-ux-test-profile about:blank > chrome.log 2>&1 &
CHROME_PID=$!

# Ensure cleanup of background processes when this step exits (success or failure)
# On failure, surface Chrome's own log (renderer crash / GPU hang reasons never reach the CDP client)
trap "status=\$?; if [ \$status -ne 0 ]; then echo '--- chrome.log (tail) ---'; grep -E 'FATAL|Check failed|NOTREACHED|DUMP_WITHOUT|:ERROR:' chrome.log | grep -v 'dbus\|gcm\|UPower' | tail -n 40; tail -n 30 chrome.log || true; bash tests/ci_chrome_stall_dump.sh || true; fi; echo 'Stopping background services...'; kill $SERVER_PID $CHROME_PID 2>/dev/null || true" EXIT

# 3. Wait for services
echo "Waiting for HTTP server (PID $SERVER_PID) to respond on port 8765..."
timeout 10 bash -c 'until curl -s http://127.0.0.1:8765 > /dev/null; do sleep 0.5; done'
echo "HTTP server is running."

echo "Waiting for Chrome CDP (PID $CHROME_PID) on port 9222..."
# A cold headless Chrome on a busy runner can need well over 15s to open its DevTools port.
timeout 45 bash -c 'until curl -s http://127.0.0.1:9222/json > /dev/null; do sleep 0.5; done'
echo "Chrome CDP is ready."

# 4. Run this shard's suites
mapfile -t suites < <(python3 tests/ci_browser_shard.py "$shard" "$total")
echo "Shard $shard of $total: ${#suites[@]} suites"
for suite in "${suites[@]}"; do
  echo "Running $suite..."
  started=$SECONDS
  python3 -u "$suite"
  echo "SUITE $suite $((SECONDS - started))s"
done
echo "All tests of shard $shard passed successfully!"
