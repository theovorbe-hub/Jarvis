import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: user.id },
    orderBy: [{ done: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
  });
  return NextResponse.json({ tasks });
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  dueDate: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  const { dueDate, ...rest } = parsed.data;
  const task = await prisma.task.create({
    data: { ...rest, userId: user.id, dueDate: dueDate ? new Date(dueDate) : null },
  });
  await logActivity(user.id, "planner", "Tâche créée", task.title);
  return NextResponse.json({ task });
}
