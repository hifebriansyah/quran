// Renders each verse as a square JPG card (800 x 800, light): the Arabic text, the translation and the reference. They are only for link
// previews (og:image); the verse page draws its own picture in a canvas, light or dark, so there is one picture per verse and language.
// Chrome draws them (puppeteer-core, the Chrome installed on this Mac), so the Arabic is shaped by the same engine and the same
// font (Amiri Quran) as the site itself. Python's Pillow here has no Arabic shaping, which is why this one is not Python.
//
//   node tools/make_ayat_images.ts                      every verse, both languages (12,472 files)
//   node tools/make_ayat_images.ts --ref 96:1,2:255     only these verses
//   node tools/make_ayat_images.ts --surah 96 --lang id
//   options: --out images  --jobs 4  --force (draw again, even where the file exists)  --quality 82
//
// Output: images/<lang>/<surah slug>/<verse>.jpg  (git-ignored; tools/upload_image.py sends them to R2)
// Needs: npm install (puppeteer-core), and the Google Chrome app (CHROME_PATH to use another one), and network for the Google font.
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { readSurah } from "../app/lib/quran.server.ts";

type Lang = "id" | "en";
type Surah = { no: number; slug: string; name: string; ayat: number };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
// The card is laid out 1080 px wide and drawn at a scale that gives an 800 x 800 picture.
const SIZE = 1080;
// the logo as a vector (public/assets/logo.svg, from tools/trace_logo.py), inlined in the page so Chrome needs no file address: sharp at any size
const LOGO = `data:image/svg+xml;base64,${readFileSync(join(ROOT, "public", "assets", "logo.svg")).toString("base64")}`;
const OUT_SIZE = 800;

const args = new Map<string, string>();
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith("--")) continue;
  const next = process.argv[i + 1];
  args.set(a.slice(2), next && !next.startsWith("--") ? (i++, next) : "true");
}

const surahs = (JSON.parse(readFileSync(join(ROOT, "data", "surahs.json"), "utf8")) as { surahs: Surah[] }).surahs;
const OUT = join(ROOT, args.get("out") ?? "images");
const JOBS = Number(args.get("jobs") ?? 4);
const FORCE = args.has("force");
const QUALITY = Number(args.get("quality") ?? 82);
const langs: Lang[] = args.get("lang") === "id" || args.get("lang") === "en" ? [args.get("lang") as Lang] : ["id", "en"];

// which verses
let refs: [number, number][] = [];
if (args.has("ref")) {
  refs = args.get("ref")!.split(",").map((r) => r.split(":").map(Number) as [number, number]);
  for (const [s, a] of refs) if (!surahs[s - 1] || !(a >= 1 && a <= surahs[s - 1].ayat)) throw new Error(`no such verse: ${s}:${a}`);
} else {
  const only = args.has("surah") ? Number(args.get("surah")) : null;
  for (const s of surahs) if (!only || s.no === only) for (let a = 1; a <= s.ayat; a++) refs.push([s.no, a]);
}

type Job = { lang: Lang; surah: Surah; n: number; file: string };
const jobs: Job[] = [];
for (const lang of langs)
  for (const [no, n] of refs) {
    const surah = surahs[no - 1];
    const file = join(OUT, lang, surah.slug, `${n}.jpg`);
    if (FORCE || !existsSync(file)) jobs.push({ lang, surah, n, file });
  }

// ---- the card: one page, whose text is swapped for every verse (the font stays loaded) ----
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root { --bg:#f4f2eb; --ink:#404040; --muted:#6a6a66; --line:#e2dfd3; --accent:#0f7a6e; }
  * { box-sizing: border-box; margin: 0; }
  html, body { width: ${SIZE}px; height: ${SIZE}px; overflow: hidden; background: var(--bg); color: var(--ink); font-family: Inter, sans-serif; }
  .card { position: relative; width: ${SIZE}px; height: ${SIZE}px; padding: 70px 90px 64px; display: flex; flex-direction: column; }
  .brand { position: relative; height: 41px; }
  .brand img { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); height: 52px; }
  .rule { height: 1px; background: var(--line); margin: 26px 0; flex: none; }
  .body { flex: 1; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: 34px; text-align: center; overflow: hidden; }
  .ar { font-family: "Amiri Quran", serif; direction: rtl; line-height: 2.15; }
  .tr { color: var(--ink); line-height: 1.5; }
  .ref { text-align: center; font-weight: 700; font-size: 32px; color: var(--accent); }
