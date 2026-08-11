"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Plus, Trash2, Bell, ListChecks, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
};

type Reminder = {
  id: string;
  title: string;
  remindAt: string;
  done: boolean;
  recurring?: string | null;
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-jarvis-text-dim border-jarvis-panel-border",
  normal: "text-jarvis-cyan-strong border-jarvis-cyan/30",
  high: "text-jarvis-danger border-jarvis-danger/40",
};

export default function TasksPage() {
  const [tab, setTab] = useState<"tasks" | "reminders">("tasks");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [reminderModalOpen, setReminderModalOpen] = useState(false);

  async function loadTasks() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data.tasks ?? []);
  }
  async function loadReminders() {
    const res = await fetch("/api/reminders");
    const data = await res.json();
    setReminders(data.reminders ?? []);
  }

  useEffect(() => {
    void loadTasks();
    void loadReminders();
  }, []);

  async function toggleTaskStatus(task: Task) {
    const next = task.status === "done" ? "todo" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    void loadTasks();
  }

  async function deleteTask(id: string) {
    if (!confirm("Supprimer cette tâche ?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    void loadTasks();
  }

  async function toggleReminderDone(reminder: Reminder) {
    await fetch(`/api/reminders/${reminder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !reminder.done }),
    });
    void loadReminders();
  }

  async function deleteReminder(id: string) {
    if (!confirm("Supprimer ce rappel ?")) return;
    await fetch(`/api/reminders/${id}`, { method: "DELETE" });
    void loadReminders();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Organisation</p>
          <h1 className="font-display text-2xl font-semibold">Tâches & rappels</h1>
        </div>
        <button
          onClick={() => (tab === "tasks" ? setTaskModalOpen(true) : setReminderModalOpen(true))}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg transition-transform hover:scale-[1.02]"
        >
          <Plus size={16} /> {tab === "tasks" ? "Nouvelle tâche" : "Nouveau rappel"}
        </button>
      </div>

      <div className="flex gap-2">
        <TabButton active={tab === "tasks"} onClick={() => setTab("tasks")} icon={<ListChecks size={15} />} label="Tâches" />
        <TabButton active={tab === "reminders"} onClick={() => setTab("reminders")} icon={<Bell size={15} />} label="Rappels" />
      </div>

      {tab === "tasks" ? (
        tasks.length === 0 ? (
          <EmptyState text="Aucune tâche. Demandez à JARVIS d'en créer une, ou ajoutez-la manuellement." />
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <div key={t.id} className="glass animate-fade-in-up flex items-center gap-3 rounded-xl p-4">
                <button
                  onClick={() => toggleTaskStatus(t)}
                  className={clsx(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    t.status === "done" ? "border-jarvis-good bg-jarvis-good/20 text-jarvis-good" : "border-jarvis-panel-border"
                  )}
                >
                  {t.status === "done" && <Check size={12} />}
                </button>
                <div className="flex-1">
                  <p className={clsx("text-sm", t.status === "done" && "text-jarvis-text-dim line-through")}>{t.title}</p>
                  {t.description && <p className="text-xs text-jarvis-text-dim">{t.description}</p>}
                </div>
                {t.dueDate && (
                  <span className="text-xs text-jarvis-text-dim">
                    {new Date(t.dueDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                  </span>
                )}
                <span className={clsx("rounded-full border px-2 py-0.5 text-[10px] uppercase", PRIORITY_COLOR[t.priority])}>
                  {t.priority}
                </span>
                <button onClick={() => deleteTask(t.id)} className="text-jarvis-text-dim hover:text-jarvis-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      ) : reminders.length === 0 ? (
        <EmptyState text="Aucun rappel programmé." />
      ) : (
        <div className="flex flex-col gap-2">
          {reminders.map((r) => (
            <div key={r.id} className="glass animate-fade-in-up flex items-center gap-3 rounded-xl p-4">
              <button
                onClick={() => toggleReminderDone(r)}
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                  r.done ? "border-jarvis-good bg-jarvis-good/20 text-jarvis-good" : "border-jarvis-panel-border"
                )}
              >
                {r.done && <Check size={12} />}
              </button>
              <div className="flex-1">
                <p className={clsx("text-sm", r.done && "text-jarvis-text-dim line-through")}>{r.title}</p>
                <p className="text-xs text-jarvis-text-dim">
                  {new Date(r.remindAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
                  {r.recurring ? ` — récurrent (${r.recurring})` : ""}
                </p>
              </div>
              <button onClick={() => deleteReminder(r.id)} className="text-jarvis-text-dim hover:text-jarvis-danger">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <TaskModal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} onSaved={() => { setTaskModalOpen(false); void loadTasks(); }} />
      <ReminderModal
        open={reminderModalOpen}
        onClose={() => setReminderModalOpen(false)}
        onSaved={() => {
          setReminderModalOpen(false);
          void loadReminders();
        }}
      />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs transition-colors",
        active ? "glass-strong border-glow text-jarvis-cyan-strong" : "bg-white/5 text-jarvis-text-dim hover:text-jarvis-text"
      )}
    >
      {icon} {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="glass rounded-2xl p-12 text-center text-sm text-jarvis-text-dim">{text}</div>;
}

function TaskModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setPriority("normal");
      setDueDate("");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: description || undefined, priority, dueDate: dueDate || undefined }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle tâche">
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Titre</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="jarvis-input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="jarvis-input resize-none" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-jarvis-text-dim">Priorité</span>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className="jarvis-input">
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-jarvis-text-dim">Échéance</span>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="jarvis-input" />
          </label>
        </div>
        <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg disabled:opacity-50">
          {saving ? "…" : "Créer"}
        </button>
      </form>
    </Modal>
  );
}

function ReminderModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [recurring, setRecurring] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle("");
      setRemindAt("");
      setRecurring("");
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, remindAt, recurring: recurring || undefined }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouveau rappel">
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Titre</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="jarvis-input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Date et heure</span>
          <input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} required className="jarvis-input" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Récurrence</span>
          <select value={recurring} onChange={(e) => setRecurring(e.target.value)} className="jarvis-input">
            <option value="">Aucune</option>
            <option value="daily">Quotidienne</option>
            <option value="weekly">Hebdomadaire</option>
            <option value="monthly">Mensuelle</option>
          </select>
        </label>
        <button type="submit" disabled={saving} className="rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg disabled:opacity-50">
          {saving ? "…" : "Créer"}
        </button>
      </form>
    </Modal>
  );
}
