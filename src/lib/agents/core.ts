import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropicClient, MODEL, isAIConfigured } from "@/lib/ai/client";
import { JARVIS_TOOLS } from "@/lib/ai/tools";
import { buildSystemPrompt } from "@/lib/ai/personality";
import * as memoryAgent from "@/lib/agents/memory";
import * as planner from "@/lib/agents/planner";
import * as research from "@/lib/agents/research";
import * as automation from "@/lib/agents/automation";
import * as documents from "@/lib/agents/documents";
import type { SearchResult } from "@/lib/agents/research";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ExecutedAction = {
  tool: string;
  input: Record<string, unknown>;
  summary: string;
};

export type JarvisResult = {
  reply: string;
  actions: ExecutedAction[];
  sources: SearchResult[];
};

const MAX_TOOL_ITERATIONS = 6;

export async function runJarvis(params: {
  userId: string;
  userName: string;
  history: ChatTurn[];
  userMessage: string;
}): Promise<JarvisResult> {
  if (!isAIConfigured()) {
    return {
      reply:
        "Ma connexion à mon moteur de réflexion n'est pas configurée. Ajoutez une clé ANTHROPIC_API_KEY dans le fichier .env du serveur pour m'activer pleinement.",
      actions: [],
      sources: [],
    };
  }

  const client = getAnthropicClient();
  const memoriesSummary = await memoryAgent.memoriesSummaryForPrompt(params.userId);
  const system = buildSystemPrompt({
    userName: params.userName,
    nowISO: new Date().toString(),
    memoriesSummary,
  });

  const messages: Anthropic.MessageParam[] = [
    ...params.history.map((h) => ({ role: h.role, content: h.content }) as Anthropic.MessageParam),
    { role: "user", content: params.userMessage },
  ];

  const actions: ExecutedAction[] = [];
  const sources: SearchResult[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1536,
      system,
      tools: JARVIS_TOOLS,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (response.stop_reason !== "tool_use" || toolUseBlocks.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: text || "…", actions, sources };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const block of toolUseBlocks) {
      const { resultText, summary, resultSources } = await executeTool(
        params.userId,
        block.name,
        (block.input ?? {}) as Record<string, unknown>
      );
      actions.push({ tool: block.name, input: block.input as Record<string, unknown>, summary });
      if (resultSources) sources.push(...resultSources);
      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: resultText });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return {
    reply: "J'ai effectué plusieurs actions mais je n'ai pas pu conclure. Pouvez-vous reformuler votre demande ?",
    actions,
    sources,
  };
}

async function executeTool(
  userId: string,
  name: string,
  input: Record<string, unknown>
): Promise<{ resultText: string; summary: string; resultSources?: SearchResult[] }> {
  try {
    switch (name) {
      case "remember": {
        const r = await memoryAgent.remember(userId, input as { title: string; content: string; category?: string });
        return { resultText: JSON.stringify(r), summary: `Souvenir enregistré : ${input.title}` };
      }
      case "recall_memories": {
        const r = await memoryAgent.recallMemories(userId, String(input.query ?? ""));
        return { resultText: JSON.stringify(r), summary: `Recherche mémoire : "${input.query}"` };
      }
      case "list_memories": {
        const r = await memoryAgent.listMemories(userId, input.category as string | undefined);
        return { resultText: JSON.stringify(r), summary: "Consultation de la mémoire" };
      }
      case "delete_memory": {
        const r = await memoryAgent.deleteMemory(userId, String(input.id));
        return { resultText: JSON.stringify(r), summary: "Souvenir supprimé" };
      }
      case "create_task": {
        const r = await planner.createTask(userId, input as { title: string; description?: string; priority?: string; dueDate?: string });
        return { resultText: JSON.stringify(r), summary: `Tâche créée : ${input.title}` };
      }
      case "update_task": {
        const r = await planner.updateTask(userId, input as { id: string; title?: string; status?: string; priority?: string; dueDate?: string });
        return { resultText: JSON.stringify(r), summary: "Tâche mise à jour" };
      }
      case "list_tasks": {
        const r = await planner.listTasks(userId, input.status as string | undefined);
        return { resultText: JSON.stringify(r), summary: "Consultation des tâches" };
      }
      case "delete_task": {
        const r = await planner.deleteTask(userId, String(input.id));
        return { resultText: JSON.stringify(r), summary: "Tâche supprimée" };
      }
      case "create_reminder": {
        const r = await planner.createReminder(userId, input as { title: string; remindAt: string; recurring?: string });
        return { resultText: JSON.stringify(r), summary: `Rappel créé : ${input.title}` };
      }
      case "list_reminders": {
        const r = await planner.listReminders(userId);
        return { resultText: JSON.stringify(r), summary: "Consultation des rappels" };
      }
      case "delete_reminder": {
        const r = await planner.deleteReminder(userId, String(input.id));
        return { resultText: JSON.stringify(r), summary: "Rappel supprimé" };
      }
      case "web_search": {
        const query = String(input.query ?? "");
        const r = await research.webSearch(userId, query);
        const summary = r.configured
          ? `Recherche web : "${query}" (${r.results.length} résultats)`
          : `Recherche web demandée mais non configurée (clé TAVILY_API_KEY manquante)`;
        return {
          resultText: r.configured
            ? JSON.stringify(r.results)
            : "La recherche web n'est pas configurée sur ce serveur (TAVILY_API_KEY manquante). Informe l'utilisateur que tu ne peux pas accéder à Internet pour cette question et réponds avec tes connaissances générales en le précisant clairement.",
          summary,
          resultSources: r.results,
        };
      }
      case "get_weather": {
        const r = await research.getWeather(userId, String(input.city ?? ""));
        return { resultText: JSON.stringify(r), summary: `Météo consultée pour ${input.city}` };
      }
      case "create_automation": {
        const r = await automation.createAutomation(userId, input as { name: string; description?: string; cron: string; action: string; actionConfig?: string });
        return { resultText: JSON.stringify(r), summary: `Automatisation créée : ${input.name}` };
      }
      case "list_automations": {
        const r = await automation.listAutomations(userId);
        return { resultText: JSON.stringify(r), summary: "Consultation des automatisations" };
      }
      case "toggle_automation": {
        const r = await automation.toggleAutomation(userId, String(input.id), Boolean(input.enabled));
        return { resultText: JSON.stringify(r), summary: "Automatisation modifiée" };
      }
      case "list_files": {
        const r = await documents.listFiles(userId);
        return { resultText: JSON.stringify(r), summary: "Consultation des fichiers" };
      }
      default:
        return { resultText: `Outil inconnu: ${name}`, summary: `Outil inconnu: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "erreur inconnue";
    return { resultText: `Erreur: ${message}`, summary: `Erreur lors de l'exécution de ${name}` };
  }
}
