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
import {
  RenderRequest,
  Scene,
  VirtualCamera,
  BUILTIN_MATERIALS,
  isValidScene,
} from "./types";

interface Props {
  sceneSummary: string;
  sceneData?: Scene | null;
  onCapture: () => { top: string; persp: string };
  onExportGLB: () => Promise<void>;
  onExportSVG: () => void;
  onExportJSON: () => void;
  onStartWalkthrough: () => void;
  onStopWalkthrough: () => void;
  isRecording: boolean;
  onSendToFloorPlan: () => void;
  onSendTo3D: () => void;
  onApplyRoomMaterial?: (roomId: string, materialId: string) => void;
  onAddVirtualCamera?: () => void;
  onSwitchCamera?: (cam: VirtualCamera) => void;
  onCaptureCamera?: (cam: VirtualCamera) => void;
  onDeleteCamera?: (camId: string) => void;
  onUpdateCamera?: (camId: string, updates: Partial<VirtualCamera>) => void;
  onLoadGeneratedPlan?: (scene: Scene) => void;
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

// ── Algorithmic Architectural Plan Generator (Feature F Fallback) ─────────────

function generateAlgorithmicPlan(prompt: string): Scene {
  const p = prompt.toLowerCase();
  const is2Bed = p.includes("2 bed") || p.includes("two bed");
  const isOffice = p.includes("office") || p.includes("workspace");

  if (isOffice) {
    return {
      unit: "m",
      canvas: { widthM: 14, depthM: 10, gridStep: 0.1 },
      walls: [
        { id: "w1", a: [0, 0], b: [14, 0] },
        { id: "w2", a: [14, 0], b: [14, 10] },
        { id: "w3", a: [14, 10], b: [0, 10] },
        { id: "w4", a: [0, 10], b: [0, 0] },
        { id: "w5", a: [7, 0], b: [7, 10] },
      ],
      rooms: [
        { id: "r1", name: "Open Office", x: 0, z: 0, w: 7, d: 10, materialId: "polished-concrete" },
        { id: "r2", name: "Conference Room", x: 7, z: 0, w: 7, d: 10, materialId: "cozy-carpet" },
      ],
      openings: [
        { id: "o1", type: "door", at: [3.5, 0], w: 1.0, wallId: "w1" },
        { id: "o2", type: "door", at: [7, 5], w: 0.9, wallId: "w5" },
        { id: "o3", type: "window", at: [14, 5], w: 2.0, wallId: "w2" },
      ],
      items: [
        { id: "i1", kind: "table", x: 3.5, z: 4, rot: 0 },
        { id: "i2", kind: "chair", x: 3.5, z: 3.2, rot: 0 },
        { id: "i3", kind: "table", x: 10.5, z: 5, rot: 0 },
        { id: "i4", kind: "plant", x: 1, z: 1, rot: 0 },
      ],
    };
  }

  if (is2Bed) {
    return {
      unit: "m",
      canvas: { widthM: 14, depthM: 10, gridStep: 0.1 },
      walls: [
        { id: "w1", a: [0, 0], b: [14, 0] },
        { id: "w2", a: [14, 0], b: [14, 10] },
        { id: "w3", a: [14, 10], b: [0, 10] },
        { id: "w4", a: [0, 10], b: [0, 0] },
        { id: "w5", a: [7, 0], b: [7, 10] },
        { id: "w6", a: [7, 5], b: [14, 5] },
      ],
      rooms: [
        { id: "r1", name: "Living & Kitchen", x: 0, z: 0, w: 7, d: 10, materialId: "oak-wood" },
        { id: "r2", name: "Primary Bedroom", x: 7, z: 0, w: 7, d: 5, materialId: "cozy-carpet" },
        { id: "r3", name: "Second Bedroom", x: 7, z: 5, w: 7, d: 5, materialId: "oak-wood" },
      ],
      openings: [
        { id: "o1", type: "door", at: [3.5, 0], w: 0.9, wallId: "w1" },
        { id: "o2", type: "door", at: [7, 2.5], w: 0.85, wallId: "w5" },
        { id: "o3", type: "door", at: [7, 7.5], w: 0.85, wallId: "w5" },
        { id: "o4", type: "window", at: [3.5, 10], w: 2.0, wallId: "w3" },
        { id: "o5", type: "window", at: [14, 2.5], w: 1.5, wallId: "w2" },
      ],
      items: [
        { id: "i1", kind: "sofa", x: 3.5, z: 7, rot: 0 },
        { id: "i2", kind: "tv", x: 3.5, z: 9.5, rot: 0 },
        { id: "i3", kind: "kitchen", x: 3.5, z: 1.5, rot: 0 },
        { id: "i4", kind: "bed", x: 10.5, z: 2.5, rot: 0 },
        { id: "i5", kind: "bed", x: 10.5, z: 7.5, rot: 0 },
        { id: "i6", kind: "plant", x: 0.8, z: 8.5, rot: 0 },
      ],
    };
  }

  // 1-Bed Flat / Studio Default
  return {
    unit: "m",
    canvas: { widthM: 10, depthM: 8, gridStep: 0.1 },
    walls: [
      { id: "w1", a: [0, 0], b: [10, 0] },
      { id: "w2", a: [10, 0], b: [10, 8] },
      { id: "w3", a: [10, 8], b: [0, 8] },
      { id: "w4", a: [0, 8], b: [0, 0] },
      { id: "w5", a: [5, 0], b: [5, 8] },
    ],
    rooms: [
      { id: "r1", name: "Living Room", x: 0, z: 0, w: 5, d: 8, materialId: "oak-wood" },
      { id: "r2", name: "Bedroom", x: 5, z: 0, w: 5, d: 8, materialId: "cozy-carpet" },
    ],
    openings: [
      { id: "o1", type: "door", at: [2.5, 0], w: 0.9, wallId: "w1" },
      { id: "o2", type: "door", at: [5, 4], w: 0.85, wallId: "w5" },
      { id: "o3", type: "window", at: [2.5, 8], w: 1.6, wallId: "w3" },
      { id: "o4", type: "window", at: [10, 4], w: 1.4, wallId: "w2" },
    ],
    items: [
      { id: "i1", kind: "sofa", x: 2.5, z: 5, rot: 0 },
      { id: "i2", kind: "bed", x: 7.5, z: 4, rot: 0 },
      { id: "i3", kind: "wardrobe", x: 7.5, z: 1.5, rot: 0 },
      { id: "i4", kind: "plant", x: 0.8, z: 6.8, rot: 0 },
    ],
  };
}

// ─────────────────────────────────────────────────────────────────────────────

export function RenderPanel({
  sceneSummary,
  sceneData,
  onCapture,
  onExportGLB,
  onExportSVG,
  onExportJSON,
  onStartWalkthrough,
  onStopWalkthrough,
  isRecording,
  onSendToFloorPlan,
  onSendTo3D,
  onApplyRoomMaterial,
  onAddVirtualCamera,
  onSwitchCamera,
  onCaptureCamera,
  onDeleteCamera,
  onUpdateCamera,
  onLoadGeneratedPlan,
}: Props) {
  const [activeTab, setActiveTab] = useState<"render" | "ai-gen" | "materials" | "cameras">("render");

  // Render settings state
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

  // AI Gen state (Feature F)
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenStatus, setAiGenStatus] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [aiGenMsg, setAiGenMsg] = useState("");

