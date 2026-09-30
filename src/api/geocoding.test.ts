import { describe, expect, test } from "bun:test";
import { searchCity } from "./geocoding.ts";
import type { Fetcher } from "./http.ts";

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
