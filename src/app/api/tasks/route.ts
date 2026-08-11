import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createTask, listTasks } from "@/lib/agents/planner";

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const tasks = await listTasks(userId, status);
  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.title) return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  const task = await createTask(userId, body.title, {
    description: body.description,
    priority: body.priority,
    dueAt: body.dueAt,
  });
  return NextResponse.json({ task });
}
