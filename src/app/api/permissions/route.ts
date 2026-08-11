import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultPermissions } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  await ensureDefaultPermissions(userId);
  const permissions = await prisma.permission.findMany({
    where: { userId },
    orderBy: { capability: "asc" },
  });
  return NextResponse.json({ permissions });
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.capability || typeof body?.granted !== "boolean") {
    return NextResponse.json({ error: "Champs 'capability' et 'granted' requis." }, { status: 400 });
  }

  const permission = await prisma.permission.update({
    where: { userId_capability: { userId, capability: body.capability } },
    data: {
      granted: body.granted,
      grantedAt: body.granted ? new Date() : undefined,
      revokedAt: !body.granted ? new Date() : null,
    },
  });

  await logActivity(
    userId,
    `Permission « ${permission.label} » ${body.granted ? "accordée" : "révoquée"}`,
    "permission"
  );

  return NextResponse.json({ permission });
}
