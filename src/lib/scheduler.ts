import { CronExpressionParser } from "cron-parser";
import { db } from "@/lib/db";
import { runAutomation } from "@/lib/agents/automation-runner";

const TICK_MS = 60_000;
let started = false;

export function startScheduler() {
  if (started) return;
  started = true;
  console.log("[scheduler] JARVIS automation scheduler started");
  setInterval(() => {
    void tick();
  }, TICK_MS);
  setTimeout(() => void tick(), 5_000);
}

async function tick() {
  let automations;
  try {
    automations = await db.automation.findMany({ where: { enabled: true, triggerType: "schedule" } });
  } catch (err) {
    console.error("[scheduler] failed to load automations", err);
    return;
  }

  const now = new Date();
  for (const automation of automations) {
    try {
      const interval = CronExpressionParser.parse(automation.trigger, {
        currentDate: automation.lastRunAt ?? automation.createdAt,
      });
      const next = interval.next().toDate();
      if (next.getTime() <= now.getTime()) {
        await runAutomation(automation);
      }
    } catch (err) {
      console.error(`[scheduler] automation ${automation.id} failed`, err);
    }
  }
}
