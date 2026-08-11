import { anthropicProvider } from "./anthropic";
import type { AIProvider } from "./provider";

// Single switch point: change this line (or make it env-driven) to swap the
// entire AI backend without touching agents, tools, or routes.
export const ai: AIProvider = anthropicProvider;

export * from "./provider";
