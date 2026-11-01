#!/usr/bin/env python3
"""Upload the verse recitations in voices_tanzil_net/ to the R2 bucket quran-images, key = <prefix> + the path under voices_tanzil_net/ (voices_tanzil_net/001001.m4a).

The files are made by `python3 tools/convert_voice.py`; R2 is where they live. Same method as upload_image.py.

Usage:
    python3 tools/upload_voice.py --dry-run          list what would be uploaded, call nothing
    python3 tools/upload_voice.py --limit 5          upload only the first 5 files (a test run)
    python3 tools/upload_voice.py                    upload everything that is not uploaded yet
    python3 tools/upload_voice.py --only 002         only keys that start with this (surah 2)
    options: --env <file>  --bucket quran-images  --src voices_tanzil_net  --prefix voices_tanzil_net/ (the folder in the bucket)  --jobs 8  --force (upload again)

Parallel: --jobs uploads at the same time (8 threads). When Cloudflare's API answers 429 every thread waits as long as it says (Retry-After).
Resumable: <src>/.uploaded.json records every key that went up (with its size and time), so a second run only sends what is new or changed.
Delete that file, or use --force, to send everything again.
Needs in the env file: CLOUDFLARE_API_TOKEN (with Workers R2 Storage Edit) and CLOUDFLARE_ACCOUNT_ID. Default env file: ../chat-learning/.env
"""
import argparse
import json
import mimetypes
import os
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get("CLOUDFLARE_API_BASE", "https://api.cloudflare.com/client/v4")
TYPES = {".m4a": "audio/mp4", ".mp3": "audio/mpeg"}
EXTENSIONS = tuple(TYPES)


def load_env(path: Path) -> dict:
    env = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip("\"'")
    return env


class Gate:
    """Shared by all threads: when the API answers 429 (too many requests), every thread waits before it sends the next one."""

    def __init__(self):
        self.until = 0.0
        self.lock = threading.Lock()

    def wait(self):
        while (left := self.until - time.time()) > 0:
            time.sleep(min(left, 2))

    def hold(self, seconds: float):
        with self.lock:
            self.until = max(self.until, time.time() + seconds)


GATE = Gate()


def put(account: str, token: str, bucket: str, key: str, data: bytes, content_type: str, tries: int = 8) -> None:
    """PUT .../r2/buckets/<bucket>/objects/<key>, retrying on rate limits and server errors."""
    url = f"{BASE}/accounts/{account}/r2/buckets/{bucket}/objects/{urllib.parse.quote(key)}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": content_type, "User-Agent": "quran-upload/1.0"}
    for attempt in range(1, tries + 1):
        GATE.wait()
        req = urllib.request.Request(url, method="PUT", data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                out = json.loads(res.read())
            if out.get("success", True):
                return
            raise RuntimeError("; ".join(e.get("message", "?") for e in out.get("errors", [])))
        except urllib.error.HTTPError as e:
            body = e.read()[:200].decode("utf-8", "replace")
            if e.code == 429 and attempt < tries:
                retry_after = e.headers.get("Retry-After", "")
                GATE.hold(int(retry_after) if retry_after.isdigit() else 10 * attempt)
                continue
            if e.code in (500, 502, 503, 504) and attempt < tries:
                time.sleep(2 * attempt)
                continue
            raise RuntimeError(f"HTTP {e.code}: {body}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < tries:
                time.sleep(2 * attempt)
                continue
            raise RuntimeError(f"network: {e}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--env", default=str(ROOT.parent / "chat-learning" / ".env"))
    ap.add_argument("--bucket", default="quran-images")
    ap.add_argument("--src", default="voices_tanzil_net")
    ap.add_argument("--prefix", default="voices_tanzil_net/", help="the folder in the bucket: put this in front of every key")
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--limit", type=int, default=0, help="upload at most this many files (0 = all)")
    ap.add_argument("--only", default="", help="only keys that start with this, e.g. 002")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    src = (ROOT / a.src).resolve()
    if not src.is_dir():
        sys.exit(f"No folder {src}")
    manifest_path = src / ".uploaded.json"
    done = {} if a.force or not manifest_path.exists() else json.loads(manifest_path.read_text(encoding="utf-8"))

    todo = []
    for f in sorted(src.rglob("*")):
        if not f.is_file() or f.suffix.lower() not in EXTENSIONS:
            continue
        key = a.prefix + f.relative_to(src).as_posix()
        st = f.stat()
        stamp = [st.st_size, st.st_mtime_ns]
        if a.only and not f.relative_to(src).as_posix().startswith(a.only):
            continue
        if done.get(key) == stamp:
            continue
        todo.append((key, f, stamp))
    if a.limit:
        todo = todo[: a.limit]

    total_mb = sum(s[2][0] for s in todo) / 1e6
    print(f"{len(todo)} files to upload to bucket '{a.bucket}' ({total_mb:.1f} MB); {len(done)} already recorded as uploaded")
    if a.dry_run or not todo:
        for key, _, stamp in todo[:15]:
            print(f"  {key}  {stamp[0] / 1000:.0f} KB")
        if len(todo) > 15:
            print(f"  ... and {len(todo) - 15} more")
        return

    env = load_env(Path(a.env))
    token, account = env.get("CLOUDFLARE_API_TOKEN"), env.get("CLOUDFLARE_ACCOUNT_ID")
    if not token or not account:
        sys.exit(f"CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are needed in {a.env}")

    lock = threading.Lock()
    sent = failed = 0
    started = time.time()

    def save():
        manifest_path.write_text(json.dumps(done, indent=0, sort_keys=True), encoding="utf-8")

    def work(item):
        key, f, stamp = item
        content_type = TYPES.get(f.suffix.lower()) or mimetypes.guess_type(f.name)[0] or "application/octet-stream"
        put(account, token, a.bucket, key, f.read_bytes(), content_type)
        return key, stamp

    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as pool:
        futures = {pool.submit(work, it): it for it in todo}
        for fut in as_completed(futures):
            key = futures[fut][0]
            try:
                k, stamp = fut.result()
            except Exception as e:  # noqa: BLE001 - report and carry on with the others
                failed += 1
                print(f"FAILED {key}: {e}", file=sys.stderr)
                continue
            with lock:
                done[k] = stamp
                sent += 1
                if sent % 200 == 0:
                    save()
                    print(f"{sent}/{len(todo)} uploaded, {time.time() - started:.0f}s")
    save()
    print(f"uploaded {sent}, failed {failed}, {time.time() - started:.0f}s")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
