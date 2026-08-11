import * as cheerio from "cheerio";
import type { SearchProvider, SearchResult } from "./provider";

// Scrapes DuckDuckGo's HTML-only endpoint. No API key required, which keeps
// web search functional out of the box. Swap this for a paid search API
// (Brave, Bing, Tavily, ...) by implementing SearchProvider and pointing
// lib/agents/research.ts at it, without touching any caller.
export class DuckDuckGoProvider implements SearchProvider {
  async search(query: string, limit = 5): Promise<SearchResult[]> {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; JarvisAssistant/1.0; +https://jarvis.local)",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Recherche web échouée (HTTP ${res.status}).`);
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: SearchResult[] = [];

    $(".result").each((_, el) => {
      if (results.length >= limit) return;
      const titleEl = $(el).find(".result__a").first();
      const title = titleEl.text().trim();
      let href = titleEl.attr("href") || "";
      const snippet = $(el).find(".result__snippet").first().text().trim();

      if (!title || !href) return;

      // DuckDuckGo's HTML endpoint wraps outbound links in a redirect;
      // unwrap it to get the real destination URL.
      if (href.startsWith("//")) href = "https:" + href;
      try {
        const parsed = new URL(href);
        const real = parsed.searchParams.get("uddg");
        if (real) href = decodeURIComponent(real);
      } catch {
        // keep href as-is
      }

      let source = "";
      try {
        source = new URL(href).hostname.replace(/^www\./, "");
      } catch {
        source = "web";
      }

      results.push({ title, url: href, source, snippet, date: null });
    });

    return results;
  }
}

export const searchProvider: SearchProvider = new DuckDuckGoProvider();
