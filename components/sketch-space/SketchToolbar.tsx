"use client";

import { useState } from "react";
import {
  FurnitureKind,
  ToolKind,
  ViewMode,
  FURNITURE_SIZES,
  CanvasBounds,
  FloorLevel,
  GizmoMode,
} from "./types";

interface Props {
  activeTool: ToolKind;
  activeView: ViewMode;
  activeFurniture: FurnitureKind;
  orthogonalLock: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isRecording: boolean;
  canvasBounds?: CanvasBounds;
  floors?: FloorLevel[];
  activeFloorId?: string;
  gizmoMode?: GizmoMode;
  onTool: (t: ToolKind) => void;
  onView: (v: ViewMode) => void;
  onFurniture: (f: FurnitureKind) => void;
  onOrthogonalLock: (v: boolean) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onLengthInput: (metres: number | null) => void;
  onCanvasBoundsChange?: (bounds: CanvasBounds) => void;
  onSelectFloor?: (floorId: string) => void;
  onAddFloor?: () => void;
  onDeleteFloor?: (floorId: string) => void;
  onGizmoModeChange?: (mode: GizmoMode) => void;
}

const TOOLS: { kind: ToolKind; label: string; icon: string; shortcut: string }[] = [
  { kind: "select", label: "Select", icon: "↖", shortcut: "V" },
  { kind: "wall", label: "Wall", icon: "┐", shortcut: "W" },
  { kind: "room", label: "Room rect", icon: "□", shortcut: "R" },
  { kind: "door", label: "Door", icon: "⌐", shortcut: "D" },
  { kind: "window", label: "Window", icon: "⊡", shortcut: "N" },
  { kind: "furniture", label: "Furniture", icon: "⊞", shortcut: "F" },
  { kind: "label", label: "Label", icon: "T", shortcut: "L" },
  { kind: "eraser", label: "Erase", icon: "⌫", shortcut: "E" },
  { kind: "camera", label: "Camera", icon: "📷", shortcut: "C" },
];

const FURNITURE_LIST: FurnitureKind[] = [
  "bed", "sofa", "table", "kitchen", "toilet", "bath", "stairs",
  "plant", "tv", "rug", "chair", "wardrobe"
];

const VIEWS: { mode: ViewMode; label: string; icon: string }[] = [
  { mode: "top", label: "Top-down", icon: "⊙" },
  { mode: "perspective", label: "Perspective", icon: "⧫" },
  { mode: "eye-level", label: "Eye level", icon: "◎" },
];

const CANVAS_PRESETS: { label: string; width: number; depth: number }[] = [
  { label: "Studio (8×6m)", width: 8, depth: 6 },
  { label: "1-Bed Flat (10×8m)", width: 10, depth: 8 },
  { label: "2-Bed Flat (14×10m)", width: 14, depth: 10 },
  { label: "Family House (20×15m)", width: 20, depth: 15 },
  { label: "Large Estate (30×20m)", width: 30, depth: 20 },
];

