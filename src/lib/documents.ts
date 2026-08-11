import mammoth from "mammoth";
import * as XLSX from "xlsx";

/** Extracts plain text from an uploaded document so it can be fed to the AI. */
export async function extractText(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
  const lower = filename.toLowerCase();

  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv")
  ) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      parts.push(`--- Feuille: ${sheetName} ---\n${csv}`);
    }
    return parts.join("\n\n");
  }

  if (mimeType.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md")) {
    return buffer.toString("utf-8");
  }

  return "";
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

export function isSupportedDocument(mimeType: string, filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    mimeType === "application/pdf" ||
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("spreadsheetml") ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType.startsWith("text/") ||
    isImage(mimeType) ||
    [".pdf", ".docx", ".xlsx", ".xls", ".csv", ".txt", ".md"].some((ext) => lower.endsWith(ext))
  );
}
