import { filterSurahs, surahs as allSurahs, type Surah } from "~/lib/surahs";
import { t, type Lang } from "~/lib/i18n";
import { SurahCard } from "./SurahCard";

export type BrowseTab = "surah" | "juz" | "order";

export type SurahBrowserProps = {
  lang: Lang;
  tab: BrowseTab;
  query: string;
  /** false = A-Z (1 to 114, juz 1 to 30, first revealed first), true = the other way round */
  descending: boolean;
  surahs?: Surah[];
};

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
);

/** The surah cards for a tab: all in order, grouped by the juz they start in, or in the order they were revealed. */
export function SurahBrowser({ lang, tab, query, descending, surahs = allSurahs }: SurahBrowserProps) {
  const s = t(lang);
  const found = filterSurahs(surahs, query, lang);
  const dir = descending ? -1 : 1;

  if (!found.length) return <p className="py-12 text-center text-muted">{s.noResult}</p>;

  if (tab === "juz") {
    const groups = new Map<number, Surah[]>();
    for (const x of [...found].sort((a, b) => a.no - b.no)) groups.set(x.juz, [...(groups.get(x.juz) ?? []), x]);
    return (
      <div className="space-y-6">
        {[...groups]
          .sort((a, b) => (a[0] - b[0]) * dir)
          .map(([juz, list]) => (
            <section key={juz}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{s.juz(juz)}</h2>
              <Grid>
                {list.map((x) => (
                  <SurahCard key={x.no} surah={x} lang={lang} />
                ))}
              </Grid>
            </section>
          ))}
      </div>
    );
  }

  const sorted = [...found].sort((a, b) => (tab === "order" ? a.order - b.order : a.no - b.no) * dir);
  return (
    <Grid>
      {sorted.map((x) => (
        <SurahCard key={x.no} surah={x} lang={lang} />
      ))}
    </Grid>
  );
}
