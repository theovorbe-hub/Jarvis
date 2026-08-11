"use client";

import { useEffect, useState } from "react";
import { CloudSun, MapPin } from "lucide-react";
import { LiveClock } from "@/components/layout/Clock";
import { SystemStatus } from "@/components/dashboard/SystemStatus";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/ActivityFeed";

type DashboardData = {
  city: string | null;
  weather: {
    ok: boolean;
    city?: string;
    temperature?: number;
    condition?: string;
    tempMax?: number;
    tempMin?: number;
    error?: string;
  } | null;
  tasks: Array<{ id: string; title: string; priority: string; dueDate: string | null; status: string }>;
  reminders: Array<{ id: string; title: string; remindAt: string }>;
  activity: ActivityItem[];
  filesCount: number;
  connections: unknown[];
  services: { ai: boolean; search: boolean };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [cityInput, setCityInput] = useState("");

  async function load() {
    const res = await fetch("/api/dashboard");
    const d = await res.json();
    setData(d);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveCity(e: React.FormEvent) {
    e.preventDefault();
    if (!cityInput.trim()) return;
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ city: cityInput.trim() }),
    });
    setCityInput("");
    void load();
  }

  if (!data) {
    return <div className="flex flex-1 items-center justify-center text-sm text-jarvis-text-dim">Chargement du centre de contrôle…</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Aujourd&apos;hui</p>
        <h1 className="font-display text-2xl font-semibold">Centre de contrôle</h1>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-5">
          <LiveClock />
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">
            <CloudSun size={15} /> Météo
          </h3>
          {!data.city ? (
            <form onSubmit={saveCity} className="flex gap-2">
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="Votre ville"
                className="jarvis-input flex-1 text-sm"
              />
              <button type="submit" className="rounded-lg bg-jarvis-cyan/20 px-3 text-xs text-jarvis-cyan-strong">
                <MapPin size={14} />
              </button>
            </form>
          ) : data.weather?.ok ? (
            <div>
              <p className="font-display text-3xl font-semibold">{Math.round(data.weather.temperature ?? 0)}°C</p>
              <p className="text-sm capitalize text-jarvis-text-dim">
                {data.weather.condition} — {data.weather.city}
              </p>
              <p className="text-xs text-jarvis-text-dim">
                min {Math.round(data.weather.tempMin ?? 0)}° / max {Math.round(data.weather.tempMax ?? 0)}°
              </p>
            </div>
          ) : (
            <p className="text-sm text-jarvis-amber">{data.weather?.error ?? "Météo indisponible"}</p>
          )}
        </div>

        <SystemStatus
          aiConfigured={data.services.ai}
          searchConfigured={data.services.search}
          connectionsCount={data.connections.length}
          filesCount={data.filesCount}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">Tâches prioritaires</h3>
          {data.tasks.length === 0 ? (
            <p className="text-sm text-jarvis-text-dim">Rien de prévu — profitez-en.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.tasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between text-sm">
                  <span>{t.title}</span>
                  <span className="text-xs text-jarvis-text-dim">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString("fr-FR") : t.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">Rappels à venir</h3>
          {data.reminders.length === 0 ? (
            <p className="text-sm text-jarvis-text-dim">Aucun rappel à venir.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {data.reminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-sm">
                  <span>{r.title}</span>
                  <span className="text-xs text-jarvis-text-dim">
                    {new Date(r.remindAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">Activité de JARVIS</h3>
        <ActivityFeed items={data.activity} />
      </div>
    </div>
  );
}
