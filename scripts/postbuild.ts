// After `react-router build`: GitHub Pages files that are not part of the app itself.
//  - the pages nested under BASE_PATH are moved up to build/client/
//  - 404.html: the SPA shell, so an address that is not pre-rendered still opens the app (and its own "not found" page)
//  - sitemap.xml and robots.txt, from the same address list as the pre-rendering
import { cpSync, copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { basePath } from "./base-path.ts";
import { sitemapPaths } from "./site-paths.ts";

const OUT = new URL("../build/client/", import.meta.url);
const SITE = "https://quran.situs.id";

// When BASE_PATH is not "/", React Router nests the pre-rendered pages under build/client/<BASE_PATH>/ while the bundles stay in
// build/client/static/. Flatten them so the folder can be served as it is at BASE_PATH.
const BASE = basePath();
if (BASE !== "/") {
  const nested = new URL(`.${BASE}`, OUT);
  if (existsSync(nested)) {
    cpSync(nested, OUT, { recursive: true });
    rmSync(new URL(`${BASE.split("/").filter(Boolean)[0]}/`, OUT), { recursive: true, force: true });
  }
}

copyFileSync(new URL("__spa-fallback.html", OUT), new URL("404.html", OUT));
rmSync(new URL("__spa-fallback.html", OUT));
rmSync(new URL("../server", OUT), { recursive: true, force: true });

const paths = sitemapPaths();
const urls = paths.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n");
writeFileSync(
  new URL("sitemap.xml", OUT),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
writeFileSync(new URL("robots.txt", OUT), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
// which build this is (the same id as the ?v= on the pictures), for checking what is live: <site>/build.json
const id = process.env.BUILD_ID?.slice(0, 12) ?? "";
writeFileSync(new URL("build.json", OUT), JSON.stringify({ id, builtAt: new Date().toISOString() }) + "\n");
console.log(`postbuild: 404.html, sitemap.xml (${paths.length} addresses), robots.txt`);
