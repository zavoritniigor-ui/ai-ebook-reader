#!/bin/bash
# CI failure diagnostics: where are headless Chrome's renderer / GPU processes stuck?
# A stalled renderer never answers CDP, and the browser-side log says nothing; the native main-thread
# stack (shared-library frames are named even though chrome itself is stripped) does.
echo '--- chrome process states ---'
for p in $(pgrep -f 'chrome.*--type=(renderer|gpu-process|utility)'); do
  type=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null | grep -oE -- '--(type|utility-sub-type)=[A-Za-z0-9._-]+' | tr '\n' ' ')
  echo "pid $p $type state=$(awk '/^State/{print $2$3}' /proc/$p/status 2>/dev/null) wchan=$(cat /proc/$p/wchan 2>/dev/null) cpu=$(ps -o time= -p $p)"
done
command -v gdb > /dev/null || { sudo -n apt-get install -y -qq gdb > /dev/null 2>&1 || true; }
command -v gdb > /dev/null || { echo 'gdb unavailable'; exit 0; }
for p in $(pgrep -f 'chrome.*--type=(renderer|gpu-process)'); do
  grep -q -- '--extension-process\|top-chrome' /proc/$p/cmdline 2>/dev/null && continue
  echo "--- main-thread stack of pid $p ($(tr '\0' ' ' < /proc/$p/cmdline | grep -oE -- '--type=[a-z-]+')) ---"
  sudo -n timeout 60 gdb -p $p -batch -ex 'set pagination off' -ex 'thread 1' -ex 'bt 30' 2>/dev/null | grep -E '^#' | cut -c1-200
done
exit 0
