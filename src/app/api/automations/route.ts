import { NextResponse } from "next/server";
import { z } from "zod";
import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const automations = await prisma.automation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ automations });
}

const createSchema = z.object({
  name: z.string().min(1),
  schedule: z.string().min(1),
  frequencyLabel: z.string().default("Personnalisé"),
  actionType: z.enum(["briefing", "reminder", "priorities", "file_analysis", "custom"]),
  description: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Requête invalide." }, { status: 400 });

  if (!cron.validate(parsed.data.schedule)) {
    return NextResponse.json({ error: "Expression cron invalide." }, { status: 400 });
  }

  const automation = await prisma.automation.create({ data: { ...parsed.data, userId: user.id } });
  await logActivity(user.id, "automation", "Automatisation créée", automation.name);
  return NextResponse.json({ automation });
}
