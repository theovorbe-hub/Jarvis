"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  BrainCircuit,
  ListChecks,
  FileText,
  Workflow,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/jarvis", label: "JARVIS", icon: Sparkles },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/memory", label: "Mémoire", icon: BrainCircuit },
  { href: "/tasks", label: "Tâches", icon: ListChecks },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/automations", label: "Automatisations", icon: Workflow },
  { href: "/security", label: "Sécurité", icon: ShieldCheck },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="glass hidden w-60 shrink-0 flex-col border-r border-white/5 p-4 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="h-8 w-8 rounded-full border border-cyan-glow/50 shadow-glow-sm" />
        <div>
          <p className="text-sm font-semibold tracking-wide text-glow">JARVIS</p>
          <p className="text-[11px] text-white/40">Bonjour, {userName}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-cyan-glow/10 text-cyan-glow shadow-glow-sm"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/5 pt-4">
        <p className="px-2 text-[11px] text-white/30">
          <kbd className="rounded bg-white/10 px-1.5 py-0.5">⌘/Ctrl J</kbd> ouvrir JARVIS
        </p>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-red-300"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
