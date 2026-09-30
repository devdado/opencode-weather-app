import type { City, Weather } from "../types/index.ts";
import type { TemperatureUnit } from "../types/index.ts";

export function cityLabel(city: City): string {
  const region = [city.admin1, city.country].filter((part) => part.length > 0);
  return region.length > 0 ? `${city.name}, ${region.join(", ")}` : city.name;
}

export function formatUnit(unit: TemperatureUnit): string {
  return unit === "celsius" ? "°C" : "°F";
}

export function formatTemperature(weather: Weather): string {
  return `${weather.temperature} ${weather.temperatureUnit}`;
}
