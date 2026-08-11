"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Automation {
  id: string;
  name: string;
  description?: string | null;
  trigger: string;
  schedule?: string | null;
  event?: string | null;
  actionType: string;
  enabled: boolean;
  lastRunAt?: string | null;
}

const PRESETS = [
  { name: "Briefing quotidien", trigger: "cron", schedule: "0 8 * * *", actionType: "briefing", description: "Tous les jours à 8h." },
  { name: "Priorités du lundi", trigger: "cron", schedule: "0 9 * * 1", actionType: "priorities", description: "Chaque lundi à 9h." },
  { name: "Analyse automatique des fichiers", trigger: "event", event: "file_uploaded", actionType: "analyze_file", description: "Quand je reçois un fichier." },
  { name: "Rappel sport", trigger: "cron", schedule: "0 18 * * *", actionType: "reminder", description: "À 18h, rappelle-moi de faire du sport." },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    trigger: "cron",
    schedule: "0 8 * * *",
    event: "file_uploaded",
    actionType: "briefing",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/automations")
      .then((r) => r.json())
      .then((d) => setAutomations(d.automations ?? []));
  }
  useEffect(load, []);

  async function create(payload: Partial<Automation> & { name: string; trigger: string; actionType: string }) {
    setError(null);
    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setShowForm(false);
    load();
  }

  async function toggle(id: string, enabled: boolean) {
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Automatisations" subtitle="Des règles qui agissent pour vous" />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-electric to-cyan-glow px-3.5 py-2 text-xs font-medium text-void shadow-glow-sm"
        >
          <Plus size={14} /> Nouvelle règle
        </button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            onClick={() => create(p)}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 hover:border-cyan-glow/40 hover:text-cyan-glow"
          >
            + {p.name}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="glass mb-6 space-y-3 rounded-2xl p-4">
          <input
            placeholder="Nom de l'automatisation"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <select
              value={form.trigger}
              onChange={(e) => setForm({ ...form, trigger: e.target.value })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
            >
              <option value="cron">Récurrente (planifiée)</option>
              <option value="event">Déclenchée par un événement</option>
            </select>
            {form.trigger === "cron" ? (
              <input
                placeholder="Expression cron, ex. 0 8 * * *"
                value={form.schedule}
                onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono outline-none"
              />
            ) : (
              <select
                value={form.event}
                onChange={(e) => setForm({ ...form, event: e.target.value })}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
              >
                <option value="file_uploaded">Fichier importé</option>
              </select>
            )}
          </div>
          <select
            value={form.actionType}
            onChange={(e) => setForm({ ...form, actionType: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs outline-none"
          >
            <option value="briefing">Générer un briefing</option>
            <option value="priorities">Générer les priorités</option>
            <option value="reminder">Créer un rappel</option>
            <option value="analyze_file">Analyser le fichier</option>
          </select>
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button
            onClick={() => create(form)}
            className="rounded-full bg-cyan-glow/20 px-4 py-1.5 text-xs text-cyan-glow"
          >
            Créer
          </button>
        </div>
      )}

      <div className="space-y-3">
        {automations.map((a) => (
          <div key={a.id} className="glass flex items-center justify-between rounded-2xl p-4">
            <div>
              <p className="text-sm font-medium text-white/90">{a.name}</p>
              <p className="text-xs text-white/40">
                {a.trigger === "cron" ? `Planifiée · ${a.schedule}` : `Événement · ${a.event}`}
                {a.lastRunAt && ` · dernière exécution ${new Date(a.lastRunAt).toLocaleString("fr-FR")}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => toggle(a.id, !a.enabled)}
                className={`h-6 w-11 rounded-full p-0.5 transition ${a.enabled ? "bg-cyan-glow/40" : "bg-white/10"}`}
              >
                <span
                  className={`block h-5 w-5 rounded-full bg-white transition ${a.enabled ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
              <button onClick={() => remove(a.id)} className="text-white/25 hover:text-red-300">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {automations.length === 0 && <p className="text-sm text-white/30">Aucune automatisation configurée.</p>}
      </div>
    </div>
  );
}
