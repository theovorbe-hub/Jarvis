import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai";
import type { ContentBlock, ImageInput, ProviderMessage } from "@/lib/ai/provider";
import { TOOL_DEFINITIONS, executeTool } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/systemPrompt";

const MAX_TOOL_ITERATIONS = 5;
const HISTORY_LIMIT = 16;

export interface AgentResult {
  text: string;
  toolCalls: { name: string; input: Record<string, unknown>; result: unknown }[];
  sources: { title: string; url: string; source: string }[];
}

export async function runAgent(opts: {
  userId: string;
  userName?: string | null;
  conversationId: string;
  userMessage: string;
  images?: ImageInput[];
}): Promise<AgentResult> {
  const { userId, userName, conversationId, userMessage, images } = opts;
  const provider = getAIProvider();

  const [recentMemories, history] = await Promise.all([
    prisma.memory.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 15 }),
    prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: HISTORY_LIMIT,
    }),
  ]);

  const memorySnapshot = recentMemories.map((m) => `- [${m.category}] ${m.title}: ${m.content}`).join("\n");
  const system = buildSystemPrompt({ userName, now: new Date(), memorySnapshot });

  const messages: ProviderMessage[] = history.map((m) => ({
    role: m.role as ProviderMessage["role"],
    content: m.content,
  }));
  messages.push({ role: "user", content: userMessage, images });

  const toolCalls: AgentResult["toolCalls"] = [];
  const sources: AgentResult["sources"] = [];

  let finalText = "";
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const result = await provider.complete({
      system,
      messages,
      tools: TOOL_DEFINITIONS,
      maxTokens: 2048,
    });

    if (result.stopReason !== "tool_use") {
      finalText = result.text;
      break;
    }

    messages.push({ role: "assistant", content: result.content });

    const toolUseBlocks = result.content.filter(
      (b): b is Extract<ContentBlock, { type: "tool_use" }> => b.type === "tool_use"
    );

    for (const block of toolUseBlocks) {
      const toolResult = await executeTool(block.name, block.input, { userId });
      toolCalls.push({ name: block.name, input: block.input, result: toolResult });

      if (
        block.name === "web_search" &&
        toolResult &&
        typeof toolResult === "object" &&
        "results" in toolResult
      ) {
        const results = (toolResult as { results: { title: string; url: string; source: string }[] }).results;
        for (const r of results) sources.push({ title: r.title, url: r.url, source: r.source });
      }

      messages.push({
        role: "tool",
        content: JSON.stringify(toolResult),
        toolUseId: block.id,
      });
    }

    if (result.text) finalText = result.text;
  }

  if (!finalText) {
    finalText =
      "J'ai bien traité votre demande, mais je n'ai pas pu formuler de réponse finale. Pouvez-vous reformuler ?";
  }

  return { text: finalText, toolCalls, sources };
}
