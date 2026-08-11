import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const file = await prisma.fileAsset.findFirst({ where: { id: params.id, userId } });
  if (!file) return NextResponse.json({ error: "Introuvable." }, { status: 404 });

  const buffer = await fs.readFile(file.storagePath).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "Fichier manquant sur le disque." }, { status: 410 });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
