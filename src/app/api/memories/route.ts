import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? undefined;

  const memories = await db.memory.findMany({
    where: { userId: user.id, ...(category ? { category } : {}) },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ memories });
}

const schema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(4000),
  category: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const memory = await db.memory.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
      category: parsed.data.category ?? "note",
    },
  });

  await logActivity({ userId: user.id, agent: "memory", action: "Souvenir enregistré", detail: memory.title });

  return NextResponse.json({ memory });
}
