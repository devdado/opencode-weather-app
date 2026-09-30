import { describe, expect, test } from "bun:test";
import { buildMenuOptions } from "./index.ts";
import { defaultConfig } from "../storage/settingsStorage.ts";
import type { City, Config } from "../types/index.ts";

const ottawa: City = {
  id: 6094817,
  name: "Ottawa",
  country: "Canada",
  admin1: "Ontario",
  latitude: 45.41117,
  longitude: -75.69812,
};

function config(overrides: Partial<Config> = {}): Config {
  return { ...defaultConfig(), ...overrides };
}

describe("buildMenuOptions", () => {
  const labels = buildMenuOptions(config()).map((option) => `${option.key}. ${option.label}`);

  test("matches the README layout", () => {
    expect(labels).toEqual([
      "1. City weather (default)",
      "2. All cities weather (0)",
      "3. Search and add city",
      "4. Delete city",
      "5. Set default city",
      "6. Settings (°C)",
      "7. Exit",
    ]);
  });

  test("numbers the options contiguously from 1", () => {
    expect(buildMenuOptions(config()).map((option) => option.key)).toEqual(["1", "2", "3", "4", "5", "6", "7"]);
  });

  test("shows the live city count", () => {
    const saved = config({ cities: [ottawa, { ...ottawa, id: 2 }] });
    expect(buildMenuOptions(saved)[1]?.label).toBe("All cities weather (2)");
  });

  test("shows the current unit", () => {
    expect(buildMenuOptions(config({ unit: "fahrenheit" }))[5]?.label).toBe("Settings (°F)");
  });

  test("gives every option something to run", () => {
    for (const option of buildMenuOptions(config())) {
      expect(typeof option.run).toBe("function");
    }
  });
});
