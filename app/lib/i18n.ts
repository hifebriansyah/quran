// The two page languages. The Arabic text is on every page; the language picks the translation and the interface.
export type Lang = "id" | "en";
export const LANGS: Lang[] = ["id", "en"];
export const isLang = (s: string | undefined): s is Lang => s === "id" || s === "en";

const dict = {
  id: {
    htmlTitle: "Al-Qur'an Online: Arab, Latin dan Terjemah",
    heading: "Al-Qur'an",
    search: "Nama/nomor surah, atau 2:124",
    searchLabel: "Cari surah",
    hint: "Contoh: Yasin, 36, atau 2:124 untuk Al-Baqarah ayat 124",
    goTo: (surah: string, ayat: number) => `Buka ${surah} ayat ${ayat}`,
    tabs: { surah: "Surah", juz: "Juz", order: "Urutan Turun" },
    sortAsc: "A-Z",
    sortDesc: "Z-A",
    sortLabel: "Ubah urutan",
    verses: (n: number) => `${n} ayat`,
    juz: (n: number) => `Juz ${n}`,
    meccan: "Makkiyah",
    medinan: "Madaniyah",
    surah: "Surah",
    noResult: "Tidak ada surah yang cocok.",
    allSurahs: "Daftar Surah",
    pickVerse: "Pilih Ayat",
    verse: (n: number) => `Ayat ${n}`,
    prev: "Surah sebelumnya",
    next: "Surah berikutnya",
    copy: "Salin ayat",
    share: "Bagikan ayat",
    copied: "Ayat disalin",
    linkCopied: "Tautan disalin",
    copyFailed: "Gagal menyalin",
    theme: "Ganti tema",
    language: "Bahasa",
    notFoundTitle: "Tidak ditemukan",
    notFoundText: "Halaman yang dicari tidak ada.",
    home: "Ke daftar surah",
    surahDescription: (name: string, meaning: string, ayat: number) =>
      `Surah ${name} (${meaning}), ${ayat} ayat. Baca teks Arab, Latin dan terjemahan Indonesia.`,
    surahTitle: (name: string) => `Surah ${name}: Arab, Latin dan Terjemah`,
    homeDescription:
      "Baca Al-Qur'an online: 114 surah dengan teks Arab, Latin dan terjemahan Indonesia, per surah, juz dan urutan turun.",
    credit:
      "Teks Arab dari Tanzil.net (CC BY 3.0). Terjemahan Indonesia: Kementerian Agama RI. Latin: transliterasi bahasa Inggris dari Tanzil.net.",
  },
  en: {
    htmlTitle: "Quran Online: Arabic, Transliteration and Translation",
    heading: "The Quran",
    search: "Surah name/number, or 2:124",
    searchLabel: "Search surahs",
    hint: "Example: Yasin, 36, or 2:124 for Al-Baqarah verse 124",
    goTo: (surah: string, ayat: number) => `Open ${surah} verse ${ayat}`,
    tabs: { surah: "Surah", juz: "Juz", order: "Revelation order" },
    sortAsc: "A-Z",
    sortDesc: "Z-A",
    sortLabel: "Change order",
    verses: (n: number) => `${n} verses`,
    juz: (n: number) => `Juz ${n}`,
    meccan: "Meccan",
    medinan: "Medinan",
    surah: "Surah",
    noResult: "No surah matches.",
    allSurahs: "All surahs",
    pickVerse: "Go to verse",
    verse: (n: number) => `Verse ${n}`,
    prev: "Previous surah",
    next: "Next surah",
    copy: "Copy verse",
    share: "Share verse",
    copied: "Verse copied",
    linkCopied: "Link copied",
    copyFailed: "Could not copy",
    theme: "Switch theme",
    language: "Language",
    notFoundTitle: "Not found",
    notFoundText: "That page does not exist.",
    home: "Go to the surah list",
    surahDescription: (name: string, meaning: string, ayat: number) =>
      `Surah ${name} (${meaning}), ${ayat} verses. Read the Arabic text, transliteration and English translation.`,
    surahTitle: (name: string) => `Surah ${name}: Arabic, Transliteration and Translation`,
    homeDescription:
      "Read the Quran online: 114 surahs with the Arabic text, transliteration and English translation, by surah, juz and revelation order.",
    credit: "Arabic text from Tanzil.net (CC BY 3.0). English translation: Saheeh International. Transliteration: Tanzil.net.",
  },
} as const;

export type Strings = (typeof dict)["id"] | (typeof dict)["en"];
export const t = (lang: Lang): Strings => dict[lang];
