"use client";

import { useEffect, useState } from "react";
import { Cloud, Battery, Wifi, HardDrive, Zap, CheckCircle2, Bell } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface DashboardData {
  now: string;
  weather: { temperatureC: number; condition: string; windKph: number; city: string } | null;
  priorities: {
    tasks: Array<{ id: string; title: string; priority: string; status: string }>;
    reminders: Array<{ id: string; text: string; remindAt: string }>;
  };
  connections: Array<{ id: string; label: string; status: string }>;
  activity: Array<{ id: string; action: string; category: string; createdAt: string }>;
  stats: { filesCount: number; memoriesCount: number };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [now, setNow] = useState(new Date());
  const [battery, setBattery] = useState<number | null>(null);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData);
    const t = setInterval(() => setNow(new Date()), 1000);
    setOnline(navigator.onLine);
    window.addEventListener("online", () => setOnline(true));
    window.addEventListener("offline", () => setOnline(false));

    // Battery Status API (Chromium only; gracefully absent elsewhere).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((b: { level: number; addEventListener: (e: string, cb: () => void) => void }) => {
        setBattery(Math.round(b.level * 100));
        b.addEventListener("levelchange", () => setBattery(Math.round(b.level * 100)));
      });
    }
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader title="Tableau de bord" subtitle="Votre centre de contrôle personnel" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="glass rounded-2xl p-5 md:col-span-2">
          <p className="text-xs uppercase tracking-widest text-white/40">Aujourd&apos;hui</p>
          <p className="mt-2 font-mono text-4xl text-glow text-cyan-glow">
            {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-sm text-white/50">
            {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/40">
            <Cloud size={13} /> Météo
          </p>
          {data?.weather ? (
            <>
              <p className="text-3xl text-cyan-glow">{data.weather.temperatureC}°C</p>
              <p className="text-sm text-white/50">{data.weather.condition}</p>
              <p className="text-xs text-white/30">{data.weather.city} · vent {data.weather.windKph} km/h</p>
            </>
          ) : (
            <p className="text-sm text-white/30">Indisponible</p>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/40">
            <CheckCircle2 size={13} /> Priorités
          </p>
          <div className="space-y-2">
            {data?.priorities.tasks.length ? (
              data.priorities.tasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <span className="truncate text-white/80">{t.title}</span>
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] ${
                      t.priority === "high" ? "bg-red-500/15 text-red-300" : "bg-white/10 text-white/40"
                    }`}
                  >
                    {t.priority}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/30">Aucune tâche en attente.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/40">
            <Bell size={13} /> Rappels
          </p>
          <div className="space-y-2">
            {data?.priorities.reminders.length ? (
              data.priorities.reminders.map((r) => (
                <div key={r.id} className="text-sm text-white/80">
                  {r.text}
                  <span className="ml-2 text-xs text-white/30">
                    {new Date(r.remindAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/30">Aucun rappel à venir.</p>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <p className="mb-3 flex items-center gap-1.5 text-xs uppercase tracking-widest text-white/40">
            <Zap size={13} /> Système
          </p>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Wifi size={13} /> Connexion</span>
              <span className={online ? "text-cyan-glow" : "text-red-300"}>{online ? "En ligne" : "Hors ligne"}</span>
            </div>
            {battery !== null && (
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Battery size={13} /> Batterie</span>
                <span>{battery}%</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5"><HardDrive size={13} /> Fichiers importés</span>
              <span>{data?.stats.filesCount ?? "—"}</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 md:col-span-3">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Services connectés</p>
          <div className="flex flex-wrap gap-2">
            {data?.connections.map((c) => (
              <span
                key={c.id}
                className={`rounded-full border px-3 py-1 text-xs ${
                  c.status === "connected"
                    ? "border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow"
                    : "border-white/10 bg-white/5 text-white/40"
                }`}
              >
                {c.label} · {c.status === "connected" ? "connecté" : "non connecté"}
              </span>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 md:col-span-3">
          <p className="mb-3 text-xs uppercase tracking-widest text-white/40">Activité de JARVIS</p>
          <div className="space-y-1.5">
            {data?.activity.length ? (
              data.activity.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
                  <span className="text-white/70">{a.action}</span>
                  <span className="text-xs text-white/30">
                    {new Date(a.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-white/30">Aucune activité récente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
