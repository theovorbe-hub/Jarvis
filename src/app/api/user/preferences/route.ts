import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

export async function PATCH(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corps invalide." }, { status: 400 });

  if (body.alwaysListening === true && !(await hasPermission(userId, "always_listening"))) {
    return NextResponse.json(
      { error: "Autorisez d'abord « Écoute permanente » dans Sécurité & Permissions." },
      { status: 403 }
    );
  }

  const data: Record<string, unknown> = {};
  for (const key of ["voiceEnabled", "voiceName", "voiceVolume", "alwaysListening", "wakeWordEnabled", "city"]) {
    if (key in body) data[key] = body[key];
  }

  const user = await prisma.user.update({ where: { id: userId }, data });
  return NextResponse.json({
    user: {
      voiceEnabled: user.voiceEnabled,
      voiceName: user.voiceName,
      voiceVolume: user.voiceVolume,
      alwaysListening: user.alwaysListening,
      wakeWordEnabled: user.wakeWordEnabled,
      city: user.city,
    },
  });
}
