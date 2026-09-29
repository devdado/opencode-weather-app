export type TemperatureUnit = "celsius" | "fahrenheit";

export interface City {
  id: number;
  name: string;
  country: string;
  admin1: string;
  latitude: number;
  longitude: number;
}

export interface Config {
  version: number;
  cities: City[];
  defaultCityId: number | null;
  unit: TemperatureUnit;
}

export interface Weather {
  temperature: number;
  weatherCode: number;
  isDay: boolean;
  observedAt: string;
  timezone: string;
  temperatureUnit: string;
}

export const CONFIG_VERSION = 1;
