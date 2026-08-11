// Thin abstraction over "some LLM that supports tool use". Swapping models
// or providers (Anthropic, OpenAI, a local model, ...) only requires a new
// implementation of AIProvider — nothing in the agents, tools, or chat route
// needs to change.

export type AIRole = "user" | "assistant";

export interface AITextBlock {
  type: "text";
  text: string;
}

export interface AIImageBlock {
  type: "image";
  source: { type: "base64"; media_type: string; data: string };
}

export interface AIToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AIToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type AIContentBlock = AITextBlock | AIImageBlock | AIToolUseBlock | AIToolResultBlock;

export interface AIMessage {
  role: AIRole;
  content: string | AIContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AIResponse {
  content: AIContentBlock[];
  stopReason: string | null;
  textOutput: string;
  toolUses: AIToolUseBlock[];
}

export interface AIChatParams {
  system: string;
  messages: AIMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
}

export interface AIProvider {
  chat(params: AIChatParams): Promise<AIResponse>;
}
