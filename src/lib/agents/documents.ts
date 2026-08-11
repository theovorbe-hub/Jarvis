import { prisma } from "@/lib/prisma";
import { ai } from "@/lib/ai";
import { logActivity } from "@/lib/activity";

const MAX_CHARS = 60_000; // keep prompts well under context limits

// DOCUMENTS agent — summarizes, extracts, compares and answers questions
// about uploaded files using their previously-extracted text.

export async function summarizeDocument(userId: string, fileId: string) {
  const file = await prisma.fileAsset.findFirst({ where: { id: fileId, userId } });
  if (!file) throw new Error("Fichier introuvable.");
  if (!file.extractedText) throw new Error("Ce fichier ne contient pas de texte exploitable.");

  const response = await ai.chat({
    system:
      "Tu es le module DOCUMENTS de JARVIS. Résume le document fourni en français, " +
      "de façon claire et structurée (points clés, chiffres importants, actions à retenir). " +
      "Reste concis : 5 à 8 lignes maximum.",
    messages: [
      {
        role: "user",
        content: `Document « ${file.filename} » :\n\n${file.extractedText.slice(0, MAX_CHARS)}`,
      },
    ],
    maxTokens: 700,
  });

  const summary = response.textOutput;
  await prisma.fileAsset.update({
    where: { id: file.id },
    data: { summary, analyzedAt: new Date() },
  });
  await logActivity(userId, `Document analysé : « ${file.filename} »`, "document");
  return summary;
}

export async function askDocument(userId: string, fileId: string, question: string) {
  const file = await prisma.fileAsset.findFirst({ where: { id: fileId, userId } });
  if (!file) throw new Error("Fichier introuvable.");
  if (!file.extractedText) throw new Error("Ce fichier ne contient pas de texte exploitable.");

  const response = await ai.chat({
    system:
      "Tu es le module DOCUMENTS de JARVIS. Réponds à la question de l'utilisateur en te basant " +
      "uniquement sur le contenu du document fourni. Si l'information n'y figure pas, dis-le clairement.",
    messages: [
      {
        role: "user",
        content: `Document « ${file.filename} » :\n\n${file.extractedText.slice(0, MAX_CHARS)}\n\nQuestion : ${question}`,
      },
    ],
    maxTokens: 700,
  });

  await logActivity(userId, `Question posée sur « ${file.filename} »`, "document", question);
  return response.textOutput;
}

export async function compareDocuments(userId: string, fileIds: string[]) {
  const files = await prisma.fileAsset.findMany({
    where: { id: { in: fileIds }, userId },
  });
  if (files.length < 2) throw new Error("Il faut au moins deux documents à comparer.");

  const body = files
    .map((f, i) => `--- Document ${i + 1} : ${f.filename} ---\n${(f.extractedText ?? "").slice(0, MAX_CHARS / files.length)}`)
    .join("\n\n");

  const response = await ai.chat({
    system:
      "Tu es le module DOCUMENTS de JARVIS. Compare les documents fournis : points communs, " +
      "différences notables, et recommandation si pertinent. Reste concis.",
    messages: [{ role: "user", content: body }],
    maxTokens: 800,
  });

  await logActivity(
    userId,
    `Comparaison de ${files.length} documents`,
    "document",
    files.map((f) => f.filename).join(", ")
  );
  return response.textOutput;
}
