export const DEFAULT_PERMISSIONS: Array<{
  key: string;
  label: string;
  description: string;
  sensitive: boolean;
  granted: boolean;
}> = [
  {
    key: "memory.manage",
    label: "Mémoire personnelle",
    description: "Lire, créer et modifier les souvenirs que JARVIS retient à votre sujet.",
    sensitive: false,
    granted: true,
  },
  {
    key: "web.search",
    label: "Recherche web",
    description: "Effectuer des recherches sur Internet pour répondre à vos questions.",
    sensitive: false,
    granted: true,
  },
  {
    key: "files.analyze",
    label: "Analyse de documents",
    description: "Lire et analyser les fichiers que vous importez (PDF, Word, Excel, texte).",
    sensitive: false,
    granted: true,
  },
  {
    key: "vision.analyze",
    label: "Analyse d'images",
    description: "Analyser les images et photos que vous partagez avec JARVIS.",
    sensitive: false,
    granted: true,
  },
  {
    key: "tasks.manage",
    label: "Tâches",
    description: "Créer, modifier et supprimer des tâches en votre nom.",
    sensitive: false,
    granted: true,
  },
  {
    key: "reminders.manage",
    label: "Rappels",
    description: "Créer et gérer des rappels.",
    sensitive: false,
    granted: true,
  },
  {
    key: "automations.manage",
    label: "Automatisations",
    description: "Créer et exécuter des automatisations programmées en votre nom.",
    sensitive: false,
    granted: true,
  },
  {
    key: "agent.sensitive_actions",
    label: "Actions sensibles de l'agent",
    description:
      "Autoriser JARVIS à proposer des actions irréversibles (suppression, envoi, connexions externes). Une confirmation explicite reste toujours demandée avant exécution.",
    sensitive: true,
    granted: true,
  },
  {
    key: "integrations.connect",
    label: "Connexion de services externes",
    description: "Autoriser la connexion future à des services externes (calendrier, email, stockage, domotique...).",
    sensitive: true,
    granted: false,
  },
];

export const CONNECTION_PROVIDERS: Array<{
  provider: string;
  label: string;
  description: string;
}> = [
  { provider: "calendar", label: "Calendrier", description: "Agenda et événements." },
  { provider: "email", label: "Email", description: "Boîte de réception et brouillons." },
  { provider: "tasks", label: "Gestionnaire de tâches", description: "Synchronisation des tâches externes." },
  { provider: "cloud_storage", label: "Stockage cloud", description: "Accès aux fichiers stockés dans le cloud." },
  { provider: "music", label: "Musique", description: "Contrôle de la lecture musicale." },
  { provider: "smart_home", label: "Domotique", description: "Contrôle des appareils connectés." },
  { provider: "messaging", label: "Messagerie", description: "Envoi et lecture de messages." },
  { provider: "custom_api", label: "API personnalisée", description: "Connexion à un service professionnel via API." },
];
