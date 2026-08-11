"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Plus, Trash2, Play, Workflow } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type Automation = {
  id: string;
  name: string;
  description?: string | null;
  trigger: string;
  action: string;
  enabled: boolean;
  lastRunAt?: string | null;
};

const ACTION_LABEL: Record<string, string> = {
  daily_briefing: "Briefing quotidien",
  priority_list: "Liste de priorités",
  reminder_ping: "Rappel automatique",
  custom_note: "Note personnalisée",
};

const PRESETS = [
  { name: "Briefing du matin", cron: "0 8 * * *", action: "daily_briefing", description: "Chaque jour à 8h, un résumé de votre journée." },
  { name: "Priorités du lundi", cron: "0 9 * * 1", action: "priority_list", description: "Chaque lundi à 9h, votre liste de priorités." },
  { name: "Rappel sport", cron: "0 18 * * *", action: "reminder_ping", description: "Chaque jour à 18h.", message: "C'est l'heure du sport." },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  async function load() {
    const res = await fetch("/api/automations");
    const data = await res.json();
    setAutomations(data.automations ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function toggle(a: Automation) {
    await fetch(`/api/automations/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !a.enabled }),
    });
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Supprimer cette automatisation ?")) return;
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
    void load();
  }

  async function runNow(id: string) {
    await fetch(`/api/automations/${id}/run`, { method: "POST" });
    void load();
  }

  async function createFromPreset(preset: (typeof PRESETS)[number]) {
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: preset.name,
        description: preset.description,
        cron: preset.cron,
        action: preset.action,
        actionConfig: "message" in preset ? { message: preset.message } : undefined,
      }),
    });
    void load();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Workflows</p>
          <h1 className="font-display text-2xl font-semibold">Automatisations</h1>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> Nouvelle automatisation
        </button>
      </div>

      {automations.length === 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => createFromPreset(p)}
              className="glass flex flex-col gap-2 rounded-2xl p-4 text-left transition-colors hover:border-glow"
            >
              <Workflow size={18} className="text-jarvis-cyan-strong" />
              <span className="font-display text-sm font-semibold">{p.name}</span>
              <span className="text-xs text-jarvis-text-dim">{p.description}</span>
            </button>
          ))}
        </div>
      )}

      {automations.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-jarvis-text-dim">
          Aucune automatisation. Choisissez un modèle ci-dessus ou créez-en une, ou demandez à JARVIS de le faire pour vous.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {automations.map((a) => (
            <div key={a.id} className="glass animate-fade-in-up flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-start justify-between">
                <span className="rounded-full border border-jarvis-panel-border bg-white/5 px-2.5 py-0.5 text-[11px] text-jarvis-cyan-strong">
                  {ACTION_LABEL[a.action] ?? a.action}
                </span>
                <button
                  onClick={() => toggle(a)}
                  className={clsx(
                    "relative h-5 w-9 rounded-full transition-colors",
                    a.enabled ? "bg-jarvis-cyan" : "bg-white/10"
                  )}
                >
                  <span
                    className={clsx(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                      a.enabled ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
              <h3 className="font-display font-semibold">{a.name}</h3>
              {a.description && <p className="text-sm text-jarvis-text-dim">{a.description}</p>}
              <code className="w-fit rounded-md bg-white/5 px-2 py-0.5 font-mono text-[11px] text-jarvis-text-dim">{a.trigger}</code>
              <p className="text-[11px] text-jarvis-text-dim/70">
                Dernière exécution : {a.lastRunAt ? new Date(a.lastRunAt).toLocaleString("fr-FR") : "jamais"}
              </p>
              <div className="mt-auto flex gap-2 pt-2">
                <button
                  onClick={() => runNow(a.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-jarvis-text-dim hover:text-jarvis-text"
                >
                  <Play size={12} /> Exécuter maintenant
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-jarvis-text-dim hover:text-jarvis-danger"
                >
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AutomationModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); void load(); }} />
    </div>
  );
}

function AutomationModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cron, setCron] = useState("0 8 * * *");
  const [action, setAction] = useState("daily_briefing");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setCron("0 8 * * *");
      setAction("daily_briefing");
      setMessage("");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        cron,
        action,
        actionConfig: message ? { message } : undefined,
      }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle automatisation">
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Nom</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="jarvis-input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="jarvis-input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Action</span>
          <select value={action} onChange={(e) => setAction(e.target.value)} className="jarvis-input">
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {(action === "reminder_ping" || action === "custom_note") && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-jarvis-text-dim">Message</span>
            <input value={message} onChange={(e) => setMessage(e.target.value)} className="jarvis-input" />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Fréquence (cron)</span>
          <input value={cron} onChange={(e) => setCron(e.target.value)} required className="jarvis-input font-mono" />
          <span className="text-[11px] text-jarvis-text-dim/70">Ex : &quot;0 8 * * *&quot; = tous les jours à 8h.</span>
        </label>
        <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg disabled:opacity-50">
          {saving ? "…" : "Créer"}
        </button>
      </form>
    </Modal>
  );
}
