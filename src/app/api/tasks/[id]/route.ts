import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateTaskStatus } from "@/lib/agents/planner";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);

  if (body?.status) {
    await updateTaskStatus(userId, params.id, body.status);
  } else {
    await prisma.task.updateMany({
      where: { id: params.id, userId },
      data: {
        ...(body?.title ? { title: body.title } : {}),
        ...(body?.description !== undefined ? { description: body.description } : {}),
        ...(body?.priority ? { priority: body.priority } : {}),
        ...(body?.dueAt !== undefined ? { dueAt: body.dueAt ? new Date(body.dueAt) : null } : {}),
      },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  await prisma.task.deleteMany({ where: { id: params.id, userId } });
  return NextResponse.json({ ok: true });
}
