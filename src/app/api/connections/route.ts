import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureDefaultConnections } from "@/lib/connections";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  await ensureDefaultConnections(userId);
  const connections = await prisma.connection.findMany({
    where: { userId },
    orderBy: { provider: "asc" },
  });
  return NextResponse.json({ connections });
}

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.provider || typeof body?.connect !== "boolean") {
    return NextResponse.json({ error: "Champs 'provider' et 'connect' requis." }, { status: 400 });
  }

  const connection = await prisma.connection.findFirst({ where: { userId, provider: body.provider } });
  if (!connection) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const updated = await prisma.connection.update({
    where: { id: connection.id },
    data: {
      status: body.connect ? "connected" : "disconnected",
      connectedAt: body.connect ? new Date() : null,
    },
  });

  await logActivity(
    userId,
    `Intégration « ${connection.label} » ${body.connect ? "connectée" : "déconnectée"}`,
    "permission"
  );

  return NextResponse.json({ connection: updated });
}
