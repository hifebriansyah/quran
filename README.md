# quran.situs.id

The Quran with Arabic text, transliteration and a translation, in Indonesian (`/id/`) and English (`/en/`).
Vite, React 19, React Router 7 (framework mode, `ssr: false`, pre-rendered), Tailwind CSS 4 and Storybook.

```bash
nvm use            # Node 24 (.nvmrc)
npm install
npm run dev        # http://localhost:5173
npm run storybook  # http://localhost:6007
npm run build      # build/client: one HTML file per page + 404.html, sitemap.xml, robots.txt
npm run typecheck && npm run lint
npm run build:local  # for Apache: BASE_PATH=/for-fun/quran/, plus Storybook at /storybook/
```

## Data (file based)

`data/arabic.md`, `data/indonesia.md`, `data/english.md` and `data/latin.md` have one line per verse: `<surah>:<verse> <text>`.
`data/surahs.json` has the 114 surahs (name, Arabic name, meaning in both languages, Meccan/Medinan, order of revelation, juz).
They are built by `tools/make_data.py` from the files downloaded from [Tanzil.net](https://tanzil.net) (Uthmani text, `id.indonesian`,
`en.sahih`, `en.transliteration`, and its metadata); see the top of that script. The text is kept as Tanzil gives it, with its
copyright block at the top of each file, and the site credits Tanzil in the footer (their terms: unaltered text, with credit).

When the site is built, each surah route's `loader` (`app/routes/surah.tsx`, `app/lib/quran.server.ts`) reads the files and
a page carries only its own surah. Pre-rendered addresses: `/id`, `/en`, and `/id/<surah>`, `/en/<surah>` for the 114 surahs
(`scripts/site-paths.ts`). `/` redirects to `/id/`.

## Pages

- `/id/`, `/en/`: filter (name, number, or `2:124`), tabs Surah, Juz, Urutan Turun / Revelation order, sort.
- `/id/al-alaq`, `/en/al-alaq`: surah header, verses (Arabic, Latin, translation), copy and share a verse (`#ayat-5`),
  previous/next surah, surah and verse pickers.

## Deploy

`.github/workflows/static.yml` builds and publishes `build/client` (Storybook at `/storybook/`) to GitHub Pages; set the custom
domain `quran.situs.id` in the repository's Pages settings. `.htaccess` serves the build on local Apache at
http://localhost/for-fun/quran/.
