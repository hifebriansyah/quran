import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { Banner } from "~/components/Banner";
import { Icon } from "~/components/Icon";
import { pageMeta } from "~/lib/head";
import { isLang, t } from "~/lib/i18n";
import {
  DEFAULT_KABKOTA,
  DEFAULT_PROVINSI,
  PRAYER_KEYS,
  detectLocationOrDefault,
  fetchJadwalShalat,
  fetchKabKota,
  fetchProvinsi,
  findJakartaKabKota,
  formatCountdown,
  getNextPrayer,
  type JadwalBulanan,
  type JadwalHarian,
} from "~/lib/shalat";
import NotFound from "./not-found";

export const meta = ({ params }: { params: Record<string, string | undefined> }) => {
  if (!isLang(params.lang)) return [{ title: "quran.situs.id" }];
  const s = t(params.lang);
  return pageMeta({
    title: s.shalat.title,
    description: s.shalat.description,
    lang: params.lang,
    path: "/shalat",
  });
};

const selectClass =
  "w-full cursor-pointer appearance-none rounded-xl border border-line bg-bg py-2.5 pr-9 pl-3.5 text-sm font-medium text-ink focus:border-accent focus:outline-none disabled:opacity-60";

export default function ShalatPage() {
  const { lang } = useParams();
  const nowInit = useMemo(() => new Date(), []);
  const [now, setNow] = useState<Date>(() => new Date());

  const [provinsiList, setProvinsiList] = useState<string[]>([DEFAULT_PROVINSI]);
  const [kabkotaList, setKabkotaList] = useState<string[]>([DEFAULT_KABKOTA]);
  const [provinsi, setProvinsi] = useState<string>(DEFAULT_PROVINSI);
  const [kabkota, setKabkota] = useState<string>(DEFAULT_KABKOTA);
  const [bulan, setBulan] = useState<number>(nowInit.getMonth() + 1);
  const [tahun, setTahun] = useState<number>(nowInit.getFullYear());

  const [locating, setLocating] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<JadwalBulanan | null>(null);
  const [todaySchedule, setTodaySchedule] = useState<JadwalHarian | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const initialized = useRef(false);

  // Live 1-second clock for real-time prayer countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Initial load: fetch provinces, request browser geolocation if allowed (defaulting to Jakarta if not allowed)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    let cancelled = false;

    async function init() {
      setLocating(true);
      let provs = [DEFAULT_PROVINSI];
      try {
        provs = await fetchProvinsi();
        if (!cancelled && provs.length) setProvinsiList(provs);
      } catch {
        // Keep fallback DKI Jakarta if province list request fails
      }

      const resolved = await detectLocationOrDefault(provs);
      if (cancelled) return;
      setProvinsi(resolved.provinsi);
      setKabkotaList(resolved.kabkotaList.length ? resolved.kabkotaList : [resolved.kabkota]);
      setKabkota(resolved.kabkota);
      setLocating(false);
    }

    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Re-detect location when user clicks "Lokasi Saya" / "My Location"
  const handleUseLocation = useCallback(async () => {
    setLocating(true);
    setError(null);
    let provs = provinsiList;
    if (provs.length <= 1) {
      try {
        provs = await fetchProvinsi();
        if (provs.length) setProvinsiList(provs);
      } catch {}
    }
    const resolved = await detectLocationOrDefault(provs);
    setProvinsi(resolved.provinsi);
    setKabkotaList(resolved.kabkotaList.length ? resolved.kabkotaList : [resolved.kabkota]);
    setKabkota(resolved.kabkota);
    setLocating(false);
  }, [provinsiList]);

  // Handle user changing province dropdown
  const handleProvinsiChange = async (nextProv: string) => {
    setProvinsi(nextProv);
    setLoading(true);
    setError(null);
    try {
      const list = await fetchKabKota(nextProv);
      setKabkotaList(list);
      const isJakarta = nextProv.toLowerCase().includes("jakarta");
      const nextCity = isJakarta ? findJakartaKabKota(list) : (list[0] ?? "");
      setKabkota(nextCity);
    } catch {
      setKabkotaList([]);
      setKabkota("");
      setLoading(false);
      setError("kabkota");
    }
  };

  // Fetch monthly schedule whenever (provinsi, kabkota, bulan, tahun, reloadToken) changes after initial location resolution
  useEffect(() => {
    if (locating || !provinsi || !kabkota) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    fetchJadwalShalat({ provinsi, kabkota, bulan, tahun }, ctrl.signal)
      .then((data) => {
        setSchedule(data);
        const current = new Date();
        const isCurrentMonth = bulan === current.getMonth() + 1 && tahun === current.getFullYear();
        if (isCurrentMonth) {
          const foundToday = data.jadwal.find((d) => d.tanggal === current.getDate()) ?? data.jadwal[0] ?? null;
          setTodaySchedule(foundToday);
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSchedule(null);
        setLoading(false);
        setError("fetch");
      });

    return () => ctrl.abort();
  }, [locating, provinsi, kabkota, bulan, tahun, reloadToken]);

  // Ensure today's schedule for the selected city stays populated even when browsing another month/year
  useEffect(() => {
    if (locating || !provinsi || !kabkota) return;
    const current = new Date();
    const curMonth = current.getMonth() + 1;
    const curYear = current.getFullYear();
    if (bulan === curMonth && tahun === curYear) return;

    const ctrl = new AbortController();
    fetchJadwalShalat({ provinsi, kabkota, bulan: curMonth, tahun: curYear }, ctrl.signal)
      .then((data) => {
        const foundToday = data.jadwal.find((d) => d.tanggal === current.getDate()) ?? data.jadwal[0] ?? null;
        setTodaySchedule(foundToday);
      })
      .catch(() => {});

    return () => ctrl.abort();
  }, [locating, provinsi, kabkota, bulan, tahun]);

  if (!isLang(lang)) return <NotFound />;
  const s = t(lang);
  const sh = s.shalat;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  const nextPrayer = todaySchedule ? getNextPrayer(todaySchedule, now) : null;
  // the current time is the prayer just before the next one (Isya once the day's last time has passed; none before Imsak)
  const currentKey = nextPrayer
    ? nextPrayer.isTomorrow
      ? PRAYER_KEYS[PRAYER_KEYS.length - 1]
      : (PRAYER_KEYS[PRAYER_KEYS.indexOf(nextPrayer.key) - 1] ?? null)
    : null;

  return (
    <main>
      <Banner className="pt-28 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{sh.heading}</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-banner-ink/80">{sh.subtitle}</p>
          </div>
        </div>
      </Banner>

      <section className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        {/* Today's highlight card + real-time countdown */}
        {todaySchedule && nextPrayer && (
          <div className="rounded-2xl border border-line bg-card p-4 shadow-xs sm:p-5">
            <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-ink">
                    {sh.todaySchedule}
                  </span>
                  <span className="text-sm font-medium text-muted">
                    {todaySchedule.hari}, {todaySchedule.tanggal_lengkap}
                  </span>
                </div>
                <h2 className="mt-1.5 text-lg font-bold">
                  {kabkota} · <span className="font-normal text-muted">{provinsi}</span>
                </h2>
              </div>

              <div
                aria-label={sh.countdownLabel}
                className="flex items-center justify-between gap-4 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2.5 sm:justify-end"
              >
                <div>
                  <span className="block text-xs font-medium text-muted">
                    {sh.nextPrayer} ({sh.prayers[nextPrayer.key]}
                    {nextPrayer.isTomorrow ? ` · ${sh.tomorrow}` : ""} {nextPrayer.time})
                  </span>
                  <span className="font-mono text-xl font-bold tracking-tight text-accent-text">
                    {formatCountdown(nextPrayer.secondsRemaining)}
                  </span>
                </div>
                <Icon name="clock" className="text-2xl text-accent-text" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
              {PRAYER_KEYS.map((key) => {
                const isNext = currentKey === key;
                return (
                  <div
                    key={key}
                    className={`rounded-xl border p-3 text-center transition ${
                      isNext ? "border-accent bg-accent/15 ring-1 ring-accent" : "border-line bg-bg/60"
                    }`}
                  >
                    <span className={`block text-xs font-semibold ${isNext ? "text-accent-text" : "text-muted"}`}>
                      {sh.prayers[key]}
                    </span>
                    <span className="mt-1 block font-mono text-base font-bold">{todaySchedule[key]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Controls (Provinsi, Kabupaten/Kota, Bulan, Tahun, Location & Refresh) */}
        <div className="rounded-2xl border border-line bg-card p-4 shadow-xs sm:p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">{sh.provinsi}</span>
              <span className="relative flex items-center">
                <select
                  aria-label={sh.provinsi}
                  value={provinsi}
                  disabled={locating}
                  onChange={(e) => void handleProvinsiChange(e.target.value)}
                  className={selectClass}
                >
                  {provinsiList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" className="pointer-events-none absolute right-3 text-muted" />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">{sh.kabkota}</span>
              <span className="relative flex items-center">
                <select
                  aria-label={sh.kabkota}
                  value={kabkota}
                  disabled={locating || !kabkotaList.length}
                  onChange={(e) => {
                    setKabkota(e.target.value);
                  }}
                  className={selectClass}
                >
                  {kabkotaList.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" className="pointer-events-none absolute right-3 text-muted" />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">{sh.bulan}</span>
              <span className="relative flex items-center">
                <select
                  aria-label={sh.bulan}
                  value={bulan}
                  onChange={(e) => setBulan(Number(e.target.value))}
                  className={selectClass}
                >
                  {sh.months.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" className="pointer-events-none absolute right-3 text-muted" />
              </span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">{sh.tahun}</span>
              <span className="relative flex items-center">
                <select
                  aria-label={sh.tahun}
                  value={tahun}
                  onChange={(e) => setTahun(Number(e.target.value))}
                  className={selectClass}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <Icon name="chevronDown" className="pointer-events-none absolute right-3 text-muted" />
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
            <p className="text-xs text-muted">{sh.autoUpdateHint}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleUseLocation()}
                disabled={locating}
                className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-3.5 py-2 text-xs font-semibold text-ink transition hover:border-accent disabled:opacity-60"
              >
                <Icon name="mapPin" />
                <span>{locating ? sh.detectingLocation : sh.useLocation}</span>
              </button>
              <button
                type="button"
                onClick={() => setReloadToken((n) => n + 1)}
                disabled={loading || locating}
                aria-label={sh.show}
                title={sh.show}
                className="grid size-8 place-items-center rounded-full border border-line bg-bg text-ink transition hover:border-accent disabled:opacity-60"
              >
                <Icon name="refresh" />
              </button>
            </div>
          </div>
        </div>

        {/* Monthly Schedule Table */}
        <div className="overflow-hidden rounded-2xl border border-line bg-card shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3.5 sm:px-5">
            <h2 className="text-base font-bold">
              {sh.monthlySchedule} · {sh.months[bulan - 1]} {tahun}
            </h2>
            <span className="text-xs font-medium text-muted">
              {kabkota}, {provinsi}
            </span>
          </div>

          {loading || locating ? (
            <div className="py-16 text-center text-sm text-muted">{sh.loading}</div>
          ) : error || !schedule || !schedule.jadwal.length ? (
            <div className="px-4 py-16 text-center">
              <p className="text-base font-semibold">{sh.emptyTitle}</p>
              <p className="mt-1 text-sm text-muted">{error ? sh.errorText : sh.emptyText}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg/60 text-xs font-semibold uppercase tracking-wider text-muted">
                    <th className="px-4 py-3">{sh.dateCol}</th>
                    <th className="px-3 py-3">{sh.dayCol}</th>
                    {PRAYER_KEYS.map((key) => (
                      <th
                        key={key}
                        className={`px-3 py-3 text-center ${currentKey === key ? "bg-accent/15 text-accent-text" : ""}`}
                      >
                        {sh.prayers[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {schedule.jadwal.map((row) => {
                    const isToday = bulan === currentMonth && tahun === currentYear && row.tanggal === currentDay;
                    return (
                      <tr key={row.tanggal} className={isToday ? "bg-accent/15 font-semibold" : " transition hover:bg-bg/50"}>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span>{row.tanggal_lengkap || row.tanggal}</span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-muted">{row.hari}</td>
                        {PRAYER_KEYS.map((key) => (
                          <td
                            key={key}
                            className={`whitespace-nowrap px-3 py-3 text-center font-mono ${
                              currentKey === key ? "bg-accent/15 font-bold text-accent-text" : ""
                            }`}
                          >
                            {row[key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
