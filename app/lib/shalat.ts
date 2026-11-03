// Monthly prayer times (source: Bimas Islam Kemenag RI via equran.id), scraped to data/shalat and served as static files.

/** Years covered by the bundled data (the source publishes 2026-2028). */
export const SHALAT_YEARS = [2026, 2027, 2028];

export const DEFAULT_PROVINSI = "DKI Jakarta";
export const DEFAULT_KABKOTA = "Kota Jakarta";

export const PRAYER_KEYS = ["imsak", "subuh", "terbit", "dhuha", "dzuhur", "ashar", "maghrib", "isya"] as const;
export type PrayerKey = (typeof PRAYER_KEYS)[number];

export type JadwalHarian = {
  tanggal: number;
  tanggal_lengkap: string;
  hari: string;
  imsak: string;
  subuh: string;
  terbit: string;
  dhuha: string;
  dzuhur: string;
  ashar: string;
  maghrib: string;
  isya: string;
};

export type JadwalBulanan = {
  provinsi: string;
  kabkota: string;
  bulan: number;
  tahun: number;
  bulan_nama?: string;
  jadwal: JadwalHarian[];
};

type Wilayah = { name: string; slug: string; kabkota: { name: string; slug: string }[] }[];

let wilayahPromise: Promise<Wilayah> | null = null;

