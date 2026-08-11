"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
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
      const res = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Impossible de contacter le serveur");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="grid-backdrop pointer-events-none absolute inset-0" />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(77,216,255,0.35), transparent 70%)" }}
      />

      <div className="glass-strong border-glow animate-fade-in-up relative z-10 w-full max-w-md rounded-2xl p-8">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="relative h-14 w-14">
            <div className="absolute inset-0 animate-orb-pulse rounded-full bg-gradient-to-br from-jarvis-cyan to-jarvis-blue opacity-70 blur-md" />
            <div className="glass-strong relative flex h-14 w-14 items-center justify-center rounded-full border-glow">
              <span className="font-display text-lg font-semibold text-jarvis-cyan-strong">J</span>
            </div>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-wide text-glow">JARVIS</h1>
          <p className="text-sm text-jarvis-text-dim">
            {mode === "login" ? "Ravi de vous revoir. Identifiez-vous pour continuer." : "Créez votre centre de contrôle personnel."}
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <Field label="Prénom">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Théo"
                className="jarvis-input"
              />
            </Field>
          )}
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@exemple.com"
              className="jarvis-input"
            />
          </Field>
          <Field label="Mot de passe">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "register" ? 8 : undefined}
              placeholder="••••••••"
              className="jarvis-input"
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-jarvis-danger/30 bg-jarvis-danger/10 px-3 py-2 text-sm text-jarvis-danger">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-gradient-to-r from-jarvis-cyan to-jarvis-blue px-4 py-3 font-display font-semibold tracking-wide text-jarvis-bg transition-all hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-jarvis-text-dim">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <Link href="/register" className="text-jarvis-cyan-strong hover:underline">
                Créer un compte
              </Link>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <Link href="/login" className="text-jarvis-cyan-strong hover:underline">
                Se connecter
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-jarvis-text-dim">{label}</span>
      {children}
    </label>
  );
}
