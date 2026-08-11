"use client";

import { useEffect, useState } from "react";
import { Plus, X, Check, Play, Trash2, Workflow, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  schedule: string;
  frequencyLabel: string;
  actionType: string;
  enabled: boolean;
  lastRunAt: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  briefing: "Briefing quotidien",
  reminder: "Rappel",
  priorities: "Liste de priorités",
  file_analysis: "Analyse de documents",
  custom: "Personnalisé",
};

const PRESETS = [
  {
    name: "Briefing du matin",
    description: "Résumé de la journée : tâches, rappels, informations importantes.",
    actionType: "briefing",
    hour: 8,
    minute: 0,
    days: "*",
    frequencyLabel: "Tous les jours à 8h",
  },
  {
    name: "Priorités de la semaine",
    description: "Préparation de la liste de priorités chaque lundi.",
    actionType: "priorities",
    hour: 8,
    minute: 30,
    days: "1",
    frequencyLabel: "Chaque lundi à 8h30",
  },
  {
    name: "Rappel sport",
    description: "Un rappel pour faire du sport en fin de journée.",
    actionType: "reminder",
    hour: 18,
    minute: 0,
    days: "*",
    frequencyLabel: "Tous les jours à 18h",
  },
];

export function AutomationsView() {
  const [automations, setAutomations] = useState<Automation[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/automations");
    if (res.ok) setAutomations((await res.json()).automations);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleEnabled(a: Automation) {
    setAutomations((list) => list?.map((x) => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)) ?? list);
    await fetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !a.enabled }),
    });
  }

  async function runNow(id: string) {
    setRunningId(id);
    await fetch(`/api/automations/${id}/run`, { method: "POST" });
    setRunningId(null);
    refresh();
  }

  async function remove(id: string) {
    setAutomations((list) => list?.filter((x) => x.id !== id) ?? list);
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-glow">Automatisations</h1>
          <p className="text-sm text-white/40">JARVIS agit pour vous, selon vos règles.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !py-2 text-sm">
          <Plus className="h-4 w-4" /> Nouvelle règle
        </button>
      </div>

      {automations === null && <p className="text-sm text-white/30">Chargement…</p>}
      {automations?.length === 0 && (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <Workflow className="h-8 w-8 text-white/20" />
          <p className="text-sm text-white/40">Aucune automatisation configurée.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {automations?.map((a) => (
          <div key={a.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-white/90">{a.name}</h3>
                <span className="text-xs text-electric-300/80">{ACTION_LABELS[a.actionType] ?? a.actionType}</span>
              </div>
              <button
                onClick={() => toggleEnabled(a)}
                className={clsx(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  a.enabled ? "bg-electric-500" : "bg-white/10"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    a.enabled ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>

            {a.description && <p className="text-sm text-white/50">{a.description}</p>}

            <div className="flex items-center justify-between text-xs text-white/40">
              <span>{a.frequencyLabel}</span>
              <span>{a.lastRunAt ? `Exécuté ${new Date(a.lastRunAt).toLocaleString("fr-FR")}` : "Jamais exécuté"}</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => runNow(a.id)} disabled={runningId === a.id} className="btn-ghost flex-1 !py-1.5 text-xs">
                {runningId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Exécuter maintenant
              </button>
              <button onClick={() => remove(a.id)} className="btn-ghost !px-2.5 !py-1.5 text-red-400/70 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <AutomationFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function AutomationFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [actionType, setActionType] = useState("briefing");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "custom">("daily");
  const [time, setTime] = useState("08:00");
  const [weekday, setWeekday] = useState("1");
  const [customCron, setCustomCron] = useState("0 8 * * *");
  const [saving, setSaving] = useState(false);

  function applyPreset(p: (typeof PRESETS)[number]) {
    setName(p.name);
    setDescription(p.description);
    setActionType(p.actionType);
    setFrequency(p.days === "*" ? "daily" : "weekly");
    setTime(`${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`);
    setWeekday(p.days === "*" ? "1" : p.days);
  }

  function buildSchedule() {
    const [h, m] = time.split(":").map(Number);
    if (frequency === "daily") return { schedule: `${m} ${h} * * *`, label: `Tous les jours à ${time}` };
    if (frequency === "weekly") {
      const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
      return { schedule: `${m} ${h} * * ${weekday}`, label: `Chaque ${days[Number(weekday)]} à ${time}` };
    }
    return { schedule: customCron, label: "Personnalisé (cron)" };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { schedule, label } = buildSchedule();
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, actionType, schedule, frequencyLabel: label }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="glass-strong w-full max-w-lg space-y-4 rounded-2xl p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Nouvelle automatisation</h3>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-white/40" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((p) => (
            <button
              type="button"
              key={p.name}
              onClick={() => applyPreset(p)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/50 hover:bg-white/[0.06]"
            >
              {p.name}
            </button>
          ))}
        </div>

        <div>
          <label className="label-caps mb-1.5 block">Nom</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="input-field" />
        </div>

        <div>
          <label className="label-caps mb-1.5 block">Description / instruction pour JARVIS</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field resize-none"
            placeholder="Ex: Résume mes tâches et mon agenda du jour."
          />
        </div>

        <div>
          <label className="label-caps mb-1.5 block">Type d&apos;action</label>
          <select value={actionType} onChange={(e) => setActionType(e.target.value)} className="input-field">
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label-caps mb-1.5 block">Fréquence</label>
          <div className="mb-2 flex gap-1.5">
            {(["daily", "weekly", "custom"] as const).map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setFrequency(f)}
                className={clsx(
                  "rounded-full border px-3 py-1 text-xs",
                  frequency === f ? "border-electric-500/50 bg-electric-500/15 text-electric-300" : "border-white/10 text-white/50"
                )}
              >
                {f === "daily" ? "Quotidien" : f === "weekly" ? "Hebdomadaire" : "Cron personnalisé"}
              </button>
            ))}
          </div>

          {frequency !== "custom" ? (
            <div className="flex gap-2">
              {frequency === "weekly" && (
                <select value={weekday} onChange={(e) => setWeekday(e.target.value)} className="input-field">
                  {["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"].map((d, i) => (
                    <option key={i} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              )}
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input-field" />
            </div>
          ) : (
            <input
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              className="input-field font-mono text-sm"
              placeholder="0 8 * * *"
            />
          )}
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          <Check className="h-4 w-4" /> Créer l&apos;automatisation
        </button>
      </form>
    </div>
  );
}
