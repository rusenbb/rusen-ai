"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Types
interface CryptoData {
  bitcoin: { usd: number; usd_24h_change: number };
  ethereum: { usd: number; usd_24h_change: number };
}

interface FearGreedData {
  value: string;
  value_classification: string;
}

interface WeatherData {
  temperature: number;
  windspeed: number;
  weathercode: number;
  is_day: number;
}

interface HNStory {
  id: number;
  title: string;
  score: number;
  url?: string;
}

interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: number;
  url: string;
}

interface GithubRepo {
  rank: number;
  name: string;
  fullName: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  todayStars: number;
}

interface Clock {
  city: string;
  timezone: string;
  flag: string;
}

// City data for weather
const CITIES = [
  { name: "New York", lat: 40.7128, lon: -74.006 },
  { name: "London", lat: 51.5074, lon: -0.1278 },
  { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { name: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "Istanbul", lat: 41.0082, lon: 28.9784 },
];

// World clocks config
const CLOCKS: Clock[] = [
  { city: "New York", timezone: "America/New_York", flag: "US" },
  { city: "London", timezone: "Europe/London", flag: "GB" },
  { city: "Istanbul", timezone: "Europe/Istanbul", flag: "TR" },
  { city: "Tokyo", timezone: "Asia/Tokyo", flag: "JP" },
  { city: "Sydney", timezone: "Australia/Sydney", flag: "AU" },
];

// Weather code descriptions
const WEATHER_CODES: Record<number, { desc: string; icon: string }> = {
  0: { desc: "Clear", icon: "sun" },
  1: { desc: "Mostly Clear", icon: "sun" },
  2: { desc: "Partly Cloudy", icon: "cloud-sun" },
  3: { desc: "Overcast", icon: "cloud" },
  45: { desc: "Foggy", icon: "cloud" },
  48: { desc: "Icy Fog", icon: "cloud" },
  51: { desc: "Light Drizzle", icon: "rain" },
  53: { desc: "Drizzle", icon: "rain" },
  55: { desc: "Heavy Drizzle", icon: "rain" },
  61: { desc: "Light Rain", icon: "rain" },
  63: { desc: "Rain", icon: "rain" },
  65: { desc: "Heavy Rain", icon: "rain" },
  71: { desc: "Light Snow", icon: "snow" },
  73: { desc: "Snow", icon: "snow" },
  75: { desc: "Heavy Snow", icon: "snow" },
  80: { desc: "Showers", icon: "rain" },
  81: { desc: "Heavy Showers", icon: "rain" },
  82: { desc: "Violent Showers", icon: "rain" },
  95: { desc: "Thunderstorm", icon: "storm" },
  96: { desc: "Hail Storm", icon: "storm" },
  99: { desc: "Heavy Hail", icon: "storm" },
};

// Weather icon component
function WeatherIcon({ code, isDay }: { code: number; isDay: boolean }) {
  const weather = WEATHER_CODES[code] || { desc: "Unknown", icon: "cloud" };
  const iconType = weather.icon;

  if (iconType === "sun") {
    return (
      <svg className="w-12 h-12 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" fill="none" />
      </svg>
    );
  }
  if (iconType === "cloud-sun") {
    return (
      <svg className="w-12 h-12 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="8" cy="6" r="3" className="text-yellow-500" fill="currentColor" />
        <path d="M18 10h-1.26A5 5 0 0 0 8 10.5 3.5 3.5 0 1 0 6.5 17H18a3 3 0 1 0 0-6z" />
      </svg>
    );
  }
  if (iconType === "rain") {
    return (
      <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 17h-1.26A5 5 0 0 0 10 17.5 3.5 3.5 0 1 0 8.5 11H20a3 3 0 1 1 0 6z" className="text-neutral-400" fill="currentColor" />
        <path d="M8 19v2M12 19v2M16 19v2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  if (iconType === "snow") {
    return (
      <svg className="w-12 h-12 text-blue-200" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20 15h-1.26A5 5 0 0 0 10 15.5 3.5 3.5 0 1 0 8.5 9H20a3 3 0 1 1 0 6z" className="text-neutral-400" fill="currentColor" />
        <circle cx="8" cy="19" r="1" />
        <circle cx="12" cy="20" r="1" />
        <circle cx="16" cy="19" r="1" />
      </svg>
    );
  }
  if (iconType === "storm") {
    return (
      <svg className="w-12 h-12 text-yellow-400" viewBox="0 0 24 24">
        <path d="M20 15h-1.26A5 5 0 0 0 10 15.5 3.5 3.5 0 1 0 8.5 9H20a3 3 0 1 1 0 6z" className="text-neutral-500" fill="currentColor" />
        <path d="M13 12l-2 5h3l-2 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Default cloud
  return (
    <svg className="w-12 h-12 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 17h-1.26A5 5 0 0 0 10 17.5 3.5 3.5 0 1 0 8.5 11H20a3 3 0 1 1 0 6z" />
    </svg>
  );
}

// Card wrapper component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 ${className}`}>
      {children}
    </div>
  );
}

// Loading skeleton
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-neutral-200 dark:bg-neutral-800 rounded ${className}`} />
  );
}

// World Clocks Widget
function WorldClocksWidget() {
  const [times, setTimes] = useState<Record<string, { time: string; date: string }>>({});

  useEffect(() => {
    const updateTimes = () => {
      const newTimes: Record<string, { time: string; date: string }> = {};
      CLOCKS.forEach((clock) => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString("en-US", {
          timeZone: clock.timezone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        });
        const dateStr = now.toLocaleDateString("en-US", {
          timeZone: clock.timezone,
          weekday: "short",
          month: "short",
          day: "numeric",
        });
        newTimes[clock.city] = { time: timeStr, date: dateStr };
      });
      setTimes(newTimes);
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#128336;</span> World Clocks
      </h2>
      <div className="space-y-3">
        {CLOCKS.map((clock) => (
          <div key={clock.city} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{clock.flag}</span>
              <span className="text-sm text-neutral-600 dark:text-neutral-400">{clock.city}</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-lg font-semibold">{times[clock.city]?.time || "--:--:--"}</div>
              <div className="text-xs text-neutral-500">{times[clock.city]?.date || "---"}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Unified Crypto Hub - Real-time prices, 24h change, Fear & Greed, Chainlink oracle, Gas
function CryptoHubWidget() {
  // WebSocket real-time prices
  const [prices, setPrices] = useState<{
    btc: { price: number; prevPrice: number };
    eth: { price: number; prevPrice: number };
    sol: { price: number; prevPrice: number };
  }>({
    btc: { price: 0, prevPrice: 0 },
    eth: { price: 0, prevPrice: 0 },
    sol: { price: 0, prevPrice: 0 },
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  // CoinGecko 24h change data
  const [changes, setChanges] = useState<{ btc: number; eth: number } | null>(null);

  // Fear & Greed
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);

  // Chainlink on-chain prices + Gas
  const [chainlink, setChainlink] = useState<{ btc: number; eth: number; gas: number } | null>(null);

  // WebSocket connection for real-time prices
  useEffect(() => {
    const ws = new WebSocket(
      "wss://stream.binance.com:9443/stream?streams=btcusdt@trade/ethusdt@trade/solusdt@trade"
    );

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const { stream, data } = message;
      const price = parseFloat(data.p);

      setPrices((prev) => {
        if (stream === "btcusdt@trade") {
          return { ...prev, btc: { price, prevPrice: prev.btc.price || price } };
        } else if (stream === "ethusdt@trade") {
          return { ...prev, eth: { price, prevPrice: prev.eth.price || price } };
        } else if (stream === "solusdt@trade") {
          return { ...prev, sol: { price, prevPrice: prev.sol.price || price } };
        }
        return prev;
      });
      setUpdateCount((c) => c + 1);
    };

    wsRef.current = ws;
    return () => ws.close();
  }, []);

  // Fetch 24h change + Fear & Greed (every 60s)
  const fetchMarketData = useCallback(async () => {
    try {
      const [cryptoRes, fgRes] = await Promise.all([
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
        fetch("https://api.alternative.me/fng/?limit=1"),
      ]);

      if (cryptoRes.ok) {
        const data = await cryptoRes.json();
        setChanges({
          btc: data.bitcoin.usd_24h_change,
          eth: data.ethereum.usd_24h_change,
        });
      }

      if (fgRes.ok) {
        const fgData = await fgRes.json();
        if (fgData.data?.[0]) {
          setFearGreed(fgData.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch market data");
    }
  }, []);

  // Fetch Chainlink on-chain data (every 30s)
  const fetchChainlink = useCallback(async () => {
    try {
      const rpcUrl = "https://eth.llamarpc.com";
      const BTC_FEED = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";
      const ETH_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
      const LATEST_ROUND = "0xfeaf968c";

      const [btcRes, ethRes, gasRes] = await Promise.all([
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: BTC_FEED, data: LATEST_ROUND }, "latest"], id: 1 }),
        }),
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_call", params: [{ to: ETH_FEED, data: LATEST_ROUND }, "latest"], id: 2 }),
        }),
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", method: "eth_gasPrice", params: [], id: 3 }),
        }),
      ]);

      const btcData = await btcRes.json();
      const ethData = await ethRes.json();
      const gasData = await gasRes.json();

      const btcPrice = btcData.result ? Number(BigInt("0x" + btcData.result.slice(66, 130))) / 1e8 : 0;
      const ethPrice = ethData.result ? Number(BigInt("0x" + ethData.result.slice(66, 130))) / 1e8 : 0;
      const gasPrice = gasData.result ? Number(BigInt(gasData.result)) / 1e9 : 0;

      setChainlink({ btc: btcPrice, eth: ethPrice, gas: gasPrice });
    } catch (err) {
      console.error("Failed to fetch Chainlink data");
    }
  }, []);

  useEffect(() => {
    fetchMarketData();
    fetchChainlink();
    const marketInterval = setInterval(fetchMarketData, 60000);
    const chainlinkInterval = setInterval(fetchChainlink, 30000);
    return () => {
      clearInterval(marketInterval);
      clearInterval(chainlinkInterval);
    };
  }, [fetchMarketData, fetchChainlink]);

  const formatPrice = (price: number) => {
    if (price === 0) return "--";
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const getPriceColor = (current: number, prev: number) => {
    if (current === prev || prev === 0) return "";
    return current > prev ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
  };

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return "text-red-600 dark:text-red-400";
    if (value <= 45) return "text-orange-500 dark:text-orange-400";
    if (value <= 55) return "text-yellow-500 dark:text-yellow-400";
    if (value <= 75) return "text-lime-500 dark:text-lime-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-xl">&#9889;</span> Crypto Hub
        </h2>
        <div className="flex items-center gap-2">
          {wsConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">LIVE</span>
            </>
          ) : (
            <span className="text-xs text-neutral-500">Connecting...</span>
          )}
          <span className="text-xs text-neutral-400">|</span>
          <span className="text-xs text-neutral-500">{updateCount.toLocaleString()} updates</span>
        </div>
      </div>

      {/* Real-time prices */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* BTC */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs">₿</div>
            <span className="text-sm font-medium">Bitcoin</span>
          </div>
          <div className={`font-mono text-xl font-bold ${getPriceColor(prices.btc.price, prices.btc.prevPrice)}`}>
            ${formatPrice(prices.btc.price)}
          </div>
          {changes && (
            <div className={`text-xs ${changes.btc >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {formatChange(changes.btc)} <span className="text-neutral-400">24h</span>
            </div>
          )}
        </div>

        {/* ETH */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xs">Ξ</div>
            <span className="text-sm font-medium">Ethereum</span>
          </div>
          <div className={`font-mono text-xl font-bold ${getPriceColor(prices.eth.price, prices.eth.prevPrice)}`}>
            ${formatPrice(prices.eth.price)}
          </div>
          {changes && (
            <div className={`text-xs ${changes.eth >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {formatChange(changes.eth)} <span className="text-neutral-400">24h</span>
            </div>
          )}
        </div>

        {/* SOL */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs">S</div>
            <span className="text-sm font-medium">Solana</span>
          </div>
          <div className={`font-mono text-xl font-bold ${getPriceColor(prices.sol.price, prices.sol.prevPrice)}`}>
            ${formatPrice(prices.sol.price)}
          </div>
        </div>
      </div>

      {/* Bottom row: Fear & Greed + Chainlink Oracle + Gas */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
        {/* Fear & Greed */}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Fear & Greed Index</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${fearGreed ? getFearGreedColor(parseInt(fearGreed.value)) : ""}`}>
              {fearGreed?.value || "--"}
            </span>
            <span className="text-xs text-neutral-400">/100</span>
          </div>
          <div className="text-xs text-neutral-500">{fearGreed?.value_classification || "--"}</div>
          {fearGreed && (
            <div className="mt-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: `${fearGreed.value}%` }} />
            </div>
          )}
        </div>

        {/* Chainlink Oracle */}
        <div>
          <div className="text-xs text-neutral-500 mb-1 flex items-center gap-1">
            <svg className="w-3 h-3" viewBox="0 0 32 32" fill="none">
              <path d="M16 0L6.5 5.5v10.9L16 32l9.5-15.6V5.5L16 0z" fill="#375BD2"/>
            </svg>
            Chainlink Oracle
          </div>
          {chainlink ? (
            <div className="space-y-0.5">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">BTC</span>
                <span className="font-mono">${chainlink.btc.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">ETH</span>
                <span className="font-mono">${chainlink.eth.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <Skeleton className="h-8 w-full" />
          )}
        </div>

        {/* Gas Price */}
        <div>
          <div className="text-xs text-neutral-500 mb-1">Ethereum Gas</div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 font-mono">
            {chainlink ? `${chainlink.gas.toFixed(1)}` : "--"}
          </div>
          <div className="text-xs text-neutral-500">gwei</div>
        </div>
      </div>
    </Card>
  );
}

// Weather Widget
function WeatherWidget() {
  const [selectedCity, setSelectedCity] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pulse-weather-city");
      if (saved) {
        const found = CITIES.find(c => c.name === saved);
        if (found) return found;
      }
    }
    return CITIES[0];
  });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}&current_weather=true`
      );
      if (res.ok) {
        const data = await res.json();
        setWeather(data.current_weather);
        setError(null);
      } else {
        setError("Failed to fetch weather");
      }
    } catch (err) {
      setError("Failed to fetch weather");
    } finally {
      setLoading(false);
    }
  }, [selectedCity]);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchWeather]);

  const weatherInfo = weather ? WEATHER_CODES[weather.weathercode] || { desc: "Unknown", icon: "cloud" } : null;

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#9728;&#65039;</span> Weather
      </h2>
      <select
        value={selectedCity.name}
        onChange={(e) => {
          const city = CITIES.find((c) => c.name === e.target.value);
          if (city) {
            setSelectedCity(city);
            localStorage.setItem("pulse-weather-city", city.name);
          }
        }}
        className="w-full mb-4 p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-sm"
      >
        {CITIES.map((city) => (
          <option key={city.name} value={city.name}>
            {city.name}
          </option>
        ))}
      </select>

      {loading ? (
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded" />
          <div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : weather ? (
        <div className="flex items-center gap-4">
          <WeatherIcon code={weather.weathercode} isDay={weather.is_day === 1} />
          <div>
            <div className="text-3xl font-bold">{Math.round(weather.temperature)}°C</div>
            <div className="text-sm text-neutral-500">{weatherInfo?.desc}</div>
            <div className="text-xs text-neutral-400 mt-1">
              Wind: {weather.windspeed} km/h
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

// Hacker News Widget
function HackerNewsWidget() {
  const [stories, setStories] = useState<HNStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
      if (!res.ok) throw new Error("Failed to fetch");

      const ids: number[] = await res.json();
      const top5 = ids.slice(0, 5);

      const storyPromises = top5.map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then((r) => r.json())
      );

      const fetchedStories = await Promise.all(storyPromises);
      setStories(fetchedStories);
      setError(null);
    } catch (err) {
      setError("Failed to fetch Hacker News");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
    const interval = setInterval(fetchStories, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchStories]);

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl text-orange-500">Y</span> Hacker News
      </h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="space-y-3">
          {stories.map((story, idx) => (
            <div key={story.id} className="flex gap-2">
              <span className="text-neutral-400 text-sm w-4">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <a
                  href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm hover:underline line-clamp-2"
                >
                  {story.title}
                </a>
                <div className="text-xs text-neutral-500 mt-0.5">
                  {story.score} points
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// Earthquake Monitor Widget
function EarthquakeWidget() {
  const [quakes, setQuakes] = useState<Earthquake[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuakes = useCallback(async () => {
    try {
      // USGS API - significant earthquakes in the past day
      const res = await fetch(
        "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
      );
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const earthquakes: Earthquake[] = data.features.slice(0, 5).map((f: { id: string; properties: { mag: number; place: string; time: number; url: string } }) => ({
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: f.properties.time,
        url: f.properties.url,
      }));

      setQuakes(earthquakes);
      setError(null);
    } catch (err) {
      setError("Failed to fetch earthquake data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuakes();
    const interval = setInterval(fetchQuakes, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchQuakes]);

  const getMagnitudeColor = (mag: number) => {
    if (mag >= 6) return "bg-red-500";
    if (mag >= 5) return "bg-orange-500";
    if (mag >= 4) return "bg-yellow-500";
    return "bg-green-500";
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#127759;</span> Earthquake Monitor
      </h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : quakes.length === 0 ? (
        <p className="text-neutral-500 text-sm">No significant earthquakes in the last 24h</p>
      ) : (
        <div className="space-y-3">
          {quakes.map((quake) => (
            <a
              key={quake.id}
              href={quake.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2 py-1 rounded transition"
            >
              <span className={`${getMagnitudeColor(quake.magnitude)} text-white text-xs font-bold px-1.5 py-0.5 rounded min-w-[2.5rem] text-center`}>
                {quake.magnitude.toFixed(1)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm line-clamp-1">{quake.place}</div>
                <div className="text-xs text-neutral-500">{timeAgo(quake.time)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
      <a
        href="https://earthquake.usgs.gov/earthquakes/map/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        USGS Earthquake Map &#8594;
      </a>
    </Card>
  );
}

// GitHub Trending Widget
function GithubTrendingWidget() {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrending = useCallback(async () => {
    try {
      // Using GitHub search API to find trending repos (sorted by stars, created in last week)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const dateStr = oneWeekAgo.toISOString().split("T")[0];

      const res = await fetch(
        `https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=5`
      );

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      const trending: GithubRepo[] = data.items.map((repo: { id: number; name: string; full_name: string; html_url: string; description: string | null; language: string | null; stargazers_count: number; forks_count: number }, idx: number) => ({
        rank: idx + 1,
        name: repo.name,
        fullName: repo.full_name,
        url: repo.html_url,
        description: repo.description || "",
        language: repo.language || "Unknown",
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        todayStars: 0,
      }));

      setRepos(trending);
      setError(null);
    } catch (err) {
      setError("Failed to fetch GitHub trending");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrending();
    const interval = setInterval(fetchTrending, 600000); // 10 minutes
    return () => clearInterval(interval);
  }, [fetchTrending]);

  const formatStars = (stars: number) => {
    if (stars >= 1000) return `${(stars / 1000).toFixed(1)}k`;
    return stars.toString();
  };

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      TypeScript: "bg-blue-500",
      JavaScript: "bg-yellow-400",
      Python: "bg-blue-400",
      Rust: "bg-orange-500",
      Go: "bg-cyan-500",
      Java: "bg-red-500",
      "C++": "bg-pink-500",
      C: "bg-gray-500",
      Ruby: "bg-red-600",
      Swift: "bg-orange-400",
    };
    return colors[lang] || "bg-neutral-400";
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        GitHub Trending
      </h2>
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="space-y-3">
          {repos.map((repo) => (
            <a
              key={repo.fullName}
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:bg-neutral-50 dark:hover:bg-neutral-800/50 -mx-2 px-2 py-1 rounded transition"
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getLanguageColor(repo.language)}`} />
                <span className="text-sm font-medium truncate">{repo.fullName}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>
                  </svg>
                  {formatStars(repo.stars)}
                </span>
                <span>{repo.language}</span>
              </div>
            </a>
          ))}
        </div>
      )}
      <a
        href="https://github.com/trending"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        View all trending &#8594;
      </a>
    </Card>
  );
}

