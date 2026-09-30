import type { City } from "./City.ts";

export type TemperatureUnit = "celsius" | "fahrenheit";

export interface Config {
  version: number;
  cities: City[];
  defaultCityId: number | null;
  unit: TemperatureUnit;
}
