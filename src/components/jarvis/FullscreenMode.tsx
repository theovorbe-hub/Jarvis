"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { JarvisOrb, JarvisState } from "./JarvisOrb";

interface DashboardSnapshot {
  weather: { temperatureC: number; condition: string; city: string } | null;
  activity: Array<{ id: string; action: string; createdAt: string }>;
}

export function FullscreenMode({ state, onClose }: { state: JarvisState; onClose: () => void }) {
  const [now, setNow] = useState(new Date());
  const [data, setData] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="grid-scan fixed inset-0 z-50 flex flex-col items-center justify-center bg-void"
    >
      <button
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full border border-white/10 p-2 text-white/50 hover:text-white"
      >
        <X size={18} />
      </button>

      <div className="absolute left-6 top-6 font-mono text-white/50">
        <p className="text-4xl text-glow text-cyan-glow">
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-xs uppercase tracking-widest">
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {data?.weather && (
        <div className="absolute right-6 top-24 text-right font-mono text-white/50">
          <p className="text-2xl text-cyan-glow">{data.weather.temperatureC}°C</p>
          <p className="text-xs">{data.weather.condition}</p>
          <p className="text-[10px] text-white/30">{data.weather.city}</p>
        </div>
      )}

      <JarvisOrb state={state} size={320} />

      <div className="absolute bottom-10 w-full max-w-md px-6">
        <p className="mb-2 text-center text-[11px] uppercase tracking-widest text-white/30">Activité récente</p>
        <div className="space-y-1.5">
          {(data?.activity ?? []).slice(0, 4).map((a) => (
            <div key={a.id} className="glass flex items-center justify-between rounded-lg px-3 py-1.5 text-xs text-white/60">
              <span>{a.action}</span>
              <span className="text-white/30">{new Date(a.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
