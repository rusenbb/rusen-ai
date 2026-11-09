"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Stat } from "@/components/ui";

import {
  COINS,
  formatPrice,
  isReadableEdit,
  issRegion,
  mergeTrade,
  parseKlines,
  timeAgo,
  wikiLabel,
  type CoinSymbol,
  type MinutePoint,
  type WikiChange,
} from "./feeds";
import { fetchPublic, useVisiblePolling } from "./polling";

const LABEL = "font-mono text-[0.7rem] uppercase tracking-[0.08em] text-[var(--sub)]";
const FLUSH_MS = 250;
const STALE_MS = 15000;
const HERO: CoinSymbol = "btc";

function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function formatChange(change: number | null | undefined): string {
  if (change == null) return "";
  return `${change >= 0 ? "+" : "−"}${Math.abs(change).toFixed(2)}%`;
}

function Sparkline({ series }: { series: MinutePoint[] }) {
  if (series.length < 2) {
    return <div className="h-40 border-y border-[var(--line)] sm:h-48" aria-hidden />;
  }
  const prices = series.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const first = series[0].minute;
  const width = 600;
  const height = 160;
  const points = series.map((point) => [
    ((point.minute - first) / Math.max(1, series.at(-1)!.minute - first)) * width,
    height - 8 - ((point.price - min) / span) * (height - 16),
  ]);
  const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lastX, lastY] = points.at(-1)!;
  return (
    <figure className="min-w-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="block h-40 w-full overflow-visible border-y border-[var(--line)] sm:h-48"
          role="img"
          aria-label={`Bitcoin price over the last ${series.length} minutes, from ${formatPrice(min)} to ${formatPrice(max)} dollars`}
        >
          <path d={`${line} L${width} ${height} L0 ${height} Z`} fill="var(--accent)" opacity="0.08" />
          <path d={line} fill="none" stroke="var(--accent)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <line x1={lastX} x2={lastX} y1={0} y2={height} stroke="var(--line)" vectorEffect="non-scaling-stroke" />
        </svg>
        <span
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 bg-[var(--accent)]"
          style={{ left: `${(lastX / width) * 100}%`, top: `${(lastY / height) * 100}%` }}
          aria-hidden
        />
        <span className={`absolute left-0 top-1 ${LABEL}`}>${formatPrice(max)}</span>
        <span className={`absolute bottom-1 left-0 ${LABEL}`}>${formatPrice(min)}</span>
      </div>
      <figcaption className={`mt-1 flex justify-between ${LABEL}`}>
        <span>{series.length} min ago</span>
        <span>now</span>
      </figcaption>
    </figure>
  );
}

