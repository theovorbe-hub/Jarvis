"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Maximize2, LogOut } from "lucide-react";
import { NAV_ITEMS } from "./nav-items";
import clsx from "clsx";

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="glass sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-jarvis-panel-border px-4 py-6 md:flex">
      <Link href="/" className="mb-8 flex items-center gap-3 px-2">
        <div className="relative h-9 w-9">
          <div className="absolute inset-0 animate-soft-glow rounded-full bg-gradient-to-br from-jarvis-cyan to-jarvis-blue opacity-70 blur-md" />
          <div className="glass-strong relative flex h-9 w-9 items-center justify-center rounded-full">
            <span className="font-display text-sm font-semibold text-jarvis-cyan-strong">J</span>
          </div>
        </div>
        <span className="font-display text-lg font-semibold tracking-wide">JARVIS</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "glass-strong border-glow text-jarvis-cyan-strong"
                  : "text-jarvis-text-dim hover:bg-white/5 hover:text-jarvis-text"
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-jarvis-panel-border pt-4">
        <Link
          href="/jarvis"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-jarvis-text-dim transition-colors hover:bg-white/5 hover:text-jarvis-text"
        >
          <Maximize2 size={18} strokeWidth={1.75} />
          Mode plein écran
        </Link>
        <div className="flex items-center justify-between px-3 py-2 text-sm text-jarvis-text-dim">
          <span className="truncate">{userName}</span>
          <button onClick={logout} title="Se déconnecter" className="text-jarvis-text-dim hover:text-jarvis-danger">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
