import type { City, TemperatureUnit, Weather } from "../types/index.ts";
import { fetchJson, WeatherApiError } from "./http.ts";
import type { Fetcher } from "./http.ts";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CURRENT_VARIABLES = "temperature_2m,weather_code,is_day";

interface ForecastResponse {
  timezone?: string;
  current?: {
    time?: string;
    temperature_2m?: number;
    weather_code?: number;
    is_day?: number;
  };
  current_units?: { temperature_2m?: string };
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

  const data = (await fetchJson(url, fetcher)) as ForecastResponse;
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
