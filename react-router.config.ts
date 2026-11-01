import type { Config } from "@react-router/dev/config";
import { basePath } from "./scripts/base-path.ts";
import { publicPaths } from "./scripts/site-paths.ts";

// A single-page app with one pre-rendered HTML file per address: both languages, the home page and every surah
// (see scripts/site-paths.ts). A surah's verses are loaded by its route's `loader` at build time, so a page only
// carries its own surah, not the whole Quran. Any other address is served by 404.html (scripts/postbuild.ts).
export default {
  ssr: false,
  basename: basePath(),
  prerender: () => publicPaths().map((p) => (p === "/" ? "/" : p.replace(/\/$/, ""))),
} satisfies Config;
