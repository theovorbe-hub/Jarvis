import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userName={user.name} />
      <KeyboardShortcuts />
      <main className="relative flex-1 overflow-y-auto pb-16 md:pb-0">{children}</main>
      <MobileTabBar />
    </div>
  );
}
