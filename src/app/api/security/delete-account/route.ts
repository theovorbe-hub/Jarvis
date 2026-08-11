import { NextResponse } from "next/server";
import { requireUserId, SESSION_COOKIE_NAME } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import fs from "node:fs/promises";
import path from "node:path";

// Full account deletion. Cascading foreign keys in the Prisma schema take
// care of conversations, messages, memories, tasks, reminders, automations,
// files, connections, permissions and the activity log in one transaction.
export async function POST() {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const uploadsDir = path.join(process.env.UPLOADS_DIR || "./uploads", userId);
  await fs.rm(uploadsDir, { recursive: true, force: true }).catch(() => {});

  await prisma.user.delete({ where: { id: userId } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE_NAME, value: "", path: "/", maxAge: 0 });
  return res;
}
