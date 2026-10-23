#!/usr/bin/env python3
"""tools/run_tests.py <tests...>

Runs specified Python test suites, printing exactly one PASS/FAIL line per test.
On failure, prints the last ~40 lines of the failing test's output.
Exits 0 if all tests pass, 1 if any fails.
If browser tests are requested and local server/Chrome are not running,
it automatically spins up an ephemeral server and headless Chrome.
"""

import os
import sys
import time
import urllib.request
import subprocess
import tempfile
import shutil

def is_service_ready(url, timeout=1.0):
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 204)
    except Exception:
        return False

def ensure_browser_environment():
    server_url = "http://127.0.0.1:8765/"
    cdp_url = "http://127.0.0.1:9222/json"

    srv_proc = None
    chr_proc = None
    chr_dir = None

    if not is_service_ready(server_url, 0.5):
        srv_proc = subprocess.Popen(
            [sys.executable, "-m", "http.server", "8765", "--bind", "127.0.0.1"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    if not is_service_ready(cdp_url, 0.5):
        chr_dir = tempfile.mkdtemp(prefix="agy_test_chr_")
        chrome_bin = shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chromium-browser") or "google-chrome"
        chr_proc = subprocess.Popen(
            [
                chrome_bin,
                "--headless",
                "--no-sandbox",
                "--disable-gpu",
                "--remote-debugging-port=9222",
                f"--user-data-dir={chr_dir}",
                "about:blank",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    # Wait up to 5 seconds for both to become ready
    t0 = time.time()
    while time.time() - t0 < 5.0:
        if is_service_ready(server_url, 0.2) and is_service_ready(cdp_url, 0.2):
            break
        time.sleep(0.2)

    def cleanup():
        if srv_proc:
            try:
                srv_proc.terminate()
                srv_proc.wait(timeout=2)
            except Exception:
                pass
        if chr_proc:
            try:
                chr_proc.terminate()
                chr_proc.wait(timeout=2)
            except Exception:
                pass
        if chr_dir and os.path.isdir(chr_dir):
            shutil.rmtree(chr_dir, ignore_errors=True)

    return cleanup

def main():
    test_files = sys.argv[1:]
    if not test_files:
        print("Usage: python3 tools/run_tests.py <test1.py> [test2.py ...]")
        sys.exit(1)

    needs_browser = any(
        "browser" in t or "cdp" in t or "practice" in t or "pdf" in t or "learning" in t or "grammar" in t
        for t in test_files
    )

    cleanup_fn = None
    if needs_browser:
        cleanup_fn = ensure_browser_environment()

    overall_ok = True
    try:
        for t in test_files:
            if not os.path.exists(t):
                print(f"FAIL {t} (file not found)")
                overall_ok = False
                continue

            proc = subprocess.run(
                [sys.executable, t],
                capture_output=True,
                text=True,
            )

            if proc.returncode == 0:
                print(f"PASS {t}")
            else:
                overall_ok = False
                print(f"FAIL {t} (exit code {proc.returncode})")
                combined_output = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
                lines = combined_output.strip().splitlines()
                tail_count = 40
                tail = "\n".join(lines[-tail_count:]) if len(lines) > tail_count else "\n".join(lines)
                print(f"--- Last {tail_count} lines of output for {t} ---")
                print(tail)
                print("--- End of error output ---")
    finally:
        if cleanup_fn:
            cleanup_fn()

    sys.exit(0 if overall_ok else 1)

if __name__ == "__main__":
    main()
