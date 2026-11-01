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

`data/arabic.md`, `data/indonesia.md`, `data/english.md`, `data/latin.md` (English-style transliteration, Tanzil) and `data/latin-id.md` (Indonesian-style
transliteration, Kemenag RI via equran.id) have one line per verse: `<surah>:<verse> <text>`. `/id/` pages use `latin-id.md`, `/en/` pages use `latin.md`.
`data/voice.md` has the recitation audio address of every verse (`<surah>:<verse> <url>`, 6,236 lines, Mishary Alafasy on Tanzil's server). Nothing on the site plays them yet.
`data/surahs.json` has the 114 surahs (name, Arabic name, meaning in both languages, Meccan/Medinan, order of revelation, juz).
`latin-id.md` is built by `tools/make_latin_id.py` from the equran.id API (it states no licence: check it before publishing).
The others are built by `tools/make_data.py` from the files downloaded from [Tanzil.net](https://tanzil.net) (Uthmani text, `id.indonesian`,
`en.sahih`, `en.transliteration`, and its metadata); see the top of that script. The text is kept as Tanzil gives it, with its
copyright block at the top of each file, and the site credits Tanzil in the footer (their terms: unaltered text, with credit).

When the site is built, each surah route's `loader` (`app/routes/surah.tsx`, `app/lib/quran.server.ts`) reads the files and
a page carries only its own surah. Pre-rendered addresses: `/id`, `/en`, and `/id/<surah>`, `/en/<surah>` for the 114 surahs
(`scripts/site-paths.ts`). `/` redirects to `/id/`.

## Pages

- `/id/`, `/en/`: filter (name, number, or `2:124`), tabs Surah, Juz, Urutan Turun / Revelation order, sort.
- `/id/al-alaq`, `/en/al-alaq`: surah header, verses (Arabic, Latin, translation), copy and share a verse (`#ayat-5`),
  previous/next surah, surah and verse pickers.

## Logo and icons

`logo.png` (the logo on a transparent background) is the source. `python3 tools/build_assets.py` makes everything in `public/assets/` from it:
favicons, app icons (two kinds of manifest icons: the white logo on a transparent square, `any`, which the Android splash screen uses so it has no tile edge, and the white logo on a teal square, `maskable`, for the home screen icon; the iPhone icon is a teal tile), `og.jpg` (the default link-preview picture, just the logo) and `site.webmanifest`.
`python3 tools/trace_logo.py` (needs `pip install potracer`) traces the logo into `public/assets/logo.svg` and `app/lib/logo.json`: the vector
used in the header, in the verse page's canvas and in the pictures Chrome draws, sharp at any size. The logo stands at the left of the header,
before the search field, and links to the surah list.

## Verse pictures

Each verse has a picture page, `/id/al-alaq/1` (all 12,472 are pre-rendered), reached with the image icon in the verse's row:
the home page's header (the floating pill over the teal banner) with only the back button in the banner, the picture, share, and the previous/next
verse (also across surahs). The page draws the picture itself in a canvas (`app/components/AyatCanvas.tsx`), light or dark like the rest of
the page. The JPG files are only for link previews (`og:image`): one light 800 x 800 picture per verse and language.

```bash
node tools/make_ayat_images.ts --ref 96:1,2:255    # draw only these (a test run); no --ref = all 12,472 files
python3 tools/upload_image.py --dry-run            # see what would go up
python3 tools/upload_image.py --limit 5            # upload 5 files (a test run); no --limit = everything not yet uploaded
```

- Chrome draws them (`puppeteer-core` and the Google Chrome app): Arabic needs a real shaping engine, and this gives the same font as the site.
- They are written to `images/` (git-ignored) and `upload_image.py` sends them to the R2 bucket `quran-images`, key = the path under
  `images/`. The site reads them from the bucket's public address, `VITE_IMAGE_BASE` (default `https://quran-img.situs.id`, see
  `.env.example`), the same locally and in production. Link previews always get the light picture.
- `upload_image.py` records what it sent in `images/.uploaded.json`, so a second run only sends what is new.

## Cache busting

The scripts and styles are named by a hash of their content (Vite), so a new build always gets new ones. The verse pictures have fixed
addresses and are cached for hours, so every build puts its id on them: `.../id/al-alaq/1.jpg?v=<build id>` (also in `og:image`).
`npm run build` makes the id from the build time, the GitHub workflow uses the commit (`BUILD_ID`); `build.json` and
`<meta name="build-id">` show which build is live. R2 ignores the query; Cloudflare's cache keys on it.

## Deploy

`.github/workflows/static.yml` builds and publishes `build/client` (Storybook at `/storybook/`) to GitHub Pages; set the custom
domain `quran.situs.id` in the repository's Pages settings. `.htaccess` serves the build on local Apache at
http://localhost/for-fun/quran/.
