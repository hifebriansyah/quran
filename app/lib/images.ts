import type { Lang } from "./i18n";

// The verse pictures live in the R2 bucket quran-images (drawn by tools/make_ayat_images.ts, sent by tools/upload_image.py). They are only
// for link previews (og:image): the page itself draws its picture in a canvas (AyatCanvas), light or dark. So there is one picture per
// verse and language, the light one.
// This is the bucket's public address, the same locally and in production; set VITE_IMAGE_BASE (.env, see .env.example) to change it.
export const IMAGE_BASE = (import.meta.env.VITE_IMAGE_BASE ?? "https://quran-img.situs.id").replace(/\/$/, "");

// The id of this build. The addresses of the pictures never change, and Cloudflare and browsers keep them for hours, so every build puts its
// id on them (?v=...): a new build always asks for them again. R2 ignores the query; the cache keys on it.
const BUILD = import.meta.env.VITE_BUILD_ID;

/** The picture of a verse: <base>/<lang>/<surah slug>/<verse>.jpg?v=<build> */
export const ayatImage = (lang: Lang, slug: string, n: number) =>
  `${IMAGE_BASE}/${lang}/${slug}/${n}.jpg${BUILD ? `?v=${BUILD}` : ""}`;

/** The pictures are 800 x 800. */
export const IMAGE_SIZE = 800;
