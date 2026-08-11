import { prisma } from "@/lib/prisma";

export type ActivityModule =
  | "core"
  | "research"
  | "memory"
  | "vision"
  | "documents"
  | "automation"
  | "planner"
  | "voice"
  | "security";

export async function logActivity(
  userId: string,
  module: ActivityModule,
  action: string,
  detail?: string
) {
  return prisma.activityLog.create({
    data: { userId, module, action, detail },
  });
}
