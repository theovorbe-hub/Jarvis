import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { runJarvis, type ChatTurn } from "@/lib/agents/core";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  message: z.string().trim().min(1).max(8000),
  conversationId: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { message, conversationId } = parsed.data;

  let conversation = conversationId
    ? await db.conversation.findFirst({ where: { id: conversationId, userId: user.id } })
    : null;

  if (!conversation) {
    conversation = await db.conversation.create({
      data: {
        userId: user.id,
        title: message.slice(0, 60),
      },
    });
  }

  const priorMessages = await db.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  const history: ChatTurn[] = priorMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  await db.message.create({
    data: { conversationId: conversation.id, role: "user", content: message },
  });

  const result = await runJarvis({
    userId: user.id,
    userName: user.name,
    history,
    userMessage: message,
  });

  await db.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: result.reply,
      toolCalls: result.actions.length ? JSON.stringify(result.actions) : null,
      sources: result.sources.length ? JSON.stringify(result.sources) : null,
    },
  });

  await db.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  await logActivity({
    userId: user.id,
    agent: "core",
    action: "Message traité",
    detail: result.actions.length ? `${result.actions.length} action(s) exécutée(s)` : undefined,
  });

  return NextResponse.json({
    conversationId: conversation.id,
    reply: result.reply,
    actions: result.actions,
    sources: result.sources,
  });
}
