"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de création du compte.");
      router.push("/jarvis");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="grid-scan pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-glow/10 blur-[120px]" />

      <div className="glass-strong relative w-full max-w-sm rounded-2xl p-8 shadow-glow">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full border border-cyan-glow/40 shadow-glow-sm" />
          <h1 className="text-2xl font-semibold tracking-wide text-glow">JARVIS</h1>
          <p className="mt-1 text-sm text-white/50">Créez votre assistant personnel</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Prénom</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-glow/60 focus:ring-1 focus:ring-cyan-glow/40"
              placeholder="Tony"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-glow/60 focus:ring-1 focus:ring-cyan-glow/40"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs uppercase tracking-wider text-white/40">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none transition focus:border-cyan-glow/60 focus:ring-1 focus:ring-cyan-glow/40"
              placeholder="8 caractères minimum"
            />
          </div>

          {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-electric to-cyan-glow px-4 py-2.5 text-sm font-medium text-void shadow-glow-sm transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Déjà un compte ?{" "}
          <Link href="/login" className="text-cyan-glow hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
