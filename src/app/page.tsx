import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { JarvisHome } from "@/components/JarvisHome";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  return (
    <AppShell>
      <JarvisHome userName={session?.user?.name ?? null} />
    </AppShell>
  );
}