// The files come from VITE_SHALAT_BASE (the R2 bucket, sent by tools/upload_shalat.py), else from public/shalat, which
// scripts/shalat-data.ts generates from data/shalat.
const SHALAT_BASE = (import.meta.env.VITE_SHALAT_BASE ?? `${import.meta.env.BASE_URL}shalat`).replace(/\/$/, "");
const dataUrl = (path: string) => `${SHALAT_BASE}/${path}`;

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(dataUrl(path), { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

function loadWilayah(): Promise<Wilayah> {
  wilayahPromise ??= getJson<Wilayah>("wilayah.json").catch((err: unknown) => {
    wilayahPromise = null;
    throw err;
  });
  return wilayahPromise;
}

/** All Indonesian provinces in the bundled prayer-time data. */
export async function fetchProvinsi(): Promise<string[]> {
  return (await loadWilayah()).map((p) => p.name);
}

/** Regencies/cities of a province. */
export async function fetchKabKota(provinsi: string): Promise<string[]> {
  const prov = (await loadWilayah()).find((p) => p.name === provinsi);
  if (!prov) throw new Error("Unknown province");
  return prov.kabkota.map((k) => k.name);
}

const yearCache = new Map<string, Promise<Record<string, JadwalHarian[]>>>();

/** Monthly prayer schedule, read from the bundled per-city year file. */
export async function fetchJadwalShalat(
  params: { provinsi: string; kabkota: string; bulan: number; tahun: number },
  signal?: AbortSignal,
): Promise<JadwalBulanan> {
  const prov = (await loadWilayah()).find((p) => p.name === params.provinsi);
  const city = prov?.kabkota.find((k) => k.name === params.kabkota);
  if (!prov || !city) throw new Error("Unknown location");
  const path = `${prov.slug}/${city.slug}/${params.tahun}.json`;
  let year = yearCache.get(path);
  if (!year) {
    year = getJson<Record<string, JadwalHarian[]>>(path); // shared between callers, so not tied to one signal
    yearCache.set(path, year);
    year.catch(() => yearCache.delete(path));
  }
  const months = await year;
  signal?.throwIfAborted();
  const jadwal = months[String(params.bulan)];
  if (!Array.isArray(jadwal)) throw new Error("No schedule for this month");
  return { provinsi: params.provinsi, kabkota: params.kabkota, bulan: params.bulan, tahun: params.tahun, jadwal };
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stripAdminPrefix = (s: string) =>
  norm(s)
    .replace(
      /^(provinsi|province|daerah khusus ibukota|dki|daerah istimewa|di|kabupaten|kab|kota administrasi|kota|city of|regency)\s+/g,
      "",
    )
    .trim();

/** Match a target province name against the API's province list, falling back to DKI Jakarta. */
export function matchProvinsi(candidates: string[], provinsiList: string[]): string | null {
  if (!provinsiList.length) return null;
  for (const raw of candidates) {
    if (!raw) continue;
    const n = norm(raw);
    const core = stripAdminPrefix(raw);
    if (n.includes("jakarta") || core.includes("jakarta")) {
      const jkt = provinsiList.find((p) => norm(p).includes("jakarta"));
      if (jkt) return jkt;
    }
    if (n.includes("yogyakarta") || n.includes("jogja") || core.includes("yogyakarta")) {
      const diy = provinsiList.find((p) => norm(p).includes("yogyakarta"));
      if (diy) return diy;
    }
    const exact = provinsiList.find((p) => norm(p) === n || stripAdminPrefix(p) === core);
    if (exact) return exact;
    const partial = provinsiList.find((p) => {
      const pc = stripAdminPrefix(p);
      return pc && core && (pc === core || pc.includes(core) || core.includes(pc));
    });
    if (partial) return partial;
  }
  return null;
}

/** Find the default Jakarta province from the API's province list. */
export function findJakartaProvinsi(provinsiList: string[]): string {
  return provinsiList.find((p) => norm(p).includes("jakarta")) ?? DEFAULT_PROVINSI;
}

/** Find the default Jakarta city from the API's kabkota list. */
export function findJakartaKabKota(kabkotaList: string[]): string {
  return (
    kabkotaList.find((k) => norm(k) === "kota jakarta") ??
    kabkotaList.find((k) => norm(k).includes("jakarta pusat")) ??
    kabkotaList.find((k) => norm(k).includes("jakarta")) ??
    kabkotaList[0] ??
    DEFAULT_KABKOTA
  );
}

/** Match candidate city/regency names against the API's kabkota list for a province. */
export function matchKabKota(candidates: string[], kabkotaList: string[], isJakarta = false): string | null {
  if (!kabkotaList.length) return null;
  if (isJakarta) {
    for (const raw of candidates) {
      if (norm(raw).includes("kepulauan seribu") || norm(raw).includes("thousand islands")) {
        const ks = kabkotaList.find((k) => norm(k).includes("seribu"));
        if (ks) return ks;
      }
    }
    return findJakartaKabKota(kabkotaList);
  }

  for (const raw of candidates) {
    if (!raw) continue;
    const n = norm(raw);
    const core = stripAdminPrefix(raw);
    if (!core) continue;

    // 1. Direct normalized match (e.g., "Kota Bogor" vs "Kota Bogor", "Kabupaten Bogor" vs "Kab. Bogor")
    const wantsKota = /\b(kota|city)\b/.test(n);
    const wantsKab = /\b(kabupaten|kab|regency)\b/.test(n);

    if (wantsKota) {
      const kotaMatch = kabkotaList.find((k) => norm(k).startsWith("kota ") && stripAdminPrefix(k) === core);
      if (kotaMatch) return kotaMatch;
    }
    if (wantsKab) {
      const kabMatch = kabkotaList.find((k) => norm(k).startsWith("kab") && stripAdminPrefix(k) === core);
      if (kabMatch) return kabMatch;
    }

    // 2. Core name equality (preferring "Kota" when ambiguous, as urban coordinates most often sit in the city)
    const exactCore = kabkotaList.filter((k) => stripAdminPrefix(k) === core);
    if (exactCore.length === 1) return exactCore[0];
    if (exactCore.length > 1) {
      return exactCore.find((k) => norm(k).startsWith("kota ")) ?? exactCore[0];
    }

    // 3. Substring match on core name
    const partial = kabkotaList.find((k) => {
      const kc = stripAdminPrefix(k);
      return kc.length >= 4 && core.length >= 4 && (kc.includes(core) || core.includes(kc));
    });
    if (partial) return partial;
  }
  return null;
}

type CityAnchor = { lat: number; lon: number; provinsi: string; kabkota: string };

// Representative coordinates across Indonesian provinces and major cities for offline/fallback coordinate matching.
const CITY_ANCHORS: CityAnchor[] = [
  { lat: -6.2088, lon: 106.8456, provinsi: "DKI Jakarta", kabkota: "Kota Jakarta" },
  { lat: -5.7985, lon: 106.5072, provinsi: "DKI Jakarta", kabkota: "Kab. Kepulauan Seribu" },
  { lat: -6.5971, lon: 106.806, provinsi: "Jawa Barat", kabkota: "Kota Bogor" },
  { lat: -6.4025, lon: 106.7942, provinsi: "Jawa Barat", kabkota: "Kota Depok" },
  { lat: -6.2383, lon: 106.9756, provinsi: "Jawa Barat", kabkota: "Kota Bekasi" },
  { lat: -6.9175, lon: 107.6191, provinsi: "Jawa Barat", kabkota: "Kota Bandung" },
  { lat: -6.8722, lon: 107.5425, provinsi: "Jawa Barat", kabkota: "Kota Cimahi" },
  { lat: -6.732, lon: 108.5523, provinsi: "Jawa Barat", kabkota: "Kota Cirebon" },
  { lat: -6.9277, lon: 106.93, provinsi: "Jawa Barat", kabkota: "Kota Sukabumi" },
  { lat: -7.3274, lon: 108.2207, provinsi: "Jawa Barat", kabkota: "Kota Tasikmalaya" },
  { lat: -6.1783, lon: 106.6319, provinsi: "Banten", kabkota: "Kota Tangerang" },
  { lat: -6.2886, lon: 106.7179, provinsi: "Banten", kabkota: "Kota Tangerang Selatan" },
  { lat: -6.1104, lon: 106.163, provinsi: "Banten", kabkota: "Kota Serang" },
  { lat: -6.0025, lon: 106.0111, provinsi: "Banten", kabkota: "Kota Cilegon" },
  { lat: -6.9667, lon: 110.4167, provinsi: "Jawa Tengah", kabkota: "Kota Semarang" },
  { lat: -7.5755, lon: 110.8243, provinsi: "Jawa Tengah", kabkota: "Kota Surakarta" },
  { lat: -7.4797, lon: 110.2177, provinsi: "Jawa Tengah", kabkota: "Kota Magelang" },
  { lat: -6.8898, lon: 109.6746, provinsi: "Jawa Tengah", kabkota: "Kota Pekalongan" },
  { lat: -6.8694, lon: 109.1402, provinsi: "Jawa Tengah", kabkota: "Kota Tegal" },
  { lat: -7.7956, lon: 110.3695, provinsi: "DI Yogyakarta", kabkota: "Kota Yogyakarta" },
  { lat: -7.7156, lon: 110.3556, provinsi: "DI Yogyakarta", kabkota: "Kab. Sleman" },
  { lat: -7.8878, lon: 110.3289, provinsi: "DI Yogyakarta", kabkota: "Kab. Bantul" },
  { lat: -7.2575, lon: 112.7521, provinsi: "Jawa Timur", kabkota: "Kota Surabaya" },
  { lat: -7.9666, lon: 112.6326, provinsi: "Jawa Timur", kabkota: "Kota Malang" },
  { lat: -7.4478, lon: 112.7183, provinsi: "Jawa Timur", kabkota: "Kab. Sidoarjo" },
  { lat: -7.1566, lon: 112.6555, provinsi: "Jawa Timur", kabkota: "Kab. Gresik" },
  { lat: -7.8166, lon: 112.0114, provinsi: "Jawa Timur", kabkota: "Kota Kediri" },
  { lat: 5.5483, lon: 95.3238, provinsi: "Aceh", kabkota: "Kota Banda Aceh" },
  { lat: 3.5952, lon: 98.6722, provinsi: "Sumatera Utara", kabkota: "Kota Medan" },
  { lat: -0.9471, lon: 100.4172, provinsi: "Sumatera Barat", kabkota: "Kota Padang" },
  { lat: 0.5071, lon: 101.4478, provinsi: "Riau", kabkota: "Kota Pekanbaru" },
  { lat: 1.0456, lon: 104.0305, provinsi: "Kepulauan Riau", kabkota: "Kota Batam" },
  { lat: 0.9186, lon: 104.4581, provinsi: "Kepulauan Riau", kabkota: "Kota Tanjungpinang" },
  { lat: -1.6101, lon: 103.6131, provinsi: "Jambi", kabkota: "Kota Jambi" },
  { lat: -2.9761, lon: 104.7754, provinsi: "Sumatera Selatan", kabkota: "Kota Palembang" },
  { lat: -2.1316, lon: 106.1169, provinsi: "Kepulauan Bangka Belitung", kabkota: "Kota Pangkalpinang" },
  { lat: -3.7928, lon: 102.2608, provinsi: "Bengkulu", kabkota: "Kota Bengkulu" },
  { lat: -5.4292, lon: 105.261, provinsi: "Lampung", kabkota: "Kota Bandar Lampung" },
  { lat: -8.6705, lon: 115.2126, provinsi: "Bali", kabkota: "Kota Denpasar" },
  { lat: -8.5833, lon: 116.1167, provinsi: "Nusa Tenggara Barat", kabkota: "Kota Mataram" },
  { lat: -10.1772, lon: 123.607, provinsi: "Nusa Tenggara Timur", kabkota: "Kota Kupang" },
  { lat: -0.0263, lon: 109.3425, provinsi: "Kalimantan Barat", kabkota: "Kota Pontianak" },
  { lat: -2.2161, lon: 113.9135, provinsi: "Kalimantan Tengah", kabkota: "Kota Palangkaraya" },
  { lat: -3.3194, lon: 114.5908, provinsi: "Kalimantan Selatan", kabkota: "Kota Banjarmasin" },
  { lat: -0.5022, lon: 117.1536, provinsi: "Kalimantan Timur", kabkota: "Kota Samarinda" },
  { lat: -1.2379, lon: 116.8529, provinsi: "Kalimantan Timur", kabkota: "Kota Balikpapan" },
  { lat: 3.3333, lon: 117.6, provinsi: "Kalimantan Utara", kabkota: "Kota Tarakan" },
  { lat: 1.4748, lon: 124.8421, provinsi: "Sulawesi Utara", kabkota: "Kota Manado" },
  { lat: 0.5435, lon: 123.0568, provinsi: "Gorontalo", kabkota: "Kota Gorontalo" },
  { lat: -0.8917, lon: 119.8707, provinsi: "Sulawesi Tengah", kabkota: "Kota Palu" },
  { lat: -2.6747, lon: 118.8885, provinsi: "Sulawesi Barat", kabkota: "Kab. Mamuju" },
  { lat: -5.1477, lon: 119.4327, provinsi: "Sulawesi Selatan", kabkota: "Kota Makassar" },
  { lat: -3.9985, lon: 122.513, provinsi: "Sulawesi Tenggara", kabkota: "Kota Kendari" },
  { lat: -3.6954, lon: 128.1814, provinsi: "Maluku", kabkota: "Kota Ambon" },
  { lat: 0.7893, lon: 127.3842, provinsi: "Maluku Utara", kabkota: "Kota Ternate" },
  { lat: -0.8615, lon: 134.062, provinsi: "Papua Barat", kabkota: "Kab. Manokwari" },
  { lat: -0.8762, lon: 131.2558, provinsi: "Papua Barat Daya", kabkota: "Kota Sorong" },
  { lat: -2.5337, lon: 140.7181, provinsi: "Papua", kabkota: "Kota Jayapura" },
];

function distanceSq(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = lat1 - lat2;
  const dLon = (lon1 - lon2) * Math.cos(((lat1 + lat2) * Math.PI) / 360);
  return dLat * dLat + dLon * dLon;
}

function nearestAnchor(lat: number, lon: number): CityAnchor | null {
  // Check Indonesian bounding box
  if (lat < -11.5 || lat > 6.5 || lon < 94.5 || lon > 141.5) return null;
  let best = CITY_ANCHORS[0];
  let bestDist = Infinity;
  for (const a of CITY_ANCHORS) {
    const d = distanceSq(lat, lon, a.lat, a.lon);
    if (d < bestDist) {
      bestDist = d;
      best = a;
    }
  }
  return best;
}

type ReverseGeocodeResult = {
  countryCode?: string;
  principalSubdivision?: string;
  city?: string;
  locality?: string;
  localityInfo?: {
    administrative?: { name?: string; description?: string; adminLevel?: number }[];
  };
};

async function reverseGeocode(lat: number, lon: number): Promise<{ provCandidates: string[]; cityCandidates: string[] } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=id`,
      { signal: ctrl.signal },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as ReverseGeocodeResult;
    if (data.countryCode && data.countryCode.toUpperCase() !== "ID") return null;

    const admins = data.localityInfo?.administrative ?? [];
    const provCandidates: string[] = [];
    const cityCandidates: string[] = [];

    if (data.principalSubdivision) provCandidates.push(data.principalSubdivision);
    for (const a of admins) {
      if (!a.name) continue;
      if (a.adminLevel === 4 || /provinsi|province/i.test(a.name) || /provinsi|province/i.test(a.description ?? "")) {
        provCandidates.push(a.name);
      } else if (
        a.adminLevel === 5 ||
        a.adminLevel === 6 ||
        /\b(kota|kabupaten|kab|regency|city)\b/i.test(a.name) ||
        /\b(kota|kabupaten|regency|city)\b/i.test(a.description ?? "")
      ) {
        cityCandidates.push(a.name);
      }
    }
    if (data.city) cityCandidates.push(data.city);
    if (data.locality) cityCandidates.push(data.locality);

    return { provCandidates, cityCandidates };
  } catch {
    return null;
  }
}

export type ResolvedLocation = {
  provinsi: string;
  kabkota: string;
  kabkotaList: string[];
  source: "gps" | "default";
};

/**
 * Request browser geolocation if allowed and resolve it to an EQuran (provinsi, kabkota) pair.
 * If permission is denied, unavailable, outside Indonesia, or fails, always defaults to Jakarta.
 */
export async function detectLocationOrDefault(provinsiList: string[]): Promise<ResolvedLocation> {
  const fallbackJakarta = async (): Promise<ResolvedLocation> => {
    const prov = findJakartaProvinsi(provinsiList);
    try {
      const list = await fetchKabKota(prov);
      return { provinsi: prov, kabkota: findJakartaKabKota(list), kabkotaList: list, source: "default" };
    } catch {
      return { provinsi: DEFAULT_PROVINSI, kabkota: DEFAULT_KABKOTA, kabkotaList: [DEFAULT_KABKOTA], source: "default" };
    }
  };

  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    return fallbackJakarta();
  }

  let coords: { latitude: number; longitude: number } | null = null;
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 300_000,
      });
    });
    coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return fallbackJakarta();
  }

  const anchor = nearestAnchor(coords.latitude, coords.longitude);
  if (!anchor) {
    // Coordinates are outside Indonesia -> default to Jakarta
    return fallbackJakarta();
  }

  const geo = await reverseGeocode(coords.latitude, coords.longitude);
  const provCandidates = [...(geo?.provCandidates ?? []), anchor.provinsi];
  const matchedProv = matchProvinsi(provCandidates, provinsiList);
  if (!matchedProv) {
    return fallbackJakarta();
  }

  try {
    const kabkotaList = await fetchKabKota(matchedProv);
    const isJkt = norm(matchedProv).includes("jakarta");
    const cityCandidates = [...(geo?.cityCandidates ?? []), anchor.kabkota];
    const matchedCity =
      matchKabKota(cityCandidates, kabkotaList, isJkt) ?? (isJkt ? findJakartaKabKota(kabkotaList) : kabkotaList[0]);

    if (!matchedCity) return fallbackJakarta();
    return { provinsi: matchedProv, kabkota: matchedCity, kabkotaList, source: "gps" };
  } catch {
    return fallbackJakarta();
  }
}

export type NextPrayerInfo = {
  key: PrayerKey;
  time: string;
  isTomorrow: boolean;
  secondsRemaining: number;
};

/** Parse "HH:mm" into total seconds since midnight. */
export function parseTimeSeconds(hhmm: string): number | null {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60;
}

/** Format seconds into "HH:MM:SS". */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, "0")).join(":");
}

/** Determine the next prayer time and remaining seconds from today's schedule. */
export function getNextPrayer(today: JadwalHarian, now: Date): NextPrayerInfo {
  const nowSecs = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  for (const key of PRAYER_KEYS) {
    const tSecs = parseTimeSeconds(today[key]);
    if (tSecs !== null && tSecs > nowSecs) {
      return {
        key,
        time: today[key],
        isTomorrow: false,
        secondsRemaining: tSecs - nowSecs,
      };
    }
  }
  // After Isya: count down to tomorrow's Imsak (or Subuh)
  const firstKey: PrayerKey = "imsak";
  const firstSecs = parseTimeSeconds(today[firstKey]) ?? 4 * 3600 + 15 * 60;
  return {
    key: firstKey,
    time: today[firstKey],
    isTomorrow: true,
    secondsRemaining: 24 * 3600 - nowSecs + firstSecs,
  };
}
