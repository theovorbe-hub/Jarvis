import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { listMemories, rememberInfo } from "@/lib/agents/memory";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const memories = await listMemories(userId);
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.key || !body?.value) {
    return NextResponse.json({ error: "Champs 'key' et 'value' requis." }, { status: 400 });
  }
  const memory = await rememberInfo(userId, body.key, body.value, body.category || "general");
  return NextResponse.json({ memory });
}
