"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { UploadCloud, FileText, FileSpreadsheet, Image as ImageIcon, File as FileIcon, Trash2, Loader2, MessageSquareText } from "lucide-react";
import clsx from "clsx";

interface FileAsset {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  summary: string | null;
  createdAt: string;
}

function iconFor(mimeType: string) {
  if (mimeType.startsWith("image/")) return ImageIcon;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv")) return FileSpreadsheet;
  if (mimeType === "application/pdf" || mimeType.includes("word")) return FileText;
  return FileIcon;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export function DocumentsView() {
  const [files, setFiles] = useState<FileAsset[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    const res = await fetch("/api/files");
    if (res.ok) setFiles((await res.json()).files);
  }

  useEffect(() => {
    refresh();
  }, []);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    setUploading(true);
    setError(null);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Échec de l'import de ${file.name}`);
      }
    }
    setUploading(false);
    refresh();
  }, []);

  async function remove(id: string) {
    setFiles((list) => list?.filter((f) => f.id !== id) ?? list);
    await fetch(`/api/files/${id}`, { method: "DELETE" });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold text-glow">Documents</h1>
        <p className="text-sm text-white/40">PDF, Word, Excel, images, texte — analysés automatiquement.</p>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={clsx(
          "card flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed py-14 text-center transition-colors",
          dragging ? "border-electric-400 bg-electric-500/5" : "border-white/10 hover:border-white/20"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-electric-400" />
        ) : (
          <UploadCloud className="h-8 w-8 text-electric-400" />
        )}
        <div>
          <p className="font-medium text-white/80">Déposer un fichier ici</p>
          <p className="text-xs text-white/40">ou cliquez pour parcourir — PDF, DOCX, XLSX, CSV, TXT, images</p>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {files?.map((f) => {
          const Icon = iconFor(f.mimeType);
          return (
            <div key={f.id} className="card space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-electric-500/10 text-electric-300">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white/90">{f.filename}</p>
                  <p className="text-xs text-white/30">
                    {formatSize(f.size)} · {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <button onClick={() => remove(f.id)} className="text-white/30 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {f.summary && <p className="line-clamp-3 text-sm text-white/50">{f.summary}</p>}
              <p className="text-xs text-white/50">Document analysé.</p>
            </div>
          );
        })}
      </div>

      {files?.length ? (
        <Link href="/" className="btn-ghost inline-flex text-sm">
          <MessageSquareText className="h-4 w-4" /> Poser une question à JARVIS sur ces documents
        </Link>
      ) : null}
    </div>
  );
}
