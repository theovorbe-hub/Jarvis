import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProvider,
  CompletionRequest,
  CompletionResult,
  ContentBlock,
  ImageInput,
  ProviderMessage,
} from "./provider";

type AnthropicContentBlockParam = Anthropic.MessageParam["content"] extends string | Array<infer T> ? T : never;

function toAnthropicMessages(messages: ProviderMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: m.toolUseId!,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          },
        ],
      } as Anthropic.MessageParam;
    }

    if (typeof m.content === "string") {
      const blocks: AnthropicContentBlockParam[] = [];
      if (m.images?.length) {
        for (const img of m.images) {
          blocks.push({
            type: "image",
            source: { type: "base64", media_type: img.mimeType as never, data: img.base64 },
          });
        }
      }
      blocks.push({ type: "text", text: m.content });
      return { role: m.role === "assistant" ? "assistant" : "user", content: blocks };
    }

    return {
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content.map((b) =>
        b.type === "text"
          ? { type: "text", text: b.text }
          : { type: "tool_use", id: b.id, name: b.name, input: b.input }
      ) as AnthropicContentBlockParam[],
    };
  });
}

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 2048,
      system: req.system,
      messages: toAnthropicMessages(req.messages),
      tools: req.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
      })),
    });

    const content: ContentBlock[] = response.content.map((block) => {
      if (block.type === "text") return { type: "text", text: block.text };
      return {
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      };
    });

    const text = content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return { content, stopReason: response.stop_reason ?? "end_turn", text };
  }

  async describeImage(image: ImageInput, prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: image.mimeType as never, data: image.base64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
}
