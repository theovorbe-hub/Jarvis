import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ai } from "@/lib/ai";
import type { AIContentBlock, AIMessage } from "@/lib/ai/provider";
import { TOOLS, executeTool } from "@/lib/ai/tools";
import { JARVIS_PERSONA } from "@/lib/agents/core";

const HISTORY_LIMIT = 16;
const MAX_TOOL_ITERATIONS = 6;

export async function POST(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const message: string = body?.message?.trim();
  const conversationId: string | undefined = body?.conversationId;
  const imageFileId: string | undefined = body?.imageFileId;

  if (!message) {
    return NextResponse.json({ error: "Message vide." }, { status: 400 });
  }

  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId } })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { userId, title: message.slice(0, 60) },
    });
  }

  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  history.reverse();

  const historyMessages: AIMessage[] = history.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));

  // Build the new user turn, attaching an image block if one was provided.
  let userContent: AIMessage["content"] = message;
  if (imageFileId) {
    const file = await prisma.fileAsset.findFirst({ where: { id: imageFileId, userId } });
    if (file && file.kind === "image") {
      const buffer = await fs.readFile(file.storagePath);
      userContent = [
        { type: "image", source: { type: "base64", media_type: file.mimeType, data: buffer.toString("base64") } },
        { type: "text", text: message },
      ];
    }
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
      imageUrl: imageFileId ?? null,
    },
  });

  const workingMessages: AIMessage[] = [...historyMessages, { role: "user", content: userContent }];

  const performedActions: string[] = [];
  const sources: unknown[] = [];
  let finalText = "";

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    let response;
    try {
      response = await ai.chat({ system: JARVIS_PERSONA, messages: workingMessages, tools: TOOLS });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Erreur du moteur IA.";
      return NextResponse.json({ error: errMsg }, { status: 502 });
    }

    if (response.toolUses.length === 0) {
      finalText = response.textOutput;
      break;
    }

    workingMessages.push({ role: "assistant", content: response.content });

    const toolResults: AIContentBlock[] = [];
    for (const toolUse of response.toolUses) {
      try {
        const result = await executeTool(userId, toolUse.name, toolUse.input);
        performedActions.push(result.label);
        if (toolUse.name === "web_search") sources.push(...(result.output as unknown[]));
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result.output),
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Erreur outil.";
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify({ error: errMsg }),
          is_error: true,
        });
      }
    }
    workingMessages.push({ role: "user", content: toolResults });

    if (i === MAX_TOOL_ITERATIONS - 1) {
      finalText =
        response.textOutput || "J'ai effectué plusieurs actions mais je n'ai pas pu conclure. Pouvez-vous préciser votre demande ?";
    }
  }

  const assistantMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: finalText,
      toolCalls: performedActions.length ? JSON.stringify(performedActions) : null,
      sources: sources.length ? JSON.stringify(sources) : null,
    },
  });

  if (conversation.title === "Nouvelle conversation") {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { title: message.slice(0, 60) },
    });
  }

  return NextResponse.json({
    conversationId: conversation.id,
    message: {
      id: assistantMessage.id,
      role: "assistant",
      content: finalText,
      actions: performedActions,
      sources,
      createdAt: assistantMessage.createdAt,
    },
  });
}

export async function GET(req: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, title: true, updatedAt: true },
    });
    return NextResponse.json({ conversations });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) return NextResponse.json({ error: "Introuvable." }, { status: 404 });
  return NextResponse.json({ conversation });
}
