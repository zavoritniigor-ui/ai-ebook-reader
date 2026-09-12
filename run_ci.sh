set -euo pipefail

# Check syntax
for js_file in js/*.js; do node --check "$js_file"; done
node --check sw.js
node --check archive-guard.worker.js

# Start server
python3 -m http.server 8765 --bind 127.0.0.1 > http_server.log 2>&1 &
SERVER_PID=$!

mkdir -p /tmp/pdf-ux-test-profile
google-chrome --headless --remote-debugging-port=9222 --user-data-dir=/tmp/pdf-ux-test-profile about:blank > chrome.log 2>&1 &
CHROME_PID=$!

trap "kill $SERVER_PID $CHROME_PID 2>/dev/null || true" EXIT

timeout 10 bash -c 'until curl -s http://127.0.0.1:8765 > /dev/null; do sleep 0.5; done'
timeout 15 bash -c 'until curl -s http://127.0.0.1:9222/json > /dev/null; do sleep 0.5; done'

for test_script in tests/*_browser.py; do
    echo "Running $test_script..."
    if ! python3 -u "$test_script"; then
        echo "TEST FAILED: $test_script"
        exit 1
    fi
done

echo "ALL TESTS PASSED!"
