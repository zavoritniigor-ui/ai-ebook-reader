#!/bin/bash
# CI failure diagnostics: where are headless Chrome's renderer / GPU processes stuck?
# A stalled renderer never answers CDP, and the browser-side log says nothing; the native main-thread
# stack (shared-library frames are named even though chrome itself is stripped) does.
echo '--- chrome process states ---'
for p in $(pgrep -f 'chrome.*--type=(renderer|gpu-process|utility)'); do
  type=$(tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null | grep -oE -- '--(type|utility-sub-type)=[A-Za-z0-9._-]+' | tr '\n' ' ')
  echo "pid $p $type state=$(awk '/^State/{print $2$3}' /proc/$p/status 2>/dev/null) wchan=$(cat /proc/$p/wchan 2>/dev/null) cpu=$(ps -o time= -p $p)"
done
# A process blocked in a pipe write: which fd, and which process holds the other end of that pipe?
for p in $(pgrep -f 'chrome.*--type=renderer'); do
  grep -q pipe_write /proc/$p/wchan 2>/dev/null || continue
  fd=$(sudo -n cat /proc/$p/syscall 2>/dev/null | awk '{printf "%d", $2}')
  target=$(sudo -n readlink /proc/$p/fd/$fd 2>/dev/null)
  echo "pid $p blocked writing fd $fd -> $target (syscall: $(sudo -n cat /proc/$p/syscall 2>/dev/null | cut -c1-60))"
  echo "  kernel stack: $(sudo -n cat /proc/$p/stack 2>/dev/null | head -8 | tr '\n' ' ')"
  [ -n "$target" ] && for q in $(ls /proc | grep -E '^[0-9]+$'); do
    sudo -n ls -l /proc/$q/fd 2>/dev/null | grep -q -- "$target" && echo "  also open in pid $q: $(tr '\0' ' ' < /proc/$q/cmdline 2>/dev/null | cut -c1-160)"
  done
done
command -v gdb > /dev/null || { sudo -n apt-get update -qq > /dev/null 2>&1; sudo -n apt-get install -y -qq gdb > /dev/null 2>&1 || true; }
command -v gdb > /dev/null || { echo 'gdb unavailable'; exit 0; }
for p in $(pgrep -f 'chrome.*--type=(renderer|gpu-process)'); do
  grep -q -- '--extension-process\|top-chrome' /proc/$p/cmdline 2>/dev/null && continue
  echo "--- main-thread stack of pid $p ($(tr '\0' ' ' < /proc/$p/cmdline | grep -oE -- '--type=[a-z-]+')) ---"
  sudo -n timeout 60 gdb -p $p -batch -ex 'set pagination off' -ex 'thread 1' -ex 'bt 30' 2>/dev/null | grep -E '^#' | cut -c1-200
done
exit 0
