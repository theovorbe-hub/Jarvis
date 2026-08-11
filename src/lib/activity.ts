import { db } from "@/lib/db";

export type AgentName =
  | "core"
  | "research"
  | "memory"
  | "vision"
  | "documents"
  | "automation"
  | "planner"
  | "voice";

export async function logActivity(params: {
  userId: string;
  agent: AgentName;
  action: string;
  detail?: string;
  status?: "success" | "error" | "pending_confirmation";
}) {
  return db.activityLog.create({
    data: {
      userId: params.userId,
      agent: params.agent,
      action: params.action,
      detail: params.detail,
      status: params.status ?? "success",
    },
  });
}
