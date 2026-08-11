import { NextResponse } from "next/server";
import { requireUserId, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getWeather } from "@/lib/weather";
import { getTodayPriorities } from "@/lib/agents/planner";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const [priorities, connections, activity, filesCount, memoriesCount] = await Promise.all([
    getTodayPriorities(userId),
    prisma.connection.findMany({ where: { userId } }),
    prisma.activityLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.fileAsset.count({ where: { userId } }),
    prisma.memory.count({ where: { userId } }),
  ]);

  const weather = await getWeather(
    user.latitude ?? 48.8566,
    user.longitude ?? 2.3522,
    user.city ?? "Paris"
  );

  return NextResponse.json({
    now: new Date().toISOString(),
    weather,
    priorities,
    connections,
    activity,
    stats: { filesCount, memoriesCount },
  });
}
