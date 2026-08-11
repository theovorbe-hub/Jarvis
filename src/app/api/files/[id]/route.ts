import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const file = await db.fileAsset.findFirst({ where: { id, userId: user.id } });
  if (!file) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json({ file });
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/files/[id]">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const file = await db.fileAsset.findFirst({ where: { id, userId: user.id } });
  if (!file) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await unlink(file.storagePath).catch(() => {});
  await db.fileAsset.delete({ where: { id } });
  await logActivity({ userId: user.id, agent: "documents", action: "Fichier supprimé", detail: file.filename });

  return NextResponse.json({ ok: true });
}
