export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: { name: string; input: Record<string, unknown>; result: unknown }[] | null;
  sources?: { title: string; url: string; source: string }[] | null;
  attachments?: { type: string; mimeType?: string }[] | null;
  createdAt: string;
  pending?: boolean;
}

export const TOOL_LABELS: Record<string, string> = {
  remember: "Souvenir enregistré",
  recall_memory: "Mémoire consultée",
  forget: "Souvenir supprimé",
  create_task: "Tâche créée",
  list_tasks: "Tâches consultées",
  complete_task: "Tâche terminée",
  create_reminder: "Rappel créé",
  list_reminders: "Rappels consultés",
  web_search: "Recherche web effectuée",
  list_files: "Documents consultés",
  get_file_content: "Document analysé",
  create_automation: "Automatisation créée",
  list_automations: "Automatisations consultées",
};
