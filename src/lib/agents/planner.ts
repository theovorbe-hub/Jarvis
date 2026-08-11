import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

// PLANNER agent — tasks, reminders, priorities, "organise my day".

export async function createTask(
  userId: string,
  title: string,
  opts: { description?: string; priority?: string; dueAt?: string } = {}
) {
  const task = await prisma.task.create({
    data: {
      userId,
      title,
      description: opts.description,
      priority: opts.priority ?? "normal",
      dueAt: opts.dueAt ? new Date(opts.dueAt) : null,
    },
  });
  await logActivity(userId, `Tâche créée : « ${title} »`, "task");
  return task;
}

export async function listTasks(userId: string, status?: string) {
  return prisma.task.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateTaskStatus(userId: string, id: string, status: string) {
  const task = await prisma.task.updateMany({
    where: { id, userId },
    data: { status },
  });
  if (task.count > 0) {
    await logActivity(userId, `Tâche mise à jour (${status})`, "task");
  }
  return task;
}

export async function createReminder(userId: string, text: string, remindAt: string) {
  const reminder = await prisma.reminder.create({
    data: { userId, text, remindAt: new Date(remindAt) },
  });
  await logActivity(userId, `Rappel créé : « ${text} »`, "reminder");
  return reminder;
}

export async function listReminders(userId: string, includeDone = false) {
  return prisma.reminder.findMany({
    where: { userId, ...(includeDone ? {} : { done: false }) },
    orderBy: { remindAt: "asc" },
  });
}

export async function completeReminder(userId: string, id: string) {
  return prisma.reminder.updateMany({ where: { id, userId }, data: { done: true } });
}

export async function getTodayPriorities(userId: string) {
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [tasks, reminders] = await Promise.all([
    prisma.task.findMany({
      where: { userId, status: { not: "done" } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }],
      take: 5,
    }),
    prisma.reminder.findMany({
      where: { userId, done: false, remindAt: { lte: endOfDay } },
      orderBy: { remindAt: "asc" },
      take: 5,
    }),
  ]);

  return { tasks, reminders };
}
