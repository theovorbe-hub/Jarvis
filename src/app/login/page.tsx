"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Fingerprint, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-void-950 bg-grid p-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-electric-500/10 blur-[120px]" />

      <div className="glass-strong relative w-full max-w-sm rounded-3xl p-8 shadow-glow">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-electric-400 to-cyan-500 shadow-glow">
            <Fingerprint className="h-7 w-7 text-void-950" />
          </div>
          <h1 className="text-xl font-semibold text-glow">JARVIS</h1>
          <p className="mt-1 text-sm text-white/50">Votre centre de contrôle personnel</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-caps mb-1.5 block">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <label className="label-caps mb-1.5 block">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Se connecter"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-electric-400 hover:text-electric-300">
            Créer JARVIS
          </Link>
        </p>
      </div>
    </main>
  );
}
