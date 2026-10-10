"use client";

import { useState, useEffect } from "react";
import {
  render as apiRender,
  previewPrompt,
  isRenderError,
  dataUrlToApiImage,
  saveRecentProject,
  getRecentProjects,
  type RecentProject,
} from "./api";
import type { RenderRequest } from "./types";

interface Props {
  sceneSummary: string;
  onCapture: () => { top: string; persp: string };
  onExportGLB: () => Promise<void>;
  onExportSVG: () => void;
  onExportJSON: () => void;
  onStartWalkthrough: () => void;
  onStopWalkthrough: () => void;
  isRecording: boolean;
  onSendToFloorPlan: () => void;
  onSendTo3D: () => void;
}

type Look = RenderRequest["look"];

const LOOKS: { value: Look; label: string; hint: string }[] = [
  { value: "plan3d", label: "Plan 3D", hint: "Bird's eye perspective" },
  { value: "room", label: "Room", hint: "Interior view" },
  { value: "marker", label: "Marker", hint: "Hand-drawn style" },
  { value: "clean2d", label: "Clean 2D", hint: "Technical floor plan" },
  { value: "iso", label: "Isometric", hint: "Axonometric view" },
];

const STYLES = ["modern", "scandinavian", "industrial", "luxury", "cozy", "minimal"];
const LIGHTS = ["daylight", "golden hour", "overcast", "artificial", "dramatic"];

function base64ToDataUrl(b64: string, mime: string): string {
  return `data:${mime};base64,${b64}`;
}

