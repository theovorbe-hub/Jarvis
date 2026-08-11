"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, X, Check, BrainCircuit } from "lucide-react";
import clsx from "clsx";

interface Memory {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "identity", label: "Identité" },
  { value: "preference", label: "Préférence" },
  { value: "project", label: "Projet" },
  { value: "person", label: "Personne" },
  { value: "habit", label: "Habitude" },
  { value: "goal", label: "Objectif" },
  { value: "task", label: "Tâche récurrente" },
];

const CATEGORY_COLOR: Record<string, string> = {
  general: "bg-white/10 text-white/60",
  identity: "bg-cyan-500/15 text-cyan-300",
  preference: "bg-electric-500/15 text-electric-300",
  project: "bg-purple-500/15 text-purple-300",
  person: "bg-pink-500/15 text-pink-300",
  habit: "bg-amber-500/15 text-amber-300",
  goal: "bg-green-500/15 text-green-300",
  task: "bg-orange-500/15 text-orange-300",
};

export function MemoryView() {
  const [memories, setMemories] = useState<Memory[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);

  async function refresh() {
    const res = await fetch("/api/memory");
    if (res.ok) setMemories((await res.json()).memories);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleDelete(id: string) {
    setMemories((m) => m?.filter((x) => x.id !== id) ?? m);
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
  }

  const filtered = memories?.filter((m) => filter === "all" || m.category === filter) ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-glow">Mémoire</h1>
          <p className="text-sm text-white/40">Ce que JARVIS retient de vous.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary !py-2 text-sm">
          <Plus className="h-4 w-4" /> Nouveau souvenir
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="Tous" />
        {CATEGORIES.map((c) => (
          <FilterChip key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)} label={c.label} />
        ))}
      </div>

      {memories === null && <p className="text-sm text-white/30">Chargement…</p>}
      {memories !== null && filtered.length === 0 && (
        <div className="card flex flex-col items-center gap-2 py-12 text-center">
          <BrainCircuit className="h-8 w-8 text-white/20" />
          <p className="text-sm text-white/40">Aucun souvenir dans cette catégorie.</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((m) => (
          <div key={m.id} className="card group flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-medium", CATEGORY_COLOR[m.category])}>
                {CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category}
              </span>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button onClick={() => setEditing(m)} className="text-white/30 hover:text-white/70">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(m.id)} className="text-white/30 hover:text-red-400">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <h3 className="font-medium text-white/90">{m.title}</h3>
            <p className="line-clamp-4 text-sm text-white/50">{m.content}</p>
            <p className="mt-auto text-[11px] text-white/25">
              Mis à jour le {new Date(m.updatedAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
        ))}
      </div>

      {(showForm || editing) && (
        <MemoryFormModal
          memory={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active ? "border-electric-500/50 bg-electric-500/15 text-electric-300" : "border-white/10 text-white/50 hover:bg-white/[0.05]"
      )}
    >
      {label}
    </button>
  );
}

function MemoryFormModal({
  memory,
  onClose,
  onSaved,
}: {
  memory: Memory | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(memory?.title ?? "");
  const [content, setContent] = useState(memory?.content ?? "");
  const [category, setCategory] = useState(memory?.category ?? "general");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    if (memory) {
      await fetch(`/api/memory/${memory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      });
    } else {
      await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category }),
      });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="glass-strong w-full max-w-md space-y-4 rounded-2xl p-6 shadow-glow">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{memory ? "Modifier le souvenir" : "Nouveau souvenir"}</h3>
          <button type="button" onClick={onClose}>
            <X className="h-4 w-4 text-white/40" />
          </button>
        </div>

        <div>
          <label className="label-caps mb-1.5 block">Titre</label>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="label-caps mb-1.5 block">Contenu</label>
          <textarea
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-field resize-none"
          />
        </div>
        <div>
          <label className="label-caps mb-1.5 block">Catégorie</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="input-field">
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full">
          <Check className="h-4 w-4" /> Enregistrer
        </button>
      </form>
    </div>
  );
}
