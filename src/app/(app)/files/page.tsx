"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { UploadCloud, FileText, ImageIcon, Trash2, Send, Scale, Loader2 } from "lucide-react";

type FileAsset = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  kind: "document" | "image";
  summary?: string | null;
  analysis?: string | null;
  createdAt: string;
};

export default function FilesPage() {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<FileAsset | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/files");
    const data = await res.json();
    setFiles(data.files ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  const upload = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      await fetch("/api/files", { method: "POST", body: formData });
    }
    setUploading(false);
    void load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Supprimer ce fichier ?")) return;
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function askQuestion() {
    if (!selected || !question.trim()) return;
    setAsking(true);
    setAnswer(null);
    const res = await fetch(`/api/files/${selected.id}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const data = await res.json();
    setAnswer(data.ok ? data.answer ?? data.analysis : data.error ?? "Impossible de répondre.");
    setAsking(false);
  }

  async function runComparison() {
    if (compareIds.length < 2) return;
    setComparison("…");
    const res = await fetch("/api/files/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds: compareIds }),
    });
    const data = await res.json();
    setComparison(data.ok ? data.comparison : data.error ?? "Comparaison impossible.");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-jarvis-text-dim">Analyse</p>
          <h1 className="font-display text-2xl font-semibold">Documents & vision</h1>
        </div>
        <button
          onClick={() => {
            setCompareMode((v) => !v);
            setCompareIds([]);
            setComparison(null);
          }}
          className={clsx(
            "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
            compareMode ? "glass-strong border-glow text-jarvis-cyan-strong" : "bg-white/5 text-jarvis-text-dim hover:text-jarvis-text"
          )}
        >
          <Scale size={16} /> Comparer des documents
        </button>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "glass flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors",
          dragOver ? "border-jarvis-cyan bg-jarvis-cyan/5" : "border-jarvis-panel-border"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void upload(e.target.files)}
          accept=".pdf,.docx,.xlsx,.xlsm,.txt,.md,.csv,image/*"
        />
        {uploading ? (
          <>
            <Loader2 className="animate-spin text-jarvis-cyan-strong" size={28} />
            <p className="text-sm shimmer-text font-display">Analyse en cours…</p>
          </>
        ) : (
          <>
            <UploadCloud size={28} className="text-jarvis-cyan-strong" />
            <p className="font-display font-medium">Déposer un fichier ici</p>
            <p className="text-xs text-jarvis-text-dim">PDF, Word, Excel, texte ou image — 20 Mo max</p>
          </>
        )}
      </div>

      {compareMode && (
        <div className="glass flex items-center gap-3 rounded-2xl p-4 text-sm">
          <span className="text-jarvis-text-dim">{compareIds.length} document(s) sélectionné(s)</span>
          <button
            onClick={runComparison}
            disabled={compareIds.length < 2}
            className="ml-auto rounded-lg bg-jarvis-cyan/20 px-3 py-1.5 text-xs text-jarvis-cyan-strong disabled:opacity-40"
          >
            Comparer
          </button>
        </div>
      )}

      {comparison && (
        <div className="glass animate-fade-in-up rounded-2xl p-5">
          <h3 className="mb-2 font-display text-sm font-semibold text-jarvis-cyan-strong">Comparaison</h3>
          <p className="whitespace-pre-wrap text-sm text-jarvis-text-dim">{comparison}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-2">
          {files.length === 0 ? (
            <div className="glass rounded-2xl p-8 text-center text-sm text-jarvis-text-dim">Aucun fichier importé.</div>
          ) : (
            files.map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  if (compareMode) {
                    setCompareIds((prev) => (prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]));
                  } else {
                    setSelected(f);
                    setAnswer(null);
                    setQuestion("");
                  }
                }}
                className={clsx(
                  "glass flex items-center gap-3 rounded-xl p-3.5 text-left transition-colors",
                  selected?.id === f.id && "border-glow",
                  compareMode && compareIds.includes(f.id) && "border-glow bg-jarvis-cyan/5"
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-jarvis-cyan-strong">
                  {f.kind === "image" ? <ImageIcon size={16} /> : <FileText size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{f.filename}</p>
                  <p className="text-xs text-jarvis-text-dim">
                    {(f.size / 1024).toFixed(0)} Ko — {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                {!compareMode && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(f.id);
                    }}
                    className="text-jarvis-text-dim hover:text-jarvis-danger"
                  >
                    <Trash2 size={14} />
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-jarvis-text-dim">
              <p>Sélectionnez un fichier pour voir son analyse.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="font-display font-semibold">{selected.filename}</h3>
                <p className="text-xs text-jarvis-text-dim">{selected.mimeType}</p>
              </div>

              <div className="rounded-xl border border-jarvis-panel-border bg-white/[0.02] p-4">
                <p className="mb-1 text-[11px] uppercase tracking-wide text-jarvis-cyan-strong">
                  {selected.kind === "image" ? "Analyse visuelle" : "Résumé"}
                </p>
                <p className="whitespace-pre-wrap text-sm text-jarvis-text-dim">
                  {selected.kind === "image" ? selected.analysis || "Analyse non disponible." : selected.summary || "Résumé non disponible."}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs text-jarvis-text-dim">
                  {selected.kind === "image" ? "Poser une question sur cette image" : "Poser une question sur ce document"}
                </label>
                <div className="flex gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                    placeholder={selected.kind === "image" ? "Qu'est-ce que tu vois ?" : "Quelle est la date d'échéance ?"}
                    className="jarvis-input flex-1 text-sm"
                  />
                  <button
                    onClick={askQuestion}
                    disabled={asking}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-jarvis-cyan to-jarvis-blue text-jarvis-bg disabled:opacity-50"
                  >
                    {asking ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  </button>
                </div>
                {answer && <p className="rounded-xl bg-white/[0.03] p-3 text-sm">{answer}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
