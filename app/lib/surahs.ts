// The surah list: names, meanings, where it was revealed, order, juz. Built by tools/make_data.py into data/surahs.json.
import data from "../../data/surahs.json";
import type { Lang } from "./i18n";

export type Surah = {
  no: number;
  slug: string;
  name: string;
  arabic: string;
  meaning: Record<Lang, string>;
  type: "meccan" | "medinan";
  ayat: number;
  order: number;
  juz: number;
};

export const surahs = data.surahs as Surah[];
/** Where each juz starts: [{ juz, surah, ayat }] */
export const juzStarts = data.juz;

export const surahBySlug = (slug: string | undefined) => surahs.find((s) => s.slug === slug);
export const surahByNo = (no: number) => surahs.find((s) => s.no === no);

/** The page of a verse's picture: /id/al-alaq/1 */
export const ayatPath = (lang: Lang, s: Surah, n: number) => `/${lang}/${s.slug}/${n}`;

/** The verse before or after this one, going on into the next surah (and back into the previous one). */
export function neighbourVerse(s: Surah, n: number, step: -1 | 1): { surah: Surah; n: number } | null {
  if (step === 1) {
    if (n < s.ayat) return { surah: s, n: n + 1 };
    const next = surahByNo(s.no + 1);
    return next ? { surah: next, n: 1 } : null;
  }
  if (n > 1) return { surah: s, n: n - 1 };
  const prev = surahByNo(s.no - 1);
  return prev ? { surah: prev, n: prev.ayat } : null;
}

export const site = {
  name: "quran.situs.id",
  url: "https://quran.situs.id",
};

export const surahPath = (lang: Lang, s: Surah, ayat?: number) => `/${lang}/${s.slug}${ayat ? `#ayat-${ayat}` : ""}`;

// "Al-Ma'idah", "al-maidah", "Al Maidah" and "almaidah" all look the same to the search.
const plain = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

/** "2:124" or "2 124": a surah and a verse that exists. */
export function parseRef(query: string): { surah: Surah; ayat: number } | null {
  const m = query.trim().match(/^(\d{1,3})\s*[:\s.]\s*(\d{1,3})$/);
  if (!m) return null;
  const surah = surahByNo(Number(m[1]));
  const ayat = Number(m[2]);
  return surah && ayat >= 1 && ayat <= surah.ayat ? { surah, ayat } : null;
}

/** Surahs matching what was typed: a number (36), or part of the name, the slug or the meaning in this language. */
export function filterSurahs(list: Surah[], query: string, lang: Lang): Surah[] {
  const q = query.trim();
  if (!q) return list;
  if (/^\d+$/.test(q)) return list.filter((s) => String(s.no) === q);
  const needle = plain(q);
  if (!needle) return list;
  return list.filter((s) => [s.name, s.slug, s.meaning[lang], s.meaning.en].some((v) => plain(v).includes(needle)));
}

/** Arabic-Indic digits for the verse number: 12 -> ١٢ */
export const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));
