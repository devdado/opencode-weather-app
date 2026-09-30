import { searchCity } from "../api/geocoding.ts";
import { isBlank, parseChoice } from "../presentation/input.ts";
import { addCity } from "../storage/citiesStorage.ts";
import type { AppContext } from "../types/index.ts";
import { GEOCODING_RESULT_COUNT } from "../utils/constants.ts";
import { cityLabel } from "../utils/format.ts";

export async function searchAndAddCity(context: AppContext): Promise<void> {
  const query = await context.prompt("  City name: ");
  if (query === null) return;
  if (isBlank(query)) {
    context.output.error("City name cannot be empty.");
    return;
  }

  context.output.loading("Searching...");
  const results = await searchCity(query, GEOCODING_RESULT_COUNT, context.fetcher);
  context.output.blank();

  if (results.length === 0) {
    context.output.error(`No city found matching "${query.trim()}".`);
    return;
  }

  context.output.cityChoices(results, context.config.defaultCityId);
  const answer = await context.prompt("\n  Select a city to add: ");
  if (answer === null) return;

  const index = parseChoice(answer, results.length);
  if (index === null) {
    context.output.error("Invalid selection.");
    return;
  }

  const city = results[index];
  if (city === undefined) return;

  const { added, becameDefault } = addCity(context.config, city);
  if (!added) {
    context.output.error(`${cityLabel(city)} is already saved.`);
    return;
  }

  const label = cityLabel(city);
  context.output.success(becameDefault ? `Added ${label} and set it as default.` : `Added ${label}.`);
  await context.persist();
  context.output.blank();
}
