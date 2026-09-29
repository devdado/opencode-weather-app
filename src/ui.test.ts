import { describe, expect, test } from "bun:test";
import { Readable, Writable } from "node:stream";
import { cityLabel, formatUnit, parseChoice, Prompter, renderCityChoices, renderMenu, renderWeather } from "./ui.ts";
import type { City, Config } from "./types.ts";

const ottawa: City = {
  id: 6094817,
  name: "Ottawa",
  country: "Canada",
  admin1: "Ontario",
  latitude: 45.41117,
  longitude: -75.69812,
};

function config(overrides: Partial<Config> = {}): Config {
  return { version: 1, cities: [], defaultCityId: null, unit: "celsius", ...overrides };
}

function collector(): { stream: Writable; text: () => string } {
  let buffer = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += String(chunk);
      callback();
    },
  });
  return { stream, text: () => buffer };
}

describe("formatUnit", () => {
  test("renders the degree labels used in the menu", () => {
    expect(formatUnit("celsius")).toBe("°C");
    expect(formatUnit("fahrenheit")).toBe("°F");
  });
});

describe("renderMenu", () => {
  const menu = renderMenu(config());

  test("matches the README layout", () => {
    expect(menu).toContain("═".repeat(40));
    expect(menu).toContain("         WEATHER CLI");
    expect(menu).toContain("  1. City weather (default)");
    expect(menu).toContain("  3. Search and add city");
    expect(menu).toContain("  4. Delete city");
    expect(menu).toContain("  5. Set default city");
  });

  test("numbers options contiguously from 1 to 7", () => {
    for (const option of ["1", "2", "3", "4", "5", "6", "7"]) {
      expect(menu).toContain(`  ${option}.`);
    }
    expect(menu).not.toContain("  8.");
    expect(menu).not.toContain("  9.");
  });

  test("shows the live city count", () => {
    expect(renderMenu(config())).toContain("  2. All cities weather (0)");
    expect(renderMenu(config({ cities: [ottawa, { ...ottawa, id: 2 }] }))).toContain(
      "  2. All cities weather (2)",
    );
  });

  test("shows the current unit", () => {
    expect(menu).toContain("  6. Settings (°C)");
    expect(renderMenu(config({ unit: "fahrenheit" }))).toContain("  6. Settings (°F)");
  });
});

describe("cityLabel", () => {
  test("joins name, region and country", () => {
    expect(cityLabel(ottawa)).toBe("Ottawa, Ontario, Canada");
  });

  test("skips empty parts", () => {
    expect(cityLabel({ ...ottawa, admin1: "", country: "" })).toBe("Ottawa");
    expect(cityLabel({ ...ottawa, admin1: "" })).toBe("Ottawa, Canada");
  });
});

describe("parseChoice", () => {
  test("converts a one-based selection to an index", () => {
    expect(parseChoice("1", 3)).toBe(0);
    expect(parseChoice(" 3 ", 3)).toBe(2);
  });

  test("rejects out-of-range and non-numeric input", () => {
    expect(parseChoice("0", 3)).toBeNull();
    expect(parseChoice("4", 3)).toBeNull();
    expect(parseChoice("abc", 3)).toBeNull();
    expect(parseChoice("", 3)).toBeNull();
  });

  test("rejects everything when there is nothing to choose", () => {
    expect(parseChoice("1", 0)).toBeNull();
  });
});

describe("renderCityChoices", () => {
  test("numbers the choices and flags the default", () => {
    const rendered = renderCityChoices([ottawa, { ...ottawa, id: 2, name: "Toronto" }], 2);
    expect(rendered).toBe("  1. Ottawa, Ontario, Canada\n  2. Toronto, Ontario, Canada (default)");
  });
});

describe("renderWeather", () => {
  const weather = {
    temperature: 16.3,
    weatherCode: 0,
    isDay: true,
    observedAt: "2026-09-28T17:30",
    timezone: "America/Toronto",
    temperatureUnit: "°C",
  };

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
});

describe("Prompter", () => {
  test("reads piped input line by line without dropping any", async () => {
    // The callback form of rl.question() loses lines when stdin is not a TTY,
    // so this guards the async-iterator behaviour the app depends on.
    const output = collector();
    const prompter = new Prompter(Readable.from(["5\n", "3\n", "7\n"]) as unknown as NodeJS.ReadableStream, output.stream);

    expect(await prompter.ask("a: ")).toBe("5");
    expect(await prompter.ask("b: ")).toBe("3");
    expect(await prompter.ask("c: ")).toBe("7");

    prompter.close();
    expect(output.text()).toBe("a: b: c: ");
  });

  test("returns null at end of input so the app can exit", async () => {
    const output = collector();
    const prompter = new Prompter(Readable.from([]) as unknown as NodeJS.ReadableStream, output.stream);

    expect(await prompter.ask("a: ")).toBeNull();
  });

  test("returns null once closed", async () => {
    const output = collector();
    const prompter = new Prompter(Readable.from(["1\n"]) as unknown as NodeJS.ReadableStream, output.stream);
    prompter.close();
    expect(await prompter.ask("a: ")).toBeNull();
  });
});
