// Every address that gets its own pre-rendered HTML file (react-router.config.ts) and a line in sitemap.xml (postbuild.ts).
// Keep in step with app/routes.ts.
import { readFileSync } from "node:fs";

export const LANGS = ["id", "en"] as const;

const root = new URL("../", import.meta.url);

export function publicPaths(): string[] {
  const { surahs } = JSON.parse(readFileSync(new URL("data/surahs.json", root), "utf8")) as {
    surahs: { slug: string; ayat: number }[];
  };
  // /id, /id/shalat, /id/<surah>, and the picture page of every verse: /id/<surah>/<verse>
  return [
    "/",
    ...LANGS.flatMap((lang) => [
      `/${lang}`,
      `/${lang}/shalat`,
      ...surahs.flatMap((s) => [
        `/${lang}/${s.slug}`,
        ...Array.from({ length: s.ayat }, (_, i) => `/${lang}/${s.slug}/${i + 1}`),
      ]),
    ]),
  ];
}

/** Addresses for the sitemap: the "/" page only redirects, so it is left out. */
export const sitemapPaths = () => publicPaths().filter((p) => p !== "/");
