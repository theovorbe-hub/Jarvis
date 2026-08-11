import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { runAgent } from "@/lib/ai/agent";

const PROMPTS: Record<string, string> = {
  briefing:
    "Génère mon briefing du jour : résume mes tâches prioritaires, mes rappels à venir et tout ce qui mérite mon attention aujourd'hui.",
  priorities: "Prépare ma liste de priorités de la semaine à partir de mes tâches en cours.",
  file_analysis: "Analyse les documents que j'ai importés récemment et résume les points clés.",
  reminder: "Rappelle-moi l'objet de cette automatisation.",
  custom: "Exécute cette automatisation personnalisée.",
};

async function getOrCreateAutomationConversation(userId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { userId, title: "Automatisations JARVIS" },
    orderBy: { createdAt: "desc" },
  });
  if (existing) return existing.id;
  const created = await prisma.conversation.create({
    data: { userId, title: "Automatisations JARVIS" },
  });
  return created.id;
}

/** Executes a single automation now: runs its prompt through the agent and logs the result. */
export async function runAutomationNow(automationId: string) {
  const automation = await prisma.automation.findUnique({ where: { id: automationId } });
  if (!automation || !automation.enabled) return null;

  const conversationId = await getOrCreateAutomationConversation(automation.userId);
  const prompt =
    (automation.actionParams ? JSON.parse(automation.actionParams).prompt : null) ??
    PROMPTS[automation.actionType] ??
    automation.description ??
    automation.name;

  await prisma.message.create({
    data: {
      conversationId,
      role: "user",
      content: `[Automatisation « ${automation.name} »] ${prompt}`,
    },
  });

  const result = await runAgent({
    userId: automation.userId,
    conversationId,
    userMessage: prompt,
  });

  await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: result.text,
      toolCalls: result.toolCalls.length ? JSON.stringify(result.toolCalls) : null,
      sources: result.sources.length ? JSON.stringify(result.sources) : null,
    },
  });

  await prisma.automation.update({ where: { id: automation.id }, data: { lastRunAt: new Date() } });
  await logActivity(automation.userId, "automation", `Automatisation exécutée: ${automation.name}`, result.text.slice(0, 140));

  return result;
}
