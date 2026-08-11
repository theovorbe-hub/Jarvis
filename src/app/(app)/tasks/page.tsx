"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueAt?: string | null;
}

interface Reminder {
  id: string;
  text: string;
  remindAt: string;
  done: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newTask, setNewTask] = useState("");
  const [newPriority, setNewPriority] = useState("normal");
  const [newReminderText, setNewReminderText] = useState("");
  const [newReminderTime, setNewReminderTime] = useState("");

  function load() {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => setTasks(d.tasks ?? []));
    fetch("/api/reminders")
      .then((r) => r.json())
      .then((d) => setReminders(d.reminders ?? []));
  }

  useEffect(load, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTask, priority: newPriority }),
    });
    setNewTask("");
    load();
  }

  async function toggleTask(task: Task) {
    const next = task.status === "done" ? "pending" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    load();
  }

  async function deleteTask(id: string) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!newReminderText.trim() || !newReminderTime) return;
    await fetch("/api/reminders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newReminderText, remindAt: new Date(newReminderTime).toISOString() }),
    });
    setNewReminderText("");
    setNewReminderTime("");
    load();
  }

  async function completeReminder(id: string) {
    await fetch(`/api/reminders/${id}`, { method: "PATCH" });
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <PageHeader title="Tâches & Rappels" subtitle="Organisez votre journée" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium text-white/60">Tâches</h2>
          <form onSubmit={addTask} className="glass mb-3 flex gap-2 rounded-xl p-2">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Nouvelle tâche…"
              className="flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-white/30"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 text-xs outline-none"
            >
              <option value="low">Basse</option>
              <option value="normal">Normale</option>
              <option value="high">Haute</option>
            </select>
            <button type="submit" className="rounded-lg bg-cyan-glow/20 p-2 text-cyan-glow">
              <Plus size={14} />
            </button>
          </form>

          <div className="space-y-2">
            {tasks.map((t) => (
              <div key={t.id} className="glass flex items-center gap-3 rounded-xl px-3 py-2.5">
                <button
                  onClick={() => toggleTask(t)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    t.status === "done" ? "border-cyan-glow bg-cyan-glow/30 text-cyan-glow" : "border-white/20 text-transparent"
                  }`}
                >
                  <Check size={12} />
                </button>
                <span className={`flex-1 text-sm ${t.status === "done" ? "text-white/30 line-through" : "text-white/80"}`}>
                  {t.title}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    t.priority === "high" ? "bg-red-500/15 text-red-300" : "bg-white/10 text-white/40"
                  }`}
                >
                  {t.priority}
                </span>
                <button onClick={() => deleteTask(t.id)} className="text-white/25 hover:text-red-300">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-white/30">Aucune tâche.</p>}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-white/60">Rappels</h2>
          <form onSubmit={addReminder} className="glass mb-3 space-y-2 rounded-xl p-2">
            <input
              value={newReminderText}
              onChange={(e) => setNewReminderText(e.target.value)}
              placeholder="Se souvenir de…"
              className="w-full bg-transparent px-2 text-sm outline-none placeholder:text-white/30"
            />
            <div className="flex gap-2 px-2">
              <input
                type="datetime-local"
                value={newReminderTime}
                onChange={(e) => setNewReminderTime(e.target.value)}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs outline-none"
              />
              <button type="submit" className="rounded-lg bg-cyan-glow/20 px-3 text-xs text-cyan-glow">
                Créer
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {reminders.map((r) => (
              <div key={r.id} className="glass flex items-center gap-3 rounded-xl px-3 py-2.5">
                <span className="flex-1 text-sm text-white/80">{r.text}</span>
                <span className="text-xs text-white/30">
                  {new Date(r.remindAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button onClick={() => completeReminder(r.id)} className="text-white/25 hover:text-cyan-glow">
                  <Check size={13} />
                </button>
              </div>
            ))}
            {reminders.length === 0 && <p className="text-sm text-white/30">Aucun rappel à venir.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
