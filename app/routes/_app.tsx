import { useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router";
import { AppBar, APP_BAR_HEIGHT } from "~/components/AppBar";
import { ToastProvider } from "~/components/Toast";
import { isLang, t, type Lang } from "~/lib/i18n";
import { parseRef, surahPath } from "~/lib/surahs";

/** What the layout hands to the pages: the text typed in the header search. */
export type AppContext = { query: string };

export default function AppLayout() {
  const { lang: param } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const lang: Lang = isLang(param) ? param : "id";
  // the same page in the other language: swap the first part of the address (the hash is added by the browser link)
  // (the server sees "/id/" where the browser sees "/id", so the trailing slash is dropped)
  const rest = isLang(param) ? pathname.replace(/^\/[^/]+/, "").replace(/\/$/, "") : "";
  const isHome = isLang(param) && rest === "";
  // a verse's picture page (/id/al-alaq/1) and the shalat page (/id/shalat) have the home page's header: the floating pill over a teal banner
  const hasBanner = isHome || rest === "/shalat" || (isLang(param) && /^\/[^/]+\/\d+$/.test(rest));
  const alternates = { id: `/id${rest}`, en: `/en${rest}` };
  const ref = parseRef(query);
  return (
    <ToastProvider>
      <AppBar
        lang={lang}
        alternates={alternates}
        query={query}
        pill={hasBanner}
        onQueryChange={(value) => {
          setQuery(value);
          // typing on another page shows the filtered list (the header and what was typed stay)
          if (value && !isHome) navigate(`/${lang}`);
        }}
        onSearchSubmit={() => {
          if (!ref) return;
          setQuery("");
          navigate(surahPath(lang, ref.surah, ref.ayat));
        }}
      />
      {/* a banner runs under the header; every other page starts below it */}
      {!hasBanner && <div style={{ height: APP_BAR_HEIGHT }} aria-hidden="true" />}
      <Outlet context={{ query } satisfies AppContext} />
      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-muted">{rest === "/shalat" ? t(lang).shalat.credit : t(lang).credit}</footer>
    </ToastProvider>
  );
}
