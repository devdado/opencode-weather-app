export interface WeatherDescription {
  label: string;
  nightLabel: string;
  emoji: string;
  nightEmoji: string;
}

const DESCRIPTIONS: Record<number, WeatherDescription> = {
  0: { label: "Clear sky", nightLabel: "Clear night", emoji: "☀️", nightEmoji: "🌙" },
  1: { label: "Mainly clear", nightLabel: "Mainly clear", emoji: "🌤️", nightEmoji: "🌙" },
  2: { label: "Partly cloudy", nightLabel: "Partly cloudy", emoji: "⛅", nightEmoji: "☁️" },
  3: { label: "Overcast", nightLabel: "Overcast", emoji: "☁️", nightEmoji: "☁️" },
  45: { label: "Fog", nightLabel: "Fog", emoji: "🌫️", nightEmoji: "🌫️" },
  48: { label: "Depositing rime fog", nightLabel: "Depositing rime fog", emoji: "🌫️", nightEmoji: "🌫️" },
  51: { label: "Light drizzle", nightLabel: "Light drizzle", emoji: "🌦️", nightEmoji: "🌧️" },
  53: { label: "Moderate drizzle", nightLabel: "Moderate drizzle", emoji: "🌦️", nightEmoji: "🌧️" },
  55: { label: "Dense drizzle", nightLabel: "Dense drizzle", emoji: "🌧️", nightEmoji: "🌧️" },
  56: { label: "Light freezing drizzle", nightLabel: "Light freezing drizzle", emoji: "🌨️", nightEmoji: "🌨️" },
  57: { label: "Dense freezing drizzle", nightLabel: "Dense freezing drizzle", emoji: "🌨️", nightEmoji: "🌨️" },
  61: { label: "Slight rain", nightLabel: "Slight rain", emoji: "🌦️", nightEmoji: "🌧️" },
  63: { label: "Moderate rain", nightLabel: "Moderate rain", emoji: "🌧️", nightEmoji: "🌧️" },
  65: { label: "Heavy rain", nightLabel: "Heavy rain", emoji: "🌧️", nightEmoji: "🌧️" },
  66: { label: "Light freezing rain", nightLabel: "Light freezing rain", emoji: "🌨️", nightEmoji: "🌨️" },
  67: { label: "Heavy freezing rain", nightLabel: "Heavy freezing rain", emoji: "🌨️", nightEmoji: "🌨️" },
  71: { label: "Slight snowfall", nightLabel: "Slight snowfall", emoji: "🌨️", nightEmoji: "🌨️" },
  73: { label: "Moderate snowfall", nightLabel: "Moderate snowfall", emoji: "❄️", nightEmoji: "❄️" },
  75: { label: "Heavy snowfall", nightLabel: "Heavy snowfall", emoji: "❄️", nightEmoji: "❄️" },
  77: { label: "Snow grains", nightLabel: "Snow grains", emoji: "🌨️", nightEmoji: "🌨️" },
  80: { label: "Slight rain showers", nightLabel: "Slight rain showers", emoji: "🌦️", nightEmoji: "🌧️" },
  81: { label: "Moderate rain showers", nightLabel: "Moderate rain showers", emoji: "🌧️", nightEmoji: "🌧️" },
  82: { label: "Violent rain showers", nightLabel: "Violent rain showers", emoji: "⛈️", nightEmoji: "⛈️" },
  85: { label: "Slight snow showers", nightLabel: "Slight snow showers", emoji: "🌨️", nightEmoji: "🌨️" },
  86: { label: "Heavy snow showers", nightLabel: "Heavy snow showers", emoji: "❄️", nightEmoji: "❄️" },
  95: { label: "Thunderstorm", nightLabel: "Thunderstorm", emoji: "⛈️", nightEmoji: "⛈️" },
  96: { label: "Thunderstorm with slight hail", nightLabel: "Thunderstorm with slight hail", emoji: "⛈️", nightEmoji: "⛈️" },
  97: { label: "Heavy thunderstorm", nightLabel: "Heavy thunderstorm", emoji: "⛈️", nightEmoji: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", nightLabel: "Thunderstorm with heavy hail", emoji: "⛈️", nightEmoji: "⛈️" },
};

const UNKNOWN: WeatherDescription = {
  label: "Unknown conditions",
  nightLabel: "Unknown conditions",
  emoji: "❓",
  nightEmoji: "❓",
};

export function describeWeather(code: number, isDay: boolean): WeatherDescription {
  const entry = DESCRIPTIONS[code] ?? UNKNOWN;
  return isDay ? entry : { ...entry, label: entry.nightLabel, emoji: entry.nightEmoji };
}
