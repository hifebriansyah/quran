#!/usr/bin/env python3
"""Scrape monthly prayer times from EQuran.id v2 Shalat API (https://equran.id/apidev/shalat).

Data source: Bimas Islam Kementerian Agama RI via EQuran.id API.
Available predefined years: 2026, 2027, 2028.

Endpoints used:
    GET  https://equran.id/api/v2/shalat/provinsi -> list of 34 provinces
    POST https://equran.id/api/v2/shalat/kabkota  -> list of regencies/cities per province
    POST https://equran.id/api/v2/shalat          -> monthly prayer times (1-12) per kabkota & year

Saved structure in data/shalat:
    data/shalat/wilayah.json                 -> index of all provinces, kabkota, and slugs
    data/shalat/<prov_slug>/<city_slug>.json -> full schedule for 2026-2028 for that city

Usage:
    python3 tools/scrape_shalat.py                     # Scrape all 34 provinces and 517 kabkota (2026-2028)
    python3 tools/scrape_shalat.py --dry-run           # Preview provinces, kabkota, and request counts
    python3 tools/scrape_shalat.py --provinsi "DKI Jakarta"  # Scrape single province
    python3 tools/scrape_shalat.py --kabkota "Kota Depok"    # Scrape single city
    python3 tools/scrape_shalat.py --limit 3           # Test run on first 3 cities
    python3 tools/scrape_shalat.py --years 2026 2027   # Specify specific year(s)
    python3 tools/scrape_shalat.py --jobs 16           # Concurrency level (default 12)
    python3 tools/scrape_shalat.py --force             # Re-fetch already downloaded data

Options:
    --split-years   Also save data/shalat/<prov_slug>/<city_slug>/<year>.json
    --split-months  Also save data/shalat/<prov_slug>/<city_slug>/<year>/<month>.json
    --compact       Write minified JSON without indentation
"""

import argparse
import json
import os
import re
import sys
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_OUT = ROOT / "data" / "shalat"
API_BASE = "https://equran.id/api/v2/shalat"
DEFAULT_YEARS = [2026, 2027, 2028]
USER_AGENT = "quran-shalat-scraper/1.0 (https://quran.situs.id)"

print_lock = threading.Lock()


def slugify(text: str) -> str:
    """Normalize and convert text into a clean filesystem-friendly slug."""
    text = text.lower()
    text = re.sub(r"[\.\']", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text


def http_get(url: str, retries: int = 4, timeout: int = 20) -> Any:
    """Perform HTTP GET request with retries and return parsed JSON."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 429:
                time.sleep(2 * attempt)
            elif attempt == retries:
                raise RuntimeError(f"GET {url} failed with HTTP {err.code}: {err.reason}") from err
            time.sleep(1.5 ** attempt)
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            if attempt == retries:
                raise RuntimeError(f"GET {url} failed after {retries} attempts: {err}") from err
            time.sleep(1.5 ** attempt)


def http_post(url: str, payload: Dict[str, Any], retries: int = 4, timeout: int = 20) -> Any:
    """Perform HTTP POST request with JSON payload, retries, and return parsed JSON."""
    raw = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=raw,
        headers={"Content-Type": "application/json", "User-Agent": USER_AGENT},
    )
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as err:
            if err.code == 429:
                time.sleep(2 * attempt)
            elif attempt == retries:
                raise RuntimeError(f"POST {url} failed with HTTP {err.code}: {err.reason}") from err
            time.sleep(1.5 ** attempt)
        except (urllib.error.URLError, TimeoutError, OSError) as err:
            if attempt == retries:
                raise RuntimeError(f"POST {url} with {payload} failed after {retries} attempts: {err}") from err
            time.sleep(1.5 ** attempt)


def fetch_wilayah(retries: int = 4) -> Tuple[List[str], Dict[str, List[str]]]:
    """Fetch all 34 provinces and their corresponding kabkota."""
    res = http_get(f"{API_BASE}/provinsi", retries=retries)
    provinsi_list: List[str] = res.get("data", [])
    if not provinsi_list:
        raise ValueError("Failed to retrieve provinces from API")

    kabkota_map: Dict[str, List[str]] = {}
    for prov in provinsi_list:
        kab_res = http_post(f"{API_BASE}/kabkota", {"provinsi": prov}, retries=retries)
        kabkota_map[prov] = kab_res.get("data", [])

    return provinsi_list, kabkota_map


def fetch_month_schedule(provinsi: str, kabkota: str, year: int, month: int, retries: int = 4) -> List[Dict[str, Any]]:
    """Fetch schedule for a single city, year, and month."""
    res = http_post(
        API_BASE,
        {"provinsi": provinsi, "kabkota": kabkota, "tahun": year, "bulan": month},
        retries=retries,
    )
    data = res.get("data", {})
    jadwal = data.get("jadwal", [])
    if not jadwal:
        raise ValueError(f"Empty schedule for {kabkota}, {provinsi} ({year}-{month:02d})")
    return jadwal


def load_existing_city_data(file_path: Path) -> Optional[Dict[str, Any]]:
    """Load existing city schedule file if available and valid."""
    if not file_path.exists() or file_path.stat().st_size == 0:
        return None
    try:
        with file_path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def write_json_atomic(dest_path: Path, data: Any, indent: Optional[int] = 2) -> None:
    """Safely write JSON using a temporary file and atomic rename."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(dest_path.suffix + ".part")
    with temp_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=indent)
        f.write("\n")
    os.replace(temp_path, dest_path)


