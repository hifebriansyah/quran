#!/usr/bin/env python3
"""Convert Quran recitation MP3 audio files in data/voice/ to M4A (AAC) in voices/.

Scans data/voice/ for .mp3 files, converts them to .m4a with efficient bitrate
while maintaining voice quality, stores results in voices/, tracks success and
failures in voices/log.md, and skips already successful conversions on retry.

Usage:
    python3 tools/convert_voice.py --dry-run          list what would be converted, do nothing
    python3 tools/convert_voice.py --limit 5          convert only the first 5 files (test run)
    python3 tools/convert_voice.py                    convert all pending MP3 files
    python3 tools/convert_voice.py --only 001         only files matching prefix (e.g. surah 1)
    python3 tools/convert_voice.py --bitrate 48k      target AAC bitrate (default: 48k)
    python3 tools/convert_voice.py --jobs 4           number of parallel conversion threads
    python3 tools/convert_voice.py --force            re-convert even if already successful
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SRC = ROOT / "data" / "voice"
DEFAULT_OUT = ROOT / "voices"
DEFAULT_BITRATE = "24k"


def find_ffmpeg() -> str:
    """Find the path to the ffmpeg executable."""
    found = shutil.which("ffmpeg")
    if found:
        return found
    candidates = [
        "/opt/homebrew/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/usr/bin/ffmpeg",
    ]
    for c in candidates:
        if os.path.isfile(c) and os.access(c, os.X_OK):
            return c
    raise FileNotFoundError(
        "ffmpeg was not found in PATH or standard directories (/opt/homebrew/bin/ffmpeg, /usr/local/bin/ffmpeg). "
        "Please ensure ffmpeg is installed."
    )


def format_size(bytes_num: int) -> str:
    """Format bytes into human-readable string (KB/MB)."""
    if bytes_num < 1024:
        return f"{bytes_num} B"
    if bytes_num < 1024 * 1024:
        return f"{bytes_num / 1024:.1f} KB"
    return f"{bytes_num / (1024 * 1024):.2f} MB"


def parse_existing_log(log_path: Path) -> dict:
    """Parse previous status records from log.md if it exists.

    Returns dict mapping input filename (e.g. '001001.mp3') to record dict:
        {'status': 'SUCCESS'|'FAILED', 'input_size': int, 'output_size': int, 'error': str, 'savings': str, 'duration': str}
    """
    if not log_path.exists():
        return {}

    records = {}
    table_pattern = re.compile(
        r"^\|\s*`?([^`|\s]+)`?\s*\|\s*`?[^`|\s]+`?\s*\|\s*(SUCCESS|FAILED)\s*\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|\s*([^|]*)\|"
    )

    try:
        content = log_path.read_text(encoding="utf-8")
        for line in content.splitlines():
            m = table_pattern.match(line.strip())
            if m:
                filename = m.group(1).strip()
                status = m.group(2).strip()
                in_size_str = m.group(3).strip()
                out_size_str = m.group(4).strip()
                savings = m.group(5).strip()
                duration = m.group(6).strip()
                note_or_error = m.group(7).strip()
                records[filename] = {
                    "status": status,
                    "input_size_str": in_size_str,
                    "output_size_str": out_size_str,
                    "savings": savings,
                    "duration": duration,
                    "error": note_or_error if status == "FAILED" else "",
                }
    except Exception as e:
        print(f"Warning: could not parse existing {log_path}: {e}", file=sys.stderr)

    return records


def write_log(log_path: Path, records: dict, src_dir: Path, out_dir: Path, bitrate: str):
    """Write comprehensive conversion status to voices/log.md."""
    now_str = datetime.now().astimezone().strftime("%Y-%m-%d %H:%M:%S %Z")
    total = len(records)
    successes = sum(1 for r in records.values() if r.get("status") == "SUCCESS")
    failures = sum(1 for r in records.values() if r.get("status") == "FAILED")

    lines = [
        "# Voice Conversion Log",
        "",
        f"- **Last Updated:** {now_str}",
        f"- **Source Folder:** `{src_dir}`",
        f"- **Output Folder:** `{out_dir}`",
        f"- **Audio Settings:** AAC, bitrate `{bitrate}`, faststart enabled",
        f"- **Summary:** Total: {total} | Success: {successes} | Failed: {failures}",
        "",
    ]

    failed_items = [(f, r) for f, r in records.items() if r.get("status") == "FAILED"]
    if failed_items:
        lines.append("## Failures")
        lines.append("")
        for filename, r in sorted(failed_items):
            err_msg = r.get("error", "Unknown error")
            lines.append(f"- **`{filename}`**: {err_msg}")
        lines.append("")

    lines.append("## File Details")
    lines.append("")
    lines.append("| Input File | Output File | Status | Input Size | Output Size | Savings | Duration | Notes / Error |")
    lines.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |")

    for filename in sorted(records.keys()):
        r = records[filename]
        status = r.get("status", "UNKNOWN")
        stem = Path(filename).stem
        out_name = f"{stem}.m4a"
        in_size = r.get("input_size_str") or (format_size(r["input_size"]) if "input_size" in r else "-")
        out_size = r.get("output_size_str") or (format_size(r["output_size"]) if "output_size" in r else "-")
        savings = r.get("savings", "-")
        duration = r.get("duration", "-")
        notes = r.get("error") if status == "FAILED" else (r.get("notes") or "OK")
        # Clean pipes in notes to prevent breaking markdown table
        notes_clean = str(notes).replace("|", "\\|").replace("\n", " ")
        lines.append(f"| `{filename}` | `{out_name}` | {status} | {in_size} | {out_size} | {savings} | {duration} | {notes_clean} |")

    lines.append("")
    tmp_log = log_path.with_suffix(".tmp.md")
    tmp_log.write_text("\n".join(lines), encoding="utf-8")
    os.replace(tmp_log, log_path)


def convert_file(ffmpeg_bin: str, src_file: Path, dest_file: Path, bitrate: str) -> dict:
    """Convert a single MP3 file to M4A using ffmpeg."""
    tmp_file = dest_file.with_name(f"{dest_file.stem}.tmp.m4a")
    in_size = src_file.stat().st_size
    start_time = time.time()

    cmd = [
        ffmpeg_bin,
        "-nostdin",
        "-y",
        "-loglevel", "error",
        "-i", str(src_file),
        "-vn",
        "-c:a", "aac",
        "-b:a", bitrate,
        "-ac", "1",
        "-ar", "24000",
        "-movflags", "+faststart",
        "-f", "ipod",
        str(tmp_file),
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        duration_sec = time.time() - start_time
        duration_str = f"{duration_sec:.2f}s"

        if proc.returncode != 0:
            if tmp_file.exists():
                tmp_file.unlink()
            err_msg = proc.stderr.strip() or f"ffmpeg exited with code {proc.returncode}"
            return {
                "status": "FAILED",
                "input_size": in_size,
                "input_size_str": format_size(in_size),
                "output_size_str": "-",
                "savings": "-",
                "duration": duration_str,
                "error": err_msg,
            }

        if not tmp_file.exists() or tmp_file.stat().st_size == 0:
            if tmp_file.exists():
                tmp_file.unlink()
            return {
                "status": "FAILED",
                "input_size": in_size,
                "input_size_str": format_size(in_size),
                "output_size_str": "-",
                "savings": "-",
                "duration": duration_str,
                "error": "output file was empty or not created",
            }

        out_size = tmp_file.stat().st_size
        os.replace(tmp_file, dest_file)

        savings_pct = ((in_size - out_size) / in_size) * 100 if in_size > 0 else 0
        savings_str = f"{-savings_pct:+.1f}%" if savings_pct != 0 else "0.0%"

        return {
            "status": "SUCCESS",
            "input_size": in_size,
            "input_size_str": format_size(in_size),
            "output_size": out_size,
            "output_size_str": format_size(out_size),
            "savings": savings_str,
            "duration": duration_str,
            "error": "",
            "notes": "OK",
        }

    except Exception as e:
        if tmp_file.exists():
            tmp_file.unlink()
        duration_sec = time.time() - start_time
        return {
            "status": "FAILED",
            "input_size": in_size,
            "input_size_str": format_size(in_size),
            "output_size_str": "-",
            "savings": "-",
            "duration": f"{duration_sec:.2f}s",
            "error": str(e),
        }


def main():
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC, help=f"Source folder with MP3 files (default: {DEFAULT_SRC})")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"Output folder for M4A files (default: {DEFAULT_OUT})")
    parser.add_argument("--log", type=Path, default=None, help="Custom path for log.md (default: <out>/log.md)")
    parser.add_argument("--bitrate", default=DEFAULT_BITRATE, help=f"AAC bitrate (default: {DEFAULT_BITRATE})")
    parser.add_argument("--jobs", type=int, default=min(8, os.cpu_count() or 4), help="Number of parallel workers")
    parser.add_argument("--limit", type=int, default=0, help="Convert at most N files (0 = all)")
    parser.add_argument("--only", default="", help="Only process files starting with this prefix (e.g. 001)")
    parser.add_argument("--force", action="store_true", help="Re-convert even if destination file already exists")
    parser.add_argument("--dry-run", action="store_true", help="List files to convert without executing")
    args = parser.parse_args()

    src_dir = args.src.resolve()
    out_dir = args.out.resolve()
    log_path = (args.log or (out_dir / "log.md")).resolve()

    if not src_dir.is_dir():
        sys.exit(f"Source folder does not exist: {src_dir}")

    ffmpeg_bin = find_ffmpeg()
    out_dir.mkdir(parents=True, exist_ok=True)

    # Scan for MP3 files
    all_files = sorted([f for f in src_dir.iterdir() if f.is_file() and f.suffix.lower() == ".mp3"])
    if not all_files:
        sys.exit(f"No .mp3 files found in {src_dir}")

    if args.only:
        all_files = [f for f in all_files if f.name.startswith(args.only)]

    # Load existing log records
    records = parse_existing_log(log_path)

    # Determine tasks
    todo = []
    skipped = 0

    for f in all_files:
        dest_m4a = out_dir / f"{f.stem}.m4a"
        prev = records.get(f.name)
        is_recorded_success = prev and prev.get("status") == "SUCCESS"
        dest_is_valid = dest_m4a.is_file() and dest_m4a.stat().st_size > 0

        # Requirement 6: On retry, don't redo what already succeeded
        if not args.force and dest_is_valid and (is_recorded_success or f.name not in records):
            skipped += 1
            # Ensure existing record is present in records table
            if f.name not in records:
                in_sz = f.stat().st_size
                out_sz = dest_m4a.stat().st_size
                savings_pct = ((in_sz - out_sz) / in_sz) * 100 if in_sz > 0 else 0
                records[f.name] = {
                    "status": "SUCCESS",
                    "input_size": in_sz,
                    "input_size_str": format_size(in_sz),
                    "output_size": out_sz,
                    "output_size_str": format_size(out_sz),
                    "savings": f"{-savings_pct:+.1f}%",
                    "duration": "-",
                    "notes": "already converted",
                    "error": "",
                }
        else:
            todo.append((f, dest_m4a))

    if args.limit and args.limit > 0:
        todo = todo[: args.limit]

    print(f"Scanned {len(all_files)} MP3 files in {src_dir}")
    print(f"Already converted: {skipped} | To convert: {len(todo)} | Output: {out_dir}")

    if args.dry_run:
        print("\n[DRY RUN] The following files would be converted:")
        for src_f, dest_f in todo[:20]:
            print(f"  {src_f.name} -> {dest_f.name}")
        if len(todo) > 20:
            print(f"  ... and {len(todo) - 20} more files.")
        return

    if not todo:
        print("Everything is up to date. Nothing to convert.")
        # Ensure log file reflects current complete state
        write_log(log_path, records, src_dir, out_dir, args.bitrate)
        return

    lock = threading.Lock()
    done_count = 0
    fail_count = 0
    total_todo = len(todo)
    start_time = time.time()

    def update_records_and_log(filename: str, result: dict):
        nonlocal done_count, fail_count
        with lock:
            records[filename] = result
            if result["status"] == "SUCCESS":
                done_count += 1
            else:
                fail_count += 1
            processed = done_count + fail_count
            # Periodic log update every 50 files
            if processed % 50 == 0 or processed == total_todo:
                write_log(log_path, records, src_dir, out_dir, args.bitrate)

    print(f"\nStarting conversion using {args.jobs} worker(s)...")

    with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        future_to_file = {
            pool.submit(convert_file, ffmpeg_bin, src_f, dest_f, args.bitrate): src_f
            for src_f, dest_f in todo
        }

        for future in as_completed(future_to_file):
            src_f = future_to_file[future]
            try:
                res = future.result()
            except Exception as e:
                res = {
                    "status": "FAILED",
                    "input_size_str": "-",
                    "output_size_str": "-",
                    "savings": "-",
                    "duration": "-",
                    "error": str(e),
                }

            update_records_and_log(src_f.name, res)
            status_tag = "OK" if res["status"] == "SUCCESS" else "FAILED"
            processed = done_count + fail_count
            print(
                f"[{processed}/{total_todo}] {src_f.name} -> {status_tag}"
                + (f" ({res.get('savings', '')})" if status_tag == "OK" else f" ({res.get('error', '')})"),
                flush=True,
            )

    # Final write of log.md
    write_log(log_path, records, src_dir, out_dir, args.bitrate)

    elapsed = time.time() - start_time
    print(f"\nFinished in {elapsed:.1f}s.")
    print(f"Summary: {done_count} converted, {fail_count} failed, {skipped} skipped.")
    print(f"Log written to: {log_path}")

    if fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
