import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createAutomation, listAutomations } from "@/lib/agents/automation";
import { hasPermission } from "@/lib/permissions";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const automations = await listAutomations(userId);
  return NextResponse.json({ automations });
}

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  if (!(await hasPermission(userId, "automation_execution"))) {
    return NextResponse.json(
      { error: "Autorisez d'abord « Exécution d'automatisations » dans Sécurité & Permissions." },
      { status: 403 }
    );
  }
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.trigger || !body?.actionType) {
    return NextResponse.json({ error: "Champs 'name', 'trigger' et 'actionType' requis." }, { status: 400 });
  }
  const automation = await createAutomation(userId, body);
  return NextResponse.json({ automation });
}
