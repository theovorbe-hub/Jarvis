"use client";

import { useRef, useState } from "react";
import { Send, Mic, Paperclip, X, Loader2 } from "lucide-react";
import clsx from "clsx";

export function ChatInput({
  onSend,
  onToggleMic,
  isListening,
  disabled,
  micSupported,
}: {
  onSend: (text: string, image?: { base64: string; mimeType: string; name: string }) => void;
  onToggleMic: () => void;
  isListening: boolean;
  disabled?: boolean;
  micSupported: boolean;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<{ base64: string; mimeType: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !image) return;
    onSend(text.trim(), image ?? undefined);
    setText("");
    setImage(null);
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setImage({ base64, mimeType: file.type, name: file.name });
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      {image && (
        <div className="mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/70">
          <span className="truncate">{image.name}</span>
          <button type="button" onClick={() => setImage(null)} className="ml-auto text-white/40 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="glass-strong flex items-end gap-2 rounded-2xl p-2 shadow-glow-sm">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/80"
          title="Joindre une image"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </button>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder="Écrivez à JARVIS, ou dites « Jarvis »…"
          className="max-h-32 flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px] text-white placeholder:text-white/30 outline-none"
        />

        {micSupported && (
          <button
            type="button"
            onClick={onToggleMic}
            disabled={disabled}
            title={isListening ? "Arrêter l'écoute" : "Activer la voix"}
            className={clsx(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all",
              isListening
                ? "bg-electric-500 text-white shadow-glow-sm animate-pulse"
                : "text-white/40 hover:bg-white/[0.06] hover:text-white/80"
            )}
          >
            <Mic className="h-5 w-5" />
          </button>
        )}

        <button
          type="submit"
          disabled={disabled || (!text.trim() && !image)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-electric-500 to-electric-600 text-white shadow-glow-sm transition-all hover:brightness-110 disabled:opacity-30"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </form>
  );
}
