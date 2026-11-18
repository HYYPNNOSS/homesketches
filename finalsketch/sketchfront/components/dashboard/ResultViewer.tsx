"use client";

import { createElement, useEffect, useState } from "react";
import { GenerationKind } from "./types";

const MODEL_VIEWER_SRC = "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js";
const MODEL_VIEWER_ID = "model-viewer-script";

/** Loads the <model-viewer> web component once per page. */
function useModelViewer(enabled: boolean): "loading" | "ready" | "failed" {
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  useEffect(() => {
    if (!enabled) return;
    if (customElements.get("model-viewer")) {
      setState("ready");
      return;
    }
    let alive = true;
    let script = document.getElementById(MODEL_VIEWER_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = MODEL_VIEWER_ID;
      script.type = "module";
      script.src = MODEL_VIEWER_SRC;
      document.head.appendChild(script);
    }
    const onError = () => { if (alive) setState("failed"); };
    script.addEventListener("error", onError);
    customElements.whenDefined("model-viewer").then(() => { if (alive) setState("ready"); });
    return () => {
      alive = false;
      script?.removeEventListener("error", onError);
    };
  }, [enabled]);
  return state;
}

export function ResultViewer({ kind, url }: { kind: GenerationKind; url: string }) {
  const [zoom, setZoom] = useState(1);
  const viewer = useModelViewer(kind === "3d");

  if (kind === "video" || kind === "walkthrough") {
    return (
      <div className={`result-viewer ${kind === "video" ? "video-result" : "walkthrough-result"}`}>
        <video controls playsInline loop src={url}>Your browser does not support video playback.</video>
        <span className="viewer-caption">{kind === "video" ? "Cinematic preview" : "Walkthrough"}</span>
      </div>
    );
  }

  if (kind === "floor-plan") {
    return (
      <div className="result-viewer plan-result">
        <div
          className="plan-canvas"
          role="img"
          aria-label="Generated floor plan"
          style={{ transform: `scale(${zoom})`, backgroundImage: `url(${url})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center" }}
        />
        <div className="viewer-controls">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.75, value - 0.1))}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.6, value + 0.1))}>+</button>
        </div>
      </div>
    );
  }

  // 3D model (GLB) — drag to orbit, scroll to zoom
  return (
    <div className="result-viewer model-result">
      {viewer === "ready" &&
        createElement("model-viewer", {
          src: url,
          alt: "Generated 3D model",
          "camera-controls": true,
          "auto-rotate": true,
          "shadow-intensity": "0.8",
          exposure: "1.1",
          "touch-action": "pan-y",
        })}
      {viewer === "loading" && <div className="model-result-fallback">Loading 3D viewer…</div>}
      {viewer === "failed" && (
        <div className="model-result-fallback">
          The 3D viewer couldn&apos;t load here. Your model is ready — download the GLB below and open it in any 3D app.
        </div>
      )}
      {viewer === "ready" && <small className="viewer-source">Drag to orbit · scroll to zoom</small>}
    </div>
  );
}
