"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { ShieldCheck, Link2, ScrollText, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  granted: boolean;
  sensitive: boolean;
}
interface Connection {
  id: string;
  provider: string;
  label: string;
  status: string;
  connectedAt: string | null;
}
interface ActivityLog {
  id: string;
  module: string;
  action: string;
  detail: string | null;
  createdAt: string;
}

export function SecurityView() {
  const [permissions, setPermissions] = useState<Permission[] | null>(null);
  const [connections, setConnections] = useState<Connection[] | null>(null);
  const [logs, setLogs] = useState<ActivityLog[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/permissions").then((r) => r.json()).then((d) => setPermissions(d.permissions));
    fetch("/api/connections").then((r) => r.json()).then((d) => setConnections(d.connections));
    fetch("/api/activity?limit=30").then((r) => r.json()).then((d) => setLogs(d.logs));
  }, []);

  async function togglePermission(p: Permission) {
    setPermissions((list) => list?.map((x) => (x.id === p.id ? { ...x, granted: !x.granted } : x)) ?? list);
    await fetch(`/api/permissions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ granted: !p.granted }),
    });
  }

  async function toggleConnection(c: Connection) {
    const nextStatus = c.status === "connected" ? "disconnected" : "connected";
    setConnections((list) => list?.map((x) => (x.id === c.id ? { ...x, status: nextStatus } : x)) ?? list);
    await fetch(`/api/connections/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
  }

  async function deleteAllData() {
    setDeleting(true);
    await fetch("/api/account", { method: "DELETE" });
    signOut({ callbackUrl: "/register" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-glow">Sécurité &amp; Permissions</h1>
        <p className="text-sm text-white/40">Ce que JARVIS est autorisé à faire, et rien de plus.</p>
      </div>

      <section className="card space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-electric-300" />
          <h2 className="label-caps">Permissions accordées</h2>
        </div>
        <div className="space-y-3">
          {permissions?.map((p) => (
            <div key={p.id} className="flex items-start justify-between gap-4 border-b border-white/[0.04] pb-3 last:border-0 last:pb-0">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white/80">{p.name}</p>
                  {p.sensitive && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">Sensible</span>
                  )}
                </div>
                <p className="text-xs text-white/40">{p.description}</p>
              </div>
              <button
                onClick={() => togglePermission(p)}
                className={clsx(
                  "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                  p.granted ? "bg-electric-500" : "bg-white/10"
                )}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
                    p.granted ? "translate-x-5" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-electric-300" />
          <h2 className="label-caps">Intégrations</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {connections?.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] px-3 py-2.5">
              <div>
                <p className="text-sm text-white/80">{c.label}</p>
                <p className="text-xs text-white/30">
                  {c.status === "connected" ? `Connecté${c.connectedAt ? " · " + new Date(c.connectedAt).toLocaleDateString("fr-FR") : ""}` : "Non connecté"}
                </p>
              </div>
              <button
                onClick={() => toggleConnection(c)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-medium",
                  c.status === "connected" ? "bg-white/[0.06] text-white/50 hover:text-red-400" : "bg-electric-500/15 text-electric-300 hover:bg-electric-500/25"
                )}
              >
                {c.status === "connected" ? "Déconnecter" : "Connecter"}
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <ScrollText className="h-4 w-4 text-electric-300" />
          <h2 className="label-caps">Journal d&apos;activité</h2>
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {logs?.map((log) => (
            <div key={log.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-xs">
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-white/50">{log.module}</span>
              <span className="text-white/70">{log.action}</span>
              {log.detail && <span className="truncate text-white/30">— {log.detail}</span>}
              <span className="ml-auto shrink-0 text-white/25">{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-3 border-red-500/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <h2 className="label-caps text-red-400/80">Zone dangereuse</h2>
        </div>
        <p className="text-sm text-white/50">
          Supprime définitivement votre compte JARVIS : conversations, mémoire, tâches, automatisations et fichiers.
          Cette action est irréversible.
        </p>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="btn-ghost text-red-400 hover:bg-red-500/10">
            <Trash2 className="h-4 w-4" /> Supprimer toutes mes données
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={deleteAllData}
              disabled={deleting}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmer la suppression définitive"}
            </button>
            <button onClick={() => setConfirmDelete(false)} className="btn-ghost text-sm">
              Annuler
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