def process_city(
    provinsi: str,
    kabkota: str,
    years: List[int],
    out_dir: Path,
    retries: int,
    force: bool,
    compact: bool,
    split_years: bool,
    split_months: bool,
) -> Tuple[str, str, int, int, Optional[str]]:
    """Download and compile schedule for a single city across specified years."""
    prov_slug = slugify(provinsi)
    city_slug = slugify(kabkota)
    city_file = out_dir / prov_slug / f"{city_slug}.json"
    indent = None if compact else 2

    existing = None if force else load_existing_city_data(city_file)
    existing_jadwal = existing.get("jadwal", {}) if (existing and "jadwal" in existing) else {}

    # Fast-path check: if city already has complete data for all requested years and months
    if not force and existing_jadwal:
        all_complete = True
        for y in years:
            y_str = str(y)
            if y_str not in existing_jadwal:
                all_complete = False
                break
            for m in range(1, 13):
                m_str = str(m)
                if m_str not in existing_jadwal[y_str] or len(existing_jadwal[y_str][m_str]) < 28:
                    all_complete = False
                    break
            if not all_complete:
                break
        if all_complete:
            return (provinsi, kabkota, 0, len(years) * 12, None)

    jadwal_dict: Dict[str, Dict[str, List[Dict[str, Any]]]] = {k: dict(v) for k, v in existing_jadwal.items()}
    fetched_months = 0
    skipped_months = 0

    try:
        for year in years:
            year_str = str(year)
            if year_str not in jadwal_dict:
                jadwal_dict[year_str] = {}

            for month in range(1, 13):
                month_str = str(month)
                if not force and month_str in jadwal_dict[year_str] and len(jadwal_dict[year_str][month_str]) >= 28:
                    skipped_months += 1
                    continue

                days = fetch_month_schedule(provinsi, kabkota, year, month, retries=retries)
                jadwal_dict[year_str][month_str] = days
                fetched_months += 1

                if split_months:
                    month_file = out_dir / prov_slug / city_slug / str(year) / f"{month:02d}.json"
                    month_data = {
                        "provinsi": provinsi,
                        "kabkota": kabkota,
                        "tahun": year,
                        "bulan": month,
                        "jadwal": days,
                    }
                    write_json_atomic(month_file, month_data, indent=indent)

            if split_years:
                year_file = out_dir / prov_slug / city_slug / f"{year}.json"
                year_data = {
                    "provinsi": provinsi,
                    "kabkota": kabkota,
                    "tahun": year,
                    "jadwal": jadwal_dict[year_str],
                }
                write_json_atomic(year_file, year_data, indent=indent)

        # Save main consolidated city file
        city_payload = {
            "provinsi": provinsi,
            "kabkota": kabkota,
            "provinsi_slug": prov_slug,
            "kabkota_slug": city_slug,
            "years": sorted([int(y) for y in jadwal_dict.keys()]),
            "jadwal": jadwal_dict,
        }
        write_json_atomic(city_file, city_payload, indent=indent)
        return (provinsi, kabkota, fetched_months, skipped_months, None)
    except Exception as err:
        return (provinsi, kabkota, fetched_months, skipped_months, str(err))


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Output directory (default: data/shalat)")
    parser.add_argument("--years", type=int, nargs="+", default=DEFAULT_YEARS, help="Years to scrape (default: 2026 2027 2028)")
    parser.add_argument("--provinsi", type=str, help="Only scrape matching province (name or substring)")
    parser.add_argument("--kabkota", type=str, help="Only scrape matching kabkota (name or substring)")
    parser.add_argument("--limit", type=int, help="Limit total number of kabkota to process (for testing)")
    parser.add_argument("--jobs", type=int, default=12, help="Number of concurrent worker threads (default: 12)")
    parser.add_argument("--retries", type=int, default=4, help="Number of retries on network error (default: 4)")
    parser.add_argument("--force", action="store_true", help="Re-fetch and overwrite existing data")
    parser.add_argument("--dry-run", action="store_true", help="Preview plan and exits without fetching schedules")
    parser.add_argument("--split-years", action="store_true", help="Also generate per-year files (<city>/<year>.json)")
    parser.add_argument("--split-months", action="store_true", help="Also generate per-month files (<city>/<year>/<month>.json)")
    parser.add_argument("--compact", action="store_true", help="Write compact minified JSON without indentation")

    args = parser.parse_args()
    out_dir = args.out.resolve()
    years = sorted(args.years)

    print(f"Fetching province and kab/kota directory from {API_BASE}...")
    provinsi_list, kabkota_map = fetch_wilayah(retries=args.retries)
    total_all_cities = sum(len(cities) for cities in kabkota_map.values())
    print(f"Found {len(provinsi_list)} provinces and {total_all_cities} kabupaten/kota.")

    # Save wilayah.json metadata index
    out_dir.mkdir(parents=True, exist_ok=True)
    wilayah_data = {
        "source": "https://equran.id/apidev/shalat",
        "authority": "Bimas Islam Kementerian Agama RI",
        "last_synced": datetime.now(timezone.utc).isoformat(),
        "years": years,
        "total_provinces": len(provinsi_list),
        "total_kabkota": total_all_cities,
        "provinsi": [
            {
                "name": p,
                "slug": slugify(p),
                "kabkota_count": len(kabkota_map.get(p, [])),
            }
            for p in provinsi_list
        ],
        "kabkota": {
            p: [
                {"name": k, "slug": slugify(k)}
                for k in kabkota_map.get(p, [])
            ]
            for p in provinsi_list
        },
    }
    wilayah_file = out_dir / "wilayah.json"
    write_json_atomic(wilayah_file, wilayah_data, indent=None if args.compact else 2)
    print(f"Wrote wilayah index to {wilayah_file.relative_to(ROOT)}")

    # Filter target tasks
    tasks: List[Tuple[str, str]] = []
    for prov in provinsi_list:
        if args.provinsi and args.provinsi.lower() not in prov.lower():
            continue
        for kab in kabkota_map.get(prov, []):
            if args.kabkota and args.kabkota.lower() not in kab.lower():
                continue
            tasks.append((prov, kab))

    if args.limit:
        tasks = tasks[: args.limit]

    total_tasks = len(tasks)
    print(f"\nTargets to scrape:")
    print(f"  Cities: {total_tasks}")
    print(f"  Years:  {years}")
    print(f"  Months per city: {len(years) * 12}")
    print(f"  Total monthly requests: {total_tasks * len(years) * 12}")
    print(f"  Output directory: {out_dir.relative_to(ROOT)}\n")

    if args.dry_run:
        print("Dry run mode: showing first 10 targets:")
        for prov, kab in tasks[:10]:
            print(f"  - [{prov}] {kab} -> {out_dir.relative_to(ROOT)}/{slugify(prov)}/{slugify(kab)}.json")
        if total_tasks > 10:
            print(f"  ... and {total_tasks - 10} more cities.")
        return

    # Execute scraping
    start_time = time.time()
    completed = 0
    total_fetched_months = 0
    total_skipped_months = 0
    errors: List[Tuple[str, str, str]] = []

    print(f"Starting download with {args.jobs} concurrent workers...")

    with ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {
            pool.submit(
                process_city,
                prov,
                kab,
                years,
                out_dir,
                args.retries,
                args.force,
                args.compact,
                args.split_years,
                args.split_months,
            ): (prov, kab)
            for prov, kab in tasks
        }

        for future in as_completed(futures):
            prov, kab, fetched, skipped, err = future.result()
            with print_lock:
                completed += 1
                total_fetched_months += fetched
                total_skipped_months += skipped
                if err:
                    errors.append((prov, kab, err))
                    status = f"FAILED: {err}"
                else:
                    status = f"ok (+{fetched} mos, {skipped} cached)"
                print(f"[{completed}/{total_tasks}] {prov} · {kab}: {status}", flush=True)

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"Finished in {elapsed:.1f}s ({elapsed / 60:.1f} mins)")
    print(f"Completed cities: {completed - len(errors)}/{total_tasks}")
    print(f"Monthly requests: {total_fetched_months} fetched, {total_skipped_months} reused from cache")

    if errors:
        print(f"\n{len(errors)} cities encountered errors:", file=sys.stderr)
        for prov, kab, err in errors:
            print(f"  - {prov} / {kab}: {err}", file=sys.stderr)
        sys.exit(1)
    else:
        print(f"All data successfully saved in {out_dir.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
