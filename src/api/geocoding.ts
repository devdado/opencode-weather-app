import type { City } from "../types/index.ts";
import { fetchJson } from "./http.ts";
import type { Fetcher } from "./http.ts";

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

interface GeocodeResponse {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
}

export async function searchCity(name: string, count = 10, fetcher: Fetcher = fetch): Promise<City[]> {
  const trimmed = name.trim();
  if (trimmed.length === 0) return [];

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", trimmed);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const payload = await fetchJson(url, fetcher);

  // An unknown city comes back as HTTP 200 with no `results` key at all, so this
  // must be a presence check rather than a length check on an assumed array.
  const results = (payload as GeocodeResponse).results;
  if (!Array.isArray(results)) return [];

  return results.map((result) => ({
    id: result.id,
    name: result.name,
    country: result.country ?? "",
    admin1: result.admin1 ?? "",
    latitude: result.latitude,
    longitude: result.longitude,
  }));
}
