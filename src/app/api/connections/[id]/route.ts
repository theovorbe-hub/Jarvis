import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const schema = z.object({ status: z.enum(["connected", "disconnected"]) });

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const existing = await prisma.connection.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const connection = await prisma.connection.update({
    where: { id: params.id },
    data: {
      status: parsed.data.status,
      connectedAt: parsed.data.status === "connected" ? new Date() : null,
    },
  });
  await logActivity(
    user.id,
    "security",
    parsed.data.status === "connected" ? "Intégration connectée" : "Intégration déconnectée",
    connection.label
  );
  return NextResponse.json({ connection });
}
