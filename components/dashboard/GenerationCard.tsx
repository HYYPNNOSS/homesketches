"use client";

import { FormEvent, useEffect, useState } from "react";
import { ProgressBar } from "./ProgressBar";
import { ResultViewer } from "./ResultViewer";
import { UploadZone } from "./UploadZone";
import { GenerationKind, GenerationResponse, JobStatus } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";
const cardConfig: Record<GenerationKind, { title: string; eyebrow: string; description: string; endpoint: string; multiple?: boolean; action: string }> = {
  video: { title: "Sketch to video", eyebrow: "01 / Motion", description: "Turn a single drawing into a cinematic camera move through the space.", endpoint: "sketch-to-video", action: "Generate video" },
  "3d": { title: "Sketch to 3D model", eyebrow: "02 / Volume", description: "Create a lightweight GLB model you can orbit, review, and share.", endpoint: "sketch-to-3d", action: "Build 3D model" },
  "floor-plan": { title: "Sketch to floor plan", eyebrow: "03 / Structure", description: "Translate your sketch into a clean, structured plan for the next conversation.", endpoint: "sketch-to-plan", action: "Generate floor plan" },
  walkthrough: { title: "Images to navigable home", eyebrow: "04 / Reconstruction", description: "Combine multiple views into an explorable home. This heavier job runs in a queue.", endpoint: "multi-image-to-3d", multiple: true, action: "Queue reconstruction" },
};

export function GenerationCard({ kind }: { kind: GenerationKind }) {
  const config = cardConfig[kind];
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [result, setResult] = useState<GenerationResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (kind !== "walkthrough" || !result?.jobId || !["pending", "processing"].includes(result.status)) return;
    const poll = window.setInterval(async () => {
      try { const response = await fetch(`${API_URL}/multi-image-to-3d/${result.jobId}`); if (!response.ok) return; const next = await response.json() as GenerationResponse; setResult(next); setStatus(next.status); if (["done", "failed"].includes(next.status)) window.clearInterval(poll); } catch { setError("Status check failed. Try refreshing this project."); }
    }, 1200);
    return () => window.clearInterval(poll);
  }, [kind, result?.jobId, result?.status]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setResult(null);
    if (!files.length || (config.multiple && files.length < 2)) { setError(config.multiple ? "Add at least two views of the space." : "Add one sketch or image to begin."); return; }
    setStatus("uploading");
    const data = new FormData(); files.forEach((file) => data.append(config.multiple ? "files" : "file", file)); data.append("prompt", prompt);
    try { const response = await fetch(`${API_URL}/${config.endpoint}/generate`, { method: "POST", body: data }); const payload = await response.json() as GenerationResponse; if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "Generation could not be started"); setResult(payload); setStatus(payload.status); } catch (submitError) { setStatus("failed"); setError(submitError instanceof Error ? submitError.message : "The API is unavailable"); }
  }

  return <article className={`generation-card generation-${kind}`}>
    <div className="generation-card-heading"><div><p className="eyebrow">{config.eyebrow}</p><h2>{config.title}</h2><p>{config.description}</p></div><span className="generation-card-mark">{kind === "walkthrough" ? "N" : kind === "floor-plan" ? "P" : kind === "3d" ? "3D" : "V"}</span></div>
    <form onSubmit={submit}>
      <UploadZone multiple={config.multiple} files={files} onChange={setFiles} />
      <label className="generation-prompt">Design direction <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={kind === "video" ? "Slow camera move through the living room..." : "Materials, room names, mood, or details to preserve..."} maxLength={500} /></label>
      <ProgressBar status={status} progress={result?.progress ?? 0} />
      {error && <p className="generation-error" role="alert">{error}</p>}
      {!result?.resultUrl && <button type="submit" className="generation-action" disabled={status === "uploading"}>{status === "uploading" ? "Uploading..." : config.action}<span>↗</span></button>}
    </form>
    {result?.resultUrl && result.status === "done" && <ResultViewer kind={kind} url={result.resultUrl} />}
  </article>;
}