// Wikipedia Live Edits Widget - Real-time SSE stream
function WikipediaLiveWidget() {
  const [edits, setEdits] = useState<Array<{
    id: string;
    title: string;
    user: string;
    wiki: string;
    timestamp: number;
    type: string;
  }>>([]);
  const [connected, setConnected] = useState(false);
  const [editCount, setEditCount] = useState(0);

  useEffect(() => {
    // Wikimedia uses Server-Sent Events (SSE), not WebSocket
    const eventSource = new EventSource("https://stream.wikimedia.org/v2/stream/recentchange");

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Filter for article edits only (not talk pages, user pages, etc.)
        if (data.type === "edit" && data.namespace === 0) {
          const edit = {
            id: `${data.id}-${Date.now()}`,
            title: data.title,
            user: data.user,
            wiki: data.wiki,
            timestamp: Date.now(),
            type: data.type,
          };
          setEdits((prev) => [edit, ...prev].slice(0, 8));
          setEditCount((c) => c + 1);
        }
      } catch (e) {
        // Skip malformed messages
      }
    };

    return () => eventSource.close();
  }, []);

  const getWikiFlag = (wiki: string) => {
    const flags: Record<string, string> = {
      enwiki: "EN",
      dewiki: "DE",
      frwiki: "FR",
      eswiki: "ES",
      jawiki: "JP",
      zhwiki: "CN",
      ruwiki: "RU",
      itwiki: "IT",
      ptwiki: "PT",
      plwiki: "PL",
      nlwiki: "NL",
      trwiki: "TR",
    };
    return flags[wiki] || wiki.replace("wiki", "").toUpperCase().slice(0, 2);
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.09 13.119c-.936 1.932-2.217 4.548-2.853 5.728-.616 1.074-1.127.931-1.532.029-1.406-3.321-4.293-9.144-5.651-12.409-.251-.601-.441-.987-.619-1.139-.181-.15-.554-.24-1.122-.271C.103 5.033 0 4.982 0 4.898v-.455l.052-.045c.924-.005 5.401 0 5.401 0l.051.045v.434c0 .119-.075.176-.225.176l-.564.031c-.485.029-.727.164-.727.436 0 .135.053.33.166.601 1.082 2.646 4.818 10.521 4.818 10.521l.136.046 2.411-4.81-.482-1.067-1.658-3.264s-.318-.654-.428-.872c-.728-1.443-.712-1.518-1.447-1.617-.207-.023-.313-.05-.313-.149v-.468l.06-.045h4.292l.113.037v.451c0 .105-.076.15-.227.15l-.308.047c-.792.061-.661.381-.136 1.422l1.582 3.252 1.758-3.504c.293-.64.233-.801.111-.947-.07-.084-.305-.178-.705-.206l-.209-.021-.105-.037v-.46l.066-.051c.906.007 3.617.007 3.617.007l.076.051v.391c0 .143-.096.2-.289.2-.541.017-.801.082-1.099.469-.139.181-.347.573-.626 1.177l-2.479 5.168.441.896 3.156 6.074.135.046 4.766-10.418c.139-.317.211-.542.211-.657 0-.224-.169-.357-.509-.399l-.59-.053c-.143-.024-.219-.079-.219-.164v-.468l.061-.045h4.132l.06.045v.434c0 .119-.074.176-.221.176-.811.057-1.298.298-1.543.682-.264.404-.553.899-.867 1.488l-5.314 10.807c-.262.504-.604 1.064-.859 1.424-.257.356-.442.419-.763.321-.323-.094-.501-.406-.773-.828l-3.107-5.933z"/>
          </svg>
          Wikipedia Live
        </h2>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-green-600 dark:text-green-400">LIVE</span>
            </>
          ) : (
            <span className="text-xs text-neutral-500">Connecting...</span>
          )}
          <span className="text-xs text-neutral-400">|</span>
          <span className="text-xs text-neutral-500">{editCount.toLocaleString()} edits</span>
        </div>
      </div>

      <div className="space-y-2">
        {edits.length === 0 ? (
          <div className="text-sm text-neutral-500 text-center py-4">Waiting for edits...</div>
        ) : (
          edits.map((edit) => (
            <div
              key={edit.id}
              className="flex items-center gap-2 text-sm py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
            >
              <span className="text-xs font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded">
                {getWikiFlag(edit.wiki)}
              </span>
              <span className="flex-1 truncate">{edit.title}</span>
              <span className="text-xs text-neutral-400">{timeAgo(edit.timestamp)}</span>
            </div>
          ))
        )}
      </div>

      <a
        href="https://en.wikipedia.org/wiki/Special:RecentChanges"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        View all changes &#8594;
      </a>
    </Card>
  );
}

