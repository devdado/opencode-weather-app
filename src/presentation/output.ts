import type { City, Weather } from "../types/index.ts";
import { noColor } from "../utils/colors.ts";
import type { Paint } from "../utils/colors.ts";
import { BOX_WIDTH } from "../utils/constants.ts";
import { cityLabel, formatTemperature } from "../utils/format.ts";
import { describeWeather } from "../utils/weatherCodes.ts";

const RULE = "─".repeat(BOX_WIDTH);

/**
 * Every message the user sees, in the exact shape it is printed. Actions compose
 * these instead of formatting strings themselves, so prefixes, colours and the
 * blank lines between messages live in one place.
 */
export interface Output {
  line(text: string): void;
  blank(): void;
  /** `  message`, then a blank line to separate it from whatever comes next. */
  success(message: string): void;
  /** `  ! message`, then a blank line. */
  error(message: string): void;
  /** `  ! message` with no blank line after, for a message the caller follows up. */
  inlineError(message: string): void;
  /** `  message` in dim, then a blank line. */
  note(message: string): void;
  /** `  message` in dim, for work that is still in flight. */
  loading(message: string): void;
  /** `  label value`, with the value highlighted. */
  status(label: string, value: string): void;
  farewell(leadingBlank: boolean): void;
  weatherCard(city: City, weather: Weather): void;
  weatherFailure(label: string, reason: string): void;
  cityChoices(cities: City[], defaultCityId: number | null): void;
}

export function createOutput(stream: NodeJS.WritableStream, paint: Paint = noColor): Output {
  const write = (text: string): void => {
    stream.write(text);
  };

  return {
    line: (text) => write(`${text}\n`),
    blank: () => write("\n"),
    success: (message) => write(`  ${paint("green", message)}\n`),
    error: (message) => {
      write(`  ${paint("red", `! ${message}`)}\n`);
      write("\n");
    },
    inlineError: (message) => write(`  ${paint("red", `! ${message}`)}\n`),
    note: (message) => {
      write(`  ${paint("dim", message)}\n`);
      write("\n");
    },
    loading: (message) => write(`  ${paint("dim", message)}\n`),
    status: (label, value) => write(`  ${label} ${paint("yellow", value)}\n`),
    farewell: (leadingBlank) => {
      if (leadingBlank) write("\n");
      write(`  ${paint("green", "Bye!")}\n`);
    },
    weatherCard: (city, weather) => write(`\n${renderWeather(city, weather, paint)}\n`),
    weatherFailure: (label, reason) => {
      write(`\n${paint("gray", RULE)}\n`);
      write(`  ${paint("red", `! ${label}: ${reason}`)}\n`);
      write(`${paint("gray", RULE)}\n`);
    },
    cityChoices: (cities, defaultCityId) => write(`${renderCityChoices(cities, defaultCityId, paint)}\n`),
  };
}

export function renderWeather(city: City, weather: Weather, paint: Paint = noColor): string {
  const description = describeWeather(weather.weatherCode, weather.isDay);
  const lines = [
    paint("gray", RULE),
    `  ${description.emoji}  ${paint("bold", cityLabel(city))}`,
    `      ${paint("yellow", formatTemperature(weather))} · ${description.label}`,
  ];
  if (weather.observedAt.length > 0) {
    const local = weather.timezone.length > 0 ? ` · ${weather.timezone}` : "";
    lines.push(`      ${paint("dim", `Observed ${weather.observedAt}${local}`)}`);
  }
  lines.push(paint("gray", RULE));
  return lines.join("\n");
}

export function renderCityChoices(cities: City[], defaultCityId: number | null, paint: Paint = noColor): string {
  return cities
    .map((city, index) => {
      const marker = city.id === defaultCityId ? paint("green", " (default)") : "";
      return `  ${paint("cyan", String(index + 1))}. ${cityLabel(city)}${marker}`;
    })
    .join("\n");
}
