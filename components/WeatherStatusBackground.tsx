/**
 * WeatherStatusBackground.tsx
 * Fixed yellow background layer showing status line and pills:
 * - Cycling outfit suggestion based on current weather (Open-Meteo).
 * - Date (location timezone), location from IP (default Hamburg), temperature and condition.
 * - Kandie Gang logo. Used behind the main content; scroll reveals the white card.
 * Resolves location via IP (ip-api.com), then fetches weather from Open-Meteo when the page loads.
 */

import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, CloudLightning, Moon, Snowflake } from 'lucide-react';

const HAMBURG_LAT = 53.5511;
const HAMBURG_LON = 9.9937;
const DEFAULT_LOCATION = {
  lat: HAMBURG_LAT,
  lon: HAMBURG_LON,
  label: 'Hamburg, Germany',
  timezone: 'Europe/Berlin',
};

const IP_API_URL = 'https://ip-api.com/json/?fields=lat,lon,city,countryName,timezone';

function openMeteoUrl(lat: number, lon: number): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`;
}

/** Cycling outfit suggestion based on current temp (°C) and condition. */
function getCyclingOutfitSuggestion(tempC: number, condition: string): string {
  const isWet =
    condition?.toLowerCase().includes('rain') ||
    condition?.toLowerCase().includes('snow') ||
    condition?.toLowerCase().includes('drizzle') ||
    condition?.toLowerCase().includes('shower');

  if (tempC >= 25) {
    return "Hot conditions call for\na lightweight short-sleeve jersey and bib shorts to stay cool and dry.";
  }
  if (tempC >= 15) {
    return "Mild weather is perfect for\na short-sleeve jersey with bib shorts, plus optional arm warmers or a light vest.";
  }
  if (tempC >= 10) {
    return "Cool temperatures work best with\na long-sleeve jersey or arm warmers paired with shorts or light tights.";
  }
  if (tempC >= 5) {
    return "Cold conditions require\na thermal long-sleeve jersey, a base layer, and full-length bib tights for warmth.";
  }
  if (tempC >= 0) {
    return isWet
      ? "Cold and wet weather means\na thermal base layer, insulated tights, and a waterproof cycling jacket."
      : "Very cold weather calls for\na thermal base layer, insulated tights, and a windproof jacket.";
  }
  return isWet
    ? "Freezing and wet conditions require\nfull winter gear: thermal layers, insulated tights, and a waterproof shell."
    : "It's freezing out —\nwear a thermal base layer, insulated tights, and a windproof jacket to stay warm.";
}

/** Map Open-Meteo WMO weather code to display condition (for icon + label). */
function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'Clear';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Clear';
}

const WeatherIcon: React.FC<{ condition: string }> = ({ condition }) => {
  const cond = condition.toLowerCase();
  if (cond.includes('sun') || cond.includes('clear') || cond.includes('mainly clear')) return <Sun className="w-4 h-4" />;
  if (cond.includes('snow')) return <Snowflake className="w-4 h-4" />;
  if (cond.includes('cloud') || cond.includes('overcast') || cond.includes('fog') || cond.includes('drizzle')) return <Cloud className="w-4 h-4" />;
  if (cond.includes('rain') || cond.includes('shower')) return <CloudRain className="w-4 h-4" />;
  if (cond.includes('storm') || cond.includes('thunder')) return <CloudLightning className="w-4 h-4" />;
  if (cond.includes('night')) return <Moon className="w-4 h-4" />;
  return <Sun className="w-4 h-4" />;
};

type Location = { lat: number; lon: number; label: string; timezone: string };

async function fetchWeatherByCoords(lat: number, lon: number): Promise<{ temp: number; condition: string } | null> {
  try {
    const res = await fetch(openMeteoUrl(lat, lon));
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current;
    if (current != null && typeof current.temperature_2m === 'number') {
      const condition = weatherCodeToCondition(current.weather_code ?? 0);
      return { temp: Math.round(current.temperature_2m), condition };
    }
  } catch (error) {
    console.error('Failed to fetch weather:', error);
  }
  return null;
}

export const WeatherStatusBackground: React.FC = () => {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [dateStr, setDateStr] = useState('');
  const [weather, setWeather] = useState<{ temp: number; condition: string }>({
    temp: 0,
    condition: 'Loading...',
  });

  // Resolve location from IP, then fetch weather
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let lat = DEFAULT_LOCATION.lat;
      let lon = DEFAULT_LOCATION.lon;
      let label = DEFAULT_LOCATION.label;
      let timezone = DEFAULT_LOCATION.timezone;
      try {
        const res = await fetch(IP_API_URL);
        if (res.ok) {
          const ip = await res.json();
          if (typeof ip.lat === 'number' && typeof ip.lon === 'number') {
            lat = ip.lat;
            lon = ip.lon;
            const parts = [ip.city, ip.countryName].filter(Boolean);
            if (parts.length) label = parts.join(', ');
            if (ip.timezone) timezone = ip.timezone;
          }
        }
      } catch {
        // Keep Hamburg default
      }
      if (cancelled) return;
      setLocation({ lat, lon, label, timezone });
      const result = await fetchWeatherByCoords(lat, lon);
      if (!cancelled && result) setWeather(result);
      else if (!cancelled) setWeather({ temp: 9, condition: 'Partly cloudy' });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Date string for location timezone, update every minute
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          timeZone: location.timezone,
        })
      );
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [location.timezone]);

  return (
    <div className="fixed inset-0 z-0 flex flex-col items-center overflow-hidden rounded-none bg-secondary-signal px-6 pt-16 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1.5rem))] md:px-12 md:pt-24 md:pb-12">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-end pb-6 space-y-10 text-center md:justify-center md:pb-0 md:space-y-16">
        <p className="font-heading max-w-[280px] text-balance text-xl font-light tracking-normal text-slate-900 md:max-w-none md:text-3xl">
          {(weather.condition === 'Loading...'
            ? "Let's figure out what to wear\nfor today's ride."
            : getCyclingOutfitSuggestion(weather.temp, weather.condition)
          )
            .split('\n')
            .map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
        </p>

        <div className="flex flex-wrap justify-center gap-2 md:gap-4">
          <div className="flex items-center gap-2.5 rounded-full border border-black/10 bg-white/10 px-5 py-3 text-[12px] font-bold text-slate-900 shadow-sm backdrop-blur-sm transition-all hover:bg-white/20 md:px-7 md:py-4 md:text-[14px]">
            {dateStr || '—'}
          </div>
          <div className="rounded-full border border-black/10 bg-white/10 px-5 py-3 text-[12px] font-bold text-slate-900 shadow-sm backdrop-blur-sm transition-all hover:bg-white/20 md:px-7 md:py-4 md:text-[14px]">
            {location.label}
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-black/10 bg-white/10 px-5 py-3 text-[12px] font-bold text-slate-900 shadow-sm backdrop-blur-sm transition-all hover:bg-white/20 md:px-7 md:py-4 md:text-[14px]">
            <WeatherIcon condition={weather.condition} />
            {weather.temp}°C
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="flex flex-col items-center gap-0.2">
          <span className="inline-block animate-logo-enter">
            <img
              src="/logos/kandiegang_logo.svg"
              alt="Kandie Gang"
              width={48}
              height={48}
              className="h-12 w-12 brightness-0 md:h-14 md:w-14 md:scale-125"
            />
          </span>
          <span className="text-center text-[10px] font-light tracking-wide text-black md:text-xs">
            It's a love story
          </span>
        </div>
      </div>
    </div>
  );
};
