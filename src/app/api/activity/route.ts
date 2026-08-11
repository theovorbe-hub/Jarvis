import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const limit = Number(new URL(req.url).searchParams.get("limit") ?? 20);
  const logs = await prisma.activityLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
  return NextResponse.json({ logs });
}
