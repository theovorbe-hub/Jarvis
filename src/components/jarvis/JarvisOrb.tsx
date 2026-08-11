"use client";

import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useMemo } from "react";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const STATE_LABEL: Record<OrbState, string> = {
  idle: "En attente",
  listening: "Je vous écoute…",
  thinking: "Analyse en cours…",
  speaking: "Réponse en cours",
};

export function JarvisOrb({ state, size = 220 }: { state: OrbState; size?: number }) {
  const bars = useMemo(() => Array.from({ length: 24 }), []);
  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        angle: (360 / 14) * i,
        delay: (i % 7) * 0.25,
        dist: 70 + (i % 3) * 20,
      })),
    []
  );

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex items-center justify-center" style={{ width: size * 1.9, height: size * 1.9 }}>
        {/* outer glow */}
        <div
          className={clsx(
            "absolute rounded-full blur-3xl transition-all duration-700",
            state === "listening" && "opacity-90",
            state === "thinking" && "opacity-80",
            state === "speaking" && "opacity-95",
            state === "idle" && "opacity-50"
          )}
          style={{
            width: size * 1.4,
            height: size * 1.4,
            background:
              state === "thinking"
                ? "radial-gradient(circle, rgba(255,180,84,0.35), transparent 70%)"
                : "radial-gradient(circle, rgba(77,216,255,0.45), transparent 70%)",
          }}
        />

        {/* rotating rings */}
        <div
          className="animate-ring-spin absolute rounded-full border border-jarvis-cyan/25"
          style={{ width: size * 1.55, height: size * 1.55, borderStyle: "dashed" }}
        />
        <div
          className="animate-idle-rotate-reverse absolute rounded-full border border-jarvis-blue/20"
          style={{ width: size * 1.3, height: size * 1.3 }}
        />

        {/* thinking particles */}
        <AnimatePresence>
          {state === "thinking" &&
            particles.map((p) => {
              const rad = (p.angle * Math.PI) / 180;
              const dx = Math.cos(rad) * p.dist;
              const dy = Math.sin(rad) * p.dist;
              return (
                <motion.span
                  key={p.id}
                  className="absolute h-1.5 w-1.5 rounded-full bg-jarvis-amber"
                  style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as React.CSSProperties}
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.5 }}
                  animate={{ opacity: [0, 1, 0], x: dx, y: dy, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: p.delay, ease: "easeOut" }}
                />
              );
            })}
        </AnimatePresence>

        {/* listening waveform ring */}
        {state === "listening" && (
          <div className="absolute flex items-center justify-center gap-[3px]" style={{ width: size * 1.25 }}>
            {bars.map((_, i) => (
              <span
                key={i}
                className="inline-block w-[3px] rounded-full bg-jarvis-cyan-strong"
                style={{
                  height: 14 + ((i * 37) % 26),
                  animation: `wave-bar ${0.6 + (i % 5) * 0.12}s ease-in-out infinite`,
                  animationDelay: `${(i % 6) * 0.07}s`,
                  transformOrigin: "center",
                }}
              />
            ))}
          </div>
        )}

        {/* core orb */}
        <motion.div
          animate={{
            scale: state === "listening" ? [1, 1.06, 1] : state === "speaking" ? [1, 1.03, 1] : 1,
          }}
          transition={{ duration: state === "listening" ? 1.1 : 1.6, repeat: Infinity, ease: "easeInOut" }}
          className={clsx(
            "animate-orb-pulse relative flex items-center justify-center rounded-full border-glow",
            "bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.35),rgba(77,216,255,0.25)_35%,rgba(10,16,24,0.9)_75%)]"
          )}
          style={{ width: size, height: size }}
        >
          <div
            className="absolute inset-3 rounded-full opacity-70"
            style={{
              background:
                state === "thinking"
                  ? "conic-gradient(from 0deg, rgba(255,180,84,0.5), transparent 40%, rgba(255,180,84,0.5))"
                  : "conic-gradient(from 0deg, rgba(77,216,255,0.55), transparent 40%, rgba(77,216,255,0.55))",
              animation: "ring-spin 5s linear infinite",
            }}
          />
          <div className="glass-strong relative flex h-[68%] w-[68%] items-center justify-center rounded-full">
            <span className="font-display text-3xl font-semibold text-jarvis-cyan-strong text-glow">J</span>
          </div>
        </motion.div>
      </div>

      <p className={clsx("font-display text-sm tracking-[0.2em] uppercase", state !== "idle" ? "shimmer-text" : "text-jarvis-text-dim")}>
        {STATE_LABEL[state]}
      </p>
    </div>
  );
}
