import { Navigate } from "react-router";
import { pageMeta } from "~/lib/head";
import { t } from "~/lib/i18n";

const BASE = import.meta.env.BASE_URL;

// "/" is a real page (GitHub Pages cannot redirect), so it carries the redirect itself: for browsers without JavaScript a
// <meta refresh>, for the rest <Navigate>.
export const meta = () => {
  const s = t("id");
  return [
    // the same preview as /id/ (title, description, picture, canonical address): a link to the bare domain is shared as often as /id/,
    // and Facebook and others do not follow a <meta refresh> to find the tags
    ...pageMeta({ title: s.htmlTitle, description: s.homeDescription, lang: "id", path: "" }),
    { "http-equiv": "refresh", content: `0; url=${BASE}id/` },
  ];
};

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
