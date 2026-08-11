import { prisma } from "@/lib/prisma";

// Architecture placeholders for future integrations (spec section 13).
// Each connection starts disconnected; wiring a real OAuth flow for a
// provider later only means implementing its /api/connections/[provider]/callback
// route and flipping status to "connected" there — the data model and UI
// already support it end-to-end.
export const AVAILABLE_PROVIDERS: Array<{ provider: string; label: string }> = [
  { provider: "calendar", label: "Calendrier" },
  { provider: "email", label: "Email" },
  { provider: "cloud_storage", label: "Stockage cloud" },
  { provider: "music", label: "Musique" },
  { provider: "smart_home", label: "Domotique" },
  { provider: "messaging", label: "Messagerie" },
  { provider: "custom_api", label: "API externe" },
];

export async function ensureDefaultConnections(userId: string) {
  for (const p of AVAILABLE_PROVIDERS) {
    const existing = await prisma.connection.findFirst({ where: { userId, provider: p.provider } });
    if (!existing) {
      await prisma.connection.create({
        data: { userId, provider: p.provider, label: p.label, status: "disconnected" },
      });
    }
  }
}
