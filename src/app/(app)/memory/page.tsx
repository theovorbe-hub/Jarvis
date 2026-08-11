"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Plus, Pencil, Trash2, BrainCircuit } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { MEMORY_CATEGORIES, categoryLabel } from "@/lib/memory-categories";

type Memory = {
  id: string;
  title: string;
  content: string;
  category: string;
  updatedAt: string;
};

export default function MemoryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/memories");
    const data = await res.json();
    setMemories(data.memories ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Supprimer définitivement ce souvenir ?")) return;
    await fetch(`/api/memories/${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  const filtered = filter ? memories.filter((m) => m.category === filter) : memories;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Mémoire long terme</p>
          <h1 className="font-display text-2xl font-semibold">Ce que JARVIS sait de vous</h1>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> Nouveau souvenir
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip label="Tous" active={filter === null} onClick={() => setFilter(null)} />
        {MEMORY_CATEGORIES.map((c) => (
          <FilterChip key={c.value} label={c.label} active={filter === c.value} onClick={() => setFilter(c.value)} />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-jarvis-text-dim">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="glass flex flex-col items-center gap-3 rounded-2xl p-12 text-center text-jarvis-text-dim">
          <BrainCircuit size={32} />
          <p>Aucun souvenir pour le moment. Dites à JARVIS « souviens-toi que… » ou ajoutez-en un manuellement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div key={m.id} className="glass animate-fade-in-up flex flex-col gap-3 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="rounded-full border border-jarvis-panel-border bg-white/5 px-2.5 py-0.5 text-[11px] text-jarvis-cyan-strong">
                  {categoryLabel(m.category)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(m);
                      setModalOpen(true);
                    }}
                    className="text-jarvis-text-dim hover:text-jarvis-text"
                  >
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => remove(m.id)} className="text-jarvis-text-dim hover:text-jarvis-danger">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-display font-semibold">{m.title}</h3>
              <p className="line-clamp-4 text-sm text-jarvis-text-dim">{m.content}</p>
              <span className="mt-auto text-[11px] text-jarvis-text-dim/70">
                Mis à jour {new Date(m.updatedAt).toLocaleDateString("fr-FR")}
              </span>
            </div>
          ))}
        </div>
      )}

      <MemoryModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        memory={editing}
        onSaved={() => {
          setModalOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-full px-3 py-1.5 text-xs transition-colors",
        active ? "glass-strong border-glow text-jarvis-cyan-strong" : "bg-white/5 text-jarvis-text-dim hover:text-jarvis-text"
      )}
    >
      {label}
    </button>
  );
}

function MemoryModal({
  open,
  onClose,
  memory,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  memory: Memory | null;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("note");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(memory?.title ?? "");
      setContent(memory?.content ?? "");
      setCategory(memory?.category ?? "note");
    }
  }, [open, memory]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { title, content, category };
    if (memory) {
      await fetch(`/api/memories/${memory.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={memory ? "Modifier le souvenir" : "Nouveau souvenir"}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Titre</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="jarvis-input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Catégorie</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="jarvis-input">
            {MEMORY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Contenu</span>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={4}
            className="jarvis-input resize-none"
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg disabled:opacity-50"
        >
          {saving ? "…" : "Enregistrer"}
        </button>
      </form>
    </Modal>
  );
}
