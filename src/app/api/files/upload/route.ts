import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { saveUpload } from "@/lib/storage";
import { classifyMime, extractText } from "@/lib/documents/parse";
import { logActivity } from "@/lib/activity";
import { summarizeDocument } from "@/lib/agents/documents";
import { triggerEventAutomations } from "@/lib/automation/actions";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!(await hasPermission(userId, "file_access"))) {
    return NextResponse.json(
      { error: "Autorisez d'abord « Analyse de fichiers et documents » dans Sécurité & Permissions." },
      { status: 403 }
    );
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)." }, { status: 413 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = classifyMime(file.type, file.name.toLowerCase());
  const storagePath = await saveUpload(userId, file.name, buffer);

  let extractedText: string | null = null;
  try {
    extractedText = await extractText(buffer, kind);
  } catch (err) {
    console.error("[files/upload] extraction échouée:", err);
  }

  const asset = await prisma.fileAsset.create({
    data: {
      userId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      kind,
      storagePath,
      extractedText,
    },
  });

  await logActivity(userId, `Fichier importé : « ${file.name} »`, "document");

  // Auto-summarize text documents immediately so "Document analysé." can be
  // shown right away, matching the spec's upload flow.
  let summary: string | null = null;
  if (extractedText) {
    try {
      summary = await summarizeDocument(userId, asset.id);
    } catch (err) {
      console.error("[files/upload] résumé échoué:", err);
    }
  }

  await triggerEventAutomations(userId, "file_uploaded", { fileId: asset.id });

  return NextResponse.json({
    file: { ...asset, summary: summary ?? asset.summary },
  });
}
