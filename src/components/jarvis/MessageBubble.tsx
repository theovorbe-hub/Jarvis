"use client";

import { useState } from "react";
import { Volume2, Copy, RotateCcw, Pin, Check, ExternalLink } from "lucide-react";

export interface ChatSource {
  title: string;
  url: string;
  source: string;
  snippet: string;
  date: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: string[];
  sources?: ChatSource[];
  imageUrl?: string | null;
  createdAt?: string;
}

export function MessageBubble({
  message,
  onSpeak,
  onRegenerate,
  onRemember,
  isLast,
}: {
  message: ChatMessage;
  onSpeak: (text: string) => void;
  onRegenerate?: () => void;
  onRemember?: (text: string) => void;
  isLast?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function copy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] space-y-2 ${isUser ? "items-end" : "items-start"}`}>
        {message.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/${message.imageUrl}/raw`}
            alt="Pièce jointe"
            className="max-h-56 rounded-xl border border-white/10"
          />
        )}

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-electric/80 to-cyan-glow/60 text-void"
              : "glass text-white/90"
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>

        {!isUser && message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.actions.map((action, i) => (
              <span
                key={i}
                className="rounded-full border border-cyan-glow/30 bg-cyan-glow/5 px-2.5 py-0.5 text-[11px] text-cyan-glow/80"
              >
                {action}
              </span>
            ))}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="glass space-y-2 rounded-xl p-3">
            <p className="text-[11px] uppercase tracking-wider text-white/40">Sources web</p>
            {message.sources.slice(0, 4).map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg px-2 py-1.5 transition hover:bg-white/5"
              >
                <p className="flex items-center gap-1 text-xs font-medium text-cyan-glow/90">
                  {s.title} <ExternalLink size={10} />
                </p>
                <p className="text-[11px] text-white/40">{s.source}</p>
                {s.snippet && <p className="mt-0.5 line-clamp-2 text-[11px] text-white/50">{s.snippet}</p>}
              </a>
            ))}
          </div>
        )}

        {!isUser && (
          <div className="flex gap-1 text-white/35">
            <button onClick={() => onSpeak(message.content)} title="Écouter" className="rounded p-1.5 hover:bg-white/5 hover:text-cyan-glow">
              <Volume2 size={13} />
            </button>
            <button onClick={copy} title="Copier" className="rounded p-1.5 hover:bg-white/5 hover:text-cyan-glow">
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
            {isLast && onRegenerate && (
              <button onClick={onRegenerate} title="Régénérer" className="rounded p-1.5 hover:bg-white/5 hover:text-cyan-glow">
                <RotateCcw size={13} />
              </button>
            )}
            {onRemember && (
              <button
                onClick={() => onRemember(message.content)}
                title="Mémoriser"
                className="rounded p-1.5 hover:bg-white/5 hover:text-cyan-glow"
              >
                <Pin size={13} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
