import Anthropic from "@anthropic-ai/sdk";
import type {
  AIChatParams,
  AIContentBlock,
  AIProvider,
  AIResponse,
  AIToolUseBlock,
} from "./provider";

let client: Anthropic | null = null;

function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY manquante. Ajoutez-la dans votre fichier .env pour activer JARVIS."
      );
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export class AnthropicProvider implements AIProvider {
  async chat(params: AIChatParams): Promise<AIResponse> {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: params.maxTokens ?? 1536,
      system: params.system,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: params.messages as any,
      tools: params.tools as Anthropic.Tool[] | undefined,
    });

    const content = response.content as unknown as AIContentBlock[];
    const toolUses = content.filter(
      (b): b is AIToolUseBlock => b.type === "tool_use"
    );
    const textOutput = content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return {
      content,
      stopReason: response.stop_reason,
      textOutput,
      toolUses,
    };
  }
}

export const anthropicProvider = new AnthropicProvider();
