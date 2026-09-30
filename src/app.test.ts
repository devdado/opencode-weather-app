import { describe, expect, test } from "bun:test";
import { Readable, Writable } from "node:stream";
import { createContext, runApp } from "./app.ts";
import { Prompter } from "./presentation/input.ts";
import { createOutput } from "./presentation/output.ts";
import { defaultConfig } from "./storage/settingsStorage.ts";
import type { SettingsStorage } from "./storage/settingsStorage.ts";
import type { City, Config } from "./types/index.ts";
import { noColor } from "./utils/colors.ts";
import type { Fetcher } from "./api/http.ts";

const OTTAWA: City = {
  id: 6094817,
  name: "Ottawa",
  country: "Canada",
  admin1: "Ontario",
  latitude: 45.41117,
  longitude: -75.69812,
};

const TORONTO: City = { ...OTTAWA, id: 6167865, name: "Toronto" };

const CONDITIONS = {
  timezone: "America/Toronto",
  current: { time: "2026-09-28T17:30", temperature_2m: 16.3, weather_code: 0, is_day: 1 },
  current_units: { temperature_2m: "°C" },
};

function fakeApi(geocode: unknown = { results: [OTTAWA] }, weather: unknown = CONDITIONS): Fetcher {
  return (async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const body = url.hostname.startsWith("geocoding-api") ? geocode : weather;
    return new Response(typeof body === "string" ? body : JSON.stringify(body));
  }) as unknown as Fetcher;
}

const failingApi = (async () => {
  throw new Error("getaddrinfo ENOTFOUND");
}) as unknown as Fetcher;

interface Session {
  text: string;
  saved: Config[];
}

async function session(
  answers: string[],
  options: { config?: Config; fetcher?: Fetcher; saveFails?: boolean } = {},
): Promise<Session> {
  let buffer = "";
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      buffer += String(chunk);
      callback();
    },
  });

  const saved: Config[] = [];
  const storage: SettingsStorage = {
    load: async () => ({ config: options.config ?? defaultConfig(), warning: null }),
    save: async (config) => {
      if (options.saveFails === true) throw new Error("disk full");
      saved.push(structuredClone(config));
    },
  };

  const input = new Prompter(
    Readable.from(answers.map((line) => `${line}\n`)) as unknown as NodeJS.ReadableStream,
    stream,
  );

  const context = createContext({
    config: options.config ?? defaultConfig(),
    input,
    output: createOutput(stream, noColor),
    fetcher: options.fetcher ?? fakeApi(),
    storage,
    paint: noColor,
  });

  await runApp(context);
  return { text: buffer, saved };
}

function seeded(...cities: City[]): Config {
  return { ...defaultConfig(), cities, defaultCityId: cities[0]?.id ?? null };
}

