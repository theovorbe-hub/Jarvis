import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteMemory } from "@/lib/agents/memory";
import { logActivity } from "@/lib/activity";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);

  const result = await prisma.memory.updateMany({
    where: { id: params.id, userId },
    data: {
      ...(body?.key ? { key: body.key } : {}),
      ...(body?.value ? { value: body.value } : {}),
      ...(body?.category ? { category: body.category } : {}),
    },
  });
  if (result.count === 0) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  await logActivity(userId, "Souvenir modifié", "memory");
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  await deleteMemory(userId, params.id);
  await logActivity(userId, "Souvenir supprimé", "memory");
  return NextResponse.json({ ok: true });
}
