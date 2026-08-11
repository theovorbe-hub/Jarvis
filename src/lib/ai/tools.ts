import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";
import { webSearch } from "@/lib/search";
import type { ToolDefinition } from "./provider";

export interface ToolContext {
  userId: string;
}

export interface ToolCallRecord {
  name: string;
  input: Record<string, unknown>;
  result: unknown;
  requiresConfirmation?: boolean;
}

const CONFIRM_MSG = (thing: string) =>
  `Cette action (${thing}) est irréversible. Confirmez-vous que je procède ? Répondez "oui" pour valider.`;

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "remember",
    description:
      "Enregistre une information durable sur l'utilisateur dans la mémoire long terme de JARVIS (préférence, projet, personne importante, habitude, objectif...).",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre court du souvenir, ex: 'Projet principal'" },
        content: { type: "string", description: "Contenu détaillé à mémoriser" },
        category: {
          type: "string",
          enum: ["identity", "preference", "project", "person", "habit", "goal", "task", "general"],
        },
      },
      required: ["title", "content"],
    },
  },
  {
    name: "recall_memory",
    description:
      "Recherche dans la mémoire long terme de l'utilisateur. Utilisez ceci avant de répondre à une question sur ses préférences, projets ou informations personnelles.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Mots-clés à rechercher" } },
      required: ["query"],
    },
  },
  {
    name: "forget",
    description: "Supprime définitivement un souvenir de la mémoire. Action irréversible.",
    inputSchema: {
      type: "object",
      properties: {
        memoryId: { type: "string" },
        confirmed: { type: "boolean", description: "true uniquement si l'utilisateur a explicitement confirmé" },
      },
      required: ["memoryId"],
    },
  },
  {
    name: "create_task",
    description: "Crée une tâche à faire pour l'utilisateur.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["low", "normal", "high"] },
        dueDate: { type: "string", description: "ISO 8601, optionnel" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "Liste les tâches de l'utilisateur, éventuellement filtrées.",
    inputSchema: {
      type: "object",
      properties: { includeDone: { type: "boolean" } },
    },
  },
  {
    name: "complete_task",
    description: "Marque une tâche comme terminée.",
    inputSchema: {
      type: "object",
      properties: { taskId: { type: "string" } },
      required: ["taskId"],
    },
  },
  {
    name: "create_reminder",
    description: "Crée un rappel programmé à une date/heure précise.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        remindAt: { type: "string", description: "Date/heure ISO 8601" },
      },
      required: ["title", "remindAt"],
    },
  },
  {
    name: "list_reminders",
    description: "Liste les rappels à venir de l'utilisateur.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "web_search",
    description:
      "Recherche des informations actuelles sur Internet. À utiliser pour toute question sur l'actualité, une entreprise, un événement récent ou toute donnée pouvant avoir changé après votre date de connaissance.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "list_files",
    description: "Liste les documents/images récemment importés par l'utilisateur et déjà analysés.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_file_content",
    description: "Récupère le texte extrait d'un document précédemment importé pour l'analyser, le résumer ou y chercher une information.",
    inputSchema: {
      type: "object",
      properties: { fileId: { type: "string" } },
      required: ["fileId"],
    },
  },
  {
    name: "create_automation",
    description:
      "Crée une automatisation récurrente (ex: briefing quotidien à 8h, rappel chaque jour). Action sensible : nécessite confirmation explicite de l'utilisateur avant exécution.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string" },
        schedule: { type: "string", description: "Expression cron, ex: '0 8 * * *' pour tous les jours à 8h" },
        frequencyLabel: { type: "string", description: "Description lisible, ex: 'Tous les jours à 8h'" },
        actionType: { type: "string", enum: ["briefing", "reminder", "priorities", "file_analysis", "custom"] },
        description: { type: "string" },
        confirmed: { type: "boolean" },
      },
      required: ["name", "schedule", "actionType", "confirmed"],
    },
  },
  {
    name: "list_automations",
    description: "Liste les automatisations configurées par l'utilisateur.",
    inputSchema: { type: "object", properties: {} },
  },
];

