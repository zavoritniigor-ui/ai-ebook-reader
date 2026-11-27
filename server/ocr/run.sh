#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
command -v podman >/dev/null
nvidia-smi
if ! command -v nvidia-ctk >/dev/null || ! nvidia-ctk cdi list | grep -q 'nvidia.com/gpu=0'; then
  echo 'NVIDIA CDI GPU 0 is unavailable. No driver or system settings were changed.' >&2
  exit 1
fi
if [[ ! -f .ocr-token ]]; then
  (umask 077; python3 -c 'import secrets; print(secrets.token_urlsafe(32))' > .ocr-token)
fi
chmod 600 .ocr-token
OCR_TOKEN="$(cat .ocr-token)"
[[ -n "$OCR_TOKEN" ]] || { echo 'The local OCR token is empty.' >&2; exit 1; }
export OCR_TOKEN
cache_dir="${OCR_CACHE_DIR:-$PWD/.cache}"
mkdir -p "$cache_dir"
cache_dir="$(realpath "$cache_dir")"
if [[ -n "${OCR_RUNTIME_IMAGE:-}" ]]; then
  runtime_image="$OCR_RUNTIME_IMAGE"
  if ! podman image exists "$runtime_image"; then
    echo 'The explicit OCR_RUNTIME_IMAGE is not present locally. No image was downloaded or retagged.' >&2
    exit 1
  fi
else
  runtime_fingerprint="$(sha256sum Containerfile.runtime requirements-gpu.txt | sha256sum)"
  runtime_image="localhost/ocr-document-runtime:${runtime_fingerprint%% *}"
  if ! podman image exists "$runtime_image"; then
    storage_root="$(podman info --format '{{.Store.GraphRoot}}')"
    available_bytes="$(df --output=avail -B1 "$storage_root" | tail -n 1)"
    if (( available_bytes < 30 * 1024 * 1024 * 1024 )); then
      echo 'At least 30 GiB free is required to build a new GPU runtime. Existing images were preserved.' >&2
      exit 1
    fi
    podman build --disable-compression=false -f Containerfile.runtime -t "$runtime_image" .
  fi
fi
podman image inspect --format 'OCR runtime image: {{.Id}}' "$runtime_image"
podman build --disable-compression=false --build-arg OCR_RUNTIME_IMAGE="$runtime_image" \
  -t localhost/ocr-document-server:0.2 .
podman run --rm --name ocr-document-server --device nvidia.com/gpu=0 \
  --security-opt=no-new-privileges --cap-drop=ALL --pids-limit=512 \
  -p 127.0.0.1:8765:8765 --shm-size=2g \
  --tmpfs /jobs:rw,size=512m,mode=700 \
  --volume "$cache_dir:/cache:rw" \
  --env OCR_TOKEN localhost/ocr-document-server:0.2
