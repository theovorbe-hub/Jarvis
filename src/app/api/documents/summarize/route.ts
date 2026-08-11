import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { summarizeDocument } from "@/lib/agents/documents";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!(await hasPermission(userId, "file_access"))) {
    return NextResponse.json({ error: "Permission fichiers désactivée." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.fileId) return NextResponse.json({ error: "fileId requis." }, { status: 400 });
  try {
    const summary = await summarizeDocument(userId, body.fileId);
    return NextResponse.json({ summary });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur." }, { status: 400 });
  }
}
