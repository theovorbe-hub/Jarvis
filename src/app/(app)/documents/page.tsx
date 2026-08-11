"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, Image as ImageIcon, Trash2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

interface FileAsset {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  kind: string;
  summary?: string | null;
  analyzedAt?: string | null;
  createdAt: string;
}

export default function DocumentsPage() {
  const [files, setFiles] = useState<FileAsset[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<FileAsset | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/files")
      .then((r) => r.json())
      .then((d) => setFiles(d.files ?? []));
  }
  useEffect(load, []);

  async function upload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/files/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) load();
      else alert(data.error);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function askQuestion() {
    if (!selected || !question.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const endpoint = selected.kind === "image" ? "/api/vision" : "/api/documents/ask";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          selected.kind === "image"
            ? { fileId: selected.id, question }
            : { fileId: selected.id, question }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAnswer(data.answer);
    } catch (err) {
      setAnswer(err instanceof Error ? err.message : "Erreur.");
    } finally {
      setAsking(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
      <PageHeader title="Documents" subtitle="Importez, résumez et interrogez vos fichiers" />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={`glass mb-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition ${
          dragging ? "border-cyan-glow bg-cyan-glow/5" : "border-white/10"
        }`}
      >
        <UploadCloud size={28} className="mb-3 text-cyan-glow/70" />
        <p className="text-sm text-white/70">{uploading ? "Import en cours…" : "Déposer un fichier ici"}</p>
        <p className="mt-1 text-xs text-white/30">PDF, Word, Excel, images ou texte — 20 Mo max</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {files.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setSelected(f);
                setAnswer(null);
                setQuestion("");
              }}
              className={`glass flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:border-cyan-glow/30 ${
                selected?.id === f.id ? "border-cyan-glow/50" : ""
              }`}
            >
              {f.kind === "image" ? <ImageIcon size={16} className="text-cyan-glow/70" /> : <FileText size={16} className="text-cyan-glow/70" />}
              <span className="flex-1 truncate text-sm text-white/80">{f.filename}</span>
              {f.analyzedAt && <Sparkles size={12} className="text-cyan-glow/50" />}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  remove(f.id);
                }}
                className="text-white/25 hover:text-red-300"
              >
                <Trash2 size={13} />
              </span>
            </button>
          ))}
          {files.length === 0 && <p className="text-sm text-white/30">Aucun document importé.</p>}
        </div>

        <div className="glass rounded-2xl p-5">
          {selected ? (
            <>
              <p className="mb-1 text-sm font-medium text-white/90">{selected.filename}</p>
              <p className="mb-4 text-xs text-white/30">
                {(selected.sizeBytes / 1024).toFixed(0)} Ko · importé le {new Date(selected.createdAt).toLocaleDateString("fr-FR")}
              </p>
              {selected.summary && (
                <div className="mb-4 rounded-lg bg-white/5 p-3 text-sm text-white/70">{selected.summary}</div>
              )}
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={selected.kind === "image" ? "Que voulez-vous savoir sur cette image ?" : "Posez une question sur ce document…"}
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-cyan-glow/50"
                />
                <button
                  onClick={askQuestion}
                  disabled={asking}
                  className="rounded-lg bg-cyan-glow/20 px-3 py-2 text-xs text-cyan-glow disabled:opacity-40"
                >
                  {asking ? "…" : "Demander"}
                </button>
              </div>
              {answer && <p className="mt-4 whitespace-pre-wrap rounded-lg bg-cyan-glow/5 p-3 text-sm text-white/80">{answer}</p>}
            </>
          ) : (
            <p className="text-sm text-white/30">Sélectionnez un document pour l&apos;analyser.</p>
          )}
        </div>
      </div>
    </div>
  );
}
