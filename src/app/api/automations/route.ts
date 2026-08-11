import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const automations = await db.automation.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ automations });
}

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  cron: z.string().trim().min(1),
  action: z.enum(["daily_briefing", "priority_list", "reminder_ping", "custom_note"]),
  actionConfig: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Requête invalide" }, { status: 400 });

  const automation = await db.automation.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      description: parsed.data.description,
      trigger: parsed.data.cron,
      triggerType: "schedule",
      action: parsed.data.action,
      actionConfig: parsed.data.actionConfig ? JSON.stringify(parsed.data.actionConfig) : null,
      enabled: true,
    },
  });

  await logActivity({ userId: user.id, agent: "automation", action: "Automatisation créée", detail: automation.name });

  return NextResponse.json({ automation });
}
