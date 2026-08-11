import { prisma } from "@/lib/prisma";
import { ai } from "@/lib/ai";
import { logActivity } from "@/lib/activity";
import { getTodayPriorities } from "@/lib/agents/planner";
import { summarizeDocument } from "@/lib/agents/documents";
import type { Automation } from "@prisma/client";

// The concrete side effects behind each automation actionType. This is what
// actually runs when the scheduler fires a cron automation, or when an
// event-triggered automation matches.

async function runBriefing(automation: Automation) {
  const { tasks, reminders } = await getTodayPriorities(automation.userId);
  const response = await ai.chat({
    system:
      "Tu es JARVIS. Rédige un briefing matinal bref (4-6 lignes), élégant et motivant, " +
      "en français, à partir des tâches et rappels fournis en JSON. Si tout est vide, dis " +
      "simplement que la journée est dégagée.",
    messages: [
      {
        role: "user",
        content: JSON.stringify({ tasks, reminders }),
      },
    ],
    maxTokens: 400,
  });
  await logActivity(
    automation.userId,
    `Briefing automatique : « ${automation.name} »`,
    "automation",
    response.textOutput
  );
}

async function runPriorities(automation: Automation) {
  const { tasks } = await getTodayPriorities(automation.userId);
  const summary = tasks.length
    ? tasks.map((t) => `• ${t.title} (${t.priority})`).join("\n")
    : "Aucune tâche en attente.";
  await logActivity(
    automation.userId,
    `Priorités générées : « ${automation.name} »`,
    "automation",
    summary
  );
}

async function runReminder(automation: Automation) {
  const input = automation.actionInput ? JSON.parse(automation.actionInput) : {};
  const text = input.text || automation.description || automation.name;
  await prisma.reminder.create({
    data: { userId: automation.userId, text, remindAt: new Date() },
  });
  await logActivity(automation.userId, `Rappel déclenché : « ${text} »`, "automation");
}

async function runAnalyzeFile(automation: Automation, context?: { fileId?: string }) {
  const fileId = context?.fileId;
  if (!fileId) return;
  await summarizeDocument(automation.userId, fileId);
}

export async function executeAutomation(automation: Automation, context?: { fileId?: string }) {
  switch (automation.actionType) {
    case "briefing":
      await runBriefing(automation);
      break;
    case "priorities":
      await runPriorities(automation);
      break;
    case "reminder":
      await runReminder(automation);
      break;
    case "analyze_file":
      await runAnalyzeFile(automation, context);
      break;
    default:
      return;
  }
  await prisma.automation.update({
    where: { id: automation.id },
    data: { lastRunAt: new Date() },
  });
}

/** Runs every enabled event-triggered automation matching `event` for a user. */
export async function triggerEventAutomations(
  userId: string,
  event: string,
  context?: { fileId?: string }
) {
  const automations = await prisma.automation.findMany({
    where: { userId, trigger: "event", event, enabled: true },
  });
  for (const automation of automations) {
    await executeAutomation(automation, context).catch((err) =>
      console.error(`[automation] échec de "${automation.name}":`, err)
    );
  }
}
