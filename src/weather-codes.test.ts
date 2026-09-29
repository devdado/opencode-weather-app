import { describe, expect, test } from "bun:test";
import { describeWeather } from "./weather-codes.ts";

describe("describeWeather", () => {
  test("maps a known WMO code to its label", () => {
    expect(describeWeather(0, true).label).toBe("Clear sky");
    expect(describeWeather(65, true).label).toBe("Heavy rain");
    expect(describeWeather(95, true).label).toBe("Thunderstorm");
  });

  test("covers every documented WMO code", () => {
    const codes = [
      0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 97,
      99,
    ];
    for (const code of codes) {
      expect(describeWeather(code, true).label).not.toBe("Unknown conditions");
    }
  });

  test("falls back for undocumented codes instead of throwing", () => {
    expect(describeWeather(4, true).label).toBe("Unknown conditions");
    expect(describeWeather(-1, true).label).toBe("Unknown conditions");
    expect(describeWeather(999, true).label).toBe("Unknown conditions");
  });

  test("uses the night label and icon after dark", () => {
    expect(describeWeather(0, false).label).toBe("Clear night");
    expect(describeWeather(0, false).emoji).not.toBe(describeWeather(0, true).emoji);
  });

  test("keeps the same label day and night for fog and storms", () => {
    expect(describeWeather(45, false).label).toBe(describeWeather(45, true).label);
    expect(describeWeather(95, false).label).toBe(describeWeather(95, true).label);
  });
});