/** Binance trade stream for eight coins, flushed to React four times a second. */
export function CryptoHero() {
  const [prices, setPrices] = useState<Partial<Record<CoinSymbol, number>>>({});
  const [changes, setChanges] = useState<Partial<Record<CoinSymbol, number | null>>>({});
  const [series, setSeries] = useState<MinutePoint[]>([]);
  const [lastTradeAt, setLastTradeAt] = useState<number | null>(null);
  const now = useNow();
  const pending = useRef(new Map<CoinSymbol, { price: number; time: number }>());
  const shown = useRef<Partial<Record<CoinSymbol, number>>>({});
  const priceEls = useRef(new Map<CoinSymbol, HTMLElement>());

  useEffect(() => {
    let stopped = false;
    let attempts = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | null = null;
    const streams = COINS.map((coin) => `${coin.pair.toLowerCase()}@trade`).join("/");
    const bySymbol = new Map(COINS.map((coin) => [coin.pair, coin.sym]));

    const connect = () => {
      if (stopped || document.hidden) return;
      const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      socket = ws;
      ws.onmessage = (event) => {
        if (socket !== ws) return;
        try {
          const { data } = JSON.parse(event.data);
          const sym = bySymbol.get(data?.s);
          const price = Number(data?.p);
          if (!sym || !Number.isFinite(price) || price <= 0) return;
          attempts = 0;
          pending.current.set(sym, { price, time: Number(data.T) || Date.now() });
        } catch {
          /* Ignore malformed frames; the stale notice covers a dead stream. */
        }
      };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        if (socket !== ws || stopped) return;
        socket = null;
        if (!document.hidden) retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)));
      };
    };
    const onVisibility = () => {
      clearTimeout(retry);
      const ws = socket;
      socket = null;
      ws?.close();
      if (!document.hidden) connect();
    };

    const flush = window.setInterval(() => {
      if (pending.current.size === 0) return;
      const batch = new Map(pending.current);
      pending.current.clear();
      const reduce = prefersReducedMotion();
      for (const [sym, { price }] of batch) {
        const before = shown.current[sym];
        const element = priceEls.current.get(sym);
        if (!reduce && element && before && before !== price && element.animate) {
          const flash = price > before ? "var(--accent)" : "var(--accent-2)";
          element.animate([{ color: flash }, { color: "var(--foreground)" }], { duration: 700, easing: "ease-out" });
        }
        shown.current[sym] = price;
      }
      setPrices({ ...shown.current });
      setLastTradeAt(Date.now());
      const hero = batch.get(HERO);
      if (hero) setSeries((previous) => mergeTrade(previous, hero.time, hero.price));
    }, FLUSH_MS);

    connect();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      clearTimeout(retry);
      window.clearInterval(flush);
      socket?.close();
      socket = null;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // One hour of one-minute closes so the line is there before the first trade arrives.
  useEffect(() => {
    const controller = new AbortController();
    const pair = COINS.find((coin) => coin.sym === HERO)!.pair;
    fetchPublic(`https://api.binance.com/api/v3/klines?symbol=${pair}&interval=1m&limit=60`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : []))
      .then((rows) => {
        const history = parseKlines(rows);
        setSeries((live) => {
          let merged = history;
          for (const point of live) merged = mergeTrade(merged, point.minute * 60000, point.price);
          return merged;
        });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const fetchChanges = useCallback(async (signal: AbortSignal) => {
    try {
      const ids = COINS.map((coin) => coin.cgId).join(",");
      const response = await fetchPublic(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
        { signal },
      );
      if (!response.ok) return;
      const data = await response.json();
      setChanges(Object.fromEntries(COINS.map((coin) => [coin.sym, data[coin.cgId]?.usd_24h_change ?? null])));
    } catch {
      /* Keep the last known changes. */
    }
  }, []);
  useVisiblePolling(fetchChanges, 60000);

  const hero = COINS.find((coin) => coin.sym === HERO)!;
  const status =
    lastTradeAt === null
      ? "Connecting to the trade stream"
      : now - lastTradeAt > STALE_MS
        ? "No trades for a while, reconnecting"
        : "Every trade, as it happens";
  const setPriceEl = (sym: CoinSymbol) => (element: HTMLElement | null) => {
    if (element) priceEls.current.set(sym, element);
    else priceEls.current.delete(sym);
  };

  return (
    <section aria-label="Crypto prices" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className={LABEL}>
            {hero.name} · BTC/USDT
          </p>
          <p role="status" className={LABEL}>
            {status}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span ref={setPriceEl(hero.sym)} className="font-mono text-5xl font-semibold tabular-nums sm:text-6xl">
            {prices[hero.sym] ? `$${formatPrice(prices[hero.sym]!)}` : "--"}
          </span>
          {changes[hero.sym] != null ? (
            <span className="font-mono text-sm tabular-nums text-[var(--muted)]">{formatChange(changes[hero.sym])} in 24h</span>
          ) : null}
        </div>
        <div className="mt-5">
          <Sparkline series={series} />
        </div>
      </div>

      <table className="w-full self-start border-collapse text-sm">
        <caption className={`pb-2 text-left ${LABEL}`}>Other coins, USD</caption>
        <tbody className="font-mono tabular-nums">
          {COINS.filter((coin) => coin.sym !== HERO).map((coin) => (
            <tr key={coin.sym} className="border-t border-[var(--line)]">
              <th scope="row" className="py-2 pr-3 text-left font-normal">
                {coin.name}
              </th>
              <td className="py-2 pr-3 text-right">
                <span ref={setPriceEl(coin.sym)}>{prices[coin.sym] ? `$${formatPrice(prices[coin.sym]!)}` : "--"}</span>
              </td>
              <td className="w-20 py-2 text-right text-xs text-[var(--sub)]">{formatChange(changes[coin.sym])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface IssPosition {
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
}

interface IssState {
  position: IssPosition | null;
  /** Positions seen since the page opened, oldest first. */
  trail: Array<{ lat: number; lon: number }>;
  error: boolean;
}

const ISS_TRAIL = 360;
/** One orbit takes about 92 minutes, so this much history draws close to a full lap on arrival. */
const ISS_HISTORY_MINUTES = 90;
/** The positions endpoint takes at most 10 timestamps per request. */
const ISS_HISTORY_BATCHES = 2;

export function useIss(): IssState {
  const [state, setState] = useState<IssState>({ position: null, trail: [], error: false });

  useEffect(() => {
    const controller = new AbortController();
    const count = ISS_HISTORY_BATCHES * 10;
    const now = Math.floor(Date.now() / 1000);
    const stamps = Array.from({ length: count }, (_, index) => now - Math.round(((count - index) * ISS_HISTORY_MINUTES * 60) / count));
    const load = async () => {
      const past: Array<{ lat: number; lon: number }> = [];
      for (let batch = 0; batch < ISS_HISTORY_BATCHES; batch++) {
        const chunk = stamps.slice(batch * 10, batch * 10 + 10).join(",");
        const response = await fetchPublic(`https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${chunk}`, { signal: controller.signal });
        if (!response.ok) return;
        const rows = (await response.json()) as Array<{ latitude: number; longitude: number }>;
        past.push(...rows.map((row) => ({ lat: row.latitude, lon: row.longitude })));
      }
      setState((current) => ({ ...current, trail: [...past, ...current.trail].slice(-ISS_TRAIL) }));
    };
    // The history is a nice-to-have; the live position keeps working without it.
    load().catch(() => undefined);
    return () => controller.abort();
  }, []);

  const fetchIss = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetchPublic("https://api.wheretheiss.at/v1/satellites/25544", { signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      const position = { lat: data.latitude, lon: data.longitude, altitude: Math.round(data.altitude), velocity: Math.round(data.velocity) };
      setState((current) => ({
        position,
        trail: [...current.trail.slice(1 - ISS_TRAIL), { lat: position.lat, lon: position.lon }],
        error: false,
      }));
    } catch {
      if (!signal.aborted) setState((current) => ({ ...current, error: true }));
    }
  }, []);
  useVisiblePolling(fetchIss, 5000);
  return state;
}

export function IssFeed({ iss }: { iss: IssState }) {
  const { position, error } = iss;
  return (
    <section aria-label="International Space Station" className="min-w-0">
      <p className={LABEL}>Space station, every 5 s</p>
      {position ? (
        <>
          <p className="mt-2 text-2xl font-semibold">{issRegion(position.lat, position.lon)}</p>
          <p className="mt-1 font-mono text-sm tabular-nums text-[var(--muted)]">
            {position.lat.toFixed(2)}°, {position.lon.toFixed(2)}°
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Stat label="Altitude" value={`${position.altitude} km`} />
            <Stat label="Speed" value={`${position.velocity.toLocaleString("en-US")} km/h`} />
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">{error ? "The position service did not answer. Retrying." : "Locating the station"}</p>
      )}
    </section>
  );
}

interface Quake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  url: string;
  lat: number;
  lon: number;
}

interface QuakeState {
  quakes: Quake[] | null;
  error: boolean;
}

export function useQuakes(): QuakeState {
  const [state, setState] = useState<QuakeState>({ quakes: null, error: false });

  const fetchQuakes = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetchPublic("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson", { signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      const features = data.features as Array<{
        id: string;
        geometry: { coordinates: [number, number, number] };
        properties: { mag: number; place: string; time: number; url: string };
      }>;
      setState({
        quakes: features.map((feature) => ({
          id: feature.id,
          magnitude: feature.properties.mag,
          place: feature.properties.place,
          time: feature.properties.time,
          url: feature.properties.url,
          lon: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
        })),
        error: false,
      });
    } catch {
      if (!signal.aborted) setState((current) => ({ ...current, error: true }));
    }
  }, []);
  useVisiblePolling(fetchQuakes, 300000);
  return state;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export function QuakeFeed({ feed }: { feed: QuakeState }) {
  const { error } = feed;
  const now = useNow(30000);
  const quakes = feed.quakes?.filter((quake) => now - quake.time <= DAY_MS) ?? null;
  const strongest = quakes?.reduce<Quake | null>((best, quake) => (!best || quake.magnitude > best.magnitude ? quake : best), null);

  return (
    <section aria-label="Earthquakes" className="min-w-0">
      <p className={LABEL}>Earthquakes, magnitude 2.5+, past day</p>
      {quakes ? (
        <>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{quakes.length} recorded</p>
          {strongest ? (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Strongest: M{strongest.magnitude.toFixed(1)}, {strongest.place}
            </p>
          ) : null}
          <ul className="mt-4">
            {quakes.slice(0, 4).map((quake) => (
              <li key={quake.id} className="border-t border-[var(--line)]">
                <a href={quake.url} target="_blank" rel="noopener noreferrer" className="flex items-baseline gap-3 py-1.5 text-sm hover:text-[var(--foreground)]">
                  <span className="w-8 shrink-0 font-mono tabular-nums">{quake.magnitude.toFixed(1)}</span>
                  <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{quake.place}</span>
                  <span className={`shrink-0 ${LABEL}`}>{timeAgo(quake.time, now)}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">{error ? "USGS did not answer. Retrying in a few minutes." : "Loading the USGS feed"}</p>
      )}
    </section>
  );
}

// The land file is an equirectangular map from 80°N to 60°S; dots use the same coordinates.
const MAP_TOP = 80;
const MAP_HEIGHT = 140;
const mapX = (lon: number) => lon + 180;
const mapY = (lat: number) => MAP_TOP - lat;

/** Splits the trail where it wraps from +180° to -180° so no line crosses the whole map. */
function trailSegments(trail: Array<{ lat: number; lon: number }>): string[] {
  const segments: string[] = [];
  let current = "";
  trail.forEach((point, index) => {
    const wrapped = index > 0 && Math.abs(point.lon - trail[index - 1].lon) > 180;
    if (wrapped && current) {
      segments.push(current);
      current = "";
    }
    current += `${current ? "L" : "M"}${mapX(point.lon).toFixed(2)} ${mapY(point.lat).toFixed(2)}`;
  });
  if (current) segments.push(current);
  return segments;
}

export function LiveMap({ iss, feed }: { iss: IssState; feed: QuakeState }) {
  const position = iss.position;
  const now = useNow(60000);
  return (
    <figure className="min-w-0">
      <div className="relative w-full" style={{ aspectRatio: `360 / ${MAP_HEIGHT}` }}>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[var(--line-strong)] opacity-30"
          style={{
            maskImage: "url(/images/pulse-board/land-110m.svg)",
            WebkitMaskImage: "url(/images/pulse-board/land-110m.svg)",
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
          }}
        />
        <svg
          viewBox={`0 0 360 ${MAP_HEIGHT}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          role="img"
          aria-label={
            position
              ? `World map with the space station near ${issRegion(position.lat, position.lon)} and ${feed.quakes?.length ?? 0} earthquakes from the past week`
              : "World map of the past week's earthquakes"
          }
        >
          {feed.quakes?.map((quake) => (
            <circle
              key={quake.id}
              cx={mapX(quake.lon)}
              cy={mapY(quake.lat)}
              r={0.35 + Math.max(0, quake.magnitude - 2.5) * 0.45}
              fill="var(--accent-2)"
              fillOpacity={0.12 + 0.5 * Math.max(0, 1 - (now - quake.time) / WEEK_MS)}
              stroke="var(--accent-2)"
              strokeWidth="0.25"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {trailSegments(iss.trail).map((d, index) => (
            <path key={index} d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeOpacity="0.7" vectorEffect="non-scaling-stroke" />
          ))}
          {position ? (
            <g>
              <circle cx={mapX(position.lon)} cy={mapY(position.lat)} r="3.2" fill="var(--accent)" fillOpacity="0.18" />
              <circle cx={mapX(position.lon)} cy={mapY(position.lat)} r="1.3" fill="var(--accent)" />
            </g>
          ) : null}
        </svg>
      </div>
      <figcaption className={`mt-2 flex flex-wrap gap-x-5 gap-y-1 ${LABEL}`}>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-accent" />
          Space station and its last 90 minutes
        </span>
        <span className="inline-flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-accent-2 opacity-60" />
          Earthquakes, past week, larger is stronger, brighter is newer
        </span>
      </figcaption>
    </figure>
  );
}

interface Edit {
  id: string;
  title: string;
  wiki: string;
  at: number;
}

const WIKI_ROWS = 6;
const WIKI_STEP_MS = 900;
const RATE_WINDOW_MS = 60000;

/** Wikimedia's server-sent event stream. One recent edit joins the list each step so it stays readable. */
export function WikiFeed() {
  const [edits, setEdits] = useState<Edit[]>([]);
  const [rate, setRate] = useState<{ count: number; seconds: number } | null>(null);
  const latest = useRef<Edit | null>(null);
  const stamps = useRef<number[]>([]);
  const now = useNow();

  useEffect(() => {
    let source: EventSource | null = null;
    const open = () => {
      if (document.hidden || source) return;
      source = new EventSource("https://stream.wikimedia.org/v2/stream/recentchange");
      source.onmessage = (event) => {
        try {
          const change = JSON.parse(event.data) as WikiChange & { id?: number };
          if (!isReadableEdit(change)) return;
          stamps.current.push(Date.now());
          latest.current = { id: `${change.wiki}-${change.id ?? Date.now()}`, title: change.title!, wiki: wikiLabel(change.server_name!), at: Date.now() };
        } catch {
          /* Skip malformed events. */
        }
      };
    };
    const close = () => {
      source?.close();
      source = null;
    };
    const onVisibility = () => (document.hidden ? close() : open());
    const openedAt = Date.now();
    const step = window.setInterval(() => {
      const at = Date.now();
      stamps.current = stamps.current.filter((stamp) => at - stamp <= RATE_WINDOW_MS);
      setRate({ count: stamps.current.length, seconds: Math.min(RATE_WINDOW_MS, at - openedAt) / 1000 });
      const edit = latest.current;
      if (!edit) return;
      latest.current = null;
      setEdits((previous) => [edit, ...previous].slice(0, WIKI_ROWS));
    }, WIKI_STEP_MS);
    open();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(step);
      close();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <section aria-label="Wikipedia edits" className="min-w-0">
      <p className={LABEL}>Wikipedia edits, all languages</p>
      {rate && rate.count > 0 ? (
        <p className="mt-2 text-2xl font-semibold tabular-nums">
          {rate.count}{" "}
          <span className="text-sm font-normal text-[var(--muted)]">
            article edits {rate.seconds >= RATE_WINDOW_MS / 1000 ? "in the last minute" : `in the first ${Math.floor(rate.seconds)} s`}
          </span>
        </p>
      ) : null}
      {edits.length ? (
        <ul className="mt-2">
          {edits.map((edit) => (
            <li key={edit.id} className="flex items-baseline gap-3 border-b border-[var(--line)] py-1.5 text-sm">
              <span className="w-10 shrink-0 truncate font-mono text-[0.7rem] uppercase text-[var(--sub)]">{edit.wiki}</span>
              <span className="min-w-0 flex-1 truncate">{edit.title}</span>
              <span className={`shrink-0 ${LABEL}`}>{timeAgo(edit.at, now)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-[var(--muted)]">Waiting for the first edit</p>
      )}
    </section>
  );
}

export const SOURCES = [
  { label: "Binance", href: "https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams" },
  { label: "CoinGecko", href: "https://www.coingecko.com/en/api" },
  { label: "Where the ISS at?", href: "https://wheretheiss.at/w/developer" },
  { label: "USGS", href: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php" },
  { label: "Wikimedia EventStreams", href: "https://stream.wikimedia.org/?doc" },
  { label: "Natural Earth", href: "https://www.naturalearthdata.com/" },
] as const;