</style></head><body><div class="card" id="card">
  <div class="brand"><img src="${LOGO}" alt=""></div><div class="rule"></div>
  <div class="body" id="body"><div class="ar" id="ar" lang="ar"></div><div class="tr" id="tr"></div></div>
  <div class="rule"></div><div class="ref" id="ref"></div></div></body></html>`;

const arabicDigits = (n: number) => String(n).replace(/\d/g, (d) => String.fromCharCode(0x0660 + Number(d)));

// the Quran text of a surah, read once per (surah, language)
const cache = new Map<string, ReturnType<typeof readSurah>>();
const textOf = (no: number, lang: Lang) => {
  const key = `${no}:${lang}`;
  if (!cache.has(key)) cache.set(key, readSurah(no, lang));
  return cache.get(key)!;
};

const chrome =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (!existsSync(chrome)) throw new Error(`Chrome not found at ${chrome} (set CHROME_PATH)`);

console.log(`${jobs.length} images to draw (${langs.join("+")}), ${JOBS} at a time`);
if (!jobs.length) process.exit(0);

const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ["--hide-scrollbars", "--font-render-hinting=none"] });
let done = 0;
const started = Date.now();

async function worker() {
  const page = await browser.newPage();
  await page.setViewport({ width: SIZE, height: SIZE, deviceScaleFactor: OUT_SIZE / SIZE });
  await page.setContent(PAGE, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  for (let job = jobs.shift(); job; job = jobs.shift()) {
    const verse = textOf(job.surah.no, job.lang).verses[job.n - 1];
    await page.evaluate(
      (d) => {
        const ar = document.getElementById("ar")!;
        const tr = document.getElementById("tr")!;
        const body = document.getElementById("body")!;
        ar.textContent = d.arabic;
        tr.textContent = d.text;
        document.getElementById("ref")!.textContent = d.ref;
        // the largest Arabic size at which Arabic + translation fit between the two rules; a long verse gets tighter lines and a smaller
        // translation (2:282 is the longest, about 128 words)
        let fits = false;
        for (let size = 74; size >= 18 && !fits; size -= 1) {
          ar.style.fontSize = `${size}px`;
          ar.style.lineHeight = size >= 52 ? "2.15" : size >= 34 ? "1.95" : "1.8";
          tr.style.fontSize = `${Math.max(15, Math.round(size * 0.46))}px`;
          tr.style.lineHeight = size >= 34 ? "1.5" : "1.4";
          body.style.gap = size >= 34 ? "34px" : "18px";
          fits = body.scrollHeight <= body.clientHeight;
        }
        document.body.dataset.fits = String(fits);
      },
      { arabic: `${verse.arabic} ۝${arabicDigits(job.n)}`, text: verse.text, ref: `${job.surah.name} ${job.surah.no}:${job.n}` },
    );
    if ((await page.evaluate(() => document.body.dataset.fits)) !== "true") console.warn(`does not fit: ${job.file}`);
    mkdirSync(dirname(job.file), { recursive: true });
    await page.screenshot({ path: job.file as `${string}.jpg`, type: "jpeg", quality: QUALITY, clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
    if (++done % 250 === 0) console.log(`${done} done, ${Math.round((Date.now() - started) / 1000)}s`);
  }
  await page.close();
}

await Promise.all(Array.from({ length: Math.max(1, JOBS) }, worker));
await browser.close();
console.log(`done: ${done} images in ${Math.round((Date.now() - started) / 1000)}s -> ${OUT}`);
