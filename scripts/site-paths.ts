// Every address that gets its own pre-rendered HTML file (react-router.config.ts) and a line in sitemap.xml (postbuild.ts).
// Keep in step with app/routes.ts.
import { readFileSync } from "node:fs";

export const LANGS = ["id", "en"] as const;

const root = new URL("../", import.meta.url);

export function publicPaths(): string[] {
  const { surahs } = JSON.parse(readFileSync(new URL("data/surahs.json", root), "utf8")) as { surahs: { slug: string }[] };
  return ["/", ...LANGS.flatMap((lang) => [`/${lang}`, ...surahs.map((s) => `/${lang}/${s.slug}`)])];
}

/** Addresses for the sitemap: the "/" page only redirects, so it is left out. */
export const sitemapPaths = () => publicPaths().filter((p) => p !== "/");
