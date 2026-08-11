import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { CONNECTION_PROVIDERS } from "@/lib/permissions";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const connections = await db.connection.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ connections, catalog: CONNECTION_PROVIDERS });
}

const schema = z.object({
  provider: z.string(),
  label: z.string().trim().min(1).max(120),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Le consentement explicite est requis pour créer une connexion." }, { status: 400 });
  }

  const connection = await db.connection.create({
    data: {
      userId: user.id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      status: "connected",
      connectedAt: new Date(),
    },
  });

  await logActivity({ userId: user.id, agent: "core", action: "Service connecté", detail: connection.label });

  return NextResponse.json({ connection });
}
