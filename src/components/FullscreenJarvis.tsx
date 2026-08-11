"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, X, Cloud, Wifi, WifiOff, Activity as ActivityIcon } from "lucide-react";
import { JarvisOrb } from "@/components/orb/JarvisOrb";
import { useJarvisStore } from "@/store/useJarvisStore";
import { useSpeechRecognition, isSpeechRecognitionSupported } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import { useSystemStatus } from "@/hooks/useSystemStatus";

interface DashboardSnapshot {
  weather: { temperature: number; condition: string; city: string } | null;
  activity: { id: string; action: string; detail: string | null; createdAt: string }[];
}

export function FullscreenJarvis({ userName }: { userName: string | null }) {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [reply, setReply] = useState<string | null>(null);
  const { orbState, setOrbState, volume, voiceURI } = useJarvisStore();
  const { speak, speaking } = useSpeechSynthesis();
  const system = useSystemStatus();

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    const poll = setInterval(loadSnapshot, 30000);
    loadSnapshot();
    return () => {
      clearInterval(clock);
      clearInterval(poll);
    };
  }, []);

  async function loadSnapshot() {
    const res = await fetch("/api/dashboard");
    if (res.ok) {
      const data = await res.json();
      setSnapshot({ weather: data.weather, activity: data.activity });
    }
  }

  async function ask(transcript: string) {
    setOrbState("thinking");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: transcript }),
    });
    const data = await res.json();
    if (res.ok) {
      setReply(data.reply);
      setOrbState("speaking");
      speak(data.reply, { voiceURI: voiceURI ?? undefined, volume, onEnd: () => setOrbState("idle") });
      loadSnapshot();
    } else {
      setOrbState("idle");
    }
  }

  const recognition = useSpeechRecognition({ continuous: false, onFinalResult: ask });

  useEffect(() => {
    if (recognition.isListening) setOrbState("listening");
  }, [recognition.isListening, setOrbState]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        recognition.isListening ? recognition.stop() : recognition.start();
      }
      if (e.key === "Escape") router.push("/");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orbVisual = speaking ? "speaking" : orbState;

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-void-950 bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(46,157,255,0.08),transparent)]" />

      <button
        onClick={() => router.push("/")}
        className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="absolute left-6 top-6 space-y-1">
        <p className="text-5xl font-light tabular-nums text-glow">
          {now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-sm text-white/40">
          {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {userName && <p className="text-xs text-electric-300/70">Bonjour, {userName}.</p>}
      </div>

      <div className="absolute right-6 top-24 space-y-2 text-right">
        {snapshot?.weather && (
          <div className="flex items-center justify-end gap-2 text-sm text-white/60">
            <span>
              {snapshot.weather.temperature}°C · {snapshot.weather.condition}
            </span>
            <Cloud className="h-4 w-4 text-electric-300" />
          </div>
        )}
        <div className="flex items-center justify-end gap-2 text-sm text-white/40">
          <span>{system.online ? "Système en ligne" : "Hors ligne"}</span>
          {system.online ? <Wifi className="h-4 w-4 text-electric-300" /> : <WifiOff className="h-4 w-4 text-red-400" />}
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
        <JarvisOrb state={orbVisual} size={340} />

        {reply && (
          <p className="max-w-lg text-center text-lg text-white/80">{reply}</p>
        )}

        {isSpeechRecognitionSupported() && (
          <button
            onClick={() => (recognition.isListening ? recognition.stop() : recognition.start())}
            className="btn-primary !px-6 !py-3 text-sm"
          >
            <Mic className="h-4 w-4" />
            {recognition.isListening ? "Écoute…" : "Parler à JARVIS (Espace)"}
          </button>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 w-full max-w-xl -translate-x-1/2 px-6">
        <div className="flex items-center gap-2 text-xs text-white/30">
          <ActivityIcon className="h-3.5 w-3.5 text-electric-400" />
          <div className="flex-1 overflow-hidden whitespace-nowrap">
            {snapshot?.activity?.[0]
              ? `${snapshot.activity[0].action}${snapshot.activity[0].detail ? " — " + snapshot.activity[0].detail : ""}`
              : "En attente d'activité…"}
          </div>
        </div>
      </div>
    </div>
  );
}
