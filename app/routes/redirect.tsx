import { Navigate } from "react-router";

const BASE = import.meta.env.BASE_URL;

// "/" is a real page (GitHub Pages cannot redirect), so it carries the redirect itself: for browsers without JavaScript a
// <meta refresh>, for the rest <Navigate>.
export const meta = () => [
  { title: "quran.situs.id" },
  { "http-equiv": "refresh", content: `0; url=${BASE}id/` },
  { name: "robots", content: "noindex" },
];

export default function Redirect() {
  return (
    <main className="grid min-h-dvh place-items-center p-6 text-center">
      <Navigate to="/id" replace />
      <p>
        <a className="underline" href={`${BASE}id/`}>
          Bahasa Indonesia
        </a>
        {" · "}
        <a className="underline" href={`${BASE}en/`}>
          English
        </a>
      </p>
    </main>
  );
}