export function RenderPanel({
  sceneSummary,
  onCapture,
  onExportGLB,
  onExportSVG,
  onExportJSON,
  onStartWalkthrough,
  onStopWalkthrough,
  isRecording,
  onSendToFloorPlan,
  onSendTo3D,
}: Props) {
  const [look, setLook] = useState<Look>("room");
  const [style, setStyle] = useState("modern");
  const [light, setLight] = useState("daylight");
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ image: string; mime: string; model: string } | null>(null);
  const [refineImage, setRefineImage] = useState<string | null>(null);
  const [comparisonPct, setComparisonPct] = useState(50);
  const [previewPromptText, setPreviewPromptText] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  useEffect(() => {
    setRecentProjects(getRecentProjects());
  }, []);

  async function handleRender() {
    setStatus("loading");
    setError("");
    setProgress(0);
    setPreviewPromptText(null);

    const { top, persp } = onCapture();
    const images = [dataUrlToApiImage(top), dataUrlToApiImage(persp)];

    const req: RenderRequest = {
      images,
      plan: sceneSummary,
      look,
      style,
      light,
      notes: notes || undefined,
      aspect: "4:3",
      model: "klein",
    };

    // Add refine image if present
    if (refineImage) {
      req.images.push(dataUrlToApiImage(refineImage));
    }

    const resp = await apiRender(req, (pct) => setProgress(pct));

    if (isRenderError(resp)) {
      setStatus("error");
      setError(resp.message);
      return;
    }

    setResult(resp);
    setStatus("done");

    // Save to recent projects
    const proj = {
      title: `${look} · ${style}`,
      look,
      image: resp.image,
      mime: resp.mime,
      sceneSummary,
    };
    saveRecentProject(proj);
    setRecentProjects(getRecentProjects());
  }

  async function handlePreviewPrompt() {
    setPreviewPromptText(null);
    const resp = await previewPrompt({ plan: sceneSummary, look, style, notes, room: "living room" });
    if ("prompt" in resp) {
      setPreviewPromptText(resp.prompt);
    } else {
      setError(resp.message);
    }
  }

  function handleDownload() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = base64ToDataUrl(result.image, result.mime);
    a.download = `sketch-render-${Date.now()}.${result.mime.split("/")[1] ?? "jpg"}`;
    a.click();
  }

  function handleRefine() {
    if (!result) return;
    setRefineImage(base64ToDataUrl(result.image, result.mime));
    setResult(null);
    setStatus("idle");
  }

  const topCapture = status === "idle" ? null : null;
  void topCapture;

  return (
    <aside className="sk-panel" aria-label="Render and export panel">
      {/* ── Render settings ── */}
      <div className="sk-panel-section">
        <div className="sk-panel-heading">
          <span className="sk-panel-eyebrow">AI Render</span>
          <h2 className="sk-panel-title">Roomwright</h2>
        </div>

        <label className="sk-field-label">
          Look
          <div className="sk-look-grid">
            {LOOKS.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`sk-look-btn ${look === l.value ? "active" : ""}`}
                aria-pressed={look === l.value}
                onClick={() => setLook(l.value)}
                title={l.hint}
              >
                <span>{l.label}</span>
                <small>{l.hint}</small>
              </button>
            ))}
          </div>
        </label>

        <div className="sk-field-row">
          <label className="sk-field-label">
            Style
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="sk-select"
              aria-label="Rendering style"
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </label>
          <label className="sk-field-label">
            Light
            <select
              value={light}
              onChange={(e) => setLight(e.target.value)}
              className="sk-select"
              aria-label="Lighting preset"
            >
              {LIGHTS.map((l) => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="sk-field-label">
          Design direction
          <textarea
            className="sk-textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Materials, mood, or details to preserve..."
            rows={3}
            maxLength={500}
            aria-label="Design direction notes"
          />
        </label>

        {refineImage && (
          <div className="sk-refine-badge">
            <span>⟳ Refining from previous result</span>
            <button
              type="button"
              className="sk-refine-clear"
              onClick={() => setRefineImage(null)}
              aria-label="Remove reference image"
            >
              ✕
            </button>
          </div>
        )}

        {/* Progress bar */}
        {status === "loading" && (
          <div className="sk-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Render progress">
            <div className="sk-progress-track">
              <div className="sk-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="sk-progress-label">{Math.round(progress)}% — rendering…</span>
          </div>
        )}

        {error && (
          <p className="sk-error" role="alert">{error}</p>
        )}

        {/* Action buttons */}
        <div className="sk-render-actions">
          <button
            type="button"
            className="sk-preview-btn"
            onClick={handlePreviewPrompt}
            aria-label="Preview the prompt that will be sent to the API"
          >
            Preview prompt
          </button>
          <button
            type="button"
            className="sk-render-btn"
            disabled={status === "loading"}
            onClick={handleRender}
            aria-label="Render with Roomwright AI"
          >
            {status === "loading" ? "Rendering…" : "Render"}
            <span>↗</span>
          </button>
        </div>

        {previewPromptText && (
          <div className="sk-prompt-preview" aria-live="polite">
            <p className="sk-prompt-preview-label">Prompt preview</p>
            <p>{previewPromptText}</p>
          </div>
        )}
      </div>

      {/* ── Result viewer ── */}
      {status === "done" && result && (
        <div className="sk-panel-section">
          <p className="sk-panel-eyebrow">Result · {result.model}</p>

          {/* Comparison slider */}
          <div className="sk-compare" aria-label="Before/after comparison slider">
            <img
              src={base64ToDataUrl(result.image, result.mime)}
              alt="Rendered result"
              className="sk-compare-result"
            />
            <div
              className="sk-compare-overlay"
              style={{ width: `${100 - comparisonPct}%` }}
              aria-hidden="true"
            >
              <span className="sk-compare-label">Sketch</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={comparisonPct}
              onChange={(e) => setComparisonPct(+e.target.value)}
              className="sk-compare-range"
              aria-label="Comparison slider"
            />
          </div>

          <div className="sk-result-actions">
            <button type="button" className="sk-action-btn" onClick={handleDownload} aria-label="Download rendered image">
              Download
            </button>
            <button type="button" className="sk-action-btn sk-action-secondary" onClick={handleRefine} aria-label="Use this result as reference for refinement">
              Refine
            </button>
          </div>
        </div>
      )}

      {/* ── Export ── */}
      <div className="sk-panel-section">
        <p className="sk-panel-eyebrow">Export</p>
        <div className="sk-export-grid">
          <button type="button" className="sk-export-btn" onClick={onExportSVG} aria-label="Export vector SVG floor plan">
            <span className="sk-export-icon">⬡</span> SVG plan
          </button>
          <button type="button" className="sk-export-btn" onClick={onExportJSON} aria-label="Export scene as JSON">
            <span className="sk-export-icon">{ }</span> JSON
          </button>
          <button type="button" className="sk-export-btn" onClick={onExportGLB} aria-label="Export scene as GLB 3D model">
            <span className="sk-export-icon">⬢</span> GLB
          </button>
          <button
            type="button"
            className={`sk-export-btn ${isRecording ? "sk-export-recording" : ""}`}
            onClick={isRecording ? onStopWalkthrough : onStartWalkthrough}
            aria-label={isRecording ? "Stop walkthrough recording" : "Record WebM walkthrough"}
            aria-pressed={isRecording}
          >
            <span className="sk-export-icon">{isRecording ? "⏹" : "▶"}</span>
            {isRecording ? "Stop rec" : "Walkthrough"}
          </button>
        </div>
      </div>

      {/* ── Send to cards ── */}
      <div className="sk-panel-section">
        <p className="sk-panel-eyebrow">Send to workspace</p>
        <div className="sk-send-grid">
          <button type="button" className="sk-send-btn" onClick={onSendToFloorPlan} aria-label="Send scene to Floor plan card (clean2d)">
            <span>Floor plan</span>
            <small>clean2d</small>
          </button>
          <button type="button" className="sk-send-btn" onClick={onSendTo3D} aria-label="Send scene to 3D model card">
            <span>3D model</span>
            <small>GLB</small>
          </button>
          <button
            type="button"
            className="sk-send-btn"
            onClick={isRecording ? onStopWalkthrough : onStartWalkthrough}
            aria-label="Send to video — start walkthrough recording"
          >
            <span>Video</span>
            <small>walkthrough</small>
          </button>
        </div>
      </div>

      {/* ── Recent projects ── */}
      <div className="sk-panel-section">
        <div className="sk-section-row">
          <p className="sk-panel-eyebrow" style={{ margin: 0 }}>Recent projects</p>
          <button
            type="button"
            className="sk-text-action"
            onClick={() => setShowRecent((v) => !v)}
            aria-expanded={showRecent}
            aria-controls="sk-recent-list"
          >
            {showRecent ? "Hide" : "Show"}
          </button>
        </div>
        {showRecent && (
          <ul id="sk-recent-list" className="sk-recent-list" aria-label="Recent renders">
            {recentProjects.length === 0 && (
              <li className="sk-recent-empty">No renders yet.</li>
            )}
            {recentProjects.map((p) => (
              <li key={p.id} className="sk-recent-item">
                {p.image && (
                  <img
                    src={base64ToDataUrl(p.image, p.mime)}
                    alt={p.title}
                    className="sk-recent-thumb"
                  />
                )}
                <div className="sk-recent-info">
                  <strong>{p.title}</strong>
                  <small>{new Date(p.timestamp).toLocaleDateString()} · {p.look}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
