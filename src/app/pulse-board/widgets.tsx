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

export function IssFeed() {
  const [position, setPosition] = useState<{ lat: number; lon: number; altitude: number; velocity: number } | null>(null);
  const [error, setError] = useState(false);

  const fetchIss = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetchPublic("https://api.wheretheiss.at/v1/satellites/25544", { signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      setPosition({ lat: data.latitude, lon: data.longitude, altitude: Math.round(data.altitude), velocity: Math.round(data.velocity) });
      setError(false);
    } catch {
      if (!signal.aborted) setError(true);
    }
  }, []);
  useVisiblePolling(fetchIss, 5000);

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
}

export function QuakeFeed() {
  const [quakes, setQuakes] = useState<Quake[] | null>(null);
  const [error, setError] = useState(false);
  const now = useNow(30000);

  const fetchQuakes = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetchPublic("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson", { signal });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      setQuakes(
        (data.features as Array<{ id: string; properties: { mag: number; place: string; time: number; url: string } }>).map((feature) => ({
          id: feature.id,
          magnitude: feature.properties.mag,
          place: feature.properties.place,
          time: feature.properties.time,
          url: feature.properties.url,
        })),
      );
      setError(false);
    } catch {
      if (!signal.aborted) setError(true);
    }
  }, []);
  useVisiblePolling(fetchQuakes, 300000);

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

interface Edit {
  id: string;
  title: string;
  wiki: string;
  at: number;
}

const WIKI_ROWS = 6;
const WIKI_STEP_MS = 900;

/** Wikimedia's server-sent event stream. One recent edit joins the list each step so it stays readable. */
export function WikiFeed() {
  const [edits, setEdits] = useState<Edit[]>([]);
  const latest = useRef<Edit | null>(null);
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
    const step = window.setInterval(() => {
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
] as const;
