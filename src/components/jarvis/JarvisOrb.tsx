"use client";

import { motion, AnimatePresence } from "framer-motion";

export type JarvisState = "idle" | "listening" | "thinking" | "speaking";

const STATE_LABEL: Record<JarvisState, string> = {
  idle: "En attente",
  listening: "Écoute en cours…",
  thinking: "Analyse en cours…",
  speaking: "Réponse en cours…",
};

export function JarvisOrb({ state, size = 220 }: { state: JarvisState; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Ambient glow */}
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-colors duration-700"
          style={{
            background:
              state === "idle"
                ? "radial-gradient(circle, rgba(79,216,255,0.18), transparent 70%)"
                : "radial-gradient(circle, rgba(79,216,255,0.38), transparent 70%)",
          }}
        />

        {/* Pulse rings while listening */}
        <AnimatePresence>
          {state === "listening" &&
            [0, 0.5, 1].map((delay) => (
              <motion.div
                key={delay}
                className="absolute rounded-full border border-cyan-glow/50"
                style={{ width: size, height: size }}
                initial={{ scale: 0.85, opacity: 0.6 }}
                animate={{ scale: 1.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 2, repeat: Infinity, delay, ease: "easeOut" }}
              />
            ))}
        </AnimatePresence>

        {/* Thinking particles */}
        {state === "thinking" && (
          <motion.div
            className="absolute rounded-full"
            style={{ width: size * 0.92, height: size * 0.92 }}
            animate={{ rotate: 360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className="absolute h-1.5 w-1.5 rounded-full bg-cyan-glow shadow-glow-sm"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `rotate(${i * 60}deg) translate(${size * 0.46}px) rotate(-${i * 60}deg)`,
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Core orb */}
        <motion.div
          className="relative rounded-full border shadow-glow"
          style={{
            width: size * 0.62,
            height: size * 0.62,
            background:
              "radial-gradient(circle at 35% 30%, rgba(180,238,255,0.9), rgba(46,143,255,0.35) 55%, rgba(5,7,10,0.9) 100%)",
            borderColor: "rgba(126,200,255,0.5)",
          }}
          animate={
            state === "speaking"
              ? { scale: [1, 1.05, 0.98, 1.03, 1] }
              : state === "thinking"
              ? { scale: [1, 1.02, 1] }
              : { scale: 1 }
          }
          transition={
            state === "speaking"
              ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          }
        >
          <div className="absolute inset-3 animate-floaty rounded-full bg-white/5 backdrop-blur-sm" />
        </motion.div>

        {/* Voice waveform while listening */}
        {state === "listening" && (
          <div className="absolute -bottom-2 flex items-end gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <motion.span
                key={i}
                className="w-1 rounded-full bg-cyan-glow"
                animate={{ height: [4, 18, 6, 22, 4] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
              />
            ))}
          </div>
        )}
      </div>

      <p className="text-xs uppercase tracking-[0.2em] text-white/40">{STATE_LABEL[state]}</p>
    </div>
  );
}
