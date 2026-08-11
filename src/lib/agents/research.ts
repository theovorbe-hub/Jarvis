import { searchProvider } from "@/lib/search/duckduckgo";
import { logActivity } from "@/lib/activity";

// RESEARCH agent — searches and synthesizes information from the web.
// JARVIS always distinguishes model knowledge from what this agent
// retrieves live (see the system prompt in lib/ai/tools.ts).

export async function webSearch(userId: string, query: string) {
  const results = await searchProvider.search(query, 5);
  await logActivity(userId, "Recherche web effectuée", "research", query, {
    query,
    resultCount: results.length,
  });
  return results;
}
