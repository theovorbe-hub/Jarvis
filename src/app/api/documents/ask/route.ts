import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { askDocument } from "@/lib/agents/documents";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!(await hasPermission(userId, "file_access"))) {
    return NextResponse.json({ error: "Permission fichiers désactivée." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body?.fileId || !body?.question) {
    return NextResponse.json({ error: "fileId et question requis." }, { status: 400 });
  }
  try {
    const answer = await askDocument(userId, body.fileId, body.question);
    return NextResponse.json({ answer });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur." }, { status: 400 });
  }
}