export function SketchToolbar({
  activeTool,
  activeView,
  activeFurniture,
  orthogonalLock,
  canUndo,
  canRedo,
  isRecording,
  canvasBounds,
  floors = [],
  activeFloorId,
  gizmoMode = "translate",
  onTool,
  onView,
  onFurniture,
  onOrthogonalLock,
  onUndo,
  onRedo,
  onClear,
  onLengthInput,
  onCanvasBoundsChange,
  onSelectFloor,
  onAddFloor,
  onDeleteFloor,
  onGizmoModeChange,
}: Props) {
  const [showCanvasSettings, setShowCanvasSettings] = useState(false);

  const curWidth = canvasBounds?.widthM ?? 16;
  const curDepth = canvasBounds?.depthM ?? 12;

  const handlePresetSelect = (presetIndex: number) => {
    const p = CANVAS_PRESETS[presetIndex];
    if (p && onCanvasBoundsChange) {
      onCanvasBoundsChange({
        widthM: p.width,
        depthM: p.depth,
        gridStep: canvasBounds?.gridStep ?? 0.1,
      });
    }
  };

  const handleCustomDimension = (w: number, d: number) => {
    if (onCanvasBoundsChange) {
      onCanvasBoundsChange({
        widthM: Math.max(2, Math.min(100, w)),
        depthM: Math.max(2, Math.min(100, d)),
        gridStep: canvasBounds?.gridStep ?? 0.1,
      });
    }
  };

  return (
    <div className="sk-toolbar" role="toolbar" aria-label="Drawing tools">
      {/* ── Multi-floor level tabs (Feature E) ── */}
      {floors.length > 0 && onSelectFloor && (
        <div className="sk-toolbar-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
            <span className="sk-toolbar-label" style={{ margin: 0 }}>Floors</span>
            {onAddFloor && (
              <button
                type="button"
                className="sk-tool-btn"
                style={{ padding: "1px 6px", fontSize: "10px", minWidth: "auto", height: "auto" }}
                onClick={onAddFloor}
                title="Add new floor level"
                aria-label="Add new floor level"
              >
                + Add
              </button>
            )}
          </div>
          <div className="sk-toolbar-group" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {floors.map((fl) => {
              const isActive = fl.id === activeFloorId;
              return (
                <div
                  key={fl.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  <button
                    type="button"
                    className={`sk-tool-btn ${isActive ? "active" : ""}`}
                    style={{
                      flexDirection: "row",
                      gap: "5px",
                      padding: "5px 8px",
                      fontSize: "11px",
                      minWidth: "auto",
                    }}
                    onClick={() => onSelectFloor(fl.id)}
                    aria-pressed={isActive}
                  >
                    <span style={{ fontWeight: isActive ? 700 : 500 }}>{fl.name}</span>
                    <span style={{ fontSize: "9px", opacity: 0.65 }}>+{fl.elevationM.toFixed(1)}m</span>
                  </button>
                  {floors.length > 1 && onDeleteFloor && (
                    <button
                      type="button"
                      style={{
                        position: "absolute",
                        top: "-3px",
                        right: "-3px",
                        background: "rgba(30,33,24,0.9)",
                        border: "1px solid rgba(255,255,255,0.18)",
                        borderRadius: "50%",
                        color: "#9ba090",
                        cursor: "pointer",
                        width: "14px",
                        height: "14px",
                        fontSize: "8.5px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                        padding: 0,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete floor "${fl.name}"?`)) onDeleteFloor(fl.id);
                      }}
                      title={`Delete floor ${fl.name}`}
                      aria-label={`Delete floor ${fl.name}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {floors.length > 0 && <div className="sk-toolbar-divider" aria-hidden="true" />}

      {/* ── View modes ── */}
      <div className="sk-toolbar-section">
        <span className="sk-toolbar-label">View</span>
        <div className="sk-toolbar-group">
          {VIEWS.map((v) => (
            <button
              key={v.mode}
              type="button"
              className={`sk-tool-btn ${activeView === v.mode ? "active" : ""}`}
              title={v.label}
              aria-label={v.label}
              aria-pressed={activeView === v.mode}
              onClick={() => onView(v.mode)}
            >
              <span className="sk-tool-icon">{v.icon}</span>
              <span className="sk-tool-name">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 3D Gizmo Controls (Feature B2) ── */}
      {activeView !== "top" && onGizmoModeChange && (
        <>
          <div className="sk-toolbar-divider" aria-hidden="true" />
          <div className="sk-toolbar-section">
            <span className="sk-toolbar-label">3D Gizmo</span>
            <div className="sk-toolbar-group" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "2px" }}>
              <button
                type="button"
                className={`sk-tool-btn ${gizmoMode === "translate" ? "active" : ""}`}
                style={{ padding: "4px 2px", fontSize: "11px", justifyContent: "center" }}
                onClick={() => onGizmoModeChange("translate")}
                title="Translate (Move object)"
                aria-label="Translate gizmo"
              >
                Move
              </button>
              <button
                type="button"
                className={`sk-tool-btn ${gizmoMode === "rotate" ? "active" : ""}`}
                style={{ padding: "4px 2px", fontSize: "11px", justifyContent: "center" }}
                onClick={() => onGizmoModeChange("rotate")}
                title="Rotate object"
                aria-label="Rotate gizmo"
              >
                Rotate
              </button>
              <button
                type="button"
                className={`sk-tool-btn ${gizmoMode === "scale" ? "active" : ""}`}
                style={{ padding: "4px 2px", fontSize: "11px", justifyContent: "center" }}
                onClick={() => onGizmoModeChange("scale")}
                title="Scale object"
                aria-label="Scale gizmo"
              >
                Scale
              </button>
            </div>
          </div>
        </>
      )}

      <div className="sk-toolbar-divider" aria-hidden="true" />

      {/* ── Drawing tools ── */}
      <div className="sk-toolbar-section">
        <span className="sk-toolbar-label">Draw</span>
        <div className="sk-toolbar-group">
          {TOOLS.map((t) => (
            <button
              key={t.kind}
              type="button"
              className={`sk-tool-btn ${activeTool === t.kind ? "active" : ""}`}
              title={`${t.label} (${t.shortcut})`}
              aria-label={`${t.label}, shortcut ${t.shortcut}`}
              aria-pressed={activeTool === t.kind}
              onClick={() => onTool(t.kind)}
            >
              <span className="sk-tool-icon">{t.icon}</span>
              <span className="sk-tool-name">{t.label}</span>
              <kbd className="sk-shortcut">{t.shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>

      {/* ── Furniture sub-picker ── */}
      {activeTool === "furniture" && (
        <>
          <div className="sk-toolbar-divider" aria-hidden="true" />
          <div className="sk-toolbar-section">
            <span className="sk-toolbar-label">Furniture</span>
            <div className="sk-toolbar-group sk-furniture-group">
              {FURNITURE_LIST.map((kind) => {
                const [w, d] = FURNITURE_SIZES[kind];
                return (
                  <button
                    key={kind}
                    type="button"
                    className={`sk-tool-btn sk-furn-btn ${activeFurniture === kind ? "active" : ""}`}
                    aria-label={`${kind} ${w}×${d}m`}
                    aria-pressed={activeFurniture === kind}
                    onClick={() => onFurniture(kind)}
                  >
                    <span className="sk-tool-name">{kind}</span>
                    <span className="sk-furn-size">{w}×{d}m</span>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── Wall options ── */}
      {activeTool === "wall" && (
        <>
          <div className="sk-toolbar-divider" aria-hidden="true" />
          <div className="sk-toolbar-section">
            <span className="sk-toolbar-label">Wall options</span>
            <label className="sk-ortho-label">
              <input
                type="checkbox"
                checked={orthogonalLock}
                onChange={(e) => onOrthogonalLock(e.target.checked)}
                aria-label="Orthogonal lock — hold Shift for temporary"
              />
              <span>Orthogonal lock</span>
              <kbd className="sk-shortcut">⇧</kbd>
            </label>
            <label className="sk-len-label">
              Length (m)
              <input
                type="number"
                className="sk-len-input"
                placeholder="auto"
                min="0.1"
                step="0.1"
                aria-label="Typed wall length in metres"
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  onLengthInput(isNaN(v) || v <= 0 ? null : v);
                }}
              />
            </label>
          </div>
        </>
      )}

      {/* ── Canvas Bounds settings (Feature A.6) ── */}
      <div className="sk-toolbar-divider" aria-hidden="true" />
      <div className="sk-toolbar-section">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="sk-toolbar-label" style={{ margin: 0 }}>Canvas bounds</span>
          <button
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#a3b18a",
              cursor: "pointer",
              fontSize: "11px",
              padding: "2px 4px",
            }}
            onClick={() => setShowCanvasSettings((v) => !v)}
            aria-expanded={showCanvasSettings}
          >
            {showCanvasSettings ? "Hide" : `${curWidth}×${curDepth}m`}
          </button>
        </div>

        {showCanvasSettings && (
          <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <select
              className="sk-select"
              style={{ fontSize: "12px", padding: "4px" }}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                if (!isNaN(idx)) handlePresetSelect(idx);
              }}
              defaultValue=""
              aria-label="Canvas size preset"
            >
              <option value="" disabled>Choose preset...</option>
              {CANVAS_PRESETS.map((p, i) => (
                <option key={p.label} value={i}>{p.label}</option>
              ))}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
              <label style={{ fontSize: "11px", color: "#a0a595" }}>
                Width (m)
                <input
                  type="number"
                  className="sk-len-input"
                  style={{ width: "100%", marginTop: "2px" }}
                  value={curWidth}
                  min={2}
                  max={100}
                  step={1}
                  onChange={(e) => handleCustomDimension(parseFloat(e.target.value) || curWidth, curDepth)}
                />
              </label>
              <label style={{ fontSize: "11px", color: "#a0a595" }}>
                Depth (m)
                <input
                  type="number"
                  className="sk-len-input"
                  style={{ width: "100%", marginTop: "2px" }}
                  value={curDepth}
                  min={2}
                  max={100}
                  step={1}
                  onChange={(e) => handleCustomDimension(curWidth, parseFloat(e.target.value) || curDepth)}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      <div className="sk-toolbar-divider" aria-hidden="true" />

      {/* ── History ── */}
      <div className="sk-toolbar-section">
        <span className="sk-toolbar-label">History</span>
        <div className="sk-toolbar-group">
          <button
            type="button"
            className="sk-tool-btn"
            disabled={!canUndo}
            aria-label="Undo (Ctrl+Z)"
            title="Undo (Ctrl+Z)"
            onClick={onUndo}
          >
            <span className="sk-tool-icon">↩</span>
            <span className="sk-tool-name">Undo</span>
          </button>
          <button
            type="button"
            className="sk-tool-btn"
            disabled={!canRedo}
            aria-label="Redo (Ctrl+Shift+Z)"
            title="Redo (Ctrl+Shift+Z)"
            onClick={onRedo}
          >
            <span className="sk-tool-icon">↪</span>
            <span className="sk-tool-name">Redo</span>
          </button>
          <button
            type="button"
            className="sk-tool-btn sk-tool-danger"
            aria-label="Clear all — reset scene"
            title="Clear all"
            onClick={() => {
              if (window.confirm("Clear the entire scene?")) onClear();
            }}
          >
            <span className="sk-tool-icon">✕</span>
            <span className="sk-tool-name">Clear</span>
          </button>
        </div>
      </div>

      {isRecording && (
        <div className="sk-recording-badge" aria-live="polite">
          <span className="sk-rec-dot" /> REC
        </div>
      )}
    </div>
  );
}
