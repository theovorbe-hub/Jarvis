import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let permissions = await db.permission.findMany({ where: { userId: user.id }, orderBy: { key: "asc" } });

  if (permissions.length === 0) {
    await db.permission.createMany({
      data: DEFAULT_PERMISSIONS.map((p) => ({ userId: user.id, ...p })),
    });
    permissions = await db.permission.findMany({ where: { userId: user.id }, orderBy: { key: "asc" } });
  }

  return NextResponse.json({ permissions });
}
