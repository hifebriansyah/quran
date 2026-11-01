import { Link } from "react-router";
import { LANGS, t, type Lang } from "~/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";

export type AppBarProps = {
  lang: Lang;
  /** where the same page is in each language, e.g. { id: "/id/al-alaq", en: "/en/al-alaq" } */
  alternates: Record<Lang, string>;
};

export function AppBar({ lang, alternates }: AppBarProps) {
  const s = t(lang);
  return (
    <header className="sticky top-0 z-30 bg-banner-from/95 text-white backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link to={`/${lang}`} className="mr-auto text-lg font-bold tracking-tight">
          quran<span className="text-accent">.situs.id</span>
        </Link>
        <nav aria-label={s.language} className="flex rounded-full bg-white/10 p-0.5 text-xs font-semibold">
          {LANGS.map((l) => (
            <Link
              key={l}
              to={alternates[l]}
              hrefLang={l}
              aria-current={l === lang ? "true" : undefined}
              className={`rounded-full px-3 py-1 uppercase ${l === lang ? "bg-white text-banner-from" : "text-white/80 hover:text-white"}`}
            >
              {l}
            </Link>
          ))}
        </nav>
        <ThemeToggle label={s.theme} />
      </div>
    </header>
  );
}
