"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Send, Volume2, Copy, RotateCcw, Pin, Mic, MicOff, Square } from "lucide-react";
import { JarvisOrb, type OrbState } from "@/components/jarvis/JarvisOrb";
import { useVoice } from "@/lib/hooks/useVoice";
import type { SearchResult } from "@/lib/agents/research";

export type UIAction = { tool: string; summary: string };
export type UIMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: UIAction[];
  sources?: SearchResult[];
  createdAt: string;
  pending?: boolean;
};

export function ChatPanel({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [voiceName, setVoiceName] = useState<string | undefined>(undefined);
  const [voiceModeOn, setVoiceModeOn] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setMuted(!d.settings.voiceEnabled);
          setVolume(d.settings.voiceVolume ?? 0.8);
          setVoiceName(d.settings.voiceName);
        }
      })
      .catch(() => {});
  }, []);

  const { state: voiceState, supported, interimTranscript, startListening, stopListening, speak, cancelSpeaking } =
    useVoice({
      onFinalTranscript: (text) => {
        void sendMessage(text);
      },
      volume,
      voiceName,
      muted,
    });

  useEffect(() => {
    if (voiceState === "listening") setOrbState("listening");
    else if (voiceState === "speaking") setOrbState("speaking");
    else if (orbState !== "thinking") setOrbState("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    function onToggleVoice() {
      toggleListening();
    }
    function onEscape() {
      stopListening();
      cancelSpeaking();
    }
    window.addEventListener("jarvis:toggle-voice", onToggleVoice);
    window.addEventListener("jarvis:escape", onEscape);
    return () => {
      window.removeEventListener("jarvis:toggle-voice", onToggleVoice);
      window.removeEventListener("jarvis:escape", onEscape);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState]);

  function toggleListening() {
    if (!supported) return;
    if (voiceState === "listening") {
      stopListening();
    } else {
      cancelSpeaking();
      setVoiceModeOn(true);
      startListening();
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userMsg: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    const pendingMsg: UIMessage = {
      id: "pending",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setInput("");
    setOrbState("thinking");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversationId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) =>
          prev.filter((m) => m.id !== "pending").concat({
            id: crypto.randomUUID(),
            role: "assistant",
            content: data.error ?? "Une erreur est survenue.",
            createdAt: new Date().toISOString(),
          })
        );
        setOrbState("idle");
        return;
      }

      setConversationId(data.conversationId);
      const assistantMsg: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        actions: data.actions,
        sources: data.sources,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => prev.filter((m) => m.id !== "pending").concat(assistantMsg));

      if (voiceModeOn && !muted) {
        setOrbState("speaking");
        speak(data.reply, () => setOrbState("idle"));
      } else {
        setOrbState("idle");
      }
    } catch {
      setMessages((prev) =>
        prev.filter((m) => m.id !== "pending").concat({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Impossible de contacter le serveur.",
          createdAt: new Date().toISOString(),
        })
      );
      setOrbState("idle");
    }
  }

  function regenerateFrom(assistantMessageId: string) {
    const index = messages.findIndex((m) => m.id === assistantMessageId);
    const lastUser = [...messages.slice(0, index)].reverse().find((m) => m.role === "user");
    if (lastUser) {
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
      void sendMessage(lastUser.content);
    }
  }

  async function memorize(content: string) {
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: content.slice(0, 48), content, category: "note" }),
    });
  }

  return (
    <div className="flex h-full flex-1 flex-col items-center gap-6 px-4 pb-4 pt-8 md:px-8">
      {!compact && <JarvisOrb state={orbState} size={150} />}

      <div className="flex w-full max-w-3xl flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
          {messages.length === 0 && (
            <div className="glass animate-fade-in-up mt-6 rounded-2xl p-6 text-center text-sm text-jarvis-text-dim">
              Dites « JARVIS » ou écrivez votre première demande — planifier une journée, mémoriser une information,
              analyser un fichier, faire une recherche…
            </div>
          )}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onSpeak={speak} onMemorize={memorize} onRegenerate={regenerateFrom} />
          ))}
          {interimTranscript && (
            <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-jarvis-cyan/10 px-4 py-2 text-sm text-jarvis-text-dim italic">
              {interimTranscript}…
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(input);
          }}
          className="glass-strong flex items-center gap-2 rounded-2xl p-2"
        >
          <button
            type="button"
            onClick={toggleListening}
            disabled={!supported}
            title={supported ? "Activer la voix (Espace)" : "Reconnaissance vocale non supportée par ce navigateur"}
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              voiceState === "listening"
                ? "bg-jarvis-cyan text-jarvis-bg"
                : "bg-white/5 text-jarvis-text-dim hover:text-jarvis-cyan-strong",
              !supported && "opacity-30"
            )}
          >
            {voiceState === "listening" ? <Square size={16} /> : <Mic size={18} />}
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Écrivez à JARVIS…"
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-jarvis-text-dim/60"
          />

          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Réactiver la voix" : "Couper le son"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-jarvis-text-dim transition-colors hover:text-jarvis-text"
          >
            {muted ? <MicOff size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            type="submit"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-jarvis-cyan to-jarvis-blue text-jarvis-bg transition-transform hover:scale-105"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  onSpeak,
  onMemorize,
  onRegenerate,
}: {
  message: UIMessage;
  onSpeak: (text: string) => void;
  onMemorize: (text: string) => void;
  onRegenerate: (id: string) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div className={clsx("animate-fade-in-up flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <div
        className={clsx(
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser ? "rounded-br-sm bg-gradient-to-br from-jarvis-cyan/20 to-jarvis-blue/10 text-jarvis-text" : "glass rounded-bl-sm"
        )}
      >
        {message.pending ? (
          <span className="shimmer-text font-display tracking-wide">Analyse en cours…</span>
        ) : (
          message.content
        )}
      </div>

      {!message.pending && !!message.actions?.length && (
        <div className="flex flex-wrap gap-1.5">
          {message.actions.map((a, i) => (
            <span
              key={i}
              className="rounded-full border border-jarvis-panel-border bg-white/5 px-2.5 py-0.5 text-[11px] text-jarvis-text-dim"
            >
              ⚡ {a.summary}
            </span>
          ))}
        </div>
      )}

      {!message.pending && !!message.sources?.length && (
        <div className="flex w-full max-w-[85%] flex-col gap-1.5 rounded-xl border border-jarvis-panel-border bg-white/[0.02] p-2.5">
          <span className="text-[11px] uppercase tracking-wide text-jarvis-text-dim">Sources</span>
          {message.sources.map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col rounded-lg px-2 py-1.5 text-xs hover:bg-white/5"
            >
              <span className="text-jarvis-cyan-strong">{s.title}</span>
              <span className="text-jarvis-text-dim">
                {s.source}
                {s.publishedDate ? ` — ${s.publishedDate}` : ""}
              </span>
            </a>
          ))}
        </div>
      )}

      {!message.pending && !isUser && message.content && (
        <div className="flex gap-1">
          <IconAction icon={<Volume2 size={13} />} label="Écouter" onClick={() => onSpeak(message.content)} />
          <IconAction icon={<Copy size={13} />} label="Copier" onClick={() => navigator.clipboard.writeText(message.content)} />
          <IconAction icon={<RotateCcw size={13} />} label="Régénérer" onClick={() => onRegenerate(message.id)} />
          <IconAction icon={<Pin size={13} />} label="Mémoriser" onClick={() => onMemorize(message.content)} />
        </div>
      )}
    </div>
  );
}

function IconAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-jarvis-text-dim hover:bg-white/5 hover:text-jarvis-text"
    >
      {icon}
      {label}
    </button>
  );
}