export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  ctx: ToolContext
): Promise<unknown> {
  const { userId } = ctx;

  switch (name) {
    case "remember": {
      const memory = await prisma.memory.create({
        data: {
          userId,
          title: String(input.title),
          content: String(input.content),
          category: (input.category as string) ?? "general",
        },
      });
      await logActivity(userId, "memory", "Souvenir enregistré", memory.title);
      return { ok: true, memory };
    }

    case "recall_memory": {
      const query = String(input.query ?? "");
      const memories = await prisma.memory.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });
      if (memories.length === 0) {
        const fallback = await prisma.memory.findMany({
          where: { userId },
          orderBy: { updatedAt: "desc" },
          take: 10,
        });
        return { results: fallback, note: "Aucune correspondance exacte ; souvenirs récents renvoyés." };
      }
      return { results: memories };
    }

    case "forget": {
      const memoryId = String(input.memoryId);
      if (!input.confirmed) {
        return { requiresConfirmation: true, message: CONFIRM_MSG("suppression d'un souvenir") };
      }
      const memory = await prisma.memory.delete({ where: { id: memoryId } }).catch(() => null);
      if (memory) await logActivity(userId, "memory", "Souvenir supprimé", memory.title);
      return { ok: !!memory };
    }

    case "create_task": {
      const task = await prisma.task.create({
        data: {
          userId,
          title: String(input.title),
          description: (input.description as string) ?? null,
          priority: (input.priority as string) ?? "normal",
          dueDate: input.dueDate ? new Date(String(input.dueDate)) : null,
        },
      });
      await logActivity(userId, "planner", "Tâche créée", task.title);
      return { ok: true, task };
    }

    case "list_tasks": {
      const tasks = await prisma.task.findMany({
        where: { userId, ...(input.includeDone ? {} : { done: false }) },
        orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        take: 20,
      });
      return { tasks };
    }

    case "complete_task": {
      const task = await prisma.task
        .update({ where: { id: String(input.taskId) }, data: { done: true } })
        .catch(() => null);
      if (task) await logActivity(userId, "planner", "Tâche terminée", task.title);
      return { ok: !!task };
    }

    case "create_reminder": {
      const reminder = await prisma.reminder.create({
        data: {
          userId,
          title: String(input.title),
          remindAt: new Date(String(input.remindAt)),
        },
      });
      await logActivity(userId, "planner", "Rappel créé", reminder.title);
      return { ok: true, reminder };
    }

    case "list_reminders": {
      const reminders = await prisma.reminder.findMany({
        where: { userId, done: false },
        orderBy: { remindAt: "asc" },
        take: 20,
      });
      return { reminders };
    }

    case "web_search": {
      const query = String(input.query ?? "");
      try {
        const results = await webSearch(query);
        await logActivity(userId, "research", "Recherche web effectuée", query);
        return { results, query };
      } catch (err) {
        return { error: `Recherche impossible: ${(err as Error).message}` };
      }
    }

    case "list_files": {
      const files = await prisma.fileAsset.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, filename: true, mimeType: true, summary: true, createdAt: true },
      });
      return { files };
    }

    case "get_file_content": {
      const file = await prisma.fileAsset.findFirst({
        where: { id: String(input.fileId), userId },
      });
      if (!file) return { error: "Fichier introuvable." };
      await logActivity(userId, "documents", "Document consulté", file.filename);
      return {
        filename: file.filename,
        summary: file.summary,
        content: file.extractedText?.slice(0, 12000) ?? "",
      };
    }

    case "create_automation": {
      if (!input.confirmed) {
        return { requiresConfirmation: true, message: CONFIRM_MSG("création d'une automatisation récurrente") };
      }
      const automation = await prisma.automation.create({
        data: {
          userId,
          name: String(input.name),
          schedule: String(input.schedule),
          frequencyLabel: (input.frequencyLabel as string) ?? "Personnalisé",
          actionType: String(input.actionType),
          description: (input.description as string) ?? null,
        },
      });
      await logActivity(userId, "automation", "Automatisation créée", automation.name);
      return { ok: true, automation };
    }

    case "list_automations": {
      const automations = await prisma.automation.findMany({ where: { userId } });
      return { automations };
    }

    default:
      return { error: `Outil inconnu: ${name}` };
  }
}
