"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { saveProject, getAsset, assetFile } from "../../lib/workspace-store";
import { fal, FAL_MODELS } from "../../lib/fal";
import { ProgressBar } from "./ProgressBar";
import { ResultViewer } from "./ResultViewer";
import { UploadZone } from "./UploadZone";
import { GenerationKind, JobStatus } from "./types";

// ─── Card config ──────────────────────────────────────────────────────────────

const cardConfig: Record<
  GenerationKind,
  {
    title: string;
    eyebrow: string;
    description: string;
    multiple?: boolean;
    action: string;
    mark: string;
    defaultPrompt: string;
  }
> = {
  video: {
    title: "Sketch to video",
    eyebrow: "01 / Motion",
    description: "Turn a single drawing into a cinematic camera move through the space.",
    action: "Generate video",
    mark: "V",
    defaultPrompt: "Slow cinematic camera move through the space, warm lighting, architectural photography.",
  },
  "3d": {
    title: "Sketch to 3D model",
    eyebrow: "02 / Volume",
    description: "Create a lightweight GLB model you can orbit, review, and share.",
    action: "Build 3D model",
    mark: "3D",
    defaultPrompt: "",
  },
  "floor-plan": {
    title: "Sketch to floor plan",
    eyebrow: "03 / Structure",
    description: "Translate your sketch into a clean, structured plan for the next conversation.",
    action: "Generate floor plan",
    mark: "P",
    defaultPrompt: "Clean architectural floor plan, black lines on white, top-down view, precise walls, standard symbols for doors and windows, no furniture labels.",
  },
  walkthrough: {
    title: "Images to walkthrough video",
    eyebrow: "04 / Reconstruction",
    description: "Create a camera transition between a starting view and an ending view.",
    multiple: true,
    action: "Generate walkthrough",
    mark: "N",
    defaultPrompt: "Cinematic walkthrough of the home interior, smooth camera motion.",
  },
};

// ─── fal.ai helpers ───────────────────────────────────────────────────────────

/** Upload a File to fal storage, return a hosted URL. */
async function uploadFile(file: File): Promise<string> {
  const url = await fal.storage.upload(file);
  return url;
}

/** Build the fal input payload for each card type. */
function buildInput(kind: GenerationKind, imageUrl: string, imageUrls: string[], prompt: string) {
  const p = prompt.trim();
  switch (kind) {
    case "video":
      return {
        start_image_url: imageUrl,
        prompt: p || cardConfig.video.defaultPrompt,
        duration: "5" as const,
        generate_audio: false,
      };
    case "3d":
      return {
        image_url: imageUrl,
      };
    case "floor-plan":
      return {
        prompt: p || cardConfig["floor-plan"].defaultPrompt,
        image_url: imageUrl,
        num_inference_steps: 28,
        strength: 0.65,
      };
    case "walkthrough":
      return {
        prompt: p || cardConfig.walkthrough.defaultPrompt,
        start_image_url: imageUrls[0],
        end_image_url: imageUrls[1],
        duration: "5" as const,
        generate_audio: false,
      };
  }
}

