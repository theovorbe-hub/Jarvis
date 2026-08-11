"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Memory {
  id: string;
  key: string;
  value: string;
  category: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "general", label: "Général" },
  { value: "preference", label: "Préférence" },
  { value: "project", label: "Projet" },
  { value: "person", label: "Personne" },
  { value: "habit", label: "Habitude" },
  { value: "goal", label: "Objectif" },
];

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState("general");

  function load() {
    fetch("/api/memory")
      .then((r) => r.json())
      .then((d) => setMemories(d.memories ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;
    await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey, value: newValue, category: newCategory }),
    });
    setNewKey("");
    setNewValue("");
    setShowForm(false);
    load();
  }

  async function saveEdit(id: string) {
    await fetch(`/api/memory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editValue }),
    });
    setEditingId(null);
    load();
  }

  async function remove(id: string) {
    await fetch(`/api/memory/${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <PageHeader title="Mémoire" subtitle="Ce que JARVIS retient de vous" />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-gradient-to-br from-electric to-cyan-glow px-3.5 py-2 text-xs font-medium text-void shadow-glow-sm"
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>

      {showForm && (
        <form onSubmit={addMemory} className="glass mb-6 space-y-3 rounded-2xl p-4">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Libellé (ex. Projet principal)"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-glow/50"
          />
          <textarea
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Contenu à mémoriser"
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-glow/50"
          />
          <div className="flex items-center justify-between">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-full bg-cyan-glow/20 px-4 py-1.5 text-xs text-cyan-glow">
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-white/30">Chargement…</p>
      ) : memories.length === 0 ? (
        <p className="text-sm text-white/30">
          Aucun souvenir pour l&apos;instant. Dites « Jarvis, souviens-toi que… » ou ajoutez-en un manuellement.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {memories.map((m) => (
            <div key={m.id} className="glass rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-full bg-cyan-glow/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cyan-glow/80">
                  {CATEGORIES.find((c) => c.value === m.category)?.label ?? m.category}
                </span>
                <div className="flex gap-1 text-white/30">
                  {editingId === m.id ? (
                    <>
                      <button onClick={() => saveEdit(m.id)} className="hover:text-cyan-glow">
                        <Check size={13} />
                      </button>
                      <button onClick={() => setEditingId(null)} className="hover:text-white">
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingId(m.id);
                          setEditValue(m.value);
                        }}
                        className="hover:text-cyan-glow"
                      >
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => remove(m.id)} className="hover:text-red-300">
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mb-1 text-sm font-medium text-white/90">{m.key}</p>
              {editingId === m.id ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm outline-none"
                />
              ) : (
                <p className="text-sm text-white/60">{m.value}</p>
              )}
              <p className="mt-2 text-[10px] text-white/25">
                Mis à jour {new Date(m.updatedAt).toLocaleDateString("fr-FR")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
