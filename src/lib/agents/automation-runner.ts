import { db } from "@/lib/db";
import type { Automation } from "@/generated/prisma";
import { logActivity } from "@/lib/activity";
import { getWeather } from "@/lib/agents/research";

async function buildDailyBriefing(userId: string) {
  const [settings, tasks, reminders] = await Promise.all([
    db.userSettings.findUnique({ where: { userId } }),
    db.task.findMany({ where: { userId, status: { not: "done" } }, orderBy: [{ priority: "desc" }], take: 5 }),
    db.reminder.findMany({
      where: { userId, done: false, remindAt: { gte: new Date(), lte: new Date(Date.now() + 24 * 3600 * 1000) } },
      orderBy: { remindAt: "asc" },
    }),
  ]);

  const lines: string[] = ["☀️ Voici votre briefing du jour."];

  if (settings?.city) {
    const weather = await getWeather(userId, settings.city);
    if (weather.ok) {
      lines.push(`Météo à ${weather.city} : ${weather.condition}, ${Math.round(weather.temperature ?? 0)}°C.`);
    }
  }

  if (tasks.length > 0) {
    lines.push(`Priorités du jour : ${tasks.map((t) => t.title).join(", ")}.`);
  } else {
    lines.push("Aucune tâche prioritaire en attente.");
  }

  if (reminders.length > 0) {
    lines.push(
      `Rappels dans les 24h : ${reminders
        .map((r) => `${r.title} (${r.remindAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })})`)
        .join(", ")}.`
    );
  }

  return lines.join(" ");
}

async function buildPriorityList(userId: string) {
  const tasks = await db.task.findMany({
    where: { userId, status: { not: "done" } },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
    take: 7,
  });
  if (tasks.length === 0) return "Aucune tâche en attente cette semaine.";
  const list = tasks.map((t, i) => `${i + 1}. ${t.title}${t.dueDate ? ` (échéance ${t.dueDate.toLocaleDateString("fr-FR")})` : ""}`);
  return `Voici vos priorités : \n${list.join("\n")}`;
}

export async function runAutomation(automation: Automation) {
  const userId = automation.userId;
  let content: string;

  switch (automation.action) {
    case "daily_briefing":
      content = await buildDailyBriefing(userId);
      break;
    case "priority_list":
      content = await buildPriorityList(userId);
      break;
    case "reminder_ping": {
      const cfg = safeParse(automation.actionConfig);
      content = `⏰ Rappel automatique : ${cfg.message ?? automation.name}`;
      break;
    }
    case "custom_note":
    default: {
      const cfg = safeParse(automation.actionConfig);
      content = cfg.message ?? automation.description ?? automation.name;
    }
  }

  let conversation = await db.conversation.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } });
  if (!conversation) {
    conversation = await db.conversation.create({ data: { userId, title: "Automatisations" } });
  }

  await db.message.create({
    data: { conversationId: conversation.id, role: "assistant", content },
  });
  await db.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  await db.automation.update({ where: { id: automation.id }, data: { lastRunAt: new Date() } });

  await logActivity({
    userId,
    agent: "automation",
    action: `Automatisation exécutée : ${automation.name}`,
    detail: content.slice(0, 160),
  });
}

function safeParse(json: string | null): { message?: string } {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
