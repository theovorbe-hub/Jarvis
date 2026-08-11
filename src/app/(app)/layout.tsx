import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { KeyboardShortcuts } from "@/components/layout/KeyboardShortcuts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  return (
    <div className="relative flex min-h-screen w-full">
      <div className="grid-backdrop pointer-events-none fixed inset-0 -z-10" />
      <Sidebar userName={user.name} />
      <main className="flex min-h-screen flex-1 flex-col pb-16 md:pb-0">{children}</main>
      <MobileNav />
      <KeyboardShortcuts />
    </div>
  );
}
