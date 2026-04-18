"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeViewer } from "@/components/ui/code-viewer";
import type { CodeArtifact } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tab = "preview" | "files";

export function ArtifactViewer({ artifact }: { artifact: CodeArtifact }) {
  const [tab, setTab] = useState<Tab>("preview");
  const [activeFile, setActiveFile] = useState(artifact.entry || artifact.files[0]?.path);
  const current = artifact.files.find((f) => f.path === activeFile) ?? artifact.files[0];

  const download = () => {
    const file = artifact.files[0];
    if (!file) return;
    const blob = new Blob([file.content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.path || "artifact.html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="clip-cyber border border-violet/30 bg-surface/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <Badge tone="cyan" dot>
            artifact
          </Badge>
          <span className="font-mono text-sm">{artifact.title}</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">
            {artifact.files.length} file · {artifact.files.reduce((n, f) => n + f.content.length, 0)} B
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("preview")}
            className={cn(
              "clip-cyber-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition",
              tab === "preview"
                ? "border-violet bg-violet/20 text-text"
                : "border-border text-muted hover:text-text",
            )}
          >
            preview
          </button>
          <button
            onClick={() => setTab("files")}
            className={cn(
              "clip-cyber-sm border px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition",
              tab === "files"
                ? "border-violet bg-violet/20 text-text"
                : "border-border text-muted hover:text-text",
            )}
          >
            files
          </button>
          <Button size="sm" variant="outline" onClick={download}>
            ↓ download
          </Button>
        </div>
      </div>

      {tab === "preview" ? (
        <div className="p-4 bg-[#060010]">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted mb-3">
            ◉ sandboxed iframe · no network, no cookies, no parent DOM access
          </p>
          <iframe
            title={artifact.title}
            srcDoc={artifact.preview_html}
            sandbox="allow-scripts"
            className="w-full h-[600px] bg-white rounded-sm border border-border"
          />
        </div>
      ) : (
        <div className="grid md:grid-cols-[180px_1fr]">
          {artifact.files.length > 1 && (
            <nav className="border-r border-border p-3 space-y-1">
              {artifact.files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setActiveFile(f.path)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 font-mono text-xs truncate transition",
                    f.path === activeFile
                      ? "bg-violet/20 text-text border-l-2 border-violet"
                      : "text-muted hover:text-text hover:bg-white/5",
                  )}
                >
                  {f.path}
                </button>
              ))}
            </nav>
          )}
          <div className="p-3">
            {current && (
              <>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan mb-2">
                  {current.path} · {current.language}
                </div>
                <CodeViewer language={current.language} code={current.content} />
              </>
            )}
          </div>
        </div>
      )}

      {artifact.summary && (
        <div className="border-t border-border bg-bg/60 px-4 py-3 font-mono text-xs text-muted">
          {artifact.summary}
        </div>
      )}
    </div>
  );
}
