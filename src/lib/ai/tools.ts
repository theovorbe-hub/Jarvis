import type Anthropic from "@anthropic-ai/sdk";

export type ToolDef = Anthropic.Tool;

export const JARVIS_TOOLS: ToolDef[] = [
  {
    name: "remember",
    description:
      "Enregistre une information durable sur l'utilisateur dans la mémoire long terme de JARVIS (prénom, préférence, projet, habitude, objectif, personne importante, note...).",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre court du souvenir, ex: 'Projet principal'" },
        content: { type: "string", description: "Contenu détaillé du souvenir." },
        category: {
          type: "string",
          enum: ["identity", "preference", "project", "person", "habit", "goal", "note"],
          description: "Catégorie du souvenir.",
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "recall_memories",
    description: "Recherche dans la mémoire long terme les souvenirs pertinents pour une requête donnée.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "list_memories",
    description: "Liste tous les souvenirs enregistrés, éventuellement filtrés par catégorie.",
    input_schema: {
      type: "object",
      properties: { category: { type: "string" } },
    },
  },
  {
    name: "delete_memory",
    description: "Supprime définitivement un souvenir. Nécessite une confirmation explicite préalable de l'utilisateur dans la conversation avant d'être appelé.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "create_task",
    description: "Crée une tâche pour l'utilisateur.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        dueDate: { type: "string", description: "Date ISO 8601, optionnelle." },
      },
      required: ["title"],
    },
  },
  {
    name: "update_task",
    description: "Met à jour une tâche existante (statut, titre, priorité, échéance).",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        status: { type: "string", enum: ["todo", "in_progress", "done"] },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        dueDate: { type: "string" },
      },
      required: ["id"],
    },
  },
  {
    name: "list_tasks",
    description: "Liste les tâches de l'utilisateur, éventuellement filtrées par statut.",
    input_schema: {
      type: "object",
      properties: { status: { type: "string", enum: ["todo", "in_progress", "done"] } },
    },
  },
  {
    name: "delete_task",
    description: "Supprime définitivement une tâche. Nécessite une confirmation explicite préalable de l'utilisateur.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "create_reminder",
    description: "Crée un rappel à une date/heure précise, éventuellement récurrent.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        remindAt: { type: "string", description: "Date/heure ISO 8601 à laquelle rappeler." },
        recurring: { type: "string", enum: ["daily", "weekly", "monthly"] },
      },
      required: ["title", "remindAt"],
    },
  },
  {
    name: "list_reminders",
    description: "Liste les rappels à venir ou passés de l'utilisateur.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "delete_reminder",
    description: "Supprime définitivement un rappel. Nécessite une confirmation explicite préalable de l'utilisateur.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "web_search",
    description:
      "Recherche des informations actuelles sur Internet. À utiliser pour toute question portant sur des faits récents, une actualité, une entreprise, une personne publique, etc.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_weather",
    description: "Récupère la météo actuelle et du jour pour une ville donnée.",
    input_schema: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
  },
  {
    name: "create_automation",
    description:
      "Crée une automatisation programmée (ex: briefing quotidien, rappel récurrent, liste de priorités hebdomadaire). Nécessite une confirmation explicite préalable de l'utilisateur car cela engage une action récurrente future.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        cron: { type: "string", description: "Expression cron standard à 5 champs, ex: '0 8 * * *' pour tous les jours à 8h." },
        action: {
          type: "string",
          enum: ["daily_briefing", "priority_list", "reminder_ping", "custom_note"],
        },
        actionConfig: { type: "string", description: "Configuration JSON additionnelle pour l'action (ex: message du rappel)." },
      },
      required: ["name", "cron", "action"],
    },
  },
  {
    name: "list_automations",
    description: "Liste les automatisations existantes de l'utilisateur.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "toggle_automation",
    description: "Active ou désactive une automatisation existante.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, enabled: { type: "boolean" } },
      required: ["id", "enabled"],
    },
  },
  {
    name: "list_files",
    description: "Liste les fichiers/documents/images récemment importés par l'utilisateur, avec leur résumé s'il existe.",
    input_schema: { type: "object", properties: {} },
  },
];
