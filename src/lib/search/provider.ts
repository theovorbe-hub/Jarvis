export interface SearchResult {
  title: string;
  url: string;
  source: string;
  snippet: string;
  date: string | null;
}

export interface SearchProvider {
  search(query: string, limit?: number): Promise<SearchResult[]>;
}
