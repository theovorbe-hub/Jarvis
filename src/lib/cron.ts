import cron, { ScheduledTask } from "node-cron";
import { prisma } from "@/lib/prisma";
import { runAutomationNow } from "@/lib/automationRunner";

const scheduled = new Map<string, ScheduledTask>();
let syncing = false;
let started = false;

async function syncAutomations() {
  if (syncing) return;
  syncing = true;
  try {
    const automations = await prisma.automation.findMany();
    const liveIds = new Set(automations.map((a) => a.id));

    for (const [id, task] of scheduled) {
      if (!liveIds.has(id)) {
        task.stop();
        scheduled.delete(id);
      }
    }

    for (const automation of automations) {
      const key = `${automation.id}:${automation.schedule}:${automation.enabled}`;
      const existingKey = (scheduled.get(automation.id) as unknown as { __key?: string })?.__key;
      if (scheduled.has(automation.id) && existingKey === key) continue;

      scheduled.get(automation.id)?.stop();
      scheduled.delete(automation.id);

      if (!automation.enabled || !cron.validate(automation.schedule)) continue;

      const task = cron.schedule(automation.schedule, () => {
        runAutomationNow(automation.id).catch((err) =>
          console.error(`[cron] automation ${automation.id} failed:`, err)
        );
      });
      (task as unknown as { __key?: string }).__key = key;
      scheduled.set(automation.id, task);
    }
  } catch (err) {
    console.error("[cron] sync failed:", err);
  } finally {
    syncing = false;
  }
}

/** Starts the automation scheduler once per server process. Safe to call multiple times. */
export function startAutomationScheduler() {
  if (started) return;
  started = true;

  syncAutomations();
  setInterval(syncAutomations, 60_000);
}
