import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { logActivity } from "@/lib/activity";

const schema = z.object({
  name: z.string().trim().min(1, "Le prénom est requis").max(100),
  email: z.string().trim().toLowerCase().email("Adresse email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Requête invalide" },
      { status: 400 }
    );
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Un compte existe déjà avec cet email" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash,
      settings: { create: {} },
      permissions: {
        create: DEFAULT_PERMISSIONS.map((p) => ({
          key: p.key,
          label: p.label,
          description: p.description,
          sensitive: p.sensitive,
          granted: p.granted,
        })),
      },
    },
  });

  await logActivity({
    userId: user.id,
    agent: "core",
    action: "Compte créé",
    detail: `Bienvenue ${name}.`,
  });

  await createSession({ userId: user.id, email: user.email });

  return NextResponse.json({ id: user.id, name: user.name, email: user.email });
}