/** Extract the result URL(s) from the fal model output. */
function extractResultUrl(kind: GenerationKind, output: Record<string, unknown>): string | null {
  try {
    if (kind === "video" || kind === "walkthrough") {
      // kling / luma: { video: { url } }
      const v = output.video as { url?: string } | undefined;
      if (v?.url) return v.url;
      // luma fallback: { generations: [{ assets: { video } }] }
      const gens = output.generations as Array<{ assets?: { video?: string } }> | undefined;
      return gens?.[0]?.assets?.video ?? null;
    }
    if (kind === "3d") {
      // trellis: { model_mesh: { url } }
      const m = output.model_mesh as { url?: string } | undefined;
      return m?.url ?? null;
    }
    if (kind === "floor-plan") {
      // flux: { images: [{ url }] }
      const imgs = output.images as Array<{ url: string }> | undefined;
      return imgs?.[0]?.url ?? null;
    }
  } catch {/* ignore */}
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GenerationCard({ kind }: { kind: GenerationKind }) {
  const config = cardConfig[kind];
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let active = true;
    const id = new URLSearchParams(window.location.search).get("asset");
    if (id && kind === "floor-plan") {
      getAsset(id).then(asset => { if (active && asset) setFiles([assetFile(asset)]); }).catch(e => { if (active) setError(e.message); });
    }
    return () => { active = false; abortRef.current?.(); };
  }, [kind]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setNotice("");
    setResultUrl(null);
    setProgress(0);

    if (!files.length) {
      setError(config.multiple ? "Add at least two views of the space." : "Add one sketch or image to begin.");
      return;
    }
    if (config.multiple && files.length < 2) {
      setError("Add at least two views of the space.");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    abortRef.current?.();
    abortRef.current = () => { cancelled = true; controller.abort(); };
    setStatus("uploading");
    try {
      if (files.some(file => file.size > 20 * 1024 * 1024)) throw new Error("Each image must be 20MB or smaller.");
      if (files.some(file => !/\.(jpe?g|png|webp)$/i.test(file.name))) throw new Error("Generation accepts JPG, PNG, or WEBP images. Export PDF pages as images first.");
      const readiness = await fetch("/api/fal", { signal: controller.signal });
      const configuration = await readiness.json();
      if (!readiness.ok || !configuration.configured) throw new Error(configuration.error ?? "AI generation is not configured. Add FAL_KEY to sketchfront/.env.local and restart the app.");
      const urls = await Promise.all(files.map(uploadFile));
      if (cancelled) return;
      setStatus("processing"); setProgress(10);
      const modelId = FAL_MODELS[kind];
      const { request_id } = await fal.queue.submit(modelId, { input: buildInput(kind, urls[0], urls, prompt), abortSignal: controller.signal });
      if (cancelled) return;
      const started = Date.now();
      let pct = 10;
      while (!cancelled) {
        if (Date.now() - started > 15 * 60 * 1000) throw new Error("This generation is taking too long. Please try again later.");
        const state = await fal.queue.status(modelId, { requestId: request_id, logs: false, abortSignal: controller.signal });
        if (cancelled) return;
        if (state.status === "COMPLETED") {
          const result = await fal.queue.result(modelId, { requestId: request_id, abortSignal: controller.signal });
          if (cancelled) return;
          const url = extractResultUrl(kind, result.data as Record<string, unknown>);
          if (!url) throw new Error("The model completed without a usable output. Please try again.");
          setResultUrl(url); setStatus("done"); setProgress(100);
          let showMessage = true;
          try {
            const token = localStorage.getItem("homesketches_access_token");
            const sub = token ? JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).sub : "guest";
            showMessage = localStorage.getItem(`homesketches-notifications-${sub}`) !== "false";
          } catch { /* Use default preference. */ }
          try {
            await saveProject({ name: `${config.title} · ${files[0].name}`, kind, url, sourceFiles: files.map(file => file.name) });
            if (!cancelled && showMessage) setNotice("Generation complete. Saved to Your projects.");
          } catch {
            if (!cancelled) setNotice("Generation complete, but browser storage is full or unavailable. Download the result to keep it.");
          }
          return;
        }
        pct = Math.min(pct + (state.status === "IN_PROGRESS" ? 8 : 2), 88);
        setProgress(pct);
        await new Promise<void>(resolve => {
          if (controller.signal.aborted) return resolve();
          const timer = setTimeout(done, 2000);
          function done() { clearTimeout(timer); controller.signal.removeEventListener("abort", done); resolve(); }
          controller.signal.addEventListener("abort", done, { once: true });
        });
      }
    } catch (err) {
      if (!cancelled) {
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Generation failed. Please try again.");
      }
    }
  }

  function reset() {
    abortRef.current?.();
    setFiles([]);
    setPrompt("");
    setStatus("idle");
    setProgress(0);
    setResultUrl(null);
    setError("");
  }

  const busy = status === "uploading" || status === "processing" || status === "pending";

  return (
    <article className={`generation-card generation-${kind}`}>
      <div className="generation-card-heading">
        <div>
          <p className="eyebrow">{config.eyebrow}</p>
          <h2>{config.title}</h2>
          <p>{config.description}</p>
        </div>
        <span className="generation-card-mark">{config.mark}</span>
      </div>

      {notice && <p className="studio-notice" role="status">{notice}</p>}
      {resultUrl ? (
        <div className="generation-result">
          <ResultViewer kind={kind} url={resultUrl} />
          <a className="text-action" href={resultUrl} download target="_blank" rel="noreferrer">Download / open result ↗</a>
          <button type="button" className="generation-action" style={{ marginTop: 12 }} onClick={reset}>
            Start over <span>↺</span>
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <UploadZone multiple={config.multiple} files={files} onChange={setFiles} />
          <label className="generation-prompt">
            Design direction
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={kind === "video" ? "Slow camera move through the living room..." : "Materials, room names, mood, or details to preserve..."}
              maxLength={500}
              disabled={busy}
            />
          </label>
          <ProgressBar status={status} progress={progress} />
          {error && <p className="generation-error" role="alert">{error}</p>}
          <button type="submit" className="generation-action" disabled={busy}>
            {status === "uploading"
              ? "Uploading…"
              : status === "processing" || status === "pending"
              ? "Generating…"
              : config.action}
            <span>↗</span>
          </button>
        </form>
      )}
    </article>
  );
}
