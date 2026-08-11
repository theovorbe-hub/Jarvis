"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ShieldCheck, ShieldAlert, Trash2, Plug, ScrollText, AlertTriangle } from "lucide-react";
import { ActivityFeed, type ActivityItem } from "@/components/dashboard/ActivityFeed";
import { Modal } from "@/components/ui/Modal";
import { CONNECTION_PROVIDERS } from "@/lib/permissions";

type Permission = {
  id: string;
  key: string;
  label: string;
  description: string;
  granted: boolean;
  sensitive: boolean;
};

type Connection = {
  id: string;
  provider: string;
  label: string;
  status: string;
  connectedAt?: string | null;
};

export default function SecurityPage() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  async function load() {
    const [p, c, a] = await Promise.all([
      fetch("/api/permissions").then((r) => r.json()),
      fetch("/api/connections").then((r) => r.json()),
      fetch("/api/activity?limit=30").then((r) => r.json()),
    ]);
    setPermissions(p.permissions ?? []);
    setConnections(c.connections ?? []);
    setActivity(a.activity ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function togglePermission(p: Permission) {
    if (p.sensitive && p.granted && !confirm(`Révoquer « ${p.label} » ? JARVIS ne pourra plus l'utiliser.`)) return;
    await fetch(`/api/permissions/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ granted: !p.granted }),
    });
    void load();
  }

  async function revokeConnection(id: string) {
    if (!confirm("Révoquer l'accès à ce service ?")) return;
    await fetch(`/api/connections/${id}`, { method: "DELETE" });
    void load();
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Confiance & contrôle</p>
        <h1 className="font-display text-2xl font-semibold">Sécurité & permissions</h1>
      </div>

      <section className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">
          <ShieldCheck size={15} /> Permissions accordées à JARVIS
        </h3>
        <div className="flex flex-col divide-y divide-jarvis-panel-border">
          {permissions.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  {p.label}
                  {p.sensitive && <ShieldAlert size={13} className="text-jarvis-amber" />}
                </p>
                <p className="text-xs text-jarvis-text-dim">{p.description}</p>
              </div>
              <button
                onClick={() => togglePermission(p)}
                className={clsx("relative h-5 w-9 shrink-0 rounded-full transition-colors", p.granted ? "bg-jarvis-cyan" : "bg-white/10")}
              >
                <span
                  className={clsx(
                    "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                    p.granted ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">
            <Plug size={15} /> Services connectés
          </h3>
          <button
            onClick={() => setConnectModalOpen(true)}
            className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-jarvis-text-dim hover:text-jarvis-text"
          >
            + Connecter un service
          </button>
        </div>
        {connections.length === 0 ? (
          <p className="text-sm text-jarvis-text-dim">Aucun service externe connecté pour le moment.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {connections.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] p-3 text-sm">
                <div>
                  <p>{c.label}</p>
                  <p className="text-xs text-jarvis-text-dim">
                    {c.provider} — connecté {c.connectedAt ? new Date(c.connectedAt).toLocaleDateString("fr-FR") : ""}
                  </p>
                </div>
                <button onClick={() => revokeConnection(c.id)} className="text-jarvis-text-dim hover:text-jarvis-danger">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-text-dim">
          <ScrollText size={15} /> Journal d&apos;activité
        </h3>
        <ActivityFeed items={activity} />
      </section>

      <section className="glass rounded-2xl border border-jarvis-danger/25 p-5">
        <h3 className="mb-2 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-jarvis-danger">
          <AlertTriangle size={15} /> Zone de danger
        </h3>
        <p className="mb-4 text-sm text-jarvis-text-dim">
          Supprime définitivement votre compte, vos souvenirs, conversations, fichiers et automatisations. Cette action est
          irréversible.
        </p>
        <button
          onClick={() => setDeleteModalOpen(true)}
          className="rounded-xl border border-jarvis-danger/40 px-4 py-2 text-sm text-jarvis-danger hover:bg-jarvis-danger/10"
        >
          Supprimer toutes mes données
        </button>
      </section>

      <ConnectModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        onSaved={() => {
          setConnectModalOpen(false);
          void load();
        }}
      />
      <DeleteAccountModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleted={() => router.push("/login")}
      />
    </div>
  );
}

function ConnectModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [provider, setProvider] = useState(CONNECTION_PROVIDERS[0].provider);
  const [label, setLabel] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setProvider(CONNECTION_PROVIDERS[0].provider);
      setLabel("");
      setConsent(false);
    }
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) return;
    setSaving(true);
    await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, label, consent: true }),
    });
    setSaving(false);
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Connecter un service">
      <form onSubmit={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Type de service</span>
          <select value={provider} onChange={(e) => setProvider(e.target.value)} className="jarvis-input">
            {CONNECTION_PROVIDERS.map((p) => (
              <option key={p.provider} value={p.provider}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-jarvis-text-dim/70">
            {CONNECTION_PROVIDERS.find((p) => p.provider === provider)?.description}
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-jarvis-text-dim">Nom du service</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} required placeholder="ex : Google Agenda" className="jarvis-input" />
        </label>
        <label className="flex items-start gap-2 text-xs text-jarvis-text-dim">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5" />
          J&apos;autorise explicitement JARVIS à accéder à ce service en mon nom. Je pourrai révoquer cet accès à tout moment.
        </label>
        <button
          type="submit"
          disabled={saving || !consent}
          className="rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-2.5 text-sm font-medium text-jarvis-bg disabled:opacity-40"
        >
          {saving ? "…" : "Autoriser la connexion"}
        </button>
      </form>
    </Modal>
  );
}

function DeleteAccountModal({ open, onClose, onDeleted }: { open: boolean; onClose: () => void; onDeleted: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword("");
      setError(null);
    }
  }, [open]);

  async function confirmDelete(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur");
      setLoading(false);
      return;
    }
    onDeleted();
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirmer la suppression">
      <form onSubmit={confirmDelete} className="flex flex-col gap-4">
        <p className="text-sm text-jarvis-text-dim">
          Saisissez votre mot de passe pour confirmer la suppression irréversible de toutes vos données.
        </p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="jarvis-input"
          placeholder="Mot de passe"
        />
        {error && <p className="text-sm text-jarvis-danger">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-jarvis-danger px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "…" : "Supprimer définitivement"}
        </button>
      </form>
    </Modal>
  );
}