describe("runApp", () => {
  test("exits on the exit option without running anything else", async () => {
    const { text } = await session(["7"]);

    expect(text).toContain("  Bye!\n");
    expect(text.match(/WEATHER CLI/g)).toHaveLength(1);
  });

  test("exits when stdin closes instead of hanging", async () => {
    const { text } = await session([]);

    expect(text.endsWith("\n  Bye!\n")).toBe(true);
  });

  test("re-asks after an unusable answer", async () => {
    const { text } = await session(["9", "nope", "7"]);

    expect(text.match(/WEATHER CLI/g)).toHaveLength(3);
    expect(text).toContain("  ! Enter a number between 1 and 7.\n");
  });

  test("shows the default city, then every city", async () => {
    const { text } = await session(["1", "2", "7"], { config: seeded(OTTAWA, TORONTO) });

    expect(text.match(/16.3 °C · Clear sky/g)).toHaveLength(3);
    expect(text).toContain("  ☀️  Ottawa, Ontario, Canada");
    expect(text).toContain("  ☀️  Toronto, Ontario, Canada");
  });

  test("explains an empty state instead of failing", async () => {
    const { text } = await session(["1", "2", "4", "5", "7"]);

    expect(text).toContain("  ! No default city set. Use option 3 to add a city first.\n");
    expect(text).toContain("  ! No cities saved yet. Use option 3 to add one.\n");
    expect(text).toContain("  ! No cities saved yet.\n");
  });

  test("adds a searched city, makes it the default and saves it", async () => {
    const { text, saved } = await session(["3", "Ottawa", "1", "7"]);

    expect(text).toContain("  1. Ottawa, Ontario, Canada\n");
    expect(text).toContain("  Added Ottawa, Ontario, Canada and set it as default.\n");
    expect(saved[0]?.defaultCityId).toBe(OTTAWA.id);
    expect(saved[0]?.cities).toEqual([OTTAWA]);
  });

  test("does not make a new city the default when one is already set", async () => {
    const { text, saved } = await session(["3", "Ottawa", "1", "7"], { config: seeded(TORONTO) });

    expect(text).toContain("  Added Ottawa, Ontario, Canada.\n");
    expect(saved[0]?.defaultCityId).toBe(TORONTO.id);
  });

  test("reports a search that matches nothing", async () => {
    const { text, saved } = await session(["3", "zzzznotacity", "7"], { fetcher: fakeApi({ generationtime_ms: 0.9 }) });

    expect(text).toContain('  ! No city found matching "zzzznotacity".\n');
    expect(saved).toHaveLength(0);
  });

  test("deletes a city after confirmation and saves the result", async () => {
    const { text, saved } = await session(["4", "2", "y", "7"], { config: seeded(OTTAWA, TORONTO) });

    expect(text).toContain("  Deleted Toronto, Ontario, Canada.\n");
    expect(saved[0]?.cities).toEqual([OTTAWA]);
  });

  test("keeps a city when the confirmation is declined", async () => {
    const { text, saved } = await session(["4", "2", "n", "7"], { config: seeded(OTTAWA, TORONTO) });

    expect(text).toContain("  Cancelled.\n");
    expect(saved).toHaveLength(0);
  });

  test("clears the default when the default city is the one deleted", async () => {
    const { text, saved } = await session(["4", "1", "y", "7"], { config: seeded(OTTAWA, TORONTO) });

    expect(text).toContain("  Deleted Ottawa, Ontario, Canada. No default city is set now.\n");
    expect(saved[0]?.defaultCityId).toBeNull();
  });

  test("changes the default city and saves it", async () => {
    const { text, saved } = await session(["5", "2", "7"], { config: seeded(OTTAWA, TORONTO) });

    expect(text).toContain("  Default city is now Toronto, Ontario, Canada.\n");
    expect(saved[0]?.defaultCityId).toBe(TORONTO.id);
  });

  test("changes the temperature unit and saves it", async () => {
    const { text, saved } = await session(["6", "f", "7"]);

    expect(text).toContain("  Temperature unit: °C\n");
    expect(text).toContain("  Temperature unit set to °F.\n");
    expect(saved[0]?.unit).toBe("fahrenheit");
  });

  test("leaves the unit alone on an empty answer or a typo", async () => {
    const unchanged = await session(["6", "", "7"]);
    expect(unchanged.text).toContain("  Unchanged.\n");
    expect(unchanged.saved).toHaveLength(0);

    const typo = await session(["6", "kelvin", "7"]);
    expect(typo.text).toContain("  ! Enter c, f, or press enter.\n");
    expect(typo.saved).toHaveLength(0);
  });

  test("reports an API failure and carries on with the menu", async () => {
    const { text } = await session(["1", "7"], { config: seeded(OTTAWA), fetcher: failingApi });

    expect(text).toContain("  ! Could not reach Open-Meteo: getaddrinfo ENOTFOUND\n");
    expect(text).toContain("  Bye!\n");
    expect(text.match(/WEATHER CLI/g)).toHaveLength(2);
  });

  test("reports a save failure without losing the change", async () => {
    const { text } = await session(["6", "c", "7"], { saveFails: true });

    expect(text).toContain("  ! Could not save settings: disk full\n");
    expect(text).toContain("  Bye!\n");
  });

  test("never emits escape codes when painting is off", async () => {
    const { text } = await session(["1", "2", "3", "Ottawa", "1", "7"], { config: seeded(OTTAWA) });
    expect(text).not.toContain("\u001b");
  });
});
