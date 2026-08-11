import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  name: z.string().optional(),
  schedule: z.string().optional(),
  frequencyLabel: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const existing = await prisma.automation.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const automation = await prisma.automation.update({ where: { id: params.id }, data: parsed.data });
  if (parsed.data.enabled !== undefined) {
    await logActivity(
      user.id,
      "automation",
      automation.enabled ? "Automatisation activée" : "Automatisation désactivée",
      automation.name
    );
  }
  return NextResponse.json({ automation });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const existing = await prisma.automation.findFirst({ where: { id: params.id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  await prisma.automation.delete({ where: { id: params.id } });
  await logActivity(user.id, "automation", "Automatisation supprimée", existing.name);
  return NextResponse.json({ ok: true });
}
