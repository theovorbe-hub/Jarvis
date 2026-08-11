import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { analyzeImage } from "@/lib/agents/vision";

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!(await hasPermission(userId, "vision"))) {
    return NextResponse.json(
      { error: "Autorisez d'abord « Analyse d'images » dans Sécurité & Permissions." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body?.fileId) return NextResponse.json({ error: "fileId requis." }, { status: 400 });

  try {
    const answer = await analyzeImage(userId, body.fileId, body.question);
    return NextResponse.json({ answer });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur d'analyse.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
