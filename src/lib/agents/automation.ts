import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const VALID_ACTIONS = ["daily_briefing", "priority_list", "reminder_ping", "custom_note"] as const;

export async function createAutomation(
  userId: string,
  input: { name: string; description?: string; cron: string; action: string; actionConfig?: string }
) {
  if (!VALID_ACTIONS.includes(input.action as (typeof VALID_ACTIONS)[number])) {
    return { ok: false, error: `Action inconnue: ${input.action}` };
  }
  const automation = await db.automation.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      trigger: input.cron,
      triggerType: "schedule",
      action: input.action,
      actionConfig: input.actionConfig,
      enabled: true,
    },
  });
  await logActivity({ userId, agent: "automation", action: "Automatisation créée", detail: automation.name });
  return { ok: true, automation };
}

export async function listAutomations(userId: string) {
  return db.automation.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function toggleAutomation(userId: string, id: string, enabled: boolean) {
  const existing = await db.automation.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "Automatisation introuvable" };
  const automation = await db.automation.update({ where: { id }, data: { enabled } });
  await logActivity({
    userId,
    agent: "automation",
    action: enabled ? "Automatisation activée" : "Automatisation désactivée",
    detail: automation.name,
  });
  return { ok: true, automation };
}

export async function deleteAutomation(userId: string, id: string) {
  const existing = await db.automation.findFirst({ where: { id, userId } });
  if (!existing) return { ok: false, error: "Automatisation introuvable" };
  await db.automation.delete({ where: { id } });
  await logActivity({ userId, agent: "automation", action: "Automatisation supprimée", detail: existing.name });
  return { ok: true };
}
