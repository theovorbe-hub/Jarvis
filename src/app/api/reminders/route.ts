import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { remindAt: "asc" },
  });
  return NextResponse.json({ reminders });
}

const createSchema = z.object({
  title: z.string().min(1),
  remindAt: z.string(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const reminder = await prisma.reminder.create({
    data: { userId: user.id, title: parsed.data.title, remindAt: new Date(parsed.data.remindAt) },
  });
  await logActivity(user.id, "planner", "Rappel créé", reminder.title);
  return NextResponse.json({ reminder });
}
