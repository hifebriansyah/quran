#!/usr/bin/env python3
"""Build data/ from the files downloaded from Tanzil.net (https://tanzil.net/download and https://tanzil.net/trans).

Usage:  python3 tools/make_data.py <folder with the Tanzil downloads>
Reads:  ar.txt (Quran text, Uthmani), id.txt (id.indonesian), en.txt (en.sahih), tr.txt (en.transliteration),
        meta.js (https://tanzil.net/res/text/metadata/quran-data.js), and tools/surah-names-id.json
Writes: data/arabic.md, data/indonesia.md, data/english.md, data/latin.md  one line per verse: <surah>:<verse> <text>
        data/voice.md                                                         one line per verse: <surah>:<verse> <audio url>
        data/surahs.json                                                      names, meanings, type, order, juz

The text of each file is copied as it is (in the Arabic file, Tanzil puts the bismillah in front of verse 1 of every surah except 9;
the site splits it off when it builds a page) (Tanzil's terms: unaltered, with their copyright block kept). The only edit is in
the transliteration, where Tanzil marks letters with <u>, <b>, <i> tags; the tags are dropped, the letters stay.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VERSE = re.compile(r"^(\d+)\|(\d+)\|(.*)$")
TAG = re.compile(r"</?(?:u|b|i|strong)>", re.I)

FILES = [
    ("ar.txt", "arabic.md", "Arabic: Tanzil Quran Text (Uthmani)", False),
    ("id.txt", "indonesia.md", "Indonesian: Indonesian Ministry of Religious Affairs (via Tanzil.net)", False),
    ("en.txt", "english.md", "English: Saheeh International (via Tanzil.net)", False),
    ("tr.txt", "latin.md", "Transliteration: English transliteration (via Tanzil.net)", True),
]


def convert(src: Path, out: Path, title: str, strip_tags: bool):
    verses, notice = [], []
    for raw in src.read_text(encoding="utf-8").splitlines():
        m = VERSE.match(raw)
        if m:
            text = m.group(3).strip()
            verses.append((int(m.group(1)), int(m.group(2)), TAG.sub("", text) if strip_tags else text))
        elif raw.startswith("#"):
            notice.append(raw)
    assert len(verses) == 6236, f"{src.name}: {len(verses)} verses, expected 6236"
    lines = [f"# {title}", "", "```", *notice, "```", ""]
    last = 0
    for s, a, text in verses:
        if s != last and last:
            lines.append("")
        last = s
        lines.append(f"{s}:{a} {text}")
    out.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    return verses


# Mishary Alafasy, one mp3 per verse, named <surah><verse> with three digits each (https://tanzil.net/res/audio/afasy/019032.mp3 is 19:32).
# Tanzil credits the recitations to the Verse By Verse Quran Project. The addresses are listed here; nothing on the site plays them yet,
# and Tanzil's terms for using its audio files from another site are not published, so check them before using these.
VOICE_URL = "https://tanzil.net/res/audio/afasy/{surah:03d}{ayat:03d}.mp3"


def write_voice(counts):
    lines = [
        "# Voice: recitation audio, one mp3 per verse (Mishary Alafasy, via Tanzil.net)",
        "",
        "```",
        "Source: https://tanzil.net/res/audio/afasy/ (Tanzil credits the Verse By Verse Quran Project for the recitations).",
        "These are links to Tanzil's server, not copies of the audio. Check the terms of use before playing them from another site.",
        "```",
        "",
    ]
    for surah in sorted(counts):
        if surah != 1:
            lines.append("")
        lines += [f"{surah}:{ayat} {VOICE_URL.format(surah=surah, ayat=ayat)}" for ayat in range(1, counts[surah] + 1)]
    (ROOT / "data" / "voice.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def main():
    raw = Path(sys.argv[1])
    (ROOT / "data").mkdir(exist_ok=True)
    counts = {}
    for src, dst, title, strip in FILES:
        verses = convert(raw / src, ROOT / "data" / dst, title, strip)
        for s, a, _ in verses:
            counts[s] = max(counts.get(s, 0), a)

    write_voice(counts)

    meta = (raw / "meta.js").read_text(encoding="utf-8")
    suras = re.findall(r"\[(\d+), (\d+), (\d+), (\d+), '([^']*)', \"([^\"]*)\", '([^']*)', '(\w+)'\]", meta)
    assert len(suras) == 114, len(suras)
    start = meta.index("QuranData.Juz")
    juz_block = meta[start: meta.index("];", start)]
    juz = [[int(a), int(b)] for a, b in re.findall(r"\[(\d+), (\d+)\]", juz_block)]
    assert len(juz) == 31 and juz[30] == [115, 1], juz[-2:]   # Tanzil ends the list with [115, 1] as an end marker
    juz = juz[:30]

    names = {n[0]: n for n in json.loads((ROOT / "tools" / "surah-names-id.json").read_text(encoding="utf-8"))}
    out = []
    for i, (_start, ayas, order, _rukus, ar, _tname, ename, kind) in enumerate(suras, start=1):
        assert int(ayas) == counts[i], f"surah {i}: {ayas} in metadata, {counts[i]} in the text"
        _, name, meaning_id, slug = names[i]
        start_juz = max(j for j, (s, a) in enumerate(juz, start=1) if (s, a) <= (i, 1))
        out.append({
            "no": i, "slug": slug, "name": name, "arabic": ar,
            "meaning": {"id": meaning_id, "en": ename},
            "type": kind.lower(), "ayat": int(ayas), "order": int(order), "juz": start_juz,
        })
    doc = {"surahs": out, "juz": [{"juz": j, "surah": s, "ayat": a} for j, (s, a) in enumerate(juz, start=1)]}
    (ROOT / "data" / "surahs.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("wrote data/*.md (incl. voice.md) and data/surahs.json:", len(out), "surahs,", sum(counts.values()), "verses")


if __name__ == "__main__":
    main()
