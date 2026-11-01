import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { Route } from "./+types/ayat";
import { AyatCanvas } from "~/components/AyatCanvas";
import { Icon } from "~/components/Icon";
import { Banner } from "~/components/Banner";
import { pageMeta } from "~/lib/head";
import { isLang, t } from "~/lib/i18n";
import { ayatImage, IMAGE_SIZE } from "~/lib/images";
import { readSurah } from "~/lib/quran.server";
import { useShare } from "~/lib/share";
import { ayatPath, neighbourVerse, surahBySlug, surahPath } from "~/lib/surahs";
import NotFound from "./not-found";

const verseOf = (slug: string | undefined, n: string | undefined) => {
  const surah = surahBySlug(slug);
  const verse = Number(n);
  return surah && Number.isInteger(verse) && verse >= 1 && verse <= surah.ayat ? { surah, verse } : null;
};

// Runs when the site is built (and in `npm run dev`): the verse's Arabic and translation, for the picture drawn in the page.
export function loader({ params }: Route.LoaderArgs) {
  const found = verseOf(params.slug, params.n);
  if (!isLang(params.lang) || !found) throw new Response("Not found", { status: 404 });
  const { arabic, text } = readSurah(found.surah.no, params.lang).verses[found.verse - 1];
  return { arabic, text };
}

export const meta = ({ params }: { params: Record<string, string | undefined> }) => {
  const found = verseOf(params.slug, params.n);
  if (!isLang(params.lang) || !found) return [{ title: "quran.situs.id" }];
  const { surah, verse } = found;
  const s = t(params.lang);
  const ref = `${surah.name} ${surah.no}:${verse}`;
  return pageMeta({
    title: ref,
    description: s.verseImageDescription(verse, surah.name, surah.meaning[params.lang]),
    lang: params.lang,
    path: `/${surah.slug}/${verse}`,
    // Link previews need a real file: the light JPG in R2, whatever theme the person who shares the link uses. The page itself draws
    // the picture in a canvas, light or dark.
    image: { url: ayatImage(params.lang, surah.slug, verse), width: IMAGE_SIZE, height: IMAGE_SIZE, alt: ref },
  });
};

/** The page of one verse's picture: the home page's header (floating pill over the teal banner) with only the back button in the banner, the picture, share, and the previous and next verse. */
export default function AyatPage({ loaderData }: Route.ComponentProps) {
  const { lang, slug, n } = useParams();
  const navigate = useNavigate();
  const found = verseOf(slug, n);
  const l = isLang(lang) ? lang : "id";
  const { share } = useShare(l);
  const prev = found && neighbourVerse(found.surah, found.verse, -1);
  const next = found && neighbourVerse(found.surah, found.verse, 1);

  // Arrow keys move between verses
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select") || e.metaKey || e.ctrlKey) return;
      const to = e.key === "ArrowLeft" ? prev : e.key === "ArrowRight" ? next : null;
      if (to) navigate(ayatPath(l, to.surah, to.n));
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [prev, next, navigate, l]);

  if (!isLang(lang) || !found) return <NotFound />;
  const { surah, verse } = found;
  const s = t(lang);
  const ref = `${surah.name} ${surah.no}:${verse}`;
  const pill = "flex items-center gap-1.5 rounded-2xl border border-line bg-card p-3 text-sm font-semibold hover:border-accent";

  return (
    <>
      <Banner className="pt-28 pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{s.heading}</h1>
        <Link
          to={surahPath(lang, surah, verse)}
          className="-ml-2 mt-3 inline-flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 text-sm font-semibold hover:bg-banner-ink/10"
        >
          <Icon name="arrowLeft" />
          <span className="truncate">{s.backToVerse(`${surah.name} ${verse}`)}</span>
        </Link>
      </Banner>
      <main className="mx-auto max-w-5xl px-4 pt-5 pb-6">
        <AyatCanvas arabic={loaderData.arabic} text={loaderData.text} n={verse} reference={ref} />
        <button
          onClick={() => share(ayatPath(lang, surah, verse), ref)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-line bg-card px-4 py-3 font-semibold hover:border-accent"
        >
          <Icon name="share" /> {s.share}
        </button>
        <nav className="mt-3 grid grid-cols-2 gap-3">
          {prev ? (
            <Link to={ayatPath(lang, prev.surah, prev.n)} aria-label={s.prevVerse} className={pill}>
              <Icon name="chevronLeft" /> {prev.surah.no}:{prev.n}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link to={ayatPath(lang, next.surah, next.n)} aria-label={s.nextVerse} className={`${pill} justify-end`}>
              {next.surah.no}:{next.n} <Icon name="chevronRight" />
            </Link>
          )}
        </nav>
      </main>
    </>
  );
}
