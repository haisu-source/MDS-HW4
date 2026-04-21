function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getNumberEnv(name: string, fallback: number): number {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  supabaseUrl: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseServiceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  geocodingBaseUrl:
    process.env.OPEN_METEO_GEOCODING_BASE_URL ??
    "https://geocoding-api.open-meteo.com/v1/search",
  weatherBaseUrl:
    process.env.OPEN_METEO_WEATHER_BASE_URL ??
    "https://api.open-meteo.com/v1/forecast",
  pollIntervalMinutes: getNumberEnv("POLL_INTERVAL_MINUTES", 10),
};

