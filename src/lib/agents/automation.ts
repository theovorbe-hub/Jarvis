import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

// AUTOMATION agent — CRUD for scheduled/event-driven rules, plus the actual
// execution logic run by the in-process scheduler (see lib/automation/scheduler.ts).

export async function createAutomation(
  userId: string,
  input: {
    name: string;
    description?: string;
    trigger: "cron" | "event";
    schedule?: string;
    event?: string;
    actionType: string;
    actionInput?: Record<string, unknown>;
  }
) {
  const automation = await prisma.automation.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      trigger: input.trigger,
      schedule: input.schedule,
      event: input.event,
      actionType: input.actionType,
      actionInput: input.actionInput ? JSON.stringify(input.actionInput) : null,
    },
  });
  await logActivity(userId, `Automatisation créée : « ${input.name} »`, "automation");
  return automation;
}

export async function listAutomations(userId: string) {
  return prisma.automation.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function toggleAutomation(userId: string, id: string, enabled: boolean) {
  const result = await prisma.automation.updateMany({ where: { id, userId }, data: { enabled } });
  if (result.count > 0) {
    await logActivity(userId, `Automatisation ${enabled ? "activée" : "désactivée"}`, "automation");
  }
  return result;
}

export async function deleteAutomation(userId: string, id: string) {
  return prisma.automation.deleteMany({ where: { id, userId } });
}
