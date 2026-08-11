import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { runAgent } from "@/lib/ai/agent";
import { logActivity } from "@/lib/activity";
import { AIConfigError } from "@/lib/ai";

const schema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1),
  imageBase64: z.string().optional(),
  imageMimeType: z.string().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }
  const { message, imageBase64, imageMimeType } = parsed.data;
  let conversationId = parsed.data.conversationId;

  if (!conversationId) {
    const conversation = await prisma.conversation.create({
      data: { userId: user.id, title: message.slice(0, 60) },
    });
    conversationId = conversation.id;
  }

  const attachments = imageBase64
    ? JSON.stringify([{ type: "image", mimeType: imageMimeType }])
    : undefined;

  await prisma.message.create({
    data: { conversationId, role: "user", content: message, attachments },
  });

  try {
    const result = await runAgent({
      userId: user.id,
      userName: user.name,
      conversationId,
      userMessage: message,
      images: imageBase64 ? [{ base64: imageBase64, mimeType: imageMimeType ?? "image/jpeg" }] : undefined,
    });

    await prisma.message.create({
      data: {
        conversationId,
        role: "assistant",
        content: result.text,
        toolCalls: result.toolCalls.length ? JSON.stringify(result.toolCalls) : null,
        sources: result.sources.length ? JSON.stringify(result.sources) : null,
      },
    });

    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    await logActivity(user.id, "core", "Message traité", message.slice(0, 80));

    return NextResponse.json({
      conversationId,
      reply: result.text,
      toolCalls: result.toolCalls,
      sources: result.sources,
    });
  } catch (err) {
    if (err instanceof AIConfigError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    console.error(err);
    return NextResponse.json({ error: "JARVIS a rencontré une erreur. Réessayez." }, { status: 500 });
  }
}
