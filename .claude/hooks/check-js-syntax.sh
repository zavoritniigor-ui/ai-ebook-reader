#!/usr/bin/env bash
# Claude Code PostToolUse hook (Edit|Write): syntax-check the app-shell JS file that was just edited.
# Silent and exit 0 for any other file or on success; exit 2 with the node error on stderr, which Claude sees.
# Checks one file only, so it stays fast. The full gate is still the pre-push gate in AGENTS.md section 6.
command -v node >/dev/null 2>&1 || exit 0

file=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{process.stdout.write(String(JSON.parse(s).tool_input.file_path||""))}catch{}})' 2>/dev/null)
[ -n "$file" ] && [ -f "$file" ] || exit 0

# Resolve against the checkout that holds the file, so it also works from another worktree.
root=$(git -C "$(dirname "$file")" rev-parse --show-toplevel 2>/dev/null) || exit 0
case "${file#"$root"/}" in
  js/*.js|sw.js|archive-guard.worker.js) ;;
  *) exit 0 ;;
esac

if ! out=$(node --check "$file" 2>&1); then
  printf 'Syntax error in %s (node --check). Fix it before any other edit:\n%s\n' "${file#"$root"/}" "$out" >&2
  exit 2
fi
exit 0
