import { Link, useNavigate } from "react-router";
import { t, type Lang } from "~/lib/i18n";
import { surahByNo, surahPath, surahs, type Surah } from "~/lib/surahs";
import { Icon } from "./Icon";

export type SurahNavProps = { lang: Lang; surah: Surah };

const arrow = "flex min-w-0 items-center gap-1 rounded-full px-2 py-1.5 text-sm hover:bg-line/60";
const select =
  "max-w-[9rem] cursor-pointer appearance-none rounded-full border border-line bg-card py-1.5 pr-7 pl-3 text-sm font-medium text-ink";

function Select({ children, ...props }: React.ComponentProps<"select">) {
  return (
    <span className="relative inline-flex items-center">
      <select {...props} className={select}>
        {children}
      </select>
      <Icon name="chevronDown" className="pointer-events-none absolute right-2.5 text-muted" />
    </span>
  );
}

/**
 * Under the app bar on a surah page: the list at the left, and at the right edge the group of previous surah, surah picker, verse picker
 * and next surah.
 */
export function SurahNav({ lang, surah }: SurahNavProps) {
  const s = t(lang);
  const navigate = useNavigate();
  const prev = surahByNo(surah.no - 1);
  const next = surahByNo(surah.no + 1);
  return (
    <div className="sticky top-[3.5rem] z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-2">
        <Link to={`/${lang}`} className={`${arrow} text-muted`}>
          <Icon name="grid" />
          <span className="hidden sm:inline">{s.allSurahs}</span>
        </Link>
        <span className="ml-auto flex min-w-0 items-center gap-1">
          {prev ? (
            <Link to={surahPath(lang, prev)} aria-label={s.prev} className={`${arrow} text-muted`}>
              <Icon name="chevronLeft" />
              <span className="hidden truncate sm:inline">{prev.name}</span>
            </Link>
          ) : (
            <span className="w-8" />
          )}
          <Select aria-label={s.surah} value={surah.slug} onChange={(e) => navigate(`/${lang}/${e.target.value}`)}>
            {surahs.map((x) => (
              <option key={x.no} value={x.slug}>
                {x.no}. {x.name}
              </option>
            ))}
          </Select>
          <Select
            aria-label={s.pickVerse}
            value=""
            onChange={(e) => {
              if (e.target.value) navigate({ hash: `#ayat-${e.target.value}` });
            }}
          >
            <option value="">{s.pickVerse}</option>
            {Array.from({ length: surah.ayat }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1}
              </option>
            ))}
          </Select>
          {next ? (
            <Link to={surahPath(lang, next)} aria-label={s.next} className={`${arrow} text-muted`}>
              <span className="hidden truncate sm:inline">{next.name}</span>
              <Icon name="chevronRight" />
            </Link>
          ) : (
            <span className="w-8" />
          )}
        </span>
      </div>
    </div>
  );
}
