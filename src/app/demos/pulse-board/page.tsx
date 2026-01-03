"use client";

import { useState, useEffect, useCallback } from "react";

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
              <span className="text-sm">{clock.flag === "US" ? "US" : clock.flag === "GB" ? "GB" : clock.flag === "JP" ? "JP" : "AU"}</span>
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

// Crypto Widget
function CryptoWidget() {
  const [crypto, setCrypto] = useState<CryptoData | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [cryptoRes, fgRes] = await Promise.all([
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true"),
        fetch("https://api.alternative.me/fng/?limit=1"),
      ]);

      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json();
        setCrypto(cryptoData);
      }

      if (fgRes.ok) {
        const fgData = await fgRes.json();
        if (fgData.data && fgData.data[0]) {
          setFearGreed(fgData.data[0]);
        }
      }

      setError(null);
    } catch (err) {
      setError("Failed to fetch crypto data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const getFearGreedColor = (value: number) => {
    if (value <= 25) return "text-red-600 dark:text-red-400";
    if (value <= 45) return "text-orange-500 dark:text-orange-400";
    if (value <= 55) return "text-yellow-500 dark:text-yellow-400";
    if (value <= 75) return "text-lime-500 dark:text-lime-400";
    return "text-green-600 dark:text-green-400";
  };

  if (loading) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <h2 className="text-lg font-semibold mb-4">Crypto Markets</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2">
        <h2 className="text-lg font-semibold mb-4">Crypto Markets</h2>
        <p className="text-red-500 text-sm">{error}</p>
      </Card>
    );
  }

  return (
    <Card className="col-span-1 md:col-span-2">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#8383;</span> Crypto Markets
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-sm text-neutral-500 mb-1">Bitcoin</div>
          <div className="text-2xl font-bold">{crypto ? formatPrice(crypto.bitcoin.usd) : "--"}</div>
          {crypto && (
            <div className={crypto.bitcoin.usd_24h_change >= 0 ? "text-green-600 dark:text-green-400 text-sm" : "text-red-600 dark:text-red-400 text-sm"}>
              {formatChange(crypto.bitcoin.usd_24h_change)}
            </div>
          )}
        </div>
        <div>
          <div className="text-sm text-neutral-500 mb-1">Ethereum</div>
          <div className="text-2xl font-bold">{crypto ? formatPrice(crypto.ethereum.usd) : "--"}</div>
          {crypto && (
            <div className={crypto.ethereum.usd_24h_change >= 0 ? "text-green-600 dark:text-green-400 text-sm" : "text-red-600 dark:text-red-400 text-sm"}>
              {formatChange(crypto.ethereum.usd_24h_change)}
            </div>
          )}
        </div>
        <div className="col-span-2">
          <div className="text-sm text-neutral-500 mb-1">Fear & Greed Index</div>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${fearGreed ? getFearGreedColor(parseInt(fearGreed.value)) : ""}`}>
              {fearGreed?.value || "--"}
            </span>
            <span className="text-sm text-neutral-500">/100</span>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {fearGreed?.value_classification || "--"}
          </div>
          {fearGreed && (
            <div className="mt-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500"
                style={{ width: `${fearGreed.value}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Weather Widget
function WeatherWidget() {
  const [selectedCity, setSelectedCity] = useState(CITIES[0]);
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
          if (city) setSelectedCity(city);
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

// ISS Tracker Widget - Real-time International Space Station location
function ISSTrackerWidget() {
  const [issData, setIssData] = useState<{
    latitude: number;
    longitude: number;
    timestamp: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchISS = useCallback(async () => {
    try {
      const res = await fetch("https://api.open-notify.org/iss-now.json");
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      if (data.message === "success") {
        setIssData({
          latitude: parseFloat(data.iss_position.latitude),
          longitude: parseFloat(data.iss_position.longitude),
          timestamp: data.timestamp,
        });
        setError(null);
      }
    } catch (err) {
      setError("Failed to fetch ISS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchISS();
    // Update every 5 seconds for real-time tracking
    const interval = setInterval(fetchISS, 5000);
    return () => clearInterval(interval);
  }, [fetchISS]);

  const getLocationDescription = (lat: number, lon: number) => {
    const latDir = lat >= 0 ? "N" : "S";
    const lonDir = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(2)}° ${latDir}, ${Math.abs(lon).toFixed(2)}° ${lonDir}`;
  };

  const getRegion = (lat: number, lon: number) => {
    // Rough region detection
    if (lat > 66.5) return "Arctic";
    if (lat < -66.5) return "Antarctic";
    if (lon >= -180 && lon < -30 && lat > 0) return "North America";
    if (lon >= -180 && lon < -30 && lat <= 0) return "South America";
    if (lon >= -30 && lon < 60 && lat > 0) return "Europe/Africa";
    if (lon >= -30 && lon < 60 && lat <= 0) return "Africa";
    if (lon >= 60 && lon < 150 && lat > 0) return "Asia";
    if (lon >= 100 && lon < 180 && lat <= 0) return "Oceania";
    return "Pacific Ocean";
  };

  return (
    <Card className="col-span-1 md:col-span-2">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">&#128752;</span> ISS Live Tracker
      </h2>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-32 w-full rounded" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : issData ? (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-medium">Live - Updates every 5s</span>
          </div>

          <div className="relative bg-neutral-100 dark:bg-neutral-800 rounded-lg h-32 overflow-hidden mb-3">
            {/* Simple world map representation */}
            <div className="absolute inset-0 opacity-20">
              <svg viewBox="0 0 360 180" className="w-full h-full" preserveAspectRatio="none">
                <rect fill="currentColor" x="0" y="0" width="360" height="180" opacity="0.1"/>
                {/* Simplified continents */}
                <ellipse cx="90" cy="70" rx="40" ry="30" fill="currentColor" opacity="0.3"/>
                <ellipse cx="90" cy="120" rx="25" ry="35" fill="currentColor" opacity="0.3"/>
                <ellipse cx="180" cy="60" rx="50" ry="25" fill="currentColor" opacity="0.3"/>
                <ellipse cx="170" cy="110" rx="30" ry="25" fill="currentColor" opacity="0.3"/>
                <ellipse cx="260" cy="70" rx="45" ry="35" fill="currentColor" opacity="0.3"/>
                <ellipse cx="300" cy="130" rx="25" ry="20" fill="currentColor" opacity="0.3"/>
              </svg>
            </div>
            {/* ISS Position marker */}
            <div
              className="absolute w-4 h-4 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
              style={{
                left: `${((issData.longitude + 180) / 360) * 100}%`,
                top: `${((90 - issData.latitude) / 180) * 100}%`,
              }}
            >
              <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-white dark:border-neutral-900"></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-neutral-500 text-xs">Coordinates</div>
              <div className="font-mono font-medium">{getLocationDescription(issData.latitude, issData.longitude)}</div>
            </div>
            <div>
              <div className="text-neutral-500 text-xs">Flying Over</div>
              <div className="font-medium">{getRegion(issData.latitude, issData.longitude)}</div>
            </div>
          </div>
        </div>
      ) : null}
      <a
        href="https://spotthestation.nasa.gov/tracking_map.cfm"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        NASA Spot The Station &#8594;
      </a>
    </Card>
  );
}

// Chainlink On-Chain Price Widget
function ChainlinkWidget() {
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [gasPrice, setGasPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chainlink Price Feed addresses on Ethereum mainnet
  const BTC_USD_FEED = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";
  const ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";

  // ABI encoded function selector for latestRoundData()
  const LATEST_ROUND_DATA = "0xfeaf968c";

  const fetchChainlinkData = useCallback(async () => {
    try {
      // Use public Ethereum RPC endpoints
      const rpcEndpoints = [
        "https://eth.llamarpc.com",
        "https://rpc.ankr.com/eth",
        "https://ethereum.publicnode.com",
      ];

      let rpcUrl = rpcEndpoints[0];

      // Fetch BTC/USD price
      const btcCall = {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: BTC_USD_FEED, data: LATEST_ROUND_DATA }, "latest"],
        id: 1,
      };

      // Fetch ETH/USD price
      const ethCall = {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: ETH_USD_FEED, data: LATEST_ROUND_DATA }, "latest"],
        id: 2,
      };

      // Fetch gas price
      const gasCall = {
        jsonrpc: "2.0",
        method: "eth_gasPrice",
        params: [],
        id: 3,
      };

      const [btcRes, ethRes, gasRes] = await Promise.all([
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(btcCall),
        }),
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ethCall),
        }),
        fetch(rpcUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gasCall),
        }),
      ]);

      const btcData = await btcRes.json();
      const ethData = await ethRes.json();
      const gasData = await gasRes.json();

      // Parse Chainlink response (latestRoundData returns multiple values, price is at offset 32 bytes)
      if (btcData.result) {
        // The answer is at bytes 32-64 (second 32-byte word)
        const priceHex = "0x" + btcData.result.slice(66, 130);
        const priceRaw = BigInt(priceHex);
        // Chainlink BTC/USD has 8 decimals
        setBtcPrice(Number(priceRaw) / 1e8);
      }

      if (ethData.result) {
        const priceHex = "0x" + ethData.result.slice(66, 130);
        const priceRaw = BigInt(priceHex);
        // Chainlink ETH/USD has 8 decimals
        setEthPrice(Number(priceRaw) / 1e8);
      }

      if (gasData.result) {
        // Convert wei to gwei
        const gasWei = BigInt(gasData.result);
        setGasPrice(Number(gasWei) / 1e9);
      }

      setError(null);
    } catch (err) {
      setError("Failed to fetch on-chain data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChainlinkData();
    const interval = setInterval(fetchChainlinkData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [fetchChainlinkData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5" viewBox="0 0 32 32" fill="none">
          <path d="M16 0L6.5 5.5v10.9L16 32l9.5-15.6V5.5L16 0z" fill="#375BD2"/>
          <path d="M16 6l-5.7 3.3v6.5L16 26l5.7-10.2V9.3L16 6z" fill="white"/>
        </svg>
        Chainlink Oracle
      </h2>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-24" />
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">BTC/USD</span>
            <span className="font-mono font-semibold">{btcPrice ? formatPrice(btcPrice) : "--"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-neutral-500">ETH/USD</span>
            <span className="font-mono font-semibold">{ethPrice ? formatPrice(ethPrice) : "--"}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-sm text-neutral-500">Gas Price</span>
            <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
              {gasPrice ? `${gasPrice.toFixed(1)} gwei` : "--"}
            </span>
          </div>
        </div>
      )}
      <a
        href="https://data.chain.link"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-neutral-500 hover:underline mt-3 inline-block"
      >
        Powered by Chainlink &#8594;
      </a>
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
        <CryptoWidget />
        <ChainlinkWidget />
        <WorldClocksWidget />
        <WeatherWidget />
        <EarthquakeWidget />
        <GithubTrendingWidget />
        <HackerNewsWidget />
        <ISSTrackerWidget />
      </div>

      <div className="mt-8 text-center text-sm text-neutral-500">
        Last updated: {lastUpdated}
      </div>
    </div>
  );
}
