import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getWeather } from "@/lib/agents/research";
import { isAIConfigured } from "@/lib/ai/client";
import { isSearchConfigured } from "@/lib/agents/research";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const [settings, tasks, reminders, activity, filesCount, connections] = await Promise.all([
    db.userSettings.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }),
    db.task.findMany({
      where: { userId: user.id, status: { not: "done" } },
      orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
      take: 6,
    }),
    db.reminder.findMany({
      where: { userId: user.id, done: false, remindAt: { gte: new Date(Date.now() - 1000 * 60 * 60) } },
      orderBy: { remindAt: "asc" },
      take: 6,
    }),
    db.activityLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.fileAsset.count({ where: { userId: user.id } }),
    db.connection.findMany({ where: { userId: user.id } }),
  ]);

  const weather = settings.city ? await getWeather(user.id, settings.city) : null;

  return NextResponse.json({
    city: settings.city,
    weather,
    tasks,
    reminders,
    activity,
    filesCount,
    connections,
    services: {
      ai: isAIConfigured(),
      search: isSearchConfigured(),
    },
  });
}
