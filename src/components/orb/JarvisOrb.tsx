"use client";

import { motion } from "framer-motion";
import clsx from "clsx";
import type { OrbState } from "@/store/useJarvisStore";

const STATE_LABEL: Record<OrbState, string> = {
  idle: "En veille",
  listening: "Je vous écoute…",
  thinking: "Analyse en cours…",
  speaking: "Réponse…",
};

export function JarvisOrb({ state, size = 220 }: { state: OrbState; size?: number }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {state === "listening" && (
          <>
            <span className="absolute inset-0 rounded-full border border-electric-400/40 animate-pulseRing" />
            <span
              className="absolute inset-0 rounded-full border border-cyan-400/30 animate-pulseRing"
              style={{ animationDelay: "0.6s" }}
            />
            <span
              className="absolute inset-0 rounded-full border border-electric-300/20 animate-pulseRing"
              style={{ animationDelay: "1.2s" }}
            />
          </>
        )}

        {state === "thinking" && (
          <div className="absolute inset-[-14px]">
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                className="absolute inset-0 rounded-full border border-dashed border-electric-400/30 animate-spinSlow"
                style={{ animationDuration: `${6 + i * 3}s`, transform: `scale(${1 - i * 0.08})` }}
              />
            ))}
          </div>
        )}

        <motion.div
          className={clsx(
            "relative flex items-center justify-center rounded-full",
            "bg-gradient-to-br from-electric-400 via-cyan-500 to-electric-600 shadow-glow"
          )}
          style={{ width: size * 0.72, height: size * 0.72 }}
          animate={{
            scale: state === "listening" ? [1, 1.05, 1] : state === "speaking" ? [1, 1.03, 0.99, 1.02, 1] : 1,
          }}
          transition={{
            duration: state === "speaking" ? 1.1 : 1.8,
            repeat: state === "idle" ? 0 : Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="absolute inset-2 rounded-full bg-void-950/30 backdrop-blur-sm" />
          <div className="absolute inset-[18%] rounded-full bg-gradient-to-tr from-white/40 to-transparent opacity-40" />

          {state === "thinking" && (
            <div className="absolute inset-0">
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-white/80"
                  style={{
                    top: "50%",
                    left: "50%",
                  }}
                  animate={{
                    x: Math.cos((i / 8) * Math.PI * 2) * (size * 0.28),
                    y: Math.sin((i / 8) * Math.PI * 2) * (size * 0.28),
                    opacity: [0.2, 1, 0.2],
                  }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}

          {state === "speaking" && (
            <div className="flex items-end gap-1">
              {[...Array(5)].map((_, i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-void-950/70"
                  animate={{ height: [6, 26, 10, 30, 6] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.09, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <p className="label-caps text-electric-300/70">{STATE_LABEL[state]}</p>
    </div>
  );
}
