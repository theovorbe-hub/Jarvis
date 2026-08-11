import { prisma } from "@/lib/prisma";

const DEFAULT_PERMISSIONS = [
  {
    name: "Mémoire long terme",
    description: "Autorise JARVIS à enregistrer et rappeler des informations vous concernant.",
    category: "memory",
    sensitive: false,
    granted: true,
  },
  {
    name: "Reconnaissance vocale",
    description: "Autorise l'écoute du microphone lorsque vous activez le mode vocal.",
    category: "voice",
    sensitive: true,
    granted: false,
  },
  {
    name: "Écoute permanente (mot-clé « Jarvis »)",
    description: "Autorise une écoute continue en arrière-plan pour détecter le mot d'activation.",
    category: "voice",
    sensitive: true,
    granted: false,
  },
  {
    name: "Recherche web",
    description: "Autorise JARVIS à interroger Internet pour des informations récentes.",
    category: "web",
    sensitive: false,
    granted: true,
  },
  {
    name: "Analyse de fichiers",
    description: "Autorise l'upload et l'analyse de vos documents et images.",
    category: "files",
    sensitive: false,
    granted: true,
  },
  {
    name: "Automatisations",
    description: "Autorise JARVIS à exécuter des tâches planifiées en votre absence.",
    category: "automation",
    sensitive: true,
    granted: true,
  },
  {
    name: "Actions sensibles sans confirmation",
    description: "Si désactivé (recommandé), JARVIS demande toujours confirmation avant une action irréversible.",
    category: "automation",
    sensitive: true,
    granted: false,
  },
];

const DEFAULT_CONNECTIONS = [
  { provider: "calendar", label: "Calendrier" },
  { provider: "email", label: "Email" },
  { provider: "tasks", label: "Gestionnaire de tâches" },
  { provider: "cloud_storage", label: "Stockage cloud" },
  { provider: "music", label: "Musique" },
  { provider: "domotique", label: "Domotique" },
  { provider: "messaging", label: "Messagerie" },
  { provider: "api", label: "API externes" },
];

export async function seedDefaultsForUser(userId: string) {
  await prisma.permission.createMany({
    data: DEFAULT_PERMISSIONS.map((p) => ({ ...p, userId })),
  });
  await prisma.connection.createMany({
    data: DEFAULT_CONNECTIONS.map((c) => ({ ...c, userId, status: "disconnected" })),
  });
  await prisma.memory.create({
    data: {
      userId,
      title: "Bienvenue",
      content:
        "Vous venez de créer votre assistant JARVIS. Dites-lui « souviens-toi que... » pour qu'il mémorise une information.",
      category: "general",
    },
  });
}
