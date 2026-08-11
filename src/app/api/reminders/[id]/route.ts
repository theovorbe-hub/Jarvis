import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  remindAt: z.string().optional(),
  done: z.boolean().optional(),
  recurring: z.enum(["daily", "weekly", "monthly"]).nullable().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/reminders/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.reminder.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const reminder = await db.reminder.update({
    where: { id },
    data: {
      ...parsed.data,
      remindAt: parsed.data.remindAt ? new Date(parsed.data.remindAt) : undefined,
    },
  });

  return NextResponse.json({ reminder });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/reminders/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.reminder.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.reminder.delete({ where: { id } });
  await logActivity({ userId: user.id, agent: "planner", action: "Rappel supprimé", detail: existing.title });

  return NextResponse.json({ ok: true });
}
