import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  content: z.string().trim().min(1).max(4000).optional(),
  category: z.string().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/memories/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.memory.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const memory = await db.memory.update({ where: { id }, data: parsed.data });
  await logActivity({ userId: user.id, agent: "memory", action: "Souvenir modifié", detail: memory.title });

  return NextResponse.json({ memory });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/memories/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.memory.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.memory.delete({ where: { id } });
  await logActivity({ userId: user.id, agent: "memory", action: "Souvenir supprimé", detail: existing.title });

  return NextResponse.json({ ok: true });
}
