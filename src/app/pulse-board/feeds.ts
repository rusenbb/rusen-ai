/** Pure helpers for the Pulse Board feeds, kept apart from React so they are easy to test. */

export type CoinSymbol = "btc" | "eth" | "sol" | "bnb" | "xrp" | "doge" | "ada" | "avax";

export const COINS: ReadonlyArray<{ sym: CoinSymbol; pair: string; name: string; cgId: string }> = [
  { sym: "btc", pair: "BTCUSDT", name: "Bitcoin", cgId: "bitcoin" },
  { sym: "eth", pair: "ETHUSDT", name: "Ethereum", cgId: "ethereum" },
  { sym: "sol", pair: "SOLUSDT", name: "Solana", cgId: "solana" },
  { sym: "bnb", pair: "BNBUSDT", name: "BNB", cgId: "binancecoin" },
  { sym: "xrp", pair: "XRPUSDT", name: "XRP", cgId: "ripple" },
  { sym: "doge", pair: "DOGEUSDT", name: "Dogecoin", cgId: "dogecoin" },
  { sym: "ada", pair: "ADAUSDT", name: "Cardano", cgId: "cardano" },
  { sym: "avax", pair: "AVAXUSDT", name: "Avalanche", cgId: "avalanche-2" },
];

/** One closing price per minute. */
export interface MinutePoint {
  minute: number;
  price: number;
}

export const SPARK_MINUTES = 60;

/** Binance klines rows: [openTime, open, high, low, close, ...]. */
export function parseKlines(rows: unknown): MinutePoint[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (Array.isArray(row) ? { minute: Math.floor(Number(row[0]) / 60000), price: Number(row[4]) } : null))
    .filter((point): point is MinutePoint => !!point && Number.isFinite(point.minute) && Number.isFinite(point.price) && point.price > 0);
}

/** Folds a trade into the per-minute series: the same minute updates its close, a new minute appends. */
export function mergeTrade(series: MinutePoint[], timeMs: number, price: number, keep = SPARK_MINUTES): MinutePoint[] {
  const minute = Math.floor(timeMs / 60000);
  const last = series.at(-1);
  if (last && minute < last.minute) return series;
  const next = last && last.minute === minute ? [...series.slice(0, -1), { minute, price }] : [...series, { minute, price }];
  return next.slice(-keep);
}

export function formatPrice(price: number): string {
  if (!price) return "--";
  if (price >= 1000) return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (price >= 1) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export interface WikiChange {
  type?: string;
  namespace?: number;
  title?: string;
  wiki?: string;
  server_name?: string;
}

/**
 * Wikipedia article edits a reader can recognise. The stream also carries Wikidata, Commons and
 * other projects; Wikidata items arrive as raw ids ("Q86858495"), so those rows are dropped.
 */
export function isReadableEdit(change: WikiChange): boolean {
  if (change.type !== "edit" || change.namespace !== 0) return false;
  if (!change.title || !change.wiki) return false;
  if (!change.server_name?.endsWith(".wikipedia.org")) return false;
  return !/^[QPL]\d+$/.test(change.title);
}

/** "en.wikipedia.org" -> "EN". */
export function wikiLabel(serverName: string): string {
  return serverName.split(".")[0].toUpperCase();
}

export function timeAgo(timestamp: number, nowMs: number): string {
  const seconds = Math.max(0, Math.floor((nowMs - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/** Coarse region names; falls back to coordinates over open water the boxes miss. */
export function issRegion(lat: number, lon: number): string {
  if (lat > 60) return "Over the Arctic";
  if (lat < -60) return "Over Antarctica";
  if (lon > -30 && lon < 60 && lat > 35 && lat < 70) return "Over Europe";
  if (lon > -130 && lon < -60 && lat > 25 && lat < 50) return "Over North America";
  if (lon > 60 && lon < 150 && lat > 0 && lat < 60) return "Over Asia";
  if (lon > -80 && lon < -30 && lat > -60 && lat < 15) return "Over South America";
  if (lon > 10 && lon < 55 && lat > -40 && lat < 40) return "Over Africa";
  if (lon > 110 && lon < 180 && lat > -50 && lat < 0) return "Over Oceania";
  if (lon > -80 && lon < 0) return "Over the Atlantic";
  if (lon < -100 || lon > 150) return "Over the Pacific";
  if (lon > 20 && lon < 120 && lat < 30 && lat > -40) return "Over the Indian Ocean";
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(1)}°${ns}, ${Math.abs(lon).toFixed(1)}°${ew}`;
}
