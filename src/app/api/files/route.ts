import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { extractText, isImage, isSupportedDocument } from "@/lib/documents";
import { logActivity } from "@/lib/activity";
import { getAIProvider, AIConfigError } from "@/lib/ai";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const files = await prisma.fileAsset.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, filename: true, mimeType: true, size: true, summary: true, createdAt: true },
  });
  return NextResponse.json({ files });
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)." }, { status: 413 });
  }
  if (!isSupportedDocument(file.type, file.name)) {
    return NextResponse.json({ error: "Format de fichier non supporté." }, { status: 415 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const storedName = `${randomUUID()}-${file.name}`;
  const filePath = path.join(UPLOAD_DIR, storedName);
  await writeFile(filePath, buffer);

  let extractedText = "";
  let summary: string | null = null;

  try {
    if (isImage(file.type)) {
      const provider = getAIProvider();
      summary = await provider.describeImage(
        { mimeType: file.type, base64: buffer.toString("base64") },
        "Décris cette image en français en 2-3 phrases : ce qu'elle montre, le contexte, et tout texte visible important."
      );
      extractedText = summary;
    } else {
      extractedText = await extractText(buffer, file.type, file.name);
      if (extractedText.trim()) {
        const provider = getAIProvider();
        const result = await provider.complete({
          system: "Tu résumes des documents en français, de façon concise (3-5 phrases maximum).",
          messages: [
            {
              role: "user",
              content: `Résume ce document intitulé "${file.name}" :\n\n${extractedText.slice(0, 8000)}`,
            },
          ],
          maxTokens: 400,
        });
        summary = result.text;
      }
    }
  } catch (err) {
    if (!(err instanceof AIConfigError)) console.error(err);
    summary = err instanceof AIConfigError ? "Résumé indisponible (clé IA non configurée)." : "Résumé indisponible.";
  }

  const asset = await prisma.fileAsset.create({
    data: {
      userId: user.id,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      path: filePath,
      extractedText,
      summary,
    },
  });

  await logActivity(user.id, "documents", "Document analysé", file.name);

  return NextResponse.json({
    file: {
      id: asset.id,
      filename: asset.filename,
      mimeType: asset.mimeType,
      size: asset.size,
      summary: asset.summary,
      createdAt: asset.createdAt,
    },
  });
}
