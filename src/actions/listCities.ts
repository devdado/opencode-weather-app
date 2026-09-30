import { parseChoice } from "../presentation/input.ts";
import { listCities } from "../storage/citiesStorage.ts";
import type { AppContext, City } from "../types/index.ts";

/**
 * Lists the saved cities and resolves the one the user picks. Shared by the
 * delete and set-default actions, which differ only in what they do next.
 */
export async function chooseSavedCity(context: AppContext, label: string): Promise<City | null> {
  const cities = listCities(context.config);
  context.output.cityChoices(cities, context.config.defaultCityId);

  const answer = await context.prompt(label);
  if (answer === null) return null;

  const index = parseChoice(answer, cities.length);
  if (index === null) {
    context.output.error("Invalid selection.");
    return null;
  }

  return cities[index] ?? null;
}
