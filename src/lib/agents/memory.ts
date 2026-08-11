import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activity";

// MEMORY agent — owns everything related to long-term recall of user
// preferences, projects, habits, goals and important people.

export async function rememberInfo(
  userId: string,
  key: string,
  value: string,
  category = "general"
) {
  const existing = await prisma.memory.findFirst({
    where: { userId, key: { equals: key } },
  });

  const memory = existing
    ? await prisma.memory.update({
        where: { id: existing.id },
        data: { value, category },
      })
    : await prisma.memory.create({
        data: { userId, key, value, category },
      });

  await logActivity(userId, `Souvenir enregistré : « ${key} »`, "memory", value);
  return memory;
}

export async function recallInfo(userId: string, query: string) {
  const memories = await prisma.memory.findMany({
    where: {
      userId,
      OR: [
        { key: { contains: query } },
        { value: { contains: query } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });
  return memories;
}

export async function listMemories(userId: string) {
  return prisma.memory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function deleteMemory(userId: string, id: string) {
  await prisma.memory.deleteMany({ where: { id, userId } });
}
