import { prisma } from "@/lib/prisma";

// The full set of capabilities JARVIS can ever request. Every capability
// starts ungranted — the user must explicitly turn each one on from the
// Sécurité & Permissions screen (or via a consent prompt) before any tool
// that depends on it will run.
export const CAPABILITIES: Array<{
  capability: string;
  label: string;
  sensitive: boolean;
}> = [
  { capability: "microphone", label: "Microphone (commandes vocales)", sensitive: false },
  { capability: "always_listening", label: "Écoute permanente (mot-clé « Jarvis »)", sensitive: true },
  { capability: "web_search", label: "Recherche sur Internet", sensitive: false },
  { capability: "file_access", label: "Analyse de fichiers et documents", sensitive: false },
  { capability: "vision", label: "Analyse d'images", sensitive: false },
  { capability: "memory_write", label: "Mémorisation d'informations personnelles", sensitive: false },
  { capability: "automation_execution", label: "Exécution d'automatisations", sensitive: true },
  { capability: "calendar", label: "Accès à l'agenda (intégration future)", sensitive: true },
  { capability: "email", label: "Accès aux emails (intégration future)", sensitive: true },
];

export async function ensureDefaultPermissions(userId: string) {
  for (const cap of CAPABILITIES) {
    await prisma.permission.upsert({
      where: { userId_capability: { userId, capability: cap.capability } },
      update: {},
      create: {
        userId,
        capability: cap.capability,
        label: cap.label,
        sensitive: cap.sensitive,
        // Non-sensitive core capabilities needed for the MVP to be usable
        // out of the box are granted by default; anything sensitive or
        // tied to a not-yet-built integration stays off until the user
        // opts in explicitly.
        granted: !cap.sensitive && cap.capability !== "calendar" && cap.capability !== "email",
        grantedAt: !cap.sensitive && cap.capability !== "calendar" && cap.capability !== "email" ? new Date() : null,
      },
    });
  }
}

export async function hasPermission(userId: string, capability: string): Promise<boolean> {
  const perm = await prisma.permission.findUnique({
    where: { userId_capability: { userId, capability } },
  });
  return !!perm?.granted;
}
