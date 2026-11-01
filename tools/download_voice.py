#!/usr/bin/env python3
"""Download the verse recitations listed in data/voice.md (Mishary Alafasy, Tanzil.net) to data/voice/, one mp3 per verse, named like the URL (001001.mp3).

The list is lines like `2:255 https://tanzil.net/res/audio/afasy/002255.mp3`. Each file is written as .part first and renamed when complete, so an
interrupted run never leaves a half file that looks finished.

Usage:
    python3 tools/download_voice.py --dry-run          list what would be downloaded, call nothing
    python3 tools/download_voice.py --limit 5          download only the first 5 verses (a test run)
    python3 tools/download_voice.py                    download everything that is not downloaded yet
    python3 tools/download_voice.py --only 2           only surah 2 (Al-Baqarah)
    options: --list data/voice.md  --out data/voice  --jobs 4  --retries 3  --force (download again, even what is there)

Parallel: --jobs downloads at the same time (4 threads by default). Keep it low: the files come from Tanzil's server, which is not ours to hammer.
Resumable: a file that already exists and is not empty is skipped, so a second run only fetches what is missing.
Failures are retried with a growing wait; any verse that still fails is listed at the end and the script exits with status 1, so a rerun picks it up.
Uses only the Python standard library.
"""
import argparse
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

LINE = re.compile(r"^(\d+):(\d+)\s+(https://\S+\.mp3)\s*$")
USER_AGENT = "quran-voice-downloader/1.0 (personal download; contact via the project owner)"
print_lock = threading.Lock()


def read_list(path):
    verses = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = LINE.match(line.strip())
        if m:
            surah, ayah, url = int(m.group(1)), int(m.group(2)), m.group(3)
            verses.append((surah, ayah, url))
    return verses


def fetch(url, dest, retries):
    tmp = dest.with_suffix(dest.suffix + ".part")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(request, timeout=60) as response, open(tmp, "wb") as out:
                while chunk := response.read(64 * 1024):
                    out.write(chunk)
            if tmp.stat().st_size == 0:
                raise OSError("empty response")
            os.replace(tmp, dest)
            return None
        except (urllib.error.URLError, OSError) as err:
            if tmp.exists():
                tmp.unlink()
            if attempt == retries:
                return str(err)
            time.sleep(2 ** attempt)
    return "unknown error"


def main():
    base = Path(__file__).resolve().parent.parent / "data"
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--list", default=str(base / "voice.md"), type=Path)
    parser.add_argument("--out", default=str(base / "voice"), type=Path)
    parser.add_argument("--jobs", type=int, default=20)
    parser.add_argument("--retries", type=int, default=3)
    parser.add_argument("--limit", type=int, help="only the first N verses")
    parser.add_argument("--only", type=int, help="only this surah number")
    parser.add_argument("--force", action="store_true", help="download again, even files that exist")
    parser.add_argument("--dry-run", action="store_true", help="list what would be downloaded, call nothing")
    args = parser.parse_args()

    verses = read_list(args.list)
    if not verses:
        sys.exit(f"no verse lines found in {args.list}")
    if args.only is not None:
        verses = [v for v in verses if v[0] == args.only]
    if args.limit is not None:
        verses = verses[: args.limit]

    args.out.mkdir(parents=True, exist_ok=True)
    todo = []
    skipped = 0
    for surah, ayah, url in verses:
        dest = args.out / url.rsplit("/", 1)[1]
        if dest.exists() and dest.stat().st_size > 0 and not args.force:
            skipped += 1
        else:
            todo.append((surah, ayah, url, dest))

    print(f"{len(verses)} verses listed, {skipped} already there, {len(todo)} to download into {args.out}")
    if args.dry_run:
        for surah, ayah, url, dest in todo:
            print(f"{surah}:{ayah} {url} -> {dest.name}")
        return

    done = failed = 0
    failures = []
    total = len(todo)
    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(fetch, url, dest, args.retries): (surah, ayah, url) for surah, ayah, url, dest in todo}
        for future in as_completed(futures):
            surah, ayah, url = futures[future]
            error = future.result()
            with print_lock:
                if error is None:
                    done += 1
                else:
                    failed += 1
                    failures.append((surah, ayah, url, error))
                print(f"[{done + failed}/{total}] {surah}:{ayah} {'ok' if error is None else 'FAILED'}", flush=True)

    print(f"downloaded {done}, skipped {skipped}, failed {failed}")
    for surah, ayah, url, error in failures:
        print(f"  {surah}:{ayah} {url}: {error}", file=sys.stderr)
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
