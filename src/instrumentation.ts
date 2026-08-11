export async function register() {
  // Only start the cron scheduler in the actual Node.js server process
  // (never in the edge runtime used for middleware, and never at build time).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/automation/scheduler");
    startScheduler();
  }
}
