// BASE_PATH: the folder the site is served from ("/" at the domain root and on GitHub Pages, "/for-fun/abimisme/" on local Apache).
// It sets Vite's `base` and React Router's `basename`. Canonical links, the sitemap and share images keep using the real domain.
export function basePath(): string {
  const raw = process.env.BASE_PATH || "/";
  const withLead = raw.startsWith("/") ? raw : `/${raw}`;
  return withLead.endsWith("/") ? withLead : `${withLead}/`;
}
