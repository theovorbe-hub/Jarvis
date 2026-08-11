import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 200 });
  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      voiceEnabled: user.voiceEnabled,
      voiceName: user.voiceName,
      voiceVolume: user.voiceVolume,
      alwaysListening: user.alwaysListening,
      wakeWordEnabled: user.wakeWordEnabled,
    },
  });
}
