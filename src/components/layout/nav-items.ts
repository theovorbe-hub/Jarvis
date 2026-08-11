import type { LucideIcon } from "lucide-react";
import { Sparkles, LayoutDashboard, BrainCircuit, ListChecks, FileStack, Workflow, ShieldCheck } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "JARVIS", icon: Sparkles },
  { href: "/dashboard", label: "Centre de contrôle", icon: LayoutDashboard },
  { href: "/memory", label: "Mémoire", icon: BrainCircuit },
  { href: "/tasks", label: "Tâches & rappels", icon: ListChecks },
  { href: "/files", label: "Documents & vision", icon: FileStack },
  { href: "/automations", label: "Automatisations", icon: Workflow },
  { href: "/security", label: "Sécurité & permissions", icon: ShieldCheck },
];
