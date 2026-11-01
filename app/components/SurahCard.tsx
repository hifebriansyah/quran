import { Link } from "react-router";
import { t, type Lang } from "~/lib/i18n";
import { surahPath, type Surah } from "~/lib/surahs";

export type SurahCardProps = { surah: Surah; lang: Lang };

export function SurahCard({ surah, lang }: SurahCardProps) {
  const s = t(lang);
  return (
    <Link
      to={surahPath(lang, surah)}
      className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 transition hover:-translate-y-0.5 hover:border-accent"
    >
      <span className="grid size-9 flex-none place-items-center rounded-lg bg-bg text-sm font-semibold text-muted">
        {surah.no}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{surah.name}</span>
        <span className="block truncate text-xs text-muted">
          {surah.meaning[lang]} · {s.verses(surah.ayat)}
        </span>
      </span>
      <span lang="ar" dir="rtl" className="font-arab text-2xl leading-none text-accent-text">
        {surah.arabic}
      </span>
    </Link>
  );
}
