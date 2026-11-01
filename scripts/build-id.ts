// One id per build (BUILD_ID: set by `npm run build` to the build time, by the GitHub workflow to the commit), put on the addresses that
// are not already fingerprinted. The scripts and styles are named by a hash of their content (Vite), so they never go stale; the verse
// pictures in R2 have fixed addresses (id/al-alaq/1.jpg) and are cached for hours at Cloudflare's edge and in browsers, so they carry ?v=<id>.
export const buildId = (): string => (process.env.BUILD_ID || Date.now().toString(36)).slice(0, 12);
