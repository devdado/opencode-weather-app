import { describe, expect, test } from "bun:test";
import { cityLabel, formatTemperature, formatUnit } from "./format.ts";
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

describe("cityLabel", () => {
  test("joins name, region and country", () => {
    expect(cityLabel(ottawa)).toBe("Ottawa, Ontario, Canada");
  });

  test("skips empty parts", () => {
    expect(cityLabel({ ...ottawa, admin1: "", country: "" })).toBe("Ottawa");
    expect(cityLabel({ ...ottawa, admin1: "" })).toBe("Ottawa, Canada");
    expect(cityLabel({ ...ottawa, country: "" })).toBe("Ottawa, Ontario");
  });
});

describe("formatUnit", () => {
  test("renders the degree labels used in the menu", () => {
    expect(formatUnit("celsius")).toBe("°C");
    expect(formatUnit("fahrenheit")).toBe("°F");
  });
});

describe("formatTemperature", () => {
  test("pairs the reading with the unit the API returned", () => {
    expect(formatTemperature(weather)).toBe("16.3 °C");
    expect(formatTemperature({ ...weather, temperature: 61.3, temperatureUnit: "°F" })).toBe("61.3 °F");
  });
});
