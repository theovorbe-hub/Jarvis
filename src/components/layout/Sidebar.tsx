"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Bot,
  LayoutDashboard,
  BrainCircuit,
  Workflow,
  ShieldCheck,
  Maximize2,
  LogOut,
  FileText,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "JARVIS", icon: Bot },
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/memory", label: "Mémoire", icon: BrainCircuit },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/automations", label: "Automatisations", icon: Workflow },
  { href: "/security", label: "Sécurité", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[76px] flex-col items-center justify-between border-r border-white/[0.06] bg-void-900/60 py-6 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-1">
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-electric-400 to-cyan-500 shadow-glow-sm">
          <Bot className="h-5 w-5 text-void-950" />
        </div>

        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={clsx(
                "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all",
                active ? "bg-electric-500/15 text-electric-300" : "text-white/40 hover:bg-white/[0.06] hover:text-white/80"
              )}
            >
              <Icon className="h-5 w-5" />
              {active && <span className="absolute -left-[13px] h-5 w-[3px] rounded-full bg-electric-400" />}
              <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-void-800 px-2.5 py-1.5 text-xs text-white/80 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1">
        <Link
          href="/jarvis-mode"
          title="Mode plein écran"
          className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-white/40 transition-all hover:bg-white/[0.06] hover:text-white/80"
        >
          <Maximize2 className="h-5 w-5" />
          <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-lg bg-void-800 px-2.5 py-1.5 text-xs text-white/80 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            JARVIS Mode
          </span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Déconnexion"
          className="group relative flex h-11 w-11 items-center justify-center rounded-xl text-white/40 transition-all hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </aside>
  );
}
