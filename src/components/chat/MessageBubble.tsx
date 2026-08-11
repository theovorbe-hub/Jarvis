"use client";

import { useState } from "react";
import clsx from "clsx";
import { Volume2, Copy, RotateCcw, Bookmark, Check, ExternalLink, Wrench, Image as ImageIcon } from "lucide-react";
import type { ChatMessage } from "@/types";
import { TOOL_LABELS } from "@/types";

export function MessageBubble({
  message,
  onSpeak,
  onRegenerate,
  onMemorize,
}: {
  message: ChatMessage;
  onSpeak: (text: string) => void;
  onRegenerate?: () => void;
  onMemorize?: (text: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={clsx("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx("max-w-[78%] space-y-2", isUser && "items-end")}>
        {message.attachments?.some((a) => a.type === "image") && (
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <ImageIcon className="h-3.5 w-3.5" /> Image jointe
          </div>
        )}

        <div
          className={clsx(
            "rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap",
            isUser
              ? "bg-gradient-to-br from-electric-500 to-electric-600 text-white rounded-br-md"
              : "glass text-white/90 rounded-bl-md",
            message.pending && "opacity-60"
          )}
        >
          {message.content}
        </div>

        {!isUser && message.toolCalls && message.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolCalls.map((tc, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border border-electric-500/20 bg-electric-500/10 px-2.5 py-1 text-[11px] text-electric-300"
              >
                <Wrench className="h-3 w-3" />
                {TOOL_LABELS[tc.name] ?? tc.name}
              </span>
            ))}
          </div>
        )}

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="space-y-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="label-caps">Sources web</p>
            {message.sources.slice(0, 4).map((s, i) => (
              <a
                key={i}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-white/60 hover:text-electric-300"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{s.title}</span>
                <span className="shrink-0 text-white/30">· {s.source}</span>
              </a>
            ))}
          </div>
        )}

        {!isUser && !message.pending && (
          <div className="flex items-center gap-1 pt-0.5">
            <ActionButton icon={Volume2} label="Écouter" onClick={() => onSpeak(message.content)} />
            <ActionButton icon={copied ? Check : Copy} label="Copier" onClick={handleCopy} />
            {onRegenerate && <ActionButton icon={RotateCcw} label="Régénérer" onClick={onRegenerate} />}
            {onMemorize && (
              <ActionButton icon={Bookmark} label="Mémoriser" onClick={() => onMemorize(message.content)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Volume2;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
