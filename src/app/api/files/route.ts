import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const files = await prisma.fileAsset.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      kind: true,
      summary: true,
      analyzedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ files });
}
