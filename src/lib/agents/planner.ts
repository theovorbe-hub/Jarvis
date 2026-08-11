import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function createTask(
  userId: string,
  input: { title: string; description?: string; priority?: string; dueDate?: string }
) {
  const task = await db.task.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      priority: input.priority ?? "normal",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
  });
  await logActivity({ userId, agent: "planner", action: "Tâche créée", detail: task.title });
  return task;
}

export async function updateTask(
  userId: string,
  input: { id: string; title?: string; status?: string; priority?: string; dueDate?: string }
) {
  const existing = await db.task.findFirst({ where: { id: input.id, userId } });
  if (!existing) return { ok: false, error: "Tâche introuvable" };
  const task = await db.task.update({
    where: { id: input.id },
    data: {
      title: input.title,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
  });
  await logActivity({ userId, agent: "planner", action: "Tâche mise à jour", detail: task.title });
  return { ok: true, task };
}

export async function listTasks(userId: string, status?: string) {
  return db.task.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });
}

export async function deleteTask(userId: string, id: string) {
  const task = await db.task.findFirst({ where: { id, userId } });
  if (!task) return { ok: false, error: "Tâche introuvable" };
  await db.task.delete({ where: { id } });
  await logActivity({ userId, agent: "planner", action: "Tâche supprimée", detail: task.title });
  return { ok: true };
}

export async function createReminder(
  userId: string,
  input: { title: string; remindAt: string; recurring?: string }
) {
  const reminder = await db.reminder.create({
    data: {
      userId,
      title: input.title,
      remindAt: new Date(input.remindAt),
      recurring: input.recurring,
    },
  });
  await logActivity({ userId, agent: "planner", action: "Rappel créé", detail: `${reminder.title} — ${reminder.remindAt.toLocaleString("fr-FR")}` });
  return reminder;
}

export async function listReminders(userId: string) {
  return db.reminder.findMany({ where: { userId }, orderBy: { remindAt: "asc" } });
}

export async function deleteReminder(userId: string, id: string) {
  const reminder = await db.reminder.findFirst({ where: { id, userId } });
  if (!reminder) return { ok: false, error: "Rappel introuvable" };
  await db.reminder.delete({ where: { id } });
  await logActivity({ userId, agent: "planner", action: "Rappel supprimé", detail: reminder.title });
  return { ok: true };
}
