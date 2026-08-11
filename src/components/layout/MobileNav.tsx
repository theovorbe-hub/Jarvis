"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "./nav-items";

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="glass-strong fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-jarvis-panel-border px-1 py-2 md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px]",
              active ? "text-jarvis-cyan-strong" : "text-jarvis-text-dim"
            )}
          >
            <Icon size={19} strokeWidth={1.75} />
            <span className="truncate">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
