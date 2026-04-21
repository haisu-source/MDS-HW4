import { config } from "./config";
import { buildCityContext } from "./context";
import { supabase } from "./supabase";

async function pollOnce() {
  const cities = await getActiveCities();

  if (cities.length === 0) {
    console.log("No active profile cities found. Seed profiles first.");
    return;
  }

  for (const city of cities) {
    try {
      const context = await buildCityContext(city, {
        geocodingBaseUrl: config.geocodingBaseUrl,
        weatherBaseUrl: config.weatherBaseUrl,
      });

      await upsertLiveContext(context);
      await insertContextHistory(context);
      console.log(`Updated context for ${context.city} at ${context.fetched_at}`);
    } catch (error) {
      console.error(`Failed to update city ${city}:`, error);
    }
  }
}

async function getActiveCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("city")
    .not("city", "is", null);

  if (error) {
    throw error;
  }

  return [...new Set((data ?? []).map((row) => row.city).filter(Boolean))];
}

async function upsertLiveContext(context: Awaited<ReturnType<typeof buildCityContext>>) {
  const { error } = await supabase.from("live_context").upsert(context, {
    onConflict: "city_key",
  });

  if (error) {
    throw error;
  }
}

async function insertContextHistory(context: Awaited<ReturnType<typeof buildCityContext>>) {
  const { error } = await supabase.from("context_history").insert(context);

  if (error) {
    throw error;
  }
}

const intervalMs = config.pollIntervalMinutes * 60 * 1000;

pollOnce()
  .then(() => {
    console.log(`Initial poll complete. Repeating every ${config.pollIntervalMinutes} minutes.`);
    setInterval(() => {
      void pollOnce();
    }, intervalMs);
  })
  .catch((error) => {
    console.error("Worker failed on startup:", error);
    process.exit(1);
  });
