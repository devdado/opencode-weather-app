import { describe, expect, test } from "bun:test";
import { fetchJson, WeatherApiError } from "./http.ts";
import type { Fetcher } from "./http.ts";

function fakeFetch(body: unknown, status = 200): Fetcher {
  return (async () => new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as unknown as Fetcher;
}

const url = new URL("https://api.open-meteo.com/v1/forecast");

describe("fetchJson", () => {
  test("returns the parsed body on success", async () => {
    expect(await fetchJson(url, fakeFetch({ timezone: "GMT" }))).toEqual({ timezone: "GMT" });
  });

  test("throws a friendly error for an API error payload", async () => {
    await expect(fetchJson(url, fakeFetch({ error: true, reason: "Latitude must be in range" }))).rejects.toThrow(
      /Latitude must be in range/,
    );
  });

  test("still reports an error payload with no reason", async () => {
    await expect(fetchJson(url, fakeFetch({ error: true }))).rejects.toThrow(/unknown error/);
  });

  test("throws a friendly error for a non-2xx response", async () => {
    await expect(fetchJson(url, fakeFetch({}, 500))).rejects.toBeInstanceOf(WeatherApiError);
  });

  test("reports the status code so the user can tell 404 from 500", async () => {
    await expect(fetchJson(url, fakeFetch({}, 404))).rejects.toThrow(/HTTP 404/);
  });

  test("wraps network failures instead of leaking the raw error", async () => {
    const failing = (async () => {
      throw new Error("getaddrinfo ENOTFOUND");
    }) as unknown as Fetcher;

    await expect(fetchJson(url, failing)).rejects.toThrow(/Could not reach Open-Meteo/);
  });

  test("throws a friendly error for invalid JSON", async () => {
    await expect(fetchJson(url, fakeFetch("not json"))).rejects.toThrow(/not valid JSON/);
  });
});
