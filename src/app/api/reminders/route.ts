import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createReminder, listReminders } from "@/lib/agents/planner";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const includeDone = req.nextUrl.searchParams.get("all") === "1";
  const reminders = await listReminders(userId, includeDone);
  return NextResponse.json({ reminders });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.text || !body?.remindAt) {
    return NextResponse.json({ error: "Champs 'text' et 'remindAt' requis." }, { status: 400 });
  }
  const reminder = await createReminder(userId, body.text, body.remindAt);
  return NextResponse.json({ reminder });
}
