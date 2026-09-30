import { describe, expect, test } from "bun:test";
import { addCity, findCity, findDefaultCity, hasCity, listCities, removeCity, setDefaultCity } from "./citiesStorage.ts";
import type { City, Config } from "../types/index.ts";

const ottawa: City = {
  id: 6094817,
  name: "Ottawa",
  country: "Canada",
  admin1: "Ontario",
  latitude: 45.41117,
  longitude: -75.69812,
};

const toronto: City = { ...ottawa, id: 6167865, name: "Toronto" };

function config(overrides: Partial<Config> = {}): Config {
  return { version: 1, cities: [], defaultCityId: null, unit: "celsius", ...overrides };
}

describe("listCities", () => {
  test("returns the saved cities in insertion order", () => {
    const saved = config({ cities: [ottawa, toronto] });
    expect(listCities(saved)).toEqual([ottawa, toronto]);
  });

  test("returns an empty list when nothing is saved", () => {
    expect(listCities(config())).toEqual([]);
  });
});

describe("findCity", () => {
  test("returns the matching city", () => {
    expect(findCity(config({ cities: [ottawa, toronto] }), toronto.id)?.name).toBe("Toronto");
  });

  test("returns null for an unknown id", () => {
    expect(findCity(config({ cities: [ottawa] }), 1)).toBeNull();
  });
});

describe("hasCity", () => {
  test("is driven by the geocoding id, not the name", () => {
    const saved = config({ cities: [ottawa] });
    expect(hasCity(saved, ottawa.id)).toBe(true);
    expect(hasCity(saved, toronto.id)).toBe(false);
  });
});

describe("findDefaultCity", () => {
  test("returns null when no default is set", () => {
    expect(findDefaultCity(config())).toBeNull();
  });

  test("returns the matching city", () => {
    expect(findDefaultCity(config({ cities: [ottawa], defaultCityId: ottawa.id }))?.id).toBe(ottawa.id);
  });

  test("returns null when the default id matches no saved city", () => {
    expect(findDefaultCity(config({ cities: [ottawa], defaultCityId: 42 }))).toBeNull();
  });
});

describe("addCity", () => {
  test("appends the city", () => {
    const saved = config({ cities: [ottawa], defaultCityId: ottawa.id });
    expect(addCity(saved, toronto)).toEqual({ added: true, becameDefault: false });
    expect(listCities(saved)).toEqual([ottawa, toronto]);
  });

  test("makes the very first city the default", () => {
    const saved = config();
    expect(addCity(saved, ottawa)).toEqual({ added: true, becameDefault: true });
    expect(saved.defaultCityId).toBe(ottawa.id);
  });

  test("does not steal an existing default", () => {
    const saved = config({ cities: [ottawa], defaultCityId: ottawa.id });
    expect(addCity(saved, toronto).becameDefault).toBe(false);
    expect(saved.defaultCityId).toBe(ottawa.id);
  });

  test("refuses a duplicate and leaves the list alone", () => {
    const saved = config({ cities: [ottawa], defaultCityId: ottawa.id });
    expect(addCity(saved, { ...ottawa, name: "Ottawa (renamed)" })).toEqual({ added: false, becameDefault: false });
    expect(listCities(saved)).toHaveLength(1);
  });
});

describe("removeCity", () => {
  test("deletes the city by id", () => {
    const saved = config({ cities: [ottawa, toronto], defaultCityId: ottawa.id });
    expect(removeCity(saved, toronto.id)).toEqual({ removed: toronto, lostDefault: false });
    expect(listCities(saved)).toEqual([ottawa]);
  });

  test("clears the default when the default city is the one deleted", () => {
    const saved = config({ cities: [ottawa, toronto], defaultCityId: ottawa.id });
    expect(removeCity(saved, ottawa.id).lostDefault).toBe(true);
    expect(saved.defaultCityId).toBeNull();
  });

  test("keeps the default when another city is deleted", () => {
    const saved = config({ cities: [ottawa, toronto], defaultCityId: ottawa.id });
    expect(removeCity(saved, toronto.id).lostDefault).toBe(false);
    expect(saved.defaultCityId).toBe(ottawa.id);
  });

  test("reports nothing removed for an unknown id", () => {
    const saved = config({ cities: [ottawa] });
    expect(removeCity(saved, 42)).toEqual({ removed: null, lostDefault: false });
    expect(listCities(saved)).toEqual([ottawa]);
  });
});

describe("setDefaultCity", () => {
  test("points the default at a saved city", () => {
    const saved = config({ cities: [ottawa, toronto], defaultCityId: ottawa.id });
    expect(setDefaultCity(saved, toronto.id)?.name).toBe("Toronto");
    expect(saved.defaultCityId).toBe(toronto.id);
  });

  test("refuses an id that is not saved", () => {
    const saved = config({ cities: [ottawa], defaultCityId: ottawa.id });
    expect(setDefaultCity(saved, 42)).toBeNull();
    expect(saved.defaultCityId).toBe(ottawa.id);
  });
});
