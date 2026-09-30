import { parseYes } from "../presentation/input.ts";
import { listCities, removeCity } from "../storage/citiesStorage.ts";
import type { AppContext } from "../types/index.ts";
import { cityLabel } from "../utils/format.ts";
import { chooseSavedCity } from "./listCities.ts";

export async function deleteCity(context: AppContext): Promise<void> {
  if (listCities(context.config).length === 0) {
    context.output.error("No cities saved yet.");
    return;
  }

  const city = await chooseSavedCity(context, "\n  Select a city to delete: ");
  if (city === null) return;

  const confirm = await context.prompt(`  Delete ${cityLabel(city)}? [y/N] `);
  if (confirm === null) return;
  if (!parseYes(confirm)) {
    context.output.note("Cancelled.");
    return;
  }

  const { lostDefault } = removeCity(context.config, city.id);
  const label = cityLabel(city);
  context.output.success(lostDefault ? `Deleted ${label}. No default city is set now.` : `Deleted ${label}.`);
  await context.persist();
  context.output.blank();
}
