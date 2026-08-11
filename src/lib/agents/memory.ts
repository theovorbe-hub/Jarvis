import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";

export async function remember(userId: string, input: { title: string; content: string; category?: string }) {
  const memory = await db.memory.create({
    data: {
      userId,
      title: input.title,
      content: input.content,
      category: input.category ?? "general",
    },
  });
  await logActivity({
    userId,
    agent: "memory",
    action: "Souvenir enregistré",
    detail: input.title,
  });
  return { ok: true, memory };
}

export async function recallMemories(userId: string, query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const all = await db.memory.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } });
  const scored = all
    .map((m) => {
      const haystack = `${m.title} ${m.content} ${m.category}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (haystack.includes(t) ? 1 : 0), 0);
      return { m, score };
    })
    .filter((x) => x.score > 0 || terms.length === 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((x) => x.m);

  await logActivity({
    userId,
    agent: "memory",
    action: "Recherche dans la mémoire",
    detail: query,
  });

  return scored;
}

export async function listMemories(userId: string, category?: string) {
  return db.memory.findMany({
    where: { userId, ...(category ? { category } : {}) },
    orderBy: { updatedAt: "desc" },
  });
}

export async function deleteMemory(userId: string, id: string) {
  const memory = await db.memory.findFirst({ where: { id, userId } });
  if (!memory) return { ok: false, error: "Souvenir introuvable" };
  await db.memory.delete({ where: { id } });
  await logActivity({ userId, agent: "memory", action: "Souvenir supprimé", detail: memory.title });
  return { ok: true };
}

export async function memoriesSummaryForPrompt(userId: string) {
  const memories = await db.memory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });
  if (memories.length === 0) return "";
  return memories.map((m) => `- [${m.category}] ${m.title}: ${m.content}`).join("\n");
}
