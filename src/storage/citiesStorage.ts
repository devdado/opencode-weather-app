import type { City, Config } from "../types/index.ts";

export function listCities(config: Config): City[] {
  return config.cities;
}

export function findCity(config: Config, id: number): City | null {
  return config.cities.find((city) => city.id === id) ?? null;
}

export function hasCity(config: Config, id: number): boolean {
  return findCity(config, id) !== null;
}

export function findDefaultCity(config: Config): City | null {
  if (config.defaultCityId === null) return null;
  return findCity(config, config.defaultCityId);
}

export interface AddCityResult {
  added: boolean;
  /** True when this city became the default because there was none. */
  becameDefault: boolean;
}

/** Adds a city unless it is already saved; the first city added becomes the default. */
export function addCity(config: Config, city: City): AddCityResult {
  if (hasCity(config, city.id)) return { added: false, becameDefault: false };

  config.cities.push(city);
  if (config.defaultCityId === null) {
    config.defaultCityId = city.id;
    return { added: true, becameDefault: true };
  }
  return { added: true, becameDefault: false };
}

export interface RemoveCityResult {
  removed: City | null;
  /** True when the deleted city was the default, leaving the app with none. */
  lostDefault: boolean;
}

/** Deletes a city by id, clearing the default if that is the one that went. */
export function removeCity(config: Config, id: number): RemoveCityResult {
  const index = config.cities.findIndex((city) => city.id === id);
  if (index < 0) return { removed: null, lostDefault: false };

  const [removed] = config.cities.splice(index, 1);
  if (removed === undefined) return { removed: null, lostDefault: false };

  if (config.defaultCityId !== id) return { removed, lostDefault: false };
  config.defaultCityId = null;
  return { removed, lostDefault: true };
}

/** Returns the new default city, or null when the id matches nothing. */
export function setDefaultCity(config: Config, id: number): City | null {
  const city = findCity(config, id);
  if (city === null) return null;
  config.defaultCityId = city.id;
  return city;
}
