import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const connections = await prisma.connection.findMany({
    where: { userId: user.id },
    orderBy: { provider: "asc" },
  });
  return NextResponse.json({ connections });
}
