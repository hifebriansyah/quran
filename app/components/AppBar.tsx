import { useEffect, useState } from "react";
import { Link } from "react-router";
import { LANGS, t, type Lang } from "~/lib/i18n";
import { Icon } from "./Icon";
import { SearchBox } from "./SearchBox";
import { ThemeToggle } from "./ThemeToggle";

const LOGO = `${import.meta.env.BASE_URL}assets/logo.svg`;

export type AppBarProps = {
  lang: Lang;
  /** where the same page is in each language, e.g. { id: "/id/al-alaq", en: "/en/al-alaq" } */
  alternates: Record<Lang, string>;
  /** the search field */
  query: string;
  onQueryChange: (query: string) => void;
  onSearchSubmit?: () => void;
  /** the floating pill at the top of the page (the home page only); without it the header is always the full-width bar */
  pill?: boolean;
};

/** Height of the full-width bar: pages other than the home page leave this much room above their content. */
export const APP_BAR_HEIGHT = "3.5rem";

/**
 * The header is a full-width bar. On the home page (`pill`) it starts as an inset pill with a soft shadow floating over the banner, and
 * becomes the bar once the page is scrolled. It takes no room in the layout (h-0): pages leave APP_BAR_HEIGHT free above their content
 * (the home page's banner runs under it).
 */
export function AppBar({ lang, alternates, query, onQueryChange, onSearchSubmit, pill = false }: AppBarProps) {
  const s = t(lang);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(scrollY > 8);
    update();
    addEventListener("scroll", update, { passive: true });
    return () => removeEventListener("scroll", update);
  }, []);
  // the home page starts with the floating pill and turns into the bar once it is scrolled; every other page has the bar throughout
  const bar = !pill || scrolled;
  const isShalat = alternates[lang]?.endsWith("/shalat");

  return (
    <header className="sticky top-0 z-30 h-0">
      <div className={`absolute inset-x-0 top-0 transition-[padding] duration-200 ${bar ? "p-0" : "px-3 pt-3"}`}>
        <div
          className={`mx-auto bg-card/90 text-ink backdrop-blur transition-all duration-200 ${
            bar ? "max-w-none rounded-none border-b border-line shadow-sm" : "max-w-5xl rounded-full shadow-lg shadow-black/15"
          }`}
        >
          <div className="mx-auto flex max-w-5xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
            {/* the same box (size-9), text size (text-lg) and round hover background as the theme button on the right */}
            <Link
              to={`/${lang}`}
              aria-label={s.home}
              title={s.home}
              className="grid size-9 flex-none place-items-center rounded-full text-lg hover:bg-ink/10"
            >
              <img src={LOGO} alt="" width="16" height="18" className="h-[1em] w-auto" />
            </Link>
            <SearchBox
              value={query}
              onChange={onQueryChange}
              onSubmit={onSearchSubmit}
              placeholder={s.search}
              label={s.searchLabel}
              className="min-w-0 flex-1"
            />
            <nav aria-label={s.shalat.nav} className="flex h-9 flex-none items-center rounded-full bg-ink/10 p-1 text-base">
              {(
                [
                  { to: `/${lang}`, icon: "book", label: s.home, active: !isShalat },
                  { to: `/${lang}/shalat`, icon: "clock", label: s.shalat.nav, active: isShalat },
                ] as const
              ).map((item) => (
                <Link
                  key={item.icon}
                  to={item.to}
                  aria-label={item.label}
                  title={item.label}
                  aria-current={item.active ? "page" : undefined}
                  className={`grid h-full w-9 place-items-center rounded-full ${item.active ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
                >
                  <Icon name={item.icon} />
                </Link>
              ))}
            </nav>
            <nav
              aria-label={s.language}
              className="flex h-9 items-center rounded-full bg-ink/10 p-1 text-sm leading-5 font-semibold"
            >
              {LANGS.map((l) => (
                <Link
                  key={l}
                  to={alternates[l]}
                  hrefLang={l}
                  aria-current={l === lang ? "true" : undefined}
                  className={`flex h-full items-center rounded-full px-3 uppercase ${l === lang ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
                >
                  {l}
                </Link>
              ))}
            </nav>
            <ThemeToggle label={s.theme} />
          </div>
        </div>
      </div>
    </header>
  );
}
