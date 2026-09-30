import { describe, expect, test } from "bun:test";
import { Writable } from "node:stream";
import { createOutput, renderCityChoices, renderWeather } from "./output.ts";
import type { Output } from "./output.ts";
import { ansiPaint } from "../utils/colors.ts";
import type { City, Weather } from "../types/index.ts";

const ottawa: City = {
  id: 6094817,
  name: "Ottawa",
  country: "Canada",
  admin1: "Ontario",
  latitude: 45.41117,
  longitude: -75.69812,
};

const weather: Weather = {
  temperature: 16.3,
  weatherCode: 0,
  isDay: true,
  observedAt: "2026-09-28T17:30",
  timezone: "America/Toronto",
  temperatureUnit: "°C",
};

const CLEARING: [number, number] = [22, 39];

function collector(): { stream: Writable; text: () => string; output: Output } {
  let buffer = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += String(chunk);
      callback();
    },
  });
  return { stream, text: () => buffer, output: createOutput(stream) };
}

function stripAnsi(text: string): string {
  return text.replaceAll(/\u001b\[\d+m/g, "");
}

function maxNesting(text: string): number {
  let depth = 0;
  let deepest = 0;
  for (const match of text.matchAll(/\u001b\[(\d+)m/g)) {
    const code = Number(match[1]);
    if (CLEARING.includes(code)) {
      depth = Math.max(0, depth - 1);
    } else {
      depth += 1;
      deepest = Math.max(deepest, depth);
    }
  }
  return deepest;
}

describe("renderWeather", () => {
  test("shows city, temperature and condition", () => {
    const rendered = renderWeather(ottawa, weather);
    expect(rendered).toContain("Ottawa, Ontario, Canada");
    expect(rendered).toContain("16.3 °C · Clear sky");
    expect(rendered).toContain("Observed 2026-09-28T17:30 · America/Toronto");
  });

  test("uses the night description after dark", () => {
    expect(renderWeather(ottawa, { ...weather, isDay: false })).toContain("Clear night");
  });

  test("omits the observation line when the API omits the time", () => {
    const rendered = renderWeather(ottawa, { ...weather, observedAt: "", timezone: "" });
    expect(rendered).not.toContain("Observed");
  });

  test("does not claim humidity or wind", () => {
    const rendered = renderWeather(ottawa, weather);
    expect(rendered).not.toContain("Humidity");
    expect(rendered).not.toContain("Wind");
  });

  test("keeps the box the same width with or without the observation line", () => {
    const lines = renderWeather(ottawa, weather).split("\n");
    expect(lines[0]).toBe("─".repeat(40));
    expect(lines[lines.length - 1]).toBe("─".repeat(40));
  });
});

describe("renderCityChoices", () => {
  test("numbers the choices and flags the default", () => {
    const rendered = renderCityChoices([ottawa, { ...ottawa, id: 2, name: "Toronto" }], 2);
    expect(rendered).toBe("  1. Ottawa, Ontario, Canada\n  2. Toronto, Ontario, Canada (default)");
  });
});

describe("createOutput", () => {
  test("pads messages the way the menu expects", () => {
    const { output, text } = collector();
    output.success("Done.");
    expect(text()).toBe("  Done.\n");
  });

  test("leaves a blank line after an error or a note", () => {
    const { output, text } = collector();
    output.error("Broken.");
    expect(text()).toBe("  ! Broken.\n\n");

    const second = collector();
    second.output.note("Cancelled.");
    expect(second.text()).toBe("  Cancelled.\n\n");
  });

  test("keeps inlineError on one line for a message the caller follows up", () => {
    const { output, text } = collector();
    output.inlineError("Could not save settings: disk full");
    expect(text()).toBe("  ! Could not save settings: disk full\n");
  });

  test("highlights the value of a status line", () => {
    const painted = collector();
    createOutput(painted.stream, ansiPaint).status("Temperature unit:", "°C");
    expect(painted.text()).toBe("  Temperature unit: \u001b[33m°C\u001b[39m\n");
  });

  test("starts a weather card with a blank line so it clears the prompt", () => {
    const { output, text } = collector();
    output.weatherCard(ottawa, weather);
    expect(text().startsWith("\n")).toBe(true);
    expect(text().endsWith(`${"─".repeat(40)}\n`)).toBe(true);
  });

  test("frames a failed city in a rule-branded error", () => {
    const { output, text } = collector();
    output.weatherFailure("Ottawa, Ontario, Canada", "Could not reach Open-Meteo");
    expect(text()).toBe(
      `\n${"─".repeat(40)}\n  ! Ottawa, Ontario, Canada: Could not reach Open-Meteo\n${"─".repeat(40)}\n`,
    );
  });

  test("only says Bye! once, optionally on its own line", () => {
    const first = collector();
    first.output.farewell(false);
    expect(first.text()).toBe("  Bye!\n");

    const second = collector();
    second.output.farewell(true);
    expect(second.text()).toBe("\n  Bye!\n");
  });
});

describe("colouring", () => {
  const plain = {
    weather: renderWeather(ottawa, weather),
    choices: renderCityChoices([ottawa], ottawa.id),
  };

  const painted = {
    weather: renderWeather(ottawa, weather, ansiPaint),
    choices: renderCityChoices([ottawa], ottawa.id, ansiPaint),
  };

  test("is off by default so piped output stays plain", () => {
    expect(renderWeather(ottawa, weather)).not.toContain("\u001b");
    expect(renderCityChoices([ottawa], null)).not.toContain("\u001b");
  });

  // Colouring must only insert escape codes: no character may be dropped,
  // reordered, or counted differently, or the 40-column box stops lining up.
  test("only inserts escape codes into the rendered text", () => {
    expect(stripAnsi(painted.weather)).toBe(plain.weather);
    expect(stripAnsi(painted.choices)).toBe(plain.choices);
  });

  test("emits escape codes when painting", () => {
    expect(painted.weather).toContain("\u001b[");
    expect(painted.choices).toContain("\u001b[");
  });

  // An inner close code also ends the outer span, so a nested paint would
  // silently drop the outer colour for the rest of the line.
  test("never nests a paint inside another", () => {
    for (const rendered of Object.values(painted)) {
      expect(maxNesting(rendered)).toBe(1);
    }
  });

  test("closes every span it opens", () => {
    for (const rendered of Object.values(painted)) {
      const opens = [...rendered.matchAll(/\u001b\[(\d+)m/g)].filter((m) => !CLEARING.includes(Number(m[1])));
      const closes = [...rendered.matchAll(/\u001b\[(\d+)m/g)].filter((m) => CLEARING.includes(Number(m[1])));
      expect(opens.length).toBe(closes.length);
    }
  });

  test("colours the temperature yellow and the default marker green", () => {
    expect(painted.weather).toContain("\u001b[33m16.3 °C\u001b[39m");
    expect(painted.choices).toContain("\u001b[32m (default)\u001b[39m");
  });
});
