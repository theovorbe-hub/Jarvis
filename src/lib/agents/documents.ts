import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { getAnthropicClient, MODEL, isAIConfigured } from "@/lib/ai/client";

export async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const lower = filename.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xlsm")
  ) {
    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const lines: string[] = [];
    workbook.eachSheet((sheet) => {
      lines.push(`# Feuille: ${sheet.name}`);
      sheet.eachRow((row) => {
        const values = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v)));
        lines.push(values.join(" | "));
      });
    });
    return lines.join("\n");
  }

  if (mimeType.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv")) {
    return buffer.toString("utf-8");
  }

  return "";
}

export async function summarizeDocument(userId: string, fileId: string) {
  const file = await db.fileAsset.findFirst({ where: { id: fileId, userId } });
  if (!file) return { ok: false, error: "Document introuvable" };
  if (!file.extractedText) return { ok: false, error: "Aucun texte extrait pour ce document" };

  if (!isAIConfigured()) {
    return { ok: false, error: "L'analyse nécessite une clé ANTHROPIC_API_KEY configurée." };
  }

  const client = getAnthropicClient();
  const truncated = file.extractedText.slice(0, 60000);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "Tu es le module DOCUMENTS de JARVIS. Résume le document fourni de façon claire et structurée en français : objet du document, points clés, chiffres ou dates importantes, actions à prévoir si pertinent. Sois concis mais complet.",
    messages: [
      {
        role: "user",
        content: `Nom du fichier: ${file.filename}\n\nContenu:\n${truncated}`,
      },
    ],
  });

  const summary = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  await db.fileAsset.update({ where: { id: fileId }, data: { summary } });
  await logActivity({ userId, agent: "documents", action: "Document analysé", detail: file.filename });

  return { ok: true, summary };
}

export async function askAboutDocument(userId: string, fileId: string, question: string) {
  const file = await db.fileAsset.findFirst({ where: { id: fileId, userId } });
  if (!file) return { ok: false, error: "Document introuvable" };
  if (!isAIConfigured()) return { ok: false, error: "ANTHROPIC_API_KEY non configurée" };

  const client = getAnthropicClient();
  const truncated = (file.extractedText ?? "").slice(0, 60000);

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system:
      "Tu es le module DOCUMENTS de JARVIS. Réponds à la question de l'utilisateur en te basant uniquement sur le contenu du document fourni. Si l'information n'y figure pas, dis-le clairement.",
    messages: [
      {
        role: "user",
        content: `Document "${file.filename}":\n${truncated}\n\nQuestion: ${question}`,
      },
    ],
  });

  const answer = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  await logActivity({ userId, agent: "documents", action: "Question sur un document", detail: `${file.filename} — ${question}` });

  return { ok: true, answer };
}

export async function compareDocuments(userId: string, fileIds: string[]) {
  const files = await db.fileAsset.findMany({ where: { userId, id: { in: fileIds } } });
  if (files.length < 2) return { ok: false, error: "Au moins deux documents sont nécessaires" };
  if (!isAIConfigured()) return { ok: false, error: "ANTHROPIC_API_KEY non configurée" };

  const client = getAnthropicClient();
  const content = files
    .map((f) => `### ${f.filename}\n${(f.extractedText ?? "").slice(0, 20000)}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: "Tu es le module DOCUMENTS de JARVIS. Compare les documents fournis : similitudes, différences, éléments contradictoires, recommandation.",
    messages: [{ role: "user", content }],
  });

  const comparison = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  await logActivity({ userId, agent: "documents", action: "Documents comparés", detail: files.map((f) => f.filename).join(", ") });

  return { ok: true, comparison };
}

export async function listFiles(userId: string) {
  return db.fileAsset.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
}
