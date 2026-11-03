// Splits the scraped prayer times (data/shalat, see tools/scrape_shalat.py) into small files the shalat page loads on demand:
//   public/shalat/wilayah.json                       provinces and their regencies/cities
//   public/shalat/<provinsi>/<kabkota>/<year>.json   { "<month>": [day, ...] }
// public/shalat is generated (git-ignored); run before `dev` and `build`.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const SRC = new URL("../data/shalat/", import.meta.url);
const OUT = new URL("../public/shalat/", import.meta.url);

type Wilayah = { provinsi: { name: string; slug: string }[]; kabkota: Record<string, { name: string; slug: string }[]> };
const wilayah = JSON.parse(readFileSync(new URL("wilayah.json", SRC), "utf8")) as Wilayah;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const index = wilayah.provinsi.map((p) => ({ name: p.name, slug: p.slug, kabkota: wilayah.kabkota[p.name] ?? [] }));
writeFileSync(new URL("wilayah.json", OUT), JSON.stringify(index));

let files = 0;
for (const p of wilayah.provinsi) {
  for (const k of readdirSync(new URL(`${p.slug}/`, SRC))) {
    const city = JSON.parse(readFileSync(new URL(`${p.slug}/${k}`, SRC), "utf8")) as { jadwal: Record<string, unknown> };
    const dir = new URL(`${p.slug}/${k.replace(/\.json$/, "")}/`, OUT);
    mkdirSync(dir, { recursive: true });
    for (const [year, months] of Object.entries(city.jadwal)) {
      writeFileSync(new URL(`${year}.json`, dir), JSON.stringify(months));
      files++;
    }
  }
}
console.log(`shalat-data: wilayah.json + ${files} year files`);
