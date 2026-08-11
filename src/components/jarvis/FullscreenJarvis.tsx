"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Mic, Square } from "lucide-react";
import { JarvisOrb, type OrbState } from "@/components/jarvis/JarvisOrb";
import { LiveClock } from "@/components/layout/Clock";
import { useVoice } from "@/lib/hooks/useVoice";
import type { ActivityItem } from "@/components/dashboard/ActivityFeed";

export function FullscreenJarvis({ userName }: { userName: string }) {
  const router = useRouter();
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [transcriptLine, setTranscriptLine] = useState("");
  const [replyLine, setReplyLine] = useState("Dites « JARVIS » pour commencer.");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const conversationId = useRef<string | undefined>(undefined);

  const { state: voiceState, supported, interimTranscript, startListening, stopListening, speak } = useVoice({
    onFinalTranscript: (text) => void send(text),
    volume: 0.85,
    muted: false,
  });

  const toggleListeningRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (voiceState === "listening") setOrbState("listening");
    else if (voiceState === "speaking") setOrbState("speaking");
    else if (orbState !== "thinking") setOrbState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState]);

  useEffect(() => {
    setTranscriptLine(interimTranscript);
  }, [interimTranscript]);

  useEffect(() => {
    function refreshActivity() {
      fetch("/api/activity?limit=5")
        .then((r) => r.json())
        .then((d) => setActivity(d.activity ?? []))
        .catch(() => {});
    }
    refreshActivity();
    const id = setInterval(refreshActivity, 15000);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        router.push("/");
      } else if (e.code === "Space") {
        e.preventDefault();
        toggleListeningRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearInterval(id);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  async function send(text: string) {
    setTranscriptLine(text);
    setOrbState("thinking");
    setReplyLine("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: conversationId.current }),
      });
      const data = await res.json();
      if (res.ok) {
        conversationId.current = data.conversationId;
        setReplyLine(data.reply);
        setOrbState("speaking");
        speak(data.reply, () => setOrbState("idle"));
      } else {
        setReplyLine(data.error ?? "Erreur");
        setOrbState("idle");
      }
    } catch {
      setReplyLine("Impossible de contacter le serveur.");
      setOrbState("idle");
    }
  }

  function toggleListening() {
    if (!supported) return;
    if (voiceState === "listening") stopListening();
    else startListening();
  }
  useEffect(() => {
    toggleListeningRef.current = toggleListening;
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-jarvis-bg">
      <div className="grid-backdrop pointer-events-none absolute inset-0" />

      <button
        onClick={() => router.push("/")}
        className="absolute right-6 top-6 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-jarvis-text-dim hover:text-jarvis-text"
        title="Quitter le mode plein écran (Échap)"
      >
        <X size={18} />
      </button>

      <div className="absolute left-6 top-6 z-10">
        <LiveClock />
      </div>

      <div className="absolute right-6 top-24 z-10 max-w-xs text-right">
        <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Activité récente</p>
        <ul className="mt-2 flex flex-col gap-1">
          {activity.slice(0, 5).map((a) => (
            <li key={a.id} className="text-[11px] text-jarvis-text-dim">
              {a.action}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-8">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-jarvis-text-dim">Bonjour, {userName}</p>
        <JarvisOrb state={orbState} size={260} />

        <div className="min-h-[4rem] max-w-2xl px-6 text-center">
          {transcriptLine && orbState !== "speaking" && (
            <p className="mb-2 text-sm italic text-jarvis-text-dim">{transcriptLine}</p>
          )}
          {replyLine && <p className="font-display text-lg text-jarvis-text text-glow">{replyLine}</p>}
        </div>

        <button
          onClick={toggleListening}
          disabled={!supported}
          className="glass-strong border-glow flex h-16 w-16 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-30"
        >
          {voiceState === "listening" ? <Square size={22} className="text-jarvis-cyan-strong" /> : <Mic size={24} className="text-jarvis-cyan-strong" />}
        </button>
        <p className="text-xs text-jarvis-text-dim">Espace pour parler · Échap pour quitter</p>
      </div>
    </div>
  );
}
