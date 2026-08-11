import { AnthropicProvider } from "./anthropic";
import type { AIProvider } from "./provider";

let cached: AIProvider | null = null;

/**
 * Returns the configured AI provider. This is the only place that decides which
 * vendor SDK backs JARVIS's brain — everything else in the app depends only on
 * the AIProvider interface, so switching models is a one-line env change.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached;

  const providerName = process.env.AI_PROVIDER ?? "anthropic";
  const model = process.env.AI_MODEL ?? "claude-sonnet-4-5";

  switch (providerName) {
    case "anthropic":
    default: {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new AIConfigError(
          "ANTHROPIC_API_KEY manquante. Ajoutez-la dans votre fichier .env pour activer JARVIS."
        );
      }
      cached = new AnthropicProvider(apiKey, model);
      return cached;
    }
  }
}

export class AIConfigError extends Error {}

export * from "./provider";
