import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { webSearch } from "@/lib/search";
import { logActivity } from "@/lib/activity";

export async function GET(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const query = new URL(req.url).searchParams.get("q");
  if (!query) return NextResponse.json({ error: "Paramètre 'q' requis." }, { status: 400 });

  try {
    const results = await webSearch(query);
    await logActivity(user.id, "research", "Recherche web effectuée", query);
    return NextResponse.json({ query, results });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
