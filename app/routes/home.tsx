import { useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router";
import { Banner } from "~/components/Banner";
import { Icon } from "~/components/Icon";
import { SurahBrowser, type BrowseTab } from "~/components/SurahBrowser";
import { Tabs } from "~/components/Tabs";
import { pageMeta } from "~/lib/head";
import { isLang, t } from "~/lib/i18n";
import { parseRef, surahPath } from "~/lib/surahs";
import type { AppContext } from "./_app";
import NotFound from "./not-found";

export const meta = ({ params }: { params: Record<string, string | undefined> }) => {
  if (!isLang(params.lang)) return [{ title: "quran.situs.id" }];
  const s = t(params.lang);
  return pageMeta({ title: s.htmlTitle, description: s.homeDescription, lang: params.lang, path: "" });
};

export default function Home() {
  const { lang } = useParams();
  const navigate = useNavigate();
  const { query } = useOutletContext<AppContext>();
  const [tab, setTab] = useState<BrowseTab>("surah");
  const [descending, setDescending] = useState(false);
  if (!isLang(lang)) return <NotFound />;
  const s = t(lang);
  const ref = parseRef(query);

  return (
    <main>
      <Banner className="pt-28 pb-10">
        <h1 className="text-3xl font-bold tracking-tight">{s.heading}</h1>
        <p className="mt-2 text-sm leading-relaxed text-banner-ink/80">
          {s.bannerCredit[0]}
          <br />
          {s.bannerCredit[1]}
        </p>
      </Banner>
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
