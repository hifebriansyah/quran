import { t, type Lang } from "~/lib/i18n";
import type { Surah } from "~/lib/surahs";

export type SurahHeaderProps = { lang: Lang; surah: Surah; bismillah: string | null };

export function SurahHeader({ lang, surah, bismillah }: SurahHeaderProps) {
  const s = t(lang);
  return (
    <header className="py-10 text-center">
      <p className="text-xs text-muted">
        {surah.type === "meccan" ? s.meccan : s.medinan} · {s.juz(surah.juz)} · {s.verses(surah.ayat)}
      </p>
      <p lang="ar" dir="rtl" className="mt-4 font-arab text-5xl leading-tight text-accent">
        {surah.arabic}
      </p>
      <h1 className="mt-2 text-2xl font-bold">{surah.name}</h1>
      <p className="text-sm text-muted">{surah.meaning[lang]}</p>
      {bismillah && (
        <p lang="ar" dir="rtl" className="mt-8 font-arab text-3xl leading-[2.2] sm:text-4xl">
          {bismillah}
        </p>
      )}
    </header>
  );
}
