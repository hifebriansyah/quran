import { useEffect } from "react";
import { useLocation, useParams } from "react-router";
import type { Route } from "./+types/surah";
import { AyahItem } from "~/components/AyahItem";
import { RecitationPlayer } from "~/components/RecitationPlayer";
import { SurahHeader } from "~/components/SurahHeader";
import { SurahNav } from "~/components/SurahNav";
import { useRecitation } from "~/lib/audio";
import { pageMeta } from "~/lib/head";
import { isLang, t } from "~/lib/i18n";
import { readSurah } from "~/lib/quran.server";
import { useShare } from "~/lib/share";
import { ayatPath, surahBySlug, surahPath } from "~/lib/surahs";
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
  const { hash } = useLocation();
  const surah = surahBySlug(slug);
  const l = isLang(lang) ? lang : "id";
  const { copy, share } = useShare(l);
  const { current, playing, time, toggle, pause, go, seek, stop } = useRecitation(surah?.no, surah?.ayat ?? 0);
  // The page is first drawn with a fallback font; when the Quran font arrives every verse above the one in the address changes height,
  // and the browser's own jump to the #ayat-N lands in the wrong place. Jump again once the fonts are in, unless the reader has already scrolled.
  useEffect(() => {
    const id = decodeURIComponent(hash.slice(1));
    if (!id) return;
    let moved = false;
    const stop = () => (moved = true);
    const events = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
    events.forEach((e) => addEventListener(e, stop, { passive: true, once: true }));
    document.fonts?.ready.then(() => {
      if (!moved) document.getElementById(id)?.scrollIntoView();
    });
    return () => events.forEach((e) => removeEventListener(e, stop));
  }, [hash, slug]);

  if (!isLang(lang) || !surah) return <NotFound />;
  const s = t(lang);
  const { bismillah, verses } = loaderData;

  return (
    <>
      <SurahNav lang={lang} surah={surah} />
      <main className={`mx-auto max-w-5xl px-4 ${current ? "pb-24" : ""}`}>
        <SurahHeader lang={lang} surah={surah} bismillah={bismillah} />
        {verses.map((v) => (
          <AyahItem
            key={v.n}
            lang={lang}
            {...v}
            imageHref={ayatPath(lang, surah, v.n)}
            playing={playing === v.n}
            onPlay={() => toggle(v.n)}
            onCopy={() => copy(`${v.arabic}\n${v.text}\n— ${surah.name}: ${v.n}`, s.copied)}
            onShare={() => share(surahPath(lang, surah, v.n), `${surah.name}: ${v.n}`)}
          />
        ))}
      </main>
      {current && (
        <RecitationPlayer
          lang={lang}
          n={current}
          ayat={surah.ayat}
          paused={playing === null}
          at={time.at}
          length={time.length}
          onPrev={() => go(current - 1)}
          onNext={() => go(current + 1)}
          onPause={pause}
          onSeek={seek}
          onClose={stop}
        />
      )}
    </>
  );
}
