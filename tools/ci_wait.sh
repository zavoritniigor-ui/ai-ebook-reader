#!/usr/bin/env bash
# tools/ci_wait.sh <branch|sha>
# Waits for a GitHub Actions workflow run to complete.
# Prints URL and conclusion.
# On failure, prints failed job names and the last ~60 lines of logs.
set -euo pipefail

TARGET="${1:-$(git rev-parse HEAD)}"

echo "Finding GitHub Actions run for target: $TARGET"
RUN_JSON=""
for attempt in $(seq 1 12); do
    if [[ "$TARGET" =~ ^[0-9a-f]{7,40}$ ]]; then
        RUN_JSON=$(gh run list --commit "$TARGET" --limit 1 --json databaseId,url,status,conclusion,headSha 2>/dev/null || true)
    else
        RUN_JSON=$(gh run list --branch "$TARGET" --limit 1 --json databaseId,url,status,conclusion,headSha 2>/dev/null || true)
    fi
    RUN_ID=$(echo "$RUN_JSON" | grep -o '"databaseId":[0-9]*' | head -n1 | cut -d: -f2 || true)
    if [[ -n "$RUN_ID" && "$RUN_ID" != "0" ]]; then
        break
    fi
    sleep 5
done

if [[ -z "${RUN_ID:-}" ]]; then
    echo "ERROR: No GitHub Actions run found for $TARGET" >&2
    exit 1
fi

URL=$(echo "$RUN_JSON" | grep -o '"url":"[^"]*"' | head -n1 | cut -d'"' -f4 || true)
echo "Monitoring run: $URL (ID: $RUN_ID)"

while true; do
    INFO=$(gh run view "$RUN_ID" --json status,conclusion,url 2>/dev/null || true)
    STATUS=$(echo "$INFO" | grep -o '"status":"[^"]*"' | head -n1 | cut -d'"' -f4 || true)
    CONCLUSION=$(echo "$INFO" | grep -o '"conclusion":"[^"]*"' | head -n1 | cut -d'"' -f4 || true)

    if [[ "$STATUS" == "completed" ]]; then
        echo "Run URL: $URL"
        echo "Conclusion: $CONCLUSION"
        if [[ "$CONCLUSION" == "success" ]]; then
            exit 0
        else
            echo "FAILED JOBS:"
            JOBS_JSON=$(gh run view "$RUN_ID" --json jobs 2>/dev/null || true)
            # Find failed jobs and print their names and log tails
            python3 - "$JOBS_JSON" << 'EOF'
import sys, json, subprocess
if len(sys.argv) < 2 or not sys.argv[1]:
    sys.exit(0)
try:
    data = json.loads(sys.argv[1])
except Exception:
    sys.exit(0)
for job in data.get("jobs", []):
    if job.get("conclusion") == "failure":
        jname = job.get("name")
        jid = job.get("databaseId")
        print(f"\n--- FAILED JOB: {jname} (ID: {jid}) ---")
        if jid:
            try:
                proc = subprocess.run(["gh", "run", "view", "--job", str(jid), "--log-failed"], capture_output=True, text=True, timeout=30)
                out = proc.stdout.strip()
                if not out:
                    repo_path = job.get("url", "/").split("/repos/")[-1].split("/actions")[0]
                    proc = subprocess.run(["gh", "api", f"repos/{repo_path}/actions/jobs/{jid}/logs"], capture_output=True, text=True, timeout=30)
                    out = proc.stdout.strip()
                lines = out.splitlines()
                tail = "\n".join(lines[-60:]) if len(lines) > 60 else "\n".join(lines)
                print(tail)
            except Exception as e:
                print(f"Could not retrieve logs for job {jid}: {e}")
EOF
            exit 1
        fi
    fi
    sleep 15
done
