import { mkdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { CONFIG_VERSION } from "./types.ts";
import type { City, Config, TemperatureUnit } from "./types.ts";

export function defaultConfig(): Config {
  return { version: CONFIG_VERSION, cities: [], defaultCityId: null, unit: "celsius" };
}

export function configPath(): string {
  return join(homedir(), ".weather-cli", "config.json");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCity(value: unknown): City | null {
  if (!isRecord(value)) return null;
  const { id, name, country, admin1, latitude, longitude } = value;
  if (typeof id !== "number" || typeof name !== "string") return null;
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    id,
    name,
    country: typeof country === "string" ? country : "",
    admin1: typeof admin1 === "string" ? admin1 : "",
    latitude,
    longitude,
  };
}

// A hand-edited or truncated config must never crash the app, so every field is
// coerced back into a known-good shape rather than trusted.
function coerceConfig(value: unknown): Config {
  if (!isRecord(value)) return defaultConfig();

  const cities = Array.isArray(value.cities)
    ? value.cities.map(parseCity).filter((city): city is City => city !== null)
    : [];

  const unit: TemperatureUnit = value.unit === "fahrenheit" ? "fahrenheit" : "celsius";
  const storedDefault = value.defaultCityId;
  const defaultCityId =
    typeof storedDefault === "number" && cities.some((city) => city.id === storedDefault) ? storedDefault : null;

  return { version: CONFIG_VERSION, cities, defaultCityId, unit };
}

export interface LoadResult {
  config: Config;
  warning: string | null;
}

export async function loadConfig(path: string = configPath()): Promise<LoadResult> {
  let text: string;
  try {
    text = await Bun.file(path).text();
  } catch {
    return { config: defaultConfig(), warning: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    await rename(path, `${path}.corrupt`).catch(() => {});
    return {
      config: defaultConfig(),
      warning: `Config file was unreadable and has been reset (previous copy saved as ${path}.corrupt).`,
    };
  }

  return { config: coerceConfig(parsed), warning: null };
}

export async function saveConfig(config: Config, path: string = configPath()): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await Bun.write(temporary, `${JSON.stringify(config, null, 2)}\n`);
  await rename(temporary, path);
}

export function findDefaultCity(config: Config): City | null {
  if (config.defaultCityId === null) return null;
  return config.cities.find((city) => city.id === config.defaultCityId) ?? null;
}