  // Materials state (Feature D)
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  useEffect(() => {
    setRecentProjects(getRecentProjects());
  }, []);

  useEffect(() => {
    if (sceneData?.rooms.length && !selectedRoomId) {
      setSelectedRoomId(sceneData.rooms[0].id);
    }
  }, [sceneData, selectedRoomId]);

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

  // ── AI Plan Generator action (Feature F) ──────────────────────────────────
  async function handleGeneratePlan() {
    if (!aiPrompt.trim()) return;
    setAiGenStatus("generating");
    setAiGenMsg("Designing architectural layout...");

    try {
      // Attempt backend endpoint first
      let plan: Scene | null = null;
      try {
        const res = await fetch("http://localhost:4000/text-to-sketch/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: aiPrompt }),
        });
        if (res.ok) {
          const data = await res.json();
          if (isValidScene(data)) {
            plan = data;
          }
        }
      } catch {
        // Backend not running, use built-in generator
      }

      if (!plan) {
        plan = generateAlgorithmicPlan(aiPrompt);
      }

      if (plan && onLoadGeneratedPlan) {
        onLoadGeneratedPlan(plan);
        setAiGenStatus("done");
        setAiGenMsg(`Generated plan with ${plan.rooms.length} rooms and ${plan.walls.length} walls!`);
      }
    } catch (e) {
      setAiGenStatus("error");
      setAiGenMsg(e instanceof Error ? e.message : "Failed to generate plan");
    }
  }

  // ── Custom texture file upload (Feature D.6) ──────────────────────────────
  function handleCustomTextureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onApplyRoomMaterial || !selectedRoomId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onApplyRoomMaterial(selectedRoomId, dataUrl);
    };
    reader.readAsDataURL(file);
  }

  return (
    <aside className="sk-panel" aria-label="Render and design panel">
      {/* ── Subpanel Tab Navigation ── */}
      <div style={{ display: "flex", gap: "2px", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "6px", marginBottom: "12px" }}>
        <button
          type="button"
          className={`sk-tool-btn ${activeTab === "render" ? "active" : ""}`}
          style={{ flex: 1, padding: "6px 2px", fontSize: "11px", justifyContent: "center" }}
          onClick={() => setActiveTab("render")}
        >
          Render
        </button>
        <button
          type="button"
          className={`sk-tool-btn ${activeTab === "ai-gen" ? "active" : ""}`}
          style={{ flex: 1, padding: "6px 2px", fontSize: "11px", justifyContent: "center" }}
          onClick={() => setActiveTab("ai-gen")}
        >
          AI Plan
        </button>
        <button
          type="button"
          className={`sk-tool-btn ${activeTab === "materials" ? "active" : ""}`}
          style={{ flex: 1, padding: "6px 2px", fontSize: "11px", justifyContent: "center" }}
          onClick={() => setActiveTab("materials")}
        >
          Materials
        </button>
        <button
          type="button"
          className={`sk-tool-btn ${activeTab === "cameras" ? "active" : ""}`}
          style={{ flex: 1, padding: "6px 2px", fontSize: "11px", justifyContent: "center" }}
          onClick={() => setActiveTab("cameras")}
        >
          Cameras
        </button>
      </div>

      {/* ── TAB 1: RENDER ── */}
      {activeTab === "render" && (
        <>
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

            {status === "loading" && (
              <div className="sk-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Render progress">
                <div className="sk-progress-track">
                  <div className="sk-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="sk-progress-label">{Math.round(progress)}% — rendering…</span>
              </div>
            )}

            {error && <p className="sk-error" role="alert">{error}</p>}

            <div className="sk-render-actions">
              <button
                type="button"
                className="sk-preview-btn"
                onClick={handlePreviewPrompt}
                aria-label="Preview prompt"
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

          {/* Result viewer */}
          {status === "done" && result && (
            <div className="sk-panel-section">
              <p className="sk-panel-eyebrow">Result · {result.model}</p>
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
                <button type="button" className="sk-action-btn sk-action-secondary" onClick={handleRefine} aria-label="Use as reference for refinement">
                  Refine
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── TAB 2: AI FLOOR PLAN GENERATOR (Feature F) ── */}
      {activeTab === "ai-gen" && (
        <div className="sk-panel-section">
          <div className="sk-panel-heading">
            <span className="sk-panel-eyebrow">Claude MCP & Generative Plan</span>
            <h2 className="sk-panel-title">Text to Floor Plan</h2>
          </div>
          <p style={{ fontSize: "12px", color: "#a0a595", marginBottom: "8px" }}>
            Describe your desired room layout in plain English. The AI generates structured 3D walls, rooms, doors, and furniture.
          </p>

          <textarea
            className="sk-textarea"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Modern 2-bedroom apartment with open-plan kitchen, master ensuite, and large balcony..."
            rows={4}
            aria-label="Floor plan generation prompt"
          />

          <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
            <button
              type="button"
              className="sk-render-btn"
              style={{ width: "100%" }}
              disabled={aiGenStatus === "generating" || !aiPrompt.trim()}
              onClick={handleGeneratePlan}
            >
              {aiGenStatus === "generating" ? "Generating Plan…" : "Generate Plan"}
              <span>⚡</span>
            </button>
          </div>

          {aiGenMsg && (
            <p
              style={{
                fontSize: "12px",
                marginTop: "8px",
                color: aiGenStatus === "error" ? "#ff7070" : "#a9c93a",
              }}
              role="alert"
            >
              {aiGenMsg}
            </p>
          )}

          <div style={{ marginTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}>
            <p style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>Quick prompt ideas:</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <button
                type="button"
                className="sk-tool-btn"
                style={{ fontSize: "11px", padding: "4px 8px", textAlign: "left", height: "auto" }}
                onClick={() => setAiPrompt("Scandinavian 2-bedroom flat with open kitchen and reading nook")}
              >
                2-bedroom flat with open kitchen
              </button>
              <button
                type="button"
                className="sk-tool-btn"
                style={{ fontSize: "11px", padding: "4px 8px", textAlign: "left", height: "auto" }}
                onClick={() => setAiPrompt("Modern creative open-plan office with conference room")}
              >
                Creative office with conference room
              </button>
              <button
                type="button"
                className="sk-tool-btn"
                style={{ fontSize: "11px", padding: "4px 8px", textAlign: "left", height: "auto" }}
                onClick={() => setAiPrompt("Minimalist studio apartment with bedroom zone and balcony")}
              >
                Minimalist studio apartment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: MATERIALS & TEXTURES (Feature D) ── */}
      {activeTab === "materials" && (
        <div className="sk-panel-section">
          <div className="sk-panel-heading">
            <span className="sk-panel-eyebrow">Asset Library</span>
            <h2 className="sk-panel-title">Materials & Finishes</h2>
          </div>

          {sceneData && sceneData.rooms.length > 0 ? (
            <>
              <label className="sk-field-label">
                Target Room
                <select
                  className="sk-select"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  aria-label="Select target room for material"
                >
                  {sceneData.rooms.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.w}×{r.d}m)</option>
                  ))}
                </select>
              </label>

              <p style={{ fontSize: "12px", color: "#a0a595", marginTop: "10px", marginBottom: "6px" }}>
                Floor Textures (PBR procedural mapping):
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                {BUILTIN_MATERIALS.filter((m) => m.category === "floor").map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className="sk-tool-btn"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px",
                      fontSize: "11px",
                      textAlign: "left",
                    }}
                    onClick={() => onApplyRoomMaterial && onApplyRoomMaterial(selectedRoomId, m.id)}
                  >
                    <span
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "4px",
                        backgroundColor: m.previewColor ?? "#aaa",
                        border: "1px solid rgba(255,255,255,0.2)",
                        flexShrink: 0,
                      }}
                    />
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>

              <div style={{ marginTop: "14px" }}>
                <p style={{ fontSize: "11px", color: "#a0a595", marginBottom: "4px" }}>
                  Upload Custom Surface Texture:
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCustomTextureUpload}
                  style={{ fontSize: "11px", color: "#ccc" }}
                />
              </div>
            </>
          ) : (
            <p style={{ fontSize: "12px", color: "#999" }}>
              Draw at least one room on the canvas using the Room tool (R) to apply floor textures.
            </p>
          )}
        </div>
      )}

      {/* ── TAB 4: VIRTUAL CAMERAS (Feature G) ── */}
      {activeTab === "cameras" && (
        <div className="sk-panel-section">
          <div className="sk-panel-heading">
            <span className="sk-panel-eyebrow">Virtual Cameras</span>
            <h2 className="sk-panel-title">Viewpoints & HD Capture</h2>
          </div>

          <button
            type="button"
            className="sk-render-btn"
            style={{ width: "100%", marginBottom: "12px" }}
            onClick={onAddVirtualCamera}
          >
            📸 Add Camera at Viewpoint
          </button>

          {sceneData?.virtualCameras && sceneData.virtualCameras.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {sceneData.virtualCameras.map((cam) => (
                <div
                  key={cam.id}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "12px", color: "#e8edcf" }}>{cam.name}</strong>
                    {onDeleteCamera && (
                      <button
                        type="button"
                        style={{ background: "transparent", border: "none", color: "#ff7070", cursor: "pointer", fontSize: "11px" }}
                        onClick={() => onDeleteCamera(cam.id)}
                        title="Delete camera"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#888" }}>FOV: {cam.fov}°</span>
                    <input
                      type="range"
                      min={30}
                      max={90}
                      value={cam.fov}
                      onChange={(e) => onUpdateCamera && onUpdateCamera(cam.id, { fov: +e.target.value })}
                      style={{ flex: 1 }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "4px" }}>
                    {onSwitchCamera && (
                      <button
                        type="button"
                        className="sk-action-btn"
                        style={{ flex: 1, padding: "4px 6px", fontSize: "11px" }}
                        onClick={() => onSwitchCamera(cam)}
                      >
                        Switch View
                      </button>
                    )}
                    {onCaptureCamera && (
                      <button
                        type="button"
                        className="sk-action-btn sk-action-secondary"
                        style={{ flex: 1, padding: "4px 6px", fontSize: "11px" }}
                        onClick={() => onCaptureCamera(cam)}
                      >
                        HD Snapshot
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: "12px", color: "#999" }}>
              No virtual cameras added yet. Click &quot;Add Camera&quot; to place one.
            </p>
          )}
        </div>
      )}

      {/* ── Export & External Workspace Handoffs ── */}
      <div className="sk-panel-section">
        <p className="sk-panel-eyebrow">Export</p>
        <div className="sk-export-grid">
          <button type="button" className="sk-export-btn" onClick={onExportSVG} aria-label="Export vector SVG floor plan">
            <span className="sk-export-icon">⬡</span> SVG plan
          </button>
          <button type="button" className="sk-export-btn" onClick={onExportJSON} aria-label="Export project JSON">
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

      {/* ── Send to workspace ── */}
      <div className="sk-panel-section">
        <p className="sk-panel-eyebrow">Send to workspace</p>
        <div className="sk-send-grid">
          <button type="button" className="sk-send-btn" onClick={onSendToFloorPlan} aria-label="Send to clean2d plan">
            <span>Floor plan</span>
            <small>clean2d</small>
          </button>
          <button type="button" className="sk-send-btn" onClick={onSendTo3D} aria-label="Send to 3D model">
            <span>3D model</span>
            <small>GLB</small>
          </button>
          <button
            type="button"
            className="sk-send-btn"
            onClick={isRecording ? onStopWalkthrough : onStartWalkthrough}
            aria-label="Send to video recording"
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
