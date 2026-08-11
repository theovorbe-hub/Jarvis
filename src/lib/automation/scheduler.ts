import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { executeAutomation } from "./actions";

// Best-effort in-process cron scheduler. It keeps registered jobs in sync
// with the Automation table every minute — good enough for a self-hosted
// `next start` server (a single long-lived Node process). It intentionally
// does not try to survive a serverless/edge deployment; a production
// deployment would swap this for a durable queue (e.g. a hosted cron
// trigger calling a /api/automations/run endpoint).

const registered = new Map<string, { schedule: string; task: ScheduledTask }>();
let started = false;

async function syncSchedules() {
  const automations = await prisma.automation.findMany({
    where: { trigger: "cron", enabled: true },
  });
  const liveIds = new Set(automations.map((a) => a.id));

  // Stop jobs that were deleted or disabled since the last sync.
  for (const [id, entry] of registered) {
    if (!liveIds.has(id)) {
      entry.task.stop();
      registered.delete(id);
    }
  }

  for (const automation of automations) {
    if (!automation.schedule || !cron.validate(automation.schedule)) continue;
    const existing = registered.get(automation.id);
    if (existing && existing.schedule === automation.schedule) continue;

    existing?.task.stop();
    const task = cron.schedule(automation.schedule, () => {
      executeAutomation(automation).catch((err) =>
        console.error(`[automation] échec de "${automation.name}":`, err)
      );
    });
    registered.set(automation.id, { schedule: automation.schedule, task });
  }
}

export function startScheduler() {
  if (started) return;
  started = true;
  syncSchedules().catch((err) => console.error("[scheduler] sync initiale échouée:", err));
  // Re-sync every minute so newly created/edited/toggled automations pick up
  // without a server restart.
  cron.schedule("* * * * *", () => {
    syncSchedules().catch((err) => console.error("[scheduler] sync échouée:", err));
  });
  console.log("[scheduler] JARVIS automation scheduler démarré.");
}
