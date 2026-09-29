import { describe, expect, test } from "bun:test";
import { getCurrentWeather, searchCity, WeatherApiError } from "./openmeteo.ts";
import type { Fetcher } from "./openmeteo.ts";

function fakeFetch(body: unknown, status = 200, capture?: { url?: string }): Fetcher {
  return (async (input: string | URL | Request) => {
    if (capture) capture.url = String(input);
    return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
  }) as unknown as Fetcher;
}

const OTTAWA = {
  id: 6094817,
  name: "Ottawa",
  latitude: 45.41117,
  longitude: -75.69812,
  country: "Canada",
  admin1: "Ontario",
};

describe("searchCity", () => {
  test("maps results into cities", async () => {
    const cities = await searchCity("Ottawa", 10, fakeFetch({ results: [OTTAWA] }));

    expect(cities).toHaveLength(1);
    expect(cities[0]).toEqual({
      id: 6094817,
      name: "Ottawa",
      country: "Canada",
      admin1: "Ontario",
      latitude: 45.41117,
      longitude: -75.69812,
    });
  });

  test("requests english results and honours the count", async () => {
    const capture: { url?: string } = {};
    await searchCity("Ottawa", 5, fakeFetch({ results: [] }, 200, capture));

    const url = new URL(capture.url ?? "");
    expect(url.searchParams.get("language")).toBe("en");
    expect(url.searchParams.get("count")).toBe("5");
    expect(url.searchParams.get("name")).toBe("Ottawa");
  });

  test("returns an empty array when the API omits the results key", async () => {
    // The live API answers HTTP 200 with no `results` field for unknown names.
    const cities = await searchCity("zzzznotacity", 10, fakeFetch({ generationtime_ms: 0.9 }));
    expect(cities).toEqual([]);
  });

  test("returns an empty array when results is present but empty", async () => {
    expect(await searchCity("Ottawa", 10, fakeFetch({ results: [] }))).toEqual([]);
  });

  test("short-circuits without a request for a blank name", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return new Response("{}");
    }) as unknown as Fetcher;

    expect(await searchCity("   ", 10, spy)).toEqual([]);
    expect(called).toBe(false);
  });

  test("defaults missing country and admin1 to empty strings", async () => {
    const cities = await searchCity(
      "Nowhere",
      10,
      fakeFetch({ results: [{ id: 1, name: "Nowhere", latitude: 0, longitude: 0 }] }),
    );
    expect(cities[0]?.country).toBe("");
    expect(cities[0]?.admin1).toBe("");
  });
});

describe("getCurrentWeather", () => {
  const payload = {
    timezone: "America/Toronto",
    current: { time: "2026-09-28T17:30", temperature_2m: 16.3, weather_code: 3, is_day: 1 },
    current_units: { temperature_2m: "°C" },
  };

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

  test("throws a friendly error for an API error payload", async () => {
    const fetcher = fakeFetch({ error: true, reason: "Latitude must be in range" });
    await expect(getCurrentWeather({ latitude: 999, longitude: 0 }, "celsius", fetcher)).rejects.toThrow(
      /Latitude must be in range/,
    );
  });

  test("throws a friendly error for a non-2xx response", async () => {
    await expect(
      getCurrentWeather({ latitude: 1, longitude: 2 }, "celsius", fakeFetch({}, 500)),
    ).rejects.toBeInstanceOf(WeatherApiError);
  });

  test("throws a friendly error when current conditions are missing", async () => {
    await expect(
      getCurrentWeather({ latitude: 1, longitude: 2 }, "celsius", fakeFetch({ timezone: "GMT" })),
    ).rejects.toThrow(/did not return the requested current conditions/);
  });

  test("wraps network failures instead of leaking the raw error", async () => {
    const failing = (async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    }) as unknown as Fetcher;

    await expect(getCurrentWeather({ latitude: 1, longitude: 2 }, "celsius", failing)).rejects.toThrow(
      /Could not reach Open-Meteo/,
    );
  });

  test("throws a friendly error for invalid JSON", async () => {
    await expect(
      getCurrentWeather({ latitude: 1, longitude: 2 }, "celsius", fakeFetch("not json")),
    ).rejects.toThrow(/not valid JSON/);
  });
});
