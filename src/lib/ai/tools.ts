import type { ToolDefinition } from "./provider";
import { prisma } from "@/lib/prisma";
import { rememberInfo, recallInfo } from "@/lib/agents/memory";
import {
  createTask,
  listTasks,
  updateTaskStatus,
  createReminder,
  listReminders,
} from "@/lib/agents/planner";
import { webSearch } from "@/lib/agents/research";
import { askDocument, summarizeDocument, compareDocuments } from "@/lib/agents/documents";
import {
  createAutomation,
  listAutomations,
  toggleAutomation,
} from "@/lib/agents/automation";
import { hasPermission } from "@/lib/permissions";

// The CORE's tool registry. Each tool maps 1:1 to a capability described in
// the product spec, and to a specialized agent module. Claude picks which
// tool(s) to call; execute() below is the only place that actually mutates
// state, so every effect is auditable and permission-gated in one spot.

export const TOOLS: ToolDefinition[] = [
  {
    name: "remember_information",
    description:
      "Mémorise durablement une information sur l'utilisateur (préférence, projet, habitude, objectif, personne importante). Utilise ceci quand l'utilisateur dit explicitement de se souvenir de quelque chose, ou partage une information manifestement utile à retenir.",
    input_schema: {
      type: "object",
      properties: {
        key: { type: "string", description: "Libellé court, ex. 'Projet principal'" },
        value: { type: "string", description: "Le contenu à retenir" },
        category: {
          type: "string",
          enum: ["preference", "project", "person", "habit", "goal", "general"],
        },
      },
      required: ["key", "value"],
    },
  },
  {
    name: "recall_information",
    description: "Recherche dans la mémoire long terme de l'utilisateur des souvenirs pertinents.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "web_search",
    description:
      "Recherche des informations actuelles sur Internet. À utiliser pour toute question portant sur l'actualité, des faits récents, ou des informations que tu ne peux pas connaître avec certitude.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
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
        due_at: { type: "string", description: "Date ISO 8601, optionnelle" },
      },
      required: ["title"],
    },
  },
  {
    name: "list_tasks",
    description: "Liste les tâches de l'utilisateur, éventuellement filtrées par statut.",
    input_schema: {
      type: "object",
      properties: { status: { type: "string", enum: ["pending", "in_progress", "done"] } },
    },
  },
  {
    name: "update_task_status",
    description: "Met à jour le statut d'une tâche existante.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "done"] },
      },
      required: ["task_id", "status"],
    },
  },
  {
    name: "create_reminder",
    description: "Crée un rappel à une date/heure donnée.",
    input_schema: {
      type: "object",
      properties: {
        text: { type: "string" },
        remind_at: { type: "string", description: "Date ISO 8601" },
      },
      required: ["text", "remind_at"],
    },
  },
  {
    name: "list_reminders",
    description: "Liste les rappels à venir de l'utilisateur.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "list_files",
    description:
      "Liste les fichiers/documents déjà importés par l'utilisateur (nécessaire pour retrouver l'identifiant d'un fichier avant de l'analyser).",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "analyze_document",
    description:
      "Résume un document déjà importé, ou répond à une question précise à son sujet. Fournis file_id (obtenu via list_files).",
    input_schema: {
      type: "object",
      properties: {
        file_id: { type: "string" },
        question: { type: "string", description: "Question précise ; omis pour un simple résumé" },
      },
      required: ["file_id"],
    },
  },
  {
    name: "compare_documents",
    description: "Compare plusieurs documents déjà importés entre eux.",
    input_schema: {
      type: "object",
      properties: {
        file_ids: { type: "array", items: { type: "string" }, minItems: 2 },
      },
      required: ["file_ids"],
    },
  },
  {
    name: "create_automation",
    description:
      "Crée une automatisation récurrente (ex. briefing quotidien) ou déclenchée par un événement (ex. analyse automatique des fichiers importés). Demande toujours confirmation explicite à l'utilisateur avant d'appeler cet outil, car l'automatisation agira ensuite sans supervision.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        trigger: { type: "string", enum: ["cron", "event"] },
        schedule: {
          type: "string",
          description: "Expression cron à 5 champs, requise si trigger = cron. Ex. '0 8 * * *' pour tous les jours à 8h.",
        },
        event: {
          type: "string",
          enum: ["file_uploaded"],
          description: "Requis si trigger = event.",
        },
        action_type: {
          type: "string",
          enum: ["briefing", "priorities", "reminder", "analyze_file"],
        },
        action_input: {
          type: "object",
          description: "Paramètres additionnels de l'action, ex. { text } pour un rappel.",
        },
      },
      required: ["name", "trigger", "action_type"],
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
      properties: { automation_id: { type: "string" }, enabled: { type: "boolean" } },
      required: ["automation_id", "enabled"],
    },
  },
];

