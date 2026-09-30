import { listCities } from "../storage/citiesStorage.ts";
import type { Action, Config, MenuOption } from "../types/index.ts";
import { EXIT_OPTION_KEY } from "../utils/constants.ts";
import { formatUnit } from "../utils/format.ts";
import { searchAndAddCity } from "./addCity.ts";
import { showAllCitiesWeather, showDefaultCityWeather } from "./getWeather.ts";
import { deleteCity } from "./removeCity.ts";
import { changeDefaultCity } from "./setDefaultCity.ts";
import { openSettings } from "./settings.ts";

/** Exit is handled by the menu loop, so the row itself does nothing. */
const noop: Action = async () => {};

/**
 * The menu, in order. Labels are resolved from the config on every render, which
 * is what keeps the city count and the unit in the menu live. Adding a feature
 * means adding a file and a row here, and nothing else.
 */
export function buildMenuOptions(config: Config): MenuOption[] {
  return [
    { key: "1", label: "City weather (default)", run: showDefaultCityWeather },
    { key: "2", label: `All cities weather (${listCities(config).length})`, run: showAllCitiesWeather },
    { key: "3", label: "Search and add city", run: searchAndAddCity },
    { key: "4", label: "Delete city", run: deleteCity },
    { key: "5", label: "Set default city", run: changeDefaultCity },
    { key: "6", label: `Settings (${formatUnit(config.unit)})`, run: openSettings },
    { key: EXIT_OPTION_KEY, label: "Exit", run: noop },
  ];
}
