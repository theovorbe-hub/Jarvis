import { requireUser } from "@/lib/auth";
import { ChatPanel } from "@/components/jarvis/ChatPanel";

export default async function HomePage() {
  const user = await requireUser();

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between px-6 pt-6 md:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Centre de contrôle</p>
          <h1 className="font-display text-xl font-semibold">Bonjour, {user?.name}.</h1>
        </div>
      </header>
      <ChatPanel />
    </div>
  );
}
