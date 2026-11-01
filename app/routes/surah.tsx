import { useParams } from "react-router";
import type { Route } from "./+types/surah";
import { AyahItem } from "~/components/AyahItem";
import { SurahHeader } from "~/components/SurahHeader";
import { SurahNav } from "~/components/SurahNav";
import { pageMeta } from "~/lib/head";
import { isLang, t } from "~/lib/i18n";
import { readSurah } from "~/lib/quran.server";
import { useShare } from "~/lib/share";
import { surahBySlug, surahPath } from "~/lib/surahs";
import NotFound from "./not-found";

// Runs when the site is built (and in `npm run dev`): the page carries only its own surah.
export function loader({ params }: Route.LoaderArgs) {
  const surah = surahBySlug(params.slug);
  if (!isLang(params.lang) || !surah) throw new Response("Not found", { status: 404 });
  return readSurah(surah.no, params.lang);
}

export const meta = ({ params }: { params: Record<string, string | undefined> }) => {
  const surah = surahBySlug(params.slug);
  if (!isLang(params.lang) || !surah) return [{ title: "quran.situs.id" }];
  const s = t(params.lang);
  return pageMeta({
    title: s.surahTitle(surah.name),
    description: s.surahDescription(surah.name, surah.meaning[params.lang], surah.ayat),
    lang: params.lang,
    path: `/${surah.slug}`,
  });
};

// An unknown surah (an address that is not pre-rendered) shows the same page as any other unknown address, inside the layout.
export function ErrorBoundary() {
  return <NotFound />;
}

export default function SurahPage({ loaderData }: Route.ComponentProps) {
  const { lang, slug } = useParams();
  const surah = surahBySlug(slug);
  const l = isLang(lang) ? lang : "id";
  const { copy, share } = useShare(l);
  if (!isLang(lang) || !surah) return <NotFound />;
  const s = t(lang);
  const { bismillah, verses } = loaderData;

  return (
    <>
      <SurahNav lang={lang} surah={surah} />
      <main className="mx-auto max-w-3xl px-4">
        <SurahHeader lang={lang} surah={surah} bismillah={bismillah} />
        {verses.map((v) => (
          <AyahItem
            key={v.n}
            lang={lang}
            {...v}
            onCopy={() => copy(`${v.arabic}\n${v.text}\n— ${surah.name}: ${v.n}`, s.copied)}
            onShare={() => share(surahPath(lang, surah, v.n), `${surah.name}: ${v.n}`)}
          />
        ))}
      </main>
    </>
  );
}
