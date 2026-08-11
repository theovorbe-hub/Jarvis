import { prisma } from "@/lib/prisma";
import { ai } from "@/lib/ai";
import { logActivity } from "@/lib/activity";
import fs from "node:fs/promises";

// VISION agent — analyzes images using Claude's native multimodal input.

export async function analyzeImage(
  userId: string,
  fileId: string,
  question = "Décris ce que tu vois sur cette image en détail."
) {
  const file = await prisma.fileAsset.findFirst({ where: { id: fileId, userId } });
  if (!file) throw new Error("Image introuvable.");
  if (file.kind !== "image") throw new Error("Ce fichier n'est pas une image.");

  const buffer = await fs.readFile(file.storagePath);
  const base64 = buffer.toString("base64");

  const response = await ai.chat({
    system:
      "Tu es le module VISION de JARVIS. Analyse l'image fournie avec précision : objets, texte visible, " +
      "graphiques, documents ou factures. Réponds en français, de façon claire et structurée.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: file.mimeType, data: base64 },
          },
          { type: "text", text: question },
        ],
      },
    ],
    maxTokens: 800,
  });

  const summary = response.textOutput;
  await prisma.fileAsset.update({
    where: { id: file.id },
    data: { summary, analyzedAt: new Date() },
  });
  await logActivity(userId, `Image analysée : « ${file.filename} »`, "vision", question);
  return summary;
}
