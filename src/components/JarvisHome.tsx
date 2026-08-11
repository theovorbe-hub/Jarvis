"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Settings2, Plus, History, X, ShieldAlert } from "lucide-react";
import { JarvisOrb } from "@/components/orb/JarvisOrb";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { useJarvisStore } from "@/store/useJarvisStore";
import { useSpeechRecognition, isSpeechRecognitionSupported } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import type { ChatMessage } from "@/types";

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export function JarvisHome({ userName }: { userName: string | null }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [wakeWordArmed, setWakeWordArmed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    orbState,
    setOrbState,
    voiceModeEnabled,
    setVoiceModeEnabled,
    alwaysListening,
    setAlwaysListening,
    muted,
    setMuted,
    volume,
    setVolume,
    voiceURI,
    setVoiceURI,
  } = useJarvisStore();

  const { speak, cancel, voices, speaking } = useSpeechSynthesis();

  const sendMessage = useCallback(
    async (text: string, image?: { base64: string; mimeType: string; name: string }) => {
      if (!text && !image) return;
      const optimistic: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: text || "(image envoyée)",
        createdAt: new Date().toISOString(),
        attachments: image ? [{ type: "image", mimeType: image.mimeType }] : null,
      };
      setMessages((prev) => [...prev, optimistic]);
      setLoading(true);
      setOrbState("thinking");

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            message: text || "Décris cette image.",
            imageBase64: image?.base64,
            imageMimeType: image?.mimeType,
          }),
        });
        const data = await res.json();

        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: data.error ?? "Une erreur est survenue.",
              createdAt: new Date().toISOString(),
            },
          ]);
          setOrbState("idle");
          setLoading(false);
          return;
        }

        setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.reply,
            toolCalls: data.toolCalls,
            sources: data.sources,
            createdAt: new Date().toISOString(),
          },
        ]);

        if (voiceModeEnabled && !muted) {
          setOrbState("speaking");
          speak(data.reply, { voiceURI: voiceURI ?? undefined, volume, onEnd: () => setOrbState("idle") });
        } else {
          setOrbState("idle");
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: "Connexion impossible. Vérifiez votre réseau et réessayez.",
            createdAt: new Date().toISOString(),
          },
        ]);
        setOrbState("idle");
      } finally {
        setLoading(false);
      }
    },
    [conversationId, voiceModeEnabled, muted, voiceURI, volume, speak, setOrbState]
  );

  const commandRecognition = useSpeechRecognition({
    continuous: false,
    onFinalResult: (transcript) => {
      setOrbState("thinking");
      sendMessage(transcript);
    },
  });

  const wakeRecognition = useSpeechRecognition({
    continuous: true,
    onFinalResult: (transcript) => {
      if (/\bjarvis\b/i.test(transcript)) {
        wakeRecognition.stop();
        setOrbState("listening");
        setTimeout(() => commandRecognition.start(), 300);
      }
    },
  });

  useEffect(() => {
    if (commandRecognition.isListening) setOrbState("listening");
  }, [commandRecognition.isListening, setOrbState]);

  useEffect(() => {
    if (alwaysListening && voiceModeEnabled && !wakeWordArmed && !commandRecognition.isListening) {
      wakeRecognition.start();
      setWakeWordArmed(true);
    }
    if ((!alwaysListening || !voiceModeEnabled) && wakeWordArmed) {
      wakeRecognition.stop();
      setWakeWordArmed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alwaysListening, voiceModeEnabled]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "TEXTAREA" || target.tagName === "INPUT";

      if (e.code === "Space" && !typing) {
        e.preventDefault();
        toggleMic();
      }
      if (e.key === "Escape") {
        commandRecognition.stop();
        cancel();
        setOrbState("idle");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function toggleMic() {
    if (commandRecognition.isListening) {
      commandRecognition.stop();
      setOrbState("idle");
    } else {
      cancel();
      commandRecognition.start();
    }
  }

  async function startNewConversation() {
    setConversationId(null);
    setMessages([]);
    setShowHistory(false);
  }

  async function loadConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setShowHistory(true);
  }

  async function openConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok) {
      const data = await res.json();
      setConversationId(id);
      setMessages(
        data.conversation.messages.map((m: { toolCalls: string | null; sources: string | null; attachments: string | null } & ChatMessage) => ({
          ...m,
          toolCalls: m.toolCalls ? JSON.parse(m.toolCalls) : null,
          sources: m.sources ? JSON.parse(m.sources) : null,
          attachments: m.attachments ? JSON.parse(m.attachments) : null,
        }))
      );
    }
    setShowHistory(false);
  }

  function handleMemorize(text: string) {
    fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: text.slice(0, 60), content: text, category: "general" }),
    });
  }

  const orbVisual: typeof orbState = loading ? "thinking" : speaking ? "speaking" : orbState;

  return (
    <div className="relative flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
        <div>
          <h1 className="text-sm font-semibold text-glow">JARVIS</h1>
          <p className="text-xs text-white/40">
            {userName ? `Bonjour, ${userName}.` : "Votre assistant personnel"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={startNewConversation} className="btn-ghost !px-3 !py-2" title="Nouvelle conversation">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={loadConversations} className="btn-ghost !px-3 !py-2" title="Historique">
            <History className="h-4 w-4" />
          </button>
          <button onClick={() => setShowSettings((v) => !v)} className="btn-ghost !px-3 !py-2" title="Réglages voix">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {showSettings && (
        <VoiceSettings
          voiceModeEnabled={voiceModeEnabled}
          setVoiceModeEnabled={setVoiceModeEnabled}
          alwaysListening={alwaysListening}
          setAlwaysListening={setAlwaysListening}
          muted={muted}
          setMuted={setMuted}
          volume={volume}
          setVolume={setVolume}
          voiceURI={voiceURI}
          setVoiceURI={setVoiceURI}
          voices={voices}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHistory && (
        <div className="absolute right-6 top-16 z-40 w-72 rounded-2xl border border-white/10 bg-void-900/95 p-2 shadow-glow backdrop-blur-xl">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="label-caps">Conversations</span>
            <button onClick={() => setShowHistory(false)}>
              <X className="h-3.5 w-3.5 text-white/40" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {conversations.length === 0 && <p className="px-2 py-3 text-xs text-white/40">Aucune conversation.</p>}
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className="block w-full truncate rounded-lg px-2 py-2 text-left text-sm text-white/70 hover:bg-white/[0.06]"
              >
                {c.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          <JarvisOrb state={orbVisual} size={240} />
          <button
            onClick={toggleMic}
            disabled={!isSpeechRecognitionSupported()}
            className="btn-primary !px-6 !py-3 text-sm"
          >
            <Mic className="h-4 w-4" />
            ACTIVER JARVIS en disant « Jarvis »
          </button>
          {!isSpeechRecognitionSupported() && (
            <p className="max-w-sm text-center text-xs text-white/30">
              La reconnaissance vocale n&apos;est pas supportée par ce navigateur. Utilisez le champ texte ci-dessous.
            </p>
          )}
          <div className="w-full max-w-2xl px-2">
            <ChatInput
              onSend={sendMessage}
              onToggleMic={toggleMic}
              isListening={commandRecognition.isListening}
              disabled={loading}
              micSupported={isSpeechRecognitionSupported()}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center border-b border-white/[0.04] py-4">
            <JarvisOrb state={orbVisual} size={100} />
          </div>
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onSpeak={(t) => speak(t, { voiceURI: voiceURI ?? undefined, volume })}
                  onMemorize={handleMemorize}
                />
              ))}
            </div>
          </div>
          <div className="border-t border-white/[0.06] px-6 py-4">
            <div className="mx-auto max-w-2xl">
              <ChatInput
                onSend={sendMessage}
                onToggleMic={toggleMic}
                isListening={commandRecognition.isListening}
                disabled={loading}
                micSupported={isSpeechRecognitionSupported()}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function VoiceSettings(props: {
  voiceModeEnabled: boolean;
  setVoiceModeEnabled: (v: boolean) => void;
  alwaysListening: boolean;
  setAlwaysListening: (v: boolean) => void;
  muted: boolean;
  setMuted: (v: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  voiceURI: string | null;
  setVoiceURI: (v: string | null) => void;
  voices: SpeechSynthesisVoice[];
  onClose: () => void;
}) {
  const [showConsent, setShowConsent] = useState(false);

  return (
    <div className="absolute right-6 top-16 z-40 w-80 space-y-4 rounded-2xl border border-white/10 bg-void-900/95 p-4 shadow-glow backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="label-caps">Réglages vocaux</span>
        <button onClick={props.onClose}>
          <X className="h-3.5 w-3.5 text-white/40" />
        </button>
      </div>

      <ToggleRow
        label="Mode vocal"
        description="JARVIS lit ses réponses à voix haute."
        checked={props.voiceModeEnabled}
        onChange={props.setVoiceModeEnabled}
      />
      <ToggleRow
        label="Muet"
        description="Coupe temporairement la voix de sortie."
        checked={props.muted}
        onChange={props.setMuted}
      />

      <div>
        <label className="label-caps mb-1.5 block">Volume</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={props.volume}
          onChange={(e) => props.setVolume(Number(e.target.value))}
          className="w-full accent-electric-500"
        />
      </div>

      {props.voices.length > 0 && (
        <div>
          <label className="label-caps mb-1.5 block">Voix</label>
          <select
            value={props.voiceURI ?? ""}
            onChange={(e) => props.setVoiceURI(e.target.value || null)}
            className="input-field !py-2 text-sm"
          >
            <option value="">Voix par défaut</option>
            {props.voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="border-t border-white/[0.06] pt-3">
        <ToggleRow
          label="Toujours à l'écoute"
          description="Détecte en continu le mot « Jarvis ». Nécessite votre consentement."
          checked={props.alwaysListening}
          onChange={(v) => {
            if (v) setShowConsent(true);
            else props.setAlwaysListening(false);
          }}
        />
      </div>

      {showConsent && (
        <div className="space-y-3 rounded-xl border border-electric-500/30 bg-electric-500/5 p-3">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-electric-300" />
            <p className="text-xs text-white/70">
              JARVIS écoutera en continu depuis ce navigateur pour détecter le mot d&apos;activation. Aucun audio
              n&apos;est envoyé au serveur avant que « Jarvis » ne soit prononcé. Vous pouvez désactiver cette
              option à tout moment.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                props.setAlwaysListening(true);
                props.setVoiceModeEnabled(true);
                setShowConsent(false);
              }}
              className="btn-primary flex-1 !py-1.5 text-xs"
            >
              J&apos;autorise
            </button>
            <button onClick={() => setShowConsent(false)} className="btn-ghost flex-1 !py-1.5 text-xs">
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm text-white/80">{label}</p>
        <p className="text-xs text-white/40">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-electric-500" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}
