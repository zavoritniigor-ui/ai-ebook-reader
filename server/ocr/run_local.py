"""Run the isolated GPU environment on loopback without changing system CUDA."""
import os
from pathlib import Path
import secrets


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    os.chdir(root)
    token_path = root / ".ocr-token"
    if not token_path.exists():
        fd = os.open(token_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as token_file:
            token_file.write(secrets.token_urlsafe(32) + "\n")
    token_path.chmod(0o600)
    token = token_path.read_text().strip()
    if not token:
        raise SystemExit("The local OCR token is empty")
    os.environ["OCR_TOKEN"] = token
    os.environ.setdefault("OCR_DEVICE", "gpu:0")
    os.environ.setdefault("PADDLE_PDX_CACHE_HOME", str(root / ".cache" / "paddlex"))
    os.environ.setdefault("HF_HOME", str(root / ".cache" / "huggingface"))
    os.environ.setdefault("OCR_JOB_DIR", str(root / ".jobs"))
    import uvicorn
    uvicorn.run("server:app", host="127.0.0.1", port=8765, workers=1)
