import { LANGS, type Lang } from "./i18n";
import { site } from "./surahs";

type MetaInput = {
  title: string;
  description: string;
  lang: Lang;
  /** the page without the language, e.g. "" for the home page, "/al-alaq" for a surah */
  path: string;
};

/**
 * Tab title, description and link-preview tags (Open Graph, Twitter) of a page, plus its canonical address and the same page
 * in the other language (hreflang), so search engines connect /id/al-alaq and /en/al-alaq.
 */
export function pageMeta({ title, description, lang, path }: MetaInput) {
  const url = `${site.url}/${lang}${path}`;
  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: site.name },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:locale", content: lang === "id" ? "id_ID" : "en_US" },
    { name: "twitter:card", content: "summary" },
    { tagName: "link", rel: "canonical", href: url },
    ...LANGS.map((l) => ({ tagName: "link", rel: "alternate", hrefLang: l, href: `${site.url}/${l}${path}` })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: `${site.url}/id${path}` },
  ];
}
