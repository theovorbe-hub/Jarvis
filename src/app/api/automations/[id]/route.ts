import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().trim().min(1).max(120).optional(),
  cron: z.string().trim().min(1).optional(),
});

export async function PATCH(request: Request, ctx: RouteContext<"/api/automations/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.automation.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const automation = await db.automation.update({
    where: { id },
    data: {
      enabled: parsed.data.enabled,
      name: parsed.data.name,
      trigger: parsed.data.cron,
    },
  });

  if (parsed.data.enabled !== undefined) {
    await logActivity({
      userId: user.id,
      agent: "automation",
      action: parsed.data.enabled ? "Automatisation activée" : "Automatisation désactivée",
      detail: automation.name,
    });
  }

  return NextResponse.json({ automation });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/automations/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const existing = await db.automation.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await db.automation.delete({ where: { id } });
  await logActivity({ userId: user.id, agent: "automation", action: "Automatisation supprimée", detail: existing.name });

  return NextResponse.json({ ok: true });
}
