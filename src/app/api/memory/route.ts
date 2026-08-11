import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const memories = await prisma.memory.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ memories });
}

const createSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().default("general"),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const memory = await prisma.memory.create({ data: { ...parsed.data, userId: user.id } });
  await logActivity(user.id, "memory", "Souvenir enregistré", memory.title);
  return NextResponse.json({ memory });
}
