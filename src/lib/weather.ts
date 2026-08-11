// Open-Meteo is free and requires no API key, which keeps the dashboard's
// weather widget genuinely functional out of the box.

export interface WeatherSnapshot {
  temperatureC: number;
  condition: string;
  windKph: number;
  humidity: number | null;
  city: string;
}

const WEATHER_CODES: Record<number, string> = {
  0: "Ciel dégagé",
  1: "Plutôt dégagé",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine",
  55: "Bruine dense",
  61: "Pluie légère",
  63: "Pluie",
  65: "Pluie forte",
  71: "Neige légère",
  73: "Neige",
  75: "Neige forte",
  80: "Averses légères",
  81: "Averses",
  82: "Averses violentes",
  95: "Orage",
  96: "Orage avec grêle",
  99: "Orage violent",
};

export async function getWeather(
  latitude: number,
  longitude: number,
  city: string
): Promise<WeatherSnapshot | null> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set(
      "current",
      "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code"
    );

    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current;
    if (!current) return null;

    return {
      temperatureC: Math.round(current.temperature_2m),
      condition: WEATHER_CODES[current.weather_code] ?? "Conditions inconnues",
      windKph: Math.round(current.wind_speed_10m),
      humidity: current.relative_humidity_2m ?? null,
      city,
    };
  } catch {
    return null;
  }
}
