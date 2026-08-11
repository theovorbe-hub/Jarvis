"use client";

import { useEffect, useState } from "react";
import {
  Cloud,
  CheckSquare,
  Square,
  Bell,
  Plus,
  Wifi,
  WifiOff,
  BatteryMedium,
  HardDrive,
  Link2,
  Activity as ActivityIcon,
  Loader2,
} from "lucide-react";
import { useSystemStatus } from "@/hooks/useSystemStatus";

interface Task {
  id: string;
  title: string;
  done: boolean;
  priority: string;
  dueDate: string | null;
}
interface Reminder {
  id: string;
  title: string;
  remindAt: string;
  done: boolean;
}
interface ActivityLog {
  id: string;
  module: string;
  action: string;
  detail: string | null;
  createdAt: string;
}
interface Connection {
  id: string;
  label: string;
  status: string;
}
interface DashboardData {
  weather: { temperature: number; feelsLike: number; condition: string; city: string } | null;
  tasks: Task[];
  reminders: Reminder[];
  activity: ActivityLog[];
  connections: Connection[];
}

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [now, setNow] = useState(new Date());
  const [newTask, setNewTask] = useState("");
  const [addingTask, setAddingTask] = useState(false);
  const system = useSystemStatus();

  async function refresh() {
    const res = await fetch("/api/dashboard");
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    refresh();
    const clock = setInterval(() => setNow(new Date()), 1000);
    const poll = setInterval(refresh, 30000);
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, []);

  async function toggleTask(task: Task) {
    setData((d) => (d ? { ...d, tasks: d.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) } : d));
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    refresh();
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    setAddingTask(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTask.trim() }),
    });
    setNewTask("");
    setAddingTask(false);
    refresh();
  }

  const connectedCount = data?.connections.filter((c) => c.status === "connected").length ?? 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-glow">Centre de contrôle</h1>
        <p className="text-sm text-white/40">Votre journée, votre système, votre activité.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* AUJOURD'HUI */}
        <section className="card space-y-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="label-caps">Aujourd&apos;hui</h2>
            <span className="text-xs text-white/40">
              {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          <div className="flex items-end justify-between">
            <div className="text-4xl font-semibold tabular-nums text-glow">
              {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </div>
            {data?.weather && (
              <div className="flex items-center gap-2 text-right">
                <Cloud className="h-5 w-5 text-electric-300" />
                <div>
                  <p className="text-lg font-medium">{data.weather.temperature}°C</p>
                  <p className="text-xs text-white/40">
                    {data.weather.condition} · {data.weather.city}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="label-caps mb-2">Tâches prioritaires</p>
              <div className="space-y-1.5">
                {!data && <Loader2 className="h-4 w-4 animate-spin text-white/30" />}
                {data?.tasks.length === 0 && <p className="text-xs text-white/30">Aucune tâche en cours.</p>}
                {data?.tasks.slice(0, 6).map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task)}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-white/70 hover:bg-white/[0.04]"
                  >
                    {task.done ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-electric-400" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-white/30" />
                    )}
                    <span className={task.done ? "line-through text-white/30" : ""}>{task.title}</span>
                    {task.priority === "high" && !task.done && (
                      <span className="ml-auto rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-300">
                        Priorité
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <form onSubmit={addTask} className="mt-2 flex gap-1.5">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Ajouter une tâche…"
                  className="input-field !py-1.5 text-sm"
                />
                <button type="submit" disabled={addingTask} className="btn-ghost !px-2.5 !py-1.5">
                  <Plus className="h-4 w-4" />
                </button>
              </form>
            </div>

            <div>
              <p className="label-caps mb-2">Rappels</p>
              <div className="space-y-1.5">
                {data?.reminders.length === 0 && <p className="text-xs text-white/30">Aucun rappel à venir.</p>}
                {data?.reminders.slice(0, 6).map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/70">
                    <Bell className="h-4 w-4 shrink-0 text-cyan-300" />
                    <span>{r.title}</span>
                    <span className="ml-auto text-xs text-white/30">
                      {new Date(r.remindAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SYSTÈME */}
        <section className="card space-y-4">
          <h2 className="label-caps">Système</h2>

          <StatusRow
            icon={system.online ? Wifi : WifiOff}
            label="Connexion"
            value={system.online ? "En ligne" : "Hors ligne"}
            tone={system.online ? "good" : "bad"}
          />
          <StatusRow
            icon={BatteryMedium}
            label="Batterie"
            value={system.battery ? `${Math.round(system.battery.level * 100)}%${system.battery.charging ? " ⚡" : ""}` : "Non disponible"}
          />
          <StatusRow
            icon={HardDrive}
            label="Stockage utilisé"
            value={system.storage ? `${system.storage.usedMB} Mo` : "…"}
          />
          <StatusRow icon={Link2} label="Services connectés" value={`${connectedCount} actif(s)`} />
        </section>
      </div>

      {/* ACTIVITÉ */}
      <section className="card">
        <h2 className="label-caps mb-3">Activité de JARVIS</h2>
        <div className="space-y-1">
          {data?.activity.length === 0 && <p className="text-xs text-white/30">Aucune activité récente.</p>}
          {data?.activity.map((log) => (
            <div key={log.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-white/[0.03]">
              <ActivityIcon className="h-3.5 w-3.5 shrink-0 text-electric-400" />
              <span className="text-white/80">{log.action}</span>
              {log.detail && <span className="truncate text-white/40">— {log.detail}</span>}
              <span className="ml-auto shrink-0 text-xs text-white/30">
                {new Date(log.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wifi;
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className={`h-4 w-4 ${tone === "bad" ? "text-red-400" : "text-electric-300"}`} />
      <span className="text-white/50">{label}</span>
      <span className="ml-auto font-medium text-white/80">{value}</span>
    </div>
  );
}
