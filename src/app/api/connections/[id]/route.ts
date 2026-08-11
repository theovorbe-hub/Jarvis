import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/connections/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.connection.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.connection.delete({ where: { id } });
  await logActivity({ userId: user.id, agent: "core", action: "Accès révoqué", detail: existing.label });

  return NextResponse.json({ ok: true });
}
