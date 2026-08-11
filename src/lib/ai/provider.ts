/**
 * Model-agnostic AI provider interface. Every concrete provider (Anthropic today,
 * OpenAI/others tomorrow) implements this shape so the rest of the app never talks
 * to a vendor SDK directly. Swap providers via AI_PROVIDER without touching callers.
 */

export type ChatRole = "user" | "assistant" | "system" | "tool";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface TextBlock {
  type: "text";
  text: string;
}

export type ContentBlock = TextBlock | ToolUseBlock;

export interface ImageInput {
  mimeType: string;
  base64: string;
}

export interface ProviderMessage {
  role: ChatRole;
  content: string | ContentBlock[];
  toolUseId?: string; // for role "tool": which tool_use this responds to
  images?: ImageInput[];
}

export interface CompletionRequest {
  system: string;
  messages: ProviderMessage[];
  tools?: ToolDefinition[];
  maxTokens?: number;
}

export interface CompletionResult {
  content: ContentBlock[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | string;
  text: string;
}

export interface AIProvider {
  complete(req: CompletionRequest): Promise<CompletionResult>;
  describeImage(image: ImageInput, prompt: string): Promise<string>;
}
