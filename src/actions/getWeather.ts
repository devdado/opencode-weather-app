import { getCurrentWeather } from "../api/weather.ts";
import { findDefaultCity, listCities } from "../storage/citiesStorage.ts";
import type { AppContext } from "../types/index.ts";
import { cityLabel } from "../utils/format.ts";

export async function showDefaultCityWeather(context: AppContext): Promise<void> {
  const city = findDefaultCity(context.config);
  if (city === null) {
    context.output.error("No default city set. Use option 3 to add a city first.");
    return;
  }

  const weather = await getCurrentWeather(city, context.config.unit, context.fetcher);
  context.output.weatherCard(city, weather);
  context.output.blank();
}

export async function showAllCitiesWeather(context: AppContext): Promise<void> {
  const cities = listCities(context.config);
  if (cities.length === 0) {
    context.output.error("No cities saved yet. Use option 3 to add one.");
    return;
  }

  const results = await Promise.allSettled(
    cities.map((city) => getCurrentWeather(city, context.config.unit, context.fetcher)),
  );

  // One unreachable city must not hide the others, so a failed lookup becomes a
  // card-shaped error instead of an error for the whole list.
  results.forEach((result, index) => {
    const city = cities[index];
    if (city === undefined) return;
    if (result.status === "fulfilled") {
      context.output.weatherCard(city, result.value);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      context.output.weatherFailure(cityLabel(city), reason);
    }
  });
  context.output.blank();
}
