import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configPath, createSettingsStorage, defaultConfig, loadConfig, saveConfig } from "./settingsStorage.ts";
import type { Config } from "../types/index.ts";

let directory = "";
let path = "";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "weather-cli-test-"));
  path = join(directory, "config.json");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

function sampleConfig(): Config {
  return {
    version: 1,
    cities: [
      { id: 6094817, name: "Ottawa", country: "Canada", admin1: "Ontario", latitude: 45.41117, longitude: -75.69812 },
    ],
    defaultCityId: 6094817,
    unit: "fahrenheit",
  };
}

describe("configPath", () => {
  test("points inside the user's home directory", () => {
    expect(configPath()).toContain(".weather-cli");
    expect(configPath().endsWith("config.json")).toBe(true);
  });
});

describe("loadConfig", () => {
  test("returns defaults when the file does not exist", async () => {
    const { config, warning } = await loadConfig(path);
    expect(warning).toBeNull();
    expect(config).toEqual(defaultConfig());
  });

  test("round-trips a saved config", async () => {
    const original = sampleConfig();
    await saveConfig(original, path);
    const { config } = await loadConfig(path);
    expect(config).toEqual(original);
    expect(config.cities[0]?.name).toBe("Ottawa");
  });

  test("creates the parent directory on save", async () => {
    const nested = join(directory, "nested", "deeper", "config.json");
    await saveConfig(sampleConfig(), nested);
    const { config } = await loadConfig(nested);
    expect(config.cities).toHaveLength(1);
  });

  test("recovers from unparsable JSON and preserves the old file", async () => {
    await writeFile(path, "{ not json");
    const { config, warning } = await loadConfig(path);

    expect(config).toEqual(defaultConfig());
    expect(warning).not.toBeNull();
    expect(await readFile(`${path}.corrupt`, "utf8")).toBe("{ not json");
  });

  test("drops malformed city entries instead of failing", async () => {
    await writeFile(
      path,
      JSON.stringify({
        cities: [{ id: 1, name: "Good", latitude: 1, longitude: 2 }, { id: "bad" }, null, 42],
        defaultCityId: 99,
        unit: "kelvin",
      }),
    );
    const { config } = await loadConfig(path);

    expect(config.cities).toHaveLength(1);
    expect(config.cities[0]?.name).toBe("Good");
    expect(config.cities[0]?.admin1).toBe("");
    expect(config.defaultCityId).toBeNull();
    expect(config.unit).toBe("celsius");
  });

  test("clears a default id that no longer matches a saved city", async () => {
    await writeFile(path, JSON.stringify({ cities: [], defaultCityId: 42 }));
    const { config } = await loadConfig(path);
    expect(config.defaultCityId).toBeNull();
  });

  test("keeps a valid default id", async () => {
    await writeFile(path, JSON.stringify({ cities: [{ id: 42, name: "X", latitude: 1, longitude: 2 }], defaultCityId: 42 }));
    const { config } = await loadConfig(path);
    expect(config.defaultCityId).toBe(42);
  });

  test("falls back to defaults for a non-object payload", async () => {
    await writeFile(path, JSON.stringify([1, 2, 3]));
    const { config } = await loadConfig(path);
    expect(config).toEqual(defaultConfig());
  });
});

describe("createSettingsStorage", () => {
  test("binds the path so callers never pass one", async () => {
    const storage = createSettingsStorage(path);

    expect((await storage.load()).config).toEqual(defaultConfig());
    await storage.save(sampleConfig());
    expect((await storage.load()).config).toEqual(sampleConfig());
  });
});
