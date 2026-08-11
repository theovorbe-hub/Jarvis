import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { extractText, summarizeDocument } from "@/lib/agents/documents";
import { analyzeImage } from "@/lib/agents/vision";
import { isAIConfigured } from "@/lib/ai/client";

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const files = await db.fileAsset.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ files });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (20 Mo max)" }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const id = randomUUID();
  const isImage = file.type.startsWith("image/");
  const kind = isImage ? "image" : "document";

  const userDir = path.join(UPLOAD_ROOT, user.id);
  await mkdir(userDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = path.join(userDir, `${id}-${safeName}`);
  await writeFile(storagePath, buffer);

  let extractedText: string | null = null;
  if (!isImage) {
    try {
      extractedText = (await extractText(buffer, file.type, file.name)).slice(0, 200_000);
    } catch {
      extractedText = null;
    }
  }

  const asset = await db.fileAsset.create({
    data: {
      userId: user.id,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      storagePath,
      kind,
      extractedText,
    },
  });

  await logActivity({
    userId: user.id,
    agent: isImage ? "vision" : "documents",
    action: isImage ? "Image importée" : "Document importé",
    detail: file.name,
  });

  if (!isAIConfigured()) {
    return NextResponse.json({ file: asset, analyzed: false, note: "ANTHROPIC_API_KEY non configurée : analyse non disponible." });
  }

  try {
    if (isImage) {
      const result = await analyzeImage(user.id, {
        base64: buffer.toString("base64"),
        mediaType: file.type,
        fileId: asset.id,
      });
      const updated = await db.fileAsset.findUnique({ where: { id: asset.id } });
      return NextResponse.json({ file: updated, analyzed: result.ok });
    } else if (extractedText && extractedText.trim().length > 0) {
      await summarizeDocument(user.id, asset.id);
      const updated = await db.fileAsset.findUnique({ where: { id: asset.id } });
      return NextResponse.json({ file: updated, analyzed: true });
    }
  } catch (err) {
    return NextResponse.json({
      file: asset,
      analyzed: false,
      note: err instanceof Error ? err.message : "Erreur lors de l'analyse",
    });
  }

  return NextResponse.json({ file: asset, analyzed: false, note: "Aucun texte exploitable n'a pu être extrait." });
}
