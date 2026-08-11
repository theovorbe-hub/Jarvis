import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getWeather } from "@/lib/weather";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [weather, tasks, reminders, activity, connections, automations] = await Promise.all([
    getWeather(),
    prisma.task.findMany({
      where: { userId: user.id, done: false },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 8,
    }),
    prisma.reminder.findMany({
      where: { userId: user.id, done: false, remindAt: { lte: endOfDay } },
      orderBy: { remindAt: "asc" },
      take: 8,
    }),
    prisma.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.connection.findMany({ where: { userId: user.id } }),
    prisma.automation.findMany({ where: { userId: user.id } }),
  ]);

  return NextResponse.json({
    now: now.toISOString(),
    weather,
    tasks,
    reminders,
    activity,
    connections,
    automations,
  });
}
