import { createInterface } from "node:readline";
import type { Interface } from "node:readline";
import { describeWeather } from "./weather-codes.ts";
import type { City, Config, Weather } from "./types.ts";

const BOX_WIDTH = 40;
const SEPARATOR = "═".repeat(BOX_WIDTH);
const RULE = "─".repeat(BOX_WIDTH);

/**
 * `node:readline/promises` throws on Bun 1.4.2, and the callback `rl.question()`
 * silently drops lines when stdin is piped rather than a TTY. Pulling from the
 * readline async iterator one line at a time works for both, and still lets the
 * prompt be written before the read is awaited.
 */
export class Prompter {
  private readonly rl: Interface;
  private readonly output: NodeJS.WritableStream;
  private readonly lines: AsyncIterator<string>;
  private closed = false;

  constructor(input: NodeJS.ReadableStream = process.stdin, output: NodeJS.WritableStream = process.stdout) {
    this.rl = createInterface({ input, output });
    this.output = output;
    this.lines = this.rl[Symbol.asyncIterator]() as AsyncIterator<string>;
  }

  async ask(label: string): Promise<string | null> {
    if (this.closed) return null;
    this.output.write(label);
    const next = await this.lines.next();
    if (next.done === true) {
      this.close();
      return null;
    }
    return next.value;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.rl.close();
  }
}

export function formatUnit(unit: Config["unit"]): string {
  return unit === "celsius" ? "°C" : "°F";
}

export function renderMenu(config: Config): string {
  const count = config.cities.length;
  return [
    SEPARATOR,
    "         WEATHER CLI",
    SEPARATOR,
    "  1. City weather (default)",
    `  2. All cities weather (${count})`,
    "  3. Search and add city",
    "  4. Delete city",
    "  5. Set default city",
    `  6. Settings (${formatUnit(config.unit)})`,
    "  7. Exit",
    SEPARATOR,
  ].join("\n");
}

export function cityLabel(city: City): string {
  const region = [city.admin1, city.country].filter((part) => part.length > 0);
  return region.length > 0 ? `${city.name}, ${region.join(", ")}` : city.name;
}

export function formatTemperature(weather: Weather): string {
  return `${weather.temperature} ${weather.temperatureUnit}`;
}

export function renderWeather(city: City, weather: Weather): string {
  const description = describeWeather(weather.weatherCode, weather.isDay);
  const lines = [
    RULE,
    `  ${description.emoji}  ${cityLabel(city)}`,
    `      ${formatTemperature(weather)} · ${description.label}`,
  ];
  if (weather.observedAt.length > 0) {
    const local = weather.timezone.length > 0 ? ` · ${weather.timezone}` : "";
    lines.push(`      Observed ${weather.observedAt}${local}`);
  }
  lines.push(RULE);
  return lines.join("\n");
}

export function renderCityChoices(cities: City[], defaultCityId: number | null): string {
  return cities
    .map((city, index) => {
      const marker = city.id === defaultCityId ? " (default)" : "";
      return `  ${index + 1}. ${cityLabel(city)}${marker}`;
    })
    .join("\n");
}

export function parseChoice(input: string, length: number): number | null {
  const value = Number.parseInt(input.trim(), 10);
  if (!Number.isInteger(value) || value < 1 || value > length) return null;
  return value - 1;
}
