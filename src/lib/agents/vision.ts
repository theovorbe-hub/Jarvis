import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getAnthropicClient, MODEL, isAIConfigured } from "@/lib/ai/client";

const SUPPORTED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type SupportedMediaType = (typeof SUPPORTED_MEDIA_TYPES)[number];

function assertSupportedMediaType(mimeType: string): SupportedMediaType {
  if ((SUPPORTED_MEDIA_TYPES as readonly string[]).includes(mimeType)) {
    return mimeType as SupportedMediaType;
  }
  throw new Error(`Format d'image non supporté: ${mimeType}`);
}

export async function analyzeImage(
  userId: string,
  params: { base64: string; mediaType: string; question?: string; fileId?: string }
) {
  if (!isAIConfigured()) {
    return { ok: false, error: "L'analyse d'image nécessite une clé ANTHROPIC_API_KEY configurée." };
  }

  const client = getAnthropicClient();
  const mediaType = assertSupportedMediaType(params.mediaType);
  const prompt = params.question?.trim() || "Décris précisément ce que tu vois sur cette image, identifie les objets, le texte visible et tout élément notable.";

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "Tu es le module VISION de JARVIS. Analyse les images avec précision et rigueur : objets, texte (OCR), personnes (de façon descriptive et respectueuse, sans identification), données de graphiques, anomalies. Structure ta réponse clairement.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: params.base64 } },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const analysis = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  if (params.fileId) {
    await db.fileAsset.update({ where: { id: params.fileId }, data: { analysis } });
  }

  await logActivity({ userId, agent: "vision", action: "Image analysée", detail: prompt.slice(0, 120) });

  return { ok: true, analysis };
}
