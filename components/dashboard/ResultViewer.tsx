"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { GenerationKind } from "./types";
const ModelPreview = dynamic(() => import("./ModelPreview").then(module => module.ModelPreview), { ssr: false, loading: () => <p>Loading 3D viewer…</p> });

export function ResultViewer({ kind, url }: { kind: GenerationKind; url: string }) {
  const [zoom, setZoom] = useState(1);
  if (kind === "video" || kind === "walkthrough") return <div className="result-viewer video-result"><video controls src={url}>Your browser does not support video playback.</video><span className="viewer-caption">{kind === "walkthrough" ? "Walkthrough video" : "Cinematic preview"}</span></div>;
  if (kind === "floor-plan") return <div className="result-viewer plan-result"><div className="plan-canvas" style={{ transform: `scale(${zoom})`, backgroundImage: `url(${JSON.stringify(url)})`, backgroundSize: "contain", backgroundRepeat: "no-repeat", backgroundPosition: "center", width: "100%", height: "100%" }} /><div className="viewer-controls"><button type="button" aria-label="Zoom out" onClick={() => setZoom(value => Math.max(.75, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" aria-label="Zoom in" onClick={() => setZoom(value => Math.min(1.6, value + .1))}>+</button></div></div>;
  return <div className="result-viewer model-result"><ModelPreview url={url} /></div>;
}
