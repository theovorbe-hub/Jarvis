import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const permissions = await prisma.permission.findMany({
    where: { userId: user.id },
    orderBy: { category: "asc" },
  });
  return NextResponse.json({ permissions });
}
