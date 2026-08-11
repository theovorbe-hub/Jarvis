import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, verifyPassword, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";
import { rm } from "node:fs/promises";
import path from "node:path";

const schema = z.object({ password: z.string().min(1) });

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 401 });

  await db.user.delete({ where: { id: user.id } });
  await rm(path.join(process.cwd(), "uploads", user.id), { recursive: true, force: true });
  await destroySession();

  return NextResponse.json({ ok: true });
}