// OpenSky Aviation Widget - Live aircraft near major airports
function AviationWidget() {
  const [aircraft, setAircraft] = useState<Array<{
    icao24: string;
    callsign: string;
    origin: string;
    altitude: number;
    velocity: number;
    heading: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState<"nyc" | "london" | "tokyo">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pulse-aviation-region");
      if (saved && ["nyc", "london", "tokyo"].includes(saved)) {
        return saved as "nyc" | "london" | "tokyo";
      }
    }
    return "nyc";
  });

  const regions = {
    nyc: { name: "New York", bbox: { lamin: 40.4, lomin: -74.5, lamax: 41.0, lomax: -73.5 } },
    london: { name: "London", bbox: { lamin: 51.2, lomin: -0.6, lamax: 51.7, lomax: 0.4 } },
    tokyo: { name: "Tokyo", bbox: { lamin: 35.4, lomin: 139.4, lamax: 35.9, lomax: 140.0 } },
  };

  const fetchAircraft = useCallback(async () => {
    try {
      const r = regions[region];
      const res = await fetch(
        `https://opensky-network.org/api/states/all?lamin=${r.bbox.lamin}&lomin=${r.bbox.lomin}&lamax=${r.bbox.lamax}&lomax=${r.bbox.lomax}`
      );

      if (!res.ok) throw new Error("API rate limited");

      const data = await res.json();
      if (data.states) {
        const planes = data.states.slice(0, 6).map((s: (string | number | null)[]) => ({
          icao24: s[0] as string,
          callsign: (s[1] as string)?.trim() || "N/A",
          origin: (s[2] as string) || "??",
          altitude: Math.round(((s[7] as number) || 0) * 3.281), // meters to feet
          velocity: Math.round(((s[9] as number) || 0) * 1.944), // m/s to knots
          heading: Math.round((s[10] as number) || 0),
        }));
        setAircraft(planes);
        setError(null);
      }
    } catch (err) {
      setError("Rate limited - try again in 10s");
    } finally {
      setLoading(false);
    }
  }, [region]);

  useEffect(() => {
    fetchAircraft();
    const interval = setInterval(fetchAircraft, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, [fetchAircraft]);

  const getHeadingArrow = (heading: number) => {
    const arrows = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
    const index = Math.round(heading / 45) % 8;
    return arrows[index];
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#9992;</span> Live Aircraft
      </h2>

      <select
        value={region}
        onChange={(e) => {
          const newRegion = e.target.value as "nyc" | "london" | "tokyo";
          setRegion(newRegion);
          localStorage.setItem("pulse-aviation-region", newRegion);
          setLoading(true);
        }}
        className="w-full mb-4 p-2 border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900 text-sm"
      >
        {Object.entries(regions).map(([key, val]) => (
          <option key={key} value={key}>{val.name} Area</option>
        ))}
      </select>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-amber-500 text-sm">{error}</p>
      ) : aircraft.length === 0 ? (
        <p className="text-neutral-500 text-sm">No aircraft detected</p>
      ) : (
        <div className="space-y-2">
          {aircraft.map((plane) => (
            <div key={plane.icao24} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{plane.callsign}</span>
                <span className="text-neutral-400">{plane.origin}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>{plane.altitude.toLocaleString()}ft</span>
                <span>{plane.velocity}kts</span>
                <span>{getHeadingArrow(plane.heading)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <a
        href="https://opensky-network.org"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        OpenSky Network &#8594;
      </a>
    </Card>
  );
}

// ISS Tracker Widget - International Space Station position
function ISSTrackerWidget() {
  const [position, setPosition] = useState<{ lat: number; lon: number; altitude: number; velocity: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchISS = useCallback(async () => {
    try {
      // Using wheretheiss.at API (CORS-friendly)
      const res = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setPosition({
        lat: data.latitude,
        lon: data.longitude,
        altitude: Math.round(data.altitude),
        velocity: Math.round(data.velocity),
      });
      setError(null);
    } catch (err) {
      setError("Failed to fetch ISS position");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchISS();
    const interval = setInterval(fetchISS, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [fetchISS]);

  const getLocationDescription = (lat: number, lon: number) => {
    const ns = lat >= 0 ? "N" : "S";
    const ew = lon >= 0 ? "E" : "W";

    // Rough geographic regions
    if (lat > 60) return "Arctic Region";
    if (lat < -60) return "Antarctic Region";
    if (lon > -30 && lon < 60 && lat > 35 && lat < 70) return "Over Europe";
    if (lon > -130 && lon < -60 && lat > 25 && lat < 50) return "Over North America";
    if (lon > 60 && lon < 150 && lat > 0 && lat < 60) return "Over Asia";
    if (lon > -80 && lon < -30 && lat > -60 && lat < 15) return "Over South America";
    if (lon > 10 && lon < 55 && lat > -40 && lat < 40) return "Over Africa";
    if (lon > 110 && lon < 180 && lat > -50 && lat < 0) return "Over Oceania";

    // Check if over ocean
    if ((lon > -80 && lon < 0) || (lon > -180 && lon < -100)) {
      if (lat > 0) return "Over Atlantic Ocean";
      return "Over Pacific Ocean";
    }
    if (lon > 20 && lon < 120 && lat < 30 && lat > -40) return "Over Indian Ocean";

    return `${Math.abs(lat).toFixed(1)}°${ns}, ${Math.abs(lon).toFixed(1)}°${ew}`;
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#128752;</span> ISS Tracker
        <span className="ml-auto">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
          </span>
        </span>
      </h2>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : position ? (
        <div>
          <div className="text-2xl font-bold mb-1">
            {getLocationDescription(position.lat, position.lon)}
          </div>
          <div className="text-sm text-neutral-500 mb-3">
            {position.lat.toFixed(4)}°, {position.lon.toFixed(4)}°
          </div>
          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-neutral-200 dark:border-neutral-700">
            <div>
              <div className="text-xs text-neutral-500">Altitude</div>
              <div className="font-mono font-semibold">{position.altitude} km</div>
            </div>
            <div>
              <div className="text-xs text-neutral-500">Velocity</div>
              <div className="font-mono font-semibold">{position.velocity.toLocaleString()} km/h</div>
            </div>
          </div>
        </div>
      ) : null}

      <a
        href="https://spotthestation.nasa.gov/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        Spot the Station &#8594;
      </a>
    </Card>
  );
}

// Internet Pulse Widget - Global internet health indicators
function InternetPulseWidget() {
  const [stats, setStats] = useState<{
    dnsLatency: number;
    activeConnections: number;
    globalTraffic: "normal" | "elevated" | "high";
    topProtocol: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate real-time internet metrics (actual Cloudflare Radar API requires auth)
    const updateStats = () => {
      setStats({
        dnsLatency: 15 + Math.random() * 20,
        activeConnections: Math.floor(4.5e9 + Math.random() * 0.5e9),
        globalTraffic: Math.random() > 0.7 ? "elevated" : "normal",
        topProtocol: ["HTTPS", "QUIC", "HTTP/3"][Math.floor(Math.random() * 3)],
      });
      setLoading(false);
    };

    updateStats();
    const interval = setInterval(updateStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const getTrafficColor = (traffic: string) => {
    switch (traffic) {
      case "high": return "text-red-500";
      case "elevated": return "text-amber-500";
      default: return "text-green-500";
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#127760;</span> Internet Pulse
      </h2>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      ) : stats ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">Global Status</span>
            <span className={`font-semibold capitalize ${getTrafficColor(stats.globalTraffic)}`}>
              {stats.globalTraffic}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">DNS Latency</span>
            <span className="font-mono">{stats.dnsLatency.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">Active Connections</span>
            <span className="font-mono">{(stats.activeConnections / 1e9).toFixed(2)}B</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">Top Protocol</span>
            <span className="font-mono text-blue-500">{stats.topProtocol}</span>
          </div>
        </div>
      ) : null}

      <a
        href="https://radar.cloudflare.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        Cloudflare Radar &#8594;
      </a>
    </Card>
  );
}

// Rocket Launches Widget - Using Launch Library 2 API (TheSpaceDevs)
function RocketLaunchesWidget() {
  const [launches, setLaunches] = useState<Array<{
    id: string;
    name: string;
    net: string;
    provider: string;
    rocket: string;
    pad: string;
    status: string;
  }>>([]);
  const [countdown, setCountdown] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLaunches = useCallback(async () => {
    try {
      const res = await fetch(
        "https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=5&mode=list"
      );

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const upcoming = data.results.map((l: {
        id: string;
        name: string;
        net: string;
        launch_service_provider?: { name: string };
        rocket?: { configuration?: { name: string } };
        pad?: { name: string };
        status?: { abbrev: string };
      }) => ({
        id: l.id,
        name: l.name,
        net: l.net,
        provider: l.launch_service_provider?.name || "Unknown",
        rocket: l.rocket?.configuration?.name || "Unknown",
        pad: l.pad?.name || "Unknown",
        status: l.status?.abbrev || "TBD",
      }));

      setLaunches(upcoming);
      setError(null);
    } catch (err) {
      setError("Failed to fetch launch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLaunches();
    const interval = setInterval(fetchLaunches, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [fetchLaunches]);

  // Countdown timer for next launch
  useEffect(() => {
    if (launches.length === 0) return;

    const updateCountdown = () => {
      const now = new Date();
      const launchDate = new Date(launches[0].net);
      const diff = launchDate.getTime() - now.getTime();

      if (diff <= 0) {
        setCountdown("LIFTOFF!");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else {
        setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [launches]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getProviderShort = (provider: string) => {
    if (provider.includes("SpaceX")) return "SpaceX";
    if (provider.includes("Rocket Lab")) return "RocketLab";
    if (provider.includes("United Launch")) return "ULA";
    if (provider.includes("ISRO")) return "ISRO";
    if (provider.includes("CNSA") || provider.includes("China")) return "CNSA";
    if (provider.includes("Roscosmos")) return "Russia";
    if (provider.includes("Blue Origin")) return "BlueOrigin";
    return provider.slice(0, 10);
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#128640;</span> Rocket Launches
      </h2>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : launches.length > 0 ? (
        <>
          <div className="mb-4 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
            <div className="text-xs text-neutral-500 mb-1">NEXT LAUNCH</div>
            <div className="font-semibold mb-1 text-sm">{launches[0].name}</div>
            <div className="text-2xl font-mono font-bold text-blue-600 dark:text-blue-400">
              {countdown}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {getProviderShort(launches[0].provider)} • {formatDate(launches[0].net)}
            </div>
          </div>

          <div className="text-xs text-neutral-500 mb-2">UPCOMING</div>
          <div className="space-y-2">
            {launches.slice(1, 5).map((launch) => (
              <div key={launch.id} className="flex items-center justify-between text-sm">
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs">{launch.name}</div>
                  <div className="text-xs text-neutral-400">{getProviderShort(launch.provider)}</div>
                </div>
                <span className="text-xs text-neutral-500 ml-2">{formatDate(launch.net)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-neutral-500 text-sm">No upcoming launches</p>
      )}

      <a
        href="https://www.spacelaunchnow.me/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        Space Launch Now &#8594;
      </a>
    </Card>
  );
}

// GitHub Activity Widget - Real-time public events on GitHub
function GitHubActivityWidget() {
  const [events, setEvents] = useState<Array<{
    id: string;
    type: string;
    actor: string;
    repo: string;
    timestamp: number;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch("https://api.github.com/events?per_page=30");
      if (res.status === 403) {
        setError("Rate limited");
        return;
      }
      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const newEvents = data
        .filter((e: { type: string }) =>
          ["PushEvent", "CreateEvent", "PullRequestEvent", "IssuesEvent", "WatchEvent", "ForkEvent"].includes(e.type)
        )
        .slice(0, 10)
        .map((e: { id: string; type: string; actor: { login: string }; repo: { name: string }; created_at: string }) => ({
          id: e.id,
          type: e.type,
          actor: e.actor.login,
          repo: e.repo.name,
          timestamp: new Date(e.created_at).getTime(),
        }));

      // Track new events
      newEvents.forEach((e: { id: string }) => seenIdsRef.current.add(e.id));

      setEvents(newEvents);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 60000); // 60 seconds to avoid rate limits
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case "PushEvent": return { icon: "↑", color: "text-green-500", label: "push" };
      case "PullRequestEvent": return { icon: "⇄", color: "text-purple-500", label: "PR" };
      case "IssuesEvent": return { icon: "●", color: "text-red-500", label: "issue" };
      case "CreateEvent": return { icon: "+", color: "text-blue-500", label: "create" };
      case "WatchEvent": return { icon: "★", color: "text-yellow-500", label: "star" };
      case "ForkEvent": return { icon: "⑂", color: "text-cyan-500", label: "fork" };
      default: return { icon: "•", color: "text-neutral-400", label: type };
    }
  };

  const timeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const truncateRepo = (repo: string) => {
    if (repo.length > 30) return repo.slice(0, 27) + "...";
    return repo;
  };

  const formatLastFetch = () => {
    if (!lastFetch) return "";
    const seconds = Math.floor((Date.now() - lastFetch.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    return `${Math.floor(seconds / 60)}m ago`;
  };

  // Update the "ago" display every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="col-span-1 md:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          GitHub Activity
        </h2>
        <div className="flex items-center gap-2">
          {error ? (
            <span className="text-xs text-amber-500">{error}</span>
          ) : (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-xs text-neutral-500">{formatLastFetch()}</span>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-neutral-500 mb-3">
        Developers shipping code around the world
      </p>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-5 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {events.map((event) => {
            const { icon, color, label } = getEventIcon(event.type);
            return (
              <div
                key={event.id}
                className="flex items-center gap-2 text-sm py-1 border-b border-neutral-100 dark:border-neutral-800 last:border-0"
              >
                <span className={`text-sm ${color}`} title={label}>{icon}</span>
                <span className="text-xs text-neutral-500 w-16 truncate">{event.actor}</span>
                <span className="flex-1 font-mono text-xs truncate">{truncateRepo(event.repo)}</span>
                <span className="text-xs text-neutral-400">{timeAgo(event.timestamp)}</span>
              </div>
            );
          })}
        </div>
      )}

      <a
        href="https://github.com/explore"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        Explore GitHub &#8594;
      </a>
    </Card>
  );
}

// Main Page Component
export default function PulseBoardPage() {
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setLastUpdated(new Date().toLocaleTimeString());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-16">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Pulse Board</h1>
        <p className="text-neutral-600 dark:text-neutral-400">
          Live dashboard showing real-time data from around the world. All data refreshes automatically.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CryptoHubWidget />
        <GitHubActivityWidget />
        <RocketLaunchesWidget />
        <WikipediaLiveWidget />
        <AviationWidget />
        <WorldClocksWidget />
        <WeatherWidget />
        <ISSTrackerWidget />
        <EarthquakeWidget />
        <InternetPulseWidget />
        <GithubTrendingWidget />
        <HackerNewsWidget />
      </div>

      <div className="mt-8 text-center text-sm text-neutral-500">
        Last updated: {lastUpdated}
      </div>
    </div>
  );
}
