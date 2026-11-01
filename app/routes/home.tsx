import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Icon } from "~/components/Icon";
import { SearchBox } from "~/components/SearchBox";
import { SurahBrowser, type BrowseTab } from "~/components/SurahBrowser";
import { Tabs } from "~/components/Tabs";
import { pageMeta } from "~/lib/head";
import { isLang, t } from "~/lib/i18n";
import { parseRef, surahPath } from "~/lib/surahs";
import NotFound from "./not-found";

export const meta = ({ params }: { params: Record<string, string | undefined> }) => {
  if (!isLang(params.lang)) return [{ title: "quran.situs.id" }];
  const s = t(params.lang);
  return pageMeta({ title: s.htmlTitle, description: s.homeDescription, lang: params.lang, path: "" });
};

export default function Home() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<BrowseTab>("surah");
  const [descending, setDescending] = useState(false);
  if (!isLang(lang)) return <NotFound />;
  const s = t(lang);
  const ref = parseRef(query);

  return (
    <main>
      <section className="bg-gradient-to-br from-banner-from to-banner-to text-white">
        <div className="mx-auto max-w-5xl px-4 pt-8 pb-10">
          <h1 className="text-3xl font-bold tracking-tight">{s.heading}</h1>
          <div className="mt-5 max-w-lg">
            <SearchBox
              value={query}
              onChange={setQuery}
              onSubmit={() => ref && navigate(surahPath(lang, ref.surah, ref.ayat))}
              placeholder={s.search}
              label={s.searchLabel}
            />
            <p className="mt-2 text-xs text-white/70">{s.hint}</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { id: "surah", label: s.tabs.surah },
              { id: "juz", label: s.tabs.juz },
              { id: "order", label: s.tabs.order },
            ]}
          />
          <button
            onClick={() => setDescending(!descending)}
            aria-label={s.sortLabel}
            className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-muted hover:bg-line/60"
          >
            {descending ? s.sortDesc : s.sortAsc}
            <Icon name={descending ? "chevronDown" : "chevronUp"} />
          </button>
        </div>
        {ref && (
          <button
            onClick={() => navigate(surahPath(lang, ref.surah, ref.ayat))}
            className="mb-4 flex w-full items-center justify-between rounded-2xl border border-accent bg-card p-3 text-left font-medium"
          >
            {s.goTo(ref.surah.name, ref.ayat)}
            <Icon name="chevronRight" />
          </button>
        )}
        <SurahBrowser lang={lang} tab={tab} query={ref ? "" : query} descending={descending} />
      </section>
    </main>
  );
}
