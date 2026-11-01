// The route table. scripts/site-paths.ts lists the addresses to pre-render; keep the two in step.
import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  // "/" only sends you on to /id/
  index("routes/redirect.tsx"),
  layout("routes/_app.tsx", [
    // :lang is "id" or "en"; any other value shows "not found"
    route(":lang", "routes/home.tsx"),
    route(":lang/:slug", "routes/surah.tsx"),
    route("*", "routes/not-found.tsx"),
  ]),
] satisfies RouteConfig;
