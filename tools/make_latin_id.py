#!/usr/bin/env python3
"""Build data/latin-id.md: the Indonesian-style Latin (transliteration) of every verse, from the equran.id API.

Usage:  python3 tools/make_latin_id.py <folder with 001.json ... 114.json>
        (curl https://equran.id/api/v2/surat/<n> for n = 1 to 114, one request per second)
Reads:  <n>.json  { data: { ayat: [{ nomorAyat, teksLatin, ... }] } }, and data/surahs.json for the verse counts
Writes: data/latin-id.md   one line per verse: <surah>:<verse> <text>

equran.id credits Kemenag RI (Indonesian Ministry of Religious Affairs) as the source of the verses. It states no licence, so check
whether the Latin text may be reused before the site is published. data/latin.md (Tanzil, English style) is used on the /en/ pages.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    raw = Path(sys.argv[1])
    surahs = json.loads((ROOT / "data" / "surahs.json").read_text(encoding="utf-8"))["surahs"]
    lines = [
        "# Latin (Indonesian style): transliteration from equran.id (Kemenag RI)",
        "",
        "```",
        "Source: https://equran.id/api/v2/surat/<n> (teksLatin). equran.id credits the Indonesian Ministry of Religious Affairs (Kemenag RI).",
        "No licence is stated there: check that the text may be reused before this file is published.",
        "```",
        "",
    ]
    total = 0
    for s in surahs:
        doc = json.loads((raw / f"{s['no']:03d}.json").read_text(encoding="utf-8"))["data"]
        ayat = doc["ayat"]
        assert doc["nomor"] == s["no"], f"surah {s['no']}: file is surah {doc['nomor']}"
        assert [a["nomorAyat"] for a in ayat] == list(range(1, s["ayat"] + 1)), f"surah {s['no']}: verse numbers differ from data/surahs.json"
        if s["no"] != 1:
            lines.append("")
        for a in ayat:
            text = " ".join(a["teksLatin"].split())
            assert text, f"{s['no']}:{a['nomorAyat']} has no Latin text"
            lines.append(f"{s['no']}:{a['nomorAyat']} {text}")
            total += 1
    assert total == 6236, total
    (ROOT / "data" / "latin-id.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"wrote data/latin-id.md: {total} verses")


if __name__ == "__main__":
    main()
