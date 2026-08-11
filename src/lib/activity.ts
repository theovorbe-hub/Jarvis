import { prisma } from "@/lib/prisma";

export type ActivityCategory =
  | "research"
  | "memory"
  | "document"
  | "vision"
  | "task"
  | "reminder"
  | "automation"
  | "auth"
  | "permission";

export async function logActivity(
  userId: string,
  action: string,
  category: ActivityCategory,
  detail?: string,
  metadata?: Record<string, unknown>
) {
  return prisma.activityLog.create({
    data: {
      userId,
      action,
      category,
      detail,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}
