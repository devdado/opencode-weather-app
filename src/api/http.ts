export type Fetcher = typeof fetch;

export class WeatherApiError extends Error {}

/**
 * Every Open-Meteo failure reaches the user as a `WeatherApiError`, so the menu
 * loop can print it and keep going instead of crashing on a raw fetch rejection.
 */
export async function fetchJson(url: URL, fetcher: Fetcher): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new WeatherApiError(`Could not reach Open-Meteo: ${detail}`);
  }

  if (!response.ok) {
    throw new WeatherApiError(`Open-Meteo returned HTTP ${response.status}.`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new WeatherApiError("Open-Meteo returned a response that is not valid JSON.");
  }

  if (typeof payload === "object" && payload !== null && "error" in payload && payload.error === true) {
    const reason = "reason" in payload && typeof payload.reason === "string" ? payload.reason : "unknown error";
    throw new WeatherApiError(`Open-Meteo error: ${reason}`);
  }

  return payload;
}
