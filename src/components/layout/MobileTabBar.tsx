"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LayoutDashboard, BrainCircuit, ListChecks, ShieldCheck } from "lucide-react";

const NAV = [
  { href: "/jarvis", label: "JARVIS", icon: Sparkles },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/memory", label: "Mémoire", icon: BrainCircuit },
  { href: "/tasks", label: "Tâches", icon: ListChecks },
  { href: "/security", label: "Sécurité", icon: ShieldCheck },
];

export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/10 px-2 py-2 md:hidden">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] ${
              active ? "text-cyan-glow" : "text-white/50"
            }`}
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
