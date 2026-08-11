import mammoth from "mammoth";
import ExcelJS from "exceljs";

export type DocumentKind = "pdf" | "docx" | "xlsx" | "image" | "text";

export function classifyMime(mimeType: string, filename: string): DocumentKind {
  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) return "pdf";
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  )
    return "docx";
  // CSV is already plain text, so it's parsed straight from bytes below
  // rather than through the spreadsheet engine.
  if (filename.endsWith(".csv")) return "text";
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel" ||
    filename.endsWith(".xlsx") ||
    filename.endsWith(".xls")
  )
    return "xlsx";
  if (mimeType.startsWith("image/")) return "image";
  return "text";
}

/** Extracts plain text from a supported document buffer. Returns null for images. */
export async function extractText(buffer: Buffer, kind: DocumentKind): Promise<string | null> {
  switch (kind) {
    case "pdf": {
      // Lazy-required to dodge pdf-parse's debug-mode file read on import.
      const pdfParse = (await import("pdf-parse")).default;
      const data = await pdfParse(buffer);
      return data.text.trim();
    }
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }
    case "xlsx": {
      // exceljs only reads the modern .xlsx/.xlsm format; legacy binary
      // .xls files fail here and are caught by the caller, which leaves
      // extractedText null (the file still uploads, just unsummarized).
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const chunks: string[] = [];
      workbook.eachSheet((sheet) => {
        const rows: string[] = [];
        sheet.eachRow((row) => {
          const values = (row.values as unknown[]).slice(1); // index 0 is unused by exceljs
          rows.push(values.map((v) => (v == null ? "" : String(v))).join(","));
        });
        chunks.push(`# Feuille : ${sheet.name}\n${rows.join("\n")}`);
      });
      return chunks.join("\n\n").trim();
    }
    case "text": {
      return buffer.toString("utf-8").trim();
    }
    case "image":
      return null;
    default:
      return null;
  }
}
