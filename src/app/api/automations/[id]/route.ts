import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { toggleAutomation, deleteAutomation } from "@/lib/agents/automation";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.enabled === "boolean") {
    await toggleAutomation(userId, params.id, body.enabled);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  await deleteAutomation(userId, params.id);
  return NextResponse.json({ ok: true });
}
