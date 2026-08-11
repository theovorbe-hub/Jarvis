import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { compareDocuments } from "@/lib/agents/documents";

const schema = z.object({ fileIds: z.array(z.string()).min(2).max(5) });

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const result = await compareDocuments(user.id, parsed.data.fileIds);
  return NextResponse.json(result);
}
