import { NextResponse } from "next/server";
import { unlink } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const file = await prisma.fileAsset.findFirst({ where: { id: params.id, userId: user.id } });
  if (!file) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ file });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const file = await prisma.fileAsset.findFirst({ where: { id: params.id, userId: user.id } });
  if (!file) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  await prisma.fileAsset.delete({ where: { id: params.id } });
  await unlink(file.path).catch(() => null);
  return NextResponse.json({ ok: true });
}
