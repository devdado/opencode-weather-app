import { describe, expect, test } from "bun:test";
import { getCurrentWeather } from "./weather.ts";
import { WeatherApiError } from "./http.ts";
import type { Fetcher } from "./http.ts";

function fakeFetch(body: unknown, status = 200, capture?: { url?: string }): Fetcher {
  return (async (input: string | URL | Request) => {
    if (capture) capture.url = String(input);
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as unknown as Fetcher;
}

const payload = {
  timezone: "America/Toronto",
  current: { time: "2026-09-28T17:30", temperature_2m: 16.3, weather_code: 3, is_day: 1 },
  current_units: { temperature_2m: "°C" },
};

describe("getCurrentWeather", () => {
  test("returns the current conditions", async () => {
    const weather = await getCurrentWeather({ latitude: 45.41117, longitude: -75.69812 }, "celsius", fakeFetch(payload));

    expect(weather.temperature).toBe(16.3);
    expect(weather.weatherCode).toBe(3);
    expect(weather.isDay).toBe(true);
    expect(weather.timezone).toBe("America/Toronto");
    expect(weather.temperatureUnit).toBe("°C");
  });

  test("passes the unit through to the API rather than converting locally", async () => {
    const capture: { url?: string } = {};
    await getCurrentWeather({ latitude: 1, longitude: 2 }, "fahrenheit", fakeFetch(payload, 200, capture));

    const url = new URL(capture.url ?? "");
    expect(url.searchParams.get("temperature_unit")).toBe("fahrenheit");
    expect(url.searchParams.get("timezone")).toBe("auto");
    expect(url.searchParams.get("current")).toContain("temperature_2m");
    expect(url.searchParams.get("current")).toContain("weather_code");
  });

  test("reads the unit label from the response", async () => {
    const fahrenheit = {
      ...payload,
      current: { ...payload.current, temperature_2m: 61.3 },
      current_units: { temperature_2m: "°F" },
    };
    const weather = await getCurrentWeather({ latitude: 1, longitude: 2 }, "fahrenheit", fakeFetch(fahrenheit));
    expect(weather.temperatureUnit).toBe("°F");
  });

  test("treats a missing is_day as daytime", async () => {
    const noIsDay = { ...payload, current: { time: "t", temperature_2m: 1, weather_code: 0 } };
    const weather = await getCurrentWeather({ latitude: 1, longitude: 2 }, "celsius", fakeFetch(noIsDay));
    expect(weather.isDay).toBe(true);
  });

  test("falls back to a unit label when the API omits one", async () => {
    const noUnits = { timezone: "GMT", current: payload.current };
    const weather = await getCurrentWeather({ latitude: 1, longitude: 2 }, "fahrenheit", fakeFetch(noUnits));
    expect(weather.temperatureUnit).toBe("°F");
  });

  test("propagates an API error payload", async () => {
    const fetcher = fakeFetch({ error: true, reason: "Latitude must be in range" });
    await expect(getCurrentWeather({ latitude: 999, longitude: 0 }, "celsius", fetcher)).rejects.toBeInstanceOf(
      WeatherApiError,
    );
  });

  test("throws a friendly error when current conditions are missing", async () => {
    await expect(
      getCurrentWeather({ latitude: 1, longitude: 2 }, "celsius", fakeFetch({ timezone: "GMT" })),
    ).rejects.toThrow(/did not return the requested current conditions/);
  });
});
