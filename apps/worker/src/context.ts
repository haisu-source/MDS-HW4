type GeocodingResult = {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
  admin1?: string;
};

type WeatherResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
    cloud_cover?: number;
    precipitation?: number;
  };
};

export type LiveContextRecord = {
  city: string;
  city_key: string;
  weather_code: number | null;
  temperature_c: number | null;
  weather_label: string;
  cloud_cover: number | null;
  precipitation_mm: number | null;
  lunar_phase: string;
  zodiac_context_tag: string;
  fetched_at: string;
};

export async function buildCityContext(
  city: string,
  options: {
    geocodingBaseUrl: string;
    weatherBaseUrl: string;
  },
): Promise<LiveContextRecord> {
  const place = await lookupCity(city, options.geocodingBaseUrl);
  const weather = await fetchWeather(place.latitude, place.longitude, options.weatherBaseUrl);
  const fetchedAt = new Date().toISOString();
  const lunarPhase = deriveLunarPhase(new Date(fetchedAt));
  const weatherCode = weather.current?.weather_code ?? null;
  const weatherLabel = describeWeather(weatherCode);

  return {
    city: place.name,
    city_key: slugifyCityKey(place.name),
    weather_code: weatherCode,
    temperature_c: weather.current?.temperature_2m ?? null,
    weather_label: weatherLabel,
    cloud_cover: weather.current?.cloud_cover ?? null,
    precipitation_mm: weather.current?.precipitation ?? null,
    lunar_phase: lunarPhase,
    zodiac_context_tag: deriveCosmicTone({ weatherLabel, lunarPhase }),
    fetched_at: fetchedAt,
  };
}

async function lookupCity(city: string, geocodingBaseUrl: string): Promise<GeocodingResult> {
  const url = new URL(geocodingBaseUrl);
  url.searchParams.set("name", city);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding request failed for ${city}: ${response.status}`);
  }

  const data = (await response.json()) as { results?: GeocodingResult[] };
  const result = data.results?.[0];

  if (!result) {
    throw new Error(`No geocoding results found for city: ${city}`);
  }

  return result;
}

async function fetchWeather(
  latitude: number,
  longitude: number,
  weatherBaseUrl: string,
): Promise<WeatherResponse> {
  const url = new URL(weatherBaseUrl);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    "temperature_2m,weather_code,cloud_cover,precipitation",
  );

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Weather request failed: ${response.status}`);
  }

  return (await response.json()) as WeatherResponse;
}

function deriveLunarPhase(date: Date): string {
  const synodicMonth = 29.53058867;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const daysSinceNewMoon = (date.getTime() - knownNewMoon) / 86400000;
  const cyclePosition = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth;

  if (cyclePosition < 1.85) return "New Moon";
  if (cyclePosition < 5.54) return "Waxing Crescent";
  if (cyclePosition < 9.23) return "First Quarter";
  if (cyclePosition < 12.92) return "Waxing Gibbous";
  if (cyclePosition < 16.61) return "Full Moon";
  if (cyclePosition < 20.3) return "Waning Gibbous";
  if (cyclePosition < 23.99) return "Last Quarter";
  if (cyclePosition < 27.68) return "Waning Crescent";
  return "New Moon";
}

function describeWeather(code: number | null): string {
  if (code === null) return "Unknown";
  if ([0].includes(code)) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Storm";
  return "Mixed Conditions";
}

function deriveCosmicTone(input: { weatherLabel: string; lunarPhase: string }): string {
  if (input.lunarPhase === "Full Moon") {
    return "High emotional intensity";
  }

  if (input.lunarPhase === "New Moon") {
    return "Quiet reset energy";
  }

  if (input.weatherLabel === "Rain" || input.weatherLabel === "Drizzle") {
    return "Reflective and inward";
  }

  if (input.weatherLabel === "Storm") {
    return "Unstable but clarifying";
  }

  if (input.weatherLabel === "Clear") {
    return "Open and forward-moving";
  }

  return "Grounded and observant";
}

function slugifyCityKey(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

