import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { getAIProvider, AIConfigError } from "@/lib/ai";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  imageBase64: z.string(),
  mimeType: z.string(),
  prompt: z.string().default("Décris ce que tu vois sur cette image en détail, en français."),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  try {
    const provider = getAIProvider();
    const description = await provider.describeImage(
      { base64: parsed.data.imageBase64, mimeType: parsed.data.mimeType },
      parsed.data.prompt
    );
    await logActivity(user.id, "vision", "Image analysée", parsed.data.prompt.slice(0, 80));
    return NextResponse.json({ description });
  } catch (err) {
    if (err instanceof AIConfigError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error(err);
    return NextResponse.json({ error: "Analyse impossible." }, { status: 500 });
  }
}
