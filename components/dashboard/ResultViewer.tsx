"use client";

import { useEffect, useRef, useState } from "react";
import { GenerationKind } from "./types";

export function ResultViewer({ kind, url }: { kind: GenerationKind; url: string }) {
  const [zoom, setZoom] = useState(1);
  const [orbit, setOrbit] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (kind === "3d" || kind === "walkthrough") { const script = document.createElement("script"); script.type = "module"; script.src = "https://unpkg.com/@google/model-viewer@4.0.0/dist/model-viewer.min.js"; document.head.appendChild(script); return () => script.remove(); } }, [kind]);

  if (kind === "video") return <div className="result-viewer video-result"><video controls src={url} poster="/firstimage.png">Your browser does not support video playback.</video><span className="viewer-caption">Cinematic preview</span></div>;
  if (kind === "floor-plan") return <div className="result-viewer plan-result"><div className="plan-canvas" style={{ transform: `scale(${zoom})` }}><div className="plan-room room-one">LIVING</div><div className="plan-room room-two">KITCHEN</div><div className="plan-room room-three">BEDROOM</div></div><div className="viewer-controls"><button type="button" onClick={() => setZoom((value) => Math.max(.75, value - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button type="button" onClick={() => setZoom((value) => Math.min(1.6, value + .1))}>+</button></div></div>;
  return <div className="result-viewer model-result" ref={viewerRef}><div className="model-stage" style={{ transform: `rotateY(${orbit}deg)` }}><div className="model-house"><span>living</span><span>kitchen</span><span>bed</span></div></div><div className="viewer-controls"><button type="button" onClick={() => setOrbit((value) => value - 25)}>←</button><span>{kind === "walkthrough" ? "Orbit walkthrough" : "Orbit model"}</span><button type="button" onClick={() => setOrbit((value) => value + 25)}>→</button></div><small className="viewer-source">Model output: {url.split("/").pop()}</small></div>;
}
