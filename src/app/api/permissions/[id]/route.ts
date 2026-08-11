import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const schema = z.object({ granted: z.boolean() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/permissions/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.permission.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const permission = await db.permission.update({ where: { id }, data: { granted: parsed.data.granted } });

  await logActivity({
    userId: user.id,
    agent: "core",
    action: parsed.data.granted ? "Permission accordée" : "Permission révoquée",
    detail: permission.label,
  });

  return NextResponse.json({ permission });
}
