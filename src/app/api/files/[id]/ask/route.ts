import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { askAboutDocument } from "@/lib/agents/documents";
import { analyzeImage } from "@/lib/agents/vision";
import { db } from "@/lib/db";

const schema = z.object({ question: z.string().trim().min(1).max(2000) });

export async function POST(request: Request, ctx: RouteContext<"/api/files/[id]/ask">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const file = await db.fileAsset.findFirst({ where: { id, userId: user.id } });
  if (!file) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (file.kind === "image") {
    const { readFile } = await import("node:fs/promises");
    const buffer = await readFile(file.storagePath);
    const result = await analyzeImage(user.id, {
      base64: buffer.toString("base64"),
      mediaType: file.mimeType,
      question: parsed.data.question,
      fileId: file.id,
    });
    return NextResponse.json(result);
  }

  const result = await askAboutDocument(user.id, id, parsed.data.question);
  return NextResponse.json(result);
}
