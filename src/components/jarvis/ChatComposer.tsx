"use client";

import { useRef, useState } from "react";
import { Mic, Send, Paperclip, X, Square } from "lucide-react";

export function ChatComposer({
  value,
  onChange,
  onSend,
  isListening,
  onToggleMic,
  micSupported,
  disabled,
  attachedFile,
  onAttach,
  onRemoveAttachment,
  uploading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  isListening: boolean;
  onToggleMic: () => void;
  micSupported: boolean;
  disabled: boolean;
  attachedFile: { id: string; filename: string; kind: string } | null;
  onAttach: (file: globalThis.File) => void;
  onRemoveAttachment: () => void;
  uploading: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled) onSend();
    }
    if (e.key === "Escape") {
      onChange("");
      (e.target as HTMLTextAreaElement).blur();
    }
  }

  return (
    <div className="glass-strong rounded-2xl p-3">
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/70">
          <Paperclip size={12} />
          <span className="flex-1 truncate">{attachedFile.filename}</span>
          <button onClick={onRemoveAttachment} className="text-white/40 hover:text-white">
            <X size={12} />
          </button>
        </div>
      )}
      {uploading && <p className="mb-2 text-xs text-cyan-glow/70">Import du fichier…</p>}

      <div className="flex items-end gap-2">
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Joindre un fichier"
          className="rounded-full p-2.5 text-white/50 transition hover:bg-white/5 hover:text-cyan-glow"
        >
          <Paperclip size={18} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAttach(f);
            e.target.value = "";
          }}
        />

        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          rows={1}
          placeholder="Écrivez à JARVIS, ou dites « Jarvis »…"
          className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm text-white outline-none placeholder:text-white/30"
        />

        {micSupported && (
          <button
            onClick={onToggleMic}
            title={isListening ? "Arrêter l'écoute" : "Activer le micro"}
            className={`rounded-full p-2.5 transition ${
              isListening
                ? "bg-cyan-glow/20 text-cyan-glow shadow-glow-sm"
                : "text-white/50 hover:bg-white/5 hover:text-cyan-glow"
            }`}
          >
            {isListening ? <Square size={16} /> : <Mic size={18} />}
          </button>
        )}

        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="rounded-full bg-gradient-to-br from-electric to-cyan-glow p-2.5 text-void shadow-glow-sm transition disabled:opacity-30"
        >
          <Send size={16} />
        </button>
      </div>
      {focused && (
        <p className="mt-1.5 pl-1 text-[10px] text-white/25">Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne</p>
      )}
    </div>
  );
}
