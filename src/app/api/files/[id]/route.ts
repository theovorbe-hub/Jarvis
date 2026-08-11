import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const file = await prisma.fileAsset.findFirst({ where: { id: params.id, userId } });
  if (!file) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ file });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const file = await prisma.fileAsset.findFirst({ where: { id: params.id, userId } });
  if (!file) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  await fs.rm(file.storagePath, { force: true }).catch(() => {});
  await prisma.fileAsset.delete({ where: { id: file.id } });
  return NextResponse.json({ ok: true });
}
