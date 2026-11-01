import { Outlet, useLocation, useParams } from "react-router";
import { AppBar } from "~/components/AppBar";
import { ToastProvider } from "~/components/Toast";
import { isLang, t, type Lang } from "~/lib/i18n";

export default function AppLayout() {
  const { lang: param } = useParams();
  const { pathname } = useLocation();
  const lang: Lang = isLang(param) ? param : "id";
  // the same page in the other language: swap the first part of the address (the hash is added by the browser link)
  // (the server sees "/id/" where the browser sees "/id", so the trailing slash is dropped)
  const rest = isLang(param) ? pathname.replace(/^\/[^/]+/, "").replace(/\/$/, "") : "";
  const alternates = { id: `/id${rest}`, en: `/en${rest}` };
  return (
    <ToastProvider>
      <AppBar lang={lang} alternates={alternates} />
      <Outlet />
      <footer className="mx-auto max-w-3xl px-4 py-10 text-center text-xs text-muted">{t(lang).credit}</footer>
    </ToastProvider>
  );
}
