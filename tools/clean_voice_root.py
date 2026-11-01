#!/usr/bin/env python3
"""Delete the stray voice files at the top of the R2 bucket quran-images (keys like 001001.m4a, no folder).

They came from a first upload_voice.py run before the files were put in the voices_tanzil_net/ folder. Only keys that match exactly
six digits + .m4a/.mp3 and have no "/" are touched, so the images (id/..., en/...) and voices_tanzil_net/... are never matched.

Usage:
    python3 tools/clean_voice_root.py                list what would be deleted, call nothing (the default)
    python3 tools/clean_voice_root.py --delete       delete them
    options: --env <file>  --bucket quran-images  --jobs 8

Safety: with --delete, a stray key is deleted only if the same file is already in voices_tanzil_net/ in the bucket, so nothing is lost.
Needs in the env file: CLOUDFLARE_API_TOKEN (with Workers R2 Storage Edit) and CLOUDFLARE_ACCOUNT_ID. Default env file: ../chat-learning/.env
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = os.environ.get("CLOUDFLARE_API_BASE", "https://api.cloudflare.com/client/v4")
STRAY = re.compile(r"^\d{6}\.(m4a|mp3)$")
FOLDER = "voices_tanzil_net/"


def load_env(path: Path) -> dict:
    env = {}
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip("\"'")
    return env


def call(token: str, url: str, method: str = "GET") -> dict:
    req = urllib.request.Request(url, method=method, headers={"Authorization": f"Bearer {token}", "User-Agent": "quran-clean/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=60) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read()[:200].decode('utf-8', 'replace')}")


def list_keys(account: str, token: str, bucket: str, prefix: str = "", delimiter: str = "") -> list:
    keys, cursor = [], ""
    while True:
        q = {"per_page": 1000}
        if prefix:
            q["prefix"] = prefix
        if delimiter:
            q["delimiter"] = delimiter
        if cursor:
            q["cursor"] = cursor
        out = call(token, f"{BASE}/accounts/{account}/r2/buckets/{bucket}/objects?{urllib.parse.urlencode(q)}")
        keys += [o["key"] for o in out.get("result", [])]
        info = out.get("result_info", {})
        cursor = info.get("cursor") if info.get("is_truncated") else ""
        if not cursor:
            return keys


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--env", default=str(ROOT.parent / "chat-learning" / ".env"))
    ap.add_argument("--bucket", default="quran-images")
    ap.add_argument("--jobs", type=int, default=8)
    ap.add_argument("--delete", action="store_true")
    a = ap.parse_args()

    env = load_env(Path(a.env))
    token, account = env.get("CLOUDFLARE_API_TOKEN"), env.get("CLOUDFLARE_ACCOUNT_ID")
    if not token or not account:
        sys.exit(f"CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are needed in {a.env}")

    stray = sorted(k for k in list_keys(account, token, a.bucket, delimiter="/") if STRAY.match(k))
    inside = {k[len(FOLDER):] for k in list_keys(account, token, a.bucket, prefix=FOLDER)}
    safe = [k for k in stray if k in inside]
    unsafe = [k for k in stray if k not in inside]
    print(f"{len(stray)} stray files at the top of '{a.bucket}'; {len(safe)} already in {FOLDER}, {len(unsafe)} not yet")
    for k in stray[:10]:
        print(f"  {k}{'' if k in inside else '  (NOT in the folder yet, kept)'}")
    if unsafe:
        print(f"Run upload_voice.py to finish the upload, then run this again to remove the {len(unsafe)} that are kept.")
    if not a.delete or not safe:
        if safe and not a.delete:
            print("dry run: nothing deleted; add --delete to remove the files that are already in the folder")
        return

    def delete(key):
        call(token, f"{BASE}/accounts/{account}/r2/buckets/{a.bucket}/objects/{urllib.parse.quote(key)}", "DELETE")

    failed = 0
    with ThreadPoolExecutor(max_workers=max(1, a.jobs)) as pool:
        for key, fut in [(k, pool.submit(delete, k)) for k in safe]:
            try:
                fut.result()
            except Exception as e:  # noqa: BLE001
                failed += 1
                print(f"FAILED {key}: {e}", file=sys.stderr)
    print(f"deleted {len(safe) - failed}, failed {failed}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
