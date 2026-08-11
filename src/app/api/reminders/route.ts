import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const reminders = await db.reminder.findMany({ where: { userId: user.id }, orderBy: { remindAt: "asc" } });
  return NextResponse.json({ reminders });
}

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  remindAt: z.string(),
  recurring: z.enum(["daily", "weekly", "monthly"]).optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

  const reminder = await db.reminder.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      remindAt: new Date(parsed.data.remindAt),
      recurring: parsed.data.recurring,
    },
  });

  await logActivity({ userId: user.id, agent: "planner", action: "Rappel créé", detail: reminder.title });

  return NextResponse.json({ reminder });
}
