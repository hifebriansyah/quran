// Reads the verses from data/*.md. Server only: it runs when the site is built (each surah route's loader), so a page ships
// with its own surah and not the whole Quran. Each file has one line per verse: "<surah>:<verse> <text>".
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Lang } from "./i18n";

// data/ sits two folders up from this file in the source (app/lib) and from the server bundle (build/server); the working folder is the fallback.
const DATA = [fileURLToPath(new URL("../../data/", import.meta.url)), join(process.cwd(), "data")].find((d) =>
  existsSync(join(d, "arabic.md")),
)!;

const LINE = /^(\d+):(\d+) (.*)$/;
const cache = new Map<string, Map<number, string[]>>();

function load(file: string) {
  let bySurah = cache.get(file);
  if (!bySurah) {
    bySurah = new Map();
    for (const raw of readFileSync(join(DATA, file), "utf8").split("\n")) {
      const m = raw.match(LINE);
      if (!m) continue;
      const list = bySurah.get(Number(m[1])) ?? [];
      list[Number(m[2]) - 1] = m[3];
      bySurah.set(Number(m[1]), list);
    }
    cache.set(file, bySurah);
  }
  return bySurah;
}

export type Verse = { n: number; arabic: string; latin: string; text: string };
export type SurahText = { bismillah: string | null; verses: Verse[] };

const TRANSLATION: Record<Lang, string> = { id: "indonesia.md", en: "english.md" };
// the Latin line follows the page language too: Indonesian style (Kemenag) on /id/, Tanzil's English style on /en/
const LATIN: Record<Lang, string> = { id: "latin-id.md", en: "latin.md" };

const surahCache = new Map<string, SurahText>();

export function readSurah(no: number, lang: Lang): SurahText {
  const key = `${no}:${lang}`;
  const cached = surahCache.get(key);
  if (cached) return cached;
  const result = readSurahUncached(no, lang);
  surahCache.set(key, result);
  return result;
}

function readSurahUncached(no: number, lang: Lang): SurahText {
  const arabic = load("arabic.md").get(no)!;
  const latin = load(LATIN[lang]).get(no)!;
  const text = load(TRANSLATION[lang]).get(no)!;
  // Tanzil's Arabic file puts the bismillah in front of verse 1 of every surah except 1 (where it is verse 1) and 9 (which has none).
  // The page shows it once, above the verses, so the first four words are split off here. Its text is verse 1 of surah 1.
  // Words, not exact letters: in surahs 95 and 97 Tanzil's copy has an extra shadda mark on the first word.
  const bismillah = load("arabic.md").get(1)![0];
  const letters = (w: string) => w.replace(/\p{M}/gu, "");
  const expected = bismillah.split(" ").map(letters).join(" ");
  let bismillahShown: string | null = null;
  const verses = arabic.map((ar, i) => {
    let a = ar;
    if (i === 0 && no !== 1 && no !== 9) {
      const words = a.split(" ");
      if (words.slice(0, 4).map(letters).join(" ") !== expected)
        throw new Error(`surah ${no}: verse 1 does not start with the bismillah`);
      a = words.slice(4).join(" ");
      bismillahShown = bismillah;
    }
    return { n: i + 1, arabic: a, latin: latin[i], text: text[i] };
  });
  return { bismillah: bismillahShown, verses };
}
