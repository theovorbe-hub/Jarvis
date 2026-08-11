"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Permission {
  id: string;
  capability: string;
  label: string;
  granted: boolean;
  sensitive: boolean;
}

interface Connection {
  id: string;
  provider: string;
  label: string;
  status: string;
}

interface Log {
  id: string;
  action: string;
  category: string;
  createdAt: string;
}

export default function SecurityPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function load() {
    fetch("/api/permissions").then((r) => r.json()).then((d) => setPermissions(d.permissions ?? []));
    fetch("/api/connections").then((r) => r.json()).then((d) => setConnections(d.connections ?? []));
    fetch("/api/activity?limit=30").then((r) => r.json()).then((d) => setLogs(d.logs ?? []));
  }
  useEffect(load, []);

  async function togglePermission(capability: string, granted: boolean) {
    const res = await fetch("/api/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capability, granted }),
    });
    if (res.ok) load();
  }

  async function toggleConnection(provider: string, connect: boolean) {
    await fetch("/api/connections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, connect }),
    });
    load();
  }

  async function deleteAccount() {
    await fetch("/api/security/delete-account", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <PageHeader title="Sécurité & Permissions" subtitle="Ce que JARVIS est autorisé à faire" />

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-white/60">Permissions accordées</h2>
        <div className="space-y-2">
          {permissions.map((p) => (
            <div key={p.id} className="glass flex items-center justify-between rounded-xl px-4 py-3">
              <div>
                <p className="flex items-center gap-1.5 text-sm text-white/80">
                  {p.label}
                  {p.sensitive && <ShieldAlert size={12} className="text-amber-300/70" />}
                </p>
                {p.sensitive && <p className="text-[11px] text-amber-300/50">Action sensible — confirmation requise à chaque usage.</p>}
              </div>
              <button
                onClick={() => togglePermission(p.capability, !p.granted)}
                className={`h-6 w-11 shrink-0 rounded-full p-0.5 transition ${p.granted ? "bg-cyan-glow/40" : "bg-white/10"}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white transition ${p.granted ? "translate-x-5" : "translate-x-0"}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-white/60">Intégrations</h2>
        <p className="mb-3 text-xs text-white/30">
          Architecture prête pour de futures connexions. Chaque service nécessite votre autorisation explicite.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {connections.map((c) => (
            <button
              key={c.id}
              onClick={() => toggleConnection(c.provider, c.status !== "connected")}
              className={`rounded-xl border px-3 py-3 text-left text-xs transition ${
                c.status === "connected"
                  ? "border-cyan-glow/40 bg-cyan-glow/10 text-cyan-glow"
                  : "border-white/10 bg-white/5 text-white/50 hover:border-white/20"
              }`}
            >
              <p className="font-medium">{c.label}</p>
              <p className="mt-0.5 opacity-70">{c.status === "connected" ? "Connecté" : "Non connecté"}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-white/60">Journal d&apos;activité</h2>
        <div className="glass max-h-72 space-y-1.5 overflow-y-auto rounded-2xl p-3">
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-white/5">
              <span className="text-white/70">{l.action}</span>
              <span className="text-xs text-white/30">{new Date(l.createdAt).toLocaleString("fr-FR")}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-white/30">Aucune activité.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-white/60">Zone de danger</h2>
        <div className="glass rounded-2xl border border-red-500/20 p-4">
          <p className="mb-3 text-sm text-white/60">
            Supprime définitivement votre compte et toutes vos données (conversations, mémoire, tâches, fichiers, automatisations).
          </p>
          {confirmDelete ? (
            <div className="flex gap-2">
              <button onClick={deleteAccount} className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs text-red-300">
                Confirmer la suppression
              </button>
              <button onClick={() => setConfirmDelete(false)} className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/50">
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20"
            >
              <Trash2 size={13} /> Supprimer mon compte et mes données
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
