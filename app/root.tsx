import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation } from "react-router";
import type { Route } from "./+types/root";
import { THEME_SCRIPT } from "./components/ThemeToggle";
import { isLang } from "./lib/i18n";
import splash from "./lib/splash.json";
import "./styles/app.css";

const BASE = import.meta.env.BASE_URL;

export const links: Route.LinksFunction = () => [
  { rel: "icon", type: "image/svg+xml", href: `${BASE}assets/logo.svg` },
  { rel: "icon", href: `${BASE}assets/favicon.ico`, sizes: "any" },
  { rel: "icon", type: "image/png", sizes: "32x32", href: `${BASE}assets/favicon-32.png` },
  { rel: "apple-touch-icon", href: `${BASE}assets/apple-touch-icon.png` },
  { rel: "manifest", href: `${BASE}assets/site.webmanifest` },
  // iPhones show a splash image only when one matches the screen exactly: all teal with a white logo (tools/build_assets.py)
  ...splash.map((s) => ({
    rel: "apple-touch-startup-image",
    href: `${BASE}assets/${s.file}`,
    media: `(device-width: ${s.width}px) and (device-height: ${s.height}px) and (-webkit-device-pixel-ratio: ${s.ratio}) and (orientation: portrait)`,
  })),
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Inter:wght@400;500;600;700&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const first = useLocation().pathname.split("/")[1];
  return (
    <html lang={isLang(first) ? first : "id"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#30c2b1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Quran" />
        {import.meta.env.VITE_BUILD_ID && <meta name="build-id" content={import.meta.env.VITE_BUILD_ID} />}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function HydrateFallback() {
  return <div className="p-10 text-center text-muted">…</div>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Error";
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">quran.situs.id</h1>
        <p className="mt-2 text-muted">{message}</p>
        <p className="mt-4">
          <a className="underline" href={`${BASE}id/`}>
            Al-Qur'an
          </a>
        </p>
      </div>
    </main>
  );
}
