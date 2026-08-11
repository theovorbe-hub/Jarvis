"use client";

import { Search, BrainCircuit, Eye, FileText, Workflow, ListChecks, Mic, Sparkles } from "lucide-react";
import clsx from "clsx";

const AGENT_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  core: Sparkles,
  research: Search,
  memory: BrainCircuit,
  vision: Eye,
  documents: FileText,
  automation: Workflow,
  planner: ListChecks,
  voice: Mic,
};

export type ActivityItem = {
  id: string;
  agent: string;
  action: string;
  detail?: string | null;
  status: string;
  createdAt: string;
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-jarvis-text-dim">Aucune activité récente.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => {
        const Icon = AGENT_ICON[item.agent] ?? Sparkles;
        return (
          <div key={item.id} className="flex items-start gap-3">
            <div
              className={clsx(
                "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                item.status === "error" ? "bg-jarvis-danger/15 text-jarvis-danger" : "bg-jarvis-cyan/10 text-jarvis-cyan-strong"
              )}
            >
              <Icon size={13} />
            </div>
            <div className="flex-1">
              <p className="text-sm">{item.action}</p>
              {item.detail && <p className="text-xs text-jarvis-text-dim">{item.detail}</p>}
            </div>
            <span className="shrink-0 text-[11px] text-jarvis-text-dim/70">
              {new Date(item.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
