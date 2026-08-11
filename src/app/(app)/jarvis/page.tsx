"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Maximize2, Volume2, VolumeX, Radio } from "lucide-react";
import { JarvisOrb, JarvisState } from "@/components/jarvis/JarvisOrb";
import { MessageBubble, ChatMessage } from "@/components/jarvis/MessageBubble";
import { ChatComposer } from "@/components/jarvis/ChatComposer";
import { FullscreenMode } from "@/components/jarvis/FullscreenMode";
import { useSpeechRecognition } from "@/lib/voice/useSpeechRecognition";
import { useSpeechSynthesis } from "@/lib/voice/useSpeechSynthesis";
import { useWakeWord } from "@/lib/voice/useWakeWord";

interface UserPrefs {
  name: string;
  voiceEnabled: boolean;
  voiceName: string;
  voiceVolume: number;
  alwaysListening: boolean;
  wakeWordEnabled: boolean;
}

interface AttachedFile {
  id: string;
  filename: string;
  kind: string;
}

export default function JarvisPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Bonjour. Je suis JARVIS, votre assistant personnel. Dites « Jarvis » ou écrivez-moi directement — je peux mémoriser des informations, chercher sur le web, analyser vos documents, et organiser votre journée.",
    },
  ]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attached, setAttached] = useState<AttachedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [wakeWordGranted, setWakeWordGranted] = useState(false);
  const [wakeActive, setWakeActive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setPrefs(d.user));
    fetch("/api/permissions")
      .then((r) => r.json())
      .then((d) => {
        const p = d.permissions?.find((p: { capability: string }) => p.capability === "always_listening");
        setWakeWordGranted(!!p?.granted);
      });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: ttsSupported } = useSpeechSynthesis({
    voiceName: prefs?.voiceName ?? "default",
    volume: prefs?.voiceVolume ?? 1,
    muted,
  });

  const sendMessage = useCallback(
    async (text: string, imageFileId?: string) => {
      if (!text.trim()) return;
      const userMsg: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: text,
        imageUrl: imageFileId,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setAttached(null);
      setSending(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, conversationId, imageFileId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur JARVIS.");
        setConversationId(data.conversationId);
        const assistantMsg: ChatMessage = {
          id: data.message.id,
          role: "assistant",
          content: data.message.content,
          actions: data.message.actions,
          sources: data.message.sources,
        };
        setMessages((prev) => [...prev, assistantMsg]);
        if (prefs?.voiceEnabled && ttsSupported) speak(assistantMsg.content);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: err instanceof Error ? err.message : "Une erreur est survenue.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [conversationId, prefs, speak, ttsSupported]
  );

  const { isListening, isSupported: micSupported, start: startMic, stop: stopMic } = useSpeechRecognition({
    onFinalResult: (text) => {
      if (text.trim()) sendMessage(text.trim(), attached?.kind === "image" ? attached.id : undefined);
    },
  });

  useWakeWord(wakeActive && wakeWordGranted, (utterance) => {
    if (utterance.trim()) sendMessage(utterance.trim());
    else startMic();
  });

  async function handleAttach(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'import.");
      setAttached({ id: data.file.id, filename: data.file.filename, kind: data.file.kind });
      if (data.file.kind !== "image") {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: "assistant",
            content: `Document analysé : « ${data.file.filename} ». ${data.file.summary ? `\n\n${data.file.summary}` : "Demandez-moi de le résumer ou de répondre à une question à son sujet."}`,
          },
        ]);
        setAttached(null);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: "assistant", content: err instanceof Error ? err.message : "Erreur d'import." },
      ]);
    } finally {
      setUploading(false);
    }
  }

  function remember(text: string) {
    fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `Note du ${new Date().toLocaleDateString("fr-FR")}`, value: text.slice(0, 500) }),
    });
  }

  const orbState: JarvisState = isListening ? "listening" : sending ? "thinking" : isSpeaking ? "speaking" : "idle";

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-4 py-6 md:px-8">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-glow">JARVIS</h1>
          <p className="text-xs text-white/40">Votre assistant personnel</p>
        </div>
        <div className="flex items-center gap-1.5">
          {wakeWordGranted && (
            <button
              onClick={() => setWakeActive((v) => !v)}
              title="Mode toujours à l'écoute"
              className={`rounded-full p-2 transition ${wakeActive ? "bg-cyan-glow/20 text-cyan-glow" : "text-white/40 hover:bg-white/5"}`}
            >
              <Radio size={16} />
            </button>
          )}
          <button
            onClick={() => {
              setMuted((m) => !m);
              if (!muted) stopSpeaking();
            }}
            title={muted ? "Activer le son" : "Couper le son"}
            className="rounded-full p-2 text-white/40 transition hover:bg-white/5"
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={() => setFullscreen(true)}
            title="Mode plein écran"
            className="rounded-full p-2 text-white/40 transition hover:bg-white/5"
          >
            <Maximize2 size={16} />
          </button>
        </div>
      </header>

      <div className="mb-4 flex justify-center">
        <JarvisOrb state={orbState} size={140} />
      </div>

      <div ref={scrollRef} className="mb-4 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            message={m}
            onSpeak={(text) => (muted ? undefined : speak(text))}
            onRemember={remember}
            isLast={i === messages.length - 1}
            onRegenerate={
              i === messages.length - 1 && m.role === "assistant"
                ? () => {
                    const prevUser = [...messages].reverse().find((mm) => mm.role === "user");
                    if (prevUser) sendMessage(prevUser.content);
                  }
                : undefined
            }
          />
        ))}
      </div>

      <ChatComposer
        value={input}
        onChange={setInput}
        onSend={() => sendMessage(input, attached?.kind === "image" ? attached.id : undefined)}
        isListening={isListening}
        onToggleMic={() => (isListening ? stopMic() : startMic())}
        micSupported={micSupported}
        disabled={sending}
        attachedFile={attached}
        onAttach={handleAttach}
        onRemoveAttachment={() => setAttached(null)}
        uploading={uploading}
      />

      {fullscreen && <FullscreenMode state={orbState} onClose={() => setFullscreen(false)} />}
    </div>
  );
}
