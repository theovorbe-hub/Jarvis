export interface WeatherSnapshot {
  temperature: number;
  feelsLike: number;
  condition: string;
  windKmh: number;
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
  55: "Bruine forte",
  61: "Pluie légère",
  63: "Pluie",
  65: "Pluie forte",
  71: "Neige légère",
  73: "Neige",
  75: "Neige forte",
  80: "Averses",
  81: "Averses fortes",
  82: "Averses violentes",
  95: "Orages",
  96: "Orages avec grêle",
};

/** Keyless weather via Open-Meteo, cached for a minute at the fetch layer. */
export async function getWeather(): Promise<WeatherSnapshot | null> {
  const lat = process.env.DEFAULT_LAT ?? "48.8566";
  const lon = process.env.DEFAULT_LON ?? "2.3522";
  const city = process.env.DEFAULT_CITY ?? "Paris";

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current;
    return {
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      condition: WEATHER_CODES[current.weather_code] ?? "Conditions inconnues",
      windKmh: Math.round(current.wind_speed_10m),
      city,
    };
  } catch {
    return null;
  }
}
