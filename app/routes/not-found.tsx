import { Link, useParams } from "react-router";
import { isLang, t } from "~/lib/i18n";

export const meta = () => [{ title: "quran.situs.id" }, { name: "robots", content: "noindex" }];

export default function NotFound() {
  const { lang } = useParams();
  const l = isLang(lang) ? lang : "id";
  const s = t(l);
  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">{s.notFoundTitle}</h1>
      <p className="mt-2 text-muted">{s.notFoundText}</p>
      <p className="mt-6">
        <Link to={`/${l}`} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink">
          {s.home}
        </Link>
      </p>
    </main>
  );
}