export interface ToolExecutionResult {
  output: unknown;
  label: string; // human-readable summary shown in the UI's "actions performed" trail
}

export async function executeTool(
  userId: string,
  name: string,
  input: Record<string, unknown>
): Promise<ToolExecutionResult> {
  switch (name) {
    case "remember_information": {
      if (!(await hasPermission(userId, "memory_write"))) {
        return { output: { error: "Permission mémoire désactivée." }, label: "Mémorisation refusée (permission)" };
      }
      const memory = await rememberInfo(
        userId,
        String(input.key),
        String(input.value),
        (input.category as string) || "general"
      );
      return { output: memory, label: `Souvenir enregistré : ${memory.key}` };
    }
    case "recall_information": {
      const memories = await recallInfo(userId, String(input.query));
      return { output: memories, label: `Mémoire consultée (${memories.length} résultat(s))` };
    }
    case "web_search": {
      if (!(await hasPermission(userId, "web_search"))) {
        return { output: { error: "Permission recherche web désactivée." }, label: "Recherche web refusée (permission)" };
      }
      const results = await webSearch(userId, String(input.query));
      return { output: results, label: "Recherche web effectuée" };
    }
    case "create_task": {
      const task = await createTask(userId, String(input.title), {
        description: input.description as string | undefined,
        priority: input.priority as string | undefined,
        dueAt: input.due_at as string | undefined,
      });
      return { output: task, label: `Tâche créée : ${task.title}` };
    }
    case "list_tasks": {
      const tasks = await listTasks(userId, input.status as string | undefined);
      return { output: tasks, label: `Tâches consultées (${tasks.length})` };
    }
    case "update_task_status": {
      await updateTaskStatus(userId, String(input.task_id), String(input.status));
      return { output: { ok: true }, label: "Tâche mise à jour" };
    }
    case "create_reminder": {
      const reminder = await createReminder(userId, String(input.text), String(input.remind_at));
      return { output: reminder, label: `Rappel créé : ${reminder.text}` };
    }
    case "list_reminders": {
      const reminders = await listReminders(userId);
      return { output: reminders, label: `Rappels consultés (${reminders.length})` };
    }
    case "list_files": {
      const files = await prisma.fileAsset.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, filename: true, kind: true, createdAt: true, summary: true },
      });
      return { output: files, label: `Fichiers consultés (${files.length})` };
    }
    case "analyze_document": {
      if (!(await hasPermission(userId, "file_access"))) {
        return { output: { error: "Permission fichiers désactivée." }, label: "Analyse refusée (permission)" };
      }
      const fileId = String(input.file_id);
      const answer = input.question
        ? await askDocument(userId, fileId, String(input.question))
        : await summarizeDocument(userId, fileId);
      return { output: { answer }, label: "Document analysé" };
    }
    case "compare_documents": {
      if (!(await hasPermission(userId, "file_access"))) {
        return { output: { error: "Permission fichiers désactivée." }, label: "Comparaison refusée (permission)" };
      }
      const answer = await compareDocuments(userId, input.file_ids as string[]);
      return { output: { answer }, label: "Documents comparés" };
    }
    case "create_automation": {
      if (!(await hasPermission(userId, "automation_execution"))) {
        return { output: { error: "Permission automatisations désactivée." }, label: "Automatisation refusée (permission)" };
      }
      const automation = await createAutomation(userId, {
        name: String(input.name),
        description: input.description as string | undefined,
        trigger: input.trigger as "cron" | "event",
        schedule: input.schedule as string | undefined,
        event: input.event as string | undefined,
        actionType: String(input.action_type),
        actionInput: input.action_input as Record<string, unknown> | undefined,
      });
      return { output: automation, label: `Automatisation créée : ${automation.name}` };
    }
    case "list_automations": {
      const automations = await listAutomations(userId);
      return { output: automations, label: `Automatisations consultées (${automations.length})` };
    }
    case "toggle_automation": {
      await toggleAutomation(userId, String(input.automation_id), Boolean(input.enabled));
      return { output: { ok: true }, label: "Automatisation mise à jour" };
    }
    default:
      return { output: { error: `Outil inconnu: ${name}` }, label: "Erreur outil" };
  }
}
