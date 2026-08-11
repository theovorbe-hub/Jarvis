import { logActivity } from "@/lib/activity";

export type SearchResult = {
  title: string;
  url: string;
  source: string;
  summary: string;
  publishedDate?: string;
};

export function isSearchConfigured() {
  return Boolean(process.env.TAVILY_API_KEY);
}

export async function webSearch(userId: string, query: string): Promise<{
  configured: boolean;
  results: SearchResult[];
}> {
  if (!isSearchConfigured()) {
    await logActivity({
      userId,
      agent: "research",
      action: "Recherche web indisponible",
      detail: `"${query}" — clé TAVILY_API_KEY non configurée`,
      status: "error",
    });
    return { configured: false, results: [] };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: "basic",
        max_results: 5,
        include_answer: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Tavily a répondu ${res.status}`);
    }

    const data = await res.json();
    const results: SearchResult[] = (data.results ?? []).map(
      (r: { title: string; url: string; content: string; published_date?: string }) => ({
        title: r.title,
        url: r.url,
        source: safeHostname(r.url),
        summary: r.content?.slice(0, 400) ?? "",
        publishedDate: r.published_date,
      })
    );

    await logActivity({
      userId,
      agent: "research",
      action: "Recherche web effectuée",
      detail: `"${query}" — ${results.length} résultat(s)`,
    });

    return { configured: true, results };
  } catch (err) {
    await logActivity({
      userId,
      agent: "research",
      action: "Recherche web échouée",
      detail: err instanceof Error ? err.message : "erreur inconnue",
      status: "error",
    });
    return { configured: true, results: [] };
  }
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const WEATHER_CODES: Record<number, string> = {
  0: "ciel dégagé",
  1: "principalement dégagé",
  2: "partiellement nuageux",
  3: "couvert",
  45: "brouillard",
  48: "brouillard givrant",
  51: "bruine légère",
  53: "bruine",
  55: "bruine dense",
  61: "pluie légère",
  63: "pluie",
  65: "forte pluie",
  71: "neige légère",
  73: "neige",
  75: "forte neige",
  80: "averses",
  81: "averses fortes",
  95: "orage",
  96: "orage avec grêle",
};

export async function getWeather(userId: string, city: string) {
  try {
    const geo = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr`
    ).then((r) => r.json());

    const place = geo?.results?.[0];
    if (!place) {
      return { ok: false, error: `Ville "${city}" introuvable` };
    }

    const weather = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
    ).then((r) => r.json());

    await logActivity({
      userId,
      agent: "research",
      action: "Météo consultée",
      detail: `${place.name}`,
    });

    return {
      ok: true,
      city: place.name,
      country: place.country,
      temperature: weather.current?.temperature_2m,
      condition: WEATHER_CODES[weather.current?.weather_code] ?? "conditions inconnues",
      humidity: weather.current?.relative_humidity_2m,
      windSpeed: weather.current?.wind_speed_10m,
      tempMax: weather.daily?.temperature_2m_max?.[0],
      tempMin: weather.daily?.temperature_2m_min?.[0],
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "erreur météo" };
  }
}
