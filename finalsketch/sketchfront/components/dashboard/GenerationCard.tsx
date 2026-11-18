"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
    title: "Images to navigable home",
    eyebrow: "04 / Reconstruction",
    description: "Combine multiple views into an explorable home. This heavier job runs in a queue.",
    multiple: true,
    action: "Queue reconstruction",
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
        image_url: imageUrl,
        prompt: p || cardConfig.video.defaultPrompt,
        duration: "5",
        aspect_ratio: "16:9",
      };
    case "3d":
      return {
        image_url: imageUrl,
        with_texture: true,
        render_views: ["front", "left", "back"],
      };
    case "floor-plan":
      return {
        prompt: p || cardConfig["floor-plan"].defaultPrompt,
        image_url: imageUrl,
        num_inference_steps: 4,
        image_size: { width: 1024, height: 1024 },
      };
    case "walkthrough":
      return {
        prompt: p || cardConfig.walkthrough.defaultPrompt,
        // Luma takes a list of keyframe images
        keyframes: imageUrls.map((url) => ({ type: "image", url })),
        loop: false,
        aspect_ratio: "16:9",
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
      // triposr: { model_mesh: { url } }
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

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function GenerationCard({ kind }: { kind: GenerationKind }) {
  const config = cardConfig[kind];
  const [files, setFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState<JobStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  // Each run gets its own token; cancelling or unmounting flips it so a stale
  // poll loop can never write into the card again.
  const runRef = useRef<{ cancelled: boolean } | null>(null);

  useEffect(() => () => { if (runRef.current) runRef.current.cancelled = true; }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
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

    const run = { cancelled: false };
    if (runRef.current) runRef.current.cancelled = true;
    runRef.current = run;
    setStatus("uploading");

    try {
      // 1 – Upload files to fal storage
      const urls = await Promise.all(files.map(uploadFile));
      if (run.cancelled) return;
      setStatus("pending");
      setProgress(10);

      // 2 – Queue the job, then poll until it finishes
      const modelId = FAL_MODELS[kind];
      const input = buildInput(kind, urls[0], urls, prompt);
      const { request_id } = await fal.queue.submit(modelId, { input });

      let pct = 10;
      const startedAt = Date.now();
      const TIMEOUT_MS = 10 * 60 * 1000;
      while (!run.cancelled) {
        await sleep(2000);
        if (run.cancelled) return;
        const statusRes = await fal.queue.status(modelId, { requestId: request_id, logs: false });
        if (run.cancelled) return;

        if (statusRes.status === "COMPLETED") {
          const result = await fal.queue.result(modelId, { requestId: request_id });
          if (run.cancelled) return;
          const url = extractResultUrl(kind, result.data as Record<string, unknown>);
          if (!url) throw new Error("The model finished but didn't return an output file. Please try again.");
          setResultUrl(url);
          setStatus("done");
          setProgress(100);
          return;
        }

        if (statusRes.status === "IN_PROGRESS") {
          setStatus("processing");
          pct = Math.min(pct + 8, 88);
        } else {
          // Still waiting in the queue — creep forward slowly
          pct = Math.min(pct + 2, 40);
        }
        setProgress(pct);

        if (Date.now() - startedAt > TIMEOUT_MS) {
          throw new Error("This is taking longer than expected. Please try again in a few minutes.");
        }
      }
    } catch (err) {
      if (run.cancelled) return;
      setStatus("failed");
      setError(err instanceof Error && err.message ? err.message : "Generation failed. Please try again.");
    }
  }

  function cancel() {
    if (runRef.current) runRef.current.cancelled = true;
    setStatus("idle");
    setProgress(0);
    setError("");
  }

  function reset() {
    if (runRef.current) runRef.current.cancelled = true;
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

      {resultUrl ? (
        <div className="generation-result">
          <ResultViewer kind={kind} url={resultUrl} />
          <div className="result-actions">
            <a className="primary" href={resultUrl} download target="_blank" rel="noopener noreferrer">
              Download {kind === "3d" ? "GLB" : kind === "floor-plan" ? "image" : "video"} ↓
            </a>
            <button type="button" onClick={reset}>Start over ↺</button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit}>
          <UploadZone multiple={config.multiple} files={files} onChange={setFiles} disabled={busy} />
          {kind !== "3d" && (
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
          )}
          <ProgressBar status={status} progress={progress} />
          {error && <p className="generation-error" role="alert">{error}</p>}
          <button type="submit" className="generation-action" disabled={busy}>
            {status === "uploading"
              ? "Uploading…"
              : status === "pending"
              ? "Waiting in queue…"
              : status === "processing"
              ? "Generating…"
              : status === "failed"
              ? "Try again"
              : config.action}
            <span>↗</span>
          </button>
          {busy && (
            <button type="button" className="generation-cancel" onClick={cancel}>
              Cancel
            </button>
          )}
          {kind === "3d" && !busy && (
            <a className="generation-altlink" href="/dashboard/sketch">
              Have a floor plan instead? Draw it in 2D and see it in 3D →
            </a>
          )}
        </form>
      )}
    </article>
  );
}
