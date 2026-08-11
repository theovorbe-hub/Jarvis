import { requireUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { FullscreenJarvis } from "@/components/jarvis/FullscreenJarvis";

export default async function JarvisFullscreenPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  return <FullscreenJarvis userName={user.name} />;
}
