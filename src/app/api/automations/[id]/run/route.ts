import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAutomation } from "@/lib/agents/automation-runner";

export async function POST(_request: Request, ctx: RouteContext<"/api/automations/[id]/run">) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { id } = await ctx.params;

  const automation = await db.automation.findFirst({ where: { id, userId: user.id } });
  if (!automation) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await runAutomation(automation);
  return NextResponse.json({ ok: true });
}
