import type { City, TemperatureUnit, Weather } from "./types.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CURRENT_VARIABLES = "temperature_2m,weather_code,is_day";

export type Fetcher = typeof fetch;

export class WeatherApiError extends Error {}

interface GeocodeResponse {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
}

interface ForecastResponse {
  error?: boolean;
  reason?: string;
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
  current_units?: { temperature_2m?: string };
}

async function getJson(url: URL, fetcher: Fetcher): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new WeatherApiError(`Could not reach Open-Meteo: ${detail}`);
  }

  if (!response.ok) {
    throw new WeatherApiError(`Open-Meteo returned HTTP ${response.status}.`);
  }

  try {
    return await response.json();
  } catch {
    throw new WeatherApiError("Open-Meteo returned a response that is not valid JSON.");
  }
}

function throwIfApiError(payload: unknown): void {
  if (typeof payload === "object" && payload !== null && "error" in payload && payload.error === true) {
    const reason = "reason" in payload && typeof payload.reason === "string" ? payload.reason : "unknown error";
    throw new WeatherApiError(`Open-Meteo error: ${reason}`);
  }
}

export async function searchCity(name: string, count = 10, fetcher: Fetcher = fetch): Promise<City[]> {
  const trimmed = name.trim();
  if (trimmed.length === 0) return [];

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const payload = await getJson(url, fetcher);
  throwIfApiError(payload);

  // An unknown city comes back as HTTP 200 with no `results` key at all, so this
  // must be a presence check rather than a length check on an assumed array.
  const results = (payload as GeocodeResponse).results;
  if (!Array.isArray(results)) return [];

  return results.map((result) => ({
    id: result.id,
    name: result.name,
    country: result.country ?? "",
    admin1: result.admin1 ?? "",
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}

export async function getCurrentWeather(
  city: Pick<City, "latitude" | "longitude">,
  unit: TemperatureUnit,
  fetcher: Fetcher = fetch,
): Promise<Weather> {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set("current", CURRENT_VARIABLES);
  url.searchParams.set("temperature_unit", unit);
  url.searchParams.set("timezone", "auto");

  const payload = await getJson(url, fetcher);
  throwIfApiError(payload);

  const data = payload as ForecastResponse;
  const current = data.current;
  if (!current || typeof current.temperature_2m !== "number" || typeof current.weather_code !== "number") {
    throw new WeatherApiError("Open-Meteo did not return the requested current conditions.");
  }

  return {
    temperature: current.temperature_2m,
    weatherCode: current.weather_code,
    isDay: current.is_day !== 0,
    observedAt: current.time ?? "",
    timezone: data.timezone ?? "",
    temperatureUnit: data.current_units?.temperature_2m ?? (unit === "celsius" ? "°C" : "°F"),
  };
}
