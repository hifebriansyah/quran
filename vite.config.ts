import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { basePath } from "./scripts/base-path.ts";
import { buildId } from "./scripts/build-id.ts";

export default defineConfig({
  base: basePath(),
  plugins: [tailwindcss(), reactRouter()],
  // import.meta.env.VITE_BUILD_ID: a new value for every build, see scripts/build-id.ts
  define: { "import.meta.env.VITE_BUILD_ID": JSON.stringify(buildId()) },
  resolve: { alias: { "~": new URL("./app", import.meta.url).pathname } },
  // The hashed bundles go to /static/, so /assets/ stays free for the site's own files (public/assets).
  build: { emptyOutDir: false, assetsDir: "static" },
  // data/*.md and data/surahs.json sit outside app/.
  server: { fs: { allow: ["."] } },
});
