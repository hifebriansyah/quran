import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";
import { type InlineConfig, type PluginOption, mergeConfig } from "vite";

// Storybook builds the components with its own Vite config: Tailwind and the ~ alias, but not the React Router plugin
// (that one only works in the app build). It is published with the site at /storybook/ (npm run build-storybook).
function withoutReactRouter(base: InlineConfig): InlineConfig {
  const keep = (p: PluginOption): PluginOption =>
    Array.isArray(p)
      ? p.map(keep)
      : p && typeof p === "object" && "name" in p && String(p.name).startsWith("react-router")
        ? false
        : p;
  return { ...base, plugins: (base.plugins || []).map(keep) };
}

const config: StorybookConfig = {
  stories: ["../app/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  core: { disableTelemetry: true },
  // Storybook has no public folder (publicDir is off in viteFinal); the header stories need the logo
  staticDirs: [{ from: "../public/assets/logo.svg", to: "/assets/logo.svg" }],
  viteFinal: (base) =>
    mergeConfig(withoutReactRouter(base), {
      base: "./",
      publicDir: false,
      plugins: [tailwindcss()],
      resolve: { alias: { "~": new URL("../app", import.meta.url).pathname } },
      server: { fs: { allow: [".."] } },
    }),
};
export default config;
