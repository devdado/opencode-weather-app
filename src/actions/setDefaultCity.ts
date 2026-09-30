import { listCities, setDefaultCity } from "../storage/citiesStorage.ts";
import type { AppContext } from "../types/index.ts";
import { cityLabel } from "../utils/format.ts";
import { chooseSavedCity } from "./listCities.ts";

export async function changeDefaultCity(context: AppContext): Promise<void> {
  if (listCities(context.config).length === 0) {
    context.output.error("No cities saved yet. Use option 3 to add one.");
    return;
  }

  const city = await chooseSavedCity(context, "\n  Select the new default: ");
  if (city === null) return;

  const updated = setDefaultCity(context.config, city.id);
  if (updated === null) return;

  context.output.success(`Default city is now ${cityLabel(updated)}.`);
  await context.persist();
  context.output.blank();
}
