export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  date?: string;
}

/**
 * Pluggable web search. Uses Tavily when TAVILY_API_KEY is configured (better quality,
 * structured results); otherwise falls back to a keyless DuckDuckGo HTML search so the
 * feature works out of the box with zero API keys.
 */
export async function webSearch(query: string): Promise<SearchResult[]> {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    return searchTavily(query, tavilyKey);
  }
  return searchDuckDuckGo(query);
}

async function searchTavily(query: string, apiKey: string): Promise<SearchResult[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: 5,
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily search failed: ${res.status}`);
  const data = await res.json();
  return (data.results ?? []).map(
    (r: { title: string; url: string; content: string; published_date?: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 400) ?? "",
      source: safeHostname(r.url),
      date: r.published_date,
    })
  );
}

async function searchDuckDuckGo(query: string): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`DuckDuckGo search failed: ${res.status}`);
  const html = await res.text();

  const results: SearchResult[] = [];
  const blockRegex = /<a rel="nofollow" class="result__a"[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g;
  const snippetRegex = /<a class="result__snippet"[^>]*>(.*?)<\/a>/g;

  const links: { url: string; title: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(html)) && links.length < 5) {
    links.push({ url: decodeDuckUrl(match[1]), title: stripTags(match[2]) });
  }

  const snippets: string[] = [];
  while ((match = snippetRegex.exec(html)) && snippets.length < 5) {
    snippets.push(stripTags(match[1]));
  }

  for (let i = 0; i < links.length; i++) {
    results.push({
      title: links[i].title,
      url: links[i].url,
      snippet: snippets[i] ?? "",
      source: safeHostname(links[i].url),
    });
  }

  return results;
}

function decodeDuckUrl(href: string): string {
  try {
    const u = new URL(href, "https://duckduckgo.com");
    const real = u.searchParams.get("uddg");
    return real ? decodeURIComponent(real) : href;
  } catch {
    return href;
  }
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
