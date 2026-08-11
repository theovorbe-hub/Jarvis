import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  priority: z.enum(["low", "normal", "high"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  dueDate: z.string().nullable().optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const task = await db.task.update({
    where: { id },
    data: {
      ...parsed.data,
      dueDate: parsed.data.dueDate === undefined ? undefined : parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });

  await logActivity({ userId: user.id, agent: "planner", action: "Tâche mise à jour", detail: task.title });

  return NextResponse.json({ task });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/tasks/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.task.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.task.delete({ where: { id } });
  await logActivity({ userId: user.id, agent: "planner", action: "Tâche supprimée", detail: existing.title });

  return NextResponse.json({ ok: true });
}
