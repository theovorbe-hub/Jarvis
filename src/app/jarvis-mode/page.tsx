import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { FullscreenJarvis } from "@/components/FullscreenJarvis";

export default async function JarvisModePage() {
  const session = await getServerSession(authOptions);
  return <FullscreenJarvis userName={session?.user?.name ?? null} />;
}
