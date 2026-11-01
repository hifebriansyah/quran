import { LANGS, type Lang } from "./i18n";
import { site } from "./surahs";

export type ShareImage = { url: string; width: number; height: number; alt: string };

type MetaInput = {
  title: string;
  description: string;
  lang: Lang;
  /** the page without the language, e.g. "" for the home page, "/al-alaq" for a surah */
  path: string;
  /** the page's own picture for link previews (a verse); the others show the logo card */
  image?: ShareImage;
};

// Shown in link previews of every page that has no picture of its own (a verse has its own): the logo card, public/assets/og.jpg
// (the build id is on its address like on the verse pictures: the address never changes, and Facebook and Cloudflare keep what they fetched)
const BUILD = import.meta.env.VITE_BUILD_ID;
const DEFAULT_IMAGE: ShareImage = {
  url: `${site.url}/assets/og.jpg${BUILD ? `?v=${BUILD}` : ""}`,
  width: 1200,
  height: 630,
  alt: "quran.situs.id",
};

/**
 * Tab title, description and link-preview tags (Open Graph, Twitter) of a page, plus its canonical address and the same page
 * in the other language (hreflang), so search engines connect /id/al-alaq and /en/al-alaq.
 */
export function pageMeta({ title, description, lang, path, image = DEFAULT_IMAGE }: MetaInput) {
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
    ...(image
      ? [
          { property: "og:image", content: image.url },
          { property: "og:image:type", content: "image/jpeg" },
          { property: "og:image:width", content: String(image.width) },
          { property: "og:image:height", content: String(image.height) },
          { property: "og:image:alt", content: image.alt },
          { name: "twitter:image", content: image.url },
        ]
      : []),
    { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
    { tagName: "link", rel: "canonical", href: url },
    ...LANGS.map((l) => ({ tagName: "link", rel: "alternate", hrefLang: l, href: `${site.url}/${l}${path}` })),
    { tagName: "link", rel: "alternate", hrefLang: "x-default", href: `${site.url}/id${path}` },
  ];
}
